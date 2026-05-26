# MoneyMind AI

MoneyMind AI is a personal finance app for tracking income and expenses, using AI to categorize transactions and generate spending insights.

Project documentation:

- [PROJECT_CONTEXT.md](PROJECT_CONTEXT.md) - product context, core idea, user flows, and scope.
- [PLAN.md](PLAN.md) - MVP implementation plan, architecture, APIs, and test plan.

## Development

Install dependencies:

```bash
pnpm install
```

Run the development server:

```bash
pnpm dev
```

Run lint:

```bash
pnpm lint
```

Validate Prisma schema:

```bash
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/money_mind_ai?schema=public" pnpm db:validate
```

Run the initial PostgreSQL migration after setting `DATABASE_URL`:

```bash
pnpm prisma migrate dev --name init
```
