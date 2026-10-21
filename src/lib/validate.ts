/** Shared server-side input validation helpers. */

export function str(value: unknown, maxLen: number): string {
  return typeof value === "string" ? value.trim().slice(0, maxLen) : "";
}

export function optStr(value: unknown, maxLen: number): string | null {
  const s = str(value, maxLen);
  return s.length > 0 ? s : null;
}

export function int(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.trunc(value);
  }
  if (typeof value === "string" && value.trim() !== "") {
    const n = Number(value);
    if (Number.isFinite(n)) return Math.trunc(n);
  }
  return null;
}

export function isPhone(value: string): boolean {
  // Tanzanian-friendly: 9-15 digits, optional +, spaces or dashes allowed.
  return /^\+?[0-9][0-9\s-]{7,18}$/.test(value);
}

export function isIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}

export function isPeriodMonth(value: string): boolean {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(value)) return false;
  return true;
}

export const PAYMENT_METHOD_VALUES = new Set([
  "cash",
  "mpesa",
  "tigopesa",
  "airtel",
  "bank",
  "other",
]);

export function isPaymentMethod(value: string): boolean {
  return PAYMENT_METHOD_VALUES.has(value);
}

export const TENANT_STATUSES = new Set(["active", "moved_out"]);
export const ROOM_STATUSES = new Set(["empty", "occupied"]);

export function tooLong(value: string, max: number): boolean {
  return value.length > max;
}
