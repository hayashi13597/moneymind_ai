"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertCircle, CheckCircle2, KeyRound, LockKeyhole } from "lucide-react";
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
const INVALID_LINK_MESSAGE =
  "Liên kết đặt lại mật khẩu không hợp lệ. Vui lòng yêu cầu một liên kết mới.";
const EXPIRED_LINK_MESSAGE =
  "Liên kết này đã hết hạn hoặc đã được dùng. Vui lòng yêu cầu một liên kết mới.";
const SYSTEM_ERROR_MESSAGE =
  "Chúng tôi chưa thể cập nhật mật khẩu lúc này. Vui lòng thử lại sau.";

type ResetPasswordFormProps = {
  token: string | null;
};

export function ResetPasswordForm({ token }: ResetPasswordFormProps) {
  const router = useRouter();
  const [status, setStatus] = useState<
    "idle" | "invalid-token" | "system-error"
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
        <div
          className="flex gap-3 rounded-xl border border-destructive/20 bg-destructive/10 px-3 py-3 text-sm leading-6 text-destructive"
          role="alert"
        >
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          <p>{INVALID_LINK_MESSAGE}</p>
        </div>
        <Button asChild className="h-11 w-full">
          <Link href="/forgot-password">Gửi liên kết mới</Link>
        </Button>
        <p className="text-center text-sm text-muted-foreground">
          <Link
            className="font-medium text-primary transition-colors hover:text-primary/80"
            href="/login"
          >
            Quay lại đăng nhập
          </Link>
        </p>
      </div>
    );
  }

  const resetToken = token;

  async function handleSubmit(values: ResetPasswordFormInput) {
    setStatus("idle");

    let result;

    try {
      result = await authClient.resetPassword({
        token: resetToken,
        newPassword: values.newPassword,
      });
    } catch {
      setStatus("system-error");
      return;
    }

    if (result.error) {
      setStatus("invalid-token");
      return;
    }

    form.reset();
    router.push("/login?reset=success");
    router.refresh();
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
                <div className="relative">
                  <KeyRound className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    autoComplete="new-password"
                    className={`${INPUT_CLASS} pl-9`}
                    placeholder="Tối thiểu 8 ký tự"
                    type="password"
                    {...field}
                  />
                </div>
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
                <div className="relative">
                  <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    autoComplete="new-password"
                    className={`${INPUT_CLASS} pl-9`}
                    placeholder="Nhập lại để xác nhận"
                    type="password"
                    {...field}
                  />
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {status === "invalid-token" ? (
          <div
            className="flex gap-3 rounded-xl border border-destructive/20 bg-destructive/10 px-3 py-3 text-sm leading-6 text-destructive"
            role="alert"
          >
            <AlertCircle className="mt-0.5 size-4 shrink-0" />
            <p>{EXPIRED_LINK_MESSAGE}</p>
          </div>
        ) : null}
        {status === "system-error" ? (
          <div
            className="flex gap-3 rounded-xl border border-destructive/20 bg-destructive/10 px-3 py-3 text-sm leading-6 text-destructive"
            role="alert"
          >
            <AlertCircle className="mt-0.5 size-4 shrink-0" />
            <p>{SYSTEM_ERROR_MESSAGE}</p>
          </div>
        ) : null}

        <div className="rounded-xl bg-primary/8 px-3 py-3 text-sm leading-6 text-muted-foreground ring-1 ring-primary/15">
          <div className="flex gap-3">
            <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
            <p>
              Mật khẩu nên khác mật khẩu cũ và chỉ dùng riêng cho MoneyMind.
            </p>
          </div>
        </div>

        <Button
          className="h-11 w-full"
          disabled={form.formState.isSubmitting}
          id="resetPassword"
          type="submit"
        >
          {form.formState.isSubmitting
            ? "Đang cập nhật..."
            : "Cập nhật mật khẩu"}
        </Button>

        <p className="text-center text-sm text-muted-foreground">
          <Link
            className="font-medium text-primary transition-colors hover:text-primary/80"
            href="/login"
          >
            Quay lại đăng nhập
          </Link>
        </p>
      </form>
    </Form>
  );
}

export default ResetPasswordForm;
