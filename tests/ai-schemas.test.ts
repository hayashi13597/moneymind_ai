import {
  aiProviderSettingSchema,
  aiProviderSettingUpdateSchema,
  monthlyInsightRequestSchema,
  parseTransactionRequestSchema,
} from "@/features/ai/schemas";

describe("AI schemas", () => {
  const providerSetting = {
    baseUrl: "https://openrouter.ai/api/v1",
    model: "openai/gpt-4.1-mini",
    apiKey: "sk-test",
  };

  it("accepts a valid provider setting update", () => {
    expect(
      aiProviderSettingUpdateSchema.parse({
        baseUrl: "https://openrouter.ai/api/v1",
        model: "openai/gpt-4.1-mini",
        apiKey: "sk-test",
      }),
    ).toEqual({
      baseUrl: "https://openrouter.ai/api/v1",
      model: "openai/gpt-4.1-mini",
      apiKey: "sk-test",
    });
  });

  it("rejects an invalid base URL", () => {
    expect(() =>
      aiProviderSettingUpdateSchema.parse({
        baseUrl: "not-a-url",
        model: "gpt-4.1-mini",
        apiKey: "sk-test",
      }),
    ).toThrow();
  });

  it("requires provider setting on AI requests", () => {
    const parsedProviderSetting = aiProviderSettingSchema.parse({
      baseUrl: "https://openrouter.ai/api/v1/",
      model: "openai/gpt-4.1-mini",
      apiKey: "sk-test",
    });

    expect(parsedProviderSetting).toEqual({
      baseUrl: "https://openrouter.ai/api/v1",
      model: "openai/gpt-4.1-mini",
      apiKey: "sk-test",
    });
    expect(
      parseTransactionRequestSchema.parse({
        input: "  hôm nay ăn trưa 55k  ",
        providerSetting: parsedProviderSetting,
      }),
    ).toEqual({
      input: "hôm nay ăn trưa 55k",
      providerSetting: parsedProviderSetting,
    });
    expect(() =>
      monthlyInsightRequestSchema.parse({
        month: "2026-05",
      }),
    ).toThrow();
  });

  it("trims parse input", () => {
    expect(
      parseTransactionRequestSchema.parse({
        input: "  hôm nay ăn trưa 55k  ",
        providerSetting,
      }),
    ).toEqual({ input: "hôm nay ăn trưa 55k", providerSetting });
  });

  it("requires YYYY-MM for monthly insight", () => {
    expect(
      monthlyInsightRequestSchema.parse({
        month: "2026-05",
        regenerate: true,
        providerSetting,
      }),
    ).toEqual({ month: "2026-05", regenerate: true, providerSetting });

    expect(() =>
      monthlyInsightRequestSchema.parse({ month: "05/2026", providerSetting }),
    ).toThrow();
  });
});
