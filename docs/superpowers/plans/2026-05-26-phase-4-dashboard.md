# Phase 4 Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a server-rendered monthly dashboard with KPI totals, category breakdown, month-over-month comparison, empty state, and focused tests.

**Architecture:** Keep Phase 4 service-first. Put pure month helpers and aggregation logic in `src/features/dashboard`, render the dashboard from `src/app/(app)/dashboard/page.tsx`, and keep the chart as the only client component because Recharts renders in the browser.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Tailwind CSS 4, Prisma 7/PostgreSQL, Better Auth, Jest, Recharts 3.

---

## Pre-Execution Notes

- Work on branch `phase/4-dashboard`.
- Design spec: `docs/superpowers/specs/2026-05-26-phase-4-dashboard-design.md`.
- There is an unrelated local `.gitignore` change adding `.commandcode/`. Do not revert it and do not include it in Phase 4 commits unless the user explicitly asks.
- Local Next.js docs checked before planning:
  - `node_modules/next/dist/docs/01-app/01-getting-started/06-fetching-data.md`
  - `node_modules/next/dist/docs/01-app/01-getting-started/03-layouts-and-pages.md`
  - `node_modules/next/dist/docs/01-app/01-getting-started/10-error-handling.md`
- Context7 Recharts docs checked for `PieChart`, `Pie`, `Cell`, `Tooltip`, and `ResponsiveContainer`. Recharts chart components are imported from `recharts` and used in a `"use client"` component.
- Do not add AI insight generation, budget features, OCR, chat, export, or a dashboard API route in this phase.
- Run `git status --short` before each task. If unrelated user changes appear, leave them untouched.

## File Structure

Files to create:

- `src/features/dashboard/month.ts`: pure month parsing, formatting, shifting, and date-window helpers.
- `tests/dashboard-month.test.ts`: month helper unit tests.
- `src/features/dashboard/service.ts`: user-scoped Prisma aggregation and dashboard DTO creation.
- `tests/dashboard-service.test.ts`: service tests with mocked Prisma calls.
- `src/features/dashboard/category-breakdown-chart.tsx`: small client component that renders a responsive Recharts pie/donut chart.
- `src/features/dashboard/dashboard-view.tsx`: server-rendered dashboard UI that consumes the service DTO.
- `docs/superpowers/plans/2026-05-26-phase-4-dashboard-verification.md`: final verification notes after implementation.

Files to modify:

- `src/app/(app)/dashboard/page.tsx`: replace the current Phase 4 stub copy with the server-loaded dashboard page.

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
phase/4-dashboard
```

- [ ] **Step 2: Confirm working tree**

Run:

```bash
git status --short
```

Expected output may include the pre-existing `.gitignore` change:

```text
 M .gitignore
```

If other files are modified, inspect them before continuing and do not overwrite unrelated user work.

- [ ] **Step 3: Run baseline tests**

Run:

```bash
pnpm test
```

Expected: existing tests pass.

- [ ] **Step 4: Run baseline lint**

Run:

```bash
pnpm lint
```

Expected: lint passes.

- [ ] **Step 5: Run database schema validation**

Run:

```bash
pnpm db:validate
```

Expected: Prisma schema validates.

## Task 2: Add Month Helpers

**Files:**
- Create: `src/features/dashboard/month.ts`
- Create: `tests/dashboard-month.test.ts`

- [ ] **Step 1: Write failing month helper tests**

Create `tests/dashboard-month.test.ts`:

```ts
import {
  getMonthWindow,
  getNextMonthKey,
  getPreviousMonthKey,
  getSelectedMonth,
} from "@/features/dashboard/month";

