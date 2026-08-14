import React, { useCallback, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  FileAudio,
  HelpCircle,
  Loader2,
  RefreshCw,
  Send,
  Upload
} from 'lucide-react';
import {
  ApiError,
  answerStageAsk,
  uploadArtifact,
  type ArtifactKind,
  type ArtifactRef,
  type Ask,
  type AskAnswer,
  type AskMissingInput,
  type PipelineRun
} from '../lib/api';

/**
 * Answer an `Ask`: the stage declined, named its price, and this is the form.
 *
 * The point of the closed `MissingInput` enum is that every member maps to a
 * real control instead of a sentence nobody can act on. So: an upload for
 * mix_bounce / reference_track / stems / master / additional_tracks, a text
 * field for artist_goals / collaborator_splits / original_rights_holder /
 * lyrics, a date for release_date, a number for track_count. The agent's own
 * `why` sits next to each one, verbatim — it is the stage saying what it cannot
 * conclude without that input, and paraphrasing it would lose the specificity
 * the whole mechanism exists to produce.
 *
 * Files are uploaded through the ordinary artifact endpoint as they are chosen,
 * and the answer carries artifact ids. Two reasons: the object store stays the
 * only way audio enters the system, and an upload survives even if the answer
 * POST fails — which it will until the orchestrator ships the endpoint.
 */

// ---------------------------------------------------------------------------
// One control per member of the closed enum
// ---------------------------------------------------------------------------

type ControlSpec =
  | {
      control: 'upload';
      label: string;
      instruction: string;
      kind: ArtifactKind;
      accept: string;
      multiple: boolean;
    }
  | { control: 'text'; label: string; instruction: string; placeholder: string; rows: number }
  | { control: 'date'; label: string; instruction: string }
  | { control: 'number'; label: string; instruction: string; min: number; placeholder: string }
  | { control: 'upstream'; label: string; instruction: string };

/**
 * `instruction` is console copy — what to do. It never restates the agent's
 * reason, which is rendered separately and unedited.
 */
const CONTROLS: Record<AskMissingInput, ControlSpec> = {
  mix_bounce: {
    control: 'upload',
    label: 'Mix bounce',
    instruction: 'Upload the mix you want released. Loudness and true peak are measured on ingest.',
    kind: 'audio_bounce',
    accept: 'audio/*',
    multiple: false
  },
  reference_track: {
    control: 'upload',
    label: 'Reference track',
    instruction:
      'Upload a released song you want this to sit alongside. Without one, QC can only report absolute numbers.',
    kind: 'audio_reference',
    accept: 'audio/*',
    multiple: false
  },
  stems: {
    control: 'upload',
    label: 'Stems',
    instruction: 'Upload the stems — vocals, drums, bass, other. One file each.',
    kind: 'audio_stem',
    accept: 'audio/*',
    multiple: true
  },
  master: {
    control: 'upload',
    label: 'Master',
    instruction: 'Upload the mastered file.',
    kind: 'audio_master',
    accept: 'audio/*',
    multiple: false
  },
  additional_tracks: {
    control: 'upload',
    label: 'The remaining tracks',
    instruction: 'Upload the other tracks in this release.',
    kind: 'audio_bounce',
    accept: 'audio/*',
    multiple: true
  },
  artist_goals: {
    control: 'text',
    label: 'What this release is for',
    instruction:
      'In a line: what do you want this to do? Feedback is scored against your goal, not a generic chart target.',
    placeholder: 'e.g. I want this to work as a 15-second Reels hook and get on Telugu indie playlists.',
    rows: 3
  },
  collaborator_splits: {
    control: 'text',
    label: 'Collaborators and shares',
    instruction: 'Who else is on the split sheet, in what role, at what percentage.',
    placeholder: 'e.g. Meera Rao — lyricist — 25% composition; Arjun K — producer — 20% recording',
    rows: 3
  },
  original_rights_holder: {
    control: 'text',
    label: 'Who owns the original',
    instruction:
      'A cover cannot be cleared without it, and clearance blocks the release. Name the composers and publisher if you know them.',
    placeholder: 'e.g. Composition by S. Rajeswara Rao; publisher Saregama India Ltd',
    rows: 2
  },
  lyrics: {
    control: 'text',
    label: 'Lyrics',
    instruction: 'Paste the lyrics, section by section. Keep your section headings if you have them.',
    placeholder: '[verse 1]\n…\n\n[chorus]\n…',
    rows: 6
  },
  release_date: {
    control: 'date',
    label: 'Release date',
    instruction: 'When do you want this out?'
  },
  track_count: {
    control: 'number',
    label: 'How many tracks',
    instruction:
      'You named a body of work but not a number. Give the count and the plan switches to the multi-track pipeline.',
    min: 1,
    placeholder: 'e.g. 5'
  },
  qc_report: {
    control: 'upstream',
    label: 'A QC report',
    instruction:
      'This one is not a file you upload — it is produced by the qc_analysis stage. Approve that checkpoint first and this stage can run again.'
  }
};

