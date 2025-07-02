const { JsonWebTokenError } = require("jsonwebtoken");
const { User } = require("../models");
const { hashCompare } = require("../services/hashPassGen");
const authService = require("../services/role_services/authService");
const { createToken } = require("../utils/jwt");
const { getRoleId } = require("../utils/roleUtils");

require("dotenv").config();

const authController = {
  // Đăng nhập
  async login(req, res) {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({
          msg: "Email và password là bắt buộc",
        });
      }

      const user = await User.findOne({ email: email });
      if (!user) {
        return res.status(401).json({ msg: "Email không tồn tại" });
      }

      if (!user.isActive) {
        return res.status(401).json({ msg: "Tài khoản đã bị vô hiệu hóa" });
      }

      const isMatch = await hashCompare(password, user.password);
      if (!isMatch) {
        return res.status(401).json({ msg: "Sai mật khẩu" });
      }

      // Get roleId based on user's role
      const roleId = await getRoleId(user._id, user.role);

      const token = createToken({
        id: user._id,
        email: user.email,
        role: user.role,
        roleId: roleId,
      });

      return res.status(200).json({
        msg: "Đăng nhập thành công",
        token,
        user: {
          id: user._id,
          email: user.email,
          name: user.name,
          role: user.role,
          roleId: roleId,
        },
      });
    } catch (error) {
      return res.status(500).json({
        msg: "Lỗi server khi đăng nhập",
        error: error.message,
      });
    }
  },

  // Đăng xuất
  async logout(req, res) {
    try {
      const token = req.headers.authorization?.replace("Bearer ", "");
      const userId = req.user?.id;

      if (!token) {
        return res.status(400).json({
          msg: "Không tìm thấy token",
        });
      }

      const result = await authService.logout(token, userId);

      return res.status(200).json(result);
    } catch (error) {
      return res.status(500).json({
        msg: "Lỗi khi đăng xuất",
        error: error.message,
      });
    }
  }, // Yêu cầu reset password (gửi mã 6 số qua email)
  async requestResetPassword(req, res) {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({
          msg: "Email là bắt buộc",
        });
      }

      const result = await authService.createResetPasswordCode(email);

      return res.status(200).json({
        msg: "Đã gửi mã xác thực 6 số đến email của bạn",
        emailSent: result.emailSent,
        expiresIn: "15 phút",
        // Chỉ trả về mã trong development để test
        ...(process.env.NODE_ENV === "development" && {
          resetCode: result.resetCode,
        }),
      });
    } catch (error) {
      return res.status(500).json({
        msg: "Lỗi khi tạo mã reset password",
        error: error.message,
      });
    }
  },

  // Verify reset password token
  async verifyResetToken(req, res) {
    try {
      const { token } = req.params;

      if (!token) {
        return res.status(400).json({
          msg: "Token là bắt buộc",
        });
      }

      const result = await authService.verifyResetPasswordToken(token);

      return res.status(200).json({
        msg: "Token hợp lệ",
        valid: true,
        user: {
          email: result.user.email,
          name: result.user.name,
        },
      });
    } catch (error) {
      return res.status(400).json({
        msg: error.message,
        valid: false,
      });
    }
  }, // Xác thực mã 6 số (tùy chọn - để kiểm tra mã trước khi hiện form)
  async verifyResetCode(req, res) {
    try {
      const { email, code } = req.body;

      if (!email || !code) {
        return res.status(400).json({
          msg: "Email và mã xác thực là bắt buộc",
        });
      }

      if (code.length !== 6 || !/^\d{6}$/.test(code)) {
        return res.status(400).json({
          msg: "Mã xác thực phải là 6 chữ số",
        });
      }

      const result = await authService.verifyResetCode(email, code);

      return res.status(200).json({
        msg: "Mã xác thực hợp lệ. Bạn có thể đặt lại mật khẩu.",
        valid: true,
        user: {
          email: result.email,
          name: result.name,
        },
      });
    } catch (error) {
      return res.status(400).json({
        msg: error.message,
        valid: false,
      });
    }
  },

  // Đổi mật khẩu (cho user đã đăng nhập)
  async changePassword(req, res) {
    try {
      const { oldPassword, newPassword, confirmPassword } = req.body;
      const userId = req.user?.id;

      if (!oldPassword || !newPassword || !confirmPassword) {
        return res.status(400).json({
          msg: "Mật khẩu cũ, mật khẩu mới và xác nhận mật khẩu là bắt buộc",
        });
      }

      if (newPassword !== confirmPassword) {
        return res.status(400).json({
          msg: "Mật khẩu mới và xác nhận mật khẩu không khớp",
        });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({
          msg: "Mật khẩu phải có ít nhất 6 ký tự",
        });
      }

      const result = await authService.changePassword(
        userId,
        oldPassword,
        newPassword
      );

      return res.status(200).json(result);
    } catch (error) {
      return res.status(400).json({
        msg: error.message,
      });
    }
  }, // Reset password bằng mã 6 số
  async resetPasswordWithCode(req, res) {
    try {
      const { email, code, newPassword, confirmPassword } = req.body;

      if (!email || !code || !newPassword || !confirmPassword) {
        return res.status(400).json({
          msg: "Email, mã xác thực, mật khẩu mới và xác nhận mật khẩu là bắt buộc",
        });
      }

      if (code.length !== 6 || !/^\d{6}$/.test(code)) {
        return res.status(400).json({
          msg: "Mã xác thực phải là 6 chữ số",
        });
      }

      if (newPassword !== confirmPassword) {
        return res.status(400).json({
          msg: "Mật khẩu mới và xác nhận mật khẩu không khớp",
        });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({
          msg: "Mật khẩu phải có ít nhất 6 ký tự",
        });
      }

      const result = await authService.resetPasswordWithCode(
        email,
        code,
        newPassword
      );

      return res.status(200).json({
        msg: "Đặt lại mật khẩu thành công",
        success: true,
        user: {
          email: result.email,
          name: result.name,
        },
      });
    } catch (error) {
      return res.status(400).json({
        msg: error.message,
        success: false,
      });
    }
  },
};

module.exports = authController;
