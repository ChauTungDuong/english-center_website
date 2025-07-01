const teacherWageService = require("../services/TeacherWageService");

const teacherWageController = {
  // ========== UNIFIED STATISTICS & LISTING API ==========

  /**
   * API: Admin xem danh sách lương + thống kê với filter linh hoạt
   * Query params:
   * - month, year: Filter by specific month/year (optional)
   * - teacherId: Filter by specific teacher (optional, if not provided returns all teachers)
   * - paymentStatus: 'unpaid'/'partial'/'full' - comprehensive payment status filter (optional)
   * - includeList: 'false' to exclude wage records list (default: true - includes list)
   * - includeStats: 'false' to exclude statistics (default: true - includes stats)
   * - page, limit, sort: Pagination & sorting
   */
  async getUnifiedWageStatistics(req, res) {
    try {
      const {
        month,
        year,
        teacherId, // Nếu không truyền thì lấy tất cả giáo viên
        paymentStatus, // 'unpaid', 'partial', 'full'
        page,
        limit,
        sort,
        includeList, // Mặc định true, chỉ false khi truyền "false"
        includeStats, // Mặc định true, chỉ false khi truyền "false"
      } = req.query;

      const response = {
        msg: "Lấy thông tin lương giáo viên thành công",
      };

      // Mặc định hiển thị danh sách wages trừ khi includeList = "false"
      const shouldIncludeList = includeList !== "false";
      if (shouldIncludeList) {
        const wageList = await teacherWageService.getAllWageRecords(
          {
            teacherId, // Có thể undefined - service sẽ xử lý
            month,
            year,
            paymentStatus,
          },
          {
            page: parseInt(page) || 1,
            limit: parseInt(limit) || 10,
            sort,
          }
        );

        response.data = wageList.wages;
        response.pagination = wageList.pagination;
      }

      // Mặc định hiển thị statistics trừ khi includeStats = "false"
      const shouldIncludeStats = includeStats !== "false";
      if (shouldIncludeStats) {
        const statistics = await teacherWageService.getWageStatisticsOnly({
          month,
          year,
          teacherId, // Có thể undefined - service sẽ xử lý
          paymentStatus,
        });

        response.statistics = statistics;
      }

      return res.status(200).json(response);
    } catch (error) {
      return res.status(500).json({
        msg: "Lỗi khi lấy thông tin lương giáo viên",
        error: error.message,
      });
    }
  },

  // ========== INDIVIDUAL WAGE RECORD MANAGEMENT ==========
  async getWageDetail(req, res) {
    try {
      const { teacherWageId } = req.params;

      const wage = await teacherWageService.getWageById(teacherWageId);

      return res.status(200).json({
        msg: "Lấy chi tiết wage record thành công",
        data: wage,
      });
    } catch (error) {
      return res.status(500).json({
        msg: "Lỗi khi lấy chi tiết wage record",
        error: error.message,
      });
    }
  },

  // API: Admin xử lý thanh toán lương cho 1 wage record (PATCH)
  async processWagePayment(req, res) {
    try {
      const { teacherWageId } = req.params;
      const { paidAmount } = req.body;

      // Validation cho PATCH - chỉ validate các field có trong model
      const updateData = {};

      if (paidAmount !== undefined) {
        if (paidAmount <= 0) {
          return res.status(400).json({
            msg: "Số tiền thanh toán phải lớn hơn 0",
          });
        }
        updateData.paidAmount = parseFloat(paidAmount);
      }

      // Admin thực hiện thanh toán
      updateData.paidBy = req.user._id;

      const payment = await teacherWageService.processWagePayment({
        teacherWageId,
        ...updateData,
      });

      return res.status(200).json({
        msg: "Cập nhật thanh toán lương thành công",
        data: payment,
      });
    } catch (error) {
      return res.status(500).json({
        msg: "Lỗi khi xử lý thanh toán lương",
        error: error.message,
      });
    }
  },

  // ========== TEACHER SELF-ACCESS ==========

  // API: Teacher xem lương của mình (cả đã trả và chưa trả)
  async getTeacherWagesByTeacher(req, res) {
    try {
      const { teacherId } = req.params;
      const { month, year, paymentStatus, page, limit } = req.query;

      // Kiểm tra quyền truy cập
      if (
        req.user.role === "Teacher" &&
        req.user._id.toString() !== teacherId
      ) {
        return res.status(403).json({
          msg: "Bạn chỉ có thể xem lương của chính mình",
        });
      }

      const result = await teacherWageService.getAllWageRecords(
        {
          teacherId,
          month,
          year,
          paymentStatus, // Teacher có thể filter theo paymentStatus
        },
        {
          page: parseInt(page) || 1,
          limit: parseInt(limit) || 10,
          sort: JSON.stringify({ year: -1, month: -1 }),
        }
      );

      // Thống kê tổng lương
      const summary = await teacherWageService.getTeacherWageSummary(teacherId);

      return res.status(200).json({
        msg: "Lấy lương giáo viên thành công",
        data: result.wages,
        pagination: result.pagination,
        summary, // Tổng lương đã nhận, chưa nhận
      });
    } catch (error) {
      return res.status(500).json({
        msg: "Lỗi khi lấy lương giáo viên",
        error: error.message,
      });
    }
  },

  // ========== ADMIN CRUD OPERATIONS ==========

  // Admin cập nhật TeacherWage record
  async updateWageRecord(req, res) {
    try {
      const { teacherWageId } = req.params;
      const updateData = req.body;

      const updatedWage = await teacherWageService.updateWageRecord(
        teacherWageId,
        updateData
      );

      return res.status(200).json({
        msg: "Cập nhật wage record thành công",
        data: updatedWage,
      });
    } catch (error) {
      return res.status(500).json({
        msg: "Lỗi khi cập nhật wage record",
        error: error.message,
      });
    }
  },

  // Admin xóa TeacherWage record
  async deleteWageRecord(req, res) {
    try {
      const { teacherWageId } = req.params;

      const result = await teacherWageService.deleteWageRecord(teacherWageId);

      return res.status(200).json({
        msg: result.message,
        data: result.deletedWage,
      });
    } catch (error) {
      return res.status(500).json({
        msg: "Lỗi khi xóa wage record",
        error: error.message,
      });
    }
  },

  // ========== AUTOMATIC WAGE CALCULATION ==========

  /**
   * API: Tính lương tự động cho tất cả giáo viên trong tháng/năm
   * @param {Object} req.body - { month, year }
   */
  async calculateMonthlyWages(req, res) {
    try {
      const month = req.body.month ? req.body.month : new Date().getMonth() + 1;
      const year = req.body.year ? req.body.year : new Date().getFullYear();

      if (month < 1 || month > 12) {
        return res.status(400).json({
          msg: "Tháng phải nằm trong khoảng 1-12",
        });
      }

      if (year > new Date().getFullYear() + 1) {
        return res.status(400).json({
          msg: "Năm không hợp lệ",
        });
      }

      const result =
        await teacherWageService.calculateMonthlyWagesForAllTeachers({
          month: parseInt(month),
          year: parseInt(year),
          calculatedBy: req.user._id, // Admin thực hiện
        });

      return res.status(200).json({
        msg: "Tính lương tự động thành công",
        data: result,
      });
    } catch (error) {
      return res.status(500).json({
        msg: "Lỗi khi tính lương tự động",
        error: error.message,
      });
    }
  },

  // ========== TEACHER SELF-ACCESS ==========

  // API: Admin xem thống kê outstanding payments
  async getOutstandingPayments(req, res) {
    try {
      const { month, year, teacherId, includeStats } = req.query;

      const response = {
        msg: "Lấy thông tin outstanding payments thành công",
      };

      // Lấy danh sách wage records có outstanding amount
      const outstandingWages = await teacherWageService.getAllWageRecords(
        {
          teacherId,
          month,
          year,
          // Custom filter để chỉ lấy records có outstanding
        },
        {
          page: parseInt(req.query.page) || 1,
          limit: parseInt(req.query.limit) || 10,
          sort: JSON.stringify({ year: -1, month: -1 }),
        }
      );

      // Filter chỉ những records có outstanding amount > 0
      const filteredWages = outstandingWages.wages.filter((wage) => {
        const outstanding = wage.calculatedAmount - wage.amount;
        return outstanding > 0;
      });

      response.data = filteredWages;
      response.pagination = {
        ...outstandingWages.pagination,
        totalItems: filteredWages.length,
      };

      // Thống kê nếu được yêu cầu
      if (includeStats !== "false") {
        const stats = await teacherWageService.getOutstandingPaymentStats({
          month,
          year,
          teacherId,
        });
        response.statistics = stats;
      }

      return res.status(200).json(response);
    } catch (error) {
      return res.status(500).json({
        msg: "Lỗi khi lấy outstanding payments",
        error: error.message,
      });
    }
  },
};

module.exports = teacherWageController;
