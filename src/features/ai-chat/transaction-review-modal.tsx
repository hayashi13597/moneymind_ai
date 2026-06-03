"use client";

import { BadgeCheck, Bot } from "lucide-react";
import { useMemo, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import {
  RhfComboboxControl,
  RhfDatePickerControl,
} from "@/components/form-rhf-controls";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import type { AiChatTransactionDraft } from "@/features/ai-chat/schemas";
import { createTransactionAction } from "@/features/transactions/actions";
import { createZodResolver } from "@/lib/zod-form";

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
const CONTROL_CLASS_NAME =
  "h-11 w-full rounded-xl border border-[#DCD7CC] bg-[#FDFCF8] px-3 text-sm outline-none transition-colors focus:border-[#2F6B4F] focus:ring-3 focus:ring-[#2F6B4F]/15";
const transactionReviewFormSchema = z.object({
  type: z.enum(["income", "expense"]),
  amount: z.string().trim().min(1, "Số tiền là bắt buộc."),
  categoryId: z.string().trim().min(1, "Danh mục là bắt buộc."),
  transactionDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Ngày không hợp lệ."),
  note: z.string().trim().min(1, "Ghi chú là bắt buộc."),
  merchant: z.string(),
});

type TransactionReviewFormValues = z.infer<typeof transactionReviewFormSchema>;

function AiChatTransactionReviewForm({
  draft,
  categories,
  onClose,
  onSaved,
}: AiChatTransactionReviewFormProps) {
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const defaultMatchingCategories = categories.filter(
    (category) => !category.type || category.type === draft.type,
  );
  const form = useForm<TransactionReviewFormValues>({
    resolver: createZodResolver(transactionReviewFormSchema),
    defaultValues: {
      type: draft.type,
      amount: String(draft.amount),
      categoryId: defaultMatchingCategories.some(
        (category) => category.id === draft.categoryId,
      )
        ? draft.categoryId
        : (defaultMatchingCategories[0]?.id ?? ""),
      transactionDate: draft.transactionDate,
      note: draft.note,
      merchant: draft.merchant ?? "",
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
  const hasMatchingCategories = matchingCategories.length > 0;

  async function saveDraft(values: TransactionReviewFormValues) {
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
        type: values.type,
        amount: values.amount,
        categoryId: selectedCategoryId,
        note: values.note,
        merchant: values.merchant,
        rawInput: draft.rawInput,
        transactionDate: values.transactionDate,
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
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) {
          onClose();
        }
      }}
    >
      <DialogContent
        showCloseButton={false}
        className="max-h-[calc(100vh-2rem)] w-full max-w-2xl gap-0 overflow-y-auto rounded-2xl border-[#DCD7CC] bg-card p-0 shadow-[0_18px_60px_rgba(47,42,31,0.2)]"
      >
        <DialogHeader className="flex-row items-start justify-between gap-3 border-b border-[#E8E4DC] bg-[#FDFCF8] p-5 text-left">
          <div className="flex items-start gap-3">
            <div className="rounded-full bg-[#2F6B4F] p-2 text-white">
              <Bot className="size-4" />
            </div>
            <div>
              <DialogTitle>Giao dịch AI nháp</DialogTitle>
              <DialogDescription className="mt-1 leading-6">
                Kiểm tra số tiền, danh mục và ngày trước khi lưu vào sổ thu chi.
              </DialogDescription>
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
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(saveDraft)}
            className="grid gap-4 p-5 sm:grid-cols-2"
          >
          <div className="rounded-2xl border border-[#D8E1D7] bg-[#F3F8F2] p-4 sm:col-span-2">
            <p className="inline-flex items-center gap-2 text-sm font-medium text-[#2F6B4F]">
              <BadgeCheck className="size-4" />
              MoneyMind đã đọc mô tả này
            </p>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {draft.rawInput}
            </p>
          </div>
          <FormField
            control={form.control}
            name="type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Loại</FormLabel>
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
                  aria-label="Loại"
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
                  <Input {...field} className={CONTROL_CLASS_NAME} />
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
                  aria-label="Danh mục"
                  disabled={!hasMatchingCategories}
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
                  aria-label="Chọn ngày"
                  className="h-11"
                  required
                />
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="merchant"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Người bán</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    placeholder="Tùy chọn"
                    className={CONTROL_CLASS_NAME}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="note"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Ghi chú</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    placeholder="Ghi chú"
                    className={CONTROL_CLASS_NAME}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
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
        </Form>
      </DialogContent>
    </Dialog>
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
