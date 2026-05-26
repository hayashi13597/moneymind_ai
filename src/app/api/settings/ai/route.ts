import { getAiErrorMessage, isAiDomainError } from "@/features/ai/errors";
import { aiProviderSettingUpdateSchema } from "@/features/ai/schemas";
import {
  getMaskedAiProviderSetting,
  upsertAiProviderSetting,
} from "@/features/ai/settings-service";
import {
  getRequiredApiUser,
  jsonBadRequest,
  jsonError,
  jsonUnauthorized,
} from "@/lib/api";

export async function GET() {
  const user = await getRequiredApiUser();

  if (!user) {
    return jsonUnauthorized();
  }

  return Response.json(await getMaskedAiProviderSetting(user.id));
}

export async function PATCH(request: Request) {
  const user = await getRequiredApiUser();

  if (!user) {
    return jsonUnauthorized();
  }

  const parsed = aiProviderSettingUpdateSchema.safeParse(await request.json());

  if (!parsed.success) {
    return jsonBadRequest();
  }

  try {
    await upsertAiProviderSetting(user.id, parsed.data);

    return Response.json(await getMaskedAiProviderSetting(user.id));
  } catch (error) {
    if (isAiDomainError(error)) {
      return jsonError(getAiErrorMessage(error.code), 400);
    }

    throw error;
  }
}
