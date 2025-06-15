const { Class, Attendance } = require("../models");
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

    if (!schedule || schedule.length === 0) {
      return res.status(400).json({ msg: "Lớp học này chưa có lịch học" });
    }

    const studentIds = classExists.studentList || [];
    const records = schedule.lessonDates.map((date) => ({
      date: new Date(date),
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
module.exports = {
  createNewAttendance,
};
