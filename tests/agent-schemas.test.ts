import {
  AGENT_MAX_MESSAGE_LENGTH,
  AGENT_MAX_MESSAGES,
  agentIntentSchema,
  agentRequestSchema,
  agentResponseSchema,
} from "@/features/agent/schemas";

const providerSetting = {
  baseUrl: "https://openrouter.ai/api/v1",
  apiKey: "sk-test",
  model: "openai/gpt-4o-mini",
};

describe("agent schemas", () => {
  it("accepts a valid agent request and trims recent messages", () => {
    const messages = Array.from({ length: AGENT_MAX_MESSAGES + 2 }, (_, index) => ({
      role: index % 2 === 0 ? "user" : "assistant",
      content: `Tin nhắn ${index + 1}`,
    }));

    const parsed = agentRequestSchema.parse({
      month: "2026-06",
      providerSetting,
      messages,
    });

    expect(parsed.messages).toHaveLength(AGENT_MAX_MESSAGES);
    expect(parsed.messages[0].content).toBe("Tin nhắn 3");
  });

  it("rejects missing provider settings", () => {
    expect(() =>
      agentRequestSchema.parse({
        month: "2026-06",
        messages: [{ role: "user", content: "Tôi chi gì nhiều nhất?" }],
      }),
    ).toThrow();
  });

  it("rejects invalid months and oversized messages", () => {
    expect(() =>
      agentRequestSchema.parse({
        month: "2026-13",
        providerSetting,
        messages: [{ role: "user", content: "Tôi chi gì nhiều nhất?" }],
      }),
    ).toThrow();

    expect(() =>
      agentRequestSchema.parse({
        month: "2026-06",
        providerSetting,
        messages: [
          { role: "user", content: "x".repeat(AGENT_MAX_MESSAGE_LENGTH + 1) },
        ],
      }),
    ).toThrow();
  });

  it("rejects histories without a user message", () => {
    expect(() =>
      agentRequestSchema.parse({
        month: "2026-06",
        providerSetting,
        messages: [{ role: "assistant", content: "Mình có thể giúp gì?" }],
      }),
    ).toThrow();
  });

  it("accepts public response variants", () => {
    expect(
      agentResponseSchema.parse({
        message: {
          role: "assistant",
          content: "Bạn chi nhiều nhất cho ăn uống.",
        },
        resultType: "dashboard_explanation",
      }),
    ).toEqual({
      message: {
        role: "assistant",
        content: "Bạn chi nhiều nhất cho ăn uống.",
      },
      resultType: "dashboard_explanation",
    });

    expect(
      agentResponseSchema.parse({
        message: { role: "assistant", content: "Mình tìm thấy 2 giao dịch." },
        resultType: "clarification_required",
        clarification: {
          question: "Bạn muốn xóa giao dịch nào?",
          candidates: [
            { id: "tx_1", label: "55.000 đ, Ăn uống, 2026-06-03" },
          ],
        },
      }),
    ).toMatchObject({ resultType: "clarification_required" });
  });

  it("rejects response variants missing required fields", () => {
    expect(() =>
      agentResponseSchema.parse({
        message: { role: "assistant", content: "Bạn muốn chọn giao dịch nào?" },
        resultType: "clarification_required",
      }),
    ).toThrow();

    expect(() =>
      agentResponseSchema.parse({
        message: { role: "assistant", content: "Mình chưa tìm thấy giao dịch." },
        resultType: "search_results",
        transactions: [],
      }),
    ).toThrow();
  });

  it("rejects impossible calendar dates in transaction inputs", () => {
    expect(() =>
      agentIntentSchema.parse({
        resultType: "transaction_created",
        tool: "transactions.create",
        message: "Đã thêm giao dịch.",
        input: {
          type: "expense",
          amount: 55000,
          categoryName: "Ăn uống",
          note: "Cơm trưa",
          merchant: "Quán cơm",
          transactionDate: "2026-02-31",
        },
      }),
    ).toThrow();

    expect(() =>
      agentIntentSchema.parse({
        resultType: "transaction_updated",
        tool: "transactions.update",
        message: "Đã cập nhật giao dịch.",
        input: {
          targetQuery: "cơm trưa",
          updates: { transactionDate: "2026-02-31" },
        },
      }),
    ).toThrow();
  });

  it("accepts valid LLM intents and rejects invalid tool names", () => {
    expect(
      agentIntentSchema.parse({
        resultType: "transaction_created",
        tool: "transactions.create",
        message: "Đã thêm giao dịch.",
        input: {
          type: "expense",
          amount: 55000,
          categoryName: "Ăn uống",
          note: "Cơm trưa",
          merchant: "Quán cơm",
          transactionDate: "2026-06-04",
        },
      }),
    ).toMatchObject({ tool: "transactions.create" });

    expect(() =>
      agentIntentSchema.parse({
        resultType: "transaction_created",
        tool: "categories.delete",
        message: "Đã xóa danh mục.",
        input: {},
      }),
    ).toThrow();
  });
});
