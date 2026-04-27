import { PortalShell } from "../shared/PortalShell";

const etcNavItems = [
  { label: "Dashboard", href: "/etc/dashboard" },
  { label: "Licensure", href: "/etc/licensure" },
  { label: "Patients", href: "/etc/patients" },
  { label: "Staff", href: "/etc/staff" },
  { label: "P&P Manual", href: "/etc/pp-manual" },
  { label: "ETRB", href: "/etc/etrb" },
  { label: "QAPI", href: "/etc/qapi" },
  { label: "Drug Inventory", href: "/etc/drug-inventory" },
  { label: "Adverse Events", href: "/etc/adverse-events" },
  { label: "HFAR", href: "/etc/hfar" },
  { label: "Compliance", href: "/etc/compliance" },
  { label: "Messages", href: "/etc/messages" },
  { label: "Settings", href: "/etc/settings" },
];

export function EtcPortal() {
  return (
    <PortalShell
      title="ETC Portal"
      description="Licensure, operations, clinical review, compliance, treatment, and safety shell."
      navItems={etcNavItems}
    />
  );
}
