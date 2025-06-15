const { Class, Attendance, Student } = require("../models");
const { formatClassSchedule } = require("../utils/schedule");
const createNewAttendance = async (req, res) => {
  try {
    const classId = req.params.classId;
    const classExists = await Class.findById(classId);
    if (!classExists) {
      return res.status(404).json({ msg: "Lớp học không tồn tại" });
    }
    if (classExists.isAvailable === false) {
      return res.status(400).json({ msg: "Lớp học này không còn hoạt động" });
    }
    if (classExists.attendanceId) {
      return res.status(400).json({ msg: "Lớp học này đã có bảng điểm danh" });
    }

    const schedule = formatClassSchedule(classExists);

    if (
      !schedule ||
      !schedule.lessonDates ||
      schedule.lessonDates.length === 0
    ) {
      return res.status(400).json({ msg: "Lớp học này chưa có lịch học" });
    }
    let lessonCount = 1;
    const studentIds = classExists.studentList || [];
    const records = schedule.lessonDates.map((date) => ({
      date: new Date(date),
      lessonNumber: lessonCount++,
      students: studentIds.map((studentId) => ({
        studentId,
        isAbsent: false,
      })),
    }));
    const newAttendance = await Attendance.create({
      classId: classExists._id,
      records: records,
    });
    await Class.findByIdAndUpdate(classId, {
      attendanceId: newAttendance._id,
    });
    return res.status(201).json({
      msg: "Bảng điểm danh đã được tạo thành công",
    });
  } catch (error) {
    return res.status(500).json({
      msg: "Lỗi khi tạo bảng điểm danh",
      error: error.message,
    });
  }
};

const getAttendanceList = async (req, res) => {
  try {
    const classId = req.params.classId;
    const attendanceList = await Attendance.findOne({ classId });
    if (!attendanceList) {
      return res
        .status(404)
        .json({ msg: "Chưa có dữ liệu điểm danh cho lớp này" });
    }
    const dates = attendanceList.records.map((record) => {
      const absentNumber = record.students.filter(
        (student) => student.isAbsent
      ).length;
      const presentNumber = record.students.length - absentNumber;
      return {
        date: record.date,
        lessonNumber: record.lessonNumber,
        summary: {
          absentNumber,
          presentNumber,
          totalStudents: record.students.length,
        },
      };
    });
    return res.status(200).json({
      msg: "Danh sách điểm danh đã được lấy thành công",
      data: dates,
    });
  } catch (error) {
    return res.status(500).json({
      msg: "Lỗi khi lấy danh sách điểm danh",
      error: error.message,
    });
  }
};

const getAttendanceByLessonNumber = async (req, res) => {
  try {
    const classId = req.params.classId;
    const lessonNumber = parseInt(req.query.lessonNumber);

    if (isNaN(lessonNumber) || lessonNumber <= 0) {
      return res.status(400).json({
        msg: "Số buổi học không hợp lệ",
      });
    }
    const attendance = await Attendance.findOne({ classId });

    if (!attendance) {
      return res.status(404).json({
        msg: "Chưa có dữ liệu điểm danh cho lớp này",
      });
    }
    const record = attendance.records.find(
      (record) => record.lessonNumber === lessonNumber
    );
    if (!record) {
      return res.status(404).json({
        msg: `Không tìm thấy điểm danh cho buổi học số ${lessonNumber}`,
      });
    }
    const populatedStudents = [];
    await Promise.all(
      record.students.map(async (student) => {
        const studentData = await Student.findById(student.studentId).populate(
          "userId",
          "name email gender phoneNumber"
        );
        if (studentData && studentData.userId) {
          populatedStudents.push({
            _id: student._id,
            studentId: student.studentId,
            isAbsent: student.isAbsent,
            studentName: studentData.userId.name || "Unknown",
            email: studentData.userId.email || "",
            phone: studentData.userId.phoneNumber || "",
            gender: studentData.userId.gender || "Unknown",
          });
        } else {
          // Xử lý trường hợp không tìm thấy học sinh
          populatedStudents.push({
            _id: student._id,
            studentId: student.studentId,
            isAbsent: student.isAbsent,
            note: student.note || "",
            studentName: "Unknown",
            email: "",
            phone: "",
          });
        }
      })
    );
    return res.status(200).json({
      msg: "Điểm danh cho buổi học đã được lấy thành công",
      data: {
        id: record._id,
        date: record.date,
        lessonNumber: record.lessonNumber,
        students: populatedStudents,
      },
    });
  } catch (error) {
    return res.status(500).json({
      msg: "Lỗi khi lấy điểm danh cho buổi học",
      error: error.message,
    });
  }
};

const takingAttendance = async (req, res) => {
  try {
    const { classId } = req.params;
    const { lessonNumber } = req.query;
    const { students } = req.body;

    if (!classId || !lessonNumber || !students || !Array.isArray(students)) {
      return res.status(400).json({
        msg: "Dữ liệu không hợp lệ",
        detail: "Cần cung cấp classId, lessonNumber và danh sách students",
      });
    }

    const parsedLessonNumber = parseInt(lessonNumber);
    if (isNaN(parsedLessonNumber) || parsedLessonNumber <= 0) {
      return res.status(400).json({
        msg: "Số buổi học không hợp lệ",
      });
    }

    // Tìm bản ghi điểm danh
    const attendance = await Attendance.findOne({ classId });
    if (!attendance) {
      return res.status(404).json({
        msg: "Không tìm thấy bảng điểm danh cho lớp học này",
      });
    }

    // Tìm buổi học theo lessonNumber
    const recordIndex = attendance.records.findIndex(
      (record) => record.lessonNumber === parsedLessonNumber
    );

    if (recordIndex === -1) {
      return res.status(404).json({
        msg: `Không tìm thấy buổi học số ${parsedLessonNumber}`,
      });
    }

    // Cập nhật trạng thái điểm danh cho từng học sinh
    const updatedStudents = [];
    let studentsUpdated = 0;

    students.forEach((student) => {
      if (!student.studentId) return;

      const studentIndex = attendance.records[recordIndex].students.findIndex(
        (s) => s.studentId.toString() === student.studentId.toString()
      );

      if (studentIndex !== -1) {
        // Cập nhật trạng thái vắng mặt
        attendance.records[recordIndex].students[studentIndex].isAbsent =
          student.isAbsent === true;

        updatedStudents.push({
          studentId: student.studentId,
          isAbsent: student.isAbsent === true,
        });

        studentsUpdated++;
      }
    });

    // Lưu thay đổi
    await attendance.save();

    return res.status(200).json({
      msg: "Điểm danh đã được cập nhật thành công",
      data: {
        classId,
        lessonNumber: parsedLessonNumber,
        date: attendance.records[recordIndex].date,
        studentsUpdated,
        updatedStudents,
      },
    });
  } catch (error) {
    return res.status(500).json({
      msg: "Lỗi khi cập nhật điểm danh",
      error: error.message,
    });
  }
};
module.exports = {
  createNewAttendance,
  getAttendanceList,
  getAttendanceByLessonNumber,
  takingAttendance,
};