describe("dashboard month helpers", () => {
  it("uses an explicit valid YYYY-MM month", () => {
    expect(getSelectedMonth("2026-05", new Date("2026-02-10T00:00:00.000Z"))).toEqual({
      key: "2026-05",
      label: "Tháng 05/2026",
      previousKey: "2026-04",
      nextKey: "2026-06",
    });
  });

  it("falls back to the current month for missing or invalid input", () => {
    const now = new Date("2026-05-26T12:00:00.000Z");

    expect(getSelectedMonth(undefined, now).key).toBe("2026-05");
    expect(getSelectedMonth("", now).key).toBe("2026-05");
    expect(getSelectedMonth("2026-13", now).key).toBe("2026-05");
    expect(getSelectedMonth("26-05", now).key).toBe("2026-05");
  });

  it("shifts previous and next months across year boundaries", () => {
    expect(getPreviousMonthKey("2026-01")).toBe("2025-12");
    expect(getNextMonthKey("2026-12")).toBe("2027-01");
  });

  it("creates an inclusive-exclusive UTC date window", () => {
    expect(getMonthWindow("2026-05")).toEqual({
      start: new Date("2026-05-01T00:00:00.000Z"),
      end: new Date("2026-06-01T00:00:00.000Z"),
    });
  });
});
```

- [ ] **Step 2: Run tests to verify failure**

Run:

```bash
pnpm test -- tests/dashboard-month.test.ts
```

Expected: FAIL because `src/features/dashboard/month.ts` does not exist.

- [ ] **Step 3: Implement month helpers**

Create `src/features/dashboard/month.ts`:

```ts
export type DashboardMonth = {
  key: string;
  label: string;
  previousKey: string;
  nextKey: string;
};

type MonthParts = {
  year: number;
  monthIndex: number;
};

function padMonth(month: number) {
  return String(month).padStart(2, "0");
}

function toMonthKey(year: number, monthIndex: number) {
  return `${year}-${padMonth(monthIndex + 1)}`;
}

function parseMonthKey(input: string): MonthParts | null {
  const match = input.match(/^(\d{4})-(\d{2})$/);

  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);

  if (!Number.isInteger(year) || month < 1 || month > 12) {
    return null;
  }

  return { year, monthIndex: month - 1 };
}

function getCurrentMonthKey(now: Date) {
  return toMonthKey(now.getUTCFullYear(), now.getUTCMonth());
}

function shiftMonthKey(monthKey: string, delta: number) {
  const parts = parseMonthKey(monthKey);

  if (!parts) {
    throw new Error(`Invalid month key: ${monthKey}`);
  }

  const shifted = new Date(Date.UTC(parts.year, parts.monthIndex + delta, 1));
  return toMonthKey(shifted.getUTCFullYear(), shifted.getUTCMonth());
}

export function getPreviousMonthKey(monthKey: string) {
  return shiftMonthKey(monthKey, -1);
}

export function getNextMonthKey(monthKey: string) {
  return shiftMonthKey(monthKey, 1);
}

export function getMonthWindow(monthKey: string) {
  const parts = parseMonthKey(monthKey);

  if (!parts) {
    throw new Error(`Invalid month key: ${monthKey}`);
  }

  return {
    start: new Date(Date.UTC(parts.year, parts.monthIndex, 1)),
    end: new Date(Date.UTC(parts.year, parts.monthIndex + 1, 1)),
  };
}

export function getSelectedMonth(input: string | undefined, now = new Date()): DashboardMonth {
  const key = input && parseMonthKey(input) ? input : getCurrentMonthKey(now);
  const parts = parseMonthKey(key);

  if (!parts) {
    throw new Error(`Invalid month key: ${key}`);
  }

  return {
    key,
    label: `Tháng ${padMonth(parts.monthIndex + 1)}/${parts.year}`,
    previousKey: getPreviousMonthKey(key),
    nextKey: getNextMonthKey(key),
  };
}
```

- [ ] **Step 4: Run month helper tests**

Run:

```bash
pnpm test -- tests/dashboard-month.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit month helpers**

Run:

```bash
git add src/features/dashboard/month.ts tests/dashboard-month.test.ts
git commit -m "feat: add dashboard month helpers"
```

