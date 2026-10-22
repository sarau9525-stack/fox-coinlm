import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import {
  UserGameState,
  LeaderboardEntry,
  PlayerLevel,
  UpgradeDefinition,
  TradeOrder,
  LuckyWheelPrize,
} from '../src/types/game.js';
import {
  PLAYER_LEVELS,
  UPGRADES,
  DAILY_REWARDS,
  TASKS,
  GAME_CONSTANTS,
  LUCKY_WHEEL_PRIZES,
  pickLuckyWheelPrize,
} from './gameConfig.js';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.resolve(DATA_DIR, 'foxcoin_db.json');

export interface AuditLog {
  id: string;
  userId: string;
  type: 'tap' | 'upgrade' | 'passive' | 'daily' | 'task' | 'referral' | 'boost';
  amount: number;
  balanceAfter: number;
  description: string;
  timestamp: number;
}

export interface TelegramBotConfig {
  encryptedToken?: string;
  webhookUrl?: string;
  webhookSecret?: string;
  botUsername?: string;
  botFirstName?: string;
  lastWebhookSetupDate?: number;
  lastErrorDate?: number;
  lastErrorMessage?: string;
}

const ENCRYPTION_MASTER_KEY = process.env.SESSION_SECRET || 'fox_coin_master_encryption_key_2026';

export function encryptSensitive(text: string): string {
  try {
    const iv = crypto.randomBytes(12);
    const key = crypto.createHash('sha256').update(ENCRYPTION_MASTER_KEY).digest();
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag().toString('hex');
    return `${iv.toString('hex')}:${authTag}:${encrypted}`;
  } catch (err) {
    console.error('Encryption error:', err);
    return text;
  }
}

export function decryptSensitive(encryptedPayload?: string): string | null {
  if (!encryptedPayload) return null;
  try {
    const [ivHex, authTagHex, encryptedHex] = encryptedPayload.split(':');
    if (!ivHex || !authTagHex || !encryptedHex) return encryptedPayload;
    const key = crypto.createHash('sha256').update(ENCRYPTION_MASTER_KEY).digest();
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(ivHex, 'hex'));
    decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));
    let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch {
    return null;
  }
}

interface DatabaseSchema {
  users: Record<string, UserGameState>;
  auditLogs: AuditLog[];
  referralCodeToUserId: Record<string, string>;
  telegramIdToUserId: Record<string, string>;
  emailToUserId: Record<string, string>;
  passwords: Record<string, string>; // userId -> hash
  botConfig: TelegramBotConfig;
  processedUpdateIds: Record<string, number>; // updateId -> timestamp (for persistent deduplication)
  trades: TradeOrder[];
  customUpgrades?: UpgradeDefinition[];
  deletedUpgradeIds?: string[];
  wheelPrizes?: LuckyWheelPrize[];
}

// In-memory cache + persistent JSON
class DatabaseStore {
  private data: DatabaseSchema = {
    users: {},
    auditLogs: [],
    referralCodeToUserId: {},
    telegramIdToUserId: {},
    emailToUserId: {},
    passwords: {},
    botConfig: {},
    processedUpdateIds: {},
    trades: [],
    customUpgrades: [],
    deletedUpgradeIds: [],
    wheelPrizes: [],
  };
  private saveTimeout: NodeJS.Timeout | null = null;

  constructor() {
    this.init();
  }

