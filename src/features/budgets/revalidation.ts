import { revalidatePath } from "next/cache";

export function revalidateBudgetViews() {
  revalidatePath("/budgets");
  revalidatePath("/dashboard");
}
