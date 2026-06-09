# Forgot Password Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a production-ready forgot-password flow using Better Auth password reset and Resend transactional email.

**Architecture:** Better Auth remains the source of truth for reset tokens and password updates. Resend is isolated behind a small email helper and password-reset email template. The UI adds two public auth pages, `/forgot-password` and `/reset-password`, built with the existing React Hook Form, Zod, and shadcn form patterns.

**Tech Stack:** Next.js App Router, React 19, Better Auth, Resend Node SDK, React Hook Form, Zod, Jest/jsdom.

## Reference Docs

- Better Auth email/password reset docs: https://www.better-auth.com/docs/authentication/email-password
- Better Auth options reference: https://www.better-auth.com/docs/reference/options
- Resend Node SDK docs: https://resend.com/docs/send-with-nodejs
- Local Next.js docs already checked:
  - `node_modules/next/dist/docs/01-app/01-getting-started/03-layouts-and-pages.md`
  - `node_modules/next/dist/docs/01-app/01-getting-started/04-linking-and-navigating.md`

Before editing Better Auth, Resend, or Next.js route/search-param code, refresh the exact current docs with Context7 or the local Next.js docs required by `AGENTS.md`.

## Task 1: Add Resend Dependency And Env Contract

**Files:**

- Modify: `package.json`
- Modify: `pnpm-lock.yaml`
- Modify: `.env.example`
- Modify: `src/lib/env.ts`

**Step 1: Install Resend**

Run:

```bash
rtk pnpm add resend
```

Expected: `package.json` contains `resend`, and `pnpm-lock.yaml` is updated.

**Step 2: Add email env helper**

Modify `src/lib/env.ts` to keep existing `getServerEnv()` unchanged for boot-time auth config and add a separate email env parser that is only called when sending reset email.

Expected shape:

```ts
import { z } from "zod";

const serverEnvSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  BETTER_AUTH_SECRET: z
    .string()
    .min(32, "BETTER_AUTH_SECRET must be at least 32 characters"),
  BETTER_AUTH_URL: z.url("BETTER_AUTH_URL must be a valid URL"),
});

const emailEnvSchema = z.object({
  RESEND_API_KEY: z.string().min(1, "RESEND_API_KEY is required"),
  EMAIL_FROM: z.string().min(1, "EMAIL_FROM is required"),
});

export function getServerEnv() {
  return serverEnvSchema.parse({
    DATABASE_URL: process.env.DATABASE_URL,
    BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET,
    BETTER_AUTH_URL: process.env.BETTER_AUTH_URL,
  });
}

export function getEmailEnv() {
  return emailEnvSchema.parse({
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    EMAIL_FROM: process.env.EMAIL_FROM,
  });
}
```

Do not add `RESEND_API_KEY` and `EMAIL_FROM` to `getServerEnv()` because that would make normal app boot fail before anyone uses the reset-email feature.

**Step 3: Update example env**

Append to `.env.example`:

```dotenv
RESEND_API_KEY=
EMAIL_FROM="MoneyMind AI <no-reply@example.com>"
```

**Step 4: Verify install and type shape**

Run:

```bash
rtk pnpm exec tsc --noEmit
```

Expected: no new TypeScript error caused by `src/lib/env.ts`. If the repo still has a pre-existing unrelated TypeScript error, record it and continue only if the changed files are type-safe.

**Step 5: Commit**

Run:

```bash
rtk git add package.json pnpm-lock.yaml .env.example src/lib/env.ts
rtk git commit -m "chore: add resend email configuration"
```

## Task 2: Add Password Reset Email Template

**Files:**

- Create: `src/lib/email/templates/password-reset.ts`
- Test: `tests/password-reset-email.test.ts`

**Step 1: Write failing template test**

Create `tests/password-reset-email.test.ts` with:

```ts
import { buildPasswordResetEmail } from "@/lib/email/templates/password-reset";

describe("password reset email template", () => {
  it("builds Vietnamese reset email content with a button and raw URL", () => {
    const email = buildPasswordResetEmail({
      resetUrl: "https://app.example.com/reset-password?token=abc",
    });

    expect(email.subject).toBe("Đặt lại mật khẩu MoneyMind AI");
    expect(email.text).toContain(
      "Chúng tôi nhận được yêu cầu đặt lại mật khẩu",
    );
    expect(email.text).toContain(
      "https://app.example.com/reset-password?token=abc",
    );
    expect(email.html).toContain("Đặt lại mật khẩu");
    expect(email.html).toContain(
      "https://app.example.com/reset-password?token=abc",
    );
    expect(email.html).toContain("Liên kết này sẽ hết hạn sau 1 giờ");
  });
});
```

**Step 2: Run test to verify it fails**

Run:

```bash
rtk pnpm test --runInBand tests/password-reset-email.test.ts
```

