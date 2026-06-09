import {
  forgotPasswordFormSchema,
  resetPasswordFormSchema,
} from "@/features/auth/schemas";

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
