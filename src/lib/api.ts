/**
 * Typed fetch client for the GHARANA gateway (default http://localhost:8080).
 *
 * The interfaces below are hand-written mirrors of the Pydantic wire types in
 * `libs/common/gharana_common/schemas.py` — the single source of truth. If a
 * schema changes there, change it here too; never invent parallel shapes.
 *
 * Auth: requests go to the same-origin /api/gw proxy, which attaches the key
 * belonging to THIS SESSION — read from an HttpOnly cookie in the Node runtime
 * and never exposed to script on the page. An anonymous request gets 401 and a
 * pointer to /login.
 *
 * This paragraph used to say the proxy attached a server-side GHARANA_API_KEY.
 * That was true, and it was finding F2: keeping a key in Node stops its *value*
 * reaching the browser and does nothing about its *authority*, so once the
 * console had a public domain every anonymous visitor was a fully authorised
 * gateway client — the whole artist list with phone numbers, and someone else's
 * release stage approvable. The code changed; this comment did not, until a
 * test that discovers proxies by searching for `X-API-Key` found it. A doc that
 * describes a removed credential as current is how the next person reintroduces
 * it.
 */

// ---------------------------------------------------------------------------
// Wire types (mirror of gharana_common.schemas)
// ---------------------------------------------------------------------------

export type ArtifactKind =
  | "audio_bounce"
  | "audio_stem"
  | "audio_master"
  | "audio_reference"
  | "lyric_draft"
  | "split_sheet"
  | "release_metadata"
  | "retro_report"
  | "qc_report"
  | "features";

export const ARTIFACT_KINDS: ArtifactKind[] = [
  "audio_bounce",
  "audio_stem",
  "audio_master",
  "audio_reference",
  "lyric_draft",
  "split_sheet",
  "release_metadata",
  "retro_report",
  "qc_report",
  "features",
];

export interface ArtifactRef {
  id: string;
  kind: ArtifactKind;
  uri: string;
  version: number;
  created_at: string | null;
}

/**
 * How sure the agent says it is. DISPLAY ONLY — nothing gates on this, here or
 * in Python. Verbalized confidence saturates at 80-100% regardless of accuracy,
 * so a floor on it would filter tone rather than correctness. The real gate is
 * structural and lives in `Finding.locator` + the evidence resolver.
 */
export interface Confidence {
  score: number;
  /** Free prose. Superseded by `Ask.missing`, which the UI can act on. */
  needs: string[];
}

// ---------------------------------------------------------------------------
// Evidence: what a claim is allowed to point at
//
// Mirrors gharana_common.schemas Locator / Finding / Ask. A claim carries a
// locator, code resolves it against the data plane, and anything that does not
// resolve is dropped BEFORE it reaches this console. Everything the console
// receives in `findings` has already passed that check; everything it discarded
// arrives in `dropped_findings` so the artist can see the guard working.
// ---------------------------------------------------------------------------

export type LocatorKind =
  | "time_range"
  | "measured_value"
  | "qc_issue"
  | "lyric_line"
  | "reference_track";

/** A span of the recording. Resolvable only against a measured duration. */
export interface TimeRange {
  kind: "time_range";
  start_s: number;
  end_s: number;
}

/** A named number in the feature store, e.g. `mix_lufs_integrated`. */
export interface MeasuredValueRef {
  kind: "measured_value";
  key: string;
}

/** A topic raised by the upstream, approved QC report. */
export interface QCIssueRef {
  kind: "qc_issue";
  topic: string;
}

/** One line of a lyric draft, by section and zero-based index. */
export interface LyricLineRef {
  kind: "lyric_line";
  section: string;
  index: number;
}

/** A reference recording the artist actually supplied. */
export interface ReferenceTrackRef {
  kind: "reference_track";
  artifact_id: string;
}

/**
 * Where a claim points. Discriminated on `kind`, exactly as the Pydantic union
 * is — an unknown kind must fail at the boundary rather than render as an
 * anchor pointing at nothing.
 */
export type Locator =
  | TimeRange
  | MeasuredValueRef
  | QCIssueRef
  | LyricLineRef
  | ReferenceTrackRef;

/** What kind of thing backs the claim. Determines how far it can be trusted. */
export type FindingBasis = "measured" | "reference" | "artist_stated";

