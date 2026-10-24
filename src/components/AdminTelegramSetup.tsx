import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  Bot,
  Globe,
  Lock,
  Unlock,
  Ban,
  CheckSquare,
  Square,
  ChevronDown,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Trash2,
  ExternalLink,
  KeyRound,
  ArrowLeft,
  Sparkles,
  Zap,
  Github,
  Cloud,
  UploadCloud,
  Check,
  FileCode,
  Smartphone,
  Play,
  Send,
  Download,
  Users,
  Search,
  PlusCircle,
  MinusCircle,
  Coins,
  Layers,
  Gift,
  Compass,
  Save,
  Edit3,
  Trophy,
  UserPlus,
  Crown,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { api, GameConfig } from '../utils/api.js';
import {
  UserGameState,
  AdminTelegramConfigResponse,
  UpgradeDefinition,
  LuckyWheelPrize,
  FakeLeaderboardMember,
} from '../types/game.js';
import { UPGRADES, LUCKY_WHEEL_PRIZES, PLAYER_LEVELS } from '../../server/gameConfig.js';
import { sound } from '../utils/audio.js';

export type AdminTabType = 'users' | 'fake_rank' | 'locks' | 'cards' | 'gifts' | 'wheel' | 'webhook' | 'github';

const LOCKABLE_APP_SECTIONS: Array<{
  id: string;
  titleFa: string;
  titleEn: string;
  descFa: string;
  icon: string;
}> = [
  {
    id: 'leaderboard',
    titleFa: 'بخش رنک و لیدربورد (Rank / Hall of Foxes)',
    titleEn: 'Rank & Leaderboard',
    descFa: 'در صورت قفل شدن، هیچ کاربری نمی‌تواند جدول رتبه‌بندی (Rank) را مشاهده کند.',
    icon: '🏆',
  },
  {
    id: 'trade',
    titleFa: 'بخش ترید و تبدیل توکن (Trade)',
    titleEn: 'Trade & Swap',
    descFa: 'قفل کردن موقت بخش خرید، فروش و تبدیل توکن‌های FOX.',
    icon: '📈',
  },
  {
    id: 'gifts',
    titleFa: 'بخش گیفت‌های تلگرام (Fox Gifts)',
    titleEn: 'Telegram Stars Gifts',
    descFa: 'قفل کردن فروشگاه گیفت‌های استارز تلگرام.',
    icon: '🎁',
  },
  {
    id: 'upgrades',
    titleFa: 'بخش ماین و کارت‌های ارتقا (Mine / Cards)',
    titleEn: 'Mine & Upgrade Cards',
    descFa: 'قفل کردن خرید و ارتقای کارت‌های سود ساعتی.',
    icon: '⛏️',
  },
  {
    id: 'tasks',
    titleFa: 'بخش تسک‌ها و ماموریت‌ها (Earn / Tasks)',
    titleEn: 'Tasks & Rewards',
    descFa: 'قفل کردن صفحه ماموریت‌ها، پاداش روزانه و گردونه شانس.',
    icon: '🎯',
  },
  {
    id: 'friends',
    titleFa: 'بخش دعوت دوستان (Friends / Referrals)',
    titleEn: 'Invite Friends',
    descFa: 'قفل کردن صفحه زیرمجموعه‌گیری و لینک رفرال.',
    icon: '👥',
  },
];

const REALISTIC_FAKE_PROFILES: Array<{ displayName: string; username: string }> = [
  { displayName: 'Arash Crypto 🦊', username: 'arash_fox99' },
  { displayName: 'Mehdi Whale', username: 'mehdi_whale' },
  { displayName: 'Sina Trader', username: 'sina_trd' },
  { displayName: 'Kianosh_FX', username: 'kianosh_fx' },
  { displayName: 'Nima Miner 💎', username: 'nima_miner' },
  { displayName: 'Reza TonKing', username: 'reza_tonking' },
  { displayName: 'Pouya Hodler', username: 'pouya_hodl' },
  { displayName: 'Milad_BTC', username: 'milad_btc88' },
  { displayName: 'Samaneh Fox', username: 'samaneh_fx' },
  { displayName: 'AmirHossein 🚀', username: 'amirh_crypto' },
  { displayName: 'Farzad_VIP', username: 'farzad_vip' },
  { displayName: 'Behnam DeFi', username: 'behnam_defi' },
  { displayName: 'Soroush Alpha', username: 'soroush_alpha' },
  { displayName: 'Parsa_Web3', username: 'parsa_web3' },
  { displayName: 'Hamed Satoshi', username: 'hamed_satoshi' },
  { displayName: 'Omid_FoxKing 👑', username: 'omid_foxking' },
  { displayName: 'Erfan_Miner', username: 'erfan_miner7' },
  { displayName: 'Yashar_TON', username: 'yashar_ton' },
  { displayName: 'Nazanin Crypto', username: 'nazanin_crp' },
  { displayName: 'Saeed_Whale', username: 'saeed_whale1' },
  { displayName: 'Danial_Pump', username: 'danial_pump' },
  { displayName: 'kamran_pro', username: 'kamran_pro9' },
  { displayName: 'pedram_dex', username: 'pedram_dex' },
  { displayName: 'Alireza_Fox 🦊', username: 'alireza_fox' },
  { displayName: 'Matin_Sniper', username: 'matin_sniper' },
  { displayName: 'ShadowFox ⚡', username: 'shadow_fox_x' },
  { displayName: 'Crypto Sultan', username: 'crypto_sultan_ir' },
  { displayName: 'Ashkan_NFT', username: 'ashkan_nft' },
  { displayName: 'Vahid_Bull', username: 'vahid_bullrun' },
  { displayName: 'Soheil_Diamond', username: 'soheil_diamond' },
];

interface AdminTelegramSetupProps {
  user: UserGameState | null;
  config?: GameConfig | null;
  onClose: () => void;
  initialTab?: AdminTabType;
  onAdminStatusChange?: (isAdmin: boolean) => void;
  onUserUpdated?: (user: UserGameState) => void;
  onConfigUpdated?: (config: GameConfig) => void;
}

