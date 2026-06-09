import React from "react";
import { renderToStaticMarkup } from "react-dom/server.node";

import AppLayout from "@/app/(app)/layout";

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
  redirect: jest.fn((href: string) => {
    throw new Error(`redirect:${href}`);
  }),
}));

jest.mock("@/components/app-nav", () => ({
  AppNav: () => React.createElement("nav", null, "Điều hướng"),
}));

jest.mock("@/components/auth/account-menu", () => ({
  AccountMenu: () => React.createElement("button", null, "Tài khoản"),
}));

jest.mock("@/features/ai-chat/widget", () => ({
  AiChatWidget: () => React.createElement("div", null, "AI chat"),
}));

jest.mock("@/features/dashboard/user-local-time-sync", () => ({
  UserLocalTimeSync: () => React.createElement("div", null),
}));

jest.mock("@/lib/auth-session", () => ({
  getCurrentSession: jest.fn(async () => ({
    user: {
      id: "user-1",
      email: "ban@example.com",
      name: "Bạn",
      image: null,
    },
  })),
}));

jest.mock("@/lib/db", () => ({
  db: {
    category: {
      findMany: jest.fn(async () => []),
    },
  },
}));

describe("protected app shell", () => {
  it("includes a skip link that targets the main content", async () => {
    const element = await AppLayout({
      children: React.createElement("section", null, "Nội dung"),
    });

    const markup = renderToStaticMarkup(element);

    expect(markup).toContain('href="#main-content"');
    expect(markup).toContain('id="main-content"');
  });
});
