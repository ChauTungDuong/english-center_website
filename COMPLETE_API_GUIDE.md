# 📚 TÀI LIỆU HƯỚNG DẪN SỬ DỤNG API - ENGLISH CENTER

## 🔐 XÁC THỰC (AUTHENTICATION)

### Base URL

```
Production: https://english-center-website.onrender.com
Development: http://localhost:3000
```

### Headers cần thiết

```
Authorization: Bearer <token>
Content-Type: application/json (hoặc application/x-www-form-urlencoded)
```

---

## 📋 DANH SÁCH API THEO CHỨC NĂNG

### 1. 🔑 **XÁC THỰC TÀI KHOẢN (Account API)**

#### 1.1 Đăng nhập

**Endpoint:** `POST /v1/api/login`

**Mô tả:** Đăng nhập vào hệ thống và nhận token xác thực

**Đầu vào:**

```json
{
  "email": "admin@gmail.com",
  "password": "password123"
}
```

**Kết quả đầu ra:**

```json
{
  "success": true,
  "message": "Đăng nhập thành công",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "684ba6d8067cbc595e427fae",
      "email": "admin@gmail.com",
      "name": "Admin User",
      "role": "Admin"
    }
  }
}
```

#### 1.2 Đăng xuất

**Endpoint:** `POST /v1/api/logout`

**Mô tả:** Đăng xuất khỏi hệ thống

**Đầu vào:** Chỉ cần token trong header

**Kết quả đầu ra:**

```json
{
  "success": true,
  "message": "Đăng xuất thành công"
}
```

#### 1.3 Quên mật khẩu

**Endpoint:** `POST /v1/api/forgot-password`

**Mô tả:** Gửi mã xác thực đến email để đặt lại mật khẩu

**Đầu vào:**

```json
{
  "email": "user@gmail.com"
}
```

**Kết quả đầu ra:**

```json
{
  "success": true,
  "message": "Mã xác thực đã được gửi đến email"
}
```

#### 1.4 Xác thực mã đặt lại

**Endpoint:** `POST /v1/api/verify-reset-code`

**Mô tả:** Xác thực mã được gửi qua email

**Đầu vào:**

```json
{
  "email": "user@gmail.com",
  "code": "537111"
}
```

**Kết quả đầu ra:**

```json
{
  "success": true,
  "message": "Mã xác thực hợp lệ"
}
```

#### 1.5 Đặt lại mật khẩu

**Endpoint:** `POST /v1/api/reset-password`

**Mô tả:** Đặt lại mật khẩu mới sau khi xác thực thành công

**Đầu vào:**

```json
{
  "email": "user@gmail.com",
  "code": "537111",
  "newPassword": "newpassword123",
  "confirmPassword": "newpassword123"
}
```

**Kết quả đầu ra:**

```json
{
  "success": true,
  "message": "Đặt lại mật khẩu thành công"
}
```

---

### 2. 👤 **QUẢN LÝ PROFILE CHUNG (Common)**

#### 2.1 Xem thông tin profile

**Endpoint:** `GET /v1/api/profile`

**Mô tả:** Lấy thông tin profile của người dùng hiện tại

**Quyền truy cập:** Tất cả người dùng đã đăng nhập

**Kết quả đầu ra:**

```json
{
  "success": true,
  "data": {
    "id": "684ba6d8067cbc595e427fae",
    "email": "user@gmail.com",
    "name": "Phạm Thị H",
    "gender": "Nữ",
    "phoneNumber": "0123456789",
    "address": "Hà Nội",
    "role": "Teacher"
  }
}
```

#### 2.2 Cập nhật profile

**Endpoint:** `PATCH /v1/api/profile`

**Mô tả:** Cập nhật thông tin profile cá nhân

**Đầu vào:**

```json
{
  "name": "Phạm Thị H",
  "gender": "Nữ",
  "phoneNumber": "0987654321",
  "address": "Hà Nội"
}
```

**Kết quả đầu ra:**

```json
{
  "success": true,
  "message": "Cập nhật profile thành công",
  "data": {
    "id": "684ba6d8067cbc595e427fae",
    "name": "Phạm Thị H",
    "email": "user@gmail.com"
  }
}
```

#### 2.3 Đổi mật khẩu

**Endpoint:** `POST /v1/api/change-password`

**Mô tả:** Thay đổi mật khẩu hiện tại

**Đầu vào:**

```json
{
  "oldPassword": "oldpass123",
  "newPassword": "newpass123",
  "confirmPassword": "newpass123"
}
```

**Kết quả đầu ra:**

