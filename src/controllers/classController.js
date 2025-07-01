const ClassService = require("../services/ClassService");
const { catchAsync } = require("../core/middleware");
const { ApiResponse } = require("../core/utils");

const classService = new ClassService();

const classController = {
  createNewClass: catchAsync(async (req, res) => {
    const newClass = await classService.create(req.body);
    ApiResponse.success(res, "Tạo lớp học thành công", newClass, 201);
  }),

  getClassInfo: catchAsync(async (req, res) => {
    const { include } = req.query;
    const includeOptions = {
      schedule: include && include.includes("schedule"),
      students: include && include.includes("students"),
      attendance: include && include.includes("attendance"),
      detailed: include && include.includes("detailed"),
    };

    if (!req.params.classId) {
      return ApiResponse.error(res, "Thiếu thông tin ID lớp học", 400);
    }

    // Kiểm tra quyền: Teacher chỉ được xem lớp mình dạy
    if (req.user && req.user.role === "Teacher") {
      const hasPermission = await classService.checkTeacherClassPermission(
        req.user.teacherId,
        req.params.classId
      );

      if (!hasPermission) {
        return ApiResponse.error(
          res,
          "Bạn không có quyền xem lớp học này",
          403
        );
      }
    }

    const classData = await classService.getDetailedById(
      req.params.classId,
      includeOptions
    );

    ApiResponse.success(res, "Lấy thông tin lớp học thành công", classData);
  }),

  updateClass: catchAsync(async (req, res) => {
    const updatedClass = await classService.updateById(
      req.params.classId,
      req.body
    );
    ApiResponse.success(res, "Cập nhật lớp học thành công", updatedClass);
  }),

  deleteClass: catchAsync(async (req, res) => {
    await classService.deleteById(req.params.classId);
    ApiResponse.success(res, "Xóa lớp học thành công");
  }),

  getAllClasses: catchAsync(async (req, res) => {
    const { page, limit, sort, teacherId } = req.query;

    // Teacher có thể chỉ xem lớp của mình
    let filterTeacherId = teacherId;
    if (req.user && req.user.role === "Teacher") {
      filterTeacherId = req.user.teacherId;
    }

    const options = {
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 10,
      sort: sort ? JSON.parse(sort) : { createdAt: -1 },
      teacherId: filterTeacherId,
    };

    const result = await classService.getAllClasses({}, options);
    ApiResponse.success(res, "Lấy danh sách lớp học thành công", {
      classes: result.classes,
      pagination: result.pagination,
    });
  }),

  getClassesOverview: catchAsync(async (req, res) => {
    const overview = await classService.getClassesOverview();
    ApiResponse.success(res, "Lấy tổng quan lớp học thành công", overview);
  }),

  getAvailableTeachers: catchAsync(async (req, res) => {
    const teachers = await classService.getAvailableTeachers();
    ApiResponse.success(
      res,
      "Lấy danh sách giáo viên khả dụng thành công",
      teachers
    );
  }),

  getAvailableStudents: catchAsync(async (req, res) => {
    const students = await classService.getAvailableStudents();
    ApiResponse.success(
      res,
      "Lấy danh sách học sinh khả dụng thành công",
      students
    );
  }),
};

module.exports = classController;
