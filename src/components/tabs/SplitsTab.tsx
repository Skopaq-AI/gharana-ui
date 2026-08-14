import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Shield,
  AlertTriangle,
  CheckCircle2,
  Link2,
  Lock,
  Unlock,
  Key,
  FileText,
  Clock,
  Code2,
  Check,
  RefreshCw,
  Flame,
  XCircle,
  Users,
  ShieldAlert
} from 'lucide-react';
import { TrackItem } from '../../types';
import { PageHeader } from '../SectionPanel';
import {
  ApiError,
  approveStage,
  getRun,
  listProjects,
  listRuns,
  redoStage,
  type PipelineRun,
  type Project,
  type ReleaseMetadata,
  type RunSummary,
  type SplitParty,
  type SplitSheet,
  type StageResult
} from '../../lib/api';

/**
 * Rights & Splits.
 *
 * Everything shown here is the output of a pipeline run's rights stage
 * (`rights_splits.create_split_sheet`). Nothing on this screen is computed in
 * the browser except the per-side totals, which are summed from the parties the
 * backend returned. There is no local editing: the orchestrator dispatches
 * create_split_sheet with `project_id` alone, so a slider here would move a
 * number that never reaches the backend.
 */

/** Stage names that carry a SplitSheet in the shipped templates. */
const RIGHTS_STAGE_NAMES = ['rights', 'rights_clearance'];
/** Stage names that carry ReleaseMetadata (source of ISRC/UPC, when present). */
const RELEASE_STAGE_NAMES = ['release', 'sync_pitch_package'];

/** How often an in-flight run is re-polled. */
const POLL_MS = 5000;

/**
 * The rights stage returns a SplitSheet plus two extra keys the agent adds:
 * the validator's problem list and the hash-chained ledger receipt.
 */
interface RightsStageOutput extends SplitSheet {
  validation_problems?: string[];
  ledger?: {
    id?: string | null;
    event_type?: string;
    prev_hash?: string | null;
    hash?: string | null;
    created_at?: string | null;
    persisted?: boolean;
    error?: string;
  };
}

export function describeError(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.status === 401 || err.status === 403) {
      return `Gateway rejected the request (${err.status}). The console's server-side GHARANA_API_KEY is missing or wrong.`;
    }
    if (err.status === 0) return err.detail;
    return `${err.status} — ${err.detail}`;
  }
  return err instanceof Error ? err.message : String(err);
}

function isSplitSheetOutput(output: Record<string, unknown> | null): boolean {
  return Boolean(output && Array.isArray((output as { parties?: unknown }).parties));
}

function isReleaseMetadataOutput(output: Record<string, unknown> | null): boolean {
  return Boolean(output && 'ai_manifest' in output && 'validation_problems' in output);
}

export function findStage(
  run: PipelineRun | null,
  names: string[],
  shapeMatches: (output: Record<string, unknown> | null) => boolean
): StageResult | null {
  if (!run) return null;
  const byName = run.stages.find((s) => names.includes(s.stage));
  if (byName) return byName;
  return run.stages.find((s) => shapeMatches(s.output)) ?? null;
}

/** 0.01 tolerance: shares are floats on the wire, 33.33 * 3 is never exactly 100. */
function isHundred(total: number): boolean {
  return Math.abs(total - 100) < 0.01;
}

function formatPct(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(2).replace(/0+$/, '').replace(/\.$/, '');
}

export function formatTimestamp(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString();
}

export const STAGE_STATUS_STYLE: Record<string, string> = {
  pending: 'bg-surface text-muted border-line-strong',
  running: 'bg-info/20 text-info border-info/40',
  awaiting_approval: 'bg-caution/20 text-caution border-caution/40',
  approved: 'bg-accent/20 text-accent border-accent/40',
  redo_requested: 'bg-[var(--accent-dim)] text-accent-hover border-[var(--accent-border)]',
  failed: 'bg-[var(--accent-dim)] text-accent-hover border-accent',
  skipped: 'bg-surface text-dim border-line-strong'
};

// ---------------------------------------------------------------------------
// Shared shell: project picker, run picker, load/empty/error states
// ---------------------------------------------------------------------------

export interface RunContext {
  projects: Project[] | null;
  projectsError: string | null;
  projectId: string | null;
  setProjectId: (id: string) => void;
  runs: RunSummary[] | null;
  runsError: string | null;
  runId: string | null;
  setRunId: (id: string) => void;
  run: PipelineRun | null;
  runError: string | null;
  runLoading: boolean;
  refreshRun: () => void;
  applyRun: (updated: PipelineRun) => void;
}

