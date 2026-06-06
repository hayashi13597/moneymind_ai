import { revalidateTransactionViews } from "@/features/transactions/revalidation";
import { transactionCreateSchema } from "@/features/transactions/schemas";
import {
  createTransaction,
  getTransactionSummary,
  listPaginatedTransactions,
} from "@/features/transactions/service";
import {
  getRequiredApiUser,
  jsonBadRequest,
  jsonError,
  jsonUnauthorized,
} from "@/lib/api";

function transactionDomainError(reason: string) {
  if (reason === "missing_category") {
    return jsonError("Không tìm thấy danh mục.", 404);
  }

  if (reason === "type_mismatch") {
    return jsonError("Danh mục không khớp loại giao dịch.", 400);
  }

  return jsonBadRequest();
}

const pageSizeOptions = [5, 10, 20] as const;
const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 5;

function parsePositiveInteger(value: string | null, fallback: number) {
  if (!value) {
    return fallback;
  }

  const parsed = Number(value);

  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function parsePaginationParams(searchParams: URLSearchParams) {
  const page = parsePositiveInteger(searchParams.get("page"), DEFAULT_PAGE);
  const requestedPageSize = parsePositiveInteger(
    searchParams.get("pageSize"),
    DEFAULT_PAGE_SIZE,
  );
  const pageSize = pageSizeOptions.includes(
    requestedPageSize as (typeof pageSizeOptions)[number],
  )
    ? requestedPageSize
    : DEFAULT_PAGE_SIZE;

  return { page, pageSize };
}

export async function GET(request: Request) {
  const user = await getRequiredApiUser();

  if (!user) {
    return jsonUnauthorized();
  }

  const searchParams = new URL(request.url).searchParams;
  const monthParam = searchParams.get("month");
  const monthPattern = /^\d{4}-(0[1-9]|1[0-2])$/;

  if (monthParam && !monthPattern.test(monthParam)) {
    return jsonBadRequest("Tháng không hợp lệ.");
  }

  const month = monthParam ?? undefined;
  const [result, summary] = await Promise.all([
    listPaginatedTransactions(user.id, {
      monthKey: month,
      ...parsePaginationParams(searchParams),
    }),
    getTransactionSummary(user.id, month),
  ]);

  return Response.json({
    transactions: result.transactions,
    pagination: {
      total: result.total,
      page: result.page,
      pageSize: result.pageSize,
    },
    summary,
  });
}

export async function POST(request: Request) {
  const user = await getRequiredApiUser();

  if (!user) {
    return jsonUnauthorized();
  }

  const parsed = transactionCreateSchema.safeParse(await request.json());

  if (!parsed.success) {
    return jsonBadRequest();
  }

  const result = await createTransaction(user.id, parsed.data);

  if (!result.ok) {
    return transactionDomainError(result.reason);
  }

  revalidateTransactionViews();

  return Response.json({ transaction: result.transaction }, { status: 201 });
}
