import React from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";

import { TransactionManager } from "@/features/transactions/transaction-manager";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean })
  .IS_REACT_ACT_ENVIRONMENT = true;

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

(globalThis as typeof globalThis & { ResizeObserver: typeof ResizeObserver })
  .ResizeObserver = ResizeObserverMock as typeof ResizeObserver;
Element.prototype.scrollIntoView = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: pushMock,
  }),
}));

const pushMock = jest.fn();

function setInputValue(input: HTMLInputElement, value: string) {
  const valueSetter = Object.getOwnPropertyDescriptor(input, "value")?.set;
  const prototypeValueSetter = Object.getOwnPropertyDescriptor(
    HTMLInputElement.prototype,
    "value",
  )?.set;

  if (prototypeValueSetter && valueSetter !== prototypeValueSetter) {
    prototypeValueSetter.call(input, value);
  } else {
    valueSetter?.call(input, value);
  }

  input.dispatchEvent(new Event("input", { bubbles: true }));
}

const categories = [
  { id: "cat_income", name: "Thu nhập", type: "income" as const },
  { id: "cat_bonus", name: "Thưởng", type: "income" as const },
  { id: "cat_food", name: "Ăn uống", type: "expense" as const },
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

function makeTransaction(index: number) {
  return {
    ...incomeTransaction,
    id: `tx_${index}`,
    amount: 10000 + index,
    note: `Giao dịch ${index}`,
    rawInput: null,
  };
}

describe("TransactionManager", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    pushMock.mockReset();
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

    expect(container.textContent).toContain(
      "Chưa có giao dịch để MoneyMind học từ tháng này",
    );

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

  it("leads with an AI coach capture experience", () => {
    act(() => {
      root.render(
        React.createElement(TransactionManager, {
          initialTransactions: [incomeTransaction],
          categories,
          selectedMonth,
        }),
      );
    });

    expect(container.textContent).toContain("Coach Capture");
    expect(container.textContent).toContain(
      "Ghi lại hôm nay bằng ngôn ngữ tự nhiên",
    );
    expect(container.textContent).toContain("MoneyMind gợi ý");
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

    expect(container.textContent).toContain("Tháng 05/2026");
    expect(monthNavigation).not.toBeNull();
    expect(monthPickerButton).not.toBeNull();
    expect(monthPickerButton?.textContent).toContain("Tháng 05/2026");
    expect(monthPickerButton?.textContent).not.toContain("01/05/2026");
  });

  it("renders server-paginated transactions and navigates when users change page size", async () => {
    act(() => {
      root.render(
        React.createElement(TransactionManager, {
          initialTransactions: Array.from({ length: 5 }, (_, index) =>
            makeTransaction(index + 1),
          ),
          categories,
          selectedMonth,
          pagination: {
            total: 6,
            page: 1,
            pageSize: 5,
          },
        }),
      );
    });

    expect(container.textContent).toContain("Giao dịch 1");
    expect(container.textContent).toContain("Giao dịch 5");
    expect(container.textContent).not.toContain("Giao dịch 6");
    expect(container.textContent).toContain("1-5 trong 6 giao dịch");
    expect(container.textContent).toContain("Trang 1 / 2");

    await act(async () => {
      container
        .querySelector<HTMLButtonElement>('[aria-label="Số giao dịch mỗi trang"]')
        ?.click();
    });

    await act(async () => {
      document
        .querySelector<HTMLElement>('[cmdk-item][data-value="10"]')
        ?.click();
    });

    expect(pushMock).toHaveBeenCalledWith(
      "/transactions?month=2026-05&page=1&pageSize=10",
    );
  });

  it("keeps the monthly summary independent from the visible transaction page", () => {
    act(() => {
      root.render(
        React.createElement(TransactionManager, {
          initialTransactions: [
            {
              ...incomeTransaction,
              id: "tx_page_2",
              type: "expense",
              amount: 10000,
              note: "Chi tiêu ở trang 2",
              category: categories[2],
            },
          ],
          categories,
          selectedMonth,
          pagination: {
            total: 6,
            page: 2,
            pageSize: 5,
          },
          summary: {
            income: 100000,
            expense: 50000,
            balance: 50000,
            topCategory: {
              id: "cat_food",
              name: "Ăn uống",
              amount: 50000,
            },
          },
        }),
      );
    });

    expect(container.textContent).toContain("100.000 ₫");
    expect(container.textContent).toContain("50.000 ₫");
    expect(container.textContent).toContain("Tổng thu trong tháng");
    expect(container.textContent).toContain("Lớn nhất: Ăn uống");
  });

  it("opens an alert dialog before deleting a transaction", async () => {
    const confirmSpy = jest
      .spyOn(window, "confirm")
      .mockImplementation(() => false);
    const fetchSpy = jest
      .fn()
      .mockResolvedValueOnce({ ok: true })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          transactions: [],
        }),
      });
    globalThis.fetch = fetchSpy;

    act(() => {
      root.render(
        React.createElement(TransactionManager, {
          initialTransactions: [incomeTransaction],
          categories,
          selectedMonth,
        }),
      );
    });

    await act(async () => {
      container
        .querySelector<HTMLButtonElement>(
          '[aria-label="Xóa giao dịch Lương tháng này"]',
        )
        ?.click();
    });

    expect(confirmSpy).not.toHaveBeenCalled();
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(document.body.textContent).toContain("Xóa giao dịch?");

    await act(async () => {
      document
        .querySelector<HTMLButtonElement>(
          '[aria-label="Xác nhận xóa giao dịch Lương tháng này"]',
        )
        ?.click();
    });

    expect(fetchSpy).toHaveBeenCalledWith("/api/transactions/tx_income", {
      method: "DELETE",
    });
  });

  it("edits a transaction with the same fields as the create form", async () => {
    const promptSpy = jest.spyOn(window, "prompt");
    const fetchSpy = jest
      .fn()
      .mockResolvedValueOnce({ ok: true })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          transactions: [],
          pagination: {
            total: 0,
            page: 1,
            pageSize: 5,
          },
        }),
      });
    globalThis.fetch = fetchSpy;

    act(() => {
      root.render(
        React.createElement(TransactionManager, {
          initialTransactions: [incomeTransaction],
          categories,
          selectedMonth,
          pagination: {
            total: 1,
            page: 1,
            pageSize: 5,
          },
        }),
      );
    });

    await act(async () => {
      container
        .querySelector<HTMLButtonElement>(
          '[aria-label="Sửa giao dịch Lương tháng này"]',
        )
        ?.click();
    });

    expect(promptSpy).not.toHaveBeenCalled();
    expect(document.body.textContent).toContain("Sửa giao dịch");

    await act(async () => {
      const amountInput = document.querySelector<HTMLInputElement>(
        '[role="dialog"] input[name="amount"]',
      );
      setInputValue(amountInput!, "120k");

      const noteInput = document.querySelector<HTMLInputElement>(
        '[role="dialog"] input[name="note"]',
      );
      setInputValue(noteInput!, "Lương và thưởng");

      const merchantInput = document.querySelector<HTMLInputElement>(
        '[role="dialog"] input[name="merchant"]',
      );
      setInputValue(merchantInput!, "Công ty");
    });

    await act(async () => {
      document
        .querySelector<HTMLButtonElement>('[aria-label="Lưu giao dịch đã sửa"]')
        ?.click();
    });

    expect(fetchSpy).toHaveBeenCalledWith("/api/transactions/tx_income", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "income",
        amount: "120k",
        categoryId: "cat_income",
        note: "Lương và thưởng",
        merchant: "Công ty",
        rawInput: "Thêm thu nhập lương tháng này 55k",
        transactionDate: "2026-05-27",
      }),
    });
  });
});
