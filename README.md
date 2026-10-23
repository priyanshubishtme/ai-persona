# Alter: AI Communication Transformer

Alter rewrites one draft for four audiences while keeping the facts. You paste a message, choose a persona (or all four at once), and get a rewrite. The rewrite comes with a word-level diff, a Fact Guard check, and metrics that the server computes in code. The AI never reports its own numbers.

| Persona | ID | Audience | Style |
|---|---|---|---|
| C-Level | `c_level` | Executives | 2–4 crisp sentences or exactly 3 bullets: outcomes, risks, decisions, next steps |
| Peer feedback | `peer_feedback` | Colleagues | Short, warm, specific and actionable |
| Legal notice | `legal_compliance` | Compliance readers | Neutral, formal; keeps every obligation, condition and timeline (labeled "not legal advice") |
| Gen-Z hype | `gen_z` | Social feeds | Energetic, short sentences, light slang; keeps every caveat |

## Features

- **All four personas at once.** Each card loads, fails and retries on its own.
- **Word diff** ("Show changes"): removed words are struck through and added words are highlighted.
- **Fact Guard** (warn-only): flags numbers, dates, money, percentages, names and negations ("not", "never") from the draft that are missing from the rewrite.
- **Metrics:** word count, sentiment (VADER), readability (Flesch Reading Ease) and phrase overlap (bigram Jaccard), each with the change from original to rewrite.
- **Reading time and time saved**, at 238 words per minute.
- **Copy text** and **Copy JSON** (the exact contract object), plus **Listen** (browser speech synthesis).
- **Quick presets:** three example drafts, which also work in demo mode.
- **Labeled demo mode:** with no API keys, the built-in examples return hand-written rewrites, clearly marked "Demo". Custom drafts ask you to configure live AI.
- **/methodology** explains every metric and limit, and there is a custom 404 page.

## Tech stack

Next.js 16 (App Router, Turbopack), React 19, TypeScript, Tailwind CSS v4, Zod 4, `diff`, lucide-react, and a vendored copy of VADER (`vader-sentiment` 1.1.3, Apache-2.0; see `src/lib/metrics/vader/LICENSE` and `NOTICE`). Tests use Vitest 5, jsdom and Testing Library. Requires Node 24 and npm.

## Getting started

```powershell
npm ci
Copy-Item .env.example .env.local   # then paste your keys into .env.local
npm run dev                         # http://localhost:3000
```

With no keys in `.env.local`, the app runs in demo mode. `.env.local` is git-ignored; never commit real keys.

## Environment variables

All of these are server-side only; none are exposed to the browser.

| Variable | Required | Example | Notes |
|---|---|---|---|
| `AI_PROVIDERS` | No | `gemini,openai_compatible` | Order to try. Providers without a key are skipped. |
| `GEMINI_API_KEY` | For Gemini | — | From Google AI Studio |
| `GEMINI_MODEL` | No | `gemini-3.5-flash-lite` | Default `gemini-3.5-flash-lite`. `gemini-2.5-flash` is closed to new users. |
| `GEMINI_THINKING_LEVEL` | No | `minimal` | Sent as `thinkingConfig.thinkingLevel` only when set |
| `OPENAI_COMPAT_API_KEY` | For fallback | — | Any OpenAI-compatible API (Paper Instruments, OpenAI, OpenRouter, Groq, ...) |
| `OPENAI_COMPAT_BASE_URL` | For fallback | `https://api.paperinstruments.com/v1` | `/chat/completions` is appended |
| `OPENAI_COMPAT_MODEL` | For fallback | `ultramarine-1-flash` | |
| `OPENAI_COMPAT_REASONING_EFFORT` | No | `low` | Sent as `reasoning_effort` only when set. Ultramarine defaults to `max`, which is too slow for the timeout. |

## How a request works

1. The browser sends `POST /api/transform` with `{ "original_text": "...", "persona": "c_level" }`. "All four" sends four requests in parallel.
2. The server checks the request:
   - rate limit: 40 requests per minute per IP;
   - JSON content type, and a body no larger than 16 KB;
   - a draft of 1 to 4,000 characters, and a supported persona.
3. The server builds the prompt. The draft goes inside `<draft>` tags and is treated as data, not instructions. Delimiter lookalikes inside the draft are neutralised.
4. Providers are tried in `AI_PROVIDERS` order. Each attempt has a 12 s timeout, all attempts together have a 25 s budget, and the server falls back to the next provider on timeout or failure. The model returns only `{ "rewritten_text": "..." }`.
5. The server computes the metrics and runs Fact Guard. It validates the response against the Zod contract and returns it with `Cache-Control: no-store`.
6. Server logs record only `{ event, outcome, provider, ms }`. Drafts and rewrites are never logged or stored.

### Success response (`200`)

```json
{
  "result": {
    "persona": "c_level",
    "rewritten_text": "...",
    "metrics": {
      "word_count_original": 42, "word_count_new": 25, "word_count_change": -17,
      "sentiment_original": -0.12, "sentiment_new": 0.05, "sentiment_change": 0.17,
      "readability_original": 61.3, "readability_new": 48.9, "readability_change": -12.4,
      "phrase_overlap_percent": 18.2
    }
  },
  "meta": { "mode": "live", "provider": "gemini", "warnings": [] }
}
```

