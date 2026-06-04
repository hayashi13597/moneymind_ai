import { Prisma } from "@prisma/client";

import { db } from "@/lib/db";

import type { CategoryCreateInput, CategoryUpdateInput } from "./schemas";

const CATEGORY_COLOR_PALETTE = [
  "#16a34a",
  "#ef4444",
  "#a16207",
  "#db2777",
  "#2563eb",
  "#7c3aed",
  "#ea580c",
  "#0891b2",
  "#4f46e5",
  "#64748b",
  "#2F6B4F",
  "#A2482D",
  "#0F766E",
  "#B45309",
  "#BE185D",
  "#4338CA",
] as const;

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
  const color = input.color ?? (await pickUnusedCategoryColor(userId));

  return db.category.create({
    data: {
      userId,
      name: input.name,
      type: input.type,
      color,
      icon: input.icon,
    },
  });
}

async function pickUnusedCategoryColor(userId: string) {
  const existingCategories = await db.category.findMany({
    where: {
      userId,
      color: { not: null },
    },
    select: { color: true },
  });
  const usedColors = new Set(
    existingCategories
      .map((category) => category.color?.toLowerCase())
      .filter((color): color is string => Boolean(color)),
  );

  return (
    CATEGORY_COLOR_PALETTE.find(
      (color) => !usedColors.has(color.toLowerCase()),
    ) ??
    CATEGORY_COLOR_PALETTE[
      existingCategories.length % CATEGORY_COLOR_PALETTE.length
    ]
  );
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
