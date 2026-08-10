import { Language } from '../types';

export interface AgentListing {
  id: string;
  name: string;
  author: string;
  authorBadge: 'GHARANA Vetted Specialist' | 'Verified Studio Specialist' | 'Community Certified';
  category: 'Lyricism & Meter' | 'Arrangement & Beats' | 'Mastering & QC' | 'Sync & Pitching' | 'Orchestration';
  languages: Language[];
  description: string;
  longDescription: string;
  pricingType: 'subscription' | 'per_run' | 'freemium';
  priceDisplay: string; // e.g., "₹799 / mo" or "₹99 / run"
  priceAmountInr: number;
  
  // PROVENANCE LABEL (First-Class Feature)
  provenance: {
    baseModels: string[];          // e.g., ["Gemini 2.5 Flash", "Custom Chandas Fine-Tune"]
    trainingDataPosture: string;   // e.g., "Zero-Retention: No User Audio/Lyrics Retained or Trained"
    dataLicenseType: string;        // e.g., "100% Opt-In Licensed Classical Telugu Corpus"
    complianceAuditDate: string;    // e.g., "2026-06-15 (Audited by GHARANA Legal)"
    privacyGuarantee: string;      // e.g., "Ephemeral Processing Only — Data Purged Post-Run"
  };

  // Outcome-Weighted Metrics
  outcomeMetrics: {
    pipelineCompletionRate: number; // e.g. 98.4%
    postPurchaseRetentionRate: number; // e.g. 94.2%
    listenerSaveRateUplift: string; // e.g. "+28.5%"
    totalInstalls: number;
    rating: number; // e.g. 4.9
  };

  // Sample Outputs for Detail Screen
  sampleOutputs: {
    title: string;
    beforeTextOrMetric: string;
    afterTextOrMetric: string;
    notes: string;
  }[];

  // Watermarked Sandbox Output Template
  sandboxTemplate: {
    analysisSummary: string;
    suggestions: string[];
    watermarkNotice: string;
    sampleMetricDelta: string;
  };
}

