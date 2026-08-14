/**
 * The front door: one sentence in, a plan the artist approves.
 *
 * Everything else in this console is a settings surface — pick a project, pick a
 * template, upload a file, start a run. An independent musician should not have
 * to learn what a pipeline template is to release a song. They type what they
 * want and the software works out the rest.
 *
 * Three things this screen deliberately does:
 *
 *   It shows what was READ, not just what was decided. `signals.reasoning` is
 *   rendered verbatim above the plan. If the model misread "album" as one track,
 *   the artist sees that in their own words before anything runs, not five
 *   checkpoints later.
 *
 *   It shows the caveats. Five tracks against a three-track EP pipeline produces
 *   a plan that covers three of them, and says so here. A plan that silently
 *   drops two tracks is worse than one that admits the gap.
 *
 *   It asks for exactly what is missing, and nothing that is not. The plan is
 *   computed against what the project already has, so an artist is never asked
 *   for a mix they uploaded ten minutes ago.
 *
 * What it does NOT do is remove the checkpoints. The sentence replaces the
 * settings screen, not the artist's consent — the stage list below the plan is
 * the list of times they will be asked to approve something, and it is shown up
 * front on purpose.
 */

import { useState } from 'react';
import { AlertTriangle, ArrowRight, Loader2, Sparkles, Upload } from 'lucide-react';

import { ApiError, parseIntent, type MissingInput, type ReleasePlan } from '../lib/api';
import { stageLabel } from '../data/stageLabels';

/** Artist-facing text for each gap. Mirrors MISSING_INPUT_PROMPTS server-side. */
const ASK_TEXT: Record<MissingInput, string> = {
  mix_bounce: 'Upload the mix you want released.',
  reference_track:
    'Upload a reference track — a released song you want this to sit alongside. Mix QC compares against it; without one it can only report absolute numbers.',
  artist_goals:
    'In a line: what do you want this release to do? A&R feedback is scored against your goal, not a generic chart target.',
  collaborator_splits: 'Who else should be on the split sheet, and at what percentage?',
  original_rights_holder:
    'Who owns the original? A cover cannot be cleared without it, and clearance blocks the release.',
  additional_tracks: 'Upload the remaining tracks for the EP.',
  track_count:
    'How many tracks is this? You mentioned a body of work but not a number, and the plan below is for a single.',
  release_date: 'When do you want this out?',
};

const EXAMPLES = [
  'I want to release my single before the summer',
  "my EP is done, 3 tracks, want it on Spotify",
  'want to put out my cover of Landslide, clean for streaming',
  'trying to get this instrumental placed in a film or ad',
];

interface IntentComposerProps {
  /** Existing project, if the artist already has one open. Narrows what is asked for. */
  projectId?: string | null;
  /** Called when the artist approves the plan. The shell owns project + run creation. */
  onApprove?: (plan: ReleasePlan) => void | Promise<void>;
}

export function IntentComposer({ projectId, onApprove }: IntentComposerProps) {
  const [message, setMessage] = useState('');
  const [plan, setPlan] = useState<ReleasePlan | null>(null);
  const [busy, setBusy] = useState(false);
  const [approving, setApproving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    const text = message.trim();
    if (!text || busy) return;
    setBusy(true);
    setError(null);
    setPlan(null);
    try {
      setPlan(await parseIntent(text, projectId));
    } catch (err) {
      // 503 is the honest no-model path: the console should fall back to its
      // template picker rather than pretend it understood the sentence.
      const detail =
        err instanceof ApiError
          ? err.status === 503
            ? `${err.detail} Use the template picker below instead.`
            : err.detail
          : String(err);
      setError(detail);
    } finally {
      setBusy(false);
    }
  }

  async function approve() {
    if (!plan || approving) return;
    setApproving(true);
    setError(null);
    try {
      await onApprove?.(plan);
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : String(err));
    } finally {
      setApproving(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* -- the prompt ---------------------------------------------------- */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.18em] text-info">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Start here</span>
        </div>

        <h1 className="font-serif text-3xl sm:text-4xl text-ink leading-tight">
          What do you want to release?
        </h1>
        <p className="font-serif text-base text-muted leading-relaxed">
          Tell me in a sentence — any language, any script.
          I&rsquo;ll work out the pipeline and show you the plan before anything runs.
        </p>

        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submit();
          }}
          rows={3}
          placeholder="e.g. I want to release my single before the summer"
          className="w-full bg-bg border border-line-strong rounded-2xl px-4 py-3.5 font-serif text-lg text-accent-on placeholder:text-line-strong focus:outline-none focus:border-info transition-colors resize-none"
        />

        <div className="flex flex-wrap items-center gap-2">
          {EXAMPLES.map((ex) => (
            <button
              key={ex}
              onClick={() => setMessage(ex)}
              className="px-2.5 py-1 rounded-full bg-surface hover:bg-line-strong border border-line-strong font-mono text-[10px] text-muted hover:text-accent-on transition-colors"
            >
              {ex.length > 44 ? `${ex.slice(0, 44)}…` : ex}
            </button>
          ))}
        </div>

        <button
          onClick={submit}
          disabled={!message.trim() || busy}
          className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-accent hover:bg-accent-hover disabled:bg-line-strong disabled:text-dim text-accent-on font-serif font-bold tracking-wide transition-colors flex items-center justify-center gap-2"
        >
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
          {busy ? 'Reading…' : 'Show me the plan'}
        </button>

        {error && (
          <p className="font-mono text-[11px] text-accent-hover leading-relaxed">{error}</p>
        )}
      </div>

      {plan && <PlanCard plan={plan} onApprove={approve} approving={approving} />}
    </div>
  );
}

