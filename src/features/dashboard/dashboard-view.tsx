import Link from "next/link";

import { Button } from "@/components/ui/button";
import { formatVnd } from "@/lib/money";

import { CategoryBreakdownChart } from "./category-breakdown-chart";
import type { MonthComparison, MonthlyDashboard } from "./service";

type DashboardViewProps = {
  dashboard: MonthlyDashboard;
};

function comparisonText(label: string, comparison: MonthComparison) {
  if (comparison.kind === "no_previous_data") {
    return `${label}: chưa có dữ liệu tháng trước.`;
  }

  if (comparison.kind === "unchanged") {
    return `${label}: không đổi so với tháng trước.`;
  }

  const direction = comparison.kind === "increased" ? "tăng" : "giảm";
  return `${label}: ${direction} ${comparison.percentage}% (${formatVnd(
    comparison.delta,
  )}) so với tháng trước.`;
}

function kpiTone(type: "income" | "expense" | "remaining") {
  if (type === "income") {
    return "text-green-600";
  }

  if (type === "expense") {
    return "text-red-600";
  }

  return "text-foreground";
}

export function DashboardView({ dashboard }: DashboardViewProps) {
  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">Dashboard</p>
          <h1 className="text-2xl font-semibold tracking-normal">
            Tổng quan tháng
          </h1>
          <p className="text-sm text-muted-foreground">
            {dashboard.month.label}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button asChild variant="outline">
            <Link href={`/dashboard?month=${dashboard.month.previousKey}`}>
              Tháng trước
            </Link>
          </Button>
          <span className="rounded-md border bg-card px-3 py-2 text-sm font-medium">
            {dashboard.month.key}
          </span>
          <Button asChild variant="outline">
            <Link href={`/dashboard?month=${dashboard.month.nextKey}`}>
              Tháng sau
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border bg-card p-4">
          <p className="text-sm text-muted-foreground">Tổng thu nhập</p>
          <p className={`mt-2 text-2xl font-semibold ${kpiTone("income")}`}>
            {formatVnd(dashboard.totals.income)}
          </p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-sm text-muted-foreground">Tổng chi tiêu</p>
          <p className={`mt-2 text-2xl font-semibold ${kpiTone("expense")}`}>
            {formatVnd(dashboard.totals.expense)}
          </p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-sm text-muted-foreground">Còn lại</p>
          <p className={`mt-2 text-2xl font-semibold ${kpiTone("remaining")}`}>
            {formatVnd(dashboard.totals.remaining)}
          </p>
        </div>
      </div>

      {dashboard.isEmpty ? (
        <div className="rounded-lg border bg-card p-6">
          <h2 className="text-lg font-semibold">
            Chưa có giao dịch trong tháng này
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            Thêm giao dịch đầu tiên để MoneyMind AI có dữ liệu tổng hợp thu chi,
            phân bổ danh mục và so sánh với tháng trước.
          </p>
          <Button asChild className="mt-4">
            <Link href="/transactions">Thêm giao dịch</Link>
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
          <div className="rounded-lg border bg-card p-4">
            <div className="mb-4">
              <h2 className="text-lg font-semibold">Chi theo danh mục</h2>
              <p className="text-sm text-muted-foreground">
                Tỷ trọng chi tiêu trong {dashboard.month.label.toLowerCase()}.
              </p>
            </div>
            <div className="grid gap-4 md:grid-cols-[260px_1fr]">
              <CategoryBreakdownChart data={dashboard.categoryBreakdown} />
              <div className="space-y-3">
                {dashboard.categoryBreakdown.map((item) => (
                  <div key={item.categoryId} className="space-y-1">
                    <div className="flex items-center justify-between gap-3 text-sm">
                      <div className="flex min-w-0 items-center gap-2">
                        <span
                          className="h-2.5 w-2.5 shrink-0 rounded-full"
                          style={{ backgroundColor: item.color ?? "#64748b" }}
                        />
                        <span className="truncate font-medium">{item.name}</span>
                      </div>
                      <span className="shrink-0 text-muted-foreground">
                        {item.percentage}%
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-3 text-sm">
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-foreground"
                          style={{ width: `${item.percentage}%` }}
                        />
                      </div>
                      <span className="w-28 text-right font-medium">
                        {formatVnd(item.amount)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-lg border bg-card p-4">
              <h2 className="text-lg font-semibold">So với tháng trước</h2>
              <div className="mt-3 space-y-2 text-sm text-muted-foreground">
                <p>{comparisonText("Thu nhập", dashboard.comparison.income)}</p>
                <p>{comparisonText("Chi tiêu", dashboard.comparison.expense)}</p>
                <p>{comparisonText("Còn lại", dashboard.comparison.remaining)}</p>
              </div>
            </div>

            <div className="rounded-lg border bg-card p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <h2 className="text-lg font-semibold">Giao dịch gần đây</h2>
                <Link
                  href="/transactions"
                  className="text-sm font-medium text-muted-foreground hover:text-foreground"
                >
                  Xem tất cả
                </Link>
              </div>
              <div className="space-y-3">
                {dashboard.recentTransactions.map((transaction) => (
                  <div
                    key={transaction.id}
                    className="flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {transaction.note}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {transaction.categoryName} ·{" "}
                        {transaction.transactionDate.slice(0, 10)}
                      </p>
                    </div>
                    <span
                      className={
                        transaction.type === "income"
                          ? "shrink-0 text-sm font-medium text-green-600"
                          : "shrink-0 text-sm font-medium text-red-600"
                      }
                    >
                      {transaction.type === "income" ? "+" : "-"}
                      {formatVnd(transaction.amount)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
