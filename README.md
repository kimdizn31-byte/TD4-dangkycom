# Đăng ký cơm — Google Login

## Chức năng
- Bắt buộc đăng nhập Google trước khi đăng ký.
- Mỗi tài khoản chỉ có 1 đăng ký cho mỗi ngày + buổi.
- Lựa chọn: Đúng giờ / Ăn trễ / Không ăn.
- Đăng ký mới cho hôm nay bị khóa từ 08:00.
- Đã đăng ký chỉ được đổi Đúng giờ ↔ Ăn trễ:
  - Trưa: chỉ được đổi trước 10:30.
  - Tối: chỉ được đổi trước 17:30.
- Quy tắc thời gian được kiểm tra cả ở database, không chỉ ở giao diện.
- Giao diện tối, tối ưu điện thoại.
- Tổng kết: tổng đăng ký, đúng giờ, ăn trễ, không ăn, trưa, tối.

## Cài đặt
1. Chạy toàn bộ `supabase.sql` trong Supabase SQL Editor.
2. Bật Google Provider trong Supabase Authentication.
3. Cấu hình Google OAuth Client ID/Secret theo tài liệu Supabase.
4. Trong `app.js`, thay `YOUR_SUPABASE_URL` và `YOUR_SUPABASE_PUBLISHABLE_KEY`.
5. Đưa 5 file lên GitHub và deploy bằng Vercel.
6. Sau khi có domain Vercel, thêm domain vào Site URL / Redirect URLs của Supabase và Authorized JavaScript origins của Google.

## Giả định
"Khóa lúc 08:00" được hiểu là khóa đăng ký mới cho suất của ngày hiện tại; đăng ký ngày tương lai vẫn được phép. Nếu bạn muốn 08:00 khóa toàn bộ ngày tương lai hoặc muốn khung đổi trạng thái chỉ đúng 1 phút, sửa quy tắc trong `supabase.sql`.
