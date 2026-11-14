**Thời gian báo cáo:** `10:52 GMT+7, 14/11/2026`

Dưới đây là bản phân tích UX và toàn bộ mã nguồn hoàn chỉnh cho trang Tổng quan (`src/ui/overview.ts`), bộ chuỗi đa ngôn ngữ (`en.overview`, `vi.overview`) và khối CSS riêng (`ov-*`) để phối hợp tích hợp cùng Codex.

---

### 1. Phân tích vấn đề UX & Giải pháp thiết kế

1. **Giải quyết vấn đề "Mở web không hiểu giải quyết vấn đề gì" (Quy tắc 5 giây):**
   - Đặt câu hỏi nghiệp vụ làm tiêu đề chính (`h1`): **"Xã nào còn nhiều nước trước vụ Đông Xuân?"** hướng trực tiếp tới cán bộ thủy lợi và Hợp tác xã (HTX).
   - Nêu rõ mục đích sử dụng ngay dưới tiêu đề: dùng ảnh radar vệ tinh NISAR để **ưu tiên kiểm tra thực địa và điều tiết tiêu thoát nước**, đồng thời cảnh báo rõ **không dùng đơn độc số liệu vệ tinh để kết luận "an toàn xuống giống"**.
   - Bổ sung quy trình **3 bước hành động ngắn gọn** (Lọc xã ngập cao $\rightarrow$ Kiểm tra ngày chụp & độ phủ $\rightarrow$ Mở bản đồ xã đối chiếu thực địa).

2. **Giải quyết vấn đề "Dữ liệu chỗ có chỗ không / Ngày chụp lệch nhau":**
   - **Banner thời gian & độ phủ tính động từ dữ liệu runtime:** Hiển thị rõ khoảng ngày quan trắc mới nhất của các xã (ví dụ `27/10/2026 – 03/11/2026`), khẳng định đây là **ảnh chụp vệ tinh theo đợt (không phải thời gian thực)**, và nêu rõ tỷ lệ `131/140` xã đạt độ phủ đánh giá $\ge 50\%$ diện tích.
   - **4 thẻ tổng hợp kiêm bộ lọc nhanh (Cards):** Phân tách rõ 3 mức nước trên nhóm xã đủ độ phủ ($\ge 30\%$: `38` xã; $10\% - <30\%$: `40` xã; $<10\%$: `53` xã — gọi đúng bản chất là *"Nước mặt thấp / chưa ghi nhận ngập"*, không gọi là *"An toàn"*) và tách riêng thẻ thứ 4 cho **9 xã chưa đủ độ phủ $<50\%$** (`6` xã chưa có quan trắc, `3` xã chỉ phủ một phần).
   - **Hộp giải thích giới hạn dữ liệu:** Giải thích trực diện vì sao **9 xã thiếu độ phủ $\neq$ khô ráo**, và vì sao các xã thuộc các dải bay (track) khác nhau có ngày chụp khác nhau (tự động lấy dẫn chứng thực tế từ dữ liệu runtime như **An Long** — `51,7%`, `29/10/2026`, track `083A` và **Sơn Kiên** — `78,2%`, `03/11/2026`, track `148D`), không gộp ảnh khác ngày và không suy đoán xu thế rút nước từ chênh lệch giữa 2 track.

---

### 2. Mã nguồn hoàn chỉnh `src/ui/overview.ts`

