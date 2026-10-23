import type { PersonaId, ProviderId } from "@/lib/contract";
import type { Prompt } from "@/lib/prompt";

export type ProviderErrorKind = "timeout" | "unavailable" | "invalid_response" | "empty_output" | "not_configured";

export class ProviderError extends Error {
  constructor(
    readonly kind: ProviderErrorKind,
    message: string,
    readonly retryable: boolean,
  ) {
    super(message);
    this.name = "ProviderError";
  }
}

export type RewriteRequest = {
  prompt: Prompt;
  draft: string;
  persona: PersonaId;
  signal: AbortSignal;
  fetch: typeof fetch;
};

export interface Provider {
  id: ProviderId;
  rewrite(request: RewriteRequest): Promise<string>;
}
