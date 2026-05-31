import Link from "next/link";
import { Bot, CheckCircle2 } from "lucide-react";

import { SignupForm } from "@/components/auth/signup-form";
import { Button } from "@/components/ui/button";

export default function SignupPage() {
  return (
    <main className="min-h-screen bg-background px-6 py-8 text-foreground">
      <section className="mx-auto grid min-h-[calc(100dvh-4rem)] w-full max-w-5xl items-center gap-8 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="space-y-7">
          <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold">
            <span className="rounded-full bg-[#2F6B4F] p-2 text-white">
              <Bot className="size-4" />
            </span>
            MoneyMind AI
          </Link>
          <div className="space-y-4">
            <h1 className="max-w-xl text-4xl font-semibold tracking-normal md:text-5xl">
              Start calm. Let AI learn your spending habits.
            </h1>
            <p className="max-w-lg text-base leading-7 text-muted-foreground">
              Tạo tài khoản để bắt đầu ghi giao dịch, dùng danh mục mặc định và
              nhận insight tài chính ngay khi có dữ liệu.
            </p>
          </div>
          <div className="grid gap-3 text-sm text-muted-foreground sm:grid-cols-2">
            <p className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-[#2F6B4F]" />
              Có sẵn danh mục thu chi để nhập nhanh.
            </p>
            <p className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-[#2F6B4F]" />
              Chat AI giúp bạn kiểm tra quyết định chi tiêu.
            </p>
          </div>
        </div>
        <div className="rounded-2xl border border-[#E1DDD4] bg-card p-5 shadow-[0_18px_60px_rgba(47,42,31,0.08)] md:p-6">
          <div className="mb-5">
            <p className="text-sm font-medium text-muted-foreground">
              Thiết lập trong một phút
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-normal">
              Tạo tài khoản
            </h2>
          </div>
          <SignupForm />
          <Button asChild variant="outline" className="mt-4 w-full border-[#DDD8CE]">
            <Link href="/">Quay lại trang chủ</Link>
          </Button>
        </div>
      </section>
    </main>
  );
}
