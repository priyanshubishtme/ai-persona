# Spec: AI Communication Transformer (hackathon MVP)

**Status:** ready-for-agent

## Problem Statement

People write rough drafts (fragments, bullet dumps, blunt notes) and then need to send them to very different audiences: an executive who wants outcomes in three lines, a colleague who needs feedback delivered kindly, a compliance reader who needs precise obligations, or a social audience that expects energy. Rewriting by hand for each audience is slow, and asking a generic chatbot to do it is risky: it silently drops numbers, softens "not", invents deadlines or promises, and gives no way to see what actually changed. Users also cannot tell whether the rewrite is really shorter, more readable, or more positive; they have to trust the model's own claims.

## Solution

A single-page web app where the user pastes a draft, picks one of four audience personas, and gets a rewrite that preserves the draft's facts and commitments. Next to the rewrite, the app shows:

- the original and rewrite side by side, with word-level change highlighting;
- measured metric changes (word count, sentiment estimate, readability, phrase overlap), all computed by the app itself with documented, transparent methods rather than guessed by the model;
- **Fact Guard** warnings when a number, date, name or negation from the original cannot be found in the rewrite;
- copy buttons for the rewrite and for the machine-readable JSON result.

The app works without credentials in a clearly labeled demo mode for the built-in example, and with credentials it uses a server-side, provider-agnostic AI layer (Gemini first, any OpenAI-compatible provider as fallback). A methodology page explains every metric and heuristic. The visual design is intentionally plain in this phase; a provided AI design will be applied afterwards.

## User Stories

### Drafting and persona selection

1. As a writer, I want a clearly labeled text area for my draft, so that I know exactly where to paste my message.
2. As a writer, I want to paste paragraphs, fragments, or bullet lists, so that I do not have to clean up my draft before transforming it.
3. As a writer, I want to choose one of four personas (C-Level executive, Supportive peer feedback, Legal/compliance notice, Gen-Z hype), so that the rewrite fits my audience.
4. As a writer, I want a short description of each persona next to the selector, so that I understand what each will produce before I choose.
5. As a first-time visitor, I want a "Try example" button that fills in a realistic draft, so that I can see the product working in one click.
6. As a writer, I want a live character counter with the limit shown, so that I know before submitting whether my draft is too long.
7. As a keyboard user, I want to submit with Ctrl/Cmd+Enter, so that I do not need to reach for the mouse.
8. As a writer, I want my draft to stay exactly as I typed it after any error, so that I never lose work.

### Rewriting behavior

9. As an executive reader, I want the C-Level rewrite to be 2 to 4 crisp sentences or exactly 3 bullets focused on outcomes, risks, decisions and next steps, so that I can act on it in seconds.
10. As a colleague receiving feedback, I want the peer rewrite to be warm, respectful and specific, without invented personal anecdotes or commitments, so that it feels genuine and actionable.
11. As a compliance reviewer, I want the legal rewrite to be neutral, precise and formal and to preserve every obligation, condition, exception and timeline, so that meaning is not altered.
12. As a compliance reviewer, I want the legal result labeled "Writing aid, not legal advice", so that nobody mistakes it for legal counsel.
13. As a social media manager, I want the Gen-Z rewrite to be energetic and short, with optional light slang or emoji, while keeping every qualification, so that it is engaging but not misleading.
14. As a writer, I want names, dates, numbers, negation, uncertainty, conditions and commitments preserved in every persona, so that the rewrite says the same thing.
15. As a writer, I want the rewrite never to invent benefits, deadlines, obligations, promises or calls to action, so that I am not accidentally committing to something.
16. As a writer of a one-line draft, I want a proportionate rewrite rather than padded filler, so that the result stays truthful.
17. As a writer whose draft contains text like "ignore previous instructions", I want that text treated as content to rewrite, so that the app cannot be hijacked by my input.
18. As a writer drafting in a language other than English, I want the rewrite to stay in my language and to be told that some metrics are English-calibrated, so that I am not misled by meaningless scores.

### Results and metrics

