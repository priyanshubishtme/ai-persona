# 01: Walking skeleton with labeled demo mode

**What to build:** A visitor opens the app, clicks "Try example", picks any of the four personas, presses Transform, and sees a pre-written rewrite clearly badged "Demo, not AI" together with original and new word counts. The full response envelope already flows end to end (request validation, demo provider, envelope schema), so later tickets only deepen each layer. Typing anything other than the example explains that live AI is not configured. Unknown URLs show an intentional not-found page with a link home. Developer commands for lint, type-check, unit tests and production build exist and pass. UI is plain and functional; final styling comes later.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] Your first message from this session is logged with the repository's prompt-logging script (run with `python`), and the log verifies.
- [ ] The Next.js app (TypeScript, App Router) lives at the repository root with an npm lockfile. The existing README and .gitignore are extended, not replaced, and no governance file changes.
- [ ] Scripts exist for dev, build, start, lint, type-check, test (Vitest) and smoke (placeholder until ticket 09).
- [ ] An example environment file lists the provider variable names with placeholder values only. Real env files are git-ignored.
- [ ] The persona catalog defines the four stable IDs with display names and one-line descriptions, and the selector uses it.
- [ ] The transform API accepts POST with the draft and persona and returns the success envelope (`result` plus `meta` with mode, provider and warnings). `result` is validated by a strict schema, and both word counts and the word-count change come from the real tokenizer.
- [ ] With no provider keys, the demo provider returns a pre-written rewrite for each persona for the built-in example only. `meta.mode` is `demo`, and the UI shows a visible "Demo, not AI" badge.
- [ ] With no keys, any other draft returns `LIVE_AI_NOT_CONFIGURED`, and the UI explains it without clearing the draft.
- [ ] Metrics not yet built (sentiment, readability, overlap) are returned as 0 and hidden in the UI until ticket 02. They are never shown as measured values.
- [ ] Unknown routes return HTTP 404 with a not-found page that links home.
- [ ] API route tests (seam 1, with the provider fetch injected) cover the demo success envelope and `LIVE_AI_NOT_CONFIGURED`.
- [ ] Lint, type-check, test and build all run and pass, and the exact results are recorded.
