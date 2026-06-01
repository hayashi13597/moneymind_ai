import { getAiErrorMessage, isAiDomainError } from "@/features/ai/errors";
import { generateMonthlyInsight } from "@/features/ai/monthly-insight";
import { monthlyInsightRequestSchema } from "@/features/ai/schemas";
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

  const parsed = monthlyInsightRequestSchema.safeParse(await request.json());

  if (!parsed.success) {
    return jsonBadRequest();
  }

  try {
    const insight = await generateMonthlyInsight(
      user.id,
      parsed.data.month,
      parsed.data.regenerate,
      parsed.data.providerSetting,
    );

    return Response.json({ insight });
  } catch (error) {
    if (isAiDomainError(error)) {
      return jsonError(getAiErrorMessage(error.code), 400);
    }

    throw error;
  }
}
