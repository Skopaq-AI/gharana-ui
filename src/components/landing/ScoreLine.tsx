/**
 * The headline, set like a line of music.
 *
 * Each character sits at its own height, the way noteheads sit on a stave, and
 * the line moves. When the excerpt on this page is audible, the movement comes
 * from that audio; when it is muted — which is the default, and how most people
 * will see it — the line breathes on a slow wave of its own.
 *
 * WHAT THIS IS ALLOWED TO BE, GIVEN THE HISTORY
 * ---------------------------------------------
 * This page once printed RMS from an AnalyserNode next to copy about
 * measurement discipline. That was removed because RMS is not LUFS: the one
 * place the product demonstrated its central claim was the one place it was not
 * doing it.
 *
 * So the rule here is exact, and it is the same rule the imagery follows:
 * MOTION IS DECORATION AND MAY COME FROM ANYWHERE. A NUMBER IS A MEASUREMENT
 * AND MAY ONLY COME FROM THE ANALYSER. This component renders no digits, no
 * units, no axis and no readout. It moves letters. A visitor cannot mistake a
 * letter that moved for a value that was measured, which is the whole reason
 * the earlier version had to go.
 *
 * WHY THE TWO HALVES ARE DIFFERENT COLOURS
 * ----------------------------------------
 * "We measured it." is jade — the palette's colour for a number that came back
 * and was fine, the machine's statement about a file. "You decide." is
 * vermilion — reserved for a thing waiting on a person. Those two meanings are
 * the product, and the design system already encodes them, so the headline is
 * saying it twice: once in words and once in the colours the rest of the
 * interface uses for exactly these ideas.
 *
 * REDUCED MOTION
 * --------------
 * A stated preference wins outright and the line renders flat and still. It is
 * a headline first; the movement is the second thing it does, never the thing
 * that makes it readable.
 */
import React, { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from 'motion/react';

/** The two halves, and what each one means in this palette. */
const PHRASES = [
  { text: 'We measured it.', tone: 'text-ok' },
  { text: 'You decide.', tone: 'text-accent' },
] as const;

/** Characters get a stable pseudo-random phase so the line reads as a melody
 *  rather than a wave — neighbours should not rise together. */
function phaseFor(index: number): number {
  return ((index * 2654435761) % 1000) / 1000;
}

export const ScoreLine: React.FC<{ audio?: HTMLAudioElement | null }> = ({ audio }) => {
  const reduced = useReducedMotion();
  const [levels, setLevels] = useState<number[]>([]);
  const frame = useRef<number>(0);
  const analyser = useRef<AnalyserNode | null>(null);

  const chars = PHRASES.flatMap((p, pi) =>
    [...p.text].map((ch, ci) => ({ ch, tone: p.tone, key: `${pi}-${ci}` })),
  );

  // Attach an analyser the first time the element is actually audible. Doing it
  // eagerly would build an AudioContext that browsers suspend anyway until a
  // gesture, and a suspended context reports silence — which is
  // indistinguishable from a bug when you are looking at a still headline.
  useEffect(() => {
    if (!audio || reduced || analyser.current) return;
    const attach = () => {
      if (analyser.current || audio.muted) return;
      try {
        const Ctx = window.AudioContext ?? (window as never as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        const ctx = new Ctx();
        const node = ctx.createAnalyser();
        node.fftSize = 64;
        ctx.createMediaElementSource(audio).connect(node);
        node.connect(ctx.destination);
        analyser.current = node;
      } catch {
        // Autoplay policy, a cross-origin source, or an already-connected
        // element. The idle wave below keeps the line alive either way.
      }
    };
    audio.addEventListener('volumechange', attach);
    audio.addEventListener('play', attach);
    return () => {
      audio.removeEventListener('volumechange', attach);
      audio.removeEventListener('play', attach);
    };
  }, [audio, reduced]);

  useEffect(() => {
    if (reduced) return;
    const bins = new Uint8Array(32);
    const tick = () => {
      const now = performance.now() / 1000;
      let next: number[];
      if (analyser.current && audio && !audio.muted && !audio.paused) {
        analyser.current.getByteFrequencyData(bins);
        next = chars.map((_, i) => bins[i % bins.length] / 255);
      } else {
        // The idle line. Slow, small, and obviously not reacting to anything —
        // it should read as breathing, not as a meter with no signal.
        next = chars.map((_, i) => 0.5 + 0.5 * Math.sin(now * 1.1 + phaseFor(i) * Math.PI * 2));
      }
      setLevels(next);
      frame.current = requestAnimationFrame(tick);
    };
    frame.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame.current);
  }, [chars.length, audio, reduced]);

  return (
    <h1
      className="font-headline text-[clamp(2.5rem,6.4vw,5.75rem)] font-bold leading-[0.98] tracking-[-0.035em]"
      // The animation splits the line into per-character spans, which a screen
      // reader would otherwise spell out one letter at a time.
      aria-label={PHRASES.map((p) => p.text).join(' ')}
    >
      {PHRASES.map((phrase, pi) => (
        <span key={phrase.text} className={`${phrase.tone} inline-block whitespace-nowrap`}>
          {[...phrase.text].map((ch, ci) => {
            const i = pi === 0 ? ci : PHRASES[0].text.length + ci;
            const level = levels[i] ?? 0.5;
            return (
              <span
                key={`${pi}-${ci}`}
                aria-hidden="true"
                className="inline-block will-change-transform"
                style={
                  reduced
                    ? undefined
                    : {
                        // 0.34em was the first attempt and it read as drunk
                        // rather than musical — the eye tracked the wobble
                        // instead of the sentence, which is the failure this
                        // comment was already warning about. A tenth of an em
                        // is enough to see and small enough to read through.
                        transform: `translateY(${(0.5 - level) * 0.12}em)`,
                        transition: 'transform 110ms cubic-bezier(0.22, 1, 0.36, 1)',
                      }
                }
              >
                {ch === ' ' ? ' ' : ch}
              </span>
            );
          })}
          {pi === 0 ? ' ' : null}
        </span>
      ))}
    </h1>
  );
};
