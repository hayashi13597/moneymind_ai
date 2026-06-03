# Category Budgets Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add expense-category monthly budgets with recurring defaults, month overrides, a `/budgets` workbench, and a compact dashboard summary.

**Architecture:** Budget rules live in a new `src/features/budgets` module. Server pages and API routes call budget services; client components only manage form state, fetch mutations, and visible refresh. The database stores one budget row per user/category/period, where `period` is either `default` or `YYYY-MM`.

**Tech Stack:** Next.js App Router 16, React 19, TypeScript, Prisma 7, PostgreSQL, Zod 4, Jest, shadcn/Radix-style local UI components.

---

## File Structure

- Create: `src/features/budgets/schemas.ts` for month, scope, amount, and API payload validation.
- Create: `src/features/budgets/service.ts` for effective budget resolution, spending aggregation, status calculation, and budget mutations.
- Create: `src/features/budgets/revalidation.ts` for budget-related `revalidatePath` calls.
- Create: `src/features/budgets/budget-manager.tsx` for the `/budgets` client workbench.
- Create: `src/app/(app)/budgets/page.tsx` for the server-rendered budgets page.
- Create: `src/app/api/budgets/route.ts` for authenticated `GET`, `PUT`, and `DELETE`.
- Modify: `prisma/schema.prisma` to add `CategoryBudget` and relations.
- Modify: `src/components/app-nav.tsx` to add `Ngân sách`.
- Modify: `src/app/(app)/dashboard/page.tsx` and `src/features/dashboard/dashboard-view.tsx` to load and render the budget summary.
- Test: `tests/budgets-schemas.test.ts`, `tests/budgets-service.test.ts`, `tests/budgets-route.test.ts`, `tests/budget-manager.test.ts`, and `tests/dashboard-budget-summary.test.ts`.

Before coding Next.js route/page/revalidation work, read:

```bash
sed -n '1,240p' node_modules/next/dist/docs/01-app/01-getting-started/15-route-handlers.md
sed -n '1,240p' node_modules/next/dist/docs/01-app/03-api-reference/04-functions/revalidatePath.md
```

Expected: docs confirm Route Handlers use Web `Request`/`Response`, and `revalidatePath` can be called from Route Handlers but not Client Components.

---

### Task 1: Prisma Budget Model

**Files:**
- Modify: `prisma/schema.prisma`
- Test: `prisma/schema.prisma`

- [ ] **Step 1: Add the Prisma model**

Add the `budgets` relation to `User`:

```prisma
model User {
  id            String        @id @default(cuid())
  name          String?
  email         String        @unique
  emailVerified Boolean       @default(false)
  image         String?
  createdAt     DateTime      @default(now())
  updatedAt     DateTime      @updatedAt

  accounts     Account[]
  sessions     Session[]
  categories   Category[]
  transactions Transaction[]
  aiInsights   AiInsight[]
  budgets      CategoryBudget[]

  @@map("user")
}
```

Add the `budgets` relation to `Category`:

```prisma
model Category {
  id        String           @id @default(cuid())
  userId    String
  name      String
  type      TransactionType?
  color     String?
  icon      String?
  isDefault Boolean          @default(false)
  createdAt DateTime         @default(now())
  updatedAt DateTime         @updatedAt

  user         User             @relation(fields: [userId], references: [id], onDelete: Cascade)
  transactions Transaction[]
  budgets      CategoryBudget[]

  @@unique([userId, name, type])
  @@index([userId])
}
```

Add this model after `Transaction`:

```prisma
model CategoryBudget {
  id         String   @id @default(cuid())
  userId     String
  categoryId String
  period     String
  amount     Int
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  user     User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  category Category @relation(fields: [categoryId], references: [id], onDelete: Cascade)

  @@unique([userId, categoryId, period])
  @@index([userId, period])
  @@index([userId, categoryId])
}
```

- [ ] **Step 2: Validate schema**

Run:

```bash
pnpm db:validate
```

Expected: Prisma schema validates successfully.

- [ ] **Step 3: Create migration**

Run:

```bash
pnpm prisma migrate dev --name add_category_budget
```

Expected: a migration folder is created under `prisma/migrations/*_add_category_budget/`.

- [ ] **Step 4: Generate Prisma client**

Run:

```bash
pnpm prisma generate
```

Expected: Prisma client generation completes and `db.categoryBudget` is available to TypeScript.

- [ ] **Step 5: Commit**

```bash
git add prisma/schema.prisma prisma/migrations
git commit -m "Add category budget model"
```

---

### Task 2: Budget Schemas

**Files:**
- Create: `src/features/budgets/schemas.ts`
- Test: `tests/budgets-schemas.test.ts`

- [ ] **Step 1: Write failing schema tests**

Create `tests/budgets-schemas.test.ts`:

