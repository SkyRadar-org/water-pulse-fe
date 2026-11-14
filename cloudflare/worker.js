// Replaced with the exported API manifest by build:cloudflare.
const files = __API_FILES__;

function json(value, status, headers = {}) {
  return Response.json(value, { status, headers });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname !== '/health' && !url.pathname.startsWith('/api/')) {
      return env.ASSETS.fetch(request);
    }
    if (!['GET', 'HEAD'].includes(request.method)) {
      return json({ detail: 'Method not allowed' }, 405, { Allow: 'GET, HEAD' });
    }
    let key = url.pathname;
    if (key === '/api/frontend/choropleth') {
      const date = url.searchParams.get('date');
      const track = url.searchParams.get('track');
      if (!date || !['047D', '083A', '148D'].includes(track)) {
        return json({ detail: 'date and a valid track are required' }, 422);
      }
      key += `?date=${encodeURIComponent(date)}&track=${track}`;
    }
    const file = Object.hasOwn(files, key) ? files[key] : null;
    if (!file) return json({ detail: 'Not found' }, 404);
    const assetUrl = new URL(file, url.origin);
    // API query parameters never change which static snapshot ASSETS serves.
    const response = await env.ASSETS.fetch(new Request(assetUrl, { method: request.method }));
    if (!response.ok || !response.headers.get('content-type')?.includes('application/json')) {
      return json({ detail: 'Dataset asset unavailable' }, 503);
    }
    const headers = new Headers(response.headers);
    headers.set('Cache-Control', 'public, max-age=300');
    headers.set('X-Content-Type-Options', 'nosniff');
    return new Response(response.body, { status: response.status, headers });
  },
};
