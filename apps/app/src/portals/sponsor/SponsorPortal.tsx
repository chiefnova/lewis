import { PortalShell } from "../shared/PortalShell";

const sponsorNavItems = [
  { label: "Programs", href: "/sponsor/programs" },
  { label: "ETC Network", href: "/sponsor/etc-network" },
  { label: "Patients", href: "/sponsor/patients" },
  { label: "Adverse Events", href: "/sponsor/adverse-events" },
  { label: "Reports", href: "/sponsor/reports" },
  { label: "Billing", href: "/sponsor/billing" },
  { label: "Settings", href: "/sponsor/settings" },
];

export function SponsorPortal() {
  return (
    <PortalShell
      title="Sponsor / Biotech Manufacturer Portal"
      description="Program, ETC network, safety, reporting, billing, and sponsor operations shell."
      navItems={sponsorNavItems}
    />
  );
}
