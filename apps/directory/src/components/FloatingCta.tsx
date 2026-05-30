import type { ReactNode } from "react";
import { Link } from "react-router-dom";

type FloatingCtaProps =
  | {
      lead: ReactNode;
      label: ReactNode;
      to: string;
      href?: never;
    }
  | {
      lead: ReactNode;
      label: ReactNode;
      href: string;
      to?: never;
    };

export function FloatingCta(props: FloatingCtaProps) {
  const action =
    "to" in props ? (
      <Link className="directory-floating-cta__action" to={props.to}>
        {props.label}
      </Link>
    ) : (
      <a className="directory-floating-cta__action" href={props.href}>
        {props.label}
      </a>
    );

  return (
    <div className="directory-floating-cta">
      <span className="directory-floating-cta__lead">{props.lead}</span>
      {action}
    </div>
  );
}
