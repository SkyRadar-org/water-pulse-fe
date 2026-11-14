// Generates all mock data into public/mock from the numbers in docs/KE_HOACH_TRIEN_KHAI_FRONTEND.md (§4.2–4.4, §8).
// Run: node scripts/make-mock.mjs
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PNG } from 'pngjs';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'mock');
rmSync(OUT, { recursive: true, force: true });
for (const d of ['series', 'choropleth', 'water', 'summary']) mkdirSync(join(OUT, d), { recursive: true });

const writeJson = (rel, data) => writeFileSync(join(OUT, rel), JSON.stringify(data));
const round = (v, n = 1) => Math.round(v * 10 ** n) / 10 ** n;
const day = (d) => Date.parse(d + 'T00:00:00Z') / 86400000;

// ---------- Scenes (§4.2) ----------
const AOI = [104.95, 10.25, 106.0, 11.0];
const D_LON = (AOI[2] - AOI[0]) / 640;
const D_LAT = (AOI[3] - AOI[1]) / 456;
const W_FULL = 640;
const H = 456;
const W_148 = 238; // ~37% of the AOI, west side
const BOUNDS_148 = [AOI[0], AOI[1], round(AOI[0] + W_148 * D_LON, 4), AOI[3]];

const TRACK_DATES = {
  '047D': ['06-17', '06-29', '07-11', '07-23', '08-16', '08-28', '09-09', '09-21', '10-03', '10-15', '10-27'],
  '083A': ['06-19', '07-01', '07-13', '07-25', '08-18', '08-30', '09-11', '09-23', '10-05', '10-17', '10-29'],
  '148D': ['10-22', '11-03'],
};
const VALIDATED_FROM = '2026-10-22';

const scenes = [];
for (const [track, dates] of Object.entries(TRACK_DATES)) {
  for (const md of dates) {
    const date = `2026-${md}`;
    scenes.push({
      date,
      track,
      maturity: date >= VALIDATED_FROM ? 'validated' : 'provisional',
      bounds: track === '148D' ? BOUNDS_148 : AOI,
      waterPng: `water/${date}_${track}.png`,
    });
  }
}
scenes.sort((a, b) => a.date.localeCompare(b.date) || a.track.localeCompare(b.track));
const sceneW = (s) => (s.track === '148D' ? W_148 : W_FULL);

// ---------- Region-wide % water (§4.3) ----------
const REGION = {
  '047D': [15.5, 10.2, 6.9, 5.6, 12.2, 27.8, 34.0, 32.3, 36.4, 31.5, 30.6],
  '083A': [15.2, 10.0, 6.8, 5.5, 13.5, 29.0, 37.8, 33.5, 37.0, 32.5, 31.0],
  '148D': [32, 30],
};
const regionPct = (s) => REGION[s.track][TRACK_DATES[s.track].indexOf(s.date.slice(5))];

const NISAR_KM2_047D = [1993, 1459, 1273, 1045, 1296, 2601, 3168, 3151, 3474, 3161, 3102];
const DSWX_KM2_047D = [480, 385, 282, 277, 754, 1312, 1799, 2136, 2083, 1904, 1619];
const area = [];
TRACK_DATES['047D'].forEach((md, i) =>
  area.push({ date: `2026-${md}`, track: '047D', nisar_km2: NISAR_KM2_047D[i], dswx_km2: DSWX_KM2_047D[i] }),
);
const DSWX_RATIO_083A = [3.9, 3.5, 3.2, 3.6, 1.8, 2.1, 1.75, 1.55, 1.7, 1.6, 1.75];
TRACK_DATES['083A'].forEach((md, i) => {
  const nisar = Math.round(REGION['083A'][i] * 94);
  area.push({ date: `2026-${md}`, track: '083A', nisar_km2: nisar, dswx_km2: Math.round(nisar / DSWX_RATIO_083A[i]) });
});
TRACK_DATES['148D'].forEach((md, i) =>
  area.push({ date: `2026-${md}`, track: '148D', nisar_km2: [1130, 1085][i], dswx_km2: null }),
);
area.sort((a, b) => a.date.localeCompare(b.date));