```ts
import {
  budgetDeleteSchema,
  budgetQuerySchema,
  budgetUpsertSchema,
  toBudgetPeriod,
} from "@/features/budgets/schemas";

describe("budget schemas", () => {
  it("accepts a valid month query", () => {
    expect(budgetQuerySchema.parse({ month: "2026-06" })).toEqual({
      month: "2026-06",
    });
  });

  it("rejects invalid month queries", () => {
    expect(() => budgetQuerySchema.parse({ month: "2026-13" })).toThrow();
  });

  it("parses VND shorthand amounts for upsert", () => {
    expect(
      budgetUpsertSchema.parse({
        categoryId: "cat_food",
        scope: "default",
        amount: "3tr",
      }),
    ).toEqual({
      categoryId: "cat_food",
      scope: "default",
      amount: 3000000,
    });
  });

  it("requires month when scope is month", () => {
    expect(() =>
      budgetUpsertSchema.parse({
        categoryId: "cat_food",
        scope: "month",
        amount: "3tr",
      }),
    ).toThrow();
  });

  it("rejects zero budgets", () => {
    expect(() =>
      budgetUpsertSchema.parse({
        categoryId: "cat_food",
        scope: "default",
        amount: 0,
      }),
    ).toThrow();
  });

  it("maps scopes to storage periods", () => {
    expect(toBudgetPeriod({ scope: "default" })).toBe("default");
    expect(toBudgetPeriod({ scope: "month", month: "2026-06" })).toBe("2026-06");
  });

  it("validates delete payloads", () => {
    expect(
      budgetDeleteSchema.parse({
        categoryId: "cat_food",
        scope: "month",
        month: "2026-06",
      }),
    ).toEqual({
      categoryId: "cat_food",
      scope: "month",
      month: "2026-06",
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
pnpm test tests/budgets-schemas.test.ts --runInBand
```

Expected: FAIL because `src/features/budgets/schemas.ts` does not exist.

- [ ] **Step 3: Implement schemas**

Create `src/features/budgets/schemas.ts`:

```ts
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

export function toBudgetPeriod(input: { scope: "default" } | { scope: "month"; month: string }) {
  return input.scope === "default" ? "default" : input.month;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
pnpm test tests/budgets-schemas.test.ts --runInBand
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/features/budgets/schemas.ts tests/budgets-schemas.test.ts
git commit -m "Add budget validation schemas"
```

---

### Task 3: Budget Service

**Files:**
- Create: `src/features/budgets/service.ts`
- Test: `tests/budgets-service.test.ts`

- [ ] **Step 1: Write failing service tests**

Create `tests/budgets-service.test.ts`:

```ts
import {
  deleteBudget,
  getBudgetStatus,
  listCategoryBudgetRows,
  listDashboardBudgetSummary,
  upsertBudget,
} from "@/features/budgets/service";
import { db } from "@/lib/db";

jest.mock("@/lib/db", () => ({
  db: {
    category: { findMany: jest.fn(), findFirst: jest.fn() },
    categoryBudget: {
      findMany: jest.fn(),
      upsert: jest.fn(),
      deleteMany: jest.fn(),
    },
    transaction: { groupBy: jest.fn() },
  },
}));

const categoryFindManyMock = db.category.findMany as jest.Mock;
const categoryFindFirstMock = db.category.findFirst as jest.Mock;
const budgetFindManyMock = db.categoryBudget.findMany as jest.Mock;
const budgetUpsertMock = db.categoryBudget.upsert as jest.Mock;
const budgetDeleteManyMock = db.categoryBudget.deleteMany as jest.Mock;
const transactionGroupByMock = db.transaction.groupBy as jest.Mock;

const foodCategory = {
  id: "cat_food",
  userId: "user_1",
  name: "Ăn uống",
  type: "expense" as const,
  color: "#C76F3D",
};

const cafeCategory = {
  id: "cat_cafe",
  userId: "user_1",
  name: "Cafe",
  type: "expense" as const,
  color: "#8B5E34",
};

describe("budgets service", () => {
  beforeEach(() => {
    categoryFindManyMock.mockReset();
    categoryFindFirstMock.mockReset();
    budgetFindManyMock.mockReset();
    budgetUpsertMock.mockReset();
    budgetDeleteManyMock.mockReset();
    transactionGroupByMock.mockReset();
  });

  it("resolves month overrides before default budgets", async () => {
    categoryFindManyMock.mockResolvedValue([foodCategory]);
    budgetFindManyMock.mockResolvedValue([
      { categoryId: "cat_food", period: "default", amount: 3000000 },
      { categoryId: "cat_food", period: "2026-06", amount: 4000000 },
    ]);
    transactionGroupByMock.mockResolvedValue([
      { categoryId: "cat_food", _sum: { amount: 2500000 } },
    ]);

    const result = await listCategoryBudgetRows("user_1", "2026-06");

    expect(result.summary).toEqual({
      totalBudget: 4000000,
      totalSpent: 2500000,
      remaining: 1500000,
      overAmount: 0,
    });
    expect(result.rows[0]).toMatchObject({
      categoryId: "cat_food",
      categoryName: "Ăn uống",
      effectiveAmount: 4000000,
      defaultAmount: 3000000,
      monthAmount: 4000000,
      spentAmount: 2500000,
      remainingAmount: 1500000,
      status: "healthy",
    });
  });

  it("marks near-limit and over-limit budget rows", async () => {
    expect(getBudgetStatus(null, 500000)).toBe("not_set");
    expect(getBudgetStatus(1000000, 790000)).toBe("healthy");
    expect(getBudgetStatus(1000000, 800000)).toBe("near_limit");
    expect(getBudgetStatus(1000000, 1000001)).toBe("over_limit");
  });

  it("rejects budgets for income categories", async () => {
    categoryFindFirstMock.mockResolvedValue({
      id: "cat_income",
      userId: "user_1",
      name: "Thu nhập",
      type: "income",
    });

    const result = await upsertBudget("user_1", {
      categoryId: "cat_income",
      scope: "default",
      amount: 3000000,
    });

    expect(result).toEqual({ ok: false, reason: "invalid_category" });
    expect(budgetUpsertMock).not.toHaveBeenCalled();
  });

  it("upserts budgets by user, category, and period", async () => {
    categoryFindFirstMock.mockResolvedValue(foodCategory);
    budgetUpsertMock.mockResolvedValue({
      id: "budget_1",
      userId: "user_1",
      categoryId: "cat_food",
      period: "default",
      amount: 3000000,
    });

    const result = await upsertBudget("user_1", {
      categoryId: "cat_food",
      scope: "default",
      amount: 3000000,
    });

    expect(result.ok).toBe(true);
    expect(budgetUpsertMock).toHaveBeenCalledWith({
      where: {
        userId_categoryId_period: {
          userId: "user_1",
          categoryId: "cat_food",
          period: "default",
        },
      },
      create: {
        userId: "user_1",
        categoryId: "cat_food",
        period: "default",
        amount: 3000000,
      },
      update: { amount: 3000000 },
    });
  });

  it("deletes only the requested budget scope", async () => {
    categoryFindFirstMock.mockResolvedValue(foodCategory);
    budgetDeleteManyMock.mockResolvedValue({ count: 1 });

    const result = await deleteBudget("user_1", {
      categoryId: "cat_food",
      scope: "month",
      month: "2026-06",
    });

    expect(result).toEqual({ ok: true, count: 1 });
    expect(budgetDeleteManyMock).toHaveBeenCalledWith({
      where: {
        userId: "user_1",
        categoryId: "cat_food",
        period: "2026-06",
      },
    });
  });

  it("prioritizes dashboard summary rows", async () => {
    categoryFindManyMock.mockResolvedValue([foodCategory, cafeCategory]);
    budgetFindManyMock.mockResolvedValue([
      { categoryId: "cat_food", period: "default", amount: 3000000 },
      { categoryId: "cat_cafe", period: "default", amount: 500000 },
    ]);
    transactionGroupByMock.mockResolvedValue([
      { categoryId: "cat_food", _sum: { amount: 2400000 } },
      { categoryId: "cat_cafe", _sum: { amount: 620000 } },
    ]);

    const result = await listDashboardBudgetSummary("user_1", "2026-06");

    expect(result.items.map((item) => item.categoryName)).toEqual([
      "Cafe",
      "Ăn uống",
    ]);
    expect(result.items[0].status).toBe("over_limit");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
pnpm test tests/budgets-service.test.ts --runInBand
```

