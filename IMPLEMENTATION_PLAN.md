# Kế hoạch triển khai Lovely Gift

Ngày lập: 10/10/2026 · Múi giờ: Asia/Saigon.

## 1. Mục tiêu và phạm vi đã chốt

Website thiệp cho nhóm bạn dưới 50 người, khoảng 20 người nhận và 15 lượt truy cập đồng thời. Sự kiện đầu tiên là 20/10; cấu trúc cho phép tái sử dụng cho 8/3, 20/11, Valentine và các dịp khác.

- Admin kiêm developer tạo người nhận, quản lý sự kiện, ảnh và lời chúc.
- Một sự kiện hoạt động ở trang chủ tại mỗi thời điểm.
- Người nhận nhập tên truy cập do admin cấp để chọn thiệp; không yêu cầu mật khẩu.
- Lời chúc do admin duyệt trước rồi nhập từ bảng; text/emoji, tối đa 500 từ, có tên người gửi hoặc ẩn danh.
- Ảnh do admin quản lý theo từng người nhận, dự kiến dưới 10 ảnh/người.
- Video YouTube và nhạc nền dùng chung cho sự kiện.
- Lượt xem đầu theo thứ tự; điều hướng tự do sau khi tới cảnh cuối và chờ 5 giây.
- Hosting đích: GitHub Pages. Thiệp tải xuống phải độc lập với dữ liệu đang hoạt động.

## 2. Các quyết định kiến trúc

### 2.1 Website và admin

React + TypeScript + Vite. Three.js + React Three Fiber cho cảnh 3D, camera và hệ thống hạt. Thư viện lật sổ sẽ được chọn sau thử nghiệm nội dung dài và tiếng Việt.

Phần người nhận đọc các gói JSON/tài nguyên đã xuất bản. Công cụ admin biên soạn bản nháp trên máy admin, lưu trong IndexedDB và xuất gói sự kiện. Bản nháp và bản đã phát hành có trạng thái riêng.

Vì GitHub Pages không có backend để lưu dữ liệu dùng chung, phiên bản đầu thực hiện xuất bản qua repository: xuất gói -> cập nhật thư mục nội dung -> GitHub Actions kiểm tra/build -> triển khai. Admin cần có thao tác sao lưu/khôi phục bản nháp; không dựa vào dữ liệu trình duyệt làm bản lưu duy nhất.

Admin có thể là entry riêng chỉ phục vụ khi chạy dự án trên máy developer. Quyền xuất bản được kiểm soát bằng quyền GitHub; tên truy cập người nhận không được dùng làm quyền quản trị.

### 2.2 Dữ liệu

- Event: mã ổn định, tên, ngày, theme, video, nhạc và cấu hình hiệu ứng.
- Recipient: mã ổn định, tên hiển thị, tên truy cập và danh sách ảnh.
- Wish: mã ổn định, mã người nhận, tên người gửi, nội dung và thứ tự.
- Manifest: mã sự kiện hiện hành và các sự kiện lưu trữ.
- Gói phát hành: phiên bản dữ liệu và tài nguyên đi kèm.

Một mã người nhận có thể được tái sử dụng giữa các sự kiện; ảnh và lời chúc thuộc cặp sự kiện/người nhận. Không dùng tên hiển thị làm khóa dữ liệu.

Tên truy cập được trim và so khớp không phân biệt hoa/thường; giữ dấu tiếng Việt để tránh gộp nhầm tên. Admin phải được báo lỗi khi tên truy cập bị trùng sau chuẩn hóa.

### 2.3 Nhập bảng

Một spreadsheet với các tab Người nhận và Lời chúc; xuất CSV UTF-8 của tab cần nhập. Nếu chỉ có bảng ba cột Người gửi/Nội dung/Người nhận, công cụ hỗ trợ ánh xạ cột và đối chiếu người nhận.

Các cột khuyến nghị cho lời chúc: wish_id, recipient_id, sender_name, message, order. Người gửi trống hiển thị Ẩn danh. Import cần xem trước và báo lỗi theo dòng; không tự gắn lời chúc khi đối chiếu mơ hồ.

Hai chế độ rõ ràng: thay toàn bộ lời chúc của sự kiện hoặc cập nhật theo wish_id. Các dòng thiếu mã chỉ dùng được với chế độ thay toàn bộ, trừ khi admin cấp mã trước khi cập nhật.

CSV là phạm vi đầu tiên. XLSX và đồng bộ Google Sheets trực tiếp chỉ bổ sung nếu có nhu cầu thực tế sau khi luồng cơ bản hoạt động.

