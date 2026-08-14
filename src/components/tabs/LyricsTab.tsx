import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
  AlertTriangle,
  Code2,
  RefreshCw,
  PlugZap,
  Upload,
  FileText,
  Info
} from 'lucide-react';
import { TrackItem } from '../../types';
import { PageHeader } from '../SectionPanel';
import {
  listArtifacts,
  listProjects,
  uploadArtifact,
  type ArtifactRef,
  type LyricDraft,
  type Project
} from '../../lib/api';
import { describeError, formatTimestamp } from './SplitsTab';
import { lyricLanguagesFrom, type LyricLanguage } from '../../data/lyricLanguages';
import { listCapabilities } from '../../lib/api';

/**
 * Lyric Studio.
 *
 * Honest status of this screen: the editor is real and local, storage is real,
 * the co-writer agent is NOT reachable.
 *
 *  - There is a lyric_studio MCP agent (draft_lyrics, refine_section,
 *    transliterate, rhyme_suggest), but no shipped pipeline template contains a
 *    lyric stage and the gateway exposes no per-agent tool endpoint. So there is
 *    no way, today, for this console to ask a model for a line. Every "generate"
 *    affordance has been removed rather than faked.
 *  - The draft can be stored: `lyric_draft` is a real ArtifactKind, so a draft
 *    uploads to the project as a versioned artifact through the gateway.
 *  - The syllable numbers are a browser-side vowel-count estimate and are
 *    labelled as such everywhere they appear. They are not a prosody measurement
 *    and no agent produced them.
 */

interface EditableLine {
  id: string;
  text: string;
  transliteration: string;
}

interface EditableSection {
  id: string;
  name: string;
  lines: EditableLine[];
}

function newId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

/**
 * Rough syllable estimate: counts Indic vowel signs / independent vowels and
 * Latin vowels. It is arithmetic on characters, nothing more.
 */
function estimateSyllables(text: string): number {
  const cleaned = text.trim();
  if (!cleaned) return 0;
  const vowels = cleaned.match(
    /[ఁ-ఃా-ౌఅ-ఔऄ-औा-ौஅ-ஔா-ைਅ-ਔਾ-ੌঅ-ঔা-ৌaeiouāīūēōṛñṃḥ]/gi
  );
  if (vowels && vowels.length > 0) return Math.max(1, Math.round(vowels.length * 0.85));
  return Math.max(1, cleaned.split(/\s+/).length * 2);
}

interface LyricsTabProps {
  /** Legacy prop from the mock-data console. Not used as a data source. */
  track?: TrackItem;
  onUpdateTrack?: (updated: TrackItem) => void;
  onInspectRaw?: (title: string, payload: any) => void;
  projectId?: string | null;
}

