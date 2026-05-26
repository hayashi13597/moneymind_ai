# Phase 3 Transactions And Categories Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build authenticated transaction and category CRUD with VND parsing, API Route Handlers, usable app pages, tests, and Phase 3 verification docs.

**Architecture:** Keep the app as a modular monolith. Put pure helpers in `src/lib`, domain validation and Prisma services in `src/features`, API handlers under `src/app/api`, and interactive UI in small client components used by authenticated app pages.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Tailwind CSS 4, Prisma 7/PostgreSQL, Better Auth, Zod, Jest.

---

## Pre-Execution Notes

- Work on branch `phase/3-transactions-categories`.
- Design spec: `docs/superpowers/specs/2026-05-26-phase-3-transactions-categories-design.md`.
- Local Next.js docs already checked for Route Handlers, Server Functions, and expected error handling:
  - `node_modules/next/dist/docs/01-app/01-getting-started/15-route-handlers.md`
  - `node_modules/next/dist/docs/01-app/01-getting-started/07-mutating-data.md`
  - `node_modules/next/dist/docs/01-app/01-getting-started/10-error-handling.md`
- Do not add dashboard aggregation, AI parsing, AI provider settings, AI insights, OCR, chat, budgets, recurring expenses, or export.
- Run `git status --short` before each task. If unrelated user changes appear, leave them untouched.

## File Structure

Files to create:

- `src/lib/money.ts`: pure VND parse and format helpers.
- `tests/money.test.ts`: VND parser/formatter unit tests.
- `src/lib/api.ts`: shared authenticated API response helpers.
- `src/features/categories/schemas.ts`: Zod schemas and category payload types.
- `src/features/categories/service.ts`: user-scoped category read/write operations.
- `tests/categories-schema.test.ts`: category validation tests.
- `src/features/transactions/schemas.ts`: Zod schemas and transaction payload types.
- `src/features/transactions/service.ts`: user-scoped transaction read/write operations.
- `tests/transactions-schema.test.ts`: transaction validation tests.
- `src/app/api/categories/route.ts`: `GET` and `POST /api/categories`.
- `src/app/api/categories/[id]/route.ts`: `PATCH` and `DELETE /api/categories/:id`.
- `src/app/api/transactions/route.ts`: `GET` and `POST /api/transactions`.
- `src/app/api/transactions/[id]/route.ts`: `GET`, `PATCH`, and `DELETE /api/transactions/:id`.
- `src/features/categories/category-manager.tsx`: client category CRUD UI.
- `src/features/transactions/transaction-manager.tsx`: client transaction CRUD UI.
- `docs/superpowers/plans/2026-05-26-phase-3-transactions-categories-verification.md`: final verification notes after implementation.

Files to modify:

- `src/app/(app)/categories/page.tsx`: replace placeholder with server-loaded category manager.
- `src/app/(app)/transactions/page.tsx`: replace placeholder with server-loaded transaction manager.

## Task 1: Branch And Baseline Verification

**Files:**
- Read only.

- [ ] **Step 1: Confirm branch**

Run:

```bash
git branch --show-current
```

Expected:

```text
phase/3-transactions-categories
```

- [ ] **Step 2: Confirm clean working tree**

Run:

```bash
git status --short
```

Expected: no output.

- [ ] **Step 3: Run baseline tests**

Run:

```bash
pnpm test
```

Expected: existing tests pass. If they fail, stop and inspect before editing Phase 3 code.

- [ ] **Step 4: Run baseline lint**

Run:

```bash
pnpm lint
```

Expected: lint passes. If it fails on pre-existing code, record exact failure before continuing.

## Task 2: Add VND Money Helpers

**Files:**
- Create: `src/lib/money.ts`
- Create: `tests/money.test.ts`

- [ ] **Step 1: Write failing money tests**

Create `tests/money.test.ts`:

```ts
import { formatVnd, parseVndInput } from "@/lib/money";

describe("parseVndInput", () => {
  it.each([
    ["55k", 55000],
    ["55 K", 55000],
    ["18tr", 18000000],
    ["18 triệu", 18000000],
    ["3.200.000đ", 3200000],
    ["3,200,000", 3200000],
    ["3000000", 3000000],
  ])("parses %s as %i VND", (input, expected) => {
    expect(parseVndInput(input)).toEqual({ ok: true, value: expected });
  });

  it.each(["", "abc", "0", "-5k", "10 usd", "1.2.3.4"])(
    "rejects invalid input %s",
    (input) => {
      expect(parseVndInput(input)).toEqual({
        ok: false,
        error: "Số tiền không hợp lệ.",
      });
    },
  );
});

describe("formatVnd", () => {
  it("formats integer VND with Vietnamese locale", () => {
    expect(formatVnd(3200000)).toBe("3.200.000 ₫");
  });
});
```

- [ ] **Step 2: Run tests to verify failure**

Run:

```bash
pnpm test -- tests/money.test.ts
```

Expected: FAIL because `src/lib/money.ts` does not exist.

- [ ] **Step 3: Implement money helpers**

Create `src/lib/money.ts`:

