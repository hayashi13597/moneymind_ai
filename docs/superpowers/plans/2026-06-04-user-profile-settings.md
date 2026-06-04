# User Profile Settings Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a protected `/profile` page where users update display name/avatar URL, change password, and access profile/logout through a header avatar menu.

**Architecture:** Profile data is updated through a server action in `src/features/profile`, with server-side auth and zod validation. Password changes stay inside Better Auth via `authClient.changePassword()`. The app shell replaces email/logout controls with a shadcn `DropdownMenu` account menu.

**Tech Stack:** Next.js App Router, React 19, TypeScript, Prisma, Better Auth v1.6.11, React Hook Form, zod, shadcn/Radix UI, Jest.

---

## File Structure

- Create `src/features/profile/schemas.ts`: shared profile and password form schemas plus inferred types.
- Create `src/features/profile/actions.ts`: authenticated `updateProfileAction` server action.
- Create `src/features/profile/profile-form.tsx`: client form for name/email/avatar URL.
- Create `src/features/profile/password-form.tsx`: client form for Better Auth password change.
- Create `src/app/(app)/profile/page.tsx`: protected profile page using existing app layout.
- Create `src/components/auth/account-menu.tsx`: avatar trigger, fallback initials, dropdown items.
- Modify `src/app/(app)/layout.tsx`: replace email text and `LogoutButton` with `AccountMenu`.
- Add `tests/profile-actions.test.ts`: server action coverage.
- Add `tests/profile-forms.test.ts`: profile and password form coverage.
- Add `tests/account-menu.test.ts`: header menu coverage.

## Required Docs Check Before Coding

- Read `node_modules/next/dist/docs/01-app/01-getting-started/07-mutating-data.md` for Server Functions and auth checks inside actions.
- Read `node_modules/next/dist/docs/01-app/02-guides/forms.md` for Server Actions and form validation behavior.
- Read `node_modules/next/dist/docs/01-app/01-getting-started/09-revalidating.md` for `revalidatePath`.
- Use Context7 Better Auth v1.6.11 docs for `authClient.changePassword({ currentPassword, newPassword, revokeOtherSessions })`.

## Task 1: Profile Schemas

**Files:**
- Create: `src/features/profile/schemas.ts`
- Test: `tests/profile-actions.test.ts`

- [ ] **Step 1: Write failing schema tests**

Create `tests/profile-actions.test.ts` with the schema-focused cases first:

```ts
import { profileFormSchema } from "@/features/profile/schemas";

describe("profile schemas", () => {
  it("normalizes an empty avatar URL to null", () => {
    const parsed = profileFormSchema.parse({
      name: " Nguyễn Văn A ",
      image: "   ",
    });

    expect(parsed).toEqual({
      name: "Nguyễn Văn A",
      image: null,
    });
  });

  it("rejects invalid avatar URLs", () => {
    const parsed = profileFormSchema.safeParse({
      name: "Nguyễn Văn A",
      image: "not-a-url",
    });

    expect(parsed.success).toBe(false);
  });
});
```

- [ ] **Step 2: Run the failing test**

Run: `pnpm test --runInBand tests/profile-actions.test.ts`

Expected: FAIL because `@/features/profile/schemas` does not exist.

- [ ] **Step 3: Implement schemas**

Create `src/features/profile/schemas.ts`:

```ts
import { z } from "zod";

const optionalUrl = z
  .string()
  .trim()
  .max(2048, "URL ảnh đại diện quá dài.")
  .transform((value) => (value.length === 0 ? null : value))
  .pipe(z.url("URL ảnh đại diện không hợp lệ.").nullable());

export const profileFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Tên hiển thị là bắt buộc.")
    .max(80, "Tên hiển thị tối đa 80 ký tự."),
  image: optionalUrl,
});

export const passwordFormSchema = z
  .object({
    currentPassword: z.string().min(1, "Mật khẩu hiện tại là bắt buộc."),
    newPassword: z.string().min(8, "Mật khẩu mới cần ít nhất 8 ký tự."),
    confirmPassword: z.string().min(1, "Bạn cần nhập lại mật khẩu mới."),
    revokeOtherSessions: z.boolean().default(true),
  })
  .refine((values) => values.newPassword === values.confirmPassword, {
    message: "Mật khẩu mới không khớp.",
    path: ["confirmPassword"],
  });

export type ProfileFormValues = z.infer<typeof profileFormSchema>;
export type PasswordFormValues = z.infer<typeof passwordFormSchema>;
```

