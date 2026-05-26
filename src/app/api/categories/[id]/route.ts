import { categoryUpdateSchema } from "@/features/categories/schemas";
import {
  deleteCategory,
  isUniqueCategoryError,
  updateCategory,
} from "@/features/categories/service";
import {
  getRequiredApiUser,
  jsonBadRequest,
  jsonError,
  jsonNotFound,
  jsonUnauthorized,
} from "@/lib/api";

type CategoryRouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, ctx: CategoryRouteContext) {
  const user = await getRequiredApiUser();

  if (!user) {
    return jsonUnauthorized();
  }

  const { id } = await ctx.params;
  const parsed = categoryUpdateSchema.safeParse(await request.json());

  if (!parsed.success) {
    return jsonBadRequest();
  }

  try {
    const category = await updateCategory(user.id, id, parsed.data);

    if (!category) {
      return jsonNotFound("Không tìm thấy danh mục.");
    }

    return Response.json({ category });
  } catch (error) {
    if (isUniqueCategoryError(error)) {
      return jsonError("Danh mục đã tồn tại.", 409);
    }

    throw error;
  }
}

export async function DELETE(
  _request: Request,
  ctx: CategoryRouteContext,
) {
  const user = await getRequiredApiUser();

  if (!user) {
    return jsonUnauthorized();
  }

  const { id } = await ctx.params;
  const result = await deleteCategory(user.id, id);

  if (!result.ok && result.reason === "not_found") {
    return jsonNotFound("Không tìm thấy danh mục.");
  }

  if (!result.ok && result.reason === "in_use") {
    return jsonError("Không thể xóa danh mục đang có giao dịch.", 409);
  }

  return Response.json({ ok: true });
}
