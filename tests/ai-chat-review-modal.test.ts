import React from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";

import { AiChatTransactionReviewModal } from "@/features/ai-chat/transaction-review-modal";
import type { AiChatTransactionDraft } from "@/features/ai-chat/schemas";

jest.mock("@/features/transactions/actions", () => ({
  createTransactionAction: jest.fn(),
}));

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean })
  .IS_REACT_ACT_ENVIRONMENT = true;

const categories = [
  { id: "cat_food", name: "Ăn uống", type: "expense" as const },
  { id: "cat_income", name: "Thu nhập", type: "income" as const },
];

const draft: AiChatTransactionDraft = {
  type: "expense",
  amount: 55000,
  categoryId: "cat_food",
  categoryName: "Ăn uống",
  note: "Tiền ăn bún bò huế",
  merchant: "Quán bún bò",
  rawInput: "Thêm chi tiêu hôm nay là 55k tiền ăn bún bò huế",
  transactionDate: "2026-05-27",
};

function renderModal({
  root,
  draft,
  categories: modalCategories = categories,
  onClose = jest.fn(),
  onSaved = jest.fn(),
}: {
  root: Root;
  draft: AiChatTransactionDraft | null;
  categories?: typeof categories;
  onClose?: () => void;
  onSaved?: () => void;
}) {
  act(() => {
    root.render(
      React.createElement(AiChatTransactionReviewModal, {
        draft,
        categories: modalCategories,
        onClose,
        onSaved,
      }),
    );
  });
}

describe("AiChatTransactionReviewModal", () => {
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

  it("hydrates form fields when a draft arrives after initial null render", () => {
    renderModal({ root, draft: null });

    expect(container.textContent).toBe("");

    renderModal({ root, draft });

    const typeCombobox = document.body.querySelector<HTMLButtonElement>(
      'button[role="combobox"][aria-label="Loại"]',
    );
    const categoryCombobox = document.body.querySelector<HTMLButtonElement>(
      'button[role="combobox"][aria-label="Danh mục"]',
    );
    const amountInput = document.body.querySelector<HTMLInputElement>(
      'input[value="55000"]',
    );
    const datePickerButton = document.body.querySelector<HTMLButtonElement>(
      'button[aria-label="Chọn ngày"]',
    );
    const dateInput = document.body.querySelector<HTMLInputElement>(
      'input[type="hidden"][value="2026-05-27"]',
    );
    const merchantInput = document.body.querySelector<HTMLInputElement>(
      'input[placeholder="Tùy chọn"]',
    );
    const noteInput = document.body.querySelector<HTMLInputElement>(
      'input[placeholder="Ghi chú"]',
    );

    expect(typeCombobox?.textContent).toContain("Chi tiêu");
    expect(amountInput?.value).toBe("55000");
    expect(categoryCombobox?.textContent).toContain("Ăn uống");
    expect(datePickerButton?.textContent).toContain("27/05/2026");
    expect(dateInput?.value).toBe("2026-05-27");
    expect(merchantInput?.value).toBe("Quán bún bò");
    expect(noteInput?.value).toBe("Tiền ăn bún bò huế");
  });

  it("disables saving when no category matches the draft type", () => {
    renderModal({ root, draft, categories: [] });

    const saveButton = Array.from(document.body.querySelectorAll("button")).find(
      (button) => button.textContent === "Lưu giao dịch",
    );

    expect(document.body.textContent).toContain("Không có danh mục phù hợp");
    expect(saveButton?.disabled).toBe(true);
  });
});
