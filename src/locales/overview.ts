// --- Bổ sung vào object `en` trong src/i18n.ts ---
export const enOverview = {
  overview: {
    loading: 'Loading commune flood overview…',
    loadError: 'Unable to load commune overview data.',
    title: 'Water status by commune',
    lead: 'Results from the latest NISAR radar image of each commune: which communes still hold substantial water and which lack data. Select a commune to open its image as evidence.',
    cautionLabel: 'Operational notice:',
    cautionBody:
      'Use the observations to prioritize field checks. Check soil conditions locally before deciding when to sow.',
    snapshotAria: 'Dataset timeframe and spatial coverage summary',
    snapshotWindowLabel: 'Latest observation window',
    dateRange: (minDate: string, maxDate: string): string => `${minDate} – ${maxDate}`,
    noDateRange: 'No observation dates available',
    snapshotWindowSub: 'Latest valid satellite pass per commune (not real-time)',
    snapshotCoverageLabel: 'Communes with sufficient coverage (≥50%)',
    snapshotCoverageValue: (evaluated: number, total: number): string =>
      `${evaluated} / ${total} communes`,
    snapshotCoverageSub: (insufficient: number, noObs: number, partial: number): string =>
      `${insufficient} insufficient coverage (${noObs} without observation, ${partial} partial <50%)`,
    ctaMapOverview: 'Open Latest Overview Map',
    ctaValidation: 'View Data Reliability & Validation',

    cardsSectionTitle: 'Commune Breakdown by Latest Water Fraction & Coverage',
    cardsSectionSub:
      'Click any card below to filter the priority commune list. Thresholds apply only to communes with ≥50% valid radar coverage.',
    cardsGroupAria: 'Filter communes by water level or coverage status',
    cards: {
      unitCommunes: (total: number): string => `/ ${total} communes`,
      clickToFilter: 'Click to filter the list',
      highTitle: 'High surface water',
      highThreshold: '≥ 30% water · Coverage ≥ 50%',
      highDesc: 'Prioritize a field check and compare with the local drainage plan.',
      mediumTitle: 'Moderate surface water',
      mediumThreshold: '10% to < 30% · Coverage ≥ 50%',
      mediumDesc: 'Check the next observation on the same orbit to assess how water changes.',
      lowTitle: 'Low surface water',
      lowThreshold: '< 10% water · Coverage ≥ 50%',
      lowDesc: 'Low open-water fraction on radar. Does NOT automatically mean soil is ready or safe for sowing.',
      insufficientTitle: 'Insufficient observations',
      insufficientThreshold: 'Coverage < 50% or No Pass',
      insufficientDesc: (noObs: number, partial: number): string =>
        `${noObs} communes without observations, ${partial} with partial coverage (<50%). Missing data ≠ dry.`,
    },

    list: {
      title: 'Commune inspection list',
      subtitle:
        'Sorted by highest standing water fraction first. Click any commune row to inspect its latest radar scene on the map.',
      searchPlaceholder: 'Search commune or province (e.g., Vinh Hung, An Long)…',
      searchAria: 'Search commune by name or province',
      provinceAria: 'Filter by province',
      allProvinces: 'All provinces',
      groupAria: 'Filter by water fraction or coverage group',
      groupAll: (n: number): string => `All groups (${n})`,
      groupHigh: (n: number): string => `High water ≥ 30% (${n})`,
      groupMedium: (n: number): string => `Moderate 10% – < 30% (${n})`,
      groupLow: (n: number): string => `Low water < 10% (${n})`,
      groupInsufficient: (n: number): string => `Insufficient coverage < 50% (${n})`,
      resetFilters: 'Reset filters',
      showingCount: (shown: number, matched: number, total: number): string =>
        `Showing ${shown} of ${matched} matching communes (${total} total)`,
      colCommune: 'Commune',
      colProvince: 'Province',
      colWaterPct: 'Water in last observation',
      colObsDate: 'Observation date',
      colCoverage: 'Radar coverage',
      colAction: 'Map',
      noObsShort: 'No observation',
      partialValueNote: 'Partial (<50% area)',
      groupBadge: {
        high: '≥ 30%',
        medium: '10–<30%',
        low: '< 10% (Not safety guarantee)',
        insufficient: 'Insufficient coverage',
      },
      noDate: 'No pass',
      trackTag: (track: string): string => `Track ${track}`,
      coverageSufficient: 'Sufficient (≥ 50%)',
      coveragePartial: 'Partial (< 50%)',
      coverageNone: 'No observation in this dataset',
      validArea: (km2: string): string => `${km2} km² observed`,
      openMapRow: 'View map →',
      rowAria: (
        name: string,
        province: string,
        pct: string,
        date: string,
        coverage: string,
      ): string =>
        `${name}, ${province}: water ${pct}, observed ${date}, coverage ${coverage}. Click to open latest map.`,
      emptyResult: 'No communes match the current search or filter criteria.',
      showMore: (remaining: number): string => `Show all (${remaining} more communes)`,
      showLess: 'Show top 12 communes only',
    },

    guideAndCaveatsAria: 'Data interpretation caveats and 3-step operational guide',
    caveats: {
      title: 'Coverage and observation dates',
      missingNotDryTitle: (insufficient: number): string =>
        `1. ${insufficient} communes with insufficient coverage ≠ dry land`,
      missingNotDryBody: (insufficient: number, noObs: number, partial: number): string =>
        `Satellite swaths do not cover every commune equally on every pass. Currently, ${noObs} communes have no observation and ${partial} communes have less than 50% area observed (total ${insufficient} communes). They are separated so they are never mistaken for 0% flooded communes.`,
      viewInsufficientBtn: (n: number): string => `Filter the ${n} insufficient-coverage communes`,
      multiTrackTitle: '2. Different observation dates across tracks — Do not merge or infer trends across tracks',
      multiTrackBody:
        'NISAR observes the region along separate orbital tracks (047D, 083A, 148D) on different dates. "Latest per commune" mode displays each commune’s most recent valid pass without blending different dates into a fake single-day image, and without comparing two different tracks to guess water recession trends.',
      trackExampleDynamic: (
        nameA: string,
        pctA: string,
        dateA: string,
        trackA: string,
        nameB: string,
        pctB: string,
        dateB: string,
        trackB: string,
      ): string =>
        `Example from current dataset: ${nameA} is at ${pctA} on ${dateA} (track ${trackA}), while ${nameB} is at ${pctB} on ${dateB} (track ${trackB}). Each commune must be read with its own observation date and reference track.`,
      trackExampleFallback:
        'Each commune must be read alongside its own observation date and reference orbital track.',
    },

    guide: {
      title: 'Three steps to inspect the data',
      lead: 'Quick workflow for irrigation and cooperative teams:',
      step1Title: 'Filter high-priority communes',
      step1Body:
        'Start with the ≥ 30% and 10% – < 30% cards or filter by your province to identify communes with substantial standing water.',
      step2Title: 'Verify observation date & coverage status',
      step2Body:
        'Check the exact capture date and track on each row. Treat all insufficient-coverage communes as unverified—never as dry.',
      step3Title: 'Open the commune map & confirm in the field',
      step3Body:
        'Choose a commune, check its observation date and open the corresponding image. Confirm local conditions before deciding what to do.',
    },
  },
};

