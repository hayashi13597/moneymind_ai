"use client";

import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { readLocalAiProviderSetting } from "@/features/ai/local-settings";
import type { MonthlyInsightDto } from "@/features/ai/monthly-insight";
import { MonthlyInsightMarkdown } from "@/features/ai/monthly-insight-markdown";

type MonthlyInsightPanelProps = {
  month: string;
  initialInsight: MonthlyInsightDto | null;
};

async function readJsonError(response: Response) {
  const payload = (await response.json().catch(() => null)) as {
    error?: string;
  } | null;

  return payload?.error ?? "Không thể tạo insight AI.";
}

export function MonthlyInsightPanel({
  month,
  initialInsight,
}: MonthlyInsightPanelProps) {
  const [insight, setInsight] = useState(initialInsight);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function generate(regenerate: boolean) {
    setPending(true);
    setError("");

    try {
      const providerSetting = readLocalAiProviderSetting();

      if (!providerSetting) {
        const message = "Bạn cần cấu hình nhà cung cấp AI trước.";
        setError(message);
        toast.error(message);
        return;
      }

      const response = await fetch("/api/ai/monthly-insight", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ month, regenerate, providerSetting }),
      });

      if (!response.ok) {
        const message = await readJsonError(response);
        setError(message);
        toast.error(message);
        return;
      }

      const payload = (await response.json()) as { insight: MonthlyInsightDto };
      setInsight(payload.insight);
      toast.success(regenerate ? "Đã tạo lại insight AI." : "Đã tạo insight AI.");
    } catch {
      const message = "Không thể kết nối dịch vụ AI.";
      setError(message);
      toast.error(message);
    } finally {
      setPending(false);
    }
  }

  return (
    <Card className="gap-0 rounded-2xl border-[#E1DDD4] bg-card py-0 shadow-none">
      <CardContent className="p-5 md:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Phân tích từ MoneyMind AI</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Phân tích ngắn dựa trên dữ liệu thật của tháng này.
            </p>
          </div>
          <Button
            type="button"
            variant={insight ? "outline" : "default"}
            onClick={() => generate(Boolean(insight))}
            disabled={pending}
            className={
              insight ? "border-[#DDD8CE]" : "bg-[#2F6B4F] hover:bg-[#285B43]"
            }
          >
            {insight ? "Tạo lại" : "Tạo insight"}
          </Button>
        </div>
        {insight ? (
          <MonthlyInsightMarkdown content={insight.content} />
        ) : (
          <p className="mt-4 text-sm text-muted-foreground">
            Chưa có insight cho tháng này.
          </p>
        )}
        {error ? (
          <p className="mt-3 text-sm text-destructive">{error}</p>
        ) : null}
      </CardContent>
    </Card>
  );
}
