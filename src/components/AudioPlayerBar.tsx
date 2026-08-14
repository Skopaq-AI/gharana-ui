import React from 'react';
import { Play, Activity, Terminal, Loader2, AlertTriangle, FileAudio } from 'lucide-react';
import type { ArtifactRef, Project, QCReport } from '../lib/api';

interface AudioPlayerBarProps {
  project: Project | null;
  /** The audio artifact the QC report was measured from, if one is uploaded. */
  artifact: ArtifactRef | null;
  /** Output of the qc_analysis stage. null = the project has not been measured. */
  qcReport: QCReport | null;
  loading?: boolean;
  error?: string | null;
  onInspectRawMetrics: () => void;
}

/** Format a measured number, or say plainly that it was never measured. */
const Readout: React.FC<{ label: string; value: string | null; tone?: string }> = ({
  label,
  value,
  tone = 'text-ink'
}) => (
  <div className="text-right min-w-[104px] whitespace-nowrap">
    <p className="text-[10px] text-dim uppercase">{label}</p>
    {value !== null ? (
      <p className={`${tone} font-semibold`}>{value}</p>
    ) : (
      <p className="text-[11px] text-muted italic">Not measured yet</p>
    )}
  </div>
);

export const AudioPlayerBar: React.FC<AudioPlayerBarProps> = ({
  project,
  artifact,
  qcReport,
  loading = false,
  error = null,
  onInspectRawMetrics
}) => {
  const lufs = qcReport?.lufs_integrated ?? null;
  const truePeak = qcReport?.true_peak_db ?? null;

  const subtitle = project
    ? artifact
      ? `${project.artist_name} • ${artifact.kind} v${artifact.version}`
      : `${project.artist_name} • no audio artifact uploaded yet`
    : 'No project selected';

  return (
    <div className="glass-panel border-t border-line-strong/80 bg-bg/90 p-4 md:px-8 py-3 rounded-2xl mb-6">
      {/*
        Stacks until xl: the sidebar eats ~288px, so a single row at lg would
        crush the measurement panel down to a few characters.
      */}
      <div className="flex flex-col xl:flex-row items-center justify-between gap-4">

        {/* Track Metadata & (unavailable) Play Controls */}
        <div className="flex items-center gap-4 w-full xl:w-auto min-w-0">
          <button
            disabled
            className="w-12 h-12 rounded-xl bg-surface text-dim border border-line-strong flex items-center justify-center font-bold flex-shrink-0 cursor-not-allowed"
            title="The gateway stores artifacts but does not stream them to the browser yet — nothing to play here."
          >
            <Play className="w-6 h-6 fill-current ml-0.5" />
          </button>

          <div className="min-w-0">
            <h3 className="font-serif text-base font-semibold text-ink truncate">
              {project ? project.title : 'No project selected'}
            </h3>
            <p className="text-xs text-muted font-mono-num truncate">{subtitle}</p>
          </div>
        </div>

        {/* Measured loudness panel */}
        <div className="flex-1 w-full xl:max-w-xl xl:mx-2 min-w-[220px]">
          <div className="flex justify-between items-center gap-2 text-[10px] font-mono-num text-muted mb-1">
            <span className="flex items-center gap-1.5 text-caution min-w-0 truncate">
              <Activity className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="truncate">MEASURED LOUDNESS (BS.1770)</span>
            </span>
            <span className="flex-shrink-0 whitespace-nowrap">
              {lufs !== null ? (
                <span className="text-accent font-bold">{lufs} LUFS Integrated</span>
              ) : (
                <span className="text-muted italic">Not measured yet</span>
              )}
            </span>
          </div>

          <div className="h-9 bg-bg rounded-lg border border-line flex items-center justify-center gap-2 px-3 overflow-hidden text-xs text-muted font-mono-num">
            {loading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin text-caution flex-shrink-0" />
                <span className="truncate">Loading measurements…</span>
              </>
            ) : error ? (
              <>
                <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 text-blocking" />
                <span className="truncate text-blocking" title={error}>{error}</span>
              </>
            ) : !project ? (
              <span className="truncate">Select a project to see its measurements</span>
            ) : !artifact ? (
              <>
                <FileAudio className="w-3.5 h-3.5 flex-shrink-0" />
                <span
                  className="truncate"
                  title="No audio artifact yet. The backend measures loudness and true peak when one is uploaded."
                >
                  No audio artifact — upload one to have it measured
                </span>
              </>
            ) : qcReport ? (
              <span className="truncate" title={qcReport.summary}>
                {qcReport.summary || 'QC report has no written summary.'}
              </span>
            ) : (
              <span className="truncate">Not measured yet — run the QC stage of a pipeline run</span>
            )}
          </div>
        </div>

        {/* Precise Numerical Readouts */}
        <div className="flex items-center gap-4 flex-wrap w-full xl:w-auto justify-end font-mono-num text-xs">
          <Readout
            label="True Peak"
            value={truePeak !== null ? `${truePeak} dBTP` : null}
          />

          <Readout
            label="QC Issues"
            value={qcReport ? String(qcReport.issues.length) : null}
            tone={qcReport && qcReport.issues.length > 0 ? 'text-accent-hover' : 'text-ink'}
          />

          <button
            onClick={onInspectRawMetrics}
            className="p-2 rounded-lg bg-surface hover:bg-line border border-line-strong text-caution transition-colors"
            title="Inspect the raw QC report returned by the pipeline"
          >
            <Terminal className="w-4 h-4" />
          </button>
        </div>

      </div>
    </div>
  );
};
