import React from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";

import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";
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
  },
}));

const requestPasswordResetMock = authClient.requestPasswordReset as jest.Mock;

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
});
