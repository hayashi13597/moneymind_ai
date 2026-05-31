import React from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";

import { TransactionManager } from "@/features/transactions/transaction-manager";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean })
  .IS_REACT_ACT_ENVIRONMENT = true;

jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
}));

const categories = [
  { id: "cat_income", name: "Thu nhập", type: "income" as const },
];

const selectedMonth = {
  key: "2026-05",
  label: "Tháng 05/2026",
  previousKey: "2026-04",
  nextKey: "2026-06",
};

const incomeTransaction = {
  id: "tx_income",
  type: "income" as const,
  amount: 55000,
  note: "Lương tháng này",
  merchant: null,
  rawInput: "Thêm thu nhập lương tháng này 55k",
  transactionDate: "2026-05-27T00:00:00.000Z",
  category: categories[0],
};

describe("TransactionManager", () => {
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

  it("syncs the visible list when server-rendered transactions change", () => {
    act(() => {
      root.render(
        React.createElement(TransactionManager, {
          initialTransactions: [],
          categories,
          selectedMonth,
        }),
      );
    });

    expect(container.textContent).toContain("Chưa có giao dịch.");

    act(() => {
      root.render(
        React.createElement(TransactionManager, {
          initialTransactions: [incomeTransaction],
          categories,
          selectedMonth,
        }),
      );
    });

    expect(container.textContent).toContain("Lương tháng này");
  });

  it("uses the shadcn date picker for the transaction date field", () => {
    act(() => {
      root.render(
        React.createElement(TransactionManager, {
          initialTransactions: [],
          categories,
          selectedMonth,
        }),
      );
    });

    const nativeDateInput =
      container.querySelector<HTMLInputElement>('input[type="date"]');
    const datePickerButton = container.querySelector<HTMLButtonElement>(
      'button[aria-label="Chọn ngày giao dịch"]',
    );
    const hiddenDateInput = container.querySelector<HTMLInputElement>(
      'input[type="hidden"][name="transactionDate"]',
    );

    expect(nativeDateInput).toBeNull();
    expect(datePickerButton).not.toBeNull();
    expect(hiddenDateInput?.value).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("defaults new transaction dates to the visible month", () => {
    const pastSelectedMonth = {
      key: "2026-04",
      label: "Tháng 04/2026",
      previousKey: "2026-03",
      nextKey: "2026-05",
    };

    act(() => {
      root.render(
        React.createElement(TransactionManager, {
          initialTransactions: [],
          categories,
          selectedMonth: pastSelectedMonth,
        }),
      );
    });

    const hiddenDateInput = container.querySelector<HTMLInputElement>(
      'input[type="hidden"][name="transactionDate"]',
    );

    expect(hiddenDateInput?.value).toBe("2026-04-01");
  });

  it("shows a month-year picker without exposing a day value", () => {
    act(() => {
      root.render(
        React.createElement(TransactionManager, {
          initialTransactions: [incomeTransaction],
          categories,
          selectedMonth,
        }),
      );
    });

    const monthPickerButton = container.querySelector<HTMLButtonElement>(
      'button[aria-label="Chọn tháng giao dịch"]',
    );
    const monthNavigation = container.querySelector<HTMLElement>(
      '[aria-label="Điều hướng tháng giao dịch"]',
    );

    expect(container.textContent).toContain("tháng 05/2026");
    expect(monthNavigation).not.toBeNull();
    expect(monthPickerButton).not.toBeNull();
    expect(monthPickerButton?.textContent).toContain("Tháng 05/2026");
    expect(monthPickerButton?.textContent).not.toContain("01/05/2026");
  });
});
