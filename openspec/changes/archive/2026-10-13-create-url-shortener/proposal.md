# Proposal: Create URL Shortener

## Why

Sharing long, unwieldy URLs is cumbersome and lacks analytics. A lightweight, self-hosted link shortener enables users to generate compact short codes, reliably redirect visitors, track click metrics, and browse generated links with zero external SaaS dependencies.

## What Changes

- Add URL shortening functionality allowing users to submit an HTTP/HTTPS URL and receive an alphanumeric short code (e.g. `/abc123`).
- Implement nanoid-based short code generation with a 3-attempt collision retry strategy.
- Add HTTP 302 redirection for short codes to target URLs while incrementing click counters in Cloudflare D1.
- Provide a clean, server-rendered HTML UI (using `hono/html`) displaying the submission form, validation errors, and a table of all shortened links with click counts.
- Add a custom plain HTML 404 page for unknown short codes or unmapped routes.
- Configure Cloudflare D1 database schema and migrations for persistence surviving application restarts.
- Configure local development tooling via `wrangler dev`.

## Capabilities

### New Capabilities
- `url-shortening`: Core URL shortening service including URL validation, collision-resistant nanoid short code generation, HTTP 302 redirection with atomic click tracking, server-rendered listing and submission UI, and plain HTML 404 error handling.

### Modified Capabilities
*(None - initial greenfield capability)*

## Non-goals

- User authentication, authorization, or multi-tenant accounts.
- Custom vanity alias editing by the user (fixed nanoid short codes only).
- Advanced analytics (e.g., referrer logging, geo-location, browser user-agent tracking).
- Expiration dates or automatic link archiving.
- Single-page application (SPA) client frameworks (React, Vue) or complex bundlers.

## Impact

- **Infrastructure / Runtime**: Cloudflare Workers with Wrangler CLI.
- **Persistence**: Cloudflare D1 database (`wrangler.jsonc` binding and migration files).
- **Dependencies**: `hono`, `nanoid`, `@cloudflare/workers-types`, `wrangler`.
- **APIs & Routes**:
  - `GET /`: Serves link creation form and dashboard listing.
  - `POST /links`: Handles form submissions, validates long URLs, creates short codes, and reloads/redirects to `/`.
  - `GET /:code`: Resolves code, increments click count, and issues HTTP 302 redirect (or 404 if not found).
