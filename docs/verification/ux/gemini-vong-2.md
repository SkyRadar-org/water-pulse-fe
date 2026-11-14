**Thời gian báo cáo:** `11:02 GMT+7, 14/11/2026`
**Phương pháp đánh giá:** Kiểm tra tĩnh mã nguồn (Static Code Review) trên các tệp đính kèm; không chạy công cụ, không chỉnh sửa tệp.
**Kết luận (Verdict):** **`REQUEST_CHANGES`** (Phạm vi: luồng đồng bộ trạng thái `Overview ↔ Map`, xử lý nhóm thiếu độ phủ `<50%` trong `communePanel`, ngữ cảnh `latest` vs `scene`, ngôn ngữ theo triết lý SkyRadar và Accessibility bảng tổng quan).

---

### Các phát hiện kỹ thuật & UX (Tối đa 5 Findings)

#### 1. [Blocker] Mất hiệu ứng bay tới xã (`flyNonce`) khi Map chưa tải xong & kẹt lớp `activeSummary` / `playing` khi chuyển sang chế độ `latest`
* **File / Function:**
  * `src/map/map.ts` — `mountMap()` (`map.on('load')` và `subscribe`)
  * `src/ui/overview.ts` — `openMapOverview()`, `openCommuneOnMap()`
  * `src/ui/communeTable.ts` — `open()`
* **Trigger (Cách tái hiện):**
  1. Người dùng vừa mở trang ở tab mặc định `Overview` và bấm chọn ngay một xã (ví dụ: *Sơn Kiên*) trong lúc `map.on('load')` ở tab `Map` ẩn phía dưới chưa tải xong chuỗi bất đồng bộ `getScenes() -> getCommunes() -> addGeoLayers()` (`ready === false`).
  2. Hoặc người dùng sang tab `Map`, bật một lớp tổng hợp mùa lũ (`activeSummary !== null`) hay bấm `Play` timeline (`playing === true`), sau đó quay về `Overview` bấm vào một xã để xem chế độ `latest`.
* **Why (Nguyên nhân):**
  * Trong `src/map/map.ts`, hàm `subscribe` chặn sớm bằng `if (!ready) return;`. Khi người dùng chọn xã từ `Overview` lúc `ready === false`, sự kiện tăng `flyNonce` bị bỏ qua. Đến khi `map.on('load')` hoàn tất (`ready = true`), code chỉ gọi `if (state.selectedCommune) communes.setSelected(state.selectedCommune);` mà **không gọi `map.fitBounds(...)`**, khiến bản đồ không zoom tới xã vừa chọn. Ngoài ra, khi `#view-map` chuyển từ ẩn sang hiện, `map.resize()` cần chạy trước khi `fitBounds` tính toán khung nhìn.
  * Trong `src/ui/overview.ts` (`openMapOverview`, `openCommuneOnMap`), lệnh `set(...)` không đặt `activeSummary: null, playing: false`. Trong `src/map/map.ts` (`applyLook`), `vis('summary', summaryOn)` vẫn hiển thị lớp raster tổng hợp đè lên bản đồ ngay cả khi `s.mapMode === 'latest'`, trong khi `mapContext.ts` ở trên đầu lại hiển thị tiêu đề của chế độ `latest`.
* **Fix (Cách sửa):**
  * Trong `src/ui/overview.ts` (và tương tự ở `src/ui/communeTable.ts`):
    ```ts
    function openMapOverview(): void {
      set({ tab: 'map', mapMode: 'latest', activeSummary: null, playing: false });
      location.hash = 'map';
    }

    function openCommuneOnMap(p: CommuneProps): void {
      set({
        tab: 'map',
        mapMode: 'latest',
        activeSummary: null,
        playing: false,
        selectedCommune: p.osm_id,
        flyNonce: state.flyNonce + 1,
      });
      location.hash = 'map';
    }
    ```
  * Trong `src/map/map.ts`:
    * Trong `applyLook(s)`: chỉ bật `summary` khi không ở chế độ `latest`, hoặc đảm bảo chuyển sang `latest` luôn tắt `activeSummary`.
    * Tách hàm `flyToCommune(osmId: string)` và gọi nó ở cuối `map.on('load')` nếu `state.selectedCommune && state.flyNonce > 0` (sau khi gọi `map.resize()`).

---

#### 2. [Blocker] Mâu thuẫn hiển thị & câu chữ sai ngữ cảnh cho 9 xã thiếu độ phủ (`none` vs `partial <50%`) trong `communePanel`
* **File / Function:**
  * `src/ui/communePanel.ts` — `show()`, `plainSummary()`, `updateEvidence()`
