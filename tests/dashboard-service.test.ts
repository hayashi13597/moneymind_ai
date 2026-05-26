import { getMonthlyDashboard } from "@/features/dashboard/service";
import { db } from "@/lib/db";

jest.mock("@/lib/db", () => ({
  db: {
    transaction: {
      findMany: jest.fn(),
    },
  },
}));

const findManyMock = db.transaction.findMany as jest.Mock;

type MockTransaction = {
  id: string;
  userId: string;
  categoryId: string;
  type: "income" | "expense";
  amount: number;
  note: string;
  transactionDate: Date;
  createdAt: Date;
  category: {
    id: string;
    name: string;
    color: string | null;
  };
};

function transaction(overrides: Partial<MockTransaction>): MockTransaction {
  return {
    id: "tx_default",
    userId: "user_1",
    categoryId: "cat_food",
    type: "expense",
    amount: 100000,
    note: "Giao dịch",
    transactionDate: new Date("2026-05-10T00:00:00.000Z"),
    createdAt: new Date("2026-05-10T01:00:00.000Z"),
    category: {
      id: "cat_food",
      name: "Ăn uống",
      color: "#16a34a",
    },
    ...overrides,
  };
}

describe("getMonthlyDashboard", () => {
  beforeEach(() => {
    findManyMock.mockReset();
  });

  it("aggregates selected-month totals, expense breakdown, recent transactions, and comparison", async () => {
    findManyMock
      .mockResolvedValueOnce([
        transaction({
          id: "income_1",
          categoryId: "cat_income",
          type: "income",
          amount: 18000000,
          note: "Lương",
          category: { id: "cat_income", name: "Thu nhập", color: "#22c55e" },
          transactionDate: new Date("2026-05-01T00:00:00.000Z"),
        }),
        transaction({
          id: "expense_food",
          categoryId: "cat_food",
          type: "expense",
          amount: 1200000,
          note: "Ăn uống",
          category: { id: "cat_food", name: "Ăn uống", color: "#f97316" },
          transactionDate: new Date("2026-05-05T00:00:00.000Z"),
        }),
        transaction({
          id: "expense_cafe",
          categoryId: "cat_cafe",
          type: "expense",
          amount: 300000,
          note: "Cafe",
          category: { id: "cat_cafe", name: "Cafe", color: "#a16207" },
          transactionDate: new Date("2026-05-06T00:00:00.000Z"),
        }),
        transaction({
          id: "expense_food_2",
          categoryId: "cat_food",
          type: "expense",
          amount: 500000,
          note: "Ăn tối",
          category: { id: "cat_food", name: "Ăn uống", color: "#f97316" },
          transactionDate: new Date("2026-05-08T00:00:00.000Z"),
        }),
      ])
      .mockResolvedValueOnce([
        transaction({
          id: "prev_income",
          type: "income",
          amount: 16000000,
          note: "Lương tháng trước",
          transactionDate: new Date("2026-04-01T00:00:00.000Z"),
        }),
        transaction({
          id: "prev_expense",
          type: "expense",
          amount: 1000000,
          note: "Chi tháng trước",
          transactionDate: new Date("2026-04-02T00:00:00.000Z"),
        }),
      ]);

    const dashboard = await getMonthlyDashboard("user_1", "2026-05");

    expect(findManyMock).toHaveBeenNthCalledWith(1, {
      where: {
        userId: "user_1",
        transactionDate: {
          gte: new Date("2026-05-01T00:00:00.000Z"),
          lt: new Date("2026-06-01T00:00:00.000Z"),
        },
      },
      include: { category: true },
      orderBy: [{ transactionDate: "desc" }, { createdAt: "desc" }],
    });
    expect(findManyMock).toHaveBeenNthCalledWith(2, {
      where: {
        userId: "user_1",
        transactionDate: {
          gte: new Date("2026-04-01T00:00:00.000Z"),
          lt: new Date("2026-05-01T00:00:00.000Z"),
        },
      },
      include: { category: true },
      orderBy: [{ transactionDate: "desc" }, { createdAt: "desc" }],
    });
    expect(dashboard.totals).toEqual({
      income: 18000000,
      expense: 2000000,
      remaining: 16000000,
    });
    expect(dashboard.previousTotals).toEqual({
      income: 16000000,
      expense: 1000000,
      remaining: 15000000,
    });
    expect(dashboard.categoryBreakdown).toEqual([
      {
        categoryId: "cat_food",
        name: "Ăn uống",
        color: "#f97316",
        amount: 1700000,
        percentage: 85,
      },
      {
        categoryId: "cat_cafe",
        name: "Cafe",
        color: "#a16207",
        amount: 300000,
        percentage: 15,
      },
    ]);
    expect(dashboard.comparison.expense).toEqual({
      kind: "increased",
      delta: 1000000,
      percentage: 100,
    });
    expect(dashboard.recentTransactions).toHaveLength(4);
    expect(dashboard.isEmpty).toBe(false);
  });

  it("returns no_previous_data comparison and empty state when selected and previous month are empty", async () => {
    findManyMock.mockResolvedValueOnce([]).mockResolvedValueOnce([]);

    const dashboard = await getMonthlyDashboard("user_empty", "2026-05");

    expect(dashboard.totals).toEqual({ income: 0, expense: 0, remaining: 0 });
    expect(dashboard.previousTotals).toEqual({
      income: 0,
      expense: 0,
      remaining: 0,
    });
    expect(dashboard.comparison).toEqual({
      income: { kind: "no_previous_data" },
      expense: { kind: "no_previous_data" },
      remaining: { kind: "no_previous_data" },
    });
    expect(dashboard.categoryBreakdown).toEqual([]);
    expect(dashboard.recentTransactions).toEqual([]);
    expect(dashboard.isEmpty).toBe(true);
  });

  it("caps recent transactions at five rows", async () => {
    findManyMock
      .mockResolvedValueOnce(
        Array.from({ length: 6 }, (_, index) =>
          transaction({
            id: `tx_${index}`,
            note: `Giao dịch ${index}`,
            createdAt: new Date(`2026-05-${10 + index}T01:00:00.000Z`),
            transactionDate: new Date(`2026-05-${10 + index}T00:00:00.000Z`),
          }),
        ),
      )
      .mockResolvedValueOnce([]);

    const dashboard = await getMonthlyDashboard("user_1", "2026-05");

    expect(dashboard.recentTransactions.map((item) => item.id)).toEqual([
      "tx_0",
      "tx_1",
      "tx_2",
      "tx_3",
      "tx_4",
    ]);
  });
});
