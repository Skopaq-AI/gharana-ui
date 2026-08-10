import { TrackItem } from '../types';

export const INITIAL_TRACKS: TrackItem[] = [
  {
    id: 'trk-001',
    title: 'Kalyani Nights (కల్యాణి నైట్స్)',
    artist: 'Arya Sharma feat. Swetha S.',
    language: 'Telugu',
    genre: 'Indie Fusion / Neo-Raga Pop',
    durationSeconds: 218,
    bpm: 104,
    keySignature: 'E Major / Raga Kalyani',
    coverArtUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=600&q=80',
    updatedAt: '2026-08-09T01:14:00Z',
    
    // Real Measured Audio Metrics
    audioMetrics: {
      integratedLufs: -13.8,
      truePeakDbtp: -0.8,
      dynamicRangeLu: 7.9,
      stereoWidth: 1.12,
      sampleRateHz: 48000,
      bitDepth: 24,
      frequencyBins: {
        subBass: -18.2,
        bass: -12.4,
        lowMid: -9.8,
        mid: -11.5,
        highMid: -14.1,
        highs: -19.6
      },
      lufsOverTime: [
        -22.1, -18.4, -15.2, -13.8, -13.5, -13.1, -14.0, -13.7, 
        -12.9, -13.4, -14.2, -13.9, -13.6, -15.0, -18.2, -13.8
      ]
    },

    // A&R Agent Output
    arAssessment: {
      verdict: "A sublime fusion of Classical Kalyani phrasing and late-night bedroom synth textures with high replay potential.",
      narrativeSummary: "Kalyani Nights seamlessly bridges traditional Telugu vocal gamakas with modern atmospheric production. The chorus hook possesses immediate melodic stickiness, making it ideally suited for South Indian indie playlists and viral audio short clips. The low-mid energy around 200Hz requires a surgical 1.5dB dip to let Swetha's vocal breathe.",
      strengths: [
        "Strong melodic hook leveraging Classical Kalyani scale notes (Tr तीव्र म)",
        "Unmanufactured, intimate vocal production recorded in a home booth",
        "Rhythmic displacement in pre-chorus creates compelling tension"
      ],
      concerns: [
        "Low-mid frequency clutter between 180Hz-240Hz masks vocal intimacy",
        "Outro synth fade begins 8 seconds too early before the final sitar motif resolves"
      ],
      commercialPotentialScore: 88,
      targetAudience: "Indie South listeners aged 18-30 across Hyderabad, Visakhapatnam, Bengaluru, and the US Telugu diaspora.",
      suggestedPlaylists: ["Radar South", "Indie Telugu", "Night Raga Chill", "Desi Bedroom Pop"],
      recommendedAction: "Apply 1.5dB attenuation at 200Hz on master track and approve Spotify editorial pitch draft.",
      checkpointStatus: 'pending_artist_approval',
      artistNote: "Recorded vocals on my Shure SM7B in my apartment bedroom at 1am."
    },

    // Lyric Agent Output
    lyricAnalysis: {
      language: 'Telugu',
      primaryTheme: 'Late-night longing, city lights, classical heritage in modern spaces',
      rhymeScheme: 'AABB with internal assonance',
      meterRegularityScore: 92,
      copyrightRiskFlag: false,
      culturalResonanceNotes: "References the night raga Kalyani (evening/night raga evoking love and devotion) paired with urban Visakhapatnam coastal imagery.",
      lyricsText: `రాత్రి కాలంలో కల్యాణి పాడనా? (In the night hour, shall I sing Kalyani?)
నీడలాగా నీవెంటే నేను సాగనా? (Shall I walk behind you like a shadow?)
సిటీ లైట్లు ఆరిపోవు, నా మనసు ఊరుకోదు (City lights don't fade, my heart won't rest)
కలల లోతుల్లో నీ పేరే నిండిపోదు... (In the depths of dreams, your name overflows...)`,
      checkpointStatus: 'approved'
    },

    // Rights & Splits Governance
    splitGovernance: {
      trackIsrc: 'IN-GH1-26-00104',
      albumUpc: '8901234567891',
      totalShare: 100,
      checkpointStatus: 'pending_artist_approval',
      contributors: [
        // COMPOSITION SIDE (Publishing: Writers & Publishers = 100%)
        {
          id: 'c1-comp',
          name: 'Arya Sharma',
          role: 'Composer & Primary Lyricist',
          side: 'composition',
          sharePercentage: 60,
          ipiCaeNumber: 'IPI-008923411',
          email: 'arya.sharma@gmail.com',
          contact: '+91 98490 11234',
          signed: true,
          signatureStatus: 'Signed'
        },
        {
          id: 'c2-comp',
          name: 'Swetha S.',
          role: 'Co-Songwriter & Topline',
          side: 'composition',
          sharePercentage: 40,
          ipiCaeNumber: 'IPI-009112480',
          email: 'swetha.music@gmail.com',
          contact: 'swetha.mgmt@gmail.com',
          signed: true,
          signatureStatus: 'Signed'
        },
        // SOUND RECORDING SIDE (Master: Performers & Label = 100%)
        {
          id: 'c1-rec',
          name: 'Arya Sharma',
          role: 'Primary Performer & Master Owner',
          side: 'recording',
          sharePercentage: 50,
          ipiCaeNumber: 'IPI-008923411',
          email: 'arya.sharma@gmail.com',
          contact: '+91 98490 11234',
          signed: true,
          signatureStatus: 'Signed'
        },
        {
          id: 'c3-rec',
          name: 'Karthik V. (K-Beats)',
          role: 'Recording Producer',
          side: 'recording',
          sharePercentage: 30,
          ipiCaeNumber: 'IPI-007748192',
          email: 'karthik.producer@yahoo.in',
          contact: '+91 91234 56789',
          signed: false,
          signatureStatus: 'Pending'
        },
        {
          id: 'c2-rec',
          name: 'Swetha S.',
          role: 'Featured Vocalist',
          side: 'recording',
          sharePercentage: 20,
          ipiCaeNumber: 'IPI-009112480',
          email: 'swetha.music@gmail.com',
          contact: 'swetha.mgmt@gmail.com',
          signed: true,
          signatureStatus: 'Signed'
        }
      ],
      ledgerEvents: [
        {
          id: 'ledg-001',
          project_id: 'trk-001',
          event_type: 'split_declared',
          payload: { declared_by: 'Arya Sharma', composition_count: 2, recording_count: 3 },
          prev_hash: '0000000000000000000000000000000000000000000000000000000000000000',
          hash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
          created_at: '2026-08-01T14:22:10Z'
        },
        {
          id: 'ledg-002',
          project_id: 'trk-001',
          event_type: 'agreement_sent',
          payload: { recipients: ['swetha.music@gmail.com', 'karthik.producer@yahoo.in'] },
          prev_hash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
          hash: '8f3c2b1a9e42017d3a8120c4391e00f91a52c8b74e6f3102d9921470ac1102e3',
          created_at: '2026-08-01T15:05:00Z'
        },
        {
          id: 'ledg-003',
          project_id: 'trk-001',
          event_type: 'signed',
          payload: { party: 'Swetha S.', side: 'both', status: 'Signed' },
          prev_hash: '8f3c2b1a9e42017d3a8120c4391e00f91a52c8b74e6f3102d9921470ac1102e3',
          hash: '417a829e01fbc21034c520a8117d3e91124809e3a7a9228810bc182f481023a1',
          created_at: '2026-08-01T18:40:22Z'
        },
        {
          id: 'ledg-004',
          project_id: 'trk-001',
          event_type: 'registered',
          payload: { isrc: 'IN-GH1-26-00104', upc: '8901234567891', registry: 'PPL India / IPRS Pending' },
          prev_hash: '417a829e01fbc21034c520a8117d3e91124809e3a7a9228810bc182f481023a1',
          hash: 'd8a43f8e12b07914e59021a88f72381e0129a3e2101918342f1a92140a83e089',
          created_at: '2026-08-02T09:12:00Z'
        }
      ],
      coverClearance: {
        isCoverRelease: false,
        originalWorkTitle: 'Kalyani Raga Classical Composition',
        originalComposers: 'Traditional / Public Domain Motif',
        originalPublisher: 'Self-Published / Direct Clearance',
        iprsClearanceStatus: 'granted',
        directPublisherConsentSigned: true,
        clearanceNotes: 'Original work with classical Carnatic fusion motif. No third-party publisher mechanical clearance needed unless cover mode enabled.'
      }
    },

    // Release Checklist Tasks
    releaseTasks: [
      {
        id: 't1',
        category: 'Audio Master',
        title: 'Master WAV File Verification',
        description: '24-bit / 48kHz WAV uploaded with True Peak ceiling <= -1.0 dBTP',
        completed: true,
        requiresArtistApproval: false,
        approvalStatus: 'approved'
      },
      {
        id: 't2',
        category: 'Metadata',
        title: 'ISRC & Explicit Tag Check',
        description: 'ISRC code IN-GH1-26-00104 registered with PPL India',
        completed: true,
        requiresArtistApproval: false,
        approvalStatus: 'approved'
      },
      {
        id: 't3',
        category: 'Artwork',
        title: '3000x3000px Cover Art Compliance',
        description: 'RGB color space, no social handles or promotional logos on image',
        completed: true,
        requiresArtistApproval: false,
        approvalStatus: 'approved'
      },
      {
        id: 't4',
        category: 'Pitching',
        title: 'Spotify Editorial Pitch Submission Draft',
        description: 'Pitch text generated by A&R Agent highlighting Raga Kalyani blend',
        completed: false,
        requiresArtistApproval: true,
        approvalStatus: 'pending_artist_approval'
      },
      {
        id: 't5',
        category: 'Marketing',
        title: 'Instagram Reels 15-sec Hook Export',
        description: 'Optimized -11 LUFS loud edit for short video reels',
        completed: false,
        requiresArtistApproval: true,
        approvalStatus: 'pending_artist_approval'
      }
    ],

    // Post-Release Growth Analytics & Retro Report
    growthAnalytics: {
      streams: 142850,
      saves: 18420,
      skipRatePercent: 18.4,
      playlistAdds: 412,
      listenerCompletionPercent: 78.2,
      sourceName: "Spotify for Artists CSV (Export 2026-08-01)",
      importedAt: "2026-08-02T10:15:00Z",
      dailyStreamsTimeSeries: [
        4200, 6800, 9100, 11400, 10800, 12500, 14100,
        13800, 11200, 10500, 9800, 10400, 12100, 15150
      ],
      topRegions: [
        { name: "Hyderabad, IN", count: 48200 },
        { name: "Visakhapatnam, IN", count: 29400 },
        { name: "Bengaluru, IN", count: 21100 },
        { name: "Dallas / Austin, US", count: 18500 },
        { name: "San Jose / SF, US", count: 12200 }
      ],
      csvRawData: `metric,value,unit,source,period
streams,142850,count,Spotify for Artists,Days 1-14
saves,18420,count,Spotify for Artists,Days 1-14
skip_rate,18.4,percent,Spotify for Artists,Days 1-14
playlist_adds,412,count,Spotify Editorial & User,Days 1-14
completion_rate,78.2,percent,Spotify for Artists,Days 1-14`
    },

    retroReport: {
      project_id: "trk-001",
      period: "Days 1–14 Post-Release",
      checkpointStatus: 'pending_artist_approval',
      findings: [
        {
          what: "High save-to-stream conversion indicates exceptionally strong listener affinity in South Indian urban centers and North American Telugu diaspora clusters.",
          evidence: "18,420 saves across 142,850 total streams yields a 12.9% save rate, exceeding the 8.0% benchmark for independent regional releases."
        },
        {
          what: "Audience retention holds steady through the 15-second vocal entrance without early skip fatigue.",
          evidence: "Measured skip rate of 18.4% remains well below the standard 32.0% skip benchmark for algorithmic radio placements."
        },
        {
          what: "Independent listener playlisting drove 64% of total first-week stream velocity prior to editorial pickup.",
          evidence: "412 listener playlist additions generated 91,400 streams, outperforming direct profile search by 3x."
        }
      ],
      actions: [
        "Prepare an acoustic/stripped version focusing on the Kalyani vocal gamaka for Day 30 re-pitching to night relaxation playlists.",
        "Direct paid social ad spend exclusively to Hyderabad and Visakhapatnam urban regions where skip rate remains lowest (14.2%).",
        "Export the 15-second pre-chorus stems as an official Instagram Reels audio template before velocity crests."
      ]
    },

    rawAgentPayloads: {
      arAgent: {
        model: "gemini-2.5-flash",
        prompt: "Analyze Kalyani Nights for editorial & commercial resonance",
        confidence: 0.94,
        executionMs: 840,
        rawOutput: {
          verdict: "A sublime fusion of Classical Kalyani phrasing and late-night bedroom synth textures.",
          score: 88,
          keyInsights: ["Kalyani scale hook", "200Hz low-mid build-up", "Reels clip candidate"]
        }
      },
      mixQcAgent: {
        model: "GHARANA_AUDIO_DSP_ENGINE_v2",
        metrics: { integratedLufs: -13.8, truePeakDbtp: -0.8, stereoWidth: 1.12 },
        recommendation: "Engage True Peak limiter ceiling at -1.0 dBTP"
      }
    }
  },
  {
    id: 'trk-002',
    title: 'Raat Ki Dhoon (रात की धून)',
    artist: 'Kabir & The Midnight Jam',
    language: 'Hindi',
    genre: 'Lo-Fi Neo-Soul',
    durationSeconds: 195,
    bpm: 82,
    keySignature: 'F Minor / Raga Malkauns',
    coverArtUrl: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=600&q=80',
    updatedAt: '2026-08-08T22:30:00Z',

    audioMetrics: {
      integratedLufs: -15.2,
      truePeakDbtp: -1.4,
      dynamicRangeLu: 10.1,
      stereoWidth: 0.98,
      sampleRateHz: 44100,
      bitDepth: 24,
      frequencyBins: {
        subBass: -22.1,
        bass: -14.3,
        lowMid: -11.0,
        mid: -12.8,
        highMid: -16.5,
        highs: -22.0
      },
      lufsOverTime: [
        -24.0, -21.2, -18.0, -15.5, -15.2, -15.1, -15.4, -15.0,
        -14.8, -15.3, -15.6, -16.1, -17.5, -19.0, -22.4, -15.2
      ]
    },

    arAssessment: {
      verdict: "Intimately crafted Hindi lo-fi soul track with deep late-night warmth and poetic lyricism.",
      narrativeSummary: "Raat Ki Dhoon captures the quiet solitude of a 2am studio session in Delhi. The Fender Rhodes keys and muted trumpet give a nostalgic vintage atmosphere, while Kabir's understated vocal delivery keeps the emotion grounded. The track is currently at -15.2 LUFS, making it slightly quiet for standard streaming; a subtle 1.2dB gain lift will bring it to the sweet spot.",
      strengths: [
        "Rich harmonic movement influenced by Raga Malkauns pentatonic scales",
        "Dynamic range preserves genuine instrumental breath and acoustic warmth",
        "Poetic Hindi lyrics with evocative night imagery"
      ],
      concerns: [
        "Overall level is slightly conservative (-15.2 LUFS vs -14.0 target)",
        "Trumpet solo around 02:15 has a slight harsh peak at 3.2kHz"
      ],
      commercialPotentialScore: 82,
      targetAudience: "Lo-Fi Beats & Hindi Indie acoustic lovers across Delhi NCR, Mumbai, Pune, and Toronto diaspora.",
      suggestedPlaylists: ["Hindi Indie Oasis", "Chai & Lo-Fi", "Late Night India", "Acoustic Desi"],
      recommendedAction: "Apply +1.2dB master gain boost with a notch filter at 3.2kHz on the trumpet solo.",
      checkpointStatus: 'pending_artist_approval',
      artistNote: "Recorded keys on an old Nord Electro and tracked vocals straight into Ableton."
    },

    lyricAnalysis: {
      language: 'Hindi',
      primaryTheme: 'Quiet reflection in the midnight metropolis',
      rhymeScheme: 'AABB',
      meterRegularityScore: 88,
      copyrightRiskFlag: false,
      culturalResonanceNotes: "Uses classical Hindi poetic expressions like 'धून' (melody) and 'शब' (night) reflecting Hindustani ghazal traditions in a modern lo-fi context.",
      lyricsText: `ये रात की धून कह रही है कुछ नया, (This night melody is whispering something new)
खामोश गलियों में कोई खो गया। (In quiet alleys, someone got lost)
चाय की भाप में छुपी है पुरानी बातें, (In the tea steam lie hidden old memories)
तारों के साये में गुज़रती हैं रातें... (Under the shadow of stars pass the nights...)`,
      checkpointStatus: 'approved'
    },

    splitGovernance: {
      trackIsrc: 'IN-GH1-26-00105',
      albumUpc: '8901234567892',
      totalShare: 100,
      checkpointStatus: 'approved',
      contributors: [
        {
          id: 'c10-comp',
          name: 'Kabir Verma',
          role: 'Primary Lyricist & Composer',
          side: 'composition',
          sharePercentage: 100,
          ipiCaeNumber: 'IPI-001223901',
          email: 'kabir.music@gmail.com',
          signed: true,
          signatureStatus: 'Signed'
        },
        {
          id: 'c10-rec',
          name: 'Kabir Verma',
          role: 'Primary Vocalist',
          side: 'recording',
          sharePercentage: 60,
          ipiCaeNumber: 'IPI-001223901',
          email: 'kabir.music@gmail.com',
          signed: true,
          signatureStatus: 'Signed'
        },
        {
          id: 'c11-rec',
          name: 'Rohan Mehra',
          role: 'Producer & Mixing',
          side: 'recording',
          sharePercentage: 40,
          ipiCaeNumber: 'IPI-004459102',
          email: 'rohan.beats@gmail.com',
          signed: true,
          signatureStatus: 'Signed'
        }
      ]
    },

    releaseTasks: [
      {
        id: 't20',
        category: 'Audio Master',
        title: 'Loudness Target Check',
        description: 'Currently -15.2 LUFS. Gain adjustment pending approval.',
        completed: false,
        requiresArtistApproval: true,
        approvalStatus: 'pending_artist_approval'
      },
      {
        id: 't21',
        category: 'Artwork',
        title: 'Cover Art Uploaded',
        description: 'Midnight chai cup visual checked for platform specs',
        completed: true,
        requiresArtistApproval: false,
        approvalStatus: 'approved'
      }
    ],

    rawAgentPayloads: {
      arAgent: {
        model: "gemini-2.5-flash",
        prompt: "Evaluate Raat Ki Dhoon Hindi lo-fi track",
        confidence: 0.91,
        executionMs: 720
      }
    }
  },
  {
    id: 'trk-003',
    title: 'Madras Beat 04 (மெட்ராஸ் பீட் 04)',
    artist: 'Anirudh K. & Chennai Underground',
    language: 'Tamil',
    genre: 'Tamil Folk Electronic / Gaana Bass',
    durationSeconds: 180,
    bpm: 128,
    keySignature: 'G Minor',
    coverArtUrl: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?auto=format&fit=crop&w=600&q=80',
    updatedAt: '2026-08-07T18:45:00Z',

    // Note: Audio metrics not fully measured yet to demonstrate honesty rule
    audioMetrics: undefined,

    arAssessment: {
      verdict: "High-octane Tamil folk beat with heavy sub-bass and energetic udukkai percussion.",
      narrativeSummary: "Madras Beat 04 delivers immediate club and festival energy, combining traditional Tamil percussion with modern UK bass architecture. The track is currently awaiting audio mix analysis upload.",
      strengths: [
        "Infectious 128 BPM pulse with authentic folk percussion grooves",
        "Sub-bass energy tailored for heavy club sound systems"
      ],
      concerns: [
        "Audio master has not been run through final DSP measurement engine yet"
      ],
      commercialPotentialScore: 86,
      targetAudience: "Tamil Electronic, Gaana Club, and South Asian DJ culture worldwide.",
      suggestedPlaylists: ["Chennai Club Nights", "Tamil EDM", "South Bass Heavy", "Gaana Reloaded"],
      recommendedAction: "Upload final mix WAV to trigger full DSP measurements and LUFS analysis.",
      checkpointStatus: 'pending_artist_approval',
      artistNote: "Arranged in FL Studio 21 using custom recorded parai percussion samples."
    },

    lyricAnalysis: {
      language: 'Tamil',
      primaryTheme: 'Street energy, rhythm of Chennai, dance hall celebration',
      rhymeScheme: 'Rhythmic Gaana meter',
      meterRegularityScore: 95,
      copyrightRiskFlag: false,
      culturalResonanceNotes: "Celebrates Chennai street folk culture and Gaana dance rhythms.",
      lyricsText: `சென்னை பட்டணம் விடிஞ்சாச்சு (Chennai city has awakened)
தப்பாட்ட சத்தம் கேட்டாச்சு (The sound of thappattu is heard)
அடி தாளம் போடு மச்சானே... (Hit the rhythm, my brother...)`,
      checkpointStatus: 'approved'
    },

    splitGovernance: {
      trackIsrc: undefined, // Demonstrates missing ISRC
      albumUpc: undefined,
      totalShare: 100,
      checkpointStatus: 'pending_artist_approval',
      contributors: [
        {
          id: 'c30-comp',
          name: 'Anirudh K.',
          role: 'Composer & Lyricist',
          side: 'composition',
          sharePercentage: 100,
          email: 'anirudh.chennai@gmail.com',
          signed: true,
          signatureStatus: 'Signed'
        },
        {
          id: 'c30-rec',
          name: 'Anirudh K.',
          role: 'Primary Vocalist',
          side: 'recording',
          sharePercentage: 70,
          email: 'anirudh.chennai@gmail.com',
          signed: true,
          signatureStatus: 'Signed'
        },
        {
          id: 'c31-rec',
          name: 'Chennai Underground Crew',
          role: 'Sound Recording Producer',
          side: 'recording',
          sharePercentage: 30,
          email: 'crew@chennaiunderground.in',
          signed: false,
          signatureStatus: 'Pending'
        }
      ]
    },

    releaseTasks: [
      {
        id: 't30',
        category: 'Audio Master',
        title: 'Run Mix QC DSP Analysis',
        description: 'Upload audio file to calculate LUFS, Peak dBTP, and Frequency Bins',
        completed: false,
        requiresArtistApproval: true,
        approvalStatus: 'pending_artist_approval'
      }
    ],

    rawAgentPayloads: {
      initialCheck: {
        agent: "GHARANA_INGEST_v1",
        status: "AWAITING_AUDIO_ANALYSIS"
      }
    }
  }
];
