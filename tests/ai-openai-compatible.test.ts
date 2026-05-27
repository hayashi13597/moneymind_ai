import { AiDomainError } from "@/features/ai/errors";
import { createOpenAiCompatibleChat } from "@/features/ai/openai-compatible";

const fetchMock = jest.fn();

describe("OpenAI-compatible adapter", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    global.fetch = fetchMock;
  });

  it("sends chat completion request and returns message content", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: '{"ok":true}' } }],
      }),
    });

    const content = await createOpenAiCompatibleChat({
      baseUrl: "https://openrouter.ai/api/v1",
      apiKey: "sk-test",
      model: "openai/gpt-4.1-mini",
      messages: [{ role: "user", content: "Ping" }],
      timeoutMs: 1000,
    });

    expect(content).toBe('{"ok":true}');
    expect(fetchMock).toHaveBeenCalledWith(
      "https://openrouter.ai/api/v1/chat/completions",
      expect.objectContaining({
        method: "POST",
        headers: {
          Authorization: "Bearer sk-test",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "openai/gpt-4.1-mini",
          messages: [{ role: "user", content: "Ping" }],
          temperature: 0.2,
        }),
        signal: expect.any(AbortSignal),
      }),
    );
  });

  it("maps non-2xx response to provider_http_error", async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ error: "unauthorized" }),
    });

    await expect(
      createOpenAiCompatibleChat({
        baseUrl: "https://provider.example/v1",
        apiKey: "sk-test",
        model: "model",
        messages: [{ role: "user", content: "Ping" }],
        timeoutMs: 1000,
      }),
    ).rejects.toEqual(new AiDomainError("provider_http_error"));
  });

  it("maps malformed response to provider_invalid_response", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ choices: [] }),
    });

    await expect(
      createOpenAiCompatibleChat({
        baseUrl: "https://provider.example/v1",
        apiKey: "sk-test",
        model: "model",
        messages: [{ role: "user", content: "Ping" }],
        timeoutMs: 1000,
      }),
    ).rejects.toEqual(new AiDomainError("provider_invalid_response"));
  });

  it("maps aborted requests to provider_timeout", async () => {
    const abortError = new Error("The operation was aborted.");
    abortError.name = "AbortError";
    fetchMock.mockRejectedValue(abortError);

    await expect(
      createOpenAiCompatibleChat({
        baseUrl: "https://provider.example/v1",
        apiKey: "sk-test",
        model: "model",
        messages: [{ role: "user", content: "Ping" }],
        timeoutMs: 1000,
      }),
    ).rejects.toEqual(new AiDomainError("provider_timeout"));
  });
});
