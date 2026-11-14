# Changelog

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
