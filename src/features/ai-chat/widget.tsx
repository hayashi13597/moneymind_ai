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
import {
  agentResponseSchema,
  type AgentResponse,
} from "@/features/agent/schemas";
import type {
  AiChatMessage,
  AiChatTransactionDraft,
} from "@/features/ai-chat/schemas";
import { AiChatTransactionReviewModal } from "@/features/ai-chat/transaction-review-modal";
import { readLocalAiProviderSetting } from "@/features/ai/local-settings";
import { cn } from "@/lib/utils";
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
  const isUser = entry.role === "user";

  return (
    <div className={cn("flex", isUser ? "justify-end" : "justify-start")}>
      <div
        data-role={entry.role}
        data-pending={pending ? "true" : undefined}
        className={cn(
          "max-w-[88%] rounded-2xl px-3.5 py-2.5 text-sm leading-6 shadow-sm",
          isUser
            ? "rounded-br-md bg-primary text-primary-foreground shadow-[0_10px_24px_rgba(47,107,79,0.18)]"
            : "rounded-bl-md border border-soft-border bg-soft-accent text-foreground shadow-[0_10px_24px_rgba(47,42,31,0.05)]",
        )}
      >
        <p>{entry.content}</p>
        {entry.draft ? (
          <Button
            type="button"
            variant="outline"
            onClick={() => onReviewDraft(entry.draft!)}
            className="mt-3 h-8 rounded-lg border-soft-border bg-card px-3 text-xs"
          >
            Xem giao dịch nháp
          </Button>
        ) : null}
        {entry.transactions?.length ? (
          <div className="mt-3 space-y-2">
            {entry.transactions.map((transaction) => (
              <div
                key={transaction.id}
                className="rounded-xl border border-warm-border bg-card/90 p-3 text-xs"
              >
                <div className="font-medium">
                  {transaction.categoryName}{" "}
                  <span className="text-muted-foreground">-</span>{" "}
                  {transaction.amount.toLocaleString("vi-VN")} đ
                </div>
                <div className="mt-1 text-muted-foreground">
                  {transaction.date}
                  {transaction.merchant ? ` - ${transaction.merchant}` : ""}
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
                className="h-auto w-full justify-start whitespace-normal rounded-xl border-warm-border bg-card/90 p-3 text-left text-xs font-medium"
              >
                {candidate.label}
              </Button>
            ))}
          </div>
        ) : null}
      </div>
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

      const body = await response.json();
      const parsed = agentResponseSchema.safeParse(body);

      if (!parsed.success) {
        setError("AI trả về phản hồi không hợp lệ.");
        return;
      }

      const payload = parsed.data;
      setMessages((current) => [
        ...current,
        {
          ...payload.message,
          transactions:
            "transactions" in payload ? payload.transactions : undefined,
          clarification:
            "clarification" in payload ? payload.clarification : undefined,
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
      <div className="fixed inset-x-3 bottom-3 z-40 flex justify-end sm:inset-x-auto sm:right-4 sm:bottom-4">
        {open ? (
          <Card className="flex h-[min(640px,calc(100dvh-1.5rem))] w-full flex-col gap-0 overflow-hidden rounded-2xl border-warm-border bg-card py-0 shadow-[0_22px_70px_rgba(47,42,31,0.20)] sm:w-[min(calc(100vw-2rem),440px)]">
            <CardHeader className="flex flex-row items-center justify-between gap-3 border-b border-warm-border bg-card px-4 py-3.5">
              <div className="flex min-w-0 items-center gap-3">
                <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground shadow-[0_10px_24px_rgba(47,107,79,0.22)]">
                  <Bot className="size-4" />
                </div>
                <div className="min-w-0">
                  <h2 className="truncate text-sm font-semibold">
                    MoneyMind Coach
                  </h2>
                  <p className="mt-0.5 text-xs text-muted-foreground">
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
                className="border-warm-border bg-background/70"
              >
                <X className="size-4" />
              </Button>
            </CardHeader>
            <CardContent className="min-h-0 flex-1 space-y-3 overflow-y-auto bg-[linear-gradient(180deg,rgb(247_243_234/.42),rgb(255_253_247/.82))] p-3.5 sm:p-4">
              {messages.length === 0 ? (
                <div className="space-y-3">
                  <div className="rounded-2xl border border-soft-border bg-soft-accent p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.72)]">
                    <div className="flex items-start gap-3">
                      <div className="grid size-8 shrink-0 place-items-center rounded-lg bg-card text-primary">
                        <Sparkles className="size-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold">
                          Hỏi nhanh về dòng tiền của bạn.
                        </p>
                        <p className="mt-1 text-sm leading-6 text-muted-foreground">
                          MoneyMind phân tích chi tiêu, tìm giao dịch và tạo
                          nháp để bạn duyệt trước khi lưu.
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="grid gap-2">
                    {SUGGESTED_PROMPTS.map((prompt) => (
                      <Button
                        key={prompt}
                        type="button"
                        variant="outline"
                        onClick={() => selectPrompt(prompt)}
                        className="h-auto justify-start whitespace-normal rounded-xl border-warm-border bg-card/90 px-3 py-2.5 text-left text-sm font-medium"
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
                  pending
                />
              ) : null}
            </CardContent>
            {error ? (
              <p className="border-t border-warm-border bg-card px-4 py-2.5 text-sm text-destructive">
                {error}
              </p>
            ) : null}
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(sendMessage)}
                className="flex items-start gap-2 border-t border-warm-border bg-card p-3"
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
                          className="max-h-32 min-h-11 w-full resize-none rounded-xl border-input bg-background px-3 py-2.5 text-sm leading-5 outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/20"
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
                  className="size-11 rounded-xl bg-primary hover:bg-primary-hover"
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
            className="size-12 rounded-2xl bg-primary p-0 shadow-[0_14px_34px_rgba(47,107,79,0.30)] hover:bg-primary-hover"
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
