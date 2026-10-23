#!/usr/bin/env python3
"""Log each AI prompt per member into the repo and categorize it on a fixed rubric. Python 3.10+, stdlib only.

  setup   one-time setup per member and clone; runs automatically when an AI session starts
  hook    prompt-submit hook (Claude Code, Copilot): reads JSON on stdin, never blocks the prompt
  log     assistants without hooks: user's exact prompt on stdin (or --prompt "...")
  guard   pre-tool-use hook: denies AI edits to logs/rules (and logs the attempt), asks before git push
  report  markdown report per member from every .ai-analytics/*.jsonl (add --out FILE to save)
  verify  integrity check: hash chain intact; with --base REF, nothing changed or removed since REF

Logs are append-only for everyone, the repo owner included: each line stores the hash of the line
before it, so changing or deleting any earlier line breaks the chain and verify/report flag it.
"""
import argparse
import hashlib
import json
import os
import re
import subprocess
import sys
import uuid
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CONFIG = json.loads((ROOT / "ai-governance.json").read_text(encoding="utf-8"))
LOG_DIR = ROOT / CONFIG.get("log_dir", ".ai-analytics")
OTHER = "other"

SECRET_PATTERNS = [
    (re.compile(r"-----BEGIN [A-Z ]*PRIVATE KEY-----.*?-----END [A-Z ]*PRIVATE KEY-----", re.S), "[REDACTED_PRIVATE_KEY]"),
    (re.compile(r"(?i)\b(api[_-]?key|access[_-]?token|auth[_-]?token|secret|password|passwd|pwd|token)(\s*(?:[:=]|\bis\b)\s*)['\"]?[^\s'\";,]+"), r"\1\2[REDACTED]"),
    (re.compile(r"(?i)\bbearer\s+[A-Za-z0-9._~+/=-]+"), "Bearer [REDACTED]"),
    (re.compile(r"\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+"), "[REDACTED_JWT]"),
    (re.compile(r"\bsk-[A-Za-z0-9_-]{16,}"), "[REDACTED_API_KEY]"),
    (re.compile(r"\bAKIA[0-9A-Z]{16}\b"), "[REDACTED_AWS_KEY]"),
    (re.compile(r"\bgh[pousr]_[A-Za-z0-9_]{20,}\b"), "[REDACTED_GITHUB_TOKEN]"),
]
# ponytail: regex redaction is best-effort and the logs are committed; a central server is the upgrade if prompts hold sensitive data.


def redact(text):
    for pattern, replacement in SECRET_PATTERNS:
        text = pattern.sub(replacement, text)
    return text


def classify(prompt, categories=CONFIG["categories"]):
    """Most keyword hits wins; ties go to the category listed first; no hits -> other."""
    low = " ".join(prompt.lower().split())
    best, best_hits = OTHER, 0
    for cat in categories:
        # ponytail: word-start keyword match; swap for an ML classifier if spot-checks show it's too coarse
        hits = sum(1 for kw in cat["keywords"] if re.search(r"(?<![a-z0-9])" + re.escape(kw.lower()), low))
        if hits > best_hits:
            best, best_hits = cat["name"], hits
    return best, best_hits


def identity():
    try:
        email = subprocess.check_output(["git", "config", "--get", "user.email"], cwd=ROOT,
                                        stderr=subprocess.DEVNULL, text=True, timeout=2).strip()
    except Exception:
        email = ""
    return (email or os.environ.get("AI_ANALYTICS_USER") or os.environ.get("USER")
            or os.environ.get("USERNAME") or "unknown")


def member_file(member):
    # one file per member: members never append to the same file, so pushes don't conflict
    return LOG_DIR / (re.sub(r"[^A-Za-z0-9]+", "_", member).strip("_").lower() + ".jsonl")


def record(prompt, tool, session_id=None):
    if not isinstance(prompt, str) or not prompt.strip():
        return None
    member = identity()
    category, hits = classify(prompt)
    event = {
        "event_type": "prompt",
        "prompt_id": uuid.uuid4().hex[:12],
        "timestamp_utc": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "member": member,
        "tool": tool,
        "project": CONFIG.get("project", "CHANGE_ME"),
        "session_id": session_id,
        "category": category,
        "keyword_hits": hits,
        "prompt_chars": len(prompt),
        "prompt": redact(prompt) if CONFIG.get("store_prompt_text", False) else None,
    }
    path = member_file(member)
    if is_duplicate(path, event, prompt):
        return None
    event["prompt_sha256"] = sha(prompt)
    return append_event(path, event)


