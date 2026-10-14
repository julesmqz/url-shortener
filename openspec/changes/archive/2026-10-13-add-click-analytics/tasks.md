# Tasks: Add Click Analytics (`link_click_details`)

## 1. Database and Persistence

- [x] 1.1 Create D1 migration file `migrations/0002_add_link_click_details.sql` defining `link_click_details` table with foreign key cascade to `links(id)` and index on `(link_id, clicked_at)`, verifying SQL syntax against SQLite D1 requirements
- [x] 1.2 Apply migration to local D1 SQLite database with `npx wrangler d1 migrations apply DB --local` and verify the table and indexes exist

## 2. Telemetry and Classification Utilities

- [x] 2.1 Implement `parseRefererSource` helper in TypeScript to normalize referrers into `twitter`, `linkedin`, `reddit`, `search`, `direct`, or `other`, verifying against simulated referrer URLs
- [x] 2.2 Implement `detectBot` helper in TypeScript evaluating `c.req.raw.cf.botManagement.verifiedBot` and crawler User-Agents (`Slackbot`, `Twitterbot`, `Discordbot`, `facebookexternalhit`, `LinkedInBot`, `Googlebot`), verifying bot detection against sample headers

## 3. Server Routes and Asynchronous Ingestion

- [x] 3.1 Update `GET /:code` redirect handler to extract geo metadata (`country`, `city`), referrer, and bot status, scheduling an async D1 insert via `c.executionCtx.waitUntil()` without blocking the HTTP 302 response
- [x] 3.2 Implement analytics data retrieval helpers querying total clicks, human vs bot counts, top countries, top referrers, and recent click events from D1
- [x] 3.3 Implement `GET /links/:code/analytics` route handler returning 404 for non-existent short codes and serving the analytics page for valid short codes

## 4. User Interface and Dashboard Integration

- [x] 4.1 Implement server-rendered HTML analytics template using `hono/html` displaying summary metric cards, top countries breakdown, top referrers breakdown, and recent click history feed
- [x] 4.2 Update the root dashboard template (`GET /`) to include an "Analytics" action button/link for each shortened URL in the links table
- [x] 4.3 Verify end-to-end functionality locally with `npx wrangler dev`, confirming click logging, bot/human categorization, referrer attribution, and UI analytics rendering
