# Phase 1 Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the technical foundation for MoneyMind AI with PostgreSQL-first Prisma, route groups, placeholder app shell, and verification commands, without implementing auth runtime, CRUD, dashboard logic, or AI settings.

**Architecture:** Keep the app as a modular monolith using the Next.js App Router. Phase 1 adds infrastructure boundaries in `src/lib`, persistence schema in `prisma/schema.prisma`, and placeholder routes under route groups so later phases can add real workflows without reshaping the app.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Tailwind CSS 4, shadcn/ui, Prisma, PostgreSQL, Better Auth dependency readiness, Recharts dependency readiness, Zod.

---

## Pre-Execution Notes

- Work on branch `phase/1-foundation`. If executing from another branch, run `git switch phase/1-foundation` before editing.
- The design spec is `docs/superpowers/specs/2026-05-26-phase-1-foundation-design.md`.
- Context7 docs lookup for Prisma, Better Auth, and Recharts failed during planning because the configured API key is invalid. Before execution, retry Context7 if the key is fixed. Next.js local docs were checked in `node_modules/next/dist/docs/01-app/01-getting-started/02-project-structure.md`, `03-layouts-and-pages.md`, and `02-guides/environment-variables.md`.
- Do not implement login/signup runtime, transaction CRUD, dashboard aggregation, AI adapter, AI provider settings, OCR, chat, budget alerts, recurring expenses, or export.

## File Structure

Files to create:

- `.env.example`: documents `DATABASE_URL` and future auth variables without committing secrets.
- `prisma/schema.prisma`: PostgreSQL schema for users, Better Auth-compatible tables, categories, transactions, and monthly insight cache.
- `src/lib/env.ts`: server-side environment validation for `DATABASE_URL`.
- `src/lib/db.ts`: Prisma Client singleton for server code.
- `src/app/(public)/page.tsx`: public landing placeholder at `/`.
- `src/app/(auth)/login/page.tsx`: login placeholder at `/login`.
- `src/app/(auth)/signup/page.tsx`: signup placeholder at `/signup`.
- `src/app/(app)/layout.tsx`: authenticated-area shell placeholder, no session enforcement.
- `src/app/(app)/dashboard/page.tsx`: dashboard placeholder.
- `src/app/(app)/transactions/page.tsx`: transactions placeholder for shell navigation.
- `src/app/(app)/categories/page.tsx`: categories placeholder for shell navigation.

Files to modify:

- `.gitignore`: allow `.env.example` and ignore `.superpowers/`.
- `package.json`: add foundation dependencies and Prisma scripts.
- `src/app/layout.tsx`: set Vietnamese locale and metadata.
- `src/app/page.tsx`: remove after `src/app/(public)/page.tsx` is created, because both would define `/`.

Generated files:

- `prisma/migrations/<timestamp>_init/migration.sql`: created by `pnpm prisma migrate dev --name init` when `DATABASE_URL` points to a working PostgreSQL database.
- `pnpm-lock.yaml`: updated by `pnpm install` or `pnpm add`.

## Task 1: Branch And Repository Hygiene

**Files:**
- Modify: `.gitignore`

- [ ] **Step 1: Confirm branch and working tree**

Run:

```bash
git branch --show-current
git status --short
```

Expected:

```text
phase/1-foundation
?? .superpowers/
```

If the branch is not `phase/1-foundation`, run:

```bash
git switch phase/1-foundation
```

- [ ] **Step 2: Update `.gitignore`**

Modify `.gitignore` so the env section and local tooling section include:

```gitignore
# env files (can opt-in for committing if needed)
.env*
!.env.example

# local agent/tooling artifacts
.superpowers/
```

Keep the existing ignore entries intact.

- [ ] **Step 3: Verify ignore behavior**

Run:

```bash
git status --short
git check-ignore -v .superpowers/brainstorm || true
git check-ignore -v .env.example || true
```

Expected:

```text
 M .gitignore
.gitignore:<line>:.superpowers/	.superpowers/brainstorm
```

The `.env.example` command should print nothing because `.env.example` must be trackable.