Expected: FAIL because `buildPasswordResetEmail` does not exist.

**Step 3: Implement template**

Create `src/lib/email/templates/password-reset.ts`:

```ts
type BuildPasswordResetEmailInput = {
  resetUrl: string;
};

type PasswordResetEmail = {
  subject: string;
  text: string;
  html: string;
};

export function buildPasswordResetEmail({
  resetUrl,
}: BuildPasswordResetEmailInput): PasswordResetEmail {
  const subject = "Đặt lại mật khẩu MoneyMind AI";
  const intro =
    "Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản MoneyMind AI của bạn.";
  const expiry = "Liên kết này sẽ hết hạn sau 1 giờ.";
  const ignore =
    "Nếu bạn không yêu cầu, bạn có thể bỏ qua email này.";

  return {
    subject,
    text: `${intro}\n\nBấm vào liên kết bên dưới để đặt mật khẩu mới:\n${resetUrl}\n\n${expiry}\n${ignore}`,
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1f2933;">
        <p>${intro}</p>
        <p>Bấm vào nút bên dưới để đặt mật khẩu mới.</p>
        <p>
          <a href="${resetUrl}" style="display: inline-block; background: #2f6b4f; color: #ffffff; padding: 12px 18px; border-radius: 8px; text-decoration: none; font-weight: 700;">
            Đặt lại mật khẩu
          </a>
        </p>
        <p>${expiry}</p>
        <p>${ignore}</p>
        <p style="font-size: 13px; color: #64748b;">Nếu nút không hoạt động, mở liên kết này: ${resetUrl}</p>
      </div>
    `,
  };
}
```

**Step 4: Run test to verify it passes**

Run:

```bash
rtk pnpm test --runInBand tests/password-reset-email.test.ts
```

Expected: PASS.

**Step 5: Commit**

Run:

```bash
rtk git add src/lib/email/templates/password-reset.ts tests/password-reset-email.test.ts
rtk git commit -m "feat: add password reset email template"
```

## Task 3: Add Resend Email Sender

**Files:**

- Create: `src/lib/email/resend.ts`
- Modify: `tests/password-reset-email.test.ts`

**Step 1: Add failing sender tests**

Append to `tests/password-reset-email.test.ts`:

```ts
import { sendPasswordResetEmail } from "@/lib/email/resend";

const sendMock = jest.fn();

jest.mock("resend", () => ({
  Resend: jest.fn().mockImplementation(() => ({
    emails: {
      send: sendMock,
    },
  })),
}));

describe("sendPasswordResetEmail", () => {
  beforeEach(() => {
    sendMock.mockReset();
    process.env.RESEND_API_KEY = "re_test";
    process.env.EMAIL_FROM = "MoneyMind AI <no-reply@example.com>";
  });

  afterEach(() => {
    delete process.env.RESEND_API_KEY;
    delete process.env.EMAIL_FROM;
  });

  it("sends the password reset payload through Resend", async () => {
    sendMock.mockResolvedValue({ data: { id: "email_123" }, error: null });

    await sendPasswordResetEmail({
      to: "ban@example.com",
      resetUrl: "https://app.example.com/reset-password?token=abc",
    });

    expect(sendMock).toHaveBeenCalledWith({
      from: "MoneyMind AI <no-reply@example.com>",
      to: ["ban@example.com"],
      subject: "Đặt lại mật khẩu MoneyMind AI",
      html: expect.stringContaining("Đặt lại mật khẩu"),
      text: expect.stringContaining(
        "https://app.example.com/reset-password?token=abc",
      ),
    });
  });

  it("throws when Resend returns an error", async () => {
    sendMock.mockResolvedValue({
      data: null,
      error: { message: "Invalid API key" },
    });

    await expect(
      sendPasswordResetEmail({
        to: "ban@example.com",
        resetUrl: "https://app.example.com/reset-password?token=abc",
      }),
    ).rejects.toThrow("Invalid API key");
  });
});
```

If Jest complains about referencing `sendMock` inside the mock factory, rename it to `mockSend` because Jest allows variables prefixed with `mock`.

**Step 2: Run test to verify it fails**

Run:

```bash
rtk pnpm test --runInBand tests/password-reset-email.test.ts
```

Expected: FAIL because `src/lib/email/resend.ts` does not exist.

**Step 3: Implement Resend sender**

Create `src/lib/email/resend.ts`:

```ts
import { Resend } from "resend";

import { buildPasswordResetEmail } from "@/lib/email/templates/password-reset";
import { getEmailEnv } from "@/lib/env";

type SendPasswordResetEmailInput = {
  to: string;
  resetUrl: string;
};

