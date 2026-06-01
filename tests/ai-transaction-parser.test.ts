import { createOpenAiCompatibleChat } from "@/features/ai/openai-compatible";
import { parseTransactionWithAi } from "@/features/ai/transaction-parser";
import { db } from "@/lib/db";

jest.mock("@/lib/db", () => ({
  db: {
    category: {
      findMany: jest.fn(),
    },
  },
}));

jest.mock("@/features/ai/settings-service", () => ({
  requireAiProviderSetting: jest.fn().mockResolvedValue({
    baseUrl: "https://provider.example/v1",
    apiKey: "sk-test",
    model: "model",
  }),
}));

jest.mock("@/features/ai/openai-compatible", () => ({
  createOpenAiCompatibleChat: jest.fn(),
}));

const findManyMock = db.category.findMany as jest.Mock;
const chatMock = createOpenAiCompatibleChat as jest.Mock;

describe("AI transaction parser", () => {
  beforeEach(() => {
    findManyMock.mockReset();
    chatMock.mockReset();
  });

  it("returns a draft using a matched user category", async () => {
    findManyMock.mockResolvedValue([
      { id: "cat_food", name: "Ăn uống", type: "expense" },
      { id: "cat_income", name: "Thu nhập", type: "income" },
    ]);
    chatMock.mockResolvedValue(
      JSON.stringify({
        type: "expense",
        amount: 55000,
        categoryName: "Ăn uống",
        note: "Ăn trưa",
        merchant: null,
        transactionDate: "2026-05-26",
      }),
    );

    await expect(
      parseTransactionWithAi("user_1", "ăn trưa 55k", new Date("2026-05-26")),
    ).resolves.toEqual({
      type: "expense",
      amount: 55000,
      categoryId: "cat_food",
      categoryName: "Ăn uống",
      note: "Ăn trưa",
      merchant: null,
      rawInput: "ăn trưa 55k",
      transactionDate: "2026-05-26",
    });
  });

  it("accepts shorthand VND amounts and blank merchants from AI output", async () => {
    findManyMock.mockResolvedValue([
      { id: "cat_food", name: "Ăn uống", type: "expense" },
      { id: "cat_income", name: "Thu nhập", type: "income" },
    ]);
    chatMock.mockResolvedValue(
      JSON.stringify({
        type: "expense",
        amount: "25k",
        categoryName: "Ăn uống",
        note: "Uống cà phê",
        merchant: "",
        transactionDate: "2026-06-01",
      }),
    );

    await expect(
      parseTransactionWithAi(
        "user_1",
        "Uống cà phê hết 25k",
        new Date("2026-06-01"),
      ),
    ).resolves.toEqual({
      type: "expense",
      amount: 25000,
      categoryId: "cat_food",
      categoryName: "Ăn uống",
      note: "Uống cà phê",
      merchant: null,
      rawInput: "Uống cà phê hết 25k",
      transactionDate: "2026-06-01",
    });
  });

  it("extracts a transaction draft when the provider wraps JSON in text", async () => {
    findManyMock.mockResolvedValue([
      { id: "cat_food", name: "Ăn uống", type: "expense" },
      { id: "cat_income", name: "Thu nhập", type: "income" },
    ]);
    chatMock.mockResolvedValue(
      [
        "Đây là JSON:",
        "```json",
        JSON.stringify({
          type: "expense",
          amount: "25k",
          categoryName: "Ăn uống",
          note: "Uống cà phê",
          merchant: "",
          transactionDate: "2026-06-01",
        }),
        "```",
      ].join("\n"),
    );

    await expect(
      parseTransactionWithAi(
        "user_1",
        "Uống cà phê hết 25k",
        new Date("2026-06-01"),
      ),
    ).resolves.toMatchObject({
      type: "expense",
      amount: 25000,
      categoryId: "cat_food",
      merchant: null,
    });
  });

  it("falls back to Khác when category does not match", async () => {
    findManyMock.mockResolvedValue([
      { id: "cat_other", name: "Khác", type: "expense" },
      { id: "cat_food", name: "Ăn uống", type: "expense" },
    ]);
    chatMock.mockResolvedValue(
      JSON.stringify({
        type: "expense",
        amount: 120000,
        categoryName: "Du lịch",
        note: "Chi khác",
        merchant: null,
        transactionDate: "2026-05-26",
      }),
    );

    const draft = await parseTransactionWithAi(
      "user_1",
      "chi khác 120k",
      new Date("2026-05-26"),
    );

    expect(draft.categoryId).toBe("cat_other");
    expect(draft.categoryName).toBe("Khác");
  });

  it("rejects invalid AI JSON", async () => {
    findManyMock.mockResolvedValue([
      { id: "cat_food", name: "Ăn uống", type: "expense" },
    ]);
    chatMock.mockResolvedValue("not-json");

    await expect(
      parseTransactionWithAi("user_1", "ăn trưa", new Date("2026-05-26")),
    ).rejects.toMatchObject({ code: "invalid_ai_output" });
  });
});
