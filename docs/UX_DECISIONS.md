# Quyết định sản phẩm sau phản hồi giao diện

Nguồn: chỉ đạo người dùng ngày 14/11/2026 (GMT+7): dữ liệu chỗ có, chỗ không; mở web không hiểu dùng để làm gì; áp dụng triết lý phát triển sản phẩm SkyRadar. Phạm vi: NISAR Water Pulse.

## Tiêu chí thực thi

1. Bắt đầu từ công việc: cán bộ thủy lợi và HTX cần tìm xã còn nhiều nước trước vụ Đông Xuân để ưu tiên kiểm tra, đối chiếu kế hoạch tiêu nước.
2. Đưa kết quả lên trước: tổng quan mặc định hiển thị các nhóm xã, ngày quan sát và ô tìm xã. Radar, quỹ đạo và thanh thời gian thuộc bước xem bằng chứng.
3. Việc tiếp theo rõ ràng: chọn nhóm → chọn xã → đọc kết quả → mở đúng ảnh. Ngày và độ phủ luôn đi cùng số liệu. Tỷ lệ nước thấp không chứng nhận ruộng đủ điều kiện xuống giống.
4. Trung thực về thời gian: chế độ tổng quan dùng quan sát gần nhất riêng của từng xã, có ngày riêng. Chế độ một lần chụp chỉ dùng một ảnh thật. Không ghép pixel giữa các quỹ đạo hoặc nội suy số liệu cho ngày không có ảnh.
5. Thiếu ảnh không có nghĩa đã khô: tổng quan tách chín xã chưa đủ phủ khỏi đánh giá. Sáu xã không có quan trắc và ba xã chỉ phủ một phần được giải thích riêng. Nút mở ảnh chỉ xuất hiện khi có ảnh khớp ngày và quỹ đạo.
6. Ảnh radar dùng JPG nội bộ cùng ngày, quỹ đạo và lưới với lớp nước; mặc định tắt, chỉ xem khi chủ động mở bằng chứng.

## Bằng chứng

- 131/140 xã có ảnh phủ ít nhất 50% diện tích để đánh giá: 38 xã từ 30% nước, 40 xã từ 10% đến dưới 30%, 53 xã dưới 10%.
- An Long có 51,7% nước ngày 29/10/2026, quỹ đạo 083A; ảnh 03/11/2026 trên quỹ đạo 148D không quan sát xã này. Giao diện cũ không giải thích được sự khác biệt đó.
- Quan sát cuối của các xã đủ đánh giá nằm trong 27/10–03/11/2026. Đây là bộ ảnh cuối mùa, không phải tình trạng hôm nay.
- Build thành công; 11 kiểm thử backend, 4 kiểm thử Worker và 4 kiểm thử quan sát đạt. Đã kiểm bộ lọc 38/40/53/9, dữ liệu thiếu/phủ một phần, An Long, VI/EN, bàn phím và màn hình 390×844.
- Gemini viết phần tổng quan rồi phản biện ba vòng; Codex nhận và sửa năm nhóm vấn đề, tự chạy kiểm thử và trình duyệt. Gemini chỉ kiểm tĩnh; lượt cuối PASS trong phạm vi mã được gửi. Hồ sơ tại `verification/ux/`.

## Phát hành và giới hạn

Website thật đã cập nhật và kiểm tra: https://nisar-flood.skyradar.vn. Mã JavaScript trên production khớp byte với bản dựng local. Kết quả HTTP tại `verification/ux/production-http-checks.json`; thông tin triển khai tại `LOCAL_DEPLOYMENT.md`.

Đây là kiểm tích hợp và trải nghiệm, không phải kiểm định khoa học SAR mới hoặc nghiệm thu của cán bộ thực địa. Chỉ commit và push nhánh riêng; chưa tạo PR, merge, nhánh main cho backend hoặc GitHub Actions.