Expected: commit succeeds and does not include `.gitignore`.

## Task 3: Add Dashboard Aggregation Service

**Files:**
- Create: `src/features/dashboard/service.ts`
- Create: `tests/dashboard-service.test.ts`

- [ ] **Step 1: Write failing service tests**

Create `tests/dashboard-service.test.ts`:

```ts
import { getMonthlyDashboard } from "@/features/dashboard/service";
import { db } from "@/lib/db";

jest.mock("@/lib/db", () => ({
  db: {
    transaction: {
      findMany: jest.fn(),
    },
  },
}));

const findManyMock = db.transaction.findMany as jest.Mock;

type MockTransaction = {
  id: string;
  userId: string;
  type: "income" | "expense";
  amount: number;
  note: string;
  transactionDate: Date;
  createdAt: Date;
  category: {
    id: string;
    name: string;
    color: string | null;
  };
};

function transaction(overrides: Partial<MockTransaction>): MockTransaction {
  return {
    id: "tx_default",
    userId: "user_1",
    type: "expense",
    amount: 100000,
    note: "Giao dịch",
    transactionDate: new Date("2026-05-10T00:00:00.000Z"),
    createdAt: new Date("2026-05-10T01:00:00.000Z"),
    category: {
      id: "cat_food",
      name: "Ăn uống",
      color: "#16a34a",
    },
    ...overrides,
  };
}

describe("getMonthlyDashboard", () => {
  beforeEach(() => {
    findManyMock.mockReset();
  });

  it("aggregates selected-month totals, expense breakdown, recent transactions, and comparison", async () => {
    findManyMock
      .mockResolvedValueOnce([
        transaction({
          id: "income_1",
          type: "income",
          amount: 18000000,
          note: "Lương",
          category: { id: "cat_income", name: "Thu nhập", color: "#22c55e" },
          transactionDate: new Date("2026-05-01T00:00:00.000Z"),
        }),
        transaction({
          id: "expense_food",
          type: "expense",
          amount: 1200000,
          note: "Ăn uống",
          category: { id: "cat_food", name: "Ăn uống", color: "#f97316" },
          transactionDate: new Date("2026-05-05T00:00:00.000Z"),
        }),
        transaction({
          id: "expense_cafe",
          type: "expense",
          amount: 300000,
          note: "Cafe",
          category: { id: "cat_cafe", name: "Cafe", color: "#a16207" },
          transactionDate: new Date("2026-05-06T00:00:00.000Z"),
        }),
        transaction({
          id: "expense_food_2",
          type: "expense",
          amount: 500000,
          note: "Ăn tối",
          category: { id: "cat_food", name: "Ăn uống", color: "#f97316" },
          transactionDate: new Date("2026-05-08T00:00:00.000Z"),
        }),
      ])
      .mockResolvedValueOnce([
        transaction({
          id: "prev_income",
          type: "income",
          amount: 16000000,
          note: "Lương tháng trước",
          transactionDate: new Date("2026-04-01T00:00:00.000Z"),
        }),
        transaction({
          id: "prev_expense",
          type: "expense",
          amount: 1000000,
          note: "Chi tháng trước",
          transactionDate: new Date("2026-04-02T00:00:00.000Z"),
        }),
      ]);

    const dashboard = await getMonthlyDashboard("user_1", "2026-05");

    expect(findManyMock).toHaveBeenNthCalledWith(1, {
      where: {
        userId: "user_1",
        transactionDate: {
          gte: new Date("2026-05-01T00:00:00.000Z"),
          lt: new Date("2026-06-01T00:00:00.000Z"),
        },
      },
      include: { category: true },
      orderBy: [{ transactionDate: "desc" }, { createdAt: "desc" }],
    });
    expect(findManyMock).toHaveBeenNthCalledWith(2, {
      where: {
        userId: "user_1",
        transactionDate: {
          gte: new Date("2026-04-01T00:00:00.000Z"),
          lt: new Date("2026-05-01T00:00:00.000Z"),
        },
      },
      include: { category: true },
      orderBy: [{ transactionDate: "desc" }, { createdAt: "desc" }],
    });
    expect(dashboard.totals).toEqual({
      income: 18000000,
      expense: 2000000,
      remaining: 16000000,
    });
    expect(dashboard.previousTotals).toEqual({
      income: 16000000,
      expense: 1000000,
      remaining: 15000000,
    });
    expect(dashboard.categoryBreakdown).toEqual([
      {
        categoryId: "cat_food",
        name: "Ăn uống",
        color: "#f97316",
        amount: 1700000,
        percentage: 85,
      },
      {
        categoryId: "cat_cafe",
        name: "Cafe",
        color: "#a16207",
        amount: 300000,
        percentage: 15,
      },
    ]);
    expect(dashboard.comparison.expense).toEqual({
      kind: "increased",
      delta: 1000000,
      percentage: 100,
    });
    expect(dashboard.recentTransactions).toHaveLength(4);
    expect(dashboard.isEmpty).toBe(false);
  });

  it("returns no_previous_data comparison and empty state when selected and previous month are empty", async () => {
    findManyMock.mockResolvedValueOnce([]).mockResolvedValueOnce([]);

    const dashboard = await getMonthlyDashboard("user_empty", "2026-05");

    expect(dashboard.totals).toEqual({ income: 0, expense: 0, remaining: 0 });
    expect(dashboard.previousTotals).toEqual({
      income: 0,
      expense: 0,
      remaining: 0,
    });
    expect(dashboard.comparison).toEqual({
      income: { kind: "no_previous_data" },
      expense: { kind: "no_previous_data" },
      remaining: { kind: "no_previous_data" },
    });
    expect(dashboard.categoryBreakdown).toEqual([]);
    expect(dashboard.recentTransactions).toEqual([]);
    expect(dashboard.isEmpty).toBe(true);
  });

  it("caps recent transactions at five rows", async () => {
    findManyMock
      .mockResolvedValueOnce(
        Array.from({ length: 6 }, (_, index) =>
          transaction({
            id: `tx_${index}`,
            note: `Giao dịch ${index}`,
            createdAt: new Date(`2026-05-${10 + index}T01:00:00.000Z`),
            transactionDate: new Date(`2026-05-${10 + index}T00:00:00.000Z`),
          }),
        ),
      )
      .mockResolvedValueOnce([]);

    const dashboard = await getMonthlyDashboard("user_1", "2026-05");

    expect(dashboard.recentTransactions.map((item) => item.id)).toEqual([
      "tx_0",
      "tx_1",
      "tx_2",
      "tx_3",
      "tx_4",
    ]);
  });
});
```

