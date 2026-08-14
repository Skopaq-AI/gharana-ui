import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Sparkles,
  AlertTriangle,
  Compass,
  RefreshCw,
  Play,
  Loader2,
  HelpCircle,
  Target
} from 'lucide-react';
import { TrackItem, CheckpointStatus } from '../../types';
import { HumanCheckpointCard } from '../HumanCheckpointCard';
import { PageHeader } from '../SectionPanel';
import { AskPanel } from '../AskPanel';
import { DroppedFindingsNote, FindingList } from '../FindingList';
import {
  ApiError,
  approveStage,
  getRun,
  listProjects,
  listRuns,
  listTemplates,
  redoStage,
  startRun,
  type ArtifactRef,
  type Finding,
  type PipelineRun,
  type ReadinessScore,
  type ReadinessVerdict,
  type StageResult
} from '../../lib/api';
import {
  askOfStage,
  buildEvidenceView,
  isWaitingOnArtist,
  qcReportOfRun,
  readDroppedFindings,
  readFindings,
  readNotAssessed
} from '../../lib/evidence';

/**
 * A&R tab — renders the ReadinessScore produced by the `anr_score` pipeline
 * stage. Findings, score, verdict and confidence all come from that stage
 * output; nothing here is synthesised locally.
 *
 * The evidence comes first, on screen as in the schema. Each finding carries a
 * `Locator` that code already resolved against the data plane, and it renders
 * as the anchor it is — a timestamp, a named measurement, a QC issue, a lyric
 * line. Claims whose evidence did not resolve never arrive; the count of them
 * does, quietly, because a rising drop rate is a regression the artist is
 * entitled to see.
 *
 * When the stage declines outright it returns an `Ask`, and this tab renders
 * the answer form instead of a verdict. There is no path here that produces a
 * score from an Ask.
 */

const POLL_MS = 5000;

const ANR_STAGE = (name: string) => name === 'anr_score' || name.startsWith('anr_');
const QC_STAGE = (name: string) => name === 'qc_analysis' || name.startsWith('qc_');

const VERDICTS: ReadinessVerdict[] = ['not_ready', 'needs_work', 'release_ready'];

const VERDICT_META: Record<
  ReadinessVerdict,
  { label: string; accent: string; ring: string; badge: string; blurb: string }
> = {
  not_ready: {
    label: 'NOT READY',
    accent: 'text-accent-hover',
    ring: 'border-accent',
    badge: 'bg-[var(--accent-dim)] text-accent-hover border border-[var(--accent-border)]',
    blurb: 'The agent would not put this out yet.'
  },
  needs_work: {
    label: 'NEEDS WORK',
    accent: 'text-caution',
    ring: 'border-caution',
    badge: 'bg-caution/20 text-caution border border-caution/40',
    blurb: 'Close, but there are specific fixes to make first.'
  },
  release_ready: {
    label: 'RELEASE READY',
    accent: 'text-accent',
    ring: 'border-accent',
    badge: 'bg-accent/20 text-accent border border-accent/40',
    blurb: 'The agent would ship this.'
  }
};

function verdictMeta(verdict: unknown) {
  return VERDICTS.includes(verdict as ReadinessVerdict)
    ? VERDICT_META[verdict as ReadinessVerdict]
    : {
        label: String(verdict ?? 'UNKNOWN').toUpperCase(),
        accent: 'text-muted',
        ring: 'border-line-strong',
        badge: 'bg-line text-muted border border-line-strong',
        blurb: 'The agent returned a verdict this console does not recognise.'
      };
}