```ts
type ParseVndResult =
  | { ok: true; value: number }
  | { ok: false; error: "Số tiền không hợp lệ." };

const INVALID_AMOUNT: ParseVndResult = {
  ok: false,
  error: "Số tiền không hợp lệ.",
};

function normalizeAmountInput(input: string) {
  return input
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/đ|vnd/g, "")
    .trim();
}

function parseGroupedInteger(input: string) {
  if (/^\d+$/.test(input)) {
    return Number(input);
  }

  if (/^\d{1,3}([.,]\d{3})+$/.test(input)) {
    return Number(input.replace(/[.,]/g, ""));
  }

  return null;
}

export function parseVndInput(input: string): ParseVndResult {
  const normalized = normalizeAmountInput(input);

  if (!normalized || normalized.startsWith("-")) {
    return INVALID_AMOUNT;
  }

  const multiplierMatch = normalized.match(/^(\d+(?:[.,]\d+)?)\s*(k|nghìn|ngan|tr|triệu)$/);

  if (multiplierMatch) {
    const numericPart = multiplierMatch[1].replace(",", ".");
    const value = Number(numericPart);
    const suffix = multiplierMatch[2];
    const multiplier = suffix === "k" || suffix === "nghìn" || suffix === "ngan" ? 1_000 : 1_000_000;
    const amount = Math.round(value * multiplier);

    return Number.isSafeInteger(amount) && amount > 0 ? { ok: true, value: amount } : INVALID_AMOUNT;
  }

  const amount = parseGroupedInteger(normalized);

  if (!Number.isSafeInteger(amount) || amount <= 0) {
    return INVALID_AMOUNT;
  }

  return { ok: true, value: amount };
}

export function formatVnd(amount: number) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(amount);
}
```

- [ ] **Step 4: Run money tests**

Run:

```bash
pnpm test -- tests/money.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit money helpers**

Run:

```bash
git add src/lib/money.ts tests/money.test.ts
git commit -m "feat: add vnd money helpers"
```

Expected: commit succeeds.

## Task 3: Add Category Validation

**Files:**
- Create: `src/features/categories/schemas.ts`
- Create: `tests/categories-schema.test.ts`

- [ ] **Step 1: Write failing category schema tests**

Create `tests/categories-schema.test.ts`:

```ts
import {
  categoryCreateSchema,
  categoryUpdateSchema,
} from "@/features/categories/schemas";

describe("category schemas", () => {
  it("trims valid create payloads", () => {
    expect(
      categoryCreateSchema.parse({
        name: " Ăn ngoài ",
        type: "expense",
        color: " #ef4444 ",
        icon: " utensils ",
      }),
    ).toEqual({
      name: "Ăn ngoài",
      type: "expense",
      color: "#ef4444",
      icon: "utensils",
    });
  });

  it("allows null type for cross-type categories", () => {
    expect(categoryCreateSchema.parse({ name: "Khác", type: null })).toEqual({
      name: "Khác",
      type: null,
    });
  });

  it("rejects empty names", () => {
    expect(() => categoryCreateSchema.parse({ name: "   ", type: "income" })).toThrow();
  });

  it("requires at least one update field", () => {
    expect(() => categoryUpdateSchema.parse({})).toThrow();
  });
});
```

- [ ] **Step 2: Run tests to verify failure**

Run:

```bash
pnpm test -- tests/categories-schema.test.ts
```

Expected: FAIL because `src/features/categories/schemas.ts` does not exist.

- [ ] **Step 3: Implement category schemas**

Create `src/features/categories/schemas.ts`:

```ts
import { z } from "zod";

const transactionTypeSchema = z.enum(["income", "expense"]);

const optionalTrimmedString = z
  .string()
  .trim()
  .min(1)
  .optional();

export const categoryCreateSchema = z.object({
  name: z.string().trim().min(1, "Tên danh mục là bắt buộc."),
  type: transactionTypeSchema.nullable(),
  color: optionalTrimmedString,
  icon: optionalTrimmedString,
});

export const categoryUpdateSchema = categoryCreateSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: "Cần ít nhất một trường để cập nhật.",
  });

export type CategoryCreateInput = z.infer<typeof categoryCreateSchema>;
export type CategoryUpdateInput = z.infer<typeof categoryUpdateSchema>;
```

- [ ] **Step 4: Run category schema tests**

Run:

```bash
pnpm test -- tests/categories-schema.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit category validation**

Run:

```bash
git add src/features/categories/schemas.ts tests/categories-schema.test.ts
git commit -m "feat: add category validation"
```

Expected: commit succeeds.

## Task 4: Add Transaction Validation

**Files:**
- Create: `src/features/transactions/schemas.ts`
- Create: `tests/transactions-schema.test.ts`

- [ ] **Step 1: Write failing transaction schema tests**

Create `tests/transactions-schema.test.ts`:

```ts
import {
  transactionCreateSchema,
  transactionUpdateSchema,
} from "@/features/transactions/schemas";

describe("transaction schemas", () => {
  it("parses VND shorthand and trims text fields", () => {
    expect(
      transactionCreateSchema.parse({
        type: "expense",
        amount: "55k",
        categoryId: "cat_123",
        note: " Ăn trưa ",
        merchant: " Quán A ",
        rawInput: " ăn trưa 55k ",
        transactionDate: "2026-05-26",
      }),
    ).toEqual({
      type: "expense",
      amount: 55000,
      categoryId: "cat_123",
      note: "Ăn trưa",
      merchant: "Quán A",
      rawInput: "ăn trưa 55k",
      transactionDate: new Date("2026-05-26T00:00:00.000Z"),
    });
  });

  it("accepts integer amount payloads", () => {
    expect(
      transactionCreateSchema.parse({
        type: "income",
        amount: 18000000,
        categoryId: "cat_income",
        note: "Lương",
        transactionDate: "2026-05-01",
      }).amount,
    ).toBe(18000000);
  });

  it("rejects invalid amounts", () => {
    expect(() =>
      transactionCreateSchema.parse({
        type: "expense",
        amount: "abc",
        categoryId: "cat_123",
        note: "Cafe",
        transactionDate: "2026-05-26",
      }),
    ).toThrow();
  });

  it("requires at least one update field", () => {
    expect(() => transactionUpdateSchema.parse({})).toThrow();
  });
});
```

- [ ] **Step 2: Run tests to verify failure**

Run:

```bash
pnpm test -- tests/transactions-schema.test.ts
```

Expected: FAIL because `src/features/transactions/schemas.ts` does not exist.

- [ ] **Step 3: Implement transaction schemas**

Create `src/features/transactions/schemas.ts`:

```ts
import { z } from "zod";

import { parseVndInput } from "@/lib/money";

const transactionTypeSchema = z.enum(["income", "expense"]);

const amountSchema = z.union([z.string(), z.number().int().positive()]).transform((value, ctx) => {
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

const optionalTrimmedString = z
  .string()
  .trim()
  .min(1)
  .optional();

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
```

- [ ] **Step 4: Run transaction schema tests**

Run:

```bash
pnpm test -- tests/transactions-schema.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit transaction validation**

Run:

```bash
git add src/features/transactions/schemas.ts tests/transactions-schema.test.ts
git commit -m "feat: add transaction validation"
```

Expected: commit succeeds.

## Task 5: Add API Helpers

**Files:**
- Create: `src/lib/api.ts`

- [ ] **Step 1: Create API helper file**

Create `src/lib/api.ts`:

```ts
import { getCurrentUser } from "@/lib/auth-session";

export async function getRequiredApiUser() {
  const user = await getCurrentUser();

  if (!user) {
    return null;
  }

  return user;
}

export function jsonError(error: string, status: number) {
  return Response.json({ error }, { status });
}

export function jsonBadRequest() {
  return jsonError("Dữ liệu không hợp lệ.", 400);
}

export function jsonUnauthorized() {
  return jsonError("Bạn cần đăng nhập để tiếp tục.", 401);
}

export function jsonNotFound(message = "Không tìm thấy dữ liệu.") {
  return jsonError(message, 404);
}
```

- [ ] **Step 2: Run lint**

Run:

```bash
pnpm lint
```

Expected: PASS.

- [ ] **Step 3: Commit API helpers**

Run:

```bash
git add src/lib/api.ts
git commit -m "chore: add api response helpers"
```

Expected: commit succeeds.

## Task 6: Add Category Service

**Files:**
- Create: `src/features/categories/service.ts`

- [ ] **Step 1: Implement category service**

Create `src/features/categories/service.ts`:

```ts
import { Prisma } from "@prisma/client";

import { db } from "@/lib/db";

import type { CategoryCreateInput, CategoryUpdateInput } from "./schemas";

export async function listCategories(userId: string) {
  return db.category.findMany({
    where: { userId },
    orderBy: [{ type: "asc" }, { name: "asc" }],
  });
}

export async function getCategory(userId: string, id: string) {
  return db.category.findFirst({
    where: { id, userId },
  });
}

export async function createCategory(userId: string, input: CategoryCreateInput) {
  return db.category.create({
    data: {
      userId,
      name: input.name,
      type: input.type,
      color: input.color,
      icon: input.icon,
    },
  });
}

export async function updateCategory(userId: string, id: string, input: CategoryUpdateInput) {
  const existing = await getCategory(userId, id);

  if (!existing) {
    return null;
  }

  return db.category.update({
    where: { id },
    data: input,
  });
}

export async function deleteCategory(userId: string, id: string) {
  const existing = await getCategory(userId, id);

  if (!existing) {
    return { ok: false as const, reason: "not_found" as const };
  }

  const transactionCount = await db.transaction.count({
    where: { userId, categoryId: id },
  });

  if (transactionCount > 0) {
    return { ok: false as const, reason: "in_use" as const };
  }

  await db.category.delete({
    where: { id },
  });

  return { ok: true as const };
}

export function isUniqueCategoryError(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  );
}
```

- [ ] **Step 2: Run type/lint checks**

Run:

```bash
pnpm lint
```

Expected: PASS.

- [ ] **Step 3: Commit category service**

Run:

```bash
git add src/features/categories/service.ts
git commit -m "feat: add category service"
```

Expected: commit succeeds.

## Task 7: Add Transaction Service

**Files:**
- Create: `src/features/transactions/service.ts`

- [ ] **Step 1: Implement transaction service**

Create `src/features/transactions/service.ts`:

```ts
import { db } from "@/lib/db";

