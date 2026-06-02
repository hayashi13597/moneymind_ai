import { revalidatePath } from "next/cache";

export function revalidateBudgetViews() {
  revalidatePath("/(app)/budgets");
  revalidatePath("/budgets");
  revalidatePath("/(app)/dashboard");
  revalidatePath("/dashboard");
}
