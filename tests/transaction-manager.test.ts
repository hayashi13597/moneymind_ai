import React from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";

import { TransactionManager } from "@/features/transactions/transaction-manager";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean })
  .IS_REACT_ACT_ENVIRONMENT = true;

const categories = [
  { id: "cat_income", name: "Thu nhập", type: "income" as const },
];

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
        }),
      );
    });

    expect(container.textContent).toContain("Chưa có giao dịch.");

    act(() => {
      root.render(
        React.createElement(TransactionManager, {
          initialTransactions: [incomeTransaction],
          categories,
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
});
