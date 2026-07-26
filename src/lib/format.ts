// Budget and price fields are free text — the AI may capture "2850000",
// "2.85m", "₪2,850,000" or "around 3000000". This adds thousands separators to
// bare digit runs for display only, leaving currency symbols, words and
// already-formatted numbers untouched. Stored values are never rewritten.

export function withSeparators(value: string | null | undefined): string {
  if (!value) return "";
  // Only group runs of 4+ digits that aren't already separated by , or .
  return value.replace(/\d{4,}/g, (run, offset: number, full: string) => {
    const before = full[offset - 1];
    const after = full[offset + run.length];
    // Skip if it sits inside an already-formatted or decimal number,
    // or looks like a phone number / year fragment glued to other digits.
    if (before === "," || before === "." || after === "," || after === ".") return run;
    return Number(run).toLocaleString("en-US");
  });
}
