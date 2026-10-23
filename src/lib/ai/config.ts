import { demoProvider } from "./demo";
import { createGeminiProvider } from "./gemini";
import { createOpenAiCompatibleProvider } from "./openaiCompatible";
import type { Provider } from "./types";

export const DEFAULT_GEMINI_MODEL = "gemini-2.5-flash";

type Env = Record<string, string | undefined>;

/** Providers in AI_PROVIDERS order, keeping only those with credentials. Falls back to demo mode. */
export function providersFromEnv(env: Env): Provider[] {
  const order = (env.AI_PROVIDERS ?? "gemini,openai_compatible")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const providers: Provider[] = [];
  for (const id of order) {
    if (id === "gemini" && env.GEMINI_API_KEY) {
      providers.push(createGeminiProvider(env.GEMINI_API_KEY, env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL));
    }
    if (id === "openai_compatible" && env.OPENAI_COMPAT_API_KEY && env.OPENAI_COMPAT_BASE_URL && env.OPENAI_COMPAT_MODEL) {
      providers.push(
        createOpenAiCompatibleProvider(env.OPENAI_COMPAT_API_KEY, env.OPENAI_COMPAT_BASE_URL, env.OPENAI_COMPAT_MODEL),
      );
    }
  }
  return providers.length > 0 ? providers : [demoProvider];
}

export function isLiveConfigured(env: Env): boolean {
  return providersFromEnv(env)[0]?.id !== "demo";
}
