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

  it("renders markdown answers as formatted content", async () => {
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
          content:
            "Để tiết kiệm hơn trong tháng này:\n\n* **Khác:** Chiếm 85% tổng chi tiêu.\n* **Ăn uống:** Chiếm 13% tổng chi tiêu.",
        },
        resultType: "suggestion",
      }),
    });

    act(() => {
      root.render(React.createElement(AskMoneyMindPanel, { month: "2026-06" }));
    });

    await act(async () => {
      Array.from(container.querySelectorAll("button"))
        .find((button) => button.textContent?.includes("Gợi ý cách tiết kiệm"))
        ?.click();
    });

    expect(container.querySelectorAll("li")).toHaveLength(2);
    expect(container.querySelector("strong")?.textContent).toBe("Khác:");
    expect(container.textContent).not.toContain("**Khác:**");
    expect(container.textContent).not.toContain("* **Ăn uống:**");
  });

  it("sanitizes unsafe raw HTML in markdown answers", async () => {
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
          content:
            'Nội dung an toàn.\n\n<script>alert(1)</script>\n<div onclick="alert(1)">click</div>',
        },
        resultType: "suggestion",
      }),
    });

    act(() => {
      root.render(React.createElement(AskMoneyMindPanel, { month: "2026-06" }));
    });

    await act(async () => {
      Array.from(container.querySelectorAll("button"))
        .find((button) => button.textContent?.includes("Gợi ý cách tiết kiệm"))
        ?.click();
    });

    expect(container.querySelectorAll("script")).toHaveLength(0);
    expect(container.innerHTML).not.toContain("<script>");
    expect(container.innerHTML).not.toContain("onclick=");
    expect(container.textContent).not.toContain("alert(1)");
  });
});
