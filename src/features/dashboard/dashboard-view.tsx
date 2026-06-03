import {
  ArrowRight,
  BadgeCheck,
  Bot,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { MonthlyInsightDto } from "@/features/ai/monthly-insight";
import { MonthlyInsightPanel } from "@/features/ai/monthly-insight-panel";
import type { DashboardBudgetSummary } from "@/features/budgets/service";
import { formatVnd } from "@/lib/money";

import { AskMoneyMindPanel } from "./ask-moneymind-panel";
import type {
  CategoryAnalysisItem,
  MonthComparison,
  MonthlyDashboard,
} from "./service";

type DashboardViewProps = {
  dashboard: MonthlyDashboard;
  initialInsight: MonthlyInsightDto | null;
  userName: string;
  budgetSummary: DashboardBudgetSummary;
};

function comparisonSummary(label: string, comparison: MonthComparison) {
  if (comparison.kind === "no_previous_data") {
    return `${label}: chưa có dữ liệu tháng trước`;
  }

  if (comparison.kind === "unchanged") {
    return `${label}: không đổi so với tháng trước`;
  }

  return comparison.kind === "increased"
    ? `${label} tăng ${comparison.percentage}% so với tháng trước`
    : `${label} giảm ${comparison.percentage}% so với tháng trước`;
}

function savingsProjection(dashboard: MonthlyDashboard) {
  return Math.max(0, dashboard.totals.remaining);
}

function monthlyBalanceSummary(dashboard: MonthlyDashboard) {
  const remaining = dashboard.totals.remaining;

  if (remaining < 0) {
    return {
      label: "Tháng này bạn đang lỗ",
      value: formatVnd(Math.abs(remaining)),
    };
  }

  return {
    label: "Tháng này bạn tiết kiệm được",
    value: formatVnd(remaining),
  };
}

function biggestIssue(categoryAnalysis: CategoryAnalysisItem[]) {
  const increased = categoryAnalysis
    .filter((item) => item.changeKind === "increased")
    .sort((a, b) => (b.changePercentage ?? 0) - (a.changePercentage ?? 0))[0];

  if (increased) {
    return `${increased.name} tăng ${increased.changePercentage}% so với tháng trước.`;
  }

  const topCategory = categoryAnalysis[0];

  if (topCategory) {
    return `${topCategory.name} đang chiếm ${topCategory.percentage}% chi tiêu.`;
  }

  return "Chưa có dấu hiệu bất thường trong tháng này.";
}

function changeLabel(item: CategoryAnalysisItem) {
  if (item.changeKind === "new") {
    return "Mới trong tháng này";
  }

  if (item.changeKind === "unchanged") {
    return "Không đổi";
  }

  const direction = item.changeKind === "increased" ? "+" : "-";

  return `${direction}${item.changePercentage}% so với tháng trước`;
}

function changeTone(item: CategoryAnalysisItem) {
  if (item.changeKind === "increased") {
    return "text-[#A2482D]";
  }

  if (item.changeKind === "decreased") {
    return "text-[#2F6B4F]";
  }

  return "text-muted-foreground";
}

function metricTone(type: "income" | "expense" | "balance" | "savings") {
  if (type === "expense") {
    return "text-[#A2482D]";
  }

  if (type === "income" || type === "savings") {
    return "text-[#2F6B4F]";
  }

  return "text-foreground";
}

function formatTrendDate(date: string) {
  const [yearPart, monthPart, dayPart] = date.split("-");
  const year = Number(yearPart);
  const month = Number(monthPart);
  const day = Number(dayPart);
  const localDate =
    Number.isInteger(year) &&
    Number.isInteger(month) &&
    Number.isInteger(day) &&
    month >= 1 &&
    month <= 12 &&
    day >= 1 &&
    day <= 31
      ? new Date(year, month - 1, day)
      : null;
  const trendDate =
    localDate &&
    localDate.getFullYear() === year &&
    localDate.getMonth() === month - 1 &&
    localDate.getDate() === day
      ? localDate
      : new Date(date);

  if (Number.isNaN(trendDate.getTime())) {
    return date;
  }

  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
  }).format(trendDate);
}

