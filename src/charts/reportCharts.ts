import type { Plugin } from 'chart.js';
import { DURATION_BINS, type MonthStat, type ProvinceStat, type Report, type SceneStat, type Trend } from '../data/reportStats.ts';
import type { Track } from '../data/types.ts';
import { TRACK_COLORS } from '../palette.ts';
import { toMs } from '../format.ts';
import { fmtNum, fmtShort } from '../format.ts';
import { lang, T } from '../i18n.ts';
import { Chart, chartAdapters, MONTH_FORMAT } from './register.ts';

export const REPORT_COLORS = {
  high: '#dc2626',
  medium: '#d97706',
  low: '#15803d',
  missing: '#e2e8f0',
  onset: '#1d4ed8',
  peak: '#0f2a4a',
  recession: '#0d9488',
  done: '#15803d',
  ongoing: '#1d4ed8',
} as const;

const GRID = '#eef2f7';
const MONTH_LABEL = new Intl.DateTimeFormat(lang === 'vi' ? 'vi-VN' : 'en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' });
export const monthLabel = (ym: string): string => {
  const s = MONTH_LABEL.format(new Date(`${ym}-01T00:00:00Z`));
  return s.charAt(0).toUpperCase() + s.slice(1);
};
/** Month name without the year, for sentences: "tháng 9" / "September". */
export const monthName = (ym: string): string =>
  lang === 'vi' ? `tháng ${Number(ym.slice(5, 7))}` : new Intl.DateTimeFormat('en-GB', { month: 'long', timeZone: 'UTC' }).format(new Date(`${ym}-01T00:00:00Z`));
/** Compact axis label: "Th8" / "Aug". */
export const monthShort = (ym: string): string => (lang === 'vi' ? `Th${Number(ym.slice(5, 7))}` : T.months[Number(ym.slice(5, 7)) - 1]);

const legend = { position: 'bottom' as const, labels: { usePointStyle: true, pointStyle: 'rectRounded' as const, boxWidth: 10, boxHeight: 10, padding: 14 } };

/** Paint the canvas white so downloaded PNGs are not transparent. */
const whiteBg: Plugin<'bar'> = {
  id: 'rpWhiteBg',
  beforeDraw: (chart) => {
    const { ctx, width, height } = chart;
    ctx.save();
    ctx.globalCompositeOperation = 'destination-over';
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);
    ctx.restore();
  },
};

export function createSceneChart(canvas: HTMLCanvasElement, scenes: SceneStat[], onPick: (s: SceneStat) => void): Chart<'bar'> {
  const R = T.reports;
  const labels = scenes.map((s) => [fmtShort(s.date), s.track]);
  const series = [
    { key: 'high', label: R.seriesHigh, color: REPORT_COLORS.high },
    { key: 'medium', label: R.seriesMedium, color: REPORT_COLORS.medium },
    { key: 'low', label: R.seriesLow, color: REPORT_COLORS.low },
    { key: 'missing', label: R.seriesMissing, color: REPORT_COLORS.missing },
  ] as const;
  return new Chart(canvas, {
      type: 'bar',
    plugins: [whiteBg],
      data: {
        labels,
        datasets: series.map((s) => ({
          label: s.label,
          data: scenes.map((sc) => sc[s.key]),
          backgroundColor: s.color,
          borderColor: '#fff',
          borderWidth: { top: 1 },
          borderSkipped: false,
          maxBarThickness: 34,
        })),
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        interaction: { mode: 'index', intersect: false },
        onClick: (_ev, els) => {
          if (els.length) onPick(scenes[els[0].index]);
        },
        onHover: (ev, els) => {
          const t = ev.native?.target as HTMLElement | undefined;
          if (t) t.style.cursor = els.length ? 'pointer' : 'default';
        },
        scales: {
          x: { stacked: true, grid: { display: false }, ticks: { autoSkip: true, maxRotation: 0, font: { size: 11 } } },
          y: { stacked: true, beginAtZero: true, grid: { color: GRID }, ticks: { precision: 0 } },
        },
        plugins: {
          legend,
          tooltip: {
            callbacks: {
              title: (items) => {
                const s = scenes[items[0].dataIndex];
                return R.sceneLabel(fmtShort(s.date), s.track);
              },
              label: (i) => `${i.dataset.label}: ${fmtNum(i.parsed.y ?? 0)}`,
              footer: () => R.openScene,
            },
          },
        },
      },
  });
}

