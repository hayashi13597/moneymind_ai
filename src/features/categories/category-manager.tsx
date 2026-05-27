"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

type Category = {
  id: string;
  name: string;
  type: "income" | "expense" | null;
  color: string | null;
  icon: string | null;
  isDefault: boolean;
};

type CategoryManagerProps = {
  initialCategories: Category[];
};

const typeLabels = {
  income: "Thu nhập",
  expense: "Chi tiêu",
  shared: "Dùng chung",
} as const;

async function readJsonError(response: Response) {
  const payload = (await response.json().catch(() => null)) as {
    error?: string;
  } | null;

  return payload?.error ?? "Không thể lưu thay đổi.";
}

const NETWORK_ERROR_MESSAGE = "Không thể kết nối máy chủ.";

export function CategoryManager({ initialCategories }: CategoryManagerProps) {
  const [categories, setCategories] = useState(initialCategories);
  const [error, setError] = useState("");
  const [name, setName] = useState("");
  const [type, setType] = useState<"income" | "expense">("expense");
  const [pending, setPending] = useState(false);

  const groupedCategories = useMemo(
    () => ({
      income: categories.filter((category) => category.type === "income"),
      expense: categories.filter((category) => category.type === "expense"),
      shared: categories.filter((category) => category.type === null),
    }),
    [categories],
  );

  async function refreshCategories() {
    try {
      const response = await fetch("/api/categories");

      if (!response.ok) {
        const message = await readJsonError(response);
        setError(message);
        toast.error(message);
        return false;
      }

      const payload = (await response.json()) as { categories: Category[] };
      setCategories(payload.categories);
      return true;
    } catch {
      setError(NETWORK_ERROR_MESSAGE);
      toast.error(NETWORK_ERROR_MESSAGE);
      return false;
    }
  }

  async function createCategory(formData: FormData) {
    setPending(true);
    setError("");

    try {
      const response = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: String(formData.get("name") ?? ""),
          type: String(formData.get("type") ?? "expense"),
        }),
      });

      if (!response.ok) {
        const message = await readJsonError(response);
        setError(message);
        toast.error(message);
        return;
      }

      setName("");
      if (await refreshCategories()) {
        toast.success("Đã thêm danh mục.");
      }
    } catch {
      setError(NETWORK_ERROR_MESSAGE);
      toast.error(NETWORK_ERROR_MESSAGE);
    } finally {
      setPending(false);
    }
  }

  async function renameCategory(category: Category) {
    const nextName = window.prompt("Tên danh mục", category.name);

    if (!nextName || nextName.trim() === category.name) {
      return;
    }

    setError("");

    try {
      const response = await fetch(`/api/categories/${category.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: nextName }),
      });

      if (!response.ok) {
        const message = await readJsonError(response);
        setError(message);
        toast.error(message);
        return;
      }

      if (await refreshCategories()) {
        toast.success("Đã cập nhật danh mục.");
      }
    } catch {
      setError(NETWORK_ERROR_MESSAGE);
      toast.error(NETWORK_ERROR_MESSAGE);
    }
  }

  async function deleteCategoryById(category: Category) {
    const confirmed = window.confirm(`Xóa danh mục "${category.name}"?`);

    if (!confirmed) {
      return;
    }

    setError("");

    try {
      const response = await fetch(`/api/categories/${category.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const message = await readJsonError(response);
        setError(message);
        toast.error(message);
        return;
      }

      if (await refreshCategories()) {
        toast.success("Đã xóa danh mục.");
      }
    } catch {
      setError(NETWORK_ERROR_MESSAGE);
      toast.error(NETWORK_ERROR_MESSAGE);
    }
  }

  return (
    <div className="space-y-6">
      <form
        action={createCategory}
        className="grid gap-3 rounded-lg border bg-card p-4 sm:grid-cols-[1fr_160px_auto]"
      >
        <input
          name="name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Tên danh mục"
          className="h-9 rounded-md border bg-background px-3 text-sm"
          required
        />
        <select
          name="type"
          value={type}
          onChange={(event) => setType(event.target.value as typeof type)}
          className="h-9 rounded-md border bg-background px-3 text-sm"
        >
          <option value="expense">Chi tiêu</option>
          <option value="income">Thu nhập</option>
        </select>
        <Button type="submit" disabled={pending}>
          Thêm
        </Button>
      </form>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <div className="grid gap-4 lg:grid-cols-3">
        {(
          [
            ["income", groupedCategories.income],
            ["expense", groupedCategories.expense],
            ["shared", groupedCategories.shared],
          ] as const
        ).map(([groupType, group]) => (
          <section key={groupType} className="space-y-2">
            <h2 className="text-sm font-semibold">{typeLabels[groupType]}</h2>
            <div className="divide-y rounded-lg border bg-card">
              {group.map((category) => (
                <div
                  key={category.id}
                  className="flex items-center justify-between gap-3 p-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {category.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {category.isDefault ? "Mặc định" : "Tùy chỉnh"}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => renameCategory(category)}
                    >
                      Sửa
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => deleteCategoryById(category)}
                    >
                      Xóa
                    </Button>
                  </div>
                </div>
              ))}
              {group.length === 0 ? (
                <p className="p-3 text-sm text-muted-foreground">
                  Chưa có danh mục.
                </p>
              ) : null}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