```typescript
import { getCommunes } from '../data/dataSource.ts';
import type { CommuneProps } from '../data/types.ts';
import { fmtDate, fmtNum, fmtPct, fold } from '../format.ts';
import { T } from '../i18n.ts';
import { set, state } from '../state.ts';
import { h } from './dom.ts';

export type OverviewGroup = 'all' | 'high' | 'medium' | 'low' | 'insufficient';

type CoverageKind = 'sufficient' | 'partial' | 'none';

const INITIAL_VISIBLE_COUNT = 12;

function getCoverageKind(c: CommuneProps): CoverageKind {
  if (c.last_pct === null || c.last_date === null) return 'none';
  if (c.coverage_sufficient === true) return 'sufficient';
  return 'partial';
}

function isEvaluated(c: CommuneProps): boolean {
  return getCoverageKind(c) === 'sufficient';
}

function classifyCommune(c: CommuneProps): Exclude<OverviewGroup, 'all'> {
  if (!isEvaluated(c)) return 'insufficient';
  const pct = c.last_pct as number;
  if (pct >= 30) return 'high';
  if (pct >= 10) return 'medium';
  return 'low';
}

function comparePriority(a: CommuneProps, b: CommuneProps): number {
  const aEval = isEvaluated(a);
  const bEval = isEvaluated(b);
  if (aEval !== bEval) return aEval ? -1 : 1;

  const aKind = getCoverageKind(a);
  const bKind = getCoverageKind(b);
  if (aKind !== bKind) {
    if (aKind === 'partial') return -1;
    if (bKind === 'partial') return 1;
  }

  if (a.last_pct !== null && b.last_pct !== null && a.last_pct !== b.last_pct) {
    return b.last_pct - a.last_pct;
  }
  if (a.last_pct !== null && b.last_pct === null) return -1;
  if (a.last_pct === null && b.last_pct !== null) return 1;

  return a.name.localeCompare(b.name, 'vi');
}

function computeDateRange(all: CommuneProps[]): { minDate: string | null; maxDate: string | null } {
  const dates = all
    .map((c) => c.last_date)
    .filter((d): d is string => typeof d === 'string' && d.length > 0)
    .sort((a, b) => a.localeCompare(b));

  if (dates.length === 0) {
    return { minDate: null, maxDate: null };
  }
  return {
    minDate: dates[0],
    maxDate: dates[dates.length - 1],
  };
}

export function mountOverview(host: HTMLElement): void {
  host.classList.add('page', 'ov-page');
  const inner = h('div', { class: 'page-inner ov-inner' });
  host.replaceChildren(inner);
  inner.append(h('div', { class: 'loading ov-loading', text: T.overview.loading }));

  getCommunes()
    .then((collection) => {
      const propsList = collection.features.map((f) => f.properties);
      buildOverview(inner, propsList);
    })
    .catch((err: unknown) => {
      console.error(err);
      inner.replaceChildren(
        h('div', {
          class: 'error-box ov-error',
          text: err instanceof Error ? err.message : T.overview.loadError,
        }),
      );
    });
}

function buildOverview(root: HTMLElement, all: CommuneProps[]): void {
  let activeGroup: OverviewGroup = 'all';
  let selectedProvince = '';
  let searchQuery = '';
  let expanded = false;

  const totalCount = all.length;
  const highList = all.filter((c) => classifyCommune(c) === 'high');
  const mediumList = all.filter((c) => classifyCommune(c) === 'medium');
  const lowList = all.filter((c) => classifyCommune(c) === 'low');
  const insufficientList = all.filter((c) => classifyCommune(c) === 'insufficient');

  const evaluatedCount = highList.length + mediumList.length + lowList.length;
  const noObsCount = insufficientList.filter((c) => getCoverageKind(c) === 'none').length;
  const partialObsCount = insufficientList.filter((c) => getCoverageKind(c) === 'partial').length;

  const { minDate, maxDate } = computeDateRange(all);
  const dateRangeText =
    minDate && maxDate
      ? minDate === maxDate
        ? fmtDate(minDate)
        : T.overview.dateRange(fmtDate(minDate), fmtDate(maxDate))
      : T.overview.noDateRange;

  function openMapOverview(): void {
    set({
      tab: 'map',
      mapMode: 'latest',
    } as Parameters<typeof set>[0]);
    location.hash = 'map';
  }

  function openValidation(): void {
    set({
      tab: 'validation',
    } as Parameters<typeof set>[0]);
    location.hash = 'validation';
  }

  function openCommuneOnMap(p: CommuneProps): void {
    set({
      tab: 'map',
      mapMode: 'latest',
      selectedCommune: p.osm_id,
      flyNonce: state.flyNonce + 1,
    } as Parameters<typeof set>[0]);
    location.hash = 'map';
  }

  // 1. Hero & Purpose Banner
  const mapBtn = h('button', {
    type: 'button',
    class: 'btn ov-btn-primary',
    text: T.overview.ctaMapOverview,
  });
  mapBtn.addEventListener('click', openMapOverview);

  const validationBtn = h('button', {
    type: 'button',
    class: 'btn ov-btn-secondary',
    text: T.overview.ctaValidation,
  });
  validationBtn.addEventListener('click', openValidation);

  const heroSection = h(
    'section',
    { class: 'ov-hero', 'aria-labelledby': 'ov-main-title' },
    h(
      'div',
      { class: 'ov-hero-top' },
      h('span', { class: 'ov-audience-tag', text: T.overview.audienceBadge }),
      h('span', { class: 'ov-mode-tag', text: T.overview.nonRealtimeBadge }),
    ),
    h('h1', { id: 'ov-main-title', class: 'ov-title', text: T.overview.title }),
    h('p', { class: 'ov-lead', text: T.overview.lead }),
    h(
      'div',
      { class: 'ov-caution-strip', role: 'note' },
      h('strong', { class: 'ov-caution-label', text: T.overview.cautionLabel }),
      h('span', { text: T.overview.cautionBody }),
    ),
    h(
      'div',
      { class: 'ov-snapshot-banner', role: 'region', 'aria-label': T.overview.snapshotAria },
      h(
        'div',
        { class: 'ov-snapshot-item' },
        h('span', { class: 'ov-snapshot-k', text: T.overview.snapshotWindowLabel }),
        h('strong', { class: 'ov-snapshot-v', text: dateRangeText }),
        h('span', { class: 'ov-snapshot-sub', text: T.overview.snapshotWindowSub }),
      ),
      h(
        'div',
        { class: 'ov-snapshot-item' },
        h('span', { class: 'ov-snapshot-k', text: T.overview.snapshotCoverageLabel }),
        h('strong', {
          class: 'ov-snapshot-v',
          text: T.overview.snapshotCoverageValue(evaluatedCount, totalCount),
        }),
        h('span', {
          class: 'ov-snapshot-sub',
          text: T.overview.snapshotCoverageSub(insufficientList.length, noObsCount, partialObsCount),
        }),
      ),
      h('div', { class: 'ov-hero-actions' }, mapBtn, validationBtn),
    ),
  );

  // 2. Four Summary & Filter Cards
  const cardDefs: {
    group: Exclude<OverviewGroup, 'all'>;
    tone: string;
    count: number;
    title: string;
    threshold: string;
    desc: string;
  }[] = [
    {
      group: 'high',
      tone: 'ov-card-high',
      count: highList.length,
      title: T.overview.cards.highTitle,
      threshold: T.overview.cards.highThreshold,
      desc: T.overview.cards.highDesc,
    },
    {
      group: 'medium',
      tone: 'ov-card-medium',
      count: mediumList.length,
      title: T.overview.cards.mediumTitle,
      threshold: T.overview.cards.mediumThreshold,
      desc: T.overview.cards.mediumDesc,
    },
    {
      group: 'low',
      tone: 'ov-card-low',
      count: lowList.length,
      title: T.overview.cards.lowTitle,
      threshold: T.overview.cards.lowThreshold,
      desc: T.overview.cards.lowDesc,
    },
    {
      group: 'insufficient',
      tone: 'ov-card-insufficient',
      count: insufficientList.length,
      title: T.overview.cards.insufficientTitle,
      threshold: T.overview.cards.insufficientThreshold,
      desc: T.overview.cards.insufficientDesc(noObsCount, partialObsCount),
    },
  ];

  const cardButtons = new Map<Exclude<OverviewGroup, 'all'>, HTMLButtonElement>();

  const cardsGrid = h(
    'div',
    { class: 'ov-cards-grid', role: 'group', 'aria-label': T.overview.cardsGroupAria },
    ...cardDefs.map((def) => {
      const btn = h(
        'button',
        {
          type: 'button',
          class: `ov-card ${def.tone}`,
          'aria-pressed': 'false',
        },
        h(
          'div',
          { class: 'ov-card-head' },
          h('span', { class: 'ov-card-title', text: def.title }),
          h('span', { class: 'ov-card-badge', text: def.threshold }),
        ),
        h(
          'div',
          { class: 'ov-card-metric' },
          h('strong', { class: 'ov-card-number', text: fmtNum(def.count) }),
          h('span', { class: 'ov-card-unit', text: T.overview.cards.unitCommunes(totalCount) }),
        ),
        h('p', { class: 'ov-card-desc', text: def.desc }),
        h('span', { class: 'ov-card-action', text: T.overview.cards.clickToFilter }),
      );
      btn.addEventListener('click', () => {
        activeGroup = activeGroup === def.group ? 'all' : def.group;
        groupSelect.value = activeGroup;
        expanded = false;
        renderList();
      });
      cardButtons.set(def.group, btn);
      return btn;
    }),
  );

  const cardsSection = h(
    'section',
    { class: 'ov-section', 'aria-labelledby': 'ov-cards-heading' },
    h(
      'div',
      { class: 'ov-section-head' },
      h('h2', { id: 'ov-cards-heading', class: 'ov-section-title', text: T.overview.cardsSectionTitle }),
      h('p', { class: 'ov-section-sub', text: T.overview.cardsSectionSub }),
    ),
    cardsGrid,
  );

  // 3. Priority Commune List Section (Search, Province Filter, Group Filter, Table)
  const searchInput = h('input', {
    type: 'search',
    class: 'ov-input',
    placeholder: T.overview.list.searchPlaceholder,
    'aria-label': T.overview.list.searchAria,
  });

  const provinces = [...new Set(all.map((c) => c.province))].sort((a, b) => a.localeCompare(b, 'vi'));
  const provinceSelect = h(
    'select',
    { class: 'ov-select', 'aria-label': T.overview.list.provinceAria },
    h('option', { value: '', text: T.overview.list.allProvinces }),
    ...provinces.map((p) => h('option', { value: p, text: p })),
  );

  const groupSelect = h(
    'select',
    { class: 'ov-select', 'aria-label': T.overview.list.groupAria },
    h('option', { value: 'all', text: T.overview.list.groupAll(totalCount) }),
    h('option', { value: 'high', text: T.overview.list.groupHigh(highList.length) }),
    h('option', { value: 'medium', text: T.overview.list.groupMedium(mediumList.length) }),
    h('option', { value: 'low', text: T.overview.list.groupLow(lowList.length) }),
    h('option', { value: 'insufficient', text: T.overview.list.groupInsufficient(insufficientList.length) }),
  );

  const resetFilterBtn = h('button', {
    type: 'button',
    class: 'btn ov-btn-reset',
    text: T.overview.list.resetFilters,
  });

  const resultSummary = h('span', { class: 'ov-result-count', 'aria-live': 'polite' });
  const tbody = h('tbody');
  const showMoreBtn = h('button', { type: 'button', class: 'btn ov-btn-more' });
  const listFooter = h('div', { class: 'ov-list-footer' }, showMoreBtn);

  const table = h(
    'table',
    { class: 'ov-table' },
    h(
      'thead',
      {},
      h(
        'tr',
        {},
        h('th', { scope: 'col', text: T.overview.list.colCommune }),
        h('th', { scope: 'col', text: T.overview.list.colProvince }),
        h('th', { scope: 'col', class: 'ov-num', text: T.overview.list.colWaterPct }),
        h('th', { scope: 'col', text: T.overview.list.colObsDate }),
        h('th', { scope: 'col', text: T.overview.list.colCoverage }),
        h('th', { scope: 'col', class: 'ov-col-action', text: T.overview.list.colAction }),
      ),
    ),
    tbody,
  );

  const listSection = h(
    'section',
    { class: 'ov-section ov-list-section', 'aria-labelledby': 'ov-list-heading' },
    h(
      'div',
      { class: 'ov-section-head' },
      h('h2', { id: 'ov-list-heading', class: 'ov-section-title', text: T.overview.list.title }),
      h('p', { class: 'ov-section-sub', text: T.overview.list.subtitle }),
    ),
    h(
      'div',
      { class: 'ov-toolbar' },
      searchInput,
      provinceSelect,
      groupSelect,
      resetFilterBtn,
      h('div', { class: 'ov-toolbar-spacer' }),
      resultSummary,
    ),
    h('div', { class: 'ov-table-wrap' }, table),
    listFooter,
  );

  // 4. Data Caveats & 3-Step Guide Section
  const exAnLong =
    all.find((c) => c.osm_id === '15581562') ??
    all.find((c) => isEvaluated(c) && c.reference_track === '083A');
  const exSonKien =
    all.find((c) => c.osm_id === '15416586') ??
    all.find((c) => isEvaluated(c) && c.reference_track === '148D');

  const trackExampleText =
    exAnLong && exSonKien
      ? T.overview.caveats.trackExampleDynamic(
          exAnLong.name,
          fmtPct(exAnLong.last_pct),
          fmtDate(exAnLong.last_date),
          exAnLong.reference_track ?? '083A',
          exSonKien.name,
          fmtPct(exSonKien.last_pct),
          fmtDate(exSonKien.last_date),
          exSonKien.reference_track ?? '148D',
        )
      : T.overview.caveats.trackExampleFallback;

  const filterInsufficientQuickBtn = h('button', {
    type: 'button',
    class: 'btn ov-btn-inline',
    text: T.overview.caveats.viewInsufficientBtn(insufficientList.length),
  });
  filterInsufficientQuickBtn.addEventListener('click', () => {
    activeGroup = 'insufficient';
    groupSelect.value = 'insufficient';
    expanded = true;
    renderList();
    listSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  const guideAndCaveatsSection = h(
    'section',
    { class: 'ov-bottom-grid', 'aria-label': T.overview.guideAndCaveatsAria },
    h(
      'div',
      { class: 'ov-panel ov-caveats-panel' },
      h('h2', { class: 'ov-panel-title', text: T.overview.caveats.title }),
      h(
        'div',
        { class: 'ov-caveat-block' },
        h('h3', {
          class: 'ov-caveat-heading',
          text: T.overview.caveats.missingNotDryTitle(insufficientList.length),
        }),
        h('p', {
          class: 'ov-caveat-text',
          text: T.overview.caveats.missingNotDryBody(insufficientList.length, noObsCount, partialObsCount),
        }),
        filterInsufficientQuickBtn,
      ),
      h(
        'div',
        { class: 'ov-caveat-block' },
        h('h3', { class: 'ov-caveat-heading', text: T.overview.caveats.multiTrackTitle }),
        h('p', { class: 'ov-caveat-text', text: T.overview.caveats.multiTrackBody }),
        h('p', { class: 'ov-caveat-example', text: trackExampleText }),
      ),
    ),
    h(
      'div',
      { class: 'ov-panel ov-guide-panel' },
      h('h2', { class: 'ov-panel-title', text: T.overview.guide.title }),
      h('p', { class: 'ov-panel-lead', text: T.overview.guide.lead }),
      h(
        'ol',
        { class: 'ov-steps' },
        h(
          'li',
          { class: 'ov-step' },
          h('strong', { class: 'ov-step-title', text: T.overview.guide.step1Title }),
          h('p', { class: 'ov-step-body', text: T.overview.guide.step1Body }),
        ),
        h(
          'li',
          { class: 'ov-step' },
          h('strong', { class: 'ov-step-title', text: T.overview.guide.step2Title }),
          h('p', { class: 'ov-step-body', text: T.overview.guide.step2Body }),
        ),
        h(
          'li',
          { class: 'ov-step' },
          h('strong', { class: 'ov-step-title', text: T.overview.guide.step3Title }),
          h('p', { class: 'ov-step-body', text: T.overview.guide.step3Body }),
        ),
      ),
    ),
  );

  root.replaceChildren(heroSection, cardsSection, listSection, guideAndCaveatsSection);

  function getFilteredRows(): CommuneProps[] {
    const q = fold(searchQuery.trim());
    return all
      .filter((c) => {
        if (selectedProvince && c.province !== selectedProvince) return false;
        if (activeGroup !== 'all' && classifyCommune(c) !== activeGroup) return false;
        if (q && !fold(c.name).includes(q) && !fold(c.province).includes(q)) return false;
        return true;
      })
      .sort(comparePriority);
  }

  function renderWaterCell(c: CommuneProps): HTMLElement {
    const kind = getCoverageKind(c);
    if (kind === 'none' || c.last_pct === null) {
      return h(
        'td',
        { class: 'ov-num' },
        h('span', { class: 'ov-pct-empty', text: '—' }),
        h('span', { class: 'ov-pct-sub', text: T.overview.list.noObsShort }),
      );
    }

    const pctText = fmtPct(c.last_pct);
    const group = classifyCommune(c);
    const widthPct = Math.max(2, Math.min(100, Math.round(c.last_pct)));

    return h(
      'td',
      { class: 'ov-num' },
      h(
        'div',
        { class: 'ov-pct-wrap' },
        h('strong', { class: `ov-pct-val ov-pct-${group}`, text: pctText }),
        kind === 'partial'
          ? h('span', { class: 'ov-pct-partial-tag', text: T.overview.list.partialValueNote })
          : h('span', { class: 'ov-pct-group-tag', text: T.overview.list.groupBadge[group] }),
      ),
      h(
        'div',
        { class: 'ov-bar-track', 'aria-hidden': 'true' },
        h('div', { class: `ov-bar-fill ov-bar-${group}`, style: `width:${widthPct}%` }),
      ),
    );
  }

  function renderDateCell(c: CommuneProps): HTMLElement {
    if (!c.last_date) {
      return h('td', {}, h('span', { class: 'ov-date-empty', text: T.overview.list.noDate }));
    }
    return h(
      'td',
      {},
      h('span', { class: 'ov-date-val', text: fmtDate(c.last_date) }),
      c.reference_track
        ? h('span', { class: 'ov-track-tag', text: T.overview.list.trackTag(c.reference_track) })
        : null,
    );
  }

  function renderCoverageCell(c: CommuneProps): HTMLElement {
    const kind = getCoverageKind(c);
    if (kind === 'sufficient') {
      return h(
        'td',
        {},
        h('span', { class: 'ov-cov-chip ov-cov-ok', text: T.overview.list.coverageSufficient }),
        c.valid_km2 !== null
          ? h('span', { class: 'ov-cov-sub', text: T.overview.list.validArea(fmtNum(c.valid_km2)) })
          : null,
      );
    }
    if (kind === 'partial') {
      return h(
        'td',
        {},
        h('span', { class: 'ov-cov-chip ov-cov-partial', text: T.overview.list.coveragePartial }),
        c.valid_km2 !== null
          ? h('span', { class: 'ov-cov-sub', text: T.overview.list.validArea(fmtNum(c.valid_km2)) })
          : null,
      );
    }
    return h(
      'td',
      {},
      h('span', { class: 'ov-cov-chip ov-cov-none', text: T.overview.list.coverageNone }),
    );
  }

  function renderList(): void {
    for (const [grp, btn] of cardButtons.entries()) {
      const isPressed = activeGroup === grp;
      btn.setAttribute('aria-pressed', isPressed ? 'true' : 'false');
      btn.classList.toggle('is-active', isPressed);
    }

    const hasFilters = activeGroup !== 'all' || selectedProvince !== '' || searchQuery.trim() !== '';
    resetFilterBtn.disabled = !hasFilters;

    const filtered = getFilteredRows();
    const visible = expanded ? filtered : filtered.slice(0, INITIAL_VISIBLE_COUNT);

    resultSummary.textContent = T.overview.list.showingCount(visible.length, filtered.length, totalCount);

    if (filtered.length === 0) {
      tbody.replaceChildren(
        h(
          'tr',
          {},
          h('td', { colspan: '6', class: 'ov-empty', text: T.overview.list.emptyResult }),
        ),
      );
      listFooter.hidden = true;
      return;
    }

    tbody.replaceChildren(
      ...visible.map((c) => {
        const kind = getCoverageKind(c);
        const covLabel =
          kind === 'sufficient'
            ? T.overview.list.coverageSufficient
            : kind === 'partial'
              ? T.overview.list.coveragePartial
              : T.overview.list.coverageNone;

        const rowAria = T.overview.list.rowAria(
          c.name,
          c.province,
          fmtPct(c.last_pct),
          c.last_date ? fmtDate(c.last_date) : T.overview.list.noDate,
          covLabel,
        );

        const openBtn = h('button', {
          type: 'button',
          class: 'ov-row-btn',
          text: T.overview.list.openMapRow,
          'aria-label': rowAria,
        });
        openBtn.addEventListener('click', (ev) => {
          ev.stopPropagation();
          openCommuneOnMap(c);
        });

        const tr = h(
          'tr',
          {
            class: `ov-row ov-row-${classifyCommune(c)}`,
            tabindex: '0',
            role: 'button',
            'aria-label': rowAria,
          },
          h('td', { class: 'ov-cell-name' }, h('strong', { text: c.name })),
          h('td', { class: 'ov-cell-prov', text: c.province }),
          renderWaterCell(c),
          renderDateCell(c),
          renderCoverageCell(c),
          h('td', { class: 'ov-col-action' }, openBtn),
        );

        tr.addEventListener('click', () => openCommuneOnMap(c));
        tr.addEventListener('keydown', (ev) => {
          if (ev.key === 'Enter' || ev.key === ' ') {
            ev.preventDefault();
            openCommuneOnMap(c);
          }
        });

        return tr;
      }),
    );

    if (filtered.length > INITIAL_VISIBLE_COUNT) {
      listFooter.hidden = false;
      const remaining = filtered.length - INITIAL_VISIBLE_COUNT;
      showMoreBtn.textContent = expanded
        ? T.overview.list.showLess
        : T.overview.list.showMore(remaining);
    } else {
      listFooter.hidden = true;
    }
  }

  searchInput.addEventListener('input', () => {
    searchQuery = searchInput.value;
    expanded = false;
    renderList();
  });

  provinceSelect.addEventListener('change', () => {
    selectedProvince = provinceSelect.value;
    expanded = false;
    renderList();
  });

  groupSelect.addEventListener('change', () => {
    activeGroup = groupSelect.value as OverviewGroup;
    expanded = false;
    renderList();
  });

  resetFilterBtn.addEventListener('click', () => {
    activeGroup = 'all';
    selectedProvince = '';
    searchQuery = '';
    searchInput.value = '';
    provinceSelect.value = '';
    groupSelect.value = 'all';
    expanded = false;
    renderList();
  });

  showMoreBtn.addEventListener('click', () => {
    expanded = !expanded;
    renderList();
  });

  renderList();
}
```

