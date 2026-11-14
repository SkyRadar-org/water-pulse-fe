import type { CommuneProps, CommuneStatus, Maturity } from '../data/types.ts';

const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const areaNote = 'NISAR water area runs ~1.4–1.5× higher than OPERA DSWx-S1; treat absolute km² as indicative.';

export const en = {
  htmlLang: 'en',
  pageTitle: 'SkyRadar · NISAR Water Pulse',
  app: {
    brand: 'NISAR Water Pulse',
    brandBy: 'by SkyRadar',
    demoLong: 'Demo data',
    demoShort: 'Demo',
    demoTip: 'The data shown is synthetic demo data, not NISAR results',
    event: 'NASA Space Apps Hanoi 2026',
    footerData:
      'Data: NASA/JPL/ISRO NISAR (ASF DAAC) · OPERA DSWx-S1 & DSWx-HLS (JPL/PO.DAAC) · NASA GIBS · Basemap © Esri · © OpenStreetMap contributors (ODbL)',
    footerLink: 'Sources & licences',
    guide: 'Guide',
    guideTip: 'How to use this map',
    menu: 'Layers and legend',
    loadError: 'Could not load data.',
    langTip: 'Language',
    sections: 'Sections',
  },
  tabs: { map: 'Map', communes: 'Communes', validation: 'Validation', about: 'About' },
  maturity: { provisional: 'Provisional', validated: 'Validated' } as Record<Maturity, string>,
  status: {
    receded: { long: 'Drained', short: 'Drained', icon: '✓' },
    not_receded: { long: 'Still flooded after 1 Nov — late-sowing risk', short: 'Still flooded', icon: '!' },
    uncertain: { long: 'Mixed signal', short: 'Mixed signal', icon: '?' },
    no_flood: { long: 'No significant flooding', short: 'No flooding', icon: '–' },
  } as Record<CommuneStatus, { long: string; short: string; icon: string }>,
  months,
  date: (y: number, m: number, d: number): string => `${String(d).padStart(2, '0')} ${months[m - 1]} ${y}`,
  dateShort: (m: number, d: number): string => `${String(d).padStart(2, '0')} ${months[m - 1]}`,
  areaNote,
  country: 'CAMBODIA',

  sidebar: {
    find: 'Find a commune',
    findPlaceholder: 'Type a commune name…',
    findNone: 'No commune with that name',
    layers: 'Map layers',
    opacity: 'Opacity',
    rows: {
      radar: { label: 'Radar image (NISAR)', hint: 'Satellite radar picture from NASA' },
      water: { label: 'Water detected', hint: 'Where our NISAR analysis finds water' },
      communes: { label: 'Communes', hint: 'Colour = share of land under water' },
      provinces: { label: 'Provinces', hint: 'Boundaries and names' },
      basemap: { label: 'Base map', hint: '© Esri · © OpenStreetMap contributors' },
    },
    summary: {
      title: 'Whole-season summary',
      hint: 'See the entire flood season on one map instead of one date at a time.',
      off: 'Off — follow the time slider',
      layers: {
        flood_count: { title: 'How many times flooded', legend: ['Water in 1–5 images', 'Water in 6–11 images', 'Water in 12–17 images', 'Water in 18+ images'] },
        first_flood_date: { title: 'When flooding started', legend: ['Before 1 Aug', '1–31 Aug', 'September', 'October or later'] },
        recession_date: { title: 'When water drained', legend: ['Drained before 1 Oct', 'Drained 1–31 Oct', 'Drained after 1 Nov', 'Still water at last image'] },
      } as Record<string, { title: string; legend: string[] }>,
    },
    legend: {
      title: 'Legend',
      share: 'Commune: % of land under water',
      noData: 'No data for this image',
      waterMap: 'Water detected',
      open: 'Flooded field / open water',
      perm: 'Permanent water (rivers, canals)',
      statusNote: 'Status labels: ✓ drained · ! still flooded after 1 Nov · ? mixed signal · – no significant flooding.',
    },
  },

  map: {
    fitTip: 'Zoom to study area',
    radarMissing: 'Radar preview may be missing for this date',
    hint: 'Click a commune on the map to see its details',
    tip: (name: string, pct: number | undefined): string => `${name} · ${pct === undefined ? 'no data for this image' : `${Math.round(pct)}% water`}`,
  },

  timeline: {
    play: 'Play time series',
    pause: 'Pause',
    trackLabel: (t: string): string => `Track ${t}`,
    trackGroup: 'Satellite track',
    trackHelp: 'A track is one repeating orbit of the satellite. Each track passes over the area on different dates.',
    all: 'All tracks',
    daysAfter: (n: number): string => `${n} day${n === 1 ? '' : 's'} after the previous image (same track)`,
    firstImage: 'First image of this track',
    imageOf: (i: number, n: number): string => `Image ${i} of ${n}`,
    gap: (n: number): string => `${n} days without an image`,
    sowing: '1 Nov · winter-spring sowing opens',
    validated: 'Validated',
    provisional: 'Provisional',
    note: 'Each dot is a day the satellite took a picture. Click a dot or press ▶ to watch the flood change over the season.',
    summaryNote: 'Showing the whole-season summary — the time slider is paused',
    collapse: 'Collapse / expand',
    dotLabel: (date: string, track: string, m: string): string => `${date}, track ${track}, ${m}`,
    region: 'Time slider',
  },

  panel: {
    region: 'Commune details',
    close: 'Close commune panel',
    loading: 'Loading commune…',
    download: 'Download CSV',
    first: 'First flooded',
    firstHint: '20% of land or more under water',
    peak: 'Peak',
    drained: 'Water drained',
    notYet: 'Not yet',
    asOfLast: 'as of the last image',
    belowHalf: 'fell below half of the peak',
    last: 'Last image',
    chartAria: (name: string): string => `Water percentage over time for ${name}`,
    yAxis: 'Water, % of land',
    sowing: ['Sowing', 'window'],
    tipLine: (pct: number, km2: number, valid: number): string => `${pct}% water · ${km2} km² of ${valid} km²`,
    track: (t: string): string => `Track ${t}`,
    summary: (p: CommuneProps, f: { first: string; peak: string; last: string; rec: string; recBeforeSowing: boolean }): string => {
      if (p.status === 'no_flood') return `${p.name} had no significant flooding this season (highest ${p.peak_pct}% of land under water, on ${f.peak}).`;
      let s = `${p.name} first passed 20% under water on ${f.first}, peaked at ${p.peak_pct}% on ${f.peak}, and at the last image (${f.last}) it stood at ${p.last_pct}%. `;
      if (p.status === 'not_receded') s += 'Water had not fallen below half of its peak, so winter-spring sowing here may be late.';
      else if (p.status === 'receded') s += f.recBeforeSowing ? `Water fell below half of its peak around ${f.rec}, before the 1 Nov sowing window.` : `Water fell below half of its peak around ${f.rec}, after the 1 Nov sowing window opened.`;
      else s += 'Images from different satellite tracks disagree, so the situation is not clear yet.';
      return s;
    },
    note: (km2: number, valid: number): string =>
      `Peak flooded area ≈ ${km2} km² of ${valid} km² of land. ${areaNote} Shaded band: Đông Xuân (winter-spring) sowing window, 1 Nov – 31 Dec, An Giang. Filled dots are validated images, hollow dots provisional; click a dot to jump to that image.`,
  },

  table: {
    title: 'Communes',
    lead: 'Every commune in the study area: when it flooded, when it peaked, and whether the water had drained before the 1 Nov winter-spring sowing window. Click a row to see it on the map.',
    search: 'Search commune…',
    searchAria: 'Search commune by name',
    provinceAria: 'Filter by province',
    statusAria: 'Filter by status',
    allProvinces: 'All provinces',
    allStatuses: 'All statuses',
    count: (n: number, total: number): string => `${n} of ${total} communes`,
    export: 'Export CSV',
    cols: { name: 'Commune', province: 'Province', peak_pct: 'Peak %', peak_date: 'Peak date', first_flood_date: 'First flooded', recession_date: 'Drained', last_pct: 'Last %', status: 'Status' },
    notYet: 'Not yet',
    empty: 'No commune matches these filters.',
    row: (name: string, status: string): string => `${name}, ${status}. Open on map`,
    loading: 'Loading communes…',
  },

  validation: {
    title: 'How reliable is this? (Validation & limits)',
    lead: 'What we checked the water maps against, and where they are weak.',
    plainTitle: 'In plain words',
    plain: [
      'The water maps find most of the water that independent optical (cloud-free) maps find: 64–77% for NISAR against 43–60% for Sentinel-1, on the clear-sky days that can be compared.',
      'NISAR sees water on the surface of the fields even through clouds, but it cannot say whether the flood is natural, a controlled release, or pumping for land preparation.',
      'Use the maps to compare communes and dates. Treat square-kilometre figures as indicative only.',
      'This is not an early-warning tool: data arrive 2–3 days after each satellite pass.',
    ],
    detailsTitle: 'Technical details',
    areaTitle: 'Water area per image',
    areaAria: 'Water area per image, NISAR versus DSWx-S1',
    areaNote: (n: string): string => `Solid = NISAR (this app), dashed = OPERA DSWx-S1. Filled dots are validated images (22 Oct onward), hollow dots provisional. Each track is its own line. ${n}`,
    areaAxis: 'Water area, km²',
    track148: '(west ~37% of the area)',
    hlsTitle: 'NISAR vs Sentinel-1 against independent optical maps (DSWx-HLS)',
    hlsNote: 'OPERA DSWx-HLS, ±2 days, clear-sky pixels only. Bold = better of the two. NISAR finds more of the water (recall); Sentinel-1 is slightly more conservative (precision). F1 combines both.',
    hlsCols: { date: 'Date', f1: 'F1', recall: 'Recall', precision: 'Precision', only: 'NISAR-only pixels that are water' },
    agreeTitle: 'Agreement with OPERA DSWx-S1',
    kpiMedian: 'Median F1 (20 dates)',
    kpiFlood: 'Flood season (Sep–Oct)',
    kpiEarly: 'June–July',
    f1Aria: 'F1 score of NISAR water versus DSWx-S1 per image',
    f1Axis: 'F1 vs DSWx-S1',
    f1Foot: 'Threshold calibrated on 17 Jun and 21 Sep; the other 20 dates are held-out checks.',
    f1Track: (t: string): string => `Track ${t}`,
    methodTitle: 'Method',
    limitsTitle: 'Limits',
    droppedTitle: 'What we tried and dropped',
    dropped: ['Flooded-vegetation layer (F1 ≈ 0.02): growing rice also brightens HH, so it cannot be separated from flooded rice.'],
    sourcesTitle: 'Data sources & licences',
    loading: 'Loading validation…',
  },

  about: {
    answersTitle: 'What the app answers',
    answersLead: 'For every commune of the Long Xuyên Quadrangle and the Plain of Reeds (An Giang, Đồng Tháp), across 22 NISAR passes from 17 Jun to 29 Oct 2026 plus a 3 Nov image:',
    readTitle: 'How to read the map',
    read: [
      'The time slider only offers dates with a real NISAR image; nothing is interpolated between them.',
      'Three satellite tracks (047D, 083A, 148D) are never merged: charts draw one line per track.',
      'Images before 22 Oct 2026 are Provisional (hollow dots); from 22 Oct they are Validated (filled dots).',
      'Square kilometres are indicative: NISAR water area runs ~1.4–1.5× higher than OPERA DSWx-S1.',
    ],
    readMore: ['Limits and the method behind the water map are on the ', 'Validation', ' tab.'],
    limitsTitle: 'Known limits',
    sourcesTitle: 'Data sources & licences',
    teamTitle: 'Team & tools',
    team: 'Built by the SkyRadar team for NASA Space Apps Challenge Hanoi 2026, challenge "Dancing with the SARs". Frontend: Thành Đông · Data and backend: Duy Chí · Testing and review: Trịnh Đạt.',
  },

  hero: {
    explore: 'Explore the map',
    howTo: 'How to use it',
    skip: 'Skip',
    welcome: 'Welcome',
  },

  guide: {
    title: 'How to use this map in 3 steps',
    steps: [
      { t: 'Choose a date', d: 'Click a dot on the time bar at the bottom, or press ▶ to watch the flood change through the season.' },
      { t: 'Click a commune', d: 'Click a commune on the map, or type its name in "Find a commune", to see its details.' },
      { t: 'Read the result', d: 'The darker the blue, the more of the commune is under water. A red label "Still flooded after 1 Nov" means sowing may be late.' },
    ],
    tip: 'Tip: use the Layers panel to switch layers, and "Whole-season summary" to see the entire season on one map.',
    close: 'Got it',
  },

  content: {
    tagline: 'L-band radar sees flooded rice fields through clouds — commune by commune, all season long.',
    positioning: "Complements Vietnam's rapid flood mapping by tracking the whole flood season with NISAR L-band, updated 2–3 days after each overpass.",
    heroNumbers: [
      { big: 'Low-flood year', text: '2026 was a low-flood year in the Mekong Delta.' },
      { big: '50 of 80', text: 'heavily flooded communes had not drained halfway by 29 Oct, just before the 1 Nov sowing window.' },
      { big: '64–77% vs 43–60%', text: 'Against independent optical maps, NISAR detected 64–77% of water vs 43–60% for Sentinel-1.' },
    ],
    questions: [
      { q: 'Since when is it flooded?', a: 'First date a commune reaches 20% of its land under water.' },
      { q: 'When was the peak?', a: 'The highest share of land under water, and the day it happened.' },
      { q: 'Did it drain before sowing?', a: 'Whether water fell below half of the peak before the winter-spring sowing window opens on 1 Nov.' },
    ],
    limits: [
      'Threshold calibrated against OPERA DSWx-S1 (C-band), which is not ground truth.',
      '20 of 22 acquisitions are PROVISIONAL products.',
      'NISAR detects water on the field surface; it cannot tell natural flood, controlled flood release, or pumping for land preparation apart.',
      'Flooded-vegetation layer was tested and dropped (F1 ≈ 0.02): growing rice also brightens HH.',
      'June–July agreement is weak (F1 ≈ 0.3) due to wet, freshly prepared paddies.',
      'Not an early-warning tool: data arrive 2–3 days after each overpass, every 3–6 days per location.',
    ],
    method:
      'Water = HH < −14 dB and HV < −22 dB on 20 m multilooked NISAR GCOV gamma0; patches < 3 ha are removed; permanent water (DSWx open water on ≥ 20 of 22 dates) is masked out.',
    sources: [
      { name: 'NISAR', text: 'NASA/JPL/ISRO L-band SAR, distributed by ASF DAAC (GCOV products).', href: 'https://asf.alaska.edu/' },
      { name: 'OPERA DSWx-S1 and DSWx-HLS', text: 'Dynamic Surface Water Extent, JPL / PO.DAAC — used for calibration and independent validation.', href: 'https://podaac.jpl.nasa.gov/' },
      { name: 'NASA GIBS', text: 'Global Imagery Browse Services — NISAR radar preview tiles.', href: 'https://earthdata.nasa.gov/gibs' },
      { name: 'Basemap', text: '© Esri, HERE, Garmin, © OpenStreetMap contributors (ODbL).', href: 'https://www.openstreetmap.org/copyright' },
      { name: 'Boundaries', text: 'Province and national boundaries, Hoàng Sa and Trường Sa labels from SkyRadar (skyradar-web).', href: undefined as string | undefined },
    ],
  },
};

export type Strings = typeof en;
