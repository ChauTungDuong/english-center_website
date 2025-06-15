const getParentChildren = async (req, res) => {
  try {
    const parentId = req.params.id;
    const children = await Student.find({ parentId }).populate(
      "userId",
      "name email"
    );

    return res.status(200).json({
      msg: "Lấy danh sách con thành công",
      data: children,
    });
  } catch (error) {
    return res.status(500).json({
      msg: "Lỗi khi lấy danh sách con",
      error: error.message,
    });
  }
};

const getChildPayments = async (req, res) => {
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
};

module.exports = {
  getParentChildren,
  getChildPayments,
};
