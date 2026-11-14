import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { validationStats } from '../src/data/validationStats.ts';

test('real comparisons preserve 14/16 optical and 11/12 same-pixel SWOT', async () => {
  const v = JSON.parse(await readFile(new URL('../dist/api-data/validation.json', import.meta.url), 'utf8'));
  assert.deepEqual(validationStats(v), { hls: { wins: 14, total: 16 }, swot: { wins: 11, total: 12 } });
});
test('missing, non-finite and out-of-season comparisons never inflate the denominator; ties are not wins', () => {
  const hls = (a, b, date = '2026-09-01') => ({ date, f1_nisar: a, f1_s1: b });
  const swot = (a, b) => ({ f1_nisar: 1, f1_nisar_same_px: a, f1_s1: b });
  const v = {
    vsHls: [hls(.7, .7), hls(.8, .7), hls(null, .3), hls(NaN, .2), hls(.9, .1, '2026-07-01')],
    vsSwot: [swot(.4, .5), swot(.6, .5), swot(.5, .5), swot(null, .1), swot(.8, null), swot(Infinity, .1)],
  };
  assert.deepEqual(validationStats(v), { hls: { wins: 1, total: 2 }, swot: { wins: 1, total: 3 } });
});
