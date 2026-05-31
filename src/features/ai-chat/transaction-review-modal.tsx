"use client";

import { BadgeCheck, Bot } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { FormCombobox } from "@/components/form-combobox";
import { FormDatePicker } from "@/components/form-date-picker";
import { Button } from "@/components/ui/button";
import type { AiChatTransactionDraft } from "@/features/ai-chat/schemas";
import { createTransactionAction } from "@/features/transactions/actions";

type TransactionType = "income" | "expense";

type Category = {
  id: string;
  name: string;
  type: TransactionType | null;
};

type AiChatTransactionReviewModalProps = {
  draft: AiChatTransactionDraft | null;
  categories: Category[];
  onClose: () => void;
  onSaved: () => void;
};

type AiChatTransactionReviewFormProps = {
  draft: AiChatTransactionDraft;
  categories: Category[];
  onClose: () => void;
  onSaved: () => void;
};

function draftKey(draft: AiChatTransactionDraft) {
  return [
    draft.type,
    draft.amount,
    draft.categoryId,
    draft.transactionDate,
    draft.note,
    draft.merchant ?? "",
    draft.rawInput,
  ].join("|");
}

const transactionTypeOptions: Array<{ value: TransactionType; label: string }> = [
  { value: "expense", label: "Chi tiêu" },
  { value: "income", label: "Thu nhập" },
];

