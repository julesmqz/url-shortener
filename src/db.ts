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