* **Trigger (Cách tái hiện):**
  * Trên bản đồ (hoặc từ danh sách `Overview`), bấm vào 1 trong 6 xã không có quan trắc (`last_pct === null`) hoặc 1 trong 3 xã chỉ phủ một phần (`coverage_sufficient !== true && last_pct !== null`).
* **Why (Nguyên nhân):**
  1. **Tái sử dụng sai chuỗi thống kê tổng thể cho 1 xã (dòng 83):**
     ```ts
     const decision = !hasAssessment(p)
       ? T.overview.cards.insufficientDesc(p.last_pct === null ? 1 : 0, p.last_pct === null ? 0 : 1)
       : ...
     ```
     Hàm `insufficientDesc(noObs, partial)` sinh ra câu: *"Gồm 1 xã không có quan trắc và 0 xã chỉ phủ ít (<50%). Thiếu dữ liệu ≠ đã khô ráo"* (hoặc *"0 communes with no radar pass, 1 with partial coverage..."*) ngay trong panel chi tiết của **một xã đơn lẻ**.
  2. **Mâu thuẫn số liệu của 3 xã phủ ít (`<50%`) ngay trong cùng một Panel (dòng 48, 100, 106):**
     * Ở khối chính `.cp-latest` (dòng 106): `hasAssessment(p) ? fmtPct(p.last_pct) : '—'` ẩn tỷ lệ nước thành `'—'` nhưng bên cạnh vẫn hiện ngày chụp `fmtDate(p.last_date)` (trái với bảng `Overview` vốn hiển thị `fmtPct(c.last_pct)` kèm nhãn *"Chỉ phủ một phần (<50%)"*).
     * Ngược lại, khi mở `<details class="cp-history">` ngay bên dưới: hàm `plainSummary(p)` (dòng 48 chỉ kiểm tra `if (p.last_pct === null)`) và `stat(T.panel.last, fmtPct(p.last_pct), ...)` (dòng 100) lại in ra đầy đủ `%` nước và kết luận ngày lũ rút như một xã đủ độ phủ mà không có cảnh báo độ phủ `<50%`.
  3. **Báo sai trạng thái bằng chứng ở chế độ `latest` cho 6 xã không có quan trắc (dòng 78):**
     * Trong `updateEvidence()`, khi `state.mapMode === 'latest'`, code luôn gán `evidence.textContent = T.panel.observationNote` kể cả khi `p.last_pct === null` (xã hoàn toàn không có ảnh quan trắc trong bộ dữ liệu).
* **Fix (Cách sửa):**
  * Trong `src/ui/communePanel.ts`:
    * Tạo chuỗi giải thích riêng cho từng xã khi `!hasAssessment(p)`: phân biệt rõ trường hợp `p.last_pct === null` (*"Xã này chưa có lượt quan trắc trong bộ dữ liệu hiện tại — chưa đủ cơ sở đánh giá, không coi là đã khô ráo"*) và trường hợp phủ một phần `<50%` (*"Ảnh mới nhất chỉ phủ dưới 50% diện tích xã — số liệu chỉ phản ánh phần diện tích được quét, cần kiểm tra thực địa"*).
    * Trong `updateEvidence()`: nếu `state.mapMode === 'latest'`, kiểm tra `!hasAssessment(p)` trước (nếu `p.last_pct === null` thì báo `T.panel.noObservations` thay vì `T.panel.observationNote`).
    * Trong `plainSummary(p)`: kiểm tra `if (!hasAssessment(p))` để không tự động sinh văn bản kết luận rút lũ từ dữ liệu thiếu độ phủ.

---

#### 3. [High] Lệch ngữ cảnh `latest` vs `scene` trong `communePanel`: Nút "Xem ảnh" không ẩn khi đã ở đúng ảnh và tự ý khóa `trackFilter`
* **File / Function:**
  * `src/ui/communePanel.ts` — `show()` (biến `viewImage`, hàm `updateEvidence()`, và callback click của `chart`)
* **Trigger (Cách tái hiện):**
  * Mở xã *An Long* (`last_date: 2026-10-29`, `reference_track: 083A`), bấm nút `viewImage` (*"Xem ảnh 29/10/2026"*). Sau đó quan sát nút `viewImage` trong panel và thanh Timeline bên dưới bản đồ.