```json
{
  "success": true,
  "message": "Đổi mật khẩu thành công"
}
```

---

### 3. 👥 **QUẢN LÝ NGƯỜI DÙNG (User Management)**

#### 3.1 Lấy danh sách người dùng

**Endpoint:** `GET /v1/api/users/`

**Mô tả:** Lấy danh sách tất cả người dùng với filter và phân trang

**Quyền truy cập:** Admin

**Tham số query:**

- `page`: Trang hiện tại (mặc định: 1)
- `limit`: Số lượng mỗi trang (mặc định: 10)
- `email`: Lọc theo email
- `name`: Lọc theo tên
- `role`: Lọc theo vai trò (Admin, Teacher, Parent, Student)
- `isActive`: Lọc theo trạng thái (true/false)
- `sort`: Sắp xếp

**Ví dụ:** `GET /v1/api/users/?page=1&limit=10&role=Teacher&isActive=true`

**Kết quả đầu ra:**

```json
{
  "success": true,
  "data": [
    {
      "id": "684ba6d8067cbc595e427fae",
      "email": "teacher@gmail.com",
      "name": "Nguyễn Văn A",
      "role": "Teacher",
      "isActive": true,
      "createdAt": "2025-06-13T04:19:36.527Z"
    }
  ],
  "pagination": {
    "currentPage": 1,
    "totalPages": 5,
    "totalItems": 50,
    "itemsPerPage": 10
  }
}
```

#### 3.2 Kích hoạt/Vô hiệu hóa người dùng

**Endpoint:** `PATCH /v1/api/users/:userId/toggle-status`

**Mô tả:** Thay đổi trạng thái hoạt động của người dùng

**Quyền truy cập:** Admin

**Đầu vào:**

```json
{
  "isActive": true
}
```

**Kết quả đầu ra:**

```json
{
  "success": true,
  "message": "Kích hoạt user thành công",
  "data": {
    "user": {
      "id": "684ba6d8067cbc595e427fae",
      "email": "user@gmail.com",
      "isActive": true
    }
  }
}
```

---

### 4. 🏫 **QUẢN LÝ LỚP HỌC (Class Management)**

#### 4.1 Lấy tổng quan lớp học

**Endpoint:** `GET /v1/api/classes/overview`

**Mô tả:** Lấy thống kê tổng quan về các lớp học (dashboard)

**Quyền truy cập:** Admin

**Kết quả đầu ra:**

```json
{
  "success": true,
  "data": {
    "totalClasses": 15,
    "activeClasses": 12,
    "inactiveClasses": 3,
    "totalStudents": 180,
    "averageStudentsPerClass": 12
  }
}
```

#### 4.2 Tạo lớp học mới

**Endpoint:** `POST /v1/api/classes`

**Mô tả:** Tạo một lớp học mới

**Quyền truy cập:** Admin

**Đầu vào:**

```json
{
  "name": "Lớp Tiếng Anh Cơ Bản A1",
  "description": "Lớp học dành cho người mới bắt đầu",
  "schedule": "Thứ 2, 4, 6 - 19:00-21:00",
  "startDate": "2025-07-01",
  "endDate": "2025-09-30",
  "maxStudents": 20,
  "tuitionFee": 1500000,
  "teacherId": "684ba6d8067cbc595e427fb0"
}
```

**Kết quả đầu ra:**

```json
{
  "success": true,
  "message": "Tạo lớp học thành công",
  "data": {
    "id": "684ba74d067cbc595e427fbc",
    "name": "Lớp Tiếng Anh Cơ Bản A1",
    "schedule": "Thứ 2, 4, 6 - 19:00-21:00",
    "teacher": {
      "name": "Nguyễn Văn A",
      "email": "teacher@gmail.com"
    }
  }
}
```

#### 4.3 Lấy danh sách lớp học

**Endpoint:** `GET /v1/api/classes`

**Mô tả:** Lấy danh sách tất cả lớp học

**Quyền truy cập:** Admin, Teacher

**Tham số query:**

- `page`: Trang hiện tại
- `limit`: Số lượng mỗi trang
- `search`: Tìm kiếm theo tên lớp
- `teacherId`: Lọc theo giáo viên
- `isActive`: Lọc theo trạng thái

**Kết quả đầu ra:**

```json
{
  "success": true,
  "data": [
    {
      "id": "684ba74d067cbc595e427fbc",
      "name": "Lớp Tiếng Anh Cơ Bản A1",
      "schedule": "Thứ 2, 4, 6 - 19:00-21:00",
      "teacher": {
        "name": "Nguyễn Văn A"
      },
      "students": 15,
      "maxStudents": 20,
      "status": "active"
    }
  ]
}
```

