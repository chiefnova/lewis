const emailPattern = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const phonePattern = /\b(?:\+?1[-.\s]?)?(?:\(?\d{3}\)?[-.\s]?)\d{3}[-.\s]?\d{4}\b/g;
const ssnPattern = /\b\d{3}-\d{2}-\d{4}\b/g;
const isoDobPattern = /\b(?:19|20)\d{2}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01])\b/g;

export function redactPhi(input: string): string {
  return input
    .replace(emailPattern, "[REDACTED_EMAIL]")
    .replace(phonePattern, "[REDACTED_PHONE]")
    .replace(ssnPattern, "[REDACTED_SSN]")
    .replace(isoDobPattern, "[REDACTED_DATE]");
}

export function redactRecord<T extends Record<string, unknown>>(record: T): T {
  return Object.fromEntries(
    Object.entries(record).map(([key, value]) => {
      if (typeof value === "string") {
        return [key, redactPhi(value)];
      }
      return [key, value];
    }),
  ) as T;
}
