import Link from "next/link";
import { Bot, CheckCircle2 } from "lucide-react";

import { LoginForm } from "@/components/auth/login-form";
import { Button } from "@/components/ui/button";

type LoginPageProps = {
  searchParams: Promise<{
    reset?: string | string[];
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const reset = Array.isArray(params.reset) ? params.reset[0] : params.reset;
  const showResetSuccess = reset === "success";

  return (
    <main className="min-h-dvh bg-transparent px-6 py-8 text-foreground">
      <section className="mx-auto grid min-h-[calc(100dvh-4rem)] w-full max-w-5xl items-center gap-8 lg:grid-cols-[0.92fr_1.08fr]">
        <div className="space-y-7">
          <Link href="/" className="inline-flex items-center gap-2 text-sm font-bold">
            <span className="rounded-lg bg-primary p-2 text-white shadow-[0_10px_24px_rgba(47,107,79,0.22)]">
              <Bot className="size-4" />
            </span>
            MoneyMind AI
          </Link>
          <div className="space-y-4">
            <h1 className="max-w-xl text-4xl font-extrabold leading-tight md:text-5xl">
              Hiểu rõ tài chính của bạn. Xây dựng thói quen tốt hơn với AI.
            </h1>
            <p className="max-w-lg text-base leading-7 text-muted-foreground">
              Đăng nhập để quay lại dashboard, activity feed và huấn luyện viên
              tài chính cá nhân của bạn.
            </p>
          </div>
          <div className="grid gap-3 text-sm text-muted-foreground sm:grid-cols-2">
            <p className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
              AI phân loại giao dịch từ mô tả tự nhiên.
            </p>
            <p className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
              Insight tháng giúp bạn biết nên chỉnh gì trước.
            </p>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card/92 p-5 shadow-[0_24px_80px_rgba(47,42,31,0.10)] md:p-6">
          <div className="mb-5">
            <p className="text-sm font-medium text-muted-foreground">
              Chào mừng trở lại
            </p>
          <h2 className="mt-2 text-2xl font-bold">
            Đăng nhập
          </h2>
        </div>
        {showResetSuccess ? (
          <p className="mb-4 rounded-lg border border-primary/20 bg-primary/10 px-3 py-2 text-sm font-medium text-primary">
            Đặt lại mật khẩu thành công. Vui lòng đăng nhập bằng mật khẩu mới.
          </p>
        ) : null}
        <LoginForm />
          <Button asChild variant="outline" className="mt-4 w-full border-input">
            <Link href="/">Quay lại trang chủ</Link>
          </Button>
        </div>
      </section>
    </main>
  );
}
