import { getMonthWindow } from "@/features/dashboard/month";
import { db } from "@/lib/db";

import type { TransactionCreateInput, TransactionUpdateInput } from "./schemas";

type TransactionListWhere = {
  userId: string;
  transactionDate?: {
    gte: Date;
    lt: Date;
  };
};

type PaginatedTransactionInput = {
  monthKey?: string;
  page: number;
  pageSize: number;
};

async function validateCategoryForTransaction(
  userId: string,
  categoryId: string,
  type: "income" | "expense",
) {
  const category = await db.category.findFirst({
    where: { id: categoryId, userId },
  });

  if (!category) {
    return { ok: false as const, reason: "missing_category" as const };
  }

  if (category.type && category.type !== type) {
    return { ok: false as const, reason: "type_mismatch" as const };
  }

  return { ok: true as const, category };
}

export async function listTransactions(userId: string, monthKey?: string) {
  const where = getTransactionListWhere(userId, monthKey);

  return db.transaction.findMany({
    where,
    include: { category: true },
    orderBy: [{ transactionDate: "desc" }, { createdAt: "desc" }],
  });
}

function getTransactionListWhere(
  userId: string,
  monthKey?: string,
): TransactionListWhere {
  const monthWindow = monthKey ? getMonthWindow(monthKey) : null;

  return {
    userId,
    ...(monthWindow
      ? {
          transactionDate: {
            gte: monthWindow.start,
            lt: monthWindow.end,
          },
        }
      : {}),
  };
}

export async function listPaginatedTransactions(
  userId: string,
  input: PaginatedTransactionInput,
) {
  const where = getTransactionListWhere(userId, input.monthKey);
  const total = await db.transaction.count({ where });
  const page = Math.max(1, Math.min(input.page, Math.ceil(total / input.pageSize) || 1));

  const transactions = await db.transaction.findMany({
    where,
    include: { category: true },
    orderBy: [{ transactionDate: "desc" }, { createdAt: "desc" }],
    skip: (page - 1) * input.pageSize,
    take: input.pageSize,
  });

  return {
    transactions,
    total,
    page,
    pageSize: input.pageSize,
  };
}

export async function getTransaction(userId: string, id: string) {
  return db.transaction.findFirst({
    where: { id, userId },
    include: { category: true },
  });
}

export async function createTransaction(
  userId: string,
  input: TransactionCreateInput,
) {
  const categoryResult = await validateCategoryForTransaction(
    userId,
    input.categoryId,
    input.type,
  );

  if (!categoryResult.ok) {
    return categoryResult;
  }

  const transaction = await db.transaction.create({
    data: {
      userId,
      categoryId: input.categoryId,
      type: input.type,
      amount: input.amount,
      note: input.note,
      merchant: input.merchant,
      rawInput: input.rawInput,
      transactionDate: input.transactionDate,
    },
    include: { category: true },
  });

  return { ok: true as const, transaction };
}

export async function updateTransaction(
  userId: string,
  id: string,
  input: TransactionUpdateInput,
) {
  const existing = await getTransaction(userId, id);

  if (!existing) {
    return { ok: false as const, reason: "not_found" as const };
  }

  const nextType = input.type ?? existing.type;
  const nextCategoryId = input.categoryId ?? existing.categoryId;
  const categoryResult = await validateCategoryForTransaction(
    userId,
    nextCategoryId,
    nextType,
  );

  if (!categoryResult.ok) {
    return categoryResult;
  }

  const transaction = await db.transaction.update({
    where: { id },
    data: input,
    include: { category: true },
  });

  return { ok: true as const, transaction };
}

export async function deleteTransaction(userId: string, id: string) {
  const existing = await getTransaction(userId, id);

  if (!existing) {
    return false;
  }

  await db.transaction.delete({
    where: { id },
  });

  return true;
}
