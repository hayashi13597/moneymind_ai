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
