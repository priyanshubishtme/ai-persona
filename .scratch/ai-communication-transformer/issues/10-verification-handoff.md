# 10: Verification, documentation and demo handoff

**What to build:** A verified, documented MVP that anyone on the team can install, run and demo. All checks are run and reported exactly as they came out, dependencies are scanned, the main flow is reviewed manually at desktop and mobile sizes and by keyboard, and the README explains setup, configuration, privacy, limits and a short live-demo script.

**Blocked by:** 01, 02, 03, 04, 05, 06, 07, 08, 09

**Status:** ready-for-agent

- [ ] Lint, type-check, test, build and smoke are run, and each command's exact result is reported. Nothing is claimed as passing unless it actually ran and passed.
- [ ] `npm audit` is run, with findings and constraints reported. A clean scan is not presented as proof of security.
- [ ] The main flow is reviewed manually in a browser at desktop and mobile widths, with a keyboard-only pass, and the observations are recorded.
- [ ] The README gains an "App" section covering prerequisites, install, environment variables (names only), running locally, Vercel deployment steps (not executed without confirmation), privacy and AI retention, limits, and a 2-minute demo walkthrough. The governance text is left unchanged.
- [ ] Remaining risks and anything unverified (for example live output quality without keys, or deployed rate-limit behavior) are listed explicitly.
- [ ] No commit, push or deployment happens without your confirmation. When committing, your `.ai-analytics` log is included.
