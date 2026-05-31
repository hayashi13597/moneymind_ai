"use client";

import { Bot, MessageCircle, Send, X } from "lucide-react";
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
          ? "ml-8 rounded-lg bg-primary px-3 py-2 text-sm text-primary-foreground"
          : "mr-8 rounded-lg bg-muted px-3 py-2 text-sm"
      }
    >
      <p>{entry.content}</p>
      {entry.draft ? (
        <Button
          type="button"
          variant="outline"
          onClick={() => onReviewDraft(entry.draft!)}
          className="mt-2"
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
          <section className="flex h-[520px] w-[min(calc(100vw-2rem),380px)] flex-col rounded-lg border bg-card shadow-lg">
            <header className="flex items-center justify-between border-b px-3 py-2">
              <div className="flex items-center gap-2">
                <Bot className="size-4" />
                <div>
                  <h2 className="text-sm font-semibold">AI tài chính</h2>
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
              >
                <X className="size-4" />
              </Button>
            </header>
            <div className="flex-1 space-y-3 overflow-y-auto p-3">
              {messages.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Hỏi AI về chi tiêu tháng này hoặc nhờ tạo giao dịch nháp.
                </p>
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
              <p className="border-t px-3 py-2 text-sm text-destructive">
                {error}
              </p>
            ) : null}
            <form onSubmit={sendMessage} className="flex gap-2 border-t p-3">
              <input
                value={input}
                onChange={(event) => setInput(event.target.value)}
                placeholder="Hỏi về chi tiêu..."
                className="h-9 min-w-0 flex-1 rounded-md border bg-background px-3 text-sm"
              />
              <Button type="submit" disabled={pending || !input.trim()}>
                <Send className="size-4" />
              </Button>
            </form>
          </section>
        ) : (
          <Button
            type="button"
            onClick={() => setOpen(true)}
            aria-label="Mở chat AI"
            className="size-12 rounded-full p-0 shadow-lg"
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