---

### 3. Đối tượng ngôn ngữ `en.overview` và `vi.overview` (cho `src/i18n.ts`)

Các hàm trong `en.overview` đều có kiểu tham số và kiểu trả về tường minh (`explicit types`) để TypeScript suy luận `type Strings = typeof en` và kiểm tra tương thích chặt với `vi.overview`.

```typescript
// --- Bổ sung vào object `en` trong src/i18n.ts ---
export const enOverview = {
  overview: {
    loading: 'Loading commune flood overview…',
    loadError: 'Unable to load commune overview data.',
    audienceBadge: 'For Irrigation & Cooperative Officers',
    nonRealtimeBadge: 'Satellite Snapshot · Not Real-Time',
    title: 'Which communes still hold standing water before the Winter–Spring crop?',
    lead: 'Prioritize field inspection and drainage operations using the latest valid NISAR L-band radar observation per commune.',
    cautionLabel: 'Operational notice:',
    cautionBody:
      'Use this data to prioritize field checks and pumping schedules. Do NOT use satellite water fraction alone to declare fields safe for sowing.',
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
      clickToFilter: 'Click to filter list ↓',
      highTitle: 'High Standing Water',
      highThreshold: '≥ 30% water · Coverage ≥ 50%',
      highDesc: 'Top priority for field inspection, dike checks, and active drainage before crop preparation.',
      mediumTitle: 'Moderate Standing Water',
      mediumThreshold: '10% to < 30% · Coverage ≥ 50%',
      mediumDesc: 'Monitor recession pace closely and verify internal canal drainage capacity.',
      lowTitle: 'Low Surface Water',
      lowThreshold: '< 10% water · Coverage ≥ 50%',
      lowDesc: 'Low open-water fraction on radar. Does NOT automatically mean soil is ready or safe for sowing.',
      insufficientTitle: 'Insufficient Radar Coverage',
      insufficientThreshold: 'Coverage < 50% or No Pass',
      insufficientDesc: (noObs: number, partial: number): string =>
        `${noObs} communes with no radar pass, ${partial} with partial coverage (<50%). Missing data ≠ dry.`,
    },

    list: {
      title: 'Priority Commune Inspection List',
      subtitle:
        'Sorted by highest standing water fraction first. Click any commune row to inspect its latest radar scene on the map.',
      searchPlaceholder: 'Search commune or province (e.g., Son Kien, An Long)…',
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
      colWaterPct: 'Latest Water %',
      colObsDate: 'Observation Date',
      colCoverage: 'Radar Coverage',
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
      coverageNone: 'No radar pass (0%)',
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
      title: 'Why Coverage Varies & How to Interpret Dates Safely',
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
      title: '3-Step Operational Guide',
      lead: 'Quick workflow for irrigation and cooperative teams before the Winter–Spring season:',
      step1Title: 'Filter high-priority communes',
      step1Body:
        'Start with the ≥ 30% and 10% – < 30% cards or filter by your province to identify communes with substantial standing water.',
      step2Title: 'Verify observation date & coverage status',
      step2Body:
        'Check the exact capture date and track on each row. Treat the 9 insufficient-coverage communes as unverified—never as dry.',
      step3Title: 'Open the commune map & confirm in the field',
      step3Body:
        'Click a commune to inspect local radar water distribution on the map, then verify sluice gates, dikes, and actual field drainage on the ground.',
    },
  },
};

// --- Bổ sung vào object `vi` trong src/i18n.ts ---
export const viOverview: typeof enOverview = {
  overview: {
    loading: 'Đang tải tổng quan ngập lũ cấp xã…',
    loadError: 'Không thể tải dữ liệu tổng quan cấp xã.',
    audienceBadge: 'Dành cho Cán bộ Thủy lợi & HTX',
    nonRealtimeBadge: 'Ảnh chụp vệ tinh theo đợt · Không thời gian thực',
    title: 'Xã nào còn nhiều nước trước vụ Đông Xuân?',
    lead: 'Ưu tiên kiểm tra thực địa và vận hành tiêu thoát nước dựa trên ảnh radar vệ tinh NISAR hợp lệ mới nhất của từng xã.',
    cautionLabel: 'Lưu ý vận hành:',
    cautionBody:
      'Dữ liệu dùng để ưu tiên kiểm tra thực địa và điều tiết tiêu nước; KHÔNG dùng đơn độc tỷ lệ nước vệ tinh để kết luận an toàn xuống giống.',
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

    cardsSectionTitle: 'Phân nhóm xã theo tỷ lệ nước mặt mới nhất & độ phủ',
    cardsSectionSub:
      'Bấm vào từng thẻ để lọc nhanh danh sách xã bên dưới. Các ngưỡng % nước chỉ tính trên những xã đạt độ phủ vệ tinh ≥ 50% diện tích.',
    cardsGroupAria: 'Lọc xã theo nhóm mức nước hoặc trạng thái độ phủ',
    cards: {
      unitCommunes: (total: number): string => `/ ${total} xã`,
      clickToFilter: 'Bấm để lọc danh sách ↓',
      highTitle: 'Còn nhiều nước (≥ 30%)',
      highThreshold: '≥ 30% nước · Đủ phủ ≥ 50%',
      highDesc: 'Ưu tiên số 1 về kiểm tra đồng ruộng, bờ bao và chủ động bơm tiêu thoát nước.',
      mediumTitle: 'Còn nước trung bình (10% – < 30%)',
      mediumThreshold: '10% đến < 30% · Đủ phủ ≥ 50%',
      mediumDesc: 'Theo dõi sát tốc độ rút nước nội đồng và khả năng tiêu thoát của kênh trục.',
      lowTitle: 'Nước mặt thấp (< 10%)',
      lowThreshold: '< 10% nước · Đủ phủ ≥ 50%',
      lowDesc: 'Tỷ lệ nước mặt trên ảnh radar thấp; KHÔNG đồng nghĩa ruộng đã đủ điều kiện an toàn xuống giống.',
      insufficientTitle: 'Chưa đủ độ phủ (< 50%)',
      insufficientThreshold: 'Phủ < 50% hoặc chưa có ảnh',
      insufficientDesc: (noObs: number, partial: number): string =>
        `Gồm ${noObs} xã không có quan trắc và ${partial} xã chỉ phủ ít (<50%). Thiếu dữ liệu ≠ đã khô ráo.`,
    },

    list: {
      title: 'Danh sách xã ưu tiên kiểm tra',
      subtitle:
        'Sắp xếp mặc định từ xã còn tỷ lệ nước cao nhất xuống thấp. Bấm vào một xã để mở bản đồ chi tiết ở chế độ Mới nhất theo xã (latest).',
      searchPlaceholder: 'Tìm tên xã hoặc tỉnh (VD: Sơn Kiên, An Long)…',
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
      coverageNone: 'Không có quan trắc (0%)',
      validArea: (km2: string): string => `Quét ${km2} km²`,
      openMapRow: 'Mở bản đồ →',
      rowAria: (
        name: string,
        province: string,
        pct: string,
        date: string,
        coverage: string,
      ): string =>
        `Xã ${name}, tỉnh ${province}: tỷ lệ nước ${pct}, ngày quan trắc ${date}, ${coverage}. Bấm để mở bản đồ chế độ mới nhất.`,
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
      lead: 'Quy trình sử dụng trang tổng quan trong 5 giây cho cán bộ thủy lợi / HTX:',
      step1Title: 'Lọc nhóm xã còn nhiều nước',
      step1Body:
        'Bấm vào thẻ "Còn nhiều nước (≥ 30%)" hoặc chọn Tỉnh của bạn để khoanh vùng ngay các xã cần ưu tiên tiêu nước.',
      step2Title: 'Kiểm tra ngày quan trắc & độ phủ',
      step2Body:
        'Xem cột Ngày quan trắc và Độ phủ dữ liệu. Với 9 xã chưa đủ độ phủ (< 50%), cần kiểm tra trực tiếp ngoài thực địa chứ không coi là đã cạn.',
      step3Title: 'Mở bản đồ xã & đối chiếu thực địa',
      step3Body:
        'Bấm vào dòng tên xã để bay tới bản đồ lớp nước mới nhất của xã đó, kết hợp kiểm tra cống tiêu, trạm bơm và mặt ruộng thực tế.',
    },
  },
};
```

