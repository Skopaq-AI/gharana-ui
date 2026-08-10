import React, { useState } from 'react';
import { Sliders, Sparkles, BookOpen, Users, Rocket, TrendingUp, Plus, X, Upload } from 'lucide-react';
import { INITIAL_TRACKS } from './data/mockTracks';
import { TrackItem, ActiveTab, Language } from './types';
import { NightBackground } from './components/NightBackground';
import { Header } from './components/Header';
import { AudioPlayerBar } from './components/AudioPlayerBar';
import { InspectorModal } from './components/InspectorModal';
import { MobileApprovalModal } from './components/MobileApprovalModal';
import { MixQCTab } from './components/tabs/MixQCTab';
import { AnRFeedbackTab } from './components/tabs/AnRFeedbackTab';
import { LyricsTab } from './components/tabs/LyricsTab';
import { SplitsTab } from './components/tabs/SplitsTab';
import { ReleaseDeliveryTab } from './components/tabs/ReleaseDeliveryTab';
import { GrowthTab } from './components/tabs/GrowthTab';

export default function App() {
  const [tracks, setTracks] = useState<TrackItem[]>(INITIAL_TRACKS);
  const [activeTrackId, setActiveTrackId] = useState<string>(INITIAL_TRACKS[0].id);
  const [activeTab, setActiveTab] = useState<ActiveTab>('mix_qc');

  // Modal State for Inspecting Raw Payload
  const [inspectorState, setInspectorState] = useState<{
    isOpen: boolean;
    title: string;
    payload: any;
  }>({
    isOpen: false,
    title: '',
    payload: null
  });

  // Modal State for Global Mobile Approval View
  const [showGlobalMobileApproval, setShowGlobalMobileApproval] = useState(false);

  // Modal State for New Track Ingest
  const [showNewTrackModal, setShowNewTrackModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newArtist, setNewArtist] = useState('');
  const [newLanguage, setNewLanguage] = useState<Language>('Telugu');
  const [newGenre, setNewGenre] = useState('Indie Pop');
  const [newLyrics, setNewLyrics] = useState('');

  const activeTrack = tracks.find((t) => t.id === activeTrackId) || tracks[0];

  const handleUpdateTrack = (updated: TrackItem) => {
    setTracks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
  };

  const openInspector = (title: string, payload: any) => {
    setInspectorState({
      isOpen: true,
      title,
      payload
    });
  };

  const handleCreateTrack = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle) return;

    const newTrack: TrackItem = {
      id: `trk-${Date.now()}`,
      title: newTitle,
      artist: newArtist || 'Independent Artist',
      language: newLanguage,
      genre: newGenre,
      durationSeconds: 200,
      updatedAt: new Date().toISOString(),
      audioMetrics: {
        integratedLufs: -14.2,
        truePeakDbtp: -1.1,
        dynamicRangeLu: 8.5,
        stereoWidth: 1.0,
        sampleRateHz: 48000,
        bitDepth: 24,
        frequencyBins: {
          subBass: -20.0,
          bass: -14.0,
          lowMid: -10.5,
          mid: -12.0,
          highMid: -15.0,
          highs: -21.0
        },
        lufsOverTime: [-20.0, -16.0, -14.2, -14.0, -14.2, -14.5, -14.2]
      },
      arAssessment: {
        verdict: "Fresh submission awaiting deep A&R analysis.",
        narrativeSummary: `New track recorded in ${newLanguage}. Ready for agent processing.`,
        strengths: ["New creative composition"],
        concerns: ["Needs full A&R critique scan"],
        commercialPotentialScore: 80,
        targetAudience: "Regional Indie Listeners",
        suggestedPlaylists: ["Radar South", "Desi Bedroom Pop"],
        recommendedAction: "Run AI A&R Agent Critique to generate strategy.",
        checkpointStatus: 'pending_artist_approval'
      },
      lyricAnalysis: {
        language: newLanguage,
        primaryTheme: "Original lyric composition",
        rhymeScheme: "AABB",
        meterRegularityScore: 90,
        copyrightRiskFlag: false,
        culturalResonanceNotes: `Authored in ${newLanguage}.`,
        lyricsText: newLyrics || "Verse 1 lyrics line...",
        checkpointStatus: 'pending_artist_approval'
      },
      splitGovernance: {
        totalShare: 100,
        checkpointStatus: 'pending_artist_approval',
        contributors: [
          {
            id: `c-${Date.now()}-comp`,
            name: newArtist || 'Primary Artist',
            role: 'Composer / Lyricist',
            side: 'composition',
            sharePercentage: 100,
            email: 'artist@gharana.studio',
            signed: true,
            signatureStatus: 'Signed'
          },
          {
            id: `c-${Date.now()}-rec`,
            name: newArtist || 'Primary Artist',
            role: 'Primary Performer / Master Owner',
            side: 'recording',
            sharePercentage: 100,
            email: 'artist@gharana.studio',
            signed: true,
            signatureStatus: 'Signed'
          }
        ]
      },
      releaseTasks: [
        {
          id: `rt-${Date.now()}`,
          category: 'Audio Master',
          title: 'Master Audio WAV Verification',
          description: '24-bit 48kHz WAV uploaded',
          completed: true,
          requiresArtistApproval: false,
          approvalStatus: 'approved'
        }
      ],
      rawAgentPayloads: {
        ingest: {
          timestamp: new Date().toISOString(),
          status: "SUCCESS"
        }
      }
    };

    setTracks([newTrack, ...tracks]);
    setActiveTrackId(newTrack.id);
    setShowNewTrackModal(false);
    setNewTitle('');
    setNewArtist('');
    setNewLyrics('');
  };

  // Count pending human checkpoints for active track
  const pendingCheckpointsCount = [
    activeTrack.arAssessment?.checkpointStatus === 'pending_artist_approval',
    activeTrack.lyricAnalysis?.checkpointStatus === 'pending_artist_approval',
    activeTrack.splitGovernance?.checkpointStatus === 'pending_artist_approval',
    activeTrack.retroReport?.checkpointStatus === 'pending_artist_approval',
    activeTrack.releaseTasks?.some((t) => t.requiresArtistApproval && t.approvalStatus === 'pending_artist_approval')
  ].filter(Boolean).length;

  const tabs = [
    { id: 'mix_qc' as ActiveTab, label: 'Mix QC & Mastering', icon: Sliders },
    { id: 'ar_feedback' as ActiveTab, label: 'A&R Direction', icon: Sparkles },
    { id: 'lyrics' as ActiveTab, label: 'Lyrics & Meter', icon: BookOpen },
    { id: 'splits' as ActiveTab, label: 'Rights & Splits', icon: Users },
    { id: 'release' as ActiveTab, label: 'Release Delivery', icon: Rocket },
    { id: 'growth' as ActiveTab, label: 'Post-Release Growth', icon: TrendingUp }
  ];

  return (
    <div className="min-h-screen bg-[#08060d] text-[#f5efe6] font-sans relative selection:bg-[#f2542d] selection:text-[#08060d]">
      
      {/* Night Raga Lighting Background Layer */}
      <NightBackground />

      {/* Main Container */}
      <div className="relative z-10 flex flex-col min-h-screen">
        
        {/* Global Header */}
        <Header
          tracks={tracks}
          activeTrack={activeTrack}
          onSelectTrack={(t) => setActiveTrackId(t.id)}
          onNewTrack={() => setShowNewTrackModal(true)}
          pendingCheckpointsCount={pendingCheckpointsCount}
          onOpenMobileApproval={() => setShowGlobalMobileApproval(true)}
        />

        {/* Content Body */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 md:px-8 py-6 space-y-6">
          
          {/* Audio Player Bar */}
          <AudioPlayerBar
            track={activeTrack}
            onInspectRawMetrics={() => openInspector("Audio DSP Metrics Payload", activeTrack.audioMetrics || { info: "Audio metrics missing" })}
          />

          {/* Navigation Tabs Bar */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none border-b border-[#342847]/60">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-sans font-medium transition-all flex-shrink-0 ${
                    isActive
                      ? 'bg-[#191324] text-[#ffd48a] border border-[#f5b544]/40 shadow-lg shadow-[#191324]/50'
                      : 'text-[#a294b8] hover:text-[#f5efe6] hover:bg-[#120e1b]'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-[#f2542d]' : 'text-[#a294b8]'}`} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Active Tab View */}
          <div className="mt-6">
            {activeTab === 'mix_qc' && (
              <MixQCTab
                track={activeTrack}
                onUpdateTrack={handleUpdateTrack}
                onInspectRaw={openInspector}
              />
            )}

            {activeTab === 'ar_feedback' && (
              <AnRFeedbackTab
                track={activeTrack}
                onUpdateTrack={handleUpdateTrack}
                onInspectRaw={openInspector}
              />
            )}

            {activeTab === 'lyrics' && (
              <LyricsTab
                track={activeTrack}
                onUpdateTrack={handleUpdateTrack}
                onInspectRaw={openInspector}
              />
            )}

            {activeTab === 'splits' && (
              <SplitsTab
                track={activeTrack}
                onUpdateTrack={handleUpdateTrack}
                onInspectRaw={openInspector}
              />
            )}

            {activeTab === 'release' && (
              <ReleaseDeliveryTab
                track={activeTrack}
                onUpdateTrack={handleUpdateTrack}
                onInspectRaw={openInspector}
              />
            )}

            {activeTab === 'growth' && (
              <GrowthTab
                track={activeTrack}
                onUpdateTrack={handleUpdateTrack}
                onInspectRaw={openInspector}
              />
            )}
          </div>

        </main>

        {/* Studio Footer */}
        <footer className="mt-12 border-t border-[#342847]/60 bg-[#08060d]/90 py-6 px-4 md:px-8 text-center text-xs font-serif text-[#a294b8]">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
            <p>
              GHARANA Studio Console • <span className="text-[#ffd48a]">The label you never signed with.</span>
            </p>
            <p className="font-mono-num text-[11px] text-[#6d6183]">
              All measurements are Mono • Prose is Serif • Human Approval Checkpoints Active
            </p>
          </div>
        </footer>

      </div>

      {/* Raw Payload Inspector Modal */}
      <InspectorModal
        isOpen={inspectorState.isOpen}
        onClose={() => setInspectorState({ ...inspectorState, isOpen: false })}
        title={inspectorState.title}
        payload={inspectorState.payload}
      />

      {/* Ingest New Track Modal */}
      {showNewTrackModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#08060d]/80 backdrop-blur-md">
          <div className="relative w-full max-w-lg glass-panel rounded-2xl border border-[#342847] p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-[#342847] pb-3">
              <h3 className="font-serif text-lg font-bold text-[#f5efe6] flex items-center gap-2">
                <Upload className="w-5 h-5 text-[#f2542d]" />
                Ingest New Master Track
              </h3>
              <button
                onClick={() => setShowNewTrackModal(false)}
                className="text-[#a294b8] hover:text-[#f5efe6]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTrack} className="space-y-4 text-xs font-serif">
              <div>
                <label className="block text-[#a294b8] mb-1">Track Title</label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Visakha Vibe, Midnight Ghazal..."
                  className="w-full bg-[#08060d] border border-[#241c33] rounded-xl p-2.5 text-[#f5efe6] focus:outline-none focus:border-[#f5b544]"
                />
              </div>

              <div>
                <label className="block text-[#a294b8] mb-1">Artist / Collaboration Name</label>
                <input
                  type="text"
                  value={newArtist}
                  onChange={(e) => setNewArtist(e.target.value)}
                  placeholder="e.g. Arya Sharma feat. Swetha"
                  className="w-full bg-[#08060d] border border-[#241c33] rounded-xl p-2.5 text-[#f5efe6] focus:outline-none focus:border-[#f5b544]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#a294b8] mb-1">Primary Language</label>
                  <select
                    value={newLanguage}
                    onChange={(e) => setNewLanguage(e.target.value as Language)}
                    className="w-full bg-[#08060d] border border-[#241c33] rounded-xl p-2.5 text-[#f5efe6] focus:outline-none focus:border-[#f5b544]"
                  >
                    <option value="Telugu">Telugu</option>
                    <option value="Tamil">Tamil</option>
                    <option value="Hindi">Hindi</option>
                    <option value="Punjabi">Punjabi</option>
                    <option value="Malayalam">Malayalam</option>
                    <option value="Kannada">Kannada</option>
                    <option value="Bengali">Bengali</option>
                    <option value="English">English</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[#a294b8] mb-1">Genre Style</label>
                  <input
                    type="text"
                    value={newGenre}
                    onChange={(e) => setNewGenre(e.target.value)}
                    placeholder="e.g. Neo-Raga Pop, Lo-Fi"
                    className="w-full bg-[#08060d] border border-[#241c33] rounded-xl p-2.5 text-[#f5efe6] focus:outline-none focus:border-[#f5b544]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[#a294b8] mb-1">Lyrics Excerpt (Optional)</label>
                <textarea
                  value={newLyrics}
                  onChange={(e) => setNewLyrics(e.target.value)}
                  rows={3}
                  placeholder="Paste verse or chorus lyrics..."
                  className="w-full bg-[#08060d] border border-[#241c33] rounded-xl p-2.5 text-[#f5efe6] focus:outline-none focus:border-[#f5b544]"
                />
              </div>

              <div className="pt-3 border-t border-[#241c33] flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowNewTrackModal(false)}
                  className="px-4 py-2 rounded-xl bg-[#191324] text-[#a294b8] hover:text-[#f5efe6]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#f2542d] hover:bg-[#ff7a4d] text-[#08060d] font-semibold font-sans"
                >
                  Ingest Track to Vault
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Global Mobile WhatsApp Approval Modal */}
      <MobileApprovalModal
        track={activeTrack}
        stageTitle="Stage 2/5: Mix QC & Master Ceiling"
        agentName="GHARANA Mix QC Agent"
        narratedSummary={
          activeTrack.arAssessment?.recommendation ||
          "Agent Mix QC verified. High-frequency vocal harshness at 3.2kHz dipped by -1.5dB for smooth mobile speaker performance. Master limiter adjusted to ensure zero inter-sample clipping on AAC encoding."
        }
        isOpen={showGlobalMobileApproval}
        onClose={() => setShowGlobalMobileApproval(false)}
        onApprove={() => {
          if (activeTrack.arAssessment) {
            handleUpdateTrack({
              ...activeTrack,
              arAssessment: {
                ...activeTrack.arAssessment,
                checkpointStatus: 'approved'
              }
            });
          }
        }}
        onReject={() => {
          if (activeTrack.arAssessment) {
            handleUpdateTrack({
              ...activeTrack,
              arAssessment: {
                ...activeTrack.arAssessment,
                checkpointStatus: 'rejected'
              }
            });
          }
        }}
        onInspectRawPayload={() => openInspector("Mix QC Agent Payload", activeTrack.rawAgentPayloads.mixQcAgent || { info: "Run Mix QC Analysis to populate payload" })}
      />

    </div>
  );
}
