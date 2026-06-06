import { z } from "zod";

import { aiProviderSettingSchema } from "@/features/ai/schemas";
import { MAX_TRANSACTION_AMOUNT, parseVndInput } from "@/lib/money";

const trimmedString = z.string().trim();
const optionalNullableTrimmedString = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? null : value),
  trimmedString.min(1).nullable().optional(),
);

const calendarDateSchema = trimmedString.refine((value) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);

  if (!match) {
    return false;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() + 1 === month &&
    date.getUTCDate() === day
  );
});

const vndAmountSchema = z.preprocess((value) => {
  if (typeof value !== "string") {
    return value;
  }

  const parsed = parseVndInput(value);

  return parsed.ok ? parsed.value : value;
}, z.number().int().positive().max(MAX_TRANSACTION_AMOUNT));

export const AGENT_MAX_MESSAGES = 10;
export const AGENT_MAX_MESSAGE_LENGTH = 1200;
export const AGENT_MAX_TRANSACTIONS = 8;

export const agentMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: trimmedString.min(1).max(AGENT_MAX_MESSAGE_LENGTH),
});

export type AgentMessage = z.infer<typeof agentMessageSchema>;

export const agentRequestSchema = z.object({
  month: trimmedString.regex(/^\d{4}-(0[1-9]|1[0-2])$/),
  providerSetting: aiProviderSettingSchema,
  messages: z
    .array(agentMessageSchema)
    .min(1)
    .transform((messages) => messages.slice(-AGENT_MAX_MESSAGES))
    .refine((messages) => messages.some((message) => message.role === "user")),
});

export type AgentRequest = z.infer<typeof agentRequestSchema>;

export const agentResultTypeSchema = z.enum([
  "answer",
  "search_results",
  "suggestion",
  "dashboard_explanation",
  "transaction_created",
  "transaction_updated",
  "transaction_deleted",
  "clarification_required",
]);

export type AgentResultType = z.infer<typeof agentResultTypeSchema>;

export const agentTransactionSummarySchema = z.object({
  id: trimmedString.min(1),
  date: trimmedString.regex(/^\d{4}-\d{2}-\d{2}$/),
  type: z.enum(["income", "expense"]),
  amount: z.number().int().positive(),
  categoryName: trimmedString.min(1),
  merchant: trimmedString.min(1).nullable(),
  note: trimmedString.min(1),
});

export type AgentTransactionSummary = z.infer<
  typeof agentTransactionSummarySchema
>;

export const agentClarificationSchema = z.object({
  question: trimmedString.min(1),
  candidates: z
    .array(
      z.object({
        id: trimmedString.min(1),
        label: trimmedString.min(1),
      }),
    )
    .optional(),
});

export type AgentClarification = z.infer<typeof agentClarificationSchema>;

const agentResponseMessageSchema = z.object({
  role: z.literal("assistant"),
  content: trimmedString.min(1),
});

const agentResponseActionSchema = z
  .object({
    type: z.enum(["create", "update", "delete"]),
    transactionId: trimmedString.min(1).optional(),
  })
  .optional();

const agentBaseResponseSchema = z.object({
  message: agentResponseMessageSchema,
  action: agentResponseActionSchema,
});

export const agentResponseSchema = z.discriminatedUnion("resultType", [
  agentBaseResponseSchema.extend({
    resultType: z.literal(agentResultTypeSchema.enum.clarification_required),
    clarification: agentClarificationSchema,
  }),
  agentBaseResponseSchema.extend({
    resultType: z.literal(agentResultTypeSchema.enum.search_results),
    transactions: z.array(agentTransactionSummarySchema).min(1),
  }),
  agentBaseResponseSchema.extend({
    resultType: z.literal(agentResultTypeSchema.enum.answer),
  }),
  agentBaseResponseSchema.extend({
    resultType: z.literal(agentResultTypeSchema.enum.suggestion),
  }),
  agentBaseResponseSchema.extend({
    resultType: z.literal(agentResultTypeSchema.enum.dashboard_explanation),
  }),
  agentBaseResponseSchema.extend({
    resultType: z.literal(agentResultTypeSchema.enum.transaction_created),
  }),
  agentBaseResponseSchema.extend({
    resultType: z.literal(agentResultTypeSchema.enum.transaction_updated),
  }),
  agentBaseResponseSchema.extend({
    resultType: z.literal(agentResultTypeSchema.enum.transaction_deleted),
  }),
]);

