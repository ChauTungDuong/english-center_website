const PaymentService = require("../services/PaymentService");
const { catchAsync } = require("../core/middleware");
const { ApiResponse } = require("../core/utils");

const paymentService = new PaymentService();

const paymentController = {
  // Get payment summary and statistics (Admin financial statistics)
  getPaymentSummary: catchAsync(async (req, res) => {
    const { month, year, startDate, endDate } = req.query;
    const filter = { month, year, startDate, endDate };

    const summary = await paymentService.getPaymentSummary(filter);
    ApiResponse.success(res, "Lấy thống kê thanh toán thành công", summary);
  }),

  // Get student payments
  getStudentPayments: catchAsync(async (req, res) => {
    const { studentId } = req.params;
    const { page, limit, status, month, year } = req.query;

    const options = {
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 10,
      status,
      month: month ? parseInt(month) : undefined,
      year: year ? parseInt(year) : undefined,
    };

    const payments = await paymentService.getStudentPayments(
      studentId,
      options
    );
    ApiResponse.success(
      res,
      "Lấy danh sách thanh toán học sinh thành công",
      payments
    );
  }),
};

module.exports = paymentController;
