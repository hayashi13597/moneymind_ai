import {
  getMonthWindow,
  getNextMonthKey,
  getPreviousMonthKey,
  getSelectedMonth,
} from "@/features/dashboard/month";

describe("dashboard month helpers", () => {
  it("uses an explicit valid YYYY-MM month", () => {
    expect(
      getSelectedMonth("2026-05", new Date("2026-02-10T00:00:00.000Z")),
    ).toEqual({
      key: "2026-05",
      label: "Tháng 05/2026",
      previousKey: "2026-04",
      nextKey: "2026-06",
    });
  });

  it("falls back to the current month for missing or invalid input", () => {
    const now = new Date("2026-05-26T12:00:00.000Z");

    expect(getSelectedMonth(undefined, now).key).toBe("2026-05");
    expect(getSelectedMonth("", now).key).toBe("2026-05");
    expect(getSelectedMonth("2026-13", now).key).toBe("2026-05");
    expect(getSelectedMonth("26-05", now).key).toBe("2026-05");
  });

  it("shifts previous and next months across year boundaries", () => {
    expect(getPreviousMonthKey("2026-01")).toBe("2025-12");
    expect(getNextMonthKey("2026-12")).toBe("2027-01");
  });

  it("creates an inclusive-exclusive UTC date window", () => {
    expect(getMonthWindow("2026-05")).toEqual({
      start: new Date("2026-05-01T00:00:00.000Z"),
      end: new Date("2026-06-01T00:00:00.000Z"),
    });
  });
});