- [ ] **Step 2: Run tests to verify failure**

Run:

```bash
pnpm test -- tests/dashboard-service.test.ts
```

Expected: FAIL because `src/features/dashboard/service.ts` does not exist.

- [ ] **Step 3: Implement dashboard service**

Create `src/features/dashboard/service.ts`:

```ts
import { db } from "@/lib/db";

import {
  type DashboardMonth,
  getMonthWindow,
  getNextMonthKey,
  getPreviousMonthKey,
} from "./month";

export type MonthComparison =
  | { kind: "no_previous_data" }
  | { kind: "unchanged"; delta: 0; percentage: 0 }
  | { kind: "increased" | "decreased"; delta: number; percentage: number };

export type MonthlyDashboard = {
  month: DashboardMonth;
  totals: DashboardTotals;
  previousTotals: DashboardTotals;
  comparison: {
    income: MonthComparison;
    expense: MonthComparison;
    remaining: MonthComparison;
  };
  categoryBreakdown: CategoryBreakdownItem[];
  recentTransactions: RecentDashboardTransaction[];
  isEmpty: boolean;
};

type DashboardTotals = {
  income: number;
  expense: number;
  remaining: number;
};

export type CategoryBreakdownItem = {
  categoryId: string;
  name: string;
  color: string | null;
  amount: number;
  percentage: number;
};

export type RecentDashboardTransaction = {
  id: string;
  type: "income" | "expense";
  amount: number;
  note: string;
  transactionDate: string;
  categoryName: string;
};

type TransactionWithCategory = Awaited<
  ReturnType<typeof listTransactionsForMonth>
>[number];

async function listTransactionsForMonth(userId: string, monthKey: string) {
  const window = getMonthWindow(monthKey);

  return db.transaction.findMany({
    where: {
      userId,
      transactionDate: {
        gte: window.start,
        lt: window.end,
      },
    },
    include: { category: true },
    orderBy: [{ transactionDate: "desc" }, { createdAt: "desc" }],
  });
}

function calculateTotals(transactions: TransactionWithCategory[]): DashboardTotals {
  const totals = transactions.reduce(
    (current, transaction) => {
      if (transaction.type === "income") {
        return { ...current, income: current.income + transaction.amount };
      }

      return { ...current, expense: current.expense + transaction.amount };
    },
    { income: 0, expense: 0 },
  );

  return {
    ...totals,
    remaining: totals.income - totals.expense,
  };
}

function compareMonth(current: number, previous: number): MonthComparison {
  if (previous === 0) {
    return { kind: "no_previous_data" };
  }

  const delta = current - previous;

  if (delta === 0) {
    return { kind: "unchanged", delta: 0, percentage: 0 };
  }

  return {
    kind: delta > 0 ? "increased" : "decreased",
    delta: Math.abs(delta),
    percentage: Math.round((Math.abs(delta) / Math.abs(previous)) * 100),
  };
}

function buildCategoryBreakdown(
  transactions: TransactionWithCategory[],
  totalExpense: number,
): CategoryBreakdownItem[] {
  const breakdown = new Map<string, CategoryBreakdownItem>();

  for (const transaction of transactions) {
    if (transaction.type !== "expense") {
      continue;
    }

    const existing = breakdown.get(transaction.categoryId);

    breakdown.set(transaction.categoryId, {
      categoryId: transaction.categoryId,
      name: transaction.category.name,
      color: transaction.category.color,
      amount: (existing?.amount ?? 0) + transaction.amount,
      percentage: 0,
    });
  }

  return Array.from(breakdown.values())
    .map((item) => ({
      ...item,
      percentage:
        totalExpense > 0 ? Math.round((item.amount / totalExpense) * 100) : 0,
    }))
    .sort((a, b) => b.amount - a.amount);
}

function buildRecentTransactions(
  transactions: TransactionWithCategory[],
): RecentDashboardTransaction[] {
  return transactions.slice(0, 5).map((transaction) => ({
    id: transaction.id,
    type: transaction.type,
    amount: transaction.amount,
    note: transaction.note,
    transactionDate: transaction.transactionDate.toISOString(),
    categoryName: transaction.category.name,
  }));
}

export async function getMonthlyDashboard(
  userId: string,
  month: DashboardMonth | string,
): Promise<MonthlyDashboard> {
  const monthKey = typeof month === "string" ? month : month.key;
  const selectedMonth =
    typeof month === "string"
      ? {
          key: month,
          label: `Tháng ${month.slice(5, 7)}/${month.slice(0, 4)}`,
          previousKey: getPreviousMonthKey(month),
          nextKey: getNextMonthKey(month),
        }
      : month;
  const [transactions, previousTransactions] = await Promise.all([
    listTransactionsForMonth(userId, monthKey),
    listTransactionsForMonth(userId, selectedMonth.previousKey),
  ]);
  const totals = calculateTotals(transactions);
  const previousTotals = calculateTotals(previousTransactions);

  return {
    month: selectedMonth,
    totals,
    previousTotals,
    comparison: {
      income: compareMonth(totals.income, previousTotals.income),
      expense: compareMonth(totals.expense, previousTotals.expense),
      remaining: compareMonth(totals.remaining, previousTotals.remaining),
    },
    categoryBreakdown: buildCategoryBreakdown(transactions, totals.expense),
    recentTransactions: buildRecentTransactions(transactions),
    isEmpty: transactions.length === 0,
  };
}
```

