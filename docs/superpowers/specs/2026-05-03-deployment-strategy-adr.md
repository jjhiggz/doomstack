# ADR: Deployment Strategy

**Status:** Accepted
**Date:** 2026-05-03

## Context

The app is a monorepo with a separate frontend (`apps/web/`, TanStack Start) and backend (`apps/backend/`, Hono + oRPC). Since they deploy as independent services, we considered whether **API version skew** — where the frontend and backend run different versions of the shared contract — is a risk that needs mitigation.

## Decision

**Deploy atomically. Don't solve version skew.**

The monorepo structure already supports atomic deploys (all services rebuild and deploy from the same commit) on any PaaS that supports multi-service monorepos (Railway, Fly.io, Coolify, SST). Because both sides always run the same version of `@repo/shared`, the contract is never out of sync.

## Key Points

- **Atomic deploy ≠ single process.** Each service runs independently and can scale independently (different instance counts, CPU, memory). "Atomic" means they deploy together from the same commit, not that they share a runtime.
- **Rolling deploy window is negligible.** During a deploy, old instances drain in-flight requests while new instances take over. This is seconds, handled by platform-level graceful shutdown.
- **No API versioning needed.** Versioned endpoints (`/rpc/v1/`, `/rpc/v2/`) add operational complexity for a problem that doesn't exist with atomic deploys.
- **No contract testing needed yet.** Automated breaking-change detection is valuable when multiple independently-deployed consumers exist. With one frontend and one backend deploying together, TypeScript compilation already catches contract mismatches.
- **`@repo/shared` is the contract.** Schemas (`SRow_Todo`, `SIn_D_*`, `SOut_D_*`), error classes (`E_*`), and inferred types (`IRow_Todo`) define the wire format. Both sides import from this package, so any breaking change fails typecheck before it can deploy.

## Platform Compatibility

| Platform | Atomic monorepo deploys | Independent scaling | Notes |
|----------|------------------------|-------------------|-------|
| Railway | Yes | Yes | Native monorepo support |
| Fly.io | Yes | Yes | Via `fly.toml` per service |
| Coolify / SST | Yes | Yes | Self-hosted option |
| Vercel | Frontend only | N/A | Backend needs a separate host; atomic deploy requires CI coordination |
| Cloudflare Workers | Possible | Yes | V8 runtime, not Node — some deps need adapters |

## When to Revisit

- **Multiple independently-deployed clients** (mobile app, third-party API consumer) — version skew becomes real, consider backwards-compatible schema conventions or API versioning
- **Separate repos** — if frontend/backend ever split into separate repos, atomic deploys are lost and contract testing becomes necessary
