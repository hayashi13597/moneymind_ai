import { revalidatePath } from "next/cache";

export function revalidateTransactionViews() {
  revalidatePath("/(app)", "layout");
  revalidatePath("/(app)/transactions");
  revalidatePath("/(app)/dashboard");
  revalidatePath("/transactions");
  revalidatePath("/dashboard");
}
