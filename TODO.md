# Docker Optimizer AI - Implementation TODO

## Phase 0: Product Positioning (Must)
- [x] Product name/description update: "Dockerfile Best-Practices Advisor" (not build guarantee tool).
- [x] UI disclaimer add: "AI recommendation only, runtime build is not verified."
- [x] Output labels add: `Confidence`, `Risk Notes`, `Not Runtime Verified`.

## Phase 1: Security + Architecture (Must)
- [x] Move Gemini API call from client to serverless API route (`/api/optimize`).
- [x] Remove client-side API key usage (`process.env.API_KEY` in frontend bundle).
- [x] Store key only in Vercel env var (`GROQ_API_KEY`) on server side.
- [x] Add request rate limit (IP-based basic limit).
- [x] Add basic abuse protection: input size cap + request timeout.

## Phase 2: LLM Contract Hardening (Must)
- [x] Upgrade response schema to strict fields:
  - `optimizedDockerfile`
  - `improvements[]`
  - `riskNotes[]`
  - `confidence` (`high|medium|low`)
  - `changeSummary[]` (`original`, `optimized`, `reason`)
- [x] Add runtime JSON schema validation (reject malformed output).
- [x] Add retry policy for invalid LLM output (max 2 retries).
- [x] Add safe failure response when model fails ("Could not generate high-confidence optimization").

## Phase 3: Best-Practices Rule Checks (Must)
- [x] Add static checks on input Dockerfile:
  - tag pinning check
  - root user check
  - dependency install pattern check (`npm ci` preference etc.)
  - layer caching order check
  - secret-like pattern check (`ENV/ARG` with key/token/password)
- [x] Add same checks on optimized output.
- [x] Show before/after rule score in UI (e.g. `6/10 -> 9/10`).
- [x] If optimization worsens score, block output and return warning.

## Phase 4: Prompt Quality + Context (Should)
- [ ] Collect optional context fields in UI:
  - runtime/language
  - package manager
  - target env (`dev/staging/prod`)
  - constraints ("must keep alpine", "must keep root", etc.)
- [ ] Inject context into system/user prompt safely.
- [ ] Add "minimal change mode" in prompt for already-good Dockerfiles.

## Phase 5: UX Improvements (Should)
- [ ] Add output sections:
  - Optimized Dockerfile
  - Key Improvements
  - Risk Notes
  - Confidence
  - Rule Score Delta
- [ ] Add copy/download buttons for Dockerfile and JSON report.
- [ ] Add loading + retry UI states with clear error messages.

## Phase 6: Testing + Quality Gates (Must)
- [ ] Add unit tests for:
  - schema validation
  - rule checks
  - score calculation
- [ ] Add integration test for `/api/optimize` success/failure flow.
- [ ] Add regression test set with sample Dockerfiles (good/bad/mixed).
- [ ] Add CI workflow: `npm ci`, typecheck, test, build.

## Phase 7: Dependency + Deploy Hardening (Must)
- [ ] Resolve `npm audit` high vulnerabilities and update lockfile.
- [ ] Remove CDN Tailwind runtime dependency; use local build pipeline.
- [ ] Add security headers (CSP baseline, X-Content-Type-Options, Referrer-Policy).
- [ ] Verify Vercel deployment with env vars and function timeout config.

## Phase 8: Optional Advanced Validation (Later)
- [ ] Add optional "Verified Build Mode" (only when repo/context is provided).
- [ ] Queue job to external build worker (Cloud Build/CodeBuild/Runner).
- [ ] Return `Verified Build: pass/fail` with logs + image size delta.

---

## Definition of Done (Release v1)
- [x] No API key in browser bundle.
- [x] Strict validated JSON contract from LLM.
- [x] Input/output rule scoring implemented and visible.
- [x] Clear non-guarantee messaging in UI.
- [ ] Tests + CI passing.
- [ ] Vercel production deploy successful.
