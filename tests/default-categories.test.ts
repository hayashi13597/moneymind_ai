import {
  DEFAULT_CATEGORIES,
  createDefaultCategoryRows,
} from "@/lib/default-categories";

describe("default category onboarding", () => {
  it("includes the MVP default category set", () => {
    expect(DEFAULT_CATEGORIES.map((category) => category.name)).toEqual([
      "Thu nhập",
      "Ăn uống",
      "Cafe",
      "Mua sắm",
      "Di chuyển",
      "Nhà cửa",
      "Giải trí",
      "Sức khỏe",
      "Giáo dục",
      "Khác",
    ]);
  });

  it("creates user-scoped rows with stable unique keys", () => {
    const rows = createDefaultCategoryRows("user_123");
    const uniqueKeys = new Set(
      rows.map((category) => `${category.userId}:${category.name}:${category.type}`),
    );

    expect(rows).toHaveLength(DEFAULT_CATEGORIES.length);
    expect(uniqueKeys.size).toBe(rows.length);
    expect(rows.every((category) => category.userId === "user_123")).toBe(true);
    expect(rows.every((category) => category.isDefault)).toBe(true);
    expect(rows.find((category) => category.name === "Thu nhập")?.type).toBe(
      "income",
    );
    expect(
      rows
        .filter((category) => category.name !== "Thu nhập")
        .every((category) => category.type === "expense"),
    ).toBe(true);
  });
});