#### 4.4 Lấy chi tiết lớp học

**Endpoint:** `GET /v1/api/classes/:classId`

**Mô tả:** Lấy thông tin chi tiết của một lớp học

**Quyền truy cập:** Admin, Teacher

**Kết quả đầu ra:**

```json
{
  "success": true,
  "data": {
    "id": "684ba74d067cbc595e427fbc",
    "name": "Lớp Tiếng Anh Cơ Bản A1",
    "description": "Lớp học dành cho người mới bắt đầu",
    "schedule": "Thứ 2, 4, 6 - 19:00-21:00",
    "teacher": {
      "id": "684ba6d8067cbc595e427fb0",
      "name": "Nguyễn Văn A",
      "email": "teacher@gmail.com"
    },
    "students": [
      {
        "id": "684ba74d067cbc595e427fbc",
        "name": "Trần Thị B",
        "email": "student@gmail.com"
      }
    ],
    "tuitionFee": 1500000,
    "startDate": "2025-07-01",
    "endDate": "2025-09-30"
  }
}
```

#### 4.5 Cập nhật lớp học

**Endpoint:** `PATCH /v1/api/classes/:classId`

**Mô tả:** Cập nhật thông tin lớp học

**Quyền truy cập:** Admin

**Đầu vào:**

```json
{
  "name": "Lớp Tiếng Anh Cơ Bản A1 - Updated",
  "schedule": "Thứ 3, 5, 7 - 19:00-21:00",
  "maxStudents": 25
}
```

#### 4.6 Đóng lớp học

**Endpoint:** `DELETE /v1/api/classes/:classId`

**Mô tả:** Đóng/xóa lớp học (soft delete)

**Quyền truy cập:** Admin

**Kết quả đầu ra:**

```json
{
  "success": true,
  "message": "Đóng lớp học thành công"
}
```

#### 4.7 Lấy danh sách giáo viên có thể phân công

**Endpoint:** `GET /v1/api/classes/available-teachers`

**Mô tả:** Lấy danh sách giáo viên có thể được phân công vào lớp

**Quyền truy cập:** Admin

**Kết quả đầu ra:**

```json
{
  "success": true,
  "data": [
    {
      "id": "684ba6d8067cbc595e427fb0",
      "name": "Nguyễn Văn A",
      "email": "teacher@gmail.com",
      "specialization": "TOEIC, IELTS"
    }
  ]
}
```

#### 4.8 Lấy danh sách học sinh có thể thêm vào lớp

**Endpoint:** `GET /v1/api/classes/available-students`

**Mô tả:** Lấy danh sách học sinh chưa có lớp hoặc có thể thêm vào lớp

**Quyền truy cập:** Admin

**Kết quả đầu ra:**

```json
{
  "success": true,
  "data": [
    {
      "id": "684ba74d067cbc595e427fbc",
      "name": "Trần Thị B",
      "email": "student@gmail.com",
      "level": "Beginner"
    }
  ]
}
```

---

### 5. 📋 **QUẢN LÝ ĐIỂM DANH (Attendance Management)**

#### 5.1 Tạo phiên điểm danh

**Endpoint:** `POST /v1/api/attendance/class/:classId`

**Mô tả:** Tạo phiên điểm danh mới cho lớp học

**Quyền truy cập:** Admin, Teacher

**Đầu vào:**

```json
{
  "date": "2025-06-27",
  "startTime": "19:00",
  "endTime": "21:00",
  "lessonTopic": "Unit 1: Greetings"
}
```

**Kết quả đầu ra:**

```json
{
  "success": true,
  "message": "Tạo phiên điểm danh thành công",
  "data": {
    "id": "684ba74d067cbc595e427fbc",
    "date": "2025-06-27",
    "class": {
      "name": "Lớp Tiếng Anh Cơ Bản A1"
    },
    "students": [
      {
        "studentId": "684ba74d067cbc595e427fbc",
        "name": "Trần Thị B",
        "status": "pending"
      }
    ]
  }
}
```

#### 5.2 Lấy danh sách điểm danh của lớp

**Endpoint:** `GET /v1/api/attendance/class/:classId`

**Mô tả:** Lấy tất cả phiên điểm danh của một lớp học

**Quyền truy cập:** Admin, Teacher

**Tham số query:**

- `month`: Lọc theo tháng
- `year`: Lọc theo năm

**Kết quả đầu ra:**

