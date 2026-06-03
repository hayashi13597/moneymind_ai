import { revalidateBudgetViews } from "@/features/budgets/revalidation";
import {
  budgetDeleteSchema,
  budgetQuerySchema,
  budgetUpsertSchema,
} from "@/features/budgets/schemas";
import {
  deleteBudget,
  listCategoryBudgetRows,
  upsertBudget,
} from "@/features/budgets/service";
import {
  getRequiredApiUser,
  jsonBadRequest,
  jsonError,
  jsonUnauthorized,
} from "@/lib/api";

function budgetDomainError(reason: string) {
  if (reason === "invalid_category") {
    return jsonError("Danh mục không hợp lệ.", 400);
  }

  return jsonBadRequest();
}

async function readJsonBody(request: Request) {
  try {
    const payload = await request.json();

    if (payload === null || payload === undefined) {
      return { ok: false as const };
    }

    return { ok: true as const, payload };
  } catch {
    return { ok: false as const };
  }
}

export async function GET(request: Request) {
  const user = await getRequiredApiUser();

  if (!user) {
    return jsonUnauthorized();
  }

  const searchParams = new URL(request.url).searchParams;
  const parsed = budgetQuerySchema.safeParse({
    month: searchParams.get("month"),
  });

  if (!parsed.success) {
    return jsonBadRequest("Tháng không hợp lệ.");
  }

  const result = await listCategoryBudgetRows(user.id, parsed.data.month);

  return Response.json(result);
}

export async function PUT(request: Request) {
  const user = await getRequiredApiUser();

  if (!user) {
    return jsonUnauthorized();
  }

  const payload = await readJsonBody(request);

  if (!payload.ok) {
    return jsonBadRequest();
  }

  const parsed = budgetUpsertSchema.safeParse(payload.payload);

  if (!parsed.success) {
    return jsonBadRequest();
  }

  const result = await upsertBudget(user.id, parsed.data);

  if (!result.ok) {
    return budgetDomainError(result.reason);
  }

  revalidateBudgetViews();

  return Response.json({ budget: result.budget });
}

export async function DELETE(request: Request) {
  const user = await getRequiredApiUser();

  if (!user) {
    return jsonUnauthorized();
  }

  const payload = await readJsonBody(request);

  if (!payload.ok) {
    return jsonBadRequest();
  }

  const parsed = budgetDeleteSchema.safeParse(payload.payload);

  if (!parsed.success) {
    return jsonBadRequest();
  }

  const result = await deleteBudget(user.id, parsed.data);

  if (!result.ok) {
    return budgetDomainError(result.reason);
  }

  revalidateBudgetViews();

  return Response.json({ deleted: result.count });
}