export const LyricsTab: React.FC<LyricsTabProps> = ({ onInspectRaw, projectId }) => {
  // The languages lyric_studio actually claims, read from the registry. A
  // hardcoded list would eventually offer a language the planner then refuses
  // to route, which the artist discovers only after writing in it.
  const [languages, setLanguages] = useState<LyricLanguage[]>([]);
  const [selectedLanguage, setSelectedLanguage] = useState<string>('');
  /** Artist-stated. Never offered from a list, because we do not have one. */
  const [selectedDialect, setSelectedDialect] = useState<string>('');

  useEffect(() => {
    let cancelled = false;
    listCapabilities()
      .then((agents) => {
        if (cancelled) return;
        const langs = lyricLanguagesFrom(agents);
        setLanguages(langs);
        setSelectedLanguage((cur) => cur || langs[0]?.key || '');
      })
      .catch(() => undefined); // the picker stays empty; nothing is invented
    return () => {
      cancelled = true;
    };
  }, []);
  const [showTransliteration, setShowTransliteration] = useState(true);
  const [sections, setSections] = useState<EditableSection[]>([]);

  // --- storage (real) -------------------------------------------------------
  const [projects, setProjects] = useState<Project[] | null>(null);
  const [projectsError, setProjectsError] = useState<string | null>(null);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(projectId ?? null);
  const [drafts, setDrafts] = useState<ArtifactRef[] | null>(null);
  const [draftsError, setDraftsError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savedRef, setSavedRef] = useState<ArtifactRef | null>(null);

  useEffect(() => {
    let cancelled = false;
    listProjects()
      .then((rows) => {
        if (cancelled) return;
        setProjects(rows);
        setActiveProjectId((current) => current ?? rows[0]?.id ?? null);
      })
      .catch((err) => {
        if (!cancelled) setProjectsError(describeError(err));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const loadDrafts = useCallback((pid: string) => {
    setDrafts(null);
    setDraftsError(null);
    listArtifacts(pid)
      .then((rows) => setDrafts(rows.filter((a) => a.kind === 'lyric_draft')))
      .catch((err) => setDraftsError(describeError(err)));
  }, []);

  useEffect(() => {
    if (activeProjectId) loadDrafts(activeProjectId);
  }, [activeProjectId, loadDrafts]);

  const handleLanguageChange = (lang: string) => {
    setSelectedLanguage(lang);
  };

  const script = languages.find((l) => l.key === selectedLanguage)?.script ?? '';

  const updateLine = (secId: string, lineId: string, patch: Partial<EditableLine>) => {
    setSections((prev) =>
      prev.map((sec) =>
        sec.id === secId
          ? { ...sec, lines: sec.lines.map((l) => (l.id === lineId ? { ...l, ...patch } : l)) }
          : sec
      )
    );
  };

  const addLine = (secId: string) => {
    setSections((prev) =>
      prev.map((sec) =>
        sec.id === secId
          ? { ...sec, lines: [...sec.lines, { id: newId('line'), text: '', transliteration: '' }] }
          : sec
      )
    );
  };

  const deleteLine = (secId: string, lineId: string) => {
    setSections((prev) =>
      prev.map((sec) =>
        sec.id === secId ? { ...sec, lines: sec.lines.filter((l) => l.id !== lineId) } : sec
      )
    );
  };

  const moveLine = (secId: string, index: number, direction: 'up' | 'down') => {
    setSections((prev) =>
      prev.map((sec) => {
        if (sec.id !== secId) return sec;
        const target = direction === 'up' ? index - 1 : index + 1;
        if (target < 0 || target >= sec.lines.length) return sec;
        const lines = [...sec.lines];
        const [moved] = lines.splice(index, 1);
        lines.splice(target, 0, moved);
        return { ...sec, lines };
      })
    );
  };

  const addSection = () => {
    setSections((prev) => [
      ...prev,
      {
        id: newId('sec'),
        name: `Section ${prev.length + 1}`,
        lines: [{ id: newId('line'), text: '', transliteration: '' }]
      }
    ]);
  };

  const removeSection = (secId: string) => {
    setSections((prev) => prev.filter((s) => s.id !== secId));
  };

  const totalLines = sections.reduce((n, s) => n + s.lines.length, 0);
  const hasContent = sections.some((s) => s.lines.some((l) => l.text.trim().length > 0));

  /** The LyricDraft wire shape, built locally so the artifact is schema-shaped. */
  const draftPayload: LyricDraft = useMemo(
    () => ({
      language: selectedLanguage,
      script,
      dialect: selectedDialect,
      sections: sections.map((s) => ({ name: s.name, lines: s.lines.map((l) => l.text) })),
      transliteration: showTransliteration
        ? sections.map((s) => ({ name: s.name, lines: s.lines.map((l) => l.transliteration) }))
        : null,
      notes: `Written in the GHARANA console lyric editor. No lyric agent was involved: none is reachable from the console today.`
    }),
    [selectedLanguage, script, selectedDialect, sections, showTransliteration]
  );

  const saveDraftToProject = async () => {
    if (!activeProjectId || !hasContent) return;
    setSaving(true);
    setSaveError(null);
    setSavedRef(null);
    try {
      const body = JSON.stringify(draftPayload, null, 2);
      const file = new File([body], `lyric-draft-${Date.now()}.json`, {
        type: 'application/json'
      });
      const ref = await uploadArtifact(activeProjectId, file, 'lyric_draft');
      setSavedRef(ref);
      loadDrafts(activeProjectId);
    } catch (err) {
      setSaveError(describeError(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* NOT-CONNECTED BANNER — the first thing on the screen, by design */}
      <div className="p-6 rounded-3xl bg-panel border border-caution/50 shadow-2xl space-y-4">
        <div className="flex items-start gap-4">
          <div className="p-2.5 rounded-2xl bg-caution/10 border border-caution/40 text-caution flex-shrink-0">
            <PlugZap className="w-6 h-6" />
          </div>
          <div className="space-y-2 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="font-serif text-lg font-bold text-ink">
                Lyric co-writer agent — not connected yet
              </h2>
              <span className="px-2.5 py-0.5 rounded-full bg-caution/15 text-caution border border-caution/40 font-mono text-[10px] font-bold uppercase tracking-wider">
                Editor is local
              </span>
            </div>
            <p className="font-serif text-xs text-muted leading-relaxed">
              The <span className="font-mono text-caution">lyric_studio</span> agent exists in the
              backend with four tools — draft_lyrics, refine_section, transliterate and
              rhyme_suggest — but no shipped pipeline template includes a lyric stage, and the
              gateway exposes runs rather than individual agent tools. Until a lyric stage lands, a
              draft arrives here the way every other agent output does: as the output of a stage on
              a run, with its own human checkpoint. Nothing on this screen calls a model.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
          {[
            {
              title: 'Works today',
              body: 'Typing, section structure, transliteration lines, and saving the draft to the project as a lyric_draft artifact.',
              tone: 'text-accent border-accent/40'
            },
            {
              title: 'Waiting on the backend',
              body: 'A lyric stage in a pipeline template (or a gateway route for lyric_studio tools) before drafting, refining or rhyme suggestions can run.',
              tone: 'text-caution border-caution/40'
            },
            {
              title: 'Never faked here',
              body: 'No generated lines, no meter verdicts, no copyright-risk score. Syllable counts below are a browser estimate and are labelled as one.',
              tone: 'text-info border-info/40'
            }
          ].map((card) => (
            <div key={card.title} className={`p-4 rounded-2xl bg-bg border ${card.tone}`}>
              <span className="font-mono text-[10px] uppercase tracking-wider font-bold block mb-1">
                {card.title}
              </span>
              <p className="font-serif text-[11px] text-muted leading-relaxed">{card.body}</p>
            </div>
          ))}
        </div>
      </div>

      <PageHeader
        icon={BookOpen}
        title="Lyric Studio & Indic Script Editor"
        description="Native Indic script as the primary text, with an optional ISO transliteration line."
        badge="Local Draft"
        action={
          <button
            onClick={() => onInspectRaw?.('LyricDraft (as it would be sent)', draftPayload)}
            disabled={!onInspectRaw}
            className="px-3 py-2.5 rounded-xl bg-surface hover:bg-line text-caution border border-line-strong font-mono text-xs font-bold transition-all flex items-center gap-2 disabled:opacity-40"
          >
            <Code2 className="w-4 h-4" />
            <span className="hidden sm:inline">JSON Wire</span>
          </button>
        }
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="space-y-1">
            <label className="text-[10px] font-mono text-dim uppercase tracking-wider block">
              Primary Language
            </label>
            <div className="relative">
              <select
                value={selectedLanguage}
                onChange={(e) => handleLanguageChange(e.target.value)}
                className="w-full bg-panel border border-line-strong text-ink font-serif text-sm rounded-xl px-3 py-2 focus:outline-none focus:border-accent appearance-none"
              >
                {languages.map((lang) => (
                  <option key={lang.key} value={lang.key}>
                    {lang.label}
                    {lang.script ? ` — ${lang.script}` : ''}
                  </option>
                ))}
              </select>
              <Languages className="w-4 h-4 text-muted absolute right-3 top-2.5 pointer-events-none" />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-mono text-dim uppercase tracking-wider block">
              Regional Dialect
            </label>
            {/* Free text, not a menu. The registry declares languages, never
                dialects — a dropdown here could only be a list we made up, and
                it would be wrong for exactly the artists it claimed to serve. */}
            <input
              type="text"
              value={selectedDialect}
              onChange={(e) => setSelectedDialect(e.target.value)}
              placeholder="optional — yours to name"
              className="w-full bg-panel border border-line-strong text-caution font-serif text-sm rounded-xl px-3 py-2 focus:outline-none focus:border-caution placeholder:text-dim"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-mono text-dim uppercase tracking-wider block">
              ISO Transliteration
            </label>
            <button
              onClick={() => setShowTransliteration(!showTransliteration)}
              className={`w-full h-10 px-3.5 rounded-xl border font-mono text-xs flex items-center justify-between transition-colors ${
                showTransliteration
                  ? 'bg-line border-info/50 text-info'
                  : 'bg-panel border-line-strong text-dim'
              }`}
            >
              <span>{showTransliteration ? 'Subtext: ISO Roman On' : 'Subtext: Native Only'}</span>
              {showTransliteration ? (
                <ToggleRight className="w-5 h-5 text-info" />
              ) : (
                <ToggleLeft className="w-5 h-5 text-dim" />
              )}
            </button>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-mono text-dim uppercase tracking-wider block">
              Draft Size
            </label>
            <div className="h-10 px-3.5 bg-panel border border-line-strong rounded-xl flex items-center justify-between">
              <span className="font-mono text-xs text-muted">Lines / sections:</span>
              <span className="font-mono text-sm font-bold text-ink">
                {totalLines} / {sections.length}
              </span>
            </div>
          </div>
        </div>
      </PageHeader>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* LEFT: the editor */}
        <div className="lg:col-span-7 space-y-6">
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-accent" />
              <h2 className="font-serif text-lg font-semibold text-ink tracking-wide">
                Draft ({selectedLanguage || 'no language selected'}
                {selectedDialect ? ` — ${selectedDialect}` : ''})
              </h2>
            </div>
            <span className="text-xs font-mono text-muted">
              {totalLines} line{totalLines === 1 ? '' : 's'}
            </span>
          </div>

          {sections.length === 0 ? (
            <div className="p-10 rounded-3xl border border-dashed border-line-strong bg-bg/60 text-center space-y-4">
              <BookOpen className="w-8 h-8 mx-auto text-dim" />
              <h3 className="font-serif text-base font-bold text-ink">Empty draft</h3>
              <p className="font-serif text-xs text-muted max-w-md mx-auto leading-relaxed">
                Nothing is written yet, and nothing will be written for you. Add a section and the
                words are yours; nothing is stored until you save.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-1">
                <button
                  onClick={addSection}
                  className="px-4 py-2.5 rounded-xl bg-accent hover:bg-accent-hover text-accent-on font-serif text-xs font-bold flex items-center gap-2 transition-all"
                >
                  <Plus className="w-4 h-4" />
                  <span>Start a blank section</span>
                </button>
              </div>
            </div>
          ) : (
            <>
              {sections.map((section) => {
                const estimates = section.lines.map((l) => estimateSyllables(l.text));
                const nonZero = estimates.filter((n) => n > 0);
                const average =
                  nonZero.length > 0
                    ? Math.round(nonZero.reduce((a, b) => a + b, 0) / nonZero.length)
                    : 0;

                return (
                  <div
                    key={section.id}
                    className="glass rounded-3xl p-6 border border-line-strong bg-bg/60 space-y-5 transition-all hover:border-dim/40"
                  >
                    <div className="flex items-center justify-between border-b border-line pb-3 gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <input
                          type="text"
                          value={section.name}
                          onChange={(e) =>
                            setSections((prev) =>
                              prev.map((s) =>
                                s.id === section.id ? { ...s, name: e.target.value } : s
                              )
                            )
                          }
                          className="font-serif text-base font-bold text-ink bg-transparent focus:bg-panel focus:outline-none focus:ring-1 focus:ring-accent px-2 py-0.5 rounded-lg border border-transparent hover:border-line-strong min-w-0"
                        />
                        {average > 0 && (
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-line text-muted border border-line-strong flex-shrink-0">
                            ~{average} syl/line (estimate)
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button
                          onClick={() => addLine(section.id)}
                          className="px-2.5 py-1 rounded-lg bg-line hover:bg-line-strong text-caution border border-caution/30 text-xs font-semibold flex items-center gap-1 transition-colors"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Add Line</span>
                        </button>
                        <button
                          onClick={() => removeSection(section.id)}
                          className="p-1.5 text-muted hover:text-accent transition-colors"
                          title="Remove section"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div className="space-y-4">
                      {section.lines.map((line, lIdx) => {
                        const syllables = estimates[lIdx];
                        const outlier = average > 0 && syllables > 0 && Math.abs(syllables - average) >= 4;

                        return (
                          <div
                            key={line.id}
                            className={`group relative p-4 rounded-2xl border transition-all ${
                              outlier
                                ? 'bg-caution/80 border-caution/40'
                                : 'bg-panel/70 border-line hover:border-line-strong'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-2 text-[10px] font-mono">
                              <div className="flex items-center gap-2">
                                <span className="text-dim">Line {lIdx + 1}</span>
                                {outlier && (
                                  <span className="px-2 py-0.5 rounded-full bg-caution/15 text-caution border border-caution/40 flex items-center gap-1">
                                    <AlertTriangle className="w-3 h-3" />
                                    {syllables} vs section average {average} (estimate only)
                                  </span>
                                )}
                              </div>

                              <div className="flex items-center gap-3">
                                <span
                                  className="px-2 py-0.5 rounded font-mono text-[11px] bg-line text-muted"
                                  title="Browser-side vowel-count estimate. Not an agent measurement."
                                >
                                  ~{syllables} syl
                                </span>

                                <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                                  <button
                                    onClick={() => moveLine(section.id, lIdx, 'up')}
                                    disabled={lIdx === 0}
                                    className="p-1 hover:bg-line text-muted hover:text-ink rounded disabled:opacity-30"
                                    title="Move line up"
                                  >
                                    <ArrowUp className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => moveLine(section.id, lIdx, 'down')}
                                    disabled={lIdx === section.lines.length - 1}
                                    className="p-1 hover:bg-line text-muted hover:text-ink rounded disabled:opacity-30"
                                    title="Move line down"
                                  >
                                    <ArrowDown className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => deleteLine(section.id, line.id)}
                                    className="p-1 hover:bg-[var(--accent-dim)] text-muted hover:text-accent rounded"
                                    title="Delete line"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            </div>

                            <div className="space-y-1">
                              <textarea
                                value={line.text}
                                onChange={(e) => updateLine(section.id, line.id, { text: e.target.value })}
                                rows={1}
                                placeholder="Write the line in native script…"
                                className="w-full bg-transparent font-serif text-lg md:text-xl text-ink leading-relaxed focus:outline-none focus:bg-bg focus:border focus:border-[var(--accent-border)] rounded-lg p-1.5 resize-none transition-all"
                              />

                              {showTransliteration && (
                                <div className="flex items-center gap-2 pl-1">
                                  <span className="text-[9px] font-mono uppercase text-dim">ISO:</span>
                                  <input
                                    type="text"
                                    value={line.transliteration}
                                    onChange={(e) =>
                                      updateLine(section.id, line.id, {
                                        transliteration: e.target.value
                                      })
                                    }
                                    placeholder="Type the romanisation yourself — no transliteration agent is wired up"
                                    className="w-full bg-transparent font-mono text-xs text-muted focus:outline-none focus:text-caution placeholder-line-strong"
                                  />
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}

              <button
                onClick={addSection}
                className="w-full py-4 rounded-3xl border border-dashed border-line-strong hover:border-[var(--accent-border)] bg-bg/40 hover:bg-panel text-muted hover:text-ink font-serif text-sm flex items-center justify-center gap-2 transition-all"
              >
                <Plus className="w-4 h-4 text-accent" />
                <span>Add New Song Section (Verse / Chorus / Bridge)</span>
              </button>
            </>
          )}
        </div>

        {/* RIGHT: storage + what is missing */}
        <div className="lg:col-span-5 space-y-6 lg:sticky lg:top-6">
          <div className="glass rounded-3xl p-6 border border-line-strong bg-bg/90 space-y-4">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <div className="flex items-center gap-2">
                <Upload className="w-4 h-4 text-accent" />
                <h3 className="font-serif text-base font-bold text-ink">
                  Store draft on a project
                </h3>
              </div>
              <span className="text-[10px] font-mono text-accent bg-accent/10 border border-accent/30 px-2 py-0.5 rounded-full">
                Real endpoint
              </span>
            </div>

            <p className="font-serif text-xs text-muted leading-relaxed">
              Saves the draft as a versioned{' '}
              <span className="font-mono text-caution">lyric_draft</span> artifact on the project.
              That is storage only — no agent reads it yet, and nothing analyses it.
            </p>

            {projectsError ? (
              <div className="p-3 rounded-xl bg-[var(--accent-dim)] border border-[var(--accent-border)] font-mono text-[11px] text-accent-hover">
                {projectsError}
              </div>
            ) : projects === null ? (
              <div className="flex items-center gap-2 font-mono text-xs text-muted">
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-info" />
                <span>Loading projects…</span>
              </div>
            ) : projects.length === 0 ? (
              <div className="p-3 rounded-xl bg-bg border border-dashed border-line-strong font-serif text-xs text-muted">
                No projects exist yet, so there is nowhere to store a draft. Create a project first.
              </div>
            ) : (
              <>
                <select
                  value={activeProjectId ?? ''}
                  onChange={(e) => setActiveProjectId(e.target.value)}
                  className="w-full bg-bg border border-line-strong rounded-xl px-3 py-2 font-serif text-sm text-ink focus:outline-none focus:border-caution"
                >
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.title} — {p.artist_name}
                    </option>
                  ))}
                </select>

                <button
                  onClick={saveDraftToProject}
                  disabled={saving || !hasContent || !activeProjectId}
                  className="w-full py-2.5 rounded-xl bg-accent hover:bg-accent-hover text-accent-on font-serif text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 disabled:opacity-40"
                >
                  {saving ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Uploading…</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" />
                      <span>Save draft as lyric_draft artifact</span>
                    </>
                  )}
                </button>

                {!hasContent && (
                  <p className="font-mono text-[10px] text-dim">
                    Write at least one line before saving.
                  </p>
                )}

                {saveError && (
                  <div className="p-3 rounded-xl bg-[var(--accent-dim)] border border-[var(--accent-border)] font-mono text-[11px] text-accent-hover">
                    {saveError}
                  </div>
                )}

                {savedRef && (
                  <div className="p-3 rounded-xl bg-accent/10 border border-accent/40 font-mono text-[11px] text-accent flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                    <span>
                      Stored as artifact {savedRef.id} (version {savedRef.version}).
                    </span>
                  </div>
                )}

                <div className="pt-3 border-t border-line space-y-2">
                  <span className="text-[10px] font-mono text-dim uppercase tracking-wider block">
                    lyric_draft artifacts on this project
                  </span>
                  {draftsError ? (
                    <p className="font-mono text-[11px] text-accent-hover">{draftsError}</p>
                  ) : drafts === null ? (
                    <p className="font-mono text-[11px] text-muted">Loading…</p>
                  ) : drafts.length === 0 ? (
                    <p className="font-serif text-[11px] text-dim">
                      None yet. Saved drafts will be listed here.
                    </p>
                  ) : (
                    <ul className="space-y-1.5">
                      {drafts.map((d) => (
                        <li
                          key={d.id}
                          className="p-2.5 rounded-xl bg-bg border border-line font-mono text-[10px] text-muted flex items-center justify-between gap-2"
                        >
                          <span className="truncate">v{d.version} • {d.uri}</span>
                          <span className="flex-shrink-0 text-dim">
                            {formatTimestamp(d.created_at)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                  <p className="font-serif text-[10px] text-dim">
                    The gateway has no artifact-download route, so stored drafts can be listed here
                    but not re-opened in the editor.
                  </p>
                </div>
              </>
            )}
          </div>

          <div className="glass rounded-3xl p-6 border border-line-strong bg-bg/90 space-y-3 opacity-90">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-dim" />
                <h3 className="font-serif text-base font-bold text-muted">
                  Co-writer tools (unreachable)
                </h3>
              </div>
              <span className="text-[10px] font-mono text-dim bg-surface border border-line-strong px-2 py-0.5 rounded-full">
                No endpoint
              </span>
            </div>

            <ul className="space-y-2">
              {[
                ['draft_lyrics', 'Draft sections in a chosen language, script and dialect.'],
                ['refine_section', 'Rewrite one section against a written instruction.'],
                ['transliterate', 'Produce the ISO romanisation line automatically.'],
                ['rhyme_suggest', 'Offer rhyme candidates for a given line.']
              ].map(([tool, what]) => (
                <li
                  key={tool}
                  className="p-3 rounded-xl bg-bg border border-line flex items-start gap-2.5"
                >
                  <span className="font-mono text-[11px] text-dim font-bold flex-shrink-0 line-through">
                    {tool}
                  </span>
                  <span className="font-serif text-[11px] text-muted">{what}</span>
                </li>
              ))}
            </ul>

            <p className="font-serif text-[11px] text-dim leading-relaxed">
              These are shown greyed out on purpose: the tools exist on the lyric_studio agent but
              nothing routes to them from the browser, and a button that quietly returns canned text
              would be worse than no button.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
