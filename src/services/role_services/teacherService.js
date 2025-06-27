const { Teacher, Class } = require("../../models");
const userService = require("./userService");
const { userUpdateFields, teacherUpdateFields } = require("./updateFields");
const withTransaction = require("../../utils/session");

const teacherService = {
  /**
   * Tạo giáo viên mới
   * @param {Object} teacherData - Dữ liệu giáo viên (bao gồm thông tin user và teacher)
   * @returns {Object} Teacher đã được tạo
   */
  async create(teacherData) {
    return await withTransaction(async (session) => {
      try {
        // Lấy thông tin user fields
        const userFields = userUpdateFields(teacherData);
        if (!userFields.email || !userFields.passwordBeforeHash) {
          throw new Error("Thiếu thông tin bắt buộc: email hoặc password");
        }

        // Lấy thông tin teacher fields
        const teacherFields = teacherUpdateFields(teacherData);

        // Tạo user với role Teacher
        const user = await userService.create(userFields, "Teacher", session);
        if (user.role !== "Teacher") {
          throw new Error("Vai trò không hợp lệ");
        }

        // Tạo teacher record
        const teacher = await Teacher.create(
          [
            {
              userId: user._id,
              classId: teacherFields.classId || [],
              wagePerLesson: teacherFields.wagePerLesson || 0,
            },
          ],
          { session }
        );

        // Cập nhật relationship với Class nếu có classId
        if (teacherFields.classId && teacherFields.classId.length > 0) {
          const classIds = Array.isArray(teacherFields.classId)
            ? teacherFields.classId
            : [teacherFields.classId];

          // Kiểm tra các class có tồn tại không
          const validClasses = await Class.find({
            _id: { $in: classIds },
          }).session(session);

          if (validClasses.length !== classIds.length) {
            throw new Error("Một số lớp học không tồn tại");
          }

          // Cập nhật teacherId cho các class
          await Class.updateMany(
            { _id: { $in: classIds } },
            { $set: { teacherId: teacher[0]._id } },
            { session }
          );
        }

        return teacher[0];
      } catch (error) {
        throw new Error(`Lỗi khi tạo giáo viên: ${error.message}`);
      }
    });
  },

  /**
   * Lấy thông tin giáo viên theo ID
   * @param {String} teacherId - ID của giáo viên
   * @returns {Object} Thông tin giáo viên đầy đủ
   */
  async getById(teacherId) {
    try {
      if (!teacherId) {
        throw new Error("Thiếu thông tin bắt buộc: teacherId");
      }

      const teacher = await Teacher.findById(teacherId)
        .populate({
          path: "userId",
          select: "name email gender phoneNumber address role isActive",
        })
        .populate({
          path: "classId",
          select: "className grade year feePerLesson isAvailable",
        });

      if (!teacher) {
        throw new Error("Không tìm thấy giáo viên");
      }

      // Kiểm tra user có active không
      if (!teacher.userId || !teacher.userId.isActive) {
        throw new Error("Giáo viên đã bị vô hiệu hóa");
      }

      return teacher;
    } catch (error) {
      throw new Error(`Lỗi khi lấy thông tin giáo viên: ${error.message}`);
    }
  },

  /**
   * Cập nhật thông tin giáo viên
   * @param {String} teacherId - ID của giáo viên
   * @param {Object} updateData - Dữ liệu cập nhật
   * @returns {Object} Giáo viên đã được cập nhật
   */
  async update(teacherId, updateData) {
    return await withTransaction(async (session) => {
      try {
        if (!teacherId || !updateData) {
          throw new Error(
            "Thiếu thông tin bắt buộc: teacherId hoặc updateData"
          );
        }

        if (updateData.userId) {
          throw new Error("Không thể cập nhật userId của giáo viên");
        }

        // Lấy thông tin giáo viên hiện tại
        const teacher = await Teacher.findById(teacherId)
          .session(session)
          .populate({
            path: "userId",
            select: "name email gender",
          });
        if (!teacher) {
          throw new Error("Không tìm thấy giáo viên");
        }

        // Phân tách user fields và teacher fields
        const userFields = userUpdateFields(updateData);
        const teacherFields = teacherUpdateFields(updateData);

        // Cập nhật thông tin user nếu có
        if (Object.keys(userFields).length > 0) {
          await userService.update(teacher.userId, userFields, session);
        }

        // Xử lý relationship với Class nếu có thay đổi classId
        if (teacherFields.classId !== undefined) {
          await this.updateClassRelationship(
            teacher,
            teacherFields.classId,
            session
          );
        }

        // Cập nhật thông tin teacher nếu có
        if (Object.keys(teacherFields).length > 0) {
          return await Teacher.findByIdAndUpdate(
            teacherId,
            { $set: teacherFields },
            { new: true, runValidators: true, session }
          );
        }

        return teacher;
      } catch (error) {
        throw new Error(`Lỗi khi cập nhật giáo viên: ${error.message}`);
      }
    });
  },

  /**
   * Xóa giáo viên
   * @param {String} teacherId - ID của giáo viên
   */
  async delete(teacherId) {
    return await withTransaction(async (session) => {
      try {
        if (!teacherId) {
          throw new Error("Thiếu thông tin bắt buộc: teacherId");
        }

        const teacher = await Teacher.findById(teacherId).session(session);
        if (!teacher) {
          throw new Error("Không có giáo viên này / giáo viên đã bị xóa");
        }

        const userId = teacher.userId;

        // Xóa relationship với Class (set teacherId = null)
        if (teacher.classId && teacher.classId.length > 0) {
          await Class.updateMany(
            { _id: { $in: teacher.classId } },
            { $unset: { teacherId: "" } },
            { session }
          );
        }

        // Xóa teacher record
        await Teacher.findByIdAndDelete(teacherId).session(session);

        // Xóa user record
        await userService.delete(userId, session);

        return { message: "Giáo viên đã được xóa thành công" };
      } catch (error) {
        throw new Error(`Lỗi khi xóa giáo viên: ${error.message}`);
      }
    });
  },

  /**
   * Lấy danh sách tất cả giáo viên
   * @param {Object} filter - Bộ lọc (optional)
   * @param {Object} options - Tùy chọn pagination, sort (optional)
   * @returns {Array} Danh sách giáo viên
   */
  async getAll(filter = {}, options = {}) {
    try {
      const { page = 1, limit = 10, sort, populate = true, isActive } = options;

      const skip = (page - 1) * limit;

      let query = Teacher.find(filter).skip(skip).limit(limit).sort(sort);

      if (populate) {
        // Tạo match condition cho isActive
        let userMatch = {};
        if (isActive !== undefined) {
          userMatch.isActive = isActive;
        }

        query = query
          .populate({
            path: "userId",
            select: "name email gender phoneNumber address role isActive",
            match: userMatch,
          })
          .populate({
            path: "classId",
            select: "className grade year feePerLesson isAvailable",
          });
      }

      const teachers = await query;

      // Lọc bỏ teachers có userId null (do user không match với isActive filter)
      const filteredTeachers = teachers.filter(
        (teacher) => teacher.userId !== null
      );

      // Note: Total count là tổng số Teacher records, không tính filter isActive của User
      // Vì thế currentPage có thể có ít items hơn limit nếu có filter isActive
      const total = await Teacher.countDocuments(filter);

      return {
        teachers: filteredTeachers,
        pagination: {
          current: page,
          total: Math.ceil(total / limit),
          count: filteredTeachers.length,
          totalRecords: total,
        },
      };
    } catch (error) {
      throw new Error(`Lỗi khi lấy danh sách giáo viên: ${error.message}`);
    }
  },

  /**
   * Cập nhật relationship giữa Teacher và Class
   * @param {Object} teacher - Teacher object hiện tại
   * @param {Array|String} newClassIds - Class IDs mới
   * @param {Object} session - MongoDB session
   */
  async updateClassRelationship(teacher, newClassIds, session) {
    const oldClassIds = teacher.classId || [];
    const newClassIdsArray = Array.isArray(newClassIds)
      ? newClassIds
      : newClassIds
      ? [newClassIds]
      : [];

    // Tìm các class cần bỏ relationship (unset teacherId)
    const classesToRemove = oldClassIds.filter(
      (oldId) =>
        !newClassIdsArray.some((newId) => newId.toString() === oldId.toString())
    );

    if (classesToRemove.length > 0) {
      await Class.updateMany(
        { _id: { $in: classesToRemove } },
        { $unset: { teacherId: "" } },
        { session }
      );
    }

    // Tìm các class cần thêm relationship (set teacherId)
    const classesToAdd = newClassIdsArray.filter(
      (newId) =>
        !oldClassIds.some((oldId) => oldId.toString() === newId.toString())
    );

    if (classesToAdd.length > 0) {
      // Kiểm tra các class có tồn tại không
      const validClasses = await Class.find({
        _id: { $in: classesToAdd },
      }).session(session);

      if (validClasses.length !== classesToAdd.length) {
        throw new Error("Một số lớp học không tồn tại");
      }

      // Kiểm tra các class đã có teacher khác chưa
      const classesWithTeacher = await Class.find({
        _id: { $in: classesToAdd },
        teacherId: { $exists: true, $ne: null },
      }).session(session);

      if (classesWithTeacher.length > 0) {
        const conflictClasses = classesWithTeacher
          .map((cls) => cls.className)
          .join(", ");
        throw new Error(
          `Các lớp sau đã có giáo viên: ${conflictClasses}. Vui lòng chuyển giáo viên cũ trước khi gán giáo viên mới.`
        );
      }

      // Cập nhật teacherId cho các class mới
      await Class.updateMany(
        { _id: { $in: classesToAdd } },
        { $set: { teacherId: teacher._id } },
        { session }
      );
    }
  },

  /**
   * Lấy danh sách lớp học của giáo viên
   * @param {String} teacherId - ID của giáo viên
   * @returns {Array} Danh sách lớp học
   */
  async getTeacherClasses(teacherId) {
    try {
      if (!teacherId) {
        throw new Error("Thiếu thông tin bắt buộc: teacherId");
      }

      const teacher = await Teacher.findById(teacherId).populate({
        path: "classId",
        select:
          "className grade year feePerLesson isAvailable schedule studentList",
        populate: {
          path: "studentList",
          select: "userId",
          populate: {
            path: "userId",
            select: "name email",
          },
        },
      });

      if (!teacher) {
        throw new Error("Không tìm thấy giáo viên");
      }

      return teacher.classId || [];
    } catch (error) {
      throw new Error(
        `Lỗi khi lấy danh sách lớp học của giáo viên: ${error.message}`
      );
    }
  },

  /**
   * Soft delete teacher
   * @param {String} teacherId - ID của giáo viên
   */
  async softDelete(teacherId) {
    try {
      if (!teacherId) {
        throw new Error("Thiếu thông tin bắt buộc: teacherId");
      }

      const teacher = await Teacher.findById(teacherId).populate("userId");
      if (!teacher) {
        throw new Error("Không tìm thấy teacher");
      }

      // Vô hiệu hóa user tương ứng
      const updatedUser = await userService.update(teacher.userId._id, {
        isActive: false,
      });

      return {
        id: teacher._id,
        userId: teacher.userId._id,
        email: updatedUser.email,
        name: updatedUser.name,
        isActive: updatedUser.isActive, // Lấy từ database thực tế
      };
    } catch (error) {
      throw new Error(`Lỗi khi soft delete teacher: ${error.message}`);
    }
  },
};

module.exports = teacherService;
