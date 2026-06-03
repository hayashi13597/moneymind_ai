import Link from "next/link";
import { ArrowRight, BadgeCheck, Bot, MessageCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

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
              Quản lý thu chi VND với dashboard và AI hỗ trợ.
            </h1>
            <p className="max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
              Ghi giao dịch thủ công hoặc nhờ AI đọc mô tả nhanh như
              &quot;ăn trưa 55k&quot;, duyệt lại trước khi lưu, rồi xem tổng quan
              thu chi theo từng tháng.
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
              Nhập thu chi thủ công hoặc bằng mô tả tự nhiên.
            </p>
            <p className="flex items-start gap-2">
              <BadgeCheck className="mt-0.5 size-4 shrink-0 text-primary" />
              Dashboard tháng có thu nhập, chi tiêu và so sánh.
            </p>
            <p className="flex items-start gap-2">
              <BadgeCheck className="mt-0.5 size-4 shrink-0 text-primary" />
              AI tạo insight, chat và nháp giao dịch để bạn duyệt.
            </p>
          </div>
        </div>

        <Card className="gap-0 rounded-2xl border-warm-border bg-card py-0 shadow-[0_18px_60px_rgba(47,42,31,0.08)]">
          <CardContent className="p-5">
            <div className="rounded-2xl border border-soft-border bg-soft-accent p-5">
              <div className="flex items-start gap-3">
                <div className="rounded-full bg-primary p-2 text-white">
                  <MessageCircle className="size-4" />
                </div>
                <div>
                  <p className="text-sm font-semibold">MoneyMind Coach</p>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">
                    “Tháng này tôi tiêu nhiều nhất vào đâu?”
                  </p>
                </div>
              </div>
              <div className="mt-5 rounded-2xl border border-soft-border bg-white/80 p-4 text-sm leading-6">
                MoneyMind dùng giao dịch trong tháng để tóm tắt dòng tiền, chỉ ra
                danh mục nổi bật và gợi ý bước tiếp theo. Kết quả AI luôn để bạn
                kiểm tra trước khi lưu giao dịch mới.
              </div>
            </div>
            <div className="mt-5 grid gap-3">
              {[
                ["Dòng tiền tháng", "Thu nhập, chi tiêu, số dư"],
                ["Danh mục", "Tạo, sửa, xóa và theo dõi biến động"],
                ["AI giao dịch", "Điền nháp để bạn kiểm tra rồi lưu"],
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
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
