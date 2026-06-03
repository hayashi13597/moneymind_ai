import React from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";

import { BudgetManager } from "@/features/budgets/budget-manager";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean })
  .IS_REACT_ACT_ENVIRONMENT = true;

const pushMock = jest.fn();
const refreshMock = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: pushMock,
    refresh: refreshMock,
  }),
}));

const selectedMonth = {
  key: "2026-06",
  label: "Tháng 06/2026",
  previousKey: "2026-05",
  nextKey: "2026-07",
};

const budgetData = {
  summary: {
    totalBudget: 3500000,
    totalSpent: 3120000,
    remaining: 380000,
    overAmount: 120000,
  },
  rows: [
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
      categoryId: "cat_health",
      categoryName: "Sức khỏe",
      categoryColor: null,
      defaultAmount: null,
      monthAmount: null,
      effectiveAmount: null,
      spentAmount: 0,
      remainingAmount: null,
      progressPercentage: null,
      status: "not_set" as const,
    },
  ],
};

describe("BudgetManager", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    pushMock.mockReset();
    refreshMock.mockReset();
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
    jest.restoreAllMocks();
  });

  it("renders summary totals and row statuses", () => {
    act(() => {
      root.render(
        React.createElement(BudgetManager, {
          selectedMonth,
          initialData: budgetData,
        }),
      );
    });

    expect(container.textContent).toContain("Tổng ngân sách");
    expect(container.textContent).toContain("3.500.000");
    expect(container.textContent).toContain("Ăn uống");
    expect(container.textContent).toContain("Gần vượt");
    expect(container.textContent).toContain("Cafe");
    expect(container.textContent).toContain("Đã vượt");
    expect(container.textContent).toContain("Sức khỏe");
    expect(container.textContent).toContain("Chưa đặt");
  });

  it("shows one edit action per budget row", () => {
    act(() => {
      root.render(
        React.createElement(BudgetManager, {
          selectedMonth,
          initialData: budgetData,
        }),
      );
    });

    expect(
      container.querySelectorAll('[aria-label^="Sửa ngân sách cho "]'),
    ).toHaveLength(budgetData.rows.length);
    expect(
      container.querySelector(
        '[aria-label="Sửa ngân sách tháng này cho Ăn uống"]',
      ),
    ).toBeNull();
    expect(
      container.querySelector(
        '[aria-label="Sửa ngân sách mặc định cho Ăn uống"]',
      ),
    ).toBeNull();
  });

  it("navigates between budget months", () => {
    act(() => {
      root.render(
        React.createElement(BudgetManager, {
          selectedMonth,
          initialData: budgetData,
        }),
      );
    });

    act(() => {
      container
        .querySelector<HTMLButtonElement>(
          '[aria-label="Xem ngân sách tháng trước"]',
        )
        ?.click();
    });

    expect(pushMock).toHaveBeenCalledWith("/budgets?month=2026-05");
  });

  it("submits a selected-month override and refreshes", async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ budget: { id: "budget_1" } }),
    });
    globalThis.fetch = fetchMock;

    act(() => {
      root.render(
        React.createElement(BudgetManager, {
          selectedMonth,
          initialData: budgetData,
        }),
      );
    });

    await act(async () => {
      container
        .querySelector<HTMLButtonElement>(
          '[aria-label="Sửa ngân sách cho Ăn uống"]',
        )
        ?.click();
    });

    await act(async () => {
      const input =
        document.querySelector<HTMLInputElement>('input[name="amount"]');
      if (input) {
        input.value = "4tr";
        input.dispatchEvent(new Event("input", { bubbles: true }));
      }
    });

    await act(async () => {
      document
        .querySelector<HTMLButtonElement>('[aria-label="Lưu ngân sách"]')
        ?.click();
    });

    expect(fetchMock).toHaveBeenCalledWith("/api/budgets", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        categoryId: "cat_food",
        scope: "month",
        month: "2026-06",
        amount: "4tr",
      }),
    });
    expect(refreshMock).toHaveBeenCalled();
  });

  it("can switch the edit dialog to update a default budget", async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ budget: { id: "budget_1" } }),
    });
    globalThis.fetch = fetchMock;

    act(() => {
      root.render(
        React.createElement(BudgetManager, {
          selectedMonth,
          initialData: budgetData,
        }),
      );
    });

    await act(async () => {
      container
        .querySelector<HTMLButtonElement>(
          '[aria-label="Sửa ngân sách cho Ăn uống"]',
        )
        ?.click();
    });

    await act(async () => {
      document
        .querySelector<HTMLButtonElement>('[aria-label="Sửa ngân sách mặc định"]')
        ?.click();
    });

    await act(async () => {
      const input =
        document.querySelector<HTMLInputElement>('input[name="amount"]');
      if (input) {
        input.value = "5tr";
        input.dispatchEvent(new Event("input", { bubbles: true }));
      }
    });

    await act(async () => {
      document
        .querySelector<HTMLButtonElement>('[aria-label="Lưu ngân sách"]')
        ?.click();
    });

    expect(fetchMock).toHaveBeenCalledWith("/api/budgets", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        categoryId: "cat_food",
        scope: "default",
        amount: "5tr",
      }),
    });
  });

  it("names the edit dialog and moves focus into it", async () => {
    act(() => {
      root.render(
        React.createElement(BudgetManager, {
          selectedMonth,
          initialData: budgetData,
        }),
      );
    });

    await act(async () => {
      container
        .querySelector<HTMLButtonElement>(
          '[aria-label="Sửa ngân sách cho Ăn uống"]',
        )
        ?.click();
    });

    const dialog = document.querySelector<HTMLDivElement>('[role="dialog"]');
    const heading = document.querySelector<HTMLHeadingElement>(
      "#budget-edit-dialog-title",
    );

    expect(dialog?.getAttribute("aria-labelledby")).toBe(
      "budget-edit-dialog-title",
    );
    expect(heading?.textContent).toBe("Ăn uống");
    expect(document.activeElement).toBe(
      document.querySelector<HTMLInputElement>('input[name="amount"]'),
    );
  });

  it("closes the edit dialog on Escape", async () => {
    act(() => {
      root.render(
        React.createElement(BudgetManager, {
          selectedMonth,
          initialData: budgetData,
        }),
      );
    });

    await act(async () => {
      container
        .querySelector<HTMLButtonElement>(
          '[aria-label="Sửa ngân sách cho Ăn uống"]',
        )
        ?.click();
    });

    expect(document.querySelector('[role="dialog"]')).not.toBeNull();

    await act(async () => {
      document
        .querySelector('[role="dialog"]')
        ?.dispatchEvent(
          new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
        );
    });

    expect(document.querySelector('[role="dialog"]')).toBeNull();
  });
});
