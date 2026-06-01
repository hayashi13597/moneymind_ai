"use client";

import { CheckCircle2, CircleAlert, Sparkles } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import type { AiChatResponse } from "@/features/ai-chat/schemas";
import { readLocalAiProviderSetting } from "@/features/ai/local-settings";

const PROMPTS = [
  "Tháng này tôi đã chi quá tay ở đâu?",
  "Tôi có nên mua điện thoại mới không?",
  "Tuần này tôi nên tiết kiệm bao nhiêu?",
  "Tạo kế hoạch tiết kiệm cho tôi.",
];

type AskMoneyMindPanelProps = {
  month: string;
};

async function readJsonError(response: Response) {
  const payload = (await response.json().catch(() => null)) as {
    error?: string;
  } | null;

  return payload?.error ?? "MoneyMind AI chưa trả lời được câu hỏi này.";
}

export function AskMoneyMindPanel({ month }: AskMoneyMindPanelProps) {
  const [selectedPrompt, setSelectedPrompt] = useState("");
  const [answer, setAnswer] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function askPrompt(prompt: string) {
    if (pending) {
      return;
    }

    setSelectedPrompt(prompt);
    setAnswer("");
    setError("");
    setPending(true);

    try {
      const providerSetting = readLocalAiProviderSetting();

      if (!providerSetting) {
        setError("Bạn cần cấu hình nhà cung cấp AI trước.");
        return;
      }

      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          month,
          providerSetting,
          messages: [{ role: "user", content: prompt }],
        }),
      });

      if (!response.ok) {
        setError(await readJsonError(response));
        return;
      }

      const payload = (await response.json()) as AiChatResponse;
      setAnswer(payload.message.content);
    } catch {
      setError("Không thể kết nối MoneyMind AI.");
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="rounded-2xl border border-[#D8E1D7] bg-[#F3F8F2] p-5 md:p-6">
      <div className="flex items-start gap-3">
        <div className="rounded-full bg-[#2F6B4F] p-2 text-white">
          <Sparkles className="size-4" />
        </div>
        <div>
          <h2 className="text-lg font-semibold">Hỏi MoneyMind AI</h2>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            Chọn một câu hỏi để MoneyMind AI trả lời.
          </p>
        </div>
      </div>
      <div className="mt-5 grid gap-2 sm:grid-cols-2">
        {PROMPTS.map((prompt) => (
          <Button
            key={prompt}
            type="button"
            variant="outline"
            onClick={() => askPrompt(prompt)}
            disabled={pending}
            aria-pressed={selectedPrompt === prompt}
            className="h-auto justify-start whitespace-normal rounded-xl border-[#D8E1D7] bg-white/70 px-4 py-3 text-left text-sm font-medium text-foreground hover:bg-white aria-pressed:border-[#2F6B4F] aria-pressed:bg-white"
          >
            {prompt}
          </Button>
        ))}
      </div>

      {selectedPrompt || pending || answer || error ? (
        <div className="mt-5 rounded-xl border border-[#D8E1D7] bg-white/75 p-4">
          {selectedPrompt ? (
            <p className="text-xs font-medium uppercase tracking-[0.14em] text-[#2F6B4F]">
              {selectedPrompt}
            </p>
          ) : null}
          <div
            className="mt-3 text-sm leading-6 text-foreground"
            aria-live="polite"
          >
            {pending
              ? "MoneyMind AI đang phân tích dữ liệu tháng này..."
              : null}
            {error ? <p className="text-[#A2482D]">{error}</p> : null}
            {answer ? <p className="whitespace-pre-line">{answer}</p> : null}
          </div>
        </div>
      ) : null}

      <div className="mt-5 grid gap-3 text-sm md:grid-cols-2">
        <div className="flex items-start gap-2 text-[#2F6B4F]">
          <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
          <span>Câu trả lời thực tế dựa trên dữ liệu tháng này.</span>
        </div>
        <div className="flex items-start gap-2 text-[#6F5D3F]">
          <CircleAlert className="mt-0.5 size-4 shrink-0" />
          <span>Kiểm tra gợi ý của AI trước khi quyết định.</span>
        </div>
      </div>
    </section>
  );
}
