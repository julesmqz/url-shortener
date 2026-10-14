# Edge URL Shortener & Analytics

## Project Timestamps

| Event | Commit Hash | Timestamp (ISO / Local) |
|---|---|---|
| **Start Time** (First Commit) | `8b2d89262278eee1aa4b3b09923ad8fd66fce25c` | `2026-10-13 17:16:42 -0600` (Tue Oct 13 17:16:42 2026) |
| **End Time** (Target Commit) | `967664d1bd29e77367d1ca783fe4f8a6631aca5d` | `2026-10-13 18:08:04 -0600` (Tue Oct 13 18:08:04 2026) |
| **Elapsed Duration** | — | **51 minutes, 22 seconds** |

---

## Overview

A lightweight, high-performance URL shortener and telemetry analytics engine running at the edge with **Cloudflare Workers**, **Hono**, and **Cloudflare D1** (serverless SQLite at edge).

### Key Features
- **URL Shortening & Validation**: Generates collision-resistant 6-character Base62 alphanumeric codes using `nanoid` with automatic retry logic. Strictly validates HTTP/HTTPS targets.
- **Fast 302 Redirection**: Edge-level HTTP 302 redirects with instant response times.
- **Non-Blocking Telemetry Ingestion**: Uses Cloudflare Worker `c.executionCtx.waitUntil()` to persist granular click records in D1 asynchronously, preventing database writes from blocking user redirects.
- **Bot & Crawler Filtering**: Automatically distinguishes human visitors from crawlers/social link preview bots (`Slackbot`, `Twitterbot`, `Discordbot`, `facebookexternalhit`, `LinkedInBot`, `Googlebot`, etc.) or Cloudflare verified bots.
- **Referrer Attribution**: Parses and groups incoming referrers into categories: `twitter`, `linkedin`, `reddit`, `search`, `direct`, or `other`.
- **Geographic Insights**: Captures edge country (`cf-ipcountry`) and city telemetry for each click event.
- **Full Server-Rendered UI**: Responsive dashboard for link creation, click metrics overview, individual link analytics dashboards, and custom 404 pages using `hono/html`.

---

## Instructions to Run

### 1. Prerequisites
- **Node.js**: v18.0.0 or higher (v20+ recommended)
- **npm**: v9.0.0 or higher

### 2. Install Dependencies
Clone the repository and install dependencies:
```bash
npm install
```

### 3. Apply Local Database Migrations
Initialize the local Cloudflare D1 SQLite database schema:
```bash
npm run migrate:local
```
*(Alternative command: `npx wrangler d1 migrations apply DB --local`)*

This applies:
- `migrations/0001_init.sql` (Creates the `links` table)
- `migrations/0002_add_link_click_details.sql` (Creates `link_click_details` table and indexes)

### 4. Start Local Development Server
Launch the Cloudflare Workers local runtime using Wrangler:
```bash
npm run dev
```
*(Alternative command: `npx wrangler dev`)*

The application will be running locally at:
👉 **`http://localhost:8787`**

### 5. Build Verification (Optional)
To verify TypeScript compilation:
```bash
npm run build
```

---

## Usage & Verification

### Web Dashboard
1. Open [http://localhost:8787](http://localhost:8787) in your browser.
2. Enter a destination URL (e.g., `https://news.ycombinator.com`) and submit.
3. The table lists all created short links with their generated short code, target URL, total click count, creation timestamp, and an **Analytics** action button.
4. Click on any short link (`http://localhost:8787/<short_code>`) to trigger a 302 redirect.
5. Click the **Analytics** button or visit `http://localhost:8787/links/<short_code>/analytics` to view detailed telemetry metrics:
   - Total clicks, human vs. bot breakdown
   - Top referrers breakdown with percentages
   - Top geographic locations (countries)
   - Recent click activity log with timestamp, referrer, bot flag, and location

### Command Line / cURL Testing

**1. Create a Short Link via POST:**
```bash
curl -i -X POST http://localhost:8787/links \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "url=https://github.com"
```

**2. Follow or Inspect Redirection (HTTP 302):**
```bash
curl -i http://localhost:8787/<short_code>
```

**3. Simulate Bot Traffic (e.g., Slackbot preview):**
```bash
curl -i -A "Slackbot-LinkExpanding 1.0 (+https://api.slack.com/robots)" \
  http://localhost:8787/<short_code>
```

**4. Simulate Social Referrer (e.g., Twitter):**
```bash
curl -i -H "Referer: https://t.co/xyz123" \
  http://localhost:8787/<short_code>
```

**5. View Analytics Dashboard:**
```bash
curl -i http://localhost:8787/links/<short_code>/analytics
```

---

## Database Schema

### `links`
| Column | Type | Description |
|---|---|---|
| `id` | `INTEGER PRIMARY KEY AUTOINCREMENT` | Primary key |
| `short_code` | `TEXT UNIQUE NOT NULL` | 6-character Base62 alphanumeric slug |
| `original_url` | `TEXT NOT NULL` | Validated target HTTP/HTTPS URL |
| `clicks` | `INTEGER DEFAULT 0` | Aggregate click counter |
| `created_at` | `DATETIME DEFAULT CURRENT_TIMESTAMP` | Link creation timestamp |

### `link_click_details`
| Column | Type | Description |
|---|---|---|
| `id` | `INTEGER PRIMARY KEY AUTOINCREMENT` | Primary key |
| `link_id` | `INTEGER NOT NULL` | Foreign key referencing `links(id)` ON DELETE CASCADE |
| `country` | `TEXT` | Edge country code (e.g. `US`, `MX`) |
| `city` | `TEXT` | Edge city name |
| `referer` | `TEXT` | Raw HTTP Referer header |
| `referer_source` | `TEXT NOT NULL DEFAULT 'direct'` | Normalized category (`twitter`, `linkedin`, `reddit`, `search`, `direct`, `other`) |
| `is_bot` | `INTEGER NOT NULL DEFAULT 0` | `1` for bot/crawler, `0` for human |
| `bot_name` | `TEXT` | Identified crawler name or `verified-bot` |
| `clicked_at` | `DATETIME DEFAULT CURRENT_TIMESTAMP` | Click event timestamp |

---

## Tech Stack
- **Runtime**: [Cloudflare Workers](https://workers.cloudflare.com/)
- **Web Framework**: [Hono](https://hono.dev/)
- **Database**: [Cloudflare D1](https://developers.cloudflare.com/d1/) (SQLite)
- **ID Generation**: [nanoid](https://github.com/ai/nanoid) (custom Base62 alphabet)
- **Language**: TypeScript
- **Tooling**: Wrangler CLI, OpenSpec

## MY ADDED FEATURE

I decided to add extended analytics since cloudflare has a lot of data already collected that can serve us for new
features in the future after analysis and consideration. Also, it seems like a quick win since the implementation
was not too complex. 

## What to do next with more time

Implement a testing suite for unit tests.
Implement a pipeline for CI/CD.
Fixed a bug where refreshing main screen after shorten a link caused to duplicate it.
Analyzed the data collected to identify potential areas for improvement and new features.