# Shadcn Primitives Design

## Summary

Use the newly installed shadcn/ui components as the primitive UI layer across MoneyMind while preserving the current MoneyMind visual language.

The app should keep its warm green finance-coach look, Vietnamese copy, existing data flows, and current product behavior. The change is about component boundaries and consistent primitive usage, not a broad visual redesign.

Generated shadcn primitives under `src/components/ui/*` are treated as base components. App-specific composition, styling, data formatting, and behavior stay outside that folder.

## Goals

- Use shadcn/ui primitives throughout the app where they fit the UI surface.
- Avoid editing generated primitive files in `src/components/ui/*` for feature-specific needs.
- Preserve the current MoneyMind visual baseline from the dashboard and shared app styling.
- Keep page behavior, API contracts, validation, local AI provider persistence, pagination, month selection, and Vietnamese copy unchanged unless a component migration requires a small accessibility-safe adjustment.
- Consolidate repeated UI behavior into app-level wrappers outside `src/components/ui/*`.
- Keep implementation incremental by migrating one surface at a time and verifying behavior after each group.

## Non-Goals

- No dashboard redesign.
- No new product features.
- No change to database schema or Prisma models.
- No change to API route contracts.
- No replacement of business logic, services, or validation rules.
- No app-wide shift to the default shadcn visual style.
- No direct edits to `src/components/ui/*` for MoneyMind-specific styling.

## Component Boundary

`src/components/ui/*` is the primitive layer. It contains shadcn-generated components such as:

- `Button`
- `Input`
- `Textarea`
- `Form`
- `Label`
- `Dialog`
- `AlertDialog`
- `Card`
- `Badge`
- `Table`
- `Tabs`
- `Select`
- `Combobox`
- `Pagination`
- `Empty`
- `Skeleton`
- `Tooltip`
- `Popover`
- `Command`
- `Calendar`

Feature code and shared app components may import these primitives directly.

MoneyMind-specific components live outside `src/components/ui/*`:

- `src/components/app-ui.tsx` owns app-level page primitives such as `PageHeader`, `SectionCard`, `MetricCard`, `InsightCard`, and `EmptyState`.
- `src/components/form-combobox.tsx` owns the app's combobox behavior and display contract.
- `src/components/form-date-picker.tsx` owns the app's `YYYY-MM-DD` date picker contract.
- `src/components/form-month-picker.tsx` owns the app's month-only `YYYY-MM` picker contract.
- `src/components/form-rhf-controls.tsx` owns React Hook Form adapters that connect custom controls to shadcn `Form`.

These app-level wrappers may contain MoneyMind colors, spacing, icons, formatting, Vietnamese labels, hidden inputs, and accessibility wiring. They are composition components, not generated primitives.

## Visual Direction

Use the current MoneyMind design as the baseline:

- Warm off-white backgrounds and cards.
- Green primary actions and positive states.
- Muted neutral borders.
- Existing rounded, calm finance-coach feel.
- Dashboard style remains the reference for other app pages.

The migration should reduce ad hoc markup without flattening the app into default shadcn styling. Prefer theme tokens from `src/app/globals.css` where practical, but preserving existing visual behavior is more important than mechanically removing every custom class.

## App Surfaces

The implementation should cover the current route surfaces:

- `/`
- `/login`
- `/signup`
- `/dashboard`
- `/transactions`
- `/budgets`
- `/categories`
- `/settings/ai`

It should also cover shared interactive surfaces:

- App shell and navigation.
- AI chat widget.
- AI transaction review modal.
- Shared page cards and empty states.
- Form controls and mutation actions.

Before implementation, rerun the route inventory on the current checkout. The list above reflects the current known surfaces, but the implementation plan should use the actual files present at that time.

## Migration Rules

For each surface:

1. Keep business logic and data fetching unchanged.
2. Replace native or handmade controls with shadcn primitives or app-level wrappers when a matching primitive exists.
3. Preserve visible copy, pending states, disabled states, validation messages, and toast behavior.
4. Preserve existing `aria-*` attributes, labels, roles, and keyboard behavior.
5. Keep component-specific MoneyMind styling outside `src/components/ui/*`.
6. Avoid broad rewrites of layout or product copy.
7. Prefer extending existing shared wrappers before creating new one-off wrappers.

