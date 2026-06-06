import { cookies } from "next/headers";

import { PageHeader } from "@/components/app-ui";
import { listCategories } from "@/features/categories/service";
import {
  getSelectedMonth,
  USER_TIME_ZONE_COOKIE,
} from "@/features/dashboard/month";
import { TransactionManager } from "@/features/transactions/transaction-manager";
import {
  getTransactionSummary,
  listPaginatedTransactions,
} from "@/features/transactions/service";
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
  const [transactionPage, transactionSummary, categories] = await Promise.all([
    listPaginatedTransactions(user.id, {
      monthKey: month.key,
      ...parsePaginationParams(params),
    }),
    getTransactionSummary(user.id, month.key),
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
        title="Giao dịch trong tháng"
        description="Ghi lại thu chi hằng ngày, xem theo từng tháng và dùng AI để tạo bản nháp trước khi lưu."
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
        summary={transactionSummary}
      />
    </section>
  );
}
