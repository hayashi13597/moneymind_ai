"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import type { AiChatTransactionDraft } from "@/features/ai-chat/schemas";

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

async function readJsonError(response: Response) {
  const payload = (await response.json().catch(() => null)) as {
    error?: string;
  } | null;

  return payload?.error ?? "Không thể lưu giao dịch.";
}

export function AiChatTransactionReviewModal({
  draft,
  categories,
  onClose,
  onSaved,
}: AiChatTransactionReviewModalProps) {
  const [type, setType] = useState<"income" | "expense">(
    draft?.type ?? "expense",
  );
  const [amount, setAmount] = useState(draft ? String(draft.amount) : "");
  const [categoryId, setCategoryId] = useState(draft?.categoryId ?? "");
  const [transactionDate, setTransactionDate] = useState(
    draft?.transactionDate ?? new Date().toISOString().slice(0, 10),
  );
  const [note, setNote] = useState(draft?.note ?? "");
  const [merchant, setMerchant] = useState(draft?.merchant ?? "");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  const matchingCategories = useMemo(
    () =>
      categories.filter((category) => !category.type || category.type === type),
    [categories, type],
  );
  const selectedCategoryId = categoryId || matchingCategories[0]?.id || "";

  if (!draft) {
    return null;
  }

  async function saveDraft() {
    if (!draft) {
      return;
    }

    setPending(true);
    setError("");

    try {
      const response = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          amount,
          categoryId: selectedCategoryId,
          note,
          merchant,
          rawInput: draft.rawInput,
          transactionDate,
        }),
      });

      if (!response.ok) {
        const message = await readJsonError(response);
        setError(message);
        toast.error(message);
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
          {error ? (
            <p className="text-sm text-destructive sm:col-span-2">{error}</p>
          ) : null}
          <div className="flex justify-end gap-2 sm:col-span-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Hủy
            </Button>
            <Button type="submit" disabled={pending}>
              Lưu giao dịch
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
