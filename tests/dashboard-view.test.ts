import React from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";

import { DashboardView } from "@/features/dashboard/dashboard-view";
import { AI_PROVIDER_SETTING_STORAGE_KEY } from "@/features/ai/local-settings";
import type { MonthlyInsightDto } from "@/features/ai/monthly-insight";
import type { MonthlyDashboard } from "@/features/dashboard/service";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean })
  .IS_REACT_ACT_ENVIRONMENT = true;

const fetchMock = jest.fn();
const originalFetch = global.fetch;

function makeDashboard(monthKey: string): MonthlyDashboard {
  return {
    month: {
      key: monthKey,
      label: `Tháng ${monthKey.slice(5, 7)}/${monthKey.slice(0, 4)}`,
      previousKey: "2026-04",
      nextKey: "2026-06",
    },
    totals: { income: 0, expense: 0, remaining: 0 },
    previousTotals: { income: 0, expense: 0, remaining: 0 },
    healthScore: {
      score: 0,
      level: "Chưa có dữ liệu",
      savingsRate: 0,
      explanation: "Thêm giao dịch để MoneyMind AI tính điểm tài chính.",
    },
    comparison: {
      income: { kind: "no_previous_data" },
      expense: { kind: "no_previous_data" },
      remaining: { kind: "no_previous_data" },
    },
    categoryBreakdown: [],
    categoryAnalysis: [],
    spendingTrend: [],
    recentTransactions: [],
    isEmpty: true,
  };
}

function renderDashboard({
  root,
  monthKey,
  initialInsight = null,
}: {
  root: Root;
  monthKey: string;
  initialInsight?: MonthlyInsightDto | null;
}) {
  act(() => {
    root.render(
      React.createElement(DashboardView, {
        dashboard: makeDashboard(monthKey),
        initialInsight,
        userName: "Hayashi",
      }),
    );
  });
}

describe("DashboardView", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    fetchMock.mockReset();
    global.fetch = fetchMock;
    window.localStorage.setItem(
      AI_PROVIDER_SETTING_STORAGE_KEY,
      JSON.stringify({
        baseUrl: "https://provider.example/v1",
        apiKey: "sk-test",
        model: "model",
      }),
    );
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
    global.fetch = originalFetch;
    fetchMock.mockReset();
    window.localStorage.clear();
  });

  it("resets the Ask MoneyMind AI panel when the selected month changes", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        message: {
          role: "assistant",
          content: "Câu trả lời cho tháng 05.",
        },
      }),
    });

    renderDashboard({ root, monthKey: "2026-05" });

    const promptButton = Array.from(container.querySelectorAll("button")).find(
      (button) => button.textContent === "Tháng này tôi đã chi quá tay ở đâu?",
    );

    expect(promptButton).toBeDefined();

    await act(async () => {
      promptButton?.click();
      await Promise.resolve();
    });

    expect(container.textContent).toContain("Câu trả lời cho tháng 05.");

    renderDashboard({ root, monthKey: "2026-06" });

    expect(container.textContent).not.toContain("Câu trả lời cho tháng 05.");
  });

  it("shows the monthly AI insight for the selected month", () => {
    renderDashboard({
      root,
      monthKey: "2026-04",
      initialInsight: {
        month: "2026-04",
        content: "Phân tích riêng cho tháng 04.",
        createdAt: "2026-04-30T00:00:00.000Z",
        updatedAt: "2026-04-30T00:00:00.000Z",
      },
    });

    expect(container.textContent).toContain("Phân tích riêng cho tháng 04.");

    renderDashboard({
      root,
      monthKey: "2026-05",
      initialInsight: {
        month: "2026-05",
        content: "Phân tích riêng cho tháng 05.",
        createdAt: "2026-05-31T00:00:00.000Z",
        updatedAt: "2026-05-31T00:00:00.000Z",
      },
    });

    expect(container.textContent).toContain("Phân tích riêng cho tháng 05.");
    expect(container.textContent).not.toContain("Phân tích riêng cho tháng 04.");
  });
});
