import type { Strings } from './en.ts';

const months = ['Th1', 'Th2', 'Th3', 'Th4', 'Th5', 'Th6', 'Th7', 'Th8', 'Th9', 'Th10', 'Th11', 'Th12'];
const areaNote = 'Diện tích tính trên phần xã có ảnh quan sát, đã loại nước thường xuyên; số km² chỉ mang tính tham khảo.';
const two = (n: number): string => String(n).padStart(2, '0');

export const vi: Strings = {
  htmlLang: 'vi',
  pageTitle: 'SkyRadar · NISAR Water Pulse',
  app: {
    brand: 'NISAR Water Pulse',
    brandBy: 'bởi SkyRadar',
    demoLong: 'Dữ liệu minh hoạ',
    demoShort: 'Mẫu',
    demoTip: 'Dữ liệu đang hiển thị là dữ liệu mô phỏng để minh hoạ, không phải kết quả NISAR thật',
    event: 'NASA Space Apps Hà Nội 2026',
    footerData:
      'Dữ liệu: NASA/JPL/ISRO NISAR (ASF DAAC) · OPERA DSWx-S1 & DSWx-HLS (JPL/PO.DAAC) · NASA GIBS · Bản đồ nền © Esri · © OpenStreetMap contributors (ODbL)',
    footerLink: 'Nguồn & giấy phép',
    guide: 'Hướng dẫn',
    guideTip: 'Cách sử dụng bản đồ này',
    menu: 'Lớp bản đồ và chú giải',
    loadError: 'Không tải được dữ liệu.',
    langTip: 'Ngôn ngữ',
    sections: 'Các mục',
  },
  tabs: { map: 'Bản đồ', communes: 'Danh sách xã', validation: 'Độ tin cậy', about: 'Giới thiệu' },
  maturity: { provisional: 'Tạm thời (Provisional)', validated: 'Đã kiểm định (Validated)' },
  status: {
    receded: { long: 'Sẵn sàng: dưới 10% diện tích có nước', short: 'Sẵn sàng', icon: '✓' },
    not_receded: { long: 'Còn ngập (≥30% diện tích có nước)', short: 'Còn ngập', icon: '!' },
    uncertain: { long: 'Đang rút hoặc chưa đủ ảnh phủ', short: 'Đang rút / chưa rõ', icon: '?' },
    no_flood: { long: 'Không ngập đáng kể', short: 'Không ngập', icon: '–' },
  },
  months,
  date: (y, m, d) => `${two(d)}/${two(m)}/${y}`,
  dateShort: (m, d) => `${two(d)}/${two(m)}`,
  areaNote,
  country: 'CAMPUCHIA',

  sidebar: {
    find: 'Tìm xã',
    findPlaceholder: 'Gõ tên xã…',
    findNone: 'Không có xã nào tên như vậy',
    layers: 'Lớp bản đồ',
    opacity: 'Độ đậm',
    rows: {
      radar: { label: 'Ảnh radar (NISAR)', hint: 'Ảnh radar vệ tinh của NASA' },
      water: { label: 'Vùng có nước (Water map)', hint: 'Nơi phân tích NISAR phát hiện có nước' },
      communes: { label: 'Xã', hint: 'Màu = tỷ lệ đất bị ngập nước' },
      provinces: { label: 'Tỉnh', hint: 'Ranh giới và tên tỉnh' },
      basemap: { label: 'Bản đồ nền', hint: '© Esri · © OpenStreetMap contributors' },
    },
    summary: {
      title: 'Tổng kết cả mùa lũ (Season summary)',
      hint: 'Xem cả mùa lũ trên một bản đồ, thay vì từng ngày một.',
      off: 'Tắt — xem theo từng ngày',
      layers: {
        flood_count: { title: 'Số lần bị ngập', legend: ['Có nước trong 1–5 ảnh', 'Có nước trong 6–11 ảnh', 'Có nước trong 12–17 ảnh', 'Có nước trong từ 18 ảnh trở lên'] },
        first_flood_date: { title: 'Thời điểm bắt đầu ngập', legend: ['Trước 1/8', 'Từ 1 đến 31/8', 'Tháng 9', 'Từ tháng 10 trở đi'] },
        recession_date: { title: 'Thời điểm nước rút', legend: ['Nước rút trước 1/10', 'Nước rút trong tháng 10', 'Nước rút sau 1/11', 'Ảnh cuối vẫn còn nước'] },
      },
    },
    legend: {
      title: 'Chú giải',
      share: 'Xã: % đất bị ngập nước',
      noData: 'Không có dữ liệu cho ảnh này',
      waterMap: 'Vùng có nước (Water map)',
      open: 'Ruộng ngập / nước mở',
      perm: 'Nước thường xuyên (sông, kênh)',
      statusNote: 'Ảnh gần nhất đủ phủ: ✓ dưới 10% nước · ! từ 30% nước · ? đang rút hoặc chưa đủ ảnh phủ · – không ngập đáng kể.',
    },
  },

  map: {
    fitTip: 'Thu về vùng nghiên cứu',
    radarMissing: 'Có thể chưa có ảnh radar cho ngày này',
    hint: 'Bấm vào một xã trên bản đồ để xem chi tiết',
    tip: (name, pct) => `${name} · ${pct === undefined ? 'không có dữ liệu cho ảnh này' : `${Math.round(pct)}% nước`}`,
  },

  timeline: {
    play: 'Phát diễn biến theo thời gian',
    pause: 'Tạm dừng',
    trackLabel: (t) => `Quỹ đạo ${t}`,
    trackGroup: 'Quỹ đạo vệ tinh (Track)',
    trackHelp: 'Quỹ đạo (track) là một đường bay lặp lại của vệ tinh. Mỗi quỹ đạo bay qua vùng này vào những ngày khác nhau.',
    all: 'Tất cả quỹ đạo',
    daysAfter: (n) => `${n} ngày sau ảnh trước (cùng quỹ đạo)`,
    firstImage: 'Ảnh đầu tiên của quỹ đạo này',
    imageOf: (i, n) => `Ảnh ${i}/${n}`,
    gap: (n) => `${n} ngày không có ảnh`,
    sowing: '1/11 · bắt đầu xuống giống Đông Xuân',
    validated: 'Đã kiểm định (Validated)',
    provisional: 'Tạm thời (Provisional)',
    note: 'Mỗi chấm là một ngày vệ tinh chụp ảnh. Bấm vào chấm, hoặc bấm ▶, để xem nước lũ thay đổi theo mùa.',
    summaryNote: 'Đang xem tổng kết cả mùa — thanh thời gian tạm dừng',
    collapse: 'Thu gọn / mở rộng',
    dotLabel: (date, track, m) => `${date}, quỹ đạo ${track}, ${m}`,
    region: 'Thanh thời gian',
  },

  panel: {
    region: 'Chi tiết xã',
    close: 'Đóng bảng chi tiết xã',
    loading: 'Đang tải thông tin xã…',
    download: 'Tải CSV',
    first: 'Bắt đầu ngập',
    firstHint: 'từ 20% đất có nước trở lên',
    peak: 'Đỉnh ngập',
    drained: 'Nước rút',
    notYet: 'Chưa rút',
    asOfLast: 'tính đến ảnh cuối',
    belowHalf: 'xuống dưới nửa mức đỉnh',
    last: 'Ảnh cuối',
    chartAria: (name) => `Tỷ lệ nước theo thời gian của ${name}`,
    yAxis: 'Nước, % diện tích đất',
    sowing: ['Mùa', 'xuống giống'],
    tipLine: (pct, km2, valid) => `${pct}% nước · ${km2 ?? "—"} km² trên ${valid ?? "—"} km²`,
    track: (t) => `Quỹ đạo ${t}`,
    noObservations: 'Chưa có dữ liệu quan sát cho xã này.',
    summary: (p, f) => {
      if (p.status === 'no_flood') return `${p.name} không ngập đáng kể trong mùa này (cao nhất ${p.peak_pct}% đất có nước, vào ${f.peak}).`;
      let s = `${p.name} bắt đầu ngập (từ 20% đất có nước) vào ${f.first}, ngập cao nhất ${p.peak_pct}% vào ${f.peak}, và ở ảnh cuối (${f.last}) còn ${p.last_pct}%. `;
      if (p.coverage_sufficient === false) s += 'Chưa có ảnh phủ đủ diện tích để đánh giá xuống giống.';
      else if (p.status === 'not_receded') s += 'Ảnh gần nhất phủ ít nhất nửa xã còn từ 30% diện tích có nước; việc xuống giống có thể bị muộn.';
      else if (p.status === 'receded') s += 'Ảnh gần nhất phủ ít nhất nửa xã có dưới 10% diện tích còn nước.';
      else s += 'Ảnh gần nhất đủ phủ còn 10–30% diện tích có nước; nước đang rút.';
      return s;
    },
    note: (km2, valid) =>
      `Diện tích ngập lớn nhất ≈ ${km2 ?? "—"} km² trên ${valid ?? "—"} km² đất. ${areaNote} Dải màu cam: mùa xuống giống Đông Xuân, 1/11 – 31/12, An Giang. Chấm đặc là ảnh đã kiểm định, chấm rỗng là ảnh tạm thời; bấm vào chấm để xem ảnh ngày đó.`,
  },

  table: {
    title: 'Danh sách xã',
    lead: 'Thống kê mỗi xã dùng quỹ đạo của ảnh gần nhất phủ ít nhất nửa xã. Tình trạng dựa trên lượng nước còn lại, tách biệt với ngày nước xuống dưới nửa đỉnh. Bấm vào một dòng để xem xã đó trên bản đồ.',
    search: 'Tìm tên xã…',
    searchAria: 'Tìm xã theo tên',
    provinceAria: 'Lọc theo tỉnh',
    statusAria: 'Lọc theo tình trạng',
    allProvinces: 'Tất cả các tỉnh',
    allStatuses: 'Tất cả tình trạng',
    count: (n, total) => `${n}/${total} xã`,
    export: 'Xuất CSV',
    cols: { name: 'Xã', province: 'Tỉnh', peak_pct: 'Đỉnh ngập (%)', peak_date: 'Ngày đỉnh', first_flood_date: 'Bắt đầu ngập', recession_date: 'Nước rút', last_pct: 'Ảnh cuối (%)', status: 'Tình trạng' },
    notYet: 'Chưa rút',
    empty: 'Không có xã nào phù hợp bộ lọc.',
    row: (name, status) => `${name}, ${status}. Mở trên bản đồ`,
    loading: 'Đang tải danh sách xã…',
  },

  validation: {
    title: 'Mức độ tin cậy và giới hạn (Validation & limits)',
    lead: 'Chúng tôi đã đối chiếu bản đồ nước với những nguồn nào, và chỗ nào còn yếu.',
    plainTitle: 'Nói đơn giản',
    plain: [
      'Bản đồ nước tìm thấy phần lớn lượng nước mà các bản đồ quang học độc lập (ảnh không mây) tìm thấy: NISAR đạt 47–82%, Sentinel-1 chỉ 35–64%, tính trên những ngày trời quang có thể so sánh.',
      'NISAR nhìn thấy nước trên mặt ruộng cả khi có mây, nhưng không phân biệt được đó là lũ tự nhiên, xả lũ có kiểm soát hay bơm nước làm đất.',
      'Hãy dùng bản đồ để so sánh giữa các xã và các ngày. Các con số km² chỉ mang tính tham khảo.',
      'Đây không phải công cụ cảnh báo sớm: dữ liệu về sau mỗi lần vệ tinh bay qua 2–3 ngày.',
    ],
    detailsTitle: 'Chi tiết kỹ thuật',
    areaTitle: 'Diện tích nước theo từng ảnh',
    areaAria: 'Diện tích nước theo từng ảnh, NISAR so với DSWx-S1',
    areaNote: (n) => `Đường biểu diễn diện tích xã có nước theo NISAR; chưa có tổng diện tích DSWx-S1 trên cùng vùng quan sát. Chấm đặc là ảnh đã kiểm định (từ 22/10), chấm rỗng là ảnh tạm thời. Mỗi quỹ đạo là một đường riêng. ${n}`,
    areaAxis: 'Diện tích nước, km²',
    track148: '(phía tây, ~37% vùng)',
    hlsTitle: 'NISAR và Sentinel-1 so với bản đồ quang học độc lập (DSWx-HLS)',
    hlsNote: 'OPERA DSWx-HLS, lệch ±2 ngày, chỉ tính điểm ảnh không mây. In đậm = bên tốt hơn. NISAR tìm được nhiều nước hơn (độ phủ, recall); Dữ liệu chưa cung cấp precision (—). F1 là điểm tổng hợp recall và precision.',
    hlsCols: { date: 'Ngày', f1: 'F1', recall: 'Độ phủ (Recall)', precision: 'Độ chính xác (Precision)', only: 'Điểm chỉ NISAR thấy mà đúng là nước' },
    agreeTitle: 'Mức khớp với OPERA DSWx-S1',
    kpiMedian: 'F1 trung vị (25 lần đối chiếu)',
    kpiFlood: 'Mùa lũ (tháng 9–10)',
    kpiEarly: 'Tháng 6–7',
    f1Aria: 'Điểm F1 của bản đồ nước NISAR so với DSWx-S1 theo từng ảnh',
    f1Axis: 'F1 so với DSWx-S1',
    f1Foot: 'Ngưỡng được hiệu chỉnh trên ngày 17/6 và 21/9; 25 lần chụp khác dùng để kiểm chứng.',
    f1Track: (t) => `Quỹ đạo ${t}`,
    methodTitle: 'Phương pháp',
    limitsTitle: 'Giới hạn',
    droppedTitle: 'Những gì đã thử và bỏ',
    dropped: ['Lớp thực vật ngập nước (F1 ≈ 0,02): lúa đang lớn cũng làm kênh HH sáng lên nên không tách được khỏi lúa ngập nước.'],
    sourcesTitle: 'Nguồn dữ liệu & giấy phép',
    loading: 'Đang tải mục độ tin cậy…',
  },

  about: {
    answersTitle: 'Ứng dụng trả lời những câu hỏi nào',
    answersLead: 'Với từng xã ở Tứ giác Long Xuyên và Đồng Tháp Mười (An Giang, Đồng Tháp), qua 33 lần chụp NISAR trên ba quỹ đạo từ 17/6 đến 3/11/2026:',
    readTitle: 'Cách đọc bản đồ',
    read: [
      'Thanh thời gian chỉ có những ngày thật sự có ảnh NISAR; không có số liệu nào được suy đoán cho các ngày ở giữa.',
      'Ba quỹ đạo vệ tinh (track 047D, 083A, 148D) không bao giờ bị gộp: biểu đồ vẽ mỗi quỹ đạo một đường.',
      'Ảnh trước 22/10/2026 là «Tạm thời» (Provisional, chấm rỗng); từ 22/10 là «Đã kiểm định» (Validated, chấm đặc).',
      'Số km² tính trên phần xã có ảnh quan sát và đã loại nước thường xuyên.',
    ],
    readMore: ['Giới hạn và phương pháp tạo bản đồ nước nằm ở mục ', 'Độ tin cậy', '.'],
    limitsTitle: 'Các giới hạn đã biết',
    sourcesTitle: 'Nguồn dữ liệu & giấy phép',
    teamTitle: 'Nhóm thực hiện & công cụ',
    team: 'Do nhóm SkyRadar thực hiện cho NASA Space Apps Challenge Hà Nội 2026, đề «Dancing with the SARs». Giao diện: Thành Đông · Dữ liệu và máy chủ: Duy Chí · Kiểm thử và rà soát: Trịnh Đạt.',
  },

  hero: {
    explore: 'Xem bản đồ',
    howTo: 'Cách sử dụng',
    skip: 'Bỏ qua',
    welcome: 'Chào mừng',
  },

  guide: {
    title: 'Dùng bản đồ này trong 3 bước',
    steps: [
      { t: 'Chọn ngày muốn xem', d: 'Bấm vào một chấm trên thanh thời gian ở phía dưới, hoặc bấm ▶ để xem nước lũ thay đổi theo mùa.' },
      { t: 'Bấm vào một xã', d: 'Bấm vào xã trên bản đồ, hoặc gõ tên xã vào ô «Tìm xã», để xem chi tiết.' },
      { t: 'Đọc kết quả', d: 'Màu xanh càng đậm thì xã càng ngập nhiều. Nhãn đỏ «Còn ngập sau 1/11» nghĩa là việc xuống giống có thể bị muộn.' },
    ],
    tip: 'Mẹo: dùng bảng «Lớp bản đồ» để bật/tắt các lớp, và «Tổng kết cả mùa lũ» để xem cả mùa trên một bản đồ.',
    close: 'Đã hiểu',
  },

  content: {
    tagline: 'Radar băng L nhìn xuyên mây thấy ruộng lúa bị ngập — theo từng xã, suốt cả mùa lũ.',
    positioning: 'Bổ sung cho việc lập bản đồ ngập lụt nhanh của Việt Nam: theo dõi cả mùa lũ bằng NISAR băng L, cập nhật 2–3 ngày sau mỗi lần vệ tinh bay qua.',
    heroNumbers: [
      { big: 'Năm lũ thấp', text: '2026 là năm lũ thấp ở Đồng bằng sông Cửu Long.' },
      { big: '38/131', text: 'xã được đánh giá còn ngập trên ảnh gần nhất đủ phủ (từ 30% diện tích có nước).' },
      { big: '47–82% so với 35–64%', text: 'Độ phủ phát hiện nước so với ảnh quang học độc lập: NISAR và Sentinel-1, qua 16 lần đối chiếu.' },
    ],
    questions: [
      { q: 'Ngập từ khi nào?', a: 'Ngày đầu tiên xã có từ 20% đất bị ngập nước.' },
      { q: 'Ngập cao nhất lúc nào?', a: 'Tỷ lệ đất ngập nước cao nhất và ngày xảy ra.' },
      { q: 'Nước có rút trước khi xuống giống không?', a: 'Ảnh gần nhất phủ ít nhất nửa xã: dưới 10% nước là sẵn sàng, 10–30% là đang rút, từ 30% là còn ngập.' },
    ],
    limits: [
      'Ngưỡng phân loại được hiệu chỉnh theo OPERA DSWx-S1 (băng C), vốn không phải là «sự thật mặt đất».',
      '29 trong 33 lần chụp là sản phẩm TẠM THỜI (chưa kiểm định).',
      'NISAR phát hiện nước trên mặt ruộng; không phân biệt được lũ tự nhiên, xả lũ có kiểm soát hay bơm nước làm đất.',
      'Lớp thực vật ngập nước đã được thử và bỏ (F1 ≈ 0,02): lúa đang lớn cũng làm kênh HH sáng lên.',
      'Tháng 6–7 mức khớp thấp (F1 ≈ 0,3) do ruộng còn ướt, mới làm đất.',
      'Không phải công cụ cảnh báo sớm: dữ liệu về sau mỗi lần bay qua 2–3 ngày, và mỗi vị trí được chụp lại sau 3–6 ngày.',
    ],
    method:
      'Có nước khi HH < −14 dB và HV < −22 dB trên dữ liệu NISAR GCOV gamma0 độ phân giải 20 m; loại các đám nhỏ hơn 3 ha; loại nước thường xuyên (nước mở theo DSWx từ ≥ 20 trong 22 ngày).',
    sources: [
      { name: 'NISAR', text: 'Radar SAR băng L của NASA/JPL/ISRO, phân phối bởi ASF DAAC (sản phẩm GCOV).', href: 'https://asf.alaska.edu/' },
      { name: 'OPERA DSWx-S1 và DSWx-HLS', text: 'Bản đồ nước mặt động của JPL / PO.DAAC — dùng để hiệu chỉnh và kiểm chứng độc lập.', href: 'https://podaac.jpl.nasa.gov/' },
      { name: 'NASA GIBS', text: 'Dịch vụ xem ảnh toàn cầu — ảnh radar NISAR xem trước.', href: 'https://earthdata.nasa.gov/gibs' },
      { name: 'Bản đồ nền', text: '© Esri, HERE, Garmin, © OpenStreetMap contributors (ODbL).', href: 'https://www.openstreetmap.org/copyright' },
      { name: 'Ranh giới', text: 'Ranh giới tỉnh, biên giới quốc gia, nhãn quần đảo Hoàng Sa và Trường Sa lấy từ SkyRadar (skyradar-web).', href: undefined },
    ],
  },
};