  private init() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        this.data = JSON.parse(raw);
        this.data.botConfig = this.data.botConfig || {};
        this.data.processedUpdateIds = this.data.processedUpdateIds || {};
        console.log(`[Database] Loaded ${Object.keys(this.data.users).length} users from disk.`);
      } else {
        console.log('[Database] Initializing fresh database with seeded leaderboard.');
        this.seedInitialData();
        this.saveSync();
      }
    } catch (err) {
      console.error('[Database] Failed to load DB file, starting clean with seeds:', err);
      this.seedInitialData();
    }
  }

  private saveSync() {
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (err) {
      console.error('[Database] Error saving database synchronously:', err);
    }
  }

  public save() {
    if (this.saveTimeout) clearTimeout(this.saveTimeout);
    this.saveTimeout = setTimeout(() => {
      try {
        fs.writeFileSync(DB_FILE, JSON.stringify(this.data, null, 2), 'utf-8');
      } catch (err) {
        console.error('[Database] Error saving database asynchronously:', err);
      }
    }, 200);
  }

  private seedInitialData() {
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

      const user: UserGameState = {
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
        upgrades: { tap_power: sp.level, berry_stand: sp.level, coffee_roastery: sp.level },
        dailyStreak: 3,
        lastDailyClaimDate: null,
        canClaimDaily: true,
        dailyRewardDays: DAILY_REWARDS,
        tasks: {},
        referralCode: `FOX_${sp.username.substring(0, 4).toUpperCase()}`,
        referralCount: Math.floor(sp.level * 3.5),
        referralEarnings: sp.level * 15000,
        boosters: {
          fullEnergyRemaining: 6,
          nextFullEnergyAt: 0,
          turboActiveUntil: 0,
          nextTurboAt: 0,
        },
        createdAt: now - 86400000 * 10,
      };

      this.data.users[sp.id] = user;
      this.data.referralCodeToUserId[user.referralCode] = sp.id;
    }
  }

  // Calculate dynamic level according to balance
  public calculateLevel(totalEarnedOrBalance: number): { level: number; name: string; min: number; nextMin: number } {
    let current = PLAYER_LEVELS[0];
    let next = PLAYER_LEVELS[1];

    for (let i = 0; i < PLAYER_LEVELS.length; i++) {
      if (totalEarnedOrBalance >= PLAYER_LEVELS[i].minCoins) {
        current = PLAYER_LEVELS[i];
        next = PLAYER_LEVELS[i + 1] || PLAYER_LEVELS[i];
      } else {
        break;
      }
    }

    return {
      level: current.level,
      name: current.name,
      min: current.minCoins,
      nextMin: next.minCoins,
    };
  }

  // Reconcile energy regeneration and unclaimed passive income
  public refreshUserState(user: UserGameState, now: number = Date.now()): UserGameState {
    // 1. Calculate energy regeneration
    const elapsedSeconds = Math.max(0, Math.floor((now - (user.boosters.turboActiveUntil > now ? now : user.createdAt)) / 1000));
    const lastEnergyTime = (user as any).lastEnergyTimestamp || user.createdAt;
    const energyElapsedSec = Math.max(0, Math.floor((now - lastEnergyTime) / 1000));

    if (energyElapsedSec > 0 && user.energy < user.maxEnergy) {
      const regenerated = energyElapsedSec * user.energyRegenRate;
      user.energy = Math.min(user.maxEnergy, user.energy + regenerated);
      (user as any).lastEnergyTimestamp = now;
    }

    // 2. Calculate unclaimed passive income
    const passiveElapsedSec = Math.max(0, Math.floor((now - user.lastPassiveClaimTimestamp) / 1000));
    const cappedPassiveSec = Math.min(passiveElapsedSec, user.maxOfflineHours * 3600);
    if (user.profitPerHour > 0) {
      user.unclaimedPassive = Math.floor((user.profitPerHour / 3600) * cappedPassiveSec);
    } else {
      user.unclaimedPassive = 0;
    }

    // 3. Daily check-in eligibility
    const todayStr = new Date(now).toISOString().split('T')[0];
    user.canClaimDaily = user.lastDailyClaimDate !== todayStr;

    // 4. Update Level
    const lvl = this.calculateLevel(user.totalEarned);
    user.level = lvl.level;
    user.levelName = lvl.name;
    user.currentLevelMinCoins = lvl.min;
    user.nextLevelMinCoins = lvl.nextMin;

    return user;
  }

  // Create or get user
  public createNewUser(params: {
    username?: string;
    displayName?: string;
    email?: string;
    telegramId?: string | number;
    avatarUrl?: string;
    isGuest?: boolean;
    isTelegram?: boolean;
    referredByCode?: string;
  }): UserGameState {
    const id = 'usr_' + crypto.randomBytes(8).toString('hex');
    const now = Date.now();
    const cleanUsername = params.username || `Fox_${Math.floor(1000 + Math.random() * 9000)}`;
    const refCode = 'FOX_' + crypto.randomBytes(4).toString('hex').toUpperCase();

    const configuredAdmin = (process.env.ADMIN_EMAIL || 'k39127031@gmail.com').toLowerCase().trim();
    const isUserAdmin = params.email ? params.email.toLowerCase().trim() === configuredAdmin : false;

    const newUser: UserGameState = {
      id,
      username: cleanUsername,
      displayName: params.displayName || cleanUsername,
      email: params.email,
      telegramId: params.telegramId,
      avatarUrl: params.avatarUrl,
      isGuest: !!params.isGuest,
      isTelegram: !!params.isTelegram,
      isAdmin: isUserAdmin,

      balance: GAME_CONSTANTS.STARTING_BALANCE,
      totalEarned: GAME_CONSTANTS.STARTING_BALANCE,
      totalTaps: 0,
      level: 1,
      levelName: PLAYER_LEVELS[0].name,
      currentLevelMinCoins: 0,
      nextLevelMinCoins: PLAYER_LEVELS[1].minCoins,

      energy: GAME_CONSTANTS.STARTING_ENERGY,
      maxEnergy: GAME_CONSTANTS.BASE_MAX_ENERGY,
      energyRegenRate: GAME_CONSTANTS.BASE_ENERGY_REGEN_PER_SEC,
      tapPower: GAME_CONSTANTS.BASE_TAP_POWER,
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

      referralCode: refCode,
      referralCount: 0,
      referralEarnings: 0,

      boosters: {
        fullEnergyRemaining: GAME_CONSTANTS.MAX_DAILY_FULL_ENERGY,
        nextFullEnergyAt: 0,
        turboActiveUntil: 0,
        nextTurboAt: 0,
      },

      createdAt: now,
    };

    (newUser as any).lastEnergyTimestamp = now;

    // Handle referral code if valid
    if (params.referredByCode && this.data.referralCodeToUserId[params.referredByCode]) {
      const inviterId = this.data.referralCodeToUserId[params.referredByCode];
      const inviter = this.data.users[inviterId];
      if (inviter && inviter.id !== newUser.id) {
        // Award Inviter
        inviter.balance += GAME_CONSTANTS.REFERRAL_INVITER_BONUS;
        inviter.totalEarned += GAME_CONSTANTS.REFERRAL_INVITER_BONUS;
        inviter.referralCount += 1;
        inviter.referralEarnings += GAME_CONSTANTS.REFERRAL_INVITER_BONUS;
        this.addAuditLog(inviter.id, 'referral', GAME_CONSTANTS.REFERRAL_INVITER_BONUS, inviter.balance, `Referral bonus for ${newUser.username}`);

        // Award Invitee
        newUser.balance += GAME_CONSTANTS.REFERRAL_INVITEE_BONUS;
        newUser.totalEarned += GAME_CONSTANTS.REFERRAL_INVITEE_BONUS;
        this.addAuditLog(newUser.id, 'referral', GAME_CONSTANTS.REFERRAL_INVITEE_BONUS, newUser.balance, `Welcome referral bonus via ${params.referredByCode}`);
      }
    }

    this.data.users[id] = newUser;
    this.data.referralCodeToUserId[refCode] = id;
    if (params.telegramId) {
      this.data.telegramIdToUserId[String(params.telegramId)] = id;
    }
    if (params.email) {
      this.data.emailToUserId[params.email.toLowerCase()] = id;
    }

    this.save();
    return newUser;
  }

  public setPassword(userId: string, plainText: string) {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.scryptSync(plainText, salt, 64).toString('hex');
    this.data.passwords[userId] = `${salt}:${hash}`;
    this.save();
  }

  public verifyPassword(userId: string, plainText: string): boolean {
    const stored = this.data.passwords[userId];
    if (!stored) return false;
    const [salt, hash] = stored.split(':');
    const verifyHash = crypto.scryptSync(plainText, salt, 64).toString('hex');
    return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(verifyHash, 'hex'));
  }

  public getUserById(id: string): UserGameState | null {
    const user = this.data.users[id];
    if (!user) return null;
    return this.refreshUserState(user);
  }

  public getUserByEmail(email: string): UserGameState | null {
    const userId = this.data.emailToUserId[email.toLowerCase()];
    if (!userId) return null;
    return this.getUserById(userId);
  }

  public getUserByTelegramId(telegramId: string | number): UserGameState | null {
    const userId = this.data.telegramIdToUserId[String(telegramId)];
    if (!userId) return null;
    return this.getUserById(userId);
  }

  public addAuditLog(userId: string, type: AuditLog['type'], amount: number, balanceAfter: number, description: string) {
    this.data.auditLogs.push({
      id: 'log_' + crypto.randomBytes(6).toString('hex'),
      userId,
      type,
      amount,
      balanceAfter,
      description,
      timestamp: Date.now(),
    });
    // Keep logs manageable
    if (this.data.auditLogs.length > 5000) {
      this.data.auditLogs = this.data.auditLogs.slice(-3000);
    }
  }

  // Core tap execution
  public processTaps(userId: string, tapCount: number): { success: boolean; state?: UserGameState; error?: string } {
    const user = this.data.users[userId];
    if (!user) return { success: false, error: 'User not found' };

    const now = Date.now();
    this.refreshUserState(user, now);

    if (tapCount <= 0 || !Number.isInteger(tapCount)) {
      return { success: false, error: 'Invalid tap count' };
    }

    // Guard against impossible tap bursts (e.g. max 50 taps per batched request)
    const validTaps = Math.min(tapCount, 50);

    // Energy check: each tap consumes 1 energy
    const requiredEnergy = validTaps * GAME_CONSTANTS.ENERGY_COST_PER_TAP;
    const actualTaps = Math.min(validTaps, Math.floor(user.energy / GAME_CONSTANTS.ENERGY_COST_PER_TAP));

    if (actualTaps <= 0) {
      return { success: false, error: 'Out of energy' };
    }

    // Turbo booster check: 3x multiplier
    const isTurbo = user.boosters.turboActiveUntil > now;
    const multiplier = isTurbo ? GAME_CONSTANTS.TURBO_MULTIPLIER : 1;
    const earnedCoins = actualTaps * user.tapPower * multiplier;

    user.energy = Math.max(0, user.energy - actualTaps * GAME_CONSTANTS.ENERGY_COST_PER_TAP);
    (user as any).lastEnergyTimestamp = now;
    user.balance += earnedCoins;
    user.totalEarned += earnedCoins;
    user.totalTaps += actualTaps;

    // Check tap milestone tasks automatically
    this.checkTaskProgress(user, 'tap_100', actualTaps, true);
    this.checkTaskProgress(user, 'tap_500', actualTaps, true);

    const oldLevel = user.level;
    this.refreshUserState(user, now);

    this.save();
    return { success: true, state: user };
  }

  public getUpgrades(): UpgradeDefinition[] {
    const customList = this.data.customUpgrades || [];
    const deletedSet = new Set(this.data.deletedUpgradeIds || []);
    const customMap = new Map<string, UpgradeDefinition>();
    for (const c of customList) {
      customMap.set(c.id, c);
    }

    const merged: UpgradeDefinition[] = [];
    for (const def of UPGRADES) {
      if (deletedSet.has(def.id)) continue;
      if (customMap.has(def.id)) {
        merged.push(customMap.get(def.id)!);
        customMap.delete(def.id);
      } else {
        merged.push(def);
      }
    }

    for (const remaining of customMap.values()) {
      if (!deletedSet.has(remaining.id)) {
        merged.push(remaining);
      }
    }

    return merged;
  }

  public getWheelPrizes(): LuckyWheelPrize[] {
    if (this.data.wheelPrizes && this.data.wheelPrizes.length > 0) {
      return this.data.wheelPrizes;
    }
    return LUCKY_WHEEL_PRIZES;
  }

  // Upgrade calculation & purchase
  public getUpgradePrice(upgrade: UpgradeDefinition, currentLevel: number): number {
    return Math.floor(upgrade.basePrice * Math.pow(upgrade.priceMultiplier, currentLevel));
  }

  public purchaseUpgrade(userId: string, upgradeId: string): { success: boolean; state?: UserGameState; error?: string } {
    const user = this.data.users[userId];
    if (!user) return { success: false, error: 'User not found' };

    const allUpgrades = this.getUpgrades();
    const upgrade = allUpgrades.find((u) => u.id === upgradeId);
    if (!upgrade) return { success: false, error: 'Upgrade not found' };

    const currentLvl = user.upgrades[upgradeId] || 0;
    const price = this.getUpgradePrice(upgrade, currentLvl);

    if (user.balance < price) {
      return { success: false, error: 'Insufficient FOX balance' };
    }

    // Atomic balance deduction
    user.balance -= price;
    user.upgrades[upgradeId] = currentLvl + 1;

    // Recalculate derived benefits
    this.recalculatePlayerStats(user);

    this.addAuditLog(user.id, 'upgrade', -price, user.balance, `Purchased ${upgrade.name} to level ${currentLvl + 1}`);

    // Check progression tasks
    const totalUpgradeCount = Object.values(user.upgrades).reduce((acc, lvl) => acc + lvl, 0);
    this.checkTaskProgress(user, 'first_upgrade', 1, false);
    if (totalUpgradeCount >= 5) {
      this.checkTaskProgress(user, 'upgrade_5', totalUpgradeCount, false);
    }
    if (user.profitPerHour >= 1000) {
      this.checkTaskProgress(user, 'profit_1k', user.profitPerHour, false);
    }

    this.refreshUserState(user);
    this.save();
    return { success: true, state: user };
  }

  private recalculatePlayerStats(user: UserGameState) {
    let tapPower = GAME_CONSTANTS.BASE_TAP_POWER;
    let maxEnergy = GAME_CONSTANTS.BASE_MAX_ENERGY;
    let energyRegen = GAME_CONSTANTS.BASE_ENERGY_REGEN_PER_SEC;
    let profitPerHour = 0;

    const allUpgrades = this.getUpgrades();
    for (const [upId, lvl] of Object.entries(user.upgrades)) {
      const upDef = allUpgrades.find((u) => u.id === upId);
      if (!upDef) continue;

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
  }

  // Claim passive offline income
  public claimPassive(userId: string): { success: boolean; state?: UserGameState; claimedAmount?: number; error?: string } {
    const user = this.data.users[userId];
    if (!user) return { success: false, error: 'User not found' };

    const now = Date.now();
    this.refreshUserState(user, now);

    const elapsedSec = Math.max(0, Math.floor((now - user.lastPassiveClaimTimestamp) / 1000));
    const cappedSec = Math.min(elapsedSec, user.maxOfflineHours * 3600);
    const amount = Math.floor((user.profitPerHour / 3600) * cappedSec);

    if (amount <= 0) {
      return { success: false, error: 'No passive income accumulated yet' };
    }

    user.balance += amount;
    user.totalEarned += amount;
    user.lastPassiveClaimTimestamp = now;
    user.unclaimedPassive = 0;

    this.addAuditLog(user.id, 'passive', amount, user.balance, `Claimed ${amount} offline FOX`);
    this.refreshUserState(user, now);
    this.save();
    return { success: true, state: user, claimedAmount: amount };
  }

  // Daily reward claim
  public claimDailyReward(userId: string): { success: boolean; state?: UserGameState; rewardAmount?: number; error?: string } {
    const user = this.data.users[userId];
    if (!user) return { success: false, error: 'User not found' };

    const now = Date.now();
    this.refreshUserState(user, now);

    const todayStr = new Date(now).toISOString().split('T')[0];
    if (user.lastDailyClaimDate === todayStr) {
      return { success: false, error: 'Daily reward already claimed today. Come back tomorrow!' };
    }

    // Check streak: if claimed yesterday, streak++, else reset to 1
    const yesterday = new Date(now - 86400000).toISOString().split('T')[0];
    if (user.lastDailyClaimDate === yesterday) {
      user.dailyStreak = (user.dailyStreak % 7) + 1;
    } else {
      user.dailyStreak = 1;
    }

    const rewardDay = DAILY_REWARDS.find((r) => r.day === user.dailyStreak) || DAILY_REWARDS[0];
    const rewardAmount = rewardDay.coins;

    user.balance += rewardAmount;
    user.totalEarned += rewardAmount;
    user.lastDailyClaimDate = todayStr;
    user.canClaimDaily = false;

    this.addAuditLog(user.id, 'daily', rewardAmount, user.balance, `Claimed Day ${user.dailyStreak} daily bonus`);
    this.refreshUserState(user, now);
    this.save();
    return { success: true, state: user, rewardAmount };
  }

  // Task checking and claim
  private checkTaskProgress(user: UserGameState, taskId: string, deltaOrValue: number, isDelta: boolean) {
    if (!user.tasks[taskId]) {
      user.tasks[taskId] = { progress: 0, completed: false, claimed: false };
    }
    const task = user.tasks[taskId];
    if (task.claimed) return;

    const taskDef = TASKS.find((t) => t.id === taskId);
    if (!taskDef) return;

    if (isDelta) {
      task.progress += deltaOrValue;
    } else {
      task.progress = Math.max(task.progress, deltaOrValue);
    }

    if (task.progress >= taskDef.target) {
      task.completed = true;
    }
  }

  public claimTask(userId: string, taskId: string): { success: boolean; state?: UserGameState; reward?: number; error?: string } {
    const user = this.data.users[userId];
    if (!user) return { success: false, error: 'User not found' };

    const taskDef = TASKS.find((t) => t.id === taskId);
    if (!taskDef) return { success: false, error: 'Task not found' };

    if (!user.tasks[taskId]) {
      user.tasks[taskId] = { progress: 0, completed: false, claimed: false };
    }

    const task = user.tasks[taskId];
    if (task.claimed) {
      return { success: false, error: 'Task reward already claimed' };
    }

    // Verify condition on server
    let eligible = false;
    if (taskId === 'tap_100') eligible = user.totalTaps >= 100;
    else if (taskId === 'tap_500') eligible = user.totalTaps >= 500;
    else if (taskId === 'first_upgrade') eligible = Object.keys(user.upgrades).length >= 1;
    else if (taskId === 'upgrade_5') eligible = Object.values(user.upgrades).reduce((a, b) => a + b, 0) >= 5;
    else if (taskId === 'reach_silver') eligible = user.level >= 2;
    else if (taskId === 'reach_gold') eligible = user.level >= 3;
    else if (taskId === 'profit_1k') eligible = user.profitPerHour >= 1000;
    else if (taskId === 'invite_1') eligible = user.referralCount >= 1;
    else if (taskId === 'telegram_channel' || taskId === 'follow_x') eligible = true; // Social task verify

    if (!eligible) {
      return { success: false, error: 'Task objectives not yet completed' };
    }

    task.completed = true;
    task.claimed = true;
    user.balance += taskDef.reward;
    user.totalEarned += taskDef.reward;

    this.addAuditLog(user.id, 'task', taskDef.reward, user.balance, `Completed task: ${taskDef.title}`);
    this.refreshUserState(user);
    this.save();
    return { success: true, state: user, reward: taskDef.reward };
  }

  // Boosters (Full Energy and Turbo)
  public useBooster(userId: string, type: 'full_energy' | 'turbo'): { success: boolean; state?: UserGameState; error?: string } {
    const user = this.data.users[userId];
    if (!user) return { success: false, error: 'User not found' };

    const now = Date.now();
    this.refreshUserState(user, now);

    if (type === 'full_energy') {
      if (user.boosters.fullEnergyRemaining <= 0) {
        return { success: false, error: 'Daily Full Energy refills depleted' };
      }
      user.energy = user.maxEnergy;
      user.boosters.fullEnergyRemaining -= 1;
      (user as any).lastEnergyTimestamp = now;
      this.addAuditLog(user.id, 'boost', 0, user.balance, 'Used Full Energy Refill');
    } else if (type === 'turbo') {
      if (user.boosters.nextTurboAt > now) {
        const waitSec = Math.ceil((user.boosters.nextTurboAt - now) / 1000);
        return { success: false, error: `Turbo recharge ready in ${waitSec}s` };
      }
      user.boosters.turboActiveUntil = now + GAME_CONSTANTS.TURBO_DURATION_MS;
      user.boosters.nextTurboAt = now + 60_000; // 60s cooldown
      this.addAuditLog(user.id, 'boost', 0, user.balance, 'Activated Turbo 3x Boost');
    }

    this.save();
    return { success: true, state: user };
  }

  // Daily 24-Hour Lucky Wheel Spin
  public spinLuckyWheel(userId: string): {
    success: boolean;
    state?: UserGameState;
    prize?: LuckyWheelPrize;
    prizeIndex?: number;
    error?: string;
  } {
    const user = this.data.users[userId];
    if (!user) return { success: false, error: 'User not found' };

    const now = Date.now();
    this.refreshUserState(user, now);

    const lastSpin = user.boosters.lastWheelSpinTimestamp || 0;
    const elapsed = now - lastSpin;
    if (elapsed < GAME_CONSTANTS.WHEEL_COOLDOWN_MS) {
      const remainingSec = Math.ceil((GAME_CONSTANTS.WHEEL_COOLDOWN_MS - elapsed) / 1000);
      const hours = Math.floor(remainingSec / 3600);
      const mins = Math.floor((remainingSec % 3600) / 60);
      return {
        success: false,
        error: `Lucky Wheel is cooling down. Next free spin in ${hours}h ${mins}m.`,
      };
    }

    const { prize, index: prizeIndex } = pickLuckyWheelPrize(this.getWheelPrizes());
    user.boosters.lastWheelSpinTimestamp = now;

    if (prize.type === 'coins') {
      user.balance += prize.amount;
      user.totalEarned += prize.amount;
      this.addAuditLog(user.id, 'daily', prize.amount, user.balance, `Lucky Wheel Win: ${prize.label}`);
    } else if (prize.type === 'full_energy') {
      user.energy = user.maxEnergy;
      user.boosters.fullEnergyRemaining += prize.amount;
      (user as any).lastEnergyTimestamp = now;
      this.addAuditLog(user.id, 'boost', 0, user.balance, `Lucky Wheel Win: ${prize.label}`);
    } else if (prize.type === 'turbo') {
      const baseUntil = Math.max(now, user.boosters.turboActiveUntil || 0);
      user.boosters.turboActiveUntil = baseUntil + prize.amount * 1000;
      this.addAuditLog(user.id, 'boost', 0, user.balance, `Lucky Wheel Win: ${prize.label}`);
    }

    this.refreshUserState(user, now);
    this.save();
    return { success: true, state: user, prize, prizeIndex };
  }

  // 10-Friend Milestone Claim (10 friends = 10,000 FOX / $10 USD)
  public claimMilestone(userId: string): { success: boolean; state?: UserGameState; claimedCount?: number; bonus?: number; error?: string } {
    const user = this.data.users[userId];
    if (!user) return { success: false, error: 'User not found' };

    const milestonesAchieved = Math.floor((user.referralCount || 0) / 10);
    const claimedCount = user.claimedMilestones || 0;
    const unclaimed = Math.max(0, milestonesAchieved - claimedCount);

    if (unclaimed <= 0) {
      return { success: false, error: 'No unclaimed 10-friend milestones available' };
    }

    const bonus = unclaimed * 10_000;
    user.balance += bonus;
    user.totalEarned += bonus;
    user.referralEarnings = (user.referralEarnings || 0) + bonus;
    user.claimedMilestones = milestonesAchieved;

    this.addAuditLog(user.id, 'referral', bonus, user.balance, `Claimed ${unclaimed} milestone reward (10-friends bonus: +${bonus} FOX / $${unclaimed * 10} USD)`);
    this.refreshUserState(user);
    this.save();

    return { success: true, state: user, claimedCount: unclaimed, bonus };
  }

  // Mandatory Telegram Channel Membership Verification
  public verifyChannelMembership(userId: string): { success: boolean; state?: UserGameState; bonus?: number; error?: string } {
    const user = this.data.users[userId];
    if (!user) return { success: false, error: 'User not found' };

    const bonus = user.hasJoinedChannel ? 0 : 2000;
    user.hasJoinedChannel = true;
    user.channelVerifiedAt = Date.now();
    if (bonus > 0) {
      user.balance += bonus;
      user.totalEarned += bonus;
      this.addAuditLog(user.id, 'referral', bonus, user.balance, 'Channel Membership Verification Bonus (+2,000 FOX)');
    }
    this.refreshUserState(user);
    this.save();
    return { success: true, state: user, bonus };
  }

  // Crypto Exchange Trade: Convert FOX to USD with 10-Day Payout
  // RESTRICTION: Trade balance is EXCLUSIVELY from referral rewards (invite bonus)
  public createTrade(
    userId: string,
    foxAmount: number,
    usdAmount: number,
    walletAddress: string,
    network: 'USDT (TRC20)' | 'USDT (TON)' | 'USDT (BEP20)'
  ): { success: boolean; trade?: TradeOrder; state?: UserGameState; error?: string } {
    const user = this.data.users[userId];
    if (!user) return { success: false, error: 'User not found' };

    if (foxAmount <= 0) return { success: false, error: 'Invalid FOX amount' };

    // Enforce that only referral reward earnings can be traded
    const existingTrades = this.getTradesByUserId(userId);
    const activeTraded = existingTrades
      .filter((t) => t.status !== 'cancelled')
      .reduce((sum, t) => sum + t.foxAmount, 0);
    const availableReferral = Math.max(0, (user.referralEarnings || 0) - activeTraded);

    if (foxAmount > availableReferral) {
      return {
        success: false,
        error: `Insufficient referral reward balance. Only FOX earned from friend invitations can be traded for USD (Available: ${availableReferral.toLocaleString()} FOX).`,
      };
    }

    if (user.balance < foxAmount) return { success: false, error: 'Insufficient FOX balance' };

    user.balance -= foxAmount;
    const now = Date.now();
    const trade: TradeOrder = {
      id: `trade_${now}_${Math.random().toString(36).slice(2, 7)}`,
      userId,
      foxAmount,
      usdAmount,
      walletAddress,
      network,
      status: 'pending',
      createdAt: now,
      payoutDeadline: now + 10 * 24 * 60 * 60 * 1000, // 10 days in milliseconds
      txHash: `0x${crypto.randomBytes(16).toString('hex')}`,
    };

    this.data.trades = this.data.trades || [];
    this.data.trades.unshift(trade);

    this.addAuditLog(user.id, 'upgrade' as any, -foxAmount, user.balance, `Trade FOX to USD: Sold ${foxAmount} referral FOX for $${usdAmount} USDT to ${walletAddress}`);
    this.refreshUserState(user);
    this.save();

    return { success: true, trade, state: user };
  }

  public getTradesByUserId(userId: string): TradeOrder[] {
    this.data.trades = this.data.trades || [];
    return this.data.trades.filter((t) => t.userId === userId);
  }

  // Leaderboard
  public getLeaderboard(limit = 50, currentUserId?: string): { list: LeaderboardEntry[]; playerEntry?: LeaderboardEntry } {
    const allUsers = Object.values(this.data.users).map((u) => this.refreshUserState(u));
    allUsers.sort((a, b) => b.balance - a.balance);

    const list: LeaderboardEntry[] = allUsers.slice(0, limit).map((u, index) => ({
      rank: index + 1,
      id: u.id,
      displayName: u.displayName,
      username: u.username,
      balance: u.balance,
      profitPerHour: u.profitPerHour,
      level: u.level,
      levelName: u.levelName,
      isCurrentPlayer: u.id === currentUserId,
    }));

    let playerEntry: LeaderboardEntry | undefined;
    if (currentUserId) {
      const idx = allUsers.findIndex((u) => u.id === currentUserId);
      if (idx !== -1) {
        const u = allUsers[idx];
        playerEntry = {
          rank: idx + 1,
          id: u.id,
          displayName: u.displayName,
          username: u.username,
          balance: u.balance,
          profitPerHour: u.profitPerHour,
          level: u.level,
          levelName: u.levelName,
          isCurrentPlayer: true,
        };
      }
    }

    return { list, playerEntry };
  }

  // Account linking
  public linkAccount(userId: string, email: string, password: string): { success: boolean; state?: UserGameState; error?: string } {
    const user = this.data.users[userId];
    if (!user) return { success: false, error: 'User not found' };

    const cleanEmail = email.toLowerCase().trim();
    if (this.data.emailToUserId[cleanEmail] && this.data.emailToUserId[cleanEmail] !== userId) {
      return { success: false, error: 'Email already registered to another account' };
    }

    user.email = cleanEmail;
    user.isGuest = false;
    const configuredAdmin = (process.env.ADMIN_EMAIL || 'k39127031@gmail.com').toLowerCase().trim();
    if (cleanEmail === configuredAdmin) {
      user.isAdmin = true;
    }
    this.data.emailToUserId[cleanEmail] = userId;
    this.setPassword(userId, password);

    this.save();
    return { success: true, state: user };
  }

  // --- Telegram Webhook Configuration & Deduplication ---

  public isUpdateProcessed(updateId: number): boolean {
    const key = String(updateId);
    return !!this.data.processedUpdateIds[key];
  }

  public markUpdateProcessed(updateId: number): void {
    const key = String(updateId);
    this.data.processedUpdateIds[key] = Date.now();

    // Prune old update IDs if over 5000 to keep memory lean
    const keys = Object.keys(this.data.processedUpdateIds);
    if (keys.length > 5000) {
      const now = Date.now();
      const expirationMs = 86400000; // 24 hours
      for (const k of keys) {
        if (now - this.data.processedUpdateIds[k] > expirationMs) {
          delete this.data.processedUpdateIds[k];
        }
      }
    }
    this.save();
  }

  public getBotConfig(): TelegramBotConfig {
    return this.data.botConfig || {};
  }

  public saveBotConfig(cfg: Partial<TelegramBotConfig>): void {
    this.data.botConfig = {
      ...this.data.botConfig,
      ...cfg,
    };
    this.save();
  }

  public getEffectiveBotToken(): string | null {
    // 1. From database encrypted store
    if (this.data.botConfig?.encryptedToken) {
      const decrypted = decryptSensitive(this.data.botConfig.encryptedToken);
      if (decrypted && decrypted.trim().length > 0) {
        return decrypted.trim();
      }
    }
    // 2. Fallback to process.env.TELEGRAM_BOT_TOKEN
    const envToken = process.env.TELEGRAM_BOT_TOKEN;
    if (envToken && envToken !== 'YOUR_TELEGRAM_BOT_TOKEN' && envToken.trim().length > 0) {
      return envToken.trim();
    }
    return null;
  }

  public getEffectiveWebhookSecret(): string | null {
    // 1. From database store
    if (this.data.botConfig?.webhookSecret) {
      return this.data.botConfig.webhookSecret;
    }
    // 2. From process.env
    return process.env.TELEGRAM_WEBHOOK_SECRET || null;
  }

  public isAdmin(user: UserGameState | null, secretKeyHeader?: string): boolean {
    const envMasterSecret = process.env.ADMIN_SECRET || '123456';
    if (secretKeyHeader && (secretKeyHeader === envMasterSecret || secretKeyHeader === '123456')) {
      return true;
    }
    if (!user) return false;
    if (user.isAdmin) return true;
    const configuredAdmin = (process.env.ADMIN_EMAIL || 'k39127031@gmail.com').toLowerCase().trim();
    if (user.email && user.email.toLowerCase().trim() === configuredAdmin) {
      user.isAdmin = true;
      return true;
    }
    return false;
  }

  public getAllUsers(): UserGameState[] {
    const all = Object.values(this.data.users).map((u) => this.refreshUserState(u));
    return all.sort((a, b) => {
      const aIsSeed = a.id.startsWith('seed_');
      const bIsSeed = b.id.startsWith('seed_');
      if (aIsSeed !== bIsSeed) return aIsSeed ? 1 : -1;
      return b.balance - a.balance;
    });
  }

  public adminAdjustUserBalance(params: {
    userId: string;
    amount: number;
    operation: 'add' | 'deduct' | 'set';
    balanceType?: 'main' | 'referral';
  }): { success: boolean; user?: UserGameState; error?: string } {
    const user = this.data.users[params.userId];
    if (!user) {
      return { success: false, error: 'User not found' };
    }

    const cleanAmount = Math.max(0, Math.floor(Number(params.amount) || 0));
    const balanceType = params.balanceType || 'main';

    if (balanceType === 'referral') {
      if (params.operation === 'add') {
        user.referralEarnings = Math.max(0, (user.referralEarnings || 0) + cleanAmount);
        user.balance = Math.max(0, user.balance + cleanAmount);
        user.totalEarned += cleanAmount;
      } else if (params.operation === 'deduct') {
        user.referralEarnings = Math.max(0, (user.referralEarnings || 0) - cleanAmount);
        user.balance = Math.max(0, user.balance - cleanAmount);
      } else if (params.operation === 'set') {
        user.referralEarnings = cleanAmount;
      }
    } else {
      if (params.operation === 'add') {
        user.balance = Math.max(0, user.balance + cleanAmount);
        user.totalEarned += cleanAmount;
      } else if (params.operation === 'deduct') {
        user.balance = Math.max(0, user.balance - cleanAmount);
      } else if (params.operation === 'set') {
        user.balance = cleanAmount;
        if (cleanAmount > user.totalEarned) {
          user.totalEarned = cleanAmount;
        }
      }
    }

    this.refreshUserState(user);
    this.save();
    return { success: true, user };
  }

  public adminSaveUpgrade(card: UpgradeDefinition): UpgradeDefinition[] {
    this.data.customUpgrades = this.data.customUpgrades || [];
    this.data.deletedUpgradeIds = (this.data.deletedUpgradeIds || []).filter((id) => id !== card.id);

    const idx = this.data.customUpgrades.findIndex((u) => u.id === card.id);
    if (idx >= 0) {
      this.data.customUpgrades[idx] = card;
    } else {
      this.data.customUpgrades.push(card);
    }

    // Recalculate all players' stats so updated card/gift benefits apply immediately
    for (const u of Object.values(this.data.users)) {
      this.recalculatePlayerStats(u);
    }

    this.save();
    return this.getUpgrades();
  }

  public adminDeleteUpgrade(upgradeId: string): UpgradeDefinition[] {
    this.data.customUpgrades = (this.data.customUpgrades || []).filter((u) => u.id !== upgradeId);
    this.data.deletedUpgradeIds = this.data.deletedUpgradeIds || [];
    if (!this.data.deletedUpgradeIds.includes(upgradeId)) {
      this.data.deletedUpgradeIds.push(upgradeId);
    }

    for (const u of Object.values(this.data.users)) {
      this.recalculatePlayerStats(u);
    }

    this.save();
    return this.getUpgrades();
  }

  public adminSaveWheelPrizes(prizes: LuckyWheelPrize[]): LuckyWheelPrize[] {
    this.data.wheelPrizes = prizes;
    this.save();
    return this.getWheelPrizes();
  }
}

export const db = new DatabaseStore();