/**
 * One claim, and the thing in the data plane it points at.
 *
 * Replaces the free-prose `reasons: string[]` this console used to render.
 * Prose had no locator, so "the chorus feels thin" and "your chorus at 2:14 is
 * 1.2 LU under the reference" were the same type to every component
 * downstream. The locator is what the product actually sells; render it as the
 * anchor it is, never as decoration.
 */
export interface Finding {
  claim: string;
  locator: Locator;
  basis: FindingBasis;
}

export type QCSeverity = "info" | "minor" | "major" | "blocking";

export interface QCIssue {
  topic: string;
  description: string;
  severity: QCSeverity;
  start_s: number | null;
  end_s: number | null;
  stem: string | null;
  confidence: number;
}

export interface QCReport {
  project_id: string;
  mix_ref: ArtifactRef | null;
  reference_ref: ArtifactRef | null;
  lufs_integrated: number | null;
  true_peak_db: number | null;
  issues: QCIssue[];
  summary: string;
  confidence: Confidence;
}

export type ReadinessVerdict = "release_ready" | "needs_work" | "not_ready";

/**
 * A&R's verdict, and the evidence that has to come first.
 *
 * Field order mirrors the Pydantic model and is load-bearing there (evidence is
 * declared before the number so the model cannot commit to a score and then
 * justify it). It carries no meaning in TypeScript, but keeping the two in the
 * same order is how a reader spots drift between them.
 */
export interface ReadinessScore {
  project_id: string;
  /** Evidence first. Each claim points at something in the data plane. */
  findings: Finding[];
  score: number;
  verdict: ReadinessVerdict;
  single_pick: string | null;
  confidence: Confidence;
  /**
   * Claims removed because their evidence did not resolve. Surfaced, not
   * hidden — a rising count is a prompt regression. Render it quietly: it is
   * the guard working, not an error the artist caused.
   */
  dropped_findings: string[];
}

// ---------------------------------------------------------------------------
// Ask — the stage declines and names its price
// ---------------------------------------------------------------------------

/**
 * Things a stage can ask for, as a closed set the UI renders controls for.
 * Mirrors gharana_common.schemas.MissingInput (12 members).
 *
 * Note the name: `MissingInput` below is a DIFFERENT, smaller Python enum
 * (services/orchestrator/intent.py) covering only what a first sentence can
 * fail to carry. It is declared as a subset of this one so the two cannot
 * silently drift apart.
 */
export type AskMissingInput =
  | "mix_bounce"
  | "reference_track"
  | "stems"
  | "master"
  | "artist_goals"
  | "release_date"
  | "track_count"
  | "additional_tracks"
  | "collaborator_splits"
  | "original_rights_holder"
  | "qc_report"
  | "lyrics";

export const ASK_MISSING_INPUTS: AskMissingInput[] = [
  "mix_bounce",
  "reference_track",
  "stems",
  "master",
  "artist_goals",
  "release_date",
  "track_count",
  "additional_tracks",
  "collaborator_splits",
  "original_rights_holder",
  "qc_report",
  "lyrics",
];

export interface MissingInputRef {
  input: AskMissingInput;
  /** One line: what this stage cannot conclude without it. Show it verbatim. */
  why: string;
}

/**
 * The one new terminal action an agent gained: decline, with a named list of
 * required inputs. Without it, a stage with no QC report, no reference and no
 * stated goals still returned a number and a verdict — invented under protest,
 * then approved as though it meant something.
 */
export interface Ask {
  missing: MissingInputRef[];
  /** Optional context. Never a substitute for `missing`. */
  note: string | null;
}

/**
 * One artist answer to one `MissingInputRef`. Mirrors the orchestrator's
 * `AskAnswer` (services/orchestrator/app.py) exactly.
 *
 * `input` must be one the stage actually asked for — the orchestrator 400s on
 * anything else rather than pinning an answer under a key no agent reads.
 * `value` is a JSON scalar and is rejected server-side when blank: an empty
 * string pinned as an answer would make the next attempt read "the artist
 * supplied this" and produce a verdict resting on nothing.
 *
 * File answers carry an artifact id, never bytes: the upload goes through POST
 * /projects/{id}/artifacts first, so the object store stays the single path by
 * which audio enters the system.
 */
export interface AskAnswer {
  input: AskMissingInput;
  value: string | number | boolean;
}

export interface LyricSection {
  name: string;
  lines: string[];
}

