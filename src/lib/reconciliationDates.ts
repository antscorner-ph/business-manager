import { format } from "date-fns";

export function getSelectedReconciliationDate(value?: string): string {
  const fallback = format(new Date(), "yyyy-MM-dd");

  if (!value || !value.trim()) {
    return fallback;
  }

  const normalized = value.trim();
  const parsed = new Date(`${normalized}T12:00:00`);

  if (Number.isNaN(parsed.getTime())) {
    return fallback;
  }

  return format(parsed, "yyyy-MM-dd");
}