Expected: FAIL because `src/features/budgets/service.ts` does not exist.

- [ ] **Step 3: Implement budget service**

Create `src/features/budgets/service.ts`:

```ts
import { getMonthWindow } from "@/features/dashboard/month";
import { db } from "@/lib/db";

import type { BudgetDeleteInput, BudgetUpsertInput } from "./schemas";
import { toBudgetPeriod } from "./schemas";

export const BUDGET_NEAR_LIMIT_RATIO = 0.8;

export type BudgetStatus = "not_set" | "healthy" | "near_limit" | "over_limit";

export type CategoryBudgetRow = {
  categoryId: string;
  categoryName: string;
  categoryColor: string | null;
  defaultAmount: number | null;
  monthAmount: number | null;
  effectiveAmount: number | null;
  spentAmount: number;
  remainingAmount: number | null;
  progressPercentage: number | null;
  status: BudgetStatus;
};

export type BudgetSummary = {
  totalBudget: number;
  totalSpent: number;
  remaining: number;
  overAmount: number;
};

export type CategoryBudgetList = {
  rows: CategoryBudgetRow[];
  summary: BudgetSummary;
};

async function validateExpenseCategory(userId: string, categoryId: string) {
  const category = await db.category.findFirst({
    where: { id: categoryId, userId },
  });

  if (!category || category.type !== "expense") {
    return { ok: false as const, reason: "invalid_category" as const };
  }

  return { ok: true as const, category };
}

export function getBudgetStatus(
  effectiveAmount: number | null,
  spentAmount: number,
): BudgetStatus {
  if (!effectiveAmount) {
    return "not_set";
  }

  if (spentAmount > effectiveAmount) {
    return "over_limit";
  }

  if (spentAmount / effectiveAmount >= BUDGET_NEAR_LIMIT_RATIO) {
    return "near_limit";
  }

  return "healthy";
}

export async function listCategoryBudgetRows(
  userId: string,
  monthKey: string,
): Promise<CategoryBudgetList> {
  const window = getMonthWindow(monthKey);
  const [categories, budgets, spending] = await Promise.all([
    db.category.findMany({
      where: { userId, type: "expense" },
      orderBy: { name: "asc" },
    }),
    db.categoryBudget.findMany({
      where: {
        userId,
        period: { in: ["default", monthKey] },
      },
    }),
    db.transaction.groupBy({
      by: ["categoryId"],
      where: {
        userId,
        type: "expense",
        transactionDate: {
          gte: window.start,
          lt: window.end,
        },
      },
      _sum: { amount: true },
    }),
  ]);

  const defaultBudgets = new Map(
    budgets
      .filter((budget) => budget.period === "default")
      .map((budget) => [budget.categoryId, budget.amount]),
  );
  const monthBudgets = new Map(
    budgets
      .filter((budget) => budget.period === monthKey)
      .map((budget) => [budget.categoryId, budget.amount]),
  );
  const spentAmounts = new Map(
    spending.map((item) => [item.categoryId, item._sum.amount ?? 0]),
  );

  const rows = categories.map((category) => {
    const defaultAmount = defaultBudgets.get(category.id) ?? null;
    const monthAmount = monthBudgets.get(category.id) ?? null;
    const effectiveAmount = monthAmount ?? defaultAmount;
    const spentAmount = spentAmounts.get(category.id) ?? 0;
    const remainingAmount =
      effectiveAmount === null ? null : effectiveAmount - spentAmount;
    const progressPercentage =
      effectiveAmount === null
        ? null
        : Math.min(999, Math.round((spentAmount / effectiveAmount) * 100));

    return {
      categoryId: category.id,
      categoryName: category.name,
      categoryColor: category.color,
      defaultAmount,
      monthAmount,
      effectiveAmount,
      spentAmount,
      remainingAmount,
      progressPercentage,
      status: getBudgetStatus(effectiveAmount, spentAmount),
    };
  });

  const budgetedRows = rows.filter((row) => row.effectiveAmount !== null);
  const totalBudget = budgetedRows.reduce(
    (total, row) => total + (row.effectiveAmount ?? 0),
    0,
  );
  const totalSpent = budgetedRows.reduce(
    (total, row) => total + row.spentAmount,
    0,
  );
  const overAmount = budgetedRows.reduce(
    (total, row) => total + Math.max(0, row.spentAmount - (row.effectiveAmount ?? 0)),
    0,
  );

  return {
    rows,
    summary: {
      totalBudget,
      totalSpent,
      remaining: totalBudget - totalSpent,
      overAmount,
    },
  };
}

export async function listDashboardBudgetSummary(userId: string, monthKey: string) {
  const result = await listCategoryBudgetRows(userId, monthKey);
  const statusRank: Record<BudgetStatus, number> = {
    over_limit: 0,
    near_limit: 1,
    healthy: 2,
    not_set: 3,
  };

  const items = result.rows
    .filter((row) => row.effectiveAmount !== null)
    .sort((a, b) => {
      const rankDelta = statusRank[a.status] - statusRank[b.status];

      if (rankDelta !== 0) {
        return rankDelta;
      }

      return (b.progressPercentage ?? 0) - (a.progressPercentage ?? 0);
    })
    .slice(0, 5);

  return { ...result, items };
}

export async function upsertBudget(userId: string, input: BudgetUpsertInput) {
  const categoryResult = await validateExpenseCategory(userId, input.categoryId);

  if (!categoryResult.ok) {
    return categoryResult;
  }

  const period = toBudgetPeriod(
    input.scope === "default"
      ? { scope: "default" }
      : { scope: "month", month: input.month as string },
  );
  const budget = await db.categoryBudget.upsert({
    where: {
      userId_categoryId_period: {
        userId,
        categoryId: input.categoryId,
        period,
      },
    },
    create: {
      userId,
      categoryId: input.categoryId,
      period,
      amount: input.amount,
    },
    update: { amount: input.amount },
  });

  return { ok: true as const, budget };
}

export async function deleteBudget(userId: string, input: BudgetDeleteInput) {
  const categoryResult = await validateExpenseCategory(userId, input.categoryId);

  if (!categoryResult.ok) {
    return categoryResult;
  }

  const period = toBudgetPeriod(
    input.scope === "default"
      ? { scope: "default" }
      : { scope: "month", month: input.month as string },
  );
  const result = await db.categoryBudget.deleteMany({
    where: {
      userId,
      categoryId: input.categoryId,
      period,
    },
  });

  return { ok: true as const, count: result.count };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
pnpm test tests/budgets-service.test.ts --runInBand
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/features/budgets/service.ts tests/budgets-service.test.ts
git commit -m "Add budget service"
```