export async function sendPasswordResetEmail({
  to,
  resetUrl,
}: SendPasswordResetEmailInput): Promise<void> {
  const env = getEmailEnv();
  const resend = new Resend(env.RESEND_API_KEY);
  const email = buildPasswordResetEmail({ resetUrl });

  const { error } = await resend.emails.send({
    from: env.EMAIL_FROM,
    to: [to],
    subject: email.subject,
    html: email.html,
    text: email.text,
  });

  if (error) {
    throw new Error(error.message);
  }
}
```

**Step 4: Run test to verify it passes**

Run:

```bash
rtk pnpm test --runInBand tests/password-reset-email.test.ts
```

Expected: PASS.

**Step 5: Commit**

Run:

```bash
rtk git add src/lib/email/resend.ts tests/password-reset-email.test.ts
rtk git commit -m "feat: send password reset email with resend"
```

## Task 4: Configure Better Auth Password Reset

**Files:**

- Modify: `src/lib/auth.ts`

**Step 1: Refresh Better Auth docs**

Run a Context7 lookup for Better Auth email/password reset before editing. Confirm these current APIs:

```ts
sendResetPassword: async ({ user, url, token }, request) => {}
revokeSessionsOnPasswordReset: true
resetPasswordTokenExpiresIn: 3600
```

Expected: current docs still match the spec. If they do not, update this plan section before implementation.

**Step 2: Modify auth config**

Update `src/lib/auth.ts` to import the sender and extend the existing `emailAndPassword` block:

```ts
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";

import { ensureDefaultCategories } from "@/lib/default-categories";
import { db } from "@/lib/db";
import { sendPasswordResetEmail } from "@/lib/email/resend";
import { getServerEnv } from "@/lib/env";

const env = getServerEnv();

export const auth = betterAuth({
  baseURL: env.BETTER_AUTH_URL,
  secret: env.BETTER_AUTH_SECRET,
  database: prismaAdapter(db, {
    provider: "postgresql",
  }),
  emailAndPassword: {
    enabled: true,
    revokeSessionsOnPasswordReset: true,
    resetPasswordTokenExpiresIn: 3600,
    sendResetPassword: async ({ user, url }) => {
      void sendPasswordResetEmail({
        to: user.email,
        resetUrl: url,
      }).catch((error) => {
        console.error("Failed to send password reset email", error);
      });
    },
  },
  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          await ensureDefaultCategories(user.id);
        },
      },
    },
  },
  plugins: [nextCookies()],
});
```

Keep import order consistent with the repo's lint output if ESLint flags it.

**Step 3: Typecheck auth config**

Run:

```bash
rtk pnpm exec tsc --noEmit
```

Expected: no TypeScript error in `src/lib/auth.ts`. If a pre-existing unrelated test type error appears, record it separately and continue only after confirming `auth.ts` is clean.

**Step 4: Commit**

Run:

```bash
rtk git add src/lib/auth.ts
rtk git commit -m "feat: enable better auth password reset"
```

## Task 5: Add Auth Reset Schemas

**Files:**

- Create: `src/features/auth/schemas.ts`
- Create or modify: `tests/auth-reset-forms.test.ts`

**Step 1: Write failing schema tests**

Create `tests/auth-reset-forms.test.ts`:

```ts
import {
  forgotPasswordFormSchema,
  resetPasswordFormSchema,
} from "@/features/auth/schemas";

describe("auth reset form schemas", () => {
  it("requires a valid email for forgot password", () => {
    expect(
      forgotPasswordFormSchema.safeParse({ email: "ban@example.com" }).success,
    ).toBe(true);

    const result = forgotPasswordFormSchema.safeParse({ email: "not-email" });

    expect(result.success).toBe(false);
  });

  it("requires matching reset passwords", () => {
    expect(
      resetPasswordFormSchema.safeParse({
        newPassword: "new-password",
        confirmPassword: "new-password",
      }).success,
    ).toBe(true);

    const result = resetPasswordFormSchema.safeParse({
      newPassword: "new-password",
      confirmPassword: "different-password",
    });

    expect(result.success).toBe(false);
  });
});
```

**Step 2: Run test to verify it fails**

Run:

```bash
rtk pnpm test --runInBand tests/auth-reset-forms.test.ts
```

Expected: FAIL because `src/features/auth/schemas.ts` does not exist.

**Step 3: Implement schemas**

Create `src/features/auth/schemas.ts`:

```ts
import { z } from "zod";

export const forgotPasswordFormSchema = z.object({
  email: z.email("Email không hợp lệ."),
});

export const resetPasswordFormSchema = z
  .object({
    newPassword: z.string().min(8, "Mật khẩu cần ít nhất 8 ký tự."),
    confirmPassword: z.string().min(1, "Vui lòng xác nhận mật khẩu mới."),
  })
  .refine((values) => values.newPassword === values.confirmPassword, {
    message: "Mật khẩu xác nhận không khớp.",
    path: ["confirmPassword"],
  });

