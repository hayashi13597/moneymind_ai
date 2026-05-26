import { z } from "zod";

import { parseVndInput } from "@/lib/money";

const transactionTypeSchema = z.enum(["income", "expense"]);

const amountSchema = z
  .union([z.string(), z.number().int().positive()])
  .transform((value, ctx) => {
    if (typeof value === "number") {
      return value;
    }

    const parsed = parseVndInput(value);

    if (!parsed.ok) {
      ctx.addIssue({
        code: "custom",
        message: parsed.error,
      });
      return z.NEVER;
    }

    return parsed.value;
  });

const dateSchema = z.string().min(1).transform((value, ctx) => {
  const date = new Date(`${value}T00:00:00.000Z`);

  if (Number.isNaN(date.getTime())) {
    ctx.addIssue({
      code: "custom",
      message: "Ngày giao dịch không hợp lệ.",
    });
    return z.NEVER;
  }

  return date;
});

const optionalTrimmedString = z.string().trim().min(1).optional();

export const transactionCreateSchema = z.object({
  type: transactionTypeSchema,
  amount: amountSchema,
  categoryId: z.string().trim().min(1, "Danh mục là bắt buộc."),
  note: z.string().trim().min(1, "Ghi chú là bắt buộc."),
  merchant: optionalTrimmedString,
  rawInput: optionalTrimmedString,
  transactionDate: dateSchema,
});

export const transactionUpdateSchema = transactionCreateSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: "Cần ít nhất một trường để cập nhật.",
  });

export type TransactionCreateInput = z.infer<typeof transactionCreateSchema>;
export type TransactionUpdateInput = z.infer<typeof transactionUpdateSchema>;
