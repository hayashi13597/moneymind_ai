import { CategoryManager } from "@/features/categories/category-manager";
import { listCategories } from "@/features/categories/service";
import { getCurrentUser } from "@/lib/auth-session";

export default async function CategoriesPage() {
  const user = await getCurrentUser();

  if (!user) {
    return null;
  }

  const categories = await listCategories(user.id);

  return (
    <section className="space-y-6">
      <div className="space-y-2">
        <p className="text-sm font-medium text-muted-foreground">Danh mục</p>
        <h1 className="text-2xl font-semibold tracking-normal">
          Phân loại thu chi
        </h1>
        <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
          Quản lý danh mục thu nhập và chi tiêu dùng cho giao dịch hằng ngày.
        </p>
      </div>
      <CategoryManager initialCategories={categories} />
    </section>
  );
}
