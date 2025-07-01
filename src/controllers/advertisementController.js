const { catchAsync } = require("../core/middleware");
const { ApiResponse } = require("../core/utils");
const AdvertisementService = require("../services/AdvertisementService");
const cloudinaryService = require("../services/cloudinaryService");

const advertisementService = new AdvertisementService();

const advertisementController = {
  // Public access - no authentication required
  getPublicAdvertisements: catchAsync(async (req, res) => {
    const advertisements = await advertisementService.getPublicAdvertisements();
    return ApiResponse.success(
      res,
      advertisements,
      "Public advertisements retrieved successfully"
    );
  }),

  // Admin only - Get all advertisements with pagination and filtering
  getAllAdvertisements: catchAsync(async (req, res) => {
    const { page = 1, limit = 10, isActive, search } = req.query;
    const filters = {};

    // Only filter by isActive if it has a valid value
    if (isActive !== undefined && isActive !== "") {
      filters.isActive = isActive === "true";
    }

    if (search) {
      filters.$or = [
        { title: { $regex: search, $options: "i" } },
        { content: { $regex: search, $options: "i" } },
      ];
    }

    const result = await advertisementService.getAllAdvertisements({
      page: parseInt(page),
      limit: parseInt(limit),
      filters,
    });

    return ApiResponse.success(
      res,
      result,
      "Advertisements retrieved successfully"
    );
  }),

  // Get advertisement by ID
  getAdvertisementById: catchAsync(async (req, res) => {
    const { id } = req.params;
    const advertisement = await advertisementService.getAdvertisementById(id);
    return ApiResponse.success(
      res,
      advertisement,
      "Advertisement retrieved successfully"
    );
  }),

  // Admin only - Create new advertisement
  createAdvertisement: catchAsync(async (req, res) => {
    let advertisementData = { ...req.body };

    // Handle image upload if present
    if (req.file) {
      const imageUrl = await cloudinaryService.uploadSingle(
        req.file,
        "advertisements"
      );
      advertisementData.imageUrl = imageUrl;
    }

    const advertisement = await advertisementService.createAdvertisement(
      advertisementData
    );

    return ApiResponse.success(
      res,
      advertisement,
      "Advertisement created successfully",
      201
    );
  }),

  // Admin only - Update advertisement
  updateAdvertisement: catchAsync(async (req, res) => {
    const { id } = req.params;
    let updateData = { ...req.body };

    // Handle image upload if present
    if (req.file) {
      const imageUrl = await cloudinaryService.uploadSingle(
        req.file,
        "advertisements"
      );
      updateData.imageUrl = imageUrl;
    }

    const advertisement = await advertisementService.updateAdvertisement(
      id,
      updateData
    );

    return ApiResponse.success(
      res,
      advertisement,
      "Advertisement updated successfully"
    );
  }),

  // Admin only - Delete advertisement
  deleteAdvertisement: catchAsync(async (req, res) => {
    const { id } = req.params;

    // Get advertisement to check for image deletion
    const advertisement = await advertisementService.getAdvertisementById(id);

    // Delete from cloudinary if image exists
    if (advertisement.imageUrl) {
      try {
        await cloudinaryService.deleteImage(advertisement.imageUrl);
      } catch (error) {
        console.warn("Failed to delete image from Cloudinary:", error.message);
      }
    }

    await advertisementService.deleteAdvertisement(id);

    return ApiResponse.success(res, null, "Advertisement deleted successfully");
  }),

  // Get advertisements by date range
  getAdvertisementsByDateRange: catchAsync(async (req, res) => {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return ApiResponse.error(
        res,
        "Start date and end date are required",
        400
      );
    }

    const advertisements =
      await advertisementService.getAdvertisementsByDateRange(
        new Date(startDate),
        new Date(endDate)
      );

    return ApiResponse.success(
      res,
      advertisements,
      "Advertisements retrieved by date range"
    );
  }),

  // Admin only - Toggle advertisement status
  toggleAdvertisementStatus: catchAsync(async (req, res) => {
    const { id } = req.params;

    const advertisement = await advertisementService.toggleAdvertisementStatus(
      id
    );

    return ApiResponse.success(
      res,
      advertisement,
      "Advertisement status toggled successfully"
    );
  }),

  // Admin only - Get advertisements statistics
  getAdvertisementsStatistics: catchAsync(async (req, res) => {
    const statistics = await advertisementService.getAdvertisementsStatistics();

    return ApiResponse.success(
      res,
      statistics,
      "Advertisement statistics retrieved"
    );
  }),

  // Admin only - Get expiring advertisements
  getExpiringAdvertisements: catchAsync(async (req, res) => {
    const { daysAhead = 7 } = req.query;

    const advertisements = await advertisementService.getExpiringAdvertisements(
      parseInt(daysAhead)
    );

    return ApiResponse.success(
      res,
      advertisements,
      "Expiring advertisements retrieved"
    );
  }),
};

module.exports = advertisementController;
