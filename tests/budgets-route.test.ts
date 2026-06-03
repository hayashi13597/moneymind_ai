import { revalidatePath } from "next/cache";

import { DELETE, GET, PUT } from "@/app/api/budgets/route";
import {
  deleteBudget,
  listCategoryBudgetRows,
  upsertBudget,
} from "@/features/budgets/service";
import { getRequiredApiUser } from "@/lib/api";

jest.mock("next/cache", () => ({
  revalidatePath: jest.fn(),
}));

jest.mock("@/lib/api", () => ({
  getRequiredApiUser: jest.fn(),
  jsonBadRequest: (error = "Dữ liệu không hợp lệ.") =>
    Response.json({ error }, { status: 400 }),
  jsonError: (error: string, status: number) =>
    Response.json({ error }, { status }),
  jsonUnauthorized: () =>
    Response.json({ error: "Bạn cần đăng nhập để tiếp tục." }, { status: 401 }),
}));

jest.mock("@/features/budgets/service", () => ({
  deleteBudget: jest.fn(),
  listCategoryBudgetRows: jest.fn(),
  upsertBudget: jest.fn(),
}));

const getRequiredApiUserMock = getRequiredApiUser as jest.Mock;
const listCategoryBudgetRowsMock = listCategoryBudgetRows as jest.Mock;
const upsertBudgetMock = upsertBudget as jest.Mock;
const deleteBudgetMock = deleteBudget as jest.Mock;
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

describe("budgets route", () => {
  beforeEach(() => {
    getRequiredApiUserMock.mockReset();
    listCategoryBudgetRowsMock.mockReset();
    upsertBudgetMock.mockReset();
    deleteBudgetMock.mockReset();
    revalidatePathMock.mockReset();

    getRequiredApiUserMock.mockResolvedValue({ id: "user_1" });
    listCategoryBudgetRowsMock.mockResolvedValue({
      rows: [],
      summary: { totalBudget: 0, totalSpent: 0, remaining: 0, overAmount: 0 },
    });
    upsertBudgetMock.mockResolvedValue({ ok: true, budget: { id: "budget_1" } });
    deleteBudgetMock.mockResolvedValue({ ok: true, count: 1 });
  });

  it("requires auth", async () => {
    getRequiredApiUserMock.mockResolvedValue(null);

    const response = await GET({
      url: "http://localhost/api/budgets?month=2026-06",
    } as Request);

    expect(response.status).toBe(401);
  });

  it("rejects invalid month queries", async () => {
    const response = await GET({
      url: "http://localhost/api/budgets?month=2026-13",
    } as Request);
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload).toEqual({ error: "Tháng không hợp lệ." });
    expect(listCategoryBudgetRowsMock).not.toHaveBeenCalled();
  });

  it("lists budgets for the selected month", async () => {
    const response = await GET({
      url: "http://localhost/api/budgets?month=2026-06",
    } as Request);

    expect(response.status).toBe(200);
    expect(listCategoryBudgetRowsMock).toHaveBeenCalledWith(
      "user_1",
      "2026-06",
    );
  });

  it("upserts budgets and revalidates budget-backed views", async () => {
    const response = await PUT({
      json: async () => ({
        categoryId: "cat_food",
        scope: "month",
        month: "2026-06",
        amount: "3tr",
      }),
    } as Request);

    expect(response.status).toBe(200);
    expect(upsertBudgetMock).toHaveBeenCalledWith("user_1", {
      categoryId: "cat_food",
      scope: "month",
      month: "2026-06",
      amount: 3000000,
    });
    expect(revalidatePathMock).toHaveBeenCalledWith("/budgets");
    expect(revalidatePathMock).toHaveBeenCalledWith("/dashboard");
    expect(revalidatePathMock).toHaveBeenCalledTimes(2);
  });

  it("rejects malformed budget upsert bodies", async () => {
    const response = await PUT({
      json: async () => {
        throw new SyntaxError("Unexpected end of JSON input");
      },
    } as unknown as Request);
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload).toEqual({ error: "Dữ liệu không hợp lệ." });
    expect(upsertBudgetMock).not.toHaveBeenCalled();
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });

  it("rejects empty budget upsert bodies", async () => {
    const response = await PUT({
      json: async () => null,
    } as unknown as Request);
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload).toEqual({ error: "Dữ liệu không hợp lệ." });
    expect(upsertBudgetMock).not.toHaveBeenCalled();
  });

  it("returns Vietnamese category errors", async () => {
    upsertBudgetMock.mockResolvedValue({
      ok: false,
      reason: "invalid_category",
    });

    const response = await PUT({
      json: async () => ({
        categoryId: "cat_income",
        scope: "default",
        amount: "3tr",
      }),
    } as Request);
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload).toEqual({ error: "Danh mục không hợp lệ." });
  });

  it("deletes budgets and revalidates", async () => {
    const response = await DELETE({
      json: async () => ({
        categoryId: "cat_food",
        scope: "default",
      }),
    } as Request);

    expect(response.status).toBe(200);
    expect(deleteBudgetMock).toHaveBeenCalledWith("user_1", {
      categoryId: "cat_food",
      scope: "default",
    });
    expect(revalidatePathMock).toHaveBeenCalledWith("/budgets");
    expect(revalidatePathMock).toHaveBeenCalledWith("/dashboard");
    expect(revalidatePathMock).toHaveBeenCalledTimes(2);
  });

  it("rejects malformed budget delete bodies", async () => {
    const response = await DELETE({
      json: async () => undefined,
    } as unknown as Request);
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload).toEqual({ error: "Dữ liệu không hợp lệ." });
    expect(deleteBudgetMock).not.toHaveBeenCalled();
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });
});
