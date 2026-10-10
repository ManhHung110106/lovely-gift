# Kiểm chứng và tình trạng phát hành

Ngày cập nhật: 10/10/2026, Asia/Saigon.

## Đã xây và kiểm chứng bằng trình duyệt

- Trái tim hạt đã đổi sang khối căng phồng với hai múi, rãnh giữa và chóp dưới theo ảnh bổ sung, có mặt trước/sau; không còn viền lineLoop 2D. Shader hạt có halo/twinkle, 8 cụm pháo hoa lệch nhịp và 6 đuôi sao băng; đã xem góc chính diện/góc nghiêng và kiểm tra không có lỗi shader.
- Lời chúc chung và video là hai trang riêng; sổ chỉ mở sau YouTube ENDED, chưa mở ở PLAYING/PAUSED. Ca này dùng API mock, chưa xác minh video thật của sự kiện vì URL chưa được cung cấp.
- Video YouTube riêng được cấu hình trong từng người nhận; video riêng ưu tiên hơn mặc định của sự kiện, theo đúng người đang xem và được giữ trong snapshot HTML. Đường dẫn được kiểm tra khi lưu/import.

- Theo chỉnh sửa mới: bỏ subtitle/chỉ dẫn được đánh dấu, bỏ nút admin khỏi trang thiệp, đổi nhãn nhập tên; tên truy cập có thể chứa họ tên/ngày sinh, tên hiển thị độc lập.
- Sách có hiệu ứng mở bìa và lật trang 700ms; click trang để sang trang kế tiếp, click trang cuối vào cảnh 3D. Kiểm thử phát hiện class animation và hoàn thành luồng sau animation.
- Admin local tại `/admin`: đăng nhập đúng/sai, chặn API đọc/lưu khi chưa đăng nhập, chặn tải tệp credentials qua HTTP, cookie phiên và đăng xuất đã kiểm chứng. Thay hai tệp nhạc khác nhau, reload và đối chiếu bản nháp trên máy chủ đạt.

- Nhập tên chọn đúng thiệp, không phân biệt hoa/thường và bỏ khoảng trắng đầu/cuối; tên không tồn tại có phản hồi.
- Phong thư, hoa, bóng bay, nhạc sau thao tác mở; phần lời mở đầu/video; sổ lời chúc; cảnh Three.js với trái tim hạt sáng, pháo hoa, ảnh hai mặt và lời chúc chuyển động.
- Camera xoay/kéo/zoom; giao diện desktop và viewport cảm ứng 390px.
- Điều hướng lượt đầu theo thứ tự; bảng điều khiển xuất hiện sau 5 giây ở cảnh cuối.
- Người không có ảnh hoặc lời chúc vẫn hoàn thành được luồng.
- Sổ chia một lời chúc 500 từ thành nhiều trang trên mobile, giữ đủ 500 từ và không tràn trang.
- Tệp HTML tải xuống mở trực tiếp khi Internet tắt, dựng cảnh 3D, ảnh/font không yêu cầu HTTP; snapshot chứa người nhận đang xuất.
- Admin tạo người nhận, nhận diện tên truy cập trùng, thêm ảnh, viết lời chúc, nhập CSV, cập nhật không trùng mã, sao chép/chọn sự kiện, xuất và khôi phục JSON.
- IndexedDB giữ bản nháp qua reload sau khi báo đã lưu.
- Admin lưu xong thay đổi mới nhất trước khi chuyển sang xem trước hoặc rời công cụ; kiểm thử chỉnh sửa rồi xem trước ngay và reload xác nhận dữ liệu được giữ.
- 20 tài khoản fixture được đối chiếu với ảnh đã decode và lời chúc riêng; 15 phiên production đồng thời ở luồng nhập tên/đọc sổ, có ghi resource transfer. Đây là smoke test local, chưa phải phép đo hosting thật.
- 15 phiên production cùng chạy cảnh 3D: mỗi phiên có một canvas, có draw calls trong khoảng lấy mẫu 5 giây, không ghi nhận WebGL context loss hoặc lỗi JavaScript. Cùng dùng một GPU máy kiểm thử; kết quả không chứng minh tốc độ trên điện thoại thật.
- Sau khi thay sự kiện và xóa người nhận khỏi manifest thử nghiệm, bản HTML đã tải vẫn mở offline và dựng cảnh 3D; snapshot chỉ chứa người nhận đã chọn và lời chúc của người đó.
- Ba lượt vào/rời cảnh 3D: canvas được gỡ khi rời cảnh, vòng requestAnimationFrame không tiếp tục, chỉ có một AudioContext chạy.
- Bản build chạy với base `/lovely-gift/`, refresh, ảnh và tải thiệp hoạt động; query admin không mở quản trị trong production.
- Thiệp sự kiện cũ vẫn mở bằng mã sự kiện khi manifest chọn sự kiện khác.
- Tệp WAV thực phát sau thao tác mở thư, tắt/bật dùng một audio element cả trong dev StrictMode.
- Tạm dừng/tiếp tục nhạc theo trạng thái video đã kiểm tra bằng mock YouTube IFrame API. Đây không chứng minh một video thật cụ thể luôn phát được.
- CLI xuất bản tách ảnh/nhạc nhúng ra tệp media, kiểm tra tệp tồn tại và tải ảnh với base của Pages.

