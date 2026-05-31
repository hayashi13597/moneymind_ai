import { z } from "zod";

import { parseVndInput } from "@/lib/money";

const trimmedString = z.string().trim();
const optionalNullableTrimmedString = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? null : value),
  trimmedString.min(1).nullable().optional(),
);
const chatRoleSchema = z.enum(["user", "assistant"]);
const vndAmountSchema = z.preprocess((value) => {
  if (typeof value !== "string") {
    return value;
  }

  const parsed = parseVndInput(value);

  return parsed.ok ? parsed.value : value;
}, z.number().int().positive());

export const AI_CHAT_MAX_MESSAGES = 8;
export const AI_CHAT_MAX_MESSAGE_LENGTH = 1000;

export const aiChatMessageSchema = z.object({
  role: chatRoleSchema,
  content: trimmedString.min(1).max(AI_CHAT_MAX_MESSAGE_LENGTH),
});

export type AiChatMessage = z.infer<typeof aiChatMessageSchema>;

export const aiChatRequestSchema = z.object({
  month: trimmedString.regex(/^\d{4}-(0[1-9]|1[0-2])$/),
  messages: z
    .array(aiChatMessageSchema)
    .min(1)
    .transform((messages) => messages.slice(-AI_CHAT_MAX_MESSAGES))
    .refine((messages) => messages.some((message) => message.role === "user")),
});

export type AiChatRequest = z.infer<typeof aiChatRequestSchema>;

export const aiChatProviderDraftSchema = z.object({
  type: z.enum(["income", "expense"]),
  amount: vndAmountSchema,
  categoryName: trimmedString.min(1),
  note: trimmedString.min(1),
  merchant: optionalNullableTrimmedString,
  transactionDate: trimmedString.regex(/^\d{4}-\d{2}-\d{2}$/),
});

export type AiChatProviderDraft = z.infer<typeof aiChatProviderDraftSchema>;

export const aiChatProviderResponseSchema = z.object({
  answer: trimmedString.min(1),
  transactionDraft: aiChatProviderDraftSchema.nullable(),
});

export type AiChatProviderResponse = z.infer<
  typeof aiChatProviderResponseSchema
>;

export const aiChatTransactionDraftSchema = z.object({
  type: z.enum(["income", "expense"]),
  amount: z.number().int().positive(),
  categoryId: trimmedString.min(1),
  categoryName: trimmedString.min(1),
  note: trimmedString.min(1),
  merchant: trimmedString.min(1).nullable(),
  rawInput: trimmedString.min(1),
  transactionDate: trimmedString.regex(/^\d{4}-\d{2}-\d{2}$/),
});

export type AiChatTransactionDraft = z.infer<
  typeof aiChatTransactionDraftSchema
>;

export const aiChatResponseSchema = z.object({
  message: z.object({
    role: z.literal("assistant"),
    content: trimmedString.min(1),
  }),
  transactionDraft: aiChatTransactionDraftSchema.optional(),
});

export type AiChatResponse = z.infer<typeof aiChatResponseSchema>;
