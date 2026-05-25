import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function SignupPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6 py-12">
      <section className="w-full max-w-sm space-y-5">
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">
            MoneyMind AI
          </p>
          <h1 className="text-2xl font-semibold tracking-normal">
            Tạo tài khoản
          </h1>
          <p className="text-sm leading-6 text-muted-foreground">
            Form đăng ký sẽ được triển khai trong Phase 2.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/">Quay lại trang chủ</Link>
        </Button>
      </section>
    </main>
  );
}
