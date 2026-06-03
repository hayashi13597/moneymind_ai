"use client";

import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  CircleDollarSign,
  FolderKanban,
  Pencil,
  Plus,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { EmptyState, InsightCard, SectionCard } from "@/components/app-ui";
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
import { cn } from "@/lib/utils";
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

const typeDescriptions = {
  income: "Nguồn tiền vào, lương, thưởng hoặc hoàn tiền.",
  expense: "Các khoản chi để AI đọc thói quen tháng này.",
} as const;

const CONTROL_CLASS_NAME =
  "h-11 w-full rounded-xl border border-[#DCD7CC] bg-[#FFFDF7] px-3 text-sm outline-none transition-colors focus:border-[#2F6B4F] focus:ring-3 focus:ring-[#2F6B4F]/15";
const DIALOG_CONTROL_CLASS_NAME =
  "h-11 w-full rounded-xl border border-[#DCD7CC] bg-white px-3 text-sm outline-none transition-colors focus:border-[#2F6B4F] focus:ring-3 focus:ring-[#2F6B4F]/15";

const NETWORK_ERROR_MESSAGE = "Không thể kết nối máy chủ.";

const categoryTypeOptions = [
  { value: "expense", label: "Chi tiêu" },
  { value: "income", label: "Thu nhập" },
];

async function readJsonError(response: Response) {
  const payload = (await response.json().catch(() => null)) as {
    error?: string;
  } | null;

  return payload?.error ?? "Không thể lưu thay đổi.";
}

function fallbackInsight(categoryId: string): CategoryInsight {
  return {
    categoryId,
    currentAmount: 0,
    previousAmount: 0,
    changePercentage: 0,
    transactionCount: 0,
  };
}

