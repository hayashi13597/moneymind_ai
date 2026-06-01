import { createOpenAiCompatibleChat } from "@/features/ai/openai-compatible";
import { assertSafeAiProviderSetting } from "@/features/ai/provider-security";
import type { AiProviderSettingInput } from "@/features/ai/schemas";
import { getMonthlyDashboard } from "@/features/dashboard/service";
import { db } from "@/lib/db";

export type MonthlyInsightDto = {
  month: string;
  content: string;
  createdAt: string;
  updatedAt: string;
};

function toDto(insight: {
  month: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
}): MonthlyInsightDto {
  return {
    month: insight.month,
    content: insight.content,
    createdAt: insight.createdAt.toISOString(),
    updatedAt: insight.updatedAt.toISOString(),
  };
}

export async function getCachedMonthlyInsight(userId: string, month: string) {
  const insight = await db.aiInsight.findUnique({
    where: { userId_month: { userId, month } },
  });

  return insight ? toDto(insight) : null;
}

export async function generateMonthlyInsight(
  userId: string,
  month: string,
  regenerate: boolean,
  setting: AiProviderSettingInput,
) {
  const cached = await getCachedMonthlyInsight(userId, month);

  if (cached && !regenerate) {
    return cached;
  }

  const providerSetting = assertSafeAiProviderSetting(setting);
  const dashboard = await getMonthlyDashboard(userId, month);
  const content = await createOpenAiCompatibleChat({
    baseUrl: providerSetting.baseUrl,
    apiKey: providerSetting.apiKey,
    model: providerSetting.model,
    timeoutMs: 45000,
    messages: [
      {
        role: "system",
        content:
          "Bạn là trợ lý tài chính cá nhân cho người dùng Việt Nam. Trả lời tiếng Việt ngắn gọn, không bịa dữ liệu.",
      },
      {
        role: "user",
        content: [
          `Tháng: ${month}`,
          `Thu nhập: ${dashboard.totals.income}`,
          `Chi tiêu: ${dashboard.totals.expense}`,
          `Còn lại: ${dashboard.totals.remaining}`,
          `Tháng trước - thu nhập: ${dashboard.previousTotals.income}`,
          `Tháng trước - chi tiêu: ${dashboard.previousTotals.expense}`,
          `Tháng trước - còn lại: ${dashboard.previousTotals.remaining}`,
          "Chi theo danh mục:",
          JSON.stringify(dashboard.categoryBreakdown),
          "Hãy viết 3-5 gợi ý ngắn, có số liệu khi hữu ích.",
        ].join("\n"),
      },
    ],
  });
  const insight = await db.aiInsight.upsert({
    where: { userId_month: { userId, month } },
    create: {
      userId,
      month,
      content,
      metadata: {
        totals: dashboard.totals,
        previousTotals: dashboard.previousTotals,
        categoryBreakdown: dashboard.categoryBreakdown,
        model: setting.model,
      },
    },
    update: {
      content,
      metadata: {
        totals: dashboard.totals,
        previousTotals: dashboard.previousTotals,
        categoryBreakdown: dashboard.categoryBreakdown,
        model: setting.model,
      },
    },
  });

  return toDto(insight);
}
