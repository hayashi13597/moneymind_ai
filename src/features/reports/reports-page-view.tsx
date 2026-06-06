import {
  CoachHero,
  CoachMetricStrip,
  CoachPageShell,
  WorkbenchCard,
} from "@/components/coach-ui";
import type { DashboardBudgetSummary } from "@/features/budgets/service";
import type { MonthlyDashboard } from "@/features/dashboard/service";
import { formatVnd } from "@/lib/money";

type ReportsDashboard = Pick<
  MonthlyDashboard,
  | "month"
  | "totals"
  | "healthScore"
  | "categoryBreakdown"
  | "categoryAnalysis"
  | "spendingTrend"
>;

type ReportsPageViewProps = {
  dashboard: ReportsDashboard;
  budgets: Pick<DashboardBudgetSummary, "summary" | "items" | "rows">;
};

function formatShortDate(value: string) {
  return value.slice(8, 10);
}

export function ReportsPageView({ dashboard, budgets }: ReportsPageViewProps) {
  const topCategory = dashboard.categoryBreakdown[0] ?? null;
  const peakDay = [...dashboard.spendingTrend].sort(
    (a, b) => b.amount - a.amount,
  )[0];
  const changedCategory = dashboard.categoryAnalysis.find(
    (item) => item.changeKind === "increased" || item.changeKind === "new",
  );
  const recommendation = topCategory
    ? `${topCategory.name} chiếm ${topCategory.percentage}% chi tiêu tháng này. MoneyMind ưu tiên nhóm này vì đây là nơi thay đổi thói quen tạo tác động rõ nhất.`
    : "Chưa có chi tiêu để phân tích. Khi bạn thêm giao dịch, báo cáo sẽ chuyển thành các mẫu hành vi có thể hành động.";

  return (
    <CoachPageShell>
      <CoachHero
        eyebrow="Pattern Lab"
        title="Phân tích hành vi, không chỉ xem biểu đồ"
        description="Reports & Analytics gom các bằng chứng quan trọng trong tháng thành vài mẫu hành vi: nhóm chi lớn nhất, ngày chi cao nhất và độ lệch so với hạn mức."
        recommendation={recommendation}
        evidence={[
          {
            label: "Nhóm chi lớn nhất",
            value: topCategory?.name ?? "Chưa có",
            helper: topCategory ? formatVnd(topCategory.amount) : "Chưa có dữ liệu",
          },
          {
            label: "Ngày chi cao nhất",
            value: peakDay?.amount ? `Ngày ${formatShortDate(peakDay.date)}` : "Chưa có",
            helper: peakDay?.amount ? formatVnd(peakDay.amount) : "Chưa phát sinh",
          },
        ]}
      />

      <CoachMetricStrip
        metrics={[
          {
            label: "Còn lại",
            value: formatVnd(dashboard.totals.remaining),
            helper: dashboard.healthScore.level,
            tone: dashboard.totals.remaining >= 0 ? "positive" : "negative",
          },
          {
            label: "Chi tiêu",
            value: formatVnd(dashboard.totals.expense),
            helper: "Tổng đã ghi nhận",
            tone: "negative",
          },
          {
            label: "Hạn mức còn lại",
            value: formatVnd(Math.abs(budgets.summary.remaining)),
            helper:
              budgets.summary.remaining >= 0
                ? "Trong ngân sách"
                : "Đang vượt hạn mức",
            tone: budgets.summary.remaining >= 0 ? "positive" : "negative",
          },
          {
            label: "Mẫu cần đọc",
            value: changedCategory?.name ?? topCategory?.name ?? "Chưa có",
            helper: changedCategory?.changeKind === "new" ? "Nhóm mới" : "Tín hiệu nổi bật",
          },
        ]}
      />

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.05fr)_minmax(360px,0.95fr)]">
        <WorkbenchCard
          title="Mẫu chi tiêu theo danh mục"
          description="Các nhóm được sắp theo tác động thực tế trong tháng để bạn đọc nguyên nhân trước khi chỉnh ngân sách."
        >
          <div className="space-y-3">
            {dashboard.categoryBreakdown.slice(0, 6).map((item) => (
              <article
                key={item.categoryId}
                className="rounded-2xl border border-[#E5DED2] bg-[#FBF8EF] p-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="truncate text-sm font-semibold">
                      {item.name}
                    </h3>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {item.percentage}% tổng chi
                    </p>
                  </div>
                  <p className="shrink-0 text-sm font-semibold">
                    {formatVnd(item.amount)}
                  </p>
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#E6E0D5]">
                  <div
                    className="h-full rounded-full bg-[#2F6B4F]"
                    style={{ width: `${Math.max(6, item.percentage)}%` }}
                  />
                </div>
              </article>
            ))}
            {dashboard.categoryBreakdown.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-[#DCD7CC] p-5 text-sm text-muted-foreground">
                Chưa có giao dịch chi tiêu trong tháng này.
              </p>
            ) : null}
          </div>
        </WorkbenchCard>

        <WorkbenchCard
          title="Bằng chứng hành động"
          description="Các con số này giúp MoneyMind đề xuất bước tiếp theo thay vì chỉ hiển thị báo cáo tĩnh."
        >
          <div className="space-y-3">
            {budgets.items.slice(0, 4).map((item) => (
              <div
                key={item.categoryId}
                className="rounded-2xl border border-[#E5DED2] bg-[#FFFDF7] p-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="font-medium">{item.categoryName}</p>
                  <p className="text-sm text-muted-foreground">
                    {item.progressPercentage ?? 0}%
                  </p>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  Đã chi {formatVnd(item.spentAmount)}
                </p>
              </div>
            ))}
            {budgets.items.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-[#DCD7CC] p-5 text-sm text-muted-foreground">
                Chưa có hạn mức nào để đối chiếu với chi tiêu.
              </p>
            ) : null}
          </div>
        </WorkbenchCard>
      </div>
    </CoachPageShell>
  );
}
