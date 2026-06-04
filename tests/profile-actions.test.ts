import { profileFormSchema } from "@/features/profile/schemas";

describe("profile schemas", () => {
  it("normalizes an empty avatar URL to null", () => {
    const parsed = profileFormSchema.parse({
      name: " Nguyễn Văn A ",
      image: "   ",
    });

    expect(parsed).toEqual({
      name: "Nguyễn Văn A",
      image: null,
    });
  });

  it("rejects invalid avatar URLs", () => {
    const parsed = profileFormSchema.safeParse({
      name: "Nguyễn Văn A",
      image: "not-a-url",
    });

    expect(parsed.success).toBe(false);
  });
});
