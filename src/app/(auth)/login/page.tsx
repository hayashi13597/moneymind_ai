import Link from "next/link";
import { Bot, CheckCircle2 } from "lucide-react";

import { LoginForm } from "@/components/auth/login-form";
import { Button } from "@/components/ui/button";

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-background px-6 py-8 text-foreground">
      <section className="mx-auto grid min-h-[calc(100dvh-4rem)] w-full max-w-5xl items-center gap-8 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="space-y-7">
          <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold">
            <span className="rounded-full bg-primary p-2 text-white">
              <Bot className="size-4" />
            </span>
            MoneyMind AI
          </Link>
          <div className="space-y-4">
            <h1 className="max-w-xl text-4xl font-semibold tracking-normal md:text-5xl">
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
        <div className="rounded-2xl border border-border bg-card p-5 shadow-[0_18px_60px_rgba(47,42,31,0.08)] md:p-6">
          <div className="mb-5">
            <p className="text-sm font-medium text-muted-foreground">
              Chào mừng trở lại
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-normal">
              Đăng nhập
            </h2>
          </div>
          <LoginForm />
          <Button asChild variant="outline" className="mt-4 w-full border-input">
            <Link href="/">Quay lại trang chủ</Link>
          </Button>
        </div>
      </section>
    </main>
  );
}