export type ForgotPasswordFormInput = z.input<
  typeof forgotPasswordFormSchema
>;
export type ResetPasswordFormInput = z.input<typeof resetPasswordFormSchema>;
```

**Step 4: Run test to verify it passes**

Run:

```bash
rtk pnpm test --runInBand tests/auth-reset-forms.test.ts
```

Expected: PASS.

**Step 5: Commit**

Run:

```bash
rtk git add src/features/auth/schemas.ts tests/auth-reset-forms.test.ts
rtk git commit -m "feat: add password reset form schemas"
```

## Task 6: Build Forgot Password Form

**Files:**

- Create: `src/components/auth/forgot-password-form.tsx`
- Modify: `tests/auth-reset-forms.test.ts`

**Step 1: Add failing component tests**

Append to `tests/auth-reset-forms.test.ts`:

```ts
import React from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";

import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";
import { authClient } from "@/lib/auth-client";

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean })
  .IS_REACT_ACT_ENVIRONMENT = true;

const requestPasswordResetMock = jest.fn();

jest.mock("@/lib/auth-client", () => ({
  authClient: {
    requestPasswordReset: requestPasswordResetMock,
    resetPassword: jest.fn(),
  },
}));

function changeField(field: HTMLInputElement, value: string) {
  const valueSetter = Object.getOwnPropertyDescriptor(
    HTMLInputElement.prototype,
    "value",
  )?.set;

  valueSetter?.call(field, value);
  field.dispatchEvent(new Event("input", { bubbles: true }));
  field.dispatchEvent(new Event("change", { bubbles: true }));
}

describe("ForgotPasswordForm", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    requestPasswordResetMock.mockResolvedValue({ data: {}, error: null });
  });

  afterEach(() => {
    root.unmount();
    document.body.removeChild(container);
    requestPasswordResetMock.mockReset();
  });

  it("requests a reset email with the reset-password redirect", async () => {
    Object.defineProperty(window, "location", {
      configurable: true,
      value: { origin: "https://app.example.com" },
    });

    await act(async () => {
      root.render(React.createElement(ForgotPasswordForm));
    });

    await act(async () => {
      changeField(
        container.querySelector<HTMLInputElement>('input[name="email"]')!,
        "ban@example.com",
      );
      container.querySelector<HTMLButtonElement>("#requestPasswordReset")?.click();
    });

    expect(requestPasswordResetMock).toHaveBeenCalledWith({
      email: "ban@example.com",
      redirectTo: "https://app.example.com/reset-password",
    });
    expect(container.textContent).toContain(
      "Nếu email tồn tại, MoneyMind đã gửi hướng dẫn đặt lại mật khẩu.",
    );
  });

  it("shows a system error when the reset request fails", async () => {
    requestPasswordResetMock.mockResolvedValue({
      data: null,
      error: { message: "Provider down" },
    });

    await act(async () => {
      root.render(React.createElement(ForgotPasswordForm));
    });

    await act(async () => {
      changeField(
        container.querySelector<HTMLInputElement>('input[name="email"]')!,
        "ban@example.com",
      );
      container.querySelector<HTMLButtonElement>("#requestPasswordReset")?.click();
    });

    expect(container.textContent).toContain(
      "Không thể gửi hướng dẫn lúc này. Vui lòng thử lại.",
    );
  });
});
```

If this file becomes hard to maintain because of Jest mock hoisting, split schemas into `tests/auth-reset-schemas.test.ts` and form behavior into `tests/auth-reset-forms.test.ts`.

**Step 2: Run test to verify it fails**

Run:

```bash
rtk pnpm test --runInBand tests/auth-reset-forms.test.ts
```

Expected: FAIL because `ForgotPasswordForm` does not exist.

**Step 3: Implement form**

Create `src/components/auth/forgot-password-form.tsx`:

```tsx
"use client";

import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  forgotPasswordFormSchema,
  type ForgotPasswordFormInput,
} from "@/features/auth/schemas";
import { authClient } from "@/lib/auth-client";
import { createZodResolver } from "@/lib/zod-form";

const INPUT_CLASS = "h-11 focus:ring-primary/15";
const SUCCESS_MESSAGE =
  "Nếu email tồn tại, MoneyMind đã gửi hướng dẫn đặt lại mật khẩu.";
const ERROR_MESSAGE = "Không thể gửi hướng dẫn lúc này. Vui lòng thử lại.";

