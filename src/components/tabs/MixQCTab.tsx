import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Sliders,
  Gauge,
  AlertTriangle,
  RefreshCw,
  Play,
  Loader2,
  ShieldAlert,
  ListChecks,
  HelpCircle
} from 'lucide-react';
import { TrackItem, CheckpointStatus } from '../../types';
import { HumanCheckpointCard } from '../HumanCheckpointCard';
import { PageHeader } from '../SectionPanel';
import { PipelineProgressTracker } from '../PipelineProgressTracker';
import {
  ApiError,
  approveStage,
  getRun,
  listProjects,
  listRuns,
  listTemplates,
  redoStage,
  startRun,
  type PipelineRun,
  type QCIssue,
  type QCReport,
  type QCSeverity,
  type StageResult
} from '../../lib/api';
import { isWaitingOnArtist } from '../../lib/evidence';

/**
 * Mix QC tab — every number on this screen is measured by the backend.
 *
 * Source of truth: the `output` of the run's `qc_analysis` stage (`qc_track_N`
 * on EP runs), which is a QCReport. There is deliberately no local fallback:
 * when a value is missing the UI says "not measured", because a plausible
 * looking invented number is the worst bug this product could ship.
 */

// ---------------------------------------------------------------------------
// Platform delivery targets — exact code, not agent prose.
// ---------------------------------------------------------------------------

/** Inter-sample ceiling every DSP below shares (AAC/Ogg transcode headroom). */
const TRUE_PEAK_CEILING_DBTP = -1.0;

/** How far from a platform's target counts as "on target" before we call it. */
const LUFS_TOLERANCE_LU = 1.0;

interface PlatformTarget {
  platform: string;
  targetLufs: number;
  explanation: string;
}

const PLATFORM_TARGETS: PlatformTarget[] = [
  {
    platform: 'Spotify',
    targetLufs: -14.0,
    explanation:
      'Spotify normalizes tracks to -14 LUFS. True Peak must remain below -1.0 dBTP to avoid AAC transcoding distortion.'
  },
  {
    platform: 'Apple Music',
    targetLufs: -16.0,
    explanation:
      'Apple Digital Masters specifies -16 LUFS integrated target with Sound Check normalization.'
  },
  {
    platform: 'YouTube Music',
    targetLufs: -13.0,
    explanation:
      'YouTube applies downward normalization if integrated loudness exceeds -13 LUFS.'
  },
  {
    platform: 'Instagram / Reels',
    targetLufs: -11.0,
    explanation:
      'Short form audio needs higher energetic presence (around -11 LUFS) to cut through mobile speaker noise.'
  }
];

type PlatformStatus = 'OPTIMAL' | 'WILL_ATTENUATE' | 'QUIET' | 'PEAK_OVER' | 'NOT_MEASURED';

/** Pure comparison of measured values against one platform's target. */
function platformStatus(
  lufs: number | null,
  truePeak: number | null,
  targetLufs: number
): PlatformStatus {
  if (truePeak !== null && truePeak > TRUE_PEAK_CEILING_DBTP) return 'PEAK_OVER';
  if (lufs === null) return 'NOT_MEASURED';
  const delta = lufs - targetLufs;
  if (delta > LUFS_TOLERANCE_LU) return 'WILL_ATTENUATE';
  if (delta < -LUFS_TOLERANCE_LU) return 'QUIET';
  return 'OPTIMAL';
}

const PLATFORM_BADGE_CLASS: Record<PlatformStatus, string> = {
  OPTIMAL: 'bg-accent/20 text-accent border border-accent/40',
  WILL_ATTENUATE: 'bg-caution/20 text-caution border border-caution/40',
  QUIET: 'bg-caution/20 text-caution border border-caution/40',
  PEAK_OVER: 'bg-[var(--accent-dim)] text-accent-hover border border-[var(--accent-dim)]',
  NOT_MEASURED: 'bg-line text-muted border border-line-strong'
};

const PLATFORM_BADGE_LABEL: Record<PlatformStatus, string> = {
  OPTIMAL: 'OPTIMAL',
  WILL_ATTENUATE: 'WILL ATTENUATE',
  QUIET: 'QUIET',
  PEAK_OVER: 'PEAK OVER',
  NOT_MEASURED: 'NOT MEASURED'
};

// ---------------------------------------------------------------------------
// Wire helpers — tolerant readers that never invent a value
// ---------------------------------------------------------------------------

const POLL_MS = 5000;

const QC_STAGE = (name: string) => name === 'qc_analysis' || name.startsWith('qc_');

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

