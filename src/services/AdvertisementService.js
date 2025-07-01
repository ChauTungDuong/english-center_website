const { BaseService } = require("../core/utils");
const { ValidationError, NotFoundError } = require("../core/errors/AppError");
const Advertisement = require("../models/Advertisement");

class AdvertisementService extends BaseService {
  constructor() {
    super(Advertisement);
  }

  /**
   * Get all active advertisements for public view
   */
  async getPublicAdvertisements() {
    const now = new Date();

    return await this.find(
      {
        isActive: true,
        startDate: { $lte: now },
        endDate: { $gte: now },
      },
      {
        sort: { createdAt: -1 },
      }
    );
  }

  /**
   * Get all advertisements with pagination and filters (admin only)
   */
  async getAllAdvertisements(options = {}) {
    const {
      page = 1,
      limit = 10,
      filters = {},
      sortBy = "createdAt",
      sortOrder = "desc",
    } = options;

    const sort = {};
    sort[sortBy] = sortOrder === "desc" ? -1 : 1;

    return await this.findWithPagination(filters, {
      page,
      limit,
      sort,
    });
  }

  /**
   * Get advertisement by ID
   */
  async getAdvertisementById(id) {
    const advertisement = await this.findById(id);
    if (!advertisement) {
      throw new NotFoundError("Advertisement not found");
    }
    return advertisement;
  }

  /**
   * Create new advertisement
   */
  async createAdvertisement(advertisementData) {
    const { title, content, startDate, endDate } = advertisementData;

    // Validate required fields
    if (!title || !content || !startDate || !endDate) {
      throw new ValidationError(
        "Title, content, startDate, and endDate are required"
      );
    }

    // Validate date range
    if (new Date(startDate) >= new Date(endDate)) {
      throw new ValidationError("Start date must be before end date");
    }

    return await this.create(advertisementData);
  }

  /**
   * Update advertisement
   */
  async updateAdvertisement(id, updateData) {
    // Validate date range if dates are being updated
    if (updateData.startDate && updateData.endDate) {
      if (new Date(updateData.startDate) >= new Date(updateData.endDate)) {
        throw new ValidationError("Start date must be before end date");
      }
    }

    const advertisement = await this.update(id, updateData);
    if (!advertisement) {
      throw new NotFoundError("Advertisement not found");
    }

    return advertisement;
  }

  /**
   * Delete advertisement
   */
  async deleteAdvertisement(id) {
    const advertisement = await this.delete(id);
    if (!advertisement) {
      throw new NotFoundError("Advertisement not found");
    }

    return advertisement;
  }

  /**
   * Get advertisements by date range
   */
  async getAdvertisementsByDateRange(startDate, endDate) {
    return await this.find(
      {
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
      },
      {
        sort: { startDate: 1 },
      }
    );
  }

  /**
   * Toggle advertisement active status
   */
  async toggleAdvertisementStatus(id) {
    const advertisement = await this.findById(id);
    if (!advertisement) {
      throw new NotFoundError("Advertisement not found");
    }

    return await this.update(id, { isActive: !advertisement.isActive });
  }

  /**
   * Get active advertisements count
   */
  async getActiveAdvertisementsCount() {
    const now = new Date();

    return await this.count({
      isActive: true,
      startDate: { $lte: now },
      endDate: { $gte: now },
    });
  }

  /**
   * Get advertisements expiring soon
   */
  async getExpiringAdvertisements(daysAhead = 7) {
    const now = new Date();
    const futureDate = new Date();
    futureDate.setDate(now.getDate() + daysAhead);

    return await this.find(
      {
        isActive: true,
        endDate: { $gte: now, $lte: futureDate },
      },
      {
        sort: { endDate: 1 },
      }
    );
  }

  /**
   * Get advertisements statistics
   */
  async getAdvertisementsStatistics() {
    const now = new Date();

    const [totalAds, activeAds, expiredAds, futureAds] = await Promise.all([
      this.count({}),
      this.count({
        isActive: true,
        startDate: { $lte: now },
        endDate: { $gte: now },
      }),
      this.count({
        endDate: { $lt: now },
      }),
      this.count({
        startDate: { $gt: now },
      }),
    ]);

    return {
      total: totalAds,
      active: activeAds,
      expired: expiredAds,
      upcoming: futureAds,
    };
  }
}

module.exports = AdvertisementService;
