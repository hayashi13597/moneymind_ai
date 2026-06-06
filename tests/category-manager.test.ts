import React from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";

import { CategoryManager } from "@/features/categories/category-manager";

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

jest.mock("sonner", () => ({
  toast: {
    error: jest.fn(),
    success: jest.fn(),
  },
}));

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

const category = {
  id: "cat_food",
  name: "Ăn uống",
  type: "expense" as const,
  color: null,
  icon: null,
  isDefault: false,
};

const sharedCategory = {
  id: "cat_shared",
  name: "Dùng chung cũ",
  type: null,
  color: null,
  icon: null,
  isDefault: false,
};

describe("CategoryManager", () => {
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
    jest.restoreAllMocks();
  });

  it("does not show a shared category group", () => {
    act(() => {
      root.render(
        React.createElement(CategoryManager, {
          initialCategories: [category, sharedCategory],
          categoryInsights: [],
        }),
      );
    });

    expect(container.textContent).not.toContain("Dùng chung");
    expect(container.textContent).not.toContain("Dùng chung cũ");
    expect(container.textContent).toContain("Chi tiêu");
    expect(container.textContent).toContain("Thu nhập");
  });

  it("frames categories as taxonomy coaching for better AI signals", () => {
    act(() => {
      root.render(
        React.createElement(CategoryManager, {
          initialCategories: [category],
          categoryInsights: [],
        }),
      );
    });

    expect(container.textContent).toContain("Taxonomy Coach");
    expect(container.textContent).toContain("Chất lượng tín hiệu AI");
    expect(container.textContent).toContain("MoneyMind gợi ý");
  });

  it("opens an alert dialog before deleting a category", async () => {
    const confirmSpy = jest
      .spyOn(window, "confirm")
      .mockImplementation(() => false);
    const fetchSpy = jest
      .fn()
      .mockResolvedValueOnce({ ok: true })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          categories: [],
        }),
      });
    globalThis.fetch = fetchSpy;

    act(() => {
      root.render(
        React.createElement(CategoryManager, {
          initialCategories: [category],
          categoryInsights: [],
        }),
      );
    });

    await act(async () => {
      container
        .querySelector<HTMLButtonElement>('[aria-label="Xóa danh mục Ăn uống"]')
        ?.click();
    });

    expect(confirmSpy).not.toHaveBeenCalled();
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(document.body.textContent).toContain("Xóa danh mục?");

    await act(async () => {
      document
        .querySelector<HTMLButtonElement>(
          '[aria-label="Xác nhận xóa danh mục Ăn uống"]',
        )
        ?.click();
    });

    expect(fetchSpy).toHaveBeenCalledWith("/api/categories/cat_food", {
      method: "DELETE",
    });
  });

  it("edits a category name and type without using a prompt", async () => {
    const promptSpy = jest.spyOn(window, "prompt");
    const fetchSpy = jest
      .fn()
      .mockResolvedValueOnce({ ok: true })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          categories: [
            {
              ...category,
              name: "Ăn ngoài",
              type: "income",
            },
          ],
        }),
      });
    globalThis.fetch = fetchSpy;

    act(() => {
      root.render(
        React.createElement(CategoryManager, {
          initialCategories: [category],
          categoryInsights: [],
        }),
      );
    });

    await act(async () => {
      container
        .querySelector<HTMLButtonElement>('[aria-label="Sửa danh mục Ăn uống"]')
        ?.click();
    });

    expect(promptSpy).not.toHaveBeenCalled();
    expect(document.body.textContent).toContain("Sửa danh mục");

    await act(async () => {
      const nameInput = document.querySelector<HTMLInputElement>(
        '[role="dialog"] input[name="name"]',
      );
      setInputValue(nameInput!, "Ăn ngoài");
    });

    await act(async () => {
      document
        .querySelector<HTMLButtonElement>(
          '[aria-label="Loại danh mục đang sửa"]',
        )
        ?.click();
    });

    await act(async () => {
      document
        .querySelector<HTMLElement>('[cmdk-item][data-value="income"]')
        ?.click();
    });

    await act(async () => {
      document
        .querySelector<HTMLButtonElement>('[aria-label="Lưu danh mục đã sửa"]')
        ?.click();
    });

    expect(fetchSpy).toHaveBeenCalledWith("/api/categories/cat_food", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Ăn ngoài",
        type: "income",
      }),
    });
  });
});
