const { Announcement } = require("../models");
const createAnnouncement = async (req, res) => {
  try {
    const {
      title,
      content,
      type,
      startDate,
      endDate,
      targetAudience,
      relatedClassId,
      image,
    } = req.body;

    if (!title || !content || !type || !startDate || !endDate) {
      return res.status(400).json({
        msg: "Thiếu thông tin thông báo",
      });
    }

    const announcement = await Announcement.create({
      title,
      content,
      type,
      startDate,
      endDate,
      isActive: true,
      targetAudience: targetAudience || "All",
      relatedClassId,
      image,
    });

    return res.status(201).json({
      msg: "Tạo thông báo thành công",
      data: announcement,
    });
  } catch (error) {
    return res.status(500).json({
      msg: "Lỗi khi tạo thông báo",
      error: error.message,
    });
  }
};

const getActiveAnnouncements = async (req, res) => {
  try {
    const { type, targetAudience } = req.query;

    const today = new Date();
    const filter = {
      isActive: true,
      startDate: { $lte: today },
      endDate: { $gte: today },
    };

    if (type) filter.type = type;
    if (targetAudience) filter.targetAudience = targetAudience;

    const announcements = await Announcement.find(filter).sort({
      createdAt: -1,
    });

    return res.status(200).json({
      msg: "Lấy danh sách thông báo thành công",
      data: announcements,
    });
  } catch (error) {
    return res.status(500).json({
      msg: "Lỗi khi lấy danh sách thông báo",
      error: error.message,
    });
  }
};

module.exports = {
  createAnnouncement,
  getActiveAnnouncements,
};
