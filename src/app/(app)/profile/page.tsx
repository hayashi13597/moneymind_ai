import { redirect } from "next/navigation";

import { PageHeader, SectionCard } from "@/components/app-ui";
import { PasswordForm } from "@/features/profile/password-form";
import { ProfileForm } from "@/features/profile/profile-form";
import { getCurrentUser } from "@/lib/auth-session";

export default async function ProfilePage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Tài khoản"
        title="Hồ sơ cá nhân"
        description="Quản lý thông tin hiển thị, ảnh đại diện và mật khẩu đăng nhập MoneyMind AI."
      />
      <div className="grid gap-5 lg:grid-cols-[1fr_0.9fr]">
        <SectionCard>
          <section className="space-y-5">
            <div>
              <h2 className="text-lg font-semibold">Hồ sơ</h2>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                Cập nhật tên hiển thị và ảnh đại diện bằng URL ảnh.
              </p>
            </div>
            <ProfileForm user={user} />
          </section>
        </SectionCard>
        <SectionCard>
          <section className="space-y-5">
            <div>
              <h2 className="text-lg font-semibold">Bảo mật</h2>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                Đổi mật khẩu và kiểm soát các phiên đăng nhập khác.
              </p>
            </div>
            <PasswordForm />
          </section>
        </SectionCard>
      </div>
    </div>
  );
}