import type { TransactionCreateInput, TransactionUpdateInput } from "./schemas";

async function validateCategoryForTransaction(
  userId: string,
  categoryId: string,
  type: "income" | "expense",
) {
  const category = await db.category.findFirst({
    where: { id: categoryId, userId },
  });

  if (!category) {
    return { ok: false as const, reason: "missing_category" as const };
  }

  if (category.type && category.type !== type) {
    return { ok: false as const, reason: "type_mismatch" as const };
  }

  return { ok: true as const, category };
}

export async function listTransactions(userId: string) {
  return db.transaction.findMany({
    where: { userId },
    include: { category: true },
    orderBy: [{ transactionDate: "desc" }, { createdAt: "desc" }],
  });
}

export async function getTransaction(userId: string, id: string) {
  return db.transaction.findFirst({
    where: { id, userId },
    include: { category: true },
  });
}

export async function createTransaction(userId: string, input: TransactionCreateInput) {
  const categoryResult = await validateCategoryForTransaction(
    userId,
    input.categoryId,
    input.type,
  );

  if (!categoryResult.ok) {
    return categoryResult;
  }

  const transaction = await db.transaction.create({
    data: {
      userId,
      categoryId: input.categoryId,
      type: input.type,
      amount: input.amount,
      note: input.note,
      merchant: input.merchant,
      rawInput: input.rawInput,
      transactionDate: input.transactionDate,
    },
    include: { category: true },
  });

  return { ok: true as const, transaction };
}

export async function updateTransaction(
  userId: string,
  id: string,
  input: TransactionUpdateInput,
) {
  const existing = await getTransaction(userId, id);

  if (!existing) {
    return { ok: false as const, reason: "not_found" as const };
  }

  const nextType = input.type ?? existing.type;
  const nextCategoryId = input.categoryId ?? existing.categoryId;

  const categoryResult = await validateCategoryForTransaction(
    userId,
    nextCategoryId,
    nextType,
  );

  if (!categoryResult.ok) {
    return categoryResult;
  }

  const transaction = await db.transaction.update({
    where: { id },
    data: input,
    include: { category: true },
  });

  return { ok: true as const, transaction };
}

export async function deleteTransaction(userId: string, id: string) {
  const existing = await getTransaction(userId, id);

  if (!existing) {
    return false;
  }

  await db.transaction.delete({
    where: { id },
  });

  return true;
}
```

- [ ] **Step 2: Run type/lint checks**

Run:

```bash
pnpm lint
```

Expected: PASS.

- [ ] **Step 3: Commit transaction service**

Run:

```bash
git add src/features/transactions/service.ts
git commit -m "feat: add transaction service"
```

Expected: commit succeeds.

## Task 8: Add Category API Routes

**Files:**
- Create: `src/app/api/categories/route.ts`
- Create: `src/app/api/categories/[id]/route.ts`

- [ ] **Step 1: Implement collection route**

Create `src/app/api/categories/route.ts`:

```ts
import { categoryCreateSchema } from "@/features/categories/schemas";
import {
  createCategory,
  isUniqueCategoryError,
  listCategories,
} from "@/features/categories/service";
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

  const categories = await listCategories(user.id);

  return Response.json({ categories });
}

export async function POST(request: Request) {
  const user = await getRequiredApiUser();

  if (!user) {
    return jsonUnauthorized();
  }

  const parsed = categoryCreateSchema.safeParse(await request.json());

  if (!parsed.success) {
    return jsonBadRequest();
  }

  try {
    const category = await createCategory(user.id, parsed.data);

    return Response.json({ category }, { status: 201 });
  } catch (error) {
    if (isUniqueCategoryError(error)) {
      return jsonError("Danh mục đã tồn tại.", 409);
    }

    throw error;
  }
}
```

- [ ] **Step 2: Implement item route**

Create `src/app/api/categories/[id]/route.ts`:

```ts
import { categoryUpdateSchema } from "@/features/categories/schemas";
import {
  deleteCategory,
  isUniqueCategoryError,
  updateCategory,
} from "@/features/categories/service";
import {
  getRequiredApiUser,
  jsonBadRequest,
  jsonError,
  jsonNotFound,
  jsonUnauthorized,
} from "@/lib/api";

export async function PATCH(request: Request, ctx: RouteContext<"/api/categories/[id]">) {
  const user = await getRequiredApiUser();

  if (!user) {
    return jsonUnauthorized();
  }

  const { id } = await ctx.params;
  const parsed = categoryUpdateSchema.safeParse(await request.json());

  if (!parsed.success) {
    return jsonBadRequest();
  }

  try {
    const category = await updateCategory(user.id, id, parsed.data);

    if (!category) {
      return jsonNotFound("Không tìm thấy danh mục.");
    }

    return Response.json({ category });
  } catch (error) {
    if (isUniqueCategoryError(error)) {
      return jsonError("Danh mục đã tồn tại.", 409);
    }

    throw error;
  }
}

