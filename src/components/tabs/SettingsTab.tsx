import React, { useState } from 'react';
import {
  Settings,
  User,
  Smartphone,
  Sliders,
  ShieldCheck,
  Globe,
  Radio,
  CheckCircle2,
  Save,
  Bell,
  Lock,
  Cpu,
  Zap,
  Key,
  Volume2,
  Building2,
  Check,
  RefreshCw,
  Sparkles,
  CreditCard,
  Receipt,
  DollarSign,
  TrendingUp,
  Bot,
  Calendar,
  Download,
  AlertCircle,
  Layers,
  Activity,
  ArrowUpRight,
  PieChart,
  Trash2,
  Plus,
  Clock,
  ChevronRight
} from 'lucide-react';
import { MOCK_AGENTS, AgentListing } from '../../data/mockAgents';
import { PageHeader, SectionCard, SectionHeader, StatCard } from '../SectionPanel';

interface SettingsTabProps {
  installedAgentIds?: string[];
  onInstallAgent?: (agentId: string) => void;
}

export const SettingsTab: React.FC<SettingsTabProps> = ({
  installedAgentIds = ['agent-telugu-chandas', 'agent-mastering-qc'],
  onInstallAgent
}) => {
  // Main Navigation Sub-Tab inside Settings
  const [activeSettingsTab, setActiveSettingsTab] = useState<'preferences' | 'billing'>('billing');

  // Studio & Artist Profile State
  const [studioName, setStudioName] = useState('GHARANA Music & Audio Labs');
  const [ipiCaeNumber, setIpiCaeNumber] = useState('IPI-009841235');
  const [primaryLanguage, setPrimaryLanguage] = useState('Telugu');
  const [currency, setCurrency] = useState<'INR' | 'USD'>('INR');

  // WhatsApp & Mobile Nudges State
  const [whatsAppNumber, setWhatsAppNumber] = useState('+91 98765 43210');
  const [enableWhatsAppNudges, setEnableWhatsAppNudges] = useState(true);
  const [lowBandwidthMode, setLowBandwidthMode] = useState(true);

  // Audio Ceilings & Mastering Standards
  const [targetLufs, setTargetLufs] = useState(-14.0);
  const [truePeakCeiling, setTruePeakCeiling] = useState(-1.0);
  const [hardReleaseBlock, setHardReleaseBlock] = useState(true);

  // AI Provenance & Data Privacy
  const [zeroRetentionMode, setZeroRetentionMode] = useState(true);
  const [preferredModel, setPreferredModel] = useState('Gemini 2.5 Flash');
  const [autoRunVettedAgents, setAutoRunVettedAgents] = useState(true);

  // DSP & Copyright Metadata
  const [isrcPrefix, setIsrcPrefix] = useState('IN-GH1-26');
  const [appleMasteringId, setAppleMasteringId] = useState('ADM-GHARANA-884');
  const [spotifyStatus, setSpotifyStatus] = useState<'connected' | 'disconnected'>('connected');

  // Local state for active agent subscriptions
  const [activeAgentIds, setActiveAgentIds] = useState<string[]>(installedAgentIds);

  // Save Toast State
  const [savedToast, setSavedToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('Studio Preferences Saved!');

  const handleSaveSettings = () => {
    setToastMessage('Studio Preferences Saved!');
    setSavedToast(true);
    setTimeout(() => setSavedToast(false), 3000);
  };

  const handleToggleAgentSubscription = (agentId: string) => {
    if (activeAgentIds.includes(agentId)) {
      setActiveAgentIds((prev) => prev.filter((id) => id !== agentId));
      setToastMessage('Agent subscription cancelled.');
    } else {
      setActiveAgentIds((prev) => [...prev, agentId]);
      if (onInstallAgent) {
        onInstallAgent(agentId);
      }
      setToastMessage('Agent subscribed & activated!');
    }
    setSavedToast(true);
    setTimeout(() => setSavedToast(false), 3000);
  };

  // Calculations for Billing & Expenditure Summary
  const baseProPlanInr = 2499; // Base GHARANA Pro Workspace Plan

  const activeAgents = MOCK_AGENTS.filter((agent) => activeAgentIds.includes(agent.id));
  
  const totalAgentSubscriptionsInr = activeAgents
    .filter((a) => a.pricingType === 'subscription')
    .reduce((sum, a) => sum + a.priceAmountInr, 0);

  // Simulated per-run executions for the current month
  const mockRecentExecutions = [
    { id: 'exec-1', track: 'Siri Siri Muvva', agentName: 'Punjabi Hip-Hop & Dhol 808 Knot Resolver', cost: 149, date: '2026-08-08 14:22', model: 'Per-Run' },
    { id: 'exec-2', track: 'Anaganaga Raga', agentName: 'Sahitya-LLM Telugu Lyricist & Meter Specialist', cost: 0, date: '2026-08-07 19:05', model: 'Subscription Included' },
    { id: 'exec-3', track: 'Anaganaga Raga', agentName: 'True Peak Guard & EBU R128 Master QC Agent', cost: 0, date: '2026-08-06 11:40', model: 'Subscription Included' },
    { id: 'exec-4', track: 'Dhol Vibe 808', agentName: 'Kollywood Brass & String Counter-Melody Orchestrator', cost: 199, date: '2026-08-04 16:15', model: 'Per-Run' },
    { id: 'exec-5', track: 'Siri Siri Muvva', agentName: 'Punjabi Hip-Hop & Dhol 808 Knot Resolver', cost: 149, date: '2026-08-02 09:30', model: 'Per-Run' }
  ];

  const totalPerRunExecutionsInr = mockRecentExecutions.reduce((sum, e) => sum + e.cost, 0);

  const totalMonthlySpendInr = baseProPlanInr + totalAgentSubscriptionsInr + totalPerRunExecutionsInr;

  const currencySymbol = currency === 'INR' ? '₹' : '$';
  const convertAmount = (inr: number) => {
    if (currency === 'USD') {
      return (inr / 85).toFixed(2);
    }
    return inr.toLocaleString('en-IN');
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Standardized Page Header */}
      <PageHeader
        icon={Settings}
        title="Studio Settings & Usage Billing"
        description="Configure label metadata defaults, WhatsApp nudge endpoints, and AI agent usage."
        badge="Workspace Admin"
        action={
          <button
            onClick={handleSaveSettings}
            className="px-4 py-2.5 rounded-xl bg-[#f2542d] hover:bg-[#ff7a4d] text-white font-mono text-xs font-bold transition-all shadow-md flex items-center gap-2"
          >
            <Save className="w-4 h-4 text-white" />
            <span>Save Settings</span>
          </button>
        }
      >
        {/* Sub-Tabs Switcher */}
        <div className="flex items-center gap-2 font-mono text-xs">
          <button
            onClick={() => setActiveSettingsTab('billing')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl transition-all ${
              activeSettingsTab === 'billing'
                ? 'bg-[#191324] text-[#ffd48a] border border-[#ffd48a]/30 font-bold shadow-md'
                : 'text-[#a294b8] hover:text-[#f5efe6] hover:bg-[#120e1b]'
            }`}
          >
            <Receipt className="w-3.5 h-3.5 text-[#ffd48a]" />
            <span>Usage, Billing & Agent Subscriptions</span>
          </button>

          <button
            onClick={() => setActiveSettingsTab('preferences')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl transition-all ${
              activeSettingsTab === 'preferences'
                ? 'bg-[#191324] text-[#ffd48a] border border-[#ffd48a]/30 font-bold shadow-md'
                : 'text-[#a294b8] hover:text-[#f5efe6] hover:bg-[#120e1b]'
            }`}
          >
            <Sliders className="w-3.5 h-3.5 text-[#ffd48a]" />
            <span>Studio Preferences & Metadata Defaults</span>
          </button>
        </div>
      </PageHeader>

      {/* VIEW 1: USAGE & BILLING PANEL */}
      {activeSettingsTab === 'billing' && (
        <div className="space-y-8 animate-fadeIn">
          
          {/* 1. MONTHLY EXPENDITURE SUMMARY DASHBOARD */}
          <div className="p-6 md:p-8 rounded-3xl bg-[#120e1b] border border-[#241c33] shadow-xl space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#241c33]">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-[#ffd48a]/10 border border-[#ffd48a]/30 text-[#ffd48a]">
                  <CreditCard className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="font-serif text-xl font-bold text-[#f5efe6]">
                    Workspace Usage & Expenditure Summary
                  </h2>
                  <p className="font-mono text-xs text-[#a294b8]">
                    Current Billing Cycle: August 1, 2026 – August 31, 2026 • Pro Workspace Tier
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 bg-[#08060d] border border-[#342847] p-1.5 rounded-xl font-mono text-xs">
                <span className="text-[#a294b8] px-2">Currency:</span>
                <button
                  type="button"
                  onClick={() => setCurrency('INR')}
                  className={`px-3 py-1 rounded-lg transition-all ${
                    currency === 'INR' ? 'bg-[#f2542d] text-white font-bold' : 'text-[#a294b8]'
                  }`}
                >
                  INR (₹)
                </button>
                <button
                  type="button"
                  onClick={() => setCurrency('USD')}
                  className={`px-3 py-1 rounded-lg transition-all ${
                    currency === 'USD' ? 'bg-[#f2542d] text-white font-bold' : 'text-[#a294b8]'
                  }`}
                >
                  USD ($)
                </button>
              </div>
            </div>

            {/* Metrics Breakdown Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              
              {/* Card 1: Total Monthly Bill */}
              <div className="p-5 rounded-2xl bg-[#08060d] border border-[#ffd48a]/30 space-y-2 relative overflow-hidden">
                <div className="flex items-center justify-between text-[#a294b8] font-mono text-xs">
                  <span>Projected Month Total</span>
                  <Receipt className="w-4 h-4 text-[#ffd48a]" />
                </div>
                <div className="font-serif text-2xl md:text-3xl font-bold text-[#ffd48a]">
                  {currencySymbol}{convertAmount(totalMonthlySpendInr)}
                </div>
                <p className="font-mono text-[10px] text-[#6d6183]">
                  Includes Base Plan + Active Agents + Per-Run
                </p>
              </div>

              {/* Card 2: Base Pro Plan */}
              <div className="p-5 rounded-2xl bg-[#08060d] border border-[#241c33] space-y-2">
                <div className="flex items-center justify-between text-[#a294b8] font-mono text-xs">
                  <span>GHARANA Pro Plan</span>
                  <Layers className="w-4 h-4 text-[#43c9a0]" />
                </div>
                <div className="font-serif text-2xl font-bold text-[#f5efe6]">
                  {currencySymbol}{convertAmount(baseProPlanInr)}
                  <span className="text-xs font-mono font-normal text-[#a294b8]">/mo</span>
                </div>
                <span className="inline-block px-2 py-0.5 rounded-full bg-[#43c9a0]/20 text-[#43c9a0] font-mono text-[9px] font-bold">
                  Active Subscription
                </span>
              </div>

              {/* Card 3: Agent Subscriptions Total */}
              <div className="p-5 rounded-2xl bg-[#08060d] border border-[#241c33] space-y-2">
                <div className="flex items-center justify-between text-[#a294b8] font-mono text-xs">
                  <span>Agent Subscriptions</span>
                  <Bot className="w-4 h-4 text-[#a56bd6]" />
                </div>
                <div className="font-serif text-2xl font-bold text-[#f5efe6]">
                  {currencySymbol}{convertAmount(totalAgentSubscriptionsInr)}
                  <span className="text-xs font-mono font-normal text-[#a294b8]">/mo</span>
                </div>
                <span className="font-mono text-[10px] text-[#a294b8] block">
                  {activeAgents.filter((a) => a.pricingType === 'subscription').length} Active Subscribed Agents
                </span>
              </div>

              {/* Card 4: Per-Run Executions Total */}
              <div className="p-5 rounded-2xl bg-[#08060d] border border-[#241c33] space-y-2">
                <div className="flex items-center justify-between text-[#a294b8] font-mono text-xs">
                  <span>Per-Run Executions</span>
                  <Zap className="w-4 h-4 text-[#f2542d]" />
                </div>
                <div className="font-serif text-2xl font-bold text-[#f5efe6]">
                  {currencySymbol}{convertAmount(totalPerRunExecutionsInr)}
                </div>
                <span className="font-mono text-[10px] text-[#a294b8] block">
                  {mockRecentExecutions.filter((e) => e.cost > 0).length} Paid Agent Runs this cycle
                </span>
              </div>

            </div>

            {/* Quota & Compute Meter */}
            <div className="p-4 rounded-2xl bg-[#08060d] border border-[#241c33] space-y-3 font-mono text-xs">
              <div className="flex items-center justify-between text-[#a294b8]">
                <span className="flex items-center gap-2 text-[#f5efe6] font-bold">
                  <Activity className="w-4 h-4 text-[#ffd48a]" />
                  Gemini 2.5 Flash Compute & Meter Credits
                </span>
                <span className="text-[#ffd48a] font-bold">14,280 / 20,000 Credits Used (71%)</span>
              </div>

              <div className="w-full h-3 bg-[#120e1b] rounded-full overflow-hidden border border-[#241c33] relative">
                <div
                  className="h-full bg-gradient-to-r from-[#f2542d] via-[#ffd48a] to-[#43c9a0] rounded-full transition-all duration-500"
                  style={{ width: '71%' }}
                />
              </div>

              <div className="flex items-center justify-between text-[10px] text-[#6d6183]">
                <span>Resets on Sept 1, 2026 • High-throughput ephemeral processing</span>
                <span className="text-[#43c9a0] font-bold">Zero-Retention Mode Active</span>
              </div>
            </div>

            {/* Payment Details & Invoicing */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4 border-t border-[#241c33] font-mono text-xs">
              <div className="flex items-center gap-3">
                <div className="px-3 py-2 rounded-xl bg-[#191324] border border-[#342847] text-[#f5efe6] flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-[#25D366]" />
                  <span>Razorpay UPI / Visa •••• 4821</span>
                </div>
                <span className="text-[#6d6183]">Auto-renew enabled</span>
              </div>

              <button
                type="button"
                onClick={() => handleSaveSettings()}
                className="px-4 py-2 rounded-xl bg-[#191324] hover:bg-[#241c33] border border-[#342847] text-[#ffd48a] font-bold transition-all flex items-center gap-2"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download August 2026 Statement (PDF)</span>
              </button>
            </div>
          </div>

          {/* 2. ACTIVE AGENT SUBSCRIPTIONS LIST */}
          <div className="p-6 rounded-3xl bg-[#120e1b] border border-[#241c33] shadow-lg space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-[#241c33]">
              <div className="flex items-center gap-2.5">
                <Bot className="w-5 h-5 text-[#ffd48a]" />
                <h3 className="font-serif text-lg font-bold text-[#f5efe6]">
                  Active Agent Subscriptions & Licenses ({activeAgents.length})
                </h3>
              </div>
              <span className="text-xs font-mono text-[#a294b8]">
                Installed across GHARANA Workspace
              </span>
            </div>

            <div className="space-y-3">
              {activeAgents.length === 0 ? (
                <div className="p-6 text-center rounded-2xl bg-[#08060d] border border-[#241c33] font-mono text-xs text-[#a294b8]">
                  No active marketplace agent subscriptions. Browse the Marketplace below to activate specialized agents.
                </div>
              ) : (
                activeAgents.map((agent) => (
                  <div
                    key={agent.id}
                    className="p-4 rounded-2xl bg-[#08060d] border border-[#241c33] hover:border-[#342847] transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 font-mono text-xs"
                  >
                    <div className="space-y-1 max-w-xl">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-[#f5efe6] font-sans text-sm">
                          {agent.name}
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-[#f2542d]/20 text-[#f2542d] text-[10px] font-bold border border-[#f2542d]/30">
                          {agent.authorBadge}
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-[#ffd48a]/20 text-[#ffd48a] text-[10px] font-bold">
                          {agent.category}
                        </span>
                      </div>

                      <p className="text-[11px] text-[#a294b8]">
                        {agent.description}
                      </p>

                      <div className="flex items-center gap-4 text-[10px] text-[#6d6183] pt-1">
                        <span>Author: {agent.author}</span>
                        <span>•</span>
                        <span className="text-[#43c9a0]">
                          {agent.provenance.trainingDataPosture.split(':')[0]}
                        </span>
                      </div>
                    </div>

                    <div className="flex sm:flex-col items-end justify-between sm:justify-center gap-2 flex-shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-[#241c33]">
                      <div className="text-right">
                        <span className="font-serif font-bold text-sm text-[#ffd48a] block">
                          {currencySymbol}{convertAmount(agent.priceAmountInr)}
                          <span className="text-[10px] font-normal text-[#a294b8]">
                            {agent.pricingType === 'subscription' ? ' / mo' : ' / run'}
                          </span>
                        </span>
                        <span className="text-[9px] text-[#6d6183] block">
                          {agent.pricingType === 'subscription' ? 'Renews Sept 1, 2026' : 'Pay As You Go'}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleToggleAgentSubscription(agent.id)}
                        className="px-3 py-1.5 rounded-xl bg-[#f2542d]/10 hover:bg-[#f2542d]/20 text-[#f2542d] border border-[#f2542d]/30 font-bold text-[11px] transition-all flex items-center gap-1"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Cancel Subscription</span>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* 3. MARKETPLACE AGENTS PER-RUN & SUBSCRIPTION RATE CARD */}
          <div className="p-6 rounded-3xl bg-[#120e1b] border border-[#241c33] shadow-lg space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-[#241c33]">
              <div className="flex items-center gap-2.5">
                <Sparkles className="w-5 h-5 text-[#f2542d]" />
                <h3 className="font-serif text-lg font-bold text-[#f5efe6]">
                  Marketplace Agent Rate Cards & Pricing Directory
                </h3>
              </div>
              <span className="text-xs font-mono text-[#ffd48a]">
                Transparent Pay-As-You-Go & Flat Subscriptions
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse font-mono text-xs">
                <thead>
                  <tr className="border-b border-[#241c33] text-[#a294b8] uppercase text-[10px] tracking-wider">
                    <th className="py-3 px-3">Agent Name & Category</th>
                    <th className="py-3 px-3">Billing Model</th>
                    <th className="py-3 px-3">Rate / Unit Cost</th>
                    <th className="py-3 px-3">Privacy Guarantee</th>
                    <th className="py-3 px-3 text-right">Status / Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#241c33]">
                  {MOCK_AGENTS.map((agent) => {
                    const isSubscribed = activeAgentIds.includes(agent.id);

                    return (
                      <tr key={agent.id} className="hover:bg-[#08060d]/50 transition-colors">
                        <td className="py-3.5 px-3">
                          <div className="font-bold text-[#f5efe6] font-sans text-xs">
                            {agent.name}
                          </div>
                          <div className="text-[10px] text-[#a294b8]">{agent.category} • {agent.author}</div>
                        </td>

                        <td className="py-3.5 px-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              agent.pricingType === 'subscription'
                                ? 'bg-[#ffd48a]/20 text-[#ffd48a]'
                                : 'bg-[#f2542d]/20 text-[#f2542d]'
                            }`}
                          >
                            {agent.pricingType === 'subscription' ? 'Monthly Subscription' : 'Per-Run Token'}
                          </span>
                        </td>

                        <td className="py-3.5 px-3 font-bold text-[#f5efe6]">
                          {currencySymbol}{convertAmount(agent.priceAmountInr)}
                          <span className="text-[10px] font-normal text-[#6d6183]">
                            {agent.pricingType === 'subscription' ? ' / mo' : ' / run'}
                          </span>
                        </td>

                        <td className="py-3.5 px-3 text-[10px] text-[#43c9a0]">
                          Zero-Retention RAM Processing
                        </td>

                        <td className="py-3.5 px-3 text-right">
                          <button
                            type="button"
                            onClick={() => handleToggleAgentSubscription(agent.id)}
                            className={`px-3 py-1.5 rounded-xl font-bold text-[11px] transition-all ${
                              isSubscribed
                                ? 'bg-[#43c9a0]/20 text-[#43c9a0] border border-[#43c9a0]/40'
                                : 'bg-[#f2542d] hover:bg-[#ff7a4d] text-white shadow-md'
                            }`}
                          >
                            {isSubscribed ? 'Subscribed ✓' : 'Subscribe / Add'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* 4. ITEMIZED RECENT EXECUTION LEDGER */}
          <div className="p-6 rounded-3xl bg-[#120e1b] border border-[#241c33] shadow-lg space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#241c33]">
              <div className="flex items-center gap-2.5">
                <Clock className="w-5 h-5 text-[#a294b8]" />
                <h3 className="font-serif text-lg font-bold text-[#f5efe6]">
                  Recent Agent Execution Audit Ledger
                </h3>
              </div>
              <span className="text-xs font-mono text-[#6d6183]">
                Itemized Run History (August 2026)
              </span>
            </div>

            <div className="space-y-2 font-mono text-xs">
              {mockRecentExecutions.map((exec) => (
                <div
                  key={exec.id}
                  className="p-3 rounded-xl bg-[#08060d] border border-[#241c33] flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-[#ffd48a] font-bold">{exec.track}</span>
                      <span className="text-[#6d6183]">•</span>
                      <span className="text-[#f5efe6]">{exec.agentName}</span>
                    </div>
                    <div className="text-[10px] text-[#6d6183]">
                      Timestamp: {exec.date} • Model: {exec.model}
                    </div>
                  </div>

                  <div className="text-right flex-shrink-0">
                    <span className="font-bold text-[#f5efe6]">
                      {exec.cost === 0 ? 'Included ($0)' : `${currencySymbol}${convertAmount(exec.cost)}`}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}

      {/* VIEW 2: STUDIO PREFERENCES (ORIGINAL SETTINGS) */}
      {activeSettingsTab === 'preferences' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fadeIn">
          
          {/* 1. STUDIO PROFILE & BRANDING */}
          <div className="p-6 rounded-3xl bg-[#120e1b] border border-[#241c33] space-y-5 shadow-lg">
            <div className="flex items-center gap-2.5 pb-3 border-b border-[#241c33]">
              <Building2 className="w-5 h-5 text-[#ffd48a]" />
              <h3 className="font-serif text-lg font-bold text-[#f5efe6]">Studio & Label Profile</h3>
            </div>

            <div className="space-y-4 font-mono text-xs">
              <div className="space-y-1.5">
                <label className="text-[#a294b8] uppercase tracking-wider block">Studio / Label Name</label>
                <input
                  type="text"
                  value={studioName}
                  onChange={(e) => setStudioName(e.target.value)}
                  className="w-full bg-[#08060d] border border-[#342847] rounded-xl px-3.5 py-2.5 text-[#f5efe6] focus:outline-none focus:border-[#ffd48a]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[#a294b8] uppercase tracking-wider block">Primary IPI / CAE No.</label>
                  <input
                    type="text"
                    value={ipiCaeNumber}
                    onChange={(e) => setIpiCaeNumber(e.target.value)}
                    className="w-full bg-[#08060d] border border-[#342847] rounded-xl px-3.5 py-2.5 text-[#f5efe6] focus:outline-none focus:border-[#ffd48a]"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[#a294b8] uppercase tracking-wider block">Default Language</label>
                  <select
                    value={primaryLanguage}
                    onChange={(e) => setPrimaryLanguage(e.target.value)}
                    className="w-full bg-[#08060d] border border-[#342847] text-[#ffd48a] rounded-xl px-3.5 py-2.5 focus:outline-none"
                  >
                    <option value="Telugu">Telugu</option>
                    <option value="Punjabi">Punjabi</option>
                    <option value="Tamil">Tamil</option>
                    <option value="Hindi">Hindi</option>
                    <option value="Malayalam">Malayalam</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[#a294b8] uppercase tracking-wider block">Base Royalty Payout Currency</label>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setCurrency('INR')}
                    className={`flex-1 py-2.5 rounded-xl border text-center transition-all ${
                      currency === 'INR'
                        ? 'bg-[#f2542d]/20 border-[#f2542d] text-[#f2542d] font-bold'
                        : 'bg-[#08060d] border border-[#241c33] text-[#a294b8]'
                    }`}
                  >
                    INR (₹ Indian Rupee)
                  </button>
                  <button
                    type="button"
                    onClick={() => setCurrency('USD')}
                    className={`flex-1 py-2.5 rounded-xl border text-center transition-all ${
                      currency === 'USD'
                        ? 'bg-[#f2542d]/20 border-[#f2542d] text-[#f2542d] font-bold'
                        : 'bg-[#08060d] border border-[#241c33] text-[#a294b8]'
                    }`}
                  >
                    USD ($ US Dollar)
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* 2. WHATSAPP & PHONE-FIRST NOTIFICATION ENDPOINTS */}
          <div className="p-6 rounded-3xl bg-[#120e1b] border border-[#241c33] space-y-5 shadow-lg">
            <div className="flex items-center gap-2.5 pb-3 border-b border-[#241c33]">
              <Smartphone className="w-5 h-5 text-[#25D366]" />
              <h3 className="font-serif text-lg font-bold text-[#f5efe6]">WhatsApp Mobile Approval Endpoint</h3>
            </div>

            <div className="space-y-4 font-mono text-xs">
              <div className="space-y-1.5">
                <label className="text-[#a294b8] uppercase tracking-wider block">Artist WhatsApp Endpoint Phone Number</label>
                <input
                  type="text"
                  value={whatsAppNumber}
                  onChange={(e) => setWhatsAppNumber(e.target.value)}
                  placeholder="+91 98765 43210"
                  className="w-full bg-[#08060d] border border-[#342847] text-[#25D366] font-bold rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-[#25D366]"
                />
              </div>

              <div className="p-3.5 rounded-2xl bg-[#08060d] border border-[#25D366]/30 space-y-3">
                <label className="flex items-center justify-between cursor-pointer">
                  <div>
                    <span className="text-[#f5efe6] font-bold block">Instant Human-Checkpoint Nudges</span>
                    <span className="text-[10px] text-[#6d6183] block">Send automated WhatsApp deep-links when Mix QC or Split approvals trigger</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={enableWhatsAppNudges}
                    onChange={(e) => setEnableWhatsAppNudges(e.target.checked)}
                    className="w-4 h-4 accent-[#25D366] rounded cursor-pointer"
                  />
                </label>

                <label className="flex items-center justify-between cursor-pointer pt-2 border-t border-[#241c33]">
                  <div>
                    <span className="text-[#f5efe6] font-bold block">Low-Bandwidth Mobile Audio Previews</span>
                    <span className="text-[10px] text-[#6d6183] block">Compress preview snippets for fast streaming over 3G/4G networks</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={lowBandwidthMode}
                    onChange={(e) => setLowBandwidthMode(e.target.checked)}
                    className="w-4 h-4 accent-[#25D366] rounded cursor-pointer"
                  />
                </label>
              </div>
            </div>
          </div>

          {/* 3. AUDIO MASTERING & RELEASE BLOCKING CEILINGS */}
          <div className="p-6 rounded-3xl bg-[#120e1b] border border-[#241c33] space-y-5 shadow-lg">
            <div className="flex items-center gap-2.5 pb-3 border-b border-[#241c33]">
              <Volume2 className="w-5 h-5 text-[#f2542d]" />
              <h3 className="font-serif text-lg font-bold text-[#f5efe6]">Audio Mastering & DSP Release Blockers</h3>
            </div>

            <div className="space-y-4 font-mono text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[#a294b8] uppercase tracking-wider block">Target Integrated Loudness</label>
                  <div className="flex items-center gap-2 bg-[#08060d] border border-[#342847] rounded-xl px-3 py-2 text-[#43c9a0]">
                    <input
                      type="number"
                      step="0.1"
                      value={targetLufs}
                      onChange={(e) => setTargetLufs(parseFloat(e.target.value))}
                      className="w-full bg-transparent font-bold focus:outline-none"
                    />
                    <span>LUFS</span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[#a294b8] uppercase tracking-wider block">True Peak Max Ceiling</label>
                  <div className="flex items-center gap-2 bg-[#08060d] border border-[#342847] rounded-xl px-3 py-2 text-[#f2542d]">
                    <input
                      type="number"
                      step="0.1"
                      value={truePeakCeiling}
                      onChange={(e) => setTruePeakCeiling(parseFloat(e.target.value))}
                      className="w-full bg-transparent font-bold focus:outline-none"
                    />
                    <span>dBTP</span>
                  </div>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-[#08060d] border border-[#f2542d]/30">
                <label className="flex items-center justify-between cursor-pointer">
                  <div>
                    <span className="text-[#ff7a4d] font-bold block">Hard Release Block on Peak Breach</span>
                    <span className="text-[10px] text-[#6d6183] block">Strictly disable distribution delivery if True Peak exceeds -1.0 dBTP ceiling</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={hardReleaseBlock}
                    onChange={(e) => setHardReleaseBlock(e.target.checked)}
                    className="w-4 h-4 accent-[#f2542d] rounded cursor-pointer"
                  />
                </label>
              </div>
            </div>
          </div>

          {/* 4. AI PROVENANCE & DATA PRIVACY POSTURE */}
          <div className="p-6 rounded-3xl bg-[#120e1b] border border-[#241c33] space-y-5 shadow-lg">
            <div className="flex items-center gap-2.5 pb-3 border-b border-[#241c33]">
              <ShieldCheck className="w-5 h-5 text-[#ffd48a]" />
              <h3 className="font-serif text-lg font-bold text-[#f5efe6]">AI Agent Provenance & Privacy</h3>
            </div>

            <div className="space-y-4 font-mono text-xs">
              <div className="p-3.5 rounded-2xl bg-[#08060d] border border-[#ffd48a]/30 space-y-3">
                <label className="flex items-center justify-between cursor-pointer">
                  <div>
                    <span className="text-[#ffd48a] font-bold block">Zero-Retention Ephemeral RAM Processing</span>
                    <span className="text-[10px] text-[#6d6183] block">Never retain audio stems or lyrics on remote servers or for model training</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={zeroRetentionMode}
                    onChange={(e) => setZeroRetentionMode(e.target.checked)}
                    className="w-4 h-4 accent-[#ffd48a] rounded cursor-pointer"
                  />
                </label>

                <label className="flex items-center justify-between cursor-pointer pt-2 border-t border-[#241c33]">
                  <div>
                    <span className="text-[#f5efe6] font-bold block">Auto-Run Vetted Specialist Agents</span>
                    <span className="text-[10px] text-[#6d6183] block">Execute installed marketplace agents automatically on new track ingests</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={autoRunVettedAgents}
                    onChange={(e) => setAutoRunVettedAgents(e.target.checked)}
                    className="w-4 h-4 accent-[#ffd48a] rounded cursor-pointer"
                  />
                </label>
              </div>

              <div className="space-y-1.5">
                <label className="text-[#a294b8] uppercase tracking-wider block">Preferred Foundation Intelligence Engine</label>
                <select
                  value={preferredModel}
                  onChange={(e) => setPreferredModel(e.target.value)}
                  className="w-full bg-[#08060d] border border-[#342847] text-[#ffd48a] rounded-xl px-3.5 py-2.5 focus:outline-none"
                >
                  <option value="Gemini 2.5 Flash">Gemini 2.5 Flash (Ultra-Fast Audio & Meter Inference)</option>
                  <option value="Gemini 1.5 Pro">Gemini 1.5 Pro (Deep Composition & Harmonic Reasoning)</option>
                </select>
              </div>
            </div>
          </div>

          {/* 5. DSP DISTRIBUTION & COPYRIGHT CREDENTIALS */}
          <div className="p-6 rounded-3xl bg-[#120e1b] border border-[#241c33] space-y-5 shadow-lg lg:col-span-2">
            <div className="flex items-center gap-2.5 pb-3 border-b border-[#241c33]">
              <Key className="w-5 h-5 text-[#a56bd6]" />
              <h3 className="font-serif text-lg font-bold text-[#f5efe6]">DSP Distribution Credentials & Royalty Escrow</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-mono text-xs">
              <div className="space-y-1.5">
                <label className="text-[#a294b8] uppercase tracking-wider block">Global ISRC Code Prefix</label>
                <input
                  type="text"
                  value={isrcPrefix}
                  onChange={(e) => setIsrcPrefix(e.target.value)}
                  className="w-full bg-[#08060d] border border-[#342847] text-[#a56bd6] font-bold rounded-xl px-3.5 py-2.5 focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[#a294b8] uppercase tracking-wider block">Apple Digital Masters ID</label>
                <input
                  type="text"
                  value={appleMasteringId}
                  onChange={(e) => setAppleMasteringId(e.target.value)}
                  className="w-full bg-[#08060d] border border-[#342847] text-[#f5efe6] rounded-xl px-3.5 py-2.5 focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[#a294b8] uppercase tracking-wider block">Spotify for Artists Direct API</label>
                <div className="flex items-center justify-between bg-[#08060d] border border-[#342847] rounded-xl px-3.5 py-2">
                  <span className="text-[#43c9a0] font-bold flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-[#43c9a0]" />
                    Connected
                  </span>
                  <button
                    type="button"
                    onClick={() => setSpotifyStatus(spotifyStatus === 'connected' ? 'disconnected' : 'connected')}
                    className="text-[10px] text-[#a294b8] hover:underline"
                  >
                    {spotifyStatus === 'connected' ? 'Re-key' : 'Connect'}
                  </button>
                </div>
              </div>
            </div>
          </div>

        </div>
      )}

      {/* Save Notification Toast */}
      {savedToast && (
        <div className="fixed bottom-6 right-6 z-50 p-4 rounded-2xl bg-[#191324] border-2 border-[#43c9a0] text-[#f5efe6] shadow-2xl flex items-center gap-3 animate-fadeIn">
          <CheckCircle2 className="w-5 h-5 text-[#43c9a0]" />
          <div className="text-xs font-mono">
            <span className="font-bold text-[#43c9a0] block">{toastMessage}</span>
            <span>Workspace billing and preferences updated successfully.</span>
          </div>
        </div>
      )}

    </div>
  );
};

