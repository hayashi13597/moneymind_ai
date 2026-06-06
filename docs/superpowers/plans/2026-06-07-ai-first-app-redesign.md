# AI-First App Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign all remaining MoneyMind AI authenticated pages so they feel like an AI financial coach while preserving current business logic.

**Architecture:** Keep route files as async Server Components for data loading. Add shared coach-first composition primitives in app-specific component files, then refactor existing client managers to place coaching guidance above their current workbenches. Add `/insights` and `/reports` routes using existing dashboard, transaction, budget, category, and AI insight services without changing the database or API contracts.

**Tech Stack:** Next.js App Router 16.2.6, React 19, Tailwind CSS 4, shadcn/ui, Jest, React Testing Library, Prisma services, Better Auth.

---

## Baseline And Branch

- Branch: `design/ai-first-app-redesign`
- Approved spec: `docs/superpowers/specs/2026-06-07-ai-first-app-redesign-design.md`
- Visual mockup board: `.superpowers/brainstorm/12035-1780768212/content/ai-first-pages-wireframes.html`
- Baseline verification already run on this branch:

```bash
pnpm test --runInBand
```

Expected baseline: `44 passed, 44 total`, `209 passed`.

## Local Next.js Docs Read Before Planning

- `node_modules/next/dist/docs/01-app/01-getting-started/03-layouts-and-pages.md`
- `node_modules/next/dist/docs/01-app/01-getting-started/04-linking-and-navigating.md`
- `node_modules/next/dist/docs/01-app/01-getting-started/05-server-and-client-components.md`
- `node_modules/next/dist/docs/01-app/02-guides/testing/jest.md`

Relevant constraints from those docs:

- Add routes with folders and `page.tsx`.
- Pages and layouts are Server Components by default.
- Keep browser state, event handlers, `localStorage`, and hooks inside Client Components.
- Use `next/link` for navigation.
- Jest does not fully support async Server Components; route tests should unit-test extracted synchronous presentation components or route-adjacent client/server helpers where possible.

## File Structure

Create:

- `src/components/coach-ui.tsx`: shared AI-coach page primitives, all server-safe React components with no hooks.
- `src/app/(app)/insights/page.tsx`: authenticated AI Insights route.
- `src/features/ai/insights-page-view.tsx`: synchronous presentation component for `/insights`.
- `src/app/(app)/reports/page.tsx`: authenticated Reports route.
- `src/features/reports/reports-page-view.tsx`: synchronous presentation component for `/reports`.
- `tests/coach-ui.test.tsx`: shared primitive smoke tests.
- `tests/ai-insights-page-view.test.tsx`: `/insights` presentation smoke tests.
- `tests/reports-page-view.test.tsx`: `/reports` presentation smoke tests.

Modify:

- `src/components/app-nav.tsx`: add `/insights` and `/reports` nav items.
- `src/app/(app)/layout.tsx`: keep the current app shell unless Task 2 tests reveal a navigation overflow regression.
- `src/app/(app)/transactions/page.tsx`: update copy and pass existing data to redesigned manager.
- `src/features/transactions/transaction-manager.tsx`: make AI natural-language capture and coaching summary primary while preserving form, filters, pagination, create, update, delete, and AI parse behavior.
- `tests/transaction-manager.test.ts`: update assertions for new labels and verify existing behavior remains.
- `src/app/(app)/budgets/page.tsx`: update copy and pass existing data to redesigned manager.
- `src/features/budgets/budget-manager.tsx`: add plan-tuner coach hero and risk-first layout while preserving budget edit/delete behavior.
- `tests/budget-manager.test.ts`: update visual text assertions and behavior coverage.
- `src/app/(app)/categories/page.tsx`: update route copy to Taxonomy Coach and keep server-side category insight calculation.
- `src/features/categories/category-manager.tsx`: reorganize around taxonomy coach and insight quality.
- `tests/category-manager.test.ts`: update text assertions and preserve CRUD behavior coverage.
- `src/app/(app)/settings/ai/page.tsx`: update copy to Coach Control.
- `src/features/ai/ai-settings-form.tsx`: make readiness and trust summary primary while preserving local provider workflow.
- `tests/ai-settings-form.test.ts`: update assertions and preserve localStorage workflow coverage.
- `src/app/(app)/profile/page.tsx`: update profile layout to personalization/account-confidence.
- `src/features/profile/profile-form.tsx`: keep behavior, align surface styling and copy.
- `src/features/profile/password-form.tsx`: keep behavior, align surface styling and copy.
- `tests/profile-forms.test.tsx`: update copy assertions and preserve submit behavior.
- `src/app/(app)/loading.tsx`: replace the current authenticated loading skeleton with the coach-first skeleton in Task 2.
- `tests/app-navigation-loading.test.ts`: update navigation and loading assertions.

Do not modify:

- Prisma schema.
- Existing API routes except tests uncover a real regression.
- Auth actions or provider persistence contracts.
- Generated shadcn primitives under `src/components/ui/*`.

---

### Task 1: Add Shared Coach UI Primitives

**Files:**

- Create: `src/components/coach-ui.tsx`
- Create: `tests/coach-ui.test.tsx`

- [ ] **Step 1: Write shared primitive tests**

