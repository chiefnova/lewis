/* Web Crypto only — runs on Vercel Edge isolates. No Node `crypto` module. */

const enc = new TextEncoder();

async function importHmacKey(secret: string): Promise<CryptoKey> {
  return globalThis.crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
}

async function hmacHex(secret: string, message: string): Promise<string> {
  const key = await importHmacKey(secret);
  const sig = await globalThis.crypto.subtle.sign("HMAC", key, enc.encode(message));
  const bytes = new Uint8Array(sig);
  let out = "";
  for (let i = 0; i < bytes.length; i++) {
    out += (bytes[i] as number).toString(16).padStart(2, "0");
  }
  return out;
}

/* Constant-time string compare. Inputs of different length return false but in
 * constant time relative to the shorter input — adequate when both inputs are
 * fixed-length hex digests of the same hash. */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

export async function signCookie(secret: string, expiryMs: number): Promise<string> {
  const sig = await hmacHex(secret, String(expiryMs));
  return `${expiryMs}.${sig}`;
}

export type CookieVerifyResult = { ok: true; expiryMs: number } | { ok: false };

export async function verifyCookie(secret: string, value: string): Promise<CookieVerifyResult> {
  const dot = value.indexOf(".");
  if (dot <= 0 || dot === value.length - 1) return { ok: false };
  const expiryStr = value.slice(0, dot);
  const sig = value.slice(dot + 1);
  if (!/^\d+$/.test(expiryStr)) return { ok: false };
  const expiryMs = Number(expiryStr);
  if (!Number.isFinite(expiryMs)) return { ok: false };
  const expected = await hmacHex(secret, expiryStr);
  if (!timingSafeEqual(sig, expected)) return { ok: false };
  if (expiryMs <= Date.now()) return { ok: false };
  return { ok: true, expiryMs };
}

/* Compare submitted password to the expected password by HMAC-ing both sides
 * with the gate secret and comparing digests. Equal-length digests + XOR
 * accumulation = constant-time, and digesting hides input length. */
export async function verifyPassword(
  secret: string,
  submitted: string,
  expected: string,
): Promise<boolean> {
  const [a, b] = await Promise.all([hmacHex(secret, submitted), hmacHex(secret, expected)]);
  return timingSafeEqual(a, b);
}