### 2.4 Lưu trữ

Trang chủ mở sự kiện đang hoạt động. URL có mã sự kiện cố định mở được thiệp cũ khi sự kiện đã lưu trữ. Đổi sự kiện không xóa nội dung cũ. Xóa vĩnh viễn tài nguyên sẽ làm mất khả năng xem online tương ứng.

Bản tải xuống là snapshot đúng một người nhận, dùng renderer tương thích mở trực tiếp. Không đưa dữ liệu người nhận khác vào gói xuất. HTML hay ZIP được quyết định sau thử nghiệm offline; YouTube cần Internet và có thông báo phù hợp khi offline.

## 3. Trình tự thực hiện và nghiệm thu

### Giai đoạn A — Đặc tả và nền móng

- [x] Chuẩn hóa dữ liệu, quy tắc tên truy cập, độ dài lời chúc và luồng sự kiện.
- [x] Khởi tạo ứng dụng, quy trình build và dữ liệu mẫu.
- [x] Tạo bộ mẫu gồm người không có ảnh, một ảnh, nhiều ảnh, tên có dấu, lời chúc 500 từ và emoji.
- [x] Tạo mẫu bảng nhập và hướng dẫn ngắn cho admin.

Đầu ra: ứng dụng chạy local, dữ liệu mẫu và hợp đồng dữ liệu rõ ràng. Chưa cần ảnh/nhạc thực của người dùng để tiến hành.

### Giai đoạn B — Thiết kế UI/UX và nguyên mẫu

- [x] Chốt palette kem/hồng phấn/cherry, typography tiếng Việt, chất liệu giấy và nhịp chuyển cảnh.
- [x] Thiết kế màn nhập tên, phong thư, video, sổ, cảnh cuối và admin trên desktop/mobile.
- [x] Thiết kế riêng cho dự án dựa trên ý tưởng dẫn dắt của website tham khảo.
- [ ] Kiểm tra quyền ghi Figma; nếu chưa dùng được, tạo prototype trực tiếp bằng code để tiếp tục thiết kế.
- [x] Thử sổ với lời chúc dài, tự chia trang, ảnh dọc/ngang và thao tác cảm ứng.
- [x] Thử renderer 3D và cơ chế đóng gói offline ngay ở giai đoạn này.

Nghiệm thu: thấy được toàn bộ trải nghiệm bằng dữ liệu mẫu; sổ dễ đọc và prototype offline chứng minh cách xuất có thể thực hiện.

### Giai đoạn C — Trải nghiệm người nhận

- [x] Nhập tên -> đúng thiệp; tên không hợp lệ có phản hồi rõ ràng.
- [x] Phong thư nổi giữa màn hình với hoa, bóng bay và hiệu ứng trái tim.
- [x] Bấm mở thư khởi động nhạc; xử lý trường hợp trình duyệt chặn phát.
- [x] Video YouTube dùng chung; tạm dừng nhạc khi video phát, tiếp tục nhạc khi rời video.
- [x] Sổ có bìa cá nhân hóa, tên người gửi, nội dung và ảnh; dùng phông dễ đọc cho đoạn dài.
- [x] Cảnh cuối có pháo hoa/trái tim, ảnh, đoạn trích lời chúc, xoay/kéo/thu phóng.
- [x] Camera chuyển mượt, giới hạn góc/zoom để tránh lạc khỏi cảnh.
- [x] Điều khiển nhỏ xuất hiện sau 5 giây: quay lại phần đã xem, nhạc và tải thiệp.
- [x] Người nhận đã hoàn thành có thể điều hướng tự do khi quay lại trên cùng thiết bị; tiến độ lưu theo sự kiện/người nhận.

Nghiệm thu: hoàn thành luồng trên desktop và điện thoại; không bắt người dùng đọc sổ theo đồng hồ. Hai phút là nhịp trình diễn mục tiêu, không phải thời gian cưỡng chế.

### Giai đoạn D — Công cụ admin

- [x] Tạo/sao chép sự kiện, cấu hình video/nhạc/theme, chọn sự kiện hiện hành.
- [x] Tạo/sửa người nhận thủ công, nhập danh sách và quản lý ảnh.
- [x] Nhập CSV với ánh xạ cột, preview và báo lỗi trước khi áp dụng.
- [x] Sửa, xóa, sắp xếp lời chúc và xem trước thiệp từng người.
- [x] Lưu/khôi phục bản nháp và xuất gói sự kiện.
- [ ] Xuất bản qua repository theo hướng dẫn/command của dự án.

