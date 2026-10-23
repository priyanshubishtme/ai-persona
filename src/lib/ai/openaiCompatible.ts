import { parseModelText, postJson } from "./http";
import type { Provider } from "./types";

type ChatCompletionResponse = {
  choices?: { message?: { content?: string } }[];
};

/** Any API that implements OpenAI's chat completions format (OpenAI, OpenRouter, Groq, ...). */
export function createOpenAiCompatibleProvider(apiKey: string, baseUrl: string, model: string): Provider {
  const endpoint = `${baseUrl.replace(/\/+$/, "")}/chat/completions`;
  return {
    id: "openai_compatible",
    async rewrite({ prompt, signal, fetch }) {
      const data = (await postJson(
        fetch,
        endpoint,
        { authorization: `Bearer ${apiKey}` },
        {
          model,
          temperature: 0.4,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: prompt.system },
            { role: "user", content: prompt.user },
          ],
        },
        signal,
      )) as ChatCompletionResponse;
      return parseModelText(data?.choices?.[0]?.message?.content);
    },
  };
}
