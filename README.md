<div align="center">
  
# 🎓 English Center Backend - Episteme

**Hệ thống quản lý trung tâm tiếng Anh toàn diện**

[![Node.js](https://img.shields.io/badge/Node.js-v18+-green.svg)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-v4.18+-blue.svg)](https://expressjs.com/)
[![MongoDB](https://img.shields.io/badge/MongoDB-v6.0+-green.svg)](https://www.mongodb.com/)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

</div>

---

## 📖 Giới thiệu

Backend RESTful API cho hệ thống quản lý trung tâm tiếng Anh, hỗ trợ quản lý học sinh, giáo viên, lớp học, điểm danh, thanh toán học phí và nhiều tính năng khác.

## ✨ Tính năng chính

- 🔐 **Bảo mật và xác thực** - JWT với RBAC (Admin, Teacher, Parent, Student)
- 👥 **Quản lý người dùng** - CRUD đầy đủ cho tất cả vai trò
- 📚 **Quản lý lớp học** - Tạo lớp, phân công giáo viên, quản lý học sinh
- ✅ **Điểm danh** - Theo dõi tự động số buổi học và tỷ lệ điểm danh
- 💰 **Thanh toán** - Học phí học sinh, lương giáo viên, yêu cầu thanh toán
- 📧 **Email & Thông báo** - Email tự động và thông báo cá nhân hóa
- 📊 **Thống kê** - Dashboard tài chính và báo cáo chi tiết
- 📰 **Quảng cáo** - Quản lý banner với Cloudinary
- 🔄 **Transaction-safe** - MongoDB transactions cho data consistency

## 🚀 Bắt đầu nhanh

### Yêu cầu

- Node.js >= 18.0.0
- MongoDB >= 6.0.0
- npm hoặc yarn

### Cài đặt

```bash
# Clone repository
git clone https://github.com/ChauTungDuong/english-center_website.git
cd english-center_website

# Cài đặt dependencies
npm install

# Cấu hình môi trường
cp .env.example .env
# Chỉnh sửa file .env với thông tin của bạn

# Chạy server
npm run dev  # Development
npm start    # Production
```

Server sẽ chạy tại `http://localhost:3000`

## ⚙️ Cấu hình

Tạo file `.env` với các biến sau:

```env
# Server
NODE_ENV=development
PORT=3000

# Database
DB_URI=mongodb://localhost:27017/english_center

# JWT
JWT_SECRET=your_secret_key
JWT_EXPIRES_IN=7d

# Cloudinary
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Email
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password
```

## 📚 API Documentation

### Base URL

```
http://localhost:3000/v1/api
```

### Authentication

Tất cả protected routes yêu cầu JWT token:

```
Authorization: Bearer <token>
```

### Endpoints chính

#### 🔐 Auth

- `POST /auth/register` - Đăng ký
- `POST /auth/login` - Đăng nhập
- `POST /auth/logout` - Đăng xuất

#### 👤 Users

- `GET /users/profile` - Lấy thông tin user
- `PATCH /users/profile` - Cập nhật profile
- `PATCH /users/change-password` - Đổi mật khẩu

#### 📚 Classes

- `GET /classes` - Danh sách lớp học
- `POST /classes` - Tạo lớp mới (Admin)
- `GET /classes/:id` - Chi tiết lớp
- `PATCH /classes/:id` - Cập nhật lớp (Admin)

#### 🎓 Students

- `GET /students` - Danh sách học sinh (Admin)
- `POST /students` - Tạo học sinh (Admin)
- `GET /students/:id` - Chi tiết học sinh

#### 👨‍🏫 Teachers

- `GET /teachers` - Danh sách giáo viên (Admin)
- `GET /teachers/my-classes` - Lớp của giáo viên

#### 👨‍👩‍👧 Parents

- `GET /parents/my-children-details` - Thông tin con
- `GET /parents/my-unpaid-payments` - Học phí chưa đóng

#### ✅ Attendance

- `GET /attendance` - Danh sách điểm danh
- `POST /attendance` - Tạo điểm danh (Teacher)

#### 💰 Payments

- `GET /payments` - Danh sách học phí (Admin)
- `GET /payments/summary` - Thống kê học phí
- `PATCH /payments/:id/record` - Ghi nhận thanh toán

#### 💸 Parent Payment Requests

- `GET /parent-payment-requests/my-requests` - Yêu cầu của phụ huynh
- `POST /parent-payment-requests/my-request` - Tạo yêu cầu mới
- `PATCH /parent-payment-requests/:id/process` - Duyệt yêu cầu (Admin)

#### 📊 Statistics

- `GET /statistics/overview` - Tổng quan hệ thống (Admin)
- `GET /statistics/class/:id` - Thống kê theo lớp

Chi tiết đầy đủ xem tại [API Documentation](./docs/API_DOCUMENTATION.md)

## 📁 Cấu trúc dự án

```
src/
├── config/              # Cấu hình database
├── controllers/         # Xử lý request/response
├── models/              # Mongoose schemas
├── routes/              # API routes
├── services/            # Business logic
│   ├── role_services/   # Services theo role
│   ├── relationship_services/
│   └── shared/          # Shared services
├── middleware/          # Express middleware
├── utils/               # Utility functions
└── server.js            # Entry point
```

## 🛠️ Tech Stack

- **Backend**: Node.js, Express.js
- **Database**: MongoDB, Mongoose
- **Authentication**: JWT, bcrypt
- **File Upload**: Multer, Cloudinary
- **Email**: Nodemailer
- **Scheduling**: node-cron

## 🔒 Bảo mật

- JWT-based authentication
- Password hashing với bcrypt
- Role-Based Access Control (RBAC)
- Input validation & sanitization
- CORS configuration
- File upload validation
- MongoDB transactions

## 📊 Database Schema

Các collection chính:

- **Users** - Thông tin người dùng
- **Students** - Học sinh
- **Teachers** - Giáo viên
- **Parents** - Phụ huynh
- **Classes** - Lớp học
- **Attendance** - Điểm danh
- **Payments** - Học phí
- **ParentPaymentRequest** - Yêu cầu thanh toán
- **TeacherWage** - Lương giáo viên
- **Notifications** - Thông báo
- **Advertisements** - Quảng cáo

## 🚀 Deployment

### Render.com

```bash
# Push code lên GitHub
git push origin main

# Tạo Web Service trên Render và cấu hình:
# - Build Command: npm install
# - Start Command: npm start
# - Environment Variables: Thêm tất cả biến từ .env
```

## 📝 Scripts

```bash
npm start          # Chạy production
npm run dev        # Chạy development với nodemon
npm test           # Chạy tests
npm run lint       # Kiểm tra code style
```

## 👥 Authors

- **Châu Tùng Dương** - [ChauTungDuong](https://github.com/ChauTungDuong)

## 📧 Contact

Email: tungduong.forwork@gmail.com

Project Link: [https://github.com/ChauTungDuong/english-center_website](https://github.com/ChauTungDuong/english-center_website)

---

<div align="center">
Made for Episteme English Center
</div>
