# Design: URL Shortener

## Context

See [proposal.md](file:///Volumes/PNY1TB/Workspace/url-shortener/openspec/changes/create-url-shortener/proposal.md) for business motivation and high-level scope.
The project is a greenfield TypeScript application deployed on Cloudflare Workers using Hono and Cloudflare D1 for SQLite persistence, managed locally through Wrangler.

## Goals / Non-Goals

**Goals:**
- Provide a robust, self-contained architecture for URL shortening and redirection without external database services.
- Guarantee click counting accuracy by preventing client-side redirect caching.
- Deliver an intuitive UI using zero-build server-side rendering (`hono/html`) with traditional form POST.
- Provide predictable error handling and validation for malformed inputs and unknown routes.

**Non-Goals:**
- High-volume asynchronous click queuing (standard transactional D1 updates are sufficient).
- User session authentication or multi-tenant namespaces.
- Complex client-side JavaScript builds or bundlers.

## Decisions

### 1. Web Framework: Hono
- **Decision**: Use `hono` with Cloudflare Workers fetch handler bindings.
- **Rationale**: Hono is lightweight (<15KB), natively designed for Cloudflare Workers, has top-tier TypeScript ergonomics, and includes a built-in JSX/HTML template helper (`hono/html`).
- **Alternatives Considered**: Bare `fetch` handler (too much manual routing boilerplate), Express/Fastify (incompatible with Cloudflare Workers runtime).

### 2. Persistence: Cloudflare D1 (SQLite) with Migrations
- **Decision**: Use Cloudflare D1 with a versioned migration directory (`migrations/0001_init.sql`).
- **Schema**:
  ```sql
  CREATE TABLE IF NOT EXISTS links (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    short_code TEXT NOT NULL UNIQUE,
    original_url TEXT NOT NULL,
    clicks INTEGER NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE UNIQUE INDEX IF NOT EXISTS idx_links_short_code ON links(short_code);
  ```
- **Rationale**: Cloudflare D1 provides persistent SQLite storage locally (via Miniflare/Wrangler) and at the edge without external connection management.
- **Alternatives Considered**: KV (eventually consistent, unsuitable for immediate atomic click increments without race conditions).

### 3. Short Code Generation: `nanoid` with 3x Retry Collision System
- **Decision**: Use `customAlphabet` from `nanoid` (`0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ`, length 6-8) with up to 3 retry attempts on database insertion conflicts.
- **Mechanism**:
  ```typescript
  for (let attempt = 0; attempt < 3; attempt++) {
    const code = generateNanoid(6);
    try {
      await db.prepare('INSERT INTO links (short_code, original_url) VALUES (?, ?)').bind(code, url).run();
      return code;
    } catch (err) {
      if (attempt === 2) throw err;
    }
  }
  ```
- **Rationale**: Fast, cryptographically sound, and practically collision-free while explicitly guarding against rare collisions.

### 4. Redirection Strategy: HTTP 302 Found
- **Decision**: Issue HTTP `302 Found` responses on `GET /:code`.
- **Rationale**: Browsers cache `301 Moved Permanently` indefinitely, which bypasses subsequent redirect calls and breaks click metrics. HTTP 302 ensures the browser hits the Cloudflare Worker on every single click.
- **Alternatives Considered**: HTTP 301 (breaks analytics), HTTP 307 (preserves method; 302 is the industry standard for shorteners).

### 5. UI and Error Presentation: `hono/html` & Plain HTML 404
- **Decision**: Render pages with `hono/html` template literals.
  - Form POST to `/links` processes the URL. On success or validation error, it re-renders the dashboard with status alerts.
  - Non-existent short codes or unknown routes render a standalone, styled plain HTML 404 page.
- **Rationale**: Eliminates build-step dependencies (Vite, React, Webpack) and provides instant page loads.

## Risks / Trade-offs

- **[Code Collision]** → Mitigated by 6-character Base62 space (~56 billion permutations) plus a strict 3-attempt insertion retry loop.
- **[Browser Cache Bypassing Analytics]** → Mitigated by returning `302 Found` instead of `301 Moved Permanently`.
- **[Self-Referencing Redirection Loops]** → Mitigated by server-side validation rejecting URLs whose host matches the current application host.
- **[SQL Injection]** → Mitigated by parameterized queries using `db.prepare().bind()`.

## Migration Plan

1. Create `wrangler.jsonc` with Cloudflare D1 binding named `DB`.
2. Generate migration file `migrations/0001_init.sql`.
3. Apply migration locally: `npx wrangler d1 migrations apply DB --local`.
4. Run locally with `npx wrangler dev`.