export function ForgotPasswordForm() {
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const form = useForm<ForgotPasswordFormInput>({
    resolver: createZodResolver(forgotPasswordFormSchema),
    defaultValues: {
      email: "",
    },
  });

  async function handleSubmit(values: ForgotPasswordFormInput) {
    setStatus("idle");

    const result = await authClient.requestPasswordReset({
      email: values.email,
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (result.error) {
      setStatus("error");
      return;
    }

    form.reset();
    setStatus("success");
  }

  return (
    <Form {...form}>
      <form
        className="space-y-4"
        noValidate
        onSubmit={form.handleSubmit(handleSubmit)}
      >
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

        {status === "success" ? (
          <p className="rounded-md border border-primary/20 bg-primary/10 px-3 py-2 text-sm text-primary">
            {SUCCESS_MESSAGE}
          </p>
        ) : null}
        {status === "error" ? (
          <p className="rounded-md border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {ERROR_MESSAGE}
          </p>
        ) : null}

        <Button
          className="h-11 w-full"
          disabled={form.formState.isSubmitting}
          id="requestPasswordReset"
          type="submit"
        >
          {form.formState.isSubmitting ? "Đang gửi..." : "Gửi hướng dẫn"}
        </Button>

        <p className="text-center text-sm text-muted-foreground">
          Nhớ mật khẩu?{" "}
          <Link className="font-medium text-primary" href="/login">
            Đăng nhập
          </Link>
        </p>
      </form>
    </Form>
  );
}
```

If `Button`, `Input`, or `Form` are default exports in the current files, match the existing import style.

**Step 4: Run test to verify it passes**

Run:

```bash
rtk pnpm test --runInBand tests/auth-reset-forms.test.ts
```

Expected: PASS.

**Step 5: Commit**

Run:

```bash
rtk git add src/components/auth/forgot-password-form.tsx tests/auth-reset-forms.test.ts
rtk git commit -m "feat: add forgot password form"
```

## Task 7: Build Reset Password Form

**Files:**

- Create: `src/components/auth/reset-password-form.tsx`
- Modify: `tests/auth-reset-forms.test.ts`

**Step 1: Add failing reset form tests**

Append to `tests/auth-reset-forms.test.ts`:

```ts
import { ResetPasswordForm } from "@/components/auth/reset-password-form";

const resetPasswordMock = authClient.resetPassword as jest.Mock;

describe("ResetPasswordForm", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    resetPasswordMock.mockResolvedValue({ data: {}, error: null });
  });

  afterEach(() => {
    root.unmount();
    document.body.removeChild(container);
    resetPasswordMock.mockReset();
  });

  it("resets the password with the supplied token", async () => {
    await act(async () => {
      root.render(React.createElement(ResetPasswordForm, { token: "token_123" }));
    });

    await act(async () => {
      changeField(
        container.querySelector<HTMLInputElement>('input[name="newPassword"]')!,
        "new-password",
      );
      changeField(
        container.querySelector<HTMLInputElement>(
          'input[name="confirmPassword"]',
        )!,
        "new-password",
      );
      container.querySelector<HTMLButtonElement>("#resetPassword")?.click();
    });

    expect(resetPasswordMock).toHaveBeenCalledWith({
      token: "token_123",
      newPassword: "new-password",
    });
    expect(container.textContent).toContain(
      "Đã đặt lại mật khẩu. Bạn có thể đăng nhập bằng mật khẩu mới.",
    );
  });

  it("does not submit and shows invalid link copy without a token", async () => {
    await act(async () => {
      root.render(React.createElement(ResetPasswordForm, { token: null }));
    });

    expect(container.textContent).toContain(
      "Liên kết đặt lại mật khẩu không hợp lệ.",
    );
    expect(container.querySelector<HTMLButtonElement>("#resetPassword")).toBeNull();
  });

  it("shows invalid or expired token copy when Better Auth rejects", async () => {
    resetPasswordMock.mockResolvedValue({
      data: null,
      error: { message: "INVALID_TOKEN" },
    });

    await act(async () => {
      root.render(React.createElement(ResetPasswordForm, { token: "bad-token" }));
    });

    await act(async () => {
      changeField(
        container.querySelector<HTMLInputElement>('input[name="newPassword"]')!,
        "new-password",
      );
      changeField(
        container.querySelector<HTMLInputElement>(
          'input[name="confirmPassword"]',
        )!,
        "new-password",
      );
      container.querySelector<HTMLButtonElement>("#resetPassword")?.click();
    });

    expect(container.textContent).toContain(
      "Liên kết đặt lại mật khẩu đã hết hạn hoặc không hợp lệ.",
    );
  });
});
```

**Step 2: Run test to verify it fails**

Run:

```bash
rtk pnpm test --runInBand tests/auth-reset-forms.test.ts
```

Expected: FAIL because `ResetPasswordForm` does not exist.

**Step 3: Implement reset form**

Create `src/components/auth/reset-password-form.tsx`:

```tsx
"use client";

import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  resetPasswordFormSchema,
  type ResetPasswordFormInput,
} from "@/features/auth/schemas";
import { authClient } from "@/lib/auth-client";
import { createZodResolver } from "@/lib/zod-form";

