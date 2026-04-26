// Anonymous eligibility-screen session token persistence. Lives in localStorage
// only — no PHI. The token is opaque to the browser; the server-side
// anonymous_eligibility_screens table holds the answer key.
//
// Linkage to a Clerk user happens at /connect submission time via
// POST /v1/patient/account/link-anonymous-screen, which is the only
// semi-authenticated endpoint the directory calls.

const PREFIX = "lewis:eligibility:";

function key(programSlug: string) {
  return `${PREFIX}${programSlug}`;
}

export interface StoredScreen {
  token: string;
  startedAt: string; // ISO
  answers: Record<number, string>;
}

const isBrowser = typeof window !== "undefined";

export function getStoredScreen(programSlug: string): StoredScreen | null {
  if (!isBrowser) return null;
  try {
    const raw = window.localStorage.getItem(key(programSlug));
    if (!raw) return null;
    return JSON.parse(raw) as StoredScreen;
  } catch {
    return null;
  }
}

export function saveStoredScreen(programSlug: string, screen: StoredScreen): void {
  if (!isBrowser) return;
  try {
    window.localStorage.setItem(key(programSlug), JSON.stringify(screen));
  } catch {
    // Quota or disabled storage — silently no-op. The server-side session is
    // still authoritative; missing localStorage just means no resume across reloads.
  }
}

export function clearStoredScreen(programSlug: string): void {
  if (!isBrowser) return;
  try {
    window.localStorage.removeItem(key(programSlug));
  } catch {
    // ignore
  }
}

// Crypto-random token for development before the API is wired up. The real
// token will come from POST /v1/public/eligibility/:slug/start.
export function generateLocalToken(): string {
  if (isBrowser && "crypto" in window && "randomUUID" in window.crypto) {
    return window.crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}