// --- Bổ sung vào object `vi` trong src/i18n.ts ---
export const viOverview: typeof enOverview = {
  overview: {
    loading: 'Đang tải tổng quan ngập lũ cấp xã…',
    loadError: 'Không thể tải dữ liệu tổng quan cấp xã.',
    title: 'Tình hình nước theo xã',
    lead: 'Kết quả từ ảnh radar NISAR gần nhất của từng xã: xã nào còn nhiều nước, xã nào chưa đủ dữ liệu. Chọn xã để mở ảnh làm bằng chứng.',
    cautionLabel: 'Lưu ý vận hành:',
    cautionBody:
      'Dữ liệu dùng để ưu tiên kiểm tra thực địa và điều tiết tiêu nước; cần kiểm tra tình trạng đất tại ruộng trước khi quyết định xuống giống.',
    snapshotAria: 'Tóm tắt khung thời gian bộ dữ liệu và độ phủ quan trắc',
    snapshotWindowLabel: 'Đợt quan trắc mới nhất',
    dateRange: (minDate: string, maxDate: string): string => `${minDate} – ${maxDate}`,
    noDateRange: 'Chưa có ngày quan trắc',
    snapshotWindowSub: 'Ảnh hợp lệ mới nhất theo từng xã (không phải thời gian thực)',
    snapshotCoverageLabel: 'Số xã đủ độ phủ đánh giá (≥50% diện tích)',
    snapshotCoverageValue: (evaluated: number, total: number): string =>
      `${evaluated} / ${total} xã`,
    snapshotCoverageSub: (insufficient: number, noObs: number, partial: number): string =>
      `${insufficient} xã chưa đủ độ phủ (${noObs} không có quan trắc, ${partial} chỉ phủ một phần <50%)`,
    ctaMapOverview: 'Xem bản đồ tổng quan',
    ctaValidation: 'Xem độ tin cậy',

    cardsSectionTitle: 'Kết quả từ ảnh gần nhất của từng xã',
    cardsSectionSub:
      'Chọn một nhóm để xem các xã cần kiểm tra. Mỗi xã dùng một quan sát riêng, có ghi ngày rõ ràng.',
    cardsGroupAria: 'Lọc xã theo nhóm mức nước hoặc trạng thái độ phủ',
    cards: {
      unitCommunes: (total: number): string => `/ ${total} xã`,
      clickToFilter: 'Bấm để lọc danh sách',
      highTitle: 'Còn nhiều nước',
      highThreshold: 'Từ 30% phần quan trắc có nước',
      highDesc: 'Ưu tiên kiểm tra thực địa, đối chiếu kế hoạch tiêu nước tại địa phương.',
      mediumTitle: 'Còn một phần nước',
      mediumThreshold: '10% đến dưới 30% phần quan trắc có nước',
      mediumDesc: 'Theo dõi ảnh kế tiếp cùng quỹ đạo để biết nước thay đổi ra sao.',
      lowTitle: 'Ít nước trên ảnh',
      lowThreshold: 'Dưới 10% phần quan trắc có nước',
      lowDesc: 'Đối chiếu tình trạng đất trước khi quyết định xuống giống.',
      insufficientTitle: 'Chưa đủ dữ liệu',
      insufficientThreshold: 'Phủ < 50% hoặc chưa có ảnh',
      insufficientDesc: (noObs: number, partial: number): string =>
        `Gồm ${noObs} xã không có quan trắc và ${partial} xã chỉ phủ ít (<50%). Thiếu dữ liệu ≠ đã khô ráo.`,
    },

    list: {
      title: 'Danh sách xã ưu tiên kiểm tra',
      subtitle:
        'Xã có nhiều nước được xếp trước. Chọn xã để đọc kết quả và xem ảnh làm bằng chứng.',
      searchPlaceholder: 'Tìm tên xã hoặc tỉnh (VD: Vĩnh Hưng, An Long)…',
      searchAria: 'Tìm kiếm theo tên xã hoặc tỉnh',
      provinceAria: 'Lọc theo tỉnh',
      allProvinces: 'Tất cả tỉnh',
      groupAria: 'Lọc theo nhóm mức nước hoặc độ phủ',
      groupAll: (n: number): string => `Tất cả nhóm (${n})`,
      groupHigh: (n: number): string => `Còn nhiều nước ≥ 30% (${n})`,
      groupMedium: (n: number): string => `Trung bình 10% – < 30% (${n})`,
      groupLow: (n: number): string => `Nước mặt thấp < 10% (${n})`,
      groupInsufficient: (n: number): string => `Chưa đủ độ phủ < 50% (${n})`,
      resetFilters: 'Xóa bộ lọc',
      showingCount: (shown: number, matched: number, total: number): string =>
        `Hiển thị ${shown} / ${matched} xã khớp lọc (tổng ${total} xã)`,
      colCommune: 'Xã / Phường',
      colProvince: 'Tỉnh',
      colWaterPct: '% Nước mới nhất',
      colObsDate: 'Ngày quan trắc',
      colCoverage: 'Độ phủ dữ liệu',
      colAction: 'Bản đồ',
      noObsShort: 'Không có quan trắc',
      partialValueNote: 'Chỉ phủ một phần (<50%)',
      groupBadge: {
        high: '≥ 30%',
        medium: '10–<30%',
        low: '< 10% (Chưa kết luận an toàn)',
        insufficient: 'Thiếu độ phủ',
      },
      noDate: 'Chưa có ảnh',
      trackTag: (track: string): string => `Dải bay ${track}`,
      coverageSufficient: 'Đủ độ phủ (≥ 50%)',
      coveragePartial: 'Chỉ phủ ít (< 50%)',
      coverageNone: 'Chưa có quan trắc',
      validArea: (km2: string): string => `Quét ${km2} km²`,
      openMapRow: 'Mở bản đồ →',
      rowAria: (
        name: string,
        province: string,
        pct: string,
        date: string,
        coverage: string,
      ): string =>
        `${name}, ${province}: tỷ lệ nước ${pct}, ngày quan trắc ${date}, ${coverage}. Bấm để mở bản đồ chế độ mới nhất.`,
      emptyResult: 'Không có xã nào khớp với điều kiện tìm kiếm hoặc bộ lọc hiện tại.',
      showMore: (remaining: number): string => `Xem thêm ${remaining} xã`,
      showLess: 'Thu gọn (chỉ hiện 12 xã đầu)',
    },

    guideAndCaveatsAria: 'Giải thích giới hạn dữ liệu và hướng dẫn 3 bước sử dụng',
    caveats: {
      title: 'Giải thích rõ về độ phủ & ngày quan trắc vệ tinh',
      missingNotDryTitle: (insufficient: number): string =>
        `1. ${insufficient} xã thiếu độ phủ KHÔNG có nghĩa là đã khô ráo`,
      missingNotDryBody: (insufficient: number, noObs: number, partial: number): string =>
        `Vệt quét của vệ tinh không phủ kín mọi xã trong cùng một lượt bay. Hiện có ${noObs} xã chưa có quan trắc và ${partial} xã chỉ được quét một phần nhỏ (< 50% diện tích), tổng cộng ${insufficient} xã chưa đủ độ phủ. Hệ thống tách riêng nhóm này để cán bộ tuyệt đối không nhầm lẫn xã thiếu ảnh vệ tinh với xã đã rút hết nước.`,
      viewInsufficientBtn: (n: number): string => `Lọc xem ngay ${n} xã chưa đủ độ phủ`,
      multiTrackTitle: '2. Ngày chụp khác nhau giữa các dải bay — Không gộp ảnh, không suy đoán xu thế từ 2 track',
      multiTrackBody:
        'Vệ tinh NISAR quét qua vùng Đồng bằng sông Cửu Long theo từng dải bay (track 047D, 083A, 148D) vào các ngày khác nhau. Chế độ "Mới nhất theo xã" giữ nguyên ngày quan trắc hợp lệ cuối cùng của từng xã, không tự ý trộn các ngày khác nhau thành một ảnh đơn lẻ và không lấy chênh lệch giữa 2 dải bay khác nhau để suy đoán xu thế nước rút hay dâng.',
      trackExampleDynamic: (
        nameA: string,
        pctA: string,
        dateA: string,
        trackA: string,
        nameB: string,
        pctB: string,
        dateB: string,
        trackB: string,
      ): string =>
        `Dẫn chứng thực tế: Xã ${nameA} ghi nhận ${pctA} nước vào ngày ${dateA} (dải bay ${trackA}), trong khi xã ${nameB} ghi nhận ${pctB} vào ngày ${dateB} (dải bay ${trackB}). Khi tra cứu, cần đọc tỷ lệ nước đi kèm đúng ngày chụp và dải bay của xã đó.`,
      trackExampleFallback:
        'Khi tra cứu, cần đọc tỷ lệ nước đi kèm đúng ngày chụp và dải bay tham chiếu của từng xã.',
    },

    guide: {
      title: 'Hướng dẫn 3 bước tra cứu nhanh',
      lead: 'Chọn xã, đọc ngày quan sát, rồi mở ảnh để kiểm tra:',
      step1Title: 'Lọc nhóm xã còn nhiều nước',
      step1Body:
        'Bấm vào thẻ "Còn nhiều nước (≥ 30%)" hoặc chọn Tỉnh của bạn để khoanh vùng ngay các xã cần ưu tiên tiêu nước.',
      step2Title: 'Kiểm tra ngày quan trắc & độ phủ',
      step2Body:
        'Xem cột Ngày quan trắc và Độ phủ dữ liệu. Với các xã chưa đủ độ phủ (< 50%), cần kiểm tra trực tiếp ngoài thực địa chứ không coi là đã cạn.',
      step3Title: 'Mở bản đồ xã & đối chiếu thực địa',
      step3Body:
        'Chọn xã, kiểm tra ngày quan sát và mở ảnh tương ứng. Đối chiếu tình trạng tại ruộng trước khi quyết định.',
    },
  },
};
