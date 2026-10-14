import { Hono } from 'hono';
import { validateUrl } from './validation';
import { createShortLink, getAllLinks, incrementClickAndGet } from './db';
import { renderDashboard, renderNotFoundPage } from './views';

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

// 3. Redirection: Increment click counter and issue HTTP 302
app.get('/:code', async (c) => {
  const code = c.req.param('code');

  // Skip favicon or system requests if any
  if (code === 'favicon.ico') {
    return c.notFound();
  }

  const link = await incrementClickAndGet(c.env.DB, code);
  if (!link) {
    return c.html(renderNotFoundPage(code), 404);
  }

  return c.redirect(link.original_url, 302);
});

// 4. Custom plain HTML 404 handler for any other unhandled route
app.notFound((c) => {
  return c.html(renderNotFoundPage(), 404);
});

export default app;
