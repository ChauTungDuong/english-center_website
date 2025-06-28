const nodemailer = require("nodemailer");

class EmailService {
  constructor() {
    // Cấu hình transporter cho Gmail hoặc SMTP
    this.transporter = nodemailer.createTransporter({
      service: process.env.EMAIL_SERVICE || "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
    });
  }

  async sendEmail({ to, subject, html, text }) {
    try {
      console.log(`📧 Sending email to: ${to}`);
      console.log(`📧 Subject: ${subject}`);

      const mailOptions = {
        from: `"English Center" <${process.env.EMAIL_USER}>`,
        to: Array.isArray(to) ? to.join(", ") : to,
        subject,
        html: html || text,
        text: text || undefined,
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log(`✅ Email sent successfully: ${result.messageId}`);

      return {
        success: true,
        messageId: result.messageId,
        recipients: Array.isArray(to) ? to : [to],
      };
    } catch (error) {
      console.error(`❌ Email sending failed:`, error);

      // Log detailed error for debugging
      if (error.code === "EAUTH") {
        console.error(
          "Authentication failed - check EMAIL_USER and EMAIL_PASSWORD"
        );
      } else if (error.code === "ENOTFOUND") {
        console.error("DNS lookup failed - check internet connection");
      }

      throw new Error(`Lỗi gửi email: ${error.message}`);
    }
  }

  async sendBulkEmail({ recipients, subject, html, text }) {
    try {
      console.log(`📧 Sending bulk email to ${recipients.length} recipients`);

      const promises = recipients.map((email) =>
        this.sendEmail({ to: email, subject, html, text })
      );

      const results = await Promise.allSettled(promises);

      const successful = results.filter((r) => r.status === "fulfilled").length;
      const failed = results.filter((r) => r.status === "rejected").length;

      console.log(
        `📊 Bulk email results: ${successful} sent, ${failed} failed`
      );

      return {
        total: recipients.length,
        successful,
        failed,
        results,
      };
    } catch (error) {
      console.error("❌ Bulk email sending failed:", error);
      throw error;
    }
  }

  // Template cho thông báo nghỉ học
  getClassAbsenceTemplate({ className, date, reason, message, teacherName }) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #667eea; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9f9f9; }
          .footer { padding: 15px; text-align: center; color: #666; font-size: 12px; }
          .highlight { background: #fff3cd; padding: 10px; border-left: 4px solid #ffc107; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>🏫 Thông báo nghỉ học</h2>
          </div>
          <div class="content">
            <div class="highlight">
              <p><strong>📚 Lớp:</strong> ${className}</p>
              <p><strong>📅 Ngày nghỉ:</strong> ${new Date(
                date
              ).toLocaleDateString("vi-VN")}</p>
              <p><strong>📝 Lý do:</strong> ${reason}</p>
            </div>
            <h3>Thông báo từ giáo viên:</h3>
            <p style="white-space: pre-line;">${message}</p>
            ${
              teacherName
                ? `<p><strong>Giáo viên:</strong> ${teacherName}</p>`
                : ""
            }
          </div>
          <div class="footer">
            <p>📧 Email tự động từ English Center</p>
            <p>Vui lòng không reply email này</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  // Template cho thông báo vắng mặt và thanh toán
  getAttendancePaymentTemplate({
    studentName,
    className,
    absenceCount,
    totalUnpaid,
    unpaidPayments,
  }) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #28a745; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9f9f9; }
          .footer { padding: 15px; text-align: center; color: #666; font-size: 12px; }
          .alert { background: #f8d7da; color: #721c24; padding: 15px; border-radius: 5px; margin: 10px 0; }
          .info { background: #d1ecf1; color: #0c5460; padding: 15px; border-radius: 5px; margin: 10px 0; }
          .payment-list { background: white; padding: 15px; border-radius: 5px; }
          .payment-item { border-bottom: 1px solid #eee; padding: 10px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>📊 Báo cáo vắng mặt & thanh toán</h2>
          </div>
          <div class="content">
            <div class="info">
              <p><strong>👨‍🎓 Học sinh:</strong> ${studentName}</p>
              <p><strong>📚 Lớp:</strong> ${className}</p>
            </div>
            
            ${
              absenceCount > 0
                ? `
              <div class="alert">
                <p><strong>⚠️ Số buổi vắng tháng này:</strong> ${absenceCount} buổi</p>
              </div>
            `
                : `
              <div class="info">
                <p><strong>✅ Tham gia đầy đủ:</strong> Không có buổi vắng nào</p>
              </div>
            `
            }
            
            ${
              totalUnpaid > 0
                ? `
              <div class="alert">
                <p><strong>💰 Tổng số tiền chưa đóng:</strong> ${totalUnpaid.toLocaleString(
                  "vi-VN"
                )} VNĐ</p>
              </div>
              
              ${
                unpaidPayments.length > 0
                  ? `
                <div class="payment-list">
                  <h4>Chi tiết các khoản chưa thanh toán:</h4>
                  ${unpaidPayments
                    .map(
                      (payment) => `
                    <div class="payment-item">
                      <strong>${payment.description}</strong><br>
                      Số tiền: ${payment.amount.toLocaleString("vi-VN")} VNĐ<br>
                      <small>Hạn thanh toán: ${new Date(
                        payment.dueDate
                      ).toLocaleDateString("vi-VN")}</small>
                    </div>
                  `
                    )
                    .join("")}
                </div>
              `
                  : ""
              }
            `
                : `
              <div class="info">
                <p><strong>✅ Thanh toán:</strong> Không có khoản nào chưa thanh toán</p>
              </div>
            `
            }
          </div>
          <div class="footer">
            <p>📧 Email tự động từ English Center</p>
            <p>Liên hệ: support@englishcenter.com | 📞 0123-456-789</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }
}

module.exports = new EmailService();
