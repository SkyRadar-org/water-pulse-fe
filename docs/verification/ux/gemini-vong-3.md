**Thời gian báo cáo:** `11:09 GMT+7, 14/11/2026`
**Phương pháp:** Kiểm tra tĩnh (Static Code Review) trên 4 tệp mã nguồn mới đính kèm (`src/map/map.ts`, `src/ui/communePanel.ts`, `src/ui/overview.ts`, `src/locales/overview.ts`).
**Kết luận (Verdict):** **`PASS`** (trong phạm vi kiểm tra tĩnh các tệp đầu vào).

---

### Kết quả đối chiếu 5 nhóm sửa lỗi

1. **Nhóm 1 — Đồng bộ `flyToCommune`, `map.resize` và tách biệt `activeSummary` / `playing` (ĐẠT):**
   * `src/map/map.ts`: Hàm `flyToCommune()` đã gọi `map.resize()` trước khi `fitBounds`, tính đệm dưới trên màn hình hẹp theo `container.clientHeight * 0.62 + 8`, và được gọi ở cả cuối `map.on('load')` lẫn `subscribe` (xử lý triệt để trường hợp chọn xã khi bản đồ chưa tải xong).
   * `applyLook()` đã khóa `summaryOn = s.mapMode === 'scene' && s.activeSummary !== null`, ngăn lớp tổng hợp mùa lũ đè lên bản đồ ở chế độ `latest`.
   * `src/ui/overview.ts`: `openMapOverview()` và `openCommuneOnMap()` đã đặt lại `activeSummary: null, playing: false`.

2. **Nhóm 2 — Xử lý tách biệt 6 xã không quan trắc (`noObs`) và 3 xã phủ một phần (`partial <50%`) (ĐẠT):**
   * `src/ui/communePanel.ts`: Đã bỏ lời gọi nhầm `T.overview.cards.insufficientDesc(1, 0)`, tách riêng `T.panel.noObservationAction` và `T.panel.partialAction`.
   * Nhóm phủ một phần (`<50%`) giữ được hiển thị `fmtPct(p.last_pct)` kèm ngày chụp và nhãn `T.panel.partialEvidence`, khớp với bảng `Overview`.
   * `plainSummary()` đã chặn `if (!hasAssessment(p))` và khối `<details class="cp-history">` tự động ẩn khi `series.length === 0`.

3. **Nhóm 3 — Ngữ cảnh `latest` vs `scene` và nút chuyển ảnh tham chiếu (ĐẠT):**
   * `updateEvidence()` trong `src/ui/communePanel.ts` đã tính `viewingReference` và ẩn `viewImage` khi bản đồ đang ở đúng `scene` (`date + track`) đó và không bật `activeSummary`.
   * Sự kiện bấm `viewImage` và bấm điểm trên biểu đồ đã đặt `trackFilter: 'all', activeSummary: null,Playing: false`, không còn làm ẩn các quỹ đạo khác trên thanh thời gian.

4. **Nhóm 4 — Ngôn ngữ theo triết lý SkyRadar & ẩn mã kỹ thuật Track ở tầng đầu (ĐẠT):**
   * `src/ui/overview.ts` (`renderDateCell`) và tiêu đề phụ `.cp-prov` của `src/ui/communePanel.ts` đã bỏ nhãn mã quỹ đạo (`083A`, `148D`), đưa thông tin track vào trong `<details class="cp-history">`.
   * `plainSummary()` đã bỏ cờ cứng `recBeforeSowing` (`2026-11-01`).
   * `src/locales/overview.ts`: Cả hai bản `enOverview` và `viOverview` đã loại bỏ các khuyến nghị can thiệp công trình (*trạm bơm, cống tiêu, bờ bao, pumping, sluice gates, dikes*) và không suy diễn nhóm `10% – <30%` là nước đang rút.

5. **Nhóm 5 — Accessibility bảng xã & đồng bộ 2 ô tìm kiếm (ĐẠT):**
   * `src/ui/overview.ts`: Phần tử `<tr>` đã bỏ `tabindex="0"`, `aria-label` và `keydown`, chỉ giữ `<button class="ov-row-btn">` làm điểm nhận focus bàn phím duy nhất trên mỗi dòng.
   * Hai ô `quickInput` và `searchInput` đã đồng bộ hai chiều khi nhập liệu, khi gửi biểu mẫu tìm nhanh và khi bấm `"Xóa bộ lọc"`.

---

### Ghi chú nhỏ (Non-blocking) & Giới hạn kiểm tra tĩnh

* **Ghi chú nhỏ (không chặn):** Trong `src/ui/communePanel.ts` (`show` & `updateEvidence`), với 3 xã `partial` ở chế độ `latest`, cả hai phần tử liền kề `.cp-next` (`decision`) và `.cp-evidence` (`evidence`) đều hiển thị cùng chuỗi `T.panel.partialAction`; và nhánh `else if` trong `subscribe` (dòng 126) có thể thêm `|| s.activeSummary !== prev.activeSummary` để cập nhật tức thì `viewImage.hidden` nếu người dùng bật/tắt lớp tổng hợp từ thanh bên.
* **Giới hạn kiểm tĩnh:** Đánh giá này chỉ dựa trên mã nguồn được cung cấp trong lời nhắc; chưa đọc trực tiếp tệp định nghĩa `src/i18n.ts` (`T.panel.*`, `T.map.*`), `src/ui/communeTable.ts` bản mới và không thực thi trình duyệt thực tế.