/** A finite number, or null. Never 0-as-a-placeholder. */
function num(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function looksLikeQCReport(rec: Record<string, unknown>): boolean {
  const hasIssues = Array.isArray(rec.issues);
  const hasMeasurements = 'lufs_integrated' in rec || 'true_peak_db' in rec;
  return hasIssues && (hasMeasurements || typeof rec.summary === 'string');
}

/**
 * Pull the QCReport out of a stage output. The agent returns the report as the
 * whole payload today; the wrappers are tolerated so a future envelope change
 * degrades to "not measured" rather than to a wrong number.
 */
function extractQCReport(output: Record<string, unknown> | null): QCReport | null {
  if (!output) return null;
  const candidates = [output, output.qc_report, output.report, output.result, output.data];
  for (const candidate of candidates) {
    const rec = asRecord(candidate);
    if (rec && looksLikeQCReport(rec)) return rec as unknown as QCReport;
  }
  return null;
}

/** Read an optional measurement the QCReport schema does not carry (yet). */
function optionalMeasurement(
  output: Record<string, unknown> | null,
  keys: string[]
): number | null {
  if (!output) return null;
  const nests = [output, asRecord(output.features), asRecord(output.measurements)];
  for (const scope of nests) {
    if (!scope) continue;
    for (const key of keys) {
      const value = num(scope[key]);
      if (value !== null) return value;
    }
  }
  return null;
}

const BAND_LABELS: Record<string, string> = {
  sub_bass: 'Sub Bass (20-60 Hz)',
  subBass: 'Sub Bass (20-60 Hz)',
  bass: 'Bass (60-250 Hz)',
  low_mid: 'Low Mid (250-500 Hz)',
  lowMid: 'Low Mid (250-500 Hz)',
  mid: 'Mid Range (500-2 kHz)',
  high_mid: 'High Mid (2-6 kHz)',
  highMid: 'High Mid (2-6 kHz)',
  highs: 'Highs / Air (6-20 kHz)',
  air: 'Highs / Air (6-20 kHz)'
};

/** Per-band energy, only if the agent actually reported numbers. */
function extractBands(output: Record<string, unknown> | null): [string, number][] {
  if (!output) return [];
  const scopes = [
    asRecord(output.frequency_bins),
    asRecord(output.bands),
    asRecord(asRecord(output.features)?.frequency_bins)
  ];
  for (const scope of scopes) {
    if (!scope) continue;
    const bands = Object.entries(scope)
      .map(([key, value]) => [key, num(value)] as [string, number | null])
      .filter((entry): entry is [string, number] => entry[1] !== null);
    if (bands.length > 0) return bands;
  }
  return [];
}

const SEVERITY_ORDER: Record<QCSeverity, number> = {
  blocking: 0,
  major: 1,
  minor: 2,
  info: 3
};

const SEVERITY_STYLE: Record<QCSeverity, { label: string; wrap: string; badge: string; dot: string }> = {
  blocking: {
    label: 'BLOCKING · RELEASE STOPPER',
    wrap: 'bg-[var(--accent-dim)] border-accent ring-1 ring-[var(--accent-dim)] shadow-[0_0_18px_var(--accent-dim)]',
    badge: 'bg-accent text-bg font-bold',
    dot: 'bg-accent'
  },
  major: {
    label: 'MAJOR',
    wrap: 'bg-bg border-caution/50',
    badge: 'bg-caution/20 text-caution border border-caution/40',
    dot: 'bg-caution'
  },
  minor: {
    label: 'MINOR',
    wrap: 'bg-bg border-line',
    badge: 'bg-line text-muted border border-line-strong',
    dot: 'bg-muted'
  },
  info: {
    label: 'INFO',
    wrap: 'bg-bg border-line',
    badge: 'bg-line text-muted border border-line-strong',
    dot: 'bg-dim'
  }
};

function severityStyle(severity: unknown) {
  const key = (severity as QCSeverity) in SEVERITY_STYLE ? (severity as QCSeverity) : 'info';
  return SEVERITY_STYLE[key];
}

function severityRank(severity: unknown): number {
  const key = severity as QCSeverity;
  return key in SEVERITY_ORDER ? SEVERITY_ORDER[key] : 99;
}

function fmtSeconds(value: number | null): string | null {
  if (value === null) return null;
  const total = Math.max(0, Math.round(value));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

function timeRange(issue: QCIssue): string | null {
  const start = fmtSeconds(num(issue.start_s));
  const end = fmtSeconds(num(issue.end_s));
  if (start && end) return `${start}–${end}`;
  return start ?? null;
}

/** Human-readable gateway failure, including the ones this product will hit. */
function errText(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.status === 0) return err.detail;
    if (err.status === 401 || err.status === 403) {
      return `Gateway rejected the request (${err.status}). The console server's GHARANA_API_KEY is missing or wrong.`;
    }
    if (err.status === 502 || err.status === 503 || err.status === 504) {
      return `Gateway could not reach the pipeline (${err.status}): ${err.detail}`;
    }
    return `${err.status} — ${err.detail}`;
  }
  return err instanceof Error ? err.message : String(err);
}

function createdMs(row: { created_at?: string | null }): number {
  if (!row.created_at) return 0;
  const parsed = Date.parse(row.created_at);
  return Number.isNaN(parsed) ? 0 : parsed;
}

