import Link from "next/link";
import { Bot, CheckCircle2 } from "lucide-react";

import { SignupForm } from "@/components/auth/signup-form";
import { Button } from "@/components/ui/button";

export default function SignupPage() {
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
              Bắt đầu bình tĩnh. Để AI học thói quen chi tiêu của bạn.
            </h1>
            <p className="max-w-lg text-base leading-7 text-muted-foreground">
              Tạo tài khoản để bắt đầu ghi giao dịch, dùng danh mục mặc định và
              nhận insight tài chính ngay khi có dữ liệu.
            </p>
          </div>
          <div className="grid gap-3 text-sm text-muted-foreground sm:grid-cols-2">
            <p className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
              Có sẵn danh mục thu chi để nhập nhanh.
            </p>
            <p className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
              Chat AI giúp bạn kiểm tra quyết định chi tiêu.
            </p>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card/92 p-5 shadow-[0_24px_80px_rgba(47,42,31,0.10)] md:p-6">
          <div className="mb-5">
            <p className="text-sm font-medium text-muted-foreground">
              Thiết lập trong một phút
            </p>
            <h2 className="mt-2 text-2xl font-bold">
              Tạo tài khoản
            </h2>
          </div>
          <SignupForm />
          <Button asChild variant="outline" className="mt-4 w-full border-input">
            <Link href="/">Quay lại trang chủ</Link>
          </Button>
        </div>
      </section>
    </main>
  );
}
