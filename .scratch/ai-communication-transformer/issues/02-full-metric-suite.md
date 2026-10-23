# 02: Full, transparent metric suite

**What to build:** Every transform response carries all ten contract metrics computed by the application: word counts, the VADER sentiment estimate, Flesch readability, and bigram phrase overlap, each with an unrounded change value (new minus original). The UI shows original, new and change values, rounded for display only, with honest labels ("estimate", "less reliable for short text"). The response also carries metric warnings for short text, no bigrams, empty text and non-English input. Definitions follow the spec exactly.

**Blocked by:** 01

**Status:** ready-for-agent

- [ ] The tokenizer follows the spec: NFKC normalization, curly apostrophes converted to straight, contractions kept as one word, hyphens splitting words, punctuation and emoji excluded, and line breaks and bullets treated as separators.
- [ ] Sentiment uses the vendored VADER lexicon and rules with MIT attribution, takes the mean compound score per sentence, stays within -1 to +1, and gives 0 for empty text.
- [ ] Readability uses Flesch Reading Ease with the documented syllable estimator and sentence splitting. Zero words returns 0 plus `empty_text_metrics`. Under 30 words adds `short_text_low_reliability`. Values outside 0 to 100 are allowed.
- [ ] Phrase overlap is the Jaccard similarity of unique lowercase word bigrams times 100. When neither text has a bigram, it returns 0 plus `overlap_not_meaningful`, and the UI explains why.
- [ ] Draft text where fewer than half the letters are Latin script adds `non_english_metrics`, and the UI says the metrics are English-calibrated.
- [ ] Every change equals new minus original computed from unrounded values. The schema rejects NaN, Infinity, and missing or extra keys.
- [ ] Metrics-entry tests (seam 2) use input tables covering contractions (straight and curly), hyphens, punctuation, emoji, line breaks, bullets, Unicode letters, HTML-like text, empty and one-word input, identical texts (100), disjoint texts (0), no-bigram input, known syllable and Flesch values, VADER negation ("not good" scores below 0) and bounds, and delta arithmetic.
- [ ] API route tests confirm that the demo response carries all ten finite metrics and the expected warnings.
- [ ] Lint, type-check, test and build all pass.