Create `tests/coach-ui.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";

import {
  CoachActionCard,
  CoachEmptyState,
  CoachHero,
  CoachMetricStrip,
  CoachPageShell,
  WorkbenchCard,
} from "@/components/coach-ui";

describe("coach UI primitives", () => {
  it("renders a coach-first page structure", () => {
    render(
      <CoachPageShell>
        <CoachHero
          eyebrow="Coach Capture"
          title="Ghi lại hôm nay, hiểu cả tháng"
          recommendation="MoneyMind đang theo dõi nhịp chi tiêu tháng này."
          description="Nhập tự nhiên trước, chỉnh chi tiết sau."
          evidence={[
            { label: "Số dư", value: "12.000.000 ₫" },
            { label: "Tín hiệu", value: "Ổn định" },
          ]}
        />
        <CoachMetricStrip
          metrics={[
            { label: "Thu nhập", value: "20.000.000 ₫", helper: "Tháng này" },
            { label: "Chi tiêu", value: "8.000.000 ₫", helper: "Đã ghi nhận" },
          ]}
        />
        <WorkbenchCard title="Sổ giao dịch" description="Quản lý dữ liệu gốc.">
          <p>Workbench content</p>
        </WorkbenchCard>
      </CoachPageShell>,
    );

    expect(screen.getByText("Coach Capture")).toBeInTheDocument();
    expect(screen.getByText("Ghi lại hôm nay, hiểu cả tháng")).toBeInTheDocument();
    expect(screen.getByText("Sổ giao dịch")).toBeInTheDocument();
  });

  it("renders action cards and empty states", () => {
    render(
      <>
        <CoachActionCard
          title="Kiểm tra ngân sách"
          description="Một danh mục đang tiến gần hạn mức."
          action="Xem ngân sách"
          href="/budgets"
        />
        <CoachEmptyState
          title="Chưa có dữ liệu để huấn luyện"
          description="Thêm giao dịch đầu tiên để MoneyMind có ngữ cảnh."
        />
      </>,
    );

    expect(screen.getByRole("link", { name: /Xem ngân sách/i })).toHaveAttribute(
      "href",
      "/budgets",
    );
    expect(screen.getByText("Chưa có dữ liệu để huấn luyện")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the focused test and verify it fails**

Run:

```bash
pnpm test tests/coach-ui.test.tsx --runInBand
```

Expected: fail because `@/components/coach-ui` does not exist.

- [ ] **Step 3: Implement shared primitives**

Create `src/components/coach-ui.tsx`:

```tsx
import Link from "next/link";
import type { ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type CoachPageShellProps = {
  children: ReactNode;
  className?: string;
};

export function CoachPageShell({ children, className }: CoachPageShellProps) {
  return (
    <section className={cn("space-y-7 md:space-y-9", className)}>
      {children}
    </section>
  );
}

type EvidenceItem = {
  label: string;
  value: string;
  helper?: string;
};

type CoachHeroProps = {
  eyebrow: string;
  title: string;
  recommendation: string;
  description: string;
  evidence?: EvidenceItem[];
  actions?: ReactNode;
  className?: string;
};

export function CoachHero({
  eyebrow,
  title,
  recommendation,
  description,
  evidence = [],
  actions,
  className,
}: CoachHeroProps) {
  return (
    <div
      className={cn(
        "rounded-[2rem] bg-[#2F2A1F]/5 p-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.72)]",
        className,
      )}
    >
      <div className="overflow-hidden rounded-[calc(2rem-0.375rem)] border border-[#DED7CA]/90 bg-[#FFFDF7] shadow-[0_24px_80px_rgba(47,42,31,0.08),inset_0_1px_0_rgba(255,255,255,0.88)]">
        <div className="grid gap-6 p-5 md:p-7 xl:grid-cols-[minmax(0,1.18fr)_minmax(320px,0.82fr)]">
          <div className="min-w-0">
            <Badge
              variant="outline"
              className="h-auto rounded-full border-[#C8DCC9] bg-[#ECF3ED] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#2F6B4F]"
            >
              {eyebrow}
            </Badge>
            <h1 className="mt-5 max-w-4xl text-3xl font-bold leading-[0.98] tracking-tight text-foreground md:text-5xl">
              {title}
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground">
              {description}
            </p>
            {actions ? <div className="mt-6 flex flex-wrap gap-3">{actions}</div> : null}
          </div>
          <div className="rounded-[1.5rem] bg-[#263F32] p-5 text-white shadow-[0_18px_56px_rgba(47,107,79,0.18),inset_0_1px_0_rgba(255,255,255,0.12)]">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/55">
              MoneyMind gợi ý
            </p>
            <h2 className="mt-3 text-2xl font-semibold leading-tight">
              {recommendation}
            </h2>
            {evidence.length > 0 ? (
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {evidence.map((item) => (
                  <div
                    key={`${item.label}-${item.value}`}
                    className="rounded-2xl bg-white/8 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]"
                  >
                    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/50">
                      {item.label}
                    </p>
                    <p className="mt-2 text-sm font-semibold text-white">
                      {item.value}
                    </p>
                    {item.helper ? (
                      <p className="mt-1 text-xs leading-5 text-white/58">
                        {item.helper}
                      </p>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

type CoachMetric = {
  label: string;
  value: string;
  helper: string;
  tone?: "default" | "positive" | "warning" | "danger";
};

export function CoachMetricStrip({ metrics }: { metrics: CoachMetric[] }) {
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      {metrics.map((metric) => (
        <div
          key={metric.label}
          className="rounded-[1.35rem] border border-[#E1DDD4] bg-[#FFFDF7]/92 p-4 shadow-[0_12px_36px_rgba(47,42,31,0.045),inset_0_1px_0_rgba(255,255,255,0.82)]"
        >
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            {metric.label}
          </p>
          <p
            className={cn(
              "mt-3 truncate text-xl font-bold leading-none text-foreground",
              metric.tone === "positive" && "text-[#2F6B4F]",
              metric.tone === "warning" && "text-[#8A5B25]",
              metric.tone === "danger" && "text-[#A2482D]",
            )}
          >
            {metric.value}
          </p>
          <p className="mt-2 text-xs leading-5 text-muted-foreground">
            {metric.helper}
          </p>
        </div>
      ))}
    </div>
  );
}

export function WorkbenchCard({
  title,
  description,
  children,
  className,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Card
      className={cn(
        "gap-0 overflow-hidden rounded-[1.75rem] border-[#E1DDD4] bg-card/92 py-0 shadow-[0_16px_58px_rgba(47,42,31,0.06)]",
        className,
      )}
    >
      <CardContent className="p-0">
        <div className="border-b border-[#E8E1D6] bg-[#F7F3EA] px-5 py-4 md:px-6">
          <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
          {description ? (
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              {description}
            </p>
          ) : null}
        </div>
        <div className="p-5 md:p-6">{children}</div>
      </CardContent>
    </Card>
  );
}

export function CoachActionCard({
  title,
  description,
  action,
  href,
  className,
}: {
  title: string;
  description: string;
  action: string;
  href: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-[1.5rem] border border-[#E1DDD4] bg-[#FFFDF7]/92 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.78)]",
        className,
      )}
    >
      <h3 className="text-base font-semibold">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">
        {description}
      </p>
      <Button asChild className="group mt-4 h-10 rounded-full bg-[#2F6B4F] px-5 hover:bg-[#285B43] active:scale-[0.98]">
        <Link href={href}>{action}</Link>
      </Button>
    </div>
  );
}

export function CoachEmptyState({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <div className="rounded-[1.5rem] border border-dashed border-[#DCD7CC] bg-[#FFFDF7]/78 p-6 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.78)]">
      <h3 className="text-base font-semibold">{title}</h3>
      <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-muted-foreground">
        {description}
      </p>
      {children ? <div className="mt-5">{children}</div> : null}
    </div>
  );
}
```

- [ ] **Step 4: Verify shared primitive tests pass**

Run:

```bash
pnpm test tests/coach-ui.test.tsx --runInBand
```

Expected: pass.

- [ ] **Step 5: Commit shared primitives**

```bash
git add src/components/coach-ui.tsx tests/coach-ui.test.tsx
git commit -m "feat: add coach-first UI primitives"
```

---

### Task 2: Update Authenticated Navigation And Loading Skeleton

**Files:**

- Modify: `src/components/app-nav.tsx`
- Modify: `src/app/(app)/loading.tsx`
- Modify: `tests/app-navigation-loading.test.ts`

- [ ] **Step 1: Update navigation/loading tests**

Modify `tests/app-navigation-loading.test.ts` so it expects the new navigation labels:

```tsx
expect(screen.getByRole("link", { name: "AI Insights" })).toHaveAttribute(
  "href",
  "/insights",
);
expect(screen.getByRole("link", { name: "Báo cáo" })).toHaveAttribute(
  "href",
  "/reports",
);
```

Also keep the existing assertions for `Tổng quan`, `Giao dịch`, `Ngân sách`,
`Danh mục`, and `AI Coach`.

- [ ] **Step 2: Run the focused test and verify it fails**

Run:

```bash
pnpm test tests/app-navigation-loading.test.ts --runInBand
```

Expected: fail because `/insights` and `/reports` are not in `AppNav`.

- [ ] **Step 3: Add navigation items**

Modify `src/components/app-nav.tsx`:

```tsx
const navItems = [
  { href: "/dashboard", label: "Tổng quan" },
  { href: "/transactions", label: "Giao dịch" },
  { href: "/budgets", label: "Ngân sách" },
  { href: "/categories", label: "Danh mục" },
  { href: "/insights", label: "AI Insights" },
  { href: "/reports", label: "Báo cáo" },
  { href: "/settings/ai", label: "AI Coach" },
] as const;
```

Keep the current active-route logic and horizontal overflow behavior.

- [ ] **Step 4: Align loading skeleton**

Open `src/app/(app)/loading.tsx`. Keep the same export and no data logic. If the file uses generic cards, update labels to match the coach-first layout:

```tsx
<div className="space-y-7">
  <div className="h-56 rounded-[2rem] bg-[#EDE6DA]" />
  <div className="grid gap-3 md:grid-cols-4">
    <div className="h-28 rounded-[1.35rem] bg-[#F4EFE4]" />
    <div className="h-28 rounded-[1.35rem] bg-[#F4EFE4]" />
    <div className="h-28 rounded-[1.35rem] bg-[#F4EFE4]" />
    <div className="h-28 rounded-[1.35rem] bg-[#F4EFE4]" />
  </div>
  <div className="h-80 rounded-[1.75rem] bg-[#F4EFE4]" />
</div>
```

If the existing test checks exact text from loading, update it to assert the skeleton container or stable accessible label that remains in the file.

- [ ] **Step 5: Verify navigation/loading tests pass**

Run:

```bash
pnpm test tests/app-navigation-loading.test.ts --runInBand
```

Expected: pass.

- [ ] **Step 6: Commit navigation**

```bash
git add src/components/app-nav.tsx 'src/app/(app)/loading.tsx' tests/app-navigation-loading.test.ts
git commit -m "feat: add coach navigation surfaces"
```

---

### Task 3: Redesign Transactions Around Coach Capture

**Files:**

- Modify: `src/app/(app)/transactions/page.tsx`
- Modify: `src/features/transactions/transaction-manager.tsx`
- Modify: `tests/transaction-manager.test.ts`

- [ ] **Step 1: Update transaction tests for coach-first copy**

Modify `tests/transaction-manager.test.ts` to keep existing behavior tests and add assertions:

```tsx
expect(screen.getByText("Coach Capture")).toBeInTheDocument();
expect(screen.getByText(/Ghi lại hôm nay/i)).toBeInTheDocument();
expect(screen.getByText(/MoneyMind gợi ý/i)).toBeInTheDocument();
expect(screen.getByText(/Sổ giao dịch/i)).toBeInTheDocument();
```

Keep existing tests for:

- AI parse button and missing provider validation.
- Create transaction.
- Edit transaction.
- Delete transaction.
- Filtering.
- Pagination labels currently asserted by the test, including `1-5 trong 6 giao dịch` when present.

- [ ] **Step 2: Run focused transaction tests and verify failure**

Run:

```bash
pnpm test tests/transaction-manager.test.ts --runInBand
```

Expected: fail because the new coach labels are not rendered.

- [ ] **Step 3: Update route copy**

Modify `src/app/(app)/transactions/page.tsx` to use coach wording:

```tsx
<PageHeader
  eyebrow="Coach Capture"
  title="Ghi lại hôm nay, hiểu cả tháng"
  description="Nhập giao dịch bằng ngôn ngữ tự nhiên, để MoneyMind phân tích thói quen và giữ sổ giao dịch gọn gàng phía dưới."
/>
```

If the final manager renders its own hero and the route header becomes redundant, remove `PageHeader` from this route and let `TransactionManager` own the visible page header. Do not remove data loading.

- [ ] **Step 4: Refactor `TransactionManager` layout only**

In `src/features/transactions/transaction-manager.tsx`:

- Import `CoachHero`, `CoachMetricStrip`, and `WorkbenchCard` from `@/components/coach-ui`.
- Keep all state, schemas, fetch calls, and handlers unchanged.
- Compute a coaching recommendation from existing `monthlySummary`:

```tsx
const transactionCoachRecommendation =
  monthlySummary.expense === 0
    ? "Thêm giao dịch đầu tiên để MoneyMind bắt đầu đọc nhịp chi tiêu."
    : monthlySummary.balance >= 0
      ? "Tháng này vẫn còn dư, hãy ghi giao dịch ngay khi phát sinh để giữ nhịp tốt."
      : "Tháng này đang âm, MoneyMind sẽ ưu tiên nhắc các khoản chi cần xem lại.";
```

- Render the top hero before the form/list:

```tsx
<CoachHero
  eyebrow="Coach Capture"
  title="Ghi lại hôm nay, hiểu cả tháng"
  description="Nhập mô tả giao dịch trước, để MoneyMind tạo nháp rồi bạn kiểm tra lại trước khi lưu."
  recommendation={transactionCoachRecommendation}
  evidence={[
    {
      label: "Thu nhập",
      value: formatVnd(monthlySummary.income),
      helper: selectedMonth.label,
    },
    {
      label: "Chi tiêu",
      value: formatVnd(monthlySummary.expense),
      helper: monthlySummary.topCategory
        ? `Nhiều nhất: ${monthlySummary.topCategory.name}`
        : "Chưa có nhóm nổi bật",
    },
  ]}
/>
```

- Put current summary cards into `CoachMetricStrip`.
- Wrap the existing create form in a section titled `Nhập nhanh bằng AI`.
- Wrap the existing filtered/paginated list in `WorkbenchCard` with title `Sổ giao dịch`.
- Preserve every existing `id`, accessible label, form field name, button behavior, and toast behavior used by tests.

- [ ] **Step 5: Verify transaction tests pass**

Run:

```bash
pnpm test tests/transaction-manager.test.ts --runInBand
```

Expected: pass.

- [ ] **Step 6: Commit transactions redesign**

```bash
git add 'src/app/(app)/transactions/page.tsx' src/features/transactions/transaction-manager.tsx tests/transaction-manager.test.ts
git commit -m "feat: redesign transactions as coach capture"
```

---

### Task 4: Redesign Budgets Around Plan Tuning

**Files:**

- Modify: `src/app/(app)/budgets/page.tsx`
- Modify: `src/features/budgets/budget-manager.tsx`
- Modify: `tests/budget-manager.test.ts`

- [ ] **Step 1: Update budget tests**

Modify `tests/budget-manager.test.ts` to assert:

```tsx
expect(screen.getByText("Plan Tuner")).toBeInTheDocument();
expect(screen.getByText(/Bảo vệ tháng này/i)).toBeInTheDocument();
expect(screen.getByText(/Bảng điều chỉnh ngân sách/i)).toBeInTheDocument();
```

Keep existing tests for:

- Month navigation.
- Opening edit dialog.
- Saving month/default budget.
- Deleting month/default budget.
- Error display.

- [ ] **Step 2: Run focused budget tests and verify failure**

Run:

```bash
pnpm test tests/budget-manager.test.ts --runInBand
```

Expected: fail because plan-tuner copy is absent.

- [ ] **Step 3: Update route copy**

Modify `src/app/(app)/budgets/page.tsx`:

```tsx
<PageHeader
  eyebrow="Plan Tuner"
  title="Bảo vệ tháng này trước khi vượt hạn mức"
  description="MoneyMind ưu tiên danh mục cần xử lý trước, rồi giữ bảng điều chỉnh ngân sách ở phía dưới để bạn tinh chỉnh nhanh."
/>
```

- [ ] **Step 4: Refactor `BudgetManager` layout only**

In `src/features/budgets/budget-manager.tsx`:

- Import `CoachHero`, `CoachMetricStrip`, and `WorkbenchCard`.
- Keep all API calls and dialog logic unchanged.
- Derive risk rows from `initialData.rows`:

```tsx
const overLimitRows = initialData.rows.filter((row) => row.status === "over_limit");
const nearLimitRows = initialData.rows.filter((row) => row.status === "near_limit");
const missingLimitRows = initialData.rows.filter((row) => row.status === "not_set");
const topRiskRow = overLimitRows[0] ?? nearLimitRows[0] ?? missingLimitRows[0] ?? null;
const budgetRecommendation = topRiskRow
  ? `${topRiskRow.categoryName} là danh mục cần xem trước trong ${selectedMonth.label}.`
  : "Các hạn mức đang ổn, hãy tiếp tục theo dõi những khoản linh hoạt.";
```

- Render `CoachHero` before month navigation with:

```tsx
<CoachHero
  eyebrow="Plan Tuner"
  title="Bảo vệ tháng này trước khi vượt hạn mức"
  description="MoneyMind xếp hạng rủi ro ngân sách để bạn biết nên chỉnh danh mục nào trước."
  recommendation={budgetRecommendation}
  evidence={[
    { label: "Vượt hạn mức", value: `${overLimitRows.length}`, helper: formatVnd(initialData.summary.overAmount) },
    { label: "Gần vượt", value: `${nearLimitRows.length}`, helper: "Cần theo dõi" },
  ]}
/>
```

- Convert the existing four summary cards to `CoachMetricStrip`.
- Wrap the existing table in `WorkbenchCard` titled `Bảng điều chỉnh ngân sách`.
- Keep `BudgetEditDialog`, `BudgetRow`, and API request payloads unchanged except styling.

- [ ] **Step 5: Verify budget tests pass**

Run:

```bash
pnpm test tests/budget-manager.test.ts --runInBand
```

Expected: pass.

- [ ] **Step 6: Commit budgets redesign**

```bash
git add 'src/app/(app)/budgets/page.tsx' src/features/budgets/budget-manager.tsx tests/budget-manager.test.ts
git commit -m "feat: redesign budgets as plan tuner"
```

---

### Task 5: Redesign Categories Around Taxonomy Coaching

**Files:**

- Modify: `src/app/(app)/categories/page.tsx`
- Modify: `src/features/categories/category-manager.tsx`
- Modify: `tests/category-manager.test.ts`

- [ ] **Step 1: Update category tests**

Modify `tests/category-manager.test.ts` to assert:

```tsx
expect(screen.getByText("Taxonomy Coach")).toBeInTheDocument();
expect(screen.getByText(/Làm rõ ngôn ngữ tài chính/i)).toBeInTheDocument();
expect(screen.getByText(/Chất lượng phân loại/i)).toBeInTheDocument();
```

Keep existing tests for create, edit, delete, API errors, and insight rendering.

- [ ] **Step 2: Run focused category tests and verify failure**

Run:

```bash
pnpm test tests/category-manager.test.ts --runInBand
```

Expected: fail because taxonomy coach copy is absent.

- [ ] **Step 3: Update route copy**

Modify `src/app/(app)/categories/page.tsx`:

```tsx
<PageHeader
  eyebrow="Taxonomy Coach"
  title="Làm rõ ngôn ngữ tài chính của bạn"
  description="Danh mục tốt giúp MoneyMind hiểu đúng thói quen, phát hiện nhóm chi tiêu tăng bất thường và đưa lời khuyên cụ thể hơn."
/>
```

- [ ] **Step 4: Refactor `CategoryManager` layout only**

In `src/features/categories/category-manager.tsx`:

- Import `CoachHero`, `CoachMetricStrip`, and `WorkbenchCard`.
- Keep current insight calculations and all API handlers unchanged.
- Add insight-quality calculation:

```tsx
const categorizedWithActivity = visibleCategories.filter(
  (category) =>
    (insightsByCategory.get(category.id)?.transactionCount ??
      fallbackInsight(category.id).transactionCount) > 0,
).length;
const insightQualityScore =
  visibleCategories.length === 0
    ? 0
    : Math.min(100, Math.round((categorizedWithActivity / visibleCategories.length) * 100));
const categoryCoachRecommendation = unusualGrowth
  ? `${unusualGrowth.category.name} tăng ${unusualGrowth.insight.changePercentage}% so với tháng trước.`
  : topExpense
    ? `${topExpense.category.name} đang là nhóm chi tiêu lớn nhất tháng này.`
    : "Tạo danh mục rõ ràng để MoneyMind bắt đầu đọc thói quen chi tiêu.";
```

- Render `CoachHero` before the add-category form.
- Show `CoachMetricStrip` with active categories, custom categories, transactions, and insight quality.
- Wrap the add form in `WorkbenchCard` titled `Huấn luyện danh mục mới`.
- Wrap income/expense category groups in a workbench titled `Bản đồ danh mục`.
- Preserve existing dialog and alert behavior.

- [ ] **Step 5: Verify category tests pass**

Run:

```bash
pnpm test tests/category-manager.test.ts --runInBand
```

Expected: pass.

- [ ] **Step 6: Commit categories redesign**

```bash
git add 'src/app/(app)/categories/page.tsx' src/features/categories/category-manager.tsx tests/category-manager.test.ts
git commit -m "feat: redesign categories as taxonomy coach"
```

---

### Task 6: Add AI Insights Coach Journal Route

**Files:**

- Create: `src/app/(app)/insights/page.tsx`
- Create: `src/features/ai/insights-page-view.tsx`
- Create: `tests/ai-insights-page-view.test.tsx`

- [ ] **Step 1: Write presentation test**

Create `tests/ai-insights-page-view.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";

import { InsightsPageView } from "@/features/ai/insights-page-view";

jest.mock("@/features/ai/monthly-insight-panel", () => ({
  MonthlyInsightPanel: ({ month }: { month: string }) => (
    <div>Monthly insight panel for {month}</div>
  ),
}));

describe("InsightsPageView", () => {
  it("renders the coach journal route presentation", () => {
    render(
      <InsightsPageView
        month={{
          key: "2026-06",
          label: "Tháng 06/2026",
          previousKey: "2026-05",
          nextKey: "2026-07",
        }}
        initialInsight={null}
        dashboard={{
          income: "30.000.000 ₫",
          expense: "12.000.000 ₫",
          remaining: "18.000.000 ₫",
          health: "82/100",
        }}
      />,
    );

    expect(screen.getByText("Coach Journal")).toBeInTheDocument();
    expect(screen.getByText(/Nhìn lại tháng này/i)).toBeInTheDocument();
    expect(screen.getByText("Monthly insight panel for 2026-06")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Xem giao dịch/i })).toHaveAttribute(
      "href",
      "/transactions?month=2026-06",
    );
  });
});
```

- [ ] **Step 2: Run test and verify failure**

Run:

```bash
pnpm test tests/ai-insights-page-view.test.tsx --runInBand
```

Expected: fail because `InsightsPageView` does not exist.

- [ ] **Step 3: Implement `InsightsPageView`**

Create `src/features/ai/insights-page-view.tsx`:

```tsx
import Link from "next/link";

import {
  CoachActionCard,
  CoachHero,
  CoachMetricStrip,
  CoachPageShell,
  WorkbenchCard,
} from "@/components/coach-ui";
import { Button } from "@/components/ui/button";
import { MonthlyInsightPanel } from "@/features/ai/monthly-insight-panel";
import type { DashboardMonth } from "@/features/dashboard/month";
import type { MonthlyInsight } from "@/features/ai/monthly-insight";

type InsightsPageViewProps = {
  month: DashboardMonth;
  initialInsight: MonthlyInsight | null;
  dashboard: {
    income: string;
    expense: string;
    remaining: string;
    health: string;
  };
};

export function InsightsPageView({
  month,
  initialInsight,
  dashboard,
}: InsightsPageViewProps) {
  return (
    <CoachPageShell>
      <CoachHero
        eyebrow="Coach Journal"
        title="Nhìn lại tháng này cùng MoneyMind"
        description="Đọc nhận xét AI như một buổi coaching ngắn: điều gì đang tốt, điều gì cần chỉnh và bước tiếp theo nên làm."
        recommendation={
          initialInsight
            ? "MoneyMind đã có nhận xét cho tháng này. Hãy đọc lại và chọn một hành động nhỏ để theo dõi."
            : "Tạo nhận xét tháng này để biến dữ liệu thu chi thành lời khuyên cụ thể."
        }
        evidence={[
          { label: "Thu nhập", value: dashboard.income, helper: month.label },
          { label: "Chi tiêu", value: dashboard.expense, helper: "Đã ghi nhận" },
          { label: "Còn lại", value: dashboard.remaining, helper: "Sau chi tiêu" },
          { label: "Sức khỏe", value: dashboard.health, helper: "Điểm tháng" },
        ]}
        actions={
          <Button asChild className="rounded-full bg-[#2F6B4F] px-5 hover:bg-[#285B43]">
            <Link href={`/transactions?month=${month.key}`}>Xem giao dịch</Link>
          </Button>
        }
      />
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
        <WorkbenchCard
          title="Nhận xét từ MoneyMind"
          description="Nội dung này dùng cùng nguồn dữ liệu với dashboard và không tạo lịch sử riêng."
        >
          <MonthlyInsightPanel month={month.key} initialInsight={initialInsight} />
        </WorkbenchCard>
        <div className="space-y-4">
          <CoachMetricStrip
            metrics={[
              { label: "Số dư", value: dashboard.remaining, helper: month.label, tone: "positive" },
              { label: "Điểm", value: dashboard.health, helper: "Từ dashboard" },
            ]}
          />
          <CoachActionCard
            title="Biến insight thành hành động"
            description="Kiểm tra danh mục hoặc ngân sách liên quan ngay sau khi đọc nhận xét."
            action="Mở ngân sách"
            href={`/budgets?month=${month.key}`}
          />
          <CoachActionCard
            title="Hỏi sâu hơn"
            description="Dùng chat nổi để hỏi MoneyMind vì sao một khoản chi hoặc danh mục tăng."
            action="Về tổng quan"
            href={`/dashboard?month=${month.key}`}
          />
        </div>
      </div>
    </CoachPageShell>
  );
}
```

- [ ] **Step 4: Implement `/insights` route**

Create `src/app/(app)/insights/page.tsx`:

```tsx
import { cookies } from "next/headers";

import { getCachedMonthlyInsight } from "@/features/ai/monthly-insight";
import { InsightsPageView } from "@/features/ai/insights-page-view";
import {
  getSelectedMonth,
  USER_TIME_ZONE_COOKIE,
} from "@/features/dashboard/month";
import { getMonthlyDashboard } from "@/features/dashboard/service";
import { getCurrentUser } from "@/lib/auth-session";
import { formatVnd } from "@/lib/money";

type InsightsPageProps = {
  searchParams: Promise<{ month?: string | string[] }>;
};

function firstSearchParam(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function InsightsPage({ searchParams }: InsightsPageProps) {
  const user = await getCurrentUser();

  if (!user) {
    return null;
  }

  const params = await searchParams;
  const userTimeZone = (await cookies()).get(USER_TIME_ZONE_COOKIE)?.value;
  const month = getSelectedMonth(firstSearchParam(params.month), undefined, userTimeZone);
  const [dashboard, initialInsight] = await Promise.all([
    getMonthlyDashboard(user.id, month.key),
    getCachedMonthlyInsight(user.id, month.key),
  ]);

  return (
    <InsightsPageView
      month={month}
      initialInsight={initialInsight}
      dashboard={{
        income: formatVnd(dashboard.totals.income),
        expense: formatVnd(dashboard.totals.expense),
        remaining: formatVnd(dashboard.totals.remaining),
        health: `${dashboard.healthScore.score}/100`,
      }}
    />
  );
}
```

- [ ] **Step 5: Verify insights tests pass**

Run:

```bash
pnpm test tests/ai-insights-page-view.test.tsx --runInBand
```

Expected: pass.

- [ ] **Step 6: Commit AI Insights route**

```bash
git add 'src/app/(app)/insights/page.tsx' src/features/ai/insights-page-view.tsx tests/ai-insights-page-view.test.tsx
git commit -m "feat: add AI insights coach journal"
```

---

### Task 7: Add Reports Pattern Lab Route

**Files:**

- Create: `src/app/(app)/reports/page.tsx`
- Create: `src/features/reports/reports-page-view.tsx`
- Create: `tests/reports-page-view.test.tsx`

- [ ] **Step 1: Write reports presentation test**

Create `tests/reports-page-view.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";

import { ReportsPageView } from "@/features/reports/reports-page-view";

describe("ReportsPageView", () => {
  it("renders the pattern lab route presentation", () => {
    render(
      <ReportsPageView
        month={{
          key: "2026-06",
          label: "Tháng 06/2026",
          previousKey: "2026-05",
          nextKey: "2026-07",
        }}
        summary={{
          income: "30.000.000 ₫",
          expense: "12.000.000 ₫",
          remaining: "18.000.000 ₫",
          health: "82/100",
          topCategory: "Ăn ngoài",
          budgetRisk: "2 danh mục cần xem",
        }}
      />,
    );

    expect(screen.getByText("Pattern Lab")).toBeInTheDocument();
    expect(screen.getByText(/Tìm mẫu hành vi/i)).toBeInTheDocument();
    expect(screen.getByText("Ăn ngoài")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Mở danh mục/i })).toHaveAttribute(
      "href",
      "/categories",
    );
  });
});
```

- [ ] **Step 2: Run test and verify failure**

Run:

```bash
pnpm test tests/reports-page-view.test.tsx --runInBand
```

Expected: fail because `ReportsPageView` does not exist.

- [ ] **Step 3: Implement reports view**

Create `src/features/reports/reports-page-view.tsx`:

```tsx
import Link from "next/link";

import {
  CoachActionCard,
  CoachHero,
  CoachMetricStrip,
  CoachPageShell,
  WorkbenchCard,
} from "@/components/coach-ui";
import { Button } from "@/components/ui/button";
import type { DashboardMonth } from "@/features/dashboard/month";

type ReportsPageViewProps = {
  month: DashboardMonth;
  summary: {
    income: string;
    expense: string;
    remaining: string;
    health: string;
    topCategory: string;
    budgetRisk: string;
  };
};

export function ReportsPageView({ month, summary }: ReportsPageViewProps) {
  return (
    <CoachPageShell>
      <CoachHero
        eyebrow="Pattern Lab"
        title="Tìm mẫu hành vi trước khi xem biểu đồ"
        description="MoneyMind biến dữ liệu tháng thành câu chuyện: nhóm nào kéo chi tiêu lên, ngân sách nào cần chú ý và hành động nào đáng thử."
        recommendation={`${summary.topCategory} là tín hiệu nổi bật trong ${month.label}.`}
        evidence={[
          { label: "Chi tiêu", value: summary.expense, helper: month.label },
          { label: "Còn lại", value: summary.remaining, helper: "Sau chi tiêu" },
          { label: "Sức khỏe", value: summary.health, helper: "Điểm tháng" },
          { label: "Ngân sách", value: summary.budgetRisk, helper: "Rủi ro hiện tại" },
        ]}
        actions={
          <Button asChild className="rounded-full bg-[#2F6B4F] px-5 hover:bg-[#285B43]">
            <Link href={`/dashboard?month=${month.key}`}>Về tổng quan</Link>
          </Button>
        }
      />
      <CoachMetricStrip
        metrics={[
          { label: "Thu nhập", value: summary.income, helper: month.label, tone: "positive" },
          { label: "Chi tiêu", value: summary.expense, helper: "Đã ghi nhận", tone: "warning" },
          { label: "Còn lại", value: summary.remaining, helper: "Sau chi tiêu" },
          { label: "Nhóm nổi bật", value: summary.topCategory, helper: "Theo dashboard" },
        ]}
      />
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
        <WorkbenchCard
          title="Bằng chứng MoneyMind đang đọc"
          description="Phiên bản đầu tiên dùng dữ liệu tháng hiện tại để tránh phóng đại khi chưa có báo cáo nhiều tháng."
        >
          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-2xl border border-[#E1DDD4] bg-[#FFFDF7] p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Dòng tiền</p>
              <p className="mt-3 text-lg font-semibold">{summary.remaining}</p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">Số dư còn lại là tín hiệu đầu tiên để đánh giá nhịp tháng.</p>
            </div>
            <div className="rounded-2xl border border-[#E1DDD4] bg-[#FFFDF7] p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Danh mục</p>
              <p className="mt-3 text-lg font-semibold">{summary.topCategory}</p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">Nhóm nổi bật giúp MoneyMind chọn nơi cần hỏi sâu hơn.</p>
            </div>
            <div className="rounded-2xl border border-[#E1DDD4] bg-[#FFFDF7] p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Ngân sách</p>
              <p className="mt-3 text-lg font-semibold">{summary.budgetRisk}</p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">Rủi ro ngân sách là nơi dễ biến insight thành hành động.</p>
            </div>
          </div>
        </WorkbenchCard>
        <div className="space-y-4">
          <CoachActionCard
            title="Tinh chỉnh danh mục"
            description="Nếu một nhóm quá rộng, MoneyMind sẽ khó đưa lời khuyên cụ thể."
            action="Mở danh mục"
            href="/categories"
          />
          <CoachActionCard
            title="Kiểm tra ngân sách"
            description="Xem các hạn mức đang vượt hoặc gần vượt trong tháng này."
            action="Mở ngân sách"
            href={`/budgets?month=${month.key}`}
          />
        </div>
      </div>
    </CoachPageShell>
  );
}
```

- [ ] **Step 4: Implement `/reports` route**

Create `src/app/(app)/reports/page.tsx`:

```tsx
import { cookies } from "next/headers";

import { listCategoryBudgetRows } from "@/features/budgets/service";
import {
  getSelectedMonth,
  USER_TIME_ZONE_COOKIE,
} from "@/features/dashboard/month";
import { getMonthlyDashboard } from "@/features/dashboard/service";
import { ReportsPageView } from "@/features/reports/reports-page-view";
import { getCurrentUser } from "@/lib/auth-session";
import { formatVnd } from "@/lib/money";

type ReportsPageProps = {
  searchParams: Promise<{ month?: string | string[] }>;
};

function firstSearchParam(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function ReportsPage({ searchParams }: ReportsPageProps) {
  const user = await getCurrentUser();

  if (!user) {
    return null;
  }

  const params = await searchParams;
  const userTimeZone = (await cookies()).get(USER_TIME_ZONE_COOKIE)?.value;
  const month = getSelectedMonth(firstSearchParam(params.month), undefined, userTimeZone);
  const [dashboard, budgets] = await Promise.all([
    getMonthlyDashboard(user.id, month.key),
    listCategoryBudgetRows(user.id, month.key),
  ]);
  const topCategory = dashboard.categoryAnalysis[0]?.name ?? "Chưa có dữ liệu";
  const riskyBudgetCount = budgets.rows.filter(
    (row) => row.status === "over_limit" || row.status === "near_limit",
  ).length;

  return (
    <ReportsPageView
      month={month}
      summary={{
        income: formatVnd(dashboard.totals.income),
        expense: formatVnd(dashboard.totals.expense),
        remaining: formatVnd(dashboard.totals.remaining),
        health: `${dashboard.healthScore.score}/100`,
        topCategory,
        budgetRisk:
          riskyBudgetCount === 0
            ? "Đang ổn"
            : `${riskyBudgetCount} danh mục cần xem`,
      }}
    />
  );
}
```

- [ ] **Step 5: Verify reports tests pass**

Run:

```bash
pnpm test tests/reports-page-view.test.tsx --runInBand
```

Expected: pass.

- [ ] **Step 6: Commit reports route**

```bash
git add 'src/app/(app)/reports/page.tsx' src/features/reports/reports-page-view.tsx tests/reports-page-view.test.tsx
git commit -m "feat: add reports pattern lab"
```

---

### Task 8: Redesign AI Settings As Coach Control

**Files:**

- Modify: `src/app/(app)/settings/ai/page.tsx`
- Modify: `src/features/ai/ai-settings-form.tsx`
- Modify: `tests/ai-settings-form.test.ts`

- [ ] **Step 1: Update AI settings tests**

Modify `tests/ai-settings-form.test.ts` to assert:

```tsx
expect(screen.getByText("Coach Control")).toBeInTheDocument();
expect(screen.getByText(/Huấn luyện viên AI đã sẵn sàng/i)).toBeInTheDocument();
expect(screen.getByText(/Trung tâm cấu hình/i)).toBeInTheDocument();
```

Keep existing provider create/select/edit/delete/localStorage tests.

- [ ] **Step 2: Run focused settings tests and verify failure**

Run:

```bash
pnpm test tests/ai-settings-form.test.ts --runInBand
```

Expected: fail because coach-control copy is absent.

- [ ] **Step 3: Update route copy**

Modify `src/app/(app)/settings/ai/page.tsx`:

```tsx
<PageHeader
  eyebrow="Coach Control"
  title="Điều khiển huấn luyện viên AI"
  description="Kiểm tra trạng thái model, quyền riêng tư và cấu hình dùng cho chat, phân tích giao dịch và nhận xét tháng."
/>
```

- [ ] **Step 4: Refactor `AiSettingsForm` layout only**

In `src/features/ai/ai-settings-form.tsx`:

- Import `CoachHero`, `CoachMetricStrip`, and `WorkbenchCard`.
- Keep `useSyncExternalStore`, localStorage helpers, form schema, and provider handlers unchanged.
- Derive readiness:

```tsx
const coachReady = Boolean(selectedProvider?.apiKey);
const readinessMessage = coachReady
  ? "Huấn luyện viên AI đã sẵn sàng cho chat, phân tích giao dịch và nhận xét tháng."
  : "MoneyMind vẫn theo dõi thu chi, nhưng cần API key để bật các tính năng AI.";
```

- Render `CoachHero` at the top with evidence for provider count, selected model, and API-key status.
- Wrap provider form in `WorkbenchCard` titled `Trung tâm cấu hình`.
- Wrap saved provider list in `WorkbenchCard` titled `Nhà cung cấp đã lưu`.
- Preserve all button ids such as `newProvider` and `saveProvider`.

- [ ] **Step 5: Verify settings tests pass**

Run:

```bash
pnpm test tests/ai-settings-form.test.ts --runInBand
```

Expected: pass.

- [ ] **Step 6: Commit AI settings redesign**

```bash
git add 'src/app/(app)/settings/ai/page.tsx' src/features/ai/ai-settings-form.tsx tests/ai-settings-form.test.ts
git commit -m "feat: redesign AI settings as coach control"
```

---

### Task 9: Redesign Profile As Personalization

**Files:**

- Modify: `src/app/(app)/profile/page.tsx`
- Modify: `src/features/profile/profile-form.tsx`
- Modify: `src/features/profile/password-form.tsx`
- Modify: `tests/profile-forms.test.tsx`

- [ ] **Step 1: Update profile tests**

Modify `tests/profile-forms.test.tsx` to preserve current submit behavior and add route/form copy assertions where components are tested:

```tsx
expect(screen.getByText(/Danh tính hiển thị/i)).toBeInTheDocument();
expect(screen.getByText(/Bảo mật phiên đăng nhập/i)).toBeInTheDocument();
```

If the test only renders individual forms, add these headings inside the form components so they are testable.

- [ ] **Step 2: Run focused profile tests and verify failure**

Run:

```bash
pnpm test tests/profile-forms.test.tsx --runInBand
```

Expected: fail because new personalization copy is absent.

- [ ] **Step 3: Update profile route layout**

Modify `src/app/(app)/profile/page.tsx`:

- Import `CoachHero`, `CoachMetricStrip`, `CoachPageShell`, and `WorkbenchCard`.
- Replace the generic two-card layout with:

```tsx
<CoachPageShell>
  <CoachHero
    eyebrow="Personalization"
    title="Tài khoản dùng cho trải nghiệm coaching"
    description="Quản lý danh tính hiển thị và bảo mật đăng nhập để MoneyMind luôn gắn dữ liệu tài chính với đúng tài khoản."
    recommendation={
      user.name
        ? `MoneyMind sẽ hiển thị bạn là ${user.name}.`
        : "Thêm tên hiển thị để trải nghiệm trong ứng dụng cá nhân hơn."
    }
    evidence={[
      { label: "Email", value: user.email, helper: "Tài khoản đăng nhập" },
      { label: "Avatar", value: user.image ? "Đã có" : "Chưa có", helper: "Hồ sơ hiển thị" },
    ]}
  />
  <CoachMetricStrip
    metrics={[
      { label: "Hồ sơ", value: user.name ? "Đủ tên" : "Thiếu tên", helper: "Danh tính hiển thị" },
      { label: "Ảnh", value: user.image ? "Đã cấu hình" : "Chưa có", helper: "Avatar URL" },
    ]}
  />
  <div className="grid gap-5 lg:grid-cols-[1fr_0.9fr]">
    <WorkbenchCard title="Danh tính hiển thị" description="Cập nhật tên và avatar trong MoneyMind.">
      <ProfileForm user={user} />
    </WorkbenchCard>
    <WorkbenchCard title="Bảo mật phiên đăng nhập" description="Đổi mật khẩu và thu hồi các phiên khác nếu cần.">
      <PasswordForm />
    </WorkbenchCard>
  </div>
</CoachPageShell>
```

- [ ] **Step 4: Align form styling without changing behavior**

In `src/features/profile/profile-form.tsx` and `src/features/profile/password-form.tsx`:

- Keep schemas, `updateProfileAction`, `authClient.changePassword`, toast behavior, ids, and field names unchanged.
- Update input classes to match warm workbench controls:

```tsx
const INPUT_CLASS =
  "h-11 w-full rounded-xl border border-[#DCD7CC] bg-[#FFFDF7] px-3 text-sm outline-none transition-colors focus:border-[#2F6B4F] focus:ring-3 focus:ring-[#2F6B4F]/15";
```

- Do not add new persisted profile preference fields.

- [ ] **Step 5: Verify profile tests pass**

Run:

```bash
pnpm test tests/profile-forms.test.tsx --runInBand
```

Expected: pass.

- [ ] **Step 6: Commit profile redesign**

```bash
git add 'src/app/(app)/profile/page.tsx' src/features/profile/profile-form.tsx src/features/profile/password-form.tsx tests/profile-forms.test.tsx
git commit -m "feat: redesign profile as personalization"
```

---

### Task 10: Full Verification, Responsive Check, And Final Polish

**Files:**

- Modify any touched files only for issues found during verification.
- Create: `docs/superpowers/plans/2026-06-07-ai-first-app-redesign-verification.md`

- [ ] **Step 1: Run the full Jest suite**

Run:

```bash
pnpm test --runInBand
```

Expected: all suites pass.

- [ ] **Step 2: Run lint**

Run:

```bash
pnpm lint
```

Expected: no lint errors.

- [ ] **Step 3: Run build**

Run:

```bash
pnpm build
```

Expected: build completes without TypeScript or Next.js errors.

- [ ] **Step 4: Start dev server**

Run:

```bash
pnpm dev
```

Expected: dev server starts and prints a local URL, usually `http://localhost:3000`.

- [ ] **Step 5: Manual browser verification**

Open the dev URL and verify these authenticated pages at desktop width around 1440px:

- `/dashboard`
- `/transactions`
- `/budgets`
- `/categories`
- `/insights`
- `/reports`
- `/settings/ai`
- `/profile`

Then verify the same routes around 390px mobile width.

For each route confirm:

- Coach hero appears before operational workbench.
- Existing forms still submit.
- Existing edit/delete dialogs still open and close.
- Navigation remains horizontally usable on mobile.
- No text overlaps buttons, cards, or adjacent controls.
- Tables or row lists remain usable on mobile.
- AI provider missing state still shows the existing Vietnamese error where behavior expects it.

- [ ] **Step 6: Write verification notes**

Create `docs/superpowers/plans/2026-06-07-ai-first-app-redesign-verification.md`:

```markdown
# AI-First App Redesign Verification

## Automated

- `pnpm test --runInBand`: PASS
- `pnpm lint`: PASS
- `pnpm build`: PASS

## Manual Routes

- `/dashboard`: PASS
- `/transactions`: PASS
- `/budgets`: PASS
- `/categories`: PASS
- `/insights`: PASS
- `/reports`: PASS
- `/settings/ai`: PASS
- `/profile`: PASS

## Responsive

- Desktop 1440px: PASS
- Mobile 390px: PASS

## Notes

- Existing business logic, API routes, and Prisma schema were preserved.
- `/insights` reuses current monthly insight capability and does not imply persisted history.
- `/reports` uses current selected-month data and avoids unsupported long-term claims.
```

- [ ] **Step 7: Commit verification notes and final polish**

```bash
git add docs/superpowers/plans/2026-06-07-ai-first-app-redesign-verification.md
git commit -m "docs: verify AI-first app redesign"
```

- [ ] **Step 8: Inspect final diff**

Run:

```bash
git status --short
git log --oneline main..HEAD
```

Expected:

- `git status --short` is clean.
- Branch contains the spec commit, plan commit if committed, and implementation commits.

## Final Delivery Notes

When implementation is complete, report:

- Branch name: `design/ai-first-app-redesign`
- Test commands and results.
- New routes: `/insights`, `/reports`.
- Any manual verification limitations.
- Whether the branch has been pushed, if the user asks for push/PR delivery.