- [ ] **Step 4: Run service tests**

Run:

```bash
pnpm test -- tests/dashboard-service.test.ts
```

Expected: PASS.

- [ ] **Step 5: Run dashboard test subset**

Run:

```bash
pnpm test -- tests/dashboard-month.test.ts tests/dashboard-service.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit dashboard service**

Run:

```bash
git add src/features/dashboard/month.ts src/features/dashboard/service.ts tests/dashboard-month.test.ts tests/dashboard-service.test.ts
git commit -m "feat: add monthly dashboard aggregation"
```

Expected: commit succeeds and does not include `.gitignore`.

## Task 4: Add Dashboard UI And Recharts Component

**Files:**
- Create: `src/features/dashboard/category-breakdown-chart.tsx`
- Create: `src/features/dashboard/dashboard-view.tsx`
- Modify: `src/app/(app)/dashboard/page.tsx`

- [ ] **Step 1: Create the client chart component**

Create `src/features/dashboard/category-breakdown-chart.tsx`:

```tsx
"use client";

import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

import { formatVnd } from "@/lib/money";

import type { CategoryBreakdownItem } from "./service";

const FALLBACK_COLORS = [
  "#2563eb",
  "#16a34a",
  "#f97316",
  "#dc2626",
  "#7c3aed",
  "#0891b2",
];

