// [Gemini, Codex reviewed] Purpose-first commune overview from observed data.
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

  const { minDate, maxDate } = computeDateRange(all.filter(isEvaluated));
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
      activeSummary: null, playing: false,
    });
    location.hash = 'map';
  }

  function openValidation(): void {
    set({
      tab: 'validation',
    });
    location.hash = 'validation';
  }

  function openCommuneOnMap(p: CommuneProps): void {
    set({
      tab: 'map',
      mapMode: 'latest',
      activeSummary: null, playing: false,
      selectedCommune: p.osm_id,
      flyNonce: state.flyNonce + 1,
    });
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
    h('h1', { id: 'ov-main-title', class: 'ov-title', text: T.overview.title }),
    h('p', { class: 'ov-lead', text: T.overview.lead }),
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
          h('span', { class: 'ov-card-title' }, h('i', { class: 'ov-card-dot', 'aria-hidden': 'true' }), def.title),
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
        listSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
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

  root.replaceChildren(heroSection, cardsSection, listSection, h('p', { class: 'note ov-footnote', text: T.overview.cautionBody }), h('details', { class: 'ov-explanation' }, h('summary', { text: T.overview.caveats.title }), guideAndCaveatsSection));

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
          },
          h('td', { class: 'ov-cell-name' }, h('strong', { text: c.name })),
          h('td', { class: 'ov-cell-prov', text: c.province }),
          renderWaterCell(c),
          renderDateCell(c),
          renderCoverageCell(c),
          h('td', { class: 'ov-col-action' }, openBtn),
        );

        tr.addEventListener('click', () => openCommuneOnMap(c));


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
