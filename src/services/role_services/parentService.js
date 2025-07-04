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
const studentParentRelationshipService = require("../relationship_services/studentParentRelationshipService");

const parentService = {
  async create(parentData) {
    return await withTransaction(async (session) => {
      try {
        const userFields = userUpdateFields(parentData);
        const parentFields = parentUpdateFields(parentData);

        const user = await userService.create(userFields, "Parent", session);
        if (user.role !== "Parent") {
          throw new Error("Vai trò không hợp lệ");
        } // Xử lý childId array để đảm bảo luôn là array (có thể rỗng)
        let childIds = [];
        if (parentData.childId) {
          childIds = Array.isArray(parentData.childId)
            ? parentData.childId
            : [parentData.childId];
        }

        const parent = await Parent.create(
          [
            {
              userId: user._id,
              childId: childIds, // Luôn là array, có thể rỗng
              canSeeTeacher: parentFields.canSeeTeacher || false,
            },
          ],
          { session }
        );

        // Chỉ validate và update students nếu có childIds
        if (childIds.length > 0) {
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
          select: "name email gender phoneNumber address role isActive",
        })
        .populate({
          path: "childId",
          populate: {
            path: "userId",
            select: "name email gender isActive",
          },
        });
      if (!parent) {
        throw new Error("Không tìm thấy phụ huynh");
      }

      // Kiểm tra user có active không
      if (!parent.userId || !parent.userId.isActive) {
        throw new Error("Phụ huynh đã bị vô hiệu hóa");
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
   * @returns {Array} Danh sách các con với thông tin chi tiết bao gồm:
   *   - Thông tin cá nhân của con
   *   - Danh sách lớp học với thông tin giáo viên (tùy thuộc vào cấu hình canSeeTeacher)
   *   - Chi tiết điểm danh: tổng số buổi, buổi nghỉ, buổi có mặt
   *   - Danh sách ngày nghỉ cụ thể (absentDates)
   *   - Chi tiết từng buổi học (attendanceDetails)
   *   - Thống kê tổng hợp (attendanceSummary)
   * @note Thông tin giáo viên chỉ được hiển thị nếu parent.canSeeTeacher = true
   */ async getChildrenWithDetails(parentId) {
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
            select:
              "className grade year startDate endDate feePerLesson teacherId",
            populate: {
              path: "teacherId",
              populate: {
                path: "userId",
                select: "name email phoneNumber",
              },
            },
          },
        ],
      });
      if (!parent) {
        throw new Error("Không tìm thấy phụ huynh");
      }

      // Kiểm tra quyền xem thông tin giáo viên
      const canSeeTeacher = parent.canSeeTeacher || false;

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
        }; // Lấy thông tin điểm danh cho từng lớp
        for (const classInfo of child.classId || []) {
          // Tìm tất cả các attendance records cho lớp này
          const attendanceRecords = await Attendance.find({
            classId: classInfo._id,
          }).sort({ date: 1 }); // Sắp xếp theo ngày

          let classLessons = 0;
          let classAbsent = 0;
          let classAttended = 0;
          let absentDates = []; // Danh sách ngày nghỉ cụ thể
          let attendanceDetails = []; // Chi tiết từng buổi học

          if (attendanceRecords && attendanceRecords.length > 0) {
            attendanceRecords.forEach((record) => {
              const studentRecord = record.students.find(
                (s) => s.studentId.toString() === child._id.toString()
              );

              if (studentRecord) {
                classLessons++;
                const attendanceRecord = {
                  date: record.date,
                  isPresent: !studentRecord.isAbsent,
                  lessonNumber: record.lessonNumber || classLessons,
                };

                if (studentRecord.isAbsent) {
                  classAbsent++;
                  absentDates.push({
                    date: record.date,
                    lessonNumber: record.lessonNumber || classLessons,
                  });
                } else {
                  classAttended++;
                }

                attendanceDetails.push(attendanceRecord);
              }
            });
          } // Thông tin giáo viên - chỉ hiển thị nếu được phép
          let teacherInfo = null;
          if (canSeeTeacher && classInfo.teacherId) {
            teacherInfo = {
              _id: classInfo.teacherId._id,
              name: classInfo.teacherId.userId?.name || "Unknown",
              email: classInfo.teacherId.userId?.email || "",
              phone: classInfo.teacherId.userId?.phoneNumber || "",
            };
          } else if (!canSeeTeacher) {
            // Thông báo rằng phụ huynh không được phép xem thông tin giáo viên
            teacherInfo = {
              message: "Bạn chưa được cấp quyền xem thông tin giáo viên",
            };
          }
          childDetail.classes.push({
            _id: classInfo._id,
            className: classInfo.className,
            grade: classInfo.grade,
            year: classInfo.year,
            feePerLesson: classInfo.feePerLesson,
            teacher: teacherInfo, // Thông tin giáo viên
            attendance: {
              totalLessons: classLessons,
              absentLessons: classAbsent,
              attendedLessons: classAttended,
              attendanceRate:
                classLessons > 0
                  ? ((classAttended / classLessons) * 100).toFixed(1)
                  : 0,
              absentDates: absentDates, // Danh sách ngày nghỉ cụ thể
              attendanceDetails: attendanceDetails, // Chi tiết từng buổi học
            },
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

        // Thêm thông tin tổng hợp
        childDetail.attendanceSummary = {
          totalLessons: childDetail.totalLessons,
          totalAbsent: childDetail.totalAbsent,
          totalAttended: childDetail.totalAttended,
          overallAttendanceRate: childDetail.overallAttendanceRate,
          totalClasses: childDetail.classes.length,
        };

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

      // Lấy tất cả payment requests của parent cho các payment chưa đóng
      const paymentRequestMap = {};
      const paymentIds = unpaidPayments.map((p) => p._id);
      if (paymentIds.length > 0) {
        const ParentPaymentRequest = require("../../models/ParentPaymentRequest");
        const requests = await ParentPaymentRequest.find({
          parentId,
          paymentId: { $in: paymentIds },
        }).sort({ requestDate: -1 });
        // Map paymentId -> request object (ưu tiên request mới nhất)
        requests.forEach((req) => {
          paymentRequestMap[req.paymentId.toString()] = req;
        });
      }

      unpaidPayments.forEach((payment) => {
        const studentId = payment.studentId._id.toString();
        const unpaidAmount = payment.amountDue - payment.amountPaid;
        const reqObj = paymentRequestMap[payment._id.toString()];
        const paymentRequestStatus = reqObj ? reqObj.status : null;
        const parentRequestId = reqObj ? reqObj._id : null;
        const hasPaymentRequest = !!reqObj;

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
          paymentRequestStatus,
          hasPaymentRequest,
          parentRequestId,
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

  // ❌ REMOVED: calculateChildPayments - use getChildrenUnpaidPayments instead
  // ❌ REMOVED: updateChildRelationship - use studentParentRelationshipService instead

  /**
   * Lấy danh sách tất cả phụ huynh
   * @param {Object} filter - Bộ lọc (optional)
   * @param {Object} options - Tùy chọn pagination, sort (optional)
   * @returns {Array} Danh sách phụ huynh
   */
  async getAll(filter = {}, options = {}) {
    try {
      const { page = 1, limit = 10, sort, populate = true, isActive } = options;

      const skip = (page - 1) * limit;

      let query = Parent.find(filter).skip(skip).limit(limit).sort(sort);

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
            path: "childId",
            select: "userId",
            populate: {
              path: "userId",
              select: "name email isActive",
              match: userMatch,
            },
          });
      }

      const parents = await query;

      // Lọc bỏ parents có userId null (do user không match với isActive filter)
      const filteredParents = parents.filter(
        (parent) => parent.userId !== null
      );

      // Note: Total count là tổng số Parent records, không tính filter isActive của User
      // Vì thế currentPage có thể có ít items hơn limit nếu có filter isActive
      const total = await Parent.countDocuments(filter);

      return {
        parents: filteredParents,
        pagination: {
          current: page,
          total: Math.ceil(total / limit),
          count: filteredParents.length,
          totalRecords: total,
        },
      };
    } catch (error) {
      throw new Error(`Lỗi khi lấy danh sách phụ huynh: ${error.message}`);
    }
  },

  // ❌ REMOVED: Legacy updateChildRelationship - use studentParentRelationshipService instead
  // Use: studentParentRelationshipService.updateStudentParentRelationship() for single operations

  /**
   * Bulk update parent-child relationships
   * @param {String} parentId - ID của parent
   * @param {String} action - "add" or "remove"
   * @param {Array} studentIds - Array of student IDs
   * @returns {Object} Result with summary and details
   */ async updateChildRelationshipBulk(parentId, action, studentIds) {
    // Sử dụng service chuyên biệt để xử lý mối quan hệ
    return await studentParentRelationshipService.updateParentChildrenBulk(
      parentId,
      action,
      studentIds
    );
  },

  // Soft delete parent
  async softDelete(parentId) {
    try {
      if (!parentId) {
        throw new Error("Thiếu thông tin bắt buộc: parentId");
      }

      const parent = await Parent.findById(parentId).populate("userId");
      if (!parent) {
        throw new Error("Không tìm thấy parent");
      }

      // Vô hiệu hóa user tương ứng
      const updatedUser = await userService.update(parent.userId._id, {
        isActive: false,
      });

      return {
        id: parent._id,
        userId: parent.userId._id,
        email: updatedUser.email,
        name: updatedUser.name,
        isActive: updatedUser.isActive, // Lấy từ database thực tế
      };
    } catch (error) {
      throw new Error(`Lỗi khi soft delete parent: ${error.message}`);
    }
  },
};

module.exports = parentService;
