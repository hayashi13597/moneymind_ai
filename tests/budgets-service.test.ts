import {
  deleteBudget,
  getBudgetStatus,
  listCategoryBudgetRows,
  listDashboardBudgetSummary,
  upsertBudget,
} from "@/features/budgets/service";
import { db } from "@/lib/db";

jest.mock("@/lib/db", () => ({
  db: {
    category: { findMany: jest.fn(), findFirst: jest.fn() },
    categoryBudget: {
      findMany: jest.fn(),
      upsert: jest.fn(),
      deleteMany: jest.fn(),
    },
    transaction: { groupBy: jest.fn() },
  },
}));

const categoryFindManyMock = db.category.findMany as jest.Mock;
const categoryFindFirstMock = db.category.findFirst as jest.Mock;
const budgetFindManyMock = db.categoryBudget.findMany as jest.Mock;
const budgetUpsertMock = db.categoryBudget.upsert as jest.Mock;
const budgetDeleteManyMock = db.categoryBudget.deleteMany as jest.Mock;
const transactionGroupByMock = db.transaction.groupBy as jest.Mock;

const foodCategory = {
  id: "cat_food",
  userId: "user_1",
  name: "Ăn uống",
  type: "expense" as const,
  color: "#C76F3D",
};

const cafeCategory = {
  id: "cat_cafe",
  userId: "user_1",
  name: "Cafe",
  type: "expense" as const,
  color: "#8B5E34",
};

describe("budgets service", () => {
  beforeEach(() => {
    categoryFindManyMock.mockReset();
    categoryFindFirstMock.mockReset();
    budgetFindManyMock.mockReset();
    budgetUpsertMock.mockReset();
    budgetDeleteManyMock.mockReset();
    transactionGroupByMock.mockReset();
  });

  it("resolves month overrides before default budgets", async () => {
    categoryFindManyMock.mockResolvedValue([foodCategory]);
    budgetFindManyMock.mockResolvedValue([
      { categoryId: "cat_food", period: "default", amount: 3000000 },
      { categoryId: "cat_food", period: "2026-06", amount: 4000000 },
    ]);
    transactionGroupByMock.mockResolvedValue([
      { categoryId: "cat_food", _sum: { amount: 2500000 } },
    ]);

    const result = await listCategoryBudgetRows("user_1", "2026-06");

    expect(result.summary).toEqual({
      totalBudget: 4000000,
      totalSpent: 2500000,
      remaining: 1500000,
      overAmount: 0,
    });
    expect(result.rows[0]).toMatchObject({
      categoryId: "cat_food",
      categoryName: "Ăn uống",
      effectiveAmount: 4000000,
      defaultAmount: 3000000,
      monthAmount: 4000000,
      spentAmount: 2500000,
      remainingAmount: 1500000,
      status: "healthy",
    });
  });

  it("marks near-limit and over-limit budget rows", async () => {
    expect(getBudgetStatus(null, 500000)).toBe("not_set");
    expect(getBudgetStatus(1000000, 790000)).toBe("healthy");
    expect(getBudgetStatus(1000000, 800000)).toBe("near_limit");
    expect(getBudgetStatus(1000000, 1000001)).toBe("over_limit");
  });

  it("rejects budgets for income categories", async () => {
    categoryFindFirstMock.mockResolvedValue({
      id: "cat_income",
      userId: "user_1",
      name: "Thu nhập",
      type: "income",
    });

    const result = await upsertBudget("user_1", {
      categoryId: "cat_income",
      scope: "default",
      amount: 3000000,
    });

    expect(result).toEqual({ ok: false, reason: "invalid_category" });
    expect(budgetUpsertMock).not.toHaveBeenCalled();
  });

  it("upserts budgets by user, category, and period", async () => {
    categoryFindFirstMock.mockResolvedValue(foodCategory);
    budgetUpsertMock.mockResolvedValue({
      id: "budget_1",
      userId: "user_1",
      categoryId: "cat_food",
      period: "default",
      amount: 3000000,
    });

    const result = await upsertBudget("user_1", {
      categoryId: "cat_food",
      scope: "default",
      amount: 3000000,
    });

    expect(result.ok).toBe(true);
    expect(budgetUpsertMock).toHaveBeenCalledWith({
      where: {
        userId_categoryId_period: {
          userId: "user_1",
          categoryId: "cat_food",
          period: "default",
        },
      },
      create: {
        userId: "user_1",
        categoryId: "cat_food",
        period: "default",
        amount: 3000000,
      },
      update: { amount: 3000000 },
    });
  });

  it("deletes only the requested budget scope", async () => {
    categoryFindFirstMock.mockResolvedValue(foodCategory);
    budgetDeleteManyMock.mockResolvedValue({ count: 1 });

    const result = await deleteBudget("user_1", {
      categoryId: "cat_food",
      scope: "month",
      month: "2026-06",
    });

    expect(result).toEqual({ ok: true, count: 1 });
    expect(budgetDeleteManyMock).toHaveBeenCalledWith({
      where: {
        userId: "user_1",
        categoryId: "cat_food",
        period: "2026-06",
      },
    });
  });

  it("prioritizes dashboard summary rows", async () => {
    categoryFindManyMock.mockResolvedValue([foodCategory, cafeCategory]);
    budgetFindManyMock.mockResolvedValue([
      { categoryId: "cat_food", period: "default", amount: 3000000 },
      { categoryId: "cat_cafe", period: "default", amount: 500000 },
    ]);
    transactionGroupByMock.mockResolvedValue([
      { categoryId: "cat_food", _sum: { amount: 2400000 } },
      { categoryId: "cat_cafe", _sum: { amount: 620000 } },
    ]);

    const result = await listDashboardBudgetSummary("user_1", "2026-06");

    expect(result.items.map((item) => item.categoryName)).toEqual([
      "Cafe",
      "Ăn uống",
    ]);
    expect(result.items[0].status).toBe("over_limit");
  });
});
