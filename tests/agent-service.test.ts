import { createOpenAiCompatibleChat } from "@/features/ai/openai-compatible";
import { generateAgentResponse } from "@/features/agent/service";
import { buildAgentFinanceContext } from "@/features/agent/tools/finance";
import {
  createAgentTransaction,
  deleteAgentTransaction,
  searchAgentTransactions,
  updateAgentTransaction,
} from "@/features/agent/tools/transactions";

jest.mock("@/features/ai/openai-compatible", () => ({
  createOpenAiCompatibleChat: jest.fn(),
}));

jest.mock("@/features/agent/tools/finance", () => ({
  buildAgentFinanceContext: jest.fn(),
  formatDashboardExplanation: jest.fn(() => "Dashboard tháng 2026-06"),
}));

jest.mock("@/features/agent/tools/transactions", () => ({
  createAgentTransaction: jest.fn(),
  deleteAgentTransaction: jest.fn(),
  searchAgentTransactions: jest.fn(),
  updateAgentTransaction: jest.fn(),
}));

jest.mock("@/features/transactions/revalidation", () => ({
  revalidateTransactionViews: jest.fn(),
}));

const chatMock = createOpenAiCompatibleChat as jest.Mock;
const contextMock = buildAgentFinanceContext as jest.Mock;
const searchMock = searchAgentTransactions as jest.Mock;
const createMock = createAgentTransaction as jest.Mock;
const updateMock = updateAgentTransaction as jest.Mock;
const deleteMock = deleteAgentTransaction as jest.Mock;

const providerSetting = {
  baseUrl: "https://openrouter.ai/api/v1",
  apiKey: "sk-test",
  model: "openai/gpt-4o-mini",
};

describe("agent service", () => {
  beforeEach(() => {
    chatMock.mockReset();
    contextMock.mockReset();
    searchMock.mockReset();
    createMock.mockReset();
    updateMock.mockReset();
    deleteMock.mockReset();

    contextMock.mockResolvedValue({
      month: "2026-06",
      dashboard: {
        totals: { income: 10000000, expense: 3500000, remaining: 6500000 },
        categoryBreakdown: [{ categoryName: "Ăn uống", amount: 1200000 }],
      },
      categories: [{ id: "cat_food", name: "Ăn uống", type: "expense" }],
      transactions: [],
    });
  });

  it("answers app data questions", async () => {
    chatMock.mockResolvedValue(
      JSON.stringify({
        resultType: "answer",
        tool: "finance.answerContext",
        message: "Bạn chi nhiều nhất cho ăn uống.",
        input: { question: "Tôi chi gì nhiều nhất?" },
      }),
    );

    await expect(
      generateAgentResponse(
        "user_1",
        {
          month: "2026-06",
          providerSetting,
          messages: [{ role: "user", content: "Tôi chi gì nhiều nhất?" }],
        },
        providerSetting,
      ),
    ).resolves.toEqual({
      message: { role: "assistant", content: "Bạn chi nhiều nhất cho ăn uống." },
      resultType: "answer",
    });
  });

  it("returns search results", async () => {
    chatMock.mockResolvedValue(
      JSON.stringify({
        resultType: "search_results",
        tool: "transactions.search",
        message: "Mình tìm thấy 1 giao dịch.",
        input: {
          query: "ăn uống trên 50k",
          categoryName: "Ăn uống",
          minAmount: 50000,
        },
      }),
    );
    searchMock.mockResolvedValue({
      total: 1,
      transactions: [
        {
          id: "tx_1",
          date: "2026-06-04",
          type: "expense",
          amount: 55000,
          categoryName: "Ăn uống",
          merchant: "Quán cơm",
          note: "Cơm trưa",
        },
      ],
    });

    const result = await generateAgentResponse(
      "user_1",
      {
        month: "2026-06",
        providerSetting,
        messages: [{ role: "user", content: "Tìm ăn uống trên 50k" }],
      },
      providerSetting,
    );

    expect(searchMock).toHaveBeenCalledWith("user_1", "2026-06", {
      query: "ăn uống trên 50k",
      categoryName: "Ăn uống",
      minAmount: 50000,
    });
    expect(result.resultType).toBe("search_results");
    expect(result.transactions).toHaveLength(1);
  });

  it("creates a transaction directly", async () => {
    chatMock.mockResolvedValue(
      JSON.stringify({
        resultType: "transaction_created",
        tool: "transactions.create",
        message: "Đã thêm giao dịch cơm trưa 55.000 đ.",
        input: {
          type: "expense",
          amount: 55000,
          categoryName: "Ăn uống",
          note: "Cơm trưa",
          merchant: "Quán cơm",
          transactionDate: "2026-06-04",
        },
      }),
    );
    createMock.mockResolvedValue({
      ok: true,
      transaction: { id: "tx_1" },
    });

    const result = await generateAgentResponse(
      "user_1",
      {
        month: "2026-06",
        providerSetting,
        messages: [{ role: "user", content: "Thêm 55k cơm trưa hôm nay" }],
      },
      providerSetting,
    );

    expect(createMock).toHaveBeenCalled();
    expect(result).toMatchObject({
      resultType: "transaction_created",
      action: { type: "create", transactionId: "tx_1" },
    });
  });

  it("asks for clarification when update target is ambiguous", async () => {
    chatMock.mockResolvedValue(
      JSON.stringify({
        resultType: "transaction_updated",
        tool: "transactions.update",
        message: "Mình tìm thấy nhiều giao dịch.",
        input: { targetQuery: "ăn trưa hôm nay", updates: { amount: 60000 } },
      }),
    );
    updateMock.mockResolvedValue({
      ok: false,
      reason: "clarification_required",
      candidates: [{ id: "tx_1", label: "55.000 đ, Ăn uống, 2026-06-04" }],
    });

    const result = await generateAgentResponse(
      "user_1",
      {
        month: "2026-06",
        providerSetting,
        messages: [{ role: "user", content: "Sửa ăn trưa thành 60k" }],
      },
      providerSetting,
    );

    expect(result.resultType).toBe("clarification_required");
    expect(result.clarification?.candidates).toHaveLength(1);
  });

  it("deletes a single matched transaction", async () => {
    chatMock.mockResolvedValue(
      JSON.stringify({
        resultType: "transaction_deleted",
        tool: "transactions.delete",
        message: "Đã xóa giao dịch cơm trưa.",
        input: { targetQuery: "cơm trưa hôm nay" },
      }),
    );
    deleteMock.mockResolvedValue({
      ok: true,
      transaction: { id: "tx_1", note: "Cơm trưa" },
    });

    const result = await generateAgentResponse(
      "user_1",
      {
        month: "2026-06",
        providerSetting,
        messages: [{ role: "user", content: "Xóa cơm trưa hôm nay" }],
      },
      providerSetting,
    );

    expect(deleteMock).toHaveBeenCalled();
    expect(result).toMatchObject({
      resultType: "transaction_deleted",
      action: { type: "delete", transactionId: "tx_1" },
    });
  });
});
