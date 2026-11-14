import type { Chart as ChartType, Plugin } from 'chart.js';
import type { Maturity, SeriesPoint, SwotPoint, Track } from '../data/types.ts';
import { fmtDate } from '../format.ts';
import { T } from '../i18n.ts';
import { MATURITY_LABEL, SWOT_COLOR, TRACK_COLORS } from '../palette.ts';
import { Chart, chartAdapters, MONTH_FORMAT } from './register.ts';

const TRACKS: Track[] = ['047D', '083A', '148D'];
const SOWING_START = '2026-11-01';
const SOWING_END = '2026-12-31';

export interface CommuneChartHandle {
  setSelectedDate(date: string): void;
  destroy(): void;
}

export function createCommuneChart(
  canvas: HTMLCanvasElement,
  series: SeriesPoint[],
  maturityOf: (date: string, track: Track) => Maturity | undefined,
  selectedDate: string,
  onPick: (date: string, track: Track) => void,
  swot: SwotPoint[] = [],
): CommuneChartHandle {
  let selected = selectedDate;

  // vertical marker for the date on the map + shaded sowing window (Winter-Spring crop, An Giang)
  const overlay: Plugin<'line'> = {
    id: 'overlay',
    beforeDatasetsDraw(chart) {
      const { ctx, chartArea, scales } = chart;
      const x = scales.x;
      const x0 = Math.max(chartArea.left, x.getPixelForValue(Date.parse(SOWING_START)));
      const x1 = Math.min(chartArea.right, x.getPixelForValue(Date.parse(SOWING_END)));
      ctx.save();
      ctx.fillStyle = 'rgba(217,119,6,0.12)';
      ctx.fillRect(x0, chartArea.top, x1 - x0, chartArea.bottom - chartArea.top);
      ctx.fillStyle = '#b45309';
      ctx.font = '600 10px system-ui, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(T.panel.sowing[0], x0 + 3, chartArea.top + 11);
      ctx.fillText(T.panel.sowing[1], x0 + 3, chartArea.top + 22);
      ctx.restore();
    },
    afterDatasetsDraw(chart) {
      const { ctx, chartArea, scales } = chart;
      const px = scales.x.getPixelForValue(Date.parse(selected));
      if (px < chartArea.left || px > chartArea.right) return;
      ctx.save();
      ctx.strokeStyle = '#0f172a';
      ctx.setLineDash([4, 3]);
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(px, chartArea.top);
      ctx.lineTo(px, chartArea.bottom);
      ctx.stroke();
      ctx.restore();
    },
  };

  const datasets = TRACKS.map((t) => {
    const pts = series.filter((p) => p.track === t).sort((a, b) => a.date.localeCompare(b.date));
    const color = TRACK_COLORS[t];
    return {
      label: T.panel.track(t),
      data: pts.map((p) => ({ x: Date.parse(p.date), y: p.water_pct, p })),
      borderColor: color,
      backgroundColor: color,
      borderWidth: 2,
      tension: 0, // straight segments between real acquisitions, no smoothing
      spanGaps: false,
      pointRadius: 4.5,
      pointHoverRadius: 6.5,
      pointBackgroundColor: pts.map((p) => (maturityOf(p.date, p.track) === 'validated' ? color : '#ffffff')),
      pointBorderColor: color,
      pointBorderWidth: 2,
    };
  }).filter((d) => d.data.length > 0);
  // [Claude] SWOT (Ka-band) points for side-by-side comparison; no line, not clickable (no NISAR image behind them).
  const swotData = [...swot].sort((a, b) => a.date.localeCompare(b.date));
  const swotSet = swotData.length ? [{
    label: T.panel.swotLegend,
    data: swotData.map((p) => ({ x: Date.parse(p.date), y: p.water_pct, p: { ...p, track: 'SWOT' } })),
    borderColor: SWOT_COLOR,
    backgroundColor: SWOT_COLOR,
    showLine: false,
    pointStyle: 'rectRot' as const,
    pointRadius: 5,
    pointHoverRadius: 7,
    pointBackgroundColor: SWOT_COLOR,
    pointBorderColor: SWOT_COLOR,
    pointBorderWidth: 1,
  }] : [];

  const chart = new Chart(canvas, {
    type: 'line',
    data: { datasets: [...datasets, ...swotSet] as typeof datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      interaction: { mode: 'nearest', intersect: true },
      parsing: false,
      scales: {
        x: {
          type: 'time',
          adapters: chartAdapters,
          min: Date.parse('2026-06-01'),
          max: Date.parse(SOWING_END),
          time: { unit: 'month', displayFormats: { month: MONTH_FORMAT } },
          grid: { color: '#eef2f7' },
        },
        y: { min: 0, max: 100, ticks: { callback: (v) => `${v}%`, stepSize: 20 }, grid: { color: '#eef2f7' }, title: { display: true, text: T.panel.yAxis } },
      },
      plugins: {
        legend: { position: 'bottom', labels: { usePointStyle: true, boxWidth: 8, boxHeight: 8 } },
        tooltip: {
          callbacks: {
            title: (items) => {
              const p = (items[0].raw as { p: SeriesPoint }).p;
              return `${fmtDate(p.date)} · ${p.track === ('SWOT' as Track) ? T.panel.swotShort : p.track}`;
            },
            label: (item) => {
              const p = (item.raw as { p: SeriesPoint }).p;
              if (p.track === ('SWOT' as Track)) return T.panel.swotTip(p.water_pct, p.water_km2, p.valid_km2);
              const m = maturityOf(p.date, p.track);
              return [T.panel.tipLine(p.water_pct, p.water_km2, p.valid_km2), m ? MATURITY_LABEL(m) : ''];
            },
          },
        },
      },
      onClick: (_e, elements, ch: ChartType) => {
        const el = elements[0];
        if (!el) return;
        const p = (ch.data.datasets[el.datasetIndex].data[el.index] as unknown as { p: SeriesPoint }).p;
        if (p.track === ('SWOT' as Track)) return;
        onPick(p.date, p.track);
      },
      onHover: (e, elements) => {
        const target = e.native?.target as HTMLElement | undefined;
        if (target) target.style.cursor = elements.length ? 'pointer' : 'default';
      },
    },
    plugins: [overlay],
  });

  return {
    setSelectedDate(date) {
      selected = date;
      chart.update('none');
    },
    destroy() {
      chart.destroy();
    },
  };
}
