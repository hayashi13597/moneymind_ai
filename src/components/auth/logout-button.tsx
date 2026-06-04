"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { type ComponentProps, type MouseEvent, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { authClient } from "@/lib/auth-client";

type LogoutButtonProps = {
  showLabel?: boolean;
} & ComponentProps<typeof Button>;

export function LogoutButton({
  showLabel,
  className,
  disabled,
  onClick,
  ...props
}: LogoutButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleLogout(event: MouseEvent<HTMLButtonElement>) {
    onClick?.(event);

    if (event.defaultPrevented) {
      return;
    }

    startTransition(async () => {
      await authClient.signOut();
      router.push("/login");
      router.refresh();
    });
  }

  return (
    <Button
      {...props}
      aria-label="Đăng xuất"
      className={cn(
        showLabel && "h-9 w-full justify-start gap-2 px-2 font-medium",
        className,
      )}
      disabled={disabled || isPending}
      onClick={handleLogout}
      size={showLabel ? "default" : "icon"}
      title="Đăng xuất"
      type="button"
      variant="ghost"
    >
      <LogOut />
      {showLabel ? <span>Đăng xuất</span> : null}
    </Button>
  );
}
