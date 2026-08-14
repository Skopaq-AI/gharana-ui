/**
 * Every text token must be legible on its own theme's ground.
 *
 * WHY THIS IS A CI JOB AND NOT A DESIGN REVIEW
 * -------------------------------------------
 * The palette this replaced justified its accent with a claim about contrast
 * that was simply false — "vermilion carries WHITE text", when white on that
 * vermilion is 3.45:1 and fails. Nobody had run the numbers, in a codebase
 * whose entire thesis is that you run the numbers. A colour is the one kind of
 * design decision that has an arithmetic answer, so it gets checked like one.
 *
 * WHAT IT CHECKS
 * --------------
 * For each theme, each foreground token against the ground it actually sits
 * on, and each `-on` token against the fill it labels. The two palettes are
 * not inversions: the accent differs, and --accent-on flips from ink to white.
 * Both are verified independently for exactly that reason.
 *
 * THRESHOLDS
 * ----------
 * 4.5:1 for anything that can carry small text — WCAG AA body text. 3.0:1 for
 * --text-absent alone, which renders "not measured": it must read as an
 * absence and must never be mistaken for a value, so being quiet is the point.
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const CSS = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), "..", "src", "styles", "tokens.css"),
  "utf8",
);

function luminance(hex) {
  const h = hex.replace("#", "");
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
  const f = (c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}
const ratio = (a, b) => {
  const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};

/** Pull one theme's block out of the stylesheet and parse its hex tokens. */
function block(startMarker) {
  const i = CSS.indexOf(startMarker);
  if (i === -1) throw new Error(`theme block not found: ${startMarker}`);
  // Walk to the matching close of the LAST `{` opened on the marker line.
  const body = CSS.slice(i);
  const tokens = {};
  for (const line of body.split("\n")) {
    if (line.startsWith("}") && Object.keys(tokens).length) break;
    const m = line.match(/^\s*(--[a-z-]+):\s*(#[0-9a-fA-F]{6})\s*;/);
    if (m) tokens[m[1]] = m[2];
  }
  return tokens;
}

// Foreground token -> the token whose colour sits behind it.
const ON_GROUND = ["--text", "--text-muted", "--text-dim", "--text-absent", "--accent",
                   "--blocking", "--caution", "--ok", "--info"];
// --border-strong is deliberately NOT here. It draws card and panel edges, and
// a decorative border is not text and not the only means of identifying a
// control — the panel already differs from the ground by its fill. Listing it
// here failed both themes at ~1.5:1 and would have been "fixed" by lightening
// every border until the interface looked like a spreadsheet.
//
// The 3:1 rule for non-text (WCAG 1.4.11) does apply to anything that is the
// sole indicator of a control or its state. That is the focus ring here, which
// is drawn in --accent and is checked above: 5.84:1 dark, 4.78:1 light.
// `-on` token -> the fill it is written onto.
const ON_FILL = [["--accent-on", "--accent"], ["--blocking-on", "--blocking"],
                 ["--caution-on", "--caution"], ["--ok-on", "--ok"]];
// Quiet by design and only ever on large or non-essential text. --text-absent
// renders "not measured", which must read as an absence and must never be
// mistaken for a value — the one place where lower contrast is the point.
const RELAXED = new Set(["--text-absent"]);

const failures = [];
for (const [name, marker] of [["light", ":root {"], ["dark", ':root[data-theme="dark"] {']]) {
  const t = block(marker);
  const bg = t["--bg"];
  if (!bg) { failures.push(`${name}: no --bg defined`); continue; }

  for (const fg of ON_GROUND) {
    if (!t[fg]) { failures.push(`${name}: ${fg} is not defined in this theme`); continue; }
    const need = RELAXED.has(fg) ? 3.0 : 4.5;
    const r = ratio(t[fg], bg);
    const line = `${name.padEnd(5)} ${fg.padEnd(16)} on --bg  ${r.toFixed(2)}:1 (needs ${need})`;
    if (r < need) failures.push(line); else console.log(`  ok  ${line}`);
  }
  for (const [on, fill] of ON_FILL) {
    if (!t[on] || !t[fill]) { failures.push(`${name}: ${on}/${fill} missing`); continue; }
    const r = ratio(t[on], t[fill]);
    const line = `${name.padEnd(5)} ${on.padEnd(16)} on ${fill}  ${r.toFixed(2)}:1 (needs 4.5)`;
    if (r < 4.5) failures.push(line); else console.log(`  ok  ${line}`);
  }
}

// The bug this file exists to make impossible: a token defined ONLY inside a
// theme block, so the un-stamped default renders one theme on the other's ground.
const light = block(":root {");
const dark = block(':root[data-theme="dark"] {');
for (const k of Object.keys(dark)) {
  if (!(k in light)) failures.push(`${k} is defined only for dark — it does not exist by default`);
}

if (failures.length) {
  console.error("\ncontrast check FAILED:");
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}
console.log(`\ncontrast ok: both themes, ${Object.keys(light).length} tokens each`);
