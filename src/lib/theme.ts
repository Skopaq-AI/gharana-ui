/**
 * Light, dark, or follow the system.
 *
 * THREE STATES, AND "AUTO" IS THE ABSENCE OF THE OTHER TWO
 * --------------------------------------------------------
 * `auto` does not mean "compute the OS theme and stamp it". It means stamp
 * nothing and let the stylesheet's `prefers-color-scheme` media query answer.
 * That distinction matters: if auto resolved to a literal at load time, a
 * viewer who changed their OS theme while the tab was open would keep the old
 * one until reload. Removing the attribute lets the browser re-evaluate live.
 *
 * The stylesheet is built for exactly this — see src/styles/tokens.css:
 *   no attribute      -> media query decides
 *   data-theme=light  -> forced light, beats a dark OS
 *   data-theme=dark   -> forced dark, beats a light OS
 */

export type Theme = "light" | "dark" | "auto";

const STORAGE_KEY = "gharana-theme";

export function isTheme(value: unknown): value is Theme {
  return value === "light" || value === "dark" || value === "auto";
}

/** What the viewer last chose, or `auto` if they never have. */
export function storedTheme(): Theme {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return isTheme(raw) ? raw : "auto";
  } catch {
    // Private browsing and some embedded webviews throw on access rather than
    // returning null. A theme preference is not worth a blank page.
    return "auto";
  }
}

/** Apply a choice to the document and remember it. */
export function applyTheme(theme: Theme): void {
  const root = document.documentElement;
  if (theme === "auto") root.removeAttribute("data-theme");
  else root.setAttribute("data-theme", theme);
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // Ignored on purpose: the theme still applies for this session. Failing to
    // persist a preference is not a reason to fail to honour it.
  }
}

/** Which theme is actually on screen right now, resolving `auto`. */
export function resolvedTheme(theme: Theme): "light" | "dark" {
  if (theme !== "auto") return theme;
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}
