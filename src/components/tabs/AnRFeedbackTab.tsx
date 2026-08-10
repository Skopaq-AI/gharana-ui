import React, { useState } from 'react';
import { Sparkles, Award, CheckCircle2, AlertCircle, Compass, Radio, RefreshCw } from 'lucide-react';
import { TrackItem } from '../../types';
import { HumanCheckpointCard } from '../HumanCheckpointCard';
import { PageHeader, SectionCard, SectionHeader } from '../SectionPanel';

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
      {/* Standardized Page Header */}
      <PageHeader
        icon={Sparkles}
        title="A&R Direction & Editorial Critique"
        description="Agent-driven A&R feedback for regional Indian indie artists without record label dilution."
        badge="Gemini A&R Engine"
        action={
          <button
            onClick={handleRunAiCritique}
            disabled={loading}
            className="px-4 py-2.5 rounded-xl bg-[#f2542d] hover:bg-[#ff7a4d] text-white font-mono text-xs font-bold transition-all shadow-md flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>{loading ? 'Consulting Gemini A&R Agent...' : 'Re-Run A&R Critique'}</span>
          </button>
        }
      />

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
        <div className="p-6 rounded-2xl bg-[#120e1b] border border-[#241c33] shadow-md space-y-4 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase tracking-wider text-[#ffd48a] bg-[#191324] px-3 py-1 rounded-full border border-[#ffd48a]/20 font-bold">
              Official A&R Verdict
            </span>
          </div>

          <h3 className="font-serif text-xl md:text-2xl font-bold text-[#f5efe6] leading-snug">
            "{ar.verdict}"
          </h3>

          <div className="pt-4 border-t border-[#241c33] font-sans text-xs text-[#a294b8] leading-relaxed">
            <p>{ar.narrativeSummary}</p>
          </div>
        </div>
      )}

      {/* Grid: Strengths & Concerns vs Target Demographic */}
      {ar && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Strengths & Concerns */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Strengths Card */}
            <div className="p-6 rounded-2xl bg-[#120e1b] border border-[#241c33] shadow-md space-y-4">
              <div className="flex items-center gap-2.5 pb-3 border-b border-[#241c33]">
                <div className="p-2 rounded-xl bg-[#43c9a0]/10 border border-[#43c9a0]/20 text-[#43c9a0]">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <h4 className="font-serif text-base font-bold text-[#f5efe6]">
                  Key Artistic Strengths
                </h4>
              </div>

              <ul className="space-y-2.5">
                {ar.strengths.map((str, idx) => (
                  <li key={idx} className="flex items-start gap-3 text-xs font-sans text-[#f5efe6] bg-[#08060d] p-3 rounded-xl border border-[#241c33]">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#43c9a0] mt-1.5 flex-shrink-0" />
                    <span>{str}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Concerns Card */}
            <div className="p-6 rounded-2xl bg-[#120e1b] border border-[#241c33] shadow-md space-y-4">
              <div className="flex items-center gap-2.5 pb-3 border-b border-[#241c33]">
                <div className="p-2 rounded-xl bg-[#f2542d]/10 border border-[#f2542d]/20 text-[#f2542d]">
                  <AlertCircle className="w-4 h-4" />
                </div>
                <h4 className="font-serif text-base font-bold text-[#f5efe6]">
                  Areas to Polish Before Release
                </h4>
              </div>

              <ul className="space-y-2.5">
                {ar.concerns.map((con, idx) => (
                  <li key={idx} className="flex items-start gap-3 text-xs font-sans text-[#f5efe6] bg-[#08060d] p-3 rounded-xl border border-[#241c33]">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#f2542d] mt-1.5 flex-shrink-0" />
                    <span>{con}</span>
                  </li>
                ))}
              </ul>
            </div>

          </div>

          {/* Right Col: Commercial Potential & Playlists */}
          <div className="space-y-6">
            
            {/* Commercial Score Gauge Card */}
            <div className="p-6 rounded-2xl bg-[#120e1b] border border-[#241c33] shadow-md text-center space-y-4">
              <span className="text-[10px] font-mono text-[#a294b8] uppercase tracking-wider block">
                Commercial Replay Potential
              </span>

              <div className="my-2 inline-flex items-center justify-center w-24 h-24 rounded-full bg-[#08060d] border-4 border-[#43c9a0] shadow-xl">
                <span className="text-2xl font-bold font-mono text-[#43c9a0]">
                  {ar.commercialPotentialScore}
                </span>
                <span className="text-xs font-mono text-[#a294b8]">/100</span>
              </div>

              <p className="text-xs font-sans text-[#a294b8]">
                Calculated based on regional hook stickiness, intro retention, and playlist fit.
              </p>
            </div>

            {/* Target Audience & Editorial Playlists Card */}
            <div className="p-6 rounded-2xl bg-[#120e1b] border border-[#241c33] shadow-md space-y-4 font-mono text-xs">
              <div>
                <h5 className="text-xs text-[#ffd48a] font-bold uppercase mb-1.5 flex items-center gap-1.5">
                  <Compass className="w-3.5 h-3.5" />
                  Target Listener Profile
                </h5>
                <p className="font-sans text-xs text-[#f5efe6] leading-relaxed">
                  {ar.targetAudience}
                </p>
              </div>

              <div className="pt-4 border-t border-[#241c33]">
                <h5 className="text-xs text-[#ffd48a] font-bold uppercase mb-2 flex items-center gap-1.5">
                  <Radio className="w-3.5 h-3.5" />
                  Target Editorial Playlists
                </h5>
                <div className="flex flex-wrap gap-2">
                  {ar.suggestedPlaylists.map((pl, idx) => (
                    <span
                      key={idx}
                      className="px-2.5 py-1 rounded-xl bg-[#08060d] border border-[#342847] text-xs text-[#f5efe6]"
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
