# 07: Side-by-side change highlighting and copy controls

**What to build:** The results show the original and the rewrite side by side on wide screens and stacked on narrow ones, with a word-level diff marking insertions and deletions. The diff does not rely on color alone and is clearly labeled as separate from the phrase-overlap metric. "Copy rewrite" and "Copy JSON" buttons copy the rewrite text and the exact `result` object, and an accessible confirmation is announced.

**Blocked by:** 02

**Status:** ready-for-agent

- [ ] The word diff is computed in the browser from the two texts. Insertions and deletions use semantic insert/delete markup with underline or strikethrough and a visible legend.
- [ ] A label explains that highlighting is a visual word diff and is separate from the bigram overlap metric.
- [ ] All user and model text renders as text. A draft containing HTML-like or script-like text renders literally.
- [ ] Copy rewrite copies `rewritten_text` exactly. Copy JSON copies `result` only (not `meta`), pretty-printed. A live region announces success or failure.
- [ ] Clipboard failure (permission denied) shows a fallback message and does not throw.
- [ ] The layout works at 375 px and 1280 px widths. This is checked manually.
- [ ] Lint, type-check, test and build all pass.
