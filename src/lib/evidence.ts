/**
 * Read findings, locators and Asks off the wire, and resolve a locator against
 * what this console actually holds.
 *
 * Two rules shape every function here.
 *
 * 1. **Parse, don't coerce.** A finding whose locator is missing, malformed, or
 *    of a kind this build does not know is DROPPED, not rendered with blanks in
 *    it. The server already dropped everything whose evidence did not resolve;
 *    this is the same rule applied one layer out, to the shape rather than the
 *    reference. `readFindings` returns what it rejected so the UI can say so.
 *
 * 2. **Never supply a number the console was not given.** A locator names a
 *    measurement; it does not carry its value. The console shows a value only
 *    where it holds one from a real QC report, and shows the measurement's name
 *    alone otherwise. There is no lookup table of plausible defaults, no unit
 *    inferred from a key's spelling, and no rounding of something we did not
 *    measure. Three components in this repo have shipped hardcoded LUFS; the
 *    absence of a fallback path here is deliberate.
 */

import type {
  ArtifactRef,
  Ask,
  AskMissingInput,
  Finding,
  FindingBasis,
  Locator,
  LocatorKind,
  MissingInputRef,
  PipelineRun,
  QCIssue,
  QCReport,
  StageResult,
} from "./api";
import { ASK_MISSING_INPUTS } from "./api";

// ---------------------------------------------------------------------------
// Wire readers
// ---------------------------------------------------------------------------

const LOCATOR_KINDS: LocatorKind[] = [
  "time_range",
  "measured_value",
  "qc_issue",
  "lyric_line",
  "reference_track",
];

const BASES: FindingBasis[] = ["measured", "reference", "artist_stated"];

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function str(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}

function finite(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

/**
 * Validate one locator. Returns null for anything this build cannot render as
 * a real anchor — including a kind it does not recognise, which is the case a
 * silent `default:` branch would turn into an anchor pointing at nothing.
 */
export function readLocator(value: unknown): Locator | null {
  const rec = asRecord(value);
  if (!rec) return null;
  const kind = rec.kind;
  if (typeof kind !== "string" || !LOCATOR_KINDS.includes(kind as LocatorKind)) return null;

  switch (kind as LocatorKind) {
    case "time_range": {
      const start = finite(rec.start_s);
      const end = finite(rec.end_s);
      // The server's resolver already rejects an end at or before the start;
      // re-checking here keeps a malformed span from rendering as "2:14–2:02".
      if (start === null || end === null || start < 0 || end <= start) return null;
      return { kind: "time_range", start_s: start, end_s: end };
    }
    case "measured_value": {
      const key = str(rec.key);
      return key === null ? null : { kind: "measured_value", key };
    }
    case "qc_issue": {
      const topic = str(rec.topic);
      return topic === null ? null : { kind: "qc_issue", topic };
    }
    case "lyric_line": {
      const section = str(rec.section);
      const index = finite(rec.index);
      if (section === null || index === null || index < 0 || !Number.isInteger(index)) return null;
      return { kind: "lyric_line", section, index };
    }
    case "reference_track": {
      const artifactId = str(rec.artifact_id);
      return artifactId === null ? null : { kind: "reference_track", artifact_id: artifactId };
    }
  }
}

export interface ReadFindings {
  /** Findings whose shape is intact and whose locator is a kind we can anchor. */
  kept: Finding[];
  /**
   * Claims discarded at the console boundary, as short strings in the same
   * shape as `ReadinessScore.dropped_findings`. They are shown alongside the
   * server's drops: a claim the artist never sees is a claim the artist never
   * sees, whichever layer removed it.
   */
  dropped: string[];
}

export function readFindings(value: unknown): ReadFindings {
  if (!Array.isArray(value)) return { kept: [], dropped: [] };
  const kept: Finding[] = [];
  const dropped: string[] = [];
  for (const entry of value) {
    const rec = asRecord(entry);
    const claim = rec ? str(rec.claim) : null;
    const locator = rec ? readLocator(rec.locator) : null;
    const basis = rec && BASES.includes(rec.basis as FindingBasis) ? (rec.basis as FindingBasis) : null;
    if (claim === null || locator === null || basis === null) {
      dropped.push(
        claim === null
          ? "a finding arrived with no claim text"
          : `${JSON.stringify(claim.slice(0, 60))}: the console could not read its ${
              locator === null ? "locator" : "basis"
            }`,
      );
      continue;
    }
    kept.push({ claim, locator, basis });
  }
  return { kept, dropped };
}

export function readDroppedFindings(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === "string" && !!v.trim()) : [];
}

