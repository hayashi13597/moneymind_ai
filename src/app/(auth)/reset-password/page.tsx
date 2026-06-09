import Link from "next/link";
import { Bot, ShieldCheck } from "lucide-react";

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
                Bảo mật tài khoản
              </p>
              <h1 className="max-w-xl text-3xl font-semibold tracking-normal text-foreground sm:text-4xl">
                Đặt mật khẩu mới cho tài khoản của bạn.
              </h1>
              <p className="max-w-xl text-base leading-7 text-muted-foreground">
                Chọn mật khẩu mới tối thiểu 8 ký tự. Sau khi đặt lại, bạn có
                thể đăng nhập bằng mật khẩu mới.
              </p>
            </div>
            <p className="flex gap-2 text-sm text-muted-foreground">
              <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" />
              Các phiên đăng nhập khác sẽ được thu hồi để giữ tài khoản an toàn.
            </p>
          </section>

          <section className="rounded-2xl border border-warm-border bg-surface p-6 shadow-[0_24px_70px_rgba(33,41,34,0.12)]">
            <div className="mb-6 space-y-2">
              <h2 className="text-xl font-semibold">Đặt lại mật khẩu</h2>
              <p className="text-sm text-muted-foreground">
                Liên kết chỉ dùng được một lần trong thời hạn cho phép.
              </p>
            </div>
            <ResetPasswordForm token={token ?? null} />
          </section>
        </div>
      </div>
    </main>
  );
}
