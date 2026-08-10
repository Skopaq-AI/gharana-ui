import React, { useState } from 'react';
import {
  Users,
  Shield,
  FileCheck,
  CheckCircle2,
  AlertTriangle,
  Plus,
  Trash2,
  Link2,
  Lock,
  Unlock,
  Key,
  FileText,
  Clock,
  Code2,
  Info,
  Check,
  ExternalLink,
  Zap,
  HelpCircle
} from 'lucide-react';
import {
  TrackItem,
  SplitContributor,
  LedgerEvent,
  CoverClearanceGate,
  SplitSheetWire
} from '../../types';
import { HumanCheckpointCard } from '../HumanCheckpointCard';

interface SplitsTabProps {
  track: TrackItem;
  onUpdateTrack: (updated: TrackItem) => void;
  onInspectRaw: (title: string, payload: any) => void;
}

export const SplitsTab: React.FC<SplitsTabProps> = ({
  track,
  onUpdateTrack,
  onInspectRaw
}) => {
  const splitData = track.splitGovernance;

  // Local state for contributors
  const [contributors, setContributors] = useState<SplitContributor[]>(
    splitData?.contributors || []
  );

  // Local state for cover clearance
  const [coverGate, setCoverGate] = useState<CoverClearanceGate>(
    splitData?.coverClearance || {
      isCoverRelease: false,
      originalWorkTitle: '',
      originalComposers: '',
      originalPublisher: '',
      iprsClearanceStatus: 'required',
      directPublisherConsentSigned: false
    }
  );

  // Local state for ledger events
  const [ledgerEvents, setLedgerEvents] = useState<LedgerEvent[]>(
    splitData?.ledgerEvents || []
  );

  // Split into two distinct arrays
  const compContributors = contributors.filter((c) => c.side === 'composition');
  const recContributors = contributors.filter((c) => c.side === 'recording');

  // Live running totals
  const compTotal = compContributors.reduce((sum, c) => sum + c.sharePercentage, 0);
  const recTotal = recContributors.reduce((sum, c) => sum + c.sharePercentage, 0);

  const isCompValid = compTotal === 100;
  const isRecTotalValid = recTotal === 100;
  const isBothSplitsValid = isCompValid && isRecTotalValid;

  // Cover clearance blocking check
  const isCoverBlocked =
    coverGate.isCoverRelease &&
    (coverGate.iprsClearanceStatus !== 'granted' || !coverGate.directPublisherConsentSigned);

  // Save changes to track state
  const persistGovernance = (
    updatedContributors: SplitContributor[],
    updatedCover: CoverClearanceGate,
    updatedLedger: LedgerEvent[]
  ) => {
    if (!splitData) return;

    onUpdateTrack({
      ...track,
      splitGovernance: {
        ...splitData,
        contributors: updatedContributors,
        coverClearance: updatedCover,
        ledgerEvents: updatedLedger
      }
    });
  };

  // Contributor handlers
  const handleShareChange = (id: string, newShare: number) => {
    const updated = contributors.map((c) =>
      c.id === id ? { ...c, sharePercentage: Math.max(0, Math.min(100, newShare)) } : c
    );
    setContributors(updated);
    persistGovernance(updated, coverGate, ledgerEvents);
  };

  const handleToggleSignature = (id: string) => {
    const updated = contributors.map((c) => {
      if (c.id === id) {
        const nextSigned = !c.signed;
        return {
          ...c,
          signed: nextSigned,
          signatureStatus: (nextSigned ? 'Signed' : 'Pending') as 'Signed' | 'Pending'
        };
      }
      return c;
    });
    setContributors(updated);

    // Append signature ledger event
    const target = contributors.find((c) => c.id === id);
    if (target) {
      appendLedgerEvent(
        'signed',
        {
          party: target.name,
          side: target.side,
          signed: !target.signed
        }
      );
    }

    persistGovernance(updated, coverGate, ledgerEvents);
  };

  const handleAddContributor = (side: 'composition' | 'recording') => {
    const isComp = side === 'composition';
    const newContr: SplitContributor = {
      id: `c-${Date.now()}`,
      name: isComp ? 'New Lyricist / Writer' : 'New Performer / Producer',
      role: isComp ? 'Co-Songwriter' : 'Session Performer',
      side,
      sharePercentage: 0,
      email: 'collaborator@studio.com',
      contact: '+91 90000 00000',
      signed: false,
      signatureStatus: 'Pending'
    };
    const updated = [...contributors, newContr];
    setContributors(updated);
    persistGovernance(updated, coverGate, ledgerEvents);
  };

  const handleRemoveContributor = (id: string) => {
    const updated = contributors.filter((c) => c.id !== id);
    setContributors(updated);
    persistGovernance(updated, coverGate, ledgerEvents);
  };

  // Cover Gate handlers
  const handleToggleCoverRelease = (enabled: boolean) => {
    const updatedCover: CoverClearanceGate = {
      ...coverGate,
      isCoverRelease: enabled,
      iprsClearanceStatus: enabled ? 'required' : 'granted',
      directPublisherConsentSigned: !enabled
    };
    setCoverGate(updatedCover);

    appendLedgerEvent('clearance_granted', {
      action: enabled ? 'Cover Release Mode Enabled - Statutory Gate Active' : 'Original Release Confirmed',
      isCover: enabled
    });

    persistGovernance(contributors, updatedCover, ledgerEvents);
  };

  const handleUpdateCoverField = <K extends keyof CoverClearanceGate>(
    key: K,
    val: CoverClearanceGate[K]
  ) => {
    const updatedCover = {
      ...coverGate,
      [key]: val
    };
    setCoverGate(updatedCover);
    persistGovernance(contributors, updatedCover, ledgerEvents);
  };

  // Append hash-chained event to ledger
  const appendLedgerEvent = (eventType: LedgerEvent['event_type'], payload: any) => {
    const prevHash =
      ledgerEvents.length > 0
        ? ledgerEvents[ledgerEvents.length - 1].hash
        : '0000000000000000000000000000000000000000000000000000000000000000';

    // Simple pseudo-SHA256 hex generator for UI demonstration
    const strToHash = `${prevHash}-${eventType}-${JSON.stringify(payload)}-${Date.now()}`;
    let hashNum = 0;
    for (let i = 0; i < strToHash.length; i++) {
      hashNum = (hashNum << 5) - hashNum + strToHash.charCodeAt(i);
      hashNum |= 0;
    }
    const hexHash =
      Math.abs(hashNum).toString(16).padStart(16, 'a') +
      Math.abs(hashNum * 31).toString(16).padStart(16, 'f') +
      '8f3c2b1a9e42017d3a8120c4391e00f9';

    const newEvent: LedgerEvent = {
      id: `ledg-${Date.now()}`,
      project_id: track.id,
      event_type: eventType,
      payload,
      prev_hash: prevHash,
      hash: hexHash,
      created_at: new Date().toISOString()
    };

    const updatedLedger = [...ledgerEvents, newEvent];
    setLedgerEvents(updatedLedger);
    persistGovernance(contributors, coverGate, updatedLedger);
  };

  // Wire payload construction
  const buildSplitSheetWirePayload = (): SplitSheetWire => {
    return {
      project_id: track.id,
      work_title: track.title,
      status: isBothSplitsValid && !isCoverBlocked ? 'verified_split_sheet' : 'invalid_splits_or_blocked',
      parties: contributors.map((c) => ({
        name: c.name,
        role: c.role,
        side: c.side,
        share_pct: c.sharePercentage,
        contact: c.contact || c.email || null,
        signed: c.signed,
        ipi_cae: c.ipiCaeNumber
      }))
    };
  };

  const handleApproveCheckpoint = () => {
    if (!splitData) return;
    onUpdateTrack({
      ...track,
      splitGovernance: {
        ...splitData,
        checkpointStatus: 'approved'
      }
    });
  };

  const handleRejectCheckpoint = () => {
    if (!splitData) return;
    onUpdateTrack({
      ...track,
      splitGovernance: {
        ...splitData,
        checkpointStatus: 'rejected'
      }
    });
  };

  return (
    <div className="space-y-8">
      {/* Top Banner & Info Header */}
      <div className="p-6 glass-panel rounded-3xl border border-[#342847] bg-[#0d0a14]/90 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <Shield className="w-6 h-6 text-[#43c9a0]" />
              <h1 className="font-serif text-2xl font-bold text-[#f5efe6] tracking-tight">
                RIGHTS & SPLITS GOVERNANCE
              </h1>
              <span className="px-2.5 py-0.5 rounded-full bg-[#43c9a0]/20 text-[#43c9a0] border border-[#43c9a0]/30 text-[10px] font-mono uppercase tracking-widest">
                Copyright Act 1957
              </span>
            </div>
            <p className="text-xs text-[#a294b8] font-serif italic">
              "Two separate copyrights exist in every song and must never be conflated: Composition (Publishing) and Sound Recording (Master). Each side MUST sum to exactly 100%."
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                const wire = buildSplitSheetWirePayload();
                onInspectRaw('SplitSheet Wire Payload (Standard Schema)', wire);
              }}
              className="px-3.5 py-2 rounded-xl bg-[#241c33] hover:bg-[#342847] text-[#ffd48a] border border-[#f5b544]/30 text-xs font-serif flex items-center gap-1.5 transition-colors"
            >
              <Code2 className="w-3.5 h-3.5 text-[#ffd48a]" />
              <span>Inspect Wire JSON</span>
            </button>
          </div>
        </div>

        {/* Global Legal Validation Status Strip */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
          {/* Composition Status */}
          <div className={`p-3 rounded-2xl border flex items-center justify-between ${
            isCompValid
              ? 'bg-[#21a882]/10 border-[#21a882]/40 text-[#43c9a0]'
              : 'bg-[#f2542d]/20 border-[#f2542d]/60 text-[#ff7a4d]'
          }`}>
            <span className="text-xs font-serif font-bold uppercase tracking-wider">
              1. Composition Side
            </span>
            <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-[#08060d]">
              {compTotal}% {isCompValid ? '✓ 100% VALID' : '❌ MUST BE 100%'}
            </span>
          </div>

          {/* Sound Recording Status */}
          <div className={`p-3 rounded-2xl border flex items-center justify-between ${
            isRecTotalValid
              ? 'bg-[#21a882]/10 border-[#21a882]/40 text-[#43c9a0]'
              : 'bg-[#f2542d]/20 border-[#f2542d]/60 text-[#ff7a4d]'
          }`}>
            <span className="text-xs font-serif font-bold uppercase tracking-wider">
              2. Recording Side
            </span>
            <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-[#08060d]">
              {recTotal}% {isRecTotalValid ? '✓ 100% VALID' : '❌ MUST BE 100%'}
            </span>
          </div>

          {/* Cover Gate Status */}
          <div className={`p-3 rounded-2xl border flex items-center justify-between ${
            !isCoverBlocked
              ? 'bg-[#21a882]/10 border-[#21a882]/40 text-[#43c9a0]'
              : 'bg-[#f2542d]/20 border-[#f2542d]/60 text-[#ff7a4d]'
          }`}>
            <span className="text-xs font-serif font-bold uppercase tracking-wider">
              3. Cover License Gate
            </span>
            <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-[#08060d]">
              {coverGate.isCoverRelease
                ? isCoverBlocked ? '❌ COVER BLOCKED' : '✓ CLEARANCE GRANTED'
                : '✓ ORIGINAL RELEASE'}
            </span>
          </div>
        </div>
      </div>

      {/* Catalog Registry Numbers Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="p-4 glass-panel rounded-2xl border border-[#342847] flex justify-between items-center font-mono text-xs">
          <div className="flex items-center gap-2">
            <Key className="w-4 h-4 text-[#ffd48a]" />
            <span className="text-[#a294b8]">Sound Recording ISRC Code</span>
          </div>
          <span className="text-[#ffd48a] font-bold">
            {splitData?.trackIsrc || 'IN-GH1-26-00104'}
          </span>
        </div>
        <div className="p-4 glass-panel rounded-2xl border border-[#342847] flex justify-between items-center font-mono text-xs">
          <div className="flex items-center gap-2">
            <Key className="w-4 h-4 text-[#ffd48a]" />
            <span className="text-[#a294b8]">Album UPC / EAN Barcode</span>
          </div>
          <span className="text-[#ffd48a] font-bold">
            {splitData?.albumUpc || '8901234567891'}
          </span>
        </div>
      </div>

      {/* SECTION: TWO SEPARATE COPYRIGHT COLUMNS */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-serif text-lg font-bold text-[#f5efe6] flex items-center gap-2">
            <FileText className="w-5 h-5 text-[#a56bd6]" />
            <span>COPYRIGHT SPLIT PANELS</span>
          </h2>
          <span className="text-xs font-serif text-[#a294b8]">
            Adjust sliders or shares. Both columns must sum to exactly 100%.
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* PANEL 1: COMPOSITION COPYRIGHT (Publishing) */}
          <div className={`p-6 rounded-3xl border transition-all space-y-6 ${
            isCompValid
              ? 'bg-[#0d0a14]/90 border-[#342847] glass'
              : 'bg-[#180a0a]/95 border-[#f2542d] shadow-2xl shadow-[#f2542d]/20'
          }`}>
            
            {/* Panel Header */}
            <div className="flex items-start justify-between border-b border-[#241c33] pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded bg-[#a56bd6]/20 text-[#a56bd6] border border-[#a56bd6]/30 font-mono text-[10px] uppercase font-bold">
                    PUBLISHING SIDE
                  </span>
                  <h3 className="font-serif text-base font-bold text-[#f5efe6]">
                    1. Composition Copyright
                  </h3>
                </div>
                <p className="text-xs text-[#a294b8] font-serif mt-1">
                  Lyrics + Melody (Songwriters, Lyricists, Music Publishers)
                </p>
              </div>

              {/* Running Total Badge */}
              <div className={`px-3 py-1.5 rounded-xl border text-xs font-mono text-right ${
                isCompValid
                  ? 'bg-[#21a882]/20 text-[#43c9a0] border-[#21a882]/40'
                  : 'bg-[#f2542d]/30 text-[#ff7a4d] border-[#f2542d] animate-pulse'
              }`}>
                <span className="font-bold text-sm block">{compTotal}%</span>
                <span className="text-[9px] uppercase tracking-wider block">
                  {isCompValid ? '✓ VALID 100%' : '❌ BROKEN SPLIT'}
                </span>
              </div>
            </div>

            {/* Warning callout if invalid */}
            {!isCompValid && (
              <div className="p-4 rounded-2xl bg-[#f2542d]/20 border border-[#f2542d] text-xs font-serif text-[#ff7a4d] flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-[#f2542d] flex-shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <span className="font-bold uppercase tracking-wide block">
                    LEGAL RELEASE BLOCK: Composition Total is {compTotal}%
                  </span>
                  <p>
                    Indian Copyright Law requires publishing splits to total 100% prior to registration with IPRS. Adjust contributor shares below.
                  </p>
                </div>
              </div>
            )}

            {/* List of Composition Parties */}
            <div className="space-y-4">
              {compContributors.map((party) => (
                <div
                  key={party.id}
                  className="p-4 rounded-2xl bg-[#08060d] border border-[#241c33] hover:border-[#342847] transition-all space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-serif text-sm font-semibold text-[#f5efe6]">
                          {party.name}
                        </span>
                        <span className="text-[10px] font-mono text-[#a294b8] px-2 py-0.5 rounded bg-[#191324] border border-[#342847]">
                          {party.role}
                        </span>
                      </div>
                      <p className="text-xs font-mono text-[#6d6183] mt-0.5">
                        {party.contact || party.email} {party.ipiCaeNumber ? `• ${party.ipiCaeNumber}` : ''}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleToggleSignature(party.id)}
                        className={`px-2.5 py-1 rounded text-[10px] font-mono transition-all flex items-center gap-1 ${
                          party.signed
                            ? 'bg-[#21a882]/20 text-[#43c9a0] border border-[#21a882]/40'
                            : 'bg-[#f5b544]/20 text-[#ffd48a] border border-[#f5b544]/40 hover:bg-[#f5b544]/30'
                        }`}
                        title="Click to toggle signature state"
                      >
                        {party.signed ? <Check className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                        <span>{party.signed ? 'SIGNED' : 'PENDING'}</span>
                      </button>

                      <button
                        onClick={() => handleRemoveContributor(party.id)}
                        className="p-1.5 text-[#a294b8] hover:text-[#ff7a4d] transition-colors"
                        title="Remove party"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Share Percentage Slider & Numeric Input */}
                  <div className="flex items-center gap-3 pt-1">
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={party.sharePercentage}
                      onChange={(e) => handleShareChange(party.id, parseInt(e.target.value) || 0)}
                      className="flex-1 accent-[#a56bd6] bg-[#191324] h-2 rounded-lg cursor-pointer"
                    />
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={party.sharePercentage}
                        onChange={(e) => handleShareChange(party.id, parseInt(e.target.value) || 0)}
                        className="w-16 bg-[#120e1b] border border-[#342847] rounded-lg px-2 py-1 text-center font-mono text-xs font-bold text-[#ffd48a] focus:outline-none focus:border-[#a56bd6]"
                      />
                      <span className="font-mono text-xs text-[#a294b8]">%</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={() => handleAddContributor('composition')}
              className="w-full py-2.5 rounded-2xl bg-[#241c33] hover:bg-[#342847] border border-[#342847] text-xs font-serif text-[#f5efe6] flex items-center justify-center gap-2 transition-colors"
            >
              <Plus className="w-4 h-4 text-[#a56bd6]" />
              <span>Add Composition Writer / Publisher</span>
            </button>
          </div>

          {/* PANEL 2: SOUND RECORDING COPYRIGHT (Master) */}
          <div className={`p-6 rounded-3xl border transition-all space-y-6 ${
            isRecTotalValid
              ? 'bg-[#0d0a14]/90 border-[#342847] glass'
              : 'bg-[#180a0a]/95 border-[#f2542d] shadow-2xl shadow-[#f2542d]/20'
          }`}>
            
            {/* Panel Header */}
            <div className="flex items-start justify-between border-b border-[#241c33] pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded bg-[#f2542d]/20 text-[#f2542d] border border-[#f2542d]/30 font-mono text-[10px] uppercase font-bold">
                    MASTER SIDE
                  </span>
                  <h3 className="font-serif text-base font-bold text-[#f5efe6]">
                    2. Sound Recording Copyright
                  </h3>
                </div>
                <p className="text-xs text-[#a294b8] font-serif mt-1">
                  The Master Audio (Performers, Producers, Record Labels)
                </p>
              </div>

              {/* Running Total Badge */}
              <div className={`px-3 py-1.5 rounded-xl border text-xs font-mono text-right ${
                isRecTotalValid
                  ? 'bg-[#21a882]/20 text-[#43c9a0] border-[#21a882]/40'
                  : 'bg-[#f2542d]/30 text-[#ff7a4d] border-[#f2542d] animate-pulse'
              }`}>
                <span className="font-bold text-sm block">{recTotal}%</span>
                <span className="text-[9px] uppercase tracking-wider block">
                  {isRecTotalValid ? '✓ VALID 100%' : '❌ BROKEN SPLIT'}
                </span>
              </div>
            </div>

            {/* Warning callout if invalid */}
            {!isRecTotalValid && (
              <div className="p-4 rounded-2xl bg-[#f2542d]/20 border border-[#f2542d] text-xs font-serif text-[#ff7a4d] flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-[#f2542d] flex-shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <span className="font-bold uppercase tracking-wide block">
                    LEGAL RELEASE BLOCK: Sound Recording Total is {recTotal}%
                  </span>
                  <p>
                    Master royalty payouts cannot be executed on DSPs without a valid 100% master split. Adjust performer/producer shares below.
                  </p>
                </div>
              </div>
            )}

            {/* List of Recording Parties */}
            <div className="space-y-4">
              {recContributors.map((party) => (
                <div
                  key={party.id}
                  className="p-4 rounded-2xl bg-[#08060d] border border-[#241c33] hover:border-[#342847] transition-all space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-serif text-sm font-semibold text-[#f5efe6]">
                          {party.name}
                        </span>
                        <span className="text-[10px] font-mono text-[#a294b8] px-2 py-0.5 rounded bg-[#191324] border border-[#342847]">
                          {party.role}
                        </span>
                      </div>
                      <p className="text-xs font-mono text-[#6d6183] mt-0.5">
                        {party.contact || party.email} {party.ipiCaeNumber ? `• ${party.ipiCaeNumber}` : ''}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleToggleSignature(party.id)}
                        className={`px-2.5 py-1 rounded text-[10px] font-mono transition-all flex items-center gap-1 ${
                          party.signed
                            ? 'bg-[#21a882]/20 text-[#43c9a0] border border-[#21a882]/40'
                            : 'bg-[#f5b544]/20 text-[#ffd48a] border border-[#f5b544]/40 hover:bg-[#f5b544]/30'
                        }`}
                        title="Click to toggle signature state"
                      >
                        {party.signed ? <Check className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                        <span>{party.signed ? 'SIGNED' : 'PENDING'}</span>
                      </button>

                      <button
                        onClick={() => handleRemoveContributor(party.id)}
                        className="p-1.5 text-[#a294b8] hover:text-[#ff7a4d] transition-colors"
                        title="Remove party"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Share Percentage Slider & Numeric Input */}
                  <div className="flex items-center gap-3 pt-1">
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={party.sharePercentage}
                      onChange={(e) => handleShareChange(party.id, parseInt(e.target.value) || 0)}
                      className="flex-1 accent-[#f2542d] bg-[#191324] h-2 rounded-lg cursor-pointer"
                    />
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={party.sharePercentage}
                        onChange={(e) => handleShareChange(party.id, parseInt(e.target.value) || 0)}
                        className="w-16 bg-[#120e1b] border border-[#342847] rounded-lg px-2 py-1 text-center font-mono text-xs font-bold text-[#ffd48a] focus:outline-none focus:border-[#f2542d]"
                      />
                      <span className="font-mono text-xs text-[#a294b8]">%</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={() => handleAddContributor('recording')}
              className="w-full py-2.5 rounded-2xl bg-[#241c33] hover:bg-[#342847] border border-[#342847] text-xs font-serif text-[#f5efe6] flex items-center justify-center gap-2 transition-colors"
            >
              <Plus className="w-4 h-4 text-[#f2542d]" />
              <span>Add Master Performer / Producer / Label</span>
            </button>
          </div>

        </div>
      </div>

      {/* SECTION: COVER RELEASE STATUTORY CLEARANCE GATE */}
      <div className="p-6 md:p-8 glass rounded-3xl border border-[#f5b544]/40 bg-[#120e1b]/95 space-y-6 shadow-2xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#241c33] pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <Lock className={`w-5 h-5 ${isCoverBlocked ? 'text-[#f2542d]' : 'text-[#ffd48a]'}`} />
              <h2 className="font-serif text-lg font-bold text-[#f5efe6]">
                COVER RELEASE STATUTORY CLEARANCE GATE
              </h2>
            </div>
            <p className="text-xs font-serif text-[#a294b8]">
              Under Indian Copyright Act 1957, India has <strong>no US-style compulsory mechanical license</strong>. A cover release REQUIRES explicit direct publisher consent.
            </p>
          </div>

          {/* Toggle Switch */}
          <div className="flex items-center gap-3 bg-[#08060d] p-2 rounded-2xl border border-[#342847]">
            <span className="text-xs font-serif text-[#f5efe6]">Cover Release Mode:</span>
            <button
              onClick={() => handleToggleCoverRelease(!coverGate.isCoverRelease)}
              className={`px-3 py-1.5 rounded-xl font-mono text-xs font-bold transition-all ${
                coverGate.isCoverRelease
                  ? 'bg-[#f2542d] text-white shadow-lg shadow-[#f2542d]/30'
                  : 'bg-[#241c33] text-[#a294b8]'
              }`}
            >
              {coverGate.isCoverRelease ? 'ENABLED (COVER)' : 'DISABLED (ORIGINAL)'}
            </button>
          </div>
        </div>

        {coverGate.isCoverRelease ? (
          <div className="space-y-6">
            
            {/* Gate Status Callout */}
            <div className={`p-5 rounded-2xl border flex items-start gap-4 ${
              isCoverBlocked
                ? 'bg-[#f2542d]/20 border-[#f2542d] text-[#ff7a4d]'
                : 'bg-[#21a882]/20 border-[#21a882] text-[#43c9a0]'
            }`}>
              {isCoverBlocked ? (
                <Lock className="w-6 h-6 text-[#f2542d] flex-shrink-0 mt-0.5 animate-bounce" />
              ) : (
                <Unlock className="w-6 h-6 text-[#43c9a0] flex-shrink-0 mt-0.5" />
              )}
              <div className="space-y-1">
                <span className="font-bold text-sm uppercase tracking-wider block font-serif">
                  {isCoverBlocked
                    ? 'GATE STATUS: DISTRIBUTION RELEASE BLOCKED'
                    : 'GATE STATUS: COVER CLEARANCE VERIFIED & UNLOCKED'}
                </span>
                <p className="text-xs font-serif leading-relaxed">
                  {isCoverBlocked
                    ? 'This release is flagged as a cover. Indian law mandates direct consent from the original publisher or IPRS mechanical license. Export is HARD-BLOCKED until clearance status is set to Granted and Direct Publisher Consent is signed.'
                    : 'Direct publisher consent and IPRS mechanical clearance logged. Statutory requirement satisfied under Indian Copyright law.'}
                </p>
              </div>
            </div>

            {/* Form Fields for Cover Clearance */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-mono text-[#6d6183] uppercase tracking-wider block">
                  Original Song / Composition Title
                </label>
                <input
                  type="text"
                  value={coverGate.originalWorkTitle || ''}
                  onChange={(e) => handleUpdateCoverField('originalWorkTitle', e.target.value)}
                  placeholder="e.g. Roja Janeman (Original Film Track)"
                  className="w-full bg-[#08060d] border border-[#342847] rounded-xl px-3 py-2 text-xs font-serif text-[#f5efe6] focus:outline-none focus:border-[#f5b544]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-mono text-[#6d6183] uppercase tracking-wider block">
                  Original Composers & Lyricists
                </label>
                <input
                  type="text"
                  value={coverGate.originalComposers || ''}
                  onChange={(e) => handleUpdateCoverField('originalComposers', e.target.value)}
                  placeholder="e.g. A.R. Rahman / Vairamuthu"
                  className="w-full bg-[#08060d] border border-[#342847] rounded-xl px-3 py-2 text-xs font-serif text-[#f5efe6] focus:outline-none focus:border-[#f5b544]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-mono text-[#6d6183] uppercase tracking-wider block">
                  Original Music Publisher / Record Label
                </label>
                <input
                  type="text"
                  value={coverGate.originalPublisher || ''}
                  onChange={(e) => handleUpdateCoverField('originalPublisher', e.target.value)}
                  placeholder="e.g. Saregama India / Sony Music Publishing"
                  className="w-full bg-[#08060d] border border-[#342847] rounded-xl px-3 py-2 text-xs font-serif text-[#f5efe6] focus:outline-none focus:border-[#f5b544]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-mono text-[#6d6183] uppercase tracking-wider block">
                  IPRS / Mechanical Clearance Status
                </label>
                <select
                  value={coverGate.iprsClearanceStatus}
                  onChange={(e) =>
                    handleUpdateCoverField(
                      'iprsClearanceStatus',
                      e.target.value as 'granted' | 'pending' | 'required'
                    )
                  }
                  className="w-full bg-[#08060d] border border-[#342847] rounded-xl px-3 py-2 text-xs font-mono text-[#ffd48a] focus:outline-none focus:border-[#f5b544]"
                >
                  <option value="required">Required (Clearance Pending)</option>
                  <option value="pending">Submitted to Publisher (Pending Review)</option>
                  <option value="granted">Granted (Official Consent Letter Received)</option>
                </select>
              </div>
            </div>

            {/* Direct Consent Checkbox */}
            <div className="p-4 bg-[#08060d] rounded-2xl border border-[#342847] flex items-center justify-between">
              <div className="space-y-0.5">
                <span className="text-xs font-serif font-bold text-[#f5efe6] block">
                  Direct Publisher Consent Agreement Executed
                </span>
                <span className="text-[11px] font-serif text-[#a294b8]">
                  Check this box once the written authorization letter or NOC is attached.
                </span>
              </div>
              <input
                type="checkbox"
                checked={coverGate.directPublisherConsentSigned}
                onChange={(e) =>
                  handleUpdateCoverField('directPublisherConsentSigned', e.target.checked)
                }
                className="w-5 h-5 accent-[#43c9a0] cursor-pointer"
              />
            </div>

          </div>
        ) : (
          <div className="p-4 bg-[#08060d] rounded-2xl border border-[#241c33] flex items-center gap-3 text-xs font-serif text-[#a294b8]">
            <CheckCircle2 className="w-5 h-5 text-[#43c9a0] flex-shrink-0" />
            <span>
              Original composition confirmed. No third-party cover clearance gate active for this release.
            </span>
          </div>
        )}
      </div>

      {/* SECTION: HASH-CHAINED LEDGER AUDIT TRAIL */}
      <div className="glass rounded-3xl p-6 md:p-8 border border-[#342847] bg-[#0d0a14]/90 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#241c33] pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <Link2 className="w-5 h-5 text-[#ffd48a]" />
              <h2 className="font-serif text-lg font-bold text-[#f5efe6]">
                HASH-CHAINED LEDGER AUDIT TRAIL
              </h2>
              <span className="px-2 py-0.5 rounded bg-[#ffd48a]/20 text-[#ffd48a] border border-[#ffd48a]/30 font-mono text-[10px] uppercase font-bold">
                Tamper-Evident Chain
              </span>
            </div>
            <p className="text-xs font-serif text-[#a294b8]">
              An append-only cryptographic event log anchoring split declarations, contract sends, and digital signatures.
            </p>
          </div>

          <button
            onClick={() =>
              appendLedgerEvent('split_declared', {
                action: 'Manual Audit Snapshot Logged',
                verified_by: 'Artist Interface'
              })
            }
            className="px-3 py-1.5 rounded-xl bg-[#241c33] hover:bg-[#342847] border border-[#ffd48a]/30 text-xs font-mono text-[#ffd48a] flex items-center gap-1.5 transition-colors self-start sm:self-auto"
          >
            <Zap className="w-3.5 h-3.5 text-[#ffd48a]" />
            <span>Append Audit Event</span>
          </button>
        </div>

        {/* Ledger Event Nodes List */}
        <div className="space-y-4 relative">
          {/* Vertical Connecting Hash Line */}
          <div className="absolute left-6 top-6 bottom-6 w-0.5 bg-[#342847] z-0 hidden sm:block" />

          {ledgerEvents.map((ev, idx) => (
            <div
              key={ev.id}
              className="relative z-10 p-4 sm:p-5 rounded-2xl bg-[#08060d] border border-[#241c33] hover:border-[#a56bd6]/40 transition-all space-y-2 sm:ml-4"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#191324] pb-2">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-[#a56bd6]/20 text-[#a56bd6] border border-[#a56bd6]/40 flex items-center justify-center font-mono text-[10px] font-bold">
                    #{idx + 1}
                  </span>
                  <span className="font-mono text-xs font-bold uppercase tracking-wider text-[#ffd48a]">
                    {ev.event_type.replace('_', ' ')}
                  </span>
                </div>
                <span className="text-[10px] font-mono text-[#6d6183]">
                  {new Date(ev.created_at).toLocaleString()}
                </span>
              </div>

              {/* Payload Summary */}
              <div className="text-xs font-serif text-[#f5efe6] py-1">
                {JSON.stringify(ev.payload)}
              </div>

              {/* Cryptographic Hash Pair (prev_hash -> hash) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-2 border-t border-[#191324] font-mono text-[10px]">
                <div className="flex items-center gap-1.5 text-[#6d6183]">
                  <span className="uppercase text-[9px] font-bold text-[#a294b8]">prev_hash:</span>
                  <span className="truncate text-[#8d82a1]">{ev.prev_hash}</span>
                </div>
                <div className="flex items-center gap-1.5 text-[#43c9a0]">
                  <span className="uppercase text-[9px] font-bold text-[#43c9a0]">hash:</span>
                  <span className="truncate font-bold">{ev.hash}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Human Checkpoint Card */}
      {splitData && (
        <HumanCheckpointCard
          title="Digital Split Agreement & Royalty Lock Sign-Off"
          recommendation={
            isBothSplitsValid && !isCoverBlocked
              ? 'Composition and Sound Recording splits both sum to 100%, and cover clearance rules are verified. Ready for legal lock and digital signature execution.'
              : `Splits or clearance incomplete: Composition (${compTotal}%), Recording (${recTotal}%)${
                  isCoverBlocked ? ', COVER RELEASE BLOCKED' : ''
                }. Adjust sliders to 100% and satisfy cover clearance.`
          }
          status={splitData.checkpointStatus}
          agentName="GHARANA Legal & Rights Agent"
          onApprove={handleApproveCheckpoint}
          onReject={handleRejectCheckpoint}
          onInspectRawPayload={() =>
            onInspectRaw('Split Governance Wire Payload', buildSplitSheetWirePayload())
          }
        />
      )}
    </div>
  );
};