```json
{
  "success": true,
  "data": [
    {
      "id": "684ba74d067cbc595e427fbc",
      "date": "2025-06-27",
      "lessonTopic": "Unit 1: Greetings",
      "attendanceCount": 15,
      "totalStudents": 18,
      "attendanceRate": "83.33%"
    }
  ]
}
```

#### 5.3 Điểm danh học sinh

**Endpoint:** `PATCH /v1/api/attendance/:attendanceId/mark`

**Mô tả:** Điểm danh cho học sinh trong phiên điểm danh

**Quyền truy cập:** Admin, Teacher

**Đầu vào:**

```json
{
  "attendanceData": [
    {
      "studentId": "684ba74d067cbc595e427fbc",
      "status": "present"
    },
    {
      "studentId": "684ba74d067cbc595e427fbd",
      "status": "absent"
    }
  ]
}
```

**Kết quả đầu ra:**

```json
{
  "success": true,
  "message": "Điểm danh thành công",
  "data": {
    "attendanceId": "684ba74d067cbc595e427fbc",
    "updatedCount": 2,
    "presentCount": 1,
    "absentCount": 1
  }
}
```

#### 5.4 Xóa phiên điểm danh

**Endpoint:** `DELETE /v1/api/attendance/:attendanceId`

**Mô tả:** Xóa phiên điểm danh

**Quyền truy cập:** Admin

**Kết quả đầu ra:**

```json
{
  "success": true,
  "message": "Xóa phiên điểm danh thành công"
}
```

---

### 6. 👨‍🏫 **QUẢN LÝ GIÁO VIÊN (Teacher Management)**

#### 6.1 Tạo giáo viên mới

**Endpoint:** `POST /v1/api/teachers`

**Mô tả:** Tạo tài khoản giáo viên mới

**Quyền truy cập:** Admin

**Đầu vào:**

```json
{
  "email": "teacher@gmail.com",
  "password": "password123",
  "name": "Nguyễn Văn A",
  "gender": "Nam",
  "phoneNumber": "0123456789",
  "address": "Hà Nội",
  "specialization": "TOEIC, IELTS",
  "wagePerLesson": 150000
}
```

**Kết quả đầu ra:**

```json
{
  "success": true,
  "message": "Tạo giáo viên thành công",
  "data": {
    "id": "684ba6d8067cbc595e427fb0",
    "email": "teacher@gmail.com",
    "name": "Nguyễn Văn A",
    "role": "Teacher"
  }
}
```

#### 6.2 Lấy thông tin giáo viên

**Endpoint:** `GET /v1/api/teachers/:teacherId`

**Mô tả:** Lấy thông tin chi tiết của giáo viên

**Quyền truy cập:** Admin, Teacher (chính mình)

**Kết quả đầu ra:**

```json
{
  "success": true,
  "data": {
    "id": "684ba6d8067cbc595e427fb0",
    "email": "teacher@gmail.com",
    "name": "Nguyễn Văn A",
    "gender": "Nam",
    "phoneNumber": "0123456789",
    "specialization": "TOEIC, IELTS",
    "wagePerLesson": 150000,
    "classes": [
      {
        "id": "684ba74d067cbc595e427fbc",
        "name": "Lớp Tiếng Anh Cơ Bản A1"
      }
    ]
  }
}
```

#### 6.3 Cập nhật thông tin giáo viên

**Endpoint:** `PATCH /v1/api/teachers/:teacherId`

**Mô tả:** Cập nhật thông tin giáo viên

**Quyền truy cập:** Admin

**Đầu vào:**

```json
{
  "name": "Nguyễn Văn A - Updated",
  "phoneNumber": "0987654321",
  "wagePerLesson": 160000
}
```

#### 6.4 Lấy danh sách tất cả giáo viên

**Endpoint:** `GET /v1/api/teachers`

**Mô tả:** Lấy danh sách tất cả giáo viên

**Quyền truy cập:** Admin

**Tham số query:**

- `page`: Trang hiện tại
- `limit`: Số lượng mỗi trang
- `search`: Tìm kiếm theo tên/email
- `isActive`: Lọc theo trạng thái

**Kết quả đầu ra:**

```json
{
  "success": true,
  "data": [
    {
      "id": "684ba6d8067cbc595e427fb0",
      "name": "Nguyễn Văn A",
      "email": "teacher@gmail.com",
      "specialization": "TOEIC, IELTS",
      "classCount": 2,
      "isActive": true
    }
  ]
}
```

#### 6.5 Xóa mềm giáo viên

**Endpoint:** `DELETE /v1/api/teachers/:teacherId/soft`

**Mô tả:** Xóa mềm giáo viên (đặt isActive = false)

**Quyền truy cập:** Admin

---

