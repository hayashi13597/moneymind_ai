"use client";

import Link from "next/link";
import { useEffect } from "react";
import { RefreshCw } from "lucide-react";

import { CoachEmptyState, CoachPageShell } from "@/components/coach-ui";
import { Button } from "@/components/ui/button";

type AppErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function AppError({ error, reset }: AppErrorProps) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <CoachPageShell>
      <CoachEmptyState
        title="MoneyMind chưa mở được phiên này"
        description="Dữ liệu tài chính vẫn được giữ nguyên. Hãy thử tải lại phiên cố vấn hoặc quay về tổng quan để tiếp tục từ tháng hiện tại."
      >
        <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Button
            type="button"
            onClick={reset}
            className="h-11 bg-[#2F6B4F] hover:bg-[#285B43]"
          >
            <RefreshCw className="size-4" />
            Thử tải lại
          </Button>
          <Button asChild type="button" variant="outline" className="h-11">
            <Link href="/dashboard">Quay lại tổng quan</Link>
          </Button>
        </div>
      </CoachEmptyState>
    </CoachPageShell>
  );
}
