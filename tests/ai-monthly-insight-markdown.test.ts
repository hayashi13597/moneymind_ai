import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server.node";

import { MonthlyInsightMarkdown } from "@/features/ai/monthly-insight-markdown";

describe("MonthlyInsightMarkdown", () => {
  it("renders AI markdown emphasis and lists as HTML", () => {
    const markup = renderToStaticMarkup(
      createElement(MonthlyInsightMarkdown, {
        content: "**Tối ưu dòng tiền nhàn rỗi**\n\n- Đầu tư định kỳ",
      }),
    );

    expect(markup).toContain(
      '<strong class="font-semibold">Tối ưu dòng tiền nhàn rỗi</strong>',
    );
    expect(markup).toContain('<li class="pl-1">Đầu tư định kỳ</li>');
  });
});
