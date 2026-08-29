// ─── Display formatters ────────────────────────────────────────────────

export const DATE_DISPLAY_FORMAT = new Intl.DateTimeFormat("en-US", {
  year: "numeric",
  month: "short",
  day: "numeric",
});

export const DATETIME_DISPLAY_FORMAT = new Intl.DateTimeFormat("en-US", {
  year: "numeric",
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "numeric",
  hour12: false,
});

export const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

// ─── Parts helpers ─────────────────────────────────────────────────────

/**
 * Get the UTC calendar date components from a fixed-width ISO string
 * (e.g. "2025-03-15" or "2025-03-15T00:00:00Z"). Returns null when the
 * string does not begin with a YYYY-MM-DD date.
 */
export function utcDateParts(
  iso: string,
): { year: number; month: number; day: number } | null {
  const match = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return null;
  return { year: +match[1], month: +match[2], day: +match[3] };
}

export function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

// ─── Normalization ─────────────────────────────────────────────────────

export type DateInputKind =
  | "date"
  | "datetime"
  | "date-range"
  | "datetime-range";

export type FieldDateRangeValue = { from?: string; to?: string };

const ISO_DATE_RE =
  /^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}(?:\.\d{3})?(?:Z|[+-]\d{2}:\d{2})?)?$/;

function isValidISODate(input: string): boolean {
  return ISO_DATE_RE.test(input);
}

/**
 * Parse an ISO string and return the browser-local Date.
 * Z-terminated strings are UTC; bare strings are local.
 */
function parseAsLocal(input: string): Date | null {
  if (!isValidISODate(input)) return null;
  if (input.endsWith("Z")) return new Date(input);
  // no-Z means local wall-clock
  return new Date(input);
}

/**
 * Format a Date as a fixed-width UTC ISO string with seconds, milliseconds truncated.
 */
function toFixedUTC(d: Date): string {
  // toISOString() → "2025-03-15T09:00:00.000Z"
  // Strip milliseconds: replace .000Z with Z
  return d.toISOString().replace(/\.\d{3}Z$/, "Z");
}

/**
 * Get the UTC calendar date components from a Date.
 */
function dateUtcDateParts(d: Date): { year: number; month: number; day: number } {
  return {
    year: d.getUTCFullYear(),
    month: d.getUTCMonth() + 1,
    day: d.getUTCDate(),
  };
}

/**
 * Emit a fixed-zero UTC-midnight string for a date kind.
 * "2025-03-15T00:00:00Z" — no timezone conversion.
 */
function emitDateFixedZero(input: string): string {
  // Bare YYYY-MM-DD → verbatim append T00:00:00Z
  if (DATE_ONLY_PATTERN.test(input)) {
    return `${input}T00:00:00Z`;
  }
  // Full ISO → parse, extract UTC calendar date, emit fixed-zero
  const d = parseAsLocal(input);
  if (!d || isNaN(d.getTime())) return "";
  const { year, month, day } = dateUtcDateParts(d);
  return `${year}-${pad2(month)}-${pad2(day)}T00:00:00Z`;
}

/**
 * Emit a fixed-width UTC ISO datetime string with seconds, milliseconds truncated.
 * Wall-clock input is interpreted as browser-local.
 */
function emitDatetimeFull(input: string): string {
  const d = parseAsLocal(input);
  if (!d || isNaN(d.getTime())) return "";
  return toFixedUTC(d);
}

/**
 * Normalize a single date input value per the field kind.
 * Returns the normalized ISO string, or undefined if invalid (with dev warning).
 */
function normalizeSingle(
  kind: "date" | "datetime",
  input: string,
  label?: string,
): string | undefined {
  if (input === "") {
    warnInvalid(label);
    return undefined;
  }

  const normalized =
    kind === "date" ? emitDateFixedZero(input) : emitDatetimeFull(input);

  if (!normalized) {
    warnInvalid(label);
    return undefined;
  }

  return normalized;
}

function warnInvalid(label?: string): void {
  if (process.env.NODE_ENV === "production") return;
  const where = label ? ` for "${label}"` : "";
  console.warn(`[Field] Invalid date input${where} — value ignored.`);
}

/**
 * Normalize a range value: both ends through the single-kind normalizer,
 * then swap if from > to (lexicographic string comparison is safe because
 * output is fixed-width).
 */
function normalizeRange(
  kind: "date" | "datetime",
  value: FieldDateRangeValue,
  label?: string,
): FieldDateRangeValue {
  const from = value.from !== undefined ? normalizeSingle(kind, value.from, label) : undefined;
  const to = value.to !== undefined ? normalizeSingle(kind, value.to, label) : undefined;

  // Swap if from > to (both must be present to compare)
  if (from !== undefined && to !== undefined && from > to) {
    return { from: to, to: from };
  }

  return { from, to };
}

/**
 * Normalize a date input value per the field kind.
 *
 * - Bare YYYY-MM-DD into date kind → verbatim T00:00:00Z
 * - No-Z strings → interpreted as local wall-clock, converted to UTC
 * - Z-terminated strings → taken as-is
 * - Invalid input → dev-only warning naming the field, returns undefined
 * - Range kinds normalize both ends and swap if out of order
 */
export function normalizeDateInput(
  kind: DateInputKind,
  value: string | FieldDateRangeValue,
  label?: string,
): string | FieldDateRangeValue | undefined {
  if (
    kind === "date-range" || kind === "datetime-range"
  ) {
    if (typeof value !== "object" || value === null) {
      warnInvalid(label);
      return undefined;
    }
    const singleKind = kind === "date-range" ? "date" : "datetime";
    return normalizeRange(singleKind, value, label);
  }

  if (typeof value !== "string") {
    warnInvalid(label);
    return undefined;
  }

  const singleKind = kind === "date" ? "date" : "datetime";
  return normalizeSingle(singleKind, value, label);
}
