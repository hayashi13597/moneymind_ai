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
    <div className="space-y-6">
      <div>
        <p className="text-sm text-muted-foreground">Cấu hình</p>
        <h1 className="text-2xl font-semibold tracking-tight">AI provider</h1>
      </div>
      <AiSettingsForm initialSetting={setting} />
    </div>
  );
}
