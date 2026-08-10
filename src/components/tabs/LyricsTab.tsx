import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  Sparkles,
  CheckCircle2,
  Languages,
  ToggleLeft,
  ToggleRight,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Wand2,
  AlertTriangle,
  Code2,
  Check,
  X,
  RefreshCw,
  HelpCircle,
  FileText
} from 'lucide-react';
import { TrackItem, LyricDraftWire } from '../../types';
import { HumanCheckpointCard } from '../HumanCheckpointCard';
import {
  INDIC_LYRIC_PRESETS,
  LanguagePreset,
  LyricSectionPreset,
  LyricLinePreset,
  CoWriterSuggestionPreset
} from '../../data/lyricPresets';

interface LyricsTabProps {
  track: TrackItem;
  onUpdateTrack: (updated: TrackItem) => void;
  onInspectRaw: (title: string, payload: any) => void;
}

export const LyricsTab: React.FC<LyricsTabProps> = ({
  track,
  onUpdateTrack,
  onInspectRaw
}) => {
  // Determine current active language from track or default to Telugu
  const initialLang = (track.lyricAnalysis?.language && INDIC_LYRIC_PRESETS[track.lyricAnalysis.language])
    ? track.lyricAnalysis.language
    : 'Telugu';

  const [selectedLanguage, setSelectedLanguage] = useState<string>(initialLang);
  const preset: LanguagePreset = INDIC_LYRIC_PRESETS[selectedLanguage] || INDIC_LYRIC_PRESETS.Telugu;

  const [selectedDialect, setSelectedDialect] = useState<string>(
    track.lyricAnalysis?.dialect || preset.defaultDialect
  );

  const [showTransliteration, setShowTransliteration] = useState<boolean>(true);
  const [sections, setSections] = useState<LyricSectionPreset[]>(preset.sections);
  const [suggestions, setSuggestions] = useState<CoWriterSuggestionPreset[]>(preset.suggestions);
  const [promptInput, setPromptInput] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [isSaved, setIsSaved] = useState<boolean>(false);
  const [showWireModal, setShowWireModal] = useState<boolean>(false);
  const [activeEditingLineId, setActiveEditingLineId] = useState<string | null>(null);

  // Sync preset when language selector changes
  const handleLanguageChange = (newLang: string) => {
    setSelectedLanguage(newLang);
    const newPreset = INDIC_LYRIC_PRESETS[newLang] || INDIC_LYRIC_PRESETS.Telugu;
    setSelectedDialect(newPreset.defaultDialect);
    setSections(newPreset.sections);
    setSuggestions(newPreset.suggestions);
  };

  // Helper to estimate syllable weight
  const estimateSyllables = (text: string): number => {
    if (!text || !text.trim()) return 0;
    const cleaned = text.trim();
    const vowelMatches = cleaned.match(/[\u0C01-\u0C03\u0C3E-\u0C4C\u0C05-\u0C14\u0904-\u0914\u093E-\u094C\u0B85-\u0B94\u0BBE-\u0BC8\u0A05-\u0A14\u0A3E-\u0A4C\u0985-\u0994\u09BE-\u09CCaeiouāīūēōṛñṃḥ]/gi);
    if (vowelMatches && vowelMatches.length > 0) {
      return Math.max(1, Math.round(vowelMatches.length * 0.85));
    }
    return Math.max(1, cleaned.split(/\s+/).length * 2);
  };

  // Line editing
  const handleLineTextChange = (secId: string, lineId: string, newText: string) => {
    setSections(prevSecs =>
      prevSecs.map(sec => {
        if (sec.id !== secId) return sec;
        
        // Calculate target section syllable average
        const validSyllables = sec.lines
          .filter(l => l.id !== lineId && !l.flaggedMeter)
          .map(l => l.syllables);
        const avg = validSyllables.length > 0
          ? Math.round(validSyllables.reduce((a, b) => a + b, 0) / validSyllables.length)
          : 12;

        const newSylCount = estimateSyllables(newText);
        const isFlagged = Math.abs(newSylCount - avg) >= 4;

        return {
          ...sec,
          lines: sec.lines.map(line => {
            if (line.id !== lineId) return line;
            return {
              ...line,
              text: newText,
              syllables: newSylCount,
              flaggedMeter: isFlagged
            };
          })
        };
      })
    );
  };

  const handleTransliterationChange = (secId: string, lineId: string, newTrans: string) => {
    setSections(prevSecs =>
      prevSecs.map(sec => {
        if (sec.id !== secId) return sec;
        return {
          ...sec,
          lines: sec.lines.map(l => (l.id === lineId ? { ...l, transliteration: newTrans } : l))
        };
      })
    );
  };

  // Line manipulation
  const handleAddLine = (secId: string) => {
    const newId = `line-${Date.now()}`;
    setSections(prevSecs =>
      prevSecs.map(sec => {
        if (sec.id !== secId) return sec;
        return {
          ...sec,
          lines: [
            ...sec.lines,
            {
              id: newId,
              text: selectedLanguage === 'Telugu' ? 'కొత్త కవితా పంక్తి' : 'नयी पंक्ति यहाँ लिखें',
              transliteration: 'kotta kavitā paṅkti',
              syllables: 12,
              isAgentAssisted: false
            }
          ]
        };
      })
    );
    setActiveEditingLineId(newId);
  };

  const handleDeleteLine = (secId: string, lineId: string) => {
    setSections(prevSecs =>
      prevSecs.map(sec => {
        if (sec.id !== secId) return sec;
        return {
          ...sec,
          lines: sec.lines.filter(l => l.id !== lineId)
        };
      })
    );
  };

  const handleMoveLine = (secId: string, lineIndex: number, direction: 'up' | 'down') => {
    setSections(prevSecs =>
      prevSecs.map(sec => {
        if (sec.id !== secId) return sec;
        const targetIndex = direction === 'up' ? lineIndex - 1 : lineIndex + 1;
        if (targetIndex < 0 || targetIndex >= sec.lines.length) return sec;
        const updatedLines = [...sec.lines];
        const [movedLine] = updatedLines.splice(lineIndex, 1);
        updatedLines.splice(targetIndex, 0, movedLine);
        return { ...sec, lines: updatedLines };
      })
    );
  };

  // Add Section
  const handleAddSection = () => {
    const newSecId = `sec-${Date.now()}`;
    const newSecName = `New Section ${sections.length + 1}`;
    setSections(prev => [
      ...prev,
      {
        id: newSecId,
        name: newSecName,
        lines: [
          {
            id: `line-${Date.now()}`,
            text: selectedLanguage === 'Telugu' ? 'హృదయంలో మ్రోగే నూతన నాదం' : 'दिल की गहराइयों में गूँजती आवाज़',
            transliteration: 'hṛdayamlō mrōgē nūtana nādaṁ',
            syllables: 11,
            isAgentAssisted: false
          }
        ]
      }
    ]);
  };

  // Accept / Dismiss Agent Suggestion
  const handleAcceptSuggestion = (sug: CoWriterSuggestionPreset) => {
    if (sug.sectionIndex >= sections.length) return;
    const targetSec = sections[sug.sectionIndex];
    if (sug.lineIndex >= targetSec.lines.length) return;

    setSections(prevSecs =>
      prevSecs.map((sec, sIdx) => {
        if (sIdx !== sug.sectionIndex) return sec;
        return {
          ...sec,
          lines: sec.lines.map((line, lIdx) => {
            if (lIdx !== sug.lineIndex) return line;
            return {
              ...line,
              text: sug.suggestedText,
              transliteration: sug.suggestedTransliteration,
              syllables: sug.syllableCount,
              isAgentAssisted: true,
              flaggedMeter: false
            };
          })
        };
      })
    );

    // Remove accepted suggestion from stream
    setSuggestions(prev => prev.filter(s => s.id !== sug.id));
  };

  const handleDismissSuggestion = (sugId: string) => {
    setSuggestions(prev => prev.filter(s => s.id !== sugId));
  };

  // Generate Co-Writer Suggestions
  const handleGenerateCoWriterSuggestions = (overridePrompt?: string) => {
    const promptToUse = overridePrompt || promptInput;
    setIsGenerating(true);

    setTimeout(() => {
      const newSugId = `sug-gen-${Date.now()}`;
      let newSug: CoWriterSuggestionPreset;

      if (selectedLanguage === 'Telugu') {
        newSug = {
          id: newSugId,
          sectionIndex: 0,
          lineIndex: 0,
          originalText: sections[0]?.lines[0]?.text || 'మౌనంలో దాగున్న గానం',
          suggestedText: 'రేతిరి కాంతుల్లో మెరిసేటి వన్నెల తార',
          suggestedTransliteration: 'rētiri kāntullō merisēṭi vannela tāra',
          type: 'dialect_nuance',
          explanation: `Generated for "${selectedDialect}": Uses regional vocabulary ("రేతిరి", "వన్నెల") matching late-night mood.`,
          syllableCount: 12,
          meterNote: 'Aligned to 12 Matra prosody'
        };
      } else {
        newSug = {
          id: newSugId,
          sectionIndex: 0,
          lineIndex: 0,
          originalText: sections[0]?.lines[0]?.text || 'ख़ामोशी में बहती हवा',
          suggestedText: 'चाँदनी रातों में गूँजे मीठी सदाएँ',
          suggestedTransliteration: 'cāṁdnī rātōṁ mēṁ gūñjē mīṭhī sadāēṁ',
          type: 'alternative',
          explanation: `Refined for ${selectedDialect} with poetic flow and smooth syllable count.`,
          syllableCount: 12,
          meterNote: 'Syllabic weight 12'
        };
      }

      setSuggestions(prev => [newSug, ...prev]);
      setIsGenerating(false);
      setPromptInput('');
    }, 1200);
  };

  // Construct backend LyricDraft wire payload
  const buildWirePayload = (): LyricDraftWire => {
    return {
      language: selectedLanguage,
      script: preset.script,
      dialect: selectedDialect,
      sections: sections.map(s => ({
        name: s.name,
        lines: s.lines.map(l => l.text)
      })),
      transliteration: showTransliteration
        ? sections.map(s => ({
            name: s.name,
            lines: s.lines.map(l => l.transliteration)
          }))
        : null,
      notes: `${selectedLanguage} (${selectedDialect}) lyric draft co-written with GHARANA Lyric Agent. ${preset.notes}`
    };
  };

  // Save to track model
  const handleSaveDraft = () => {
    const wire = buildWirePayload();
    const fullText = sections
      .map(s => `[${s.name}]\n` + s.lines.map(l => l.text).join('\n'))
      .join('\n\n');

    onUpdateTrack({
      ...track,
      lyricAnalysis: {
        language: selectedLanguage as any,
        dialect: selectedDialect,
        script: preset.script,
        primaryTheme: track.lyricAnalysis?.primaryTheme || 'Regional poetic narrative',
        rhymeScheme: track.lyricAnalysis?.rhymeScheme || 'AABB / Matra Rhyme',
        meterRegularityScore: calculateMeterScore(),
        copyrightRiskFlag: track.lyricAnalysis?.copyrightRiskFlag || false,
        copyrightNotes: track.lyricAnalysis?.copyrightNotes,
        culturalResonanceNotes: preset.notes,
        lyricsText: fullText,
        lyricDraft: wire,
        checkpointStatus: track.lyricAnalysis?.checkpointStatus || 'pending_artist_approval'
      }
    });

    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  // Calculate live meter regularity score
  const calculateMeterScore = (): number => {
    let totalLines = 0;
    let flaggedLines = 0;
    sections.forEach(sec => {
      sec.lines.forEach(l => {
        totalLines++;
        if (l.flaggedMeter) flaggedLines++;
      });
    });
    if (totalLines === 0) return 100;
    return Math.round(((totalLines - flaggedLines) / totalLines) * 100);
  };

  const handleApproveCheckpoint = () => {
    if (!track.lyricAnalysis) return;
    onUpdateTrack({
      ...track,
      lyricAnalysis: {
        ...track.lyricAnalysis,
        checkpointStatus: 'approved'
      }
    });
  };

  const handleRejectCheckpoint = () => {
    if (!track.lyricAnalysis) return;
    onUpdateTrack({
      ...track,
      lyricAnalysis: {
        ...track.lyricAnalysis,
        checkpointStatus: 'rejected'
      }
    });
  };

  return (
    <div className="space-y-8">
      
      {/* Top Header & Dialect Controls Bar */}
      <div className="p-6 glass-panel rounded-3xl border border-[#342847] bg-[#0d0a14]/90 space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <BookOpen className="w-6 h-6 text-[#f2542d]" />
              <h1 className="font-serif text-2xl font-bold tracking-tight text-[#f5efe6]">
                LYRIC STUDIO
              </h1>
              <span className="px-2.5 py-0.5 rounded-full bg-[#f2542d]/20 text-[#f2542d] border border-[#f2542d]/30 text-[10px] font-mono uppercase tracking-widest">
                Co-Writer Engine
              </span>
            </div>
            <p className="text-xs text-[#a294b8] font-serif italic">
              "A page for creation, not a gate for review. Native scripts as primary text, dialect nuances, and prosody meter weight."
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Save Button */}
            <button
              onClick={handleSaveDraft}
              className="px-4 py-2 rounded-xl bg-[#f2542d] hover:bg-[#ff7a4d] text-[#ffffff] font-semibold text-xs tracking-wider uppercase transition-all shadow-lg shadow-[#f2542d]/20 flex items-center gap-2"
            >
              {isSaved ? <CheckCircle2 className="w-4 h-4 text-white" /> : <FileText className="w-4 h-4" />}
              <span>{isSaved ? 'Draft Saved' : 'Save Lyric Revisions'}</span>
            </button>

            {/* Inspect Wire Payload */}
            <button
              onClick={() => {
                const wire = buildWirePayload();
                onInspectRaw('LyricDraft Wire Payload', wire);
              }}
              className="px-3.5 py-2 rounded-xl bg-[#241c33] hover:bg-[#342847] text-[#a294b8] hover:text-[#f5efe6] border border-[#6d6183]/30 text-xs font-mono flex items-center gap-1.5 transition-colors"
            >
              <Code2 className="w-3.5 h-3.5 text-[#ffd48a]" />
              <span>Inspect Wire JSON</span>
            </button>
          </div>
        </div>

        {/* Language, Dialect & Transliteration Selectors */}
        <div className="pt-4 border-t border-[#241c33] grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* Language Selector */}
          <div className="space-y-1">
            <label className="text-[10px] font-mono text-[#6d6183] uppercase tracking-wider block">
              Primary Language
            </label>
            <div className="relative">
              <select
                value={selectedLanguage}
                onChange={e => handleLanguageChange(e.target.value)}
                className="w-full bg-[#120e1b] border border-[#342847] text-[#f5efe6] font-serif text-sm rounded-xl px-3 py-2 focus:outline-none focus:border-[#f2542d] appearance-none"
              >
                {Object.keys(INDIC_LYRIC_PRESETS).map(lang => (
                  <option key={lang} value={lang}>
                    {lang} — {INDIC_LYRIC_PRESETS[lang].script.split(' ')[0]}
                  </option>
                ))}
              </select>
              <Languages className="w-4 h-4 text-[#a294b8] absolute right-3 top-2.5 pointer-events-none" />
            </div>
          </div>

          {/* Regional Dialect Selector */}
          <div className="space-y-1">
            <label className="text-[10px] font-mono text-[#6d6183] uppercase tracking-wider block">
              Regional Dialect
            </label>
            <select
              value={selectedDialect}
              onChange={e => setSelectedDialect(e.target.value)}
              className="w-full bg-[#120e1b] border border-[#342847] text-[#ffd48a] font-serif text-sm rounded-xl px-3 py-2 focus:outline-none focus:border-[#f5b544]"
            >
              {preset.dialects.map(d => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          {/* Transliteration Toggle */}
          <div className="space-y-1">
            <label className="text-[10px] font-mono text-[#6d6183] uppercase tracking-wider block">
              ISO Transliteration
            </label>
            <button
              onClick={() => setShowTransliteration(!showTransliteration)}
              className={`w-full h-10 px-3.5 rounded-xl border font-mono text-xs flex items-center justify-between transition-colors ${
                showTransliteration
                  ? 'bg-[#241c33] border-[#a56bd6]/50 text-[#a56bd6]'
                  : 'bg-[#120e1b] border-[#342847] text-[#6d6183]'
              }`}
            >
              <span>{showTransliteration ? 'Subtext: ISO Roman On' : 'Subtext: Native Only'}</span>
              {showTransliteration ? (
                <ToggleRight className="w-5 h-5 text-[#a56bd6]" />
              ) : (
                <ToggleLeft className="w-5 h-5 text-[#6d6183]" />
              )}
            </button>
          </div>

          {/* Prosody Meter Score */}
          <div className="space-y-1">
            <label className="text-[10px] font-mono text-[#6d6183] uppercase tracking-wider block">
              Syllabic Meter Score
            </label>
            <div className="h-10 px-3.5 bg-[#120e1b] border border-[#342847] rounded-xl flex items-center justify-between">
              <span className="font-mono text-xs text-[#a294b8]">Prosody Regularity:</span>
              <span className="font-mono text-sm font-bold text-[#43c9a0]">
                {calculateMeterScore()}%
              </span>
            </div>
          </div>

        </div>
      </div>

      {/* Main Two-Column Workspace: LEFT = Draft Page, RIGHT = Agent Co-Writer */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* LEFT COLUMN: The Draft Workspace (7 Cols) */}
        <div className="lg:col-span-7 space-y-6">
          
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#f2542d] animate-pulse" />
              <h2 className="font-serif text-lg font-semibold text-[#f5efe6] tracking-wide">
                Lyric Draft ({selectedLanguage} — {selectedDialect})
              </h2>
            </div>
            <span className="text-xs font-mono text-[#a294b8]">
              {sections.reduce((acc, s) => acc + s.lines.length, 0)} Total Lines
            </span>
          </div>

          {/* Sections List */}
          {sections.map((section, sIdx) => {
            // Calculate section average syllables for prosody baseline
            const secSyllables = section.lines.map(l => l.syllables);
            const targetSyl = secSyllables.length > 0
              ? Math.round(secSyllables.reduce((a, b) => a + b, 0) / secSyllables.length)
              : 12;

            return (
              <div
                key={section.id}
                className="glass rounded-3xl p-6 border border-[#342847] bg-[#0d0a14]/60 space-y-5 transition-all hover:border-[#6d6183]/40"
              >
                {/* Section Header */}
                <div className="flex items-center justify-between border-b border-[#241c33] pb-3">
                  <div className="flex items-center gap-3">
                    <input
                      type="text"
                      value={section.name}
                      onChange={e => {
                        const newName = e.target.value;
                        setSections(prev =>
                          prev.map(s => (s.id === section.id ? { ...s, name: newName } : s))
                        );
                      }}
                      className="font-serif text-base font-bold text-[#f5efe6] bg-transparent focus:bg-[#120e1b] focus:outline-none focus:ring-1 focus:ring-[#f2542d] px-2 py-0.5 rounded-lg border border-transparent hover:border-[#342847]"
                    />
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-[#241c33] text-[#a294b8] border border-[#342847]">
                      Meter Target: ~{targetSyl} syl/line
                    </span>
                  </div>

                  <button
                    onClick={() => handleAddLine(section.id)}
                    className="px-2.5 py-1 rounded-lg bg-[#241c33] hover:bg-[#342847] text-[#ffd48a] border border-[#f5b544]/30 text-xs font-semibold flex items-center gap-1 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Line</span>
                  </button>
                </div>

                {/* Lines Container */}
                <div className="space-y-4">
                  {section.lines.map((line, lIdx) => {
                    const isEditing = activeEditingLineId === line.id;

                    return (
                      <div
                        key={line.id}
                        className={`group relative p-4 rounded-2xl border transition-all ${
                          line.flaggedMeter
                            ? 'bg-[#18110b]/80 border-[#f2542d]/50'
                            : line.isAgentAssisted
                            ? 'bg-[#141021]/80 border-[#a56bd6]/40'
                            : 'bg-[#120e1b]/70 border-[#241c33] hover:border-[#342847]'
                        }`}
                      >
                        {/* Line Top Toolbar & Badges */}
                        <div className="flex items-center justify-between mb-2 text-[10px] font-mono">
                          <div className="flex items-center gap-2">
                            <span className="text-[#6d6183]">Line {lIdx + 1}</span>

                            {/* Agent Assisted Badge */}
                            {line.isAgentAssisted && (
                              <span className="px-2 py-0.5 rounded-full bg-[#a56bd6]/20 text-[#a56bd6] border border-[#a56bd6]/40 flex items-center gap-1">
                                <Sparkles className="w-3 h-3 text-[#a56bd6]" />
                                Agent-assisted
                              </span>
                            )}

                            {/* Meter Flag Warning */}
                            {line.flaggedMeter && (
                              <span className="px-2 py-0.5 rounded-full bg-[#f2542d]/20 text-[#f2542d] border border-[#f2542d]/40 flex items-center gap-1 animate-pulse">
                                <AlertTriangle className="w-3 h-3 text-[#f2542d]" />
                                Meter Anomaly ({line.syllables} syl vs ~{targetSyl})
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-3">
                            {/* Syllable Weight Indicator */}
                            <span
                              className={`px-2 py-0.5 rounded font-mono text-[11px] ${
                                line.flaggedMeter
                                  ? 'bg-[#f2542d]/20 text-[#f2542d] font-bold'
                                  : 'bg-[#241c33] text-[#ffd48a]'
                              }`}
                            >
                              {line.syllables} syl
                            </span>

                            {/* Actions: Move Up / Down / Delete */}
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                              <button
                                onClick={() => handleMoveLine(section.id, lIdx, 'up')}
                                disabled={lIdx === 0}
                                className="p-1 hover:bg-[#241c33] text-[#a294b8] hover:text-[#f5efe6] rounded disabled:opacity-30"
                                title="Move line up"
                              >
                                <ArrowUp className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleMoveLine(section.id, lIdx, 'down')}
                                disabled={lIdx === section.lines.length - 1}
                                className="p-1 hover:bg-[#241c33] text-[#a294b8] hover:text-[#f5efe6] rounded disabled:opacity-30"
                                title="Move line down"
                              >
                                <ArrowDown className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteLine(section.id, line.id)}
                                className="p-1 hover:bg-[#f2542d]/20 text-[#a294b8] hover:text-[#f2542d] rounded"
                                title="Delete line"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Line Editable Native Script (Primary Text) */}
                        <div className="space-y-1">
                          <textarea
                            value={line.text}
                            onChange={e => handleLineTextChange(section.id, line.id, e.target.value)}
                            rows={1}
                            placeholder="Write lyric line in native script..."
                            className="w-full bg-transparent font-serif text-lg md:text-xl text-[#f5efe6] leading-relaxed focus:outline-none focus:bg-[#08060d] focus:border focus:border-[#f2542d]/50 rounded-lg p-1.5 resize-none transition-all"
                          />

                          {/* ISO Transliteration Subtext */}
                          {showTransliteration && (
                            <div className="flex items-center gap-2 pl-1">
                              <span className="text-[9px] font-mono uppercase text-[#6d6183]">ISO:</span>
                              <input
                                type="text"
                                value={line.transliteration || ''}
                                onChange={e =>
                                  handleTransliterationChange(section.id, line.id, e.target.value)
                                }
                                placeholder="ISO transliteration..."
                                className="w-full bg-transparent font-mono text-xs text-[#a294b8] focus:outline-none focus:text-[#ffd48a]"
                              />
                            </div>
                          )}
                        </div>

                        {/* Trigger Agent Suggestion for specific line */}
                        <div className="mt-2 pt-2 border-t border-[#241c33]/50 flex justify-end">
                          <button
                            onClick={() => {
                              handleGenerateCoWriterSuggestions(
                                `Provide a rhyme and meter fix in ${selectedDialect} dialect for: "${line.text}"`
                              );
                            }}
                            className="text-[11px] font-serif text-[#a56bd6] hover:text-[#c492f2] flex items-center gap-1 transition-colors"
                          >
                            <Wand2 className="w-3 h-3 text-[#a56bd6]" />
                            <span>Ask Agent to improve line {lIdx + 1}</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {/* Add Section Button */}
          <button
            onClick={handleAddSection}
            className="w-full py-4 rounded-3xl border border-dashed border-[#342847] hover:border-[#f2542d]/60 bg-[#0d0a14]/40 hover:bg-[#120e1b] text-[#a294b8] hover:text-[#f5efe6] font-serif text-sm flex items-center justify-center gap-2 transition-all"
          >
            <Plus className="w-4 h-4 text-[#f2542d]" />
            <span>Add New Song Section (Verse / Chorus / Bridge)</span>
          </button>

        </div>

        {/* RIGHT COLUMN: Agent Co-Writer Panel (5 Cols) */}
        <div className="lg:col-span-5 space-y-6 lg:sticky lg:top-6">
          
          {/* Agent Control Box */}
          <div className="glass rounded-3xl p-6 border border-[#342847] bg-[#0d0a14]/90 space-y-5">
            <div className="flex items-center justify-between border-b border-[#241c33] pb-3">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-[#43c9a0] animate-pulse" />
                <h3 className="font-serif text-base font-bold text-[#f5efe6]">
                  Lyric Co-Writer Agent
                </h3>
              </div>
              <span className="text-[10px] font-mono text-[#43c9a0] bg-[#43c9a0]/10 border border-[#43c9a0]/30 px-2 py-0.5 rounded-full">
                Indic-LLM Active
              </span>
            </div>

            {/* Quick Prompt Chips */}
            <div className="space-y-2">
              <span className="text-[10px] font-mono text-[#6d6183] uppercase tracking-wider block">
                Quick Co-Writing Prompts
              </span>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { label: '✨ Fix Meter Anomalies', prompt: 'Fix the meter anomalies in the draft' },
                  { label: '🌊 Refine Dialect', prompt: `Enhance lyrics with authentic ${selectedDialect} vocabulary` },
                  { label: '🎵 Suggest Rhymes', prompt: 'Generate internal rhyme options for chorus' },
                  { label: '🌺 Add Metaphors', prompt: 'Suggest poetic nature metaphors in native script' }
                ].map((chip, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleGenerateCoWriterSuggestions(chip.prompt)}
                    className="px-2.5 py-1 rounded-lg bg-[#120e1b] hover:bg-[#241c33] border border-[#342847] text-[11px] font-serif text-[#a294b8] hover:text-[#ffd48a] transition-all"
                  >
                    {chip.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Prompt Input Box */}
            <div className="space-y-2">
              <textarea
                value={promptInput}
                onChange={e => setPromptInput(e.target.value)}
                placeholder={`Ask co-writer (e.g. "Suggest a 12-syllable line in ${selectedDialect} dialect for Verse 1")...`}
                rows={3}
                className="w-full bg-[#120e1b] border border-[#342847] rounded-xl p-3 font-serif text-xs text-[#f5efe6] focus:outline-none focus:border-[#a56bd6] placeholder-[#6d6183] resize-none"
              />

              <button
                onClick={() => handleGenerateCoWriterSuggestions()}
                disabled={isGenerating}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#7d43b8] to-[#f2542d] hover:opacity-95 text-white font-serif text-xs font-semibold uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-lg shadow-[#7d43b8]/20 disabled:opacity-50"
              >
                {isGenerating ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-white" />
                    <span>Analyzing Indic Prosody...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-[#ffd48a]" />
                    <span>Generate Co-Writer Suggestions</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Co-Writer Suggestions Stream */}
          <div className="space-y-4">
            <div className="flex items-center justify-between px-1">
              <h4 className="font-serif text-sm font-semibold text-[#f5efe6]">
                Co-Writer Proposals ({suggestions.length})
              </h4>
              <span className="text-[10px] font-mono text-[#a294b8]">Accept or Dismiss</span>
            </div>

            {suggestions.length === 0 ? (
              <div className="p-8 text-center glass rounded-3xl border border-[#342847] text-[#6d6183] font-serif text-xs space-y-2">
                <Sparkles className="w-6 h-6 mx-auto text-[#6d6183]" />
                <p>No pending suggestions. Click a quick prompt above to generate new line options.</p>
              </div>
            ) : (
              suggestions.map(sug => (
                <div
                  key={sug.id}
                  className="glass rounded-3xl p-5 border border-[#a56bd6]/40 bg-[#120e1b]/90 space-y-3 shadow-xl transition-all hover:border-[#a56bd6]/70"
                >
                  <div className="flex items-center justify-between text-[10px] font-mono">
                    <span className="px-2 py-0.5 rounded bg-[#a56bd6]/20 text-[#a56bd6] border border-[#a56bd6]/30 uppercase tracking-wider font-bold">
                      {sug.type.replace('_', ' ')}
                    </span>
                    <span className="text-[#a294b8]">
                      Target: Sec {sug.sectionIndex + 1}, Line {sug.lineIndex + 1}
                    </span>
                  </div>

                  {/* Original vs Proposed */}
                  <div className="space-y-2 border-l-2 border-[#f2542d]/60 pl-3 py-1">
                    <div className="space-y-0.5">
                      <span className="text-[9px] font-mono text-[#6d6183] uppercase block">Current:</span>
                      <p className="font-serif text-xs text-[#a294b8] line-through">
                        {sug.originalText}
                      </p>
                    </div>

                    <div className="space-y-0.5">
                      <span className="text-[9px] font-mono text-[#43c9a0] uppercase block">Proposed (Native):</span>
                      <p className="font-serif text-base text-[#f5efe6] font-semibold leading-relaxed">
                        {sug.suggestedText}
                      </p>
                      {showTransliteration && (
                        <p className="font-mono text-xs text-[#ffd48a]/80">
                          {sug.suggestedTransliteration}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Notes & Explanation */}
                  <div className="bg-[#08060d] rounded-xl p-3 border border-[#241c33] space-y-1">
                    <p className="text-xs font-serif text-[#a294b8] leading-relaxed">
                      {sug.explanation}
                    </p>
                    <div className="flex items-center justify-between text-[10px] font-mono text-[#ffd48a] pt-1">
                      <span>Syllables: {sug.syllableCount}</span>
                      <span>{sug.meterNote}</span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      onClick={() => handleAcceptSuggestion(sug)}
                      className="flex-1 py-2 rounded-xl bg-[#21a882] hover:bg-[#28c297] text-[#08060d] font-serif text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-md shadow-[#21a882]/20"
                    >
                      <Check className="w-4 h-4 stroke-[3]" />
                      <span>Accept Line</span>
                    </button>

                    <button
                      onClick={() => handleDismissSuggestion(sug.id)}
                      className="px-3 py-2 rounded-xl bg-[#241c33] hover:bg-[#342847] text-[#a294b8] hover:text-[#f5efe6] text-xs font-serif transition-colors flex items-center gap-1"
                    >
                      <X className="w-3.5 h-3.5" />
                      <span>Dismiss</span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Regional Cultural Resonance Note */}
          <div className="p-5 glass rounded-3xl border border-[#342847] space-y-2">
            <div className="flex items-center gap-2 text-xs font-serif text-[#ffd48a] font-semibold">
              <Sparkles className="w-4 h-4 text-[#ffd48a]" />
              <span>Dialect & Cultural Resonance Note</span>
            </div>
            <p className="text-xs font-serif text-[#a294b8] leading-relaxed">
              {preset.notes}
            </p>
          </div>

        </div>

      </div>

      {/* Human Clearance Checkpoint Card */}
      {track.lyricAnalysis && (
        <div className="pt-4">
          <HumanCheckpointCard
            title="Lyric Copyright & Cultural Resonance Clearance"
            recommendation={
              track.lyricAnalysis.copyrightRiskFlag
                ? "Potential lyric overlap detected in verse 2 with traditional folk catalog. Verify attribution before distribution."
                : `Lyrics clear copyright risk. Syllabic regularity score is ${calculateMeterScore()}% in ${selectedLanguage} (${selectedDialect}).`
            }
            status={track.lyricAnalysis.checkpointStatus}
            agentName="GHARANA Lyric & Cultural Agent"
            onApprove={handleApproveCheckpoint}
            onReject={handleRejectCheckpoint}
            onInspectRawPayload={() =>
              onInspectRaw('Lyric Agent Payload', track.rawAgentPayloads?.lyricAgent || track.lyricAnalysis)
            }
          />
        </div>
      )}

    </div>
  );
};
