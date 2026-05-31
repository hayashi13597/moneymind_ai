"use client";

import { Bot, CheckCircle2, KeyRound, Server } from "lucide-react";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";

import { InsightCard, SectionCard } from "@/components/app-ui";
import { Button } from "@/components/ui/button";

type AiSettingsFormProps = {
  initialSetting: null | {
    baseUrl: string;
    model: string;
    hasApiKey: boolean;
  };
};

async function readJsonError(response: Response) {
  const payload = (await response.json().catch(() => null)) as {
    error?: string;
  } | null;

  return payload?.error ?? "Không thể lưu cấu hình AI.";
}

const NETWORK_ERROR_MESSAGE = "Không thể kết nối máy chủ.";

export function AiSettingsForm({ initialSetting }: AiSettingsFormProps) {
  const [baseUrl, setBaseUrl] = useState(
    initialSetting?.baseUrl ?? "https://api.openai.com/v1",
  );
  const [model, setModel] = useState(initialSetting?.model ?? "gpt-4.1-mini");
  const [hasApiKey, setHasApiKey] = useState(Boolean(initialSetting?.hasApiKey));
  const [apiKey, setApiKey] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function saveSettings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");

    try {
      const response = await fetch("/api/settings/ai", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          baseUrl,
          model,
          apiKey: apiKey || undefined,
        }),
      });

      if (!response.ok) {
        const message = await readJsonError(response);
        setError(message);
        toast.error(message);
        return;
      }

      const payload = (await response.json()) as {
        setting: { hasApiKey: boolean };
      };
      setHasApiKey(payload.setting.hasApiKey);
      setApiKey("");
      toast.success("Đã lưu cấu hình AI.");
    } catch {
      setError(NETWORK_ERROR_MESSAGE);
      toast.error(NETWORK_ERROR_MESSAGE);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[0.8fr_1.2fr]">
      <InsightCard
        title="AI chỉ hiệu quả khi dữ liệu rõ ràng"
        description="Provider này dùng cho phân loại giao dịch, phân tích tháng và chat tài chính. Hãy chọn model ổn định, phản hồi JSON tốt và phù hợp chi phí của bạn."
      >
        <div className="space-y-3 text-sm">
          <div className="flex items-start gap-2 text-[#2F6B4F]">
            <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
            <span>API key được lưu phía server và không hiển thị lại.</span>
          </div>
          <div className="flex items-start gap-2 text-muted-foreground">
            <Bot className="mt-0.5 size-4 shrink-0" />
            <span>
              MoneyMind sẽ hỏi AI bằng dữ liệu giao dịch của tài khoản hiện tại.
            </span>
          </div>
        </div>
      </InsightCard>

      <SectionCard>
        <form onSubmit={saveSettings} className="space-y-5">
          <div>
            <h2 className="text-lg font-semibold">Provider connection</h2>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              Giữ cấu hình gọn để bạn có thể đổi model mà không ảnh hưởng dữ
              liệu tài chính đã lưu.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2 text-sm font-medium md:col-span-2">
              <span className="inline-flex items-center gap-2">
                <Server className="size-4 text-[#2F6B4F]" />
                Base URL
              </span>
              <input
                id="baseUrl"
                value={baseUrl}
                onChange={(event) => setBaseUrl(event.target.value)}
                className="h-11 w-full rounded-xl border border-[#DCD7CC] bg-[#FDFCF8] px-3 text-sm outline-none transition-colors focus:border-[#2F6B4F] focus:ring-3 focus:ring-[#2F6B4F]/15"
                required
              />
            </label>
            <label className="space-y-2 text-sm font-medium">
              <span>Model</span>
              <input
                id="model"
                value={model}
                onChange={(event) => setModel(event.target.value)}
                className="h-11 w-full rounded-xl border border-[#DCD7CC] bg-[#FDFCF8] px-3 text-sm outline-none transition-colors focus:border-[#2F6B4F] focus:ring-3 focus:ring-[#2F6B4F]/15"
                required
              />
            </label>
            <label className="space-y-2 text-sm font-medium">
              <span className="inline-flex items-center gap-2">
                <KeyRound className="size-4 text-[#2F6B4F]" />
                API key
              </span>
              <input
                id="apiKey"
                value={apiKey}
                onChange={(event) => setApiKey(event.target.value)}
                className="h-11 w-full rounded-xl border border-[#DCD7CC] bg-[#FDFCF8] px-3 text-sm outline-none transition-colors focus:border-[#2F6B4F] focus:ring-3 focus:ring-[#2F6B4F]/15"
                placeholder={
                  hasApiKey
                    ? "Đã cấu hình, nhập key mới để thay đổi"
                    : "Nhập API key"
                }
                type="password"
              />
            </label>
          </div>

          <div className="flex flex-col gap-3 border-t border-[#E8E4DC] pt-5 sm:flex-row sm:items-center sm:justify-between">
            <span className="inline-flex w-fit items-center gap-2 rounded-full border border-[#D8E1D7] bg-[#ECF3ED] px-3 py-1 text-xs font-medium text-[#2F6B4F]">
              <CheckCircle2 className="size-3.5" />
              {hasApiKey ? "API key đã cấu hình" : "Chưa có API key"}
            </span>
            <Button
              type="submit"
              disabled={pending}
              className="h-10 bg-[#2F6B4F] hover:bg-[#285B43]"
            >
              {pending ? "Đang lưu..." : "Lưu cấu hình"}
            </Button>
          </div>
          {error ? (
            <p className="rounded-xl border border-destructive/25 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          ) : null}
        </form>
      </SectionCard>
    </div>
  );
}
