import { revalidatePath } from "next/cache";

import { createTransactionAction } from "@/features/transactions/actions";
import { createTransaction } from "@/features/transactions/service";
import { getCurrentUser } from "@/lib/auth-session";

jest.mock("next/cache", () => ({
  revalidatePath: jest.fn(),
}));

jest.mock("@/lib/auth-session", () => ({
  getCurrentUser: jest.fn(),
}));

jest.mock("@/features/transactions/service", () => ({
  createTransaction: jest.fn(),
}));

const getCurrentUserMock = getCurrentUser as jest.Mock;
const createTransactionMock = createTransaction as jest.Mock;
const revalidatePathMock = revalidatePath as jest.Mock;

function transactionInput(type: "income" | "expense" = "income") {
  return {
    type,
    amount: 55000,
    categoryId: type === "income" ? "cat_income" : "cat_food",
    note: type === "income" ? "Lương tháng này" : "Tiền ăn bún bò huế",
    merchant: type === "income" ? "" : "Quán bún bò",
    rawInput:
      type === "income"
        ? "Thêm thu nhập lương tháng này 55k"
        : "Thêm chi tiêu hôm nay là 55k tiền ăn bún bò huế",
    transactionDate: "2026-05-27",
  };
}

describe("transaction server actions", () => {
  beforeEach(() => {
    createTransactionMock.mockReset();
    getCurrentUserMock.mockResolvedValue({ id: "user_1" });
    createTransactionMock.mockResolvedValue({
      ok: true,
      transaction: { id: "tx_income" },
    });
    revalidatePathMock.mockReset();
  });

  it("creates an income transaction and revalidates app transaction views immediately", async () => {
    await expect(createTransactionAction(transactionInput("income"))).resolves.toEqual({
      ok: true,
    });

    expect(createTransactionMock).toHaveBeenCalledWith(
      "user_1",
      expect.objectContaining({
        type: "income",
        categoryId: "cat_income",
        note: "Lương tháng này",
      }),
    );
    expect(revalidatePathMock).toHaveBeenCalledWith("/(app)", "layout");
    expect(revalidatePathMock).toHaveBeenCalledWith("/(app)/transactions");
    expect(revalidatePathMock).toHaveBeenCalledWith("/(app)/dashboard");
  });

  it("rejects overflow amounts before calling Prisma", async () => {
    await expect(
      createTransactionAction({
        ...transactionInput("income"),
        amount: 2000000000000,
      }),
    ).resolves.toEqual({ ok: false, error: "Dữ liệu không hợp lệ." });

    expect(createTransactionMock).not.toHaveBeenCalled();
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });
});