- [ ] **Step 4: Verify schema tests pass**

Run: `pnpm test --runInBand tests/profile-actions.test.ts`

Expected: PASS for the two schema tests.

- [ ] **Step 5: Commit**

```bash
git add src/features/profile/schemas.ts tests/profile-actions.test.ts
git commit -m "feat: add profile settings schemas"
```

## Task 2: Profile Update Server Action

**Files:**
- Modify: `src/features/profile/actions.ts`
- Modify: `tests/profile-actions.test.ts`

- [ ] **Step 1: Extend failing action tests**

Append these tests to `tests/profile-actions.test.ts`:

```ts
import { revalidatePath } from "next/cache";

import { updateProfileAction } from "@/features/profile/actions";
import { getCurrentUser } from "@/lib/auth-session";
import { db } from "@/lib/db";

jest.mock("next/cache", () => ({
  revalidatePath: jest.fn(),
}));

jest.mock("@/lib/auth-session", () => ({
  getCurrentUser: jest.fn(),
}));

jest.mock("@/lib/db", () => ({
  db: {
    user: {
      update: jest.fn(),
    },
  },
}));

const getCurrentUserMock = getCurrentUser as jest.Mock;
const userUpdateMock = db.user.update as jest.Mock;
const revalidatePathMock = revalidatePath as jest.Mock;

describe("updateProfileAction", () => {
  beforeEach(() => {
    getCurrentUserMock.mockResolvedValue({ id: "user_1" });
    userUpdateMock.mockResolvedValue({
      id: "user_1",
      name: "Nguyễn Văn A",
      image: "https://example.com/a.png",
    });
    revalidatePathMock.mockReset();
  });

  it("rejects unauthenticated users", async () => {
    getCurrentUserMock.mockResolvedValue(null);

    await expect(
      updateProfileAction({
        name: "Nguyễn Văn A",
        image: "",
      }),
    ).resolves.toEqual({
      ok: false,
      error: "Bạn cần đăng nhập để cập nhật hồ sơ.",
    });

    expect(userUpdateMock).not.toHaveBeenCalled();
  });

  it("updates the current user's name and normalized image", async () => {
    await expect(
      updateProfileAction({
        name: " Nguyễn Văn A ",
        image: " https://example.com/a.png ",
      }),
    ).resolves.toEqual({ ok: true });

    expect(userUpdateMock).toHaveBeenCalledWith({
      where: { id: "user_1" },
      data: {
        name: "Nguyễn Văn A",
        image: "https://example.com/a.png",
      },
    });
    expect(revalidatePathMock).toHaveBeenCalledWith("/(app)", "layout");
    expect(revalidatePathMock).toHaveBeenCalledWith("/(app)/profile");
  });

  it("does not update when validation fails", async () => {
    await expect(
      updateProfileAction({
        name: "",
        image: "not-a-url",
      }),
    ).resolves.toEqual({
      ok: false,
      error: "Dữ liệu hồ sơ không hợp lệ.",
    });

    expect(userUpdateMock).not.toHaveBeenCalled();
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run the failing action tests**

Run: `pnpm test --runInBand tests/profile-actions.test.ts`

Expected: FAIL because `src/features/profile/actions.ts` does not exist.

- [ ] **Step 3: Implement the action**

Create `src/features/profile/actions.ts`:

```ts
"use server";

import { revalidatePath } from "next/cache";

