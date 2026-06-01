import {
  generateMonthlyInsight,
  getCachedMonthlyInsight,
} from "@/features/ai/monthly-insight";
import { createOpenAiCompatibleChat } from "@/features/ai/openai-compatible";
import { getMonthlyDashboard } from "@/features/dashboard/service";
import { db } from "@/lib/db";

jest.mock("@/lib/db", () => ({
  db: {
    aiInsight: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
    },
  },
}));

jest.mock("@/features/ai/openai-compatible", () => ({
  createOpenAiCompatibleChat: jest.fn(),
}));

jest.mock("@/features/dashboard/service", () => ({
  getMonthlyDashboard: jest.fn().mockResolvedValue({
    month: {
      key: "2026-05",
      label: "Tháng 05/2026",
      previousKey: "2026-04",
      nextKey: "2026-06",
    },
    totals: { income: 18000000, expense: 3200000, remaining: 14800000 },
    previousTotals: { income: 18000000, expense: 2500000, remaining: 15500000 },
    comparison: {
      income: { kind: "unchanged", delta: 0, percentage: 0 },
      expense: { kind: "increased", delta: 700000, percentage: 28 },
      remaining: { kind: "decreased", delta: 700000, percentage: 5 },
    },
    categoryBreakdown: [
      {
        categoryId: "cat_food",
        name: "Ăn uống",
        color: "#f97316",
        amount: 1200000,
        percentage: 38,
      },
    ],
    recentTransactions: [],
    isEmpty: false,
  }),
}));

const findUniqueMock = db.aiInsight.findUnique as jest.Mock;
const upsertMock = db.aiInsight.upsert as jest.Mock;
const chatMock = createOpenAiCompatibleChat as jest.Mock;
const getMonthlyDashboardMock = getMonthlyDashboard as jest.Mock;
const providerSetting = {
  baseUrl: "https://provider.example/v1",
  apiKey: "sk-test",
  model: "model",
};

describe("monthly insight service", () => {
  beforeEach(() => {
    findUniqueMock.mockReset();
    upsertMock.mockReset();
    chatMock.mockReset();
    getMonthlyDashboardMock.mockClear();
  });

  it("returns cached insight", async () => {
    findUniqueMock.mockResolvedValue({
      month: "2026-05",
      content: "Insight đã có",
      createdAt: new Date("2026-05-26T00:00:00.000Z"),
      updatedAt: new Date("2026-05-26T00:00:00.000Z"),
    });

    await expect(getCachedMonthlyInsight("user_1", "2026-05")).resolves.toEqual(
      {
        month: "2026-05",
        content: "Insight đã có",
        createdAt: "2026-05-26T00:00:00.000Z",
        updatedAt: "2026-05-26T00:00:00.000Z",
      },
    );
  });

  it("uses cache when regenerate is false", async () => {
    findUniqueMock.mockResolvedValue({
      month: "2026-05",
      content: "Insight cache",
      createdAt: new Date("2026-05-26T00:00:00.000Z"),
      updatedAt: new Date("2026-05-26T00:00:00.000Z"),
    });

    const insight = await generateMonthlyInsight(
      "user_1",
      "2026-05",
      false,
      providerSetting,
    );

    expect(insight.content).toBe("Insight cache");
    expect(chatMock).not.toHaveBeenCalled();
    expect(getMonthlyDashboardMock).not.toHaveBeenCalled();
  });

  it("rejects unsafe provider base URLs before fetching dashboard data", async () => {
    findUniqueMock.mockResolvedValue(null);

    await expect(
      generateMonthlyInsight("user_1", "2026-05", true, {
        baseUrl: "http://127.0.0.1:11434/v1",
        apiKey: "sk-local",
        model: "local-model",
      }),
    ).rejects.toMatchObject({ code: "invalid_provider_setting" });

    expect(getMonthlyDashboardMock).not.toHaveBeenCalled();
    expect(chatMock).not.toHaveBeenCalled();
  });

  it("generates and upserts insight", async () => {
    findUniqueMock.mockResolvedValue(null);
    chatMock.mockResolvedValue("Bạn đang chi nhiều hơn cho ăn uống.");
    upsertMock.mockResolvedValue({
      month: "2026-05",
      content: "Bạn đang chi nhiều hơn cho ăn uống.",
      createdAt: new Date("2026-05-26T00:00:00.000Z"),
      updatedAt: new Date("2026-05-26T01:00:00.000Z"),
    });

    const insight = await generateMonthlyInsight(
      "user_1",
      "2026-05",
      false,
      providerSetting,
    );

    expect(insight.content).toBe("Bạn đang chi nhiều hơn cho ăn uống.");
    expect(chatMock).toHaveBeenCalledWith(
      expect.objectContaining({
        timeoutMs: 45000,
      }),
    );
    expect(upsertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId_month: { userId: "user_1", month: "2026-05" } },
      }),
    );
  });

  it("uses the provider setting passed by the request", async () => {
    findUniqueMock.mockResolvedValue(null);
    chatMock.mockResolvedValue("Insight từ local setting.");
    upsertMock.mockResolvedValue({
      month: "2026-05",
      content: "Insight từ local setting.",
      createdAt: new Date("2026-05-26T00:00:00.000Z"),
      updatedAt: new Date("2026-05-26T01:00:00.000Z"),
    });

    await generateMonthlyInsight("user_1", "2026-05", true, {
      baseUrl: "https://local.example/v1",
      apiKey: "sk-local",
      model: "local-model",
    });

    expect(chatMock).toHaveBeenCalledWith(
      expect.objectContaining({
        baseUrl: "https://local.example/v1",
        apiKey: "sk-local",
        model: "local-model",
      }),
    );
  });
});