export interface LyricDraft {
  language: string;
  script: string;
  dialect: string | null;
  sections: LyricSection[];
  transliteration: LyricSection[] | null;
  notes: string | null;
}

export type SplitSide = "composition" | "recording";

export interface SplitParty {
  name: string;
  role: string;
  side: SplitSide;
  share_pct: number;
  contact: string | null;
  signed: boolean;
}

export interface SplitSheet {
  project_id: string;
  work_title: string;
  parties: SplitParty[];
  status: string; // draft|sent|signed
}

export interface AIManifest {
  lyrics_assist: boolean;
  generation: boolean;
  mastering_ai: boolean;
  agents_involved: string[];
}

export interface ReleaseMetadata {
  project_id: string;
  title: string;
  title_transliteration: string | null;
  artists: string[];
  language: string;
  genre: string;
  subgenre: string | null;
  isrc: string | null;
  upc: string | null;
  release_date: string | null;
  ai_manifest: AIManifest;
  validation_problems: string[];
}

export interface RetroFinding {
  what: string;
  evidence: string;
}

export interface RetroReport {
  project_id: string;
  period: string;
  findings: RetroFinding[];
  actions: string[];
}

export type StageStatus =
  | "pending"
  | "running"
  | "awaiting_approval"
  | /**
     * The stage returned an `Ask` and the run is parked until the artist
     * supplies the named inputs. Distinct from `awaiting_approval`: there is
     * no verdict here to approve, so the console offers an answer form and a
     * redo, never an "Approve & Lock".
     *
     * Not a member of the Python `StageStatus` enum — the orchestrator's
     * `StageView` widens `status` to a plain string precisely so this value
     * cannot 500 the run view. The wire value is this string.
     */
    "awaiting_input"
  | "approved"
  | "redo_requested"
  | "failed"
  | "skipped";

export interface StageResult {
  stage: string;
  status: StageStatus;
  attempt: number;
  output: Record<string, unknown> | null;
  error: string | null;
  started_at: string | null;
  finished_at: string | null;
  /**
   * What the artist pinned to this attempt in answer to a previous one's Ask,
   * keyed by `AskMissingInput`. Present on every attempt (empty when none).
   *
   * Surfaced rather than internal for a reason worth keeping: a downstream
   * claim resting on one of these is `basis: "artist_stated"`, and the artist
   * is entitled to see the sentence they are being quoted on.
   */
  inputs?: Record<string, unknown>;
}

export interface StageSpec {
  name: string;
  agent: string;
  tool: string;
  depends_on: string[];
  checkpoint: boolean;
}

export interface PipelineTemplate {
  name: string;
  stages: StageSpec[];
}

export type RunStatus = "running" | "paused" | "completed" | "failed";

export interface PipelineRun {
  id: string;
  project_id: string;
  template: string;
  status: RunStatus;
  stages: StageResult[];
  created_at: string | null;
}

export interface LedgerEvent {
  id: string | null;
  project_id: string;
  event_type: string;
  payload: Record<string, unknown>;
  prev_hash: string | null;
  hash: string | null;
  created_at: string | null;
}

// ---------------------------------------------------------------------------
// Gateway row types (DB-backed responses that aren't shared schema objects)
// ---------------------------------------------------------------------------

export interface Artist {
  id: string;
  name: string;
  language: string | null;
  whatsapp: string | null;
  created_at: string | null;
}

export interface Project {
  id: string;
  artist_id: string;
  artist_name: string;
  title: string;
  status: string;
  created_at: string | null;
}

export interface RunSummary {
  id: string;
  project_id: string;
  template: string;
  status: string;
  created_at: string | null;
  updated_at?: string | null;
}

// ---------------------------------------------------------------------------
// Fetch plumbing
// ---------------------------------------------------------------------------

/**
 * Same-origin proxy prefix. Requests go to this Next route, which attaches the
 * gateway API key server-side (app/api/gw/[...path]/route.ts).
 *
 * The key is deliberately NOT read here: anything in this module ships to the
 * browser, so a NEXT_PUBLIC_ key would be readable by every visitor.
 */
export const API_URL: string = "/api/gw";

/** Error carrying the HTTP status and the gateway's human-readable detail. */
export class ApiError extends Error {
  readonly status: number;
  readonly detail: string;