19. As a writer, I want the original and rewrite shown side by side (stacked on small screens), so that I can compare them easily.
20. As a writer, I want word-level change highlighting that marks insertions and deletions without relying on color alone, so that I can see exactly what changed.
21. As a writer, I want the highlighting explained as a visual word diff that is separate from the overlap metric, so that I do not confuse the two.
22. As a writer, I want original, new and change values for word count, so that I can see how much shorter or longer the rewrite is.
23. As a writer, I want a sentiment estimate from -1 to +1 for both texts, labeled as an estimate, so that I can see the tone shift without treating it as objective truth.
24. As a writer, I want a readability score for both texts with a note that very short texts are less reliable and scores can fall outside 0 to 100, so that I interpret it correctly.
25. As a writer, I want a phrase overlap percentage, so that I can see how much original phrasing survived.
26. As a writer of a very short draft, I want to be told when overlap is not meaningful because there are no word pairs, so that a 0% does not alarm me.
27. As a judge or skeptical reader, I want every metric computed by the application with a documented method, so that I can trust the numbers are measured rather than invented by the model.
28. As a judge or skeptical reader, I want a methodology page explaining tokenization, sentiment, readability, overlap and Fact Guard, so that I can verify the approach.
29. As a writer, I want Fact Guard to warn me when a number, money amount, percentage, date, name or negation from my draft is missing in the rewrite, so that I can catch dropped facts before sending.
30. As a writer, I want Fact Guard warnings worded as "possible" issues, so that I understand they are heuristics.
31. As a writer, I want a "Copy rewrite" button with a confirmation announcement, so that I can paste the result elsewhere quickly.
32. As a developer or judge, I want a "Copy JSON" button that copies exactly the contract result object, so that I can inspect or reuse the structured output.

### Reliability and states

33. As a writer, I want a clear loading state with the Transform button disabled, so that I know work is in progress and cannot double-submit.
34. As a writer, I want only my most recent request's result shown, even if an older request finishes later, so that I never see a stale rewrite.
35. As a writer, I want a note when I have edited the draft or persona since the shown result, so that I know the result is out of date.
36. As a writer, I want specific, plain-language error messages (too long, empty, rate limited, AI unavailable, AI timed out, AI returned an unusable answer) with a Retry button where retrying makes sense, so that I know what to do next.
37. As a writer, I want the app to try a backup AI provider when the first one fails, so that a single provider outage does not break my demo.
38. As a demo presenter without API keys, I want a visibly labeled demo mode for the built-in example, so that the app still demonstrates the flow honestly.
39. As a demo presenter without API keys, I want any non-example input to explain that live AI is not configured, so that canned output never masquerades as a live AI result.

### Navigation and access

40. As any visitor, I want to refresh or directly open the home and methodology pages, so that links and bookmarks work.
41. As a visitor who mistypes a URL, I want a clear not-found page with a link home, so that I am not stranded or misled.
42. As a keyboard user, I want every control reachable with Tab and a visible focus indicator, so that I can use the whole app without a mouse.
43. As a screen reader user, I want labeled controls and announcements for loading, success, errors and copy actions, so that I know what happened.
44. As a user sensitive to motion, I want animations restrained and disabled when I prefer reduced motion, so that the app is comfortable to use.
45. As a mobile user, I want the layout to work on a narrow phone screen, so that I can use it anywhere.

### Privacy, security and operation

46. As a writer, I want my drafts neither stored nor logged by the app, so that sensitive text does not linger.
47. As a writer, I want a visible note that drafts are sent to an external AI provider and that free-tier providers may retain them, so that I can decide what to paste.
48. As an operator, I want API keys kept server-side and out of browser code, logs and version control, so that credentials are not leaked.
49. As an operator, I want request size limits and per-IP rate limiting, so that the demo deployment is not trivially abused or drained of quota.
50. As an operator, I want an example environment file listing variable names only, so that setup is easy without exposing secrets.
51. As a developer, I want lint, type-check, unit test, build and smoke-test commands, so that I can verify changes quickly.

## Implementation Decisions

### Platform and repository

