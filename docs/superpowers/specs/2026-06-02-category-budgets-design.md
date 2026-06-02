# Category Budgets Design

## Summary

Add category-level monthly budgets so MoneyMind AI helps users control spending, not only review past transactions.

This phase focuses on expense categories only. Users can set a default monthly budget for each expense category and optionally override that budget for a specific month. The new `/budgets` page is the main budget workbench. The dashboard shows a compact monthly budget summary and links to the detailed budget page.

Savings goals, income targets, AI-generated budget changes, and push/email notifications are out of scope for this phase.

## Goals

- Let users set budget limits for expense categories.
- Reuse each category's default budget every month unless a month-specific override exists.
- Show how much has been spent, how much remains, and which categories are near or over budget.
- Keep dashboard lightweight by showing only the most important budget signals.
- Keep all budget data isolated by authenticated user.

## Non-Goals

- No savings-goal tracking.
- No income budgets or income targets.
- No AI auto-creation or auto-editing of budgets.
- No push notifications, email notifications, or scheduled jobs.
- No transaction-entry redesign beyond linking budget data where already useful.

## Data Model

Add a `CategoryBudget` model:

- `id`: string primary key.
- `userId`: owning user.
- `categoryId`: expense category being budgeted.
- `period`: non-null string.
- `amount`: integer VND.
- `createdAt`, `updatedAt`.

Semantics:

- `period = "default"` means the default recurring monthly budget for that category.
- `period = "2026-06"` means the override budget for June 2026.
- Effective budget resolution prefers the month override. If there is no override, it falls back to the default. If neither exists, the category has no budget.

Constraints:

- Unique budget per `userId`, `categoryId`, and `period`.
- Budget writes must verify the category belongs to the same user.
- Budget writes must verify the category is an expense category.
- `period` must be either `default` or a valid `YYYY-MM` month key.
- `amount` must be greater than zero and use the existing VND amount parsing and integer safety rules.
- If a category is deleted, related budgets can be cascade deleted because budgets are only category configuration. Existing transaction delete restrictions remain unchanged.

## User Experience

### `/budgets`

`/budgets` is the main management screen.

It includes:

- A month picker using the app's existing month-selection pattern.
- Summary metrics:
  - Total budgeted amount.
  - Total spent for the selected month.
  - Remaining amount, or amount over budget.
- A table of expense categories:
  - Category.
  - Effective budget for the selected month.
  - Spent amount.
  - Remaining or over amount.
  - Status: not set, healthy, near limit, over limit.
  - Actions to edit the selected month budget or edit the default budget.

If a category has no default and no override, the table shows `Chưa đặt` and offers a clear action to create a budget.

### Dashboard

The dashboard gets a compact `Ngân sách tháng này` block.

It shows up to five budget items in this priority order:

1. Categories already over budget.
2. Categories near budget.
3. If there are no warnings, budgeted categories with the highest spending progress.

The dashboard block links to `/budgets?month=YYYY-MM`.

### Budget Editing

Users can:

- Set or update the default monthly budget for a category.
- Set or update the selected month's override budget.
- Delete the selected month's override, causing that month to fall back to the default.
- Delete the default monthly budget, causing categories without an override to become unbudgeted.
- Leave a category unbudgeted.

The UI should make the difference between `Mặc định hằng tháng` and `Riêng tháng này` explicit so users understand why a value appears for the selected month.

## Architecture

Add a budgets feature module under `src/features/budgets`.

### Service

`src/features/budgets/service.ts` owns budget business logic:

- List expense categories with effective budgets for a selected month.
- Resolve default and override budgets.
- Aggregate selected-month spending by category.
- Compute summary totals.
- Compute status:
  - `not_set`: no effective budget.
  - `healthy`: spent is below warning threshold.
  - `near_limit`: spent is close to the budget.
  - `over_limit`: spent is greater than the budget.
- Create or update default budgets.
- Create or update month overrides.
- Delete month overrides.

The warning threshold should be explicit and test-covered. A practical starting point is `near_limit` at 80% or more of the effective budget.

### Schemas

`src/features/budgets/schemas.ts` validates:

- `month` as `YYYY-MM`.
- `categoryId` as a non-empty string.
- `amount` using the existing VND parser and max amount rules.
- Budget scope as either `default` or `month`.

### Routes

Add authenticated budget API routes:

- `GET /api/budgets?month=YYYY-MM`
- `PUT /api/budgets`
- `DELETE /api/budgets`

The `PUT` route handles upsert for both default budgets and selected-month overrides based on a scope field.

The `DELETE` route deletes either a default budget or a selected-month override based on the submitted scope. Deleting an override falls back to the default. Deleting a default makes months without overrides unbudgeted.

### Pages And Components

Add:

- `src/app/(app)/budgets/page.tsx`
- `src/features/budgets/budget-manager.tsx`
- Any small presentational components needed for budget rows, status badges, and edit dialogs.

Update:

- App navigation to include `Ngân sách`.
- Dashboard server page or dashboard service to load budget summary for the selected month.
- `DashboardView` to render the compact budget block.

## Data Flow

1. `/budgets` reads the selected month from `searchParams.month`.
2. The page resolves the month using the existing dashboard month helpers and user time zone cookie.
3. The page calls the budget service server-side.
4. The budget service loads:
   - Expense categories.
   - Default budgets for those categories.
   - Overrides for the selected month.
   - Selected-month expense totals grouped by category.
5. The service returns rows with effective budgets, spent values, remaining values, and statuses.
6. The client budget manager submits budget changes through the budget API.
7. Successful mutations revalidate the `/budgets` page and dashboard for the affected month, then refresh the current page state.

## Error Handling

Use Vietnamese-facing messages consistent with the rest of the app:

- Invalid month: `Tháng không hợp lệ.`
- Category missing, wrong user, or not an expense category: `Danh mục không hợp lệ.`
- Invalid amount: reuse the existing money validation style.
- Unauthenticated requests: use the existing auth error pattern.

Budget service methods must never leak another user's categories, budgets, or spending totals.

## Testing

Add focused tests for:

- Effective budget resolution:
  - Default applies when there is no override.
  - Override wins over default.
  - Deleting override falls back to default.
  - No default and no override returns no effective budget.
- Budget status:
  - Not set.
  - Healthy.
  - Near limit.
  - Over limit.
- Expense-only validation:
  - Income categories cannot receive budgets.
  - Other users' categories cannot receive budgets.
- API behavior:
  - Auth required.
  - Invalid month rejected.
  - Upsert default budget.
  - Upsert month override.
  - Delete default budget.
  - Delete month override.
- Component behavior:
  - `/budgets` displays totals, row statuses, and remaining or over values.
  - Editing default and selected-month budgets updates visible state.
  - Deleting override falls back to default.
- Dashboard:
  - Budget summary prioritizes over-budget, then near-limit, then highest progress.
  - Dashboard links to the selected month budget page.

Use the repo's existing Jest pattern under `tests/**/*.test.ts`.

## Rollout Notes

Implementation should start from the data model and service layer, then add API routes, then the `/budgets` UI, and finally the dashboard summary. This keeps the budget rules testable before UI work depends on them.

The working branch for this design is `feature/category-budgets`.
