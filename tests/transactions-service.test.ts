import { listTransactions } from "@/features/transactions/service";
import { db } from "@/lib/db";

jest.mock("@/lib/db", () => ({
  db: {
    transaction: {
      findMany: jest.fn(),
    },
  },
}));

const findManyMock = db.transaction.findMany as jest.Mock;

describe("transactions service", () => {
  beforeEach(() => {
    findManyMock.mockReset();
  });

  it("limits transactions to a selected month when a month key is provided", async () => {
    findManyMock.mockResolvedValue([]);

    await listTransactions("user_1", "2026-05");

    expect(findManyMock).toHaveBeenCalledWith({
      where: {
        userId: "user_1",
        transactionDate: {
          gte: new Date("2026-05-01T00:00:00.000Z"),
          lt: new Date("2026-06-01T00:00:00.000Z"),
        },
      },
      include: { category: true },
      orderBy: [{ transactionDate: "desc" }, { createdAt: "desc" }],
    });
  });
});
