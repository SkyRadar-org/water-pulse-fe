import { en, type Strings } from './locales/en.ts';
import { vi } from './locales/vi.ts';

export type Lang = 'en' | 'vi';
const KEY = 'waterpulse.lang';

function detect(): Lang {
  try {
    const q = new URLSearchParams(location.search).get('lang');
    if (q === 'vi' || q === 'en') return q;
    const saved = localStorage.getItem(KEY);
    if (saved === 'vi' || saved === 'en') return saved;
  } catch {
    /* storage may be blocked; fall back to the browser language */
  }
  return navigator.language?.toLowerCase().startsWith('vi') ? 'vi' : 'en';
}

export const lang: Lang = detect();
export const T: Strings = lang === 'vi' ? vi : en;

document.documentElement.lang = T.htmlLang;
document.title = T.pageTitle;

/** Remember the current selection, switch language and reload (all UI text is built once at start-up). */
export function switchLang(next: Lang, snapshot: Record<string, unknown>): void {
  try {
    localStorage.setItem(KEY, next);
    sessionStorage.setItem('waterpulse.snapshot', JSON.stringify(snapshot));
  } catch {
    /* ignore */
  }
  const url = new URL(location.href);
  url.searchParams.delete('lang');
  if (url.toString() !== location.href) location.assign(url.toString());
  else location.reload();
}
