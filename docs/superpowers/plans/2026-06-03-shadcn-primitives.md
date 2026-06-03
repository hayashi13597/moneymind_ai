# Shadcn Primitives Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make shadcn/ui the primitive UI layer across MoneyMind while preserving the current MoneyMind visual language and behavior.

**Architecture:** Keep generated primitives in `src/components/ui/*` untouched for feature-specific needs. Put app styling and behavior in shared wrappers such as `src/components/app-ui.tsx`, `src/components/form-combobox.tsx`, `src/components/form-date-picker.tsx`, `src/components/form-month-picker.tsx`, and `src/components/form-rhf-controls.tsx`. Migrate route surfaces incrementally so each task is independently testable.

**Tech Stack:** Next.js App Router 16.2.6, React 19, TypeScript, Tailwind CSS 4, shadcn/ui v4 radix-nova, Radix primitives through `radix-ui`, react-hook-form, Zod, Jest/jsdom, sonner.

---

## Source Spec

- `docs/superpowers/specs/2026-06-03-shadcn-primitives-design.md`

## Current Route Inventory

Implementation must verify this inventory again before editing:

- `/`
- `/login`
- `/signup`
- `/dashboard`
- `/transactions`
- `/budgets`
- `/categories`
- `/settings/ai`

Relevant API routes should not change contract:

- `src/app/api/ai/chat/route.ts`
- `src/app/api/ai/monthly-insight/route.ts`
- `src/app/api/ai/parse-transaction/route.ts`
- `src/app/api/budgets/route.ts`
- `src/app/api/categories/route.ts`
- `src/app/api/categories/[id]/route.ts`
- `src/app/api/transactions/route.ts`
- `src/app/api/transactions/[id]/route.ts`

## File Structure And Responsibilities

- `src/components/ui/*`: generated shadcn primitives. Do not edit for MoneyMind-specific feature styling.
- `src/components/app-ui.tsx`: MoneyMind app-level page primitives composed from shadcn primitives.
- `src/components/app-nav.tsx`: pathname-aware client navigation.
- `src/components/auth/login-form.tsx`: login form composed from shadcn `Form`, `Input`, and `Button`.
- `src/components/auth/signup-form.tsx`: signup form composed from shadcn `Form`, `Input`, and `Button`.
- `src/components/form-combobox.tsx`: MoneyMind combobox adapter using `Popover`, `Command`, and `Button`.
- `src/components/form-date-picker.tsx`: MoneyMind date adapter using `Popover`, `Calendar`, and `Button`, preserving `YYYY-MM-DD`.
- `src/components/form-month-picker.tsx`: MoneyMind month adapter preserving `YYYY-MM`.
- `src/components/form-rhf-controls.tsx`: React Hook Form adapters for non-native custom controls.
- `src/app/(app)/layout.tsx`: Server Component app shell; keep session and database work here.
- `src/app/(app)/loading.tsx`: route-level loading fallback; use shadcn `Skeleton` where practical.
- `src/app/(public)/page.tsx`: public landing page; use shadcn primitives without changing product message.
- `src/features/dashboard/dashboard-view.tsx`: dashboard presentation; preserve layout and data props.
- `src/features/transactions/transaction-manager.tsx`: transaction CRUD, filtering, pagination, and AI draft entry UI.
- `src/features/categories/category-manager.tsx`: category CRUD UI.
- `src/features/budgets/budget-manager.tsx`: budget workbench UI.
- `src/features/ai/ai-settings-form.tsx`: browser-local AI provider settings UI.
- `src/features/ai-chat/widget.tsx`: floating AI chat UI.
- `src/features/ai-chat/transaction-review-modal.tsx`: AI draft review modal UI.
- `tests/form-ui.test.ts`: shared primitive/wrapper behavior tests.
- `tests/app-navigation-loading.test.ts`: app shell/navigation/loading behavior tests.
- `tests/dashboard-view.test.ts`: dashboard behavior tests.
- `tests/transaction-manager.test.ts`: transactions UI behavior tests.
- `tests/category-manager.test.ts`: categories UI behavior tests.
- `tests/budget-manager.test.ts`: budgets UI behavior tests.
- `tests/ai-settings-form.test.ts`: AI settings UI behavior tests.
- `tests/ai-chat-widget-client.test.ts` and `tests/ai-chat-review-modal.test.ts`: AI chat/review UI behavior tests.

