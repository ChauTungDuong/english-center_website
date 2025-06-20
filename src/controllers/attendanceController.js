const attendanceService = require("../services/role_services/attendanceService");

const attendanceController = {
  // 1. Tạo buổi điểm danh mới cho lớp
  async createClassAttendance(req, res) {
    try {
      const { classId } = req.params;
      const { date, lessonNumber } = req.body;

      const attendanceData = {
        classId,
        date,
        lessonNumber,
      };

      const newAttendance = await attendanceService.create(attendanceData);
      return res.status(201).json({
        msg: "Tạo buổi điểm danh thành công",
        data: newAttendance,
      });
    } catch (error) {
      return res.status(500).json({
        msg: "Lỗi khi tạo buổi điểm danh",
        error: error.message,
      });
    }
  },
  // 2. Thực hiện điểm danh theo buổi (đánh dấu các học sinh)
  async markAttendance(req, res) {
    try {
      const { attendanceId } = req.params;
      const { studentsAttendance, students } = req.body;

      // Support both field names for backward compatibility
      const studentData = studentsAttendance || students;

      if (!studentData) {
        return res.status(400).json({
          msg: "Thiếu thông tin điểm danh học sinh",
          error: "Vui lòng cung cấp studentsAttendance hoặc students",
        });
      }

      const attendance = await attendanceService.getById(attendanceId);
      if (!attendance) {
        return res.status(404).json({
          msg: "Không tìm thấy buổi điểm danh",
        });
      } // Use markClassAttendance method with proper business logic
      const classId = attendance.classId._id || attendance.classId;
      const updatedAttendance = await attendanceService.markClassAttendance(
        classId,
        attendance.date,
        studentData,
        attendance.lessonNumber
      );

      return res.status(200).json({
        msg: "Điểm danh thành công",
        data: updatedAttendance,
      });
    } catch (error) {
      return res.status(500).json({
        msg: "Lỗi khi thực hiện điểm danh",
        error: error.message,
      });
    }
  },
  // 3. Xóa điểm danh
  async deleteAttendance(req, res) {
    try {
      const result = await attendanceService.delete(req.params.attendanceId);
      return res.status(200).json({
        msg: result.message,
      });
    } catch (error) {
      return res.status(500).json({
        msg: "Lỗi khi xóa điểm danh",
        error: error.message,
      });
    }
  },

  // 4. Lấy danh sách các buổi điểm danh của 1 lớp
  async getClassAttendances(req, res) {
    try {
      const { classId } = req.params;
      const { page, limit, startDate, endDate } = req.query;

      const options = {
        page: page ? parseInt(page) : 1,
        limit: limit ? parseInt(limit) : 10,
        startDate,
        endDate,
      };

      const result = await attendanceService.getByClass(classId, options);
      return res.status(200).json({
        msg: "Lấy danh sách điểm danh lớp thành công",
        data: result.attendances,
        pagination: result.pagination,
      });
    } catch (error) {
      return res.status(500).json({
        msg: "Lỗi khi lấy danh sách điểm danh lớp",
        error: error.message,
      });
    }
  },
};

module.exports = attendanceController;
