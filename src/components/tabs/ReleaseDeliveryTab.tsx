import React, { useMemo, useState } from 'react';
import {
  Rocket,
  AlertTriangle,
  CheckCircle2,
  Code2,
  RefreshCw,
  Sparkles,
  Globe,
  Tag,
  Calendar,
  Users
} from 'lucide-react';
import { TrackItem } from '../../types';
import { PageHeader } from '../SectionPanel';
import {
  approveStage,
  redoStage,
  type ReleaseMetadata,
  type StageResult
} from '../../lib/api';
import {
  EmptyPanel,
  RunContextBar,
  StageCheckpointBar,
  describeError,
  findStage,
  formatTimestamp,
  useRunContext
} from './SplitsTab';

/**
 * Release delivery.
 *
 * The whole screen is the `release` stage output of a pipeline run — a
 * ReleaseMetadata document drafted by release_ops and then validated by pure
 * code server-side. `validation_problems` is the gate: while it is non-empty
 * the release is not DSP-deliverable, and this screen says so before it says
 * anything else.
 *
 * The shared run/project shell (picker, polling, empty and error states) is
 * imported from SplitsTab, which owns it: both tabs read a stage off the same
 * run and there is no third home for that code in this slice of the codebase.
 */

const RELEASE_STAGE_NAMES = ['release', 'sync_pitch_package'];

function isReleaseMetadataOutput(output: Record<string, unknown> | null): boolean {
  return Boolean(output && 'ai_manifest' in output && 'validation_problems' in output);
}

const MetaField: React.FC<{
  label: string;
  value: string | null | undefined;
  icon?: React.ReactNode;
  missingNote?: string;
}> = ({ label, value, icon, missingNote = 'Not set yet' }) => (
  <div className="p-4 rounded-2xl bg-bg border border-line space-y-1">
    <div className="flex items-center justify-between text-muted font-mono text-[10px] uppercase tracking-wider">
      <span>{label}</span>
      {icon}
    </div>
    {value ? (
      <div className="font-serif text-sm text-ink break-words">{value}</div>
    ) : (
      <div className="font-mono text-xs text-dim italic">{missingNote}</div>
    )}
  </div>
);

interface ReleaseDeliveryTabProps {
  /** Legacy prop from the mock-data console. Not used as a data source. */
  track?: TrackItem;
  onUpdateTrack?: (updated: TrackItem) => void;
  onInspectRaw?: (title: string, payload: any) => void;
  projectId?: string | null;
}

