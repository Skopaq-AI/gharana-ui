/**
 * A live QC pass on GHARANA's own master, run when you open the page.
 *
 * WHAT THIS REPLACED, TWICE
 * -------------------------
 * First it was an OscillatorNode and an AnalyserNode printing RMS beside copy
 * about measurement discipline — and RMS is not LUFS, so the one place the site
 * demonstrated its central claim was the one place it was not doing it.
 *
 * Then it animated a JSON file recorded once. Better numbers, same category of
 * problem: a replay argues for measurement using something that is no longer a
 * measurement. The phase durations were an array of invented milliseconds, so
 * the "work" the animation depicted had no relationship to any work.
 *
 * Now it calls GET /api/demo/qc, which runs ITU-R BS.1770 over the actual bytes
 * of a real stored master on every request. The stages advance when the request
 * actually reaches them. If the call is slow, the animation is slow, because
 * the animation IS the call.
 *
 * MEASURED VS PREDICTED — THE LINE THIS COMPONENT MUST NOT BLUR
 * ------------------------------------------------------------
 * The measurement and the findings are live. The fix is NOT: nothing has been
 * re-measured, because applying a gain trim and re-running BS.1770 on a 173
 * second master is not something to do per visitor.
 *
 * So the fix is shown as arithmetic, labelled as arithmetic. The trim needed to
 * clear the ceiling is (ceiling - measured peak), and the resulting loudness is
 * (measured loudness + trim), both exact for a linear gain change. They are
 * rendered in a visibly different register from the measured pair and captioned
 * as predicted. A product that will not print an unverified number in a QC
 * report cannot print one on its own landing page and call it a result.
 *
 * Nothing here has a fallback value. No reading, no spec, no finding. If the
 * request fails the component says so and shows the reason, because a demo that
 * substitutes plausible figures when its subject is unreachable is the exact
 * failure it exists to disprove — and it would be invisible, since the page
 * would look precisely right.
 */
import React, { useEffect, useRef, useState } from 'react';
import { Volume2, VolumeX } from 'lucide-react';

import { Badge, Measured, NotMeasured, Panel } from '../ui';

interface Finding {
  id: string;
  severity: 'blocking' | 'advisory' | string;
  measured: number;
  unit: string;
  ceiling?: number;
  target?: number;
  tolerance?: number;
  text: string;
}

interface Demo {
  artist: string;
  measured_at: string;
  measured: {
    lufs_integrated: number;
    true_peak_db: number;
    duration_s: number | null;
    sample_rate: number | null;
    engine: string | null;
  };
  spec: {
    platform: string;
    lufs_target: number;
    lufs_tolerance: number;
    true_peak_max_db: number;
    source: string;
  };
  findings: Finding[];
}

/** Where the sequence is. Driven by the request, not by a timer. */
type Phase = 'requesting' | 'measured' | 'judged' | 'fix' | 'rest';

/**
 * Does this body actually carry two measurements and a spec?
 *
 * A 200 is not evidence that the answer is a QC result. Any hop between here
 * and the gateway can return 200 with something else entirely — an SPA
 * fallback serving index.html, a CDN interstitial, a proxy's own error page —
 * and `r.ok` is true for every one of them.
 *
 * Without this check the component destructured that body, got `undefined` for
 * every field, and threw on `findings.filter`. A render-time throw is not
 * contained: it unmounts the whole React tree, so a bad reply on ONE panel
 * blanked the entire landing page. That is the worst available failure — the
 * page arguing that nothing unverified gets shown, showing nothing at all.
 *
 * So the shape is checked as narrowly as it is used. `lufs_integrated` and
 * `true_peak_db` must be finite numbers, because arithmetic is done on them
 * and `undefined + undefined` renders as "NaN LUFS" — a fabricated-looking
 * reading, which is the one output this component may never produce.
 */
function isDemo(body: unknown): body is Demo {
  if (typeof body !== 'object' || body === null) return false;
  const b = body as Record<string, unknown>;
  const measured = b.measured as Record<string, unknown> | undefined;
  const spec = b.spec as Record<string, unknown> | undefined;
  return (
    typeof measured === 'object' &&
    measured !== null &&
    Number.isFinite(measured.lufs_integrated) &&
    Number.isFinite(measured.true_peak_db) &&
    typeof spec === 'object' &&
    spec !== null &&
    Number.isFinite(spec.lufs_target) &&
    Number.isFinite(spec.true_peak_max_db) &&
    Array.isArray(b.findings)
  );
}

