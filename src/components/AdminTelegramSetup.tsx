import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  Bot,
  Globe,
  Lock,
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
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { api, GameConfig } from '../utils/api.js';
import { UserGameState, AdminTelegramConfigResponse, UpgradeDefinition, LuckyWheelPrize } from '../types/game.js';
import { UPGRADES, LUCKY_WHEEL_PRIZES } from '../../server/gameConfig.js';
import { sound } from '../utils/audio.js';

export type AdminTabType = 'users' | 'cards' | 'gifts' | 'wheel' | 'webhook' | 'github';

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

  // Tab: 'users' | 'cards' | 'gifts' | 'wheel' | 'webhook' | 'github'
  const [activeTab, setActiveTab] = useState<AdminTabType>(initialTab);

  // Cards, Gifts & Lucky Wheel Admin State
  const [adminUpgrades, setAdminUpgrades] = useState<UpgradeDefinition[]>(
    () => config?.upgrades || [...UPGRADES]
  );
  const [adminWheelPrizes, setAdminWheelPrizes] = useState<LuckyWheelPrize[]>(
    () => config?.wheelPrizes || [...LUCKY_WHEEL_PRIZES]
  );
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

  // Admin Users & Balance Management states
  const [allUsers, setAllUsers] = useState<UserGameState[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState<boolean>(false);
  const [isSyncingAllDb, setIsSyncingAllDb] = useState<boolean>(false);
  const [userSearch, setUserSearch] = useState<string>('');
  const [userActivityFilter, setUserActivityFilter] = useState<'all' | 'active' | 'inactive' | 'referrals'>('all');
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

  // Sync adminUpgrades and adminWheelPrizes when config prop changes
  useEffect(() => {
    if (config?.upgrades) setAdminUpgrades(config.upgrades);
    if (config?.wheelPrizes) setAdminWheelPrizes(config.wheelPrizes);
  }, [config]);

  const notifyConfigUpdate = (nextUpgrades: UpgradeDefinition[], nextWheel: LuckyWheelPrize[]) => {
    setAdminUpgrades(nextUpgrades);
    setAdminWheelPrizes(nextWheel);
    if (onConfigUpdated && config) {
      onConfigUpdated({
        ...config,
        upgrades: nextUpgrades,
        wheelPrizes: nextWheel,
      });
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
            {/* Top 6 Tabs: Users, Cards, Gift Prices, Lucky Wheel, Bot Setup, GitHub */}
            <div className="grid grid-cols-3 gap-1.5 bg-slate-900/90 p-1.5 rounded-2xl border border-slate-800 text-[11px] font-bold">
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
                  const totalInvites = realUsers.reduce((acc, u) => acc + (u.referralCount || 0), 0);
                  const totalTapsAll = realUsers.reduce((acc, u) => acc + (u.totalTaps || 0), 0);

                  return (
                    <div className="grid grid-cols-4 gap-1.5">
                      <div className="p-2 rounded-2xl bg-slate-900/90 border border-slate-800 text-center">
                        <span className="text-[9px] text-slate-400 block">کل کاربران</span>
                        <span className="text-xs font-black text-white block">{realUsers.length} نفر</span>
                        <span className="text-[8px] text-emerald-400 font-bold">
                          {activeCount} فعال / {inactiveCount} غیرفعال
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

                {/* SELECTED USER PERFORMANCE & TOKEN MANAGEMENT DASHBOARD */}
                {(() => {
                  const targetUser = allUsers.find((u) => u.id === selectedUserId) || allUsers[0];
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
                        <div className="text-right shrink-0">
                          <div className="text-xs font-black text-amber-300">
                            {Math.floor(targetUser.balance || 0).toLocaleString('en-US')} FOX
                          </div>
                          <div className="text-[10px] text-emerald-400 font-bold">
                            لول {targetUser.level || 1} ({targetUser.levelName || 'Bronze Fox'})
                          </div>
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

                {/* Activity Filter Tabs (همه / فعال / غیرفعال / دارای رفرال) */}
                <div className="grid grid-cols-4 gap-1 bg-slate-900/90 p-1 rounded-xl border border-slate-800 text-[10px] font-bold">
                  {[
                    { id: 'all', label: 'همه کاربران' },
                    { id: 'active', label: '🟢 فعال‌ها' },
                    { id: 'inactive', label: '⚪ غیرفعال‌ها' },
                    { id: 'referrals', label: '🎁 دارای دعوتی' },
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

                {/* Search Input */}
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="جستجوی کاربر با نام، یوزرنیم، آیدی تلگرام یا کد رفرال..."
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                  />
                </div>

                {/* All Users List with Full Performance Badges */}
                <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
                  {allUsers
                    .filter((u) => {
                      const upCount = Object.values(u.upgrades || {}).filter((lvl) => Number(lvl) > 0).length;
                      const isActive =
                        (u.totalTaps || 0) > 0 ||
                        (u.profitPerHour || 0) > 0 ||
                        upCount > 0 ||
                        (u.balance || 0) > 5000;

                      if (userActivityFilter === 'active' && !isActive) return false;
                      if (userActivityFilter === 'inactive' && isActive) return false;
                      if (userActivityFilter === 'referrals' && !(u.referralCount && u.referralCount > 0)) return false;

                      if (!userSearch.trim()) return true;
                      const q = userSearch.toLowerCase();
                      return (
                        (u.username || '').toLowerCase().includes(q) ||
                        (u.displayName || '').toLowerCase().includes(q) ||
                        (u.id || '').toLowerCase().includes(q) ||
                        String(u.telegramId || '').toLowerCase().includes(q) ||
                        (u.referralCode || '').toLowerCase().includes(q) ||
                        (u.email || '').toLowerCase().includes(q)
                      );
                    })
                    .map((u, idx) => {
                      const isSelected = u.id === (selectedUserId || allUsers[0]?.id);
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
                            isSelected
                              ? 'bg-amber-500/15 border-amber-500/60 shadow-md'
                              : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-[10px] font-black text-amber-400">#{idx + 1}</span>
                                <span className="font-extrabold text-xs text-white truncate">
                                  {u.displayName || u.username}
                                </span>
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
                                @{u.username} • {u.id} • Lvl {u.level} ({u.levelName})
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
