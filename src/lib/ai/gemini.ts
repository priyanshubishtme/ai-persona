import { parseModelText, postJson } from "./http";
import { ProviderError, type Provider } from "./types";

type GeminiResponse = {
  candidates?: { content?: { parts?: { text?: string }[] } }[];
  promptFeedback?: { blockReason?: string };
};

export function createGeminiProvider(apiKey: string, model: string, thinkingLevel?: string): Provider {
  return {
    id: "gemini",
    async rewrite({ prompt, signal, fetch }) {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
      const data = (await postJson(
        fetch,
        url,
        { "x-goog-api-key": apiKey },
        {
          systemInstruction: { parts: [{ text: prompt.system }] },
          contents: [{ role: "user", parts: [{ text: prompt.user }] }],
          generationConfig: {
            temperature: 0.4,
            responseMimeType: "application/json",
            responseSchema: {
              type: "OBJECT",
              properties: { rewritten_text: { type: "STRING" } },
              required: ["rewritten_text"],
            },
            ...(thinkingLevel ? { thinkingConfig: { thinkingLevel } } : {}),
          },
        },
        signal,
      )) as GeminiResponse;

      if (data?.promptFeedback?.blockReason) {
        throw new ProviderError("invalid_response", "The AI provider declined to rewrite this draft.", false);
      }
      const parts = data?.candidates?.[0]?.content?.parts;
      const text = Array.isArray(parts) ? parts.map((p) => p?.text ?? "").join("") : undefined;
      return parseModelText(text);
    },
  };
}
