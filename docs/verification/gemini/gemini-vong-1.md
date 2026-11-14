**Thời gian báo cáo:** `2026-11-14 10:35:44 GMT+7`
**Vai trò:** Gemini — Phản biện độc lập (song song cùng Codex)
**Trạng thái công cụ & UAM-V3:** Tuân thủ nghiêm ngặt ràng buộc của phiên thẩm định (*"Không dùng tool, không sửa file, không gọi mạng/Cloudflare/git"*). Toàn bộ nhận định dưới đây của Gemini là **Phân tích tĩnh (Static Analysis)** trên gói bằng chứng được cung cấp; không nạp skill hay đọc/ghi `MEMORY.md` ngoài luồng, và tách biệt tuyệt đối với kết quả **Kiểm thử thực thi (Dynamic Execution)** do Codex đảm nhiệm.

---

### 1. Tổng hợp Phán quyết (Verdict)

* **Verdict tổng thể (Chuẩn bị cho Demo & Nghiệm thu UI): `REQUEST_CHANGES`**
  * **Lý do:** Cần vá 2 lỗi Frontend đã xác định (`communeTable.ts` đẩy `null` lên đầu khi sort giảm dần và `GIBS_MAX_ZOOM = 13` gây mất ảnh nền khi zoom sâu `> 10`), sau đó chạy lại pipeline `build:cloudflare` trước khi trình diễn (Demo).
* **Verdict cho Pages Worker & Luồng Deployment hạ tầng (`nisar-flood.skyradar.vn`): `PASS`**
  * **Lý do:** Logic `cloudflare/worker.js`, cơ chế đóng gói static API snapshot và cấu hình bảo vệ SPA fallback đã đạt chuẩn. Bản `dist/` hiện hữu đủ điều kiện để đẩy lên Cloudflare Pages và cấu hình DNS/SSL cho `nisar-flood.skyradar.vn` ngay lập tức nếu muốn thông hạ tầng trước.

---

### 2. Phản biện chi tiết Pages Worker & Pipeline Build

#### 2.1. Những điểm đạt chuẩn (`VERIFIED` qua phân tích tĩnh `cloudflare/worker.js` & `tests/cloudflare-worker.test.mjs`)
1. **Chặn triệt để lỗi SPA Fallback nuốt API (`503 Service Unavailable`):**
   * Trên Cloudflare Pages, khi một file tĩnh không tồn tại trong `dist/`, `env.ASSETS.fetch` mặc định có thể trả về `200 OK` kèm nội dung `index.html` (`text/html`).
   * Dòng kiểm tra `!response.ok || !response.headers.get('content-type')?.includes('application/json')` trả về `503` JSON (`{ detail: 'Dataset asset unavailable' }`) đã khóa chặt rủi ro Frontend nhận nhầm HTML khi parse JSON.
2. **Chống Prototype Pollution trên bảng định tuyến (`files` manifest):**
   * Việc dùng `Object.hasOwn(files, key)` thay vì `files[key]` trực tiếp giúp chặn các đường dẫn độc hại hoặc trùng tên thuộc tính `Object.prototype` như `/api/frontend/toString`, `/api/frontend/__proto__`, trả về `404` chuẩn xác.
3. **Chuẩn hóa Query String cho Choropleth (`/api/frontend/choropleth`):**
   * Chỉ trích xuất đúng `date` và `track`, kiểm tra whitelist `['047D', '083A', '148D']` (trả `422` nếu sai/thiếu), và tự dựng lại key canonical `?date=${encodeURIComponent(date)}&track=${track}`. Thứ tự tham số hoặc các query rác (`&ignored=yes`) không làm lệch định tuyến.
4. **Kiểm soát HTTP Method & Headers:**
   * Chỉ cho phép `GET` và `HEAD`; các method ghi (`POST`, `PUT`, `DELETE`,...) bị từ chối với `405` và header `Allow: GET, HEAD`.
   * Đính kèm `Cache-Control: public, max-age=300` và `X-Content-Type-Options: nosniff`.

#### 2.2. Các điểm lưu ý / Rủi ro tiềm ẩn cần biết
1. **Rủi ro khi rebuild thủ công (`scripts/build-cloudflare.mjs`):**
   * Quy trình chuẩn gồm 2 bước tuần tự: (1) `npm run build` (chạy Vite build ra `dist/`) và (2) `export_pages.py` (xuất 179 JSON vào `dist/` và biên dịch `cloudflare/worker.js` thành `dist/_worker.js`).
   * **Cảnh báo vận hành:** Nếu lập trình viên sửa code FE rồi chỉ chạy `npm run build` mà quên chạy `npm run build:cloudflare` (hoặc thiếu môi trường Python của `water-pulse-be`), thư mục `dist/` sẽ bị xóa sạch `_worker.js` và dữ liệu JSON.
