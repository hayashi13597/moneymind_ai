import type {
  AgentCreateInput,
  AgentDeleteInput,
  AgentSearchInput,
  AgentTransactionSummary,
  AgentUpdateInput,
} from "@/features/agent/schemas";
import { formatAgentDate } from "@/features/agent/tools/finance";
import {
  createTransaction,
  deleteTransaction,
  updateTransaction,
} from "@/features/transactions/service";
import { db } from "@/lib/db";

type AgentCategory = {
  id: string;
  name: string;
  type: "income" | "expense" | null;
};

type TransactionWithCategory = {
  id: string;
  type: "income" | "expense";
  amount: number;
  transactionDate: Date;
  merchant: string | null;
  note: string;
  categoryId: string;
  category: { name: string };
};

function normalizeName(value: string) {
  return value.trim().toLocaleLowerCase("vi-VN");
}

function parseMonthKey(input: string) {
  const match = input.match(/^(\d{4})-(\d{2})$/);

  if (!match) {
    return null;
  }

  const month = Number(match[2]);

  if (month < 1 || month > 12) {
    return null;
  }

  return { year: Number(match[1]), monthIndex: month - 1 };
}

function getMonthRange(month: string) {
  const parts = parseMonthKey(month);

  if (!parts) {
    throw new Error(`Invalid month key: ${month}`);
  }

  return {
    start: new Date(Date.UTC(parts.year, parts.monthIndex, 1)),
    end: new Date(Date.UTC(parts.year, parts.monthIndex + 1, 1)),
  };
}

function toSummary(
  transaction: TransactionWithCategory,
): AgentTransactionSummary {
  return {
    id: transaction.id,
    date: formatAgentDate(transaction.transactionDate),
    type: transaction.type,
    amount: transaction.amount,
    categoryName: transaction.category.name,
    merchant: transaction.merchant,
    note: transaction.note,
  };
}

function candidateLabel(transaction: AgentTransactionSummary) {
  return [
    `${transaction.amount} đ`,
    transaction.categoryName,
    transaction.date,
    transaction.merchant,
    transaction.note,
  ]
    .filter(Boolean)
    .join(", ");
}

async function listCategories(userId: string): Promise<AgentCategory[]> {
  return db.category.findMany({
    where: { userId },
    orderBy: [{ type: "asc" }, { name: "asc" }],
    select: { id: true, name: true, type: true },
  });
}

function resolveCategory(
  categories: AgentCategory[],
  type: "income" | "expense",
  categoryName: string,
): AgentCategory | undefined {
  const normalized = normalizeName(categoryName);
  const typed = categories.filter(
    (category) => !category.type || category.type === type,
  );

  return (
    typed.find((category) => normalizeName(category.name) === normalized) ??
    typed.find((category) =>
      normalizeName(category.name).includes(normalized),
    ) ??
    typed.find(
      (category) =>
        normalizeName(category.name) ===
        (type === "income" ? "thu nhập" : "khác"),
    )
  );
}

export async function searchAgentTransactions(
  userId: string,
  selectedMonth: string,
  input: AgentSearchInput,
) {
  const month = input.month ?? selectedMonth;
  const { start, end } = getMonthRange(month);
  const transactions = (await db.transaction.findMany({
    where: {
      userId,
      transactionDate: { gte: start, lt: end },
      ...(input.type ? { type: input.type } : {}),
      ...(input.minAmount || input.maxAmount
        ? {
            amount: {
              ...(input.minAmount ? { gte: input.minAmount } : {}),
              ...(input.maxAmount ? { lte: input.maxAmount } : {}),
            },
          }
        : {}),
    },
    include: { category: true },
    orderBy: [{ transactionDate: "desc" }, { createdAt: "desc" }],
    take: 50,
  })) as TransactionWithCategory[];

  const categoryTerm = input.categoryName
    ? normalizeName(input.categoryName)
    : "";
  const merchantTerm = input.merchant ? normalizeName(input.merchant) : "";
  const textTerm = normalizeName(input.text ?? input.query);

  const filtered = transactions.filter((transaction) => {
    const haystack = normalizeName(
      [
        transaction.category.name,
        transaction.merchant ?? "",
        transaction.note,
        String(transaction.amount),
      ].join(" "),
    );

    if (
      categoryTerm &&
      !normalizeName(transaction.category.name).includes(categoryTerm)
    ) {
      return false;
    }

    if (
      merchantTerm &&
      !normalizeName(transaction.merchant ?? "").includes(merchantTerm)
    ) {
      return false;
    }

    return textTerm
      .split(/\s+/)
      .filter((part) => part.length >= 2)
      .some((part) => haystack.includes(part));
  });

  return { transactions: filtered.slice(0, 8).map(toSummary), total: filtered.length };
}