- [ ] **Step 4: Commit repository hygiene**

Run:

```bash
git add .gitignore
git commit -m "chore: prepare phase 1 branch hygiene"
```

Expected: commit succeeds with only `.gitignore`.

## Task 2: Install Foundation Dependencies

**Files:**
- Modify: `package.json`
- Modify: `pnpm-lock.yaml`

- [ ] **Step 1: Install runtime dependencies**

Run:

```bash
pnpm add @prisma/client better-auth recharts zod
```

Expected: `package.json` includes these dependencies and `pnpm-lock.yaml` changes.

- [ ] **Step 2: Install Prisma CLI**

Run:

```bash
pnpm add -D prisma
```

Expected: `package.json` includes `prisma` under `devDependencies`.

- [ ] **Step 3: Add Prisma scripts**

Modify `package.json` scripts to include:

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint",
    "db:validate": "prisma validate",
    "db:migrate": "prisma migrate dev"
  }
}
```

Preserve the rest of `package.json`.

- [ ] **Step 4: Verify package metadata**

Run:

```bash
pnpm install --lockfile-only
pnpm db:validate
```

Expected for `pnpm db:validate` before schema exists:

```text
Error: Could not find Prisma Schema
```

This failure is expected in this task because the schema is created in Task 3.

- [ ] **Step 5: Commit dependencies**

Run:

```bash
git add package.json pnpm-lock.yaml
git commit -m "chore: add foundation dependencies"
```

Expected: commit succeeds with dependency and lockfile changes.

## Task 3: Add Environment Contract

**Files:**
- Create: `.env.example`
- Create: `src/lib/env.ts`

- [ ] **Step 1: Create `.env.example`**

Create `.env.example` with exactly:

```dotenv
# PostgreSQL connection string used by Prisma.
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/money_mind_ai?schema=public"

# Reserved for Phase 2 Better Auth runtime setup.
BETTER_AUTH_SECRET="replace-with-a-strong-secret"
BETTER_AUTH_URL="http://localhost:3000"
```

- [ ] **Step 2: Create `src/lib/env.ts`**

Create `src/lib/env.ts`:

```ts
import { z } from "zod";

const serverEnvSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
});

export function getServerEnv() {
  return serverEnvSchema.parse({
    DATABASE_URL: process.env.DATABASE_URL,
  });
}
```

- [ ] **Step 3: Type-check the env helper**

Run:

```bash
pnpm lint
```

Expected: lint passes, or only reports existing unrelated issues. If lint reports formatting or quote issues in `src/lib/env.ts`, fix the file and rerun `pnpm lint`.

- [ ] **Step 4: Commit env contract**

Run:

```bash
git add .env.example src/lib/env.ts
git commit -m "chore: add server environment contract"
```

Expected: commit succeeds with `.env.example` and `src/lib/env.ts`.

## Task 4: Add Prisma Schema And Client

**Files:**
- Create: `prisma/schema.prisma`
- Create: `src/lib/db.ts`

- [ ] **Step 1: Create `prisma/schema.prisma`**

Create `prisma/schema.prisma`:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum TransactionType {
  income
  expense
}

model User {
  id            String        @id @default(cuid())
  name          String?
  email         String        @unique
  emailVerified Boolean       @default(false)
  image         String?
  createdAt     DateTime      @default(now())
  updatedAt     DateTime      @updatedAt

  accounts      Account[]
  sessions      Session[]
  categories    Category[]
  transactions  Transaction[]
  aiInsights    AiInsight[]

  @@map("user")
}

model Account {
  id                    String    @id @default(cuid())
  accountId             String
  providerId            String
  userId                String
  accessToken           String?
  refreshToken          String?
  idToken               String?
  accessTokenExpiresAt  DateTime?
  refreshTokenExpiresAt DateTime?
  scope                 String?
  password              String?
  createdAt             DateTime  @default(now())
  updatedAt             DateTime  @updatedAt

  user                  User      @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@map("account")
}

model Session {
  id        String   @id @default(cuid())
  expiresAt DateTime
  token     String   @unique
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  ipAddress String?
  userAgent String?
  userId    String

  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@map("session")
}

model Verification {
  id         String   @id @default(cuid())
  identifier String
  value      String
  expiresAt  DateTime
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  @@index([identifier])
  @@map("verification")
}

model Category {
  id           String          @id @default(cuid())
  userId       String
  name         String
  type         TransactionType?
  color        String?
  icon         String?
  isDefault    Boolean         @default(false)
  createdAt    DateTime        @default(now())
  updatedAt    DateTime        @updatedAt

  user         User            @relation(fields: [userId], references: [id], onDelete: Cascade)
  transactions Transaction[]

  @@unique([userId, name, type])
  @@index([userId])
}

model Transaction {
  id              String          @id @default(cuid())
  userId          String
  categoryId      String
  type            TransactionType
  amount          Int
  note            String
  merchant        String?
  rawInput        String?
  transactionDate DateTime
  createdAt       DateTime        @default(now())
  updatedAt       DateTime        @updatedAt

  user            User            @relation(fields: [userId], references: [id], onDelete: Cascade)
  category        Category        @relation(fields: [categoryId], references: [id], onDelete: Restrict)

  @@index([userId, transactionDate])
  @@index([userId, categoryId])
  @@index([userId, type])
}

model AiInsight {
  id        String   @id @default(cuid())
  userId    String
  month     String
  content   String
  metadata  Json?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, month])
  @@index([userId])
}
```

