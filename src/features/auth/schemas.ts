import { z } from "zod";

export const forgotPasswordFormSchema = z.object({
  email: z.email("Email không hợp lệ."),
});

export const resetPasswordFormSchema = z
  .object({
    newPassword: z.string().min(8, "Mật khẩu cần ít nhất 8 ký tự."),
    confirmPassword: z.string().min(1, "Vui lòng xác nhận mật khẩu mới."),
  })
  .refine((values) => values.newPassword === values.confirmPassword, {
    message: "Mật khẩu xác nhận không khớp.",
    path: ["confirmPassword"],
  });

export type ForgotPasswordFormInput = z.input<
  typeof forgotPasswordFormSchema
>;
export type ResetPasswordFormInput = z.input<typeof resetPasswordFormSchema>;
