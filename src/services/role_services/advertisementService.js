const Advertisement = require("../../models/Advertisement");

const advertisementService = {
  // Get all active advertisements for public view
  getPublicAdvertisements: async () => {
    try {
      const now = new Date();
      const advertisements = await Advertisement.find({
        isActive: true,
        startDate: { $lte: now },
        endDate: { $gte: now },
      }).sort({ createdAt: -1 });

      return advertisements;
    } catch (error) {
      throw new Error(`Failed to get public advertisements: ${error.message}`);
    }
  },

  // Get all advertisements with pagination and filters (admin only)
  getAllAdvertisements: async (options = {}) => {
    try {
      const {
        page = 1,
        limit = 10,
        filters = {},
        sortBy = "createdAt",
        sortOrder = "desc",
      } = options;

      const filter = { ...filters };

      const sort = {};
      sort[sortBy] = sortOrder === "desc" ? -1 : 1;

      const skip = (page - 1) * limit;

      const [advertisements, total] = await Promise.all([
        Advertisement.find(filter).sort(sort).skip(skip).limit(limit),
        Advertisement.countDocuments(filter),
      ]);

      return {
        advertisements,
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
