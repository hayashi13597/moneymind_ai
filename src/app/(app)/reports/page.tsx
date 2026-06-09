import { cookies } from "next/headers";

import { listDashboardBudgetSummary } from "@/features/budgets/service";
import {
  getSelectedMonth,
  USER_TIME_ZONE_COOKIE,
} from "@/features/dashboard/month";
import { getMonthlyDashboard } from "@/features/dashboard/service";
import { ReportsPageView } from "@/features/reports/reports-page-view";
import { getCurrentUser } from "@/lib/auth-session";

type ReportsPageProps = {
  searchParams: Promise<{
    month?: string | string[];
  }>;
};

function firstSearchParam(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function ReportsPage({ searchParams }: ReportsPageProps) {
  const user = await getCurrentUser();

  if (!user) {
    return null;
  }

  const params = await searchParams;
  const userTimeZone = (await cookies()).get(USER_TIME_ZONE_COOKIE)?.value;
  const selectedMonth = getSelectedMonth(
    firstSearchParam(params.month),
    undefined,
    userTimeZone,
  );
  const [dashboard, budgets] = await Promise.all([
    getMonthlyDashboard(user.id, selectedMonth),
    listDashboardBudgetSummary(user.id, selectedMonth.key),
  ]);

  return <ReportsPageView dashboard={dashboard} budgets={budgets} />;
}