## Docs Read Before Planning

- `node_modules/next/dist/docs/01-app/01-getting-started/03-layouts-and-pages.md`: layouts preserve shared UI and wrap route children.
- `node_modules/next/dist/docs/01-app/01-getting-started/05-server-and-client-components.md`: keep browser APIs and event handlers in Client Components; keep data/secrets in Server Components.
- `node_modules/next/dist/docs/01-app/02-guides/instant-navigation.md`: route-level loading and local boundaries matter for responsive navigation.
- `node_modules/next/dist/docs/01-app/02-guides/testing/jest.md`: Jest/jsdom remains appropriate for synchronous Client Component behavior tests.

## Task 1: Baseline Audit And Guard Tests

**Files:**
- Modify: `tests/form-ui.test.ts`
- Read: `components.json`
- Read: `src/components/ui/*.tsx`
- Read: `src/components/app-ui.tsx`
- Read: `src/components/form-combobox.tsx`
- Read: `src/components/form-date-picker.tsx`
- Read: `src/components/form-month-picker.tsx`
- Read: `src/components/form-rhf-controls.tsx`

- [ ] **Step 1: Capture the dirty worktree before editing**

Run:

```bash
git status --short
git diff --stat
```

Expected: the output may include existing shadcn install and partial migration changes. Do not revert them.

- [ ] **Step 2: Verify the shadcn config**

Run:

```bash
cat components.json
```

Expected: aliases include `"ui": "@/components/ui"`, `"components": "@/components"`, and `"utils": "@/lib/utils"`.

- [ ] **Step 3: Expand shared UI tests for wrapper boundaries**

Add this test case to `tests/form-ui.test.ts` after the existing `shadcn React Hook Form primitives` test:

```ts
import { renderToStaticMarkup } from "react-dom/server";

import { EmptyState, InsightCard, MetricCard, SectionCard } from "@/components/app-ui";

describe("MoneyMind app-level UI wrappers", () => {
  it("render outside the generated ui primitive boundary", () => {
    const markup = renderToStaticMarkup(
      React.createElement(
        "div",
        null,
        React.createElement(SectionCard, null, "Nội dung"),
        React.createElement(MetricCard, {
          label: "Chi tiêu",
          value: "100.000 ₫",
          helper: "Trong tháng này",
        }),
        React.createElement(InsightCard, {
          title: "Gợi ý",
          description: "Theo dõi chi tiêu đều đặn.",
        }),
        React.createElement(EmptyState, {
          title: "Chưa có dữ liệu",
          description: "Thêm giao dịch đầu tiên.",
        }),
      ),
    );

    expect(markup).toContain("Nội dung");
    expect(markup).toContain("Chi tiêu");
    expect(markup).toContain("Gợi ý");
    expect(markup).toContain("Chưa có dữ liệu");
  });
});
```

If `renderToStaticMarkup` import placement conflicts with existing imports, move it into the top import block with the other React imports.

- [ ] **Step 4: Run the focused test**

Run:

```bash
pnpm test --runInBand tests/form-ui.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add tests/form-ui.test.ts
git commit -m "test: cover shadcn wrapper boundary"
```

## Task 2: Shared App Wrappers

**Files:**
- Modify: `src/components/app-ui.tsx`
- Test: `tests/form-ui.test.ts`

- [ ] **Step 1: Inspect generated primitives before composing wrappers**

Run:

```bash
sed -n '1,220p' src/components/ui/card.tsx
sed -n '1,220p' src/components/ui/badge.tsx
sed -n '1,220p' src/components/ui/empty.tsx
```

