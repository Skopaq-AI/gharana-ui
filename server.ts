/**
 * GHARANA console server.
 *
 * Three jobs, and deliberately only three:
 *
 *  1. Serve the SPA (Vite middleware in dev, static dist in production).
 *  2. Sign a visitor in: exchange a GHARANA access key for an HttpOnly session
 *     cookie, after the gateway itself has confirmed the key is real.
 *  3. Proxy /api/gw/* to the GHARANA gateway, attaching *that session's* key.
 *
 * The thing this server must never do again is attach a key of its own. It used
 * to set X-API-Key from a server-side GHARANA_API_KEY on every request, with no
 * check on who was asking — no session, no login, no cookie. Keeping the key in
 * Node stops the key's *value* leaking to the browser; it does nothing about its
 * *authority*, and once this console has a public domain every anonymous visitor
 * is a fully authorised gateway client: the whole artist list with WhatsApp
 * numbers on /api/gw/artists, and someone else's release stage approvable on
 * /api/gw/runs/{id}/stages/{stage}/approve. So there is no ambient credential
 * here at all. The only key that reaches the gateway is the one the signed-in
 * caller presented, and the gateway scopes what it can see to that artist.
 *
 * The session cookie carries the caller's own key rather than a server-signed
 * token: with per-artist keys the key *is* their credential, so a signed token
 * would be a second secret to mint, rotate and get wrong, and the cookie is
 * HttpOnly + SameSite=Strict either way. Revocation is removing the key from the
 * gateway's registry, which takes effect on the next request.
 *
 * What this server no longer does is call Gemini. It used to hold its own
 * API key and its own A&R / mix-QC prompts, which made it a second, parallel
 * brain competing with the real stack — the orchestrator, the seven MCP agents,
 * the model router (tiered per docs Appendix A), the deterministic DSP
 * measurements, the human-checkpoint state machine and the hash-chained rights
 * ledger. Two systems both claiming to be GHARANA's judgement would have
 * drifted within a week, and the LLM-side one has none of the guarantees: no
 * pinned measurements, no "narration can never drop a blocking issue", no eval
 * gate. All agent work now goes through the gateway.
 */

import path from 'path';
import { fileURLToPath } from 'url';

import dotenv from 'dotenv';
import express, { type Request, type Response as ExpressResponse } from 'express';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT ?? 3000);

/** The real backend. Set to the Railway gateway in a deployment. */
const GATEWAY_URL = (process.env.GATEWAY_URL ?? 'http://localhost:8080').replace(/\/$/, '');

/** Name of the session cookie. HttpOnly: script on the page must never read it. */
const SESSION_COOKIE = 'gharana_session';

/**
 * How long a sign-in lasts. Short enough that a shared laptop is not a standing
 * grant, long enough that a mixing session is not interrupted.
 */
const SESSION_MAX_AGE_S = 12 * 60 * 60;

/**
 * Upload ceiling, read from the same GHARANA_MAX_UPLOAD_BYTES the gateway uses,
 * so the two ends cannot disagree about what is too big.
 *
 * Honest about what it does not fix: `express.raw` buffers the whole body in
 * this process, so a permissive value here is still this server's memory. The
 * gateway streams and is the authoritative ceiling; lower this variable if the
 * console runs on a smaller container than the gateway does.
 */
const MAX_UPLOAD_BYTES = Number(process.env.GHARANA_MAX_UPLOAD_BYTES ?? 512 * 1024 * 1024);

// ---------------------------------------------------------------------------
// Session plumbing
// ---------------------------------------------------------------------------

/** Read one cookie without pulling in cookie-parser. */
function readCookie(req: Request, name: string): string | null {
  const header = req.headers.cookie;
  if (!header) return null;
  for (const part of header.split(';')) {
    const eq = part.indexOf('=');
    if (eq === -1) continue;
    if (part.slice(0, eq).trim() !== name) continue;
    return decodeURIComponent(part.slice(eq + 1).trim());
  }
  return null;
}

/** True when the response will travel over TLS, so the cookie can demand it. */
function isSecureRequest(req: Request): boolean {
  const forwarded = req.get('x-forwarded-proto');
  if (forwarded) return forwarded.split(',')[0].trim() === 'https';
  return req.protocol === 'https';
}

function setSessionCookie(req: Request, res: ExpressResponse, key: string): void {
  res.cookie(SESSION_COOKIE, key, {
    httpOnly: true,
    // Strict, not Lax: every state-changing call this console makes is a
    // same-origin fetch, so nothing legitimate is lost and cross-site POSTs
    // (approving someone's release stage from another tab) carry no cookie.
    sameSite: 'strict',
    secure: isSecureRequest(req),
    path: '/',
    maxAge: SESSION_MAX_AGE_S * 1000,
  });
}