// ---------- Communes (§4.3) ----------
const KEYS = ['06-17', '07-23', '08-16', '08-28', '09-09', '09-21', '10-03', '10-15', '10-22', '10-27', '11-03'];
const SPEC = [
  { id: '9100001', name: 'Sơn Kiên', province: 'An Giang', col: 0, row: 1, curve: [18, 12, 25, 35, 48, 58, 70, 79, 82, 78, 78], peak: ['148D', '2026-10-22', 82], off083: 2, pins: { '148D|2026-11-03': 78 } },
  { id: '9100002', name: 'Mỹ Thuận', province: 'An Giang', col: 0, row: 0, curve: [16, 10, 20, 30, 42, 52, 62, 67, 69, 68, 66], peak: ['148D', '2026-10-22', 69], off083: 1.5, pins: { '148D|2026-11-03': 66 } },
  { id: '9100003', name: 'Hòn Đất', province: 'An Giang', col: 0, row: 2, curve: [15, 8, 15, 24, 33, 42, 50, 54, 56, 57, 58], peak: ['148D', '2026-11-03', 58], off083: 1 },
  { id: '9100004', name: 'Thường Lạc', province: 'Đồng Tháp', col: 1, row: 2, curve: [15, 10, 22, 30, 40, 52, 64, 72, 74, 75, 44], peak: ['047D', '2026-10-27', 75], off083: 1, pins: { '148D|2026-11-03': 44 } },
  { id: '9100005', name: 'Vĩnh Hanh', province: 'An Giang', col: 1, row: 1, curve: [16, 9, 50, 73, 60, 38, 25, 15, 12, 10, 9], peak: ['047D', '2026-08-28', 73], off083: 0.5 },
  { id: '9100006', name: 'Tây Phú', province: 'An Giang', col: 1, row: 0, curve: [14, 8, 48, 73, 62, 42, 30, 20, 16, 15, 14], peak: ['047D', '2026-08-28', 73], off083: -0.5 },
  { id: '9100007', name: 'Vĩnh An', province: 'An Giang', col: 2, row: 0, curve: [15, 9, 46, 72, 64, 48, 36, 27, 23, 21, 20], peak: ['047D', '2026-08-28', 72], off083: 0.5 },
  { id: '9100008', name: 'An Hòa', province: 'Đồng Tháp', col: 4, row: 1, curve: [15, 8, 45, 68, 76, 70, 62, 50, 44, 38, 36], peak: ['047D', '2026-09-09', 76], off083: -0.5 },
  { id: '9100009', name: 'Thới Sơn', province: 'An Giang', col: 2, row: 1, curve: [48, 42, 50, 53, 54, 53, 54, 53, 52, 51, 51], peak: ['047D', '2026-09-09', 54], off083: 0 },
  { id: '9100010', name: 'Hội An', province: 'An Giang', col: 3, row: 2, curve: [6, 4, 5, 6, 7, 8, 8, 7, 6, 6, 5], peak: ['047D', '2026-09-21', 8], off083: 0 },
];

function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function interp(curve, date) {
  const xs = KEYS.map((k) => day('2026-' + k));
  const x = day(date);
  if (x <= xs[0]) return curve[0];
  for (let i = 1; i < xs.length; i++) {
    if (x <= xs[i]) return curve[i - 1] + ((curve[i] - curve[i - 1]) * (x - xs[i - 1])) / (xs[i] - xs[i - 1]);
  }
  return curve[curve.length - 1];
}

function polygonFor(spec) {
  const r = rng(Number(spec.id));
  const x0 = 105.0 + spec.col * 0.19;
  const y0 = 10.35 + spec.row * 0.2;
  const w = 0.1;
  const h = 0.09;
  const j = (s) => (r() - 0.5) * s;
  const pts = [
    [x0 + j(0.01), y0 + j(0.01)],
    [x0 + w / 2 + j(0.012), y0 + j(0.012)],
    [x0 + w + j(0.01), y0 + j(0.01)],
    [x0 + w + j(0.012), y0 + h / 2 + j(0.012)],
    [x0 + w + j(0.01), y0 + h + j(0.01)],
    [x0 + w / 2 + j(0.012), y0 + h + j(0.012)],
    [x0 + j(0.01), y0 + h + j(0.01)],
    [x0 + j(0.012), y0 + h / 2 + j(0.012)],
  ].map(([x, y]) => [round(x, 4), round(y, 4)]);
  pts.push(pts[0]);
  return pts;
}

