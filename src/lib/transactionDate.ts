export function getTransactionDate(
  transactionDate?: string | null,
  fallbackDate?: string | null,
  createdAt?: string | null
): string {
  const normalizedTransactionDate = transactionDate?.trim();
  if (normalizedTransactionDate) return normalizedTransactionDate;

  const normalizedFallbackDate = fallbackDate?.trim();
  if (normalizedFallbackDate) return normalizedFallbackDate;

  if (createdAt) return createdAt.slice(0, 10);

  return new Date().toISOString().slice(0, 10);
}