import { profileFormSchema, type ProfileFormValues } from "@/features/profile/schemas";
import { getCurrentUser } from "@/lib/auth-session";
import { db } from "@/lib/db";

type UpdateProfileResult =
  | { ok: true }
  | { ok: false; error: string };

export async function updateProfileAction(
  values: ProfileFormValues,
): Promise<UpdateProfileResult> {
  const user = await getCurrentUser();

  if (!user) {
    return {
      ok: false,
      error: "Bạn cần đăng nhập để cập nhật hồ sơ.",
    };
  }

  const parsed = profileFormSchema.safeParse(values);

  if (!parsed.success) {
    return {
      ok: false,
      error: "Dữ liệu hồ sơ không hợp lệ.",
    };
  }

  try {
    await db.user.update({
      where: { id: user.id },
      data: {
        name: parsed.data.name,
        image: parsed.data.image,
      },
    });

    revalidatePath("/(app)", "layout");
    revalidatePath("/(app)/profile");

    return { ok: true };
  } catch {
    return {
      ok: false,
      error: "Không thể cập nhật hồ sơ lúc này.",
    };
  }
}
```

- [ ] **Step 4: Verify action tests pass**

Run: `pnpm test --runInBand tests/profile-actions.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/features/profile/actions.ts tests/profile-actions.test.ts
git commit -m "feat: add profile update action"
```

## Task 3: Profile And Password Forms

**Files:**
- Create: `src/features/profile/profile-form.tsx`
- Create: `src/features/profile/password-form.tsx`
- Create: `tests/profile-forms.test.ts`

- [ ] **Step 1: Write failing form tests**

Create `tests/profile-forms.test.ts`:

```ts
import React from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";

import { updateProfileAction } from "@/features/profile/actions";
import { PasswordForm } from "@/features/profile/password-form";
import { ProfileForm } from "@/features/profile/profile-form";
import { authClient } from "@/lib/auth-client";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean })
  .IS_REACT_ACT_ENVIRONMENT = true;

jest.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: jest.fn(),
  }),
}));

jest.mock("sonner", () => ({
  toast: {
    error: jest.fn(),
    success: jest.fn(),
  },
}));

jest.mock("@/features/profile/actions", () => ({
  updateProfileAction: jest.fn(),
}));

jest.mock("@/lib/auth-client", () => ({
  authClient: {
    changePassword: jest.fn(),
  },
}));

const updateProfileActionMock = updateProfileAction as jest.Mock;
const changePasswordMock = authClient.changePassword as jest.Mock;

function changeField(field: HTMLInputElement, value: string) {
  const valueSetter = Object.getOwnPropertyDescriptor(
    HTMLInputElement.prototype,
    "value",
  )?.set;

  valueSetter?.call(field, value);
  field.dispatchEvent(new Event("input", { bubbles: true }));
  field.dispatchEvent(new Event("change", { bubbles: true }));
}