def sha(text):
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def append_event(path, event):
    """The only way anything is written to a log: append one line chained to the previous line."""
    path.parent.mkdir(parents=True, exist_ok=True)
    lines = [l for l in path.read_text(encoding="utf-8").splitlines() if l.strip()] if path.exists() else []
    event["prev_hash"] = sha(lines[-1]) if lines else "GENESIS"
    with path.open("a", encoding="utf-8") as f:
        f.write(json.dumps(event, ensure_ascii=False) + "\n")
    return event


def is_duplicate(path, event, prompt, window_s=30):
    """Same member, same prompt text, within window_s seconds -> the same prompt seen by two hook files."""
    if not path.exists():
        return False
    digest = sha(prompt)
    now_ts = datetime.fromisoformat(event["timestamp_utc"])
    for line in path.read_text(encoding="utf-8").splitlines()[-20:]:
        try:
            old = json.loads(line)
            if old.get("prompt_sha256") == digest and (now_ts - datetime.fromisoformat(old["timestamp_utc"])).total_seconds() < window_s:
                return True
        except (ValueError, KeyError):
            pass
    return False


# ---------- guard: rules the IDE enforces through pre-tool-use hooks ----------
PROTECTED = [".ai-analytics/", "scripts/log_prompt.py", ".claude/settings", ".github/hooks/", ".github/workflows/ai-governance",
             "CODEOWNERS", ".githooks/", "AGENTS.md", "CLAUDE.md", "copilot-instructions.md", "ai-governance.json", ".gitattributes"]
UNPROTECTED = [".ai-analytics/REPORT.md"]
READ_TOOL = re.compile(r"(?i)read|view|grep|glob|search|list|find|fetch")
SAFE_SHELL = re.compile(r"^\s*(git\s+(add|commit|status|diff|log|show)\b|(cat|head|tail|less|wc|ls|grep)\b|python3?\s+\S*scripts/log_prompt\.py\s+(report|setup|verify)\b)")
LOG_CMD = re.compile(r"^\s*(python3?\s+\S*scripts/log_prompt\.py\s+log\b|@'.*\|\s*python3?\s+\S*scripts/log_prompt\.py\s+log\b)", re.S)
LOCKED = ("Repository rule: prompt logs are append-only and the governance files are locked, for every member "
          "including the repo owner. This attempt has been logged.")
GIT_PUSH = re.compile(r"\bgit\b[^;&|\n]*\bpush\b")  # may also ask on e.g. a commit message containing "push"; asking is harmless


def strings_in(value):
    if isinstance(value, str):
        try:
            parsed = json.loads(value)
            if isinstance(parsed, (dict, list)):
                return strings_in(parsed)
        except ValueError:
            pass
        return [value]
    if isinstance(value, dict):
        return [s for v in value.values() for s in strings_in(v)]
    if isinstance(value, list):
        return [s for v in value for s in strings_in(v)]
    return []


def touches_protected(text):
    text = text.replace("\\", "/")
    for safe in UNPROTECTED:
        text = text.replace(safe, "")
    return any(p in text for p in PROTECTED)


def guard_decision(payload):
    """Return (decision, reason) with decision in allow/ask/deny. Works for Claude-style and Copilot payloads."""
    tool = str(payload.get("tool_name") or payload.get("toolName") or "")
    args = payload.get("tool_input", payload.get("toolArgs", {}))
    if isinstance(args, str):
        try:
            args = json.loads(args)
        except ValueError:
            args = {"command": args}
    command = args.get("command") if isinstance(args, dict) and isinstance(args.get("command"), str) else None

    if command is not None:
        if LOG_CMD.match(command):
            return "allow", ""
        if GIT_PUSH.search(command):
            return "ask", "Repository rule: pushing to GitHub needs the member's confirmation."
        # ponytail: string checks, not a shell parser; a determined member can still edit files by hand -- CI verify catches log tampering
        if touches_protected(command) and not (SAFE_SHELL.match(command) and not re.search(r"[;&|>`]|\$\(", command)):
            return "deny", LOCKED
        return "allow", ""
    if READ_TOOL.search(tool):
        return "allow", ""
    if any(touches_protected(s) for s in strings_in(args)):
        return "deny", LOCKED
    return "allow", ""


