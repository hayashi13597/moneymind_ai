import {
  categoryCreateSchema,
  categoryUpdateSchema,
} from "@/features/categories/schemas";

describe("category schemas", () => {
  it("trims valid create payloads", () => {
    expect(
      categoryCreateSchema.parse({
        name: " Ăn ngoài ",
        type: "expense",
        color: " #ef4444 ",
        icon: " utensils ",
      }),
    ).toEqual({
      name: "Ăn ngoài",
      type: "expense",
      color: "#ef4444",
      icon: "utensils",
    });
  });

  it("allows null type for cross-type categories", () => {
    expect(categoryCreateSchema.parse({ name: "Khác", type: null })).toEqual({
      name: "Khác",
      type: null,
    });
  });

  it("rejects empty names", () => {
    expect(() =>
      categoryCreateSchema.parse({ name: "   ", type: "income" }),
    ).toThrow();
  });

  it("requires at least one update field", () => {
    expect(() => categoryUpdateSchema.parse({})).toThrow();
  });
});
