const AttendanceService = require("../services/AttendanceService");
const { catchAsync } = require("../core/middleware");
const { ApiResponse } = require("../core/utils");

const attendanceService = new AttendanceService();

const attendanceController = {
  // 1. Tạo buổi điểm danh mới cho lớp
  createClassAttendance: catchAsync(async (req, res) => {
    const { classId } = req.params;
    const { date, lessonNumber } = req.body;

    const attendanceData = {
      classId,
      date,
      lessonNumber,
    };

    const newAttendance = await attendanceService.createClassAttendance(
      attendanceData
    );
    ApiResponse.success(
      res,
      "Tạo buổi điểm danh thành công",
      newAttendance,
      201
    );
  }),

  // 2. Thực hiện điểm danh theo buổi (đánh dấu các học sinh)
  markAttendance: catchAsync(async (req, res) => {
    const { attendanceId } = req.params;
    const { studentsAttendance, students } = req.body;

    // Support both field names for backward compatibility
    const studentData = studentsAttendance || students;

    if (!studentData) {
      return ApiResponse.error(
        res,
        "Thiếu thông tin điểm danh học sinh - Vui lòng cung cấp studentsAttendance hoặc students",
        400
      );
    }

    const attendance = await attendanceService.getById(attendanceId);
    if (!attendance) {
      return ApiResponse.error(res, "Không tìm thấy buổi điểm danh", 404);
    }

    // Use markClassAttendance method with proper business logic
    const classId = attendance.classId._id || attendance.classId;
    const updatedAttendance = await attendanceService.markClassAttendance(
      classId,
      attendance.date,
      studentData,
      attendance.lessonNumber
    );

    ApiResponse.success(res, "Điểm danh thành công", updatedAttendance);
  }),

  // 3. Xóa điểm danh
  deleteAttendance: catchAsync(async (req, res) => {
    const result = await attendanceService.deleteById(req.params.attendanceId);
    ApiResponse.success(res, result.message || "Xóa điểm danh thành công");
  }),

  // 4. Lấy danh sách các buổi điểm danh của 1 lớp
  getClassAttendances: catchAsync(async (req, res) => {
    const { classId } = req.params;
    const { page, limit, startDate, endDate } = req.query;

    const options = {
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 10,
      startDate,
      endDate,
    };

    const result = await attendanceService.getAttendancesByClass(
      classId,
      options
    );
    ApiResponse.success(res, "Lấy danh sách điểm danh lớp thành công", {
      attendances: result.attendances,
      pagination: result.pagination,
    });
  }),
};

module.exports = attendanceController;
