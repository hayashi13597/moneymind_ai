import { PageHeader } from "@/components/app-ui";
import { AiSettingsForm } from "@/features/ai/ai-settings-form";
import { getMaskedAiProviderSetting } from "@/features/ai/settings-service";
import { getCurrentSession } from "@/lib/auth-session";

export default async function AiSettingsPage() {
  const session = await getCurrentSession();

  if (!session?.user) {
    return null;
  }

  const { setting } = await getMaskedAiProviderSetting(session.user.id);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Cấu hình AI"
        title="Huấn luyện viên MoneyMind"
        description="Kết nối provider AI để phân loại giao dịch, tạo insight tháng và trả lời các câu hỏi tài chính cá nhân trong ứng dụng."
      />
      <AiSettingsForm initialSetting={setting} />
    </div>
  );
}
