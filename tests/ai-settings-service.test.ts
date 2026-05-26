import {
  getMaskedAiProviderSetting,
  upsertAiProviderSetting,
} from "@/features/ai/settings-service";
import { db } from "@/lib/db";

jest.mock("@/lib/db", () => ({
  db: {
    aiProviderSetting: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
    },
  },
}));

const findUniqueMock = db.aiProviderSetting.findUnique as jest.Mock;
const upsertMock = db.aiProviderSetting.upsert as jest.Mock;

describe("AI settings service", () => {
  beforeEach(() => {
    findUniqueMock.mockReset();
    upsertMock.mockReset();
  });

  it("masks API key when returning settings", async () => {
    findUniqueMock.mockResolvedValue({
      userId: "user_1",
      baseUrl: "https://openrouter.ai/api/v1",
      apiKey: "sk-secret",
      model: "openai/gpt-4.1-mini",
    });

    await expect(getMaskedAiProviderSetting("user_1")).resolves.toEqual({
      setting: {
        baseUrl: "https://openrouter.ai/api/v1",
        model: "openai/gpt-4.1-mini",
        hasApiKey: true,
      },
    });
  });

  it("requires API key when creating a first setting", async () => {
    findUniqueMock.mockResolvedValue(null);

    await expect(
      upsertAiProviderSetting("user_1", {
        baseUrl: "https://openrouter.ai/api/v1",
        model: "openai/gpt-4.1-mini",
      }),
    ).rejects.toMatchObject({ code: "missing_api_key" });
  });

  it("keeps existing API key when update omits apiKey", async () => {
    findUniqueMock.mockResolvedValue({
      userId: "user_1",
      baseUrl: "https://old.example/v1",
      apiKey: "sk-existing",
      model: "old-model",
    });
    upsertMock.mockResolvedValue({
      userId: "user_1",
      baseUrl: "https://openrouter.ai/api/v1",
      apiKey: "sk-existing",
      model: "openai/gpt-4.1-mini",
    });

    await upsertAiProviderSetting("user_1", {
      baseUrl: "https://openrouter.ai/api/v1",
      model: "openai/gpt-4.1-mini",
    });

    expect(upsertMock).toHaveBeenCalledWith({
      where: { userId: "user_1" },
      create: {
        userId: "user_1",
        baseUrl: "https://openrouter.ai/api/v1",
        apiKey: "sk-existing",
        model: "openai/gpt-4.1-mini",
      },
      update: {
        baseUrl: "https://openrouter.ai/api/v1",
        apiKey: "sk-existing",
        model: "openai/gpt-4.1-mini",
      },
    });
  });
});
