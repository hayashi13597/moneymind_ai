import Link from "next/link";
import { Bot, KeyRound, LockKeyhole, ShieldCheck } from "lucide-react";

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
                <KeyRound className="size-4" />
                Tạo mật khẩu mới
              </p>
              <h1 className="text-4xl font-semibold leading-[1.05] tracking-normal text-foreground sm:text-5xl">
                Đặt lại mật khẩu trong vài bước ngắn.
              </h1>
              <p className="max-w-xl text-base leading-7 text-muted-foreground">
                Chọn mật khẩu mới có ít nhất 8 ký tự. Sau khi cập nhật, bạn có
                thể đăng nhập lại bằng mật khẩu vừa tạo.
              </p>
            </div>

            <div className="grid max-w-2xl gap-3 sm:grid-cols-2">
              <div className="rounded-2xl bg-surface/70 p-4 shadow-[0_18px_50px_rgba(47,107,79,0.08)] ring-1 ring-warm-border/80">
                <ShieldCheck className="mb-3 size-5 text-primary" />
                <p className="text-sm font-medium text-foreground">
                  Liên kết chỉ dùng một lần
                </p>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  Nếu liên kết hết hạn, bạn có thể yêu cầu gửi một liên kết mới.
                </p>
              </div>
              <div className="rounded-2xl bg-surface/70 p-4 shadow-[0_18px_50px_rgba(156,127,79,0.08)] ring-1 ring-warm-border/80">
                <LockKeyhole className="mb-3 size-5 text-primary" />
                <p className="text-sm font-medium text-foreground">
                  Phiên cũ được bảo vệ
                </p>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  Sau khi đổi mật khẩu, hãy đăng nhập lại để tiếp tục dùng app.
                </p>
              </div>
            </div>
          </section>

          <section className="rounded-[1.75rem] bg-surface/95 p-5 shadow-[0_28px_90px_rgba(33,41,34,0.16)] ring-1 ring-warm-border/90 sm:p-6">
            <div className="mb-6 space-y-2">
              <p className="text-sm font-medium text-primary">
                Bảo mật tài khoản
              </p>
              <h2 className="text-2xl font-semibold tracking-normal">
                Cập nhật mật khẩu
              </h2>
              <p className="text-sm leading-6 text-muted-foreground">
                Dùng mật khẩu riêng cho MoneyMind để bảo vệ dữ liệu tài chính
                của bạn.
              </p>
            </div>
            <ResetPasswordForm token={token ?? null} />
          </section>
        </div>
      </div>
    </main>
  );
}
