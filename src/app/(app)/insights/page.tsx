import { cookies } from "next/headers";

import { getCachedMonthlyInsight } from "@/features/ai/monthly-insight";
import { InsightsPageView } from "@/features/ai/insights-page-view";
import {
  getSelectedMonth,
  USER_TIME_ZONE_COOKIE,
} from "@/features/dashboard/month";
import { getMonthlyDashboard } from "@/features/dashboard/service";
import { getCurrentUser } from "@/lib/auth-session";

type InsightsPageProps = {
  searchParams: Promise<{
    month?: string | string[];
  }>;
};

function firstSearchParam(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function InsightsPage({ searchParams }: InsightsPageProps) {
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
  const [dashboard, initialInsight] = await Promise.all([
    getMonthlyDashboard(user.id, selectedMonth),
    getCachedMonthlyInsight(user.id, selectedMonth.key),
  ]);

  return (
    <InsightsPageView dashboard={dashboard} initialInsight={initialInsight} />
  );
}
