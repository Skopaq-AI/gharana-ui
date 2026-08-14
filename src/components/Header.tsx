import React, { useState, useEffect } from 'react';
import {
  Music2,
  Clock,
  Flame,
  Plus,
  ChevronDown,
  Radio,
  Smartphone,
  Loader2,
  AlertTriangle,
  RefreshCw
} from 'lucide-react';
import type { Project } from '../lib/api';

interface HeaderProps {
  projects: Project[];
  activeProject: Project | null;
  loading?: boolean;
  error?: string | null;
  onSelectProject: (project: Project) => void;
  onRefreshProjects?: () => void;
  onNewProject: () => void;
  pendingCheckpointsCount: number;
  onOpenMobileApproval?: () => void;
  /** Disabled when there is nothing real to show in the mobile preview. */
  mobileApprovalDisabledReason?: string | null;
}

export const Header: React.FC<HeaderProps> = ({
  projects,
  activeProject,
  loading = false,
  error = null,
  onSelectProject,
  onRefreshProjects,
  onNewProject,
  pendingCheckpointsCount,
  onOpenMobileApproval,
  mobileApprovalDisabledReason = null
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

  const selectorLabel = loading && !activeProject
    ? 'Loading projects…'
    : activeProject
    ? activeProject.title
    : error
    ? 'Projects unavailable'
    : 'No project selected';

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-bg/90 backdrop-blur-xl px-4 md:px-6 py-3">
      {/*
        The row wraps. Nothing here is allowed to sit on top of anything else at
        any width: both groups shrink (min-w-0) and the right-hand controls wrap
        onto a second line before they would collide with the selector.
      */}
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-x-4 gap-y-2">

        {/* Left Side: Brand & Project Selector */}
        <div className="flex items-center gap-3 min-w-0 flex-1 basis-[260px]">
          {/* Studio Brand */}
          <div className="flex items-center gap-2.5 flex-shrink-0">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-accent to-caution flex items-center justify-center shadow-md shadow-[var(--accent-dim)]">
              <Radio className="w-4 h-4 text-bg font-bold" />
            </div>
            <div className="hidden sm:block">
              <div className="flex items-center gap-2">
                <span className="font-serif font-bold text-base tracking-wider text-ink">
                  GHARANA
                </span>
                <span className="hidden md:inline text-[10px] font-mono px-1.5 py-0.5 rounded bg-surface text-caution border border-line-strong">
                  v2.5
                </span>
              </div>
            </div>
          </div>

          <span className="hidden sm:inline text-line-strong flex-shrink-0">|</span>

          {/* Project Selection Dropdown */}
          <div className="relative min-w-0 flex-1 max-w-xs">
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="w-full flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-panel hover:bg-surface border border-line hover:border-line-strong text-xs font-sans text-ink transition-all min-w-0"
              title={activeProject ? `${activeProject.title} — ${activeProject.artist_name}` : selectorLabel}
            >
              {loading && !activeProject ? (
                <Loader2 className="w-3.5 h-3.5 text-caution animate-spin flex-shrink-0" />
              ) : error ? (
                <AlertTriangle className="w-3.5 h-3.5 text-blocking flex-shrink-0" />
              ) : (
                <Music2 className="w-3.5 h-3.5 text-accent flex-shrink-0" />
              )}
              <span className="font-serif font-semibold text-xs text-ink truncate min-w-[5rem] flex-1 text-left">
                {selectorLabel}
              </span>
              {activeProject && (
                <span className="hidden xl:inline-block px-2 py-0.5 rounded bg-bg text-[10px] font-mono text-muted border border-line flex-shrink-0">
                  {activeProject.status}
                </span>
              )}
              <ChevronDown
                className={`w-3.5 h-3.5 text-muted transition-transform flex-shrink-0 ${dropdownOpen ? 'rotate-180' : ''}`}
              />
            </button>

            {/* Dropdown Menu */}
            {dropdownOpen && (
              <div className="absolute left-0 mt-2 w-72 max-w-[calc(100vw-2rem)] bg-panel rounded-2xl border border-line-strong shadow-2xl py-2 z-50">
                <div className="px-3.5 py-1.5 flex items-center justify-between gap-2 text-[10px] font-mono text-muted uppercase tracking-wider border-b border-line">
                  <span>Projects</span>
                  {onRefreshProjects && (
                    <button
                      onClick={() => onRefreshProjects()}
                      className="flex items-center gap-1 hover:text-ink transition-colors"
                      title="Reload projects from the gateway"
                    >
                      <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
                      <span>Refresh</span>
                    </button>
                  )}
                </div>

                <div className="max-h-64 overflow-y-auto">
                  {loading && projects.length === 0 && (
                    <p className="px-3.5 py-3 text-xs font-mono text-muted flex items-center gap-2">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Loading projects…
                    </p>
                  )}

                  {!loading && error && (
                    <div className="px-3.5 py-3 space-y-1">
                      <p className="text-xs font-mono text-blocking break-words">{error}</p>
                      {onRefreshProjects && (
                        <button
                          onClick={() => onRefreshProjects()}
                          className="text-[11px] font-mono text-caution underline underline-offset-4"
                        >
                          Try again
                        </button>
                      )}
                    </div>
                  )}

                  {!loading && !error && projects.length === 0 && (
                    <p className="px-3.5 py-3 text-xs font-mono text-muted">
                      No projects yet. Use “New Project” to create one.
                    </p>
                  )}

                  {projects.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => {
                        onSelectProject(p);
                        setDropdownOpen(false);
                      }}
                      className={`w-full text-left px-3.5 py-2.5 hover:bg-surface flex items-center justify-between gap-2 transition-colors ${
                        p.id === activeProject?.id
                          ? 'bg-surface border-l-2 border-accent text-caution'
                          : 'text-ink'
                      }`}
                    >
                      <div className="truncate pr-2 min-w-0">
                        <p className="font-serif text-xs font-medium truncate">{p.title}</p>
                        <p className="text-[10px] text-muted font-mono truncate">{p.artist_name}</p>
                      </div>
                      <span className="text-[10px] font-mono text-muted flex-shrink-0">{p.status}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Status Badges & Direct Actions */}
        <div className="flex items-center gap-2 flex-wrap justify-end min-w-0">

          {/* Subtle Studio Clock — first thing to go when space is tight */}
          <div className="hidden 2xl:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-panel border border-line text-xs font-mono text-muted">
            <Clock className="w-3.5 h-3.5 text-caution" />
            <span className="text-ink">{timeString}</span>
            <span>•</span>
            <span className="text-caution font-serif text-[11px]">{ragaInfo.name}</span>
          </div>

          {/* Pending Sign-offs Indicator */}
          {pendingCheckpointsCount > 0 && (
            <div
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--accent-dim)] border border-[var(--accent-border)] text-xs font-mono text-accent flex-shrink-0"
              title={`${pendingCheckpointsCount} stage(s) awaiting your approval`}
            >
              <Flame className="w-3.5 h-3.5 text-accent" />
              <span className="font-bold">{pendingCheckpointsCount}</span>
              <span className="hidden xl:inline">Checkpoints</span>
            </div>
          )}

          {/* WhatsApp Mobile Approval Trigger */}
          {onOpenMobileApproval && (
            <button
              onClick={onOpenMobileApproval}
              disabled={Boolean(mobileApprovalDisabledReason)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-whatsapp/10 hover:bg-whatsapp/20 border border-whatsapp/30 text-xs font-mono text-whatsapp transition-all flex-shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
              title={mobileApprovalDisabledReason ?? 'Open the WhatsApp mobile approval view'}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span className="hidden lg:inline">WhatsApp Nudge</span>
            </button>
          )}

          {/* Primary Action Button */}
          <button
            onClick={onNewProject}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-accent hover:bg-accent-hover text-accent-on font-mono font-bold text-xs shadow-lg shadow-[var(--accent-dim)] transition-all flex-shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">New Project</span>
          </button>
        </div>

      </div>
    </header>
  );
};
