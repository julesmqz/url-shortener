export type RefererSource = 'twitter' | 'linkedin' | 'reddit' | 'search' | 'direct' | 'other';

export interface BotDetectionResult {
  isBot: boolean;
  botName: string | null;
}

export interface ClickDetailRecord {
  id: number;
  link_id: number;
  country: string | null;
  city: string | null;
  referer: string | null;
  referer_source: string;
  is_bot: number;
  bot_name: string | null;
  clicked_at: string;
}

/**
 * Normalizes an HTTP Referer header into a standardized category.
 */
export function parseRefererSource(referer?: string | null): RefererSource {
  if (!referer || referer.trim() === '') {
    return 'direct';
  }

  try {
    const url = new URL(referer);
    const host = url.hostname.toLowerCase();

    if (host === 't.co' || host.includes('twitter.com') || host.includes('x.com')) {
      return 'twitter';
    }

    if (host.includes('linkedin.com')) {
      return 'linkedin';
    }

    if (host.includes('reddit.com')) {
      return 'reddit';
    }

    if (
      host.includes('google.') ||
      host.includes('bing.com') ||
      host.includes('duckduckgo.com') ||
      host.includes('yahoo.com') ||
      host.includes('ecosia.org')
    ) {
      return 'search';
    }

    return 'other';
  } catch {
    return 'other';
  }
}

/**
 * Evaluates whether an incoming request originates from a bot or link-preview crawler.
 */
export function detectBot(
  cf?: (IncomingRequestCfProperties & { botManagement?: { verifiedBot?: boolean } }) | null,
  userAgent?: string | null
): BotDetectionResult {
  // Check Cloudflare edge Bot Management signal if present
  if (cf?.botManagement?.verifiedBot === true) {
    return { isBot: true, botName: 'verified-bot' };
  }

  if (!userAgent || userAgent.trim() === '') {
    return { isBot: false, botName: null };
  }

  const ua = userAgent.toLowerCase();

  const crawlerPatterns: Array<{ name: string; pattern: RegExp }> = [
    { name: 'slackbot', pattern: /slackbot/ },
    { name: 'twitterbot', pattern: /twitterbot/ },
    { name: 'discordbot', pattern: /discordbot/ },
    { name: 'facebookexternalhit', pattern: /facebookexternalhit/ },
    { name: 'linkedinbot', pattern: /linkedinbot/ },
    { name: 'googlebot', pattern: /googlebot/ },
    { name: 'bingbot', pattern: /bingbot/ },
    { name: 'applebot', pattern: /applebot/ },
    { name: 'telegrambot', pattern: /telegrambot/ },
    { name: 'whatsapp', pattern: /whatsapp/ },
    { name: 'generic-crawler', pattern: /(bot|crawler|spider|crawl)/ },
  ];

  for (const { name, pattern } of crawlerPatterns) {
    if (pattern.test(ua)) {
      return { isBot: true, botName: name };
    }
  }

  return { isBot: false, botName: null };
}
