import { categoryCreateSchema } from "@/features/categories/schemas";
import {
  createCategory,
  isUniqueCategoryError,
  listCategories,
} from "@/features/categories/service";
import {
  getRequiredApiUser,
  jsonBadRequest,
  jsonError,
  jsonUnauthorized,
} from "@/lib/api";

export async function GET() {
  const user = await getRequiredApiUser();

  if (!user) {
    return jsonUnauthorized();
  }

  const categories = await listCategories(user.id);

  return Response.json({ categories });
}

export async function POST(request: Request) {
  const user = await getRequiredApiUser();

  if (!user) {
    return jsonUnauthorized();
  }

  const parsed = categoryCreateSchema.safeParse(await request.json());

  if (!parsed.success) {
    return jsonBadRequest();
  }

  try {
    const category = await createCategory(user.id, parsed.data);

    return Response.json({ category }, { status: 201 });
  } catch (error) {
    if (isUniqueCategoryError(error)) {
      return jsonError("Danh mục đã tồn tại.", 409);
    }

    throw error;
  }
}