type CategoryBreakdownChartProps = {
  data: CategoryBreakdownItem[];
};

export function CategoryBreakdownChart({ data }: CategoryBreakdownChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center rounded-lg border bg-muted/30 text-sm text-muted-foreground">
        Chưa có dữ liệu chi tiêu để vẽ biểu đồ.
      </div>
    );
  }

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="amount"
            nameKey="name"
            innerRadius={58}
            outerRadius={92}
            paddingAngle={3}
          >
            {data.map((item, index) => (
              <Cell
                key={item.categoryId}
                fill={item.color ?? FALLBACK_COLORS[index % FALLBACK_COLORS.length]}
              />
            ))}
          </Pie>
          <Tooltip
            formatter={(value) =>
              typeof value === "number" ? formatVnd(value) : String(value)
            }
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
```

- [ ] **Step 2: Create the server dashboard view**

Create `src/features/dashboard/dashboard-view.tsx`:

```tsx
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { formatVnd } from "@/lib/money";

import { CategoryBreakdownChart } from "./category-breakdown-chart";
import type { MonthComparison, MonthlyDashboard } from "./service";

type DashboardViewProps = {
  dashboard: MonthlyDashboard;
};

function comparisonText(label: string, comparison: MonthComparison) {
  if (comparison.kind === "no_previous_data") {
    return `${label}: chưa có dữ liệu tháng trước.`;
  }

  if (comparison.kind === "unchanged") {
    return `${label}: không đổi so với tháng trước.`;
  }

  const direction = comparison.kind === "increased" ? "tăng" : "giảm";
  return `${label}: ${direction} ${comparison.percentage}% (${formatVnd(
    comparison.delta,
  )}) so với tháng trước.`;
}

function kpiTone(type: "income" | "expense" | "remaining") {
  if (type === "income") {
    return "text-green-600";
  }

  if (type === "expense") {
    return "text-red-600";
  }

  return "text-foreground";
}

