import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { hasAssessment, latestValues, referenceScene } from '../src/data/observations.ts';

const read = async name => JSON.parse(await readFile(new URL('../dist/api-data/' + name, import.meta.url), 'utf8'));
const collection = await read('communes.json');
const scenes = await read('scenes.json');

test('latest map preserves all 115 assessed communes and excludes 25 insufficient observations', () => {
  const values = latestValues(collection);
  assert.equal(Object.keys(values).length, 115);
  assert.equal(Object.values(values).filter(v => v >= 30).length, 33);
  assert.equal(Object.values(values).filter(v => v >= 10 && v < 30).length, 39);
  assert.equal(Object.values(values).filter(v => v < 10).length, 43);
  for (const { properties: p } of collection.features) {
    if (!hasAssessment(p)) assert.equal(Object.hasOwn(values, p.osm_id), false);
  }
});

test('An Long is missing in the November 3 image but has its own real October 29 reference', async () => {
  const p = collection.features.find(f => f.properties.osm_id === '15581562').properties;
  const november = await read('choropleth/2026-11-03_148D.json');
  assert.equal(Object.hasOwn(november, p.osm_id), false);
  assert.equal(latestValues(collection)[p.osm_id], 51.7);
  const scene = referenceScene(p, scenes);
  assert.equal(scene.date, '2026-10-29');
  assert.equal(scene.track, '083A');
  const reference = await read('choropleth/2026-10-29_083A.json');
  assert.equal(reference[p.osm_id], 51.7);
});

test('six unobserved communes have no fabricated reference scene or dry value', () => {
  const missing = collection.features.filter(f => f.properties.last_pct === null);
  assert.equal(missing.length, 6);
  for (const { properties: p } of missing) {
    assert.equal(hasAssessment(p), false);
    assert.equal(referenceScene(p, scenes), undefined);
    assert.equal(Object.hasOwn(latestValues(collection), p.osm_id), false);
  }
});

test('all 33 radar images point to exported JPEG assets matching their acquisition', async () => {
  for (const scene of scenes) {
    assert.equal(scene.radarJpg, `/static/radar/${scene.date}_${scene.track}.jpg`);
    const bytes = await readFile(new URL('../dist' + scene.radarJpg, import.meta.url));
    assert.deepEqual([...bytes.subarray(0, 2)], [255, 216]);
  }
});
