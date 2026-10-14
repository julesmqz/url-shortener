## Purpose

Provides granular click telemetry recording, traffic attribution, bot filtering, and analytics reporting for shortened links.

## ADDED Requirements

### Requirement: Granular click telemetry recording
The system SHALL record an individual click event in `link_click_details` for each incoming redirect request on an existing short code, capturing geographic metadata (country and city) resolved by Cloudflare's edge runtime, along with the timestamp and foreign key link ID.

#### Scenario: Recording click with complete Cloudflare geo metadata
- **WHEN** client visits an existing short link `/abc123` from country "US" and city "Austin"
- **THEN** system asynchronously records a new record in `link_click_details` with `country = "US"`, `city = "Austin"`, and the current timestamp without delaying the HTTP 302 response

#### Scenario: Recording click when Cloudflare geo metadata is absent or partial
- **WHEN** client visits an existing short link `/abc123` and Cloudflare edge metadata omits city or country
- **THEN** system records the click event with fallback values "Unknown" or NULL without failing the redirect request

### Requirement: Referrer attribution and classification
The system SHALL extract the incoming HTTP `Referer` header and normalize it into standardized traffic source categories (`twitter`, `linkedin`, `reddit`, `search`, `direct`, or `other`).

#### Scenario: Click referred from social platform
- **WHEN** request arrives with `Referer` header "https://t.co/xyz789"
- **THEN** system persists the raw referer and sets `referer_source = "twitter"`

#### Scenario: Direct navigation without referer
- **WHEN** request arrives with no `Referer` header or an empty string
- **THEN** system sets `referer = NULL` and `referer_source = "direct"`

#### Scenario: Click referred from search engine
- **WHEN** request arrives with `Referer` header "https://www.google.com/"
- **THEN** system persists the raw referer and sets `referer_source = "search"`

### Requirement: Bot detection and classification
The system SHALL identify automated requests, link-preview crawlers, and search engine spiders using Cloudflare verified bot detection and User-Agent signature matching, tagging the click record with `is_bot = 1` and recording the detected bot identifier.

#### Scenario: Link preview crawler hit
- **WHEN** a request arrives with User-Agent containing "Slackbot-LinkExpanding" or "Twitterbot/1.0"
- **THEN** system flags `is_bot = 1`, records `bot_name = "slackbot"` (or `"twitterbot"`), and saves the record in `link_click_details`

#### Scenario: Verified Cloudflare bot detection
- **WHEN** request arrives with `cf.botManagement.verifiedBot = true`
- **THEN** system records `is_bot = 1` and populates the bot record accordingly

#### Scenario: Standard human visitor
- **WHEN** request arrives from a standard desktop or mobile web browser with no bot signatures
- **THEN** system records `is_bot = 0` and `bot_name = NULL`

### Requirement: Non-blocking asynchronous ingestion
The system SHALL execute the analytics ingestion asynchronously using `c.executionCtx.waitUntil()` so that database insertion does not increase HTTP 302 redirection latency.

#### Scenario: Asynchronous persistence during redirect
- **WHEN** visitor hits a valid short code `/abc123`
- **THEN** system immediately returns HTTP 302 with Location header while scheduling D1 persistence in the execution context background task

### Requirement: Link analytics dashboard view
The system SHALL provide an HTML analytics view at `GET /links/:code/analytics` displaying summary metrics (total clicks, human visits, bot crawls), geographic distributions, referrer source breakdowns, and a recent click activity feed for the specified short link.

#### Scenario: Viewing analytics for an existing short link
- **WHEN** user navigates to `/links/abc123/analytics` for a link that has recorded click events
- **THEN** system renders an HTML page showing total clicks, human vs bot counts, top countries, top referrers, and recent click events

#### Scenario: Viewing analytics for a link with no click history
- **WHEN** user navigates to `/links/emptyCode/analytics` for a link that has 0 clicks
- **THEN** system renders the analytics page indicating no clicks have been recorded yet with empty-state indicators

#### Scenario: Viewing analytics for non-existent short code
- **WHEN** user requests `/links/nonExistent/analytics`
- **THEN** system responds with HTTP 404 status and the standard 404 error page
