/**
 * The console defines colours in one place, or it does not have a system.
 *
 * Ported from tests/test_smoke.py::TestConsoleUsesTheDesignSystem in
 * Skopaq-AI/gharana, which guarded this code while it lived there. Its original
 * docstring explained it was written in Python only "because the console has no
 * test runner of its own, and a guard that needs one set up first is a guard
 * that never gets written". This repo now has CI, so it lives here, next to
 * what it checks.
 *
 * WHAT IT IS DEFENDING AGAINST, WHICH ALREADY HAPPENED ONCE
 * ---------------------------------------------------------
 * 1,860 hardcoded hex values across 41 distinct colours, while
 * src/styles/tokens.css — written as the design system — was imported by
 * nothing. Every component invented its own palette and was not wrong to,
 * because there was no other option. A palette nobody imports is a document.
 *
 * WHY IT EARNS ITS KEEP
 * ---------------------
 * Because the discipline held, replacing the ENTIRE palette — Signal lime on
 * near-black to Night Raga ink and vermilion — was a one-file change to
 * tokens.css. Not one component needed editing. That is the whole return on
 * this rule, and it is only available while the count stays at zero.
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, relative } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SRC = join(ROOT, "src");
const failures = [];

function tsxFiles(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry === "dist") continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...tsxFiles(full));
    else if (entry.endsWith(".tsx")) out.push(full);
  }
  return out;
}

// --- no component hardcodes a colour ---------------------------------------
const HEX = /#[0-9a-fA-F]{6}\b/;
const offenders = [];
for (const file of tsxFiles(SRC)) {
  const lines = readFileSync(file, "utf8").split("\n");
  lines.forEach((line, i) => {
    // Prose may discuss the migration; only code counts.
    const stripped = line.trimStart();
    if (stripped.startsWith("*") || stripped.startsWith("//") || stripped.startsWith("/*")) return;
    if (HEX.test(line)) offenders.push(`${relative(ROOT, file)}:${i + 1}`);
  });
}
if (offenders.length > 0) {
  failures.push(
    "hardcoded colours are back — add a token to src/styles/tokens.css and use " +
      `the Tailwind utility instead:\n      ${offenders.slice(0, 15).join("\n      ")}`,
  );
}

// --- the system is actually wired in ---------------------------------------
const indexCss = readFileSync(join(SRC, "index.css"), "utf8");
if (!indexCss.includes("styles/tokens.css")) {
  failures.push("tokens.css is not imported — it is dead code");
}
if (!indexCss.includes("@theme")) {
  failures.push(
    "tokens are not mapped into Tailwind, so components have no utility to reach " +
      "for and will go back to arbitrary hex values",
  );
}

// --- the accent pairing cannot be separated --------------------------------
// Night Raga's vermilion carries INK at 5.84:1; white on it is 3.45:1 and fails.
// --accent-on exists so nobody writes a colour onto the accent by hand.
const tokens = readFileSync(join(SRC, "styles", "tokens.css"), "utf8");
if (!tokens.includes("--accent-on")) {
  failures.push("--accent-on is gone; the accent's text colour is now anyone's guess");
}

if (failures.length > 0) {
  console.error("design system check FAILED:");
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}

console.log(
  `design system ok: ${tsxFiles(SRC).length} components, 0 hardcoded colours, tokens wired`,
);
