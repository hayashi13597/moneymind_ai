"use client";

import { ChevronLeft, ChevronRight, Pencil, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";

import { Button } from "@/components/ui/button";
import type { DashboardMonth } from "@/features/dashboard/month";
import { formatVnd } from "@/lib/money";
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
  return value === null ? "Chưa đặt" : formatVnd(value);
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
  const amountInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) {
      amountInputRef.current?.focus();
    }
  }, [editing]);

  function closeDialogOnEscape(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") {
      setEditing(null);
    }
  }

  async function submitBudget(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!editing) {
      return;
    }

    const formData = new FormData(event.currentTarget);
    const amount = String(formData.get("amount") ?? "").trim();

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
          amount,
        }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as
          | { error?: string }
          | null;
        throw new Error(payload?.error ?? "Không thể lưu ngân sách.");
      }

      setEditing(null);
      router.refresh();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Không thể lưu ngân sách.",
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
        throw new Error(payload?.error ?? "Không thể xóa ngân sách.");
      }

      router.refresh();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Không thể xóa ngân sách.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="space-y-5">
      <div className="flex flex-col gap-4 rounded-2xl border border-[#DCD7CC] bg-[#FDFCF8] p-5 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">
            {selectedMonth.label}
          </p>
          <h2 className="mt-1 text-2xl font-semibold text-foreground">
            Bảng ngân sách tháng
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
            onClick={() => router.push(`/budgets?month=${selectedMonth.nextKey}`)}
          >
            Tháng sau
            <ChevronRight className="size-4" />
          </Button>
        </nav>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        <SummaryCard
          label="Tổng ngân sách"
          value={formatVnd(initialData.summary.totalBudget)}
        />
        <SummaryCard
          label="Đã chi"
          value={formatVnd(initialData.summary.totalSpent)}
        />
        <SummaryCard
          label={initialData.summary.remaining < 0 ? "Đã vượt" : "Còn lại"}
          value={formatVnd(Math.abs(initialData.summary.remaining))}
        />
        <SummaryCard
          label="Vượt từng danh mục"
          value={formatVnd(initialData.summary.overAmount)}
        />
      </div>

      {error ? (
        <p className="rounded-lg border border-[#E5B8A7] bg-[#F9E8E1] px-4 py-3 text-sm text-[#A2482D]">
          {error}
        </p>
      ) : null}

      <div className="overflow-hidden rounded-2xl border border-[#DCD7CC] bg-[#FDFCF8]">
        <div className="grid grid-cols-[1.2fr_1fr_1fr_1fr_0.8fr] gap-3 border-b border-[#E8E1D6] px-4 py-3 text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
          <span>Danh mục</span>
          <span>Ngân sách</span>
          <span>Đã chi</span>
          <span>Còn lại</span>
          <span className="text-right">Thao tác</span>
        </div>
        {initialData.rows.map((row) => (
          <BudgetRow
            key={row.categoryId}
            row={row}
            isSubmitting={isSubmitting}
            onEdit={setEditing}
            onDelete={deleteBudget}
          />
        ))}
      </div>

      {editing ? (
        <div
          aria-modal="true"
          aria-labelledby="budget-edit-dialog-title"
          onKeyDown={closeDialogOnEscape}
          role="dialog"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4"
        >
          <form
            onSubmit={submitBudget}
            className="w-full max-w-md space-y-4 rounded-2xl border border-[#DCD7CC] bg-[#FDFCF8] p-5 shadow-[0_24px_80px_rgba(47,42,31,0.18)]"
          >
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                {editing.scope === "month"
                  ? `Riêng ${selectedMonth.label}`
                  : "Mặc định hằng tháng"}
              </p>
              <h3
                id="budget-edit-dialog-title"
                className="mt-1 text-xl font-semibold text-foreground"
              >
                {editing.row.categoryName}
              </h3>
            </div>
            <div className="grid grid-cols-2 gap-2 rounded-xl border border-[#DDD8CE] bg-white p-1">
              <Button
                type="button"
                variant={editing.scope === "month" ? "default" : "ghost"}
                aria-label="Sửa ngân sách tháng này"
                onClick={() => setEditing({ ...editing, scope: "month" })}
              >
                Riêng tháng này
              </Button>
              <Button
                type="button"
                variant={editing.scope === "default" ? "default" : "ghost"}
                aria-label="Sửa ngân sách mặc định"
                onClick={() => setEditing({ ...editing, scope: "default" })}
              >
                Mặc định
              </Button>
            </div>
            <label className="block space-y-2 text-sm font-medium text-foreground">
              <span>Số tiền ngân sách</span>
              <input
                key={`${editing.row.categoryId}-${editing.scope}`}
                ref={amountInputRef}
                name="amount"
                defaultValue={
                  editing.scope === "month"
                    ? (editing.row.monthAmount ?? editing.row.effectiveAmount ?? "")
                    : (editing.row.defaultAmount ?? "")
                }
                className="w-full rounded-lg border border-[#DDD8CE] bg-white px-3 py-2 text-sm outline-none focus:border-[#2F6B4F]"
                placeholder="Ví dụ: 3tr"
              />
            </label>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                className="border-[#DDD8CE]"
                onClick={() => setEditing(null)}
              >
                Hủy
              </Button>
              <Button
                type="submit"
                aria-label="Lưu ngân sách"
                disabled={isSubmitting}
              >
                Lưu ngân sách
              </Button>
            </div>
          </form>
        </div>
      ) : null}
    </section>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[#DCD7CC] bg-[#FDFCF8] p-4">
      <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-2 text-xl font-semibold text-foreground">{value}</p>
    </div>
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
        <span
          className={cn(
            "mt-2 inline-flex rounded-full border px-2 py-0.5 text-xs font-medium",
            statusTone(row.status),
          )}
        >
          {statusLabels[row.status]}
        </span>
      </div>
      <div>
        <p className="font-medium text-foreground">
          {formatOptionalAmount(row.effectiveAmount)}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Mặc định: {formatOptionalAmount(row.defaultAmount)}
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
          aria-label={`Sửa ngân sách cho ${row.categoryName}`}
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
            aria-label={`Xóa override tháng này cho ${row.categoryName}`}
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
            aria-label={`Xóa ngân sách mặc định cho ${row.categoryName}`}
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
