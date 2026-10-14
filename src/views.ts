import { html } from 'hono/html';
import { LinkRecord, LinkAnalyticsSummary } from './db';

export function renderNotFoundPage(code?: string) {
  return html`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>404 - Link Not Found</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
    body { background-color: #f8fafc; color: #1e293b; display: flex; align-items: center; justify-content: center; min-height: 100vh; padding: 1.5rem; }
    .card { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 2.5rem; max-width: 480px; width: 100%; text-align: center; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.05); }
    .badge { display: inline-block; background: #fee2e2; color: #ef4444; font-weight: 700; font-size: 0.875rem; padding: 0.25rem 0.75rem; border-radius: 9999px; margin-bottom: 1rem; }
    h1 { font-size: 1.75rem; font-weight: 700; margin-bottom: 0.75rem; color: #0f172a; }
    p { color: #64748b; font-size: 1rem; line-height: 1.5; margin-bottom: 1.5rem; }
    .code-box { background: #f1f5f9; padding: 0.5rem 1rem; border-radius: 6px; font-family: monospace; font-size: 0.95rem; margin-bottom: 1.5rem; word-break: break-all; }
    .btn { display: inline-block; background: #2563eb; color: #ffffff; text-decoration: none; padding: 0.75rem 1.5rem; border-radius: 8px; font-weight: 500; font-size: 0.95rem; transition: background 0.15s ease; }
    .btn:hover { background: #1d4ed8; }
  </style>
</head>
<body>
  <div class="card">
    <span class="badge">404 NOT FOUND</span>
    <h1>Link Not Found</h1>
    <p>The short link you are trying to visit does not exist or has expired.</p>
    ${code ? html`<div class="code-box">/${code}</div>` : ''}
    <a href="/" class="btn">Return to Shortener</a>
  </div>
</body>
</html>`;
}

interface DashboardProps {
  links: LinkRecord[];
  origin: string;
  error?: string;
  successCode?: string;
  previousUrl?: string;
}

export function renderDashboard({ links, origin, error, successCode, previousUrl }: DashboardProps) {
  return html`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>URL Shortener</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
    body { background-color: #f8fafc; color: #1e293b; padding: 2rem 1rem; min-height: 100vh; }
    .container { max-width: 900px; margin: 0 auto; }
    header { margin-bottom: 2rem; }
    h1 { font-size: 2rem; font-weight: 800; color: #0f172a; margin-bottom: 0.25rem; }
    header p { color: #64748b; font-size: 1rem; }
    
    .panel { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 1.75rem; margin-bottom: 2rem; box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.05); }
    .panel h2 { font-size: 1.25rem; margin-bottom: 1rem; font-weight: 600; color: #0f172a; }
    
    .alert { padding: 0.875rem 1.25rem; border-radius: 8px; margin-bottom: 1.25rem; font-size: 0.95rem; line-height: 1.4; }
    .alert-error { background: #fef2f2; border: 1px solid #fecaca; color: #b91c1c; }
    .alert-success { background: #f0fdf4; border: 1px solid #bbf7d0; color: #15803d; }
    
    .form-group { display: flex; gap: 0.75rem; }
    .input-url { flex: 1; padding: 0.75rem 1rem; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 1rem; outline: none; transition: border-color 0.15s; }
    .input-url:focus { border-color: #2563eb; ring: 2px solid #93c5fd; }
    .btn-submit { background: #2563eb; color: #ffffff; border: none; padding: 0.75rem 1.5rem; border-radius: 8px; font-weight: 600; font-size: 0.95rem; cursor: pointer; transition: background 0.15s; }
    .btn-submit:hover { background: #1d4ed8; }
    
    .table-container { overflow-x: auto; }
    table { width: 100%; border-collapse: collapse; text-align: left; font-size: 0.95rem; }
    th { background: #f8fafc; padding: 0.75rem 1rem; border-bottom: 1px solid #e2e8f0; font-weight: 600; color: #475569; }
    td { padding: 0.875rem 1rem; border-bottom: 1px solid #f1f5f9; vertical-align: middle; }
    tr:last-child td { border-bottom: none; }
    
    .short-link { color: #2563eb; font-weight: 600; text-decoration: none; word-break: break-all; }
    .short-link:hover { text-decoration: underline; }
    .original-url { color: #64748b; text-decoration: none; max-width: 320px; display: inline-block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; vertical-align: middle; }
    .original-url:hover { color: #0f172a; text-decoration: underline; }
    .badge-clicks { display: inline-block; background: #e0f2fe; color: #0369a1; font-weight: 700; font-size: 0.85rem; padding: 0.2rem 0.65rem; border-radius: 9999px; }
    .btn-analytics { display: inline-block; background: #f8fafc; color: #2563eb; border: 1px solid #bfdbfe; font-size: 0.825rem; font-weight: 600; padding: 0.3rem 0.75rem; border-radius: 6px; text-decoration: none; transition: all 0.15s ease; white-space: nowrap; }
    .btn-analytics:hover { background: #eff6ff; border-color: #93c5fd; }
    .empty-state { text-align: center; color: #94a3b8; padding: 2.5rem 0; font-size: 0.95rem; }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <h1>URL Shortener</h1>
      <p>Create compact links, track visit clicks, and redirect seamlessly with Cloudflare D1.</p>
    </header>

    <div class="panel">
      <h2>Shorten a New URL</h2>

      ${error ? html`<div class="alert alert-error">${error}</div>` : ''}

      ${successCode ? html`
        <div class="alert alert-success">
          <strong>Short link created!</strong> Your link is ready: 
          <a class="short-link" href="${origin}/${successCode}" target="_blank" rel="noopener noreferrer">${origin}/${successCode}</a>
        </div>
      ` : ''}

      <form action="/links" method="POST" class="form-group">
        <input 
          type="text" 
          name="url" 
          class="input-url" 
          placeholder="https://example.com/very/long/url" 
          value="${previousUrl ?? ''}" 
          required 
          autocomplete="off"
        />
        <button type="submit" class="btn-submit">Shorten</button>
      </form>
    </div>

    <div class="panel">
      <h2>All Shortened Links (${links.length})</h2>
      <div class="table-container">
        ${links.length === 0 ? html`
          <p class="empty-state">No links have been shortened yet. Enter a URL above to create your first one!</p>
        ` : html`
          <table>
            <thead>
              <tr>
                <th>Short Link</th>
                <th>Original URL</th>
                <th style="text-align: center;">Clicks</th>
                <th style="text-align: center;">Analytics</th>
              </tr>
            </thead>
            <tbody>
              ${links.map((link) => html`
                <tr>
                  <td>
                    <a class="short-link" href="${origin}/${link.short_code}" target="_blank" rel="noopener noreferrer">
                      /${link.short_code}
                    </a>
                  </td>
                  <td>
                    <a class="original-url" href="${link.original_url}" target="_blank" rel="noopener noreferrer" title="${link.original_url}">
                      ${link.original_url}
                    </a>
                  </td>
                  <td style="text-align: center;">
                    <span class="badge-clicks">${link.clicks}</span>
                  </td>
                  <td style="text-align: center;">
                    <a class="btn-analytics" href="/links/${link.short_code}/analytics">View Analytics</a>
                  </td>
                </tr>
              `)}
            </tbody>
          </table>
        `}
      </div>
    </div>
  </div>
</body>
</html>`;
}

