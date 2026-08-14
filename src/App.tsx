import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Plus,
  X,
  Upload,
  Loader2,
  AlertTriangle,
  FolderOpen,
  PlayCircle,
  RefreshCw,
  FileAudio
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ActiveTab, TrackItem } from './types';
import {
  ApiError,
  approveStage,
  createArtist,
  createProject,
  getRun,
  listArtifacts,
  listArtists,
  listProjects,
  listRuns,
  listTemplates,
  redoStage,
  startRun,
  uploadArtifact,
  type ArtifactKind,
  type ArtifactRef,
  type Artist,
  type PipelineRun,
  type PipelineTemplate,
  type Project,
  type QCReport,
  type ReadinessScore,
  type ReleasePlan,
  type StageResult
} from './lib/api';
import { askOfStage, isWaitingOnArtist } from './lib/evidence';
import { AskPanel } from './components/AskPanel';
import { IntentComposer } from './components/IntentComposer';
import { NightBackground } from './components/NightBackground';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { AudioPlayerBar } from './components/AudioPlayerBar';
import { PipelineProgressTracker } from './components/PipelineProgressTracker';
import { HumanCheckpointCard } from './components/HumanCheckpointCard';
import { InspectorModal } from './components/InspectorModal';
import { LandingPage } from './components/landing/LandingPage';
import { MobileApprovalModal } from './components/MobileApprovalModal';
import { MixQCTab } from './components/tabs/MixQCTab';
import { AnRFeedbackTab } from './components/tabs/AnRFeedbackTab';
import { LyricsTab } from './components/tabs/LyricsTab';
import { SplitsTab } from './components/tabs/SplitsTab';
import { ReleaseDeliveryTab } from './components/tabs/ReleaseDeliveryTab';
import { GrowthTab } from './components/tabs/GrowthTab';
import { AgentMarketplaceTab } from './components/tabs/AgentMarketplaceTab';
import { SettingsTab } from './components/tabs/SettingsTab';
import { LegalPage } from './components/legal/LegalPages';
import { isLegalPath } from './lib/legal';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const AUDIO_KINDS: ArtifactKind[] = ['audio_bounce', 'audio_master', 'audio_stem', 'audio_reference'];
const RUN_POLL_MS = 4000;

