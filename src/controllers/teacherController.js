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
      const { page, limit, sort } = req.query;
      const options = {
        page: parseInt(page) || 1,
        limit: parseInt(limit) || 10,
        sort: sort ? JSON.parse(sort) : { createdAt: -1 },
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

  // Lấy danh sách lớp học của giáo viên
  async getTeacherClasses(req, res) {
    try {
      const teacherId = req.params.id || req.params.teacherId;
      const classes = await teacherService.getTeacherClasses(teacherId);

      if (!classes || classes.length === 0) {
        return res.status(404).json({
          msg: "Giáo viên này không có lớp học nào",
          data: [],
        });
      }

      return res.status(200).json({
        msg: "Lấy danh sách lớp học của giáo viên thành công",
        data: classes,
      });
    } catch (error) {
      return res.status(500).json({
        msg: "Lỗi khi lấy danh sách lớp học của giáo viên",
        error: error.message,
      });
    }
  },
};

module.exports = teacherController;