## Forms

Forms should use the existing stack:

- `react-hook-form`
- `zod`
- `createZodResolver`
- shadcn `Form`, `FormField`, `FormItem`, `FormLabel`, `FormControl`, and `FormMessage`

Primitive form controls should use `Input`, `Textarea`, `Switch`, `Select`, `Checkbox`, or related shadcn components as appropriate.

Custom behavior should stay in wrappers:

- Combobox uses the existing Radix/shadcn `Popover + Command + Button` pattern and keeps its hidden form value where needed.
- Date picker keeps `YYYY-MM-DD`.
- Month picker keeps `YYYY-MM`.
- React Hook Form adapters keep `aria-describedby`, `aria-invalid`, ids, blur handling, and error connection intact.

Hidden inputs must not be treated as sufficient browser-side required validation. Validation remains controlled by React Hook Form and Zod.

## Dialogs And Confirmations

Use shadcn `Dialog` for modal workflows and `AlertDialog` for destructive confirmations.

Current mutation flows should stay intact:

- Show inline form validation with `FormMessage`.
- Show business or network errors in the existing Vietnamese wording.
- Use `sonner` toasts for mutation outcomes where the app already does so.
- Keep confirm dialogs keyboard-accessible and labeled.

## Navigation And Loading

The app shell should keep server-side session and data boundaries in `src/app/(app)/layout.tsx`.

Pathname-dependent active navigation belongs in `src/components/app-nav.tsx` or another small client component.

Do not add inline pending UI that makes the navigation flicker. Route-level loading through `src/app/(app)/loading.tsx` remains the preferred app-shell feedback pattern.

## Data Flow

This migration should not alter data flow:

- Dashboard data remains server-rendered through dashboard services.
- Transactions keep selected-month behavior and server-side pagination.
- Categories keep API-first CRUD and user-scoped data.
- Budgets keep category-budget service logic and selected-month behavior.
- AI provider settings remain browser-local through `localStorage`.
- AI request payloads keep carrying provider configuration from the client.
- AI chat and transaction review behavior stay unchanged.

Component migration must not change request shapes, response expectations, or route invalidation semantics.

## Error Handling

Keep the app's current error boundaries:

- Validation errors appear near fields through `FormMessage`.
- Mutation and network errors keep Vietnamese user-facing copy.
- Toast success messages fire only after the refresh or visible-state update succeeds.
- API and service errors are not hidden behind generic UI messages.
- Accessibility state such as `aria-invalid`, `aria-describedby`, and disabled/pending state must survive component replacement.

## Testing

Verification should include:

- `pnpm lint`
- `pnpm test --runInBand`

Focused UI tests should be updated only where markup roles or accessible names legitimately change because a shadcn primitive is replacing handmade markup. Behavior assertions should remain equivalent or stronger.

High-priority behavior to preserve:

- Login and signup validation/submission.
- AI settings local provider create, select, edit, delete, and validation.
- Transaction create/edit/delete, AI draft review, month filtering, and pagination.
- Category create/edit/delete and refresh behavior.
- Budget edit/delete and refresh behavior.
- Dashboard selected-month rendering and AI panels.
- App navigation active state and route-level loading behavior.

If implementation touches Next.js route, layout, loading, server component, or route handler behavior, read the relevant local Next.js docs under `node_modules/next/dist/docs/` before coding.

## Rollout Notes

Implementation should proceed in small groups:

1. Establish shared wrapper rules and migrate `app-ui` where shadcn primitives fit.
2. Normalize auth forms.
3. Normalize app shell and public page primitives.
4. Normalize dashboard shared cards and controls without redesigning the dashboard.
5. Normalize transactions, categories, budgets, and AI settings forms/actions.
6. Normalize AI chat and transaction review modal.
7. Run lint and tests.

Keep commits focused. Because the current worktree may already contain generated shadcn files and partial migrations, implementation should preserve existing user changes and avoid reverting unrelated files.
