import { findPresetByDraft } from "@/lib/presets";
import { ProviderError, type Provider } from "./types";

/** Serves hand-written rewrites for the built-in examples only. Never generates text. */
export const demoProvider: Provider = {
  id: "demo",
  async rewrite({ draft, persona }) {
    const preset = findPresetByDraft(draft);
    if (!preset) {
      throw new ProviderError(
        "not_configured",
        "Live AI is not configured, so only the built-in examples work. Add an API key to rewrite your own drafts.",
        false,
      );
    }
    return preset.demo[persona];
  },
};