- [ ] **Step 2: Create `src/lib/db.ts`**

Create `src/lib/db.ts`:

```ts
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}
```

- [ ] **Step 3: Validate Prisma schema**

Run:

```bash
pnpm db:validate
```

Expected:

```text
The schema at prisma/schema.prisma is valid
```

- [ ] **Step 4: Generate Prisma client**

Run:

```bash
pnpm prisma generate
```

Expected: Prisma Client is generated successfully.

- [ ] **Step 5: Commit Prisma foundation**

Run:

```bash
git add prisma/schema.prisma src/lib/db.ts pnpm-lock.yaml
git commit -m "chore: add prisma foundation"
```

Expected: commit succeeds with schema, db helper, and any lockfile/client generation metadata changes. Do not commit `node_modules`.

## Task 5: Add Route Groups And App Shell

**Files:**
- Create: `src/app/(public)/page.tsx`
- Create: `src/app/(auth)/login/page.tsx`
- Create: `src/app/(auth)/signup/page.tsx`
- Create: `src/app/(app)/layout.tsx`
- Create: `src/app/(app)/dashboard/page.tsx`
- Create: `src/app/(app)/transactions/page.tsx`
- Create: `src/app/(app)/categories/page.tsx`
- Modify: `src/app/layout.tsx`
- Delete: `src/app/page.tsx`

- [ ] **Step 1: Update root layout metadata and locale**

Modify `src/app/layout.tsx` to:

```tsx
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "MoneyMind AI",
  description: "Ứng dụng quản lý thu chi cá nhân với phân tích tài chính bằng AI.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="vi"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
```

- [ ] **Step 2: Create public page**

Create `src/app/(public)/page.tsx`:

```tsx
import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function PublicHomePage() {
  return (
    <main className="flex min-h-screen flex-col bg-background text-foreground">
      <section className="mx-auto flex w-full max-w-5xl flex-1 flex-col justify-center gap-8 px-6 py-16">
        <div className="max-w-2xl space-y-4">
          <p className="text-sm font-medium text-muted-foreground">MoneyMind AI</p>
          <h1 className="text-4xl font-semibold tracking-normal sm:text-5xl">
            Quản lý thu chi cá nhân bằng tiếng Việt.
          </h1>
          <p className="text-base leading-7 text-muted-foreground sm:text-lg">
            Nền tảng MVP sẽ tập trung vào nhập giao dịch, dashboard tháng và insight tài chính sau khi các phase tiếp theo hoàn tất.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button asChild>
            <Link href="/dashboard">Vào ứng dụng</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/login">Đăng nhập</Link>
          </Button>
        </div>
      </section>
    </main>
  );
}
```

