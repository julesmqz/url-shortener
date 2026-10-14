import { customAlphabet } from 'nanoid';

// Alphanumeric characters (Base62)
const ALPHABET = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
const generateCode = customAlphabet(ALPHABET, 6);

export interface LinkRecord {
  id: number;
  short_code: string;
  original_url: string;
  clicks: number;
  created_at: string;
}

export async function createShortLink(db: D1Database, originalUrl: string, maxRetries = 3): Promise<string> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const code = generateCode();
    try {
      await db
        .prepare('INSERT INTO links (short_code, original_url, clicks) VALUES (?, ?, 0)')
        .bind(code, originalUrl)
        .run();
      return code;
    } catch (err: unknown) {
      // Check for SQLite UNIQUE constraint error
      const message = err instanceof Error ? err.message : String(err);
      if (message.includes('UNIQUE constraint failed') || message.includes('D1_ERROR')) {
        if (attempt === maxRetries) {
          throw new Error('Failed to generate a unique short code after 3 attempts. Please try again.');
        }
        continue; // Retry with a new code
      }
      throw err;
    }
  }

  throw new Error('Failed to generate short link.');
}

export async function getLinkByCode(db: D1Database, code: string): Promise<LinkRecord | null> {
  const result = await db
    .prepare('SELECT id, short_code, original_url, clicks, created_at FROM links WHERE short_code = ?')
    .bind(code)
    .first<LinkRecord>();
  return result ?? null;
}

export async function incrementClickAndGet(db: D1Database, code: string): Promise<LinkRecord | null> {
  // Atomically increment clicks and fetch the link record
  await db
    .prepare('UPDATE links SET clicks = clicks + 1 WHERE short_code = ?')
    .bind(code)
    .run();

  return getLinkByCode(db, code);
}

export async function getAllLinks(db: D1Database): Promise<LinkRecord[]> {
  const { results } = await db
    .prepare('SELECT id, short_code, original_url, clicks, created_at FROM links ORDER BY created_at DESC')
    .all<LinkRecord>();
  return results ?? [];
}

export interface LinkAnalyticsSummary {
  link: LinkRecord;
  totalClicks: number;
  humanClicks: number;
  botClicks: number;
  topCountries: Array<{ country: string; count: number; percentage: number }>;
  topReferrers: Array<{ source: string; count: number; percentage: number }>;
  recentClicks: Array<{
    id: number;
    link_id: number;
    country: string | null;
    city: string | null;
    referer: string | null;
    referer_source: string;
    is_bot: number;
    bot_name: string | null;
    clicked_at: string;
  }>;
}

export async function recordClickDetail(
  db: D1Database,
  data: {
    linkId: number;
    country?: string | null;
    city?: string | null;
    referer?: string | null;
    refererSource: string;
    isBot: number;
    botName?: string | null;
  }
): Promise<void> {
  await db.batch([
    db.prepare('UPDATE links SET clicks = clicks + 1 WHERE id = ?').bind(data.linkId),
    db.prepare(`
      INSERT INTO link_click_details (link_id, country, city, referer, referer_source, is_bot, bot_name)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(
      data.linkId,
      data.country ?? null,
      data.city ?? null,
      data.referer ?? null,
      data.refererSource,
      data.isBot,
      data.botName ?? null
    )
  ]);
}

export async function getLinkAnalytics(db: D1Database, code: string): Promise<LinkAnalyticsSummary | null> {
  const link = await getLinkByCode(db, code);
  if (!link) return null;

  // 1. Total, human, and bot clicks
  const countsResult = await db.prepare(`
    SELECT 
      COUNT(*) as total,
      SUM(CASE WHEN is_bot = 0 THEN 1 ELSE 0 END) as human,
      SUM(CASE WHEN is_bot = 1 THEN 1 ELSE 0 END) as bot
    FROM link_click_details 
    WHERE link_id = ?
  `).bind(link.id).first<{ total: number; human: number; bot: number }>();

  const totalClicks = countsResult?.total ?? 0;
  const humanClicks = countsResult?.human ?? 0;
  const botClicks = countsResult?.bot ?? 0;

  // 2. Top countries
  const { results: countryRows } = await db.prepare(`
    SELECT 
      COALESCE(country, 'Unknown') as country, 
      COUNT(*) as count 
    FROM link_click_details 
    WHERE link_id = ? 
    GROUP BY country 
    ORDER BY count DESC 
    LIMIT 5
  `).bind(link.id).all<{ country: string; count: number }>();

  const topCountries = (countryRows ?? []).map(r => ({
    country: r.country,
    count: r.count,
    percentage: totalClicks > 0 ? Math.round((r.count / totalClicks) * 100) : 0
  }));

  // 3. Top referrers
  const { results: referrerRows } = await db.prepare(`
    SELECT 
      referer_source as source, 
      COUNT(*) as count 
    FROM link_click_details 
    WHERE link_id = ? 
    GROUP BY referer_source 
    ORDER BY count DESC 
    LIMIT 5
  `).bind(link.id).all<{ source: string; count: number }>();

  const topReferrers = (referrerRows ?? []).map(r => ({
    source: r.source,
    count: r.count,
    percentage: totalClicks > 0 ? Math.round((r.count / totalClicks) * 100) : 0
  }));

  // 4. Recent clicks
  const { results: recentClicks } = await db.prepare(`
    SELECT id, link_id, country, city, referer, referer_source, is_bot, bot_name, clicked_at 
    FROM link_click_details 
    WHERE link_id = ? 
    ORDER BY clicked_at DESC 
    LIMIT 10
  `).bind(link.id).all<{
    id: number;
    link_id: number;
    country: string | null;
    city: string | null;
    referer: string | null;
    referer_source: string;
    is_bot: number;
    bot_name: string | null;
    clicked_at: string;
  }>();

  return {
    link,
    totalClicks,
    humanClicks,
    botClicks,
    topCountries,
    topReferrers,
    recentClicks: recentClicks ?? []
  };
}
