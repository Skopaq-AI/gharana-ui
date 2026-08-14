import type {
  ArtifactRef,
  PipelineRun,
  Project,
  QCReport,
  ReadinessScore,
  StageResult,
} from './lib/api';

/**
 * Release language. English first because that is now the primary market, but
 * the list is deliberately not a closed world: a catalogue that only admits
 * languages someone thought of in advance rejects the artist it was trying to
 * serve. `string` keeps an unlisted language renderable instead of unrepresentable.
 */
export type Language =
  | 'English'
  | 'Spanish'
  | 'Portuguese'
  | 'French'
  | 'German'
  | 'Korean'
  | 'Japanese'
  | 'Hindi'
  | 'Telugu'
  | 'Tamil'
  | 'Punjabi'
  | 'Multi-Language'
  | (string & {});

export type CheckpointStatus = 'pending_artist_approval' | 'approved' | 'rejected' | 'modified';

/**
 * Measured audio values.
 *
 * ONLY `integratedLufs` and `truePeakDbtp` are ever populated by the console,
 * and only from a real QCReport produced by the qc_analysis stage of a
 * pipeline run (BS.1770 integrated loudness / true peak). Every other field
 * here is measurable in principle but is NOT returned by the gateway today —
 * leave it `undefined` and render "not measured yet". Never fill one in.
 */
export interface AudioMetrics {
  integratedLufs?: number; // QCReport.lufs_integrated
  truePeakDbtp?: number;   // QCReport.true_peak_db
  // --- Not returned by the gateway. Always undefined today. ---------------
  dynamicRangeLu?: number;
  stereoWidth?: number;
  sampleRateHz?: number;
  bitDepth?: number;
  /** Per-band energy (dB). Nothing measures this yet. */
  frequencyBins?: {
    subBass: number;       // 20-60 Hz
    bass: number;          // 60-250 Hz
    lowMid: number;        // 250-500 Hz
    mid: number;           // 500-2 kHz
    highMid: number;       // 2-6 kHz
    highs: number;         // 6-20 kHz
  };
  /** Short-term loudness series. The QC report carries no time series. */
  lufsOverTime?: number[];
}

export interface PlatformCompliance {
  platform: 'Spotify' | 'Apple Music' | 'YouTube Music' | 'Instagram / Reels' | 'TIDAL' | 'Radio/Club';
  targetLufs: number;
  maxPeakDbtp: number;
  measuredLufs?: number;
  measuredPeak?: number;
  status: 'OPTIMAL' | 'WARNING' | 'WILL_ATTENUATE' | 'QUIET';
  explanation: string;
}

export interface ARAssessment {
  verdict: string;
  narrativeSummary: string;
  strengths: string[];
  concerns: string[];
  commercialPotentialScore: number; // 0-100
  targetAudience: string;
  suggestedPlaylists: string[];
  recommendedAction: string;
  checkpointStatus: CheckpointStatus;
  artistNote?: string;
}

export interface LyricLine {
  id: string;
  text: string;                  // Primary native script
  transliteration?: string;     // ISO Romanized pronunciation
  syllables?: number;            // Syllable / Matra prosody weight
  isAgentAssisted?: boolean;    // Visibly marked if accepted from agent
  flaggedMeter?: boolean;       // True if breaks section rhythm pattern
}

export interface LyricDraftSection {
  id: string;
  name: string;                  // e.g. "Verse 1 (చరణం 1)"
  lines: LyricLine[];
}

export interface LyricDraftWire {
  language: string;
  script: string;
  dialect: string | null;
  sections: {
    name: string;
    lines: string[];
  }[];
  transliteration: {
    name: string;
    lines: string[];
  }[] | null;
  notes: string | null;
}

export interface LyricAnalysis {
  language: Language;
  dialect?: string | null;
  script?: string;
  primaryTheme: string;
  rhymeScheme: string;
  meterRegularityScore: number; // 0-100
  copyrightRiskFlag: boolean;
  copyrightNotes?: string;
  culturalResonanceNotes: string;
  lyricsText: string;
  lyricDraft?: LyricDraftWire;
  checkpointStatus: CheckpointStatus;
}

export interface SplitContributor {
  id: string;
  name: string;
  role: string;
  side: 'composition' | 'recording';
  sharePercentage: number;
  ipiCaeNumber?: string;
  email: string;
  contact?: string | null;
  signed: boolean;
  signatureStatus?: 'Signed' | 'Pending' | 'Declined';
}

