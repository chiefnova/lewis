import { PortalShell } from "../shared/PortalShell";

const manufacturerNavItems = [
  { label: "Programs", href: "/manufacturer/programs" },
  { label: "ETC Network", href: "/manufacturer/etc-network" },
  { label: "Patients", href: "/manufacturer/patients" },
  { label: "Adverse Events", href: "/manufacturer/adverse-events" },
  { label: "Reports", href: "/manufacturer/reports" },
  { label: "Billing", href: "/manufacturer/billing" },
  { label: "Settings", href: "/manufacturer/settings" },
];

export function ManufacturerPortal() {
  return (
    <PortalShell
      title="Manufacturer / Biotech Manufacturer Portal"
      description="Program, ETC network, safety, reporting, billing, and manufacturer operations shell."
      navItems={manufacturerNavItems}
    />
  );
}
