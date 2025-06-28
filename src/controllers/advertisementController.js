const advertisementService = require("../services/role_services/advertisementService");
const memoryImageService = require("../services/memoryImageService");

// Public access - no authentication required
// GET /api/advertisements/public
const getPublicAdvertisements = async (req, res) => {
  try {
    const advertisements = await advertisementService.getPublicAdvertisements();
    res.json({
      success: true,
      data: advertisements,
      message: "Public advertisements retrieved successfully",
    });
  } catch (error) {
    console.error("Error getting public advertisements:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve public advertisements",
      error: error.message,
    });
  }
};

// Admin only - Get all advertisements with pagination and filtering
// GET /api/advertisements
const getAllAdvertisements = async (req, res) => {
  try {
    const { page = 1, limit = 10, isActive, search } = req.query;
    const filters = {};

    if (isActive !== undefined) {
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

    res.json({
      success: true,
      data: result.advertisements,
      pagination: {
        currentPage: result.currentPage,
        totalPages: result.totalPages,
        totalItems: result.totalItems,
        itemsPerPage: result.itemsPerPage,
      },
      message: "Advertisements retrieved successfully",
    });
  } catch (error) {
    console.error("Error getting all advertisements:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve advertisements",
      error: error.message,
    });
  }
};

// Admin only - Get advertisement by ID
// GET /api/advertisements/:id
const getAdvertisementById = async (req, res) => {
  try {
    const { id } = req.params;
    const advertisement = await advertisementService.getAdvertisementById(id);

    if (!advertisement) {
      return res.status(404).json({
        success: false,
        message: "Advertisement not found",
      });
    }

    res.json({
      success: true,
      data: advertisement,
      message: "Advertisement retrieved successfully",
    });
  } catch (error) {
    console.error("Error getting advertisement by ID:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve advertisement",
      error: error.message,
    });
  }
};

// Admin only - Create new advertisement
// POST /api/advertisements
const createAdvertisement = async (req, res) => {
  try {
    const { title, content, startDate, endDate, images } = req.body;
    const files = req.files;

    // Validate required fields
    if (!title || !content) {
      return res.status(400).json({
        success: false,
        message: "Title and content are required",
      });
    }

    // Process images from body (base64 data URLs) and uploaded files
    let imageDataUrls = [];

    // Handle images from request body (for JSON requests with base64 data URLs)
    if (images && typeof images === "string") {
      // Single base64 data URL from JSON
      imageDataUrls = [images];
    } else if (images && Array.isArray(images)) {
      // Multiple base64 data URLs from JSON
      imageDataUrls = [...images];
    }

    // Process uploaded image files (for form-data requests) - convert from buffer to base64
    if (files && files.length > 0) {
      try {
        const convertedImages =
          memoryImageService.convertMultipleFilesToBase64(files);
        imageDataUrls.push(...convertedImages);
      } catch (conversionError) {
        console.error("Error converting images to base64:", conversionError);
        // Continue with existing images, don't fail the entire request
      }
    }

    const advertisementData = {
      title,
      content,
      images: imageDataUrls, // Store base64 data URLs
      startDate: startDate ? new Date(startDate) : new Date(),
      endDate: endDate ? new Date(endDate) : null,
      isActive: true, // Always default to true when creating
    };

    const advertisement = await advertisementService.createAdvertisement(
      advertisementData
    );

    res.status(201).json({
      success: true,
      data: advertisement,
      message: "Advertisement created successfully",
    });
  } catch (error) {
    console.error("Error creating advertisement:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create advertisement",
      error: error.message,
    });
  }
};

