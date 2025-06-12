cluster pass : pass@123

🔐 1. Xác thực & người dùng
Method Endpoint Mô tả
POST /login Đăng nhập, trả JWT token
GET /profile Lấy thông tin người dùng từ token
POST /users (Admin) Tạo tài khoản user với role: học sinh, phụ huynh, giáo viên
PUT /users/:id Cập nhật thông tin người dùng
DELETE /users/:id Xoá người dùng nếu cần
GET /users?role=... Lọc danh sách theo vai trò (admin, học sinh, giáo viên, phụ huynh)

🏫 2. Quản lý lớp học
Method Endpoint Mô tả
POST /classes (Admin) Tạo lớp mới theo năm, tuổi
PUT /classes/:id/close Đóng lớp (cập nhật trạng thái isClosed)
GET /classes Lấy danh sách tất cả lớp
GET /classes/:id Lấy chi tiết lớp (giáo viên, học sinh)
PUT /classes/:id Cập nhật tên lớp, năm, trạng thái...
PATCH /classes/:id/students Thêm/xoá học sinh vào lớp
PATCH /classes/:id/teacher Gán giáo viên cho lớp

👨‍🏫 3. Giáo viên
Method Endpoint Mô tả
GET /teachers/:id/classes Giáo viên xem lớp mình dạy
GET /teachers/:id/statistics Số buổi đã dạy, lương tạm tính
POST /attendance Giáo viên điểm danh học sinh cho buổi học

🧑‍🎓 4. Học sinh
Method Endpoint Mô tả
GET /students/:id/classes Xem mình học lớp nào
GET /students/:id/attendance Xem số buổi đã học/nghỉ
GET /students/:id/tuition Xem học phí cần đóng, đã giảm, đã đóng bao nhiêu

👪 5. Phụ huynh
Method Endpoint Mô tả
GET /parents/:id/children Xem danh sách con của mình
GET /parents/:id/children/:cid/attendance Xem lịch học/nghỉ của từng con
GET /parents/:id/children/:cid/tuition Xem học phí của từng con
POST /tuition-payment Nhập số tiền phụ huynh đóng (có thể trả thiếu)

💰 6. Học phí & thống kê
Method Endpoint Mô tả
GET /tuition/statistics?month=... Tổng tiền học sinh cần đóng / đã đóng
GET /salary/statistics?month=... Tổng lương trả giáo viên theo buổi dạy
GET /students/statistics Tăng/giảm số lượng học sinh theo tháng

📰 7. Trang chủ & thông báo
Method Endpoint Mô tả
POST /notices (Admin) Đăng thông báo popup/slider quảng bá lớp mới
GET /notices Frontend lấy thông báo hiển thị trang chủ

📦 8. Các API phụ trợ khác
Method Endpoint Mô tả
GET /config Lấy config hệ thống (phụ huynh có được xem tên giáo viên hay không)
PATCH /config Admin cấu hình các tuỳ chọn

📌 Gợi ý phân quyền
API Ai được dùng
/login Tất cả
/users, /classes Admin
/teachers/_ Giáo viên
/students/_ Học sinh
/parents/\* Phụ huynh
/notices Admin / All
/statistics Admin
