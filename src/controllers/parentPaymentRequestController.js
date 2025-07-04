const parentPaymentRequestService = require("../services/role_services/parentPaymentRequestService");

const parentPaymentRequestController = {
  // Lấy tất cả yêu cầu thanh toán (cho admin) - Simplified filtering
  async getAllPaymentRequests(req, res) {
    try {
      const filters = {
        status: req.query.status, // 'pending', 'approved', 'rejected'
        page: req.query.page ? parseInt(req.query.page) : 1,
        limit: req.query.limit ? parseInt(req.query.limit) : 10,
        parentId: req.query.parentId,
        studentId: req.query.studentId,
        month: req.query.month,
        year: req.query.year,
        sortBy: req.query.sortBy || "requestDate",
        sortOrder: req.query.sortOrder || "desc",
      };

      const result = await parentPaymentRequestService.getAllPaymentRequests(
        filters
      );

      return res.status(200).json({
        msg: "Lấy danh sách yêu cầu thanh toán thành công",
        data: result.requests,
        pagination: result.pagination,
        summary: result.summary,
      });
    } catch (error) {
      return res.status(500).json({
        msg: "Lỗi khi lấy danh sách yêu cầu thanh toán",
        error: error.message,
      });
    }
  },

  // Lấy yêu cầu thanh toán theo ID
  async getPaymentRequestById(req, res) {
    try {
      const { requestId } = req.params;

      const request = await parentPaymentRequestService.getById(requestId);

      return res.status(200).json({
        msg: "Lấy thông tin yêu cầu thanh toán thành công",
        data: request,
      });
    } catch (error) {
      return res.status(500).json({
        msg: "Lỗi khi lấy thông tin yêu cầu thanh toán",
        error: error.message,
      });
    }
  },
  // Xử lý yêu cầu thanh toán (phê duyệt/từ chối)
  async processPaymentRequest(req, res) {
    try {
      const { requestId } = req.params;
      const { action, adminNote = "" } = req.body;

      if (!action || !["approved", "rejected"].includes(action)) {
        return res.status(400).json({
          msg: "Hành động không hợp lệ. Chỉ chấp nhận 'approved' hoặc 'rejected'",
        });
      }

      // Get admin info from the authenticated user
      const processedBy = req.user._id;

      const processedRequest =
        await parentPaymentRequestService.processPaymentRequest(requestId, {
          action,
          adminNote,
          processedBy,
        });

      const actionText = action === "approved" ? "phê duyệt" : "từ chối";

      return res.status(200).json({
        msg: `${
          actionText.charAt(0).toUpperCase() + actionText.slice(1)
        } yêu cầu thanh toán thành công`,
        data: processedRequest,
      });
    } catch (error) {
      return res.status(500).json({
        msg: "Lỗi khi xử lý yêu cầu thanh toán",
        error: error.message,
      });
    }
  },
};

module.exports = parentPaymentRequestController;
