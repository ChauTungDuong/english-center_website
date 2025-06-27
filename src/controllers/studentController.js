const studentService = require("../services/role_services/studentService");

const studentController = {
  async createNewStudent(req, res) {
    try {
      const newStudent = await studentService.create(req.body);
      return res.status(201).json({
        msg: "Tạo học sinh thành công",
        data: newStudent,
      });
    } catch (error) {
      return res.status(500).json({
        msg: "Lỗi khi tạo học sinh",
        error: error.message,
      });
    }
  },

  async getStudentInfo(req, res) {
    try {
      const student = await studentService.getById(req.params.studentId);
      return res.status(200).json({
        msg: "Lấy thông tin học sinh thành công",
        data: student,
      });
    } catch (error) {
      return res.status(500).json({
        msg: "Lỗi khi lấy thông tin học sinh",
        error: error.message,
      });
    }
  },
  async updateStudent(req, res) {
    try {
      const updatedStudent = await studentService.update(
        req.params.studentId,
        req.body
      );
      return res.status(200).json({
        msg: "Cập nhật thông tin học sinh thành công",
        data: updatedStudent,
      });
    } catch (error) {
      return res.status(500).json({
        msg: "Lỗi khi cập nhật thông tin học sinh",
        error: error.message,
      });
    }
  },

  async deleteStudent(req, res) {
    try {
      await studentService.delete(req.params.studentId);
      return res.status(200).json({
        msg: "Xóa học sinh thành công",
      });
    } catch (error) {
      return res.status(500).json({
        msg: "Lỗi khi xóa học sinh",
        error: error.message,
      });
    }
  },

  async getAllStudents(req, res) {
    try {
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

      const result = await studentService.getAll({}, options);
      return res.status(200).json({
        msg: "Lấy danh sách học sinh thành công",
        data: result.students,
        pagination: result.pagination,
      });
    } catch (error) {
      return res.status(500).json({
        msg: "Lỗi khi lấy danh sách học sinh",
        error: error.message,
      });
    }
  },

  // API mới: Lấy danh sách lớp có thể tham gia
  async getAvailableClasses(req, res) {
    try {
      const { studentId } = req.params;
      const { year, grade } = req.query;

      const availableClasses =
        await studentService.getAvailableClassesForStudent(studentId, {
          year,
          grade,
        });

      return res.status(200).json({
        msg: "Lấy danh sách lớp có thể tham gia thành công",
        data: availableClasses,
      });
    } catch (error) {
      return res.status(500).json({
        msg: "Lỗi khi lấy danh sách lớp có thể tham gia",
        error: error.message,
      });
    }
  },

  // API chuyên biệt: Đăng ký học sinh vào lớp học với payment
  async enrollToClasses(req, res) {
    try {
      const { studentId } = req.params;
      const { classesWithDiscount } = req.body;

      if (!classesWithDiscount || !Array.isArray(classesWithDiscount)) {
        return res.status(400).json({
          msg: "Thiếu thông tin classesWithDiscount hoặc định dạng không đúng",
        });
      }

      const result = await studentService.enrollToClassesWithPayments(
        studentId,
        classesWithDiscount
      );

      return res.status(200).json({
        msg: "Đăng ký lớp học cho học sinh thành công",
        data: result,
      });
    } catch (error) {
      return res.status(500).json({
        msg: "Lỗi khi đăng ký lớp học cho học sinh",
        error: error.message,
      });
    }
  },

  // API chuyên biệt: Loại học sinh khỏi lớp học
  async withdrawFromClasses(req, res) {
    try {
      const { studentId } = req.params;
      const { classIds } = req.body;

      if (!classIds || !Array.isArray(classIds)) {
        return res.status(400).json({
          msg: "Thiếu thông tin classIds hoặc định dạng không đúng",
        });
      }

      const result = await studentService.withdrawFromClasses(
        studentId,
        classIds
      );

      return res.status(200).json({
        msg: "Loại học sinh khỏi lớp học thành công",
        data: result,
      });
    } catch (error) {
      return res.status(500).json({
        msg: "Lỗi khi loại học sinh khỏi lớp học",
        error: error.message,
      });
    }
  },

  // Soft delete student (chỉ admin)
  async softDeleteStudent(req, res) {
    try {
      // Chỉ admin mới có quyền
      if (req.user.role !== "Admin") {
        return res.status(403).json({
          msg: "Chỉ Admin mới có quyền thực hiện thao tác này",
        });
      }

      const { studentId } = req.params;

      const result = await studentService.softDelete(studentId);

      return res.status(200).json({
        msg: "Xóa mềm student thành công",
        student: result,
      });
    } catch (error) {
      return res.status(500).json({
        msg: "Lỗi khi xóa mềm student",
        error: error.message,
      });
    }
  },
};

module.exports = studentController;
