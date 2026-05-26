import { AiDomainError } from "@/features/ai/errors";
import type { AiProviderSettingUpdateInput } from "@/features/ai/schemas";
import { db } from "@/lib/db";

export type MaskedAiProviderSetting = {
  setting: null | {
    baseUrl: string;
    model: string;
    hasApiKey: boolean;
  };
};

export async function getAiProviderSetting(userId: string) {
  return db.aiProviderSetting.findUnique({
    where: { userId },
  });
}

export async function requireAiProviderSetting(userId: string) {
  const setting = await getAiProviderSetting(userId);

  if (!setting) {
    throw new AiDomainError("missing_provider_setting");
  }

  if (!setting.apiKey) {
    throw new AiDomainError("missing_api_key");
  }

  return setting;
}

export async function getMaskedAiProviderSetting(
  userId: string,
): Promise<MaskedAiProviderSetting> {
  const setting = await getAiProviderSetting(userId);

  if (!setting) {
    return { setting: null };
  }

  return {
    setting: {
      baseUrl: setting.baseUrl,
      model: setting.model,
      hasApiKey: Boolean(setting.apiKey),
    },
  };
}

export async function upsertAiProviderSetting(
  userId: string,
  input: AiProviderSettingUpdateInput,
) {
  const existing = await getAiProviderSetting(userId);
  const apiKey = input.apiKey ?? existing?.apiKey;

  if (!apiKey) {
    throw new AiDomainError("missing_api_key");
  }

  return db.aiProviderSetting.upsert({
    where: { userId },
    create: {
      userId,
      baseUrl: input.baseUrl,
      apiKey,
      model: input.model,
    },
    update: {
      baseUrl: input.baseUrl,
      apiKey,
      model: input.model,
    },
  });
}
