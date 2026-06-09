import {
  CoachActionCard,
  CoachHero,
  CoachMetricStrip,
  CoachPageShell,
  WorkbenchCard,
} from "@/components/coach-ui";
import { MonthlyInsightPanel } from "@/features/ai/monthly-insight-panel";
import type { MonthlyInsightDto } from "@/features/ai/monthly-insight";
import type { MonthlyDashboard } from "@/features/dashboard/service";
import { formatVnd } from "@/lib/money";

type InsightsDashboard = Pick<
  MonthlyDashboard,
  "month" | "totals" | "healthScore" | "categoryAnalysis"
>;

type InsightsPageViewProps = {
  dashboard: InsightsDashboard;
  initialInsight: MonthlyInsightDto | null;
};

export function InsightsPageView({
  dashboard,
  initialInsight,
}: InsightsPageViewProps) {
  const risingCategory = dashboard.categoryAnalysis.find(
    (item) => item.changeKind === "increased",
  );
  const recommendation = risingCategory
    ? `${risingCategory.name} đang tăng so với tháng trước. Tạo nhận xét AI để xem nguyên nhân và chọn một việc cần làm trong tháng này.`
    : dashboard.totals.expense > 0
      ? "Tháng này đã có đủ dữ liệu để MoneyMind viết nhận xét ngắn, ưu tiên việc cần chỉnh thay vì kể lại số liệu."
      : "Chưa có nhiều dữ liệu trong tháng. Thêm vài giao dịch trước để nhận xét AI bớt chung chung.";

  return (
    <CoachPageShell>
      <CoachHero
        eyebrow="Nhận xét AI"
        title="Ghi chú tài chính cho từng tháng"
        description="MoneyMind đọc dữ liệu tháng hiện tại và viết một nhận xét ngắn: điều gì đang lệch, vì sao đáng chú ý và nên làm gì tiếp theo."
        recommendation={recommendation}
        evidence={[
          {
            label: "Tháng đang đọc",
            value: dashboard.month.label,
            helper: dashboard.healthScore.level,
          },
          {
            label: "Còn lại",
            value: formatVnd(dashboard.totals.remaining),
            helper: `${dashboard.healthScore.savingsRate}% phần giữ lại`,
          },
        ]}
      />

      <CoachMetricStrip
        metrics={[
          {
            label: "Điểm sức khỏe",
            value: `${dashboard.healthScore.score}/100`,
            helper: dashboard.healthScore.level,
            tone: dashboard.healthScore.score >= 60 ? "positive" : "negative",
          },
          {
            label: "Thu nhập",
            value: formatVnd(dashboard.totals.income),
            helper: "Dữ liệu trong tháng",
            tone: "positive",
          },
          {
            label: "Chi tiêu",
            value: formatVnd(dashboard.totals.expense),
            helper: risingCategory
              ? `Tín hiệu tăng: ${risingCategory.name}`
              : "Chưa có nhóm tăng nổi bật",
            tone: "negative",
          },
          {
            label: "Trạng thái nhận xét",
            value: initialInsight ? "Đã có" : "Chưa tạo",
            helper: initialInsight ? "Có thể tạo lại" : "Tạo khi cần đọc nhanh",
          },
        ]}
      />

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.16fr)_minmax(320px,0.84fr)]">
        <WorkbenchCard
          title="Nhận xét tháng này"
          description="Nội dung được tạo từ giao dịch và danh mục thật của tháng đang xem. MoneyMind không tự thêm giao dịch hoặc mục tiêu chưa có."
        >
          <MonthlyInsightPanel
            key={dashboard.month.key}
            month={dashboard.month.key}
            initialInsight={initialInsight}
          />
        </WorkbenchCard>

        <div className="space-y-4">
          <CoachActionCard
            title="Cần thêm dữ liệu"
            description="Cập nhật giao dịch và danh mục trước khi tạo lại để nhận xét phản ánh đúng thói quen chi tiêu."
            action="Mở giao dịch"
            href={`/transactions?month=${dashboard.month.key}`}
            meta="Dữ liệu đầu vào"
          />
          <CoachActionCard
            title="Kiểm tra giới hạn chi"
            description="Nếu nhận xét nhắc tới một nhóm rủi ro, mở ngân sách để đặt giới hạn rõ hơn cho tháng này."
            action="Mở ngân sách"
            href={`/budgets?month=${dashboard.month.key}`}
            meta="Bước tiếp theo"
          />
        </div>
      </div>
    </CoachPageShell>
  );
}
