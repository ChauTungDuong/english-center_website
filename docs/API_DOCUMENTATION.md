# API Documentation

## Base URL

```
Development: http://localhost:3000/v1/api
Production: https://english-center-website.onrender.com/v1/api
```

## Authentication

All protected endpoints require JWT token in header:

```
Authorization: Bearer <your_jwt_token>
```

## Response Format

### Success Response

```json
{
  "success": true,
  "data": { ... },
  "message": "Operation successful"
}
```

### Error Response

```json
{
  "success": false,
  "message": "Error description",
  "error": "Error details"
}
```

---

## 🔐 Authentication Endpoints

### Register

```http
POST /auth/register
```

**Body:**

```json
{
  "email": "user@example.com",
  "password": "Password123!",
  "name": "John Doe",
  "role": "Student",
  "phoneNumber": "0123456789",
  "gender": "Nam"
}
```

### Login

```http
POST /auth/login
```

**Body:**

```json
{
  "email": "user@example.com",
  "password": "Password123!"
}
```

**Response:**

```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "123",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "Student"
  }
}
```

---

## 👤 User Endpoints

### Get Profile

```http
GET /users/profile
Authorization: Bearer <token>
```

### Update Profile

```http
PATCH /users/profile
Authorization: Bearer <token>
```

**Body:**

```json
{
  "name": "Jane Doe",
  "phoneNumber": "0987654321",
  "address": "123 Main St"
}
```

### Change Password

```http
PATCH /users/change-password
Authorization: Bearer <token>
```

**Body:**

```json
{
  "currentPassword": "OldPass123!",
  "newPassword": "NewPass123!"
}
```

---

## 📚 Class Endpoints

### Get All Classes

```http
GET /classes
Authorization: Bearer <token>
```

**Query Parameters:**

- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 10)
- `year` (number): Filter by year
- `grade` (number): Filter by grade
- `isAvailable` (boolean): Filter by availability

### Get Class Details

```http
GET /classes/:classId?students=true&detailed=true
Authorization: Bearer <token>
```

**Query Parameters:**

- `students` (boolean): Include student list
- `detailed` (boolean): Include parent details

### Create Class (Admin)

```http
POST /classes
Authorization: Bearer <token>
```

**Body:**

```json
{
  "className": "Lớp Tiếng Anh Giao Tiếp",
  "year": 2025,
  "grade": 10,
  "feePerLesson": 150000,
  "teacherId": "teacher_id",
  "schedule": {
    "startDate": "2025-01-01",
    "endDate": "2025-12-31",
    "daysOfLessonInWeek": [1, 3, 5]
  }
}
```

---

## 🎓 Student Endpoints

### Get All Students (Admin)

```http
GET /students
Authorization: Bearer <token>
```

### Get Student Details

```http
GET /students/:studentId
Authorization: Bearer <token>
```

### Create Student (Admin)

```http
POST /students
Authorization: Bearer <token>
```

**Body:**

```json
{
  "email": "student@example.com",
  "password": "Pass123!",
  "name": "Student Name",
  "phoneNumber": "0123456789",
  "gender": "Nam",
  "classIds": ["class_id_1"],
  "parentIds": ["parent_id_1"],
  "discountPercentage": 10
}
```

---

## 👨‍🏫 Teacher Endpoints

### Get My Classes (Teacher)

```http
GET /teachers/my-classes
Authorization: Bearer <token>
```

### Get My Wages (Teacher)

```http
GET /teacher-wages/my-wages
Authorization: Bearer <token>
```

---

## 👨‍👩‍👧 Parent Endpoints

### Get My Children Details

```http
GET /parents/my-children-details
Authorization: Bearer <token>
```

**Response includes:**

- Children information
- Classes enrolled
- Attendance records
- Attendance rate

### Get Unpaid Payments

```http
GET /parents/my-unpaid-payments
Authorization: Bearer <token>
```

---

