import React, { useState } from 'react';
import {
  ShieldAlert,
  CheckCircle2,
  XCircle,
  MessageSquare,
  Flame,
  Smartphone,
  Loader2,
  AlertTriangle,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { CheckpointStatus, TrackItem } from '../types';
import type { StageResult } from '../lib/api';
import { stageLabel } from '../data/stageLabels';
import { MobileApprovalModal } from './MobileApprovalModal';

interface HumanCheckpointCardProps {
  // --- Real pipeline mode -------------------------------------------------
  /** The stage that is paused at a human checkpoint. */
  stage?: StageResult;
  /** Run the stage belongs to — shown so the artist knows what they signed. */
  runId?: string;
  /** Wired to approveStage(runId, stage) by the caller. Must resolve/reject. */
  onApproveStage?: (stage: string) => Promise<void>;
  /** Wired to redoStage(runId, stage) by the caller. */
  onRedoStage?: (stage: string) => Promise<void>;

  // --- Shared -------------------------------------------------------------
  agentName?: string;
  onInspectRawPayload?: () => void;
  /**
   * Track-shaped object for the WhatsApp preview. Loose on purpose: callers
   * assemble it from whatever real data they hold. It is only used when it
   * carries a measured `audioMetrics.integratedLufs`.
   */
  trackForMobile?: TrackItem | Record<string, any> | null;
  className?: string;

  // --- Legacy presentational mode ----------------------------------------
  // Kept only so the tab files (owned elsewhere) keep compiling until they are
  // migrated onto `stage`. Delete these once no caller passes them.
  title?: string;
  recommendation?: string;
  status?: CheckpointStatus;
  onApprove?: () => void;
  onReject?: () => void;
  onAddNote?: (note: string) => void;
}

/**
 * Pull a human sentence out of a stage output without inventing one.
 * Returns null when the output has no prose — the caller then says so rather
 * than filling the gap with a plausible-sounding summary.
 */
function summarizeOutput(output: Record<string, unknown> | null | undefined): string | null {
  if (!output) return null;
  const direct = output.summary ?? output.verdict ?? output.message ?? output.text;
  if (typeof direct === 'string' && direct.trim()) return direct.trim();

  // Findings first: `reasons: string[]` is gone from ReadinessScore, replaced by
  // anchored claims. Only the claim text is joined here — this card is a
  // one-line preview, and the locators are rendered properly by FindingList on
  // the tab itself. The `reasons` branch stays for agent outputs that still
  // carry one; it costs a line and its absence would blank out those cards.
  const findings = output.findings;
  if (Array.isArray(findings)) {
    const claims = findings
      .map((f) =>
        f && typeof f === 'object' && typeof (f as { claim?: unknown }).claim === 'string'
          ? ((f as { claim: string }).claim ?? '').trim()
          : ''
      )
      .filter(Boolean);
    if (claims.length) return claims.join(' • ');
  }

  const reasons = output.reasons;
  if (Array.isArray(reasons)) {
    const lines = reasons.filter((r): r is string => typeof r === 'string' && !!r.trim());
    if (lines.length) return lines.join(' • ');
  }

  // One level down: outputs are sometimes wrapped, e.g. { qc_report: {...} }.
  for (const value of Object.values(output)) {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      const nested = summarizeOutput(value as Record<string, unknown>);
      if (nested) return nested;
    }
  }
  return null;
}

