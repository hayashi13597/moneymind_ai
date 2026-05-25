# MoneyMind AI MVP Plan

## Summary

Build MVP as a modular monolith on the existing Next.js app:

- Next.js App Router.
- TypeScript.
- Tailwind CSS.
- shadcn/ui.
- PostgreSQL/Neon.
- Prisma.
- Better Auth email/password.
- Recharts.
- One OpenAI-compatible AI adapter using `baseUrl`, `apiKey`, and `model`.

MVP scope:

- Login.
- CRUD thu/chi.
- Category management.
- Monthly dashboard.
- AI auto-categorization.
- AI spending insight.

Deferred:

- OCR.
- AI chat.
- Budget alert.
- Recurring expenses.
- Export Excel/PDF.

## Architecture Direction

Use a modular monolith:

- Keep UI, API routes, domain services, AI adapter, and database access clearly separated.
- Use server-side session checks for all finance APIs.
- Keep user data isolated by authenticated `userId`.
- Store money amounts as integer VND.
- Keep AI provider integration behind one OpenAI-compatible adapter so OpenAI, OpenRouter, DeepSeek, and compatible gateways can share the same interface.

## Data Model Plan

Core Prisma models:

- `User`
- Better Auth session/account tables
- `Category`
- `Transaction`
- `AiProviderSetting`
- `AiInsight`

Default categories created per user:

- Thu nhập
- Ăn uống
- Cafe
- Mua sắm
- Di chuyển
- Nhà cửa
- Giải trí
- Sức khỏe
- Giáo dục
- Khác

Suggested transaction fields:

- `type`: `income` or `expense`
- `amount`: integer VND
- `categoryId`
- `note`
- `transactionDate`
- `merchant`
- `rawInput`
- `userId`

## Public Interfaces

Planned API routes:

- `GET /api/transactions`
- `POST /api/transactions`
- `GET /api/transactions/:id`
- `PATCH /api/transactions/:id`
- `DELETE /api/transactions/:id`
- `GET /api/categories`
- `POST /api/categories`
- `PATCH /api/categories/:id`
- `DELETE /api/categories/:id`
- `GET /api/dashboard/monthly?month=YYYY-MM`
- `GET /api/settings/ai`
- `PATCH /api/settings/ai`
- `POST /api/ai/parse-transaction`
- `POST /api/ai/monthly-insight`

AI provider contract:

- MVP supports OpenAI-compatible chat completions through configurable `baseUrl`, `apiKey`, and `model`.
- Gemini-native adapter is not included in MVP.

## Implementation Phases

### Phase 1: Foundation

- Add Prisma, Better Auth, shadcn/ui, Recharts, and AI client dependencies.
- Configure environment variables and validation.
- Create Prisma schema and initial migration.
- Add app shell and authenticated route structure.

### Phase 2: Auth And Onboarding

- Implement email/password sign up, login, and logout.
- Protect app pages and finance API routes.
- Create default categories for new users.

### Phase 3: Transactions And Categories

- Implement transaction CRUD.
- Implement category management.
- Add VND parsing helpers for inputs like `55k`, `18tr`, and `3.200.000đ`.

### Phase 4: Dashboard

- Add monthly aggregation service.
- Show income, expense, remaining balance, category breakdown, and month-over-month comparison.
- Render charts with Recharts.

### Phase 5: AI Categorization And Insight

- Add AI provider settings UI.
- Add OpenAI-compatible adapter.
- Implement transaction parsing endpoint.
- Implement monthly insight endpoint.
- Cache generated monthly insights in the database.

## Test Plan

- Unit tests for VND parsing:
  - `55k`
  - `18tr`
  - `3.200.000đ`
  - plain numbers
- Unit tests for monthly dashboard aggregation by month, type, and category.
- API tests for authenticated CRUD and user data isolation.
- AI tests with mocked provider responses for transaction parsing and monthly insight.
- E2E smoke flow:
  - sign up
  - add transaction manually
  - add transaction with AI parsing
  - view dashboard
  - generate monthly insight

## Assumptions

- Primary locale is Vietnamese with VND formatting.
- Production database target is Neon/Vercel Postgres; local development uses `DATABASE_URL`.
- Auth MVP is email/password only.
- Context7 docs lookup was blocked during planning by an invalid MCP API key, so implementation should re-check current docs before coding library-specific setup.

## Implementation Notes

- Keep MVP narrow. Do not add OCR, chat, budget alerts, recurring expenses, or export until the core transaction-dashboard-AI loop is working.
- Prefer small, testable domain services over placing business logic directly in page components.
- Follow existing Next.js project structure and add product modules incrementally.
