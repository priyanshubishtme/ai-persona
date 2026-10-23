import { z } from "zod";

export const PERSONA_IDS = ["c_level", "peer_feedback", "legal_compliance", "gen_z"] as const;
export type PersonaId = (typeof PERSONA_IDS)[number];

export function isPersonaId(value: unknown): value is PersonaId {
  return typeof value === "string" && (PERSONA_IDS as readonly string[]).includes(value);
}

export const MAX_INPUT_CHARS = 4000;
export const MAX_BODY_BYTES = 16 * 1024;

const finite = z.number().refine(Number.isFinite, "must be a finite number");

export const metricsSchema = z.strictObject({
  word_count_original: z.number().int().nonnegative(),
  word_count_new: z.number().int().nonnegative(),
  word_count_change: z.number().int(),
  sentiment_original: finite.min(-1).max(1),
  sentiment_new: finite.min(-1).max(1),
  sentiment_change: finite.min(-2).max(2),
  readability_original: finite,
  readability_new: finite,
  readability_change: finite,
  phrase_overlap_percent: finite.min(0).max(100),
});
export type Metrics = z.infer<typeof metricsSchema>;

/** The exact contract object; "Copy JSON" copies this and nothing else. */
export const resultSchema = z.strictObject({
  persona: z.enum(PERSONA_IDS),
  rewritten_text: z.string().min(1),
  metrics: metricsSchema,
});
export type TransformResult = z.infer<typeof resultSchema>;

export const WARNING_CODES = [
  "fact_missing",
  "negation_missing",
  "overlap_not_meaningful",
  "short_text_low_reliability",
  "non_english_metrics",
  "empty_text_metrics",
] as const;
export type WarningCode = (typeof WARNING_CODES)[number];

export const warningSchema = z.strictObject({
  code: z.enum(WARNING_CODES),
  message: z.string(),
});
export type Warning = z.infer<typeof warningSchema>;

export const PROVIDER_IDS = ["gemini", "openai_compatible", "demo"] as const;
export type ProviderId = (typeof PROVIDER_IDS)[number];

export const envelopeSchema = z.strictObject({
  result: resultSchema,
  meta: z.strictObject({
    mode: z.enum(["live", "demo"]),
    provider: z.enum(PROVIDER_IDS),
    warnings: z.array(warningSchema),
  }),
});
export type TransformEnvelope = z.infer<typeof envelopeSchema>;

export const ERROR_CODES = [
  "INVALID_INPUT",
  "UNSUPPORTED_PERSONA",
  "INPUT_TOO_LONG",
  "RATE_LIMITED",
  "PROVIDER_TIMEOUT",
  "PROVIDER_UNAVAILABLE",
  "INVALID_MODEL_RESPONSE",
  "EMPTY_OUTPUT",
  "LIVE_AI_NOT_CONFIGURED",
  "METHOD_NOT_ALLOWED",
  "INTERNAL_ERROR",
] as const;
export type ErrorCode = (typeof ERROR_CODES)[number];

export const errorBodySchema = z.strictObject({
  error: z.strictObject({
    code: z.enum(ERROR_CODES),
    message: z.string(),
    retryable: z.boolean(),
  }),
});
export type ErrorBody = z.infer<typeof errorBodySchema>;

/** What the model must return. Everything else is computed by the server. */
export const modelOutputSchema = z.object({
  rewritten_text: z.string(),
});
