/**
 * The four things a visitor is entitled to read before signing up.
 *
 * Deliberately plain and deliberately short. Each states what the system
 * actually does — the disclosure it writes, the ledger it appends to, what it
 * stores — because all of that is checkable in the code, and a policy page that
 * over-claims is the same defect as an agent that over-claims.
 *
 * These are NOT legal documents. They describe behaviour; counsel writes the
 * terms. The distinction is stated in the text rather than left for someone to
 * assume the wrong way round.
 */
import React from 'react';
import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export type FooterModalType = 'ai-disclosure' | 'rights' | 'privacy' | 'contact' | null;

const CONTENT: Record<
  Exclude<FooterModalType, null>,
  { title: string; body: React.ReactNode }
> = {
  'ai-disclosure': {
    title: 'AI disclosure',
    body: (
      <>
        <p>
          Where a release has AI involvement, GHARANA records it per component — lyrics, melody,
          arrangement, vocals, mixing, mastering — rather than as a single flag on the track.
        </p>
        <p>
          That distinction carries into the DDEX ERN message as <code>ContainsAI</code> with the
          per-contributor detail beside it, because <em>All</em>, <em>Partly</em> and <em>None</em>{' '}
          are three different statements and a distributor is entitled to the right one.
        </p>
        <p>
          The EU AI Act’s Article 50 transparency duties have been enforceable since 2 August 2026.
          We do not declare on an artist’s behalf: if the disclosure is incomplete, delivery is
          refused rather than guessed.
        </p>
      </>
    ),
  },
  rights: {
    title: 'Rights and splits',
    body: (
      <>
        <p>
          A split sheet is accepted only when the shares total 100% and every party is named. An
          unnamed party is not an empty list — it is worse — so both are rejected.
        </p>
        <p>
          Every change appends to a hash-chained ledger. Rows cannot be edited or deleted; the
          database enforces that with triggers, not with a convention. A later correction is a new
          event that supersedes the old one, and both remain readable.
        </p>
        <p>
          GHARANA is not a distributor, a PRO or a publisher, and does not take a share of your
          rights. It prepares what those parties need.
        </p>
      </>
    ),
  },
  privacy: {
    title: 'What we store',
    body: (
      <>
        <p>
          Your audio, the measurements taken from it, the findings agents produced, and the record
          of what you approved. Each artist’s rows are readable only with that artist’s key —
          enforced in the database by row-level security, so a bug in an API handler cannot widen
          it.
        </p>
        <p>
          Audio is sent to the model providers configured for your deployment only where a stage
          requires it. Which providers those are is configuration you can read, not a fixed list.
        </p>
        <p>This describes current behaviour and is not a privacy notice; counsel writes that.</p>
      </>
    ),
  },
  contact: {
    title: 'Getting in touch',
    body: (
      <>
        <p>
          GHARANA is in closed beta. If you make music and want an account, or you are a
          distributor, PRO or label wanting to see the delivery format, write to us.
        </p>
        <p className="font-mono text-sm">hello@gharana.app</p>
        <p>
          Bug reports are welcome and useful — particularly any case where an agent stated
          something it could not point at. That is the failure we most want to hear about.
        </p>
      </>
    ),
  },
};

export const FooterModals: React.FC<{
  active: FooterModalType;
  onClose: () => void;
}> = ({ active, onClose }) => {
  // Escape closes. A modal that traps a visitor on a marketing page is a
  // special kind of rude.
  React.useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [active, onClose]);

  return (
    <AnimatePresence>
      {active && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-end justify-center bg-bg/80 p-4 backdrop-blur-sm sm:items-center"
          onClick={onClose}
          role="dialog"
          aria-modal="true"
          aria-label={CONTENT[active].title}
        >
          <motion.div
            initial={{ y: 24, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 12, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 320, damping: 30 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg rounded-[var(--radius-lg)] border border-line-strong bg-panel"
          >
            <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
              <h2 className="font-headline text-sm font-bold">{CONTENT[active].title}</h2>
              <button
                onClick={onClose}
                aria-label="Close"
                className="text-dim transition-colors hover:text-ink"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-3 px-5 py-5 text-[13px] leading-relaxed text-muted [&_code]:font-mono [&_code]:text-accent">
              {CONTENT[active].body}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
