import React from 'react';
import {
  Sliders,
  Sparkles,
  BookOpen,
  Users,
  Rocket,
  TrendingUp,
  Store,
  Settings,
  ChevronLeft,
  ChevronRight,
  Music2,
  Flame
} from 'lucide-react';
import { TrackItem, ActiveTab } from '../types';

interface SidebarProps {
  tracks: TrackItem[];
  /** null until a project is selected (or while projects are still loading). */
  activeTrack: TrackItem | null;
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  onSelectTrack: (trackId: string) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  pendingCheckpointsCount: number;
  onOpenMobileApproval?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  tracks,
  activeTrack,
  activeTab,
  onSelectTab,
  onSelectTrack,
  isCollapsed,
  onToggleCollapse,
  pendingCheckpointsCount,
  onOpenMobileApproval
}) => {
  const menuItems = [
    // First in the list because it is the front door: an artist describes what
    // they want in a sentence and gets a plan, instead of learning what a
    // pipeline template is before the software will talk to them.
    { id: 'overview' as ActiveTab, label: 'Start Here', category: 'Release', icon: Sparkles },
    { id: 'mix_qc' as ActiveTab, label: 'Mix QC & Mastering', category: 'Audio Production', icon: Sliders },
    { id: 'ar_feedback' as ActiveTab, label: 'A&R Direction', category: 'Audio Production', icon: Sparkles },
    { id: 'lyrics' as ActiveTab, label: 'Lyrics & Meter', category: 'Creative & Prosody', icon: BookOpen },
    { id: 'splits' as ActiveTab, label: 'Rights & Splits', category: 'Governance', icon: Users },
    { id: 'release' as ActiveTab, label: 'Release Delivery', category: 'Distribution', icon: Rocket },
    { id: 'growth' as ActiveTab, label: 'Post-Release Growth', category: 'Analytics', icon: TrendingUp },
    { id: 'marketplace' as ActiveTab, label: 'Agent Marketplace', category: 'Ecosystem', icon: Store },
    { id: 'settings' as ActiveTab, label: 'Studio Settings', category: 'System', icon: Settings }
  ];

  return (
    <aside
      className={`bg-bg/95 border-r border-line transition-all duration-300 flex flex-col justify-between flex-shrink-0 z-30 relative select-none ${
        isCollapsed ? 'w-16 md:w-20' : 'w-72'
      }`}
    >
      
      {/* Top Header & Brand */}
      <div>
        <div className="p-4 flex items-center justify-between border-b border-line">
          
          {!isCollapsed && (
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-accent to-caution flex items-center justify-center shadow-lg shadow-[var(--accent-dim)] flex-shrink-0">
                <Music2 className="w-4 h-4 text-bg font-bold" />
              </div>
              <div className="truncate">
                <span className="font-serif font-bold text-sm tracking-wide text-ink block truncate">
                  GHARANA
                </span>
                <span className="text-[9px] font-mono text-muted uppercase tracking-wider block">
                  AI Music Studio
                </span>
              </div>
            </div>
          )}

          {isCollapsed && (
            <div className="w-full flex justify-center">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-accent to-caution flex items-center justify-center shadow-lg shadow-[var(--accent-dim)]">
                <Music2 className="w-4 h-4 text-bg font-bold" />
              </div>
            </div>
          )}

          {/* Collapse Toggle Button */}
          <button
            onClick={onToggleCollapse}
            className={`p-1.5 rounded-xl bg-surface hover:bg-line text-muted hover:text-ink transition-colors ${
              isCollapsed ? 'mt-2 mx-auto' : ''
            }`}
            title={isCollapsed ? 'Expand Navigation Sidebar' : 'Collapse Sidebar'}
          >
            {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* Navigation Items List */}
        <nav className="p-3 space-y-1 overflow-y-auto max-h-[calc(100vh-380px)] scrollbar-none">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl text-xs font-sans transition-all relative group ${
                  isActive
                    ? 'bg-surface text-caution border border-caution/40 shadow-lg shadow-surface/50 font-bold'
                    : 'text-muted hover:text-ink hover:bg-panel'
                }`}
                title={isCollapsed ? item.label : undefined}
              >
                <Icon
                  className={`w-4 h-4 flex-shrink-0 transition-colors ${
                    isActive ? 'text-accent' : 'text-muted group-hover:text-ink'
                  }`}
                />

                {!isCollapsed && (
                  <span className="truncate flex-1 text-left">
                    {item.label}
                  </span>
                )}

                {/* Notification Badge for Checkpoints */}
                {item.id === 'mix_qc' && pendingCheckpointsCount > 0 && (
                  <span
                    className={`px-1.5 py-0.5 rounded-full bg-accent text-accent-on font-mono text-[9px] font-bold flex-shrink-0 ${
                      isCollapsed ? 'absolute top-1.5 right-1.5 text-[8px] px-1 py-0' : ''
                    }`}
                  >
                    {pendingCheckpointsCount}
                  </span>
                )}

                {/* Collapsed Tooltip Hover */}
                {isCollapsed && (
                  <div className="absolute left-full ml-3 px-2.5 py-1.5 bg-panel border border-line-strong text-ink font-mono text-[11px] rounded-xl whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 shadow-xl">
                    {item.label}
                  </div>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/*
        Approval feed.

        SidebarNotificationFeed is NOT mounted yet. Its notification list is
        hardcoded, and one entry states a measurement:

          SidebarNotificationFeed.tsx:62
          `True Peak -0.8 dBTP, -13.8 LUFS. Signature required before DSP release.`

        Neither number came from anywhere. It would render inches away from the
        real measured values in the player bar, which are currently different —
        exactly the failure this product cannot ship. The feed goes back the
        moment it derives its items from the run's stages (a stage in
        `awaiting_approval` is a pending approval; its output carries the
        figures) instead of from that literal.

        Until then the sidebar states what is actually known: the count of
        stages waiting on a human, which comes straight off the run.
      */}
      {!isCollapsed && (
        <div className="px-3 py-4">
          <div className="p-3 rounded-2xl bg-panel border border-line font-mono text-[10px] text-muted leading-relaxed space-y-1">
            {!activeTrack ? (
              <p>No project selected — pick one in the header to see its checkpoints.</p>
            ) : pendingCheckpointsCount > 0 ? (
              <>
                <p className="text-caution font-bold">
                  {pendingCheckpointsCount} stage{pendingCheckpointsCount === 1 ? '' : 's'} awaiting your approval
                </p>
                <p>Open Mix QC &amp; Mastering to review the checkpoint.</p>
                {onOpenMobileApproval && (
                  <button
                    onClick={onOpenMobileApproval}
                    className="mt-1 w-full px-2.5 py-1.5 rounded-xl bg-whatsapp/10 hover:bg-whatsapp/20 border border-whatsapp/30 text-whatsapp transition-colors"
                  >
                    Send WhatsApp Mobile Nudge
                  </button>
                )}
              </>
            ) : (
              <p>No stage is waiting on you right now.</p>
            )}
          </div>
        </div>
      )}

      {/* Footer / System Info */}
      <div className="p-3 border-t border-line bg-bg/60">
        {!isCollapsed ? (
          <div className="p-2.5 rounded-2xl bg-panel border border-line space-y-0.5 font-mono text-[10px]">
            <div className="flex items-center justify-between text-muted">
              <span className="flex items-center gap-1 text-caution">
                <Flame className="w-3 h-3 text-accent" />
                GHARANA Core
              </span>
              <span className="text-accent">v2.4 Active</span>
            </div>
            <p className="text-dim text-[9px]">Phone-Native Audio Pipeline</p>
          </div>
        ) : (
          <div className="flex justify-center text-accent" title="GHARANA Core v2.4 Active">
            <Flame className="w-4 h-4" />
          </div>
        )}
      </div>

    </aside>
  );
};

