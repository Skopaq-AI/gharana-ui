import React, { useMemo, useState } from 'react';
import {
  Activity,
  AlignLeft,
  ArrowUpRight,
  ChevronDown,
  ChevronUp,
  Clock,
  Disc,
  EyeOff,
  ListChecks
} from 'lucide-react';
import type { Finding, FindingBasis, Locator, QCSeverity } from '../lib/api';
import {
  artifactLabel,
  formatMeasurement,
  formatTimeRange,
  humanizeMeasurementKey,
  type EvidenceView
} from '../lib/evidence';

/**
 * Render findings as anchored claims, and say what was dropped.
 *
 * This component is the product's difference made visible. A `Finding` is a
 * claim plus a `Locator` — the thing in the data plane it points at — and the
 * locator is rendered as the anchor it is: a time range as a timestamp, a
 * measured value as its name and (where the console holds it) its number, a QC
 * topic as a link to that issue, a lyric line as section plus line. "Your
 * chorus at 2:14 is 1.2 LU under the reference", not "the chorus feels thin".
 *
 * The one thing this file must never do is fill a gap. A locator names a
 * measurement; it does not carry its value. Where the console holds no value it
 * prints the measurement's NAME and stops. It does not reach for the QC
 * report's nearest-looking number, does not infer a unit from a key's spelling,
 * and has no default anywhere in it.
 */

// ---------------------------------------------------------------------------
// Basis — how far a claim can be trusted, said plainly
// ---------------------------------------------------------------------------

const BASIS_META: Record<FindingBasis, { label: string; className: string; title: string }> = {
  measured: {
    label: 'measured',
    className: 'bg-accent/15 text-accent border-accent/40',
    title: 'Backed by a number the pipeline measured.'
  },
  reference: {
    label: 'vs reference',
    className: 'bg-info/15 text-info border-info/40',
    title: 'Judged against a reference recording you supplied, not against an absolute standard.'
  },
  artist_stated: {
    label: 'your words',
    className: 'bg-caution/15 text-caution border-caution/40',
    title: 'Weighed against a goal you stated, not against anything measured.'
  }
};

const SEVERITY_DOT: Record<QCSeverity, string> = {
  info: 'bg-muted',
  minor: 'bg-caution',
  major: 'bg-accent-hover',
  blocking: 'bg-accent'
};

// ---------------------------------------------------------------------------
// The anchor
// ---------------------------------------------------------------------------

interface AnchorProps {
  locator: Locator;
  evidence: EvidenceView;
  /** Provided only where a QC topic can actually be navigated to. */
  onOpenQCIssue?: (topic: string) => void;
}

const CHIP =
  'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg border font-mono-num text-[11px] max-w-full';

