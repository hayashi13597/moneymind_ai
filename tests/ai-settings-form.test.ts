import React from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { renderToString } from "react-dom/server.node";

import { AiSettingsForm } from "@/features/ai/ai-settings-form";
import { readLocalAiProviderStore } from "@/features/ai/local-settings";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean })
  .IS_REACT_ACT_ENVIRONMENT = true;

jest.mock("sonner", () => ({
  toast: {
    error: jest.fn(),
    success: jest.fn(),
  },
}));

function changeField(field: HTMLInputElement | HTMLSelectElement, value: string) {
  const prototype =
    field instanceof HTMLSelectElement
      ? HTMLSelectElement.prototype
      : HTMLInputElement.prototype;
  const valueSetter = Object.getOwnPropertyDescriptor(prototype, "value")?.set;

  valueSetter?.call(field, value);
  field.dispatchEvent(new Event("input", { bubbles: true }));
  field.dispatchEvent(new Event("change", { bubbles: true }));
}

describe("AiSettingsForm", () => {
  let container: HTMLDivElement;
  let root: Root;

  const getProviderNameInput = () =>
    container.querySelector<HTMLInputElement>('input[name="name"]')!;
  const getBaseUrlInput = () =>
    container.querySelector<HTMLInputElement>('input[name="baseUrl"]')!;
  const getModelInput = () =>
    container.querySelector<HTMLInputElement>('input[name="model"]')!;
  const getApiKeyInput = () =>
    container.querySelector<HTMLInputElement>('input[name="apiKey"]')!;

  beforeEach(() => {
    window.localStorage.clear();
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
    window.localStorage.clear();
    jest.restoreAllMocks();
  });

  it("shows created providers in a list that can select, edit, and delete", async () => {
    act(() => {
      root.render(React.createElement(AiSettingsForm));
    });

    await act(async () => {
      changeField(getProviderNameInput(), "OpenAI");
      changeField(getBaseUrlInput(), "https://api.openai.com/v1");
      changeField(getModelInput(), "gpt-4.1-mini");
      changeField(getApiKeyInput(), "sk-openai");
      container.querySelector<HTMLButtonElement>("#saveProvider")?.click();
    });

    await act(async () => {
      container.querySelector<HTMLButtonElement>("#newProvider")?.click();
    });

    await act(async () => {
      changeField(getProviderNameInput(), "OpenRouter");
      changeField(getBaseUrlInput(), "https://openrouter.ai/api/v1");
      changeField(getModelInput(), "openai/gpt-4.1-mini");
      changeField(getApiKeyInput(), "sk-openrouter");
      container.querySelector<HTMLButtonElement>("#saveProvider")?.click();
    });

    expect(readLocalAiProviderStore().providers).toHaveLength(2);
    expect(container.querySelector("#selectedProvider")).toBeNull();
    expect(container.textContent).toContain("Cấu hình đã lưu");
    expect(container.textContent).toContain("OpenAI");
    expect(container.textContent).toContain("OpenRouter");
    expect(readLocalAiProviderStore().selectedProviderId).toBe(
      readLocalAiProviderStore().providers[0].id,
    );
    expect(container.textContent).toContain("Đang dùng: OpenAI");
    expect(container.textContent).not.toContain("Đang dùng: OpenRouter");

    await act(async () => {
      container
        .querySelector<HTMLButtonElement>('[aria-label="Chọn OpenAI"]')
        ?.click();
    });

    expect(readLocalAiProviderStore().selectedProviderId).toBe(
      readLocalAiProviderStore().providers[0].id,
    );

    await act(async () => {
      container
        .querySelector<HTMLButtonElement>('[aria-label="Sửa OpenAI"]')
        ?.click();
    });

    expect(getProviderNameInput().value).toBe("OpenAI");
    expect(getBaseUrlInput().value).toBe("https://api.openai.com/v1");
    expect(getModelInput().value).toBe("gpt-4.1-mini");

    await act(async () => {
      changeField(getProviderNameInput(), "OpenAI chính");
      container.querySelector<HTMLButtonElement>("#saveProvider")?.click();
    });

    expect(container.textContent).toContain("OpenAI chính");

    const confirmSpy = jest
      .spyOn(window, "confirm")
      .mockImplementation(() => false);

    await act(async () => {
      container
        .querySelector<HTMLButtonElement>('[aria-label="Xóa OpenAI chính"]')
        ?.click();
    });

    expect(confirmSpy).not.toHaveBeenCalled();
    expect(document.body.textContent).toContain("Xóa cấu hình AI?");
    expect(readLocalAiProviderStore().providers).toHaveLength(2);

    await act(async () => {
      document
        .querySelector<HTMLButtonElement>('[aria-label="Xác nhận xóa OpenAI chính"]')
        ?.click();
    });

    expect(readLocalAiProviderStore().providers).toHaveLength(1);
    expect(container.textContent).not.toContain("OpenAI chính");

    confirmSpy.mockRestore();
  });

  it("does not delete a provider when the alert dialog is cancelled", async () => {
    act(() => {
      root.render(React.createElement(AiSettingsForm));
    });

    await act(async () => {
      changeField(getProviderNameInput(), "OpenAI");
      changeField(getBaseUrlInput(), "https://api.openai.com/v1");
      changeField(getModelInput(), "gpt-4.1-mini");
      changeField(getApiKeyInput(), "sk-openai");
      container.querySelector<HTMLButtonElement>("#saveProvider")?.click();
    });

    const confirmSpy = jest
      .spyOn(window, "confirm")
      .mockImplementation(() => false);

    await act(async () => {
      container
        .querySelector<HTMLButtonElement>('[aria-label="Xóa OpenAI"]')
        ?.click();
    });

    expect(confirmSpy).not.toHaveBeenCalled();
    expect(document.body.textContent).toContain("Xóa cấu hình AI?");

    await act(async () => {
      document
        .querySelector<HTMLButtonElement>('[aria-label="Hủy xóa OpenAI"]')
        ?.click();
    });

    expect(readLocalAiProviderStore().providers).toHaveLength(1);

    confirmSpy.mockRestore();
  });

  it("places the provider list below the info card and provider form", () => {
    act(() => {
      root.render(React.createElement(AiSettingsForm));
    });

    const layout = container.firstElementChild as HTMLElement;
    const topRow = layout.children[0] as HTMLElement;
    const providerList = layout.children[1] as HTMLElement;

    expect(layout.className).toContain("space-y-5");
    expect(topRow.className).toContain("grid");
    expect(topRow.textContent).toContain("AI cần cấu hình ổn định");
    expect(topRow.textContent).toContain("Thêm cấu hình AI");
    expect(topRow.textContent).not.toContain("Cấu hình đã lưu");
    expect(providerList.textContent).toContain("Cấu hình đã lưu");
  });

  it("uses a stable server snapshot before reading localStorage on the client", () => {
    window.localStorage.setItem(
      "moneymind.aiProviderSetting",
      JSON.stringify({
        baseUrl: "https://provider.example/v1",
        model: "model-a",
        apiKey: "sk-a",
      }),
    );

    const markup = renderToString(React.createElement(AiSettingsForm));

    expect(markup).toContain("Chưa có cấu hình AI");
    expect(markup).not.toContain("https://provider.example/v1");
  });
});
