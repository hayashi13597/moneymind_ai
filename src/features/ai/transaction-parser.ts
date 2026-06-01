import { AiDomainError } from "@/features/ai/errors";
import { createOpenAiCompatibleChat } from "@/features/ai/openai-compatible";
import { assertSafeAiProviderSetting } from "@/features/ai/provider-security";
import {
  aiTransactionOutputSchema,
  type AiProviderSettingInput,
} from "@/features/ai/schemas";
import { db } from "@/lib/db";

type UserCategory = {
  id: string;
  name: string;
  type: "income" | "expense" | null;
};

function toDateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function normalizeCategoryName(name: string) {
  return name.trim().toLocaleLowerCase("vi-VN");
}

function extractJsonObject(content: string) {
  for (
    let start = content.indexOf("{");
    start !== -1;
    start = content.indexOf("{", start + 1)
  ) {
    let depth = 0;
    let inString = false;
    let escaped = false;

    for (let index = start; index < content.length; index += 1) {
      const char = content[index];

      if (escaped) {
        escaped = false;
        continue;
      }

      if (char === "\\") {
        escaped = true;
        continue;
      }

      if (char === '"') {
        inString = !inString;
        continue;
      }

      if (inString) {
        continue;
      }

      if (char === "{") {
        depth += 1;
      }

      if (char === "}") {
        depth -= 1;

        if (depth === 0) {
          return content.slice(start, index + 1);
        }
      }
    }
  }

  return null;
}

function resolveCategory(
  categories: UserCategory[],
  type: "income" | "expense",
  categoryName: string,
) {
  const compatible = categories.filter(
    (category) => !category.type || category.type === type,
  );
  const normalizedName = normalizeCategoryName(categoryName);
  const exact = compatible.find(
    (category) => normalizeCategoryName(category.name) === normalizedName,
  );

  if (exact) {
    return exact;
  }

  const fallbackName = type === "income" ? "thu nhập" : "khác";
  const fallback = compatible.find(
    (category) => normalizeCategoryName(category.name) === fallbackName,
  );

  return fallback ?? compatible[0];
}

function parseJsonObject(content: string) {
  const jsonContent = extractJsonObject(content);

  if (!jsonContent) {
    throw new AiDomainError("invalid_ai_output");
  }

  try {
    return JSON.parse(jsonContent);
  } catch {
    throw new AiDomainError("invalid_ai_output");
  }
}

export async function parseTransactionWithAi(
  userId: string,
  input: string,
  setting: AiProviderSettingInput,
  today = new Date(),
) {
  const providerSetting = assertSafeAiProviderSetting(setting);
  const categories = await db.category.findMany({
    where: { userId },
    select: { id: true, name: true, type: true },
    orderBy: [{ isDefault: "desc" }, { name: "asc" }],
  });

  const categoryList = categories
    .map((category) => `- ${category.name} (${category.type ?? "any"})`)
    .join("\n");
  const content = await createOpenAiCompatibleChat({
    baseUrl: providerSetting.baseUrl,
    apiKey: providerSetting.apiKey,
    model: providerSetting.model,
    messages: [
      {
        role: "system",
        content:
          "Bạn phân tích giao dịch tài chính cá nhân tiếng Việt. Chỉ trả JSON hợp lệ, không markdown.",
      },
      {
        role: "user",
        content: [
          `Hôm nay là ${toDateKey(today)}.`,
          "Danh mục hợp lệ:",
          categoryList,
          "Input người dùng:",
          input,
          'Trả JSON với keys: type ("income"|"expense"), amount (integer VND), categoryName, note, merchant (string|null), transactionDate (YYYY-MM-DD).',
        ].join("\n"),
      },
    ],
  });
  const parsed = aiTransactionOutputSchema.safeParse(parseJsonObject(content));

  if (!parsed.success) {
    throw new AiDomainError("invalid_ai_output");
  }

  const category = resolveCategory(
    categories,
    parsed.data.type,
    parsed.data.categoryName,
  );

  if (!category) {
    throw new AiDomainError("invalid_ai_output");
  }

  return {
    type: parsed.data.type,
    amount: parsed.data.amount,
    categoryId: category.id,
    categoryName: category.name,
    note: parsed.data.note,
    merchant: parsed.data.merchant ?? null,
    rawInput: input,
    transactionDate: parsed.data.transactionDate,
  };
}
