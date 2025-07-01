const mongoose = require("mongoose");

/**
 * Base Service Class
 * Provides common CRUD operations for all services
 */
class BaseService {
  constructor(model) {
    this.model = model;
  }

  /**
   * Create a new document
   */
  async create(data, session = null) {
    const options = session ? { session } : {};

    if (session) {
      const [document] = await this.model.create([data], options);
      return document;
    }

    return await this.model.create(data);
  }

  /**
   * Find document by ID
   */
  async findById(id, populateOptions = null) {
    let query = this.model.findById(id);

    if (populateOptions) {
      if (Array.isArray(populateOptions)) {
        populateOptions.forEach((option) => (query = query.populate(option)));
      } else {
        query = query.populate(populateOptions);
      }
    }

    return await query;
  }

  /**
   * Find all documents with filters and pagination
   */
  async findAll(filters = {}, options = {}) {
    const {
      page = 1,
      limit = 10,
      sort = { createdAt: -1 },
      populate = null,
      select = null,
    } = options;

    const skip = (page - 1) * limit;

    let query = this.model.find(filters);

    if (select) query = query.select(select);
    if (populate) {
      if (Array.isArray(populate)) {
        populate.forEach((option) => (query = query.populate(option)));
      } else {
        query = query.populate(populate);
      }
    }

    query = query.sort(sort).skip(skip).limit(limit);

    const [documents, total] = await Promise.all([
      query,
      this.model.countDocuments(filters),
    ]);

    return {
      documents,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page < Math.ceil(total / limit),
        hasPrevPage: page > 1,
      },
    };
  }

  /**
   * Update document by ID
   */
  async updateById(id, data, session = null) {
    const options = {
      new: true,
      runValidators: true,
      ...(session && { session }),
    };

    return await this.model.findByIdAndUpdate(id, data, options);
  }

  /**
   * Delete document by ID
   */
  async deleteById(id, session = null) {
    const options = session ? { session } : {};
    return await this.model.findByIdAndDelete(id, options);
  }

  /**
   * Soft delete (if model supports isActive field)
   */
  async softDeleteById(id, session = null) {
    return await this.updateById(id, { isActive: false }, session);
  }

  /**
   * Find one document
   */
  async findOne(filters, populateOptions = null) {
    let query = this.model.findOne(filters);

    if (populateOptions) {
      if (Array.isArray(populateOptions)) {
        populateOptions.forEach((option) => (query = query.populate(option)));
      } else {
        query = query.populate(populateOptions);
      }
    }

    return await query;
  }

  /**
   * Count documents
   */
  async count(filters = {}) {
    return await this.model.countDocuments(filters);
  }

  /**
   * Check if document exists
   */
  async exists(filters) {
    return await this.model.exists(filters);
  }

  /**
   * Execute within transaction
   */
  async withTransaction(callback) {
    const session = await mongoose.startSession();

    try {
      session.startTransaction();
      const result = await callback(session);
      await session.commitTransaction();
      return result;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }
}

module.exports = BaseService;
