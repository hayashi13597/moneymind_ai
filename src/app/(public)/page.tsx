import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function PublicHomePage() {
  return (
    <main className="flex min-h-screen flex-col bg-background text-foreground">
      <section className="mx-auto flex w-full max-w-5xl flex-1 flex-col justify-center gap-8 px-6 py-16">
        <div className="max-w-2xl space-y-4">
          <p className="text-sm font-medium text-muted-foreground">
            MoneyMind AI
          </p>
          <h1 className="text-4xl font-semibold tracking-normal sm:text-5xl">
            Quản lý thu chi cá nhân bằng tiếng Việt.
          </h1>
          <p className="text-base leading-7 text-muted-foreground sm:text-lg">
            Nền tảng MVP sẽ tập trung vào nhập giao dịch, dashboard tháng và
            insight tài chính sau khi các phase tiếp theo hoàn tất.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button asChild>
            <Link href="/dashboard">Vào ứng dụng</Link>
          </Button>
          <Button asChild variant="secondary">
            <Link href="/signup">Tạo tài khoản</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/login">Đăng nhập</Link>
          </Button>
        </div>
      </section>
    </main>
  );
}
