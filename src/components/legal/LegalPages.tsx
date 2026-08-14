/**
 * The mandatory pages, at addressable URLs.
 *
 * These were modals. A modal cannot be linked, cannot be cited in an app-store
 * submission, cannot be sent to a regulator, and does not survive being
 * bookmarked — and every obligation below is an obligation to PUBLISH, which
 * means a URL.
 *
 * WHICH OBLIGATIONS, FOR AN INDIAN COMPANY
 * ----------------------------------------
 * The jurisdiction is India, the company is registered in Telangana, so:
 *
 *   IT Rules 2021, r.3(1)(a)   publish rules, privacy policy and user agreement
 *   IT Rules 2021, r.3(2)(a)   a NAMED grievance officer, 24h acknowledgement,
 *                              15 days to dispose of a complaint
 *   DPDP Act 2023              notice, consent, the Data Principal's rights,
 *                              and a contact who answers questions about
 *                              processing
 *   SPDI Rules 2011, r.4       a published privacy policy for sensitive
 *                              personal data, under IT Act s.43A
 *   Companies Act 2013 s.12(3)(c)  name, registered office, CIN, phone, email
 *                              on official publications
 *
 * WHAT IS DELIBERATELY NOT HERE
 * -----------------------------
 * Any company name, CIN, address or officer. Those live in src/lib/legal.ts,
 * unfilled, and this file renders a visible unpublished banner rather than a
 * plausible blank. A legal page that quietly omits the entity it binds is a
 * published statement that is wrong, which is worse than a page that says it
 * is not ready.
 *
 * NOT LEGAL ADVICE. Written by an engineer from the rules named above, to be
 * reviewed and corrected by counsel before anyone relies on it.
 */
import React from 'react';
import { ArrowLeft } from 'lucide-react';

import { ENTITY, LEGAL_ROUTES, missingLegalFacts, type LegalPath } from '../../lib/legal';

const missing = missingLegalFacts();
const READY = missing.length === 0;

/** A fact from the entity record, or a marker that cannot be mistaken for one. */
const Fact: React.FC<{ value: string; label: string }> = ({ value, label }) =>
  value.trim() ? (
    <span className="font-mono text-ink">{value}</span>
  ) : (
    <span
      className="rounded bg-[var(--blocking-bg)] px-1.5 py-0.5 font-mono text-[0.85em] text-blocking"
      title="Unfilled in src/lib/legal.ts"
    >
      [{label} not set]
    </span>
  );

const H: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <h2 className="mt-10 font-headline text-xl font-bold tracking-tight">{children}</h2>
);
const P: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <p className="mt-3 max-w-[68ch] leading-relaxed text-muted">{children}</p>
);
const Cite: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <p className="mt-2 font-mono text-[11px] text-dim">{children}</p>
);

const IDENTITY = (
  <>
    <H>Who this is</H>
    <div className="mt-3 grid gap-1.5 text-[15px] text-muted">
      <div>
        Company: <Fact value={ENTITY.legalName} label="legal name" />
      </div>
      <div>
        CIN: <Fact value={ENTITY.cin} label="CIN" />
      </div>
      <div>
        Registered office: <Fact value={ENTITY.registeredOffice} label="registered office" />
      </div>
      <div>
        Telephone: <Fact value={ENTITY.phone} label="phone" />
      </div>
      <div>
        Email: <Fact value={ENTITY.email} label="email" />
      </div>
    </div>
    <Cite>Companies Act 2013, section 12(3)(c)</Cite>
  </>
);

