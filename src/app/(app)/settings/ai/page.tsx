import { PageHeader } from "@/components/app-ui";
import { AiSettingsForm } from "@/features/ai/ai-settings-form";

export default function AiSettingsPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Cấu hình AI"
        title="Huấn luyện viên MoneyMind"
        description="Kết nối provider AI để phân loại giao dịch, tạo insight tháng và trả lời các câu hỏi tài chính cá nhân trong ứng dụng."
      />
      <AiSettingsForm />
    </div>
  );
}
