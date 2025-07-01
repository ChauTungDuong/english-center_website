const { BaseService } = require("../../core/utils");
const {
  ValidationError,
  NotFoundError,
  AuthenticationError,
} = require("../../core/errors/AppError");
const { User, Token } = require("../../models");
const { hashing, hashCompare } = require("../hashPassGen");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const emailService = require("../emailService");

class AuthService extends BaseService {
  constructor() {
    super(User);
  }

  /**
   * Authenticate user login
   */
  async login(email, password) {
    if (!email || !password) {
      throw new ValidationError("Email and password are required");
    }

    const user = await User.findOne({ email }).select("+password");
    if (!user) {
      throw new AuthenticationError("Invalid email or password");
    }

    if (!user.isActive) {
      throw new AuthenticationError("Account has been deactivated");
    }

    const isPasswordValid = await hashCompare(password, user.password);
    if (!isPasswordValid) {
      throw new AuthenticationError("Invalid email or password");
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        id: user._id,
        email: user.email,
        role: user.role,
        name: user.name || user.fullName,
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
    );

    // Remove password from response
    const userResponse = user.toObject();
    delete userResponse.password;

    return {
      user: userResponse,
      token,
      message: "Login successful",
    };
  }

  /**
   * Register new user
   */
  async register(userData) {
    const { email, password, role = "Student", ...otherData } = userData;

    if (!email || !password) {
      throw new ValidationError("Email and password are required");
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      throw new ValidationError("User with this email already exists");
    }

    // Hash password
    const hashedPassword = await hashing(password);

    // Create user
    const user = await this.create({
      email,
      password: hashedPassword,
      role,
      isActive: true,
      ...otherData,
    });

    // Remove password from response
    const userResponse = user.toObject();
    delete userResponse.password;

    return {
      user: userResponse,
      message: "User registered successfully",
    };
  }

  /**
   * Logout user by blacklisting token
   */
  async logout(token, userId) {
    // Decode token to get expiration time (without verification)
    const decoded = jwt.decode(token);

    if (!decoded || !decoded.exp) {
      throw new ValidationError("Invalid token");
    }

    // Add token to blacklist
    await Token.createBlacklistedJWT(
      userId,
      token,
      new Date(decoded.exp * 1000), // Convert Unix timestamp to Date
      { reason: "logout", logoutTime: new Date() }
    );

    return {
      success: true,
      message: "Logout successful",
    };
  }

  /**
   * Check if token is blacklisted
   */
  async isTokenBlacklisted(token) {
    try {
      const blacklistedToken = await Token.isJWTBlacklisted(token);
      return !!blacklistedToken;
    } catch (error) {
      return false;
    }
  }

  /**
   * Create 6-digit reset password code
   */
  async createResetPasswordCode(email) {
    const user = await User.findOne({ email });
    if (!user) {
      throw new NotFoundError("Email not found in system");
    }

    if (!user.isActive) {
      throw new ValidationError("Account has been deactivated");
    }

    // Invalidate old reset tokens for this user
    await Token.invalidateUserResetTokens(user._id);

    // Generate 6-digit random code
    const resetCode = Math.floor(100000 + Math.random() * 900000).toString();

    // Hash code for database storage
    const hashedCode = crypto
      .createHash("sha256")
      .update(resetCode)
      .digest("hex");

    await Token.createResetPasswordToken(
      user._id,
      hashedCode,
      new Date(Date.now() + 15 * 60 * 1000), // 15 minutes
      {
        originalEmail: user.email,
        requestTime: new Date(),
        resetType: "forgot_password",
        codeType: "6_digit_code",
      }
    );

    // Send code via email
    try {
      await emailService.sendResetPasswordCode({
        email: user.email,
        name: user.name || user.fullName,
        resetCode,
      });
    } catch (emailError) {
      console.error("Failed to send reset code email:", emailError);
      throw new Error("Failed to send reset code. Please try again.");
    }

    return {
      success: true,
      message: "Reset code sent to your email",
      email: user.email,
    };
  }

  /**
   * Verify reset code
   */
  async verifyResetCode(email, code) {
    if (!email || !code) {
      throw new ValidationError("Email and code are required");
    }

    const user = await User.findOne({ email });
    if (!user) {
      throw new NotFoundError("Email not found");
    }

    // Hash the provided code to compare with stored hash
    const hashedCode = crypto
      .createHash("sha256")
      .update(code.toString())
      .digest("hex");

    const resetToken = await Token.findValidResetToken(user._id, hashedCode);
    if (!resetToken) {
      throw new ValidationError("Invalid or expired reset code");
    }

    return {
      success: true,
      message: "Reset code verified successfully",
      email: user.email,
    };
  }

  /**
   * Reset password with code
   */
  async resetPasswordWithCode(email, code, newPassword) {
    if (!email || !code || !newPassword) {
      throw new ValidationError("Email, code, and new password are required");
    }

    const user = await User.findOne({ email });
    if (!user) {
      throw new NotFoundError("Email not found");
    }

    // Hash the provided code
    const hashedCode = crypto
      .createHash("sha256")
      .update(code.toString())
      .digest("hex");

    const resetToken = await Token.findValidResetToken(user._id, hashedCode);
    if (!resetToken) {
      throw new ValidationError("Invalid or expired reset code");
    }

    // Hash new password
    const hashedPassword = await hashing(newPassword);

    // Update user password
    await User.findByIdAndUpdate(user._id, { password: hashedPassword });

    // Invalidate all reset tokens for this user
    await Token.invalidateUserResetTokens(user._id);

    // Also blacklist all existing JWT tokens for security
    await Token.blacklistAllUserJWTs(user._id);

    return {
      success: true,
      message: "Password reset successfully",
    };
  }

