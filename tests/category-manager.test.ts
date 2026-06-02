import React from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";

import { CategoryManager } from "@/features/categories/category-manager";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean })
  .IS_REACT_ACT_ENVIRONMENT = true;

jest.mock("sonner", () => ({
  toast: {
    error: jest.fn(),
    success: jest.fn(),
  },
}));

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
});
