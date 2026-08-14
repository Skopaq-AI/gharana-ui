/**
 * The front door.
 *
 * THE ONE RULE THIS PAGE HAS TO KEEP
 * ----------------------------------
 * Every number on it is measured, in the visitor's browser, from audio they can
 * hear. The page it replaces printed "14.2 LUFS" and "1.1 dBTP" as headline
 * figures with nothing behind them — and a product that exists to stop agents
 * inventing measurements cannot invent them in its own shop window. A visitor
 * who reads a fabricated number here and a real one in a report has no way to
 * tell which was which.
 *
 * So there are exactly two kinds of number on this page: measured live (mono,
 * from the AnalyserNode) or absent (`not measured`, until you press play).
 * There is no third kind, and adding one is the failure.
 *
 * WHAT THE COPY CAN AND CANNOT SAY
 * --------------------------------
 * It describes what the system does — refuses, asks, waits, measures — because
 * all of that is true and testable. It claims no adoption figures, no accuracy
 * percentages and no time savings, because nobody has measured those either.
 */
import React, { useEffect, useRef } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { ArrowRight } from 'lucide-react';

import { Button, Measured, NotMeasured, Locator, Panel, Badge } from '../ui';
import { ProofOfWork } from './ProofOfWork';
import { PipelineScroll } from './PipelineScroll';
import { FooterModals, type FooterModalType } from './FooterModals';
import { AgentGrid, SiteFooter } from './SiteFooter';
import { VideoBand } from './Showcase';
import { Refusals } from './Refusals';
import { AmbientLoop } from './AmbientLoop';
import { ThemeToggle } from '../ThemeToggle';
import { ScoreLine } from './ScoreLine';