const STAGE_TO_CHECKPOINT: Record<string, CheckpointStatus> = {
  awaiting_approval: 'pending_artist_approval',
  approved: 'approved',
  redo_requested: 'rejected',
  failed: 'rejected',
  skipped: 'rejected',
  pending: 'pending_artist_approval',
  running: 'pending_artist_approval'
};

// ---------------------------------------------------------------------------
// Run loading (project resolve -> latest run -> poll while active)
// ---------------------------------------------------------------------------

type RunPhase = 'resolving' | 'loading' | 'ready' | 'no_project' | 'error';

function useLatestRun(explicitProjectId: string | null | undefined, track?: TrackItem) {
  const [projectId, setProjectId] = useState<string | null>(explicitProjectId ?? null);
  const [run, setRun] = useState<PipelineRun | null>(null);
  const [phase, setPhase] = useState<RunPhase>('resolving');
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const trackId = track?.id;
  const trackTitle = track?.title;

  // 1. Which real project are we looking at? Prefer an explicit prop; the
  //    console's project selection lives in App, not in this tab.
  useEffect(() => {
    if (explicitProjectId) {
      setProjectId(explicitProjectId);
      return;
    }
    let cancelled = false;
    setPhase('resolving');
    setError(null);
    listProjects()
      .then((projects) => {
        if (cancelled) return;
        const norm = (s: string) => s.trim().toLowerCase();
        const match =
          projects.find((p) => p.id === trackId) ??
          (trackTitle ? projects.find((p) => norm(p.title) === norm(trackTitle)) : undefined) ??
          (projects.length === 1 ? projects[0] : undefined);
        if (!match) {
          setProjectId(null);
          setPhase('no_project');
          return;
        }
        setProjectId(match.id);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(errText(err));
        setPhase('error');
      });
    return () => {
      cancelled = true;
    };
  }, [explicitProjectId, trackId, trackTitle, reloadKey]);

  // 2. Most recent run for that project, in full detail.
  useEffect(() => {
    if (!projectId) return;
    let cancelled = false;
    setPhase('loading');
    setError(null);
    (async () => {
      try {
        const runs = await listRuns(projectId);
        if (cancelled) return;
        if (runs.length === 0) {
          setRun(null);
          setPhase('ready');
          return;
        }
        const newest = [...runs].sort((a, b) => createdMs(b) - createdMs(a))[0];
        const detail = await getRun(newest.id);
        if (cancelled) return;
        setRun(detail);
        setPhase('ready');
      } catch (err) {
        if (cancelled) return;
        setError(errText(err));
        setPhase('error');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [projectId, reloadKey]);

  // 3. Poll while the run is active. Stop on completed / failed.
  const runId = run?.id ?? null;
  const isActive = run !== null && (run.status === 'running' || run.status === 'paused');
  useEffect(() => {
    if (!runId || !isActive) return;
    let cancelled = false;
    const timer = window.setInterval(() => {
      getRun(runId)
        .then((fresh) => {
          if (!cancelled) setRun(fresh);
        })
        .catch(() => {
          /* transient poll failure: keep the last good run on screen */
        });
    }, POLL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [runId, isActive]);

  const reload = useCallback(() => setReloadKey((k) => k + 1), []);

  return { projectId, run, setRun, phase, error, reload, isActive };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface MixQCTabProps {
  track?: TrackItem;
  /** Real gateway project id. When absent the tab resolves one from /projects. */
  projectId?: string | null;
  onUpdateTrack?: (updated: TrackItem) => void;
  onInspectRaw?: (title: string, payload: any) => void;
  /**
   * A QC topic to scroll to and mark, set when an A&R finding's `qc_issue`
   * locator was followed here. Null when the artist arrived on their own.
   */
  highlightTopic?: string | null;
  /** Called on unmount so a stale highlight does not fire on the next visit. */
  onHighlightConsumed?: () => void;
  // App.tsx is owned by another agent and may hand this tab further wiring
  // props; tolerate them rather than breaking the build over an extra name.
  [key: string]: any;
}

/** DOM id for one issue row. Deep links from A&R findings land on these. */
function qcIssueDomId(topic: string): string {
  return `qc-issue-${encodeURIComponent(topic)}`;
}

export const MixQCTab: React.FC<MixQCTabProps> = ({
  track,
  projectId: projectIdProp,
  onInspectRaw,
  highlightTopic,
  onHighlightConsumed
}) => {
  const { projectId, run, setRun, phase, error, reload } = useLatestRun(projectIdProp, track);

  const [busy, setBusy] = useState<null | 'starting' | 'approving' | 'redoing'>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // --- Stage selection -----------------------------------------------------
  const qcStages = useMemo<StageResult[]>(
    () => (run ? run.stages.filter((s) => QC_STAGE(s.stage)) : []),
    [run]
  );

  /** The QC stage whose output we render: the most recent one carrying a report. */
  const reportStage = useMemo<StageResult | null>(() => {
    for (let i = qcStages.length - 1; i >= 0; i -= 1) {
      if (extractQCReport(qcStages[i].output)) return qcStages[i];
    }
    return null;
  }, [qcStages]);

  // A stage stopped on the artist for a missing input is not approvable: it
  // produced a request, not a verdict. It is excluded from the checkpoint card
  // and from the "Approve & Advance" button; App.tsx renders the answer form.
  const qcCheckpointStage = useMemo<StageResult | null>(
    () =>
      qcStages.find((s) => s.status === 'awaiting_approval' && !isWaitingOnArtist(s)) ??
      reportStage ??
      qcStages.find((s) => !isWaitingOnArtist(s)) ??
      null,
    [qcStages, reportStage]
  );

  /** Whatever stage the whole run is currently parked on for approval, QC or not. */
  const awaitingStage = useMemo<StageResult | null>(
    () =>
      run?.stages.find((s) => s.status === 'awaiting_approval' && !isWaitingOnArtist(s)) ?? null,
    [run]
  );

  const report = useMemo(() => extractQCReport(reportStage?.output ?? null), [reportStage]);

  // --- Measured values (null means "not measured", never a substitute) ------
  const lufs = report ? num(report.lufs_integrated) : null;
  const truePeak = report ? num(report.true_peak_db) : null;
  const dynamicRange = optionalMeasurement(reportStage?.output ?? null, [
    'dynamic_range_lu',
    'loudness_range_lu',
    'lra',
    'loudness_range'
  ]);
  const bands = useMemo(() => extractBands(reportStage?.output ?? null), [reportStage]);

  const issues = useMemo<QCIssue[]>(() => {
    const raw = Array.isArray(report?.issues) ? (report!.issues as QCIssue[]) : [];
    return [...raw]
      .filter((issue) => asRecord(issue) !== null)
      .sort((a, b) => severityRank(a.severity) - severityRank(b.severity));
  }, [report]);

  const blockingCount = issues.filter((i) => i.severity === 'blocking').length;
  const peakOverCeiling = truePeak !== null && truePeak > TRUE_PEAK_CEILING_DBTP;

  // Followed a finding's QC locator here: scroll the issue into view once the
  // list exists. If the topic is not in this report there is nothing to scroll
  // to and nothing is faked — the artist simply lands on the issue list.
  useEffect(() => {
    if (!highlightTopic || issues.length === 0) return;
    const node = document.getElementById(qcIssueDomId(highlightTopic));
    node?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [highlightTopic, issues]);

  const consumedRef = React.useRef(onHighlightConsumed);
  consumedRef.current = onHighlightConsumed;
  useEffect(() => () => consumedRef.current?.(), []);

  const platforms = useMemo(
    () =>
      PLATFORM_TARGETS.map((target) => ({
        ...target,
        status: platformStatus(lufs, truePeak, target.targetLufs),
        deltaLu: lufs === null ? null : lufs - target.targetLufs
      })),
    [lufs, truePeak]
  );

  // --- Actions -------------------------------------------------------------
  const handleStartRun = useCallback(async () => {
    if (!projectId) return;
    setBusy('starting');
    setActionError(null);
    try {
      // The template registry is the orchestrator's; prefer a template that
      // actually contains a QC stage rather than assuming a name.
      let template = 'single_release';
      try {
        const templates = await listTemplates();
        const chosen =
          templates.find((t) => t.name === 'single_release') ??
          templates.find((t) => t.stages.some((s) => QC_STAGE(s.name)));
        if (chosen) template = chosen.name;
      } catch {
        /* template listing is a nicety; the default is a real template */
      }
      const started = await startRun(projectId, template);
      setRun(started);
    } catch (err) {
      setActionError(errText(err));
    } finally {
      setBusy(null);
    }
  }, [projectId, setRun]);

  const handleApprove = useCallback(
    async (stage: string) => {
      if (!run) return;
      setBusy('approving');
      setActionError(null);
      try {
        setRun(await approveStage(run.id, stage));
      } catch (err) {
        setActionError(errText(err));
      } finally {
        setBusy(null);
      }
    },
    [run, setRun]
  );

  const handleRedo = useCallback(
    async (stage: string) => {
      if (!run) return;
      setBusy('redoing');
      setActionError(null);
      try {
        setRun(await redoStage(run.id, stage));
      } catch (err) {
        setActionError(errText(err));
      } finally {
        setBusy(null);
      }
    },
    [run, setRun]
  );

  // --- Header action button ------------------------------------------------
  const loadingRun = phase === 'resolving' || phase === 'loading';
  const runIsRunning = run?.status === 'running';

  let headerButton: React.ReactNode;
  if (loadingRun) {
    headerButton = (
      <button
        disabled
        className="px-4 py-2.5 rounded-xl bg-line text-muted font-mono text-xs font-bold flex items-center gap-2 cursor-not-allowed"
      >
        <Loader2 className="w-4 h-4 animate-spin" />
        <span>Loading pipeline…</span>
      </button>
    );
  } else if (runIsRunning) {
    headerButton = (
      <button
        disabled
        className="px-4 py-2.5 rounded-xl bg-line text-caution font-mono text-xs font-bold flex items-center gap-2 cursor-not-allowed"
      >
        <RefreshCw className="w-4 h-4 animate-spin" />
        <span>Pipeline running…</span>
      </button>
    );
  } else if (awaitingStage) {
    headerButton = (
      <button
        onClick={() => handleApprove(awaitingStage.stage)}
        disabled={busy !== null}
        className="px-4 py-2.5 rounded-xl bg-accent hover:bg-accent-hover disabled:opacity-60 text-accent-on font-mono text-xs font-bold transition-all shadow-md flex items-center gap-2"
      >
        <RefreshCw className={`w-4 h-4 ${busy === 'approving' ? 'animate-spin' : ''}`} />
        <span>
          {busy === 'approving' ? 'Advancing pipeline…' : `Approve & Advance · ${awaitingStage.stage}`}
        </span>
      </button>
    );
  } else {
    headerButton = (
      <button
        onClick={handleStartRun}
        disabled={busy !== null || !projectId}
        className="px-4 py-2.5 rounded-xl bg-accent hover:bg-accent-hover disabled:opacity-60 text-accent-on font-mono text-xs font-bold transition-all shadow-md flex items-center gap-2"
      >
        {busy === 'starting' ? (
          <RefreshCw className="w-4 h-4 animate-spin" />
        ) : (
          <Play className="w-4 h-4" />
        )}
        <span>{busy === 'starting' ? 'Starting pipeline run…' : 'Run Agent Mix QC Analysis'}</span>
      </button>
    );
  }

  const approvedCount = run ? run.stages.filter((s) => s.status === 'approved').length : 0;

  return (
    <div className="space-y-6">
      {/* Pipeline Track Completion Progress */}
      {track && <PipelineProgressTracker track={track} activeStage="mix_qc" />}

      {/* Standardized Page Header */}
      <PageHeader
        icon={Sliders}
        title="Mix Quality Control & Mastering DSP"
        description="Measured loudness, True Peak and issue list from the qc_analysis pipeline stage."
        badge="BS.1770 Measured"
        action={headerButton}
      >
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 font-mono text-[11px] text-muted">
          {run ? (
            <>
              <span>
                Run <span className="text-accent-on">{run.id.slice(0, 8)}</span>
              </span>
              <span>
                Template <span className="text-accent-on">{run.template}</span>
              </span>
              <span>
                Status{' '}
                <span
                  className={
                    run.status === 'failed'
                      ? 'text-accent-hover'
                      : run.status === 'completed'
                      ? 'text-accent'
                      : 'text-caution'
                  }
                >
                  {run.status}
                </span>
              </span>
              <span>
                {approvedCount}/{run.stages.length} stages approved
              </span>
              {reportStage && (
                <span>
                  QC stage <span className="text-accent-on">{reportStage.stage}</span>
                </span>
              )}
            </>
          ) : (
            <span>{loadingRun ? 'Reading pipeline state…' : 'No pipeline run for this project yet.'}</span>
          )}
        </div>
      </PageHeader>

      {/* Gateway / action errors — the backend is real and can 401 or 502 */}
      {(error || actionError) && (
        <div className="p-4 rounded-2xl bg-[var(--accent-dim)] border border-[var(--accent-border)] flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-accent-hover flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-serif text-sm font-semibold text-accent-on">
                {error ? 'Could not load the pipeline' : 'Pipeline action failed'}
              </p>
              <p className="font-mono text-xs text-blocking mt-1 break-words">{error ?? actionError}</p>
            </div>
          </div>
          <button
            onClick={() => {
              setActionError(null);
              reload();
            }}
            className="px-3 py-1.5 rounded-lg bg-surface border border-line-strong text-xs font-mono text-accent-on hover:border-accent flex-shrink-0"
          >
            Retry
          </button>
        </div>
      )}

      {/* No project to read measurements from */}
      {phase === 'no_project' && (
        <div className="p-8 rounded-2xl bg-panel border border-line text-center space-y-2">
          <HelpCircle className="w-6 h-6 text-muted mx-auto" />
          <h3 className="font-serif text-base font-bold text-accent-on">
            This track is not linked to a GHARANA project
          </h3>
          <p className="font-mono text-xs text-muted max-w-lg mx-auto">
            Mix QC numbers come from a project's pipeline run. Create or select the project this
            track belongs to, upload its mix as an artifact, then start a run.
          </p>
        </div>
      )}

      {/* Loading */}
      {loadingRun && (
        <div className="p-8 rounded-2xl bg-panel border border-line text-center">
          <Loader2 className="w-5 h-5 text-muted mx-auto animate-spin" />
          <p className="font-mono text-xs text-muted mt-3">Loading measured QC report…</p>
        </div>
      )}

      {/* Blocking issue banner — a release stopper must be unmistakable */}
      {report && (blockingCount > 0 || peakOverCeiling) && (
        <div className="p-5 rounded-2xl bg-[var(--accent-dim)] border-2 border-accent ring-1 ring-[var(--accent-border)] shadow-[0_0_28px_var(--accent-dim)] flex items-start gap-3.5">
          <div className="p-2.5 rounded-xl bg-[var(--accent-dim)] border border-[var(--accent-border)] text-accent-hover flex-shrink-0">
            <ShieldAlert className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-full bg-accent text-bg font-bold">
              Release blocked
            </span>
            <h3 className="font-serif text-base font-bold text-accent-on mt-1.5">
              {blockingCount > 0
                ? `${blockingCount} blocking issue${blockingCount > 1 ? 's' : ''} in the measured QC report`
                : 'True Peak is above the delivery ceiling'}
            </h3>
            <p className="font-mono text-xs text-blocking mt-1">
              {peakOverCeiling
                ? `Measured ${truePeak!.toFixed(2)} dBTP — over the ${TRUE_PEAK_CEILING_DBTP.toFixed(1)} dBTP ceiling. Inter-sample clipping on lossy transcode is certain.`
                : 'Fix the blocking issues below and re-run the QC stage before delivery.'}
            </p>
          </div>
        </div>
      )}

      {/* Human Approval Checkpoint — the real stage checkpoint */}
      {run && qcCheckpointStage && (
        <HumanCheckpointCard
          title={`Mix QC checkpoint · ${qcCheckpointStage.stage}`}
          recommendation={
            report?.summary ??
            qcCheckpointStage.error ??
            'The QC agent has not produced a report for this stage yet.'
          }
          status={STAGE_TO_CHECKPOINT[qcCheckpointStage.status] ?? 'pending_artist_approval'}
          agentName="GHARANA production_qc agent"
          trackForMobile={{
            id: run.project_id,
            title: track?.title ?? run.project_id,
            primaryArtist: track?.artist,
            audioMetrics: {
              integratedLufs: lufs ?? undefined,
              truePeakDbtp: truePeak ?? undefined,
              dynamicRangeLu: dynamicRange ?? undefined
            }
          }}
          onApprove={() => handleApprove(qcCheckpointStage.stage)}
          onReject={() => handleRedo(qcCheckpointStage.stage)}
          onInspectRawPayload={
            onInspectRaw
              ? () => onInspectRaw(`Stage output · ${qcCheckpointStage.stage}`, qcCheckpointStage)
              : undefined
          }
        />
      )}

      {/* No measured report yet: a call to action, never an empty chart */}
      {!loadingRun && phase === 'ready' && !report && (
        <div className="p-8 rounded-2xl bg-panel border border-line shadow-md text-center space-y-4">
          <div className="inline-flex p-3 rounded-2xl bg-[var(--accent-dim)] border border-[var(--accent-border)] text-accent">
            <Gauge className="w-6 h-6" />
          </div>
          <div className="space-y-1.5">
            <h3 className="font-serif text-lg font-bold text-accent-on">
              {reportStage
                ? 'No QC report on this run yet'
                : run
                ? 'This run has not reached the QC stage yet'
                : 'No QC measurements for this project yet'}
            </h3>
            <p className="font-mono text-xs text-muted max-w-xl mx-auto leading-relaxed">
              Nothing is measured until the <span className="text-caution">qc_analysis</span> stage
              runs. Upload the mix as an artifact on this project, then start a pipeline run — the
              backend measures BS.1770 integrated loudness and true peak, and this screen fills in
              with those values. No placeholder numbers are shown in the meantime.
            </p>
          </div>
          {qcStages.some((s) => s.status === 'failed') && (
            <p className="font-mono text-xs text-accent-hover">
              QC stage failed: {qcStages.find((s) => s.status === 'failed')?.error ?? 'no detail returned'}
            </p>
          )}
          <div className="flex items-center justify-center gap-2">
            {awaitingStage ? (
              <button
                onClick={() => handleApprove(awaitingStage.stage)}
                disabled={busy !== null}
                className="px-5 py-2.5 rounded-xl bg-accent hover:bg-accent-hover disabled:opacity-60 text-accent-on font-mono text-xs font-bold transition-all shadow-md inline-flex items-center gap-2"
              >
                <RefreshCw className={`w-4 h-4 ${busy === 'approving' ? 'animate-spin' : ''}`} />
                <span>Approve {awaitingStage.stage} to advance the run</span>
              </button>
            ) : (
              <button
                onClick={handleStartRun}
                disabled={busy !== null || !projectId || runIsRunning}
                className="px-5 py-2.5 rounded-xl bg-accent hover:bg-accent-hover disabled:opacity-60 text-accent-on font-mono text-xs font-bold transition-all shadow-md inline-flex items-center gap-2"
              >
                {busy === 'starting' || runIsRunning ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Play className="w-4 h-4" />
                )}
                <span>
                  {runIsRunning
                    ? 'QC agent is measuring…'
                    : busy === 'starting'
                    ? 'Starting pipeline run…'
                    : 'Start a QC pipeline run'}
                </span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Main Grid: Measured Metrics + Platform Target Compliance */}
      {report && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left 2 Cols: Measured Values, Issues & Frequency Profile */}
          <div className="lg:col-span-2 space-y-6">
            {/* Key Metrics HUD Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="p-4 rounded-2xl bg-panel border border-line shadow-md space-y-1">
                <span className="text-[10px] text-muted font-mono uppercase block tracking-wider">
                  Integrated Loudness
                </span>
                <div
                  className={`text-lg font-bold font-mono ${
                    lufs === null ? 'text-dim' : 'text-accent'
                  }`}
                >
                  {lufs === null ? 'Not measured' : `${lufs.toFixed(1)} LUFS`}
                </div>
                <span className="text-[10px] text-dim font-mono block">Target: -14.0 LUFS</span>
              </div>

              <div className="p-4 rounded-2xl bg-panel border border-line shadow-md space-y-1">
                <span className="text-[10px] text-muted font-mono uppercase block tracking-wider">
                  True Peak Level
                </span>
                <div
                  className={`text-lg font-bold font-mono ${
                    truePeak === null
                      ? 'text-dim'
                      : peakOverCeiling
                      ? 'text-accent'
                      : 'text-ink'
                  }`}
                >
                  {truePeak === null ? 'Not measured' : `${truePeak.toFixed(2)} dBTP`}
                </div>
                <span className="text-[10px] text-dim font-mono block">Max Limit: -1.0 dBTP</span>
              </div>

              <div className="p-4 rounded-2xl bg-panel border border-line shadow-md space-y-1">
                <span className="text-[10px] text-muted font-mono uppercase block tracking-wider">
                  Dynamic Range
                </span>
                <div
                  className={`text-lg font-bold font-mono ${
                    dynamicRange === null ? 'text-dim' : 'text-caution'
                  }`}
                >
                  {dynamicRange === null ? 'Not reported' : `${dynamicRange.toFixed(1)} LU`}
                </div>
                <span className="text-[10px] text-dim font-mono block">
                  {dynamicRange === null ? 'Not in the QC report' : 'Ideal: 7 - 12 LU'}
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-panel border border-line shadow-md space-y-1">
                <span className="text-[10px] text-muted font-mono uppercase block tracking-wider">
                  Agent Confidence
                </span>
                <div className="text-lg font-bold font-mono text-info">
                  {num(report.confidence?.score) === null
                    ? 'Not reported'
                    : `${Math.round(num(report.confidence.score)! * 100)}%`}
                </div>
                <span className="text-[10px] text-dim font-mono block">
                  {issues.length} issue{issues.length === 1 ? '' : 's'} found
                </span>
              </div>
            </div>

            {/* Measured issue list, severity-ordered */}
            <div className="p-6 rounded-2xl bg-panel border border-line shadow-md space-y-4">
              <div className="flex items-center gap-2.5 pb-3 border-b border-line">
                <div className="p-2 rounded-xl bg-[var(--accent-dim)] border border-[var(--accent-border)] text-accent">
                  <ListChecks className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-serif text-base font-bold text-ink">
                    QC Issues ({issues.length})
                  </h3>
                  <p className="font-mono text-xs text-muted">
                    Reported by the qc_analysis stage, ordered by severity.
                  </p>
                </div>
              </div>

              {issues.length === 0 ? (
                <div className="p-8 text-center bg-bg rounded-xl border border-line text-xs text-muted font-mono">
                  The QC agent reported no issues on this mix.
                </div>
              ) : (
                <ul className="space-y-2.5">
                  {issues.map((issue, idx) => {
                    const style = severityStyle(issue.severity);
                    const range = timeRange(issue);
                    const confidence = num(issue.confidence);
                    const linked = highlightTopic === issue.topic;
                    return (
                      <li
                        key={`${issue.topic}-${idx}`}
                        id={qcIssueDomId(issue.topic)}
                        className={`p-3.5 rounded-xl border ${style.wrap} space-y-1.5 ${
                          linked ? 'ring-2 ring-caution/60 scroll-mt-24' : ''
                        }`}
                      >
                        <div className="flex items-center justify-between gap-3 flex-wrap">
                          <div className="flex items-center gap-2.5">
                            <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
                            <span className="font-serif text-sm font-semibold text-ink">
                              {issue.topic}
                            </span>
                          </div>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider ${style.badge}`}
                          >
                            {style.label}
                          </span>
                        </div>
                        <p className="text-xs font-sans text-ink/90 leading-relaxed">
                          {issue.description}
                        </p>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 font-mono text-[10px] text-dim">
                          {range && <span>at {range}</span>}
                          {issue.stem && <span>stem: {issue.stem}</span>}
                          <span>
                            confidence:{' '}
                            {confidence === null ? 'not reported' : `${Math.round(confidence * 100)}%`}
                          </span>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            {/* Frequency Energy Balance — only if genuinely measured */}
            <div className="p-6 rounded-2xl bg-panel border border-line shadow-md space-y-4">
              <div className="flex items-center gap-2.5 pb-3 border-b border-line">
                <div className="p-2 rounded-xl bg-caution/10 border border-caution/20 text-caution">
                  <Gauge className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-serif text-base font-bold text-ink">
                    Frequency Energy Balance Profile
                  </h3>
                  <p className="font-mono text-xs text-muted">
                    Measured spectral energy per band relative to zero dBFS reference.
                  </p>
                </div>
              </div>

              {bands.length > 0 ? (
                <div className="space-y-4 font-mono-num text-xs">
                  {bands.map(([bandKey, value]) => {
                    // Normalize -35dB..0dB into 10%..100% width
                    const widthPercent = Math.min(100, Math.max(10, ((value + 35) / 35) * 100));
                    return (
                      <div key={bandKey} className="space-y-1">
                        <div className="flex justify-between text-muted">
                          <span className="text-ink">{BAND_LABELS[bandKey] ?? bandKey}</span>
                          <span className="text-caution">{value.toFixed(1)} dB</span>
                        </div>
                        <div className="h-2.5 bg-bg rounded-full overflow-hidden border border-line p-0.5">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-accent via-caution to-accent transition-all duration-500"
                            style={{ width: `${widthPercent}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-8 text-center bg-bg rounded-xl border border-line text-xs text-muted font-mono-num">
                  The QC report carries no per-band spectrum — nothing measured to show here.
                </div>
              )}
            </div>

            {/* Agent summary + what it would need to be sure */}
            <div className="p-6 rounded-2xl bg-panel border border-line shadow-md space-y-3">
              <h3 className="font-serif text-base font-bold text-ink">QC Agent Summary</h3>
              <p className="text-sm font-serif text-ink/90 leading-relaxed">
                {report.summary || 'The QC agent returned no summary text.'}
              </p>
              {Array.isArray(report.confidence?.needs) && report.confidence.needs.length > 0 && (
                <div className="pt-3 border-t border-line space-y-2">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-caution">
                    What the agent would need to be sure
                  </span>
                  <ul className="space-y-1.5">
                    {report.confidence.needs.map((need, idx) => (
                      <li
                        key={idx}
                        className="flex items-start gap-2.5 text-xs font-sans text-ink bg-bg p-2.5 rounded-xl border border-line"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-caution mt-1.5 flex-shrink-0" />
                        <span>{need}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>

          {/* Right Col: Target Platform Readiness Matrix */}
          <div className="space-y-4">
            <div className="p-6 glass-panel rounded-2xl border border-line-strong">
              <h3 className="font-serif text-base font-semibold text-ink mb-1">
                Platform Delivery Targets
              </h3>
              <p className="text-xs text-muted font-serif mb-4">
                Computed here from the measured values — target loudness and the{' '}
                {TRUE_PEAK_CEILING_DBTP.toFixed(1)} dBTP ceiling.
              </p>

              <div className="space-y-3">
                {platforms.map((p) => (
                  <div
                    key={p.platform}
                    className="p-3.5 rounded-xl bg-bg border border-line hover:border-line-strong transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-serif text-sm font-medium text-ink">
                        {p.platform}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-mono-num uppercase ${
                          PLATFORM_BADGE_CLASS[p.status]
                        }`}
                      >
                        {PLATFORM_BADGE_LABEL[p.status]}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs font-mono-num text-muted mt-2">
                      <span>Target: {p.targetLufs.toFixed(1)} LUFS</span>
                      <span>Ceiling: {TRUE_PEAK_CEILING_DBTP.toFixed(1)} dBTP</span>
                    </div>

                    <div className="text-xs font-mono-num mt-1">
                      {lufs === null ? (
                        <span className="text-dim">Loudness not measured yet</span>
                      ) : (
                        <span className="text-ink">
                          Measured {lufs.toFixed(1)} LUFS (
                          {p.deltaLu! >= 0 ? '+' : ''}
                          {p.deltaLu!.toFixed(1)} LU vs target)
                        </span>
                      )}
                    </div>

                    <p className="text-[11px] text-dim font-serif mt-2 leading-tight">
                      {p.explanation}
                    </p>
                  </div>
                ))}
              </div>

              <div className="mt-4 pt-3 border-t border-line font-mono-num text-[11px]">
                {truePeak === null ? (
                  <span className="text-dim">True Peak not measured yet.</span>
                ) : peakOverCeiling ? (
                  <span className="text-accent-hover">
                    True Peak {truePeak.toFixed(2)} dBTP is over the ceiling on every platform above.
                  </span>
                ) : (
                  <span className="text-accent">
                    True Peak {truePeak.toFixed(2)} dBTP —{' '}
                    {(TRUE_PEAK_CEILING_DBTP - truePeak).toFixed(2)} dB of headroom under the ceiling.
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