---

### Task 4: Budget API And Revalidation

**Files:**
- Create: `src/features/budgets/revalidation.ts`
- Create: `src/app/api/budgets/route.ts`
- Test: `tests/budgets-route.test.ts`

- [ ] **Step 1: Write failing route tests**

Create `tests/budgets-route.test.ts`:

```ts
import { revalidatePath } from "next/cache";

import { DELETE, GET, PUT } from "@/app/api/budgets/route";
import {
  deleteBudget,
  listCategoryBudgetRows,
  upsertBudget,
} from "@/features/budgets/service";
import { getRequiredApiUser } from "@/lib/api";

jest.mock("next/cache", () => ({
  revalidatePath: jest.fn(),
}));

jest.mock("@/lib/api", () => ({
  getRequiredApiUser: jest.fn(),
  jsonBadRequest: (error = "Dữ liệu không hợp lệ.") =>
    Response.json({ error }, { status: 400 }),
  jsonError: (error: string, status: number) =>
    Response.json({ error }, { status }),
  jsonUnauthorized: () =>
    Response.json({ error: "Bạn cần đăng nhập để tiếp tục." }, { status: 401 }),
}));

jest.mock("@/features/budgets/service", () => ({
  deleteBudget: jest.fn(),
  listCategoryBudgetRows: jest.fn(),
  upsertBudget: jest.fn(),
}));

const getRequiredApiUserMock = getRequiredApiUser as jest.Mock;
const listCategoryBudgetRowsMock = listCategoryBudgetRows as jest.Mock;
const upsertBudgetMock = upsertBudget as jest.Mock;
const deleteBudgetMock = deleteBudget as jest.Mock;
const revalidatePathMock = revalidatePath as jest.Mock;
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

describe("budgets route", () => {
  beforeEach(() => {
    getRequiredApiUserMock.mockResolvedValue({ id: "user_1" });
    listCategoryBudgetRowsMock.mockResolvedValue({
      rows: [],
      summary: { totalBudget: 0, totalSpent: 0, remaining: 0, overAmount: 0 },
    });
    upsertBudgetMock.mockResolvedValue({ ok: true, budget: { id: "budget_1" } });
    deleteBudgetMock.mockResolvedValue({ ok: true, count: 1 });
    revalidatePathMock.mockReset();
  });

  it("requires auth", async () => {
    getRequiredApiUserMock.mockResolvedValue(null);

    const response = await GET({
      url: "http://localhost/api/budgets?month=2026-06",
    } as Request);

    expect(response.status).toBe(401);
  });

  it("rejects invalid month queries", async () => {
    const response = await GET({
      url: "http://localhost/api/budgets?month=2026-13",
    } as Request);
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload).toEqual({ error: "Tháng không hợp lệ." });
    expect(listCategoryBudgetRowsMock).not.toHaveBeenCalled();
  });

  it("lists budgets for the selected month", async () => {
    const response = await GET({
      url: "http://localhost/api/budgets?month=2026-06",
    } as Request);

    expect(response.status).toBe(200);
    expect(listCategoryBudgetRowsMock).toHaveBeenCalledWith("user_1", "2026-06");
  });

  it("upserts budgets and revalidates budget-backed views", async () => {
    const response = await PUT({
      json: async () => ({
        categoryId: "cat_food",
        scope: "month",
        month: "2026-06",
        amount: "3tr",
      }),
    } as Request);

    expect(response.status).toBe(200);
    expect(upsertBudgetMock).toHaveBeenCalledWith("user_1", {
      categoryId: "cat_food",
      scope: "month",
      month: "2026-06",
      amount: 3000000,
    });
    expect(revalidatePathMock).toHaveBeenCalledWith("/(app)/budgets");
    expect(revalidatePathMock).toHaveBeenCalledWith("/budgets");
    expect(revalidatePathMock).toHaveBeenCalledWith("/(app)/dashboard");
    expect(revalidatePathMock).toHaveBeenCalledWith("/dashboard");
  });

  it("returns Vietnamese category errors", async () => {
    upsertBudgetMock.mockResolvedValue({
      ok: false,
      reason: "invalid_category",
    });

    const response = await PUT({
      json: async () => ({
        categoryId: "cat_income",
        scope: "default",
        amount: "3tr",
      }),
    } as Request);
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload).toEqual({ error: "Danh mục không hợp lệ." });
  });

  it("deletes budgets and revalidates", async () => {
    const response = await DELETE({
      json: async () => ({
        categoryId: "cat_food",
        scope: "default",
      }),
    } as Request);

    expect(response.status).toBe(200);
    expect(deleteBudgetMock).toHaveBeenCalledWith("user_1", {
      categoryId: "cat_food",
      scope: "default",
    });
    expect(revalidatePathMock).toHaveBeenCalledWith("/(app)/budgets");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
pnpm test tests/budgets-route.test.ts --runInBand
```

