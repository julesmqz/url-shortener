# Tasks: URL Shortener Implementation

## 1. Infrastructure and Setup

- [x] 1.1 Install dependencies (`hono`, `nanoid`, `@cloudflare/workers-types`, `wrangler`) and verify `npm install` completes successfully and `package.json` is updated
- [x] 1.2 Configure `wrangler.jsonc` with Cloudflare Worker settings and D1 binding (`DB`), verifying type generation with `npx wrangler types`

## 2. Database Schema and Persistence

- [x] 2.1 Create D1 migration file `migrations/0001_init.sql` for the `links` table with `id`, `short_code`, `original_url`, `clicks`, and `created_at`
- [x] 2.2 Apply D1 migrations to local SQLite environment using `npx wrangler d1 migrations apply DB --local` and verify table existence

## 3. Server Logic and Routes

- [x] 3.1 Implement server-side URL validation logic restricting input to valid `http:` and `https:` URLs and rejecting invalid/empty inputs
- [x] 3.2 Implement nanoid short code generation with a 3-attempt database collision retry mechanism
- [x] 3.3 Implement redirect handler `GET /:code` issuing HTTP 302 to destination URL and atomically incrementing the click counter in D1
- [x] 3.4 Implement custom plain HTML 404 error page for non-existent short codes and unmatched paths returning HTTP 404 status

## 4. User Interface and Dashboard

- [x] 4.1 Implement HTML dashboard template using `hono/html` featuring link creation form, error notification alert, and links table
- [x] 4.2 Implement `GET /` route handler querying all links from D1 and rendering the dashboard page
- [x] 4.3 Implement `POST /links` form submission handler processing URL creation and re-rendering dashboard with validation errors or created link
- [x] 4.4 Verify end-to-end functionality locally using `npx wrangler dev`, testing creation, 302 redirection, click count increment, and 404 handling
