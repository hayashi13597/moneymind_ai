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
    <section className="space-y-6">
      <div className="space-y-2">
        <p className="text-sm font-medium text-muted-foreground">Giao dịch</p>
        <h1 className="text-2xl font-semibold tracking-normal">
          Thu chi hằng ngày
        </h1>
        <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
          Ghi lại thu nhập và chi tiêu bằng VND, có hỗ trợ nhập nhanh như 55k
          hoặc 18tr.
        </p>
      </div>
      <TransactionManager
        initialTransactions={transactionItems}
        categories={categories}
      />
    </section>
  );
}