Expected: FAIL because the route and revalidation module do not exist.

- [ ] **Step 3: Implement revalidation helper**

Create `src/features/budgets/revalidation.ts`:

```ts
import { revalidatePath } from "next/cache";

export function revalidateBudgetViews() {
  revalidatePath("/(app)/budgets");
  revalidatePath("/budgets");
  revalidatePath("/(app)/dashboard");
  revalidatePath("/dashboard");
}
```

- [ ] **Step 4: Implement API route**

Create `src/app/api/budgets/route.ts`:

```ts
import { revalidateBudgetViews } from "@/features/budgets/revalidation";
import {
  budgetDeleteSchema,
  budgetQuerySchema,
  budgetUpsertSchema,
} from "@/features/budgets/schemas";
import {
  deleteBudget,
  listCategoryBudgetRows,
  upsertBudget,
} from "@/features/budgets/service";
import {
  getRequiredApiUser,
  jsonBadRequest,
  jsonError,
  jsonUnauthorized,
} from "@/lib/api";

function budgetDomainError(reason: string) {
  if (reason === "invalid_category") {
    return jsonError("Danh mục không hợp lệ.", 400);
  }

  return jsonBadRequest();
}

export async function GET(request: Request) {
  const user = await getRequiredApiUser();

  if (!user) {
    return jsonUnauthorized();
  }

  const searchParams = new URL(request.url).searchParams;
  const parsed = budgetQuerySchema.safeParse({
    month: searchParams.get("month"),
  });

  if (!parsed.success) {
    return jsonBadRequest("Tháng không hợp lệ.");
  }

  const result = await listCategoryBudgetRows(user.id, parsed.data.month);

  return Response.json(result);
}

export async function PUT(request: Request) {
  const user = await getRequiredApiUser();

  if (!user) {
    return jsonUnauthorized();
  }

  const parsed = budgetUpsertSchema.safeParse(await request.json());

  if (!parsed.success) {
    return jsonBadRequest();
  }

  const result = await upsertBudget(user.id, parsed.data);

  if (!result.ok) {
    return budgetDomainError(result.reason);
  }

  revalidateBudgetViews();

  return Response.json({ budget: result.budget });
}

export async function DELETE(request: Request) {
  const user = await getRequiredApiUser();

  if (!user) {
    return jsonUnauthorized();
  }

  const parsed = budgetDeleteSchema.safeParse(await request.json());

  if (!parsed.success) {
    return jsonBadRequest();
  }

  const result = await deleteBudget(user.id, parsed.data);

  if (!result.ok) {
    return budgetDomainError(result.reason);
  }

  revalidateBudgetViews();

  return Response.json({ deleted: result.count });
}
```

- [ ] **Step 5: Run test to verify it passes**

Run:

```bash
pnpm test tests/budgets-route.test.ts --runInBand
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/features/budgets/revalidation.ts src/app/api/budgets/route.ts tests/budgets-route.test.ts
git commit -m "Add budget API routes"
```

---

### Task 5: Budgets Page And Manager

**Files:**
- Create: `src/app/(app)/budgets/page.tsx`
- Create: `src/features/budgets/budget-manager.tsx`
- Modify: `src/components/app-nav.tsx`
- Test: `tests/budget-manager.test.ts`

- [ ] **Step 1: Write failing manager tests**

Create `tests/budget-manager.test.ts`:

```ts
import React from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";

import { BudgetManager } from "@/features/budgets/budget-manager";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean })
  .IS_REACT_ACT_ENVIRONMENT = true;

const pushMock = jest.fn();
const refreshMock = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: pushMock,
    refresh: refreshMock,
  }),
}));

const selectedMonth = {
  key: "2026-06",
  label: "Tháng 06/2026",
  previousKey: "2026-05",
  nextKey: "2026-07",
};

const budgetData = {
  summary: {
    totalBudget: 3500000,
    totalSpent: 3120000,
    remaining: 380000,
    overAmount: 120000,
  },
  rows: [
    {
      categoryId: "cat_food",
      categoryName: "Ăn uống",
      categoryColor: "#C76F3D",
      defaultAmount: 3000000,
      monthAmount: null,
      effectiveAmount: 3000000,
      spentAmount: 2500000,
      remainingAmount: 500000,
      progressPercentage: 83,
      status: "near_limit" as const,
    },
    {
      categoryId: "cat_cafe",
      categoryName: "Cafe",
      categoryColor: "#8B5E34",
      defaultAmount: 500000,
      monthAmount: null,
      effectiveAmount: 500000,
      spentAmount: 620000,
      remainingAmount: -120000,
      progressPercentage: 124,
      status: "over_limit" as const,
    },
    {
      categoryId: "cat_health",
      categoryName: "Sức khỏe",
      categoryColor: null,
      defaultAmount: null,
      monthAmount: null,
      effectiveAmount: null,
      spentAmount: 0,
      remainingAmount: null,
      progressPercentage: null,
      status: "not_set" as const,
    },
  ],
};

describe("BudgetManager", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    pushMock.mockReset();
    refreshMock.mockReset();
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
    jest.restoreAllMocks();
  });

  it("renders summary totals and row statuses", () => {
    act(() => {
      root.render(
        React.createElement(BudgetManager, {
          selectedMonth,
          initialData: budgetData,
        }),
      );
    });

    expect(container.textContent).toContain("Tổng ngân sách");
    expect(container.textContent).toContain("3.500.000");
    expect(container.textContent).toContain("Ăn uống");
    expect(container.textContent).toContain("Gần vượt");
    expect(container.textContent).toContain("Cafe");
    expect(container.textContent).toContain("Đã vượt");
    expect(container.textContent).toContain("Sức khỏe");
    expect(container.textContent).toContain("Chưa đặt");
  });

  it("navigates between budget months", () => {
    act(() => {
      root.render(
        React.createElement(BudgetManager, {
          selectedMonth,
          initialData: budgetData,
        }),
      );
    });

    act(() => {
      container
        .querySelector<HTMLButtonElement>('[aria-label="Xem ngân sách tháng trước"]')
        ?.click();
    });

    expect(pushMock).toHaveBeenCalledWith("/budgets?month=2026-05");
  });

  it("submits a selected-month override and refreshes", async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ budget: { id: "budget_1" } }),
    });
    globalThis.fetch = fetchMock;

    act(() => {
      root.render(
        React.createElement(BudgetManager, {
          selectedMonth,
          initialData: budgetData,
        }),
      );
    });

    await act(async () => {
      container
        .querySelector<HTMLButtonElement>(
          '[aria-label="Sửa ngân sách tháng này cho Ăn uống"]',
        )
        ?.click();
    });

    await act(async () => {
      const input = document.querySelector<HTMLInputElement>(
        'input[name="amount"]',
      );
      if (input) {
        input.value = "4tr";
        input.dispatchEvent(new Event("input", { bubbles: true }));
      }
    });

    await act(async () => {
      document
        .querySelector<HTMLButtonElement>('[aria-label="Lưu ngân sách"]')
        ?.click();
    });

    expect(fetchMock).toHaveBeenCalledWith("/api/budgets", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        categoryId: "cat_food",
        scope: "month",
        month: "2026-06",
        amount: "4tr",
      }),
    });
    expect(refreshMock).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
pnpm test tests/budget-manager.test.ts --runInBand
```

Expected: FAIL because `BudgetManager` does not exist.

- [ ] **Step 3: Implement the server page**

Create `src/app/(app)/budgets/page.tsx`:

```tsx
import { cookies } from "next/headers";

import { PageHeader } from "@/components/app-ui";
import { BudgetManager } from "@/features/budgets/budget-manager";
import { listCategoryBudgetRows } from "@/features/budgets/service";
import {
  getSelectedMonth,
  USER_TIME_ZONE_COOKIE,
} from "@/features/dashboard/month";
import { getCurrentUser } from "@/lib/auth-session";

type BudgetsPageProps = {
  searchParams: Promise<{
    month?: string | string[];
  }>;
};

function firstSearchParam(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function BudgetsPage({ searchParams }: BudgetsPageProps) {
  const user = await getCurrentUser();

  if (!user) {
    return null;
  }

  const params = await searchParams;
  const userTimeZone = (await cookies()).get(USER_TIME_ZONE_COOKIE)?.value;
  const selectedMonth = getSelectedMonth(
    firstSearchParam(params.month),
    undefined,
    userTimeZone,
  );
  const budgetData = await listCategoryBudgetRows(user.id, selectedMonth.key);

  return (
    <section className="space-y-8">
      <PageHeader
        eyebrow="Ngân sách"
        title="Kế hoạch chi tiêu theo danh mục"
        description="Đặt hạn mức cho từng nhóm chi tiêu, theo dõi phần đã dùng trong tháng và điều chỉnh riêng cho những tháng đặc biệt."
      />
      <BudgetManager selectedMonth={selectedMonth} initialData={budgetData} />
    </section>
  );
}
```

- [ ] **Step 4: Implement manager component**

Create `src/features/budgets/budget-manager.tsx`. Keep the first version functional and compact: render summary cards, row status labels, previous/next month buttons, and an edit dialog made from local state.

