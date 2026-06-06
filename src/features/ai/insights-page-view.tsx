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
    ? `${risingCategory.name} đang tăng so với tháng trước. Hãy tạo nhận xét AI để biến tín hiệu này thành một hành động cụ thể.`
    : dashboard.totals.expense > 0
      ? "Tháng này đã có đủ dữ liệu chi tiêu để MoneyMind viết nhận xét ngắn, tập trung vào hành động thay vì báo cáo dài."
      : "Chưa có nhiều dữ liệu trong tháng. Thêm vài giao dịch trước để nhận xét AI không bị chung chung.";

  return (
    <CoachPageShell>
      <CoachHero
        eyebrow="Coach Journal"
        title="Nhật ký cố vấn cho từng tháng"
        description="AI Insights là nơi MoneyMind biến dữ liệu tháng thành lời nhắc ngắn, có bằng chứng và có bước tiếp theo. Bạn tạo lại khi dữ liệu thay đổi hoặc khi muốn một góc nhìn mới."
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
            helper: `${dashboard.healthScore.savingsRate}% tỷ lệ tiết kiệm`,
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
            helper: "Bằng chứng đầu vào",
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
            helper: initialInsight ? "Có thể tạo lại" : "Cần cấu hình AI",
          },
        ]}
      />

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.16fr)_minmax(320px,0.84fr)]">
        <WorkbenchCard
          title="Nhận xét tháng này"
          description="Nội dung được tạo từ dữ liệu thật của tháng đang xem. MoneyMind không tự bịa giao dịch hoặc mục tiêu chưa có."
        >
          <MonthlyInsightPanel
            key={dashboard.month.key}
            month={dashboard.month.key}
            initialInsight={initialInsight}
          />
        </WorkbenchCard>

        <div className="space-y-4">
          <CoachActionCard
            title="Muốn nhận xét sắc hơn?"
            description="Cập nhật giao dịch và danh mục trước khi tạo lại để AI có thêm ngữ cảnh hành vi."
            action="Mở giao dịch"
            href={`/transactions?month=${dashboard.month.key}`}
            meta="Dữ liệu huấn luyện"
          />
          <CoachActionCard
            title="Kiểm tra giới hạn chi"
            description="Nếu nhận xét nhắc tới một nhóm rủi ro, chuyển sang hạn mức để biến gợi ý thành quyết định."
            action="Mở ngân sách"
            href={`/budgets?month=${dashboard.month.key}`}
            meta="Bước tiếp theo"
          />
        </div>
      </div>
    </CoachPageShell>
  );
}