export const AdminTelegramSetup: React.FC<AdminTelegramSetupProps> = ({
  user,
  config,
  onClose,
  initialTab = 'users',
  onAdminStatusChange,
  onUserUpdated,
  onConfigUpdated,
}) => {
  const [adminSecret, setAdminSecret] = useState<string>('');
  const [isAuthorized, setIsAuthorized] = useState<boolean>(!!user?.isAdmin);
  const [isCheckingAuth, setIsCheckingAuth] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Tab: 'users' | 'fake_rank' | 'locks' | 'cards' | 'gifts' | 'wheel' | 'webhook' | 'github'
  const [activeTab, setActiveTab] = useState<AdminTabType>(initialTab);

  // Cards, Gifts, Lucky Wheel, Fake Rank & Section Locks Admin State
  const [adminUpgrades, setAdminUpgrades] = useState<UpgradeDefinition[]>(
    () => config?.upgrades || [...UPGRADES]
  );
  const [adminWheelPrizes, setAdminWheelPrizes] = useState<LuckyWheelPrize[]>(
    () => config?.wheelPrizes || [...LUCKY_WHEEL_PRIZES]
  );
  const [adminFakeMembers, setAdminFakeMembers] = useState<FakeLeaderboardMember[]>(
    () => config?.fakeLeaderboardMembers || api.getLocalFakeLeaderboardMembers()
  );
  const [adminLockedSections, setAdminLockedSections] = useState<Record<string, boolean>>(
    () => config?.lockedSections || api.getLocalLockedSections()
  );
  const [editingFakeId, setEditingFakeId] = useState<string | null>(null);
  const [fakeDisplayName, setFakeDisplayName] = useState<string>('');
  const [fakeUsername, setFakeUsername] = useState<string>('');
  const [fakeBalance, setFakeBalance] = useState<string>('250000');
  const [fakeProfitPerHour, setFakeProfitPerHour] = useState<string>('18500');
  const [fakeCustomLevel, setFakeCustomLevel] = useState<string>('auto');
  const [bulkTier, setBulkTier] = useState<'mid' | 'pro' | 'whale'>('pro');
  const [fakeSearchQuery, setFakeSearchQuery] = useState<string>('');
  const [confirmClearAllFakes, setConfirmClearAllFakes] = useState<boolean>(false);
  const [adminFeedback, setAdminFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [isSavingAdminData, setIsSavingAdminData] = useState<boolean>(false);

  // New / Edit Card Form State
  const [editingCardId, setEditingCardId] = useState<string | null>(null);
  const [newCardName, setNewCardName] = useState<string>('');
  const [newCardDesc, setNewCardDesc] = useState<string>('');
  const [newCardCategory, setNewCardCategory] = useState<'passive' | 'special' | 'tap'>('passive');
  const [newCardBenefitType, setNewCardBenefitType] = useState<'profit_per_hour' | 'tap_power' | 'max_energy' | 'energy_regen'>('profit_per_hour');
  const [newCardBasePrice, setNewCardBasePrice] = useState<string>('50000');
  const [newCardMultiplier, setNewCardMultiplier] = useState<string>('1.45');
  const [newCardBenefit, setNewCardBenefit] = useState<string>('25000');
  const [newCardLevelReq, setNewCardLevelReq] = useState<string>('3');
  const [newCardIcon, setNewCardIcon] = useState<string>('🚀');
  const [cardFilterCat, setCardFilterCat] = useState<'all' | 'passive' | 'special' | 'tap'>('all');

  // Admin Users, Bulk Actions & Balance Management states
  const [allUsers, setAllUsers] = useState<UserGameState[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState<boolean>(false);
  const [isSyncingAllDb, setIsSyncingAllDb] = useState<boolean>(false);
  const [userSearch, setUserSearch] = useState<string>('');
  const [userActivityFilter, setUserActivityFilter] = useState<'all' | 'active' | 'inactive' | 'referrals' | 'banned'>('all');
  const [selectedBulkUserIds, setSelectedBulkUserIds] = useState<string[]>([]);
  const [showBulkActionsMenu, setShowBulkActionsMenu] = useState<boolean>(false);
  const [isExecutingBulkAction, setIsExecutingBulkAction] = useState<boolean>(false);
  const [copiedUserRef, setCopiedUserRef] = useState<string | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(user?.id || null);
  const [adjustAmount, setAdjustAmount] = useState<string>('10000');
  const [adjustBalanceType, setAdjustBalanceType] = useState<'main' | 'referral'>('main');
  const [isAdjustingBalance, setIsAdjustingBalance] = useState<boolean>(false);
  const [userFeedback, setUserFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [storageStatus, setStorageStatus] = useState<{
    engine: string;
    d1Bound: boolean;
    kvBound: boolean;
    d1UsersCount?: number;
    lastD1Error?: string | null;
    realUsersCount: number;
  } | null>(null);
  const [showD1Guide, setShowD1Guide] = useState<boolean>(false);

  // Telegram Form states
  const [botToken, setBotToken] = useState<string>('');
  const [showToken, setShowToken] = useState<boolean>(false);
  const [webhookUrl, setWebhookUrl] = useState<string>('');
  const [secretToken, setSecretToken] = useState<string>('');
  const [showSecret, setShowSecret] = useState<boolean>(false);

  // 1-Click Automatic Bot Setup states
  const [autoTokenInput, setAutoTokenInput] = useState<string>('');
  const [isAutoSettingUp, setIsAutoSettingUp] = useState<boolean>(false);
  const [autoSetupResult, setAutoSetupResult] = useState<{
    botUsername: string;
    botFirstName?: string;
    appUrl: string;
    webhookUrl: string;
    telegramLink: string;
    description: string;
  } | null>(null);

  // GitHub Form states
  const [githubToken, setGithubToken] = useState<string>(() => {
    return typeof window !== 'undefined' ? localStorage.getItem('fox_github_pat') || '' : '';
  });
  const [showGithubToken, setShowGithubToken] = useState<boolean>(false);
  const [githubRepoName, setGithubRepoName] = useState<string>('fox-coinl');
  const [githubIsPrivate, setGithubIsPrivate] = useState<boolean>(false);
  const [githubCommitMsg, setGithubCommitMsg] = useState<string>('Fox Coin — Telegram Mini App & Cloudflare Pages Ready');
  const [isUploadingGithub, setIsUploadingGithub] = useState<boolean>(false);
  const [githubResult, setGithubResult] = useState<{
    repoUrl: string;
    fileCount: number;
    commitSha: string;
    repoFullName: string;
  } | null>(null);
  const [githubError, setGithubError] = useState<string | null>(null);

  // Status & loading states
  const [serverConfig, setServerConfig] = useState<AdminTelegramConfigResponse | null>(null);
  const [isLoadingConfig, setIsLoadingConfig] = useState<boolean>(false);
  const [actionLoading, setActionLoading] = useState<'configure' | 'status' | 'delete' | null>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<boolean>(false);

  const loadUsers = async (secret?: string) => {
    try {
      setIsLoadingUsers(true);
      const res = await api.getAdminUsers(secret || adminSecret || '123456');
      setAllUsers(res.users || []);
      if (res.storage) {
        setStorageStatus(res.storage);
      }
      if (!selectedUserId && res.users?.length > 0) {
        setSelectedUserId(user?.id || res.users[0].id);
      }
    } catch (err) {
      console.error('Failed to load users:', err);
    } finally {
      setIsLoadingUsers(false);
    }
  };

  const handleForceSyncAllUsers = async () => {
    try {
      setIsSyncingAllDb(true);
      setUserFeedback(null);
      const candidates = [...allUsers];
      if (user && !candidates.some((u) => u.id === user.id)) {
        candidates.unshift(user);
      }
      const res = await api.syncAllAdminUsers(candidates, adminSecret || '123456');
      setAllUsers(res.users || []);
      if (res.storage) {
        setStorageStatus(res.storage);
      }
      sound.playSuccess();
      setUserFeedback({
        type: 'success',
        message: `✅ اطلاعات کامل ${res.users?.length || 0} کاربر (فعال و غیرفعال، سکه‌ها، دعوتی‌ها و ارتقاها) با موفقیت در دیتابیس ذخیره شد.`,
      });
    } catch (err: any) {
      setUserFeedback({
        type: 'error',
        message: err?.message || 'خطا در همگام‌سازی دیتابیس',
      });
    } finally {
      setIsSyncingAllDb(false);
    }
  };

  // Load server configuration if authorized
  const loadConfig = async (secret?: string) => {
    try {
      setIsLoadingConfig(true);
      const effectiveSecret = secret || adminSecret || '123456';
      loadUsers(effectiveSecret);
      api
        .getAdminFakeLeaderboard(effectiveSecret)
        .then((fakeRes) => {
          if (Array.isArray(fakeRes.fakeLeaderboardMembers)) {
            setAdminFakeMembers(fakeRes.fakeLeaderboardMembers);
          }
        })
        .catch(() => {});
      api
        .getAdminLockedSections(effectiveSecret)
        .then((lockRes) => {
          if (lockRes.lockedSections) {
            setAdminLockedSections(lockRes.lockedSections);
          }
        })
        .catch(() => {});
      const data = await api.getAdminTelegramConfig(effectiveSecret);
      setServerConfig(data);
      if (data.botUsername && onConfigUpdated && config && data.botUsername !== config.telegramBotUsername) {
        onConfigUpdated({
          ...config,
          telegramBotUsername: data.botUsername,
        });
      }
      if (data.suggestedWebhookUrl && !webhookUrl) {
        setWebhookUrl(data.webhookUrl || data.suggestedWebhookUrl);
      }
    } catch (err: any) {
      console.error('Failed to load bot config:', err);
      if (err.message?.includes('Forbidden')) {
        setIsAuthorized(false);
      }
    } finally {
      setIsLoadingConfig(false);
    }
  };

  const handleAdjustUserTokens = async (
    targetUserId: string,
    operation: 'add' | 'deduct' | 'set',
    customAmount?: number,
    customType?: 'main' | 'referral'
  ) => {
    const amt = customAmount !== undefined ? customAmount : Number(adjustAmount);
    if (isNaN(amt) || amt < 0) {
      setUserFeedback({ type: 'error', message: 'Please enter a valid positive token amount' });
      return;
    }

    try {
      setIsAdjustingBalance(true);
      setUserFeedback(null);
      sound.playCoin();

      const res = await api.adjustAdminUserBalance(
        {
          userId: targetUserId,
          amount: amt,
          operation,
          balanceType: customType || adjustBalanceType,
        },
        adminSecret || '123456'
      );

      setAllUsers(res.users);
      if (onUserUpdated && user && res.user.id === user.id) {
        onUserUpdated(res.user);
      }
      const actionLabel =
        operation === 'add'
          ? `Added +${amt.toLocaleString('en-US')} FOX to`
          : operation === 'deduct'
            ? `Deducted -${amt.toLocaleString('en-US')} FOX from`
            : `Set balance to ${amt.toLocaleString('en-US')} FOX for`;
      const typeLabel = (customType || adjustBalanceType) === 'referral' ? '(Referral Balance)' : '(Main Balance)';

      setUserFeedback({
        type: 'success',
        message: `${actionLabel} ${res.user.displayName || res.user.username} ${typeLabel}`,
      });
    } catch (err: any) {
      setUserFeedback({
        type: 'error',
        message: err.message || 'Failed to update user balance',
      });
    } finally {
      setIsAdjustingBalance(false);
    }
  };

  useEffect(() => {
    if (user?.isAdmin) {
      setIsAuthorized(true);
      onAdminStatusChange?.(true);
      loadConfig('123456');
    } else {
      const savedSecret = sessionStorage.getItem('fox_admin_secret');
      if (savedSecret) {
        setAdminSecret(savedSecret);
        handleUnlockWithKey(savedSecret);
      }
    }
  }, [user]);

  const handleUnlockWithKey = async (secretToVerify?: string) => {
    const key = (secretToVerify ?? adminSecret).trim();
    if (!key) {
      setAuthError('Please enter the Admin Master Password');
      return;
    }

    try {
      setIsCheckingAuth(true);
      setAuthError(null);
      await api.verifyAdminAuth(key);
      setIsAuthorized(true);
      sessionStorage.setItem('fox_admin_secret', key);
      onAdminStatusChange?.(true);
      sound.playCoin();
      loadConfig(key);
    } catch (err: any) {
      setIsAuthorized(false);
      sessionStorage.removeItem('fox_admin_secret');
      setAuthError(err.message || 'Invalid administrator password');
    } finally {
      setIsCheckingAuth(false);
    }
  };

  const handleLockAdmin = () => {
    sessionStorage.removeItem('fox_admin_secret');
    setIsAuthorized(false);
    setAdminSecret('');
    onAdminStatusChange?.(false);
    onClose();
  };

  const handleGenerateSecret = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-';
    let res = '';
    for (let i = 0; i < 32; i++) {
      res += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setSecretToken(res);
    sound.playTap();
  };

  const handleAutoSetup = async (tokenOverride?: string) => {
    const token = (tokenOverride || autoTokenInput || botToken).trim();
    if (!token) {
      setNotification({
        type: 'error',
        message: 'Please enter or paste your Telegram Bot Token from @BotFather',
      });
      return;
    }

    try {
      setIsAutoSettingUp(true);
      setNotification(null);
      sound.playTap();

      const res = await api.autoSetupTelegramBot(token, adminSecret);
      sound.playLevelUp();
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#F59E0B', '#10B981', '#38BDF8'],
      });

      setAutoSetupResult(res);
      if (res.botUsername && onConfigUpdated && config) {
        onConfigUpdated({
          ...config,
          telegramBotUsername: res.botUsername,
        });
      }
      setNotification({
        type: 'success',
        message: `🎉 Bot activated! Webhook, Mini App Menu Button, and Commands are live on @${res.botUsername}!`,
      });
      setAutoTokenInput('');
      setBotToken('');
      loadConfig();
    } catch (err: any) {
      sound.playError();
      setNotification({
        type: 'error',
        message: err.message || 'Auto-setup failed. Please check your bot token.',
      });
    } finally {
      setIsAutoSettingUp(false);
    }
  };

  const handleConfigureWebhook = async (e: React.FormEvent) => {
    e.preventDefault();
    setNotification(null);

    if (!webhookUrl || !webhookUrl.startsWith('https://')) {
      setNotification({ type: 'error', message: 'Webhook URL must use secure HTTPS protocol' });
      return;
    }

    try {
      setActionLoading('configure');
      sound.playTap();
      const res = await api.setAdminWebhook(
        {
          botToken: botToken.trim() || undefined,
          webhookUrl: webhookUrl.trim(),
          secretToken: secretToken.trim() || undefined,
          saveToken: true,
        },
        adminSecret
      );

      sound.playLevelUp();
      if (res.botUsername && onConfigUpdated && config) {
        onConfigUpdated({
          ...config,
          telegramBotUsername: res.botUsername,
        });
      }
      setNotification({
        type: 'success',
        message: `Success! ${res.description}. Bot: @${res.botUsername || 'configured'}`,
      });
      setBotToken('');
      loadConfig();
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message || 'Failed to register webhook with Telegram' });
    } finally {
      setActionLoading(null);
    }
  };

  const handleCheckStatus = async () => {
    setNotification(null);
    try {
      setActionLoading('status');
      sound.playTap();
      const res = await api.checkAdminWebhookStatus(botToken.trim() || undefined, adminSecret);
      sound.playCoin();
      setServerConfig((prev) => (prev ? { ...prev, webhookInfo: res.info } : prev));
      setNotification({
        type: 'success',
        message: `Webhook Status: ${res.info.url ? 'Connected to ' + res.info.url : 'No webhook currently registered'}`,
      });
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message || 'Failed to check status with Telegram' });
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteWebhook = async () => {
    setNotification(null);
    setShowDeleteConfirm(false);
    try {
      setActionLoading('delete');
      sound.playTap();
      const res = await api.deleteAdminWebhook(true, botToken.trim() || undefined, adminSecret);
      sound.playCoin();
      setNotification({ type: 'success', message: res.description || 'Webhook was deleted successfully' });
      loadConfig();
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message || 'Failed to delete webhook' });
    } finally {
      setActionLoading(null);
    }
  };

  // GitHub Automatic Upload Handler
  const handleUploadToGitHub = async (e: React.FormEvent) => {
    e.preventDefault();
    setGithubError(null);
    setGithubResult(null);

    if (!githubToken.trim()) {
      setGithubError('Please enter your GitHub Personal Access Token (PAT)');
      return;
    }
    if (!githubRepoName.trim()) {
      setGithubError('Please enter a repository name');
      return;
    }

    try {
      setIsUploadingGithub(true);
      sound.playTap();
      if (typeof window !== 'undefined') {
        localStorage.setItem('fox_github_pat', githubToken.trim());
      }

      const res = await api.uploadToGitHub(
        {
          token: githubToken.trim(),
          repoName: githubRepoName.trim(),
          isPrivate: githubIsPrivate,
          commitMessage: githubCommitMsg.trim() || undefined,
        },
        adminSecret
      );

      sound.playLevelUp();
      setGithubResult({
        repoUrl: res.repoUrl,
        fileCount: res.fileCount,
        commitSha: res.commitSha,
        repoFullName: res.repoFullName,
      });
    } catch (err: any) {
      setGithubError(err.message || 'Failed to upload project to GitHub');
    } finally {
      setIsUploadingGithub(false);
    }
  };

  // Sync adminUpgrades, adminWheelPrizes, adminFakeMembers, and adminLockedSections when config prop changes
  useEffect(() => {
    if (config?.upgrades) setAdminUpgrades(config.upgrades);
    if (config?.wheelPrizes) setAdminWheelPrizes(config.wheelPrizes);
    if (config?.fakeLeaderboardMembers) setAdminFakeMembers(config.fakeLeaderboardMembers);
    if (config?.lockedSections) setAdminLockedSections(config.lockedSections);
  }, [config]);

  const notifyConfigUpdate = (
    nextUpgrades: UpgradeDefinition[],
    nextWheel: LuckyWheelPrize[],
    nextFakeMembers: FakeLeaderboardMember[] = adminFakeMembers,
    nextLockedSections: Record<string, boolean> = adminLockedSections
  ) => {
    setAdminUpgrades(nextUpgrades);
    setAdminWheelPrizes(nextWheel);
    setAdminFakeMembers(nextFakeMembers);
    setAdminLockedSections(nextLockedSections);
    if (onConfigUpdated && config) {
      onConfigUpdated({
        ...config,
        upgrades: nextUpgrades,
        wheelPrizes: nextWheel,
        fakeLeaderboardMembers: nextFakeMembers,
        lockedSections: nextLockedSections,
      });
    }
  };

  // Section Lock / Unlock Handlers
  const handleToggleSectionLock = async (sectionId: string, forceState?: boolean) => {
    const nextValue = forceState !== undefined ? forceState : !adminLockedSections[sectionId];
    const nextMap: Record<string, boolean> = {
      ...adminLockedSections,
      [sectionId]: nextValue,
    };
    try {
      setIsSavingAdminData(true);
      setAdminFeedback(null);
      sound.playTap();
      const res = await api.adminSaveLockedSections(nextMap, adminSecret || '123456');
      notifyConfigUpdate(adminUpgrades, adminWheelPrizes, adminFakeMembers, res.lockedSections);
      const secMeta = LOCKABLE_APP_SECTIONS.find((s) => s.id === sectionId);
      const label = secMeta ? secMeta.titleFa : sectionId;
      setAdminFeedback({
        type: 'success',
        message: nextValue
          ? `🔒 «${label}» با موفقیت برای تمام کاربران قفل شد.`
          : `🔓 قفل «${label}» باز شد و اکنون برای همه کاربران در دسترس است.`,
      });
    } catch (err: any) {
      setAdminFeedback({
        type: 'error',
        message: err?.message || 'خطا در ذخیره وضعیت قفل بخش‌ها',
      });
    } finally {
      setIsSavingAdminData(false);
    }
  };

  const handleSaveAllSectionLocks = async (nextMap: Record<string, boolean>, customSuccessMsg?: string) => {
    try {
      setIsSavingAdminData(true);
      setAdminFeedback(null);
      sound.playTap();
      const res = await api.adminSaveLockedSections(nextMap, adminSecret || '123456');
      notifyConfigUpdate(adminUpgrades, adminWheelPrizes, adminFakeMembers, res.lockedSections);
      setAdminFeedback({
        type: 'success',
        message: customSuccessMsg || '✅ وضعیت قفل بخش‌ها با موفقیت ذخیره شد.',
      });
    } catch (err: any) {
      setAdminFeedback({
        type: 'error',
        message: err?.message || 'خطا در ذخیره قفل بخش‌ها',
      });
    } finally {
      setIsSavingAdminData(false);
    }
  };

  // Multi-User Bulk Selection & Bulk Actions Handlers
  const toggleBulkUserSelection = (targetId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    sound.playTap();
    setSelectedBulkUserIds((prev) =>
      prev.includes(targetId) ? prev.filter((id) => id !== targetId) : [...prev, targetId]
    );
  };

  const handleSelectAllFilteredUsers = (filteredIds: string[]) => {
    sound.playTap();
    const allSelected =
      filteredIds.length > 0 && filteredIds.every((id) => selectedBulkUserIds.includes(id));
    if (allSelected) {
      setSelectedBulkUserIds((prev) => prev.filter((id) => !filteredIds.includes(id)));
    } else {
      const merged = Array.from(new Set([...selectedBulkUserIds, ...filteredIds]));
      setSelectedBulkUserIds(merged);
    }
  };

  const handleSelectInactiveBotAccounts = () => {
    sound.playTap();
    const botOrInactiveIds = allUsers
      .filter((u) => {
        if (u.id === user?.id || u.isAdmin) return false;
        const upCount = Object.values(u.upgrades || {}).filter((lvl) => Number(lvl) > 0).length;
        const isActive =
          (u.totalTaps || 0) > 0 ||
          (u.profitPerHour || 0) > 0 ||
          upCount > 0 ||
          (u.balance || 0) > 5000;
        const looksLikeBot =
          u.id.startsWith('bot_') ||
          u.id.startsWith('seed_') ||
          !isActive;
        return looksLikeBot;
      })
      .map((u) => u.id);

    setSelectedBulkUserIds(botOrInactiveIds);
    setUserFeedback({
      type: 'success',
      message:
        botOrInactiveIds.length > 0
          ? `🤖 تعداد ${botOrInactiveIds.length} اکانت غیرفعال / ربات انتخاب شد. اکنون می‌توانید دکمه «Ban Selected» را بزنید.`
          : 'هیچ اکانت ربات یا غیرفعالی یافت نشد.',
    });
  };

  const handleExecuteBulkUserAction = async (
    action: 'ban' | 'unban' | 'reset_coins' | 'delete',
    targetIdsOverride?: string[]
  ) => {
    const rawIds = targetIdsOverride || selectedBulkUserIds;
    // Protect current admin from accidentally banning/deleting their own active session if bulk-selected
    const targetIds = rawIds.filter((id) => {
      if ((action === 'ban' || action === 'delete') && user && id === user.id && rawIds.length > 1) {
        return false;
      }
      return true;
    });

    if (targetIds.length === 0) {
      setUserFeedback({
        type: 'error',
        message: 'لطفاً ابتدا حداقل یک کاربر را از جدول انتخاب کنید (Select users first).',
      });
      return;
    }

    try {
      setIsExecutingBulkAction(true);
      setShowBulkActionsMenu(false);
      setUserFeedback(null);
      sound.playTap();

      const res = await api.bulkAdminUserAction(
        {
          userIds: targetIds,
          action,
        },
        adminSecret || '123456'
      );

      setAllUsers(res.users || []);
      if (action === 'delete') {
        setSelectedBulkUserIds([]);
      }

      const actionDesc =
        action === 'ban'
          ? `🚫 ${res.affectedCount} اکانت انتخاب‌شده با موفقیت مسدود (Banned) شدند و از جدول رنک و بازی خارج گردیدند.`
          : action === 'unban'
          ? `🔓 مسدودیت ${res.affectedCount} اکانت انتخاب‌شده رفع شد (Unbanned).`
          : action === 'reset_coins'
          ? `🪙 موجودی سکه ${res.affectedCount} اکانت انتخاب‌شده صفر (Reset) شد.`
          : `🗑️ ${res.affectedCount} اکانت انتخاب‌شده به طور کامل حذف شدند.`;

      sound.playSuccess();
      setUserFeedback({
        type: 'success',
        message: actionDesc,
      });
    } catch (err: any) {
      setUserFeedback({
        type: 'error',
        message: err?.message || 'خطا در اجرای عملیات گروهی (Bulk Action failed)',
      });
    } finally {
      setIsExecutingBulkAction(false);
    }
  };

  const calculateLevelForFakeBalance = (coins: number, customLvlStr = fakeCustomLevel) => {
    if (customLvlStr !== 'auto') {
      const parsedLvl = Number(customLvlStr);
      const found = PLAYER_LEVELS.find((l) => l.level === parsedLvl);
      if (found) return found;
    }
    let matched = PLAYER_LEVELS[0];
    for (const lvl of PLAYER_LEVELS) {
      if (coins >= lvl.minCoins) matched = lvl;
      else break;
    }
    return matched;
  };

  const handlePickRandomFakeIdentity = () => {
    const existingNames = new Set(adminFakeMembers.map((m) => m.username.toLowerCase()));
    const available = REALISTIC_FAKE_PROFILES.filter((p) => !existingNames.has(p.username.toLowerCase()));
    const pool = available.length > 0 ? available : REALISTIC_FAKE_PROFILES;
    const chosen = pool[Math.floor(Math.random() * pool.length)];
    const randomSuffix = available.length === 0 ? `_${Math.floor(10 + Math.random() * 89)}` : '';
    setFakeDisplayName(chosen.displayName);
    setFakeUsername(`${chosen.username}${randomSuffix}`);
    sound.playTap();
  };

  const handleSaveSingleFakeMember = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanDisplay = fakeDisplayName.trim() || fakeUsername.trim();
    if (!cleanDisplay) {
      setAdminFeedback({ type: 'error', message: 'لطفاً نام نمایشی یا یوزرنیم ممبر فیک را وارد کنید.' });
      return;
    }

    const cleanUsername = (fakeUsername.trim() || cleanDisplay)
      .replace(/^@/, '')
      .replace(/\s+/g, '_')
      .replace(/[^A-Za-z0-9_]/g, '')
      .toLowerCase() || `fox_${Math.floor(1000 + Math.random() * 9000)}`;

    const cleanBal = Math.max(0, Math.floor(Number(fakeBalance) || 0));
    const cleanPph = Math.max(0, Math.floor(Number(fakeProfitPerHour) || 0));
    const lvlObj = calculateLevelForFakeBalance(cleanBal, fakeCustomLevel);

    const memberObj: FakeLeaderboardMember = {
      id: editingFakeId || `fake_lb_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      displayName: cleanDisplay,
      username: cleanUsername,
      balance: cleanBal,
      profitPerHour: cleanPph,
      level: lvlObj.level,
      levelName: lvlObj.name,
      createdAt: Date.now(),
    };

    try {
      setIsSavingAdminData(true);
      setAdminFeedback(null);
      sound.playCoin();

      let nextList: FakeLeaderboardMember[];
      if (editingFakeId) {
        nextList = adminFakeMembers.map((m) => (m.id === editingFakeId ? memberObj : m));
      } else {
        nextList = [memberObj, ...adminFakeMembers];
      }

      const res = await api.adminSaveFakeLeaderboard(nextList, adminSecret || '123456');
      notifyConfigUpdate(adminUpgrades, adminWheelPrizes, res.fakeLeaderboardMembers);

      setAdminFeedback({
        type: 'success',
        message: editingFakeId
          ? `✅ ممبر فیک «${memberObj.displayName}» با موفقیت در رنک ویرایش شد!`
          : `✅ ممبر فیک نمایشی «${memberObj.displayName}» با ${cleanBal.toLocaleString('en-US')} FOX به رنک اضافه شد!`,
      });
      setEditingFakeId(null);
      setFakeDisplayName('');
      setFakeUsername('');
    } catch (err: any) {
      setAdminFeedback({ type: 'error', message: err?.message || 'خطا در ذخیره ممبر فیک رنک' });
    } finally {
      setIsSavingAdminData(false);
    }
  };

  const handleGenerateBulkFakeMembers = async (count: number) => {
    try {
      setIsSavingAdminData(true);
      setAdminFeedback(null);
      sound.playLevelUp();

      const existingUsernames = new Set(adminFakeMembers.map((m) => m.username.toLowerCase()));
      const generated: FakeLeaderboardMember[] = [];

      let minCoins = 250000;
      let maxCoins = 8500000;
      if (bulkTier === 'mid') {
        minCoins = 25000;
        maxCoins = 450000;
      } else if (bulkTier === 'pro') {
        minCoins = 450000;
        maxCoins = 12000000;
      } else if (bulkTier === 'whale') {
        minCoins = 12000000;
        maxCoins = 180000000;
      }

      for (let i = 0; i < count; i++) {
        const available = REALISTIC_FAKE_PROFILES.filter((p) => !existingUsernames.has(p.username.toLowerCase()));
        const baseProfile =
          available.length > 0
            ? available[Math.floor(Math.random() * available.length)]
            : REALISTIC_FAKE_PROFILES[Math.floor(Math.random() * REALISTIC_FAKE_PROFILES.length)];

        const suffix = available.length > 0 ? '' : `_${Math.floor(10 + Math.random() * 89)}`;
        const finalUsername = `${baseProfile.username}${suffix}`;
        existingUsernames.add(finalUsername.toLowerCase());

        const rawCoins = minCoins + Math.random() * (maxCoins - minCoins);
        const roundedCoins = Math.floor(rawCoins / 50) * 50 + Math.floor(Math.random() * 49);
        const pph = Math.max(1200, Math.floor(roundedCoins * (0.015 + Math.random() * 0.045)));
        const lvlObj = calculateLevelForFakeBalance(roundedCoins, 'auto');

        generated.push({
          id: `fake_lb_${Date.now()}_${i}_${Math.random().toString(36).slice(2, 6)}`,
          displayName: baseProfile.displayName,
          username: finalUsername,
          balance: roundedCoins,
          profitPerHour: pph,
          level: lvlObj.level,
          levelName: lvlObj.name,
          createdAt: Date.now() - i * 1000,
        });
      }

      const nextList = [...generated, ...adminFakeMembers];
      const res = await api.adminSaveFakeLeaderboard(nextList, adminSecret || '123456');
      notifyConfigUpdate(adminUpgrades, adminWheelPrizes, res.fakeLeaderboardMembers);

      setAdminFeedback({
        type: 'success',
        message: `🎉 تعداد ${count} ممبر فیک طبیعی با موفقیت ساخته شد و در جدول رنک قرار گرفت!`,
      });
    } catch (err: any) {
      setAdminFeedback({ type: 'error', message: err?.message || 'خطا در ساخت گروهی ممبر فیک' });
    } finally {
      setIsSavingAdminData(false);
    }
  };

  const handleQuickAdjustFakeMemberCoins = async (fakeId: string, delta: number) => {
    try {
      setIsSavingAdminData(true);
      sound.playCoin();
      const nextList = adminFakeMembers.map((m) => {
        if (m.id !== fakeId) return m;
        const newBal = Math.max(0, m.balance + delta);
        const lvlObj = calculateLevelForFakeBalance(newBal, 'auto');
        return {
          ...m,
          balance: newBal,
          level: lvlObj.level,
          levelName: lvlObj.name,
        };
      });
      const res = await api.adminSaveFakeLeaderboard(nextList, adminSecret || '123456');
      notifyConfigUpdate(adminUpgrades, adminWheelPrizes, res.fakeLeaderboardMembers);
    } catch (err: any) {
      setAdminFeedback({ type: 'error', message: err?.message || 'خطا در تغییر سکه ممبر فیک' });
    } finally {
      setIsSavingAdminData(false);
    }
  };

  const handleEditFakeMemberClick = (member: FakeLeaderboardMember) => {
    setEditingFakeId(member.id);
    setFakeDisplayName(member.displayName);
    setFakeUsername(member.username);
    setFakeBalance(String(member.balance));
    setFakeProfitPerHour(String(member.profitPerHour));
    setFakeCustomLevel('auto');
    sound.playTap();
  };

  const handleDeleteFakeMember = async (member: FakeLeaderboardMember) => {
    try {
      setIsSavingAdminData(true);
      sound.playTap();
      const nextList = adminFakeMembers.filter((m) => m.id !== member.id);
      const res = await api.adminSaveFakeLeaderboard(nextList, adminSecret || '123456');
      notifyConfigUpdate(adminUpgrades, adminWheelPrizes, res.fakeLeaderboardMembers);
      if (editingFakeId === member.id) {
        setEditingFakeId(null);
        setFakeDisplayName('');
        setFakeUsername('');
      }
      setAdminFeedback({
        type: 'success',
        message: `🗑️ ممبر فیک «${member.displayName}» از جدول رنک حذف شد.`,
      });
    } catch (err: any) {
      setAdminFeedback({ type: 'error', message: err?.message || 'خطا در حذف ممبر فیک' });
    } finally {
      setIsSavingAdminData(false);
    }
  };

  const handleClearAllFakeMembers = async () => {
    try {
      setIsSavingAdminData(true);
      setConfirmClearAllFakes(false);
      sound.playTap();
      const res = await api.adminSaveFakeLeaderboard([], adminSecret || '123456');
      notifyConfigUpdate(adminUpgrades, adminWheelPrizes, res.fakeLeaderboardMembers);
      setEditingFakeId(null);
      setAdminFeedback({
        type: 'success',
        message: '🧹 تمام ممبرهای فیک نمایشی از جدول رنک پاک شدند.',
      });
    } catch (err: any) {
      setAdminFeedback({ type: 'error', message: err?.message || 'خطا در پاکسازی ممبرهای فیک' });
    } finally {
      setIsSavingAdminData(false);
    }
  };

  // Save or Add Card Handler
  const handleSaveCardForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCardName.trim()) {
      setAdminFeedback({ type: 'error', message: 'Please enter a card name' });
      return;
    }

    const cardId =
      editingCardId ||
      `card_${newCardName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_|_$/g, '')}_${Math.random().toString(36).slice(2, 6)}`;

    const cardObj: UpgradeDefinition = {
      id: cardId,
      name: newCardName.trim(),
      description: newCardDesc.trim() || `Boosts hourly profit by +${Number(newCardBenefit || 1000).toLocaleString('en-US')} FOX/hr`,
      category: newCardCategory,
      basePrice: Math.max(1, Math.floor(Number(newCardBasePrice) || 1000)),
      priceMultiplier: Math.max(1.05, Number(newCardMultiplier) || 1.4),
      benefitType: newCardBenefitType,
      baseBenefit: Math.max(1, Math.floor(Number(newCardBenefit) || 500)),
      levelRequirement: Math.max(1, Math.min(10, Math.floor(Number(newCardLevelReq) || 1))),
      icon: newCardIcon.trim() || '🚀',
    };

    try {
      setIsSavingAdminData(true);
      setAdminFeedback(null);
      sound.playUpgrade();

      const res = await api.adminSaveCard(cardObj, adminSecret || '123456');
      notifyConfigUpdate(res.upgrades, adminWheelPrizes);

      setAdminFeedback({
        type: 'success',
        message: editingCardId
          ? `✅ Card "${cardObj.name}" updated successfully!`
          : `✅ New card "${cardObj.name}" added to the game!`,
      });
      setEditingCardId(null);
      setNewCardName('');
      setNewCardDesc('');
      // Refresh user state if needed
      try {
        const me = await api.getMe();
        if (me.user && onUserUpdated) onUserUpdated(me.user);
      } catch {}
    } catch (err: any) {
      setAdminFeedback({ type: 'error', message: err.message || 'Failed to save card' });
    } finally {
      setIsSavingAdminData(false);
    }
  };

  const handleEditCardClick = (card: UpgradeDefinition) => {
    setEditingCardId(card.id);
    setNewCardName(card.name);
    setNewCardDesc(card.description);
    setNewCardCategory(card.category === 'gift' ? 'passive' : card.category);
    setNewCardBenefitType(card.benefitType);
    setNewCardBasePrice(String(card.basePrice));
    setNewCardMultiplier(String(card.priceMultiplier));
    setNewCardBenefit(String(card.baseBenefit));
    setNewCardLevelReq(String(card.levelRequirement));
    setNewCardIcon(card.icon);
    sound.playTap();
  };

  const handleDeleteCardClick = async (card: UpgradeDefinition) => {
    try {
      setIsSavingAdminData(true);
      setAdminFeedback(null);
      sound.playTap();
      const res = await api.adminDeleteCard(card.id, adminSecret || '123456');
      notifyConfigUpdate(res.upgrades, adminWheelPrizes);
      setAdminFeedback({
        type: 'success',
        message: `🗑️ Card "${card.name}" deleted.`,
      });
    } catch (err: any) {
      setAdminFeedback({ type: 'error', message: err.message || 'Failed to delete card' });
    } finally {
      setIsSavingAdminData(false);
    }
  };

  // Save Fox Gift Price / Benefit Handler
  const handleSaveFoxGift = async (gift: UpgradeDefinition) => {
    try {
      setIsSavingAdminData(true);
      setAdminFeedback(null);
      sound.playCoin();

      const res = await api.adminSaveCard(gift, adminSecret || '123456');
      notifyConfigUpdate(res.upgrades, adminWheelPrizes);
      setAdminFeedback({
        type: 'success',
        message: `⭐ Gift "${gift.name}" saved! (★ ${gift.basePrice.toLocaleString('en-US')} Stars | +${gift.baseBenefit.toLocaleString('en-US')}/hr)`,
      });
      try {
        const me = await api.getMe();
        if (me.user && onUserUpdated) onUserUpdated(me.user);
      } catch {}
    } catch (err: any) {
      setAdminFeedback({ type: 'error', message: err.message || 'Failed to save gift price' });
    } finally {
      setIsSavingAdminData(false);
    }
  };

  const updateLocalGiftField = (giftId: string, field: keyof UpgradeDefinition, value: any) => {
    setAdminUpgrades((prev) =>
      prev.map((u) => (u.id === giftId ? { ...u, [field]: value } : u))
    );
  };

  // Save Lucky Wheel Prizes Handler
  const handleSaveWheelPrizes = async () => {
    try {
      setIsSavingAdminData(true);
      setAdminFeedback(null);
      sound.playLevelUp();

      const res = await api.adminSaveWheelPrizes(adminWheelPrizes, adminSecret || '123456');
      notifyConfigUpdate(adminUpgrades, res.wheelPrizes);
      setAdminFeedback({
        type: 'success',
        message: '🎰 Lucky Wheel prizes and odds saved and updated!',
      });
    } catch (err: any) {
      setAdminFeedback({ type: 'error', message: err.message || 'Failed to save Lucky Wheel prizes' });
    } finally {
      setIsSavingAdminData(false);
    }
  };

  const handleResetWheelDefault = async () => {
    try {
      setIsSavingAdminData(true);
      const res = await api.adminSaveWheelPrizes([...LUCKY_WHEEL_PRIZES], adminSecret || '123456');
      notifyConfigUpdate(adminUpgrades, res.wheelPrizes);
      setAdminFeedback({
        type: 'success',
        message: '🔄 Lucky Wheel prizes reset to defaults.',
      });
    } catch (err: any) {
      setAdminFeedback({ type: 'error', message: err.message || 'Failed to reset Lucky Wheel' });
    } finally {
      setIsSavingAdminData(false);
    }
  };

  const updateWheelPrizeField = (idx: number, field: keyof LuckyWheelPrize, value: any) => {
    setAdminWheelPrizes((prev) =>
      prev.map((item, i) => {
        if (i !== idx) return item;
        const updated = { ...item, [field]: value };
        if (field === 'amount' || field === 'type') {
          const amt = Number(updated.amount) || 1;
          if (updated.type === 'coins') {
            updated.label = `+${amt.toLocaleString('en-US')} FOX Coins`;
          } else if (updated.type === 'full_energy') {
            updated.label = `Full Energy +${amt} Refill`;
          } else if (updated.type === 'turbo') {
            updated.label = `3x Turbo Frenzy (${amt}s)`;
          }
        }
        return updated;
      })
    );
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#07090F] flex flex-col items-center justify-start overflow-y-auto animate-fade-in">
      <div className="w-full max-w-md min-h-screen bg-gradient-to-b from-[#141b2d] via-[#0f1422] to-[#0b0e17] border-x border-slate-800/80 p-5 shadow-2xl text-white flex flex-col">
        {/* Top Dedicated Page Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white transition cursor-pointer flex items-center gap-1 text-xs font-bold"
              title="Back to Game"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="font-black text-sm text-slate-100">Admin Management Panel</h3>
                <span className="px-1.5 py-0.5 bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[9px] font-black rounded">
                  ADMIN ONLY
                </span>
              </div>
              <p className="text-[10px] text-slate-400">Bot Setup, Auto-Webhook & GitHub Deploy</p>
            </div>
          </div>

          {isAuthorized ? (
            <button
              type="button"
              onClick={handleLockAdmin}
              className="px-2.5 py-1.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 text-[10px] font-bold flex items-center gap-1 transition cursor-pointer"
              title="Lock Admin Session"
            >
              <Lock className="w-3 h-3" />
              <span>Lock</span>
            </button>
          ) : (
            <div className="w-8 h-8 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
              <ShieldCheck className="w-4 h-4" />
            </div>
          )}
        </div>

        {/* Lock barrier if not authorized */}
        {!isAuthorized ? (
          <div className="my-auto py-8 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-lg shadow-amber-500/10">
              <KeyRound className="w-8 h-8" />
            </div>

            <h4 className="font-black text-lg text-slate-100">Administrator Login</h4>
            <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto leading-relaxed">
              This management page is restricted to the administrator. Enter your Admin Master Password to access Bot Installation & GitHub Upload.
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleUnlockWithKey();
              }}
              className="mt-5 space-y-3"
            >
              <input
                type="password"
                placeholder="Enter Admin Password"
                value={adminSecret}
                onChange={(e) => setAdminSecret(e.target.value)}
                autoFocus
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 text-center font-mono"
              />

              {authError && (
                <div className="p-2.5 text-xs text-rose-300 bg-rose-500/20 border border-rose-500/30 rounded-xl">
                  {authError}
                </div>
              )}

              <button
                type="submit"
                disabled={isCheckingAuth}
                className="w-full py-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-xs rounded-xl shadow-lg shadow-amber-500/20 transition active:scale-95 cursor-pointer"
              >
                {isCheckingAuth ? 'Verifying...' : 'Login to Admin Panel'}
              </button>
            </form>
          </div>
        ) : (
          <div className="py-4 space-y-4 flex-1">
            {/* Top Admin Tabs: Users, Fake Rank, Section Locks, Cards, Gift Prices, Lucky Wheel, Bot Setup, GitHub */}
            <div className="grid grid-cols-4 gap-1.5 bg-slate-900/90 p-1.5 rounded-2xl border border-slate-800 text-[10px] font-bold">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('users');
                  setAdminFeedback(null);
                }}
                className={`py-2 rounded-xl transition flex items-center justify-center gap-1 cursor-pointer ${
                  activeTab === 'users'
                    ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-black shadow-md'
                    : 'text-slate-400 hover:text-white bg-slate-950/40'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Users ({allUsers.length})</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab('fake_rank');
                  setAdminFeedback(null);
                }}
                className={`py-2 rounded-xl transition flex items-center justify-center gap-1 cursor-pointer ${
                  activeTab === 'fake_rank'
                    ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-black shadow-md'
                    : 'text-amber-300/90 hover:text-white bg-amber-500/10 border border-amber-500/25'
                }`}
              >
                <Trophy className="w-3.5 h-3.5" />
                <span>رنک فیک ({adminFakeMembers.length})</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab('locks');
                  setAdminFeedback(null);
                }}
                className={`py-2 rounded-xl transition flex items-center justify-center gap-1 cursor-pointer ${
                  activeTab === 'locks'
                    ? 'bg-gradient-to-r from-rose-500 to-amber-500 text-slate-950 font-black shadow-md'
                    : 'text-rose-300 hover:text-white bg-rose-500/10 border border-rose-500/25'
                }`}
              >
                <Lock className="w-3.5 h-3.5" />
                <span>
                  قفل بخش‌ها ({Object.values(adminLockedSections).filter(Boolean).length})
                </span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab('cards');
                  setAdminFeedback(null);
                }}
                className={`py-2 rounded-xl transition flex items-center justify-center gap-1 cursor-pointer ${
                  activeTab === 'cards'
                    ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-black shadow-md'
                    : 'text-slate-400 hover:text-white bg-slate-950/40'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Cards ({adminUpgrades.filter((u) => u.category !== 'gift').length})</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab('gifts');
                  setAdminFeedback(null);
                }}
                className={`py-2 rounded-xl transition flex items-center justify-center gap-1 cursor-pointer ${
                  activeTab === 'gifts'
                    ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-black shadow-md'
                    : 'text-slate-400 hover:text-white bg-slate-950/40'
                }`}
              >
                <Gift className="w-3.5 h-3.5" />
                <span>Gift Stars</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab('wheel');
                  setAdminFeedback(null);
                }}
                className={`py-2 rounded-xl transition flex items-center justify-center gap-1 cursor-pointer ${
                  activeTab === 'wheel'
                    ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-black shadow-md'
                    : 'text-slate-400 hover:text-white bg-slate-950/40'
                }`}
              >
                <Compass className="w-3.5 h-3.5" />
                <span>Lucky Wheel</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab('webhook');
                  setAdminFeedback(null);
                }}
                className={`py-2 rounded-xl transition flex items-center justify-center gap-1 cursor-pointer ${
                  activeTab === 'webhook'
                    ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-black shadow-md'
                    : 'text-slate-400 hover:text-white bg-slate-950/40'
                }`}
              >
                <Bot className="w-3.5 h-3.5" />
                <span>Bot Setup</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab('github');
                  setAdminFeedback(null);
                }}
                className={`py-2 rounded-xl transition flex items-center justify-center gap-1 cursor-pointer ${
                  activeTab === 'github'
                    ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-black shadow-md'
                    : 'text-slate-400 hover:text-white bg-slate-950/40'
                }`}
              >
                <Github className="w-3.5 h-3.5" />
                <span>GitHub</span>
              </button>
            </div>

            {/* Global Admin Feedback Banner */}
            {adminFeedback && (
              <div
                className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                  adminFeedback.type === 'success'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                }`}
              >
                {adminFeedback.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                )}
                <span className="font-bold">{adminFeedback.message}</span>
              </div>
            )}

            {/* TAB 0: USERS, DATABASE SYNC & PLAYER PERFORMANCE */}
            {activeTab === 'users' && (
              <div className="space-y-3.5 animate-fade-in">
                {/* Summary Stats Bar */}
                {(() => {
                  const realUsers = allUsers.filter((u) => !u.id.startsWith('bot_'));
                  const activeCount = realUsers.filter(
                    (u) =>
                      (u.totalTaps || 0) > 0 ||
                      (u.profitPerHour || 0) > 0 ||
                      Object.keys(u.upgrades || {}).length > 0 ||
                      (u.balance || 0) > 5000
                  ).length;
                  const inactiveCount = Math.max(0, realUsers.length - activeCount);
                  const bannedCount = allUsers.filter((u) => u.isBanned).length;
                  const totalInvites = realUsers.reduce((acc, u) => acc + (u.referralCount || 0), 0);
                  const totalTapsAll = realUsers.reduce((acc, u) => acc + (u.totalTaps || 0), 0);

                  return (
                    <div className="grid grid-cols-4 gap-1.5">
                      <div className="p-2 rounded-2xl bg-slate-900/90 border border-slate-800 text-center">
                        <span className="text-[9px] text-slate-400 block">کل کاربران</span>
                        <span className="text-xs font-black text-white block">{realUsers.length} نفر</span>
                        <span className="text-[8px] text-emerald-400 font-bold">
                          {activeCount} فعال / {inactiveCount} غیرفعال
                          {bannedCount > 0 ? ` / ${bannedCount} بن` : ''}
                        </span>
                      </div>
                      <div className="p-2 rounded-2xl bg-slate-900/90 border border-slate-800 text-center">
                        <span className="text-[9px] text-slate-400 block">کل سکه‌های FOX</span>
                        <span className="text-xs font-black text-amber-400 block">
                          {Math.floor(realUsers.reduce((acc, u) => acc + (u.balance || 0), 0)).toLocaleString('en-US')}
                        </span>
                        <span className="text-[8px] text-slate-400">
                          {totalTapsAll.toLocaleString('en-US')} کل تپ‌ها
                        </span>
                      </div>
                      <div className="p-2 rounded-2xl bg-slate-900/90 border border-slate-800 text-center">
                        <span className="text-[9px] text-slate-400 block">کل دعوت‌ها</span>
                        <span className="text-xs font-black text-emerald-400 block">
                          {totalInvites.toLocaleString('en-US')} دعوت
                        </span>
                        <span className="text-[8px] text-slate-400">@FOX_COINlBOT</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => loadUsers()}
                        disabled={isLoadingUsers}
                        className="p-2 rounded-2xl bg-slate-900/90 hover:bg-slate-800 border border-slate-800 flex flex-col items-center justify-center gap-0.5 text-sky-400 transition cursor-pointer"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${isLoadingUsers ? 'animate-spin' : ''}`} />
                        <span className="text-[9px] font-bold">بروزرسانی</span>
                      </button>
                    </div>
                  );
                })()}

                {/* Shortcut Banners to Fake Rank Manager & Section Locks (قفل بخش رنک و بخش‌ها) */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2.5 rounded-2xl bg-gradient-to-r from-amber-500/20 via-orange-500/10 to-slate-900 border border-amber-500/40 flex flex-col justify-between gap-2" dir="rtl">
                    <div>
                      <span className="text-[11px] font-black text-amber-300 flex items-center gap-1">
                        <Trophy className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <span>ممبرهای فیک رنک</span>
                      </span>
                      <span className="text-[9px] text-slate-300 block mt-0.5">
                        <b className="text-amber-300">{adminFakeMembers.length} ممبر نمایشی</b> فعال در رنک
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveTab('fake_rank');
                        setAdminFeedback(null);
                      }}
                      className="w-full py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-[10px] shadow transition active:scale-95 cursor-pointer"
                    >
                      مدیریت رنک فیک ⬅
                    </button>
                  </div>

                  <div className="p-2.5 rounded-2xl bg-gradient-to-r from-rose-500/20 via-amber-500/10 to-slate-900 border border-rose-500/40 flex flex-col justify-between gap-2" dir="rtl">
                    <div>
                      <span className="text-[11px] font-black text-rose-300 flex items-center gap-1">
                        <Lock className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                        <span>قفل کردن بخش‌ها (رنک و...)</span>
                      </span>
                      <span className="text-[9px] text-slate-300 block mt-0.5">
                        وضعیت رنک:{' '}
                        <b className={adminLockedSections.leaderboard ? 'text-rose-400' : 'text-emerald-400'}>
                          {adminLockedSections.leaderboard ? '🔒 قفل شده' : '🔓 باز برای همه'}
                        </b>
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        disabled={isSavingAdminData}
                        onClick={() => handleToggleSectionLock('leaderboard')}
                        className={`flex-1 py-1.5 rounded-xl font-black text-[10px] transition active:scale-95 cursor-pointer ${
                          adminLockedSections.leaderboard
                            ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950'
                            : 'bg-rose-500 hover:bg-rose-400 text-white'
                        }`}
                      >
                        {adminLockedSections.leaderboard ? '🔓 باز کردن رنک' : '🔒 قفل رنک'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setActiveTab('locks');
                          setAdminFeedback(null);
                        }}
                        className="px-2 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 font-bold text-[10px] cursor-pointer"
                      >
                        همه
                      </button>
                    </div>
                  </div>
                </div>

                {/* Cloudflare D1 Database Status & 1-Click Force Save */}
                <div
                  className={`p-3 rounded-2xl border space-y-2.5 ${
                    storageStatus?.d1Bound || storageStatus?.kvBound
                      ? 'bg-emerald-500/10 border-emerald-500/30'
                      : 'bg-sky-500/10 border-sky-500/30'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Cloud
                        className={`w-4 h-4 shrink-0 ${
                          storageStatus?.d1Bound || storageStatus?.kvBound ? 'text-emerald-400' : 'text-sky-400'
                        }`}
                      />
                      <div>
                        <span className="text-xs font-black text-white block">
                          {storageStatus?.d1Bound
                            ? `✅ دیتابیس فعال است (${storageStatus.d1UsersCount ?? allUsers.length} کاربر ذخیره شده)`
                            : storageStatus?.kvBound
                            ? '✅ حافظه Cloudflare KV متصل و فعال است (FOX_KV)'
                            : '☁️ دیتابیس کاربران کلادفلر (Cloudflare D1 Database)'}
                        </span>
                        <span className="text-[10px] text-slate-300 block">
                          {storageStatus?.d1Bound || storageStatus?.kvBound
                            ? 'اطلاعات همه کاربران (فعال و غیرفعال، سکه‌ها، رفرال‌ها و کارت‌ها) به صورت دائمی ذخیره می‌شوند.'
                            : 'جداول SQL به صورت خودکار ساخته می‌شوند؛ کافیست D1 را با نام DB متصل کنید.'}
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowD1Guide(!showD1Guide)}
                      className="px-2.5 py-1.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700 text-[10px] font-black text-amber-300 shrink-0 cursor-pointer"
                    >
                      {showD1Guide ? 'بستن راهنما' : 'راهنمای D1'}
                    </button>
                  </div>

                  {/* 1-Click Force Sync All Users Button */}
                  <button
                    type="button"
                    onClick={handleForceSyncAllUsers}
                    disabled={isSyncingAllDb}
                    className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs flex items-center justify-center gap-1.5 shadow-md transition active:scale-95 cursor-pointer disabled:opacity-60"
                  >
                    <Save className={`w-3.5 h-3.5 ${isSyncingAllDb ? 'animate-bounce' : ''}`} />
                    <span>
                      {isSyncingAllDb
                        ? 'در حال ذخیره همه کاربران در دیتابیس...'
                        : 'ذخیره و همگام‌سازی فوری همه کاربران در دیتابیس (Save All to DB)'}
                    </span>
                  </button>

                  {storageStatus?.lastD1Error && (
                    <div className="p-2 rounded-lg bg-rose-500/20 border border-rose-500/30 text-[10px] text-rose-200 font-mono">
                      D1 Status: {storageStatus.lastD1Error}
                    </div>
                  )}

                  {showD1Guide && (
                    <div className="pt-2.5 border-t border-slate-800/80 text-[11px] text-slate-200 space-y-1.5 leading-relaxed" dir="rtl">
                      <p className="font-bold text-amber-300">نحوه بررسی و اتصال دیتابیس D1 در کلادفلر:</p>
                      <ol className="list-decimal list-inside space-y-1 text-slate-300">
                        <li>
                          از تب <b>GitHub</b> نسخه جدید را روی گیت‌هاب آپلود کنید تا جداول دیتابیس در کلادفلر به صورت خودکار ساخته شوند.
                        </li>
                        <li>
                          در پنل کلادفلر در بخش <b>Workers &amp; Pages</b> &larr; پروژه خود &larr; <b>Settings</b> &larr; <b>Bindings</b> اطمینان حاصل کنید دیتابیس D1 با نام متغیر <code className="text-amber-300 font-black bg-slate-950 px-1.5 py-0.5 rounded">DB</code> متصل باشد.
                        </li>
                      </ol>
                    </div>
                  )}
                </div>

                {/* Feedback Alert */}
                {userFeedback && (
                  <div
                    className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                      userFeedback.type === 'success'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                    }`}
                  >
                    {userFeedback.type === 'success' ? (
                      <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                    ) : (
                      <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                    )}
                    <span className="font-bold">{userFeedback.message}</span>
                  </div>
                )}

                {/* QUICK USER SEARCH BAR BY ID OR TELEGRAM @USERNAME */}
                <div className="p-3 rounded-2xl bg-slate-900/95 border border-amber-500/40 space-y-2 shadow-md">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-black text-amber-300 flex items-center gap-1.5">
                      <Search className="w-3.5 h-3.5 text-amber-400" />
                      <span>جستجوی سریع کاربر (با آیدی یا یوزرنیم تلگرام / Search by ID or @username)</span>
                    </label>
                    {userSearch.trim() && (
                      <button
                        type="button"
                        onClick={() => setUserSearch('')}
                        className="text-[10px] font-bold text-rose-300 hover:text-rose-200 bg-rose-500/15 border border-rose-500/30 px-2 py-0.5 rounded-lg cursor-pointer"
                      >
                        پاک کردن ✕
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <Search className="w-4 h-4 text-amber-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Search by User ID, Telegram ID, @username, Display Name, or Referral Code..."
                      value={userSearch}
                      onChange={(e) => {
                        const val = e.target.value;
                        setUserSearch(val);
                        const cleanQ = val.trim().replace(/^@/, '').toLowerCase();
                        if (cleanQ) {
                          const match = allUsers.find(
                            (u) =>
                              (u.id || '').toLowerCase().includes(cleanQ) ||
                              String(u.telegramId || '').toLowerCase().includes(cleanQ) ||
                              (u.username || '').toLowerCase().includes(cleanQ) ||
                              (u.displayName || '').toLowerCase().includes(cleanQ) ||
                              (u.referralCode || '').toLowerCase().includes(cleanQ)
                          );
                          if (match) {
                            setSelectedUserId(match.id);
                          }
                        }
                      }}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-3 py-2.5 text-xs text-white font-mono placeholder-slate-500 focus:outline-none focus:border-amber-400"
                    />
                  </div>
                </div>

                {/* SELECTED USER PERFORMANCE & TOKEN MANAGEMENT DASHBOARD */}
                {(() => {
                  const cleanQuery = userSearch.trim().replace(/^@/, '').toLowerCase();
                  const matchingUsers = cleanQuery
                    ? allUsers.filter(
                        (u) =>
                          (u.username || '').toLowerCase().includes(cleanQuery) ||
                          (u.displayName || '').toLowerCase().includes(cleanQuery) ||
                          (u.id || '').toLowerCase().includes(cleanQuery) ||
                          String(u.telegramId || '').toLowerCase().includes(cleanQuery) ||
                          (u.referralCode || '').toLowerCase().includes(cleanQuery) ||
                          (u.email || '').toLowerCase().includes(cleanQuery)
                      )
                    : allUsers;

                  const targetUser =
                    matchingUsers.find((u) => u.id === selectedUserId) ||
                    matchingUsers[0] ||
                    allUsers.find((u) => u.id === selectedUserId) ||
                    allUsers[0];
                  if (!targetUser) return null;

                  const upgradeEntries = Object.entries(targetUser.upgrades || {}).filter(([, lvl]) => Number(lvl) > 0);
                  const totalUpgradeLevels = upgradeEntries.reduce((sum, [, lvl]) => sum + (Number(lvl) || 0), 0);
                  const ownedGiftsCount = upgradeEntries.filter(([upId]) => {
                    const def = adminUpgrades.find((d) => d.id === upId);
                    return def?.category === 'gift' || upId.startsWith('gift_');
                  }).length;
                  const completedTasksCount = Object.values(targetUser.tasks || {}).filter(
                    (t: any) => t?.claimed || t?.completed
                  ).length;
                  const isUserActive =
                    (targetUser.totalTaps || 0) > 0 ||
                    (targetUser.profitPerHour || 0) > 0 ||
                    upgradeEntries.length > 0 ||
                    (targetUser.balance || 0) > 5000;
                  const lastActiveTs =
                    (targetUser as any).updatedAt || targetUser.lastPassiveClaimTimestamp || targetUser.createdAt;
                  const botHandle = (config?.telegramBotUsername || 'FOX_COINlBOT').replace(/^@/, '').trim() || 'FOX_COINlBOT';
                  const userReferralLink = `https://t.me/${botHandle}?start=ref_${targetUser.referralCode || ''}`;

                  return (
                    <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-500/15 via-slate-900 to-slate-900 border border-amber-500/40 space-y-3.5 shadow-lg">
                      {/* Header: User Identity & Activity Status */}
                      <div className="flex items-start justify-between border-b border-slate-800 pb-2.5 gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-[10px] uppercase tracking-wider text-amber-400 font-black">
                              📊 عملکرد و مدیریت کاربر
                            </span>
                            {targetUser.isBanned && (
                              <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-rose-500/25 text-rose-300 border border-rose-500/50">
                                🚫 مسدود شده (BANNED)
                              </span>
                            )}
                            <span
                              className={`px-2 py-0.5 rounded-full text-[9px] font-black border ${
                                isUserActive
                                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                                  : 'bg-slate-800 text-slate-300 border-slate-700'
                              }`}
                            >
                              {isUserActive ? '🟢 فعال در مینی‌اپ' : '⚪ غیرفعال (فقط استارت ربات)'}
                            </span>
                            {targetUser.hasJoinedChannel && (
                              <span className="px-1.5 py-0.5 rounded-full bg-sky-500/20 text-sky-300 border border-sky-500/30 text-[9px] font-bold">
                                📢 عضو کانال
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 mt-1">
                            <span className="font-black text-sm text-white truncate">
                              {targetUser.displayName || targetUser.username}
                            </span>
                            <span className="text-[10px] font-mono text-slate-400">(@{targetUser.username})</span>
                          </div>
                          <div className="text-[10px] font-mono text-slate-400 mt-0.5">
                            ID: {targetUser.id} {targetUser.telegramId ? `• TG ID: ${targetUser.telegramId}` : ''}
                          </div>
                        </div>
                        <div className="text-right shrink-0 flex flex-col items-end gap-1">
                          <div>
                            <div className="text-xs font-black text-amber-300">
                              {Math.floor(targetUser.balance || 0).toLocaleString('en-US')} FOX
                            </div>
                            <div className="text-[10px] text-emerald-400 font-bold">
                              لول {targetUser.level || 1} ({targetUser.levelName || 'Bronze Fox'})
                            </div>
                          </div>
                          <button
                            type="button"
                            disabled={isExecutingBulkAction}
                            onClick={() =>
                              handleExecuteBulkUserAction(targetUser.isBanned ? 'unban' : 'ban', [targetUser.id])
                            }
                            className={`px-2 py-1 rounded-lg text-[9px] font-black flex items-center gap-1 transition cursor-pointer ${
                              targetUser.isBanned
                                ? 'bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300'
                                : 'bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-300'
                            }`}
                          >
                            <Ban className="w-3 h-3" />
                            <span>{targetUser.isBanned ? 'رفع مسدودیت (Unban)' : 'مسدود کردن (Ban)'}</span>
                          </button>
                        </div>
                      </div>

                      {/* Detailed User Performance Grid (عملکرد کامل کاربر) */}
                      <div className="space-y-2" dir="rtl">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-black text-amber-300">
                            گزارش ریز عملکرد کاربر در بازی و ربات:
                          </span>
                          <span className="text-[9px] text-slate-400">
                            آخرین فعالیت:{' '}
                            {lastActiveTs ? new Date(lastActiveTs).toLocaleDateString('fa-IR') : 'ثبت نشده'}
                          </span>
                        </div>

                        <div className="grid grid-cols-3 gap-1.5 text-center">
                          <div className="p-2 rounded-xl bg-slate-950/90 border border-slate-800">
                            <span className="text-[9px] text-slate-400 block">موجودی فعلی</span>
                            <span className="text-xs font-black text-amber-400 block">
                              {Math.floor(targetUser.balance || 0).toLocaleString('en-US')}
                            </span>
                            <span className="text-[8px] text-slate-500">
                              کل کسب‌شده: {Math.floor(targetUser.totalEarned || 0).toLocaleString('en-US')}
                            </span>
                          </div>

                          <div className="p-2 rounded-xl bg-slate-950/90 border border-slate-800">
                            <span className="text-[9px] text-slate-400 block">سود ساعتی (پروفیت)</span>
                            <span className="text-xs font-black text-sky-400 block">
                              +{Math.floor(targetUser.profitPerHour || 0).toLocaleString('en-US')}/hr
                            </span>
                            <span className="text-[8px] text-slate-500">
                              آفلاین: {Math.floor(targetUser.unclaimedPassive || 0).toLocaleString('en-US')} FOX
                            </span>
                          </div>

                          <div className="p-2 rounded-xl bg-slate-950/90 border border-slate-800">
                            <span className="text-[9px] text-slate-400 block">تعداد کل تپ‌ها</span>
                            <span className="text-xs font-black text-purple-400 block">
                              {Math.floor(targetUser.totalTaps || 0).toLocaleString('en-US')} بار
                            </span>
                            <span className="text-[8px] text-slate-500">
                              قدرت تپ: +{targetUser.tapPower || 1} | انرژی: {Math.floor(targetUser.energy || 0)}/{targetUser.maxEnergy || 1000}
                            </span>
                          </div>

                          <div className="p-2 rounded-xl bg-slate-950/90 border border-slate-800">
                            <span className="text-[9px] text-slate-400 block">تعداد دعوتی‌ها (رفرال)</span>
                            <span className="text-xs font-black text-emerald-400 block">
                              {targetUser.referralCount || 0} نفر
                            </span>
                            <span className="text-[8px] text-slate-500">
                              پاداش ۱۰تایی: {targetUser.claimedMilestones || 0} بار
                            </span>
                          </div>

                          <div className="p-2 rounded-xl bg-slate-950/90 border border-slate-800">
                            <span className="text-[9px] text-slate-400 block">درآمد رفرال (قابل ترید)</span>
                            <span className="text-xs font-black text-emerald-300 block">
                              {Math.floor(targetUser.referralEarnings || 0).toLocaleString('en-US')} FOX
                            </span>
                            <span className="text-[8px] text-emerald-500 font-bold">
                              ≈ ${((targetUser.referralEarnings || 0) * 0.001).toFixed(2)} USD
                            </span>
                          </div>

                          <div className="p-2 rounded-xl bg-slate-950/90 border border-slate-800">
                            <span className="text-[9px] text-slate-400 block">کارت‌ها و تسک‌ها</span>
                            <span className="text-xs font-black text-orange-400 block">
                              {upgradeEntries.length} کارت ({totalUpgradeLevels} لول)
                            </span>
                            <span className="text-[8px] text-slate-500">
                              {ownedGiftsCount} گیفت • {completedTasksCount} تسک • استریک {targetUser.dailyStreak || 0}
                            </span>
                          </div>
                        </div>

                        {/* User's Purchased Upgrades & Gifts List */}
                        {upgradeEntries.length > 0 && (
                          <div className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800/90">
                            <span className="text-[10px] font-bold text-slate-300 block mb-1.5">
                              🃏 کارت‌ها و گیفت‌های خریداری‌شده توسط این کاربر ({upgradeEntries.length} مورد):
                            </span>
                            <div className="flex flex-wrap gap-1.5">
                              {upgradeEntries.map(([upId, lvl]) => {
                                const def = adminUpgrades.find((d) => d.id === upId);
                                return (
                                  <span
                                    key={upId}
                                    className="px-2 py-0.5 rounded-lg bg-slate-900 border border-slate-700 text-[10px] text-amber-200 font-bold"
                                  >
                                    {def?.name || upId}: <b className="text-emerald-400">Lvl {lvl}</b>
                                  </span>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* User's Invited Friends List (زیرمجموعه‌های دعوت‌شده توسط این کاربر) */}
                        {(() => {
                          const targetCode = (targetUser.referralCode || '').toUpperCase();
                          const targetInvitedIds = new Set<string>(
                            Array.isArray(targetUser.invitedUserIds) ? targetUser.invitedUserIds : []
                          );
                          const invitedList =
                            Array.isArray(targetUser.invitedFriends) && targetUser.invitedFriends.length > 0
                              ? targetUser.invitedFriends
                              : allUsers
                                  .filter(
                                    (u) =>
                                      u.id !== targetUser.id &&
                                      !u.id.startsWith('bot_') &&
                                      (targetInvitedIds.has(u.id) ||
                                        (targetCode && (u.referredByCode || '').toUpperCase() === targetCode))
                                  )
                                  .map((u) => ({
                                    id: u.id,
                                    username: u.username,
                                    displayName: u.displayName || u.username,
                                    level: u.level || 1,
                                    levelName: u.levelName || 'Bronze Fox',
                                    balance: Math.floor(u.balance || 0),
                                    profitPerHour: Math.floor(u.profitPerHour || 0),
                                    isTelegram: Boolean(u.isTelegram),
                                    rewardEarned: 5000,
                                    joinedAt: u.createdAt || Date.now(),
                                  }));

                          return (
                            <div className="p-2.5 rounded-xl bg-slate-950/75 border border-emerald-500/30 space-y-1.5">
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] font-black text-emerald-300">
                                  👥 لیست دعوت‌شده‌های این کاربر ({invitedList.length} نفر ثبت‌شده):
                                </span>
                                {targetUser.referredByCode && (
                                  <span className="text-[9px] font-mono text-amber-300 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/30">
                                    دعوت‌شده با کد: {targetUser.referredByCode}
                                  </span>
                                )}
                              </div>
                              {invitedList.length > 0 ? (
                                <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto">
                                  {invitedList.map((inv, idx) => (
                                    <button
                                      key={inv.id || idx}
                                      type="button"
                                      onClick={() => setSelectedUserId(inv.id)}
                                      className="px-2 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-[10px] text-slate-200 flex items-center gap-1 transition cursor-pointer"
                                    >
                                      <span className="text-amber-400 font-black">#{idx + 1}</span>
                                      <span className="font-bold">{inv.displayName || inv.username}</span>
                                      <span className="text-slate-400 font-mono">(@{inv.username})</span>
                                      <span className="text-emerald-400 font-bold">
                                        • {Math.floor(inv.balance || 0).toLocaleString('en-US')} FOX
                                      </span>
                                    </button>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-[10px] text-slate-400 block">
                                  هنوز هیچ کاربری با لینک دعوت این شخص ثبت‌نام نکرده است.
                                </span>
                              )}
                            </div>
                          );
                        })()}

                        {/* User's Direct Referral Link with FOX_COINlBOT */}
                        <div className="p-2 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between gap-2" dir="ltr">
                          <div className="min-w-0 flex-1">
                            <span className="text-[9px] text-slate-400 block">
                              Referral Link (@{botHandle} • Code: {targetUser.referralCode || 'N/A'}):
                            </span>
                            <span className="text-[10px] font-mono text-sky-300 truncate block">
                              {userReferralLink}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(userReferralLink).catch(() => {});
                              setCopiedUserRef(targetUser.id);
                              setTimeout(() => setCopiedUserRef(null), 2000);
                            }}
                            className="px-2.5 py-1.5 rounded-lg bg-sky-500/20 hover:bg-sky-500/30 border border-sky-500/40 text-sky-300 text-[10px] font-black shrink-0 cursor-pointer"
                          >
                            {copiedUserRef === targetUser.id ? 'Copied ✓' : 'Copy Link'}
                          </button>
                        </div>
                      </div>

                      {/* Balance Type Selector */}
                      <div className="grid grid-cols-2 gap-1.5 bg-slate-950/80 p-1 rounded-xl border border-slate-800 text-[11px] font-bold">
                        <button
                          type="button"
                          onClick={() => setAdjustBalanceType('main')}
                          className={`py-1.5 rounded-lg transition cursor-pointer ${
                            adjustBalanceType === 'main'
                              ? 'bg-amber-500 text-slate-950 font-black'
                              : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          🪙 موجودی اصلی (Main FOX)
                        </button>
                        <button
                          type="button"
                          onClick={() => setAdjustBalanceType('referral')}
                          className={`py-1.5 rounded-lg transition cursor-pointer ${
                            adjustBalanceType === 'referral'
                              ? 'bg-emerald-500 text-slate-950 font-black'
                              : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          🎁 موجودی رفرال (Referral FOX)
                        </button>
                      </div>

                      {/* Quick Presets */}
                      <div>
                        <span className="text-[10px] text-slate-400 font-bold block mb-1.5">
                          افزایش / کاهش سریع سکه کاربر:
                        </span>
                        <div className="grid grid-cols-3 gap-1.5 text-[11px] font-black">
                          <button
                            type="button"
                            disabled={isAdjustingBalance}
                            onClick={() => handleAdjustUserTokens(targetUser.id, 'add', 1000)}
                            className="py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 transition active:scale-95 cursor-pointer"
                          >
                            +1,000 FOX
                          </button>
                          <button
                            type="button"
                            disabled={isAdjustingBalance}
                            onClick={() => handleAdjustUserTokens(targetUser.id, 'add', 10000)}
                            className="py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 transition active:scale-95 cursor-pointer"
                          >
                            +10,000 FOX
                          </button>
                          <button
                            type="button"
                            disabled={isAdjustingBalance}
                            onClick={() => handleAdjustUserTokens(targetUser.id, 'add', 100000)}
                            className="py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 transition active:scale-95 cursor-pointer"
                          >
                            +100,000 FOX
                          </button>
                          <button
                            type="button"
                            disabled={isAdjustingBalance}
                            onClick={() => handleAdjustUserTokens(targetUser.id, 'deduct', 1000)}
                            className="py-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-300 transition active:scale-95 cursor-pointer"
                          >
                            -1,000 FOX
                          </button>
                          <button
                            type="button"
                            disabled={isAdjustingBalance}
                            onClick={() => handleAdjustUserTokens(targetUser.id, 'deduct', 10000)}
                            className="py-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-300 transition active:scale-95 cursor-pointer"
                          >
                            -10,000 FOX
                          </button>
                          <button
                            type="button"
                            disabled={isAdjustingBalance}
                            onClick={() => handleAdjustUserTokens(targetUser.id, 'set', 0)}
                            className="py-1.5 rounded-lg bg-slate-800 hover:bg-rose-950 border border-slate-700 text-slate-300 hover:text-rose-300 transition active:scale-95 cursor-pointer"
                          >
                            صفر کردن (0)
                          </button>
                        </div>
                      </div>

                      {/* Custom Amount Input & Action Buttons */}
                      <div className="space-y-2 pt-1">
                        <div className="relative">
                          <Coins className="w-4 h-4 text-amber-400 absolute left-3 top-1/2 -translate-y-1/2" />
                          <input
                            type="number"
                            min="0"
                            step="100"
                            placeholder="Enter custom FOX amount..."
                            value={adjustAmount}
                            onChange={(e) => setAdjustAmount(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-amber-400"
                          />
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          <button
                            type="button"
                            disabled={isAdjustingBalance}
                            onClick={() => handleAdjustUserTokens(targetUser.id, 'add')}
                            className="py-2.5 px-2 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs rounded-xl flex items-center justify-center gap-1 shadow transition active:scale-95 cursor-pointer disabled:opacity-50"
                          >
                            <PlusCircle className="w-3.5 h-3.5" />
                            <span>افزایش سکه</span>
                          </button>
                          <button
                            type="button"
                            disabled={isAdjustingBalance}
                            onClick={() => handleAdjustUserTokens(targetUser.id, 'deduct')}
                            className="py-2.5 px-2 bg-rose-600 hover:bg-rose-500 text-white font-black text-xs rounded-xl flex items-center justify-center gap-1 shadow transition active:scale-95 cursor-pointer disabled:opacity-50"
                          >
                            <MinusCircle className="w-3.5 h-3.5" />
                            <span>کسر سکه</span>
                          </button>
                          <button
                            type="button"
                            disabled={isAdjustingBalance}
                            onClick={() => handleAdjustUserTokens(targetUser.id, 'set')}
                            className="py-2.5 px-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl flex items-center justify-center gap-1 shadow transition active:scale-95 cursor-pointer disabled:opacity-50"
                          >
                            <span>تنظیم دقیق</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* Activity Filter Tabs (همه / فعال / غیرفعال / دارای رفرال / مسدود شده) */}
                <div className="grid grid-cols-5 gap-1 bg-slate-900/90 p-1 rounded-xl border border-slate-800 text-[9px] font-bold">
                  {[
                    { id: 'all', label: 'همه کاربران' },
                    { id: 'active', label: '🟢 فعال‌ها' },
                    { id: 'inactive', label: '⚪ غیرفعال‌ها' },
                    { id: 'referrals', label: '🎁 دعوتی' },
                    { id: 'banned', label: '🚫 مسدود (Ban)' },
                  ].map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setUserActivityFilter(f.id as any)}
                      className={`py-1.5 rounded-lg transition cursor-pointer ${
                        userActivityFilter === f.id
                          ? 'bg-amber-500 text-slate-950 font-black'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>

                {/* Search Input Above Users List */}
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search user by ID, Telegram @username, Name, or Referral Code..."
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                  />
                </div>

                {/* All Users List with Bulk Actions Toolbar, Ban Selected Button & Checkboxes */}
                {(() => {
                  const cleanQ = userSearch.trim().replace(/^@/, '').toLowerCase();
                  const filteredList = allUsers.filter((u) => {
                    const upCount = Object.values(u.upgrades || {}).filter((lvl) => Number(lvl) > 0).length;
                    const isActive =
                      (u.totalTaps || 0) > 0 ||
                      (u.profitPerHour || 0) > 0 ||
                      upCount > 0 ||
                      (u.balance || 0) > 5000;

                    if (userActivityFilter === 'active' && !isActive) return false;
                    if (userActivityFilter === 'inactive' && isActive) return false;
                    if (userActivityFilter === 'referrals' && !(u.referralCount && u.referralCount > 0)) return false;
                    if (userActivityFilter === 'banned' && !u.isBanned) return false;

                    if (!cleanQ) return true;
                    return (
                      (u.username || '').toLowerCase().includes(cleanQ) ||
                      (u.displayName || '').toLowerCase().includes(cleanQ) ||
                      (u.id || '').toLowerCase().includes(cleanQ) ||
                      String(u.telegramId || '').toLowerCase().includes(cleanQ) ||
                      (u.referralCode || '').toLowerCase().includes(cleanQ) ||
                      (u.email || '').toLowerCase().includes(cleanQ)
                    );
                  });

                  const filteredIds = filteredList.map((u) => u.id);
                  const allFilteredSelected =
                    filteredIds.length > 0 && filteredIds.every((id) => selectedBulkUserIds.includes(id));

                  return (
                    <div className="space-y-2.5">
                      {/* BULK ACTIONS MENU & TOOLBAR */}
                      <div className="p-2.5 rounded-2xl bg-slate-900/95 border border-rose-500/40 space-y-2 shadow-md">
                        <div className="flex items-center justify-between gap-1.5 flex-wrap">
                          {/* Select All & Select Bots/Inactive */}
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <button
                              type="button"
                              onClick={() => handleSelectAllFilteredUsers(filteredIds)}
                              className="px-2.5 py-1.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-700 text-[10px] font-black text-slate-200 flex items-center gap-1.5 transition cursor-pointer"
                            >
                              {allFilteredSelected ? (
                                <CheckSquare className="w-3.5 h-3.5 text-amber-400" />
                              ) : (
                                <Square className="w-3.5 h-3.5 text-slate-400" />
                              )}
                              <span>{allFilteredSelected ? 'لغو انتخاب همه' : 'Select All'}</span>
                            </button>

                            <button
                              type="button"
                              onClick={handleSelectInactiveBotAccounts}
                              className="px-2.5 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 text-[10px] font-black flex items-center gap-1 transition cursor-pointer"
                              title="انتخاب خودکار اکانت‌های فیک و ربات‌های غیرفعال"
                            >
                              <Bot className="w-3.5 h-3.5" />
                              <span>انتخاب ربات‌ها/فیک‌ها</span>
                            </button>

                            {selectedBulkUserIds.length > 0 && (
                              <span className="px-2 py-0.5 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[10px] font-black">
                                {selectedBulkUserIds.length} Selected
                              </span>
                            )}
                          </div>

                          {/* Primary Ban Selected Button + Bulk Actions Dropdown Trigger */}
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              disabled={isExecutingBulkAction || selectedBulkUserIds.length === 0}
                              onClick={() => handleExecuteBulkUserAction('ban')}
                              className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-black text-[10px] flex items-center gap-1 shadow-md shadow-rose-600/20 transition active:scale-95 cursor-pointer disabled:opacity-40"
                            >
                              <Ban className="w-3.5 h-3.5" />
                              <span>Ban Selected ({selectedBulkUserIds.length})</span>
                            </button>

                            <div className="relative">
                              <button
                                type="button"
                                onClick={() => setShowBulkActionsMenu((prev) => !prev)}
                                className="px-2.5 py-1.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-700 text-slate-200 font-black text-[10px] flex items-center gap-1 transition cursor-pointer"
                              >
                                <span>Bulk Actions</span>
                                <ChevronDown className="w-3.5 h-3.5 text-amber-400" />
                              </button>

                              {showBulkActionsMenu && (
                                <div className="absolute right-0 mt-1.5 w-52 rounded-2xl bg-slate-950 border border-slate-700 shadow-2xl p-1.5 z-30 space-y-1 text-[11px]">
                                  <div className="px-2.5 py-1 text-[9px] font-black text-slate-400 border-b border-slate-800 flex items-center justify-between">
                                    <span>BULK ACTIONS MENU</span>
                                    <span className="text-amber-400">{selectedBulkUserIds.length} کاربر</span>
                                  </div>
                                  <button
                                    type="button"
                                    disabled={isExecutingBulkAction || selectedBulkUserIds.length === 0}
                                    onClick={() => handleExecuteBulkUserAction('ban')}
                                    className="w-full px-2.5 py-2 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 font-black flex items-center justify-between transition cursor-pointer disabled:opacity-40"
                                  >
                                    <span className="flex items-center gap-1.5">
                                      <Ban className="w-3.5 h-3.5" />
                                      <span>Ban Selected (مسدودسازی)</span>
                                    </span>
                                  </button>
                                  <button
                                    type="button"
                                    disabled={isExecutingBulkAction || selectedBulkUserIds.length === 0}
                                    onClick={() => handleExecuteBulkUserAction('unban')}
                                    className="w-full px-2.5 py-2 rounded-xl hover:bg-emerald-500/15 text-emerald-300 font-bold flex items-center justify-between transition cursor-pointer disabled:opacity-40"
                                  >
                                    <span className="flex items-center gap-1.5">
                                      <Unlock className="w-3.5 h-3.5" />
                                      <span>Unban Selected (رفع بن)</span>
                                    </span>
                                  </button>
                                  <button
                                    type="button"
                                    disabled={isExecutingBulkAction || selectedBulkUserIds.length === 0}
                                    onClick={() => handleExecuteBulkUserAction('reset_coins')}
                                    className="w-full px-2.5 py-2 rounded-xl hover:bg-amber-500/15 text-amber-300 font-bold flex items-center justify-between transition cursor-pointer disabled:opacity-40"
                                  >
                                    <span className="flex items-center gap-1.5">
                                      <Coins className="w-3.5 h-3.5" />
                                      <span>صفر کردن سکه انتخاب‌شده‌ها</span>
                                    </span>
                                  </button>
                                  <button
                                    type="button"
                                    disabled={isExecutingBulkAction || selectedBulkUserIds.length === 0}
                                    onClick={() => handleExecuteBulkUserAction('delete')}
                                    className="w-full px-2.5 py-2 rounded-xl hover:bg-rose-500/20 text-rose-400 font-bold flex items-center justify-between transition cursor-pointer disabled:opacity-40"
                                  >
                                    <span className="flex items-center gap-1.5">
                                      <Trash2 className="w-3.5 h-3.5" />
                                      <span>حذف کامل اکانت‌ها (Delete)</span>
                                    </span>
                                  </button>
                                  {selectedBulkUserIds.length > 0 && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setSelectedBulkUserIds([]);
                                        setShowBulkActionsMenu(false);
                                      }}
                                      className="w-full px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 text-[10px] font-bold text-center cursor-pointer"
                                    >
                                      پاک کردن انتخاب‌ها
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      {filteredList.length === 0 ? (
                        <div className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800 text-center text-xs text-slate-400">
                          کاربری با مشخصات «{userSearch}» یافت نشد.
                        </div>
                      ) : (
                        <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
                          {filteredList.map((u, idx) => {
                            const isSelected = u.id === (selectedUserId || filteredList[0]?.id);
                            const isBulkChecked = selectedBulkUserIds.includes(u.id);
                            const isCurrentPlayer = u.id === user?.id;
                            const upCount = Object.values(u.upgrades || {}).filter((lvl) => Number(lvl) > 0).length;
                            const isActive =
                              (u.totalTaps || 0) > 0 ||
                              (u.profitPerHour || 0) > 0 ||
                              upCount > 0 ||
                              (u.balance || 0) > 5000;

                            return (
                              <div
                                key={u.id}
                                onClick={() => setSelectedUserId(u.id)}
                                className={`p-3 rounded-2xl border transition cursor-pointer space-y-1.5 ${
                                  u.isBanned
                                    ? 'bg-rose-950/30 border-rose-500/50'
                                    : isBulkChecked
                                    ? 'bg-amber-500/20 border-amber-400 shadow-md'
                                    : isSelected
                                    ? 'bg-amber-500/15 border-amber-500/60 shadow-md'
                                    : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
                                }`}
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <div className="flex items-center gap-2 min-w-0 flex-1">
                                    {/* Multi-select Checkbox for Bulk Operations */}
                                    <button
                                      type="button"
                                      onClick={(e) => toggleBulkUserSelection(u.id, e)}
                                      className="p-1 rounded-lg hover:bg-slate-800 text-amber-400 shrink-0 cursor-pointer"
                                      title="Select user for Bulk Action"
                                    >
                                      {isBulkChecked ? (
                                        <CheckSquare className="w-4 h-4 text-amber-400" />
                                      ) : (
                                        <Square className="w-4 h-4 text-slate-500" />
                                      )}
                                    </button>

                                    <div className="min-w-0 flex-1">
                                      <div className="flex items-center gap-1.5 flex-wrap">
                                        <span className="text-[10px] font-black text-amber-400">#{idx + 1}</span>
                                        <span className="font-extrabold text-xs text-white truncate">
                                          {u.displayName || u.username}
                                        </span>
                                        {u.isBanned && (
                                          <span className="px-1.5 py-0.5 bg-rose-500/25 text-rose-300 border border-rose-500/40 text-[8px] font-black rounded">
                                            🚫 BANNED
                                          </span>
                                        )}
                                        {isCurrentPlayer && (
                                          <span className="px-1.5 py-0.2 bg-sky-500/20 text-sky-300 border border-sky-500/30 text-[9px] font-black rounded">
                                            YOU
                                          </span>
                                        )}
                                        {u.isTelegram && (
                                          <span className="px-1.5 py-0.2 bg-blue-500/20 text-blue-300 text-[9px] font-bold rounded">
                                            TG
                                          </span>
                                        )}
                                        <span
                                          className={`px-1.5 py-0.2 rounded text-[8px] font-bold ${
                                            isActive
                                              ? 'bg-emerald-500/20 text-emerald-300'
                                              : 'bg-slate-800 text-slate-400'
                                          }`}
                                        >
                                          {isActive ? 'فعال' : 'غیرفعال'}
                                        </span>
                                      </div>
                                      <div className="text-[10px] text-slate-400 font-mono truncate">
                                        @{u.username} • {u.id}
                                        {u.telegramId ? ` (TG: ${u.telegramId})` : ''} • Lvl {u.level} ({u.levelName})
                                      </div>
                                    </div>
                                  </div>

                                  <div className="text-right shrink-0">
                                    <div className="text-xs font-black text-amber-400">
                                      {Math.floor(u.balance || 0).toLocaleString('en-US')} FOX
                                    </div>
                                    <div className="text-[10px] text-emerald-400 font-semibold">
                                      دعوت: {u.referralCount || 0} نفر ({Math.floor(u.referralEarnings || 0).toLocaleString('en-US')} FOX)
                                    </div>
                                  </div>
                                </div>

                                {/* Compact Performance Row for Every User */}
                                <div className="grid grid-cols-4 gap-1 pt-1 border-t border-slate-800/80 text-[9px] text-slate-300 text-center">
                                  <div className="bg-slate-950/60 rounded px-1 py-0.5">
                                    ⚡ سود/ساعت: <b className="text-sky-300">+{Math.floor(u.profitPerHour || 0).toLocaleString('en-US')}</b>
                                  </div>
                                  <div className="bg-slate-950/60 rounded px-1 py-0.5">
                                    👆 تپ‌ها: <b className="text-purple-300">{Math.floor(u.totalTaps || 0).toLocaleString('en-US')}</b>
                                  </div>
                                  <div className="bg-slate-950/60 rounded px-1 py-0.5">
                                    🃏 کارت‌ها: <b className="text-orange-300">{upCount}</b>
                                  </div>
                                  <div className="bg-slate-950/60 rounded px-1 py-0.5">
                                    🔥 استریک: <b className="text-amber-300">{u.dailyStreak || 0} روز</b>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            )}

            {/* TAB: SECTION LOCKS MANAGER (قفل کردن هر بخش از برنامه مثلاً بخش رنک) */}
            {activeTab === 'locks' && (
              <div className="space-y-4 animate-fade-in" dir="rtl">
                <div className="p-4 rounded-2xl bg-gradient-to-br from-rose-500/20 via-slate-900 to-slate-900 border border-rose-500/40 space-y-3 shadow-lg">
                  <div className="flex items-center justify-between">
                    <h4 className="font-black text-xs text-rose-300 flex items-center gap-1.5">
                      <Lock className="w-4 h-4 text-rose-400" />
                      <span>قفل کردن بخش‌های بازی (Section Access Control)</span>
                    </h4>
                    <span className="px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[10px] font-black">
                      اعمال آنی برای همه کاربران
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    از این قسمت می‌توانید هر بخش از مینی‌اپ (مثل <b>بخش رنک / لیدربورد</b>، <b>ترید</b>، <b>گیفت‌ها</b>، <b>ماین</b>، <b>تسک‌ها</b> یا <b>دعوت دوستان</b>) را با یک کلیک قفل یا باز کنید. وقتی بخشی قفل باشد، آیکون قفل 🔒 روی منوی پایین ظاهر شده و کاربران پیام «قفل بودن بخش توسط مدیریت» را مشاهده می‌کنند.
                  </p>

                  {/* Quick Bulk Lock / Unlock All Buttons */}
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <button
                      type="button"
                      disabled={isSavingAdminData}
                      onClick={() => {
                        const allUnlocked: Record<string, boolean> = {};
                        LOCKABLE_APP_SECTIONS.forEach((s) => {
                          allUnlocked[s.id] = false;
                        });
                        handleSaveAllSectionLocks(allUnlocked, '🔓 تمام بخش‌های برنامه برای همه کاربران باز شدند.');
                      }}
                      className="py-2 px-3 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 font-black text-xs flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer disabled:opacity-50"
                    >
                      <Unlock className="w-3.5 h-3.5" />
                      <span>باز کردن قفل همه بخش‌ها</span>
                    </button>
                    <button
                      type="button"
                      disabled={isSavingAdminData}
                      onClick={() => {
                        const allLocked: Record<string, boolean> = {};
                        LOCKABLE_APP_SECTIONS.forEach((s) => {
                          allLocked[s.id] = true;
                        });
                        handleSaveAllSectionLocks(allLocked, '🔒 تمام بخش‌های فرعی برنامه قفل شدند (فقط صفحه تپ باز است).');
                      }}
                      className="py-2 px-3 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-300 font-black text-xs flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer disabled:opacity-50"
                    >
                      <Lock className="w-3.5 h-3.5" />
                      <span>قفل کردن همه بخش‌ها</span>
                    </button>
                  </div>
                </div>

                {/* Individual Section Lock Cards */}
                <div className="space-y-2.5">
                  {LOCKABLE_APP_SECTIONS.map((sec) => {
                    const isLocked = Boolean(adminLockedSections[sec.id]);
                    return (
                      <div
                        key={sec.id}
                        className={`p-3.5 rounded-2xl border transition flex items-center justify-between gap-3 ${
                          isLocked
                            ? 'bg-rose-950/35 border-rose-500/50 shadow-md'
                            : 'bg-slate-900/90 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-start gap-2.5 min-w-0">
                          <div
                            className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0 border ${
                              isLocked
                                ? 'bg-rose-500/20 border-rose-500/40'
                                : 'bg-slate-950 border-slate-800'
                            }`}
                          >
                            {sec.icon}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-black text-xs text-white">{sec.titleFa}</span>
                              <span
                                className={`px-2 py-0.5 rounded-full text-[9px] font-black border ${
                                  isLocked
                                    ? 'bg-rose-500/25 text-rose-300 border-rose-500/40'
                                    : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                                }`}
                              >
                                {isLocked ? '🔒 قفل شده (Locked)' : '🔓 فعال و باز (Open)'}
                              </span>
                            </div>
                            <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">{sec.descFa}</p>
                          </div>
                        </div>

                        <button
                          type="button"
                          disabled={isSavingAdminData}
                          onClick={() => handleToggleSectionLock(sec.id)}
                          className={`px-3.5 py-2.5 rounded-xl font-black text-xs shrink-0 flex items-center gap-1.5 shadow transition active:scale-95 cursor-pointer disabled:opacity-50 ${
                            isLocked
                              ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950'
                              : 'bg-rose-600 hover:bg-rose-500 text-white'
                          }`}
                        >
                          {isLocked ? (
                            <>
                              <Unlock className="w-3.5 h-3.5" />
                              <span>باز کردن قفل</span>
                            </>
                          ) : (
                            <>
                              <Lock className="w-3.5 h-3.5" />
                              <span>قفل کردن بخش</span>
                            </>
                          )}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* TAB: DISPLAY-ONLY FAKE LEADERBOARD MEMBERS (ممبر های فیک فقط نمایشی در رنک) */}
            {activeTab === 'fake_rank' && (
              <div className="space-y-4 animate-fade-in">
                {(() => {
                  const realPlayers = allUsers.filter(
                    (u) => u && u.id && !u.id.startsWith('bot_') && !u.id.startsWith('seed_') && !u.id.startsWith('fake_lb_')
                  );
                  const topRealCoins = realPlayers.reduce((max, u) => Math.max(max, Math.floor(u.balance || 0)), 0);
                  const topFakeCoins = adminFakeMembers.reduce((max, m) => Math.max(max, Math.floor(m.balance || 0)), 0);
                  const currentTop1Balance = Math.max(topRealCoins, topFakeCoins, 5000);

                  // Combined ranking map so admin sees exact live rank (#1, #2, ...) of every fake member
                  const combinedRanking = [
                    ...realPlayers.map((u) => ({
                      id: u.id,
                      balance: Math.floor(u.balance || 0),
                      profitPerHour: Math.floor(u.profitPerHour || 0),
                      isFake: false,
                    })),
                    ...adminFakeMembers.map((m) => ({
                      id: m.id,
                      balance: Math.floor(m.balance || 0),
                      profitPerHour: Math.floor(m.profitPerHour || 0),
                      isFake: true,
                    })),
                  ].sort((a, b) => {
                    if (b.balance !== a.balance) return b.balance - a.balance;
                    return b.profitPerHour - a.profitPerHour;
                  });

                  const rankById = new Map<string, number>();
                  combinedRanking.forEach((item, idx) => {
                    rankById.set(item.id, idx + 1);
                  });

                  // Calculate predicted rank for the form's current balance input
                  const previewCoins = Math.max(0, Math.floor(Number(fakeBalance) || 0));
                  const previewLevelObj = calculateLevelForFakeBalance(previewCoins, fakeCustomLevel);
                  const betterCount = combinedRanking.filter(
                    (item) => item.id !== editingFakeId && item.balance > previewCoins
                  ).length;
                  const predictedRank = betterCount + 1;

                  const cleanFilter = fakeSearchQuery.trim().replace(/^@/, '').toLowerCase();
                  const filteredFakes = cleanFilter
                    ? adminFakeMembers.filter(
                        (m) =>
                          m.displayName.toLowerCase().includes(cleanFilter) ||
                          m.username.toLowerCase().includes(cleanFilter)
                      )
                    : adminFakeMembers;

                  return (
                    <>
                      {/* Top Overview Card + Quick Rank Lock Switch */}
                      <div className="p-3.5 rounded-2xl bg-gradient-to-br from-amber-500/20 via-slate-900 to-slate-900 border border-amber-500/40 space-y-2.5" dir="rtl">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <h4 className="font-black text-xs text-amber-300 flex items-center gap-1.5">
                            <Trophy className="w-4 h-4 text-amber-400" />
                            <span>مدیریت ممبرهای فیک در رنک (فقط نمایشی)</span>
                          </h4>
                          <button
                            type="button"
                            disabled={isSavingAdminData}
                            onClick={() => handleToggleSectionLock('leaderboard')}
                            className={`px-2.5 py-1 rounded-xl text-[10px] font-black flex items-center gap-1 transition cursor-pointer ${
                              adminLockedSections.leaderboard
                                ? 'bg-rose-500 text-white shadow'
                                : 'bg-slate-950 hover:bg-rose-500/20 border border-rose-500/40 text-rose-300'
                            }`}
                          >
                            {adminLockedSections.leaderboard ? (
                              <>
                                <Unlock className="w-3 h-3" />
                                <span>بخش رنک قفل است (کلیک برای باز کردن)</span>
                              </>
                            ) : (
                              <>
                                <Lock className="w-3 h-3" />
                                <span>قفل کردن بخش رنک</span>
                              </>
                            )}
                          </button>
                        </div>
                        <p className="text-[11px] text-slate-300 leading-relaxed">
                          ممبرهایی که در این بخش اضافه می‌کنید <b>فقط نمایشی در جدول رنک (Hall of Foxes)</b> هستند و برای همه پلیرها دقیقاً مثل کاربران واقعی نمایش داده می‌شوند، اما وارد لیست کاربران واقعی نمی‌شوند.
                        </p>

                        <div className="grid grid-cols-3 gap-2 pt-1 text-center">
                          <div className="p-2 rounded-xl bg-slate-950/90 border border-slate-800">
                            <span className="text-[9px] text-slate-400 block">ممبرهای فیک فعال</span>
                            <span className="text-xs font-black text-amber-400 block">
                              {adminFakeMembers.length} نفر
                            </span>
                          </div>
                          <div className="p-2 rounded-xl bg-slate-950/90 border border-slate-800">
                            <span className="text-[9px] text-slate-400 block">پلیرهای واقعی</span>
                            <span className="text-xs font-black text-emerald-400 block">
                              {realPlayers.length} نفر
                            </span>
                          </div>
                          <div className="p-2 rounded-xl bg-slate-950/90 border border-slate-800">
                            <span className="text-[9px] text-slate-400 block">سکه نفر اول رنک (#1)</span>
                            <span className="text-xs font-black text-sky-400 block">
                              {currentTop1Balance.toLocaleString('en-US')}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Add / Edit Single Fake Member Form */}
                      <form
                        onSubmit={handleSaveSingleFakeMember}
                        className="p-4 rounded-2xl bg-slate-900/95 border border-amber-500/40 space-y-3 shadow-lg"
                        dir="rtl"
                      >
                        <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                          <div>
                            <span className="text-[10px] text-amber-400 font-black block">
                              {editingFakeId ? '✏️ ویرایش ممبر فیک در رنک' : '➕ افزودن ممبر فیک تکی به رنک'}
                            </span>
                            <h5 className="font-black text-xs text-white mt-0.5">
                              {editingFakeId
                                ? `در حال ویرایش: ${fakeDisplayName}`
                                : 'مشخصات و تعداد سکه ممبر نمایشی را وارد کنید'}
                            </h5>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={handlePickRandomFakeIdentity}
                              className="px-2.5 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 text-[10px] font-black flex items-center gap-1 transition cursor-pointer"
                            >
                              <Sparkles className="w-3 h-3" />
                              <span>🎲 نام تصادفی طبیعی</span>
                            </button>
                            {editingFakeId && (
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingFakeId(null);
                                  setFakeDisplayName('');
                                  setFakeUsername('');
                                }}
                                className="px-2 py-1.5 rounded-xl bg-slate-800 text-slate-300 text-[10px] font-bold hover:text-white cursor-pointer"
                              >
                                انصراف
                              </button>
                            )}
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[10px] text-slate-300 font-bold block mb-1">
                              نام نمایشی در رنک (Display Name)
                            </label>
                            <input
                              type="text"
                              required
                              placeholder="مثلاً: Arash Crypto 🦊"
                              value={fakeDisplayName}
                              onChange={(e) => {
                                setFakeDisplayName(e.target.value);
                                if (!editingFakeId && !fakeUsername) {
                                  // Optional helper preview
                                }
                              }}
                              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                              dir="ltr"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] text-slate-300 font-bold block mb-1">
                              یوزرنیم تلگرام (بدون @)
                            </label>
                            <input
                              type="text"
                              placeholder="مثلاً: arash_fox99"
                              value={fakeUsername}
                              onChange={(e) => setFakeUsername(e.target.value)}
                              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-sky-300 font-mono focus:outline-none focus:border-amber-400"
                              dir="ltr"
                            />
                          </div>
                        </div>

                        {/* Balance & Profit Per Hour Inputs */}
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[10px] text-amber-300 font-bold block mb-1">
                              تعداد سکه در رنک (FOX Balance)
                            </label>
                            <input
                              type="number"
                              min="0"
                              required
                              value={fakeBalance}
                              onChange={(e) => setFakeBalance(e.target.value)}
                              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-amber-300 font-mono font-black focus:outline-none focus:border-amber-400"
                              dir="ltr"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] text-emerald-300 font-bold block mb-1">
                              سود ساعتی نمایشی (+FOX/hr)
                            </label>
                            <input
                              type="number"
                              min="0"
                              required
                              value={fakeProfitPerHour}
                              onChange={(e) => setFakeProfitPerHour(e.target.value)}
                              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-emerald-400 font-mono font-bold focus:outline-none focus:border-emerald-400"
                              dir="ltr"
                            />
                          </div>
                        </div>

                        {/* Quick Balance Presets */}
                        <div className="space-y-1.5">
                          <span className="text-[10px] text-slate-400 font-bold block">
                            انتخاب سریع مقدار سکه ممبر فیک:
                          </span>
                          <div className="grid grid-cols-4 gap-1.5 text-[10px] font-black" dir="ltr">
                            {[
                              { label: '100K FOX', coins: 100000, pph: 8500 },
                              { label: '500K FOX', coins: 500000, pph: 24000 },
                              { label: '1M FOX', coins: 1000000, pph: 48000 },
                              { label: '5M FOX', coins: 5000000, pph: 145000 },
                              { label: '15M FOX', coins: 15000000, pph: 360000 },
                              { label: '50M FOX', coins: 50000000, pph: 820000 },
                              { label: '150M FOX', coins: 150000000, pph: 1950000 },
                            ].map((preset) => (
                              <button
                                key={preset.label}
                                type="button"
                                onClick={() => {
                                  setFakeBalance(String(preset.coins));
                                  setFakeProfitPerHour(String(preset.pph));
                                  sound.playTap();
                                }}
                                className="py-1.5 rounded-lg bg-slate-950 hover:bg-amber-500/20 border border-slate-800 hover:border-amber-500/40 text-amber-300 transition cursor-pointer"
                              >
                                {preset.label}
                              </button>
                            ))}
                            <button
                              type="button"
                              onClick={() => {
                                const beatTop1 = currentTop1Balance + Math.floor(25000 + Math.random() * 125000);
                                setFakeBalance(String(beatTop1));
                                setFakeProfitPerHour(String(Math.max(50000, Math.floor(beatTop1 * 0.025))));
                                sound.playCoin();
                              }}
                              className="py-1.5 rounded-lg bg-gradient-to-r from-amber-500/30 to-orange-500/30 hover:from-amber-500/40 hover:to-orange-500/40 border border-amber-400/50 text-amber-200 flex items-center justify-center gap-1 transition cursor-pointer"
                              title="تنظیم سکه بالاتر از نفر اول فعلی رنک"
                            >
                              <Crown className="w-3 h-3 text-amber-400" />
                              <span>نفر اول (#1)</span>
                            </button>
                          </div>
                        </div>

                        {/* Level Selector & Live Rank Preview */}
                        <div className="grid grid-cols-2 gap-2 items-center pt-1">
                          <div>
                            <label className="text-[10px] text-slate-300 font-bold block mb-1">
                              لول نمایشی پلیر در رنک
                            </label>
                            <select
                              value={fakeCustomLevel}
                              onChange={(e) => setFakeCustomLevel(e.target.value)}
                              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-2 text-[11px] text-white focus:outline-none focus:border-amber-400"
                              dir="ltr"
                            >
                              <option value="auto">
                                Auto ({previewLevelObj.name} - Lvl {previewLevelObj.level})
                              </option>
                              {PLAYER_LEVELS.map((lvl) => (
                                <option key={lvl.level} value={String(lvl.level)}>
                                  Level {lvl.level}: {lvl.name}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div className="p-2 rounded-xl bg-slate-950/90 border border-amber-500/30 text-center">
                            <span className="text-[9px] text-slate-400 block">جایگاه پیش‌بینی‌شده در رنک کل:</span>
                            <span className="text-xs font-black text-amber-400 block mt-0.5">
                              رتبه #{predictedRank} در جدول ({previewLevelObj.name})
                            </span>
                          </div>
                        </div>

                        <button
                          type="submit"
                          disabled={isSavingAdminData}
                          className="w-full py-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-xs rounded-xl shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 transition active:scale-95 cursor-pointer disabled:opacity-50"
                        >
                          <UserPlus className="w-4 h-4" />
                          <span>
                            {isSavingAdminData
                              ? 'در حال ذخیره در رنک...'
                              : editingFakeId
                              ? 'ذخیره تغییرات ممبر فیک در رنک'
                              : 'افزودن فوری ممبر فیک به رنک'}
                          </span>
                        </button>
                      </form>

                      {/* 1-Click Bulk Realistic Fake Members Generator */}
                      <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-500/15 via-slate-900 to-slate-900 border border-emerald-500/35 space-y-3" dir="rtl">
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="text-[10px] text-emerald-400 font-black block">
                              ⚡ ساخت گروهی و هوشمند ممبر فیک طبیعی
                            </span>
                            <h5 className="font-black text-xs text-white mt-0.5">
                              افزودن چند ممبر فیک با اسامی و سکه‌های کاملاً طبیعی با ۱ کلیک
                            </h5>
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-1.5 bg-slate-950/80 p-1 rounded-xl border border-slate-800 text-[10px] font-bold">
                          <button
                            type="button"
                            onClick={() => setBulkTier('mid')}
                            className={`py-1.5 rounded-lg transition cursor-pointer ${
                              bulkTier === 'mid'
                                ? 'bg-amber-500 text-slate-950 font-black'
                                : 'text-slate-400 hover:text-white'
                            }`}
                          >
                            🥉 متوسط (25K - 450K)
                          </button>
                          <button
                            type="button"
                            onClick={() => setBulkTier('pro')}
                            className={`py-1.5 rounded-lg transition cursor-pointer ${
                              bulkTier === 'pro'
                                ? 'bg-amber-500 text-slate-950 font-black'
                                : 'text-slate-400 hover:text-white'
                            }`}
                          >
                            🥇 حرفه‌ای (450K - 12M)
                          </button>
                          <button
                            type="button"
                            onClick={() => setBulkTier('whale')}
                            className={`py-1.5 rounded-lg transition cursor-pointer ${
                              bulkTier === 'whale'
                                ? 'bg-amber-500 text-slate-950 font-black'
                                : 'text-slate-400 hover:text-white'
                            }`}
                          >
                            💎 نهنگ‌ها (12M - 180M)
                          </button>
                        </div>

                        <div className="grid grid-cols-3 gap-2">
                          {[5, 10, 20].map((cnt) => (
                            <button
                              key={cnt}
                              type="button"
                              disabled={isSavingAdminData}
                              onClick={() => handleGenerateBulkFakeMembers(cnt)}
                              className="py-2.5 px-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 font-black text-xs flex items-center justify-center gap-1 transition active:scale-95 cursor-pointer disabled:opacity-50"
                            >
                              <PlusCircle className="w-3.5 h-3.5" />
                              <span>+{cnt} ممبر فیک</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Active Fake Members List with Live Rank & Controls */}
                      <div className="space-y-2.5" dir="rtl">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-black text-white">
                            📋 لیست ممبرهای فیک فعال در رنک ({adminFakeMembers.length} مورد)
                          </span>
                          {adminFakeMembers.length > 0 && (
                            <button
                              type="button"
                              onClick={() => setConfirmClearAllFakes(true)}
                              className="px-2.5 py-1 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 text-[10px] font-black flex items-center gap-1 transition cursor-pointer"
                            >
                              <Trash2 className="w-3 h-3" />
                              <span>حذف همه فیک‌ها</span>
                            </button>
                          )}
                        </div>

                        {confirmClearAllFakes && (
                          <div className="p-3 rounded-2xl bg-rose-500/20 border border-rose-500/40 space-y-2 text-xs">
                            <p className="font-bold text-rose-200">
                              آیا مطمئن هستید که می‌خواهید تمام {adminFakeMembers.length} ممبر فیک نمایشی را از جدول رنک پاک کنید؟ (کاربران واقعی دست‌نخورده باقی می‌مانند)
                            </p>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={handleClearAllFakeMembers}
                                className="flex-1 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-black cursor-pointer"
                              >
                                بله، حذف همه فیک‌ها
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmClearAllFakes(false)}
                                className="flex-1 py-1.5 rounded-xl bg-slate-800 text-slate-300 font-bold cursor-pointer"
                              >
                                انصراف
                              </button>
                            </div>
                          </div>
                        )}

                        {adminFakeMembers.length > 3 && (
                          <div className="relative" dir="ltr">
                            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                            <input
                              type="text"
                              placeholder="جستجو در ممبرهای فیک بر اساس نام یا یوزرنیم..."
                              value={fakeSearchQuery}
                              onChange={(e) => setFakeSearchQuery(e.target.value)}
                              className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                            />
                          </div>
                        )}

                        {filteredFakes.length === 0 ? (
                          <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 text-center space-y-1.5">
                            <Trophy className="w-7 h-7 text-slate-600 mx-auto" />
                            <p className="text-xs font-bold text-slate-300">
                              هنوز ممبر فیک نمایشی به رنک اضافه نشده است.
                            </p>
                            <p className="text-[10px] text-slate-400">
                              از فرم بالا به صورت تکی یا با دکمه‌های +5 و +10 ممبرهای فیک طبیعی به رنک اضافه کنید.
                            </p>
                          </div>
                        ) : (
                          <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1" dir="ltr">
                            {filteredFakes.map((fm) => {
                              const liveRank = rankById.get(fm.id) || 1;
                              return (
                                <div
                                  key={fm.id}
                                  className="p-3 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-amber-500/40 transition space-y-2"
                                >
                                  <div className="flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-2.5 min-w-0">
                                      <span
                                        className={`px-2 py-1 rounded-xl font-black text-xs shrink-0 ${
                                          liveRank === 1
                                            ? 'bg-amber-400 text-slate-950'
                                            : liveRank === 2
                                            ? 'bg-slate-300 text-slate-950'
                                            : liveRank === 3
                                            ? 'bg-amber-700 text-amber-100'
                                            : 'bg-slate-800 text-amber-300 border border-slate-700'
                                        }`}
                                      >
                                        #{liveRank}
                                      </span>
                                      <div className="min-w-0">
                                        <div className="flex items-center gap-1.5">
                                          <span className="font-black text-xs text-white truncate">
                                            {fm.displayName}
                                          </span>
                                          <span className="px-1.5 py-0.5 rounded bg-purple-500/20 border border-purple-500/30 text-purple-300 text-[8px] font-black">
                                            FAKE (فقط در مدیریت)
                                          </span>
                                        </div>
                                        <div className="text-[10px] text-slate-400 font-mono truncate">
                                          @{fm.username} • Lvl {fm.level} ({fm.levelName})
                                        </div>
                                      </div>
                                    </div>

                                    <div className="text-right shrink-0">
                                      <div className="text-xs font-black text-amber-400">
                                        {Math.floor(fm.balance).toLocaleString('en-US')} FOX
                                      </div>
                                      <div className="text-[10px] text-emerald-400 font-bold">
                                        +{Math.floor(fm.profitPerHour).toLocaleString('en-US')}/hr
                                      </div>
                                    </div>
                                  </div>

                                  {/* Quick Inline Controls for each Fake Member */}
                                  <div className="flex items-center justify-between gap-1.5 pt-1.5 border-t border-slate-800/80">
                                    <div className="flex items-center gap-1">
                                      <button
                                        type="button"
                                        disabled={isSavingAdminData}
                                        onClick={() => handleQuickAdjustFakeMemberCoins(fm.id, 100000)}
                                        className="px-2 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 text-[10px] font-black cursor-pointer"
                                      >
                                        +100K
                                      </button>
                                      <button
                                        type="button"
                                        disabled={isSavingAdminData}
                                        onClick={() => handleQuickAdjustFakeMemberCoins(fm.id, 1000000)}
                                        className="px-2 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 text-[10px] font-black cursor-pointer"
                                      >
                                        +1M
                                      </button>
                                      <button
                                        type="button"
                                        disabled={isSavingAdminData}
                                        onClick={() => handleQuickAdjustFakeMemberCoins(fm.id, -100000)}
                                        className="px-2 py-1 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 text-[10px] font-black cursor-pointer"
                                      >
                                        -100K
                                      </button>
                                    </div>

                                    <div className="flex items-center gap-1.5">
                                      <button
                                        type="button"
                                        onClick={() => handleEditFakeMemberClick(fm)}
                                        className="px-2.5 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500/30 border border-amber-500/30 text-amber-300 text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                                      >
                                        <Edit3 className="w-3 h-3" />
                                        <span>ویرایش</span>
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleDeleteFakeMember(fm)}
                                        className="px-2.5 py-1 rounded-lg bg-rose-500/15 hover:bg-rose-500/30 border border-rose-500/30 text-rose-300 text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                                      >
                                        <Trash2 className="w-3 h-3" />
                                        <span>حذف</span>
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </>
                  );
                })()}
              </div>
            )}

            {/* TAB: CARDS MANAGER (ADD / EDIT / DELETE PROFIT CARDS) */}
            {activeTab === 'cards' && (
              <div className="space-y-4 animate-fade-in">
                {/* Add / Edit Card Form */}
                <form
                  onSubmit={handleSaveCardForm}
                  className="p-4 rounded-2xl bg-gradient-to-br from-amber-500/15 via-slate-900 to-slate-900 border border-amber-500/40 space-y-3 shadow-lg"
                >
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <div>
                      <span className="text-[10px] uppercase tracking-wider text-amber-400 font-black block">
                        {editingCardId ? '✏️ Edit Upgrade Card' : '➕ Add New Profit Card'}
                      </span>
                      <h4 className="font-black text-xs text-white mt-0.5">
                        {editingCardId ? `Editing: ${newCardName}` : 'Create a new card to boost hourly profit or tap power'}
                      </h4>
                    </div>
                    {editingCardId && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingCardId(null);
                          setNewCardName('');
                          setNewCardDesc('');
                        }}
                        className="px-2 py-1 rounded-lg bg-slate-800 text-slate-300 text-[10px] font-bold hover:text-white cursor-pointer"
                      >
                        Cancel Edit
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div className="col-span-2">
                      <label className="text-[10px] text-slate-400 font-bold block mb-1">
                        Card Name
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Fox Quantum Mine"
                        value={newCardName}
                        onChange={(e) => setNewCardName(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 font-bold block mb-1">
                        Icon / Emoji
                      </label>
                      <input
                        type="text"
                        placeholder="🚀"
                        value={newCardIcon}
                        onChange={(e) => setNewCardIcon(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-center text-white focus:outline-none focus:border-amber-400"
                      />
                    </div>
                  </div>

                  {/* Quick Emoji Picker */}
                  <div className="flex items-center gap-1 flex-wrap">
                    <span className="text-[9px] text-slate-400 mr-1">Quick Icons:</span>
                    {['🚀', '💎', '👑', '⚡', '🔥', '🏦', '🏛️', '🪐', '🌌', '🤖', '💻', '🌋', '🐳', '🎮'].map((emo) => (
                      <button
                        key={emo}
                        type="button"
                        onClick={() => setNewCardIcon(emo)}
                        className={`w-6 h-6 rounded-lg text-xs flex items-center justify-center border transition cursor-pointer ${
                          newCardIcon === emo
                            ? 'bg-amber-500/30 border-amber-400 scale-110'
                            : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        {emo}
                      </button>
                    ))}
                  </div>

                  <div>
                    <label className="text-[10px] text-slate-400 font-bold block mb-1">
                      Description
                    </label>
                    <input
                      type="text"
                      placeholder="Short description of the card..."
                      value={newCardDesc}
                      onChange={(e) => setNewCardDesc(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-slate-400 font-bold block mb-1">
                        Category
                      </label>
                      <select
                        value={newCardCategory}
                        onChange={(e) => setNewCardCategory(e.target.value as any)}
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                      >
                        <option value="passive">Enterprises (Hourly Profit)</option>
                        <option value="special">Clan & VIP (Special Cards)</option>
                        <option value="tap">Tapping (Tap Power & Energy)</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 font-bold block mb-1">
                        Benefit Type
                      </label>
                      <select
                        value={newCardBenefitType}
                        onChange={(e) => setNewCardBenefitType(e.target.value as any)}
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                      >
                        <option value="profit_per_hour">Hourly Profit (FOX/hr)</option>
                        <option value="tap_power">Tap Power (+Tap)</option>
                        <option value="max_energy">Max Energy (+Max Energy)</option>
                        <option value="energy_regen">Energy Regen (+Regen/s)</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-amber-300 font-bold block mb-1">
                        Base Price (FOX)
                      </label>
                      <input
                        type="number"
                        min="1"
                        required
                        value={newCardBasePrice}
                        onChange={(e) => setNewCardBasePrice(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-amber-300 font-mono font-bold focus:outline-none focus:border-amber-400"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-emerald-300 font-bold block mb-1">
                        Benefit Amount
                      </label>
                      <input
                        type="number"
                        min="1"
                        required
                        value={newCardBenefit}
                        onChange={(e) => setNewCardBenefit(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-emerald-400 font-mono font-bold focus:outline-none focus:border-emerald-400"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-slate-400 font-bold block mb-1">
                        Required Player Level (1 - 10)
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="10"
                        required
                        value={newCardLevelReq}
                        onChange={(e) => setNewCardLevelReq(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-amber-400"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 font-bold block mb-1">
                        Price Multiplier per Level (e.g. 1.45)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="1.05"
                        max="3"
                        required
                        value={newCardMultiplier}
                        onChange={(e) => setNewCardMultiplier(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-amber-400"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isSavingAdminData}
                    className="w-full py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-xs rounded-xl shadow-lg shadow-amber-500/20 flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer"
                  >
                    <Save className="w-4 h-4" />
                    <span>
                      {isSavingAdminData
                        ? 'Saving...'
                        : editingCardId
                        ? 'Update Card'
                        : 'Add Card to Game'}
                    </span>
                  </button>
                </form>

                {/* Filter Existing Cards */}
                <div className="flex items-center justify-between gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800 text-[10px] font-bold">
                  {(['all', 'passive', 'special', 'tap'] as const).map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setCardFilterCat(cat)}
                      className={`flex-1 py-1.5 rounded-lg transition cursor-pointer ${
                        cardFilterCat === cat
                          ? 'bg-amber-500 text-slate-950 font-black'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {cat === 'all'
                        ? 'All Cards'
                        : cat === 'passive'
                        ? 'Enterprises'
                        : cat === 'special'
                        ? 'Clan / VIP'
                        : 'Tapping'}
                    </button>
                  ))}
                </div>

                {/* Existing Cards List */}
                <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
                  {adminUpgrades
                    .filter((u) => u.category !== 'gift')
                    .filter((u) => (cardFilterCat === 'all' ? true : u.category === cardFilterCat))
                    .map((card) => (
                      <div
                        key={card.id}
                        className="p-3 rounded-2xl bg-slate-900/90 border border-slate-800 flex items-center justify-between gap-2"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-sm">{card.icon.length <= 4 ? card.icon : '⚡'}</span>
                            <span className="font-black text-xs text-white">{card.name}</span>
                            <span className="px-1.5 py-0.5 text-[9px] font-bold bg-slate-800 text-amber-300 border border-slate-700 rounded">
                              Lvl {card.levelRequirement}
                            </span>
                            <span className="px-1.5 py-0.5 text-[9px] font-bold bg-indigo-500/15 text-indigo-300 rounded uppercase">
                              {card.category}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 mt-1 text-[10px]">
                            <span className="text-amber-400 font-bold">
                              Price: {card.basePrice.toLocaleString('en-US')} FOX
                            </span>
                            <span className="text-emerald-400 font-bold">
                              Yield: +{card.baseBenefit.toLocaleString('en-US')}{' '}
                              {card.benefitType === 'profit_per_hour' ? 'FOX/hr' : card.benefitType}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleEditCardClick(card)}
                            className="p-2 rounded-xl bg-amber-500/15 hover:bg-amber-500/30 border border-amber-500/30 text-amber-300 transition cursor-pointer"
                            title="Edit Card"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteCardClick(card)}
                            className="p-2 rounded-xl bg-rose-500/15 hover:bg-rose-500/30 border border-rose-500/30 text-rose-300 transition cursor-pointer"
                            title="Delete Card"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* TAB: FOX GIFTS PRICING & PROFIT MANAGER */}
            {activeTab === 'gifts' && (
              <div className="space-y-3.5 animate-fade-in">
                <div className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-500/15 via-purple-500/10 to-slate-900 border border-amber-500/30">
                  <h4 className="font-black text-xs text-amber-300 flex items-center gap-1.5">
                    <Gift className="w-4 h-4" />
                    <span>Telegram Fox Gifts Pricing (Telegram Stars ★) & Yield</span>
                  </h4>
                  <p className="text-[11px] text-slate-300 mt-1 leading-relaxed">
                    Customize the Telegram Stars cost (★ Stars), hourly mining yield (FOX/hr), and required player level for each collectible Fox Gift.
                  </p>
                </div>

                <div className="space-y-2.5 max-h-[470px] overflow-y-auto pr-1">
                  {adminUpgrades
                    .filter((u) => u.category === 'gift')
                    .map((gift) => (
                      <div
                        key={gift.id}
                        className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-2.5"
                      >
                        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-sm">🦊</span>
                              <span className="font-black text-xs text-white">{gift.name}</span>
                              <span className="text-[10px] font-mono text-slate-500">({gift.id})</span>
                            </div>
                            <p className="text-[10px] text-slate-400 mt-0.5 line-clamp-1">{gift.description}</p>
                          </div>
                          <button
                            type="button"
                            disabled={isSavingAdminData}
                            onClick={() => handleSaveFoxGift(gift)}
                            className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-[11px] flex items-center gap-1 shadow transition active:scale-95 cursor-pointer shrink-0"
                          >
                            <Save className="w-3.5 h-3.5" />
                            <span>Save</span>
                          </button>
                        </div>

                        <div className="grid grid-cols-3 gap-2">
                          <div>
                            <label className="text-[9px] text-yellow-300 font-bold block mb-1">
                              Cost (★ Telegram Stars)
                            </label>
                            <input
                              type="number"
                              min="1"
                              value={gift.basePrice}
                              onChange={(e) =>
                                updateLocalGiftField(gift.id, 'basePrice', Math.max(1, Number(e.target.value) || 0))
                              }
                              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-yellow-300 font-mono font-bold focus:outline-none focus:border-amber-400"
                            />
                          </div>
                          <div>
                            <label className="text-[9px] text-emerald-300 font-bold block mb-1">
                              Hourly Yield (FOX/hr)
                            </label>
                            <input
                              type="number"
                              min="1"
                              value={gift.baseBenefit}
                              onChange={(e) =>
                                updateLocalGiftField(gift.id, 'baseBenefit', Math.max(1, Number(e.target.value) || 0))
                              }
                              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-emerald-400 font-mono font-bold focus:outline-none focus:border-emerald-400"
                            />
                          </div>
                          <div>
                            <label className="text-[9px] text-slate-400 font-bold block mb-1">
                              Req. Level (1-10)
                            </label>
                            <input
                              type="number"
                              min="1"
                              max="10"
                              value={gift.levelRequirement}
                              onChange={(e) =>
                                updateLocalGiftField(
                                  gift.id,
                                  'levelRequirement',
                                  Math.max(1, Math.min(10, Number(e.target.value) || 1))
                                )
                              }
                              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-amber-400"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* TAB: LUCKY WHEEL PRIZES EDITOR */}
            {activeTab === 'wheel' && (
              <div className="space-y-3.5 animate-fade-in">
                <div className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-slate-900 border border-amber-500/30 flex items-center justify-between gap-2">
                  <div>
                    <h4 className="font-black text-xs text-amber-300 flex items-center gap-1.5">
                      <Compass className="w-4 h-4" />
                      <span>Lucky Wheel Prizes & Odds Configuration</span>
                    </h4>
                    <p className="text-[10px] text-slate-300 mt-0.5">
                      Customize the reward amount, prize type, wheel slice labels, and drop probability weight for all 8 slices.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleResetWheelDefault}
                    className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-bold shrink-0 cursor-pointer"
                  >
                    Reset Defaults
                  </button>
                </div>

                {(() => {
                  const totalWeight = adminWheelPrizes.reduce((s, p) => s + (Number(p.weight) || 1), 0);
                  return (
                    <div className="space-y-2.5 max-h-[410px] overflow-y-auto pr-1">
                      {adminWheelPrizes.map((slice, idx) => {
                        const chancePct = totalWeight > 0 ? (((Number(slice.weight) || 1) / totalWeight) * 100).toFixed(1) : '12.5';
                        return (
                          <div
                            key={slice.id}
                            className="p-3 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-2"
                          >
                            <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
                              <div className="flex items-center gap-2">
                                <span
                                  className="w-5 h-5 rounded-lg flex items-center justify-center text-[10px] font-black text-slate-950"
                                  style={{ backgroundColor: slice.accentColor }}
                                >
                                  #{idx + 1}
                                </span>
                                <span className="font-black text-xs text-white">{slice.shortLabel}</span>
                                <span className="text-[10px] text-amber-300 font-bold">({slice.label})</span>
                              </div>
                              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                                Chance: {chancePct}%
                              </span>
                            </div>

                            <div className="grid grid-cols-3 gap-2">
                              <div>
                                <label className="text-[9px] text-slate-400 font-bold block mb-1">
                                  Reward Type
                                </label>
                                <select
                                  value={slice.type}
                                  onChange={(e) => updateWheelPrizeField(idx, 'type', e.target.value)}
                                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-2 py-1.5 text-[11px] text-white focus:outline-none focus:border-amber-400"
                                >
                                  <option value="coins">🪙 FOX Coins</option>
                                  <option value="full_energy">⚡ Full Energy</option>
                                  <option value="turbo">🔥 Turbo (Sec)</option>
                                </select>
                              </div>
                              <div>
                                <label className="text-[9px] text-amber-300 font-bold block mb-1">
                                  Amount
                                </label>
                                <input
                                  type="number"
                                  min="1"
                                  value={slice.amount}
                                  onChange={(e) =>
                                    updateWheelPrizeField(idx, 'amount', Math.max(1, Number(e.target.value) || 1))
                                  }
                                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-amber-300 font-mono font-bold focus:outline-none focus:border-amber-400"
                                />
                              </div>
                              <div>
                                <label className="text-[9px] text-emerald-300 font-bold block mb-1">
                                  Drop Weight
                                </label>
                                <input
                                  type="number"
                                  step="0.5"
                                  min="0.1"
                                  value={slice.weight}
                                  onChange={(e) =>
                                    updateWheelPrizeField(idx, 'weight', Math.max(0.1, Number(e.target.value) || 1))
                                  }
                                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-emerald-400 font-mono font-bold focus:outline-none focus:border-emerald-400"
                                />
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="text-[9px] text-slate-400 font-bold block mb-1">
                                  Wheel Slice Text (Short Label)
                                </label>
                                <input
                                  type="text"
                                  value={slice.shortLabel}
                                  onChange={(e) => updateWheelPrizeField(idx, 'shortLabel', e.target.value)}
                                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-amber-400"
                                />
                              </div>
                              <div>
                                <label className="text-[9px] text-slate-400 font-bold block mb-1">
                                  Full Reward Title
                                </label>
                                <input
                                  type="text"
                                  value={slice.label}
                                  onChange={(e) => {
                                    updateWheelPrizeField(idx, 'label', e.target.value);
                                    updateWheelPrizeField(idx, 'persianLabel', e.target.value);
                                  }}
                                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-amber-400"
                                />
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}

                <button
                  type="button"
                  disabled={isSavingAdminData}
                  onClick={handleSaveWheelPrizes}
                  className="w-full py-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-xs rounded-xl shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 transition active:scale-95 cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>{isSavingAdminData ? 'Saving...' : 'Save Lucky Wheel Prizes'}</span>
                </button>
              </div>
            )}

            {/* TAB 1: TELEGRAM WEBHOOK */}
            {activeTab === 'webhook' && (
              <div className="space-y-4">
                {/* Notification alert */}
                {notification && (
                  <div
                    className={`p-3 rounded-xl text-xs flex items-start gap-2.5 ${
                      notification.type === 'success'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                    }`}
                  >
                    {notification.type === 'success' ? (
                      <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400 mt-0.5" />
                    ) : (
                      <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
                    )}
                    <span className="flex-1 leading-snug">{notification.message}</span>
                  </div>
                )}

                {/* Current Status Card */}
                <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 text-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      Webhook Status
                    </span>
                    {serverConfig?.isConfigured ? (
                      <span className="flex items-center gap-1 text-[10px] font-black text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                        <CheckCircle2 className="w-3 h-3" /> ACTIVE
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-[10px] font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                        NOT REGISTERED
                      </span>
                    )}
                  </div>

                  {serverConfig?.botUsername && (
                    <div className="flex justify-between py-1 border-t border-slate-800/80">
                      <span className="text-slate-400">Telegram Bot</span>
                      <a
                        href={`https://t.me/${serverConfig.botUsername}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-sky-400 font-bold flex items-center gap-1 hover:underline"
                      >
                        @{serverConfig.botUsername}
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  )}

                  {serverConfig?.webhookInfo?.url && (
                    <div className="flex flex-col py-1 border-t border-slate-800/80">
                      <span className="text-slate-400 text-[10px]">Registered Webhook URL</span>
                      <span className="text-emerald-400 font-mono text-[11px] break-all mt-0.5">
                        {serverConfig.webhookInfo.url}
                      </span>
                    </div>
                  )}

                  {serverConfig?.webhookInfo?.pendingUpdateCount !== undefined && (
                    <div className="flex justify-between py-1 border-t border-slate-800/80">
                      <span className="text-slate-400">Pending Updates</span>
                      <span className="text-slate-200 font-bold">
                        {serverConfig.webhookInfo.pendingUpdateCount}
                      </span>
                    </div>
                  )}

                  {serverConfig?.webhookInfo?.lastErrorMessage && (
                    <div className="p-2 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-[11px]">
                      <strong>Last Error:</strong> {serverConfig.webhookInfo.lastErrorMessage}
                    </div>
                  )}
                </div>

                {/* 1-CLICK AUTOMATIC BOT SETUP & MINI APP LAUNCH */}
                <div className="bg-gradient-to-br from-amber-500/20 via-slate-900 to-sky-950/40 border-2 border-amber-500/60 rounded-3xl p-4 shadow-xl relative overflow-hidden">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
                        <Zap className="w-4 h-4 fill-amber-400" />
                      </div>
                      <div>
                        <h4 className="font-black text-sm text-slate-100 flex items-center gap-1.5">
                          <span>1-Click Automatic Bot Setup</span>
                          <span className="text-[9px] bg-amber-500/20 text-amber-300 border border-amber-500/40 px-1.5 py-0.5 rounded font-bold">AUTO</span>
                        </h4>
                        <span className="text-[10px] text-slate-400">Instant webhook + Mini App Menu Button</span>
                      </div>
                    </div>
                  </div>

                  <p className="text-xs text-slate-300 mt-1 mb-3 leading-relaxed">
                    Paste your Telegram Bot Token from <strong className="text-sky-400">@BotFather</strong>. The app automatically registers the webhook, equips the bot with the <strong>"Play FOXCOIN 🦊"</strong> Mini App launch button, and starts the bot!
                  </p>

                  {/* Auto Token Input with Instant Paste */}
                  <div className="space-y-2.5">
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Paste Bot Token (e.g. 123456789:AAH...)"
                        value={autoTokenInput}
                        onChange={(e) => setAutoTokenInput(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700/90 rounded-2xl px-3.5 py-3 pr-20 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 font-mono shadow-inner"
                      />
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            const clip = await navigator.clipboard.readText();
                            if (clip && clip.trim()) {
                              setAutoTokenInput(clip.trim());
                              sound.playTap();
                            }
                          } catch {}
                        }}
                        className="absolute right-2 top-1/2 -translate-y-1/2 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-750 text-amber-400 font-bold text-[11px] rounded-xl border border-slate-700 transition cursor-pointer"
                      >
                        Paste
                      </button>
                    </div>

                    {/* Primary 1-Click Launch Button */}
                    <button
                      type="button"
                      onClick={() => handleAutoSetup()}
                      disabled={isAutoSettingUp}
                      className="w-full py-3.5 px-4 bg-gradient-to-r from-amber-400 via-orange-500 to-amber-500 hover:from-amber-300 hover:to-orange-400 text-slate-950 font-black text-xs rounded-2xl shadow-xl shadow-amber-500/25 transition active:scale-95 flex items-center justify-center gap-2 cursor-pointer border border-amber-300 disabled:opacity-50"
                    >
                      {isAutoSettingUp ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
                          <span>Activating Bot & Mini App...</span>
                        </>
                      ) : (
                        <>
                          <Play className="w-4 h-4 fill-slate-950 text-slate-950" />
                          <span>Activate Bot & Launch Mini App</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Success Celebration Card with Direct Links */}
                  {autoSetupResult && (
                    <div className="mt-3.5 p-3.5 rounded-2xl bg-emerald-950/80 border border-emerald-500/60 text-xs space-y-2 animate-in fade-in">
                      <div className="flex items-center gap-2 text-emerald-400 font-black">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span>Bot & Mini App are Live!</span>
                      </div>

                      <div className="text-[11px] text-slate-300 space-y-1 pt-1 border-t border-emerald-900/60">
                        <div>• <strong>Bot Handle:</strong> <span className="text-sky-300 font-bold">@{autoSetupResult.botUsername}</span></div>
                        <div>• <strong>Webhook:</strong> <span className="text-emerald-300">Active & Connected</span></div>
                        <div>• <strong>Menu Button:</strong> <span className="text-emerald-300">"Play FOXCOIN 🦊" Configured</span></div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 pt-2">
                        <a
                          href={autoSetupResult.telegramLink}
                          target="_blank"
                          rel="noreferrer"
                          className="py-2.5 px-3 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-extrabold text-[11px] rounded-xl flex items-center justify-center gap-1.5 shadow-md shadow-sky-600/30 transition text-center cursor-pointer"
                        >
                          <Send className="w-3.5 h-3.5" />
                          <span>Open Bot</span>
                        </a>
                        <a
                          href={autoSetupResult.appUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="py-2.5 px-3 bg-gradient-to-r from-amber-400 to-orange-500 text-slate-950 font-black text-[11px] rounded-xl flex items-center justify-center gap-1.5 shadow-md shadow-orange-500/30 transition text-center cursor-pointer"
                        >
                          <Smartphone className="w-3.5 h-3.5" />
                          <span>Launch App</span>
                        </a>
                      </div>
                    </div>
                  )}
                </div>

                {/* Advanced Manual Settings Divider */}
                <div className="relative flex py-1 items-center">
                  <div className="flex-grow border-t border-slate-800" />
                  <span className="flex-shrink mx-2 text-[10px] text-slate-500 uppercase tracking-wider font-bold">
                    or custom manual configuration
                  </span>
                  <div className="flex-grow border-t border-slate-800" />
                </div>

                {/* Webhook Configuration Form */}
                <form onSubmit={handleConfigureWebhook} className="space-y-3">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-bold text-slate-200 flex items-center gap-1">
                        <Bot className="w-3.5 h-3.5 text-sky-400" />
                        <span>Telegram Bot Token</span>
                      </label>
                      {serverConfig?.hasToken && (
                        <span className="text-[10px] text-emerald-400 font-bold">
                          ✓ Stored ({serverConfig.maskedToken})
                        </span>
                      )}
                    </div>

                    <div className="relative">
                      <input
                        type={showToken ? 'text' : 'password'}
                        placeholder={serverConfig?.hasToken ? 'Enter new token to replace existing' : 'e.g. 123456789:AAH...'}
                        value={botToken}
                        onChange={(e) => setBotToken(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 pr-9 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 font-mono"
                      />
                      <button
                        type="button"
                        onClick={() => setShowToken(!showToken)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                      >
                        {showToken ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-200 flex items-center gap-1 mb-1">
                      <Globe className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Production Webhook URL (HTTPS)</span>
                    </label>
                    <input
                      type="url"
                      placeholder="https://your-domain.app/api/telegram/webhook"
                      value={webhookUrl}
                      onChange={(e) => setWebhookUrl(e.target.value)}
                      required
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 font-mono"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-bold text-slate-200 flex items-center gap-1">
                        <Lock className="w-3.5 h-3.5 text-amber-400" />
                        <span>Webhook Secret Token (Optional)</span>
                      </label>
                      <button
                        type="button"
                        onClick={handleGenerateSecret}
                        className="text-[10px] text-amber-400 hover:underline font-bold"
                      >
                        Generate Random
                      </button>
                    </div>

                    <div className="relative">
                      <input
                        type={showSecret ? 'text' : 'password'}
                        placeholder="X-Telegram-Bot-Api-Secret-Token (1-256 chars)"
                        value={secretToken}
                        onChange={(e) => setSecretToken(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 pr-9 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 font-mono"
                      />
                      <button
                        type="button"
                        onClick={() => setShowSecret(!showSecret)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                      >
                        {showSecret ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  <div className="pt-2 space-y-2">
                    <button
                      type="submit"
                      disabled={actionLoading !== null}
                      className="w-full py-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-xs rounded-xl shadow-lg shadow-amber-500/20 transition active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      <Zap className="w-4 h-4 fill-slate-950" />
                      <span>{actionLoading === 'configure' ? 'Registering with Telegram...' : 'Configure Webhook'}</span>
                    </button>

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={handleCheckStatus}
                        disabled={actionLoading !== null}
                        className="py-2.5 px-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-bold text-xs rounded-xl transition active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${actionLoading === 'status' ? 'animate-spin text-amber-400' : ''}`} />
                        <span>Check Status</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setShowDeleteConfirm(true)}
                        disabled={actionLoading !== null || !serverConfig?.isConfigured}
                        className="py-2.5 px-3 bg-slate-800 hover:bg-rose-900/40 border border-slate-700 hover:border-rose-500/40 text-rose-300 font-bold text-xs rounded-xl transition active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-40"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete Webhook</span>
                      </button>
                    </div>
                  </div>
                </form>

                {showDeleteConfirm && (
                  <div className="p-3.5 rounded-2xl bg-rose-500/15 border border-rose-500/40 space-y-2.5 text-xs animate-fade-in">
                    <div className="flex items-center gap-1.5 font-bold text-rose-300">
                      <ShieldAlert className="w-4 h-4" />
                      <span>Confirm Webhook Deletion</span>
                    </div>
                    <p className="text-[11px] text-slate-300">
                      Are you sure you want to delete the active Telegram webhook? Telegram will stop routing bot updates to this server.
                    </p>
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={handleDeleteWebhook}
                        disabled={actionLoading === 'delete'}
                        className="flex-1 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-black rounded-lg transition"
                      >
                        {actionLoading === 'delete' ? 'Deleting...' : 'Yes, Delete'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowDeleteConfirm(false)}
                        className="flex-1 py-1.5 bg-slate-800 text-slate-300 hover:text-white rounded-lg transition"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: GITHUB & CLOUDFLARE UPLOAD */}
            {activeTab === 'github' && (
              <div className="space-y-3.5">
                {/* Cloudflare banner */}
                <div className="p-3 rounded-2xl bg-sky-500/10 border border-sky-500/30 text-xs">
                  <div className="flex items-center gap-2 text-sky-400 font-bold mb-1">
                    <Cloud className="w-4 h-4" />
                    <span>Cloudflare Pages & GitHub Ready</span>
                  </div>
                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    Automatically create a GitHub repository and push all Fox Coin files, Cloudflare Pages functions (<code className="text-amber-400">functions/api</code>), and <code className="text-amber-400">wrangler.toml</code>.
                  </p>
                </div>

                {/* 1-Click ZIP Download Alternative */}
                <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-amber-300 text-[11px] flex items-center gap-1.5">
                      <Download className="w-3.5 h-3.5 text-amber-400" />
                      <span>Option A: Direct Project Download</span>
                    </span>
                    <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[9px] font-bold">
                      Guaranteed 100%
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-300">
                    If you don't have a GitHub token or encounter any token permission error, download the clean project archive (.ZIP) and drag it into GitHub or Cloudflare Pages:
                  </p>
                  <a
                    href={api.getProjectZipDownloadUrl(adminSecret)}
                    download="foxcoin-project-cloudflare.zip"
                    className="w-full py-2 px-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-xs rounded-xl flex items-center justify-center gap-2 transition active:scale-95 shadow-md text-center cursor-pointer"
                  >
                    <Download className="w-4 h-4 text-slate-950" />
                    <span>Download Project (.ZIP) Archive</span>
                  </a>
                </div>

                {/* Divider */}
                <div className="relative flex py-1 items-center">
                  <div className="flex-grow border-t border-slate-800" />
                  <span className="flex-shrink mx-2 text-[10px] text-slate-500 uppercase tracking-wider font-bold">
                    Option B: 1-Click GitHub API Push
                  </span>
                  <div className="flex-grow border-t border-slate-800" />
                </div>

                {/* Success Card */}
                {githubResult && (
                  <div className="p-4 rounded-2xl bg-emerald-500/15 border border-emerald-500/40 text-xs space-y-2 animate-fade-in">
                    <div className="flex items-center gap-2 text-emerald-300 font-black text-sm">
                      <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                      <span>Uploaded Successfully to GitHub!</span>
                    </div>
                    <p className="text-[11px] text-slate-200">
                      Uploaded <strong>{githubResult.fileCount} project files</strong> directly to branch <strong>main</strong>.
                    </p>
                    <div className="pt-1 flex flex-col gap-1.5">
                      <a
                        href={githubResult.repoUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="py-2 px-3 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold rounded-xl flex items-center justify-center gap-1.5 transition text-center"
                      >
                        <Github className="w-4 h-4" />
                        <span>Open GitHub Repository ({githubResult.repoFullName})</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                      <a
                        href="https://dash.cloudflare.com/?to=/:account/pages/new"
                        target="_blank"
                        rel="noreferrer"
                        className="py-2 px-3 bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 rounded-xl flex items-center justify-center gap-1.5 transition text-center"
                      >
                        <Cloud className="w-4 h-4 text-orange-400" />
                        <span>Deploy in 1-Click on Cloudflare Pages</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </div>
                )}

                {/* Error Card */}
                {githubError && (
                  <div className="p-3 rounded-xl bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs space-y-1.5">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
                      <span className="font-bold">{githubError}</span>
                    </div>
                    <div className="text-[11px] text-slate-300 pl-6 space-y-1">
                      <p>
                        💡 <strong>How to fix:</strong> GitHub requires a <strong>Classic Token</strong> with the <code className="text-amber-300 font-mono">repo</code> scope checked.
                      </p>
                      <a
                        href="https://github.com/settings/tokens/new?scopes=repo&description=FoxCoinMiniApp"
                        target="_blank"
                        rel="noreferrer"
                        className="text-sky-300 underline font-bold inline-flex items-center gap-1"
                      >
                        <span>Click here to create a token with 'repo' scope pre-selected</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                )}

                {/* Upload Form */}
                <form onSubmit={handleUploadToGitHub} className="space-y-3">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-bold text-slate-200 flex items-center gap-1">
                        <Lock className="w-3.5 h-3.5 text-amber-400" />
                        <span>GitHub Personal Access Token (PAT)</span>
                      </label>
                      <a
                        href="https://github.com/settings/tokens/new?scopes=repo&description=FoxCoinMiniApp"
                        target="_blank"
                        rel="noreferrer"
                        className="text-[10px] text-sky-400 hover:underline flex items-center gap-0.5 font-bold"
                      >
                        <span>Create Token with 'repo' scope</span>
                        <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    </div>
                    <div className="relative">
                      <input
                        type={showGithubToken ? 'text' : 'password'}
                        placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                        value={githubToken}
                        onChange={(e) => setGithubToken(e.target.value)}
                        required
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 pr-9 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 font-mono"
                      />
                      <button
                        type="button"
                        onClick={() => setShowGithubToken(!showGithubToken)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                      >
                        {showGithubToken ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                    <span className="text-[10px] text-amber-400/90 mt-1 block">
                      ⚠️ Must be a Classic token with <code className="font-mono bg-slate-800 px-1 py-0.5 rounded text-amber-300">repo</code> checkbox enabled.
                    </span>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-200 flex items-center gap-1 mb-1">
                      <Github className="w-3.5 h-3.5 text-slate-300" />
                      <span>Repository Name</span>
                    </label>
                    <input
                      type="text"
                      placeholder="fox-coin"
                      value={githubRepoName}
                      onChange={(e) => setGithubRepoName(e.target.value)}
                      required
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 font-mono"
                    />
                  </div>

                  <div className="flex items-center justify-between p-2.5 bg-slate-900/80 border border-slate-800 rounded-xl">
                    <span className="text-xs text-slate-300 font-medium">Repository Visibility</span>
                    <button
                      type="button"
                      onClick={() => setGithubIsPrivate(!githubIsPrivate)}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                        githubIsPrivate
                          ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                          : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      }`}
                    >
                      {githubIsPrivate ? 'Private' : 'Public'}
                    </button>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-200 block mb-1">
                      Commit Message
                    </label>
                    <input
                      type="text"
                      value={githubCommitMsg}
                      onChange={(e) => setGithubCommitMsg(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isUploadingGithub}
                    className="w-full py-3 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-black text-xs rounded-xl shadow-lg shadow-sky-600/30 transition active:scale-95 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-2"
                  >
                    <UploadCloud className="w-4 h-4" />
                    <span>{isUploadingGithub ? 'Uploading Project to GitHub...' : '🚀 Automatic Upload to GitHub'}</span>
                  </button>
                </form>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
