"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";

export function SignupForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    setError(null);

    startTransition(async () => {
      const name = String(formData.get("name") ?? "");
      const email = String(formData.get("email") ?? "");
      const password = String(formData.get("password") ?? "");

      const result = await authClient.signUp.email({
        name,
        email,
        password,
      });

      if (result.error) {
        setError("Không thể tạo tài khoản với thông tin này.");
        return;
      }

      router.push("/dashboard");
      router.refresh();
    });
  }

  return (
    <form action={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="name">
          Tên hiển thị
        </label>
        <input
          required
          autoComplete="name"
          className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none transition-colors focus:border-ring focus:ring-3 focus:ring-ring/20"
          id="name"
          name="name"
          placeholder="Nguyễn Văn A"
          type="text"
        />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="email">
          Email
        </label>
        <input
          required
          autoComplete="email"
          className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none transition-colors focus:border-ring focus:ring-3 focus:ring-ring/20"
          id="email"
          name="email"
          placeholder="ban@example.com"
          type="email"
        />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="password">
          Mật khẩu
        </label>
        <input
          required
          autoComplete="new-password"
          className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none transition-colors focus:border-ring focus:ring-3 focus:ring-ring/20"
          id="password"
          minLength={8}
          name="password"
          type="password"
        />
      </div>
      {error ? (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}
      <Button className="w-full" disabled={isPending} type="submit">
        {isPending ? "Đang tạo tài khoản..." : "Tạo tài khoản"}
      </Button>
      <p className="text-center text-sm text-muted-foreground">
        Đã có tài khoản?{" "}
        <Link className="font-medium text-foreground hover:underline" href="/login">
          Đăng nhập
        </Link>
      </p>
    </form>
  );
}