- [ ] **Step 3: Create auth placeholders**

Create `src/app/(auth)/login/page.tsx`:

```tsx
import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6 py-12">
      <section className="w-full max-w-sm space-y-5">
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">MoneyMind AI</p>
          <h1 className="text-2xl font-semibold tracking-normal">Đăng nhập</h1>
          <p className="text-sm leading-6 text-muted-foreground">
            Form đăng nhập sẽ được triển khai trong Phase 2.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/">Quay lại trang chủ</Link>
        </Button>
      </section>
    </main>
  );
}
```

Create `src/app/(auth)/signup/page.tsx`:

```tsx
import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function SignupPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6 py-12">
      <section className="w-full max-w-sm space-y-5">
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">MoneyMind AI</p>
          <h1 className="text-2xl font-semibold tracking-normal">Tạo tài khoản</h1>
          <p className="text-sm leading-6 text-muted-foreground">
            Form đăng ký sẽ được triển khai trong Phase 2.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/">Quay lại trang chủ</Link>
        </Button>
      </section>
    </main>
  );
}
```

- [ ] **Step 4: Create app shell layout**

Create `src/app/(app)/layout.tsx`:

```tsx
import Link from "next/link";

const navItems = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/transactions", label: "Giao dịch" },
  { href: "/categories", label: "Danh mục" },
] as const;

export default function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b bg-card">
        <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between px-4">
          <Link href="/dashboard" className="text-sm font-semibold">
            MoneyMind AI
          </Link>
          <nav className="flex items-center gap-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl px-4 py-8">{children}</main>
    </div>
  );
}
```

- [ ] **Step 5: Create app placeholders**

Create `src/app/(app)/dashboard/page.tsx`:

```tsx
export default function DashboardPage() {
  return (
    <section className="space-y-3">
      <p className="text-sm font-medium text-muted-foreground">Dashboard</p>
      <h1 className="text-2xl font-semibold tracking-normal">Tổng quan tháng</h1>
      <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
        Dashboard tài chính sẽ hiển thị thu nhập, chi tiêu, số dư, phân bổ danh mục và so sánh tháng trong Phase 4.
      </p>
    </section>
  );
}
```

Create `src/app/(app)/transactions/page.tsx`:

```tsx
export default function TransactionsPage() {
  return (
    <section className="space-y-3">
      <p className="text-sm font-medium text-muted-foreground">Giao dịch</p>
      <h1 className="text-2xl font-semibold tracking-normal">Thu chi hằng ngày</h1>
      <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
        CRUD giao dịch và nhập bằng ngôn ngữ tự nhiên sẽ được triển khai trong Phase 3.
      </p>
    </section>
  );
}
```

Create `src/app/(app)/categories/page.tsx`:

```tsx
export default function CategoriesPage() {
  return (
    <section className="space-y-3">
      <p className="text-sm font-medium text-muted-foreground">Danh mục</p>
      <h1 className="text-2xl font-semibold tracking-normal">Phân loại thu chi</h1>
      <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
        Quản lý danh mục và danh mục mặc định theo người dùng sẽ được triển khai trong Phase 3.
      </p>
    </section>
  );
}
```

- [ ] **Step 6: Remove duplicate root page**

Delete `src/app/page.tsx` because `src/app/(public)/page.tsx` now owns `/`.

Run:

```bash
rm src/app/page.tsx
```

- [ ] **Step 7: Verify routes compile**

Run:

```bash
pnpm lint
pnpm build
```

Expected: both commands pass. If `pnpm build` fails because Prisma has not generated client types, rerun `pnpm prisma generate`, then rerun `pnpm build`.

- [ ] **Step 8: Commit route shell**

Run:

```bash
git add src/app
git commit -m "feat: add phase 1 route shell"
```

Expected: commit succeeds with route group and layout changes.

## Task 6: Create Initial PostgreSQL Migration

**Files:**
- Create: `prisma/migrations/<timestamp>_init/migration.sql`

- [ ] **Step 1: Confirm database configuration**

Run:

