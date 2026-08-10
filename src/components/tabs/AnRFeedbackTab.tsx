import React, { useState } from 'react';
import { Sparkles, Award, CheckCircle2, AlertCircle, Compass, Radio, RefreshCw } from 'lucide-react';
import { TrackItem } from '../../types';
import { HumanCheckpointCard } from '../HumanCheckpointCard';

interface AnRFeedbackTabProps {
  track: TrackItem;
  onUpdateTrack: (updated: TrackItem) => void;
  onInspectRaw: (title: string, payload: any) => void;
}

export const AnRFeedbackTab: React.FC<AnRFeedbackTabProps> = ({
  track,
  onUpdateTrack,
  onInspectRaw
}) => {
  const [loading, setLoading] = useState(false);
  const ar = track.arAssessment;

  const handleRunAiCritique = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/agent/ar-critique', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trackName: track.title,
          artistName: track.artist,
          genre: track.genre,
          language: track.language,
          lyrics: track.lyricAnalysis?.lyricsText,
          audioMetrics: track.audioMetrics,
          artistNotes: ar?.artistNote
        })
      });
      const data = await res.json();

      const updatedTrack: TrackItem = {
        ...track,
        arAssessment: {
          verdict: data.verdict || ar?.verdict || "A&R Critique generated.",
          narrativeSummary: data.narrativeSummary || ar?.narrativeSummary || "",
          strengths: data.strengths || ar?.strengths || [],
          concerns: data.concerns || ar?.concerns || [],
          commercialPotentialScore: data.commercialPotentialScore || ar?.commercialPotentialScore || 85,
          targetAudience: data.targetAudience || ar?.targetAudience || "",
          suggestedPlaylists: data.suggestedPlaylists || ar?.suggestedPlaylists || [],
          recommendedAction: data.recommendedAction || ar?.recommendedAction || "",
          checkpointStatus: 'pending_artist_approval',
          artistNote: ar?.artistNote
        },
        rawAgentPayloads: {
          ...track.rawAgentPayloads,
          arAgent: data
        }
      };
      onUpdateTrack(updatedTrack);
    } catch (err) {
      console.error('Error in AI A&R critique:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleApproveCheckpoint = () => {
    if (!ar) return;
    onUpdateTrack({
      ...track,
      arAssessment: { ...ar, checkpointStatus: 'approved' }
    });
  };

  const handleRejectCheckpoint = () => {
    if (!ar) return;
    onUpdateTrack({
      ...track,
      arAssessment: { ...ar, checkpointStatus: 'rejected' }
    });
  };

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 glass-panel rounded-2xl border border-[#342847]">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-[#ff7a4d]" />
            <h2 className="font-serif text-xl font-bold text-[#f5efe6]">
              A&R Direction & Editorial Critique
            </h2>
          </div>
          <p className="text-xs text-[#a294b8] font-serif mt-1">
            Agent-driven A&R feedback for regional Indian indie artists without record label dilution.
          </p>
        </div>

        <button
          onClick={handleRunAiCritique}
          disabled={loading}
          className="px-4 py-2.5 rounded-xl bg-[#f2542d] hover:bg-[#ff7a4d] text-xs font-semibold text-[#08060d] flex items-center gap-2 transition-all shadow-lg shadow-[#f2542d]/25 self-start md:self-auto"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          <span>{loading ? 'Consulting Gemini A&R Agent...' : 'Re-Run A&R Agent Critique'}</span>
        </button>
      </div>

      {/* Human Approval Checkpoint */}
      {ar && (
        <HumanCheckpointCard
          title="A&R Editorial Strategy Sign-off"
          recommendation={ar.recommendedAction || "Approve editorial pitching draft and master tweak"}
          status={ar.checkpointStatus}
          agentName="GHARANA Senior A&R Agent"
          onApprove={handleApproveCheckpoint}
          onReject={handleRejectCheckpoint}
          onInspectRawPayload={() => onInspectRaw("A&R Agent Raw Payload", track.rawAgentPayloads.arAgent || ar)}
        />
      )}

      {/* Primary Editorial Verdict Card */}
      {ar && (
        <div className="p-8 glass-panel rounded-2xl border border-[#342847] bg-[#0d0a14]/80 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-[#a56bd6]/10 rounded-full blur-3xl pointer-events-none" />

          <span className="text-[10px] font-mono-num uppercase tracking-wider text-[#ffd48a] bg-[#241c33] px-2.5 py-1 rounded-full border border-[#f5b544]/20">
            Official A&R Verdict
          </span>

          <h3 className="font-serif text-2xl md:text-3xl font-bold text-[#f5efe6] mt-3 leading-snug">
            "{ar.verdict}"
          </h3>

          <div className="mt-6 pt-6 border-t border-[#342847]/60 text-sm font-serif text-[#f5efe6]/90 leading-relaxed space-y-4">
            <p>{ar.narrativeSummary}</p>
          </div>
        </div>
      )}

      {/* Grid: Strengths & Concerns vs Target Demographic */}
      {ar && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Strengths & Concerns */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Strengths */}
            <div className="p-6 glass-panel rounded-2xl border border-[#342847]">
              <h4 className="font-serif text-base font-semibold text-[#f5efe6] mb-4 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#43c9a0]" />
                Key Artistic Strengths
              </h4>
              <ul className="space-y-3">
                {ar.strengths.map((str, idx) => (
                  <li key={idx} className="flex items-start gap-3 text-xs font-serif text-[#f5efe6]/90 bg-[#120e1b] p-3 rounded-xl border border-[#241c33]">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#43c9a0] mt-1.5 flex-shrink-0" />
                    <span>{str}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Concerns */}
            <div className="p-6 glass-panel rounded-2xl border border-[#342847]">
              <h4 className="font-serif text-base font-semibold text-[#f5efe6] mb-4 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-[#ff7a4d]" />
                Areas to Polish Before Release
              </h4>
              <ul className="space-y-3">
                {ar.concerns.map((con, idx) => (
                  <li key={idx} className="flex items-start gap-3 text-xs font-serif text-[#f5efe6]/90 bg-[#120e1b] p-3 rounded-xl border border-[#241c33]">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#ff7a4d] mt-1.5 flex-shrink-0" />
                    <span>{con}</span>
                  </li>
                ))}
              </ul>
            </div>

          </div>

          {/* Right Col: Commercial Potential & Playlists */}
          <div className="space-y-6">
            
            {/* Commercial Score Gauge */}
            <div className="p-6 glass-panel rounded-2xl border border-[#342847] text-center">
              <span className="text-[10px] font-mono-num text-[#a294b8] uppercase block">
                Commercial Replay Potential
              </span>

              <div className="my-4 inline-flex items-center justify-center w-28 h-28 rounded-full bg-[#120e1b] border-4 border-[#21a882] shadow-xl shadow-[#21a882]/20">
                <span className="text-3xl font-bold font-mono-num text-[#7fe3c0]">
                  {ar.commercialPotentialScore}
                </span>
                <span className="text-xs font-mono-num text-[#a294b8] text-left ml-0.5">/100</span>
              </div>

              <p className="text-xs font-serif text-[#a294b8]">
                Calculated based on regional hook stickiness, intro retention, and playlist fit.
              </p>
            </div>

            {/* Target Audience & Editorial Playlists */}
            <div className="p-6 glass-panel rounded-2xl border border-[#342847] space-y-4">
              <div>
                <h5 className="text-xs font-mono-num text-[#f5b544] uppercase mb-1 flex items-center gap-1.5">
                  <Compass className="w-3.5 h-3.5" />
                  Target Listener Profile
                </h5>
                <p className="text-xs font-serif text-[#f5efe6]/90 leading-relaxed">
                  {ar.targetAudience}
                </p>
              </div>

              <div className="pt-4 border-t border-[#241c33]">
                <h5 className="text-xs font-mono-num text-[#f5b544] uppercase mb-2 flex items-center gap-1.5">
                  <Radio className="w-3.5 h-3.5" />
                  Target Editorial Playlists
                </h5>
                <div className="flex flex-wrap gap-1.5">
                  {ar.suggestedPlaylists.map((pl, idx) => (
                    <span
                      key={idx}
                      className="px-2.5 py-1 rounded-lg bg-[#191324] border border-[#342847] text-[11px] font-mono-num text-[#f5efe6]"
                    >
                      {pl}
                    </span>
                  ))}
                </div>
              </div>
            </div>

          </div>

        </div>
      )}
    </div>
  );
};
