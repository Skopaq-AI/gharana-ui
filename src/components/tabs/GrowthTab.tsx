import React from 'react';
import {
  TrendingUp,
  PlugZap,
  FileSpreadsheet,
  Ban,
  ListChecks,
  Route
} from 'lucide-react';
import { TrackItem } from '../../types';
import { PageHeader } from '../SectionPanel';

/**
 * Post-release growth.
 *
 * Nothing here is wired, and nothing here is invented to cover for that.
 *
 * The backend has a growth agent with two tools — `aggregate_analytics`
 * (deterministic CSV aggregation) and `retro` (a RetroReport whose findings must
 * cite their evidence). Neither is reachable from this console:
 *
 *  - No shipped pipeline template contains a growth stage, so no run ever
 *    produces analytics or a retro as a stage output.
 *  - The gateway exposes artists, projects, artifacts, templates and runs. There
 *    is no analytics route and no per-agent tool route.
 *  - Ingestion in the backend is a manual CSV paste (PRD §7 stopgap). There is
 *    no OAuth connection to Spotify for Artists, Apple Music for Artists or
 *    YouTube Studio, so the console cannot pull numbers on its own.
 *
 * The previous version of this screen parsed a CSV in the browser, defaulted
 * every missing metric to a plausible number (120,000 streams, 20% skip rate),
 * invented a regional breakdown as fixed percentages of the stream count, and
 * wrote "agent findings" prose around those numbers. All of it is gone.
 */

/** Columns growth.aggregate_analytics recognises. Documentation, not an input. */
const RECOGNISED_COLUMNS: { column: string; meaning: string }[] = [
  { column: 'platform / source', meaning: 'Which DSP the row came from' },
  { column: 'date', meaning: 'Row date — sets the reporting window' },
  { column: 'streams / plays', meaning: 'Play count for the row' },
  { column: 'listeners', meaning: 'Unique listeners' },
  { column: 'saves', meaning: 'Library saves' },
  { column: 'followers', meaning: 'Follower delta' },
  { column: 'views', meaning: 'Video views' },
  { column: 'playlist_adds', meaning: 'Playlist additions' },
  { column: 'revenue', meaning: 'Reported revenue' }
];

interface GrowthTabProps {
  /** Legacy prop from the mock-data console. Not used as a data source. */
  track?: TrackItem;
  onUpdateTrack?: (updated: TrackItem) => void;
  onInspectRaw?: (title: string, payload: any) => void;
}

export const GrowthTab: React.FC<GrowthTabProps> = () => {
  return (
    <div className="space-y-6">
      <PageHeader
        icon={TrendingUp}
        title="Post-Release Growth & Retrospective"
        description="Measured DSP analytics and an evidence-cited retro — once the ingestion path exists."
        badge="Not connected"
      />

      {/* The honest state of this screen */}
      <div className="p-6 md:p-8 rounded-3xl bg-panel border border-caution/50 shadow-2xl space-y-5">
        <div className="flex items-start gap-4">
          <div className="p-2.5 rounded-2xl bg-caution/10 border border-caution/40 text-caution flex-shrink-0">
            <PlugZap className="w-6 h-6" />
          </div>
          <div className="space-y-2 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="font-serif text-xl font-bold text-ink">
                Analytics are not connected yet
              </h2>
              <span className="px-2.5 py-0.5 rounded-full bg-caution/15 text-caution border border-caution/40 font-mono text-[10px] font-bold uppercase tracking-wider">
                No numbers to show
              </span>
            </div>
            <p className="font-serif text-sm text-muted leading-relaxed">
              This screen deliberately shows no stream counts, no save rates and no charts. There is
              no analytics feed reaching this console, so any figure here would be one somebody made
              up — and a made-up number in a product whose whole claim is that its numbers are
              measured is worse than an empty screen.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="p-5 rounded-2xl bg-bg border border-accent/30 space-y-2">
            <div className="flex items-center gap-2 text-accent font-mono text-[10px] uppercase tracking-wider font-bold">
              <ListChecks className="w-3.5 h-3.5" />
              <span>What it will do</span>
            </div>
            <p className="font-serif text-xs text-muted leading-relaxed">
              The growth agent aggregates an imported DSP export deterministically
              (<span className="font-mono text-caution">aggregate_analytics</span>: per-platform
              totals, the reporting window, rows parsed and rows skipped), then writes a
              RetroReport (<span className="font-mono text-caution">retro</span>) in which every
              finding carries the data point it was derived from, plus at least three concrete
              actions for the next release.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-bg border border-caution/40 space-y-2">
            <div className="flex items-center gap-2 text-caution font-mono text-[10px] uppercase tracking-wider font-bold">
              <Route className="w-3.5 h-3.5" />
              <span>What it is waiting on</span>
            </div>
            <ul className="font-serif text-xs text-muted leading-relaxed space-y-1.5 list-disc list-inside">
              <li>A growth stage in a pipeline template, so a retro arrives as a stage output.</li>
              <li>A gateway route that accepts an analytics CSV for a project.</li>
              <li>
                DSP connections. Ingestion is a manual CSV in the backend today; there is no OAuth
                feed from Spotify, Apple Music or YouTube.
              </li>
            </ul>
          </div>

          <div className="p-5 rounded-2xl bg-bg border border-[var(--accent-border)] space-y-2">
            <div className="flex items-center gap-2 text-accent-hover font-mono text-[10px] uppercase tracking-wider font-bold">
              <Ban className="w-3.5 h-3.5" />
              <span>What was removed</span>
            </div>
            <p className="font-serif text-xs text-muted leading-relaxed">
              A CSV box that parsed in the browser and silently defaulted every missing metric to a
              plausible-looking number, two “sample DSP export” presets, a regional listener
              breakdown computed as fixed percentages of the stream count, and retro prose written
              around all of it. None of it ever touched the backend.
            </p>
          </div>
        </div>
      </div>

      {/* Reference: the shape the backend expects, so the export is ready when the route lands */}
      <div className="glass rounded-3xl p-6 md:p-8 border border-line-strong bg-bg/90 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-line pb-4">
          <div className="flex items-center gap-2.5">
            <FileSpreadsheet className="w-5 h-5 text-info" />
            <h3 className="font-serif text-lg font-bold text-ink">
              CSV columns the growth agent recognises
            </h3>
          </div>
          <span className="text-[11px] font-mono text-dim">
            Reference only — there is nowhere to upload this yet
          </span>
        </div>

        <p className="font-serif text-xs text-muted leading-relaxed">
          When the ingestion route lands, exports from Spotify for Artists, Apple Music for Artists
          and YouTube Studio go straight in. Column aliases are accepted; unrecognised rows are
          counted as skipped rather than guessed at.
        </p>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse font-mono text-xs min-w-[420px]">
            <thead>
              <tr className="border-b border-line text-muted uppercase text-[10px] tracking-wider">
                <th className="py-2.5 px-3">Column</th>
                <th className="py-2.5 px-3">Meaning</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {RECOGNISED_COLUMNS.map((row) => (
                <tr key={row.column}>
                  <td className="py-2.5 px-3 text-caution whitespace-nowrap">{row.column}</td>
                  <td className="py-2.5 px-3 text-muted font-serif">{row.meaning}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
