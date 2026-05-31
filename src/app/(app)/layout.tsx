import Link from "next/link";
import { redirect } from "next/navigation";

import { LogoutButton } from "@/components/auth/logout-button";
import { AiChatWidget } from "@/features/ai-chat/widget";
import { getCurrentSession } from "@/lib/auth-session";
import { db } from "@/lib/db";

const navItems = [
  { href: "/dashboard", label: "Tổng quan" },
  { href: "/transactions", label: "Giao dịch" },
  { href: "/categories", label: "Danh mục" },
  { href: "/settings/ai", label: "AI" },
] as const;

export default async function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getCurrentSession();

  if (!session?.user) {
    redirect("/login");
  }

  const categories = await db.category.findMany({
    where: { userId: session.user.id },
    orderBy: [{ type: "asc" }, { name: "asc" }],
    select: { id: true, name: true, type: true },
  });

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-[#E1DDD4] bg-[#FAFAF8]/95">
        <div className="mx-auto flex min-h-16 w-full max-w-7xl flex-col gap-3 px-4 py-3 md:flex-row md:items-center md:justify-between md:py-0">
          <Link href="/dashboard" className="text-sm font-semibold">
            MoneyMind AI
          </Link>
          <nav className="flex flex-wrap items-center gap-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-full px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-[#F1EEE7] hover:text-foreground"
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <span className="hidden max-w-40 truncate text-sm text-muted-foreground sm:inline">
              {session.user.email}
            </span>
            <LogoutButton />
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-7xl px-4 py-8 md:py-10">
        {children}
      </main>
      <AiChatWidget categories={categories} />
    </div>
  );
}
