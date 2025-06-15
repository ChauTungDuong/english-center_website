const { Payment, TeacherWage, Student } = require("../models");
const getFinancialStatistics = async (req, res) => {
  try {
    const { month, year } = req.query;

    // Thống kê học phí đã thu
    const paymentFilter = {};
    if (month) paymentFilter.month = parseInt(month);
    if (year) paymentFilter.year = parseInt(year);

    const payments = await Payment.find(paymentFilter);

    let totalReceived = 0;
    let totalExpected = 0;

    payments.forEach((payment) => {
      totalReceived += payment.amountPaid;
      totalExpected += payment.amountDue;
    });

    // Thống kê lương đã trả
    const wageFilter = {};
    if (month) wageFilter.month = parseInt(month);
    if (year) wageFilter.year = parseInt(year);

    const wages = await TeacherWage.find(wageFilter);
    let totalWage = 0;

    wages.forEach((wage) => {
      totalWage += wage.amount;
    });

    return res.status(200).json({
      msg: "Lấy thống kê tài chính thành công",
      data: {
        income: {
          expected: totalExpected,
          received: totalReceived,
          pending: totalExpected - totalReceived,
        },
        expense: {
          wage: totalWage,
        },
        profit: totalReceived - totalWage,
      },
    });
  } catch (error) {
    return res.status(500).json({
      msg: "Lỗi khi lấy thống kê tài chính",
      error: error.message,
    });
  }
};

const getStudentStatistics = async (req, res) => {
  try {
    const { year } = req.query;

    // Thống kê số lượng học sinh theo từng tháng
    const stats = [];

    for (let month = 1; month <= 12; month++) {
      const studentCount = await Student.countDocuments({
        createdAt: {
          $gte: new Date(`${year}-${month}-01`),
          $lt: new Date(`${year}-${month + 1 > 12 ? 1 : month + 1}-01`),
        },
      });

      stats.push({
        month,
        year: parseInt(year),
        studentCount,
      });
    }

    return res.status(200).json({
      msg: "Lấy thống kê học sinh thành công",
      data: stats,
    });
  } catch (error) {
    return res.status(500).json({
      msg: "Lỗi khi lấy thống kê học sinh",
      error: error.message,
    });
  }
};

module.exports = {
  getFinancialStatistics,
  getStudentStatistics,
};
