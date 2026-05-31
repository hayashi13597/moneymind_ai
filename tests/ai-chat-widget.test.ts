/**
 * @jest-environment node
 */
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { AiChatBubble } from "@/features/ai-chat/widget";

jest.mock("@/features/transactions/actions", () => ({
  createTransactionAction: jest.fn(),
}));

describe("AiChatBubble", () => {
  it("renders pending assistant text with assistant bubble styling", () => {
    const markup = renderToStaticMarkup(
      React.createElement(AiChatBubble, {
        entry: { role: "assistant", content: "AI đang trả lời..." },
        onReviewDraft: jest.fn(),
      }),
    );

    expect(markup).toContain("AI đang trả lời...");
    expect(markup).toContain("mr-8");
    expect(markup).toContain("bg-muted");
  });
});