def log_blocked(payload, reason):
    tool = str(payload.get("tool_name") or payload.get("toolName") or "?")
    target = " ".join(" ".join(strings_in(payload.get("tool_input", payload.get("toolArgs", {})))).split())
    member = identity()
    append_event(member_file(member), {
        "event_type": "blocked_change",
        "timestamp_utc": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "member": member,
        "tool": tool,
        "attempt": redact(target)[:500],
        "reason": reason,
    })


def guard():
    try:
        payload = json.load(sys.stdin)
        decision, reason = guard_decision(payload)
    except Exception:
        decision, reason = "allow", ""  # unreadable payload: fall back to the IDE's normal permissions
    if decision == "deny":
        try:
            log_blocked(payload, reason)
        except Exception as exc:
            print(f"ai-analytics: blocked attempt not logged ({exc})", file=sys.stderr)
    if decision == "allow":
        print("{}")
        return
    # top-level keys for Copilot, hookSpecificOutput for Claude Code
    print(json.dumps({"permissionDecision": decision, "permissionDecisionReason": reason,
                      "hookSpecificOutput": {"hookEventName": "PreToolUse", "permissionDecision": decision,
                                             "permissionDecisionReason": reason}}))


# ---------- verify: nobody can change or delete a logged line ----------
def chain_problems(text, name):
    """Every line must point at an earlier line's hash (or GENESIS). Editing or deleting a line breaks the next one."""
    problems, seen = [], set()
    for n, line in enumerate(text.splitlines(), 1):
        if not line.strip():
            continue
        try:
            prev = json.loads(line).get("prev_hash")
        except (ValueError, AttributeError):
            problems.append(f"{name}: line {n} is not a valid log entry")
            continue
        if prev != "GENESIS" and prev not in seen:  # union merges can fork the chain, so any earlier line is accepted
            problems.append(f"{name}: line {n} -- a line before it was changed or deleted")
        seen.add(sha(line))
    return problems


def append_only_problems(old, new, name):
    if new is None:
        return [f"{name}: log file was deleted"]
    if not new.startswith(old):
        return [f"{name}: existing log lines were changed or removed (logs are append-only)"]
    return []


def git(*args):
    r = subprocess.run(["git", *args], cwd=ROOT, capture_output=True, text=True)
    return r.stdout if r.returncode == 0 else None


def log_files(source=None):
    """{relative path: text} of every .jsonl log in the working tree (None), the index ("staged") or a git ref."""
    rel = CONFIG.get("log_dir", ".ai-analytics").strip("/")
    if source is None:
        return {f"{rel}/{p.name}": p.read_text(encoding="utf-8") for p in sorted(LOG_DIR.glob("*.jsonl"))}
    names = git("ls-files", "--", f"{rel}/") if source == "staged" else git("ls-tree", "-r", "--name-only", source, "--", f"{rel}/")
    prefix = ":" if source == "staged" else f"{source}:"
    return {n: git("show", prefix + n) or "" for n in (names or "").split() if n.endswith(".jsonl")}


def integrity_problems(base=None, head=None):
    files = log_files(head)
    problems = [p for name, text in files.items() for p in chain_problems(text, name)]
    if base and git("rev-parse", "--verify", "--quiet", base + "^{commit}"):
        for name, old in log_files(base).items():
            problems += append_only_problems(old, files.get(name), name)
    return problems