export interface LedgerEvent {
  id: string;
  project_id: string;
  event_type: 'split_declared' | 'agreement_sent' | 'signed' | 'registered' | 'clearance_granted';
  payload: Record<string, any>;
  prev_hash: string;
  hash: string;
  created_at: string;
}

export interface CoverClearanceGate {
  isCoverRelease: boolean;
  originalWorkTitle?: string;
  originalComposers?: string;
  originalPublisher?: string;
  iprsClearanceStatus: 'granted' | 'pending' | 'required';
  directPublisherConsentSigned: boolean;
  clearanceDocumentUrl?: string;
  clearanceNotes?: string;
}

export interface SplitSheetWire {
  project_id: string;
  work_title: string;
  status: string;
  parties: {
    name: string;
    role: string;
    side: 'composition' | 'recording';
    share_pct: number;
    contact: string | null;
    signed: boolean;
    ipi_cae?: string;
  }[];
}

export interface SplitGovernance {
  trackIsrc?: string;
  albumUpc?: string;
  contributors: SplitContributor[];
  totalShare?: number;
  checkpointStatus: CheckpointStatus;
  agreementDocumentUrl?: string;
  ledgerEvents?: LedgerEvent[];
  coverClearance?: CoverClearanceGate;
}

export interface ReleaseChecklistTask {
  id: string;
  category: 'Audio Master' | 'Metadata' | 'Artwork' | 'Splits' | 'Pitching' | 'Marketing';
  title: string;
  description: string;
  completed: boolean;
  requiresArtistApproval: boolean;
  approvalStatus?: CheckpointStatus;
}

export interface RetroFinding {
  what: string;      // Sentence describing what occurred
  evidence: string;  // Measured data backing this finding
}

export interface RetroReport {
  project_id: string;
  period: string;    // e.g. "Days 1–14 Post-Release"
  findings: RetroFinding[];
  actions: string[]; // Recommended actions
  checkpointStatus?: CheckpointStatus;
}

export interface MeasuredAnalytics {
  streams?: number;
  saves?: number;
  skipRatePercent?: number;
  playlistAdds?: number;
  listenerCompletionPercent?: number;
  topRegions?: { name: string; count: number }[];
  dailyStreamsTimeSeries?: number[]; // Only populated if time-series data genuinely exists in CSV
  csvRawData?: string;
  sourceName?: string;
  importedAt?: string;
}

export interface TrackItem {
  id: string;
  title: string;
  artist: string;
  language: Language;
  genre: string;
  durationSeconds: number;
  bpm?: number;
  keySignature?: string;
  coverArtUrl?: string;
  audioUrl?: string;
  updatedAt: string;
  
  // Real Audio Metrics
  audioMetrics?: AudioMetrics;
  
  // Agent Intelligence Outputs
  arAssessment?: ARAssessment;
  lyricAnalysis?: LyricAnalysis;
  splitGovernance?: SplitGovernance;
  releaseTasks: ReleaseChecklistTask[];
  
  // Post-Release Growth & Retro Report
  growthAnalytics?: MeasuredAnalytics;
  retroReport?: RetroReport;

  // Raw Agent Inspection Payloads
  rawAgentPayloads: Record<string, any>;

  // -------------------------------------------------------------------------
  // Real backend data, attached by App.tsx.
  //
  // A TrackItem is now a *view model over a gateway Project* — App builds it in
  // projectToTrack() from listProjects/listArtifacts/getRun. The fields below
  // are the untranslated wire objects, so any component that needs the truth
  // (rather than the legacy presentational shape above) can read them straight
  // off the track without fetching anything itself.
  // -------------------------------------------------------------------------

  /** Gateway project id. Identical to `id` for API-backed tracks. */
  projectId?: string;
  /** The gateway Project row this view model was built from. */
  project?: Project;
  /** Artifacts uploaded to this project (audio bounces, masters, reports...). */
  artifacts?: ArtifactRef[];
  /** Most recent pipeline run for this project, as returned by getRun(). */
  activeRun?: PipelineRun | null;
  /** Output of the qc_analysis stage. `null` until that stage has produced one. */
  qcReport?: QCReport | null;
  /** Output of the anr_score stage. `null` until that stage has produced one. */
  readiness?: ReadinessScore | null;
  /** activeRun.stages keyed by stage name, for convenience. */
  stageOutputs?: Record<string, StageResult>;
}

export type ActiveTab = 'overview' | 'mix_qc' | 'ar_feedback' | 'lyrics' | 'splits' | 'release' | 'growth' | 'marketplace' | 'settings';
