export function validateUrl(input?: string | null): { valid: true; url: string } | { valid: false; error: string } {
  if (!input || typeof input !== 'string' || input.trim() === '') {
    return { valid: false, error: 'URL is required.' };
  }

  const trimmed = input.trim();

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return { valid: false, error: 'Invalid URL format. Please provide a complete URL (e.g. https://example.com).' };
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return { valid: false, error: 'Only HTTP and HTTPS URLs are allowed.' };
  }

  return { valid: true, url: parsed.toString() };
}