const INPUT_CLASS = "h-11 focus:ring-primary/15";
const SUCCESS_MESSAGE =
  "Đã đặt lại mật khẩu. Bạn có thể đăng nhập bằng mật khẩu mới.";
const INVALID_LINK_MESSAGE = "Liên kết đặt lại mật khẩu không hợp lệ.";
const EXPIRED_LINK_MESSAGE =
  "Liên kết đặt lại mật khẩu đã hết hạn hoặc không hợp lệ.";
const SYSTEM_ERROR_MESSAGE =
  "Không thể đặt lại mật khẩu lúc này. Vui lòng thử lại.";

type ResetPasswordFormProps = {
  token: string | null;
};

export function ResetPasswordForm({ token }: ResetPasswordFormProps) {
  const [status, setStatus] = useState<
    "idle" | "success" | "invalid-token" | "system-error"
  >("idle");
  const form = useForm<ResetPasswordFormInput>({
    resolver: createZodResolver(resetPasswordFormSchema),
    defaultValues: {
      newPassword: "",
      confirmPassword: "",
    },
  });

  if (!token) {
    return (
      <div className="space-y-4">
        <p className="rounded-md border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {INVALID_LINK_MESSAGE}
        </p>
        <Button asChild className="h-11 w-full">
          <Link href="/forgot-password">Gửi lại hướng dẫn</Link>
        </Button>
      </div>
    );
  }

  async function handleSubmit(values: ResetPasswordFormInput) {
    setStatus("idle");

    const result = await authClient.resetPassword({
      token,
      newPassword: values.newPassword,
    });

    if (result.error) {
      setStatus(
        result.error.message?.includes("INVALID_TOKEN")
          ? "invalid-token"
          : "system-error",
      );
      return;
    }

    form.reset();
    setStatus("success");
  }

  return (
    <Form {...form}>
      <form
        className="space-y-4"
        noValidate
        onSubmit={form.handleSubmit(handleSubmit)}
      >
        <FormField
          control={form.control}
          name="newPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Mật khẩu mới</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  autoComplete="new-password"
                  className={INPUT_CLASS}
                  type="password"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="confirmPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Xác nhận mật khẩu mới</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  autoComplete="new-password"
                  className={INPUT_CLASS}
                  type="password"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {status === "success" ? (
          <p className="rounded-md border border-primary/20 bg-primary/10 px-3 py-2 text-sm text-primary">
            {SUCCESS_MESSAGE}
          </p>
        ) : null}
        {status === "invalid-token" ? (
          <p className="rounded-md border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {EXPIRED_LINK_MESSAGE}
          </p>
        ) : null}
        {status === "system-error" ? (
          <p className="rounded-md border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {SYSTEM_ERROR_MESSAGE}
          </p>
        ) : null}

        <Button
          className="h-11 w-full"
          disabled={form.formState.isSubmitting || status === "success"}
          id="resetPassword"
          type="submit"
        >
          {form.formState.isSubmitting ? "Đang đặt lại..." : "Đặt lại mật khẩu"}
        </Button>

        <p className="text-center text-sm text-muted-foreground">
          <Link className="font-medium text-primary" href="/login">
            Quay lại đăng nhập
          </Link>
        </p>
      </form>
    </Form>
  );
}
```

**Step 4: Run test to verify it passes**

Run:

```bash
rtk pnpm test --runInBand tests/auth-reset-forms.test.ts
```

Expected: PASS.

**Step 5: Commit**

Run:

```bash
rtk git add src/components/auth/reset-password-form.tsx tests/auth-reset-forms.test.ts
rtk git commit -m "feat: add reset password form"
```

## Task 8: Add Public Auth Pages

**Files:**

- Create: `src/app/(auth)/forgot-password/page.tsx`
- Create: `src/app/(auth)/reset-password/page.tsx`

**Step 1: Read Next.js route and searchParams docs**

Read:

```bash
rtk proxy sed -n '240,275p' node_modules/next/dist/docs/01-app/01-getting-started/03-layouts-and-pages.md
```

Expected: confirms App Router pages can receive `searchParams` as a prop.

**Step 2: Create forgot password page**

Create `src/app/(auth)/forgot-password/page.tsx`:

```tsx
import Link from "next/link";
import { Bot, CheckCircle2 } from "lucide-react";

import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";

