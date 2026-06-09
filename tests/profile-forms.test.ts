import React from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";

import { updateProfileAction } from "@/features/profile/actions";
import { PasswordForm } from "@/features/profile/password-form";
import { ProfileForm } from "@/features/profile/profile-form";
import { authClient } from "@/lib/auth-client";
import { toast } from "sonner";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean })
  .IS_REACT_ACT_ENVIRONMENT = true;

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

(globalThis as typeof globalThis & { ResizeObserver: typeof ResizeObserver })
  .ResizeObserver = ResizeObserverMock as typeof ResizeObserver;

const refreshMock = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: refreshMock,
  }),
}));

jest.mock("sonner", () => ({
  toast: {
    error: jest.fn(),
    success: jest.fn(),
  },
}));

jest.mock("@/features/profile/actions", () => ({
  updateProfileAction: jest.fn(),
}));

jest.mock("@/lib/auth-client", () => ({
  authClient: {
    changePassword: jest.fn(),
  },
}));

const updateProfileActionMock = updateProfileAction as jest.Mock;
const changePasswordMock = authClient.changePassword as jest.Mock;
const toastErrorMock = toast.error as jest.Mock;

function changeField(field: HTMLInputElement, value: string) {
  const valueSetter = Object.getOwnPropertyDescriptor(
    HTMLInputElement.prototype,
    "value",
  )?.set;

  valueSetter?.call(field, value);
  field.dispatchEvent(new Event("input", { bubbles: true }));
  field.dispatchEvent(new Event("change", { bubbles: true }));
}

describe("profile forms", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    updateProfileActionMock.mockResolvedValue({ ok: true });
    changePasswordMock.mockResolvedValue({ data: {}, error: null });
    refreshMock.mockClear();
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
    jest.clearAllMocks();
  });

  it("renders readonly email and submits valid profile values", async () => {
    await act(async () => {
      root.render(
        React.createElement(ProfileForm, {
          user: {
            name: "Nguyễn Văn A",
            email: "ban@example.com",
            image: "",
          },
        }),
      );
    });

    const email = container.querySelector<HTMLInputElement>(
      'input[name="email"]',
    )!;
    const name = container.querySelector<HTMLInputElement>(
      'input[name="name"]',
    )!;
    const image = container.querySelector<HTMLInputElement>(
      'input[name="image"]',
    )!;

    expect(email.value).toBe("ban@example.com");
    expect(email.readOnly).toBe(true);

    await act(async () => {
      changeField(name, "Tên mới");
      changeField(image, "https://example.com/avatar.png");
      container.querySelector<HTMLButtonElement>("#saveProfile")?.click();
    });

    expect(updateProfileActionMock).toHaveBeenCalledWith({
      name: "Tên mới",
      image: "https://example.com/avatar.png",
    });
    expect(refreshMock).toHaveBeenCalled();
  });

  it("frames profile data as coach personalization", async () => {
    await act(async () => {
      root.render(
        React.createElement(ProfileForm, {
          user: {
            name: "Nguyễn Văn A",
            email: "ban@example.com",
            image: "",
          },
        }),
      );
    });

    expect(container.textContent).toContain("Hồ sơ hiển thị");
    expect(container.textContent).toContain("MoneyMind dùng thông tin này");
  });

  it("shows feedback when profile update rejects", async () => {
    updateProfileActionMock.mockRejectedValue(new Error("Network down"));

    await act(async () => {
      root.render(
        React.createElement(ProfileForm, {
          user: {
            name: "Nguyễn Văn A",
            email: "ban@example.com",
            image: "",
          },
        }),
      );
    });

    await act(async () => {
      changeField(
        container.querySelector<HTMLInputElement>('input[name="name"]')!,
        "Tên mới",
      );
      container.querySelector<HTMLButtonElement>("#saveProfile")?.click();
    });

    expect(toastErrorMock).toHaveBeenCalledWith(
      "Không thể cập nhật hồ sơ: Network down",
    );
    expect(refreshMock).not.toHaveBeenCalled();
  });

  it("blocks mismatched password confirmation", async () => {
    await act(async () => {
      root.render(React.createElement(PasswordForm));
    });

    await act(async () => {
      changeField(
        container.querySelector<HTMLInputElement>(
          'input[name="currentPassword"]',
        )!,
        "old-password",
      );
      changeField(
        container.querySelector<HTMLInputElement>('input[name="newPassword"]')!,
        "new-password",
      );
      changeField(
        container.querySelector<HTMLInputElement>(
          'input[name="confirmPassword"]',
        )!,
        "different-password",
      );
      container.querySelector<HTMLButtonElement>("#changePassword")?.click();
    });

    expect(container.textContent).toContain("Mật khẩu mới không khớp.");
    expect(changePasswordMock).not.toHaveBeenCalled();
  });

  it("frames password changes as account confidence", async () => {
    await act(async () => {
      root.render(React.createElement(PasswordForm));
    });

    expect(container.textContent).toContain("Độ tin cậy tài khoản");
    expect(container.textContent).toContain(
      "Mật khẩu mạnh và thu hồi phiên cũ",
    );
  });

  it("changes password with revoke other sessions enabled by default", async () => {
    await act(async () => {
      root.render(React.createElement(PasswordForm));
    });

    await act(async () => {
      changeField(
        container.querySelector<HTMLInputElement>(
          'input[name="currentPassword"]',
        )!,
        "old-password",
      );
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
      container.querySelector<HTMLButtonElement>("#changePassword")?.click();
    });

    expect(changePasswordMock).toHaveBeenCalledWith({
      currentPassword: "old-password",
      newPassword: "new-password",
      revokeOtherSessions: true,
    });
  });

  it("shows feedback when password change rejects", async () => {
    changePasswordMock.mockRejectedValue(new Error("Network down"));

    await act(async () => {
      root.render(React.createElement(PasswordForm));
    });

    await act(async () => {
      changeField(
        container.querySelector<HTMLInputElement>(
          'input[name="currentPassword"]',
        )!,
        "old-password",
      );
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
      container.querySelector<HTMLButtonElement>("#changePassword")?.click();
    });

    expect(toastErrorMock).toHaveBeenCalledWith(
      "Không thể đổi mật khẩu: Network down",
    );
  });
});
