const { Student, Attendance } = require("../models");
const getStudentClasses = async (req, res) => {
  try {
    const studentId = req.params.id;
    const student = await Student.findById(studentId).populate({
      path: "classId",
      select: "className grade year schedule feePerLesson",
      populate: {
        path: "teacherId",
        select: "userId",
        populate: {
          path: "userId",
          select: "name",
        },
      },
    });

    if (!student) {
      return res.status(404).json({ msg: "Học sinh không tồn tại" });
    }

    return res.status(200).json({
      msg: "Lấy danh sách lớp học thành công",
      data: student.classId,
    });
  } catch (error) {
    return res.status(500).json({
      msg: "Lỗi khi lấy thông tin lớp học",
      error: error.message,
    });
  }
};

const getStudentAttendance = async (req, res) => {
  try {
    const { studentId, classId } = req.params;

    const attendance = await Attendance.findOne({ classId });
    if (!attendance) {
      return res.status(404).json({ msg: "Không tìm thấy dữ liệu điểm danh" });
    }

    // Thống kê điểm danh cho học sinh
    let totalLessons = attendance.records.length;
    let absentLessons = 0;

    const studentAttendance = attendance.records.map((record) => {
      const studentRecord = record.students.find(
        (s) => s.studentId.toString() === studentId
      );

      if (studentRecord && studentRecord.isAbsent) {
        absentLessons++;
      }

      return {
        date: record.date,
        lessonNumber: record.lessonNumber,
        isAbsent: studentRecord ? studentRecord.isAbsent : false,
      };
    });

    return res.status(200).json({
      msg: "Lấy thông tin điểm danh thành công",
      data: {
        totalLessons,
        absentLessons,
        attendedLessons: totalLessons - absentLessons,
        details: studentAttendance,
      },
    });
  } catch (error) {
    return res.status(500).json({
      msg: "Lỗi khi lấy thông tin điểm danh",
      error: error.message,
    });
  }
};

module.exports = {
  getStudentClasses,
  getStudentAttendance,
};
