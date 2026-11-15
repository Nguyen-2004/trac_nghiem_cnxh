# Triển khai Quiz Web lên Render

## Chuẩn bị và Blueprint

1. Tạo repository GitHub mới, đưa source lên nhánh mặc định. Không commit `.env` hoặc thông tin bí mật.
2. Tạo tài khoản Render, chọn **New → Blueprint**, kết nối repository và chọn `render.yaml`.
3. Blueprint tạo Web Service Node tại Singapore và PostgreSQL cùng khu vực. Database cấu hình persistent với gói Basic dung lượng 256 MB; kiểm tra giá và điều kiện hiện hành trên Render trước khi xác nhận tạo tài nguyên.
4. Khi Render hỏi giá trị cho `ADMIN_BOOTSTRAP_EMAIL` và `ADMIN_BOOTSTRAP_PASSWORD`, nhập email quản trị và mật khẩu mạnh riêng. `SESSION_SECRET` được Blueprint tự tạo; `DATABASE_URL` lấy trực tiếp từ database nội bộ.

## Migration, khởi tạo và kiểm tra

Build chạy `npm ci && npm run db:generate && npm run build`. Lệnh start là `npm run start:prod`; nó chạy `prisma migrate deploy` trước khi server lắng nghe. Migration thất bại làm deploy thất bại. Health check là `/api/health`.

Sau deploy, mở URL service và `/api/health`. Đăng nhập tại **Quản trị**. Khi bootstrap thành công, xóa `ADMIN_BOOTSTRAP_PASSWORD` khỏi Environment trên Render rồi redeploy. Bootstrap chỉ tạo Admin khi bảng chưa có tài khoản quản trị.

## Cập nhật, backup và phục hồi

Push thay đổi lên GitHub để Render build và deploy tự động. Migration mới trong `prisma/migrations` được áp dụng trước khi server nhận request.

Tạo backup PostgreSQL từ trang database trên Render trước thay đổi dữ liệu lớn. Khôi phục bằng công cụ restore/backup của Render vào database tương thích, sau đó cập nhật `DATABASE_URL` của service nếu đổi database. Có thể tải bản sao ngân hàng câu hỏi JSON tại trang quản trị; tệp JSON này hiện là định dạng backup để đọc/lưu trữ, chưa có giao diện nhập lại JSON.

## Biến môi trường

`NODE_ENV`, `PORT` (Render cấp), `DATABASE_URL`, `SESSION_SECRET`, `ADMIN_BOOTSTRAP_EMAIL`, `ADMIN_BOOTSTRAP_PASSWORD`. Tệp Word được xử lý trong RAM, không lưu bền trên filesystem ephemeral của service.

`DOCX_RED_COLORS` không bắt buộc; mặc định nhận `EE0000`, `FF0000`, `C00000` và `RED`. Có thể khai báo danh sách mã màu hex phân tách bằng dấu phẩy để khớp với tài liệu Word khác.
