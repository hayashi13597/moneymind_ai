"use client";

import { UserRound } from "lucide-react";
import Image from "next/image";
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
            <Image
              src={user.image}
              alt={displayName}
              width={40}
              height={40}
              className="size-full object-cover"
              // TODO: Profile avatars currently accept arbitrary HTTPS URLs, so
              // this cannot use a narrow Next.js remotePatterns allowlist yet.
              unoptimized
            />
          ) : (
            <span>{getInitial(user)}</span>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-72 rounded-xl border-[#E1DDD4] bg-card/95 p-2 shadow-[0_18px_58px_rgba(47,42,31,0.09)]"
      >
        <DropdownMenuLabel className="flex items-center gap-3 rounded-lg bg-[#F8F5EE] px-3 py-2.5">
          <span className="inline-flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-full border border-[#D8E1D7] bg-[#ECF3ED] text-sm font-bold text-[#2F6B4F]">
            {user.image ? (
              <Image
                src={user.image}
                alt=""
                width={36}
                height={36}
                className="size-full object-cover"
                aria-hidden="true"
                // TODO: Profile avatars currently accept arbitrary HTTPS URLs,
                // so this cannot use a narrow Next.js remotePatterns allowlist yet.
                unoptimized
              />
            ) : (
              getInitial(user)
            )}
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold text-foreground">
              {displayName}
            </span>
            <span className="block truncate text-xs font-normal text-muted-foreground">
              {user.email}
            </span>
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/profile" className="h-9 cursor-pointer gap-2 px-2">
            <UserRound className="size-4" />
            Hồ sơ
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <LogoutButton showLabel />
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