export const ReleaseDeliveryTab: React.FC<ReleaseDeliveryTabProps> = ({
  onInspectRaw,
  projectId
}) => {
  const ctx = useRunContext(projectId);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const releaseStage: StageResult | null = useMemo(
    () => findStage(ctx.run, RELEASE_STAGE_NAMES, isReleaseMetadataOutput),
    [ctx.run]
  );

  const meta =
    releaseStage && isReleaseMetadataOutput(releaseStage.output)
      ? (releaseStage.output as unknown as ReleaseMetadata)
      : null;

  const problems = meta?.validation_problems ?? [];
  const blocked = problems.length > 0;

  // Run-level progress, straight from the stage statuses the orchestrator returned.
  const stages = ctx.run?.stages ?? [];
  const approvedCount = stages.filter((s) => s.status === 'approved').length;
  const progressPercent = stages.length > 0 ? Math.round((approvedCount / stages.length) * 100) : 0;

  const runAction = async (kind: 'approve' | 'redo') => {
    if (!ctx.runId || !releaseStage) return;
    setBusy(true);
    setActionError(null);
    try {
      const updated =
        kind === 'approve'
          ? await approveStage(ctx.runId, releaseStage.stage)
          : await redoStage(ctx.runId, releaseStage.stage);
      ctx.applyRun(updated);
    } catch (err) {
      setActionError(describeError(err));
    } finally {
      setBusy(false);
    }
  };

  const manifest = meta?.ai_manifest;

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Rocket}
        title="Release Delivery & Distribution"
        description="DSP-ready metadata drafted by release_ops, then validated deterministically server-side."
        badge="Release Stage"
        action={
          <div className="min-w-[200px] bg-bg p-3 rounded-xl border border-line">
            <div className="flex justify-between items-center text-xs font-mono mb-1.5">
              <span className="text-muted">Run checkpoints approved</span>
              <span className="text-accent font-bold">
                {stages.length > 0 ? `${approvedCount}/${stages.length}` : '—'}
              </span>
            </div>
            <div className="h-2 bg-panel rounded-full overflow-hidden border border-line">
              <div
                className="h-full bg-gradient-to-r from-accent to-accent transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        }
      />

      <RunContextBar
        ctx={ctx}
        stageLabel="source: release stage of the selected run"
        showProjectPicker={!projectId}
      />

      {ctx.projectsError ? (
        <EmptyPanel
          tone="error"
          icon={<AlertTriangle className="w-7 h-7 text-accent" />}
          title="Could not reach the GHARANA gateway"
        >
          <p className="font-mono text-[11px] text-accent-hover">{ctx.projectsError}</p>
          <p>Release metadata lives on a pipeline run, so nothing can be shown until the gateway answers.</p>
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
            Create a project, upload the master, and run a pipeline. The release stage drafts the
            metadata this screen delivers.
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
            Release metadata is produced by the{' '}
            <span className="font-mono text-caution">release</span> stage, which is the last stage
            of a run. Start a run for this project to begin.
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
      ) : !releaseStage ? (
        <EmptyPanel title="This run has no release stage">
          <p>
            Template <span className="font-mono text-caution">{ctx.run?.template ?? '—'}</span>{' '}
            produces no release metadata. The shipped templates that do are single_release,
            ep_release and cover_release (stage{' '}
            <span className="font-mono text-caution">release</span>) and sync_submission (stage{' '}
            <span className="font-mono text-caution">sync_pitch_package</span>).
          </p>
        </EmptyPanel>
      ) : releaseStage.status === 'failed' ? (
        <EmptyPanel
          tone="error"
          icon={<AlertTriangle className="w-7 h-7 text-accent" />}
          title={`The ${releaseStage.stage} stage failed`}
        >
          <p className="font-mono text-[11px] text-accent-hover">
            {releaseStage.error || 'The orchestrator reported a failure with no detail.'}
          </p>
        </EmptyPanel>
      ) : !meta ? (
        <EmptyPanel
          icon={
            releaseStage.status === 'running' ? (
              <RefreshCw className="w-7 h-7 text-info animate-spin" />
            ) : undefined
          }
          title={
            releaseStage.status === 'running'
              ? 'The release stage is running'
              : `The release stage has not run yet (${releaseStage.status.replace(/_/g, ' ')})`
          }
        >
          <p>
            Stage <span className="font-mono text-caution">{releaseStage.stage}</span> is the last
            in the chain: every upstream checkpoint has to be approved before it executes. Nothing is
            shown here until it produces metadata.
          </p>
        </EmptyPanel>
      ) : (
        <>
          {/* THE GATE. Validation problems come first, before any metadata. */}
          <div
            className={`p-6 rounded-3xl border shadow-2xl space-y-4 ${
              blocked
                ? 'bg-blocking/95 border-accent'
                : 'bg-bg/90 border-accent/50'
            }`}
          >
            <div className="flex items-start gap-4">
              {blocked ? (
                <AlertTriangle className="w-7 h-7 text-accent flex-shrink-0 mt-0.5" />
              ) : (
                <CheckCircle2 className="w-7 h-7 text-accent flex-shrink-0 mt-0.5" />
              )}
              <div className="space-y-1 min-w-0">
                <h2
                  className={`font-serif text-lg font-bold uppercase tracking-wide ${
                    blocked ? 'text-accent-hover' : 'text-accent'
                  }`}
                >
                  {blocked
                    ? `DELIVERY BLOCKED — ${problems.length} validation problem${
                        problems.length === 1 ? '' : 's'
                      }`
                    : 'METADATA VALIDATION PASSED'}
                </h2>
                <p className="text-xs font-serif text-muted">
                  {blocked
                    ? 'These are the release_ops validator’s findings, computed in code and not by a model. Every one has to clear before this release is DSP-deliverable.'
                    : 'The release_ops validator returned no problems for this metadata document.'}
                </p>
              </div>
            </div>

            {blocked && (
              <ul className="space-y-2">
                {problems.map((problem, idx) => (
                  <li
                    key={idx}
                    className="p-3.5 rounded-2xl bg-bg border border-[var(--accent-border)] flex items-start gap-3 font-serif text-xs text-ink"
                  >
                    <span className="w-5 h-5 rounded-full bg-[var(--accent-dim)] text-accent-hover border border-[var(--accent-border)] flex items-center justify-center font-mono text-[10px] font-bold flex-shrink-0">
                      {idx + 1}
                    </span>
                    <span>{problem}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Metadata document */}
            <div className="lg:col-span-2 space-y-4">
              <div className="p-6 glass-panel rounded-2xl border border-line-strong bg-bg/80 space-y-4">
                <h3 className="font-serif text-base font-semibold text-ink border-b border-line pb-3">
                  DSP Metadata Document
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <MetaField label="Title" value={meta.title} missingNote="No title drafted" />
                  <MetaField
                    label="Title (transliteration)"
                    value={meta.title_transliteration}
                    missingNote="No transliteration"
                  />
                  <MetaField
                    label="Artists"
                    value={meta.artists.length > 0 ? meta.artists.join(', ') : null}
                    icon={<Users className="w-3.5 h-3.5" />}
                    missingNote="No artists on the document"
                  />
                  <MetaField
                    label="Language"
                    value={meta.language}
                    icon={<Globe className="w-3.5 h-3.5" />}
                  />
                  <MetaField label="Genre" value={meta.genre} icon={<Tag className="w-3.5 h-3.5" />} />
                  <MetaField label="Subgenre" value={meta.subgenre} missingNote="No subgenre" />
                  <MetaField
                    label="ISRC"
                    value={meta.isrc}
                    missingNote="Not assigned yet"
                  />
                  <MetaField label="UPC" value={meta.upc} missingNote="Not assigned yet" />
                  <MetaField
                    label="Release date"
                    value={meta.release_date}
                    icon={<Calendar className="w-3.5 h-3.5" />}
                    missingNote="Not scheduled yet"
                  />
                </div>

                <p className="text-[11px] font-serif text-dim pt-1">
                  Fields are shown exactly as the release stage returned them. Empty fields are
                  labelled as unset rather than filled with a placeholder — an invented ISRC would be
                  delivered to a DSP.
                </p>
              </div>
            </div>

            {/* AI manifest + delivery facts */}
            <div className="space-y-6">
              <div className="p-6 glass-panel rounded-2xl border border-line-strong bg-bg/80 space-y-3">
                <h4 className="font-serif text-sm font-semibold text-ink flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-info" />
                  AI Disclosure Manifest
                </h4>

                {manifest ? (
                  <div className="space-y-2 font-mono text-xs">
                    {[
                      ['Lyrics assisted by AI', manifest.lyrics_assist],
                      ['AI generation used', manifest.generation],
                      ['AI mastering used', manifest.mastering_ai]
                    ].map(([label, flag]) => (
                      <div
                        key={String(label)}
                        className="p-2.5 rounded-xl bg-panel border border-line flex items-center justify-between"
                      >
                        <span className="text-muted">{label}</span>
                        <span
                          className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                            flag
                              ? 'bg-info/20 text-info border border-info/40'
                              : 'bg-surface text-dim border border-line-strong'
                          }`}
                        >
                          {flag ? 'YES' : 'NO'}
                        </span>
                      </div>
                    ))}

                    <div className="p-2.5 rounded-xl bg-panel border border-line space-y-1">
                      <span className="text-muted block">Agents involved</span>
                      {manifest.agents_involved.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {manifest.agents_involved.map((agent) => (
                            <span
                              key={agent}
                              className="px-2 py-0.5 rounded bg-line text-caution text-[10px]"
                            >
                              {agent}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-dim italic text-[11px]">
                          None recorded on this document
                        </span>
                      )}
                    </div>
                  </div>
                ) : (
                  <p className="font-mono text-xs text-dim">
                    This document carries no AI manifest.
                  </p>
                )}
              </div>

              <div className="p-6 glass-panel rounded-2xl border border-line-strong space-y-3">
                <h4 className="font-serif text-sm font-semibold text-ink">
                  What the console cannot do yet
                </h4>
                <p className="text-xs font-serif text-muted leading-relaxed">
                  The gateway exposes projects, artifacts, templates and runs. It does not expose the
                  release_ops <span className="font-mono text-caution">distribute</span>,{' '}
                  <span className="font-mono text-caution">presave</span> or{' '}
                  <span className="font-mono text-caution">validate_artwork</span> tools, and there
                  is no editorial-pitch endpoint. So there is no “deliver to DSPs” button here: the
                  only real action on this screen is approving or redoing the release checkpoint.
                </p>
              </div>
            </div>
          </div>

          <StageCheckpointBar
            title={`Release metadata sign-off — ${meta.title || 'untitled release'}`}
            agentLabel="release_ops • prepare_metadata"
            stage={releaseStage}
            busy={busy}
            actionError={actionError}
            summary={
              blocked
                ? `The validator flagged ${problems.length} problem${
                    problems.length === 1 ? '' : 's'
                  } on this metadata. Approving locks the document as it stands, problems included.`
                : 'The validator returned no problems. Approving this checkpoint advances the run.'
            }
            onApprove={() => runAction('approve')}
            onRedo={() => runAction('redo')}
            onInspect={
              onInspectRaw
                ? () => onInspectRaw('Release stage output (raw)', releaseStage.output)
                : undefined
            }
          />

          <div className="flex items-center gap-2 text-[10px] font-mono text-dim px-1">
            <Code2 className="w-3.5 h-3.5" />
            <span>
              run {ctx.run?.id} • template {ctx.run?.template} • run status {ctx.run?.status} • stage
              finished {formatTimestamp(releaseStage.finished_at)}
            </span>
          </div>
        </>
      )}
    </div>
  );
};
