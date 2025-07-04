const advertisementService = require("../services/role_services/advertisementService");
const cloudinaryService = require("../services/cloudinaryService");

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

// Public access - Get advertisement details by ID (no authentication required)
// GET /api/advertisements/public/:advertisementId
const getPublicAdvertisementById = async (req, res) => {
  try {
    const { advertisementId } = req.params;
    const advertisement = await advertisementService.getPublicAdvertisementById(
      advertisementId
    );

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
    console.error("Error getting public advertisement by ID:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve advertisement",
      error: error.message,
    });
  }
};

// Admin only - Get all advertisements with pagination and filtering
// GET /api/advertisements
const getAllAdvertisements = async (req, res) => {
  try {
    const { page = 1, limit = 5, isActive, search } = req.query; // Giảm limit mặc định từ 10 xuống 5

    // Giới hạn limit tối đa để tránh tải quá nhiều dữ liệu
    const maxLimit = 20;
    const actualLimit = Math.min(parseInt(limit), maxLimit);

    const filters = {};

    // Only filter by isActive if it has a valid value (not empty string)
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
      limit: actualLimit,
      filters,
    });

    res.json({
      success: true,
      data: result.advertisements,
      pagination: {
        currentPage: result.pagination.currentPage,
        totalPages: result.pagination.totalPages,
        totalItems: result.pagination.totalItems,
        itemsPerPage: result.pagination.limit,
        maxLimit: maxLimit, // Thông báo cho frontend biết giới hạn
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
// GET /api/advertisements/:advertisementId
const getAdvertisementById = async (req, res) => {
  try {
    const { advertisementId } = req.params;
    const advertisement = await advertisementService.getAdvertisementById(
      advertisementId
    );

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

    // Xử lý ảnh: upload lên Cloudinary
    let imageObjects = [];

    // 1. Ảnh upload dạng file (form-data)
    if (files && files.length > 0) {
      const uploaded = await cloudinaryService.uploadMultipleImages(files);
      imageObjects.push(
        ...uploaded.map((img) => ({
          url: img.secure_url,
          public_id: img.public_id,
          format: img.format,
        }))
      );
    }

    // 2. Ảnh gửi qua body (base64 data url)
    if (images) {
      const base64Array = typeof images === "string" ? [images] : images;
      for (const base64 of base64Array) {
        if (base64 && base64.startsWith("data:image/")) {
          const uploadRes = await cloudinaryService.uploadImageFromBase64(
            base64
          );
          imageObjects.push({
            url: uploadRes.secure_url,
            public_id: uploadRes.public_id,
            format: uploadRes.format,
          });
        }
      }
    }

    const advertisementData = {
      title,
      content,
      images: imageObjects,
      startDate: startDate ? new Date(startDate) : new Date(),
      endDate: endDate ? new Date(endDate) : null,
      isActive: true,
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
// PATCH /api/advertisements/:advertisementId
const updateAdvertisement = async (req, res) => {
  try {
    const { advertisementId } = req.params;
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
    const currentAd = await advertisementService.getAdvertisementById(
      advertisementId
    );
    if (!currentAd) {
      return res.status(404).json({
        success: false,
        message: "Advertisement not found",
      });
    }

    // Xử lý xóa ảnh (theo index hoặc public_id)
    let currentImages = [...(currentAd.images || [])];
    if (removeImages) {
      const imagesToRemove = Array.isArray(removeImages)
        ? removeImages
        : [removeImages];
      for (const identifier of imagesToRemove) {
        // Nếu là số: xóa theo index
        if (
          typeof identifier === "number" &&
          identifier >= 0 &&
          identifier < currentImages.length
        ) {
          // Xóa trên Cloudinary
          if (currentImages[identifier].public_id) {
            await cloudinaryService.deleteImage(
              currentImages[identifier].public_id
            );
          }
          currentImages.splice(identifier, 1);
        } else if (typeof identifier === "string") {
          // Xóa theo public_id
          const idx = currentImages.findIndex(
            (img) => img.public_id === identifier
          );
          if (idx !== -1) {
            await cloudinaryService.deleteImage(currentImages[idx].public_id);
            currentImages.splice(idx, 1);
          }
        }
      }
    }

    // Thêm ảnh mới từ file upload
    if (files && files.length > 0) {
      const uploaded = await cloudinaryService.uploadMultipleImages(files);
      currentImages.push(
        ...uploaded.map((img) => ({
          url: img.secure_url,
          public_id: img.public_id,
          format: img.format,
        }))
      );
    }

    // Thêm ảnh mới từ base64
    if (images) {
      const base64Array = typeof images === "string" ? [images] : images;
      for (const base64 of base64Array) {
        if (base64 && base64.startsWith("data:image/")) {
          const uploadRes = await cloudinaryService.uploadImageFromBase64(
            base64
          );
          currentImages.push({
            url: uploadRes.secure_url,
            public_id: uploadRes.public_id,
            format: uploadRes.format,
          });
        }
      }
    }

    const updateData = {};

    // Only update fields that are provided
    if (title !== undefined) updateData.title = title;
    if (content !== undefined) updateData.content = content;
    if (startDate !== undefined) updateData.startDate = new Date(startDate);
    if (endDate !== undefined) updateData.endDate = new Date(endDate);
    if (isActive !== undefined) updateData.isActive = isActive;
    updateData.images = currentImages;

    const updatedAdvertisement = await advertisementService.updateAdvertisement(
      advertisementId,
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
// DELETE /api/advertisements/:advertisementId
const deleteAdvertisement = async (req, res) => {
  try {
    const { advertisementId } = req.params;

    // Check if advertisement exists
    const advertisement = await advertisementService.getAdvertisementById(
      advertisementId
    );
    if (!advertisement) {
      return res.status(404).json({
        success: false,
        message: "Advertisement not found",
      });
    }

    // Xóa toàn bộ ảnh trên Cloudinary nếu có
    if (Array.isArray(advertisement.images)) {
      for (const img of advertisement.images) {
        if (img.public_id) {
          await cloudinaryService.deleteImage(img.public_id);
        }
      }
    }

    await advertisementService.deleteAdvertisement(advertisementId);

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

module.exports = {
  getPublicAdvertisements,
  getPublicAdvertisementById,
  getAllAdvertisements,
  getAdvertisementById,
  createAdvertisement,
  updateAdvertisement,
  deleteAdvertisement,
};
