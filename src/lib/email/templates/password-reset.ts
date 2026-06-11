type BuildPasswordResetEmailInput = {
  resetUrl: string;
};

type PasswordResetEmail = {
  subject: string;
  text: string;
  html: string;
};

export function buildPasswordResetEmail({
  resetUrl,
}: BuildPasswordResetEmailInput): PasswordResetEmail {
  const subject = "Đặt lại mật khẩu MoneyMind AI";
  const intro =
    "Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản MoneyMind AI của bạn.";
  const expiry = "Liên kết này sẽ hết hạn sau 1 giờ.";
  const ignore = "Nếu bạn không yêu cầu, bạn có thể bỏ qua email này.";

  return {
    subject,
    text: `${intro}\n\nBấm vào liên kết bên dưới để đặt mật khẩu mới:\n${resetUrl}\n\n${expiry}\n${ignore}`,
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1f2933;">
        <p>${intro}</p>
        <p>Bấm vào nút bên dưới để đặt mật khẩu mới.</p>
        <p>
          <a href="${resetUrl}" style="display: inline-block; background: #2f6b4f; color: #ffffff; padding: 12px 18px; border-radius: 8px; text-decoration: none; font-weight: 700;">
            Đặt lại mật khẩu
          </a>
        </p>
        <p>${expiry}</p>
        <p>${ignore}</p>
        <p style="font-size: 13px; color: #64748b;">Nếu nút không hoạt động, mở liên kết này: ${resetUrl}</p>
      </div>
    `,
  };
}
