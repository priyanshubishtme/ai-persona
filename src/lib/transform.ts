import { runProviderChain } from "@/lib/ai/chain";
import { ProviderError, type Provider } from "@/lib/ai/types";
import {
  envelopeSchema,
  isPersonaId,
  MAX_BODY_BYTES,
  MAX_INPUT_CHARS,
  type ErrorBody,
  type ErrorCode,
  type TransformEnvelope,
} from "@/lib/contract";
import { checkFacts } from "@/lib/factGuard";
import { computeMetrics } from "@/lib/metrics";
import { buildPrompt } from "@/lib/prompt";
import type { RateLimiter } from "@/lib/rateLimit";

/** Never contains draft or rewrite text. */
export type LogEntry = { event: "transform"; outcome: "ok" | ErrorCode; provider?: string; ms: number };

export type TransformDeps = {
  providers: Provider[];
  fetch: typeof fetch;
  rateLimiter: RateLimiter;
  perAttemptMs: number;
  budgetMs: number;
  log: (entry: LogEntry) => void;
  now?: () => number;
};

const STATUS: Record<ErrorCode, number> = {
  INVALID_INPUT: 400,
  UNSUPPORTED_PERSONA: 400,
  INPUT_TOO_LONG: 413,
  RATE_LIMITED: 429,
  PROVIDER_TIMEOUT: 504,
  PROVIDER_UNAVAILABLE: 503,
  INVALID_MODEL_RESPONSE: 502,
  EMPTY_OUTPUT: 502,
  LIVE_AI_NOT_CONFIGURED: 503,
  METHOD_NOT_ALLOWED: 405,
  INTERNAL_ERROR: 500,
};

const NO_STORE = { "cache-control": "no-store" };

export function errorResponse(code: ErrorCode, message: string, retryable: boolean, headers: Record<string, string> = {}) {
  const body: ErrorBody = { error: { code, message, retryable } };
  return Response.json(body, { status: STATUS[code], headers: { ...NO_STORE, ...headers } });
}

export function methodNotAllowed() {
  return errorResponse("METHOD_NOT_ALLOWED", "Use POST to transform a draft.", false, { allow: "POST" });
}

function clientKey(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || request.headers.get("x-real-ip") || "unknown";
}

function providerErrorCode(error: ProviderError): ErrorCode {
  switch (error.kind) {
    case "timeout":
      return "PROVIDER_TIMEOUT";
    case "invalid_response":
      return "INVALID_MODEL_RESPONSE";
    case "empty_output":
      return "EMPTY_OUTPUT";
    case "not_configured":
      return "LIVE_AI_NOT_CONFIGURED";
    default:
      return "PROVIDER_UNAVAILABLE";
  }
}

export async function handleTransform(request: Request, deps: TransformDeps): Promise<Response> {
  const now = deps.now ?? Date.now;
  const started = now();
  const fail = (code: ErrorCode, message: string, retryable: boolean, headers?: Record<string, string>) => {
    deps.log({ event: "transform", outcome: code, ms: now() - started });
    return errorResponse(code, message, retryable, headers);
  };

  if (request.method !== "POST") return methodNotAllowed();

  const limit = deps.rateLimiter.check(clientKey(request));
  if (!limit.allowed) {
    return fail("RATE_LIMITED", `Too many requests. Try again in ${limit.retryAfterSeconds} seconds.`, true, {
      "retry-after": String(limit.retryAfterSeconds),
    });
  }

  if (!request.headers.get("content-type")?.toLowerCase().includes("application/json")) {
    return fail("INVALID_INPUT", "Send the request body as JSON.", false);
  }
  const declaredLength = Number(request.headers.get("content-length") ?? 0);
  if (declaredLength > MAX_BODY_BYTES) {
    return fail("INPUT_TOO_LONG", `The request is larger than ${MAX_BODY_BYTES / 1024} KB.`, false);
  }

  let raw: string;
  try {
    raw = await request.text();
  } catch {
    return fail("INVALID_INPUT", "The request body could not be read.", false);
  }
  if (new TextEncoder().encode(raw).byteLength > MAX_BODY_BYTES) {
    return fail("INPUT_TOO_LONG", `The request is larger than ${MAX_BODY_BYTES / 1024} KB.`, false);
  }

  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return fail("INVALID_INPUT", "The request body is not valid JSON.", false);
  }
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return fail("INVALID_INPUT", "The request body must be a JSON object.", false);
  }
  const { original_text: originalText, persona } = body as Record<string, unknown>;
  if (typeof originalText !== "string") {
    return fail("INVALID_INPUT", "original_text must be a string.", false);
  }
  if (!isPersonaId(persona)) {
    return fail("UNSUPPORTED_PERSONA", "persona must be one of c_level, peer_feedback, legal_compliance or gen_z.", false);
  }
  const draft = originalText.trim();
  if (!draft) {
    return fail("INVALID_INPUT", "The draft is empty. Write or paste a message first.", false);
  }
  const length = [...draft].length;
  if (length > MAX_INPUT_CHARS) {
    return fail(
      "INPUT_TOO_LONG",
      `The draft is ${length.toLocaleString("en-US")} characters. The limit is ${MAX_INPUT_CHARS.toLocaleString("en-US")}.`,
      false,
    );
  }

  let rewritten: string;
  let providerId: Provider["id"];
  try {
    const result = await runProviderChain(
      deps.providers,
      { prompt: buildPrompt(persona, draft), draft, persona },
      { fetch: deps.fetch, perAttemptMs: deps.perAttemptMs, budgetMs: deps.budgetMs, now },
    );
    rewritten = result.text;
    providerId = result.provider.id;
  } catch (error) {
    if (error instanceof ProviderError) return fail(providerErrorCode(error), error.message, error.retryable);
    return fail("INTERNAL_ERROR", "Something went wrong while rewriting. Try again.", true);
  }

  const { metrics, warnings: metricWarnings } = computeMetrics(draft, rewritten);
  const envelope: TransformEnvelope = {
    result: { persona, rewritten_text: rewritten, metrics },
    meta: {
      mode: providerId === "demo" ? "demo" : "live",
      provider: providerId,
      warnings: [...checkFacts(draft, rewritten), ...metricWarnings],
    },
  };

  const validated = envelopeSchema.safeParse(envelope);
  if (!validated.success) {
    return fail("INTERNAL_ERROR", "The result failed validation, so it was not sent. Try again.", true);
  }

  deps.log({ event: "transform", outcome: "ok", provider: providerId, ms: now() - started });
  return Response.json(validated.data, { status: 200, headers: NO_STORE });
}
