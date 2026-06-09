"use client";

import Link from "next/link";
import { AlertCircle, CheckCircle2, Mail } from "lucide-react";
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
  "Nếu email này đã đăng ký, MoneyMind sẽ gửi liên kết đặt lại mật khẩu trong vài phút.";
const ERROR_MESSAGE =
  "Chúng tôi chưa thể gửi liên kết lúc này. Vui lòng thử lại sau.";

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
              <FormLabel>Email đăng nhập</FormLabel>
              <FormControl>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    autoComplete="email"
                    className={`${INPUT_CLASS} pl-9`}
                    placeholder="ban@example.com"
                    type="email"
                    {...field}
                  />
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {status === "success" ? (
          <div
            aria-live="polite"
            className="flex gap-3 rounded-xl border border-primary/20 bg-primary/10 px-3 py-3 text-sm leading-6 text-primary"
            role="status"
          >
            <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
            <p>{SUCCESS_MESSAGE}</p>
          </div>
        ) : null}
        {status === "error" ? (
          <div
            className="flex gap-3 rounded-xl border border-destructive/20 bg-destructive/10 px-3 py-3 text-sm leading-6 text-destructive"
            role="alert"
          >
            <AlertCircle className="mt-0.5 size-4 shrink-0" />
            <p>{ERROR_MESSAGE}</p>
          </div>
        ) : null}

        <Button
          className="h-11 w-full"
          disabled={form.formState.isSubmitting}
          id="requestPasswordReset"
          type="submit"
        >
          {form.formState.isSubmitting
            ? "Đang gửi..."
            : "Gửi liên kết đặt lại"}
        </Button>

        <p className="text-center text-sm text-muted-foreground">
          Đã nhớ mật khẩu?{" "}
          <Link
            className="font-medium text-primary transition-colors hover:text-primary/80"
            href="/login"
          >
            Đăng nhập
          </Link>
        </p>
      </form>
    </Form>
  );
}

export default ForgotPasswordForm;
