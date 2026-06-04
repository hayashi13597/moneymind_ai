import { createCategory } from "@/features/categories/service";
import { db } from "@/lib/db";

jest.mock("@/lib/db", () => ({
  db: {
    $transaction: jest.fn(),
    $queryRaw: jest.fn(),
    category: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
  },
}));

const transactionMock = db.$transaction as jest.Mock;
const createMock = db.category.create as jest.Mock;
const findManyMock = db.category.findMany as jest.Mock;

describe("categories service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    transactionMock.mockImplementation(async (callback) => callback(db));
  });

  it("assigns an unused color inside the category creation transaction", async () => {
    const transactionClient = {
      $queryRaw: jest.fn(),
      category: {
        create: jest.fn().mockResolvedValueOnce({
          id: "cat_custom",
          userId: "user_123",
          name: "Ăn ngoài",
          type: "expense",
          color: "#ef4444",
          icon: undefined,
        }),
        findMany: jest.fn().mockResolvedValueOnce([{ color: "#16a34a" }]),
      },
    };
    transactionMock.mockImplementationOnce(async (callback) =>
      callback(transactionClient),
    );

    await createCategory("user_123", {
      name: "Ăn ngoài",
      type: "expense",
    });

    expect(transactionMock).toHaveBeenCalledTimes(1);
    expect(transactionClient.$queryRaw).toHaveBeenCalled();
    expect(transactionClient.category.findMany).toHaveBeenCalledWith({
      where: {
        userId: "user_123",
        color: { not: null },
      },
      select: { color: true },
    });
    expect(transactionClient.category.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        color: "#ef4444",
      }),
    });
    expect(findManyMock).not.toHaveBeenCalled();
    expect(createMock).not.toHaveBeenCalled();
  });

  it("assigns an unused color when a new category does not provide one", async () => {
    findManyMock.mockResolvedValueOnce([{ color: "#16a34a" }]);
    createMock.mockResolvedValueOnce({
      id: "cat_custom",
      userId: "user_123",
      name: "Ăn ngoài",
      type: "expense",
      color: "#ef4444",
      icon: undefined,
    });

    await createCategory("user_123", {
      name: "Ăn ngoài",
      type: "expense",
    });

    expect(findManyMock).toHaveBeenCalledWith({
      where: {
        userId: "user_123",
        color: { not: null },
      },
      select: { color: true },
    });
    expect(createMock).toHaveBeenCalledWith({
      data: expect.objectContaining({
        color: "#ef4444",
      }),
    });
  });

  it("keeps an explicit color from the request", async () => {
    createMock.mockResolvedValueOnce({
      id: "cat_custom",
      userId: "user_123",
      name: "Ăn ngoài",
      type: "expense",
      color: "#123456",
      icon: undefined,
    });

    await createCategory("user_123", {
      name: "Ăn ngoài",
      type: "expense",
      color: "#123456",
    });

    expect(findManyMock).not.toHaveBeenCalled();
    expect(createMock).toHaveBeenCalledWith({
      data: expect.objectContaining({
        color: "#123456",
      }),
    });
  });
});
