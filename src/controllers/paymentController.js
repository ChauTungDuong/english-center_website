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

  // API: Student-specific payment routes (chỉ Admin xem được)
  async getStudentPayments(req, res) {
    try {
      const { studentId } = req.params;
      const { month, year, status } = req.query;

      // Chỉ Admin được phép xem - đã được kiểm tra trong middleware verifyRole
      // Phụ huynh và học sinh sử dụng route riêng để xem thông tin thanh toán

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

  // API: Get all payments with simplified filtering (Admin xem toàn bộ bản ghi học phí)
  async getAllPayments(req, res) {
    try {
      const filters = {
        studentId: req.query.studentId,
        classId: req.query.classId,
        month: req.query.month,
        year: req.query.year,
        discountPercentage: req.query.discountPercentage,
      };

      const pagination = {
        page: parseInt(req.query.page) || 1,
        limit: parseInt(req.query.limit) || 20,
        sortBy: req.query.sortBy || "createdAt",
        sortOrder: req.query.sortOrder || "desc",
      };

      const result = await paymentService.getAllPayments(filters, pagination);

      return res.status(200).json({
        msg: "Lấy danh sách học phí thành công",
        data: result.payments,
        summary: result.summary,
        pagination: result.pagination,
      });
    } catch (error) {
      return res.status(500).json({
        msg: "Lỗi khi lấy danh sách học phí",
        error: error.message,
      });
    }
  },

  // API: Get payment by ID (Admin xem chi tiết một bản ghi học phí)
  async getPaymentById(req, res) {
    try {
      const { paymentId } = req.params;

      const payment = await paymentService.getPaymentById(paymentId);

      return res.status(200).json({
        msg: "Lấy thông tin học phí thành công",
        data: payment,
      });
    } catch (error) {
      return res.status(500).json({
        msg: "Lỗi khi lấy thông tin học phí",
        error: error.message,
      });
    }
  },

  // API: Update payment (Admin sửa bản ghi học phí)
  async updatePayment(req, res) {
    try {
      const { paymentId } = req.params;
      const updateData = req.body;

      const updatedPayment = await paymentService.updatePayment(
        paymentId,
        updateData
      );

      return res.status(200).json({
        msg: "Cập nhật học phí thành công",
        data: updatedPayment,
      });
    } catch (error) {
      return res.status(500).json({
        msg: "Lỗi khi cập nhật học phí",
        error: error.message,
      });
    }
  },

  // API: Delete payment (Admin xóa bản ghi học phí)
  async deletePayment(req, res) {
    try {
      const { paymentId } = req.params;

      const result = await paymentService.deletePayment(paymentId);

      return res.status(200).json({
        msg: result.message,
        data: result.deletedPayment,
      });
    } catch (error) {
      return res.status(500).json({
        msg: "Lỗi khi xóa học phí",
        error: error.message,
      });
    }
  },
};

module.exports = paymentController;