const KM_PER_DEG_LON = 111.32 * Math.cos((10.6 * Math.PI) / 180);
function ringAreaKm2(ring) {
  let s = 0;
  for (let i = 0; i < ring.length - 1; i++) s += ring[i][0] * ring[i + 1][1] - ring[i + 1][0] * ring[i][1];
  return Math.abs(s / 2) * KM_PER_DEG_LON * 110.57;
}

const inBounds = (ring, b) => ring.every(([x, y]) => x >= b[0] && x <= b[2] && y >= b[1] && y <= b[3]);

const communes = SPEC.map((spec) => {
  const ring = polygonFor(spec);
  const valid = round(ringAreaKm2(ring) * 0.92, 1);
  const r = rng(Number(spec.id) * 7);
  const [pTrack, pDate, pVal] = spec.peak;
  const points = [];
  for (const s of scenes) {
    if (s.track === '148D' && !inBounds(ring, s.bounds)) continue;
    let v = interp(spec.curve, s.date);
    if (s.track === '083A') v += spec.off083;
    if (s.track === '148D') v += (r() - 0.5) * 1.0;
    v += (r() - 0.5) * 1.2;
    v = Math.max(0, Math.min(100, v));
    v = Math.min(v, pVal - 0.4); // keep the pinned peak the unique maximum
    if (s.track === pTrack && s.date === pDate) v = pVal;
    const pin = spec.pins?.[`${s.track}|${s.date}`];
    if (pin !== undefined) v = pin;
    v = round(v, 1);
    points.push({ date: s.date, track: s.track, water_pct: v, water_km2: round((v / 100) * valid, 1), valid_km2: valid });
  }
  return { spec, ring, valid, points };
});

function deriveProps({ spec, valid, points }) {
  const byDate = [...points].sort((a, b) => a.date.localeCompare(b.date) || a.track.localeCompare(b.track));
  const first = byDate.find((p) => p.water_pct >= 20);
  let peak = byDate[0];
  for (const p of byDate) if (p.water_pct > peak.water_pct) peak = p;
  const after = byDate.filter((p) => p.date > peak.date);
  const halfPt = after.find((p) => p.water_pct <= peak.water_pct / 2);
  let recession = null;
  for (let i = 0; i < after.length; i++) {
    if (after.slice(i).every((p) => p.water_pct <= peak.water_pct / 2)) {
      recession = after[i];
      break;
    }
  }
  const last = byDate[byDate.length - 1];
  const lastByTrack = {};
  for (const p of byDate) lastByTrack[p.track] = p.water_pct;
  const lasts = Object.values(lastByTrack);
  let status = 'uncertain';
  if (peak.water_pct < 20) status = 'no_flood';
  else if (lasts.every((v) => v <= peak.water_pct / 2)) status = 'receded';
  else if (lasts.every((v) => v >= 50)) status = 'not_receded';
  return {
    osm_id: spec.id,
    name: spec.name,
    province: spec.province,
    valid_km2: valid,
    first_flood_date: first ? first.date : null,
    peak_pct: peak.water_pct,
    peak_date: peak.date,
    half_date: halfPt ? halfPt.date : null,
    recession_date: recession ? recession.date : null,
    last_pct: last.water_pct,
    last_date: last.date,
    max_flooded_km2: round(Math.max(...points.map((p) => p.water_km2)), 1),
    status,
  };
}

for (const c of communes) c.props = deriveProps(c);

writeJson('communes.geojson', {
  type: 'FeatureCollection',
  features: communes.map((c) => ({ type: 'Feature', properties: c.props, geometry: { type: 'Polygon', coordinates: [c.ring] } })),
});
for (const c of communes) writeJson(`series/${c.spec.id}.json`, c.points);

for (const s of scenes) {
  const ch = {};
  for (const c of communes) {
    const p = c.points.find((q) => q.date === s.date && q.track === s.track);
    if (p) ch[c.spec.id] = p.water_pct;
  }
  writeJson(`choropleth/${s.date}_${s.track}.json`, ch);
}

