"use client";

import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  CircleDollarSign,
  Ellipsis,
  Pencil,
  Search,
  Sparkles,
  WalletCards,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { EmptyState, InsightCard } from "@/components/app-ui";
import { FormCombobox } from "@/components/form-combobox";
import { FormMonthPicker } from "@/components/form-month-picker";
import {
  RhfComboboxControl,
  RhfDatePickerControl,
} from "@/components/form-rhf-controls";
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
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { readLocalAiProviderSetting } from "@/features/ai/local-settings";
import type { DashboardMonth } from "@/features/dashboard/month";
import { formatVnd } from "@/lib/money";
import { createZodResolver } from "@/lib/zod-form";

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
  selectedMonth: DashboardMonth;
  pagination?: TransactionPagination;
};

type TransactionPagination = {
  total: number;
  page: number;
  pageSize: number;
};

type EditingTransaction = {
  id: string;
  type: "income" | "expense";
  amount: string;
  categoryId: string;
  note: string;
  merchant: string;
  rawInput: string;
  transactionDate: string;
};

async function readJsonError(response: Response) {
  const payload = (await response.json().catch(() => null)) as {
    error?: string;
  } | null;

  return payload?.error ?? "Không thể lưu thay đổi.";
}

const NETWORK_ERROR_MESSAGE = "Không thể kết nối máy chủ.";
const FIELD_CLASS_NAME = "space-y-2 text-sm font-medium";
const CONTROL_CLASS_NAME =
  "h-11 w-full rounded-xl border border-[#DCD7CC] bg-[#FDFCF8] px-3 text-sm outline-none transition-colors focus:border-[#2F6B4F] focus:ring-3 focus:ring-[#2F6B4F]/15";
const DIALOG_CONTROL_CLASS_NAME =
  "h-11 w-full rounded-xl border border-[#DCD7CC] bg-white px-3 text-sm outline-none transition-colors focus:border-[#2F6B4F] focus:ring-3 focus:ring-[#2F6B4F]/15";
const transactionFormSchema = z.object({
  type: z.enum(["income", "expense"]),
  amount: z.string().trim().min(1, "Số tiền là bắt buộc."),
  categoryId: z.string().trim().min(1, "Danh mục là bắt buộc."),
  transactionDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Ngày không hợp lệ."),
  note: z.string().trim().min(1, "Ghi chú là bắt buộc."),
  merchant: z.string(),
  rawInput: z.string(),
});

type TransactionFormValues = z.infer<typeof transactionFormSchema>;

const transactionTypeOptions = [
  { value: "expense", label: "Chi tiêu" },
  { value: "income", label: "Thu nhập" },
];

const transactionTypeFilterOptions = [
  { value: "all", label: "Tất cả" },
  ...transactionTypeOptions,
];

const pageSizeOptions = [
  { value: "5", label: "5 / trang" },
  { value: "10", label: "10 / trang" },
  { value: "20", label: "20 / trang" },
];

function toDateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getMonthKeyFromDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");

  return `${year}-${month}`;
}

function getMonthKeyFromDateInput(value: string) {
  return value.slice(0, 7);
}

function getDateInputFromTransaction(value: string) {
  return value.slice(0, 10);
}

