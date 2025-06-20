/**
 * Cập nhật danh sách học sinh trong bảng điểm danh khi thay đổi danh sách học sinh trong lớp
 */
const updateAttendanceStudents = async (
  classId,
  studentIds,
  action,
  session
) => {
  try {
    const { Attendance } = require("../models");
    const attendance = await Attendance.findOne({ classId }).session(session);
    if (!attendance) return null; // Không tìm thấy bảng điểm danh

    switch (action) {
      case "add":
        // Thêm học sinh vào tất cả các buổi học
        attendance.records.forEach((record) => {
          studentIds.forEach((studentId) => {
            // Kiểm tra xem học sinh đã có trong danh sách chưa
            const studentExists = record.students.some(
              (s) => s.studentId.toString() === studentId.toString()
            );

            if (!studentExists) {
              record.students.push({
                studentId,
                isAbsent: false,
              });
            }
          });
        });
        break;

      case "remove":
        // Xóa học sinh khỏi tất cả các buổi học
        attendance.records.forEach((record) => {
          record.students = record.students.filter(
            (student) => !studentIds.includes(student.studentId.toString())
          );
        });
        break;

      case "set":
        // Cập nhật lại toàn bộ danh sách học sinh
        attendance.records.forEach((record) => {
          // Xóa những học sinh không còn trong danh sách mới
          record.students = record.students.filter((student) =>
            studentIds.includes(student.studentId.toString())
          );

          // Thêm những học sinh mới
          studentIds.forEach((studentId) => {
            const studentExists = record.students.some(
              (s) => s.studentId.toString() === studentId.toString()
            );

            if (!studentExists) {
              record.students.push({
                studentId,
                isAbsent: false,
              });
            }
          });
        });
        break;
    }

    await attendance.save({ session });
    return attendance;
  } catch (error) {
    console.error("Lỗi khi cập nhật bảng điểm danh:", error);
    return null;
  }
};

module.exports = updateAttendanceStudents;
