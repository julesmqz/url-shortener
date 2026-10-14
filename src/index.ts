import { Hono } from 'hono';
import { validateUrl } from './validation';
import { createShortLink, getAllLinks, getLinkByCode, recordClickDetail, getLinkAnalytics } from './db';
import { renderDashboard, renderNotFoundPage, renderAnalyticsPage } from './views';
import { parseRefererSource, detectBot } from './analytics';

type Bindings = {
  DB: D1Database;
};

const app = new Hono<{ Bindings: Bindings }>();

// 1. Dashboard: Display form and link list
app.get('/', async (c) => {
  const links = await getAllLinks(c.env.DB);
  const origin = new URL(c.req.url).origin;
  return c.html(renderDashboard({ links, origin }));
});

// 2. Shorten link: Handle classic HTML form POST
app.post('/links', async (c) => {
  const body = await c.req.parseBody();
  const rawUrl = typeof body['url'] === 'string' ? body['url'] : '';
  const origin = new URL(c.req.url).origin;

  const validation = validateUrl(rawUrl);
  if (!validation.valid) {
    const links = await getAllLinks(c.env.DB);
    return c.html(
      renderDashboard({
        links,
        origin,
        error: validation.error,
        previousUrl: rawUrl,
      }),
      400
    );
  }

  try {
    const code = await createShortLink(c.env.DB, validation.url);
    const links = await getAllLinks(c.env.DB);
    return c.html(
      renderDashboard({
        links,
        origin,
        successCode: code,
      }),
      201
    );
  } catch (err: unknown) {
    const links = await getAllLinks(c.env.DB);
    const message = err instanceof Error ? err.message : 'An error occurred while creating the short link.';
    return c.html(
      renderDashboard({
        links,
        origin,
        error: message,
        previousUrl: rawUrl,
      }),
      500
    );
  }
});

// 3. Analytics view for a specific short link
app.get('/links/:code/analytics', async (c) => {
  const code = c.req.param('code');

  const analytics = await getLinkAnalytics(c.env.DB, code);
  if (!analytics) {
    return c.html(renderNotFoundPage(code), 404);
  }

  const origin = new URL(c.req.url).origin;
  return c.html(renderAnalyticsPage({ analytics, origin }));
});

// 4. Redirection: Async telemetry ingestion and HTTP 302 redirect
app.get('/:code', async (c) => {
  const code = c.req.param('code');

  // Skip favicon or system requests if any
  if (code === 'favicon.ico') {
    return c.notFound();
  }

  const link = await getLinkByCode(c.env.DB, code);
  if (!link) {
    return c.html(renderNotFoundPage(code), 404);
  }

  // Extract edge telemetry and headers
  const cf = c.req.raw.cf as (IncomingRequestCfProperties & { botManagement?: { verifiedBot?: boolean } }) | undefined;
  const country = cf?.country ? String(cf.country) : (c.req.header('cf-ipcountry') || 'Unknown');
  const city = typeof cf?.city === 'string' && cf.city !== '' ? cf.city : 'Unknown';
  const referer = c.req.header('referer') || null;
  const refererSource = parseRefererSource(referer);
  const userAgent = c.req.header('user-agent') || null;
  const { isBot, botName } = detectBot(cf, userAgent);

  // Schedule non-blocking persistence in Worker background execution context
  c.executionCtx.waitUntil(
    recordClickDetail(c.env.DB, {
      linkId: link.id,
      country,
      city,
      referer,
      refererSource,
      isBot: isBot ? 1 : 0,
      botName,
    }).catch((err) => {
      console.error('Failed to record click analytics in background:', err);
    })
  );

  // Immediate 302 redirect response
  return c.redirect(link.original_url, 302);
});

// 5. Custom plain HTML 404 handler for any other unhandled route
app.notFound((c) => {
  return c.html(renderNotFoundPage(), 404);
});

export default app;
