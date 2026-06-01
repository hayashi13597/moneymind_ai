import { aiProviderSettingUpdateSchema } from "@/features/ai/schemas";
import {
  getRequiredApiUser,
  jsonBadRequest,
  jsonUnauthorized,
} from "@/lib/api";

export async function GET() {
  const user = await getRequiredApiUser();

  if (!user) {
    return jsonUnauthorized();
  }

  return Response.json({ setting: null });
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

  return Response.json({
    setting: {
      baseUrl: parsed.data.baseUrl,
      model: parsed.data.model,
      hasApiKey: Boolean(parsed.data.apiKey),
    },
  });
}
