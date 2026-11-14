import { T } from '../i18n.ts';
import { heroBlock } from './about.ts';
import { h } from './dom.ts';
import { openGuide } from './guide.ts';

const KEY = 'waterpulse.hero.seen';

function seen(): boolean {
  try {
    return localStorage.getItem(KEY) === '1';
  } catch {
    return false;
  }
}

function remember(): void {
  try {
    localStorage.setItem(KEY, '1');
  } catch {
    /* storage can be blocked (private mode); the overlay then simply shows again */
  }
}

/** First-visit overlay with the key message. Closable; remembered in localStorage. */
export function maybeShowHero(): void {
  if (seen() || location.hash === '#about') return;
  const overlay = h('div', { class: 'hero-overlay', role: 'dialog', 'aria-modal': 'true', 'aria-label': T.hero.welcome });
  const close = () => {
    remember();
    overlay.remove();
    document.removeEventListener('keydown', onKey);
  };
  const onKey = (ev: KeyboardEvent) => {
    if (ev.key === 'Escape') close();
  };
  const howTo = h('button', { class: 'link', type: 'button', text: T.hero.howTo });
  howTo.addEventListener('click', () => {
    close();
    openGuide();
  });
  const skip = h('button', { class: 'link', type: 'button', text: T.hero.skip });
  skip.addEventListener('click', close);
  overlay.append(heroBlock(close, h('span', { class: 'hero-links' }, howTo, skip)));
  overlay.addEventListener('pointerdown', (ev) => {
    if (ev.target === overlay) close();
  });
  document.addEventListener('keydown', onKey);
  document.body.append(overlay);
  overlay.querySelector<HTMLElement>('.btn-primary')?.focus();
}
