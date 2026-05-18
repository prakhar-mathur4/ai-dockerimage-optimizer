# Docker Optimizer AI - Current TODO

## Completed
- Phase 0: Product positioning and non-guarantee messaging
- Phase 1: Stateless Groq API migration, server-side key handling, rate limit, timeout
- Phase 2: Strict LLM schema validation, retry policy, safe failure handling
- Phase 3: Static Dockerfile rule checks and score comparison
- Phase 5: Output sections, downloads, loading states, retry UX
- Phase 7: Audit fix, local Tailwind pipeline, security headers, Vercel health check

## Pending
- Phase 4: Prompt quality and context, including optional runtime/language, package manager, target environment, and user constraint fields in the UI
- Phase 4: Inject the collected context into `/api/optimize`
- Phase 4: Add a minimal-change mode for already-good Dockerfiles
- Phase 6: Testing and quality gates
- Phase 6: Add unit tests for schema validation, rule checks, and score calculation
- Phase 6: Add integration tests for `/api/optimize`
- Phase 6: Add regression fixtures for good, bad, and mixed Dockerfiles
- Phase 6: Add CI workflow for `npm ci`, `typecheck`, tests, and build
- Release hardening: verify actual Vercel deployment end to end
- Release hardening: confirm `/api/health` and `/api/optimize` on the deployed URL
- Release hardening: add a production smoke test step after deployment

## Optional Later
- Add verified build mode when repo context is available
- Queue builds to an external worker
- Return build logs and image size delta

## Notes
- `Optimization Strategy` and `Quality Signal` UI sections were intentionally removed.
- The app is currently stateless and does not use a database.
- `riskNotes`, `confidence`, and `ruleChecks` still exist in the API response and YAML report.