// ---------- Water + summary PNGs ----------
// Static noise field -> rank-normalised so that "u < pct/100" yields ~pct of the pixels and flood extent grows monotonically.
function hash2(ix, iy, seed) {
  let h = Math.imul(ix, 374761393) ^ Math.imul(iy, 668265263) ^ Math.imul(seed, 2246822519);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
function valueNoise(x, y, seed) {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;
  const sx = fx * fx * (3 - 2 * fx);
  const sy = fy * fy * (3 - 2 * fy);
  const a = hash2(ix, iy, seed);
  const b = hash2(ix + 1, iy, seed);
  const c = hash2(ix, iy + 1, seed);
  const d = hash2(ix + 1, iy + 1, seed);
  return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
}
const N = W_FULL * H;
const lonOf = (px) => AOI[0] + (px + 0.5) * D_LON;
const latOf = (py) => AOI[3] - (py + 0.5) * D_LAT;

const raw = new Float32Array(N);
for (let py = 0; py < H; py++) {
  for (let px = 0; px < W_FULL; px++) {
    const lon = lonOf(px);
    const lat = latOf(py);
    raw[py * W_FULL + px] = 0.55 * valueNoise(lon * 70, lat * 70, 1) + 0.3 * valueNoise(lon * 190, lat * 190, 2) + 0.15 * valueNoise(lon * 520, lat * 520, 3);
  }
}
const order = Array.from({ length: N }, (_, i) => i).sort((a, b) => raw[a] - raw[b]);
const U = new Float32Array(N);
order.forEach((idx, rank) => (U[idx] = rank / N));

// permanent water: two rivers and a few thin canals
const PERM = new Uint8Array(N);
for (let py = 0; py < H; py++) {
  for (let px = 0; px < W_FULL; px++) {
    const lon = lonOf(px);
    const lat = latOf(py);
    const r1 = Math.abs(lat - (10.5 + 0.1 * Math.sin((lon - AOI[0]) * 6 + 0.5))) < 0.0042;
    const r2 = Math.abs(lat - (10.88 + 0.06 * Math.sin((lon - AOI[0]) * 4 + 2))) < 0.003;
    const canal = ((lat - 10.25) % 0.125) < 0.0011 || ((lon - AOI[0]) % 0.19) < 0.0009;
    if (r1 || r2 || (canal && U[py * W_FULL + px] < 0.75)) PERM[py * W_FULL + px] = 1;
  }
}

function pip(x, y, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 2; i < ring.length - 1; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
const COMM = new Int16Array(N).fill(-1);
communes.forEach((c, ci) => {
  const xs = c.ring.map((p) => p[0]);
  const ys = c.ring.map((p) => p[1]);
  const x0 = Math.max(0, Math.floor((Math.min(...xs) - AOI[0]) / D_LON));
  const x1 = Math.min(W_FULL - 1, Math.ceil((Math.max(...xs) - AOI[0]) / D_LON));
  const y0 = Math.max(0, Math.floor((AOI[3] - Math.max(...ys)) / D_LAT));
  const y1 = Math.min(H - 1, Math.ceil((AOI[3] - Math.min(...ys)) / D_LAT));
  for (let py = y0; py <= y1; py++) for (let px = x0; px <= x1; px++) if (pip(lonOf(px), latOf(py), c.ring)) COMM[py * W_FULL + px] = ci;
});

// wet[sceneIndex][pixel]: 0 dry, 1 water, 2 permanent, 255 not covered
const pctByScene = scenes.map((s) => communes.map((c) => c.points.find((p) => p.date === s.date && p.track === s.track)?.water_pct));
const wet = scenes.map((s, si) => {
  const arr = new Uint8Array(N).fill(255);
  const w = sceneW(s);
  const reg = regionPct(s);
  for (let py = 0; py < H; py++) {
    for (let px = 0; px < w; px++) {
      const i = py * W_FULL + px;
      if (PERM[i]) {
        arr[i] = 2;
        continue;
      }
      const ci = COMM[i];
      const pct = ci >= 0 && pctByScene[si][ci] !== undefined ? pctByScene[si][ci] : reg;
      arr[i] = U[i] < pct / 100 ? 1 : 0;
    }
  }
  return arr;
});

function writePng(rel, w, h, fill) {
  const png = new PNG({ width: w, height: h });
  for (let py = 0; py < h; py++) {
    for (let px = 0; px < w; px++) {
      const o = (py * w + px) * 4;
      const c = fill(px, py);
      if (!c) continue;
      png.data[o] = c[0];
      png.data[o + 1] = c[1];
      png.data[o + 2] = c[2];
      png.data[o + 3] = c[3] ?? 255;
    }
  }
  writeFileSync(join(OUT, rel), PNG.sync.write(png));
}

scenes.forEach((s, si) => {
  writePng(s.waterPng, sceneW(s), H, (px, py) => {
    const v = wet[si][py * W_FULL + px];
    if (v === 1) return [29, 78, 216, 235];
    if (v === 2) return [71, 85, 105, 235];
    return null;
  });
});

const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16), 235];
const FLOOD_COLORS = ['#dbeafe', '#93c5fd', '#3b82f6', '#1e3a8a'];
const FIRST_COLORS = ['#fde68a', '#f59e0b', '#be185d', '#4c1d95'];
const REC_COLORS = ['#15803d', '#86efac', '#ea580c', '#dc2626'];