export const HumanCheckpointCard: React.FC<HumanCheckpointCardProps> = ({
  stage,
  runId,
  onApproveStage,
  onRedoStage,
  agentName = 'GHARANA AI Agent',
  onInspectRawPayload,
  trackForMobile,
  className = '',
  title,
  recommendation,
  status,
  onApprove,
  onReject,
  onAddNote
}) => {
  const [showNoteInput, setShowNoteInput] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [isMobileModalOpen, setIsMobileModalOpen] = useState(false);
  const [showOutput, setShowOutput] = useState(false);
  const [busy, setBusy] = useState<null | 'approve' | 'redo'>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const stageMode = Boolean(stage);

  // A checkpoint card exists to collect a decision. In stage mode it renders
  // only while the run is genuinely paused on this stage.
  if (stageMode && stage!.status !== 'awaiting_approval') return null;

  const effectiveStatus: CheckpointStatus = stageMode
    ? 'pending_artist_approval'
    : status ?? 'pending_artist_approval';
  const isPending = effectiveStatus === 'pending_artist_approval';

  const heading = stageMode ? stageLabel(stage!.stage) : title ?? 'Human Approval Checkpoint';
  const summary = stageMode ? summarizeOutput(stage!.output) : recommendation ?? null;

  const runAction = async (kind: 'approve' | 'redo') => {
    if (!stage) return;
    const handler = kind === 'approve' ? onApproveStage : onRedoStage;
    if (!handler) return;
    setActionError(null);
    setBusy(kind);
    try {
      await handler(stage.stage);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(null);
    }
  };

  const handleApproveClick = () => {
    if (stageMode) void runAction('approve');
    else onApprove?.();
  };

  const handleRedoClick = () => {
    if (stageMode) void runAction('redo');
    else onReject?.();
  };

  // MobileApprovalModal renders loudness figures and falls back to canned
  // numbers when a track has none, so it is only offered for tracks that have
  // been measured. No measurement, no preview — better than a pretty fiction.
  const mobileCandidate = trackForMobile as TrackItem | null | undefined;
  const mobileTrack =
    mobileCandidate && mobileCandidate.audioMetrics?.integratedLufs !== undefined ? mobileCandidate : null;

  return (
    <div
      className={`p-5 rounded-2xl glass-panel relative overflow-hidden transition-all ${
        isPending
          ? 'ember-pulse bg-surface/80'
          : effectiveStatus === 'approved'
          ? 'border-accent/50 bg-bg/60'
          : 'border-line-strong/60 bg-bg/40'
      } ${className}`}
    >
      {/* Background warm ember highlight */}
      {isPending && (
        <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--accent-dim)] rounded-full blur-2xl pointer-events-none" />
      )}

      {/*
        Layout: the text column gets flex-1 + min-w-0 so a stage title wraps
        like a sentence instead of one word per line, and the action cluster
        drops below it until there is room for both side by side.
      */}
      <div className="flex flex-col xl:flex-row xl:items-start justify-between gap-4 relative z-10">
        <div className="flex items-start gap-3.5 flex-1 min-w-0">
          <div
            className={`p-2.5 rounded-xl flex-shrink-0 ${
              isPending
                ? 'bg-[var(--accent-dim)] text-accent-hover border border-[var(--accent-border)]'
                : effectiveStatus === 'approved'
                ? 'bg-accent/20 text-accent border border-accent/40'
                : 'bg-line text-muted'
            }`}
          >
            {isPending ? (
              <Flame className="w-5 h-5 animate-pulse text-accent-hover" />
            ) : effectiveStatus === 'approved' ? (
              <CheckCircle2 className="w-5 h-5 text-accent" />
            ) : (
              <ShieldAlert className="w-5 h-5 text-muted" />
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] font-mono-num uppercase tracking-wider px-2 py-0.5 rounded-full bg-line text-caution border border-caution/20">
                Human Approval Checkpoint
              </span>
              <span className="text-xs text-muted font-mono-num">{agentName}</span>
              {stageMode && stage!.attempt > 1 && (
                <span className="text-[10px] font-mono-num text-caution px-2 py-0.5 rounded-full bg-surface border border-line-strong">
                  attempt {stage!.attempt}
                </span>
              )}
            </div>

            <h4 className="font-serif text-base font-semibold text-ink mt-1 break-words">
              {heading}
            </h4>

            {stageMode && (
              <p className="font-mono-num text-[10px] text-dim mt-0.5 break-all">
                stage <span className="text-muted">{stage!.stage}</span>
                {runId ? <> • run <span className="text-muted">{runId}</span></> : null}
              </p>
            )}

            {summary ? (
              <p className="text-sm font-serif text-ink/90 mt-1.5 leading-relaxed break-words">
                "{summary}"
              </p>
            ) : (
              <p className="text-sm font-serif text-muted mt-1.5 leading-relaxed italic">
                This stage produced no written summary. Read the raw stage output before approving.
              </p>
            )}

            {stageMode && stage!.error && (
              <p className="mt-2 text-xs font-mono-num text-blocking break-words">
                Stage error: {stage!.error}
              </p>
            )}

            {stageMode && stage!.output && (
              <div className="mt-3">
                <button
                  onClick={() => setShowOutput(!showOutput)}
                  className="flex items-center gap-1.5 text-[11px] font-mono-num text-muted hover:text-ink transition-colors"
                >
                  {showOutput ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  <span>{showOutput ? 'Hide stage output' : 'Show stage output'}</span>
                </button>
                {showOutput && (
                  <pre className="mt-2 max-h-56 overflow-auto rounded-xl bg-bg border border-line p-3 text-[11px] leading-relaxed font-mono-num text-muted whitespace-pre-wrap break-words">
                    {JSON.stringify(stage!.output, null, 2)}
                  </pre>
                )}
              </div>
            )}

            {actionError && (
              <p className="mt-3 flex items-start gap-1.5 text-xs font-mono-num text-blocking break-words">
                <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                <span>{actionError}</span>
              </p>
            )}
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 flex-wrap xl:justify-end xl:flex-shrink-0 xl:max-w-[420px]">
          <button
            onClick={() => setIsMobileModalOpen(true)}
            disabled={!mobileTrack}
            className="px-3 py-1.5 rounded-lg bg-whatsapp/20 hover:bg-whatsapp/30 border border-whatsapp/40 text-xs font-mono text-whatsapp transition-colors flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
            title={
              mobileTrack
                ? 'Open WhatsApp Mobile Approval View'
                : 'Mobile approval preview needs a measured QC report for this project'
            }
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>Mobile Approval View</span>
          </button>

          {onInspectRawPayload && (
            <button
              onClick={onInspectRawPayload}
              className="text-xs text-muted hover:text-ink underline underline-offset-4 px-2 py-1 font-mono-num"
            >
              Inspect Agent Payload
            </button>
          )}

          {isPending ? (
            <>
              {!stageMode && (
                <button
                  onClick={() => setShowNoteInput(!showNoteInput)}
                  className="px-3 py-1.5 rounded-lg bg-line hover:bg-line-strong border border-line-strong text-xs font-sans text-muted hover:text-ink transition-colors flex items-center gap-1.5"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Note</span>
                </button>
              )}

              <button
                onClick={handleRedoClick}
                disabled={busy !== null}
                className="px-3 py-1.5 rounded-lg bg-surface hover:bg-line border border-line-strong text-xs font-sans text-muted hover:text-accent transition-colors flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {busy === 'redo' ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <XCircle className="w-3.5 h-3.5" />
                )}
                <span>{busy === 'redo' ? 'Requesting redo…' : 'Redo'}</span>
              </button>

              <button
                onClick={handleApproveClick}
                disabled={busy !== null}
                className="px-4 py-1.5 rounded-lg bg-accent hover:bg-accent-hover text-xs font-sans font-semibold text-accent-on shadow-lg shadow-[var(--accent-dim)] transition-all flex items-center gap-1.5 uppercase tracking-wider disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {busy === 'approve' ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-3.5 h-3.5" />
                )}
                <span>{busy === 'approve' ? 'Approving…' : 'Approve & Lock'}</span>
              </button>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <span
                className={`px-3 py-1 rounded-lg text-xs font-mono-num border ${
                  effectiveStatus === 'approved'
                    ? 'bg-accent/20 text-accent border-accent/40'
                    : 'bg-surface text-muted border-line-strong'
                }`}
              >
                {effectiveStatus === 'approved' ? 'APPROVED BY ARTIST' : 'REJECTED'}
              </span>
              {onApprove && (
                <button
                  onClick={onApprove}
                  className="text-xs text-muted hover:text-ink underline font-mono-num ml-1"
                >
                  Reopen
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Mobile Approval Modal — only for measured tracks (see mobileTrack). */}
      {mobileTrack && (
        <MobileApprovalModal
          track={mobileTrack}
          stageTitle={heading}
          agentName={agentName}
          narratedSummary={summary ?? undefined}
          isOpen={isMobileModalOpen}
          onClose={() => setIsMobileModalOpen(false)}
          onApprove={handleApproveClick}
          onReject={handleRedoClick}
          onInspectRawPayload={onInspectRawPayload || (() => {})}
        />
      )}

      {/* Optional Note Drawer (legacy mode only) */}
      {showNoteInput && isPending && !stageMode && (
        <div className="mt-4 pt-3 border-t border-line-strong/60 flex gap-2">
          <input
            type="text"
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            placeholder="Add studio note for this checkpoint (e.g. 'I trimmed the vocal 1dB in FL Studio')..."
            className="flex-1 bg-bg border border-line-strong rounded-lg px-3 py-1.5 text-xs text-ink focus:outline-none focus:border-caution"
          />
          <button
            onClick={() => {
              if (onAddNote && noteText) {
                onAddNote(noteText);
                setNoteText('');
                setShowNoteInput(false);
              }
            }}
            className="px-3 py-1.5 bg-caution text-bg font-semibold text-xs rounded-lg hover:bg-caution"
          >
            Save
          </button>
        </div>
      )}
    </div>
  );
};
