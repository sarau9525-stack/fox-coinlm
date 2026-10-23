import { UserGameState, LeaderboardEntry, UpgradeDefinition, TaskDefinition, DailyRewardDay, TradeOrder, LuckyWheelPrize } from '../types/game.js';
import { UPGRADES, PLAYER_LEVELS, TASKS, DAILY_REWARDS, GAME_CONSTANTS, LUCKY_WHEEL_PRIZES, pickLuckyWheelPrize, reconcileUserLevel, getUpgradeXpBonus, sanitizeWheelPrize, sanitizeUpgrade } from '../../server/gameConfig.js';

function calculateUpgradePrice(upg: UpgradeDefinition, currentLevel: number): number {
  return Math.floor(upg.basePrice * Math.pow(upg.priceMultiplier, currentLevel));
}

function getPlayerLevel(balance: number) {
  let matched = PLAYER_LEVELS[0];
  for (const lvl of PLAYER_LEVELS) {
    if (balance >= lvl.minCoins) matched = lvl;
    else break;
  }
  return matched;
}

function getNextPlayerLevel(currentLevel: number) {
  return PLAYER_LEVELS.find((l) => l.level === currentLevel + 1) || null;
}

const TOKEN_KEY = 'foxcoin_auth_token';
const LOCAL_USER_KEY = 'foxcoin_local_user_v1';
const LOCAL_TRADES_KEY = 'foxcoin_local_trades_v1';
const LOCAL_BOT_KEY = 'foxcoin_local_bot_v1';
const LOCAL_UPGRADES_KEY = 'foxcoin_local_upgrades_v4';
const LOCAL_WHEEL_KEY = 'foxcoin_local_wheel_v4';

export interface GameConfig {
  upgrades: UpgradeDefinition[];
  wheelPrizes?: LuckyWheelPrize[];
  levels: Array<{ level: number; name: string; minCoins: number; badge: string }>;
  tasks: TaskDefinition[];
  dailyRewards: DailyRewardDay[];
  constants: {
    STARTING_BALANCE: number;
    STARTING_ENERGY: number;
    BASE_MAX_ENERGY: number;
    BASE_TAP_POWER: number;
    BASE_ENERGY_REGEN_PER_SEC: number;
    ENERGY_COST_PER_TAP: number;
    MAX_OFFLINE_HOURS: number;
    MAX_TAPS_PER_SECOND: number;
    REFERRAL_INVITER_BONUS: number;
    REFERRAL_INVITEE_BONUS: number;
    TURBO_MULTIPLIER: number;
    TURBO_DURATION_MS: number;
  };
  telegramBotUsername: string;
}

class ApiService {
  private token: string | null = null;
  private pendingTapCount: number = 0;
  private tapBatchTimer: NodeJS.Timeout | null = null;
  private isFlushingTaps: boolean = false;
  private onStateUpdated?: (state: UserGameState) => void;

