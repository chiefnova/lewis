import { useEffect, useId, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { FormattedMessage } from "react-intl";

/**
 * Slice 4 § 10.1 — grouped nav disclosure for the condensed TopNav.
 *
 * The desktop header keeps the patient path flat (Conditions / Browse / ETCs)
 * and folds the professional + company clusters into two of these dropdowns,
 * so every footer destination (minus Legal) is reachable in ≤2 clicks without
 * 10 flat links crowding the bar.
 *
 * WAI-ARIA disclosure pattern (not role="menu" — these are navigation links,
 * not application commands): a button toggles `aria-expanded` on a panel of
 * <Link>s. ESC closes and returns focus to the trigger; click-outside closes;
 * focus moves to the first link on open. The trigger lights up (data-active)
 * when the current route matches any child link.
 */

export interface NavDropdownLink {
  to: string;
  id: string;
  default: string;
}

interface NavDropdownProps {
  label: { id: string; default: string };
  links: ReadonlyArray<NavDropdownLink>;
  /** Current pathname — used for per-item + trigger active state. */
  currentPath: string;
}

export function NavDropdown({ label, links, currentPath }: NavDropdownProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const firstLinkRef = useRef<HTMLAnchorElement>(null);
  const menuId = useId();

  const isLinkActive = (to: string) => currentPath === to || currentPath.startsWith(`${to}/`);
  const groupActive = links.some((l) => isLinkActive(l.to));

  useEffect(() => {
    if (!open) return;
    firstLinkRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    const onPointer = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("mousedown", onPointer);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mousedown", onPointer);
    };
  }, [open]);

  return (
    <div className="topnav__dropdown" ref={rootRef}>
      <button
        type="button"
        ref={triggerRef}
        className="topnav__link topnav__link--secondary topnav__dropdown-trigger"
        aria-expanded={open}
        aria-controls={menuId}
        data-active={groupActive ? "true" : undefined}
        onClick={() => setOpen((v) => !v)}
      >
        <FormattedMessage id={label.id} defaultMessage={label.default} />
        <span className="topnav__dropdown-caret" aria-hidden="true">
          ▾
        </span>
      </button>
      {open && (
        <div id={menuId} className="topnav__dropdown-panel">
          {links.map((link, i) => (
            <Link
              key={link.to}
              to={link.to}
              ref={i === 0 ? firstLinkRef : undefined}
              className="topnav__dropdown-item"
              aria-current={isLinkActive(link.to) ? "page" : undefined}
              data-active={isLinkActive(link.to) ? "true" : undefined}
              onClick={() => setOpen(false)}
            >
              <FormattedMessage id={link.id} defaultMessage={link.default} />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
