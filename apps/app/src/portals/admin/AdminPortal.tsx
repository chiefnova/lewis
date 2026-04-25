import { PortalShell } from "../shared/PortalShell";

const adminNavItems = [
  { label: "Tenants", href: "/admin/tenants" },
  { label: "Compliance Watch", href: "/admin/compliance" },
  { label: "Audit Log", href: "/admin/audit-log" },
  { label: "Subprocessors", href: "/admin/subprocessors" },
  { label: "Support Access", href: "/admin/support-access" },
  { label: "Legal Content", href: "/admin/legal-content" },
  { label: "Settings", href: "/admin/settings" },
];

export function AdminPortal() {
  return (
    <PortalShell
      title="Internal Admin Portal"
      description="Corridor operations, compliance watch, support access, legal content, and audit shell."
      navItems={adminNavItems}
    />
  );
}
