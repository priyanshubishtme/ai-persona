# 05: Input hardening, limits and rate limiting

**What to build:** The API rejects bad input before spending any AI quota: whitespace-only or missing drafts, unsupported personas, drafts over 4,000 characters, bodies over 16 KB, non-JSON bodies, and wrong methods. It limits each IP to 10 requests per minute. The UI shows a live character counter and explains validation errors before or after submit, and the draft is always kept. Server logs never contain draft or rewrite text.

**Blocked by:** 01

**Status:** ready-for-agent

- [ ] Whitespace-only, missing or non-string drafts return `INVALID_INPUT` (400). An unknown persona returns `UNSUPPORTED_PERSONA` (400).
- [ ] A draft over 4,000 characters after trimming, or a raw body over 16 KB (read as text before parsing), returns `INPUT_TOO_LONG` (413).
- [ ] Malformed JSON or a wrong content type returns `INVALID_INPUT`. Non-POST methods return `METHOD_NOT_ALLOWED` (405) with a JSON body.
- [ ] The 11th request from one IP within a minute returns `RATE_LIMITED` (429) with `Retry-After`. The in-memory, per-instance limitation is documented.
- [ ] Server logs contain only the error code, provider and latency. A test spies on the console and asserts the draft text never appears.
- [ ] The UI has a character counter with the limit and blocks submitting empty or too-long drafts with an accessible message. Server validation errors are shown clearly.
- [ ] API route tests cover each case above.
- [ ] Lint, type-check, test and build all pass.
