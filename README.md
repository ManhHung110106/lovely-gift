# Lovely Gift

Nền tảng thiệp cá nhân hóa cho nhóm bạn, triển khai dạng website tĩnh trên GitHub Pages.

Website: https://manhhung110106.github.io/lovely-gift/ · Repository: https://github.com/ManhHung110106/lovely-gift

## Chạy trên máy

```powershell
npm ci
npm run dev
```

Mở URL Vite in ra. Thiệp mẫu dùng tên `linh`, `mai`, `an`. Các tranh trong dữ liệu mẫu là minh họa tự tạo, không phải ảnh người nhận thật.

Admin chạy trên máy bạn, tại `http://127.0.0.1:5173/admin`. Trang thiệp không hiện nút quản trị. Lần chạy đầu máy chủ tạo tài khoản `admin` và mật khẩu ngẫu nhiên trong `.local-admin/login.txt`; mở tệp này trên máy để lấy thông tin đăng nhập. Không gửi/commit thư mục `.local-admin`. Máy chủ kiểm tra mật khẩu đã hash, cấp cookie HttpOnly và chặn đọc/lưu bản nháp khi chưa đăng nhập. Đăng xuất trong sidebar để kết thúc phiên. Bản GitHub Pages chỉ phục vụ thiệp người nhận; không có máy chủ admin online.

## Quản lý nội dung

1. Trong admin, tạo người nhận, thêm ảnh, cấu hình sự kiện và nhạc/video.
2. Nhập CSV UTF-8 từ Sheets. Có mẫu tải trong giao diện. Kiểm tra các dòng và cột trước khi áp dụng.
3. Xem trước thiệp từng người. Xuất gói JSON trong Lưu & xuất bản. Gói chứa toàn bộ sự kiện và tài nguyên nhúng.
4. Chạy `npm run publish:data -- C:\duong-dan\lovely-gift-site.json`.
5. Commit và push lên `main`. GitHub Actions triển khai dữ liệu mới.

Bản nháp được lưu vào `.local-admin/draft.json` bởi máy chủ đã xác thực, kèm bộ nhớ IndexedDB để chuyển dữ liệu từ phiên bản cũ. Xuất JSON thường xuyên để có bản sao độc lập. Sửa bản nháp chưa thay đổi website công khai.

Tên truy cập và tên hiển thị là hai trường riêng: ví dụ tên truy cập `Nguyễn Linh 01/01/2000`, tên hiển thị `Linh`. Người nhận nhập tên truy cập để mở đúng thiệp; thiệp chỉ dùng tên hiển thị. Trong Sự kiện → Nhạc nền, chọn tệp nhạc mới để thay bài hát, nghe thử bằng bộ phát và xuất bản lại để cập nhật website.

Mở thư luôn hiện lời chúc chung trước. Trong Người nhận → Chỉnh sửa → Video YouTube riêng, đặt video cho từng người; để trống sẽ dùng video mặc định của sự kiện. CSV Người nhận hỗ trợ cột tùy chọn `video_url`; bỏ cột này sẽ giữ video đã cấu hình, còn ô trống trong cột này sẽ xóa video riêng. Bấm lời chúc để mở trang video; nút mở sổ chỉ xuất hiện sau trạng thái kết thúc từ YouTube. Tạm dừng video không mở khóa sổ. Nếu chưa cấu hình video, bấm lời chúc vào sổ; bản HTML offline cũng giữ được khả năng đọc sổ khi YouTube không có kết nối.

Ảnh tải lên được tối ưu thành WebP. Khi cập nhật dữ liệu bằng `publish:data`, ảnh/nhạc nhúng được tách thành tệp trong `public/media`, đặt tên theo nội dung để dùng chung khi trùng. Website chỉ tải ảnh của người nhận đang xem; nhớ commit cả thư mục media và content.

Một spreadsheet có thể dùng hai tab. Người nhận: `recipient_id,name,account`. Lời chúc: `wish_id,recipient_id,sender_name,message,order`. Ba cột tiếng Việt Người gửi/Nội dung/Người nhận cũng được hỗ trợ qua đối chiếu cột.

## Thiệp tải xuống

Ở cảnh cuối, chờ 5 giây rồi chọn Giữ lại món quà. Tệp HTML chứa snapshot của đúng người nhận, JavaScript, CSS, font, ảnh và nhạc; mở trực tiếp bằng trình duyệt. Video YouTube vẫn cần Internet. Đổi/xóa dữ liệu trên website không sửa tệp đã tải.

## GitHub Pages

Tạo repository, push dự án lên nhánh `main`, chọn Settings → Pages → Source: GitHub Actions. Workflow trong `.github/workflows/pages.yml` chạy kiểm tra, test, build và deploy.

Mặc định workflow phục vụ tại `https://<user>.github.io/<repo>/`. Nếu dùng repository `<user>.github.io` hoặc custom domain, đặt `PAGES_BASE: /` trong workflow. Bản build dùng URL dạng query nên refresh không cần server rewrite.

Thiệp lưu trữ: `/?event=<event-id>`. Đổi sự kiện hiện hành vẫn giữ được sự kiện cũ nếu không xóa khỏi gói JSON. Tên truy cập dùng để chọn thiệp, không cung cấp bảo mật nội dung; dữ liệu trên hosting tĩnh có thể được đọc.

## Kiểm tra

```powershell
npm run check
npm test
npm run build
```

Không đưa tệp runtime sinh tự động vào Git; workflow tái tạo bằng build. Xem IMPLEMENTATION_PLAN.md để theo dõi các tiêu chí còn cần xác minh trước phát hành.

Kiểm tra trình duyệt trên máy có Microsoft Edge: chạy `npm ci --prefix tools/mcp`, mở dev server, rồi chạy `node scripts/qa.cjs` và `node scripts/qa-admin.cjs`. Script `qa-production.cjs` dùng preview tại `http://127.0.0.1:4173/lovely-gift/` với bản build `PAGES_BASE=/lovely-gift/`. Báo cáo/ảnh chụp nằm trong `artifacts/qa`.

`qa-admin.cjs` cũng dùng preview production để đối chiếu 20 người nhận và 15 phiên đồng thời. `qa-concurrency.cjs` kiểm tra riêng 15 cảnh 3D cùng hoạt động trên preview. `qa-revisit.cjs` kiểm tra vòng đời canvas/animation/âm thanh khi vào và rời cảnh nhiều lần trên dev server; `qa-media.cjs` kiểm tra tệp nhạc thực và xuất ảnh/nhạc.

`qa-revision.cjs` kiểm tra đăng nhập sai/đúng, API bị chặn khi chưa đăng nhập, bảo vệ tệp credentials, đăng xuất, đổi nhạc và hiệu ứng sách. Test khôi phục bản nháp ban đầu khi kết thúc; các script QA admin khác dùng bản nháp mô phỏng riêng để không sửa nội dung thật của bạn.