export function useRunContext(preferredProjectId?: string | null): RunContext {
  const [projects, setProjects] = useState<Project[] | null>(null);
  const [projectsError, setProjectsError] = useState<string | null>(null);
  const [projectId, setProjectId] = useState<string | null>(preferredProjectId ?? null);

  const [runs, setRuns] = useState<RunSummary[] | null>(null);
  const [runsError, setRunsError] = useState<string | null>(null);
  const [runId, setRunId] = useState<string | null>(null);

  const [run, setRun] = useState<PipelineRun | null>(null);
  const [runError, setRunError] = useState<string | null>(null);
  const [runLoading, setRunLoading] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setProjectsError(null);
    listProjects()
      .then((rows) => {
        if (cancelled) return;
        setProjects(rows);
        setProjectId((current) => current ?? rows[0]?.id ?? null);
      })
      .catch((err) => {
        if (cancelled) return;
        setProjectsError(describeError(err));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // The shell owns project selection when it passes one in; follow it.
  useEffect(() => {
    if (preferredProjectId) setProjectId(preferredProjectId);
  }, [preferredProjectId]);

  // Switching project invalidates the run list and the loaded run. Kept
  // separate from the fetch below so a plain Refresh does not yank the artist
  // off a run they deliberately selected.
  useEffect(() => {
    setRuns(null);
    setRunsError(null);
    setRunId(null);
    setRun(null);
  }, [projectId]);

  useEffect(() => {
    if (!projectId) return;
    let cancelled = false;
    setRunsError(null);
    listRuns(projectId)
      .then((rows) => {
        if (cancelled) return;
        const ordered = [...rows].sort((a, b) =>
          String(b.created_at ?? '').localeCompare(String(a.created_at ?? ''))
        );
        setRuns(ordered);
        setRunId((prev) =>
          prev && ordered.some((r) => r.id === prev) ? prev : ordered[0]?.id ?? null
        );
      })
      .catch((err) => {
        if (cancelled) return;
        setRunsError(describeError(err));
      });
    return () => {
      cancelled = true;
    };
  }, [projectId, reloadToken]);

  useEffect(() => {
    if (!runId) return;
    let cancelled = false;
    setRun(null);
    setRunLoading(true);
    setRunError(null);
    getRun(runId)
      .then((r) => {
        if (!cancelled) setRun(r);
      })
      .catch((err) => {
        if (!cancelled) setRunError(describeError(err));
      })
      .finally(() => {
        if (!cancelled) setRunLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [runId, reloadToken]);

  // Poll only while the run can still change. Stops on completed / failed.
  const isActive = run ? run.status === 'running' || run.status === 'paused' : false;
  useEffect(() => {
    if (!runId || !isActive) return;
    const timer = setInterval(() => {
      getRun(runId)
        .then((r) => setRun(r))
        .catch((err) => setRunError(describeError(err)));
    }, POLL_MS);
    return () => clearInterval(timer);
  }, [runId, isActive]);

  const refreshRun = useCallback(() => setReloadToken((n) => n + 1), []);
  const applyRun = useCallback((updated: PipelineRun) => setRun(updated), []);

  return {
    projects,
    projectsError,
    projectId,
    setProjectId,
    runs,
    runsError,
    runId,
    setRunId,
    run,
    runError,
    runLoading,
    refreshRun,
    applyRun
  };
}

export const RunContextBar: React.FC<{
  ctx: RunContext;
  stageLabel: string;
  /** False when the app shell already owns project selection (header picker). */
  showProjectPicker?: boolean;
}> = ({ ctx, stageLabel, showProjectPicker = true }) => {
  const activeProject = ctx.projects?.find((p) => p.id === ctx.projectId) ?? null;

  return (
    <div className="p-4 glass-panel rounded-2xl border border-line-strong flex flex-col lg:flex-row lg:items-center gap-4 justify-between">
      <div className="flex flex-col sm:flex-row gap-4 flex-1 min-w-0">
        <div className="space-y-1 min-w-0 flex-1">
          <label className="text-[10px] font-mono text-dim uppercase tracking-wider block">
            Project
          </label>
          {ctx.projects === null && !ctx.projectsError ? (
            <div className="h-9 flex items-center gap-2 font-mono text-xs text-muted">
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-info" />
              <span>Loading projects…</span>
            </div>
          ) : !showProjectPicker ? (
            <div className="h-9 flex items-center font-serif text-sm text-ink truncate">
              {activeProject ? `${activeProject.title} — ${activeProject.artist_name}` : '—'}
            </div>
          ) : ctx.projects && ctx.projects.length > 0 ? (
            <select
              value={ctx.projectId ?? ''}
              onChange={(e) => ctx.setProjectId(e.target.value)}
              className="w-full bg-bg border border-line-strong rounded-xl px-3 py-2 font-serif text-sm text-ink focus:outline-none focus:border-caution"
            >
              {ctx.projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title} — {p.artist_name}
                </option>
              ))}
            </select>
          ) : (
            <div className="h-9 flex items-center font-mono text-xs text-muted">
              No projects in the backend yet.
            </div>
          )}
        </div>

        <div className="space-y-1 min-w-0 flex-1">
          <label className="text-[10px] font-mono text-dim uppercase tracking-wider block">
            Pipeline Run
          </label>
          {ctx.runs === null && ctx.projectId && !ctx.runsError ? (
            <div className="h-9 flex items-center gap-2 font-mono text-xs text-muted">
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-info" />
              <span>Loading runs…</span>
            </div>
          ) : ctx.runs && ctx.runs.length > 0 ? (
            <select
              value={ctx.runId ?? ''}
              onChange={(e) => ctx.setRunId(e.target.value)}
              className="w-full bg-bg border border-line-strong rounded-xl px-3 py-2 font-mono text-xs text-caution focus:outline-none focus:border-caution"
            >
              {ctx.runs.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.template} • {r.status} • {formatTimestamp(r.created_at)}
                </option>
              ))}
            </select>
          ) : (
            <div className="h-9 flex items-center font-mono text-xs text-muted">
              {ctx.projectId ? 'No runs for this project yet.' : '—'}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3 flex-shrink-0">
        <span className="font-mono text-[10px] text-dim uppercase tracking-wider hidden xl:block">
          {stageLabel}
        </span>
        <button
          onClick={ctx.refreshRun}
          className="px-3 py-2 rounded-xl bg-surface hover:bg-line border border-line-strong text-muted hover:text-ink font-mono text-xs flex items-center gap-2 transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${ctx.runLoading ? 'animate-spin text-info' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {activeProject && (
        <span className="font-mono text-[10px] text-dim truncate lg:hidden">
          {activeProject.id}
        </span>
      )}
    </div>
  );
};

