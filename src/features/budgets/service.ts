import { getMonthWindow } from "@/features/dashboard/month";
import { db } from "@/lib/db";

import type { BudgetDeleteInput, BudgetUpsertInput } from "./schemas";
import { toBudgetPeriod } from "./schemas";

export const BUDGET_NEAR_LIMIT_RATIO = 0.8;

export type BudgetStatus =
  | "not_set"
  | "healthy"
  | "near_limit"
  | "over_limit";

export type CategoryBudgetRow = {
  categoryId: string;
  categoryName: string;
  categoryColor: string | null;
  defaultAmount: number | null;
  monthAmount: number | null;
  effectiveAmount: number | null;
  spentAmount: number;
  remainingAmount: number | null;
  progressPercentage: number | null;
  status: BudgetStatus;
};

export type BudgetSummary = {
  totalBudget: number;
  totalSpent: number;
  remaining: number;
  overAmount: number;
};

export type CategoryBudgetList = {
  rows: CategoryBudgetRow[];
  summary: BudgetSummary;
};

export type DashboardBudgetSummary = CategoryBudgetList & {
  items: CategoryBudgetRow[];
};

type BudgetPeriodInput = {
  scope: "default" | "month";
  month?: string;
};

function periodFromInput(input: BudgetPeriodInput) {
  return toBudgetPeriod(
    input.scope === "default"
      ? { scope: "default" }
      : { scope: "month", month: input.month! },
  );
}

async function validateExpenseCategory(userId: string, categoryId: string) {
  const category = await db.category.findFirst({
    where: { id: categoryId, userId },
  });

  if (!category || category.type !== "expense") {
    return { ok: false as const, reason: "invalid_category" as const };
  }

  return { ok: true as const, category };
}

export function getBudgetStatus(
  effectiveAmount: number | null,
  spentAmount: number,
): BudgetStatus {
  if (!effectiveAmount) {
    return "not_set";
  }

  if (spentAmount > effectiveAmount) {
    return "over_limit";
  }

  if (spentAmount / effectiveAmount >= BUDGET_NEAR_LIMIT_RATIO) {
    return "near_limit";
  }

  return "healthy";
}

export async function listCategoryBudgetRows(
  userId: string,
  monthKey: string,
): Promise<CategoryBudgetList> {
  const window = getMonthWindow(monthKey);
  const [categories, budgets, spending] = await Promise.all([
    db.category.findMany({
      where: { userId, type: "expense" },
      orderBy: { name: "asc" },
    }),
    db.categoryBudget.findMany({
      where: {
        userId,
        period: { in: ["default", monthKey] },
      },
    }),
    db.transaction.groupBy({
      by: ["categoryId"],
      where: {
        userId,
        type: "expense",
        transactionDate: {
          gte: window.start,
          lt: window.end,
        },
      },
      _sum: { amount: true },
    }),
  ]);

  const defaultBudgets = new Map(
    budgets
      .filter((budget) => budget.period === "default")
      .map((budget) => [budget.categoryId, budget.amount]),
  );
  const monthBudgets = new Map(
    budgets
      .filter((budget) => budget.period === monthKey)
      .map((budget) => [budget.categoryId, budget.amount]),
  );
  const spentAmounts = new Map(
    spending.map((item) => [item.categoryId, item._sum.amount ?? 0]),
  );

  const rows = categories.map((category) => {
    const defaultAmount = defaultBudgets.get(category.id) ?? null;
    const monthAmount = monthBudgets.get(category.id) ?? null;
    const effectiveAmount = monthAmount ?? defaultAmount;
    const spentAmount = spentAmounts.get(category.id) ?? 0;
    const remainingAmount =
      effectiveAmount === null ? null : effectiveAmount - spentAmount;
    const progressPercentage =
      effectiveAmount === null
        ? null
        : Math.min(999, Math.round((spentAmount / effectiveAmount) * 100));

    return {
      categoryId: category.id,
      categoryName: category.name,
      categoryColor: category.color,
      defaultAmount,
      monthAmount,
      effectiveAmount,
      spentAmount,
      remainingAmount,
      progressPercentage,
      status: getBudgetStatus(effectiveAmount, spentAmount),
    };
  });

  const budgetedRows = rows.filter((row) => row.effectiveAmount !== null);
  const totalBudget = budgetedRows.reduce(
    (total, row) => total + (row.effectiveAmount ?? 0),
    0,
  );
  const totalSpent = budgetedRows.reduce(
    (total, row) => total + row.spentAmount,
    0,
  );
  const overAmount = budgetedRows.reduce(
    (total, row) =>
      total + Math.max(0, row.spentAmount - (row.effectiveAmount ?? 0)),
    0,
  );

  return {
    rows,
    summary: {
      totalBudget,
      totalSpent,
      remaining: totalBudget - totalSpent,
      overAmount,
    },
  };
}

export async function listDashboardBudgetSummary(
  userId: string,
  monthKey: string,
): Promise<DashboardBudgetSummary> {
  const result = await listCategoryBudgetRows(userId, monthKey);
  const statusRank: Record<BudgetStatus, number> = {
    over_limit: 0,
    near_limit: 1,
    healthy: 2,
    not_set: 3,
  };

  const items = result.rows
    .filter((row) => row.effectiveAmount !== null)
    .sort((a, b) => {
      const rankDelta = statusRank[a.status] - statusRank[b.status];

      if (rankDelta !== 0) {
        return rankDelta;
      }

      return (b.progressPercentage ?? 0) - (a.progressPercentage ?? 0);
    })
    .slice(0, 5);

  return { ...result, items };
}

export async function upsertBudget(userId: string, input: BudgetUpsertInput) {
  const categoryResult = await validateExpenseCategory(userId, input.categoryId);

  if (!categoryResult.ok) {
    return categoryResult;
  }

  const period = periodFromInput(input);
  const budget = await db.categoryBudget.upsert({
    where: {
      userId_categoryId_period: {
        userId,
        categoryId: input.categoryId,
        period,
      },
    },
    create: {
      userId,
      categoryId: input.categoryId,
      period,
      amount: input.amount,
    },
    update: { amount: input.amount },
  });

  return { ok: true as const, budget };
}

export async function deleteBudget(userId: string, input: BudgetDeleteInput) {
  const categoryResult = await validateExpenseCategory(userId, input.categoryId);

  if (!categoryResult.ok) {
    return categoryResult;
  }

  const period = periodFromInput(input);
  const result = await db.categoryBudget.deleteMany({
    where: {
      userId,
      categoryId: input.categoryId,
      period,
    },
  });

  return { ok: true as const, count: result.count };
}
