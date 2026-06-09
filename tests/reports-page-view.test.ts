import React from "react";
import { renderToStaticMarkup } from "react-dom/server.node";

import { ReportsPageView } from "@/features/reports/reports-page-view";

const dashboard = {
  month: {
    key: "2026-06",
    label: "Tháng 06/2026",
    previousKey: "2026-05",
    nextKey: "2026-07",
  },
  totals: { income: 20000000, expense: 7500000, remaining: 12500000 },
  healthScore: {
    score: 78,
    level: "Đang tích lũy tốt",
    savingsRate: 62,
    explanation: "Tỷ lệ tiết kiệm 62%.",
  },
  categoryBreakdown: [
    {
      categoryId: "cat_food",
      name: "Ăn uống",
      color: null,
      amount: 2500000,
      percentage: 33,
    },
  ],
  categoryAnalysis: [
    {
      categoryId: "cat_food",
      name: "Ăn uống",
      color: null,
      amount: 2500000,
      percentage: 33,
      previousAmount: 1800000,
      changePercentage: 39,
      changeKind: "increased" as const,
    },
  ],
  spendingTrend: [
    { date: "2026-06-01", amount: 0 },
    { date: "2026-06-02", amount: 900000 },
  ],
};

const budgets = {
  rows: [],
  items: [],
  summary: {
    totalBudget: 10000000,
    totalSpent: 7500000,
    remaining: 2500000,
    overAmount: 0,
  },
};

describe("ReportsPageView", () => {
  it("renders an AI pattern lab with evidence-led analytics", () => {
    const markup = renderToStaticMarkup(
      React.createElement(ReportsPageView, { dashboard, budgets }),
    );

    expect(markup).toContain("Báo cáo tháng");
    expect(markup).toContain("Đọc mẫu chi tiêu trước khi chỉnh ngân sách");
    expect(markup).toContain("MoneyMind gợi ý");
    expect(markup).toContain("Ăn uống");
  });
});
