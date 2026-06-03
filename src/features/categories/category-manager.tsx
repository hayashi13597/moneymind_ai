"use client";

import { AlertTriangle, Pencil, TrendingDown, TrendingUp } from "lucide-react";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { EmptyState, InsightCard, MetricCard, SectionCard } from "@/components/app-ui";
import { RhfComboboxControl } from "@/components/form-rhf-controls";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { formatVnd } from "@/lib/money";
import { createZodResolver } from "@/lib/zod-form";

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

type EditingCategory = {
  id: string;
  name: string;
  type: "income" | "expense";
} | null;

const categoryFormSchema = z.object({
  name: z.string().trim().min(1, "Tên danh mục là bắt buộc."),
  type: z.enum(["income", "expense"]),
});

type CategoryFormValues = z.infer<typeof categoryFormSchema>;

const typeLabels = {
  income: "Thu nhập",
  expense: "Chi tiêu",
} as const;
const CONTROL_CLASS_NAME =
  "h-11 w-full rounded-xl border border-[#DCD7CC] bg-[#FDFCF8] px-3 text-sm outline-none transition-colors focus:border-[#2F6B4F] focus:ring-3 focus:ring-[#2F6B4F]/15";
const DIALOG_CONTROL_CLASS_NAME =
  "h-11 w-full rounded-xl border border-[#DCD7CC] bg-white px-3 text-sm outline-none transition-colors focus:border-[#2F6B4F] focus:ring-3 focus:ring-[#2F6B4F]/15";

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
  const [pending, setPending] = useState(false);
  const [editingCategory, setEditingCategory] = useState<EditingCategory>(null);
  const createForm = useForm<CategoryFormValues>({
    resolver: createZodResolver(categoryFormSchema),
    defaultValues: {
      name: "",
      type: "expense",
    },
  });

  const groupedCategories = useMemo(
    () => ({
      income: categories.filter((category) => category.type === "income"),
      expense: categories.filter((category) => category.type === "expense"),
    }),
    [categories],
  );
  const visibleCategories = useMemo(
    () => categories.filter((category) => category.type !== null),
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

  async function createCategory(values: CategoryFormValues) {
    setPending(true);
    setError("");

    try {
      const response = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      if (!response.ok) {
        const message = await readJsonError(response);
        setError(message);
        toast.error(message);
        return;
      }

      createForm.reset({
        name: "",
        type: "expense",
      });
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

  function openEditCategory(category: Category) {
    if (!category.type) {
      return;
    }

    setEditingCategory({
      id: category.id,
      name: category.name,
      type: category.type,
    });
    setError("");
  }

  async function updateEditingCategory(values: CategoryFormValues) {
    if (!editingCategory) {
      return;
    }

    setPending(true);
    setError("");

    try {
      const response = await fetch(`/api/categories/${editingCategory.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      if (!response.ok) {
        const message = await readJsonError(response);
        setError(message);
        toast.error(message);
        return;
      }

      setEditingCategory(null);
      if (await refreshCategories()) {
        toast.success("Đã cập nhật danh mục.");
      }
    } catch {
      setError(NETWORK_ERROR_MESSAGE);
      toast.error(NETWORK_ERROR_MESSAGE);
    } finally {
      setPending(false);
    }
  }

  async function deleteCategoryById(category: Category) {
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
          value={`${visibleCategories.length}`}
          helper={`${visibleCategories.filter((category) => !category.isDefault).length} danh mục tùy chỉnh`}
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
            <Badge
              variant="outline"
              className="h-auto w-fit rounded-full border-[#D8E1D7] bg-[#ECF3ED] px-3 py-1 text-xs font-medium text-[#2F6B4F]"
            >
              <AlertTriangle className="size-3.5" />
              Danh mục đang có giao dịch sẽ không thể xóa
            </Badge>
          </div>
          <Form {...createForm}>
            <form
              onSubmit={createForm.handleSubmit(createCategory)}
              className="mt-5 grid gap-3 sm:grid-cols-[1fr_160px_auto]"
            >
              <FormField
                control={createForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tên danh mục</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="Ví dụ: Food delivery"
                        className={CONTROL_CLASS_NAME}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={createForm.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Loại danh mục</FormLabel>
                    <RhfComboboxControl
                      name={field.name}
                      value={field.value}
                      options={categoryTypeOptions}
                      onValueChange={field.onChange}
                      onBlur={field.onBlur}
                      aria-label="Loại danh mục"
                      className="h-11"
                      required
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button
                type="submit"
                disabled={pending}
                className="h-11 self-end bg-[#2F6B4F] hover:bg-[#285B43]"
              >
                {pending ? "Đang thêm..." : "Thêm"}
              </Button>
            </form>
          </Form>

          {error ? (
            <p className="mt-4 rounded-xl border border-destructive/25 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          ) : null}
        </SectionCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {(
          [
            ["income", groupedCategories.income],
            ["expense", groupedCategories.expense],
          ] as const
        ).map(([groupType, group]) => (
          <Card
            key={groupType}
            className="gap-0 overflow-hidden rounded-2xl border-[#E1DDD4] bg-card py-0 shadow-none"
          >
            <CardContent className="p-0">
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
                        aria-label={`Sửa danh mục ${category.name}`}
                        onClick={() => openEditCategory(category)}
                        className="border-[#DDD8CE]"
                      >
                        <Pencil className="size-4" />
                        Sửa
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            aria-label={`Xóa danh mục ${category.name}`}
                            className="border-[#DDD8CE] text-destructive hover:text-destructive"
                          >
                            Xóa
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Xóa danh mục?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Danh mục &quot;{category.name}&quot; sẽ bị xóa nếu chưa có
                              giao dịch nào đang sử dụng. Hành động này không
                              thể khôi phục.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel
                              aria-label={`Hủy xóa danh mục ${category.name}`}
                            >
                              Hủy
                            </AlertDialogCancel>
                            <AlertDialogAction
                              aria-label={`Xác nhận xóa danh mục ${category.name}`}
                              onClick={() => deleteCategoryById(category)}
                            >
                              Xóa danh mục
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
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
            </CardContent>
          </Card>
        ))}
      </div>

      {editingCategory ? (
        <CategoryEditDialog
          key={editingCategory.id}
          category={editingCategory}
          pending={pending}
          onClose={() => setEditingCategory(null)}
          onSubmit={updateEditingCategory}
        />
      ) : null}
    </div>
  );
}

function CategoryEditDialog({
  category,
  pending,
  onClose,
  onSubmit,
}: {
  category: Exclude<EditingCategory, null>;
  pending: boolean;
  onClose: () => void;
  onSubmit: (values: CategoryFormValues) => void;
}) {
  const form = useForm<CategoryFormValues>({
    resolver: createZodResolver(categoryFormSchema),
    defaultValues: {
      name: category.name,
      type: category.type,
    },
  });

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) {
          onClose();
        }
      }}
    >
      <DialogContent
        aria-describedby={undefined}
        aria-labelledby="category-edit-dialog-title"
        showCloseButton={false}
        className="w-full max-w-md rounded-2xl border-[#DCD7CC] bg-[#FDFCF8] p-5 shadow-[0_24px_80px_rgba(47,42,31,0.18)]"
      >
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="space-y-4"
        >
          <DialogHeader>
            <p className="text-sm font-medium text-muted-foreground">
              Cập nhật tên và loại danh mục
            </p>
            <DialogTitle className="sr-only">Sửa danh mục</DialogTitle>
            <h3
              id="category-edit-dialog-title"
              className="mt-1 text-xl font-semibold text-foreground"
            >
              Sửa danh mục
            </h3>
          </DialogHeader>
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tên danh mục</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    className={DIALOG_CONTROL_CLASS_NAME}
                    placeholder="Ví dụ: Ăn ngoài"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Loại danh mục</FormLabel>
                <RhfComboboxControl
                  name={field.name}
                  value={field.value}
                  options={categoryTypeOptions}
                  onValueChange={field.onChange}
                  onBlur={field.onBlur}
                  aria-label="Loại danh mục đang sửa"
                  className="h-11"
                  required
                />
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              className="border-[#DDD8CE]"
              onClick={onClose}
            >
              Hủy
            </Button>
            <Button
              type="submit"
              aria-label="Lưu danh mục đã sửa"
              disabled={pending}
              className="bg-[#2F6B4F] hover:bg-[#285B43]"
            >
              Lưu danh mục
            </Button>
          </div>
        </form>
      </Form>
      </DialogContent>
    </Dialog>
  );
}