Nghiệm thu: admin có thể sửa nội dung và ảnh mà không sửa mã ứng dụng; nội dung mới chỉ hiển thị công khai sau khi phát hành thành công.

### Giai đoạn E — Xuất thiệp và kiểm thử

- [x] Đóng gói snapshot cá nhân, thư viện/font/tài nguyên cần thiết để mở trực tiếp.
- [x] Kiểm tra khi ngắt Internet; không tải phụ thuộc từ CDN để dựng phần trải nghiệm offline.
- [x] Kiểm chứng trực tiếp việc thay sự kiện hiện hành và xóa người nhận khỏi dữ liệu nguồn thử nghiệm rồi mở lại bản HTML offline.
- [x] Đối chiếu ảnh riêng và lời chúc riêng của 20 người nhận; kiểm tra lỗi tên, trùng tên, nội dung dài và emoji.
- [x] Kiểm thử import thay thế/cập nhật: không trùng dữ liệu, không gắn nhầm người.
- [x] Kiểm thử quay lại scene: không phát nhạc chồng, không tăng số canvas/animation loop.
- [x] Kiểm thử cảnh 3D bằng ảnh chụp và thao tác camera; kiểm tra console/network.
- [x] Smoke test 15 phiên production đồng thời ở luồng nhập tên/đọc sổ và đo resource transfer; kiểm tra riêng 15 cảnh WebGL cùng vẽ, không context loss trên máy local.
- [ ] Kiểm tra giả lập responsive và kiểm tra thủ công trên điện thoại thật trước khi phát hành.

Nghiệm thu: build/checks đạt; không có lỗi nghiêm trọng trong các luồng bắt buộc; bản tải xuống hoạt động độc lập trên các môi trường đã kiểm tra.

### Giai đoạn F — Triển khai và bàn giao

- [ ] Xác định repository GitHub và xác thực Git/GitHub CLI khi cần.
- [ ] Thiết lập GitHub Actions và Pages; đúng base path của repository.
- [ ] Kiểm tra URL gốc, URL thiệp lưu trữ, refresh và đường dẫn ảnh/nhạc sau deploy.
- [ ] Nạp dữ liệu thật của sự kiện, xem trước và kiểm tra danh sách tên truy cập.
- [ ] Kiểm tra trên điện thoại thật, video/âm thanh và tải thiệp từ URL công khai.
- [ ] Bàn giao URL, mẫu bảng, hướng dẫn nhập/sửa/xuất bản và cách phục hồi phiên bản cũ.

Nghiệm thu: người nhận thật nhập tên và xem đúng thiệp trên GitHub Pages; admin có thể cập nhật và phát hành phiên bản tiếp theo theo hướng dẫn.

## 4. Công cụ và trạng thái

- Figma MCP: kết nối đã xác nhận; quyền tạo/chỉnh sửa chưa xác nhận.
- Playwright MCP: đã cài và kiểm tra giao thức, mở trang, chụp desktop/mobile thành công.
- Git/GitHub CLI: dùng cho repository/deploy; Git có sẵn, CLI/xác thực cần kiểm tra tại bước triển khai.
- Công cụ tạo ảnh tích hợp: dùng khi cần hoa, phong thư hoặc hình trang trí riêng.
- Người dùng đã chọn không cài GitHub plugin; không phụ thuộc plugin đó.

## 5. Những đầu vào cần trước khi phát hành

- Danh sách người nhận và tên truy cập, bảng lời chúc đã duyệt, ảnh theo mã người nhận.
- URL video YouTube, tệp nhạc và quyền sử dụng tài nguyên.
- Repository hoặc tài khoản GitHub dùng để triển khai.
- Chọn một vài người nhận thử trên điện thoại thật.

Các đầu vào này không ngăn thiết kế và xây hệ thống bằng dữ liệu mẫu. Chưa có deadline cụ thể được xác nhận; không mặc định toàn bộ dự án phải hoàn thành trước 20/10/2026.

## 6. Thứ tự ưu tiên

Ưu tiên chứng minh hình ảnh, sổ đọc được và khả năng xuất offline trước khi xây đầy đủ admin. Sau đó hoàn thiện nội dung/quản trị, chạy kiểm thử rồi triển khai. Không coi website đã hoàn thành chỉ vì có demo 3D đẹp hoặc deploy thành công.

## Nguồn nghiên cứu

- https://vite.dev/guide/static-deploy.html
- https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages
- https://threejs.org/docs/pages/OrbitControls.html
- https://r3f.docs.pmnd.rs/getting-started/introduction
- https://developers.google.com/youtube/iframe_api_reference
- https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Autoplay
- https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules



