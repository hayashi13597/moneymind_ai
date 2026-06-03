import { PageHeader } from "@/components/app-ui";
import { AiSettingsForm } from "@/features/ai/ai-settings-form";

export default function AiSettingsPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Cấu hình AI"
        title="Kết nối MoneyMind với AI"
        description="Thêm nhà cung cấp AI để phân loại giao dịch, tạo nhận xét theo tháng và trả lời câu hỏi tài chính trong ứng dụng."
      />
      <AiSettingsForm />
    </div>
  );
}
