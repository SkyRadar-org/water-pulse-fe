import type { ChartDataset } from 'chart.js';
import type { AreaPoint, Scene, Track, Validation } from '../data/types.ts';
import { fmt2, fmtDate, fmtNum } from '../format.ts';
import { T } from '../i18n.ts';
import { TRACK_COLORS } from '../palette.ts';
import { Chart, chartAdapters, MONTH_FORMAT } from './register.ts';

const TRACKS: Track[] = ['047D', '083A', '148D'];

type AreaDatum = { x: number; y: number; p: AreaPoint };
type F1Datum = { x: number; y: number; r: { date: string } };

export function createAreaChart(canvas: HTMLCanvasElement, area: AreaPoint[], scenes: Scene[]) {
  const validated = (date: string, track: Track) => scenes.find((s) => s.date === date && s.track === track)?.maturity === 'validated';
  const datasets: ChartDataset<'line', AreaDatum[]>[] = [];

  for (const t of TRACKS) {
    const pts = area.filter((p) => p.track === t).sort((a, b) => a.date.localeCompare(b.date));
    if (!pts.length) continue;
    const color = TRACK_COLORS[t];
    datasets.push({
      label: `NISAR ${t}${t === '148D' ? ` ${T.validation.track148}` : ''}`,
      data: pts.map((p) => ({ x: Date.parse(p.date), y: p.nisar_km2, p })),
      borderColor: color,
      backgroundColor: color,
      borderWidth: 2.2,
      tension: 0,
      pointRadius: 4,
      pointBackgroundColor: pts.map((p) => (validated(p.date, t) ? color : '#fff')),
      pointBorderColor: color,
      pointBorderWidth: 2,
    });
  }
  for (const t of TRACKS) {
    const pts = area.filter((p) => p.track === t && p.dswx_km2 !== null).sort((a, b) => a.date.localeCompare(b.date));
    if (!pts.length) continue;
    const color = TRACK_COLORS[t];
    datasets.push({
      label: `DSWx-S1 ${t}`,
      data: pts.map((p) => ({ x: Date.parse(p.date), y: p.dswx_km2 as number, p })),
      borderColor: color,
      backgroundColor: color,
      borderDash: [6, 4],
      borderWidth: 1.6,
      tension: 0,
      pointRadius: 2.5,
      pointStyle: 'rect',
      pointBackgroundColor: color,
    });
  }

  return new Chart(canvas, {
    type: 'line',
    data: { datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      parsing: false,
      interaction: { mode: 'nearest', intersect: true },
      scales: {
        x: { type: 'time', adapters: chartAdapters, time: { unit: 'month', displayFormats: { month: MONTH_FORMAT } }, min: Date.parse('2026-06-10'), max: Date.parse('2026-11-10'), grid: { color: '#eef2f7' } },
        y: { beginAtZero: true, title: { display: true, text: T.validation.areaAxis }, grid: { color: '#eef2f7' } },
      },
      plugins: {
        legend: { position: 'bottom', labels: { usePointStyle: true, boxWidth: 8, boxHeight: 8 } },
        tooltip: {
          callbacks: {
            title: (items) => fmtDate((items[0].raw as { p: AreaPoint }).p.date),
            label: (item) => `${item.dataset.label}: ${fmtNum(Math.round(item.parsed.y ?? 0))} km²`,
          },
        },
      },
    },
  });
}

export function createF1Chart(canvas: HTMLCanvasElement, v: Validation) {
  const datasets: ChartDataset<'line', F1Datum[]>[] = (['047D', '083A'] as Track[]).map((t) => ({
    label: T.validation.f1Track(t),
    data: v.vsDswxS1.filter((r) => r.track === t).map((r) => ({ x: Date.parse(r.date), y: r.f1, r })),
    borderColor: TRACK_COLORS[t],
    backgroundColor: TRACK_COLORS[t],
    borderWidth: 2,
    tension: 0,
    pointRadius: 4,
  }));
  return new Chart(canvas, {
    type: 'line',
    data: { datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      parsing: false,
      scales: {
        x: { type: 'time', adapters: chartAdapters, time: { unit: 'month', displayFormats: { month: MONTH_FORMAT } }, min: Date.parse('2026-06-10'), max: Date.parse('2026-11-10'), grid: { color: '#eef2f7' } },
        y: { min: 0, max: 1, title: { display: true, text: T.validation.f1Axis }, grid: { color: '#eef2f7' } },
      },
      plugins: {
        legend: { position: 'bottom', labels: { usePointStyle: true, boxWidth: 8, boxHeight: 8 } },
        tooltip: { callbacks: { title: (items) => fmtDate((items[0].raw as { r: { date: string } }).r.date), label: (i) => `${i.dataset.label}: F1 ${fmt2(i.parsed.y ?? 0)}` } },
      },
    },
  });
}