export const EmptyPanel: React.FC<{
  tone?: 'neutral' | 'error';
  icon?: React.ReactNode;
  title: string;
  children?: React.ReactNode;
}> = ({ tone = 'neutral', icon, title, children }) => (
  <div
    className={`p-8 rounded-3xl border text-center space-y-3 ${
      tone === 'error'
        ? 'bg-blocking/80 border-[var(--accent-border)]'
        : 'bg-bg/70 border-dashed border-line-strong'
    }`}
  >
    <div className="flex justify-center">
      {icon ?? <Shield className={`w-7 h-7 ${tone === 'error' ? 'text-accent' : 'text-dim'}`} />}
    </div>
    <h3
      className={`font-serif text-base font-bold ${
        tone === 'error' ? 'text-accent-hover' : 'text-ink'
      }`}
    >
      {title}
    </h3>
    <div className="font-serif text-xs text-muted max-w-xl mx-auto leading-relaxed space-y-2">
      {children}
    </div>
  </div>
);

/**
 * Approve / redo bar for a real checkpoint stage.
 *
 * Deliberately not `HumanCheckpointCard`: that component opens a mobile modal
 * carrying hard-coded LUFS and true-peak numbers, and this screen must never
 * put an invented measurement on screen.
 */
export const StageCheckpointBar: React.FC<{
  title: string;
  agentLabel: string;
  stage: StageResult;
  summary: string;
  busy: boolean;
  actionError: string | null;
  onApprove: () => void;
  onRedo: () => void;
  onInspect?: () => void;
}> = ({ title, agentLabel, stage, summary, busy, actionError, onApprove, onRedo, onInspect }) => {
  const awaiting = stage.status === 'awaiting_approval';

  return (
    <div
      className={`p-5 rounded-2xl glass-panel relative overflow-hidden transition-all ${
        awaiting
          ? 'ember-pulse bg-surface/80'
          : stage.status === 'approved'
          ? 'border-accent/50 bg-bg/60'
          : 'border-line-strong/60 bg-bg/40'
      }`}
    >
      {awaiting && (
        <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--accent-dim)] rounded-full blur-2xl pointer-events-none" />
      )}

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
        <div className="flex items-start gap-3.5">
          <div
            className={`p-2.5 rounded-xl flex-shrink-0 ${
              awaiting
                ? 'bg-[var(--accent-dim)] text-accent-hover border border-[var(--accent-border)]'
                : stage.status === 'approved'
                ? 'bg-accent/20 text-accent border border-accent/40'
                : 'bg-line text-muted'
            }`}
          >
            {awaiting ? (
              <Flame className="w-5 h-5 animate-pulse text-accent-hover" />
            ) : stage.status === 'approved' ? (
              <CheckCircle2 className="w-5 h-5 text-accent" />
            ) : (
              <ShieldAlert className="w-5 h-5 text-muted" />
            )}
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] font-mono-num uppercase tracking-wider px-2 py-0.5 rounded-full bg-line text-caution border border-caution/20">
                Human Approval Checkpoint
              </span>
              <span className="text-xs text-muted font-mono-num">{agentLabel}</span>
              <span
                className={`text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded border ${
                  STAGE_STATUS_STYLE[stage.status] ?? STAGE_STATUS_STYLE.pending
                }`}
              >
                stage: {stage.stage} • {stage.status.replace(/_/g, ' ')} • attempt {stage.attempt}
              </span>
            </div>

            <h4 className="font-serif text-base font-semibold text-ink mt-1">{title}</h4>
            <p className="text-sm font-serif text-ink/90 mt-1.5 leading-relaxed">{summary}</p>
            {actionError && (
              <p className="text-xs font-mono text-accent-hover mt-2">{actionError}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap justify-end flex-shrink-0">
          {onInspect && (
            <button
              onClick={onInspect}
              className="text-xs text-muted hover:text-ink underline underline-offset-4 px-2 py-1 font-mono-num"
            >
              Inspect Stage Output
            </button>
          )}

          {awaiting ? (
            <>
              <button
                onClick={onRedo}
                disabled={busy}
                className="px-3 py-1.5 rounded-lg bg-surface hover:bg-line border border-line-strong text-xs font-sans text-muted hover:text-accent transition-colors flex items-center gap-1.5 disabled:opacity-50"
              >
                <XCircle className="w-3.5 h-3.5" />
                <span>Redo Stage</span>
              </button>
              <button
                onClick={onApprove}
                disabled={busy}
                className="px-4 py-1.5 rounded-lg bg-accent hover:bg-accent-hover text-xs font-sans font-semibold text-accent-on shadow-lg shadow-[var(--accent-dim)] transition-all flex items-center gap-1.5 uppercase tracking-wider disabled:opacity-50"
              >
                {busy ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-3.5 h-3.5" />
                )}
                <span>{busy ? 'Sending…' : 'Approve & Lock'}</span>
              </button>
            </>
          ) : (
            <span
              className={`px-3 py-1 rounded-lg text-xs font-mono-num border ${
                STAGE_STATUS_STYLE[stage.status] ?? STAGE_STATUS_STYLE.pending
              }`}
            >
              {stage.status.replace(/_/g, ' ').toUpperCase()}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Split side panel (read-only — the backend owns these numbers)
// ---------------------------------------------------------------------------

const SplitSidePanel: React.FC<{
  heading: string;
  sideBadge: string;
  badgeClass: string;
  subtitle: string;
  legalNote: string;
  accentClass: string;
  parties: SplitParty[];
  total: number;
}> = ({ heading, sideBadge, badgeClass, subtitle, legalNote, accentClass, parties, total }) => {
  const valid = isHundred(total);

  return (
    <div
      className={`p-6 rounded-3xl border transition-all space-y-6 ${
        valid
          ? 'bg-bg/90 border-line-strong glass'
          : 'bg-blocking/95 border-accent shadow-2xl shadow-[var(--accent-dim)]'
      }`}
    >
      <div className="flex items-start justify-between border-b border-line pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className={`px-2.5 py-0.5 rounded font-mono text-[10px] uppercase font-bold ${badgeClass}`}>
              {sideBadge}
            </span>
            <h3 className="font-serif text-base font-bold text-ink">{heading}</h3>
          </div>
          <p className="text-xs text-muted font-serif mt-1">{subtitle}</p>
        </div>

        <div
          className={`px-3 py-1.5 rounded-xl border text-xs font-mono text-right ${
            valid
              ? 'bg-accent/20 text-accent border-accent/40'
              : 'bg-[var(--accent-dim)] text-accent-hover border-accent animate-pulse'
          }`}
        >
          <span className="font-bold text-sm block">{formatPct(total)}%</span>
          <span className="text-[9px] uppercase tracking-wider block">
            {valid ? '✓ VALID 100%' : '❌ BROKEN SPLIT'}
          </span>
        </div>
      </div>

      {!valid && (
        <div className="p-4 rounded-2xl bg-[var(--accent-dim)] border border-accent text-xs font-serif text-accent-hover flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-accent flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="font-bold uppercase tracking-wide block">
              LEGAL RELEASE BLOCK: {heading} total is {formatPct(total)}%, not 100%
            </span>
            <p>{legalNote}</p>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {parties.length === 0 ? (
          <div className="p-4 rounded-2xl bg-bg border border-dashed border-line-strong text-xs font-serif text-muted">
            The rights stage returned no parties on this side. A side with no parties totals 0% and
            cannot be registered or paid out.
          </div>
        ) : (
          parties.map((party, idx) => (
            <div
              key={`${party.name}-${party.role}-${idx}`}
              className="p-4 rounded-2xl bg-bg border border-line space-y-3"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-serif text-sm font-semibold text-ink">{party.name}</span>
                    <span className="text-[10px] font-mono text-muted px-2 py-0.5 rounded bg-surface border border-line-strong">
                      {party.role}
                    </span>
                  </div>
                  <p className="text-xs font-mono text-dim mt-0.5 truncate">
                    {party.contact || 'No contact on the split sheet'}
                  </p>
                </div>

                <span
                  className={`px-2.5 py-1 rounded text-[10px] font-mono flex items-center gap-1 flex-shrink-0 ${
                    party.signed
                      ? 'bg-accent/20 text-accent border border-accent/40'
                      : 'bg-caution/20 text-caution border border-caution/40'
                  }`}
                >
                  {party.signed ? <Check className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                  <span>{party.signed ? 'SIGNED' : 'UNSIGNED'}</span>
                </span>
              </div>

              <div className="flex items-center gap-3 pt-1">
                <div className="flex-1 h-2 rounded-lg bg-surface overflow-hidden border border-line">
                  <div
                    className={`h-full ${accentClass}`}
                    style={{ width: `${Math.max(0, Math.min(100, party.share_pct))}%` }}
                  />
                </div>
                <span className="font-mono text-xs font-bold text-caution w-16 text-right">
                  {formatPct(party.share_pct)}%
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Tab
// ---------------------------------------------------------------------------

interface SplitsTabProps {
  /** Legacy prop from the mock-data console. Not used as a data source. */
  track?: TrackItem;
  onUpdateTrack?: (updated: TrackItem) => void;
  onInspectRaw?: (title: string, payload: any) => void;
  /** Optional: when the shell knows the project, skip the picker's default. */
  projectId?: string | null;
}

export const SplitsTab: React.FC<SplitsTabProps> = ({ onInspectRaw, projectId }) => {
  const ctx = useRunContext(projectId);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const rightsStage = useMemo(
    () => findStage(ctx.run, RIGHTS_STAGE_NAMES, isSplitSheetOutput),
    [ctx.run]
  );
  const releaseStage = useMemo(
    () => findStage(ctx.run, RELEASE_STAGE_NAMES, isReleaseMetadataOutput),
    [ctx.run]
  );

  const sheet =
    rightsStage && isSplitSheetOutput(rightsStage.output)
      ? (rightsStage.output as unknown as RightsStageOutput)
      : null;

  const releaseMeta =
    releaseStage && isReleaseMetadataOutput(releaseStage.output)
      ? (releaseStage.output as unknown as ReleaseMetadata)
      : null;

  const composition = sheet ? sheet.parties.filter((p) => p.side === 'composition') : [];
  const recording = sheet ? sheet.parties.filter((p) => p.side === 'recording') : [];
  const compTotal = composition.reduce((sum, p) => sum + p.share_pct, 0);
  const recTotal = recording.reduce((sum, p) => sum + p.share_pct, 0);
  const bothValid = sheet ? isHundred(compTotal) && isHundred(recTotal) : false;
  const signedCount = sheet ? sheet.parties.filter((p) => p.signed).length : 0;
  const validationProblems = sheet?.validation_problems ?? [];

  const runAction = async (kind: 'approve' | 'redo') => {
    if (!ctx.runId || !rightsStage) return;
    setBusy(true);
    setActionError(null);
    try {
      const updated =
        kind === 'approve'
          ? await approveStage(ctx.runId, rightsStage.stage)
          : await redoStage(ctx.runId, rightsStage.stage);
      ctx.applyRun(updated);
    } catch (err) {
      setActionError(describeError(err));
    } finally {
      setBusy(false);
    }
  };

  const template = ctx.run?.template ?? null;
  const isCoverTemplate = template === 'cover_release';

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Shield}
        title="Rights & Split Governance"
        description="Composition and recording are separate copyrights. Each side must total exactly 100%."
        badge="Copyright Act 1957"
        action={
          <button
            onClick={() =>
              onInspectRaw?.(
                'Rights stage output (raw)',
                rightsStage?.output ?? { info: 'No rights stage output on this run yet.' }
              )
            }
            disabled={!onInspectRaw}
            className="px-4 py-2.5 rounded-xl bg-surface hover:bg-line text-caution border border-line-strong font-mono text-xs font-bold transition-all flex items-center gap-2 disabled:opacity-40"
          >
            <Code2 className="w-4 h-4 text-caution" />
            <span>Inspect Wire JSON</span>
          </button>
        }
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div
            className={`p-3 rounded-2xl border flex items-center justify-between ${
              !sheet
                ? 'bg-surface border-line-strong text-muted'
                : isHundred(compTotal)
                ? 'bg-accent/10 border-accent/40 text-accent'
                : 'bg-[var(--accent-dim)] border-[var(--accent-dim)] text-accent-hover'
            }`}
          >
            <span className="text-xs font-serif font-bold uppercase tracking-wider">
              1. Composition Side
            </span>
            <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-bg">
              {!sheet
                ? 'NOT MEASURED'
                : `${formatPct(compTotal)}% ${isHundred(compTotal) ? '✓ 100% VALID' : '❌ MUST BE 100%'}`}
            </span>
          </div>

          <div
            className={`p-3 rounded-2xl border flex items-center justify-between ${
              !sheet
                ? 'bg-surface border-line-strong text-muted'
                : isHundred(recTotal)
                ? 'bg-accent/10 border-accent/40 text-accent'
                : 'bg-[var(--accent-dim)] border-[var(--accent-dim)] text-accent-hover'
            }`}
          >
            <span className="text-xs font-serif font-bold uppercase tracking-wider">
              2. Recording Side
            </span>
            <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-bg">
              {!sheet
                ? 'NOT MEASURED'
                : `${formatPct(recTotal)}% ${isHundred(recTotal) ? '✓ 100% VALID' : '❌ MUST BE 100%'}`}
            </span>
          </div>

          <div className="p-3 rounded-2xl border bg-surface border-line-strong text-muted flex items-center justify-between">
            <span className="text-xs font-serif font-bold uppercase tracking-wider">
              3. Sheet Status
            </span>
            <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-bg text-caution">
              {sheet
                ? `${sheet.status.toUpperCase()} • ${signedCount}/${sheet.parties.length} SIGNED`
                : 'NO SPLIT SHEET YET'}
            </span>
          </div>
        </div>
      </PageHeader>

      <RunContextBar
        ctx={ctx}
        stageLabel="source: rights stage of the selected run"
        showProjectPicker={!projectId}
      />

      {/* Load / empty / error gates, in the order they can fail */}
      {ctx.projectsError ? (
        <EmptyPanel
          tone="error"
          icon={<AlertTriangle className="w-7 h-7 text-accent" />}
          title="Could not reach the GHARANA gateway"
        >
          <p className="font-mono text-[11px] text-accent-hover">{ctx.projectsError}</p>
          <p>Splits are read from a pipeline run, so nothing can be shown until the gateway answers.</p>
        </EmptyPanel>
      ) : ctx.projects === null ? (
        <EmptyPanel
          icon={<RefreshCw className="w-7 h-7 text-info animate-spin" />}
          title="Loading projects…"
        >
          <p>Asking the gateway which projects exist.</p>
        </EmptyPanel>
      ) : ctx.projects.length === 0 ? (
        <EmptyPanel title="No projects yet">
          <p>
            A split sheet belongs to a project. Create a project and upload an audio artifact, then
            start a pipeline run — the rights stage produces the split sheet shown here.
          </p>
        </EmptyPanel>
      ) : ctx.runsError ? (
        <EmptyPanel
          tone="error"
          icon={<AlertTriangle className="w-7 h-7 text-accent" />}
          title="Could not load runs for this project"
        >
          <p className="font-mono text-[11px] text-accent-hover">{ctx.runsError}</p>
        </EmptyPanel>
      ) : ctx.runs === null ? (
        <EmptyPanel
          icon={<RefreshCw className="w-7 h-7 text-info animate-spin" />}
          title="Loading runs…"
        >
          <p>Looking for pipeline runs on this project.</p>
        </EmptyPanel>
      ) : ctx.runs.length === 0 ? (
        <EmptyPanel title="No pipeline run for this project yet">
          <p>
            Split sheets are produced by the <span className="font-mono text-caution">rights</span>{' '}
            stage of a pipeline run. Start a run for this project and the sheet will appear here as
            soon as that stage completes.
          </p>
        </EmptyPanel>
      ) : ctx.runError ? (
        <EmptyPanel
          tone="error"
          icon={<AlertTriangle className="w-7 h-7 text-accent" />}
          title="Could not load this run"
        >
          <p className="font-mono text-[11px] text-accent-hover">{ctx.runError}</p>
        </EmptyPanel>
      ) : !ctx.run ? (
        <EmptyPanel
          icon={<RefreshCw className="w-7 h-7 text-info animate-spin" />}
          title="Loading run…"
        >
          <p>Fetching stage results from the orchestrator.</p>
        </EmptyPanel>
      ) : !rightsStage ? (
        <EmptyPanel title="This run has no rights stage">
          <p>
            Template <span className="font-mono text-caution">{template ?? '—'}</span> does not
            include a rights stage, so it produces no split sheet. Use a template whose stages
            include <span className="font-mono text-caution">rights</span> (single_release,
            ep_release, sync_submission) or{' '}
            <span className="font-mono text-caution">rights_clearance</span> (cover_release).
          </p>
        </EmptyPanel>
      ) : rightsStage.status === 'failed' ? (
        <EmptyPanel
          tone="error"
          icon={<AlertTriangle className="w-7 h-7 text-accent" />}
          title={`The ${rightsStage.stage} stage failed`}
        >
          <p className="font-mono text-[11px] text-accent-hover">
            {rightsStage.error || 'The orchestrator reported a failure with no detail.'}
          </p>
          <p>No split sheet exists for this run. Redo the stage once the cause is fixed.</p>
        </EmptyPanel>
      ) : !sheet ? (
        <EmptyPanel
          icon={
            rightsStage.status === 'running' ? (
              <RefreshCw className="w-7 h-7 text-info animate-spin" />
            ) : undefined
          }
          title={
            rightsStage.status === 'running'
              ? 'The rights stage is running'
              : `The rights stage has not run yet (${rightsStage.status.replace(/_/g, ' ')})`
          }
        >
          <p>
            Stage <span className="font-mono text-caution">{rightsStage.stage}</span> has produced
            no output yet, so there are no shares to show. Every earlier checkpoint in the run has to
            be approved before this stage executes.
          </p>
        </EmptyPanel>
      ) : (
        <>
          {/* Catalogue identifiers — only ever from the release stage, never invented */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 glass-panel rounded-2xl border border-line-strong flex justify-between items-center font-mono text-xs">
              <div className="flex items-center gap-2">
                <Key className="w-4 h-4 text-caution" />
                <span className="text-muted">Sound Recording ISRC</span>
              </div>
              <span className={releaseMeta?.isrc ? 'text-caution font-bold' : 'text-dim'}>
                {releaseMeta?.isrc ?? 'Not assigned yet'}
              </span>
            </div>
            <div className="p-4 glass-panel rounded-2xl border border-line-strong flex justify-between items-center font-mono text-xs">
              <div className="flex items-center gap-2">
                <Key className="w-4 h-4 text-caution" />
                <span className="text-muted">Release UPC / EAN</span>
              </div>
              <span className={releaseMeta?.upc ? 'text-caution font-bold' : 'text-dim'}>
                {releaseMeta?.upc ?? 'Not assigned yet'}
              </span>
            </div>
          </div>

          {/* Backend validator output — the authoritative gate */}
          <div
            className={`p-5 rounded-2xl border flex items-start gap-3 ${
              validationProblems.length > 0
                ? 'bg-[var(--accent-dim)] border-accent text-accent-hover'
                : 'bg-accent/10 border-accent/40 text-accent'
            }`}
          >
            {validationProblems.length > 0 ? (
              <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5 text-accent" />
            ) : (
              <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5 text-accent" />
            )}
            <div className="space-y-2 min-w-0">
              <span className="font-serif text-sm font-bold uppercase tracking-wide block">
                {validationProblems.length > 0
                  ? `Rights agent reported ${validationProblems.length} validation problem${
                      validationProblems.length === 1 ? '' : 's'
                    }`
                  : 'Rights agent reported no validation problems'}
              </span>
              {validationProblems.length > 0 ? (
                <ul className="list-disc list-inside space-y-1 font-serif text-xs">
                  {validationProblems.map((problem, idx) => (
                    <li key={idx}>{problem}</li>
                  ))}
                </ul>
              ) : (
                <p className="font-serif text-xs text-muted">
                  Both sides validated server-side by <span className="font-mono">SplitSheet.validate_totals</span>.
                </p>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <h2 className="font-serif text-lg font-bold text-ink flex items-center gap-2">
                <FileText className="w-5 h-5 text-info" />
                <span>SPLIT SHEET — {sheet.work_title}</span>
              </h2>
              <span className="text-xs font-serif text-muted">
                Read-only: shares come from the rights stage. The orchestrator dispatches
                create_split_sheet with the project id alone, so the console cannot edit them yet.
              </span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <SplitSidePanel
                heading="1. Composition Copyright"
                sideBadge="PUBLISHING SIDE"
                badgeClass="bg-info/20 text-info border border-info/30"
                subtitle="Lyrics + melody (songwriters, lyricists, publishers)"
                legalNote="Publishing splits must total 100% before the work can be registered with IPRS."
                accentClass="bg-info"
                parties={composition}
                total={compTotal}
              />
              <SplitSidePanel
                heading="2. Sound Recording Copyright"
                sideBadge="MASTER SIDE"
                badgeClass="bg-[var(--accent-dim)] text-accent border border-[var(--accent-border)]"
                subtitle="The master audio (performers, producers, labels)"
                legalNote="Master royalties cannot be paid out by DSPs without a valid 100% recording split."
                accentClass="bg-accent"
                parties={recording}
                total={recTotal}
              />
            </div>
          </div>

          {/* Cover clearance — enforced by the template, not by a toggle here */}
          <div className="p-6 md:p-8 glass rounded-3xl border border-caution/40 bg-panel/95 space-y-4 shadow-2xl">
            <div className="flex items-center gap-2.5 border-b border-line pb-4">
              {isCoverTemplate ? (
                <Lock className="w-5 h-5 text-caution" />
              ) : (
                <Unlock className="w-5 h-5 text-accent" />
              )}
              <h2 className="font-serif text-lg font-bold text-ink">
                COVER RELEASE STATUTORY CLEARANCE GATE
              </h2>
            </div>

            <p className="text-xs font-serif text-muted">
              India has no US-style compulsory mechanical licence, so a cover needs a negotiated
              licence from the original publisher. That gate lives in the pipeline, not in this
              screen: the <span className="font-mono text-caution">cover_release</span> template
              puts <span className="font-mono text-caution">rights_clearance</span> before
              mastering, and the run cannot reach release without it being approved.
            </p>

            {isCoverTemplate ? (
              <div className="p-4 bg-bg rounded-2xl border border-caution/40 flex items-center gap-3 text-xs font-serif text-caution">
                <Lock className="w-5 h-5 flex-shrink-0" />
                <span>
                  This run uses <span className="font-mono">cover_release</span>. Clearance is stage{' '}
                  <span className="font-mono">{rightsStage.stage}</span>, currently{' '}
                  <span className="font-mono">{rightsStage.status.replace(/_/g, ' ')}</span>. Nothing
                  downstream executes until it is approved.
                </span>
              </div>
            ) : (
              <div className="p-4 bg-bg rounded-2xl border border-line flex items-center gap-3 text-xs font-serif text-muted">
                <CheckCircle2 className="w-5 h-5 text-accent flex-shrink-0" />
                <span>
                  This run uses <span className="font-mono text-caution">{template}</span>, which
                  has no clearance gate. Cover status is a property of the template a run was started
                  with — the console cannot flip it after the fact.
                </span>
              </div>
            )}
          </div>

          {/* Real hash-chained ledger receipt from the rights agent */}
          <div className="glass rounded-3xl p-6 md:p-8 border border-line-strong bg-bg/90 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-line pb-4">
              <div className="flex items-center gap-2.5">
                <Link2 className="w-5 h-5 text-caution" />
                <h2 className="font-serif text-lg font-bold text-ink">
                  RIGHTS LEDGER RECEIPT
                </h2>
                <span className="px-2 py-0.5 rounded bg-caution/20 text-caution border border-caution/30 font-mono text-[10px] uppercase font-bold">
                  Hash-Chained
                </span>
              </div>
              <span className="text-[11px] font-serif text-muted">
                Emitted by the rights agent when the sheet was declared.
              </span>
            </div>

            {sheet.ledger ? (
              sheet.ledger.persisted === false ? (
                <div className="p-4 rounded-2xl bg-[var(--accent-dim)] border border-accent text-xs font-serif text-accent-hover flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5 text-accent" />
                  <div className="space-y-1">
                    <span className="font-bold uppercase tracking-wide block">
                      This split declaration was NOT persisted to the ledger
                    </span>
                    <p className="font-mono text-[11px]">
                      {sheet.ledger.error || 'The rights agent could not append the event.'}
                    </p>
                    <p>
                      There is no audit trail for this declaration until the ledger database is
                      reachable and the stage is redone.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="p-4 sm:p-5 rounded-2xl bg-bg border border-line space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-surface pb-2">
                    <span className="font-mono text-xs font-bold uppercase tracking-wider text-caution">
                      {(sheet.ledger.event_type ?? 'event').replace(/_/g, ' ')}
                    </span>
                    <span className="text-[10px] font-mono text-dim">
                      {formatTimestamp(sheet.ledger.created_at)}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 font-mono text-[10px]">
                    <div className="flex items-center gap-1.5 text-dim min-w-0">
                      <span className="uppercase text-[9px] font-bold text-muted">prev_hash:</span>
                      <span className="truncate text-dim">{sheet.ledger.prev_hash ?? '—'}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-accent min-w-0">
                      <span className="uppercase text-[9px] font-bold text-accent">hash:</span>
                      <span className="truncate font-bold">{sheet.ledger.hash ?? '—'}</span>
                    </div>
                  </div>
                </div>
              )
            ) : (
              <div className="p-4 rounded-2xl bg-bg border border-dashed border-line-strong text-xs font-serif text-muted">
                This stage output carries no ledger receipt. The console does not have a ledger
                query endpoint, so no further chain history can be shown here.
              </div>
            )}
          </div>

          <StageCheckpointBar
            title={`Split sheet sign-off — ${sheet.work_title}`}
            agentLabel="rights_splits • create_split_sheet"
            stage={rightsStage}
            busy={busy}
            actionError={actionError}
            summary={
              validationProblems.length > 0
                ? `The rights agent flagged ${validationProblems.length} problem${
                    validationProblems.length === 1 ? '' : 's'
                  } on this sheet. Approving locks the splits as they stand.`
                : bothValid
                ? `Composition ${formatPct(compTotal)}% and recording ${formatPct(
                    recTotal
                  )}% both total 100%, with ${signedCount} of ${sheet.parties.length} parties signed.`
                : `Composition is ${formatPct(compTotal)}% and recording is ${formatPct(
                    recTotal
                  )}%. A side that does not total 100% cannot be registered or paid out.`
            }
            onApprove={() => runAction('approve')}
            onRedo={() => runAction('redo')}
            onInspect={
              onInspectRaw
                ? () => onInspectRaw('Rights stage output (raw)', rightsStage.output)
                : undefined
            }
          />

          <div className="flex items-center gap-2 text-[10px] font-mono text-dim px-1">
            <Users className="w-3.5 h-3.5" />
            <span>
              run {ctx.run?.id} • template {template} • run status {ctx.run?.status} • stage finished{' '}
              {formatTimestamp(rightsStage.finished_at)}
            </span>
          </div>
        </>
      )}
    </div>
  );
};
