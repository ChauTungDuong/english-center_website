const paymentService = require("../services/role_services/paymentService");

const paymentController = {
  // API: Payment summary and statistics (Admin thống kê tài chính)
  async getPaymentSummary(req, res) {
    try {
      const { month, year, startDate, endDate } = req.query;

      const summary = await paymentService.getPaymentSummary({
        month,
        year,
        startDate,
        endDate,
      });

      return res.status(200).json({
        msg: "Lấy tổng quan thanh toán thành công",
        data: summary,
      });
    } catch (error) {
      return res.status(500).json({
        msg: "Lỗi khi lấy tổng quan thanh toán",
        error: error.message,
      });
    }
  },

  // API: Student-specific payment routes (xem payment của học sinh)
  async getStudentPayments(req, res) {
    try {
      const { studentId } = req.params;
      const { month, year, status } = req.query;

      // Kiểm tra quyền truy cập
      if (
        (req.user.role === "Student" || req.user.role === "Parent") &&
        req.user.studentId?.toString() !== studentId
      ) {
        return res.status(403).json({
          msg: "Bạn chỉ có thể xem thông tin thanh toán của chính mình",
        });
      }

      const payments = await paymentService.getStudentPayments(studentId, {
        month,
        year,
        status,
      });

      return res.status(200).json({
        msg: "Lấy lịch sử thanh toán học sinh thành công",
        data: payments,
      });
    } catch (error) {
      return res.status(500).json({
        msg: "Lỗi khi lấy lịch sử thanh toán học sinh",
        error: error.message,
      });
    }
  },
};

module.exports = paymentController;
