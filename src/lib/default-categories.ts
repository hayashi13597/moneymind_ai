import type { TransactionType } from "@prisma/client";

type DefaultCategory = {
  name: string;
  type: TransactionType;
  color: string;
  icon: string;
};

export const DEFAULT_CATEGORIES = [
  { name: "Thu nhập", type: "income", color: "#16a34a", icon: "wallet" },
  { name: "Ăn uống", type: "expense", color: "#ef4444", icon: "utensils" },
  { name: "Cafe", type: "expense", color: "#a16207", icon: "coffee" },
  { name: "Mua sắm", type: "expense", color: "#db2777", icon: "shopping-bag" },
  { name: "Di chuyển", type: "expense", color: "#2563eb", icon: "car" },
  { name: "Nhà cửa", type: "expense", color: "#7c3aed", icon: "home" },
  { name: "Giải trí", type: "expense", color: "#ea580c", icon: "ticket" },
  { name: "Sức khỏe", type: "expense", color: "#0891b2", icon: "heart-pulse" },
  { name: "Giáo dục", type: "expense", color: "#4f46e5", icon: "graduation-cap" },
  { name: "Khác", type: "expense", color: "#64748b", icon: "circle" },
] satisfies DefaultCategory[];

export function createDefaultCategoryRows(userId: string) {
  return DEFAULT_CATEGORIES.map((category) => ({
    ...category,
    userId,
    isDefault: true,
  }));
}

export async function ensureDefaultCategories(userId: string) {
  const { db } = await import("@/lib/db");

  await db.category.createMany({
    data: createDefaultCategoryRows(userId),
    skipDuplicates: true,
  });
}
