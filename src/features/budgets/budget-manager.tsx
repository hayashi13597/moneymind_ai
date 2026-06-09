"use client";

import { ChevronLeft, ChevronRight, Pencil, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import {
  CoachEmptyState,
  CoachHero,
  CoachMetricStrip,
  CoachPageShell,
  WorkbenchCard,
} from "@/components/coach-ui";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import type { DashboardMonth } from "@/features/dashboard/month";
import { formatVnd } from "@/lib/money";
import { createZodResolver } from "@/lib/zod-form";
import { cn } from "@/lib/utils";

import type { CategoryBudgetList, CategoryBudgetRow } from "./service";

type BudgetManagerProps = {
  selectedMonth: DashboardMonth;
  initialData: CategoryBudgetList;
};

type EditingState = {
  row: CategoryBudgetRow;
  scope: "default" | "month";
} | null;

const statusLabels = {
  not_set: "Chưa đặt",
  healthy: "Ổn",
  near_limit: "Gần vượt",
  over_limit: "Đã vượt",
} as const;
const DIALOG_CONTROL_CLASS_NAME =
  "h-11 w-full rounded-xl border border-[#DCD7CC] bg-white px-3 text-sm outline-none transition-colors focus:border-[#2F6B4F] focus:ring-3 focus:ring-[#2F6B4F]/15";
const budgetFormSchema = z.object({
  amount: z.string().trim().min(1, "Bạn cần nhập số tiền hạn mức."),
});

type BudgetFormValues = z.infer<typeof budgetFormSchema>;

function statusTone(status: CategoryBudgetRow["status"]) {
  if (status === "over_limit") {
    return "border-[#E5B8A7] bg-[#F9E8E1] text-[#A2482D]";
  }

  if (status === "near_limit") {
    return "border-[#E4CF9F] bg-[#FBF0D4] text-[#8A5B25]";
  }

  if (status === "healthy") {
    return "border-[#C8DDC6] bg-[#ECF3ED] text-[#2F6B4F]";
  }

  return "border-[#DDD8CE] bg-[#F3F0E9] text-muted-foreground";
}

function formatOptionalAmount(value: number | null) {
  return value === null ? "Chưa đặt hạn mức" : formatVnd(value);
}

function remainingLabel(row: CategoryBudgetRow) {
  if (row.remainingAmount === null) {
    return "Chưa có hạn mức";
  }

  if (row.remainingAmount < 0) {
    return `Vượt ${formatVnd(Math.abs(row.remainingAmount))}`;
  }

  return `Còn ${formatVnd(row.remainingAmount)}`;
}

export function BudgetManager({
  selectedMonth,
  initialData,
}: BudgetManagerProps) {
  const router = useRouter();
  const [editing, setEditing] = useState<EditingState>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const overLimitRows = initialData.rows.filter(
    (row) => row.status === "over_limit",
  );
  const nearLimitRows = initialData.rows.filter(
    (row) => row.status === "near_limit",
  );
  const unsetRows = initialData.rows.filter((row) => row.status === "not_set");
  const priorityRow = overLimitRows[0] ?? nearLimitRows[0] ?? unsetRows[0];
  const budgetRecommendation = priorityRow
    ? priorityRow.status === "over_limit"
      ? `${priorityRow.categoryName} đã vượt hạn mức. Điều chỉnh mức riêng tháng này hoặc giảm các giao dịch sắp tới trước khi mở rộng nhóm khác.`
      : priorityRow.status === "near_limit"
        ? `${priorityRow.categoryName} đang tiến gần hạn mức. Kiểm tra lại mức tháng này trước khi chi thêm.`
        : `${priorityRow.categoryName} chưa có hạn mức. Đặt một mức tối thiểu để MoneyMind có đường chuẩn khi nhắc bạn.`
    : "Các hạn mức đang ổn. Duy trì nhịp này và chỉ tinh chỉnh khi thói quen chi tiêu thật sự đổi.";

  async function submitBudget(values: BudgetFormValues) {
    if (!editing) {
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/budgets", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          categoryId: editing.row.categoryId,
          scope: editing.scope,
          ...(editing.scope === "month" ? { month: selectedMonth.key } : {}),
          amount: values.amount,
        }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as
          | { error?: string }
          | null;
        throw new Error(payload?.error ?? "Không thể lưu hạn mức.");
      }

      setEditing(null);
      router.refresh();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Không thể lưu hạn mức.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function deleteBudget(row: CategoryBudgetRow, scope: "default" | "month") {
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/budgets", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          categoryId: row.categoryId,
          scope,
          ...(scope === "month" ? { month: selectedMonth.key } : {}),
        }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as
          | { error?: string }
          | null;
        throw new Error(payload?.error ?? "Không thể xóa hạn mức.");
      }

      router.refresh();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Không thể xóa hạn mức.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <CoachPageShell>
      <CoachHero
        eyebrow="Plan Tuner"
        title="Điều chỉnh hạn mức theo rủi ro thật"
        description="Trang ngân sách trở thành nơi MoneyMind chỉ ra danh mục cần quyết định tiếp theo, thay vì bắt bạn tự đọc toàn bộ bảng hạn mức."
        recommendation={budgetRecommendation}
        evidence={[
          {
            label: "Ưu tiên xử lý",
            value: priorityRow?.categoryName ?? "Không có",
            helper:
              priorityRow?.status === "over_limit"
                ? "Đã vượt hạn mức"
                : priorityRow?.status === "near_limit"
                  ? "Gần vượt hạn mức"
                  : priorityRow
                    ? "Chưa có hạn mức"
                    : "Tất cả đang ổn",
          },
          {
            label: "Tháng đang xem",
            value: selectedMonth.label,
            helper: `${initialData.rows.length} danh mục`,
          },
        ]}
      />

      <CoachMetricStrip
        metrics={[
          {
            label: "Tổng hạn mức",
            value: formatVnd(initialData.summary.totalBudget),
            helper: "Đường chuẩn tháng này",
          },
          {
            label: "Mức đã dùng",
            value: formatVnd(initialData.summary.totalSpent),
            helper: "Tổng chi đã ghi nhận",
            tone: "negative",
          },
          {
            label: initialData.summary.remaining < 0 ? "Đã vượt" : "Còn lại",
            value: formatVnd(Math.abs(initialData.summary.remaining)),
            helper: "Khoảng đệm còn lại",
            tone: initialData.summary.remaining < 0 ? "negative" : "positive",
          },
          {
            label: "Nhóm rủi ro",
            value: `${overLimitRows.length + nearLimitRows.length}`,
            helper: "Đã vượt hoặc gần vượt",
            tone:
              overLimitRows.length + nearLimitRows.length > 0
                ? "negative"
                : "positive",
          },
        ]}
      />

      <section className="space-y-5">
        <div className="flex flex-col gap-4 rounded-xl border border-[#DCD7CC] bg-[#FFFDF7]/90 p-5 shadow-[0_14px_48px_rgba(47,42,31,0.055)] md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">
              {selectedMonth.label}
            </p>
            <h2 className="mt-1 text-2xl font-bold text-foreground">
              Hạn mức tháng này
            </h2>
          </div>
          <nav aria-label="Điều hướng tháng ngân sách" className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              className="border-[#DDD8CE]"
              aria-label="Xem ngân sách tháng trước"
              onClick={() =>
                router.push(`/budgets?month=${selectedMonth.previousKey}`)
              }
            >
              <ChevronLeft className="size-4" />
              Tháng trước
            </Button>
            <Button
              type="button"
              variant="outline"
              className="border-[#DDD8CE]"
              aria-label="Xem ngân sách tháng sau"
              onClick={() =>
                router.push(`/budgets?month=${selectedMonth.nextKey}`)
              }
            >
              Tháng sau
              <ChevronRight className="size-4" />
            </Button>
          </nav>
        </div>

      {error ? (
        <p className="rounded-lg border border-[#E5B8A7] bg-[#F9E8E1] px-4 py-3 text-sm text-[#A2482D]">
          {error}
        </p>
      ) : null}

      <WorkbenchCard
        title="Bảng hạn mức hành động"
        description="Giữ dữ liệu gốc ở đây, nhưng ưu tiên xử lý các danh mục có tín hiệu rủi ro trước."
      >
        <div className="overflow-hidden rounded-xl border border-[#DCD7CC] bg-[#FFFDF7]/92">
          <div className="hidden grid-cols-[1.2fr_1fr_1fr_1fr_0.8fr] gap-3 border-b border-[#E8E1D6] bg-[#F7F3EA] px-4 py-3 text-xs font-semibold tracking-[0.08em] text-muted-foreground md:grid">
            <span>Danh mục</span>
            <span>Ngân sách</span>
            <span>Đã chi</span>
            <span>Còn lại</span>
            <span className="text-right">Thao tác</span>
          </div>
          {initialData.rows.length > 0 ? (
            initialData.rows.map((row) => (
              <BudgetRow
                key={row.categoryId}
                row={row}
                isSubmitting={isSubmitting}
                onEdit={setEditing}
                onDelete={deleteBudget}
              />
            ))
          ) : (
            <div className="p-5">
              <CoachEmptyState
                title="Chưa có danh mục để đặt hạn mức"
                description="Tạo danh mục chi tiêu trước, sau đó quay lại đây để MoneyMind giúp bạn đặt giới hạn theo từng nhóm."
              />
            </div>
          )}
        </div>
      </WorkbenchCard>

      {editing ? (
        <BudgetEditDialog
          key={`${editing.row.categoryId}-${editing.scope}`}
          editing={editing}
          selectedMonth={selectedMonth}
          isSubmitting={isSubmitting}
          onClose={() => setEditing(null)}
          onScopeChange={(scope) => setEditing({ ...editing, scope })}
          onSubmit={submitBudget}
        />
      ) : null}
      </section>
    </CoachPageShell>
  );
}