## ✅ Attendance Endpoints

### Create Attendance (Teacher)

```http
POST /attendance
Authorization: Bearer <token>
```

**Body:**

```json
{
  "classId": "class_id",
  "date": "2025-11-24",
  "students": [
    { "studentId": "student_id_1", "isAbsent": false },
    { "studentId": "student_id_2", "isAbsent": true }
  ]
}
```

### Get Attendance by Class

```http
GET /attendance/class/:classId
Authorization: Bearer <token>
```

---

## 💰 Payment Endpoints

### Get Payment Summary (Admin)

```http
GET /payments/summary
Authorization: Bearer <token>
```

**Query Parameters:**

- `month` (number): Filter by month
- `year` (number): Filter by year

### Record Payment (Admin)

```http
PATCH /payments/:paymentId/record
Authorization: Bearer <token>
```

**Body:**

```json
{
  "amount": 500000,
  "paymentMethod": "Chuyển khoản",
  "note": "Thanh toán học phí tháng 11"
}
```

---

## 💸 Parent Payment Request Endpoints

### Create Payment Request (Parent)

```http
POST /parent-payment-requests/my-request
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

**Form Data:**

- `paymentId` (string): Payment ID
- `amount` (number): Amount to pay
- `proof` (file): Payment proof image

### Get My Requests (Parent)

```http
GET /parent-payment-requests/my-requests
Authorization: Bearer <token>
```

### Process Payment Request (Admin)

```http
PATCH /parent-payment-requests/:requestId/process
Authorization: Bearer <token>
```

**Body:**

```json
{
  "action": "approve",
  "adminNote": "Đã xác nhận thanh toán"
}
```

### Retry Payment Request (Parent)

```http
PATCH /parent-payment-requests/:requestId/retry
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

**Form Data:**

- `amount` (number): Updated amount
- `proof` (file): New payment proof

---

## 📊 Statistics Endpoints

### Get System Overview (Admin)

```http
GET /statistics/overview
Authorization: Bearer <token>
```

**Response:**

```json
{
  "totalStudents": 150,
  "totalTeachers": 20,
  "totalClasses": 30,
  "totalRevenue": 500000000,
  "totalProfit": 150000000,
  "profitMargin": 30.0
}
```

### Get Class Statistics (Admin)

```http
GET /statistics/class/:classId
Authorization: Bearer <token>
```

---

## 📢 Notification Endpoints

### Get My Notifications

```http
GET /notifications/my
Authorization: Bearer <token>
```

### Mark as Read

```http
PATCH /notifications/:notificationId/read
Authorization: Bearer <token>
```

---

## 📰 Advertisement Endpoints

### Get Public Advertisements (No Auth)

```http
GET /advertisements/public
```

**Query Parameters:**

- `page` (number): Page number
- `limit` (number): Items per page

### Get Advertisement Details (No Auth)

```http
GET /advertisements/public/:adId
```

### Create Advertisement (Admin)

```http
POST /advertisements
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

**Form Data:**

- `title` (string): Ad title
- `content` (string): Ad content
- `startDate` (date): Start date
- `endDate` (date): End date
- `images` (files[]): Multiple images

---

## Error Codes

| Code | Description           |
| ---- | --------------------- |
| 200  | Success               |
| 201  | Created               |
| 400  | Bad Request           |
| 401  | Unauthorized          |
| 403  | Forbidden             |
| 404  | Not Found             |
| 409  | Conflict              |
| 500  | Internal Server Error |

---

## Rate Limiting

- **Authentication endpoints**: 5 requests per 15 minutes
- **General API**: 100 requests per 15 minutes
- **File uploads**: 10 requests per hour

---

For more details, see specific documentation:

- [Payment API Guide](./PAYMENT_API_DOCUMENTATION.md)
- [Parent Payment Request Guide](./PARENT_PAYMENT_REQUEST_API_DOCUMENTATION.md)
