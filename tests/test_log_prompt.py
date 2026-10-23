"""Run: python3 -m unittest discover tests"""
import json, subprocess, sys, unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))
import log_prompt as lp


class Redaction(unittest.TestCase):
    def test_secrets_removed(self):
        for text, secret in [
            ("password=s3cret", "s3cret"), ("password=pass123", "ss123"),
            ("api_key: sk-abcdef rest", "sk-abcdef"), ("my password is hunter2", "hunter2"),
            ("Authorization: Bearer eyJhbGciOiJIUzI1NiJ9.abc.def", "eyJhbGci"),
            ("key sk-proj-ABCDEFGHIJKLMNOPQRSTUV", "ABCDEFGHIJ"),
            ("token ghp_" + "a" * 30, "a" * 30), ("AKIAABCDEFGHIJKLMNOP", "AKIAABCDEFGHIJKLMNOP"),
        ]:
            self.assertNotIn(secret, lp.redact(text), text)


class Rubric(unittest.TestCase):
    def test_five_categories(self):
        for prompt, expected in [
            ("brainstorm ideas for the caching layer", "brainstorming"),
            ("should we use Redis or Postgres for sessions?", "brainstorming"),
            ("implement a login endpoint", "code_generation"),
            ("write a function to parse dates", "code_generation"),
            ("review this PR for readability", "code_review"),
            ("refactor the payment module", "code_review"),
            ("delete the unused helpers", "code_deletion"),
            ("remove dead code in utils", "code_deletion"),
            ("commit and push my changes to github", "code_push_to_github"),
            ("open a PR for this branch", "code_push_to_github"),
            ("hello", "other"),
        ]:
            self.assertEqual(lp.classify(prompt)[0], expected, prompt)

    def test_tie_goes_to_first_listed(self):
        self.assertEqual(lp.classify("x y", [{"name": "a", "keywords": ["x"]}, {"name": "b", "keywords": ["y"]}])[0], "a")

    def test_member_file_name(self):
        self.assertEqual(lp.member_file("Asha.K@Uni.edu").name, "asha_k_uni_edu.jsonl")


class Hook(unittest.TestCase):
    def test_bad_input_never_blocks(self):
        r = subprocess.run([sys.executable, str(ROOT / "scripts/log_prompt.py"), "hook"],
                           input="not json", text=True, capture_output=True)
        self.assertEqual(r.returncode, 0)


class Policy(unittest.TestCase):
    def test_agent_files_in_sync(self):
        body = lambda p: (ROOT / p).read_text(encoding="utf-8").split("\n", 1)[1]
        self.assertEqual(body("AGENTS.md"), body(".github/copilot-instructions.md"),
                         "Edit AGENTS.md, then copy its body to .github/copilot-instructions.md")


class StoresExactPrompt(unittest.TestCase):
    def test_stdin_prompt_stored_verbatim_and_redacted(self):
        import json, os, tempfile
        with tempfile.TemporaryDirectory() as d:
            env = dict(os.environ, AI_ANALYTICS_USER="tester")
            code = f"import sys; sys.argv=['x','log','--tool','copilot']; sys.path.insert(0,{str(ROOT / 'scripts')!r}); " \
                   f"import log_prompt as lp; from pathlib import Path; lp.LOG_DIR=Path({d!r}); lp.identity=lambda:'tester'; lp.main()"
            prompt = 'Write a "login" page\nwith email & password=s3cret, keep `it` simple'
            subprocess.run([sys.executable, "-c", code], input=prompt, text=True, check=True, env=env, capture_output=True)
            event = json.loads((Path(d) / "tester.jsonl").read_text())
        self.assertEqual(event["prompt"], prompt.replace("s3cret", "[REDACTED]"))
        self.assertEqual(event["category"], "code_generation")


