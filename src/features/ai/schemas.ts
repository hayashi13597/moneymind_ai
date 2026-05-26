import { z } from "zod";

const trimmedString = z.string().trim();

export const aiProviderSettingUpdateSchema = z.object({
  baseUrl: trimmedString.url().transform((value) => value.replace(/\/+$/, "")),
  model: trimmedString.min(1),
  apiKey: trimmedString.min(1).optional(),
});

export type AiProviderSettingUpdateInput = z.infer<
  typeof aiProviderSettingUpdateSchema
>;

export const parseTransactionRequestSchema = z.object({
  input: trimmedString.min(1).max(500),
});

export type ParseTransactionRequest = z.infer<
  typeof parseTransactionRequestSchema
>;

export const aiTransactionOutputSchema = z.object({
  type: z.enum(["income", "expense"]),
  amount: z.number().int().positive(),
  categoryName: trimmedString.min(1),
  note: trimmedString.min(1),
  merchant: trimmedString.min(1).nullable().optional(),
  transactionDate: trimmedString.regex(/^\d{4}-\d{2}-\d{2}$/),
});

export type AiTransactionOutput = z.infer<typeof aiTransactionOutputSchema>;

export const monthlyInsightRequestSchema = z.object({
  month: trimmedString.regex(/^\d{4}-\d{2}$/),
  regenerate: z.boolean().optional().default(false),
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
