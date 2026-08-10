import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, Volume2, VolumeX, Activity, BarChart2, Radio, Terminal, RotateCcw, RotateCw } from 'lucide-react';
import { TrackItem } from '../types';

interface AudioPlayerBarProps {
  track: TrackItem;
  onInspectRawMetrics: () => void;
}

export const AudioPlayerBar: React.FC<AudioPlayerBarProps> = ({
  track,
  onInspectRawMetrics
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [animSeed, setAnimSeed] = useState(0);
  const waveformRef = useRef<HTMLDivElement | null>(null);

  const metrics = track.audioMetrics;
  const duration = track.durationSeconds || 180;

  // Playback timer tick
  useEffect(() => {
    let interval: any = null;
    if (isPlaying) {
      interval = setInterval(() => {
        setCurrentTime((prev) => {
          if (prev >= duration) {
            setIsPlaying(false);
            return 0;
          }
          return prev + 1;
        });
      }, 1000);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [isPlaying, duration]);

  // Dynamic animation frame effect for real-time waveform bounce while playing
  useEffect(() => {
    let animFrame: number;
    if (isPlaying) {
      const loop = () => {
        setAnimSeed((prev) => (prev + 1) % 100);
        animFrame = requestAnimationFrame(loop);
      };
      animFrame = requestAnimationFrame(loop);
    }
    return () => cancelAnimationFrame(animFrame);
  }, [isPlaying]);

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainder = Math.floor(secs % 60);
    return `${mins.toString().padStart(2, '0')}:${remainder.toString().padStart(2, '0')}`;
  };

  const progressPercent = Math.min(100, Math.max(0, (currentTime / duration) * 100));

  // Handle clicking on waveform to seek position
  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!waveformRef.current) return;
    const rect = waveformRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percentage = Math.max(0, Math.min(1, clickX / rect.width));
    const newTime = Math.round(percentage * duration);
    setCurrentTime(newTime);
  };

  const handleSkip = (seconds: number) => {
    setCurrentTime((prev) => Math.max(0, Math.min(duration, prev + seconds)));
  };

  // Generate 48 waveform bar heights based on LUFS measurements or track characteristics
  const totalBars = 48;
  const rawLufs = metrics?.lufsOverTime || [];
  
  const waveformBars = Array.from({ length: totalBars }, (_, idx) => {
    let baseHeight = 30;

    if (rawLufs.length > 0) {
      const sampleIdx = Math.floor((idx / totalBars) * rawLufs.length);
      const lufsVal = rawLufs[sampleIdx] ?? -14;
      baseHeight = Math.min(100, Math.max(15, ((lufsVal + 28) / 22) * 100));
    } else {
      // Deterministic pseudo-waveform seed based on track ID and index
      const hash = (track.id.charCodeAt(idx % track.id.length) * (idx + 1) * 37) % 80;
      baseHeight = 20 + hash;
    }

    // Apply live dynamic audio modulation if currently playing near this bar
    const barProgress = (idx / totalBars) * 100;
    const isPlayingBar = Math.abs(barProgress - progressPercent) < 4;
    
    let currentHeight = baseHeight;
    if (isPlaying && isPlayingBar) {
      const livePulse = Math.sin((animSeed * 0.2) + idx) * 18;
      currentHeight = Math.min(100, Math.max(15, baseHeight + livePulse));
    } else if (isPlaying) {
      const ambientPulse = Math.cos((animSeed * 0.1) + idx * 0.5) * 6;
      currentHeight = Math.min(100, Math.max(10, baseHeight + ambientPulse));
    }

    return {
      index: idx,
      height: currentHeight,
      barProgress,
      isPlayed: barProgress <= progressPercent
    };
  });

  // Frequency bins live visualizer values
  const freqData = metrics?.frequencyBins || {
    subBass: -18,
    bass: -12,
    lowMid: -14,
    mid: -10,
    highMid: -16,
    highs: -22
  };

  const freqBands = [
    { label: 'SUB', db: freqData.subBass, color: '#f2542d' },
    { label: 'BASS', db: freqData.bass, color: '#ffd48a' },
    { label: 'LMID', db: freqData.lowMid, color: '#ffd48a' },
    { label: 'MID', db: freqData.mid, color: '#43c9a0' },
    { label: 'HMID', db: freqData.highMid, color: '#43c9a0' },
    { label: 'HIGH', db: freqData.highs, color: '#a294b8' }
  ];

  return (
    <div className="glass-panel border-t border-[#342847]/80 bg-[#0d0a14]/90 p-4 md:px-8 py-3.5 rounded-2xl mb-6 shadow-xl space-y-3">
      <div className="flex flex-col lg:flex-row items-center justify-between gap-4">
        
        {/* Track Metadata & Play Controls */}
        <div className="flex items-center gap-3 w-full lg:w-auto">
          <button
            onClick={() => handleSkip(-10)}
            className="p-2 rounded-xl bg-[#08060d] hover:bg-[#191324] border border-[#241c33] text-[#a294b8] hover:text-[#f5efe6] transition-colors"
            title="Rewind 10s"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="w-12 h-12 rounded-2xl bg-[#f2542d] hover:bg-[#ff7a4d] text-white flex items-center justify-center font-bold transition-all shadow-lg shadow-[#f2542d]/30 flex-shrink-0 hover:scale-105"
            title={isPlaying ? "Pause Track" : "Play Track"}
          >
            {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
          </button>

          <button
            onClick={() => handleSkip(10)}
            className="p-2 rounded-xl bg-[#08060d] hover:bg-[#191324] border border-[#241c33] text-[#a294b8] hover:text-[#f5efe6] transition-colors"
            title="Forward 10s"
          >
            <RotateCw className="w-4 h-4" />
          </button>

          <div className="min-w-[170px]">
            <div className="flex items-center gap-2">
              <h3 className="font-serif text-sm font-bold text-[#f5efe6] truncate">
                {track.title}
              </h3>
              {isPlaying && (
                <span className="w-2 h-2 rounded-full bg-[#43c9a0] animate-ping" />
              )}
            </div>
            <p className="text-xs text-[#a294b8] font-mono-num">
              {track.artist} • <span className="text-[#ffd48a] font-semibold">{track.keySignature || 'Key N/A'}</span>
            </p>
          </div>

          <div className="hidden sm:flex items-center gap-1.5 font-mono-num text-xs text-[#a294b8] ml-1 bg-[#08060d] px-2.5 py-1 rounded-xl border border-[#241c33]">
            <span className="text-[#f5efe6] font-bold">{formatTime(currentTime)}</span>
            <span>/</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Dynamic Waveform Visualizer & Interactive Scrubber */}
        <div className="flex-1 w-full max-w-xl mx-2 space-y-1.5">
          <div className="flex justify-between items-center text-[10px] font-mono-num text-[#a294b8]">
            <span className="flex items-center gap-1.5 text-[#ffd48a] font-bold">
              <Activity className="w-3.5 h-3.5 text-[#f2542d]" />
              DYNAMIC DSP WAVEFORM SCRUBBER
            </span>
            <span className="flex items-center gap-2">
              {isPlaying ? (
                <span className="text-[#43c9a0] font-bold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#43c9a0] animate-pulse" />
                  AUDIO PLAYBACK LIVE
                </span>
              ) : (
                <span className="text-[#a294b8]">Click waveform to seek</span>
              )}
              {metrics?.integratedLufs !== undefined && (
                <span className="text-[#43c9a0] font-bold">
                  • {metrics.integratedLufs} LUFS
                </span>
              )}
            </span>
          </div>

          {/* Interactive Waveform Bar Container */}
          <div
            ref={waveformRef}
            onClick={handleSeek}
            className="relative h-11 bg-[#08060d] rounded-xl p-1.5 border border-[#241c33] hover:border-[#342847] cursor-pointer flex items-end gap-0.5 overflow-hidden group select-none transition-colors"
            title="Click to seek playback position"
          >
            {waveformBars.map((bar) => (
              <div
                key={bar.index}
                className={`flex-1 rounded-sm transition-all duration-150 ${
                  bar.isPlayed
                    ? isPlaying
                      ? 'bg-gradient-to-t from-[#f2542d] to-[#ffd48a] shadow-[0_0_8px_rgba(242,84,45,0.4)]'
                      : 'bg-[#ffd48a]'
                    : 'bg-[#241c33] group-hover:bg-[#2d2340]'
                }`}
                style={{ height: `${bar.height}%` }}
              />
            ))}

            {/* Glowing Playhead indicator line */}
            <div
              className="absolute top-0 bottom-0 w-1 bg-[#f2542d] shadow-[0_0_12px_#f2542d] pointer-events-none transition-all duration-200 z-10 rounded-full"
              style={{ left: `${progressPercent}%` }}
            >
              <div className="w-2.5 h-2.5 rounded-full bg-[#ffd48a] border border-[#f2542d] -ml-0.75 -mt-0.5 shadow-md" />
            </div>
          </div>
        </div>

        {/* Live Frequency Spectrum & Raw Metrics Trigger */}
        <div className="flex items-center gap-3 justify-end font-mono-num text-xs w-full sm:w-auto">
          {/* 6-Band Mini EQ Analyzer */}
          <div className="hidden xl:flex items-center gap-1 bg-[#08060d] p-2 rounded-xl border border-[#241c33]">
            {freqBands.map((band, idx) => {
              const normHeight = Math.min(100, Math.max(15, ((band.db + 30) / 25) * 100));
              const liveHeight = isPlaying
                ? Math.min(100, Math.max(15, normHeight + Math.sin(animSeed * 0.3 + idx) * 20))
                : normHeight;

              return (
                <div key={band.label} className="flex flex-col items-center gap-1 w-3">
                  <div className="w-1.5 h-6 bg-[#120e1b] rounded-full overflow-hidden flex items-end">
                    <div
                      className="w-full rounded-full transition-all duration-150"
                      style={{
                        height: `${liveHeight}%`,
                        backgroundColor: band.color
                      }}
                    />
                  </div>
                  <span className="text-[8px] text-[#a294b8]">{band.label}</span>
                </div>
              );
            })}
          </div>

          <div className="text-right hidden sm:block">
            <p className="text-[9px] text-[#a294b8] uppercase font-bold">True Peak</p>
            <p className="text-[#f5efe6] font-bold">
              {metrics?.truePeakDbtp !== undefined ? `${metrics.truePeakDbtp} dBTP` : 'N/A'}
            </p>
          </div>

          <button
            onClick={() => setIsMuted(!isMuted)}
            className="p-2 rounded-xl bg-[#08060d] hover:bg-[#191324] border border-[#241c33] text-[#a294b8] hover:text-[#f5efe6] transition-colors"
            title={isMuted ? "Unmute" : "Mute"}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-[#f2542d]" /> : <Volume2 className="w-4 h-4" />}
          </button>

          <button
            onClick={onInspectRawMetrics}
            className="p-2 rounded-xl bg-[#191324] hover:bg-[#241c33] border border-[#342847] text-[#ffd48a] transition-colors flex items-center gap-1.5 text-xs font-mono"
            title="Inspect Raw Audio DSP Payload"
          >
            <Terminal className="w-4 h-4" />
            <span className="hidden sm:inline">Raw DSP</span>
          </button>
        </div>

      </div>
    </div>
  );
};