## Bằng chứng

- `npm run check`: TypeScript đạt.
- `npm test`: 10 kiểm tra dữ liệu/import/phân trang đạt.
- `npm run build` với `PAGES_BASE=/lovely-gift/`: đạt.
- `artifacts/qa/report.json`: luồng thiệp, offline, admin persistence, mobile.
- `artifacts/qa/admin-report.json`: admin, CSV, backup, 20 tài khoản, 15 phiên.
- `artifacts/qa/production-report.json`: subpath, lưu trữ, phân trang dài, người nhận trống, YouTube mock.
- `artifacts/qa/media-report.json`: phát tệp WAV, tách media, tải ảnh từ đường dẫn Pages.
- `artifacts/qa/revisit-report.json`: vòng đời canvas, animation và âm thanh khi quay lại cảnh.
- `artifacts/qa/concurrency-report.json`: 15 cảnh WebGL đồng thời trong bản production local.
- `artifacts/qa/sparkles-report.json`: góc chính diện/góc xoay, kiểm tra lỗi shader và JavaScript.
- `artifacts/qa/revision-report.json`: yêu cầu UI mới, chuyển trang sách, đăng nhập local, kiểm soát truy cập và thay nhạc.
- `artifacts/qa/live-production-report.json`: kiểm thử trên URL Pages thật (tải lại, ảnh, cảnh cuối, tải HTML); các ca sự kiện lưu trữ/nội dung dài/YouTube dùng fixture hoặc API mock.
- Workflow GitHub Actions đầu tiên thành công: https://github.com/ManhHung110106/lovely-gift/actions/runs/38014515426.

Các báo cáo/ảnh là tài nguyên sinh trên máy và bị loại khỏi Git. Các script QA có trong `scripts/` để chạy lại. Không coi toàn bộ chức năng đạt chỉ từ một ảnh chụp hay build thành công.

## Chưa hoàn thành / chưa xác minh

- Repository `ManhHung110106/lovely-gift` đã push, workflow build/deploy thành công; URL công khai: https://manhhung110106.github.io/lovely-gift/. Dữ liệu hiện vẫn là demo.
- Dữ liệu hiện tại là demo có tranh minh họa tự tạo. Chưa nạp danh sách, ảnh, lời chúc, video và nhạc thực của nhóm.
- Chưa kiểm thử trên điện thoại thật/trình duyệt Zalo hoặc Facebook, chưa nghe đánh giá âm thanh thực từ người nhận.
- Chưa xác minh quyền ghi Figma. UI đã được dựng và kiểm tra trực tiếp bằng code.

Mục tiêu toàn bộ theo kế hoạch vẫn đang thực hiện. Bước còn lại là nạp dữ liệu thật và kiểm tra trên thiết bị/người nhận thật. Website demo đã phát hành.
