import { AiDomainError } from "@/features/ai/errors";
import { createOpenAiCompatibleChat } from "@/features/ai/openai-compatible";
import { assertSafeAiProviderSetting } from "@/features/ai/provider-security";
import type { AiProviderSettingInput } from "@/features/ai/schemas";
import { parseAgentJsonObject } from "@/features/agent/json";
import type { AgentRequest, AgentResponse } from "@/features/agent/schemas";
import { agentIntentSchema } from "@/features/agent/schemas";
import {
  buildAgentFinanceContext,
  formatDashboardExplanation,
} from "@/features/agent/tools/finance";
import {
  createAgentTransaction,
  deleteAgentTransaction,
  searchAgentTransactions,
  updateAgentTransaction,
} from "@/features/agent/tools/transactions";
import { revalidateTransactionViews } from "@/features/transactions/revalidation";

function buildSystemPrompt() {
  return [
    "Bạn là MoneyMind Agent, trợ lý tài chính cá nhân cho người dùng Việt Nam.",
    "Chỉ dùng dữ liệu app được cung cấp. Không bịa giao dịch, danh mục, số dư hoặc xu hướng.",
    "Không đưa lời khuyên đầu tư, cam kết lợi nhuận hoặc khuyến nghị sản phẩm tài chính.",
    "Bạn phải chọn đúng một tool và trả về một JSON object duy nhất.",
    "Các tool được phép:",
    "- finance.answerContext: hỏi đáp dữ liệu app hoặc gợi ý hành động không ghi dữ liệu.",
    "- dashboard.explain: giải thích dashboard tháng đang chọn.",
    "- transactions.search: lọc hoặc tìm giao dịch bằng ngôn ngữ tự nhiên.",
    "- categories.list: trả lời về danh mục hiện có.",
    "- transactions.create: tạo một giao dịch khi thông tin đủ rõ.",
    "- transactions.update: sửa một giao dịch khi mục tiêu đủ rõ.",
    "- transactions.delete: xóa một giao dịch khi mục tiêu đủ rõ.",
    "Nếu sửa hoặc xóa có thể mơ hồ, vẫn chọn transactions.update/delete với targetQuery rõ nhất; server sẽ hỏi lại khi tìm nhiều ứng viên.",
    "Dạng JSON:",
    '{"resultType":"answer|search_results|suggestion|dashboard_explanation|transaction_created|transaction_updated|transaction_deleted","tool":"tool.name","message":"câu trả lời tiếng Việt","input":{}}',
  ].join("\n");
}

function buildContextPrompt(
  context: Awaited<ReturnType<typeof buildAgentFinanceContext>>,
) {
  return [
    `Tháng đang chọn: ${context.month}`,
    "Dashboard:",
    JSON.stringify(context.dashboard),
    "Danh mục:",
    JSON.stringify(
      context.categories.map((category) => ({
        id: category.id,
        name: category.name,
        type: category.type,
      })),
    ),
    "Giao dịch gần đây:",
    JSON.stringify(context.transactions),
  ].join("\n");
}

function transactionIdFromResult(result: unknown) {
  if (
    result &&
    typeof result === "object" &&
    "transaction" in result &&
    result.transaction &&
    typeof result.transaction === "object" &&
    "id" in result.transaction &&
    typeof result.transaction.id === "string"
  ) {
    return result.transaction.id;
  }

  return undefined;
}

function clarificationResponse(
  message: string,
  candidates: Array<{ id: string; label: string }> | undefined,
): AgentResponse {
  return {
    message: { role: "assistant", content: message },
    resultType: "clarification_required",
    clarification: {
      question: message,
      ...(candidates ? { candidates } : {}),
    },
  };
}

export async function generateAgentResponse(
  userId: string,
  input: AgentRequest,
  setting: AiProviderSettingInput,
): Promise<AgentResponse> {
  const providerSetting = assertSafeAiProviderSetting(setting);
  const context = await buildAgentFinanceContext(userId, input.month);
  const providerContent = await createOpenAiCompatibleChat({
    baseUrl: providerSetting.baseUrl,
    apiKey: providerSetting.apiKey,
    model: providerSetting.model,
    timeoutMs: 45000,
    messages: [
      { role: "system", content: buildSystemPrompt() },
      { role: "user", content: buildContextPrompt(context) },
      ...input.messages,
    ],
  });

  const parsed = agentIntentSchema.safeParse(
    parseAgentJsonObject(providerContent),
  );

  if (!parsed.success) {
    throw new AiDomainError("provider_invalid_response");
  }

  const intent = parsed.data;

  if (intent.tool === "transactions.search") {
    const result = await searchAgentTransactions(
      userId,
      input.month,
      intent.input,
    );

    return {
      message: { role: "assistant", content: intent.message },
      resultType: "search_results",
      transactions: result.transactions,
    };
  }

  if (intent.tool === "transactions.create") {
    const result = await createAgentTransaction(userId, intent.input);

    if (!result.ok) {
      throw new AiDomainError("provider_invalid_response");
    }

    revalidateTransactionViews();

    return {
      message: { role: "assistant", content: intent.message },
      resultType: "transaction_created",
      action: { type: "create", transactionId: transactionIdFromResult(result) },
    };
  }

  if (intent.tool === "transactions.update") {
    const result = await updateAgentTransaction(userId, input.month, intent.input);

    if (!result.ok && result.reason === "clarification_required") {
      return clarificationResponse(intent.message, result.candidates);
    }

    if (!result.ok) {
      throw new AiDomainError("provider_invalid_response");
    }

    revalidateTransactionViews();

    return {
      message: { role: "assistant", content: intent.message },
      resultType: "transaction_updated",
      action: { type: "update", transactionId: transactionIdFromResult(result) },
    };
  }

  if (intent.tool === "transactions.delete") {
    const result = await deleteAgentTransaction(userId, input.month, intent.input);

    if (!result.ok && result.reason === "clarification_required") {
      return clarificationResponse(intent.message, result.candidates);
    }

    if (!result.ok) {
      throw new AiDomainError("provider_invalid_response");
    }

    revalidateTransactionViews();

    return {
      message: { role: "assistant", content: intent.message },
      resultType: "transaction_deleted",
      action: { type: "delete", transactionId: result.transaction.id },
    };
  }

  if (intent.tool === "dashboard.explain") {
    return {
      message: {
        role: "assistant",
        content: `${intent.message}\n\n${formatDashboardExplanation(context)}`,
      },
      resultType: "dashboard_explanation",
    };
  }

  return {
    message: { role: "assistant", content: intent.message },
    resultType: intent.resultType,
  };
}
