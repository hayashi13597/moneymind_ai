import { Prisma } from "@prisma/client";

import { db } from "@/lib/db";

import type { CategoryCreateInput, CategoryUpdateInput } from "./schemas";

export async function listCategories(userId: string) {
  return db.category.findMany({
    where: { userId },
    orderBy: [{ type: "asc" }, { name: "asc" }],
  });
}

export async function getCategory(userId: string, id: string) {
  return db.category.findFirst({
    where: { id, userId },
  });
}

export async function createCategory(
  userId: string,
  input: CategoryCreateInput,
) {
  return db.category.create({
    data: {
      userId,
      name: input.name,
      type: input.type,
      color: input.color,
      icon: input.icon,
    },
  });
}

export async function updateCategory(
  userId: string,
  id: string,
  input: CategoryUpdateInput,
) {
  const existing = await getCategory(userId, id);

  if (!existing) {
    return null;
  }

  return db.category.update({
    where: { id },
    data: input,
  });
}

export async function deleteCategory(userId: string, id: string) {
  const existing = await getCategory(userId, id);

  if (!existing) {
    return { ok: false as const, reason: "not_found" as const };
  }

  const transactionCount = await db.transaction.count({
    where: { userId, categoryId: id },
  });

  if (transactionCount > 0) {
    return { ok: false as const, reason: "in_use" as const };
  }

  await db.category.delete({
    where: { id },
  });

  return { ok: true as const };
}

export function isUniqueCategoryError(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  );
}
