import React, { useCallback, useEffect, useState } from 'react';
import {
  Settings,
  ShieldCheck,
  Server,
  KeyRound,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Users,
  Smartphone,
  Workflow,
  Lock,
  Info
} from 'lucide-react';
import { PageHeader } from '../SectionPanel';
import {
  listArtists,
  listProjects,
  listTemplates,
  type Artist,
  type PipelineTemplate,
  type Project
} from '../../lib/api';
import { describeError, formatTimestamp } from './SplitsTab';

/**
 * Settings.
 *
 * This screen shows configuration that can actually be read, and says plainly
 * which settings the backend does not expose. It contains no controls that
 * write nowhere.
 *
 * Removed from the generated version: a billing dashboard (projected monthly
 * spend, a compute-credit meter, a card ending 4821, an itemised execution
 * ledger), agent subscription toggles, a "preferred foundation model" picker,
 * loudness/true-peak inputs, WhatsApp nudge switches, ISRC prefixes and DSP
 * credentials showing "Connected". Every one of those was React state with no
 * endpoint behind it: pressing Save moved a number on screen and nothing else,
 * and the billing figures were invented outright.
 */

/** Response of the console server's own /api/health route (not the gateway). */
interface ConsoleHealth {
  status: string;
  service: string;
  gateway: string;
  gatewayKeyConfigured: boolean;
  timestamp: string;
}

type Probe<T> = { state: 'loading' } | { state: 'ok'; data: T } | { state: 'error'; message: string };

interface SettingsTabProps {
  /** Legacy props from the mock-data console. Unused: nothing here installs agents. */
  installedAgentIds?: string[];
  onInstallAgent?: (agentId: string) => void;
}

