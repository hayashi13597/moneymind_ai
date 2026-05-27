import { AiDomainError } from "@/features/ai/errors";
import { createOpenAiCompatibleChat } from "@/features/ai/openai-compatible";
import { requireAiProviderSetting } from "@/features/ai/settings-service";
import type {
  AiChatRequest,
  AiChatTransactionDraft,
} from "@/features/ai-chat/schemas";
import { aiChatProviderResponseSchema } from "@/features/ai-chat/schemas";
import { getMonthWindow } from "@/features/dashboard/month";
import { getMonthlyDashboard } from "@/features/dashboard/service";
import { db } from "@/lib/db";

type UserCategory = {
  id: string;
  name: string;
  type: "income" | "expense" | null;
};

const MAX_CONTEXT_TRANSACTIONS = 40;

function normalizeName(value: string) {
  return value.trim().toLocaleLowerCase("vi-VN");
}

function findFallbackCategory(
  categories: UserCategory[],
  type: "income" | "expense",
) {
  const typed = categories.filter(
    (category) => !category.type || category.type === type,
  );
  const preferredName = type === "income" ? "thu nhập" : "khác";

  return (
    typed.find((category) => normalizeName(category.name) === preferredName) ??
    typed[0]
  );
}

function resolveDraftCategory(
  categories: UserCategory[],
  type: "income" | "expense",
  categoryName: string,
) {
  const normalized = normalizeName(categoryName);
  const exact = categories.find(
    (category) =>
      (!category.type || category.type === type) &&
      normalizeName(category.name) === normalized,
  );

  return exact ?? findFallbackCategory(categories, type);
}

function parseProviderJson(content: string) {
  try {
    return JSON.parse(content) as unknown;
  } catch {
    throw new AiDomainError("provider_invalid_response");
  }
}

function lastUserMessage(input: AiChatRequest) {
  return [...input.messages]
    .reverse()
    .find((message) => message.role === "user");
}

async function listMonthTransactions(userId: string, month: string) {
  const window = getMonthWindow(month);

  return db.transaction.findMany({
    where: {
      userId,
      transactionDate: {
        gte: window.start,
        lt: window.end,
      },
    },
    include: { category: true },
    orderBy: [{ transactionDate: "desc" }, { createdAt: "desc" }],
    take: MAX_CONTEXT_TRANSACTIONS,
  });
}

async function listCategories(userId: string): Promise<UserCategory[]> {
  return db.category.findMany({
    where: { userId },
    orderBy: [{ type: "asc" }, { name: "asc" }],
    select: { id: true, name: true, type: true },
  });
}

function buildSystemPrompt() {
  return [
    "Bạn là trợ lý tài chính cá nhân cho người dùng Việt Nam.",
    "Chỉ dùng dữ liệu tháng được cung cấp. Không bịa giao dịch, số dư, danh mục hoặc xu hướng.",
    "Nếu câu hỏi nằm ngoài dữ liệu hiện có, hãy nói không đủ dữ liệu và gợi ý câu hỏi hẹp hơn.",
    "Không đưa lời khuyên đầu tư, cam kết lợi nhuận hoặc khuyến nghị sản phẩm tài chính.",
    "Trả lời bằng JSON duy nhất theo dạng:",
    '{"answer":"câu trả lời tiếng Việt","transactionDraft":null}',
    "Nếu người dùng muốn thêm giao dịch, trả transactionDraft với type, amount, categoryName, note, merchant, transactionDate.",
  ].join("\n");
}

function buildContextPrompt({
  month,
  dashboard,
  categories,
  transactions,
}: {
  month: string;
  dashboard: Awaited<ReturnType<typeof getMonthlyDashboard>>;
  categories: UserCategory[];
  transactions: Awaited<ReturnType<typeof listMonthTransactions>>;
}) {
  return [
    `Tháng đang phân tích: ${month}`,
    `Tổng thu nhập: ${dashboard.totals.income}`,
    `Tổng chi tiêu: ${dashboard.totals.expense}`,
    `Còn lại: ${dashboard.totals.remaining}`,
    "Chi theo danh mục:",
    JSON.stringify(dashboard.categoryBreakdown),
    "Danh mục hiện có:",
    JSON.stringify(
      categories.map((category) => ({
        name: category.name,
        type: category.type,
      })),
    ),
    "Giao dịch trong tháng:",
    JSON.stringify(
      transactions.map((transaction) => ({
        date: transaction.transactionDate.toISOString().slice(0, 10),
        type: transaction.type,
        amount: transaction.amount,
        category: transaction.category.name,
        merchant: transaction.merchant,
        note: transaction.note,
      })),
    ),
  ].join("\n");
}

export async function generateAiChatResponse(
  userId: string,
  input: AiChatRequest,
) {
  const [setting, dashboard, categories, transactions] = await Promise.all([
    requireAiProviderSetting(userId),
    getMonthlyDashboard(userId, input.month),
    listCategories(userId),
    listMonthTransactions(userId, input.month),
  ]);

  const providerContent = await createOpenAiCompatibleChat({
    baseUrl: setting.baseUrl,
    apiKey: setting.apiKey,
    model: setting.model,
    timeoutMs: 45000,
    messages: [
      { role: "system", content: buildSystemPrompt() },
      {
        role: "user",
        content: buildContextPrompt({
          month: input.month,
          dashboard,
          categories,
          transactions,
        }),
      },
      ...input.messages,
    ],
  });

  const parsed = aiChatProviderResponseSchema.safeParse(
    parseProviderJson(providerContent),
  );

  if (!parsed.success) {
    throw new AiDomainError("provider_invalid_response");
  }

  const response: {
    message: { role: "assistant"; content: string };
    transactionDraft?: AiChatTransactionDraft;
  } = {
    message: { role: "assistant", content: parsed.data.answer },
  };

  if (parsed.data.transactionDraft) {
    const category = resolveDraftCategory(
      categories,
      parsed.data.transactionDraft.type,
      parsed.data.transactionDraft.categoryName,
    );

    if (!category) {
      throw new AiDomainError("provider_invalid_response");
    }

    response.transactionDraft = {
      type: parsed.data.transactionDraft.type,
      amount: parsed.data.transactionDraft.amount,
      categoryId: category.id,
      categoryName: category.name,
      note: parsed.data.transactionDraft.note,
      merchant: parsed.data.transactionDraft.merchant ?? null,
      rawInput:
        lastUserMessage(input)?.content ?? parsed.data.transactionDraft.note,
      transactionDate: parsed.data.transactionDraft.transactionDate,
    };
  }

  return response;
}
