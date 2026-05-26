import { db } from "@/lib/db";

import {
  type DashboardMonth,
  getMonthWindow,
  getNextMonthKey,
  getPreviousMonthKey,
} from "./month";

export type MonthComparison =
  | { kind: "no_previous_data" }
  | { kind: "unchanged"; delta: 0; percentage: 0 }
  | { kind: "increased" | "decreased"; delta: number; percentage: number };

export type MonthlyDashboard = {
  month: DashboardMonth;
  totals: DashboardTotals;
  previousTotals: DashboardTotals;
  comparison: {
    income: MonthComparison;
    expense: MonthComparison;
    remaining: MonthComparison;
  };
  categoryBreakdown: CategoryBreakdownItem[];
  recentTransactions: RecentDashboardTransaction[];
  isEmpty: boolean;
};

type DashboardTotals = {
  income: number;
  expense: number;
  remaining: number;
};

export type CategoryBreakdownItem = {
  categoryId: string;
  name: string;
  color: string | null;
  amount: number;
  percentage: number;
};

export type RecentDashboardTransaction = {
  id: string;
  type: "income" | "expense";
  amount: number;
  note: string;
  transactionDate: string;
  categoryName: string;
};

type TransactionWithCategory = Awaited<
  ReturnType<typeof listTransactionsForMonth>
>[number];

async function listTransactionsForMonth(userId: string, monthKey: string) {
  const window = getMonthWindow(monthKey);

  return db.transaction.findMany({
    where: {
      userId,
      transactionDate: {
        gte: window.start,
        lt: window.end,
      },
    },
    include: { category: true },
    orderBy: [{ transactionDate: "desc" }, { createdAt: "desc" }],
  });
}

function calculateTotals(
  transactions: TransactionWithCategory[],
): DashboardTotals {
  const totals = transactions.reduce(
    (current, transaction) => {
      if (transaction.type === "income") {
        return { ...current, income: current.income + transaction.amount };
      }

      return { ...current, expense: current.expense + transaction.amount };
    },
    { income: 0, expense: 0 },
  );

  return {
    ...totals,
    remaining: totals.income - totals.expense,
  };
}

function compareMonth(current: number, previous: number): MonthComparison {
  if (previous === 0) {
    return { kind: "no_previous_data" };
  }

  const delta = current - previous;

  if (delta === 0) {
    return { kind: "unchanged", delta: 0, percentage: 0 };
  }

  return {
    kind: delta > 0 ? "increased" : "decreased",
    delta: Math.abs(delta),
    percentage: Math.round((Math.abs(delta) / Math.abs(previous)) * 100),
  };
}

function buildCategoryBreakdown(
  transactions: TransactionWithCategory[],
  totalExpense: number,
): CategoryBreakdownItem[] {
  const breakdown = new Map<string, CategoryBreakdownItem>();

  for (const transaction of transactions) {
    if (transaction.type !== "expense") {
      continue;
    }

    const existing = breakdown.get(transaction.categoryId);

    breakdown.set(transaction.categoryId, {
      categoryId: transaction.categoryId,
      name: transaction.category.name,
      color: transaction.category.color,
      amount: (existing?.amount ?? 0) + transaction.amount,
      percentage: 0,
    });
  }

  return Array.from(breakdown.values())
    .map((item) => ({
      ...item,
      percentage:
        totalExpense > 0 ? Math.round((item.amount / totalExpense) * 100) : 0,
    }))
    .sort((a, b) => b.amount - a.amount);
}

function buildRecentTransactions(
  transactions: TransactionWithCategory[],
): RecentDashboardTransaction[] {
  return transactions.slice(0, 5).map((transaction) => ({
    id: transaction.id,
    type: transaction.type,
    amount: transaction.amount,
    note: transaction.note,
    transactionDate: transaction.transactionDate.toISOString(),
    categoryName: transaction.category.name,
  }));
}

export async function getMonthlyDashboard(
  userId: string,
  month: DashboardMonth | string,
): Promise<MonthlyDashboard> {
  const monthKey = typeof month === "string" ? month : month.key;
  const selectedMonth =
    typeof month === "string"
      ? {
          key: month,
          label: `Tháng ${month.slice(5, 7)}/${month.slice(0, 4)}`,
          previousKey: getPreviousMonthKey(month),
          nextKey: getNextMonthKey(month),
        }
      : month;
  const [transactions, previousTransactions] = await Promise.all([
    listTransactionsForMonth(userId, monthKey),
    listTransactionsForMonth(userId, selectedMonth.previousKey),
  ]);
  const totals = calculateTotals(transactions);
  const previousTotals = calculateTotals(previousTransactions);

  return {
    month: selectedMonth,
    totals,
    previousTotals,
    comparison: {
      income: compareMonth(totals.income, previousTotals.income),
      expense: compareMonth(totals.expense, previousTotals.expense),
      remaining: compareMonth(totals.remaining, previousTotals.remaining),
    },
    categoryBreakdown: buildCategoryBreakdown(transactions, totals.expense),
    recentTransactions: buildRecentTransactions(transactions),
    isEmpty: transactions.length === 0,
  };
}
