import { modelOutputSchema } from "@/lib/contract";
import { ProviderError } from "./types";

function isAbortLike(error: unknown): error is { name: string } {
  return typeof error === "object" && error !== null && "name" in error;
}

/** POSTs JSON and maps transport failures and HTTP statuses onto provider errors. */
export async function postJson(
  fetchImpl: typeof fetch,
  url: string,
  headers: Record<string, string>,
  body: unknown,
  signal: AbortSignal,
): Promise<unknown> {
  let response: Response;
  try {
    response = await fetchImpl(url, {
      method: "POST",
      headers: { "content-type": "application/json", ...headers },
      body: JSON.stringify(body),
      signal,
    });
  } catch (error) {
    if (signal.aborted || (isAbortLike(error) && (error.name === "TimeoutError" || error.name === "AbortError"))) {
      throw new ProviderError("timeout", "The AI provider did not answer in time.", true);
    }
    throw new ProviderError("unavailable", "The AI provider could not be reached.", true);
  }

  if (!response.ok) {
    const retryable = response.status === 429 || response.status >= 500;
    const reason =
      response.status === 429
        ? "The AI provider is rate limiting requests."
        : response.status >= 500
          ? "The AI provider is having problems."
          : `The AI provider rejected the request (HTTP ${response.status}). Check the API key and model settings.`;
    throw new ProviderError("unavailable", reason, retryable);
  }

  try {
    return await response.json();
  } catch {
    throw new ProviderError("invalid_response", "The AI provider returned a response that is not JSON.", true);
  }
}

/** Parses the model's text as {"rewritten_text": string}, tolerating a markdown code fence. */
export function parseModelText(text: unknown): string {
  if (typeof text !== "string") {
    throw new ProviderError("invalid_response", "The AI provider returned no text.", true);
  }
  const unfenced = text.trim().replace(/^```(?:json)?\s*([\s\S]*?)\s*```$/i, "$1");
  let parsed: unknown;
  try {
    parsed = JSON.parse(unfenced);
  } catch {
    throw new ProviderError("invalid_response", "The AI returned malformed JSON.", true);
  }
  const result = modelOutputSchema.safeParse(parsed);
  if (!result.success) {
    throw new ProviderError("invalid_response", "The AI returned JSON in an unexpected shape.", true);
  }
  const rewritten = result.data.rewritten_text.trim();
  if (!rewritten) {
    throw new ProviderError("empty_output", "The AI returned an empty rewrite.", true);
  }
  return rewritten;
}
