# Phase 5 AI Categorization And Insight Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add user-configured OpenAI-compatible AI parsing and monthly insight generation to complete the MoneyMind AI MVP loop.

**Architecture:** Keep AI provider settings, provider calls, transaction parsing, and monthly insight generation in a focused `src/features/ai` module. Use authenticated Next.js App Router route handlers as the public API, keep database access in services, and keep interactive UI in small client components embedded in server-rendered pages.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Prisma 7, PostgreSQL, Zod 4, Jest, Tailwind CSS, shadcn-style local UI primitives.

---

## Documentation Context

- Read `node_modules/next/dist/docs/01-app/01-getting-started/15-route-handlers.md`.
- Read `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/route.md`.
- Read `node_modules/next/dist/docs/01-app/01-getting-started/05-server-and-client-components.md`.
- Context7 checked `/vercel/next.js` for App Router route handlers and server/client component boundaries.
- Context7 checked `/prisma/web` for one-to-one relations and upsert behavior.

## File Structure

- Modify `prisma/schema.prisma`: add `AiProviderSetting` and the `User.aiProviderSetting` relation.
- Create `prisma/migrations/20260526090000_add_ai_provider_setting/migration.sql`: migration for the settings table.
- Create `src/features/ai/schemas.ts`: request, settings, provider output, and API DTO validation.
- Create `src/features/ai/errors.ts`: typed AI domain errors and messages.
- Create `src/features/ai/settings-service.ts`: get/upsert/mask provider settings.
- Create `src/features/ai/openai-compatible.ts`: OpenAI-compatible chat completions adapter.
- Create `src/features/ai/transaction-parser.ts`: prompt, parse JSON, category resolution, draft building.
- Create `src/features/ai/monthly-insight.ts`: cached insight lookup, generation, regeneration.
- Create `src/features/ai/ai-settings-form.tsx`: client form for provider settings.
- Create `src/features/ai/monthly-insight-panel.tsx`: dashboard client panel for generate/regenerate.
- Modify `src/features/transactions/transaction-manager.tsx`: add AI parse draft flow to existing transaction form.
- Modify `src/features/dashboard/dashboard-view.tsx`: render insight panel prop.
- Modify `src/app/(app)/dashboard/page.tsx`: load cached insight and pass it to the view.
- Modify `src/app/(app)/layout.tsx`: add AI settings navigation item.
- Create `src/app/(app)/settings/ai/page.tsx`: server-rendered settings page.
- Create `src/app/api/settings/ai/route.ts`: authenticated GET/PATCH route.
- Create `src/app/api/ai/parse-transaction/route.ts`: authenticated parse route.
- Create `src/app/api/ai/monthly-insight/route.ts`: authenticated insight route.
- Create `tests/ai-settings-service.test.ts`.
- Create `tests/ai-openai-compatible.test.ts`.
- Create `tests/ai-transaction-parser.test.ts`.
- Create `tests/ai-monthly-insight.test.ts`.
- Create `tests/ai-schemas.test.ts`.

---

### Task 1: Add AI Provider Setting Schema

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/20260526090000_add_ai_provider_setting/migration.sql`

- [ ] **Step 1: Update Prisma schema**

Add the relation to `User`:

```prisma
  aiProviderSetting AiProviderSetting?
```

Add this model after `Transaction` and before `AiInsight`:

```prisma
model AiProviderSetting {
  id        String   @id @default(cuid())
  userId    String   @unique
  baseUrl   String
  apiKey    String
  model     String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
}
```

- [ ] **Step 2: Create migration SQL**

Create `prisma/migrations/20260526090000_add_ai_provider_setting/migration.sql`:

```sql
CREATE TABLE "AiProviderSetting" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "baseUrl" TEXT NOT NULL,
    "apiKey" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiProviderSetting_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AiProviderSetting_userId_key" ON "AiProviderSetting"("userId");
CREATE INDEX "AiProviderSetting_userId_idx" ON "AiProviderSetting"("userId");

ALTER TABLE "AiProviderSetting"
ADD CONSTRAINT "AiProviderSetting_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
```

- [ ] **Step 3: Apply migration and regenerate Prisma Client**

Run:

```bash
pnpm prisma migrate dev
```

Expected: Prisma applies `20260526090000_add_ai_provider_setting` and regenerates Prisma Client.

- [ ] **Step 4: Validate schema**

Run:

```bash
pnpm db:validate
```

Expected: command exits 0 and reports the Prisma schema is valid.

- [ ] **Step 5: Commit**

```bash
git add prisma/schema.prisma prisma/migrations
git commit -m "feat: add ai provider setting model"
```

---

### Task 2: Add AI Schemas, Errors, And Settings Service

**Files:**
- Create: `src/features/ai/schemas.ts`
- Create: `src/features/ai/errors.ts`
- Create: `src/features/ai/settings-service.ts`
- Test: `tests/ai-schemas.test.ts`
- Test: `tests/ai-settings-service.test.ts`

- [ ] **Step 1: Write schema tests**

Create `tests/ai-schemas.test.ts`:

```ts
import {
  aiProviderSettingUpdateSchema,
  monthlyInsightRequestSchema,
  parseTransactionRequestSchema,
} from "@/features/ai/schemas";

describe("AI schemas", () => {
  it("accepts a valid provider setting update", () => {
    expect(
      aiProviderSettingUpdateSchema.parse({
        baseUrl: "https://openrouter.ai/api/v1",
        model: "openai/gpt-4.1-mini",
        apiKey: "sk-test",
      }),
    ).toEqual({
      baseUrl: "https://openrouter.ai/api/v1",
      model: "openai/gpt-4.1-mini",
      apiKey: "sk-test",
    });
  });

  it("rejects an invalid base URL", () => {
    expect(() =>
      aiProviderSettingUpdateSchema.parse({
        baseUrl: "not-a-url",
        model: "gpt-4.1-mini",
        apiKey: "sk-test",
      }),
    ).toThrow();
  });

  it("trims parse input", () => {
    expect(
      parseTransactionRequestSchema.parse({
        input: "  hôm nay ăn trưa 55k  ",
      }),
    ).toEqual({ input: "hôm nay ăn trưa 55k" });
  });

  it("requires YYYY-MM for monthly insight", () => {
    expect(
      monthlyInsightRequestSchema.parse({
        month: "2026-05",
        regenerate: true,
      }),
    ).toEqual({ month: "2026-05", regenerate: true });

    expect(() =>
      monthlyInsightRequestSchema.parse({ month: "05/2026" }),
    ).toThrow();
  });
});
```

- [ ] **Step 2: Write settings service tests**

Create `tests/ai-settings-service.test.ts`:

```ts
import {
  getMaskedAiProviderSetting,
  upsertAiProviderSetting,
} from "@/features/ai/settings-service";
import { db } from "@/lib/db";

