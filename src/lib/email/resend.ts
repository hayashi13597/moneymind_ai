import { Resend } from "resend";

import { buildPasswordResetEmail } from "@/lib/email/templates/password-reset";
import { getEmailEnv } from "@/lib/env";

type SendPasswordResetEmailInput = {
  to: string;
  resetUrl: string;
};

export async function sendPasswordResetEmail({
  to,
  resetUrl,
}: SendPasswordResetEmailInput): Promise<void> {
  const env = getEmailEnv();
  const resend = new Resend(env.RESEND_API_KEY);
  const email = buildPasswordResetEmail({ resetUrl });

  const { error } = await resend.emails.send({
    from: env.EMAIL_FROM,
    to: [to],
    subject: email.subject,
    html: email.html,
    text: email.text,
  });

  if (error) {
    throw new Error(error.message);
  }
}
