import { Link } from "react-router-dom";
import { FormattedMessage } from "react-intl";

/**
 * Slice 4 § 10.2 — Footer restructure per locked Variant B.
 *
 * Five-column layout (PATIENTS / CLINICIANS / PARTNERS / COMPANY / LEGAL) +
 * non-negotiable bottom-bar trust signal that establishes Lewis's
 * independence on every page.
 */

interface FooterColumn {
  heading: { id: string; default: string };
  links: ReadonlyArray<{ to: string; id: string; default: string }>;
}

const COLUMNS: ReadonlyArray<FooterColumn> = [
  {
    heading: { id: "directory.footer.col.patients", default: "Patients" },
    links: [
      { to: "/browse", id: "directory.footer.patients.browse", default: "Browse treatments" },
      { to: "/conditions", id: "directory.footer.patients.conditions", default: "Conditions" },
      { to: "/etcs", id: "directory.footer.patients.etcs", default: "ETCs" },
    ],
  },
  {
    heading: { id: "directory.footer.col.clinicians", default: "Clinicians" },
    links: [
      {
        to: "/for-clinicians",
        id: "directory.footer.clinicians.overview",
        default: "For clinicians",
      },
      {
        to: "/for-clinicians",
        id: "directory.footer.clinicians.briefs",
        default: "Clinical briefs",
      },
    ],
  },
  {
    heading: { id: "directory.footer.col.partners", default: "Partners" },
    links: [
      {
        to: "/for-manufacturers",
        id: "directory.footer.partners.manufacturers",
        default: "For manufacturers",
      },
      { to: "/for-etcs", id: "directory.footer.partners.etcs", default: "For ETCs" },
      { to: "/platform", id: "directory.footer.partners.platform", default: "Operating platform" },
    ],
  },
  {
    heading: { id: "directory.footer.col.company", default: "Company" },
    links: [
      { to: "/about", id: "directory.footer.company.about", default: "About" },
      { to: "/how-it-works", id: "directory.footer.company.how", default: "How it works" },
      { to: "/faq", id: "directory.footer.company.faq", default: "Frequently asked" },
    ],
  },
  {
    heading: { id: "directory.footer.col.legal", default: "Legal" },
    links: [
      { to: "/privacy", id: "directory.footer.legal.privacy", default: "Privacy" },
      { to: "/terms", id: "directory.footer.legal.terms", default: "Terms" },
      { to: "/cookies", id: "directory.footer.legal.cookies", default: "Cookies" },
      { to: "/feedback", id: "directory.footer.legal.feedback", default: "Share feedback" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="foot">
      <div className="foot__inner">
        <div className="foot__brand">
          <span className="serif foot__brand-primary">Lewis.</span>
          <span className="serif foot__brand-secondary italic">health</span>
        </div>

        <div className="foot__cols">
          {COLUMNS.map((col) => (
            <div key={col.heading.id} className="foot__col">
              <h4 className="foot__col-heading">
                <FormattedMessage id={col.heading.id} defaultMessage={col.heading.default} />
              </h4>
              <ul className="foot__col-list">
                {col.links.map((link) => (
                  <li key={`${link.id}-${link.to}`}>
                    <Link to={link.to} className="foot__col-link">
                      <FormattedMessage id={link.id} defaultMessage={link.default} />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="foot__bar">
          <FormattedMessage
            id="directory.footer.trust"
            defaultMessage="© {year} Lewis Health · Independent directory and operating platform · Not affiliated with any manufacturer or ETC. Information sourced from Montana DPHHS public records and licensed program operators."
            values={{ year: new Date().getFullYear() }}
          />
        </div>
      </div>
    </footer>
  );
}
