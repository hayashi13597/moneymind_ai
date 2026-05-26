# Phase 4 Dashboard Design

## Context

MoneyMind AI Phase 4 adds the monthly financial dashboard for the existing
Next.js App Router application. Phase 3 already provides authenticated
transaction and category management. The dashboard should use that real user
data directly and should not seed demo transactions.

Primary locale is Vietnamese. Money amounts are integer VND and must be
formatted with the existing `formatVnd` helper.

## Goals

- Show monthly income, expense, and remaining balance.
- Show expense breakdown by category.
- Compare the selected month against the previous month.
- Support selecting a month with a simple query-param driven flow.
- Provide a useful empty state without writing fake financial data.
- Keep aggregation logic isolated and testable.

## Non-Goals

- AI insight generation.
- Budget alerts or budget planner.
- Receipt OCR.
- Personal finance chat.
- Exporting dashboard data.
- A client-side dashboard API unless a later phase needs it.

## Chosen Approach

Use a server-rendered, service-first dashboard.

`src/app/(app)/dashboard/page.tsx` remains a server component. It reads
`searchParams.month`, validates the value as `YYYY-MM`, falls back to the
current month when missing or invalid, gets the authenticated user, calls a
dashboard service, and renders the result.

No `GET /api/dashboard/monthly` route is required for Phase 4. The dashboard is
only consumed by the server-rendered app page today, so direct service calls keep
the implementation smaller and easier to test.

## Architecture

Add a dashboard feature module:

- `src/features/dashboard/month.ts`
  - Parse `YYYY-MM` month input.
  - Format month values for URLs.
  - Calculate current, previous, and next month keys.
  - Calculate `[startOfMonth, startOfNextMonth)` date windows.
- `src/features/dashboard/service.ts`
  - Query transactions for the selected month and previous month.
  - Aggregate income, expense, remaining balance, category breakdown, and
    month-over-month comparison.
  - Scope every query by `userId`.
- `src/features/dashboard/dashboard-view.tsx`
  - Render the KPI-first dashboard from a plain DTO.
  - Keep UI presentation separate from aggregation logic.

The page flow is:

```txt
/dashboard?month=2026-05
  -> parse selected month
  -> get current session user
  -> getMonthlyDashboard(userId, month)
  -> render DashboardView
```

## Data Contract

The service returns a DTO shaped around the UI:

```ts
type MonthlyDashboard = {
  month: {
    key: string;
    label: string;
    previousKey: string;
    nextKey: string;
  };
  totals: {
    income: number;
    expense: number;
    remaining: number;
  };
  previousTotals: {
    income: number;
    expense: number;
    remaining: number;
  };
  comparison: {
    income: MonthComparison;
    expense: MonthComparison;
    remaining: MonthComparison;
  };
  categoryBreakdown: Array<{
    categoryId: string;
    name: string;
    color: string | null;
    amount: number;
    percentage: number;
  }>;
  recentTransactions: Array<{
    id: string;
    type: "income" | "expense";
    amount: number;
    note: string;
    transactionDate: string;
    categoryName: string;
  }>;
  isEmpty: boolean;
};

type MonthComparison =
  | { kind: "no_previous_data" }
  | { kind: "unchanged"; delta: 0; percentage: 0 }
  | { kind: "increased" | "decreased"; delta: number; percentage: number };
```

`recentTransactions` is capped to five transactions for the selected month. It
is supporting context only; transaction management remains on `/transactions`.

## Aggregation Rules

- Query only transactions where `userId` matches the authenticated user.
- A month includes transactions where `transactionDate >= startOfMonth` and
  `transactionDate < startOfNextMonth`.
- `income` transactions increase total income.
- `expense` transactions increase total expense.
- `remaining = income - expense`.
- Category breakdown includes only expense transactions for the selected month.
- Category breakdown is sorted by amount descending.
- Category percentage is based on selected-month expense total. When expense is
  zero, percentage is zero for every category.
- Month-over-month comparison uses the immediately previous calendar month.
- If the previous month total is zero, comparison returns `no_previous_data`
  instead of dividing by zero.

## UI Behavior

Use the approved KPI-first layout:

1. Header
   - Label: `Dashboard`
   - Title: `Tổng quan tháng`
   - Month controls with previous month, current `YYYY-MM`, and next month.
2. KPI row
   - `Tổng thu nhập`
   - `Tổng chi tiêu`
   - `Còn lại`
3. Main content
   - Expense category breakdown as the primary chart/table section.
   - Month-over-month comparison section with short Vietnamese copy.
   - Recent transactions for the selected month, capped at five rows.

If Recharts is already installed and usable, render a simple category chart
beside or above the category table. The table remains the source of truth so the
dashboard is still useful if chart rendering needs adjustment.

## Empty State

When the selected month has no transactions:

- KPI cards show `0 ₫`.
- Category breakdown is replaced with a short empty state.
- Comparison explains that there is not enough data for the selected month.
- Show a CTA linking to `/transactions` to add the first transaction.
- Do not create demo transactions or seed fake financial data.

## Error Handling

- Missing or invalid `month` falls back to the current month.
- Unauthenticated users follow the existing protected app redirect behavior.
- Prisma/database errors use the default Next.js error handling for Phase 4.
- Month navigation always generates valid `YYYY-MM` keys, including year
  boundaries such as `2026-01 -> 2025-12`.

## Testing

Add focused tests for the dashboard module:

- Month helper tests:
  - Valid `YYYY-MM` parsing.
  - Invalid month fallback behavior.
  - Previous and next month across year boundaries.
  - Date window generation.
- Dashboard service tests:
  - Income, expense, and remaining totals.
  - Filtering by selected month.
  - Filtering by user.
  - Expense-only category breakdown.
  - Category percentage calculation.
  - Month-over-month comparison with previous data.
  - Month-over-month comparison when previous month has no data.
  - Empty selected month.

Phase 4 verification should include the project test command, lint/type checks,
and a production build if available in package scripts.

## Implementation Notes

- Keep the dashboard service independent of React.
- Use existing Prisma models without schema changes.
- Prefer server-rendered links/query params for month changes.
- Keep styling consistent with the existing app shell and Phase 3 management
  pages.
- Avoid turning Phase 4 into a second transaction CRUD surface.