```bash
test -n "$DATABASE_URL" && echo "DATABASE_URL is set" || echo "DATABASE_URL is missing"
```

Expected with local PostgreSQL configured:

```text
DATABASE_URL is set
```

Expected without local PostgreSQL configured:

```text
DATABASE_URL is missing
```

- [ ] **Step 2: Run migration when database is available**

If `DATABASE_URL` is set and points to a running PostgreSQL database, run:

```bash
pnpm prisma migrate dev --name init
```

Expected:

```text
Your database is now in sync with your schema.
```

Prisma should create `prisma/migrations/<timestamp>_init/migration.sql`.

- [ ] **Step 3: Record migration blocker when database is unavailable**

If `DATABASE_URL` is missing or PostgreSQL is not reachable, do not switch to SQLite. Create `docs/superpowers/plans/2026-05-26-phase-1-foundation-verification.md` with:

````markdown
# Phase 1 Foundation Verification

## Migration

`pnpm prisma migrate dev --name init` was not run because `DATABASE_URL` was not set to a reachable PostgreSQL database in this environment.

The project remains PostgreSQL-first. Run the migration after configuring `DATABASE_URL`, for example:

```bash
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/money_mind_ai?schema=public" pnpm prisma migrate dev --name init
```
````

- [ ] **Step 4: Validate schema after migration decision**

Run:

```bash
pnpm db:validate
```

Expected:

```text
The schema at prisma/schema.prisma is valid
```

- [ ] **Step 5: Commit migration or verification note**

If migration succeeded, run:

```bash
git add prisma/migrations prisma/schema.prisma
git commit -m "chore: add initial database migration"
```

If migration was blocked, run:

```bash
git add docs/superpowers/plans/2026-05-26-phase-1-foundation-verification.md
git commit -m "docs: record phase 1 migration blocker"
```

Expected: one commit records the migration result.

## Task 7: Final Verification And Handoff

**Files:**
- Modify: `README.md`
- Modify: `docs/superpowers/plans/2026-05-26-phase-1-foundation-verification.md` if it already exists from Task 6

- [ ] **Step 1: Update README development section**

Modify `README.md` development commands to include:

````markdown
Run lint:

```bash
pnpm lint
```

Validate Prisma schema:

```bash
pnpm db:validate
```

Run the initial PostgreSQL migration after setting `DATABASE_URL`:

```bash
pnpm prisma migrate dev --name init
```
````

Keep the existing project links and `pnpm dev` instructions.

- [ ] **Step 2: Run final verification**

Run:

```bash
pnpm lint
pnpm db:validate
pnpm build
git status --short
```

Expected:

```text
The schema at prisma/schema.prisma is valid
```

`pnpm lint` and `pnpm build` should pass. `git status --short` should show only the README change and any intentionally uncommitted migration verification note.

- [ ] **Step 3: Commit README verification docs**

Run:

```bash
git add README.md docs/superpowers/plans/2026-05-26-phase-1-foundation-verification.md
git commit -m "docs: document phase 1 foundation commands"
```

If the verification note file does not exist because migration succeeded, run:

```bash
git add README.md
git commit -m "docs: document phase 1 foundation commands"
```

Expected: commit succeeds.

- [ ] **Step 4: Confirm final branch state**

Run:

```bash
git status --short
git log --oneline --decorate -6
```

Expected: working tree is clean except ignored `.superpowers/`; latest commits are on `phase/1-foundation`.

## Self-Review Checklist

- Spec coverage: Tasks cover dependencies, env contract, Prisma schema, DB helper, route groups, app shell, verification, and migration handling.
- Scope guard: No task implements auth runtime, CRUD, dashboard aggregation, AI settings, AI adapter, OCR, chat, budget alerts, recurring expenses, or export.
- Placeholder scan: The plan contains no `TBD`, `TODO`, or incomplete sections.
- Type consistency: Prisma enum values are `income` and `expense`; route links match created pages; `getServerEnv` and `db` are defined before any future consumer uses them.
- Branch policy: Further commits for this phase happen on `phase/1-foundation`.
