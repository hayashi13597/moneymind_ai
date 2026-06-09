import { cookies } from "next/headers";

import { BudgetManager } from "@/features/budgets/budget-manager";
import { listCategoryBudgetRows } from "@/features/budgets/service";
import {
  getSelectedMonth,
  USER_TIME_ZONE_COOKIE,
} from "@/features/dashboard/month";
import { getCurrentUser } from "@/lib/auth-session";

type BudgetsPageProps = {
  searchParams: Promise<{
    month?: string | string[];
  }>;
};

function firstSearchParam(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function BudgetsPage({ searchParams }: BudgetsPageProps) {
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
  const budgetData = await listCategoryBudgetRows(user.id, selectedMonth.key);

  return (
    <section>
      <BudgetManager selectedMonth={selectedMonth} initialData={budgetData} />
    </section>
  );
}
