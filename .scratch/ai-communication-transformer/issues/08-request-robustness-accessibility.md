# 08: Request robustness and accessible interaction

**What to build:** The transformer behaves predictably however the user interacts with it. Double clicks send one request. A newer submission cancels the older one, and a late, older response never replaces a newer result. Editing the draft or persona after a result marks that result as out of date. Keyboard users can do everything (including Ctrl/Cmd+Enter to submit), focus moves sensibly, and status changes are announced.

**Blocked by:** 03

**Status:** ready-for-agent

- [ ] The client request hook gives every submission an increasing request ID and its own abort controller. Starting a new request aborts the previous one, and only the current ID's response is applied.
- [ ] Repeat submits while loading are ignored, and the Transform button is disabled with a busy indicator.
- [ ] A "Draft changed since this result" note appears when the draft or persona differs from what produced the shown result.
- [ ] Ctrl/Cmd+Enter in the draft field submits. Every control is reachable by Tab with visible focus.
- [ ] Focus moves to the results heading on success and to the error message on failure. A live region announces loading, success and errors.
- [ ] Motion is restrained and disabled under `prefers-reduced-motion`.
- [ ] Hook tests (seam 3, with a fake `fetch` and controlled timing) check that a double submit sends one request, a late older response is ignored, the draft is kept after an error, and Retry resubmits the current draft.
- [ ] A manual keyboard-only pass through the main flow is recorded.
- [ ] Lint, type-check, test and build all pass.