function getDefaultTransactionDate(selectedMonthKey: string) {
  const now = new Date();

  if (selectedMonthKey === getMonthKeyFromDate(now)) {
    return toDateInputValue(now);
  }

  return `${selectedMonthKey}-01`;
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

function typeLabel(type: "income" | "expense") {
  return type === "income" ? "Thu nhập" : "Chi tiêu";
}

function transactionCountLabel(count: number) {
  return `${count} giao dịch`;
}

function getPaginationItems(currentPage: number, pageCount: number) {
  const items: Array<number | "ellipsis-left" | "ellipsis-right"> = [];

  for (let page = 1; page <= pageCount; page += 1) {
    const isBoundary = page === 1 || page === pageCount;
    const isNearCurrent = Math.abs(page - currentPage) <= 1;

    if (isBoundary || isNearCurrent) {
      items.push(page);
      continue;
    }

    if (page < currentPage && !items.includes("ellipsis-left")) {
      items.push("ellipsis-left");
    }

    if (page > currentPage && !items.includes("ellipsis-right")) {
      items.push("ellipsis-right");
    }
  }

  return items;
}

export function TransactionManager({
  initialTransactions,
  categories,
  selectedMonth,
  pagination,
}: TransactionManagerProps) {
  const router = useRouter();
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
  const initialPagination = pagination ?? {
    total: transactions.length,
    page: 1,
    pageSize: 5,
  };
  const initialPaginationKey = `${initialPagination.total}:${initialPagination.page}:${initialPagination.pageSize}`;
  const [paginationState, setPaginationState] = useState({
    sourceKey: initialPaginationKey,
    pagination: initialPagination,
  });
  const serverPagination =
    paginationState.sourceKey === initialPaginationKey
      ? paginationState.pagination
      : initialPagination;
  const createForm = useForm<TransactionFormValues>({
    resolver: createZodResolver(transactionFormSchema),
    defaultValues: {
      type: "expense",
      amount: "",
      categoryId:
        categories.find((category) => !category.type || category.type === "expense")
          ?.id ?? "",
      transactionDate: getDefaultTransactionDate(selectedMonth.key),
      note: "",
      merchant: "",
      rawInput: "",
    },
  });
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [aiPending, setAiPending] = useState(false);
  const [editingTransaction, setEditingTransaction] =
    useState<EditingTransaction | null>(null);
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "income" | "expense">(
    "all",
  );
  const [categoryFilter, setCategoryFilter] = useState("all");
  const type = useWatch({ control: createForm.control, name: "type" });
  const categoryId = useWatch({
    control: createForm.control,
    name: "categoryId",
  });
  const rawInput = useWatch({ control: createForm.control, name: "rawInput" });

  const matchingCategories = useMemo(
    () =>
      categories.filter((category) => !category.type || category.type === type),
    [categories, type],
  );
  const selectedCategoryId = categoryId || matchingCategories[0]?.id || "";

  useEffect(() => {
    const currentValues = createForm.getValues();

    if (
      getMonthKeyFromDateInput(currentValues.transactionDate) !==
      selectedMonth.key
    ) {
      createForm.setValue(
        "transactionDate",
        getDefaultTransactionDate(selectedMonth.key),
      );
    }
  }, [createForm, selectedMonth.key]);

  const summary = useMemo(() => {
    const income = transactions
      .filter((transaction) => transaction.type === "income")
      .reduce((total, transaction) => total + transaction.amount, 0);
    const expense = transactions
      .filter((transaction) => transaction.type === "expense")
      .reduce((total, transaction) => total + transaction.amount, 0);
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
  const pageSize = String(serverPagination.pageSize);
  const pageCount = Math.max(
    1,
    Math.ceil(serverPagination.total / serverPagination.pageSize),
  );
  const currentPage = Math.min(serverPagination.page, pageCount);
  const pageStart = (currentPage - 1) * serverPagination.pageSize;
  const visibleTransactions = filteredTransactions;
  const visibleStart =
    serverPagination.total === 0 || visibleTransactions.length === 0
      ? 0
      : pageStart + 1;
  const visibleEnd =
    visibleStart === 0 ? 0 : visibleStart + visibleTransactions.length - 1;
  const currentPageRange =
    visibleStart === 0
      ? "Trang này chưa có giao dịch"
      : `Đang hiển thị ${visibleStart}-${visibleEnd}`;
  const paginationItems = getPaginationItems(currentPage, pageCount);
  const filteredCount = filteredTransactions.length;
  const isFiltered =
    query.trim() !== "" || typeFilter !== "all" || categoryFilter !== "all";

  function openPage(nextPage: number, nextPageSize = serverPagination.pageSize) {
    const searchParams = new URLSearchParams({
      month: selectedMonth.key,
      page: String(nextPage),
      pageSize: String(nextPageSize),
    });

    router.push(`/transactions?${searchParams.toString()}`);
  }

  function openMonth(monthKey: string) {
    setQuery("");
    setTypeFilter("all");
    setCategoryFilter("all");
    const searchParams = new URLSearchParams({
      month: monthKey,
      page: "1",
      pageSize: String(serverPagination.pageSize),
    });

    router.push(`/transactions?${searchParams.toString()}`);
  }

  async function refreshTransactions() {
    try {
      const response = await fetch(
        `/api/transactions?month=${selectedMonth.key}&page=${currentPage}&pageSize=${serverPagination.pageSize}`,
      );

      if (!response.ok) {
        const message = await readJsonError(response);
        setError(message);
        toast.error(message);
        return false;
      }

      const payload = (await response.json()) as {
        transactions: Transaction[];
        pagination: TransactionPagination;
      };
      setTransactionState({
        sourceKey: initialTransactionsKey,
        transactions: payload.transactions.map((transaction) => ({
          ...transaction,
          transactionDate: new Date(transaction.transactionDate).toISOString(),
        })),
      });
      setPaginationState({
        sourceKey: initialPaginationKey,
        pagination: payload.pagination,
      });
      return true;
    } catch {
      setError(NETWORK_ERROR_MESSAGE);
      toast.error(NETWORK_ERROR_MESSAGE);
      return false;
    }
  }

  async function createTransaction(values: TransactionFormValues) {
    setPending(true);
    setError("");

    try {
      const response = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: values.type,
          amount: values.amount,
          categoryId: selectedCategoryId,
          note: values.note,
          merchant: values.merchant,
          rawInput: values.rawInput,
          transactionDate: values.transactionDate,
        }),
      });

      if (!response.ok) {
        const message = await readJsonError(response);
        setError(message);
        toast.error(message);
        return;
      }

      const transactionMonth = getMonthKeyFromDateInput(values.transactionDate);
      const nextCategoryId =
        categories.find((category) => !category.type || category.type === values.type)
          ?.id ?? "";
      createForm.reset({
        type: values.type,
        amount: "",
        categoryId: nextCategoryId,
        transactionDate: getDefaultTransactionDate(selectedMonth.key),
        note: "",
        merchant: "",
        rawInput: "",
      });
      if (transactionMonth !== selectedMonth.key) {
        openMonth(transactionMonth);
        toast.success("Đã thêm giao dịch.");
        return;
      }

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
      const providerSetting = readLocalAiProviderSetting();

      if (!providerSetting) {
        const message = "Bạn cần cấu hình nhà cung cấp AI trước.";
        setError(message);
        toast.error(message);
        return;
      }

      const response = await fetch("/api/ai/parse-transaction", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input: rawInput, providerSetting }),
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

      createForm.reset({
        type: payload.draft.type,
        amount: String(payload.draft.amount),
        categoryId: payload.draft.categoryId,
        note: payload.draft.note,
        merchant: payload.draft.merchant ?? "",
        rawInput: payload.draft.rawInput,
        transactionDate: payload.draft.transactionDate,
      });
      toast.success("AI đã phân tích giao dịch.");
    } catch {
      setError(NETWORK_ERROR_MESSAGE);
      toast.error(NETWORK_ERROR_MESSAGE);
    } finally {
      setAiPending(false);
    }
  }

  function openEditTransaction(transaction: Transaction) {
    setEditingTransaction({
      id: transaction.id,
      type: transaction.type,
      amount: String(transaction.amount),
      categoryId: transaction.category.id,
      note: transaction.note,
      merchant: transaction.merchant ?? "",
      rawInput: transaction.rawInput ?? "",
      transactionDate: getDateInputFromTransaction(transaction.transactionDate),
    });
    setError("");
  }

  async function updateEditingTransaction(values: TransactionFormValues) {
    if (!editingTransaction) {
      return;
    }

    const transactionMonth = getMonthKeyFromDateInput(
      values.transactionDate,
    );

    setPending(true);
    setError("");

    try {
      const response = await fetch(`/api/transactions/${editingTransaction.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: values.type,
          amount: values.amount,
          categoryId: values.categoryId,
          note: values.note,
          merchant: values.merchant,
          rawInput: values.rawInput,
          transactionDate: values.transactionDate,
        }),
      });

      if (!response.ok) {
        const message = await readJsonError(response);
        setError(message);
        toast.error(message);
        return;
      }

      setEditingTransaction(null);
      if (transactionMonth !== selectedMonth.key) {
        openMonth(transactionMonth);
        toast.success("Đã cập nhật giao dịch.");
        return;
      }

      if (await refreshTransactions()) {
        toast.success("Đã cập nhật giao dịch.");
      }
    } catch {
      setError(NETWORK_ERROR_MESSAGE);
      toast.error(NETWORK_ERROR_MESSAGE);
    } finally {
      setPending(false);
    }
  }

  async function deleteTransactionById(transaction: Transaction) {
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
      <div className="rounded-2xl border border-[#D8E1D7] bg-[#FFFDF7]/92 p-4 shadow-[0_18px_64px_rgba(47,42,31,0.06)] md:p-5">
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1.35fr)_repeat(3,minmax(0,1fr))]">
          <div className="rounded-xl border border-[#CBDACB] bg-[#ECF3ED] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.62)]">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-[#496757]">
                  Chênh lệch thu chi
                </p>
                <p
                  className={
                    summary.balance >= 0
                      ? "mt-3 text-3xl font-bold leading-none text-[#2F6B4F]"
                      : "mt-3 text-3xl font-bold leading-none text-[#A2482D]"
                  }
                >
                  {formatVnd(summary.balance)}
                </p>
              </div>
              <span className="rounded-lg bg-white/72 p-2 text-[#2F6B4F] shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
                <CircleDollarSign className="size-5" />
              </span>
            </div>
            <p className="mt-3 text-xs leading-5 text-[#5B7164]">
              {currentPageRange} trong {selectedMonth.label.toLowerCase()}
            </p>
          </div>
          <div className="rounded-xl border border-[#E1DDD4] bg-white/72 p-4 shadow-[0_10px_32px_rgba(47,42,31,0.04)]">
            <p className="text-sm font-medium text-muted-foreground">Thu nhập</p>
            <p className="mt-3 text-2xl font-bold leading-none text-[#2F6B4F]">
              {formatVnd(summary.income)}
            </p>
            <p className="mt-2 text-xs leading-5 text-muted-foreground">
              Tổng thu trong trang này
            </p>
          </div>
          <div className="rounded-xl border border-[#E1DDD4] bg-white/72 p-4 shadow-[0_10px_32px_rgba(47,42,31,0.04)]">
            <p className="text-sm font-medium text-muted-foreground">Chi tiêu</p>
            <p className="mt-3 text-2xl font-bold leading-none text-[#A2482D]">
              {formatVnd(summary.expense)}
            </p>
            <p className="mt-2 text-xs leading-5 text-muted-foreground">
              {summary.topCategory
                ? `Danh mục lớn nhất: ${summary.topCategory.name}`
                : "Chưa có danh mục nổi bật"}
            </p>
          </div>
          <div className="rounded-xl border border-[#D8E1D7] bg-[#F7F5EC] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.72)]">
            <p className="text-sm font-medium text-[#5F675E]">Tháng đang xem</p>
            <p className="mt-3 text-2xl font-bold leading-none text-[#2F3E34]">
              {selectedMonth.label}
            </p>
            <p className="mt-2 text-xs leading-5 text-[#697168]">
              Tổng {transactionCountLabel(serverPagination.total)} trong tháng
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(340px,0.88fr)_minmax(0,1.12fr)] xl:items-start">
        <InsightCard
          title="Thêm giao dịch nhanh"
          description="Nhập một câu ngắn để AI tạo bản nháp, sau đó kiểm tra số tiền và danh mục trước khi lưu."
          className="xl:sticky xl:top-24"
        >
          <Form {...createForm}>
          <form
            id="transaction-form"
            onSubmit={createForm.handleSubmit(createTransaction)}
            className="space-y-5"
          >
            <div className="rounded-xl border border-[#D8E1D7] bg-white/76 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.78)]">
              <FormField
                control={createForm.control}
                name="rawInput"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mô tả giao dịch</FormLabel>
                    <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="Ví dụ: cà phê Highlands 45k sáng nay"
                          className="h-11 rounded-xl border border-[#DCD7CC] bg-[#FDFCF8] px-3 text-sm outline-none transition-colors focus:border-[#2F6B4F] focus:ring-3 focus:ring-[#2F6B4F]/15"
                        />
                      </FormControl>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={parseRawInput}
                        disabled={aiPending}
                        className="h-11 border-[#C8DCC9] bg-white text-[#2F6B4F] hover:bg-[#F3F8F3]"
                      >
                        <Sparkles className="size-4" />
                        {aiPending ? "AI đang đọc" : "Nhờ AI đọc"}
                      </Button>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <p className="mt-2 text-xs leading-5 text-muted-foreground">
                AI chỉ chuẩn bị bản nháp. Bạn vẫn kiểm soát danh mục, số tiền và
                ngày trước khi lưu.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <FormField
                control={createForm.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Loại giao dịch</FormLabel>
                    <RhfComboboxControl
                      name={field.name}
                      value={field.value}
                      options={transactionTypeOptions}
                      onValueChange={(nextType) => {
                        field.onChange(nextType);
                        const nextCategory = categories.find(
                          (category) =>
                            !category.type || category.type === nextType,
                        );
                        createForm.setValue("categoryId", nextCategory?.id ?? "", {
                          shouldValidate: true,
                        });
                      }}
                      onBlur={field.onBlur}
                      aria-label="Loại giao dịch"
                      className="h-11"
                      required
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={createForm.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Số tiền</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="55k hoặc 1tr2"
                        className={CONTROL_CLASS_NAME}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={createForm.control}
                name="categoryId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Danh mục</FormLabel>
                    <RhfComboboxControl
                      name={field.name}
                      value={selectedCategoryId}
                      options={matchingCategories.map((category) => ({
                        value: category.id,
                        label: category.name,
                      }))}
                      onValueChange={field.onChange}
                      onBlur={field.onBlur}
                      aria-label="Danh mục"
                      className="h-11"
                      required
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={createForm.control}
                name="transactionDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ngày</FormLabel>
                    <RhfDatePickerControl
                      name={field.name}
                      value={field.value}
                      onValueChange={field.onChange}
                      onBlur={field.onBlur}
                      aria-label="Chọn ngày giao dịch"
                      className="h-11"
                      required
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={createForm.control}
                name="note"
                render={({ field }) => (
                  <FormItem className="sm:col-span-2">
                    <FormLabel>Ghi chú</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="Ví dụ: Ăn trưa với đồng nghiệp"
                        className={CONTROL_CLASS_NAME}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={createForm.control}
                name="merchant"
                render={({ field }) => (
                  <FormItem className="sm:col-span-2">
                    <FormLabel>Nơi phát sinh</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="Ví dụ: Highlands, công ty, ví Momo"
                        className={CONTROL_CLASS_NAME}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {error ? (
              <p className="rounded-xl border border-destructive/25 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </p>
            ) : null}

            <Button
              type="submit"
              disabled={pending}
              className="h-11 w-full bg-[#2F6B4F] shadow-[0_12px_28px_rgba(47,107,79,0.22)] hover:bg-[#285B43]"
            >
              <WalletCards className="size-4" />
              {pending ? "Đang lưu..." : "Lưu giao dịch"}
            </Button>
          </form>
          </Form>
        </InsightCard>

        <Card className="gap-0 overflow-hidden rounded-2xl border-[#D8E1D7] bg-[#FFFDF7]/96 py-0 shadow-[0_18px_64px_rgba(47,42,31,0.06)]">
          <CardContent className="p-0">
            <div className="border-b border-[#E8E4DC] bg-[#F8F5EA]/76 p-4 md:p-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-lg font-semibold tracking-tight">
                      Danh sách giao dịch
                    </h2>
                    <span className="rounded-full border border-[#D8E1D7] bg-[#FFFDF7] px-2.5 py-1 text-xs font-medium text-[#5E685A]">
                      {selectedMonth.label}
                    </span>
                  </div>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">
                    {transactionCountLabel(serverPagination.total)} trong tháng.
                    Bộ lọc áp dụng cho các giao dịch đang hiển thị.
                  </p>
                </div>
                <div
                  aria-label="Điều hướng tháng giao dịch"
                  className="grid w-full max-w-[320px] grid-cols-[40px_minmax(0,1fr)_40px] items-center md:w-[320px]"
                >
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    aria-label="Xem tháng trước"
                    onClick={() => openMonth(selectedMonth.previousKey)}
                    className="size-10 rounded-r-none border-[#DDD8CE]"
                  >
                    <ChevronLeft className="size-4" />
                  </Button>
                  <FormMonthPicker
                    value={selectedMonth.key}
                    onValueChange={openMonth}
                    aria-label="Chọn tháng giao dịch"
                    className="rounded-none border-x-0 border-[#D8E1D7] bg-white"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    aria-label="Xem tháng sau"
                    onClick={() => openMonth(selectedMonth.nextKey)}
                    className="size-10 rounded-l-none border-[#DDD8CE]"
                  >
                    <ChevronRight className="size-4" />
                  </Button>
                </div>
              </div>
            </div>

            <div
              className="m-4 rounded-xl border border-[#E8E4DC] bg-[#FBF8EF]/72 p-3 md:m-5"
              suppressHydrationWarning
            >
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-medium text-[#38342C]">
                  Bộ lọc
                </p>
                <p className="text-xs text-muted-foreground">
                  {isFiltered
                    ? `Tìm thấy ${transactionCountLabel(filteredCount)} trong trang này`
                    : "Đang hiển thị tất cả giao dịch trong trang này"}
                </p>
              </div>
              <div className="grid gap-2 lg:grid-cols-[1fr_140px_180px]">
                <Label className={`${FIELD_CLASS_NAME} relative`}>
                  <span className="sr-only">Tìm giao dịch</span>
                  <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={query}
                    onChange={(event) => {
                      setQuery(event.target.value);
                    }}
                    placeholder="Tìm ghi chú, nơi phát sinh, danh mục..."
                    className="h-11 w-full rounded-xl border border-[#DCD7CC] bg-[#FFFDF7] pl-9 pr-3 text-sm outline-none transition-colors focus:border-[#2F6B4F] focus:ring-3 focus:ring-[#2F6B4F]/15"
                  />
                </Label>
                <FormCombobox
                  value={typeFilter}
                  options={transactionTypeFilterOptions}
                  onValueChange={(nextType) => {
                    setTypeFilter(nextType as typeof typeFilter);
                  }}
                  aria-label="Lọc theo loại"
                />
                <FormCombobox
                  value={categoryFilter}
                  options={[
                    { value: "all", label: "Tất cả danh mục" },
                    ...categories.map((category) => ({
                      value: category.id,
                      label: category.name,
                    })),
                  ]}
                  onValueChange={(nextCategory) => {
                    setCategoryFilter(nextCategory);
                  }}
                  aria-label="Lọc theo danh mục"
                />
              </div>
            </div>

            {visibleTransactions.length > 0 ? (
              <div className="px-4 pb-2 md:px-5">
                <div className="overflow-hidden rounded-xl border border-[#E8E4DC] bg-[#FFFDF7]">
                  {visibleTransactions.map((transaction) => (
                    <article
                      key={transaction.id}
                      className="grid gap-4 border-b border-[#EDE7DC] p-4 transition duration-200 last:border-b-0 hover:bg-[#FBF8EF]/72 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
                    >
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate text-sm font-semibold">
                            {transaction.note}
                          </p>
                          <Badge
                            variant="outline"
                            className={`h-auto rounded-full px-2 py-0.5 text-xs font-medium ${categoryTone(
                              transaction.type,
                            )}`}
                          >
                            {transaction.category.name}
                          </Badge>
                          <span className="rounded-full bg-[#F1EADC] px-2 py-0.5 text-xs font-medium text-[#6B665C]">
                            {typeLabel(transaction.type)}
                          </span>
                        </div>
                        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                          <span className="inline-flex items-center gap-1">
                            <CalendarDays className="size-3" />
                            {formatDisplayDate(transaction.transactionDate)}
                          </span>
                          {transaction.merchant ? (
                            <span>{transaction.merchant}</span>
                          ) : null}
                          {transaction.rawInput ? (
                            <span>Có mô tả nhanh</span>
                          ) : null}
                        </div>
                        {transaction.rawInput ? (
                          <p className="mt-2 line-clamp-2 text-xs leading-5 text-muted-foreground">
                            Mô tả ban đầu: {transaction.rawInput}
                          </p>
                        ) : null}
                      </div>
                      <div className="flex items-center justify-between gap-3 sm:flex-col sm:items-end">
                        <span
                          className={
                            transaction.type === "income"
                              ? "text-lg font-bold leading-none text-[#2F6B4F]"
                              : "text-lg font-bold leading-none text-[#A2482D]"
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
                            aria-label={`Sửa giao dịch ${transaction.note}`}
                            onClick={() => openEditTransaction(transaction)}
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
                                aria-label={`Xóa giao dịch ${transaction.note}`}
                                className="border-[#DDD8CE] text-destructive hover:text-destructive"
                              >
                                Xóa
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>
                                  Xóa giao dịch?
                                </AlertDialogTitle>
                                <AlertDialogDescription>
                                  Giao dịch &quot;{transaction.note}&quot; sẽ bị
                                  xóa khỏi tháng này. Hành động này không thể
                                  khôi phục.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel
                                  aria-label={`Hủy xóa giao dịch ${transaction.note}`}
                                >
                                  Hủy
                                </AlertDialogCancel>
                                <AlertDialogAction
                                  aria-label={`Xác nhận xóa giao dịch ${transaction.note}`}
                                  onClick={() =>
                                    deleteTransactionById(transaction)
                                  }
                                >
                                  Xóa giao dịch
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            ) : null}

            {serverPagination.total > 0 ? (
              <div className="space-y-4 border-t border-[#E8E4DC] bg-[#F8F5EA]/70 p-4 md:p-5">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-[#38342C]">
                      {visibleStart}-{visibleEnd} trong{" "}
                      {transactionCountLabel(serverPagination.total)}
                    </p>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">
                      Bạn có thể đổi số giao dịch mỗi trang ở bên dưới.
                    </p>
                  </div>
                  <span className="w-fit rounded-full border border-[#D8E1D7] bg-[#FFFDF7] px-3 py-1 text-xs font-medium text-[#5E685A]">
                    Trang {currentPage} / {pageCount}
                  </span>
                </div>

                <div className="grid gap-3">
                  <div className="overflow-x-auto pb-1">
                    <nav
                      aria-label="Phân trang giao dịch"
                      className="mx-auto flex w-max min-w-full items-center justify-center gap-1 rounded-xl border border-[#E1DDD4] bg-[#FFFDF7] p-2 sm:min-w-0"
                    >
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label="Về trang đầu"
                        onClick={() => openPage(1)}
                        disabled={currentPage === 1}
                        className="size-9 rounded-lg text-[#6B665C] hover:bg-[#F1EADC]"
                      >
                        <ChevronsLeft className="size-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label="Về trang trước"
                        onClick={() => openPage(Math.max(1, currentPage - 1))}
                        disabled={currentPage === 1}
                        className="size-9 rounded-lg text-[#6B665C] hover:bg-[#F1EADC]"
                      >
                        <ChevronLeft className="size-4" />
                      </Button>

                      <div className="flex items-center gap-1">
                        {paginationItems.map((item) =>
                          typeof item === "number" ? (
                            <Button
                              key={item}
                              type="button"
                              variant={
                                item === currentPage ? "default" : "ghost"
                              }
                              size="icon"
                              aria-label={`Xem trang ${item}`}
                              aria-current={
                                item === currentPage ? "page" : undefined
                              }
                              onClick={() => openPage(item)}
                              className={
                                item === currentPage
                                  ? "size-9 rounded-lg bg-[#2F6B4F] text-white shadow-[0_10px_24px_rgba(47,107,79,0.18)] hover:bg-[#285B43]"
                                  : "size-9 rounded-lg text-[#6B665C] hover:bg-[#F1EADC]"
                              }
                            >
                              {item}
                            </Button>
                          ) : (
                            <span
                              key={item}
                              aria-hidden="true"
                              className="grid size-9 place-items-center text-[#8B857A]"
                            >
                              <Ellipsis className="size-4" />
                            </span>
                          ),
                        )}
                      </div>

                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label="Sang trang sau"
                        onClick={() =>
                          openPage(Math.min(pageCount, currentPage + 1))
                        }
                        disabled={currentPage === pageCount}
                        className="size-9 rounded-lg text-[#6B665C] hover:bg-[#F1EADC]"
                      >
                        <ChevronRight className="size-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label="Đến trang cuối"
                        onClick={() => openPage(pageCount)}
                        disabled={currentPage === pageCount}
                        className="size-9 rounded-lg text-[#6B665C] hover:bg-[#F1EADC]"
                      >
                        <ChevronsRight className="size-4" />
                      </Button>
                    </nav>
                  </div>

                  <div className="flex flex-col gap-2 rounded-xl border border-[#E1DDD4] bg-[#FFFDF7] p-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-xs font-medium text-[#38342C]">
                        Số giao dịch mỗi trang
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Khi đổi số lượng, danh sách sẽ quay về trang đầu.
                      </p>
                    </div>
                    <div className="w-full sm:w-[152px]">
                      <FormCombobox
                        value={pageSize}
                        options={pageSizeOptions}
                        onValueChange={(nextPageSize) => {
                          openPage(1, Number(nextPageSize));
                        }}
                        aria-label="Số giao dịch mỗi trang"
                      />
                    </div>
                  </div>
                </div>
              </div>
            ) : null}

            {transactions.length === 0 ? (
              <div className="m-4 md:m-5">
                <EmptyState
                  title="Chưa có giao dịch."
                  description="Bắt đầu bằng cách thêm giao dịch đầu tiên hoặc nhập mô tả để AI tạo bản nháp."
                />
              </div>
            ) : null}

            {transactions.length > 0 && filteredTransactions.length === 0 ? (
              <p className="m-4 rounded-xl border border-dashed border-[#DCD7CC] p-4 text-sm text-muted-foreground md:m-5">
                Không tìm thấy giao dịch phù hợp với bộ lọc hiện tại.
              </p>
            ) : null}
          </CardContent>
        </Card>
      </div>

      {editingTransaction ? (
        <TransactionEditDialog
          key={editingTransaction.id}
          transaction={editingTransaction}
          categories={categories}
          pending={pending}
          onClose={() => setEditingTransaction(null)}
          onSubmit={updateEditingTransaction}
        />
      ) : null}
    </div>
  );
}

function TransactionEditDialog({
  transaction,
  categories,
  pending,
  onClose,
  onSubmit,
}: {
  transaction: EditingTransaction;
  categories: Category[];
  pending: boolean;
  onClose: () => void;
  onSubmit: (values: TransactionFormValues) => void;
}) {
  const matchingDefaultCategories = categories.filter(
    (category) => !category.type || category.type === transaction.type,
  );
  const form = useForm<TransactionFormValues>({
    resolver: createZodResolver(transactionFormSchema),
    defaultValues: {
      type: transaction.type,
      amount: transaction.amount,
      categoryId: matchingDefaultCategories.some(
        (category) => category.id === transaction.categoryId,
      )
        ? transaction.categoryId
        : (matchingDefaultCategories[0]?.id ?? ""),
      note: transaction.note,
      merchant: transaction.merchant,
      rawInput: transaction.rawInput,
      transactionDate: transaction.transactionDate,
    },
  });
  const type = useWatch({ control: form.control, name: "type" });
  const categoryId = useWatch({ control: form.control, name: "categoryId" });
  const matchingCategories = useMemo(
    () =>
      categories.filter((category) => !category.type || category.type === type),
    [categories, type],
  );
  const selectedCategoryId =
    matchingCategories.some((category) => category.id === categoryId)
      ? categoryId
      : matchingCategories[0]?.id || "";

  return (
    <div
      aria-modal="true"
      aria-labelledby="transaction-edit-dialog-title"
      role="dialog"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4"
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          onClose();
        }
      }}
    >
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit((values) =>
            onSubmit({ ...values, categoryId: selectedCategoryId }),
          )}
          className="max-h-[calc(100dvh-2rem)] w-full max-w-2xl overflow-y-auto rounded-2xl border border-[#DCD7CC] bg-[#FDFCF8] p-5 shadow-[0_24px_80px_rgba(47,42,31,0.18)]"
        >
          <div>
            <p className="text-sm font-medium text-muted-foreground">
              Cập nhật đầy đủ thông tin giao dịch
            </p>
            <h3
              id="transaction-edit-dialog-title"
              className="mt-1 text-xl font-semibold text-foreground"
            >
              Sửa giao dịch
            </h3>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Loại giao dịch</FormLabel>
                  <RhfComboboxControl
                    name={field.name}
                    value={field.value}
                    options={transactionTypeOptions}
                    onValueChange={(nextType) => {
                      field.onChange(nextType);
                      const nextCategory = categories.find(
                        (category) => !category.type || category.type === nextType,
                      );
                      form.setValue("categoryId", nextCategory?.id ?? "", {
                        shouldValidate: true,
                      });
                    }}
                    onBlur={field.onBlur}
                    aria-label="Loại giao dịch đang sửa"
                    className="h-11"
                    required
                  />
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Số tiền</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="55k hoặc 1tr2"
                      className={DIALOG_CONTROL_CLASS_NAME}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="categoryId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Danh mục</FormLabel>
                  <RhfComboboxControl
                    name={field.name}
                    value={selectedCategoryId}
                    options={matchingCategories.map((category) => ({
                      value: category.id,
                      label: category.name,
                    }))}
                    onValueChange={field.onChange}
                    onBlur={field.onBlur}
                    aria-label="Danh mục đang sửa"
                    className="h-11"
                    required
                  />
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="transactionDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ngày</FormLabel>
                  <RhfDatePickerControl
                    name={field.name}
                    value={field.value}
                    onValueChange={field.onChange}
                    onBlur={field.onBlur}
                    aria-label="Ngày giao dịch đang sửa"
                    className="h-11"
                    required
                  />
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="note"
              render={({ field }) => (
                <FormItem className="sm:col-span-2">
                  <FormLabel>Ghi chú</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="Ví dụ: Ăn trưa với đồng nghiệp"
                      className={DIALOG_CONTROL_CLASS_NAME}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="merchant"
              render={({ field }) => (
                <FormItem className="sm:col-span-2">
                  <FormLabel>Nơi phát sinh</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="Ví dụ: Highlands, công ty, ví Momo"
                      className={DIALOG_CONTROL_CLASS_NAME}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="rawInput"
              render={({ field }) => (
                <FormItem className="sm:col-span-2">
                  <FormLabel>Mô tả ban đầu</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="Tùy chọn"
                      className={DIALOG_CONTROL_CLASS_NAME}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="mt-5 flex justify-end gap-2">
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
              aria-label="Lưu giao dịch đã sửa"
              disabled={pending}
              className="bg-[#2F6B4F] hover:bg-[#285B43]"
            >
              Lưu giao dịch
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
