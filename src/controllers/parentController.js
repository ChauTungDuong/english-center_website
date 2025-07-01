const ParentService = require("../services/ParentService");
const ParentPaymentRequestService = require("../services/ParentPaymentRequestService");
const PaymentService = require("../services/PaymentService");
const { catchAsync } = require("../core/middleware");
const { ApiResponse } = require("../core/utils");
const parentService = new ParentService();
const paymentService = new PaymentService();

const parentController = {
  createNewParent: catchAsync(async (req, res) => {
    const parent = await parentService.createParent(req.body);
    ApiResponse.success(res, "Tạo phụ huynh thành công", parent, 201);
  }),
  getParentInfo: catchAsync(async (req, res) => {
    const parent = await parentService.getById(req.params.parentId);
    ApiResponse.success(res, "Lấy thông tin phụ huynh thành công", parent);
  }),
  updateParent: catchAsync(async (req, res) => {
    const updatedParent = await parentService.updateParent(
      req.params.parentId,
      req.body
    );
    ApiResponse.success(
      res,
      "Cập nhật thông tin phụ huynh thành công",
      updatedParent
    );
  }),
  deleteParent: catchAsync(async (req, res) => {
    await parentService.deleteById(req.params.parentId);
    ApiResponse.success(res, "Xóa phụ huynh thành công");
  }),
  getAllParents: catchAsync(async (req, res) => {
    const { page, limit, sort, isActive } = req.query;
    let parsedIsActive;
    if (isActive === "true") {
      parsedIsActive = true;
    } else if (isActive === "false") {
      parsedIsActive = false;
    }
    const options = {
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 10,
      sort: sort ? JSON.parse(sort) : { createdAt: -1 },
      isActive: parsedIsActive,
    };
    const result = await parentService.getAllParents({}, options);
    ApiResponse.success(res, "Lấy danh sách phụ huynh thành công", {
      parents: result.parents,
      pagination: result.pagination,
    });
  }),
  getChildrenWithDetails: catchAsync(async (req, res) => {
    const { parentId } = req.params;
    const children = await parentService.getParentChildren(parentId);
    ApiResponse.success(res, "Lấy chi tiết con cái thành công", children);
  }),
  updateParentChildren: catchAsync(async (req, res) => {
    const { parentId } = req.params;
    const { action, studentId, studentIds } = req.body;
    if (!parentId) {
      return ApiResponse.error(res, "Thiếu thông tin: parentId", 400);
    }
    if (!action || !["add", "remove"].includes(action)) {
      return ApiResponse.error(res, "Action phải là 'add' hoặc 'remove'", 400);
    }
    let studentsToProcess = [];

    if (studentId && studentIds) {
      return ApiResponse.error(
        res,
        "Chỉ được sử dụng một trong hai: studentId hoặc studentIds",
        400
      );
    }
    if (studentId) {
      studentsToProcess = Array.isArray(studentId) ? studentId : [studentId];
    } else if (studentIds && Array.isArray(studentIds)) {
      if (studentIds.length === 0) {
        return ApiResponse.error(res, "studentIds không được rỗng", 400);
      }
      studentsToProcess = studentIds;
    } else {
      return ApiResponse.error(
        res,
        "Thiếu thông tin: studentId hoặc studentIds",
        400
      );
    }
    const results = [];
    for (const studentId of studentsToProcess) {
      try {
        if (action === "add") {
          await parentService.addChildToParent(parentId, studentId);
        } else {
          await parentService.removeChildFromParent(parentId, studentId);
        }
        results.push({ studentId, success: true });
      } catch (error) {
        results.push({ studentId, success: false, error: error.message });
      }
    }
    const successCount = results.filter((r) => r.success).length;
    const successMsg =
      studentsToProcess.length === 1
        ? `${
            action === "add" ? "Thêm" : "Xóa"
          } quan hệ parent-student thành công`
        : `${action === "add" ? "Thêm" : "Xóa"} ${successCount}/${
            studentsToProcess.length
          } quan hệ parent-student thành công`;
    ApiResponse.success(res, successMsg, {
      results,
      summary: { total: studentsToProcess.length, success: successCount },
    });
  }),
  softDeleteParent: catchAsync(async (req, res) => {
    const { parentId } = req.params;
    const result = await parentService.softDeleteParent(parentId);
    ApiResponse.success(res, result.message);
  }),

  // Payment-related methods
  getChildrenUnpaidPayments: catchAsync(async (req, res) => {
    const { parentId } = req.params;

    // Get parent's children
    const parent = await parentService.getById(parentId);
    const childrenIds = parent.childId.map((child) => child._id);

    // Get unpaid payments for all children
    const unpaidPayments = [];
    for (const childId of childrenIds) {
      const payments = await paymentService.getStudentPayments(childId, {
        status: "pending",
      });
      unpaidPayments.push(...payments);
    }

    ApiResponse.success(
      res,
      "Lấy thông tin học phí chưa đóng thành công",
      unpaidPayments
    );
  }),

  createPaymentRequest: catchAsync(async (req, res) => {
    const { parentId } = req.params;
    const requestData = { ...req.body, parentId };

    // Handle uploaded file if present
    if (req.files && req.files.proof) {
      requestData.uploadedFile = req.files.proof[0];
    }

    const paymentRequest =
      await ParentPaymentRequestService.createPaymentRequest(requestData, req);
    ApiResponse.success(
      res,
      "Tạo yêu cầu thanh toán thành công",
      paymentRequest,
      201
    );
  }),

  getPaymentRequests: catchAsync(async (req, res) => {
    const { parentId } = req.params;
    const { page, limit, status } = req.query;

    const options = {
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 10,
      status,
    };

    const paymentRequests =
      await ParentPaymentRequestService.getParentPaymentRequests(
        parentId,
        options
      );
    ApiResponse.success(
      res,
      "Lấy danh sách yêu cầu thanh toán thành công",
      paymentRequests
    );
  }),

  getAllPaymentRequests: catchAsync(async (req, res) => {
    const { page, limit, status } = req.query;

    const options = {
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 10,
      status,
    };

    const paymentRequests =
      await ParentPaymentRequestService.getAllPaymentRequests(options);
    ApiResponse.success(
      res,
      "Lấy tất cả yêu cầu thanh toán thành công",
      paymentRequests
    );
  }),

  processPaymentRequest: catchAsync(async (req, res) => {
    const { requestId } = req.params;
    const { action, adminNote } = req.body;

    if (!["approve", "reject"].includes(action)) {
      return ApiResponse.error(
        res,
        "Action phải là 'approve' hoặc 'reject'",
        400
      );
    }

    const result = await ParentPaymentRequestService.processPaymentRequest(
      requestId,
      action,
      adminNote
    );
    ApiResponse.success(
      res,
      `${
        action === "approve" ? "Duyệt" : "Từ chối"
      } yêu cầu thanh toán thành công`,
      result
    );
  }),
};

module.exports = parentController;
