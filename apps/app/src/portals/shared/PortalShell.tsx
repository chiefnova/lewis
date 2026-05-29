import { Link } from "react-router-dom";

type PortalShellProps = {
  title: string;
  description: string;
  navItems: Array<{ label: string; href: string }>;
};

export function PortalShell({ title, description, navItems }: PortalShellProps) {
  return (
    <main className="app-shell">
      <nav aria-label="Primary">
        <Link to="/manufacturer">Manufacturer</Link>
        <Link to="/etc">ETC</Link>
        <Link to="/admin">Internal Admin</Link>
      </nav>
      <section>
        <h1>{title}</h1>
        <p>{description}</p>
        <ul aria-label={`${title} sections`}>
          {navItems.map((item) => (
            <li key={item.href}>
              <Link to={item.href}>{item.label}</Link>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
