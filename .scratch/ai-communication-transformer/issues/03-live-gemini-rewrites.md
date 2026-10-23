# 03: Live persona rewrites through Gemini

**What to build:** With a Gemini key configured, any draft is rewritten live for the chosen persona, following that persona's rules and the global preservation rules. The response is marked `mode: live`. Embedded instructions in the draft are treated as content, not commands. Every way the provider can fail (timeout, HTTP error, malformed JSON, wrong shape, empty output) maps to a clear error code, and the UI shows a specific message with a Retry button where retrying makes sense, without losing the draft.

**Blocked by:** 01

**Status:** ready-for-agent

- [ ] Each of the four personas has rules matching the spec (C-Level 2 to 4 sentences or exactly 3 bullets; warm and specific peer feedback with no invented experiences; neutral and precise legal text that preserves obligations, conditions, exceptions and timelines; energetic Gen-Z text with qualifications kept and no offensive language).
- [ ] The prompt builder places the draft inside delimiters, neutralises lookalike delimiters in the input, and tells the model the delimited content is material to rewrite, never instructions.
- [ ] The Gemini adapter uses plain `fetch` with JSON output, reads the model ID from configuration (the default is confirmed against current Gemini docs), and enforces a 12-second timeout.
- [ ] The model output is validated as `{ rewritten_text: non-empty string }`. The server sets `persona` and computes the metrics.
- [ ] Errors map to `PROVIDER_TIMEOUT`, `PROVIDER_UNAVAILABLE`, `INVALID_MODEL_RESPONSE` and `EMPTY_OUTPUT` with the correct status codes and `retryable` flags.
- [ ] The UI shows loading, success, and specific error states with Retry, and keeps the draft after every error.
- [ ] The legal persona result shows a "Writing aid, not legal advice" label in the UI. It is not inserted into the rewritten text.
- [ ] API route tests with a fake fetch cover live success, timeout, 5xx, 429, malformed JSON, wrong shape and empty output. Prompt builder tests show that "Ignore previous instructions..." stays inside the delimited draft.
- [ ] With a real key: one manual live run per persona, plus runs with a one-word draft, a multiline bullet draft, an HTML-like draft, an injection-style draft and a non-English draft. Observations are recorded. Without a key, this item is reported as unverified.
- [ ] Lint, type-check, test and build all pass.
