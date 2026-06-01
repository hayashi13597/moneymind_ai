type ParseVndResult =
  | { ok: true; value: number }
  | { ok: false; error: "Số tiền không hợp lệ." };

export const MAX_TRANSACTION_AMOUNT = 2_147_483_647;

const INVALID_AMOUNT: ParseVndResult = {
  ok: false,
  error: "Số tiền không hợp lệ.",
};

function normalizeAmountInput(input: string) {
  return input
    .trim()
    .toLowerCase()
    .replace(/vnđ|vnd|đồng|dong|đ/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function parseGroupedInteger(input: string) {
  if (/^\d+$/.test(input)) {
    return Number(input);
  }

  if (/^\d{1,3}([.,]\d{3})+$/.test(input)) {
    return Number(input.replace(/[.,]/g, ""));
  }

  return null;
}

export function parseVndInput(input: string): ParseVndResult {
  const normalized = normalizeAmountInput(input);

  if (!normalized || normalized.startsWith("-")) {
    return INVALID_AMOUNT;
  }

  const multiplierMatch = normalized.match(
    /^(\d+(?:[.,]\d+)?)\s*(k|nghìn|ngan|tr|triệu)$/,
  );

  if (multiplierMatch) {
    const numericPart = multiplierMatch[1].replace(",", ".");
    const value = Number(numericPart);
    const suffix = multiplierMatch[2];
    const multiplier =
      suffix === "k" || suffix === "nghìn" || suffix === "ngan"
        ? 1_000
        : 1_000_000;
    const amount = Math.round(value * multiplier);

    return Number.isSafeInteger(amount) &&
      amount > 0 &&
      amount <= MAX_TRANSACTION_AMOUNT
      ? { ok: true, value: amount }
      : INVALID_AMOUNT;
  }

  const amount = parseGroupedInteger(normalized);

  if (
    amount === null ||
    !Number.isSafeInteger(amount) ||
    amount <= 0 ||
    amount > MAX_TRANSACTION_AMOUNT
  ) {
    return INVALID_AMOUNT;
  }

  return { ok: true, value: amount };
}

export function formatVnd(amount: number) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  })
    .format(amount)
    .replace(/\u00a0/g, " ");
}
