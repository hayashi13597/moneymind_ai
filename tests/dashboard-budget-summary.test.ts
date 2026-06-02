import React from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";

import type { MonthlyInsightDto } from "@/features/ai/monthly-insight";
import { DashboardView } from "@/features/dashboard/dashboard-view";
import type { MonthlyDashboard } from "@/features/dashboard/service";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean })
  .IS_REACT_ACT_ENVIRONMENT = true;

jest.mock("@/features/ai/monthly-insight-panel", () => ({
  MonthlyInsightPanel: () => React.createElement("div", null, "Insight panel"),
}));

jest.mock("@/features/dashboard/ask-moneymind-panel", () => ({
  AskMoneyMindPanel: () => React.createElement("div", null, "Ask panel"),
}));

const dashboard: MonthlyDashboard = {
  month: {
    key: "2026-06",
    label: "Tháng 06/2026",
    previousKey: "2026-05",
    nextKey: "2026-07",
  },
  totals: { income: 10000000, expense: 3120000, remaining: 6880000 },
  previousTotals: { income: 9000000, expense: 2500000, remaining: 6500000 },
  healthScore: {
    score: 82,
    level: "Ổn",
    savingsRate: 68,
    explanation: "Bạn vẫn giữ lại được phần lớn thu nhập.",
  },
  comparison: {
    income: { kind: "increased", delta: 1000000, percentage: 11 },
    expense: { kind: "increased", delta: 620000, percentage: 25 },
    remaining: { kind: "increased", delta: 380000, percentage: 6 },
  },
  categoryBreakdown: [],
  categoryAnalysis: [],
  spendingTrend: [],
  recentTransactions: [],
  isEmpty: false,
};

const initialInsight: MonthlyInsightDto | null = null;

const budgetSummary = {
  summary: {
    totalBudget: 3500000,
    totalSpent: 3120000,
    remaining: 380000,
    overAmount: 120000,
  },
  rows: [],
  items: [
    {
      categoryId: "cat_cafe",
      categoryName: "Cafe",
      categoryColor: "#8B5E34",
      defaultAmount: 500000,
      monthAmount: null,
      effectiveAmount: 500000,
      spentAmount: 620000,
      remainingAmount: -120000,
      progressPercentage: 124,
      status: "over_limit" as const,
    },
    {
      categoryId: "cat_food",
      categoryName: "Ăn uống",
      categoryColor: "#C76F3D",
      defaultAmount: 3000000,
      monthAmount: null,
      effectiveAmount: 3000000,
      spentAmount: 2500000,
      remainingAmount: 500000,
      progressPercentage: 83,
      status: "near_limit" as const,
    },
  ],
};

describe("Dashboard budget summary", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
  });

  it("renders budget summary and selected-month link", () => {
    act(() => {
      root.render(
        React.createElement(DashboardView, {
          dashboard,
          initialInsight,
          userName: "Lâm",
          budgetSummary,
        }),
      );
    });

    expect(container.textContent).toContain("Ngân sách tháng này");
    expect(container.textContent).toContain("Cafe");
    expect(container.textContent).toContain("Đã vượt");
    expect(container.textContent).toContain("Ăn uống");
    expect(container.textContent).toContain("Gần vượt");
    expect(
      container.querySelector<HTMLAnchorElement>(
        'a[href="/budgets?month=2026-06"]',
      ),
    ).not.toBeNull();
  });
});
