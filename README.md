# Website đăng ký suất cơm online

## Công nghệ
- HTML/CSS/JavaScript
- Supabase PostgreSQL làm database
- Có thể deploy frontend miễn phí trên Vercel hoặc Netlify

## 1. Tạo database
1. Tạo tài khoản Supabase.
2. Tạo một project Free.
3. Mở SQL Editor.
4. Dán toàn bộ nội dung `supabase.sql` và Run.
5. Vào Project Settings > API.
6. Lấy Project URL và Publishable/anon key.

## 2. Kết nối website
Mở `app.js`:
- thay `YOUR_SUPABASE_URL`
- thay `YOUR_SUPABASE_ANON_KEY`

Không đưa Service Role Key vào website.

## 3. Chạy thử
Mở `index.html` bằng trình duyệt sau khi đã cấu hình.

## 4. Đưa lên mạng
Cách dễ nhất:
- Đăng code lên GitHub.
- Import repository vào Vercel.
- Không cần build command cho bộ HTML này.
- Deploy.
- Vercel sẽ cấp một URL dạng `*.vercel.app`.

Hoặc dùng Netlify Drop để kéo thả thư mục website.

## 5. Lưu ý bảo mật
Bản demo cho phép mọi người xem và thêm đăng ký. Không cho phép khách xóa dữ liệu.
Nếu muốn trang quản trị riêng để sửa/xóa và xuất Excel, cần thêm Admin Auth + RLS policy.
