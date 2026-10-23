import type { PersonaId } from "@/lib/contract";
import type { Prompt } from "@/lib/prompt";
import { ProviderError, type Provider } from "./types";

export type ChainOptions = {
  fetch: typeof fetch;
  perAttemptMs: number;
  budgetMs: number;
  now?: () => number;
};

export type ChainSuccess = { text: string; provider: Provider };

/**
 * Tries each provider in order until one returns a valid rewrite. Every attempt gets its own
 * timeout, capped by what is left of the overall budget. Throws the last provider error.
 */
export async function runProviderChain(
  providers: Provider[],
  input: { prompt: Prompt; draft: string; persona: PersonaId },
  options: ChainOptions,
): Promise<ChainSuccess> {
  const now = options.now ?? Date.now;
  const deadline = now() + options.budgetMs;
  let lastError = new ProviderError("unavailable", "No AI provider is configured.", false);

  for (const provider of providers) {
    const remaining = deadline - now();
    if (remaining <= 0) {
      lastError = new ProviderError("timeout", "The AI providers did not answer in time.", true);
      break;
    }
    const signal = AbortSignal.timeout(Math.min(options.perAttemptMs, remaining));
    try {
      const text = await provider.rewrite({ ...input, signal, fetch: options.fetch });
      return { text, provider };
    } catch (error) {
      lastError =
        error instanceof ProviderError
          ? error
          : new ProviderError("unavailable", "The AI provider failed unexpectedly.", true);
      if (lastError.kind === "not_configured") break;
    }
  }
  throw lastError;
}
