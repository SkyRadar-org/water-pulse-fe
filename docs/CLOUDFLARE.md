# Cloudflare Pages + Pages Worker

Production hostname: **nisar-flood.skyradar.vn**. Suggested Pages project name: **nisar-flood**.

The Pages deployment contains the Vite frontend, committed NISAR images, exported API JSON and an advanced-mode
`_worker.js`. Requests to `/api/*` and `/health` invoke the Worker; other requests are served as Pages assets.
The frontend and API share one origin, so no API hostname, CORS binding, R2 bucket, database or Earthdata token is needed.
This is a snapshot of the read-only frontend API, not a FastAPI/Python process running inside Workers.
Regenerate and redeploy when the source dataset changes. Original FastAPI endpoints remain available only in the
Python backend; the Worker implements `/api/frontend/*` and `/health`.

## Build and validate locally

Keep the frontend and `skyradar-nisar` checkouts side by side, including the adapter and exporter changes.
Requires Node 22+ (tested on 24) and Python 3.12 with backend requirements installed.

```bash
# Run from water-pulse-fe. In this cloud workspace:
npm ci
PYTHON=/workspace/.venvs/nisar/bin/python npm run build:cloudflare
npm run test:cloudflare
npm run dev:cloudflare
```

On another machine, install `skyradar-nisar/water-pulse-be/requirements.txt` into a venv and set `PYTHON` to its
Python executable. `NISAR_REPO` may override the sibling checkout path. The build exports into ignored `dist/`;
it does not modify committed source data. Run `build:cloudflare`, not just `build`, before a Pages deployment.
`build:cloudflare` fixes the data mode to same-origin API and overwrites a previously configured `VITE_API_BASE`.

Readiness checks on local port 8788:

- `/health`: `{status:"ok",frames:33,communes:140}`.
- `/api/frontend/scenes`: 33 acquisitions, each with an existing `/static/water/*.png`.
- `/api/frontend/communes`: 140 communes; Sơn Kiên latest water 78.2%, track 148D.
- `/api/frontend/choropleth?date=2026-11-03&track=148D`: Sơn Kiên (`15416586`) is 78.2.
- Unknown API routes return JSON 404, writes return 405. They must not return the SPA HTML.

The tested output has 333 files, largest file about 2.7 MB. Each build checks the 25 MiB per-file and 20,000-file
baseline Pages limits. Binary images are assets, not embedded in the Worker bundle. Worker reads precomputed JSON
through `env.ASSETS`; it performs no satellite processing.

## Publish to the team's account

Authenticate Wrangler with the team's Cloudflare account, or securely provide `CLOUDFLARE_API_TOKEN` and
`CLOUDFLARE_ACCOUNT_ID`. A token needs **Account → Cloudflare Pages → Edit** for the selected account. Do not store
credentials in repository files or paste them into chat. If creating/managing DNS through an API is desired later,
that requires separate zone permissions; the deployment command below does not change DNS.

Check whether Pages project `nisar-flood` already exists. For a new project, create it with production branch
`main` in the dashboard or `wrangler pages project create nisar-flood --production-branch main`.
Deploy the tested artifact only after authorization:

```bash
npm run deploy:cloudflare -- --branch main
```

Explicit `--branch main` matters: the cloud workspace uses a local `work` branch, which otherwise creates a preview
instead of updating production. If the team's Pages project has a different name/production branch, update the
configuration and command to match it. The custom hostname is not assigned merely by putting it in this document.

In the Pages project, open **Custom domains → Set up a custom domain** and add `nisar-flood.skyradar.vn`.
Complete the Cloudflare DNS/certificate instructions for the existing `skyradar.vn` zone. Preserve other DNS records.
Verify HTTPS, `/health`, a water image, commune search, VI/EN and validation on the real hostname.

Use Direct Upload with this multi-repository build initially. A Git-integrated Pages build from the FE repository
alone does not have the sibling dataset/exporter and will fail unless that source is provisioned explicitly.
Cloudflare account access, project creation, DNS and remote deployment were not performed during preparation.

External Esri tiles, NASA GIBS and MapLibre glyphs remain separate network dependencies. If the cloud task's
allowlist blocks them, local API/Worker tests can pass while full basemap/radar rendering remains unverified.