---

### 4. Khối CSS riêng cho trang Overview (tiền tố `ov-`)

```css
/* ==========================================================================
   Overview Page (prefix: ov-)
   ========================================================================== */

.ov-page {
  padding-bottom: 3rem;
}

.ov-inner {
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

/* Hero & Snapshot Banner */
.ov-hero {
  background: var(--surface, #ffffff);
  border: 1px solid var(--border, #d8dee4);
  border-radius: 10px;
  padding: 1.25rem 1.5rem;
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.04);
}

.ov-hero-top {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 0.65rem;
}

.ov-audience-tag,
.ov-mode-tag {
  display: inline-flex;
  align-items: center;
  font-size: 0.78rem;
  font-weight: 600;
  padding: 0.2rem 0.6rem;
  border-radius: 999px;
  letter-spacing: 0.01em;
}

.ov-audience-tag {
  background: #e0f2fe;
  color: #0369a1;
}

.ov-mode-tag {
  background: #fef3c7;
  color: #92400e;
}

.ov-title {
  margin: 0 0 0.5rem 0;
  font-size: clamp(1.35rem, 2.2vw, 1.75rem);
  line-height: 1.25;
  color: var(--text-strong, #0f172a);
}

.ov-lead {
  margin: 0 0 0.85rem 0;
  font-size: 0.98rem;
  line-height: 1.5;
  color: var(--text-muted, #334155);
}

.ov-caution-strip {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
  padding: 0.65rem 0.9rem;
  background: #fffbeb;
  border-left: 4px solid #d97706;
  border-radius: 6px;
  font-size: 0.88rem;
  line-height: 1.45;
  color: #78350f;
  margin-bottom: 1rem;
}

.ov-caution-label {
  font-weight: 700;
}

.ov-snapshot-banner {
  display: grid;
  grid-template-columns: 1fr 1fr auto;
  gap: 1rem;
  align-items: center;
  padding: 0.85rem 1rem;
  background: var(--surface-subtle, #f8fafc);
  border: 1px solid var(--border, #e2e8f0);
  border-radius: 8px;
}

.ov-snapshot-item {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.ov-snapshot-k {
  font-size: 0.76rem;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  color: var(--text-muted, #64748b);
  font-weight: 600;
}

.ov-snapshot-v {
  font-size: 1.05rem;
  color: var(--text-strong, #0f172a);
  font-weight: 700;
}

.ov-snapshot-sub {
  font-size: 0.8rem;
  color: var(--text-muted, #475569);
}

.ov-hero-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.6rem;
}

.ov-btn-primary {
  background: #0284c7;
  color: #ffffff;
  border: 1px solid #0369a1;
  font-weight: 600;
  padding: 0.55rem 1rem;
  border-radius: 6px;
  cursor: pointer;
}

.ov-btn-primary:hover,
.ov-btn-primary:focus-visible {
  background: #0369a1;
}

.ov-btn-secondary {
  background: #ffffff;
  color: #0f172a;
  border: 1px solid #cbd5e1;
  font-weight: 600;
  padding: 0.55rem 0.95rem;
  border-radius: 6px;
  cursor: pointer;
}

.ov-btn-secondary:hover,
.ov-btn-secondary:focus-visible {
  background: #f1f5f9;
}

/* Section Headers */
.ov-section {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
}

.ov-section-head {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.ov-section-title {
  margin: 0;
  font-size: 1.15rem;
  color: var(--text-strong, #0f172a);
}

.ov-section-sub {
  margin: 0;
  font-size: 0.88rem;
  color: var(--text-muted, #475569);
}

/* 4 Summary Filter Cards */
.ov-cards-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 0.85rem;
}

.ov-card {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  text-align: left;
  padding: 1rem;
  border-radius: 8px;
  border: 1px solid var(--border, #cbd5e1);
  background: var(--surface, #ffffff);
  cursor: pointer;
  transition: border-color 0.15s ease, box-shadow 0.15s ease, transform 0.1s ease;
  font-family: inherit;
}

.ov-card:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 10px rgba(15, 23, 42, 0.06);
}

.ov-card:focus-visible {
  outline: 2px solid #0284c7;
  outline-offset: 2px;
}

.ov-card.is-active {
  box-shadow: 0 0 0 2px #0f172a;
}

.ov-card-high {
  border-top: 4px solid #dc2626;
}

.ov-card-medium {
  border-top: 4px solid #d97706;
}

.ov-card-low {
  border-top: 4px solid #0284c7;
}

.ov-card-insufficient {
  border-top: 4px solid #64748b;
  background: #f8fafc;
}

.ov-card-head {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  margin-bottom: 0.5rem;
}

.ov-card-title {
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--text-strong, #0f172a);
}

.ov-card-badge {
  display: inline-block;
  align-self: flex-start;
  font-size: 0.74rem;
  font-weight: 600;
  padding: 0.15rem 0.45rem;
  border-radius: 4px;
  background: #f1f5f9;
  color: #334155;
}

.ov-card-metric {
  display: flex;
  align-items: baseline;
  gap: 0.35rem;
  margin: 0.2rem 0 0.5rem 0;
}

.ov-card-number {
  font-size: 1.85rem;
  line-height: 1;
  font-weight: 800;
  color: var(--text-strong, #0f172a);
}

.ov-card-unit {
  font-size: 0.82rem;
  color: var(--text-muted, #64748b);
}

.ov-card-desc {
  margin: 0 0 0.75rem 0;
  font-size: 0.82rem;
  line-height: 1.4;
  color: var(--text-muted, #475569);
  flex: 1;
}

.ov-card-action {
  font-size: 0.78rem;
  font-weight: 600;
  color: #0284c7;
}

/* Priority Commune List & Toolbar */
.ov-list-section {
  background: var(--surface, #ffffff);
  border: 1px solid var(--border, #d8dee4);
  border-radius: 10px;
  padding: 1.25rem;
}

.ov-toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 0.6rem;
  align-items: center;
}

.ov-input,
.ov-select {
  padding: 0.48rem 0.7rem;
  border: 1px solid var(--border, #cbd5e1);
  border-radius: 6px;
  font-size: 0.88rem;
  background: #ffffff;
  color: var(--text-strong, #0f172a);
}

.ov-input {
  min-width: 250px;
  flex: 1 1 250px;
}

.ov-toolbar-spacer {
  flex: 1;
}

.ov-result-count {
  font-size: 0.84rem;
  color: var(--text-muted, #475569);
  font-weight: 500;
}

.ov-btn-reset {
  font-size: 0.84rem;
  padding: 0.45rem 0.75rem;
  border-radius: 6px;
  border: 1px solid #cbd5e1;
  background: #f8fafc;
  cursor: pointer;
}

.ov-btn-reset:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.ov-table-wrap {
  overflow-x: auto;
  border: 1px solid var(--border, #e2e8f0);
  border-radius: 8px;
}

.ov-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.88rem;
}

.ov-table th,
.ov-table td {
  padding: 0.65rem 0.75rem;
  text-align: left;
  border-bottom: 1px solid var(--border, #e2e8f0);
  vertical-align: middle;
}

.ov-table th {
  background: #f8fafc;
  font-weight: 600;
  color: var(--text-muted, #475569);
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 0.02em;
}

.ov-table th.ov-num,
.ov-table td.ov-num {
  text-align: right;
}

.ov-row {
  cursor: pointer;
  transition: background-color 0.12s ease;
}

.ov-row:hover,
.ov-row:focus-visible {
  background: #f0f9ff;
  outline: none;
}

.ov-row:focus-visible {
  box-shadow: inset 3px 0 0 #0284c7;
}

.ov-pct-wrap {
  display: flex;
  justify-content: flex-end;
  align-items: baseline;
  gap: 0.4rem;
}

.ov-pct-val {
  font-size: 0.95rem;
  font-variant-numeric: tabular-nums;
}

.ov-pct-high {
  color: #b91c1c;
}

.ov-pct-medium {
  color: #b45309;
}

.ov-pct-low {
  color: #0369a1;
}

.ov-pct-group-tag,
.ov-pct-partial-tag {
  font-size: 0.72rem;
  padding: 0.1rem 0.35rem;
  border-radius: 4px;
}

.ov-pct-group-tag {
  background: #f1f5f9;
  color: #475569;
}

.ov-pct-partial-tag {
  background: #fef3c7;
  color: #92400e;
  font-weight: 600;
}

.ov-pct-empty {
  color: #94a3b8;
  font-weight: 600;
  margin-right: 0.35rem;
}

.ov-pct-sub {
  font-size: 0.75rem;
  color: #64748b;
}

.ov-bar-track {
  width: 110px;
  height: 5px;
  background: #e2e8f0;
  border-radius: 999px;
  margin-left: auto;
  margin-top: 0.25rem;
  overflow: hidden;
}

.ov-bar-fill {
  height: 100%;
  border-radius: 999px;
}

.ov-bar-high {
  background: #dc2626;
}

.ov-bar-medium {
  background: #d97706;
}

.ov-bar-low {
  background: #0284c7;
}

.ov-bar-insufficient {
  background: #94a3b8;
}

.ov-date-val {
  display: block;
  font-weight: 500;
  font-variant-numeric: tabular-nums;
}

.ov-date-empty {
  color: #64748b;
  font-style: italic;
}

.ov-track-tag {
  display: inline-block;
  margin-top: 0.15rem;
  font-size: 0.73rem;
  padding: 0.08rem 0.4rem;
  border-radius: 4px;
  background: #f1f5f9;
  color: #334155;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
}

.ov-cov-chip {
  display: inline-block;
  font-size: 0.76rem;
  font-weight: 600;
  padding: 0.2rem 0.5rem;
  border-radius: 999px;
}

.ov-cov-ok {
  background: #dcfce7;
  color: #166534;
}

.ov-cov-partial {
  background: #fef3c7;
  color: #92400e;
}

.ov-cov-none {
  background: #f1f5f9;
  color: #475569;
}

.ov-cov-sub {
  display: block;
  font-size: 0.73rem;
  color: #64748b;
  margin-top: 0.15rem;
}

.ov-col-action {
  text-align: right;
  white-space: nowrap;
}

.ov-row-btn {
  padding: 0.32rem 0.65rem;
  font-size: 0.8rem;
  font-weight: 600;
  color: #0284c7;
  background: transparent;
  border: 1px solid #bae6fd;
  border-radius: 6px;
  cursor: pointer;
}

.ov-row-btn:hover,
.ov-row-btn:focus-visible {
  background: #0284c7;
  color: #ffffff;
}

.ov-empty {
  text-align: center;
  padding: 2rem !important;
  color: var(--text-muted, #64748b);
}

.ov-list-footer {
  display: flex;
  justify-content: center;
  padding-top: 0.5rem;
}

.ov-btn-more {
  padding: 0.5rem 1.2rem;
  border-radius: 6px;
  border: 1px solid #cbd5e1;
  background: #f8fafc;
  font-weight: 600;
  cursor: pointer;
}

.ov-btn-more:hover {
  background: #e2e8f0;
}

/* Bottom Grid: Caveats & 3-Step Guide */
.ov-bottom-grid {
  display: grid;
  grid-template-columns: 1.2fr 1fr;
  gap: 1.25rem;
}

.ov-panel {
  background: var(--surface, #ffffff);
  border: 1px solid var(--border, #d8dee4);
  border-radius: 10px;
  padding: 1.25rem;
}

.ov-panel-title {
  margin: 0 0 0.75rem 0;
  font-size: 1.08rem;
  color: var(--text-strong, #0f172a);
}

.ov-panel-lead {
  margin: 0 0 0.85rem 0;
  font-size: 0.88rem;
  color: var(--text-muted, #475569);
}

.ov-caveat-block + .ov-caveat-block {
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid var(--border, #e2e8f0);
}

.ov-caveat-heading {
  margin: 0 0 0.35rem 0;
  font-size: 0.94rem;
  color: var(--text-strong, #0f172a);
}

.ov-caveat-text {
  margin: 0 0 0.6rem 0;
  font-size: 0.86rem;
  line-height: 1.5;
  color: var(--text-muted, #334155);
}

.ov-caveat-example {
  margin: 0;
  padding: 0.6rem 0.75rem;
  background: #f8fafc;
  border-left: 3px solid #0284c7;
  border-radius: 4px;
  font-size: 0.83rem;
  line-height: 1.45;
  color: #1e293b;
}

.ov-btn-inline {
  font-size: 0.8rem;
  font-weight: 600;
  padding: 0.35rem 0.7rem;
  border-radius: 6px;
  border: 1px solid #cbd5e1;
  background: #f8fafc;
  color: #0f172a;
  cursor: pointer;
}

.ov-btn-inline:hover {
  background: #e2e8f0;
}

.ov-steps {
  margin: 0;
  padding-left: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.ov-step-title {
  display: block;
  font-size: 0.9rem;
  color: var(--text-strong, #0f172a);
  margin-bottom: 0.15rem;
}

.ov-step-body {
  margin: 0;
  font-size: 0.84rem;
  line-height: 1.45;
  color: var(--text-muted, #475569);
}

/* Responsive Breakpoints */
@media (max-width: 980px) {
  .ov-snapshot-banner {
    grid-template-columns: 1fr;
  }
  .ov-cards-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .ov-bottom-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 600px) {
  .ov-cards-grid {
    grid-template-columns: 1fr;
  }
  .ov-hero {
    padding: 1rem;
  }
}
```

