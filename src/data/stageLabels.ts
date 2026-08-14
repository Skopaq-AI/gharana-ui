/**
 * Stage presentation constants.
 *
 * This file used to export `INITIAL_TRACKS`: a hand-written array of tracks
 * whose `audioMetrics` block sat under a comment reading "Real Measured Audio
 * Metrics" and contained nothing but literals (-13.8 LUFS, -0.8 dBTP, a
 * sixteen-point "lufsOverTime" series...). None of it was measured. It is all
 * gone, along with the fabricated A&R verdicts, lyric analyses, split sheets
 * and release checklists that shipped with it.
 *
 * Loudness and true peak now come from a real QCReport — the output of the
 * qc_analysis stage of a PipelineRun (see src/lib/api.ts). If the backend has
 * not measured a project yet, the UI says so.
 *
 * What survives is genuinely static presentation: how to spell an
 * orchestrator stage id in a human interface. No numbers, no agent output.
 */

/**
 * Display names for stage ids the orchestrator is known to emit. Anything not
 * listed falls through to `humanizeStage`, which title-cases the raw id rather
 * than guessing at a prettier meaning it might not have.
 */
export const STAGE_LABELS: Record<string, string> = {
  qc_analysis: 'Mix QC Analysis',
  anr_score: 'A&R Readiness Score',
};

/** `qc_analysis` -> "Mix QC Analysis"; `some_new_stage` -> "Some New Stage". */
export function stageLabel(stage: string): string {
  const known = STAGE_LABELS[stage];
  if (known) return known;
  return stage
    .replace(/[_-]+/g, ' ')
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