2. **Hardcode danh sách Track trong `cloudflare/worker.js`:**
   * Mảng `['047D', '083A', '148D']` đang được hardcode trong Worker. Với snapshot 33 scenes hiện tại thì hoàn toàn khớp, nhưng nếu sau này backend export thêm track mới, cần cập nhật mảng này trong `worker.js`.
3. **Trailing Slash trên `/api/*`:**
   * Worker so khớp chính xác `url.pathname` với khóa trong `files`. Nếu gọi `/api/frontend/scenes/` (dư dấu `/` ở cuối) sẽ trả về `404`. Frontend hiện gọi qua hàm nội bộ nên không bị ảnh hưởng, nhưng cần lưu ý khi kiểm thử thủ công bằng `curl`/trình duyệt.

---

### 3. Đánh giá Tính toàn vẹn dữ liệu & Ranh giới Khoa học

1. **Tính toàn vẹn cấu trúc và đóng gói (`VERIFIED` trên manifest/test code, `PENDING` xác nhận runtime từ Codex):**
   * Các thông số bàn giao đồng nhất giữa `HANDOFF` và `tests/cloudflare-worker.test.mjs`:
     * Base commits được chốt: FE `4727d947`, BE `0869a45c`, bảo toàn archive gốc.
     * Tổng số: `33` scenes (`/api/frontend/scenes`), `140` xã/phường (`/api/frontend/communes` và `/health`).
     * Điểm neo kiểm chứng: Xã **Sơn Kiên** (`id: '15416586'`) có `last_pct = 78.2` trên track tham chiếu `148D` (`date=2026-11-03`).
2. **Ranh giới thẩm định khoa học (Không suy diễn từ số lượng JSON):**
   * Việc có đủ 179 file JSON phản hồi, 333 static files, 33 scenes và 140 communes **chỉ chứng minh tính toàn vẹn của pipeline xuất dữ liệu tĩnh (data serialization & routing integrity)**.
   * **Không suy diễn độ chính xác khoa học:** Số lượng file JSON hay việc khớp con số `78.2%` trong unit test **không** tự động chứng minh tính đúng đắn về mặt thủy văn/viễn thám SAR (ví dụ: ngưỡng cắt nước, giả định chọn ảnh mới nhất phủ `>= 50%` diện tích xã làm track chuẩn cho thống kê tổng hợp, hay việc loại bỏ các dòng calibration khỏi bảng validation). Các quyết định nghiệp vụ này thuộc phạm vi nghiệm thu chuyên môn viễn thám.

---

### 4. Phản biện 2 lỗi Handoff & Đề xuất Patch chính xác

#### 4.1. Lỗi 1: Sắp xếp giảm dần (`descending`) đẩy các giá trị `null` lên đầu bảng (`src/ui/communeTable.ts`)

* **Phân tích nguyên nhân gốc rễ (`VERIFIED` qua phân tích tĩnh):**
  * Trong `src/ui/communeTable.ts` (dòng 26–36):
    ```ts
    if (av === null && bv === null) return 0;
    if (av === null) return 1;
    if (bv === null) return -1;
    ```
  * Nhưng tại hàm `rows()` (dòng 80), kết quả của `cmp(a, b, sortKey)` lại bị nhân với `sortDir`:
    ```ts
    .sort((a, b) => cmp(a, b, sortKey) * sortDir || a.name.localeCompare(b.name, 'vi'));
    ```
  * Khi sắp xếp giảm dần (`sortDir = -1`), giá trị trả về `1` (dành cho `av === null`) bị nhân với `-1` thành `-1`. Hệ quả là mọi bản ghi có giá trị `null` đều được coi là "nhỏ hơn" và bị đẩy **lên trên cùng của bảng**.
  * **Mức độ nghiêm trọng:** Rất dễ thấy khi Demo vì trạng thái khởi tạo mặc định của bảng (dòng 49–50) chính là `sortKey = 'last_pct'` và `sortDir = -1` (giảm dần), và mọi cột `numeric: true` khi click lần đầu đều nhận `sortDir = -1`. Các xã có `last_pct: null` hoặc ngày tháng `null` (`first_flood_date`, `recession_date` khi đảo chiều `▼`) sẽ nhảy lên chiếm đỉnh bảng thay vì nằm ở cuối.

* **Patch đề xuất chính xác cho `src/ui/communeTable.ts`:**
  Truyền `sortDir` vào trong `cmp` và chỉ nhân `dir` cho các phép so sánh giá trị thực; giữ cố định nhánh xử lý `null` (`av == null` trả về `1`, `bv == null` trả về `-1`) để `null` **luôn nằm ở cuối bảng (nulls last)** ở cả hai chiều tăng/giảm.

