"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import type { AiChatTransactionDraft } from "@/features/ai-chat/schemas";
import { createTransactionAction } from "@/features/transactions/actions";

type Category = {
  id: string;
  name: string;
  type: "income" | "expense" | null;
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

function AiChatTransactionReviewForm({
  draft,
  categories,
  onClose,
  onSaved,
}: AiChatTransactionReviewFormProps) {
  const [type, setType] = useState<"income" | "expense">(
    draft.type,
  );
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
      <div className="w-full max-w-2xl rounded-lg border bg-card p-4 shadow-lg">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold">Giao dịch nháp</h2>
            <p className="text-sm text-muted-foreground">
              Kiểm tra và chỉnh lại trước khi lưu.
            </p>
          </div>
          <Button type="button" variant="outline" onClick={onClose}>
            Đóng
          </Button>
        </div>
        <form action={saveDraft} className="grid gap-3 sm:grid-cols-2">
          <select
            value={type}
            onChange={(event) => {
              setType(event.target.value as typeof type);
              setCategoryId("");
            }}
            className="h-9 rounded-md border bg-background px-3 text-sm"
          >
            <option value="expense">Chi tiêu</option>
            <option value="income">Thu nhập</option>
          </select>
          <input
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            className="h-9 rounded-md border bg-background px-3 text-sm"
            required
          />
          <select
            value={selectedCategoryId}
            onChange={(event) => setCategoryId(event.target.value)}
            className="h-9 rounded-md border bg-background px-3 text-sm"
            disabled={!hasMatchingCategories}
            required
          >
            {matchingCategories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
          <input
            type="date"
            value={transactionDate}
            onChange={(event) => setTransactionDate(event.target.value)}
            className="h-9 rounded-md border bg-background px-3 text-sm"
            required
          />
          <input
            value={merchant}
            onChange={(event) => setMerchant(event.target.value)}
            placeholder="Người bán"
            className="h-9 rounded-md border bg-background px-3 text-sm"
          />
          <input
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="Ghi chú"
            className="h-9 rounded-md border bg-background px-3 text-sm"
            required
          />
          {!hasMatchingCategories ? (
            <p className="text-sm text-destructive sm:col-span-2">
              Không có danh mục phù hợp để lưu giao dịch.
            </p>
          ) : null}
          {error ? (
            <p className="text-sm text-destructive sm:col-span-2">{error}</p>
          ) : null}
          <div className="flex justify-end gap-2 sm:col-span-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Hủy
            </Button>
            <Button type="submit" disabled={pending || !hasMatchingCategories}>
              Lưu giao dịch
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