export default function ForgotPasswordPage() {
  return (
    <main className="min-h-screen bg-app-gradient px-4 py-8 text-foreground">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-5xl items-center justify-center">
        <div className="grid w-full gap-8 lg:grid-cols-[1fr_420px] lg:items-center">
          <section className="space-y-6">
            <Link
              className="inline-flex items-center gap-2 text-sm font-bold"
              href="/"
            >
              <span className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-[0_10px_24px_rgba(47,107,79,0.22)]">
                <Bot className="size-4" />
              </span>
              MoneyMind AI
            </Link>
            <div className="space-y-3">
              <p className="text-sm font-medium uppercase tracking-[0.18em] text-primary">
                Khôi phục tài khoản
              </p>
              <h1 className="max-w-xl text-3xl font-semibold tracking-normal text-foreground sm:text-4xl">
                Nhận liên kết đặt lại mật khẩu qua email.
              </h1>
              <p className="max-w-xl text-base leading-7 text-muted-foreground">
                Nhập email bạn dùng cho MoneyMind AI. Nếu tài khoản tồn tại,
                chúng tôi sẽ gửi hướng dẫn đặt lại mật khẩu.
              </p>
            </div>
            <div className="grid gap-3 text-sm text-muted-foreground">
              <p className="flex gap-2">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
                Liên kết đặt lại mật khẩu hết hạn sau 1 giờ.
              </p>
              <p className="flex gap-2">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
                Phiên đăng nhập khác sẽ được thu hồi sau khi đổi mật khẩu.
              </p>
            </div>
          </section>

          <section className="rounded-2xl border border-warm-border bg-surface p-6 shadow-[0_24px_70px_rgba(33,41,34,0.12)]">
            <div className="mb-6 space-y-2">
              <h2 className="text-xl font-semibold">Quên mật khẩu?</h2>
              <p className="text-sm text-muted-foreground">
                MoneyMind sẽ gửi hướng dẫn bảo mật tới email của bạn.
              </p>
            </div>
            <ForgotPasswordForm />
          </section>
        </div>
      </div>
    </main>
  );
}
```

**Step 3: Create reset password page**

Create `src/app/(auth)/reset-password/page.tsx`:

```tsx
import Link from "next/link";
import { Bot, ShieldCheck } from "lucide-react";

import { ResetPasswordForm } from "@/components/auth/reset-password-form";

type ResetPasswordPageProps = {
  searchParams: Promise<{
    token?: string | string[];
    error?: string | string[];
  }>;
};

export default async function ResetPasswordPage({
  searchParams,
}: ResetPasswordPageProps) {
  const params = await searchParams;
  const token = Array.isArray(params.token) ? params.token[0] : params.token;

  return (
    <main className="min-h-screen bg-app-gradient px-4 py-8 text-foreground">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-5xl items-center justify-center">
        <div className="grid w-full gap-8 lg:grid-cols-[1fr_420px] lg:items-center">
          <section className="space-y-6">
            <Link
              className="inline-flex items-center gap-2 text-sm font-bold"
              href="/"
            >
              <span className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-[0_10px_24px_rgba(47,107,79,0.22)]">
                <Bot className="size-4" />
              </span>
              MoneyMind AI
            </Link>
            <div className="space-y-3">
              <p className="text-sm font-medium uppercase tracking-[0.18em] text-primary">
                Bảo mật tài khoản
              </p>
              <h1 className="max-w-xl text-3xl font-semibold tracking-normal text-foreground sm:text-4xl">
                Đặt mật khẩu mới cho tài khoản của bạn.
              </h1>
              <p className="max-w-xl text-base leading-7 text-muted-foreground">
                Chọn mật khẩu mới tối thiểu 8 ký tự. Sau khi đặt lại, bạn có
                thể đăng nhập bằng mật khẩu mới.
              </p>
            </div>
            <p className="flex gap-2 text-sm text-muted-foreground">
              <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" />
              Các phiên đăng nhập khác sẽ được thu hồi để giữ tài khoản an toàn.
            </p>
          </section>

          <section className="rounded-2xl border border-warm-border bg-surface p-6 shadow-[0_24px_70px_rgba(33,41,34,0.12)]">
            <div className="mb-6 space-y-2">
              <h2 className="text-xl font-semibold">Đặt lại mật khẩu</h2>
              <p className="text-sm text-muted-foreground">
                Liên kết chỉ dùng được một lần trong thời hạn cho phép.
              </p>
            </div>
            <ResetPasswordForm token={token ?? null} />
          </section>
        </div>
      </div>
    </main>
  );
}
```

If the existing auth pages use a different exact layout class, copy that structure instead of introducing a second visual pattern.

**Step 4: Typecheck pages**

Run:

```bash
rtk pnpm exec tsc --noEmit
```

Expected: no errors in the two new pages. Fix the `searchParams` type if Next.js reports a route prop mismatch.

**Step 5: Commit**

Run:

```bash
rtk git add 'src/app/(auth)/forgot-password/page.tsx' 'src/app/(auth)/reset-password/page.tsx'
rtk git commit -m "feat: add password reset pages"
```

## Task 9: Link Login To Forgot Password

**Files:**

- Modify: `src/components/auth/login-form.tsx`
- Modify: `tests/auth-reset-forms.test.ts`

**Step 1: Add failing login link test**

Add a small test that renders `LoginForm` and asserts the forgot-password link exists:

```ts
import { LoginForm } from "@/components/auth/login-form";

