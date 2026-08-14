/**
 * The agents this deployment actually runs.
 *
 * WHAT THIS REPLACED
 * ------------------
 * A hardcoded array of invented listings — plausible agent names, plausible
 * categories, plausible descriptions, and an install button that installed
 * nothing. Presented to an artist as "your agents", that is a claim about the
 * system with nothing behind it, which is the same defect as a fabricated
 * measurement wearing different clothes. It also made the tab impossible to
 * trust: if these listings were invented, why would the numbers elsewhere be
 * real?
 *
 * Now it reads GET /capabilities, served from the capability registry the
 * planner itself uses to decide which agent satisfies which step. An agent
 * shown here can be planned against; one that cannot is absent. There is no
 * install button, because installation is not a thing this system does — an
 * agent is present in the deployment or it is not.
 */
import React, { useEffect, useState } from 'react';
import { AlertTriangle, Loader2, Puzzle } from 'lucide-react';

import {
  listCapabilities,
  listTemplates,
  type InstalledAgent,
  type PipelineTemplate,
} from '../../lib/api';
import { Badge, Empty, Panel, SectionTitle } from '../ui';

/** first_party outranks third_party for the same capability — see the registry. */
function kindStatus(kind: string): 'ok' | 'pending' {
  return kind === 'first_party' ? 'ok' : 'pending';
}

export const AgentMarketplaceTab: React.FC = () => {
  const [agents, setAgents] = useState<InstalledAgent[] | null>(null);
  const [templates, setTemplates] = useState<PipelineTemplate[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([listCapabilities(), listTemplates()])
      .then(([a, t]) => {
        if (cancelled) return;
        setAgents(a);
        setTemplates(t);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) {
    return (
      <Panel className="p-5">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-4 w-4 text-blocking" />
          <div>
            <h3 className="font-headline text-sm font-bold">Could not read the registry</h3>
            {/* The error, not a friendly substitute. An empty list here would be
                indistinguishable from a deployment with no agents. */}
            <p className="mt-1 font-mono text-[12px] text-muted">{error}</p>
          </div>
        </div>
      </Panel>
    );
  }

  if (agents === null) {
    return (
      <div className="flex items-center gap-2 py-10 text-muted">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="font-mono text-[12px]">reading the capability registry…</span>
      </div>
    );
  }

  const firstParty = agents.filter((a) => a.kind === 'first_party');
  const thirdParty = agents.filter((a) => a.kind !== 'first_party');

  return (
    <div className="space-y-8">
      <div>
        <SectionTitle hint={`${agents.length} installed`}>Agents</SectionTitle>
        <p className="mt-2 max-w-2xl text-[13px] leading-relaxed text-muted">
          Read from the capability registry the planner uses. Each line is a capability an agent
          claims and the tool that backs it — if a plan needs that capability, this is what
          satisfies it.
        </p>
      </div>

      {agents.length === 0 ? (
        <Empty>This deployment has no agents registered.</Empty>
      ) : (
        <>
          <AgentGroup
            title="First-party"
            note="In this repo, so the measurement discipline can be asserted for them."
            agents={firstParty}
          />
          <AgentGroup
            title="Third-party"
            note="Generation providers. Clearance tier decides which are usable for a release."
            agents={thirdParty}
          />
        </>
      )}

      <div>
        <SectionTitle hint={templates ? `${templates.length} registered` : undefined}>
          Pipeline templates
        </SectionTitle>
        {templates === null ? (
          <Empty>reading…</Empty>
        ) : templates.length === 0 ? (
          <Empty>No templates registered.</Empty>
        ) : (
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {templates.map((t) => (
              <Panel key={t.name} tone="sunken" className="p-4">
                <div className="font-mono text-[11px] uppercase tracking-wider text-dim">
                  {t.name}
                </div>
                <div className="mt-1 font-mono text-[12px] text-muted">
                  {(t.stages ?? []).length} stages, each a human checkpoint
                </div>
              </Panel>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const AgentGroup: React.FC<{
  title: string;
  note: string;
  agents: InstalledAgent[];
}> = ({ title, note, agents }) => {
  if (agents.length === 0) return null;
  return (
    <div>
      <SectionTitle hint={`${agents.length}`}>{title}</SectionTitle>
      <p className="mt-1 text-[12px] text-dim">{note}</p>
      <ul className="mt-3 space-y-2">
        {agents.map((agent) => (
          <li key={agent.agent}>
            <Panel className="p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Puzzle className="h-4 w-4 text-dim" />
                  <span className="font-headline text-sm font-bold">{agent.agent}</span>
                </div>
                <Badge status={kindStatus(agent.kind)}>{agent.kind.replace('_', ' ')}</Badge>
              </div>
              <ul className="mt-3 space-y-1.5">
                {agent.capabilities.map((c) => (
                  <li key={`${c.capability}:${c.tool}`} className="grid gap-1 md:grid-cols-[16rem_1fr]">
                    <span className="font-mono text-[12px] text-accent">{c.capability}</span>
                    <span className="text-[12px] text-muted">
                      {c.description || <span className="text-dim">via {c.tool}</span>}
                    </span>
                  </li>
                ))}
              </ul>
            </Panel>
          </li>
        ))}
      </ul>
    </div>
  );
};