function clearSessionCookie(req: Request, res: ExpressResponse): void {
  res.clearCookie(SESSION_COOKIE, {
    httpOnly: true,
    sameSite: 'strict',
    secure: isSecureRequest(req),
    path: '/',
  });
}

/** Outcome of a sign-in check: the gateway's own verdict, verbatim. */
interface Resolved {
  /** 200 when the key is real; otherwise the status to return to the browser. */
  status: number;
  principal?: unknown;
  detail?: string;
}

/**
 * Ask the gateway who a key belongs to. This is the sign-in check: the console
 * has no user database and must not invent one, so the only authority on
 * whether a key is real is the service that will honour it.
 */
async function resolvePrincipal(key: string): Promise<Resolved> {
  let upstream: Response;
  try {
    upstream = await fetch(`${GATEWAY_URL}/me`, {
      headers: { 'X-API-Key': key, accept: 'application/json' },
    });
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    return { status: 502, detail: `gateway unreachable at ${GATEWAY_URL} (${detail})` };
  }
  const text = await upstream.text();
  if (!upstream.ok) {
    let detail = `gateway rejected the access key (${upstream.status})`;
    try {
      const parsed = JSON.parse(text);
      if (parsed && typeof parsed.detail === 'string') detail = parsed.detail;
    } catch {
      /* non-JSON error body: keep the generic message */
    }
    return { status: upstream.status, detail };
  }
  return { status: 200, principal: text ? JSON.parse(text) : null };
}

/**
 * Reject cross-origin state changes outright.
 *
 * SameSite=Strict already stops the cookie riding along on a cross-site
 * request, so this is belt and braces — but it is two lines, and the thing on
 * the other side of it is an irreversible approval on someone's release.
 */
function isCrossOrigin(req: Request): boolean {
  const origin = req.get('origin');
  if (!origin) return false;
  try {
    return new URL(origin).host !== req.get('host');
  } catch {
    return true;
  }
}

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

app.get('/api/health', (req, res) => {
  const signedIn = Boolean(readCookie(req, SESSION_COOKIE));
  res.json({
    status: 'ok',
    service: 'console',
    // Stamped by the deploy pipeline, which then asks each service to say its
    // version back. "Railway reported SUCCESS" is not evidence that the new
    // image is the one answering requests; this is.
    version: process.env.GHARANA_VERSION ?? 'unknown',
    commit: process.env.GHARANA_GIT_SHA ?? 'unknown',
    built_at: process.env.GHARANA_BUILT_AT ?? 'unknown',
    // Only told to a signed-in caller. This route is deliberately open so a
    // scheduler's probe needs no secret, and the backend topology is not
    // something an anonymous visitor needs in order to learn the process is
    // alive.
    ...(signedIn ? { gateway: GATEWAY_URL } : {}),
    // Kept under its historical name because the SPA's Settings tab reads it.
    // Its meaning has changed with the auth model: it is no longer "this server
    // holds a master key", it is "this browser session carries a credential".
    gatewayKeyConfigured: signedIn,
    authenticated: signedIn,
    timestamp: new Date().toISOString(),
  });
});

/** Current session, re-validated against the gateway so a revoked key logs out. */
/**
 * The capability registry, for the signed-out landing page.
 *
 * Separate from the /api/gw proxy on purpose. That proxy attaches the signed-in
 * caller's own key and 401s without a session, which is correct for everything
 * that touches an artist's rows — and fatal for the landing page's agent grid,
 * which has no session and gave up silently, rendering nothing.
 *
 * This route forwards NO credential at all. It can only reach an endpoint the
 * gateway itself serves unauthenticated, so it cannot become an ambient key by
 * someone later pointing it at a scoped path: there is no key here to leak.
 */
app.get('/api/capabilities', async (_req, res) => {
  try {
    const upstream = await fetch(`${GATEWAY_URL}/capabilities`, {
      headers: { accept: 'application/json' },
    });
    const body = await upstream.text();
    res.status(upstream.status).type('application/json').send(body);
  } catch (err) {
    // 502 with the reason, not an empty list. An empty list here is
    // indistinguishable from a deployment that runs no agents.
    res.status(502).json({
      detail: `gateway unreachable at ${GATEWAY_URL} (${err instanceof Error ? err.message : String(err)})`,
    });
  }
});

