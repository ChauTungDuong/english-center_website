/**
 * Standard API Response Helper
 */
class ApiResponse {
  static success(res, data = null, message = "Thành công", statusCode = 200) {
    return res.status(statusCode).json({
      success: true,
      status: "success",
      message,
      data,
      timestamp: new Date().toISOString(),
    });
  }

  static error(
    res,
    message = "Có lỗi xảy ra",
    statusCode = 500,
    errors = null
  ) {
    return res.status(statusCode).json({
      success: false,
      status: "error",
      message,
      errors,
      timestamp: new Date().toISOString(),
    });
  }

  static paginated(res, data, pagination, message = "Thành công") {
    return res.status(200).json({
      success: true,
      status: "success",
      message,
      data,
      pagination: {
        currentPage: pagination.page,
        totalPages: Math.ceil(pagination.total / pagination.limit),
        totalItems: pagination.total,
        itemsPerPage: pagination.limit,
        hasNextPage:
          pagination.page < Math.ceil(pagination.total / pagination.limit),
        hasPrevPage: pagination.page > 1,
      },
      timestamp: new Date().toISOString(),
    });
  }

  static created(res, data, message = "Tạo thành công") {
    return ApiResponse.success(res, data, message, 201);
  }

  static updated(res, data, message = "Cập nhật thành công") {
    return ApiResponse.success(res, data, message, 200);
  }

  static deleted(res, message = "Xóa thành công") {
    return ApiResponse.success(res, null, message, 200);
  }

  static notFound(res, message = "Không tìm thấy") {
    return ApiResponse.error(res, message, 404);
  }

  static unauthorized(res, message = "Không có quyền truy cập") {
    return ApiResponse.error(res, message, 401);
  }

  static forbidden(res, message = "Bị cấm truy cập") {
    return ApiResponse.error(res, message, 403);
  }

  static badRequest(res, message = "Yêu cầu không hợp lệ", errors = null) {
    return ApiResponse.error(res, message, 400, errors);
  }
}

module.exports = ApiResponse;
