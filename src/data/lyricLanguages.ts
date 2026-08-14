/**
 * The languages lyric_studio actually claims, and nothing else.
 *
 * WHAT THIS REPLACED
 * ------------------
 * `lyricPresets.ts`, which carried invented sample lyrics per language — full
 * verses with transliterations, presented in the editor as a starting draft.
 * Two things wrong with that at once: the words were written by nobody and
 * attributed to the product, and the set was Telugu-first, which the product
 * stopped being.
 *
 * The real list is a fact the system already knows: lyric_studio declares
 * `writes.lyrics.<language>` capabilities in the registry, and the planner
 * refuses to route a language nobody claimed. Deriving the picker from those
 * capabilities means the editor cannot offer a language the system would then
 * decline to write — the failure that a hardcoded list makes inevitable the
 * first time the registry changes.
 *
 * There are no sample lyrics here, and there should never be. An empty editor
 * is honest; a pre-filled one hands the artist words we invented and lets them
 * ship under their name.
 */

/** Display metadata for a language the registry claims. Presentation only. */
export interface LyricLanguage {
  /** The capability suffix: `writes.lyrics.english` -> `english`. */
  key: string;
  /** Title-cased for the picker. */
  label: string;
  /** Script hint shown beside the name. Empty when it is plain Latin. */
  script: string;
}

/**
 * Script hints, keyed by the capability suffix.
 *
 * Deliberately additive: a language the registry claims but that is missing
 * here still appears in the picker with no script hint, rather than vanishing.
 * A missing label is cosmetic; a missing language is a capability the artist
 * cannot reach.
 */
const SCRIPT_HINT: Record<string, string> = {
  hindi: 'Devanagari',
  tamil: 'Tamil',
  telugu: 'Telugu',
  punjabi: 'Gurmukhi',
  malayalam: 'Malayalam',
  bengali: 'Bengali',
};

const LYRIC_CAPABILITY = 'writes.lyrics.';

/** Pull the lyric languages out of whatever the registry returned. */
export function lyricLanguagesFrom(
  agents: { capabilities: { capability: string }[] }[],
): LyricLanguage[] {
  const keys = new Set<string>();
  for (const agent of agents) {
    for (const cap of agent.capabilities) {
      if (cap.capability.startsWith(LYRIC_CAPABILITY)) {
        const key = cap.capability.slice(LYRIC_CAPABILITY.length);
        if (key) keys.add(key);
      }
    }
  }
  return [...keys]
    .sort()
    .map((key) => ({
      key,
      label: key.charAt(0).toUpperCase() + key.slice(1),
      script: SCRIPT_HINT[key] ?? '',
    }));
}
