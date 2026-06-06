# Agent Chat Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current fixed AI chat backend with a provider-agnostic `/api/agent` flow that can answer app-data questions, suggest actions, explain dashboard data, search transactions with natural language, and directly create/update/delete transactions when the request is unambiguous.

**Architecture:** Add a focused `src/features/agent/` module with Zod schemas, finance/read tools, transaction/write tools, and an orchestration service that asks the existing OpenAI-compatible adapter for strict JSON intent. Add a new authenticated App Router `POST /api/agent` route, then migrate the chat widget and dashboard AskMoneyMind panel to the new endpoint while keeping `/api/ai/chat` available temporarily.

**Tech Stack:** Next.js App Router route handlers, React 19 client components, Zod 4, Jest, Prisma-backed existing services, localStorage-backed AI provider settings, existing OpenAI-compatible chat adapter.

---

## File Structure

- Create `src/features/agent/schemas.ts`
  - Public `/api/agent` request/response schemas.
  - LLM intent schema.
  - Shared result and transaction summary types.
- Create `src/features/agent/json.ts`
  - JSON object extraction and parsing boundary reused by the service.
- Create `src/features/agent/tools/finance.ts`
  - Trusted dashboard/category/recent transaction context for read tools.
- Create `src/features/agent/tools/transactions.ts`
  - Transaction search, candidate resolution, create, update, and delete tool handlers.
- Create `src/features/agent/service.ts`
  - Agent prompt, LLM call, intent validation, tool dispatch, and public response conversion.
- Create `src/app/api/agent/route.ts`
  - Auth, request validation, provider safety, controlled error mapping.
- Modify `src/features/ai-chat/widget.tsx`
  - Post to `/api/agent`.
  - Render `search_results`, CRUD confirmations, and clarification candidates.
- Modify `src/features/dashboard/ask-moneymind-panel.tsx`
  - Post to `/api/agent`.
- Create tests:
  - `tests/agent-schemas.test.ts`
  - `tests/agent-json.test.ts`
  - `tests/agent-finance-tools.test.ts`
  - `tests/agent-transaction-tools.test.ts`
  - `tests/agent-service.test.ts`
  - `tests/agent-route.test.ts`
- Modify tests:
  - `tests/ai-chat-widget-client.test.ts`
  - `tests/ai-chat-widget.test.ts`
  - Add or update dashboard panel test if a nearby test already exists; otherwise include dashboard panel coverage in a new `tests/ask-moneymind-panel.test.ts`.

Use the Next.js local docs already checked for this plan:

- `node_modules/next/dist/docs/01-app/01-getting-started/15-route-handlers.md`
- `node_modules/next/dist/docs/01-app/02-guides/ai-agents.md`

Important repo conventions:

- Run targeted Jest with `pnpm test --runInBand tests/<file>.test.ts`.
- Use `Response.json(...)` in route handlers.
- Preserve browser-local AI provider settings by sending `providerSetting` in the request body.
- Use existing service boundaries for database writes.

---

### Task 1: Agent Schemas

**Files:**
- Create: `tests/agent-schemas.test.ts`
- Create: `src/features/agent/schemas.ts`

- [ ] **Step 1: Write failing schema tests**

Create `tests/agent-schemas.test.ts`:

```ts
import {
  AGENT_MAX_MESSAGES,
  AGENT_MAX_MESSAGE_LENGTH,
  agentIntentSchema,
  agentRequestSchema,
  agentResponseSchema,
} from "@/features/agent/schemas";

const providerSetting = {
  baseUrl: "https://openrouter.ai/api/v1",
  apiKey: "sk-test",
  model: "openai/gpt-4o-mini",
};

describe("agent schemas", () => {
  it("accepts a valid agent request and trims recent messages", () => {
    const messages = Array.from({ length: AGENT_MAX_MESSAGES + 2 }, (_, index) => ({
      role: index % 2 === 0 ? "user" : "assistant",
      content: `Tin nhắn ${index + 1}`,
    }));

    const parsed = agentRequestSchema.parse({
      month: "2026-06",
      providerSetting,
      messages,
    });

    expect(parsed.messages).toHaveLength(AGENT_MAX_MESSAGES);
    expect(parsed.messages[0].content).toBe("Tin nhắn 3");
  });

  it("rejects missing provider settings", () => {
    expect(() =>
      agentRequestSchema.parse({
        month: "2026-06",
        messages: [{ role: "user", content: "Tôi chi gì nhiều nhất?" }],
      }),
    ).toThrow();
  });

  it("rejects invalid months and oversized messages", () => {
    expect(() =>
      agentRequestSchema.parse({
        month: "2026-13",
        providerSetting,
        messages: [{ role: "user", content: "Tôi chi gì nhiều nhất?" }],
      }),
    ).toThrow();

    expect(() =>
      agentRequestSchema.parse({
        month: "2026-06",
        providerSetting,
        messages: [{ role: "user", content: "x".repeat(AGENT_MAX_MESSAGE_LENGTH + 1) }],
      }),
    ).toThrow();
  });

  it("accepts public response variants", () => {
    expect(
      agentResponseSchema.parse({
        message: { role: "assistant", content: "Bạn chi nhiều nhất cho ăn uống." },
        resultType: "dashboard_explanation",
      }),
    ).toEqual({
      message: { role: "assistant", content: "Bạn chi nhiều nhất cho ăn uống." },
      resultType: "dashboard_explanation",
    });

    expect(
      agentResponseSchema.parse({
        message: { role: "assistant", content: "Mình tìm thấy 2 giao dịch." },
        resultType: "clarification_required",
        clarification: {
          question: "Bạn muốn xóa giao dịch nào?",
          candidates: [{ id: "tx_1", label: "55.000 đ, Ăn uống, 2026-06-03" }],
        },
      }),
    ).toMatchObject({ resultType: "clarification_required" });
  });

  it("accepts valid LLM intents and rejects invalid tool names", () => {
    expect(
      agentIntentSchema.parse({
        resultType: "transaction_created",
        tool: "transactions.create",
        message: "Đã thêm giao dịch.",
        input: {
          type: "expense",
          amount: 55000,
          categoryName: "Ăn uống",
          note: "Cơm trưa",
          merchant: "Quán cơm",
          transactionDate: "2026-06-04",
        },
      }),
    ).toMatchObject({ tool: "transactions.create" });

    expect(() =>
      agentIntentSchema.parse({
        resultType: "transaction_created",
        tool: "categories.delete",
        message: "Đã xóa danh mục.",
        input: {},
      }),
    ).toThrow();
  });
});
```

- [ ] **Step 2: Run schema test to verify it fails**

Run:

```bash
pnpm test --runInBand tests/agent-schemas.test.ts
```

Expected: FAIL because `src/features/agent/schemas.ts` does not exist.

- [ ] **Step 3: Implement schemas**

Create `src/features/agent/schemas.ts`:

```ts
import { z } from "zod";

import { aiProviderSettingSchema } from "@/features/ai/schemas";
import { MAX_TRANSACTION_AMOUNT, parseVndInput } from "@/lib/money";

const trimmedString = z.string().trim();
const optionalNullableTrimmedString = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? null : value),
  trimmedString.min(1).nullable().optional(),
);

const vndAmountSchema = z.preprocess((value) => {
  if (typeof value !== "string") return value;
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

export const agentResponseSchema = z.object({
  message: z.object({
    role: z.literal("assistant"),
    content: trimmedString.min(1),
  }),
  resultType: agentResultTypeSchema,
  transactions: z.array(agentTransactionSummarySchema).optional(),
  clarification: agentClarificationSchema.optional(),
  action: z
    .object({
      type: z.enum(["create", "update", "delete"]),
      transactionId: trimmedString.min(1).optional(),
    })
    .optional(),
});

export type AgentResponse = z.infer<typeof agentResponseSchema>;

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

export const agentCreateInputSchema = z.object({
  type: z.enum(["income", "expense"]),
  amount: vndAmountSchema,
  categoryName: trimmedString.min(1),
  note: trimmedString.min(1),
  merchant: optionalNullableTrimmedString,
  transactionDate: trimmedString.regex(/^\d{4}-\d{2}-\d{2}$/),
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
      transactionDate: trimmedString.regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
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
    input: z.object({ question: trimmedString.min(1) }),
  }),
  z.object({
    resultType: z.literal("dashboard_explanation"),
    tool: z.literal("dashboard.explain"),
    message: trimmedString.min(1),
    input: z.object({ question: trimmedString.min(1) }),
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
    input: z.object({ reason: trimmedString.min(1) }),
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
```