describe("profile forms", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    updateProfileActionMock.mockResolvedValue({ ok: true });
    changePasswordMock.mockResolvedValue({ data: {}, error: null });
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
    jest.clearAllMocks();
  });

  it("renders readonly email and submits valid profile values", async () => {
    await act(async () => {
      root.render(
        React.createElement(ProfileForm, {
          user: {
            name: "Nguyễn Văn A",
            email: "ban@example.com",
            image: "",
          },
        }),
      );
    });

    const email = container.querySelector<HTMLInputElement>('input[name="email"]')!;
    const name = container.querySelector<HTMLInputElement>('input[name="name"]')!;
    const image = container.querySelector<HTMLInputElement>('input[name="image"]')!;

    expect(email.value).toBe("ban@example.com");
    expect(email.readOnly).toBe(true);

    await act(async () => {
      changeField(name, "Tên mới");
      changeField(image, "https://example.com/avatar.png");
      container.querySelector<HTMLButtonElement>("#saveProfile")?.click();
    });

    expect(updateProfileActionMock).toHaveBeenCalledWith({
      name: "Tên mới",
      image: "https://example.com/avatar.png",
    });
  });

  it("blocks mismatched password confirmation", async () => {
    await act(async () => {
      root.render(React.createElement(PasswordForm));
    });

    await act(async () => {
      changeField(
        container.querySelector<HTMLInputElement>('input[name="currentPassword"]')!,
        "old-password",
      );
      changeField(
        container.querySelector<HTMLInputElement>('input[name="newPassword"]')!,
        "new-password",
      );
      changeField(
        container.querySelector<HTMLInputElement>('input[name="confirmPassword"]')!,
        "different-password",
      );
      container.querySelector<HTMLButtonElement>("#changePassword")?.click();
    });

    expect(container.textContent).toContain("Mật khẩu mới không khớp.");
    expect(changePasswordMock).not.toHaveBeenCalled();
  });

  it("changes password with revoke other sessions enabled by default", async () => {
    await act(async () => {
      root.render(React.createElement(PasswordForm));
    });

    await act(async () => {
      changeField(
        container.querySelector<HTMLInputElement>('input[name="currentPassword"]')!,
        "old-password",
      );
      changeField(
        container.querySelector<HTMLInputElement>('input[name="newPassword"]')!,
        "new-password",
      );
      changeField(
        container.querySelector<HTMLInputElement>('input[name="confirmPassword"]')!,
        "new-password",
      );
      container.querySelector<HTMLButtonElement>("#changePassword")?.click();
    });

    expect(changePasswordMock).toHaveBeenCalledWith({
      currentPassword: "old-password",
      newPassword: "new-password",
      revokeOtherSessions: true,
    });
  });
});
```

- [ ] **Step 2: Run failing form tests**

Run: `pnpm test --runInBand tests/profile-forms.test.ts`

Expected: FAIL because the profile form files do not exist.

- [ ] **Step 3: Implement `ProfileForm`**

Create `src/features/profile/profile-form.tsx`:

```tsx
"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { updateProfileAction } from "@/features/profile/actions";
import {
  profileFormSchema,
  type ProfileFormValues,
} from "@/features/profile/schemas";
import { createZodResolver } from "@/lib/zod-form";
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

const INPUT_CLASS =
  "h-11 w-full rounded-xl border border-warm-border bg-surface px-3 text-sm outline-none transition-colors focus:border-primary focus:ring-3 focus:ring-primary/15";

type ProfileFormProps = {
  user: {
    name?: string | null;
    email: string;
    image?: string | null;
  };
};

export function ProfileForm({ user }: ProfileFormProps) {
  const router = useRouter();
  const form = useForm<ProfileFormValues>({
    resolver: createZodResolver(profileFormSchema),
    defaultValues: {
      name: user.name ?? "",
      image: user.image ?? "",
    },
  });

  async function handleSubmit(values: ProfileFormValues) {
    const result = await updateProfileAction(values);

    if (!result.ok) {
      toast.error(result.error);
      return;
    }

    toast.success("Đã cập nhật hồ sơ.");
    router.refresh();
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tên hiển thị</FormLabel>
              <FormControl>
                <Input {...field} className={INPUT_CLASS} autoComplete="name" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormItem>
          <FormLabel>Email</FormLabel>
          <FormControl>
            <Input
              name="email"
              value={user.email}
              readOnly
              className={INPUT_CLASS}
              autoComplete="email"
            />
          </FormControl>
          <FormMessage />
        </FormItem>
        <FormField
          control={form.control}
          name="image"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Avatar URL</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  value={field.value ?? ""}
                  className={INPUT_CLASS}
                  placeholder="https://example.com/avatar.png"
                  type="url"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button
          id="saveProfile"
          type="submit"
          className="h-11 bg-primary hover:bg-primary-hover"
          disabled={form.formState.isSubmitting}
        >
          {form.formState.isSubmitting ? "Đang lưu..." : "Lưu hồ sơ"}
        </Button>
      </form>
    </Form>
  );
}
```

- [ ] **Step 4: Implement `PasswordForm`**

Create `src/features/profile/password-form.tsx`:

```tsx
"use client";