  constructor(status: number, detail: string) {
    super(`${status}: ${detail}`);
    this.name = "ApiError";
    this.status = status;
    this.detail = detail;
  }
}

/** Pull a readable message out of any gateway/orchestrator error payload. */
function extractDetail(payload: unknown, fallback: string): string {
  if (payload && typeof payload === "object") {
    const p = payload as Record<string, unknown>;
    if (typeof p.detail === "string") return p.detail;
    if (Array.isArray(p.detail)) return JSON.stringify(p.detail); // FastAPI 422s
    if (typeof p.error === "string") {
      return typeof p.detail === "string" ? `${p.error}: ${p.detail}` : p.error;
    }
  }
  return fallback;
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  // No API key here — the same-origin proxy attaches it server-side.
  // Only set a JSON content type when we're actually sending JSON — for
  // multipart uploads the browser must set the boundary itself.
  if (init.body !== undefined && typeof init.body === "string") {
    headers.set("Content-Type", "application/json");
  }

  let resp: Response;
  try {
    resp = await fetch(`${API_URL}${path}`, { ...init, headers, cache: "no-store" });
  } catch (err) {
    throw new ApiError(
      0,
      `gateway unreachable at ${API_URL} (${err instanceof Error ? err.message : String(err)})`,
    );
  }

  let payload: unknown = null;
  const text = await resp.text();
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = null;
    }
  }

  if (!resp.ok) {
    throw new ApiError(resp.status, extractDetail(payload, text || resp.statusText));
  }
  return payload as T;
}

// ---------------------------------------------------------------------------
// Artists
// ---------------------------------------------------------------------------

export function listArtists(): Promise<Artist[]> {
  return request<Artist[]>("/artists");
}

export function createArtist(body: {
  name: string;
  language?: string | null;
  whatsapp?: string | null;
}): Promise<Artist> {
  return request<Artist>("/artists", { method: "POST", body: JSON.stringify(body) });
}

// ---------------------------------------------------------------------------
// Projects
// ---------------------------------------------------------------------------

export function listProjects(): Promise<Project[]> {
  return request<Project[]>("/projects");
}

export function getProject(projectId: string): Promise<Project> {
  return request<Project>(`/projects/${projectId}`);
}

export function createProject(body: {
  artist_id: string;
  title: string;
  status?: string;
}): Promise<Project> {
  return request<Project>("/projects", { method: "POST", body: JSON.stringify(body) });
}

// ---------------------------------------------------------------------------
// Intent — one sentence in, an approvable plan out
// ---------------------------------------------------------------------------

/**
 * A named gap the plan needs the artist to fill. Mirrors the orchestrator's
 * intent.MissingInput, which is a strict subset of the shared-contract
 * `AskMissingInput` above.
 *
 * Written as an `Extract` rather than re-typed so the two cannot drift: a
 * member that stops existing in the shared set silently disappears here, and
 * every exhaustive `Record<MissingInput, …>` in the console fails to compile.
 */
export type MissingInput = Extract<
  AskMissingInput,
  | "mix_bounce"
  | "reference_track"
  | "artist_goals"
  | "collaborator_splits"
  | "original_rights_holder"
  | "additional_tracks"
  | "track_count"
  | "release_date"
>;

/** Facts read out of the artist's message. Never a decision — code decides. */
export interface ReleaseSignals {
  reasoning: string;
  is_cover: boolean;
  is_sync_pitch: boolean;
  track_count: number | null;
  implies_multiple_tracks: boolean;
  title: string | null;
  language: string | null;
  goal: string | null;
  target_date: string | null;
}

/**
 * What the artist approves, once.
 *
 * `caveats` is where the plan admits it does not fully fit what was asked — five
 * tracks against a three-track EP pipeline, a multi-track cover. Render them; a
 * plan that silently drops two tracks is worse than one that says so.
 */
export interface ReleasePlan {
  template: string;
  stages: string[];
  signals: ReleaseSignals;
  missing: MissingInput[];
  caveats: string[];
}

/**
 * Turn one sentence into a plan. Starts nothing.
 *
 * `project_id` is optional and only subtracts already-uploaded files from what
 * the plan asks for — an artist should not be asked for a mix they uploaded ten
 * minutes ago.
 */
export function parseIntent(message: string, projectId?: string | null): Promise<ReleasePlan> {
  return request<ReleasePlan>("/intent", {
    method: "POST",
    body: JSON.stringify({ message, project_id: projectId ?? null }),
  });
}

