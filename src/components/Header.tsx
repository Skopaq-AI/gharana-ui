import React, { useState, useEffect } from 'react';
import { Music2, Clock, Flame, Plus, ChevronDown, Radio, Smartphone } from 'lucide-react';
import { TrackItem } from '../types';

interface HeaderProps {
  tracks: TrackItem[];
  activeTrack: TrackItem;
  onSelectTrack: (track: TrackItem) => void;
  onNewTrack: () => void;
  pendingCheckpointsCount: number;
  onOpenMobileApproval?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  tracks,
  activeTrack,
  onSelectTrack,
  onNewTrack,
  pendingCheckpointsCount,
  onOpenMobileApproval
}) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [timeString, setTimeString] = useState('');
  const [ragaInfo, setRagaInfo] = useState({ name: 'Raga Malkauns', timeOfDay: 'Late Night Studio (01:00 - 04:00)' });

  useEffect(() => {
    const updateTimeAndRaga = () => {
      const now = new Date();
      const hours = now.getHours();
      const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      setTimeString(timeStr);

      // Determine Indian Classical Raga according to Prahar (time of day)
      if (hours >= 0 && hours < 4) {
        setRagaInfo({ name: 'Raga Malkauns', timeOfDay: 'Late Night Studio (00:00 - 04:00)' });
      } else if (hours >= 4 && hours < 7) {
        setRagaInfo({ name: 'Raga Ahir Bhairav', timeOfDay: 'Dawn Hours (04:00 - 07:00)' });
      } else if (hours >= 7 && hours < 12) {
        setRagaInfo({ name: 'Raga Bilaval', timeOfDay: 'Morning Studio (07:00 - 12:00)' });
      } else if (hours >= 12 && hours < 16) {
        setRagaInfo({ name: 'Raga Sarang', timeOfDay: 'Afternoon Hours (12:00 - 16:00)' });
      } else if (hours >= 16 && hours < 20) {
        setRagaInfo({ name: 'Raga Yaman / Kalyan', timeOfDay: 'Evening Dusk (16:00 - 20:00)' });
      } else {
        setRagaInfo({ name: 'Raga Bageshri', timeOfDay: 'Night Session (20:00 - 24:00)' });
      }
    };

    updateTimeAndRaga();
    const timer = setInterval(updateTimeAndRaga, 30000);
    return () => clearInterval(timer);
  }, []);

  return (
    <header className="sticky top-0 z-40 glass-panel border-b border-[#342847]/60 bg-[#08060d]/85 px-4 md:px-8 py-3.5 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Brand & Raga Clock */}
        <div className="flex items-center justify-between md:justify-start gap-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-[#f2542d] rounded-sm transform rotate-45 shadow-lg shadow-[#f2542d]/30 flex items-center justify-center">
              <Radio className="w-4 h-4 text-[#08060d] transform -rotate-45 font-bold" />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-serif text-xl tracking-[0.2em] font-light uppercase text-[#f5efe6]">
                  GHARANA
                </h1>
                <span className="text-[10px] font-mono-num px-2 py-0.5 rounded bg-[#241c33] text-[#ffd48a] border border-[#f5b544]/30">
                  v2.5
                </span>
              </div>
              <p className="text-[10px] text-[#a294b8] font-serif italic tracking-wide">
                "the label you never signed with"
              </p>
            </div>
          </div>

          {/* Night Raga Time Pill */}
          <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#120e1b] border border-[#342847] text-xs">
            <Clock className="w-3.5 h-3.5 text-[#f5b544]" />
            <span className="font-mono-num text-[#f5efe6]">{timeString}</span>
            <span className="text-[#6d6183]">|</span>
            <span className="font-serif text-[#ffd48a]">{ragaInfo.name}</span>
            <span className="text-[10px] text-[#a294b8] font-mono-num">({ragaInfo.timeOfDay})</span>
          </div>
        </div>

        {/* Track Selector & Action Bar */}
        <div className="flex items-center gap-3 justify-between md:justify-end">
          {/* Track Dropdown */}
          <div className="relative flex-1 md:flex-initial">
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="w-full md:w-auto flex items-center justify-between gap-3 px-4 py-2 rounded-xl bg-[#120e1b] hover:bg-[#191324] border border-[#342847] text-xs font-sans text-[#f5efe6] transition-all"
            >
              <div className="flex items-center gap-2.5 text-left truncate">
                <Music2 className="w-4 h-4 text-[#ff7a4d] flex-shrink-0" />
                <div className="truncate">
                  <span className="font-serif font-medium text-sm block truncate">
                    {activeTrack.title}
                  </span>
                  <span className="text-[10px] text-[#a294b8] font-mono-num block">
                    {activeTrack.language} • {activeTrack.genre}
                  </span>
                </div>
              </div>
              <ChevronDown className={`w-4 h-4 text-[#a294b8] transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown Menu */}
            {dropdownOpen && (
              <div className="absolute right-0 mt-2 w-72 glass-panel rounded-xl border border-[#342847] bg-[#0d0a14]/95 shadow-2xl py-2 z-50">
                <div className="px-3 py-1.5 text-[10px] font-mono-num text-[#a294b8] uppercase tracking-wider border-b border-[#241c33]">
                  Active Studio Vault Tracks
                </div>
                {tracks.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => {
                      onSelectTrack(t);
                      setDropdownOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2.5 hover:bg-[#191324] flex items-center justify-between transition-colors ${
                      t.id === activeTrack.id ? 'bg-[#241c33]/60 border-l-2 border-[#f2542d]' : ''
                    }`}
                  >
                    <div>
                      <p className="font-serif text-xs font-medium text-[#f5efe6]">{t.title}</p>
                      <p className="text-[10px] text-[#a294b8] font-mono-num">{t.artist} • {t.language}</p>
                    </div>
                    {t.audioMetrics?.integratedLufs && (
                      <span className="text-[10px] font-mono-num text-[#7fe3c0]">
                        {t.audioMetrics.integratedLufs} LUFS
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Mobile Approval View Button */}
          {onOpenMobileApproval && (
            <button
              onClick={onOpenMobileApproval}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#25D366]/20 hover:bg-[#25D366]/30 border border-[#25D366]/40 text-xs font-mono text-[#25D366] transition-all flex-shrink-0"
              title="Test Single-Stage Mobile WhatsApp Approval View"
            >
              <Smartphone className="w-4 h-4 text-[#25D366]" />
              <span className="hidden sm:inline">Mobile Nudge</span>
            </button>
          )}

          {/* Pending Checkpoints Badge */}
          {pendingCheckpointsCount > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#191324] border border-[#f2542d]/50 text-xs text-[#ff7a4d] ember-pulse flex-shrink-0">
              <Flame className="w-4 h-4 text-[#f2542d]" />
              <span className="font-mono-num font-bold">{pendingCheckpointsCount}</span>
              <span className="hidden sm:inline font-sans">Pending Sign-off</span>
            </div>
          )}

          {/* New Track Button */}
          <button
            onClick={onNewTrack}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#f2542d] hover:bg-[#ff7a4d] text-xs font-semibold text-[#08060d] transition-all shadow-md shadow-[#f2542d]/20 flex-shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Ingest New Track</span>
          </button>
        </div>
      </div>
    </header>
  );
};