import { useForm } from "react-hook-form";
import { toast } from "sonner";

import {
  passwordFormSchema,
  type PasswordFormValues,
} from "@/features/profile/schemas";
import { authClient } from "@/lib/auth-client";
import { createZodResolver } from "@/lib/zod-form";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";

const INPUT_CLASS =
  "h-11 w-full rounded-xl border border-warm-border bg-surface px-3 text-sm outline-none transition-colors focus:border-primary focus:ring-3 focus:ring-primary/15";

export function PasswordForm() {
  const form = useForm<PasswordFormValues>({
    resolver: createZodResolver(passwordFormSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
      revokeOtherSessions: true,
    },
  });

  async function handleSubmit(values: PasswordFormValues) {
    const result = await authClient.changePassword({
      currentPassword: values.currentPassword,
      newPassword: values.newPassword,
      revokeOtherSessions: values.revokeOtherSessions,
    });

    if (result.error) {
      toast.error("Mật khẩu hiện tại không đúng hoặc không thể đổi mật khẩu.");
      return;
    }

    form.reset();
    toast.success("Đã đổi mật khẩu.");
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="currentPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Mật khẩu hiện tại</FormLabel>
              <FormControl>
                <Input {...field} className={INPUT_CLASS} type="password" autoComplete="current-password" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="newPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Mật khẩu mới</FormLabel>
              <FormControl>
                <Input {...field} className={INPUT_CLASS} type="password" autoComplete="new-password" />
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
              <FormLabel>Nhập lại mật khẩu mới</FormLabel>
              <FormControl>
                <Input {...field} className={INPUT_CLASS} type="password" autoComplete="new-password" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="revokeOtherSessions"
          render={({ field }) => (
            <FormItem className="flex items-start gap-3 rounded-xl border border-[#E4DED3] bg-[#FFFDF7]/70 p-3">
              <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={(checked) => field.onChange(checked === true)}
                  aria-label="Đăng xuất khỏi các thiết bị khác"
                  className="mt-1"
                />
              </FormControl>
              <div className="space-y-1">
                <FormLabel>Đăng xuất khỏi các thiết bị khác</FormLabel>
                <p className="text-sm text-muted-foreground">
                  Giữ phiên hiện tại và thu hồi các phiên đăng nhập còn lại.
                </p>
                <FormMessage />
              </div>
            </FormItem>
          )}
        />
        <Button
          id="changePassword"
          type="submit"
          className="h-11 bg-primary hover:bg-primary-hover"
          disabled={form.formState.isSubmitting}
        >
          {form.formState.isSubmitting ? "Đang đổi..." : "Đổi mật khẩu"}
        </Button>
      </form>
    </Form>
  );
}
```

- [ ] **Step 5: Verify form tests pass**

Run: `pnpm test --runInBand tests/profile-forms.test.ts`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/features/profile/profile-form.tsx src/features/profile/password-form.tsx tests/profile-forms.test.ts
git commit -m "feat: add profile account forms"
```

## Task 4: Profile Page

**Files:**
- Create: `src/app/(app)/profile/page.tsx`

- [ ] **Step 1: Create the page**

Create `src/app/(app)/profile/page.tsx`:

```tsx
import { redirect } from "next/navigation";

import { PageHeader, SectionCard } from "@/components/app-ui";
import { PasswordForm } from "@/features/profile/password-form";
import { ProfileForm } from "@/features/profile/profile-form";
import { getCurrentUser } from "@/lib/auth-session";

export default async function ProfilePage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Tài khoản"
        title="Hồ sơ cá nhân"
        description="Quản lý thông tin hiển thị, ảnh đại diện và mật khẩu đăng nhập MoneyMind AI."
      />
      <div className="grid gap-5 lg:grid-cols-[1fr_0.9fr]">
        <SectionCard>
          <section className="space-y-5">
            <div>
              <h2 className="text-lg font-semibold">Hồ sơ</h2>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                Cập nhật tên hiển thị và ảnh đại diện bằng URL ảnh.
              </p>
            </div>
            <ProfileForm user={user} />
          </section>
        </SectionCard>
        <SectionCard>
          <section className="space-y-5">
            <div>
              <h2 className="text-lg font-semibold">Bảo mật</h2>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                Đổi mật khẩu và kiểm soát các phiên đăng nhập khác.
              </p>
            </div>
            <PasswordForm />
          </section>
        </SectionCard>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Run TypeScript/lint feedback for the page**

Run: `pnpm lint`

Expected: PASS or only failures unrelated to the new profile page. Fix any failures in new files before continuing.

- [ ] **Step 3: Commit**

```bash
git add 'src/app/(app)/profile/page.tsx'
git commit -m "feat: add profile settings page"
```

## Task 5: Header Account Menu

**Files:**
- Create: `src/components/auth/account-menu.tsx`
- Modify: `src/app/(app)/layout.tsx`
- Test: `tests/account-menu.test.ts`

- [ ] **Step 1: Write failing account menu tests**

Create `tests/account-menu.test.ts`:

```ts
import React from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";

import { AccountMenu } from "@/components/auth/account-menu";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean })
  .IS_REACT_ACT_ENVIRONMENT = true;

jest.mock("next/link", () => {
  function Link({
    children,
    href,
    ...props
  }: {
    children: React.ReactNode;
    href: string;
  }) {
    return React.createElement("a", { href, ...props }, children);
  }

  return {
    __esModule: true,
    default: Link,
  };
});

jest.mock("@/components/auth/logout-button", () => ({
  LogoutButton: () => React.createElement("button", null, "Đăng xuất"),
}));

describe("AccountMenu", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
  });

  it("renders an avatar image when image exists", () => {
    act(() => {
      root.render(
        React.createElement(AccountMenu, {
          user: {
            name: "Nguyễn Văn A",
            email: "ban@example.com",
            image: "https://example.com/avatar.png",
          },
        }),
      );
    });

    const image = container.querySelector<HTMLImageElement>("img");

    expect(image?.src).toBe("https://example.com/avatar.png");
    expect(image?.alt).toBe("Nguyễn Văn A");
  });

  it("renders an initial fallback and account controls", async () => {
    await act(async () => {
      root.render(
        React.createElement(AccountMenu, {
          user: {
            name: "An",
            email: "ban@example.com",
            image: null,
          },
        }),
      );
    });

    expect(container.textContent).toContain("A");

    await act(async () => {
      container
        .querySelector<HTMLButtonElement>('[aria-label="Mở menu tài khoản"]')
        ?.dispatchEvent(
          new PointerEvent("pointerdown", {
            bubbles: true,
            button: 0,
            ctrlKey: false,
          }),
        );
    });

    expect(document.body.textContent).toContain("Hồ sơ");
    expect(document.body.textContent).toContain("Đăng xuất");
  });
});
```

- [ ] **Step 2: Run failing account menu tests**

Run: `pnpm test --runInBand tests/account-menu.test.ts`

Expected: FAIL because `account-menu.tsx` does not exist.

- [ ] **Step 3: Implement `AccountMenu`**

Create `src/components/auth/account-menu.tsx`:

```tsx
"use client";

import Link from "next/link";
import { UserRound } from "lucide-react";

import { LogoutButton } from "@/components/auth/logout-button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type AccountMenuProps = {
  user: {
    name?: string | null;
    email: string;
    image?: string | null;
  };
};

function getInitial(user: AccountMenuProps["user"]) {
  const source = user.name?.trim() || user.email.trim();
  return source.charAt(0).toLocaleUpperCase("vi-VN");
}