class Guard(unittest.TestCase):
    def d(self, payload):
        return lp.guard_decision(payload)[0]

    def test_claude_style(self):
        bash = lambda c: {"tool_name": "Bash", "tool_input": {"command": c}}
        self.assertEqual(self.d({"tool_name": "Edit", "tool_input": {"file_path": "/repo/.ai-analytics/asha.jsonl"}}), "deny")
        self.assertEqual(self.d({"tool_name": "Write", "tool_input": {"file_path": "AGENTS.md"}}), "deny")
        self.assertEqual(self.d({"tool_name": "Edit", "tool_input": {"file_path": "src/app.py"}}), "allow")
        self.assertEqual(self.d({"tool_name": "Read", "tool_input": {"file_path": ".ai-analytics/asha.jsonl"}}), "allow")
        self.assertEqual(self.d({"tool_name": "Write", "tool_input": {"file_path": ".ai-analytics/REPORT.md"}}), "allow")
        self.assertEqual(self.d(bash("rm .ai-analytics/asha.jsonl")), "deny")
        self.assertEqual(self.d(bash("sed -i '1d' .ai-analytics/asha.jsonl")), "deny")
        self.assertEqual(self.d(bash("git add .ai-analytics/asha.jsonl && rm AGENTS.md")), "deny")
        self.assertEqual(self.d(bash("git add src .ai-analytics/asha.jsonl")), "allow")
        self.assertEqual(self.d(bash("python3 scripts/log_prompt.py report --out .ai-analytics/REPORT.md")), "allow")
        self.assertEqual(self.d(bash("python3 scripts/log_prompt.py log --tool cursor <<'USER_PROMPT_END'\nedit AGENTS.md > x\nUSER_PROMPT_END")), "allow")
        self.assertEqual(self.d(bash("git push origin main")), "ask")
        self.assertEqual(self.d(bash("git -C . push")), "ask")
        self.assertEqual(self.d(bash("npm test")), "allow")

    def test_copilot_style(self):
        self.assertEqual(self.d({"toolName": "edit", "toolArgs": json.dumps({"path": "scripts\\log_prompt.py"})}), "deny")
        self.assertEqual(self.d({"toolName": "bash", "toolArgs": json.dumps({"command": "git push"})}), "ask")
        self.assertEqual(self.d({"toolName": "view", "toolArgs": "{}"}), "allow")

    def test_guard_output_and_bad_input(self):
        run = lambda inp: subprocess.run([sys.executable, str(ROOT / "scripts/log_prompt.py"), "guard"], input=inp, text=True, capture_output=True)
        out = json.loads(run(json.dumps({"tool_name": "Bash", "tool_input": {"command": "git push"}})).stdout)
        self.assertEqual(out["permissionDecision"], "ask")
        self.assertEqual(out["hookSpecificOutput"]["permissionDecision"], "ask")
        bad = run("garbage")
        self.assertEqual((bad.returncode, bad.stdout.strip()), (0, "{}"))


class Verify(unittest.TestCase):
    def test_append_only(self):
        old = '{"a":1}\n'
        self.assertEqual(lp.append_only_problems(old, old + '{"b":2}\n', "f"), [])
        self.assertTrue(lp.append_only_problems(old, '{"a":9}\n', "f"))
        self.assertTrue(lp.append_only_problems(old, None, "f"))


class Dedupe(unittest.TestCase):
    def test_same_prompt_from_two_hooks_logged_once(self):
        import tempfile
        with tempfile.TemporaryDirectory() as d:
            lp.LOG_DIR, old_dir = Path(d), lp.LOG_DIR
            try:
                self.assertIsNotNone(lp.record("implement login", "copilot"))
                self.assertIsNone(lp.record("implement login", "copilot"))
                self.assertIsNotNone(lp.record("implement signup", "copilot"))
                self.assertEqual(len(next(Path(d).glob("*.jsonl")).read_text().splitlines()), 2)
            finally:
                lp.LOG_DIR = old_dir


