import { PageHeader } from "@/components/app-ui";
import { CategoryManager } from "@/features/categories/category-manager";
import { listCategories } from "@/features/categories/service";
import { listTransactions } from "@/features/transactions/service";
import { getCurrentUser } from "@/lib/auth-session";

function monthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function previousMonthKey(date: Date) {
  return monthKey(new Date(date.getFullYear(), date.getMonth() - 1, 1));
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
  const now = new Date();
  const currentMonth = monthKey(now);
  const previousMonth = previousMonthKey(now);
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
