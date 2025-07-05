const parentPaymentRequestService = require("../services/role_services/parentPaymentRequestService");
const { Parent } = require("../models");

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
      const currentUserId = req.user.id;
      const currentUserRole = req.user.role;

      // Lấy thông tin request trước để kiểm tra
      const request = await parentPaymentRequestService.getById(requestId);

      // Nếu là Parent, kiểm tra quyền sở hữu
      if (currentUserRole === "Parent") {
        // Lấy parent record dựa trên userId từ token
        const currentParent = await Parent.findOne({ userId: currentUserId });
        if (!currentParent) {
          return res.status(404).json({
            msg: "Không tìm thấy thông tin phụ huynh",
          });
        }

        // Kiểm tra quyền sở hữu
        if (request.parentId._id.toString() !== currentParent._id.toString()) {
          return res.status(403).json({
            msg: "Bạn không có quyền xem yêu cầu thanh toán này",
          });
        }
      }

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

  // ===== TOKEN-BASED OWNERSHIP METHODS =====

  // API: Parent lấy danh sách yêu cầu thanh toán của mình (không cần parentId)
  async getMyPaymentRequests(req, res) {
    try {
      const { status, page, limit } = req.query;
      const currentUserId = req.user.id;

      // Lấy parent record dựa trên userId từ token
      const currentParent = await Parent.findOne({ userId: currentUserId });
      if (!currentParent) {
        return res.status(404).json({
          msg: "Không tìm thấy thông tin phụ huynh",
        });
      }

      // Sử dụng parentId từ token để lấy data
      const result = await parentPaymentRequestService.getParentPaymentRequests(
        currentParent._id.toString(),
        {
          status,
          page: page ? parseInt(page) : 1,
          limit: limit ? parseInt(limit) : 10,
        }
      );

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

  // API: Parent tạo yêu cầu thanh toán (không cần parentId)
  async createMyPaymentRequest(req, res) {
    try {
      const currentUserId = req.user.id;

      // Lấy parent record dựa trên userId từ token
      const currentParent = await Parent.findOne({ userId: currentUserId });
      if (!currentParent) {
        return res.status(404).json({
          msg: "Không tìm thấy thông tin phụ huynh",
        });
      }

      // Với .fields(), file sẽ ở trong req.files
      const uploadedFile =
        req.files && req.files["proof"] ? req.files["proof"][0] : null;

      const requestData = {
        ...req.body,
        parentId: currentParent._id.toString(), // Sử dụng parentId từ token
        uploadedFile, // File từ multer middleware
      };

      const paymentRequest =
        await parentPaymentRequestService.createPaymentRequest(
          requestData,
          req
        );

      return res.status(201).json({
        msg: "Tạo yêu cầu thanh toán thành công",
        data: paymentRequest,
      });
    } catch (error) {
      return res.status(500).json({
        msg: "Lỗi khi tạo yêu cầu thanh toán",
        error: error.message,
      });
    }
  },
};

module.exports = parentPaymentRequestController;
