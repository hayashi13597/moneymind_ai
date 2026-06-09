import {
  CoachHero,
  CoachMetricStrip,
  CoachPageShell,
} from "@/components/coach-ui";
import { AiSettingsForm } from "@/features/ai/ai-settings-form";

export default function AiSettingsPage() {
  return (
    <CoachPageShell>
      <CoachHero
        eyebrow="Cấu hình AI"
        title="Chọn nhà cung cấp AI cho MoneyMind"
        description="Trang này quyết định MoneyMind được dùng model nào, gửi dữ liệu qua đâu và đã đủ sẵn sàng để phân tích tài chính cá nhân hay chưa."
        recommendation="Hãy ưu tiên một provider ổn định, phản hồi tốt với tiếng Việt và giữ API key trong trình duyệt bạn tin cậy."
        evidence={[
          {
            label: "Phạm vi",
            value: "Local-first",
            helper: "Provider lưu trên trình duyệt",
          },
          {
            label: "Tác động",
            value: "AI toàn app",
            helper: "Chat, insight và phân tích giao dịch",
          },
        ]}
      />
      <CoachMetricStrip
        metrics={[
          {
            label: "Nơi lưu API key",
            value: "Trình duyệt",
            helper: "Không ghi vào cơ sở dữ liệu",
            tone: "positive",
          },
          {
            label: "Phạm vi dùng",
            value: "Toàn app",
            helper: "Chat, insight và nháp giao dịch",
          },
          {
            label: "Vai trò",
            value: "Bộ não cố vấn",
            helper: "Quyết định model MoneyMind gọi",
          },
          {
            label: "Kiểm soát",
            value: "Bạn chọn",
            helper: "Có thể đổi provider bất cứ lúc nào",
            tone: "positive",
          },
        ]}
      />
      <AiSettingsForm />
    </CoachPageShell>
  );
}
