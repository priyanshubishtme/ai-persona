import { envelopeSchema, errorBodySchema, type PersonaId, type TransformEnvelope } from "@/lib/contract";

export type ClientError = { code: string; message: string; retryable: boolean };

export type ItemState =
  | { status: "loading" }
  | { status: "success"; envelope: TransformEnvelope }
  | { status: "error"; error: ClientError };

export const CLIENT_TIMEOUT_MS = 35_000;

function withTimeout(signal: AbortSignal, ms: number): AbortSignal {
  if (typeof AbortSignal.any === "function" && typeof AbortSignal.timeout === "function") {
    return AbortSignal.any([signal, AbortSignal.timeout(ms)]);
  }
  return signal;
}

/** Calls the API and always resolves to a displayable state, never throws. */
export async function requestTransform(
  fetchImpl: typeof fetch,
  draft: string,
  persona: PersonaId,
  signal: AbortSignal,
): Promise<ItemState> {
  let response: Response;
  try {
    response = await fetchImpl("/api/transform", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ original_text: draft, persona }),
      signal: withTimeout(signal, CLIENT_TIMEOUT_MS),
    });
  } catch (error) {
    if (signal.aborted) return { status: "error", error: { code: "ABORTED", message: "Cancelled.", retryable: true } };
    const timedOut = error instanceof DOMException && error.name === "TimeoutError";
    return {
      status: "error",
      error: timedOut
        ? { code: "CLIENT_TIMEOUT", message: "The rewrite took too long. Try again.", retryable: true }
        : { code: "NETWORK_ERROR", message: "Couldn't reach Alter. Check your connection and try again.", retryable: true },
    };
  }

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    body = undefined;
  }

  if (response.ok) {
    const parsed = envelopeSchema.safeParse(body);
    if (parsed.success) return { status: "success", envelope: parsed.data };
    return {
      status: "error",
      error: { code: "UNEXPECTED_RESPONSE", message: "Alter returned a response it couldn't read. Try again.", retryable: true },
    };
  }

  const parsedError = errorBodySchema.safeParse(body);
  if (parsedError.success) return { status: "error", error: parsedError.data.error };
  return {
    status: "error",
    error: { code: `HTTP_${response.status}`, message: `The request failed (HTTP ${response.status}). Try again.`, retryable: true },
  };
}
