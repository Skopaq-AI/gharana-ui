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
  const [quickNote, setQuickNote] = useState<string>('');
  const [showNoteInput, setShowNoteInput] = useState<boolean>(false);

  if (!isOpen) return null;

  /**
   * Everything below is measured or absent. There are no fallbacks.
   *
   * This file previously did three things this product cannot ship:
   *   - `track.audioMetrics?.integratedLufs ?? -13.8` and `?? -1.2`, so a track
   *     with nothing measured displayed two confident numbers that no DSP
   *     produced. The approval screen is the one surface where the artist is
   *     asked to trust a measurement, which makes it the worst possible place
   *     to invent one.
   *   - a `simulateOverPeak` toggle that set true peak to -0.6 dBTP to demo the
   *     blocking state. A control that manufactures a measurement does not
   *     belong in the console at all; the over-peak path is covered by tests.
   *   - a default narration asserting "3.2kHz dipped by -1.5dB" — a measurement
   *     in prose, with no measurement behind it. The same class of defect the
   *     agent-layer audit calls D2, on the client side.
   *
   * The rule is the backend's rule: narration may be absent, a number may be
   * absent, but neither may be fabricated.
   */
  const summary = narratedSummary?.trim() || null;

  const measuredLufs = Number.isFinite(track.audioMetrics?.integratedLufs)
    ? (track.audioMetrics!.integratedLufs as number)
    : null;
  const measuredTruePeak = Number.isFinite(track.audioMetrics?.truePeakDbtp)
    ? (track.audioMetrics!.truePeakDbtp as number)
    : null;

  /** Streaming delivery ceiling. Mirrors TRUE_PEAK_CEILING_DBTP in MixQCTab. */
  const TRUE_PEAK_CEILING_DBTP = -1.0;
  /** Only true when a real measurement exceeds the ceiling — never when absent. */
  const isTruePeakOver =
    measuredTruePeak !== null && measuredTruePeak > TRUE_PEAK_CEILING_DBTP;
  const peakExcessDb = isTruePeakOver
    ? (measuredTruePeak - TRUE_PEAK_CEILING_DBTP).toFixed(1)
    : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      
      {/* Outer Container / Phone Simulation Shell */}
      <div className="w-full max-w-sm sm:max-w-md bg-bg rounded-[36px] border-2 border-line-strong shadow-2xl overflow-hidden flex flex-col max-h-[92vh] relative text-ink font-sans">
        
        {/* Simulated Android Phone Top Status Bar */}
        <div className="bg-bg px-6 py-2.5 flex items-center justify-between text-[11px] font-mono text-muted border-b border-surface flex-shrink-0">
          <div className="flex items-center gap-2">
            <span className="font-bold text-caution">11:42 AM</span>
            <span className="px-1.5 py-0.2 rounded bg-whatsapp/20 text-whatsapp font-mono text-[9px] font-bold border border-whatsapp/40 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-whatsapp animate-pulse" />
              WhatsApp Nudge
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="p-1 text-muted hover:text-ink transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Header Title & Context Badge */}
        <div className="p-4 bg-bg border-b border-line space-y-2 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-accent" />
              <span className="text-[10px] font-mono uppercase tracking-wider text-muted">
                {stageTitle}
              </span>
            </div>
            
            <button
              onClick={onInspectRawPayload}
              className="text-[10px] font-mono text-caution hover:underline flex items-center gap-1 bg-surface px-2 py-1 rounded border border-caution/30"
            >
              <Code2 className="w-3 h-3 text-caution" />
              <span>1-Tap Raw JSON</span>
            </button>
          </div>

          <h2 className="font-serif text-lg font-bold text-ink truncate">
            {track.title}
          </h2>
          <p className="text-[11px] font-mono text-dim truncate">
            {track.artist} • {agentName}
          </p>
        </div>

        {/* Scrollable Main Content Zone (Optimized for One-Handed Mobile Viewing) */}
        <div className="p-5 overflow-y-auto space-y-5 flex-1 bg-bg">
          
          {/* SECTION 1: WHAT THE AGENT PRODUCED (Readable at a glance in Display Serif) */}
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wider text-info">
              <Sparkles className="w-3.5 h-3.5 text-info" />
              <span>Agent Narrative Summary</span>
            </div>

            <div className="p-4 rounded-2xl bg-panel border border-line-strong space-y-2 shadow-inner">
              {summary ? (
                <p className="font-serif text-base text-ink leading-snug">
                  "{summary}"
                </p>
              ) : (
                <p className="font-serif text-sm text-dim leading-snug italic">
                  This stage produced no narrative summary. Open the raw JSON to
                  see exactly what the agent returned.
                </p>
              )}
            </div>
          </div>

          {/* SECTION 2: MEASURED NUMBERS BACKING IT (In Monospace) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-wider text-dim">
              <span>DSP Measured Benchmarks</span>
              <span className="text-muted">Monospace Verification</span>
            </div>

            <div className="grid grid-cols-2 gap-3 font-mono">
              
              {/* LUFS Card */}
              <div className="p-3.5 rounded-2xl bg-panel border border-line space-y-1">
                <span className="text-[9px] text-dim uppercase tracking-wider block">
                  Integrated Loudness
                </span>
                {measuredLufs !== null ? (
                  <span className="text-xl font-bold text-accent block">
                    {measuredLufs} LUFS
                  </span>
                ) : (
                  <span className="text-sm font-bold text-dim block">
                    Not measured
                  </span>
                )}
                <span className="text-[9px] text-muted block">
                  Anchor: -14.0 LUFS
                </span>
              </div>

              {/* True Peak Card */}
              <div className={`p-3.5 rounded-2xl border space-y-1 transition-all ${
                isTruePeakOver
                  ? 'bg-blocking border-accent text-accent-hover animate-pulse'
                  : 'bg-panel border-line text-ink'
              }`}>
                <span className="text-[9px] uppercase tracking-wider block opacity-75">
                  True Peak Level
                </span>
                {measuredTruePeak !== null ? (
                  <span className={`text-xl font-bold block ${isTruePeakOver ? 'text-accent-hover' : 'text-ink'}`}>
                    {measuredTruePeak} dBTP
                  </span>
                ) : (
                  <span className="text-sm font-bold text-dim block">
                    Not measured
                  </span>
                )}
                <span className="text-[9px] opacity-75 block">
                  Ceiling: {TRUE_PEAK_CEILING_DBTP.toFixed(1)} dBTP
                </span>
              </div>

            </div>
          </div>

          {/* CRITICAL RELEASE-BLOCKING BANNER IF TRUE PEAK EXCEEDS CEILING */}
          {isTruePeakOver && (
            <div className="p-4 rounded-2xl bg-blocking border-2 border-accent text-accent-hover space-y-2 shadow-xl shadow-[var(--accent-dim)] animate-fadeIn">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-accent flex-shrink-0 animate-bounce" />
                <span className="font-serif text-sm font-bold uppercase tracking-wide">
                  RELEASE BLOCKED: TRUE PEAK CEILING EXCEEDED
                </span>
              </div>
              <p className="font-serif text-xs leading-relaxed text-accent-on">
                Measured True Peak of <strong className="font-mono text-accent-hover">{measuredTruePeak} dBTP</strong> exceeds the streaming distribution ceiling of <strong className="font-mono">{TRUE_PEAK_CEILING_DBTP.toFixed(1)} dBTP</strong> by +{peakExcessDb} dB. Inter-sample clipping can occur during lossy transcoding on Spotify and Apple Music.
              </p>
              <div className="pt-1">
                <span className="px-2.5 py-1 rounded bg-accent text-accent-on font-mono text-[10px] font-bold uppercase block text-center">
                  Hard Block Active: Must Re-Limit Master Before Release
                </span>
              </div>
            </div>
          )}

          {/* Optional Quick Studio Note Field */}
          {showNoteInput && (
            <div className="p-3 bg-panel rounded-2xl border border-line-strong space-y-2 animate-fadeIn">
              <label className="text-[10px] font-mono text-muted uppercase tracking-wider block">
                Quick Studio Voice / Text Note
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={quickNote}
                  onChange={(e) => setQuickNote(e.target.value)}
                  placeholder="e.g., 'Trim 0.5dB on vocal stem'"
                  className="flex-1 bg-bg border border-line-strong rounded-xl px-3 py-2 text-xs text-accent-on focus:outline-none focus:border-accent"
                />
                <button
                  onClick={() => setShowNoteInput(false)}
                  className="px-3 py-2 bg-accent text-accent-on text-xs font-bold rounded-xl"
                >
                  Save
                </button>
              </div>
            </div>
          )}

        </div>

        {/* SECTION 4: THUMB-REACHABLE STICKY BOTTOM ACTION BAR */}
        <div className="p-4 bg-bg border-t border-line space-y-2 flex-shrink-0">
          
          <div className="flex items-center gap-3">
            
            {/* Note Button */}
            <button
              onClick={() => setShowNoteInput(!showNoteInput)}
              className="p-4 rounded-2xl bg-surface hover:bg-line-strong border border-line-strong text-muted hover:text-accent-on transition-colors flex items-center justify-center"
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
              className="px-5 py-4 rounded-2xl bg-surface hover:bg-line-strong border border-line-strong text-xs font-serif text-muted hover:text-accent-on transition-colors font-medium"
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
                  ? 'bg-line-strong text-dim border border-line-strong cursor-not-allowed opacity-60'
                  : 'bg-accent hover:bg-accent-hover text-accent-on shadow-xl shadow-[var(--accent-dim)] active:scale-95'
              }`}
            >
              <CheckCircle2 className="w-4 h-4 text-white" />
              <span>{isTruePeakOver ? 'Blocked (Peak Over)' : 'Approve & Lock'}</span>
            </button>

          </div>

          {/*
            Nothing measured is not the same as nothing wrong, and the modal must
            not imply either. Approval stays enabled — the backend owns release
            gating — but the artist is told what they are signing off on.
          */}
          {measuredTruePeak === null && (
            <p className="text-[10px] font-mono text-center text-muted leading-relaxed">
              No loudness or true-peak measurement exists for this track yet, so
              nothing here was checked against the delivery ceiling.
            </p>
          )}

          <p className="text-[10px] font-mono text-center text-dim">
            GHARANA Studio • Single-Tap WhatsApp Pipeline Approval
          </p>
        </div>

      </div>

    </div>
  );
};
