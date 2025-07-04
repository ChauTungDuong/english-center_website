const Advertisement = require("../../models/Advertisement");

const advertisementService = {
  // Get all active advertisements for public view
  getPublicAdvertisements: async () => {
    try {
      const now = new Date();
      const advertisements = await Advertisement.find({
        isActive: true,
        startDate: { $lte: now },
        $or: [
          { endDate: { $gte: now } },
          { endDate: null }, // Quảng cáo không có ngày kết thúc
        ],
      })
        .select("title content startDate endDate images createdAt") // Chỉ select field cần thiết
        .sort({ createdAt: -1 })
        .limit(10) // Giới hạn tối đa 10 quảng cáo public
        .lean(); // Tăng performance

      // Tối ưu ảnh cho public view
      const optimizedAdvertisements = advertisements.map((ad) => {
        const optimizedImages = ad.images
          ? ad.images.slice(0, 2).map((img) => ({
              url: img.url,
              // Tạo thumbnail nhỏ hơn cho public view
              thumbnailUrl: img.url
                ? img.url.replace("/upload/", "/upload/w_400,h_250,c_fill/")
                : null,
            }))
          : [];

        return {
          ...ad,
          images: optimizedImages,
          imageCount: ad.images ? ad.images.length : 0,
          contentPreview: ad.content
            ? ad.content.substring(0, 200) +
              (ad.content.length > 200 ? "..." : "")
            : "",
        };
      });

      return optimizedAdvertisements;
    } catch (error) {
      throw new Error(`Failed to get public advertisements: ${error.message}`);
    }
  },

  // Get all advertisements with pagination and filters (admin only)
  getAllAdvertisements: async (options = {}) => {
    try {
      const {
        page = 1,
        limit = 5,
        filters = {},
        sortBy = "createdAt",
        sortOrder = "desc",
      } = options;

      const filter = { ...filters };

      const sort = {};
      sort[sortBy] = sortOrder === "desc" ? -1 : 1;

      const skip = (page - 1) * limit;

      // Tối ưu: Select chỉ các field cần thiết, tạo thumbnail cho ảnh
      const [advertisements, total] = await Promise.all([
        Advertisement.find(filter)
          .select(
            "title content startDate endDate isActive images createdAt updatedAt"
          ) // Chỉ select các field cần thiết
          .sort(sort)
          .skip(skip)
          .limit(limit)
          .lean(), // Sử dụng lean() để tăng performance
        Advertisement.countDocuments(filter),
      ]);

      // Tối ưu ảnh: Chỉ trả về thumbnail và giới hạn số lượng ảnh
      const optimizedAdvertisements = advertisements.map((ad) => {
        const optimizedImages = ad.images
          ? ad.images.slice(0, 3).map((img) => ({
              url: img.url,
              public_id: img.public_id,
              format: img.format,
              // Tạo thumbnail URL cho Cloudinary
              thumbnailUrl: img.url
                ? img.url.replace("/upload/", "/upload/w_300,h_200,c_fill/")
                : null,
            }))
          : [];

        return {
          ...ad,
          images: optimizedImages,
          imageCount: ad.images ? ad.images.length : 0, // Thêm số lượng ảnh tổng
          contentPreview: ad.content
            ? ad.content.substring(0, 150) +
              (ad.content.length > 150 ? "..." : "")
            : "", // Tóm tắt content
        };
      });

      return {
        advertisements: optimizedAdvertisements,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          totalItems: total,
          limit,
        },
      };
    } catch (error) {
      throw new Error(`Failed to get advertisements: ${error.message}`);
    }
  },

  // Get advertisement by ID
  getAdvertisementById: async (id) => {
    try {
      const advertisement = await Advertisement.findById(id);
      return advertisement;
    } catch (error) {
      throw new Error(`Failed to get advertisement by ID: ${error.message}`);
    }
  },

  // Create new advertisement
  createAdvertisement: async (advertisementData) => {
    try {
      // Validate required fields
      const { title, content, startDate, endDate } = advertisementData;

      if (!title || !content || !startDate || !endDate) {
        throw new Error("Title, content, startDate, and endDate are required");
      }

      // Validate date range
      if (new Date(startDate) >= new Date(endDate)) {
        throw new Error("Start date must be before end date");
      }

      const advertisement = new Advertisement(advertisementData);
      await advertisement.save();

      return advertisement;
    } catch (error) {
      throw new Error(`Failed to create advertisement: ${error.message}`);
    }
  },

  // Update advertisement
  updateAdvertisement: async (id, updateData) => {
    try {
      // Validate date range if dates are being updated
      if (updateData.startDate && updateData.endDate) {
        if (new Date(updateData.startDate) >= new Date(updateData.endDate)) {
          throw new Error("Start date must be before end date");
        }
      }

      const advertisement = await Advertisement.findByIdAndUpdate(
        id,
        updateData,
        { new: true, runValidators: true }
      );

      if (!advertisement) {
        throw new Error("Advertisement not found");
      }

      return advertisement;
    } catch (error) {
      throw new Error(`Failed to update advertisement: ${error.message}`);
    }
  },

  // Delete advertisement
  deleteAdvertisement: async (id) => {
    try {
      const advertisement = await Advertisement.findByIdAndDelete(id);

      if (!advertisement) {
        throw new Error("Advertisement not found");
      }

      return advertisement;
    } catch (error) {
      throw new Error(`Failed to delete advertisement: ${error.message}`);
    }
  },

  // Get advertisements by date range
  getAdvertisementsByDateRange: async (startDate, endDate) => {
    try {
      const advertisements = await Advertisement.find({
        $or: [
          {
            startDate: { $gte: startDate, $lte: endDate },
          },
          {
            endDate: { $gte: startDate, $lte: endDate },
          },
          {
            startDate: { $lte: startDate },
            endDate: { $gte: endDate },
          },
        ],
      }).sort({ startDate: 1 });

      return advertisements;
    } catch (error) {
      throw new Error(
        `Failed to get advertisements by date range: ${error.message}`
      );
    }
  },
};

module.exports = advertisementService;