function AiChatTransactionReviewForm({
  draft,
  categories,
  onClose,
  onSaved,
}: AiChatTransactionReviewFormProps) {
  const [type, setType] = useState<TransactionType>(draft.type);
  const [amount, setAmount] = useState(String(draft.amount));
  const [categoryId, setCategoryId] = useState(draft.categoryId);
  const [transactionDate, setTransactionDate] = useState(draft.transactionDate);
  const [note, setNote] = useState(draft.note);
  const [merchant, setMerchant] = useState(draft.merchant ?? "");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  const matchingCategories = useMemo(
    () =>
      categories.filter((category) => !category.type || category.type === type),
    [categories, type],
  );
  const selectedCategoryId =
    matchingCategories.some((category) => category.id === categoryId)
      ? categoryId
      : matchingCategories[0]?.id || "";
  const hasMatchingCategories = matchingCategories.length > 0;

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- Local editable form state must resync when a different AI draft is selected. */
    setType(draft.type);
    setAmount(String(draft.amount));
    setCategoryId(draft.categoryId);
    setTransactionDate(draft.transactionDate);
    setNote(draft.note);
    setMerchant(draft.merchant ?? "");
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [draft]);

  async function saveDraft() {
    if (!hasMatchingCategories || !selectedCategoryId) {
      const message = "Không có danh mục phù hợp để lưu giao dịch.";
      setError(message);
      toast.error(message);
      return;
    }

    setPending(true);
    setError("");

    try {
      const result = await createTransactionAction({
        type,
        amount,
        categoryId: selectedCategoryId,
        note,
        merchant,
        rawInput: draft.rawInput,
        transactionDate,
      });

      if (!result.ok) {
        setError(result.error);
        toast.error(result.error);
        return;
      }

      toast.success("Đã lưu giao dịch.");
      onSaved();
    } catch {
      const message = "Không thể kết nối máy chủ.";
      setError(message);
      toast.error(message);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/35 p-4 sm:items-center sm:justify-center">
      <div className="w-full max-w-2xl overflow-hidden rounded-2xl border border-[#DCD7CC] bg-card shadow-[0_18px_60px_rgba(47,42,31,0.2)]">
        <div className="flex items-start justify-between gap-3 border-b border-[#E8E4DC] bg-[#FDFCF8] p-5">
          <div className="flex items-start gap-3">
            <div className="rounded-full bg-[#2F6B4F] p-2 text-white">
              <Bot className="size-4" />
            </div>
            <div>
              <h2 className="text-base font-semibold">Giao dịch AI nháp</h2>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                Kiểm tra số tiền, danh mục và ngày trước khi lưu vào sổ thu chi.
              </p>
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="border-[#DDD8CE]"
          >
            Đóng
          </Button>
        </div>
        <form action={saveDraft} className="grid gap-4 p-5 sm:grid-cols-2">
          <div className="rounded-2xl border border-[#D8E1D7] bg-[#F3F8F2] p-4 sm:col-span-2">
            <p className="inline-flex items-center gap-2 text-sm font-medium text-[#2F6B4F]">
              <BadgeCheck className="size-4" />
              MoneyMind đã đọc mô tả này
            </p>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {draft.rawInput}
            </p>
          </div>
          <label className="space-y-2 text-sm font-medium">
            <span>Loại</span>
            <FormCombobox
              value={type}
              options={transactionTypeOptions}
              onValueChange={(nextType) => {
                setType(nextType);
                setCategoryId("");
              }}
              aria-label="Loại"
              required
            />
          </label>
          <label className="space-y-2 text-sm font-medium">
            <span>Số tiền</span>
            <input
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              className="h-10 w-full rounded-xl border border-[#DCD7CC] bg-[#FDFCF8] px-3 text-sm outline-none transition-colors focus:border-[#2F6B4F] focus:ring-3 focus:ring-[#2F6B4F]/15"
              required
            />
          </label>
          <label className="space-y-2 text-sm font-medium">
            <span>Danh mục</span>
            <FormCombobox
              value={selectedCategoryId}
              options={matchingCategories.map((category) => ({
                value: category.id,
                label: category.name,
              }))}
              onValueChange={setCategoryId}
              aria-label="Danh mục"
              disabled={!hasMatchingCategories}
              required
            />
          </label>
          <label className="space-y-2 text-sm font-medium">
            <span>Ngày</span>
            <FormDatePicker
              value={transactionDate}
              onValueChange={setTransactionDate}
              aria-label="Chọn ngày"
              required
            />
          </label>
          <label className="space-y-2 text-sm font-medium">
            <span>Người bán</span>
            <input
              value={merchant}
              onChange={(event) => setMerchant(event.target.value)}
              placeholder="Tùy chọn"
              className="h-10 w-full rounded-xl border border-[#DCD7CC] bg-[#FDFCF8] px-3 text-sm outline-none transition-colors focus:border-[#2F6B4F] focus:ring-3 focus:ring-[#2F6B4F]/15"
            />
          </label>
          <label className="space-y-2 text-sm font-medium">
            <span>Ghi chú</span>
            <input
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Ghi chú"
              className="h-10 w-full rounded-xl border border-[#DCD7CC] bg-[#FDFCF8] px-3 text-sm outline-none transition-colors focus:border-[#2F6B4F] focus:ring-3 focus:ring-[#2F6B4F]/15"
              required
            />
          </label>
          {!hasMatchingCategories ? (
            <p className="text-sm text-destructive sm:col-span-2">
              Không có danh mục phù hợp để lưu giao dịch.
            </p>
          ) : null}
          {error ? (
            <p className="text-sm text-destructive sm:col-span-2">{error}</p>
          ) : null}
          <div className="flex justify-end gap-2 sm:col-span-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="border-[#DDD8CE]"
            >
              Hủy
            </Button>
            <Button
              type="submit"
              disabled={pending || !hasMatchingCategories}
              className="bg-[#2F6B4F] hover:bg-[#285B43]"
            >
              {pending ? "Đang lưu..." : "Lưu giao dịch"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function AiChatTransactionReviewModal({
  draft,
  categories,
  onClose,
  onSaved,
}: AiChatTransactionReviewModalProps) {
  if (!draft) {
    return null;
  }

  return (
    <AiChatTransactionReviewForm
      key={draftKey(draft)}
      draft={draft}
      categories={categories}
      onClose={onClose}
      onSaved={onSaved}
    />
  );
}