// ---------------------------------------------------------------------------
// Artifacts
// ---------------------------------------------------------------------------

export function listArtifacts(projectId: string): Promise<ArtifactRef[]> {
  return request<ArtifactRef[]>(`/projects/${projectId}/artifacts`);
}

export function uploadArtifact(
  projectId: string,
  file: File,
  kind: ArtifactKind,
): Promise<ArtifactRef> {
  const form = new FormData();
  form.append("file", file);
  form.append("kind", kind);
  return request<ArtifactRef>(`/projects/${projectId}/artifacts`, {
    method: "POST",
    body: form,
  });
}

// ---------------------------------------------------------------------------
// Pipeline runs (gateway proxies these to the orchestrator)
// ---------------------------------------------------------------------------

export function startRun(
  projectId: string,
  template = "single_release",
): Promise<PipelineRun> {
  return request<PipelineRun>(`/projects/${projectId}/runs`, {
    method: "POST",
    body: JSON.stringify({ project_id: projectId, template }),
  });
}

/**
 * Pipeline templates the orchestrator currently registers.
 *
 * Fetched rather than hardcoded: the registry is the orchestrator's, and a
 * stale copy here would offer templates that no longer exist (or hide new
 * ones, which is how the console ended up stuck on single_release).
 */
export async function listTemplates(): Promise<PipelineTemplate[]> {
  const payload = await request<{ templates?: PipelineTemplate[] } | PipelineTemplate[]>(
    "/templates",
  );
  return Array.isArray(payload) ? payload : (payload.templates ?? []);
}


/** One agent this deployment really runs, and what it claims it can do. */
export interface AgentCapability {
  capability: string;
  tool: string;
  description: string;
}

export interface InstalledAgent {
  agent: string;
  /** first_party | third_party — decides clearance tier, not marketing rank. */
  kind: string;
  capabilities: AgentCapability[];
}

/**
 * The agents this deployment actually has.
 *
 * Served from the same capability registry the planner reads, so an agent
 * listed here can be planned against and one that cannot is absent. The
 * marketplace used to render a hardcoded array of invented listings instead —
 * plausible names attached to nothing that runs, which is a fabricated claim
 * about the system in exactly the way a fabricated measurement is.
 */
export async function listCapabilities(): Promise<InstalledAgent[]> {
  const payload = await request<{ agents?: InstalledAgent[] }>("/capabilities");
  return payload.agents ?? [];
}

export async function listRuns(projectId: string): Promise<RunSummary[]> {
  // The orchestrator wraps run lists as {"runs": [...]}; tolerate a bare
  // array too so a future gateway change doesn't break the UI.
  const payload = await request<RunSummary[] | { runs: RunSummary[] }>(
    `/projects/${projectId}/runs`,
  );
  if (Array.isArray(payload)) return payload;
  if (payload && Array.isArray(payload.runs)) return payload.runs;
  return [];
}

export function getRun(runId: string): Promise<PipelineRun> {
  return request<PipelineRun>(`/runs/${runId}`);
}

export function approveStage(runId: string, stage: string): Promise<PipelineRun> {
  return request<PipelineRun>(
    `/runs/${runId}/stages/${encodeURIComponent(stage)}/approve`,
    { method: "POST", body: JSON.stringify({}) },
  );
}

export function redoStage(runId: string, stage: string): Promise<PipelineRun> {
  return request<PipelineRun>(
    `/runs/${runId}/stages/${encodeURIComponent(stage)}/redo`,
    { method: "POST", body: JSON.stringify({}) },
  );
}

/**
 * Answer a stage that returned an `Ask`, unparking the run.
 *
 * The endpoint is the orchestrator's, added alongside AWAITING_INPUT. Until it
 * is deployed this call returns 404/405 and `AskPanel` says so in those words
 * rather than reporting a success it did not get — uploads made while
 * answering are already persisted by POST /projects/{id}/artifacts, so the file
 * half of an answer survives regardless.
 */
export function answerStageAsk(
  runId: string,
  stage: string,
  answers: AskAnswer[],
): Promise<PipelineRun> {
  return request<PipelineRun>(
    `/runs/${runId}/stages/${encodeURIComponent(stage)}/answer`,
    { method: "POST", body: JSON.stringify({ answers }) },
  );
}