function shouldShowTrendDayLabel(date: string, index: number, total: number) {
  const day = Number(date.slice(8, 10));

  return index === 0 || index === total - 1 || day % 5 === 0;
}

function firstInsightLine(insight: MonthlyInsightDto | null) {
  return (
    insight?.content
      .split("\n")
      .map((line) => line.replace(/^[-*#\s]+/, "").trim())
      .find(Boolean) ?? "Tạo nhận xét AI để có gợi ý sát với tháng này hơn."
  );
}

const budgetStatusLabels = {
  not_set: "Chưa đặt",
  healthy: "Ổn",
  near_limit: "Gần vượt",
  over_limit: "Đã vượt",
} as const;

export function DashboardView({
  dashboard,
  initialInsight,
  userName,
  budgetSummary,
}: DashboardViewProps) {
  const topIssue = biggestIssue(dashboard.categoryAnalysis);
  const maxTrendAmount = Math.max(
    ...dashboard.spendingTrend.map((item) => item.amount),
    1,
  );
  const topCategories = dashboard.categoryAnalysis.slice(0, 5);
  const dailyAverage =
    dashboard.spendingTrend.length > 0
      ? Math.round(dashboard.totals.expense / dashboard.spendingTrend.length)
      : 0;
  const balanceSummary = monthlyBalanceSummary(dashboard);

  return (
    <section className="space-y-8">
      <header className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">
            {dashboard.month.label}
          </p>
          <h1 className="text-3xl font-semibold tracking-normal text-foreground md:text-4xl">
            Xin chào, {userName}
          </h1>
          <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
            {balanceSummary.label}{" "}
            <span className="font-medium text-foreground">
              {balanceSummary.value}
            </span>
            {". "}
            {comparisonSummary("Chi tiêu", dashboard.comparison.expense)}.
          </p>
        </div>
        <nav
          aria-label="Chọn tháng dashboard"
          className="flex items-center gap-2"
        >
          <Button asChild variant="outline" className="border-[#DDD8CE]">
            <Link href={`/dashboard?month=${dashboard.month.previousKey}`}>
              <ChevronLeft className="size-4" />
              <span className="sr-only md:not-sr-only">Tháng trước</span>
            </Link>
          </Button>
          <Badge
            variant="outline"
            className="h-auto rounded-full border-[#DDD8CE] bg-[#F3F0E9] px-4 py-2 text-sm font-medium text-foreground"
          >
            {dashboard.month.key}
          </Badge>
          <Button asChild variant="outline" className="border-[#DDD8CE]">
            <Link href={`/dashboard?month=${dashboard.month.nextKey}`}>
              <span className="sr-only md:not-sr-only">Tháng sau</span>
              <ChevronRight className="size-4" />
            </Link>
          </Button>
        </nav>
      </header>

      <Card className="gap-0 overflow-hidden rounded-2xl border-[#DCD7CC] bg-[#FDFCF8] py-0 shadow-[0_18px_60px_rgba(47,42,31,0.08)]">
        <div className="grid gap-0 lg:grid-cols-[1.35fr_0.65fr]">
          <div className="space-y-7 p-6 md:p-8">
            <div className="flex flex-wrap items-center gap-3">
              <Badge
                variant="outline"
                className="h-auto rounded-full border-[#D8E1D7] bg-[#ECF3ED] px-3 py-1 text-xs font-medium text-[#2F6B4F]"
              >
                <Bot className="size-3.5" />
                Cố vấn MoneyMind
              </Badge>
              <span className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                Tóm tắt cá nhân
              </span>
            </div>

            <div className="space-y-4">
              <h2 className="max-w-3xl text-2xl font-semibold leading-tight text-foreground md:text-4xl">
                Tình hình tài chính tháng này: {dashboard.healthScore.score}/100
              </h2>
              <p className="max-w-3xl text-base leading-7 text-muted-foreground md:text-lg">
                {dashboard.healthScore.explanation}
              </p>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <div className="border-l border-[#DCD7CC] pl-4">
                <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
                  Chi tiêu
                </p>
                <p className="mt-2 text-sm font-medium text-foreground">
                  {comparisonSummary("Chi tiêu", dashboard.comparison.expense)}
                </p>
              </div>
              <div className="border-l border-[#DCD7CC] pl-4">
                <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
                  Tiến độ tiết kiệm
                </p>
                <p className="mt-2 text-sm font-medium text-foreground">
                  Dự kiến còn lại {formatVnd(savingsProjection(dashboard))}
                </p>
              </div>
              <div className="border-l border-[#DCD7CC] pl-4">
                <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
                  Điểm cần chú ý
                </p>
                <p className="mt-2 text-sm font-medium text-foreground">
                  {topIssue}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Button asChild className="bg-[#2F6B4F] hover:bg-[#285B43]">
                <a href="#monthly-ai-analysis">
                  Xem nhận xét
                  <ArrowRight className="size-4" />
                </a>
              </Button>
              <p className="text-sm text-muted-foreground">
                {firstInsightLine(initialInsight)}
              </p>
            </div>
          </div>

          <aside className="border-t border-[#DCD7CC] bg-[#F6F3EC] p-6 lg:border-l lg:border-t-0 md:p-8">
            <div className="flex h-full flex-col justify-between gap-8">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Điểm tổng quan
                </p>
                <div className="mt-5 flex items-end gap-3">
                  <span className="text-6xl font-semibold leading-none text-[#2F6B4F]">
                    {dashboard.healthScore.score}
                  </span>
                  <span className="pb-2 text-sm font-medium text-muted-foreground">
                    /100
                  </span>
                </div>
                <p className="mt-3 text-base font-medium">
                  {dashboard.healthScore.level}
                </p>
              </div>
              <div className="space-y-3">
                <div className="h-2 overflow-hidden rounded-full bg-[#E2DDD2]">
                  <div
                    className="h-full rounded-full bg-[#2F6B4F]"
                    style={{ width: `${dashboard.healthScore.score}%` }}
                  />
                </div>
                <p className="text-sm leading-6 text-muted-foreground">
                  Điểm này dựa trên tỷ lệ tiết kiệm, nhịp chi tiêu và thay đổi
                  so với tháng trước.
                </p>
              </div>
            </div>
          </aside>
        </div>
      </Card>

      <div className="grid gap-3 md:grid-cols-4">
        {[
          {
            label: "Số dư",
            value: formatVnd(dashboard.totals.remaining),
            helper: comparisonSummary("Số dư", dashboard.comparison.remaining),
            tone: "balance" as const,
          },
          {
            label: "Thu nhập",
            value: formatVnd(dashboard.totals.income),
            helper: comparisonSummary("Thu nhập", dashboard.comparison.income),
            tone: "income" as const,
          },
          {
            label: "Chi tiêu",
            value: formatVnd(dashboard.totals.expense),
            helper: comparisonSummary("Chi tiêu", dashboard.comparison.expense),
            tone: "expense" as const,
          },
          {
            label: "Tỷ lệ tiết kiệm",
            value: `${dashboard.healthScore.savingsRate}%`,
            helper: "Phần còn lại sau khi trừ chi tiêu",
            tone: "savings" as const,
          },
        ].map((metric) => (
          <Card
            key={metric.label}
            className="gap-0 rounded-2xl border-[#E1DDD4] bg-card py-0 shadow-none"
          >
            <CardContent className="p-5">
              <p className="text-sm text-muted-foreground">{metric.label}</p>
              <p
                className={`mt-3 text-2xl font-semibold tracking-normal ${metricTone(
                  metric.tone,
                )}`}
              >
                {metric.value}
              </p>
              <p className="mt-2 text-xs leading-5 text-muted-foreground">
                {metric.helper}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="gap-0 rounded-2xl border-[#DCD7CC] bg-[#FDFCF8] py-0 shadow-none">
        <CardContent className="p-5">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-foreground">
                Ngân sách tháng này
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Đã chi {formatVnd(budgetSummary.summary.totalSpent)} trên{" "}
                {formatVnd(budgetSummary.summary.totalBudget)}
              </p>
            </div>
            <Button asChild variant="outline" className="border-[#DDD8CE]">
              <Link href={`/budgets?month=${dashboard.month.key}`}>
                Xem ngân sách
              </Link>
            </Button>
          </div>
          <div className="mt-4 space-y-3">
            {budgetSummary.items.length > 0 ? (
              budgetSummary.items.map((item) => (
                <div
                  key={item.categoryId}
                  className="flex items-center justify-between gap-4 border-t border-[#E8E1D6] pt-3 text-sm"
                >
                  <div>
                    <p className="font-medium text-foreground">
                      {item.categoryName}
                    </p>
                    <p className="text-muted-foreground">
                      {formatVnd(item.spentAmount)} /{" "}
                      {formatVnd(item.effectiveAmount ?? 0)}
                    </p>
                  </div>
                  <Badge
                    variant="outline"
                    className="h-auto rounded-full border-[#DDD8CE] bg-card px-2 py-0.5 font-medium text-foreground"
                  >
                    {budgetStatusLabels[item.status]}
                  </Badge>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">
                Chưa có ngân sách cho tháng này.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {dashboard.isEmpty ? (
        <Card className="gap-0 rounded-2xl border-[#E1DDD4] bg-card py-0 shadow-none">
          <CardContent className="p-6">
            <h2 className="text-lg font-semibold">
              Chưa có giao dịch trong tháng này
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
              Thêm giao dịch đầu tiên để MoneyMind có dữ liệu tổng hợp, nhận
              diện xu hướng và đưa ra nhận xét sát hơn.
            </p>
            <Button asChild className="mt-5 bg-[#2F6B4F] hover:bg-[#285B43]">
              <Link href="/transactions">Thêm giao dịch</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
          <Card className="gap-0 rounded-2xl border-[#E1DDD4] bg-card py-0 shadow-none">
            <CardContent className="p-5 md:p-6">
              <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
                <div>
                  <h2 className="text-lg font-semibold">Xu hướng chi tiêu</h2>
                  <p className="text-sm text-muted-foreground">
                    Nhịp chi tiêu theo ngày để bạn thấy ngày nào phát sinh mạnh.
                  </p>
                </div>
                <p className="text-sm text-muted-foreground">
                  Trung bình {formatVnd(dailyAverage)} / ngày trong tháng
                </p>
              </div>
              {dashboard.spendingTrend.length > 0 ? (
                <div className="mt-6 overflow-x-auto pb-1">
                  <div className="flex h-56 min-w-[760px] items-end gap-1.5 border-b border-[#E1DDD4] pb-3 md:min-w-0">
                    {dashboard.spendingTrend.map((point, index) => (
                      <div
                        key={point.date}
                        className="flex min-w-5 flex-1 flex-col items-center gap-2"
                      >
                        <div
                          className={
                            point.amount > 0
                              ? "w-full rounded-t-md bg-[#2F6B4F]"
                              : "w-full rounded-t-sm bg-[#DCD7CC]"
                          }
                          style={{
                            height:
                              point.amount > 0
                                ? `${Math.max(
                                    10,
                                    (point.amount / maxTrendAmount) * 180,
                                  )}px`
                                : "4px",
                          }}
                          title={`${formatTrendDate(point.date)}: ${formatVnd(
                            point.amount,
                          )}`}
                        />
                        <span className="h-4 text-[11px] text-muted-foreground">
                          {shouldShowTrendDayLabel(
                            point.date,
                            index,
                            dashboard.spendingTrend.length,
                          )
                            ? point.date.slice(8, 10)
                            : ""}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="mt-6 flex h-56 items-center justify-center rounded-xl border border-dashed border-[#DCD7CC] text-sm text-muted-foreground">
                  Chưa có chi tiêu để hiển thị xu hướng.
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="gap-0 rounded-2xl border-[#E1DDD4] bg-card py-0 shadow-none">
            <CardContent className="p-5 md:p-6">
              <div className="mb-5">
                <h2 className="text-lg font-semibold">Phân tích danh mục</h2>
                <p className="text-sm text-muted-foreground">
                  Danh mục lớn nhất và tín hiệu bất thường.
                </p>
              </div>
              <div className="space-y-4">
                {topCategories.length > 0 ? (
                  topCategories.map((item) => (
                    <article key={item.categoryId} className="space-y-2">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-2">
                          <span
                            className="size-2.5 shrink-0 rounded-full"
                            style={{ backgroundColor: item.color ?? "#2F6B4F" }}
                          />
                          <span className="truncate text-sm font-medium">
                            {item.name}
                          </span>
                        </div>
                        <span className="text-sm font-medium">
                          {formatVnd(item.amount)}
                        </span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-[#111111]"
                          style={{ width: `${item.percentage}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between gap-3 text-xs">
                        <span className="text-muted-foreground">
                          {item.percentage}% tổng chi tiêu
                        </span>
                        <Badge
                          variant="outline"
                          className={`h-auto rounded-full px-2 py-0.5 ${changeTone(
                            item,
                          )}`}
                        >
                          {changeLabel(item)}
                        </Badge>
                      </div>
                    </article>
                  ))
                ) : (
                  <p className="rounded-xl border border-dashed border-[#DCD7CC] p-4 text-sm text-muted-foreground">
                    Chưa có danh mục chi tiêu để phân tích.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
        <Card className="gap-0 rounded-2xl border-[#E1DDD4] bg-card py-0 shadow-none">
          <CardContent className="p-5 md:p-6">
            <div className="mb-5 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">Giao dịch gần đây</h2>
                <p className="text-sm text-muted-foreground">
                  Hiển thị danh mục đã gắn để bạn kiểm tra nhanh.
                </p>
              </div>
              <Link
                href="/transactions"
                className="text-sm font-medium text-[#2F6B4F] hover:underline"
              >
                Xem tất cả
              </Link>
            </div>
            <div className="divide-y divide-[#E8E4DC]">
              {dashboard.recentTransactions.map((transaction) => (
                <article
                  key={transaction.id}
                  className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {transaction.note}
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <span>{transaction.transactionDate.slice(0, 10)}</span>
                      <Badge
                        variant="outline"
                        className="h-auto rounded-full border-[#D8E1D7] bg-[#ECF3ED] px-2 py-0.5 text-[#2F6B4F]"
                      >
                        {transaction.categoryName}
                      </Badge>
                      <span className="inline-flex items-center gap-1">
                        <BadgeCheck className="size-3" />
                        AI phân loại
                      </span>
                      <Link
                        href="/transactions"
                        className="font-medium text-foreground hover:underline"
                      >
                        Sửa
                      </Link>
                    </div>
                  </div>
                  <span
                    className={
                      transaction.type === "income"
                        ? "shrink-0 text-sm font-semibold text-[#2F6B4F]"
                        : "shrink-0 text-sm font-semibold text-[#A2482D]"
                    }
                  >
                    {transaction.type === "income" ? "+" : "-"}
                    {formatVnd(transaction.amount)}
                  </span>
                </article>
              ))}
            </div>
          </CardContent>
        </Card>

        <AskMoneyMindPanel
          key={dashboard.month.key}
          month={dashboard.month.key}
        />
      </div>

      <section id="monthly-ai-analysis">
        <MonthlyInsightPanel
          key={dashboard.month.key}
          month={dashboard.month.key}
          initialInsight={initialInsight}
        />
      </section>
    </section>
  );
}