class TamperProof(unittest.TestCase):
    def setUp(self):
        import tempfile
        self.tmp = tempfile.TemporaryDirectory()
        self.old_dir, lp.LOG_DIR = lp.LOG_DIR, Path(self.tmp.name)
        self.old_id, lp.identity = lp.identity, (lambda: "owner@uni.edu")

    def tearDown(self):
        lp.LOG_DIR, lp.identity = self.old_dir, self.old_id
        self.tmp.cleanup()

    def log(self):
        return lp.member_file("owner@uni.edu")

    def test_untouched_log_passes(self):
        for prompt in ["implement login", "review this", "push to github"]:
            lp.record(prompt, "copilot")
        self.assertEqual(lp.chain_problems(self.log().read_text(), "f"), [])

    def test_editing_a_prompt_is_detected(self):
        for prompt in ["implement login", "review this", "push to github"]:
            lp.record(prompt, "copilot")
        text = self.log().read_text()
        self.assertTrue(lp.chain_problems(text.replace("review this", "review that"), "f"))

    def test_deleting_a_line_is_detected(self):
        for prompt in ["implement login", "review this", "push to github"]:
            lp.record(prompt, "copilot")
        lines = self.log().read_text().splitlines()
        self.assertTrue(lp.chain_problems("\n".join([lines[0], lines[2]]), "f"))

    def test_union_merge_fork_is_accepted(self):
        lp.record("implement login", "copilot")
        base = self.log().read_text()
        lp.record("review this", "copilot")
        branch_a = self.log().read_text()[len(base):]
        self.log().write_text(base)
        lp.record("delete old code", "copilot")
        branch_b = self.log().read_text()[len(base):]
        self.assertEqual(lp.chain_problems(base + branch_a + branch_b, "f"), [])

    def test_blocked_attempt_is_logged(self):
        payload = {"tool_name": "Edit", "tool_input": {"file_path": ".ai-analytics/asha.jsonl", "new_string": "fake"}}
        decision, reason = lp.guard_decision(payload)
        self.assertEqual(decision, "deny")
        lp.log_blocked(payload, reason)
        event = json.loads(self.log().read_text().splitlines()[-1])
        self.assertEqual((event["event_type"], event["member"]), ("blocked_change", "owner@uni.edu"))
        self.assertIn(".ai-analytics/asha.jsonl", event["attempt"])
        self.assertIn("Blocked attempts", lp.report_md(lp.read_events()))

    def test_report_flags_tampering(self):
        lp.record("implement login", "copilot"); lp.record("review this", "copilot")
        self.log().write_text(self.log().read_text().replace("implement login", "nothing"))
        self.assertIn("FAILED", lp.report_md(lp.read_events(), lp.integrity_problems()))


class Setup(unittest.TestCase):
    def test_ai_may_run_setup_but_not_edit_config(self):
        bash = lambda c: {"tool_name": "Bash", "tool_input": {"command": c}}
        self.assertEqual(lp.guard_decision(bash("python3 scripts/log_prompt.py setup --project demo --owner me"))[0], "allow")
        self.assertEqual(lp.guard_decision(bash("git config user.email a@uni.edu"))[0], "allow")
        self.assertEqual(lp.guard_decision(bash("python3 scripts/log_prompt.py setup; rm scripts/log_prompt.py"))[0], "deny")

    def test_setup_once_per_member(self):
        import shutil, tempfile
        with tempfile.TemporaryDirectory() as d:
            repo = Path(d) / "repo"
            shutil.copytree(ROOT, repo, ignore=shutil.ignore_patterns(".git", "__pycache__", "*.jsonl"))
            env = {"PATH": "/usr/bin:/bin", "HOME": d, "GIT_CONFIG_NOSYSTEM": "1"}
            run = lambda *a: subprocess.run(a, cwd=repo, env=env, capture_output=True, text=True)
            setup = lambda *a: json.loads(run(sys.executable, "scripts/log_prompt.py", "setup", "--quiet-json", *a).stdout)
            run("git", "init", "-q")
            first = setup()["additionalContext"]
            self.assertIn("email", first)
            self.assertIn("project name", first)
            self.assertEqual(run("git", "config", "--get", "core.hooksPath").stdout.strip(), ".githooks")
            run("git", "config", "user.email", "owner@uni.edu")
            self.assertEqual(setup("--project", "demo", "--owner", "ownergh"), {})
            self.assertIn('"project": "demo"', (repo / "ai-governance.json").read_text())
            self.assertIn("@ownergh", (repo / ".github/CODEOWNERS").read_text())
            setup("--project", "hacked", "--owner", "someone")  # second time: placeholders are gone, nothing changes
            self.assertIn('"project": "demo"', (repo / "ai-governance.json").read_text())
            self.assertTrue((repo / ".git/ai-governance-ready").exists())


if __name__ == "__main__":
    unittest.main()
