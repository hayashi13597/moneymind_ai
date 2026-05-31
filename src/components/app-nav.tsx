"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", label: "Tổng quan" },
  { href: "/transactions", label: "Giao dịch" },
  { href: "/categories", label: "Danh mục" },
  { href: "/settings/ai", label: "AI Coach" },
] as const;

export function AppNav() {
  const pathname = usePathname();

  return (
    <nav className="flex items-center gap-1 overflow-x-auto rounded-full border border-[#E1DDD4] bg-[#F3F0E9] p-1 md:overflow-visible">
      {navItems.map((item) => {
        const isActive =
          pathname === item.href || pathname.startsWith(`${item.href}/`);

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "shrink-0 rounded-full px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-[#FDFCF8] hover:text-foreground",
              isActive && "bg-[#FDFCF8] font-medium text-foreground shadow-sm",
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
