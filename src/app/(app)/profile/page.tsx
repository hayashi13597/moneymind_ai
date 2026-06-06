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
        eyebrow="Personalization"
        title="Cá nhân hóa phiên cố vấn tài chính"
        description="Profile không chỉ là tài khoản. Đây là nơi MoneyMind giữ danh tính, độ tin cậy đăng nhập và cách hiển thị thông tin cá nhân trong các phiên cố vấn."
        recommendation="Hoàn thiện tên hiển thị và giữ mật khẩu an toàn để MoneyMind có thể cá nhân hóa trải nghiệm mà không làm yếu lớp bảo vệ tài khoản."
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
            label: "Danh tính cố vấn",
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
          title="Hồ sơ cá nhân hóa"
          description="Cập nhật cách MoneyMind nhận diện bạn trong giao diện và các phiên cố vấn."
        >
          <ProfileForm user={user} />
        </WorkbenchCard>
        <WorkbenchCard
          title="Bảo mật phiên cố vấn"
          description="Đổi mật khẩu và kiểm soát các phiên đăng nhập khác khi bạn muốn siết lại quyền truy cập."
        >
          <PasswordForm />
        </WorkbenchCard>
      </div>
    </CoachPageShell>
  );
}
