import { describe, expect, it } from "vitest";
import { getSelectedReconciliationDate } from "./reconciliationDates";

describe("getSelectedReconciliationDate", () => {
  it("uses the selected date when provided", () => {
    expect(getSelectedReconciliationDate("2026-10-04")).toBe("2026-10-04");
  });

  it("falls back to today when no date is selected", () => {
    const today = new Date();
    const expected = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

    expect(getSelectedReconciliationDate()).toBe(expected);
  });

  it("falls back to today when an invalid date is provided", () => {
    const today = new Date();
    const expected = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

    expect(getSelectedReconciliationDate("not-a-date")).toBe(expected);
  });
});
