import React from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";

import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";
import { LoginForm } from "@/components/auth/login-form";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import {
  forgotPasswordFormSchema,
  resetPasswordFormSchema,
} from "@/features/auth/schemas";
import { authClient } from "@/lib/auth-client";

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean })
  .IS_REACT_ACT_ENVIRONMENT = true;

jest.mock("@/lib/auth-client", () => ({
  authClient: {
    requestPasswordReset: jest.fn(),
    resetPassword: jest.fn(),
    signIn: {
      email: jest.fn(),
    },
  },
}));

jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
}));

const requestPasswordResetMock =
  authClient.requestPasswordReset as unknown as jest.Mock;
const resetPasswordMock = authClient.resetPassword as unknown as jest.Mock;

function changeField(field: HTMLInputElement, value: string) {
  const valueSetter = Object.getOwnPropertyDescriptor(
    HTMLInputElement.prototype,
    "value",
  )?.set;

  valueSetter?.call(field, value);
  field.dispatchEvent(new Event("input", { bubbles: true }));
  field.dispatchEvent(new Event("change", { bubbles: true }));
}

describe("auth reset form schemas", () => {
  it("requires a valid email for forgot password", () => {
    expect(
      forgotPasswordFormSchema.safeParse({ email: "ban@example.com" }).success,
    ).toBe(true);

    const result = forgotPasswordFormSchema.safeParse({ email: "not-email" });

    expect(result.success).toBe(false);
  });

  it("requires matching reset passwords", () => {
    expect(
      resetPasswordFormSchema.safeParse({
        newPassword: "new-password",
        confirmPassword: "new-password",
      }).success,
    ).toBe(true);

    const result = resetPasswordFormSchema.safeParse({
      newPassword: "new-password",
      confirmPassword: "different-password",
    });

    expect(result.success).toBe(false);
  });
});

describe("ForgotPasswordForm", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    requestPasswordResetMock.mockResolvedValue({ data: {}, error: null });
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    document.body.removeChild(container);
    requestPasswordResetMock.mockReset();
  });

  it("requests a reset email with the reset-password redirect", async () => {
    await act(async () => {
      root.render(React.createElement(ForgotPasswordForm));
    });

    await act(async () => {
      changeField(
        container.querySelector<HTMLInputElement>('input[name="email"]')!,
        "ban@example.com",
      );
      container.querySelector<HTMLButtonElement>("#requestPasswordReset")?.click();
    });

    expect(requestPasswordResetMock).toHaveBeenCalledWith({
      email: "ban@example.com",
      redirectTo: `${window.location.origin}/reset-password`,
    });
    expect(container.textContent).toContain(
      "Nếu email tồn tại, MoneyMind đã gửi hướng dẫn đặt lại mật khẩu.",
    );
  });

  it("shows a system error when the reset request fails", async () => {
    requestPasswordResetMock.mockResolvedValue({
      data: null,
      error: { message: "Provider down" },
    });

    await act(async () => {
      root.render(React.createElement(ForgotPasswordForm));
    });

    await act(async () => {
      changeField(
        container.querySelector<HTMLInputElement>('input[name="email"]')!,
        "ban@example.com",
      );
      container.querySelector<HTMLButtonElement>("#requestPasswordReset")?.click();
    });

    expect(container.textContent).toContain(
      "Không thể gửi hướng dẫn lúc này. Vui lòng thử lại.",
    );
  });

  it("shows a system error when the reset request throws", async () => {
    requestPasswordResetMock.mockRejectedValue(new Error("Network down"));

    await act(async () => {
      root.render(React.createElement(ForgotPasswordForm));
    });

    await act(async () => {
      changeField(
        container.querySelector<HTMLInputElement>('input[name="email"]')!,
        "ban@example.com",
      );
      container.querySelector<HTMLButtonElement>("#requestPasswordReset")?.click();
    });

    expect(container.textContent).toContain(
      "Không thể gửi hướng dẫn lúc này. Vui lòng thử lại.",
    );
  });
});

describe("ResetPasswordForm", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    resetPasswordMock.mockResolvedValue({ data: {}, error: null });
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    document.body.removeChild(container);
    resetPasswordMock.mockReset();
  });

  it("resets the password with the supplied token", async () => {
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
    expect(container.textContent).toContain(
      "Đã đặt lại mật khẩu. Bạn có thể đăng nhập bằng mật khẩu mới.",
    );
  });

  it("does not submit and shows invalid link copy without a token", async () => {
    await act(async () => {
      root.render(React.createElement(ResetPasswordForm, { token: null }));
    });

    expect(container.textContent).toContain(
      "Liên kết đặt lại mật khẩu không hợp lệ.",
    );
    expect(container.querySelector<HTMLButtonElement>("#resetPassword")).toBeNull();
  });

  it("shows invalid or expired token copy when Better Auth rejects", async () => {
    resetPasswordMock.mockResolvedValue({
      data: null,
      error: { message: "TOKEN_EXPIRED" },
    });

    await act(async () => {
      root.render(React.createElement(ResetPasswordForm, { token: "bad-token" }));
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

    expect(container.textContent).toContain(
      "Liên kết đặt lại mật khẩu đã hết hạn hoặc không hợp lệ.",
    );
  });

  it("shows a system error when reset password throws", async () => {
    resetPasswordMock.mockRejectedValue(new Error("Network down"));

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

    expect(container.textContent).toContain(
      "Không thể đặt lại mật khẩu lúc này. Vui lòng thử lại.",
    );
  });
});

describe("LoginForm forgot password link", () => {
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
    document.body.removeChild(container);
  });

  it("links to the forgot password page", async () => {
    await act(async () => {
      root.render(React.createElement(LoginForm));
    });

    const link = Array.from(container.querySelectorAll("a")).find(
      (anchor) => anchor.textContent === "Quên mật khẩu?",
    );

    expect(link?.getAttribute("href")).toBe("/forgot-password");
  });
});
