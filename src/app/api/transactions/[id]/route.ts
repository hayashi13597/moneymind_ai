import { transactionUpdateSchema } from "@/features/transactions/schemas";
import {
  deleteTransaction,
  getTransaction,
  updateTransaction,
} from "@/features/transactions/service";
import {
  getRequiredApiUser,
  jsonBadRequest,
  jsonError,
  jsonNotFound,
  jsonUnauthorized,
} from "@/lib/api";

type TransactionRouteContext = {
  params: Promise<{ id: string }>;
};

function transactionDomainError(reason: string) {
  if (reason === "not_found") {
    return jsonNotFound("Không tìm thấy giao dịch.");
  }

  if (reason === "missing_category") {
    return jsonError("Không tìm thấy danh mục.", 404);
  }

  if (reason === "type_mismatch") {
    return jsonError("Danh mục không khớp loại giao dịch.", 400);
  }

  return jsonBadRequest();
}

export async function GET(_request: Request, ctx: TransactionRouteContext) {
  const user = await getRequiredApiUser();

  if (!user) {
    return jsonUnauthorized();
  }

  const { id } = await ctx.params;
  const transaction = await getTransaction(user.id, id);

  if (!transaction) {
    return jsonNotFound("Không tìm thấy giao dịch.");
  }

  return Response.json({ transaction });
}

export async function PATCH(request: Request, ctx: TransactionRouteContext) {
  const user = await getRequiredApiUser();

  if (!user) {
    return jsonUnauthorized();
  }

  const { id } = await ctx.params;
  const parsed = transactionUpdateSchema.safeParse(await request.json());

  if (!parsed.success) {
    return jsonBadRequest();
  }

  const result = await updateTransaction(user.id, id, parsed.data);

  if (!result.ok) {
    return transactionDomainError(result.reason);
  }

  return Response.json({ transaction: result.transaction });
}

export async function DELETE(
  _request: Request,
  ctx: TransactionRouteContext,
) {
  const user = await getRequiredApiUser();

  if (!user) {
    return jsonUnauthorized();
  }

  const { id } = await ctx.params;
  const deleted = await deleteTransaction(user.id, id);

  if (!deleted) {
    return jsonNotFound("Không tìm thấy giao dịch.");
  }

  return Response.json({ ok: true });
}
