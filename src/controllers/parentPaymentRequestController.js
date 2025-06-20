const parentPaymentRequestService = require("../services/role_services/parentPaymentRequestService");

const parentPaymentRequestController = {
  // Lấy tất cả yêu cầu thanh toán (cho admin)
  async getAllPaymentRequests(req, res) {
    try {
      const { status, page, limit, parentId, studentId } = req.query;

      const result = await parentPaymentRequestService.getAllPaymentRequests({
        status,
        page: page ? parseInt(page) : 1,
        limit: limit ? parseInt(limit) : 10,
        parentId,
        studentId,
      });

      return res.status(200).json({
        msg: "Lấy danh sách yêu cầu thanh toán thành công",
        data: result.requests,
        pagination: result.pagination,
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

  // Phê duyệt yêu cầu thanh toán
  async approvePaymentRequest(req, res) {
    try {
      const { requestId } = req.params;
      const { adminNote = "" } = req.body;

      // Get admin info from the authenticated user
      const processedBy = req.user._id; // Assuming auth middleware sets req.user

      const processedRequest =
        await parentPaymentRequestService.processPaymentRequest(requestId, {
          action: "approved",
          adminNote,
          processedBy,
        });

      return res.status(200).json({
        msg: "Phê duyệt yêu cầu thanh toán thành công",
        data: processedRequest,
      });
    } catch (error) {
      return res.status(500).json({
        msg: "Lỗi khi phê duyệt yêu cầu thanh toán",
        error: error.message,
      });
    }
  },

  // Từ chối yêu cầu thanh toán
  async rejectPaymentRequest(req, res) {
    try {
      const { requestId } = req.params;
      const { adminNote = "" } = req.body;

      // Get admin info from the authenticated user
      const processedBy = req.user._id; // Assuming auth middleware sets req.user

      const processedRequest =
        await parentPaymentRequestService.processPaymentRequest(requestId, {
          action: "rejected",
          adminNote,
          processedBy,
        });

      return res.status(200).json({
        msg: "Từ chối yêu cầu thanh toán thành công",
        data: processedRequest,
      });
    } catch (error) {
      return res.status(500).json({
        msg: "Lỗi khi từ chối yêu cầu thanh toán",
        error: error.message,
      });
    }
  },

  // Xử lý yêu cầu thanh toán (approve/reject trong một API)
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
      const processedBy = req.user._id; // Assuming auth middleware sets req.user

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