- Single Next.js application (App Router, TypeScript) at the repository root, managed with npm and a committed lockfile. The repository currently contains only the AI governance kit; governance files are not modified.
- Tailwind (scaffold default) is used only for basic layout in this phase. No design system; the provided AI design will be applied in a later ticket.
- Model calls use plain HTTP via `fetch` (no provider SDKs) so the AI layer stays provider-agnostic and dependency-light.
- Hosting target is Vercel; local `npm run dev` is the fallback for live demos. The API route runs on the Node.js runtime with a maximum duration of 30 seconds.

### Route map

- Home: the transformer (form and results).
- Methodology: metric definitions, Fact Guard heuristics, limits, privacy and AI-processing disclosure.
- Transform API: POST only; other methods return 405 with a JSON error.
- Not-found: intentional 404 page with a working link home; unknown routes return a real 404 status.

### Modules (deep modules with small interfaces)

- **Metrics**: one entry point that takes the original and rewritten text and returns the ten contract metrics plus metric warnings. Internally composed of tokenizer, sentiment, readability and overlap units.
- **Fact Guard**: takes original and rewritten text, returns a list of warnings.
- **Personas**: the catalog of the four supported personas (stable ID, display name, short description, rewriting rules).
- **Prompt builder**: takes a persona and draft, returns provider-neutral system and user messages with the draft safely delimited.
- **AI provider chain**: takes the prompt, returns validated rewritten text plus which provider produced it, or a typed error. Contains a Gemini adapter, an OpenAI-compatible adapter and a demo provider; the network function is injectable for tests.
- **Transform service / API route**: parses and validates the request, enforces limits and rate limiting, calls the provider chain, runs Metrics and Fact Guard, and assembles and validates the response envelope.
- **Rate limiter**: fixed-window, in-memory, per client IP.
- **Client request hook**: owns request lifecycle state (idle, loading, success, error), duplicate-submit protection, abort of superseded requests, and stale-response rejection.
- **UI components**: form, result panel (side by side and word diff), metrics panel, Fact Guard list, copy buttons, labels and badges. Rendering is text-only; no HTML injection.

### Persona IDs

Stable wire IDs: `c_level`, `peer_feedback`, `legal_compliance`, `gen_z`. Display names are UI-only. The server rejects any other value.

### API contract

Request:

```json
{ "original_text": "string", "persona": "c_level | peer_feedback | legal_compliance | gen_z" }
```

Success (HTTP 200). `result` is exactly the required contract object; `meta` carries information the contract has no room for:

```json
{
  "result": {
    "persona": "c_level",
    "rewritten_text": "string",
    "metrics": {
      "word_count_original": 0, "word_count_new": 0, "word_count_change": 0,
      "sentiment_original": 0.0, "sentiment_new": 0.0, "sentiment_change": 0.0,
      "readability_original": 0.0, "readability_new": 0.0, "readability_change": 0.0,
      "phrase_overlap_percent": 0.0
    }
  },
  "meta": {
    "mode": "live | demo",
    "provider": "gemini | openai_compatible | demo",
    "warnings": [ { "code": "fact_missing | negation_missing | overlap_not_meaningful | short_text_low_reliability | non_english_metrics | empty_text_metrics", "message": "string" } ]
  }
}
```

- `result` is validated with a strict runtime schema: no extra or missing keys, every number finite. Metric values are sent unrounded; the UI rounds for display only.
- The model is only asked to return a JSON object with `rewritten_text`. The server sets `persona` and computes every metric.
- "Copy JSON" copies `result` only.

Error responses have the shape `{ "error": { "code", "message", "retryable" } }`:

- `INVALID_INPUT` (400): missing, non-string or whitespace-only draft; malformed JSON body; wrong content type.
- `UNSUPPORTED_PERSONA` (400).
- `INPUT_TOO_LONG` (413): draft over 4,000 characters after trimming, or raw body over 16 KB.
- `RATE_LIMITED` (429, with `Retry-After`).
- `PROVIDER_TIMEOUT` (504, retryable).
- `PROVIDER_UNAVAILABLE` (503, retryable).
- `INVALID_MODEL_RESPONSE` (502, retryable): malformed JSON or wrong shape from every provider.
- `EMPTY_OUTPUT` (502, retryable).
- `LIVE_AI_NOT_CONFIGURED` (503): demo mode with non-example input.
- `METHOD_NOT_ALLOWED` (405).

### Provider chain

