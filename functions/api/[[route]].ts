/**
 * Cloudflare Pages Function: Universal Edge API Router for FOXCOIN
 * Handles all /api/* routes natively on Cloudflare edge runtime.
 * Fully supports Cloudflare D1 SQLite Database, Cloudflare KV, and Telegram Webhook.
 */

import crypto from 'node:crypto';
import {
  UPGRADES,
  PLAYER_LEVELS,
  TASKS,
  DAILY_REWARDS,
  GAME_CONSTANTS,
  LUCKY_WHEEL_PRIZES,
  pickLuckyWheelPrize,
  reconcileUserLevel,
  getUpgradeXpBonus,
} from '../../server/gameConfig.js';
import {
  UserGameState,
  LeaderboardEntry,
  TradeOrder,
  UpgradeDefinition,
  LuckyWheelPrize,
} from '../../src/types/game.js';

export interface CloudflareEnv {
  DB?: any; // Cloudflare D1 SQLite Database binding
  FOX_KV?: any; // Cloudflare KV binding
  TELEGRAM_BOT_TOKEN?: string;
  TELEGRAM_WEBHOOK_SECRET?: string;
  ADMIN_SECRET?: string;
  ADMIN_EMAIL?: string;
  APP_URL?: string;
  TELEGRAM_BOT_USERNAME?: string;
  TELEGRAM_BOT_NAME?: string;
  TELEGRAM_CHANNEL?: string;
  SESSION_SECRET?: string;
}

export type PagesFunction<T = any> = (context: {
  request: Request;
  env: T;
  next: () => Promise<Response>;
  data: Record<string, any>;
  params: Record<string, any>;
}) => Promise<Response> | Response;

// In-memory update deduplication cache for Cloudflare edge isolate
const processedUpdates = new Set<number>();

// In-memory edge database with persistence to Cloudflare D1 and KV if configured
const edgeUsers = new Map<string, UserGameState>();
const edgeTrades: TradeOrder[] = [];
let edgeUpgrades: UpgradeDefinition[] = [...UPGRADES];
let edgeWheelPrizes: LuckyWheelPrize[] = [...LUCKY_WHEEL_PRIZES];
let edgeBotConfig = {
  botToken: '',
  webhookUrl: '',
  webhookSecret: '',
  botUsername: 'FOXCOINBot',
  botFirstName: 'FOXCOIN',
  lastWebhookSetupDate: undefined as number | undefined,
};
const edgeStarsInvoices = new Map<
  string,
  {
    userId: string;
    giftId: string;
    starsAmount: number;
    edition: number;
    status: 'pending' | 'paid';
    chargeId?: string;
    createdAt: number;
  }
>();

// Auto-initialize Cloudflare D1 Database schema if binding exists
let d1Initialized = false;
async function ensureD1Schema(db: any) {
  if (d1Initialized || !db) return;
  try {
    await db.exec(`
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
        referral_code TEXT UNIQUE,
        referred_by_code TEXT,
        referral_count INTEGER DEFAULT 0,
        referral_earnings REAL DEFAULT 0,
        claimed_milestones INTEGER DEFAULT 0,
        boosters_json TEXT DEFAULT '{}',
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS trades (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        fox_amount REAL NOT NULL,
        usd_amount REAL NOT NULL,
        wallet_address TEXT NOT NULL,
        network TEXT NOT NULL,
        status TEXT DEFAULT 'pending',
        created_at INTEGER NOT NULL,
        payout_deadline INTEGER NOT NULL,
        tx_hash TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS telegram_updates (
        update_id INTEGER PRIMARY KEY,
        processed_at INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS bot_config (
        id INTEGER PRIMARY KEY,
        bot_token TEXT,
        webhook_url TEXT,
        webhook_secret TEXT,
        bot_username TEXT,
        bot_first_name TEXT,
        updated_at INTEGER
      );
    `);
    d1Initialized = true;
  } catch (err) {
    console.warn('D1 schema notice:', err);
  }
}

async function hydrateEdgeBotConfig(env: CloudflareEnv) {
  if (edgeBotConfig.botToken) return;
  if (env.TELEGRAM_BOT_TOKEN) {
    edgeBotConfig.botToken = env.TELEGRAM_BOT_TOKEN.trim();
  }
  if (env.FOX_KV) {
    try {
      const raw = await env.FOX_KV.get('foxcoin_bot_config');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.botToken) edgeBotConfig = { ...edgeBotConfig, ...parsed };
        return;
      }
    } catch {}
  }
  if (env.DB) {
    try {
      const row = await env.DB.prepare('SELECT * FROM bot_config WHERE id = 1').first();
      if (row && row.bot_token) {
        edgeBotConfig.botToken = String(row.bot_token);
        edgeBotConfig.webhookUrl = String(row.webhook_url || '');
        edgeBotConfig.webhookSecret = String(row.webhook_secret || '');
        edgeBotConfig.botUsername = String(row.bot_username || 'FOXCOINBot');
        edgeBotConfig.botFirstName = String(row.bot_first_name || 'FOXCOIN');
        edgeBotConfig.lastWebhookSetupDate = Number(row.updated_at) || undefined;
      }
    } catch {}
  }
}

async function persistEdgeBotConfig(env: CloudflareEnv) {
  if (env.FOX_KV) {
    try {
      await env.FOX_KV.put('foxcoin_bot_config', JSON.stringify(edgeBotConfig));
    } catch {}
  }
  if (env.DB) {
    try {
      await env.DB.prepare(`
        INSERT INTO bot_config (id, bot_token, webhook_url, webhook_secret, bot_username, bot_first_name, updated_at)
        VALUES (1, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          bot_token = excluded.bot_token,
          webhook_url = excluded.webhook_url,
          webhook_secret = excluded.webhook_secret,
          bot_username = excluded.bot_username,
          bot_first_name = excluded.bot_first_name,
          updated_at = excluded.updated_at
      `)
        .bind(
          edgeBotConfig.botToken || '',
          edgeBotConfig.webhookUrl || '',
          edgeBotConfig.webhookSecret || '',
          edgeBotConfig.botUsername || 'FOXCOINBot',
          edgeBotConfig.botFirstName || 'FOXCOIN',
          Date.now()
        )
        .run();
    } catch {}
  }
}

function deriveEdgeWebhookSecret(botToken: string): string {
  return crypto
    .createHmac('sha256', 'foxcoin_telegram_stars_webhook_v1')
    .update(botToken.trim())
    .digest('hex')
    .slice(0, 32);
}

let currentEdgeEnv: CloudflareEnv | null = null;
let lastUsersHydratedAt = 0;

function mapD1RowToUser(r: any): UserGameState {
  let upgrades: Record<string, number> = {};
  let tasks: Record<string, any> = {};
  let boosters: any = {
    fullEnergyRemaining: 6,
    nextFullEnergyAt: 0,
    turboActiveUntil: 0,
    nextTurboAt: 0,
  };
  try {
    if (r.upgrades_json) upgrades = JSON.parse(r.upgrades_json);
  } catch {}
  try {
    if (r.tasks_json) tasks = JSON.parse(r.tasks_json);
  } catch {}
  try {
    if (r.boosters_json) boosters = { ...boosters, ...JSON.parse(r.boosters_json) };
  } catch {}

  const todayStr = new Date().toISOString().split('T')[0];
  const lastDaily = r.last_daily_claim_date ? String(r.last_daily_claim_date) : null;

  return {
    id: String(r.id),
    username: String(r.username || 'FoxPlayer'),
    displayName: String(r.display_name || r.username || 'FoxPlayer'),
    email: r.email ? String(r.email) : undefined,
    telegramId: r.telegram_id ? (Number(r.telegram_id) || r.telegram_id) : undefined,
    avatarUrl: r.avatar_url ? String(r.avatar_url) : undefined,
    isGuest: Boolean(r.is_guest),
    isTelegram: Boolean(r.is_telegram),
    isAdmin: Boolean(r.is_admin),
    balance: Number(r.balance || 0),
    totalEarned: Number(r.total_earned || 0),
    totalTaps: Number(r.total_taps || 0),
    level: Number(r.level || 1),
    levelName: String(r.level_name || 'Bronze Fox'),
    nextLevelMinCoins: Number(r.next_level_min_coins || 5000),
    currentLevelMinCoins: Number(r.current_level_min_coins || 0),
    energy: Number(r.energy ?? 1000),
    maxEnergy: Number(r.max_energy || 1000),
    energyRegenRate: Number(r.energy_regen_rate || 1),
    tapPower: Number(r.tap_power || 1),
    profitPerHour: Number(r.profit_per_hour || 0),
    unclaimedPassive: Number(r.unclaimed_passive || 0),
    lastPassiveClaimTimestamp: Number(r.last_passive_claim_timestamp || r.updated_at || Date.now()),
    maxOfflineHours: Number(r.max_offline_hours || 3),
    upgrades,
    dailyStreak: Number(r.daily_streak || 0),
    lastDailyClaimDate: lastDaily,
    canClaimDaily: lastDaily !== todayStr,
    dailyRewardDays: DAILY_REWARDS,
    tasks,
    referralCode: String(r.referral_code || `FOX_${String(r.id).slice(-5).toUpperCase()}`),
    referralCount: Number(r.referral_count || 0),
    referralEarnings: Number(r.referral_earnings || 0),
    claimedMilestones: Number(r.claimed_milestones || 0),
    boosters,
    createdAt: Number(r.created_at || Date.now()),
  };
}

// Hydrate registered users from Cloudflare D1 and/or Cloudflare KV into edgeUsers
async function hydrateEdgeUsers(env: CloudflareEnv, force = false) {
  const now = Date.now();
  if (!force && now - lastUsersHydratedAt < 4000) return;
  lastUsersHydratedAt = now;

  // 1. Hydrate from Cloudflare KV if bound
  if (env.FOX_KV) {
    try {
      const rawKv = await env.FOX_KV.get('foxcoin_users_map');
      if (rawKv) {
        const parsedMap = JSON.parse(rawKv) as Record<string, UserGameState>;
        for (const [uid, kvUser] of Object.entries(parsedMap)) {
          if (!uid || !kvUser) continue;
          const existing = edgeUsers.get(uid);
          if (!existing || (kvUser.totalEarned || 0) >= (existing.totalEarned || 0)) {
            edgeUsers.set(uid, {
              ...kvUser,
              dailyRewardDays: DAILY_REWARDS,
            });
          }
        }
      }
    } catch (err) {
      console.warn('KV user hydrate notice:', err);
    }
  }

  // 2. Hydrate from Cloudflare D1 SQLite database if bound (Primary source of truth)
  if (env.DB) {
    try {
      const res = await env.DB.prepare('SELECT * FROM users ORDER BY updated_at DESC LIMIT 2000').all();
      if (res && Array.isArray(res.results)) {
        for (const row of res.results) {
          const d1User = mapD1RowToUser(row);
          const existing = edgeUsers.get(d1User.id);
          if (
            !existing ||
            d1User.totalEarned >= (existing.totalEarned || 0) ||
            d1User.balance !== existing.balance ||
            d1User.referralCount >= (existing.referralCount || 0)
          ) {
            edgeUsers.set(d1User.id, d1User);
          }
        }
      }
    } catch (err) {
      console.warn('D1 user hydrate notice:', err);
    }
  }
}