---

### 5. Giả định kỹ thuật (Assumptions), Kế hoạch kiểm thử (Test Plan) & Phản biện (Critique)

#### A. Giả định kỹ thuật (Assumptions) khi tích hợp với Codex
1. **State & Routing (`src/state.ts`):**
   - Codex bổ sung trường `mapMode: 'latest' | 'scene'` vào `state.ts` và thêm `'overview'` vào kiểu `Tab` (làm tab mặc định khi mở trang).
   - Nút *"Xem độ tin cậy"* điều hướng tới `tab: 'validation'` và `location.hash = 'validation'` (khớp với endpoint `getValidation()` trong `src/data/dataSource.ts`). Nếu tên tab kiểm chứng trong `state.ts` của Codex đặt khác (ví dụ `'accuracy'`), Codex chỉ cần đổi chuỗi `'validation'` tại hàm `openValidation()`.
2. **Bảo toàn `selectedDate` khi mở chế độ `latest`:**
   - Khi click vào một xã hoặc nút *"Xem bản đồ tổng quan"*, `overview.ts` chỉ gọi `set({ tab: 'map', mapMode: 'latest', selectedCommune: p.osm_id, flyNonce: state.flyNonce + 1 })`, **tuyệt đối không ghi đè `selectedDate`** để tránh làm hỏng trạng thái timeline khi người dùng chuyển qua lại giữa chế độ `latest` và `scene`.