- [ ] **Step 4: Run schema test**

Run:

```bash
pnpm test --runInBand tests/agent-schemas.test.ts
```

Expected: PASS `tests/agent-schemas.test.ts`.

- [ ] **Step 5: Commit schemas**

```bash
git add src/features/agent/schemas.ts tests/agent-schemas.test.ts
git commit -m "feat: add agent schemas"
```

---

### Task 2: Agent JSON Parsing Boundary

**Files:**
- Create: `tests/agent-json.test.ts`
- Create: `src/features/agent/json.ts`

- [ ] **Step 1: Write failing JSON tests**

Create `tests/agent-json.test.ts`:

```ts
import { parseAgentJsonObject } from "@/features/agent/json";
import { AiDomainError } from "@/features/ai/errors";

describe("agent json parser", () => {
  it("extracts a JSON object from plain content", () => {
    expect(parseAgentJsonObject('{"tool":"transactions.search"}')).toEqual({
      tool: "transactions.search",
    });
  });

  it("extracts a JSON object from markdown fenced content", () => {
    expect(
      parseAgentJsonObject(
        'Đây là kết quả:\n```json\n{"tool":"dashboard.explain","input":{"question":"vì sao?"}}\n```',
      ),
    ).toEqual({
      tool: "dashboard.explain",
      input: { question: "vì sao?" },
    });
  });

  it("throws a controlled AI error when no object exists", () => {
    expect(() => parseAgentJsonObject("không phải json")).toThrow(AiDomainError);
  });
});
```

- [ ] **Step 2: Run JSON test to verify it fails**

Run:

```bash
pnpm test --runInBand tests/agent-json.test.ts
```

Expected: FAIL because `src/features/agent/json.ts` does not exist.

- [ ] **Step 3: Implement JSON parser**

Create `src/features/agent/json.ts`:

```ts
import { AiDomainError } from "@/features/ai/errors";

function extractJsonObject(content: string) {
  for (
    let start = content.indexOf("{");
    start !== -1;
    start = content.indexOf("{", start + 1)
  ) {
    let depth = 0;
    let inString = false;
    let escaped = false;

    for (let index = start; index < content.length; index += 1) {
      const char = content[index];

      if (escaped) {
        escaped = false;
        continue;
      }

      if (char === "\\") {
        escaped = true;
        continue;
      }

      if (char === '"') {
        inString = !inString;
        continue;
      }

      if (inString) continue;

      if (char === "{") depth += 1;

      if (char === "}") {
        depth -= 1;
        if (depth === 0) return content.slice(start, index + 1);
      }
    }
  }

  return null;
}

export function parseAgentJsonObject(content: string) {
  const jsonContent = extractJsonObject(content);

  if (!jsonContent) {
    throw new AiDomainError("provider_invalid_response");
  }

  try {
    return JSON.parse(jsonContent) as unknown;
  } catch {
    throw new AiDomainError("provider_invalid_response");
  }
}
```

- [ ] **Step 4: Run JSON test**

Run:

```bash
pnpm test --runInBand tests/agent-json.test.ts
```

Expected: PASS `tests/agent-json.test.ts`.

- [ ] **Step 5: Commit JSON parser**

```bash
git add src/features/agent/json.ts tests/agent-json.test.ts
git commit -m "feat: add agent json parser"
```

---

### Task 3: Finance Read Tools

**Files:**
- Create: `tests/agent-finance-tools.test.ts`
- Create: `src/features/agent/tools/finance.ts`

- [ ] **Step 1: Write failing finance tool tests**

Create `tests/agent-finance-tools.test.ts`:

```ts
import {
  buildAgentFinanceContext,
  formatDashboardExplanation,
} from "@/features/agent/tools/finance";
import { getMonthlyDashboard } from "@/features/dashboard/service";
import { db } from "@/lib/db";

jest.mock("@/features/dashboard/service", () => ({
  getMonthlyDashboard: jest.fn(),
}));

jest.mock("@/lib/db", () => ({
  db: {
    category: { findMany: jest.fn() },
    transaction: { findMany: jest.fn() },
  },
}));

const getMonthlyDashboardMock = getMonthlyDashboard as jest.Mock;
const categoryFindManyMock = db.category.findMany as jest.Mock;
const transactionFindManyMock = db.transaction.findMany as jest.Mock;

describe("agent finance tools", () => {
  beforeEach(() => {
    getMonthlyDashboardMock.mockReset();
    categoryFindManyMock.mockReset();
    transactionFindManyMock.mockReset();

    getMonthlyDashboardMock.mockResolvedValue({
      month: "2026-06",
      totals: { income: 10000000, expense: 3500000, remaining: 6500000 },
      categoryBreakdown: [{ categoryName: "Ăn uống", amount: 1200000 }],
    });
    categoryFindManyMock.mockResolvedValue([
      { id: "cat_food", name: "Ăn uống", type: "expense" },
      { id: "cat_income", name: "Thu nhập", type: "income" },
    ]);
    transactionFindManyMock.mockResolvedValue([
      {
        id: "tx_1",
        type: "expense",
        amount: 55000,
        transactionDate: new Date("2026-06-04T00:00:00.000Z"),
        merchant: "Quán cơm",
        note: "Cơm trưa",
        category: { name: "Ăn uống" },
      },
    ]);
  });

  it("builds trusted context from dashboard, categories, and recent transactions", async () => {
    const context = await buildAgentFinanceContext("user_1", "2026-06");

    expect(getMonthlyDashboardMock).toHaveBeenCalledWith("user_1", "2026-06");
    expect(categoryFindManyMock).toHaveBeenCalledWith({
      where: { userId: "user_1" },
      orderBy: [{ type: "asc" }, { name: "asc" }],
      select: { id: true, name: true, type: true },
    });
    expect(context.transactions[0]).toMatchObject({
      id: "tx_1",
      date: "2026-06-04",
      categoryName: "Ăn uống",
    });
  });

  it("formats dashboard explanation context in Vietnamese", () => {
    const message = formatDashboardExplanation({
      month: "2026-06",
      dashboard: {
        totals: { income: 10000000, expense: 3500000, remaining: 6500000 },
        categoryBreakdown: [{ categoryName: "Ăn uống", amount: 1200000 }],
      },
    });

    expect(message).toContain("Tháng 2026-06");
    expect(message).toContain("Tổng thu nhập: 10000000");
    expect(message).toContain("Ăn uống");
  });
});
```

- [ ] **Step 2: Run finance tool test to verify it fails**

Run:

```bash
pnpm test --runInBand tests/agent-finance-tools.test.ts
```

Expected: FAIL because `src/features/agent/tools/finance.ts` does not exist.

- [ ] **Step 3: Implement finance tools**

Create `src/features/agent/tools/finance.ts`:

```ts
import { getMonthlyDashboard } from "@/features/dashboard/service";
import { db } from "@/lib/db";

const MAX_AGENT_CONTEXT_TRANSACTIONS = 100;

function parseMonthKey(input: string) {
  const match = input.match(/^(\d{4})-(\d{2})$/);
  if (!match) return null;
  return { year: Number(match[1]), monthIndex: Number(match[2]) - 1 };
}

export function formatAgentDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

export async function listAgentCategories(userId: string) {
  return db.category.findMany({
    where: { userId },
    orderBy: [{ type: "asc" }, { name: "asc" }],
    select: { id: true, name: true, type: true },
  });
}

export async function listAgentRecentTransactions(userId: string, month: string) {
  const parts = parseMonthKey(month);
  if (!parts) throw new Error(`Invalid month key: ${month}`);

  const start = new Date(Date.UTC(parts.year, parts.monthIndex - 5, 1));
  const end = new Date(Date.UTC(parts.year, parts.monthIndex + 1, 1));

  const transactions = await db.transaction.findMany({
    where: {
      userId,
      transactionDate: { gte: start, lt: end },
    },
    include: { category: true },
    orderBy: [{ transactionDate: "desc" }, { createdAt: "desc" }],
    take: MAX_AGENT_CONTEXT_TRANSACTIONS,
  });

  return transactions.map((transaction) => ({
    id: transaction.id,
    date: formatAgentDate(transaction.transactionDate),
    type: transaction.type,
    amount: transaction.amount,
    categoryName: transaction.category.name,
    merchant: transaction.merchant,
    note: transaction.note,
  }));
}

export async function buildAgentFinanceContext(userId: string, month: string) {
  const [dashboard, categories, transactions] = await Promise.all([
    getMonthlyDashboard(userId, month),
    listAgentCategories(userId),
    listAgentRecentTransactions(userId, month),
  ]);

  return { month, dashboard, categories, transactions };
}

export function formatDashboardExplanation({
  month,
  dashboard,
}: {
  month: string;
  dashboard: {
    totals: { income: number; expense: number; remaining: number };
    categoryBreakdown: Array<{ categoryName: string; amount: number }>;
  };
}) {
  return [
    `Tháng ${month}`,
    `Tổng thu nhập: ${dashboard.totals.income}`,
    `Tổng chi tiêu: ${dashboard.totals.expense}`,
    `Còn lại: ${dashboard.totals.remaining}`,
    "Chi theo danh mục:",
    JSON.stringify(dashboard.categoryBreakdown),
  ].join("\n");
}
```

- [ ] **Step 4: Run finance tool test**

Run:

```bash
pnpm test --runInBand tests/agent-finance-tools.test.ts
```

Expected: PASS `tests/agent-finance-tools.test.ts`.

- [ ] **Step 5: Commit finance tools**

```bash
git add src/features/agent/tools/finance.ts tests/agent-finance-tools.test.ts
git commit -m "feat: add agent finance tools"
```

---

### Task 4: Transaction Tools

**Files:**
- Create: `tests/agent-transaction-tools.test.ts`
- Create: `src/features/agent/tools/transactions.ts`

- [ ] **Step 1: Write failing transaction tool tests**

Create `tests/agent-transaction-tools.test.ts`:

```ts
import {
  createAgentTransaction,
  deleteAgentTransaction,
  searchAgentTransactions,
  updateAgentTransaction,
} from "@/features/agent/tools/transactions";
import {
  createTransaction,
  deleteTransaction,
  updateTransaction,
} from "@/features/transactions/service";
import { db } from "@/lib/db";

jest.mock("@/features/transactions/service", () => ({
  createTransaction: jest.fn(),
  updateTransaction: jest.fn(),
  deleteTransaction: jest.fn(),
}));

jest.mock("@/lib/db", () => ({
  db: {
    category: { findMany: jest.fn() },
    transaction: { findMany: jest.fn() },
  },
}));

const categoryFindManyMock = db.category.findMany as jest.Mock;
const transactionFindManyMock = db.transaction.findMany as jest.Mock;
const createTransactionMock = createTransaction as jest.Mock;
const updateTransactionMock = updateTransaction as jest.Mock;
const deleteTransactionMock = deleteTransaction as jest.Mock;

const tx = {
  id: "tx_1",
  type: "expense",
  amount: 55000,
  transactionDate: new Date("2026-06-04T00:00:00.000Z"),
  merchant: "Quán cơm",
  note: "Cơm trưa",
  categoryId: "cat_food",
  category: { name: "Ăn uống" },
};

describe("agent transaction tools", () => {
  beforeEach(() => {
    categoryFindManyMock.mockReset();
    transactionFindManyMock.mockReset();
    createTransactionMock.mockReset();
    updateTransactionMock.mockReset();
    deleteTransactionMock.mockReset();

    categoryFindManyMock.mockResolvedValue([
      { id: "cat_food", name: "Ăn uống", type: "expense" },
      { id: "cat_income", name: "Thu nhập", type: "income" },
    ]);
    transactionFindManyMock.mockResolvedValue([tx]);
  });

  it("searches transactions and maps summaries", async () => {
    const result = await searchAgentTransactions("user_1", "2026-06", {
      query: "ăn uống 55k",
      categoryName: "Ăn uống",
      minAmount: 50000,
    });

    expect(transactionFindManyMock).toHaveBeenCalled();
    expect(result.transactions).toEqual([
      {
        id: "tx_1",
        date: "2026-06-04",
        type: "expense",
        amount: 55000,
        categoryName: "Ăn uống",
        merchant: "Quán cơm",
        note: "Cơm trưa",
      },
    ]);
  });

  it("creates a transaction through the existing service", async () => {
    createTransactionMock.mockResolvedValue({ ok: true, transaction: tx });

    const result = await createAgentTransaction("user_1", {
      type: "expense",
      amount: 55000,
      categoryName: "Ăn uống",
      note: "Cơm trưa",
      merchant: "Quán cơm",
      transactionDate: "2026-06-04",
    });

    expect(createTransactionMock).toHaveBeenCalledWith("user_1", {
      type: "expense",
      amount: 55000,
      categoryId: "cat_food",
      note: "Cơm trưa",
      merchant: "Quán cơm",
      rawInput: "Cơm trưa",
      transactionDate: new Date("2026-06-04T00:00:00.000Z"),
    });
    expect(result.ok).toBe(true);
  });

  it("asks for clarification when update target matches multiple transactions", async () => {
    transactionFindManyMock.mockResolvedValue([
      tx,
      { ...tx, id: "tx_2", amount: 70000, note: "Bún bò" },
    ]);

    const result = await updateAgentTransaction("user_1", "2026-06", {
      targetQuery: "ăn trưa hôm nay",
      updates: { amount: 60000 },
    });

    expect(result.ok).toBe(false);
    expect(result.reason).toBe("clarification_required");
    expect(updateTransactionMock).not.toHaveBeenCalled();
  });

  it("updates a single matched transaction", async () => {
    updateTransactionMock.mockResolvedValue({
      ok: true,
      transaction: { ...tx, amount: 60000 },
    });

    const result = await updateAgentTransaction("user_1", "2026-06", {
      targetQuery: "cơm trưa",
      updates: { amount: 60000 },
    });

    expect(updateTransactionMock).toHaveBeenCalledWith("user_1", "tx_1", {
      amount: 60000,
    });
    expect(result.ok).toBe(true);
  });

  it("deletes a single matched transaction", async () => {
    deleteTransactionMock.mockResolvedValue(true);

    const result = await deleteAgentTransaction("user_1", "2026-06", {
      targetQuery: "cơm trưa",
    });

    expect(deleteTransactionMock).toHaveBeenCalledWith("user_1", "tx_1");
    expect(result.ok).toBe(true);
  });
});
```

- [ ] **Step 2: Run transaction tool test to verify it fails**

Run:

```bash
pnpm test --runInBand tests/agent-transaction-tools.test.ts
```

Expected: FAIL because `src/features/agent/tools/transactions.ts` does not exist.

- [ ] **Step 3: Implement transaction tools**

Create `src/features/agent/tools/transactions.ts`:

```ts
import type {
  AgentCreateInput,
  AgentDeleteInput,
  AgentSearchInput,
  AgentTransactionSummary,
  AgentUpdateInput,
} from "@/features/agent/schemas";
import { formatAgentDate } from "@/features/agent/tools/finance";
import {
  createTransaction,
  deleteTransaction,
  updateTransaction,
} from "@/features/transactions/service";
import { db } from "@/lib/db";

type AgentCategory = {
  id: string;
  name: string;
  type: "income" | "expense" | null;
};

type TransactionWithCategory = {
  id: string;
  type: "income" | "expense";
  amount: number;
  transactionDate: Date;
  merchant: string | null;
  note: string;
  categoryId: string;
  category: { name: string };
};

function normalizeName(value: string) {
  return value.trim().toLocaleLowerCase("vi-VN");
}

function parseMonthKey(input: string) {
  const match = input.match(/^(\d{4})-(\d{2})$/);
  if (!match) return null;
  return { year: Number(match[1]), monthIndex: Number(match[2]) - 1 };
}

function getMonthRange(month: string) {
  const parts = parseMonthKey(month);
  if (!parts) throw new Error(`Invalid month key: ${month}`);

  return {
    start: new Date(Date.UTC(parts.year, parts.monthIndex, 1)),
    end: new Date(Date.UTC(parts.year, parts.monthIndex + 1, 1)),
  };
}

function toSummary(transaction: TransactionWithCategory): AgentTransactionSummary {
  return {
    id: transaction.id,
    date: formatAgentDate(transaction.transactionDate),
    type: transaction.type,
    amount: transaction.amount,
    categoryName: transaction.category.name,
    merchant: transaction.merchant,
    note: transaction.note,
  };
}

function candidateLabel(transaction: AgentTransactionSummary) {
  return [
    `${transaction.amount} đ`,
    transaction.categoryName,
    transaction.date,
    transaction.merchant,
    transaction.note,
  ]
    .filter(Boolean)
    .join(", ");
}

async function listCategories(userId: string): Promise<AgentCategory[]> {
  return db.category.findMany({
    where: { userId },
    orderBy: [{ type: "asc" }, { name: "asc" }],
    select: { id: true, name: true, type: true },
  });
}

function resolveCategory(
  categories: AgentCategory[],
  type: "income" | "expense",
  categoryName: string,
) {
  const normalized = normalizeName(categoryName);
  const typed = categories.filter(
    (category) => !category.type || category.type === type,
  );

  return (
    typed.find((category) => normalizeName(category.name) === normalized) ??
    typed.find((category) =>
      normalizeName(category.name).includes(normalized),
    ) ??
    typed.find((category) =>
      normalizeName(category.name) === (type === "income" ? "thu nhập" : "khác"),
    ) ??
    typed[0]
  );
}

export async function searchAgentTransactions(
  userId: string,
  selectedMonth: string,
  input: AgentSearchInput,
) {
  const month = input.month ?? selectedMonth;
  const { start, end } = getMonthRange(month);
  const transactions = (await db.transaction.findMany({
    where: {
      userId,
      transactionDate: { gte: start, lt: end },
      ...(input.type ? { type: input.type } : {}),
      ...(input.minAmount || input.maxAmount
        ? {
            amount: {
              ...(input.minAmount ? { gte: input.minAmount } : {}),
              ...(input.maxAmount ? { lte: input.maxAmount } : {}),
            },
          }
        : {}),
    },
    include: { category: true },
    orderBy: [{ transactionDate: "desc" }, { createdAt: "desc" }],
    take: 50,
  })) as TransactionWithCategory[];

  const categoryTerm = input.categoryName ? normalizeName(input.categoryName) : "";
  const merchantTerm = input.merchant ? normalizeName(input.merchant) : "";
  const textTerm = normalizeName(input.text ?? input.query);

  const filtered = transactions.filter((transaction) => {
    const haystack = normalizeName(
      [
        transaction.category.name,
        transaction.merchant ?? "",
        transaction.note,
        String(transaction.amount),
      ].join(" "),
    );

    if (categoryTerm && !normalizeName(transaction.category.name).includes(categoryTerm)) {
      return false;
    }

    if (merchantTerm && !normalizeName(transaction.merchant ?? "").includes(merchantTerm)) {
      return false;
    }

    return textTerm
      .split(/\s+/)
      .filter((part) => part.length >= 2)
      .some((part) => haystack.includes(part));
  });

  return { transactions: filtered.slice(0, 8).map(toSummary), total: filtered.length };
}

export async function createAgentTransaction(
  userId: string,
  input: AgentCreateInput,
) {
  const category = resolveCategory(
    await listCategories(userId),
    input.type,
    input.categoryName,
  );

  if (!category) return { ok: false as const, reason: "missing_category" as const };

  return createTransaction(userId, {
    type: input.type,
    amount: input.amount,
    categoryId: category.id,
    note: input.note,
    merchant: input.merchant ?? undefined,
    rawInput: input.note,
    transactionDate: new Date(`${input.transactionDate}T00:00:00.000Z`),
  });
}

async function findTargetCandidates(
  userId: string,
  month: string,
  targetQuery: string,
  transactionId?: string,
) {
  if (transactionId) {
    const direct = (await db.transaction.findMany({
      where: { userId, id: transactionId },
      include: { category: true },
      take: 1,
    })) as TransactionWithCategory[];
    return direct.map(toSummary);
  }

  const result = await searchAgentTransactions(userId, month, {
    query: targetQuery,
    text: targetQuery,
  });

  return result.transactions;
}

export async function updateAgentTransaction(
  userId: string,
  month: string,
  input: AgentUpdateInput,
) {
  const candidates = await findTargetCandidates(
    userId,
    month,
    input.targetQuery,
    input.transactionId,
  );

  if (candidates.length !== 1) {
    return {
      ok: false as const,
      reason: "clarification_required" as const,
      candidates: candidates.map((candidate) => ({
        id: candidate.id,
        label: candidateLabel(candidate),
      })),
    };
  }

  const categories = await listCategories(userId);
  const category = input.updates.categoryName
    ? resolveCategory(categories, input.updates.type ?? candidates[0].type, input.updates.categoryName)
    : null;

  if (input.updates.categoryName && !category) {
    return { ok: false as const, reason: "missing_category" as const };
  }

  const result = await updateTransaction(userId, candidates[0].id, {
    ...(input.updates.type ? { type: input.updates.type } : {}),
    ...(input.updates.amount ? { amount: input.updates.amount } : {}),
    ...(category ? { categoryId: category.id } : {}),
    ...(input.updates.note ? { note: input.updates.note } : {}),
    ...(input.updates.merchant !== undefined
      ? { merchant: input.updates.merchant ?? undefined }
      : {}),
    ...(input.updates.transactionDate
      ? { transactionDate: new Date(`${input.updates.transactionDate}T00:00:00.000Z`) }
      : {}),
  });

  return result.ok
    ? { ok: true as const, transaction: result.transaction }
    : result;
}

export async function deleteAgentTransaction(
  userId: string,
  month: string,
  input: AgentDeleteInput,
) {
  const candidates = await findTargetCandidates(
    userId,
    month,
    input.targetQuery,
    input.transactionId,
  );

  if (candidates.length !== 1) {
    return {
      ok: false as const,
      reason: "clarification_required" as const,
      candidates: candidates.map((candidate) => ({
        id: candidate.id,
        label: candidateLabel(candidate),
      })),
    };
  }

  const deleted = await deleteTransaction(userId, candidates[0].id);

  if (!deleted) {
    return { ok: false as const, reason: "not_found" as const };
  }

  return { ok: true as const, transaction: candidates[0] };
}
```

- [ ] **Step 4: Run transaction tool test**

Run:

```bash
pnpm test --runInBand tests/agent-transaction-tools.test.ts
```

Expected: PASS `tests/agent-transaction-tools.test.ts`.

- [ ] **Step 5: Commit transaction tools**

```bash
git add src/features/agent/tools/transactions.ts tests/agent-transaction-tools.test.ts
git commit -m "feat: add agent transaction tools"
```

---

### Task 5: Agent Service

**Files:**
- Create: `tests/agent-service.test.ts`
- Create: `src/features/agent/service.ts`

- [ ] **Step 1: Write failing service tests**

Create `tests/agent-service.test.ts`:

```ts
import { generateAgentResponse } from "@/features/agent/service";
import { createOpenAiCompatibleChat } from "@/features/ai/openai-compatible";
import { buildAgentFinanceContext } from "@/features/agent/tools/finance";
import {
  createAgentTransaction,
  deleteAgentTransaction,
  searchAgentTransactions,
  updateAgentTransaction,
} from "@/features/agent/tools/transactions";

jest.mock("@/features/ai/openai-compatible", () => ({
  createOpenAiCompatibleChat: jest.fn(),
}));

jest.mock("@/features/agent/tools/finance", () => ({
  buildAgentFinanceContext: jest.fn(),
  formatDashboardExplanation: jest.fn(() => "Dashboard tháng 2026-06"),
}));

jest.mock("@/features/agent/tools/transactions", () => ({
  createAgentTransaction: jest.fn(),
  deleteAgentTransaction: jest.fn(),
  searchAgentTransactions: jest.fn(),
  updateAgentTransaction: jest.fn(),
}));

const chatMock = createOpenAiCompatibleChat as jest.Mock;
const contextMock = buildAgentFinanceContext as jest.Mock;
const searchMock = searchAgentTransactions as jest.Mock;
const createMock = createAgentTransaction as jest.Mock;
const updateMock = updateAgentTransaction as jest.Mock;
const deleteMock = deleteAgentTransaction as jest.Mock;

const providerSetting = {
  baseUrl: "https://openrouter.ai/api/v1",
  apiKey: "sk-test",
  model: "openai/gpt-4o-mini",
};

describe("agent service", () => {
  beforeEach(() => {
    chatMock.mockReset();
    contextMock.mockReset();
    searchMock.mockReset();
    createMock.mockReset();
    updateMock.mockReset();
    deleteMock.mockReset();

    contextMock.mockResolvedValue({
      month: "2026-06",
      dashboard: {
        totals: { income: 10000000, expense: 3500000, remaining: 6500000 },
        categoryBreakdown: [{ categoryName: "Ăn uống", amount: 1200000 }],
      },
      categories: [{ id: "cat_food", name: "Ăn uống", type: "expense" }],
      transactions: [],
    });
  });

  it("answers app data questions", async () => {
    chatMock.mockResolvedValue(
      JSON.stringify({
        resultType: "answer",
        tool: "finance.answerContext",
        message: "Bạn chi nhiều nhất cho ăn uống.",
        input: { question: "Tôi chi gì nhiều nhất?" },
      }),
    );

    await expect(
      generateAgentResponse(
        "user_1",
        {
          month: "2026-06",
          providerSetting,
          messages: [{ role: "user", content: "Tôi chi gì nhiều nhất?" }],
        },
        providerSetting,
      ),
    ).resolves.toEqual({
      message: { role: "assistant", content: "Bạn chi nhiều nhất cho ăn uống." },
      resultType: "answer",
    });
  });

  it("returns search results", async () => {
    chatMock.mockResolvedValue(
      JSON.stringify({
        resultType: "search_results",
        tool: "transactions.search",
        message: "Mình tìm thấy 1 giao dịch.",
        input: { query: "ăn uống trên 50k", categoryName: "Ăn uống", minAmount: 50000 },
      }),
    );
    searchMock.mockResolvedValue({
      total: 1,
      transactions: [
        {
          id: "tx_1",
          date: "2026-06-04",
          type: "expense",
          amount: 55000,
          categoryName: "Ăn uống",
          merchant: "Quán cơm",
          note: "Cơm trưa",
        },
      ],
    });

    const result = await generateAgentResponse(
      "user_1",
      {
        month: "2026-06",
        providerSetting,
        messages: [{ role: "user", content: "Tìm ăn uống trên 50k" }],
      },
      providerSetting,
    );

    expect(searchMock).toHaveBeenCalledWith("user_1", "2026-06", {
      query: "ăn uống trên 50k",
      categoryName: "Ăn uống",
      minAmount: 50000,
    });
    expect(result.resultType).toBe("search_results");
    expect(result.transactions).toHaveLength(1);
  });

  it("creates a transaction directly", async () => {
    chatMock.mockResolvedValue(
      JSON.stringify({
        resultType: "transaction_created",
        tool: "transactions.create",
        message: "Đã thêm giao dịch cơm trưa 55.000 đ.",
        input: {
          type: "expense",
          amount: 55000,
          categoryName: "Ăn uống",
          note: "Cơm trưa",
          merchant: "Quán cơm",
          transactionDate: "2026-06-04",
        },
      }),
    );
    createMock.mockResolvedValue({
      ok: true,
      transaction: { id: "tx_1" },
    });

    const result = await generateAgentResponse(
      "user_1",
      {
        month: "2026-06",
        providerSetting,
        messages: [{ role: "user", content: "Thêm 55k cơm trưa hôm nay" }],
      },
      providerSetting,
    );

    expect(createMock).toHaveBeenCalled();
    expect(result).toMatchObject({
      resultType: "transaction_created",
      action: { type: "create", transactionId: "tx_1" },
    });
  });

  it("asks for clarification when update target is ambiguous", async () => {
    chatMock.mockResolvedValue(
      JSON.stringify({
        resultType: "transaction_updated",
        tool: "transactions.update",
        message: "Mình tìm thấy nhiều giao dịch.",
        input: { targetQuery: "ăn trưa hôm nay", updates: { amount: 60000 } },
      }),
    );
    updateMock.mockResolvedValue({
      ok: false,
      reason: "clarification_required",
      candidates: [{ id: "tx_1", label: "55.000 đ, Ăn uống, 2026-06-04" }],
    });

    const result = await generateAgentResponse(
      "user_1",
      {
        month: "2026-06",
        providerSetting,
        messages: [{ role: "user", content: "Sửa ăn trưa thành 60k" }],
      },
      providerSetting,
    );

    expect(result.resultType).toBe("clarification_required");
    expect(result.clarification?.candidates).toHaveLength(1);
  });

  it("deletes a single matched transaction", async () => {
    chatMock.mockResolvedValue(
      JSON.stringify({
        resultType: "transaction_deleted",
        tool: "transactions.delete",
        message: "Đã xóa giao dịch cơm trưa.",
        input: { targetQuery: "cơm trưa hôm nay" },
      }),
    );
    deleteMock.mockResolvedValue({
      ok: true,
      transaction: { id: "tx_1", note: "Cơm trưa" },
    });

    const result = await generateAgentResponse(
      "user_1",
      {
        month: "2026-06",
        providerSetting,
        messages: [{ role: "user", content: "Xóa cơm trưa hôm nay" }],
      },
      providerSetting,
    );

    expect(deleteMock).toHaveBeenCalled();
    expect(result).toMatchObject({
      resultType: "transaction_deleted",
      action: { type: "delete", transactionId: "tx_1" },
    });
  });
});
```

- [ ] **Step 2: Run service test to verify it fails**

Run:

```bash
pnpm test --runInBand tests/agent-service.test.ts
```

Expected: FAIL because `src/features/agent/service.ts` does not exist.

- [ ] **Step 3: Implement service**

Create `src/features/agent/service.ts`:

```ts
import { AiDomainError } from "@/features/ai/errors";
import { createOpenAiCompatibleChat } from "@/features/ai/openai-compatible";
import { assertSafeAiProviderSetting } from "@/features/ai/provider-security";
import type { AiProviderSettingInput } from "@/features/ai/schemas";
import { parseAgentJsonObject } from "@/features/agent/json";
import type { AgentRequest, AgentResponse } from "@/features/agent/schemas";
import { agentIntentSchema } from "@/features/agent/schemas";
import {
  buildAgentFinanceContext,
  formatDashboardExplanation,
} from "@/features/agent/tools/finance";
import {
  createAgentTransaction,
  deleteAgentTransaction,
  searchAgentTransactions,
  updateAgentTransaction,
} from "@/features/agent/tools/transactions";
import { revalidateTransactionViews } from "@/features/transactions/revalidation";

function buildSystemPrompt() {
  return [
    "Bạn là MoneyMind Agent, trợ lý tài chính cá nhân cho người dùng Việt Nam.",
    "Chỉ dùng dữ liệu app được cung cấp. Không bịa giao dịch, danh mục, số dư hoặc xu hướng.",
    "Không đưa lời khuyên đầu tư, cam kết lợi nhuận hoặc khuyến nghị sản phẩm tài chính.",
    "Bạn phải chọn đúng một tool và trả về một JSON object duy nhất.",
    "Các tool được phép:",
    "- finance.answerContext: hỏi đáp dữ liệu app hoặc gợi ý hành động không ghi dữ liệu.",
    "- dashboard.explain: giải thích dashboard tháng đang chọn.",
    "- transactions.search: lọc hoặc tìm giao dịch bằng ngôn ngữ tự nhiên.",
    "- categories.list: trả lời về danh mục hiện có.",
    "- transactions.create: tạo một giao dịch khi thông tin đủ rõ.",
    "- transactions.update: sửa một giao dịch khi mục tiêu đủ rõ.",
    "- transactions.delete: xóa một giao dịch khi mục tiêu đủ rõ.",
    "Nếu sửa hoặc xóa có thể mơ hồ, vẫn chọn transactions.update/delete với targetQuery rõ nhất; server sẽ hỏi lại khi tìm nhiều ứng viên.",
    "Dạng JSON:",
    '{"resultType":"answer|search_results|suggestion|dashboard_explanation|transaction_created|transaction_updated|transaction_deleted","tool":"tool.name","message":"câu trả lời tiếng Việt","input":{}}',
  ].join("\n");
}

function buildContextPrompt(context: Awaited<ReturnType<typeof buildAgentFinanceContext>>) {
  return [
    `Tháng đang chọn: ${context.month}`,
    "Dashboard:",
    JSON.stringify(context.dashboard),
    "Danh mục:",
    JSON.stringify(
      context.categories.map((category) => ({
        id: category.id,
        name: category.name,
        type: category.type,
      })),
    ),
    "Giao dịch gần đây:",
    JSON.stringify(context.transactions),
  ].join("\n");
}

function transactionIdFromResult(result: unknown) {
  if (
    result &&
    typeof result === "object" &&
    "transaction" in result &&
    result.transaction &&
    typeof result.transaction === "object" &&
    "id" in result.transaction &&
    typeof result.transaction.id === "string"
  ) {
    return result.transaction.id;
  }

  return undefined;
}

function clarificationResponse(
  message: string,
  candidates: Array<{ id: string; label: string }> | undefined,
): AgentResponse {
  return {
    message: { role: "assistant", content: message },
    resultType: "clarification_required",
    clarification: {
      question: message,
      ...(candidates ? { candidates } : {}),
    },
  };
}

export async function generateAgentResponse(
  userId: string,
  input: AgentRequest,
  setting: AiProviderSettingInput,
): Promise<AgentResponse> {
  const providerSetting = assertSafeAiProviderSetting(setting);
  const context = await buildAgentFinanceContext(userId, input.month);
  const providerContent = await createOpenAiCompatibleChat({
    baseUrl: providerSetting.baseUrl,
    apiKey: providerSetting.apiKey,
    model: providerSetting.model,
    timeoutMs: 45000,
    messages: [
      { role: "system", content: buildSystemPrompt() },
      { role: "user", content: buildContextPrompt(context) },
      ...input.messages,
    ],
  });

  const parsed = agentIntentSchema.safeParse(
    parseAgentJsonObject(providerContent),
  );

  if (!parsed.success) {
    throw new AiDomainError("provider_invalid_response");
  }

  const intent = parsed.data;

  if (intent.tool === "transactions.search") {
    const result = await searchAgentTransactions(userId, input.month, intent.input);
    return {
      message: { role: "assistant", content: intent.message },
      resultType: "search_results",
      transactions: result.transactions,
    };
  }

  if (intent.tool === "transactions.create") {
    const result = await createAgentTransaction(userId, intent.input);
    if (!result.ok) throw new AiDomainError("provider_invalid_response");
    revalidateTransactionViews();
    return {
      message: { role: "assistant", content: intent.message },
      resultType: "transaction_created",
      action: { type: "create", transactionId: transactionIdFromResult(result) },
    };
  }

  if (intent.tool === "transactions.update") {
    const result = await updateAgentTransaction(userId, input.month, intent.input);
    if (!result.ok && result.reason === "clarification_required") {
      return clarificationResponse(intent.message, result.candidates);
    }
    if (!result.ok) throw new AiDomainError("provider_invalid_response");
    revalidateTransactionViews();
    return {
      message: { role: "assistant", content: intent.message },
      resultType: "transaction_updated",
      action: { type: "update", transactionId: transactionIdFromResult(result) },
    };
  }

  if (intent.tool === "transactions.delete") {
    const result = await deleteAgentTransaction(userId, input.month, intent.input);
    if (!result.ok && result.reason === "clarification_required") {
      return clarificationResponse(intent.message, result.candidates);
    }
    if (!result.ok) throw new AiDomainError("provider_invalid_response");
    revalidateTransactionViews();
    return {
      message: { role: "assistant", content: intent.message },
      resultType: "transaction_deleted",
      action: { type: "delete", transactionId: result.transaction.id },
    };
  }

  if (intent.tool === "dashboard.explain") {
    return {
      message: {
        role: "assistant",
        content: `${intent.message}\n\n${formatDashboardExplanation(context)}`,
      },
      resultType: "dashboard_explanation",
    };
  }

  return {
    message: { role: "assistant", content: intent.message },
    resultType: intent.resultType,
  };
}
```

- [ ] **Step 4: Run service test**

Run:

```bash
pnpm test --runInBand tests/agent-service.test.ts
```

Expected: PASS `tests/agent-service.test.ts`.

- [ ] **Step 5: Commit service**

```bash
git add src/features/agent/service.ts tests/agent-service.test.ts
git commit -m "feat: add agent service"
```

---

### Task 6: Agent API Route

**Files:**
- Create: `tests/agent-route.test.ts`
- Create: `src/app/api/agent/route.ts`

- [ ] **Step 1: Write failing route tests**

Create `tests/agent-route.test.ts`:

```ts
import { POST } from "@/app/api/agent/route";
import { generateAgentResponse } from "@/features/agent/service";
import { getRequiredApiUser } from "@/lib/api";

jest.mock("@/lib/api", () => ({
  getRequiredApiUser: jest.fn(),
  jsonBadRequest: (error = "Bad request") =>
    Response.json({ error }, { status: 400 }),
  jsonError: (error: string, status: number) =>
    Response.json({ error }, { status }),
  jsonUnauthorized: () =>
    Response.json({ error: "Unauthorized" }, { status: 401 }),
}));

jest.mock("@/features/agent/service", () => ({
  generateAgentResponse: jest.fn(),
}));

const getRequiredApiUserMock = getRequiredApiUser as jest.Mock;
const generateAgentResponseMock = generateAgentResponse as jest.Mock;
const originalResponse = global.Response;

beforeAll(() => {
  global.Response = {
    json: (body: unknown, init?: ResponseInit) => ({
      json: async () => body,
      status: init?.status ?? 200,
    }),
  } as unknown as typeof Response;
});

afterAll(() => {
  global.Response = originalResponse;
});

describe("agent route", () => {
  beforeEach(() => {
    getRequiredApiUserMock.mockResolvedValue({ id: "user_1" });
    generateAgentResponseMock.mockReset();
    generateAgentResponseMock.mockResolvedValue({
      message: { role: "assistant", content: "Bạn chi nhiều nhất cho ăn uống." },
      resultType: "answer",
    });
  });

  it("returns unauthorized without a user", async () => {
    getRequiredApiUserMock.mockResolvedValue(null);

    const response = await POST({
      json: async () => ({}),
    } as Request);

    expect(response.status).toBe(401);
    expect(generateAgentResponseMock).not.toHaveBeenCalled();
  });

  it("returns bad request when request JSON is malformed", async () => {
    const response = await POST({
      json: async () => {
        throw new SyntaxError("bad json");
      },
    } as Request);

    expect(response.status).toBe(400);
    expect(generateAgentResponseMock).not.toHaveBeenCalled();
  });

  it("rejects unsafe provider base URLs before calling service", async () => {
    const response = await POST({
      json: async () => ({
        month: "2026-06",
        providerSetting: {
          baseUrl: "http://127.0.0.1:11434/v1",
          apiKey: "sk-local",
          model: "local",
        },
        messages: [{ role: "user", content: "Tôi chi gì nhiều nhất?" }],
      }),
    } as Request);

    expect(response.status).toBe(400);
    expect(generateAgentResponseMock).not.toHaveBeenCalled();
  });

  it("returns agent response", async () => {
    const requestBody = {
      month: "2026-06",
      providerSetting: {
        baseUrl: "https://openrouter.ai/api/v1",
        apiKey: "sk-test",
        model: "openai/gpt-4o-mini",
      },
      messages: [{ role: "user", content: "Tôi chi gì nhiều nhất?" }],
    };

    const response = await POST({
      json: async () => requestBody,
    } as Request);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.resultType).toBe("answer");
    expect(generateAgentResponseMock).toHaveBeenCalledWith(
      "user_1",
      expect.objectContaining({ month: "2026-06" }),
      expect.objectContaining({ model: "openai/gpt-4o-mini" }),
    );
  });
});
```

