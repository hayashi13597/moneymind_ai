"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", label: "Tổng quan" },
  { href: "/transactions", label: "Giao dịch" },
  { href: "/budgets", label: "Ngân sách" },
  { href: "/categories", label: "Danh mục" },
  { href: "/insights", label: "Nhận xét AI" },
  { href: "/reports", label: "Báo cáo" },
  { href: "/settings/ai", label: "Cấu hình AI" },
] as const;

export function AppNav() {
  const pathname = usePathname();

  return (
    <nav className="flex items-center gap-1 overflow-x-auto rounded-xl border border-[#DED7CA] bg-[#EEE8DC]/82 p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.75)] backdrop-blur">
      {navItems.map((item) => {
        const isActive =
          pathname === item.href || pathname.startsWith(`${item.href}/`);

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "shrink-0 rounded-lg px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors transition-shadow duration-200 hover:-translate-y-0.5 hover:bg-[#FFFDF7] hover:text-foreground focus-visible:ring-3 focus-visible:ring-primary/20 focus-visible:outline-none active:translate-y-0 motion-reduce:transform-none motion-reduce:transition-none",
              isActive &&
                "bg-[#FFFDF7] text-foreground shadow-[0_8px_22px_rgba(47,42,31,0.08)]",
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
