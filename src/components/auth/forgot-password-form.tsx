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

    let result;

    try {
      result = await authClient.requestPasswordReset({
        email: values.email,
        redirectTo: `${window.location.origin}/reset-password`,
      });
    } catch {
      setStatus("error");
      return;
    }

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
