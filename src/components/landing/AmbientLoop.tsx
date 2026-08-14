/**
 * A short loop of studio hardware, used as texture behind the closing section.
 *
 * WHAT THIS IS ALLOWED TO BE
 * --------------------------
 * Atmosphere. Metal in the dark, evocative of the room this product is used in.
 *
 * It deliberately shows no screen, no waveform, no readout and no number. A
 * generated shot of a GHARANA interface would be a picture of software that does
 * not exist, published by a system whose entire claim is that it never shows you
 * something nothing produced — fabricated evidence in the most literal form
 * available. Atmosphere is not evidence, so this is fine; a rendered UI would
 * not be.
 *
 * The source clip was cropped past its right-hand third before shipping. Veo put
 * plausible-looking lettering there — "SU", "MTU" — which is meaningless, and
 * legible nonsense on a landing page is precisely the generated-looking tell
 * this redesign exists to remove.
 *
 * BANDWIDTH AND MOTION ARE BOTH CONSENT QUESTIONS
 * -----------------------------------------------
 * It does not autoplay for someone who asked for reduced motion, and it does not
 * download for them either — `preload` stays "none" until we know, so the
 * politeness is real rather than cosmetic. Poster frame first either way, so the
 * section is never empty while bytes are in flight.
 */
import React from 'react';
import { useReducedMotion } from 'motion/react';

export const AmbientLoop: React.FC<{
  className?: string;
  clip?: 'console' | 'hands';
  /** Loudness comes from the caller because it is theme-dependent: the same
      opacity that reads as texture on ink reads as mid-grey mud on parchment. */
  style?: React.CSSProperties;
}> = ({ className, clip = 'console', style }) => {
  const base = clip === 'hands' ? '/studio-hands' : '/console-ambient';
  const reduced = useReducedMotion();
  const ref = React.useRef<HTMLVideoElement | null>(null);

  // Only play while on screen. A loop running behind a section nobody is
  // looking at is spent battery.
  React.useEffect(() => {
    const el = ref.current;
    if (!el || reduced) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) void el.play().catch(() => undefined);
        else el.pause();
      },
      { threshold: 0.15 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [reduced]);

  if (reduced) {
    // The still carries the same atmosphere at 34KB and never moves.
    return (
      <img
        src="/console-hero.webp"
        alt=""
        aria-hidden="true"
        className={className}
      />
    );
  }

  return (
    <video
      ref={ref}
      style={style}
      muted
      loop
      playsInline
      preload="none"
      poster="/console-hero-sm.webp"
      aria-hidden="true"
      className={className}
    >
      <source src={`${base}.webm`} type="video/webm" />
      <source src={`${base}.mp4`} type="video/mp4" />
    </video>
  );
};
