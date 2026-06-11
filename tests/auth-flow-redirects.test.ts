import React from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server.node";

import AuthLayout from "@/app/(auth)/layout";
import LoginPage from "@/app/(auth)/login/page";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import { authClient } from "@/lib/auth-client";
import { getCurrentSession } from "@/lib/auth-session";
import { redirect } from "next/navigation";

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean })
  .IS_REACT_ACT_ENVIRONMENT = true;

const pushMock = jest.fn();
const refreshMock = jest.fn();

jest.mock("next/navigation", () => ({
  redirect: jest.fn((href: string) => {
    throw new Error(`redirect:${href}`);
  }),
  useRouter: () => ({
    push: pushMock,
    refresh: refreshMock,
  }),
}));

jest.mock("@/lib/auth-client", () => ({
  authClient: {
    resetPassword: jest.fn(),
  },
}));

jest.mock("@/lib/auth-session", () => ({
  getCurrentSession: jest.fn(),
}));

const resetPasswordMock = authClient.resetPassword as unknown as jest.Mock;
const getCurrentSessionMock = getCurrentSession as jest.MockedFunction<
  typeof getCurrentSession
>;
const redirectMock = redirect as unknown as jest.Mock;

function changeField(field: HTMLInputElement, value: string) {
  const valueSetter = Object.getOwnPropertyDescriptor(
    HTMLInputElement.prototype,
    "value",
  )?.set;

  valueSetter?.call(field, value);
  field.dispatchEvent(new Event("input", { bubbles: true }));
  field.dispatchEvent(new Event("change", { bubbles: true }));
}

describe("auth flow redirects", () => {
  beforeEach(() => {
    pushMock.mockReset();
    refreshMock.mockReset();
    resetPasswordMock.mockReset();
    getCurrentSessionMock.mockReset();
    redirectMock.mockClear();
  });

  it("redirects to login with success state after resetting password", async () => {
    resetPasswordMock.mockResolvedValue({ data: {}, error: null });
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root: Root = createRoot(container);

    try {
      await act(async () => {
        root.render(React.createElement(ResetPasswordForm, { token: "token_123" }));
      });

      await act(async () => {
        changeField(
          container.querySelector<HTMLInputElement>('input[name="newPassword"]')!,
          "new-password",
        );
        changeField(
          container.querySelector<HTMLInputElement>(
            'input[name="confirmPassword"]',
          )!,
          "new-password",
        );
        container.querySelector<HTMLButtonElement>("#resetPassword")?.click();
      });

      expect(resetPasswordMock).toHaveBeenCalledWith({
        token: "token_123",
        newPassword: "new-password",
      });
      expect(pushMock).toHaveBeenCalledWith("/login?reset=success");
      expect(refreshMock).toHaveBeenCalled();
    } finally {
      act(() => root.unmount());
      document.body.removeChild(container);
    }
  });

  it("redirects authenticated users away from auth pages", async () => {
    getCurrentSessionMock.mockResolvedValue({
      user: {
        id: "user-1",
        email: "ban@example.com",
        name: "Bạn",
        emailVerified: true,
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
        updatedAt: new Date("2026-01-01T00:00:00.000Z"),
        image: null,
      },
      session: {
        id: "session-1",
        userId: "user-1",
        token: "session-token",
        expiresAt: new Date("2026-01-02T00:00:00.000Z"),
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
        updatedAt: new Date("2026-01-01T00:00:00.000Z"),
        ipAddress: null,
        userAgent: null,
      },
    });

    await expect(
      AuthLayout({ children: React.createElement("section", null, "Auth page") }),
    ).rejects.toThrow("redirect:/dashboard");
    expect(redirectMock).toHaveBeenCalledWith("/dashboard");
  });

  it("renders auth pages for guests", async () => {
    getCurrentSessionMock.mockResolvedValue(null);

    const element = await AuthLayout({
      children: React.createElement("section", null, "Auth page"),
    });

    expect(renderToStaticMarkup(element)).toContain("Auth page");
  });

  it("shows reset success copy on the login page", async () => {
    const element = await LoginPage({
      searchParams: Promise.resolve({ reset: "success" }),
    });

    expect(renderToStaticMarkup(element)).toContain(
      "Đặt lại mật khẩu thành công. Vui lòng đăng nhập bằng mật khẩu mới.",
    );
  });
});
