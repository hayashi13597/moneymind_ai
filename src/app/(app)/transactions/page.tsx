import { cookies } from "next/headers";

import { PageHeader } from "@/components/app-ui";
import { listCategories } from "@/features/categories/service";
import {
  getSelectedMonth,
  USER_TIME_ZONE_COOKIE,
} from "@/features/dashboard/month";
import { TransactionManager } from "@/features/transactions/transaction-manager";
import { listTransactions } from "@/features/transactions/service";
import { getCurrentUser } from "@/lib/auth-session";

type TransactionsPageProps = {
  searchParams: Promise<{ month?: string | string[] }>;
};

export default async function TransactionsPage({
  searchParams,
}: TransactionsPageProps) {
  const user = await getCurrentUser();

  if (!user) {
    return null;
  }

  const monthParam = (await searchParams).month;
  const userTimeZone = (await cookies()).get(USER_TIME_ZONE_COOKIE)?.value;
  const month = getSelectedMonth(
    Array.isArray(monthParam) ? monthParam[0] : monthParam,
    undefined,
    userTimeZone,
  );
  const [transactions, categories] = await Promise.all([
    listTransactions(user.id, month.key),
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
        selectedMonth={month}
      />
    </section>
  );
}