# ---------- setup: once per member, automatically ----------
def setup(project=None, owner=None):
    """Idempotent. Turns on the local commit lock, checks the member's identity, fills the kit's placeholders once."""
    marker = ROOT / ".git" / "ai-governance-ready"
    if marker.exists() and (git("config", "--get", "core.hooksPath") or "").strip() == ".githooks":
        return []  # already set up for this member: nothing to read or do
    todo = []
    if (ROOT / ".git").is_dir():
        if (git("config", "--get", "core.hooksPath") or "").strip() != ".githooks":
            git("config", "core.hooksPath", ".githooks")
    else:
        todo.append("This folder is not a git repository yet; prompt logging needs git.")
    for path, placeholder, value, ask in [
        (ROOT / "ai-governance.json", '"project": "CHANGE_ME"', project and f'"project": {json.dumps(project)}', "the project name"),
        (ROOT / ".github" / "CODEOWNERS", "@CHANGE_ME_ADMIN", owner and "@" + owner.lstrip("@"), "the repo owner's GitHub username"),
    ]:
        text = path.read_text(encoding="utf-8") if path.exists() else ""
        if placeholder in text:
            if value:  # placeholders can be filled once; after that the file is locked
                path.write_text(text.replace(placeholder, value), encoding="utf-8")
            else:
                todo.append(f"Repo owner only: ask for {ask}, then run `python3 scripts/log_prompt.py setup --project NAME --owner GITHUB_USERNAME`.")
    if not (git("config", "--get", "user.email") or "").strip():
        todo.append("Ask the user for their university email, then run `git config user.email THEIR_EMAIL`. "
                    "Their AI prompts are logged under this email.")
    if not todo and (ROOT / ".git").is_dir():
        marker.write_text(datetime.now(timezone.utc).isoformat(timespec="seconds") + "\n", encoding="utf-8")
    return todo


def read_events():
    events = []
    for path in sorted(LOG_DIR.glob("*.jsonl")):
        for n, line in enumerate(path.read_text(encoding="utf-8").splitlines(), 1):
            if line.strip():
                try:
                    events.append(json.loads(line))
                except json.JSONDecodeError:
                    print(f"warning: skipped bad line {path.name}:{n}", file=sys.stderr)
    return events