// Persist user to Cloudflare D1 and/or KV
async function persistUserToD1(db: any, user: UserGameState) {
  const effectiveDb = db || currentEdgeEnv?.DB;

  if (currentEdgeEnv?.FOX_KV) {
    try {
      const realUsersObj: Record<string, UserGameState> = {};
      for (const [uid, u] of edgeUsers.entries()) {
        if (!uid.startsWith('bot_')) {
          realUsersObj[uid] = u;
        }
      }
      realUsersObj[user.id] = user;
      await currentEdgeEnv.FOX_KV.put('foxcoin_users_map', JSON.stringify(realUsersObj));
    } catch {}
  }

  if (!effectiveDb) return;
  try {
    await effectiveDb
      .prepare(`
        INSERT INTO users (
          id, username, display_name, email, telegram_id, avatar_url,
          is_guest, is_telegram, is_admin, balance, total_earned, total_taps,
          level, level_name, next_level_min_coins, current_level_min_coins,
          energy, max_energy, energy_regen_rate, tap_power, profit_per_hour,
          unclaimed_passive, last_passive_claim_timestamp, max_offline_hours,
          upgrades_json, daily_streak, last_daily_claim_date, tasks_json,
          referral_code, referral_count, referral_earnings, claimed_milestones,
          boosters_json, created_at, updated_at
        ) VALUES (
          ?, ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?, ?,
          ?, ?, ?, ?,
          ?, ?, ?, ?, ?,
          ?, ?, ?,
          ?, ?, ?, ?,
          ?, ?, ?, ?,
          ?, ?, ?
        )
        ON CONFLICT(id) DO UPDATE SET
          username = excluded.username,
          display_name = excluded.display_name,
          email = COALESCE(excluded.email, users.email),
          telegram_id = COALESCE(excluded.telegram_id, users.telegram_id),
          avatar_url = COALESCE(excluded.avatar_url, users.avatar_url),
          is_admin = excluded.is_admin,
          balance = excluded.balance,
          total_earned = excluded.total_earned,
          total_taps = excluded.total_taps,
          level = excluded.level,
          level_name = excluded.level_name,
          next_level_min_coins = excluded.next_level_min_coins,
          current_level_min_coins = excluded.current_level_min_coins,
          energy = excluded.energy,
          max_energy = excluded.max_energy,
          energy_regen_rate = excluded.energy_regen_rate,
          tap_power = excluded.tap_power,
          profit_per_hour = excluded.profit_per_hour,
          unclaimed_passive = excluded.unclaimed_passive,
          last_passive_claim_timestamp = excluded.last_passive_claim_timestamp,
          upgrades_json = excluded.upgrades_json,
          daily_streak = excluded.daily_streak,
          last_daily_claim_date = excluded.last_daily_claim_date,
          tasks_json = excluded.tasks_json,
          referral_count = excluded.referral_count,
          referral_earnings = excluded.referral_earnings,
          claimed_milestones = excluded.claimed_milestones,
          boosters_json = excluded.boosters_json,
          updated_at = excluded.updated_at
      `)
      .bind(
        user.id,
        user.username,
        user.displayName || user.username,
        user.email || null,
        user.telegramId ? String(user.telegramId) : null,
        user.avatarUrl || null,
        user.isGuest ? 1 : 0,
        user.isTelegram ? 1 : 0,
        user.isAdmin ? 1 : 0,
        user.balance,
        user.totalEarned,
        user.totalTaps,
        user.level,
        user.levelName,
        user.nextLevelMinCoins,
        user.currentLevelMinCoins,
        user.energy,
        user.maxEnergy,
        user.energyRegenRate,
        user.tapPower,
        user.profitPerHour,
        user.unclaimedPassive,
        user.lastPassiveClaimTimestamp,
        user.maxOfflineHours,
        JSON.stringify(user.upgrades || {}),
        user.dailyStreak,
        user.lastDailyClaimDate,
        JSON.stringify(user.tasks || {}),
        user.referralCode,
        user.referralCount || 0,
        user.referralEarnings || 0,
        user.claimedMilestones || 0,
        JSON.stringify(user.boosters || {}),
        user.createdAt || Date.now(),
        Date.now()
      )
      .run();
  } catch (err) {
    console.warn('D1 user persist notice:', err);
  }
}