const BODIES: Record<LegalPath, React.ReactNode> = {
  '/terms': (
    <>
      <P>
        These terms govern your use of GHARANA. Using the service means you accept them. They are
        the user agreement that Indian intermediary rules require us to publish.
      </P>
      <Cite>IT Rules 2021, rule 3(1)(a)</Cite>

      <H>What the service does</H>
      <P>
        GHARANA runs automated agents over audio you upload — measuring loudness and true peak,
        scoring release readiness, proposing masters, recording splits, and preparing distribution
        metadata. Every stage stops for your approval. Nothing is released, published or delivered
        to a distributor without you approving that stage.
      </P>

      <H>Your material stays yours</H>
      <P>
        You keep every right in the audio, lyrics and artwork you upload. You grant us only the
        licence needed to run the service on your behalf — to store your files, process them, and
        show you the results. We do not train models on your material.
      </P>

      <H>What we generate, and what you must disclose</H>
      <P>
        Where an agent generates audio, lyrics or vocals, that fact is recorded per component and
        travels into the delivery metadata. You are responsible for the disclosures your
        distributor and the destination platforms require. We refuse to deliver a release whose AI
        disclosure is incomplete rather than guessing at it.
      </P>

      <H>What we do not do</H>
      <P>
        We are not a record label, a distributor, a publisher or a collecting society. We do not
        register your works with a PRO, and we do not act as your agent in any dealing with a third
        party.
      </P>

      <H>Liability</H>
      <P>
        The service is provided as it stands. To the extent Indian law permits, our aggregate
        liability is limited to the fees you paid us in the twelve months before the claim. Nothing
        here limits liability that cannot lawfully be limited.
      </P>

      <H>Governing law</H>
      <P>
        These terms are governed by the laws of India. Courts at <Fact value={ENTITY.courts} label="courts" />{' '}
        have exclusive jurisdiction.
      </P>
      {IDENTITY}
    </>
  ),

  '/privacy': (
    <>
      <P>
        This notice explains what personal data we collect, why, and what you can do about it. It is
        published under the Digital Personal Data Protection Act 2023 and the SPDI Rules made under
        section 43A of the Information Technology Act 2000.
      </P>
      <Cite>DPDP Act 2023 · SPDI Rules 2011, rule 4</Cite>

      <H>What we collect</H>
      <P>
        Account details you give us — name, email, and the artist profile you create. Audio and
        related files you upload. Records of what the service did with them: measurements, agent
        findings, approvals, and the times you gave them. Ordinary server logs, including IP
        address, kept for security and debugging.
      </P>

      <H>Why we process it</H>
      <P>
        To run the service you asked for, to keep an auditable record of which stages you approved,
        to meet legal obligations, and to secure the service. We do not sell personal data, and we
        do not use your uploaded material to train models.
      </P>

      <H>Your rights as a Data Principal</H>
      <P>
        You may ask for a summary of the personal data we hold about you and how it is processed;
        ask us to correct, complete or update it; ask us to erase it, subject to any retention the
        law requires; withdraw consent as easily as you gave it; and nominate someone to exercise
        these rights if you die or become incapacitated. To exercise any of them, write to the
        contact below, or use the grievance route if you are not satisfied.
      </P>
      <Cite>DPDP Act 2023, sections 11 to 14</Cite>

      <H>Who answers questions about your data</H>
      <div className="mt-3 grid gap-1.5 text-[15px] text-muted">
        <div>
          Name: <Fact value={ENTITY.dataProtectionContact.name} label="data protection contact" />
        </div>
        <div>
          Email: <Fact value={ENTITY.dataProtectionContact.email} label="data protection email" />
        </div>
      </div>

      <H>Retention</H>
      <P>
        We keep your material while your account is open and for as long afterwards as we must to
        meet legal and accounting obligations. Rights and splits records are kept as an append-only
        ledger: entries cannot be edited or removed, because a splits history that can be rewritten
        is not evidence of anything.
      </P>
      {IDENTITY}
    </>
  ),

  '/grievance': (
    <>
      <P>
        If something about this service has gone wrong — your data, your content, someone else's
        content, or the service itself — this is the route, and a named person is responsible for
        answering.
      </P>
      <Cite>IT Rules 2021, rule 3(2)(a) · Consumer Protection (E-Commerce) Rules 2020</Cite>

      <H>Grievance Officer</H>
      <div className="mt-3 grid gap-1.5 text-[15px] text-muted">
        <div>
          Name: <Fact value={ENTITY.grievanceOfficer.name} label="grievance officer" />
        </div>
        <div>
          Email: <Fact value={ENTITY.grievanceOfficer.email} label="grievance email" />
        </div>
        <div>
          Address: <Fact value={ENTITY.registeredOffice} label="registered office" />
        </div>
      </div>

      <H>What happens, and by when</H>
      <P>
        We acknowledge your complaint within <strong className="text-ink">24 hours</strong> of
        receiving it, and dispose of it within <strong className="text-ink">15 days</strong> of
        receipt. Those two timelines are the ones the rules set; they are not targets we chose.
      </P>
      <Cite>IT Rules 2021, rule 3(2)(a)(i)</Cite>

      <H>What to include</H>
      <P>
        Your name and how to reach you, what happened and when, the project or release it concerns,
        and what you would like done. If your complaint is about content, tell us where it is.
      </P>
      {IDENTITY}
    </>
  ),

  '/refunds': (
    <>
      <P>
        What you can get back, and when. Published because Indian payment aggregators require a
        stated refund and cancellation policy before a business may collect payments.
      </P>

      <H>Cancelling</H>
      <P>
        You can cancel a subscription at any time. It stays active until the end of the period you
        have paid for, and does not renew after that. We do not pro-rate the remainder of a period
        already begun.
      </P>

      <H>Refunds</H>
      <P>
        If the service did not do what it says — a run that failed and could not be completed, or a
        charge for something you did not receive — write to us and we will refund it. Approved
        refunds are returned to the original payment method, normally within 7 to 10 working days,
        depending on your bank.
      </P>

      <H>What is not refundable</H>
      <P>
        Compute already spent on runs you approved. When an agent has generated audio or run an
        analysis at your instruction, that work has been done and paid for downstream. This is why
        every stage stops for approval before it spends anything.
      </P>
      {IDENTITY}
    </>
  ),

  '/ai-disclosure': (
    <>
      <P>
        Where this service uses AI, and how that travels with your release. Published for listeners
        and platforms in the EU under Article 50 of the AI Act, and in line with the Ministry of
        Electronics and Information Technology advisory of March 2024.
      </P>

      <H>What is generated, and what is measured</H>
      <P>
        Two different things happen here and they are never mixed. Measurements — loudness, true
        peak, duration — are computed from your audio by signal processing, not by a model. Text and
        audio generation, where you ask for it, is done by named third-party models. A number on
        this service came from an analyser; if it did not, it is not shown.
      </P>

      <H>Recorded per component</H>
      <P>
        Disclosure is recorded separately for lyrics, melody, vocals and mixing, along with the
        model, its version, and the licence position of the weights. That record travels into the
        DDEX message your distributor receives. Where the disclosure is incomplete, delivery is
        refused rather than inferred.
      </P>

      <H>Audio on this website</H>
      <P>
        The music you can hear on our own pages is AI-generated and labelled as such.
      </P>
      {IDENTITY}
    </>
  ),

  '/contact': (
    <>
      <P>How to reach a person here.</P>
      {IDENTITY}

      <H>For complaints</H>
      <P>
        Use the grievance route rather than general email — it has a named officer and a clock
        attached. <a className="text-accent underline" href="/grievance">Grievance Redressal</a>
      </P>

      <H>For questions about your personal data</H>
      <div className="mt-3 grid gap-1.5 text-[15px] text-muted">
        <div>
          <Fact value={ENTITY.dataProtectionContact.name} label="data protection contact" />
        </div>
        <div>
          <Fact value={ENTITY.dataProtectionContact.email} label="data protection email" />
        </div>
      </div>
    </>
  ),
};