/** The only keys an `Ask` has. Mirrors `Ask.model_fields`. */
const ASK_FIELDS = new Set(["missing", "note"]);

/**
 * The A&R agent's envelope discriminator (`services/agents/anr/contract.py`).
 * Every dict its tools return carries one, so `outcome: "ask"` is an explicit
 * statement rather than a shape this console had to guess at.
 */
const OUTCOME_KEY = "outcome";

/**
 * Single-key wrappers an Ask can arrive inside, unwrapped one level and only
 * when it is the sole key. Same list, same rule, as the orchestrator's
 * `_ASK_ENVELOPES`.
 */
const ASK_ENVELOPES = ["ask", "result"];

/**
 * Read an `Ask` out of a stage output, by the orchestrator's own rule.
 *
 * Recognition is structural rather than a heuristic on field names, and it is
 * copied from `executor.ask_from_result` deliberately — the two must agree, or
 * the console shows an answer form for something the pipeline is treating as a
 * verdict, or worse offers an approval on something it is treating as a
 * question.
 *
 * The load-bearing half is the subset test. Without it, a `ReadinessScore` that
 * happened to carry a stray `missing` list would read as a declined stage and
 * the artist's verdict would vanish behind a form. Every real payload in the
 * contract has required fields `Ask` does not, so none of them can pass.
 *
 * The one place this is looser than the server: a blank `why`. Pydantic's
 * `min_length=1` means a stored Ask always has one, so this cannot happen in
 * practice — and if it somehow did, dropping the whole request over missing
 * prose would leave the artist with a parked run and no form.
 */
export function readAsk(output: unknown): Ask | null {
  const rec = asRecord(output);
  if (!rec || Object.keys(rec).length === 0) return null;

  let payload = rec;
  if (Object.keys(rec).length === 1) {
    for (const envelope of ASK_ENVELOPES) {
      const inner = asRecord(rec[envelope]);
      if (inner) {
        payload = inner;
        break;
      }
    }
  }

  // Two ways to be an Ask, and both are statements rather than guesses.
  //
  // The agent's own envelope says so outright (`outcome: "ask"`, carrying a
  // `project_id` alongside), and the console has to accept it: the A&R agent
  // enveloped its decline, the orchestrator's subset rule does not match that
  // envelope, so such a stage can arrive parked on `awaiting_approval` with a
  // question in it. Rendering an "Approve & Lock" over a question is the exact
  // outcome every layer here exists to prevent, so the discriminator wins.
  //
  // Otherwise the orchestrator's structural rule applies unchanged.
  const keys = Object.keys(payload);
  const declared = payload[OUTCOME_KEY] === "ask";
  if (!declared && (keys.length === 0 || !keys.every((k) => ASK_FIELDS.has(k)))) return null;
  if (!Array.isArray(payload.missing) || payload.missing.length === 0) return null;

  const missing: MissingInputRef[] = [];
  for (const entry of payload.missing) {
    const item = asRecord(entry);
    const input = item ? item.input : null;
    // An input outside the closed enum has no control to render, which is the
    // same as having no answer form at all. Refuse the whole Ask rather than
    // present a partial one the artist cannot complete.
    if (typeof input !== "string" || !ASK_MISSING_INPUTS.includes(input as AskMissingInput)) {
      return null;
    }
    missing.push({ input: input as AskMissingInput, why: (item && str(item.why)) ?? "" });
  }
  return { missing, note: str(payload.note) };
}

