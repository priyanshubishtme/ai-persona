import { beforeEach, describe, expect, it, vi } from "vitest";
import { providersFromEnv } from "@/lib/ai/config";
import { demoProvider } from "@/lib/ai/demo";
import { createGeminiProvider } from "@/lib/ai/gemini";
import { createOpenAiCompatibleProvider } from "@/lib/ai/openaiCompatible";
import type { Provider } from "@/lib/ai/types";
import { envelopeSchema, errorBodySchema, MAX_INPUT_CHARS } from "@/lib/contract";
import { PRESETS } from "@/lib/presets";
import { createRateLimiter } from "@/lib/rateLimit";
import { handleTransform, type LogEntry, type TransformDeps } from "./transform";

const DRAFT = "hey team, the launch moves to friday because QA needs 2 more days. it is not ready yet.";
const REWRITE = "Launch moves to Friday. QA needs 2 more days; the release is not ready yet.";

const gemini = createGeminiProvider("test-gemini-key", "test-model");
const compat = createOpenAiCompatibleProvider("test-compat-key", "https://compat.example/v1", "test-model");

function geminiBody(text: string) {
  return { candidates: [{ content: { parts: [{ text }] } }] };
}
function compatBody(text: string) {
  return { choices: [{ message: { content: text } }] };
}

type FakeReply = Response | "hang" | "network-error";

/** Fake network: answers each provider host with the next queued reply. */
function fakeFetch(replies: Record<string, FakeReply[]>) {
  const calls: { url: string; body: string }[] = [];
  const impl = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    calls.push({ url, body: String(init?.body ?? "") });
    const host = new URL(url).host;
    const reply = replies[host]?.shift();
    if (!reply) throw new Error(`unexpected request to ${host}`);
    if (reply === "network-error") throw new TypeError("fetch failed");
    if (reply === "hang") {
      return new Promise<Response>((_, reject) => {
        init?.signal?.addEventListener("abort", () => reject(init.signal?.reason));
      });
    }
    return reply;
  }) as typeof fetch;
  return { impl, calls };
}

const GEMINI_HOST = "generativelanguage.googleapis.com";
const COMPAT_HOST = "compat.example";

let logs: LogEntry[];

function deps(overrides: Partial<TransformDeps> = {}): TransformDeps {
  return {
    providers: [gemini],
    fetch: fakeFetch({}).impl,
    rateLimiter: createRateLimiter({ limit: 1000, windowMs: 60_000 }),
    perAttemptMs: 200,
    budgetMs: 1000,
    log: (entry) => logs.push(entry),
    ...overrides,
  };
}

function post(body: unknown, init: { headers?: Record<string, string>; raw?: string } = {}) {
  return new Request("http://localhost/api/transform", {
    method: "POST",
    headers: { "content-type": "application/json", ...init.headers },
    body: init.raw ?? JSON.stringify(body),
  });
}

async function expectError(response: Response, status: number, code: string) {
  expect(response.status).toBe(status);
  const body = errorBodySchema.parse(await response.json());
  expect(body.error.code).toBe(code);
  return body.error;
}

beforeEach(() => {
  logs = [];
});

describe("POST /api/transform: success", () => {
  it("returns a valid live envelope with server-computed metrics", async () => {
    const net = fakeFetch({ [GEMINI_HOST]: [Response.json(geminiBody(JSON.stringify({ rewritten_text: REWRITE })))] });
    const response = await handleTransform(post({ original_text: DRAFT, persona: "c_level" }), deps({ fetch: net.impl }));
    expect(response.status).toBe(200);
    const envelope = envelopeSchema.parse(await response.json());
    expect(envelope.result.persona).toBe("c_level");
    expect(envelope.result.rewritten_text).toBe(REWRITE);
    expect(envelope.meta).toMatchObject({ mode: "live", provider: "gemini" });
    expect(envelope.result.metrics.word_count_original).toBe(18);
    expect(envelope.result.metrics.word_count_new).toBe(15);
    expect(envelope.result.metrics.word_count_change).toBe(-3);
  });

  it("sends the key in a header, never in the URL", async () => {
    const net = fakeFetch({ [GEMINI_HOST]: [Response.json(geminiBody(JSON.stringify({ rewritten_text: REWRITE })))] });
    await handleTransform(post({ original_text: DRAFT, persona: "gen_z" }), deps({ fetch: net.impl }));
    expect(net.calls[0].url).not.toContain("test-gemini-key");
  });

  it("accepts a code-fenced JSON answer", async () => {
    const fenced = "```json\n" + JSON.stringify({ rewritten_text: REWRITE }) + "\n```";
    const net = fakeFetch({ [GEMINI_HOST]: [Response.json(geminiBody(fenced))] });
    const response = await handleTransform(post({ original_text: DRAFT, persona: "c_level" }), deps({ fetch: net.impl }));
    expect(response.status).toBe(200);
  });

  it("adds Fact Guard warnings when the rewrite drops facts", async () => {
    const lossy = JSON.stringify({ rewritten_text: "The launch moves to next week. QA needs more time." });
    const net = fakeFetch({ [GEMINI_HOST]: [Response.json(geminiBody(lossy))] });
    const response = await handleTransform(post({ original_text: DRAFT, persona: "c_level" }), deps({ fetch: net.impl }));
    const { meta } = envelopeSchema.parse(await response.json());
    const codes = meta.warnings.map((w) => w.code);
    expect(codes).toContain("fact_missing");
    expect(codes).toContain("negation_missing");
    expect(meta.warnings.some((w) => w.message.includes('"Friday"'))).toBe(true);
  });
});

