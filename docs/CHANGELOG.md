# Changelog

## 2026-11-14 — Smooth playback: blended frames and cross-fade (Claude)

- Playing the raw acquisitions made the water layer shrink and grow with each track's swath (047D ≈ 83 %, 083A ≈ 67 %, 148D ≈ 37 % of the area). With **Xem ghép mượt / Blended view** on (default), each frame is the backend mosaic of the latest real observation per pixel from any track (≤ 12 days old; older = fainter, none = grey veil). Turn it off for the single-image view; statistics always use the original images.
- New `CrossfadeImage` (map/layers.ts): next image is fetched and decoded off-screen, put on a hidden twin layer and cross-faded (450 ms), so there is no empty frame or hard cut. Commune values stay on screen until the next ones arrive; older values are drawn fainter and named in the tooltip.
- Playback pace follows real time between acquisitions (650–1500 ms per step) in blended mode.
- Falls back to the previous behaviour when the data source has no `composite` (e.g. mock data). Needs backend `GET /api/frontend/choropleth/composite` and `scenes[].composite`.

## 2026-11-14 — Automatic production deploy from main (Claude)

- `.github/workflows/deploy.yml`: every push to `main` checks out this repo and `skyradar-nisar@main` side by side, runs `build:cloudflare`, `test:cloudflare` and `test:ux`, then publishes to Pages project `nisar-flood` (production) and checks `/health` on the real hostname. A failed build or test deploys nothing.
- Needs repository secret `CLOUDFLARE_API_TOKEN` (Account → Cloudflare Pages → Edit) and variable `CLOUDFLARE_ACCOUNT_ID`. Can also be started by hand (Actions → Run workflow) or by a `data-updated` repository dispatch.
- Pushing to `main` now changes production: use a branch and a pull request for work that is not ready.

## 2026-11-14 — Period-neutral copy and statistical report tab

- Overview and map no longer frame the app around the Đông Xuân crop: the headings now describe water status by commune for any observation period. Removed the eyebrow pills and the duplicate hero search (the list search remains); cards use a colour dot instead of a thick top stripe; "low water" is green everywhere, matching the map legend.
- "Danh sách xã" becomes **Báo cáo thống kê / Reports** (`#reports`, old `#communes` links redirect). Period (whole dataset, month, custom range), province and orbit filters drive KPIs, communes per water level per acquisition (click to open the image), a monthly flood calendar, flood durations, a province comparison and a sortable commune table. Orbits are never merged.
- Exports: three CSVs (province, per-acquisition, per-commune), chart PNGs and a print/PDF layout. None duplicate the overview, which stays a latest-observation snapshot.
- Drawn SVG icons replace the ☰ / ✕ glyphs; short tab label on narrow screens.
- Added `tests/reportStats.test.mjs` (4 tests on the exported real data). Backend aggregation requests for the report are in `docs/BE_REQUESTS_REPORTS.md`.

## 2026-11-14 — Purpose-first flood overview and explicit observation coverage (Codex, Gemini reviewed)

- Start with the user's commune-level question, latest observation dates and next field check. Move radar/orbit controls behind an explicit evidence view.
- Add an overview computed from real data:131 assessed communes in38/40/53water groups; nine insufficient observations remain separate. Distinguish per-commune latest observations from a single acquisition.
- Explain the An Long coverage gap and link to its real29October reference image. Use aligned exported radar JPEGs instead of patchy GIBS tiles.
- Add real-data observation tests; backend11, Worker4 and observation4 tests passed. Browser checks cover group filters, missing/partial data, VI/EN, keyboard and390px mobile layout.
- Gemini implementation and three static-review rounds are retained in `docs/verification/ux`; final static verdict PASS after Codex corrected the findings. Live deployment verification is recorded in `docs/LOCAL_DEPLOYMENT.md`.

## 2026-11-14 — Restore Cloud handoff for Cloudflare Pages (Codex)

- Restored all tracked patches and additional source files from the Cloud handoff on a separate branch, preserving the original transfer bundle.
- Frontend uses the same-origin `/api/frontend/*` snapshot through an advanced-mode Pages Worker; the original FastAPI routes remain available in the backend source.
- Verified locally: 11 backend tests, 4 generated-Worker tests, complete Cloudflare build (179 API snapshots, 33 scenes, 140 communes, 333 files).
- Frontend additionally fixes missing values appearing first in descending table sort and limits native NISAR GIBS zoom to 10. Browser verified 140 table rows and six missing observations last in both directions.
- Gemini 4 Argon High reviewed the supplied source in two static-analysis rounds; Codex executed tests and corrected overbroad claims in the first review.
- Production deployment is tracked separately in `docs/LOCAL_DEPLOYMENT.md`; no PR, merge, backend main branch or GitHub Actions were created.
