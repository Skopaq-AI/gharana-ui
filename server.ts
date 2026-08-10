import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '10mb' }));

// Lazy Gemini AI initialization helper
function getGenAIClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn('GEMINI_API_KEY environment variable is not set. AI agent calls will run in fallback simulation mode.');
    return null;
  }
  return new GoogleGenAI({ apiKey });
}

// Health endpoint
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'GHARANA Agent Console',
    geminiConfigured: !!process.env.GEMINI_API_KEY,
    timestamp: new Date().toISOString()
  });
});

// A&R Critique Agent Endpoint
app.post('/api/agent/ar-critique', async (req, res) => {
  try {
    const { trackName, artistName, genre, language, lyrics, audioMetrics, artistNotes } = req.body;
    const ai = getGenAIClient();

    if (!ai) {
      // Fallback structured response if key is missing
      return res.json({
        verdict: "Strong regional hook with ambient atmospheric depth. The chorus transition has high replay value on Instagram Reels.",
        narrativeSummary: `${trackName} bridges traditional ${language || 'regional'} melodic phrasing with contemporary bedroom production. The primary hook holds emotional resonance, but the low-end mud around 180Hz masks vocal clarity during the second verse.`,
        strengths: [
          "Authentic, unmanufactured vocal delivery with emotional gravitas",
          "Distinctive synth-sitar texture creates immediate atmospheric identity",
          "Dynamic arrangement keeps momentum without feeling rushed"
        ],
        concerns: [
          "Low-mid frequency build-up between 160Hz-240Hz",
          "Syllabic density in verse 2 slightly crowds the rhythm pocket",
          "Outro fades prematurely without delivering the final instrumental payoff"
        ],
        commercialPotentialScore: 84,
        targetAudience: "Indie-pop & neo-folk listeners (age 18-32) in Hyderabad, Bangalore, Mumbai, and NRI diaspora",
        suggestedPlaylists: ["Radar India", "Indie South", "Desi Chill", "Late Night Bedroom Studio"],
        recommendedAction: "Requires 1 human approval checkpoint: Trim 1.5dB at 200Hz on master buss before submission to Spotify editorial pitch.",
        rawPayload: {
          agent: "GHARANA_A_AND_R_v2.4",
          prompt_tokens: 382,
          model: "fallback-rule-engine",
          timestamp: new Date().toISOString(),
          input_params: { trackName, artistName, genre, language, audioMetrics }
        }
      });
    }

    const prompt = `You are GHARANA's lead A&R AI agent for independent Indian artists (Telugu, Tamil, Hindi, Punjabi, etc.).
Analyze this track submission:
Track Title: "${trackName}"
Artist: "${artistName}"
Genre/Style: "${genre || 'Indie'}"
Language: "${language || 'Telugu/Hindi/Tamil'}"
Artist Notes: "${artistNotes || 'N/A'}"
Lyrics excerpt: "${lyrics ? lyrics.slice(0, 500) : 'Instrumental/Not provided'}"
Measured Audio Metrics: ${JSON.stringify(audioMetrics || {})}

Respond in strict JSON format with the following keys:
{
  "verdict": "Single sentence editorial verdict in a warm, respectful, poetic yet precise tone.",
  "narrativeSummary": "Two to three paragraph detailed editorial critique focusing on production, vocal pocket, and emotional resonance.",
  "strengths": ["Strength 1", "Strength 2", "Strength 3"],
  "concerns": ["Concern 1", "Concern 2"],
  "commercialPotentialScore": number (0-100),
  "targetAudience": "Description of regional & diaspora listener demographic",
  "suggestedPlaylists": ["Playlist 1", "Playlist 2", "Playlist 3"],
  "recommendedAction": "Actionable recommendation with human approval checkpoint."
}`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        temperature: 0.7,
      }
    });

    const text = response.text || '{}';
    const parsed = JSON.parse(text);

    return res.json({
      ...parsed,
      rawPayload: {
        agent: "GHARANA_A_AND_R_GEMINI_2.5",
        model: "gemini-2.5-flash",
        timestamp: new Date().toISOString(),
        prompt_used: prompt,
        raw_response: parsed
      }
    });

  } catch (err: any) {
    console.error('Error in /api/agent/ar-critique:', err);
    res.status(500).json({
      error: 'Failed to process A&R critique',
      message: err.message
    });
  }
});