function insightTone(changePercentage: number) {
  if (changePercentage > 0) {
    return "text-[#A2482D]";
  }

  if (changePercentage < 0) {
    return "text-[#2F6B4F]";
  }

  return "text-muted-foreground";
}

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
  const expenseInsights = groupedCategories.expense.map((category) => ({
    category,
    insight: insightsByCategory.get(category.id) ?? fallbackInsight(category.id),
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
  const totalTransactions = visibleCategories.reduce(
    (total, category) =>
      total +
      (insightsByCategory.get(category.id)?.transactionCount ??
        fallbackInsight(category.id).transactionCount),
    0,
  );
  const customCategoryCount = visibleCategories.filter(
    (category) => !category.isDefault,
  ).length;
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
    <div className="space-y-6">
      <section className="grid gap-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(360px,0.9fr)]">
        <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-1">
          <SummaryTile
            icon={<CircleDollarSign className="size-4" />}
            label="Chi tiêu đã phân loại"
            value={formatVnd(totalCurrentExpense)}
            helper="Tổng chi tiêu theo danh mục trong tháng hiện tại."
            tone="expense"
          />
          <SummaryTile
            icon={<FolderKanban className="size-4" />}
            label="Danh mục đang dùng"
            value={`${visibleCategories.length}`}
            helper={`${customCategoryCount} danh mục tùy chỉnh, ${totalTransactions} giao dịch đã gắn danh mục.`}
          />
          <SummaryTile
            icon={<TrendingUp className="size-4" />}
            label="Danh mục lớn nhất"
            value={topExpense?.category.name ?? "Chưa có"}
            helper={
              topExpense
                ? `${formatVnd(topExpense.insight.currentAmount)} trong tháng này.`
                : "Thêm giao dịch để MoneyMind đọc xu hướng."
            }
          />
        </div>

        <SectionCard className="min-h-full">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-xl">
              <h2 className="text-xl font-semibold tracking-tight">
                Tạo danh mục mới
              </h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Đặt tên đủ cụ thể để AI nhận diện thói quen, nhưng vẫn dễ nhớ
                khi nhập giao dịch thủ công.
              </p>
            </div>
            <Badge
              variant="outline"
              className="h-auto w-fit rounded-full border-[#D8E1D7] bg-[#ECF3ED] px-3 py-1 text-xs font-medium text-[#2F6B4F]"
            >
              <AlertTriangle className="size-3.5" />
              Có giao dịch thì không thể xóa
            </Badge>
          </div>

          <Form {...createForm}>
            <form
              onSubmit={createForm.handleSubmit(createCategory)}
              className="mt-6 grid gap-4 sm:grid-cols-[minmax(0,1fr)_160px] lg:grid-cols-[minmax(0,1fr)_168px_auto]"
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
                        placeholder="Ví dụ: Ăn ngoài"
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
                className="h-11 self-end rounded-xl bg-[#2F6B4F] px-5 text-white hover:bg-[#285B43]"
              >
                <Plus className="size-4" />
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
      </section>

      <InsightCard
        title="Tín hiệu danh mục"
        description={
          unusualGrowth
            ? `${unusualGrowth.category.name} tăng ${unusualGrowth.insight.changePercentage}% so với tháng trước. MoneyMind sẽ ưu tiên theo dõi danh mục này trong phân tích tiếp theo.`
            : "Chưa có tăng trưởng bất thường. Khi một danh mục tăng mạnh, MoneyMind sẽ đưa nó lên đầu để bạn xử lý sớm."
        }
        className="bg-[#F2F7F1]/95"
      >
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          {expenseInsights
            .filter((item) => item.insight.currentAmount > 0)
            .slice(0, 5)
            .map((item) => (
              <article
                key={item.category.id}
                className="rounded-xl border border-[#D8E1D7] bg-white/72 p-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="truncate text-sm font-semibold">
                    {item.category.name}
                  </span>
                  <span
                    className={cn(
                      "flex shrink-0 items-center gap-1 text-xs font-medium",
                      insightTone(item.insight.changePercentage),
                    )}
                  >
                    {item.insight.changePercentage > 0 ? (
                      <ArrowUpRight className="size-3.5" />
                    ) : item.insight.changePercentage < 0 ? (
                      <ArrowDownRight className="size-3.5" />
                    ) : null}
                    {item.insight.changePercentage > 0 ? "+" : ""}
                    {item.insight.changePercentage}%
                  </span>
                </div>
                <p className="mt-3 text-lg font-semibold leading-none">
                  {formatVnd(item.insight.currentAmount)}
                </p>
                <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-[#DFE7DD]">
                  <div
                    className="h-full rounded-full bg-[#2F6B4F]"
                    style={{
                      width: `${Math.max(
                        8,
                        (item.insight.currentAmount / maxCurrentExpense) * 100,
                      )}%`,
                    }}
                  />
                </div>
                <p className="mt-3 text-xs text-muted-foreground">
                  {item.insight.transactionCount} giao dịch
                </p>
              </article>
            ))}
          {expenseInsights.every((item) => item.insight.currentAmount === 0) ? (
            <div className="md:col-span-2 xl:col-span-5">
              <EmptyState
                title="Chưa có dữ liệu chi tiêu tháng này"
                description="Khi có giao dịch chi tiêu, trang này sẽ hiển thị nhóm danh mục đáng chú ý để bạn chỉnh cách phân loại."
              />
            </div>
          ) : null}
        </div>
      </InsightCard>

      <div className="grid gap-5 lg:grid-cols-2">
        {(
          [
            ["expense", groupedCategories.expense],
            ["income", groupedCategories.income],
          ] as const
        ).map(([groupType, group]) => (
          <CategoryGroupCard
            key={groupType}
            groupType={groupType}
            categories={group}
            insightsByCategory={insightsByCategory}
            maxCurrentExpense={maxCurrentExpense}
            onEdit={openEditCategory}
            onDelete={deleteCategoryById}
          />
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

function SummaryTile({
  icon,
  label,
  value,
  helper,
  tone = "default",
}: {
  icon: ReactNode;
  label: string;
  value: string;
  helper: string;
  tone?: "default" | "expense";
}) {
  return (
    <Card className="gap-0 rounded-xl border-[#E1DDD4] bg-card/92 py-0 shadow-[0_12px_36px_rgba(47,42,31,0.045)]">
      <CardContent className="p-5">
        <div className="flex items-center gap-3">
          <span
            className={cn(
              "flex size-9 items-center justify-center rounded-xl bg-[#ECF3ED] text-[#2F6B4F]",
              tone === "expense" && "bg-[#F7EDE8] text-[#A2482D]",
            )}
          >
            {icon}
          </span>
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
        </div>
        <p
          className={cn(
            "mt-4 truncate text-2xl font-bold leading-none text-foreground",
            tone === "expense" && "text-[#A2482D]",
          )}
        >
          {value}
        </p>
        <p className="mt-2 text-xs leading-5 text-muted-foreground">{helper}</p>
      </CardContent>
    </Card>
  );
}

function CategoryGroupCard({
  groupType,
  categories,
  insightsByCategory,
  maxCurrentExpense,
  onEdit,
  onDelete,
}: {
  groupType: "income" | "expense";
  categories: Category[];
  insightsByCategory: Map<string, CategoryInsight>;
  maxCurrentExpense: number;
  onEdit: (category: Category) => void;
  onDelete: (category: Category) => void;
}) {
  return (
    <Card className="gap-0 overflow-hidden rounded-xl border-[#E1DDD4] bg-card/92 py-0 shadow-[0_14px_48px_rgba(47,42,31,0.055)]">
      <CardContent className="p-0">
        <div className="flex items-start justify-between gap-4 border-b border-[#E8E4DC] bg-[#FFFDF7] p-5">
          <div>
            <h2 className="text-lg font-semibold">{typeLabels[groupType]}</h2>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              {typeDescriptions[groupType]}
            </p>
          </div>
          <Badge
            variant="outline"
            className="rounded-full border-[#DDD8CE] bg-white px-3 text-xs"
          >
            {categories.length} danh mục
          </Badge>
        </div>

        <div className="divide-y divide-[#E8E4DC]">
          {categories.map((category) => (
            <CategoryRow
              key={category.id}
              category={category}
              insight={insightsByCategory.get(category.id) ?? fallbackInsight(category.id)}
              maxCurrentExpense={maxCurrentExpense}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
          {categories.length === 0 ? (
            <div className="p-5">
              <EmptyState
                title="Chưa có danh mục"
                description="Tạo danh mục đầu tiên để MoneyMind AI có bối cảnh phân tích chính xác hơn."
              />
            </div>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

function CategoryRow({
  category,
  insight,
  maxCurrentExpense,
  onEdit,
  onDelete,
}: {
  category: Category;
  insight: CategoryInsight;
  maxCurrentExpense: number;
  onEdit: (category: Category) => void;
  onDelete: (category: Category) => void;
}) {
  const isExpense = category.type === "expense";
  const percentOfLargest =
    isExpense && insight.currentAmount > 0
      ? Math.max(8, (insight.currentAmount / maxCurrentExpense) * 100)
      : 0;

  return (
    <article className="grid gap-4 p-5 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
      <div className="min-w-0">
        <div className="flex items-center gap-3">
          <span
            className="size-3 shrink-0 rounded-full ring-4 ring-[#F2EFE7]"
            style={{ backgroundColor: category.color ?? "#2F6B4F" }}
          />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{category.name}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {category.isDefault ? "Mặc định" : "Tùy chỉnh"} -{" "}
              {insight.transactionCount} giao dịch
            </p>
          </div>
        </div>

        {isExpense ? (
          <div className="mt-4 max-w-xl">
            <div className="flex items-center justify-between gap-3 text-xs">
              <span className="font-medium text-foreground">
                {formatVnd(insight.currentAmount)} tháng này
              </span>
              <span
                className={cn(
                  "flex items-center gap-1 font-medium",
                  insightTone(insight.changePercentage),
                )}
              >
                {insight.changePercentage > 0 ? (
                  <TrendingUp className="size-3.5" />
                ) : (
                  <TrendingDown className="size-3.5" />
                )}
                {insight.changePercentage > 0 ? "+" : ""}
                {insight.changePercentage}% so với tháng trước
              </span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#EEE9DF]">
              <div
                className="h-full rounded-full bg-[#2F6B4F]"
                style={{ width: `${percentOfLargest}%` }}
              />
            </div>
          </div>
        ) : null}
      </div>

      <div className="flex shrink-0 gap-2 md:justify-end">
        <Button
          type="button"
          variant="outline"
          size="sm"
          aria-label={`Sửa danh mục ${category.name}`}
          onClick={() => onEdit(category)}
          className="rounded-xl border-[#DDD8CE]"
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
              className="rounded-xl border-[#DDD8CE] text-destructive hover:text-destructive"
            >
              Xóa
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Xóa danh mục?</AlertDialogTitle>
              <AlertDialogDescription>
                Danh mục &quot;{category.name}&quot; sẽ bị xóa nếu chưa có giao
                dịch nào đang sử dụng. Hành động này không thể khôi phục.
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
                onClick={() => onDelete(category)}
              >
                Xóa danh mục
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </article>
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
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
                className="rounded-xl border-[#DDD8CE]"
                onClick={onClose}
              >
                Hủy
              </Button>
              <Button
                type="submit"
                aria-label="Lưu danh mục đã sửa"
                disabled={pending}
                className="rounded-xl bg-[#2F6B4F] text-white hover:bg-[#285B43]"
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
