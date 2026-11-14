import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { computeReport, computeTrend, floodDuration, monthsBetween, sceneKey } from '../src/data/reportStats.ts';

const read = async name => JSON.parse(await readFile(new URL('../dist/api-data/' + name, import.meta.url), 'utf8'));
const communes = (await read('communes.json')).features.map(f => f.properties);
const scenes = await read('scenes.json');
const choro = new Map();
for (const s of scenes) choro.set(sceneKey(s.date, s.track), await read(`choropleth/${s.date}_${s.track}.json`));
const all = { from: '2026-01-01', to: '2026-12-31', province: '', track: 'all' };

test('every acquisition stays its own row and accounts for every commune in scope', () => {
  const r = computeReport(communes, scenes, choro, all);
  assert.equal(r.scenes.length, 33);
  for (const s of r.scenes) {
    assert.equal(s.observed + s.missing, 140);
    assert.equal(s.high + s.medium + s.low, s.observed);
    assert.equal(s.observed, Object.keys(choro.get(sceneKey(s.date, s.track))).length);
  }
  assert.equal(r.totals.busiest.high, Math.max(...r.scenes.map(s => s.high)));
});

test('period, orbit and province filters narrow the report without leaking other data', () => {
  const sept = computeReport(communes, scenes, choro, { ...all, from: '2026-09-01', to: '2026-09-30', track: '047D' });
  assert.deepEqual(sept.scenes.map(s => s.date), ['2026-09-09', '2026-09-21']);
  assert.ok(sept.scenes.every(s => s.track === '047D'));
  assert.deepEqual(sept.months.map(m => m.month), ['2026-09']);

  const province = communes[0].province;
  const scoped = computeReport(communes, scenes, choro, { ...all, province });
  assert.equal(scoped.totals.communes, communes.filter(c => c.province === province).length);
  assert.deepEqual(scoped.provinces.map(p => p.province), [province]);
});

test('commune period max comes from a real acquisition and missing communes are never zero', () => {
  const r = computeReport(communes, scenes, choro, all);
  for (const c of r.communes) {
    if (c.max === null) {
      assert.equal(c.obs, 0);
      continue;
    }
    assert.equal(choro.get(sceneKey(c.maxDate, c.maxTrack))[c.p.osm_id], c.max);
  }
  const p = r.provinces.reduce((n, x) => n + x.high + x.medium + x.low + x.noObs, 0);
  assert.equal(p, 140);
});

test('flood duration counts still-wet communes up to their last image as a minimum', () => {
  const base = { first_flood_date: '2026-08-01', recession_date: null, last_date: '2026-10-30' };
  assert.deepEqual(floodDuration({ ...base, recession_date: '2026-09-10' }), { days: 40, ongoing: false });
  assert.deepEqual(floodDuration(base), { days: 90, ongoing: true });
  assert.deepEqual(floodDuration({ ...base, first_flood_date: null }), { days: null, ongoing: false });
  assert.deepEqual(monthsBetween('2026-11-20', '2027-01-05'), ['2026-11', '2026-12', '2027-01']);
});

test('season trend compares the latest image only with its own orbit and never merges orbits', () => {
  const t = computeTrend(computeReport(communes, scenes, choro, all));
  assert.ok(t.points.length > 0);
  for (const p of t.points) assert.ok(p.share >= 0 && p.share <= 100 && p.observed >= 10);
  assert.equal(t.latestTrackPeak.track, t.latest.track);
  assert.ok(t.peak.share >= t.latestTrackPeak.share);
  assert.equal(t.direction, 'falling');
  // A single orbit with too few images in the period yields no trend instead of a misleading one.
  const none = computeTrend(computeReport(communes, scenes, choro, { ...all, from: '2026-06-01', to: '2026-06-02' }));
  assert.equal(none.direction, 'none');
});