// Mix & Mastering QC Agent Endpoint
app.post('/api/agent/mix-qc', async (req, res) => {
  try {
    const { integratedLufs, truePeakDbtp, dynamicRangeLu, stereoWidth, frequencyProfile } = req.body;
    const ai = getGenAIClient();

    // Perform exact engineering checks
    const targetPlatformChecks = [
      { platform: "Spotify", targetLufs: -14.0, maxPeak: -1.0, status: integratedLufs <= -13.0 && integratedLufs >= -15.5 && truePeakDbtp <= -1.0 ? "OPTIMAL" : "WARNING" },
      { platform: "Apple Music", targetLufs: -16.0, maxPeak: -1.0, status: integratedLufs <= -15.0 && truePeakDbtp <= -1.0 ? "OPTIMAL" : "WILL_ATTENUATE" },
      { platform: "YouTube Music", targetLufs: -13.0, maxPeak: -1.0, status: truePeakDbtp <= -1.0 ? "OPTIMAL" : "PEAK_WARNING" },
      { platform: "Instagram / Reels", targetLufs: -11.0, maxPeak: -0.5, status: integratedLufs >= -12.5 ? "OPTIMAL" : "QUIET_FOR_REELS" }
    ];

    if (!ai) {
      return res.json({
        summary: `Measured integrated loudness is ${integratedLufs} LUFS with a True Peak of ${truePeakDbtp} dBTP. Dynamic range measures ${dynamicRangeLu} LU.`,
        platformReadiness: targetPlatformChecks,
        issuesDetected: [
          truePeakDbtp > -1.0 ? "True Peak exceeds -1.0 dBTP limit — risk of lossy codec clipping on AAC/MP3 transcoding." : null,
          integratedLufs > -12.0 ? "Integrated loudness is loud (-${Math.abs(integratedLufs)} LUFS). Streaming services will apply loudness normalization attenuation." : null,
          stereoWidth > 1.2 ? "Excessive stereo correlation phase dispersion below 120Hz. Mono compatibility might suffer on phone speakers." : null
        ].filter(Boolean),
        masteringAdvice: "Engage True Peak limiter ceiling at -1.0 dBTP. High-pass side channel at 100Hz to preserve mono bass punch.",
        rawPayload: {
          agent: "GHARANA_MIX_QC_ENGINE_v1.8",
          measuredValues: { integratedLufs, truePeakDbtp, dynamicRangeLu, stereoWidth, frequencyProfile },
          timestamp: new Date().toISOString()
        }
      });
    }

    const prompt = `You are GHARANA's Mix QC AI Mastering Engineer.
Given these REAL audio measurements:
Integrated Loudness: ${integratedLufs} LUFS
True Peak: ${truePeakDbtp} dBTP
Dynamic Range: ${dynamicRangeLu} LU
Stereo Correlation Width: ${stereoWidth}
Frequency Energy Profile: ${JSON.stringify(frequencyProfile || {})}

Analyze the measurements for master delivery readiness across Spotify, Apple Music, YouTube, and Instagram Reels.
Respond in strict JSON:
{
  "summary": "Technical summary sentence using Fraunces serif tone.",
  "platformReadiness": Array of platform status objects,
  "issuesDetected": ["Issue 1", "Issue 2"],
  "masteringAdvice": "Specific EQ / limiter tweak instructions for the artist.",
  "humanCheckpointNeeded": boolean,
  "checkpointReason": "Why the artist needs to inspect before exporting final WAV"
}`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        temperature: 0.3,
      }
    });

    const parsed = JSON.parse(response.text || '{}');
    return res.json({
      ...parsed,
      rawPayload: {
        agent: "GHARANA_MIX_QC_GEMINI",
        model: "gemini-2.5-flash",
        timestamp: new Date().toISOString(),
        rawResponse: parsed
      }
    });

  } catch (err: any) {
    console.error('Error in /api/agent/mix-qc:', err);
    res.status(500).json({ error: 'Mix QC failed', message: err.message });
  }
});

// Vite Middleware for development & static server for production
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`GHARANA Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
