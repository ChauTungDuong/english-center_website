const pagination = (model) => async (req, res, next) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  try {
    const totalItems = await model.countDocuments();
    const totalPages = Math.ceil(totalItems / limit);
    const items = await model
      .find()
      .select("-password")
      .skip(skip)
      .limit(limit);

    res.paginatedResults = {
      data: items,
      totalItems,
      totalPages,
      currentPage: page,
    };
    next();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = pagination;
