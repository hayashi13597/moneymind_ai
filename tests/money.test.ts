import { formatVnd, parseVndInput } from "@/lib/money";

describe("parseVndInput", () => {
  it.each([
    ["55k", 55000],
    ["55 K", 55000],
    ["18tr", 18000000],
    ["18 triệu", 18000000],
    ["3.200.000đ", 3200000],
    ["3,200,000", 3200000],
    ["3000000", 3000000],
  ])("parses %s as %i VND", (input, expected) => {
    expect(parseVndInput(input)).toEqual({ ok: true, value: expected });
  });

  it.each(["", "abc", "0", "-5k", "10 usd", "1.2.3.4"])(
    "rejects invalid input %s",
    (input) => {
      expect(parseVndInput(input)).toEqual({
        ok: false,
        error: "Số tiền không hợp lệ.",
      });
    },
  );
});

describe("formatVnd", () => {
  it("formats integer VND with Vietnamese locale", () => {
    expect(formatVnd(3200000)).toBe("3.200.000 ₫");
  });
});
