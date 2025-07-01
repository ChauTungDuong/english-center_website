const { TeacherWage, Teacher, Class, Attendance } = require("../models");
const mongoose = require("mongoose");
const withTransaction = require("../utils/session");

const teacherWageService = {
  // Lấy lương theo giáo viên và khoảng thời gian
  async getTeacherWages(teacherId, filters = {}) {
    const { month, year, classId } = filters;

    const filter = { teacherId };
    if (month) filter.month = parseInt(month);
    if (year) filter.year = parseInt(year);
    if (classId) filter.classId = classId;

    const wages = await TeacherWage.find(filter)
      .populate({
        path: "teacherId",
        populate: {
          path: "userId",
          select: "name email phoneNumber",
        },
      })
      .populate("classId", "className grade")
      .sort({ year: -1, month: -1 });

    return wages;
  },

  // API: Thống kê chi tiết lương giáo viên
  async getWageStatistics(filters = {}) {
    const { month, year, teacherId } = filters;

    const matchFilter = {};
    if (month) matchFilter.month = parseInt(month);
    if (year) matchFilter.year = parseInt(year);
    if (teacherId) matchFilter.teacherId = teacherId;

    // Tổng quan
    const overview = await TeacherWage.aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: null,
          totalWages: { $sum: "$amount" },
          paidWages: {
            $sum: {
              $cond: [{ $ne: ["$paymentStatus", "unpaid"] }, "$amount", 0],
            },
          },
          unpaidWages: {
            $sum: {
              $cond: [{ $eq: ["$paymentStatus", "unpaid"] }, "$amount", 0],
            },
          },
          fullPaidWages: {
            $sum: {
              $cond: [{ $eq: ["$paymentStatus", "full"] }, "$amount", 0],
            },
          },
          partialPaidWages: {
            $sum: {
              $cond: [{ $eq: ["$paymentStatus", "partial"] }, "$amount", 0],
            },
          },
          totalLessons: { $sum: "$lessonTaught" },
          totalRecords: { $sum: 1 },
          paidRecords: {
            $sum: { $cond: [{ $ne: ["$paymentStatus", "unpaid"] }, 1, 0] },
          },
          unpaidRecords: {
            $sum: { $cond: [{ $eq: ["$paymentStatus", "unpaid"] }, 1, 0] },
          },
          fullPaidRecords: {
            $sum: { $cond: [{ $eq: ["$paymentStatus", "full"] }, 1, 0] },
          },
          partialPaidRecords: {
            $sum: { $cond: [{ $eq: ["$paymentStatus", "partial"] }, 1, 0] },
          },
        },
      },
      {
        $project: {
          _id: 0,
          totalWages: 1,
          paidWages: 1,
          unpaidWages: 1,
          fullPaidWages: 1,
          partialPaidWages: 1,
          totalLessons: 1,
          totalRecords: 1,
          paidRecords: 1,
          unpaidRecords: 1,
          fullPaidRecords: 1,
          partialPaidRecords: 1,
        },
      },
    ]);

    // Thống kê theo giáo viên
    const byTeacher = await TeacherWage.aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: "$teacherId",
          totalWages: { $sum: "$amount" },
          paidWages: {
            $sum: {
              $cond: [{ $ne: ["$paymentStatus", "unpaid"] }, "$amount", 0],
            },
          },
          unpaidWages: {
            $sum: {
              $cond: [{ $eq: ["$paymentStatus", "unpaid"] }, "$amount", 0],
            },
          },
          fullPaidWages: {
            $sum: {
              $cond: [{ $eq: ["$paymentStatus", "full"] }, "$amount", 0],
            },
          },
          partialPaidWages: {
            $sum: {
              $cond: [{ $eq: ["$paymentStatus", "partial"] }, "$amount", 0],
            },
          },
          totalLessons: { $sum: "$lessonTaught" },
          records: { $sum: 1 },
        },
      },
      {
        $lookup: {
          from: "teachers",
          localField: "_id",
          foreignField: "_id",
          as: "teacher",
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "teacher.userId",
          foreignField: "_id",
          as: "user",
        },
      },
      {
        $project: {
          totalWages: 1,
          paidWages: 1,
          unpaidWages: 1,
          fullPaidWages: 1,
          partialPaidWages: 1,
          totalLessons: 1,
          records: 1,
          teacherName: { $arrayElemAt: ["$user.name", 0] },
          teacherEmail: { $arrayElemAt: ["$user.email", 0] },
        },
      },
      { $sort: { unpaidWages: -1 } },
    ]);

    // Thống kê theo tháng
    const byMonth = await TeacherWage.aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: { month: "$month", year: "$year" },
          totalWages: { $sum: "$amount" },
          paidWages: {
            $sum: {
              $cond: [{ $ne: ["$paymentStatus", "unpaid"] }, "$amount", 0],
            },
          },
          unpaidWages: {
            $sum: {
              $cond: [{ $eq: ["$paymentStatus", "unpaid"] }, "$amount", 0],
            },
          },
          totalLessons: { $sum: "$lessonTaught" },
          records: { $sum: 1 },
        },
      },
      { $sort: { "_id.year": -1, "_id.month": -1 } },
    ]);

    return {
      overview: overview[0] || {
        totalWages: 0,
        paidWages: 0,
        unpaidWages: 0,
        fullPaidWages: 0,
        partialPaidWages: 0,
        totalLessons: 0,
        totalRecords: 0,
        paidRecords: 0,
        unpaidRecords: 0,
        fullPaidRecords: 0,
        partialPaidRecords: 0,
      },
      byTeacher,
      byMonth,
      filters,
    };
  },

  // API: Tạo thanh toán lương cho giáo viên
  async createWagePayment(paymentData) {
    return await withTransaction(async (session) => {
      try {
        const { teacherId, month, year, amount, paidBy } = paymentData;

        // Tìm tất cả wage records chưa thanh toán cho teacher/month/year
        const unpaidWages = await TeacherWage.find({
          teacherId,
          month,
          year,
          paymentStatus: "unpaid",
        }).session(session);

        if (unpaidWages.length === 0) {
          throw new Error("Không tìm thấy lương chưa thanh toán để xử lý");
        }

        // Cập nhật tất cả records thành đã thanh toán
        const updateResult = await TeacherWage.updateMany(
          {
            teacherId,
            month,
            year,
            paymentStatus: "unpaid",
          },
          {
            $set: {
              paymentStatus: "full",
              paymentDate: new Date(),
              paidBy,
            },
          },
          { session }
        );

        // Lấy lại data đã cập nhật
        const updatedWages = await TeacherWage.find({
          teacherId,
          month,
          year,
          paymentStatus: "full",
          paidBy,
        })
          .populate({
            path: "teacherId",
            populate: {
              path: "userId",
              select: "name email phoneNumber",
            },
          })
          .populate("classId", "className grade")
          .populate("paidBy", "name email")
          .session(session);

        return {
          message: `Thanh toán lương thành công cho ${updatedWages.length} bản ghi`,
          totalAmount: updatedWages.reduce((sum, wage) => sum + wage.amount, 0),
          updatedRecords: updateResult.modifiedCount,
          wages: updatedWages,
        };
      } catch (error) {
        throw new Error(`Lỗi khi tạo thanh toán lương: ${error.message}`);
      }
    });
  },

  // API: Lấy danh sách lương chưa thanh toán
  async getUnpaidWages(filters = {}) {
    const { month, year, teacherId } = filters;

    const matchFilter = { paymentStatus: "unpaid" };
    if (month) matchFilter.month = parseInt(month);
    if (year) matchFilter.year = parseInt(year);
    if (teacherId) matchFilter.teacherId = teacherId;

    const unpaidWages = await TeacherWage.find(matchFilter)
      .populate({
        path: "teacherId",
        populate: {
          path: "userId",
          select: "name email phoneNumber",
        },
      })
      .populate("classId", "className grade")
      .sort({ year: -1, month: -1, createdAt: -1 });

    // Group by teacher for easier processing
    const groupedByTeacher = {};
    let totalUnpaid = 0;

    unpaidWages.forEach((wage) => {
      const teacherId = wage.teacherId._id.toString();
      const teacherName = wage.teacherId.userId?.name || "Unknown";

      if (!groupedByTeacher[teacherId]) {
        groupedByTeacher[teacherId] = {
          teacherId,
          teacherName,
          teacherEmail: wage.teacherId.userId?.email || "",
          wages: [],
          totalAmount: 0,
          totalLessons: 0,
        };
      }

      groupedByTeacher[teacherId].wages.push(wage);
      groupedByTeacher[teacherId].totalAmount += wage.amount;
      groupedByTeacher[teacherId].totalLessons += wage.lessonTaught;
      totalUnpaid += wage.amount;
    });

    return {
      unpaidWages,
      groupedByTeacher: Object.values(groupedByTeacher),
      summary: {
        totalUnpaidAmount: totalUnpaid,
        totalUnpaidRecords: unpaidWages.length,
        teachersWithUnpaid: Object.keys(groupedByTeacher).length,
      },
    };
  },

  // CRUD Operations for Admin

  // ========== ADMIN CRUD OPERATIONS ==========

  /**
   * Admin cập nhật TeacherWage record
   * Chỉ cho phép cập nhật: amount, lessonTaught, paymentDate, paidBy
   * Các trường khác (paymentStatus, remainingAmount, calculatedAmount) được tự động tính
   * @param {String} wageId - ID của wage record
   * @param {Object} updateData - Dữ liệu cập nhật
   * @param {Number} [updateData.amount] - Số tiền đã thanh toán
   * @param {Number} [updateData.lessonTaught] - Số buổi dạy (sẽ tự động tính lại calculatedAmount)
   * @param {Date} [updateData.paymentDate] - Ngày thanh toán
   * @param {String} [updateData.paidBy] - ID admin thực hiện thanh toán
   * @returns {Object} TeacherWage record đã cập nhật
   */
  async updateWageRecord(wageId, updateData) {
    try {
      const wage = await TeacherWage.findById(wageId);
      if (!wage) {
        throw new Error("Không tìm thấy wage record");
      }

      // Cho phép cập nhật: amount, lessonTaught, paymentDate
      // Các trường khác (paymentStatus, remainingAmount, calculatedAmount) được tự động tính
      const allowedFields = [
        "amount",
        "lessonTaught",
        "paymentDate",
        "paidBy", // Admin có thể set người thanh toán
      ];
      const updateFields = {};

      allowedFields.forEach((field) => {
        if (updateData[field] !== undefined) {
          updateFields[field] = updateData[field];
        }
      });

      // Nếu cập nhật lessonTaught, tính lại calculatedAmount tự động
      if (updateData.lessonTaught !== undefined) {
        const teacher = await Teacher.findById(wage.teacherId);
        updateFields.calculatedAmount =
          updateData.lessonTaught * teacher.wagePerLesson;
      }

      // Cập nhật các fields vào wage object
      Object.keys(updateFields).forEach((field) => {
        wage[field] = updateFields[field];
      });

      // Sử dụng save() để trigger pre-save middleware
      await wage.save();

      // Populate và trả về
      const updatedWage = await TeacherWage.findById(wageId)
        .populate({
          path: "teacherId",
          populate: { path: "userId", select: "name email" },
        })
        .populate("classId", "className grade")
        .populate("paidBy", "name email");

      return updatedWage;
    } catch (error) {
      throw new Error(`Lỗi khi cập nhật wage record: ${error.message}`);
    }
  },

  /**
   * Admin xóa TeacherWage record
   * @param {String} wageId - ID của wage record
   * @returns {Object} Kết quả xóa
   */
  async deleteWageRecord(wageId) {
    try {
      const wage = await TeacherWage.findById(wageId);
      if (!wage) {
        throw new Error("Không tìm thấy wage record");
      }

      // Không cho phép xóa nếu đã thanh toán
      if (wage.paymentStatus !== "unpaid") {
        throw new Error("Không thể xóa wage record đã có thanh toán");
      }

      await TeacherWage.findByIdAndDelete(wageId);

      return {
        success: true,
        message: "Xóa wage record thành công",
        deletedWage: wage,
      };
    } catch (error) {
      throw new Error(`Lỗi khi xóa wage record: ${error.message}`);
    }
  },

  /**
   * Admin lấy tất cả TeacherWage với filter và pagination
   * @param {Object} filters - Bộ lọc
   * @param {Object} options - Tùy chọn pagination
   * @returns {Object} Danh sách wage records với pagination
   */
  async getAllWageRecords(filters = {}, options = {}) {
    try {
      const {
        teacherId,
        classId,
        month,
        year,
        paymentStatus, // Chỉ giữ paymentStatus
        startMonth,
        endMonth,
        startYear,
        endYear,
      } = filters;

      const { page = 1, limit = 10, sort } = options;

      // Build filter
      const filter = {};
      if (teacherId) filter.teacherId = teacherId;
      if (classId) filter.classId = classId;
      if (month) filter.month = parseInt(month);
      if (year) filter.year = parseInt(year);
      if (paymentStatus) filter.paymentStatus = paymentStatus;

      // Date range filter (existing logic)
      if (startYear || endYear || startMonth || endMonth) {
        const dateFilter = {};
        if (startYear) {
          dateFilter.$gte = parseInt(startYear);
          if (startMonth) {
            filter.$or = [
              { year: { $gt: parseInt(startYear) } },
              {
                year: parseInt(startYear),
                month: { $gte: parseInt(startMonth) },
              },
            ];
          } else {
            filter.year = { $gte: parseInt(startYear) };
          }
        }
        if (endYear) {
          if (!filter.$or) {
            if (endMonth) {
              filter.$and = [
                filter.$and || {},
                {
                  $or: [
                    { year: { $lt: parseInt(endYear) } },
                    {
                      year: parseInt(endYear),
                      month: { $lte: parseInt(endMonth) },
                    },
                  ],
                },
              ];
            } else {
              filter.year = { ...filter.year, $lte: parseInt(endYear) };
            }
          }
        }
      }

      const skip = (page - 1) * limit;

      const wages = await TeacherWage.find(filter)
        .populate({
          path: "teacherId",
          populate: { path: "userId", select: "name email phoneNumber" },
        })
        .populate("classId", "className grade")
        .populate("paidBy", "name email")
        .sort(sort ? JSON.parse(sort) : { year: -1, month: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit);

      const total = await TeacherWage.countDocuments(filter);

      return {
        wages,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          totalItems: total,
          itemsPerPage: limit,
          hasNext: page < Math.ceil(total / limit),
          hasPrev: page > 1,
        },
      };
    } catch (error) {
      throw new Error(`Lỗi khi lấy danh sách wage records: ${error.message}`);
    }
  },

  // Specific methods for new workflow

  /**
   * Lấy chi tiết 1 wage record theo ID
   * @param {String} wageId - ID của wage record
   * @returns {Object} Chi tiết wage record
   */
  async getWageById(wageId) {
    try {
      const wage = await TeacherWage.findById(wageId)
        .populate({
          path: "teacherId",
          populate: { path: "userId", select: "name email phoneNumber" },
        })
        .populate("classId", "className grade")
        .populate("paidBy", "name email");

      if (!wage) {
        throw new Error("Không tìm thấy wage record");
      }

      return wage;
    } catch (error) {
      throw new Error(`Lỗi khi lấy chi tiết wage: ${error.message}`);
    }
  },

  /**
   * Xử lý thanh toán lương cho 1 wage record cụ thể (hỗ trợ thanh toán nhiều lần)
   * @param {Object} paymentData - Dữ liệu thanh toán
   * @returns {Object} Wage record đã được cập nhật
   */
  async processWagePayment(paymentData) {
    try {
      const { teacherWageId, paidAmount, paidBy } = paymentData;

      const wage = await TeacherWage.findById(teacherWageId);
      if (!wage) {
        throw new Error("Không tìm thấy wage record");
      }

      if (wage.paymentStatus === "full") {
        throw new Error("Wage record này đã được thanh toán đủ");
      }

      // Kiểm tra số tiền thanh toán hợp lệ
      const maxPayableAmount = wage.remainingAmount;
      if (paidAmount > maxPayableAmount) {
        throw new Error(
          `Số tiền thanh toán không được vượt quá ${maxPayableAmount.toLocaleString()} VND (số tiền còn thiếu)`
        );
      }

      // Cộng dồn số tiền đã thanh toán
      wage.amount += paidAmount;
      wage.paymentDate = new Date();
      wage.paidBy = paidBy;

      // remainingAmount và isFullyPaid sẽ được tự động tính trong pre-save middleware

      await wage.save();

      // Trả về wage đã populate
      return await this.getWageById(teacherWageId);
    } catch (error) {
      throw new Error(`Lỗi khi xử lý thanh toán lương: ${error.message}`);
    }
  },

  /**
   * Lấy tổng quan lương của 1 teacher (cho teacher xem)
   * @param {String} teacherId - ID của teacher
   * @returns {Object} Tổng quan lương
   */
  async getTeacherWageSummary(teacherId) {
    try {
      const summary = await TeacherWage.aggregate([
        { $match: { teacherId: new mongoose.Types.ObjectId(teacherId) } },
        {
          $group: {
            _id: null,
            totalWages: { $sum: 1 },
            paidWages: {
              $sum: { $cond: [{ $ne: ["$paymentStatus", "unpaid"] }, 1, 0] },
            },
            unpaidWages: {
              $sum: { $cond: [{ $eq: ["$paymentStatus", "unpaid"] }, 1, 0] },
            },
            fullPaidWages: {
              $sum: { $cond: [{ $eq: ["$paymentStatus", "full"] }, 1, 0] },
            },
            partialPaidWages: {
              $sum: { $cond: [{ $eq: ["$paymentStatus", "partial"] }, 1, 0] },
            },
            totalPaidAmount: {
              $sum: {
                $cond: [{ $ne: ["$paymentStatus", "unpaid"] }, "$amount", 0],
              },
            },
            totalUnpaidAmount: {
              $sum: {
                $cond: [{ $eq: ["$paymentStatus", "unpaid"] }, "$amount", 0],
              },
            },
            totalCalculatedAmount: { $sum: "$calculatedAmount" },
            totalRemainingAmount: { $sum: "$remainingAmount" },
          },
        },
      ]);

      return (
        summary[0] || {
          totalWages: 0,
          paidWages: 0,
          unpaidWages: 0,
          fullPaidWages: 0,
          partialPaidWages: 0,
          totalPaidAmount: 0,
          totalUnpaidAmount: 0,
          totalCalculatedAmount: 0,
          totalRemainingAmount: 0,
        }
      );
    } catch (error) {
      throw new Error(`Lỗi khi lấy tổng quan lương: ${error.message}`);
    }
  },

  /**
   * Lấy chỉ thống kê lương (không bao gồm danh sách records)
   * @param {Object} filters - Bộ lọc
   * @returns {Object} Statistics object
   */
  async getWageStatisticsOnly(filters = {}) {
    try {
      const { month, year, teacherId, paymentStatus } = filters;

      // Build filter
      const matchFilter = {};
      if (teacherId)
        matchFilter.teacherId = new mongoose.Types.ObjectId(teacherId);
      if (month) matchFilter.month = parseInt(month);
      if (year) matchFilter.year = parseInt(year);
      if (paymentStatus) matchFilter.paymentStatus = paymentStatus;

      const stats = await TeacherWage.aggregate([
        { $match: matchFilter },
        {
          $group: {
            _id: null,
            totalRecords: { $sum: 1 },
            paidRecords: {
              $sum: { $cond: [{ $ne: ["$paymentStatus", "unpaid"] }, 1, 0] },
            },
            unpaidRecords: {
              $sum: { $cond: [{ $eq: ["$paymentStatus", "unpaid"] }, 1, 0] },
            },
            fullPaidRecords: {
              $sum: { $cond: [{ $eq: ["$paymentStatus", "full"] }, 1, 0] },
            },
            partialPaidRecords: {
              $sum: { $cond: [{ $eq: ["$paymentStatus", "partial"] }, 1, 0] },
            },
            totalAmount: { $sum: "$amount" },
            paidAmount: {
              $sum: {
                $cond: [{ $ne: ["$paymentStatus", "unpaid"] }, "$amount", 0],
              },
            },
            unpaidAmount: {
              $sum: {
                $cond: [{ $eq: ["$paymentStatus", "unpaid"] }, "$amount", 0],
              },
            },
            fullPaidAmount: {
              $sum: {
                $cond: [{ $eq: ["$paymentStatus", "full"] }, "$amount", 0],
              },
            },
            partialPaidAmount: {
              $sum: {
                $cond: [{ $eq: ["$paymentStatus", "partial"] }, "$amount", 0],
              },
            },
            totalLessonsTaught: { $sum: "$lessonTaught" },
            totalCalculatedAmount: { $sum: "$calculatedAmount" },
            totalRemainingAmount: { $sum: "$remainingAmount" },
          },
        },
        {
          $project: {
            _id: 0,
            totalRecords: 1,
            paidRecords: 1,
            unpaidRecords: 1,
            fullPaidRecords: 1,
            partialPaidRecords: 1,
            totalAmount: 1,
            paidAmount: 1,
            unpaidAmount: 1,
            fullPaidAmount: 1,
            partialPaidAmount: 1,
            totalLessonsTaught: 1,
            totalCalculatedAmount: 1,
            totalRemainingAmount: 1,
          },
        },
      ]);

      const result = stats[0] || {
        totalRecords: 0,
        paidRecords: 0,
        unpaidRecords: 0,
        fullPaidRecords: 0,
        partialPaidRecords: 0,
        totalAmount: 0,
        paidAmount: 0,
        unpaidAmount: 0,
        fullPaidAmount: 0,
        partialPaidAmount: 0,
        totalLessonsTaught: 0,
        totalCalculatedAmount: 0,
        totalRemainingAmount: 0,
      };

      return {
        summary: result,
        filters: {
          month: month ? parseInt(month) : null,
          year: year ? parseInt(year) : null,
          teacherId: teacherId || null,
          paymentStatus: paymentStatus || null,
        },
      };
    } catch (error) {
      throw new Error(`Lỗi khi lấy thống kê lương: ${error.message}`);
    }
  },

  /**
   * Lấy thống kê chi tiết về outstanding payments
   * @param {Object} filters - Bộ lọc
   * @returns {Object} Outstanding payment statistics
   */
  async getOutstandingPaymentStats(filters = {}) {
    try {
      const { month, year, teacherId } = filters;

      const matchFilter = {};
      if (teacherId)
        matchFilter.teacherId = new mongoose.Types.ObjectId(teacherId);
      if (month) matchFilter.month = parseInt(month);
      if (year) matchFilter.year = parseInt(year);

      const stats = await TeacherWage.aggregate([
        { $match: matchFilter },
        {
          $addFields: {
            outstandingAmount: {
              $max: [0, { $subtract: ["$calculatedAmount", "$amount"] }],
            },
            paymentPercentage: {
              $cond: [
                { $eq: ["$calculatedAmount", 0] },
                0,
                {
                  $multiply: [
                    { $divide: ["$amount", "$calculatedAmount"] },
                    100,
                  ],
                },
              ],
            },
          },
        },
        {
          $group: {
            _id: null,
            totalRecords: { $sum: 1 },
            fullyPaidRecords: {
              $sum: { $cond: [{ $eq: ["$paymentStatus", "full"] }, 1, 0] },
            },
            partiallyPaidRecords: {
              $sum: { $cond: [{ $eq: ["$paymentStatus", "partial"] }, 1, 0] },
            },
            unpaidRecords: {
              $sum: { $cond: [{ $eq: ["$paymentStatus", "unpaid"] }, 1, 0] },
            },
            totalCalculatedAmount: { $sum: "$calculatedAmount" },
            totalPaidAmount: { $sum: "$amount" },
            totalOutstandingAmount: { $sum: "$remainingAmount" },
            averagePaymentPercentage: { $avg: "$paymentPercentage" },
          },
        },
        {
          $project: {
            _id: 0,
            totalRecords: 1,
            fullyPaidRecords: 1,
            partiallyPaidRecords: 1,
            unpaidRecords: 1,
            totalCalculatedAmount: 1,
            totalPaidAmount: 1,
            totalOutstandingAmount: 1,
            averagePaymentPercentage: {
              $round: ["$averagePaymentPercentage", 1],
            },
          },
        },
      ]);

      return (
        stats[0] || {
          totalRecords: 0,
          fullyPaidRecords: 0,
          partiallyPaidRecords: 0,
          unpaidRecords: 0,
          totalCalculatedAmount: 0,
          totalPaidAmount: 0,
          totalOutstandingAmount: 0,
          averagePaymentPercentage: 0,
        }
      );
    } catch (error) {
      throw new Error(`Lỗi khi lấy thống kê outstanding: ${error.message}`);
    }
  },

  /**
   * Tính lương tự động cho tất cả giáo viên trong tháng/năm
   * @param {Object} data - { month, year, calculatedBy }
   * @returns {Object} Kết quả tính lương
   */
  async calculateMonthlyWagesForAllTeachers(data) {
    try {
      const { month, year, calculatedBy } = data;

      // Tìm tất cả attendance records trong tháng/năm
      const attendances = await Attendance.find({
        date: {
          $gte: new Date(year, month - 1, 1),
          $lt: new Date(year, month, 1),
        },
      }).populate({
        path: "classId",
        populate: {
          path: "teacherId",
          populate: {
            path: "userId",
            select: "name email",
          },
        },
      });

      // Group attendance by teacher và class
      const teacherClassMap = {};

      attendances.forEach((attendance) => {
        // Kiểm tra dữ liệu hợp lệ
        if (!attendance.classId || !attendance.classId.teacherId) {
          console.warn(
            `Attendance ${attendance._id} missing classId or teacherId`
          );
          return;
        }

        const teacherId = attendance.classId.teacherId._id.toString();
        const classId = attendance.classId._id.toString();

        if (!teacherClassMap[teacherId]) {
          teacherClassMap[teacherId] = {
            teacher: attendance.classId.teacherId,
            classes: {},
          };
        }

        if (!teacherClassMap[teacherId].classes[classId]) {
          teacherClassMap[teacherId].classes[classId] = {
            class: attendance.classId,
            lessonCount: 0,
          };
        }

        teacherClassMap[teacherId].classes[classId].lessonCount++;
      });

      const results = [];
      const errors = [];

      // Tạo wage records cho từng teacher-class
      for (const teacherId in teacherClassMap) {
        const teacherData = teacherClassMap[teacherId];

        for (const classId in teacherData.classes) {
          const classData = teacherData.classes[classId];

          try {
            // Kiểm tra xem wage record đã tồn tại chưa
            const existingWage = await TeacherWage.findOne({
              teacherId,
              classId,
              month,
              year,
            });

            if (existingWage) {
              // Cập nhật nếu đã tồn tại
              existingWage.lessonTaught = classData.lessonCount;
              existingWage.calculatedAmount =
                classData.lessonCount * teacherData.teacher.wagePerLesson;

              // KHÔNG tự động cập nhật amount - giữ nguyên amount đã thanh toán
              // Pre-save middleware sẽ tự động tính lại paymentStatus và remainingAmount

              await existingWage.save();

              results.push({
                action: "updated",
                teacherId,
                teacherName: teacherData.teacher.userId?.name || "Unknown",
                classId,
                className: classData.class.className,
                lessonTaught: classData.lessonCount,
                calculatedAmount: existingWage.calculatedAmount,
                paymentStatus: existingWage.paymentStatus,
              });
            } else {
              // Tạo mới
              const calculatedAmount =
                classData.lessonCount * teacherData.teacher.wagePerLesson;
              const newWage = new TeacherWage({
                teacherId,
                classId,
                month,
                year,
                lessonTaught: classData.lessonCount,
                calculatedAmount: calculatedAmount,
                amount: 0, // Wage mới tạo chưa được thanh toán
                paymentStatus: "unpaid",
              });

              await newWage.save();

              results.push({
                action: "created",
                teacherId,
                teacherName: teacherData.teacher.userId?.name || "Unknown",
                classId,
                className: classData.class.className,
                lessonTaught: classData.lessonCount,
                calculatedAmount: calculatedAmount,
                paymentStatus: "unpaid",
              });
            }
          } catch (error) {
            errors.push({
              teacherId,
              teacherName: teacherData.teacher.userId?.name || "Unknown",
              classId,
              className: classData.class?.className || "Unknown",
              error: error.message,
            });
          }
        }
      }

      return {
        success: true,
        month,
        year,
        totalProcessed: results.length,
        results,
        errors,
        summary: {
          created: results.filter((r) => r.action === "created").length,
          updated: results.filter((r) => r.action === "updated").length,
          failed: errors.length,
        },
      };
    } catch (error) {
      throw new Error(`Lỗi khi tính lương tự động: ${error.message}`);
    }
  },
};

module.exports = teacherWageService;
