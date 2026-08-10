import React, { useState } from 'react';
import {
  Store,
  Sparkles,
  ShieldCheck,
  Cpu,
  CheckCircle2,
  Play,
  Download,
  Search,
  Filter,
  ArrowUpDown,
  Lock,
  Layers,
  Zap,
  Info,
  TrendingUp,
  FileCode2,
  ExternalLink,
  Award,
  X,
  Smartphone,
  Eye,
  Check
} from 'lucide-react';
import { MOCK_AGENTS, AgentListing } from '../../data/mockAgents';
import { TrackItem, Language } from '../../types';
import { PageHeader, SectionCard, SectionHeader, StatCard } from '../SectionPanel';

interface AgentMarketplaceTabProps {
  activeTrack: TrackItem;
  tracks: TrackItem[];
  installedAgentIds: string[];
  onInstallAgent: (agentId: string) => void;
  onInspectRaw?: (title: string, payload: any) => void;
}

export const AgentMarketplaceTab: React.FC<AgentMarketplaceTabProps> = ({
  activeTrack,
  tracks,
  installedAgentIds,
  onInstallAgent,
  onInspectRaw
}) => {
  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedLanguage, setSelectedLanguage] = useState<string>('All');
  const [sortBy, setSortBy] = useState<'outcome' | 'save_rate' | 'retention' | 'newest'>('outcome');

  // Detail Modal State
  const [selectedAgentForDetail, setSelectedAgentForDetail] = useState<AgentListing | null>(null);

  // Sandbox Modal State
  const [sandboxAgent, setSandboxAgent] = useState<AgentListing | null>(null);
  const [sandboxSelectedTrackId, setSandboxSelectedTrackId] = useState<string>(activeTrack.id);
  const [sandboxRunning, setSandboxRunning] = useState<boolean>(false);
  const [sandboxCompleted, setSandboxCompleted] = useState<boolean>(false);
  const [sandboxProgress, setSandboxProgress] = useState<number>(0);

  // Installed Feedback Toast
  const [justInstalledId, setJustInstalledId] = useState<string | null>(null);

  const categories = ['All', 'Lyricism & Meter', 'Arrangement & Beats', 'Mastering & QC', 'Sync & Pitching', 'Orchestration'];
  const languages = ['All', 'Telugu', 'Punjabi', 'Tamil', 'Hindi', 'Multi-Language'];

  // Filter & Sort Logic
  const filteredAgents = MOCK_AGENTS.filter((agent) => {
    const matchesSearch =
      agent.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      agent.author.toLowerCase().includes(searchQuery.toLowerCase()) ||
      agent.description.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory = selectedCategory === 'All' || agent.category === selectedCategory;
    const matchesLanguage =
      selectedLanguage === 'All' ||
      agent.languages.includes('Multi-Language') ||
      agent.languages.includes(selectedLanguage as Language);

    return matchesSearch && matchesCategory && matchesLanguage;
  }).sort((a, b) => {
    if (sortBy === 'outcome') {
      return b.outcomeMetrics.pipelineCompletionRate - a.outcomeMetrics.pipelineCompletionRate;
    }
    if (sortBy === 'retention') {
      return b.outcomeMetrics.postPurchaseRetentionRate - a.outcomeMetrics.postPurchaseRetentionRate;
    }
    if (sortBy === 'save_rate') {
      return b.outcomeMetrics.totalInstalls - a.outcomeMetrics.totalInstalls;
    }
    return b.id.localeCompare(a.id);
  });

  const handleRunSandbox = () => {
    setSandboxRunning(true);
    setSandboxCompleted(false);
    setSandboxProgress(15);

    const interval = setInterval(() => {
      setSandboxProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setSandboxRunning(false);
          setSandboxCompleted(true);
          return 100;
        }
        return prev + 25;
      });
    }, 400);
  };

  const handleInstall = (agentId: string) => {
    onInstallAgent(agentId);
    setJustInstalledId(agentId);
    setTimeout(() => setJustInstalledId(null), 3000);
  };

  const targetTrackForSandbox = tracks.find((t) => t.id === sandboxSelectedTrackId) || activeTrack;

  return (
    <div className="space-y-6">
      {/* Standardized Page Header */}
      <PageHeader
        icon={Store}
        title="Agent Marketplace & Ecosystem"
        description="Install vetted third-party AI agents directly into your studio pipeline."
        badge="Outcome Ranked"
        action={
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#08060d] border border-[#241c33] text-xs font-mono text-[#ffd48a]">
            <ShieldCheck className="w-4 h-4 text-[#ffd48a]" />
            <span>Provenance & Compliance Verified</span>
          </div>
        }
      />

      {/* Controls: Search, Category Filters, Language & Outcome-Weighted Sorting */}
      <div className="p-5 rounded-2xl bg-[#120e1b] border border-[#241c33] space-y-4 shadow-lg">
        
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          
          {/* Search Input */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-[#6d6183] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search specialists (e.g. Telugu, 808, True Peak, OTT sync)..."
              className="w-full bg-[#08060d] border border-[#342847] rounded-xl pl-10 pr-4 py-2.5 text-xs text-[#f5efe6] placeholder-[#6d6183] focus:outline-none focus:border-[#ffd48a]"
            />
          </div>

          {/* Outcome-Weighted Sort Control */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 text-xs font-mono text-[#a294b8]">
              <ArrowUpDown className="w-3.5 h-3.5 text-[#ffd48a]" />
              <span>Rank By:</span>
            </div>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-[#08060d] border border-[#342847] text-[#ffd48a] font-mono text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-[#ffd48a] cursor-pointer"
            >
              <option value="outcome">Outcome-Weighted Rank (Pipeline Completion & Retention)</option>
              <option value="retention">Highest Artist Retention Rate (% Post-Purchase)</option>
              <option value="save_rate">Most Installed Pipeline Stages</option>
              <option value="newest">Newest Specialist Releases</option>
            </select>
          </div>

        </div>

        {/* Category Filters */}
        <div className="flex items-center justify-between gap-2 overflow-x-auto pt-2 border-t border-[#241c33]/60 scrollbar-none">
          <div className="flex items-center gap-2 flex-nowrap">
            <span className="text-[11px] font-mono text-[#6d6183] uppercase tracking-wider flex-shrink-0 mr-1">
              Category:
            </span>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-xl text-xs font-sans transition-all flex-shrink-0 ${
                  selectedCategory === cat
                    ? 'bg-[#f2542d] text-white font-semibold shadow-md'
                    : 'bg-[#08060d] text-[#a294b8] hover:text-[#f5efe6] border border-[#241c33]'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Language Selector */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="text-[11px] font-mono text-[#6d6183] uppercase tracking-wider">Language:</span>
            <select
              value={selectedLanguage}
              onChange={(e) => setSelectedLanguage(e.target.value)}
              className="bg-[#08060d] border border-[#342847] text-[#a294b8] font-mono text-xs rounded-xl px-2.5 py-1 focus:outline-none"
            >
              {languages.map((lang) => (
                <option key={lang} value={lang}>
                  {lang}
                </option>
              ))}
            </select>
          </div>
        </div>

      </div>

      {/* Agents Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredAgents.map((agent) => {
          const isInstalled = installedAgentIds.includes(agent.id);
          return (
            <div
              key={agent.id}
              className="p-5 rounded-3xl bg-[#120e1b] border border-[#241c33] hover:border-[#342847] transition-all flex flex-col justify-between space-y-4 group relative shadow-lg"
            >
              
              {/* Card Header: Vetting Badge & Category */}
              <div className="space-y-3">
                
                <div className="flex items-center justify-between gap-2">
                  <span className="px-2.5 py-1 rounded-full bg-[#1f182c] text-[#a56bd6] font-mono text-[10px] font-semibold border border-[#342847]">
                    {agent.category}
                  </span>

                  <span className="px-2.5 py-1 rounded-full bg-[#ffd48a]/10 text-[#ffd48a] font-mono text-[10px] font-bold border border-[#ffd48a]/30 flex items-center gap-1">
                    <Award className="w-3 h-3 text-[#ffd48a]" />
                    {agent.authorBadge}
                  </span>
                </div>

                <div>
                  <h3 className="font-serif text-lg font-bold text-[#f5efe6] group-hover:text-[#ffd48a] transition-colors leading-snug">
                    {agent.name}
                  </h3>
                  <p className="text-xs font-mono text-[#6d6183]">
                    Published by <span className="text-[#a294b8]">{agent.author}</span>
                  </p>
                </div>

                <p className="font-serif text-xs text-[#a294b8] line-clamp-2 leading-relaxed">
                  {agent.description}
                </p>

              </div>

              {/* FIRST-CLASS PROVENANCE LABEL CONTAINER (Platform Compliance Position) */}
              <div className="p-3.5 rounded-2xl bg-[#08060d] border border-[#ffd48a]/30 space-y-2 font-mono text-[11px] relative overflow-hidden">
                <div className="flex items-center justify-between text-[#ffd48a] font-bold">
                  <div className="flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-[#ffd48a]" />
                    <span className="uppercase tracking-wider text-[10px]">PROVENANCE & DATA POSTURE</span>
                  </div>
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#ffd48a]/10 text-[#ffd48a] border border-[#ffd48a]/20">
                    AUDITED
                  </span>
                </div>

                <div className="space-y-1 text-[#f5efe6]/90 text-[10px] leading-tight">
                  <div className="truncate">
                    <span className="text-[#6d6183]">Models:</span> {agent.provenance.baseModels.join(', ')}
                  </div>
                  <div className="truncate text-[#43c9a0]">
                    <span className="text-[#6d6183]">Data Posture:</span> {agent.provenance.trainingDataPosture}
                  </div>
                </div>
              </div>

              {/* Outcome-Weighted Metrics Bar */}
              <div className="grid grid-cols-3 gap-2 p-2.5 rounded-xl bg-[#191324] font-mono text-center text-[10px]">
                <div>
                  <span className="text-[#6d6183] block">Completion</span>
                  <span className="text-[#ffd48a] font-bold block">{agent.outcomeMetrics.pipelineCompletionRate}%</span>
                </div>
                <div>
                  <span className="text-[#6d6183] block">Retention</span>
                  <span className="text-[#43c9a0] font-bold block">{agent.outcomeMetrics.postPurchaseRetentionRate}%</span>
                </div>
                <div>
                  <span className="text-[#6d6183] block">Save Uplift</span>
                  <span className="text-[#f2542d] font-bold block truncate">{agent.outcomeMetrics.listenerSaveRateUplift}</span>
                </div>
              </div>

              {/* Card Footer: Pricing & Action Buttons */}
              <div className="pt-2 border-t border-[#241c33] flex items-center justify-between gap-2">
                <div>
                  <span className="text-xs font-mono font-bold text-[#f5efe6] block">
                    {agent.priceDisplay}
                  </span>
                  <span className="text-[9px] font-mono text-[#6d6183] uppercase block">
                    {agent.pricingType === 'subscription' ? 'Cancel Anytime' : 'Pay Per Use'}
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  {/* Sandbox Button */}
                  <button
                    onClick={() => {
                      setSandboxAgent(agent);
                      setSandboxCompleted(false);
                      setSandboxRunning(false);
                    }}
                    className="px-3 py-2 rounded-xl bg-[#1f182c] hover:bg-[#342847] border border-[#ffd48a]/40 text-[#ffd48a] text-xs font-mono font-medium transition-colors flex items-center gap-1"
                    title="Test agent on your track with watermarked preview"
                  >
                    <Zap className="w-3.5 h-3.5 text-[#ffd48a]" />
                    <span>Sandbox</span>
                  </button>

                  {/* Detail Modal Button */}
                  <button
                    onClick={() => setSelectedAgentForDetail(agent)}
                    className="p-2 rounded-xl bg-[#1f182c] hover:bg-[#342847] text-[#a294b8] hover:text-[#f5efe6] transition-colors"
                    title="View Full Specialist Details"
                  >
                    <Eye className="w-4 h-4" />
                  </button>

                  {/* Install Button */}
                  <button
                    onClick={() => handleInstall(agent.id)}
                    disabled={isInstalled}
                    className={`px-3.5 py-2 rounded-xl text-xs font-serif font-semibold transition-all flex items-center gap-1 ${
                      isInstalled
                        ? 'bg-[#191324] text-[#43c9a0] border border-[#43c9a0]/40 cursor-default'
                        : 'bg-[#f2542d] hover:bg-[#ff7a4d] text-white shadow-md'
                    }`}
                  >
                    {isInstalled ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-[#43c9a0]" />
                        <span>Installed</span>
                      </>
                    ) : (
                      <>
                        <Download className="w-3.5 h-3.5 text-white" />
                        <span>Install</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

            </div>
          );
        })}
      </div>

      {/* AGENT DETAIL MODAL */}
      {selectedAgentForDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-2xl bg-[#0d0a14] border border-[#342847] rounded-3xl p-6 md:p-8 max-h-[90vh] overflow-y-auto space-y-6 text-[#f5efe6] relative shadow-2xl">
            
            <button
              onClick={() => setSelectedAgentForDetail(null)}
              className="absolute top-6 right-6 p-2 rounded-full bg-[#120e1b] hover:bg-[#1f182c] text-[#a294b8] hover:text-[#f5efe6] transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-full bg-[#f2542d]/20 text-[#f2542d] font-mono text-xs font-bold border border-[#f2542d]/40">
                  {selectedAgentForDetail.category}
                </span>
                <span className="px-3 py-1 rounded-full bg-[#ffd48a]/10 text-[#ffd48a] font-mono text-xs font-bold border border-[#ffd48a]/30 flex items-center gap-1">
                  <Award className="w-3.5 h-3.5" />
                  {selectedAgentForDetail.authorBadge}
                </span>
              </div>

              <h2 className="font-serif text-2xl font-bold text-[#f5efe6]">
                {selectedAgentForDetail.name}
              </h2>
              <p className="text-xs font-mono text-[#6d6183]">
                Specialist Creator: <span className="text-[#ffd48a]">{selectedAgentForDetail.author}</span>
              </p>
            </div>

            {/* Long Description */}
            <div className="space-y-2">
              <h4 className="text-xs font-mono uppercase tracking-wider text-[#a294b8]">Specialist Architecture & Purpose</h4>
              <p className="font-serif text-sm text-[#a294b8] leading-relaxed bg-[#120e1b] p-4 rounded-2xl border border-[#241c33]">
                {selectedAgentForDetail.longDescription}
              </p>
            </div>

            {/* PROVENANCE LABEL FULL DISCLOSURE BOX */}
            <div className="p-5 rounded-2xl bg-[#08060d] border-2 border-[#ffd48a]/40 space-y-3 font-mono text-xs">
              <div className="flex items-center justify-between text-[#ffd48a]">
                <div className="flex items-center gap-2 font-bold">
                  <ShieldCheck className="w-4 h-4 text-[#ffd48a]" />
                  <span className="uppercase tracking-wider">PLATFORM PROVENANCE & COMPLIANCE LABEL</span>
                </div>
                <span className="px-2 py-0.5 rounded bg-[#43c9a0]/20 text-[#43c9a0] font-mono text-[10px] border border-[#43c9a0]/40 font-bold">
                  VERIFIED AUDIT
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-[#a294b8]">
                <div>
                  <span className="text-[#6d6183] block">AI Model Stack:</span>
                  <span className="text-[#f5efe6] font-semibold">{selectedAgentForDetail.provenance.baseModels.join(', ')}</span>
                </div>
                <div>
                  <span className="text-[#6d6183] block">Legal Audit Date:</span>
                  <span className="text-[#f5efe6] font-semibold">{selectedAgentForDetail.provenance.complianceAuditDate}</span>
                </div>
                <div className="sm:col-span-2">
                  <span className="text-[#6d6183] block">Training Data Posture:</span>
                  <span className="text-[#43c9a0] font-semibold">{selectedAgentForDetail.provenance.trainingDataPosture}</span>
                </div>
                <div className="sm:col-span-2">
                  <span className="text-[#6d6183] block">Data License Corpus:</span>
                  <span className="text-[#f5efe6]">{selectedAgentForDetail.provenance.dataLicenseType}</span>
                </div>
              </div>
            </div>

            {/* Sample Outputs */}
            <div className="space-y-3">
              <h4 className="text-xs font-mono uppercase tracking-wider text-[#a294b8]">Sample Before / After Analysis Output</h4>
              {selectedAgentForDetail.sampleOutputs.map((out, idx) => (
                <div key={idx} className="p-4 rounded-2xl bg-[#120e1b] border border-[#241c33] space-y-2 font-mono text-xs">
                  <span className="font-bold text-[#ffd48a] block">{out.title}</span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                    <div className="p-2.5 rounded-xl bg-[#191324] border border-[#241c33]">
                      <span className="text-[#f2542d] font-bold block text-[10px]">BEFORE AGENT:</span>
                      <span className="text-[#a294b8]">{out.beforeTextOrMetric}</span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-[#191324] border border-[#43c9a0]/40">
                      <span className="text-[#43c9a0] font-bold block text-[10px]">AFTER SPECIALIST:</span>
                      <span className="text-[#f5efe6]">{out.afterTextOrMetric}</span>
                    </div>
                  </div>
                  <p className="text-[10px] text-[#6d6183] italic">{out.notes}</p>
                </div>
              ))}
            </div>

            {/* Action Buttons */}
            <div className="pt-4 border-t border-[#241c33] flex items-center justify-between gap-4">
              <div>
                <span className="text-lg font-serif font-bold text-[#ffd48a] block">
                  {selectedAgentForDetail.priceDisplay}
                </span>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    setSandboxAgent(selectedAgentForDetail);
                    setSelectedAgentForDetail(null);
                  }}
                  className="px-4 py-2.5 rounded-xl bg-[#1f182c] hover:bg-[#342847] border border-[#ffd48a]/40 text-[#ffd48a] text-xs font-mono font-bold transition-colors flex items-center gap-2"
                >
                  <Zap className="w-4 h-4 text-[#ffd48a]" />
                  <span>Run Sandbox Test</span>
                </button>

                <button
                  onClick={() => {
                    handleInstall(selectedAgentForDetail.id);
                    setSelectedAgentForDetail(null);
                  }}
                  className="px-5 py-2.5 rounded-xl bg-[#f2542d] hover:bg-[#ff7a4d] text-white text-xs font-serif font-bold transition-all shadow-lg shadow-[#f2542d]/30"
                >
                  Install Agent Stage
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* SANDBOX PREVIEW MODAL WITH WATERMARKED OUTPUT */}
      {sandboxAgent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-xl bg-[#0d0a14] border-2 border-[#ffd48a]/60 rounded-3xl p-6 md:p-8 max-h-[92vh] overflow-y-auto space-y-6 text-[#f5efe6] relative shadow-2xl">
            
            <button
              onClick={() => setSandboxAgent(null)}
              className="absolute top-6 right-6 p-2 rounded-full bg-[#120e1b] hover:bg-[#1f182c] text-[#a294b8] hover:text-[#f5efe6] transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Sandbox Header */}
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-[#ffd48a]/20 text-[#ffd48a] font-mono text-[10px] font-bold border border-[#ffd48a]/40 uppercase tracking-wider flex items-center gap-1">
                  <Zap className="w-3 h-3 text-[#ffd48a]" />
                  SANDBOX PREVIEW MODE
                </span>
                <span className="text-[10px] font-mono text-[#6d6183]">Zero Cost • Watermarked Output</span>
              </div>

              <h3 className="font-serif text-xl font-bold text-[#f5efe6]">
                Testing: {sandboxAgent.name}
              </h3>
            </div>

            {/* Target Track Picker */}
            <div className="p-4 rounded-2xl bg-[#120e1b] border border-[#241c33] space-y-2">
              <label className="text-xs font-mono text-[#a294b8] uppercase tracking-wider block">
                Select Track to Run Test On:
              </label>
              <select
                value={sandboxSelectedTrackId}
                onChange={(e) => setSandboxSelectedTrackId(e.target.value)}
                className="w-full bg-[#08060d] border border-[#342847] text-[#ffd48a] font-mono text-xs rounded-xl px-3 py-2.5 focus:outline-none"
              >
                {tracks.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.title} ({t.primaryArtist} • {t.language})
                  </option>
                ))}
              </select>
            </div>

            {/* Run Test Trigger */}
            {!sandboxCompleted && !sandboxRunning && (
              <button
                onClick={handleRunSandbox}
                className="w-full py-3.5 rounded-2xl bg-[#f2542d] hover:bg-[#ff7a4d] text-white font-serif font-bold text-sm transition-all shadow-xl shadow-[#f2542d]/30 flex items-center justify-center gap-2"
              >
                <Play className="w-4 h-4 fill-white" />
                <span>Run Sandbox Agent on "{targetTrackForSandbox.title}"</span>
              </button>
            )}

            {/* Running Progress State */}
            {sandboxRunning && (
              <div className="p-5 rounded-2xl bg-[#120e1b] border border-[#ffd48a]/30 space-y-3 font-mono text-xs text-center">
                <div className="flex items-center justify-center gap-2 text-[#ffd48a]">
                  <Sparkles className="w-4 h-4 animate-spin text-[#ffd48a]" />
                  <span>Executing Specialist Model Analysis ({sandboxProgress}%)...</span>
                </div>

                <div className="w-full h-2 bg-[#08060d] rounded-full overflow-hidden border border-[#241c33]">
                  <div
                    className="h-full bg-[#ffd48a] transition-all duration-300"
                    style={{ width: `${sandboxProgress}%` }}
                  />
                </div>
                <p className="text-[10px] text-[#6d6183]">Processing audio stems & language meter weights in ephemeral memory sandbox...</p>
              </div>
            )}

            {/* COMPLETED WATERMARKED OUTPUT DISPLAY */}
            {sandboxCompleted && (
              <div className="space-y-4 animate-fadeIn">
                
                {/* PROMINENT WATERMARK OVERLAY BADGE (Mandatory Requirement) */}
                <div className="p-3 rounded-2xl bg-[#2b0e0e] border-2 border-[#f2542d] text-center font-mono text-xs text-[#ff7a4d] font-bold uppercase tracking-wider shadow-lg animate-pulse flex items-center justify-center gap-2">
                  <Lock className="w-4 h-4 text-[#f2542d]" />
                  <span>{sandboxAgent.sandboxTemplate.watermarkNotice}</span>
                </div>

                {/* Output Analysis Content */}
                <div className="p-5 rounded-2xl bg-[#120e1b] border border-[#342847] space-y-3 relative overflow-hidden">
                  
                  {/* Subtle Background Watermark Text Pattern */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-5 pointer-events-none select-none rotate-[-12deg]">
                    <span className="font-mono text-3xl font-black text-[#f2542d] uppercase tracking-widest text-center">
                      GHARANA SANDBOX WATERMARK
                    </span>
                  </div>

                  <div className="space-y-1 relative z-10">
                    <span className="text-[10px] font-mono text-[#ffd48a] uppercase tracking-wider block">
                      Sandbox Output Summary
                    </span>
                    <p className="font-serif text-sm text-[#f5efe6] leading-relaxed">
                      {sandboxAgent.sandboxTemplate.analysisSummary}
                    </p>
                  </div>

                  <div className="space-y-1 relative z-10 font-mono text-xs pt-2 border-t border-[#241c33]">
                    <span className="text-[10px] text-[#43c9a0] uppercase tracking-wider block">
                      Specialist Recommended Delta
                    </span>
                    <span className="font-bold text-[#43c9a0] block">
                      {sandboxAgent.sandboxTemplate.sampleMetricDelta}
                    </span>
                  </div>

                  <div className="space-y-1 relative z-10 font-mono text-xs pt-2 border-t border-[#241c33]">
                    <span className="text-[10px] text-[#a294b8] uppercase tracking-wider block">
                      Suggestions:
                    </span>
                    <ul className="space-y-1 text-[11px] text-[#a294b8] list-disc list-inside">
                      {sandboxAgent.sandboxTemplate.suggestions.map((sug, i) => (
                        <li key={i}>{sug}</li>
                      ))}
                    </ul>
                  </div>

                </div>

                {/* CTAs to Install */}
                <div className="p-4 rounded-2xl bg-[#191324] border border-[#ffd48a]/30 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="text-xs font-mono text-[#a294b8]">
                    <span>Satisfied with the preview?</span>
                    <span className="font-bold text-[#ffd48a] block">{sandboxAgent.priceDisplay}</span>
                  </div>

                  <button
                    onClick={() => {
                      handleInstall(sandboxAgent.id);
                      setSandboxAgent(null);
                    }}
                    className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-[#f2542d] hover:bg-[#ff7a4d] text-white text-xs font-serif font-bold transition-all shadow-lg shadow-[#f2542d]/30"
                  >
                    Install & Unlock Full Unwatermarked Output
                  </button>
                </div>

              </div>
            )}

          </div>
        </div>
      )}

      {/* Installed Toast Notification */}
      {justInstalledId && (
        <div className="fixed bottom-6 right-6 z-50 p-4 rounded-2xl bg-[#191324] border-2 border-[#43c9a0] text-[#f5efe6] shadow-2xl flex items-center gap-3 animate-fadeIn">
          <CheckCircle2 className="w-5 h-5 text-[#43c9a0]" />
          <div className="text-xs font-mono">
            <span className="font-bold text-[#43c9a0] block">Agent Stage Installed!</span>
            <span>Added specialist stage to your active track pipeline.</span>
          </div>
        </div>
      )}

    </div>
  );
};
