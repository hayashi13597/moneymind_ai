"use client";

import { UserRound } from "lucide-react";
import Link from "next/link";

import { LogoutButton } from "@/components/auth/logout-button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type AccountMenuProps = {
  user: {
    name?: string | null;
    email: string;
    image?: string | null;
  };
};

function getInitial(user: AccountMenuProps["user"]) {
  const source = user.name?.trim() || user.email.trim();

  return source.charAt(0).toLocaleUpperCase("vi-VN");
}

export function AccountMenu({ user }: AccountMenuProps) {
  const displayName = user.name?.trim() || "Tài khoản";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="inline-flex size-10 items-center justify-center overflow-hidden rounded-full border border-[#D8E1D7] bg-[#ECF3ED] text-sm font-bold text-[#2F6B4F] shadow-[0_8px_22px_rgba(47,42,31,0.08)] transition hover:-translate-y-0.5 hover:bg-[#FFFDF7] focus-visible:ring-3 focus-visible:ring-primary/20 focus-visible:outline-none"
          aria-label="Mở menu tài khoản"
        >
          {user.image ? (
            <img
              src={user.image}
              alt={displayName}
              className="size-full object-cover"
            />
          ) : (
            <span>{getInitial(user)}</span>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-64 rounded-xl border-[#DED7CA] bg-[#FFFDF7]"
      >
        <DropdownMenuLabel className="space-y-1">
          <span className="block truncate text-sm font-semibold text-foreground">
            {displayName}
          </span>
          <span className="block truncate text-xs font-normal text-muted-foreground">
            {user.email}
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/profile" className="cursor-pointer">
            <UserRound className="size-4" />
            Hồ sơ
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <div className="px-2 py-1">
          <LogoutButton />
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
