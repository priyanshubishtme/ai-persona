# 04: Provider fallback chain with OpenAI-compatible adapter

**What to build:** An operator can configure a second, OpenAI-compatible provider (for example OpenAI, OpenRouter or Groq) purely through environment variables. When the first provider fails, the app transparently tries the next one within the time budget, and the response reports which provider produced the rewrite. The app stays independent of any single model.

**Blocked by:** 03

**Status:** ready-for-agent

- [ ] The OpenAI-compatible adapter uses a configurable base URL, key and model, requests JSON object output, uses plain `fetch`, and enforces a 12-second timeout.
- [ ] `AI_PROVIDERS` sets the order (default `gemini,openai_compatible`), and only providers with keys are active. With no keys, the demo provider is used.
- [ ] The chain moves to the next provider on a timeout, 429, 5xx, network error, malformed JSON, schema failure or empty output, and stops at the 25-second total budget.
- [ ] `meta.provider` reports the provider that succeeded. When every provider fails, the error code reflects the most informative failure.
- [ ] API route tests with a fake fetch cover the first provider failing and the second succeeding, all providers failing, budget exhaustion, and a single configured provider.
- [ ] The example environment file documents the new variables with placeholders only.
- [ ] Lint, type-check, test and build all pass.
