import { CoachHero, CoachPageShell } from "@/components/coach-ui";
import { AiSettingsForm } from "@/features/ai/ai-settings-form";

export default function AiSettingsPage() {
  return (
    <CoachPageShell>
      <CoachHero
        eyebrow="AI Coach"
        title="Điều khiển bộ não cố vấn"
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
      <AiSettingsForm />
    </CoachPageShell>
  );
}
