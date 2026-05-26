"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";

export function LogoutButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleLogout() {
    startTransition(async () => {
      await authClient.signOut();
      router.push("/login");
      router.refresh();
    });
  }

  return (
    <Button
      aria-label="Đăng xuất"
      disabled={isPending}
      onClick={handleLogout}
      size="icon"
      title="Đăng xuất"
      type="button"
      variant="ghost"
    >
      <LogOut />
    </Button>
  );
}
