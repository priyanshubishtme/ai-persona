# 09: Methodology page and route smoke tests

**What to build:** A methodology page explains, in plain language, exactly how every metric and the Fact Guard check work, their limitations, the input and rate limits, and how drafts are processed by external AI providers (including possible retention on free tiers). The page is linked from the metrics panel, the Fact Guard list and the footer. An automated smoke test against the production build proves the route map works.

**Blocked by:** 02, 06

**Status:** ready-for-agent

- [ ] The methodology page documents tokenization, VADER sentiment (an estimate, with attribution), Flesch readability (the formula, the syllable estimator, short-text and out-of-range caveats), bigram Jaccard overlap (normalization, and the no-bigram case), change arithmetic and rounding, the Fact Guard heuristics, limits, privacy, AI processing and retention, and demo mode.
- [ ] Every navigation link in the app resolves to a valid route.
- [ ] The smoke script runs against the production server and checks that the home and methodology pages return 200 on direct load, an unknown path returns 404 with a link home, and GET on the transform API returns 405.
- [ ] Lint, type-check, test, build and smoke all pass.