function getBudgetAmountDefaultValue(editing: Exclude<EditingState, null>) {
  return String(
    editing.scope === "month"
      ? (editing.row.monthAmount ?? editing.row.effectiveAmount ?? "")
      : (editing.row.defaultAmount ?? ""),
  );
}

function BudgetEditDialog({
  editing,
  selectedMonth,
  isSubmitting,
  onClose,
  onScopeChange,
  onSubmit,
}: {
  editing: Exclude<EditingState, null>;
  selectedMonth: DashboardMonth;
  isSubmitting: boolean;
  onClose: () => void;
  onScopeChange: (scope: "default" | "month") => void;
  onSubmit: (values: BudgetFormValues) => void;
}) {
  const form = useForm<BudgetFormValues>({
    resolver: createZodResolver(budgetFormSchema),
    defaultValues: {
      amount: getBudgetAmountDefaultValue(editing),
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
        aria-labelledby="budget-edit-dialog-title"
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
              {editing.scope === "month"
                ? `Áp dụng riêng cho ${selectedMonth.label}`
                : "Áp dụng cho các tháng sau"}
            </p>
            <DialogTitle className="sr-only">Sửa hạn mức</DialogTitle>
            <h3
              id="budget-edit-dialog-title"
              className="mt-1 text-xl font-semibold text-foreground"
            >
              {editing.row.categoryName}
            </h3>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-2 rounded-xl border border-[#DDD8CE] bg-white p-1">
            <Button
              type="button"
              variant={editing.scope === "month" ? "default" : "ghost"}
              aria-label="Sửa hạn mức tháng này"
              onClick={() => onScopeChange("month")}
            >
              Chỉ tháng này
            </Button>
            <Button
              type="button"
              variant={editing.scope === "default" ? "default" : "ghost"}
              aria-label="Sửa hạn mức mặc định"
              onClick={() => onScopeChange("default")}
            >
              Mặc định hằng tháng
            </Button>
          </div>
          <FormField
            control={form.control}
            name="amount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Số tiền hạn mức</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    autoFocus
                    className={DIALOG_CONTROL_CLASS_NAME}
                    placeholder="Ví dụ: 3tr"
                  />
                </FormControl>
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
              aria-label="Lưu hạn mức"
              disabled={isSubmitting}
            >
              Lưu hạn mức
            </Button>
          </div>
        </form>
      </Form>
      </DialogContent>
    </Dialog>
  );
}

function BudgetRow({
  row,
  isSubmitting,
  onEdit,
  onDelete,
}: {
  row: CategoryBudgetRow;
  isSubmitting: boolean;
  onEdit: (editing: Exclude<EditingState, null>) => void;
  onDelete: (row: CategoryBudgetRow, scope: "default" | "month") => void;
}) {
  return (
    <div className="grid grid-cols-[1.2fr_1fr_1fr_1fr_0.8fr] items-center gap-3 border-b border-[#E8E1D6] px-4 py-4 text-sm last:border-b-0">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span
            aria-hidden="true"
            className="size-2.5 rounded-full"
            style={{ backgroundColor: row.categoryColor ?? "#B9A98C" }}
          />
          <p className="truncate font-medium text-foreground">
            {row.categoryName}
          </p>
        </div>
        <Badge
          variant="outline"
          className={cn(
            "mt-2 h-auto rounded-full px-2 py-0.5 text-xs font-medium",
            statusTone(row.status),
          )}
        >
          {statusLabels[row.status]}
        </Badge>
      </div>
      <div>
        <p className="font-medium text-foreground">
          {formatOptionalAmount(row.effectiveAmount)}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Hằng tháng: {formatOptionalAmount(row.defaultAmount)}
        </p>
      </div>
      <div>
        <p className="font-medium text-foreground">{formatVnd(row.spentAmount)}</p>
        <p className="mt-1 text-xs text-muted-foreground">
          {row.progressPercentage === null
            ? "Chưa có tỷ lệ"
            : `${row.progressPercentage}%`}
        </p>
      </div>
      <p
        className={cn(
          "font-medium",
          row.remainingAmount !== null && row.remainingAmount < 0
            ? "text-[#A2482D]"
            : "text-foreground",
        )}
      >
        {remainingLabel(row)}
      </p>
      <div className="flex justify-end gap-1">
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="border-[#DDD8CE]"
          aria-label={`Sửa hạn mức cho ${row.categoryName}`}
          onClick={() => onEdit({ row, scope: "month" })}
        >
          <Pencil className="size-4" />
        </Button>
        {row.monthAmount !== null ? (
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="border-[#DDD8CE]"
            aria-label={`Xóa hạn mức riêng của tháng này cho ${row.categoryName}`}
            disabled={isSubmitting}
            onClick={() => onDelete(row, "month")}
          >
            <Trash2 className="size-4" />
          </Button>
        ) : null}
        {row.defaultAmount !== null ? (
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="border-[#DDD8CE]"
            aria-label={`Xóa hạn mức mặc định cho ${row.categoryName}`}
            disabled={isSubmitting}
            onClick={() => onDelete(row, "default")}
          >
            <Trash2 className="size-4" />
          </Button>
        ) : null}
      </div>
    </div>
  );
}