describe("LoginForm forgot password link", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    root.unmount();
    document.body.removeChild(container);
  });

  it("links to the forgot password page", async () => {
    await act(async () => {
      root.render(React.createElement(LoginForm));
    });

    const link = Array.from(container.querySelectorAll("a")).find(
      (anchor) => anchor.textContent === "Quên mật khẩu?",
    );

    expect(link?.getAttribute("href")).toBe("/forgot-password");
  });
});
```

If `LoginForm` requires `authClient.signIn.email` in the mock, add it to the existing `jest.mock("@/lib/auth-client")` object:

```ts
signIn: {
  email: jest.fn(),
},
```

**Step 2: Run test to verify it fails**

Run:

```bash
rtk pnpm test --runInBand tests/auth-reset-forms.test.ts
```

Expected: FAIL because the link does not exist yet.

**Step 3: Add link**

In `src/components/auth/login-form.tsx`, add a `Link` to `/forgot-password` near the password field or below the form controls:

```tsx
<div className="flex justify-end">
  <Link className="text-sm font-medium text-primary" href="/forgot-password">
    Quên mật khẩu?
  </Link>
</div>
```

Place it where it reads naturally with the existing login form layout.

**Step 4: Run test to verify it passes**

Run:

```bash
rtk pnpm test --runInBand tests/auth-reset-forms.test.ts
```

Expected: PASS.

**Step 5: Commit**

Run:

```bash
rtk git add src/components/auth/login-form.tsx tests/auth-reset-forms.test.ts
rtk git commit -m "feat: link login to password recovery"
```

## Task 10: Run Focused And Full Verification

**Files:**

- No code changes unless verification reveals a bug.

**Step 1: Run focused tests**

Run:

```bash
rtk pnpm test --runInBand tests/password-reset-email.test.ts tests/auth-reset-forms.test.ts
```

Expected: PASS.

**Step 2: Run full Jest suite**

Run:

```bash
rtk pnpm test --runInBand
```

Expected: PASS. If there is a pre-existing unrelated failure, capture the exact failing test and confirm it is not caused by forgot-password changes.

**Step 3: Run lint**

Run:

```bash
rtk pnpm lint
```

Expected: PASS.

**Step 4: Run typecheck**

Run:

```bash
rtk pnpm exec tsc --noEmit
```

Expected: PASS, except any known pre-existing unrelated type error already documented before this feature.

**Step 5: Run build**

Run:

```bash
rtk pnpm build
```

Expected: PASS. If build imports auth config and local env lacks required production values, confirm `getEmailEnv()` is not called at build time and add only local `.env` values needed for build without committing `.env`.

## Task 11: Manual Runtime Verification

**Files:**

- No committed code changes unless runtime verification reveals a bug.

**Step 1: Start dev server**

Run:

```bash
rtk pnpm dev
```

Expected: Next.js dev server starts and prints a local URL.

**Step 2: Check pages in browser**

Open:

```text
http://localhost:3000/forgot-password
http://localhost:3000/reset-password
http://localhost:3000/reset-password?token=test-token
```

Expected:

- `/forgot-password` renders the email form.
- `/reset-password` renders invalid-link copy and a link to request a new email.
- `/reset-password?token=test-token` renders the new-password form.
- Text does not overflow on desktop or mobile width.

**Step 3: Check link from login**

Open:

```text
http://localhost:3000/login
```

Expected: `Quên mật khẩu?` is visible and navigates to `/forgot-password`.

**Step 4: Optional real email smoke test**

Only run this when `RESEND_API_KEY` and `EMAIL_FROM` are configured with a verified sender:

1. Use a real registered account email.
2. Submit `/forgot-password`.
3. Confirm the Resend dashboard logs one email.
4. Click the email link.
5. Set a new password.
6. Confirm login with the new password works.

Do not commit `.env` changes used for this smoke test.

## Task 12: Final Review And Delivery

**Files:**

- Inspect all changed files.

**Step 1: Review git diff**

Run:

```bash
rtk git status --short
rtk git diff --stat HEAD
rtk git diff HEAD
```

Expected: only forgot-password feature files, tests, env example, dependency files, and intentional auth changes are present.

**Step 2: Summarize verification evidence**

Record the exact commands that passed:

```text
pnpm test --runInBand tests/password-reset-email.test.ts tests/auth-reset-forms.test.ts
pnpm test --runInBand
pnpm lint
pnpm exec tsc --noEmit
pnpm build
manual pages checked in browser
```

If any command could not run or exposed a pre-existing unrelated issue, record the exact reason.

**Step 3: Commit any final fixes**

If verification required fixes, commit them:

```bash
rtk git add <changed-files>
rtk git commit -m "fix: polish password reset flow"
```

Expected: final worktree is clean.
