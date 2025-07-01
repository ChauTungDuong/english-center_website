const statisticService = require("../services/StatisticService");

const statisticController = {
  /**
   * API thống kê tổng hợp duy nhất
   * GET /v1/api/unified-statistics
   *
   * Query parameters (tự động phát hiện loại thống kê):
   * - month + year: thống kê theo tháng cụ thể
   * - chỉ year: thống kê theo năm
   * - startDate + endDate: thống kê theo khoảng thời gian tùy chỉnh
   * - không tham số: thống kê tháng hiện tại
   * - classId: lọc theo lớp học cụ thể
   * - teacherId: lọc theo giáo viên cụ thể
   */
  async getAllStatistics(req, res) {
    try {
      const { month, year, startDate, endDate, classId, teacherId } = req.query;

      // Validate cho custom period
      if ((startDate && !endDate) || (!startDate && endDate)) {
        return res.status(400).json({
          success: false,
          message: "Both startDate and endDate are required for custom period",
        });
      }

      const statistics = await statisticService.getAllStatistics({
        month: month ? parseInt(month) : undefined,
        year: year ? parseInt(year) : undefined,
        startDate,
        endDate,
        classId,
        teacherId,
      });

      return res.status(200).json({
        success: true,
        message: "Lấy thống kê tổng hợp thành công",
        data: statistics,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Lỗi khi lấy thống kê tổng hợp",
        error: error.message,
      });
    }
  },
};

module.exports = statisticController;
