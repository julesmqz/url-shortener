# Design: Add Click Analytics (`link_click_details`)

## Context

See [proposal.md](file:///Volumes/PNY1TB/Workspace/url-shortener/openspec/changes/add-click-analytics/proposal.md) for business motivation and [spec.md](file:///Volumes/PNY1TB/Workspace/url-shortener/openspec/changes/add-click-analytics/specs/click-analytics/spec.md) for behavioral requirements.
The current application runs on Cloudflare Workers using Hono and Cloudflare D1 with an existing `links` table storing `id`, `short_code`, `original_url`, `clicks`, and `created_at`.

## Goals / Non-Goals

**Goals:**
- Provide a non-blocking ingestion path for click telemetry using `c.executionCtx.waitUntil()`.
- Record granular click events into a new D1 table `link_click_details` linked to `links(id)`.
- Classify traffic by geographic origin (`country`, `city`), referrer platform, and bot status.
- Render a server-side HTML analytics view at `GET /links/:code/analytics` showing summary metrics, geographic breakdown, referrer breakdown, and recent clicks.

**Non-Goals:**
- Client-side JavaScript charting libraries (server-rendered HTML tables and CSS percentage bars are used instead).
- PII / IP address logging.
- Heavy user-agent parsing libraries (a focused, lightweight in-memory matcher is used).

## Decisions

### 1. Persistence Model: D1 Relational Migration (`link_click_details`)
- **Decision**: Add migration `migrations/0002_add_link_click_details.sql`:
  ```sql
  CREATE TABLE IF NOT EXISTS link_click_details (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    link_id INTEGER NOT NULL,
    country TEXT,
    city TEXT,
    referer TEXT,
    referer_source TEXT NOT NULL DEFAULT 'direct',
    is_bot INTEGER NOT NULL DEFAULT 0,
    bot_name TEXT,
    clicked_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (link_id) REFERENCES links(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_link_click_details_link_id ON link_click_details(link_id);
  CREATE INDEX IF NOT EXISTS idx_link_click_details_link_clicked ON link_click_details(link_id, clicked_at DESC);
  ```
- **Rationale**: Keeps the architecture unified within Cloudflare D1 (SQLite), supports cascading deletes when links are removed, and enables efficient SQL aggregations.
- **Alternatives Considered**: Cloudflare Workers Analytics Engine (not supported in local Miniflare testing; requires paid cloud tier).

### 2. Ingestion Strategy: Zero-Latency Redirect via `ctx.waitUntil()`
- **Decision**: Execute both the `link_click_details` insertion and the `links.clicks` increment inside `c.executionCtx.waitUntil()`:
  ```typescript
  c.executionCtx.waitUntil((async () => {
    await db.batch([
      db.prepare(`UPDATE links SET clicks = clicks + 1 WHERE id = ?`).bind(link.id),
      db.prepare(`
        INSERT INTO link_click_details (link_id, country, city, referer, referer_source, is_bot, bot_name)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).bind(link.id, country, city, referer, refererSource, isBot ? 1 : 0, botName)
    ]);
  })());
  return c.redirect(link.original_url, 302);
  ```
- **Rationale**: Immediate HTTP 302 response (<2ms). The Cloudflare Worker runtime keeps the execution context alive until background promises resolve.
- **Alternatives Considered**: Awaiting database writes before redirecting (adds 10–30ms of perceptible latency to the redirect).

### 3. Referrer and Bot Detection Heuristics
- **Decision**: Implement lightweight helper functions:
  - `parseRefererSource(referer: string | undefined): string`: Checks domain for `t.co`, `x.com`, `twitter.com`, `linkedin.com`, `reddit.com`, search engines (`google`, `bing`, `duckduckgo`), or defaults to `direct` or `other`.
  - `detectBot(cf: IncomingRequestCfProperties | undefined, userAgent: string | undefined): { isBot: boolean, botName: string | null }`: Checks `cf?.botManagement?.verifiedBot` and common link crawler patterns (`Slackbot`, `Twitterbot`, `Discordbot`, `facebookexternalhit`, `LinkedInBot`, `Googlebot`, `bingbot`).
- **Rationale**: Adds 0KB of npm dependencies, executes in microseconds, and handles >95% of typical short link crawler traffic.

### 4. Analytics Reporting & Query Pattern
- **Decision**: In `GET /links/:code/analytics`, run optimized batch/parallel SQL queries against D1:
  - Overall counts: `COUNT(*) as total`, `SUM(CASE WHEN is_bot = 0 THEN 1 ELSE 0 END) as human`, `SUM(CASE WHEN is_bot = 1 THEN 1 ELSE 0 END) as bot`.
  - Top countries: `SELECT country, COUNT(*) as count FROM link_click_details WHERE link_id = ? GROUP BY country ORDER BY count DESC LIMIT 5`.
  - Top referrers: `SELECT referer_source, COUNT(*) as count FROM link_click_details WHERE link_id = ? GROUP BY referer_source ORDER BY count DESC`.
  - Recent click feed: `SELECT * FROM link_click_details WHERE link_id = ? ORDER BY clicked_at DESC LIMIT 10`.
- **Rationale**: SQLite handles these grouped queries in sub-millisecond time for thousands of rows per link.

## Risks / Trade-offs

- **[Local Development Missing CF Geo Properties]** → In `wrangler dev` (local Miniflare), `c.req.raw.cf` may be undefined or empty.
  - *Mitigation*: Fall back gracefully to `country = "Unknown"`, `city = "Unknown"` without throwing errors.
- **[High Click Volume D1 Growth]** → Millions of clicks per link could increase D1 storage.
  - *Mitigation*: Proper indexing on `(link_id, clicked_at DESC)` ensures queries remain fast; `ON DELETE CASCADE` cleanly purges clicks when a link is deleted.
- **[Redirect Loop / Self Referrer]** → Requests originating from the shortener itself.
  - *Mitigation*: Referrer parser identifies internal host and flags appropriately.

## Migration Plan

1. Create migration file `migrations/0002_add_link_click_details.sql`.
2. Apply locally with `npx wrangler d1 migrations apply DB --local`.
3. Verify backward compatibility: existing links and counters operate without interruption.
