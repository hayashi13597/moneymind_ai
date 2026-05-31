import {
  aiChatProviderResponseSchema,
  aiChatRequestSchema,
} from "@/features/ai-chat/schemas";

describe("ai chat schemas", () => {
  it("accepts a valid chat request", () => {
    const parsed = aiChatRequestSchema.safeParse({
      month: "2026-05",
      messages: [
        { role: "user", content: "Tháng này tôi tiêu nhiều nhất vào đâu?" },
      ],
    });

    expect(parsed.success).toBe(true);
  });

  it("rejects an invalid month", () => {
    const parsed = aiChatRequestSchema.safeParse({
      month: "2026/05",
      messages: [{ role: "user", content: "Test" }],
    });

    expect(parsed.success).toBe(false);
  });

  it("rejects a month outside the calendar range", () => {
    const parsed = aiChatRequestSchema.safeParse({
      month: "2026-13",
      messages: [{ role: "user", content: "Test" }],
    });

    expect(parsed.success).toBe(false);
  });

  it("limits messages to the most recent bounded history", () => {
    const messages = Array.from({ length: 9 }, (_, index) => ({
      role: index % 2 === 0 ? ("user" as const) : ("assistant" as const),
      content: `Tin nhắn ${index}`,
    }));

    const parsed = aiChatRequestSchema.parse({
      month: "2026-05",
      messages,
    });

    expect(parsed.messages).toHaveLength(8);
    expect(parsed.messages[0].content).toBe("Tin nhắn 1");
  });

  it("rejects empty messages", () => {
    const parsed = aiChatRequestSchema.safeParse({
      month: "2026-05",
      messages: [],
    });

    expect(parsed.success).toBe(false);
  });

  it("rejects histories without a user message", () => {
    const parsed = aiChatRequestSchema.safeParse({
      month: "2026-05",
      messages: [{ role: "assistant", content: "Xin chào." }],
    });

    expect(parsed.success).toBe(false);
  });

  it("accepts an answer-only provider response", () => {
    const parsed = aiChatProviderResponseSchema.safeParse({
      answer: "Bạn chi nhiều nhất vào Ăn uống.",
      transactionDraft: null,
    });

    expect(parsed.success).toBe(true);
  });

  it("accepts a provider response with transaction draft", () => {
    const parsed = aiChatProviderResponseSchema.safeParse({
      answer: "Mình đã tạo giao dịch nháp.",
      transactionDraft: {
        type: "expense",
        amount: 55000,
        categoryName: "Ăn uống",
        note: "Ăn trưa",
        merchant: null,
        transactionDate: "2026-05-27",
      },
    });

    expect(parsed.success).toBe(true);
  });

  it("rejects invalid provider draft amount", () => {
    const parsed = aiChatProviderResponseSchema.safeParse({
      answer: "Draft lỗi.",
      transactionDraft: {
        type: "expense",
        amount: 0,
        categoryName: "Ăn uống",
        note: "Ăn trưa",
        merchant: null,
        transactionDate: "2026-05-27",
      },
    });

    expect(parsed.success).toBe(false);
  });
});
