import { getAiErrorMessage, isAiDomainError } from "@/features/ai/errors";
import { aiChatRequestSchema } from "@/features/ai-chat/schemas";
import { generateAiChatResponse } from "@/features/ai-chat/service";
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

  const parsed = aiChatRequestSchema.safeParse(await request.json());

  if (!parsed.success) {
    return jsonBadRequest();
  }

  try {
    const response = await generateAiChatResponse(user.id, parsed.data);

    return Response.json(response);
  } catch (error) {
    if (isAiDomainError(error)) {
      return jsonError(getAiErrorMessage(error.code), 400);
    }

    throw error;
  }
}
