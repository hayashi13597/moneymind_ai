import { createOpenAiCompatibleChat } from "@/features/ai/openai-compatible";
import { generateAiChatResponse } from "@/features/ai-chat/service";
import { db } from "@/lib/db";

jest.mock("@/lib/db", () => ({
  db: {
    category: {
      findMany: jest.fn(),
    },
    transaction: {
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

const categoryFindManyMock = db.category.findMany as jest.Mock;
const transactionFindManyMock = db.transaction.findMany as jest.Mock;
const chatMock = createOpenAiCompatibleChat as jest.Mock;

describe("ai chat service", () => {
  beforeEach(() => {
    categoryFindManyMock.mockReset();
    transactionFindManyMock.mockReset();
    chatMock.mockReset();

    categoryFindManyMock.mockResolvedValue([
      { id: "cat_income", name: "Thu nhập", type: "income" },
      { id: "cat_food", name: "Ăn uống", type: "expense" },
      { id: "cat_other", name: "Khác", type: "expense" },
    ]);

    transactionFindManyMock.mockResolvedValue([
      {
        id: "tx_1",
        type: "expense",
        amount: 55000,
        note: "Ăn trưa",
        merchant: null,
        rawInput: "ăn trưa 55k",
        transactionDate: new Date("2026-05-27T00:00:00.000Z"),
        category: { name: "Ăn uống" },
      },
    ]);
  });

  it("returns answer-only chat response", async () => {
    chatMock.mockResolvedValue(
      JSON.stringify({
        answer: "Bạn chi nhiều nhất vào Ăn uống: 1.200.000đ.",
        transactionDraft: null,
      }),
    );

    await expect(
      generateAiChatResponse("user_1", {
        month: "2026-05",
        messages: [{ role: "user", content: "Tôi tiêu nhiều nhất vào đâu?" }],
      }),
    ).resolves.toEqual({
      message: {
        role: "assistant",
        content: "Bạn chi nhiều nhất vào Ăn uống: 1.200.000đ.",
      },
    });

    expect(transactionFindManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          transactionDate: {
            gte: new Date("2025-12-01T00:00:00.000Z"),
            lt: new Date("2026-06-01T00:00:00.000Z"),
          },
        }),
      }),
    );

    expect(chatMock).toHaveBeenCalledWith(
      expect.objectContaining({
        timeoutMs: 45000,
        messages: expect.arrayContaining([
          expect.objectContaining({
            role: "system",
            content: expect.stringContaining("Chỉ dùng dữ liệu giao dịch và thông tin tài chính được cung cấp."),
          }),
          expect.objectContaining({
            role: "user",
            content: expect.stringContaining("Tóm tắt thu chi các tháng gần đây:"),
          }),
        ]),
      }),
    );
  });

  it("resolves transaction draft category to a real user category", async () => {
    chatMock.mockResolvedValue(
      JSON.stringify({
        answer: "Mình đã tạo giao dịch nháp để bạn kiểm tra.",
        transactionDraft: {
          type: "expense",
          amount: 55000,
          categoryName: "Ăn uống",
          note: "Ăn trưa",
          merchant: null,
          transactionDate: "2026-05-27",
        },
      }),
    );

    const response = await generateAiChatResponse("user_1", {
      month: "2026-05",
      messages: [{ role: "user", content: "Thêm ăn trưa 55k" }],
    });

    expect(response.transactionDraft).toEqual({
      type: "expense",
      amount: 55000,
      categoryId: "cat_food",
      categoryName: "Ăn uống",
      note: "Ăn trưa",
      merchant: null,
      rawInput: "Thêm ăn trưa 55k",
      transactionDate: "2026-05-27",
    });
  });

  it("accepts shorthand VND amount strings in provider transaction drafts", async () => {
    chatMock.mockResolvedValue(
      JSON.stringify({
        answer: "Mình đã tạo giao dịch nháp để bạn kiểm tra.",
        transactionDraft: {
          type: "expense",
          amount: "300k",
          categoryName: "Khác",
          note: "Sửa, vệ sinh laptop và kiểm tra quạt tản nhiệt",
          merchant: null,
          transactionDate: "2026-05-27",
        },
      }),
    );

    const response = await generateAiChatResponse("user_1", {
      month: "2026-05",
      messages: [
        {
          role: "user",
          content:
            "Thêm chi tiêu việc sửa đem laptop đi vệ sinh và kiểm tra vấn đề quạt tản nhiệt tốn 300k",
        },
      ],
    });

    expect(response.transactionDraft).toEqual({
      type: "expense",
      amount: 300000,
      categoryId: "cat_other",
      categoryName: "Khác",
      note: "Sửa, vệ sinh laptop và kiểm tra quạt tản nhiệt",
      merchant: null,
      rawInput:
        "Thêm chi tiêu việc sửa đem laptop đi vệ sinh và kiểm tra vấn đề quạt tản nhiệt tốn 300k",
      transactionDate: "2026-05-27",
    });
  });

  it("parses provider income drafts using Vietnamese million shorthand", async () => {
    chatMock.mockResolvedValue(
      JSON.stringify({
        answer: "Mình đã tạo giao dịch nháp để bạn kiểm tra.",
        transactionDraft: {
          type: "income",
          amount: "2tr",
          categoryName: "Thu nhập",
          note: "Đầu tư bitcoin",
          merchant: null,
          transactionDate: "2026-05-27",
        },
      }),
    );

    const response = await generateAiChatResponse("user_1", {
      month: "2026-05",
      messages: [
        {
          role: "user",
          content: "Giúp tôi thêm thu nhập từ việc đầu tư bitcon là 2tr",
        },
      ],
    });

    expect(response.transactionDraft).toEqual({
      type: "income",
      amount: 2000000,
      categoryId: "cat_income",
      categoryName: "Thu nhập",
      note: "Đầu tư bitcoin",
      merchant: null,
      rawInput: "Giúp tôi thêm thu nhập từ việc đầu tư bitcon là 2tr",
      transactionDate: "2026-05-27",
    });
  });

  it("prefers the user's Vietnamese shorthand amount when provider expands it incorrectly", async () => {
    chatMock.mockResolvedValue(
      JSON.stringify({
        answer: "Mình đã tạo giao dịch nháp để bạn kiểm tra.",
        transactionDraft: {
          type: "income",
          amount: 2000000000,
          categoryName: "Thu nhập",
          note: "Đầu tư bitcoin",
          merchant: null,
          transactionDate: "2026-05-27",
        },
      }),
    );

    const response = await generateAiChatResponse("user_1", {
      month: "2026-05",
      messages: [
        {
          role: "user",
          content:
            "Giúp tôi thêm thu nhập từ việc đầu tư bitcon là 2tr (2 triệu)",
        },
      ],
    });

    expect(response.transactionDraft?.amount).toBe(2000000);
  });

  it("accepts empty provider merchant for income drafts", async () => {
    chatMock.mockResolvedValue(
      JSON.stringify({
        answer: "Mình đã tạo giao dịch nháp để bạn kiểm tra.",
        transactionDraft: {
          type: "income",
          amount: "2tr",
          categoryName: "Đầu tư",
          note: "Đầu tư bitcoin",
          merchant: "",
          transactionDate: "2026-05-27",
        },
      }),
    );

    const response = await generateAiChatResponse("user_1", {
      month: "2026-05",
      messages: [
        {
          role: "user",
          content: "Giúp tôi thêm thu nhập từ việc đầu tư bitcon là 2tr",
        },
      ],
    });

    expect(response.transactionDraft).toMatchObject({
      type: "income",
      amount: 2000000,
      categoryId: "cat_income",
      merchant: null,
    });
  });

  it("falls back to expense other category when provider category is unknown", async () => {
    chatMock.mockResolvedValue(
      JSON.stringify({
        answer: "Mình đã tạo giao dịch nháp để bạn kiểm tra.",
        transactionDraft: {
          type: "expense",
          amount: 99000,
          categoryName: "Không tồn tại",
          note: "Mua đồ",
          merchant: null,
          transactionDate: "2026-05-27",
        },
      }),
    );

    const response = await generateAiChatResponse("user_1", {
      month: "2026-05",
      messages: [{ role: "user", content: "Thêm mua đồ 99k" }],
    });

    expect(response.transactionDraft?.categoryId).toBe("cat_other");
    expect(response.transactionDraft?.categoryName).toBe("Khác");
  });

  it("throws controlled AI error for invalid provider JSON", async () => {
    chatMock.mockResolvedValue("Không phải JSON");

    await expect(
      generateAiChatResponse("user_1", {
        month: "2026-05",
        messages: [{ role: "user", content: "Test" }],
      }),
    ).rejects.toMatchObject({ code: "provider_invalid_response" });
  });
});