* **Why (Nguyên nhân):**
  1. Thuộc tính `viewImage.hidden = !reference;` (dòng 73) chỉ được gán **1 lần duy nhất** khi mở panel và không được cập nhật trong `updateEvidence()`. Khi người dùng đã bấm nút để chuyển sang đúng `mapMode === 'scene'` tại ngày `29/10/2026` (track `083A`), nút *"Xem ảnh 29/10/2026"* vẫn hiện nguyên chỗ cũ, bấm tiếp không có tác dụng gì.
  2. Khi bấm `viewImage` (dòng 75) hoặc bấm vào một điểm trên biểu đồ `chart` (dòng 111), code gọi:
     `set({ mapMode: 'scene', selectedDate: reference.date, selectedTrack: reference.track, trackFilter: reference.track, playing: false });`
     Việc ép `trackFilter: reference.track` làm ẩn toàn bộ các ngày chụp của các quỹ đạo khác (như `148D` ngày `03/11`) trên thanh Timeline mà người dùng không hề chủ động lọc, đồng thời thiếu `activeSummary: null` (nếu đang bật lớp tổng hợp mùa lũ thì lớp nước của scene vẫn bị ẩn).
* **Fix (Cách sửa):**
  * Đưa logic ẩn/hiện `viewImage` vào bên trong `updateEvidence()`:
    ```ts
    const isViewingReference =
      Boolean(reference) &&
      state.mapMode === 'scene' &&
      state.selectedDate === reference!.date &&
      state.selectedTrack === reference!.track &&
      state.activeSummary === null;
    viewImage.hidden = !reference || isViewingReference;
    ```
  * Khi bấm `viewImage` hoặc click điểm trên `chart`, truyền `activeSummary: null` và chỉ đổi `trackFilter` nếu `state.trackFilter !== 'all' && state.trackFilter !== reference.track` (tốt nhất đặt về `'all'` để người dùng không bị mất các mốc ngày khác trên timeline).

---

#### 4. [Medium] Chưa triệt để triết lý SkyRadar: Còn sót lời khuyên vận hành trạm bơm/cống, hardcode ngày xuống giống và lộ mã Track ở tầng tổng quan
* **File / Function:**
  * `src/locales/overview.ts` — `enOverview`, `viOverview`
  * `src/ui/communePanel.ts` — `plainSummary()` (dòng 55), `.cp-prov` (dòng 103)
  * `src/ui/overview.ts` — `renderDateCell()` (dòng 373)
* **Trigger (Cách tái hiện):**
  * Mở phần `<details>` hướng dẫn trên trang `Overview`, chuyển đổi ngôn ngữ `VI / EN`, xem bảng danh sách xã và mở lịch sử xã trong `communePanel`.
* **Why (Nguyên nhân):**
  1. **Còn sót khuyến nghị vận hành kỹ thuật ngoài phạm vi dữ liệu:**
     * `viOverview.overview.guide.step3Body` (dòng 248) vẫn khuyên: *"...kết hợp kiểm tra **cống tiêu, trạm bơm** và mặt ruộng thực tế"*.
     * `enOverview.overview.cautionBody` (dòng 11) và `guide.step3Body` (dòng 123) vẫn giữ nguyên bản cũ (*"pumping schedules"*, *"declare fields safe for sowing"*, *"verify sluice gates, dikes"*), chưa được biên tập lại như bản tiếng Việt.
     * Trong `src/ui/communePanel.ts` (dòng 55): vẫn hardcode mốc ngày xuống giống `recBeforeSowing: !!p.recession_date && p.recession_date < '2026-11-01'`.
  2. **Đưa thuật ngữ viễn thám / mã quỹ đạo (Track) ra trước khi cần:**
     * Trong `enOverview.overview.lead` và `cards` vẫn đặt *"NISAR L-band radar"*, *"Insufficient Radar Coverage"*, *"no radar pass"* ngay ở đầu trang thay vì ngôn ngữ thực tế như bản tiếng Việt (*"Chưa đủ dữ liệu"*, *"Còn nhiều nước"*).
     * Trong `src/ui/overview.ts` (dòng 373, cột Ngày quan trắc) và `src/ui/communePanel.ts` (dòng 103, ngay dưới tên xã) vẫn hiển thị mã kỹ thuật `Dải bay 083A` / `148D` ở tầng thông tin đầu tiên, trong khi người dùng chỉ cần biết **ngày quan trắc** trước, còn mã quỹ đạo chỉ nên xuất hiện trong phần chi tiết bằng chứng/lịch sử ảnh.
* **Fix (Cách sửa):**
  * Đồng bộ `enOverview` (`lead`, `cautionBody`, `cards`, `guide.step3Body`) và `viOverview.overview.guide.step3Body` theo đúng cấu trúc: *Câu hỏi thực tế $\rightarrow$ Kết luận mức nước $\rightarrow$ Việc cần kiểm tra tại đồng ruộng $\rightarrow$ Xem ảnh làm bằng chứng* (bỏ hẳn từ khóa *trạm bơm / cống tiêu / bờ bao / pumping schedules*).
  * Trong `overview.ts` (`renderDateCell`): chỉ hiển thị `fmtDate(c.last_date)` ở bảng tổng quan (bỏ chip `Dải bay ...` khỏi bảng ưu tiên). Trong `communePanel.ts`: đưa `reference_track` xuống phần thông tin ảnh bằng chứng hoặc `<details class="cp-history">`.

