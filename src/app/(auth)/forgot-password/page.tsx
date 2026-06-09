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
