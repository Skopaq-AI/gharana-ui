import React, { useState } from 'react';
import { Rocket, CheckCircle2, Circle, Radio, Image as ImageIcon, Send, Share2, TrendingUp, Sparkles } from 'lucide-react';
import { TrackItem, ReleaseChecklistTask } from '../../types';
import { HumanCheckpointCard } from '../HumanCheckpointCard';
import { PageHeader, SectionCard, SectionHeader, StatCard } from '../SectionPanel';

interface ReleaseDeliveryTabProps {
  track: TrackItem;
  onUpdateTrack: (updated: TrackItem) => void;
  onInspectRaw: (title: string, payload: any) => void;
}

export const ReleaseDeliveryTab: React.FC<ReleaseDeliveryTabProps> = ({
  track,
  onUpdateTrack,
  onInspectRaw
}) => {
  const [tasks, setTasks] = useState<ReleaseChecklistTask[]>(track.releaseTasks || []);
  const [pitchText, setPitchText] = useState(
    `"${track.title}" by ${track.artist} is a fusion of ${track.genre} and South Asian regional melodies (${track.language}). Recorded in a home studio, it bridges classical phrasing with contemporary bedroom production.`
  );
  const [pitchSaved, setPitchSaved] = useState(false);

  const toggleTask = (id: string) => {
    const updated = tasks.map((t) =>
      t.id === id ? { ...t, completed: !t.completed } : t
    );
    setTasks(updated);
    onUpdateTrack({
      ...track,
      releaseTasks: updated
    });
  };

  const handleApprovePitch = () => {
    const updatedTasks = tasks.map((t) =>
      t.id === 't4' ? { ...t, completed: true, approvalStatus: 'approved' as const } : t
    );
    setTasks(updatedTasks);
    onUpdateTrack({
      ...track,
      releaseTasks: updatedTasks
    });
  };

  const handleRejectPitch = () => {
    const updatedTasks = tasks.map((t) =>
      t.id === 't4' ? { ...t, approvalStatus: 'rejected' as const } : t
    );
    setTasks(updatedTasks);
    onUpdateTrack({
      ...track,
      releaseTasks: updatedTasks
    });
  };

  const completedCount = tasks.filter((t) => t.completed).length;
  const progressPercent = Math.round((completedCount / (tasks.length || 1)) * 100);

  return (
    <div className="space-y-6">
      {/* Standardized Page Header */}
      <PageHeader
        icon={Rocket}
        title="Release Delivery & Distribution Pipeline"
        description="Distribution checklist, editorial pitching, artwork compliance, and launch orchestration."
        badge="DDEX Ready"
        action={
          <div className="min-w-[180px] bg-[#08060d] p-3 rounded-xl border border-[#241c33]">
            <div className="flex justify-between items-center text-xs font-mono mb-1.5">
              <span className="text-[#a294b8]">Readiness</span>
              <span className="text-[#43c9a0] font-bold">{progressPercent}%</span>
            </div>
            <div className="h-2 bg-[#120e1b] rounded-full overflow-hidden border border-[#241c33]">
              <div
                className="h-full bg-gradient-to-r from-[#f2542d] to-[#43c9a0] transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        }
      />

      {/* Human Approval Checkpoint for Pitch */}
      <HumanCheckpointCard
        title="Spotify & Apple Music Editorial Pitch Draft"
        recommendation="Submit pitch text 14 days prior to release date to maximize curator placement on Radar India & Desi Chill."
        status={tasks.find((t) => t.id === 't4')?.approvalStatus || 'pending_artist_approval'}
        agentName="GHARANA Editorial Pitch Agent"
        onApprove={handleApprovePitch}
        onReject={handleRejectPitch}
        onInspectRawPayload={() => onInspectRaw("Release Pitching Payload", { pitchText, track: track.title, artist: track.artist })}
      />

      {/* Grid: Delivery Checklist vs Pitching & Growth */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left 2 Cols: Checklist Tasks */}
        <div className="lg:col-span-2 space-y-4">
          <div className="p-6 glass-panel rounded-2xl border border-[#342847] bg-[#0d0a14]/80 space-y-4">
            <h3 className="font-serif text-base font-semibold text-[#f5efe6] border-b border-[#241c33] pb-3">
              Distribution Vault Checklist
            </h3>

            <div className="space-y-3">
              {tasks.map((task) => (
                <div
                  key={task.id}
                  onClick={() => toggleTask(task.id)}
                  className={`p-4 rounded-xl border transition-all cursor-pointer flex items-start gap-3.5 ${
                    task.completed 
                      ? 'bg-[#0d0a14] border-[#21a882]/40 text-[#a294b8]' 
                      : 'bg-[#120e1b] border-[#342847] text-[#f5efe6] hover:border-[#f5b544]/50'
                  }`}
                >
                  <div className="mt-0.5 flex-shrink-0">
                    {task.completed ? (
                      <CheckCircle2 className="w-5 h-5 text-[#43c9a0]" />
                    ) : (
                      <Circle className="w-5 h-5 text-[#6d6183]" />
                    )}
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-mono-num uppercase px-2 py-0.5 rounded bg-[#241c33] text-[#ffd48a]">
                        {task.category}
                      </span>
                      <h4 className={`font-serif text-sm font-semibold ${task.completed ? 'line-through text-[#a294b8]' : 'text-[#f5efe6]'}`}>
                        {task.title}
                      </h4>
                    </div>
                    <p className="text-xs font-serif text-[#a294b8] mt-1">
                      {task.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Col: Editorial Pitching & Growth Playbook */}
        <div className="space-y-6">
          
          {/* Spotify Pitch Editor */}
          <div className="p-6 glass-panel rounded-2xl border border-[#342847] bg-[#0d0a14]/80 space-y-3">
            <div className="flex justify-between items-center">
              <h4 className="font-serif text-sm font-semibold text-[#f5efe6] flex items-center gap-2">
                <Send className="w-4 h-4 text-[#f2542d]" />
                Editorial Pitch Draft
              </h4>
              <button
                onClick={() => {
                  setPitchSaved(true);
                  setTimeout(() => setPitchSaved(false), 2000);
                }}
                className="text-[11px] font-mono-num text-[#ffd48a] hover:underline"
              >
                {pitchSaved ? 'Saved' : 'Save Text'}
              </button>
            </div>

            <textarea
              value={pitchText}
              onChange={(e) => setPitchText(e.target.value)}
              rows={5}
              className="w-full bg-[#08060d] border border-[#241c33] rounded-xl p-3 font-serif text-xs text-[#f5efe6] focus:outline-none focus:border-[#f5b544]"
            />

            <p className="text-[10px] text-[#6d6183] font-serif">
              Max 500 characters for Spotify for Artists editorial pitch submission.
            </p>
          </div>

          {/* Post-Release Growth Playbook */}
          <div className="p-6 glass-panel rounded-2xl border border-[#342847] space-y-3">
            <h4 className="font-serif text-sm font-semibold text-[#f5efe6] flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-[#a56bd6]" />
              Post-Release Growth Playbook
            </h4>

            <div className="space-y-2.5 text-xs font-serif text-[#f5efe6]/90">
              <div className="p-3 rounded-xl bg-[#120e1b] border border-[#241c33]">
                <strong className="text-[#ffd48a] block mb-0.5">Day 1 - 3: Short Audio Clip Blitz</strong>
                <p className="text-[11px] text-[#a294b8]">Post the 15-second chorus hook video on Instagram Reels & YouTube Shorts using local regional audio hashtags.</p>
              </div>

              <div className="p-3 rounded-xl bg-[#120e1b] border border-[#241c33]">
                <strong className="text-[#43c9a0] block mb-0.5">Day 7: Independent Playlist Pitching</strong>
                <p className="text-[11px] text-[#a294b8]">Submit track to top 20 South Asian indie curators on SubmitHub & Groover.</p>
              </div>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
