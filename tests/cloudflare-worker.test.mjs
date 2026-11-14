import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

// Test the generated worker against the actual exported dataset, not hard-coded fake responses.
const { default: worker } = await import('../dist/_worker.js');
const root = new URL('../dist/', import.meta.url);
const env = { ASSETS: { async fetch(request) {
  const file = new URL('.' + new URL(request.url).pathname, root);
  try {
    return new Response(request.method === 'HEAD' ? null : await readFile(file), {
      headers: { 'Content-Type': file.pathname.endsWith('.json') ? 'application/json' : 'text/html' },
    });
  } catch { return new Response('missing', { status: 404 }); }
} } };
const get = (path, method = 'GET') => worker.fetch(new Request('https://nisar-flood.skyradar.vn' + path, { method }), env);

test('worker serves real scenes, communes and image URLs on the Pages origin', async () => {
  const response = await get('/api/frontend/scenes');
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('cache-control'), 'public, max-age=300');
  const scenes = await response.json();
  assert.equal(scenes.length, 33);
  assert.ok((await get(scenes[0].waterPng)).ok);
  const collection = await (await get('/api/frontend/communes')).json();
  assert.equal(collection.features.length, 140);
  assert.equal(collection.features.find(f => f.id === '15416586').properties.last_pct, 78.2);
});

test('query order and additional parameters do not alter choropleth routing', async () => {
  const response = await get('/api/frontend/choropleth?track=148D&ignored=yes&date=2026-11-03');
  assert.equal((await response.json())['15416586'], 78.2);
  assert.equal((await get('/api/frontend/choropleth?date=1900-01-01&track=148D')).status, 404);
  assert.equal((await get('/api/frontend/choropleth?date=2026-11-03&track=bad')).status, 422);
});

test('unknown APIs never fall back to SPA HTML; writes are rejected', async () => {
  for (const path of ['/api/unknown', '/api/frontend/communes/1/series', '/api/frontend/toString']) {
    const response = await get(path);
    assert.equal(response.status, 404);
    assert.equal(response.headers.get('content-type'), 'application/json');
  }
  assert.equal((await get('/api/frontend/scenes', 'POST')).status, 405);
  assert.equal(await (await get('/health', 'HEAD')).text(), '');
  assert.equal((await (await get('/health')).json()).communes, 140);
});

test('missing snapshot files fail as JSON instead of serving SPA fallback', async () => {
  const response = await worker.fetch(new Request('https://nisar-flood.skyradar.vn/api/frontend/scenes'), {
    ASSETS: { fetch: async () => new Response('<html>SPA fallback</html>', { headers: { 'Content-Type': 'text/html' } }) },
  });
  assert.equal(response.status, 503);
});
