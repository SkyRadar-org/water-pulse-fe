# Triển khai UX_PLAN — đã duyệt và merge main

Ngày 14/11/2026, GMT+7. Nhánh: `codex/ux-implementation-20261114`, dựa trên frontend `4f59e90`.

- Hero lấy số qua API, dùng chung cho Tổng quan/Giới thiệu:33/115 xã nhiều nước,14/16 cặp F1 quang học cao hơn,33 lần chụp.
- CTA mở mùa lũ từ tháng 8, đặt lại lựa chọn/lớp cũ, chạy bộ đếm Play duy nhất. Pause, đổi tab/chế độ, phím mũi tên dừng thực.
- Bằng chứng HLS và biểu đồ hiện trước chi tiết kỹ thuật; SWOT dùng `f1_nisar_same_px`, 12 cặp hợp lệ, 11 thắng. Xử lý giá trị thiếu/không hữu hạn/hòa bằng hàm dùng chung và test.
- Simple mặc định; gom lớp, chế độ, track vào Advanced. Giữ nhãn nguồn ảnh ghép và phân biệt tỷ lệ nước trên phần quan trắc với độ phủ toàn xã OSM.
- `test:ux` 10/10, `test:cloudflare` 4/4, buildCloudflare qua. Backend 17/17. Đã kiểm VI/EN, 1440×900 và 390×844, Play/Pause, phím ←/→, quỹ đạo 047D, Back/Forward, xã thiếu phủ và CTA xóa panel. Bản đồ khi mở timeline chiếm 62,3% VI / 64,5% EN chiều cao desktop.
- Gemini đã phản biện tĩnh G1 và frontend, cả hai PASS; không tự chạy test hoặc trình duyệt. Chỉnh nhỏ sau review đã kiểm lại qua build và trình duyệt.

Báo cáo, ảnh và gói Gemini nằm trong repo backend:
[UX implementation evidence](https://github.com/SkyRadar-org/skyradar-nisar/tree/codex/ux-implementation-20261114/docs/verification/ux-implementation-20261114).

Bản xem local: [localhost:8794](http://localhost:8794/?lang=vi), cần server local còn chạy.

**Đã merge main và phát hành bản UX (`8e9daf8`), workflow43594663795 thành công.** Workflow production checkout backend `main`; khi được duyệt, đưa backend/dữ liệu mới lên trước rồi frontend. Bản này cần dữ liệu 115 xã, không dùng snapshot 131 xã cũ.


## Sửa khung hình khi phát

Người dùng báo khung bản đồ/thanh thời gian thay đổi kích thước, sau đó xác nhận đã hết lỗi và yêu cầu merge.
Nguyên nhân: tiêu đề/chú thích khác độ dài, thông báo tải ngắn và dòng hướng dẫn timeline bị ẩn khi phát.
Bản sửa dùng các vùng chữ giữ kích thước theo nội dung dài nhất, không cắt chữ hoặc ấn định chiều cao thiếu linh hoạt.
Đo1280×720: trước sửa map top136,5→156px, timelineheight178,75→155,25px; sau sửa giữ nguyên ở cả hai trạng thái.
BuildCloudflare và10UX+4Worker test qua. Bằng chứng chi tiết nằm trong thư mục QA của backend.
