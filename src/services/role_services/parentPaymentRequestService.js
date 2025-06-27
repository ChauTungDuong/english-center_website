const withTransaction = require("../../utils/session");
const {
  ParentPaymentRequest,
  Payment,
  Parent,
  Student,
} = require("../../models");
const fs = require("fs");
const path = require("path");

const parentPaymentRequestService = {
  /**
   * Tạo yêu cầu thanh toán từ phụ huynh
   * @param {Object} requestData - Dữ liệu yêu cầu thanh toán
   * @param {Object} req - Request object để tạo file URL
   * @returns {Object} Yêu cầu thanh toán đã được tạo
   */
  async createPaymentRequest(requestData, req = null) {
    return await withTransaction(async (session) => {
      try {
        const {
          parentId,
          paymentId,
          amount,
          uploadedFile = null, // File được upload từ multer
        } = requestData;

        if (!parentId || !paymentId || !amount || amount <= 0) {
          throw new Error(
            "Thiếu thông tin bắt buộc: parentId, paymentId, amount"
          );
        }

        // Xử lý file upload và convert sang Base64
        let proofImageBase64 = "";
        let proofImageMimeType = "";
        let proofImageSize = 0;

        if (uploadedFile) {
          try {
            // Đọc file và convert sang Base64
            const fileBuffer = fs.readFileSync(uploadedFile.path);
            proofImageBase64 = fileBuffer.toString("base64");
            proofImageMimeType = uploadedFile.mimetype;
            proofImageSize = uploadedFile.size;

            // Xóa file tạm sau khi đã convert sang Base64
            fs.unlinkSync(uploadedFile.path);
          } catch (fileError) {
            throw new Error(`Lỗi khi xử lý file: ${fileError.message}`);
          }
        }

        // Validate payment exists and parent owns it
        const payment = await Payment.findById(paymentId)
          .populate("studentId")
          .session(session);

        if (!payment) {
          throw new Error("Không tìm thấy thông tin học phí");
        }

        // Check if parent owns this payment
        const parent = await Parent.findById(parentId).session(session);
        if (!parent) {
          throw new Error("Không tìm thấy phụ huynh");
        }

        const isParentPayment = parent.childId.some(
          (childId) => childId.toString() === payment.studentId._id.toString()
        );

        if (!isParentPayment) {
          throw new Error(
            "Phụ huynh không có quyền thanh toán cho học phí này"
          );
        }

        // Check remaining amount
        const remainingAmount = payment.amountDue - payment.amountPaid;
        if (remainingAmount <= 0) {
          throw new Error("Học phí đã được thanh toán đủ");
        }

        if (amount > remainingAmount) {
          throw new Error(
            `Số tiền thanh toán không được vượt quá số tiền còn nợ: ${remainingAmount}`
          );
        } // Check if there's already a pending request for this payment
        const existingRequest = await ParentPaymentRequest.findOne({
          parentId,
          paymentId,
          status: "pending",
        }).session(session);

        if (existingRequest) {
          throw new Error(
            "Đã có yêu cầu thanh toán đang chờ xử lý cho học phí này"
          );
        }

        // Create payment request with Base64 image data
        const paymentRequest = await ParentPaymentRequest.create(
          [
            {
              parentId,
              paymentId,
              studentId: payment.studentId._id,
              amount,
              proofImageBase64,
              proofImageMimeType,
              proofImageSize,
              status: "pending",
              requestDate: new Date(),
            },
          ],
          { session }
        );

        return await ParentPaymentRequest.findById(paymentRequest[0]._id)
          .populate("parentId", "userId")
          .populate({
            path: "parentId",
            populate: { path: "userId", select: "name email phoneNumber" },
          })
          .populate("studentId", "userId")
          .populate({
            path: "studentId",
            populate: { path: "userId", select: "name email" },
          })
          .populate("paymentId", "month year amountDue amountPaid classId")
          .populate({
            path: "paymentId",
            populate: { path: "classId", select: "className grade" },
          })
          .session(session);
      } catch (error) {
        throw new Error(`Lỗi khi tạo yêu cầu thanh toán: ${error.message}`);
      }
    });
  },

  /**
   * Lấy danh sách yêu cầu thanh toán của phụ huynh
   * @param {String} parentId - ID của phụ huynh
   * @param {Object} filters - Bộ lọc
   * @returns {Array} Danh sách yêu cầu thanh toán
   */
  async getParentPaymentRequests(parentId, filters = {}) {
    try {
      if (!parentId) {
        throw new Error("Thiếu thông tin bắt buộc: parentId");
      }

      const { status, page = 1, limit = 10 } = filters;
      const skip = (page - 1) * limit;

      const filter = { parentId };
      if (status) filter.status = status;

      const requests = await ParentPaymentRequest.find(filter)
        .populate("parentId", "userId")
        .populate({
          path: "parentId",
          populate: { path: "userId", select: "name email phoneNumber" },
        })
        .populate("studentId", "userId")
        .populate({
          path: "studentId",
          populate: { path: "userId", select: "name email" },
        })
        .populate("paymentId", "month year amountDue amountPaid classId")
        .populate({
          path: "paymentId",
          populate: { path: "classId", select: "className grade" },
        })
        .sort({ requestDate: -1 })
        .skip(skip)
        .limit(limit);
      const total = await ParentPaymentRequest.countDocuments(filter);

      // Format requests với ảnh Base64 cho Parent
      const formattedRequests = requests.map((request) => {
        const requestObj = request.toObject();

        // Thêm imageDataUrl nếu có ảnh
        if (requestObj.proofImageBase64 && requestObj.proofImageMimeType) {
          requestObj.imageDataUrl = `data:${requestObj.proofImageMimeType};base64,${requestObj.proofImageBase64}`;
        }

        // Xóa Base64 raw data để giảm kích thước response (giữ imageDataUrl)
        delete requestObj.proofImageBase64;

        return requestObj;
      });

      return {
        requests: formattedRequests,
        pagination: {
          current: page,
          total: Math.ceil(total / limit),
          count: formattedRequests.length,
          totalRecords: total,
        },
      };
    } catch (error) {
      throw new Error(
        `Lỗi khi lấy danh sách yêu cầu thanh toán: ${error.message}`
      );
    }
  },

  /**
   * Lấy tất cả yêu cầu thanh toán (cho admin)
   * @param {Object} filters - Bộ lọc
   * @returns {Object} Danh sách yêu cầu thanh toán và pagination
   */
  async getAllPaymentRequests(filters = {}) {
    try {
      const { status, page = 1, limit = 10, parentId, studentId } = filters;
      const skip = (page - 1) * limit;

      const filter = {};
      if (status) filter.status = status;
      if (parentId) filter.parentId = parentId;
      if (studentId) filter.studentId = studentId;

      const requests = await ParentPaymentRequest.find(filter)
        .populate("parentId", "userId")
        .populate({
          path: "parentId",
          populate: { path: "userId", select: "name email phoneNumber" },
        })
        .populate("studentId", "userId")
        .populate({
          path: "studentId",
          populate: { path: "userId", select: "name email" },
        })
        .populate("paymentId", "month year amountDue amountPaid classId")
        .populate({
          path: "paymentId",
          populate: { path: "classId", select: "className grade" },
        })
        .sort({ requestDate: -1 })
        .skip(skip)
        .limit(limit);
      const total = await ParentPaymentRequest.countDocuments(filter);

      // Format requests với ảnh Base64 cho Admin
      const formattedRequests = requests.map((request) => {
        const requestObj = request.toObject();

        // Thêm imageDataUrl nếu có ảnh
        if (requestObj.proofImageBase64 && requestObj.proofImageMimeType) {
          requestObj.imageDataUrl = `data:${requestObj.proofImageMimeType};base64,${requestObj.proofImageBase64}`;
        }

        // Xóa Base64 raw data để giảm kích thước response (giữ imageDataUrl)
        delete requestObj.proofImageBase64;

        return requestObj;
      });

      return {
        requests: formattedRequests,
        pagination: {
          current: page,
          total: Math.ceil(total / limit),
          count: formattedRequests.length,
          totalRecords: total,
        },
      };
    } catch (error) {
      throw new Error(
        `Lỗi khi lấy tất cả yêu cầu thanh toán: ${error.message}`
      );
    }
  },

  /**
   * Xử lý yêu cầu thanh toán (approve/reject)
   * @param {String} requestId - ID của yêu cầu thanh toán
   * @param {Object} actionData - Dữ liệu hành động
   * @returns {Object} Yêu cầu thanh toán đã được xử lý
   */
  async processPaymentRequest(requestId, actionData) {
    return await withTransaction(async (session) => {
      try {
        const { action, adminNote = "", processedBy } = actionData;
        if (!requestId || !action) {
          throw new Error("Thiếu thông tin bắt buộc: requestId, action");
        }

        if (!["approved", "rejected"].includes(action)) {
          throw new Error(
            "Hành động không hợp lệ. Chỉ chấp nhận 'approved' hoặc 'rejected'"
          );
        }

        const request = await ParentPaymentRequest.findById(requestId)
          .populate("paymentId")
          .session(session);

        if (!request) {
          throw new Error("Không tìm thấy yêu cầu thanh toán");
        }

        if (request.status !== "pending") {
          throw new Error("Yêu cầu thanh toán đã được xử lý trước đó");
        } // Update request status
        request.status = action;
        request.adminNote = adminNote;
        if (processedBy) {
          request.processedBy = processedBy;
        }
        request.processedDate = new Date();

        await request.save({ session });

        // If approved, update the payment
        if (action === "approved") {
          const payment = await Payment.findById(request.paymentId._id).session(
            session
          );

          if (!payment) {
            throw new Error("Không tìm thấy thông tin học phí");
          } // Add to payment history
          payment.paymentHistory.push({
            amount: request.amount,
            paymentMethod: "parent_request", // Fixed method for parent requests
            note: `Thanh toán từ phụ huynh`,
            date: new Date(),
            parentPaymentRequestId: request._id,
          });

          // Update amount paid
          payment.amountPaid += request.amount;
          payment.paymentDate = new Date();

          await payment.save({ session });
        }

        return await ParentPaymentRequest.findById(requestId)
          .populate("parentId", "userId")
          .populate({
            path: "parentId",
            populate: { path: "userId", select: "name email phoneNumber" },
          })
          .populate("studentId", "userId")
          .populate({
            path: "studentId",
            populate: { path: "userId", select: "name email" },
          })
          .populate("paymentId", "month year amountDue amountPaid classId")
          .populate({
            path: "paymentId",
            populate: { path: "classId", select: "className grade" },
          })
          .session(session);
      } catch (error) {
        throw new Error(`Lỗi khi xử lý yêu cầu thanh toán: ${error.message}`);
      }
    });
  },

  /**
   * Lấy yêu cầu thanh toán theo ID
   * @param {String} requestId - ID của yêu cầu thanh toán
   * @returns {Object} Yêu cầu thanh toán
   */
  async getById(requestId) {
    try {
      if (!requestId) {
        throw new Error("Thiếu thông tin bắt buộc: requestId");
      }

      const request = await ParentPaymentRequest.findById(requestId)
        .populate("parentId", "userId")
        .populate({
          path: "parentId",
          populate: { path: "userId", select: "name email phoneNumber" },
        })
        .populate("studentId", "userId")
        .populate({
          path: "studentId",
          populate: { path: "userId", select: "name email" },
        })
        .populate("paymentId", "month year amountDue amountPaid classId")
        .populate({
          path: "paymentId",
          populate: { path: "classId", select: "className grade" },
        });

      if (!request) {
        throw new Error("Không tìm thấy yêu cầu thanh toán");
      }

      return request;
    } catch (error) {
      throw new Error(`Lỗi khi lấy yêu cầu thanh toán: ${error.message}`);
    }
  },
};

module.exports = parentPaymentRequestService;
