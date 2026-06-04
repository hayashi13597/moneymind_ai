# User Profile And Account Settings Design

## Context

MoneyMind AI already stores Better Auth user fields in `User`: `name`, `email`, `image`, timestamps, accounts, and sessions. The app shell currently shows the signed-in user's email and a logout button in the header. There is no dedicated profile or account settings page.

This feature adds a protected `/profile` page for account-level settings and replaces the header email/logout cluster with an avatar account menu.

## Goals

- Let signed-in users update their display name.
- Let signed-in users store a simple avatar image URL in `User.image`.
- Show the email address as readonly account identity.
- Let signed-in users change their password using Better Auth.
- Let users choose whether password changes revoke other sessions, defaulting to revoke.
- Replace the header email text with an avatar button that opens an account dropdown.

## Non-Goals

- No email change flow in this phase.
- No avatar file upload or storage integration.
- No account deletion flow.
- No additional financial personalization fields such as timezone, currency, or savings goal defaults.
- No public API route for profile settings unless a future client needs it.

## UX Design

The app header keeps the existing primary navigation. The right side changes from email text plus logout button to an avatar account menu.

The avatar button displays `session.user.image` when present. If no image exists, it shows the first letter from the user's trimmed display name. If the name is missing, it falls back to the first letter of the email address. Clicking the avatar opens a dropdown with:

- The user's display name when present.
- The user's email.
- A `Hồ sơ` link to `/profile`.
- A `Đăng xuất` action.

The `/profile` page uses the existing protected app layout and page shell. It has a `PageHeader` and two account sections:

- `Hồ sơ`: editable display name, readonly email, editable avatar URL.
- `Bảo mật`: current password, new password, confirm new password, and a checked-by-default `Đăng xuất khỏi các thiết bị khác` checkbox.

## Architecture

Use the hybrid approach approved for this feature:

- Profile updates use a server action owned by a new `src/features/profile` module.
- Password changes use Better Auth's existing client method, `authClient.changePassword()`.

This keeps profile update validation and database writes easy to test, while leaving sensitive password behavior inside Better Auth.

Expected files:

- `src/app/(app)/profile/page.tsx`
- `src/features/profile/schemas.ts`
- `src/features/profile/actions.ts`
- `src/features/profile/profile-form.tsx`
- `src/features/profile/password-form.tsx`
- `src/components/auth/account-menu.tsx`
- updates to `src/app/(app)/layout.tsx`

## Data Model

No Prisma schema change is needed.

Use existing `User` fields:

- `name`: editable display name.
- `email`: readonly identity.
- `image`: editable avatar URL or `null`.

Avatar URL validation accepts a valid URL string or an empty value. Empty values are normalized to `null` so the header falls back to initials.

## Data Flow

Profile update flow:

1. `/profile` reads the current session via the protected app layout and current user helper.
2. `ProfileForm` receives initial `name`, `email`, and `image`.
3. The client form validates with React Hook Form and the shared zod resolver.
4. `updateProfileAction(values)` validates the same schema server-side.
5. The action requires an authenticated user through `getCurrentUser()`.
6. The action updates only `db.user` where `id` equals the current user's id.
7. The action revalidates `/profile` and the protected app layout path so server-rendered profile data is refreshed after navigation.
8. The form calls `router.refresh()` after success so the avatar menu reflects the latest user data.

Password change flow:

1. `PasswordForm` validates current password, new password, confirm password, and the revoke-sessions checkbox.
2. On submit it calls `authClient.changePassword({ currentPassword, newPassword, revokeOtherSessions })`.
3. The checkbox defaults to `true`.
4. On success the form resets and shows a success toast.
5. On failure it shows a generic Vietnamese error that does not expose auth internals.

## Validation

Profile schema:

- `name`: trimmed, required, maximum 80 characters.
- `image`: optional, trimmed, maximum 2048 characters, must be a valid URL when present.

Password schema:

- `currentPassword`: required.
- `newPassword`: at least 8 characters.
- `confirmPassword`: must match `newPassword`.
- `revokeOtherSessions`: boolean, default `true`.

## Error Handling

- Unauthenticated profile action: `Bạn cần đăng nhập để cập nhật hồ sơ.`
- Invalid profile form fields: field-level validation messages.
- Profile update failure: `Không thể cập nhật hồ sơ lúc này.`
- Password mismatch: field-level message on confirm password.
- Password update failure: `Mật khẩu hiện tại không đúng hoặc không thể đổi mật khẩu.`
- Avatar image load failures do not block the account menu; the UI should fall back to initials when no usable image URL is saved.

## UI Components

Profile and password forms should use the repo's existing shadcn/Radix and React Hook Form pattern:

- `Form`, `FormField`, `FormItem`, `FormLabel`, `FormControl`, `FormMessage`
- `Input`
- `Button`
- existing shared page primitives such as `PageHeader` and `SectionCard`
- `DropdownMenu` for the account menu

Avoid raw visible form controls when a shared primitive exists. Native HTML may still be used only where the primitive itself requires internal hidden input behavior.

## Testing

Add focused tests for:

- `updateProfileAction` rejects unauthenticated users.
- `updateProfileAction` rejects invalid avatar URLs.
- `updateProfileAction` updates only the current user's `name` and normalized `image`.
- `ProfileForm` renders readonly email and submits valid values.
- `PasswordForm` blocks mismatched confirmation passwords.
- `PasswordForm` calls `authClient.changePassword()` with `revokeOtherSessions: true` by default.
- `AccountMenu` renders image avatar when `image` exists.
- `AccountMenu` renders initial fallback when `image` is empty.
- `AccountMenu` exposes `Hồ sơ` and `Đăng xuất` controls.

Run the existing verification set after implementation:

- `pnpm lint`
- `pnpm test --runInBand`
- `pnpm build`

## Implementation Notes

Before implementation, read the relevant Next.js docs from `node_modules/next/dist/docs/` for App Router forms, server actions, mutating data, and revalidation. For Better Auth behavior, use current Better Auth documentation for `changePassword`; the approved design uses the Better Auth client only for the password flow.

The implementation should stay on the `feature/user-profile-settings` branch. Keep unrelated local changes out of the profile commit.
