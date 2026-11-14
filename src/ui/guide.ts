import { T } from '../i18n.ts';
import { h } from './dom.ts';

/** Three-step "how to use" dialog, opened from the header Guide button and from the welcome overlay. */
export function openGuide(): void {
  if (document.querySelector('.guide-overlay')) return;
  const G = T.guide;
  const overlay = h('div', { class: 'hero-overlay guide-overlay', role: 'dialog', 'aria-modal': 'true', 'aria-label': G.title });
  const close = () => {
    overlay.remove();
    document.removeEventListener('keydown', onKey);
  };
  const onKey = (ev: KeyboardEvent) => {
    if (ev.key === 'Escape') close();
  };
  const ok = h('button', { class: 'btn-primary solid', type: 'button', text: G.close });
  ok.addEventListener('click', close);

  overlay.append(
    h(
      'section',
      { class: 'guide-card' },
      h('h2', { text: G.title }),
      h('ol', { class: 'guide-steps' }, ...G.steps.map((s, i) => h('li', {}, h('span', { class: 'guide-n', text: String(i + 1) }), h('div', {}, h('b', { text: s.t }), h('p', { text: s.d }))))),
      h('p', { class: 'note', text: G.tip }),
      h('div', { class: 'hero-actions' }, ok),
    ),
  );
  overlay.addEventListener('pointerdown', (ev) => {
    if (ev.target === overlay) close();
  });
  document.addEventListener('keydown', onKey);
  document.body.append(overlay);
  ok.focus();
}
