import React from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";

import { AccountMenu } from "@/components/auth/account-menu";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean })
  .IS_REACT_ACT_ENVIRONMENT = true;

(globalThis as typeof globalThis & { PointerEvent: typeof PointerEvent })
  .PointerEvent = MouseEvent as typeof PointerEvent;

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

jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: jest.fn(),
    refresh: jest.fn(),
  }),
}));

jest.mock("@/lib/auth-client", () => ({
  authClient: {
    signOut: jest.fn(),
  },
}));

describe("AccountMenu", () => {
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
    document.body.innerHTML = "";
  });

  it("renders an avatar image when image exists", () => {
    act(() => {
      root.render(
        React.createElement(AccountMenu, {
          user: {
            name: "Nguyễn Văn A",
            email: "ban@example.com",
            image: "https://example.com/avatar.png",
          },
        }),
      );
    });

    const image = container.querySelector<HTMLImageElement>("img");

    expect(image?.src).toBe("https://example.com/avatar.png");
    expect(image?.alt).toBe("Nguyễn Văn A");
  });

  it("renders an initial fallback and account controls", async () => {
    await act(async () => {
      root.render(
        React.createElement(AccountMenu, {
          user: {
            name: "An",
            email: "ban@example.com",
            image: null,
          },
        }),
      );
    });

    expect(container.textContent).toContain("A");

    await act(async () => {
      container
        .querySelector<HTMLButtonElement>('[aria-label="Mở menu tài khoản"]')
        ?.dispatchEvent(
          new PointerEvent("pointerdown", {
            bubbles: true,
            button: 0,
            ctrlKey: false,
          }),
        );
    });

    expect(document.body.textContent).toContain("Hồ sơ");
    expect(document.body.textContent).toContain("Đăng xuất");
    expect(
      document.body.querySelector<HTMLButtonElement>(
        'button[aria-label="Đăng xuất"]',
      )?.textContent,
    ).toContain("Đăng xuất");
  });
});