/**
 * The Ask a stage is parked on, or null.
 *
 * Driven by the payload as well as the status so the console works before and
 * after the orchestrator's AWAITING_INPUT lands: an agent that returns an Ask
 * while the stage still reports `awaiting_approval` must not be rendered as a
 * verdict waiting for a thumbs-up, because there is no verdict there.
 */
export function askOfStage(stage: StageResult | null | undefined): Ask | null {
  if (!stage) return null;
  if (stage.status !== "awaiting_input" && stage.status !== "awaiting_approval") return null;
  return readAsk(stage.output);
}

/**
 * True when a stage is stopped on the artist rather than on a decision.
 *
 * Deliberately broader than `askOfStage`: a stage parked on AWAITING_INPUT
 * whose payload this console cannot read is still not a verdict, and must not
 * be offered with an "Approve & Lock" under it. Callers use this to decide what
 * is approvable; they use `askOfStage` to decide what is answerable.
 */
export function isWaitingOnArtist(stage: StageResult | null | undefined): boolean {
  if (!stage) return false;
  return stage.status === "awaiting_input" || askOfStage(stage) !== null;
}

/** An A&R stage that produced nothing showable, and why. */
export interface NotAssessed {
  /** `no_model_credentials` | `narration_withdrawn`, per NotAssessedCause. */
  cause: string;
  note: string;
  dropped_findings: string[];
}

/**
 * Read a `not_assessed` envelope, or null.
 *
 * This outcome deliberately carries no `score` and no `verdict` — a reader that
 * wants one has to notice their absence rather than find a zero sitting where a
 * judgement goes. It does carry `dropped_findings`, which is the whole reason
 * to render it: an assessment withdrawn by the guard is news, and it must not
 * fall through to the generic "no score yet, start a run" screen.
 */
export function readNotAssessed(output: unknown): NotAssessed | null {
  const rec = asRecord(output);
  if (!rec || rec[OUTCOME_KEY] !== "not_assessed") return null;
  return {
    cause: str(rec.cause) ?? "unknown",
    note: str(rec.note) ?? "",
    dropped_findings: readDroppedFindings(rec.dropped_findings),
  };
}

/**
 * The QC report a run has produced, or null.
 *
 * Recognised by its measurement fields rather than by stage naming, because EP
 * runs number their QC stages (`qc_track_2`) and a name match would silently
 * find nothing there. Null means the stage has not produced one — every caller
 * renders "not measured" for null.
 */
