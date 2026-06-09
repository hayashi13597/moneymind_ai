# Forgot Password Design

Date: 2026-06-10
Status: Approved for implementation planning

## Goal

Add a production-ready forgot-password flow for MoneyMind AI using Better Auth's native password reset support and Resend for transactional email.

Users should be able to request a reset link from a public page, receive a Vietnamese reset email, set a new password from the emailed link, and sign in again with the new password.

## Decisions

- Use Better Auth's email-password reset flow instead of custom reset tokens.
- Send real transactional email through Resend.
- Add two public auth routes:
  - `/forgot-password`
  - `/reset-password?token=...`
- Revoke other sessions after a successful password reset.
- Set the reset token lifetime explicitly to 1 hour.
- Avoid email enumeration by showing the same success message whether the email exists or not.

## Architecture

### Auth Configuration

`src/lib/auth.ts` will continue to own Better Auth server configuration. The `emailAndPassword` block will add:

- `sendResetPassword`, which receives Better Auth's generated reset URL and delegates email delivery to a Resend helper.
- `revokeSessionsOnPasswordReset: true`.
- `resetPasswordTokenExpiresIn: 3600`.

No custom `onPasswordReset` hook is needed for the first implementation because there is no audit-log or notification feature yet.

The auth route remains the existing Better Auth catch-all at `src/app/api/auth/[...all]/route.ts`.

### Email Delivery

Create a small Resend integration instead of placing provider details inside `auth.ts`.

Proposed files:

- `src/lib/email/resend.ts`: reads `RESEND_API_KEY`, creates the Resend client, and sends email.
- `src/lib/email/templates/password-reset.ts`: builds the subject, text, and HTML for password reset emails.

Environment variables:

- `RESEND_API_KEY`: required for real email delivery.
- `EMAIL_FROM`: sender address verified in Resend, for example `MoneyMind AI <no-reply@yourdomain.com>`.

The email helper should send both `html` and `text` bodies.

### UI Surfaces

Add two public auth pages using the same visual and form patterns as login and signup:

- `src/app/(auth)/forgot-password/page.tsx`
- `src/app/(auth)/reset-password/page.tsx`

Add or reuse client components:

- `ForgotPasswordForm`: validates an email and calls `authClient.requestPasswordReset`.
- `ResetPasswordForm`: validates the new password and confirmation, then calls `authClient.resetPassword`.

The login form should add a small `Quên mật khẩu?` link to `/forgot-password`.

## Data Flow

### Request Reset Link

1. The user opens `/forgot-password`.
2. The user enters an email address.
3. The client calls:

   ```ts
   authClient.requestPasswordReset({
     email,
     redirectTo: `${window.location.origin}/reset-password`,
   });
   ```

4. Better Auth generates a reset token and reset URL.
5. Better Auth calls `sendResetPassword` only for an existing user.
6. The Resend helper sends the reset email.
7. The UI shows a neutral success message:

   `Nếu email tồn tại, MoneyMind đã gửi hướng dẫn đặt lại mật khẩu.`

### Reset Password

1. The user clicks the email link and lands on `/reset-password?token=...`.
2. The page reads the token from `searchParams` and passes it to the client form.
3. If the token is missing, the page shows an invalid-link state and a link back to `/forgot-password`.
4. The user enters and confirms a new password.
5. The client calls:

   ```ts
   authClient.resetPassword({
     token,
     newPassword,
   });
   ```

6. Better Auth updates the password and revokes other sessions.
7. The UI shows:

   `Đã đặt lại mật khẩu. Bạn có thể đăng nhập bằng mật khẩu mới.`

8. The user can continue to `/login`.

## Validation

Forgot-password form:

- Email is required.
- Email must be valid.

Reset-password form:

- Token is required before submit.
- New password must be at least 8 characters.
- Confirmation password is required.
- Confirmation password must match the new password.

These rules should mirror the existing login, signup, and profile password form style using Zod, React Hook Form, and `createZodResolver`.

## Error Handling

Forgot-password request:

- Do not reveal whether an email is registered.
- On successful Better Auth response, show the neutral success message.
- If the request fails because of network or system failure, show:

  `Không thể gửi hướng dẫn lúc này. Vui lòng thử lại.`

Reset-password request:

- Missing token:

  `Liên kết đặt lại mật khẩu không hợp lệ.`

- Expired or invalid token:

  `Liên kết đặt lại mật khẩu đã hết hạn hoặc không hợp lệ.`

- Unexpected system failure:

  `Không thể đặt lại mật khẩu lúc này. Vui lòng thử lại.`

## Email Copy

Subject:

`Đặt lại mật khẩu MoneyMind AI`

Body:

`Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản MoneyMind AI của bạn. Bấm vào liên kết bên dưới để đặt mật khẩu mới. Liên kết này sẽ hết hạn sau 1 giờ. Nếu bạn không yêu cầu, bạn có thể bỏ qua email này.`

CTA:

`Đặt lại mật khẩu`

The email should include the raw URL in the text body for clients where the button is not available.

## Testing

Add focused tests around app behavior and mock provider boundaries.

Forgot-password form tests:

- Validates email input.
- Calls `authClient.requestPasswordReset` with the submitted email and `/reset-password` redirect.
- Shows the neutral success message on success.
- Shows the system error message when the request fails.

Reset-password form tests:

- Validates minimum password length.
- Validates matching confirmation password.
- Does not submit without a token.
- Calls `authClient.resetPassword` with the token and new password.
- Shows success on successful reset.
- Shows invalid or expired link copy on Better Auth reset failure.

Email helper tests:

- Builds a Resend payload with `from`, `to`, `subject`, `html`, and `text`.
- Does not send a real email in tests.

## Out of Scope

- Email verification.
- Custom reset-token tables or route handlers.
- Custom rate limiting beyond Better Auth and platform behavior.
- Changing signup or login behavior beyond adding the forgot-password link.
- A full email preference or notification system.

## Implementation Notes

- Use Better Auth's `requestPasswordReset` and `resetPassword` client APIs.
- Use `redirectTo`, not legacy callback naming, so Better Auth can generate the expected reset URL.
- Read relevant Next.js docs from `node_modules/next/dist/docs/` before implementing route or search-parameter behavior.
- Use Context7 for current docs when implementing Better Auth or Resend specifics.
- Keep generated UI primitives generic; app-specific copy and composition belong in auth feature components.
