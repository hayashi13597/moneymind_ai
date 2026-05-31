import { cookies } from "next/headers";

import { PageHeader } from "@/components/app-ui";
import { CategoryManager } from "@/features/categories/category-manager";
import { listCategories } from "@/features/categories/service";
import {
  getCurrentMonthKey,
  getPreviousMonthKey,
  USER_TIME_ZONE_COOKIE,
} from "@/features/dashboard/month";
import { listTransactions } from "@/features/transactions/service";
import { getCurrentUser } from "@/lib/auth-session";

function monthKey(date: Date) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(
    2,
    "0",
  )}`;
}

export default async function CategoriesPage() {
  const user = await getCurrentUser();

  if (!user) {
    return null;
  }

  const [categories, transactions] = await Promise.all([
    listCategories(user.id),
    listTransactions(user.id),
  ]);
  const userTimeZone = (await cookies()).get(USER_TIME_ZONE_COOKIE)?.value;
  const currentMonth = getCurrentMonthKey(new Date(), userTimeZone);
  const previousMonth = getPreviousMonthKey(currentMonth);
  const categoryInsights = categories.map((category) => {
    const categoryTransactions = transactions.filter(
      (transaction) => transaction.categoryId === category.id,
    );
    const currentAmount = categoryTransactions
      .filter(
        (transaction) =>
          monthKey(transaction.transactionDate) === currentMonth &&
          transaction.type === "expense",
      )
      .reduce((total, transaction) => total + transaction.amount, 0);
    const previousAmount = categoryTransactions
      .filter(
        (transaction) =>
          monthKey(transaction.transactionDate) === previousMonth &&
          transaction.type === "expense",
      )
      .reduce((total, transaction) => total + transaction.amount, 0);
    const changePercentage =
      previousAmount > 0
        ? Math.round(((currentAmount - previousAmount) / previousAmount) * 100)
        : currentAmount > 0
          ? 100
          : 0;

    return {
      categoryId: category.id,
      currentAmount,
      previousAmount,
      changePercentage,
      transactionCount: categoryTransactions.length,
    };
  });

  return (
    <section className="space-y-8">
      <PageHeader
        eyebrow="Danh mục"
        title="Bản đồ thói quen chi tiêu"
        description="Danh mục không chỉ để lưu giao dịch. MoneyMind AI dùng chúng để đọc xu hướng, phát hiện tăng trưởng bất thường và gợi ý điều chỉnh."
      />
      <CategoryManager
        initialCategories={categories}
        categoryInsights={categoryInsights}
      />
    </section>
  );
}
