import React from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";

import { readLocalAiProviderSetting } from "@/features/ai/local-settings";
import { AiChatWidget } from "@/features/ai-chat/widget";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean })
  .IS_REACT_ACT_ENVIRONMENT = true;

jest.mock("@/features/ai/local-settings", () => ({
  readLocalAiProviderSetting: jest.fn(),
}));

jest.mock("@/features/ai-chat/transaction-review-modal", () => ({
  AiChatTransactionReviewModal: () => null,
}));

const readLocalAiProviderSettingMock = readLocalAiProviderSetting as jest.Mock;
const fetchMock = jest.fn();

function changeInput(input: HTMLInputElement, value: string) {
  const valueSetter = Object.getOwnPropertyDescriptor(
    HTMLInputElement.prototype,
    "value",
  )?.set;

  valueSetter?.call(input, value);
  input.dispatchEvent(new Event("input", { bubbles: true }));
  input.dispatchEvent(new Event("change", { bubbles: true }));
}

describe("AiChatWidget", () => {
  let container: HTMLDivElement;
  let root: Root;
  const originalFetch = global.fetch;

  beforeEach(() => {
    readLocalAiProviderSettingMock.mockReset();
    fetchMock.mockReset();
    global.fetch = fetchMock;
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
  });

  it("keeps the typed message when provider settings are missing", async () => {
    readLocalAiProviderSettingMock.mockReturnValue(null);

    act(() => {
      root.render(React.createElement(AiChatWidget, { categories: [] }));
    });

    await act(async () => {
      container
        .querySelector<HTMLButtonElement>('[aria-label="Mở chat AI"]')
        ?.click();
    });

    const input = container.querySelector<HTMLInputElement>("input")!;

    await act(async () => {
      changeInput(input, "Tôi chi gì nhiều nhất?");
      container
        .querySelector<HTMLButtonElement>('[aria-label="Gửi tin nhắn"]')
        ?.click();
    });

    expect(input.value).toBe("Tôi chi gì nhiều nhất?");
    expect(container.textContent).toContain(
      "Bạn cần cấu hình nhà cung cấp AI trước.",
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
