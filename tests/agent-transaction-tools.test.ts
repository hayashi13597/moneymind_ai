import {
  createAgentTransaction,
  deleteAgentTransaction,
  searchAgentTransactions,
  updateAgentTransaction,
} from "@/features/agent/tools/transactions";
import {
  createTransaction,
  deleteTransaction,
  updateTransaction,
} from "@/features/transactions/service";
import { db } from "@/lib/db";

jest.mock("@/features/transactions/service", () => ({
  createTransaction: jest.fn(),
  deleteTransaction: jest.fn(),
  updateTransaction: jest.fn(),
}));

jest.mock("@/lib/db", () => ({
  db: {
    category: { findMany: jest.fn() },
    transaction: { findMany: jest.fn() },
  },
}));

const categoryFindManyMock = db.category.findMany as jest.Mock;
const transactionFindManyMock = db.transaction.findMany as jest.Mock;
const createTransactionMock = createTransaction as jest.Mock;
const updateTransactionMock = updateTransaction as jest.Mock;
const deleteTransactionMock = deleteTransaction as jest.Mock;

const tx = {
  id: "tx_1",
  type: "expense",
  amount: 55000,
  transactionDate: new Date("2026-06-04T00:00:00.000Z"),
  merchant: "Quán cơm",
  note: "Cơm trưa",
  categoryId: "cat_food",
  category: { name: "Ăn uống" },
};

describe("agent transaction tools", () => {
  beforeEach(() => {
    categoryFindManyMock.mockReset();
    transactionFindManyMock.mockReset();
    createTransactionMock.mockReset();
    updateTransactionMock.mockReset();
    deleteTransactionMock.mockReset();

    categoryFindManyMock.mockResolvedValue([
      { id: "cat_food", name: "Ăn uống", type: "expense" },
      { id: "cat_income", name: "Thu nhập", type: "income" },
    ]);
    transactionFindManyMock.mockResolvedValue([tx]);
  });

  it("searches transactions and maps summaries", async () => {
    const result = await searchAgentTransactions("user_1", "2026-06", {
      query: "ăn uống 55k",
      categoryName: "Ăn uống",
      minAmount: 50000,
    });

    expect(transactionFindManyMock).toHaveBeenCalled();
    expect(result.transactions).toEqual([
      {
        id: "tx_1",
        date: "2026-06-04",
        type: "expense",
        amount: 55000,
        categoryName: "Ăn uống",
        merchant: "Quán cơm",
        note: "Cơm trưa",
      },
    ]);
  });

  it("creates a transaction through the existing service", async () => {
    createTransactionMock.mockResolvedValue({ ok: true, transaction: tx });

    const result = await createAgentTransaction("user_1", {
      type: "expense",
      amount: 55000,
      categoryName: "Ăn uống",
      note: "Cơm trưa",
      merchant: "Quán cơm",
      transactionDate: "2026-06-04",
    });

    expect(createTransactionMock).toHaveBeenCalledWith("user_1", {
      type: "expense",
      amount: 55000,
      categoryId: "cat_food",
      note: "Cơm trưa",
      merchant: "Quán cơm",
      rawInput: "Cơm trưa",
      transactionDate: new Date("2026-06-04T00:00:00.000Z"),
    });
    expect(result.ok).toBe(true);
  });

  it("asks for clarification when update target matches multiple transactions", async () => {
    transactionFindManyMock.mockResolvedValue([
      tx,
      { ...tx, id: "tx_2", amount: 70000, note: "Bún bò" },
    ]);

    const result = await updateAgentTransaction("user_1", "2026-06", {
      targetQuery: "ăn trưa hôm nay",
      updates: { amount: 60000 },
    });

    expect(result.ok).toBe(false);
    expect(result.reason).toBe("clarification_required");
    expect(updateTransactionMock).not.toHaveBeenCalled();
  });

  it("updates a single matched transaction", async () => {
    updateTransactionMock.mockResolvedValue({
      ok: true,
      transaction: { ...tx, amount: 60000 },
    });

    const result = await updateAgentTransaction("user_1", "2026-06", {
      targetQuery: "cơm trưa",
      updates: { amount: 60000 },
    });

    expect(updateTransactionMock).toHaveBeenCalledWith("user_1", "tx_1", {
      amount: 60000,
    });
    expect(result.ok).toBe(true);
  });

  it("deletes a single matched transaction", async () => {
    deleteTransactionMock.mockResolvedValue(true);

    const result = await deleteAgentTransaction("user_1", "2026-06", {
      targetQuery: "cơm trưa",
    });

    expect(deleteTransactionMock).toHaveBeenCalledWith("user_1", "tx_1");
    expect(result.ok).toBe(true);
  });
});
