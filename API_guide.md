# Hướng dẫn sử dụng các API cho web trung tâm tiếng anh

- Trong collection có nhiều folder, mỗi folder chứa các api liên quan đến đối tượng nhất định.
- Mặc định admin có email admin@gmail.com, mật khẩu : pass@123 (không xóa người dùng này).
- Dùng POSTMAN để test các api này và triển khai dần lên frontend.
- Tên miền đã deploy : https://english-center-website.onrender.com
- Github : https://github.com/ChauTungDuong/english-center_website
- Tải MongoDB Compass và kết nối bằng chuỗi này để tiện xem database : mongodb+srv://duong6a571:pass%40123@backendengcencluster.t0e1bmm.mongodb.net/English_Center_database?retryWrites=true&w=majority&appName=BackendEngCenCluster

## Auth

- Gồm có các API:

  - POST /v1/api/login : Login hệ thống, nhận đầu vào là body chứa email và password. Trả về token nếu tồn tại người dùng. Tạm thời đang để token không giới hạn thời gian.

  - GET v1/api/profile: Lấy profile người dùng. Luồng : Login => Lấy token => lưu => gọi api này. Cần thêm token vào mục Auth => Auth Type => Bearer Token => Nhập token có được từ việc login vào. Trả về thông tin User ứng với token đó.

## User

- Gồm các API (chỉ được thực thi dưới quyền admin, tức là login lấy token admin rồi thêm vào auth cho từng api một, trừ Update người dùng có thể dùng token của người dùng) :

  - POST /v1/api/user : Tạo mới người dùng. Chứa các trường cơ bản của người dùng cộng thêm các thuộc tính ứng với mỗi vai trò khác nhau : Giáo viên, Học sinh, Phụ huynh hoặc Admin. Mặc định nếu không truyền giá trị thì để null. Chỉ truyền các trường mà vai trò đó có, còn cụ thể là các trường nào thì xem trên /models ở github. Nhận vào body dạng JSON, trả về msg (thông điệp) thêm thành công hay chưa.

  - GET /v1/api/user/?page&limit&name&role&classId : Lấy ra toàn bộ người dùng. Có 2 tham số chính là page (số trang) và limit (số bản ghi/ trang). Nếu không đặt => mặc định page =1, limit=10 (10 bản ghi 1 trang).

  - DELETE /v1/api/user/:id : Xóa 1 người dùng theo id cụ thể. Truyền vào biến id giá trị ObjectId của người dùng muốn xóa là được. Trả về thông điệp xóa thành công hay chưa.

  - PATCH /v1/api/user/:id : Sửa 1 người dùng ở 1 hoặc nhiều trường. Cái này cần token (lấy được từ login) truyền vào. Ứng với người dùng nào thì sửa đổi của người dùng đó. Trong phần body gồm nhiều giá trị dạng key - value . Cần sửa trường nào thì tick vào là được. Nếu tick mà để trống thì mặc định sẽ thay thế trường đó trong database thành "".

  - GET /v1/api/user/:id : Lấy ra thông tin 1 người dùng. Truyền vào id người dùng cần lấy vào biến id trong path variables. Trả về thông điệp và dữ liệu người dùng đã được lấy.

# Mô tả cơ bản giao diện web

Mặc định, admin có một trang giao diện gồm các mục Quản lý người dùng, Quản lý lớp học, Thống kê + Quản lý người dùng : Là giao diện chia 2 phần : phần trên gồm các tính năng : Thêm người dùng mới, tìm kiếm, lọc theo chức năng.
Phần dưới gồm danh sách người dùng với các thông tin : tên, email, vai trò, kèm theo các
nút chức năng : Chi tiết, sửa, xóa.
Khi ấn vào chi tiết, sẽ xem được chi tiết thông tin người dùng, tùy theo vai trò mà sẽ có form pop-up,
ví dụ : Với người dùng là Học sinh, thì có nút "Thêm vào lớp", khi ấn vào thì hiển thị danh sách lớp đang có, chọn để thêm.
Với phụ huynh, thì có nút "Thêm con cái", với Giáo viên thì là "Thêm lớp dạy",...
(mở rộng) : Cho phép chọn nhiều người dùng và thực hiện một thao tác cụ thể. Ví dụ : Chọn nhiều
học sinh rồi thêm vào 1 lớp cụ thể, chọn nhiều người dùng để xóa,... Sử dụng checkbox để tick chọn.

    + Quản lý lớp học : Cũng tương tự như trang quản lý người dùng nhưng sẽ có danh sách các lớp, có nút "Thêm lớp mới", khi ấn vào chi tiết lớp có thể
                        thêm học sinh / giáo viên cho lớp đó, và nút "Xem danh sách điểm danh"
                        Có thêm nút "Thêm lịch học" cho lớp mỗi khi ấn vào 1 lớp.

    + Thống kê : Xem được các thông tin như tổng số tiền học sinh đã đóng, tổng số tiền dự kiến thu được (tính theo số buổi học của học sinh), lọc theo
                 tháng, quý, năm.
                 Xem được số học sinh mới đăng kí theo tháng.
                 Xem tổng quan số giáo viên, số lớp đang mở/ đã đóng

- Mô tả giao diện người dùng :
  - Học sinh : Xem được lớp đang học, danh sách lớp (chỉ có tên, tuổi hoặc email người dùng khác), giáo viên dạy lớp đó.
  - Phụ huynh : Xem được con mình đang học lớp nào, giáo viên nào, đóng học phí.
  - Giáo viên : Xem các lớp đang dạy, điểm danh, xem danh sách lớp.
