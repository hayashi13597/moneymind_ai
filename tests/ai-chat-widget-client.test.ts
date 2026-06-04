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

function changeField(
  field: HTMLInputElement | HTMLTextAreaElement,
  value: string,
) {
  const prototype =
    field instanceof HTMLTextAreaElement
      ? HTMLTextAreaElement.prototype
      : HTMLInputElement.prototype;
  const valueSetter = Object.getOwnPropertyDescriptor(
    prototype,
    "value",
  )?.set;

  valueSetter?.call(field, value);
  field.dispatchEvent(new Event("input", { bubbles: true }));
  field.dispatchEvent(new Event("change", { bubbles: true }));
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

    const input = container.querySelector<HTMLTextAreaElement>("textarea")!;

    await act(async () => {
      changeField(input, "Tôi chi gì nhiều nhất?");
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

  it("posts chat messages to the agent route", async () => {
    readLocalAiProviderSettingMock.mockReturnValue({
      baseUrl: "https://openrouter.ai/api/v1",
      apiKey: "sk-test",
      model: "openai/gpt-4o-mini",
    });
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        message: {
          role: "assistant",
          content: "Bạn chi nhiều nhất cho ăn uống.",
        },
        resultType: "answer",
      }),
    });

    act(() => {
      root.render(React.createElement(AiChatWidget, { categories: [] }));
    });

    await act(async () => {
      container
        .querySelector<HTMLButtonElement>('[aria-label="Mở chat AI"]')
        ?.click();
    });

    const input = container.querySelector<HTMLTextAreaElement>("textarea")!;

    await act(async () => {
      changeField(input, "Tôi chi gì nhiều nhất?");
      container
        .querySelector<HTMLButtonElement>('[aria-label="Gửi tin nhắn"]')
        ?.click();
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/agent",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("renders clarification candidates from agent responses", async () => {
    readLocalAiProviderSettingMock.mockReturnValue({
      baseUrl: "https://openrouter.ai/api/v1",
      apiKey: "sk-test",
      model: "openai/gpt-4o-mini",
    });
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        message: { role: "assistant", content: "Bạn muốn xóa giao dịch nào?" },
        resultType: "clarification_required",
        clarification: {
          question: "Bạn muốn xóa giao dịch nào?",
          candidates: [{ id: "tx_1", label: "55.000 đ, Ăn uống, 2026-06-04" }],
        },
      }),
    });

    act(() => {
      root.render(React.createElement(AiChatWidget, { categories: [] }));
    });

    await act(async () => {
      container
        .querySelector<HTMLButtonElement>('[aria-label="Mở chat AI"]')
        ?.click();
    });

    await act(async () => {
      changeField(
        container.querySelector<HTMLTextAreaElement>("textarea")!,
        "Xóa ăn trưa",
      );
      container
        .querySelector<HTMLButtonElement>('[aria-label="Gửi tin nhắn"]')
        ?.click();
    });

    expect(container.textContent).toContain("55.000 đ, Ăn uống, 2026-06-04");
  });

  it("keeps the send button aligned with the textarea row", async () => {
    act(() => {
      root.render(React.createElement(AiChatWidget, { categories: [] }));
    });

    await act(async () => {
      container
        .querySelector<HTMLButtonElement>('[aria-label="Mở chat AI"]')
        ?.click();
    });

    const composer = container.querySelector("textarea")?.closest("form");

    expect(composer?.className).toContain("items-start");
    expect(composer?.className).not.toContain("items-end");
  });
});
