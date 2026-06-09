import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server.node";

import {
  CoachActionCard,
  CoachEmptyState,
  CoachHero,
  CoachMetricStrip,
  CoachPageShell,
  WorkbenchCard,
} from "@/components/coach-ui";

jest.mock("next/link", () => {
  function Link({
    children,
    href,
    ...props
  }: {
    children: React.ReactNode;
    href: string;
  }) {
    return createElement("a", { href, ...props }, children);
  }

  return {
    __esModule: true,
    default: Link,
  };
});

describe("coach UI primitives", () => {
  it("renders a coach-first page structure", () => {
    const markup = renderToStaticMarkup(
      createElement(
        CoachPageShell,
        null,
        createElement(CoachHero, {
          eyebrow: "Coach Capture",
          title: "Ghi lại hôm nay, hiểu cả tháng",
          recommendation: "MoneyMind đang theo dõi nhịp chi tiêu tháng này.",
          description: "Nhập tự nhiên trước, chỉnh chi tiết sau.",
          evidence: [
            { label: "Số dư", value: "12.000.000 ₫" },
            { label: "Tín hiệu", value: "Ổn định" },
          ],
        }),
        createElement(CoachMetricStrip, {
          metrics: [
            { label: "Thu nhập", value: "20.000.000 ₫", helper: "Tháng này" },
            { label: "Chi tiêu", value: "8.000.000 ₫", helper: "Đã ghi nhận" },
          ],
        }),
        createElement(
          WorkbenchCard,
          {
            title: "Sổ giao dịch",
            description: "Quản lý dữ liệu gốc.",
          } as React.ComponentProps<typeof WorkbenchCard>,
          createElement("p", null, "Workbench content"),
        ),
      ),
    );

    expect(markup).toContain("Coach Capture");
    expect(markup).toContain("Ghi lại hôm nay, hiểu cả tháng");
    expect(markup).toContain("Sổ giao dịch");
  });

  it("renders action cards and empty states", () => {
    const markup = renderToStaticMarkup(
      createElement(
        "div",
        null,
        createElement(CoachActionCard, {
          title: "Kiểm tra ngân sách",
          description: "Một danh mục đang tiến gần hạn mức.",
          action: "Xem ngân sách",
          href: "/budgets",
        }),
        createElement(CoachEmptyState, {
          title: "Chưa có dữ liệu để huấn luyện",
          description: "Thêm giao dịch đầu tiên để MoneyMind có ngữ cảnh.",
        }),
      ),
    );

    expect(markup).toContain('href="/budgets"');
    expect(markup).toContain("Xem ngân sách");
    expect(markup).toContain("Chưa có dữ liệu để huấn luyện");
  });
});
