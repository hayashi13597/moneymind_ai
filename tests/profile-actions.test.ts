import { revalidatePath } from "next/cache";

import { updateProfileAction } from "@/features/profile/actions";
import {
  normalizeProfileFormValues,
  profileFormSchema,
} from "@/features/profile/schemas";
import { getCurrentUser } from "@/lib/auth-session";
import { db } from "@/lib/db";

jest.mock("next/cache", () => ({
  revalidatePath: jest.fn(),
}));

jest.mock("@/lib/auth-session", () => ({
  getCurrentUser: jest.fn(),
}));

jest.mock("@/lib/db", () => ({
  db: {
    user: {
      update: jest.fn(),
    },
  },
}));

const getCurrentUserMock = getCurrentUser as jest.Mock;
const userUpdateMock = db.user.update as jest.Mock;
const revalidatePathMock = revalidatePath as jest.Mock;

describe("profile schemas", () => {
  it("trims profile fields and normalizes an empty avatar URL to null", () => {
    const parsed = profileFormSchema.parse({
      name: " Nguyễn Văn A ",
      image: "   ",
    });

    expect(normalizeProfileFormValues(parsed)).toEqual({
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

describe("updateProfileAction", () => {
  beforeEach(() => {
    getCurrentUserMock.mockResolvedValue({ id: "user_1" });
    userUpdateMock.mockResolvedValue({
      id: "user_1",
      name: "Nguyễn Văn A",
      image: "https://example.com/a.png",
    });
    userUpdateMock.mockClear();
    revalidatePathMock.mockReset();
  });

  it("rejects unauthenticated users", async () => {
    getCurrentUserMock.mockResolvedValue(null);

    await expect(
      updateProfileAction({
        name: "Nguyễn Văn A",
        image: "",
      }),
    ).resolves.toEqual({
      ok: false,
      error: "Bạn cần đăng nhập để cập nhật hồ sơ.",
    });

    expect(userUpdateMock).not.toHaveBeenCalled();
  });

  it("updates the current user's name and normalized image", async () => {
    await expect(
      updateProfileAction({
        name: " Nguyễn Văn A ",
        image: " https://example.com/a.png ",
      }),
    ).resolves.toEqual({ ok: true });

    expect(userUpdateMock).toHaveBeenCalledWith({
      where: { id: "user_1" },
      data: {
        name: "Nguyễn Văn A",
        image: "https://example.com/a.png",
      },
    });
    expect(revalidatePathMock).toHaveBeenCalledWith("/(app)", "layout");
    expect(revalidatePathMock).toHaveBeenCalledWith("/(app)/profile");
  });

  it("does not update when validation fails", async () => {
    await expect(
      updateProfileAction({
        name: "",
        image: "not-a-url",
      }),
    ).resolves.toEqual({
      ok: false,
      error: "Dữ liệu hồ sơ không hợp lệ.",
    });

    expect(userUpdateMock).not.toHaveBeenCalled();
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });
});