export const MOCK_AGENTS: AgentListing[] = [
  {
    id: 'agent-telugu-chandas',
    name: 'Sahitya-LLM Telugu Lyricist & Meter Specialist',
    author: 'Studio Vani & Dr. K. Sastri',
    authorBadge: 'GHARANA Vetted Specialist',
    category: 'Lyricism & Meter',
    languages: ['Telugu'],
    description: 'Specialized in classical Chandas prosody, Matra meter alignment, and contemporary Tollywood cinema songwriting idioms.',
    longDescription: 'Sahitya-LLM is built specifically for Telugu song composition. It parses Telugu script down to Matra syllable weights, flagging rhythmic meter breaks (గణ భంగం) in real-time while suggesting idiomatically authentic Telugu metaphors that preserve vocal singability.',
    pricingType: 'subscription',
    priceDisplay: '₹799 / month',
    priceAmountInr: 799,
    provenance: {
      baseModels: ['Gemini 2.5 Flash', 'Custom Telugu Prose-FineTune v3'],
      trainingDataPosture: 'Zero-Retention: No User Lyrics Retained or Used for Training',
      dataLicenseType: '100% Opt-In Public Domain Classical Telugu Literary Corpus',
      complianceAuditDate: '2026-07-01 (Audited by GHARANA Legal)',
      privacyGuarantee: 'Lyrics are processed strictly in RAM and deleted immediately after meter validation.'
    },
    outcomeMetrics: {
      pipelineCompletionRate: 98.6,
      postPurchaseRetentionRate: 95.1,
      listenerSaveRateUplift: '+31.2% in Telugu Indie Pop',
      totalInstalls: 1840,
      rating: 4.95
    },
    sampleOutputs: [
      {
        title: 'Pallavi Syllable Meter Alignment',
        beforeTextOrMetric: 'నీకై వేచే మనసులో మాటలన్నీ మౌనమయ్యెగా',
        afterTextOrMetric: 'నీకై వేచే హృదిలోన మాటలన్నీ మౌనమయ్యెగా (Gana Weight: 12-12 Balanced Matra)',
        notes: 'Adjusted "మనసులో" to "హృదిలోన" to remove a harsh 3-syllable syncopation break over the acoustic guitar verse lead.'
      }
    ],
    sandboxTemplate: {
      analysisSummary: '[SANDBOX PREVIEW] Scanned active track lyrics for Chandas meter balance. Detected 1 meter irregularity in Chorus line 2.',
      suggestions: [
        'Line 2: Replace "తీరని ఆశలు" with "తీరని కోరికలు" for smooth 4/4 time-signature accentuation.',
        'Rhyme Scheme: AA-BB matra cadence verified across Pallavi section.'
      ],
      watermarkNotice: 'WATERMARKED PREVIEW — GHARANA SANDBOX • UNLICENSED FOR FINAL RELEASE',
      sampleMetricDelta: 'Meter Regularity: 82% → 96% (+14% Singability Uplift)'
    }
  },
  {
    id: 'agent-punjabi-hiphop',
    name: 'Punjabi Hip-Hop & Dhol 808 Knot Resolver',
    author: 'Desi Beat Lab (Amritsar)',
    authorBadge: 'Verified Studio Specialist',
    category: 'Arrangement & Beats',
    languages: ['Punjabi', 'Hindi'],
    description: 'Eliminates sub-bass frequency collisions between heavy Punjabi 808 kicks and live Dhol / Tumbi grooves.',
    longDescription: 'Designed by veteran Punjabi mix engineers, this agent uses targeted sidechain dynamic notch filtering and transient shaping algorithms to ensure 808 sub-bass punch cuts through club sound systems without muddying the live Dhol skin resonance.',
    pricingType: 'per_run',
    priceDisplay: '₹149 / run',
    priceAmountInr: 149,
    provenance: {
      baseModels: ['Gemini 1.5 Pro', 'DSP WaveNet Frequency Analyzer'],
      trainingDataPosture: 'Zero-Retention: Transient Stem Files Purged Upon Session Completion',
      dataLicenseType: 'Proprietary Amritsar Studio Acoustic Stem Library',
      complianceAuditDate: '2026-06-20 (Audited by GHARANA Legal)',
      privacyGuarantee: 'No stem data is stored on remote servers; sidechain profiles applied in ephemeral container.'
    },
    outcomeMetrics: {
      pipelineCompletionRate: 97.8,
      postPurchaseRetentionRate: 92.4,
      listenerSaveRateUplift: '+26.8% in Punjabi Club Playlists',
      totalInstalls: 2150,
      rating: 4.88
    },
    sampleOutputs: [
      {
        title: 'Sub-Bass Frequency Separation',
        beforeTextOrMetric: 'Sub Energy Collision at 55Hz (-3.2dB Mud)',
        afterTextOrMetric: 'Sidechain Dynamic Notch at 52Hz (-6dB Dhol Dip / Crisp 808 Transient)',
        notes: 'Separated 808 fundamental from Dhol Dagga skin impact, resulting in +3.5dB clean headroom.'
      }
    ],
    sandboxTemplate: {
      analysisSummary: '[SANDBOX PREVIEW] Scanned bass stems. Identified 808/Dhol frequency knot at 58Hz.',
      suggestions: [
        'Apply 1.2ms delayed ducking on Dhol low-end when 808 triggers.',
        'Boost Tumbi attack transient at 2.4kHz by +1.5dB for mobile speaker clarity.'
      ],
      watermarkNotice: 'WATERMARKED PREVIEW — GHARANA SANDBOX • SAMPLE RATE LIMITED TO 16-BIT 44.1kHz',
      sampleMetricDelta: 'Dynamic Range: 6.2 LU → 8.4 LU (Zero Mudness)'
    }
  },
  {
    id: 'agent-mastering-qc',
    name: 'True Peak Guard & EBU R128 Master QC Agent',
    author: 'SonicCeiling Audio Labs',
    authorBadge: 'GHARANA Vetted Specialist',
    category: 'Mastering & QC',
    languages: ['Multi-Language'],
    description: 'Guarantees release-ready masters with strictly enforced -1.0 dBTP true peak ceilings and platform LUFS compliance.',
    longDescription: 'Prevents inter-sample clipping on lossy streaming encoders (AAC/Ogg) across Spotify, Apple Music, and YouTube. Performs multi-band limiting validation and automatic meta-tag embedding.',
    pricingType: 'subscription',
    priceDisplay: '₹999 / month',
    priceAmountInr: 999,
    provenance: {
      baseModels: ['Gemini 2.5 Flash', 'EBU R128 Metering Engine'],
      trainingDataPosture: 'Zero-Retention: Audio Buffers Processed in RAM only',
      dataLicenseType: 'AES Industry Standard Metering Compliance Suite',
      complianceAuditDate: '2026-07-10 (Audited by GHARANA Legal)',
      privacyGuarantee: '100% compliant with Apple Digital Masters and Spotify Loudness guidelines.'
    },
    outcomeMetrics: {
      pipelineCompletionRate: 99.4,
      postPurchaseRetentionRate: 97.8,
      listenerSaveRateUplift: 'Zero Rejection Rate across DSP Distributors',
      totalInstalls: 3410,
      rating: 4.98
    },
    sampleOutputs: [
      {
        title: 'Apple Music AAC Inter-Sample Peak Audit',
        beforeTextOrMetric: 'True Peak: -0.4 dBTP (Clipping Risk on AAC)',
        afterTextOrMetric: 'True Peak: -1.2 dBTP (Clean Master / Pass)',
        notes: 'Attenuated inter-sample peaks without sacrificing perceived integrated loudness.'
      }
    ],
    sandboxTemplate: {
      analysisSummary: '[SANDBOX PREVIEW] Scanned master audio file. Measured -13.8 LUFS with -0.8 dBTP True Peak.',
      suggestions: [
        'Ceiling warning: True peak is -0.8 dBTP. Recommended reduction to -1.1 dBTP before DSP delivery.',
        'Stereo correlation is healthy at 0.94 (+1.0 max).'
      ],
      watermarkNotice: 'WATERMARKED PREVIEW — GHARANA SANDBOX • AUDIO OVERLAID WITH PERIODIC QC CHIRP',
      sampleMetricDelta: 'Compliance Rating: 92% → 100% Release Ready'
    }
  },
  {
    id: 'agent-ott-sync-matchmaker',
    name: 'OTT Film & Web Series Sync Licensing Matchmaker',
    author: 'SouthFilm Syncs & Media Legal',
    authorBadge: 'Verified Studio Specialist',
    category: 'Sync & Pitching',
    languages: ['Telugu', 'Tamil', 'Hindi', 'Malayalam', 'Kannada'],
    description: 'Scans track audio, mood, and lyrics to match against active sync briefs for Netflix, Amazon Prime, and Aha series.',
    longDescription: 'Automates sync pitch deck creation, stems cataloging, ISRC/ISWC split sheet verification, and mood auto-tagging according to OTT music supervisor requirements.',
    pricingType: 'subscription',
    priceDisplay: '₹1,299 / month',
    priceAmountInr: 1299,
    provenance: {
      baseModels: ['Gemini 2.5 Flash', 'Music-Vector Semantic Search'],
      trainingDataPosture: 'Zero-Retention: Metadata & Audio Stems Kept Private',
      dataLicenseType: 'Direct Music Supervisor Brief Partnerships (Non-Exclusive)',
      complianceAuditDate: '2026-06-05 (Audited by GHARANA Legal)',
      privacyGuarantee: 'Your track is pitched only to verified media houses with signed NDA agreements.'
    },
    outcomeMetrics: {
      pipelineCompletionRate: 96.2,
      postPurchaseRetentionRate: 89.5,
      listenerSaveRateUplift: '+42% Sync Placement Consideration Rate',
      totalInstalls: 1120,
      rating: 4.82
    },
    sampleOutputs: [
      {
        title: 'Aha Telugu Crime Thriller Sync Brief Match',
        beforeTextOrMetric: 'Unstructured MP3 without Stems or Meta-tags',
        afterTextOrMetric: 'Sync Score: 94/100 • Scene: Dark Night Chase Sequence (Tempo: 128 BPM)',
        notes: 'Generated 1-page sync deck with stems download link and verified split sheets.'
      }
    ],
    sandboxTemplate: {
      analysisSummary: '[SANDBOX PREVIEW] Scanned track mood & tempo. Matched 3 active OTT series sync briefs.',
      suggestions: [
        'Match 1: Netflix South Indie Drama (Montage Scene) — 88% Mood Compatibility',
        'Match 2: Aha Crime Series Trailer — 92% Sonic Intensity Match'
      ],
      watermarkNotice: 'WATERMARKED PREVIEW — GHARANA SANDBOX • PREVIEW PITCH DECK NOT DISTRIBUTABLE',
      sampleMetricDelta: 'Sync Readiness Score: 65/100 → 94/100'
    }
  },
  {
    id: 'agent-tamil-orchestration',
    name: 'Kollywood Brass & String Counter-Melody Orchestrator',
    author: 'Chennai Cyber Soundlabs',
    authorBadge: 'Community Certified',
    category: 'Orchestration',
    languages: ['Tamil', 'Telugu'],
    description: 'Generates dramatic Kollywood-style brass swells, woodwind counter-melodies, and acoustic string arrangements.',
    longDescription: 'Trained on classic and modern Tamil film score harmony progressions. It listens to your vocal melody and automatically composes MIDI counter-melodies for 1st Violins, Celli, and French Horns.',
    pricingType: 'per_run',
    priceDisplay: '₹199 / run',
    priceAmountInr: 199,
    provenance: {
      baseModels: ['Gemini 1.5 Pro', 'MIDI MusicLM Counterpoint Engine'],
      trainingDataPosture: 'Zero-Retention: Generated MIDI files belong 100% to the Artist',
      dataLicenseType: 'Opt-In Classical Carnatic & Western Harmony Training Set',
      complianceAuditDate: '2026-05-18 (Audited by GHARANA Legal)',
      privacyGuarantee: 'Zero copyright encumbrance; all output royalty-free for commercial use.'
    },
    outcomeMetrics: {
      pipelineCompletionRate: 95.9,
      postPurchaseRetentionRate: 91.2,
      listenerSaveRateUplift: '+34.0% Production Quality Rating',
      totalInstalls: 890,
      rating: 4.79
    },
    sampleOutputs: [
      {
        title: 'Interlude Violin & Horn Layering',
        beforeTextOrMetric: 'Single Synth Pad Background',
        afterTextOrMetric: '4-Part Orchestral Stems (Violin I, Cello, Horns, Flute Counter-lead)',
        notes: 'Wrote counterpoint melody in Mayamalavagowla ragam scale for interlude 2.'
      }
    ],
    sandboxTemplate: {
      analysisSummary: '[SANDBOX PREVIEW] Analyzed vocal harmony progression. Composed 8-bar string section preview.',
      suggestions: [
        'Add Violin I ascending line in Bar 12 to build bridge momentum.',
        'Use French Horn swell at 01:42 to accentuate emotional chorus payoff.'
      ],
      watermarkNotice: 'WATERMARKED PREVIEW — GHARANA SANDBOX • MIDI OUTPUT WATERMARKED WITH ACCIDENTAL PITCH SHIFTS',
      sampleMetricDelta: 'Arrangement Depth: Simple → Full Cinematic Score'
    }
  }
];