export async function DELETE(_request: Request, ctx: RouteContext<"/api/categories/[id]">) {
  const user = await getRequiredApiUser();

  if (!user) {
    return jsonUnauthorized();
  }

  const { id } = await ctx.params;
  const result = await deleteCategory(user.id, id);

  if (!result.ok && result.reason === "not_found") {
    return jsonNotFound("Không tìm thấy danh mục.");
  }

  if (!result.ok && result.reason === "in_use") {
    return jsonError("Không thể xóa danh mục đang có giao dịch.", 409);
  }

  return Response.json({ ok: true });
}
```

- [ ] **Step 3: Run build type generation**

Run:

```bash
pnpm build
```

Expected: PASS. If `RouteContext` types are missing before build, run `pnpm dev` once or replace `RouteContext` with an explicit context type:

```ts
type CategoryRouteContext = {
  params: Promise<{ id: string }>;
};
```

- [ ] **Step 4: Commit category API routes**

Run:

```bash
git add src/app/api/categories/route.ts src/app/api/categories/[id]/route.ts
git commit -m "feat: add category api routes"
```

Expected: commit succeeds.

## Task 9: Add Transaction API Routes

**Files:**
- Create: `src/app/api/transactions/route.ts`
- Create: `src/app/api/transactions/[id]/route.ts`

- [ ] **Step 1: Implement collection route**

Create `src/app/api/transactions/route.ts`:

```ts
import { transactionCreateSchema } from "@/features/transactions/schemas";
import {
  createTransaction,
  listTransactions,
} from "@/features/transactions/service";
import {
  getRequiredApiUser,
  jsonBadRequest,
  jsonError,
  jsonUnauthorized,
} from "@/lib/api";

function transactionDomainError(reason: string) {
  if (reason === "missing_category") {
    return jsonError("Không tìm thấy danh mục.", 404);
  }

  if (reason === "type_mismatch") {
    return jsonError("Danh mục không khớp loại giao dịch.", 400);
  }

  return jsonBadRequest();
}

export async function GET() {
  const user = await getRequiredApiUser();

  if (!user) {
    return jsonUnauthorized();
  }

  const transactions = await listTransactions(user.id);

  return Response.json({ transactions });
}

export async function POST(request: Request) {
  const user = await getRequiredApiUser();

  if (!user) {
    return jsonUnauthorized();
  }

  const parsed = transactionCreateSchema.safeParse(await request.json());

  if (!parsed.success) {
    return jsonBadRequest();
  }

  const result = await createTransaction(user.id, parsed.data);

  if (!result.ok) {
    return transactionDomainError(result.reason);
  }

  return Response.json({ transaction: result.transaction }, { status: 201 });
}
```

- [ ] **Step 2: Implement item route**

Create `src/app/api/transactions/[id]/route.ts`:

```ts
import { transactionUpdateSchema } from "@/features/transactions/schemas";
import {
  deleteTransaction,
  getTransaction,
  updateTransaction,
} from "@/features/transactions/service";
import {
  getRequiredApiUser,
  jsonBadRequest,
  jsonError,
  jsonNotFound,
  jsonUnauthorized,
} from "@/lib/api";

function transactionDomainError(reason: string) {
  if (reason === "not_found") {
    return jsonNotFound("Không tìm thấy giao dịch.");
  }

  if (reason === "missing_category") {
    return jsonError("Không tìm thấy danh mục.", 404);
  }

  if (reason === "type_mismatch") {
    return jsonError("Danh mục không khớp loại giao dịch.", 400);
  }

  return jsonBadRequest();
}

export async function GET(_request: Request, ctx: RouteContext<"/api/transactions/[id]">) {
  const user = await getRequiredApiUser();

  if (!user) {
    return jsonUnauthorized();
  }

  const { id } = await ctx.params;
  const transaction = await getTransaction(user.id, id);

  if (!transaction) {
    return jsonNotFound("Không tìm thấy giao dịch.");
  }

  return Response.json({ transaction });
}

export async function PATCH(request: Request, ctx: RouteContext<"/api/transactions/[id]">) {
  const user = await getRequiredApiUser();

  if (!user) {
    return jsonUnauthorized();
  }

  const { id } = await ctx.params;
  const parsed = transactionUpdateSchema.safeParse(await request.json());

  if (!parsed.success) {
    return jsonBadRequest();
  }

  const result = await updateTransaction(user.id, id, parsed.data);

  if (!result.ok) {
    return transactionDomainError(result.reason);
  }

  return Response.json({ transaction: result.transaction });
}

export async function DELETE(_request: Request, ctx: RouteContext<"/api/transactions/[id]">) {
  const user = await getRequiredApiUser();

  if (!user) {
    return jsonUnauthorized();
  }

  const { id } = await ctx.params;
  const deleted = await deleteTransaction(user.id, id);

  if (!deleted) {
    return jsonNotFound("Không tìm thấy giao dịch.");
  }

  return Response.json({ ok: true });
}
```

- [ ] **Step 3: Run build**

Run:

```bash
pnpm build
```

Expected: PASS. If `RouteContext` types are unavailable, use the explicit context type pattern from Task 8.

- [ ] **Step 4: Commit transaction API routes**

Run:

```bash
git add src/app/api/transactions/route.ts src/app/api/transactions/[id]/route.ts
git commit -m "feat: add transaction api routes"
```

Expected: commit succeeds.

## Task 10: Add Category Management UI

**Files:**
- Create: `src/features/categories/category-manager.tsx`
- Modify: `src/app/(app)/categories/page.tsx`

- [ ] **Step 1: Create category manager client component**

Create `src/features/categories/category-manager.tsx`:

```tsx
"use client";

