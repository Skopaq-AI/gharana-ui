/**
 * The console's primitives.
 *
 * WHY THESE EXIST
 * ---------------
 * One panel class list — rounded-2xl, the panel background, a border, all three
 * spelled out as raw hex — appeared 29 times across the console. A second
 * variant appeared another 10.
 *
 * (Those class lists are described rather than quoted here on purpose: Tailwind
 * scans this file, and a comment containing a literal arbitrary-value class
 * makes it emit that utility. The docstring explaining the colour migration was
 * quietly re-adding three of the colours it removed.)
 *
 * That is a Panel component that was never extracted, written out longhand
 * until nobody could change the panel style without a find-and-replace across
 * twenty files — and until four of those copies had already drifted.
 *
 * Every primitive here is a rule made unavoidable rather than a style made
 * convenient. Where the rule is a product rule, it is stated on the component:
 *
 *   Measured / NotMeasured  a number is mono if it was measured, and absence is
 *                           never rendered as a value (constraint 2)
 *   Locator                 a finding points at something, or it is an opinion
 *   Button                  the accent's text colour cannot be separated from it
 *   StatusDot               three status colours, and red only stops a release
 *
 * These take className for genuine one-offs, but a one-off that appears twice
 * is a missing variant, not a longer className.
 */
import React from 'react';

/** Join class names, dropping falsy branches. */
function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ');
}

// ---------------------------------------------------------------------------
// Surfaces
// ---------------------------------------------------------------------------

type PanelTone = 'default' | 'sunken' | 'raised';

const PANEL_TONE: Record<PanelTone, string> = {
  /** The ordinary container. Most things are this. */
  default: 'bg-panel border-line',
  /** Set INTO the page — a readout, a code block, a nested list. */
  sunken: 'bg-bg border-line',
  /** Lifted OFF it — a menu, a popover, something transient. */
  raised: 'bg-surface-raised border-line-strong',
};

// HTMLElement, not HTMLDivElement: `as` can render an <li>, and the narrower
// type makes every event handler incompatible the moment it does.
export interface PanelProps extends React.HTMLAttributes<HTMLElement> {
  tone?: PanelTone;
  /** Draw attention without claiming a status. Used for the active selection. */
  selected?: boolean;
  as?: 'div' | 'section' | 'article' | 'li';
}

export const Panel: React.FC<PanelProps> = ({
  tone = 'default',
  selected = false,
  as: Tag = 'div',
  className,
  children,
  ...rest
}) => (
  <Tag
    className={cx(
      'rounded-[var(--radius-lg)] border',
      PANEL_TONE[tone],
      selected && 'border-accent',
      className,
    )}
    {...rest}
  >
    {children}
  </Tag>
);

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'blocking';

const BUTTON_VARIANT: Record<ButtonVariant, string> = {
  // accent-on travels WITH accent, always. Signal lime carries black text; the
  // vermilion it replaced carried white, so a hex-only swap produces
  // white-on-lime at ~1.3:1 — illegible, and looking deliberate.
  primary: 'bg-accent text-accent-on hover:bg-accent-hover',
  secondary: 'bg-surface text-ink border border-line-strong hover:bg-surface-raised',
  ghost: 'text-muted hover:text-ink',
  blocking: 'bg-blocking text-blocking-on hover:opacity-90',
};

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: 'sm' | 'md';
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'secondary',
  size = 'md',
  className,
  children,
  ...rest
}) => (
  <button
    className={cx(
      'inline-flex items-center justify-center gap-2 rounded-[var(--radius)]',
      'font-mono font-bold transition-colors',
      'disabled:opacity-40 disabled:pointer-events-none',
      size === 'sm' ? 'px-3 py-1.5 text-xs' : 'px-4 py-2.5 text-sm',
      BUTTON_VARIANT[variant],
      className,
    )}
    {...rest}
  >
    {children}
  </button>
);

// ---------------------------------------------------------------------------
// Measurement — the product's central claim, made visible
// ---------------------------------------------------------------------------

export interface MeasuredProps {
  /** The value. `null`/`undefined` renders as NotMeasured, never as a number. */
  value: number | string | null | undefined;
  /** dB, LUFS, dBTP, s — rendered dimmer than the value but still mono. */
  unit?: string;
  /** Decimal places. Ignored for string values. */
  places?: number;
  className?: string;
}

