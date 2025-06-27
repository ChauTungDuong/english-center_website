const nodemailer = require("nodemailer");
require("dotenv").config();

class EmailService {
  constructor() {
    this.transporter = null;
    this.initializeTransporter();
  }
  initializeTransporter() {
    // Cấu hình cho Gmail
    this.transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER, // Email của bạn
        pass: process.env.EMAIL_PASSWORD, // App password của Gmail
      },
    });

    // Hoặc cấu hình SMTP tùy chỉnh
    // this.transporter = nodemailer.createTransport({
    //   host: process.env.SMTP_HOST,
    //   port: process.env.SMTP_PORT,
    //   secure: false, // true for 465, false for other ports
    //   auth: {
    //     user: process.env.EMAIL_USER,
    //     pass: process.env.EMAIL_PASSWORD,
    //   },
    // });
  }

  /**
   * Gửi mã reset password qua email
   * @param {Object} data - Dữ liệu email
   * @param {String} data.email - Email người nhận
   * @param {String} data.name - Tên người nhận
   * @param {String} data.resetCode - Mã 6 số
   * @param {Date} data.expiresAt - Thời gian hết hạn
   * @returns {Object} Kết quả gửi email
   */
  async sendResetPasswordCode(data) {
    try {
      const { email, name, resetCode, expiresAt } = data;

      // Tính thời gian hết hạn
      const expiresInMinutes = Math.ceil(
        (expiresAt - new Date()) / (1000 * 60)
      );

      const mailOptions = {
        from: {
          name: "Episteme English Center - Trung tâm tiếng Anh Episteme",
          address: process.env.EMAIL_USER,
        },
        to: email,
        subject: "Mã xác thực đặt lại mật khẩu - Episteme English Center",
        html: this.generateResetPasswordHTML(name, resetCode, expiresInMinutes),
        text: this.generateResetPasswordText(name, resetCode, expiresInMinutes),
      };

      const result = await this.transporter.sendMail(mailOptions);

      return {
        success: true,
        messageId: result.messageId,
        message: "Email đã được gửi thành công",
      };
    } catch (error) {
      console.error("Lỗi khi gửi email:", error);
      throw new Error(`Không thể gửi email: ${error.message}`);
    }
  }

  /**
   * Tạo nội dung HTML cho email reset password
   */
  generateResetPasswordHTML(name, resetCode, expiresInMinutes) {
    return `
    <!DOCTYPE html>
    <html lang="vi">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Đặt lại mật khẩu</title>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #4CAF50; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 5px 5px; }
            .code-box { background: #fff; border: 2px dashed #4CAF50; padding: 20px; margin: 20px 0; text-align: center; border-radius: 5px; }
            .code { font-size: 32px; font-weight: bold; color: #4CAF50; letter-spacing: 8px; }
            .warning { background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #666; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🔐 English Center</h1>
                <p>Yêu cầu đặt lại mật khẩu</p>
            </div>
            <div class="content">
                <p>Xin chào <strong>${name || "bạn"}</strong>,</p>
                
                <p>Chúng tôi đã nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn.</p>
                
                <div class="code-box">
                    <p><strong>Mã xác thực của bạn:</strong></p>
                    <div class="code">${resetCode}</div>
                </div>
                
                <div class="warning">
                    <p><strong>⚠️ Lưu ý quan trọng:</strong></p>
                    <ul>
                        <li>Mã này sẽ hết hạn sau <strong>${expiresInMinutes} phút</strong></li>
                        <li>Chỉ sử dụng mã này nếu bạn đã yêu cầu đặt lại mật khẩu</li>
                        <li>Không chia sẻ mã này với bất kỳ ai</li>
                    </ul>
                </div>
                
                <p><strong>Các bước tiếp theo:</strong></p>
                <ol>
                    <li>Quay lại trang đăng nhập</li>
                    <li>Nhập mã xác thực: <code>${resetCode}</code></li>
                    <li>Tạo mật khẩu mới</li>
                </ol>
                
                <p>Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này.</p>
                
                <p>Trân trọng,<br><strong>Đội ngũ English Center</strong></p>
            </div>
            <div class="footer">
                <p>Email được gửi tự động, vui lòng không trả lời email này.</p>
                <p>&copy; ${new Date().getFullYear()} English Center. All rights reserved.</p>
            </div>
        </div>
    </body>
    </html>
    `;
  }

  /**
   * Tạo nội dung text cho email reset password
   */
  generateResetPasswordText(name, resetCode, expiresInMinutes) {
    return `
Episteme English Center - Đặt lại mật khẩu

Xin chào ${name || "bạn"},

Chúng tôi đã nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn.

MÃ XÁC THỰC: ${resetCode}

Lưu ý quan trọng:
- Mã này sẽ hết hạn sau ${expiresInMinutes} phút
- Chỉ sử dụng mã này nếu bạn đã yêu cầu đặt lại mật khẩu
- Không chia sẻ mã này với bất kỳ ai

Các bước tiếp theo:
1. Quay lại trang đăng nhập
2. Nhập mã xác thực: ${resetCode}
3. Tạo mật khẩu mới

Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này.

Trân trọng,
Đội ngũ English Center

---
Email được gửi tự động, vui lòng không trả lời email này.
© ${new Date().getFullYear()} English Center. All rights reserved.
    `;
  }

  /**
   * Kiểm tra kết nối email
   */
  async verifyConnection() {
    try {
      await this.transporter.verify();
      return { success: true, message: "Kết nối email thành công" };
    } catch (error) {
      console.error("Lỗi kết nối email:", error);
      return { success: false, message: error.message };
    }
  }
}

module.exports = new EmailService();
