import { cookies } from "next/headers";

import { getCachedMonthlyInsight } from "@/features/ai/monthly-insight";
import { DashboardView } from "@/features/dashboard/dashboard-view";
import {
  getSelectedMonth,
  USER_TIME_ZONE_COOKIE,
} from "@/features/dashboard/month";
import { getMonthlyDashboard } from "@/features/dashboard/service";
import { getCurrentSession } from "@/lib/auth-session";

type DashboardPageProps = {
  searchParams: Promise<{
    month?: string;
  }>;
};

export default async function DashboardPage({
  searchParams,
}: DashboardPageProps) {
  const [{ month }, session] = await Promise.all([
    searchParams,
    getCurrentSession(),
  ]);

  if (!session?.user) {
    return null;
  }

  const userTimeZone = (await cookies()).get(USER_TIME_ZONE_COOKIE)?.value;
  const selectedMonth = getSelectedMonth(month, undefined, userTimeZone);
  const [dashboard, initialInsight] = await Promise.all([
    getMonthlyDashboard(session.user.id, selectedMonth),
    getCachedMonthlyInsight(session.user.id, selectedMonth.key),
  ]);
  const userName =
    session.user.name?.trim() || session.user.email?.split("@")[0] || "Lâm";

  return (
    <DashboardView
      dashboard={dashboard}
      initialInsight={initialInsight}
      userName={userName}
    />
  );
}