import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";

type Category = {
  id: string;
  name: string;
  type: "income" | "expense" | null;
  color: string | null;
  icon: string | null;
  isDefault: boolean;
};

type CategoryManagerProps = {
  initialCategories: Category[];
};

const typeLabels = {
  income: "Thu nhập",
  expense: "Chi tiêu",
  null: "Dùng chung",
} as const;

async function readJsonError(response: Response) {
  const payload = (await response.json().catch(() => null)) as { error?: string } | null;
  return payload?.error ?? "Không thể lưu thay đổi.";
}

export function CategoryManager({ initialCategories }: CategoryManagerProps) {
  const [categories, setCategories] = useState(initialCategories);
  const [error, setError] = useState("");
  const [name, setName] = useState("");
  const [type, setType] = useState<"income" | "expense">("expense");
  const [pending, setPending] = useState(false);

  const groupedCategories = useMemo(() => {
    return {
      income: categories.filter((category) => category.type === "income"),
      expense: categories.filter((category) => category.type === "expense"),
      shared: categories.filter((category) => category.type === null),
    };
  }, [categories]);

  async function refreshCategories() {
    const response = await fetch("/api/categories");
    const payload = (await response.json()) as { categories: Category[] };
    setCategories(payload.categories);
  }

  async function createCategory(formData: FormData) {
    setPending(true);
    setError("");

    const response = await fetch("/api/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: String(formData.get("name") ?? ""),
        type: String(formData.get("type") ?? "expense"),
      }),
    });

    if (!response.ok) {
      setError(await readJsonError(response));
      setPending(false);
      return;
    }

    setName("");
    await refreshCategories();
    setPending(false);
  }

  async function renameCategory(category: Category) {
    const nextName = window.prompt("Tên danh mục", category.name);

    if (!nextName || nextName.trim() === category.name) {
      return;
    }

    const response = await fetch(`/api/categories/${category.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: nextName }),
    });

    if (!response.ok) {
      setError(await readJsonError(response));
      return;
    }

    await refreshCategories();
  }

  async function deleteCategoryById(category: Category) {
    const confirmed = window.confirm(`Xóa danh mục "${category.name}"?`);

    if (!confirmed) {
      return;
    }

    const response = await fetch(`/api/categories/${category.id}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      setError(await readJsonError(response));
      return;
    }

    await refreshCategories();
  }

  return (
    <div className="space-y-6">
      <form action={createCategory} className="grid gap-3 rounded-lg border bg-card p-4 sm:grid-cols-[1fr_160px_auto]">
        <input
          name="name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Tên danh mục"
          className="rounded-md border bg-background px-3 py-2 text-sm"
          required
        />
        <select
          name="type"
          value={type}
          onChange={(event) => setType(event.target.value as "income" | "expense")}
          className="rounded-md border bg-background px-3 py-2 text-sm"
        >
          <option value="expense">Chi tiêu</option>
          <option value="income">Thu nhập</option>
        </select>
        <Button type="submit" disabled={pending}>
          Thêm
        </Button>
      </form>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <div className="grid gap-4 md:grid-cols-2">
        {[
          ["income", groupedCategories.income],
          ["expense", groupedCategories.expense],
          ["null", groupedCategories.shared],
        ].map(([groupType, group]) => (
          <section key={groupType} className="space-y-2">
            <h2 className="text-sm font-semibold">{typeLabels[groupType as keyof typeof typeLabels]}</h2>
            <div className="divide-y rounded-lg border bg-card">
              {(group as Category[]).map((category) => (
                <div key={category.id} className="flex items-center justify-between gap-3 p-3">
                  <div>
                    <p className="text-sm font-medium">{category.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {category.isDefault ? "Mặc định" : "Tùy chỉnh"}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button type="button" variant="outline" onClick={() => renameCategory(category)}>
                      Sửa
                    </Button>
                    <Button type="button" variant="outline" onClick={() => deleteCategoryById(category)}>
                      Xóa
                    </Button>
                  </div>
                </div>
              ))}
              {(group as Category[]).length === 0 ? (
                <p className="p-3 text-sm text-muted-foreground">Chưa có danh mục.</p>
              ) : null}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Replace categories page placeholder**

Modify `src/app/(app)/categories/page.tsx`:

```tsx
import { CategoryManager } from "@/features/categories/category-manager";
import { listCategories } from "@/features/categories/service";
import { getCurrentUser } from "@/lib/auth-session";

export default async function CategoriesPage() {
  const user = await getCurrentUser();

  if (!user) {
    return null;
  }

  const categories = await listCategories(user.id);

  return (
    <section className="space-y-6">
      <div className="space-y-2">
        <p className="text-sm font-medium text-muted-foreground">Danh mục</p>
        <h1 className="text-2xl font-semibold tracking-normal">Phân loại thu chi</h1>
        <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
          Quản lý danh mục thu nhập và chi tiêu dùng cho giao dịch hằng ngày.
        </p>
      </div>
      <CategoryManager initialCategories={categories} />
    </section>
  );
}
```

- [ ] **Step 3: Run lint/build**

Run:

```bash
pnpm lint
pnpm build
```

Expected: PASS.

- [ ] **Step 4: Commit category UI**

Run:

```bash
git add src/features/categories/category-manager.tsx src/app/(app)/categories/page.tsx
git commit -m "feat: add category management ui"
```

Expected: commit succeeds. Quote the path if the shell treats parentheses specially:

```bash
git add src/features/categories/category-manager.tsx 'src/app/(app)/categories/page.tsx'
```

## Task 11: Add Transaction Management UI

**Files:**
- Create: `src/features/transactions/transaction-manager.tsx`
- Modify: `src/app/(app)/transactions/page.tsx`

- [ ] **Step 1: Create transaction manager client component**

Create `src/features/transactions/transaction-manager.tsx`:

```tsx
"use client";

import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { formatVnd } from "@/lib/money";

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
  transactionDate: string | Date;
  category: Category;
};

type TransactionManagerProps = {
  initialTransactions: Transaction[];
  categories: Category[];
};

async function readJsonError(response: Response) {
  const payload = (await response.json().catch(() => null)) as { error?: string } | null;
  return payload?.error ?? "Không thể lưu thay đổi.";
}

function toDateInputValue(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function TransactionManager({
  initialTransactions,
  categories,
}: TransactionManagerProps) {
  const [transactions, setTransactions] = useState(initialTransactions);
  const [type, setType] = useState<"income" | "expense">("expense");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  const matchingCategories = useMemo(
    () => categories.filter((category) => !category.type || category.type === type),
    [categories, type],
  );

  async function refreshTransactions() {
    const response = await fetch("/api/transactions");
    const payload = (await response.json()) as { transactions: Transaction[] };
    setTransactions(payload.transactions);
  }

  async function createTransaction(formData: FormData) {
    setPending(true);
    setError("");

    const response = await fetch("/api/transactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type,
        amount: String(formData.get("amount") ?? ""),
        categoryId: String(formData.get("categoryId") ?? ""),
        note: String(formData.get("note") ?? ""),
        merchant: String(formData.get("merchant") ?? ""),
        rawInput: String(formData.get("rawInput") ?? ""),
        transactionDate: String(formData.get("transactionDate") ?? ""),
      }),
    });

    if (!response.ok) {
      setError(await readJsonError(response));
      setPending(false);
      return;
    }

    const form = document.getElementById("transaction-form") as HTMLFormElement | null;
    form?.reset();
    await refreshTransactions();
    setPending(false);
  }

  async function deleteTransactionById(transaction: Transaction) {
    const confirmed = window.confirm(`Xóa giao dịch "${transaction.note}"?`);

    if (!confirmed) {
      return;
    }

    const response = await fetch(`/api/transactions/${transaction.id}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      setError(await readJsonError(response));
      return;
    }

    await refreshTransactions();
  }

  return (
    <div className="space-y-6">
      <form id="transaction-form" action={createTransaction} className="grid gap-3 rounded-lg border bg-card p-4 lg:grid-cols-6">
        <select
          name="type"
          value={type}
          onChange={(event) => setType(event.target.value as "income" | "expense")}
          className="rounded-md border bg-background px-3 py-2 text-sm"
        >
          <option value="expense">Chi tiêu</option>
          <option value="income">Thu nhập</option>
        </select>
        <input
          name="amount"
          placeholder="55k"
          className="rounded-md border bg-background px-3 py-2 text-sm"
          required
        />
        <select name="categoryId" className="rounded-md border bg-background px-3 py-2 text-sm" required>
          {matchingCategories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
        <input
          name="transactionDate"
          type="date"
          defaultValue={toDateInputValue(new Date())}
          className="rounded-md border bg-background px-3 py-2 text-sm"
          required
        />
        <input
          name="note"
          placeholder="Ghi chú"
          className="rounded-md border bg-background px-3 py-2 text-sm"
          required
        />
        <Button type="submit" disabled={pending}>
          Thêm
        </Button>
        <input
          name="merchant"
          placeholder="Người bán"
          className="rounded-md border bg-background px-3 py-2 text-sm lg:col-span-2"
        />
        <input
          name="rawInput"
          placeholder="Nhập thô, ví dụ: ăn trưa 55k"
          className="rounded-md border bg-background px-3 py-2 text-sm lg:col-span-4"
        />
      </form>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <div className="overflow-hidden rounded-lg border bg-card">
        <div className="grid grid-cols-[1fr_120px_140px_110px_auto] gap-3 border-b px-4 py-2 text-xs font-medium text-muted-foreground">
          <span>Ghi chú</span>
          <span>Danh mục</span>
          <span>Số tiền</span>
          <span>Ngày</span>
          <span />
        </div>
        {transactions.map((transaction) => (
          <div key={transaction.id} className="grid grid-cols-[1fr_120px_140px_110px_auto] items-center gap-3 border-b px-4 py-3 last:border-b-0">
            <div>
              <p className="text-sm font-medium">{transaction.note}</p>
              <p className="text-xs text-muted-foreground">{transaction.merchant ?? transaction.rawInput ?? ""}</p>
            </div>
            <span className="text-sm">{transaction.category.name}</span>
            <span className={transaction.type === "income" ? "text-sm font-medium text-green-600" : "text-sm font-medium text-red-600"}>
              {transaction.type === "income" ? "+" : "-"}
              {formatVnd(transaction.amount)}
            </span>
            <span className="text-sm text-muted-foreground">
              {toDateInputValue(new Date(transaction.transactionDate))}
            </span>
            <Button type="button" variant="outline" onClick={() => deleteTransactionById(transaction)}>
              Xóa
            </Button>
          </div>
        ))}
        {transactions.length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground">Chưa có giao dịch.</p>
        ) : null}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Replace transactions page placeholder**

Modify `src/app/(app)/transactions/page.tsx`:

```tsx
import { listCategories } from "@/features/categories/service";
import { TransactionManager } from "@/features/transactions/transaction-manager";
import { listTransactions } from "@/features/transactions/service";
import { getCurrentUser } from "@/lib/auth-session";

export default async function TransactionsPage() {
  const user = await getCurrentUser();

  if (!user) {
    return null;
  }

  const [transactions, categories] = await Promise.all([
    listTransactions(user.id),
    listCategories(user.id),
  ]);

  return (
    <section className="space-y-6">
      <div className="space-y-2">
        <p className="text-sm font-medium text-muted-foreground">Giao dịch</p>
        <h1 className="text-2xl font-semibold tracking-normal">
          Thu chi hằng ngày
        </h1>
        <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
          Ghi lại thu nhập và chi tiêu bằng VND, có hỗ trợ nhập nhanh như 55k hoặc 18tr.
        </p>
      </div>
      <TransactionManager
        initialTransactions={transactions}
        categories={categories}
      />
    </section>
  );
}
```

- [ ] **Step 3: Run lint/build**

Run:

```bash
pnpm lint
pnpm build
```

Expected: PASS.

- [ ] **Step 4: Commit transaction UI**

Run:

```bash
git add src/features/transactions/transaction-manager.tsx 'src/app/(app)/transactions/page.tsx'
git commit -m "feat: add transaction management ui"
```

Expected: commit succeeds.

## Task 12: Final Verification And Docs

**Files:**
- Create: `docs/superpowers/plans/2026-05-26-phase-3-transactions-categories-verification.md`

- [ ] **Step 1: Run full test suite**

Run:

```bash
pnpm test
```

Expected: PASS.

- [ ] **Step 2: Run lint**

Run:

```bash
pnpm lint
```

Expected: PASS.

- [ ] **Step 3: Run build**

Run:

```bash
pnpm build
```

Expected: PASS.

- [ ] **Step 4: Run Prisma validation**

Run:

```bash
pnpm db:validate
```

Expected: PASS.

- [ ] **Step 5: Write verification document**

Create `docs/superpowers/plans/2026-05-26-phase-3-transactions-categories-verification.md` using the actual command results. If all verification commands pass, use this content:

```md
# Phase 3 Transactions And Categories Verification

## Summary

Phase 3 implemented authenticated transaction and category CRUD, VND parsing, API Route Handlers, and usable pages for `/transactions` and `/categories`.

## Commands

```bash
pnpm test
pnpm lint
pnpm build
pnpm db:validate
```

## Results

- `pnpm test`: passed.
- `pnpm lint`: passed.
- `pnpm build`: passed.
- `pnpm db:validate`: passed.

## Notes

- Database-backed API isolation tests were not added unless a reachable test PostgreSQL database was available during implementation.
- Category deletion returns a conflict when transactions reference the category.
- Transaction category ownership and type matching are enforced in the service layer.
```

If any command fails for an environment reason, write the exact command, the failure summary, and the reason it could not be fixed in this environment.

- [ ] **Step 6: Scan verification doc for placeholders**

Run:

```bash
rg -n "UNRESOLVED|PLACEHOLDER|not run|pending" docs/superpowers/plans/2026-05-26-phase-3-transactions-categories-verification.md
```

Expected: no output.

- [ ] **Step 7: Commit verification docs**

Run:

```bash
git add docs/superpowers/plans/2026-05-26-phase-3-transactions-categories-verification.md
git commit -m "docs: record phase 3 verification"
```

Expected: commit succeeds.

## Task 13: Final Review

**Files:**
- Read only unless fixes are needed.

- [ ] **Step 1: Inspect final diff from main**

Run:

```bash
git diff --stat main...HEAD
```

Expected: changes are limited to Phase 3 docs, helper code, feature modules, API routes, tests, and app pages.

- [ ] **Step 2: Check working tree**

Run:

```bash
git status --short
```

Expected: no output.

- [ ] **Step 3: If any verification command failed**

If a verification command failed, fix the implementation and rerun:

```bash
pnpm test
pnpm lint
pnpm build
pnpm db:validate
```

Expected: all commands pass or the remaining blocker is an environment dependency documented in the verification file.
