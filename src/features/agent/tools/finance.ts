import { getMonthlyDashboard } from "@/features/dashboard/service";
import { db } from "@/lib/db";

const MAX_AGENT_CONTEXT_TRANSACTIONS = 100;

function parseMonthKey(input: string) {
  const match = input.match(/^(\d{4})-(\d{2})$/);

  if (!match) {
    return null;
  }

  return { year: Number(match[1]), monthIndex: Number(match[2]) - 1 };
}

export function formatAgentDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

export async function listAgentCategories(userId: string) {
  return db.category.findMany({
    where: { userId },
    orderBy: [{ type: "asc" }, { name: "asc" }],
    select: { id: true, name: true, type: true },
  });
}

export async function listAgentRecentTransactions(
  userId: string,
  month: string,
) {
  const parts = parseMonthKey(month);

  if (!parts) {
    throw new Error(`Invalid month key: ${month}`);
  }

  const start = new Date(Date.UTC(parts.year, parts.monthIndex - 5, 1));
  const end = new Date(Date.UTC(parts.year, parts.monthIndex + 1, 1));

  const transactions = await db.transaction.findMany({
    where: {
      userId,
      transactionDate: { gte: start, lt: end },
    },
    include: { category: true },
    orderBy: [{ transactionDate: "desc" }, { createdAt: "desc" }],
    take: MAX_AGENT_CONTEXT_TRANSACTIONS,
  });

  return transactions.map((transaction) => ({
    id: transaction.id,
    date: formatAgentDate(transaction.transactionDate),
    type: transaction.type,
    amount: transaction.amount,
    categoryName: transaction.category.name,
    merchant: transaction.merchant,
    note: transaction.note,
  }));
}

export async function buildAgentFinanceContext(userId: string, month: string) {
  const [dashboard, categories, transactions] = await Promise.all([
    getMonthlyDashboard(userId, month),
    listAgentCategories(userId),
    listAgentRecentTransactions(userId, month),
  ]);

  return { month, dashboard, categories, transactions };
}

export function formatDashboardExplanation({
  month,
  dashboard,
}: {
  month: string;
  dashboard: {
    totals: { income: number; expense: number; remaining: number };
    categoryBreakdown: Array<{ name: string; amount: number }>;
  };
}) {
  return [
    `Tháng ${month}`,
    `Tổng thu nhập: ${dashboard.totals.income}`,
    `Tổng chi tiêu: ${dashboard.totals.expense}`,
    `Còn lại: ${dashboard.totals.remaining}`,
    "Chi theo danh mục:",
    JSON.stringify(dashboard.categoryBreakdown),
  ].join("\n");
}
