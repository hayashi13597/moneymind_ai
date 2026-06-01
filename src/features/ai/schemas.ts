import { z } from "zod";

import { MAX_TRANSACTION_AMOUNT, parseVndInput } from "@/lib/money";

const trimmedString = z.string().trim();
const optionalNullableTrimmedString = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? null : value),
  trimmedString.min(1).nullable().optional(),
);
const vndAmountSchema = z.preprocess((value) => {
  if (typeof value !== "string") {
    return value;
  }

  const parsed = parseVndInput(value);

  return parsed.ok ? parsed.value : value;
}, z.number().int().positive().max(MAX_TRANSACTION_AMOUNT));

export const aiProviderSettingSchema = z.object({
  baseUrl: trimmedString.url().transform((value) => value.replace(/\/+$/, "")),
  model: trimmedString.min(1),
  apiKey: trimmedString.min(1),
});

export type AiProviderSettingInput = z.infer<typeof aiProviderSettingSchema>;

export const aiProviderSettingUpdateSchema = aiProviderSettingSchema.extend({
  apiKey: trimmedString.min(1).optional(),
});

export type AiProviderSettingUpdateInput = z.infer<
  typeof aiProviderSettingUpdateSchema
>;

export const parseTransactionRequestSchema = z.object({
  input: trimmedString.min(1).max(500),
  providerSetting: aiProviderSettingSchema,
});

export type ParseTransactionRequest = z.infer<
  typeof parseTransactionRequestSchema
>;

export const aiTransactionOutputSchema = z.object({
  type: z.enum(["income", "expense"]),
  amount: vndAmountSchema,
  categoryName: trimmedString.min(1),
  note: trimmedString.min(1),
  merchant: optionalNullableTrimmedString,
  transactionDate: trimmedString.regex(/^\d{4}-\d{2}-\d{2}$/),
});

export type AiTransactionOutput = z.infer<typeof aiTransactionOutputSchema>;

export const monthlyInsightRequestSchema = z.object({
  month: trimmedString.regex(/^\d{4}-\d{2}$/),
  regenerate: z.boolean().optional().default(false),
  providerSetting: aiProviderSettingSchema,
});

export type MonthlyInsightRequest = z.infer<typeof monthlyInsightRequestSchema>;

export const openAiChatResponseSchema = z.object({
  choices: z
    .array(
      z.object({
        message: z.object({
          content: z.string(),
        }),
      }),
    )
    .min(1),
});