function PlanCard({
  plan,
  onApprove,
  approving,
}: {
  plan: ReleasePlan;
  onApprove: () => void;
  approving: boolean;
}) {
  const { signals } = plan;
  const facts = [
    signals.language && ['Language', signals.language],
    signals.track_count !== null && ['Tracks', String(signals.track_count)],
    signals.target_date && ['Deadline', signals.target_date],
    signals.is_cover && ['Cover', 'yes — clearance runs first'],
    signals.is_sync_pitch && ['Sync pitch', 'yes'],
  ].filter(Boolean) as [string, string][];

  return (
    <div className="rounded-3xl bg-panel border border-line-strong overflow-hidden animate-fadeIn">
      {/* What was read, in the artist's own words, before any decision. */}
      <div className="px-5 py-4 bg-bg border-b border-line space-y-1.5">
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-dim">
          What I read
        </span>
        <p className="font-serif text-sm text-muted leading-relaxed">{signals.reasoning}</p>
      </div>

      <div className="p-5 space-y-5">
        {facts.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {facts.map(([k, v]) => (
              <span
                key={k}
                className="px-2.5 py-1 rounded-lg bg-surface border border-line-strong font-mono text-[10px] text-muted"
              >
                {k}: <span className="text-ink">{v}</span>
              </span>
            ))}
          </div>
        )}

        {/* The stage list is the list of times they will be asked to approve
            something. Showing the count up front is the honest version of
            "seamless" — the sentence removed the settings, not the sign-off. */}
        <div className="space-y-2">
          <div className="flex items-baseline justify-between gap-3">
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-dim">
              The plan
            </span>
            <span className="font-mono text-[10px] text-muted">
              {plan.template} · {plan.stages.length} checkpoint
              {plan.stages.length === 1 ? '' : 's'}
            </span>
          </div>
          <ol className="space-y-1.5">
            {plan.stages.map((stage, i) => (
              <li key={stage} className="flex items-center gap-3">
                <span className="w-5 h-5 flex-shrink-0 rounded-full bg-surface border border-line-strong font-mono text-[9px] text-muted flex items-center justify-center">
                  {i + 1}
                </span>
                <span className="font-serif text-sm text-ink">{stageLabel(stage)}</span>
              </li>
            ))}
          </ol>
          <p className="font-mono text-[10px] text-dim leading-relaxed pt-1">
            You approve each one. Nothing moves to the next stage without you.
          </p>
        </div>

        {plan.caveats.length > 0 && (
          <div className="p-3.5 rounded-2xl bg-caution border border-caution/40 space-y-2">
            <div className="flex items-center gap-2 text-caution">
              <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="font-mono text-[10px] uppercase tracking-[0.18em]">
                Where this plan doesn&rsquo;t fully fit
              </span>
            </div>
            {plan.caveats.map((c) => (
              <p key={c} className="font-serif text-xs text-ink leading-relaxed">
                {c}
              </p>
            ))}
          </div>
        )}

        {plan.missing.length > 0 && (
          <div className="space-y-2">
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-dim">
              What I still need from you
            </span>
            {plan.missing.map((need) => (
              <div
                key={need}
                className="flex items-start gap-2.5 p-3 rounded-2xl bg-bg border border-line"
              >
                <Upload className="w-3.5 h-3.5 text-accent flex-shrink-0 mt-0.5" />
                <p className="font-serif text-xs text-ink leading-relaxed">
                  {ASK_TEXT[need] ?? need}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="px-5 py-4 bg-bg border-t border-line">
        <button
          onClick={onApprove}
          disabled={approving}
          className="w-full py-3 rounded-2xl bg-accent hover:bg-accent-hover disabled:bg-line-strong disabled:text-dim text-accent-on font-serif font-bold tracking-wide transition-colors flex items-center justify-center gap-2"
        >
          {approving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          {approving ? 'Setting up…' : 'Start with this plan'}
        </button>
      </div>
    </div>
  );
}
