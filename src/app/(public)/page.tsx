import Link from "next/link";
import { ArrowRight, BadgeCheck, Bot, MessageCircle } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function PublicHomePage() {
  return (
    <main className="flex min-h-screen flex-col bg-background text-foreground">
      <section className="mx-auto grid w-full max-w-6xl flex-1 items-center gap-10 px-6 py-12 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="space-y-8">
          <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold">
            <span className="rounded-full bg-primary p-2 text-white">
              <Bot className="size-4" />
            </span>
            MoneyMind AI
          </Link>
          <div className="space-y-5">
            <h1 className="max-w-3xl text-5xl font-semibold tracking-normal sm:text-6xl">
              Huấn luyện viên tài chính AI cho chi tiêu hàng ngày.
            </h1>
            <p className="max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
              Ghi lại giao dịch, hiểu thói quen chi tiêu và hỏi AI trước các
              quyết định tài chính. Bình tĩnh, rõ ràng, dành cho tiền cá nhân
              bằng VND.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button asChild className="h-11 bg-primary hover:bg-primary-hover">
              <Link href="/dashboard">
                Vào ứng dụng
                <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button asChild variant="secondary" className="h-11">
              <Link href="/signup">Tạo tài khoản</Link>
            </Button>
            <Button asChild variant="outline" className="h-11 border-input">
              <Link href="/login">Đăng nhập</Link>
            </Button>
          </div>
          <div className="grid gap-3 text-sm text-muted-foreground sm:grid-cols-3">
            <p className="flex items-start gap-2">
              <BadgeCheck className="mt-0.5 size-4 shrink-0 text-primary" />
              Nhập nhanh bằng ngôn ngữ tự nhiên.
            </p>
            <p className="flex items-start gap-2">
              <BadgeCheck className="mt-0.5 size-4 shrink-0 text-primary" />
              Dashboard tháng đọc được ngay.
            </p>
            <p className="flex items-start gap-2">
              <BadgeCheck className="mt-0.5 size-4 shrink-0 text-primary" />
              Chat AI theo dữ liệu của bạn.
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-warm-border bg-card p-5 shadow-[0_18px_60px_rgba(47,42,31,0.08)]">
          <div className="rounded-2xl border border-soft-border bg-soft-accent p-5">
            <div className="flex items-start gap-3">
              <div className="rounded-full bg-primary p-2 text-white">
                <MessageCircle className="size-4" />
              </div>
              <div>
                <p className="text-sm font-semibold">MoneyMind Coach</p>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  “Tháng này tôi đã chi quá tay ở đâu?”
                </p>
              </div>
            </div>
            <div className="mt-5 rounded-2xl border border-soft-border bg-white/80 p-4 text-sm leading-6">
              Chi tiêu ăn uống đang tăng nhanh hơn tháng trước. Nếu muốn giữ tỷ
              lệ tiết kiệm ổn định, hãy đặt giới hạn tuần cho food delivery và
              kiểm tra lại các khoản lặp lại.
            </div>
          </div>
          <div className="mt-5 grid gap-3">
            {[
              ["Dòng tiền tháng", "Tóm tắt ròng và xu hướng"],
              ["Danh mục cần chú ý", "Nổi bật khi tăng bất thường"],
              ["Giao dịch AI phân loại", "Có nhãn để bạn kiểm tra lại"],
            ].map(([label, value]) => (
              <div
                key={label}
                className="flex items-center justify-between gap-4 rounded-xl border border-border bg-surface px-4 py-3"
              >
                <span className="text-sm text-muted-foreground">{label}</span>
                <span className="text-sm font-semibold">{value}</span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
