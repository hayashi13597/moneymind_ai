import React from "react";
import { renderToStaticMarkup } from "react-dom/server.node";

import { InsightsPageView } from "@/features/ai/insights-page-view";

jest.mock("@/features/ai/monthly-insight-panel", () => ({
  MonthlyInsightPanel: ({ month }: { month: string }) =>
    React.createElement("section", null, `Monthly insight for ${month}`),
}));

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
};

describe("InsightsPageView", () => {
  it("renders a coach journal around monthly AI insight generation", () => {
    const markup = renderToStaticMarkup(
      React.createElement(InsightsPageView, {
        dashboard,
        initialInsight: null,
      }),
    );

    expect(markup).toContain("Nhận xét AI");
    expect(markup).toContain("Ghi chú tài chính cho từng tháng");
    expect(markup).toContain("MoneyMind gợi ý");
    expect(markup).toContain("Monthly insight for 2026-06");
  });
});
