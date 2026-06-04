import { createCategory } from "@/features/categories/service";
import { db } from "@/lib/db";

jest.mock("@/lib/db", () => ({
  db: {
    category: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
  },
}));

const createMock = db.category.create as jest.Mock;
const findManyMock = db.category.findMany as jest.Mock;

describe("categories service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
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