const count = new Uint8Array(N);
const firstBin = new Int8Array(N).fill(-1);
const recBin = new Int8Array(N).fill(-1);
for (let i = 0; i < N; i++) {
  let n = 0;
  let lastWet = -1;
  let lastCovered = -1;
  for (let si = 0; si < scenes.length; si++) {
    const v = wet[si][i];
    if (v === 255) continue;
    lastCovered = si;
    if (v === 1) {
      n++;
      lastWet = si;
      if (firstBin[i] < 0) {
        const d = scenes[si].date;
        firstBin[i] = d < '2026-08-01' ? 0 : d < '2026-09-01' ? 1 : d < '2026-10-01' ? 2 : 3;
      }
    }
  }
  count[i] = n;
  if (lastWet >= 0) {
    if (lastWet === lastCovered) recBin[i] = 3;
    else {
      let nxt = lastWet + 1;
      while (wet[nxt][i] === 255) nxt++;
      const d = scenes[nxt].date;
      recBin[i] = d < '2026-10-01' ? 0 : d < '2026-11-01' ? 1 : 2;
    }
  }
}
const cnt = (n) => (n === 0 ? -1 : n <= 5 ? 0 : n <= 11 ? 1 : n <= 17 ? 2 : 3);
writePng('summary/flood_count.png', W_FULL, H, (px, py) => {
  const b = cnt(count[py * W_FULL + px]);
  return b < 0 ? null : hex(FLOOD_COLORS[b]);
});
writePng('summary/first_flood_date.png', W_FULL, H, (px, py) => {
  const b = firstBin[py * W_FULL + px];
  return b < 0 ? null : hex(FIRST_COLORS[b]);
});
writePng('summary/recession_date.png', W_FULL, H, (px, py) => {
  const b = recBin[py * W_FULL + px];
  return b < 0 ? null : hex(REC_COLORS[b]);
});

writeJson('summary.json', [
  {
    id: 'flood_count',
    title: 'Times flooded',
    png: 'summary/flood_count.png',
    bounds: AOI,
    legend: [
      { color: FLOOD_COLORS[0], label: 'Water in 1–5 images' },
      { color: FLOOD_COLORS[1], label: 'Water in 6–11 images' },
      { color: FLOOD_COLORS[2], label: 'Water in 12–17 images' },
      { color: FLOOD_COLORS[3], label: 'Water in 18+ images' },
    ],
  },
  {
    id: 'first_flood_date',
    title: 'First flooded date',
    png: 'summary/first_flood_date.png',
    bounds: AOI,
    legend: [
      { color: FIRST_COLORS[0], label: 'Before 1 Aug' },
      { color: FIRST_COLORS[1], label: '1–31 Aug' },
      { color: FIRST_COLORS[2], label: 'September' },
      { color: FIRST_COLORS[3], label: 'October or later' },
    ],
  },
  {
    id: 'recession_date',
    title: 'Drained date',
    png: 'summary/recession_date.png',
    bounds: AOI,
    legend: [
      { color: REC_COLORS[0], label: 'Drained before 1 Oct' },
      { color: REC_COLORS[1], label: 'Drained 1–31 Oct' },
      { color: REC_COLORS[2], label: 'Drained after 1 Nov' },
      { color: REC_COLORS[3], label: 'Still water at last image' },
    ],
  },
]);

