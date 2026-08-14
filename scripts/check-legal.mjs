/**
 * Legal pages may not ship with the entity facts unfilled.
 *
 * A privacy policy that names no company, or a grievance page with a blank
 * officer, is not a draft — once deployed it is a published statement about a
 * real legal entity, and a wrong one. The failure mode is quiet: the page
 * renders, the footer links work, nobody notices the name is missing until it
 * matters.
 *
 * So this fails while src/lib/legal.ts is unfilled, and it is wired into CI.
 * That means the routes can be built, reviewed and merged now, and simply
 * cannot go live until someone copies the real values off the certificate of
 * incorporation.
 *
 * TWO MODES, ON PURPOSE
 * ---------------------
 * Default: warn and pass. The pages are not linked from anywhere while the
 * facts are missing (see LegalPages.tsx), so an unfilled repo is a consistent,
 * safe state and blocking every commit on it would just get the check deleted.
 *
 * --strict: fail. Run this in the deploy workflow, or the day you link the
 * pages publicly. It is the difference between "not finished" and "published
 * and wrong".
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const SRC = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), "..", "src", "lib", "legal.ts"),
  "utf8",
);

const strict = process.argv.includes("--strict");

// Read the ENTITY literal without importing TypeScript: the fields are simple
// string assignments, and a regex here avoids making this script depend on a
// build step it is supposed to run before.
const block = SRC.slice(SRC.indexOf("export const ENTITY"), SRC.indexOf("/** Every fact"));
const filled = (key) => {
  const m = block.match(new RegExp(`${key}:\\s*'([^']*)'`));
  return m ? m[1].trim().length > 0 : false;
};

const REQUIRED = [
  ["legalName", "Companies Act 2013 s.12(3)(c)"],
  ["cin", "Companies Act 2013 s.12(3)(c)"],
  ["registeredOffice", "Companies Act 2013 s.12(3)(c)"],
  ["phone", "Companies Act 2013 s.12(3)(c)"],
  ["email", "Companies Act 2013 s.12(3)(c)"],
  ["courts", "governing-law clause"],
  ["effectiveDate", "every policy needs a date it took effect"],
];

const missing = REQUIRED.filter(([k]) => !filled(k));

// The nested contacts are the two obligations most often left as role inboxes.
// IT Rules 2021 r.3(2)(a) wants a NAMED officer.
const nestedMissing = [];
for (const [group, why] of [
  ["grievanceOfficer", "IT Rules 2021 r.3(2)(a) — a named person, not a role inbox"],
  ["dataProtectionContact", "DPDP Act 2023 — who answers a Data Principal"],
]) {
  const g = block.match(new RegExp(`${group}:\\s*\\{([^}]*)\\}`));
  const inner = g ? g[1] : "";
  if (!/name:\s*'[^']+'/.test(inner) || !/email:\s*'[^']+'/.test(inner)) {
    nestedMissing.push([group, why]);
  }
}

const all = [...missing, ...nestedMissing];

if (all.length === 0) {
  console.log("legal entity facts: all present");
  process.exit(0);
}

const say = strict ? console.error : console.warn;
say(`\nlegal entity facts still unfilled (${all.length}):`);
for (const [key, why] of all) say(`  - ${key.padEnd(24)} ${why}`);
say(
  "\nFill them in src/lib/legal.ts from the incorporation documents, not from" +
    "\nmemory. Until then the legal routes stay unlinked and this is a" +
    "\nconsistent state, not a broken one.",
);

if (strict) {
  console.error("\n::error::legal pages cannot be published with unfilled entity facts");
  process.exit(1);
}
process.exit(0);
