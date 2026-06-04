import React from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";

import { readLocalAiProviderSetting } from "@/features/ai/local-settings";
import { AskMoneyMindPanel } from "@/features/dashboard/ask-moneymind-panel";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean })
  .IS_REACT_ACT_ENVIRONMENT = true;

jest.mock("@/features/ai/local-settings", () => ({
  readLocalAiProviderSetting: jest.fn(),
}));

const readLocalAiProviderSettingMock = readLocalAiProviderSetting as jest.Mock;
const fetchMock = jest.fn();

describe("AskMoneyMindPanel", () => {
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

  it("posts prompt questions to the agent route", async () => {
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
        resultType: "dashboard_explanation",
      }),
    });

    act(() => {
      root.render(React.createElement(AskMoneyMindPanel, { month: "2026-06" }));
    });

    await act(async () => {
      Array.from(container.querySelectorAll("button"))
        .find((button) => button.textContent?.includes("Tháng này tôi đã chi"))
        ?.click();
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/agent",
      expect.objectContaining({ method: "POST" }),
    );
    expect(container.textContent).toContain("Bạn chi nhiều nhất cho ăn uống.");
  });
});