- Configuration via environment variables: `AI_PROVIDERS` (ordered list, default `gemini,openai_compatible`), `GEMINI_API_KEY`, `GEMINI_MODEL`, `OPENAI_COMPAT_API_KEY`, `OPENAI_COMPAT_BASE_URL`, `OPENAI_COMPAT_MODEL`. Only providers with keys are active. Model IDs are configuration, not hardcoded guesses; defaults are confirmed against current provider docs during implementation.
- Each attempt has a 12-second timeout; the whole chain has a 25-second budget.
- Fall through to the next provider on timeout, HTTP 429 or 5xx, network error, malformed JSON, schema failure, or empty output. Non-retryable provider errors (for example invalid key) also fall through but are reported as `PROVIDER_UNAVAILABLE` if nothing succeeds.
- Gemini requests JSON output with a response schema; OpenAI-compatible requests JSON object output.
- If no provider has a key, the demo provider is active: it returns pre-written rewrites (one per persona) only for the built-in example draft, marked `mode: demo`; any other draft returns `LIVE_AI_NOT_CONFIGURED`. Metrics and Fact Guard still run for real on demo output.

### Prompting

- System message: global preservation rules (facts, names, dates, numbers, negation, uncertainty, conditions, commitments; no invented benefits, deadlines, obligations, promises or calls to action; proportionate length for short drafts; keep the draft's language) plus the selected persona's rules.
- The draft is placed inside explicit draft delimiters, with any delimiter lookalikes in the input neutralised, and the model is told the delimited content is material to rewrite, never instructions.
- The legal disclaimer is shown in the UI, not inserted into `rewritten_text`, so metrics are not polluted.

### Metric definitions

- **Normalization**: Unicode NFKC; curly apostrophes converted to straight.
- **Tokenization**: a word is a maximal run of Unicode letters, marks or digits, optionally joined by internal apostrophes. Contractions count as one word; hyphenated words split; punctuation and emoji are not words; line breaks and bullet markers are separators. A run of CJK characters counts as one token (documented limitation).
- **Word count**: number of tokens.
- **Sentiment**: VADER compound score using the MIT-licensed VADER lexicon and rules, vendored with attribution. Text is split into sentences; the score is the mean of sentence compound scores, bounded to [-1, +1]. Empty text scores 0. Labeled an estimate.
- **Readability**: Flesch Reading Ease, 206.835 − 1.015 × (words ÷ sentences) − 84.6 × (syllables ÷ words). Sentences split on runs of `.`, `!`, `?` and on line breaks (so bullets are sentences), minimum one. Syllable estimator: lowercase, letters only; words of three letters or fewer count as one; drop a trailing silent `e`, `es` or `ed` (not `le`); count vowel groups (`a e i o u y`); minimum one. Numeric tokens count as one syllable. Zero words returns 0 with an `empty_text_metrics` warning; fewer than 30 words in either text adds `short_text_low_reliability`. Scores may fall outside 0 to 100.
- **Phrase overlap**: lowercase and tokenize as above (punctuation removed, so it does not break pairs); build the set of unique adjacent-word bigrams for each text; Jaccard similarity (intersection ÷ union) × 100. If the union is empty, return 0 and add `overlap_not_meaningful`.
- **Changes**: new minus original, computed from unrounded values.
- **Finiteness**: every numeric output is checked; non-finite values are a server bug and fail schema validation rather than being sent.
- **Language**: if fewer than half the letters in the original are Latin script, add `non_english_metrics`.

### Fact Guard (warn-only heuristic)

- Extract from the original: numbers (with thousands separators normalized, decimals, percentages, currency amounts and shorthand such as `5k`), number words zero to twenty mapped to digits, dates (month names, ISO dates, weekdays), capitalized multi-word names and capitalized words that do not start a sentence, and negation markers (not, no, never, `n't`, cannot, without, unless, none, nobody).
- Check each extracted item case-insensitively in the rewrite, accepting digit/word equivalents. Each missing item produces `fact_missing` naming the item. Negation present in the original but absent from the rewrite produces `negation_missing`.
- No automatic retry. Warnings are framed as "possible" issues and linked to the methodology page.

### Client behavior

- Request lifecycle: every submission gets an increasing request ID and its own abort controller; starting a new request aborts the previous one; a response is applied only if its ID is current. An in-flight guard ignores repeat submits while loading.
- The draft is never cleared by errors. A "draft changed since this result" note appears when the draft or persona differs from the one the shown result was produced from.
- Word diff is computed in the browser from the two texts; insertions and deletions use semantic insert/delete markup with underline/strikethrough and a legend.
- Focus moves to the results heading on success and to the error message on failure; status changes are announced via a live region.

### Security and privacy

- Keys exist only in server environment variables; nothing provider-related is exposed to the browser bundle.
- Request body read as text with a 16 KB cap before JSON parsing; content type must be JSON.
- Rate limit: 10 requests per minute per IP, fixed window, in memory. Documented limitation: on serverless each instance has its own counter and counters reset on cold start; a shared store would be needed for real protection.
- Server logs contain only error code, provider and latency; never draft or rewrite text.
- User and model text are rendered as text only, never as HTML.
- An example environment file contains placeholder variable names only; real env files are git-ignored.
- The UI and README disclose that drafts are processed by an external AI provider and that free-tier Gemini traffic may be used by Google to improve its products.

## Testing Decisions

- **What makes a good test**: it exercises a public interface with realistic inputs and asserts observable outputs (HTTP status and body, returned metrics, rendered state), not internal helpers or call order. Tests should survive refactors of internals.
- **Seam 1, primary: the transform API route handler**, called directly with constructed requests and an injected fake network function for providers. Covers persona validation, empty/whitespace/oversized drafts, body size and content type, rate limiting, provider timeout/5xx/429/malformed JSON/wrong shape/empty output, fallback order, demo mode behavior, envelope schema validity, Fact Guard warnings in the response, and the guarantee that draft text never reaches logs.
- **Seam 2: the metrics entry point**, tested with tables of inputs: contractions (straight and curly), hyphens, punctuation, emoji, line breaks, bullets, Unicode letters, HTML-like text, empty and one-word input, identical and disjoint texts for overlap, no-bigram inputs, known Flesch and syllable values, VADER negation and bounds, change arithmetic on unrounded values, and finiteness.
- **Seam 3: the client request hook**, run against a fake `fetch` with controllable timing: double submit sends one request, a late older response never replaces a newer one, errors keep the draft, and retry resubmits.
- **Route smoke tests** against the production build: home and methodology return 200 on direct load, an unknown path returns 404 with a link home, GET on the transform API returns 405.
- **Manual checks**: desktop and mobile widths, keyboard-only pass, visible focus, and live-region announcements, done in a real browser.
- **Prior art**: the repository has only Python governance tests (pytest-style tests for the logging script); there is no JavaScript test prior art. App tests use Vitest, live next to the code they test (not in the governance-owned tests folder), and smoke tests live in their own folder.
- **Not tested automatically**: real provider output quality per persona (requires live keys and is non-deterministic); this is verified manually with real keys if available and otherwise reported as unverified.

## Out of Scope

- The final visual design (to be supplied as an AI-generated design and applied in a later ticket); any design system.
- Authentication, user accounts, saved history, databases or any persistence of drafts.
- Streaming responses.
- Automatic Fact Guard retries or self-correction loops.
- Rule-based rewriting for arbitrary text in demo mode.
- Additional personas or custom persona editing.
- Shared-store rate limiting, CAPTCHA, or other production-grade abuse protection.
- Accurate metrics for non-English text (warned, not solved).
- Analytics, dashboards, integrations (Slack, email), browser extensions.
- Deployment itself (instructions are provided; deploying is an external action requiring confirmation).
- Any change to the AI governance files.

## Further Notes

- Prompt logging: under the repository rules, each user message to a non-hook assistant must be logged before work starts. On this machine `python3` is unavailable, so the logging command runs with `python`.
- The repository lives inside OneDrive; syncing `node_modules` and build output can cause file-lock errors and slow builds on Windows. Moving the project out of OneDrive is recommended but not required.
- Winning or impressing judges is not guaranteed; the differentiators (transparent, code-computed metrics with a methodology page, word-level highlighting, and Fact Guard) are chosen because they are honest, deterministic and demo well.