describe("POST /api/transform: validation", () => {
  it.each([
    [{ original_text: "   \n ", persona: "c_level" }, 400, "INVALID_INPUT"],
    [{ persona: "c_level" }, 400, "INVALID_INPUT"],
    [{ original_text: 42, persona: "c_level" }, 400, "INVALID_INPUT"],
    [{ original_text: "hi", persona: "pirate" }, 400, "UNSUPPORTED_PERSONA"],
    [{ original_text: "hi" }, 400, "UNSUPPORTED_PERSONA"],
    [["not", "an", "object"], 400, "INVALID_INPUT"],
    [{ original_text: "a".repeat(MAX_INPUT_CHARS + 1), persona: "c_level" }, 413, "INPUT_TOO_LONG"],
  ])("rejects %j", async (body, status, code) => {
    await expectError(await handleTransform(post(body), deps()), status, code);
  });

  it("accepts exactly the character limit", async () => {
    const net = fakeFetch({ [GEMINI_HOST]: [Response.json(geminiBody(JSON.stringify({ rewritten_text: "ok" })))] });
    const response = await handleTransform(
      post({ original_text: "a".repeat(MAX_INPUT_CHARS), persona: "c_level" }),
      deps({ fetch: net.impl }),
    );
    expect(response.status).toBe(200);
  });

  it("rejects malformed JSON, wrong content type and oversized bodies", async () => {
    await expectError(await handleTransform(post(null, { raw: "{nope" }), deps()), 400, "INVALID_INPUT");
    await expectError(
      await handleTransform(post({ original_text: "hi", persona: "c_level" }, { headers: { "content-type": "text/plain" } }), deps()),
      400,
      "INVALID_INPUT",
    );
    const padding = "x".repeat(17 * 1024);
    await expectError(
      await handleTransform(post({ original_text: "hi", persona: "c_level", padding }), deps()),
      413,
      "INPUT_TOO_LONG",
    );
  });

  it("returns 405 for other methods", async () => {
    const response = await handleTransform(new Request("http://localhost/api/transform"), deps());
    await expectError(response, 405, "METHOD_NOT_ALLOWED");
    expect(response.headers.get("allow")).toBe("POST");
  });

  it("does not call the provider when validation fails", async () => {
    const net = fakeFetch({});
    await handleTransform(post({ original_text: "", persona: "c_level" }), deps({ fetch: net.impl }));
    expect(net.calls).toHaveLength(0);
  });
});

describe("POST /api/transform: rate limiting", () => {
  it("returns 429 with Retry-After once the limit is reached", async () => {
    const limiter = createRateLimiter({ limit: 2, windowMs: 60_000 });
    const headers = { "x-forwarded-for": "203.0.113.7" };
    for (let i = 0; i < 2; i++) {
      await handleTransform(post({ original_text: "", persona: "c_level" }, { headers }), deps({ rateLimiter: limiter }));
    }
    const response = await handleTransform(post({ original_text: "hi", persona: "c_level" }, { headers }), deps({ rateLimiter: limiter }));
    await expectError(response, 429, "RATE_LIMITED");
    expect(Number(response.headers.get("retry-after"))).toBeGreaterThan(0);

    const other = await handleTransform(
      post({ original_text: "", persona: "c_level" }, { headers: { "x-forwarded-for": "198.51.100.1" } }),
      deps({ rateLimiter: limiter }),
    );
    expect(other.status).toBe(400);
  });
});

