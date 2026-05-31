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
  healthScore: FinancialHealthScore;
  comparison: {
    income: MonthComparison;
    expense: MonthComparison;
    remaining: MonthComparison;
  };
  categoryBreakdown: CategoryBreakdownItem[];
  categoryAnalysis: CategoryAnalysisItem[];
  spendingTrend: SpendingTrendPoint[];
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

export type CategoryAnalysisItem = CategoryBreakdownItem & {
  previousAmount: number;
  changePercentage: number | null;
  changeKind: "new" | "increased" | "decreased" | "unchanged";
};

export type SpendingTrendPoint = {
  date: string;
  amount: number;
};

export type FinancialHealthScore = {
  score: number;
  level: string;
  savingsRate: number;
  explanation: string;
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

function buildCategoryAmountMap(transactions: TransactionWithCategory[]) {
  const amounts = new Map<string, number>();

  for (const transaction of transactions) {
    if (transaction.type !== "expense") {
      continue;
    }

    amounts.set(
      transaction.categoryId,
      (amounts.get(transaction.categoryId) ?? 0) + transaction.amount,
    );
  }

  return amounts;
}

function buildCategoryAnalysis(
  currentBreakdown: CategoryBreakdownItem[],
  previousTransactions: TransactionWithCategory[],
): CategoryAnalysisItem[] {
  const previousAmounts = buildCategoryAmountMap(previousTransactions);

  return currentBreakdown.map((item) => {
    const previousAmount = previousAmounts.get(item.categoryId) ?? 0;
    const delta = item.amount - previousAmount;

    if (previousAmount === 0) {
      return {
        ...item,
        previousAmount,
        changePercentage: null,
        changeKind: "new",
      };
    }

    if (delta === 0) {
      return {
        ...item,
        previousAmount,
        changePercentage: 0,
        changeKind: "unchanged",
      };
    }

    return {
      ...item,
      previousAmount,
      changePercentage: Math.round((Math.abs(delta) / previousAmount) * 100),
      changeKind: delta > 0 ? "increased" : "decreased",
    };
  });
}

function buildSpendingTrend(
  monthKey: string,
  transactions: TransactionWithCategory[],
): SpendingTrendPoint[] {
  const window = getMonthWindow(monthKey);
  const daysInMonth = Math.round(
    (window.end.getTime() - window.start.getTime()) / (24 * 60 * 60 * 1000),
  );
  const trend = new Map<string, number>();

  for (const transaction of transactions) {
    if (transaction.type !== "expense") {
      continue;
    }

    const date = transaction.transactionDate.toISOString().slice(0, 10);
    trend.set(date, (trend.get(date) ?? 0) + transaction.amount);
  }

  return Array.from({ length: daysInMonth }, (_, index) => {
    const date = new Date(window.start);
    date.setUTCDate(index + 1);
    const dateKey = date.toISOString().slice(0, 10);

    return {
      date: dateKey,
      amount: trend.get(dateKey) ?? 0,
    };
  });
}

function buildHealthScore(
  totals: DashboardTotals,
  expenseComparison: MonthComparison,
): FinancialHealthScore {
  if (totals.income <= 0) {
    return {
      score: 0,
      level: "Chưa đủ dữ liệu",
      savingsRate: 0,
      explanation: "Thêm giao dịch để MoneyMind AI tính điểm tài chính.",
    };
  }

  const savingsRate = Math.max(
    0,
    Math.round((totals.remaining / totals.income) * 100),
  );
  const expensePenalty =
    expenseComparison.kind === "increased"
      ? Math.min(18, Math.round(expenseComparison.percentage * 0.07))
      : 0;
  const expenseBonus =
    expenseComparison.kind === "decreased"
      ? Math.min(8, Math.round(expenseComparison.percentage * 0.05))
      : 0;
  const rawScore = 58 + savingsRate * 0.35 - expensePenalty + expenseBonus;
  const score = Math.max(0, Math.min(100, Math.round(rawScore)));
  const level =
    score >= 85
      ? "Đà rất tốt"
      : score >= 70
        ? "Đang tích lũy tốt"
        : score >= 55
          ? "Tương đối cân bằng"
          : score >= 40
            ? "Cần chú ý thêm"
            : "Cần điều chỉnh sớm";

  const comparisonNote =
    expenseComparison.kind === "increased"
      ? `nhưng chi tiêu tăng ${expenseComparison.percentage}% so với tháng trước.`
      : expenseComparison.kind === "decreased"
        ? `và chi tiêu giảm ${expenseComparison.percentage}% so với tháng trước.`
        : expenseComparison.kind === "unchanged"
          ? "và chi tiêu không đổi so với tháng trước."
          : "chưa có dữ liệu tháng trước để so sánh.";

  return {
    score,
    level,
    savingsRate,
    explanation: `Tỷ lệ tiết kiệm ${savingsRate}%, ${comparisonNote}`,
  };
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
  const expenseComparison = compareMonth(
    totals.expense,
    previousTotals.expense,
  );
  const categoryBreakdown = buildCategoryBreakdown(
    transactions,
    totals.expense,
  );

  return {
    month: selectedMonth,
    totals,
    previousTotals,
    healthScore: buildHealthScore(totals, expenseComparison),
    comparison: {
      income: compareMonth(totals.income, previousTotals.income),
      expense: expenseComparison,
      remaining: compareMonth(totals.remaining, previousTotals.remaining),
    },
    categoryBreakdown,
    categoryAnalysis: buildCategoryAnalysis(
      categoryBreakdown,
      previousTransactions,
    ),
    spendingTrend: buildSpendingTrend(monthKey, transactions),
    recentTransactions: buildRecentTransactions(transactions),
    isEmpty: transactions.length === 0,
  };
}