### 7. 👨‍👩‍👧‍👦 **QUẢN LÝ PHỤ HUYNH (Parent Management)**

#### 7.1 Tạo phụ huynh mới

**Endpoint:** `POST /v1/api/parents`

**Mô tả:** Tạo tài khoản phụ huynh mới

**Quyền truy cập:** Admin

**Đầu vào:**

```json
{
  "email": "parent@gmail.com",
  "password": "password123",
  "name": "Trần Thị C",
  "gender": "Nữ",
  "phoneNumber": "0123456789",
  "address": "Hà Nội"
}
```

#### 7.2 Lấy danh sách phụ huynh

**Endpoint:** `GET /v1/api/parents`

**Mô tả:** Lấy danh sách tất cả phụ huynh

**Quyền truy cập:** Admin

#### 7.3 Lấy thông tin phụ huynh

**Endpoint:** `GET /v1/api/parents/:parentId`

**Mô tả:** Lấy thông tin chi tiết phụ huynh

**Quyền truy cập:** Admin

#### 7.4 Cập nhật thông tin phụ huynh

**Endpoint:** `PATCH /v1/api/parents/:parentId`

**Mô tả:** Cập nhật thông tin phụ huynh

**Quyền truy cập:** Admin

#### 7.5 Xóa mềm phụ huynh

**Endpoint:** `DELETE /v1/api/parents/:parentId/soft`

**Mô tả:** Xóa mềm phụ huynh

**Quyền truy cập:** Admin

#### 7.6 Xem thông tin con em

**Endpoint:** `GET /v1/api/parents/:parentId/children-details`

**Mô tả:** Lấy thông tin chi tiết về con em của phụ huynh (lớp học, điểm danh)

**Quyền truy cập:** Parent (chính mình), Admin

**Kết quả đầu ra:**

```json
{
  "success": true,
  "data": {
    "parent": {
      "name": "Trần Thị C"
    },
    "children": [
      {
        "student": {
          "id": "684ba74d067cbc595e427fbc",
          "name": "Trần Văn D",
          "email": "student@gmail.com"
        },
        "classes": [
          {
            "id": "684ba74d067cbc595e427fbc",
            "name": "Lớp Tiếng Anh Cơ Bản A1",
            "teacher": {
              "name": "Nguyễn Văn A"
            },
            "schedule": "Thứ 2, 4, 6 - 19:00-21:00"
          }
        ],
        "attendanceStats": {
          "totalSessions": 20,
          "presentCount": 18,
          "absentCount": 2,
          "attendanceRate": "90%"
        }
      }
    ]
  }
}
```

#### 7.7 Cập nhật mối quan hệ phụ huynh-con em

**Endpoint:** `PATCH /v1/api/parents/:parentId/children`

**Mô tả:** Cập nhật danh sách con em của phụ huynh

**Quyền truy cập:** Admin

**Đầu vào:**

```json
{
  "studentIds": ["684ba74d067cbc595e427fbc", "684ba74d067cbc595e427fbd"]
}
```

---

### 8. 👨‍🎓 **QUẢN LÝ HỌC SINH (Student Management)**

#### 8.1 Tạo học sinh mới

**Endpoint:** `POST /v1/api/students`

**Mô tả:** Tạo tài khoản học sinh mới

**Quyền truy cập:** Admin

**Đầu vào:**

```json
{
  "email": "student@gmail.com",
  "password": "password123",
  "name": "Trần Văn D",
  "gender": "Nam",
  "phoneNumber": "0123456789",
  "address": "Hà Nội",
  "level": "Beginner",
  "parentId": "684ba6d8067cbc595e427fae"
}
```

#### 8.2 Lấy danh sách học sinh

**Endpoint:** `GET /v1/api/students`

**Mô tả:** Lấy danh sách tất cả học sinh

**Quyền truy cập:** Admin

**Tham số query:**

- `page`, `limit`: Phân trang
- `search`: Tìm kiếm theo tên/email
- `classId`: Lọc theo lớp học
- `level`: Lọc theo trình độ

#### 8.3 Lấy thông tin học sinh

**Endpoint:** `GET /v1/api/students/:studentId`

**Mô tả:** Lấy thông tin chi tiết học sinh

**Quyền truy cập:** Admin, Student (chính mình), Parent (con của mình)

#### 8.4 Cập nhật thông tin học sinh

**Endpoint:** `PATCH /v1/api/students/:studentId`

**Mô tả:** Cập nhật thông tin học sinh

**Quyền truy cập:** Admin

#### 8.5 Xóa mềm học sinh

**Endpoint:** `DELETE /v1/api/students/:studentId/soft`

