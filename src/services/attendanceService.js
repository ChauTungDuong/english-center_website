const Attendance = require("../models/Attendance");
const Class = require("../models/Class");
const Payment = require("../models/Payments");
const attendanceService = {
  // Create new attendance record
  async createAttendance(classId, date) {
    const classData = await Class.findById(classId).populate("studentList");
    if (!classData) {
      throw new Error("Không tìm thấy lớp học");
    }

    if (!classData.isAvailable) {
      throw new Error("Lớp học không còn hoạt động");
    }

    // Kiểm tra xem ngày điểm danh có nằm trong lịch học không
    const dayOfWeek = date.getDay();
    const schedule = classData.schedule.find((s) => s.dayOfWeek === dayOfWeek);
    if (!schedule) {
      throw new Error("Ngày điểm danh không nằm trong lịch học của lớp");
    }

    // Kiểm tra xem đã có điểm danh cho ngày này chưa
    const existingAttendance = await Attendance.findOne({
      classId,
      date: {
        $gte: new Date(date.setHours(0, 0, 0, 0)),
        $lt: new Date(date.setHours(23, 59, 59, 999)),
      },
    });

    if (existingAttendance) {
      throw new Error("Đã có điểm danh cho ngày này");
    }

    // Tạo bản ghi điểm danh mới
    const attendance = new Attendance({
      classId,
      date,
      lessonNumber: schedule.lessonNumber,
      records: classData.studentList.map((student) => ({
        studentId: student._id,
        isAbsent: false,
        note: "",
      })),
    });

    await attendance.save();
    return attendance.populate(
      "records.studentId",
      "fullName email phoneNumber"
    );
  },

  // Get attendance by class
  async getAttendanceByClass(classId) {
    const attendance = await Attendance.find({ classId })
      .populate("records.studentId", "fullName email phoneNumber")
      .sort({ createdAt: -1 });

    if (!attendance || attendance.length === 0) {
      throw new Error("Không tìm thấy bản ghi điểm danh");
    }
    return attendance;
  },

  // Get attendance by lesson number
  async getAttendanceByLesson(classId, lessonNumber) {
    const attendance = await Attendance.findOne({
      classId,
      lessonNumber,
    }).populate("records.studentId", "fullName email phoneNumber");

    if (!attendance) {
      throw new Error("Không tìm thấy bản ghi điểm danh");
    }
    return attendance;
  },

  // Update attendance for a lesson
  async updateAttendance(attendanceId, records) {
    const attendance = await Attendance.findById(attendanceId);
    if (!attendance) {
      throw new Error("Không tìm thấy bản ghi điểm danh");
    }

    // Cập nhật từng bản ghi điểm danh
    records.forEach((record) => {
      const existingRecord = attendance.records.find(
        (r) => r.studentId.toString() === record.studentId
      );
      if (existingRecord) {
        const wasPresent = !existingRecord.isAbsent;
        const isNowAbsent = record.isAbsent;

        existingRecord.isAbsent = record.isAbsent;
        existingRecord.note = record.note;

        // Nếu học sinh vắng mặt, cập nhật payment
        if (wasPresent && isNowAbsent) {
          updatePaymentForAbsence(
            attendance.classId,
            record.studentId,
            attendance.date
          );
        }
      }
    });

    await attendance.save();
    return attendance.populate(
      "records.studentId",
      "fullName email phoneNumber"
    );
  },

  // Get student attendance summary
  async getStudentAttendanceSummary(studentId, classId, startDate, endDate) {
    const attendance = await Attendance.find({
      classId,
      date: {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      },
    }).populate("records.studentId", "fullName email phoneNumber");

    if (!attendance || attendance.length === 0) {
      throw new Error("Không tìm thấy bản ghi điểm danh");
    }

    const summary = {
      totalLessons: attendance.length,
      presentCount: 0,
      absentCount: 0,
      records: [],
    };

    attendance.forEach((lesson) => {
      const studentRecord = lesson.records.find(
        (r) => r.studentId._id.toString() === studentId
      );
      if (studentRecord) {
        if (studentRecord.isAbsent) {
          summary.absentCount++;
        } else {
          summary.presentCount++;
        }
        summary.records.push({
          date: lesson.date,
          lessonNumber: lesson.lessonNumber,
          isAbsent: studentRecord.isAbsent,
          note: studentRecord.note,
        });
      }
    });

    return summary;
  },

  // Get class attendance statistics
  async getClassAttendanceStats(classId, startDate, endDate) {
    const attendance = await Attendance.find({
      classId,
      date: {
        $gte: startDate,
        $lte: endDate,
      },
    });

    const stats = {
      totalClasses: attendance.length,
      averageAttendance: 0,
      studentStats: {},
    };

    if (attendance.length === 0) {
      return stats;
    }

    // Calculate statistics for each student
    attendance.forEach((record) => {
      record.students.forEach((student) => {
        const studentId = student.studentId.toString();
        if (!stats.studentStats[studentId]) {
          stats.studentStats[studentId] = {
            present: 0,
            absent: 0,
            excused: 0,
          };
        }
        stats.studentStats[studentId][student.status]++;
      });
    });

    // Calculate average attendance
    const totalStudents = Object.keys(stats.studentStats).length;
    if (totalStudents > 0) {
      const totalPresent = Object.values(stats.studentStats).reduce(
        (sum, stat) => sum + stat.present,
        0
      );
      stats.averageAttendance =
        (totalPresent / (totalStudents * attendance.length)) * 100;
    }

    return stats;
  },

  // Lấy điểm danh theo lớp và ngày
  async getAttendanceByClassAndDate(classId, date) {
    const startDate = new Date(date);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(date);
    endDate.setHours(23, 59, 59, 999);

    const attendance = await Attendance.findOne({
      classId,
      date: {
        $gte: startDate,
        $lt: endDate,
      },
    }).populate("records.studentId", "fullName email phoneNumber");

    if (!attendance) {
      throw new Error("Không tìm thấy bản ghi điểm danh");
    }
    return attendance;
  },

  // Lấy điểm danh theo lớp và khoảng thời gian
  async getAttendanceByClassAndDateRange(classId, startDate, endDate) {
    const attendance = await Attendance.find({
      classId,
      date: {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      },
    })
      .populate("records.studentId", "fullName email phoneNumber")
      .sort({ date: 1 });

    if (!attendance || attendance.length === 0) {
      throw new Error("Không tìm thấy bản ghi điểm danh");
    }
    return attendance;
  },

  // Xóa điểm danh
  async deleteAttendance(attendanceId) {
    const attendance = await Attendance.findById(attendanceId);
    if (!attendance) {
      throw new Error("Không tìm thấy bản ghi điểm danh");
    }

    // Cập nhật lại payment cho các học sinh vắng mặt
    attendance.records.forEach((record) => {
      if (record.isAbsent) {
        updatePaymentForAbsence(
          attendance.classId,
          record.studentId,
          attendance.date,
          true
        );
      }
    });

    await Attendance.findByIdAndDelete(attendanceId);
    return { message: "Xóa điểm danh thành công" };
  },
};

// Hàm helper để cập nhật payment khi học sinh vắng mặt
const updatePaymentForAbsence = async (
  classId,
  studentId,
  date,
  isDeleting = false
) => {
  const month = date.getMonth() + 1;
  const year = date.getFullYear();

  let payment = await Payment.findOne({
    classId,
    studentId,
    month,
    year,
  });

  if (!payment) {
    const classData = await Class.findById(classId);
    payment = new Payment({
      classId,
      studentId,
      month,
      year,
      originalAmount: classData.feePerLesson,
      afterDiscountAmount: classData.feePerLesson,
      amountDue: classData.feePerLesson,
      paymentHistory: [],
    });
  }

  if (isDeleting) {
    payment.originalAmount -= classData.feePerLesson;
    payment.afterDiscountAmount -= classData.feePerLesson;
    payment.amountDue -= classData.feePerLesson;
  } else {
    payment.originalAmount += classData.feePerLesson;
    payment.afterDiscountAmount += classData.feePerLesson;
    payment.amountDue += classData.feePerLesson;
  }

  await payment.save();
};

module.exports = attendanceService;
