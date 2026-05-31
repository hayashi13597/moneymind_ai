"use client";

import {
  BadgeCheck,
  Bot,
  CalendarDays,
  Search,
  Sparkles,
  WalletCards,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { EmptyState, InsightCard, MetricCard } from "@/components/app-ui";
import { FormCombobox } from "@/components/form-combobox";
import { FormDatePicker } from "@/components/form-date-picker";
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

const transactionTypeOptions = [
  { value: "expense", label: "Chi tiêu" },
  { value: "income", label: "Thu nhập" },
];

const transactionTypeFilterOptions = [
  { value: "all", label: "Tất cả" },
  ...transactionTypeOptions,
];

function toDateInputValue(date: Date) {
  return date.toISOString().slice(0, 10);
}

function formatDisplayDate(date: string) {
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(date));
}

function categoryTone(type: "income" | "expense") {
  return type === "income"
    ? "border-[#D8E1D7] bg-[#ECF3ED] text-[#2F6B4F]"
    : "border-[#E7D9D2] bg-[#FBF0EC] text-[#A2482D]";
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
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "income" | "expense">(
    "all",
  );
  const [categoryFilter, setCategoryFilter] = useState("all");

  const matchingCategories = useMemo(
    () =>
      categories.filter((category) => !category.type || category.type === type),
    [categories, type],
  );
  const selectedCategoryId = categoryId || matchingCategories[0]?.id || "";
  const summary = useMemo(() => {
    const income = transactions
      .filter((transaction) => transaction.type === "income")
      .reduce((total, transaction) => total + transaction.amount, 0);
    const expense = transactions
      .filter((transaction) => transaction.type === "expense")
      .reduce((total, transaction) => total + transaction.amount, 0);
    const aiCategorizedCount = transactions.filter(
      (transaction) => transaction.rawInput,
    ).length;
    const topExpenseCategory = transactions
      .filter((transaction) => transaction.type === "expense")
      .reduce<Record<string, { name: string; amount: number }>>(
        (accumulator, transaction) => {
          const current = accumulator[transaction.category.id] ?? {
            name: transaction.category.name,
            amount: 0,
          };
          accumulator[transaction.category.id] = {
            ...current,
            amount: current.amount + transaction.amount,
          };
          return accumulator;
        },
        {},
      );
    const topCategory = Object.values(topExpenseCategory).sort(
      (a, b) => b.amount - a.amount,
    )[0];

    return {
      income,
      expense,
      balance: income - expense,
      aiCategorizedCount,
      topCategory,
    };
  }, [transactions]);
  const filteredTransactions = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return transactions.filter((transaction) => {
      const matchesType =
        typeFilter === "all" || transaction.type === typeFilter;
      const matchesCategory =
        categoryFilter === "all" || transaction.category.id === categoryFilter;
      const haystack = [
        transaction.note,
        transaction.merchant ?? "",
        transaction.rawInput ?? "",
        transaction.category.name,
      ]
        .join(" ")
        .toLowerCase();
      const matchesQuery =
        !normalizedQuery || haystack.includes(normalizedQuery);

      return matchesType && matchesCategory && matchesQuery;
    });
  }, [categoryFilter, query, transactions, typeFilter]);

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
    <div className="space-y-8">
      <div className="grid gap-3 md:grid-cols-4">
        <MetricCard
          label="Dòng tiền ròng"
          value={formatVnd(summary.balance)}
          helper={`${transactions.length} giao dịch đã ghi nhận`}
          tone={summary.balance >= 0 ? "positive" : "negative"}
        />
        <MetricCard
          label="Thu nhập"
          value={formatVnd(summary.income)}
          helper="Tổng tiền vào trong danh sách hiện tại"
          tone="positive"
        />
        <MetricCard
          label="Chi tiêu"
          value={formatVnd(summary.expense)}
          helper={
            summary.topCategory
              ? `Lớn nhất: ${summary.topCategory.name}`
              : "Chưa có danh mục chi tiêu nổi bật"
          }
          tone="negative"
        />
        <MetricCard
          label="AI đã hỗ trợ"
          value={`${summary.aiCategorizedCount}`}
          helper="Giao dịch có dữ liệu nhập thô để AI học cách phân loại"
          tone="positive"
        />
      </div>

      <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
        <InsightCard
          title="Thêm giao dịch nhanh"
          description="Nhập mô tả tự nhiên như 'ăn trưa 55k hôm nay'. MoneyMind AI sẽ điền số tiền, ngày và danh mục để bạn kiểm tra trước khi lưu."
        >
          <form id="transaction-form" action={createTransaction} className="space-y-5">
            <div className="rounded-2xl border border-[#D8E1D7] bg-white/70 p-4">
              <label
                className="text-sm font-medium text-foreground"
                htmlFor="rawInput"
              >
                Mô tả nhanh cho AI
              </label>
              <div className="mt-2 grid gap-2 sm:grid-cols-[1fr_auto]">
                <input
                  id="rawInput"
                  name="rawInput"
                  value={rawInput}
                  onChange={(event) => setRawInput(event.target.value)}
                  placeholder="Ví dụ: cà phê Highlands 45k sáng nay"
                  className="h-11 rounded-xl border border-[#DCD7CC] bg-[#FDFCF8] px-3 text-sm outline-none transition-colors focus:border-[#2F6B4F] focus:ring-3 focus:ring-[#2F6B4F]/15"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={parseRawInput}
                  disabled={aiPending}
                  className="h-11 border-[#D8E1D7] bg-white"
                >
                  <Sparkles className="size-4" />
                  {aiPending ? "Đang đọc" : "AI điền giúp"}
                </Button>
              </div>
              <p className="mt-2 text-xs leading-5 text-muted-foreground">
                AI chỉ chuẩn bị bản nháp. Bạn vẫn kiểm soát danh mục, số tiền và
                ngày trước khi lưu.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="space-y-2 text-sm font-medium">
                <span>Loại giao dịch</span>
                <FormCombobox
                  name="type"
                  value={type}
                  options={transactionTypeOptions}
                  onValueChange={(nextType) => {
                    setType(nextType as typeof type);
                    setCategoryId("");
                  }}
                  aria-label="Loại giao dịch"
                  required
                />
              </label>
              <label className="space-y-2 text-sm font-medium">
                <span>Số tiền</span>
                <input
                  name="amount"
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  placeholder="55k hoặc 1tr2"
                  className="h-10 w-full rounded-xl border border-[#DCD7CC] bg-[#FDFCF8] px-3 text-sm outline-none transition-colors focus:border-[#2F6B4F] focus:ring-3 focus:ring-[#2F6B4F]/15"
                  required
                />
              </label>
              <label className="space-y-2 text-sm font-medium">
                <span>Danh mục</span>
                <FormCombobox
                  name="categoryId"
                  value={selectedCategoryId}
                  options={matchingCategories.map((category) => ({
                    value: category.id,
                    label: category.name,
                  }))}
                  onValueChange={setCategoryId}
                  aria-label="Danh mục"
                  required
                />
              </label>
              <label className="space-y-2 text-sm font-medium">
                <span>Ngày</span>
                <FormDatePicker
                  name="transactionDate"
                  value={transactionDate}
                  onValueChange={setTransactionDate}
                  aria-label="Chọn ngày giao dịch"
                  required
                />
              </label>
              <label className="space-y-2 text-sm font-medium sm:col-span-2">
                <span>Ghi chú</span>
                <input
                  name="note"
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  placeholder="Ví dụ: Ăn trưa với đồng nghiệp"
                  className="h-10 w-full rounded-xl border border-[#DCD7CC] bg-[#FDFCF8] px-3 text-sm outline-none transition-colors focus:border-[#2F6B4F] focus:ring-3 focus:ring-[#2F6B4F]/15"
                  required
                />
              </label>
              <label className="space-y-2 text-sm font-medium sm:col-span-2">
                <span>Người bán</span>
                <input
                  name="merchant"
                  value={merchant}
                  onChange={(event) => setMerchant(event.target.value)}
                  placeholder="Tùy chọn"
                  className="h-10 w-full rounded-xl border border-[#DCD7CC] bg-[#FDFCF8] px-3 text-sm outline-none transition-colors focus:border-[#2F6B4F] focus:ring-3 focus:ring-[#2F6B4F]/15"
                />
              </label>
            </div>

            {error ? (
              <p className="rounded-xl border border-destructive/25 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </p>
            ) : null}

            <Button
              type="submit"
              disabled={pending}
              className="h-11 w-full bg-[#2F6B4F] hover:bg-[#285B43]"
            >
              <WalletCards className="size-4" />
              {pending ? "Đang lưu..." : "Lưu giao dịch"}
            </Button>
          </form>
        </InsightCard>

        <section className="rounded-2xl border border-[#E1DDD4] bg-card p-5 md:p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <h2 className="text-lg font-semibold">Activity feed tài chính</h2>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                Lọc nhanh theo loại, danh mục hoặc nội dung để kiểm tra nhịp
                chi tiêu.
              </p>
            </div>
            <span className="inline-flex w-fit items-center gap-2 rounded-full border border-[#D8E1D7] bg-[#ECF3ED] px-3 py-1 text-xs font-medium text-[#2F6B4F]">
              <Bot className="size-3.5" />
              AI auto-categorized khi có mô tả thô
            </span>
          </div>

          <div
            className="mt-5 grid gap-2 lg:grid-cols-[1fr_140px_180px]"
            suppressHydrationWarning
          >
            <label className="relative">
              <span className="sr-only">Tìm giao dịch</span>
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Tìm ghi chú, người bán, danh mục..."
                className="h-10 w-full rounded-xl border border-[#DCD7CC] bg-[#FDFCF8] pl-9 pr-3 text-sm outline-none transition-colors focus:border-[#2F6B4F] focus:ring-3 focus:ring-[#2F6B4F]/15"
              />
            </label>
            <FormCombobox
              value={typeFilter}
              options={transactionTypeFilterOptions}
              onValueChange={(nextType) =>
                setTypeFilter(nextType as typeof typeFilter)
              }
              aria-label="Lọc theo loại"
            />
            <FormCombobox
              value={categoryFilter}
              options={[
                { value: "all", label: "Mọi danh mục" },
                ...categories.map((category) => ({
                  value: category.id,
                  label: category.name,
                })),
              ]}
              onValueChange={setCategoryFilter}
              aria-label="Lọc theo danh mục"
            />
          </div>

          <div className="mt-5 divide-y divide-[#E8E4DC]">
            {filteredTransactions.map((transaction) => (
              <article
                key={transaction.id}
                className="grid gap-3 py-4 first:pt-0 last:pb-0 sm:grid-cols-[1fr_auto] sm:items-center"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-sm font-semibold">
                      {transaction.note}
                    </p>
                    <span
                      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${categoryTone(
                        transaction.type,
                      )}`}
                    >
                      {transaction.category.name}
                    </span>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <CalendarDays className="size-3" />
                      {formatDisplayDate(transaction.transactionDate)}
                    </span>
                    {transaction.merchant ? <span>{transaction.merchant}</span> : null}
                    {transaction.rawInput ? (
                      <span className="inline-flex items-center gap-1 text-[#2F6B4F]">
                        <BadgeCheck className="size-3" />
                        AI auto-categorized
                      </span>
                    ) : (
                      <span>Thủ công</span>
                    )}
                  </div>
                  {transaction.rawInput ? (
                    <p className="mt-2 line-clamp-2 text-xs leading-5 text-muted-foreground">
                      Nhập thô: {transaction.rawInput}
                    </p>
                  ) : null}
                </div>
                <div className="flex items-center justify-between gap-3 sm:flex-col sm:items-end">
                  <span
                    className={
                      transaction.type === "income"
                        ? "text-base font-semibold text-[#2F6B4F]"
                        : "text-base font-semibold text-[#A2482D]"
                    }
                  >
                    {transaction.type === "income" ? "+" : "-"}
                    {formatVnd(transaction.amount)}
                  </span>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => editTransaction(transaction)}
                      className="border-[#DDD8CE]"
                    >
                      Sửa
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => deleteTransactionById(transaction)}
                      className="border-[#DDD8CE]"
                    >
                      Xóa
                    </Button>
                  </div>
                </div>
              </article>
            ))}
          </div>

          {transactions.length === 0 ? (
            <div className="mt-5">
              <EmptyState
                title="Chưa có giao dịch."
                description="Bắt đầu bằng cách thêm giao dịch đầu tiên. MoneyMind AI sẽ học thói quen chi tiêu của bạn."
              />
            </div>
          ) : null}

          {transactions.length > 0 && filteredTransactions.length === 0 ? (
            <p className="mt-5 rounded-xl border border-dashed border-[#DCD7CC] p-4 text-sm text-muted-foreground">
              Không tìm thấy giao dịch phù hợp với bộ lọc hiện tại.
            </p>
          ) : null}
        </section>
      </div>
    </div>
  );
}
