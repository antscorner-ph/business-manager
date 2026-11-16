export const EXPENSE_CATEGORY_OPTIONS = [
  "Salaries",
  "Operating Expense",
  "Utilities",
  "Rental Expense",
  "Office Supply",
  "Store Renovation",
  "Inventory Write-Off",
  "Marketing",
  "Transportation",
  "Other",
] as const;

export type ExpenseCategory = (typeof EXPENSE_CATEGORY_OPTIONS)[number];

export const DEFAULT_EXPENSE_CATEGORY: ExpenseCategory = "Operating Expense";
