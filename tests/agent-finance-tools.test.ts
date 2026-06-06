import {
  buildAgentFinanceContext,
  formatDashboardExplanation,
} from "@/features/agent/tools/finance";
import { getMonthlyDashboard } from "@/features/dashboard/service";
import { db } from "@/lib/db";

jest.mock("@/features/dashboard/service", () => ({
  getMonthlyDashboard: jest.fn(),
}));

jest.mock("@/lib/db", () => ({
  db: {
    category: { findMany: jest.fn() },
    transaction: { findMany: jest.fn() },
  },
}));

const getMonthlyDashboardMock = getMonthlyDashboard as jest.Mock;
const categoryFindManyMock = db.category.findMany as jest.Mock;
const transactionFindManyMock = db.transaction.findMany as jest.Mock;

describe("agent finance tools", () => {
  beforeEach(() => {
    getMonthlyDashboardMock.mockReset();
    categoryFindManyMock.mockReset();
    transactionFindManyMock.mockReset();

    getMonthlyDashboardMock.mockResolvedValue({
      month: "2026-06",
      totals: { income: 10000000, expense: 3500000, remaining: 6500000 },
      categoryBreakdown: [
        {
          categoryId: "cat_food",
          name: "Ăn uống",
          color: "#f97316",
          amount: 1200000,
          percentage: 100,
        },
      ],
    });
    categoryFindManyMock.mockResolvedValue([
      { id: "cat_food", name: "Ăn uống", type: "expense" },
      { id: "cat_income", name: "Thu nhập", type: "income" },
    ]);
    transactionFindManyMock.mockResolvedValue([
      {
        id: "tx_1",
        type: "expense",
        amount: 55000,
        transactionDate: new Date("2026-06-04T00:00:00.000Z"),
        merchant: "Quán cơm",
        note: "Cơm trưa",
        category: { name: "Ăn uống" },
      },
    ]);
  });

  it("builds trusted context from dashboard, categories, and recent transactions", async () => {
    const context = await buildAgentFinanceContext("user_1", "2026-06");

    expect(getMonthlyDashboardMock).toHaveBeenCalledWith("user_1", "2026-06");
    expect(categoryFindManyMock).toHaveBeenCalledWith({
      where: { userId: "user_1" },
      orderBy: [{ type: "asc" }, { name: "asc" }],
      select: { id: true, name: true, type: true },
    });
    expect(context.transactions[0]).toMatchObject({
      id: "tx_1",
      date: "2026-06-04",
      categoryName: "Ăn uống",
    });
  });

  it("rejects on invalid month", async () => {
    await expect(buildAgentFinanceContext("user_1", "2026-13")).rejects.toThrow(
      "Invalid month key",
    );
  });

  it("formats dashboard explanation context in Vietnamese", () => {
    const message = formatDashboardExplanation({
      month: "2026-06",
      dashboard: {
        totals: { income: 10000000, expense: 3500000, remaining: 6500000 },
        categoryBreakdown: [
          {
            name: "Ăn uống",
            amount: 1200000,
          },
        ],
      },
    });

    expect(message).toContain("Tháng 2026-06");
    expect(message).toContain("Tổng thu nhập: 10000000");
    expect(message).toContain("Ăn uống");
  });
});
