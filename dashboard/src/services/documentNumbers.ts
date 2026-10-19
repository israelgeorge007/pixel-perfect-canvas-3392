export function generateBillReference(existingReferences: string[] = []): string {
  const year = new Date().getFullYear();
  const nextNumber =
    Math.max(
      0,
      ...existingReferences.map((reference) => {
        const match = reference.match(/^BILL-(\d{4})-(\d+)$/i);
        if (!match) return 0;
        return Number(match[2]);
      }),
    ) + 1;
  return `BILL-${year}-${String(nextNumber).padStart(4, "0")}`;
}

export function generateInvoiceNumber(existingReferences: string[] = []): string {
  const year = new Date().getFullYear();
  const usedReferences = new Set(
    existingReferences.map((reference) => reference.trim().toLowerCase()),
  );
  let nextNumber =
    Math.max(
      0,
      ...existingReferences.map((reference) => {
        const match = reference.trim().match(/^INV-(\d{4})-(\d+)$/i);
        return match && Number(match[1]) === year ? Number(match[2]) : 0;
      }),
    ) + 1;
  let candidate = `INV-${year}-${String(nextNumber).padStart(4, "0")}`;
  while (usedReferences.has(candidate.toLowerCase())) {
    nextNumber += 1;
    candidate = `INV-${year}-${String(nextNumber).padStart(4, "0")}`;
  }
  return candidate;
}
