import React, { useState } from 'react';
import {
  Bell,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ChevronRight,
  Sliders,
  Sparkles,
  BookOpen,
  Users,
  Rocket,
  ArrowRight,
  Filter,
  Check,
  X,
  Bot
} from 'lucide-react';
import { TrackItem, ActiveTab } from '../types';

export interface NotificationItem {
  id: string;
  trackId: string;
  trackTitle: string;
  type: 'mix_qc' | 'splits' | 'release' | 'lyrics' | 'ar' | 'agent';
  title: string;
  description: string;
  status: 'pending' | 'approved' | 'info';
  timestamp: string;
  targetTab: ActiveTab;
}

interface SidebarNotificationFeedProps {
  tracks: TrackItem[];
  activeTrack: TrackItem;
  onSelectTab: (tab: ActiveTab) => void;
  onSelectTrack: (trackId: string) => void;
  onOpenMobileApproval?: () => void;
  isCollapsed?: boolean;
}

export const SidebarNotificationFeed: React.FC<SidebarNotificationFeedProps> = ({
  tracks,
  activeTrack,
  onSelectTab,
  onSelectTrack,
  onOpenMobileApproval,
  isCollapsed = false
}) => {
  const [filter, setFilter] = useState<'all' | 'pending' | 'agent'>('all');
  const [dismissedIds, setDismissedIds] = useState<string[]>([]);
  const [approvedIds, setApprovedIds] = useState<string[]>([]);

  // THIS COMPONENT IS NOT MOUNTED. See the comment in Sidebar.tsx.
  //
  // The array below is demo content, despite what the old comment here claimed
  // ("dynamically compute live notification feed" — it never did). Every item is
  // a literal: the split percentage, the timestamps, the party name.
  //
  // One measurement literal has been removed rather than left in place: this
  // entry used to read "True Peak -0.8 dBTP, -13.8 LUFS", two numbers that no
  // DSP produced, which would have rendered inches from the real measured values
  // in the player bar. Do not put numbers back into these strings. When this
  // feed is rewired, derive each item from the run's stages — a stage in
  // `awaiting_approval` is a pending approval and its output carries the
  // figures — and let it render nothing when there is nothing measured.
  const rawNotifications: NotificationItem[] = [
    {
      id: 'notif-mix-qc',
      trackId: activeTrack.id,
      trackTitle: activeTrack.title,
      type: 'mix_qc',
      title: 'Mix QC Checkpoint Pending',
      description: `Signature required before DSP release.`,
      status: approvedIds.includes('notif-mix-qc') ? 'approved' : 'pending',
      timestamp: 'Just now',
      targetTab: 'mix_qc'
    },
    {
      id: 'notif-splits-1',
      trackId: activeTrack.id,
      trackTitle: activeTrack.title,
      type: 'splits',
      title: 'Split Agreement Unsigned',
      description: 'Srikanth V. (Composition 40.0%) signature pending on ledger.',
      status: approvedIds.includes('notif-splits-1') ? 'approved' : 'pending',
      timestamp: '12m ago',
      targetTab: 'splits'
    },
    {
      id: 'notif-chandas-agent',
      trackId: activeTrack.id,
      trackTitle: activeTrack.title,
      type: 'agent',
      title: 'Telugu Chandas Agent',
      description: 'Scanned 12 lines for Matra meter. 0 syllabic breaks detected.',
      status: 'info',
      timestamp: '25m ago',
      targetTab: 'lyrics'
    },
    {
      id: 'notif-cover-clearance',
      trackId: activeTrack.id,
      trackTitle: activeTrack.title,
      type: 'release',
      title: 'IPRS Publishing Clearance',
      description: 'Direct publisher consent signed. Clearance hash locked to blockchain ledger.',
      status: 'approved',
      timestamp: '1h ago',
      targetTab: 'release'
    },
    {
      id: 'notif-ar-score',
      trackId: activeTrack.id,
      trackTitle: activeTrack.title,
      type: 'ar',
      title: 'A&R Commercial Readiness',
      description: 'Scored 88/100 for South Asian Fusion Wave playlists.',
      status: 'info',
      timestamp: '2h ago',
      targetTab: 'ar_feedback'
    }
  ];

  const filteredNotifications = rawNotifications
    .filter((n) => !dismissedIds.includes(n.id))
    .filter((n) => {
      if (filter === 'pending') return n.status === 'pending';
      if (filter === 'agent') return n.type === 'agent';
      return true;
    });

  const pendingCount = rawNotifications.filter(
    (n) => n.status === 'pending' && !dismissedIds.includes(n.id)
  ).length;

  const handleQuickApprove = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setApprovedIds((prev) => [...prev, id]);
  };

  const handleDismiss = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setDismissedIds((prev) => [...prev, id]);
  };

  const handleNavigate = (item: NotificationItem) => {
    if (item.trackId !== activeTrack.id) {
      onSelectTrack(item.trackId);
    }
    onSelectTab(item.targetTab);
  };

  const getIcon = (type: NotificationItem['type']) => {
    switch (type) {
      case 'mix_qc':
        return Sliders;
      case 'splits':
        return Users;
      case 'release':
        return Rocket;
      case 'lyrics':
        return BookOpen;
      case 'ar':
        return Sparkles;
      case 'agent':
        return Bot;
      default:
        return Bell;
    }
  };

  if (isCollapsed) {
    return (
      <div className="relative group">
        <button
          className="w-full py-2.5 flex items-center justify-center text-muted hover:text-caution relative"
          title={`Notification Feed (${pendingCount} Pending)`}
        >
          <Bell className="w-4 h-4" />
          {pendingCount > 0 && (
            <span className="absolute top-1 right-3 w-2 h-2 rounded-full bg-accent animate-pulse" />
          )}
        </button>

        {/* Floating Tooltip Feed on Hover when collapsed */}
        <div className="absolute left-full top-0 ml-3 w-72 bg-panel border border-line-strong rounded-2xl p-3 shadow-2xl opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-all z-50 space-y-2">
          <div className="flex items-center justify-between pb-2 border-b border-line">
            <span className="font-serif text-xs font-bold text-accent-on flex items-center gap-1.5">
              <Bell className="w-3.5 h-3.5 text-caution" />
              Live Status Feed
            </span>
            <span className="px-1.5 py-0.5 rounded-full bg-[var(--accent-dim)] text-accent font-mono text-[9px] font-bold">
              {pendingCount} Pending
            </span>
          </div>

          <div className="space-y-1.5 max-h-60 overflow-y-auto scrollbar-none">
            {filteredNotifications.slice(0, 3).map((item) => (
              <div
                key={item.id}
                onClick={() => handleNavigate(item)}
                className="p-2 rounded-xl bg-bg hover:bg-surface border border-line cursor-pointer text-left transition-colors"
              >
                <div className="flex items-center justify-between text-[10px] font-mono text-caution mb-0.5">
                  <span className="truncate">{item.title}</span>
                  <span className="text-[8px] text-dim">{item.timestamp}</span>
                </div>
                <p className="text-[10px] text-muted line-clamp-2">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-3 border-t border-line bg-bg space-y-2.5">
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Bell className="w-3.5 h-3.5 text-caution" />
            {pendingCount > 0 && (
              <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-accent animate-ping" />
            )}
          </div>
          <span className="font-serif text-xs font-bold text-accent-on">
            Approval Feed
          </span>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1 font-mono text-[9px]">
          <button
            onClick={() => setFilter('all')}
            className={`px-1.5 py-0.5 rounded-md transition-colors ${
              filter === 'all'
                ? 'bg-caution/20 text-caution font-bold'
                : 'text-dim hover:text-muted'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilter('pending')}
            className={`px-1.5 py-0.5 rounded-md transition-colors flex items-center gap-1 ${
              filter === 'pending'
                ? 'bg-[var(--accent-dim)] text-accent font-bold'
                : 'text-dim hover:text-muted'
            }`}
          >
            <span>Pending</span>
            {pendingCount > 0 && (
              <span className="w-1.5 h-1.5 rounded-full bg-accent" />
            )}
          </button>
        </div>
      </div>

      {/* Notification Cards List */}
      <div className="space-y-2 max-h-56 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-line">
        {filteredNotifications.length === 0 ? (
          <div className="p-3 text-center rounded-xl bg-bg border border-line text-[10px] font-mono text-dim">
            No active status alerts
          </div>
        ) : (
          filteredNotifications.map((item) => {
            const Icon = getIcon(item.type);
            const isApproved = item.status === 'approved';
            const isPending = item.status === 'pending';

            return (
              <div
                key={item.id}
                onClick={() => handleNavigate(item)}
                className={`p-2.5 rounded-xl border transition-all cursor-pointer group relative overflow-hidden ${
                  isPending
                    ? 'bg-surface border-[var(--accent-dim)] hover:border-accent shadow-md'
                    : isApproved
                    ? 'bg-bg border-accent/30 hover:border-accent'
                    : 'bg-bg border-line hover:border-line-strong'
                }`}
              >
                <div className="flex items-start justify-between gap-1.5 mb-1">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <Icon
                      className={`w-3.5 h-3.5 flex-shrink-0 ${
                        isPending
                          ? 'text-accent'
                          : isApproved
                          ? 'text-accent'
                          : 'text-caution'
                      }`}
                    />
                    <span className="font-sans font-bold text-[11px] text-ink truncate">
                      {item.title}
                    </span>
                  </div>

                  <button
                    onClick={(e) => handleDismiss(e, item.id)}
                    className="text-dim hover:text-ink transition-colors p-0.5 opacity-0 group-hover:opacity-100"
                    title="Dismiss alert"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>

                <p className="text-[10px] font-mono text-muted leading-tight mb-2 line-clamp-2">
                  {item.description}
                </p>

                <div className="flex items-center justify-between text-[9px] font-mono pt-1 border-t border-line/60">
                  <span className="text-dim flex items-center gap-1">
                    <Clock className="w-2.5 h-2.5" />
                    {item.timestamp}
                  </span>

                  {isPending ? (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={(e) => handleQuickApprove(e, item.id)}
                        className="px-1.5 py-0.5 rounded bg-accent/20 hover:bg-accent text-accent hover:text-bg transition-all font-bold flex items-center gap-0.5"
                      >
                        <Check className="w-2.5 h-2.5" />
                        <span>Approve</span>
                      </button>
                      <span className="text-accent font-bold flex items-center gap-0.5">
                        Action
                        <ChevronRight className="w-2.5 h-2.5" />
                      </span>
                    </div>
                  ) : isApproved ? (
                    <span className="text-accent font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      Signed & Verified
                    </span>
                  ) : (
                    <span className="text-caution flex items-center gap-1 group-hover:underline">
                      View Details
                      <ArrowRight className="w-2.5 h-2.5" />
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Quick Mobile Approval Shortcut Trigger */}
      {onOpenMobileApproval && (
        <button
          onClick={onOpenMobileApproval}
          className="w-full py-1.5 px-2.5 rounded-xl bg-whatsapp/10 hover:bg-whatsapp/20 border border-whatsapp/30 text-whatsapp font-mono text-[10px] font-bold transition-all flex items-center justify-between"
        >
          <span>Send WhatsApp Mobile Nudge</span>
          <ChevronRight className="w-3 h-3" />
        </button>
      )}

    </div>
  );
};
