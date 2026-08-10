import React, { useState } from 'react';
import { 
  CheckCircle2, 
  Clock, 
  ChevronDown, 
  ChevronUp, 
  Sliders, 
  BookOpen, 
  Shield, 
  Rocket, 
  Sparkles 
} from 'lucide-react';
import { TrackItem } from '../types';

interface PipelineProgressTrackerProps {
  track: TrackItem;
  activeStage?: 'lyrics' | 'mix_qc' | 'ar' | 'splits' | 'release';
  className?: string;
}

export const PipelineProgressTracker: React.FC<PipelineProgressTrackerProps> = ({
  track,
  activeStage,
  className = ''
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  // Evaluate 5 core pipeline milestones
  const stages = [
    {
      id: 'ar',
      label: 'A&R Direction',
      icon: Sparkles,
      completed: track.arAssessment?.checkpointStatus === 'approved',
      statusText: track.arAssessment?.checkpointStatus === 'approved'
        ? 'A&R Approved'
        : track.arAssessment?.checkpointStatus === 'pending_artist_approval'
        ? 'Pending Approval'
        : 'A&R Drafted'
    },
    {
      id: 'lyrics',
      label: 'Lyric Prosody',
      icon: BookOpen,
      completed: track.lyricAnalysis?.checkpointStatus === 'approved',
      statusText: track.lyricAnalysis?.checkpointStatus === 'approved'
        ? 'Prosody Verified'
        : 'Drafting Meter'
    },
    {
      id: 'mix_qc',
      label: 'Mix QC DSP',
      icon: Sliders,
      completed: Boolean(
        track.audioMetrics && 
        track.audioMetrics.integratedLufs && 
        track.audioMetrics.truePeakDbtp && 
        track.audioMetrics.truePeakDbtp <= -0.5
      ),
      statusText: track.audioMetrics?.truePeakDbtp && track.audioMetrics.truePeakDbtp <= -0.5
        ? 'Master Locked'
        : 'QC Check Pending'
    },
    {
      id: 'splits',
      label: 'Rights & Splits',
      icon: Shield,
      completed: track.splitGovernance?.checkpointStatus === 'approved',
      statusText: track.splitGovernance?.checkpointStatus === 'approved'
        ? '100% Cleared'
        : 'Splits Pending Signatures'
    },
    {
      id: 'release',
      label: 'Release Delivery',
      icon: Rocket,
      completed: track.releaseTasks?.length > 0 && track.releaseTasks.every(t => t.completed),
      statusText: `${track.releaseTasks?.filter(t => t.completed).length || 0}/${track.releaseTasks?.length || 0} Tasks`
    }
  ];

  // Factor in individual releaseTasks completed count for granular percentage
  const releaseTasksCompleted = track.releaseTasks?.filter(t => t.completed).length || 0;
  const totalReleaseTasks = track.releaseTasks?.length || 1;
  const releaseTaskRatio = releaseTasksCompleted / totalReleaseTasks;

  // Stages completed count
  const completedStagesCount = stages.filter(s => s.completed).length;
  
  // Overall weighted percentage calculation (60% milestone stage weight + 40% task ratio weight)
  const stagePercentage = (completedStagesCount / stages.length) * 100;
  const taskPercentage = releaseTaskRatio * 100;
  const overallPercentage = Math.round((stagePercentage * 0.6) + (taskPercentage * 0.4));

  return (
    <div className={`p-5 rounded-2xl bg-[#120e1b] border border-[#241c33] shadow-lg space-y-4 ${className}`}>
      {/* Top Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="relative flex items-center justify-center w-12 h-12 rounded-xl bg-[#08060d] border border-[#241c33] flex-shrink-0">
            {/* SVG Circular Ring Indicator */}
            <svg className="w-10 h-10 -rotate-90" viewBox="0 0 36 36">
              <path
                className="text-[#241c33]"
                strokeWidth="3"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
              <path
                className="text-[#f2542d] transition-all duration-700 ease-out"
                strokeDasharray={`${overallPercentage}, 100`}
                strokeWidth="3.2"
                strokeLinecap="round"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
            </svg>
            <span className="absolute font-mono text-xs font-bold text-[#f5efe6]">
              {overallPercentage}%
            </span>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-serif text-sm font-bold text-[#f5efe6]">
                Pipeline Track Delivery Progress
              </h3>
              <span className="px-2 py-0.5 rounded-full bg-[#43c9a0]/10 text-[#43c9a0] border border-[#43c9a0]/30 font-mono text-[10px] font-bold">
                {overallPercentage >= 80 ? 'Ready for Delivery' : overallPercentage >= 50 ? 'In Production' : 'Initial Phase'}
              </span>
            </div>
            <p className="font-mono text-xs text-[#a294b8]">
              {completedStagesCount} of {stages.length} milestones cleared • {releaseTasksCompleted}/{totalReleaseTasks} release checklist items complete
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#08060d] hover:bg-[#191324] border border-[#241c33] text-xs font-mono text-[#a294b8] hover:text-[#f5efe6] transition-colors self-start sm:self-center"
        >
          <span>{isExpanded ? 'Hide Breakdown' : 'View Milestones'}</span>
          {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Progress Bar */}
      <div className="space-y-1.5">
        <div className="h-2.5 w-full bg-[#08060d] rounded-full overflow-hidden border border-[#241c33] p-0.5">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[#f2542d] via-[#ffd48a] to-[#43c9a0] transition-all duration-500 shadow-[0_0_12px_rgba(242,84,45,0.4)]"
            style={{ width: `${overallPercentage}%` }}
          />
        </div>
      </div>

      {/* Expanded Stage Grid */}
      {isExpanded && (
        <div className="pt-3 border-t border-[#241c33] grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {stages.map((st) => {
            const StageIcon = st.icon;
            const isCurrent = activeStage === st.id;
            return (
              <div
                key={st.id}
                className={`p-3 rounded-xl border transition-all ${
                  isCurrent
                    ? 'bg-[#191324] border-[#f2542d]/50 shadow-md ring-1 ring-[#f2542d]/30'
                    : 'bg-[#08060d] border-[#241c33]'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="p-1.5 rounded-lg bg-[#120e1b] border border-[#241c33] text-[#ffd48a]">
                    <StageIcon className="w-3.5 h-3.5" />
                  </div>
                  {st.completed ? (
                    <CheckCircle2 className="w-4 h-4 text-[#43c9a0]" />
                  ) : (
                    <Clock className="w-4 h-4 text-[#a294b8]/50" />
                  )}
                </div>
                <div className="font-serif text-xs font-bold text-[#f5efe6] truncate">
                  {st.label}
                </div>
                <div className="font-mono text-[10px] text-[#a294b8] truncate mt-0.5">
                  {st.statusText}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
