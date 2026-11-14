import 'maplibre-gl/dist/maplibre-gl.css';
import './styles/tokens.css';
import './styles/app.css';
import './styles/sidebar.css';
import './styles/timeline.css';
import './styles/panel.css';
import './styles/table.css';
import './styles/pages.css';
import './styles/ux.css';
import { DATA_MODE } from './config.ts';
import { getScenes, getSummaryLayers } from './data/dataSource.ts';
import { lang, switchLang, T, type Lang } from './i18n.ts';
import { mountMap } from './map/map.ts';
import { set, state, subscribe, type Tab } from './state.ts';
import { mountAbout } from './ui/about.ts';
import { mountCommunePanel } from './ui/communePanel.ts';
import { mountCommuneTable } from './ui/communeTable.ts';
import { h } from './ui/dom.ts';
import { openGuide } from './ui/guide.ts';
import { maybeShowHero } from './ui/hero.ts';
import { mountSidebar } from './ui/sidebar.ts';
import { mountTimeline } from './ui/timeline.ts';
import { mountValidation } from './ui/validation.ts';

const TABS: Tab[] = ['map', 'communes', 'validation', 'about'];

const LOGO = `<svg viewBox="0 0 32 32" aria-hidden="true"><circle cx="16" cy="16" r="15" fill="#1d4ed8"/><path d="M5 18c3-4 6-4 9 0s6 4 9 0 3-2 4-1" stroke="#fff" stroke-width="2.5" fill="none" stroke-linecap="round"/><path d="M5 12c3-4 6-4 9 0s6 4 9 0 3-2 4-1" stroke="#93c5fd" stroke-width="2" fill="none" stroke-linecap="round"/></svg>`;

function buildShell(root: HTMLElement) {
  const brand = h('div', { class: 'brand' });
  brand.innerHTML = `${LOGO}<span>${T.app.brand}<small>${T.app.brandBy}</small></span>`;

  const menuBtn = h('button', { class: 'tab menu-btn', type: 'button', 'aria-label': T.app.menu, title: T.app.menu }, '☰');

  const tabs = h('nav', { class: 'tabs', role: 'tablist', 'aria-label': T.app.sections });
  for (const id of TABS) {
    const b = h('button', { class: 'tab', role: 'tab', 'data-tab': id, text: T.tabs[id] });
    b.addEventListener('click', () => {
      location.hash = id;
    });
    tabs.append(b);
  }

  const guideBtn = h('button', { class: 'hdr-btn', type: 'button', title: T.app.guideTip, 'aria-label': T.app.guideTip }, h('span', { class: 'q', text: '?' }), h('span', { class: 'hdr-btn-text', text: T.app.guide }));
  guideBtn.addEventListener('click', openGuide);

  const langBox = h('div', { class: 'lang', role: 'group', 'aria-label': T.app.langTip });
  for (const l of ['vi', 'en'] as Lang[]) {
    const b = h('button', { type: 'button', text: l.toUpperCase(), 'aria-pressed': String(l === lang), lang: l });
    b.addEventListener('click', () => {
      if (l === lang) return;
      switchLang(l, {
        selectedDate: state.selectedDate,
        selectedTrack: state.selectedTrack,
        selectedCommune: state.selectedCommune,
        trackFilter: state.trackFilter,
        activeSummary: state.activeSummary,
        layers: state.layers,
        opacity: state.opacity,
      });
    });
    langBox.append(b);
  }

  const modeBadge =
    DATA_MODE === 'mock'
      ? h('span', { class: 'badge badge-demo', title: T.app.demoTip }, h('span', { class: 'b-long', text: T.app.demoLong }), h('span', { class: 'b-short', text: T.app.demoShort }))
      : null;
  const header = h('header', { class: 'topbar' }, brand, tabs, h('div', { class: 'spacer' }), menuBtn, modeBadge, guideBtn, langBox, h('span', { class: 'badge badge-event', text: T.app.event }));

  const views: Record<Tab, HTMLElement> = {
    map: h('section', { class: 'view view-map', id: 'view-map' }),
    communes: h('section', { class: 'view', id: 'view-communes' }),
    validation: h('section', { class: 'view', id: 'view-validation' }),
    about: h('section', { class: 'view', id: 'view-about' }),
  };
  const workspace = h('main', { class: 'workspace' }, ...Object.values(views));

  const aboutLink = h('button', { text: T.app.footerLink });
  aboutLink.addEventListener('click', () => {
    location.hash = 'about';
  });
  const footer = h('footer', { class: 'footer' }, h('span', { text: T.app.footerData }), aboutLink);
  root.append(header, workspace, footer);
  return { views, tabs, menuBtn };
}

function tabFromHash(): Tab {
  const id = location.hash.replace('#', '') as Tab;
  return TABS.includes(id) ? id : 'map';
}

async function buildMapView(view: HTMLElement, menuBtn: HTMLElement) {
  const [scenes, summaries] = await Promise.all([getScenes(), getSummaryLayers()]);

  const sidebar = h('aside', { 'aria-label': T.app.menu });
  const mapEl = h('div', { id: 'map' });
  const note = h('div', { class: 'map-note', role: 'status', text: T.map.radarMissing });
  const hint = h('div', { class: 'map-hint', text: T.map.hint });
  const mapWrap = h('div', { class: 'map-wrap' }, mapEl, note, hint);
  const timeline = h('div', { 'aria-label': T.timeline.region });
  const panel = h('aside', {});
  mapWrap.append(panel);
  view.append(sidebar, mapWrap, timeline);

  mountSidebar(sidebar, summaries);
  mountTimeline(timeline, scenes);
  mountCommunePanel(panel, scenes);
  mountMap(mapEl);

  menuBtn.addEventListener('click', () => sidebar.classList.toggle('open'));
  mapWrap.addEventListener('pointerdown', () => sidebar.classList.remove('open'));

  const sync = () => {
    note.classList.toggle('show', state.radarMissing && state.layers.radar && state.activeSummary === null);
    hint.classList.toggle('show', state.selectedCommune === null);
  };
  subscribe(sync);
  sync();
}

function main() {
  const root = document.getElementById('app')!;
  const shell = buildShell(root);

  const render = () => {
    shell.tabs.querySelectorAll<HTMLElement>('.tab').forEach((el) => el.setAttribute('aria-selected', String(el.dataset.tab === state.tab)));
    for (const [id, el] of Object.entries(shell.views)) el.classList.toggle('active', id === state.tab);
    shell.menuBtn.hidden = state.tab !== 'map';
  };
  subscribe(render);
  window.addEventListener('hashchange', () => set({ tab: tabFromHash() }));
  set({ tab: tabFromHash() });
  render();

  mountCommuneTable(shell.views.communes);
  mountValidation(shell.views.validation);
  mountAbout(shell.views.about);

  buildMapView(shell.views.map, shell.menuBtn)
    .then(maybeShowHero)
    .catch((err: unknown) => {
      console.error(err);
      shell.views.map.replaceChildren(h('div', { class: 'error-box', text: `${T.app.loadError} ${err instanceof Error ? err.message : ''}` }));
    });
}

main();
