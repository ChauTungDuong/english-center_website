const mongoose = require("mongoose");

const tokenSchema = new mongoose.Schema(
  {
    token: {
      type: String,
      required: true,
      unique: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    type: {
      type: String,
      required: true,
      enum: ["reset_password", "blacklisted_jwt"],
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    isUsed: {
      type: Boolean,
      default: false,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
      // Có thể chứa thêm thông tin như:
      // - resetPasswordToken: { originalEmail: "...", requestIP: "..." }
      // - blacklistedJWT: { reason: "logout", deviceInfo: "..." }
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Index để tự động xóa token hết hạn
tokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Index để tìm kiếm nhanh theo type và trạng thái
// Đã có unique index cho token trong schema definition, không cần khai báo lại
tokenSchema.index({ userId: 1, type: 1 });
tokenSchema.index({ type: 1, isUsed: 1 });
tokenSchema.index({ userId: 1, type: 1, isUsed: 1 });

// Static methods để dễ sử dụng
tokenSchema.statics.createResetPasswordToken = function (
  userId,
  token,
  expiresAt,
  metadata = {}
) {
  return this.create({
    token,
    userId,
    type: "reset_password",
    expiresAt,
    metadata,
  });
};

tokenSchema.statics.createBlacklistedJWT = function (
  userId,
  token,
  expiresAt,
  metadata = {}
) {
  return this.create({
    token,
    userId,
    type: "blacklisted_jwt",
    expiresAt,
    metadata,
  });
};

tokenSchema.statics.findResetPasswordToken = function (token) {
  return this.findOne({
    token,
    type: "reset_password",
    isUsed: false,
    expiresAt: { $gt: new Date() },
  }).populate("userId", "email name role");
};

tokenSchema.statics.findResetPasswordTokenByUser = function (userId, token) {
  return this.findOne({
    userId,
    token,
    type: "reset_password",
    isUsed: false,
    expiresAt: { $gt: new Date() },
  }).populate("userId", "email name role");
};

tokenSchema.statics.isJWTBlacklisted = function (token) {
  return this.findOne({
    token,
    type: "blacklisted_jwt",
  });
};

tokenSchema.statics.markResetTokenAsUsed = function (tokenId) {
  return this.findByIdAndUpdate(tokenId, { isUsed: true });
};

tokenSchema.statics.invalidateUserResetTokens = function (userId) {
  return this.updateMany(
    {
      userId,
      type: "reset_password",
      isUsed: false,
    },
    { isUsed: true }
  );
};

const Token = mongoose.model("Token", tokenSchema);

module.exports = Token;
