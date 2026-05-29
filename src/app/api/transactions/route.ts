import { revalidateTransactionViews } from "@/features/transactions/revalidation";
import { transactionCreateSchema } from "@/features/transactions/schemas";
import {
  createTransaction,
  listTransactions,
} from "@/features/transactions/service";
import {
  getRequiredApiUser,
  jsonBadRequest,
  jsonError,
  jsonUnauthorized,
} from "@/lib/api";

function transactionDomainError(reason: string) {
  if (reason === "missing_category") {
    return jsonError("Không tìm thấy danh mục.", 404);
  }

  if (reason === "type_mismatch") {
    return jsonError("Danh mục không khớp loại giao dịch.", 400);
  }

  return jsonBadRequest();
}

export async function GET() {
  const user = await getRequiredApiUser();

  if (!user) {
    return jsonUnauthorized();
  }

  const transactions = await listTransactions(user.id);

  return Response.json({ transactions });
}

export async function POST(request: Request) {
  const user = await getRequiredApiUser();

  if (!user) {
    return jsonUnauthorized();
  }

  const parsed = transactionCreateSchema.safeParse(await request.json());

  if (!parsed.success) {
    return jsonBadRequest();
  }

  const result = await createTransaction(user.id, parsed.data);

  if (!result.ok) {
    return transactionDomainError(result.reason);
  }

  revalidateTransactionViews();

  return Response.json({ transaction: result.transaction }, { status: 201 });
}
