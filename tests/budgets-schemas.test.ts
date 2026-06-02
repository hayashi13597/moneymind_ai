import {
  budgetDeleteSchema,
  budgetQuerySchema,
  budgetUpsertSchema,
  toBudgetPeriod,
} from "@/features/budgets/schemas";

describe("budget schemas", () => {
  it("accepts a valid month query", () => {
    expect(budgetQuerySchema.parse({ month: "2026-06" })).toEqual({
      month: "2026-06",
    });
  });

  it("rejects invalid month queries", () => {
    expect(() => budgetQuerySchema.parse({ month: "2026-13" })).toThrow();
  });

  it("parses VND shorthand amounts for upsert", () => {
    expect(
      budgetUpsertSchema.parse({
        categoryId: "cat_food",
        scope: "default",
        amount: "3tr",
      }),
    ).toEqual({
      categoryId: "cat_food",
      scope: "default",
      amount: 3000000,
    });
  });

  it("requires month when scope is month", () => {
    expect(() =>
      budgetUpsertSchema.parse({
        categoryId: "cat_food",
        scope: "month",
        amount: "3tr",
      }),
    ).toThrow();
  });

  it("rejects zero budgets", () => {
    expect(() =>
      budgetUpsertSchema.parse({
        categoryId: "cat_food",
        scope: "default",
        amount: 0,
      }),
    ).toThrow();
  });

  it("maps scopes to storage periods", () => {
    expect(toBudgetPeriod({ scope: "default" })).toBe("default");
    expect(toBudgetPeriod({ scope: "month", month: "2026-06" })).toBe(
      "2026-06",
    );
  });

  it("validates delete payloads", () => {
    expect(
      budgetDeleteSchema.parse({
        categoryId: "cat_food",
        scope: "month",
        month: "2026-06",
      }),
    ).toEqual({
      categoryId: "cat_food",
      scope: "month",
      month: "2026-06",
    });
  });
});
