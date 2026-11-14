# Local restoration and production deployment — 2026-11-14

## Published and verified

- URL: https://nisar-flood.skyradar.vn
- Cloudflare account: `2ae67a2e1c07b914d69b79410f0e4d78`; Pages project: `nisar-flood`.
- Dashboard confirms **Production**, source branch **main**, deployment `1d7cf751`, URL https://1d7cf751.nisar-flood.pages.dev.
- Custom domain status: **Active**, **SSL enabled**. The new record is CNAME `nisar-flood` → `nisar-flood.pages.dev`. No unrelated DNS records were modified.
- Uploaded the complete 333-file `dist` folder through the signed-in local browser. The advanced-mode `_worker.js` serves the exported API snapshot. No tokens were created or supplied in chat.

## Restored source

- FE base: `4727d947566213c0f7defc1015ca2544c24d9439`; BE base: `0869a45c5f42121f99fa3df3c86d41ab94536ead`.
- Both restored checkouts use `codex/local-cloudflare-20261114`. Patches passed `git apply --check`; additional files were copied with conflict checks. Original archive and the previously extracted transfer remain untouched.
- Both Cloud patches and all additional source files are restored. The build was regenerated after limiting GIBS native zoom to 10 and fixing missing values to remain last in either table sort direction.
- No PR, merge, BE `main` branch, GitHub Actions or satellite pipeline rerun was created.

## Validation

- Backend: **11 tests passed**. Generated Worker: **4 tests passed** after the final build.
- `build:cloudflare`: 179 API snapshots, 33 scenes, 140 communes, 333 files; largest 2,692,266 bytes.
- Local actual Wrangler/workerd on port 8791 returned correct JSON routes; port 8788 belonged to an existing service and was preserved.
- Production HTTP verification at **10:44:30 GMT+7**: health/scenes/communes/validation/area/series/choropleth return 200 JSON; two water PNGs return 200 with PNG signatures; unknown API returns 404 JSON; POST scenes returns 405 JSON; HEAD health returns 200. Evidence: `verification/production-http-checks.json`.
- Production browser: 140 table rows; Sơn Kiên is 78.2% on reference track148D; search `Son Kien` in the commune table finds it; map finder selects full commune name; VI and EN work; validation page renders; map, radar and water overlay render. Browser console had no captured warnings/errors at the final check.
- Both sorting directions were verified on the local production bundle: all six missing last observations stay last, descending starts78.2%, ascending starts0%.

## Independent critique

Gemini 4 Argon High reviewed source supplied in two prompt packets through Antigravity CLI. This was static analysis, not independent test execution. Codex ran the tests and browser checks. First-round overbroad claims were challenged and corrected in round2; final static verdict PASS. Reports are in `verification/gemini/`. This verifies integration and deployment, not independent scientific accuracy of SAR classification.

## Operations

Rebuild with the sibling backend checkout and a Python environment containing its requirements: `PYTHON=<venv-python> npm run build:cloudflare`, then `npm run test:cloudflare`. Upload the **contents of dist**, including `_worker.js`, `_routes.json`, `api-data`, `static`, frontend assets and index. A plain `npm run build` does not export the API.

Dashboard upload rejected the34.4MB ZIP before deployment. Uploading the333-file folder succeeded (each file is below25MiB). The browser extension lacked file-URL access, so the native macOS folder chooser was used; extension permissions were not changed.

API data is a read-only snapshot. Regenerate and redeploy when the source dataset changes. External Esri/GIBS/glyph services remain network dependencies.
