import React, { useState } from 'react';
import {
  CheckCircle2,
  Clock,
  ChevronDown,
  ChevronUp,
  Sliders,
  BookOpen,
  Shield,
  Rocket,
  Sparkles,
  Flame,
  HelpCircle,
  XCircle,
  Loader2,
  SkipForward,
  RotateCcw,
  AlertTriangle
} from 'lucide-react';
import { TrackItem } from '../types';
import type { PipelineRun, StageResult, StageStatus } from '../lib/api';
import { stageLabel } from '../data/stageLabels';

interface PipelineProgressTrackerProps {
  /**
   * The real run. `undefined` means "not supplied" (fall back to
   * `track.activeRun`); `null` means "there is genuinely no run".
   */
  run?: PipelineRun | null;
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  /** Stage id to highlight, e.g. "qc_analysis". */
  activeStage?: string;
  className?: string;
  /**
   * Legacy prop, accepted and ignored.
   *
   * A TrackItem never carried a run; the old call sites drove this component
   * from mock checkpoint flags. The shell (App.tsx) owns run state and renders
   * the authoritative tracker on every tab, so an invocation that supplies
   * only `track` renders nothing rather than a second copy of the same run.
   * Pass `run` explicitly if a tab genuinely needs its own tracker.
   */
  track?: TrackItem;
}

const STATUS_TEXT: Record<StageStatus, string> = {
  pending: 'Pending',
  running: 'Running',
  awaiting_approval: 'Awaiting your approval',
  // Not "blocked" and not "failed": the stage declined to guess and named what
  // it needs. That is the system working, and the wording should not read like
  // something went wrong.
  awaiting_input: 'Waiting on you for something',
  approved: 'Approved',
  redo_requested: 'Redo requested',
  failed: 'Failed',
  skipped: 'Skipped'
};

/** Icon is pure decoration, picked from the stage id. Never from data. */
function iconForStage(stage: string) {
  const s = stage.toLowerCase();
  if (s.includes('lyric') || s.includes('prosody')) return BookOpen;
  if (s.includes('qc') || s.includes('mix') || s.includes('master') || s.includes('loud')) return Sliders;
  if (s.includes('split') || s.includes('right') || s.includes('clear')) return Shield;
  if (s.includes('release') || s.includes('deliver') || s.includes('distrib')) return Rocket;
  return Sparkles;
}

function StatusGlyph({ status }: { status: StageStatus }) {
  switch (status) {
    case 'approved':
      return <CheckCircle2 className="w-4 h-4 text-accent" />;
    case 'running':
      return <Loader2 className="w-4 h-4 text-caution animate-spin" />;
    case 'awaiting_approval':
      return <Flame className="w-4 h-4 text-accent-hover animate-pulse" />;
    case 'awaiting_input':
      return <HelpCircle className="w-4 h-4 text-caution animate-pulse" />;
    case 'redo_requested':
      return <RotateCcw className="w-4 h-4 text-caution" />;
    case 'failed':
      return <XCircle className="w-4 h-4 text-blocking" />;
    case 'skipped':
      return <SkipForward className="w-4 h-4 text-muted/70" />;
    default:
      return <Clock className="w-4 h-4 text-muted/50" />;
  }
}

/** Shared chrome so every state keeps the same footprint on the page. */
const Shell: React.FC<{ className?: string; children: React.ReactNode }> = ({ className = '', children }) => (
  <div className={`p-5 rounded-2xl bg-panel border border-line shadow-lg space-y-4 ${className}`}>
    {children}
  </div>
);

