import { cn } from "@/lib/utils";

export const STATUS_TAG_CLASSES: Record<string, string> = {
  paid: "bg-emerald-100 text-emerald-800 border-emerald-200",
  unpaid: "bg-rose-100 text-rose-800 border-rose-200",
  partially_paid: "bg-amber-100 text-amber-800 border-amber-200",
  partial: "bg-amber-100 text-amber-800 border-amber-200",
  pending: "bg-slate-100 text-slate-800 border-slate-200",
  confirmed: "bg-blue-100 text-blue-800 border-blue-200",
  reconciled: "bg-emerald-100 text-emerald-800 border-emerald-200",
  approved: "bg-emerald-100 text-emerald-800 border-emerald-200",
  cancelled: "bg-rose-100 text-rose-800 border-rose-200",
  written_off: "bg-zinc-100 text-zinc-800 border-zinc-200",
};

export const EXPENSE_CATEGORY_TAG_CLASSES: Record<string, string> = {
  Salaries: "bg-sky-100 text-sky-800 border-sky-200",
  "Operating Expense": "bg-slate-100 text-slate-800 border-slate-200",
  Utilities: "bg-violet-100 text-violet-800 border-violet-200",
  "Rental Expense": "bg-indigo-100 text-indigo-800 border-indigo-200",
  "Office Supply": "bg-teal-100 text-teal-800 border-teal-200",
  "Store Renovation": "bg-orange-100 text-orange-800 border-orange-200",
  "Inventory Write-Off": "bg-red-100 text-red-800 border-red-200",
  Marketing: "bg-pink-100 text-pink-800 border-pink-200",
  Transportation: "bg-cyan-100 text-cyan-800 border-cyan-200",
  Other: "bg-zinc-100 text-zinc-800 border-zinc-200",
};

export const PAYMENT_METHOD_TAG_CLASSES: Record<string, string> = {
  cash: "bg-stone-100 text-stone-800 border-stone-200",
  gcash: "bg-cyan-100 text-cyan-800 border-cyan-200",
  check: "bg-indigo-100 text-indigo-800 border-indigo-200",
  bank_transfer: "bg-violet-100 text-violet-800 border-violet-200",
  other: "bg-zinc-100 text-zinc-800 border-zinc-200",
};

export const formatTagLabel = (value: string) =>
  value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

export const getTagClass = (map: Record<string, string>, key: string) =>
  cn("border font-medium", map[key] || "bg-muted text-foreground");