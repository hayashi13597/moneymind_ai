import { getAiErrorMessage, isAiDomainError } from "@/features/ai/errors";
import { assertSafeAiProviderSetting } from "@/features/ai/provider-security";
import { agentRequestSchema } from "@/features/agent/schemas";
import { generateAgentResponse } from "@/features/agent/service";
import {
  getRequiredApiUser,
  jsonBadRequest,
  jsonError,
  jsonUnauthorized,
} from "@/lib/api";

export const maxDuration = 60;

export async function POST(request: Request) {
  const user = await getRequiredApiUser();

  if (!user) {
    return jsonUnauthorized();
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return jsonBadRequest();
  }

  const parsed = agentRequestSchema.safeParse(body);

  if (!parsed.success) {
    return jsonBadRequest();
  }

  try {
    const providerSetting = assertSafeAiProviderSetting(
      parsed.data.providerSetting,
    );
    const response = await generateAgentResponse(
      user.id,
      parsed.data,
      providerSetting,
    );

    return Response.json(response);
  } catch (error) {
    if (isAiDomainError(error)) {
      return jsonError(getAiErrorMessage(error.code), 400);
    }

    throw error;
  }
}
