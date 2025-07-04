const { Student, Parent, Payment, User } = require("../models");

const parentService = require("../services/role_services/parentService");
const parentPaymentRequestService = require("../services/role_services/parentPaymentRequestService");
const studentParentRelationshipService = require("../services/relationship_services/studentParentRelationshipService");

const parentController = {
  async createNewParent(req, res) {
    try {
      const parent = await parentService.create(req.body);
      return res.status(201).json({
        msg: "Tạo phụ huynh thành công",
        data: parent,
      });
    } catch (error) {
      return res.status(500).json({
        msg: "Lỗi khi tạo phụ huynh",
        error: error.message,
      });
    }
  },
  async getParentInfo(req, res) {
    try {
      const parent = await parentService.getById(req.params.parentId);
      return res.status(200).json({
        msg: "Lấy thông tin phụ huynh thành công",
        data: parent,
      });
    } catch (error) {
      return res.status(500).json({
        msg: "Lỗi khi lấy thông tin phụ huynh",
        error: error.message,
      });
    }
  },
  async updateParent(req, res) {
    try {
      const updatedParent = await parentService.update(
        req.params.parentId,
        req.body
      );
      return res.status(200).json({
        msg: "Cập nhật thông tin phụ huynh thành công",
        data: updatedParent,
      });
    } catch (error) {
      return res.status(500).json({
        msg: "Lỗi khi cập nhật thông tin phụ huynh",
        error: error.message,
      });
    }
  },
  async deleteParent(req, res) {
    try {
      await parentService.delete(req.params.parentId);
      return res.status(200).json({
        msg: "Xóa phụ huynh thành công",
      });
    } catch (error) {
      return res.status(500).json({
        msg: "Lỗi khi xóa phụ huynh",
        error: error.message,
      });
    }
  },

  async getAllParents(req, res) {
    try {
      const { page, limit, sort, isActive } = req.query;

      // Parse isActive để có logic rõ ràng: true, false, hoặc undefined
      let parsedIsActive;
      if (isActive === "true") {
        parsedIsActive = true;
      } else if (isActive === "false") {
        parsedIsActive = false;
      }
      // Nếu isActive không có hoặc không phải "true"/"false" thì để undefined

      const options = {
        page: page ? parseInt(page) : 1,
        limit: limit ? parseInt(limit) : 10,
        sort: sort ? JSON.parse(sort) : { createdAt: -1 },
        isActive: parsedIsActive,
      };

      const result = await parentService.getAll({}, options);
      return res.status(200).json({
        msg: "Lấy danh sách phụ huynh thành công",
        data: result.parents,
        pagination: result.pagination,
      });
    } catch (error) {
      return res.status(500).json({
        msg: "Lỗi khi lấy danh sách phụ huynh",
        error: error.message,
      });
    }
  },
  async getAllChild(req, res) {
    // ❌ API này đã được thay thế bằng getChildrenWithDetails
    return res.status(410).json({
      msg: "API này đã bị loại bỏ. Vui lòng sử dụng GET /parents/:parentId/children-details",
    });
  },
  // API mới: Quản lý quan hệ Parent-Student (thay thế link/unlink)
  async updateParentChildren(req, res) {
    try {
      const { parentId } = req.params;
      const { action, studentId, studentIds } = req.body;

      if (!parentId) {
        return res.status(400).json({
          msg: "Thiếu thông tin: parentId",
        });
      }
      // Validation action
      if (!action || !["add", "remove"].includes(action)) {
        return res.status(400).json({
          msg: "Action phải là 'add' hoặc 'remove'",
        });
      } // 🔥 Support cả single và multiple students
      let studentsToProcess = [];

      if (studentId && studentIds) {
        return res.status(400).json({
          msg: "Chỉ được sử dụng một trong hai: studentId hoặc studentIds",
        });
      }

      if (studentId) {
        // Handle both string and array for studentId
        if (Array.isArray(studentId)) {
          studentsToProcess = studentId;
        } else {
          studentsToProcess = [studentId];
        }
      } else if (studentIds && Array.isArray(studentIds)) {
        if (studentIds.length === 0) {
          return res.status(400).json({
            msg: "studentIds không được rỗng",
          });
        }
        studentsToProcess = studentIds;
      } else {
        return res.status(400).json({
          msg: "Thiếu thông tin: studentId hoặc studentIds",
        });
      }

      // Process multiple students
      const result = await parentService.updateChildRelationshipBulk(
        parentId,
        action,
        studentsToProcess
      );

      const successMsg =
        studentsToProcess.length === 1
          ? `${
              action === "add" ? "Thêm" : "Xóa"
            } quan hệ parent-student thành công`
          : `${action === "add" ? "Thêm" : "Xóa"} ${result.summary.success}/${
              studentsToProcess.length
            } quan hệ parent-student thành công`;

      return res.status(200).json({
        msg: successMsg,
        data: result,
      });
    } catch (error) {
      return res.status(500).json({
        msg: "Lỗi khi cập nhật quan hệ parent-student",
        error: error.message,
      });
    }
  },

  // API chuyên biệt: Lấy thông tin chi tiết các con kể cả điểm danh
  async getChildrenWithDetails(req, res) {
    try {
      const { parentId } = req.params;
      const currentUserId = req.user.id;
      const currentUserRole = req.user.role;

      // Kiểm tra quyền sở hữu: Parent chỉ có thể xem thông tin con của mình
      if (currentUserRole === "Parent") {
        // Lấy parent record dựa trên userId từ token
        const currentParent = await Parent.findOne({ userId: currentUserId });
        if (!currentParent) {
          return res.status(404).json({
            msg: "Không tìm thấy thông tin phụ huynh",
          });
        }

        // Sử dụng parentId từ token thay vì từ params
        const tokenParentId = currentParent._id.toString();

        // Nếu có parentId trong params, kiểm tra có khớp với token không
        if (parentId && parentId !== tokenParentId) {
          return res.status(403).json({
            msg: "Bạn chỉ có thể xem thông tin con của mình",
          });
        }

        // Sử dụng parentId từ token để lấy data
        const children = await parentService.getChildrenWithDetails(
          tokenParentId
        );
        return res.status(200).json({
          msg: "Lấy thông tin chi tiết các con thành công",
          data: children,
        });
      }
      // Admin có thể xem bất kỳ parent nào
      else if (currentUserRole === "Admin") {
        const children = await parentService.getChildrenWithDetails(parentId);
        return res.status(200).json({
          msg: "Lấy thông tin chi tiết các con thành công",
          data: children,
        });
      } else {
        return res.status(403).json({
          msg: "Bạn không có quyền truy cập API này",
        });
      }
    } catch (error) {
      return res.status(500).json({
        msg: "Lỗi khi lấy thông tin chi tiết các con",
        error: error.message,
      });
    }
  },

  // API mới: Lấy thông tin học phí chưa đóng của các con
  async getChildrenUnpaidPayments(req, res) {
    try {
      const { parentId } = req.params;
      const { month, year } = req.query;
      const currentUserId = req.user.id;
      const currentUserRole = req.user.role;

      // Kiểm tra quyền sở hữu: Parent chỉ có thể xem thông tin học phí con của mình
      if (currentUserRole === "Parent") {
        // Lấy parent record dựa trên userId từ token
        const currentParent = await Parent.findOne({ userId: currentUserId });
        if (!currentParent) {
          return res.status(404).json({
            msg: "Không tìm thấy thông tin phụ huynh",
          });
        }

        // Sử dụng parentId từ token thay vì từ params
        const tokenParentId = currentParent._id.toString();

        // Nếu có parentId trong params, kiểm tra có khớp với token không
        if (parentId && parentId !== tokenParentId) {
          return res.status(403).json({
            msg: "Bạn chỉ có thể xem thông tin học phí con của mình",
          });
        }

        // Sử dụng parentId từ token để lấy data
        const result = await parentService.getChildrenUnpaidPayments(
          tokenParentId,
          {
            month,
            year,
          }
        );

        return res.status(200).json({
          msg: "Lấy thông tin học phí chưa đóng thành công",
          data: result,
        });
      }
      // Admin có thể xem bất kỳ parent nào
      else if (currentUserRole === "Admin") {
        const result = await parentService.getChildrenUnpaidPayments(parentId, {
          month,
          year,
        });

        return res.status(200).json({
          msg: "Lấy thông tin học phí chưa đóng thành công",
          data: result,
        });
      } else {
        return res.status(403).json({
          msg: "Bạn không có quyền truy cập API này",
        });
      }
    } catch (error) {
      return res.status(500).json({
        msg: "Lỗi khi lấy thông tin học phí chưa đóng",
        error: error.message,
      });
    }
  }, // API mới: Tạo yêu cầu thanh toán
  async createPaymentRequest(req, res) {
    try {
      const { parentId } = req.params;
      const currentUserId = req.user.id;
      const currentUserRole = req.user.role;

      // Kiểm tra quyền sở hữu: Parent chỉ có thể tạo yêu cầu thanh toán cho mình
      if (currentUserRole === "Parent") {
        // Lấy parent record dựa trên userId từ token
        const currentParent = await Parent.findOne({ userId: currentUserId });
        if (!currentParent) {
          return res.status(404).json({
            msg: "Không tìm thấy thông tin phụ huynh",
          });
        }

        // Sử dụng parentId từ token thay vì từ params
        const tokenParentId = currentParent._id.toString();

        // Nếu có parentId trong params, kiểm tra có khớp với token không
        if (parentId && parentId !== tokenParentId) {
          return res.status(403).json({
            msg: "Bạn chỉ có thể tạo yêu cầu thanh toán cho mình",
          });
        }

        // Với .fields(), file sẽ ở trong req.files
        const uploadedFile =
          req.files && req.files["proof"] ? req.files["proof"][0] : null;

        const requestData = {
          ...req.body,
          parentId: tokenParentId, // Sử dụng parentId từ token
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
      }
      // Admin có thể tạo yêu cầu cho bất kỳ parent nào
      else if (currentUserRole === "Admin") {
        // Với .fields(), file sẽ ở trong req.files
        const uploadedFile =
          req.files && req.files["proof"] ? req.files["proof"][0] : null;

        const requestData = {
          ...req.body,
          parentId,
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
      } else {
        return res.status(403).json({
          msg: "Bạn không có quyền truy cập API này",
        });
      }
    } catch (error) {
      return res.status(500).json({
        msg: "Lỗi khi tạo yêu cầu thanh toán",
        error: error.message,
      });
    }
  },

  // API mới: Lấy danh sách yêu cầu thanh toán của phụ huynh
  async getPaymentRequests(req, res) {
    try {
      const { parentId } = req.params;
      const { status, page, limit } = req.query;
      const currentUserId = req.user.id;
      const currentUserRole = req.user.role;

      // Kiểm tra quyền sở hữu: Parent chỉ có thể xem yêu cầu thanh toán của mình
      if (currentUserRole === "Parent") {
        // Lấy parent record dựa trên userId từ token
        const currentParent = await Parent.findOne({ userId: currentUserId });
        if (!currentParent) {
          return res.status(404).json({
            msg: "Không tìm thấy thông tin phụ huynh",
          });
        }

        // Sử dụng parentId từ token thay vì từ params
        const tokenParentId = currentParent._id.toString();

        // Nếu có parentId trong params, kiểm tra có khớp với token không
        if (parentId && parentId !== tokenParentId) {
          return res.status(403).json({
            msg: "Bạn chỉ có thể xem yêu cầu thanh toán của mình",
          });
        }

        // Sử dụng parentId từ token để lấy data
        const result =
          await parentPaymentRequestService.getParentPaymentRequests(
            tokenParentId,
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
      }
      // Admin có thể xem bất kỳ parent nào
      else if (currentUserRole === "Admin") {
        const result =
          await parentPaymentRequestService.getParentPaymentRequests(parentId, {
            status,
            page: page ? parseInt(page) : 1,
            limit: limit ? parseInt(limit) : 10,
          });

        return res.status(200).json({
          msg: "Lấy danh sách yêu cầu thanh toán thành công",
          data: result.requests,
          pagination: result.pagination,
        });
      } else {
        return res.status(403).json({
          msg: "Bạn không có quyền truy cập API này",
        });
      }
    } catch (error) {
      return res.status(500).json({
        msg: "Lỗi khi lấy danh sách yêu cầu thanh toán",
        error: error.message,
      });
    }
  },

  async getChildPayments(req, res) {
    try {
      const { studentId } = req.params;
      const { month, year } = req.query;

      const filter = { studentId };
      if (month) filter.month = parseInt(month);
      if (year) filter.year = parseInt(year);

      const payments = await Payment.find(filter)
        .populate("classId", "className")
        .sort({ year: -1, month: -1 });

      // Tính tổng học phí chưa đóng
      let totalDue = 0;
      for (const payment of payments) {
        const due = payment.amountDue - payment.amountPaid;
        if (due > 0) totalDue += due;
      }

      return res.status(200).json({
        msg: "Lấy thông tin học phí thành công",
        data: {
          payments,
          totalDue,
        },
      });
    } catch (error) {
      return res.status(500).json({
        msg: "Lỗi khi lấy thông tin học phí",
        error: error.message,
      });
    }
  },

  // API mới: Admin lấy tất cả yêu cầu thanh toán (có kèm ảnh)
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
        msg: "Lấy danh sách tất cả yêu cầu thanh toán thành công",
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

  // API mới: Admin/Teacher xử lý yêu cầu thanh toán (approve/reject)
  async processPaymentRequest(req, res) {
    try {
      const { requestId } = req.params;
      const { action, adminNote } = req.body;

      // processedBy sẽ là ID của admin/teacher đang đăng nhập
      const processedBy = req.user?.id || req.body.processedBy;

      const result = await parentPaymentRequestService.processPaymentRequest(
        requestId,
        {
          action,
          adminNote,
          processedBy,
        }
      );

      return res.status(200).json({
        msg: `${
          action === "approved" ? "Duyệt" : "Từ chối"
        } yêu cầu thanh toán thành công`,
        data: result,
      });
    } catch (error) {
      return res.status(500).json({
        msg: "Lỗi khi xử lý yêu cầu thanh toán",
        error: error.message,
      });
    }
  },

  // Soft delete parent (chỉ admin)
  async softDeleteParent(req, res) {
    try {
      // Chỉ admin mới có quyền
      if (req.user.role !== "Admin") {
        return res.status(403).json({
          msg: "Chỉ Admin mới có quyền thực hiện thao tác này",
        });
      }

      const { parentId } = req.params;

      const result = await parentService.softDelete(parentId);

      return res.status(200).json({
        msg: "Xóa mềm parent thành công",
        parent: result,
      });
    } catch (error) {
      return res.status(500).json({
        msg: "Lỗi khi xóa mềm parent",
        error: error.message,
      });
    }
  },
};
module.exports = parentController;
