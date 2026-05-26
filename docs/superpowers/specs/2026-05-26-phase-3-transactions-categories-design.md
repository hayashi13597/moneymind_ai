# MoneyMind AI Phase 3 Transactions And Categories Design

## Purpose

Phase 3 turns the authenticated shell into a usable money-tracking workflow. Users can manage income and expense transactions, maintain their categories, and enter Vietnamese VND amounts in common shorthand formats.

This phase is the data foundation for the Phase 4 dashboard and Phase 5 AI parsing flow.

## Scope

Phase 3 includes:

- Transaction CRUD for authenticated users.
- Category CRUD for authenticated users.
- API Route Handlers for the planned transaction and category endpoints.
- Server-rendered transaction and category pages backed by real data.
- VND amount parsing helpers for inputs such as `55k`, `18tr`, `3.200.000đ`, and plain numbers.
- Validation for transaction type, amount, date, note, merchant, raw input, and category ownership.
- Focused tests for VND parsing and domain validation.
- Documentation sync for missing Phase 2 context and Phase 3 design/plan/verification.

Phase 3 excludes:

- Monthly dashboard aggregation and charts.
- AI transaction parsing.
- AI provider settings.
- AI monthly insight generation.
- Budget alerts, recurring expenses, OCR, chat, and export.

## Recommended Approach

Use an API-first CRUD design with small domain services.

This keeps Phase 3 aligned with the API routes already planned in `PLAN.md`, gives Phase 4 and Phase 5 stable contracts to build on, and makes ownership checks easier to test. Server Actions can still be introduced later for specific form ergonomics, but they should not replace the public MVP API surface in this phase.

## Architecture

MoneyMind AI remains a modular monolith using the Next.js App Router.

Phase 3 should add focused modules for categories and transactions:

- Validation schemas for API payloads and form data.
- Domain services that receive `userId` explicitly and perform Prisma operations.
- Route handlers that authenticate the request, validate input, call services, and return JSON.
- Page components that load authenticated user data server-side and render compact CRUD workflows.
- Shared money helpers for VND parsing and formatting.

Route handlers should use `Response.json()` and Web request APIs, following the local Next.js Route Handler docs. They should not use Pages Router API routes.

## Public API

Implement these endpoints:

- `GET /api/transactions`
- `POST /api/transactions`
- `GET /api/transactions/:id`
- `PATCH /api/transactions/:id`
- `DELETE /api/transactions/:id`
- `GET /api/categories`
- `POST /api/categories`
- `PATCH /api/categories/:id`
- `DELETE /api/categories/:id`

Endpoint responses should be small and predictable. A successful collection response returns a top-level array key such as `transactions` or `categories`. A successful single-resource response returns `transaction` or `category`.

Expected API errors should return JSON with:

```json
{
  "error": "Human readable Vietnamese message"
}
```

Use HTTP status codes consistently:

- `401` for missing session.
- `400` for invalid payloads or query params.
- `404` for resources outside the current user's scope or missing resources.
- `409` for category delete conflicts when transactions still reference the category.

## Data Rules

All reads and writes must be scoped by authenticated `userId`.

Transactions:

- `type` is `income` or `expense`.
- `amount` is a positive integer VND value.
- `categoryId` must belong to the user.
- If the selected category has a non-null type, it must match the transaction type.
- `note` is required and trimmed.
- `merchant` and `rawInput` are optional trimmed strings.
- `transactionDate` is required and stored as a `Date`.

Categories:

- `name` is required and trimmed.
- `type` is `income`, `expense`, or null only if the UI needs a cross-type category. The MVP default categories use explicit types.
- `color` and `icon` are optional metadata strings.
- Category uniqueness follows the existing Prisma constraint: `userId`, `name`, and `type`.
- Deleting a category with linked transactions should fail with `409`; reassigning transactions is outside Phase 3.

## VND Parsing

Create a dedicated helper for VND input parsing.

Supported inputs:

- `55k` -> `55000`
- `18tr` -> `18000000`
- `3.200.000đ` -> `3000000`
- `3000000` -> `3000000`
- `3 triệu` -> `3000000` if this can be added without broad natural-language parsing.

Invalid inputs should not silently become `0`. Return a validation failure for empty, negative, zero, ambiguous, or non-numeric values.

This helper should be pure and covered by unit tests.

## UI

The transactions page should become the daily money-entry workspace:

- A transaction creation form with type, amount, category, date, note, and optional merchant/raw input.
- A transaction list sorted by newest transaction date first.
- Inline or compact edit/delete affordances.
- VND-formatted amounts and Vietnamese labels.

The categories page should become a compact management view:

- Existing categories grouped or filterable by income/expense.
- Create category form.
- Edit category metadata.
- Delete action that clearly handles "category is in use" conflicts.

The UI should remain utilitarian and data-dense. It should not become a marketing page or dashboard replacement.

## Error Handling

Expected errors should be modeled as returned values in UI state and JSON responses in API handlers.

Examples:

- Invalid amount: `Số tiền không hợp lệ.`
- Missing category: `Không tìm thấy danh mục.`
- Category type mismatch: `Danh mục không khớp loại giao dịch.`
- Delete conflict: `Không thể xóa danh mục đang có giao dịch.`

Unexpected server errors can return a generic Vietnamese message while logging the underlying error server-side if a logging pattern exists.

## Testing Strategy

Add focused tests for:

- VND parsing:
  - `55k`
  - `18tr`
  - `3.200.000đ`
  - plain numbers
  - invalid input
- Category row validation and type handling.
- Transaction payload validation and category/type mismatch behavior.

If a test database is available, add service/API tests for:

- Authenticated CRUD.
- User data isolation.
- Category delete conflict.

If no test database is available in this environment, keep the domain services small and record the database-test limitation in the Phase 3 verification document.

## Documentation Sync

Because Phase 2 was implemented without matching `docs/superpowers` records, Phase 3 should first add a Phase 2 retrospective document. Then Phase 3 should add:

- This design spec.
- A detailed implementation plan.
- A verification document after implementation.

The docs are additive. They should not rewrite existing Phase 1 documents or alter git history.

## Success Criteria

Phase 3 succeeds when:

- Authenticated users can create, view, update, and delete their own transactions.
- Authenticated users can create, view, update, and delete eligible categories.
- Users cannot read or mutate another user's transactions or categories.
- VND shorthand inputs parse correctly and invalid values are rejected.
- The transactions and categories pages no longer show placeholders.
- `pnpm test`, `pnpm lint`, `pnpm build`, and `pnpm db:validate` have been run, with any environment blockers documented.