Use these exported prop types:

```tsx
"use client";

import { ChevronLeft, ChevronRight, Pencil, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import type { DashboardMonth } from "@/features/dashboard/month";
import { formatVnd } from "@/lib/money";

import type { CategoryBudgetList, CategoryBudgetRow } from "./service";

type BudgetManagerProps = {
  selectedMonth: DashboardMonth;
  initialData: CategoryBudgetList;
};

type EditingState = {
  row: CategoryBudgetRow;
  scope: "default" | "month";
} | null;

const statusLabels = {
  not_set: "Chưa đặt",
  healthy: "Ổn",
  near_limit: "Gần vượt",
  over_limit: "Đã vượt",
} as const;
```

The component must:

- Call `router.push("/budgets?month=2026-05")` for previous-month navigation when `selectedMonth.previousKey` is `2026-05`, and use `selectedMonth.nextKey` for the next-month button.
- Show `formatVnd` values for budget, spent, and remaining.
- Use `fetch("/api/budgets", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ categoryId: row.categoryId, scope, month: scope === "month" ? selectedMonth.key : undefined, amount }) })` on save.
- Use `fetch("/api/budgets", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ categoryId: row.categoryId, scope, month: scope === "month" ? selectedMonth.key : undefined }) })` for delete actions.
- Call `router.refresh()` after successful mutations.
- Use buttons with these aria labels so tests can find them:
  - `Xem ngân sách tháng trước`
  - `Xem ngân sách tháng sau`
  - `Sửa ngân sách tháng này cho Ăn uống` for an `Ăn uống` row
  - `Sửa ngân sách mặc định cho Ăn uống` for an `Ăn uống` row
  - `Xóa override tháng này cho Ăn uống` for an `Ăn uống` row
  - `Xóa ngân sách mặc định cho Ăn uống` for an `Ăn uống` row
  - `Lưu ngân sách`

If the first implementation gets large, split presentational row rendering into a local `BudgetRowView` function in the same file; do not create extra files until the component becomes hard to test.

- [ ] **Step 5: Add navigation item**

Modify `src/components/app-nav.tsx`:

```ts
const navItems = [
  { href: "/dashboard", label: "Tổng quan" },
  { href: "/transactions", label: "Giao dịch" },
  { href: "/budgets", label: "Ngân sách" },
  { href: "/categories", label: "Danh mục" },
  { href: "/settings/ai", label: "AI Coach" },
] as const;
```

- [ ] **Step 6: Run manager test to verify it passes**

Run:

```bash
pnpm test tests/budget-manager.test.ts --runInBand
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add 'src/app/(app)/budgets/page.tsx' src/features/budgets/budget-manager.tsx src/components/app-nav.tsx tests/budget-manager.test.ts
git commit -m "Add budgets workbench"
```

---

### Task 6: Dashboard Budget Summary

**Files:**
- Modify: `src/app/(app)/dashboard/page.tsx`
- Modify: `src/features/dashboard/dashboard-view.tsx`
- Test: `tests/dashboard-budget-summary.test.ts`

- [ ] **Step 1: Write failing dashboard summary test**

Create `tests/dashboard-budget-summary.test.ts`:

```ts
import React from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";

import type { MonthlyInsightDto } from "@/features/ai/monthly-insight";
import { DashboardView } from "@/features/dashboard/dashboard-view";
import type { MonthlyDashboard } from "@/features/dashboard/service";

jest.mock("@/features/ai/monthly-insight-panel", () => ({
  MonthlyInsightPanel: () => React.createElement("div", null, "Insight panel"),
}));

jest.mock("@/features/dashboard/ask-moneymind-panel", () => ({
  AskMoneyMindPanel: () => React.createElement("div", null, "Ask panel"),
}));

const dashboard: MonthlyDashboard = {
  month: {
    key: "2026-06",
    label: "Tháng 06/2026",
    previousKey: "2026-05",
    nextKey: "2026-07",
  },
  totals: { income: 10000000, expense: 3120000, remaining: 6880000 },
  previousTotals: { income: 9000000, expense: 2500000, remaining: 6500000 },
  healthScore: {
    score: 82,
    level: "Ổn",
    savingsRate: 68,
    explanation: "Bạn vẫn giữ lại được phần lớn thu nhập.",
  },
  comparison: {
    income: { kind: "increased", delta: 1000000, percentage: 11 },
    expense: { kind: "increased", delta: 620000, percentage: 25 },
    remaining: { kind: "increased", delta: 380000, percentage: 6 },
  },
  categoryBreakdown: [],
  categoryAnalysis: [],
  spendingTrend: [],
  recentTransactions: [],
  isEmpty: false,
};

const initialInsight: MonthlyInsightDto | null = null;

const budgetSummary = {
  summary: {
    totalBudget: 3500000,
    totalSpent: 3120000,
    remaining: 380000,
    overAmount: 120000,
  },
  items: [
    {
      categoryId: "cat_cafe",
      categoryName: "Cafe",
      categoryColor: "#8B5E34",
      defaultAmount: 500000,
      monthAmount: null,
      effectiveAmount: 500000,
      spentAmount: 620000,
      remainingAmount: -120000,
      progressPercentage: 124,
      status: "over_limit" as const,
    },
    {
      categoryId: "cat_food",
      categoryName: "Ăn uống",
      categoryColor: "#C76F3D",
      defaultAmount: 3000000,
      monthAmount: null,
      effectiveAmount: 3000000,
      spentAmount: 2500000,
      remainingAmount: 500000,
      progressPercentage: 83,
      status: "near_limit" as const,
    },
  ],
};

describe("Dashboard budget summary", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
  });

  it("renders budget summary and selected-month link", () => {
    act(() => {
      root.render(
        React.createElement(DashboardView, {
          dashboard,
          initialInsight,
          userName: "Lâm",
          budgetSummary,
        }),
      );
    });

    expect(container.textContent).toContain("Ngân sách tháng này");
    expect(container.textContent).toContain("Cafe");
    expect(container.textContent).toContain("Đã vượt");
    expect(container.textContent).toContain("Ăn uống");
    expect(container.textContent).toContain("Gần vượt");
    expect(
      container.querySelector<HTMLAnchorElement>('a[href="/budgets?month=2026-06"]'),
    ).not.toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
pnpm test tests/dashboard-budget-summary.test.ts --runInBand
```