interface AnalyticsPageProps {
  analytics: LinkAnalyticsSummary;
  origin: string;
}

export function renderAnalyticsPage({ analytics, origin }: AnalyticsPageProps) {
  const { link, totalClicks, humanClicks, botClicks, topCountries, topReferrers, recentClicks } = analytics;
  const humanPercent = totalClicks > 0 ? Math.round((humanClicks / totalClicks) * 100) : 0;
  const botPercent = totalClicks > 0 ? Math.round((botClicks / totalClicks) * 100) : 0;

  return html`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Analytics: /${link.short_code} - URL Shortener</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
    body { background-color: #f8fafc; color: #1e293b; padding: 2rem 1rem; min-height: 100vh; }
    .container { max-width: 900px; margin: 0 auto; }
    
    .nav-bar { margin-bottom: 1.5rem; display: flex; align-items: center; justify-content: space-between; }
    .btn-back { display: inline-flex; align-items: center; gap: 0.5rem; text-decoration: none; color: #475569; font-weight: 600; font-size: 0.95rem; }
    .btn-back:hover { color: #0f172a; text-decoration: underline; }
    
    .link-header { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 1.5rem; margin-bottom: 1.5rem; box-shadow: 0 1px 3px rgb(0 0 0 / 0.04); }
    .link-header h1 { font-size: 1.5rem; font-weight: 700; color: #0f172a; margin-bottom: 0.5rem; word-break: break-all; }
    .link-header .short-url { color: #2563eb; text-decoration: none; }
    .link-header .short-url:hover { text-decoration: underline; }
    .link-header p { font-size: 0.95rem; color: #64748b; word-break: break-all; }
    .link-header .dest-url { color: #0f172a; font-weight: 500; }
    
    .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 1rem; margin-bottom: 1.5rem; }
    .stat-card { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 1.25rem 1.5rem; box-shadow: 0 1px 2px rgb(0 0 0 / 0.04); }
    .stat-label { font-size: 0.85rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: #64748b; margin-bottom: 0.25rem; }
    .stat-value { font-size: 2rem; font-weight: 800; color: #0f172a; }
    .stat-sub { font-size: 0.85rem; color: #64748b; margin-top: 0.25rem; }
    .stat-human { border-left: 4px solid #10b981; }
    .stat-bot { border-left: 4px solid #f59e0b; }
    .stat-total { border-left: 4px solid #2563eb; }
    
    .breakdown-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; margin-bottom: 1.5rem; }
    @media (max-width: 768px) { .breakdown-grid { grid-template-columns: 1fr; } }
    
    .panel { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 1.5rem; box-shadow: 0 1px 3px rgb(0 0 0 / 0.04); }
    .panel h2 { font-size: 1.15rem; font-weight: 600; color: #0f172a; margin-bottom: 1rem; }
    
    .bar-row { margin-bottom: 0.875rem; }
    .bar-label { display: flex; justify-content: space-between; font-size: 0.9rem; margin-bottom: 0.25rem; font-weight: 500; }
    .bar-track { background: #f1f5f9; height: 8px; border-radius: 9999px; overflow: hidden; }
    .bar-fill { height: 100%; border-radius: 9999px; background: #2563eb; }
    .bar-fill-alt { background: #8b5cf6; }
    
    table { width: 100%; border-collapse: collapse; text-align: left; font-size: 0.9rem; }
    th { background: #f8fafc; padding: 0.65rem 0.875rem; border-bottom: 1px solid #e2e8f0; font-weight: 600; color: #475569; }
    td { padding: 0.75rem 0.875rem; border-bottom: 1px solid #f1f5f9; vertical-align: middle; }
    tr:last-child td { border-bottom: none; }
    
    .badge-bot { display: inline-block; background: #fef3c7; color: #b45309; font-weight: 600; font-size: 0.75rem; padding: 0.15rem 0.5rem; border-radius: 9999px; }
    .badge-human { display: inline-block; background: #d1fae5; color: #065f46; font-weight: 600; font-size: 0.75rem; padding: 0.15rem 0.5rem; border-radius: 9999px; }
    .empty-text { color: #94a3b8; font-size: 0.9rem; text-align: center; padding: 1.5rem 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="nav-bar">
      <a href="/" class="btn-back">← Back to Dashboard</a>
    </div>

    <div class="link-header">
      <h1>
        Analytics for <a class="short-url" href="${origin}/${link.short_code}" target="_blank" rel="noopener noreferrer">${origin}/${link.short_code}</a>
      </h1>
      <p>Redirects to: <a class="dest-url" href="${link.original_url}" target="_blank" rel="noopener noreferrer">${link.original_url}</a></p>
    </div>

    <div class="stats-grid">
      <div class="stat-card stat-total">
        <div class="stat-label">Total Clicks</div>
        <div class="stat-value">${totalClicks}</div>
        <div class="stat-sub">Lifetime recorded visits</div>
      </div>
      <div class="stat-card stat-human">
        <div class="stat-label">Human Visitors</div>
        <div class="stat-value">${humanClicks}</div>
        <div class="stat-sub">${humanPercent}% of all visits</div>
      </div>
      <div class="stat-card stat-bot">
        <div class="stat-label">Bot / Crawlers</div>
        <div class="stat-value">${botClicks}</div>
        <div class="stat-sub">${botPercent}% of all visits</div>
      </div>
    </div>

    <div class="breakdown-grid">
      <div class="panel">
        <h2>Geographic Distribution (Top Countries)</h2>
        ${topCountries.length === 0 ? html`
          <p class="empty-text">No location data captured yet.</p>
        ` : html`
          ${topCountries.map((c) => html`
            <div class="bar-row">
              <div class="bar-label">
                <span>${c.country}</span>
                <span>${c.count} (${c.percentage}%)</span>
              </div>
              <div class="bar-track">
                <div class="bar-fill" style="width: ${c.percentage}%;"></div>
              </div>
            </div>
          `)}
        `}
      </div>

      <div class="panel">
        <h2>Traffic Referrers</h2>
        ${topReferrers.length === 0 ? html`
          <p class="empty-text">No referrer data captured yet.</p>
        ` : html`
          ${topReferrers.map((r) => html`
            <div class="bar-row">
              <div class="bar-label">
                <span style="text-transform: capitalize;">${r.source}</span>
                <span>${r.count} (${r.percentage}%)</span>
              </div>
              <div class="bar-track">
                <div class="bar-fill bar-fill-alt" style="width: ${r.percentage}%;"></div>
              </div>
            </div>
          `)}
        `}
      </div>
    </div>

    <div class="panel">
      <h2>Recent Clicks Activity (Last 10)</h2>
      ${recentClicks.length === 0 ? html`
        <p class="empty-text">No clicks recorded yet. Share your short link to start tracking visits!</p>
      ` : html`
        <div style="overflow-x: auto;">
          <table>
            <thead>
              <tr>
                <th>Date & Time</th>
                <th>Location</th>
                <th>Source</th>
                <th>Type</th>
              </tr>
            </thead>
            <tbody>
              ${recentClicks.map((click) => html`
                <tr>
                  <td>${click.clicked_at}</td>
                  <td>${click.city && click.city !== 'Unknown' ? `${click.city}, ` : ''}${click.country || 'Unknown'}</td>
                  <td style="text-transform: capitalize;">${click.referer_source}</td>
                  <td>
                    ${click.is_bot ? html`
                      <span class="badge-bot">${click.bot_name || 'Bot'}</span>
                    ` : html`
                      <span class="badge-human">Human</span>
                    `}
                  </td>
                </tr>
              `)}
            </tbody>
          </table>
        </div>
      `}
    </div>
  </div>
</body>
</html>`;
}