**Mô tả:** Xóa mềm học sinh

**Quyền truy cập:** Admin

#### 8.6 Lấy danh sách lớp có thể đăng ký

**Endpoint:** `GET /v1/api/students/:studentId/available-classes`

**Mô tả:** Lấy danh sách lớp học sinh có thể đăng ký

**Quyền truy cập:** Admin

#### 8.7 Đăng ký học sinh vào lớp

**Endpoint:** `POST /v1/api/students/:studentId/enroll`

**Mô tả:** Đăng ký học sinh vào một hoặc nhiều lớp học

**Quyền truy cập:** Admin

**Đầu vào:**

```json
{
  "classIds": ["684ba74d067cbc595e427fbc"],
  "enrollmentDate": "2025-07-01"
}
```

#### 8.8 Rút học sinh khỏi lớp

**Endpoint:** `POST /v1/api/students/:studentId/withdraw`

**Mô tả:** Rút học sinh khỏi lớp học

**Quyền truy cập:** Admin

**Đầu vào:**

```json
{
  "classIds": ["684ba74d067cbc595e427fbc"],
  "withdrawDate": "2025-08-01",
  "reason": "Chuyển lớp"
}
```

---

### 9. 💰 **QUẢN LÝ THANH TOÁN (Payment Management)**

#### 9.1 Lấy danh sách thanh toán chưa hoàn thành

**Endpoint:** `GET /v1/api/parents/:parentId/unpaid-payments`

**Mô tả:** Lấy danh sách các khoản thanh toán chưa hoàn thành của con em

**Quyền truy cập:** Parent (chính mình), Admin

**Tham số query:**

- `month`: Lọc theo tháng
- `year`: Lọc theo năm

**Kết quả đầu ra:**

```json
{
  "success": true,
  "data": {
    "parent": {
      "name": "Trần Thị C"
    },
    "unpaidPayments": [
      {
        "student": {
          "name": "Trần Văn D"
        },
        "payment": {
          "id": "684ba74d067cbc595e427fbc",
          "amount": 1500000,
          "paidAmount": 500000,
          "remainingAmount": 1000000,
          "dueDate": "2025-07-15",
          "status": "partial"
        },
        "class": {
          "name": "Lớp Tiếng Anh Cơ Bản A1"
        }
      }
    ],
    "summary": {
      "totalUnpaid": 3000000,
      "paymentCount": 2
    }
  }
}
```

#### 9.2 Tạo yêu cầu thanh toán

**Endpoint:** `POST /v1/api/parents/:parentId/payment-request`

**Mô tả:** Phụ huynh tạo yêu cầu thanh toán với chứng từ

**Quyền truy cập:** Parent (chính mình), Admin

**Đầu vào (Form Data):**

```
paymentId: 68550f2d7aca24afb771efac
amount: 1260000
proof: (file) - Hình ảnh chứng từ thanh toán
```

**Kết quả đầu ra:**

```json
{
  "success": true,
  "message": "Tạo yêu cầu thanh toán thành công",
  "data": {
    "requestId": "6857bc7a3d3cc534e68b35fb",
    "amount": 1260000,
    "status": "pending",
    "requestDate": "2025-06-27T10:00:00.000Z"
  }
}
```

#### 9.3 Lấy tất cả yêu cầu thanh toán

**Endpoint:** `GET /v1/api/parent-payment-requests`

**Mô tả:** Admin xem tất cả yêu cầu thanh toán

**Quyền truy cập:** Admin

**Kết quả đầu ra:**

```json
{
  "success": true,
  "data": [
    {
      "id": "6857bc7a3d3cc534e68b35fb",
      "parent": {
        "name": "Trần Thị C"
      },
      "student": {
        "name": "Trần Văn D"
      },
      "amount": 1260000,
      "status": "pending",
      "requestDate": "2025-06-27T10:00:00.000Z",
      "imageDataUrl": "data:image/jpeg;base64,..."
    }
  ]
}
```

#### 9.4 Lấy chi tiết yêu cầu thanh toán

**Endpoint:** `GET /v1/api/parent-payment-requests/:requestId`

**Mô tả:** Xem chi tiết một yêu cầu thanh toán

**Quyền truy cập:** Admin

#### 9.5 Xử lý yêu cầu thanh toán

**Endpoint:** `PATCH /v1/api/parent-payment-requests/:requestId/process`

**Mô tả:** Admin duyệt hoặc từ chối yêu cầu thanh toán

**Quyền truy cập:** Admin

**Đầu vào:**

```json
{
  "action": "approved" // hoặc "rejected"
}
```

