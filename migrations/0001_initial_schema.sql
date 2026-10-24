-- Cloudflare D1 SQLite Initial Migration for FOXCOIN
-- Automatically run via wrangler d1 migrations apply or auto-initialized at runtime

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL,
  display_name TEXT NOT NULL,
  email TEXT,
  telegram_id TEXT,
  avatar_url TEXT,
  is_guest INTEGER DEFAULT 0,
  is_telegram INTEGER DEFAULT 0,
  is_admin INTEGER DEFAULT 0,
  balance REAL DEFAULT 0,
  total_earned REAL DEFAULT 0,
  total_taps INTEGER DEFAULT 0,
  level INTEGER DEFAULT 1,
  level_name TEXT DEFAULT 'Bronze Fox',
  next_level_min_coins REAL DEFAULT 5000,
  current_level_min_coins REAL DEFAULT 0,
  energy REAL DEFAULT 1000,
  max_energy REAL DEFAULT 1000,
  energy_regen_rate REAL DEFAULT 1,
  tap_power REAL DEFAULT 1,
  profit_per_hour REAL DEFAULT 0,
  unclaimed_passive REAL DEFAULT 0,
  last_passive_claim_timestamp INTEGER DEFAULT 0,
  max_offline_hours REAL DEFAULT 3,
  upgrades_json TEXT DEFAULT '{}',
  daily_streak INTEGER DEFAULT 0,
  last_daily_claim_date TEXT,
  tasks_json TEXT DEFAULT '{}',
  referral_code TEXT,
  referred_by_code TEXT,
  referral_count INTEGER DEFAULT 0,
  referral_earnings REAL DEFAULT 0,
  claimed_milestones INTEGER DEFAULT 0,
  boosters_json TEXT DEFAULT '{"fullEnergyRemaining":6,"nextFullEnergyAt":0,"turboActiveUntil":0,"nextTurboAt":0}',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS foxcoin_users_kv (
  id TEXT PRIMARY KEY,
  user_json TEXT NOT NULL,
  balance REAL DEFAULT 0,
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_users_telegram_id ON users(telegram_id);
CREATE INDEX IF NOT EXISTS idx_users_referral_code ON users(referral_code);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_balance ON users(balance DESC);

-- Trades & Cashout Payout Orders (FOX to USDT with 10-day payout timer)
CREATE TABLE IF NOT EXISTS trades (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  fox_amount REAL NOT NULL,
  usd_amount REAL NOT NULL,
  wallet_address TEXT NOT NULL,
  network TEXT NOT NULL,
  status TEXT DEFAULT 'pending', -- pending, processing, completed, cancelled
  created_at INTEGER NOT NULL,
  payout_deadline INTEGER NOT NULL, -- created_at + (10 * 24 * 60 * 60 * 1000)
  tx_hash TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_trades_user_id ON trades(user_id);
CREATE INDEX IF NOT EXISTS idx_trades_status ON trades(status);

-- Telegram Webhook Update Deduplication
CREATE TABLE IF NOT EXISTS telegram_updates (
  update_id INTEGER PRIMARY KEY,
  processed_at INTEGER NOT NULL
);

-- Admin & System Config
CREATE TABLE IF NOT EXISTS system_config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);
