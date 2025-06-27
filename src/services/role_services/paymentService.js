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
};

module.exports = paymentService;