export function AccountMenu({ user }: AccountMenuProps) {
  const displayName = user.name?.trim() || "Tài khoản";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="inline-flex size-10 items-center justify-center overflow-hidden rounded-full border border-[#D8E1D7] bg-[#ECF3ED] text-sm font-bold text-[#2F6B4F] shadow-[0_8px_22px_rgba(47,42,31,0.08)] transition hover:-translate-y-0.5 hover:bg-[#FFFDF7] focus-visible:ring-3 focus-visible:ring-primary/20 focus-visible:outline-none"
          aria-label="Mở menu tài khoản"
        >
          {user.image ? (
            <img
              src={user.image}
              alt={displayName}
              className="size-full object-cover"
            />
          ) : (
            <span>{getInitial(user)}</span>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64 rounded-xl border-[#DED7CA] bg-[#FFFDF7]">
        <DropdownMenuLabel className="space-y-1">
          <span className="block truncate text-sm font-semibold">
            {displayName}
          </span>
          <span className="block truncate text-xs font-normal text-muted-foreground">
            {user.email}
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/profile" className="cursor-pointer">
            <UserRound className="size-4" />
            Hồ sơ
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <div className="px-2 py-1">
          <LogoutButton />
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
```

- [ ] **Step 4: Update app layout**

Modify `src/app/(app)/layout.tsx`:

```tsx
import Link from "next/link";
import { redirect } from "next/navigation";
import { Bot } from "lucide-react";

import { AppNav } from "@/components/app-nav";
import { AccountMenu } from "@/components/auth/account-menu";
import { AiChatWidget } from "@/features/ai-chat/widget";
import { UserLocalTimeSync } from "@/features/dashboard/user-local-time-sync";
import { getCurrentSession } from "@/lib/auth-session";
import { db } from "@/lib/db";
```

Replace the current email/logout block:

```tsx
<div className="flex items-center gap-2">
  <AccountMenu user={session.user} />
</div>
```

- [ ] **Step 5: Verify account menu tests pass**

Run: `pnpm test --runInBand tests/account-menu.test.ts`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/components/auth/account-menu.tsx 'src/app/(app)/layout.tsx' tests/account-menu.test.ts
git commit -m "feat: add header account menu"
```

## Task 6: Final Verification

**Files:**
- All files changed in Tasks 1-5.

- [ ] **Step 1: Run targeted tests**

Run:

```bash
pnpm test --runInBand tests/profile-actions.test.ts tests/profile-forms.test.ts tests/account-menu.test.ts
```

Expected: PASS.

- [ ] **Step 2: Run full test suite**

Run:

```bash
pnpm test --runInBand
```

Expected: PASS.

- [ ] **Step 3: Run lint**

Run:

```bash
pnpm lint
```

Expected: PASS.

- [ ] **Step 4: Run production build**

Run:

```bash
pnpm build
```

Expected: PASS.

- [ ] **Step 5: Manual browser smoke check**

Run:

```bash
pnpm dev
```

Open the local app and verify:

- Header shows avatar or initial instead of email text.
- Account menu opens and includes `Hồ sơ` and `Đăng xuất`.
- `/profile` loads for a signed-in user.
- Updating name/avatar URL changes the header after save.
- Empty avatar URL falls back to initial.
- Password form validates mismatched confirmation before calling Better Auth.

- [ ] **Step 6: Commit verification fixes if needed**

If verification exposed fixes, commit only those relevant files:

```bash
git status --short
git add src/features/profile tests/profile-actions.test.ts tests/profile-forms.test.ts tests/account-menu.test.ts src/components/auth/account-menu.tsx 'src/app/(app)/profile/page.tsx' 'src/app/(app)/layout.tsx'
git commit -m "fix: stabilize profile settings"
```

If no fixes were needed, do not create an empty commit.

## Self-Review Notes

- Spec coverage: profile page, name/avatar update, readonly email, password change, revoke sessions checkbox, header avatar menu, errors, and tests are covered.
- Scope check: no email change, no file upload, no account deletion, no public profile API.
- Type consistency: `ProfileFormValues`, `PasswordFormValues`, `updateProfileAction`, and `AccountMenu` props are defined before use.
- Verification includes targeted tests, full Jest, lint, build, and a browser smoke check.