export type AgentResponse = z.infer<typeof agentResponseSchema> & {
  transactions?: AgentTransactionSummary[];
  clarification?: AgentClarification;
};

export const agentToolNameSchema = z.enum([
  "finance.answerContext",
  "dashboard.explain",
  "transactions.search",
  "categories.list",
  "transactions.create",
  "transactions.update",
  "transactions.delete",
]);

export type AgentToolName = z.infer<typeof agentToolNameSchema>;

const optionalQuestionInputSchema = z
  .object({ question: trimmedString.min(1).optional() })
  .optional()
  .default({});

const optionalReasonInputSchema = z
  .object({ reason: trimmedString.min(1).optional() })
  .optional()
  .default({});

export const agentCreateInputSchema = z.object({
  type: z.enum(["income", "expense"]),
  amount: vndAmountSchema,
  categoryName: trimmedString.min(1),
  note: trimmedString.min(1),
  merchant: optionalNullableTrimmedString,
  transactionDate: calendarDateSchema,
});

export type AgentCreateInput = z.infer<typeof agentCreateInputSchema>;

export const agentSearchInputSchema = z.object({
  query: trimmedString.min(1),
  month: trimmedString.regex(/^\d{4}-(0[1-9]|1[0-2])$/).optional(),
  type: z.enum(["income", "expense"]).optional(),
  categoryName: trimmedString.min(1).optional(),
  merchant: trimmedString.min(1).optional(),
  text: trimmedString.min(1).optional(),
  minAmount: vndAmountSchema.optional(),
  maxAmount: vndAmountSchema.optional(),
});

export type AgentSearchInput = z.infer<typeof agentSearchInputSchema>;

export const agentUpdateInputSchema = z.object({
  targetQuery: trimmedString.min(1),
  transactionId: trimmedString.min(1).optional(),
  updates: z
    .object({
      type: z.enum(["income", "expense"]).optional(),
      amount: vndAmountSchema.optional(),
      categoryName: trimmedString.min(1).optional(),
      note: trimmedString.min(1).optional(),
      merchant: optionalNullableTrimmedString,
      transactionDate: calendarDateSchema.optional(),
    })
    .refine((value) => Object.keys(value).length > 0, {
      message: "Cần ít nhất một trường để cập nhật.",
    }),
});

export type AgentUpdateInput = z.infer<typeof agentUpdateInputSchema>;

export const agentDeleteInputSchema = z.object({
  targetQuery: trimmedString.min(1),
  transactionId: trimmedString.min(1).optional(),
});

export type AgentDeleteInput = z.infer<typeof agentDeleteInputSchema>;

export const agentIntentSchema = z.discriminatedUnion("tool", [
  z.object({
    resultType: z.enum(["answer", "suggestion"]),
    tool: z.literal("finance.answerContext"),
    message: trimmedString.min(1),
    input: optionalQuestionInputSchema,
  }),
  z.object({
    resultType: z.literal("dashboard_explanation"),
    tool: z.literal("dashboard.explain"),
    message: trimmedString.min(1),
    input: optionalQuestionInputSchema,
  }),
  z.object({
    resultType: z.literal("search_results"),
    tool: z.literal("transactions.search"),
    message: trimmedString.min(1),
    input: agentSearchInputSchema,
  }),
  z.object({
    resultType: z.literal("answer"),
    tool: z.literal("categories.list"),
    message: trimmedString.min(1),
    input: optionalReasonInputSchema,
  }),
  z.object({
    resultType: z.literal("transaction_created"),
    tool: z.literal("transactions.create"),
    message: trimmedString.min(1),
    input: agentCreateInputSchema,
  }),
  z.object({
    resultType: z.literal("transaction_updated"),
    tool: z.literal("transactions.update"),
    message: trimmedString.min(1),
    input: agentUpdateInputSchema,
  }),
  z.object({
    resultType: z.literal("transaction_deleted"),
    tool: z.literal("transactions.delete"),
    message: trimmedString.min(1),
    input: agentDeleteInputSchema,
  }),
]);

export type AgentIntent = z.infer<typeof agentIntentSchema>;
