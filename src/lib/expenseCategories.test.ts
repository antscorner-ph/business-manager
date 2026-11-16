import { describe, expect, it } from "vitest";
import { DEFAULT_EXPENSE_CATEGORY, EXPENSE_CATEGORY_OPTIONS } from "./expenseCategories";

describe("expenseCategories", () => {
  it("includes the standard business expense categories", () => {
    expect(EXPENSE_CATEGORY_OPTIONS).toContain("Operating Expense");
    expect(EXPENSE_CATEGORY_OPTIONS).toContain("Utilities");
    expect(EXPENSE_CATEGORY_OPTIONS).toContain("Rental Expense");
    expect(EXPENSE_CATEGORY_OPTIONS).toContain("Marketing");
  });

  it("uses Operating Expense as the default category", () => {
    expect(DEFAULT_EXPENSE_CATEGORY).toBe("Operating Expense");
  });
});