function errMsg(err: unknown): string {
  if (err instanceof ApiError) {
    return err.status ? `${err.status} — ${err.detail}` : err.detail;
  }
  return err instanceof Error ? err.message : String(err);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

/** A QC report is recognised by its measurement fields, not by stage naming. */
function looksLikeQCReport(value: unknown): value is QCReport {
  return isRecord(value) && 'lufs_integrated' in value && 'issues' in value;
}

function looksLikeReadiness(value: unknown): value is ReadinessScore {
  return isRecord(value) && 'score' in value && 'verdict' in value;
}

/**
 * Search every stage output (and one level inside it, since outputs are
 * sometimes wrapped) for a payload matching `pred`. Returns null when the run
 * has not produced one — the callers all render "not measured yet" for null.
 */
function findStageOutput<T>(run: PipelineRun | null, pred: (v: unknown) => v is T): T | null {
  if (!run) return null;
  for (const stage of run.stages ?? []) {
    const output = stage.output;
    if (!output) continue;
    if (pred(output)) return output;
    for (const nested of Object.values(output)) {
      if (pred(nested)) return nested;
    }
  }
  return null;
}

/**
 * Build the TrackItem view model the existing tab components consume.
 *
 * Every field here is either real (straight off the gateway) or deliberately
 * absent. There is no placeholder loudness, no invented A&R verdict and no
 * synthetic checklist: the fields the backend does not provide stay undefined
 * so the components fall through to their "not measured / nothing yet" states.
 */
function projectToTrack(
  project: Project,
  artifacts: ArtifactRef[],
  run: PipelineRun | null,
  qcReport: QCReport | null,
  readiness: ReadinessScore | null
): TrackItem {
  const stageOutputs: Record<string, StageResult> = {};
  const rawAgentPayloads: Record<string, unknown> = {};
  for (const stage of run?.stages ?? []) {
    stageOutputs[stage.stage] = stage;
    if (stage.output) rawAgentPayloads[stage.stage] = stage.output;
  }

  return {
    id: project.id,
    title: project.title,
    artist: project.artist_name,
    // The gateway's Project row carries no language or genre; say nothing
    // rather than guessing one.
    language: 'Multi-Language',
    genre: '',
    // Duration is not measured or returned by the backend today.
    durationSeconds: 0,
    updatedAt: project.created_at ?? '',

    // Only ever populated from a real QC report.
    audioMetrics: qcReport
      ? {
          integratedLufs: qcReport.lufs_integrated ?? undefined,
          truePeakDbtp: qcReport.true_peak_db ?? undefined
        }
      : undefined,

    // The legacy presentational blocks (arAssessment, lyricAnalysis,
    // splitGovernance, releaseTasks, growthAnalytics, retroReport) stay empty
    // until each tab is wired to its own real source.
    releaseTasks: [],
    rawAgentPayloads,

    // Real wire objects, for components that want the truth.
    projectId: project.id,
    project,
    artifacts,
    activeRun: run,
    qcReport,
    readiness,
    stageOutputs
  };
}

// ---------------------------------------------------------------------------
// App
// ---------------------------------------------------------------------------

function ConsoleApp() {
  // Land on the composer, not on a QC screen that needs a project the artist
  // may not have yet. The first thing GHARANA asks for is a sentence.
  const [activeTab, setActiveTab] = useState<ActiveTab>('overview');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [installedAgentIds, setInstalledAgentIds] = useState<string[]>([]);
  const [showGlobalMobileApproval, setShowGlobalMobileApproval] = useState(false);

  // --- Projects ------------------------------------------------------------
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(true);
  const [projectsError, setProjectsError] = useState<string | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

  // --- Artists (needed to create a project) --------------------------------
  const [artists, setArtists] = useState<Artist[]>([]);
  const [artistsError, setArtistsError] = useState<string | null>(null);

  // --- Artifacts of the selected project -----------------------------------
  const [artifacts, setArtifacts] = useState<ArtifactRef[]>([]);
  const [artifactsLoading, setArtifactsLoading] = useState(false);
  const [artifactsError, setArtifactsError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // --- Runs ----------------------------------------------------------------
  const [activeRun, setActiveRun] = useState<PipelineRun | null>(null);
  const [runLoading, setRunLoading] = useState(false);
  const [runError, setRunError] = useState<string | null>(null);
  const [pollNonce, setPollNonce] = useState(0);
  const [templates, setTemplates] = useState<PipelineTemplate[]>([]);
  const [templatesError, setTemplatesError] = useState<string | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [startingRun, setStartingRun] = useState(false);
  const [startRunError, setStartRunError] = useState<string | null>(null);

  // --- Inspector -----------------------------------------------------------
  const [inspectorState, setInspectorState] = useState<{
    isOpen: boolean;
    title: string;
    payload: any;
  }>({ isOpen: false, title: '', payload: null });

  const openInspector = useCallback((title: string, payload: any) => {
    setInspectorState({ isOpen: true, title, payload });
  }, []);

  // --- QC issue deep link --------------------------------------------------
  // A finding's `qc_issue` locator is a link to that issue, not a label. This
  // is where the link lands: the Mix QC tab, scrolled to the topic.
  const [highlightedQCTopic, setHighlightedQCTopic] = useState<string | null>(null);

  const openQCIssue = useCallback((topic: string) => {
    setHighlightedQCTopic(topic);
    setActiveTab('mix_qc');
  }, []);

  // --- New project modal ---------------------------------------------------
  const [showNewProjectModal, setShowNewProjectModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newArtistId, setNewArtistId] = useState<string>('__new__');
  const [newArtistName, setNewArtistName] = useState('');
  const [newArtistLanguage, setNewArtistLanguage] = useState('');
  const [newArtistWhatsapp, setNewArtistWhatsapp] = useState('');
  const [newFile, setNewFile] = useState<File | null>(null);
  const [newFileKind, setNewFileKind] = useState<ArtifactKind>('audio_bounce');
  const [creating, setCreating] = useState(false);
  const [createStep, setCreateStep] = useState('');
  const [createError, setCreateError] = useState<string | null>(null);

  // -------------------------------------------------------------------------
  // Loaders
  // -------------------------------------------------------------------------

  const loadProjects = useCallback(async (selectFirst = false) => {
    setProjectsLoading(true);
    setProjectsError(null);
    try {
      const rows = await listProjects();
      setProjects(rows);
      if (selectFirst) {
        setSelectedProjectId((current) => current ?? rows[0]?.id ?? null);
      }
      return rows;
    } catch (err) {
      setProjectsError(errMsg(err));
      return [];
    } finally {
      setProjectsLoading(false);
    }
  }, []);

  const loadArtists = useCallback(async () => {
    setArtistsError(null);
    try {
      setArtists(await listArtists());
    } catch (err) {
      setArtistsError(errMsg(err));
    }
  }, []);

  const loadArtifacts = useCallback(async (projectId: string) => {
    setArtifactsLoading(true);
    setArtifactsError(null);
    try {
      setArtifacts(await listArtifacts(projectId));
    } catch (err) {
      setArtifacts([]);
      setArtifactsError(errMsg(err));
    } finally {
      setArtifactsLoading(false);
    }
  }, []);

  /** Load the newest run for a project and hydrate it via getRun. */
  const loadLatestRun = useCallback(async (projectId: string) => {
    setRunLoading(true);
    setRunError(null);
    try {
      const summaries = await listRuns(projectId);
      if (summaries.length === 0) {
        setActiveRun(null);
        return;
      }
      const newest = [...summaries].sort((a, b) => {
        const at = a.created_at ? Date.parse(a.created_at) : 0;
        const bt = b.created_at ? Date.parse(b.created_at) : 0;
        return bt - at;
      })[0];
      setActiveRun(await getRun(newest.id));
    } catch (err) {
      setActiveRun(null);
      setRunError(errMsg(err));
    } finally {
      setRunLoading(false);
    }
  }, []);

  // Initial load.
  useEffect(() => {
    void loadProjects(true);
    void loadArtists();
    listTemplates()
      .then((tpls) => {
        setTemplates(tpls);
        setSelectedTemplate((current) => current || tpls[0]?.name || '');
      })
      .catch((err) => setTemplatesError(errMsg(err)));
  }, [loadProjects, loadArtists]);

  // Project selection -> artifacts + runs.
  useEffect(() => {
    if (!selectedProjectId) {
      setArtifacts([]);
      setActiveRun(null);
      return;
    }
    setUploadError(null);
    setStartRunError(null);
    void loadArtifacts(selectedProjectId);
    void loadLatestRun(selectedProjectId);
  }, [selectedProjectId, loadArtifacts, loadLatestRun]);

  // Poll an active run until it finishes. A completed or failed run is final,
  // so polling stops there rather than hammering the orchestrator.
  useEffect(() => {
    if (!activeRun) return;
    if (activeRun.status === 'completed' || activeRun.status === 'failed') return;

    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const fresh = await getRun(activeRun.id);
        if (cancelled) return;
        setRunError(null);
        setActiveRun(fresh);
      } catch (err) {
        if (cancelled) return;
        setRunError(errMsg(err));
        // Keep trying: a 502 from the orchestrator is usually transient.
        setPollNonce((n) => n + 1);
      }
    }, RUN_POLL_MS);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [activeRun, pollNonce]);

  // -------------------------------------------------------------------------
  // Derived state
  // -------------------------------------------------------------------------

  const activeProject = useMemo(
    () => projects.find((p) => p.id === selectedProjectId) ?? null,
    [projects, selectedProjectId]
  );

  const qcReport = useMemo(() => findStageOutput<QCReport>(activeRun, looksLikeQCReport), [activeRun]);
  const readiness = useMemo(
    () => findStageOutput<ReadinessScore>(activeRun, looksLikeReadiness),
    [activeRun]
  );

  const audioArtifact = useMemo(() => {
    const audio = artifacts.filter((a) => AUDIO_KINDS.includes(a.kind));
    if (audio.length === 0) return null;
    // Prefer the artifact the QC report actually measured.
    const measured = qcReport?.mix_ref?.id;
    return audio.find((a) => a.id === measured) ?? audio[audio.length - 1];
  }, [artifacts, qcReport]);

  /**
   * The stage the run is parked on because it asked for something.
   *
   * A stage that returns an `Ask` produced no verdict, so it never reaches the
   * approval card below — there is nothing on it to approve, and an approval
   * would advance the run on evidence nobody supplied.
   */
  const askStage: StageResult | null = useMemo(
    () => activeRun?.stages?.find((s) => isWaitingOnArtist(s)) ?? null,
    [activeRun]
  );
  const ask = useMemo(() => askOfStage(askStage), [askStage]);

  const awaitingStage: StageResult | null = useMemo(
    () =>
      activeRun?.stages?.find((s) => s.status === 'awaiting_approval' && !isWaitingOnArtist(s)) ??
      null,
    [activeRun]
  );

  // An Ask is a pending human action too — it belongs in the same badge as a
  // checkpoint, or an artist who only ever looks at the count will not know the
  // run has stopped for them.
  const pendingCheckpointsCount = useMemo(() => {
    const stages = activeRun?.stages ?? [];
    return stages.filter((s) => s.status === 'awaiting_approval' || isWaitingOnArtist(s)).length;
  }, [activeRun]);

  const activeTrack: TrackItem | null = useMemo(
    () => (activeProject ? projectToTrack(activeProject, artifacts, activeRun, qcReport, readiness) : null),
    [activeProject, artifacts, activeRun, qcReport, readiness]
  );

  const tracks: TrackItem[] = useMemo(
    () => (activeTrack ? [activeTrack] : []),
    [activeTrack]
  );

  // The mobile approval preview renders loudness figures, so it is only offered
  // once this project has genuinely been measured.
  const mobileApprovalDisabledReason =
    !activeTrack
      ? 'Select a project first'
      : activeTrack.audioMetrics?.integratedLufs === undefined
      ? 'No measured QC report for this project yet'
      : !awaitingStage
      ? 'No stage is awaiting approval'
      : null;

  // -------------------------------------------------------------------------
  // Actions
  // -------------------------------------------------------------------------

  const handleInstallAgent = (agentId: string) => {
    setInstalledAgentIds((prev) => (prev.includes(agentId) ? prev : [...prev, agentId]));
  };

  const handleApproveStage = useCallback(
    async (stage: string) => {
      if (!activeRun) throw new Error('No active run');
      const updated = await approveStage(activeRun.id, stage);
      setActiveRun(updated);
      setRunError(null);
    },
    [activeRun]
  );

  const handleRedoStage = useCallback(
    async (stage: string) => {
      if (!activeRun) throw new Error('No active run');
      const updated = await redoStage(activeRun.id, stage);
      setActiveRun(updated);
      setRunError(null);
    },
    [activeRun]
  );

  const handleUploadArtifact = async (file: File, kind: ArtifactKind) => {
    if (!selectedProjectId) return;
    setUploading(true);
    setUploadError(null);
    try {
      await uploadArtifact(selectedProjectId, file, kind);
      await loadArtifacts(selectedProjectId);
    } catch (err) {
      setUploadError(errMsg(err));
    } finally {
      setUploading(false);
    }
  };

  const handleStartRun = async () => {
    if (!selectedProjectId || !selectedTemplate) return;
    setStartingRun(true);
    setStartRunError(null);
    try {
      const run = await startRun(selectedProjectId, selectedTemplate);
      setActiveRun(run);
      setRunError(null);
    } catch (err) {
      setStartRunError(errMsg(err));
    } finally {
      setStartingRun(false);
    }
  };

  /**
   * The artist approved a plan produced from one sentence.
   *
   * Two paths, and neither invents anything the plan did not establish. With a
   * project already open, the plan's template starts a run against it. Without
   * one, the existing New Project form opens pre-filled — a plan cannot conjure
   * an artist record, and guessing which artist a sentence belongs to would
   * attach someone's release to the wrong account.
   */
  const handlePlanApproved = async (plan: ReleasePlan) => {
    setSelectedTemplate(plan.template);
    if (selectedProjectId) {
      setStartingRun(true);
      setStartRunError(null);
      try {
        setActiveRun(await startRun(selectedProjectId, plan.template));
        setRunError(null);
        setActiveTab('mix_qc');
      } catch (err) {
        setStartRunError(errMsg(err));
      } finally {
        setStartingRun(false);
      }
      return;
    }
    setNewTitle(plan.signals.title?.trim() || '');
    setShowNewProjectModal(true);
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    setCreating(true);
    setCreateError(null);
    try {
      let artistId = newArtistId;
      if (artistId === '__new__') {
        if (!newArtistName.trim()) {
          setCreateError('Give the new artist a name, or pick an existing one.');
          setCreating(false);
          return;
        }
        setCreateStep('Creating artist…');
        const artist = await createArtist({
          name: newArtistName.trim(),
          language: newArtistLanguage.trim() || null,
          whatsapp: newArtistWhatsapp.trim() || null
        });
        artistId = artist.id;
        await loadArtists();
      }

      setCreateStep('Creating project…');
      const project = await createProject({ artist_id: artistId, title: newTitle.trim() });

      if (newFile) {
        setCreateStep('Uploading audio — the backend measures it on ingest…');
        await uploadArtifact(project.id, newFile, newFileKind);
      }

      setCreateStep('Refreshing…');
      await loadProjects();
      setSelectedProjectId(project.id);

      setShowNewProjectModal(false);
      setNewTitle('');
      setNewArtistName('');
      setNewArtistLanguage('');
      setNewArtistWhatsapp('');
      setNewFile(null);
    } catch (err) {
      setCreateError(errMsg(err));
    } finally {
      setCreating(false);
      setCreateStep('');
    }
  };

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  const tabProps = activeTrack
    ? {
        track: activeTrack,
        // Tabs are fed from App state; the backend owns the truth, so a local
        // edit is not persisted anywhere. Refresh the project instead of
        // pretending the mutation succeeded.
        onUpdateTrack: () => {
          if (selectedProjectId) {
            void loadArtifacts(selectedProjectId);
            void loadLatestRun(selectedProjectId);
          }
        },
        onInspectRaw: openInspector
      }
    : null;

  return (
    <div className="min-h-screen bg-bg text-ink font-sans relative selection:bg-accent selection:text-bg flex overflow-x-hidden">

      {/* Night Raga Lighting Background Layer */}
      <NightBackground />

      {/* Collapsible Left Sidebar */}
      <Sidebar
        tracks={tracks}
        activeTrack={activeTrack}
        activeTab={activeTab}
        onSelectTab={(tab) => setActiveTab(tab)}
        onSelectTrack={(trackId) => setSelectedProjectId(trackId)}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        pendingCheckpointsCount={pendingCheckpointsCount}
        onOpenMobileApproval={
          mobileApprovalDisabledReason ? undefined : () => setShowGlobalMobileApproval(true)
        }
      />

      {/* Main Container Right Side */}
      <div className="relative z-10 flex-1 flex flex-col min-h-screen min-w-0">

        {/* Global Header */}
        <Header
          projects={projects}
          activeProject={activeProject}
          loading={projectsLoading}
          error={projectsError}
          onSelectProject={(p) => setSelectedProjectId(p.id)}
          onRefreshProjects={() => void loadProjects()}
          onNewProject={() => {
            setCreateError(null);
            setShowNewProjectModal(true);
          }}
          pendingCheckpointsCount={pendingCheckpointsCount}
          onOpenMobileApproval={() => setShowGlobalMobileApproval(true)}
          mobileApprovalDisabledReason={mobileApprovalDisabledReason}
        />

        {/* Content Body */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 md:px-8 py-6 space-y-6">

          {/* Measured audio bar */}
          <AudioPlayerBar
            project={activeProject}
            artifact={audioArtifact}
            qcReport={qcReport}
            loading={artifactsLoading || (runLoading && !activeRun)}
            error={artifactsError}
            onInspectRawMetrics={() =>
              openInspector(
                'QC Report (qc_analysis stage output)',
                qcReport ?? {
                  info: 'No QC report yet. The qc_analysis stage has not produced output for this project.'
                }
              )
            }
          />

          {projectsError && projects.length === 0 && (
            <div className="p-5 rounded-2xl bg-panel border border-blocking/40 flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
              <div className="flex items-start gap-3 min-w-0">
                <AlertTriangle className="w-5 h-5 text-blocking flex-shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <p className="font-serif text-sm font-bold text-ink">Could not reach the GHARANA gateway</p>
                  <p className="font-mono text-xs text-blocking break-words">{projectsError}</p>
                </div>
              </div>
              <button
                onClick={() => void loadProjects(true)}
                className="px-4 py-2 rounded-xl bg-surface hover:bg-line border border-line-strong text-xs font-mono text-ink flex-shrink-0"
              >
                Retry
              </button>
            </div>
          )}

          {projectsLoading && projects.length === 0 && !projectsError && (
            <div className="p-8 rounded-2xl bg-panel border border-line flex items-center justify-center gap-3 font-mono text-xs text-muted">
              <Loader2 className="w-4 h-4 animate-spin text-caution" />
              Loading projects from the gateway…
            </div>
          )}

          {!projectsLoading && !projectsError && projects.length === 0 && (
            <div className="p-8 rounded-2xl bg-panel border border-line text-center space-y-3">
              <FolderOpen className="w-8 h-8 text-dim mx-auto" />
              <p className="font-serif text-base font-semibold text-ink">No projects yet</p>
              <p className="font-mono text-xs text-muted max-w-md mx-auto">
                Create a project, upload an audio artifact — the backend measures loudness and true
                peak on ingest — then start a pipeline run from a template.
              </p>
              <button
                onClick={() => setShowNewProjectModal(true)}
                className="px-5 py-2 rounded-xl bg-accent hover:bg-accent-hover text-bg font-semibold text-xs font-sans inline-flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Create your first project
              </button>
            </div>
          )}

          {activeProject && (
            <>
              {/* Artifacts + run controls */}
              <div className="p-5 rounded-2xl bg-panel border border-line shadow-lg space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="font-serif text-sm font-bold text-ink">Artifacts & Pipeline</h3>
                    <p className="font-mono text-xs text-muted">
                      {artifactsLoading
                        ? 'Loading artifacts…'
                        : artifactsError
                        ? artifactsError
                        : artifacts.length === 0
                        ? 'No artifacts uploaded for this project yet.'
                        : `${artifacts.length} artifact${artifacts.length === 1 ? '' : 's'} • ${
                            audioArtifact ? `audio: ${audioArtifact.kind} v${audioArtifact.version}` : 'no audio artifact'
                          }`}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 justify-end">
                    <label
                      className={`px-3 py-1.5 rounded-xl bg-surface border border-line-strong text-xs font-mono text-ink flex items-center gap-1.5 transition-colors ${
                        uploading ? 'opacity-60 cursor-not-allowed' : 'hover:bg-line cursor-pointer'
                      }`}
                      title="Upload an audio file — the backend measures BS.1770 loudness and true peak on ingest"
                    >
                      {uploading ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <FileAudio className="w-3.5 h-3.5" />
                      )}
                      <span>{uploading ? 'Uploading…' : 'Upload audio'}</span>
                      <input
                        type="file"
                        accept="audio/*"
                        className="hidden"
                        disabled={uploading}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          e.target.value = '';
                          if (file) void handleUploadArtifact(file, 'audio_bounce');
                        }}
                      />
                    </label>

                    <select
                      value={selectedTemplate}
                      onChange={(e) => setSelectedTemplate(e.target.value)}
                      disabled={templates.length === 0}
                      className="px-3 py-1.5 rounded-xl bg-bg border border-line text-xs font-mono text-ink disabled:opacity-50"
                      title={templatesError ?? 'Pipeline template'}
                    >
                      {templates.length === 0 && (
                        <option value="">{templatesError ? 'Templates unavailable' : 'Loading templates…'}</option>
                      )}
                      {templates.map((t) => (
                        <option key={t.name} value={t.name}>
                          {t.name} ({t.stages.length} stages)
                        </option>
                      ))}
                    </select>

                    <button
                      onClick={() => void handleStartRun()}
                      disabled={startingRun || !selectedTemplate}
                      className="px-4 py-1.5 rounded-xl bg-accent hover:bg-accent-hover text-accent-on font-mono font-bold text-xs shadow-lg shadow-[var(--accent-dim)] transition-all flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {startingRun ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <PlayCircle className="w-3.5 h-3.5" />
                      )}
                      <span>{startingRun ? 'Starting…' : 'Start run'}</span>
                    </button>

                    <button
                      onClick={() => selectedProjectId && void loadLatestRun(selectedProjectId)}
                      className="p-2 rounded-xl bg-surface hover:bg-line border border-line-strong text-muted hover:text-ink transition-colors"
                      title="Reload the latest run"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${runLoading ? 'animate-spin' : ''}`} />
                    </button>
                  </div>
                </div>

                {artifacts.length === 0 && !artifactsLoading && !artifactsError && (
                  <p className="font-mono text-[11px] text-dim">
                    Nothing has been measured for this project — upload a bounce or master first.
                  </p>
                )}

                {(uploadError || startRunError) && (
                  <p className="flex items-start gap-1.5 font-mono text-xs text-blocking break-words">
                    <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                    <span>{uploadError ?? startRunError}</span>
                  </p>
                )}
              </div>

              {/* Real pipeline run progress */}
              <PipelineProgressTracker
                run={activeRun}
                loading={runLoading}
                error={runError}
                onRetry={() => selectedProjectId && void loadLatestRun(selectedProjectId)}
                activeStage={awaitingStage?.stage}
              />

              {/* A stage declined and named what it needs. Answer it here —
                  this is the whole of the artist's side of an Ask. */}
              {ask && askStage && activeRun && (
                <AskPanel
                  ask={ask}
                  stage={askStage.stage}
                  runId={activeRun.id}
                  projectId={selectedProjectId}
                  artifacts={artifacts}
                  onAnswered={(updated) => {
                    setActiveRun(updated);
                    setRunError(null);
                  }}
                  onUploaded={() => {
                    if (selectedProjectId) void loadArtifacts(selectedProjectId);
                  }}
                  onRedo={handleRedoStage}
                />
              )}

              {/* Parked on the artist, but the request did not parse. A run
                  stopped for someone with nothing on screen about it is worse
                  than an ugly message, so say exactly what is known. */}
              {askStage && !ask && activeRun && (
                <div className="p-5 rounded-2xl bg-surface border border-caution/30 space-y-2">
                  <h3 className="font-serif text-sm font-bold text-ink">
                    A stage is waiting on you, but the console could not read what it asked for
                  </h3>
                  <p className="font-mono text-xs text-muted leading-relaxed">
                    Stage <span className="text-caution">{askStage.stage}</span> is{' '}
                    <span className="text-caution">{askStage.status}</span> and its output is not
                    a recognisable request. Nothing is being assumed on your behalf.
                  </p>
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <button
                      onClick={() =>
                        openInspector(
                          `Stage output — ${askStage.stage}`,
                          askStage.output ?? { info: 'This stage produced no output.' }
                        )
                      }
                      className="px-3 py-1.5 rounded-lg bg-line hover:bg-line-strong border border-line-strong text-xs font-mono text-ink"
                    >
                      Inspect raw payload
                    </button>
                    <button
                      onClick={() =>
                        void handleRedoStage(askStage.stage).catch((err) => setRunError(errMsg(err)))
                      }
                      className="px-3 py-1.5 rounded-lg bg-line hover:bg-line-strong border border-line-strong text-xs font-mono text-ink"
                    >
                      Re-run this stage
                    </button>
                  </div>
                </div>
              )}

              {/* The human checkpoint — only while a stage is genuinely paused */}
              {awaitingStage && activeRun && (
                <HumanCheckpointCard
                  stage={awaitingStage}
                  runId={activeRun.id}
                  agentName={`GHARANA ${activeRun.template} pipeline`}
                  onApproveStage={handleApproveStage}
                  onRedoStage={handleRedoStage}
                  trackForMobile={activeTrack}
                  onInspectRawPayload={() =>
                    openInspector(
                      `Stage output — ${awaitingStage.stage}`,
                      awaitingStage.output ?? { info: 'This stage produced no output.' }
                    )
                  }
                />
              )}
            </>
          )}

          {/* Active Tab View */}
          <div className="mt-6">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.18, ease: 'easeOut' }}
              >
                {/* Deliberately above the "select a project" guard: an artist
                    with no project yet is exactly who this screen is for. */}
                {activeTab === 'overview' ? (
                  <IntentComposer
                    projectId={selectedProjectId}
                    onApprove={handlePlanApproved}
                  />
                ) : activeTab === 'settings' ? (
                  <SettingsTab installedAgentIds={installedAgentIds} onInstallAgent={handleInstallAgent} />
                ) : !tabProps || !activeTrack ? (
                  projects.length > 0 && (
                    <div className="p-8 rounded-2xl bg-panel border border-line text-center font-mono text-xs text-muted">
                      Select a project in the header to load its artifacts, runs and checkpoints.
                    </div>
                  )
                ) : (
                  <>
                    {activeTab === 'mix_qc' && (
                      <MixQCTab
                        {...tabProps}
                        projectId={selectedProjectId}
                        highlightTopic={highlightedQCTopic}
                        onHighlightConsumed={() => setHighlightedQCTopic(null)}
                      />
                    )}
                    {activeTab === 'ar_feedback' && (
                      <AnRFeedbackTab
                        {...tabProps}
                        projectId={selectedProjectId}
                        artifacts={artifacts}
                        onOpenQCIssue={openQCIssue}
                      />
                    )}
                    {activeTab === 'lyrics' && <LyricsTab {...tabProps} projectId={selectedProjectId} />}
                    {activeTab === 'splits' && <SplitsTab {...tabProps} projectId={selectedProjectId} />}
                    {activeTab === 'release' && (
                      <ReleaseDeliveryTab {...tabProps} projectId={selectedProjectId} />
                    )}
                    {activeTab === 'growth' && <GrowthTab {...tabProps} />}
                    {activeTab === 'marketplace' && (
                      <AgentMarketplaceTab />
                    )}
                  </>
                )}
              </motion.div>
            </AnimatePresence>
          </div>

        </main>

        {/* Studio Footer */}
        <footer className="mt-12 border-t border-line-strong/60 bg-bg/90 py-6 px-4 md:px-8 text-center text-xs font-serif text-muted">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
            <p>
              GHARANA Studio Console • <span className="text-caution">The label you never signed with.</span>
            </p>
            <p className="font-mono-num text-[11px] text-dim">
              Measurements come from the pipeline • Unmeasured values are shown as unmeasured
            </p>
          </div>
        </footer>

      </div>

      {/* Raw Payload Inspector Modal */}
      <InspectorModal
        isOpen={inspectorState.isOpen}
        onClose={() => setInspectorState({ ...inspectorState, isOpen: false })}
        title={inspectorState.title}
        payload={inspectorState.payload}
      />

      {/* New Project Modal — create artist/project, upload audio, all real */}
      {showNewProjectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-bg/80 backdrop-blur-md overflow-y-auto">
          <div className="relative w-full max-w-lg glass-panel rounded-2xl border border-line-strong p-6 shadow-2xl space-y-4 my-8">
            <div className="flex justify-between items-center border-b border-line-strong pb-3">
              <h3 className="font-serif text-lg font-bold text-ink flex items-center gap-2">
                <Upload className="w-5 h-5 text-accent" />
                New Project
              </h3>
              <button
                onClick={() => setShowNewProjectModal(false)}
                disabled={creating}
                className="text-muted hover:text-ink disabled:opacity-40"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateProject} className="space-y-4 text-xs font-serif">
              <div>
                <label className="block text-muted mb-1">Project Title</label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Visakha Vibe, Midnight Ghazal…"
                  className="w-full bg-bg border border-line rounded-xl p-2.5 text-ink focus:outline-none focus:border-caution"
                />
              </div>

              <div>
                <label className="block text-muted mb-1">Artist</label>
                <select
                  value={newArtistId}
                  onChange={(e) => setNewArtistId(e.target.value)}
                  className="w-full bg-bg border border-line rounded-xl p-2.5 text-ink focus:outline-none focus:border-caution"
                >
                  <option value="__new__">+ New artist…</option>
                  {artists.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
                {artistsError && (
                  <p className="mt-1 font-mono text-[11px] text-blocking">
                    Could not load artists: {artistsError}
                  </p>
                )}
              </div>

              {newArtistId === '__new__' && (
                <div className="space-y-3 p-3 rounded-xl bg-bg/60 border border-line">
                  <div>
                    <label className="block text-muted mb-1">Artist Name</label>
                    <input
                      type="text"
                      value={newArtistName}
                      onChange={(e) => setNewArtistName(e.target.value)}
                      placeholder="e.g. Arya Sharma"
                      className="w-full bg-bg border border-line rounded-xl p-2.5 text-accent-on focus:outline-none focus:border-caution"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-muted mb-1">Language (optional)</label>
                      <input
                        type="text"
                        value={newArtistLanguage}
                        onChange={(e) => setNewArtistLanguage(e.target.value)}
                        placeholder="Telugu"
                        className="w-full bg-bg border border-line rounded-xl p-2.5 text-accent-on focus:outline-none focus:border-caution"
                      />
                    </div>
                    <div>
                      <label className="block text-muted mb-1">WhatsApp (optional)</label>
                      <input
                        type="text"
                        value={newArtistWhatsapp}
                        onChange={(e) => setNewArtistWhatsapp(e.target.value)}
                        placeholder="+91…"
                        className="w-full bg-bg border border-line rounded-xl p-2.5 text-accent-on focus:outline-none focus:border-caution"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-muted mb-1">Audio file (optional)</label>
                  <input
                    type="file"
                    accept="audio/*"
                    onChange={(e) => setNewFile(e.target.files?.[0] ?? null)}
                    className="w-full bg-bg border border-line rounded-xl p-2 text-muted file:mr-2 file:px-2 file:py-1 file:rounded-lg file:border-0 file:bg-surface file:text-accent-on file:text-[11px]"
                  />
                </div>
                <div>
                  <label className="block text-muted mb-1">Artifact kind</label>
                  <select
                    value={newFileKind}
                    onChange={(e) => setNewFileKind(e.target.value as ArtifactKind)}
                    className="w-full bg-bg border border-line rounded-xl p-2.5 text-accent-on focus:outline-none focus:border-caution"
                  >
                    {AUDIO_KINDS.map((k) => (
                      <option key={k} value={k}>
                        {k}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <p className="font-mono text-[11px] text-dim">
                Loudness and true peak are measured by the backend when the audio lands. Nothing is
                measured here in the browser.
              </p>

              {createError && (
                <p className="flex items-start gap-1.5 font-mono text-[11px] text-blocking break-words">
                  <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                  <span>{createError}</span>
                </p>
              )}

              <div className="pt-3 border-t border-line flex justify-end items-center gap-3">
                {creating && createStep && (
                  <span className="font-mono text-[11px] text-muted flex items-center gap-1.5">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    {createStep}
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => setShowNewProjectModal(false)}
                  disabled={creating}
                  className="px-4 py-2 rounded-xl bg-surface text-muted hover:text-accent-on disabled:opacity-40"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-5 py-2 rounded-xl bg-accent hover:bg-accent-hover text-bg font-semibold font-sans disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Create Project
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Global Mobile WhatsApp Approval Modal — measured projects only */}
      {activeTrack && awaitingStage && activeRun && !mobileApprovalDisabledReason && (
        <MobileApprovalModal
          track={activeTrack}
          stageTitle={awaitingStage.stage}
          agentName={`GHARANA ${activeRun.template} pipeline`}
          narratedSummary={
            typeof awaitingStage.output?.summary === 'string' ? awaitingStage.output.summary : undefined
          }
          isOpen={showGlobalMobileApproval}
          onClose={() => setShowGlobalMobileApproval(false)}
          onApprove={() => {
            void handleApproveStage(awaitingStage.stage).catch((err) => setRunError(errMsg(err)));
            setShowGlobalMobileApproval(false);
          }}
          onReject={() => {
            void handleRedoStage(awaitingStage.stage).catch((err) => setRunError(errMsg(err)));
            setShowGlobalMobileApproval(false);
          }}
          onInspectRawPayload={() =>
            openInspector(
              `Stage output — ${awaitingStage.stage}`,
              awaitingStage.output ?? { info: 'This stage produced no output.' }
            )
          }
        />
      )}

    </div>
  );
}


/**
 * The only routing this app has.
 *
 * ConsoleApp is a separate component rather than a branch inside it, because
 * React hooks cannot be conditional: with the landing page as an early return,
 * every one of the console's data-fetching effects still ran first. An
 * anonymous visitor on a PUBLIC marketing page was firing three authenticated
 * requests that each 401'd — wasteful, noisy, and quietly advertising the API
 * surface to someone who has not signed in.
 *
 * Not mounting the component is what actually stops the effects.
 *
 * `?app` rather than a route: this is a single-page app with no router, and the
 * server makes the same distinction when it decides whether to demand a
 * session, so the two agree by construction.
 */
export default function App() {
  // Legal pages are real paths, not modals. server.ts serves index.html for any
  // unmatched path, so the SPA is what resolves them — and they are checked
  // BEFORE the console, because /terms?app should still be the terms.
  const path = typeof window !== 'undefined' ? window.location.pathname : '/';
  if (isLegalPath(path)) return <LegalPage path={path} />;

  const wantsConsole =
    typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('app');

  if (!wantsConsole) return <LandingPage />;
  return <ConsoleApp />;
}
