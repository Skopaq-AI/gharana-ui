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
import { SidebarNotificationFeed } from './SidebarNotificationFeed';

interface SidebarProps {
  tracks: TrackItem[];
  activeTrack: TrackItem;
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
      className={`bg-[#0d0a14]/95 border-r border-[#241c33] transition-all duration-300 flex flex-col justify-between flex-shrink-0 z-30 relative select-none ${
        isCollapsed ? 'w-16 md:w-20' : 'w-72'
      }`}
    >
      
      {/* Top Header & Brand */}
      <div>
        <div className="p-4 flex items-center justify-between border-b border-[#241c33]">
          
          {!isCollapsed && (
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#f2542d] to-[#ffd48a] flex items-center justify-center shadow-lg shadow-[#f2542d]/20 flex-shrink-0">
                <Music2 className="w-4 h-4 text-[#08060d] font-bold" />
              </div>
              <div className="truncate">
                <span className="font-serif font-bold text-sm tracking-wide text-[#f5efe6] block truncate">
                  GHARANA
                </span>
                <span className="text-[9px] font-mono text-[#a294b8] uppercase tracking-wider block">
                  AI Music Studio
                </span>
              </div>
            </div>
          )}

          {isCollapsed && (
            <div className="w-full flex justify-center">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#f2542d] to-[#ffd48a] flex items-center justify-center shadow-lg shadow-[#f2542d]/20">
                <Music2 className="w-4 h-4 text-[#08060d] font-bold" />
              </div>
            </div>
          )}

          {/* Collapse Toggle Button */}
          <button
            onClick={onToggleCollapse}
            className={`p-1.5 rounded-xl bg-[#191324] hover:bg-[#241c33] text-[#a294b8] hover:text-[#f5efe6] transition-colors ${
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
                    ? 'bg-[#191324] text-[#ffd48a] border border-[#ffd48a]/40 shadow-lg shadow-[#191324]/50 font-bold'
                    : 'text-[#a294b8] hover:text-[#f5efe6] hover:bg-[#120e1b]'
                }`}
                title={isCollapsed ? item.label : undefined}
              >
                <Icon
                  className={`w-4 h-4 flex-shrink-0 transition-colors ${
                    isActive ? 'text-[#f2542d]' : 'text-[#a294b8] group-hover:text-[#f5efe6]'
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
                    className={`px-1.5 py-0.5 rounded-full bg-[#f2542d] text-white font-mono text-[9px] font-bold flex-shrink-0 ${
                      isCollapsed ? 'absolute top-1.5 right-1.5 text-[8px] px-1 py-0' : ''
                    }`}
                  >
                    {pendingCheckpointsCount}
                  </span>
                )}

                {/* Collapsed Tooltip Hover */}
                {isCollapsed && (
                  <div className="absolute left-full ml-3 px-2.5 py-1.5 bg-[#120e1b] border border-[#342847] text-[#f5efe6] font-mono text-[11px] rounded-xl whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 shadow-xl">
                    {item.label}
                  </div>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Notification Feed in Sidebar */}
      <SidebarNotificationFeed
        tracks={tracks}
        activeTrack={activeTrack}
        onSelectTab={onSelectTab}
        onSelectTrack={onSelectTrack}
        onOpenMobileApproval={onOpenMobileApproval}
        isCollapsed={isCollapsed}
      />

      {/* Footer / System Info */}
      <div className="p-3 border-t border-[#241c33] bg-[#08060d]/60">
        {!isCollapsed ? (
          <div className="p-2.5 rounded-2xl bg-[#120e1b] border border-[#241c33] space-y-0.5 font-mono text-[10px]">
            <div className="flex items-center justify-between text-[#a294b8]">
              <span className="flex items-center gap-1 text-[#ffd48a]">
                <Flame className="w-3 h-3 text-[#f2542d]" />
                GHARANA Core
              </span>
              <span className="text-[#43c9a0]">v2.4 Active</span>
            </div>
            <p className="text-[#6d6183] text-[9px]">Phone-Native Audio Pipeline</p>
          </div>
        ) : (
          <div className="flex justify-center text-[#f2542d]" title="GHARANA Core v2.4 Active">
            <Flame className="w-4 h-4" />
          </div>
        )}
      </div>

    </aside>
  );
};