jest.mock("@/lib/db", () => ({
  db: {
    aiProviderSetting: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
    },
  },
}));

const findUniqueMock = db.aiProviderSetting.findUnique as jest.Mock;
const upsertMock = db.aiProviderSetting.upsert as jest.Mock;

describe("AI settings service", () => {
  beforeEach(() => {
    findUniqueMock.mockReset();
    upsertMock.mockReset();
  });

  it("masks API key when returning settings", async () => {
    findUniqueMock.mockResolvedValue({
      userId: "user_1",
      baseUrl: "https://openrouter.ai/api/v1",
      apiKey: "sk-secret",
      model: "openai/gpt-4.1-mini",
    });

    await expect(getMaskedAiProviderSetting("user_1")).resolves.toEqual({
      setting: {
        baseUrl: "https://openrouter.ai/api/v1",
        model: "openai/gpt-4.1-mini",
        hasApiKey: true,
      },
    });
  });

  it("requires API key when creating a first setting", async () => {
    findUniqueMock.mockResolvedValue(null);

    await expect(
      upsertAiProviderSetting("user_1", {
        baseUrl: "https://openrouter.ai/api/v1",
        model: "openai/gpt-4.1-mini",
      }),
    ).rejects.toMatchObject({ code: "missing_api_key" });
  });

  it("keeps existing API key when update omits apiKey", async () => {
    findUniqueMock.mockResolvedValue({
      userId: "user_1",
      baseUrl: "https://old.example/v1",
      apiKey: "sk-existing",
      model: "old-model",
    });
    upsertMock.mockResolvedValue({
      userId: "user_1",
      baseUrl: "https://openrouter.ai/api/v1",
      apiKey: "sk-existing",
      model: "openai/gpt-4.1-mini",
    });

    await upsertAiProviderSetting("user_1", {
      baseUrl: "https://openrouter.ai/api/v1",
      model: "openai/gpt-4.1-mini",
    });

    expect(upsertMock).toHaveBeenCalledWith({
      where: { userId: "user_1" },
      create: {
        userId: "user_1",
        baseUrl: "https://openrouter.ai/api/v1",
        apiKey: "sk-existing",
        model: "openai/gpt-4.1-mini",
      },
      update: {
        baseUrl: "https://openrouter.ai/api/v1",
        apiKey: "sk-existing",
        model: "openai/gpt-4.1-mini",
      },
    });
  });
});
```

- [ ] **Step 3: Run tests to verify failure**

Run:

```bash
pnpm test -- ai-schemas.test.ts ai-settings-service.test.ts
```

Expected: FAIL because `src/features/ai/*` files do not exist.

- [ ] **Step 4: Implement schemas and errors**

Create `src/features/ai/errors.ts`:

```ts
export type AiErrorCode =
  | "missing_api_key"
  | "missing_provider_setting"
  | "provider_http_error"
  | "provider_timeout"
  | "provider_invalid_response"
  | "invalid_ai_output";

const AI_ERROR_MESSAGES: Record<AiErrorCode, string> = {
  missing_api_key: "Bạn cần cấu hình API key AI trước.",
  missing_provider_setting: "Bạn cần cấu hình nhà cung cấp AI trước.",
  provider_http_error: "Nhà cung cấp AI đang lỗi. Vui lòng thử lại.",
  provider_timeout: "AI phản hồi quá lâu. Vui lòng thử lại.",
  provider_invalid_response: "AI trả về phản hồi không hợp lệ.",
  invalid_ai_output: "AI chưa phân tích được dữ liệu hợp lệ.",
};

export class AiDomainError extends Error {
  constructor(public readonly code: AiErrorCode) {
    super(AI_ERROR_MESSAGES[code]);
    this.name = "AiDomainError";
  }
}

export function getAiErrorMessage(code: AiErrorCode) {
  return AI_ERROR_MESSAGES[code];
}

export function isAiDomainError(error: unknown): error is AiDomainError {
  return error instanceof AiDomainError;
}
```

Create `src/features/ai/schemas.ts`:

```ts
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

export type MonthlyInsightRequest = z.infer<
  typeof monthlyInsightRequestSchema
>;

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
```

- [ ] **Step 5: Implement settings service**

Create `src/features/ai/settings-service.ts`:

```ts
import { AiDomainError } from "@/features/ai/errors";
import type { AiProviderSettingUpdateInput } from "@/features/ai/schemas";
import { db } from "@/lib/db";

export type MaskedAiProviderSetting = {
  setting: null | {
    baseUrl: string;
    model: string;
    hasApiKey: boolean;
  };
};

export async function getAiProviderSetting(userId: string) {
  return db.aiProviderSetting.findUnique({
    where: { userId },
  });
}

export async function requireAiProviderSetting(userId: string) {
  const setting = await getAiProviderSetting(userId);

  if (!setting) {
    throw new AiDomainError("missing_provider_setting");
  }

  if (!setting.apiKey) {
    throw new AiDomainError("missing_api_key");
  }

  return setting;
}

export async function getMaskedAiProviderSetting(
  userId: string,
): Promise<MaskedAiProviderSetting> {
  const setting = await getAiProviderSetting(userId);

  if (!setting) {
    return { setting: null };
  }

  return {
    setting: {
      baseUrl: setting.baseUrl,
      model: setting.model,
      hasApiKey: Boolean(setting.apiKey),
    },
  };
}

export async function upsertAiProviderSetting(
  userId: string,
  input: AiProviderSettingUpdateInput,
) {
  const existing = await getAiProviderSetting(userId);
  const apiKey = input.apiKey ?? existing?.apiKey;

  if (!apiKey) {
    throw new AiDomainError("missing_api_key");
  }

  return db.aiProviderSetting.upsert({
    where: { userId },
    create: {
      userId,
      baseUrl: input.baseUrl,
      apiKey,
      model: input.model,
    },
    update: {
      baseUrl: input.baseUrl,
      apiKey,
      model: input.model,
    },
  });
}
```

- [ ] **Step 6: Run tests**

Run:

```bash
pnpm test -- ai-schemas.test.ts ai-settings-service.test.ts
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/features/ai/schemas.ts src/features/ai/errors.ts src/features/ai/settings-service.ts tests/ai-schemas.test.ts tests/ai-settings-service.test.ts
git commit -m "feat: add ai settings service"
```

---

### Task 3: Add OpenAI-Compatible Adapter

**Files:**
- Create: `src/features/ai/openai-compatible.ts`
- Test: `tests/ai-openai-compatible.test.ts`

- [ ] **Step 1: Write adapter tests**

Create `tests/ai-openai-compatible.test.ts`:

```ts
import { AiDomainError } from "@/features/ai/errors";
import { createOpenAiCompatibleChat } from "@/features/ai/openai-compatible";

const fetchMock = jest.fn();

describe("OpenAI-compatible adapter", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    global.fetch = fetchMock;
  });

  it("sends chat completion request and returns message content", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: "{\"ok\":true}" } }],
      }),
    });

    const content = await createOpenAiCompatibleChat({
      baseUrl: "https://openrouter.ai/api/v1",
      apiKey: "sk-test",
      model: "openai/gpt-4.1-mini",
      messages: [{ role: "user", content: "Ping" }],
      timeoutMs: 1000,
    });

    expect(content).toBe("{\"ok\":true}");
    expect(fetchMock).toHaveBeenCalledWith(
      "https://openrouter.ai/api/v1/chat/completions",
      expect.objectContaining({
        method: "POST",
        headers: {
          Authorization: "Bearer sk-test",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "openai/gpt-4.1-mini",
          messages: [{ role: "user", content: "Ping" }],
          temperature: 0.2,
        }),
        signal: expect.any(AbortSignal),
      }),
    );
  });

  it("maps non-2xx response to provider_http_error", async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ error: "unauthorized" }),
    });

    await expect(
      createOpenAiCompatibleChat({
        baseUrl: "https://provider.example/v1",
        apiKey: "sk-test",
        model: "model",
        messages: [{ role: "user", content: "Ping" }],
        timeoutMs: 1000,
      }),
    ).rejects.toEqual(new AiDomainError("provider_http_error"));
  });

  it("maps malformed response to provider_invalid_response", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ choices: [] }),
    });

    await expect(
      createOpenAiCompatibleChat({
        baseUrl: "https://provider.example/v1",
        apiKey: "sk-test",
        model: "model",
        messages: [{ role: "user", content: "Ping" }],
        timeoutMs: 1000,
      }),
    ).rejects.toEqual(new AiDomainError("provider_invalid_response"));
  });
});
```

- [ ] **Step 2: Run test to verify failure**

Run:

```bash
pnpm test -- ai-openai-compatible.test.ts
```

Expected: FAIL because `openai-compatible.ts` does not exist.

- [ ] **Step 3: Implement adapter**

Create `src/features/ai/openai-compatible.ts`:

```ts
import { AiDomainError } from "@/features/ai/errors";
import { openAiChatResponseSchema } from "@/features/ai/schemas";

export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type OpenAiCompatibleChatInput = {
  baseUrl: string;
  apiKey: string;
  model: string;
  messages: ChatMessage[];
  timeoutMs?: number;
};

export async function createOpenAiCompatibleChat({
  baseUrl,
  apiKey,
  model,
  messages,
  timeoutMs = 15000,
}: OpenAiCompatibleChatInput) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${baseUrl.replace(/\/+$/, "")}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.2,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new AiDomainError("provider_http_error");
    }

    const parsed = openAiChatResponseSchema.safeParse(await response.json());

    if (!parsed.success) {
      throw new AiDomainError("provider_invalid_response");
    }

    return parsed.data.choices[0].message.content;
  } catch (error) {
    if (error instanceof AiDomainError) {
      throw error;
    }

    if (error instanceof Error && error.name === "AbortError") {
      throw new AiDomainError("provider_timeout");
    }

    throw new AiDomainError("provider_http_error");
  } finally {
    clearTimeout(timeout);
  }
}
```

- [ ] **Step 4: Run test**

Run:

```bash
pnpm test -- ai-openai-compatible.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/features/ai/openai-compatible.ts tests/ai-openai-compatible.test.ts
git commit -m "feat: add openai compatible adapter"
```

---

### Task 4: Add Transaction Parser Service And API Route

**Files:**
- Create: `src/features/ai/transaction-parser.ts`
- Create: `src/app/api/ai/parse-transaction/route.ts`
- Test: `tests/ai-transaction-parser.test.ts`

- [ ] **Step 1: Write parser tests**

Create `tests/ai-transaction-parser.test.ts`:

```ts
import { parseTransactionWithAi } from "@/features/ai/transaction-parser";
import { db } from "@/lib/db";

jest.mock("@/lib/db", () => ({
  db: {
    category: {
      findMany: jest.fn(),
    },
  },
}));

jest.mock("@/features/ai/settings-service", () => ({
  requireAiProviderSetting: jest.fn().mockResolvedValue({
    baseUrl: "https://provider.example/v1",
    apiKey: "sk-test",
    model: "model",
  }),
}));

jest.mock("@/features/ai/openai-compatible", () => ({
  createOpenAiCompatibleChat: jest.fn(),
}));

import { createOpenAiCompatibleChat } from "@/features/ai/openai-compatible";

const findManyMock = db.category.findMany as jest.Mock;
const chatMock = createOpenAiCompatibleChat as jest.Mock;

describe("AI transaction parser", () => {
  beforeEach(() => {
    findManyMock.mockReset();
    chatMock.mockReset();
  });

  it("returns a draft using a matched user category", async () => {
    findManyMock.mockResolvedValue([
      { id: "cat_food", name: "Ăn uống", type: "expense" },
      { id: "cat_income", name: "Thu nhập", type: "income" },
    ]);
    chatMock.mockResolvedValue(
      JSON.stringify({
        type: "expense",
        amount: 55000,
        categoryName: "Ăn uống",
        note: "Ăn trưa",
        merchant: null,
        transactionDate: "2026-05-26",
      }),
    );

    await expect(
      parseTransactionWithAi("user_1", "ăn trưa 55k", new Date("2026-05-26")),
    ).resolves.toEqual({
      type: "expense",
      amount: 55000,
      categoryId: "cat_food",
      categoryName: "Ăn uống",
      note: "Ăn trưa",
      merchant: null,
      rawInput: "ăn trưa 55k",
      transactionDate: "2026-05-26",
    });
  });

  it("falls back to Khác when category does not match", async () => {
    findManyMock.mockResolvedValue([
      { id: "cat_other", name: "Khác", type: "expense" },
      { id: "cat_food", name: "Ăn uống", type: "expense" },
    ]);
    chatMock.mockResolvedValue(
      JSON.stringify({
        type: "expense",
        amount: 120000,
        categoryName: "Du lịch",
        note: "Chi khác",
        merchant: null,
        transactionDate: "2026-05-26",
      }),
    );

    const draft = await parseTransactionWithAi(
      "user_1",
      "chi khác 120k",
      new Date("2026-05-26"),
    );

    expect(draft.categoryId).toBe("cat_other");
    expect(draft.categoryName).toBe("Khác");
  });

  it("rejects invalid AI JSON", async () => {
    findManyMock.mockResolvedValue([
      { id: "cat_food", name: "Ăn uống", type: "expense" },
    ]);
    chatMock.mockResolvedValue("not-json");

    await expect(
      parseTransactionWithAi("user_1", "ăn trưa", new Date("2026-05-26")),
    ).rejects.toMatchObject({ code: "invalid_ai_output" });
  });
});
```

- [ ] **Step 2: Run test to verify failure**

Run:

```bash
pnpm test -- ai-transaction-parser.test.ts
```

Expected: FAIL because `transaction-parser.ts` does not exist.

- [ ] **Step 3: Implement transaction parser**

Create `src/features/ai/transaction-parser.ts`:

```ts
import { AiDomainError } from "@/features/ai/errors";
import { createOpenAiCompatibleChat } from "@/features/ai/openai-compatible";
import { aiTransactionOutputSchema } from "@/features/ai/schemas";
import { requireAiProviderSetting } from "@/features/ai/settings-service";
import { db } from "@/lib/db";

type UserCategory = {
  id: string;
  name: string;
  type: "income" | "expense" | null;
};

function toDateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function normalizeCategoryName(name: string) {
  return name.trim().toLocaleLowerCase("vi-VN");
}

function resolveCategory(
  categories: UserCategory[],
  type: "income" | "expense",
  categoryName: string,
) {
  const compatible = categories.filter(
    (category) => !category.type || category.type === type,
  );
  const normalizedName = normalizeCategoryName(categoryName);
  const exact = compatible.find(
    (category) => normalizeCategoryName(category.name) === normalizedName,
  );

  if (exact) {
    return exact;
  }

  const fallbackName = type === "income" ? "thu nhập" : "khác";
  const fallback = compatible.find(
    (category) => normalizeCategoryName(category.name) === fallbackName,
  );

  return fallback ?? compatible[0];
}

function parseJsonObject(content: string) {
  try {
    return JSON.parse(content);
  } catch {
    throw new AiDomainError("invalid_ai_output");
  }
}

export async function parseTransactionWithAi(
  userId: string,
  input: string,
  today = new Date(),
) {
  const [setting, categories] = await Promise.all([
    requireAiProviderSetting(userId),
    db.category.findMany({
      where: { userId },
      select: { id: true, name: true, type: true },
      orderBy: [{ isDefault: "desc" }, { name: "asc" }],
    }),
  ]);

  const categoryList = categories
    .map((category) => `- ${category.name} (${category.type ?? "any"})`)
    .join("\n");
  const content = await createOpenAiCompatibleChat({
    baseUrl: setting.baseUrl,
    apiKey: setting.apiKey,
    model: setting.model,
    messages: [
      {
        role: "system",
        content:
          "Bạn phân tích giao dịch tài chính cá nhân tiếng Việt. Chỉ trả JSON hợp lệ, không markdown.",
      },
      {
        role: "user",
        content: [
          `Hôm nay là ${toDateKey(today)}.`,
          "Danh mục hợp lệ:",
          categoryList,
          "Input người dùng:",
          input,
          'Trả JSON với keys: type ("income"|"expense"), amount (integer VND), categoryName, note, merchant (string|null), transactionDate (YYYY-MM-DD).',
        ].join("\n"),
      },
    ],
  });
  const parsed = aiTransactionOutputSchema.safeParse(parseJsonObject(content));

  if (!parsed.success) {
    throw new AiDomainError("invalid_ai_output");
  }

  const category = resolveCategory(
    categories,
    parsed.data.type,
    parsed.data.categoryName,
  );

  if (!category) {
    throw new AiDomainError("invalid_ai_output");
  }

  return {
    type: parsed.data.type,
    amount: parsed.data.amount,
    categoryId: category.id,
    categoryName: category.name,
    note: parsed.data.note,
    merchant: parsed.data.merchant ?? null,
    rawInput: input,
    transactionDate: parsed.data.transactionDate,
  };
}
```

- [ ] **Step 4: Add route handler**

Create `src/app/api/ai/parse-transaction/route.ts`:

```ts
import { parseTransactionWithAi } from "@/features/ai/transaction-parser";
import { parseTransactionRequestSchema } from "@/features/ai/schemas";
import {
  getAiErrorMessage,
  isAiDomainError,
} from "@/features/ai/errors";
import {
  getRequiredApiUser,
  jsonBadRequest,
  jsonError,
  jsonUnauthorized,
} from "@/lib/api";

export async function POST(request: Request) {
  const user = await getRequiredApiUser();

  if (!user) {
    return jsonUnauthorized();
  }

  const parsed = parseTransactionRequestSchema.safeParse(await request.json());

  if (!parsed.success) {
    return jsonBadRequest();
  }

  try {
    const draft = await parseTransactionWithAi(user.id, parsed.data.input);

    return Response.json({ draft });
  } catch (error) {
    if (isAiDomainError(error)) {
      return jsonError(getAiErrorMessage(error.code), 400);
    }

    throw error;
  }
}
```

- [ ] **Step 5: Run parser tests**

Run:

```bash
pnpm test -- ai-transaction-parser.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/features/ai/transaction-parser.ts src/app/api/ai/parse-transaction/route.ts tests/ai-transaction-parser.test.ts
git commit -m "feat: add ai transaction parser"
```

---

### Task 5: Add AI Settings API And Settings Page

**Files:**
- Create: `src/app/api/settings/ai/route.ts`
- Create: `src/features/ai/ai-settings-form.tsx`
- Create: `src/app/(app)/settings/ai/page.tsx`
- Modify: `src/app/(app)/layout.tsx`

- [ ] **Step 1: Add settings API route**

Create `src/app/api/settings/ai/route.ts`:

```ts
import {
  getAiErrorMessage,
  isAiDomainError,
} from "@/features/ai/errors";
import { aiProviderSettingUpdateSchema } from "@/features/ai/schemas";
import {
  getMaskedAiProviderSetting,
  upsertAiProviderSetting,
} from "@/features/ai/settings-service";
import {
  getRequiredApiUser,
  jsonBadRequest,
  jsonError,
  jsonUnauthorized,
} from "@/lib/api";

export async function GET() {
  const user = await getRequiredApiUser();

  if (!user) {
    return jsonUnauthorized();
  }

  return Response.json(await getMaskedAiProviderSetting(user.id));
}

export async function PATCH(request: Request) {
  const user = await getRequiredApiUser();

  if (!user) {
    return jsonUnauthorized();
  }

  const parsed = aiProviderSettingUpdateSchema.safeParse(await request.json());

  if (!parsed.success) {
    return jsonBadRequest();
  }

  try {
    await upsertAiProviderSetting(user.id, parsed.data);

    return Response.json(await getMaskedAiProviderSetting(user.id));
  } catch (error) {
    if (isAiDomainError(error)) {
      return jsonError(getAiErrorMessage(error.code), 400);
    }

    throw error;
  }
}
```

- [ ] **Step 2: Add settings page form**

Create `src/features/ai/ai-settings-form.tsx`:

```tsx
"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";

type AiSettingsFormProps = {
  initialSetting: null | {
    baseUrl: string;
    model: string;
    hasApiKey: boolean;
  };
};

async function readJsonError(response: Response) {
  const payload = (await response.json().catch(() => null)) as {
    error?: string;
  } | null;

  return payload?.error ?? "Không thể lưu cấu hình AI.";
}

export function AiSettingsForm({ initialSetting }: AiSettingsFormProps) {
  const [baseUrl, setBaseUrl] = useState(
    initialSetting?.baseUrl ?? "https://api.openai.com/v1",
  );
  const [model, setModel] = useState(initialSetting?.model ?? "gpt-4.1-mini");
  const [hasApiKey, setHasApiKey] = useState(Boolean(initialSetting?.hasApiKey));
  const [apiKey, setApiKey] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function saveSettings(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    setMessage("");

    const response = await fetch("/api/settings/ai", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        baseUrl,
        model,
        apiKey: apiKey || undefined,
      }),
    });

    if (!response.ok) {
      setError(await readJsonError(response));
      setPending(false);
      return;
    }

    const payload = (await response.json()) as {
      setting: { hasApiKey: boolean };
    };
    setHasApiKey(payload.setting.hasApiKey);
    setApiKey("");
    setMessage("Đã lưu cấu hình AI.");
    setPending(false);
  }

  return (
    <form onSubmit={saveSettings} className="max-w-2xl space-y-4 rounded-lg border bg-card p-4">
      <div className="space-y-1">
        <label className="text-sm font-medium" htmlFor="baseUrl">
          Base URL
        </label>
        <input
          id="baseUrl"
          value={baseUrl}
          onChange={(event) => setBaseUrl(event.target.value)}
          className="h-9 w-full rounded-md border bg-background px-3 text-sm"
          required
        />
      </div>
      <div className="space-y-1">
        <label className="text-sm font-medium" htmlFor="model">
          Model
        </label>
        <input
          id="model"
          value={model}
          onChange={(event) => setModel(event.target.value)}
          className="h-9 w-full rounded-md border bg-background px-3 text-sm"
          required
        />
      </div>
      <div className="space-y-1">
        <label className="text-sm font-medium" htmlFor="apiKey">
          API key
        </label>
        <input
          id="apiKey"
          value={apiKey}
          onChange={(event) => setApiKey(event.target.value)}
          className="h-9 w-full rounded-md border bg-background px-3 text-sm"
          placeholder={hasApiKey ? "Đã cấu hình, nhập key mới để thay đổi" : "Nhập API key"}
          type="password"
        />
      </div>
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          Lưu cấu hình
        </Button>
        <span className="text-sm text-muted-foreground">
          {hasApiKey ? "API key đã cấu hình" : "Chưa có API key"}
        </span>
      </div>
      {message ? <p className="text-sm text-green-600">{message}</p> : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </form>
  );
}
```

- [ ] **Step 3: Add settings page**

Create `src/app/(app)/settings/ai/page.tsx`:

```tsx
import { AiSettingsForm } from "@/features/ai/ai-settings-form";
import { getMaskedAiProviderSetting } from "@/features/ai/settings-service";
import { getCurrentSession } from "@/lib/auth-session";

export default async function AiSettingsPage() {
  const session = await getCurrentSession();

  if (!session?.user) {
    return null;
  }

  const { setting } = await getMaskedAiProviderSetting(session.user.id);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-muted-foreground">Cấu hình</p>
        <h1 className="text-2xl font-semibold tracking-tight">AI provider</h1>
      </div>
      <AiSettingsForm initialSetting={setting} />
    </div>
  );
}
```

- [ ] **Step 4: Add navigation link**

Modify `src/app/(app)/layout.tsx` nav items:

```ts
const navItems = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/transactions", label: "Giao dịch" },
  { href: "/categories", label: "Danh mục" },
  { href: "/settings/ai", label: "AI" },
] as const;
```

- [ ] **Step 5: Run checks**

Run:

```bash
pnpm lint
pnpm test -- ai-settings-service.test.ts ai-schemas.test.ts
```

Expected: both commands exit 0.

- [ ] **Step 6: Commit**

```bash
git add src/app/api/settings/ai/route.ts src/features/ai/ai-settings-form.tsx 'src/app/(app)/settings/ai/page.tsx' 'src/app/(app)/layout.tsx'
git commit -m "feat: add ai settings page"
```

---

### Task 6: Add Transaction AI Parse UI

**Files:**
- Modify: `src/features/transactions/transaction-manager.tsx`

- [ ] **Step 1: Add controlled form state**

In `TransactionManager`, replace uncontrolled transaction fields with state:

```ts
const [amount, setAmount] = useState("");
const [categoryId, setCategoryId] = useState("");
const [transactionDate, setTransactionDate] = useState(toDateInputValue(new Date()));
const [note, setNote] = useState("");
const [merchant, setMerchant] = useState("");
const [rawInput, setRawInput] = useState("");
const [aiPending, setAiPending] = useState(false);
```

Add this effect-free category fallback after `matchingCategories`:

```ts
const selectedCategoryId = categoryId || matchingCategories[0]?.id || "";
```

- [ ] **Step 2: Add parse helper**

Add inside `TransactionManager`:

```ts
async function parseRawInput() {
  if (!rawInput.trim()) {
    setError("Nhập mô tả giao dịch trước khi dùng AI.");
    return;
  }

  setAiPending(true);
  setError("");

  const response = await fetch("/api/ai/parse-transaction", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ input: rawInput }),
  });

  if (!response.ok) {
    setError(await readJsonError(response));
    setAiPending(false);
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
  setAiPending(false);
}
```

- [ ] **Step 3: Update create payload and reset**

In `createTransaction`, use state values instead of reading form data:

```ts
body: JSON.stringify({
  type,
  amount,
  categoryId: selectedCategoryId,
  note,
  merchant,
  rawInput,
  transactionDate,
}),
```

After successful create, reset state:

```ts
setAmount("");
setCategoryId("");
setTransactionDate(toDateInputValue(new Date()));
setNote("");
setMerchant("");
setRawInput("");
```

- [ ] **Step 4: Update form inputs**

Make the inputs controlled and add AI parse button next to raw input:

```tsx
<input
  name="rawInput"
  value={rawInput}
  onChange={(event) => setRawInput(event.target.value)}
  placeholder="Nhập thô, ví dụ: ăn trưa 55k"
  className="h-9 rounded-md border bg-background px-3 text-sm lg:col-span-4"
/>
<Button type="button" variant="outline" onClick={parseRawInput} disabled={aiPending}>
  AI parse
</Button>
```

Also set `value` and `onChange` for `amount`, `categoryId`, `transactionDate`, `note`, and `merchant`. The `categoryId` select must use `value={selectedCategoryId}`.

- [ ] **Step 5: Run checks**

Run:

```bash
pnpm lint
pnpm test -- transactions-schema.test.ts ai-transaction-parser.test.ts
```

Expected: both commands exit 0.

- [ ] **Step 6: Commit**

```bash
git add src/features/transactions/transaction-manager.tsx
git commit -m "feat: add ai transaction draft flow"
```

---

### Task 7: Add Monthly Insight Service And API Route

**Files:**
- Create: `src/features/ai/monthly-insight.ts`
- Create: `src/app/api/ai/monthly-insight/route.ts`
- Test: `tests/ai-monthly-insight.test.ts`

- [ ] **Step 1: Write monthly insight tests**

Create `tests/ai-monthly-insight.test.ts`:

```ts
import {
  generateMonthlyInsight,
  getCachedMonthlyInsight,
} from "@/features/ai/monthly-insight";
import { db } from "@/lib/db";

jest.mock("@/lib/db", () => ({
  db: {
    aiInsight: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
    },
  },
}));

jest.mock("@/features/ai/settings-service", () => ({
  requireAiProviderSetting: jest.fn().mockResolvedValue({
    baseUrl: "https://provider.example/v1",
    apiKey: "sk-test",
    model: "model",
  }),
}));

jest.mock("@/features/ai/openai-compatible", () => ({
  createOpenAiCompatibleChat: jest.fn(),
}));

jest.mock("@/features/dashboard/service", () => ({
  getMonthlyDashboard: jest.fn().mockResolvedValue({
    month: { key: "2026-05", label: "Tháng 05/2026", previousKey: "2026-04", nextKey: "2026-06" },
    totals: { income: 18000000, expense: 3200000, remaining: 14800000 },
    previousTotals: { income: 18000000, expense: 2500000, remaining: 15500000 },
    comparison: {
      income: { kind: "unchanged", delta: 0, percentage: 0 },
      expense: { kind: "increased", delta: 700000, percentage: 28 },
      remaining: { kind: "decreased", delta: 700000, percentage: 5 },
    },
    categoryBreakdown: [{ categoryId: "cat_food", name: "Ăn uống", color: "#f97316", amount: 1200000, percentage: 38 }],
    recentTransactions: [],
    isEmpty: false,
  }),
}));

import { createOpenAiCompatibleChat } from "@/features/ai/openai-compatible";

const findUniqueMock = db.aiInsight.findUnique as jest.Mock;
const upsertMock = db.aiInsight.upsert as jest.Mock;
const chatMock = createOpenAiCompatibleChat as jest.Mock;

describe("monthly insight service", () => {
  beforeEach(() => {
    findUniqueMock.mockReset();
    upsertMock.mockReset();
    chatMock.mockReset();
  });

  it("returns cached insight", async () => {
    findUniqueMock.mockResolvedValue({
      month: "2026-05",
      content: "Insight đã có",
      createdAt: new Date("2026-05-26T00:00:00.000Z"),
      updatedAt: new Date("2026-05-26T00:00:00.000Z"),
    });

    await expect(getCachedMonthlyInsight("user_1", "2026-05")).resolves.toEqual({
      month: "2026-05",
      content: "Insight đã có",
      createdAt: "2026-05-26T00:00:00.000Z",
      updatedAt: "2026-05-26T00:00:00.000Z",
    });
  });

  it("uses cache when regenerate is false", async () => {
    findUniqueMock.mockResolvedValue({
      month: "2026-05",
      content: "Insight cache",
      createdAt: new Date("2026-05-26T00:00:00.000Z"),
      updatedAt: new Date("2026-05-26T00:00:00.000Z"),
    });

    const insight = await generateMonthlyInsight("user_1", "2026-05", false);

    expect(insight.content).toBe("Insight cache");
    expect(chatMock).not.toHaveBeenCalled();
  });

  it("generates and upserts insight", async () => {
    findUniqueMock.mockResolvedValue(null);
    chatMock.mockResolvedValue("Bạn đang chi nhiều hơn cho ăn uống.");
    upsertMock.mockResolvedValue({
      month: "2026-05",
      content: "Bạn đang chi nhiều hơn cho ăn uống.",
      createdAt: new Date("2026-05-26T00:00:00.000Z"),
      updatedAt: new Date("2026-05-26T01:00:00.000Z"),
    });

    const insight = await generateMonthlyInsight("user_1", "2026-05", false);

    expect(insight.content).toBe("Bạn đang chi nhiều hơn cho ăn uống.");
    expect(upsertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId_month: { userId: "user_1", month: "2026-05" } },
      }),
    );
  });
});
```

- [ ] **Step 2: Run test to verify failure**

Run:

```bash
pnpm test -- ai-monthly-insight.test.ts
```

Expected: FAIL because `monthly-insight.ts` does not exist.

- [ ] **Step 3: Implement monthly insight service**

Create `src/features/ai/monthly-insight.ts`:

```ts
import { createOpenAiCompatibleChat } from "@/features/ai/openai-compatible";
import { requireAiProviderSetting } from "@/features/ai/settings-service";
import { getMonthlyDashboard } from "@/features/dashboard/service";
import { db } from "@/lib/db";

export type MonthlyInsightDto = {
  month: string;
  content: string;
  createdAt: string;
  updatedAt: string;
};

function toDto(insight: {
  month: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
}): MonthlyInsightDto {
  return {
    month: insight.month,
    content: insight.content,
    createdAt: insight.createdAt.toISOString(),
    updatedAt: insight.updatedAt.toISOString(),
  };
}

export async function getCachedMonthlyInsight(userId: string, month: string) {
  const insight = await db.aiInsight.findUnique({
    where: { userId_month: { userId, month } },
  });

  return insight ? toDto(insight) : null;
}

export async function generateMonthlyInsight(
  userId: string,
  month: string,
  regenerate: boolean,
) {
  const cached = await getCachedMonthlyInsight(userId, month);

  if (cached && !regenerate) {
    return cached;
  }

  const [setting, dashboard] = await Promise.all([
    requireAiProviderSetting(userId),
    getMonthlyDashboard(userId, month),
  ]);
  const content = await createOpenAiCompatibleChat({
    baseUrl: setting.baseUrl,
    apiKey: setting.apiKey,
    model: setting.model,
    messages: [
      {
        role: "system",
        content:
          "Bạn là trợ lý tài chính cá nhân cho người dùng Việt Nam. Trả lời tiếng Việt ngắn gọn, không bịa dữ liệu.",
      },
      {
        role: "user",
        content: [
          `Tháng: ${month}`,
          `Thu nhập: ${dashboard.totals.income}`,
          `Chi tiêu: ${dashboard.totals.expense}`,
          `Còn lại: ${dashboard.totals.remaining}`,
          `Tháng trước - thu nhập: ${dashboard.previousTotals.income}`,
          `Tháng trước - chi tiêu: ${dashboard.previousTotals.expense}`,
          `Tháng trước - còn lại: ${dashboard.previousTotals.remaining}`,
          "Chi theo danh mục:",
          JSON.stringify(dashboard.categoryBreakdown),
          "Hãy viết 3-5 gợi ý ngắn, có số liệu khi hữu ích.",
        ].join("\n"),
      },
    ],
  });
  const insight = await db.aiInsight.upsert({
    where: { userId_month: { userId, month } },
    create: {
      userId,
      month,
      content,
      metadata: {
        totals: dashboard.totals,
        previousTotals: dashboard.previousTotals,
        categoryBreakdown: dashboard.categoryBreakdown,
        model: setting.model,
      },
    },
    update: {
      content,
      metadata: {
        totals: dashboard.totals,
        previousTotals: dashboard.previousTotals,
        categoryBreakdown: dashboard.categoryBreakdown,
        model: setting.model,
      },
    },
  });

  return toDto(insight);
}
```

- [ ] **Step 4: Add monthly insight route**

Create `src/app/api/ai/monthly-insight/route.ts`:

```ts
import {
  getAiErrorMessage,
  isAiDomainError,
} from "@/features/ai/errors";
import { generateMonthlyInsight } from "@/features/ai/monthly-insight";
import { monthlyInsightRequestSchema } from "@/features/ai/schemas";
import {
  getRequiredApiUser,
  jsonBadRequest,
  jsonError,
  jsonUnauthorized,
} from "@/lib/api";

export async function POST(request: Request) {
  const user = await getRequiredApiUser();

  if (!user) {
    return jsonUnauthorized();
  }

  const parsed = monthlyInsightRequestSchema.safeParse(await request.json());

  if (!parsed.success) {
    return jsonBadRequest();
  }

  try {
    const insight = await generateMonthlyInsight(
      user.id,
      parsed.data.month,
      parsed.data.regenerate,
    );

    return Response.json({ insight });
  } catch (error) {
    if (isAiDomainError(error)) {
      return jsonError(getAiErrorMessage(error.code), 400);
    }

    throw error;
  }
}
```

- [ ] **Step 5: Run tests**

Run:

```bash
pnpm test -- ai-monthly-insight.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/features/ai/monthly-insight.ts src/app/api/ai/monthly-insight/route.ts tests/ai-monthly-insight.test.ts
git commit -m "feat: add ai monthly insight service"
```

---

### Task 8: Add Dashboard Insight Panel

**Files:**
- Create: `src/features/ai/monthly-insight-panel.tsx`
- Modify: `src/features/dashboard/dashboard-view.tsx`
- Modify: `src/app/(app)/dashboard/page.tsx`

- [ ] **Step 1: Add client insight panel**

Create `src/features/ai/monthly-insight-panel.tsx`:

```tsx
"use client";

import { useState } from "react";

import type { MonthlyInsightDto } from "@/features/ai/monthly-insight";
import { Button } from "@/components/ui/button";

type MonthlyInsightPanelProps = {
  month: string;
  initialInsight: MonthlyInsightDto | null;
};

async function readJsonError(response: Response) {
  const payload = (await response.json().catch(() => null)) as {
    error?: string;
  } | null;

  return payload?.error ?? "Không thể tạo insight AI.";
}

export function MonthlyInsightPanel({
  month,
  initialInsight,
}: MonthlyInsightPanelProps) {
  const [insight, setInsight] = useState(initialInsight);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function generate(regenerate: boolean) {
    setPending(true);
    setError("");

    const response = await fetch("/api/ai/monthly-insight", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ month, regenerate }),
    });

    if (!response.ok) {
      setError(await readJsonError(response));
      setPending(false);
      return;
    }

    const payload = (await response.json()) as { insight: MonthlyInsightDto };
    setInsight(payload.insight);
    setPending(false);
  }

  return (
    <section className="rounded-lg border bg-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">AI Insight</h2>
          <p className="text-sm text-muted-foreground">
            Gợi ý ngắn dựa trên dữ liệu tháng này.
          </p>
        </div>
        <Button
          type="button"
          variant={insight ? "outline" : "default"}
          onClick={() => generate(Boolean(insight))}
          disabled={pending}
        >
          {insight ? "Tạo lại" : "Tạo insight"}
        </Button>
      </div>
      {insight ? (
        <p className="mt-4 whitespace-pre-line text-sm leading-6">{insight.content}</p>
      ) : (
        <p className="mt-4 text-sm text-muted-foreground">
          Chưa có insight cho tháng này.
        </p>
      )}
      {error ? <p className="mt-3 text-sm text-destructive">{error}</p> : null}
    </section>
  );
}
```

- [ ] **Step 2: Modify dashboard view props**

In `src/features/dashboard/dashboard-view.tsx`, import the panel:

```ts
import type { MonthlyInsightDto } from "@/features/ai/monthly-insight";
import { MonthlyInsightPanel } from "@/features/ai/monthly-insight-panel";
```

Change props:

```ts
type DashboardViewProps = {
  dashboard: MonthlyDashboard;
  initialInsight: MonthlyInsightDto | null;
};
```

Render the panel after KPI cards and before category breakdown:

```tsx
<MonthlyInsightPanel
  month={dashboard.month.key}
  initialInsight={initialInsight}
/>
```

- [ ] **Step 3: Load cached insight in dashboard page**

Modify `src/app/(app)/dashboard/page.tsx`:

```tsx
import { getCachedMonthlyInsight } from "@/features/ai/monthly-insight";
import { DashboardView } from "@/features/dashboard/dashboard-view";
import { getSelectedMonth } from "@/features/dashboard/month";
import { getMonthlyDashboard } from "@/features/dashboard/service";
import { getCurrentSession } from "@/lib/auth-session";

type DashboardPageProps = {
  searchParams: Promise<{
    month?: string;
  }>;
};

export default async function DashboardPage({
  searchParams,
}: DashboardPageProps) {
  const [{ month }, session] = await Promise.all([
    searchParams,
    getCurrentSession(),
  ]);

  if (!session?.user) {
    return null;
  }

  const selectedMonth = getSelectedMonth(month);
  const [dashboard, initialInsight] = await Promise.all([
    getMonthlyDashboard(session.user.id, selectedMonth),
    getCachedMonthlyInsight(session.user.id, selectedMonth.key),
  ]);

  return (
    <DashboardView dashboard={dashboard} initialInsight={initialInsight} />
  );
}
```

- [ ] **Step 4: Run checks**

Run:

```bash
pnpm lint
pnpm test -- dashboard-service.test.ts ai-monthly-insight.test.ts
```

Expected: both commands exit 0.

- [ ] **Step 5: Commit**

```bash
git add src/features/ai/monthly-insight-panel.tsx src/features/dashboard/dashboard-view.tsx 'src/app/(app)/dashboard/page.tsx'
git commit -m "feat: show ai monthly insight"
```

---

### Task 9: Final Verification

**Files:**
- Modify: `docs/superpowers/plans/2026-05-26-phase-5-ai-categorization-insight-verification.md`

- [ ] **Step 1: Run full test suite**

Run:

```bash
pnpm test
```

Expected: PASS for all test suites.

- [ ] **Step 2: Run lint**

Run:

```bash
pnpm lint
```

Expected: exits 0.

- [ ] **Step 3: Validate Prisma schema**

Run:

```bash
pnpm db:validate
```

Expected: exits 0.

- [ ] **Step 4: Run production build**

Run:

```bash
pnpm build
```

Expected: exits 0.

- [ ] **Step 5: Record verification**

Create `docs/superpowers/plans/2026-05-26-phase-5-ai-categorization-insight-verification.md`:

```md
# Phase 5 AI Categorization And Insight Verification

## Commands

- `pnpm test`
- `pnpm lint`
- `pnpm db:validate`
- `pnpm build`

## Result

All commands passed on 2026-05-26.

## Notes

- AI provider calls are covered with mocked responses.
- Manual provider smoke testing requires configuring `/settings/ai` with a real OpenAI-compatible provider.
```

- [ ] **Step 6: Commit verification**

```bash
git add docs/superpowers/plans/2026-05-26-phase-5-ai-categorization-insight-verification.md
git commit -m "docs: record phase 5 verification"
```

---

## Self-Review

- Spec coverage: The plan covers provider settings, adapter, transaction parsing endpoint/UI, monthly insight endpoint/UI, insight caching, validation, user scoping, error handling, tests, and verification.
- Placeholder scan: No deferred implementation markers are intentionally left in this plan.
- Type consistency: Shared DTOs are defined in AI service files and imported by UI components; request schemas match route handlers; Prisma relation names match service calls.
