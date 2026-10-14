# Proposal: Add Click Analytics (`link_click_details`)

## Why

The current URL shortener only tracks a single aggregate integer counter of total clicks on the `links` table. Link creators have no visibility into where their visitors are coming from, what platforms are referring traffic, or how many clicks are actually automated bots (such as Slack, Twitter, or Discord link preview crawlers) versus real human visits.

Capturing edge-resolved metadata from Cloudflare allows for rich, privacy-conscious click insights without adding third-party tracking scripts, cookies, or client-side overhead.

## What Changes

- **New D1 Table `link_click_details`**: Create a relational click event table linked to `links(id)` to record granular click occurrences.
- **Geographic Capture**: Extract visitor country (ISO-2 code) and city from Cloudflare edge properties (`c.req.raw.cf.country`, `c.req.raw.cf.city`).
- **Referrer Attribution**: Capture and normalize incoming `Referer` headers to identify traffic sources (e.g., Twitter/X, LinkedIn, Reddit, search engines, or Direct navigation).
- **Bot Detection & Filtering**: Detect and flag automated traffic using Cloudflare bot signals (`cf.botManagement.verifiedBot`) and common crawler/link-preview User-Agents, enabling distinction between human clicks and crawler hits.
- **Non-Blocking Ingestion**: Persist click details via `executionCtx.waitUntil()` so the visitor's HTTP 302 redirection remains instantaneous without database write latency overhead.
- **Analytics Visibility**: Provide a view/breakdown for link creators to inspect geographic distribution, top referrers, and bot-vs-human ratios.

### Non-Goals

- Storing raw client IP addresses or personal fingerprinting (privacy-first design adhering to GDPR principles).
- Complex real-time streaming pipelines or external OLAP warehouses (D1 SQLite is sufficient for this stage).
- Heavy client-side charting libraries (focus on server-rendered HTML breakdowns matching project conventions).

## Capabilities

### New Capabilities
- `click-analytics`: Captures granular per-click telemetry (geographic origin, referrer attribution, bot classification) into `link_click_details` and provides analytics query and display capabilities for shortened links.

### Modified Capabilities
*(None. The core `url-shortening` redirect contract and counter remain intact.)*

## Impact

- **Database**: Adds a new D1 migration (e.g., `migrations/0002_add_link_click_details.sql`) creating `link_click_details` with foreign key cascade and index on `link_id` and `clicked_at`.
- **Worker Runtime**: `GET /:code` redirect handler will read `c.req.raw.cf` and headers, scheduling an async D1 insert with `c.executionCtx.waitUntil()`.
- **UI / Routes**: Adds route/view to show the analytics breakdown for a link.