  /**
   * Verify reset code and create temporary token
   */
  async verifyResetCodeAndCreateToken(email, code) {
    if (!email || !code) {
      throw new ValidationError("Email and code are required");
    }

    const user = await User.findOne({ email });
    if (!user) {
      throw new NotFoundError("Email not found");
    }

    // Hash the provided code
    const hashedCode = crypto
      .createHash("sha256")
      .update(code.toString())
      .digest("hex");

    const resetToken = await Token.findValidResetToken(user._id, hashedCode);
    if (!resetToken) {
      throw new ValidationError("Invalid or expired reset code");
    }

    // Create temporary token for password reset (valid for 15 minutes)
    const tempToken = jwt.sign(
      {
        id: user._id,
        email: user.email,
        type: "password_reset",
        resetTokenId: resetToken._id,
      },
      process.env.JWT_SECRET,
      { expiresIn: "15m" }
    );

    return {
      success: true,
      message: "Reset code verified. Use token to reset password.",
      resetToken: tempToken,
      expiresIn: "15 minutes",
    };
  }

  /**
   * Reset password with temporary token
   */
  async resetPasswordWithToken(resetToken, newPassword) {
    if (!resetToken || !newPassword) {
      throw new ValidationError("Reset token and new password are required");
    }

    let decoded;
    try {
      decoded = jwt.verify(resetToken, process.env.JWT_SECRET);
    } catch (error) {
      throw new ValidationError("Invalid or expired reset token");
    }

    if (decoded.type !== "password_reset") {
      throw new ValidationError("Invalid token type");
    }

    const user = await User.findById(decoded.id);
    if (!user) {
      throw new NotFoundError("User not found");
    }

    // Verify the original reset token is still valid
    const originalResetToken = await Token.findById(decoded.resetTokenId);
    if (!originalResetToken || originalResetToken.isUsed) {
      throw new ValidationError("Reset token has been used or is invalid");
    }

    // Hash new password
    const hashedPassword = await hashing(newPassword);

    // Update user password
    await User.findByIdAndUpdate(user._id, { password: hashedPassword });

    // Mark reset token as used
    await Token.findByIdAndUpdate(originalResetToken._id, { isUsed: true });

    // Invalidate all reset tokens for this user
    await Token.invalidateUserResetTokens(user._id);

    // Also blacklist all existing JWT tokens for security
    await Token.blacklistAllUserJWTs(user._id);

    return {
      success: true,
      message: "Password reset successfully",
    };
  }

  /**
   * Change password for authenticated user
   */
  async changePassword(userId, oldPassword, newPassword) {
    if (!oldPassword || !newPassword) {
      throw new ValidationError("Old password and new password are required");
    }

    const user = await User.findById(userId).select("+password");
    if (!user) {
      throw new NotFoundError("User not found");
    }

    // Verify old password
    const isOldPasswordValid = await hashCompare(oldPassword, user.password);
    if (!isOldPasswordValid) {
      throw new ValidationError("Current password is incorrect");
    }

    // Hash new password
    const hashedPassword = await hashing(newPassword);

    // Update password
    await User.findByIdAndUpdate(userId, { password: hashedPassword });

    // For security, blacklist all existing JWT tokens
    await Token.blacklistAllUserJWTs(userId);

    return {
      success: true,
      message: "Password changed successfully. Please login again.",
    };
  }

  /**
   * Verify JWT token
   */
  async verifyToken(token) {
    try {
      // Check if token is blacklisted
      const isBlacklisted = await this.isTokenBlacklisted(token);
      if (isBlacklisted) {
        throw new AuthenticationError("Token has been invalidated");
      }

      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Get user to ensure they still exist and are active
      const user = await User.findById(decoded.id);
      if (!user || !user.isActive) {
        throw new AuthenticationError("User not found or deactivated");
      }

      return { valid: true, user: decoded };
    } catch (error) {
      if (error instanceof jwt.JsonWebTokenError) {
        throw new AuthenticationError("Invalid token");
      }
      if (error instanceof jwt.TokenExpiredError) {
        throw new AuthenticationError("Token has expired");
      }
      throw error;
    }
  }

  /**
   * Refresh JWT token
   */
  async refreshToken(token) {
    const { valid, user } = await this.verifyToken(token);

    if (!valid) {
      throw new AuthenticationError("Invalid token for refresh");
    }

    // Generate new token
    const newToken = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role,
        name: user.name,
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
    );

    // Optionally blacklist old token
    await this.logout(token, user.id);

    return {
      token: newToken,
      message: "Token refreshed successfully",
    };
  }

  /**
   * Get user profile
   */
  async getProfile(userId) {
    const user = await User.findById(userId).select("-password");
    if (!user) {
      throw new NotFoundError("User not found");
    }

    return user;
  }

  /**
   * Update user profile
   */
  async updateProfile(userId, updateData) {
    // Remove sensitive fields that shouldn't be updated via this method
    const { password, role, isActive, email, ...allowedUpdates } = updateData;

    const user = await User.findByIdAndUpdate(userId, allowedUpdates, {
      new: true,
      runValidators: true,
    }).select("-password");

    if (!user) {
      throw new NotFoundError("User not found");
    }

    return user;
  }
}

module.exports = new AuthService();