export const LegalPage: React.FC<{ path: LegalPath }> = ({ path }) => {
  const route = LEGAL_ROUTES.find((r) => r.path === path)!;

  return (
    <div className="min-h-screen bg-bg text-ink">
      <nav className="sticky top-0 z-40 border-b border-line bg-bg/85 backdrop-blur-xl">
        <div className="shell flex items-center justify-between py-3">
          <a href="/" className="flex items-baseline gap-2.5 no-underline">
            <span className="font-headline text-lg font-bold tracking-tight text-ink">GHARANA</span>
            <span className="hidden font-mono text-[11px] text-dim sm:inline">
              the label that shows its work
            </span>
          </a>
          <a
            href="/"
            className="flex items-center gap-1.5 font-mono text-[11px] text-muted transition-colors hover:text-ink"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> back
          </a>
        </div>
      </nav>

      <main className="shell py-14 sm:py-20">
        <h1 className="font-headline text-[clamp(2rem,4.5vw,3.25rem)] font-bold leading-[1.02] tracking-[-0.03em]">
          {route.title}
        </h1>
        <p className="mt-3 font-mono text-[11px] text-dim">{route.obligation}</p>
        {ENTITY.effectiveDate ? (
          <p className="mt-1 font-mono text-[11px] text-dim">
            In effect from {ENTITY.effectiveDate}
          </p>
        ) : null}

        {!READY && (
          // Visible, and deliberately alarming. The alternative — rendering the
          // policy with the company silently absent — is a published statement
          // about a legal entity that does not name it.
          //
          // These pages ARE linked from the footer and nav while unfilled, by
          // decision: the structure ships now and the particulars follow from
          // the parent portal. That makes this banner load-bearing rather than
          // belt-and-braces — it is the only thing standing between a
          // placeholder and someone reading it as policy.
          <div className="mt-8 rounded-xl border border-blocking/40 bg-[var(--blocking-bg)] p-5">
            <h2 className="font-headline text-sm font-bold text-blocking">
              This page is not published yet
            </h2>
            <p className="mt-2 max-w-[68ch] text-[13px] leading-relaxed text-muted">
              {missing.length} entity {missing.length === 1 ? 'fact is' : 'facts are'} still
              unfilled in <span className="font-mono">src/lib/legal.ts</span>, so this text does not
              yet name the company it binds. It is a draft for review by counsel, not a policy
              anyone may rely on. The corporate particulars will come from{' '}
              <a className="underline" href={ENTITY.parentPortal.url}>
                {ENTITY.parentPortal.name}
              </a>
              , the parent company portal.
            </p>
          </div>
        )}

        <article className="mt-4">{BODIES[path]}</article>

        <div className="mt-14 border-t border-line pt-6">
          <p className="font-mono text-[11px] leading-relaxed text-dim">
            Drafted from the Indian rules cited on each page. Not legal advice, and not reviewed by
            counsel. Jurisdiction: India, courts at {ENTITY.courts || '[courts not set]'}.
          </p>
          <nav className="mt-4 flex flex-wrap gap-x-5 gap-y-2">
            {LEGAL_ROUTES.filter((r) => r.path !== path).map((r) => (
              <a
                key={r.path}
                href={r.path}
                className="text-[13px] text-muted underline-offset-2 transition-colors hover:text-ink hover:underline"
              >
                {r.title}
              </a>
            ))}
          </nav>
        </div>
      </main>
    </div>
  );
};
