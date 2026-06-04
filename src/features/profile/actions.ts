"use server";

import { revalidatePath } from "next/cache";

import {
  normalizeProfileFormValues,
  profileFormSchema,
  type ProfileFormInput,
} from "@/features/profile/schemas";
import { getCurrentUser } from "@/lib/auth-session";
import { db } from "@/lib/db";

type UpdateProfileResult = { ok: true } | { ok: false; error: string };

export async function updateProfileAction(
  values: ProfileFormInput,
): Promise<UpdateProfileResult> {
  const user = await getCurrentUser();

  if (!user) {
    return {
      ok: false,
      error: "Bạn cần đăng nhập để cập nhật hồ sơ.",
    };
  }

  const parsed = profileFormSchema.safeParse(values);

  if (!parsed.success) {
    return {
      ok: false,
      error: "Dữ liệu hồ sơ không hợp lệ.",
    };
  }

  const normalized = normalizeProfileFormValues(parsed.data);

  try {
    await db.user.update({
      where: { id: user.id },
      data: {
        name: normalized.name,
        image: normalized.image,
      },
    });

    revalidatePath("/(app)", "layout");
    revalidatePath("/(app)/profile");

    return { ok: true };
  } catch {
    return {
      ok: false,
      error: "Không thể cập nhật hồ sơ lúc này.",
    };
  }
}