Expected: files exist and export composable primitives. Do not edit them.

- [ ] **Step 2: Compose `SectionCard` and `MetricCard` from shadcn `Card`**

In `src/components/app-ui.tsx`, add imports:

```ts
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
```

Replace `SectionCard` with:

```tsx
export function SectionCard({ children, className, muted }: SectionCardProps) {
  return (
    <Card
      className={cn(
        "rounded-2xl border-[#E1DDD4] bg-card shadow-none",
        muted && "bg-[#F6F3EC]",
        className,
      )}
    >
      <CardContent className="p-5 md:p-6">{children}</CardContent>
    </Card>
  );
}
```

Replace `MetricCard` with:

```tsx
export function MetricCard({
  label,
  value,
  helper,
  tone = "default",
}: MetricCardProps) {
  return (
    <Card className="rounded-2xl border-[#E1DDD4] bg-card shadow-none">
      <CardContent className="p-5">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p
          className={cn(
            "mt-3 text-2xl font-semibold tracking-normal text-foreground",
            tone === "positive" && "text-[#2F6B4F]",
            tone === "negative" && "text-[#A2482D]",
          )}
        >
          {value}
        </p>
        <p className="mt-2 text-xs leading-5 text-muted-foreground">{helper}</p>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 3: Compose `InsightCard` from `Card` and `Badge`**

Replace `InsightCard` with:

```tsx
export function InsightCard({
  title,
  description,
  children,
  className,
}: InsightCardProps) {
  return (
    <Card
      className={cn(
        "rounded-2xl border-[#D8E1D7] bg-[#F3F8F2] shadow-none",
        className,
      )}
    >
      <CardHeader className="p-5 pb-0 md:p-6 md:pb-0">
        <div className="flex items-start gap-3">
          <Badge className="rounded-full bg-[#2F6B4F] p-2 text-white hover:bg-[#2F6B4F]">
            <Sparkles className="size-4" />
          </Badge>
          <div className="min-w-0">
            <h2 className="text-lg font-semibold">{title}</h2>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              {description}
            </p>
          </div>
        </div>
      </CardHeader>
      {children ? <CardContent className="p-5 md:p-6">{children}</CardContent> : null}
    </Card>
  );
}
```

- [ ] **Step 4: Keep `EmptyState` visual stable**

If `src/components/ui/empty.tsx` exports `Empty`, `EmptyHeader`, `EmptyTitle`, and `EmptyDescription`, compose from those. If its API differs, keep the current markup and only replace the outer surface with `Card`:

```tsx
export function EmptyState({ title, description, children }: EmptyStateProps) {
  return (
    <Card className="rounded-2xl border-dashed border-[#DCD7CC] bg-[#FDFCF8] shadow-none">
      <CardContent className="p-6 text-center">
        <div className="mx-auto flex size-10 items-center justify-center rounded-full bg-[#ECF3ED] text-[#2F6B4F]">
          <Bot className="size-5" />
        </div>
        <h2 className="mt-4 text-base font-semibold">{title}</h2>
        <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-muted-foreground">
          {description}
        </p>
        {children ? <div className="mt-5">{children}</div> : null}
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 5: Run focused tests**

Run:

```bash
pnpm test --runInBand tests/form-ui.test.ts tests/dashboard-view.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/components/app-ui.tsx tests/form-ui.test.ts
git commit -m "refactor: compose app wrappers from shadcn primitives"
```

## Task 3: Auth Forms

**Files:**
- Modify: `src/components/auth/login-form.tsx`
- Modify: `src/components/auth/signup-form.tsx`

- [ ] **Step 1: Verify current auth behavior**

Run:

```bash
rg -n "LoginForm|SignupForm|Email hoặc mật khẩu|Không thể tạo tài khoản" tests src/components/auth
```

Expected: login/signup forms keep existing Vietnamese error copy.

- [ ] **Step 2: Normalize input/button usage**

In both auth forms, keep imports from:

```ts
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
```

Keep the input class outside `src/components/ui/input.tsx`:

```ts
const INPUT_CLASS =
  "h-11 w-full rounded-xl border border-warm-border bg-surface px-3 text-sm outline-none transition-colors focus:border-primary focus:ring-3 focus:ring-primary/15";
```

Do not replace `authClient.signIn.email`, `authClient.signUp.email`, `router.push`, or `router.refresh`.

- [ ] **Step 3: Verify form markup manually in code**

Each field should follow this exact structure:

```tsx
<FormField
  control={form.control}
  name="email"
  render={({ field }) => (
    <FormItem>
      <FormLabel>Email</FormLabel>
      <FormControl>
        <Input
          {...field}
          autoComplete="email"
          className={INPUT_CLASS}
          placeholder="ban@example.com"
          type="email"
        />
      </FormControl>
      <FormMessage />
    </FormItem>
  )}
/>
```

Use the same pattern for password and name fields with their existing labels, autocomplete attributes, placeholders, and types.

- [ ] **Step 4: Run lint for auth files**

Run:

```bash
pnpm lint --file src/components/auth/login-form.tsx --file src/components/auth/signup-form.tsx
```

Expected: PASS. If the repo lint script does not support `--file`, run `pnpm lint`.

- [ ] **Step 5: Commit**

```bash
git add src/components/auth/login-form.tsx src/components/auth/signup-form.tsx
git commit -m "refactor: normalize auth forms with shadcn primitives"
```

## Task 4: App Shell, Loading, And Public Page

**Files:**
- Modify: `src/app/(app)/layout.tsx`
- Modify: `src/app/(app)/loading.tsx`
- Modify: `src/app/(public)/page.tsx`
- Modify: `src/components/app-nav.tsx`
- Test: `tests/app-navigation-loading.test.ts`

- [ ] **Step 1: Re-read Next.js docs before editing App Router files**

Run:

```bash
sed -n '1,120p' node_modules/next/dist/docs/01-app/01-getting-started/03-layouts-and-pages.md
sed -n '1,120p' node_modules/next/dist/docs/01-app/01-getting-started/05-server-and-client-components.md
```

Expected: confirm `layout.tsx` remains a Server Component and `app-nav.tsx` remains the Client Component for pathname behavior.

- [ ] **Step 2: Use shadcn primitives where they fit**

In `src/app/(app)/loading.tsx`, replace handmade skeleton blocks with shadcn `Skeleton` while keeping the visual color:

```tsx
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

function SkeletonBlock({ className }: { className: string }) {
  return <Skeleton className={cn("rounded-xl bg-[#E9E4DA]", className)} />;
}
```

Do not change the outer `aria-busy`, `aria-label`, layout grid, or loading copy.

- [ ] **Step 3: Keep app shell server-side**

In `src/app/(app)/layout.tsx`, do not add `"use client"`. If composing from shadcn primitives, only import server-safe presentational components such as `Badge` or `Separator`. Keep:

```ts
const session = await getCurrentSession();
const categories = await db.category.findMany(...)
```

unchanged.

- [ ] **Step 4: Keep active nav in `AppNav`**

Do not add inline navigation pending UI. `src/components/app-nav.tsx` must keep:

```ts
"use client";
const pathname = usePathname();
```

If replacing the nav surface with shadcn primitives, preserve `aria-current={isActive ? "page" : undefined}` and horizontal overflow behavior.

- [ ] **Step 5: Public page migration**

In `src/app/(public)/page.tsx`, replace handmade action buttons and cards with `Button`, `Card`, and `CardContent` imports where possible:

```ts
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
```

Keep public route links, Vietnamese copy, and visual hierarchy unchanged.

- [ ] **Step 6: Run focused shell tests**

Run:

```bash
pnpm test --runInBand tests/app-navigation-loading.test.ts
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/app/'(app)'/layout.tsx src/app/'(app)'/loading.tsx src/app/'(public)'/page.tsx src/components/app-nav.tsx tests/app-navigation-loading.test.ts
git commit -m "refactor: align app shell with shadcn primitives"
```

## Task 5: Dashboard Surface

**Files:**
- Modify: `src/features/dashboard/dashboard-view.tsx`
- Modify: `src/features/dashboard/ask-moneymind-panel.tsx`
- Modify: `src/features/ai/monthly-insight-panel.tsx`
- Test: `tests/dashboard-view.test.ts`
- Test: `tests/dashboard-budget-summary.test.ts`
- Test: `tests/ai-monthly-insight.test.ts`

- [ ] **Step 1: Verify dashboard baseline before editing**

Run:

```bash
rg -n "Tổng quan tài chính|Huấn luyện viên MoneyMind|Ngân sách tháng này|Xin chào" src/features/dashboard src/features/ai tests/dashboard-view.test.ts
```

Expected: current dashboard text remains the baseline.

- [ ] **Step 2: Replace repeated badge/card surfaces**

In `src/features/dashboard/dashboard-view.tsx`, import:

```ts
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
```

Use `Badge` for small tone labels such as `Huấn luyện viên MoneyMind`, budget statuses, and category change labels. Use `Card`/`CardContent` for repeated metric or list containers only where this does not change layout.

When replacing handmade progress bars, keep percentages identical. For example:

```tsx
<Progress
  value={Math.min(item.percentage, 100)}
  className="h-2 bg-[#F3F0E9]"
/>
```

If `Progress` cannot preserve the current color semantics cleanly, keep the handmade bar and document that in the implementation notes.

- [ ] **Step 3: Preserve AI panels**

In `AskMoneyMindPanel` and `MonthlyInsightPanel`, use `Button`, `Textarea`, `Card`, `CardContent`, `Alert`, or `Spinner` primitives where they already match the surface. Do not change API payloads, selected-month props, provider settings, or timeout/error copy.

- [ ] **Step 4: Run focused dashboard tests**

Run:

```bash
pnpm test --runInBand tests/dashboard-view.test.ts tests/dashboard-budget-summary.test.ts tests/ai-monthly-insight.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/features/dashboard/dashboard-view.tsx src/features/dashboard/ask-moneymind-panel.tsx src/features/ai/monthly-insight-panel.tsx tests/dashboard-view.test.ts tests/dashboard-budget-summary.test.ts tests/ai-monthly-insight.test.ts
git commit -m "refactor: use shadcn primitives on dashboard"
```

## Task 6: Transactions Surface

**Files:**
- Modify: `src/features/transactions/transaction-manager.tsx`
- Modify: `src/features/ai-chat/transaction-review-modal.tsx`
- Test: `tests/transaction-manager.test.ts`
- Test: `tests/ai-chat-review-modal.test.ts`

- [ ] **Step 1: Verify behavior targets**

Run:

```bash
rg -n "pageSize|Xem giao dịch nháp|transactionDate|FormMonthPicker|AI|Đã lưu|Không thể" src/features/transactions src/features/ai-chat tests/transaction-manager.test.ts tests/ai-chat-review-modal.test.ts
```

Expected: tests and source cover pagination, AI draft review, selected-month dates, and mutation errors.

- [ ] **Step 2: Keep form contracts unchanged**

In `transaction-manager.tsx`, keep:

```ts
const transactionFormSchema = z.object({
  type: z.enum(["income", "expense"]),
  amount: z.string().trim().min(1, "Số tiền là bắt buộc."),
  categoryId: z.string().trim().min(1, "Danh mục là bắt buộc."),
  transactionDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Ngày không hợp lệ."),
  note: z.string().trim().min(1, "Ghi chú là bắt buộc."),
  merchant: z.string(),
  rawInput: z.string(),
});
```

Keep `FormCombobox`, `FormMonthPicker`, `RhfComboboxControl`, and `RhfDatePickerControl` as the custom-control boundary.

- [ ] **Step 3: Use shadcn primitives for lists and pagination**

Import primitives where useful:

```ts
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
```

Use `Pagination` components for previous/next/page controls while preserving current query params for `month`, `page`, `pageSize`, `q`, and `type`.

If transaction rows are currently card-based on mobile, keep the responsive layout and use `Table` only where the existing layout already behaves as a table. Do not make mobile scanning worse.

- [ ] **Step 4: Use shadcn dialog primitives for edit/delete/review flows**

Keep existing `AlertDialog` for destructive delete confirmation. In `transaction-review-modal.tsx`, use `Dialog` primitives if not already present:

```ts
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
```

Do not change AI draft payload shape, save behavior, or toast copy.

- [ ] **Step 5: Run focused tests**

Run:

```bash
pnpm test --runInBand tests/transaction-manager.test.ts tests/ai-chat-review-modal.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/features/transactions/transaction-manager.tsx src/features/ai-chat/transaction-review-modal.tsx tests/transaction-manager.test.ts tests/ai-chat-review-modal.test.ts
git commit -m "refactor: use shadcn primitives for transactions"
```

## Task 7: Categories, Budgets, And AI Settings

**Files:**
- Modify: `src/features/categories/category-manager.tsx`
- Modify: `src/features/budgets/budget-manager.tsx`
- Modify: `src/features/ai/ai-settings-form.tsx`
- Test: `tests/category-manager.test.ts`
- Test: `tests/budget-manager.test.ts`
- Test: `tests/ai-settings-form.test.ts`

- [ ] **Step 1: Verify mutation behavior targets**

Run:

```bash
rg -n "toast|refresh|localStorage|Provider|Ngân sách|Danh mục|Không thể" src/features/categories src/features/budgets src/features/ai tests/category-manager.test.ts tests/budget-manager.test.ts tests/ai-settings-form.test.ts
```

Expected: mutation success/error and local provider behavior are visible in tests or source.

- [ ] **Step 2: Categories**

In `category-manager.tsx`, keep API calls to `/api/categories` unchanged. Use existing `Form`/`Input`/`Button`/`AlertDialog` primitives. Use `Badge` for type/status labels:

```tsx
<Badge
  variant="outline"
  className={cn(
    "rounded-full border px-2 py-0.5 text-xs font-medium",
    category.type === "income"
      ? "border-[#D8E1D7] bg-[#ECF3ED] text-[#2F6B4F]"
      : "border-[#E7D9D2] bg-[#FBF0EC] text-[#A2482D]",
  )}
>
  {typeLabels[category.type]}
</Badge>
```

- [ ] **Step 3: Budgets**

In `budget-manager.tsx`, keep budget `PUT`/`DELETE` payloads unchanged. Use `Badge` for budget status labels and `Dialog` or `AlertDialog` for edit/delete flows. Preserve:

```ts
const statusLabels = {
  not_set: "Chưa đặt",
  healthy: "Ổn",
  near_limit: "Gần vượt",
  over_limit: "Đã vượt",
} as const;
```

- [ ] **Step 4: AI settings**

In `ai-settings-form.tsx`, keep local provider functions unchanged:

```ts
saveLocalAiProvider(...)
selectLocalAiProvider(providerId)
deleteLocalAiProvider(provider.id)
```

Use `Tabs` or `Card` only if it preserves the current provider list/form layout. Use `AlertDialog` for delete confirmation if the current delete is immediate and the UI needs a confirmation, but do not add new product behavior unless already present in current worktree.

- [ ] **Step 5: Run focused tests**

Run:

```bash
pnpm test --runInBand tests/category-manager.test.ts tests/budget-manager.test.ts tests/ai-settings-form.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/features/categories/category-manager.tsx src/features/budgets/budget-manager.tsx src/features/ai/ai-settings-form.tsx tests/category-manager.test.ts tests/budget-manager.test.ts tests/ai-settings-form.test.ts
git commit -m "refactor: align management surfaces with shadcn primitives"
```

## Task 8: AI Chat Widget

**Files:**
- Modify: `src/features/ai-chat/widget.tsx`
- Test: `tests/ai-chat-widget-client.test.ts`
- Test: `tests/ai-chat-widget.test.ts`

- [ ] **Step 1: Verify chat behavior targets**

Run:

```bash
rg -n "AI đang trả lời|provider|parse|draft|toast|Gửi" src/features/ai-chat tests/ai-chat-widget-client.test.ts tests/ai-chat-widget.test.ts
```

Expected: chat pending state, provider payload, and draft flow are covered.

- [ ] **Step 2: Use chat-friendly primitives**

In `widget.tsx`, use:

```ts
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
```

Keep `aria-label="Gửi tin nhắn"` or the existing accessible send label. Keep provider setting read behavior and API request body unchanged.

- [ ] **Step 3: Preserve motion and fixed positioning**

Do not move the floating widget out of its fixed viewport anchor. Use shadcn primitives inside the panel only:

```tsx
<Card className="fixed bottom-4 right-4 z-40 ...">
  <CardHeader>...</CardHeader>
  <CardContent>...</CardContent>
</Card>
```

Keep responsive constraints so the widget does not cover the full mobile screen unless current behavior already does.

- [ ] **Step 4: Run focused tests**

Run:

```bash
pnpm test --runInBand tests/ai-chat-widget-client.test.ts tests/ai-chat-widget.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/features/ai-chat/widget.tsx tests/ai-chat-widget-client.test.ts tests/ai-chat-widget.test.ts
git commit -m "refactor: compose AI chat from shadcn primitives"
```

## Task 9: Full Verification And Cleanup

**Files:**
- Review: all files changed in Tasks 1-8
- Review: `src/components/ui/*`
- Review: `package.json`
- Review: `pnpm-lock.yaml`

- [ ] **Step 1: Confirm generated primitives were not feature-edited**

Run:

```bash
git diff -- src/components/ui
```

Expected: diff should either be generated shadcn component additions from the install or no diff. There should be no MoneyMind feature-specific business logic in `src/components/ui/*`.

- [ ] **Step 2: Search for remaining handmade native controls**

Run:

```bash
rg -n "<(button|input|textarea|select)\\b" src/app src/components src/features
```

Expected: remaining native controls are either inside shadcn primitives, hidden inputs required by wrapper contracts, or justified controls where a primitive would harm behavior. For each remaining app/feature native control, either migrate it or add a short code comment only if the reason is not obvious.

- [ ] **Step 3: Search for forbidden UI boundary drift**

Run:

```bash
rg -n "MoneyMind|formatVnd|fetch\\(|localStorage|router\\.|toast\\." src/components/ui
```

Expected: no matches except harmless generated examples if shadcn created them. If there are matches from app-specific logic, move that logic out of `src/components/ui/*`.

- [ ] **Step 4: Run lint**

Run:

```bash
pnpm lint
```

Expected: PASS.

- [ ] **Step 5: Run full tests**

Run:

```bash
pnpm test --runInBand
```

Expected: PASS.

- [ ] **Step 6: Inspect final diff**

Run:

```bash
git status --short
git diff --stat
```

Expected: only shadcn primitive install files, app wrapper/component migrations, and focused test updates are changed.

- [ ] **Step 7: Commit final cleanup if needed**

If Task 9 changed files after prior commits:

```bash
git add src tests package.json pnpm-lock.yaml
git commit -m "chore: verify shadcn primitive migration"
```

If Task 9 made no changes, do not create an empty commit.

## Self-Review

- Spec coverage: the plan covers primitive boundaries, preserving visual baseline, all current route surfaces, forms, dialogs, navigation/loading, data flow preservation, error handling, and lint/test verification.
- Placeholder scan: no `TBD`, `TODO`, or unspecified edge-case steps remain.
- Type consistency: file paths and component names match the current repository inventory and the approved design spec.
