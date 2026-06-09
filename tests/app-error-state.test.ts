import React from "react";
import { renderToStaticMarkup } from "react-dom/server.node";

import AppError from "@/app/(app)/error";

describe("authenticated app error state", () => {
  it("renders a coach-first recovery message", () => {
    const markup = renderToStaticMarkup(
      React.createElement(AppError, {
        error: new Error("Database unavailable"),
        reset: jest.fn(),
      }),
    );

    expect(markup).toContain("MoneyMind chưa mở được phiên này");
    expect(markup).toContain("Thử tải lại");
    expect(markup).toContain("Quay lại tổng quan");
  });
});
