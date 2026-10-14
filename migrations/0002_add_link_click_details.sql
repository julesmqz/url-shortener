-- Migration: 0002_add_link_click_details.sql
-- Create link_click_details table for detailed click analytics
CREATE TABLE IF NOT EXISTS link_click_details (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  link_id INTEGER NOT NULL,
  country TEXT,
  city TEXT,
  referer TEXT,
  referer_source TEXT NOT NULL DEFAULT 'direct',
  is_bot INTEGER NOT NULL DEFAULT 0,
  bot_name TEXT,
  clicked_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (link_id) REFERENCES links(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_link_click_details_link_id ON link_click_details(link_id);
CREATE INDEX IF NOT EXISTS idx_link_click_details_link_clicked ON link_click_details(link_id, clicked_at DESC);
