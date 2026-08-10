import React, { useState } from 'react';
import { ShieldAlert, CheckCircle2, XCircle, MessageSquare, Flame, Smartphone } from 'lucide-react';
import { CheckpointStatus } from '../types';
import { MobileApprovalModal } from './MobileApprovalModal';

interface HumanCheckpointCardProps {
  title: string;
  recommendation: string;
  status: CheckpointStatus;
  agentName?: string;
  onApprove: () => void;
  onReject: () => void;
  onAddNote?: (note: string) => void;
  onInspectRawPayload?: () => void;
  trackForMobile?: any;
}

export const HumanCheckpointCard: React.FC<HumanCheckpointCardProps> = ({
  title,
  recommendation,
  status,
  agentName = "GHARANA AI Agent",
  onApprove,
  onReject,
  onAddNote,
  onInspectRawPayload,
  trackForMobile
}) => {
  const [showNoteInput, setShowNoteInput] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [isMobileModalOpen, setIsMobileModalOpen] = useState(false);

  const isPending = status === 'pending_artist_approval';

  const mockTrackForMobile = trackForMobile || {
    id: 'trk-001',
    title: title || 'Kalyani (Acoustic Version)',
    primaryArtist: 'Arya Sharma',
    audioMetrics: {
      integratedLufs: -13.8,
      truePeakDbtp: -1.2,
      dynamicRangeLu: 8.2
    }
  };

  return (
    <div className={`p-5 rounded-2xl glass-panel relative overflow-hidden transition-all ${
      isPending 
        ? 'ember-pulse bg-[#191324]/80' 
        : status === 'approved' 
        ? 'border-[#21a882]/50 bg-[#0d0a14]/60' 
        : 'border-[#342847]/60 bg-[#0d0a14]/40'
    }`}>
      {/* Background warm ember highlight */}
      {isPending && (
        <div className="absolute top-0 right-0 w-32 h-32 bg-[#f2542d]/10 rounded-full blur-2xl pointer-events-none" />
      )}

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
        <div className="flex items-start gap-3.5">
          <div className={`p-2.5 rounded-xl flex-shrink-0 ${
            isPending 
              ? 'bg-[#f2542d]/20 text-[#ff7a4d] border border-[#f2542d]/40' 
              : status === 'approved' 
              ? 'bg-[#21a882]/20 text-[#43c9a0] border border-[#21a882]/40' 
              : 'bg-[#241c33] text-[#a294b8]'
          }`}>
            {isPending ? (
              <Flame className="w-5 h-5 animate-pulse text-[#ff7a4d]" />
            ) : status === 'approved' ? (
              <CheckCircle2 className="w-5 h-5 text-[#43c9a0]" />
            ) : (
              <ShieldAlert className="w-5 h-5 text-[#a294b8]" />
            )}
          </div>

          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] font-mono-num uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#241c33] text-[#f5b544] border border-[#f5b544]/20">
                Human Approval Checkpoint
              </span>
              <span className="text-xs text-[#a294b8] font-mono-num">
                {agentName}
              </span>
            </div>

            <h4 className="font-serif text-base font-semibold text-[#f5efe6] mt-1">
              {title}
            </h4>

            <p className="text-sm font-serif text-[#f5efe6]/90 mt-1.5 leading-relaxed">
              "{recommendation}"
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 flex-wrap justify-end flex-shrink-0 mt-2 md:mt-0">
          <button
            onClick={() => setIsMobileModalOpen(true)}
            className="px-3 py-1.5 rounded-lg bg-[#25D366]/20 hover:bg-[#25D366]/30 border border-[#25D366]/40 text-xs font-mono text-[#25D366] transition-colors flex items-center gap-1.5"
            title="Open WhatsApp Mobile Approval View"
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>Mobile Approval View</span>
          </button>

          {onInspectRawPayload && (
            <button
              onClick={onInspectRawPayload}
              className="text-xs text-[#a294b8] hover:text-[#f5efe6] underline underline-offset-4 px-2 py-1 font-mono-num"
            >
              Inspect Agent Payload
            </button>
          )}

          {isPending ? (
            <>
              <button
                onClick={() => setShowNoteInput(!showNoteInput)}
                className="px-3 py-1.5 rounded-lg bg-[#241c33] hover:bg-[#342847] border border-[#342847] text-xs font-sans text-[#a294b8] hover:text-[#f5efe6] transition-colors flex items-center gap-1.5"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Note</span>
              </button>

              <button
                onClick={onReject}
                className="px-3 py-1.5 rounded-lg bg-[#191324] hover:bg-[#241c33] border border-[#342847] text-xs font-sans text-[#a294b8] hover:text-[#ff7a4d] transition-colors flex items-center gap-1.5"
              >
                <XCircle className="w-3.5 h-3.5" />
                <span>Redo</span>
              </button>

              <button
                onClick={onApprove}
                className="px-4 py-1.5 rounded-lg bg-[#f2542d] hover:bg-[#ff7a4d] text-xs font-sans font-semibold text-white shadow-lg shadow-[#f2542d]/25 transition-all flex items-center gap-1.5 uppercase tracking-wider"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Approve & Lock</span>
              </button>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <span className={`px-3 py-1 rounded-lg text-xs font-mono-num border ${
                status === 'approved' 
                  ? 'bg-[#21a882]/20 text-[#43c9a0] border-[#21a882]/40' 
                  : 'bg-[#191324] text-[#a294b8] border-[#342847]'
              }`}>
                {status === 'approved' ? 'APPROVED BY ARTIST' : 'REJECTED'}
              </span>
              <button
                onClick={onApprove}
                className="text-xs text-[#a294b8] hover:text-[#f5efe6] underline font-mono-num ml-1"
              >
                Reopen
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Approval Modal */}
      <MobileApprovalModal
        track={mockTrackForMobile}
        stageTitle={title}
        agentName={agentName}
        narratedSummary={recommendation}
        isOpen={isMobileModalOpen}
        onClose={() => setIsMobileModalOpen(false)}
        onApprove={onApprove}
        onReject={onReject}
        onInspectRawPayload={onInspectRawPayload || (() => {})}
      />

      {/* Optional Note Drawer */}
      {showNoteInput && isPending && (
        <div className="mt-4 pt-3 border-t border-[#342847]/60 flex gap-2">
          <input
            type="text"
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            placeholder="Add studio note for this checkpoint (e.g. 'I trimmed the vocal 1dB in FL Studio')..."
            className="flex-1 bg-[#0d0a14] border border-[#342847] rounded-lg px-3 py-1.5 text-xs text-[#f5efe6] focus:outline-none focus:border-[#f5b544]"
          />
          <button
            onClick={() => {
              if (onAddNote && noteText) {
                onAddNote(noteText);
                setNoteText('');
                setShowNoteInput(false);
              }
            }}
            className="px-3 py-1.5 bg-[#f5b544] text-[#08060d] font-semibold text-xs rounded-lg hover:bg-[#ffd48a]"
          >
            Save
          </button>
        </div>
      )}
    </div>
  );
};