// ---------------------------------------------------------------------------
// Answer state
// ---------------------------------------------------------------------------

interface UploadedArtifact {
  id: string;
  name: string;
}

type AnswerState = {
  text: Partial<Record<AskMissingInput, string>>;
  uploads: Partial<Record<AskMissingInput, UploadedArtifact[]>>;
};

/**
 * Build the wire answers from filled controls. Empty controls are omitted —
 * the orchestrator rejects a blank value, and rightly: a pinned "" reads to the
 * next attempt as "the artist supplied this".
 *
 * An upload answer is the artifact id. Where an input takes several files
 * (stems, the rest of an EP) the ids are joined with a comma, because the
 * orchestrator's `value` is a JSON scalar and there is nowhere to put a list.
 * That is a convention this console invented and no agent has agreed to yet;
 * the files themselves are on the project either way, so nothing is lost if the
 * agent reads the data plane instead of the string.
 */
function buildAnswers(missing: AskMissingInput[], state: AnswerState): AskAnswer[] {
  const answers: AskAnswer[] = [];
  for (const input of missing) {
    const spec = CONTROLS[input];
    if (spec.control === 'upload') {
      const uploaded = state.uploads[input] ?? [];
      if (uploaded.length > 0) {
        answers.push({ input, value: uploaded.map((u) => u.id).join(',') });
      }
      continue;
    }
    if (spec.control === 'upstream') continue;
    const raw = (state.text[input] ?? '').trim();
    if (!raw) continue;
    if (spec.control === 'number') {
      const value = Number(raw);
      // A field that will not parse is left out rather than sent as NaN or 0.
      if (Number.isFinite(value)) answers.push({ input, value });
      continue;
    }
    answers.push({ input, value: raw });
  }
  return answers;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface AskPanelProps {
  ask: Ask;
  /** The stage that asked, and the run it belongs to. */
  stage: string;
  runId: string;
  /** Needed for uploads. Null disables them, with the reason on screen. */
  projectId: string | null;
  /** Artifacts already on the project, so an existing file can be pointed at. */
  artifacts?: ArtifactRef[];
  /** Called with the updated run once the orchestrator accepts the answer. */
  onAnswered?: (run: PipelineRun) => void;
  /** Called after any successful upload so the caller can refresh its list. */
  onUploaded?: () => void;
  /** Escape hatch: re-run the stage without answering. */
  onRedo?: (stage: string) => Promise<void> | void;
  className?: string;
}

export const AskPanel: React.FC<AskPanelProps> = ({
  ask,
  stage,
  runId,
  projectId,
  artifacts = [],
  onAnswered,
  onUploaded,
  onRedo,
  className = ''
}) => {
  const [state, setState] = useState<AnswerState>({ text: {}, uploads: {} });
  const [uploadingFor, setUploadingFor] = useState<AskMissingInput | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [redoing, setRedoing] = useState(false);

  const inputs = useMemo(() => ask.missing.map((m) => m.input), [ask.missing]);

  /**
   * Any edit invalidates the last submission's outcome. Leaving "Sent." on
   * screen while the artist types a different answer would show them a state
   * the server is not in.
   */
  const updateText = useCallback((input: AskMissingInput, value: string) => {
    setSubmitted(false);
    setSubmitError(null);
    setState((prev) => ({ ...prev, text: { ...prev.text, [input]: value } }));
  }, []);

  /** Inputs this form can actually answer (qc_report comes from a stage). */
  const answerable = useMemo(
    () => inputs.filter((input) => CONTROLS[input].control !== 'upstream'),
    [inputs]
  );

  const answers = useMemo(() => buildAnswers(inputs, state), [inputs, state]);
  const answeredInputs = useMemo(() => new Set(answers.map((a) => a.input)), [answers]);
  const outstanding = answerable.filter((input) => !answeredInputs.has(input));
  const upstreamOnly = inputs.filter((input) => CONTROLS[input].control === 'upstream');

  const handleFiles = useCallback(
    async (input: AskMissingInput, files: FileList | null) => {
      const spec = CONTROLS[input];
      if (spec.control !== 'upload' || !files || files.length === 0) return;
      if (!projectId) {
        setUploadError('No project is selected, so there is nowhere to put the file.');
        return;
      }
      setUploadError(null);
      setUploadingFor(input);
      try {
        const uploaded: UploadedArtifact[] = [];
        for (const file of Array.from(files)) {
          const ref = await uploadArtifact(projectId, file, spec.kind);
          uploaded.push({ id: ref.id, name: file.name });
        }
        setState((prev) => ({
          ...prev,
          uploads: {
            ...prev.uploads,
            [input]: spec.multiple ? [...(prev.uploads[input] ?? []), ...uploaded] : uploaded
          }
        }));
        onUploaded?.();
      } catch (err) {
        setUploadError(
          err instanceof ApiError
            ? `Upload failed (${err.status || 'no response'}): ${err.detail}`
            : err instanceof Error
            ? err.message
            : String(err)
        );
      } finally {
        setUploadingFor(null);
      }
    },
    [projectId, onUploaded]
  );

  const handleSubmit = useCallback(async () => {
    if (answers.length === 0) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const run = await answerStageAsk(runId, stage, answers);
      setSubmitted(true);
      onAnswered?.(run);
    } catch (err) {
      if (err instanceof ApiError && (err.status === 404 || err.status === 405)) {
        // Be exact about what did and did not happen. Anything uploaded above
        // is already on the project; only the unpark failed. The orchestrator
        // has this route; the gateway may not proxy it yet, and from here the
        // two are indistinguishable, so say what was observed and no more.
        setSubmitError(
          `Answering is not reachable from here yet — POST …/stages/${stage}/answer returned ${err.status}. ` +
            'Anything you uploaded is saved on the project. Use "Re-run this stage" to run it against what is there now.'
        );
      } else if (err instanceof ApiError && err.status === 409) {
        // The stage moved on: another answer or a redo forked it first.
        setSubmitError(
          `This question is no longer open (${err.detail}). Reload the run to see where it got to.`
        );
      } else if (err instanceof ApiError) {
        setSubmitError(`${err.status || 'No response'} — ${err.detail}`);
      } else {
        setSubmitError(err instanceof Error ? err.message : String(err));
      }
    } finally {
      setSubmitting(false);
    }
  }, [answers, onAnswered, runId, stage]);

  const handleRedo = useCallback(async () => {
    if (!onRedo) return;
    setRedoing(true);
    setSubmitError(null);
    try {
      await onRedo(stage);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : String(err));
    } finally {
      setRedoing(false);
    }
  }, [onRedo, stage]);

  return (
    <div
      className={`p-6 rounded-2xl bg-surface border border-caution/40 ring-1 ring-caution/15 shadow-lg space-y-5 ${className}`}
    >
      {/* Header — a request, not a failure. */}
      <div className="flex items-start gap-3.5 pb-4 border-b border-line-strong">
        <div className="p-2.5 rounded-xl bg-caution/15 border border-caution/30 text-caution flex-shrink-0">
          <HelpCircle className="w-5 h-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-full bg-line text-caution border border-caution/25 font-bold">
              Waiting on you
            </span>
            <span className="font-mono-num text-[11px] text-dim break-all">
              stage <span className="text-muted">{stage}</span>
            </span>
          </div>
          <h3 className="font-serif text-lg font-bold text-ink mt-1.5">
            This stage stopped rather than guess
          </h3>
          <p className="font-sans text-xs text-muted mt-1 leading-relaxed">
            It needs {ask.missing.length} thing{ask.missing.length === 1 ? '' : 's'} before it can
            say anything worth reading. No score was produced and none will be invented.
          </p>
          {ask.note && (
            <p className="font-serif text-sm text-ink/90 mt-2.5 leading-relaxed break-words">
              “{ask.note}”
            </p>
          )}
        </div>
      </div>

      {/* One row per missing input */}
      <div className="space-y-4">
        {ask.missing.map((ref) => {
          const spec = CONTROLS[ref.input];
          const uploaded = state.uploads[ref.input] ?? [];
          const filled = answeredInputs.has(ref.input);

          return (
            <div
              key={ref.input}
              className={`p-4 rounded-xl bg-bg border space-y-3 ${
                filled ? 'border-accent/40' : 'border-line'
              }`}
            >
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-serif text-sm font-bold text-ink">{spec.label}</h4>
                    <span className="font-mono text-[10px] text-dim">{ref.input}</span>
                    {filled && <CheckCircle2 className="w-3.5 h-3.5 text-accent" />}
                  </div>
                  {/* The agent's reason, verbatim. This is the specificity. */}
                  {ref.why && (
                    <p className="font-sans text-xs text-caution mt-1 leading-relaxed break-words">
                      {ref.why}
                    </p>
                  )}
                  <p className="font-mono text-[11px] text-muted mt-1 leading-relaxed">
                    {spec.instruction}
                  </p>
                </div>
              </div>

              {/* The control */}
              {spec.control === 'upload' && (
                <div className="space-y-2">
                  <label
                    className={`px-3 py-2 rounded-xl bg-surface border border-line-strong text-xs font-mono text-ink inline-flex items-center gap-2 transition-colors ${
                      uploadingFor === ref.input || !projectId
                        ? 'opacity-60 cursor-not-allowed'
                        : 'hover:bg-line cursor-pointer'
                    }`}
                  >
                    {uploadingFor === ref.input ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Upload className="w-3.5 h-3.5" />
                    )}
                    <span>
                      {uploadingFor === ref.input
                        ? 'Uploading…'
                        : spec.multiple
                        ? 'Choose files'
                        : 'Choose a file'}
                    </span>
                    <input
                      type="file"
                      accept={spec.accept}
                      multiple={spec.multiple}
                      disabled={uploadingFor !== null || !projectId}
                      className="hidden"
                      onChange={(e) => {
                        const files = e.target.files;
                        e.target.value = '';
                        void handleFiles(ref.input, files);
                      }}
                    />
                  </label>

                  {!projectId && (
                    <p className="font-mono text-[11px] text-blocking">
                      Select a project before uploading — a file needs somewhere to belong.
                    </p>
                  )}

                  {uploaded.length > 0 && (
                    <ul className="space-y-1">
                      {uploaded.map((file) => (
                        <li
                          key={file.id}
                          className="flex items-center gap-2 font-mono-num text-[11px] text-accent"
                        >
                          <FileAudio className="w-3.5 h-3.5 flex-shrink-0" />
                          <span className="truncate">{file.name}</span>
                          <span className="text-dim">{file.id.slice(0, 8)}</span>
                        </li>
                      ))}
                    </ul>
                  )}

                  {artifacts.length > 0 && uploaded.length === 0 && (
                    <p className="font-mono text-[11px] text-dim">
                      {artifacts.length} artifact{artifacts.length === 1 ? '' : 's'} already on this
                      project. Upload again only if this is a different file.
                    </p>
                  )}
                </div>
              )}

              {spec.control === 'text' && (
                <textarea
                  rows={spec.rows}
                  value={state.text[ref.input] ?? ''}
                  onChange={(e) => updateText(ref.input, e.target.value)}
                  placeholder={spec.placeholder}
                  className="w-full bg-bg border border-line-strong rounded-xl p-3 text-xs font-sans text-ink placeholder:text-dim focus:outline-none focus:border-caution leading-relaxed"
                />
              )}

              {spec.control === 'date' && (
                <div className="flex items-center gap-2">
                  <CalendarDays className="w-4 h-4 text-muted flex-shrink-0" />
                  <input
                    type="date"
                    value={state.text[ref.input] ?? ''}
                    onChange={(e) => updateText(ref.input, e.target.value)}
                    className="bg-bg border border-line-strong rounded-xl px-3 py-2 text-xs font-mono-num text-ink focus:outline-none focus:border-caution"
                  />
                </div>
              )}

              {spec.control === 'number' && (
                <input
                  type="number"
                  min={spec.min}
                  step={1}
                  value={state.text[ref.input] ?? ''}
                  onChange={(e) => updateText(ref.input, e.target.value)}
                  placeholder={spec.placeholder}
                  className="w-28 bg-bg border border-line-strong rounded-xl px-3 py-2 text-xs font-mono-num text-ink placeholder:text-dim focus:outline-none focus:border-caution"
                />
              )}

              {spec.control === 'upstream' && (
                <p className="font-mono text-[11px] text-dim leading-relaxed">
                  Nothing to fill in here.
                </p>
              )}
            </div>
          );
        })}
      </div>

      {uploadError && (
        <p className="flex items-start gap-1.5 font-mono text-[11px] text-blocking break-words">
          <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
          <span>{uploadError}</span>
        </p>
      )}

      {submitError && (
        <p className="flex items-start gap-1.5 font-mono text-[11px] text-blocking break-words">
          <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
          <span>{submitError}</span>
        </p>
      )}

      {submitted && !submitError && (
        <p className="flex items-start gap-1.5 font-mono text-[11px] text-accent">
          <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
          <span>Sent. The stage will run again against what you gave it.</span>
        </p>
      )}

      {/* Footer: what is still outstanding, then the actions */}
      <div className="pt-4 border-t border-line-strong flex flex-wrap items-center justify-between gap-3">
        <p className="font-mono text-[11px] text-muted min-w-0">
          {outstanding.length === 0 ? (
            upstreamOnly.length > 0 ? (
              <>
                Everything you can answer here is filled in.{' '}
                <span className="text-dim">
                  {upstreamOnly.map((i) => CONTROLS[i].label).join(', ')} still comes from an earlier
                  stage.
                </span>
              </>
            ) : (
              'Everything it asked for is filled in.'
            )
          ) : (
            <>
              Still needed:{' '}
              <span className="text-caution">
                {outstanding.map((i) => CONTROLS[i].label).join(', ')}
              </span>
              {/* Answering re-runs the stage immediately. A partial answer
                  therefore costs a whole agent call and gets the same question
                  back for the rest — worth saying before they press it. */}
              {answers.length > 0 && (
                <span className="block text-dim mt-1">
                  Sending now re-runs the stage with only what is filled in, and it will ask for the
                  rest again. Fill in everything you can first.
                </span>
              )}
            </>
          )}
        </p>

        <div className="flex items-center gap-2 flex-wrap">
          {onRedo && (
            <button
              type="button"
              onClick={() => void handleRedo()}
              disabled={redoing || submitting}
              className="px-3 py-2 rounded-xl bg-line hover:bg-line-strong border border-line-strong text-xs font-mono text-ink transition-colors inline-flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Fork a new attempt of this stage against whatever the project holds now"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${redoing ? 'animate-spin' : ''}`} />
              <span>{redoing ? 'Re-running…' : 'Re-run this stage'}</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={submitting || answers.length === 0}
            className="px-4 py-2 rounded-xl bg-accent hover:bg-accent-hover text-accent-on font-mono text-xs font-bold shadow-lg shadow-[var(--accent-dim)] transition-all inline-flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            title={
              answers.length === 0
                ? 'Fill in at least one of the things it asked for'
                : 'Send these answers and let the stage run again'
            }
          >
            {submitting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Send className="w-3.5 h-3.5" />
            )}
            <span>
              {submitting
                ? 'Sending…'
                : answers.length === 0
                ? 'Send answers'
                : `Send ${answers.length} answer${answers.length === 1 ? '' : 's'}`}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
