"use client";

import { Bot, MessageCircle, Send, Sparkles, X } from "lucide-react";
import type { FormEvent } from "react";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import type {
  AiChatMessage,
  AiChatResponse,
  AiChatTransactionDraft,
} from "@/features/ai-chat/schemas";
import { AiChatTransactionReviewModal } from "@/features/ai-chat/transaction-review-modal";

type Category = {
  id: string;
  name: string;
  type: "income" | "expense" | null;
};

type AiChatWidgetProps = {
  categories: Category[];
};

type ChatEntry = AiChatMessage & {
  draft?: AiChatTransactionDraft;
};

type AiChatBubbleProps = {
  entry: ChatEntry;
  onReviewDraft: (draft: AiChatTransactionDraft) => void;
};

const SUGGESTED_PROMPTS = [
  "Tháng này tôi đã chi quá tay ở đâu?",
  "Tôi có thể mua điện thoại mới không?",
  "Tạo kế hoạch tiết kiệm mỗi tuần.",
  "Tìm khoản định kỳ nên hủy.",
];

async function readJsonError(response: Response) {
  const payload = (await response.json().catch(() => null)) as {
    error?: string;
  } | null;

  return payload?.error ?? "Không thể chat với AI.";
}

function currentMonthKey() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");

  return `${year}-${month}`;
}

export function AiChatBubble({ entry, onReviewDraft }: AiChatBubbleProps) {
  return (
    <div
      className={
        entry.role === "user"
          ? "ml-8 rounded-2xl bg-[#2F6B4F] px-3 py-2 text-sm leading-6 text-white"
          : "mr-8 rounded-2xl border border-[#D8E1D7] bg-muted bg-[#F3F8F2] px-3 py-2 text-sm leading-6"
      }
    >
      <p>{entry.content}</p>
      {entry.draft ? (
        <Button
          type="button"
          variant="outline"
          onClick={() => onReviewDraft(entry.draft!)}
          className="mt-3 border-[#D8E1D7] bg-white"
        >
          Xem giao dịch nháp
        </Button>
      ) : null}
    </div>
  );
}

export function AiChatWidget({ categories }: AiChatWidgetProps) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatEntry[]>([]);
  const [input, setInput] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [reviewDraft, setReviewDraft] =
    useState<AiChatTransactionDraft | null>(null);
  const month = useMemo(() => currentMonthKey(), []);

  function selectPrompt(prompt: string) {
    setInput(prompt);
  }

  async function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const content = input.trim();

    if (!content || pending) {
      return;
    }

    const nextMessages: ChatEntry[] = [
      ...messages,
      { role: "user", content },
    ];
    setMessages(nextMessages);
    setInput("");
    setError("");
    setPending(true);

    try {
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          month,
          messages: nextMessages.map((message) => ({
            role: message.role,
            content: message.content,
          })),
        }),
      });

      if (!response.ok) {
        const message = await readJsonError(response);
        setError(message);
        return;
      }

      const payload = (await response.json()) as AiChatResponse;
      setMessages((current) => [
        ...current,
        { ...payload.message, draft: payload.transactionDraft },
      ]);
    } catch {
      setError("Không thể kết nối dịch vụ AI.");
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <div className="fixed bottom-4 right-4 z-40">
        {open ? (
          <section className="flex h-[min(620px,calc(100dvh-2rem))] w-[min(calc(100vw-2rem),420px)] flex-col overflow-hidden rounded-2xl border border-[#DCD7CC] bg-card shadow-[0_18px_60px_rgba(47,42,31,0.18)]">
            <header className="flex items-center justify-between border-b border-[#E8E4DC] bg-[#FDFCF8] px-4 py-3">
              <div className="flex items-center gap-2">
                <div className="rounded-full bg-[#2F6B4F] p-2 text-white">
                  <Bot className="size-4" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold">MoneyMind Coach</h2>
                  <p className="text-xs text-muted-foreground">
                    Tháng {month.slice(5, 7)}/{month.slice(0, 4)}
                  </p>
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                aria-label="Đóng chat AI"
                size="icon"
                className="border-[#DDD8CE]"
              >
                <X className="size-4" />
              </Button>
            </header>
            <div className="flex-1 space-y-3 overflow-y-auto p-4">
              {messages.length === 0 ? (
                <div className="space-y-4">
                  <div className="rounded-2xl border border-[#D8E1D7] bg-[#F3F8F2] p-4">
                    <div className="flex items-start gap-2">
                      <Sparkles className="mt-0.5 size-4 shrink-0 text-[#2F6B4F]" />
                      <p className="text-sm leading-6 text-muted-foreground">
                        Hỏi như đang nói với một huấn luyện viên tài chính.
                        MoneyMind có thể phân tích chi tiêu hoặc tạo giao dịch
                        nháp để bạn duyệt.
                      </p>
                    </div>
                  </div>
                  <div className="grid gap-2">
                    {SUGGESTED_PROMPTS.map((prompt) => (
                      <Button
                        key={prompt}
                        type="button"
                        variant="outline"
                        onClick={() => selectPrompt(prompt)}
                        className="h-auto justify-start whitespace-normal rounded-xl border-[#D8E1D7] bg-white px-3 py-2 text-left text-sm"
                      >
                        {prompt}
                      </Button>
                    ))}
                  </div>
                </div>
              ) : null}
              {messages.map((message, index) => (
                <AiChatBubble
                  key={`${message.role}-${index}`}
                  entry={message}
                  onReviewDraft={setReviewDraft}
                />
              ))}
              {pending ? (
                <AiChatBubble
                  entry={{ role: "assistant", content: "AI đang trả lời..." }}
                  onReviewDraft={setReviewDraft}
                />
              ) : null}
            </div>
            {error ? (
              <p className="border-t border-[#E8E4DC] px-4 py-2 text-sm text-destructive">
                {error}
              </p>
            ) : null}
            <form
              onSubmit={sendMessage}
              className="flex gap-2 border-t border-[#E8E4DC] bg-[#FDFCF8] p-3"
            >
              <input
                value={input}
                onChange={(event) => setInput(event.target.value)}
                placeholder="Hỏi về chi tiêu..."
                className="h-10 min-w-0 flex-1 rounded-xl border border-[#DCD7CC] bg-white px-3 text-sm outline-none transition-colors focus:border-[#2F6B4F] focus:ring-3 focus:ring-[#2F6B4F]/15"
              />
              <Button
                type="submit"
                disabled={pending || !input.trim()}
                size="icon-lg"
                className="bg-[#2F6B4F] hover:bg-[#285B43]"
              >
                <Send className="size-4" />
              </Button>
            </form>
          </section>
        ) : (
          <Button
            type="button"
            onClick={() => setOpen(true)}
            aria-label="Mở chat AI"
            className="size-12 rounded-full bg-[#2F6B4F] p-0 shadow-[0_14px_30px_rgba(47,107,79,0.28)] hover:bg-[#285B43]"
          >
            <MessageCircle className="size-5" />
          </Button>
        )}
      </div>
      <AiChatTransactionReviewModal
        draft={reviewDraft}
        categories={categories}
        onClose={() => setReviewDraft(null)}
        onSaved={() => {
          setReviewDraft(null);
          setMessages((current) => [
            ...current,
            { role: "assistant", content: "Đã lưu giao dịch." },
          ]);
        }}
      />
    </>
  );
}
