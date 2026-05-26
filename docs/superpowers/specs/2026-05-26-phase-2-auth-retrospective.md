# MoneyMind AI Phase 2 Auth Retrospective

## Purpose

Phase 2 added the authentication runtime that was intentionally deferred from Phase 1. This document records the implemented design so `docs/superpowers` reflects the current project state before Phase 3 starts.

## Implemented Scope

Phase 2 includes:

- Better Auth email/password setup.
- Login, signup, and logout UI.
- Auth API route handler at `src/app/api/auth/[...all]/route.ts`.
- Server-side session helpers in `src/lib/auth-session.ts`.
- Protected app route group layout under `src/app/(app)/layout.tsx`.
- Default category creation after new user signup.
- A unit test covering the default category set and user-scoped row creation.

Phase 2 excludes:

- Transaction CRUD.
- Category management CRUD beyond default category provisioning.
- Dashboard aggregation.
- AI parsing, provider settings, and insights.
- Post-MVP features such as OCR, chat, budgets, recurring expenses, and export.

## Architecture

Authentication is centralized in `src/lib/auth.ts`. The Better Auth Prisma adapter uses the shared Prisma client from `src/lib/db.ts`, with PostgreSQL as the database provider.

App pages under `src/app/(app)` are protected by the layout. The layout reads the current session with `getCurrentSession()` and redirects unauthenticated users to `/login`.

Default categories are created through a Better Auth database hook after user creation. The default category list lives in `src/lib/default-categories.ts`, which keeps onboarding data independent from UI and route handlers.

## Data Flow

1. A visitor signs up through the signup form.
2. Better Auth creates the user and account records.
3. The user creation hook calls `ensureDefaultCategories(user.id)`.
4. The authenticated app layout uses the session cookie to load the current user.
5. Unauthenticated requests to app pages are redirected to `/login`.

## Error Handling

Phase 2 uses the default Better Auth responses for auth API failures. The app layout treats a missing session as an expected state and redirects to `/login`.

Default category provisioning uses `createMany` with `skipDuplicates` so repeated creation attempts do not violate the unique category constraint.

## Verification

Phase 2 is represented in git by:

- `a02a763 feat: add phase 2 auth`
- `6cd6abe Merge pull request #1 from hayashi13597/phase/2-auth`

Current verification entry points:

```bash
pnpm test
pnpm lint
pnpm build
pnpm db:validate
```

## Notes For Phase 3

Phase 3 should build on the existing session guard instead of adding a second auth mechanism. All transaction and category reads/writes must be scoped to the authenticated `userId`.

Default categories already exist for newly created users. Category CRUD should preserve those rows unless the user explicitly edits allowed fields.
