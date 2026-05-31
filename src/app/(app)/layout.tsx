import Link from "next/link";
import { redirect } from "next/navigation";
import { Bot } from "lucide-react";

import { AppNav } from "@/components/app-nav";
import { LogoutButton } from "@/components/auth/logout-button";
import { AiChatWidget } from "@/features/ai-chat/widget";
import { UserLocalTimeSync } from "@/features/dashboard/user-local-time-sync";
import { getCurrentSession } from "@/lib/auth-session";
import { db } from "@/lib/db";

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
      <header className="sticky top-0 z-30 border-b border-[#E1DDD4] bg-[#FAFAF8]/95 backdrop-blur">
        <div className="mx-auto flex min-h-16 w-full max-w-7xl flex-col gap-3 px-4 py-3 md:flex-row md:items-center md:justify-between md:py-0">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-sm font-semibold"
          >
            <span className="rounded-full bg-[#2F6B4F] p-1.5 text-white">
              <Bot className="size-3.5" />
            </span>
            MoneyMind AI
          </Link>
          <AppNav />
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
      <UserLocalTimeSync />
      <AiChatWidget categories={categories} />
    </div>
  );
}
