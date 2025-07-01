const { ValidationError } = require("../errors/AppError");

/**
 * Validation Middleware Factory
 * Creates validation middleware using Joi or custom validation
 */
const validate = (schema, source = "body") => {
  return (req, res, next) => {
    const data = req[source];

    if (typeof schema === "function") {
      // Custom validation function
      try {
        schema(data);
        next();
      } catch (error) {
        next(new ValidationError(error.message));
      }
    } else if (schema.validate) {
      // Joi schema
      const { error } = schema.validate(data);
      if (error) {
        const message = error.details
          .map((detail) => detail.message)
          .join(", ");
        return next(new ValidationError(message));
      }
      next();
    } else {
      next();
    }
  };
};

/**
 * Common Validation Rules
 */
const validateId = (req, res, next) => {
  const { id } = req.params;

  if (!id || !id.match(/^[0-9a-fA-F]{24}$/)) {
    return next(new ValidationError("ID không hợp lệ"));
  }

  next();
};

const validatePagination = (req, res, next) => {
  const { page = 1, limit = 10 } = req.query;

  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);

  if (isNaN(pageNum) || pageNum < 1) {
    return next(new ValidationError("Số trang phải là số nguyên dương"));
  }

  if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
    return next(new ValidationError("Số lượng items phải từ 1-100"));
  }

  req.pagination = {
    page: pageNum,
    limit: limitNum,
    skip: (pageNum - 1) * limitNum,
  };

  next();
};

/**
 * Sanitize Input
 */
const sanitizeInput = (req, res, next) => {
  // Remove sensitive fields
  const sensitiveFields = ["password", "passwordConfirm", "__v"];

  const sanitize = (obj) => {
    if (typeof obj !== "object" || obj === null) return obj;

    const sanitized = {};
    for (const [key, value] of Object.entries(obj)) {
      if (!sensitiveFields.includes(key)) {
        sanitized[key] = typeof value === "object" ? sanitize(value) : value;
      }
    }
    return sanitized;
  };

  if (req.body) req.body = sanitize(req.body);
  if (req.query) req.query = sanitize(req.query);

  next();
};

module.exports = {
  validate,
  validateId,
  validatePagination,
  sanitizeInput,
};
