const { Payment, Student, Class } = require("../../models");

const paymentService = {
  /**
   * Lấy payment summary và thống kê (Admin thống kê tài chính)
   * @param {Object} filter - Bộ lọc
   * @returns {Object} Summary data
   */
  async getPaymentSummary(filter = {}) {
    try {
      const matchFilter = {};
      if (filter.month) matchFilter.month = parseInt(filter.month);
      if (filter.year) matchFilter.year = parseInt(filter.year);
      if (filter.startDate && filter.endDate) {
        matchFilter.createdAt = {
          $gte: new Date(filter.startDate),
          $lte: new Date(filter.endDate),
        };
      }

      const payments = await Payment.find(matchFilter)
        .populate("studentId", "userId")
        .populate("classId", "className grade")
        .populate("parentId", "userId");

      const summary = {
        totalPayments: payments.length,
        totalOriginalAmount: 0,
        totalAfterDiscountAmount: 0,
        totalPaidAmount: 0,
        totalDueAmount: 0,
        totalDiscount: 0,
        pendingPayments: 0,
        completedPayments: 0,
        paymentsByClass: {},
        paymentsByStudent: {},
      };

      payments.forEach((payment) => {
        summary.totalOriginalAmount += payment.originalAmount || 0;
        summary.totalAfterDiscountAmount += payment.afterDiscountAmount || 0;
        summary.totalPaidAmount += payment.amountPaid || 0;
        summary.totalDueAmount += payment.amountDue || 0;
        summary.totalDiscount +=
          payment.originalAmount - payment.afterDiscountAmount || 0;

        if (payment.amountPaid >= payment.amountDue) {
          summary.completedPayments++;
        } else {
          summary.pendingPayments++;
        }

        // Group by class
        const classId = payment.classId._id.toString();
        if (!summary.paymentsByClass[classId]) {
          summary.paymentsByClass[classId] = {
            className: payment.classId.className,
            count: 0,
            totalAmount: 0,
            totalPaid: 0,
          };
        }
        summary.paymentsByClass[classId].count++;
        summary.paymentsByClass[classId].totalAmount += payment.amountDue;
        summary.paymentsByClass[classId].totalPaid += payment.amountPaid;

        // Group by student
        const studentId = payment.studentId._id.toString();
        if (!summary.paymentsByStudent[studentId]) {
          summary.paymentsByStudent[studentId] = {
            studentName: payment.studentId.userId?.name || "Unknown",
            count: 0,
            totalAmount: 0,
            totalPaid: 0,
          };
        }
        summary.paymentsByStudent[studentId].count++;
        summary.paymentsByStudent[studentId].totalAmount += payment.amountDue;
        summary.paymentsByStudent[studentId].totalPaid += payment.amountPaid;
      });

      summary.collectionRate =
        summary.totalDueAmount > 0
          ? ((summary.totalPaidAmount / summary.totalDueAmount) * 100).toFixed(
              2
            )
          : 100;

      summary.discountRate =
        summary.totalOriginalAmount > 0
          ? (
              (summary.totalDiscount / summary.totalOriginalAmount) *
              100
            ).toFixed(2)
          : 0;

      return summary;
    } catch (error) {
      throw new Error(`Lỗi khi lấy payment summary: ${error.message}`);
    }
  },

  /**
   * Lấy payments của student cụ thể (Phụ huynh/học sinh xem lịch sử thanh toán)
   * @param {String} studentId - ID của student
   * @param {Object} filters - Bộ lọc
   * @returns {Array} Danh sách payments
   */
  async getStudentPayments(studentId, filters = {}) {
    try {
      const filter = { studentId };

      if (filters.month) filter.month = parseInt(filters.month);
      if (filters.year) filter.year = parseInt(filters.year);
      if (filters.status) filter.status = filters.status;

      const payments = await Payment.find(filter)
        .populate("classId", "className grade")
        .populate("parentId", "userId")
        .sort({ year: -1, month: -1, createdAt: -1 });

      return payments;
    } catch (error) {
      throw new Error(`Lỗi khi lấy payments của student: ${error.message}`);
    }
  },

  /**
   * Lấy tất cả payments với bộ lọc đơn giản (Admin xem toàn bộ bản ghi học phí)
   * @param {Object} filters - Bộ lọc: month, year, classId, studentId, discountPercentage
   * @param {Object} pagination - Phân trang
   * @returns {Object} Danh sách payments với pagination
   */
  async getAllPayments(filters = {}, pagination = {}) {
    try {
      const { studentId, classId, month, year, discountPercentage } = filters;

      const {
        page = 1,
        limit = 20,
        sortBy = "createdAt",
        sortOrder = "desc",
      } = pagination;

      // Build simple filter object
      const filter = {};

      // Basic filters only
      if (studentId) filter.studentId = studentId;
      if (classId) filter.classId = classId;
      if (month) filter.month = parseInt(month);
      if (year) filter.year = parseInt(year);
      if (discountPercentage !== undefined && discountPercentage !== "") {
        const parsedDiscount = parseFloat(discountPercentage);
        if (!isNaN(parsedDiscount)) {
          filter.discountPercentage = parsedDiscount;
        }
      }

      // Build sort object
      const sort = {};
      sort[sortBy] = sortOrder === "desc" ? -1 : 1;

      // Get total count for pagination
      const total = await Payment.countDocuments(filter);

      // Execute query with pagination
      const payments = await Payment.find(filter)
        .populate({
          path: "studentId",
          populate: {
            path: "userId",
            select: "name email phoneNumber",
          },
        })
        .populate({
          path: "classId",
          select: "className grade year teacherId",
          populate: {
            path: "teacherId",
            populate: {
              path: "userId",
              select: "name",
            },
          },
        })
        .populate({
          path: "parentId",
          populate: {
            path: "userId",
            select: "name email phoneNumber",
          },
        })
        .sort(sort)
        .skip((page - 1) * limit)
        .limit(limit);

      // Calculate summary statistics
      const summary = {
        totalRecords: total,
        totalPages: Math.ceil(total / limit),
        currentPage: page,
        totalOriginalAmount: 0,
        totalAfterDiscountAmount: 0,
        totalPaidAmount: 0,
        totalDueAmount: 0,
        totalDiscount: 0,
        paidCount: 0,
        unpaidCount: 0,
        partialCount: 0,
      };

      payments.forEach((payment) => {
        summary.totalOriginalAmount += payment.originalAmount || 0;
        summary.totalAfterDiscountAmount += payment.afterDiscountAmount || 0;
        summary.totalPaidAmount += payment.amountPaid || 0;
        summary.totalDueAmount += payment.amountDue || 0;
        summary.totalDiscount +=
          payment.originalAmount - payment.afterDiscountAmount || 0;

        if (payment.amountPaid >= payment.amountDue) {
          summary.paidCount++;
        } else if (payment.amountPaid > 0) {
          summary.partialCount++;
        } else {
          summary.unpaidCount++;
        }
      });

      summary.collectionRate =
        summary.totalDueAmount > 0
          ? ((summary.totalPaidAmount / summary.totalDueAmount) * 100).toFixed(
              2
            )
          : 100;

      return {
        payments,
        summary,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      throw new Error(`Lỗi khi lấy danh sách payments: ${error.message}`);
    }
  },

  /**
   * Lấy một payment theo ID (Admin xem chi tiết một bản ghi học phí)
   * @param {String} paymentId - ID của payment
   * @returns {Object} Payment details
   */
  async getPaymentById(paymentId) {
    try {
      if (!paymentId) {
        throw new Error("Thiếu thông tin bắt buộc: paymentId");
      }

      const payment = await Payment.findById(paymentId)
        .populate({
          path: "studentId",
          populate: {
            path: "userId",
            select: "name email phoneNumber gender address",
          },
        })
        .populate({
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
        })
        .populate({
          path: "parentId",
          populate: {
            path: "userId",
            select: "name email phoneNumber",
          },
        });

      if (!payment) {
        throw new Error("Không tìm thấy bản ghi thanh toán");
      }

      return payment;
    } catch (error) {
      throw new Error(`Lỗi khi lấy thông tin payment: ${error.message}`);
    }
  },

  /**
   * Cập nhật payment (Admin sửa bản ghi học phí)
   * @param {String} paymentId - ID của payment
   * @param {Object} updateData - Dữ liệu cần cập nhật
   * @returns {Object} Updated payment
   */
  async updatePayment(paymentId, updateData) {
    try {
      if (!paymentId) {
        throw new Error("Thiếu thông tin bắt buộc: paymentId");
      }

      const allowedFields = [
        "discountPercentage",
        "originalAmount",
        "afterDiscountAmount",
        "amountDue",
        "amountPaid",
        "totalLessons",
        "attendedLessons",
        "absentLessons",
        "paymentHistory",
      ];

      // Filter only allowed fields
      const filteredData = {};
      Object.keys(updateData).forEach((key) => {
        if (allowedFields.includes(key)) {
          filteredData[key] = updateData[key];
        }
      });

      if (Object.keys(filteredData).length === 0) {
        throw new Error("Không có dữ liệu hợp lệ để cập nhật");
      }

      // Validate amounts
      if (filteredData.originalAmount && filteredData.originalAmount < 0) {
        throw new Error("Số tiền gốc không thể âm");
      }

      if (filteredData.amountPaid && filteredData.amountPaid < 0) {
        throw new Error("Số tiền đã thanh toán không thể âm");
      }

      if (
        filteredData.discountPercentage &&
        (filteredData.discountPercentage < 0 ||
          filteredData.discountPercentage > 100)
      ) {
        throw new Error("Phần trăm giảm giá phải từ 0 đến 100");
      }

      // Recalculate amounts if needed
      if (
        filteredData.originalAmount &&
        filteredData.discountPercentage !== undefined
      ) {
        filteredData.afterDiscountAmount =
          filteredData.originalAmount *
          (1 - filteredData.discountPercentage / 100);
        filteredData.amountDue = filteredData.afterDiscountAmount;
      }

      const updatedPayment = await Payment.findByIdAndUpdate(
        paymentId,
        { $set: filteredData },
        { new: true, runValidators: true }
      )
        .populate({
          path: "studentId",
          populate: {
            path: "userId",
            select: "name email phoneNumber",
          },
        })
        .populate({
          path: "classId",
          select: "className grade year",
        })
        .populate({
          path: "parentId",
          populate: {
            path: "userId",
            select: "name email phoneNumber",
          },
        });

      if (!updatedPayment) {
        throw new Error("Không tìm thấy bản ghi thanh toán");
      }

      return updatedPayment;
    } catch (error) {
      throw new Error(`Lỗi khi cập nhật payment: ${error.message}`);
    }
  },

  /**
   * Xóa payment (Admin xóa bản ghi học phí)
   * @param {String} paymentId - ID của payment
   * @returns {Object} Deletion result
   */
  async deletePayment(paymentId) {
    try {
      if (!paymentId) {
        throw new Error("Thiếu thông tin bắt buộc: paymentId");
      }

      const payment = await Payment.findById(paymentId);
      if (!payment) {
        throw new Error("Không tìm thấy bản ghi thanh toán");
      }

      // Check if payment has been paid
      if (payment.amountPaid > 0) {
        throw new Error("Không thể xóa bản ghi thanh toán đã có giao dịch");
      }

      await Payment.findByIdAndDelete(paymentId);

      return {
        success: true,
        message: "Xóa bản ghi thanh toán thành công",
        deletedPayment: {
          id: payment._id,
          studentId: payment.studentId,
          classId: payment.classId,
          month: payment.month,
          year: payment.year,
          amountDue: payment.amountDue,
        },
      };
    } catch (error) {
      throw new Error(`Lỗi khi xóa payment: ${error.message}`);
    }
  },
};

module.exports = paymentService;
