# Công cụ cho Lovely Gift

## Đã cài và kiểm chứng

- Playwright MCP của Microsoft: `@playwright/mcp@0.0.83`, khóa phiên bản trong `package-lock.json`.
- Tên đăng ký trong Codex: `lovely-gift-playwright`.
- Cấu hình nằm trong cấu hình người dùng Codex; đây là đăng ký toàn cục, chạy package nằm trong dự án này.
- Dùng Microsoft Edge có sẵn, chạy headless với phiên isolated và capability vision.
- Kết quả kiểm tra giao thức MCP, mở website thật, chụp desktop/mobile và đóng trình duyệt: `../../artifacts/browser/mcp-smoke-test.json`.
- Kiểm tra npm audit lúc cài: không ghi nhận lỗ hổng đã biết. Đây không phải đánh giá an toàn toàn bộ ứng dụng.

Chạy lại kiểm tra từ thư mục dự án:

```powershell
node .\tools\mcp\smoke-test.cjs
```

Khôi phục package từ lockfile:

```powershell
npm.cmd ci --prefix .\tools\mcp
```

MCP đã được kiểm tra trực tiếp bằng client kiểm tra. Bộ công cụ của chat đang chạy có thể chưa nạp server mới; mở chat mới hoặc tải lại Codex nếu cần.

## Các kết nối khác

- Figma MCP: đã kết nối và kiểm tra tài khoản thành công. Quyền tạo/chỉnh sửa thiết kế chưa được kiểm chứng; tài khoản trả về seat View.
- GitHub plugin: người dùng đã chọn không cài. Quản lý repository và triển khai dùng Git/GitHub CLI khi đã có xác thực tài khoản. Không lưu token vào dự án.
- Google Drive/Sheets: công cụ có sẵn trong phiên, chưa kiểm tra một bảng cụ thể. Không cần kết nối này để nhập CSV xuất từ Sheets.
- Image generation: đã có công cụ tích hợp để tạo hình trang trí khi thiết kế cần; không cần cài thêm MCP.

## Phạm vi lựa chọn

Playwright phục vụ kiểm thử luồng thiệp, responsive và cảnh WebGL. Figma phục vụ thiết kế. GitHub phục vụ quản lý repository, CI và triển khai Pages. Không cần MCP backend/database/hosting khác cho phương án website tĩnh hiện tại. Three.js, React Three Fiber và thư viện lật sổ là dependency ứng dụng, sẽ được chọn/cài ở bước triển khai, không phải MCP.

## Nguồn chính thức

- Microsoft Playwright MCP: https://github.com/microsoft/playwright-mcp
- Codex MCP: https://learn.chatgpt.com/docs/extend/mcp?surface=cli
- Vite deploy GitHub Pages: https://vite.dev/guide/static-deploy.html
