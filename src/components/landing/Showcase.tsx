/**
 * The visual middle of the landing page: full-bleed bands of moving texture.
 *
 * The page had the argument and none of the furniture — a hero, one live panel,
 * a wall of numbered text, a footer. Every claim was true and the whole thing
 * read as a document rather than a product, which is its own kind of failure:
 * an artist who bounces off the page never reaches the panel that proves
 * anything.
 *
 * WHAT THE IMAGERY IS AND IS NOT
 * ------------------------------
 * Rooms, hands, metal, tape. Generated with Veo and Gemini under prompts that
 * forbid screens, readouts, waveforms, numbers and lettering, and watched
 * before shipping. That constraint is not squeamishness: a rendered interface
 * on this page would be a fabricated measurement, a visitor cannot tell a
 * mocked-up readout from a real one, and the entire argument is that they
 * should never have to.
 *
 * So the pictures carry atmosphere and the panels carry claims, and the two
 * never swap jobs. Nothing here states a number.
 *
 * Every clip is muted, looping, playsInline and lazily loaded, and pauses when
 * off screen — three autoplaying videos on one page is a battery bill, and one
 * that keeps running behind a section nobody is looking at is a rude way to
 * spend someone's laptop.
 */
import React, { useEffect, useRef } from 'react';

/** Pauses a clip whenever it leaves the viewport. */
function useVisiblePlayback(ref: React.RefObject<HTMLVideoElement | null>) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // A stated preference for less motion wins outright: the poster stays.
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) void el.play().catch(() => undefined);
        else el.pause();
      },
      { threshold: 0.15 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [ref]);
}

/** A full-width band of moving texture with a line of type over it. */
export const VideoBand: React.FC<{
  clip: string;
  poster: string;
  kicker: string;
  line: string;
  height?: string;
}> = ({ clip, poster, kicker, line, height = 'h-[58vh] min-h-[380px]' }) => {
  const ref = useRef<HTMLVideoElement | null>(null);
  useVisiblePlayback(ref);
  return (
    <section className={`relative overflow-hidden border-y border-line ${height}`}>
      <video
        ref={ref}
        aria-hidden="true"
        muted
        loop
        playsInline
        preload="none"
        poster={poster}
        style={{ opacity: "var(--media-band)" }}
        className="absolute inset-0 h-full w-full object-cover"
      >
        <source src={`/media/${clip}.webm`} type="video/webm" />
        <source src={`/media/${clip}.mp4`} type="video/mp4" />
      </video>
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-gradient-to-t from-bg via-bg/70 to-bg/30"
      />
      <div className="relative mx-auto flex h-full max-w-[1600px] flex-col justify-end px-5 pb-12 sm:px-8 sm:pb-16">
        <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-accent">
          {kicker}
        </div>
        <p className="mt-3 max-w-3xl font-headline text-[clamp(1.6rem,3.6vw,3rem)] font-bold leading-[1.05] tracking-[-0.03em]">
          {line}
        </p>
      </div>
    </section>
  );
};

/*
 * A `StageCards` grid used to live here: five cards, each naming what a stage
 * does and what it refuses. It has moved into `PipelineScroll`, where the same
 * five stages were already being narrated — the page was telling them twice
 * within one screen, and the grid's heading ("What each agent will not do") sat
 * directly under the refusals heading ("What it refuses to do"), so it also
 * made the same promise twice.
 *
 * The cards were not the problem and were not deleted: they are now the rail's
 * rows, with the artwork and the per-stage refusal intact. Only the second
 * telling went.
 */
