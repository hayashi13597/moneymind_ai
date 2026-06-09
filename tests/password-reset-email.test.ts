import { buildPasswordResetEmail } from "@/lib/email/templates/password-reset";
import { sendPasswordResetEmail } from "@/lib/email/resend";

const mockSend = jest.fn();

jest.mock("resend", () => ({
  Resend: jest.fn().mockImplementation(() => ({
    emails: {
      send: mockSend,
    },
  })),
}));

describe("password reset email template", () => {
  it("builds Vietnamese reset email content with a button and raw URL", () => {
    const email = buildPasswordResetEmail({
      resetUrl: "https://app.example.com/reset-password?token=abc",
    });

    expect(email.subject).toBe("Đặt lại mật khẩu MoneyMind AI");
    expect(email.text).toContain(
      "Chúng tôi nhận được yêu cầu đặt lại mật khẩu",
    );
    expect(email.text).toContain(
      "https://app.example.com/reset-password?token=abc",
    );
    expect(email.html).toContain("Đặt lại mật khẩu");
    expect(email.html).toContain(
      "https://app.example.com/reset-password?token=abc",
    );
    expect(email.html).toContain("Liên kết này sẽ hết hạn sau 1 giờ");
  });
});

describe("sendPasswordResetEmail", () => {
  beforeEach(() => {
    mockSend.mockReset();
    process.env.RESEND_API_KEY = "re_test";
    process.env.EMAIL_FROM = "MoneyMind AI <no-reply@example.com>";
  });

  afterEach(() => {
    delete process.env.RESEND_API_KEY;
    delete process.env.EMAIL_FROM;
  });

  it("sends the password reset payload through Resend", async () => {
    mockSend.mockResolvedValue({ data: { id: "email_123" }, error: null });

    await sendPasswordResetEmail({
      to: "ban@example.com",
      resetUrl: "https://app.example.com/reset-password?token=abc",
    });

    expect(mockSend).toHaveBeenCalledWith({
      from: "MoneyMind AI <no-reply@example.com>",
      to: ["ban@example.com"],
      subject: "Đặt lại mật khẩu MoneyMind AI",
      html: expect.stringContaining("Đặt lại mật khẩu"),
      text: expect.stringContaining(
        "https://app.example.com/reset-password?token=abc",
      ),
    });
  });

  it("throws when Resend returns an error", async () => {
    mockSend.mockResolvedValue({
      data: null,
      error: { message: "Invalid API key" },
    });

    await expect(
      sendPasswordResetEmail({
        to: "ban@example.com",
        resetUrl: "https://app.example.com/reset-password?token=abc",
      }),
    ).rejects.toThrow("Invalid API key");
  });
});
