/**
 * The five stages, as cards on a scroll-driven rail.
 *
 * The animation is making one argument: nothing moves without a human. The
 * playhead advances as you scroll, and at every stage it stops on a checkpoint
 * that has to be approved — so the thing the visitor does with their scroll
 * wheel is exactly what an artist does with the approve button. Constraint 3,
 * demonstrated rather than claimed.
 *
 * `motion`'s useScroll rather than CSS scroll-timeline: at ~84% support and
 * still behind a flag in Firefox stable, animation-timeline is not Baseline in
 * 2026, and the finished state here IS the animation — there is nothing to
 * progressively enhance toward. useScroll ships the same behaviour everywhere.
 *
 * WHY THE CARDS LIVE HERE AND NOT IN THEIR OWN SECTION
 * ----------------------------------------------------
 * They used to be a separate grid further down the page, and the page ended up
 * narrating the same five stages twice within one screen of scrolling: this
 * rail said what each stage does, and the grid said it again in shorter words
 * before naming a refusal. Worse, the grid's heading ("What each agent will not
 * do") sat directly beneath the refusals section's heading ("What it refuses to
 * do"), so the page made the same promise twice in a row and looked padded
 * rather than thorough.
 *
 * Merging them costs nothing and settles which section owns which claim:
 *
 *   here          — the five stages: what each does, produces, and refuses
 *   `Refusals`    — the four system-wide invariants, each with the file that
 *                   enforces it
 *
 * A per-stage refusal and a system-wide invariant are genuinely different
 * things, so both survive. Two lists of the same five stages were not.
 */
import React, { useRef } from 'react';
import { motion, useScroll, useTransform, useReducedMotion, type MotionValue } from 'motion/react';
import { Check } from 'lucide-react';

/**
 * The real single_release template, in the order the orchestrator runs it.
 *
 * `art` is decoration and carries no claim — which is the only reason a
 * generated image may appear on this page at all. Nothing in these files states
 * a number, and the numbers on this page all come from `/api/demo/qc`.
 */
const STAGES = [
  {
    name: 'qc_analysis',
    label: 'Mix QC',
    says: 'Measures the bounce. Loudness, true peak, spectral balance, section boundaries.',
    produces: 'measurements',
    refuses: 'Will not describe a mix it has not measured.',
    art: '/media/console-metal.webp',
  },
  {
    name: 'anr_score',
    label: 'A&R',
    says: 'Judges readiness against those measurements — or asks for what it is missing.',
    produces: 'findings, each pinned to something measured',
    refuses: 'Asks rather than guessing when the evidence is not there.',
    art: '/media/hands-guitar.webp',
  },
  {
    name: 'mastering',
    label: 'Mastering',
    says: 'Targets the platforms you are releasing to, from the measured starting point.',
    produces: 'a master, and the delta it applied',
    refuses: 'A predicted number never ships as a measured one.',
    art: '/media/outboard.webp',
  },
  {
    name: 'rights',
    label: 'Splits',
    says: 'Allocates every share and writes it to a hash-chained ledger.',
    produces: 'a split sheet that must total 100%',
    refuses: 'Rejects the sheet rather than balancing it for you.',
    art: '/media/cables.webp',
  },
  {
    name: 'release',
    label: 'Delivery',
    says: 'Builds the DDEX ERN, including the AI disclosure the EU now requires.',
    produces: 'a message a distributor accepts',
    refuses: 'Incomplete disclosure blocks delivery. It is never inferred.',
    art: '/media/vinyl.webp',
  },
] as const;

export const PipelineScroll: React.FC = () => {
  const ref = useRef<HTMLDivElement | null>(null);
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start 0.8', 'end 0.4'],
  });

  // The playhead. Reduced motion pins it at the end: the finished state is the
  // one that carries the information, so nobody who turned animation off is
  // shown an empty pipeline.
  const fill = useTransform(scrollYProgress, [0, 1], reduced ? ['100%', '100%'] : ['0%', '100%']);

  return (
    <div ref={ref} className="relative">
      {/* The line the playhead travels. Behind the cards, not between them. */}
      <div className="absolute left-[15px] top-6 bottom-6 w-px bg-line" aria-hidden="true">
        <motion.div className="absolute inset-x-0 top-0 bg-accent" style={{ height: fill }} />
      </div>

      <ol className="space-y-4">
        {STAGES.map((stage, i) => (
          <Stage
            key={stage.name}
            stage={stage}
            at={i / (STAGES.length - 1 || 1)}
            progress={scrollYProgress}
            reduced={!!reduced}
          />
        ))}
      </ol>
    </div>
  );
};

