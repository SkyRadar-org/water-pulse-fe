import { T } from '../i18n.ts';
import { h } from './dom.ts';
import { getCommunes, getScenes, getValidation } from '../data/dataSource.ts';
import type { Scene } from '../data/types.ts';
import { hasAssessment } from '../data/observations.ts';
import { validationStats } from '../data/validationStats.ts';
import { exploreSeason } from './season.ts';

/** Shared hero: figures always come from the active data source. */
export function heroBlock(onExplore?: () => void, extra?: HTMLElement): HTMLElement {
  let scenes: Scene[] = [];
  const S = T.story;
  const explore = h('button', { class: 'btn-primary', type: 'button', text: S.explore, disabled: true });
  explore.addEventListener('click', () => { onExplore?.(); exploreSeason(scenes); });
  const values = [0, 1, 2].map(() => h('b', { text: '—' }));
  const labels = [S.high, S.optical, S.scenes];
  const hero = h('section', { class: 'hero story-hero', 'aria-label': S.title },
    h('h1', { text: S.title }), h('p', { text: S.lead }),
    h('div', { class: 'hero-nums', 'aria-live': 'polite' }, ...values.map((value, i) =>
      h('div', { class: 'hero-num' }, value, h('span', { text: labels[i] })))),
    h('div', { class: 'hero-actions' }, explore, extra ?? null),
    h('p', { class: 'note story-date', text: S.dates }));
  const unavailable = (i: number) => { values[i].title = S.unavailable; };
  void getCommunes().then(c => {
    const assessed = c.features.filter(f => hasAssessment(f.properties));
    values[0].textContent = `${assessed.filter(f => f.properties.last_pct! >= 30).length}/${assessed.length}`;
  }).catch(() => unavailable(0));
  void getValidation().then(v => {
    const { hls } = validationStats(v);
    values[1].textContent = hls.total ? `${hls.wins}/${hls.total}` : '—';
  }).catch(() => unavailable(1));
  void getScenes().then(list => {
    scenes = list; values[2].textContent = String(list.length); explore.disabled = !list.length;
  }).catch(() => { unavailable(2); explore.textContent = S.unavailable; });
  return hero;
}

export function mountAbout(host: HTMLElement): void {
  host.classList.add('page');
  const A = T.about;
  const goValidation = h('a', { href: '#validation', text: A.readMore[1] });

  host.append(
    h(
      'div',
      { class: 'page-inner' },
      // The figures hero lives on the Overview tab; About explains the project instead of repeating it.
      h('header', { class: 'about-head' }, h('h1', { text: A.title }), h('p', { class: 'lead', text: A.intro })),
      h('h2', { text: A.answersTitle }),
      h('p', { class: 'lead', text: A.answersLead }),
      h('div', { class: 'about-grid' }, ...T.content.questions.map((q) => h('div', { class: 'card' }, h('h3', { text: q.q }), h('p', { text: q.a })))),
      h(
        'section',
        { class: 'card vcard about-advice' },
        h('h3', { text: A.adviceTitle }),
        h('p', { text: A.adviceLead }),
        h('ul', { class: 'v-list' }, ...A.advice.map((r) => h('li', { text: r }))),
        h('p', { class: 'note', text: A.adviceNote }),
        h('a', { href: '#advice', class: 'btn-primary about-advice-link', text: A.adviceLink }),
      ),
      h('section', { class: 'card vcard' }, h('h3', { text: A.readTitle }), h('ul', { class: 'v-list' }, ...A.read.map((r) => h('li', { text: r })), h('li', {}, A.readMore[0], goValidation, A.readMore[2]))),
      h('section', { class: 'card vcard' }, h('h3', { text: A.limitsTitle }), h('ul', { class: 'v-list' }, ...T.content.limits.map((l) => h('li', { text: l })))),
      h(
        'section',
        { class: 'card vcard' },
        h('h3', { text: A.sourcesTitle }),
        h('ul', { class: 'v-list' }, ...T.content.sources.map((s) => h('li', {}, h('b', { text: `${s.name}: ` }), s.href ? h('a', { href: s.href, target: '_blank', rel: 'noopener', text: s.text }) : s.text))),
      ),
      h('section', { class: 'card vcard' }, h('h3', { text: A.teamTitle }), h('p', { text: A.team })),
    ),
  );
}
