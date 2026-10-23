# 06: Fact Guard warnings

**What to build:** After every rewrite, the server checks whether the numbers, money amounts, percentages, dates, names and negations in the original still appear in the rewrite. Anything missing comes back as a warning naming the item, and the UI lists these as "possible dropped details", with a link to the methodology page. This is the headline differentiator: deterministic and transparent, and it warns only (no automatic retry).

**Blocked by:** 02

**Status:** ready-for-agent

- [ ] Fact Guard extracts the items the spec defines: numbers (thousands separators, decimals, percentages, currency, shorthand such as 5k), number words zero to twenty, dates (month names, ISO dates, weekdays), capitalized names that don't start a sentence, and negation markers.
- [ ] Each missing item produces a `fact_missing` warning naming it. Negation in the original that is missing from the rewrite produces `negation_missing`. Digit and word equivalents count as matches (3 matches three).
- [ ] Warnings are delivered in `meta.warnings` for both live and demo responses.
- [ ] The UI shows Fact Guard warnings as a labeled list framed as possible issues, separate from the metric warnings.
- [ ] API route tests check that a rewrite dropping "30 days", "$5k", "March 3", "Priya" and a "not" produces the matching warnings. Identical texts produce none, and "3" vs "three" produces none.
- [ ] Lint, type-check, test and build all pass.
