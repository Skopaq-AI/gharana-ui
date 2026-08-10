import React, { useState, useEffect } from 'react';
import { Music2, Clock, Flame, Plus, ChevronDown, Radio, Smartphone, Globe } from 'lucide-react';
import { TrackItem } from '../types';

interface HeaderProps {
  tracks: TrackItem[];
  activeTrack: TrackItem;
  onSelectTrack: (track: TrackItem) => void;
  onNewTrack: () => void;
  pendingCheckpointsCount: number;
  onOpenMobileApproval?: () => void;
  onToggleLandingPage?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  tracks,
  activeTrack,
  onSelectTrack,
  onNewTrack,
  pendingCheckpointsCount,
  onOpenMobileApproval,
  onToggleLandingPage
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
    <header className="sticky top-0 z-40 border-b border-[#241c33] bg-[#08060d]/90 backdrop-blur-xl px-4 md:px-6 py-3">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        
        {/* Left Side: Brand & Track Selector */}
        <div className="flex items-center gap-4 min-w-0">
          {/* Studio Brand */}
          <div className="flex items-center gap-2.5 flex-shrink-0">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#f2542d] to-[#ffd48a] flex items-center justify-center shadow-md shadow-[#f2542d]/20">
              <Radio className="w-4 h-4 text-[#08060d] font-bold" />
            </div>
            <div className="hidden sm:block">
              <div className="flex items-center gap-2">
                <span className="font-serif font-bold text-base tracking-wider text-[#f5efe6]">
                  GHARANA
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#1f182d] text-[#ffd48a] border border-[#342847]">
                  v2.5
                </span>
              </div>
            </div>
          </div>

          <span className="hidden sm:inline text-[#342847]">|</span>

          {/* Track Selection Dropdown */}
          <div className="relative min-w-0">
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-[#120e1b] hover:bg-[#1a1426] border border-[#241c33] hover:border-[#342847] text-xs font-sans text-[#f5efe6] transition-all"
            >
              <Music2 className="w-3.5 h-3.5 text-[#f2542d] flex-shrink-0" />
              <div className="text-left truncate">
                <span className="font-serif font-semibold text-xs text-[#f5efe6] block truncate">
                  {activeTrack.title}
                </span>
              </div>
              <span className="hidden md:inline-block px-2 py-0.5 rounded bg-[#08060d] text-[10px] font-mono text-[#a294b8] border border-[#241c33]">
                {activeTrack.language}
              </span>
              <ChevronDown className={`w-3.5 h-3.5 text-[#a294b8] transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown Menu */}
            {dropdownOpen && (
              <div className="absolute left-0 mt-2 w-72 bg-[#120e1b] rounded-2xl border border-[#342847] shadow-2xl py-2 z-50">
                <div className="px-3.5 py-1.5 text-[10px] font-mono text-[#a294b8] uppercase tracking-wider border-b border-[#241c33]">
                  Active Studio Tracks
                </div>
                <div className="max-h-64 overflow-y-auto">
                  {tracks.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => {
                        onSelectTrack(t);
                        setDropdownOpen(false);
                      }}
                      className={`w-full text-left px-3.5 py-2.5 hover:bg-[#1a1426] flex items-center justify-between transition-colors ${
                        t.id === activeTrack.id ? 'bg-[#1a1426] border-l-2 border-[#f2542d] text-[#ffd48a]' : 'text-[#f5efe6]'
                      }`}
                    >
                      <div className="truncate pr-2">
                        <p className="font-serif text-xs font-medium truncate">{t.title}</p>
                        <p className="text-[10px] text-[#a294b8] font-mono">{t.artist} • {t.language}</p>
                      </div>
                      {t.audioMetrics?.integratedLufs && (
                        <span className="text-[10px] font-mono text-[#43c9a0] flex-shrink-0">
                          {t.audioMetrics.integratedLufs} LUFS
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Status Badges & Direct Actions */}
        <div className="flex items-center gap-2.5 flex-shrink-0">
          
          {/* Subtle Studio Clock */}
          <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#120e1b] border border-[#241c33] text-xs font-mono text-[#a294b8]">
            <Clock className="w-3.5 h-3.5 text-[#ffd48a]" />
            <span className="text-[#f5efe6]">{timeString}</span>
            <span>•</span>
            <span className="text-[#ffd48a] font-serif text-[11px]">{ragaInfo.name}</span>
          </div>

          {/* Pending Sign-offs Indicator */}
          {pendingCheckpointsCount > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#f2542d]/10 border border-[#f2542d]/30 text-xs font-mono text-[#f2542d]">
              <Flame className="w-3.5 h-3.5 text-[#f2542d]" />
              <span className="font-bold">{pendingCheckpointsCount}</span>
              <span className="hidden sm:inline">Checkpoints</span>
            </div>
          )}

          {/* WhatsApp Mobile Approval Trigger */}
          {onOpenMobileApproval && (
            <button
              onClick={onOpenMobileApproval}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#25D366]/10 hover:bg-[#25D366]/20 border border-[#25D366]/30 text-xs font-mono text-[#25D366] transition-all"
              title="Test Single-Stage WhatsApp Mobile Approval"
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">WhatsApp Nudge</span>
            </button>
          )}

          {/* Landing Page Switcher */}
          {onToggleLandingPage && (
            <button
              onClick={onToggleLandingPage}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#120e1b] hover:bg-[#1a1426] border border-[#241c33] hover:border-[#342847] text-xs font-mono text-[#a294b8] hover:text-[#f5efe6] transition-all"
              title="View Product Landing Page"
            >
              <Globe className="w-3.5 h-3.5 text-[#ffd48a]" />
              <span className="hidden md:inline">Landing Page</span>
            </button>
          )}

          {/* Primary Action Button */}
          <button
            onClick={onNewTrack}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#f2542d] hover:bg-[#ff7a4d] text-white font-mono font-bold text-xs shadow-lg shadow-[#f2542d]/20 transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Ingest Track</span>
          </button>
        </div>

      </div>
    </header>
  );
};
