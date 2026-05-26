import {
  transactionCreateSchema,
  transactionUpdateSchema,
} from "@/features/transactions/schemas";

describe("transaction schemas", () => {
  it("parses VND shorthand and trims text fields", () => {
    expect(
      transactionCreateSchema.parse({
        type: "expense",
        amount: "55k",
        categoryId: "cat_123",
        note: " Ăn trưa ",
        merchant: " Quán A ",
        rawInput: " ăn trưa 55k ",
        transactionDate: "2026-05-26",
      }),
    ).toEqual({
      type: "expense",
      amount: 55000,
      categoryId: "cat_123",
      note: "Ăn trưa",
      merchant: "Quán A",
      rawInput: "ăn trưa 55k",
      transactionDate: new Date("2026-05-26T00:00:00.000Z"),
    });
  });

  it("accepts integer amount payloads", () => {
    expect(
      transactionCreateSchema.parse({
        type: "income",
        amount: 18000000,
        categoryId: "cat_income",
        note: "Lương",
        transactionDate: "2026-05-01",
      }).amount,
    ).toBe(18000000);
  });

  it("rejects invalid amounts", () => {
    expect(() =>
      transactionCreateSchema.parse({
        type: "expense",
        amount: "abc",
        categoryId: "cat_123",
        note: "Cafe",
        transactionDate: "2026-05-26",
      }),
    ).toThrow();
  });

  it("requires at least one update field", () => {
    expect(() => transactionUpdateSchema.parse({})).toThrow();
  });
});