---

#### 5. [Medium] Độ rối & Accessibility trên `src/ui/overview.ts`: Lệch trạng thái giữa 2 ô tìm kiếm xã và lặp điểm dừng bàn phím (`Tab` stop) trên mỗi dòng bảng
* **File / Function:**
  * `src/ui/overview.ts` — `buildOverview()` (`quickForm`, `resetFilterBtn`, `renderList()`)
* **Trigger (Cách tái hiện):**
  1. Gõ `"An Long"` vào ô tìm kiếm nhanh trên Hero (`quickInput`), bấm `"Xem kết quả"`, sau đó bấm nút `"Xóa bộ lọc"` (`resetFilterBtn`) ở thanh công cụ bảng.
  2. Dùng bàn phím nhấn `Tab` và `Enter` / `Space` đi qua các dòng của bảng danh sách xã ưu tiên.
* **Why (Nguyên nhân):**
  1. **Hai ô tìm kiếm không đồng bộ hai chiều:** Khi bấm `resetFilterBtn` (dòng 501) hoặc khi sửa nội dung ở `searchInput` (dòng 480), code chỉ cập nhật `searchInput.value` mà **không cập nhật `quickInput.value`**. Kết quả là danh sách đã xóa lọc nhưng ô tìm kiếm trên Hero vẫn giữ nguyên từ khóa cũ `"An Long"`.
  2. **Lặp focus và xung đột sự kiện phím trên `<tr>` và `<button>`:** Mỗi dòng `<tr>` được gán `tabindex="0"` và `aria-label={rowAria}`, đồng thời cột cuối cùng bên trong `<tr>` lại chứa `<button class="ov-row-btn" aria-label={rowAria}>`.
     * Người dùng bàn phím / Screen Reader phải nhấn `Tab` **2 lần cho mỗi xã** và nghe đọc lặp lại cùng một chuỗi `rowAria` dài.
     * Phần tử `<tr>` không có interactive role nhưng nhận focus và gắn `aria-label` (một số trình đọc màn hình sẽ bỏ qua `aria-label` trên `<tr>` hoặc đọc lệch ngữ nghĩa bảng).
     * Khi focus đang ở `<button class="ov-row-btn">` và người dùng nhấn `Space` hoặc `Enter`, sự kiện `keydown` nổi bọt (bubble) lên `<tr>` (dòng 462) kích hoạt `openCommuneOnMap(c)` ngay ở pha `keydown` (do `<button>` chỉ chặn propagation ở sự kiện `click`, không chặn ở `keydown`).
* **Fix (Cách sửa):**
  * Đồng bộ `quickInput.value = ''` trong `resetFilterBtn` (và `quickInput.value = searchInput.value` khi gõ ở `searchInput`), hoặc gọn hơn theo triết lý giảm độ rối: dùng chung 1 ô tìm kiếm duy nhất.
  * Trên `<tr>`: bỏ `tabindex="0"`, bỏ `aria-label` và bỏ listener `keydown` (chỉ giữ `tr.addEventListener('click', ...)` cho thao tác chuột/chạm); giữ `<button class="ov-row-btn">` có `aria-label={rowAria}` làm điểm focus bàn phím chuẩn duy nhất cho mỗi dòng.

---

### Phạm vi chưa được kiểm chứng (Báo cáo trung thực)

Vì lượt review này chỉ thực hiện **kiểm tra tĩnh (Static Analysis)** trên các file được đính kèm trong lời nhắc, các hạng mục sau **chưa được kiểm chứng trực tiếp**:
1. **Các tệp không đính kèm trong lời nhắc:** Chưa đọc nội dung thực tế của `src/i18n.ts` (các khóa `T.map.*`, `T.panel.*`), `src/ui/sidebar.ts`, `src/ui/timeline.ts`, `src/charts/communeChart.ts` và các file CSS (`src/styles/overview.css`, `src/styles/decision.css`, `src/styles/ux.css`). Do đó chưa kiểm chứng được câu chữ cụ thể của `T.panel.summary` hay `T.map.latestTip` có còn thuật ngữ gây hiểu lầm hay không.
2. **Hành vi thực tế trên trình duyệt (Runtime / Layout):** Chưa kiểm tra trực tiếp bố cục hiển thị trên màn hình di động (độ chồng lấp giữa `map-context`, `commune-panel` và bản đồ khi mở xã), cũng như việc nạp ảnh `.jpg` của lớp `radar-image` khi chuyển nhanh qua lại giữa các scene.