**Kết quả đầu ra:**

```json
{
  "success": true,
  "message": "Duyệt yêu cầu thanh toán thành công",
  "data": {
    "requestId": "6857bc7a3d3cc534e68b35fb",
    "status": "approved",
    "processedDate": "2025-06-27T11:00:00.000Z"
  }
}
```

---

### 10. 💵 **QUẢN LÝ LƯƠNG GIÁO VIÊN (Teacher Wage Management)**

#### 10.1 Lấy danh sách lương và thống kê

**Endpoint:** `GET /v1/api/teacher-wages`

**Mô tả:** Lấy danh sách lương giáo viên và thống kê

**Quyền truy cập:** Admin

**Tham số query:**

- `month`: Lọc theo tháng
- `year`: Lọc theo năm
- `teacherId`: Lọc theo giáo viên
- `paymentStatus`: Lọc theo trạng thái (unpaid/partial/full)
- `page`, `limit`: Phân trang
- `includeList`: true/false - Có bao gồm danh sách không
- `includeStats`: true/false - Có bao gồm thống kê không

**Kết quả đầu ra:**

```json
{
  "success": true,
  "data": {
    "statistics": {
      "summary": {
        "totalCalculated": 20000000,
        "totalPaid": 15000000,
        "totalRemaining": 5000000,
        "averageWage": 250000,
        "paymentRate": "75.00%"
      },
      "byStatus": {
        "unpaid": { "count": 2, "amount": 3000000 },
        "partial": { "count": 1, "amount": 2000000 },
        "full": { "count": 5, "amount": 15000000 }
      }
    },
    "list": [
      {
        "id": "685e66f8f564dc200bc22110",
        "teacher": {
          "name": "Nguyễn Văn A"
        },
        "month": 8,
        "year": 2025,
        "calculatedAmount": 2400000,
        "amount": 2000000,
        "remainingAmount": 400000,
        "paymentStatus": "partial",
        "lessonTaught": 16
      }
    ]
  }
}
```

#### 10.2 Tính lương tự động

**Endpoint:** `POST /v1/api/teacher-wages/calculate`

**Mô tả:** Tính lương tự động cho tất cả giáo viên trong tháng

**Quyền truy cập:** Admin

**Đầu vào:**

```json
{
  "month": 8,
  "year": 2025
}
```

**Kết quả đầu ra:**

```json
{
  "success": true,
  "message": "Tính lương thành công cho 5 giáo viên",
  "data": {
    "month": 8,
    "year": 2025,
    "teachersProcessed": 5,
    "totalAmount": 12000000
  }
}
```

#### 10.3 Lấy chi tiết bản ghi lương

**Endpoint:** `GET /v1/api/teacher-wages/:teacherWageId`

**Mô tả:** Xem chi tiết một bản ghi lương

**Quyền truy cập:** Admin

#### 10.4 Lấy lương của giáo viên

**Endpoint:** `GET /v1/api/teacher-wages/teacher/:teacherId`

**Mô tả:** Xem lương của một giáo viên cụ thể

**Quyền truy cập:** Admin, Teacher (chính mình)

**Tham số query:**

- `month`, `year`: Lọc theo thời gian
- `isPaid`: Lọc theo trạng thái thanh toán
- `page`, `limit`: Phân trang

#### 10.5 Thanh toán lương

**Endpoint:** `PATCH /v1/api/teacher-wages/:teacherWageId/process`

**Mô tả:** Thanh toán lương cho giáo viên

**Quyền truy cập:** Admin

**Đầu vào:**

```json
{
  "paidAmount": 90000
}
```

**Kết quả đầu ra:**

```json
{
  "success": true,
  "message": "Thanh toán lương thành công",
  "data": {
    "teacherWageId": "685e66f8f564dc200bc22110",
    "paidAmount": 90000,
    "newStatus": "partial",
    "remainingAmount": 310000
  }
}
```

#### 10.6 Cập nhật bản ghi lương

**Endpoint:** `PATCH /v1/api/teacher-wages/:teacherWageId`

**Mô tả:** Cập nhật thông tin bản ghi lương

**Quyền truy cập:** Admin

**Đầu vào:**

```json
{
  "amount": 2500000,
  "lessonTaught": 20
}
```

#### 10.7 Xóa bản ghi lương

**Endpoint:** `DELETE /v1/api/teacher-wages/:teacherWageId`

**Mô tả:** Xóa bản ghi lương

**Quyền truy cập:** Admin

---

### 11. 📊 **API THỐNG KÊ (Statistics)**

#### 11.1 Lấy thống kê tổng hợp