/**
 * The live QC demo, for the signed-out landing page. Same reasoning as
 * /api/capabilities: no credential is forwarded, so it can only reach an
 * endpoint the gateway itself serves unauthenticated.
 *
 * Rate limiting lives on the gateway, where the CPU is actually spent. Adding a
 * second limiter here would only make the real one harder to reason about.
 */
app.get('/api/demo/qc', async (_req, res) => {
  try {
    const upstream = await fetch(`${GATEWAY_URL}/demo/qc`, {
      headers: { accept: 'application/json' },
    });
    const body = await upstream.text();
    res.status(upstream.status).type('application/json').send(body);
  } catch (err) {
    res.status(502).json({
      detail: `gateway unreachable at ${GATEWAY_URL} (${err instanceof Error ? err.message : String(err)})`,
    });
  }
});

app.get('/api/session', async (req, res) => {
  const key = readCookie(req, SESSION_COOKIE);
  if (!key) {
    res.status(401).json({ detail: 'not signed in', login_url: '/login' });
    return;
  }
  const resolved = await resolvePrincipal(key);
  if (resolved.status !== 200) {
    if (resolved.status === 401) clearSessionCookie(req, res);
    res.status(resolved.status).json({ detail: resolved.detail, login_url: '/login' });
    return;
  }
  res.json(resolved.principal);
});

/** Sign in: JSON `{access_key}` from the SPA, or the /login form post. */
app.post(
  '/api/session',
  express.json({ limit: '8kb' }),
  express.urlencoded({ extended: false, limit: '8kb' }),
  async (req, res) => {
    if (isCrossOrigin(req)) {
      res.status(403).json({ detail: 'cross-origin sign-in refused' });
      return;
    }
    const body = (req.body ?? {}) as Record<string, unknown>;
    const key = typeof body.access_key === 'string' ? body.access_key.trim() : '';
    if (!key) {
      res.status(400).json({ detail: 'access_key is required' });
      return;
    }
    const resolved = await resolvePrincipal(key);
    if (resolved.status !== 200) {
      const wantsHtml = (req.get('accept') ?? '').includes('text/html');
      if (wantsHtml) {
        res.status(resolved.status).type('html').send(loginPage(resolved.detail));
        return;
      }
      res.status(resolved.status).json({ detail: resolved.detail });
      return;
    }
    setSessionCookie(req, res, key);
    if ((req.get('accept') ?? '').includes('text/html')) {
      res.redirect(303, '/');
      return;
    }
    res.json(resolved.principal);
  },
);

/** Sign out. POST as well as DELETE so the plain HTML form can reach it. */
const signOut = (req: Request, res: ExpressResponse) => {
  clearSessionCookie(req, res);
  if ((req.get('accept') ?? '').includes('text/html')) {
    res.redirect(303, '/login');
    return;
  }
  res.json({ status: 'signed_out' });
};
app.delete('/api/session', signOut);
app.post('/api/logout', signOut);

/**
 * Transparent proxy to the gateway.
 *
 * Method, query, body and content type pass through; status and payload come
 * back untouched so the client's error handling sees exactly what the gateway
 * said. The only header added is the *session's* key — never a server key.
 */
app.use('/api/gw', express.raw({ type: '*/*', limit: MAX_UPLOAD_BYTES }), async (req, res) => {
  const sessionKey = readCookie(req, SESSION_COOKIE);
  if (!sessionKey) {
    // 401 before the request leaves the building. An anonymous visitor is not a
    // gateway client, whatever this server happens to have in its environment.
    res.status(401).json({ detail: 'not signed in', login_url: '/login' });
    return;
  }
  if (isCrossOrigin(req)) {
    res.status(403).json({ detail: 'cross-origin request refused' });
    return;
  }

  const target = `${GATEWAY_URL}${req.url}`;

  const headers: Record<string, string> = {};
  const contentType = req.get('content-type');
  // Multipart uploads must keep their boundary parameter intact.
  if (contentType) headers['content-type'] = contentType;
  const accept = req.get('accept');
  if (accept) headers.accept = accept;
  headers['X-API-Key'] = sessionKey;

  const hasBody = !['GET', 'HEAD'].includes(req.method);

  try {
    const upstream = await fetch(target, {
      method: req.method,
      headers,
      body: hasBody && Buffer.isBuffer(req.body) && req.body.length ? req.body : undefined,
    });

    const buf = Buffer.from(await upstream.arrayBuffer());
    if (upstream.status === 401) clearSessionCookie(req, res);
    res
      .status(upstream.status)
      .type(upstream.headers.get('content-type') ?? 'application/json')
      .send(buf);
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    res.status(502).json({ detail: `gateway unreachable at ${GATEWAY_URL} (${detail})` });
  }
});

