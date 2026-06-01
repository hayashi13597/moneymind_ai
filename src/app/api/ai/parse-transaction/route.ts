import { getAiErrorMessage, isAiDomainError } from "@/features/ai/errors";
import { parseTransactionRequestSchema } from "@/features/ai/schemas";
import { parseTransactionWithAi } from "@/features/ai/transaction-parser";
import {
  getRequiredApiUser,
  jsonBadRequest,
  jsonError,
  jsonUnauthorized,
} from "@/lib/api";

export async function POST(request: Request) {
  const user = await getRequiredApiUser();

  if (!user) {
    return jsonUnauthorized();
  }

  const parsed = parseTransactionRequestSchema.safeParse(await request.json());

  if (!parsed.success) {
    return jsonBadRequest();
  }

  try {
    const draft = await parseTransactionWithAi(
      user.id,
      parsed.data.input,
      parsed.data.providerSetting,
    );

    return Response.json({ draft });
  } catch (error) {
    if (isAiDomainError(error)) {
      return jsonError(getAiErrorMessage(error.code), 400);
    }

    throw error;
  }
}
