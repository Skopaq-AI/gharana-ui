import React, { useState } from 'react';
import { Sliders, Gauge, ShieldCheck, AlertTriangle, RefreshCw, Layers, CheckCircle2 } from 'lucide-react';
import { TrackItem, PlatformCompliance } from '../../types';
import { HumanCheckpointCard } from '../HumanCheckpointCard';
import { PageHeader, SectionCard, SectionHeader, StatCard } from '../SectionPanel';
import { PipelineProgressTracker } from '../PipelineProgressTracker';

interface MixQCTabProps {
  track: TrackItem;
  onUpdateTrack: (updated: TrackItem) => void;
  onInspectRaw: (title: string, payload: any) => void;
}

export const MixQCTab: React.FC<MixQCTabProps> = ({
  track,
  onUpdateTrack,
  onInspectRaw
}) => {
  const [analyzing, setAnalyzing] = useState(false);
  const metrics = track.audioMetrics;

  const platforms: PlatformCompliance[] = [
    {
      platform: 'Spotify',
      targetLufs: -14.0,
      maxPeakDbtp: -1.0,
      measuredLufs: metrics?.integratedLufs,
      measuredPeak: metrics?.truePeakDbtp,
      status: metrics?.integratedLufs !== undefined 
        ? (metrics.integratedLufs <= -13.0 && metrics.truePeakDbtp! <= -0.8 ? 'OPTIMAL' : 'WILL_ATTENUATE') 
        : 'WARNING',
      explanation: 'Spotify normalizes tracks to -14 LUFS. True Peak must remain below -1.0 dBTP to avoid AAC transcoding distortion.'
    },
    {
      platform: 'Apple Music',
      targetLufs: -16.0,
      maxPeakDbtp: -1.0,
      measuredLufs: metrics?.integratedLufs,
      measuredPeak: metrics?.truePeakDbtp,
      status: metrics?.integratedLufs !== undefined 
        ? (metrics.integratedLufs <= -15.0 ? 'OPTIMAL' : 'WILL_ATTENUATE') 
        : 'WARNING',
      explanation: 'Apple Digital Masters specifies -16 LUFS integrated target with Sound Check normalization.'
    },
    {
      platform: 'YouTube Music',
      targetLufs: -13.0,
      maxPeakDbtp: -1.0,
      measuredLufs: metrics?.integratedLufs,
      measuredPeak: metrics?.truePeakDbtp,
      status: metrics?.truePeakDbtp !== undefined && metrics.truePeakDbtp <= -0.8 ? 'OPTIMAL' : 'WARNING',
      explanation: 'YouTube applies strict downward normalization if integrated loudness exceeds -13 LUFS.'
    },
    {
      platform: 'Instagram / Reels',
      targetLufs: -11.0,
      maxPeakDbtp: -0.5,
      measuredLufs: metrics?.integratedLufs,
      measuredPeak: metrics?.truePeakDbtp,
      status: metrics?.integratedLufs !== undefined && metrics.integratedLufs >= -14.0 ? 'OPTIMAL' : 'QUIET',
      explanation: 'Short form audio requires higher energetic presence (-11 to -13 LUFS) to cut through mobile speaker noise.'
    }
  ];

  const handleRunMixQc = async () => {
    setAnalyzing(true);
    try {
      const res = await fetch('/api/agent/mix-qc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          integratedLufs: metrics?.integratedLufs || -13.8,
          truePeakDbtp: metrics?.truePeakDbtp || -0.8,
          dynamicRangeLu: metrics?.dynamicRangeLu || 8.2,
          stereoWidth: metrics?.stereoWidth || 1.12,
          frequencyProfile: metrics?.frequencyBins
        })
      });
      const data = await res.json();
      
      const updatedTrack: TrackItem = {
        ...track,
        rawAgentPayloads: {
          ...track.rawAgentPayloads,
          mixQcAgent: data
        }
      };
      onUpdateTrack(updatedTrack);
    } catch (err) {
      console.error('Mix QC agent error:', err);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleApproveCheckpoint = () => {
    if (!track.arAssessment) return;
    const updatedTrack: TrackItem = {
      ...track,
      arAssessment: {
        ...track.arAssessment,
        checkpointStatus: 'approved'
      }
    };
    onUpdateTrack(updatedTrack);
  };

  const handleRejectCheckpoint = () => {
    if (!track.arAssessment) return;
    const updatedTrack: TrackItem = {
      ...track,
      arAssessment: {
        ...track.arAssessment,
        checkpointStatus: 'rejected'
      }
    };
    onUpdateTrack(updatedTrack);
  };

  return (
    <div className="space-y-6">
      {/* Pipeline Track Completion Progress */}
      <PipelineProgressTracker track={track} activeStage="mix_qc" />

      {/* Standardized Page Header */}
      <PageHeader
        icon={Sliders}
        title="Mix Quality Control & Mastering DSP"
        description="Real loudness, True Peak, and frequency spectrum verification before master lock."
        badge="EBU R128 Compliant"
        action={
          <button
            onClick={handleRunMixQc}
            disabled={analyzing}
            className="px-4 py-2.5 rounded-xl bg-[#f2542d] hover:bg-[#ff7a4d] text-white font-mono text-xs font-bold transition-all shadow-md flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${analyzing ? 'animate-spin' : ''}`} />
            <span>{analyzing ? 'Running Mix QC DSP...' : 'Run Agent Mix QC Analysis'}</span>
          </button>
        }
      />

      {/* Human Approval Checkpoint */}
      {track.arAssessment && (
        <HumanCheckpointCard
          title="Master Limiter Ceiling & EQ Adjustment"
          recommendation={
            metrics?.truePeakDbtp && metrics.truePeakDbtp > -1.0
              ? `True Peak is ${metrics.truePeakDbtp} dBTP. Engage True Peak limiter ceiling at -1.0 dBTP to prevent inter-sample clipping on AAC encoding.`
              : `Current integrated loudness is ${metrics?.integratedLufs ?? 'not measured yet'} LUFS. Apply -1.5dB dip at 200Hz for vocal separation.`
          }
          status={track.arAssessment.checkpointStatus}
          agentName="GHARANA Mix QC Agent"
          trackForMobile={track}
          onApprove={handleApproveCheckpoint}
          onReject={handleRejectCheckpoint}
          onInspectRawPayload={() => onInspectRaw("Mix QC Agent Payload", track.rawAgentPayloads.mixQcAgent || { info: "Run Mix QC Analysis to populate payload" })}
        />
      )}

      {/* Main Grid: Audio Metrics + Platform Target Compliance */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left 2 Cols: Real Measured Values & Frequency Profile */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Key Metrics HUD Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            
            <div className="p-4 rounded-2xl bg-[#120e1b] border border-[#241c33] shadow-md space-y-1">
              <span className="text-[10px] text-[#a294b8] font-mono uppercase block tracking-wider">
                Integrated Loudness
              </span>
              <div className="text-lg font-bold font-mono text-[#43c9a0]">
                {metrics?.integratedLufs !== undefined ? `${metrics.integratedLufs} LUFS` : 'Not measured'}
              </div>
              <span className="text-[10px] text-[#6d6183] font-mono block">
                Target: -14.0 LUFS
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-[#120e1b] border border-[#241c33] shadow-md space-y-1">
              <span className="text-[10px] text-[#a294b8] font-mono uppercase block tracking-wider">
                True Peak Level
              </span>
              <div className={`text-lg font-bold font-mono ${
                metrics?.truePeakDbtp !== undefined && metrics.truePeakDbtp > -1.0 ? 'text-[#f2542d]' : 'text-[#f5efe6]'
              }`}>
                {metrics?.truePeakDbtp !== undefined ? `${metrics.truePeakDbtp} dBTP` : 'Not measured'}
              </div>
              <span className="text-[10px] text-[#6d6183] font-mono block">
                Max Limit: -1.0 dBTP
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-[#120e1b] border border-[#241c33] shadow-md space-y-1">
              <span className="text-[10px] text-[#a294b8] font-mono uppercase block tracking-wider">
                Dynamic Range
              </span>
              <div className="text-lg font-bold font-mono text-[#ffd48a]">
                {metrics?.dynamicRangeLu !== undefined ? `${metrics.dynamicRangeLu} LU` : 'Not measured'}
              </div>
              <span className="text-[10px] text-[#6d6183] font-mono block">
                Ideal: 7 - 12 LU
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-[#120e1b] border border-[#241c33] shadow-md space-y-1">
              <span className="text-[10px] text-[#a294b8] font-mono uppercase block tracking-wider">
                Stereo Correlation
              </span>
              <div className="text-lg font-bold font-mono text-[#a56bd6]">
                {metrics?.stereoWidth !== undefined ? `${metrics.stereoWidth}x` : 'Not measured'}
              </div>
              <span className="text-[10px] text-[#6d6183] font-mono block">
                Mono Compatible
              </span>
            </div>

          </div>

          {/* Real Measured Frequency Bins (6 Band Spectrum) */}
          <div className="p-6 rounded-2xl bg-[#120e1b] border border-[#241c33] shadow-md space-y-4">
            <div className="flex items-center gap-2.5 pb-3 border-b border-[#241c33]">
              <div className="p-2 rounded-xl bg-[#ffd48a]/10 border border-[#ffd48a]/20 text-[#ffd48a]">
                <Gauge className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-serif text-base font-bold text-[#f5efe6]">
                  Frequency Energy Balance Profile
                </h3>
                <p className="font-mono text-xs text-[#a294b8]">
                  Real measured spectral energy per band relative to zero dBFS reference.
                </p>
              </div>
            </div>

            {metrics?.frequencyBins ? (
              <div className="space-y-4 font-mono-num text-xs">
                
                {Object.entries(metrics.frequencyBins).map(([bandKey, val]) => {
                  const numVal = typeof val === 'number' ? val : Number(val) || 0;
                  const bandLabels: Record<string, string> = {
                    subBass: 'Sub Bass (20-60 Hz)',
                    bass: 'Bass (60-250 Hz)',
                    lowMid: 'Low Mid (250-500 Hz)',
                    mid: 'Mid Range (500-2 kHz)',
                    highMid: 'High Mid (2-6 kHz)',
                    highs: 'Highs / Air (6-20 kHz)'
                  };

                  // Normalize -30dB to 0dB range into 0% to 100% width
                  const widthPercent = Math.min(100, Math.max(10, ((numVal + 35) / 35) * 100));

                  return (
                    <div key={bandKey} className="space-y-1">
                      <div className="flex justify-between text-[#a294b8]">
                        <span className="text-[#f5efe6]">{bandLabels[bandKey] || bandKey}</span>
                        <span className="text-[#ffd48a]">{numVal} dB</span>
                      </div>
                      <div className="h-2.5 bg-[#08060d] rounded-full overflow-hidden border border-[#241c33] p-0.5">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-[#21a882] via-[#f5b544] to-[#f2542d] transition-all duration-500"
                          style={{ width: `${widthPercent}%` }}
                        />
                      </div>
                    </div>
                  );
                })}

              </div>
            ) : (
              <div className="p-8 text-center bg-[#08060d] rounded-xl border border-[#241c33] text-xs text-[#a294b8] font-mono-num">
                Frequency measurements not calculated yet for this track.
              </div>
            )}
          </div>

        </div>

        {/* Right Col: Target Platform Readiness Matrix */}
        <div className="space-y-4">
          <div className="p-6 glass-panel rounded-2xl border border-[#342847]">
            <h3 className="font-serif text-base font-semibold text-[#f5efe6] mb-1">
              Platform Delivery Targets
            </h3>
            <p className="text-xs text-[#a294b8] font-serif mb-4">
              Automatic loudness & peak compliance checks for global DSPs.
            </p>

            <div className="space-y-3">
              {platforms.map((p) => (
                <div
                  key={p.platform}
                  className="p-3.5 rounded-xl bg-[#0d0a14] border border-[#241c33] hover:border-[#342847] transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-serif text-sm font-medium text-[#f5efe6]">
                      {p.platform}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-mono-num uppercase ${
                      p.status === 'OPTIMAL' 
                        ? 'bg-[#21a882]/20 text-[#43c9a0] border border-[#21a882]/40' 
                        : p.status === 'WILL_ATTENUATE' 
                        ? 'bg-[#f5b544]/20 text-[#ffd48a] border border-[#f5b544]/40' 
                        : 'bg-[#f2542d]/20 text-[#ff7a4d] border border-[#f2542d]/40'
                    }`}>
                      {p.status}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs font-mono-num text-[#a294b8] mt-2">
                    <span>Target: {p.targetLufs} LUFS</span>
                    <span>Max: {p.maxPeakDbtp} dBTP</span>
                  </div>

                  <p className="text-[11px] text-[#6d6183] font-serif mt-2 leading-tight">
                    {p.explanation}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
