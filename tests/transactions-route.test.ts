import { revalidatePath } from "next/cache";

import { GET, POST } from "@/app/api/transactions/route";
import {
  createTransaction,
  listPaginatedTransactions,
} from "@/features/transactions/service";
import { getRequiredApiUser } from "@/lib/api";

jest.mock("next/cache", () => ({
  revalidatePath: jest.fn(),
}));

jest.mock("@/lib/api", () => ({
  getRequiredApiUser: jest.fn(),
  jsonBadRequest: (error = "Bad request") =>
    Response.json({ error }, { status: 400 }),
  jsonError: (error: string, status: number) =>
    Response.json({ error }, { status }),
  jsonUnauthorized: () =>
    Response.json({ error: "Unauthorized" }, { status: 401 }),
}));

jest.mock("@/features/transactions/service", () => ({
  createTransaction: jest.fn(),
  listPaginatedTransactions: jest.fn(),
}));

const getRequiredApiUserMock = getRequiredApiUser as jest.Mock;
const createTransactionMock = createTransaction as jest.Mock;
const listPaginatedTransactionsMock = listPaginatedTransactions as jest.Mock;
const revalidatePathMock = revalidatePath as jest.Mock;
const originalResponse = global.Response;

beforeAll(() => {
  global.Response = {
    json: (body: unknown, init?: ResponseInit) => ({
      json: async () => body,
      status: init?.status ?? 200,
    }),
  } as unknown as typeof Response;
});

afterAll(() => {
  global.Response = originalResponse;
});

function createRequest(type: "income" | "expense" = "expense") {
  return {
    json: async () => ({
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
    }),
  } as Request;
}

describe("transactions route", () => {
  beforeEach(() => {
    createTransactionMock.mockReset();
    listPaginatedTransactionsMock.mockReset();
    getRequiredApiUserMock.mockResolvedValue({ id: "user_1" });
    createTransactionMock.mockResolvedValue({
      ok: true,
      transaction: { id: "tx_ai" },
    });
    listPaginatedTransactionsMock.mockResolvedValue({
      transactions: [],
      total: 0,
      page: 1,
      pageSize: 5,
    });
    revalidatePathMock.mockReset();
  });

  it("passes a valid month query to the transaction listing service", async () => {
    const response = await GET(
      {
        url: "http://localhost/api/transactions?month=2026-05",
      } as Request,
    );

    expect(response.status).toBe(200);
    expect(listPaginatedTransactionsMock).toHaveBeenCalledWith("user_1", {
      monthKey: "2026-05",
      page: 1,
      pageSize: 5,
    });
  });

  it("passes pagination query params to the transaction listing service", async () => {
    const response = await GET(
      {
        url: "http://localhost/api/transactions?month=2026-05&page=2&pageSize=10",
      } as Request,
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(listPaginatedTransactionsMock).toHaveBeenCalledWith("user_1", {
      monthKey: "2026-05",
      page: 2,
      pageSize: 10,
    });
    expect(payload).toEqual({
      transactions: [],
      pagination: {
        total: 0,
        page: 1,
        pageSize: 5,
      },
    });
  });

  it("rejects an invalid month query instead of listing every transaction", async () => {
    const response = await GET(
      {
        url: "http://localhost/api/transactions?month=2026-13",
      } as Request,
    );
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload).toEqual({ error: "Tháng không hợp lệ." });
    expect(listPaginatedTransactionsMock).not.toHaveBeenCalled();
  });

  it("revalidates transaction-backed pages after creating a transaction", async () => {
    const response = await POST(createRequest());

    expect(response.status).toBe(201);
    expect(revalidatePathMock).toHaveBeenCalledWith("/(app)", "layout");
    expect(revalidatePathMock).toHaveBeenCalledWith("/(app)/transactions");
    expect(revalidatePathMock).toHaveBeenCalledWith("/(app)/dashboard");
  });

  it("revalidates the app layout after creating any transaction", async () => {
    const response = await POST(createRequest("income"));

    expect(response.status).toBe(201);
    expect(revalidatePathMock).toHaveBeenCalledWith("/(app)", "layout");
  });
});
