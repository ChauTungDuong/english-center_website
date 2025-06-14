const filterOptions = require("../services/filterOptions");

const paginate =
  (model, options = {}) =>
  async (req, res, next) => {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const skip = (page - 1) * limit;
      const sortBy = req.query.sortBy || "createdAt";
      const sortOrder = req.query.sortOrder === "asc" ? 1 : -1;

      const getFilter = options.filter || (() => ({}));
      const select = options.select || "";
      const populate = options.populate || "";

      const filter = getFilter(req);

      const totalItems = await model.countDocuments(filter);
      const totalPages = Math.ceil(totalItems / limit);

      let query = model
        .find(filter)
        .skip(skip)
        .limit(limit)
        .sort({ [sortBy]: sortOrder });
      if (select) query = query.select(select);
      if (populate) query = query.populate(populate);

      const items = await query;
      res.paginatedResults = {
        data: items,
        totalItems,
        totalPages,
        currentPage: page,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      };
      next();
    } catch (error) {
      res.status(500).json({ msg: "Lỗi phân trang", error: error.message });
    }
  };

module.exports = paginate;
