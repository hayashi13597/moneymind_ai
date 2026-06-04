import Link from "next/link";
import { redirect } from "next/navigation";
import { Bot } from "lucide-react";

import { AppNav } from "@/components/app-nav";
import { AccountMenu } from "@/components/auth/account-menu";
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
    <div className="min-h-screen bg-transparent text-foreground">
      <header className="sticky top-0 z-30 border-b border-[#DED7CA]/85 bg-[#FBFAF5]/88 backdrop-blur-xl">
        <div className="mx-auto flex min-h-16 w-full max-w-7xl flex-col gap-3 px-4 py-3 md:flex-row md:items-center md:justify-between md:py-0">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-sm font-bold"
          >
            <span className="rounded-lg bg-[#2F6B4F] p-1.5 text-white shadow-[0_8px_20px_rgba(47,107,79,0.22)]">
              <Bot className="size-3.5" />
            </span>
            MoneyMind AI
          </Link>
          <AppNav />
          <div className="flex items-center gap-2">
            <AccountMenu user={session.user} />
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
