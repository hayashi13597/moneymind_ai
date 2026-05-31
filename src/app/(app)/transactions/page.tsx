import { PageHeader } from "@/components/app-ui";
import { listCategories } from "@/features/categories/service";
import { TransactionManager } from "@/features/transactions/transaction-manager";
import { listTransactions } from "@/features/transactions/service";
import { getCurrentUser } from "@/lib/auth-session";

export default async function TransactionsPage() {
  const user = await getCurrentUser();

  if (!user) {
    return null;
  }

  const [transactions, categories] = await Promise.all([
    listTransactions(user.id),
    listCategories(user.id),
  ]);
  const transactionItems = transactions.map((transaction) => ({
    ...transaction,
    transactionDate: transaction.transactionDate.toISOString(),
  }));

  return (
    <section className="space-y-8">
      <PageHeader
        eyebrow="Giao dịch"
        title="Dòng tiền hằng ngày"
        description="Theo dõi thu chi như một activity feed. MoneyMind AI giúp đọc mô tả tự nhiên, phân loại giao dịch và học dần thói quen chi tiêu của bạn."
      />
      <TransactionManager
        initialTransactions={transactionItems}
        categories={categories}
      />
    </section>
  );
}
