/**
 * The proxy must carry no ambient authority.
 *
 * Ported from tests/test_gateway_authz.py::TestProxiesHaveNoAmbientKey in
 * Skopaq-AI/gharana, which guarded this file while the console lived there. It
 * could not come as a pytest — there is no Python here — but it had to come as
 * something, because the property it defends is the one that made the console
 * dangerous to publish in the first place.
 *
 * WHAT IT DEFENDS
 * ---------------
 * server.ts proxies browser traffic to the gateway. If it attaches an API key
 * from its own environment, then every anonymous visitor to the public console
 * URL becomes a fully authorised gateway client — the key's *value* never
 * leaks, and its *authority* leaks completely. That distinction was written up
 * as a hardening finding and is the reason the session gate exists.
 *
 * So: every X-API-Key this file sends must come from the caller's session, and
 * the file must read a session before forwarding anything.
 *
 * WHY TEXT AND NOT A RUNTIME TEST
 * -------------------------------
 * The property is an ABSENCE — no server-side key attached without a caller
 * check. An absence is what a future edit reintroduces silently, and it is
 * awkward to assert by exercising the server: you would have to prove a request
 * was NOT authorised, against a gateway you would have to stand up. Reading the
 * source is the honest shape for "this line must not exist".
 *
 * FAILING LOUDLY WHEN IT FINDS NOTHING
 * ------------------------------------
 * If server.ts stops mentioning X-API-Key at all, this exits non-zero rather
 * than passing. A guard that quietly has nothing to check is worse than one
 * that fails: it reports green forever. The Python original made the same
 * choice and its assertion message says so.
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const TARGET = "server.ts";

const source = readFileSync(join(ROOT, TARGET), "utf8");
const failures = [];

// Prose names the header; only executable lines set it.
const lines = source
  .split("\n")
  .filter((ln) => ln.includes("X-API-Key"))
  .filter((ln) => !/^\s*(\*|\/\/|\/\*)/.test(ln));

if (lines.length === 0) {
  failures.push(
    `${TARGET} sends no X-API-Key at all — either the proxy changed shape or this ` +
      `check is now looking at the wrong thing. Both make it vacuous, which is ` +
      `worse than it failing.`,
  );
}

for (const line of lines) {
  if (line.includes("process.env")) {
    failures.push(`${TARGET}: server-side key on \`${line.trim()}\``);
  }
  if (!line.includes("sessionKey") && !line.includes("key")) {
    failures.push(`${TARGET}: X-API-Key from something other than the caller: \`${line.trim()}\``);
  }
}

const READS_SESSION = ["gharana_session", "SESSION_COOKIE", "readSessionKey"];
if (!READS_SESSION.some((marker) => source.includes(marker))) {
  failures.push(
    `${TARGET} never reads a session, so it cannot tell an authorised caller from ` +
      `an anonymous one before forwarding.`,
  );
}

if (failures.length > 0) {
  console.error("proxy authority check FAILED:");
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}

console.log(`proxy authority ok: ${lines.length} X-API-Key line(s), all caller-derived`);
