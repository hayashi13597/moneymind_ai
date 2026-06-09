import { buildPasswordResetEmail } from "@/lib/email/templates/password-reset";

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