const Stage: React.FC<{
  stage: (typeof STAGES)[number];
  at: number;
  progress: MotionValue<number>;
  reduced: boolean;
}> = ({ stage, at, progress, reduced }) => {
  // Reached slightly before the playhead arrives, so the card is legible by the
  // time the eye gets there rather than resolving under it.
  const opacity = useTransform(progress, [at - 0.14, at], reduced ? [1, 1] : [0.55, 1]);
  const x = useTransform(progress, [at - 0.14, at], reduced ? [0, 0] : [-8, 0]);
  const approved = useTransform(progress, (p) => (p >= at ? 1 : 0));
  // Hooks cannot be called inside JSX props conditionally, and the unapproved
  // marker needs the inverse — so it is derived here, unconditionally, beside
  // the value it inverts.
  const unapproved = useTransform(approved, (v) => 1 - v);

  return (
    <motion.li style={{ opacity, x }} className="relative pl-12 sm:pl-14">
      {/* The checkpoint marker, on the rail. Sits at the card's shoulder so the
          line reads as threading the stages rather than underlining them. */}
      <div className="absolute left-0 top-6">
        <motion.span
          style={{ opacity: approved }}
          className="flex h-[31px] w-[31px] items-center justify-center rounded-full bg-accent text-accent-on"
        >
          <Check className="h-4 w-4" strokeWidth={3} />
        </motion.span>
        <motion.span
          style={{ opacity: unapproved }}
          className="absolute inset-0 flex items-center justify-center rounded-full border border-line-strong bg-panel"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-dim" />
        </motion.span>
      </div>

      <article className="group relative overflow-hidden rounded-2xl border border-line bg-bg transition-colors hover:border-line-strong">
        {/* Decoration, at an opacity that keeps it texture rather than subject.
            It states nothing, which is why it may be generated at all.

            These are all dark, low-key photographs, so the first pass — 0.14
            under a 92% wash — composited to flat black and the artwork may as
            well not have been fetched. The image is anchored right, where the
            text runs out, and the wash is opaque only across the type. */}
        <img
          src={stage.art}
          alt=""
          aria-hidden="true"
          loading="lazy"
          style={{ opacity: "var(--media-still)" }}
          className="absolute inset-0 h-full w-full object-cover object-right transition-opacity duration-500"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-r from-bg via-bg/94 to-transparent"
        />

        <div className="relative grid gap-x-8 gap-y-3 p-5 sm:p-6 md:grid-cols-[13rem_1fr]">
          <div>
            <div className="font-mono text-[11px] uppercase tracking-wider text-dim">
              {stage.name}
            </div>
            <h3 className="mt-0.5 font-headline text-xl font-bold text-ink">{stage.label}</h3>
            <motion.p
              style={{ opacity: approved }}
              className="mt-2 font-mono text-[11px] uppercase tracking-wider text-accent"
            >
              waited for you
            </motion.p>
          </div>

          <div className="max-w-2xl">
            <p className="text-[15px] leading-relaxed text-muted">{stage.says}</p>
            <p className="mt-1.5 font-mono text-[11px] text-dim">→ {stage.produces}</p>
            {/* The differentiated half. It was buried in prose before, which
                wasted it — a stage that refuses something is the part nobody
                else in this category ships. */}
            <p className="mt-4 border-t border-line pt-3 text-[13px] leading-relaxed text-accent">
              <span className="mr-2 font-mono text-[10px] uppercase tracking-[0.14em] text-dim">
                refuses
              </span>
              {stage.refuses}
            </p>
          </div>
        </div>
      </article>
    </motion.li>
  );
};
