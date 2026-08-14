/**
 * The agent grid and the footer.
 *
 * BORROWED FROM LANDR, AND WHAT WAS NOT
 * -------------------------------------
 * Their page ends in a wide multi-column link grid, a newsletter capture and a
 * legal bar, and it works: it gives a long page a floor instead of trailing
 * off. That structure is taken.
 *
 * What is NOT taken is the density. Their footer carries dozens of links —
 * comparison pages, calculators, guides — because those pages exist and earn
 * search traffic. Reproducing the *shape* with links to pages we have not
 * written would be thirty dead ends dressed as a company, which is the same
 * defect as the mock agent listings that were deleted from the marketplace tab:
 * a claim about the system with nothing behind it. So the columns here are
 * short, and every entry resolves to something real — a modal that opens, a
 * route that loads, or an address that receives mail.
 *
 * The agent grid above it is read from GET /capabilities, the same registry the
 * planner uses. It cannot list an agent this deployment does not run, which is
 * the property a hand-written feature grid loses the first time the two drift.
 */
import React, { useEffect, useState } from 'react';

import { type InstalledAgent } from '../../lib/api';
import type { FooterModalType } from './FooterModals';

/** Short labels, LANDR-length, mapped from the capability strings we publish. */
const CAPABILITY_LABEL: Record<string, string> = {
  'measures.mix': 'Mix QC',
  'scores.readiness': 'A&R',
  'writes.lyrics': 'Lyrics',
  'masters.track': 'Mastering',
  'splits.rights': 'Splits',
  'delivers.release': 'Delivery',
  'generates.full_track': 'Composition',
  'plans.growth': 'Growth',
};

function labelFor(capability: string): string {
  if (CAPABILITY_LABEL[capability]) return CAPABILITY_LABEL[capability];
  // Fall back to the capability's own last segment rather than inventing a
  // marketing name for something the registry added since this map was written.
  const tail = capability.split('.').pop() ?? capability;
  return tail.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase());
}

export const AgentGrid: React.FC = () => {
  const [agents, setAgents] = useState<InstalledAgent[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    // /api/capabilities, not the /api/gw proxy: this page has no session and
    // the proxy 401s without one, which is how the grid came to render nothing
    // in production while working locally against a signed-in browser.
    fetch('/api/capabilities')
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((d: { agents?: InstalledAgent[] }) => !cancelled && setAgents(d.agents ?? []))
      .catch(() => !cancelled && setError(true));
    return () => {
      cancelled = true;
    };
  }, []);

  // Anonymous visitors cannot read the registry — /capabilities needs a key. A
  // grid that renders nothing is better than one that renders a guess, so the
  // section simply does not appear rather than showing a plausible list.
  if (error || !agents || agents.length === 0) return null;

  const cards = agents.flatMap((agent) =>
    agent.capabilities.map((c) => ({
      key: `${agent.agent}:${c.capability}`,
      label: labelFor(c.capability),
      agent: agent.agent,
      capability: c.capability,
    })),
  );

  return (
    <section className="relative overflow-hidden border-y border-line py-16 sm:py-20">
      {/* Decoration, and only that. It carries no claim, which is why it can be
          generated: the checkable things on this page are numbers, and numbers
          never come from a picture. */}
      <img
        src="/media/console-metal.webp"
        alt=""
        aria-hidden="true"
        loading="lazy"
        className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-25"
      />
      <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-r from-bg via-bg/85 to-bg/40" />
      <div className="relative mx-auto max-w-[1600px] px-5 sm:px-8">
        <h2 className="font-headline text-[clamp(1.75rem,3.4vw,2.75rem)] font-bold leading-[1.02] tracking-[-0.03em]">
          What's in the room
        </h2>
        <p className="mt-3 max-w-xl text-muted">
          {agents.length} agents, live in this deployment. Read from the registry, not a brochure.
        </p>
        <ul className="mt-8 grid gap-px overflow-hidden rounded-xl border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
          {cards.map((c) => (
            <li key={c.key} className="bg-bg p-5 transition-colors hover:bg-panel">
              <div className="font-headline text-base font-bold">{c.label}</div>
              <div className="mt-1 font-mono text-[11px] text-dim">{c.capability}</div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
};

/** One footer column. Entries are either a modal or a real href — never both. */
interface FooterLink {
  label: string;
  modal?: FooterModalType;
  href?: string;
}

const COLUMNS: { head: string; links: FooterLink[] }[] = [
  {
    head: 'Product',
    links: [
      { label: 'Open the console', href: '/?app' },
      { label: 'What it refuses to do', href: '#refusals' },
      { label: 'A measured run', href: '#proof' },
    ],
  },
  {
    head: 'How it works',
    links: [
      { label: 'Five stages, five decisions', href: '#stages' },
      { label: 'Evidence, not confidence', href: '#evidence' },
    ],
  },
  {
    head: 'Legal',
    links: [
      { label: 'AI disclosure', modal: 'ai-disclosure' },
      { label: 'Privacy', modal: 'privacy' },
      { label: 'Your rights in your work', modal: 'rights' },
      { label: 'Contact', modal: 'contact' },
    ],
  },
];

export const SiteFooter: React.FC<{ onOpenModal: (m: FooterModalType) => void }> = ({
  onOpenModal,
}) => (
  <footer className="border-t border-line bg-panel/20">
    <div className="mx-auto max-w-[1600px] px-5 py-14 sm:px-8 sm:py-16">
      <div className="grid gap-10 md:grid-cols-[1.4fr_2fr]">
        <div>
          <div className="font-headline text-xl font-bold tracking-tight">GHARANA</div>
          <p className="mt-2 max-w-sm text-[13px] leading-relaxed text-muted">
            The label you never signed with.
          </p>
          {/* No newsletter field. LANDR's earns its place because there is a
              list behind it; a form that posts nowhere is a lie with an input
              attached, and this page argues against exactly that. It goes in
              the day the list exists. */}
        </div>

        <nav className="grid gap-8 sm:grid-cols-3">
          {COLUMNS.map((col) => (
            <div key={col.head}>
              <h3 className="font-mono text-[10px] uppercase tracking-[0.14em] text-dim">
                {col.head}
              </h3>
              <ul className="mt-3 space-y-2">
                {col.links.map((link) => (
                  <li key={link.label}>
                    {link.modal ? (
                      <button
                        type="button"
                        onClick={() => onOpenModal(link.modal as FooterModalType)}
                        className="text-left text-[13px] text-muted transition-colors hover:text-ink"
                      >
                        {link.label}
                      </button>
                    ) : (
                      <a
                        href={link.href}
                        className="text-[13px] text-muted transition-colors hover:text-ink"
                      >
                        {link.label}
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
      </div>

      <div className="mt-12 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-6">
        <span className="font-mono text-[11px] text-dim">
          GHARANA © {new Date().getFullYear()}
        </span>
        <span className="font-mono text-[11px] text-dim">
          Audio on this page is AI-generated and labelled as such — EU AI Act Article 50.
        </span>
      </div>
    </div>
  </footer>
);
