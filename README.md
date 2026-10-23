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
