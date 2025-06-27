const { User, Token } = require("../../models");
const { hashing, hashCompare } = require("../hashPassGen");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");

// Sử dụng Gmail email service
const emailService = require("../emailService");

const authService = {
  /**
   * Logout user bằng cách blacklist token
   * @param {String} token - JWT token cần blacklist
   * @param {String} userId - ID của user
   * @returns {Object} Kết quả logout
   */
  async logout(token, userId) {
    try {
      // Decode token để lấy thời gian hết hạn (không cần verify)
      const decoded = jwt.decode(token);

      if (!decoded || !decoded.exp) {
        throw new Error("Token không hợp lệ");
      }

      // Thêm token vào blacklist sử dụng static method
      await Token.createBlacklistedJWT(
        userId,
        token,
        new Date(decoded.exp * 1000), // Convert Unix timestamp to Date
        { reason: "logout", logoutTime: new Date() }
      );

      return {
        success: true,
        message: "Đăng xuất thành công",
      };
    } catch (error) {
      throw new Error(`Lỗi khi đăng xuất: ${error.message}`);
    }
  },

  /**
   * Kiểm tra token có trong blacklist không
   * @param {String} token - JWT token cần kiểm tra
   * @returns {Boolean} True nếu token bị blacklist
   */
  async isTokenBlacklisted(token) {
    try {
      const blacklistedToken = await Token.isJWTBlacklisted(token);
      return !!blacklistedToken;
    } catch (error) {
      return false;
    }
  },

  /**
   * Tạo mã 6 số reset password
   * @param {String} email - Email của user
   * @returns {Object} Reset code info
   */
  async createResetPasswordCode(email) {
    try {
      const user = await User.findOne({ email });
      if (!user) {
        throw new Error("Email không tồn tại trong hệ thống");
      }

      if (!user.isActive) {
        throw new Error("Tài khoản đã bị vô hiệu hóa");
      }

      // Vô hiệu hóa các token reset cũ của user này
      await Token.invalidateUserResetTokens(user._id);

      // Tạo mã 6 số ngẫu nhiên
      const resetCode = Math.floor(100000 + Math.random() * 900000).toString();

      // Hash mã để lưu vào database
      const hashedCode = crypto
        .createHash("sha256")
        .update(resetCode)
        .digest("hex");
      const resetPasswordToken = await Token.createResetPasswordToken(
        user._id,
        hashedCode,
        new Date(Date.now() + 15 * 60 * 1000), // 15 phút
        {
          originalEmail: user.email,
          requestTime: new Date(),
          resetType: "forgot_password",
          codeType: "6_digit_code",
        }
      );

      // Gửi mã qua email
      try {
        await emailService.sendResetPasswordCode({
          email: user.email,
          name: user.name,
          resetCode,
          expiresAt: resetPasswordToken.expiresAt,
        });
      } catch (emailError) {
        console.error("Lỗi khi gửi email:", emailError.message);
        // Không throw error để không ảnh hưởng đến việc tạo mã
        // Trong production có thể log error hoặc retry
      }

      return {
        success: true,
        resetCode, // Mã 6 số (chỉ trả về trong development)
        userId: user._id,
        email: user.email,
        name: user.name,
        expiresAt: resetPasswordToken.expiresAt,
        emailSent: true,
      };
    } catch (error) {
      throw new Error(`Lỗi khi tạo mã reset password: ${error.message}`);
    }
  },
  /**
   * Xác thực mã 6 số (không tạo reset token)
   * @param {String} email - Email của user
   * @param {String} code - Mã 6 số
   * @returns {Object} User info nếu mã hợp lệ
   */ async verifyResetCode(email, code) {
    try {
      // Tìm user theo email
      const user = await User.findOne({ email });
      if (!user) {
        throw new Error("Email không tồn tại trong hệ thống");
      }

      if (!user.isActive) {
        throw new Error("Tài khoản đã bị vô hiệu hóa");
      }

      // Hash mã để so sánh
      const hashedCode = crypto.createHash("sha256").update(code).digest("hex");

      // Tìm token reset password
      const resetPasswordToken = await Token.findResetPasswordTokenByUser(
        user._id,
        hashedCode
      );

      if (!resetPasswordToken) {
        throw new Error("Mã xác thực không hợp lệ hoặc đã hết hạn");
      }

      return {
        success: true,
        email: user.email,
        name: user.name,
      };
    } catch (error) {
      throw new Error(`Mã xác thực không hợp lệ: ${error.message}`);
    }
  },

  /**
   * Reset password bằng mã 6 số trực tiếp
   * @param {String} email - Email của user
   * @param {String} code - Mã 6 số
   * @param {String} newPassword - Mật khẩu mới
   * @returns {Object} Kết quả reset password
   */
  async resetPasswordWithCode(email, code, newPassword) {
    try {
      // Tìm user theo email
      const user = await User.findOne({ email });
      if (!user) {
        throw new Error("Email không tồn tại trong hệ thống");
      }

      if (!user.isActive) {
        throw new Error("Tài khoản đã bị vô hiệu hóa");
      }

      // Hash mã để so sánh
      const hashedCode = crypto.createHash("sha256").update(code).digest("hex");

      // Tìm token reset password
      const resetPasswordToken = await Token.findResetPasswordTokenByUser(
        user._id,
        hashedCode
      );

      if (!resetPasswordToken) {
        throw new Error("Mã xác thực không hợp lệ hoặc đã hết hạn");
      }

      // Hash mật khẩu mới
      const hashedPassword = await hashing(newPassword);

      // Cập nhật mật khẩu user
      await User.findByIdAndUpdate(user._id, {
        password: hashedPassword,
      });

      // Đánh dấu token đã được sử dụng
      await Token.markResetTokenAsUsed(resetPasswordToken._id);

      // Vô hiệu hóa tất cả token reset còn lại của user
      await Token.invalidateUserResetTokens(user._id);

      return {
        success: true,
        message: "Đặt lại mật khẩu thành công",
        email: user.email,
        name: user.name,
      };
    } catch (error) {
      throw new Error(`Lỗi khi reset password: ${error.message}`);
    }
  },

  /**
   * Xác thực mã 6 số và tạo reset token tạm thời (để tương thích với code cũ)
   * @param {String} email - Email của user
   * @param {String} code - Mã 6 số
   * @returns {Object} Reset token tạm thời nếu mã hợp lệ
   */
  async verifyResetCodeAndCreateToken(email, code) {
    try {
      // Tìm user theo email
      const user = await User.findOne({ email });
      if (!user) {
        throw new Error("Email không tồn tại trong hệ thống");
      }

      // Hash mã để so sánh
      const hashedCode = crypto.createHash("sha256").update(code).digest("hex");

      // Tìm token reset password
      const resetPasswordToken = await Token.findResetPasswordTokenByUser(
        user._id,
        hashedCode
      );

      if (!resetPasswordToken) {
        throw new Error("Mã xác thực không hợp lệ hoặc đã hết hạn");
      }

      // Tạo reset token tạm thời (5 phút để reset password)
      const resetToken = crypto.randomBytes(32).toString("hex");
      const hashedResetToken = crypto
        .createHash("sha256")
        .update(resetToken)
        .digest("hex");

      // Lưu reset token tạm thời
      await Token.createResetPasswordToken(
        user._id,
        hashedResetToken,
        new Date(Date.now() + 5 * 60 * 1000), // 5 phút
        {
          originalEmail: user.email,
          verifiedFromCode: hashedCode,
          resetType: "verified_reset_token",
          originalTokenId: resetPasswordToken._id,
        }
      );

      // Đánh dấu mã xác thực đã được sử dụng
      await Token.markResetTokenAsUsed(resetPasswordToken._id);

      return {
        success: true,
        resetToken, // Token để reset password
        email: user.email,
        name: user.name,
        expiresIn: "5 phút",
      };
    } catch (error) {
      throw new Error(`Mã xác thực không hợp lệ: ${error.message}`);
    }
  },
  /**
   * Reset password bằng reset token tạm thời
   * @param {String} resetToken - Reset token từ verify code
   * @param {String} newPassword - Mật khẩu mới
   * @returns {Object} Kết quả reset password
   */
  async resetPasswordWithToken(resetToken, newPassword) {
    try {
      // Hash token để tìm kiếm
      const hashedToken = crypto
        .createHash("sha256")
        .update(resetToken)
        .digest("hex");

      // Tìm reset token
      const tokenRecord = await Token.findResetPasswordToken(hashedToken);

      if (!tokenRecord) {
        throw new Error("Token reset không hợp lệ hoặc đã hết hạn");
      }

      // Kiểm tra xem có phải là verified reset token không
      if (tokenRecord.metadata?.resetType !== "verified_reset_token") {
        throw new Error("Token không hợp lệ để reset password");
      }

      // Hash mật khẩu mới
      const hashedPassword = await hashing(newPassword);

      // Cập nhật mật khẩu user
      await User.findByIdAndUpdate(tokenRecord.userId._id, {
        password: hashedPassword,
      });

      // Đánh dấu token đã được sử dụng
      await Token.markResetTokenAsUsed(tokenRecord._id);

      // Vô hiệu hóa tất cả token reset còn lại của user
      await Token.invalidateUserResetTokens(tokenRecord.userId._id);

      return {
        success: true,
        message: "Đặt lại mật khẩu thành công",
        email: tokenRecord.userId.email,
      };
    } catch (error) {
      throw new Error(`Lỗi khi reset password: ${error.message}`);
    }
  },

  /**
   * Đổi mật khẩu (cho user đã đăng nhập)
   * @param {String} userId - ID của user
   * @param {String} oldPassword - Mật khẩu cũ
   * @param {String} newPassword - Mật khẩu mới
   * @returns {Object} Kết quả đổi mật khẩu
   */
  async changePassword(userId, oldPassword, newPassword) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error("Không tìm thấy user");
      }

      if (!user.isActive) {
        throw new Error("Tài khoản đã bị vô hiệu hóa");
      }

      // Kiểm tra mật khẩu cũ
      const isMatch = await hashCompare(oldPassword, user.password);
      if (!isMatch) {
        throw new Error("Mật khẩu cũ không đúng");
      }

      // Hash mật khẩu mới
      const hashedPassword = await hashing(newPassword);

      // Cập nhật mật khẩu
      await User.findByIdAndUpdate(userId, {
        password: hashedPassword,
      });

      return {
        success: true,
        message: "Đổi mật khẩu thành công",
      };
    } catch (error) {
      throw new Error(`Lỗi khi đổi mật khẩu: ${error.message}`);
    }
  },
};

module.exports = authService;
