import React from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server.node";

import Loading from "@/app/(app)/loading";
import { AppNav } from "@/components/app-nav";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean })
  .IS_REACT_ACT_ENVIRONMENT = true;

jest.mock("next/navigation", () => ({
  usePathname: () => "/dashboard",
}));

jest.mock("next/link", () => {
  function Link({
    children,
    href,
    ...props
  }: {
    children: React.ReactNode;
    href: string;
  }) {
    return React.createElement("a", { href, ...props }, children);
  }

  return {
    __esModule: true,
    default: Link,
  };
});

describe("app navigation loading feedback", () => {
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

  it("keeps nav labels stable without inline pending indicators", () => {
    act(() => {
      root.render(React.createElement(AppNav));
    });

    const link = container.querySelector<HTMLAnchorElement>(
      'a[href="/transactions"]',
    );

    expect(link?.querySelector("[data-nav-pending]")).toBeNull();
    expect(link?.textContent).toBe("Giao dịch");
    expect(
      container.querySelector<HTMLAnchorElement>('a[href="/insights"]')
        ?.textContent,
    ).toBe("AI Insights");
    expect(
      container.querySelector<HTMLAnchorElement>('a[href="/reports"]')
        ?.textContent,
    ).toBe("Báo cáo");
  });

  it("renders a route loading skeleton for app page transitions", () => {
    const markup = renderToStaticMarkup(React.createElement(Loading));

    expect(markup).toContain("aria-busy=\"true\"");
    expect(markup).toContain("Đang chuẩn bị phiên cố vấn");
    expect(markup).toContain("MoneyMind đang đọc tín hiệu");
    expect(markup).toContain("animate-pulse");
  });
});
