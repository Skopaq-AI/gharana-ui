import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, Volume2, VolumeX, Activity, BarChart2, Radio, Terminal } from 'lucide-react';
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
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const metrics = track.audioMetrics;
  const duration = track.durationSeconds || 180;

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

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainder = Math.floor(secs % 60);
    return `${mins.toString().padStart(2, '0')}:${remainder.toString().padStart(2, '0')}`;
  };

  const progressPercent = (currentTime / duration) * 100;

  return (
    <div className="glass-panel border-t border-[#342847]/80 bg-[#0d0a14]/90 p-4 md:px-8 py-3 rounded-2xl mb-6">
      <div className="flex flex-col lg:flex-row items-center justify-between gap-4">
        
        {/* Track Metadata & Play Controls */}
        <div className="flex items-center gap-4 w-full lg:w-auto">
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="w-12 h-12 rounded-xl bg-[#f2542d] hover:bg-[#ff7a4d] text-[#08060d] flex items-center justify-center font-bold transition-all shadow-lg shadow-[#f2542d]/30 flex-shrink-0"
            title={isPlaying ? "Pause Track" : "Play Track"}
          >
            {isPlaying ? <Pause className="w-6 h-6 fill-current" /> : <Play className="w-6 h-6 fill-current ml-0.5" />}
          </button>

          <div className="min-w-[180px]">
            <h3 className="font-serif text-base font-semibold text-[#f5efe6] truncate">
              {track.title}
            </h3>
            <p className="text-xs text-[#a294b8] font-mono-num">
              {track.artist} • <span className="text-[#ffd48a]">{track.keySignature || 'Key N/A'}</span>
            </p>
          </div>

          <div className="hidden sm:flex items-center gap-2 font-mono-num text-xs text-[#a294b8] ml-2">
            <span className="text-[#f5efe6]">{formatTime(currentTime)}</span>
            <span>/</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Real Audio Measured Values / Waveform Honest Visualizer */}
        <div className="flex-1 w-full max-w-xl mx-2">
          <div className="flex justify-between items-center text-[10px] font-mono-num text-[#a294b8] mb-1">
            <span className="flex items-center gap-1.5 text-[#ffd48a]">
              <Activity className="w-3.5 h-3.5" />
              MEASURED LUFS OVER TIME
            </span>
            <span>
              {metrics?.integratedLufs !== undefined ? (
                <span className="text-[#7fe3c0] font-bold">
                  {metrics.integratedLufs} LUFS Integrated
                </span>
              ) : (
                <span className="text-[#a294b8] italic">Not measured yet</span>
              )}
            </span>
          </div>

          {/* Real Measured LUFS Bars or Not Measured Banner */}
          {metrics?.lufsOverTime && metrics.lufsOverTime.length > 0 ? (
            <div className="relative h-9 bg-[#08060d] rounded-lg p-1 border border-[#241c33] flex items-end gap-1 overflow-hidden">
              {metrics.lufsOverTime.map((lufsVal, idx) => {
                // Map LUFS (-30 to -6 LUFS) to percentage height (10% to 100%)
                const normalizedHeight = Math.min(100, Math.max(15, ((lufsVal + 30) / 24) * 100));
                const isCurrentBlock = Math.floor((idx / metrics.lufsOverTime!.length) * 100) <= progressPercent;

                return (
                  <div
                    key={idx}
                    className={`flex-1 rounded-xs transition-all duration-300 ${
                      isCurrentBlock 
                        ? lufsVal > -11.0 
                          ? 'bg-[#ff7a4d]' 
                          : 'bg-[#43c9a0]' 
                        : 'bg-[#241c33]'
                    }`}
                    style={{ height: `${normalizedHeight}%` }}
                    title={`Second ${idx * 12}s: ${lufsVal} LUFS`}
                  />
                );
              })}

              {/* Playhead progress overlay */}
              <div 
                className="absolute top-0 bottom-0 w-0.5 bg-[#f5b544] shadow-[0_0_8px_#f5b544] pointer-events-none transition-all duration-300"
                style={{ left: `${progressPercent}%` }}
              />
            </div>
          ) : (
            <div className="h-9 bg-[#08060d] rounded-lg border border-[#241c33] flex items-center justify-center text-xs text-[#a294b8] font-mono-num">
              No waveform synthesis drawn — Audio measurements pending
            </div>
          )}
        </div>

        {/* Precise Numerical Readouts */}
        <div className="flex items-center gap-4 flex-wrap justify-end font-mono-num text-xs">
          <div className="text-right">
            <p className="text-[10px] text-[#6d6183] uppercase">True Peak</p>
            <p className="text-[#f5efe6] font-semibold">
              {metrics?.truePeakDbtp !== undefined ? `${metrics.truePeakDbtp} dBTP` : 'Not measured'}
            </p>
          </div>

          <div className="text-right">
            <p className="text-[10px] text-[#6d6183] uppercase">Dynamic Range</p>
            <p className="text-[#f5efe6] font-semibold">
              {metrics?.dynamicRangeLu !== undefined ? `${metrics.dynamicRangeLu} LU` : 'Not measured'}
            </p>
          </div>

          <button
            onClick={onInspectRawMetrics}
            className="p-2 rounded-lg bg-[#191324] hover:bg-[#241c33] border border-[#342847] text-[#f5b544] transition-colors"
            title="Inspect Raw Audio DSP Payload"
          >
            <Terminal className="w-4 h-4" />
          </button>
        </div>

      </div>
    </div>
  );
};
