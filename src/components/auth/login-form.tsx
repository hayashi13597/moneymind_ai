"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth-client";
import { createZodResolver } from "@/lib/zod-form";

const INPUT_CLASS =
  "h-11 w-full rounded-xl border border-warm-border bg-surface px-3 text-sm outline-none transition-colors focus:border-primary focus:ring-3 focus:ring-primary/15";
const loginFormSchema = z.object({
  email: z.email("Email không hợp lệ."),
  password: z.string().min(1, "Mật khẩu là bắt buộc."),
});

type LoginFormValues = z.infer<typeof loginFormSchema>;

export function LoginForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const form = useForm<LoginFormValues>({
    resolver: createZodResolver(loginFormSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  async function handleSubmit(values: LoginFormValues) {
    setError(null);

    const result = await authClient.signIn.email(values);

    if (result.error) {
      setError("Email hoặc mật khẩu không đúng.");
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
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
                  inputMode="email"
                  placeholder="ban@example.com"
                  type="email"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Mật khẩu</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  autoComplete="current-password"
                  className={INPUT_CLASS}
                  placeholder="Nhập mật khẩu"
                  type="password"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        {error ? (
          <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        ) : null}
        <Button
          className="h-11 w-full bg-primary hover:bg-primary-hover"
          disabled={form.formState.isSubmitting}
          type="submit"
        >
          {form.formState.isSubmitting ? "Đang đăng nhập..." : "Đăng nhập"}
        </Button>
        <p className="text-center text-sm text-muted-foreground">
          Chưa có tài khoản?{" "}
          <Link
            className="font-medium text-foreground hover:underline"
            href="/signup"
          >
            Tạo tài khoản
          </Link>
        </p>
      </form>
    </Form>
  );
}