```diff
--- a/src/ui/communeTable.ts
+++ b/src/ui/communeTable.ts
@@ -23,14 +23,14 @@

 const STATUS_ORDER: Record<CommuneStatus, number> = { not_receded: 0, uncertain: 1, receded: 2, no_flood: 3 };

-function cmp(a: CommuneProps, b: CommuneProps, key: SortKey): number {
-  if (key === 'status') return STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
+function cmp(a: CommuneProps, b: CommuneProps, key: SortKey, dir: 1 | -1): number {
+  if (key === 'status') return (STATUS_ORDER[a.status] - STATUS_ORDER[b.status]) * dir;
   const av = a[key];
   const bv = b[key];
-  // missing dates (never flooded / not drained yet) always sort as "latest"
-  if (av === null && bv === null) return 0;
-  if (av === null) return 1;
-  if (bv === null) return -1;
-  if (typeof av === 'number' && typeof bv === 'number') return av - bv;
-  return String(av).localeCompare(String(bv), 'vi');
+  // missing values always sort last regardless of ascending/descending order
+  if (av == null && bv == null) return 0;
+  if (av == null) return 1;
+  if (bv == null) return -1;
+  if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * dir;
+  return String(av).localeCompare(String(bv), 'vi') * dir;
 }

 export function mountCommuneTable(host: HTMLElement): void {
@@ -77,7 +77,7 @@
   const rows = () => {
     const q = fold(query.trim());
     return all
       .filter((c) => (!province || c.province === province) && (!status || c.status === status) && (!q || fold(c.name).includes(q)))
-      .sort((a, b) => cmp(a, b, sortKey) * sortDir || a.name.localeCompare(b.name, 'vi'));
+      .sort((a, b) => cmp(a, b, sortKey, sortDir) || a.name.localeCompare(b.name, 'vi'));
   };
```

#### 4.2. Lỗi 2: `GIBS_MAX_ZOOM` đang là `13` (cần hạ xuống `10` hoặc dùng ảnh radar JPG nội bộ)

* **Phân tích nguyên nhân gốc rễ (`VERIFIED` từ Handoff + `src/config.ts`):**
  * Trong `src/config.ts`, `MAP_ZOOM` khởi điểm đã là `9` và `BASEMAP.maxzoom` là `16`. Hằng số `GIBS_MAX_ZOOM` không nằm trong `src/config.ts` mà nằm ở module bản đồ (ví dụ `src/ui/mapView.ts` — file không đính kèm trong gói trích xuất).
  * Dịch vụ tile WMTS của NASA GIBS đối với các lớp ảnh tham chiếu này chỉ cung cấp tile gốc đến mức zoom `9` hoặc `10`. Khi khai báo `GIBS_MAX_ZOOM = 13` trên raster source của MapLibre GL, ngay khi người dùng phóng to từ mức 9 lên mức 11–13 để quan sát cấp xã, MapLibre sẽ gọi tile `z=11, 12, 13` thay vì phóng đại (overzoom) tile `z=10`. Server GIBS sẽ trả lỗi `400`/`404` làm mất hoàn toàn lớp ảnh nền GIBS ở mức zoom cấp xã.

* **Patch đề xuất chính xác:**
  * Định vị nơi khai báo `GIBS_MAX_ZOOM = 13` trong mã nguồn Frontend (thường trong `src/ui/mapView.ts`) và sửa thành `10`:
    ```diff
    -const GIBS_MAX_ZOOM = 13;
    +const GIBS_MAX_ZOOM = 10;
    ```
  * **Lưu ý kỹ thuật MapLibre:** Giá trị `GIBS_MAX_ZOOM` (`10`) phải được gán cho thuộc tính `maxzoom` của **Raster Source** (để MapLibre tự động overzoom tile mức 10 khi bản đồ ở zoom 11–16), **không** gán làm `maxzoom` của **Layer** (vì nếu gán vào Layer, MapLibre sẽ ẩn luôn layer đó khi zoom vượt quá 10).

---

### 5. Phân loại Mức độ Cản trở: Deployment Blocker vs Demo Blocker