3. **Quy tắc phân loại độ phủ (`coverage_sufficient`):**
   - Một xã chỉ được đưa vào 3 nhóm ngưỡng nước (`>= 30%`, `10% – < 30%`, `< 10%`) khi thỏa đồng thời `c.coverage_sufficient === true && c.last_pct !== null && c.last_date !== null`.
   - 3 xã có `last_pct !== null` nhưng `coverage_sufficient !== true` (chỉ phủ một phần $<50\%$) được xếp vào nhóm `insufficient` cùng với 6 xã `last_pct === null`, nhưng trên bảng vẫn hiển thị con số `%` kèm nhãn cảnh báo **"Chỉ phủ một phần (<50%)"** để không làm mất thông tin thực tế của 3 xã này.

#### B. Kế hoạch kiểm thử (Test Plan cho Codex chạy Build & Browser Tests)
1. **Kiểm tra tính toán số liệu runtime (Data Assertions):**
   - Banner hiển thị đúng khoảng ngày `27/10/2026 – 03/11/2026` (hoặc theo format `en`/`vi` của `fmtDate`) và tỷ lệ `131 / 140 xã` đủ độ phủ.
   - 4 thẻ hiển thị đúng số lượng:
     - Card 1 ($\ge 30\%$): `38`
     - Card 2 ($10\% - <30\%$): `40`
     - Card 3 ($<10\%$): `53`
     - Card 4 (Chưa đủ độ phủ $<50\%$): `9` (mô tả bên dưới ghi rõ `6` không có quan trắc, `3` chỉ phủ ít).
