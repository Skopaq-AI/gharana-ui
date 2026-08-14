/**
 * The refusals, as a specification rather than a feature grid.
 *
 * WHY NOT CARDS
 * -------------
 * This was four icon cards in a bento grid, which is the single most
 * recognisable layout of the mid-2020s and now reads as "generated" wherever it
 * appears — the form said "AI SaaS template" while the content said something
 * unusually specific. The counter-move in current practice is a wall of type:
 * oversized numerals, hard rules, monospace, nothing decorative.
 *
 * It also happens to be the honest form for this content. These are not
 * features to be browsed and compared, they are constraints the system will not
 * break — closer to a datasheet's absolute-maximum-ratings table than to a
 * pricing page. A numbered list with a rule under each entry says "these are
 * clauses" in a way four rounded cards with icons cannot.
 */
import React from 'react';
import { motion, useReducedMotion } from 'motion/react';

const REFUSALS = [
  {
    n: '01',
    claim: 'Never invents a number',
    body: 'Narration is checked against the measurements the stage was given. A figure nothing produced fails the stage rather than reaching you.',
    enforced: 'libs/common/gharana_common/numeric_guard.py',
  },
  {
    n: '02',
    claim: 'Never approves on your behalf',
    body: 'Only the approve endpoint can mark a stage approved. No agent, retry, timeout or redo can advance one — audited on every observation the end-to-end gate takes.',
    enforced: 'constraint 3, 40 run snapshots per release',
  },
  {
    n: '03',
    claim: 'Never guesses a split',
    body: 'Shares total 100% and every party is named, or the sheet is rejected. Each change appends to a hash-chained ledger the database will not let anyone edit.',
    enforced: 'infra/postgres/migrations/0002_ai_provenance.sql',
  },
  {
    n: '04',
    claim: 'Never hides the AI',
    body: 'Disclosure is recorded per component — lyrics, melody, vocals, mixing — and travels into the DDEX message. Incomplete means delivery is refused, not guessed.',
    enforced: 'EU AI Act Article 50, enforceable since 2026-08-02',
  },
] as const;

export const Refusals: React.FC = () => {
  const reduced = useReducedMotion();

  return (
    <ol className="border-t border-line">
      {REFUSALS.map((r, i) => (
        <motion.li
          key={r.n}
          initial={reduced ? undefined : { y: 10 }}
          whileInView={reduced ? undefined : { y: 0 }}
          viewport={{ once: true, margin: '-40px' }}
          transition={{ duration: 0.45, delay: i * 0.04, ease: [0.16, 1, 0.3, 1] }}
          className="group border-b border-line"
        >
          <div className="mx-auto grid max-w-[1600px] gap-x-8 gap-y-2 px-5 py-8 sm:px-8 md:grid-cols-[5rem_minmax(0,22rem)_1fr] md:py-10">
            {/* The numeral, at a size that makes it structure rather than
                decoration. Dim by default so the claim leads. */}
            <span
              aria-hidden="true"
              className="font-mono text-3xl leading-none text-line-strong transition-colors group-hover:text-accent md:text-4xl"
            >
              {r.n}
            </span>

            <h3 className="font-headline text-xl font-bold leading-tight md:text-2xl">{r.claim}</h3>

            <div className="max-w-2xl">
              <p className="text-[15px] leading-relaxed text-muted">{r.body}</p>
              {/* Where it is enforced, not that it is. A claim about a
                  constraint should be checkable, which is the same standard the
                  agents are held to. */}
              <p className="mt-2 font-mono text-[11px] text-dim">{r.enforced}</p>
            </div>
          </div>
        </motion.li>
      ))}
    </ol>
  );
};