export function qcReportOfRun(run: PipelineRun | null | undefined): QCReport | null {
  for (const stage of run?.stages ?? []) {
    const output = asRecord(stage.output);
    if (!output) continue;
    const candidates: unknown[] = [output, ...Object.values(output)];
    for (const candidate of candidates) {
      const rec = asRecord(candidate);
      if (rec && "lufs_integrated" in rec && Array.isArray(rec.issues)) {
        return rec as unknown as QCReport;
      }
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// What the console holds, and how a locator renders against it
// ---------------------------------------------------------------------------

/** A measurement the console can put a number next to, with its unit. */
export interface HeldMeasurement {
  key: string;
  label: string;
  value: number;
  unit: string;
  /** How many decimals the underlying measurement is quoted to elsewhere. */
  decimals: number;
}

/**
 * The only measured keys this console can resolve to a value, and where each
 * one comes from.
 *
 * Deliberately a short, hand-checked list rather than a pattern over key names.
 * `mix_lufs_integrated` is `QCReport.lufs_integrated` because that field is the
 * BS.1770 integrated loudness of `QCReport.mix_ref` — the same measurement
 * production_qc pins under that name. Every other pinned key (reference
 * loudness, deltas, section and band values) exists in the agent's pin table
 * and NOT in the QCReport the gateway returns, so the console holds no value
 * for it and shows none.
 */
const QC_MEASUREMENTS: {
  key: string;
  label: string;
  unit: string;
  decimals: number;
  read: (report: QCReport) => number | null;
}[] = [
  {
    key: "mix_lufs_integrated",
    label: "mix integrated loudness",
    unit: "LUFS",
    decimals: 1,
    read: (r) => finite(r.lufs_integrated),
  },
  {
    key: "mix_true_peak_db",
    label: "mix true peak",
    unit: "dBTP",
    decimals: 1,
    read: (r) => finite(r.true_peak_db),
  },
];

export interface EvidenceView {
  /** Measured key -> the value this console genuinely holds for it. */
  measured: Record<string, HeldMeasurement>;
  /** QC topic -> the issue the approved QC report raised under it. */
  qcIssues: Record<string, QCIssue>;
  /** Lyric section name -> its lines, when a draft is on screen. */
  lyricSections: Record<string, string[]>;
  /** Artifact id -> the artifact row, for reference-track locators. */
  artifacts: Record<string, ArtifactRef>;
}

export const EMPTY_EVIDENCE: EvidenceView = {
  measured: {},
  qcIssues: {},
  lyricSections: {},
  artifacts: {},
};

export function buildEvidenceView(input: {
  qcReport?: QCReport | null;
  artifacts?: ArtifactRef[] | null;
  lyricSections?: Record<string, string[]> | null;
}): EvidenceView {
  const measured: Record<string, HeldMeasurement> = {};
  if (input.qcReport) {
    for (const spec of QC_MEASUREMENTS) {
      const value = spec.read(input.qcReport);
      if (value === null) continue; // not measured: no entry, never a zero
      measured[spec.key] = {
        key: spec.key,
        label: spec.label,
        value,
        unit: spec.unit,
        decimals: spec.decimals,
      };
    }
  }

  const qcIssues: Record<string, QCIssue> = {};
  for (const issue of input.qcReport?.issues ?? []) {
    if (issue && typeof issue.topic === "string" && issue.topic) qcIssues[issue.topic] = issue;
  }

  const artifacts: Record<string, ArtifactRef> = {};
  for (const artifact of input.artifacts ?? []) {
    if (artifact?.id) artifacts[artifact.id] = artifact;
  }

  return { measured, qcIssues, lyricSections: input.lyricSections ?? {}, artifacts };
}

// ---------------------------------------------------------------------------
// Formatting
// ---------------------------------------------------------------------------

/** Seconds -> `m:ss`, or `h:mm:ss` past an hour. Never rounds up into a lie. */
export function formatTimestamp(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds));
  const s = total % 60;
  const m = Math.floor(total / 60) % 60;
  const h = Math.floor(total / 3600);
  const mm = h > 0 ? String(m).padStart(2, "0") : String(m);
  return `${h > 0 ? `${h}:` : ""}${mm}:${String(s).padStart(2, "0")}`;
}

/** `2:14 – 2:31`, the anchor an artist can scrub to. */
export function formatTimeRange(range: { start_s: number; end_s: number }): string {
  return `${formatTimestamp(range.start_s)} – ${formatTimestamp(range.end_s)}`;
}

/** `mix_lufs_integrated` -> `mix lufs integrated`, for keys we hold no value for. */
export function humanizeMeasurementKey(key: string): string {
  return key.replace(/_/g, " ").trim();
}

/** Format a held measurement as a number and its unit. Nothing else calls this. */
export function formatMeasurement(held: HeldMeasurement): string {
  return `${held.value.toFixed(held.decimals)} ${held.unit}`;
}

/** The filename an artifact URI ends in, for naming a reference track. */
export function artifactLabel(artifact: ArtifactRef): string {
  const tail = artifact.uri.split(/[/\\]/).filter(Boolean).pop();
  return tail && tail.length <= 64 ? tail : artifact.kind;
}
