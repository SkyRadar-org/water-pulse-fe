# Changelog

## 2026-11-14 — Restore Cloud handoff for Cloudflare Pages (Codex)

- Restored all tracked patches and additional source files from the Cloud handoff on a separate branch, preserving the original transfer bundle.
- Frontend uses the same-origin `/api/frontend/*` snapshot through an advanced-mode Pages Worker; the original FastAPI routes remain available in the backend source.
- Verified locally: 11 backend tests, 4 generated-Worker tests, complete Cloudflare build (179 API snapshots, 33 scenes, 140 communes, 333 files).
- Frontend additionally fixes missing values appearing first in descending table sort and limits native NISAR GIBS zoom to 10. Browser verified 140 table rows and six missing observations last in both directions.
- Gemini 4 Argon High reviewed the supplied source in two static-analysis rounds; Codex executed tests and corrected overbroad claims in the first review.
- Production deployment is tracked separately in `docs/LOCAL_DEPLOYMENT.md`; no PR, merge, backend main branch or GitHub Actions were created.
