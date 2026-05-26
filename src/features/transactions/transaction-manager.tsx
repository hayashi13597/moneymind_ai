"use client";

import { useMemo, useState } from "react";

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

function toDateInputValue(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function TransactionManager({
  initialTransactions,
  categories,
}: TransactionManagerProps) {
  const [transactions, setTransactions] = useState(initialTransactions);
  const [type, setType] = useState<"income" | "expense">("expense");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  const matchingCategories = useMemo(
    () => categories.filter((category) => !category.type || category.type === type),
    [categories, type],
  );

  async function refreshTransactions() {
    const response = await fetch("/api/transactions");

    if (!response.ok) {
      setError(await readJsonError(response));
      return;
    }

    const payload = (await response.json()) as { transactions: Transaction[] };
    setTransactions(
      payload.transactions.map((transaction) => ({
        ...transaction,
        transactionDate: new Date(transaction.transactionDate).toISOString(),
      })),
    );
  }

  async function createTransaction(formData: FormData) {
    setPending(true);
    setError("");

    const response = await fetch("/api/transactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type,
        amount: String(formData.get("amount") ?? ""),
        categoryId: String(formData.get("categoryId") ?? ""),
        note: String(formData.get("note") ?? ""),
        merchant: String(formData.get("merchant") ?? ""),
        rawInput: String(formData.get("rawInput") ?? ""),
        transactionDate: String(formData.get("transactionDate") ?? ""),
      }),
    });

    if (!response.ok) {
      setError(await readJsonError(response));
      setPending(false);
      return;
    }

    const form = document.getElementById(
      "transaction-form",
    ) as HTMLFormElement | null;
    form?.reset();
    await refreshTransactions();
    setPending(false);
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

    const response = await fetch(`/api/transactions/${transaction.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        note: nextNote,
        amount: nextAmount,
      }),
    });

    if (!response.ok) {
      setError(await readJsonError(response));
      return;
    }

    await refreshTransactions();
  }

  async function deleteTransactionById(transaction: Transaction) {
    const confirmed = window.confirm(`Xóa giao dịch "${transaction.note}"?`);

    if (!confirmed) {
      return;
    }

    setError("");

    const response = await fetch(`/api/transactions/${transaction.id}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      setError(await readJsonError(response));
      return;
    }

    await refreshTransactions();
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
          onChange={(event) => setType(event.target.value as typeof type)}
          className="h-9 rounded-md border bg-background px-3 text-sm"
        >
          <option value="expense">Chi tiêu</option>
          <option value="income">Thu nhập</option>
        </select>
        <input
          name="amount"
          placeholder="55k"
          className="h-9 rounded-md border bg-background px-3 text-sm"
          required
        />
        <select
          name="categoryId"
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
          defaultValue={toDateInputValue(new Date())}
          className="h-9 rounded-md border bg-background px-3 text-sm"
          required
        />
        <input
          name="note"
          placeholder="Ghi chú"
          className="h-9 rounded-md border bg-background px-3 text-sm"
          required
        />
        <Button type="submit" disabled={pending}>
          Thêm
        </Button>
        <input
          name="merchant"
          placeholder="Người bán"
          className="h-9 rounded-md border bg-background px-3 text-sm lg:col-span-2"
        />
        <input
          name="rawInput"
          placeholder="Nhập thô, ví dụ: ăn trưa 55k"
          className="h-9 rounded-md border bg-background px-3 text-sm lg:col-span-4"
        />
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