| Hạng mục kiểm tra | Blocker cho Deployment? | Blocker cho Demo? | Đánh giá & Khuyến nghị thực thi |
| :--- | :---: | :---: | :--- |
| **Pages Worker (`cloudflare/worker.js`)** | **Không (`PASS`)** | **Không (`PASS`)** | Đã xử lý tốt định tuyến `/api/*`, `/health`, chống SPA fallback (`503`) và prototype pollution (`404`). |
| **Gói `dist/` sẵn có (33 scenes, 140 xã)** | **Không (`PASS`)** | **Không (`PASS`)** | Đủ điều kiện deploy ngay lên Cloudflare Pages để cấu hình project `nisar-flood` và gắn domain `nisar-flood.skyradar.vn`. |
| **Lỗi Sort `null` lên đầu khi giảm dần (`communeTable.ts`)** | **Không chặn bước thông DNS/Pages** | **CÓ — BLOCKER CAO** | Làm sai lệch thứ tự hiển thị ngay trên bảng thống kê cấp xã khi mở mặc định (`last_pct ▼`) hoặc khi đảo chiều sort. **Bắt buộc sửa trước Demo.** |
| **Lỗi `GIBS_MAX_ZOOM = 13` (cần hạ về `10`)** | **Không chặn bước thông DNS/Pages** | **CÓ — BLOCKER TRUNG BÌNH-CAO** | Khi người dùng/khách hàng zoom từ mức 9 vào xem chi tiết xã (zoom 11–13), ảnh GIBS sẽ lỗi/biến mất. **Bắt buộc sửa trước Demo.** |

> **Chiến lược triển khai khuyến nghị:**
> * **Phương án tối ưu (1 bước):** Nếu môi trường local của Codex đã có sẵn Python venv của `water-pulse-be`, hãy áp dụng luôn 2 bản vá (`communeTable.ts` + `GIBS_MAX_ZOOM = 10`), chạy `npm run build:cloudflare`, chạy lại test, rồi deploy bản `dist/` đã sạch lỗi lên `nisar-flood.skyradar.vn`.
> * **Phương án dự phòng (2 bước):** Nếu cần thông luồng Cloudflare Pages + DNS/SSL cho `nisar-flood.skyradar.vn` ngay lập tức từ bản `dist/` đã đóng gói sẵn trong archive, có thể deploy `dist/` hiện tại trước để kích hoạt chứng chỉ HTTPS, sau đó vá 2 lỗi FE, rebuild và deploy bản cập nhật trước giờ Demo.

---

### 6. Danh sách Kiểm thử (Test Plan) cần Codex thực thi & xác nhận

Vì Gemini chỉ phân tích tĩnh, đề nghị **Codex** thực thi và ghi nhận kết quả thực tế (`VERIFIED` runtime) cho 4 nhóm kiểm thử sau:

1. **Kiểm thử Pages Worker trên `dist/` (`tests/cloudflare-worker.test.mjs`):**
   * Chạy `npm run test:cloudflare` (hoặc `node --test tests/cloudflare-worker.test.mjs`).
   * Xác nhận pass cả 4 bài test: phục vụ đúng 33 scenes, 140 communes, Sơn Kiên (`15416586`) = `78.2%`, chuẩn hóa query choropleth, chặn unknown API bằng `404` JSON, chặn `POST` bằng `405`, và trả `503` khi thiếu snapshot JSON.
2. **Kiểm thử đơn vị cho hàm `cmp` đã vá trong `src/ui/communeTable.ts`:**
   * Kiểm chứng với mảng dữ liệu mẫu gồm `[ { name: 'A', last_pct: null }, { name: 'B', last_pct: 78.2 }, { name: 'C', last_pct: 0 } ]`:
     * Khi `sortDir = -1` (giảm dần): thứ tự phải là `B (78.2) -> C (0) -> A (null)`.
     * Khi `sortDir = 1` (tăng dần): thứ tự phải là `C (0) -> B (78.2) -> A (null)`.
   * Kiểm chứng tương tự với cột ngày tháng (`first_flood_date`, `recession_date`) có giá trị `null`.
3. **Kiểm thử tính toàn vẹn sau khi Rebuild (`npm run build:cloudflare`):**
   * Sau khi vá 2 lỗi FE và chạy lại `npm run build:cloudflare`, xác nhận file `dist/_worker.js` vẫn tồn tại, chứa biến manifest `files` đã được thay thế (`__API_FILES__` không còn ở dạng placeholder), và chạy lại `npm run test:cloudflare` pass 100%.
4. **Smoke Test thực tế sau khi Deploy lên `https://nisar-flood.skyradar.vn`:**
   * Kiểm tra `GET https://nisar-flood.skyradar.vn/health` trả `200 OK` (`communes: 140`).
   * Kiểm tra `GET https://nisar-flood.skyradar.vn/api/frontend/choropleth?date=2026-11-03&track=148D` trả `200 OK` (`"15416586": 78.2`).
   * Kiểm tra `GET https://nisar-flood.skyradar.vn/api/non-existent` trả `404` `application/json` (không trả HTML).
   * Kiểm tra giao diện trên trình duyệt: mở Bảng xã (tab Table) thấy Sơn Kiên `78.2%` nằm ở nhóm đầu, các xã `'—'` (`null`) nằm ở cuối bảng ở cả 2 chiều sort `▲`/`▼`; phóng to bản đồ lên mức zoom 11–13 khi bật lớp GIBS không phát sinh request tile lỗi `z > 10`.
