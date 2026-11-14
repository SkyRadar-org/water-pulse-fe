# Codex kiểm lại và chốt phản biện UX — 14/11/2026

- Gemini 4 Argon High viết module tổng quan và đề xuất bản dịch/CSS ở vòng 1. Codex đọc mã, tích hợp, rút gọn lời, chuyển giải thích dài vào phần mở rộng và đặt kết quả trước radar/quỹ đạo.
- Vòng 2 Gemini yêu cầu sửa 5 nhóm: chọn xã trước khi map tải xong; 6 xã không quan trắc/3 xã chỉ phủ một phần; nút mở ảnh và lọc track; lời khuyên quá phạm vi/mã kỹ thuật; đồng bộ ô tìm kiếm và bàn phím.
- Codex nhận và sửa cả 5 nhóm. Vòng 3 Gemini PASS trong phạm vi kiểm tĩnh mã được gửi. Hai ghi chú nhỏ (lặp thông báo partial, cập nhật nút khi đổi summary) cũng được Codex sửa.
- Gemini không tự chạy test hoặc điều khiển browser; không gọi các kết quả chạy của Codex là kiểm thử độc lập của Gemini.
- Codex chạy build Cloudflare; 11 test backend, 4 test Worker, 4 test observations đều đạt. Bộ dữ liệu thật xác nhận 131 xã đủ đánh giá:38/40/53;9 xã thiếu gồm6 không quan trắc và3 phủ ít;không biến missing thành zero.
- Browser local: bốn bộ lọc mở đúng38/40/53/9 dòng; tìm AnLong→51.7%29Oct;ảnh3Nov không phủAnLong hiểnthị50/140 vànútđếnảnh29Oct100/140;partialVĩnhThạnh53.6% cócảnhbáo,khôngkếtluậncảxã;BìnhSơn khôngcóphầntrăm/nútảnhgiả. Kiểm390×844,sửa bốtríđầu trang vàđệmfitbounds mobile;EN tìmSonKien vàEnter mởđúngpanel78.2%.
- Giới hạn: những bước trên kiểm dữ liệu đầu ra, luồng dùng và hiển thị. Không kiểm định khoa học phân loại SAR mới và không xác nhận người dùng thực địa đã nghiệm thu sản phẩm. Dữ liệu vẫn là snapshot; không hứa cảnh báo trực tiếp hoặc điều hành bơm/cống.
