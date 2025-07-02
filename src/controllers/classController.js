const classService = require("../services/role_services/classService");

const classController = {
  async createNewClass(req, res) {
    try {
      const newClass = await classService.create(req.body);
      return res.status(201).json({
        msg: "Tạo lớp học thành công",
        data: newClass,
      });
    } catch (error) {
      return res.status(500).json({
        msg: "Lỗi khi tạo lớp học",
        error: error.message,
      });
    }
  },
  async getClassInfo(req, res) {
    try {
      const { include } = req.query;
      const includeOptions = {
        schedule: include && include.includes("schedule"),
        students: include && include.includes("students"),
        attendance: include && include.includes("attendance"),
        detailed: include && include.includes("detailed"),
      };

      if (!req.params.classId) {
        return res.status(400).json({
          msg: "Thiếu thông tin ID lớp học",
        });
      }

      // Kiểm tra quyền: Teacher chỉ được xem lớp mình dạy
      if (req.user.role === "Teacher") {
        const hasPermission = await classService.checkTeacherClassPermission(
          req.user.roleId, // Sử dụng roleId thay vì teacherId
          req.params.classId
        );

        if (!hasPermission) {
          return res.status(403).json({
            msg: "Bạn không có quyền xem lớp học này",
          });
        }
      }

      const classData = await classService.getById(
        req.params.classId,
        includeOptions
      );

      return res.status(200).json({
        msg: "Lấy thông tin lớp học thành công",
        data: classData,
      });
    } catch (error) {
      return res.status(500).json({
        msg: "Lỗi khi lấy thông tin lớp học",
        error: error.message,
      });
    }
  },

  // ✅ REMOVED: Schedule information is now included via ?include=schedule parameter
  // in the getClassInfo method above, eliminating the need for a separate endpoint
  //
  // async getClassSchedule(req, res) { ... }
  async updateClass(req, res) {
    try {
      const { classId } = req.params;
      const updates = req.body;

      // 🔥 Xử lý thêm students với discount
      if (updates.studentsWithDiscount) {
        const result = await classService.addStudentsWithDiscount(
          classId,
          updates.studentsWithDiscount
        );

        return res.status(200).json({
          msg: "Thêm học sinh vào lớp với discount thành công",
          data: result,
        });
      }

      // Logic update class bình thường
      const updatedClass = await classService.update(
        req.params.classId,
        req.body
      );
      return res.status(200).json({
        msg: "Cập nhật thông tin lớp học thành công",
        data: updatedClass,
      });
    } catch (error) {
      return res.status(500).json({
        msg: "Lỗi khi cập nhật thông tin lớp học",
        error: error.message,
      });
    }
  },

  async deleteClass(req, res) {
    try {
      const { hardDelete } = req.query;
      const result = await classService.delete(
        req.params.classId,
        hardDelete === "true"
      );
      return res.status(200).json({
        msg: result.message,
      });
    } catch (error) {
      return res.status(500).json({
        msg: "Lỗi khi xóa lớp học",
        error: error.message,
      });
    }
  },
  async getAllClasses(req, res) {
    try {
      const {
        page,
        limit,
        sort,
        year,
        grade,
        isAvailable,
        teacherId,
        summary,
      } = req.query;

      // Build filter object
      const filter = {};
      if (year && year.trim()) filter.year = parseInt(year);
      if (grade && grade.trim()) filter.grade = parseInt(grade);
      if (isAvailable && isAvailable.trim()) {
        filter.isAvailable = isAvailable === "true";
      }

      // Filter by role: Teacher chỉ xem lớp mình dạy
      if (req.user.role === "Teacher") {
        filter.teacherId = req.user.roleId; // Sử dụng roleId thay vì teacherId
      } else if (teacherId && teacherId.trim()) {
        // Admin có thể filter theo teacherId
        filter.teacherId = teacherId;
      }

      const options = {
        page: page ? parseInt(page) : 1,
        limit: limit ? parseInt(limit) : 10,
        sort: sort ? JSON.parse(sort) : { createdAt: -1 },
        summary: summary === "true", // Chỉ trả về thông tin cơ bản cho list view
      };

      const result = await classService.getAll(filter, options);

      return res.status(200).json({
        msg: "Lấy danh sách lớp học thành công",
        data: result.classes,
        pagination: result.pagination,
      });
    } catch (error) {
      return res.status(500).json({
        msg: "Lỗi khi lấy danh sách lớp học",
        error: error.message,
      });
    }
  },
  // ✅ REMOVED: These methods are now handled by the unified PATCH /classes/:classId endpoint
  // which can handle all class updates including student/teacher assignments through req.body

  // async addStudentToClass(req, res) { ... }
  // async removeStudentFromClass(req, res) { ... }
  // async assignTeacher(req, res) { ... }
  // async removeTeacherFromClass(req, res) { ... }
  // async addMultipleStudents(req, res) { ... }
  // async removeMultipleStudents(req, res) { ... }

  async getClassesOverview(req, res) {
    try {
      const overview = await classService.getClassesOverview();
      return res.status(200).json({
        msg: "Lấy thống kê tổng quan lớp học thành công",
        data: overview,
      });
    } catch (error) {
      return res.status(500).json({
        msg: "Lỗi khi lấy thống kê tổng quan lớp học",
        error: error.message,
      });
    }
  },

  async getAvailableTeachers(req, res) {
    try {
      const { excludeClassId } = req.query;
      const teachers = await classService.getAvailableTeachers(excludeClassId);

      return res.status(200).json({
        msg: "Lấy danh sách giáo viên available thành công",
        data: teachers,
      });
    } catch (error) {
      return res.status(500).json({
        msg: "Lỗi khi lấy danh sách giáo viên available",
        error: error.message,
      });
    }
  },

  async getAvailableStudents(req, res) {
    try {
      const { excludeClassId } = req.query;
      const students = await classService.getAvailableStudents(excludeClassId);

      return res.status(200).json({
        msg: "Lấy danh sách học sinh available thành công",
        data: students,
      });
    } catch (error) {
      return res.status(500).json({
        msg: "Lỗi khi lấy danh sách học sinh available",
        error: error.message,
      });
    }
  },
  // ✅ REMOVED: Consolidated into teacherController.getTeacherClasses
  // This eliminates API duplication and centralizes teacher-related operations
};

module.exports = classController;