export function createMonthChart(canvas: HTMLCanvasElement, months: MonthStat[], label: (ym: string) => string): Chart<'bar'> {
  const R = T.reports;
  const series = [
    { key: 'onset', label: R.seriesOnset, color: REPORT_COLORS.onset },
    { key: 'peak', label: R.seriesPeak, color: REPORT_COLORS.peak },
    { key: 'recession', label: R.seriesRecession, color: REPORT_COLORS.recession },
  ] as const;
  return new Chart(canvas, {
    type: 'bar',
    plugins: [whiteBg],
    data: {
      labels: months.map((m) => label(m.month)),
      datasets: series.map((s) => ({ label: s.label, data: months.map((m) => m[s.key]), backgroundColor: s.color, borderRadius: 3, maxBarThickness: 28 })),
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      interaction: { mode: 'index', intersect: false },
      scales: {
        x: { grid: { display: false } },
        y: { beginAtZero: true, grid: { color: GRID }, ticks: { precision: 0 } },
      },
      plugins: { legend, tooltip: { callbacks: { label: (i) => `${i.dataset.label}: ${fmtNum(i.parsed.y ?? 0)}` } } },
    },
  });
}

export function createDurationChart(canvas: HTMLCanvasElement, duration: Report['duration']): Chart<'bar'> {
  const R = T.reports;
  return new Chart(canvas, {
    type: 'bar',
    plugins: [whiteBg],
    data: {
      labels: DURATION_BINS.map((b) => R.durationBins[b]),
      datasets: [
        { label: R.seriesDone, data: DURATION_BINS.map((b) => duration[b].done), backgroundColor: REPORT_COLORS.done, maxBarThickness: 48 },
        { label: R.seriesOngoing, data: DURATION_BINS.map((b) => duration[b].ongoing), backgroundColor: REPORT_COLORS.ongoing, maxBarThickness: 48 },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      interaction: { mode: 'index', intersect: false },
      scales: {
        x: { stacked: true, grid: { display: false } },
        y: { stacked: true, beginAtZero: true, grid: { color: GRID }, ticks: { precision: 0 } },
      },
      plugins: { legend, tooltip: { callbacks: { label: (i) => `${i.dataset.label}: ${fmtNum(i.parsed.y ?? 0)}` } } },
    },
  });
}

export function createProvinceChart(canvas: HTMLCanvasElement, provinces: ProvinceStat[]): Chart<'bar'> {
  const R = T.reports;
  const series = [
    { key: 'high', label: R.seriesHigh, color: REPORT_COLORS.high },
    { key: 'medium', label: R.seriesMedium, color: REPORT_COLORS.medium },
    { key: 'low', label: R.seriesLow, color: REPORT_COLORS.low },
    { key: 'noObs', label: R.seriesNoObs, color: REPORT_COLORS.missing },
  ] as const;
  const share = (p: ProvinceStat, k: (typeof series)[number]['key']) => (p.communes ? (p[k] / p.communes) * 100 : 0);
  return new Chart(canvas, {
    type: 'bar',
    plugins: [whiteBg],
    data: {
      labels: provinces.map((p) => p.province),
      datasets: series.map((s) => ({
        label: s.label,
        data: provinces.map((p) => share(p, s.key)),
        backgroundColor: s.color,
        borderColor: '#fff',
        borderWidth: { right: 1 },
        borderSkipped: false,
        maxBarThickness: 26,
      })),
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      interaction: { mode: 'index', intersect: false, axis: 'y' },
      scales: {
        x: { stacked: true, min: 0, max: 100, grid: { color: GRID }, ticks: { callback: (v) => `${v}%` } },
        y: { stacked: true, grid: { display: false } },
      },
      plugins: {
        legend,
        tooltip: {
          callbacks: {
            label: (i) => {
              const p = provinces[i.dataIndex];
              const k = series[i.datasetIndex].key;
              return `${i.dataset.label}: ${fmtNum(p[k])} (${fmtNum(Math.round(share(p, k)))}%)`;
            },
          },
        },
      },
    },
  });
}

/** Shades "water rising" before the peak and "water receding" after it, with a dashed peak marker. */
function phaseBands(peakDate: string, labels: { rise: string; fall: string; peak: string }): Plugin<'line'> {
  return {
    id: 'rpPhaseBands',
    beforeDatasetsDraw: (chart) => {
      const { ctx, chartArea: a, scales } = chart;
      const x = scales.x.getPixelForValue(toMs(peakDate));
      if (!Number.isFinite(x)) return;
      ctx.save();
      ctx.fillStyle = 'rgba(37, 99, 235, 0.06)';
      ctx.fillRect(a.left, a.top, Math.max(0, x - a.left), a.bottom - a.top);
      ctx.fillStyle = 'rgba(13, 148, 136, 0.07)';
      ctx.fillRect(x, a.top, Math.max(0, a.right - x), a.bottom - a.top);
      ctx.strokeStyle = '#0f2a4a';
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(x, a.top);
      ctx.lineTo(x, a.bottom);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.font = '600 12px system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif';
      ctx.textBaseline = 'top';
      ctx.fillStyle = '#1d4ed8';
      ctx.textAlign = 'left';
      if (x - a.left > 90) ctx.fillText(labels.rise, a.left + 8, a.top + 6);
      ctx.fillStyle = '#0f766e';
      ctx.textAlign = 'right';
      if (a.right - x > 90) ctx.fillText(labels.fall, a.right - 8, a.top + 6);
      ctx.fillStyle = '#0f2a4a';
      ctx.textAlign = x > a.right - 60 ? 'right' : 'left';
      ctx.fillText(labels.peak, x + (x > a.right - 60 ? -6 : 6), a.top + 24);
      ctx.restore();
    },
  };
}

/** One smooth line per orbit: share of observed communes that still had a lot of water. Orbits are never merged. */
export function createTrendChart(canvas: HTMLCanvasElement, trend: Trend, onPick: (date: string, track: SceneStat['track']) => void): Chart<'line'> {
  const R = T.reports;
  const tracks = (['047D', '083A', '148D'] as Track[]).filter((t) => trend.points.some((p) => p.track === t));
  const plugins: Plugin<'line'>[] = [whiteBg as unknown as Plugin<'line'>];
  if (trend.peak) plugins.push(phaseBands(trend.peak.date, { rise: R.trendRise, fall: R.trendFall, peak: R.trendPeakMark(fmtShort(trend.peak.date)) }));
  const datasets = tracks.map((t) => {
    const pts = trend.points.filter((p) => p.track === t);
    return {
      label: R.trackOption(t),
      data: pts.map((p) => ({ x: toMs(p.date), y: Math.round(p.share * 10) / 10 })),
      borderColor: TRACK_COLORS[t],
      backgroundColor: TRACK_COLORS[t],
      borderWidth: 3,
      tension: 0.35,
      pointRadius: 3.5,
      pointHoverRadius: 6,
      spanGaps: true,
      _pts: pts,
    };
  });
  return new Chart(canvas, {
    type: 'line',
    plugins,
    data: { datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      interaction: { mode: 'nearest', intersect: false },
      onClick: (_ev, els) => {
        if (!els.length) return;
        const p = (datasets[els[0].datasetIndex]._pts)[els[0].index];
        onPick(p.date, p.track);
      },
      onHover: (ev, els) => {
        const t = ev.native?.target as HTMLElement | undefined;
        if (t) t.style.cursor = els.length ? 'pointer' : 'default';
      },
      scales: {
        x: { type: 'time', adapters: chartAdapters, time: { unit: 'month', displayFormats: { month: MONTH_FORMAT } }, grid: { display: false } },
        y: { min: 0, max: 100, grid: { color: GRID }, ticks: { stepSize: 25, callback: (v) => `${v}%` }, title: { display: true, text: R.trendAxis } },
      },
      plugins: {
        legend,
        tooltip: {
          callbacks: {
            title: (items) => {
              const p = datasets[items[0].datasetIndex]._pts[items[0].dataIndex];
              return R.sceneLabel(fmtShort(p.date), p.track);
            },
            label: (i) => {
              const p = datasets[i.datasetIndex]._pts[i.dataIndex];
              return R.trendTip(fmtNum(Math.round(p.share)), p.high, p.observed);
            },
            footer: () => R.openScene,
          },
        },
      },
    },
  });
}