// ---------------------------------------------------------------------------
// Sign-in page
// ---------------------------------------------------------------------------

/**
 * Server-rendered so the sign-in surface owes nothing to the SPA bundle: the
 * page a visitor sees before they are anybody should not be assembled by
 * application code that assumes they are somebody.
 */
function loginPage(error?: string): string {
  const message = error
    ? `<p class="err">${error.replace(/[<>&]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' })[c] as string)}</p>`
    : '';
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Sign in · GHARANA</title>
<style>
 /* The ONE place GHARANA Signal's values are repeated rather than imported.
    This page is a string rendered by Node before any bundle exists, so it
    cannot reach src/styles/tokens.css — there is no build step between here and
    the browser. Declared as custom properties anyway, so the duplication is a
    short list to reconcile rather than values scattered through the rules.
    Anything that CAN import the tokens must. */
 :root{
   --bg:#0a0a0a; --panel:#111111; --border:#1f1f1f;
   --text:#ffffff; --text-muted:#a1a1a1;
   --accent:#ccff00; --accent-on:#0a0a0a;  /* lime carries BLACK, always */
   --blocking:#ff3333;
 }
 body{background:var(--bg);color:var(--text);font:15px/1.5 Inter,ui-sans-serif,system-ui,sans-serif;
      display:flex;min-height:100vh;align-items:center;justify-content:center;margin:0}
 form{background:var(--panel);border:1px solid var(--border);border-radius:16px;padding:28px;width:min(420px,92vw)}
 h1{font-size:19px;margin:0 0 6px;letter-spacing:-0.02em}
 p{color:var(--text-muted);font-size:13px;margin:0 0 18px}
 .err{color:var(--blocking)}
 input{width:100%;box-sizing:border-box;background:var(--bg);color:var(--text);border:1px solid var(--border);
       border-radius:12px;padding:11px 13px;font:13px "JetBrains Mono",ui-monospace,monospace}
 input:focus{outline:none;border-color:var(--accent)}
 button{margin-top:14px;width:100%;background:var(--accent);color:var(--accent-on);border:0;border-radius:12px;
        padding:11px;font-weight:700;cursor:pointer;font-family:"JetBrains Mono",ui-monospace,monospace}
</style></head>
<body>
<form method="post" action="/api/session">
  <h1>GHARANA</h1>
  <p>Enter the access key you were issued. It is scoped to your own releases.</p>
  ${message}
  <input type="password" name="access_key" autocomplete="current-password"
         placeholder="access key" autofocus required>
  <button type="submit">Sign in</button>
</form>
</body></html>`;
}

app.get('/login', (req, res) => {
  if (readCookie(req, SESSION_COOKIE)) {
    res.redirect(303, '/');
    return;
  }
  res.type('html').send(loginPage());
});

/**
 * Send an unauthenticated visitor to /login instead of a console that will only
 * render errors. Document requests only — Vite's dev client, module graph and
 * the built assets must stay reachable, and none of them carry authority.
 *
 * THE LANDING PAGE IS PUBLIC, and that is the whole reason this is not simply
 * "no session, no page". `/` now serves marketing: what the agents do, what
 * they refuse to do, and a demonstration that measures audio in the visitor's
 * own browser. Redirecting that to a password prompt would hide the thing that
 * explains why anyone should hand us their masters.
 *
 * The console still requires a session. The SPA asks for it with `?app`, so the
 * split is one query parameter — and the decision stays here, on the server,
 * rather than in client code that an unauthenticated visitor is running.
 */
app.use((req, res, next) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') return next();
  if (!(req.get('accept') ?? '').includes('text/html')) return next();
  if (req.path === '/login' || req.path.startsWith('/api/')) return next();

  const wantsConsole = req.path !== '/' || 'app' in req.query;
  if (!wantsConsole) return next(); // public landing page

  if (readCookie(req, SESSION_COOKIE)) return next();
  res.redirect(303, '/login');
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`GHARANA console on :${PORT} -> gateway ${GATEWAY_URL} (sign in at /login)`);
    if (process.env.GHARANA_API_KEY) {
      console.warn(
        'GHARANA_API_KEY is set on the console and is deliberately ignored: the ' +
          'proxy forwards the signed-in caller\'s own key, never a server key. ' +
          'Set it on the gateway instead.',
      );
    }
  });
}

startServer();
