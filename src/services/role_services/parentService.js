const withTransaction = require("../../utils/session");
const {
  User,
  Parent,
  Student,
  Class,
  Attendance,
  Payment,
} = require("../../models");
const { parentUpdateFields, userUpdateFields } = require("./updateFields");
const userService = require("./userService");
const { getById } = require("./studentService");
const studentService = require("./studentService");

const parentService = {
  async create(parentData) {
    return await withTransaction(async (session) => {
      try {
        const userFields = userUpdateFields(parentData);
        const parentFields = parentUpdateFields(parentData);

        const user = await userService.create(userFields, "Parent", session);
        if (user.role !== "Parent") {
          throw new Error("Vai trò không hợp lệ");
        }
        const parent = await Parent.create(
          [
            {
              userId: user._id,
              childId: parentFields.childId || null,
              canSeeTeacher: parentFields.canSeeTeacher || false,
            },
          ],
          { session }
        );

        if (parentData.childId) {
          const childIds = Array.isArray(parentData.childId)
            ? parentData.childId
            : [parentData.childId];

          // Validate children exist
          const validChildren = await Student.find({
            _id: { $in: childIds },
          }).session(session);
          if (validChildren.length !== childIds.length) {
            throw new Error("Một số học sinh không tồn tại");
          }

          // Update children with parent reference
          await Student.updateMany(
            { _id: { $in: childIds } },
            { $set: { parentId: parent[0]._id } },
            { session }
          );
        }
        return parent[0];
      } catch (error) {
        throw new Error(`Lỗi khi tạo phụ huynh: ${error.message}`);
      }
    });
  },
  async update(parentId, updateData) {
    return await withTransaction(async (session) => {
      try {
        if (!parentId || !updateData) {
          throw new Error("Thiếu thông tin bắt buộc: parentId hoặc updateData");
        }
        if (updateData.userId) {
          throw new Error("Không thể cập nhật userId của phụ huynh");
        }

        // 🔥 Filter childId để tránh accidental updates
        const { childId, ...validUpdates } = updateData;

        if (childId !== undefined) {
          throw new Error(
            "Không thể cập nhật childId qua API này. Vui lòng sử dụng PATCH /parents/:id/children"
          );
        }

        const userFields = userUpdateFields(validUpdates);
        const parentFields = parentUpdateFields(validUpdates);

        const parent = await Parent.findById(parentId).session(session);
        if (!parent) {
          throw new Error("Không tìm thấy phụ huynh");
        }

        // Update user fields if any
        if (Object.keys(userFields).length > 0) {
          await userService.update(parent.userId, userFields, session);
        }

        // Update parent fields if any (excluding childId)
        if (Object.keys(parentFields).length > 0) {
          await Parent.findByIdAndUpdate(
            parentId,
            { $set: parentFields, updatedAt: new Date() },
            { new: true, runValidators: true, session }
          );
        }

        // Return updated parent with populated fields
        return await Parent.findById(parentId)
          .populate({
            path: "userId",
            select: "name email gender phoneNumber address",
          })
          .populate({
            path: "childId",
            populate: {
              path: "userId",
              select: "name email",
            },
          })
          .session(session);
      } catch (error) {
        throw new Error(`Lỗi khi cập nhật phụ huynh: ${error.message}`);
      }
    });
  },
  async delete(parentId) {
    return await withTransaction(async (session) => {
      try {
        if (!parentId) {
          throw new Error("Thiếu thông tin bắt buộc: parentId");
        }
        const parent = await Parent.findById(parentId).session(session);
        if (!parent) {
          throw new Error("Không tìm thấy phụ huynh");
        }

        if (parent.childId && parent.childId.length > 0) {
          await Student.updateMany(
            { _id: { $in: parent.childId } },
            { $unset: { parentId: "" } },
            { session }
          );
        }
        const userId = parent.userId;
        await Parent.findByIdAndDelete(parentId, { session });
        await userService.delete(userId, session);
      } catch (error) {
        throw new Error(`Lỗi khi xóa phụ huynh: ${error.message}`);
      }
    });
  },
  async getById(parentId) {
    try {
      if (!parentId) {
        throw new Error("Thiếu thông tin bắt buộc: parentId");
      }
      const parent = await Parent.findById(parentId)
        .populate({
          path: "userId",
          select: "name email gender phoneNumber address role",
        })
        .populate({
          path: "childId",
          populate: {
            path: "userId",
            select: "name email gender",
          },
        });
      if (!parent) {
        throw new Error("Không tìm thấy phụ huynh");
      }
      return parent;
    } catch (error) {
      throw new Error(`Lỗi khi lấy thông tin phụ huynh: ${error.message}`);
    }
  },
  async getChildren(parentId) {
    try {
      if (!parentId) {
        throw new Error("Thiếu thông tin bắt buộc: parentId");
      }
      const parent = await Parent.findById(parentId).populate({
        path: "childId",
        populate: {
          path: "userId",
          select: "name email gender phoneNumber",
        },
        select: "userId classId",
      });

      if (!parent) {
        throw new Error("Không tìm thấy phụ huynh");
      }
      return parent.childId || [];
    } catch (error) {
      throw new Error(
        `Lỗi khi lấy thông tin lớp học của học sinh: ${error.message}`
      );
    }
  },

  /**
   * Lấy thông tin chi tiết các con kể cả điểm danh và lớp học
   * @param {String} parentId - ID của phụ huynh
   * @returns {Array} Danh sách các con với thông tin chi tiết
   */
  async getChildrenWithDetails(parentId) {
    try {
      if (!parentId) {
        throw new Error("Thiếu thông tin bắt buộc: parentId");
      }

      const parent = await Parent.findById(parentId).populate({
        path: "childId",
        populate: [
          {
            path: "userId",
            select: "name email gender phoneNumber",
          },
          {
            path: "classId",
            select: "className grade year startDate endDate feePerLesson",
          },
        ],
      });

      if (!parent) {
        throw new Error("Không tìm thấy phụ huynh");
      }

      const childrenWithDetails = [];

      // Lấy thông tin chi tiết cho từng con
      for (const child of parent.childId || []) {
        const childDetail = {
          _id: child._id,
          name: child.userId?.name || "Unknown",
          email: child.userId?.email || "",
          gender: child.userId?.gender || "",
          phone: child.userId?.phoneNumber || "",
          classes: [],
          totalLessons: 0,
          totalAbsent: 0,
          totalAttended: 0,
        };

        // Lấy thông tin điểm danh cho từng lớp
        for (const classInfo of child.classId || []) {
          const attendance = await Attendance.findOne({
            classId: classInfo._id,
          });

          let classLessons = 0;
          let classAbsent = 0;
          let classAttended = 0;

          if (attendance && attendance.records) {
            attendance.records.forEach((record) => {
              const studentRecord = record.students.find(
                (s) => s.studentId.toString() === child._id.toString()
              );

              if (studentRecord) {
                classLessons++;
                if (studentRecord.isAbsent) {
                  classAbsent++;
                } else {
                  classAttended++;
                }
              }
            });
          }

          childDetail.classes.push({
            _id: classInfo._id,
            className: classInfo.className,
            grade: classInfo.grade,
            year: classInfo.year,
            feePerLesson: classInfo.feePerLesson,
            totalLessons: classLessons,
            absentLessons: classAbsent,
            attendedLessons: classAttended,
            attendanceRate:
              classLessons > 0
                ? ((classAttended / classLessons) * 100).toFixed(1)
                : 0,
          });

          childDetail.totalLessons += classLessons;
          childDetail.totalAbsent += classAbsent;
          childDetail.totalAttended += classAttended;
        }

        childDetail.overallAttendanceRate =
          childDetail.totalLessons > 0
            ? (
                (childDetail.totalAttended / childDetail.totalLessons) *
                100
              ).toFixed(1)
            : 0;

        childrenWithDetails.push(childDetail);
      }

      return childrenWithDetails;
    } catch (error) {
      throw new Error(
        `Lỗi khi lấy thông tin chi tiết các con: ${error.message}`
      );
    }
  },

  /**
   * Lấy thông tin thanh toán chưa đóng của các con
   * @param {String} parentId - ID của phụ huynh
   * @param {Object} filters - Bộ lọc tháng, năm
   * @returns {Object} Thông tin thanh toán chưa đóng
   */
  async getChildrenUnpaidPayments(parentId, filters = {}) {
    try {
      if (!parentId) {
        throw new Error("Thiếu thông tin bắt buộc: parentId");
      }

      const { month, year } = filters;

      const parent = await Parent.findById(parentId).populate("childId");
      if (!parent) {
        throw new Error("Không tìm thấy phụ huynh");
      }

      const childIds = parent.childId.map((child) => child._id);

      if (childIds.length === 0) {
        return {
          children: [],
          totalUnpaidAmount: 0,
          summary: {
            totalChildren: 0,
            childrenWithUnpaid: 0,
            totalPayments: 0,
            unpaidPayments: 0,
          },
        };
      }

      // Build payment filter
      const paymentFilter = {
        studentId: { $in: childIds },
        $expr: { $lt: ["$amountPaid", "$amountDue"] }, // Chưa thanh toán đủ
      };

      if (month) paymentFilter.month = parseInt(month);
      if (year) paymentFilter.year = parseInt(year);

      // Lấy tất cả payments chưa đóng đủ
      const unpaidPayments = await Payment.find(paymentFilter)
        .populate({
          path: "studentId",
          populate: { path: "userId", select: "name email" },
        })
        .populate("classId", "className grade feePerLesson")
        .sort({ year: -1, month: -1 });

      // Group payments by child
      const childrenPayments = {};
      let totalUnpaidAmount = 0;

      unpaidPayments.forEach((payment) => {
        const studentId = payment.studentId._id.toString();
        const unpaidAmount = payment.amountDue - payment.amountPaid;

        if (!childrenPayments[studentId]) {
          childrenPayments[studentId] = {
            _id: studentId,
            name: payment.studentId.userId?.name || "Unknown",
            email: payment.studentId.userId?.email || "",
            unpaidPayments: [],
            totalUnpaidAmount: 0,
          };
        }

        childrenPayments[studentId].unpaidPayments.push({
          _id: payment._id,
          month: payment.month,
          year: payment.year,
          className: payment.classId?.className || "Unknown",
          grade: payment.classId?.grade || "",
          amountDue: payment.amountDue,
          amountPaid: payment.amountPaid,
          unpaidAmount: unpaidAmount,
          totalLessons: payment.totalLessons || 0,
          attendedLessons: payment.attendedLessons || 0,
        });

        childrenPayments[studentId].totalUnpaidAmount += unpaidAmount;
        totalUnpaidAmount += unpaidAmount;
      });

      const children = Object.values(childrenPayments);

      return {
        children,
        totalUnpaidAmount,
        filters: { month, year },
        summary: {
          totalChildren: parent.childId.length,
          childrenWithUnpaid: children.length,
          totalPayments: unpaidPayments.length,
          unpaidPayments: unpaidPayments.length,
        },
      };
    } catch (error) {
      throw new Error(
        `Lỗi khi lấy thông tin thanh toán chưa đóng: ${error.message}`
      );
    }
  },

  async calculateChildPayments(parentId, month, year) {
    // Legacy placeholder - use getChildrenUnpaidPayments instead
    return await this.getChildrenUnpaidPayments(parentId, { month, year });
  },
  async updateChildRelationship(parent, newChildIds, session) {
    const oldChildIds = parent.childId || [];
    const newChildIdsArray = Array.isArray(newChildIds)
      ? newChildIds
      : newChildIds
      ? [newChildIds]
      : [];

    // ✅ Tìm children cần remove
    const childrenToRemove = oldChildIds.filter(
      (oldId) =>
        !newChildIdsArray.some((newId) => newId.toString() === oldId.toString())
    );

    // ✅ Tìm children cần add
    const childrenToAdd = newChildIdsArray.filter(
      (newId) =>
        !oldChildIds.some((oldId) => oldId.toString() === newId.toString())
    );

    // ✅ Remove parent từ children cũ
    if (childrenToRemove.length > 0) {
      await Student.updateMany(
        { _id: { $in: childrenToRemove } },
        { $set: { parentId: null } },
        { session }
      );
    }

    // ✅ Add parent cho children mới
    if (childrenToAdd.length > 0) {
      // Validate children exist
      const validChildren = await Student.find({
        _id: { $in: childrenToAdd },
      }).session(session);

      if (validChildren.length !== childrenToAdd.length) {
        throw new Error("Một số học sinh không tồn tại");
      } // Update children với parent reference
      await Student.updateMany(
        { _id: { $in: childrenToAdd } },
        { $set: { parentId: parent._id } },
        { session }
      );
    }
  },

  /**
   * Lấy danh sách tất cả phụ huynh
   * @param {Object} filter - Bộ lọc (optional)
   * @param {Object} options - Tùy chọn pagination, sort (optional)
   * @returns {Array} Danh sách phụ huynh
   */
  async getAll(filter = {}, options = {}) {
    try {
      const {
        page = 1,
        limit = 10,
        sort = { createdAt: -1 },
        populate = true,
      } = options;

      const skip = (page - 1) * limit;

      let query = Parent.find(filter).skip(skip).limit(limit).sort(sort);

      if (populate) {
        query = query
          .populate({
            path: "userId",
            select: "name email gender phoneNumber address role",
          })
          .populate({
            path: "childId",
            select: "userId",
            populate: {
              path: "userId",
              select: "name email",
            },
          });
      }

      const parents = await query;
      const total = await Parent.countDocuments(filter);

      return {
        parents,
        pagination: {
          current: page,
          total: Math.ceil(total / limit),
          count: parents.length,
          totalRecords: total,
        },
      };
    } catch (error) {
      throw new Error(`Lỗi khi lấy danh sách phụ huynh: ${error.message}`);
    }
  },

  /**
   * Cập nhật quan hệ Parent-Student (thay thế link/unlink)
   * @param {String} parentId - ID của parent
   * @param {String} studentId - ID của student
   * @param {String} action - 'add' hoặc 'remove'
   * @returns {Object} Updated parent với thông tin children
   */
  async updateChildRelationship(parentId, studentId, action) {
    return await withTransaction(async (session) => {
      try {
        // Validate parent tồn tại
        const parent = await Parent.findById(parentId).session(session);
        if (!parent) {
          throw new Error("Phụ huynh không tồn tại");
        }

        // Validate student tồn tại
        const student = await Student.findById(studentId).session(session);
        if (!student) {
          throw new Error("Học sinh không tồn tại");
        }

        if (action === "add") {
          // Kiểm tra student đã có parent khác chưa
          if (student.parentId && student.parentId.toString() !== parentId) {
            // Remove từ parent cũ
            await Parent.findByIdAndUpdate(
              student.parentId,
              { $pull: { childId: studentId } },
              { session }
            );
          }

          // Kiểm tra parent đã có student này chưa
          const alreadyHasChild = parent.childId.some(
            (id) => id.toString() === studentId
          );

          if (!alreadyHasChild) {
            // Thêm student vào parent
            await Parent.findByIdAndUpdate(
              parentId,
              { $addToSet: { childId: studentId } },
              { session }
            );

            // Cập nhật parent reference trong student
            await Student.findByIdAndUpdate(
              studentId,
              { parentId: parentId },
              { session }
            );
          }
        } else if (action === "remove") {
          // Remove student từ parent
          await Parent.findByIdAndUpdate(
            parentId,
            { $pull: { childId: studentId } },
            { session }
          );

          // Remove parent reference từ student
          await Student.findByIdAndUpdate(
            studentId,
            { $unset: { parentId: 1 } },
            { session }
          );
        }

        // Trả về parent đã được cập nhật với thông tin children
        const updatedParent = await Parent.findById(parentId)
          .populate({
            path: "childId",
            populate: {
              path: "userId",
              select: "fullName email phone",
            },
          })
          .session(session);
        return updatedParent;
      } catch (error) {
        throw new Error(
          `Lỗi khi cập nhật quan hệ parent-student: ${error.message}`
        );
      }
    });
  },

  /**
   * Bulk update parent-child relationships
   * @param {String} parentId - ID của parent
   * @param {String} action - "add" or "remove"
   * @param {Array} studentIds - Array of student IDs
   * @returns {Object} Result with summary and details
   */ async updateChildRelationshipBulk(parentId, action, studentIds) {
    return await withTransaction(async (session) => {
      try {
        if (
          !parentId ||
          !action ||
          !Array.isArray(studentIds) ||
          studentIds.length === 0
        ) {
          throw new Error("Thiếu thông tin: parentId, action và studentIds");
        }

        // 🔥 Validate ObjectId format
        const mongoose = require("mongoose");
        if (!mongoose.Types.ObjectId.isValid(parentId)) {
          throw new Error(`Invalid parentId format: ${parentId}`);
        }

        // Validate parent exists
        const parent = await Parent.findById(parentId).session(session);
        if (!parent) {
          throw new Error("Phụ huynh không tồn tại");
        }

        const results = [];
        let successCount = 0;
        let errorCount = 0; // Process each student
        for (const currentStudentId of studentIds) {
          try {
            // Validate student exists
            const student = await Student.findById(currentStudentId)
              .populate({
                path: "userId",
                select: "name email",
              })
              .session(session);
            if (!student) {
              results.push({
                studentId: currentStudentId,
                status: "error",
                message: "Học sinh không tồn tại",
              });
              errorCount++;
              continue;
            }

            if (action === "add") {
              // Check if already linked
              const isAlreadyLinked = parent.childId.some(
                (id) => id.toString() === currentStudentId
              );
              if (isAlreadyLinked) {
                results.push({
                  studentId: currentStudentId,
                  studentName: student.userId?.name || "Unknown",
                  status: "skipped",
                  message: "Đã có quan hệ parent-child",
                });
                continue;
              }

              // Check if student already has another parent
              if (
                student.parentId &&
                student.parentId.toString() !== parentId
              ) {
                // Remove from old parent
                await Parent.findByIdAndUpdate(
                  student.parentId,
                  { $pull: { childId: currentStudentId } },
                  { session }
                );
              }

              // Add to new parent
              await Parent.findByIdAndUpdate(
                parentId,
                { $addToSet: { childId: currentStudentId } },
                { session }
              );

              // Update student's parentId
              await Student.findByIdAndUpdate(
                currentStudentId,
                { parentId: parentId },
                { session }
              );

              results.push({
                studentId: currentStudentId,
                studentName: student.userId?.name || "Unknown",
                status: "added",
                message: "Thêm quan hệ parent-child thành công",
              });
              successCount++;
            } else if (action === "remove") {
              // Check if relationship exists
              const hasRelationship =
                parent.childId.some(
                  (id) => id.toString() === currentStudentId
                ) && student.parentId?.toString() === parentId;
              if (!hasRelationship) {
                results.push({
                  studentId: currentStudentId,
                  studentName: student.userId?.name || "Unknown",
                  status: "skipped",
                  message: "Không có quan hệ parent-child để xóa",
                });
                continue;
              } // Remove relationship
              await Parent.findByIdAndUpdate(
                parentId,
                { $pull: { childId: currentStudentId } },
                { session }
              );

              await Student.findByIdAndUpdate(
                currentStudentId,
                { $unset: { parentId: 1 } },
                { session }
              );

              results.push({
                studentId: currentStudentId,
                studentName: student.userId?.name || "Unknown",
                status: "removed",
                message: "Xóa quan hệ parent-child thành công",
              });
              successCount++;
            }
          } catch (studentError) {
            results.push({
              studentId: currentStudentId,
              status: "error",
              message: studentError.message,
            });
            errorCount++;
          }
        } // Get updated parent data
        const updatedParent = await Parent.findById(parentId)
          .populate({
            path: "userId",
            select: "name email",
          })
          .populate({
            path: "childId",
            populate: { path: "userId", select: "name email" },
          })
          .session(session);

        return {
          parentId,
          parentName: updatedParent.userId?.name || "Unknown",
          action,
          summary: {
            total: studentIds.length,
            success: successCount,
            errors: errorCount,
            skipped: results.filter((r) => r.status === "skipped").length,
          },
          results,
          updatedParent,
        };
      } catch (error) {
        throw new Error(`Lỗi khi xử lý bulk update: ${error.message}`);
      }
    });
  },
};

module.exports = parentService;