// ---------- Scenes / area / validation ----------
writeJson('scenes.json', scenes);
writeJson('area.json', area);

const VS_HLS = [
  ['2026-08-16', 0.57, 0.51, 0.47, 0.36, 0.72, 0.87, 53],
  ['2026-09-21', 0.75, 0.69, 0.64, 0.53, 0.91, 0.99, 76],
  ['2026-10-03', 0.78, 0.65, 0.68, 0.48, 0.92, 1.0, 80],
  ['2026-10-05', 0.78, 0.7, 0.67, 0.54, 0.93, 1.0, 80],
  ['2026-10-15', 0.77, 0.7, 0.68, 0.54, 0.89, 1.0, 72],
  ['2026-10-17', 0.86, 0.6, 0.76, 0.43, 0.97, 1.0, 95],
  ['2026-10-27', 0.76, 0.65, 0.68, 0.48, 0.86, 0.99, 67],
  ['2026-10-29', 0.85, 0.75, 0.77, 0.6, 0.95, 1.0, 82],
].map(([date, f1_nisar, f1_s1, recall_nisar, recall_s1, precision_nisar, precision_s1, nisar_only_true_pct]) => ({
  date, f1_nisar, f1_s1, recall_nisar, recall_s1, precision_nisar, precision_s1, nisar_only_true_pct,
}));

// 20 validation dates (22 DSWx-S1 comparable dates minus the 2 calibration dates 17 Jun and 21 Sep, both 047D)
const VS_S1 = [
  ['2026-06-29', '047D', 0.3], ['2026-07-11', '047D', 0.28], ['2026-07-23', '047D', 0.26],
  ['2026-06-19', '083A', 0.33], ['2026-07-01', '083A', 0.31], ['2026-07-13', '083A', 0.29], ['2026-07-25', '083A', 0.36],
  ['2026-08-16', '047D', 0.46], ['2026-08-18', '083A', 0.49], ['2026-08-28', '047D', 0.58], ['2026-08-30', '083A', 0.6],
  ['2026-09-09', '047D', 0.61], ['2026-09-11', '083A', 0.63], ['2026-09-23', '083A', 0.66],
  ['2026-10-03', '047D', 0.72], ['2026-10-05', '083A', 0.7], ['2026-10-15', '047D', 0.65], ['2026-10-17', '083A', 0.72],
  ['2026-10-27', '047D', 0.64], ['2026-10-29', '083A', 0.68],
]
  .map(([date, track, f1]) => ({ date, track, f1 }))
  .sort((a, b) => a.date.localeCompare(b.date));
const sortedF1 = VS_S1.map((r) => r.f1).sort((a, b) => a - b);
const median = (sortedF1[9] + sortedF1[10]) / 2;
if (VS_S1.length !== 20 || Math.abs(median - 0.59) > 0.005) throw new Error(`validation mock inconsistent: n=${VS_S1.length} median=${median}`);

writeJson('validation.json', {
  vsHls: VS_HLS,
  vsDswxS1: VS_S1,
  notes: [
    'HH < −14 dB and HV < −22 dB on 20 m multilooked NISAR GCOV gamma0; patches < 3 ha removed; permanent water (DSWx open water on ≥ 20 of 22 dates) masked out.',
    'Against OPERA DSWx-S1 (threshold calibrated on 17 Jun and 21 Sep, checked on the other 20 dates): median F1 0.59; flood season 0.61–0.72; June–July only 0.26–0.36.',
    'Against independent optical OPERA DSWx-HLS (±2 days, clear-sky pixels only), NISAR recall is 0.47–0.77 vs 0.36–0.60 for Sentinel-1.',
  ],
});

console.log(`mock written to ${OUT}`);
console.log(`scenes=${scenes.length} communes=${communes.length} area=${area.length} f1 median=${median.toFixed(3)}`);
for (const c of communes) {
  const p = c.props;
  console.log(
    `${p.name.padEnd(11)} ${p.province.padEnd(10)} peak ${String(p.peak_pct).padStart(4)}% ${p.peak_date} first ${p.first_flood_date} drained ${p.recession_date ?? 'Not yet'} last ${p.last_pct}% ${p.last_date} -> ${p.status}`,
  );
}