**Endpoint:** `GET /v1/api/statistics`

**Mô tả:** API thống kê tổng hợp thay thế tất cả API statistics cũ

**Quyền truy cập:** Admin

**Tham số query:**

- `month`: Tháng cần thống kê (1-12)
- `year`: Năm cần thống kê
- `startDate`: Ngày bắt đầu (YYYY-MM-DD)
- `endDate`: Ngày kết thúc (YYYY-MM-DD)
- `classId`: Lọc theo lớp học
- `teacherId`: Lọc theo giáo viên

**Ví dụ sử dụng:**

```
GET /v1/api/statistics                                    # Tháng hiện tại
GET /v1/api/statistics?month=6&year=2025                 # Tháng 6/2025
GET /v1/api/statistics?year=2025                         # Cả năm 2025
GET /v1/api/statistics?startDate=2025-01-01&endDate=2025-03-31  # Quý 1/2025
```

**Kết quả đầu ra:**

```json
{
  "success": true,
  "message": "Lấy thống kê thành công",
  "data": {
    "period": {
      "type": "month",
      "description": "Tháng 6/2025",
      "range": {
        "start": "2025-06-01T00:00:00.000Z",
        "end": "2025-06-30T23:59:59.000Z"
      }
    },
    "teacherWages": {
      "summary": {
        "totalCalculated": 20000000,
        "totalPaid": 15000000,
        "totalRemaining": 5000000,
        "paymentRate": "75.00%"
      }
    },
    "studentPayments": {
      "summary": {
        "totalExpected": 30000000,
        "totalCollected": 25000000,
        "collectionRate": "83.33%"
      }
    },
    "studentGrowth": {
      "current": {
        "activeStudents": 150,
        "inactiveStudents": 20,
        "totalStudents": 170
      },
      "periodSummary": {
        "newStudents": 15,
        "netGrowth": 10
      }
    },
    "overview": {
      "totalProfit": 10000000,
      "profitMargin": "40.00%"
    }
  }
}
```

---

### 12. 🗑️ **API XÓA CỨNG (Hard Delete)**

#### 12.1 Xóa cứng giáo viên

**Endpoint:** `DELETE /v1/api/teachers/:teacherId`

**Mô tả:** Xóa vĩnh viễn giáo viên khỏi hệ thống

**Quyền truy cập:** Admin

#### 12.2 Xóa cứng phụ huynh

**Endpoint:** `DELETE /v1/api/parents/:parentId`

**Mô tả:** Xóa vĩnh viễn phụ huynh khỏi hệ thống

**Quyền truy cập:** Admin

#### 12.3 Xóa cứng học sinh

**Endpoint:** `DELETE /v1/api/students/:studentId`

**Mô tả:** Xóa vĩnh viễn học sinh khỏi hệ thống

**Quyền truy cập:** Admin

---

## 🔧 **HƯỚNG DẪN CHUNG**

### 1. **Xác thực (Authentication)**

Tất cả API (trừ login/register) cần header Authorization:

```
Authorization: Bearer <token>
```

### 2. **Content-Type**

- **JSON Data:** `Content-Type: application/json`
- **Form Data:** `Content-Type: application/x-www-form-urlencoded`
- **File Upload:** `Content-Type: multipart/form-data`

### 3. **Phân quyền**

- **Admin:** Toàn quyền truy cập
- **Teacher:** API liên quan giảng dạy, lương
- **Student:** Thông tin cá nhân, lớp học
- **Parent:** Thông tin con em, thanh toán

### 4. **Error Response**

```json
{
  "success": false,
  "message": "Mô tả lỗi",
  "error": "Chi tiết lỗi"
}
```

### 5. **Phân trang**

```
?page=1&limit=10&sort=-createdAt
```

### 6. **HTTP Status Codes**

- `200`: Thành công
- `201`: Tạo mới thành công
- `400`: Lỗi dữ liệu đầu vào
- `401`: Chưa xác thực
- `403`: Không có quyền
- `404`: Không tìm thấy
- `500`: Lỗi server

---

## 📝 **LƯU Ý QUAN TRỌNG**

1. **Token hết hạn:** Cần đăng nhập lại để lấy token mới
2. **File upload:** Giới hạn kích thước file (thường 5MB)
3. **Rate limiting:** Có thể có giới hạn số request/phút
4. **Validation:** Kiểm tra dữ liệu đầu vào trước khi gửi
5. **Error handling:** Luôn xử lý các trường hợp lỗi

---

**📞 Hỗ trợ:** Liên hệ admin nếu gặp vấn đề khi sử dụng API
