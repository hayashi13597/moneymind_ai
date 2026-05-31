"use client";

import { AlertTriangle, TrendingDown, TrendingUp } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { EmptyState, InsightCard, MetricCard, SectionCard } from "@/components/app-ui";
import { FormCombobox } from "@/components/form-combobox";
import { Button } from "@/components/ui/button";
import { formatVnd } from "@/lib/money";

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
  categoryInsights: CategoryInsight[];
};

type CategoryInsight = {
  categoryId: string;
  currentAmount: number;
  previousAmount: number;
  changePercentage: number;
  transactionCount: number;
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

const categoryTypeOptions = [
  { value: "expense", label: "Chi tiêu" },
  { value: "income", label: "Thu nhập" },
];

export function CategoryManager({
  initialCategories,
  categoryInsights,
}: CategoryManagerProps) {
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
  const insightsByCategory = useMemo(
    () =>
      new Map(
        categoryInsights.map((insight) => [insight.categoryId, insight]),
      ),
    [categoryInsights],
  );
  const expenseInsights = categories
    .filter((category) => category.type === "expense")
    .map((category) => ({
      category,
      insight: insightsByCategory.get(category.id) ?? {
        categoryId: category.id,
        currentAmount: 0,
        previousAmount: 0,
        changePercentage: 0,
        transactionCount: 0,
      },
    }));
  const topExpense = expenseInsights
    .filter((item) => item.insight.currentAmount > 0)
    .sort((a, b) => b.insight.currentAmount - a.insight.currentAmount)[0];
  const unusualGrowth = expenseInsights
    .filter((item) => item.insight.changePercentage >= 30)
    .sort((a, b) => b.insight.changePercentage - a.insight.changePercentage)[0];
  const totalCurrentExpense = expenseInsights.reduce(
    (total, item) => total + item.insight.currentAmount,
    0,
  );
  const maxCurrentExpense = Math.max(
    ...expenseInsights.map((item) => item.insight.currentAmount),
    1,
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
    <div className="space-y-8">
      <div className="grid gap-3 md:grid-cols-3">
        <MetricCard
          label="Chi tiêu đã phân loại"
          value={formatVnd(totalCurrentExpense)}
          helper="Tổng chi tiêu theo danh mục trong tháng hiện tại"
          tone="negative"
        />
        <MetricCard
          label="Danh mục đang dùng"
          value={`${categories.length}`}
          helper={`${categories.filter((category) => !category.isDefault).length} danh mục tùy chỉnh`}
          tone="positive"
        />
        <MetricCard
          label="Danh mục lớn nhất"
          value={topExpense?.category.name ?? "Chưa có"}
          helper={
            topExpense
              ? `${formatVnd(topExpense.insight.currentAmount)} tháng này`
              : "Thêm giao dịch để MoneyMind đọc xu hướng"
          }
        />
      </div>

      <div className="grid gap-5 xl:grid-cols-[0.85fr_1.15fr]">
        <InsightCard
          title="Tín hiệu danh mục"
          description={
            unusualGrowth
              ? `${unusualGrowth.category.name} +${unusualGrowth.insight.changePercentage}% vs tháng trước. MoneyMind sẽ ưu tiên theo dõi danh mục này trong phân tích tiếp theo.`
              : "Chưa có tăng trưởng bất thường. Khi một danh mục tăng mạnh, MoneyMind sẽ đưa nó lên đầu để bạn xử lý sớm."
          }
        >
          <div className="space-y-3">
            {expenseInsights
              .filter((item) => item.insight.currentAmount > 0)
              .slice(0, 5)
              .map((item) => (
                <article key={item.category.id} className="space-y-2">
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="font-medium">{item.category.name}</span>
                    <span>{formatVnd(item.insight.currentAmount)}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-[#E2DDD2]">
                    <div
                      className="h-full rounded-full bg-[#2F6B4F]"
                      style={{
                        width: `${Math.max(
                          6,
                          (item.insight.currentAmount / maxCurrentExpense) * 100,
                        )}%`,
                      }}
                    />
                  </div>
                  <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
                    <span>{item.insight.transactionCount} giao dịch</span>
                    <span
                      className={
                        item.insight.changePercentage > 0
                          ? "text-[#A2482D]"
                          : item.insight.changePercentage < 0
                            ? "text-[#2F6B4F]"
                            : ""
                      }
                    >
                      {item.insight.changePercentage > 0 ? "+" : ""}
                      {item.insight.changePercentage}% vs tháng trước
                    </span>
                  </div>
                </article>
              ))}
            {expenseInsights.every((item) => item.insight.currentAmount === 0) ? (
              <p className="rounded-xl border border-dashed border-[#DCD7CC] bg-white/60 p-4 text-sm leading-6 text-muted-foreground">
                Chưa có dữ liệu chi tiêu tháng này để phân tích danh mục.
              </p>
            ) : null}
          </div>
        </InsightCard>

        <SectionCard>
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <h2 className="text-lg font-semibold">Tạo danh mục mới</h2>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                Dùng danh mục đủ cụ thể để AI nhận ra thói quen, nhưng tránh
                chia nhỏ quá mức.
              </p>
            </div>
            <span className="inline-flex w-fit items-center gap-2 rounded-full border border-[#D8E1D7] bg-[#ECF3ED] px-3 py-1 text-xs font-medium text-[#2F6B4F]">
              <AlertTriangle className="size-3.5" />
              Danh mục đang có giao dịch sẽ không thể xóa
            </span>
          </div>
          <form
            action={createCategory}
            className="mt-5 grid gap-3 sm:grid-cols-[1fr_160px_auto]"
          >
            <input
              name="name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Ví dụ: Food delivery"
              className="h-10 rounded-xl border border-[#DCD7CC] bg-[#FDFCF8] px-3 text-sm outline-none transition-colors focus:border-[#2F6B4F] focus:ring-3 focus:ring-[#2F6B4F]/15"
              required
            />
            <FormCombobox
              name="type"
              value={type}
              options={categoryTypeOptions}
              onValueChange={(nextType) => setType(nextType as typeof type)}
              aria-label="Loại danh mục"
              required
            />
            <Button
              type="submit"
              disabled={pending}
              className="h-10 bg-[#2F6B4F] hover:bg-[#285B43]"
            >
              {pending ? "Đang thêm..." : "Thêm"}
            </Button>
          </form>

          {error ? (
            <p className="mt-4 rounded-xl border border-destructive/25 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          ) : null}
        </SectionCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {(
          [
            ["income", groupedCategories.income],
            ["expense", groupedCategories.expense],
            ["shared", groupedCategories.shared],
          ] as const
        ).map(([groupType, group]) => (
          <section
            key={groupType}
            className="overflow-hidden rounded-2xl border border-[#E1DDD4] bg-card"
          >
            <div className="border-b border-[#E8E4DC] bg-[#FDFCF8] px-4 py-3">
              <h2 className="text-sm font-semibold">{typeLabels[groupType]}</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                {group.length} danh mục
              </p>
            </div>
            <div className="divide-y divide-[#E8E4DC]">
              {group.map((category) => (
                <div
                  key={category.id}
                  className="flex items-center justify-between gap-3 p-4"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className="size-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: category.color ?? "#2F6B4F" }}
                      />
                      <p className="truncate text-sm font-medium">
                        {category.name}
                      </p>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {category.isDefault ? "Mặc định" : "Tùy chỉnh"} ·{" "}
                      {insightsByCategory.get(category.id)?.transactionCount ?? 0}{" "}
                      giao dịch
                    </p>
                    {category.type === "expense" ? (
                      <div className="mt-3 max-w-64 space-y-1">
                        <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-full rounded-full bg-[#2F6B4F]"
                            style={{
                              width: `${Math.max(
                                0,
                                ((insightsByCategory.get(category.id)
                                  ?.currentAmount ?? 0) /
                                  maxCurrentExpense) *
                                  100,
                              )}%`,
                            }}
                          />
                        </div>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          {(insightsByCategory.get(category.id)
                            ?.changePercentage ?? 0) > 0 ? (
                            <TrendingUp className="size-3 text-[#A2482D]" />
                          ) : (
                            <TrendingDown className="size-3 text-[#2F6B4F]" />
                          )}
                          <span>
                            {formatVnd(
                              insightsByCategory.get(category.id)
                                ?.currentAmount ?? 0,
                            )}{" "}
                            tháng này
                          </span>
                        </div>
                      </div>
                    ) : null}
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => renameCategory(category)}
                      className="border-[#DDD8CE]"
                    >
                      Sửa
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => deleteCategoryById(category)}
                      className="border-[#DDD8CE]"
                    >
                      Xóa
                    </Button>
                  </div>
                </div>
              ))}
              {group.length === 0 ? (
                <div className="p-4">
                  <EmptyState
                    title="Chưa có danh mục"
                    description="Tạo danh mục đầu tiên để MoneyMind AI có bối cảnh phân tích chính xác hơn."
                  />
                </div>
              ) : null}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