`result` is the exact contract object. All numbers are finite, and every `*_change` value is the new value minus the original. `meta.warnings[].code` is one of `fact_missing`, `negation_missing`, `overlap_not_meaningful`, `short_text_low_reliability`, `non_english_metrics` or `empty_text_metrics`.

### Errors

Errors return `{ "error": { "code", "message", "retryable" } }`.

| Code | Status | Retryable |
|---|---|---|
| `INVALID_INPUT`, `UNSUPPORTED_PERSONA` | 400 | No |
| `INPUT_TOO_LONG` | 413 | No |
| `RATE_LIMITED` | 429 (with `Retry-After`) | Yes |
| `PROVIDER_TIMEOUT` | 504 | Yes |
| `PROVIDER_UNAVAILABLE`, `LIVE_AI_NOT_CONFIGURED` | 503 | Depends on cause |
| `INVALID_MODEL_RESPONSE`, `EMPTY_OUTPUT` | 502 | Yes, except when the provider declines the draft |
| `METHOD_NOT_ALLOWED` | 405 | No |
| `INTERNAL_ERROR` | 500 | Yes |

## Metrics

| Metric | How it is computed |
|---|---|
| Words | Unicode word tokens (letters, marks and digits, with inner apostrophes), after NFKC normalisation |
| Sentiment | Mean VADER compound score across sentences, from −1 to 1 |
| Readability | Flesch Reading Ease, using a heuristic syllable counter; higher means easier |
| Phrase overlap | Jaccard similarity of word bigrams between draft and rewrite, as a percentage |

VADER and Flesch are designed for English. The app warns when text is mostly non-Latin script, or shorter than 30 words, because the scores are less reliable there. See `/methodology` for details.

## Routes

| Route | Description |
|---|---|
| `/` | Landing page and studio (`#studio`, `#platform`) |
| `/methodology` | How the metrics, Fact Guard and diff work; limits; privacy; demo mode |
| `/api/transform` | `POST` only; other methods return 405 |
| anything else | Custom 404 page |

## Project structure

```
src/
  app/                 layout, home, /methodology, not-found, api/transform/route.ts
  components/          site header/footer, hero, feature cards
  components/studio/   Studio form, ResultCard, MetricsTable, DiffText, Copy/Listen buttons
  hooks/               useTransformRun (run IDs, abort, retry, duplicate guard), reduced motion
  lib/contract.ts      Zod schemas, limits, warning and error codes
  lib/transform.ts     request handler (validation, rate limit, chain, metrics, envelope)
  lib/ai/              Gemini and OpenAI-compatible adapters, demo provider, fallback chain, env config
  lib/metrics/         tokenizer, overlap, readability, sentiment, vendored VADER
  lib/factGuard.ts     fact and negation check
  lib/personas.ts      persona rules
  lib/prompt.ts        injection-resistant prompt builder
  lib/presets.ts       example drafts and demo rewrites
e2e/smoke.mjs          route smoke test against a running server
.scratch/ai-communication-transformer/   spec.md and tickets
```

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Development server |
| `npm run build` / `npm start` | Production build and server |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Vitest unit and component tests |
| `npm run smoke` | Route smoke test; set `BASE_URL` to test a deployment (default `http://localhost:3000`) |

## Deploying to Vercel

`vercel.json` pins the Next.js framework, `npm ci` and `npm run build`, and marks `/api/*` as `no-store`. The transform route sets `maxDuration = 30`.

1. Import the repository in Vercel, or run `vercel` from the project root.
2. In **Project → Settings → Environment Variables**, add the variables from the table above for Production and Preview.
3. Deploy. Then run `BASE_URL=https://<your-app>.vercel.app npm run smoke`, or in PowerShell: `$env:BASE_URL="https://<your-app>.vercel.app"; npm run smoke`.
4. Redeploy after changing environment variables. The "Live AI" or "Demo" label on `/` is decided at build time.

## Security and privacy

- API keys stay on the server; the browser only calls `/api/transform`.
- Drafts and rewrites are never logged, stored or cached.
- Security headers are set in `next.config.ts`: `X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options: DENY` and `Permissions-Policy`. The `X-Powered-By` header is turned off.
- The Gemini free tier may use prompts to improve Google products. Use a paid key for sensitive drafts.

## Known limitations

- The rate limiter is in memory, per server instance. On Vercel, each instance counts separately.
- Fact Guard catches common patterns, not everything. It can miss a name at the start of a sentence and paraphrased numbers.
- The syllable counter is a heuristic, so Flesch scores are approximate.
- Legal-notice output is a style rewrite, not legal advice.
- `npm audit` reports high-severity advisories in the `braces` chain, pulled in by `eslint-config-next`. This is a development-only dependency and is not shipped to the browser.

---

# AI Prompt Governance Kit

