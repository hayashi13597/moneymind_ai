import { z } from "zod";

import { MAX_TRANSACTION_AMOUNT, parseVndInput } from "@/lib/money";

export const budgetMonthSchema = z
  .string()
  .regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Tháng không hợp lệ.");

export const budgetScopeSchema = z.enum(["default", "month"]);

const budgetAmountSchema = z
  .union([z.string(), z.number().int().positive()])
  .transform((value, ctx) => {
    if (typeof value === "number") {
      if (value <= 0 || value > MAX_TRANSACTION_AMOUNT) {
        ctx.addIssue({ code: "custom", message: "Số tiền không hợp lệ." });
        return z.NEVER;
      }

      return value;
    }

    const parsed = parseVndInput(value);

    if (!parsed.ok || parsed.value <= 0) {
      ctx.addIssue({
        code: "custom",
        message: parsed.ok ? "Số tiền không hợp lệ." : parsed.error,
      });
      return z.NEVER;
    }

    return parsed.value;
  });

export const budgetQuerySchema = z.object({
  month: budgetMonthSchema,
});

const scopedBudgetFields = {
  categoryId: z.string().trim().min(1, "Danh mục là bắt buộc."),
  scope: budgetScopeSchema,
  month: budgetMonthSchema.optional(),
};

function requireMonthForMonthScope(
  value: { scope: "default" | "month"; month?: string },
  ctx: z.RefinementCtx,
) {
  if (value.scope === "month" && !value.month) {
    ctx.addIssue({
      code: "custom",
      path: ["month"],
      message: "Tháng không hợp lệ.",
    });
  }
}

export const budgetUpsertSchema = z
  .object({
    ...scopedBudgetFields,
    amount: budgetAmountSchema,
  })
  .superRefine(requireMonthForMonthScope);

export const budgetDeleteSchema = z
  .object(scopedBudgetFields)
  .superRefine(requireMonthForMonthScope);

export type BudgetQueryInput = z.infer<typeof budgetQuerySchema>;
export type BudgetUpsertInput = z.infer<typeof budgetUpsertSchema>;
export type BudgetDeleteInput = z.infer<typeof budgetDeleteSchema>;

export function toBudgetPeriod(
  input: { scope: "default" } | { scope: "month"; month: string },
) {
  return input.scope === "default" ? "default" : input.month;
}
