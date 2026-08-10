import React, { useState } from 'react';
import {
  MessageSquare,
  CheckCircle2,
  AlertTriangle,
  Code2,
  X,
  Smartphone,
  ShieldAlert,
  Sparkles,
  RefreshCw,
  Send,
  Zap,
  Volume2
} from 'lucide-react';
import { TrackItem, CheckpointStatus } from '../types';

interface MobileApprovalModalProps {
  track: TrackItem;
  stageTitle?: string;
  agentName?: string;
  narratedSummary?: string;
  isOpen: boolean;
  onClose: () => void;
  onApprove: () => void;
  onReject: () => void;
  onInspectRawPayload: () => void;
}

export const MobileApprovalModal: React.FC<MobileApprovalModalProps> = ({
  track,
  stageTitle = "Mix QC & Master Ceiling",
  agentName = "GHARANA Mix QC Agent",
  narratedSummary,
  isOpen,
  onClose,
  onApprove,
  onReject,
  onInspectRawPayload
}) => {
  const [simulateOverPeak, setSimulateOverPeak] = useState<boolean>(false);
  const [quickNote, setQuickNote] = useState<string>('');
  const [showNoteInput, setShowNoteInput] = useState<boolean>(false);

  if (!isOpen) return null;

  // Audio metrics
  const defaultSummary = narratedSummary || 
    `Mix QC verified. High-frequency vocal harshness at 3.2kHz dipped by -1.5dB. Low-end sub energy consolidated below 40Hz for clean translation across mobile speakers and DSP streaming encoders.`;

  // Measure LUFS and Peak
  const actualLufs = track.audioMetrics?.integratedLufs ?? -13.8;
  const normalPeak = track.audioMetrics?.truePeakDbtp ?? -1.2;
  
  // If simulating over peak, set true peak to -0.6 dBTP (exceeds -1.0 dBTP ceiling!)
  const measuredTruePeak = simulateOverPeak ? -0.6 : normalPeak;
  const isTruePeakOver = measuredTruePeak > -1.0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      
      {/* Outer Container / Phone Simulation Shell */}
      <div className="w-full max-w-sm sm:max-w-md bg-[#08060d] rounded-[36px] border-2 border-[#342847] shadow-2xl overflow-hidden flex flex-col max-h-[92vh] relative text-[#f5efe6] font-sans">
        
        {/* Simulated Android Phone Top Status Bar */}
        <div className="bg-[#050409] px-6 py-2.5 flex items-center justify-between text-[11px] font-mono text-[#a294b8] border-b border-[#191324] flex-shrink-0">
          <div className="flex items-center gap-2">
            <span className="font-bold text-[#ffd48a]">11:42 AM</span>
            <span className="px-1.5 py-0.2 rounded bg-[#25D366]/20 text-[#25D366] font-mono text-[9px] font-bold border border-[#25D366]/40 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#25D366] animate-pulse" />
              WhatsApp Nudge
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* Quick Toggle for True Peak Simulation */}
            <button
              onClick={() => setSimulateOverPeak(!simulateOverPeak)}
              className={`text-[9px] font-mono px-2 py-0.5 rounded border transition-all ${
                simulateOverPeak
                  ? 'bg-[#f2542d] text-white border-[#f2542d]'
                  : 'bg-[#1f182c] text-[#a294b8] border-[#342847] hover:text-[#f5efe6]'
              }`}
              title="Toggle to test True Peak release blocking state"
            >
              {simulateOverPeak ? 'Peak: -0.6dB (Blocked)' : 'Simulate Over-Peak'}
            </button>

            <button
              onClick={onClose}
              className="p-1 text-[#a294b8] hover:text-[#f5efe6] transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Header Title & Context Badge */}
        <div className="p-4 bg-[#0d0a14] border-b border-[#241c33] space-y-2 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#f2542d]" />
              <span className="text-[10px] font-mono uppercase tracking-wider text-[#a294b8]">
                {stageTitle}
              </span>
            </div>
            
            <button
              onClick={onInspectRawPayload}
              className="text-[10px] font-mono text-[#ffd48a] hover:underline flex items-center gap-1 bg-[#1f182c] px-2 py-1 rounded border border-[#ffd48a]/30"
            >
              <Code2 className="w-3 h-3 text-[#ffd48a]" />
              <span>1-Tap Raw JSON</span>
            </button>
          </div>

          <h2 className="font-serif text-lg font-bold text-[#f5efe6] truncate">
            {track.title}
          </h2>
          <p className="text-[11px] font-mono text-[#6d6183] truncate">
            {track.primaryArtist} • {agentName}
          </p>
        </div>

        {/* Scrollable Main Content Zone (Optimized for One-Handed Mobile Viewing) */}
        <div className="p-5 overflow-y-auto space-y-5 flex-1 bg-[#08060d]">
          
          {/* SECTION 1: WHAT THE AGENT PRODUCED (Readable at a glance in Display Serif) */}
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wider text-[#a56bd6]">
              <Sparkles className="w-3.5 h-3.5 text-[#a56bd6]" />
              <span>Agent Narrative Summary</span>
            </div>

            <div className="p-4 rounded-2xl bg-[#120e1b] border border-[#342847] space-y-2 shadow-inner">
              <p className="font-serif text-base text-[#f5efe6] leading-snug">
                "{defaultSummary}"
              </p>
            </div>
          </div>

          {/* SECTION 2: MEASURED NUMBERS BACKING IT (In Monospace) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-wider text-[#6d6183]">
              <span>DSP Measured Benchmarks</span>
              <span className="text-[#a294b8]">Monospace Verification</span>
            </div>

            <div className="grid grid-cols-2 gap-3 font-mono">
              
              {/* LUFS Card */}
              <div className="p-3.5 rounded-2xl bg-[#120e1b] border border-[#241c33] space-y-1">
                <span className="text-[9px] text-[#6d6183] uppercase tracking-wider block">
                  Integrated Loudness
                </span>
                <span className="text-xl font-bold text-[#43c9a0] block">
                  {actualLufs} LUFS
                </span>
                <span className="text-[9px] text-[#a294b8] block">
                  Anchor: -14.0 LUFS
                </span>
              </div>

              {/* True Peak Card */}
              <div className={`p-3.5 rounded-2xl border space-y-1 transition-all ${
                isTruePeakOver
                  ? 'bg-[#2b0e0e] border-[#f2542d] text-[#ff7a4d] animate-pulse'
                  : 'bg-[#120e1b] border-[#241c33] text-[#f5efe6]'
              }`}>
                <span className="text-[9px] uppercase tracking-wider block opacity-75">
                  True Peak Level
                </span>
                <span className={`text-xl font-bold block ${isTruePeakOver ? 'text-[#ff7a4d]' : 'text-[#f5efe6]'}`}>
                  {measuredTruePeak} dBTP
                </span>
                <span className="text-[9px] opacity-75 block">
                  Ceiling: -1.0 dBTP
                </span>
              </div>

            </div>
          </div>

          {/* CRITICAL RELEASE-BLOCKING BANNER IF TRUE PEAK EXCEEDS CEILING */}
          {isTruePeakOver && (
            <div className="p-4 rounded-2xl bg-[#2b0e0e] border-2 border-[#f2542d] text-[#ff7a4d] space-y-2 shadow-xl shadow-[#f2542d]/20 animate-fadeIn">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-[#f2542d] flex-shrink-0 animate-bounce" />
                <span className="font-serif text-sm font-bold uppercase tracking-wide">
                  RELEASE BLOCKED: TRUE PEAK CEILING EXCEEDED
                </span>
              </div>
              <p className="font-serif text-xs leading-relaxed text-[#f5efe6]">
                Measured True Peak of <strong className="font-mono text-[#ff7a4d]">{measuredTruePeak} dBTP</strong> exceeds the streaming distribution ceiling of <strong className="font-mono">-1.0 dBTP</strong> by +0.4 dB. Inter-sample clipping will occur during AAC transcoding on Spotify and Apple Music.
              </p>
              <div className="pt-1">
                <span className="px-2.5 py-1 rounded bg-[#f2542d] text-white font-mono text-[10px] font-bold uppercase block text-center">
                  Hard Block Active: Must Re-Limit Master Before Release
                </span>
              </div>
            </div>
          )}

          {/* Optional Quick Studio Note Field */}
          {showNoteInput && (
            <div className="p-3 bg-[#120e1b] rounded-2xl border border-[#342847] space-y-2 animate-fadeIn">
              <label className="text-[10px] font-mono text-[#a294b8] uppercase tracking-wider block">
                Quick Studio Voice / Text Note
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={quickNote}
                  onChange={(e) => setQuickNote(e.target.value)}
                  placeholder="e.g., 'Trim 0.5dB on vocal stem'"
                  className="flex-1 bg-[#08060d] border border-[#342847] rounded-xl px-3 py-2 text-xs text-[#f5efe6] focus:outline-none focus:border-[#f2542d]"
                />
                <button
                  onClick={() => setShowNoteInput(false)}
                  className="px-3 py-2 bg-[#f2542d] text-white text-xs font-bold rounded-xl"
                >
                  Save
                </button>
              </div>
            </div>
          )}

        </div>

        {/* SECTION 4: THUMB-REACHABLE STICKY BOTTOM ACTION BAR */}
        <div className="p-4 bg-[#0d0a14] border-t border-[#241c33] space-y-2 flex-shrink-0">
          
          <div className="flex items-center gap-3">
            
            {/* Note Button */}
            <button
              onClick={() => setShowNoteInput(!showNoteInput)}
              className="p-4 rounded-2xl bg-[#1f182c] hover:bg-[#342847] border border-[#342847] text-[#a294b8] hover:text-[#f5efe6] transition-colors flex items-center justify-center"
              title="Add Studio Note"
            >
              <MessageSquare className="w-5 h-5" />
            </button>

            {/* Redo Button (Quiet Secondary) */}
            <button
              onClick={() => {
                onReject();
                onClose();
              }}
              className="px-5 py-4 rounded-2xl bg-[#1f182c] hover:bg-[#342847] border border-[#342847] text-xs font-serif text-[#a294b8] hover:text-[#f5efe6] transition-colors font-medium"
            >
              Redo
            </button>

            {/* Approve Button (Confident Vermilion Primary) */}
            <button
              onClick={() => {
                if (!isTruePeakOver) {
                  onApprove();
                  onClose();
                }
              }}
              disabled={isTruePeakOver}
              className={`flex-1 py-4 px-4 rounded-2xl text-sm font-serif font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
                isTruePeakOver
                  ? 'bg-[#342847] text-[#6d6183] border border-[#342847] cursor-not-allowed opacity-60'
                  : 'bg-[#f2542d] hover:bg-[#ff7a4d] text-white shadow-xl shadow-[#f2542d]/30 active:scale-95'
              }`}
            >
              <CheckCircle2 className="w-4 h-4 text-white" />
              <span>{isTruePeakOver ? 'Blocked (Peak Over)' : 'Approve & Lock'}</span>
            </button>

          </div>

          <p className="text-[10px] font-mono text-center text-[#6d6183]">
            GHARANA Studio • Single-Tap WhatsApp Pipeline Approval
          </p>
        </div>

      </div>

    </div>
  );
};