- [ ] **Step 2: Run route test to verify it fails**

Run:

```bash
pnpm test --runInBand tests/agent-route.test.ts
```

Expected: FAIL because `src/app/api/agent/route.ts` does not exist.

- [ ] **Step 3: Implement route**

Create `src/app/api/agent/route.ts`:

```ts
import { getAiErrorMessage, isAiDomainError } from "@/features/ai/errors";
import { assertSafeAiProviderSetting } from "@/features/ai/provider-security";
import { agentRequestSchema } from "@/features/agent/schemas";
import { generateAgentResponse } from "@/features/agent/service";
import {
  getRequiredApiUser,
  jsonBadRequest,
  jsonError,
  jsonUnauthorized,
} from "@/lib/api";

export const maxDuration = 60;

export async function POST(request: Request) {
  const user = await getRequiredApiUser();

  if (!user) {
    return jsonUnauthorized();
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return jsonBadRequest();
  }

  const parsed = agentRequestSchema.safeParse(body);

  if (!parsed.success) {
    return jsonBadRequest();
  }

  try {
    const providerSetting = assertSafeAiProviderSetting(
      parsed.data.providerSetting,
    );
    const response = await generateAgentResponse(
      user.id,
      parsed.data,
      providerSetting,
    );

    return Response.json(response);
  } catch (error) {
    if (isAiDomainError(error)) {
      return jsonError(getAiErrorMessage(error.code), 400);
    }

    throw error;
  }
}
```

- [ ] **Step 4: Run route test**

Run:

```bash
pnpm test --runInBand tests/agent-route.test.ts
```

Expected: PASS `tests/agent-route.test.ts`.

- [ ] **Step 5: Commit route**

```bash
git add src/app/api/agent/route.ts tests/agent-route.test.ts
git commit -m "feat: add agent api route"
```

---

### Task 7: Migrate Chat UI To `/api/agent`

**Files:**
- Modify: `src/features/ai-chat/widget.tsx`
- Modify: `tests/ai-chat-widget-client.test.ts`
- Modify: `tests/ai-chat-widget.test.ts`

- [ ] **Step 1: Update UI tests first**

Modify `tests/ai-chat-widget-client.test.ts` by adding this test inside the existing `describe("AiChatWidget", ...)` block:

```ts
  it("posts chat messages to the agent route", async () => {
    readLocalAiProviderSettingMock.mockReturnValue({
      baseUrl: "https://openrouter.ai/api/v1",
      apiKey: "sk-test",
      model: "openai/gpt-4o-mini",
    });
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        message: { role: "assistant", content: "Bạn chi nhiều nhất cho ăn uống." },
        resultType: "answer",
      }),
    });

    act(() => {
      root.render(React.createElement(AiChatWidget, { categories: [] }));
    });

    await act(async () => {
      container
        .querySelector<HTMLButtonElement>('[aria-label="Mở chat AI"]')
        ?.click();
    });

    const input = container.querySelector<HTMLTextAreaElement>("textarea")!;

    await act(async () => {
      changeField(input, "Tôi chi gì nhiều nhất?");
      container
        .querySelector<HTMLButtonElement>('[aria-label="Gửi tin nhắn"]')
        ?.click();
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/agent",
      expect.objectContaining({ method: "POST" }),
    );
  });
```

Add a second test for clarification rendering:

```ts
  it("renders clarification candidates from agent responses", async () => {
    readLocalAiProviderSettingMock.mockReturnValue({
      baseUrl: "https://openrouter.ai/api/v1",
      apiKey: "sk-test",
      model: "openai/gpt-4o-mini",
    });
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        message: { role: "assistant", content: "Bạn muốn xóa giao dịch nào?" },
        resultType: "clarification_required",
        clarification: {
          question: "Bạn muốn xóa giao dịch nào?",
          candidates: [{ id: "tx_1", label: "55.000 đ, Ăn uống, 2026-06-04" }],
        },
      }),
    });

    act(() => {
      root.render(React.createElement(AiChatWidget, { categories: [] }));
    });

    await act(async () => {
      container
        .querySelector<HTMLButtonElement>('[aria-label="Mở chat AI"]')
        ?.click();
    });

    await act(async () => {
      changeField(container.querySelector<HTMLTextAreaElement>("textarea")!, "Xóa ăn trưa");
      container
        .querySelector<HTMLButtonElement>('[aria-label="Gửi tin nhắn"]')
        ?.click();
    });

    expect(container.textContent).toContain("55.000 đ, Ăn uống, 2026-06-04");
  });
```

- [ ] **Step 2: Run UI test to verify it fails**

Run:

```bash
pnpm test --runInBand tests/ai-chat-widget-client.test.ts
```

Expected: FAIL because the widget still calls `/api/ai/chat` and does not render clarification candidates.

- [ ] **Step 3: Update widget types and fetch endpoint**

Modify `src/features/ai-chat/widget.tsx`:

- Replace the imported response type:

```ts
import type { AgentResponse } from "@/features/agent/schemas";
```

- Keep the existing draft type import only if TypeScript still needs it for legacy message fields.
- Change fetch URL:

```ts
const response = await fetch("/api/agent", {
```

- Change payload cast:

```ts
const payload = (await response.json()) as AgentResponse;
```

- Extend the local chat entry type near the current `ChatEntry` definition:

```ts
type ChatEntry = AiChatMessage & {
  draft?: AiChatTransactionDraft;
  transactions?: AgentResponse["transactions"];
  clarification?: AgentResponse["clarification"];
  resultType?: AgentResponse["resultType"];
};
```

- When appending the assistant message, store metadata:

```ts
setMessages((current) => [
  ...current,
  {
    ...payload.message,
    transactions: payload.transactions,
    clarification: payload.clarification,
    resultType: payload.resultType,
  },
]);
```

- In the message bubble render block, after message content, add:

```tsx
{message.transactions?.length ? (
  <div className="mt-3 space-y-2">
    {message.transactions.map((transaction) => (
      <div
        key={transaction.id}
        className="rounded-lg border border-[#E8E4DC] bg-white/80 p-3 text-xs"
      >
        <div className="font-medium">
          {transaction.categoryName} · {transaction.amount.toLocaleString("vi-VN")} đ
        </div>
        <div className="mt-1 text-muted-foreground">
          {transaction.date}
          {transaction.merchant ? ` · ${transaction.merchant}` : ""}
        </div>
        <div className="mt-1">{transaction.note}</div>
      </div>
    ))}
  </div>
) : null}

{message.clarification?.candidates?.length ? (
  <div className="mt-3 space-y-2">
    {message.clarification.candidates.map((candidate) => (
      <Button
        key={candidate.id}
        type="button"
        variant="outline"
        className="h-auto w-full justify-start whitespace-normal rounded-lg px-3 py-2 text-left text-xs"
        onClick={() =>
          sendMessage({
            input: `Tôi chọn giao dịch ${candidate.id}: ${candidate.label}`,
          })
        }
        disabled={pending}
      >
        {candidate.label}
      </Button>
    ))}
  </div>
) : null}
```

