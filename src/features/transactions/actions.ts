"use server";

import { revalidateTransactionViews } from "@/features/transactions/revalidation";
import { transactionCreateSchema } from "@/features/transactions/schemas";
import { createTransaction } from "@/features/transactions/service";
import { getCurrentUser } from "@/lib/auth-session";

export type CreateTransactionActionState =
  | { ok: true }
  | { ok: false; error: string };

function transactionActionError(reason: string) {
  if (reason === "missing_category") {
    return "Không tìm thấy danh mục.";
  }

  if (reason === "type_mismatch") {
    return "Danh mục không khớp loại giao dịch.";
  }

  return "Không thể lưu giao dịch.";
}

export async function createTransactionAction(
  input: unknown,
): Promise<CreateTransactionActionState> {
  const user = await getCurrentUser();

  if (!user) {
    return { ok: false, error: "Bạn cần đăng nhập để tiếp tục." };
  }

  const parsed = transactionCreateSchema.safeParse(input);

  if (!parsed.success) {
    return { ok: false, error: "Dữ liệu không hợp lệ." };
  }

  const result = await createTransaction(user.id, parsed.data);

  if (!result.ok) {
    return { ok: false, error: transactionActionError(result.reason) };
  }

  revalidateTransactionViews();

  return { ok: true };
}