2. **Kiểm tra tìm kiếm & bộ lọc (Interactive Filter Tests):**
   - Bấm vào từng Card trong 4 Cards $\rightarrow$ trạng thái `aria-pressed="true"`, dropdown nhóm cập nhật theo và danh sách xã lọc đúng số lượng (`38`, `40`, `53`, `9`). Bấm lại Card đang chọn $\rightarrow$ trở về `Tất cả nhóm (140)`.
   - Gõ `"Son Kien"` (không dấu) vào ô tìm kiếm $\rightarrow$ khớp đúng xã **Sơn Kiên** (`osm_id: 15416586`, `78,2%`, ngày `03/11/2026`, dải bay `148D`).
   - Gõ `"An Long"` $\rightarrow$ khớp đúng xã **An Long** (`osm_id: 15581562`, `51,7%`, ngày `29/10/2026`, dải bay `083A`).
3. **Kiểm tra điều hướng & Accessibility (A11y / Keyboard Tests):**
   - Mặc định hiển thị `12` dòng đầu tiên, bấm nút *"Xem thêm..."* mở rộng toàn bộ danh sách đang lọc.
   - Click chuột hoặc nhấn phím `Enter` / `Space` trên dòng xã **Sơn Kiên** $\rightarrow$ `state.tab === 'map'`, `state.mapMode === 'latest'`, `state.selectedCommune === '15416586'`, `state.flyNonce` tăng `1`, `location.hash === '#map'`, và `state.selectedDate` giữ nguyên không bị đổi.

