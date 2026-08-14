# GHARANA console — the artist-facing UI and its session proxy.
#
# Two artefacts come out of `npm run build` and both are needed at runtime:
#   dist/            the Vite-built SPA (static)
#   dist/server.mjs  the Express server, esbuild-bundled with --packages=external
#
# ESM, not CJS. The bundle was previously emitted as `dist/server.cjs`, and
# because CJS has no `import.meta`, esbuild compiled `import.meta.url` down to
# `undefined` — so `fileURLToPath(undefined)` threw on the first line of module
# init and the server never reached `listen`. Nothing caught it because `npm run
# dev` runs the TypeScript directly through tsx, which is ESM: the production
# entrypoint had never once been started. Keep the output ESM (package.json
# declares "type": "module") so dev and production agree on module semantics.
#
# `--packages=external` is why node_modules ships in the runtime stage: the
# bundle deliberately does not inline express/dotenv, so they must be installed
# where it runs. Production-only, so the build toolchain (vite, esbuild, tsx,
# typescript) does not become part of the attack surface of a deployed image.
#
# Build context is this repository's root. It used to be the MONOREPO root —
# the console lived at apps/console and every COPY carried that prefix — which
# is why the paths here are bare now. If you are diffing against the old
# Dockerfile, that prefix is the whole change.

# ---- build ------------------------------------------------------------------
FROM node:22-alpine AS build

WORKDIR /app

# Copied before the source so a source-only change does not re-resolve the
# dependency tree. `npm ci` and not `npm install`: the lockfile is the record of
# what was scanned in CI, and install is free to quietly resolve something else.
COPY package.json package-lock.json ./
RUN npm ci

COPY . ./
RUN npm run build

# ---- runtime ----------------------------------------------------------------
FROM node:22-alpine AS runtime

WORKDIR /app
ENV NODE_ENV=production

COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Drop npm itself. The node base image bundles npm's own vendored dependency
# tree, and trivy reports it — brace-expansion, ip-address, picomatch, sigstore
# and tar all carried HIGH advisories with no way to upgrade them independently
# of the npm release. Nothing installs a package after build, so npm in a
# runtime image is only a tool for whoever gets a shell.
RUN rm -rf /usr/local/lib/node_modules/npm /usr/local/bin/npm /usr/local/bin/npx

COPY --from=build /app/dist ./dist

# Drop root. The console handles session cookies and proxies authenticated
# traffic; there is no reason for it to be able to write its own image.
USER node

EXPOSE 3000
ENV PORT=3000

# The server serves dist/ statically in production and never starts Vite, so
# NODE_ENV=production above is load-bearing rather than decorative.
CMD ["node", "dist/server.mjs"]