// ---------------------------------------------------------------------------
// Wire helpers — tolerant readers that never invent a value
// ---------------------------------------------------------------------------

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function num(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

/**
 * A readiness payload is recognised by its verdict. An `Ask` has no verdict and
 * no score, so it can never be mistaken for one and rendered as a judgement.
 */
function looksLikeReadiness(rec: Record<string, unknown>): boolean {
  return 'verdict' in rec && ('score' in rec || Array.isArray(rec.findings));
}

function extractReadiness(output: Record<string, unknown> | null): ReadinessScore | null {
  if (!output) return null;
  const candidates = [output, output.readiness, output.score_report, output.result, output.data];
  for (const candidate of candidates) {
    const rec = asRecord(candidate);
    if (rec && looksLikeReadiness(rec)) return rec as unknown as ReadinessScore;
  }
  return null;
}

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

  return { projectId, run, setRun, phase, error, reload };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface AnRFeedbackTabProps {
  track?: TrackItem;
  /** Real gateway project id. When absent the tab resolves one from /projects. */
  projectId?: string | null;
  onUpdateTrack?: (updated: TrackItem) => void;
  onInspectRaw?: (title: string, payload: any) => void;
  /**
   * Jump to a QC issue in the Mix QC tab. Absent when the host cannot navigate,
   * in which case a QC locator renders as a plain chip rather than a dead link.
   */
  onOpenQCIssue?: (topic: string) => void;
  /** Artifacts on the project, so a reference-track locator can be named. */
  artifacts?: ArtifactRef[];
  // App.tsx is owned by another agent and may hand this tab further wiring
  // props; tolerate them rather than breaking the build over an extra name.
  [key: string]: any;
}

export const AnRFeedbackTab: React.FC<AnRFeedbackTabProps> = ({
  track,
  projectId: projectIdProp,
  onInspectRaw,
  onOpenQCIssue,
  artifacts
}) => {
  const { projectId, run, setRun, phase, error, reload } = useLatestRun(projectIdProp, track);

  const [busy, setBusy] = useState<null | 'starting' | 'approving' | 'redoing'>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const anrStages = useMemo<StageResult[]>(
    () => (run ? run.stages.filter((s) => ANR_STAGE(s.stage)) : []),
    [run]
  );

  const scoreStage = useMemo<StageResult | null>(() => {
    for (let i = anrStages.length - 1; i >= 0; i -= 1) {
      if (extractReadiness(anrStages[i].output)) return anrStages[i];
    }
    return null;
  }, [anrStages]);

  // A stage waiting on the artist for an input is deliberately excluded from
  // both of these. There is no verdict on an Ask to approve, and an "Approve &
  // Advance" on one would carry the run forward on evidence nobody supplied.
  // The status test stands alone: a stage parked on AWAITING_INPUT whose Ask
  // this console cannot parse is still not approvable.
  const checkpointStage = useMemo<StageResult | null>(
    () =>
      anrStages.find((s) => s.status === 'awaiting_approval' && !isWaitingOnArtist(s)) ??
      scoreStage ??
      anrStages.find((s) => !isWaitingOnArtist(s)) ??
      null,
    [anrStages, scoreStage]
  );

  const awaitingStage = useMemo<StageResult | null>(
    () =>
      run?.stages.find((s) => s.status === 'awaiting_approval' && !isWaitingOnArtist(s)) ?? null,
    [run]
  );

  const readiness = useMemo(() => extractReadiness(scoreStage?.output ?? null), [scoreStage]);

  /**
   * The A&R stage the run is parked on because it asked for something.
   *
   * Checked before anything renders a verdict: a stage that returned an Ask has
   * no score, and offering the artist an "approve" on a question is how a run
   * advances on evidence nobody supplied.
   */
  const askStage = useMemo<StageResult | null>(
    () => anrStages.find((s) => isWaitingOnArtist(s)) ?? null,
    [anrStages]
  );
  const ask = useMemo(() => askOfStage(askStage), [askStage]);

  const score = readiness ? num(readiness.score) : null;
  const meta = verdictMeta(readiness?.verdict);

  // Findings the console could read, and everything discarded on the way here —
  // the server's drops plus any this build could not parse. Both are the same
  // fact to the artist: a claim they are not being shown.
  const parsedFindings = useMemo(() => readFindings(readiness?.findings), [readiness]);
  const findings = useMemo<Finding[]>(() => parsedFindings.kept, [parsedFindings]);
  const droppedFindings = useMemo<string[]>(
    () => [...readDroppedFindings(readiness?.dropped_findings), ...parsedFindings.dropped],
    [readiness, parsedFindings]
  );

  /**
   * What a locator can be resolved against on this screen. The QC report is
   * read off the same run, so a `measured_value` shows its number and a
   * `qc_issue` shows its severity — and where the console holds neither, the
   * anchor renders as a name with no number attached to it.
   */
  const evidence = useMemo(
    () => buildEvidenceView({ qcReport: qcReportOfRun(run), artifacts }),
    [run, artifacts]
  );

  /**
   * The stage answered, and the guard threw the answer away (or there was no
   * model to answer at all). Read separately because this envelope carries no
   * score and no verdict on purpose — falling through to "no score yet, start a
   * run" would hide the one thing worth reporting, which is that an assessment
   * existed and was withdrawn.
   */
  const notAssessed = useMemo(
    () => readNotAssessed(scoreStage?.output ?? anrStages[anrStages.length - 1]?.output ?? null),
    [scoreStage, anrStages]
  );

  const needs = useMemo<string[]>(
    () =>
      Array.isArray(readiness?.confidence?.needs)
        ? (readiness!.confidence.needs as unknown[]).filter((n): n is string => typeof n === 'string')
        : [],
    [readiness]
  );
  const confidenceScore = readiness ? num(readiness.confidence?.score) : null;

  // --- Actions -------------------------------------------------------------
  const handleStartRun = useCallback(async () => {
    if (!projectId) return;
    setBusy('starting');
    setActionError(null);
    try {
      let template = 'single_release';
      try {
        const templates = await listTemplates();
        const chosen =
          templates.find((t) => t.name === 'single_release') ??
          templates.find((t) => t.stages.some((s) => ANR_STAGE(s.name)));
        if (chosen) template = chosen.name;
      } catch {
        /* template listing is a nicety; the default is a real template */
      }
      setRun(await startRun(projectId, template));
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

  // --- Header action -------------------------------------------------------
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
  } else if (askStage) {
    // Parked on the artist. The action is the form below, not another run —
    // and certainly not an approval, which is why this is inert.
    headerButton = (
      <button
        disabled
        className="px-4 py-2.5 rounded-xl bg-line text-caution font-mono text-xs font-bold flex items-center gap-2 cursor-not-allowed"
        title="This stage asked you for something. Answer it below."
      >
        <HelpCircle className="w-4 h-4" />
        <span>Waiting on you · {askStage.stage}</span>
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
          {busy === 'approving'
            ? 'Advancing pipeline…'
            : `Approve & Advance · ${awaitingStage.stage}`}
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
        <span>{busy === 'starting' ? 'Starting pipeline run…' : 'Run A&R Readiness Scoring'}</span>
      </button>
    );
  }

  const approvedCount = run ? run.stages.filter((s) => s.status === 'approved').length : 0;
  const qcApproved = run ? run.stages.some((s) => QC_STAGE(s.stage) && s.status === 'approved') : false;

  return (
    <div className="space-y-6">
      {/* Standardized Page Header */}
      <PageHeader
        icon={Sparkles}
        title="A&R Direction & Editorial Critique"
        description="Release readiness scored by the anr_score pipeline stage, on measured QC evidence."
        badge="Gateway A&R Agent"
        action={headerButton}
      >
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 font-mono text-[11px] text-muted">
          {run ? (
            <>
              <span>
                Run <span className="text-ink">{run.id.slice(0, 8)}</span>
              </span>
              <span>
                Template <span className="text-ink">{run.template}</span>
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
              {scoreStage && (
                <span>
                  A&R stage <span className="text-ink">{scoreStage.stage}</span>
                </span>
              )}
            </>
          ) : (
            <span>
              {loadingRun ? 'Reading pipeline state…' : 'No pipeline run for this project yet.'}
            </span>
          )}
        </div>
      </PageHeader>

      {/* Gateway / action errors */}
      {(error || actionError) && (
        <div className="p-4 rounded-2xl bg-[var(--accent-dim)] border border-[var(--accent-border)] flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-accent-hover flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-serif text-sm font-semibold text-ink">
                {error ? 'Could not load the pipeline' : 'Pipeline action failed'}
              </p>
              <p className="font-mono text-xs text-blocking mt-1 break-words">
                {error ?? actionError}
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              setActionError(null);
              reload();
            }}
            className="px-3 py-1.5 rounded-lg bg-surface border border-line-strong text-xs font-mono text-ink hover:border-accent flex-shrink-0"
          >
            Retry
          </button>
        </div>
      )}

      {/* No project to score */}
      {phase === 'no_project' && (
        <div className="p-8 rounded-2xl bg-panel border border-line text-center space-y-2">
          <HelpCircle className="w-6 h-6 text-muted mx-auto" />
          <h3 className="font-serif text-base font-bold text-ink">
            This track is not linked to a GHARANA project
          </h3>
          <p className="font-mono text-xs text-muted max-w-lg mx-auto">
            A&R readiness is scored per project, from the pipeline's measured QC evidence. Create or
            select the project this track belongs to, then start a run.
          </p>
        </div>
      )}

      {/* Loading */}
      {loadingRun && (
        <div className="p-8 rounded-2xl bg-panel border border-line text-center">
          <Loader2 className="w-5 h-5 text-muted mx-auto animate-spin" />
          <p className="font-mono text-xs text-muted mt-3">Loading A&R readiness score…</p>
        </div>
      )}

      {/* The stage asked for something instead of guessing. Answer it. */}
      {run && askStage && ask && (
        <AskPanel
          ask={ask}
          stage={askStage.stage}
          runId={run.id}
          projectId={projectId}
          artifacts={artifacts ?? []}
          onAnswered={(updated) => setRun(updated)}
          onRedo={handleRedo}
        />
      )}

      {/* Parked on the artist, but the request itself did not parse. Say that
          plainly rather than rendering an empty form or, worse, nothing. */}
      {run && askStage && !ask && (
        <div className="p-5 rounded-2xl bg-surface border border-caution/30 space-y-2">
          <h4 className="font-serif text-sm font-bold text-ink">
            This stage is waiting on you, but the console could not read what it asked for
          </h4>
          <p className="font-mono text-xs text-muted leading-relaxed">
            Stage <span className="text-caution">{askStage.stage}</span> is parked on{' '}
            <span className="text-caution">{askStage.status}</span> and its output is not a
            recognisable request. Nothing is being guessed on your behalf. Read the raw payload, or
            re-run the stage.
          </p>
          <div className="flex flex-wrap items-center gap-2 pt-1">
            {onInspectRaw && (
              <button
                onClick={() => onInspectRaw(`Stage output · ${askStage.stage}`, askStage)}
                className="px-3 py-1.5 rounded-lg bg-line hover:bg-line-strong border border-line-strong text-xs font-mono text-ink"
              >
                Inspect raw payload
              </button>
            )}
            <button
              onClick={() => handleRedo(askStage.stage)}
              disabled={busy !== null}
              className="px-3 py-1.5 rounded-lg bg-line hover:bg-line-strong border border-line-strong text-xs font-mono text-ink inline-flex items-center gap-2 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${busy === 'redoing' ? 'animate-spin' : ''}`} />
              <span>Re-run this stage</span>
            </button>
          </div>
        </div>
      )}

      {/* Human Approval Checkpoint — the real stage checkpoint */}
      {run && checkpointStage && (
        <HumanCheckpointCard
          title={`A&R checkpoint · ${checkpointStage.stage}`}
          recommendation={
            readiness?.single_pick ??
            findings[0]?.claim ??
            // "has not produced one yet" is wrong for a withdrawn assessment:
            // it produced one and the guard took it away. Say which.
            notAssessed?.note ??
            checkpointStage.error ??
            'The A&R agent has not produced a readiness score for this stage yet.'
          }
          status={STAGE_TO_CHECKPOINT[checkpointStage.status] ?? 'pending_artist_approval'}
          agentName="GHARANA anr agent"
          onApprove={() => handleApprove(checkpointStage.stage)}
          onReject={() => handleRedo(checkpointStage.stage)}
          onInspectRawPayload={
            onInspectRaw
              ? () => onInspectRaw(`Stage output · ${checkpointStage.stage}`, checkpointStage)
              : undefined
          }
        />
      )}

      {/* The stage answered and the answer was withdrawn. Say that, and show
          what was cut — never a zero where a judgement goes. */}
      {!loadingRun && !readiness && notAssessed && (
        <div className="p-6 rounded-2xl bg-panel border border-line shadow-md space-y-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] font-mono uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-line text-muted border border-line-strong font-bold">
              Not assessed
            </span>
            <span className="font-mono text-[10px] text-dim">{notAssessed.cause}</span>
          </div>
          <h3 className="font-serif text-base font-bold text-ink">
            {notAssessed.cause === 'no_model_credentials'
              ? 'No A&R model ran for this project'
              : 'The A&R answer was withdrawn before you saw it'}
          </h3>
          {notAssessed.note && (
            <p className="font-sans text-xs text-muted leading-relaxed break-words">
              {notAssessed.note}
            </p>
          )}
          <p className="font-mono text-[11px] text-dim leading-relaxed">
            There is no score and no verdict here — not a zero, and not a guess.
          </p>
          <DroppedFindingsNote dropped={notAssessed.dropped_findings} />
        </div>
      )}

      {/* No score yet: call to action, never an invented verdict. Suppressed
          while an Ask is on screen — the Ask already says why there is no
          score, and a second panel offering "start a run" would talk over it. */}
      {!loadingRun && phase === 'ready' && !readiness && !ask && !notAssessed && (
        <div className="p-8 rounded-2xl bg-panel border border-line shadow-md text-center space-y-4">
          <div className="inline-flex p-3 rounded-2xl bg-[var(--accent-dim)] border border-[var(--accent-border)] text-accent">
            <Target className="w-6 h-6" />
          </div>
          <div className="space-y-1.5">
            <h3 className="font-serif text-lg font-bold text-ink">
              {scoreStage
                ? 'No readiness score on this run yet'
                : run
                ? 'This run has not reached the A&R stage yet'
                : 'No A&R readiness score for this project yet'}
            </h3>
            <p className="font-mono text-xs text-muted max-w-xl mx-auto leading-relaxed">
              The <span className="text-caution">anr_score</span> stage reads the measured QC report
              and scores release readiness. It runs after{' '}
              <span className="text-caution">qc_analysis</span> is approved
              {run && !qcApproved ? ' — that checkpoint is still open.' : '.'} Until then there is no
              score, and this console will not guess one.
            </p>
          </div>
          {anrStages.some((s) => s.status === 'failed') && (
            <p className="font-mono text-xs text-accent-hover">
              A&R stage failed:{' '}
              {anrStages.find((s) => s.status === 'failed')?.error ?? 'no detail returned'}
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
                    ? 'Pipeline is running…'
                    : busy === 'starting'
                    ? 'Starting pipeline run…'
                    : 'Start a pipeline run'}
                </span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Primary Verdict Card */}
      {readiness && (
        <div className="p-6 rounded-2xl bg-panel border border-line shadow-md space-y-4 relative overflow-hidden">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <span className="text-[10px] font-mono uppercase tracking-wider text-caution bg-surface px-3 py-1 rounded-full border border-caution/20 font-bold">
              A&R Readiness Verdict
            </span>
            <span
              className={`text-[10px] font-mono uppercase tracking-wider px-3 py-1 rounded-full font-bold ${meta.badge}`}
            >
              {meta.label}
            </span>
          </div>

          <h3 className={`font-serif text-xl md:text-2xl font-bold leading-snug ${meta.accent}`}>
            {meta.label}
            <span className="text-ink"> — {meta.blurb}</span>
          </h3>

          <div className="pt-4 border-t border-line font-sans text-xs text-muted leading-relaxed">
            {readiness.single_pick ? (
              <p>
                <span className="text-caution font-mono uppercase text-[10px] tracking-wider mr-2">
                  Single pick
                </span>
                <span className="text-ink">{readiness.single_pick}</span>
              </p>
            ) : (
              <p>The agent did not nominate a single pick for this project.</p>
            )}
          </div>
        </div>
      )}

      {/* Grid: Findings vs Score / Confidence */}
      {readiness && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Findings — evidence first, as in the schema */}
          <div className="lg:col-span-2 space-y-6">
            <div className="p-6 rounded-2xl bg-panel border border-line shadow-md space-y-4">
              <div className="flex items-center gap-2.5 pb-3 border-b border-line">
                <div className="p-2 rounded-xl bg-caution/10 border border-caution/20 text-caution">
                  <Compass className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-serif text-base font-bold text-ink">
                    Why this verdict ({findings.length})
                  </h4>
                  <p className="font-mono text-xs text-muted">
                    Every claim points at something in your project — a moment, a measurement, a QC
                    issue, a line.
                  </p>
                </div>
              </div>

              <FindingList
                findings={findings}
                evidence={evidence}
                onOpenQCIssue={onOpenQCIssue}
                emptyNote={
                  droppedFindings.length > 0
                    ? 'Every claim the agent made pointed at something this project does not contain, so none of them are shown. The verdict below stands on nothing you can check — treat it as unsupported.'
                    : 'The agent returned a verdict with no findings attached. There is nothing here to check it against.'
                }
              />

              {/* Quiet, honest, not an error state. */}
              <DroppedFindingsNote dropped={droppedFindings} />
            </div>

            {/* "Specific or silent": what the agent would need to be sure */}
            {needs.length > 0 && (
              <div className="p-6 rounded-2xl bg-surface border border-caution/40 ring-1 ring-caution/20 shadow-md space-y-4">
                <div className="flex items-center gap-2.5 pb-3 border-b border-line-strong">
                  <div className="p-2 rounded-xl bg-caution/15 border border-caution/30 text-caution">
                    <HelpCircle className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-serif text-base font-bold text-ink">
                      What would have made this call surer
                    </h4>
                    {/* Confidence.needs is prose the agent wrote, not a form.
                        When a stage genuinely cannot proceed it returns an Ask
                        instead, and that one has controls. Do not word this as
                        if there were something to fill in here. */}
                    <p className="font-mono text-xs text-muted">
                      The agent's own words. Unlike a request for input, there is nothing to submit
                      here — it scored anyway and said what was thin.
                    </p>
                  </div>
                </div>

                <ul className="space-y-2.5">
                  {needs.map((need, idx) => (
                    <li
                      key={idx}
                      className="flex items-start gap-3 text-xs font-sans text-ink bg-bg p-3 rounded-xl border border-line-strong"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-caution mt-1.5 flex-shrink-0" />
                      <span>{need}</span>
                    </li>
                  ))}
                </ul>

                {checkpointStage && (
                  <button
                    onClick={() => handleRedo(checkpointStage.stage)}
                    disabled={busy !== null}
                    className="px-4 py-2 rounded-xl bg-line hover:bg-line-strong disabled:opacity-60 border border-line-strong text-xs font-mono text-ink transition-colors inline-flex items-center gap-2"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${busy === 'redoing' ? 'animate-spin' : ''}`} />
                    <span>{busy === 'redoing' ? 'Requesting redo…' : 'Redo this stage'}</span>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Right Col: Score gauge + confidence */}
          <div className="space-y-6">
            <div className="p-6 rounded-2xl bg-panel border border-line shadow-md text-center space-y-4">
              <span className="text-[10px] font-mono text-muted uppercase tracking-wider block">
                Release Readiness Score
              </span>

              {score === null ? (
                <div className="my-2 inline-flex items-center justify-center w-24 h-24 rounded-full bg-bg border-4 border-line-strong">
                  <span className="text-[10px] font-mono text-muted px-2 leading-tight">
                    Not scored
                  </span>
                </div>
              ) : (
                <div
                  className={`my-2 inline-flex items-center justify-center w-24 h-24 rounded-full bg-bg border-4 shadow-xl ${meta.ring}`}
                >
                  <span className={`text-2xl font-bold font-mono ${meta.accent}`}>
                    {Math.round(score)}
                  </span>
                  <span className="text-xs font-mono text-muted">/100</span>
                </div>
              )}

              <p className="text-xs font-sans text-muted">
                Scored by the A&R agent on the measured QC report for this project.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-panel border border-line shadow-md space-y-3">
              <h5 className="text-xs text-caution font-bold uppercase font-mono flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                Agent Confidence
              </h5>

              {confidenceScore === null ? (
                <p className="font-mono text-xs text-dim">Confidence not reported.</p>
              ) : (
                <>
                  <div className="flex items-baseline justify-between font-mono">
                    <span className="text-2xl font-bold text-ink">
                      {Math.round(confidenceScore * 100)}%
                    </span>
                    <span className="text-[10px] text-dim uppercase tracking-wider">
                      {needs.length > 0 ? `${needs.length} open need${needs.length === 1 ? '' : 's'}` : 'no open needs'}
                    </span>
                  </div>
                  <div className="h-2.5 bg-bg rounded-full overflow-hidden border border-line p-0.5">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-accent via-caution to-accent transition-all duration-500"
                      style={{ width: `${Math.min(100, Math.max(2, confidenceScore * 100))}%` }}
                    />
                  </div>
                </>
              )}

              {needs.length === 0 && (
                <p className="font-mono text-[11px] text-dim pt-1">
                  The agent listed nothing further it needs for this call.
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
