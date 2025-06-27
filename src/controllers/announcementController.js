const announcementService = require("../services/role_services/announcementService");

const announcementController = {
  // Tạo thông báo mới
  async createAnnouncement(req, res) {
    try {
      const newAnnouncement = await announcementService.create(req.body);
      return res.status(201).json({
        msg: "Tạo thông báo thành công",
        data: newAnnouncement,
      });
    } catch (error) {
      return res.status(500).json({
        msg: "Lỗi khi tạo thông báo",
        error: error.message,
      });
    }
  },

  // Lấy thông báo theo ID
  async getAnnouncementById(req, res) {
    try {
      const announcement = await announcementService.getById(
        req.params.announcementId
      );
      return res.status(200).json({
        msg: "Lấy thông tin thông báo thành công",
        data: announcement,
      });
    } catch (error) {
      return res.status(500).json({
        msg: "Lỗi khi lấy thông tin thông báo",
        error: error.message,
      });
    }
  },

  // Cập nhật thông báo
  async updateAnnouncement(req, res) {
    try {
      const updatedAnnouncement = await announcementService.update(
        req.params.announcementId,
        req.body
      );
      return res.status(200).json({
        msg: "Cập nhật thông báo thành công",
        data: updatedAnnouncement,
      });
    } catch (error) {
      return res.status(500).json({
        msg: "Lỗi khi cập nhật thông báo",
        error: error.message,
      });
    }
  },

  // Xóa thông báo
  async deleteAnnouncement(req, res) {
    try {
      const { hardDelete } = req.query;
      const result = await announcementService.delete(
        req.params.announcementId,
        hardDelete === "true"
      );
      return res.status(200).json({
        msg: result.message,
        data: result,
      });
    } catch (error) {
      return res.status(500).json({
        msg: "Lỗi khi xóa thông báo",
        error: error.message,
      });
    }
  },

  // Lấy danh sách tất cả thông báo
  async getAllAnnouncements(req, res) {
    try {
      const { page, limit, type, targetAudience, isActive } = req.query;

      // Build filter
      const filter = {};
      if (type) filter.type = type;
      if (targetAudience) filter.targetAudience = targetAudience;
      if (isActive !== undefined) filter.isActive = isActive === "true";

      const options = {
        page: page ? parseInt(page) : 1,
        limit: limit ? parseInt(limit) : 10,
        sort: { createdAt: -1 },
        populate: true,
      };

      const result = await announcementService.getAll(filter, options);
      return res.status(200).json({
        msg: "Lấy danh sách thông báo thành công",
        data: result.announcements,
        pagination: result.pagination,
      });
    } catch (error) {
      return res.status(500).json({
        msg: "Lỗi khi lấy danh sách thông báo",
        error: error.message,
      });
    }
  },

  // Lấy thông báo đang hoạt động
  async getActiveAnnouncements(req, res) {
    try {
      const { type, targetAudience } = req.query;

      const announcements = await announcementService.getActiveAnnouncements({
        type,
        targetAudience,
      });

      return res.status(200).json({
        msg: "Lấy danh sách thông báo đang hoạt động thành công",
        data: announcements,
      });
    } catch (error) {
      return res.status(500).json({
        msg: "Lỗi khi lấy danh sách thông báo đang hoạt động",
        error: error.message,
      });
    }
  },

  // Lấy thông báo theo đối tượng
  async getAnnouncementsByAudience(req, res) {
    try {
      const { targetAudience } = req.params;
      const { page, limit } = req.query;

      const options = {
        page: page ? parseInt(page) : 1,
        limit: limit ? parseInt(limit) : 10,
        sort: { createdAt: -1 },
        populate: true,
      };

      const result = await announcementService.getAnnouncementsByAudience(
        targetAudience,
        options
      );

      return res.status(200).json({
        msg: "Lấy thông báo theo đối tượng thành công",
        data: result.announcements,
        pagination: result.pagination,
      });
    } catch (error) {
      return res.status(500).json({
        msg: "Lỗi khi lấy thông báo theo đối tượng",
        error: error.message,
      });
    }
  },

  // Lấy thông báo theo lớp học
  async getAnnouncementsByClass(req, res) {
    try {
      const { classId } = req.params;
      const { page, limit } = req.query;

      const options = {
        page: page ? parseInt(page) : 1,
        limit: limit ? parseInt(limit) : 10,
        sort: { createdAt: -1 },
        populate: true,
      };

      const result = await announcementService.getAnnouncementsByClass(
        classId,
        options
      );

      return res.status(200).json({
        msg: "Lấy thông báo theo lớp học thành công",
        data: result.announcements,
        pagination: result.pagination,
      });
    } catch (error) {
      return res.status(500).json({
        msg: "Lỗi khi lấy thông báo theo lớp học",
        error: error.message,
      });
    }
  },

  // Cập nhật trạng thái thông báo
  async updateAnnouncementStatus(req, res) {
    try {
      const { announcementId } = req.params;
      const { isActive } = req.body;

      const updatedAnnouncement = await announcementService.updateStatus(
        announcementId,
        isActive
      );

      return res.status(200).json({
        msg: "Cập nhật trạng thái thông báo thành công",
        data: updatedAnnouncement,
      });
    } catch (error) {
      return res.status(500).json({
        msg: "Lỗi khi cập nhật trạng thái thông báo",
        error: error.message,
      });
    }
  },

  // Lấy thống kê thông báo
  async getAnnouncementStats(req, res) {
    try {
      const { year, month } = req.query;

      const stats = await announcementService.getAnnouncementStats({
        year,
        month,
      });

      return res.status(200).json({
        msg: "Lấy thống kê thông báo thành công",
        data: stats,
      });
    } catch (error) {
      return res.status(500).json({
        msg: "Lỗi khi lấy thống kê thông báo",
        error: error.message,
      });
    }
  },
};

module.exports = announcementController;