- Keep the old draft modal path available if the old `/api/ai/chat` response is still used in tests, but do not add new direct draft flow.

- [ ] **Step 4: Run widget tests**

Run:

```bash
pnpm test --runInBand tests/ai-chat-widget-client.test.ts tests/ai-chat-widget.test.ts
```

Expected: PASS both widget tests.

- [ ] **Step 5: Commit widget migration**

```bash
git add src/features/ai-chat/widget.tsx tests/ai-chat-widget-client.test.ts tests/ai-chat-widget.test.ts
git commit -m "feat: route ai chat through agent"
```

---

### Task 8: Migrate AskMoneyMind Panel

**Files:**
- Modify: `src/features/dashboard/ask-moneymind-panel.tsx`
- Create: `tests/ask-moneymind-panel.test.ts`

- [ ] **Step 1: Write failing dashboard panel test**

Create `tests/ask-moneymind-panel.test.ts`:

```ts
import React from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";

import { readLocalAiProviderSetting } from "@/features/ai/local-settings";
import { AskMoneyMindPanel } from "@/features/dashboard/ask-moneymind-panel";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean })
  .IS_REACT_ACT_ENVIRONMENT = true;

jest.mock("@/features/ai/local-settings", () => ({
  readLocalAiProviderSetting: jest.fn(),
}));

const readLocalAiProviderSettingMock = readLocalAiProviderSetting as jest.Mock;
const fetchMock = jest.fn();

describe("AskMoneyMindPanel", () => {
  let container: HTMLDivElement;
  let root: Root;
  const originalFetch = global.fetch;

  beforeEach(() => {
    readLocalAiProviderSettingMock.mockReset();
    fetchMock.mockReset();
    global.fetch = fetchMock;
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
    global.fetch = originalFetch;
  });

  it("posts prompt questions to the agent route", async () => {
    readLocalAiProviderSettingMock.mockReturnValue({
      baseUrl: "https://openrouter.ai/api/v1",
      apiKey: "sk-test",
      model: "openai/gpt-4o-mini",
    });
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        message: { role: "assistant", content: "Bạn chi nhiều nhất cho ăn uống." },
        resultType: "dashboard_explanation",
      }),
    });

    act(() => {
      root.render(React.createElement(AskMoneyMindPanel, { month: "2026-06" }));
    });

    await act(async () => {
      Array.from(container.querySelectorAll("button"))
        .find((button) => button.textContent?.includes("Tháng này tôi đã chi"))
        ?.click();
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/agent",
      expect.objectContaining({ method: "POST" }),
    );
    expect(container.textContent).toContain("Bạn chi nhiều nhất cho ăn uống.");
  });
});
```

- [ ] **Step 2: Run dashboard panel test to verify it fails**

Run:

```bash
pnpm test --runInBand tests/ask-moneymind-panel.test.ts
```

Expected: FAIL because the panel still calls `/api/ai/chat`.

- [ ] **Step 3: Update panel endpoint and response type**

Modify `src/features/dashboard/ask-moneymind-panel.tsx`:

- Replace:

```ts
import type { AiChatResponse } from "@/features/ai-chat/schemas";
```

with:

```ts
import type { AgentResponse } from "@/features/agent/schemas";
```

- Replace:

```ts
const response = await fetch("/api/ai/chat", {
```

with:

```ts
const response = await fetch("/api/agent", {
```

- Replace:

```ts
const payload = (await response.json()) as AiChatResponse;
```

with:

```ts
const payload = (await response.json()) as AgentResponse;
```

- Keep rendering `payload.message.content` only; `AskMoneyMindPanel` does not need CRUD controls.

- [ ] **Step 4: Run dashboard panel test**

Run:

```bash
pnpm test --runInBand tests/ask-moneymind-panel.test.ts
```

Expected: PASS `tests/ask-moneymind-panel.test.ts`.

- [ ] **Step 5: Commit dashboard panel migration**

```bash
git add src/features/dashboard/ask-moneymind-panel.tsx tests/ask-moneymind-panel.test.ts
git commit -m "feat: route dashboard ai prompts through agent"
```

---

### Task 9: Nearby Regression And Verification

**Files:**
- Modify only if failures require small fixes:
  - `src/features/agent/*.ts`
  - `src/features/agent/tools/*.ts`
  - `src/app/api/agent/route.ts`
  - `src/features/ai-chat/widget.tsx`
  - `src/features/dashboard/ask-moneymind-panel.tsx`

- [ ] **Step 1: Run all agent and AI chat tests**

Run:

```bash
pnpm test --runInBand tests/agent-schemas.test.ts tests/agent-json.test.ts tests/agent-finance-tools.test.ts tests/agent-transaction-tools.test.ts tests/agent-service.test.ts tests/agent-route.test.ts tests/ai-chat-widget-client.test.ts tests/ai-chat-widget.test.ts tests/ask-moneymind-panel.test.ts tests/ai-chat-route.test.ts tests/ai-chat-service.test.ts tests/ai-chat-schemas.test.ts
```

Expected: PASS all listed tests.

- [ ] **Step 2: Run transaction tests**

Run:

```bash
pnpm test --runInBand tests/transactions-route.test.ts tests/transactions-actions.test.ts tests/transactions-schema.test.ts
```

Expected: PASS transaction route/action/schema tests.

- [ ] **Step 3: Run lint**

Run:

```bash
pnpm lint
```

Expected: PASS with no ESLint errors.

- [ ] **Step 4: Run full test suite**

Run:

```bash
pnpm test --runInBand
```

Expected: PASS all discovered Jest tests.

- [ ] **Step 5: Build**

Run:

```bash
pnpm build
```

Expected: PASS Next.js build.

- [ ] **Step 6: Manual runtime check**

Run the dev server if one is not already running:

```bash
pnpm dev
```

Open the authenticated app and verify:

- AI chat opens.
- Sending a general question calls `/api/agent`.
- A natural-language search renders a compact result list.
- A create request creates one transaction and updates transaction-backed views.
- An ambiguous delete request asks the user to choose a transaction.
- Dashboard AskMoneyMind prompt calls `/api/agent`.

- [ ] **Step 7: Commit verification fixes if any**

If verification required code changes, commit only those files:

```bash
git add src/features/agent src/app/api/agent src/features/ai-chat/widget.tsx src/features/dashboard/ask-moneymind-panel.tsx tests
git commit -m "chore: verify agent chat flow"
```

If no fixes were needed, do not create an empty commit.

---

## Self-Review

Spec coverage:

- `/api/agent` route: Task 6.
- Provider-agnostic strict JSON agent flow: Tasks 1, 2, and 5.
- App-data questions, suggestions, dashboard explanation: Tasks 3 and 5.
- Natural-language transaction search: Tasks 4, 5, and 7.
- Direct create/update/delete transaction actions: Tasks 4 and 5.
- Clarification on ambiguous update/delete: Tasks 4, 5, and 7.
- Reuse existing provider and transaction service boundaries: Tasks 4, 5, and 6.
- UI migration for chat and AskMoneyMind: Tasks 7 and 8.
- Route, service, schema, UI, and regression tests: Tasks 1 through 9.

Type consistency:

- Public request and response types are defined in `src/features/agent/schemas.ts`.
- The service imports and returns `AgentResponse`.
- UI imports `AgentResponse` from the new schema file.
- Transaction tool inputs use `AgentCreateInput`, `AgentSearchInput`, `AgentUpdateInput`, and `AgentDeleteInput`.

Scope check:

- This plan covers one subsystem: the AI chat backend migration to an agent route plus the two existing UI callers.
- It keeps `/api/ai/chat` temporarily and does not add persistent chat, native provider tool calling, category writes, budget writes, or provider setting writes.
