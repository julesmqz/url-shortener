# Proposal: Add Click Analytics (`link_click_details`)

## Why

The current URL shortener architecture maintains only a single aggregate counter (`clicks` integer) on the `links` table. While sufficient for high-level popularity counts, this has critical limitations for link creators:
1. **No Traffic Attribution**: Creators cannot see where traffic originated (e.g., whether clicks came from a Twitter/X post, LinkedIn, a search engine, or a direct link share).
2. **No Geographic Insights**: Creators cannot determine where in the world their audience resides (country, city).
3. **Bot Distortion**: Link preview crawlers (such as Slackbot, Twitterbot, Discordbot, and search engine spiders) trigger the redirect endpoint to fetch OpenGraph metadata. This inflates the total click count deceptively, making it impossible to separate real human visitors from automated crawlers.

By leveraging Cloudflare's edge-resolved metadata (`c.req.raw.cf`) and HTTP request headers (`Referer`, `User-Agent`), we can capture rich, privacy-preserving click telemetry directly at the edge with zero external analytics SaaS dependencies and zero client-side tracking scripts.

## What Changes

### 1. New Database Schema (`link_click_details`)
We introduce a dedicated relational table `link_click_details` in Cloudflare D1 with a foreign key to `links(id)`:
- `id`: INTEGER PRIMARY KEY AUTOINCREMENT
- `link_id`: INTEGER NOT NULL (FOREIGN KEY to `links.id` ON DELETE CASCADE)
- `clicked_at`: DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
- `country`: TEXT (ISO 3166-1 alpha-2 code from `cf.country`, e.g. "US", "GB", "DE")
- `city`: TEXT (Visitor city from `cf.city`, e.g. "Austin", "London", or "Unknown")
- `referer`: TEXT (Raw `Referer` header URL, or NULL for direct clicks)
- `referer_source`: TEXT (Normalized category: `twitter`, `linkedin`, `reddit`, `search`, `direct`, or `other`)
- `is_bot`: INTEGER NOT NULL DEFAULT 0 (1 if detected as bot, 0 for human visits)
- `bot_name`: TEXT (Identifier for known bots/crawlers, e.g. `twitterbot`, `slackbot`, or NULL)

Indexes will be created on `link_id` and `(link_id, clicked_at)` for fast aggregated queries.

### 2. Edge Telemetry Extraction & Non-Blocking Ingestion
When a visitor requests a short code via `GET /:code`:
- The Worker extracts `c.req.raw.cf` (country, city, verified bot status) and headers (`Referer`, `User-Agent`).
- The 302 HTTP redirect response is constructed and returned immediately.
- The insert into `link_click_details` and increment of `links.clicks` is scheduled via `c.executionCtx.waitUntil()`, ensuring the database write does not add latency to the user redirect.

### 3. Referrer Normalization
Incoming `Referer` header values are categorized:
- `t.co`, `x.com`, `twitter.com` → `twitter`
- `linkedin.com` → `linkedin`
- `reddit.com` → `reddit`
- `google.com`, `bing.com`, `duckduckgo.com` → `search`
- Empty / missing header → `direct`
- Other URLs → `other` (storing the origin host)

### 4. Bot Detection Strategy
A click is flagged as `is_bot = 1` if:
- Cloudflare's edge Bot Management identifies it (`c.req.raw.cf.botManagement.verifiedBot === true`), OR
- The `User-Agent` matches common crawler signatures (`Slackbot`, `Twitterbot`, `Discordbot`, `facebookexternalhit`, `LinkedInBot`, `Googlebot`, `bingbot`).
The specific bot name is saved to `bot_name` for transparent inspection.

### 5. Analytics UI & Reporting Route
- Introduce route `GET /links/:code/analytics` rendering a server-side HTML page (`hono/html`) with:
  - **Summary Metrics**: Total Clicks, Human Clicks, and Bot Crawls.
  - **Geographic Breakdown**: Table/list of Top Countries and Top Cities with click counts and percentages.
  - **Referrer Attribution**: Breakdown of traffic by source (`Direct`, `Twitter/X`, `LinkedIn`, etc.).
  - **Recent Clicks Feed**: Chronological list of the most recent click events showing timestamp, country, source, and bot flag.
- Update the main dashboard table (`GET /`) to include an "Analytics" link for each shortened URL.

## Non-Goals

- **No Raw IP Logging**: The visitor's IP address (`cf-connecting-ip`) will not be recorded in D1 to ensure compliance with privacy regulations (GDPR/ePrivacy) and avoid managing personal data.
- **No Third-Party Scripts**: No Google Analytics, cookies, or client-side JavaScript tracking tags.
- **No Heavy Client-Side Charts**: In keeping with the project architecture, analytics views will be server-rendered clean HTML/CSS tables and progress bars without frontend framework dependencies.
- **No Multi-Tenant Auth**: Analytics pages will be accessible for any valid short code (matching the current open access model of the shortener).

## Capabilities

### New Capabilities
- `click-analytics`: Captures granular per-click telemetry (geographic origin, referrer attribution, bot classification) into `link_click_details` and provides analytics query and visualization capabilities for shortened links.

### Modified Capabilities
*(None. The core `url-shortening` redirect contract and counter remain intact.)*

## Impact

- **Database**: Adds D1 migration `migrations/0002_add_link_click_details.sql` creating the table and indexes.
- **Server Routes**:
  - `GET /:code`: Enriched to parse telemetry and asynchronously insert into `link_click_details`.
  - `GET /links/:code/analytics`: New route querying aggregated metrics and rendering the analytics dashboard.
  - `GET /`: Updated to add an "Analytics" button/link in the links list.
- **Dependencies**: None. Implemented using standard TypeScript, Hono, and Cloudflare Workers runtime APIs.
- **Performance**: Zero redirect latency penalty due to `c.executionCtx.waitUntil()`.
