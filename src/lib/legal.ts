/**
 * The entity facts every legal page needs, in exactly one place.
 *
 * WHY THESE ARE EMPTY
 * -------------------
 * A privacy policy naming the wrong company, or a grievance page naming an
 * officer who does not exist, is worse than having no page at all: it is a
 * published statement of fact about a real legal entity, and it is wrong. So
 * none of these were invented.
 *
 * While they are empty the pages render a visible "not published yet" banner
 * and every unset value shows as a red [not set] marker, so a placeholder can
 * never be mistaken for a policy. `scripts/check-legal.mjs` reports what is
 * missing on every CI run, and the same script with --strict fails outright —
 * run that in the deploy workflow on the day these are meant to be relied on.
 *
 * Fill them from the incorporation documents, not from memory. The CIN in
 * particular is on the certificate of incorporation and nowhere else that is
 * safe to copy from.
 *
 * WHAT EACH ONE IS FOR — the obligation, not the convention
 * --------------------------------------------------------
 * `legalName`, `cin`, `registeredOffice`, `phone`, `email`
 *     Companies Act 2013, section 12(3)(c): a company must publish its name,
 *     registered office address, CIN, telephone and email on its official
 *     publications. A website is one.
 *
 * `grievanceOfficer`
 *     Information Technology (Intermediary Guidelines and Digital Media Ethics
 *     Code) Rules 2021, rule 3(2)(a): the name and contact details of the
 *     Grievance Officer must be published, along with the mechanism by which a
 *     user may complain. This is the obligation people most often miss, and it
 *     is the one with a named human attached.
 *
 * `dataProtectionContact`
 *     Digital Personal Data Protection Act 2023: a Data Fiduciary must publish
 *     the contact details of the person able to answer a Data Principal's
 *     questions about the processing of their personal data. For a Significant
 *     Data Fiduciary this must be a Data Protection Officer based in India; for
 *     everyone else it is whoever actually answers.
 *
 * NOT LEGAL ADVICE
 * ----------------
 * This file and the pages built on it were written by an engineer, not a
 * lawyer, from the rules named above. They are a structure to be reviewed and
 * corrected by counsel before they go live, and the jurisdiction assumed
 * throughout is India, with Telangana courts.
 */

export interface LegalEntity {
  /** Exactly as on the certificate of incorporation. */
  legalName: string;
  /** Corporate Identity Number, 21 characters. */
  cin: string;
  registeredOffice: string;
  phone: string;
  email: string;
  /** IT Rules 2021 rule 3(2)(a) — a named person, not a role inbox. */
  grievanceOfficer: { name: string; email: string };
  /** DPDP Act 2023 — who answers a Data Principal. */
  dataProtectionContact: { name: string; email: string };
  /** Where disputes are heard. Hyderabad for a Telangana-registered company. */
  courts: string;
  /** ISO date the current text took effect. */
  effectiveDate: string;
  /**
   * Where the corporate identity actually lives.
   *
   * GHARANA is a product; the company behind it is the parent, and its
   * registered particulars belong on the parent's own portal rather than being
   * restated here where two copies can disagree. These pages point there for
   * anything about the entity, and hold only what is specific to this service.
   */
  parentPortal: { name: string; url: string };
}

export const ENTITY: LegalEntity = {
  legalName: '',
  cin: '',
  registeredOffice: '',
  phone: '',
  email: '',
  grievanceOfficer: { name: '', email: '' },
  dataProtectionContact: { name: '', email: '' },
  courts: 'Hyderabad, Telangana',
  effectiveDate: '',
  parentPortal: { name: 'Skopaq AI', url: 'https://skopaq.ai' },
};

/** Every fact that is still blank. Empty list means the pages may ship. */
export function missingLegalFacts(entity: LegalEntity = ENTITY): string[] {
  const missing: string[] = [];
  const need: [string, string][] = [
    ['legalName', entity.legalName],
    ['cin', entity.cin],
    ['registeredOffice', entity.registeredOffice],
    ['phone', entity.phone],
    ['email', entity.email],
    ['grievanceOfficer.name', entity.grievanceOfficer.name],
    ['grievanceOfficer.email', entity.grievanceOfficer.email],
    ['dataProtectionContact.name', entity.dataProtectionContact.name],
    ['dataProtectionContact.email', entity.dataProtectionContact.email],
    ['courts', entity.courts],
    ['effectiveDate', entity.effectiveDate],
  ];
  for (const [key, value] of need) if (!value.trim()) missing.push(key);
  return missing;
}

/** The routes, and the obligation each one discharges. */
export const LEGAL_ROUTES = [
  {
    path: '/terms',
    title: 'Terms of Use',
    obligation: 'IT Rules 2021, rule 3(1)(a) — the user agreement must be published',
  },
  {
    path: '/privacy',
    title: 'Privacy Policy',
    obligation: 'DPDP Act 2023, and SPDI Rules 2011 rule 4 under IT Act section 43A',
  },
  {
    path: '/grievance',
    title: 'Grievance Redressal',
    obligation: 'IT Rules 2021, rule 3(2)(a) — named officer, 24h acknowledgement, 15 days',
  },
  {
    path: '/refunds',
    title: 'Refunds & Cancellation',
    obligation: 'Required by Indian payment aggregators before live payment collection',
  },
  {
    path: '/ai-disclosure',
    title: 'AI Disclosure',
    obligation: 'EU AI Act Article 50 for EU listeners; MeitY advisory, March 2024',
  },
  {
    path: '/contact',
    title: 'Contact',
    obligation: 'Companies Act 2013, section 12(3)(c) — identity and registered office',
  },
] as const;

export type LegalPath = (typeof LEGAL_ROUTES)[number]['path'];

export function isLegalPath(path: string): path is LegalPath {
  return LEGAL_ROUTES.some((r) => r.path === path);
}
