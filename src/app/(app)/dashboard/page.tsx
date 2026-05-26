import { DashboardView } from "@/features/dashboard/dashboard-view";
import { getSelectedMonth } from "@/features/dashboard/month";
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

  const selectedMonth = getSelectedMonth(month);
  const dashboard = await getMonthlyDashboard(session.user.id, selectedMonth);

  return <DashboardView dashboard={dashboard} />;
}