export const SettingsTab: React.FC<SettingsTabProps> = () => {
  const [health, setHealth] = useState<Probe<ConsoleHealth>>({ state: 'loading' });
  const [templates, setTemplates] = useState<Probe<PipelineTemplate[]>>({ state: 'loading' });
  const [artists, setArtists] = useState<Probe<Artist[]>>({ state: 'loading' });
  const [projects, setProjects] = useState<Probe<Project[]>>({ state: 'loading' });

  const runChecks = useCallback(() => {
    setHealth({ state: 'loading' });
    setTemplates({ state: 'loading' });
    setArtists({ state: 'loading' });
    setProjects({ state: 'loading' });

    // Same-origin call to the console's own Express route. The typed gateway
    // client only speaks to /api/gw, and this endpoint is the console telling us
    // which gateway it is configured against — deliberately not a gateway call.
    fetch('/api/health', { cache: 'no-store' })
      .then(async (resp) => {
        if (!resp.ok) throw new Error(`console health returned ${resp.status}`);
        return (await resp.json()) as ConsoleHealth;
      })
      .then((data) => setHealth({ state: 'ok', data }))
      .catch((err) =>
        setHealth({ state: 'error', message: err instanceof Error ? err.message : String(err) })
      );

    listTemplates()
      .then((data) => setTemplates({ state: 'ok', data }))
      .catch((err) => setTemplates({ state: 'error', message: describeError(err) }));

    listArtists()
      .then((data) => setArtists({ state: 'ok', data }))
      .catch((err) => setArtists({ state: 'error', message: describeError(err) }));

    listProjects()
      .then((data) => setProjects({ state: 'ok', data }))
      .catch((err) => setProjects({ state: 'error', message: describeError(err) }));
  }, []);

  useEffect(() => {
    runChecks();
  }, [runChecks]);

  const gatewayReachable = templates.state === 'ok';

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      <PageHeader
        icon={Settings}
        title="Console Configuration"
        description="What this console is talking to, and what the backend does not let it configure."
        badge="Read-only"
        action={
          <button
            onClick={runChecks}
            className="px-4 py-2.5 rounded-xl bg-surface hover:bg-line text-caution border border-line-strong font-mono text-xs font-bold transition-all flex items-center gap-2"
          >
            <RefreshCw
              className={`w-4 h-4 ${health.state === 'loading' ? 'animate-spin text-info' : ''}`}
            />
            <span>Re-run checks</span>
          </button>
        }
      />

      {/* 1. WIRING */}
      <div className="p-6 rounded-3xl bg-panel border border-line shadow-lg space-y-5">
        <div className="flex items-center gap-2.5 pb-3 border-b border-line">
          <Server className="w-5 h-5 text-caution" />
          <h3 className="font-serif text-lg font-bold text-ink">Console → Gateway wiring</h3>
        </div>

        {health.state === 'loading' ? (
          <div className="flex items-center gap-2 font-mono text-xs text-muted">
            <RefreshCw className="w-3.5 h-3.5 animate-spin text-info" />
            <span>Reading /api/health…</span>
          </div>
        ) : health.state === 'error' ? (
          <div className="p-4 rounded-2xl bg-[var(--accent-dim)] border border-[var(--accent-border)] space-y-1">
            <div className="flex items-center gap-2 font-serif text-sm font-bold text-accent-hover">
              <AlertTriangle className="w-4 h-4" />
              <span>The console server did not answer its own health check</span>
            </div>
            <p className="font-mono text-[11px] text-accent-hover">{health.message}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 font-mono text-xs">
            <div className="p-4 rounded-2xl bg-bg border border-line space-y-1">
              <span className="text-muted uppercase tracking-wider text-[10px] block">
                Gateway base URL
              </span>
              <span className="text-ink font-bold break-all">{health.data.gateway}</span>
              <span className="text-[10px] text-dim block">
                Set by GATEWAY_URL on the console server. Browser requests go to /api/gw and are
                proxied there.
              </span>
            </div>

            <div
              className={`p-4 rounded-2xl bg-bg border space-y-1 ${
                health.data.gatewayKeyConfigured ? 'border-accent/40' : 'border-[var(--accent-border)]'
              }`}
            >
              <span className="text-muted uppercase tracking-wider text-[10px] flex items-center gap-1.5">
                <KeyRound className="w-3 h-3" />
                Gateway API key
              </span>
              <span
                className={`font-bold ${
                  health.data.gatewayKeyConfigured ? 'text-accent' : 'text-accent-hover'
                }`}
              >
                {health.data.gatewayKeyConfigured
                  ? 'Configured server-side'
                  : 'NOT CONFIGURED — calls will be unauthenticated'}
              </span>
              <span className="text-[10px] text-dim block">
                Held as GHARANA_API_KEY in the Node process and attached by the proxy. The key never
                reaches the browser, and this flag is the only thing the browser learns about it.
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-bg border border-line space-y-1">
              <span className="text-muted uppercase tracking-wider text-[10px] block">
                Console service
              </span>
              <span className="text-ink">
                {health.data.service} • {health.data.status}
              </span>
              <span className="text-[10px] text-dim block">
                Checked {formatTimestamp(health.data.timestamp)}
              </span>
            </div>

            <div
              className={`p-4 rounded-2xl bg-bg border space-y-1 ${
                gatewayReachable ? 'border-accent/40' : 'border-[var(--accent-border)]'
              }`}
            >
              <span className="text-muted uppercase tracking-wider text-[10px] block">
                Authenticated gateway call
              </span>
              {templates.state === 'loading' ? (
                <span className="text-muted flex items-center gap-2">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-info" />
                  Probing GET /templates…
                </span>
              ) : templates.state === 'ok' ? (
                <span className="text-accent font-bold flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" />
                  OK — {templates.data.length} templates returned
                </span>
              ) : (
                <span className="text-accent-hover font-bold break-words">{templates.message}</span>
              )}
              <span className="text-[10px] text-dim block">
                A real round trip through the proxy: it exercises the key, the network path and the
                orchestrator behind the gateway.
              </span>
            </div>
          </div>
        )}
      </div>

      {/* 2. PIPELINE TEMPLATES */}
      <div className="p-6 rounded-3xl bg-panel border border-line shadow-lg space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-line">
          <div className="flex items-center gap-2.5">
            <Workflow className="w-5 h-5 text-accent" />
            <h3 className="font-serif text-lg font-bold text-ink">
              Pipeline templates available to this workspace
            </h3>
          </div>
          <span className="font-mono text-[11px] text-dim">Registered by the orchestrator</span>
        </div>

        {templates.state === 'loading' ? (
          <p className="font-mono text-xs text-muted">Loading…</p>
        ) : templates.state === 'error' ? (
          <p className="font-mono text-[11px] text-accent-hover">{templates.message}</p>
        ) : templates.data.length === 0 ? (
          <p className="font-serif text-xs text-muted">
            No templates are registered, so no run can be started.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 font-mono text-xs">
            {templates.data.map((t) => (
              <div key={t.name} className="p-4 rounded-2xl bg-bg border border-line space-y-1">
                <span className="text-caution font-bold block">{t.name}</span>
                <span className="text-[10px] text-dim block">
                  {t.stages.length} stages •{' '}
                  {t.stages.filter((s) => s.checkpoint).length} human checkpoints
                </span>
                <span className="text-[10px] text-muted block break-words">
                  {t.stages.map((s) => s.name).join(' → ')}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 3. WORKSPACE RECORDS */}
      <div className="p-6 rounded-3xl bg-panel border border-line shadow-lg space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-line">
          <div className="flex items-center gap-2.5">
            <Users className="w-5 h-5 text-info" />
            <h3 className="font-serif text-lg font-bold text-ink">Artists on record</h3>
          </div>
          <span className="font-mono text-[11px] text-dim">
            {projects.state === 'ok' ? `${projects.data.length} projects` : 'projects: —'}
          </span>
        </div>

        <p className="font-serif text-xs text-muted">
          Artist language and WhatsApp number live on the artist record in the backend. The gateway
          can create artists but exposes no update route, so these are read-only here — and no
          WhatsApp nudge is sent by this console today.
        </p>

        {artists.state === 'loading' ? (
          <p className="font-mono text-xs text-muted">Loading artists…</p>
        ) : artists.state === 'error' ? (
          <p className="font-mono text-[11px] text-accent-hover">{artists.message}</p>
        ) : artists.data.length === 0 ? (
          <p className="font-serif text-xs text-dim">
            No artists exist yet. Projects hang off an artist, so this is the first record to create.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse font-mono text-xs min-w-[480px]">
              <thead>
                <tr className="border-b border-line text-muted uppercase text-[10px] tracking-wider">
                  <th className="py-2.5 px-3">Artist</th>
                  <th className="py-2.5 px-3">Language</th>
                  <th className="py-2.5 px-3">
                    <span className="flex items-center gap-1">
                      <Smartphone className="w-3 h-3" />
                      WhatsApp
                    </span>
                  </th>
                  <th className="py-2.5 px-3">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {artists.data.map((artist) => (
                  <tr key={artist.id}>
                    <td className="py-2.5 px-3 text-ink">{artist.name}</td>
                    <td className="py-2.5 px-3 text-muted">{artist.language ?? '—'}</td>
                    <td className="py-2.5 px-3 text-muted">
                      {artist.whatsapp ?? (
                        <span className="text-dim italic">none on record</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-dim">
                      {formatTimestamp(artist.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 4. WHAT IS NOT CONFIGURABLE */}
      <div className="p-6 rounded-3xl bg-bg/80 border border-dashed border-line-strong space-y-4">
        <div className="flex items-center gap-2.5 pb-3 border-b border-line">
          <Lock className="w-5 h-5 text-dim" />
          <h3 className="font-serif text-lg font-bold text-muted">
            Not configurable from the console
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            {
              icon: <ShieldCheck className="w-3.5 h-3.5" />,
              title: 'Loudness and true-peak thresholds',
              body: 'Enforced by the production_qc and mastering agents server-side. The gateway exposes no settings route, so no number typed here could reach them.'
            },
            {
              icon: <Info className="w-3.5 h-3.5" />,
              title: 'Model routing',
              body: 'Which model answers which agent call is decided by the server-side router. The console holds no model preference and no provider key.'
            },
            {
              icon: <Smartphone className="w-3.5 h-3.5" />,
              title: 'WhatsApp approval nudges',
              body: 'Checkpoint approvals happen through the gateway’s approve/redo routes. There is no notification endpoint, so nothing here can turn nudges on or off.'
            },
            {
              icon: <KeyRound className="w-3.5 h-3.5" />,
              title: 'DSP credentials and ISRC prefixes',
              body: 'No distribution integration exists. ISRC and UPC appear on release metadata only when the release stage returns them; the console never mints one.'
            }
          ].map((item) => (
            <div key={item.title} className="p-4 rounded-2xl bg-bg border border-line space-y-1">
              <span className="font-mono text-[10px] uppercase tracking-wider text-dim flex items-center gap-1.5">
                {item.icon}
                {item.title}
              </span>
              <p className="font-serif text-[11px] text-muted leading-relaxed">{item.body}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
