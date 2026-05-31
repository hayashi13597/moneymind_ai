"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { formatVnd } from "@/lib/money";

type Category = {
  id: string;
  name: string;
  type: "income" | "expense" | null;
};

type Transaction = {
  id: string;
  type: "income" | "expense";
  amount: number;
  note: string;
  merchant: string | null;
  rawInput: string | null;
  transactionDate: string;
  category: Category;
};

type TransactionManagerProps = {
  initialTransactions: Transaction[];
  categories: Category[];
};

async function readJsonError(response: Response) {
  const payload = (await response.json().catch(() => null)) as {
    error?: string;
  } | null;

  return payload?.error ?? "Không thể lưu thay đổi.";
}

const NETWORK_ERROR_MESSAGE = "Không thể kết nối máy chủ.";

function toDateInputValue(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function TransactionManager({
  initialTransactions,
  categories,
}: TransactionManagerProps) {
  const initialTransactionsKey = useMemo(
    () =>
      initialTransactions
        .map(
          (transaction) =>
            `${transaction.id}:${transaction.amount}:${transaction.transactionDate}:${transaction.note}`,
        )
        .join("|"),
    [initialTransactions],
  );
  const [transactionState, setTransactionState] = useState({
    sourceKey: initialTransactionsKey,
    transactions: initialTransactions,
  });
  const transactions =
    transactionState.sourceKey === initialTransactionsKey
      ? transactionState.transactions
      : initialTransactions;
  const [type, setType] = useState<"income" | "expense">("expense");
  const [amount, setAmount] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [transactionDate, setTransactionDate] = useState(
    toDateInputValue(new Date()),
  );
  const [note, setNote] = useState("");
  const [merchant, setMerchant] = useState("");
  const [rawInput, setRawInput] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [aiPending, setAiPending] = useState(false);

  const matchingCategories = useMemo(
    () =>
      categories.filter((category) => !category.type || category.type === type),
    [categories, type],
  );
  const selectedCategoryId = categoryId || matchingCategories[0]?.id || "";

  async function refreshTransactions() {
    try {
      const response = await fetch("/api/transactions");

      if (!response.ok) {
        const message = await readJsonError(response);
        setError(message);
        toast.error(message);
        return false;
      }

      const payload = (await response.json()) as { transactions: Transaction[] };
      setTransactionState({
        sourceKey: initialTransactionsKey,
        transactions: payload.transactions.map((transaction) => ({
          ...transaction,
          transactionDate: new Date(transaction.transactionDate).toISOString(),
        })),
      });
      return true;
    } catch {
      setError(NETWORK_ERROR_MESSAGE);
      toast.error(NETWORK_ERROR_MESSAGE);
      return false;
    }
  }

  async function createTransaction() {
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
          rawInput,
          transactionDate,
        }),
      });

      if (!response.ok) {
        const message = await readJsonError(response);
        setError(message);
        toast.error(message);
        return;
      }

      setAmount("");
      setCategoryId("");
      setTransactionDate(toDateInputValue(new Date()));
      setNote("");
      setMerchant("");
      setRawInput("");
      if (await refreshTransactions()) {
        toast.success("Đã thêm giao dịch.");
      }
    } catch {
      setError(NETWORK_ERROR_MESSAGE);
      toast.error(NETWORK_ERROR_MESSAGE);
    } finally {
      setPending(false);
    }
  }

  async function parseRawInput() {
    if (!rawInput.trim()) {
      const message = "Nhập mô tả giao dịch trước khi dùng AI.";
      setError(message);
      toast.error(message);
      return;
    }

    setAiPending(true);
    setError("");

    try {
      const response = await fetch("/api/ai/parse-transaction", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input: rawInput }),
      });

      if (!response.ok) {
        const message = await readJsonError(response);
        setError(message);
        toast.error(message);
        return;
      }

      const payload = (await response.json()) as {
        draft: {
          type: "income" | "expense";
          amount: number;
          categoryId: string;
          note: string;
          merchant: string | null;
          rawInput: string;
          transactionDate: string;
        };
      };

      setType(payload.draft.type);
      setAmount(String(payload.draft.amount));
      setCategoryId(payload.draft.categoryId);
      setNote(payload.draft.note);
      setMerchant(payload.draft.merchant ?? "");
      setRawInput(payload.draft.rawInput);
      setTransactionDate(payload.draft.transactionDate);
      toast.success("AI đã phân tích giao dịch.");
    } catch {
      setError(NETWORK_ERROR_MESSAGE);
      toast.error(NETWORK_ERROR_MESSAGE);
    } finally {
      setAiPending(false);
    }
  }

  async function editTransaction(transaction: Transaction) {
    const nextNote = window.prompt("Ghi chú", transaction.note);

    if (!nextNote) {
      return;
    }

    const nextAmount = window.prompt("Số tiền", String(transaction.amount));

    if (!nextAmount) {
      return;
    }

    setError("");

    try {
      const response = await fetch(`/api/transactions/${transaction.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          note: nextNote,
          amount: nextAmount,
        }),
      });

      if (!response.ok) {
        const message = await readJsonError(response);
        setError(message);
        toast.error(message);
        return;
      }

      if (await refreshTransactions()) {
        toast.success("Đã cập nhật giao dịch.");
      }
    } catch {
      setError(NETWORK_ERROR_MESSAGE);
      toast.error(NETWORK_ERROR_MESSAGE);
    }
  }

  async function deleteTransactionById(transaction: Transaction) {
    const confirmed = window.confirm(`Xóa giao dịch "${transaction.note}"?`);

    if (!confirmed) {
      return;
    }

    setError("");

    try {
      const response = await fetch(`/api/transactions/${transaction.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const message = await readJsonError(response);
        setError(message);
        toast.error(message);
        return;
      }

      if (await refreshTransactions()) {
        toast.success("Đã xóa giao dịch.");
      }
    } catch {
      setError(NETWORK_ERROR_MESSAGE);
      toast.error(NETWORK_ERROR_MESSAGE);
    }
  }

  return (
    <div className="space-y-6">
      <form
        id="transaction-form"
        action={createTransaction}
        className="grid gap-3 rounded-lg border bg-card p-4 lg:grid-cols-6"
      >
        <select
          name="type"
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
          name="amount"
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          placeholder="55k"
          className="h-9 rounded-md border bg-background px-3 text-sm"
          required
        />
        <select
          name="categoryId"
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
          name="transactionDate"
          type="date"
          value={transactionDate}
          onChange={(event) => setTransactionDate(event.target.value)}
          className="h-9 rounded-md border bg-background px-3 text-sm"
          required
        />
        <input
          name="note"
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder="Ghi chú"
          className="h-9 rounded-md border bg-background px-3 text-sm"
          required
        />
        <Button type="submit" disabled={pending}>
          Thêm
        </Button>
        <input
          name="merchant"
          value={merchant}
          onChange={(event) => setMerchant(event.target.value)}
          placeholder="Người bán"
          className="h-9 rounded-md border bg-background px-3 text-sm lg:col-span-2"
        />
        <input
          name="rawInput"
          value={rawInput}
          onChange={(event) => setRawInput(event.target.value)}
          placeholder="Nhập thô, ví dụ: ăn trưa 55k"
          className="h-9 rounded-md border bg-background px-3 text-sm lg:col-span-3"
        />
        <Button
          type="button"
          variant="outline"
          onClick={parseRawInput}
          disabled={aiPending}
        >
          AI parse
        </Button>
      </form>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <div className="overflow-x-auto rounded-lg border bg-card">
        <div className="min-w-[760px]">
          <div className="grid grid-cols-[1fr_130px_150px_120px_130px] gap-3 border-b px-4 py-2 text-xs font-medium text-muted-foreground">
            <span>Ghi chú</span>
            <span>Danh mục</span>
            <span>Số tiền</span>
            <span>Ngày</span>
            <span />
          </div>
          {transactions.map((transaction) => (
            <div
              key={transaction.id}
              className="grid grid-cols-[1fr_130px_150px_120px_130px] items-center gap-3 border-b px-4 py-3 last:border-b-0"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">
                  {transaction.note}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {transaction.merchant ?? transaction.rawInput ?? ""}
                </p>
              </div>
              <span className="truncate text-sm">
                {transaction.category.name}
              </span>
              <span
                className={
                  transaction.type === "income"
                    ? "text-sm font-medium text-green-600"
                    : "text-sm font-medium text-red-600"
                }
              >
                {transaction.type === "income" ? "+" : "-"}
                {formatVnd(transaction.amount)}
              </span>
              <span className="text-sm text-muted-foreground">
                {toDateInputValue(new Date(transaction.transactionDate))}
              </span>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => editTransaction(transaction)}
                >
                  Sửa
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => deleteTransactionById(transaction)}
                >
                  Xóa
                </Button>
              </div>
            </div>
          ))}
          {transactions.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">
              Chưa có giao dịch.
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
