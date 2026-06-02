import {
  listPaginatedTransactions,
  listTransactions,
} from "@/features/transactions/service";
import { db } from "@/lib/db";

jest.mock("@/lib/db", () => ({
  db: {
    transaction: {
      count: jest.fn(),
      findMany: jest.fn(),
    },
  },
}));

const countMock = db.transaction.count as jest.Mock;
const findManyMock = db.transaction.findMany as jest.Mock;

describe("transactions service", () => {
  beforeEach(() => {
    countMock.mockReset();
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

  it("lists a selected month with server-side pagination metadata", async () => {
    countMock.mockResolvedValue(12);
    findManyMock.mockResolvedValue([{ id: "tx_6" }]);

    const result = await listPaginatedTransactions("user_1", {
      monthKey: "2026-05",
      page: 2,
      pageSize: 5,
    });

    expect(countMock).toHaveBeenCalledWith({
      where: {
        userId: "user_1",
        transactionDate: {
          gte: new Date("2026-05-01T00:00:00.000Z"),
          lt: new Date("2026-06-01T00:00:00.000Z"),
        },
      },
    });
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
      skip: 5,
      take: 5,
    });
    expect(result).toEqual({
      transactions: [{ id: "tx_6" }],
      total: 12,
      page: 2,
      pageSize: 5,
    });
  });
});
