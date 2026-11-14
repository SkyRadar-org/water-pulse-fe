import { T } from '../i18n.ts';
import { h } from './dom.ts';

export function heroBlock(onExplore: () => void, extra?: HTMLElement): HTMLElement {
  const explore = h('button', { class: 'btn-primary', type: 'button', text: T.hero.explore });
  explore.addEventListener('click', onExplore);
  return h(
    'section',
    { class: 'hero' },
    h('h1', { text: T.content.tagline }),
    h('p', { text: T.content.positioning }),
    h('div', { class: 'hero-nums' }, ...T.content.heroNumbers.map((n) => h('div', { class: 'hero-num' }, h('b', { text: n.big }), h('span', { text: n.text })))),
    h('div', { class: 'hero-actions' }, explore, extra ?? null),
  );
}

export function mountAbout(host: HTMLElement): void {
  host.classList.add('page');
  const A = T.about;
  const goMap = () => {
    location.hash = 'map';
  };
  const goValidation = h('a', { href: '#validation', text: A.readMore[1] });

  host.append(
    h(
      'div',
      { class: 'page-inner' },
      heroBlock(goMap),
      h('h2', { text: A.answersTitle }),
      h('p', { class: 'lead', text: A.answersLead }),
      h('div', { class: 'about-grid' }, ...T.content.questions.map((q) => h('div', { class: 'card' }, h('h3', { text: q.q }), h('p', { text: q.a })))),
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
