import { forwardRef, type AnchorHTMLAttributes, type ButtonHTMLAttributes } from "react";

import { cn } from "../index";

export type ButtonVariant = "primary" | "outline" | "soft" | "accent";
export type ButtonSize = "sm" | "md" | "lg";

type CommonProps = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Render as a fully-rounded pill instead of the default 10px radius. */
  rounded?: boolean;
};

export type ButtonProps = CommonProps & ButtonHTMLAttributes<HTMLButtonElement>;

/**
 * Lewis primary button.
 *
 * - `variant="primary"` (default): solid Montana sky blue on paper. Standard CTA.
 * - `variant="outline"`: hairline ink border on transparent. Secondary action.
 * - `variant="soft"`: low-contrast ink-tinted background. Tertiary action.
 * - `variant="accent"`: alias for primary, kept for callsites that want to
 *   spell the brand intent explicitly. Visually identical today.
 *
 * Use `<ButtonLink>` for navigation actions that render an `<a>`.
 *
 * The visual styling lives in @lewis/ui/styles/buttons.css. This component
 * is a typed wrapper that composes the .pill class system. To add a new
 * variant, add the CSS class first, then extend the union type here.
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", size = "md", rounded, className, type = "button", ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={cn(
        "pill",
        variantClass(variant),
        sizeClass(size),
        rounded && "pill-rounded",
        className,
      )}
      {...props}
    />
  );
});

export type ButtonLinkProps = CommonProps & AnchorHTMLAttributes<HTMLAnchorElement>;

/**
 * Anchor variant of Button — for external links or react-router-dom <Link>
 * integration via the `as` prop pattern. For react-router-dom Links specifically,
 * prefer composition: `<Link to="/foo" className={buttonClasses({ variant: 'primary' })}>`.
 */
export const ButtonLink = forwardRef<HTMLAnchorElement, ButtonLinkProps>(function ButtonLink(
  { variant = "primary", size = "md", rounded, className, ...props },
  ref,
) {
  return (
    <a
      ref={ref}
      className={cn(
        "pill",
        variantClass(variant),
        sizeClass(size),
        rounded && "pill-rounded",
        className,
      )}
      {...props}
    />
  );
});

/**
 * Returns the className string for given button props. Use this when you need
 * to apply Lewis button styles to a non-button element (e.g. react-router
 * `<Link>`, a Clerk `<SignInButton>` child, or a Radix Slot child).
 *
 * Example:
 *   <Link to="/me" className={buttonClasses({ variant: "primary" })}>Go</Link>
 */
export function buttonClasses(opts: CommonProps & { className?: string } = {}): string {
  const { variant = "primary", size = "md", rounded, className } = opts;
  return cn("pill", variantClass(variant), sizeClass(size), rounded && "pill-rounded", className);
}

function variantClass(v: ButtonVariant): string {
  switch (v) {
    case "primary":
    case "accent":
      return "pill-primary";
    case "outline":
      return "pill-outline";
    case "soft":
      return "pill-soft";
  }
}

function sizeClass(s: ButtonSize): string | false {
  if (s === "sm") return "pill-sm";
  if (s === "lg") return "pill-lg";
  return false;
}
