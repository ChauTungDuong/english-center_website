const { Announcement } = require("../../models");
const withTransaction = require("../../utils/session");

const announcementService = {
  // Tạo thông báo mới
  async create(data) {
    return await withTransaction(async (session) => {
      const announcement = new Announcement(data);
      await announcement.save({ session });
      return await this.getById(announcement._id);
    });
  },

  // Lấy thông báo theo ID
  async getById(announcementId) {
    const announcement = await Announcement.findById(announcementId).populate(
      "relatedClassId",
      "className grade"
    );

    if (!announcement) {
      throw new Error("Không tìm thấy thông báo");
    }
    return announcement;
  },

  // Cập nhật thông báo
  async update(announcementId, updateData) {
    return await withTransaction(async (session) => {
      const announcement = await Announcement.findByIdAndUpdate(
        announcementId,
        updateData,
        { new: true, session }
      );

      if (!announcement) {
        throw new Error("Không tìm thấy thông báo để cập nhật");
      }

      return await this.getById(announcementId);
    });
  },

  // Xóa thông báo
  async delete(announcementId, hardDelete = false) {
    return await withTransaction(async (session) => {
      const announcement = await Announcement.findById(announcementId).session(
        session
      );
      if (!announcement) {
        throw new Error("Không tìm thấy thông báo để xóa");
      }

      if (hardDelete) {
        await Announcement.deleteOne({ _id: announcementId }).session(session);
        return { message: "Xóa thông báo thành công (vĩnh viễn)" };
      } else {
        announcement.isActive = false;
        await announcement.save({ session });
        return { message: "Xóa thông báo thành công (soft delete)" };
      }
    });
  },

  // Lấy danh sách thông báo với phân trang và filter
  async getAll(filter = {}, options = {}) {
    const {
      page = 1,
      limit = 10,
      sort = { createdAt: -1 },
      populate = true,
    } = options;

    const skip = (page - 1) * limit;

    let query = Announcement.find(filter).sort(sort).skip(skip).limit(limit);

    if (populate) {
      query = query.populate("relatedClassId", "className grade");
    }

    const announcements = await query;
    const total = await Announcement.countDocuments(filter);

    return {
      announcements,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        itemsPerPage: limit,
      },
    };
  },

  // Lấy thông báo đang hoạt động
  async getActiveAnnouncements(filters = {}) {
    const { type, targetAudience } = filters;

    const today = new Date();
    const filter = {
      isActive: true,
      startDate: { $lte: today },
      endDate: { $gte: today },
    };

    if (type) filter.type = type;
    if (targetAudience) filter.targetAudience = targetAudience;

    const announcements = await Announcement.find(filter)
      .populate("relatedClassId", "className grade")
      .sort({ createdAt: -1 });

    return announcements;
  },

  // Lấy thông báo theo loại đối tượng
  async getAnnouncementsByAudience(targetAudience, options = {}) {
    const filter = {
      isActive: true,
      targetAudience: { $in: [targetAudience, "All"] },
    };

    const today = new Date();
    filter.startDate = { $lte: today };
    filter.endDate = { $gte: today };

    return await this.getAll(filter, options);
  },

  // Lấy thông báo theo lớp học
  async getAnnouncementsByClass(classId, options = {}) {
    const filter = {
      isActive: true,
      $or: [{ relatedClassId: classId }, { targetAudience: "All" }],
    };

    const today = new Date();
    filter.startDate = { $lte: today };
    filter.endDate = { $gte: today };

    return await this.getAll(filter, options);
  },

  // Cập nhật trạng thái thông báo
  async updateStatus(announcementId, isActive) {
    return await this.update(announcementId, { isActive });
  },

  // Lấy thống kê thông báo
  async getAnnouncementStats(filters = {}) {
    const { year, month } = filters;

    const matchFilter = {};
    if (year || month) {
      const dateFilter = {};
      if (year) {
        dateFilter.$gte = new Date(`${year}-01-01`);
        dateFilter.$lt = new Date(`${parseInt(year) + 1}-01-01`);
      }
      if (month) {
        const monthStr = month.toString().padStart(2, "0");
        dateFilter.$gte = new Date(
          `${year || new Date().getFullYear()}-${monthStr}-01`
        );
        const nextMonth = parseInt(month) + 1;
        const nextYear =
          nextMonth > 12
            ? parseInt(year || new Date().getFullYear()) + 1
            : year || new Date().getFullYear();
        const nextMonthStr = (nextMonth > 12 ? 1 : nextMonth)
          .toString()
          .padStart(2, "0");
        dateFilter.$lt = new Date(`${nextYear}-${nextMonthStr}-01`);
      }
      matchFilter.createdAt = dateFilter;
    }

    const stats = await Announcement.aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: "$type",
          count: { $sum: 1 },
          active: { $sum: { $cond: ["$isActive", 1, 0] } },
          inactive: { $sum: { $cond: ["$isActive", 0, 1] } },
        },
      },
    ]);

    const totalStats = await Announcement.aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          active: { $sum: { $cond: ["$isActive", 1, 0] } },
          inactive: { $sum: { $cond: ["$isActive", 0, 1] } },
        },
      },
    ]);

    return {
      byType: stats,
      total: totalStats[0] || { total: 0, active: 0, inactive: 0 },
    };
  },
};

module.exports = announcementService;
