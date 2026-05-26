import { AiDomainError } from "@/features/ai/errors";
import { openAiChatResponseSchema } from "@/features/ai/schemas";

export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type OpenAiCompatibleChatInput = {
  baseUrl: string;
  apiKey: string;
  model: string;
  messages: ChatMessage[];
  timeoutMs?: number;
};

export async function createOpenAiCompatibleChat({
  baseUrl,
  apiKey,
  model,
  messages,
  timeoutMs = 15000,
}: OpenAiCompatibleChatInput) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(
      `${baseUrl.replace(/\/+$/, "")}/chat/completions`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          messages,
          temperature: 0.2,
        }),
        signal: controller.signal,
      },
    );

    if (!response.ok) {
      throw new AiDomainError("provider_http_error");
    }

    const parsed = openAiChatResponseSchema.safeParse(await response.json());

    if (!parsed.success) {
      throw new AiDomainError("provider_invalid_response");
    }

    return parsed.data.choices[0].message.content;
  } catch (error) {
    if (error instanceof AiDomainError) {
      throw error;
    }

    if (error instanceof Error && error.name === "AbortError") {
      throw new AiDomainError("provider_timeout");
    }

    throw new AiDomainError("provider_http_error");
  } finally {
    clearTimeout(timeout);
  }
}
