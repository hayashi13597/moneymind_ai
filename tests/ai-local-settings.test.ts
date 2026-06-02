import {
  AI_PROVIDER_SETTING_STORAGE_KEY,
  deleteLocalAiProvider,
  readLocalAiProviderSetting,
  readLocalAiProviderStore,
  saveLocalAiProvider,
  selectLocalAiProvider,
} from "@/features/ai/local-settings";

describe("local AI provider settings", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("migrates the previous single-provider setting shape", () => {
    window.localStorage.setItem(
      AI_PROVIDER_SETTING_STORAGE_KEY,
      JSON.stringify({
        baseUrl: "https://provider.example/v1",
        model: "model-a",
        apiKey: "sk-a",
      }),
    );

    expect(readLocalAiProviderStore()).toEqual({
      selectedProviderId: "legacy-provider",
      providers: [
        {
          id: "legacy-provider",
          name: "Provider chính",
          baseUrl: "https://provider.example/v1",
          model: "model-a",
          apiKey: "sk-a",
        },
      ],
    });
    expect(readLocalAiProviderSetting()).toEqual({
      baseUrl: "https://provider.example/v1",
      model: "model-a",
      apiKey: "sk-a",
    });
  });

  it("saves multiple providers and returns the selected provider setting", () => {
    saveLocalAiProvider({
      id: "openai",
      name: "OpenAI",
      baseUrl: "https://api.openai.com/v1",
      model: "gpt-4.1-mini",
      apiKey: "sk-openai",
    });
    saveLocalAiProvider({
      id: "openrouter",
      name: "OpenRouter",
      baseUrl: "https://openrouter.ai/api/v1",
      model: "openai/gpt-4.1-mini",
      apiKey: "sk-openrouter",
    });
    selectLocalAiProvider("openai");

    expect(readLocalAiProviderStore()).toMatchObject({
      selectedProviderId: "openai",
      providers: [
        expect.objectContaining({ id: "openai", name: "OpenAI" }),
        expect.objectContaining({ id: "openrouter", name: "OpenRouter" }),
      ],
    });
    expect(readLocalAiProviderSetting()).toEqual({
      baseUrl: "https://api.openai.com/v1",
      model: "gpt-4.1-mini",
      apiKey: "sk-openai",
    });
    expect(
      window.localStorage.getItem(AI_PROVIDER_SETTING_STORAGE_KEY),
    ).not.toContain("sk-openai");
    expect(
      window.localStorage.getItem(AI_PROVIDER_SETTING_STORAGE_KEY),
    ).not.toContain("sk-openrouter");
  });

  it("keeps provider API keys available after the settings module reloads", () => {
    saveLocalAiProvider({
      id: "openai",
      name: "OpenAI",
      baseUrl: "https://api.openai.com/v1",
      model: "gpt-4.1-mini",
      apiKey: "sk-openai",
    });

    jest.resetModules();
    const freshLocalSettings = jest.requireActual(
      "@/features/ai/local-settings",
    ) as typeof import("@/features/ai/local-settings");

    expect(freshLocalSettings.readLocalAiProviderSetting()).toEqual({
      baseUrl: "https://api.openai.com/v1",
      model: "gpt-4.1-mini",
      apiKey: "sk-openai",
    });
  });

  it("keeps the current selected provider when adding another provider", () => {
    saveLocalAiProvider({
      id: "openai",
      name: "OpenAI",
      baseUrl: "https://api.openai.com/v1",
      model: "gpt-4.1-mini",
      apiKey: "sk-openai",
    });
    saveLocalAiProvider({
      id: "openrouter",
      name: "OpenRouter",
      baseUrl: "https://openrouter.ai/api/v1",
      model: "openai/gpt-4.1-mini",
      apiKey: "sk-openrouter",
    });

    expect(readLocalAiProviderStore().selectedProviderId).toBe("openai");
    expect(readLocalAiProviderSetting()).toEqual({
      baseUrl: "https://api.openai.com/v1",
      model: "gpt-4.1-mini",
      apiKey: "sk-openai",
    });
  });

  it("keeps a valid selected provider when deleting the active provider", () => {
    saveLocalAiProvider({
      id: "first",
      name: "First",
      baseUrl: "https://first.example/v1",
      model: "first-model",
      apiKey: "sk-first",
    });
    saveLocalAiProvider({
      id: "second",
      name: "Second",
      baseUrl: "https://second.example/v1",
      model: "second-model",
      apiKey: "sk-second",
    });
    selectLocalAiProvider("second");

    deleteLocalAiProvider("second");

    expect(readLocalAiProviderStore()).toEqual({
      selectedProviderId: "first",
      providers: [
        {
          id: "first",
          name: "First",
          baseUrl: "https://first.example/v1",
          model: "first-model",
          apiKey: "sk-first",
        },
      ],
    });
  });

  it("clears the selected provider when deleting the last provider", () => {
    saveLocalAiProvider({
      id: "only",
      name: "Only",
      baseUrl: "https://only.example/v1",
      model: "only-model",
      apiKey: "sk-only",
    });
    selectLocalAiProvider("only");

    deleteLocalAiProvider("only");

    expect(readLocalAiProviderStore()).toEqual({
      selectedProviderId: "",
      providers: [],
    });
    expect(readLocalAiProviderSetting()).toBeNull();
  });
});
