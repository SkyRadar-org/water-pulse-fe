import {
  Chart,
  Filler,
  Legend,
  LineController,
  LineElement,
  LinearScale,
  PointElement,
  TimeScale,
  Tooltip,
} from 'chart.js';
import 'chartjs-adapter-date-fns';
import { vi } from 'date-fns/locale/vi';
import { lang } from '../i18n.ts';

/** Passed as `options.adapters` so the time axis prints Vietnamese month names. */
export const chartAdapters = lang === 'vi' ? { date: { locale: vi } } : {};
export const MONTH_FORMAT = lang === 'vi' ? "'Th'M" : 'MMM';

Chart.register(LineController, LineElement, PointElement, LinearScale, TimeScale, Tooltip, Legend, Filler);

Chart.defaults.font.family = "system-ui, -apple-system, 'Segoe UI', Roboto, Arial, sans-serif";
Chart.defaults.font.size = 12;
Chart.defaults.color = '#475569';

export { Chart };