def report_md(events, problems=()):
    cats = [c["name"] for c in CONFIG["categories"]] + [OTHER]
    integrity = (["**Log integrity: FAILED. Logged lines were changed or deleted:**", ""] + [f"- {p}" for p in problems]
                 if problems else ["Log integrity: OK (no logged line has been changed or deleted)."]) + [""]
    blocked = [e for e in events if e.get("event_type") == "blocked_change"]
    events = [e for e in events if e.get("event_type", "prompt") == "prompt"]
    if not events and not blocked:
        return "# AI Prompt Report\n\n" + "\n".join(integrity) + "\nNo prompts logged yet.\n"
    by_member = defaultdict(list)
    for e in events:
        by_member[e.get("member", "unknown")].append(e)
    stamps = sorted(e["timestamp_utc"] for e in events + blocked)
    lines = [
        "# AI Prompt Report", "",
        f"Project: {CONFIG.get('project')} · Prompts: {len(events)} · Members: {len(by_member)} · "
        f"Blocked change attempts: {len(blocked)} · Period: {stamps[0][:10]} to {stamps[-1][:10]}", "",
        *integrity,
        "| Member | Total | Active days | Tools | " + " | ".join(cats) + " |",
        "|---|---:|---:|---|" + "---:|" * len(cats),
    ]
    for member, rows in sorted(by_member.items(), key=lambda kv: -len(kv[1])):
        counts = Counter(e.get("category", OTHER) for e in rows)
        days = len({e["timestamp_utc"][:10] for e in rows})
        tools = ", ".join(sorted({e.get("tool", "?") for e in rows}))
        cells = [f"{counts[c]} ({counts[c] / len(rows) * 100:.0f}%)" if counts[c] else "0" for c in cats]
        lines.append(f"| {member} | {len(rows)} | {days} | {tools} | " + " | ".join(cells) + " |")
    if blocked:
        lines += ["", "## Blocked attempts to change logs or rules", "", "| Time (UTC) | Member | Tool | Attempt |", "|---|---|---|---|"]
        for e in sorted(blocked, key=lambda e: e["timestamp_utc"]):
            attempt = " ".join(str(e.get("attempt", "")).split()).replace("|", "\\|")[:200]
            lines.append(f"| {e['timestamp_utc'][:16].replace('T', ' ')} | {e.get('member')} | {e.get('tool')} | {attempt} |")
    lines += ["", "## Prompts by member", ""]
    for member, rows in sorted(by_member.items()):
        lines += [f"### {member}", "", "| Time (UTC) | Tool | Category | Prompt |", "|---|---|---|---|"]
        for e in sorted(rows, key=lambda e: e["timestamp_utc"]):
            text = " ".join((e.get("prompt") or "(text not stored)").split()).replace("|", "\\|")
            text = text if len(text) <= 300 else text[:300] + "… (full text in log)"
            lines.append(f"| {e['timestamp_utc'][:16].replace('T', ' ')} | {e.get('tool', '?')} | {e.get('category', OTHER)} | {text} |")
        lines.append("")
    lines += ["Categories come from the fixed keyword rubric in `ai-governance.json`. "
              "They show what each member asked AI for, not the quality of their work."]
    return "\n".join(lines) + "\n"


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = parser.add_subparsers(dest="cmd")
    p = sub.add_parser("hook")
    p.add_argument("--tool", help="label for the assistant; default: claude-code inside Claude Code, else copilot")
    sub.add_parser("guard")
    p = sub.add_parser("setup")
    p.add_argument("--project")
    p.add_argument("--owner", help="repo owner's GitHub username (fills CODEOWNERS once)")
    p.add_argument("--quiet-json", action="store_true", help="session-start hook output")
    p = sub.add_parser("verify")
    p.add_argument("--base", help="git ref: fail if any log line that existed there was changed or removed")
    p.add_argument("--head", help="git ref to check instead of the working tree")
    p.add_argument("--staged", action="store_true", help="check the staged files (pre-commit hook)")
    p = sub.add_parser("log")
    p.add_argument("--prompt", help="the user's exact prompt; omit to read it from stdin")
    p.add_argument("--tool", required=True, help="e.g. copilot, cursor, codex")
    p = sub.add_parser("report")
    p.add_argument("--out", help="write the markdown report to this file")
    args = parser.parse_args()

    if args.cmd in (None, "hook"):
        try:
            payload = json.load(sys.stdin)
            tool = args.tool or ("claude-code" if os.environ.get("CLAUDECODE") or os.environ.get("CLAUDE_PROJECT_DIR") else "copilot")
            record(payload.get("prompt", ""), tool, payload.get("session_id") or payload.get("sessionId"))
        except Exception as exc:  # logging must never block the member's prompt
            print(f"ai-analytics: prompt not logged ({exc})", file=sys.stderr)
        sys.exit(0)
    if args.cmd == "guard":
        guard()
    elif args.cmd == "setup":
        try:
            todo = setup(args.project, args.owner)
        except Exception as exc:  # setup must never break the member's session
            todo = [f"AI prompt kit setup failed: {exc}"]
        msg = ("AI prompt logging setup is not finished. Before anything else, help the user with: " + " ".join(todo)) if todo else ""
        if args.quiet_json:  # read by Claude Code and Copilot as extra context for the AI, only when something is missing
            print(json.dumps({"additionalContext": msg, "hookSpecificOutput": {"hookEventName": "SessionStart", "additionalContext": msg}}) if msg else "{}")
        else:
            print(msg or "Setup complete for this member.")
    elif args.cmd == "verify":
        problems = integrity_problems(args.base, "staged" if args.staged else args.head)
        for prob in problems:
            print("ERROR:", prob)
        print(f"{len(problems)} problem(s): AI prompt logs are append-only." if problems else "Logs OK: nothing changed or deleted.")
        sys.exit(1 if problems else 0)
    elif args.cmd == "log":
        event = record(args.prompt if args.prompt is not None else sys.stdin.read().strip("\n"), args.tool)
        print(f"Logged as {event['category']}" if event else "Empty prompt, nothing logged.")
    elif args.cmd == "report":
        md = report_md(read_events(), integrity_problems())
        if args.out:
            Path(args.out).write_text(md, encoding="utf-8")
            print(f"Wrote {args.out}")
        else:
            print(md)


if __name__ == "__main__":
    main()