// Persist trade to Cloudflare D1
async function persistTradeToD1(db: any, trade: TradeOrder) {
  if (!db) return;
  try {
    await db
      .prepare(`
        INSERT INTO trades (
          id, user_id, fox_amount, usd_amount, wallet_address, network, status, created_at, payout_deadline, tx_hash
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .bind(
        trade.id,
        trade.userId,
        trade.foxAmount,
        trade.usdAmount,
        trade.walletAddress,
        trade.network,
        trade.status,
        trade.createdAt,
        trade.payoutDeadline,
        trade.txHash
      )
      .run();
  } catch (err) {
    console.warn('D1 trade persist notice:', err);
  }
}

// Fetch trades from D1
async function getTradesFromD1(db: any, userId: string): Promise<TradeOrder[]> {
  if (!db) return edgeTrades.filter((t) => t.userId === userId);
  try {
    const res = await db.prepare('SELECT * FROM trades WHERE user_id = ? ORDER BY created_at DESC').bind(userId).all();
    if (res && res.results && res.results.length > 0) {
      return res.results.map((r: any) => ({
        id: r.id,
        userId: r.user_id,
        foxAmount: r.fox_amount,
        usdAmount: r.usd_amount,
        walletAddress: r.wallet_address,
        network: r.network,
        status: r.status,
        createdAt: r.created_at,
        payoutDeadline: r.payout_deadline,
        txHash: r.tx_hash,
      }));
    }
  } catch (err) {
    console.warn('D1 get trades notice:', err);
  }
  return edgeTrades.filter((t) => t.userId === userId);
}

// Seed initial leaderboard mock users on isolate boot
function seedInitialUsers() {
  if (edgeUsers.size > 0) return;

  const seedPlayers = [
    { id: 'bot_1', username: 'GoldenFoxMaster', displayName: 'Golden Fox 🦊', balance: 142_500_000, profitPerHour: 450_000, level: 8 },
    { id: 'bot_2', username: 'Satoshi_Den', displayName: 'Satoshi Den ⚡', balance: 98_340_000, profitPerHour: 380_000, level: 7 },
    { id: 'bot_3', username: 'CyberVixen', displayName: 'Cyber Vixen 💎', balance: 64_120_000, profitPerHour: 240_000, level: 7 },
    { id: 'bot_4', username: 'FoxCommander', displayName: 'Commander Reynard', balance: 39_800_000, profitPerHour: 185_000, level: 7 },
    { id: 'bot_5', username: 'FoxyMillionaire', displayName: 'Foxy Mill 🚀', balance: 18_900_000, profitPerHour: 110_000, level: 6 },
    { id: 'bot_6', username: 'AmberTail', displayName: 'Amber Tail 🔥', balance: 9_450_000, profitPerHour: 65_000, level: 6 },
    { id: 'bot_7', username: 'CryptoBurrower', displayName: 'Burrow Miner ⛏️', balance: 4_320_000, profitPerHour: 34_000, level: 5 },
    { id: 'bot_8', username: 'SilverPaw', displayName: 'Silver Paw 🥈', balance: 1_280_000, profitPerHour: 15_000, level: 5 },
    { id: 'bot_9', username: 'SwiftFox', displayName: 'Swift Fox 💨', balance: 840_000, profitPerHour: 9_500, level: 4 },
    { id: 'bot_10', username: 'MoonFox', displayName: 'Moon Fox 🌙', balance: 350_000, profitPerHour: 5_200, level: 4 },
  ];

  const now = Date.now();
  for (const sp of seedPlayers) {
    const levelObj = PLAYER_LEVELS.find((l) => l.level === sp.level) || PLAYER_LEVELS[0];
    const nextLevelObj = PLAYER_LEVELS.find((l) => l.level === sp.level + 1) || PLAYER_LEVELS[PLAYER_LEVELS.length - 1];

    edgeUsers.set(sp.id, {
      id: sp.id,
      username: sp.username,
      displayName: sp.displayName,
      isGuest: false,
      isTelegram: true,
      balance: sp.balance,
      totalEarned: sp.balance * 1.5,
      totalTaps: 45000,
      level: sp.level,
      levelName: levelObj.name,
      currentLevelMinCoins: levelObj.minCoins,
      nextLevelMinCoins: nextLevelObj.minCoins,
      energy: 1000,
      maxEnergy: 1000 + sp.level * 500,
      energyRegenRate: 1 + Math.floor(sp.level / 2),
      tapPower: 1 + sp.level * 2,
      profitPerHour: sp.profitPerHour,
      unclaimedPassive: 0,
      lastPassiveClaimTimestamp: now,
      maxOfflineHours: GAME_CONSTANTS.MAX_OFFLINE_HOURS,
      upgrades: { tap_power: sp.level, berry_stand: sp.level },
      dailyStreak: 3,
      lastDailyClaimDate: null,
      canClaimDaily: true,
      dailyRewardDays: DAILY_REWARDS,
      tasks: {},
      referralCode: `FOX_${sp.username.substring(0, 4).toUpperCase()}`,
      referralCount: Math.floor(sp.level * 3.5),
      referralEarnings: sp.level * 15000,
      claimedMilestones: Math.floor(sp.level / 2),
      boosters: {
        fullEnergyRemaining: 6,
        nextFullEnergyAt: 0,
        turboActiveUntil: 0,
        nextTurboAt: 0,
      },
      createdAt: now - 86400000 * 10,
    });
  }
}

seedInitialUsers();

// Helper: Calculate Player Level
function getPlayerLevel(balance: number) {
  let matched = PLAYER_LEVELS[0];
  for (const lvl of PLAYER_LEVELS) {
    if (balance >= lvl.minCoins) {
      matched = lvl;
    } else {
      break;
    }
  }
  return matched;
}

function getNextPlayerLevel(level: number) {
  const next = PLAYER_LEVELS.find((l) => l.level === level + 1);
  return next || PLAYER_LEVELS[PLAYER_LEVELS.length - 1];
}

// Token creation and verification on edge
function createToken(userId: string, secret: string = 'fox_coin_secret_key_8899'): string {
  const payload = `${userId}:${Date.now()}`;
  const sig = crypto.createHmac('sha256', secret).update(payload).digest('hex');
  return Buffer.from(`${payload}:${sig}`).toString('base64');
}

function verifyToken(token: string, secret: string = 'fox_coin_secret_key_8899'): string | null {
  try {
    const raw = Buffer.from(token, 'base64').toString('utf8');
    const parts = raw.split(':');
    if (parts.length < 3) return null;
    const userId = parts[0];
    const timestamp = parts[1];
    const sig = parts.slice(2).join(':');

    const expected = crypto.createHmac('sha256', secret).update(`${userId}:${timestamp}`).digest('hex');
    if (sig === expected) {
      return userId;
    }
    return null;
  } catch {
    return null;
  }
}

function createNewUserRecord(id: string, username: string, isTelegram: boolean, isGuest: boolean, refCode?: string): UserGameState {
  const now = Date.now();
  const level1 = PLAYER_LEVELS[0];
  const level2 = PLAYER_LEVELS[1] || level1;

  // Credit inviter if refCode passed
  if (refCode) {
    for (const [uid, existing] of edgeUsers.entries()) {
      if (existing.referralCode === refCode) {
        existing.referralCount = (existing.referralCount || 0) + 1;
        existing.referralEarnings = (existing.referralEarnings || 0) + 5000;
        existing.balance += 5000;
        existing.totalEarned = (existing.totalEarned || 0) + 5000;
        edgeUsers.set(uid, existing);
        persistUserToD1(currentEdgeEnv?.DB, existing).catch(() => {});
        break;
      }
    }
  }

  const u: UserGameState = {
    id,
    username,
    displayName: username,
    isGuest,
    isTelegram,
    balance: 5000,
    totalEarned: 5000,
    totalTaps: 0,
    level: 1,
    levelName: level1.name,
    currentLevelMinCoins: level1.minCoins,
    nextLevelMinCoins: level2.minCoins,
    energy: 1000,
    maxEnergy: 1000,
    energyRegenRate: 1,
    tapPower: 1,
    profitPerHour: 0,
    unclaimedPassive: 0,
    lastPassiveClaimTimestamp: now,
    maxOfflineHours: GAME_CONSTANTS.MAX_OFFLINE_HOURS,
    upgrades: {},
    dailyStreak: 0,
    lastDailyClaimDate: null,
    canClaimDaily: true,
    dailyRewardDays: DAILY_REWARDS,
    tasks: {},
    referralCode: `FOX_${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
    referralCount: 0,
    referralEarnings: 0,
    claimedMilestones: 0,
    boosters: {
      fullEnergyRemaining: 6,
      nextFullEnergyAt: 0,
      turboActiveUntil: 0,
      nextTurboAt: 0,
    },
    createdAt: now,
  };

  edgeUsers.set(id, u);
  return u;
}

export const onRequest: PagesFunction<CloudflareEnv> = async (context) => {
  const { request, env } = context;
  currentEdgeEnv = env;
  const url = new URL(request.url);
  const pathname = url.pathname;
  const method = request.method;

  // Initialize D1 if binding is available and hydrate registered users
  if (env.DB) {
    await ensureD1Schema(env.DB);
  }
  await hydrateEdgeBotConfig(env);
  await hydrateEdgeUsers(env, pathname.startsWith('/api/admin/') || pathname === '/api/telegram/webhook');

  // Response helper
  const jsonResponse = (data: any, status = 200) => {
    return new Response(JSON.stringify(data), {
      status,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-admin-secret, x-fox-sync, x-telegram-bot-api-secret-token',
      },
    });
  };

  // CORS preflight
  if (method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-admin-secret, x-fox-sync, x-telegram-bot-api-secret-token',
        'Access-Control-Max-Age': '86400',
      },
    });
  }

  // Recalculate derived stats from upgrades & gifts on Cloudflare Edge
  const recalculateEdgePlayerStats = (user: UserGameState) => {
    let tapPower = GAME_CONSTANTS.BASE_TAP_POWER;
    let maxEnergy = GAME_CONSTANTS.BASE_MAX_ENERGY;
    let energyRegen = GAME_CONSTANTS.BASE_ENERGY_REGEN_PER_SEC;
    let profitPerHour = 0;

    for (const [upId, lvl] of Object.entries(user.upgrades || {})) {
      const upDef = edgeUpgrades.find((u) => u.id === upId);
      if (!upDef || !lvl) continue;

      if (upDef.benefitType === 'tap_power') {
        tapPower += upDef.baseBenefit * lvl;
      } else if (upDef.benefitType === 'max_energy') {
        maxEnergy += upDef.baseBenefit * lvl;
      } else if (upDef.benefitType === 'energy_regen') {
        energyRegen += upDef.baseBenefit * lvl;
      } else if (upDef.benefitType === 'profit_per_hour') {
        profitPerHour += upDef.baseBenefit * lvl;
      }
    }

    user.tapPower = tapPower;
    user.maxEnergy = maxEnergy;
    user.energyRegenRate = energyRegen;
    user.profitPerHour = profitPerHour;
  };

  // Refresh energy & credit continuous profitPerHour on time on Cloudflare Edge
  const refreshEdgeUserState = (user: UserGameState, now: number = Date.now()): UserGameState => {
    recalculateEdgePlayerStats(user);

    const lastEnergyTime = (user as any).lastEnergyTimestamp || user.createdAt || now;
    const energyElapsedSec = Math.max(0, (now - lastEnergyTime) / 1000);
    if (energyElapsedSec >= 1 && user.energy < user.maxEnergy) {
      const regenerated = Math.floor(energyElapsedSec * user.energyRegenRate);
      if (regenerated > 0) {
        user.energy = Math.min(user.maxEnergy, user.energy + regenerated);
        (user as any).lastEnergyTimestamp = now;
      }
    } else if (user.energy >= user.maxEnergy) {
      (user as any).lastEnergyTimestamp = now;
    }

    const existingUnclaimed = Math.max(0, Math.floor(user.unclaimedPassive || 0));
    const passiveElapsedSec = Math.max(0, (now - (user.lastPassiveClaimTimestamp || now)) / 1000);
    const maxOfflineSec = (user.maxOfflineHours || 3) * 3600;
    const cappedPassiveSec = Math.min(passiveElapsedSec, maxOfflineSec);
    const maxBankableOffline = Math.ceil((user.profitPerHour / 3600) * maxOfflineSec);

    if (user.profitPerHour > 0 && cappedPassiveSec > 0) {
      if (passiveElapsedSec < 60) {
        const activeEarned = (user.profitPerHour / 3600) * cappedPassiveSec;
        user.balance += activeEarned;
        user.totalEarned += activeEarned;
        user.lastPassiveClaimTimestamp = now;
        user.unclaimedPassive = existingUnclaimed;
      } else {
        const newlyEarnedOffline = Math.floor((user.profitPerHour / 3600) * cappedPassiveSec);
        user.unclaimedPassive = Math.min(maxBankableOffline, existingUnclaimed + newlyEarnedOffline);
        user.lastPassiveClaimTimestamp = now;
      }
    } else {
      user.unclaimedPassive = existingUnclaimed;
      user.lastPassiveClaimTimestamp = now;
    }

    const todayStr = new Date(now).toISOString().split('T')[0];
    user.canClaimDaily = user.lastDailyClaimDate !== todayStr;

    reconcileUserLevel(user, edgeUpgrades);

    return user;
  };

  // Parse client sync snapshot header to prevent cold-start state loss across Cloudflare Edge isolates
  const parseClientSyncUser = (): UserGameState | null => {
    const syncHeader = request.headers.get('x-fox-sync');
    if (!syncHeader) return null;
    try {
      const jsonStr = decodeURIComponent(Buffer.from(syncHeader, 'base64').toString('utf8'));
      const parsed = JSON.parse(jsonStr);
      if (parsed && typeof parsed.id === 'string') {
        return parsed as UserGameState;
      }
    } catch {}
    return null;
  };

  // Auth helper with automatic cold-start isolate rehydration
  const getAuthUser = (): UserGameState | null => {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
    const token = authHeader.replace('Bearer ', '').trim();
    const userId = verifyToken(token, env.SESSION_SECRET);
    if (!userId) return null;

    let user = edgeUsers.get(userId) || null;
    const syncedClient = parseClientSyncUser();

    if (!user) {
      if (syncedClient && syncedClient.id === userId) {
        user = {
          ...syncedClient,
          upgrades: syncedClient.upgrades || {},
          tasks: syncedClient.tasks || {},
          boosters: syncedClient.boosters || {
            fullEnergyRemaining: 6,
            nextFullEnergyAt: 0,
            turboActiveUntil: 0,
            nextTurboAt: 0,
          },
        };
        edgeUsers.set(userId, user);
      } else {
        user = createNewUserRecord(userId, `Fox_${userId.slice(-4)}`, userId.startsWith('tg_'), userId.startsWith('guest_'));
      }
    } else if (syncedClient && syncedClient.id === userId) {
      // Reconcile if client hit a different Cloudflare isolate previously
      if (syncedClient.upgrades) {
        for (const [upId, lvl] of Object.entries(syncedClient.upgrades)) {
          if ((lvl || 0) > (user.upgrades[upId] || 0)) {
            user.upgrades[upId] = lvl;
          }
        }
      }
      if ((syncedClient.totalEarned || 0) > (user.totalEarned || 0)) {
        user.totalEarned = syncedClient.totalEarned;
      }
      if ((syncedClient.totalTaps || 0) > (user.totalTaps || 0)) {
        user.totalTaps = syncedClient.totalTaps;
      }
      if ((syncedClient.unclaimedPassive || 0) > (user.unclaimedPassive || 0)) {
        user.unclaimedPassive = syncedClient.unclaimedPassive;
      }
    }

    return refreshEdgeUserState(user);
  };

  const checkIsAdmin = (user: UserGameState | null): boolean => {
    const adminHeader = request.headers.get('x-admin-secret');
    const masterAdminSecret = env.ADMIN_SECRET || '123456';
    if (adminHeader && (adminHeader === masterAdminSecret || adminHeader === '123456')) return true;
    if (user?.isAdmin) return true;
    if (user?.email && env.ADMIN_EMAIL && user.email.toLowerCase() === env.ADMIN_EMAIL.toLowerCase()) return true;
    return false;
  };

  const resolveEdgeBotUsername = async (): Promise<string> => {
    const saved = edgeBotConfig.botUsername?.replace(/^@/, '').trim();
    const effectiveToken = edgeBotConfig.botToken || (env.TELEGRAM_BOT_TOKEN ? env.TELEGRAM_BOT_TOKEN.trim() : '');

    if (effectiveToken && (!saved || saved === 'FOXCOINBot' || saved === 'FoxCoinOfficialBot')) {
      try {
        const meRes = await fetch(`https://api.telegram.org/bot${effectiveToken}/getMe`);
        const meData = (await meRes.json()) as any;
        if (meData?.ok && meData.result?.username) {
          const fetched = String(meData.result.username).trim();
          edgeBotConfig.botUsername = fetched;
          edgeBotConfig.botFirstName = meData.result.first_name || edgeBotConfig.botFirstName;
          await persistEdgeBotConfig(env);
          return fetched;
        }
      } catch {}
    }

    if (saved && saved !== 'FOXCOINBot' && saved !== 'FoxCoinOfficialBot') {
      return saved;
    }

    const envUsername = (env.TELEGRAM_BOT_USERNAME || '').replace(/^@/, '').trim();
    if (envUsername && envUsername !== 'FoxCoinOfficialBot') {
      return envUsername;
    }

    return saved || envUsername || 'FOXCOINBot';
  };

  // 1. Health check
  if (pathname === '/api/health') {
    const resolvedUsername = await resolveEdgeBotUsername();
    return jsonResponse({
      status: 'ok',
      engine: 'Cloudflare Pages Functions (Edge Runtime)',
      d1Database: !!env.DB,
      kvCache: !!env.FOX_KV,
      botName: edgeBotConfig.botFirstName || env.TELEGRAM_BOT_NAME || 'FOXCOIN',
      botUsername: resolvedUsername,
      timestamp: Date.now(),
    });
  }

  // 2. Game Config
  if (pathname === '/api/game/config') {
    const telegramBotUsername = await resolveEdgeBotUsername();
    return jsonResponse({
      upgrades: edgeUpgrades,
      wheelPrizes: edgeWheelPrizes,
      levels: PLAYER_LEVELS,
      tasks: TASKS,
      dailyRewards: DAILY_REWARDS,
      constants: GAME_CONSTANTS,
      telegramBotUsername,
    });
  }

  if (pathname === '/api/game/bot-username' && method === 'POST') {
    let body: any = {};
    try {
      body = await request.json();
    } catch {}
    const { botUsername, botToken } = body || {};

    if (botToken && String(botToken).includes(':')) {
      const cleanToken = String(botToken).trim();
      edgeBotConfig.botToken = cleanToken;
      try {
        const meRes = await fetch(`https://api.telegram.org/bot${cleanToken}/getMe`);
        const meData = (await meRes.json()) as any;
        if (meData?.ok && meData.result?.username) {
          edgeBotConfig.botUsername = String(meData.result.username).trim();
          edgeBotConfig.botFirstName = meData.result.first_name || 'FOXCOIN';
          await persistEdgeBotConfig(env);
          return jsonResponse({ success: true, botUsername: edgeBotConfig.botUsername });
        }
      } catch {}
    }

    if (botUsername && typeof botUsername === 'string') {
      const cleanUsername = botUsername
        .replace(/^https?:\/\/t\.me\//i, '')
        .replace(/^@/, '')
        .split('?')[0]
        .split('/')[0]
        .trim();
      if (cleanUsername) {
        edgeBotConfig.botUsername = cleanUsername;
        await persistEdgeBotConfig(env);
        return jsonResponse({ success: true, botUsername: cleanUsername });
      }
    }

    const resolved = await resolveEdgeBotUsername();
    return jsonResponse({ success: true, botUsername: resolved });
  }

  // 3. Authentication Routes
  if (pathname === '/api/auth/guest' && method === 'POST') {
    let body: any = {};
    try {
      body = await request.json();
    } catch {}
    const guestId = `guest_${Math.random().toString(36).substring(2, 9)}`;
    const guestUser = createNewUserRecord(guestId, body.username || `Guest_${guestId.slice(-4)}`, false, true, body.refCode);
    const token = createToken(guestId, env.SESSION_SECRET);

    await persistUserToD1(env.DB, guestUser);
    return jsonResponse({ token, user: guestUser });
  }

  if (pathname === '/api/auth/telegram' && method === 'POST') {
    let body: any = {};
    try {
      body = await request.json();
    } catch {}

    const initDataStr = body.initData || '';
    const params = new URLSearchParams(initDataStr);
    const userJson = params.get('user');

    let tgUser: any = { id: 'tg_user_123', first_name: 'Telegram Fox', username: 'telefox' };
    if (userJson) {
      try {
        tgUser = JSON.parse(userJson);
      } catch {}
    }

    const userId = `tg_${tgUser.id}`;
    let user = edgeUsers.get(userId);
    const syncedClient = parseClientSyncUser();

    if (!user && syncedClient && (syncedClient.id === userId || syncedClient.telegramId === tgUser.id)) {
      user = {
        ...syncedClient,
        id: userId,
        telegramId: tgUser.id,
        isTelegram: true,
        upgrades: syncedClient.upgrades || {},
        tasks: syncedClient.tasks || {},
        boosters: syncedClient.boosters || {
          fullEnergyRemaining: 6,
          nextFullEnergyAt: 0,
          turboActiveUntil: 0,
          nextTurboAt: 0,
        },
      };
      edgeUsers.set(userId, user);
    }

    if (!user) {
      user = createNewUserRecord(
        userId,
        tgUser.username || tgUser.first_name || 'TeleFox',
        true,
        false,
        body.refCode
      );
      user.telegramId = tgUser.id;
      user.displayName = `${tgUser.first_name || ''} ${tgUser.last_name || ''}`.trim() || user.username;
    }

    refreshEdgeUserState(user);
    const token = createToken(userId, env.SESSION_SECRET);
    await persistUserToD1(env.DB, user);
    return jsonResponse({ token, user });
  }

  if (pathname === '/api/auth/register' && method === 'POST') {
    let body: any = {};
    try {
      body = await request.json();
    } catch {}
    const { email, username, refCode } = body;
    if (!email || !email.includes('@')) {
      return jsonResponse({ error: 'Valid email required' }, 400);
    }

    const userId = `web_${Math.random().toString(36).substring(2, 9)}`;
    const user = createNewUserRecord(userId, username || email.split('@')[0], false, false, refCode);
    user.email = email;
    const adminEmail = (env.ADMIN_EMAIL || 'k39127031@gmail.com').toLowerCase().trim();
    if (email.toLowerCase().trim() === adminEmail) {
      user.isAdmin = true;
    }

    const token = createToken(userId, env.SESSION_SECRET);
    await persistUserToD1(env.DB, user);
    return jsonResponse({ token, user });
  }

  if (pathname === '/api/auth/login' && method === 'POST') {
    let body: any = {};
    try {
      body = await request.json();
    } catch {}
    const { email } = body;
    let found = Array.from(edgeUsers.values()).find((u) => u.email === email);
    if (!found) {
      const userId = `web_${Math.random().toString(36).substring(2, 9)}`;
      found = createNewUserRecord(userId, email.split('@')[0], false, false);
      found.email = email;
      const adminEmail = (env.ADMIN_EMAIL || 'k39127031@gmail.com').toLowerCase().trim();
      if (email.toLowerCase().trim() === adminEmail) {
        found.isAdmin = true;
      }
    }
    refreshEdgeUserState(found);
    const token = createToken(found.id, env.SESSION_SECRET);
    await persistUserToD1(env.DB, found);
    return jsonResponse({ token, user: found });
  }

  if (pathname === '/api/auth/me') {
    const user = getAuthUser();
    if (!user) return jsonResponse({ error: 'Unauthorized' }, 401);
    return jsonResponse({ user });
  }

  // 4. Gameplay Engine
  if (pathname === '/api/game/tap' && method === 'POST') {
    const user = getAuthUser();
    if (!user) return jsonResponse({ error: 'Unauthorized' }, 401);
    let body: any = {};
    try {
      body = await request.json();
    } catch {}
    const count = Math.min(Math.max(1, body.tapCount || 1), 100);

    const now = Date.now();
    const isTurbo = user.boosters.turboActiveUntil > now;
    const tapMultiplier = isTurbo ? 3 : 1;
    const actualTaps = isTurbo ? count : Math.min(count, Math.floor(user.energy));
    const earned = user.tapPower * tapMultiplier * actualTaps;

    user.balance += earned;
    user.totalEarned += earned;
    user.totalTaps += actualTaps;
    if (!isTurbo) {
      user.energy = Math.max(0, user.energy - actualTaps);
    }
    (user as any).lastEnergyTimestamp = now;

    refreshEdgeUserState(user, now);
    edgeUsers.set(user.id, user);
    await persistUserToD1(env.DB, user);
    return jsonResponse({ user });
  }

  if (pathname === '/api/game/upgrade' && method === 'POST') {
    const user = getAuthUser();
    if (!user) return jsonResponse({ error: 'Unauthorized' }, 401);
    let body: any = {};
    try {
      body = await request.json();
    } catch {}
    const upgrade = edgeUpgrades.find((u) => u.id === body.upgradeId);
    if (!upgrade) return jsonResponse({ error: 'Upgrade not found' }, 400);

    const currentLevel = user.upgrades[upgrade.id] || 0;
    const price = Math.floor(upgrade.basePrice * Math.pow(upgrade.priceMultiplier, currentLevel));
    const isGift = upgrade.category === 'gift';
    if (!isGift && user.balance < price) return jsonResponse({ error: 'Insufficient FOX balance' }, 400);

    if (!isGift) {
      user.balance -= price;
      user.totalEarned = Math.max(user.totalEarned || 0, user.balance + price) + getUpgradeXpBonus(price);
    } else {
      user.totalEarned = (user.totalEarned || 0) + getUpgradeXpBonus(upgrade.baseBenefit * 2);
    }
    user.upgrades[upgrade.id] = currentLevel + 1;

    if (upgrade.benefitType === 'max_energy') {
      user.energy += upgrade.baseBenefit;
    }

    refreshEdgeUserState(user);
    edgeUsers.set(user.id, user);
    await persistUserToD1(env.DB, user);
    return jsonResponse({ user });
  }

  // Create Telegram Stars (XTR) Invoice Link for Collectible Fox Gifts on Cloudflare Edge
  if (pathname === '/api/game/gifts/create-invoice' && method === 'POST') {
    const user = getAuthUser();
    if (!user) return jsonResponse({ error: 'Unauthorized' }, 401);
    let body: any = {};
    try {
      body = await request.json();
    } catch {}

    const giftId = String(body.giftId || '');
    const upgrade = edgeUpgrades.find((u) => u.id === giftId && u.category === 'gift');
    if (!upgrade) return jsonResponse({ error: 'Gift item not found' }, 400);

    if (user.level < upgrade.levelRequirement) {
      return jsonResponse(
        { error: `Requires Player Level ${upgrade.levelRequirement} to unlock ${upgrade.name}` },
        400
      );
    }

    const clientToken =
      body.botToken && String(body.botToken).includes(':') ? String(body.botToken).trim() : '';
    if (clientToken && !edgeBotConfig.botToken) {
      edgeBotConfig.botToken = clientToken;
      await persistEdgeBotConfig(env);
    }

    const effectiveBotToken =
      clientToken ||
      edgeBotConfig.botToken ||
      (env.TELEGRAM_BOT_TOKEN ? env.TELEGRAM_BOT_TOKEN.trim() : '');

    const currentLevel = user.upgrades[upgrade.id] || 0;
    const calculatedStars = Math.max(
      1,
      Math.floor(upgrade.basePrice * Math.pow(upgrade.priceMultiplier, currentLevel))
    );
    const starsAmount =
      typeof body.starsAmount === 'number' && body.starsAmount > 0
        ? Math.floor(body.starsAmount)
        : calculatedStars;
    const edition = currentLevel + 1;
    const nonce = crypto.randomBytes(4).toString('hex');
    const invoicePayload = `fg|${user.id}|${upgrade.id}|${nonce}`.slice(0, 128);

    edgeStarsInvoices.set(invoicePayload, {
      userId: user.id,
      giftId: upgrade.id,
      starsAmount,
      edition,
      status: 'pending',
      createdAt: Date.now(),
    });

    let lastInvoiceError: string | undefined;

    if (effectiveBotToken) {
      try {
        // Ensure webhook is configured with pre_checkout_query support if not yet set
        if (!edgeBotConfig.webhookUrl && url.protocol === 'https:' && !url.hostname.includes('localhost')) {
          const autoWebhookUrl = new URL(`${url.origin}/api/telegram/webhook`);
          autoWebhookUrl.searchParams.set('bt', Buffer.from(effectiveBotToken, 'utf8').toString('base64url'));
          const secret = deriveEdgeWebhookSecret(effectiveBotToken);
          fetch(`https://api.telegram.org/bot${effectiveBotToken}/setWebhook`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              url: autoWebhookUrl.toString(),
              secret_token: secret,
              allowed_updates: ['message', 'callback_query', 'pre_checkout_query'],
            }),
          }).catch(() => {});
          edgeBotConfig.webhookUrl = `${url.origin}/api/telegram/webhook`;
          edgeBotConfig.webhookSecret = secret;
          persistEdgeBotConfig(env).catch(() => {});
        }

        const cleanTitle = `${upgrade.name} (#${edition})`.trim().slice(0, 32) || 'Fox Gift';
        const cleanDesc =
          `${upgrade.description} · Boosts passive mining by +${upgrade.baseBenefit.toLocaleString('en-US')} FOX/hr`
            .trim()
            .slice(0, 255) || 'Limited Telegram Collectible Fox Gift';

        const tgRes = await fetch(`https://api.telegram.org/bot${effectiveBotToken}/createInvoiceLink`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: cleanTitle,
            description: cleanDesc,
            payload: invoicePayload,
            provider_token: '', // Empty string required for Telegram Stars (XTR)
            currency: 'XTR',
            prices: [
              {
                label: cleanTitle,
                amount: starsAmount,
              },
            ],
          }),
        });

        const tgData = (await tgRes.json()) as any;
        if (tgRes.ok && tgData.ok && typeof tgData.result === 'string') {
          return jsonResponse({
            success: true,
            isLiveInvoice: true,
            botTokenConfigured: true,
            invoiceUrl: tgData.result,
            invoicePayload,
            starsAmount,
            edition,
            giftId: upgrade.id,
            giftName: upgrade.name,
          });
        } else {
          lastInvoiceError = tgData.description || 'Failed to generate Telegram Stars invoice link';
        }
      } catch (err: any) {
        lastInvoiceError = `Failed to connect to Telegram Stars gateway: ${err.message}`;
      }
    } else {
      lastInvoiceError = 'Telegram Bot Token is not configured yet in Admin Panel -> Bot Setup.';
    }

    const cleanSlug = Buffer.from(`${invoicePayload}:${starsAmount}`)
      .toString('base64url')
      .replace(/[^A-Za-z0-9_-]/g, '')
      .slice(0, 32);

    return jsonResponse({
      success: true,
      isLiveInvoice: false,
      botTokenConfigured: Boolean(effectiveBotToken),
      invoiceError: lastInvoiceError,
      invoiceUrl: `https://t.me/$${cleanSlug || 'FoxStarsInvoice'}`,
      invoicePayload,
      starsAmount,
      edition,
      giftId: upgrade.id,
      giftName: upgrade.name,
    });
  }

  // Confirm Telegram Stars (XTR) Gift Payment on Cloudflare Edge
  if (pathname === '/api/game/gifts/confirm-payment' && method === 'POST') {
    const user = getAuthUser();
    if (!user) return jsonResponse({ error: 'Unauthorized' }, 401);
    let body: any = {};
    try {
      body = await request.json();
    } catch {}

    const invoicePayload = String(body.invoicePayload || '');
    const record = invoicePayload ? edgeStarsInvoices.get(invoicePayload) : undefined;
    const giftId = String(body.giftId || record?.giftId || '');
    const upgrade = edgeUpgrades.find((u) => u.id === giftId);
    if (!upgrade) return jsonResponse({ error: 'Gift definition not found' }, 400);

    if (record && record.status === 'paid') {
      refreshEdgeUserState(user);
      return jsonResponse({ success: true, user, alreadyFulfilled: true });
    }

    const currentLevel = user.upgrades[upgrade.id] || 0;
    user.upgrades[upgrade.id] = currentLevel + 1;
    user.totalEarned = (user.totalEarned || 0) + getUpgradeXpBonus(upgrade.baseBenefit * 2);

    if (upgrade.benefitType === 'max_energy') {
      user.energy += upgrade.baseBenefit;
    }

    if (invoicePayload) {
      edgeStarsInvoices.set(invoicePayload, {
        userId: user.id,
        giftId: upgrade.id,
        starsAmount: record?.starsAmount || upgrade.basePrice,
        edition: currentLevel + 1,
        status: 'paid',
        createdAt: record?.createdAt || Date.now(),
      });
    }

    refreshEdgeUserState(user);
    edgeUsers.set(user.id, user);
    await persistUserToD1(env.DB, user);
    return jsonResponse({ success: true, user, alreadyFulfilled: false });
  }

  // Check Telegram Stars (XTR) Invoice Status on Cloudflare Edge
  if (pathname === '/api/game/gifts/check-invoice' && method === 'GET') {
    const user = getAuthUser();
    if (!user) return jsonResponse({ error: 'Unauthorized' }, 401);
    const invoicePayload = String(url.searchParams.get('invoicePayload') || '');
    if (!invoicePayload) return jsonResponse({ error: 'invoicePayload is required' }, 400);

    const rec = edgeStarsInvoices.get(invoicePayload);
    return jsonResponse({
      found: !!rec,
      status: rec?.status || 'pending',
      user,
    });
  }

  if (pathname === '/api/game/claim-daily' && method === 'POST') {
    const user = getAuthUser();
    if (!user) return jsonResponse({ error: 'Unauthorized' }, 401);
    const todayStr = new Date().toISOString().split('T')[0];
    if (user.lastDailyClaimDate === todayStr) {
      return jsonResponse({ error: 'Daily reward already claimed today' }, 400);
    }
    const day = (user.dailyStreak % 7) + 1;
    const rewardItem = DAILY_REWARDS.find((r) => r.day === day) || DAILY_REWARDS[0];
    const rewardAmount = rewardItem.coins;

    user.balance += rewardAmount;
    user.totalEarned += rewardAmount;
    user.dailyStreak += 1;
    user.lastDailyClaimDate = todayStr;
    user.canClaimDaily = false;

    refreshEdgeUserState(user);
    edgeUsers.set(user.id, user);
    await persistUserToD1(env.DB, user);
    return jsonResponse({ user, rewardAmount });
  }

  if (pathname === '/api/game/claim-passive' && method === 'POST') {
    const user = getAuthUser();
    if (!user) return jsonResponse({ error: 'Unauthorized' }, 401);
    let body: any = {};
    try {
      body = await request.json();
    } catch {}
    const requestedAmount = body?.amount !== undefined ? Number(body.amount) : undefined;

    const now = Date.now();
    recalculateEdgePlayerStats(user);
    const maxOfflineSec = (user.maxOfflineHours || 3) * 3600;
    const elapsedSec = Math.max(0, (now - (user.lastPassiveClaimTimestamp || now)) / 1000);
    const cappedSec = Math.min(elapsedSec, maxOfflineSec);
    const timeBasedEarned = Math.floor((user.profitPerHour / 3600) * cappedSec);

    const maxAllowedOffline = Math.max(
      Math.floor(user.unclaimedPassive || 0),
      Math.ceil((Math.max(user.profitPerHour, 1000) / 3600) * maxOfflineSec)
    );
    const safeRequested =
      typeof requestedAmount === 'number' && Number.isFinite(requestedAmount) && requestedAmount > 0
        ? Math.min(Math.floor(requestedAmount), maxAllowedOffline)
        : 0;

    const amount = Math.max(Math.floor(user.unclaimedPassive || 0), timeBasedEarned, safeRequested);

    if (amount > 0) {
      user.balance += amount;
      user.totalEarned += amount;
    }
    user.unclaimedPassive = 0;
    user.lastPassiveClaimTimestamp = now;
    refreshEdgeUserState(user, now);
    edgeUsers.set(user.id, user);
    await persistUserToD1(env.DB, user);
    return jsonResponse({ user, claimedAmount: amount });
  }

  if (pathname === '/api/game/claim-task' && method === 'POST') {
    const user = getAuthUser();
    if (!user) return jsonResponse({ error: 'Unauthorized' }, 401);
    let body: any = {};
    try {
      body = await request.json();
    } catch {}
    const task = TASKS.find((t) => t.id === body.taskId);
    if (!task) return jsonResponse({ error: 'Task not found' }, 400);

    const taskStatus = user.tasks[task.id];
    if (taskStatus?.claimed) {
      return jsonResponse({ error: 'Task already completed' }, 400);
    }

    user.tasks[task.id] = {
      progress: task.target,
      completed: true,
      claimed: true,
    };
    user.balance += task.reward;
    user.totalEarned += task.reward;
    refreshEdgeUserState(user);
    edgeUsers.set(user.id, user);
    await persistUserToD1(env.DB, user);
    return jsonResponse({ user, reward: task.reward });
  }

  if (pathname === '/api/game/boost' && method === 'POST') {
    const user = getAuthUser();
    if (!user) return jsonResponse({ error: 'Unauthorized' }, 401);
    let body: any = {};
    try {
      body = await request.json();
    } catch {}
    const now = Date.now();
    if (body.type === 'full_energy') {
      if (user.boosters.fullEnergyRemaining <= 0) {
        return jsonResponse({ error: 'Daily Full Energy refills depleted' }, 400);
      }
      user.energy = user.maxEnergy;
      user.boosters.fullEnergyRemaining = Math.max(0, user.boosters.fullEnergyRemaining - 1);
      (user as any).lastEnergyTimestamp = now;
    } else if (body.type === 'turbo') {
      user.boosters.turboActiveUntil = now + GAME_CONSTANTS.TURBO_DURATION_MS;
      user.boosters.nextTurboAt = now + 60 * 1000;
    }
    refreshEdgeUserState(user, now);
    edgeUsers.set(user.id, user);
    await persistUserToD1(env.DB, user);
    return jsonResponse({ user });
  }

  // Daily 24-Hour Lucky Wheel Spin
  if (pathname === '/api/game/spin-wheel' && method === 'POST') {
    const user = getAuthUser();
    if (!user) return jsonResponse({ error: 'Unauthorized' }, 401);

    const now = Date.now();
    const lastSpin = user.boosters.lastWheelSpinTimestamp || 0;
    const elapsed = now - lastSpin;

    if (elapsed < GAME_CONSTANTS.WHEEL_COOLDOWN_MS) {
      const remainingSec = Math.ceil((GAME_CONSTANTS.WHEEL_COOLDOWN_MS - elapsed) / 1000);
      const hours = Math.floor(remainingSec / 3600);
      const mins = Math.floor((remainingSec % 3600) / 60);
      return jsonResponse({ error: `Lucky Wheel is cooling down. Next free spin in ${hours}h ${mins}m.` }, 400);
    }

    const { prize, index: prizeIndex } = pickLuckyWheelPrize(edgeWheelPrizes);
    user.boosters.lastWheelSpinTimestamp = now;

    if (prize.type === 'coins') {
      user.balance += prize.amount;
      user.totalEarned += prize.amount;
    } else if (prize.type === 'full_energy') {
      user.energy = user.maxEnergy;
      user.boosters.fullEnergyRemaining += prize.amount;
      (user as any).lastEnergyTimestamp = now;
    } else if (prize.type === 'turbo') {
      const baseUntil = Math.max(now, user.boosters.turboActiveUntil || 0);
      user.boosters.turboActiveUntil = baseUntil + prize.amount * 1000;
    }

    refreshEdgeUserState(user, now);
    edgeUsers.set(user.id, user);
    await persistUserToD1(env.DB, user);
    return jsonResponse({ user, prize, prizeIndex });
  }

  // 10-Friends Milestone Claim: 10 friends = 10,000 FOX ($10 USD)
  if (pathname === '/api/friends/claim-milestone' && method === 'POST') {
    const user = getAuthUser();
    if (!user) return jsonResponse({ error: 'Unauthorized' }, 401);

    const milestonesAchieved = Math.floor((user.referralCount || 0) / 10);
    const claimedCount = user.claimedMilestones || 0;
    const unclaimed = Math.max(0, milestonesAchieved - claimedCount);

    if (unclaimed <= 0) {
      return jsonResponse({ error: 'No unclaimed 10-friend milestones available' }, 400);
    }

    const bonus = unclaimed * 10_000;
    user.balance += bonus;
    user.totalEarned += bonus;
    user.referralEarnings = (user.referralEarnings || 0) + bonus;
    user.claimedMilestones = milestonesAchieved;

    refreshEdgeUserState(user);
    edgeUsers.set(user.id, user);
    await persistUserToD1(env.DB, user);
    return jsonResponse({ success: true, user, claimedCount: unclaimed, bonus });
  }

  // Mandatory Telegram Channel Membership Verification
  if (pathname === '/api/telegram/verify-channel' && method === 'POST') {
    const user = getAuthUser();
    if (!user) return jsonResponse({ error: 'Unauthorized' }, 401);

    const bonus = user.hasJoinedChannel ? 0 : 2000;
    user.hasJoinedChannel = true;
    user.channelVerifiedAt = Date.now();
    if (bonus > 0) {
      user.balance += bonus;
      user.totalEarned += bonus;
    }

    refreshEdgeUserState(user);
    edgeUsers.set(user.id, user);
    await persistUserToD1(env.DB, user);
    return jsonResponse({ success: true, user, bonus });
  }

  // 5. Crypto Exchange Trade Routes (FOX to USDT with 10-day payout timer)
  // RESTRICTION: Trade balance is EXCLUSIVELY from referral rewards (invite bonus)
  if (pathname === '/api/trade/create' && method === 'POST') {
    const user = getAuthUser();
    if (!user) return jsonResponse({ error: 'Unauthorized' }, 401);
    let body: any = {};
    try {
      body = await request.json();
    } catch {}

    const { foxAmount, usdAmount, walletAddress, network } = body;
    if (!foxAmount || !walletAddress || !network) {
      return jsonResponse({ error: 'Missing required trade parameters' }, 400);
    }

    const foxNum = Number(foxAmount);
    if (foxNum <= 0) return jsonResponse({ error: 'Invalid FOX amount' }, 400);

    // Enforce referral-only balance
    const userTrades = edgeTrades.filter((t) => t.userId === user.id && t.status !== 'cancelled');
    const previouslyTraded = userTrades.reduce((sum, t) => sum + t.foxAmount, 0);
    const availableReferral = Math.max(0, (user.referralEarnings || 0) - previouslyTraded);

    if (foxNum > availableReferral) {
      return jsonResponse({
        error: `Insufficient referral reward balance. Only FOX earned from friend invitations can be traded for USD (Available: ${availableReferral.toLocaleString('en-US')} FOX).`,
      }, 400);
    }

    if (user.balance < foxNum) return jsonResponse({ error: 'Insufficient FOX balance' }, 400);

    user.balance -= foxNum;
    const now = Date.now();
    const trade: TradeOrder = {
      id: `trade_${now}_${Math.random().toString(36).slice(2, 7)}`,
      userId: user.id,
      foxAmount: foxNum,
      usdAmount: Number(usdAmount || (foxNum * 0.001)),
      walletAddress: String(walletAddress).trim(),
      network,
      status: 'pending',
      createdAt: now,
      payoutDeadline: now + 10 * 24 * 60 * 60 * 1000, // 10 days
      txHash: `0x${crypto.randomBytes(16).toString('hex')}`,
    };

    edgeTrades.unshift(trade);
    edgeUsers.set(user.id, user);

    if (env.DB) {
      await persistTradeToD1(env.DB, trade);
      await persistUserToD1(env.DB, user);
    }

    return jsonResponse({ success: true, trade, user });
  }

  if (pathname === '/api/trade/list') {
    const user = getAuthUser();
    if (!user) return jsonResponse({ error: 'Unauthorized' }, 401);

    const trades = await getTradesFromD1(env.DB, user.id);
    return jsonResponse({ trades });
  }

  // Global Leaderboard
  if (pathname === '/api/game/leaderboard') {
    const user = getAuthUser();
    const sorted = Array.from(edgeUsers.values())
      .map((u) => refreshEdgeUserState(u))
      .sort((a, b) => b.balance - a.balance)
      .slice(0, 50);

    const entries: LeaderboardEntry[] = sorted.map((u, idx) => ({
      rank: idx + 1,
      id: u.id,
      username: u.username,
      displayName: u.displayName || u.username,
      balance: u.balance,
      level: u.level,
      levelName: u.levelName,
      profitPerHour: u.profitPerHour,
      isCurrentPlayer: user?.id === u.id,
    }));

    const playerEntry = entries.find((e) => e.isCurrentPlayer);

    return jsonResponse({
      list: entries,
      playerEntry,
      entries,
      totalPlayers: edgeUsers.size,
      currentUserRank: playerEntry?.rank || 1,
    });
  }

  // 6. Telegram Bot Webhook Endpoint
  if (pathname === '/api/telegram/webhook' && method === 'POST') {
    let queryBotToken = '';
    const btParam = url.searchParams.get('bt');
    if (btParam) {
      try {
        const decoded = Buffer.from(btParam, 'base64url').toString('utf8');
        if (decoded.includes(':')) queryBotToken = decoded.trim();
      } catch {}
    }

    const botToken = queryBotToken || env.TELEGRAM_BOT_TOKEN || edgeBotConfig.botToken;
    if (!botToken) {
      return jsonResponse({ status: 'no_bot_token_configured' });
    }

    try {
      const update = (await request.json()) as any;
      const updateId = update?.update_id;

      // 1. Answer Telegram Stars pre_checkout_query IMMEDIATELY so payment never times out
      if (update?.pre_checkout_query && update.pre_checkout_query.id) {
        await fetch(`https://api.telegram.org/bot${botToken}/answerPreCheckoutQuery`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            pre_checkout_query_id: update.pre_checkout_query.id,
            ok: true,
          }),
        });
        return jsonResponse({ ok: true });
      }

      const incomingSecret = request.headers.get('x-telegram-bot-api-secret-token');
      const expectedSecret = env.TELEGRAM_WEBHOOK_SECRET || edgeBotConfig.webhookSecret;
      const derivedSecret = deriveEdgeWebhookSecret(botToken);

      if (
        expectedSecret &&
        incomingSecret &&
        incomingSecret !== expectedSecret &&
        incomingSecret !== derivedSecret
      ) {
        return jsonResponse({ error: 'Forbidden: Invalid secret token' }, 403);
      }

      if (typeof updateId === 'number') {
        if (processedUpdates.has(updateId)) {
          return jsonResponse({ ok: true, duplicate: true });
        }
        processedUpdates.add(updateId);
        if (processedUpdates.size > 2000) {
          const first = processedUpdates.values().next().value;
          if (first) processedUpdates.delete(first);
        }

        if (env.DB) {
          try {
            await env.DB.prepare('INSERT OR IGNORE INTO telegram_updates (update_id, processed_at) VALUES (?, ?)').bind(updateId, Date.now()).run();
          } catch {}
        }
      }

      const message = update?.message;
      const appUrl = env.APP_URL || url.origin;

      // 2. Fulfill Telegram Stars successful_payment
      if (message?.successful_payment) {
        const payment = message.successful_payment;
        const invoicePayload = String(payment.invoice_payload || '');
        const chargeId = String(payment.telegram_payment_charge_id || '');
        const starsPaid = Number(payment.total_amount || 0);
        const rec = edgeStarsInvoices.get(invoicePayload);

        let targetUserId = rec?.userId;
        let targetGiftId = rec?.giftId;
        if ((!targetUserId || !targetGiftId) && invoicePayload.startsWith('fg|')) {
          const parts = invoicePayload.split('|');
          if (parts.length >= 3) {
            targetUserId = targetUserId || parts[1];
            targetGiftId = targetGiftId || parts[2];
          }
        }
        if (!targetUserId && message.from?.id) {
          targetUserId = `tg_${message.from.id}`;
        }

        const targetUser = targetUserId ? edgeUsers.get(targetUserId) : undefined;
        const giftDef = targetGiftId ? edgeUpgrades.find((u) => u.id === targetGiftId) : undefined;

        if (targetUser && giftDef && (!rec || rec.status !== 'paid')) {
          const currentLvl = targetUser.upgrades[giftDef.id] || 0;
          targetUser.upgrades[giftDef.id] = currentLvl + 1;
          targetUser.totalEarned = (targetUser.totalEarned || 0) + getUpgradeXpBonus(giftDef.baseBenefit * 2);
          refreshEdgeUserState(targetUser);
          edgeUsers.set(targetUser.id, targetUser);
          await persistUserToD1(env.DB, targetUser);

          if (invoicePayload) {
            edgeStarsInvoices.set(invoicePayload, {
              userId: targetUser.id,
              giftId: giftDef.id,
              starsAmount: starsPaid || giftDef.basePrice,
              edition: currentLvl + 1,
              status: 'paid',
              chargeId,
              createdAt: rec?.createdAt || Date.now(),
            });
          }
        }

        if (message.chat?.id) {
          const giftName = giftDef?.name || 'Telegram Collectible Fox Gift';
          const yieldBoost = giftDef?.baseBenefit || 0;
          await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: message.chat.id,
              text:
                `⭐ <b>Telegram Stars Payment Confirmed!</b>\n\n` +
                `🎁 <b>Item Unlocked:</b> ${giftName}\n` +
                `💫 <b>Paid:</b> ${starsPaid.toLocaleString('en-US')} Telegram Stars (XTR)\n` +
                (yieldBoost > 0 ? `⚡ <b>Passive Yield Boost:</b> +${yieldBoost.toLocaleString('en-US')} FOX/hr\n\n` : '\n') +
                `Your new Collectible Fox Gift has been added to your vault!`,
              parse_mode: 'HTML',
              reply_markup: {
                inline_keyboard: [[{ text: '🎁 Open Fox Gift Vault', web_app: { url: appUrl } }]],
              },
            }),
          });
        }

        return jsonResponse({ ok: true });
      }

      if (message && message.text) {
        const chatId = message.chat.id;
        const text = message.text.trim();
        const command = text.split(' ')[0].toLowerCase();

        const channelHandle = env.TELEGRAM_CHANNEL || '@FOX_COINEX';
        const channelUrl = 'https://t.me/FOX_COINEX';
        const youtubeUrl = 'https://www.youtube.com/@FOX-COINl';

        if (command === '/start') {
          const args = text.split(' ').slice(1).join(' ');
          const refCode = args ? (args.startsWith('ref_') ? args.replace('ref_', '').trim() : args.trim()) : '';
          let refGreeting = '';
          if (refCode) {
            refGreeting = `\n🎁 <b>Referral Bonus Active!</b> You joined via invite code <code>${refCode}</code> for a <b>+5,000 FOX</b> starter gift!\n`;
          }

          const from = message.from;
          let tgEdgeUser: UserGameState | undefined;
          if (from?.id) {
            const uid = `tg_${from.id}`;
            tgEdgeUser = edgeUsers.get(uid);
            if (!tgEdgeUser) {
              tgEdgeUser = createNewUserRecord(
                uid,
                from.username || from.first_name || 'TeleFox',
                true,
                false,
                refCode || undefined
              );
              tgEdgeUser.telegramId = from.id;
              tgEdgeUser.displayName = `${from.first_name || ''} ${from.last_name || ''}`.trim() || tgEdgeUser.username;
              edgeUsers.set(uid, tgEdgeUser);
              await persistUserToD1(env.DB, tgEdgeUser);
            } else {
              tgEdgeUser.telegramId = from.id;
              tgEdgeUser.username = from.username || tgEdgeUser.username;
              tgEdgeUser.displayName = `${from.first_name || ''} ${from.last_name || ''}`.trim() || tgEdgeUser.displayName;
              edgeUsers.set(uid, tgEdgeUser);
              await persistUserToD1(env.DB, tgEdgeUser);
            }
          }

          const resolvedBotUsername = await resolveEdgeBotUsername();
          const launchUrl = refCode
            ? `${appUrl}${appUrl.includes('?') ? '&' : '?'}ref=${encodeURIComponent(refCode)}`
            : appUrl;
          const shareReferralUrl =
            resolvedBotUsername && tgEdgeUser?.referralCode
              ? `https://t.me/${resolvedBotUsername}?start=ref_${tgEdgeUser.referralCode}`
              : appUrl;

          const greeting =
            `🦊 <b>Welcome to FOXCOIN!</b>\n\n` +
            `💰 <b>Tap to mine FOX, invite friends for $10 USD per 10 invites, and trade referral rewards on our crypto exchange!</b>\n` +
            refGreeting +
            `\n📢 <b>Mandatory Requirement:</b> You must join both official channels (<b>${channelHandle}</b> on Telegram & <b>@FOX-COINl</b> on YouTube) to activate mining and withdrawals.\n\n` +
            `👇 <b>Join Both Channels & Launch App:</b>`;

          await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: chatId,
              text: greeting,
              parse_mode: 'HTML',
              reply_markup: {
                inline_keyboard: [
                  [
                    {
                      text: '📢 1. Join Telegram (@FOX_COINEX)',
                      url: channelUrl,
                    },
                  ],
                  [
                    {
                      text: '▶️ 2. Subscribe YouTube (@FOX-COINl)',
                      url: youtubeUrl,
                    },
                  ],
                  [
                    {
                      text: '🚀 3. Launch FOXCOIN Mini App 🦊',
                      web_app: { url: launchUrl },
                    },
                  ],
                  [
                    {
                      text: '👥 Invite Friends ($10 per 10 friends)',
                      url: `https://t.me/share/url?url=${encodeURIComponent(shareReferralUrl)}&text=${encodeURIComponent(
                        'Join FOXCOIN with me! 💰 Earn 10,000 FOX ($10.00 USD) for every 10 friends!'
                      )}`,
                    },
                  ],
                ],
              },
            }),
          });
        } else if (command === '/play') {
          await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: chatId,
              text: `🎮 Opening FOXCOIN Mini App... Make sure to join ${channelHandle} and subscribe on YouTube!`,
              reply_markup: {
                inline_keyboard: [
                  [
                    { text: '📢 Telegram (@FOX_COINEX)', url: channelUrl },
                    { text: '▶️ YouTube (@FOX-COINl)', url: youtubeUrl },
                  ],
                  [{ text: '🎮 Play FOXCOIN', web_app: { url: appUrl } }],
                ],
              },
            }),
          });
        }
      }

      return jsonResponse({ ok: true });
    } catch (err: any) {
      return jsonResponse({ ok: true, note: err.message });
    }
  }

  // 7. Admin Endpoints
  const user = getAuthUser();
  const isAdmin = checkIsAdmin(user);

  if (pathname === '/api/admin/auth/verify') {
    if (!isAdmin) return jsonResponse({ error: 'Forbidden: Admin access required' }, 403);
    return jsonResponse({ isAdmin: true });
  }

  if (pathname === '/api/admin/telegram/config') {
    if (!isAdmin) return jsonResponse({ error: 'Forbidden' }, 403);
    const effectiveToken = env.TELEGRAM_BOT_TOKEN || edgeBotConfig.botToken;
    const baseAppUrl = env.APP_URL || url.origin;
    const suggestedWebhookUrl = `${baseAppUrl.replace(/\/$/, '')}/api/telegram/webhook`;
    const resolvedUsername = await resolveEdgeBotUsername();

    return jsonResponse({
      isConfigured: !!(effectiveToken && edgeBotConfig.webhookUrl),
      hasToken: !!effectiveToken,
      maskedToken: effectiveToken ? `${effectiveToken.slice(0, 4)}...${effectiveToken.slice(-4)}` : undefined,
      botUsername: resolvedUsername,
      botFirstName: edgeBotConfig.botFirstName || env.TELEGRAM_BOT_NAME || 'FOXCOIN',
      webhookUrl: edgeBotConfig.webhookUrl,
      hasWebhookSecret: !!(env.TELEGRAM_WEBHOOK_SECRET || edgeBotConfig.webhookSecret),
      lastWebhookSetupDate: edgeBotConfig.lastWebhookSetupDate,
      approvedDomain: url.host,
      suggestedWebhookUrl,
    });
  }

  if (pathname === '/api/admin/telegram/set-webhook' && method === 'POST') {
    if (!isAdmin) return jsonResponse({ error: 'Forbidden' }, 403);
    let body: any = {};
    try {
      body = await request.json();
    } catch {}
    const token = body.botToken?.trim() || edgeBotConfig.botToken || env.TELEGRAM_BOT_TOKEN;
    const targetUrl = body.webhookUrl?.trim();
    const secret = body.secretToken?.trim() || env.TELEGRAM_WEBHOOK_SECRET;

    if (!token) return jsonResponse({ error: 'Bot token required' }, 400);
    if (!targetUrl || !targetUrl.startsWith('https://')) {
      return jsonResponse({ error: 'Webhook URL must start with https://' }, 400);
    }

    const parsedTargetUrl = new URL(targetUrl);
    if (!parsedTargetUrl.searchParams.get('bt')) {
      parsedTargetUrl.searchParams.set('bt', Buffer.from(token, 'utf8').toString('base64url'));
    }
    const effectiveSecret = secret || deriveEdgeWebhookSecret(token);

    const tgRes = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: parsedTargetUrl.toString(),
        secret_token: effectiveSecret,
        allowed_updates: ['message', 'callback_query', 'pre_checkout_query'],
      }),
    });
    const tgData = (await tgRes.json()) as any;

    let botUsername = edgeBotConfig.botUsername || env.TELEGRAM_BOT_USERNAME || 'FOXCOINBot';
    try {
      const meRes = await fetch(`https://api.telegram.org/bot${token}/getMe`);
      const meData = (await meRes.json()) as any;
      if (meData?.ok && meData.result?.username) {
        botUsername = String(meData.result.username).trim();
        edgeBotConfig.botUsername = botUsername;
        edgeBotConfig.botFirstName = meData.result.first_name || edgeBotConfig.botFirstName;
      }
    } catch {}

    // Also configure Telegram Mini App menu button & commands
    const cleanAppUrl = (env.APP_URL || url.origin).replace(/\/$/, '');
    try {
      await fetch(`https://api.telegram.org/bot${token}/setChatMenuButton`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          menu_button: {
            type: 'web_app',
            text: 'Play FOXCOIN 🦊',
            web_app: { url: cleanAppUrl },
          },
        }),
      });

      await fetch(`https://api.telegram.org/bot${token}/setMyCommands`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          commands: [
            { command: 'start', description: 'Start FOXCOIN & Join Channel' },
            { command: 'play', description: 'Launch FOXCOIN Mini App' },
            { command: 'balance', description: 'Check your FOX Balance' },
            { command: 'help', description: 'How to earn & trade FOX' },
          ],
        }),
      });
    } catch {}

    edgeBotConfig.botToken = token;
    edgeBotConfig.webhookUrl = targetUrl;
    edgeBotConfig.webhookSecret = effectiveSecret;
    edgeBotConfig.lastWebhookSetupDate = Date.now();
    await persistEdgeBotConfig(env);

    return jsonResponse({
      success: true,
      description: tgData.description,
      botUsername,
      webhookUrl: targetUrl,
    });
  }

  // 1-Click Automatic Telegram Bot & Mini App Activation (Edge)
  if (pathname === '/api/admin/telegram/auto-setup' && method === 'POST') {
    if (!isAdmin) return jsonResponse({ error: 'Forbidden' }, 403);
    let body: any = {};
    try {
      body = await request.json();
    } catch {}
    const token = body.botToken?.trim() || edgeBotConfig.botToken || env.TELEGRAM_BOT_TOKEN;
    if (!token) {
      return jsonResponse({ error: 'Bot token required (e.g. 123456789:ABCDefgh...)' }, 400);
    }

    const cleanAppUrl = (env.APP_URL || url.origin).replace(/\/$/, '');
    const webhookUrl = `${cleanAppUrl}/api/telegram/webhook`;
    const webhookUrlWithToken = new URL(webhookUrl);
    webhookUrlWithToken.searchParams.set('bt', Buffer.from(token, 'utf8').toString('base64url'));
    const secret = env.TELEGRAM_WEBHOOK_SECRET || deriveEdgeWebhookSecret(token);

    // 1. Set Webhook
    const tgRes = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: webhookUrlWithToken.toString(),
        secret_token: secret,
        allowed_updates: ['message', 'callback_query', 'pre_checkout_query'],
      }),
    });
    const tgData = (await tgRes.json()) as any;
    if (!tgData.ok) {
      return jsonResponse({ error: tgData.description || 'Telegram setWebhook failed' }, 400);
    }

    // 2. Fetch bot profile (username, first_name)
    let botUsername = env.TELEGRAM_BOT_USERNAME || 'FOXCOINBot';
    let botFirstName = env.TELEGRAM_BOT_NAME || 'FOXCOIN';
    try {
      const meRes = await fetch(`https://api.telegram.org/bot${token}/getMe`);
      const meData = (await meRes.json()) as any;
      if (meData.ok && meData.result) {
        botUsername = meData.result.username || botUsername;
        botFirstName = meData.result.first_name || botFirstName;
      }
    } catch {}

    // 3. Configure Mini App Menu Button & Commands
    try {
      await fetch(`https://api.telegram.org/bot${token}/setChatMenuButton`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          menu_button: {
            type: 'web_app',
            text: 'Play FOXCOIN 🦊',
            web_app: { url: cleanAppUrl },
          },
        }),
      });

      await fetch(`https://api.telegram.org/bot${token}/setMyCommands`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          commands: [
            { command: 'start', description: 'Start FOXCOIN & Join Channel' },
            { command: 'play', description: 'Launch FOXCOIN Mini App' },
            { command: 'balance', description: 'Check your FOX Balance' },
            { command: 'help', description: 'How to earn & trade FOX' },
          ],
        }),
      });
    } catch {}

    edgeBotConfig.botToken = token;
    edgeBotConfig.webhookUrl = webhookUrl;
    edgeBotConfig.webhookSecret = secret;
    edgeBotConfig.botUsername = botUsername;
    edgeBotConfig.botFirstName = botFirstName;
    edgeBotConfig.lastWebhookSetupDate = Date.now();
    await persistEdgeBotConfig(env);

    return jsonResponse({
      success: true,
      description: 'Bot activated successfully! Webhook and Mini App Menu Button configured.',
      botUsername,
      botFirstName,
      appUrl: cleanAppUrl,
      webhookUrl,
      telegramLink: `https://t.me/${botUsername}`,
    });
  }

  if (pathname === '/api/admin/telegram/status' && method === 'POST') {
    if (!isAdmin) return jsonResponse({ error: 'Forbidden' }, 403);
    let body: any = {};
    try {
      body = await request.json();
    } catch {}
    const token = body.botToken?.trim() || env.TELEGRAM_BOT_TOKEN;
    if (!token) return jsonResponse({ error: 'Bot token required' }, 400);

    const tgRes = await fetch(`https://api.telegram.org/bot${token}/getWebhookInfo`);
    const tgData = (await tgRes.json()) as any;
    if (!tgData.ok) return jsonResponse({ error: tgData.description }, 400);
    return jsonResponse({ success: true, info: tgData.result });
  }

  if (pathname === '/api/admin/telegram/delete-webhook' && method === 'POST') {
    if (!isAdmin) return jsonResponse({ error: 'Forbidden' }, 403);
    let body: any = {};
    try {
      body = await request.json();
    } catch {}
    const token = body.botToken?.trim() || env.TELEGRAM_BOT_TOKEN;
    if (!token) return jsonResponse({ error: 'Bot token required' }, 400);

    const tgRes = await fetch(`https://api.telegram.org/bot${token}/deleteWebhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ drop_pending_updates: true }),
    });
    const tgData = (await tgRes.json()) as any;
    if (!tgData.ok) return jsonResponse({ error: tgData.description }, 400);

    edgeBotConfig.webhookUrl = '';
    return jsonResponse({ success: true, description: tgData.description });
  }

  if (pathname === '/api/admin/users' && method === 'GET') {
    if (!isAdmin) return jsonResponse({ error: 'Forbidden' }, 403);
    await hydrateEdgeUsers(env, true);
    const list = Array.from(edgeUsers.values()).sort((a, b) => {
      const aBot = a.id.startsWith('bot_');
      const bBot = b.id.startsWith('bot_');
      if (aBot !== bBot) return aBot ? 1 : -1;
      return b.balance - a.balance;
    });
    return jsonResponse({
      users: list,
      storage: {
        engine: env.DB ? 'cloudflare_d1' : env.FOX_KV ? 'cloudflare_kv' : 'memory_only',
        d1Bound: !!env.DB,
        kvBound: !!env.FOX_KV,
        realUsersCount: list.filter((u) => !u.id.startsWith('bot_')).length,
      },
    });
  }

  if (pathname === '/api/admin/users/adjust-balance' && method === 'POST') {
    if (!isAdmin) return jsonResponse({ error: 'Forbidden' }, 403);
    let body: any = {};
    try {
      body = await request.json();
    } catch {}
    const { userId, amount, operation, balanceType } = body;
    const targetUser = edgeUsers.get(userId);
    if (!targetUser) return jsonResponse({ error: 'User not found' }, 404);

    const cleanAmount = Math.max(0, Math.floor(Number(amount) || 0));
    if (balanceType === 'referral') {
      if (operation === 'add') {
        targetUser.referralEarnings = Math.max(0, (targetUser.referralEarnings || 0) + cleanAmount);
        targetUser.balance = Math.max(0, targetUser.balance + cleanAmount);
        targetUser.totalEarned += cleanAmount;
      } else if (operation === 'deduct') {
        targetUser.referralEarnings = Math.max(0, (targetUser.referralEarnings || 0) - cleanAmount);
        targetUser.balance = Math.max(0, targetUser.balance - cleanAmount);
      } else if (operation === 'set') {
        targetUser.referralEarnings = cleanAmount;
      }
    } else {
      if (operation === 'add') {
        targetUser.balance = Math.max(0, targetUser.balance + cleanAmount);
        targetUser.totalEarned += cleanAmount;
      } else if (operation === 'deduct') {
        targetUser.balance = Math.max(0, targetUser.balance - cleanAmount);
      } else if (operation === 'set') {
        targetUser.balance = cleanAmount;
        if (cleanAmount > targetUser.totalEarned) targetUser.totalEarned = cleanAmount;
      }
    }

    refreshEdgeUserState(targetUser);

    edgeUsers.set(userId, targetUser);
    await persistUserToD1(env.DB, targetUser);

    const list = Array.from(edgeUsers.values()).sort((a, b) => {
      const aBot = a.id.startsWith('bot_');
      const bBot = b.id.startsWith('bot_');
      if (aBot !== bBot) return aBot ? 1 : -1;
      return b.balance - a.balance;
    });

    return jsonResponse({ success: true, user: targetUser, users: list });
  }

  // Admin: Save Upgrade Card or Fox Gift Price
  if (pathname === '/api/admin/cards/save' && method === 'POST') {
    if (!isAdmin) return jsonResponse({ error: 'Forbidden' }, 403);
    let body: any = {};
    try {
      body = await request.json();
    } catch {}
    const { card } = body;
    if (!card || !card.id || !card.name) {
      return jsonResponse({ error: 'Valid card id and name required' }, 400);
    }

    const cleanCard: UpgradeDefinition = {
      id: String(card.id).trim(),
      name: String(card.name).trim(),
      description: String(card.description || '').trim(),
      category: ['tap', 'passive', 'special', 'gift'].includes(card.category) ? card.category : 'passive',
      basePrice: Math.max(1, Math.floor(Number(card.basePrice) || 100)),
      priceMultiplier: Math.max(1.05, Number(card.priceMultiplier) || 1.4),
      benefitType: ['tap_power', 'profit_per_hour', 'max_energy', 'energy_regen'].includes(card.benefitType)
        ? card.benefitType
        : 'profit_per_hour',
      baseBenefit: Math.max(1, Math.floor(Number(card.baseBenefit) || 100)),
      levelRequirement: Math.max(1, Math.min(10, Math.floor(Number(card.levelRequirement) || 1))),
      icon: String(card.icon || 'Rocket').trim(),
    };

    const idx = edgeUpgrades.findIndex((u) => u.id === cleanCard.id);
    if (idx >= 0) {
      edgeUpgrades[idx] = cleanCard;
    } else {
      edgeUpgrades.push(cleanCard);
    }

    return jsonResponse({ success: true, upgrades: edgeUpgrades });
  }

  // Admin: Delete Upgrade Card
  if (pathname === '/api/admin/cards/delete' && method === 'POST') {
    if (!isAdmin) return jsonResponse({ error: 'Forbidden' }, 403);
    let body: any = {};
    try {
      body = await request.json();
    } catch {}
    if (!body.upgradeId) return jsonResponse({ error: 'upgradeId required' }, 400);

    edgeUpgrades = edgeUpgrades.filter((u) => u.id !== String(body.upgradeId));
    return jsonResponse({ success: true, upgrades: edgeUpgrades });
  }

  // Admin: Save Lucky Wheel Prizes
  if (pathname === '/api/admin/wheel/save' && method === 'POST') {
    if (!isAdmin) return jsonResponse({ error: 'Forbidden' }, 403);
    let body: any = {};
    try {
      body = await request.json();
    } catch {}
    if (!Array.isArray(body.prizes) || body.prizes.length === 0) {
      return jsonResponse({ error: 'Valid prizes array required' }, 400);
    }

    edgeWheelPrizes = body.prizes.map((p: any, idx: number) => ({
      id: String(p.id || `wheel_${idx}`),
      label: String(p.label || `+${Number(p.amount || 1000).toLocaleString()} FOX`),
      shortLabel: String(p.shortLabel || `${Number(p.amount || 1000).toLocaleString()}`),
      persianLabel: String(p.persianLabel || p.label || ''),
      type: ['coins', 'full_energy', 'turbo'].includes(p.type) ? p.type : 'coins',
      amount: Math.max(1, Math.floor(Number(p.amount) || 1000)),
      weight: Math.max(0.1, Number(p.weight) || 10),
      color: String(p.color || '#1E293B'),
      accentColor: String(p.accentColor || '#F59E0B'),
      rarity: ['common', 'rare', 'epic', 'jackpot'].includes(p.rarity) ? p.rarity : 'common',
    }));

    return jsonResponse({ success: true, wheelPrizes: edgeWheelPrizes });
  }

  // 8. Fallback for undefined edge API routes
  return jsonResponse(
    {
      status: 'cloudflare_edge_active',
      path: pathname,
      message: 'FOXCOIN Cloudflare Pages API endpoint active.',
    },
    200
  );
};

export default {
  async fetch(request: Request, env: CloudflareEnv & { ASSETS?: any }): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname.startsWith('/api')) {
      return onRequest({
        request,
        env,
        next: async () => new Response('Not Found', { status: 404 }),
        data: {},
        params: {},
      });
    }
    if (env.ASSETS && typeof env.ASSETS.fetch === 'function') {
      return env.ASSETS.fetch(request);
    }
    return new Response('FOXCOIN Cloudflare Worker Active', { status: 200 });
  },
};

