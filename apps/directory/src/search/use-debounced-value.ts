import { useEffect, useState } from "react";

/**
 * Debounces a value. Returns the input after `delayMs` of stability — i.e.
 * after `delayMs` has elapsed without the input changing. Used by the
 * search overlay so we issue a fetch on the user's pause, not on every
 * keystroke.
 */
export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const id = window.setTimeout(() => setDebounced(value), delayMs);
    return () => window.clearTimeout(id);
  }, [value, delayMs]);

  return debounced;
}