/**
 * A number that came from measurement.
 *
 * Mono, tabular, and — the part that matters — it CANNOT render a missing value
 * as a number. Passing null gives NotMeasured. Three components in this repo
 * have shipped a hardcoded LUFS as a fallback for absent data; that is the
 * failure this component's type signature exists to prevent.
 */
export const Measured: React.FC<MeasuredProps> = ({ value, unit, places = 1, className }) => {
  if (value === null || value === undefined || value === '') {
    return <NotMeasured className={className} />;
  }
  const text = typeof value === 'number' ? value.toFixed(places) : value;
  return (
    <span className={cx('measured', className)}>
      {text}
      {unit ? <span className="text-muted ml-1 text-[0.85em]">{unit}</span> : null}
    </span>
  );
};

/**
 * The absence of a measurement.
 *
 * Deliberately not alarming: an absent measurement is a fact about the world,
 * not a mistake the artist made. Deliberately not mono either — the monospace
 * treatment is reserved for values that exist, so absence never reads as one at
 * a glance.
 */
export const NotMeasured: React.FC<{ className?: string; children?: React.ReactNode }> = ({
  className,
  children,
}) => <span className={cx('not-measured', className)}>{children ?? 'not measured'}</span>;

/**
 * What a finding points at: a timestamp, a measured-value key, a QC topic.
 *
 * Rendered immediately before the claim it anchors. A finding without one of
 * these is an opinion, which is the distinction the whole evidence layer draws.
 */
export const Locator: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className,
}) => <span className={cx('locator', className)}>{children}</span>;

// ---------------------------------------------------------------------------
// Status
// ---------------------------------------------------------------------------

export type Status = 'ok' | 'caution' | 'blocking' | 'pending' | 'absent';

const STATUS_STYLE: Record<Status, { dot: string; text: string; bg: string }> = {
  // Jade, not accent. `ok` means a number came back and it was within spec —
  // the machine's statement about a file. Vermilion is reserved for the other
  // kind of thing entirely: something stopped and is waiting on a person. They
  // were the same colour under the old palette, which put "this measured fine"
  // and "approve this release" in the same ink on the same screen.
  ok: { dot: 'bg-ok', text: 'text-ok', bg: 'bg-[var(--ok-bg)]' },
  caution: { dot: 'bg-caution', text: 'text-caution', bg: 'bg-[var(--caution-bg)]' },
  blocking: { dot: 'bg-blocking', text: 'text-blocking', bg: 'bg-[var(--blocking-bg)]' },
  pending: { dot: 'bg-info', text: 'text-info', bg: 'bg-[var(--info-bg)]' },
  absent: { dot: 'bg-absent', text: 'text-absent', bg: 'bg-surface' },
};

export const StatusDot: React.FC<{ status: Status; className?: string }> = ({
  status,
  className,
}) => <span className={cx('inline-block w-1.5 h-1.5 rounded-full', STATUS_STYLE[status].dot, className)} />;

/**
 * A small labelled state.
 *
 * `blocking` is the only one that means a release cannot proceed. If everything
 * can be red the artist learns to approve past red, and the gate becomes
 * decorative — so `caution` exists for "read this first" and is not a weaker red.
 */
export const Badge: React.FC<{
  status: Status;
  children: React.ReactNode;
  className?: string;
}> = ({ status, children, className }) => (
  <span
    className={cx(
      'inline-flex items-center gap-1.5 rounded-md px-2 py-0.5',
      'font-mono text-[11px] uppercase tracking-wider',
      STATUS_STYLE[status].bg,
      STATUS_STYLE[status].text,
      className,
    )}
  >
    <StatusDot status={status} />
    {children}
  </span>
);

// ---------------------------------------------------------------------------
// Layout
// ---------------------------------------------------------------------------

/** A section heading. Consistent everywhere so tabs stop inventing their own. */
export const SectionTitle: React.FC<{
  children: React.ReactNode;
  hint?: React.ReactNode;
  className?: string;
}> = ({ children, hint, className }) => (
  <div className={cx('flex items-baseline justify-between gap-4', className)}>
    <h3 className="font-headline text-sm font-bold text-ink">{children}</h3>
    {hint ? <span className="font-mono text-[11px] text-dim">{hint}</span> : null}
  </div>
);

/**
 * Nothing here yet, said without pretending otherwise.
 *
 * Its own component because "no data" screens are where invented placeholder
 * content creeps in — a sample row, a fake chart — and this product cannot
 * afford a screen that shows a number nobody measured.
 */
export const Empty: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className,
}) => (
  <div className={cx('py-8 text-center font-body text-sm text-absent', className)}>{children}</div>
);