// Admin only - Update advertisement
// PUT /api/advertisements/:id
const updateAdvertisement = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      title,
      content,
      startDate,
      endDate,
      isActive,
      images,
      removeImages,
    } = req.body;
    const files = req.files;

    // Get current advertisement
    const currentAd = await advertisementService.getAdvertisementById(id);
    if (!currentAd) {
      return res.status(404).json({
        success: false,
        message: "Advertisement not found",
      });
    }

    // Handle image updates
    let currentImages = [...(currentAd.images || [])];

    // Handle image removal by index or by base64 content
    if (removeImages) {
      const imagesToRemove = Array.isArray(removeImages)
        ? removeImages
        : [removeImages];
      for (const imageIdentifier of imagesToRemove) {
        // Remove by index if it's a number, otherwise by content match
        if (
          typeof imageIdentifier === "number" &&
          imageIdentifier >= 0 &&
          imageIdentifier < currentImages.length
        ) {
          currentImages.splice(imageIdentifier, 1);
        } else {
          currentImages = currentImages.filter(
            (img) => img !== imageIdentifier
          );
        }
      }
    }

    // Handle new images from body (base64 data URLs)
    if (images) {
      if (typeof images === "string") {
        currentImages.push(images);
      } else if (Array.isArray(images)) {
        currentImages.push(...images);
      }
    }

    // Handle new image file uploads - convert from buffer to base64
    if (files && files.length > 0) {
      try {
        const convertedImages =
          memoryImageService.convertMultipleFilesToBase64(files);
        currentImages.push(...convertedImages);
      } catch (conversionError) {
        console.error(
          "Error converting new images to base64:",
          conversionError
        );
        // Continue with existing images
      }
    }

    const updateData = {
      ...(title && { title }),
      ...(content && { content }),
      ...(startDate && { startDate: new Date(startDate) }),
      ...(endDate && { endDate: new Date(endDate) }),
      ...(isActive !== undefined && { isActive }),
      images: currentImages,
    };

    const updatedAdvertisement = await advertisementService.updateAdvertisement(
      id,
      updateData
    );

    res.json({
      success: true,
      data: updatedAdvertisement,
      message: "Advertisement updated successfully",
    });
  } catch (error) {
    console.error("Error updating advertisement:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update advertisement",
      error: error.message,
    });
  }
};

// Admin only - Delete advertisement
// DELETE /api/advertisements/:id
const deleteAdvertisement = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if advertisement exists
    const advertisement = await advertisementService.getAdvertisementById(id);
    if (!advertisement) {
      return res.status(404).json({
        success: false,
        message: "Advertisement not found",
      });
    }

    // Delete advertisement (base64 images are stored in database, no file cleanup needed)
    await advertisementService.deleteAdvertisement(id);

    res.json({
      success: true,
      message: "Advertisement deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting advertisement:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete advertisement",
      error: error.message,
    });
  }
};

// Admin only - Toggle advertisement status
// PATCH /api/advertisements/:id/toggle-status
const toggleAdvertisementStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const updatedAdvertisement =
      await advertisementService.toggleAdvertisementStatus(id);

    if (!updatedAdvertisement) {
      return res.status(404).json({
        success: false,
        message: "Advertisement not found",
      });
    }

    res.json({
      success: true,
      data: updatedAdvertisement,
      message: `Advertisement ${
        updatedAdvertisement.isActive ? "activated" : "deactivated"
      } successfully`,
    });
  } catch (error) {
    console.error("Error toggling advertisement status:", error);
    res.status(500).json({
      success: false,
      message: "Failed to toggle advertisement status",
      error: error.message,
    });
  }
};

// Admin only - Get advertisement statistics
// GET /api/advertisements/statistics
const getAdvertisementStatistics = async (req, res) => {
  try {
    const statistics = await advertisementService.getAdvertisementStatistics();

    res.json({
      success: true,
      data: statistics,
      message: "Advertisement statistics retrieved successfully",
    });
  } catch (error) {
    console.error("Error getting advertisement statistics:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve advertisement statistics",
      error: error.message,
    });
  }
};

module.exports = {
  getPublicAdvertisements,
  getAllAdvertisements,
  getAdvertisementById,
  createAdvertisement,
  updateAdvertisement,
  deleteAdvertisement,
  toggleAdvertisementStatus,
  getAdvertisementStatistics,
};
