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

export type CsvInviteeRow = {
  phone: string;
  inviteeName?: string;
};

function splitCsvLine(line: string): string[] {
  return line.split(/[,;]/).map((cell) => cell.trim());
}

function isNameHeader(header: string): boolean {
  const normalized = header.trim().toLowerCase();
  return (
    normalized === "name" ||
    normalized === "full name" ||
    normalized === "invitee name"
  );
}

function isPhoneHeader(header: string): boolean {
  const normalized = header.trim().toLowerCase();
  return (
    normalized === "phone" ||
    normalized === "phone number" ||
    normalized === "mobile" ||
    normalized === "tel" ||
    normalized === "telephone"
  );
}

function looksLikeLegacyHeaderRow(line: string): boolean {
  const firstColumn = line.split(/[,;]/)[0]?.trim() ?? "";
  return (
    /phone|mobile|number|tel/i.test(line) &&
    !/^\+?\d/.test(firstColumn)
  );
}

function detectHeaderColumns(
  headers: string[]
): { nameIndex: number; phoneIndex: number } | null {
  let nameIndex = -1;
  let phoneIndex = -1;

  for (let i = 0; i < headers.length; i++) {
    const header = headers[i] ?? "";
    if (isNameHeader(header)) {
      nameIndex = i;
    } else if (isPhoneHeader(header)) {
      phoneIndex = i;
    }
  }

  if (nameIndex >= 0 && phoneIndex >= 0) {
    return { nameIndex, phoneIndex };
  }

  return null;
}

function normalizeInviteeRow(
  rawPhone: string,
  rawName: string | undefined,
  rowNumber: number
): CsvInviteeRow {
  const phoneInput = rawPhone.trim();
  if (!phoneInput) {
    throw new Error(`Row ${rowNumber}: Phone number is required`);
  }

  const normalized = normalizePhone(phoneInput);
  if (!isValidE164(normalized)) {
    throw new Error(`Row ${rowNumber}: Invalid phone number: ${phoneInput}`);
  }

  const inviteeName = rawName?.trim();
  return inviteeName
    ? { phone: normalized, inviteeName }
    : { phone: normalized };
}

export function parseCsvInvitees(csvContent: string): CsvInviteeRow[] {
  const lines = csvContent.split(/\r?\n/).filter((line) => line.trim());
  if (lines.length === 0) {
    return [];
  }

  const firstLine = lines[0]!;
  const headerColumns = detectHeaderColumns(splitCsvLine(firstLine));

  const invitees: CsvInviteeRow[] = [];
  const seen = new Set<string>();

  if (headerColumns) {
    const { nameIndex, phoneIndex } = headerColumns;

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      if (!line?.trim()) continue;

      const columns = splitCsvLine(line);
      const rowNumber = i + 1;
      const row = normalizeInviteeRow(
        columns[phoneIndex] ?? "",
        columns[nameIndex],
        rowNumber
      );

      if (seen.has(row.phone)) {
        continue;
      }

      seen.add(row.phone);
      invitees.push(row);
    }

    return invitees;
  }

  let startIndex = 0;
  if (looksLikeLegacyHeaderRow(firstLine)) {
    startIndex = 1;
  }

  for (let i = startIndex; i < lines.length; i++) {
    const line = lines[i];
    if (!line?.trim()) continue;

    const columns = splitCsvLine(line);
    const rowNumber = i + 1;
    const row = normalizeInviteeRow(columns[0] ?? "", undefined, rowNumber);

    if (seen.has(row.phone)) {
      continue;
    }

    seen.add(row.phone);
    invitees.push(row);
  }

  return invitees;
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
  return parseCsvInvitees(csvContent).map((invitee) => invitee.phone);
}
