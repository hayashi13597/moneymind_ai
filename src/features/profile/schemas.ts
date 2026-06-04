import { z } from "zod";

const optionalUrl = z
  .string()
  .trim()
  .max(2048, "URL ảnh đại diện quá dài.")
  .refine(
    (value) => value.length === 0 || z.url().safeParse(value).success,
    "URL ảnh đại diện không hợp lệ.",
  );

export const profileFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Tên hiển thị là bắt buộc.")
    .max(80, "Tên hiển thị tối đa 80 ký tự."),
  image: optionalUrl,
});

export function normalizeProfileFormValues(values: ProfileFormValues) {
  return {
    name: values.name,
    image: values.image.length === 0 ? null : values.image,
  };
}

export const passwordFormSchema = z
  .object({
    currentPassword: z.string().min(1, "Mật khẩu hiện tại là bắt buộc."),
    newPassword: z.string().min(8, "Mật khẩu mới cần ít nhất 8 ký tự."),
    confirmPassword: z.string().min(1, "Bạn cần nhập lại mật khẩu mới."),
    revokeOtherSessions: z.boolean().default(true),
  })
  .refine((values) => values.newPassword === values.confirmPassword, {
    message: "Mật khẩu mới không khớp.",
    path: ["confirmPassword"],
  });

export type ProfileFormInput = z.input<typeof profileFormSchema>;
export type ProfileFormValues = z.infer<typeof profileFormSchema>;
export type PasswordFormInput = z.input<typeof passwordFormSchema>;
export type PasswordFormValues = z.output<typeof passwordFormSchema>;
