import { getCurrentUser } from "@/lib/auth-session";

export async function getRequiredApiUser() {
  const user = await getCurrentUser();

  if (!user) {
    return null;
  }

  return user;
}

export function jsonError(error: string, status: number) {
  return Response.json({ error }, { status });
}

export function jsonBadRequest(message = "Dữ liệu không hợp lệ.") {
  return jsonError(message, 400);
}

export function jsonUnauthorized() {
  return jsonError("Bạn cần đăng nhập để tiếp tục.", 401);
}

export function jsonNotFound(message = "Không tìm thấy dữ liệu.") {
  return jsonError(message, 404);
}