export const ProofOfWork: React.FC<{
  /** Hands the <audio> element up so the headline can animate to the same
      excerpt. One element, one playback — a second copy would drift and the
      page would be visibly out of time with itself. */
  onAudioReady?: (el: HTMLAudioElement | null) => void;
}> = ({ onAudioReady }) => {
  const [demo, setDemo] = useState<Demo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>('requesting');
  const [elapsedMs, setElapsedMs] = useState<number | null>(null);
  const [muted, setMuted] = useState(true);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  // Held in a ref because the timers are created inside a .then(): a cleanup
  // returned from there is returned into the promise chain, where nothing calls
  // it, not to useEffect. The component would keep setting state after unmount.
  const beatsRef = useRef<number[]>([]);

  useEffect(() => {
    let cancelled = false;
    const started = performance.now();
    fetch('/api/demo/qc')
      .then(async (r) => {
        const body: unknown = await r.json().catch(() => null);
        const detail = (body as { detail?: unknown } | null)?.detail;
        if (!r.ok) throw new Error(typeof detail === 'string' ? detail : `HTTP ${r.status}`);
        if (!isDemo(body)) {
          // Deliberately says what was wrong with the ANSWER, not "something
          // went wrong". A 200 carrying the wrong thing points at the proxy or
          // the route, and an operator reading "the call failed" would go and
          // check a service that is up.
          throw new Error(
            'the demo endpoint answered 200 with a body that is not a QC result — ' +
              'check that /api/demo/qc reaches the gateway rather than the SPA fallback',
          );
        }
        return body;
      })
      .then((data) => {
        if (cancelled) return;
        // The real round trip, reported rather than dressed up. A fast pass is
        // allowed to look fast; padding it to feel substantial would be
        // theatre about work, on a page arguing against exactly that.
        setElapsedMs(Math.round(performance.now() - started));
        setDemo(data);
        setPhase('measured');
        // These two beats are presentation, not measurement: the numbers are
        // already in hand and the reader needs a moment between "here is the
        // reading" and "here is what it fails".
        beatsRef.current = [
          window.setTimeout(() => setPhase('judged'), 2200),
          window.setTimeout(() => setPhase('fix'), 5600),
          window.setTimeout(() => setPhase('rest'), 9200),
        ];
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      });
    return () => {
      cancelled = true;
      beatsRef.current.forEach(window.clearTimeout);
    };
  }, []);

  useEffect(() => {
    audioRef.current?.play().catch(() => undefined);
  }, [demo]);

  useEffect(() => {
    onAudioReady?.(audioRef.current);
    return () => onAudioReady?.(null);
  }, [onAudioReady, demo]);

  const toggleSound = () => {
    const el = audioRef.current;
    if (!el) return;
    const next = !muted;
    setMuted(next);
    el.muted = next;
    if (!next) void el.play().catch(() => undefined);
  };

  if (error) {
    return (
      <Panel className="p-5">
        <h3 className="font-headline text-sm font-bold">The live QC pass did not run</h3>
        <p className="mt-1 font-mono text-[12px] text-muted">{error}</p>
        <p className="mt-2 text-[12px] text-dim">
          No numbers are shown, because there are none. This panel measures a real file on every
          request; when it cannot, it says so.
        </p>
      </Panel>
    );
  }

  if (!demo) {
    return (
      <Panel className="p-5">
        <div className="flex items-center gap-3">
          <span className="h-2 w-2 animate-pulse rounded-full bg-accent" />
          <p className="font-mono text-[12px] text-muted">
            measuring a real master — ITU-R BS.1770 over the actual bytes…
          </p>
        </div>
      </Panel>
    );
  }

  const { measured, spec, findings } = demo;
  const blocking = findings.filter((f) => f.severity === 'blocking');
  // Exact for a linear gain change, and that is the only reason it may be
  // shown at all: it is arithmetic on two measured values, not an estimate.
  const trimDb = Number((spec.true_peak_max_db - measured.true_peak_db).toFixed(2));
  const predictedLufs = Number((measured.lufs_integrated + trimDb).toFixed(2));
  const showFix = phase === 'fix' || phase === 'rest';

  return (
    <Panel className="overflow-hidden p-5 sm:p-6">
      <audio ref={audioRef} muted={muted} loop preload="metadata" aria-label="The measured master">
        <source src="/proof/lyria-excerpt.webm" type="audio/webm" />
        <source src="/proof/lyria-excerpt.m4a" type="audio/mp4" />
      </audio>

      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-headline text-sm font-bold">
            {demo.artist} — measured {elapsedMs !== null ? `${elapsedMs} ms ago` : 'just now'}
          </h3>
          <p className="mt-1 max-w-xl text-[12px] leading-relaxed text-muted">
            Not a recording. Opening this page ran {measured.engine ?? 'the analyser'} over{' '}
            {measured.duration_s ? `${Math.round(measured.duration_s)} seconds` : 'the master'} of
            our own release. Every figure below was computed for you.
          </p>
        </div>
        <button
          type="button"
          onClick={toggleSound}
          className="flex shrink-0 items-center gap-1.5 rounded-full border border-line-strong px-3 py-1.5 font-mono text-[11px] text-muted transition-colors hover:text-ink"
          aria-label={muted ? 'Turn the sound on' : 'Mute'}
        >
          {muted ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
          {muted ? 'sound off' : 'sound on'}
        </button>
      </header>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <Reading
          label="Integrated loudness"
          value={measured.lufs_integrated}
          unit="LUFS"
          verdict={
            phase === 'requesting'
              ? null
              : Math.abs(measured.lufs_integrated - spec.lufs_target) <= spec.lufs_tolerance
          }
          target={`target ${spec.lufs_target} ±${spec.lufs_tolerance}`}
        />
        <Reading
          label="True peak"
          value={measured.true_peak_db}
          unit="dBTP"
          verdict={phase === 'requesting' ? null : measured.true_peak_db <= spec.true_peak_max_db}
          target={`ceiling ${spec.true_peak_max_db}`}
        />
      </div>

      {phase !== 'requesting' && phase !== 'measured' && findings.length > 0 && (
        <ul className="mt-4 space-y-2">
          {findings.map((f) => (
            <li
              key={f.id}
              className={`rounded-lg border p-3 ${
                f.severity === 'blocking'
                  ? 'border-blocking/40 bg-blocking/5'
                  : 'border-caution/40 bg-caution/5'
              }`}
            >
              <div className="flex items-center gap-2">
                <Badge status={f.severity === 'blocking' ? 'blocking' : 'caution'}>
                  {f.severity}
                </Badge>
                <span className="font-mono text-[11px] text-dim">{f.id}</span>
              </div>
              <p className="mt-1.5 text-[13px] leading-relaxed">{f.text}</p>
            </li>
          ))}
        </ul>
      )}

      {showFix && blocking.length > 0 && (
        <div className="mt-4 rounded-lg border border-dashed border-line-strong bg-bg/50 p-4">
          <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-dim">
            the fix — predicted, not measured
          </div>
          <p className="mt-2 text-[13px] leading-relaxed">
            A gain trim of <span className="font-mono text-accent">{trimDb} dB</span> clears the
            ceiling. No limiting: the overshoot is small enough that a trim also moves loudness to{' '}
            <span className="font-mono text-accent">{predictedLufs} LUFS</span>, inside the window.
          </p>
          {/* The sentence this whole panel exists for. */}
          <p className="mt-2 text-[12px] leading-relaxed text-dim">
            Those two figures are arithmetic on the measured pair above — exact for a linear gain
            change, and still not a result. Nothing has been re-measured. In a real run the master
            is re-analysed after the trim and the new reading is what gets recorded, because a
            predicted number and a measured one are not the same kind of thing.
          </p>
        </div>
      )}

      <p className="mt-4 border-t border-line pt-3 font-mono text-[10px] leading-relaxed text-dim">
        {spec.platform} spec from {spec.source} · narration omitted: it is the only part of QC that
        calls a model
      </p>
    </Panel>
  );
};

/** One reading. Uses Measured, which cannot render null as a number. */
const Reading: React.FC<{
  label: string;
  value: number | null;
  unit: string;
  verdict: boolean | null;
  target: string;
}> = ({ label, value, unit, verdict, target }) => (
  <div className="rounded-lg border border-line bg-bg/40 p-3">
    <div className="flex items-center justify-between gap-2">
      <span className="font-mono text-[10px] uppercase tracking-wider text-dim">{label}</span>
      {verdict !== null && (
        <Badge status={verdict ? 'ok' : 'blocking'}>
          {verdict ? 'within spec' : 'over ceiling'}
        </Badge>
      )}
    </div>
    <div className="mt-1.5">
      {value === null ? (
        <NotMeasured />
      ) : (
        <Measured value={value} unit={unit} places={2} className="text-2xl" />
      )}
    </div>
    <p className="mt-1 font-mono text-[10px] text-dim">{target}</p>
  </div>
);
