# Yêu cầu backend cho tab «Báo cáo thống kê»

Gửi: Duy Chí (`skyradar-nisar/water-pulse-be`) · Từ: FE (Thành Đông) · Ngày: 14/11/2026

Tab **Báo cáo thống kê** (`#reports`) hiện **chạy được với API có sẵn**. FE tự tổng hợp trong trình duyệt từ:
`/api/frontend/communes`, `/api/frontend/scenes` và **33 lần gọi** `/api/frontend/choropleth?date=&track=`
(xem `src/data/reportStats.ts`). Các mục dưới đây giúp báo cáo nhanh hơn và chính xác hơn. Mục P1 nên làm trước.

## P1 — Độ chính xác

### 1. Choropleth cần trả độ phủ của từng xã trong từng lần chụp
- Hiện tại `choropleth()` trả `{osm_id: water_pct}` cho **mọi** dòng series, kể cả xã chỉ được quét vài phần trăm diện tích.
  Báo cáo vì vậy phải ghi chú «có tính cả xã chỉ được phủ một phần».
- Đề xuất: thêm endpoint mới, giữ nguyên endpoint cũ để bản đồ không vỡ:
  `GET /api/frontend/choropleth/detail?date=&track=` →
  `{ "<osm_id>": { "water_pct": 41.2, "valid_km2": 30.1, "coverage_pct": 87.5 } }`
  với `coverage_pct = valid_km2 / diện tích đất của xã`.
- Cần thêm diện tích đất của xã (`land_km2`) vào `properties` của `/api/frontend/communes`.
  Hiện chỉ có `valid_km2` của ảnh tham chiếu.
- FE sẽ dùng cùng ngưỡng ≥ 50% như tổng quan để tách «đủ phủ» và «phủ một phần» trong từng lần chụp.

### 2. Số ngày ngập do BE tính
- FE đang tính `recession_date − first_flood_date`. Nếu xã chưa rút, FE tính đến `last_date` và hiển thị «≥ N ngày».
- Đề xuất thêm vào `properties` của commune:
  - `flood_days`: số ngày từ lần đầu ≥ 20% đến khi xuống dưới nửa đỉnh, tính trên cùng `reference_track`.
  - `flood_ongoing`: `true` nếu ảnh cuối vẫn còn trên nửa đỉnh.
- Lý do: BE biết chính xác quỹ đạo dùng cho từng mốc, FE thì không.

## P2 — Hiệu năng

### 3. Endpoint tổng hợp theo thời kỳ (thay 33 lần gọi choropleth)
`GET /api/frontend/report?from=YYYY-MM-DD&to=YYYY-MM-DD&province=&track=047D|083A|148D|all`

```jsonc
{
  "filter": { "from": "2026-09-01", "to": "2026-09-30", "province": "", "track": "all" },
  "scenes": [ // mỗi lần chụp một dòng, KHÔNG gộp quỹ đạo
    { "date": "2026-09-09", "track": "047D", "maturity": "provisional",
      "observed": 118, "observed_sufficient": 104, "high": 52, "medium": 30, "low": 36, "missing": 22 }
  ],
  "communes": [
    { "osm_id": "15581562", "obs": 7, "max_pct": 62.1, "max_date": "2026-09-21", "max_track": "047D",
      "mean_pct": 48.3, "times_ge30": 6 }
  ],
  "provinces": [
    { "province": "Tỉnh An Giang", "communes": 58, "observed": 56, "high": 38, "medium": 14, "low": 4, "no_obs": 2, "mean_max_pct": 43.9 }
  ]
}
```
- Ngưỡng giống FE: `high ≥ 30`, `10 ≤ medium < 30`, `low < 10` (% diện tích đất có nước).
- Nếu có endpoint này, FE chỉ cần một request cho mỗi lần đổi bộ lọc. Lúc đó FE sẽ đổi `computeReport` sang gọi API.
  Kiểm thử `tests/reportStats.test.mjs` dùng làm đối chứng kết quả.

### 4. (Tùy chọn) Gom choropleth thành một lần tải
`GET /api/frontend/choropleth/all` → `{ "<date>_<track>": { "<osm_id>": pct } }`.
Cách này nhanh hơn nếu chưa kịp làm mục 3. Bản snapshot Cloudflare (`dist/api-data`) cũng nên xuất thêm tệp này.

## P3 — Xuất tệp

### 5. Xuất Excel (.xlsx) và PDF phía máy chủ
- FE hiện xuất CSV (UTF-8 có BOM, mở được bằng Excel), ảnh PNG của biểu đồ, và in/lưu PDF bằng trình duyệt.
- Nếu cán bộ cần tệp .xlsx nhiều sheet hoặc PDF có quốc hiệu/mẫu báo cáo cố định, đề xuất:
  `GET /api/frontend/report/export?format=xlsx|pdf&from=&to=&province=&track=`.
  Endpoint này trả tệp đính kèm, gồm các sheet: Tổng hợp tỉnh, Theo lần chụp, Chi tiết xã, Ghi chú phương pháp.
- Cần thống nhất mẫu báo cáo với người dùng trước khi làm.

### 6. Tên tỉnh nhất quán
- `province` đang trả tên đầy đủ («Tỉnh An Giang», «Thành phố Cần Thơ»).
- Đề xuất thêm `province_code` để lọc ổn định và đặt tên tệp xuất.
  Ví dụ: mã đơn vị hành chính hoặc slug như `an-giang`.

## Không thay đổi
- Không nội suy ngày không có ảnh, không gộp pixel hoặc số liệu giữa các quỹ đạo.
  Báo cáo FE đang giữ đúng nguyên tắc này, BE giữ nguyên.
- Các endpoint hiện có giữ nguyên chữ ký để bản đồ và tổng quan không bị ảnh hưởng.