Expected: FAIL because `DashboardView` does not accept `budgetSummary`.

- [ ] **Step 3: Load budget summary on dashboard page**

Modify `src/app/(app)/dashboard/page.tsx`:

```tsx
import { listDashboardBudgetSummary } from "@/features/budgets/service";
```

Change the data load to:

```tsx
const [dashboard, initialInsight, budgetSummary] = await Promise.all([
  getMonthlyDashboard(session.user.id, selectedMonth),
  getCachedMonthlyInsight(session.user.id, selectedMonth.key),
  listDashboardBudgetSummary(session.user.id, selectedMonth.key),
]);
```

Pass it to the view:

```tsx
<DashboardView
  dashboard={dashboard}
  initialInsight={initialInsight}
  userName={userName}
  budgetSummary={budgetSummary}
/>
```

- [ ] **Step 4: Render dashboard budget block**

Modify `src/features/dashboard/dashboard-view.tsx`:

```tsx
import type { CategoryBudgetList, CategoryBudgetRow } from "@/features/budgets/service";
```

Update props:

```ts
type DashboardViewProps = {
  dashboard: MonthlyDashboard;
  initialInsight: MonthlyInsightDto | null;
  userName: string;
  budgetSummary: CategoryBudgetList & { items: CategoryBudgetRow[] };
};
```

Add a local label helper:

```ts
const budgetStatusLabels = {
  not_set: "Chưa đặt",
  healthy: "Ổn",
  near_limit: "Gần vượt",
  over_limit: "Đã vượt",
} as const;
```

Add a section in the dashboard layout, near the existing category analysis area:

```tsx
<section className="rounded-2xl border border-[#DCD7CC] bg-[#FDFCF8] p-5">
  <div className="flex items-start justify-between gap-4">
    <div>
      <h2 className="text-lg font-semibold text-foreground">
        Ngân sách tháng này
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Đã chi {formatVnd(budgetSummary.summary.totalSpent)} /{" "}
        {formatVnd(budgetSummary.summary.totalBudget)}
      </p>
    </div>
    <Button asChild variant="outline" className="border-[#DDD8CE]">
      <Link href={`/budgets?month=${dashboard.month.key}`}>Xem ngân sách</Link>
    </Button>
  </div>
  <div className="mt-4 space-y-3">
    {budgetSummary.items.length > 0 ? (
      budgetSummary.items.map((item) => (
        <div
          key={item.categoryId}
          className="flex items-center justify-between gap-4 border-t border-[#E8E1D6] pt-3 text-sm"
        >
          <div>
            <p className="font-medium text-foreground">{item.categoryName}</p>
            <p className="text-muted-foreground">
              {formatVnd(item.spentAmount)} /{" "}
              {formatVnd(item.effectiveAmount ?? 0)}
            </p>
          </div>
          <span className="font-medium text-foreground">
            {budgetStatusLabels[item.status]}
          </span>
        </div>
      ))
    ) : (
      <p className="text-sm text-muted-foreground">
        Chưa có ngân sách cho tháng này.
      </p>
    )}
  </div>
</section>
```

- [ ] **Step 5: Run dashboard test to verify it passes**

Run:

```bash
pnpm test tests/dashboard-budget-summary.test.ts --runInBand
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add 'src/app/(app)/dashboard/page.tsx' src/features/dashboard/dashboard-view.tsx tests/dashboard-budget-summary.test.ts
git commit -m "Add dashboard budget summary"
```

---

### Task 7: Full Verification And Cleanup

**Files:**
- Verify all changed files.

- [ ] **Step 1: Run focused budget tests**

Run:

```bash
pnpm test tests/budgets-schemas.test.ts tests/budgets-service.test.ts tests/budgets-route.test.ts tests/budget-manager.test.ts tests/dashboard-budget-summary.test.ts --runInBand
```

Expected: PASS.

- [ ] **Step 2: Run full test suite**

Run:

```bash
pnpm test --runInBand
```

Expected: PASS.

- [ ] **Step 3: Run lint**

Run:

```bash
pnpm lint
```

Expected: PASS.

- [ ] **Step 4: Validate Prisma**

Run:

```bash
pnpm db:validate
```

Expected: PASS.

- [ ] **Step 5: Build**

Run:

```bash
pnpm build
```

Expected: PASS. If the build reports a Turbopack port/process issue, rerun once before changing code because prior work in this repo has hit environment-specific build noise.

- [ ] **Step 6: Inspect git status**

Run:

```bash
git status --short
```

Expected: only intentional files are modified or the worktree is clean. Do not stage the existing unrelated `src/app/(public)/page.tsx` change unless the user explicitly asks.

- [ ] **Step 7: Commit final verification note if code changed after previous commits**

If Step 6 shows intentional uncommitted code changes, commit them:

Use `git diff --name-only` to list the intentional remaining files, stage only those exact files, and run:

```bash
git commit -m "Polish category budgets"
```

Expected: no unrelated files are included, especially not `src/app/(public)/page.tsx`.
