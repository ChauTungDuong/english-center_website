const { Teacher } = require("../models");
const getTeacherClasses = async (req, res) => {
  try {
    const teacherId = req.params.id;
    if (!teacherId) {
      return res.status(400).json({ msg: "Thiếu thông tin giáo viên" });
    }
    const teacher = await Teacher.findById(teacherId).populate({
      path: "classId",
      select:
        "className year grade isAvailable feePerLesson schedule studentList",
    });
    if (!teacher) {
      return res.status(404).json({ msg: "Giáo viên không tồn tại" });
    }

    if (!teacher.classId || teacher.classId.length === 0) {
      return res
        .status(404)
        .json({ msg: "Giáo viên này không có lớp học nào" });
    }
    return res.status(200).json({
      msg: "Danh sách lớp học của giáo viên được lấy thành công",
      classes: teacher.classId,
    });
  } catch (error) {
    return res.status(500).json({
      msg: "Lỗi khi lấy danh sách lớp học của giáo viên",
      error: error.message,
    });
  }
};
module.exports = {
  getTeacherClasses,
};
