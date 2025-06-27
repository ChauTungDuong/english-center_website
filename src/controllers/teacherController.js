const teacherService = require("../services/role_services/teacherService");

const teacherController = {
  // Tạo giáo viên mới
  async createNewTeacher(req, res) {
    try {
      const teacher = await teacherService.create(req.body);
      return res.status(201).json({
        msg: "Tạo giáo viên thành công",
        data: teacher,
      });
    } catch (error) {
      return res.status(500).json({
        msg: "Lỗi khi tạo giáo viên",
        error: error.message,
      });
    }
  },

  // Lấy thông tin giáo viên theo ID
  async getTeacherInfo(req, res) {
    try {
      const teacher = await teacherService.getById(req.params.teacherId);
      return res.status(200).json({
        msg: "Lấy thông tin giáo viên thành công",
        data: teacher,
      });
    } catch (error) {
      return res.status(500).json({
        msg: "Lỗi khi lấy thông tin giáo viên",
        error: error.message,
      });
    }
  },

  // Cập nhật thông tin giáo viên
  async updateTeacher(req, res) {
    try {
      const updatedTeacher = await teacherService.update(
        req.params.teacherId,
        req.body
      );
      return res.status(200).json({
        msg: "Cập nhật thông tin giáo viên thành công",
        data: updatedTeacher,
      });
    } catch (error) {
      return res.status(500).json({
        msg: "Lỗi khi cập nhật thông tin giáo viên",
        error: error.message,
      });
    }
  },

  // Xóa giáo viên
  async deleteTeacher(req, res) {
    try {
      await teacherService.delete(req.params.teacherId);
      return res.status(200).json({
        msg: "Xóa giáo viên thành công",
      });
    } catch (error) {
      return res.status(500).json({
        msg: "Lỗi khi xóa giáo viên",
        error: error.message,
      });
    }
  },

  // Lấy danh sách tất cả giáo viên
  async getAllTeachers(req, res) {
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
        page: parseInt(page) || 1,
        limit: parseInt(limit) || 10,
        sort: sort ? JSON.parse(sort) : { createdAt: -1 },
        isActive: parsedIsActive,
      };

      const result = await teacherService.getAll({}, options);
      return res.status(200).json({
        msg: "Lấy danh sách giáo viên thành công",
        data: result.teachers,
        pagination: result.pagination,
      });
    } catch (error) {
      return res.status(500).json({
        msg: "Lỗi khi lấy danh sách giáo viên",
        error: error.message,
      });
    }
  },

  // Soft delete teacher (chỉ admin)
  async softDeleteTeacher(req, res) {
    try {
      // Chỉ admin mới có quyền
      if (req.user.role !== "Admin") {
        return res.status(403).json({
          msg: "Chỉ Admin mới có quyền thực hiện thao tác này",
        });
      }

      const { teacherId } = req.params;

      const result = await teacherService.softDelete(teacherId);

      return res.status(200).json({
        msg: "Xóa mềm teacher thành công",
        teacher: result,
      });
    } catch (error) {
      return res.status(500).json({
        msg: "Lỗi khi xóa mềm teacher",
        error: error.message,
      });
    }
  },
};

module.exports = teacherController;
