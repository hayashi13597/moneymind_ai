# MoneyMind AI Phase 1 Foundation Design

## Purpose

Phase 1 establishes the technical foundation for MoneyMind AI without implementing the product workflows yet. The goal is to give Phase 2 a stable Next.js, Prisma, PostgreSQL, and route structure to build on.

## Scope

Phase 1 includes:

- Foundation dependencies for Prisma/PostgreSQL, Better Auth readiness, Recharts readiness, and environment validation.
- PostgreSQL database contract through `DATABASE_URL`.
- Prisma schema for core MVP persistence.
- Route groups for public, auth, and app areas.
- A minimal authenticated-app shell placeholder.
- Vietnamese locale metadata and app language.
- Verification that the app and schema remain valid.

Phase 1 excludes:

- Login, signup, logout, and runtime session enforcement.
- Transaction CRUD.
- Category management UI or APIs.
- Dashboard aggregation and charts.
- AI transaction parsing, AI provider settings, and AI insights generation.
- Receipt OCR, AI chat, budget alerts, recurring expenses, and export.

## Recommended Approach

Use the "foundation tối thiểu, chắc nền" approach:

- Put the architectural rails in place now.
- Avoid implementing user-facing workflows before auth and domain logic are designed.
- Keep Phase 1 narrow enough that the work can be verified by build, lint, and Prisma validation.

This matches the selected constraints:

- Phase 1 is technical foundation only.
- Local and production database direction is PostgreSQL from the start.
- AI settings are deferred to Phase 5.
- Auth route structure is created, but Better Auth runtime is not wired yet.

## Architecture

MoneyMind AI remains a modular monolith using the Next.js App Router.

The foundation should keep responsibilities separated:

- `src/app`: route groups, layouts, and pages.
- `src/lib`: shared infrastructure helpers such as environment validation and Prisma client access.
- Future feature modules: transactions, categories, dashboard, and AI can be added when their phases begin.

Phase 1 should not create empty abstractions just to reserve names. Skeleton files are useful only where they support routing, shared infrastructure, or schema setup.

## Route Structure

The App Router should be organized around public, auth, and authenticated app areas:

- `src/app/(public)/page.tsx`: public MoneyMind AI entry page.
- `src/app/(auth)/login/page.tsx`: login placeholder.
- `src/app/(auth)/signup/page.tsx`: signup placeholder.
- `src/app/(app)/layout.tsx`: app shell placeholder, with no session check yet.
- `src/app/(app)/dashboard/page.tsx`: dashboard placeholder.
- Optional placeholders for `transactions` and `categories` may be added if they support shell navigation.

The root layout should use `lang="vi"` because Vietnamese is the primary locale. Metadata should include a concise Vietnamese description.

The app shell navigation should stay minimal:

- Dashboard
- Giao dịch
- Danh mục
- Cài đặt

`Cài đặt` can remain a placeholder. AI provider settings are not part of Phase 1.

## Data Model

Use PostgreSQL through Prisma. Money amounts are stored as integer VND.

Core schema models:

- `User`: application user record compatible with the later Better Auth setup.
- Auth-related tables: account, session, and verification tables needed for Better Auth in Phase 2.
- `Category`: belongs to a user and stores `name`, optional transaction type classification, visual metadata such as `color` and `icon`, `isDefault`, and timestamps.
- `Transaction`: belongs to a user, links to a category, and stores `type`, `amount`, `note`, `merchant`, `rawInput`, `transactionDate`, and timestamps.
- `AiInsight`: stores future monthly insight cache by user and month, with content and minimal metadata.

Do not add `AiProviderSetting` in Phase 1. Provider configuration belongs to Phase 5.

## Environment Contract

Phase 1 should document and validate the database contract:

- `DATABASE_URL` is required for Prisma/database access.

Better Auth environment variables may be listed in `.env.example` as Phase 2 preparation, but Phase 1 code should not require them at runtime if auth is not wired.

AI environment variables should not be introduced in Phase 1.

Environment validation should live in a small server-side helper such as `src/lib/env.ts`. It should produce clear errors when required variables are missing, while avoiding unnecessary crashes in static placeholder pages that do not touch the database.

## Infrastructure Boundaries

Use a Prisma singleton helper such as `src/lib/db.ts` to avoid repeated client creation during development hot reload.

Do not add generic API wrappers yet. There are no business APIs in Phase 1, and shared API abstractions should be introduced when Phase 2 adds authenticated endpoints.

Placeholder UI should not import the database directly.

Business/domain helpers should wait until the relevant phase adds real behavior and tests.

## Error Handling

Phase 1 error handling is limited to foundation concerns:

- Clear environment validation errors for missing database configuration.
- Valid Prisma schema errors surfaced through Prisma validation.
- Default Next.js error handling is acceptable for placeholder pages.

Custom API error types, AI adapter errors, and domain validation errors are out of scope for Phase 1.

## Verification

Phase 1 should be considered complete when:

- The app route placeholders render and the Next.js app builds.
- `pnpm lint` passes.
- `pnpm prisma validate` passes.
- The initial Prisma migration is created if a local PostgreSQL-compatible `DATABASE_URL` is available.
- If no database is available, the schema and `.env.example` still document the contract, and the migration limitation is recorded.

Recommended commands:

```bash
pnpm lint
pnpm build
pnpm prisma validate
pnpm prisma migrate dev --name init
```

`pnpm prisma migrate dev --name init` depends on a working PostgreSQL database. If it cannot run locally, Phase 1 should not switch to SQLite; it should keep the PostgreSQL contract and report the blocker.

## Testing Strategy

Do not add a test framework only for placeholders in Phase 1.

Automated tests should begin when business logic exists:

- VND parsing tests in the transactions phase.
- Monthly aggregation tests in the dashboard phase.
- Authenticated CRUD and user data isolation tests in the transactions/categories phases.
- Mocked AI provider tests in the AI phase.
- E2E smoke coverage after the core transaction-dashboard-AI loop exists.

## Success Criteria

Phase 1 succeeds when the project has:

- A PostgreSQL-first Prisma foundation.
- A clear environment contract.
- A route structure ready for auth and app pages.
- A minimal app shell for the authenticated area.
- No AI settings, transaction CRUD, dashboard logic, or auth runtime beyond placeholders.
- Verification notes showing what passed and whether migration required a database.
