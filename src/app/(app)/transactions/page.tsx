import { cookies } from "next/headers";

import { PageHeader } from "@/components/app-ui";
import { listCategories } from "@/features/categories/service";
import {
  getSelectedMonth,
  USER_TIME_ZONE_COOKIE,
} from "@/features/dashboard/month";
import { TransactionManager } from "@/features/transactions/transaction-manager";
import { listPaginatedTransactions } from "@/features/transactions/service";
import { getCurrentUser } from "@/lib/auth-session";

type TransactionsPageProps = {
  searchParams: Promise<{
    month?: string | string[];
    page?: string | string[];
    pageSize?: string | string[];
  }>;
};

const pageSizeOptions = [5, 10, 20] as const;
const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 5;

function firstSearchParam(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

function parsePositiveInteger(value: string | undefined, fallback: number) {
  if (!value) {
    return fallback;
  }

  const parsed = Number(value);

  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function parsePaginationParams(params: Awaited<TransactionsPageProps["searchParams"]>) {
  const page = parsePositiveInteger(firstSearchParam(params.page), DEFAULT_PAGE);
  const requestedPageSize = parsePositiveInteger(
    firstSearchParam(params.pageSize),
    DEFAULT_PAGE_SIZE,
  );
  const pageSize = pageSizeOptions.includes(
    requestedPageSize as (typeof pageSizeOptions)[number],
  )
    ? requestedPageSize
    : DEFAULT_PAGE_SIZE;

  return { page, pageSize };
}

export default async function TransactionsPage({
  searchParams,
}: TransactionsPageProps) {
  const user = await getCurrentUser();

  if (!user) {
    return null;
  }

  const params = await searchParams;
  const monthParam = firstSearchParam(params.month);
  const userTimeZone = (await cookies()).get(USER_TIME_ZONE_COOKIE)?.value;
  const month = getSelectedMonth(
    monthParam,
    undefined,
    userTimeZone,
  );
  const [transactionPage, categories] = await Promise.all([
    listPaginatedTransactions(user.id, {
      monthKey: month.key,
      ...parsePaginationParams(params),
    }),
    listCategories(user.id),
  ]);
  const transactionItems = transactionPage.transactions.map((transaction) => ({
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
        pagination={{
          total: transactionPage.total,
          page: transactionPage.page,
          pageSize: transactionPage.pageSize,
        }}
      />
    </section>
  );
}
