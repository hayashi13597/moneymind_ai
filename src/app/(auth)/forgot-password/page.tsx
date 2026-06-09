import Link from "next/link";
import { ArrowLeft, Bot, CheckCircle2, Mail } from "lucide-react";

import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";

export default function ForgotPasswordPage() {
  return (
    <main className="min-h-dvh bg-app-gradient px-4 py-6 text-foreground sm:px-6 lg:px-8">
      <div className="mx-auto flex min-h-[calc(100dvh-3rem)] w-full max-w-6xl items-center">
        <div className="grid w-full gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(24rem,28rem)] lg:items-center">
          <section className="space-y-8 py-4">
            <Link
              className="inline-flex items-center gap-2 text-sm font-semibold transition-colors hover:text-primary"
              href="/"
            >
              <span className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-[0_10px_24px_rgba(47,107,79,0.22)]">
                <Bot className="size-4" />
              </span>
              MoneyMind AI
            </Link>

            <div className="max-w-2xl space-y-4">
              <p className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
                <Mail className="size-4" />
                Lấy lại quyền truy cập
              </p>
              <h1 className="text-4xl font-semibold leading-[1.05] tracking-normal text-foreground sm:text-5xl">
                Khôi phục mật khẩu cho tài khoản MoneyMind.
              </h1>
              <p className="max-w-xl text-base leading-7 text-muted-foreground">
                Nhập email bạn dùng để đăng nhập. Nếu tài khoản tồn tại, chúng
                tôi sẽ gửi một liên kết đặt lại mật khẩu.
              </p>
            </div>

            <div className="grid max-w-2xl gap-3 sm:grid-cols-2">
              <div className="rounded-2xl bg-surface/70 p-4 shadow-[0_18px_50px_rgba(47,107,79,0.08)] ring-1 ring-warm-border/80">
                <CheckCircle2 className="mb-3 size-5 text-primary" />
                <p className="text-sm font-medium text-foreground">
                  Email được kiểm tra riêng tư
                </p>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  MoneyMind không tiết lộ email có tồn tại trong hệ thống hay
                  không.
                </p>
              </div>
              <div className="rounded-2xl bg-surface/70 p-4 shadow-[0_18px_50px_rgba(156,127,79,0.08)] ring-1 ring-warm-border/80">
                <ArrowLeft className="mb-3 size-5 text-primary" />
                <p className="text-sm font-medium text-foreground">
                  Quay lại bất cứ lúc nào
                </p>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  Nếu bạn nhớ mật khẩu, chỉ cần trở lại màn hình đăng nhập.
                </p>
              </div>
            </div>
          </section>

          <section className="rounded-[1.75rem] bg-surface/95 p-5 shadow-[0_28px_90px_rgba(33,41,34,0.16)] ring-1 ring-warm-border/90 sm:p-6">
            <div className="mb-6 space-y-2">
              <p className="text-sm font-medium text-primary">Quên mật khẩu</p>
              <h2 className="text-2xl font-semibold tracking-normal">
                Gửi liên kết đặt lại
              </h2>
              <p className="text-sm leading-6 text-muted-foreground">
                Liên kết sẽ được gửi đến email nếu tài khoản đã được đăng ký.
              </p>
            </div>
            <ForgotPasswordForm />
          </section>
        </div>
      </div>
    </main>
  );
}