#### C. Phản biện thiết kế & Điểm cần lưu ý ở Vòng 2
1. **Tránh bẫy nhận thức ở 3 xã "phủ một phần ($<50\%$)"**: Nếu ẩn hoàn toàn `last_pct` của 3 xã này thành `'—'`, cán bộ địa phương sẽ thắc mắc vì sao trên bản đồ raster vẫn thấy một vệt nước ở góc xã mà bảng lại ghi không có dữ liệu; ngược lại nếu xếp chung vào nhóm đủ độ phủ thì sai lệch thống kê cấp xã. Giải pháp hiện tại trong `renderWaterCell()` là vẫn hiện `fmtPct(c.last_pct)` nhưng gắn nhãn vàng `Chỉ phủ một phần (<50%)` và xếp vào nhóm `Chưa đủ độ phủ` — vừa trung thực với ảnh raster vừa an toàn về mặt thống kê.
2. **Đồng bộ trải nghiệm khi nhảy từ Overview sang Map (`latest`)**: Khi người dùng click vào 1 trong 6 xã không có quan trắc (`last_pct === null`) để mở bản đồ, bên phía module bản đồ của Codex cần hiển thị rõ thông báo *"Xã này nằm ngoài dải quét của đợt ảnh hiện tại"* trong panel chi tiết xã để mạch giải thích từ trang Overview sang trang Map hoàn toàn nhất quán.