const LocatorAnchor: React.FC<AnchorProps> = ({ locator, evidence, onOpenQCIssue }) => {
  switch (locator.kind) {
    case 'time_range':
      return (
        <span className={`${CHIP} bg-bg border-line-strong text-caution`}>
          <Clock className="w-3 h-3 flex-shrink-0" />
          <span>{formatTimeRange(locator)}</span>
        </span>
      );

    case 'measured_value': {
      const held = evidence.measured[locator.key];
      return (
        <span
          className={`${CHIP} bg-bg border-accent/35 text-accent`}
          title={
            held
              ? `${held.label} — measured by the qc_analysis stage`
              : `${locator.key} — measured upstream; this screen holds no copy of the value`
          }
        >
          <Activity className="w-3 h-3 flex-shrink-0" />
          {held ? (
            <>
              <span className="text-muted">{held.label}</span>
              <span className="text-ink font-semibold">{formatMeasurement(held)}</span>
            </>
          ) : (
            // No value here, and none invented. The name is the anchor.
            <span className="text-muted truncate">{humanizeMeasurementKey(locator.key)}</span>
          )}
        </span>
      );
    }

    case 'qc_issue': {
      const issue = evidence.qcIssues[locator.topic];
      const dot = issue ? SEVERITY_DOT[issue.severity] ?? 'bg-muted' : 'bg-dim';
      const body = (
        <>
          <ListChecks className="w-3 h-3 flex-shrink-0" />
          <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${dot}`} />
          <span className="truncate">{locator.topic}</span>
          {onOpenQCIssue && <ArrowUpRight className="w-3 h-3 flex-shrink-0 opacity-70" />}
        </>
      );
      if (!onOpenQCIssue) {
        return (
          <span
            className={`${CHIP} bg-bg border-line-strong text-muted`}
            title="Raised by the qc_analysis stage."
          >
            {body}
          </span>
        );
      }
      return (
        <button
          type="button"
          onClick={() => onOpenQCIssue(locator.topic)}
          className={`${CHIP} bg-bg border-line-strong text-ink hover:border-accent hover:text-accent transition-colors`}
          title={
            issue
              ? `${issue.severity} · open this issue in Mix QC`
              : 'Open the Mix QC issue list'
          }
        >
          {body}
        </button>
      );
    }

    case 'lyric_line': {
      const lines = evidence.lyricSections[locator.section];
      const text = lines?.[locator.index];
      return (
        <span
          className={`${CHIP} bg-bg border-line-strong text-info`}
          title={text ? `${locator.section}, line ${locator.index + 1}` : undefined}
        >
          <AlignLeft className="w-3 h-3 flex-shrink-0" />
          <span className="truncate">
            {locator.section} · line {locator.index + 1}
          </span>
          {/* The line itself only when a draft is genuinely on screen. */}
          {text && <span className="text-ink truncate">“{text}”</span>}
        </span>
      );
    }

    case 'reference_track': {
      const artifact = evidence.artifacts[locator.artifact_id];
      return (
        <span
          className={`${CHIP} bg-bg border-info/35 text-info`}
          title={`reference artifact ${locator.artifact_id}`}
        >
          <Disc className="w-3 h-3 flex-shrink-0" />
          <span className="truncate">
            {artifact ? artifactLabel(artifact) : `reference ${locator.artifact_id.slice(0, 8)}`}
          </span>
        </span>
      );
    }
  }
};

// ---------------------------------------------------------------------------
// One finding
// ---------------------------------------------------------------------------

interface FindingRowProps {
  finding: Finding;
  evidence: EvidenceView;
  onOpenQCIssue?: (topic: string) => void;
}

export const FindingRow: React.FC<FindingRowProps> = ({ finding, evidence, onOpenQCIssue }) => {
  const basis = BASIS_META[finding.basis];
  return (
    <li className="p-3.5 rounded-xl bg-bg border border-line space-y-2">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <LocatorAnchor
          locator={finding.locator}
          evidence={evidence}
          onOpenQCIssue={onOpenQCIssue}
        />
        <span
          className={`px-2 py-0.5 rounded-full border font-mono text-[10px] uppercase tracking-wider flex-shrink-0 ${basis.className}`}
          title={basis.title}
        >
          {basis.label}
        </span>
      </div>
      <p className="text-xs font-sans text-ink leading-relaxed break-words">{finding.claim}</p>
    </li>
  );
};

// ---------------------------------------------------------------------------
// The list
// ---------------------------------------------------------------------------

interface FindingListProps {
  findings: Finding[];
  evidence: EvidenceView;
  onOpenQCIssue?: (topic: string) => void;
  /** Shown when the list is empty. Say what the emptiness means, not "none". */
  emptyNote?: string;
}

export const FindingList: React.FC<FindingListProps> = ({
  findings,
  evidence,
  onOpenQCIssue,
  emptyNote
}) => {
  if (findings.length === 0) {
    return (
      <div className="p-6 text-center bg-bg rounded-xl border border-line text-xs font-mono text-muted leading-relaxed">
        {emptyNote ??
          'Nothing here pointed at anything in your project, so there is nothing to show.'}
      </div>
    );
  }
  return (
    <ul className="space-y-2.5">
      {findings.map((finding, idx) => (
        <FindingRow
          key={`${finding.locator.kind}-${idx}`}
          finding={finding}
          evidence={evidence}
          onOpenQCIssue={onOpenQCIssue}
        />
      ))}
    </ul>
  );
};

// ---------------------------------------------------------------------------
// What was dropped
// ---------------------------------------------------------------------------

interface DroppedFindingsNoteProps {
  /** `ReadinessScore.dropped_findings`, plus anything this console rejected. */
  dropped: string[];
  className?: string;
}

/**
 * Surface dropped claims honestly and quietly.
 *
 * This is not an error state and must not read like one: no vermilion, no
 * warning triangle, no count in a red pill. A drop means a claim pointed at
 * something the project does not contain and was removed before the artist read
 * it — the guard doing exactly its job. It stays collapsed by default and
 * available in one click, because the artist should be able to see the shape of
 * what the agent got wrong without being asked to care about it.
 */
export const DroppedFindingsNote: React.FC<DroppedFindingsNoteProps> = ({
  dropped,
  className = ''
}) => {
  const [open, setOpen] = useState(false);
  const items = useMemo(() => dropped.filter((d) => typeof d === 'string' && d.trim()), [dropped]);
  if (items.length === 0) return null;

  return (
    <div className={`rounded-xl bg-bg border border-line ${className}`}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 px-3.5 py-2.5 text-left text-dim hover:text-muted transition-colors"
      >
        <EyeOff className="w-3.5 h-3.5 flex-shrink-0" />
        <span className="font-mono text-[11px] flex-1 min-w-0">
          {items.length} claim{items.length === 1 ? '' : 's'} withheld — the evidence did not
          resolve
        </span>
        {open ? (
          <ChevronUp className="w-3.5 h-3.5 flex-shrink-0" />
        ) : (
          <ChevronDown className="w-3.5 h-3.5 flex-shrink-0" />
        )}
      </button>

      {open && (
        <div className="px-3.5 pb-3.5 space-y-2">
          <p className="font-mono text-[11px] text-dim leading-relaxed">
            Each of these pointed at something your project does not contain — a timestamp past the
            end of the track, a measurement nothing produced, a QC topic that was never raised. They
            were removed before you read them. Nothing here needs fixing on your side.
          </p>
          <ul className="space-y-1.5">
            {items.map((item, idx) => (
              <li
                key={idx}
                className="font-mono text-[11px] text-dim bg-bg border border-line rounded-lg px-3 py-2 break-words leading-relaxed"
              >
                {item}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};
