import { describe, expect, it } from "vitest";
import { getTransactionDate } from "./transactionDate";

describe("getTransactionDate", () => {
  it("prefers the explicit transaction date", () => {
    expect(getTransactionDate("2026-10-04", "2026-10-05", "2026-10-06T12:00:00Z")).toBe("2026-10-04");
  });

  it("falls back to the reconciliation date when the transaction date is blank", () => {
    expect(getTransactionDate("", "2026-10-05", "2026-10-06T12:00:00Z")).toBe("2026-10-05");
  });

  it("falls back to the created timestamp date when no explicit date exists", () => {
    expect(getTransactionDate(null, null, "2026-10-06T12:00:00Z")).toBe("2026-10-06");
  });
});
