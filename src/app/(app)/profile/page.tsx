import { redirect } from "next/navigation";

import {
  CoachHero,
  CoachMetricStrip,
  CoachPageShell,
  WorkbenchCard,
} from "@/components/coach-ui";
import { PasswordForm } from "@/features/profile/password-form";
import { ProfileForm } from "@/features/profile/profile-form";
import { getCurrentUser } from "@/lib/auth-session";

export default async function ProfilePage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <CoachPageShell>
      <CoachHero
        eyebrow="Hồ sơ"
        title="Thông tin tài khoản và bảo mật"
        description="Quản lý tên hiển thị, email đăng nhập và mật khẩu của bạn trong một nơi. Những thông tin này giúp MoneyMind hiển thị đúng danh tính mà không chạm vào dữ liệu tài chính."
        recommendation="Cập nhật tên hiển thị nếu bạn muốn giao diện cá nhân hơn, và đổi mật khẩu ngay khi nghi ngờ phiên đăng nhập cũ không còn an toàn."
        evidence={[
          {
            label: "Email đăng nhập",
            value: user.email,
            helper: "Dữ liệu xác thực chỉ đọc",
          },
          {
            label: "Hồ sơ",
            value: user.name?.trim() ? "Đã đặt tên" : "Chưa đặt tên",
            helper: "Ảnh đại diện là tùy chọn",
          },
        ]}
      />
      <CoachMetricStrip
        metrics={[
          {
            label: "Tên hiển thị",
            value: user.name?.trim() || "Chưa đặt",
            helper: "Tên MoneyMind dùng trong app",
          },
          {
            label: "Email",
            value: "Đã xác thực",
            helper: user.email,
            tone: "positive",
          },
          {
            label: "Avatar",
            value: user.image ? "Đã có" : "Chưa có",
            helper: "Tùy chọn hiển thị",
          },
          {
            label: "Bảo mật",
            value: "Có kiểm soát",
            helper: "Có thể thu hồi phiên khác",
            tone: "positive",
          },
        ]}
      />
      <div className="grid gap-5 lg:grid-cols-[1fr_0.9fr]">
        <WorkbenchCard
          title="Hồ sơ hiển thị"
          description="Cập nhật cách MoneyMind hiển thị tên và ảnh đại diện trong giao diện."
        >
          <ProfileForm user={user} />
        </WorkbenchCard>
        <WorkbenchCard
          title="Bảo mật đăng nhập"
          description="Đổi mật khẩu và thu hồi các phiên khác khi bạn muốn siết lại quyền truy cập."
        >
          <PasswordForm />
        </WorkbenchCard>
      </div>
    </CoachPageShell>
  );
}