export const PipelineProgressTracker: React.FC<PipelineProgressTrackerProps> = ({
  run,
  loading = false,
  error = null,
  onRetry,
  activeStage,
  className = '',
  track
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  // Legacy `track`-only invocation: the shell is already showing this run.
  if (run === undefined && !loading && !error) return null;

  const resolvedRun: PipelineRun | null = run ?? null;

  if (loading && !resolvedRun) {
    return (
      <Shell className={className}>
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-bg border border-line flex-shrink-0">
            <Loader2 className="w-5 h-5 text-caution animate-spin" />
          </div>
          <div>
            <h3 className="font-serif text-sm font-bold text-ink">Pipeline Run</h3>
            <p className="font-mono text-xs text-muted">Loading run state from the orchestrator…</p>
          </div>
        </div>
        <div className="h-2.5 w-full bg-bg rounded-full border border-line" />
      </Shell>
    );
  }

  if (error) {
    return (
      <Shell className={className}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-bg border border-blocking/40 flex-shrink-0">
              <AlertTriangle className="w-5 h-5 text-blocking" />
            </div>
            <div className="min-w-0">
              <h3 className="font-serif text-sm font-bold text-ink">Pipeline run unavailable</h3>
              <p className="font-mono text-xs text-blocking break-words">{error}</p>
              <p className="font-mono text-[10px] text-dim mt-0.5">
                No progress is shown rather than a guessed one.
              </p>
            </div>
          </div>
          {onRetry && (
            <button
              onClick={onRetry}
              className="px-3 py-1.5 rounded-xl bg-bg hover:bg-surface border border-line text-xs font-mono text-muted hover:text-ink transition-colors self-start sm:self-center flex-shrink-0"
            >
              Retry
            </button>
          )}
        </div>
      </Shell>
    );
  }

  if (!resolvedRun) {
    return (
      <Shell className={className}>
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-bg border border-line flex-shrink-0">
            <Clock className="w-5 h-5 text-muted" />
          </div>
          <div className="min-w-0">
            <h3 className="font-serif text-sm font-bold text-ink">No pipeline run yet</h3>
            <p className="font-mono text-xs text-muted">
              Upload an audio artifact, then start a run from a template to see real stage progress.
            </p>
          </div>
        </div>
        <div className="h-2.5 w-full bg-bg rounded-full border border-line" />
      </Shell>
    );
  }

  const stages: StageResult[] = resolvedRun.stages ?? [];
  const totalStages = stages.length;
  const approvedCount = stages.filter((s) => s.status === 'approved').length;

  // Approved stages over total stages. Nothing weighted, nothing invented.
  const overallPercentage = totalStages > 0 ? Math.round((approvedCount / totalStages) * 100) : 0;

  const awaiting = stages.find((s) => s.status === 'awaiting_approval');
  const running = stages.find((s) => s.status === 'running');
  const failed = stages.find((s) => s.status === 'failed');

  const runBadge =
    resolvedRun.status === 'completed'
      ? { text: 'Run completed', cls: 'bg-accent/10 text-accent border-accent/30' }
      : resolvedRun.status === 'failed'
      ? { text: 'Run failed', cls: 'bg-blocking/10 text-blocking border-blocking/30' }
      : resolvedRun.status === 'paused'
      ? { text: 'Paused at checkpoint', cls: 'bg-[var(--accent-dim)] text-accent-hover border-[var(--accent-border)]' }
      : { text: 'Running', cls: 'bg-caution/10 text-caution border-caution/30' };

  const subline = failed
    ? `Failed at ${stageLabel(failed.stage)}`
    : awaiting
    ? `Waiting on you at ${stageLabel(awaiting.stage)}`
    : running
    ? `${stageLabel(running.stage)} is running`
    : resolvedRun.status === 'completed'
    ? 'All stages complete'
    : 'No stage currently active';

  return (
    <Shell className={className}>
      {/* Top Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="relative flex items-center justify-center w-12 h-12 rounded-xl bg-bg border border-line flex-shrink-0">
            {/* SVG Circular Ring Indicator */}
            <svg className="w-10 h-10 -rotate-90" viewBox="0 0 36 36">
              <path
                className="text-line"
                strokeWidth="3"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
              <path
                className="text-accent transition-all duration-700 ease-out"
                strokeDasharray={`${overallPercentage}, 100`}
                strokeWidth="3.2"
                strokeLinecap="round"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
            </svg>
            <span className="absolute font-mono text-xs font-bold text-ink">
              {overallPercentage}%
            </span>
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-serif text-sm font-bold text-ink">
                Pipeline Run · {resolvedRun.template}
              </h3>
              <span className={`px-2 py-0.5 rounded-full border font-mono text-[10px] font-bold ${runBadge.cls}`}>
                {runBadge.text}
              </span>
              {loading && <Loader2 className="w-3 h-3 text-dim animate-spin" />}
            </div>
            <p className="font-mono text-xs text-muted break-words">
              {approvedCount} of {totalStages} stages approved • {subline}
            </p>
            <p className="font-mono text-[10px] text-dim truncate">run {resolvedRun.id}</p>
          </div>
        </div>

        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-bg hover:bg-surface border border-line text-xs font-mono text-muted hover:text-ink transition-colors self-start sm:self-center flex-shrink-0"
        >
          <span>{isExpanded ? 'Hide Stages' : 'View Stages'}</span>
          {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Progress Bar */}
      <div className="space-y-1.5">
        <div className="h-2.5 w-full bg-bg rounded-full overflow-hidden border border-line p-0.5">
          <div
            className="h-full rounded-full bg-gradient-to-r from-accent via-caution to-accent transition-all duration-500 shadow-[0_0_12px_var(--accent-dim)]"
            style={{ width: `${overallPercentage}%` }}
          />
        </div>
      </div>

      {/* Expanded Stage Grid */}
      {isExpanded && (
        <div className="pt-3 border-t border-line grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {totalStages === 0 && (
            <p className="col-span-full font-mono text-xs text-muted">
              This run reported no stages.
            </p>
          )}
          {stages.map((st) => {
            const StageIcon = iconForStage(st.stage);
            const isCurrent = activeStage === st.stage || st.status === 'awaiting_approval' || st.status === 'running';
            return (
              <div
                key={st.stage}
                className={`p-3 rounded-xl border transition-all ${
                  isCurrent
                    ? 'bg-surface border-[var(--accent-border)] shadow-md ring-1 ring-[var(--accent-border)]'
                    : 'bg-bg border-line'
                }`}
                title={st.error ? `${STATUS_TEXT[st.status]} — ${st.error}` : STATUS_TEXT[st.status]}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="p-1.5 rounded-lg bg-panel border border-line text-caution">
                    <StageIcon className="w-3.5 h-3.5" />
                  </div>
                  <StatusGlyph status={st.status} />
                </div>
                <div className="font-serif text-xs font-bold text-ink break-words">
                  {stageLabel(st.stage)}
                </div>
                <div className="font-mono text-[10px] text-muted truncate mt-0.5">
                  {STATUS_TEXT[st.status]}
                  {st.attempt > 1 ? ` • attempt ${st.attempt}` : ''}
                </div>
                {st.error && (
                  <div className="font-mono text-[10px] text-blocking mt-1 line-clamp-2 break-words">
                    {st.error}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </Shell>
  );
};