export function DashboardView({ dashboard }: DashboardViewProps) {
  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">Dashboard</p>
          <h1 className="text-2xl font-semibold tracking-normal">
            Tổng quan tháng
          </h1>
          <p className="text-sm text-muted-foreground">
            {dashboard.month.label}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button asChild variant="outline">
            <Link href={`/dashboard?month=${dashboard.month.previousKey}`}>
              Tháng trước
            </Link>
          </Button>
          <span className="rounded-md border bg-card px-3 py-2 text-sm font-medium">
            {dashboard.month.key}
          </span>
          <Button asChild variant="outline">
            <Link href={`/dashboard?month=${dashboard.month.nextKey}`}>
              Tháng sau
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border bg-card p-4">
          <p className="text-sm text-muted-foreground">Tổng thu nhập</p>
          <p className={`mt-2 text-2xl font-semibold ${kpiTone("income")}`}>
            {formatVnd(dashboard.totals.income)}
          </p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-sm text-muted-foreground">Tổng chi tiêu</p>
          <p className={`mt-2 text-2xl font-semibold ${kpiTone("expense")}`}>
            {formatVnd(dashboard.totals.expense)}
          </p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-sm text-muted-foreground">Còn lại</p>
          <p className={`mt-2 text-2xl font-semibold ${kpiTone("remaining")}`}>
            {formatVnd(dashboard.totals.remaining)}
          </p>
        </div>
      </div>

      {dashboard.isEmpty ? (
        <div className="rounded-lg border bg-card p-6">
          <h2 className="text-lg font-semibold">Chưa có giao dịch trong tháng này</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            Thêm giao dịch đầu tiên để MoneyMind AI có dữ liệu tổng hợp thu chi,
            phân bổ danh mục và so sánh với tháng trước.
          </p>
          <Button asChild className="mt-4">
            <Link href="/transactions">Thêm giao dịch</Link>
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
          <div className="rounded-lg border bg-card p-4">
            <div className="mb-4">
              <h2 className="text-lg font-semibold">Chi theo danh mục</h2>
              <p className="text-sm text-muted-foreground">
                Tỷ trọng chi tiêu trong {dashboard.month.label.toLowerCase()}.
              </p>
            </div>
            <div className="grid gap-4 md:grid-cols-[260px_1fr]">
              <CategoryBreakdownChart data={dashboard.categoryBreakdown} />
              <div className="space-y-3">
                {dashboard.categoryBreakdown.map((item) => (
                  <div key={item.categoryId} className="space-y-1">
                    <div className="flex items-center justify-between gap-3 text-sm">
                      <div className="flex min-w-0 items-center gap-2">
                        <span
                          className="h-2.5 w-2.5 shrink-0 rounded-full"
                          style={{ backgroundColor: item.color ?? "#64748b" }}
                        />
                        <span className="truncate font-medium">{item.name}</span>
                      </div>
                      <span className="shrink-0 text-muted-foreground">
                        {item.percentage}%
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-3 text-sm">
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-foreground"
                          style={{ width: `${item.percentage}%` }}
                        />
                      </div>
                      <span className="w-28 text-right font-medium">
                        {formatVnd(item.amount)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-lg border bg-card p-4">
              <h2 className="text-lg font-semibold">So với tháng trước</h2>
              <div className="mt-3 space-y-2 text-sm text-muted-foreground">
                <p>{comparisonText("Thu nhập", dashboard.comparison.income)}</p>
                <p>{comparisonText("Chi tiêu", dashboard.comparison.expense)}</p>
                <p>{comparisonText("Còn lại", dashboard.comparison.remaining)}</p>
              </div>
            </div>

            <div className="rounded-lg border bg-card p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <h2 className="text-lg font-semibold">Giao dịch gần đây</h2>
                <Link
                  href="/transactions"
                  className="text-sm font-medium text-muted-foreground hover:text-foreground"
                >
                  Xem tất cả
                </Link>
              </div>
              <div className="space-y-3">
                {dashboard.recentTransactions.map((transaction) => (
                  <div
                    key={transaction.id}
                    className="flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {transaction.note}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {transaction.categoryName} ·{" "}
                        {transaction.transactionDate.slice(0, 10)}
                      </p>
                    </div>
                    <span
                      className={
                        transaction.type === "income"
                          ? "shrink-0 text-sm font-medium text-green-600"
                          : "shrink-0 text-sm font-medium text-red-600"
                      }
                    >
                      {transaction.type === "income" ? "+" : "-"}
                      {formatVnd(transaction.amount)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
```

- [ ] **Step 3: Wire the dashboard page to the service**

Replace `src/app/(app)/dashboard/page.tsx` with:

```tsx
import { DashboardView } from "@/features/dashboard/dashboard-view";
import { getSelectedMonth } from "@/features/dashboard/month";
import { getMonthlyDashboard } from "@/features/dashboard/service";
import { getCurrentSession } from "@/lib/auth-session";

type DashboardPageProps = {
  searchParams: Promise<{
    month?: string;
  }>;
};

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const [{ month }, session] = await Promise.all([
    searchParams,
    getCurrentSession(),
  ]);

  if (!session?.user) {
    return null;
  }

  const selectedMonth = getSelectedMonth(month);
  const dashboard = await getMonthlyDashboard(session.user.id, selectedMonth);

  return <DashboardView dashboard={dashboard} />;
}
```

- [ ] **Step 4: Run TypeScript-aware lint**

Run:

```bash
pnpm lint
```

Expected: PASS. If Next.js flags the `searchParams` type, compare with local Next.js page docs and keep the Next 16 Promise-based prop shape.

- [ ] **Step 5: Run dashboard tests**

Run:

```bash
pnpm test -- tests/dashboard-month.test.ts tests/dashboard-service.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit dashboard UI**

Run:

```bash
git add 'src/app/(app)/dashboard/page.tsx' src/features/dashboard/category-breakdown-chart.tsx src/features/dashboard/dashboard-view.tsx
git commit -m "feat: add monthly dashboard UI"
```

Expected: commit succeeds and does not include `.gitignore`.

## Task 5: Full Verification And Notes

**Files:**
- Create: `docs/superpowers/plans/2026-05-26-phase-4-dashboard-verification.md`

- [ ] **Step 1: Run all tests**

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

- [ ] **Step 3: Validate Prisma schema**

Run:

```bash
pnpm db:validate
```

Expected: PASS.

- [ ] **Step 4: Run production build**

Run:

```bash
pnpm build
```

Expected: PASS. If build requires environment variables, use the existing local `.env` setup and record the exact missing variable if it cannot run.

- [ ] **Step 5: Write verification notes**

Create `docs/superpowers/plans/2026-05-26-phase-4-dashboard-verification.md`:

```md
# Phase 4 Dashboard Verification

## Summary

Implemented a server-rendered monthly dashboard for MoneyMind AI with KPI totals,
expense category breakdown, month-over-month comparison, recent transactions,
and an honest empty state with no demo data seeding.

## Checks

- `pnpm test`: PASS
- `pnpm lint`: PASS
- `pnpm db:validate`: PASS
- `pnpm build`: PASS

## Notes

- Dashboard data is scoped by authenticated `userId`.
- Month navigation uses query params in `YYYY-MM` format.
- Recharts is isolated to a small client component; the page and dashboard view
  remain server-rendered.
- The existing unrelated `.gitignore` change was left untouched.
```

If a command does not pass, replace `PASS` with the exact failure summary and do not claim the phase is complete.

- [ ] **Step 6: Commit verification notes**

Run:

```bash
git add docs/superpowers/plans/2026-05-26-phase-4-dashboard-verification.md
git commit -m "docs: record phase 4 verification"
```

Expected: commit succeeds and does not include `.gitignore`.

## Final Handoff

- Run `git status --short --branch`.
- Expected branch: `phase/4-dashboard`.
- Expected remaining uncommitted change may be:

```text
 M .gitignore
```

- Summarize implemented commits, verification results, and the fact that `.gitignore` was pre-existing and left untouched.