describe("POST /api/transform: provider failures", () => {
  const send = (net: ReturnType<typeof fakeFetch>, providers: Provider[] = [gemini]) =>
    handleTransform(post({ original_text: DRAFT, persona: "legal_compliance" }), deps({ fetch: net.impl, providers }));

  it.each([
    ["timeout", "hang" as const, 504, "PROVIDER_TIMEOUT"],
    ["network error", "network-error" as const, 503, "PROVIDER_UNAVAILABLE"],
    ["HTTP 500", new Response("boom", { status: 500 }), 503, "PROVIDER_UNAVAILABLE"],
    ["HTTP 429", new Response("slow down", { status: 429 }), 503, "PROVIDER_UNAVAILABLE"],
    ["non-JSON body", new Response("<html>", { status: 200 }), 502, "INVALID_MODEL_RESPONSE"],
    ["malformed model JSON", Response.json(geminiBody("{rewritten_text: nope")), 502, "INVALID_MODEL_RESPONSE"],
    ["wrong shape", Response.json(geminiBody(JSON.stringify({ text: "hi" }))), 502, "INVALID_MODEL_RESPONSE"],
    ["no candidates", Response.json({ candidates: [] }), 502, "INVALID_MODEL_RESPONSE"],
    ["empty rewrite", Response.json(geminiBody(JSON.stringify({ rewritten_text: "   " }))), 502, "EMPTY_OUTPUT"],
  ])("maps %s", async (_label, reply, status, code) => {
    const error = await expectError(await send(fakeFetch({ [GEMINI_HOST]: [reply] })), status, code);
    expect(error.retryable).toBe(true);
  });

  it("marks a rejected key as not retryable", async () => {
    const error = await expectError(
      await send(fakeFetch({ [GEMINI_HOST]: [new Response("bad key", { status: 401 })] })),
      503,
      "PROVIDER_UNAVAILABLE",
    );
    expect(error.retryable).toBe(false);
  });

  it("falls back to the next provider and reports which one answered", async () => {
    const net = fakeFetch({
      [GEMINI_HOST]: [new Response("busy", { status: 503 })],
      [COMPAT_HOST]: [Response.json(compatBody(JSON.stringify({ rewritten_text: REWRITE })))],
    });
    const response = await send(net, [gemini, compat]);
    expect(response.status).toBe(200);
    const envelope = envelopeSchema.parse(await response.json());
    expect(envelope.meta.provider).toBe("openai_compatible");
    expect(net.calls.map((c) => new URL(c.url).host)).toEqual([GEMINI_HOST, COMPAT_HOST]);
  });

  it("falls back after a timeout and reports the last error when all fail", async () => {
    const net = fakeFetch({ [GEMINI_HOST]: ["hang"], [COMPAT_HOST]: [Response.json(compatBody("not json"))] });
    await expectError(await send(net, [gemini, compat]), 502, "INVALID_MODEL_RESPONSE");
  });

  it("stops when the overall budget is spent", async () => {
    const net = fakeFetch({ [GEMINI_HOST]: ["hang"], [COMPAT_HOST]: ["hang"] });
    const response = await handleTransform(
      post({ original_text: DRAFT, persona: "c_level" }),
      deps({ fetch: net.impl, providers: [gemini, compat], perAttemptMs: 100, budgetMs: 100 }),
    );
    await expectError(response, 504, "PROVIDER_TIMEOUT");
    expect(net.calls).toHaveLength(1);
  });
});

describe("POST /api/transform: demo mode", () => {
  it("uses the demo provider when no keys are configured", () => {
    expect(providersFromEnv({})).toEqual([demoProvider]);
    expect(providersFromEnv({ GEMINI_API_KEY: "k" }).map((p) => p.id)).toEqual(["gemini"]);
    expect(
      providersFromEnv({
        AI_PROVIDERS: "openai_compatible,gemini",
        GEMINI_API_KEY: "k",
        OPENAI_COMPAT_API_KEY: "k",
        OPENAI_COMPAT_BASE_URL: "https://x",
        OPENAI_COMPAT_MODEL: "m",
      }).map((p) => p.id),
    ).toEqual(["openai_compatible", "gemini"]);
  });

  it("serves labeled canned rewrites for the built-in examples", async () => {
    const preset = PRESETS[0];
    const response = await handleTransform(
      post({ original_text: `  ${preset.draft}\n`, persona: "peer_feedback" }),
      deps({ providers: [demoProvider] }),
    );
    expect(response.status).toBe(200);
    const envelope = envelopeSchema.parse(await response.json());
    expect(envelope.meta).toMatchObject({ mode: "demo", provider: "demo" });
    expect(envelope.result.rewritten_text).toBe(preset.demo.peer_feedback);
  });

  it("refuses other drafts instead of faking a result", async () => {
    const response = await handleTransform(post({ original_text: DRAFT, persona: "c_level" }), deps({ providers: [demoProvider] }));
    const error = await expectError(response, 503, "LIVE_AI_NOT_CONFIGURED");
    expect(error.retryable).toBe(false);
  });
});

describe("POST /api/transform: privacy", () => {
  it("never logs draft or rewrite text", async () => {
    const spy = vi.spyOn(console, "info").mockImplementation(() => {});
    const secret = "Project Bluebird acquisition closes on 2026-11-02 for $3bn, not public.";
    const net = fakeFetch({ [GEMINI_HOST]: [Response.json(geminiBody(JSON.stringify({ rewritten_text: `${secret} (rewritten)` })))] });
    await handleTransform(post({ original_text: secret, persona: "c_level" }), deps({ fetch: net.impl }));
    await handleTransform(post({ original_text: secret, persona: "nope" }), deps());
    expect(JSON.stringify(logs)).not.toContain("Bluebird");
    expect(logs.map((l) => l.outcome)).toEqual(["ok", "UNSUPPORTED_PERSONA"]);
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });
});
