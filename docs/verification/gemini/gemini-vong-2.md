**Thời gian báo cáo:** `2026-11-14 10:38:46 GMT+7`
**Vai trò:** Gemini — Phản biện độc lập (Vòng 2 cùng Codex)
**Trạng thái công cụ & UAM-V3:** Không sử dụng tool, không sửa file, không truy cập mạng/Cloudflare/git hay kho nhớ ngoài luồng. Tách biệt minh bạch giữa **Phân tích tĩnh (Static Analysis)** do Gemini trực tiếp kiểm tra trên mã nguồn đính kèm và **Kiểm thử thực thi (Runtime Verification)** do Codex thực hiện.

---

### 1. Hiệu chỉnh 3 điểm diễn đạt từ Vòng 1 (Ghi nhận phản biện của Codex)

1. **Về `Object.hasOwn(files, key)` trong `cloudflare/worker.js`:**
   * **Đính chính:** Đây là cơ chế **bảo vệ tra cứu khóa trên manifest (`files` lookup guard)** để tránh khớp nhầm các thuộc tính kế thừa từ `Object.prototype` (như `toString`, `valueOf`). Bản thân lệnh này không phải là bằng chứng chống toàn bộ lỗ hổng Prototype Pollution trên toàn hệ thống.
2. **Về vị trí và trạng thái kiểm chứng `GIBS_MAX_ZOOM`:**
   * **Đính chính:** Ở Vòng 1 chưa có mã nguồn của `gibs.ts` và `layers.ts`, nên không được gán nhãn `VERIFIED` cho cấu hình `maxzoom` hay suy đoán tên file `mapView.ts`. Nay với mã nguồn thật ở Vòng 2, xác nhận chính xác hằng số `GIBS_MAX_ZOOM` nằm tại `src/map/gibs.ts` và được gắn vào `sources.gibs.maxzoom` trong `src/map/layers.ts`.
3. **Về phạm vi đánh giá `dist/` và Pages Worker:**
   * **Đính chính:** Vì Gemini không trực tiếp đọc thư mục `dist/` trên đĩa hay chạy tiến trình, Gemini chỉ cấp **`PASS` tĩnh cho template `cloudflare/worker.js`, `scripts/build-cloudflare.mjs` và mã kiểm thử `tests/cloudflare-worker.test.mjs`**. Tính toàn vẹn của `dist/` sau khi đóng gói và kết quả chạy Worker thực tế thuộc phần chứng minh runtime của Codex.

---

### 2. Duyệt chi tiết bản vá ở Vòng 2 (Phân tích tĩnh)

#### 2.1. Bản vá sắp xếp giá trị `null` trong `src/ui/communeTable.ts` — **`VERIFIED` (Static) / `PASS`**
* Hàm `cmp(a: CommuneProps, b: CommuneProps, key: SortKey, direction: 1 | -1)` đã nhận trực tiếp tham số `direction` (`1` hoặc `-1`).
* Nhánh xử lý thiếu dữ liệu (`if (av === null && bv === null) return 0; if (av === null) return 1; if (bv === null) return -1;`) nằm **trước** và **độc lập** với phép nhân `* direction`.
* Các phép so sánh có giá trị (`status`, số `number`, chuỗi `localeCompare('vi')`) đều được nhân với `direction`, và tại `rows()` gọi `.sort((a, b) => cmp(a, b, sortKey, sortDir) || a.name.localeCompare(b.name, 'vi'))`.
* **Kết luận:** Các xã có giá trị `null` luôn được xếp ở cuối bảng ở cả chiều tăng dần (`▲`) lẫn giảm dần (`▼`), đồng thời giữ thứ tự bảng chữ cái tiếng Việt ổn định khi hai xã cùng `null`.

#### 2.2. Bản vá `GIBS_MAX_ZOOM` trong `src/map/gibs.ts` và `src/map/layers.ts` — **`VERIFIED` (Static) / `PASS`**
* Tại `src/map/gibs.ts`: `export const GIBS_MAX_ZOOM = 10;` đã được hạ từ `13` xuống `10`, giữ nguyên đường dẫn TileMatrixSet `GoogleMapsCompatible_Level13/{z}/{y}/{x}.png` của lớp `NISAR_L2_Geocoded_Polarimetric_Covariance`.
* Tại `src/map/layers.ts`: Trong `baseStyle()`, `sources.gibs` đặt `maxzoom: GIBS_MAX_ZOOM` (`10`), trong khi layer `{ id: 'radar', type: 'raster', source: 'gibs', paint: { 'raster-opacity': 0.85 } }` không đặt giới hạn `maxzoom`.
* **Kết luận:** MapLibre GL sẽ chỉ gửi yêu cầu tải tile GIBS tối đa đến mức zoom `10` và tự động phóng đại (overscale) tile mức `10` khi người dùng zoom ở mức `> 10`, khắc phục lỗi tile GIBS bị hỏng ở các mức zoom cao.

---

### 3. Xác nhận Giới hạn Kiểm toán (Audit Boundaries)

Để hồ sơ nghiệm thu trung thực tuyệt đối, phạm vi kiểm chứng được phân định rõ như sau:

1. **Những gì Gemini trực tiếp xác nhận (`VERIFIED` bằng phân tích tĩnh):**
   * Logic template `cloudflare/worker.js`, kịch bản `scripts/build-cloudflare.mjs`, kịch bản test `tests/cloudflare-worker.test.mjs`, cấu hình `src/config.ts`, và 3 file vừa vá (`src/ui/communeTable.ts`, `src/map/gibs.ts`, `src/map/layers.ts`).
2. **Những gì dựa trên báo cáo thực thi của Codex (Runtime Evidence do Codex chứng minh):**
   * Backend pass `11/11` bài test.
   * Lệnh `build:cloudflare` chạy thành công sau khi áp bản vá, xuất ra `179` JSON API responses, `33` scenes, `140` communes, tổng cộng `333` files trong `dist/` (file lớn nhất `2,692,266` bytes).
   * Generated Pages Worker pass `4/4` bài test (`tests/cloudflare-worker.test.mjs`) trên `dist/` mới rebuild.
3. **Những gì nằm ngoài phạm vi xác nhận hiện tại (`PENDING` / Out-of-scope):**
   * **Chưa deploy thực tế:** Tên miền `https://nisar-flood.skyradar.vn`, cấu hình Cloudflare Pages project, DNS và chứng chỉ HTTPS chưa được triển khai và kiểm chứng trực tiếp trên môi trường mạng thực.
   * **Không suy diễn độ chính xác khoa học:** Việc xuất đủ 179 API JSON, 33 scenes, 140 xã chỉ chứng minh tính toàn vẹn đóng gói/truyền tải dữ liệu, không phải là kiểm định độc lập về mặt thuật toán viễn thám SAR hay thủy văn.

---

### 4. Phán quyết cuối cùng (Verdict) & Blocker

* **Blocker có chứng cứ:** **Không còn (0 blocker)** đối với cả bước Deployment lẫn Demo trên phạm vi mã nguồn đã kiểm tra.
* **Verdict:** **`PASS`** (Đạt yêu cầu kỹ thuật để chuyển sang bước triển khai `dist/` lên Cloudflare Pages và gắn tên miền `nisar-flood.skyradar.vn`).
