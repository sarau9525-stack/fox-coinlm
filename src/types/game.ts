export interface UpgradeDefinition {
  id: string;
  name: string;
  description: string;
  category: 'tap' | 'passive' | 'special' | 'gift';
  basePrice: number;
  priceMultiplier: number;
  baseBenefit: number;
  benefitType: 'tap_power' | 'max_energy' | 'energy_regen' | 'profit_per_hour';
  icon: string;
  levelRequirement: number;
}

export interface PlayerLevel {
  level: number;
  name: string;
  minCoins: number;
  badge: string;
}

export interface TaskDefinition {
  id: string;
  title: string;
  description: string;
  category: 'daily' | 'progression' | 'social';
  reward: number;
  target: number;
  actionUrl?: string;
}

export interface DailyRewardDay {
  day: number;
  coins: number;
  specialBadge?: string;
}

export interface LuckyWheelPrize {
  id: string;
  label: string;
  shortLabel: string;
  persianLabel: string;
  type: 'coins' | 'full_energy' | 'turbo';
  amount: number; // FOX coins, or seconds for turbo, or +refills for full_energy
  weight: number;
  color: string;
  accentColor: string;
  rarity: 'common' | 'rare' | 'epic' | 'jackpot';
}

export interface UserGameState {
  id: string;
  username: string;
  displayName: string;
  email?: string;
  telegramId?: string | number;
  avatarUrl?: string;
  isGuest: boolean;
  isTelegram: boolean;
  isAdmin?: boolean;

  balance: number;
  totalEarned: number;
  totalTaps: number;
  level: number;
  levelName: string;
  nextLevelMinCoins: number;
  currentLevelMinCoins: number;

  energy: number;
  maxEnergy: number;
  energyRegenRate: number; // per second
  tapPower: number;
  profitPerHour: number;

  unclaimedPassive: number;
  lastPassiveClaimTimestamp: number;
  maxOfflineHours: number;

  upgrades: Record<string, number>; // upgradeId -> level

  dailyStreak: number;
  lastDailyClaimDate: string | null;
  canClaimDaily: boolean;
  dailyRewardDays: DailyRewardDay[];

  tasks: Record<string, { progress: number; completed: boolean; claimed: boolean }>;

  referralCode: string;
  referralCount: number;
  referralEarnings: number;
  claimedMilestones?: number; // Count of 10-friend milestones claimed (10,000 FOX per milestone)

  hasJoinedChannel?: boolean;
  channelVerifiedAt?: number;

  boosters: {
    fullEnergyRemaining: number;
    nextFullEnergyAt: number;
    turboActiveUntil: number;
    nextTurboAt: number;
    lastWheelSpinTimestamp?: number;
  };

  createdAt: number;
}

export interface TradeOrder {
  id: string;
  userId: string;
  foxAmount: number;
  usdAmount: number;
  walletAddress: string;
  network: 'USDT (TRC20)' | 'USDT (TON)' | 'USDT (BEP20)';
  status: 'pending' | 'processing' | 'completed' | 'cancelled';
  createdAt: number;
  payoutDeadline: number; // createdAt + (10 * 24 * 60 * 60 * 1000)
  txHash: string;
}

export interface LeaderboardEntry {
  rank: number;
  id: string;
  displayName: string;
  username: string;
  balance: number;
  profitPerHour: number;
  level: number;
  levelName: string;
  isCurrentPlayer?: boolean;
}

export interface TapResponse {
  balance: number;
  energy: number;
  maxEnergy: number;
  totalEarned: number;
  totalTaps: number;
  level: number;
  levelName: string;
  leveledUp: boolean;
}

export interface ClaimPassiveResponse {
  balance: number;
  claimedAmount: number;
  offlineSeconds: number;
  lastPassiveClaimTimestamp: number;
}

export interface WebhookInfoData {
  url: string;
  hasCustomCertificate: boolean;
  pendingUpdateCount: number;
  lastErrorDate?: number;
  lastErrorMessage?: string;
  maxConnections?: number;
  allowedUpdates?: string[];
  ipAddress?: string;
}

export interface AdminTelegramConfigResponse {
  isConfigured: boolean;
  hasToken: boolean;
  maskedToken?: string;
  botUsername?: string;
  botFirstName?: string;
  webhookUrl?: string;
  hasWebhookSecret: boolean;
  lastWebhookSetupDate?: number;
  approvedDomain: string;
  suggestedWebhookUrl: string;
  webhookInfo?: WebhookInfoData;
}