export async function createAgentTransaction(
  userId: string,
  input: AgentCreateInput,
) {
  const category = resolveCategory(
    await listCategories(userId),
    input.type,
    input.categoryName,
  );

  if (!category) {
    return { ok: false as const, reason: "missing_category" as const };
  }

  return createTransaction(userId, {
    type: input.type,
    amount: input.amount,
    categoryId: category.id,
    note: input.note,
    merchant: input.merchant ?? undefined,
    rawInput: input.note,
    transactionDate: new Date(`${input.transactionDate}T00:00:00.000Z`),
  });
}

async function findTargetCandidates(
  userId: string,
  month: string,
  targetQuery: string,
  transactionId?: string,
) {
  if (transactionId) {
    const direct = (await db.transaction.findMany({
      where: { userId, id: transactionId },
      include: { category: true },
      take: 1,
    })) as TransactionWithCategory[];

    return direct.map(toSummary);
  }

  const result = await searchAgentTransactions(userId, month, {
    query: targetQuery,
    text: targetQuery,
  });

  return result.transactions;
}

export async function updateAgentTransaction(
  userId: string,
  month: string,
  input: AgentUpdateInput,
) {
  const candidates = await findTargetCandidates(
    userId,
    month,
    input.targetQuery,
    input.transactionId,
  );

  if (input.transactionId && candidates.length === 0) {
    return { ok: false as const, reason: "not_found" as const };
  }

  if (candidates.length !== 1) {
    return {
      ok: false as const,
      reason: "clarification_required" as const,
      candidates: candidates.map((candidate) => ({
        id: candidate.id,
        label: candidateLabel(candidate),
      })),
    };
  }

  const categories = await listCategories(userId);
  const category = input.updates.categoryName
    ? resolveCategory(
        categories,
        input.updates.type ?? candidates[0].type,
        input.updates.categoryName,
      )
    : null;

  if (input.updates.categoryName && !category) {
    return { ok: false as const, reason: "missing_category" as const };
  }

  const result = await updateTransaction(userId, candidates[0].id, {
    ...(input.updates.type ? { type: input.updates.type } : {}),
    ...(input.updates.amount ? { amount: input.updates.amount } : {}),
    ...(category ? { categoryId: category.id } : {}),
    ...(input.updates.note ? { note: input.updates.note } : {}),
    ...(input.updates.merchant !== undefined
      ? { merchant: input.updates.merchant ?? undefined }
      : {}),
    ...(input.updates.transactionDate
      ? {
          transactionDate: new Date(
            `${input.updates.transactionDate}T00:00:00.000Z`,
          ),
        }
      : {}),
  });

  return result.ok ? { ok: true as const, transaction: result.transaction } : result;
}

export async function deleteAgentTransaction(
  userId: string,
  month: string,
  input: AgentDeleteInput,
) {
  const candidates = await findTargetCandidates(
    userId,
    month,
    input.targetQuery,
    input.transactionId,
  );

  if (input.transactionId && candidates.length === 0) {
    return { ok: false as const, reason: "not_found" as const };
  }

  if (candidates.length !== 1) {
    return {
      ok: false as const,
      reason: "clarification_required" as const,
      candidates: candidates.map((candidate) => ({
        id: candidate.id,
        label: candidateLabel(candidate),
      })),
    };
  }

  const deleted = await deleteTransaction(userId, candidates[0].id);

  if (!deleted) {
    return { ok: false as const, reason: "not_found" as const };
  }

  return { ok: true as const, transaction: candidates[0] };
}
