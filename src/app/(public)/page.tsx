import Link from "next/link";
import { ArrowRight, BadgeCheck, Bot, MessageCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function PublicHomePage() {
  return (
    <main className="flex min-h-dvh flex-col bg-transparent text-foreground">
      <section className="mx-auto grid w-full max-w-6xl flex-1 items-center gap-10 px-6 py-10 lg:grid-cols-[0.95fr_1.05fr] lg:py-14">
        <div className="space-y-8">
          <Link href="/" className="inline-flex items-center gap-2 text-sm font-bold">
            <span className="rounded-lg bg-primary p-2 text-white shadow-[0_10px_24px_rgba(47,107,79,0.22)]">
              <Bot className="size-4" />
            </span>
            MoneyMind AI
          </Link>
          <div className="space-y-5">
            <h1 className="max-w-3xl text-5xl font-extrabold leading-[0.98] sm:text-6xl">
              Theo dõi thu chi VND rõ ràng hơn với MoneyMind AI.
            </h1>
            <p className="max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
              Ghi giao dịch thủ công hoặc nhập nhanh bằng câu như &quot;ăn trưa
              55k&quot;. MoneyMind tạo nháp để bạn kiểm tra trước khi lưu, rồi
              tổng hợp thu chi theo từng tháng.
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
              Tổng quan tháng có thu nhập, chi tiêu và so sánh.
            </p>
            <p className="flex items-start gap-2">
              <BadgeCheck className="mt-0.5 size-4 shrink-0 text-primary" />
              AI tạo nhận xét, trả lời câu hỏi và chuẩn bị nháp giao dịch.
            </p>
          </div>
        </div>

        <Card className="gap-0 rounded-xl border-warm-border bg-card/92 py-0 shadow-[0_24px_80px_rgba(47,42,31,0.10)]">
          <CardContent className="p-4 md:p-5">
            <div className="rounded-xl border border-soft-border bg-soft-accent/90 p-5">
              <div className="flex items-start gap-3">
                <div className="rounded-lg bg-primary p-2 text-white">
                  <MessageCircle className="size-4" />
                </div>
                <div>
                  <p className="text-sm font-semibold">MoneyMind</p>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">
                    “Tháng này tôi tiêu nhiều nhất vào đâu?”
                  </p>
                </div>
              </div>
              <div className="mt-5 rounded-xl border border-soft-border bg-white/78 p-4 text-sm leading-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]">
                MoneyMind dùng giao dịch trong tháng để tóm tắt dòng tiền, chỉ
                ra danh mục nổi bật và gợi ý bước tiếp theo. Với giao dịch mới,
                AI chỉ tạo nháp để bạn kiểm tra trước khi lưu.
              </div>
            </div>
            <div className="mt-5 grid gap-3">
              {[
                ["Dòng tiền tháng", "Thu nhập, chi tiêu, số dư"],
                ["Danh mục", "Tạo, sửa, xóa và theo dõi biến động"],
                ["Nháp từ AI", "Kiểm tra lại trước khi lưu"],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="flex items-center justify-between gap-4 rounded-lg border border-border bg-surface/82 px-4 py-3"
                >
                  <span className="text-sm text-muted-foreground">{label}</span>
                  <span className="text-sm font-semibold">{value}</span>
                </div>
              ))}
            </div>
            <div className="mt-5 grid grid-cols-[1.1fr_0.9fr] gap-3">
              <div className="rounded-lg bg-[#16140F] p-4 text-white">
                <p className="text-xs font-medium text-white/60">Số dư tháng</p>
                <p className="mt-3 text-2xl font-bold">+4.720.000đ</p>
                <div className="mt-5 h-2 rounded-full bg-white/15">
                  <div className="h-2 w-[64%] rounded-full bg-[#8DBA91]" />
                </div>
              </div>
              <div className="rounded-lg border border-[#E5D8C4] bg-[#FBF0D4] p-4">
                <p className="text-xs font-medium text-[#8A5B25]">Cần xem</p>
                <p className="mt-3 text-sm font-semibold leading-5">
                  Ăn uống tăng 18% so với tháng trước.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
