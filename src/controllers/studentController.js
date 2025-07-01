const StudentService = require("../services/StudentService");
const { catchAsync } = require("../core/middleware");
const { ApiResponse } = require("../core/utils");

const studentService = new StudentService();

const studentController = {
  createNewStudent: catchAsync(async (req, res) => {
    const newStudent = await studentService.createStudent(req.body);
    ApiResponse.success(res, "Tạo học sinh thành công", newStudent, 201);
  }),

  getStudentInfo: catchAsync(async (req, res) => {
    const student = await studentService.getById(req.params.studentId);
    ApiResponse.success(res, "Lấy thông tin học sinh thành công", student);
  }),

  updateStudent: catchAsync(async (req, res) => {
    const updatedStudent = await studentService.updateById(
      req.params.studentId,
      req.body
    );
    ApiResponse.success(
      res,
      "Cập nhật thông tin học sinh thành công",
      updatedStudent
    );
  }),

  deleteStudent: catchAsync(async (req, res) => {
    await studentService.deleteById(req.params.studentId);
    ApiResponse.success(res, "Xóa học sinh thành công");
  }),

  getAllStudents: catchAsync(async (req, res) => {
    const { page, limit, sort, isActive } = req.query;

    // Parse isActive để có logic rõ ràng: true, false, hoặc undefined
    let parsedIsActive;
    if (isActive === "true") {
      parsedIsActive = true;
    } else if (isActive === "false") {
      parsedIsActive = false;
    }
    // Nếu isActive không có hoặc không phải "true"/"false" thì để undefined

    const options = {
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 10,
      sort: sort ? JSON.parse(sort) : { createdAt: -1 },
      isActive: parsedIsActive,
    };

    const result = await studentService.getAllStudents({}, options);
    ApiResponse.success(res, "Lấy danh sách học sinh thành công", {
      students: result.students,
      pagination: result.pagination,
    });
  }),

  // API mới: Lấy danh sách lớp có thể tham gia
  getAvailableClasses: catchAsync(async (req, res) => {
    const { studentId } = req.params;
    const { year, grade } = req.query;

    const availableClasses = await studentService.getAvailableClassesForStudent(
      studentId,
      {
        year,
        grade,
      }
    );

    ApiResponse.success(
      res,
      "Lấy danh sách lớp có thể tham gia thành công",
      availableClasses
    );
  }),

  // API chuyên biệt: Đăng ký học sinh vào lớp học với payment
  enrollToClasses: catchAsync(async (req, res) => {
    const { studentId } = req.params;
    const { classesWithDiscount } = req.body;

    if (!classesWithDiscount || !Array.isArray(classesWithDiscount)) {
      return ApiResponse.error(
        res,
        "Thiếu thông tin classesWithDiscount hoặc định dạng không đúng",
        400
      );
    }

    const result = await studentService.enrollToClassesWithPayments(
      studentId,
      classesWithDiscount
    );

    ApiResponse.success(res, "Đăng ký lớp học cho học sinh thành công", result);
  }),

  // API chuyên biệt: Loại học sinh khỏi lớp học
  withdrawFromClasses: catchAsync(async (req, res) => {
    const { studentId } = req.params;
    const { classIds } = req.body;

    if (!classIds || !Array.isArray(classIds)) {
      return ApiResponse.error(
        res,
        "Thiếu thông tin classIds hoặc định dạng không đúng",
        400
      );
    }

    const result = await studentService.withdrawFromClasses(
      studentId,
      classIds
    );

    ApiResponse.success(res, "Loại học sinh khỏi lớp học thành công", result);
  }),

  // Soft delete student (chỉ admin)
  softDeleteStudent: catchAsync(async (req, res) => {
    // Chỉ admin mới có quyền
    if (req.user.role !== "Admin") {
      return ApiResponse.error(
        res,
        "Chỉ Admin mới có quyền thực hiện thao tác này",
        403
      );
    }

    const { studentId } = req.params;

    const result = await studentService.softDelete(studentId);

    ApiResponse.success(res, "Xóa mềm student thành công", { student: result });
  }),
};

module.exports = studentController;
