/**
 * Normalize phone numbers to E.164 format.
 * Supports numbers with country code or defaults to +234 (Nigeria) for local formats.
 */
export function normalizePhone(raw: string, defaultCountryCode = "234"): string {
  let digits = raw.replace(/\D/g, "");

  if (digits.startsWith("0")) {
    digits = defaultCountryCode + digits.slice(1);
  }

  if (!digits.startsWith(defaultCountryCode) && digits.length <= 10) {
    digits = defaultCountryCode + digits;
  }

  return `+${digits}`;
}

export function isValidE164(phone: string): boolean {
  return /^\+[1-9]\d{6,14}$/.test(phone);
}

export function parsePhoneList(input: string): string[] {
  const lines = input
    .split(/[\n,;]+/)
    .map((line) => line.trim())
    .filter(Boolean);

  const phones: string[] = [];
  const seen = new Set<string>();

  for (const line of lines) {
    const normalized = normalizePhone(line);
    if (!isValidE164(normalized)) {
      throw new Error(`Invalid phone number: ${line}`);
    }
    if (!seen.has(normalized)) {
      seen.add(normalized);
      phones.push(normalized);
    }
  }

  return phones;
}

export function parseCsvPhones(csvContent: string): string[] {
  const lines = csvContent.split(/\r?\n/).filter(Boolean);
  const phones: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;

    // Skip header row if it looks like a header
    if (
      i === 0 &&
      /phone|mobile|number|tel/i.test(line) &&
      !/^\+?\d/.test(line.split(/[,;]/)[0]?.trim() ?? "")
    ) {
      continue;
    }

    const firstColumn = line.split(/[,;]/)[0]?.trim() ?? "";
    if (firstColumn) {
      phones.push(firstColumn);
    }
  }

  return parsePhoneList(phones.join("\n"));
}
