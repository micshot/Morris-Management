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

// Phone numbers arrive however the buyer typed them. Format for display only,
// inferring the country from the prefix:
//   +972 / 972…  -> Israeli international
//   0…           -> Israeli local (mobile 05x/07x, landline 02/03/04/08/09)
//   1… (11 digits) or 10 bare digits -> North American
// Anything unrecognised is returned untouched rather than mangled.
export function formatPhone(value: string | null | undefined): string {
  if (!value) return "";
  const raw = value.trim();
  const hadPlus = raw.startsWith("+");
  const d = raw.replace(/\D/g, "");
  if (d.length < 7) return raw;

  const il = (rest: string) => {
    // rest = national number without the leading 0.
    // Mobile (05x/07x) is 9 digits: 5x-xxx-xxxx. Landline is 8: x-xxx-xxxx.
    if (rest.length === 9 && /^[57]/.test(rest)) {
      return `${rest.slice(0, 2)}-${rest.slice(2, 5)}-${rest.slice(5)}`;
    }
    if (rest.length === 8) return `${rest.slice(0, 1)}-${rest.slice(1, 4)}-${rest.slice(4)}`;
    return rest;
  };

  // Israeli international
  if (d.startsWith("972")) {
    const rest = d.slice(3).replace(/^0/, "");
    const body = il(rest);
    return body === rest ? raw : `+972 ${body}`;
  }

  // Israeli local
  if (d.startsWith("0") && !d.startsWith("00")) {
    const rest = d.slice(1);
    const body = il(rest);
    return body === rest ? raw : `0${body}`;
  }

  // North American
  if (d.length === 11 && d.startsWith("1")) {
    const n = d.slice(1);
    return `+1 (${n.slice(0, 3)}) ${n.slice(3, 6)}-${n.slice(6)}`;
  }
  if (d.length === 10 && !hadPlus) {
    return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
  }

  return raw;
}