export interface LandingPageProps {
  /**
   * Ignored in the deployed app, and kept because it makes this component
   * testable in isolation.
   *
   * Entering the console is a full navigation to `/?app`, not a state flip: the
   * server decides whether this visitor has a session, and a signed-out one is
   * redirected to /login. Flipping local state instead would render a console
   * whose every request 401s, which is the error screen the auth gate exists to
   * prevent.
   */
  onEnterConsole?: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onEnterConsole }) => {
  const enterConsole = onEnterConsole ?? (() => {
    window.location.href = '/?app';
  });
  const [modal, setModal] = React.useState<FooterModalType>(null);
  // Held here because two children need the same element: the panel that plays
  // it and the headline that moves to it.
  const [proofAudio, setProofAudio] = React.useState<HTMLAudioElement | null>(null);

  // The hero clip loads fully (readyState 4) and plays when asked, but the
  // autoPlay attribute does not reliably win the race against <source>
  // selection in production — it worked locally and sat on its poster on the
  // deployed page. Nudging once on mount is cheap and cannot make things worse:
  // a muted video is always allowed to play, and a rejected promise is the
  // browser declining, which is not an error worth surfacing.
  const heroRef = useRef<HTMLVideoElement | null>(null);
  useEffect(() => {
    heroRef.current?.play().catch(() => undefined);
  }, []);
  const reduced = useReducedMotion();

  /**
   * The entrance animation moves things. It does not reveal them.
   *
   * Written first as `opacity: 0` -> `1` on whileInView, which made three whole
   * sections — the comparison, the refusals, the closing call to action —
   * invisible until an IntersectionObserver callback fired. The page's entire
   * argument was gated on a JavaScript event completing. Anything that stops
   * that (an observer quirk, a crawler, a screenshot, a browser we did not
   * test) leaves a visitor reading a mostly empty page and concluding the
   * product is vapour.
   *
   * So the finished state IS the default and only the transform animates.
   * Nothing here is ever unreadable because an animation did not run.
   */
  const rise = reduced
    ? {}
    : {
        initial: { y: 14 },
        whileInView: { y: 0 },
        viewport: { once: true, margin: '-60px' },
        transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] as const },
      };

  return (
    <div className="min-h-screen bg-bg text-ink">
      {/* ---------------------------------------------------------------- nav */}
      <nav className="sticky top-0 z-40 border-b border-line bg-bg/85 backdrop-blur-xl">
        <div className="shell flex items-center justify-between py-3">
          <div className="flex items-baseline gap-2.5">
            <span className="font-headline text-lg font-bold tracking-tight">GHARANA</span>
            <span className="hidden font-mono text-[11px] text-dim sm:inline">
              the label that shows its work
            </span>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Button variant="primary" size="sm" onClick={enterConsole}>
              Open console <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </nav>

      {/* -------------------------------------------------------------- hero */}
      <header className="relative overflow-hidden border-b border-line">
        {/*
          The photograph carries the right; the type owns the left.

          Positioned rather than used as a background-image so it can be a
          <picture> with a small source for phones — 12KB there, 34KB on
          desktop. It is deliberately DECORATION and says nothing factual: the
          only claims on this page that could be checked are the measured ones,
          and those are numbers, not atmosphere.
        */}
        {/* Moving, because a still hero reads as a brochure and every product
            in this category now opens on motion. autoPlay+muted+loop is the
            only combination browsers permit without a gesture.
            The WEBP stays as the poster, so a phone on a slow connection — or
            any browser that declines the video — still gets the hero it had
            rather than an empty panel, and pays 12KB for it. */}
        {/* preload="metadata", not "none": with "none" the browser fetches
            nothing, autoPlay has no data to start on, and the hero sits on its
            poster forever — indistinguishable from a working still, which is
            how it got through a build once already. */}
        <video
          ref={heroRef}
          aria-hidden="true"
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          poster="/media/faders-poster.webp"
          style={{ opacity: "var(--media-hero)" }}
          className="pointer-events-none absolute inset-y-0 right-0 h-full w-full object-cover object-right md:w-[68%]"
        >
          <source src="/media/faders.webm" type="video/webm" />
          <source src="/media/faders.mp4" type="video/mp4" />
        </video>
        {/* Ink wash so type stays legible over the metal at every width. */}
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-r from-bg via-bg/90 to-bg/10 md:to-transparent"
        />

        <div className="relative shell pb-16 pt-20 sm:pb-24 sm:pt-28">
        <motion.div {...rise} className="max-w-3xl">
          <Badge status="ok" className="mb-6">every number below is measured</Badge>
          {/* Set like a line of music: each character sits at its own height and
              the line moves with the excerpt on this page when it is audible.
              The two halves carry the palette's two meanings — jade is a number
              that came back fine, vermilion is a thing waiting on a person — so
              the headline says the product twice, once in words and once in the
              colours the rest of the interface already uses for those ideas. */}
          <ScoreLine audio={proofAudio} />
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-muted">
            A&amp;R, mix QC, mastering, splits, delivery.
          </p>
          <p className="mt-2 max-w-2xl text-lg leading-relaxed text-muted">
            Every note points at a number. Nothing ships without you.
          </p>
        </motion.div>

        {/* The demonstration. It runs on its own and needs no click, and every
            number in it was measured by services/audio/features.py over audio
            Lyria actually generated — not computed here. What used to sit here
            synthesised a tone and showed RMS beside copy about measurement
            discipline; a browser cannot compute BS.1770, so the one place the
            product demonstrated its claim was the one place it was not doing it. */}
        <motion.div {...rise} id="proof" className="mt-10">
          <ProofOfWork onAudioReady={setProofAudio} />
        </motion.div>
        </div>
      </header>

      {/* ------------------------------------------------ specific or silent */}
      <section id="evidence" className="border-y border-line bg-panel/40">
        <div className="shell">
          <motion.div {...rise}>
            <h2 className="font-headline text-[clamp(1.75rem,3.4vw,2.75rem)] font-bold leading-[1.02] tracking-[-0.03em]">Specific, or silent.</h2>
            <p className="mt-3 max-w-2xl text-muted">
              Every finding carries a locator: the measured value, timestamp or QC issue it points
              at. A claim that cannot produce one does not get shown to you.
            </p>
          </motion.div>

          <div className="mt-8 grid gap-4 md:grid-cols-2">
            <motion.div {...rise}>
              <Panel tone="sunken" className="h-full p-5">
                <div className="mb-3 font-mono text-[11px] uppercase tracking-wider text-dim">
                  what most tools say
                </div>
                <p className="text-[15px] leading-relaxed text-absent line-through decoration-blocking/60">
                  “The mix feels a bit crowded in the low end and the vocal could sit better.”
                </p>
                <p className="mt-4 text-[13px] text-dim">
                  Unfalsifiable. Nothing to check, nothing to fix, nothing to disagree with.
                </p>
              </Panel>
            </motion.div>

            <motion.div {...rise}>
              <Panel className="h-full border-accent p-5">
                <div className="mb-3 font-mono text-[11px] uppercase tracking-wider text-accent">
                  what an agent here must say
                </div>
                <p className="text-[15px] leading-relaxed">
                  <Locator>1:12–1:38</Locator>{' '}
                  <span className="ml-1">
                    low-mid energy sits above the section average and the lead sits under it.
                  </span>
                </p>
                <p className="mt-4 text-[13px] text-dim">
                  Or, when the evidence is not there:{' '}
                  <span className="text-muted">it asks you for a reference track instead.</span>
                </p>
              </Panel>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------- pipeline */}
      <section id="stages" className="relative overflow-hidden border-y border-line">
        {/* A hand on a fader, behind the section about human checkpoints. The
            clip is doing an argument's work rather than filling space: the whole
            claim here is that a person decides, and the footage is a person
            deciding. */}
        <AmbientLoop
          clip="hands"
          style={{ opacity: "var(--media-still)" }}
          className="pointer-events-none absolute right-0 top-0 h-full w-full object-cover md:w-[55%]"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-r from-bg via-bg/92 to-bg/55"
        />
        <div className="relative shell">
        <motion.div {...rise} className="mb-10 max-w-2xl">
          <h2 className="font-headline text-[clamp(1.75rem,3.4vw,2.75rem)] font-bold leading-[1.02] tracking-[-0.03em]">
            Five stages. Five times you decide.
          </h2>
          <p className="mt-3 text-muted">
            Scroll to move the playhead. It stops at every checkpoint — because in a real run, so
            does the pipeline, until you approve. Each card also names what that stage refuses.
          </p>
        </motion.div>
        {/* Wider than it was: these are cards now, not one-line rows. The stage
            cards that used to sit in their own grid below the refusals live
            here, because this section was already narrating the same five
            stages and the page was saying it all twice. */}
        <div className="max-w-5xl">
          <PipelineScroll />
        </div>
        </div>
      </section>

      {/* ------------------------------------------------------- the refusals */}
      <section id="refusals" className="border-y border-line bg-panel/30 py-16 sm:py-20">
        <div className="shell">
          <h2 className="font-headline text-[clamp(1.75rem,3.4vw,2.75rem)] font-bold leading-[1.02] tracking-[-0.03em]">
            What it refuses to do
          </h2>
          <p className="mt-3 max-w-xl text-muted">
            Enforced in code and pinned by tests. Each line says where.
          </p>
        </div>
        <Refusals />
      </section>

      {/* -------------------------------------------------------------- close */}
      <VideoBand
        clip="tape"
        poster="/media/faders-poster.webp"
        kicker="every attempt is kept"
        line="A redo forks. It never overwrites what you already heard."
      />

      <AgentGrid />

      <VideoBand
        clip="room"
        poster="/media/console-metal.webp"
        kicker="nothing advances on its own"
        line="Five checkpoints. None of them auto-approve, including the ones you would rather skip."
        height="h-[52vh] min-h-[340px]"
      />

      {/* Columned footer. The shape is LANDR's — a wide link grid over a legal
          bar gives a long page a floor instead of letting it trail off. The
          density is not: every entry here resolves, because a footer full of
          links to pages nobody wrote is the mock-data defect with better
          typography. */}
      <section className="relative overflow-hidden border-t border-line">
        <AmbientLoop style={{ opacity: "var(--media-band)" }}
          className="pointer-events-none absolute inset-0 h-full w-full object-cover" />
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-r from-bg via-bg/85 to-bg/40"
        />
        <motion.div {...rise} className="relative shell">
          <h2 className="max-w-4xl font-headline text-[clamp(2rem,5vw,4rem)] font-bold leading-[1.0] tracking-[-0.035em]">
            Bring a bounce.<br />Get findings you can argue with.
          </h2>
          <div className="mt-10 flex">
            <Button variant="primary" onClick={enterConsole}>
              Open the console <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </motion.div>
      </section>

      <SiteFooter onOpenModal={setModal} />

      <FooterModals active={modal} onClose={() => setModal(null)} />
    </div>
  );
};

