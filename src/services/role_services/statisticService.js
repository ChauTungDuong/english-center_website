const {
  Payment,
  TeacherWage,
  Student,
  Class,
  Teacher,
  Attendance,
} = require("../../models");

const statisticService = {
  /**
   * API thống kê tổng hợp duy nhất cho Admin
   * Bao gồm:
   * - Số tiền đã trả cho giáo viên
   * - Số tiền học sinh đóng (dự kiến dựa theo số buổi học)
   * - Số tiền đã thu của học sinh (thực tế đã nộp)
   * - Thống kê học sinh tăng giảm theo tháng
   * Tự động phát hiện loại thống kê dựa trên tham số:
   * - month + year: thống kê theo tháng
   * - chỉ year: thống kê theo năm
   * - startDate + endDate: thống kê theo khoảng thời gian
   * - không tham số: thống kê tháng hiện tại
   */
  async getAllStatistics(filters = {}) {
    const { month, year, startDate, endDate, classId, teacherId } = filters;

    // Tự động xác định loại thống kê và xây dựng date range
    const { dateRange, periodInfo } = this.buildDateRange({
      month,
      year,
      startDate,
      endDate,
    });

    // 1. Thống kê tiền trả cho giáo viên
    const teacherWageStats = await this.getTeacherWageStatistics(
      dateRange,
      teacherId
    );

    // 2. Thống kê tiền học sinh (dự kiến và thực thu)
    const studentPaymentStats = await this.getStudentPaymentStatistics(
      dateRange,
      classId
    );

    // 3. Thống kê tăng giảm học sinh theo tháng
    const studentGrowthStats = await this.getStudentGrowthStatistics(dateRange);

    // 4. Thống kê tổng quan
    const totalCollected = studentPaymentStats?.summary?.totalCollected || 0;
    const totalPaid = teacherWageStats?.summary?.totalPaid || 0;
    const totalExpected = studentPaymentStats?.summary?.totalExpected || 0;

    const overviewStats = {
      totalProfit: totalCollected - totalPaid,
      profitMargin:
        totalCollected > 0
          ? (((totalCollected - totalPaid) / totalCollected) * 100).toFixed(2)
          : "0.00",
      collectionRate:
        totalExpected > 0
          ? ((totalCollected / totalExpected) * 100).toFixed(2)
          : "0.00",
    };

    return {
      period: periodInfo,
      teacherWages: teacherWageStats,
      studentPayments: studentPaymentStats,
      studentGrowth: studentGrowthStats,
      overview: overviewStats,
      generatedAt: new Date(),
    };
  },

  /**
   * Xây dựng khoảng thời gian và thông tin period dựa trên tham số
   */
  buildDateRange({ month, year, startDate, endDate }) {
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;

    // Tự động phát hiện loại thống kê
    if (startDate && endDate) {
      // Khoảng thời gian tùy chỉnh
      const start = new Date(startDate);
      const end = new Date(endDate);
      return {
        dateRange: { start, end },
        periodInfo: {
          type: "custom",
          range: { start, end },
          description: `Từ ${start.toLocaleDateString(
            "vi-VN"
          )} đến ${end.toLocaleDateString("vi-VN")}`,
          startDate,
          endDate,
        },
      };
    } else if (month && year) {
      // Thống kê theo tháng cụ thể
      const start = new Date(year, month - 1, 1);
      const end = new Date(year, month, 0, 23, 59, 59);
      return {
        dateRange: { start, end },
        periodInfo: {
          type: "month",
          range: { start, end },
          description: `Tháng ${month}/${year}`,
          month,
          year,
        },
      };
    } else if (year && !month) {
      // Thống kê theo năm
      const start = new Date(year, 0, 1);
      const end = new Date(year, 11, 31, 23, 59, 59);
      return {
        dateRange: { start, end },
        periodInfo: {
          type: "year",
          range: { start, end },
          description: `Năm ${year}`,
          year,
        },
      };
    } else {
      // Mặc định: tháng hiện tại
      const targetMonth = month || currentMonth;
      const targetYear = year || currentYear;
      const start = new Date(targetYear, targetMonth - 1, 1);
      const end = new Date(targetYear, targetMonth, 0, 23, 59, 59);
      return {
        dateRange: { start, end },
        periodInfo: {
          type: "month",
          range: { start, end },
          description: `Tháng ${targetMonth}/${targetYear}`,
          month: targetMonth,
          year: targetYear,
        },
      };
    }
  },

  /**
   * Thống kê lương giáo viên đã trả
   */
  async getTeacherWageStatistics(dateRange, teacherId = null) {
    const matchConditions = {
      createdAt: {
        $gte: dateRange.start,
        $lte: dateRange.end,
      },
    };

    if (teacherId) {
      matchConditions.teacherId = teacherId;
    }

    // Aggregate theo paymentStatus
    const wageStatsByStatus = await TeacherWage.aggregate([
      { $match: matchConditions },
      {
        $group: {
          _id: "$paymentStatus",
          totalAmount: { $sum: "$amount" },
          totalCalculated: { $sum: "$calculatedAmount" },
          totalRemaining: { $sum: "$remainingAmount" },
          count: { $sum: 1 },
          totalLessons: { $sum: "$lessonTaught" },
        },
      },
    ]);

    // Aggregate theo tháng
    const monthlyWageStats = await TeacherWage.aggregate([
      { $match: matchConditions },
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" },
          },
          totalPaid: { $sum: "$amount" },
          totalCalculated: { $sum: "$calculatedAmount" },
          totalLessons: { $sum: "$lessonTaught" },
          recordCount: { $sum: 1 },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
    ]);

    // Tính tổng
    const totalStats = wageStatsByStatus.reduce(
      (acc, item) => {
        acc.totalCalculated += item.totalCalculated;
        acc.totalLessons += item.totalLessons;
        acc.recordCount += item.count;

        if (item._id === "full" || item._id === "partial") {
          acc.totalPaid += item.totalAmount;
        }
        if (item._id === "unpaid" || item._id === "partial") {
          acc.totalRemaining += item.totalRemaining;
        }

        return acc;
      },
      {
        totalPaid: 0,
        totalCalculated: 0,
        totalRemaining: 0,
        totalLessons: 0,
        recordCount: 0,
      }
    );

    return {
      summary: {
        totalPaid: totalStats.totalPaid,
        totalCalculated: totalStats.totalCalculated,
        totalRemaining: totalStats.totalRemaining,
        totalLessons: totalStats.totalLessons,
        recordCount: totalStats.recordCount,
        averageWagePerLesson:
          totalStats.totalLessons > 0
            ? (totalStats.totalPaid / totalStats.totalLessons).toFixed(2)
            : 0,
        paymentRate:
          totalStats.totalCalculated > 0
            ? (
                (totalStats.totalPaid / totalStats.totalCalculated) *
                100
              ).toFixed(2)
            : 0,
      },
      byStatus: wageStatsByStatus.reduce((acc, item) => {
        acc[item._id] = {
          amount: item.totalAmount,
          calculated: item.totalCalculated,
          remaining: item.totalRemaining,
          count: item.count,
          lessons: item.totalLessons,
        };
        return acc;
      }, {}),
      monthly: monthlyWageStats.map((item) => ({
        year: item._id.year,
        month: item._id.month,
        totalPaid: item.totalPaid,
        totalCalculated: item.totalCalculated,
        totalLessons: item.totalLessons,
        recordCount: item.recordCount,
      })),
    };
  },

  /**
   * Thống kê tiền học sinh (dự kiến và thực thu)
   */
  async getStudentPaymentStatistics(dateRange, classId = null) {
    const matchConditions = {
      createdAt: {
        $gte: dateRange.start,
        $lte: dateRange.end,
      },
    };

    if (classId) {
      matchConditions.classId = classId;
    }

    // Thống kê payment thực tế
    const paymentStats = await Payment.aggregate([
      { $match: matchConditions },
      {
        $group: {
          _id: null,
          totalExpected: { $sum: "$amountDue" },
          totalCollected: { $sum: "$amountPaid" },
          totalPayments: { $sum: 1 },
          fullyPaidCount: {
            $sum: {
              $cond: [{ $gte: ["$amountPaid", "$amountDue"] }, 1, 0],
            },
          },
        },
      },
    ]);

    // Thống kê theo tháng
    const monthlyPaymentStats = await Payment.aggregate([
      { $match: matchConditions },
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" },
          },
          totalExpected: { $sum: "$amountDue" },
          totalCollected: { $sum: "$amountPaid" },
          paymentCount: { $sum: 1 },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
    ]);

    // Thống kê học sinh có payment trong khoảng thời gian
    const studentStats = await Payment.aggregate([
      { $match: matchConditions },
      {
        $group: {
          _id: "$studentId",
          totalExpected: { $sum: "$amountDue" },
          totalPaid: { $sum: "$amountPaid" },
          paymentCount: { $sum: 1 },
        },
      },
      {
        $group: {
          _id: null,
          totalStudents: { $sum: 1 },
          avgExpectedPerStudent: { $avg: "$totalExpected" },
          avgPaidPerStudent: { $avg: "$totalPaid" },
        },
      },
    ]);

    const paymentData = paymentStats[0] || {
      totalExpected: 0,
      totalCollected: 0,
      totalPayments: 0,
      fullyPaidCount: 0,
    };

    const studentData = studentStats[0] || {
      totalStudents: 0,
      avgExpectedPerStudent: 0,
      avgPaidPerStudent: 0,
    };

    return {
      summary: {
        totalExpected: paymentData.totalExpected,
        totalCollected: paymentData.totalCollected,
        totalRemaining: paymentData.totalExpected - paymentData.totalCollected,
        totalPayments: paymentData.totalPayments,
        fullyPaidCount: paymentData.fullyPaidCount,
        partiallyPaidCount:
          paymentData.totalPayments - paymentData.fullyPaidCount,
        collectionRate:
          paymentData.totalExpected > 0
            ? (
                (paymentData.totalCollected / paymentData.totalExpected) *
                100
              ).toFixed(2)
            : 0,
        avgExpectedPerStudent: studentData.avgExpectedPerStudent.toFixed(2),
        avgCollectedPerStudent: studentData.avgPaidPerStudent.toFixed(2),
        totalStudentsWithPayments: studentData.totalStudents,
      },
      monthly: monthlyPaymentStats.map((item) => ({
        year: item._id.year,
        month: item._id.month,
        totalExpected: item.totalExpected,
        totalCollected: item.totalCollected,
        paymentCount: item.paymentCount,
        collectionRate:
          item.totalExpected > 0
            ? ((item.totalCollected / item.totalExpected) * 100).toFixed(2)
            : 0,
      })),
    };
  },

  /**
   * Thống kê tăng giảm học sinh theo tháng
   */
  async getStudentGrowthStatistics(dateRange) {
    try {
      // Thống kê học sinh mới tham gia theo tháng
      const newStudentsStats = await Student.aggregate([
        {
          $match: {
            createdAt: {
              $gte: dateRange.start,
              $lte: dateRange.end,
            },
          },
        },
        {
          $group: {
            _id: {
              year: { $year: "$createdAt" },
              month: { $month: "$createdAt" },
            },
            newStudents: { $sum: 1 },
          },
        },
        { $sort: { "_id.year": 1, "_id.month": 1 } },
      ]);

      // Logic thông minh để xác định học sinh "inactive":
      // - Học sinh không tham gia class nào (classId array rỗng hoặc không tồn tại)
      const inactiveStudentsFromClasses = await Student.aggregate([
        {
          $match: {
            $or: [
              { classId: { $size: 0 } }, // Array rỗng
              { classId: { $exists: false } }, // Field không tồn tại
              { classId: null }, // Null
            ],
          },
        },
        {
          $group: {
            _id: null,
            count: { $sum: 1 },
          },
        },
      ]);

      // Tính tổng số học sinh hiện tại
      const totalStudents = await Student.countDocuments({});
      const inactiveCount = inactiveStudentsFromClasses[0]?.count || 0;
      const currentActiveStudents = Math.max(0, totalStudents - inactiveCount);
      const currentInactiveStudents = inactiveCount;
      const inactiveStudentsStats = [];

      // Kết hợp dữ liệu theo tháng
      const monthlyGrowth = this.combineMonthlyGrowthData(
        newStudentsStats,
        inactiveStudentsStats,
        dateRange
      );

      return {
        current: {
          activeStudents: currentActiveStudents,
          inactiveStudents: currentInactiveStudents,
          totalStudents: totalStudents,
        },
        periodSummary: {
          totalNewStudents: newStudentsStats.reduce(
            (sum, item) => sum + item.newStudents,
            0
          ),
          totalInactiveStudents: inactiveStudentsStats.reduce(
            (sum, item) => sum + item.inactiveStudents,
            0
          ),
          netGrowth:
            newStudentsStats.reduce((sum, item) => sum + item.newStudents, 0) -
            inactiveStudentsStats.reduce(
              (sum, item) => sum + item.inactiveStudents,
              0
            ),
        },
        monthly: monthlyGrowth,
      };
    } catch (error) {
      console.error("Error in getStudentGrowthStatistics:", error);
      // Return default values if error
      return {
        current: {
          activeStudents: 0,
          inactiveStudents: 0,
          totalStudents: 0,
        },
        periodSummary: {
          totalNewStudents: 0,
          totalInactiveStudents: 0,
          netGrowth: 0,
        },
        monthly: [],
        error: error.message,
      };
    }
  },

  /**
   * Kết hợp dữ liệu tăng giảm học sinh theo tháng
   */
  combineMonthlyGrowthData(newStudentsStats, inactiveStudentsStats, dateRange) {
    const monthlyData = new Map();

    // Tạo danh sách tháng trong khoảng thời gian
    const startDate = new Date(dateRange.start);
    const endDate = new Date(dateRange.end);

    for (
      let date = new Date(startDate);
      date <= endDate;
      date.setMonth(date.getMonth() + 1)
    ) {
      const key = `${date.getFullYear()}-${date.getMonth() + 1}`;
      monthlyData.set(key, {
        year: date.getFullYear(),
        month: date.getMonth() + 1,
        newStudents: 0,
        inactiveStudents: 0,
        netGrowth: 0,
      });
    }

    // Thêm dữ liệu học sinh mới
    newStudentsStats.forEach((item) => {
      const key = `${item._id.year}-${item._id.month}`;
      if (monthlyData.has(key)) {
        monthlyData.get(key).newStudents = item.newStudents;
      }
    });

    // Thêm dữ liệu học sinh nghỉ
    inactiveStudentsStats.forEach((item) => {
      const key = `${item._id.year}-${item._id.month}`;
      if (monthlyData.has(key)) {
        monthlyData.get(key).inactiveStudents = item.inactiveStudents;
      }
    });

    // Tính net growth
    monthlyData.forEach((data) => {
      data.netGrowth = data.newStudents - data.inactiveStudents;
    });

    return Array.from(monthlyData.values()).sort(
      (a, b) => a.year - b.year || a.month - b.month
    );
  },
};

module.exports = statisticService;
