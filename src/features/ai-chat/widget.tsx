"use client";

import { Bot, MessageCircle, Send, Sparkles, X } from "lucide-react";
import { useMemo, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import type { AgentResponse } from "@/features/agent/schemas";
import type {
  AiChatMessage,
  AiChatTransactionDraft,
} from "@/features/ai-chat/schemas";
import { AiChatTransactionReviewModal } from "@/features/ai-chat/transaction-review-modal";
import { readLocalAiProviderSetting } from "@/features/ai/local-settings";
import { createZodResolver } from "@/lib/zod-form";

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
  transactions?: AgentResponse["transactions"];
  clarification?: AgentResponse["clarification"];
  resultType?: AgentResponse["resultType"];
};

type AiChatBubbleProps = {
  entry: ChatEntry;
  onReviewDraft: (draft: AiChatTransactionDraft) => void;
  onSelectCandidate?: (candidate: { id: string; label: string }) => void;
  pending?: boolean;
};

const SUGGESTED_PROMPTS = [
  "Tháng này tôi đã chi quá tay ở đâu?",
  "Tôi có thể mua điện thoại mới không?",
  "Tạo kế hoạch tiết kiệm mỗi tuần.",
  "Tìm khoản định kỳ nên hủy.",
];
const chatFormSchema = z.object({
  input: z.string().trim().min(1, "Nhập nội dung trước khi gửi."),
});

type ChatFormValues = z.infer<typeof chatFormSchema>;

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

export function AiChatBubble({
  entry,
  onReviewDraft,
  onSelectCandidate,
  pending = false,
}: AiChatBubbleProps) {
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
      {entry.transactions?.length ? (
        <div className="mt-3 space-y-2">
          {entry.transactions.map((transaction) => (
            <div
              key={transaction.id}
              className="rounded-lg border border-[#E8E4DC] bg-white/80 p-3 text-xs"
            >
              <div className="font-medium">
                {transaction.categoryName} ·{" "}
                {transaction.amount.toLocaleString("vi-VN")} đ
              </div>
              <div className="mt-1 text-muted-foreground">
                {transaction.date}
                {transaction.merchant ? ` · ${transaction.merchant}` : ""}
              </div>
              <div className="mt-1">{transaction.note}</div>
            </div>
          ))}
        </div>
      ) : null}
      {entry.clarification?.candidates?.length ? (
        <div className="mt-3 space-y-2">
          {entry.clarification.candidates.map((candidate) => (
            <Button
              key={candidate.id}
              type="button"
              variant="outline"
              disabled={pending}
              onClick={() => onSelectCandidate?.(candidate)}
              className="rounded-lg border border-[#E8E4DC] bg-white/80 p-3 text-xs font-medium"
            >
              {candidate.label}
            </Button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function AiChatWidget({ categories }: AiChatWidgetProps) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatEntry[]>([]);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [reviewDraft, setReviewDraft] =
    useState<AiChatTransactionDraft | null>(null);
  const month = useMemo(() => currentMonthKey(), []);
  const form = useForm<ChatFormValues>({
    resolver: createZodResolver(chatFormSchema),
    defaultValues: {
      input: "",
    },
  });
  const input = useWatch({ control: form.control, name: "input" });

  function selectPrompt(prompt: string) {
    form.setValue("input", prompt, {
      shouldDirty: true,
      shouldValidate: true,
    });
  }

  async function sendMessage(values: ChatFormValues) {
    const content = values.input.trim();

    if (!content || pending) {
      return;
    }

    const providerSetting = readLocalAiProviderSetting();

    if (!providerSetting) {
      setError("Bạn cần cấu hình nhà cung cấp AI trước.");
      return;
    }

    const nextMessages: ChatEntry[] = [
      ...messages,
      { role: "user", content },
    ];
    setMessages(nextMessages);
    form.reset({ input: "" });
    setError("");
    setPending(true);

    try {
      const response = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          month,
          providerSetting,
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

      const payload = (await response.json()) as AgentResponse;
      setMessages((current) => [
        ...current,
        {
          ...payload.message,
          transactions: payload.transactions,
          clarification: payload.clarification,
          resultType: payload.resultType,
        },
      ]);
    } catch {
      setError("Không thể kết nối dịch vụ AI.");
    } finally {
      setPending(false);
    }
  }

  function selectCandidate(candidate: { id: string; label: string }) {
    void sendMessage({
      input: `Tôi chọn giao dịch ${candidate.id}: ${candidate.label}`,
    });
  }

  return (
    <>
      <div className="fixed bottom-4 right-4 z-40">
        {open ? (
          <Card className="flex h-[min(620px,calc(100dvh-2rem))] w-[min(calc(100vw-2rem),420px)] flex-col gap-0 overflow-hidden rounded-2xl border-[#DCD7CC] bg-card py-0 shadow-[0_18px_60px_rgba(47,42,31,0.18)]">
            <CardHeader className="flex flex-row items-center justify-between gap-3 border-b border-[#E8E4DC] bg-[#FDFCF8] px-4 py-3">
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
            </CardHeader>
            <CardContent className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
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
                  onSelectCandidate={selectCandidate}
                  pending={pending}
                />
              ))}
              {pending ? (
                <AiChatBubble
                  entry={{ role: "assistant", content: "AI đang trả lời..." }}
                  onReviewDraft={setReviewDraft}
                />
              ) : null}
            </CardContent>
            {error ? (
              <p className="border-t border-[#E8E4DC] px-4 py-2 text-sm text-destructive">
                {error}
              </p>
            ) : null}
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(sendMessage)}
                className="flex gap-2 border-t border-[#E8E4DC] bg-[#FDFCF8] p-3"
              >
                <FormField
                  control={form.control}
                  name="input"
                  render={({ field }) => (
                    <FormItem className="min-w-0 flex-1 space-y-1">
                      <FormLabel className="sr-only">Tin nhắn</FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          placeholder="Hỏi về chi tiêu..."
                          rows={1}
                          className="min-h-11 w-full resize-none rounded-xl border border-[#DCD7CC] bg-white px-3 text-sm outline-none transition-colors focus:border-[#2F6B4F] focus:ring-3 focus:ring-[#2F6B4F]/15"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button
                  type="submit"
                  disabled={pending || !input.trim()}
                  size="icon-lg"
                  aria-label="Gửi tin nhắn"
                  className="bg-[#2F6B4F] hover:bg-[#285B43]"
                >
                  <Send className="size-4" />
                </Button>
              </form>
            </Form>
          </Card>
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