Every prompt a member types to an AI assistant in this repo is logged word for word (never the AI's response) to `.ai-analytics/<member>.jsonl`, committed with their work, and categorized on a fixed rubric. `REPORT.md` summarizes it per member.

## Setup

**Repo owner, once:**
1. Put the zip in your project folder, open the project in Claude Code or Copilot (agent mode), and type:
   `Unzip ai-prompt-governance-kit.zip into the project root, keeping hidden files, then delete the zip.`
2. Commit and push everything.
3. Start a new AI chat. The AI asks for your email, project name and GitHub username, and finishes the setup itself. Commit and push again.
4. On GitHub → Settings → Rules → Rulesets, add a ruleset for `main`: require a pull request, require review from Code Owners, require the `check` status check, block force pushes, restrict deletions, and **leave the bypass list empty** so the rules apply to the owner too. (The AI can't do this step for you.)

**Each member, once:** pull the latest code and open the project in Claude Code or Copilot. In the first AI chat, the AI asks for their email and sets everything up. After that the setup check finishes instantly and stays silent. (Python 3.10+ must be installed.)

Setup is remembered per member and per copy of the project (in `.git/ai-governance-ready`). The rules in `AGENTS.md` are still loaded by the IDE in every chat; that is automatic and needs nothing from anyone.

## How the rules are enforced
| Rule | Claude Code | GitHub Copilot (VS Code agent, Copilot CLI) | Cursor, Codex, others |
|---|---|---|---|
| Log every prompt, word for word | Hook (automatic) | Hook (automatic) | Instruction in `AGENTS.md` only |
| AI can't edit logs or governance files | Hook blocks it | Hook blocks it | Instruction only |
| Ask before `git push` | Hook asks | Hook asks | Instruction only |
| No one (owner included) can change or delete a logged prompt | Hook blocks the AI and logs the attempt | Hook blocks the AI and logs the attempt | Instruction only |
| Same, for edits made by hand | Pre-commit hook blocks the commit; CI fails the PR and opens a "tampering" issue | same | same |
| Rule files can't change without admin | CODEOWNERS review | CODEOWNERS review | CODEOWNERS review |
| Other rules in `AGENTS.md` (prompt-injection, code quality) | Instruction | Instruction | Instruction |

Hooks live in `.claude/settings.json` (Claude Code; Copilot reads it too) and `.github/hooks/ai-governance.json` (Copilot). If both fire for one prompt, it is logged once.

## Fixed rubric (5 categories + other)
Defined in `ai-governance.json` → `categories`, in this priority order:
`code_push_to_github`, `code_deletion`, `code_review`, `brainstorming`, `code_generation`.
- Most keyword hits wins; a tie goes to the category listed first.
- A prompt gets exactly one category.
- No hits → `other` (e.g. "fix this bug", "explain this"). Add keywords if too many prompts land here.

## Report
`python3 scripts/log_prompt.py report --out .ai-analytics/REPORT.md`, then commit it. It has a per-member summary table, then every prompt per member with time, tool and category (prompts over 300 characters are cut in the report; the full text stays in the `.jsonl`).

## Why the logs can't be changed silently
- Each log line stores the hash of the line before it. Changing or deleting any earlier line breaks the chain, and both `verify` and `REPORT.md` show **Log integrity: FAILED**.
- CI compares every PR and every push to `main` against the previous version and fails if any existing line changed. It then opens a GitHub issue naming who did it.
- The CI check runs from the `main` branch's copy of the workflow and script, so a PR can't switch the check off by editing them.
- Attempts the hooks block are written to the log as `blocked_change` events and listed in `REPORT.md`.

## Things to know
- The repo owner controls the GitHub settings, so in the end they *can* turn rules off, delete issues or rewrite history. What this kit guarantees is that it can't be done **silently**: every member's clone keeps the old history, and `python3 scripts/log_prompt.py verify --base <old commit>` in any clone shows exactly what changed. For proof the owner can't touch, have someone outside the repo (e.g. a faculty mentor) keep a clone or periodically download the logs.
- What no IDE can enforce: a member can switch hooks off on their own machine, use an AI tool without hooks, or not commit their log. CI warns when a PR has no new log lines; treat that as a question to ask, not as proof AI wasn't used.
- The VS Code hooks feature is in Preview and an organization policy can disable it, so do step 5 of setup.
- Copilot inline autocomplete (grey suggestions while typing) has no prompt and is not logged.
- Full prompt text is stored and committed, so it stays in git history permanently and anyone with repo access can read it. Secrets matching common patterns (passwords, API keys, tokens, private keys) are redacted first, but redaction is best-effort: tell members never to paste secrets or personal data into prompts. Set `store_prompt_text` to `false` to keep categories only.
- `.gitattributes` uses `merge=union`, so log files don't conflict when branches merge.
- Identity is whatever each member puts in git config, and members can skip committing their log. Missing logs mean missing data, not zero AI use.
- Spot-check 20–30 entries against the rubric before trusting the numbers.
- `AGENTS.md` is the source of truth; copy its body into `.github/copilot-instructions.md` after edits (a test checks this).