  constructor() {
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem(TOKEN_KEY);
    }
  }

  public setToken(token: string | null) {
    this.token = token;
    if (typeof window !== 'undefined') {
      if (token) {
        localStorage.setItem(TOKEN_KEY, token);
      } else {
        localStorage.removeItem(TOKEN_KEY);
      }
    }
  }

  public getToken(): string | null {
    return this.token;
  }

  public registerStateListener(cb: (state: UserGameState) => void) {
    this.onStateUpdated = cb;
  }

  public hasPendingTaps(): boolean {
    return this.pendingTapCount > 0 || this.isFlushingTaps;
  }

  public syncClientState(user: UserGameState) {
    this.saveLocalUser(user);
  }

  private getLocalUser(defaultUsername = 'FoxPlayer', isTelegram = false, refCode?: string): UserGameState {
    if (typeof window !== 'undefined') {
      const raw = localStorage.getItem(LOCAL_USER_KEY);
      if (raw) {
        try {
          const parsed = JSON.parse(raw) as UserGameState;
          return this.syncLocalUserProgress(parsed);
        } catch {}
      }
    }

    const now = Date.now();
    const initialTasks: Record<string, { progress: number; completed: boolean; claimed: boolean }> = {};
    for (const t of TASKS) {
      initialTasks[t.id] = { progress: 0, completed: false, claimed: false };
    }

    const hasRef = Boolean(refCode && refCode.trim());
    const startReferralBonus = hasRef ? GAME_CONSTANTS.REFERRAL_INVITEE_BONUS : 0;
    const startBalance = GAME_CONSTANTS.STARTING_BALANCE + startReferralBonus;
    const lvl = getPlayerLevel(startBalance);
    const nextLvl = getNextPlayerLevel(lvl.level);

    const newUser: UserGameState = {
      id: `fox_${Math.random().toString(36).substring(2, 9)}`,
      username: defaultUsername,
      displayName: defaultUsername,
      isGuest: !isTelegram,
      isTelegram,
      isAdmin: false,
      balance: startBalance,
      totalEarned: startBalance,
      totalTaps: 0,
      level: lvl.level,
      levelName: lvl.name,
      nextLevelMinCoins: nextLvl ? nextLvl.minCoins : lvl.minCoins,
      currentLevelMinCoins: lvl.minCoins,
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
      tasks: initialTasks,
      referralCode: `FOX_${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
      referralCount: hasRef ? 1 : 0,
      referralEarnings: startReferralBonus,
      claimedMilestones: 0,
      hasJoinedChannel: false,
      boosters: {
        fullEnergyRemaining: 6,
        nextFullEnergyAt: 0,
        turboActiveUntil: 0,
        nextTurboAt: 0,
      },
      createdAt: now,
    };

    this.saveLocalUser(newUser);
    return newUser;
  }

  private syncLocalUserProgress(user: UserGameState): UserGameState {
    const now = Date.now();
    const todayStr = new Date(now).toISOString().split('T')[0];
    user.canClaimDaily = user.lastDailyClaimDate !== todayStr;

    if (user.profitPerHour > 0 && user.lastPassiveClaimTimestamp > 0) {
      const elapsedHours = Math.min(
        user.maxOfflineHours || 3,
        Math.max(0, (now - user.lastPassiveClaimTimestamp) / (1000 * 3600))
      );
      user.unclaimedPassive = Math.floor(elapsedHours * user.profitPerHour);
    }

    reconcileUserLevel(user, this.getLocalUpgrades());

    return user;
  }

  private saveLocalUser(user: UserGameState) {
    if (typeof window !== 'undefined') {
      localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(user));
    }
  }

  private getLocalTrades(): TradeOrder[] {
    if (typeof window !== 'undefined') {
      const raw = localStorage.getItem(LOCAL_TRADES_KEY);
      if (raw) {
        try {
          return JSON.parse(raw);
        } catch {}
      }
    }
    return [];
  }

  private saveLocalTrades(trades: TradeOrder[]) {
    if (typeof window !== 'undefined') {
      localStorage.setItem(LOCAL_TRADES_KEY, JSON.stringify(trades));
    }
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    // Attach lightweight state snapshot header so Cloudflare Edge isolates can seamlessly rehydrate after cold-starts
    if (typeof window !== 'undefined') {
      try {
        const rawUser = localStorage.getItem(LOCAL_USER_KEY);
        if (rawUser) {
          headers['x-fox-sync'] = btoa(encodeURIComponent(rawUser));
        }
      } catch {}
    }

    const response = await fetch(endpoint, {
      ...options,
      headers,
    });

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      throw new Error(`ENDPOINT_NOT_JSON:${response.status}`);
    }

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Server error occurred');
    }

    return data as T;
  }

  private isStaticFallbackError(err: any): boolean {
    const msg = String(err?.message || '');
    return (
      msg.startsWith('ENDPOINT_NOT_JSON') ||
      msg.includes('Failed to fetch') ||
      msg.includes('NetworkError') ||
      msg.includes('404') ||
      msg.includes('Unauthorized')
    );
  }

  private getLocalUpgrades(): UpgradeDefinition[] {
    if (typeof window !== 'undefined') {
      const raw = localStorage.getItem(LOCAL_UPGRADES_KEY);
      if (raw) {
        try {
          const parsed = JSON.parse(raw) as UpgradeDefinition[];
          if (Array.isArray(parsed) && parsed.length > 0) {
            // Merge any newly added default UPGRADES not yet in parsed
            const map = new Map(parsed.map((u) => [u.id, sanitizeUpgrade(u)]));
            for (const def of UPGRADES) {
              if (!map.has(def.id)) {
                map.set(def.id, def);
              }
            }
            return Array.from(map.values());
          }
        } catch {}
      }
    }
    return [...UPGRADES];
  }

  private getLocalWheelPrizes(): LuckyWheelPrize[] {
    if (typeof window !== 'undefined') {
      const raw = localStorage.getItem(LOCAL_WHEEL_KEY);
      if (raw) {
        try {
          const parsed = JSON.parse(raw) as LuckyWheelPrize[];
          if (Array.isArray(parsed) && parsed.length > 0) return parsed.map(sanitizeWheelPrize);
        } catch {}
      }
    }
    return [...LUCKY_WHEEL_PRIZES];
  }

  public async getConfig(): Promise<GameConfig> {
    try {
      const cfg = await this.request<GameConfig>('/api/game/config');
      if (cfg.upgrades) cfg.upgrades = cfg.upgrades.map(sanitizeUpgrade);
      if (cfg.wheelPrizes) cfg.wheelPrizes = cfg.wheelPrizes.map(sanitizeWheelPrize);
      return cfg;
    } catch (err) {
      if (this.isStaticFallbackError(err)) {
        const savedBot = typeof window !== 'undefined' ? localStorage.getItem(LOCAL_BOT_KEY) : null;
        let botUsername = 'FOXCOINBot';
        if (savedBot) {
          try {
            botUsername = JSON.parse(savedBot).botUsername || 'FOXCOINBot';
          } catch {}
        }
        return {
          upgrades: this.getLocalUpgrades(),
          wheelPrizes: this.getLocalWheelPrizes(),
          levels: PLAYER_LEVELS,
          tasks: TASKS,
          dailyRewards: DAILY_REWARDS,
          constants: GAME_CONSTANTS,
          telegramBotUsername: botUsername,
        };
      }
      throw err;
    }
  }

  public async authTelegram(initData: string, refCode?: string): Promise<{ token: string; user: UserGameState }> {
    try {
      const res = await this.request<{ token: string; user: UserGameState }>('/api/auth/telegram', {
        method: 'POST',
        body: JSON.stringify({ initData, refCode }),
      });
      this.setToken(res.token);
      this.saveLocalUser(res.user);
      return res;
    } catch (err) {
      if (this.isStaticFallbackError(err)) {
        let username = 'TelegramFox';
        try {
          const params = new URLSearchParams(initData);
          const u = JSON.parse(params.get('user') || '{}');
          if (u.username || u.first_name) username = u.username || u.first_name;
        } catch {}
        const user = this.getLocalUser(username, true, refCode);
        const token = `local_token_${user.id}`;
        this.setToken(token);
        return { token, user };
      }
      throw err;
    }
  }

  public async authGuest(username?: string, refCode?: string): Promise<{ token: string; user: UserGameState }> {
    try {
      const res = await this.request<{ token: string; user: UserGameState }>('/api/auth/guest', {
        method: 'POST',
        body: JSON.stringify({ username, refCode }),
      });
      this.setToken(res.token);
      this.saveLocalUser(res.user);
      return res;
    } catch (err) {
      if (this.isStaticFallbackError(err)) {
        const user = this.getLocalUser(username || 'FoxPlayer', false, refCode);
        const token = `local_token_${user.id}`;
        this.setToken(token);
        return { token, user };
      }
      throw err;
    }
  }

  public async authRegister(email: string, pass: string, username?: string, refCode?: string): Promise<{ token: string; user: UserGameState }> {
    try {
      const res = await this.request<{ token: string; user: UserGameState }>('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({ email, password: pass, username, refCode }),
      });
      this.setToken(res.token);
      this.saveLocalUser(res.user);
      return res;
    } catch (err) {
      if (this.isStaticFallbackError(err)) {
        const user = this.getLocalUser(username || email.split('@')[0], false, refCode);
        user.email = email;
        user.isGuest = false;
        user.isAdmin = email.toLowerCase().trim() === 'k39127031@gmail.com';
        this.saveLocalUser(user);
        const token = `local_token_${user.id}`;
        this.setToken(token);
        return { token, user };
      }
      throw err;
    }
  }

  public async authLogin(email: string, pass: string): Promise<{ token: string; user: UserGameState }> {
    try {
      const res = await this.request<{ token: string; user: UserGameState }>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password: pass }),
      });
      this.setToken(res.token);
      this.saveLocalUser(res.user);
      return res;
    } catch (err) {
      if (this.isStaticFallbackError(err)) {
        const user = this.getLocalUser(email.split('@')[0], false);
        user.email = email;
        user.isGuest = false;
        user.isAdmin = email.toLowerCase().trim() === 'k39127031@gmail.com';
        this.saveLocalUser(user);
        const token = `local_token_${user.id}`;
        this.setToken(token);
        return { token, user };
      }
      throw err;
    }
  }

  public async getMe(): Promise<{ user: UserGameState }> {
    try {
      const res = await this.request<{ user: UserGameState }>('/api/auth/me');
      this.saveLocalUser(res.user);
      return res;
    } catch (err) {
      if (this.isStaticFallbackError(err)) {
        return { user: this.getLocalUser() };
      }
      throw err;
    }
  }

  public async linkAccount(email: string, pass: string): Promise<{ success: boolean; user: UserGameState }> {
    try {
      return await this.request<{ success: boolean; user: UserGameState }>('/api/auth/link', {
        method: 'POST',
        body: JSON.stringify({ email, password: pass }),
      });
    } catch (err) {
      if (this.isStaticFallbackError(err)) {
        const user = this.getLocalUser();
        user.email = email;
        user.isGuest = false;
        this.saveLocalUser(user);
        return { success: true, user };
      }
      throw err;
    }
  }

  public queueTap(count: number = 1) {
    this.pendingTapCount += count;

    if (this.tapBatchTimer) {
      clearTimeout(this.tapBatchTimer);
    }

    if (this.pendingTapCount >= 20) {
      this.flushTaps();
    } else {
      this.tapBatchTimer = setTimeout(() => {
        this.flushTaps();
      }, 400);
    }
  }

  public async flushTaps(): Promise<UserGameState | null> {
    if (this.pendingTapCount <= 0 || this.isFlushingTaps) return null;

    const countToSend = this.pendingTapCount;
    this.pendingTapCount = 0;
    this.isFlushingTaps = true;

    try {
      const res = await this.request<{ user: UserGameState }>('/api/game/tap', {
        method: 'POST',
        body: JSON.stringify({ tapCount: countToSend }),
      });

      this.saveLocalUser(res.user);
      // Only push server state to UI if no newer taps occurred while the request was in flight
      if (this.onStateUpdated && res.user && this.pendingTapCount === 0) {
        this.onStateUpdated(res.user);
      }
      return res.user;
    } catch (err) {
      if (this.isStaticFallbackError(err)) {
        const user = this.getLocalUser();
        this.syncLocalUserProgress(user);
        this.saveLocalUser(user);
        if (this.onStateUpdated && this.pendingTapCount === 0) {
          this.onStateUpdated(user);
        }
        return user;
      }
      return null;
    } finally {
      this.isFlushingTaps = false;
      if (this.pendingTapCount > 0) {
        this.flushTaps();
      }
    }
  }

  public async purchaseUpgrade(upgradeId: string): Promise<UserGameState> {
    if (this.pendingTapCount > 0) {
      await this.flushTaps();
    }

    try {
      const res = await this.request<{ user: UserGameState }>('/api/game/upgrade', {
        method: 'POST',
        body: JSON.stringify({ upgradeId }),
      });

      const reconciled = reconcileUserLevel(res.user, this.getLocalUpgrades());
      this.saveLocalUser(reconciled);
      if (this.onStateUpdated && reconciled) {
        this.onStateUpdated(reconciled);
      }
      return reconciled;
    } catch (err) {
      if (this.isStaticFallbackError(err)) {
        const user = this.getLocalUser();
        const upg = this.getLocalUpgrades().find((u) => u.id === upgradeId);
        if (!upg) throw new Error('Upgrade not found');
        const currentLvl = user.upgrades[upgradeId] || 0;
        const price = calculateUpgradePrice(upg, currentLvl);
        const isGift = upg.category === 'gift';
        if (!isGift && user.balance < price) throw new Error('Insufficient FOX balance');

        if (!isGift) {
          user.balance -= price;
          user.totalEarned = Math.max(user.totalEarned || 0, user.balance + price) + getUpgradeXpBonus(price);
        } else {
          user.totalEarned = (user.totalEarned || 0) + getUpgradeXpBonus(upg.baseBenefit * 2);
        }
        user.upgrades[upgradeId] = currentLvl + 1;
        if (upg.benefitType === 'tap_power') user.tapPower += upg.baseBenefit;
        if (upg.benefitType === 'max_energy') {
          user.maxEnergy += upg.baseBenefit;
          user.energy += upg.baseBenefit;
        }
        if (upg.benefitType === 'energy_regen') user.energyRegenRate += upg.baseBenefit;
        if (upg.benefitType === 'profit_per_hour') user.profitPerHour += upg.baseBenefit;

        this.syncLocalUserProgress(user);
        this.saveLocalUser(user);
        if (this.onStateUpdated) this.onStateUpdated(user);
        return user;
      }
      throw err;
    }
  }

  private getSavedBotToken(): string | undefined {
    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem(LOCAL_BOT_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed?.botToken && String(parsed.botToken).includes(':')) {
            return String(parsed.botToken).trim();
          }
        }
      } catch {}
    }
    return undefined;
  }

  public async createStarsGiftInvoice(giftId: string): Promise<{
    success: boolean;
    invoiceUrl: string;
    invoicePayload: string;
    starsAmount: number;
    edition: number;
    giftId: string;
    giftName: string;
  }> {
    if (this.pendingTapCount > 0) {
      await this.flushTaps();
    }

    const savedBotToken = this.getSavedBotToken();

    try {
      return await this.request('/api/game/gifts/create-invoice', {
        method: 'POST',
        body: JSON.stringify({
          giftId,
          botToken: savedBotToken,
        }),
      });
    } catch (err: any) {
      if (this.isStaticFallbackError(err)) {
        const user = this.getLocalUser();
        const upg = this.getLocalUpgrades().find((u) => u.id === giftId && u.category === 'gift');
        if (!upg) throw new Error('Gift item not found');
        if (user.level < upg.levelRequirement) {
          throw new Error(`Requires Player Level ${upg.levelRequirement} to unlock ${upg.name}`);
        }
        if (!savedBotToken) {
          throw new Error(
            'Telegram Bot Token is not configured yet. Please open Admin Panel -> Bot Setup and connect your Telegram Bot Token to enable Telegram Stars (XTR) payments.'
          );
        }

        const currentLvl = user.upgrades[giftId] || 0;
        const starsAmount = Math.max(1, calculateUpgradePrice(upg, currentLvl));
        const edition = currentLvl + 1;
        const invoicePayload = `fg|${user.id}|${upg.id}|${Date.now().toString(36)}`.slice(0, 128);

        const tgRes = await fetch(`https://api.telegram.org/bot${savedBotToken}/createInvoiceLink`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: `${upg.name} (#${edition})`.slice(0, 32),
            description: `${upg.description} · Boosts passive mining by +${upg.baseBenefit.toLocaleString('en-US')} FOX/hr`.slice(0, 255),
            payload: invoicePayload,
            provider_token: '',
            currency: 'XTR',
            prices: [
              {
                label: `${upg.name} (#${edition})`.slice(0, 32),
                amount: starsAmount,
              },
            ],
          }),
        });

        const tgData = await tgRes.json();
        if (!tgRes.ok || !tgData.ok || typeof tgData.result !== 'string') {
          throw new Error(tgData.description || 'Failed to generate Telegram Stars invoice link');
        }

        return {
          success: true,
          invoiceUrl: tgData.result,
          invoicePayload,
          starsAmount,
          edition,
          giftId: upg.id,
          giftName: upg.name,
        };
      }
      throw err;
    }
  }

  public async confirmStarsGiftPayment(
    giftId: string,
    invoicePayload?: string
  ): Promise<UserGameState> {
    try {
      const res = await this.request<{ success: boolean; user: UserGameState }>(
        '/api/game/gifts/confirm-payment',
        {
          method: 'POST',
          body: JSON.stringify({ giftId, invoicePayload }),
        }
      );

      const reconciled = reconcileUserLevel(res.user, this.getLocalUpgrades());
      this.saveLocalUser(reconciled);
      if (this.onStateUpdated && reconciled) {
        this.onStateUpdated(reconciled);
      }
      return reconciled;
    } catch (err) {
      if (this.isStaticFallbackError(err)) {
        return this.purchaseUpgrade(giftId);
      }
      throw err;
    }
  }

  public async checkStarsGiftInvoice(
    invoicePayload: string
  ): Promise<{ found: boolean; status: 'pending' | 'paid'; user?: UserGameState }> {
    try {
      const res = await this.request<{ found: boolean; status: 'pending' | 'paid'; user?: UserGameState }>(
        `/api/game/gifts/check-invoice?invoicePayload=${encodeURIComponent(invoicePayload)}`
      );
      if (res.status === 'paid' && res.user) {
        const reconciled = reconcileUserLevel(res.user, this.getLocalUpgrades());
        this.saveLocalUser(reconciled);
        if (this.onStateUpdated) {
          this.onStateUpdated(reconciled);
        }
        return { ...res, user: reconciled };
      }
      return res;
    } catch {
      return { found: false, status: 'pending' };
    }
  }

  public async claimPassive(): Promise<{ user: UserGameState; claimedAmount: number }> {
    try {
      const res = await this.request<{ user: UserGameState; claimedAmount: number }>('/api/game/claim-passive', {
        method: 'POST',
      });

      this.saveLocalUser(res.user);
      if (this.onStateUpdated && res.user) {
        this.onStateUpdated(res.user);
      }
      return res;
    } catch (err) {
      if (this.isStaticFallbackError(err)) {
        const user = this.getLocalUser();
        const claimedAmount = user.unclaimedPassive || 0;
        user.balance += claimedAmount;
        user.totalEarned += claimedAmount;
        user.unclaimedPassive = 0;
        user.lastPassiveClaimTimestamp = Date.now();
        this.syncLocalUserProgress(user);
        this.saveLocalUser(user);
        if (this.onStateUpdated) this.onStateUpdated(user);
        return { user, claimedAmount };
      }
      throw err;
    }
  }

  public async claimDaily(): Promise<{ user: UserGameState; rewardAmount: number }> {
    try {
      const res = await this.request<{ user: UserGameState; rewardAmount: number }>('/api/game/claim-daily', {
        method: 'POST',
      });

      this.saveLocalUser(res.user);
      if (this.onStateUpdated && res.user) {
        this.onStateUpdated(res.user);
      }
      return res;
    } catch (err) {
      if (this.isStaticFallbackError(err)) {
        const user = this.getLocalUser();
        const todayStr = new Date().toISOString().split('T')[0];
        if (user.lastDailyClaimDate === todayStr) {
          throw new Error('Daily reward already claimed today');
        }
        const nextDayIndex = user.dailyStreak % DAILY_REWARDS.length;
        const rewardAmount = DAILY_REWARDS[nextDayIndex].coins;
        user.dailyStreak += 1;
        user.lastDailyClaimDate = todayStr;
        user.canClaimDaily = false;
        user.balance += rewardAmount;
        user.totalEarned += rewardAmount;
        this.syncLocalUserProgress(user);
        this.saveLocalUser(user);
        if (this.onStateUpdated) this.onStateUpdated(user);
        return { user, rewardAmount };
      }
      throw err;
    }
  }

  public async claimTask(taskId: string): Promise<{ user: UserGameState; reward: number }> {
    try {
      const res = await this.request<{ user: UserGameState; reward: number }>('/api/game/claim-task', {
        method: 'POST',
        body: JSON.stringify({ taskId }),
      });

      this.saveLocalUser(res.user);
      if (this.onStateUpdated && res.user) {
        this.onStateUpdated(res.user);
      }
      return res;
    } catch (err) {
      if (this.isStaticFallbackError(err)) {
        const user = this.getLocalUser();
        const taskDef = TASKS.find((t) => t.id === taskId);
        if (!taskDef) throw new Error('Task not found');
        if (user.tasks[taskId]?.claimed) throw new Error('Task already claimed');

        user.tasks[taskId] = { progress: taskDef.target, completed: true, claimed: true };
        user.balance += taskDef.reward;
        user.totalEarned += taskDef.reward;
        this.syncLocalUserProgress(user);
        this.saveLocalUser(user);
        if (this.onStateUpdated) this.onStateUpdated(user);
        return { user, reward: taskDef.reward };
      }
      throw err;
    }
  }

  public async useBooster(type: 'full_energy' | 'turbo'): Promise<UserGameState> {
    try {
      const res = await this.request<{ user: UserGameState }>('/api/game/boost', {
        method: 'POST',
        body: JSON.stringify({ type }),
      });

      this.saveLocalUser(res.user);
      if (this.onStateUpdated && res.user) {
        this.onStateUpdated(res.user);
      }
      return res.user;
    } catch (err) {
      if (this.isStaticFallbackError(err)) {
        const user = this.getLocalUser();
        const now = Date.now();
        if (type === 'full_energy') {
          if (user.boosters.fullEnergyRemaining <= 0) throw new Error('No energy refills remaining');
          user.boosters.fullEnergyRemaining -= 1;
          user.energy = user.maxEnergy;
        } else {
          user.boosters.turboActiveUntil = now + GAME_CONSTANTS.TURBO_DURATION_MS;
          user.boosters.nextTurboAt = now + 3600 * 1000;
        }
        this.saveLocalUser(user);
        if (this.onStateUpdated) this.onStateUpdated(user);
        return user;
      }
      throw err;
    }
  }

  public async spinLuckyWheel(): Promise<{ user: UserGameState; prize: LuckyWheelPrize; prizeIndex: number }> {
    try {
      const res = await this.request<{ user: UserGameState; prize: LuckyWheelPrize; prizeIndex: number }>(
        '/api/game/spin-wheel',
        { method: 'POST' }
      );
      this.saveLocalUser(res.user);
      if (this.onStateUpdated && res.user) {
        this.onStateUpdated(res.user);
      }
      return res;
    } catch (err) {
      if (this.isStaticFallbackError(err)) {
        const user = this.getLocalUser();
        const now = Date.now();
        const lastSpin = user.boosters.lastWheelSpinTimestamp || 0;
        if (now - lastSpin < GAME_CONSTANTS.WHEEL_COOLDOWN_MS) {
          throw new Error('Lucky Wheel is on 24h cooldown');
        }
        const { prize, index: prizeIndex } = pickLuckyWheelPrize(this.getLocalWheelPrizes());
        user.boosters.lastWheelSpinTimestamp = now;

        if (prize.type === 'coins') {
          user.balance += prize.amount;
          user.totalEarned += prize.amount;
        } else if (prize.type === 'full_energy') {
          user.energy = user.maxEnergy;
          user.boosters.fullEnergyRemaining += prize.amount;
        } else if (prize.type === 'turbo') {
          const baseUntil = Math.max(now, user.boosters.turboActiveUntil || 0);
          user.boosters.turboActiveUntil = baseUntil + prize.amount * 1000;
        }
        this.syncLocalUserProgress(user);
        this.saveLocalUser(user);
        if (this.onStateUpdated) this.onStateUpdated(user);
        return { user, prize, prizeIndex };
      }
      throw err;
    }
  }

  public async getLeaderboard(limit = 50): Promise<{ list: LeaderboardEntry[]; playerEntry?: LeaderboardEntry }> {
    try {
      return await this.request<{ list: LeaderboardEntry[]; playerEntry?: LeaderboardEntry }>(`/api/game/leaderboard?limit=${limit}`);
    } catch (err) {
      if (this.isStaticFallbackError(err)) {
        const user = this.getLocalUser();
        const mockList: LeaderboardEntry[] = [
          { rank: 1, id: '1', displayName: 'Golden Fox 🦊', username: 'GoldenFoxMaster', balance: 142500000, profitPerHour: 450000, level: 8, levelName: 'Master Fox' },
          { rank: 2, id: '2', displayName: 'Satoshi Den ⚡', username: 'Satoshi_Den', balance: 98340000, profitPerHour: 380000, level: 7, levelName: 'Legendary Fox' },
          { rank: 3, id: '3', displayName: 'Cyber Vixen 💎', username: 'CyberVixen', balance: 64120000, profitPerHour: 240000, level: 7, levelName: 'Legendary Fox' },
          { rank: 4, id: user.id, displayName: user.displayName, username: user.username, balance: user.balance, profitPerHour: user.profitPerHour, level: user.level, levelName: user.levelName, isCurrentPlayer: true },
        ];
        return { list: mockList, playerEntry: mockList[3] };
      }
      throw err;
    }
  }

  public async claimMilestone(): Promise<{ user: UserGameState; claimedCount: number; bonus: number }> {
    try {
      const res = await this.request<{ user: UserGameState; claimedCount: number; bonus: number }>('/api/friends/claim-milestone', {
        method: 'POST',
      });

      this.saveLocalUser(res.user);
      if (this.onStateUpdated && res.user) {
        this.onStateUpdated(res.user);
      }
      return res;
    } catch (err) {
      if (this.isStaticFallbackError(err)) {
        const user = this.getLocalUser();
        const totalMilestones = Math.floor(user.referralCount / 10);
        const alreadyClaimed = user.claimedMilestones || 0;
        const available = totalMilestones - alreadyClaimed;
        if (available <= 0) {
          throw new Error('Invite 10 friends to unlock the +10,000 FOX milestone bonus');
        }
        const bonus = available * 10000;
        user.claimedMilestones = totalMilestones;
        user.balance += bonus;
        user.totalEarned += bonus;
        user.referralEarnings += bonus;
        this.syncLocalUserProgress(user);
        this.saveLocalUser(user);
        if (this.onStateUpdated) this.onStateUpdated(user);
        return { user, claimedCount: available, bonus };
      }
      throw err;
    }
  }

  public async verifyChannelMembership(): Promise<{ success: boolean; user: UserGameState; bonus?: number }> {
    try {
      const res = await this.request<{ success: boolean; user: UserGameState; bonus?: number }>('/api/telegram/verify-channel', {
        method: 'POST',
      });

      this.saveLocalUser(res.user);
      if (this.onStateUpdated && res.user) {
        this.onStateUpdated(res.user);
      }
      return res;
    } catch (err) {
      if (this.isStaticFallbackError(err)) {
        const user = this.getLocalUser();
        let bonus = 0;
        if (!user.hasJoinedChannel) {
          bonus = 2000;
          user.hasJoinedChannel = true;
          user.channelVerifiedAt = Date.now();
          user.balance += bonus;
          user.totalEarned += bonus;
          this.syncLocalUserProgress(user);
          this.saveLocalUser(user);
        }
        if (this.onStateUpdated) this.onStateUpdated(user);
        return { success: true, user, bonus };
      }
      throw err;
    }
  }

  public async createTrade(params: {
    foxAmount: number;
    usdAmount: number;
    walletAddress: string;
    network: string;
  }): Promise<{ success: boolean; trade: TradeOrder; user: UserGameState }> {
    if (this.pendingTapCount > 0) {
      await this.flushTaps();
    }

    try {
      const res = await this.request<{ success: boolean; trade: TradeOrder; user: UserGameState }>('/api/trade/create', {
        method: 'POST',
        body: JSON.stringify(params),
      });

      this.saveLocalUser(res.user);
      if (this.onStateUpdated && res.user) {
        this.onStateUpdated(res.user);
      }
      return res;
    } catch (err) {
      if (this.isStaticFallbackError(err)) {
        const user = this.getLocalUser();
        const trades = this.getLocalTrades();
        const committedFox = trades
          .filter((t) => t.status !== 'cancelled')
          .reduce((sum, t) => sum + t.foxAmount, 0);
        const availableReferralFox = Math.max(0, (user.referralEarnings || 0) - committedFox);

        if (params.foxAmount < 10000) {
          throw new Error('Minimum trade amount is 10,000 Referral FOX ($10 USD)');
        }
        if (params.foxAmount > availableReferralFox) {
          throw new Error(
            `Only FOX earned from referrals can be traded. Available referral balance: ${availableReferralFox.toLocaleString('en-US')} FOX`
          );
        }

        user.balance = Math.max(0, user.balance - params.foxAmount);
        const now = Date.now();
        const trade: TradeOrder = {
          id: `trd_${Math.random().toString(36).substring(2, 9)}`,
          userId: user.id,
          foxAmount: params.foxAmount,
          usdAmount: Math.floor((params.foxAmount / 10000) * 10 * 100) / 100,
          walletAddress: params.walletAddress,
          network: params.network as any,
          status: 'pending',
          createdAt: now,
          payoutDeadline: now + 10 * 24 * 60 * 60 * 1000,
          txHash: `0x${Math.random().toString(16).substring(2, 14)}${Math.random().toString(16).substring(2, 14)}`,
        };

        trades.unshift(trade);
        this.saveLocalTrades(trades);
        this.saveLocalUser(user);
        if (this.onStateUpdated) this.onStateUpdated(user);
        return { success: true, trade, user };
      }
      throw err;
    }
  }

  public async getTrades(): Promise<{ trades: TradeOrder[] }> {
    try {
      return await this.request<{ trades: TradeOrder[] }>('/api/trade/list');
    } catch (err) {
      if (this.isStaticFallbackError(err)) {
        return { trades: this.getLocalTrades() };
      }
      throw err;
    }
  }

  public async verifyAdminAuth(adminSecret?: string): Promise<{ isAdmin: boolean }> {
    try {
      const headers: Record<string, string> = {};
      if (adminSecret) headers['x-admin-secret'] = adminSecret;
      return await this.request<{ isAdmin: boolean }>('/api/admin/auth/verify', { headers });
    } catch (err) {
      if (this.isStaticFallbackError(err)) {
        if (adminSecret !== '123456') {
          throw new Error('Invalid Administrator Secret Key');
        }
        return { isAdmin: true };
      }
      throw err;
    }
  }

  public async getAdminTelegramConfig(adminSecret?: string): Promise<any> {
    try {
      const headers: Record<string, string> = {};
      if (adminSecret) headers['x-admin-secret'] = adminSecret;
      return await this.request('/api/admin/telegram/config', { headers });
    } catch (err) {
      if (this.isStaticFallbackError(err)) {
        const origin = typeof window !== 'undefined' ? window.location.origin : 'https://fox-coin.pages.dev';
        const saved = typeof window !== 'undefined' ? localStorage.getItem(LOCAL_BOT_KEY) : null;
        const parsed = saved ? JSON.parse(saved) : {};
        return {
          hasToken: Boolean(parsed.hasToken),
          maskedToken: parsed.maskedToken || null,
          webhookUrl: parsed.webhookUrl || `${origin}/api/telegram/webhook`,
          suggestedWebhookUrl: `${origin}/api/telegram/webhook`,
          botUsername: parsed.botUsername || 'FOXCOINBot',
          botFirstName: parsed.botFirstName || 'FOXCOIN',
          isConfigured: Boolean(parsed.isConfigured),
          lastWebhookSetupDate: parsed.lastWebhookSetupDate,
        };
      }
      throw err;
    }
  }

  public async checkAdminWebhookStatus(botToken?: string, adminSecret?: string): Promise<{ success: boolean; info: any }> {
    try {
      const headers: Record<string, string> = {};
      if (adminSecret) headers['x-admin-secret'] = adminSecret;
      return await this.request('/api/admin/telegram/status', {
        method: 'POST',
        headers,
        body: JSON.stringify({ botToken }),
      });
    } catch (err) {
      if (this.isStaticFallbackError(err) && botToken) {
        const tgRes = await fetch(`https://api.telegram.org/bot${botToken.trim()}/getWebhookInfo`);
        const tgData = await tgRes.json();
        if (!tgData.ok) throw new Error(tgData.description || 'Invalid bot token');
        return { success: true, info: tgData.result };
      }
      throw err;
    }
  }

  public async autoSetupTelegramBot(
    botToken: string,
    adminSecret?: string
  ): Promise<{
    success: boolean;
    description: string;
    botUsername: string;
    botFirstName?: string;
    appUrl: string;
    webhookUrl: string;
    telegramLink: string;
  }> {
    try {
      const headers: Record<string, string> = {};
      if (adminSecret) headers['x-admin-secret'] = adminSecret;
      const res = await this.request<{
        success: boolean;
        description: string;
        botUsername: string;
        botFirstName?: string;
        appUrl: string;
        webhookUrl: string;
        telegramLink: string;
      }>('/api/admin/telegram/auto-setup', {
        method: 'POST',
        headers,
        body: JSON.stringify({ botToken }),
      });

      if (typeof window !== 'undefined' && botToken && botToken.trim()) {
        const cleanToken = botToken.trim();
        localStorage.setItem(
          LOCAL_BOT_KEY,
          JSON.stringify({
            hasToken: true,
            botToken: cleanToken,
            maskedToken: `${cleanToken.slice(0, 6)}...${cleanToken.slice(-4)}`,
            webhookUrl: res.webhookUrl,
            botUsername: res.botUsername,
            botFirstName: res.botFirstName,
            isConfigured: true,
            lastWebhookSetupDate: Date.now(),
          })
        );
      }

      return res;
    } catch (err) {
      if (this.isStaticFallbackError(err)) {
        const cleanToken = botToken.trim();
        const meRes = await fetch(`https://api.telegram.org/bot${cleanToken}/getMe`);
        const meData = await meRes.json();
        if (!meData.ok) {
          throw new Error(meData.description || 'Invalid Telegram Bot Token');
        }
        const botUsername = meData.result.username;
        const botFirstName = meData.result.first_name;
        const appUrl = typeof window !== 'undefined' ? window.location.origin : 'https://fox-coin.pages.dev';
        const webhookUrl = `${appUrl}/api/telegram/webhook`;

        // Configure Telegram Mini App Chat Menu Button directly
        await fetch(`https://api.telegram.org/bot${cleanToken}/setChatMenuButton`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            menu_button: {
              type: 'web_app',
              text: 'Play FOXCOIN 🦊',
              web_app: { url: appUrl },
            },
          }),
        }).catch(() => {});

        // Configure Bot Commands directly
        await fetch(`https://api.telegram.org/bot${cleanToken}/setMyCommands`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            commands: [
              { command: 'start', description: 'Start FOXCOIN Mini App 🦊' },
              { command: 'play', description: 'Launch Game & Earn FOX 💰' },
              { command: 'invite', description: 'Get Referral Link (+5,000 FOX) 👥' },
            ],
          }),
        }).catch(() => {});

        if (typeof window !== 'undefined') {
          localStorage.setItem(
            LOCAL_BOT_KEY,
            JSON.stringify({
              hasToken: true,
              botToken: cleanToken,
              maskedToken: `${cleanToken.slice(0, 6)}...${cleanToken.slice(-4)}`,
              webhookUrl,
              botUsername,
              botFirstName,
              isConfigured: true,
              lastWebhookSetupDate: Date.now(),
            })
          );
        }

        return {
          success: true,
          description: 'Bot activated! Mini App Menu Button and Commands configured on Telegram.',
          botUsername,
          botFirstName,
          appUrl,
          webhookUrl,
          telegramLink: `https://t.me/${botUsername}`,
        };
      }
      throw err;
    }
  }

  public async setAdminWebhook(
    params: { botToken?: string; webhookUrl: string; secretToken?: string; saveToken?: boolean },
    adminSecret?: string
  ): Promise<{ success: boolean; description: string; botUsername?: string; webhookUrl: string }> {
    try {
      const headers: Record<string, string> = {};
      if (adminSecret) headers['x-admin-secret'] = adminSecret;
      return await this.request('/api/admin/telegram/set-webhook', {
        method: 'POST',
        headers,
        body: JSON.stringify(params),
      });
    } catch (err) {
      if (this.isStaticFallbackError(err) && params.botToken) {
        const res = await this.autoSetupTelegramBot(params.botToken, adminSecret);
        return {
          success: true,
          description: res.description,
          botUsername: res.botUsername,
          webhookUrl: params.webhookUrl,
        };
      }
      throw err;
    }
  }

  public async deleteAdminWebhook(
    confirm: boolean,
    botToken?: string,
    adminSecret?: string
  ): Promise<{ success: boolean; description: string }> {
    const headers: Record<string, string> = {};
    if (adminSecret) headers['x-admin-secret'] = adminSecret;
    return this.request('/api/admin/telegram/delete-webhook', {
      method: 'POST',
      headers,
      body: JSON.stringify({ confirm, botToken }),
    });
  }

  public async uploadToGitHub(
    params: { token: string; repoName: string; isPrivate?: boolean; commitMessage?: string },
    adminSecret?: string
  ): Promise<{ success: boolean; repoUrl: string; repoFullName: string; commitSha: string; fileCount: number }> {
    const headers: Record<string, string> = {};
    if (adminSecret) headers['x-admin-secret'] = adminSecret;
    return this.request('/api/admin/github/upload', {
      method: 'POST',
      headers,
      body: JSON.stringify(params),
    });
  }

  public getProjectZipDownloadUrl(adminSecret?: string): string {
    const secret = adminSecret || '123456';
    return `/api/admin/project/download-zip?secret=${encodeURIComponent(secret)}`;
  }

  public async getAdminUsers(adminSecret?: string): Promise<{ users: UserGameState[] }> {
    try {
      const headers: Record<string, string> = {};
      if (adminSecret) headers['x-admin-secret'] = adminSecret;
      return await this.request<{ users: UserGameState[] }>('/api/admin/users', { headers });
    } catch (err) {
      if (this.isStaticFallbackError(err)) {
        const currentUser = this.getLocalUser();
        const extraRaw = typeof window !== 'undefined' ? localStorage.getItem('foxcoin_local_all_users_v1') : null;
        let list: UserGameState[] = [];
        if (extraRaw) {
          try {
            list = JSON.parse(extraRaw);
          } catch {}
        }
        const existingIdx = list.findIndex((u) => u.id === currentUser.id);
        if (existingIdx >= 0) {
          list[existingIdx] = currentUser;
        } else {
          list.unshift(currentUser);
        }
        if (typeof window !== 'undefined') {
          localStorage.setItem('foxcoin_local_all_users_v1', JSON.stringify(list));
        }
        return { users: list };
      }
      throw err;
    }
  }

  public async adjustAdminUserBalance(
    params: {
      userId: string;
      amount: number;
      operation: 'add' | 'deduct' | 'set';
      balanceType?: 'main' | 'referral';
    },
    adminSecret?: string
  ): Promise<{ success: boolean; user: UserGameState; users: UserGameState[] }> {
    try {
      const headers: Record<string, string> = {};
      if (adminSecret) headers['x-admin-secret'] = adminSecret;
      const res = await this.request<{ success: boolean; user: UserGameState; users: UserGameState[] }>(
        '/api/admin/users/adjust-balance',
        {
          method: 'POST',
          headers,
          body: JSON.stringify(params),
        }
      );

      if (this.onStateUpdated && res.user) {
        const currentLocal = this.getLocalUser();
        if (res.user.id === currentLocal.id) {
          this.saveLocalUser(res.user);
          this.onStateUpdated(res.user);
        }
      }
      return res;
    } catch (err) {
      if (this.isStaticFallbackError(err)) {
        const { users } = await this.getAdminUsers(adminSecret);
        const target = users.find((u) => u.id === params.userId);
        if (!target) throw new Error('User not found');

        const cleanAmount = Math.max(0, Math.floor(Number(params.amount) || 0));
        if (params.balanceType === 'referral') {
          if (params.operation === 'add') {
            target.referralEarnings = Math.max(0, (target.referralEarnings || 0) + cleanAmount);
            target.balance = Math.max(0, target.balance + cleanAmount);
            target.totalEarned += cleanAmount;
          } else if (params.operation === 'deduct') {
            target.referralEarnings = Math.max(0, (target.referralEarnings || 0) - cleanAmount);
            target.balance = Math.max(0, target.balance - cleanAmount);
          } else if (params.operation === 'set') {
            target.referralEarnings = cleanAmount;
          }
        } else {
          if (params.operation === 'add') {
            target.balance = Math.max(0, target.balance + cleanAmount);
            target.totalEarned += cleanAmount;
          } else if (params.operation === 'deduct') {
            target.balance = Math.max(0, target.balance - cleanAmount);
          } else if (params.operation === 'set') {
            target.balance = cleanAmount;
            if (cleanAmount > target.totalEarned) target.totalEarned = cleanAmount;
          }
        }

        this.syncLocalUserProgress(target);

        const currentLocal = this.getLocalUser();
        if (target.id === currentLocal.id) {
          this.saveLocalUser(target);
          if (this.onStateUpdated) this.onStateUpdated(target);
        }

        if (typeof window !== 'undefined') {
          localStorage.setItem('foxcoin_local_all_users_v1', JSON.stringify(users));
        }

        return { success: true, user: target, users };
      }
      throw err;
    }
  }

  public async adminSaveCard(
    card: UpgradeDefinition,
    adminSecret?: string
  ): Promise<{ success: boolean; upgrades: UpgradeDefinition[] }> {
    try {
      const headers: Record<string, string> = {};
      if (adminSecret) headers['x-admin-secret'] = adminSecret;
      const res = await this.request<{ success: boolean; upgrades: UpgradeDefinition[] }>(
        '/api/admin/cards/save',
        {
          method: 'POST',
          headers,
          body: JSON.stringify({ card }),
        }
      );
      if (typeof window !== 'undefined' && res.upgrades) {
        localStorage.setItem(LOCAL_UPGRADES_KEY, JSON.stringify(res.upgrades));
      }
      return res;
    } catch (err) {
      if (this.isStaticFallbackError(err)) {
        const list = this.getLocalUpgrades();
        const idx = list.findIndex((u) => u.id === card.id);
        if (idx >= 0) {
          list[idx] = card;
        } else {
          list.push(card);
        }
        if (typeof window !== 'undefined') {
          localStorage.setItem(LOCAL_UPGRADES_KEY, JSON.stringify(list));
        }
        return { success: true, upgrades: list };
      }
      throw err;
    }
  }

  public async adminDeleteCard(
    upgradeId: string,
    adminSecret?: string
  ): Promise<{ success: boolean; upgrades: UpgradeDefinition[] }> {
    try {
      const headers: Record<string, string> = {};
      if (adminSecret) headers['x-admin-secret'] = adminSecret;
      const res = await this.request<{ success: boolean; upgrades: UpgradeDefinition[] }>(
        '/api/admin/cards/delete',
        {
          method: 'POST',
          headers,
          body: JSON.stringify({ upgradeId }),
        }
      );
      if (typeof window !== 'undefined' && res.upgrades) {
        localStorage.setItem(LOCAL_UPGRADES_KEY, JSON.stringify(res.upgrades));
      }
      return res;
    } catch (err) {
      if (this.isStaticFallbackError(err)) {
        const list = this.getLocalUpgrades().filter((u) => u.id !== upgradeId);
        if (typeof window !== 'undefined') {
          localStorage.setItem(LOCAL_UPGRADES_KEY, JSON.stringify(list));
        }
        return { success: true, upgrades: list };
      }
      throw err;
    }
  }

  public async adminSaveWheelPrizes(
    prizes: LuckyWheelPrize[],
    adminSecret?: string
  ): Promise<{ success: boolean; wheelPrizes: LuckyWheelPrize[] }> {
    try {
      const headers: Record<string, string> = {};
      if (adminSecret) headers['x-admin-secret'] = adminSecret;
      const res = await this.request<{ success: boolean; wheelPrizes: LuckyWheelPrize[] }>(
        '/api/admin/wheel/save',
        {
          method: 'POST',
          headers,
          body: JSON.stringify({ prizes }),
        }
      );
      if (typeof window !== 'undefined' && res.wheelPrizes) {
        localStorage.setItem(LOCAL_WHEEL_KEY, JSON.stringify(res.wheelPrizes));
      }
      return res;
    } catch (err) {
      if (this.isStaticFallbackError(err)) {
        if (typeof window !== 'undefined') {
          localStorage.setItem(LOCAL_WHEEL_KEY, JSON.stringify(prizes));
        }
        return { success: true, wheelPrizes: prizes };
      }
      throw err;
    }
  }
}

export const api = new ApiService();

