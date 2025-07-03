const { Student, Parent } = require("../../models");
const withTransaction = require("../../utils/session");

/**
 * Service chuyên biệt để quản lý mối quan hệ Student-Parent
 * Đảm bảo tính nhất quán và đồng bộ hai chiều
 */
const studentParentRelationshipService = {
  /**
   * Cập nhật mối quan hệ giữa một học sinh và phụ huynh
   * @param {String} studentId - ID của học sinh
   * @param {String} newParentId - ID của phụ huynh mới (null để xóa mối quan hệ)
   * @param {Object} session - MongoDB session (optional)
   * @returns {Object} Kết quả cập nhật
   */
  async updateStudentParentRelationship(
    studentId,
    newParentId,
    session = null
  ) {
    const executeInTransaction = async (sess) => {
      try {
        // Validate input
        if (!studentId) {
          throw new Error("Thiếu thông tin bắt buộc: studentId");
        }

        // Lấy thông tin học sinh hiện tại
        const student = await Student.findById(studentId).session(sess);
        if (!student) {
          throw new Error("Học sinh không tồn tại");
        }

        const oldParentId = student.parentId;

        // Nếu parentId không thay đổi thì không cần làm gì
        if (oldParentId?.toString() === newParentId?.toString()) {
          return {
            success: true,
            message: "Mối quan hệ không thay đổi",
            student: student,
            oldParentId,
            newParentId,
          };
        }

        // Validate phụ huynh mới nếu có
        if (newParentId) {
          const newParent = await Parent.findById(newParentId).session(sess);
          if (!newParent) {
            throw new Error("Phụ huynh mới không tồn tại");
          }
        }

        // 1. Xóa học sinh khỏi phụ huynh cũ (nếu có)
        if (oldParentId) {
          await Parent.findByIdAndUpdate(
            oldParentId,
            { $pull: { childId: studentId } },
            { session: sess }
          );
        }

        // 2. Thêm học sinh vào phụ huynh mới (nếu có)
        if (newParentId) {
          await Parent.findByIdAndUpdate(
            newParentId,
            { $addToSet: { childId: studentId } },
            { session: sess }
          );
        }

        // 3. Cập nhật parentId của học sinh
        const updatedStudent = await Student.findByIdAndUpdate(
          studentId,
          { $set: { parentId: newParentId || null } },
          { new: true, session: sess }
        );

        return {
          success: true,
          message: newParentId
            ? "Cập nhật mối quan hệ học sinh-phụ huynh thành công"
            : "Xóa mối quan hệ học sinh-phụ huynh thành công",
          student: updatedStudent,
          oldParentId,
          newParentId,
        };
      } catch (error) {
        throw new Error(
          `Lỗi khi cập nhật mối quan hệ học sinh-phụ huynh: ${error.message}`
        );
      }
    };

    // Sử dụng session đã có hoặc tạo transaction mới
    if (session) {
      return await executeInTransaction(session);
    } else {
      return await withTransaction(executeInTransaction);
    }
  },

  /**
   * Thêm/xóa nhiều học sinh cho một phụ huynh
   * @param {String} parentId - ID của phụ huynh
   * @param {String} action - "add" hoặc "remove"
   * @param {Array} studentIds - Mảng ID của các học sinh
   * @param {Object} session - MongoDB session (optional)
   * @returns {Object} Kết quả xử lý bulk
   */
  async updateParentChildrenBulk(parentId, action, studentIds, session = null) {
    const executeInTransaction = async (sess) => {
      try {
        // Validate input
        if (
          !parentId ||
          !action ||
          !Array.isArray(studentIds) ||
          studentIds.length === 0
        ) {
          throw new Error(
            "Thiếu thông tin bắt buộc: parentId, action, hoặc studentIds"
          );
        }

        if (!["add", "remove"].includes(action)) {
          throw new Error("Action phải là 'add' hoặc 'remove'");
        }

        // Validate parent exists
        const parent = await Parent.findById(parentId).session(sess);
        if (!parent) {
          throw new Error("Phụ huynh không tồn tại");
        }

        const results = [];
        const summary = { success: 0, failed: 0, errors: [] };

        for (const studentId of studentIds) {
          try {
            if (action === "add") {
              // Thêm mối quan hệ
              await this.updateStudentParentRelationship(
                studentId,
                parentId,
                sess
              );
            } else {
              // Xóa mối quan hệ (set parentId = null)
              await this.updateStudentParentRelationship(studentId, null, sess);
            }

            results.push({
              studentId,
              success: true,
              action: action === "add" ? "added" : "removed",
            });
            summary.success++;
          } catch (error) {
            results.push({
              studentId,
              success: false,
              error: error.message,
            });
            summary.failed++;
            summary.errors.push(`Student ${studentId}: ${error.message}`);
          }
        }

        return {
          success: summary.failed === 0,
          message: `${action === "add" ? "Thêm" : "Xóa"} ${summary.success}/${
            studentIds.length
          } mối quan hệ thành công`,
          results,
          summary,
          parentId,
          action,
        };
      } catch (error) {
        throw new Error(`Lỗi khi cập nhật bulk mối quan hệ: ${error.message}`);
      }
    };

    // Sử dụng session đã có hoặc tạo transaction mới
    if (session) {
      return await executeInTransaction(session);
    } else {
      return await withTransaction(executeInTransaction);
    }
  },
};

module.exports = studentParentRelationshipService;
