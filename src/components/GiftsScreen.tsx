import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  Check,
  Lock,
  Sparkles,
  Star,
  Share2,
  X,
  ChevronDown,
  TrendingUp,
  ShieldCheck,
  Award,
  Zap,
  Layers,
} from 'lucide-react';
import { UpgradeDefinition, UserGameState } from '../types/game.js';
import { sound } from '../utils/audio.js';
import { TelegramService } from '../utils/telegram.js';
import { api } from '../utils/api.js';
import {
  FoxGiftAvatar,
  FoxCollectionHexBadge,
  getFoxGiftMeta,
  NftRarity,
} from './FoxGiftAvatar.js';

interface GiftsScreenProps {
  user: UserGameState;
  upgrades: UpgradeDefinition[];
  botUsername?: string;
  equippedGiftId: string | null;
  onEquipGift: (giftId: string) => void;
  onPurchaseGift: (upgradeId: string) => Promise<void>;
}

type StatusFilter = 'all' | 'owned' | 'equipped' | 'locked';
type RarityFilter = 'All' | NftRarity;
type SortOption = 'rarity' | 'income' | 'newest' | 'number';

interface CollectionMilestone {
  count: number;
  title: string;
  badgeTitle: string;
  description: string;
}

const COLLECTION_MILESTONES: CollectionMilestone[] = [
  {
    count: 3,
    title: 'Starter',
    badgeTitle: 'Starter Collector',
    description: 'Collect 3 unique Fox NFTs to earn the Starter Collector achievement.',
  },
  {
    count: 7,
    title: 'Explorer',
    badgeTitle: 'Explorer Collector',
    description: 'Collect 7 unique Fox NFTs to unlock the Explorer Collector rank.',
  },
  {
    count: 10,
    title: 'Collector',
    badgeTitle: 'Master Collector',
    description: 'Collect 10 unique Fox NFTs to achieve Master Collector prestige.',
  },
  {
    count: 14,
    title: 'Legendary',
    badgeTitle: 'Legendary Collector',
    description: 'Complete all 14 unique Fox NFTs in the Genesis Vault!',
  },
];

const SORT_LABELS: Record<SortOption, string> = {
  rarity: 'Rarity',
  income: 'Highest passive income',
  newest: 'Newest acquired',
  number: 'Collection number',
};

const RARITY_FILTERS: RarityFilter[] = ['All', 'Common', 'Rare', 'Epic', 'Legendary', 'Mythic'];

function loadAcquiredTimestamps(userId: string): Record<string, number> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(`foxcoin_nft_acquired_${userId}`);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function saveAcquiredTimestamp(userId: string, giftId: string, timestamp: number) {
  if (typeof window === 'undefined') return;
  try {
    const current = loadAcquiredTimestamps(userId);
    current[giftId] = timestamp;
    localStorage.setItem(`foxcoin_nft_acquired_${userId}`, JSON.stringify(current));
  } catch {
    // Ignore storage quota errors
  }
}

export const GiftsScreen: React.FC<GiftsScreenProps> = ({
  user,
  upgrades,
  botUsername = 'FOXCOINBot',
  equippedGiftId,
  onEquipGift,
  onPurchaseGift,
}) => {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [rarityFilter, setRarityFilter] = useState<RarityFilter>('All');
  const [sortBy, setSortBy] = useState<SortOption>('rarity');
  const [isSortMenuOpen, setIsSortMenuOpen] = useState(false);

  const [selectedNftId, setSelectedNftId] = useState<string | null>(null);
  const [selectedMilestone, setSelectedMilestone] = useState<CollectionMilestone | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(
    null
  );
  const [acquiredTimestamps, setAcquiredTimestamps] = useState<Record<string, number>>(() =>
    loadAcquiredTimestamps(user.id)
  );
  const [emblemImgError, setEmblemImgError] = useState(false);

  useEffect(() => {
    setAcquiredTimestamps(loadAcquiredTimestamps(user.id));
  }, [user.id]);

  // Ensure owned items have a deterministic initial timestamp if not yet recorded
  useEffect(() => {
    const existing = loadAcquiredTimestamps(user.id);
    let changed = false;
    upgrades
      .filter((u) => u.category === 'gift')
      .forEach((item, idx) => {
        const ownedQty = user.upgrades[item.id] || 0;
        if (ownedQty > 0 && !existing[item.id]) {
          existing[item.id] = 1700000000000 + idx * 1000;
          changed = true;
        }
      });
    if (changed) {
      setAcquiredTimestamps({ ...existing });
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(`foxcoin_nft_acquired_${user.id}`, JSON.stringify(existing));
        } catch {
          // ignore
        }
      }
    }
  }, [upgrades, user.upgrades, user.id]);

  const showToast = useCallback((text: string, type: 'success' | 'error') => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage((prev) => (prev?.text === text ? null : prev));
    }, 3400);
  }, []);

  // All 14 NFT collectible items from game config
  const nftItems = useMemo(() => {
    return upgrades.filter((u) => u.category === 'gift');
  }, [upgrades]);

  // Real-time collection statistics computed strictly from actual game state
  const collectionStats = useMemo(() => {
    const totalTypes = nftItems.length;
    let uniqueOwnedCount = 0;
    let totalEditionsOwned = 0;
    let totalPassiveIncome = 0;
    let totalBonusPercent = 0;
    let equippedCount = 0;
    let lockedCount = 0;

    for (const item of nftItems) {
      const ownedCount = user.upgrades[item.id] || 0;
      const meta = getFoxGiftMeta(item.id);
      const isLevelLocked = user.level < (item.levelRequirement || 1);

      if (ownedCount > 0) {
        uniqueOwnedCount += 1;
        totalEditionsOwned += ownedCount;
        totalPassiveIncome += item.baseBenefit * ownedCount;
        totalBonusPercent += meta.bonusPercent;
        if (equippedGiftId === item.id) {
          equippedCount += 1;
        }
      } else if (isLevelLocked) {
        lockedCount += 1;
      } else {
        lockedCount += 1;
      }
    }

    const availableTypes = Math.max(0, totalTypes - uniqueOwnedCount);
    const completionPercent =
      totalTypes > 0 ? Math.min(100, Math.round((uniqueOwnedCount / totalTypes) * 100)) : 0;

    return {
      totalTypes,
      uniqueOwnedCount,
      totalEditionsOwned,
      availableTypes,
      totalPassiveIncome,
      totalBonusPercent,
      completionPercent,
      equippedCount,
      lockedCount,
    };
  }, [nftItems, user.upgrades, user.level, equippedGiftId]);

  // Auto-equip first owned collectible if none is equipped yet
  useEffect(() => {
    if (!equippedGiftId && collectionStats.uniqueOwnedCount > 0) {
      const firstOwned = nftItems.find((g) => (user.upgrades[g.id] || 0) > 0);
      if (firstOwned) {
        onEquipGift(firstOwned.id);
      }
    }
  }, [equippedGiftId, collectionStats.uniqueOwnedCount, nftItems, user.upgrades, onEquipGift]);

  // Filtered and sorted NFT list
  const displayedNfts = useMemo(() => {
    const filtered = nftItems.filter((item) => {
      const ownedCount = user.upgrades[item.id] || 0;
      const isOwned = ownedCount > 0;
      const isEquipped = isOwned && equippedGiftId === item.id;
      const meta = getFoxGiftMeta(item.id);

      if (statusFilter === 'owned' && !isOwned) return false;
      if (statusFilter === 'equipped' && !isEquipped) return false;
      if (statusFilter === 'locked' && isOwned) return false;

      if (rarityFilter !== 'All' && meta.rarity !== rarityFilter) return false;

      return true;
    });

    return [...filtered].sort((a, b) => {
      const metaA = getFoxGiftMeta(a.id);
      const metaB = getFoxGiftMeta(b.id);
      const ownedA = user.upgrades[a.id] || 0;
      const ownedB = user.upgrades[b.id] || 0;

      if (sortBy === 'rarity') {
        if (metaB.rarityRank !== metaA.rarityRank) {
          return metaB.rarityRank - metaA.rarityRank;
        }
        return metaA.collectionOrder - metaB.collectionOrder;
      }

      if (sortBy === 'income') {
        const yieldA = ownedA > 0 ? a.baseBenefit * ownedA : a.baseBenefit;
        const yieldB = ownedB > 0 ? b.baseBenefit * ownedB : b.baseBenefit;
        if (yieldB !== yieldA) return yieldB - yieldA;
        return metaB.rarityRank - metaA.rarityRank;
      }

      if (sortBy === 'newest') {
        const timeA = acquiredTimestamps[a.id] || 0;
        const timeB = acquiredTimestamps[b.id] || 0;
        if (timeB !== timeA) return timeB - timeA;
        if (ownedB !== ownedA) return ownedB - ownedA;
        return metaA.collectionOrder - metaB.collectionOrder;
      }

      if (sortBy === 'number') {
        return metaA.collectionOrder - metaB.collectionOrder;
      }

      return 0;
    });
  }, [nftItems, user.upgrades, equippedGiftId, statusFilter, rarityFilter, sortBy, acquiredTimestamps]);

  const selectedNftItem = useMemo(
    () => nftItems.find((item) => item.id === selectedNftId) || null,
    [nftItems, selectedNftId]
  );

  const handleToggleEquip = useCallback(
    (giftId: string, e?: React.MouseEvent) => {
      if (e) e.stopPropagation();
      const owned = (user.upgrades[giftId] || 0) > 0;
      if (!owned) return;

      sound.playUpgrade();
      TelegramService.hapticSelection();
      const meta = getFoxGiftMeta(giftId);

      if (equippedGiftId === giftId) {
        onEquipGift('');
        showToast(`${meta.nftTitle} unequipped.`, 'success');
      } else {
        onEquipGift(giftId);
        showToast(`✨ ${meta.nftTitle} (${meta.collectionNumber}) equipped!`, 'success');
      }
    },
    [user.upgrades, equippedGiftId, onEquipGift, showToast]
  );

  const handleAcquireNft = useCallback(
    async (item: UpgradeDefinition, e?: React.MouseEvent) => {
      if (e) e.stopPropagation();
      if (loadingId) return;

      const reqLevel = item.levelRequirement || 1;
      if (user.level < reqLevel) {
        sound.playError();
        TelegramService.hapticNotification('error');
        showToast(`Requires Player Level ${reqLevel} (You are Lv ${user.level}).`, 'error');
        return;
      }

      const currentOwned = user.upgrades[item.id] || 0;
      const starPrice = Math.floor(
        item.basePrice * Math.pow(item.priceMultiplier, currentOwned)
      );
      const meta = getFoxGiftMeta(item.id);

      setLoadingId(item.id);
      TelegramService.triggerHaptic('medium');

      try {
        try {
          const invoiceRes = await api.createStarsGiftInvoice(item.id);
          if (invoiceRes?.invoiceUrl && TelegramService.isAvailable()) {
            const status = await TelegramService.openStarsInvoice(
              invoiceRes.invoiceUrl,
              undefined,
              { isLiveInvoice: invoiceRes.isLiveInvoice }
            );
            if (status === 'paid') {
              await onPurchaseGift(item.id);
              const now = Date.now();
              saveAcquiredTimestamp(user.id, item.id, now);
              setAcquiredTimestamps(loadAcquiredTimestamps(user.id));
              onEquipGift(item.id);
              sound.playUpgrade();
              TelegramService.hapticNotification('success');
              showToast(
                `🎉 Unlocked ${meta.nftTitle} ${meta.collectionNumber}! (+${item.baseBenefit.toLocaleString('en-US')}/hr)`,
                'success'
              );
              setLoadingId(null);
              return;
            } else if (status !== 'preview') {
              if (status !== 'cancelled') {
                showToast(`Payment status: ${status}`, 'error');
              }
              setLoadingId(null);
              return;
            }
          }
        } catch {
          // Fallback to direct purchase handler in preview / simulation
        }

        await onPurchaseGift(item.id);
        const now = Date.now();
        saveAcquiredTimestamp(user.id, item.id, now);
        setAcquiredTimestamps(loadAcquiredTimestamps(user.id));
        onEquipGift(item.id);
        sound.playUpgrade();
        TelegramService.hapticNotification('success');
        showToast(
          `🎉 Unlocked ${meta.nftTitle} ${meta.collectionNumber} for ${starPrice.toLocaleString('en-US')} Stars!`,
          'success'
        );
      } catch (err: any) {
        sound.playError();
        TelegramService.hapticNotification('error');
        showToast(err.message || 'Could not acquire NFT collectible', 'error');
      } finally {
        setLoadingId(null);
      }
    },
    [loadingId, user.level, user.upgrades, user.id, onPurchaseGift, onEquipGift, showToast]
  );

  const handleShareNft = useCallback(
    (item: UpgradeDefinition, e?: React.MouseEvent) => {
      if (e) e.stopPropagation();
      const meta = getFoxGiftMeta(item.id);
      const cleanBot = botUsername.replace(/^@/, '');
      const refUrl = `https://t.me/${cleanBot}?start=${encodeURIComponent(user.referralCode)}`;
      const shareText = `🦊 Check out my ${meta.rarity} ${meta.nftTitle} (${meta.collectionNumber}) from the ${meta.collectionSeries} in FOXCOIN! Generating +${item.baseBenefit.toLocaleString('en-US')} FOX/hr! ✨`;
      const tgShareUrl = `https://t.me/share/url?url=${encodeURIComponent(refUrl)}&text=${encodeURIComponent(shareText)}`;

      sound.playTap();
      TelegramService.openTelegramLink(tgShareUrl);
    },
    [botUsername, user.referralCode]
  );

  // Rarity-specific card border & badge styling matching the reference screenshot
  const getRarityVisuals = (rarity: NftRarity, isEquipped: boolean) => {
    switch (rarity) {
      case 'Common':
        return {
          cardBorder: isEquipped
            ? 'border-emerald-400 shadow-[0_0_22px_rgba(16,185,129,0.35)]'
            : 'border-emerald-500/55 hover:border-emerald-400/90 shadow-[0_6px_20px_rgba(6,78,59,0.35)]',
          badgeClass:
            'bg-gradient-to-r from-emerald-950/95 to-teal-950/90 border border-emerald-400/80 text-emerald-300 shadow-[0_0_10px_rgba(16,185,129,0.3)]',
          topGlow: 'from-emerald-500/20 via-transparent to-transparent',
          divider: 'border-emerald-500/25',
        };
      case 'Rare':
        return {
          cardBorder: isEquipped
            ? 'border-sky-400 shadow-[0_0_22px_rgba(14,165,233,0.38)]'
            : 'border-sky-500/60 hover:border-sky-400/95 shadow-[0_6px_20px_rgba(12,74,110,0.38)]',
          badgeClass:
            'bg-gradient-to-r from-sky-950/95 to-blue-950/90 border border-sky-400/80 text-sky-300 shadow-[0_0_10px_rgba(14,165,233,0.35)]',
          topGlow: 'from-sky-500/20 via-transparent to-transparent',
          divider: 'border-sky-500/25',
        };
      case 'Epic':
        return {
          cardBorder: isEquipped
            ? 'border-purple-400 shadow-[0_0_24px_rgba(168,85,247,0.42)]'
            : 'border-purple-500/65 hover:border-purple-400/95 shadow-[0_6px_22px_rgba(88,28,135,0.4)]',
          badgeClass:
            'bg-gradient-to-r from-purple-950/95 to-fuchsia-950/90 border border-purple-400/85 text-purple-200 shadow-[0_0_12px_rgba(168,85,247,0.38)]',
          topGlow: 'from-purple-500/25 via-transparent to-transparent',
          divider: 'border-purple-500/30',
        };
      case 'Legendary':
        return {
          cardBorder: isEquipped
            ? 'border-amber-300 shadow-[0_0_26px_rgba(245,158,11,0.48)]'
            : 'border-amber-500/75 hover:border-amber-300 shadow-[0_6px_24px_rgba(120,53,15,0.45)]',
          badgeClass:
            'bg-gradient-to-r from-amber-950/95 to-yellow-950/90 border border-amber-400/90 text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.4)]',
          topGlow: 'from-amber-500/25 via-transparent to-transparent',
          divider: 'border-amber-500/30',
        };
      case 'Mythic':
        return {
          cardBorder: isEquipped
            ? 'border-pink-400 shadow-[0_0_28px_rgba(236,72,153,0.5)]'
            : 'border-pink-500/75 hover:border-pink-400 shadow-[0_6px_26px_rgba(131,24,67,0.48)]',
          badgeClass:
            'bg-gradient-to-r from-pink-950/95 via-fuchsia-950/95 to-indigo-950/90 border border-pink-400/90 text-pink-200 shadow-[0_0_14px_rgba(236,72,153,0.45)]',
          topGlow: 'from-pink-500/25 via-purple-500/10 to-transparent',
          divider: 'border-pink-500/30',
        };
    }
  };

  return (
    <div className="flex-1 flex flex-col px-2.5 sm:px-3 pb-28 pt-1.5 text-white select-none overflow-x-hidden">
      {/* Toast Feedback Banner */}
      {toastMessage && (
        <div
          className={`mb-2.5 p-2.5 rounded-xl border text-xs font-bold flex items-center justify-between shadow-lg animate-fade-in ${
            toastMessage.type === 'success'
              ? 'bg-emerald-950/90 border-emerald-400/60 text-emerald-200'
              : 'bg-rose-950/90 border-rose-400/60 text-rose-200'
          }`}
        >
          <span className="leading-snug">{toastMessage.text}</span>
          <button
            type="button"
            onClick={() => setToastMessage(null)}
            className="text-slate-400 hover:text-white ml-2 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* =====================================================================
          1. MY NFT COLLECTION HERO HEADER + STATS + MILESTONES
         ===================================================================== */}
      <section className="relative rounded-2xl bg-gradient-to-b from-[#13192E]/95 via-[#0C1120]/98 to-[#080B14] border border-amber-500/45 p-3 sm:p-3.5 shadow-[0_10px_32px_rgba(0,0,0,0.75)] overflow-hidden">
        {/* Subtle ambient gold & cyan corner glow */}
        <div className="pointer-events-none absolute -top-12 -left-12 w-40 h-40 rounded-full bg-amber-500/15 blur-2xl" />
        <div className="pointer-events-none absolute -top-10 -right-10 w-36 h-36 rounded-full bg-sky-500/10 blur-2xl" />

        {/* Top Row: Hexagonal Fox Collection Emblem + Title + Description + Progress Bar */}
        <div className="relative z-10 flex items-start gap-2.5 sm:gap-3">
          {/* Large Hexagonal Fox Collection Emblem */}
          <div className="shrink-0 relative">
            {!emblemImgError ? (
              <div className="w-16 h-20 sm:w-20 sm:h-24 rounded-xl overflow-hidden flex items-center justify-center drop-shadow-[0_0_16px_rgba(245,158,11,0.4)]">
                <img
                  src="/assets/nft/collection_emblem.png"
                  alt="My NFT Collection Emblem"
                  onError={() => setEmblemImgError(true)}
                  className="w-full h-full object-contain"
                />
              </div>
            ) : (
              <FoxCollectionHexBadge size="lg" rarity="Legendary" />
            )}
          </div>

          {/* Right Column: Title, Subtitle & Collection Completion Bar */}
          <div className="flex-1 min-w-0">
            <h1 className="text-base sm:text-lg font-black tracking-tight bg-gradient-to-r from-amber-200 via-yellow-300 to-amber-400 bg-clip-text text-transparent drop-shadow-[0_2px_8px_rgba(245,158,11,0.3)] leading-tight">
              My NFT Collection
            </h1>
            <p className="text-[10px] sm:text-[11px] text-slate-300/95 font-medium leading-snug mt-0.5">
              Collect unique Foxes, boost your income and build your legendary collection!
            </p>

            {/* Progress Bar Strip: [Fox Icon + X / 14] [=======] [XX%] */}
            <div className="mt-2 bg-[#080B14]/95 border border-amber-500/35 rounded-full p-1 flex items-center gap-2 shadow-inner">
              <div className="flex items-center gap-1 pl-1.5 pr-1 shrink-0">
                <span className="text-xs leading-none">🦊</span>
                <span className="text-[11px] font-black text-white tabular-nums">
                  {collectionStats.uniqueOwnedCount}{' '}
                  <span className="text-slate-400 font-bold">/ {collectionStats.totalTypes}</span>
                </span>
              </div>

              <div className="flex-1 h-2 bg-[#121829] rounded-full overflow-hidden border border-slate-700/60">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-amber-500 via-yellow-400 to-emerald-400 transition-all duration-500 shadow-[0_0_10px_rgba(251,191,36,0.6)]"
                  style={{
                    width: `${Math.max(
                      collectionStats.uniqueOwnedCount > 0 ? 8 : 0,
                      collectionStats.completionPercent
                    )}%`,
                  }}
                />
              </div>

              <span className="text-[11px] font-black text-amber-300 pr-2 tabular-nums shrink-0">
                {collectionStats.completionPercent}%
              </span>
            </div>
          </div>
        </div>

        {/* 5 Live Collection Stat Boxes (Calculated from Real Application State) */}
        <div className="relative z-10 mt-2.5 grid grid-cols-5 gap-1.5">
          {/* 1. Unique Foxes */}
          <div className="bg-[#0A0F1D]/90 border border-slate-700/70 rounded-xl px-1.5 py-1.5 flex flex-col justify-between min-w-0">
            <span className="text-[8px] sm:text-[9px] font-bold text-slate-400 truncate">
              Unique Foxes
            </span>
            <div className="flex items-center gap-1 mt-0.5">
              <span className="text-[10px] leading-none">🦊</span>
              <span className="text-[10px] sm:text-xs font-black text-white tabular-nums truncate">
                {collectionStats.uniqueOwnedCount} / {collectionStats.totalTypes}
              </span>
            </div>
          </div>

          {/* 2. Owned */}
          <div className="bg-[#0A0F1D]/90 border border-slate-700/70 rounded-xl px-1.5 py-1.5 flex flex-col justify-between min-w-0">
            <span className="text-[8px] sm:text-[9px] font-bold text-slate-400 truncate">
              Owned
            </span>
            <div className="flex items-center gap-1 mt-0.5">
              <ShieldCheck className="w-3 h-3 text-amber-400 shrink-0" />
              <span className="text-[10px] sm:text-xs font-black text-white tabular-nums truncate">
                {collectionStats.totalEditionsOwned}
              </span>
            </div>
          </div>

          {/* 3. Available */}
          <div className="bg-[#0A0F1D]/90 border border-slate-700/70 rounded-xl px-1.5 py-1.5 flex flex-col justify-between min-w-0">
            <span className="text-[8px] sm:text-[9px] font-bold text-slate-400 truncate">
              Available
            </span>
            <div className="flex items-center gap-1 mt-0.5">
              <Layers className="w-3 h-3 text-sky-400 shrink-0" />
              <span className="text-[10px] sm:text-xs font-black text-white tabular-nums truncate">
                {collectionStats.totalTypes}
              </span>
            </div>
          </div>

          {/* 4. Passive Income */}
          <div className="bg-[#0A0F1D]/90 border border-emerald-500/35 rounded-xl px-1.5 py-1.5 flex flex-col justify-between min-w-0">
            <span className="text-[8px] sm:text-[9px] font-bold text-slate-400 truncate">
              Passive Income
            </span>
            <div className="flex items-center gap-0.5 mt-0.5">
              <span className="text-[10px] sm:text-xs font-black text-emerald-400 tabular-nums truncate">
                +{collectionStats.totalPassiveIncome.toLocaleString('en-US')}/hr
              </span>
            </div>
          </div>

          {/* 5. Collection Value / Yield Bonus */}
          <div className="bg-[#0A0F1D]/90 border border-amber-500/35 rounded-xl px-1.5 py-1.5 flex flex-col justify-between min-w-0">
            <span className="text-[8px] sm:text-[9px] font-bold text-slate-400 truncate">
              Collection Bonus
            </span>
            <div className="flex items-center gap-0.5 mt-0.5">
              <Star className="w-2.5 h-2.5 text-amber-400 fill-amber-400 shrink-0" />
              <span className="text-[10px] sm:text-xs font-black text-amber-300 tabular-nums truncate">
                +{collectionStats.totalBonusPercent}%
              </span>
            </div>
          </div>
        </div>

        {/* =====================================================================
            2. COLLECTION MILESTONES BAR (3 Starter, 7 Explorer, 10 Collector, 14 Legendary)
           ===================================================================== */}
        <div className="relative z-10 mt-2.5 bg-[#080C18]/90 border border-amber-500/25 rounded-xl px-2.5 py-2 flex flex-col sm:flex-row sm:items-center gap-2">
          <div className="flex items-center justify-between sm:justify-start gap-1.5 shrink-0">
            <span className="text-[10px] font-extrabold text-slate-300 tracking-tight">
              Collection Milestones
            </span>
            <span className="text-[9px] font-bold text-amber-400/90 sm:hidden">
              Tap milestone for info
            </span>
          </div>

          {/* Horizontal Connected Milestone Track */}
          <div className="relative flex-1 flex items-center justify-between px-1 py-0.5">
            {/* Background Track Line */}
            <div className="absolute left-4 right-4 top-1/2 -translate-y-1/2 h-1 bg-[#161F35] rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald-400 via-sky-400 to-amber-400 transition-all duration-500"
                style={{ width: `${collectionStats.completionPercent}%` }}
              />
            </div>

            {COLLECTION_MILESTONES.map((m) => {
              const isUnlocked = collectionStats.uniqueOwnedCount >= m.count;
              return (
                <button
                  key={m.count}
                  type="button"
                  onClick={() => {
                    sound.playTap();
                    setSelectedMilestone(m);
                  }}
                  className={`relative z-10 flex items-center gap-1 px-2 py-1 rounded-lg border text-[10px] font-extrabold transition active:scale-95 cursor-pointer ${
                    isUnlocked
                      ? 'bg-gradient-to-r from-amber-950/95 via-[#241B0B] to-amber-900/90 border-amber-400 text-amber-200 shadow-[0_0_12px_rgba(245,158,11,0.4)]'
                      : 'bg-[#0E1424]/95 border-slate-700/80 text-slate-400 hover:border-slate-500 hover:text-slate-200'
                  }`}
                >
                  <span
                    className={`w-4 h-4 rounded-md flex items-center justify-center text-[9px] font-black ${
                      isUnlocked
                        ? 'bg-amber-400 text-slate-950'
                        : 'bg-slate-800 text-slate-300 border border-slate-600/60'
                    }`}
                  >
                    {isUnlocked ? '✓' : m.count}
                  </span>
                  <span className="whitespace-nowrap">{m.title}</span>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* =====================================================================
          3. NFT FILTERS & SORTING BAR
         ===================================================================== */}
      <section className="mt-2.5 flex flex-col gap-2">
        {/* Row A: Status Filter Tabs (All, Owned, Equipped, Locked) */}
        <div className="grid grid-cols-4 gap-1.5 bg-[#0A0E1A]/95 p-1 rounded-xl border border-slate-800/90">
          {(
            [
              { id: 'all', label: 'All', count: collectionStats.totalTypes },
              { id: 'owned', label: 'Owned', count: collectionStats.uniqueOwnedCount },
              { id: 'equipped', label: 'Equipped', count: collectionStats.equippedCount },
              { id: 'locked', label: 'Locked', count: collectionStats.lockedCount },
            ] as Array<{ id: StatusFilter; label: string; count: number }>
          ).map((tab) => {
            const active = statusFilter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  sound.playTap();
                  setStatusFilter(tab.id);
                }}
                className={`py-1.5 px-1.5 rounded-lg text-[10px] sm:text-[11px] font-extrabold transition flex items-center justify-center gap-1 cursor-pointer ${
                  active
                    ? 'bg-gradient-to-b from-[#2E210D] to-[#171108] border border-amber-400/80 text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.28)]'
                    : 'text-slate-400 hover:text-slate-200 border border-transparent'
                }`}
              >
                <span className="truncate">{tab.label}</span>
                <span
                  className={`text-[9px] font-black tabular-nums ${
                    active ? 'text-amber-200' : 'text-slate-500'
                  }`}
                >
                  ({tab.count})
                </span>
              </button>
            );
          })}
        </div>

        {/* Row B: Rarity Filter Pills + Sort By Dropdown */}
        <div className="flex flex-wrap items-center justify-between gap-1.5">
          {/* Rarity Filter Pills */}
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5 max-w-full">
            {RARITY_FILTERS.map((rarity) => {
              const active = rarityFilter === rarity;
              const pillColor =
                rarity === 'Common'
                  ? active
                    ? 'bg-emerald-950/90 border-emerald-400 text-emerald-300 shadow-[0_0_10px_rgba(16,185,129,0.3)]'
                    : 'border-slate-800 text-slate-400 hover:text-emerald-300'
                  : rarity === 'Rare'
                  ? active
                    ? 'bg-sky-950/90 border-sky-400 text-sky-300 shadow-[0_0_10px_rgba(14,165,233,0.3)]'
                    : 'border-slate-800 text-slate-400 hover:text-sky-300'
                  : rarity === 'Epic'
                  ? active
                    ? 'bg-purple-950/90 border-purple-400 text-purple-200 shadow-[0_0_10px_rgba(168,85,247,0.3)]'
                    : 'border-slate-800 text-slate-400 hover:text-purple-300'
                  : rarity === 'Legendary'
                  ? active
                    ? 'bg-amber-950/90 border-amber-400 text-amber-300 shadow-[0_0_10px_rgba(245,158,11,0.35)]'
                    : 'border-slate-800 text-slate-400 hover:text-amber-300'
                  : rarity === 'Mythic'
                  ? active
                    ? 'bg-pink-950/90 border-pink-400 text-pink-200 shadow-[0_0_10px_rgba(236,72,153,0.35)]'
                    : 'border-slate-800 text-slate-400 hover:text-pink-300'
                  : active
                  ? 'bg-[#251C0E] border-amber-400/80 text-amber-300'
                  : 'border-slate-800 text-slate-400 hover:text-white';

              return (
                <button
                  key={rarity}
                  type="button"
                  onClick={() => {
                    sound.playTap();
                    setRarityFilter(rarity);
                  }}
                  className={`px-2.5 py-1 rounded-full border bg-[#0C101D] text-[10px] font-extrabold whitespace-nowrap transition cursor-pointer ${pillColor}`}
                >
                  {rarity}
                </button>
              );
            })}
          </div>

          {/* Sort By Dropdown */}
          <div className="relative ml-auto shrink-0">
            <button
              type="button"
              onClick={() => {
                sound.playTap();
                setIsSortMenuOpen((prev) => !prev);
              }}
              className="px-2.5 py-1 rounded-xl bg-[#0C101D] hover:bg-[#13192B] border border-slate-700/80 text-[10px] sm:text-[11px] font-bold text-slate-300 flex items-center gap-1.5 cursor-pointer shadow-sm"
            >
              <span className="text-slate-400">Sort by:</span>
              <span className="font-extrabold text-amber-300">{SORT_LABELS[sortBy]}</span>
              <ChevronDown
                className={`w-3.5 h-3.5 text-amber-400 transition-transform ${
                  isSortMenuOpen ? 'rotate-180' : ''
                }`}
              />
            </button>

            {isSortMenuOpen && (
              <>
                <div
                  className="fixed inset-0 z-30"
                  onClick={() => setIsSortMenuOpen(false)}
                />
                <div className="absolute right-0 mt-1.5 w-48 rounded-xl bg-[#0E1324] border border-amber-500/40 shadow-[0_12px_30px_rgba(0,0,0,0.85)] py-1 z-40">
                  {(Object.keys(SORT_LABELS) as SortOption[]).map((opt) => {
                    const active = sortBy === opt;
                    return (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => {
                          sound.playTap();
                          setSortBy(opt);
                          setIsSortMenuOpen(false);
                        }}
                        className={`w-full px-3 py-2 text-left text-xs font-bold flex items-center justify-between transition cursor-pointer ${
                          active
                            ? 'bg-amber-500/15 text-amber-300'
                            : 'text-slate-300 hover:bg-slate-800/70 hover:text-white'
                        }`}
                      >
                        <span>{SORT_LABELS[opt]}</span>
                        {active && <Check className="w-3.5 h-3.5 text-amber-400" />}
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </div>
      </section>

      {/* =====================================================================
          4. NFT COLLECTIBLE CARDS GRID
         ===================================================================== */}
      {displayedNfts.length === 0 ? (
        <div className="mt-4 rounded-2xl bg-[#0C101E]/90 border border-slate-800 p-8 text-center">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto mb-3 text-amber-400">
            <Sparkles className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-black text-white">No Collectibles Match Filters</h3>
          <p className="text-xs text-slate-400 mt-1">
            Try switching your status or rarity filter to view all 14 Fox NFTs.
          </p>
          <button
            type="button"
            onClick={() => {
              setStatusFilter('all');
              setRarityFilter('All');
            }}
            className="mt-3 px-4 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/50 text-amber-300 text-xs font-black transition cursor-pointer"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="mt-2.5 grid grid-cols-2 gap-2.5">
          {displayedNfts.map((item, idx) => {
            const meta = getFoxGiftMeta(item.id);
            const ownedCount = user.upgrades[item.id] || 0;
            const isOwned = ownedCount > 0;
            const isEquipped = isOwned && equippedGiftId === item.id;
            const reqLevel = item.levelRequirement || 1;
            const isLevelLocked = !isOwned && user.level < reqLevel;
            const visuals = getRarityVisuals(meta.rarity, isEquipped);
            const hourlyIncome = isOwned ? item.baseBenefit * ownedCount : item.baseBenefit;
            const starPrice = Math.floor(
              item.basePrice * Math.pow(item.priceMultiplier, ownedCount)
            );
            const isBusy = loadingId === item.id;

            return (
              <div
                key={item.id}
                onClick={() => {
                  sound.playTap();
                  setSelectedNftId(item.id);
                }}
                className={`group relative rounded-2xl bg-gradient-to-b ${meta.cardBgGradient} border ${visuals.cardBorder} flex flex-col overflow-hidden transition-all duration-300 hover:-translate-y-0.5 cursor-pointer`}
              >
                {/* Top Artwork Frame (1:1 square matching native 1024x1024 NFT artwork) */}
                <div className="relative w-full aspect-square overflow-hidden bg-[#070A12]">
                  {/* Unique Collectible Fox Illustration */}
                  <FoxGiftAvatar
                    giftId={item.id}
                    priority={idx < 4}
                    className="w-full h-full"
                    imgClassName="group-hover:scale-105 transition-transform duration-500"
                  />

                  {/* Light localized edge scrims for badge legibility without dimming artwork */}
                  <div className="pointer-events-none absolute inset-x-0 top-0 h-8 bg-gradient-to-b from-black/45 via-black/15 to-transparent" />
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 h-7 bg-gradient-to-t from-[#070A12]/80 via-transparent to-transparent" />

                  {/* Top-Left: Rarity Badge */}
                  <div className="absolute top-2 left-2 z-10">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black tracking-tight ${visuals.badgeClass}`}
                    >
                      {meta.rarity}
                    </span>
                  </div>

                  {/* Top-Right: Collection Number (#0032) */}
                  <div className="absolute top-2 right-2 z-10">
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-black/75 backdrop-blur-sm border border-white/15 text-[10px] font-black text-slate-200 tabular-nums">
                      {meta.collectionNumber}
                    </span>
                  </div>

                  {/* Bottom-Left: Hexagonal Collection Emblem */}
                  <div className="absolute bottom-1.5 left-2 z-10">
                    <FoxCollectionHexBadge size="sm" rarity={meta.rarity} />
                  </div>

                  {/* Edition Counter Pill if multiple editions owned */}
                  {ownedCount > 1 && (
                    <div className="absolute bottom-1.5 right-2 z-10">
                      <span className="px-1.5 py-0.5 rounded-md bg-amber-500/90 text-slate-950 font-black text-[9px] shadow">
                        ×{ownedCount}
                      </span>
                    </div>
                  )}
                </div>

                {/* Card Content Body */}
                <div className="p-2.5 pt-2 flex-1 flex flex-col justify-between bg-gradient-to-b from-[#0B0F1C]/95 to-[#070A13]">
                  <div>
                    {/* NFT Title */}
                    <h3 className="text-xs sm:text-[13px] font-black text-white tracking-tight truncate leading-tight">
                      {meta.nftTitle}
                    </h3>
                    {/* Collection Series */}
                    <p className="text-[10px] font-bold text-slate-400 truncate mt-0.5">
                      {meta.collectionSeries}
                    </p>
                  </div>

                  {/* Passive FOX/hr & Bonus % Strip */}
                  <div
                    className={`mt-2 pt-1.5 border-t ${visuals.divider} flex items-center justify-between gap-1`}
                  >
                    <div className="flex items-center gap-1 min-w-0">
                      <span className="w-4 h-4 rounded-md bg-amber-500/15 border border-amber-500/40 flex items-center justify-center text-[9px] shrink-0">
                        🪙
                      </span>
                      <span className="text-[10px] sm:text-[11px] font-black text-emerald-400 tabular-nums truncate">
                        +{hourlyIncome.toLocaleString('en-US')}/hr
                      </span>
                    </div>

                    <div className="flex items-center gap-0.5 shrink-0">
                      <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                      <span className="text-[10px] sm:text-[11px] font-black text-amber-300 tabular-nums">
                        +{meta.bonusPercent}%
                      </span>
                    </div>
                  </div>

                  {/* Bottom Status & Action Bar (Matches Reference Image) */}
                  <div className="mt-2 pt-1.5 border-t border-slate-800/80 flex items-center justify-between gap-1.5">
                    {isOwned ? (
                      <>
                        <span className="text-[10px] font-extrabold text-emerald-300/90 pl-0.5">
                          Owned
                        </span>
                        <button
                          type="button"
                          onClick={(e) => handleToggleEquip(item.id, e)}
                          className={`px-2.5 py-1 rounded-full text-[10px] font-black flex items-center gap-1 transition active:scale-95 cursor-pointer ${
                            isEquipped
                              ? 'bg-gradient-to-r from-emerald-400 to-teal-400 text-slate-950 shadow-[0_0_12px_rgba(52,211,153,0.5)]'
                              : 'bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white shadow-[0_0_12px_rgba(14,165,233,0.4)]'
                          }`}
                        >
                          {isEquipped ? (
                            <>
                              <Check className="w-3 h-3 stroke-[3]" />
                              <span>Equipped</span>
                            </>
                          ) : (
                            <span>Equip</span>
                          )}
                        </button>
                      </>
                    ) : isLevelLocked ? (
                      <div className="w-full px-2 py-1 rounded-full bg-[#111626]/90 border border-slate-700/70 flex items-center justify-between text-[10px] font-bold text-slate-300">
                        <span className="flex items-center gap-1 text-slate-300">
                          <Lock className="w-3 h-3 text-amber-400/80" />
                          <span>Locked</span>
                        </span>
                        <span className="font-black text-amber-300">Lv {reqLevel}</span>
                      </div>
                    ) : (
                      <>
                        <span className="text-[10px] font-bold text-slate-400 pl-0.5 flex items-center gap-1">
                          <Lock className="w-2.5 h-2.5 text-slate-400" />
                          <span>Lv {reqLevel}</span>
                        </span>
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={(e) => handleAcquireNft(item, e)}
                          className="px-2.5 py-1 rounded-full bg-gradient-to-r from-amber-400 via-amber-500 to-orange-500 hover:brightness-110 text-slate-950 text-[10px] font-black flex items-center gap-1 shadow-[0_0_12px_rgba(245,158,11,0.35)] transition active:scale-95 cursor-pointer"
                        >
                          <Star className="w-2.5 h-2.5 fill-slate-950" />
                          <span>{isBusy ? '...' : `${starPrice}★`}</span>
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* =====================================================================
          5. MILESTONE DETAILS MODAL
         ===================================================================== */}
      {selectedMilestone && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setSelectedMilestone(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-2xl bg-gradient-to-b from-[#151C33] to-[#090D18] border border-amber-400/60 p-4 text-white shadow-[0_16px_40px_rgba(0,0,0,0.9)]"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-400/50 flex items-center justify-center text-amber-300">
                  <Award className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-amber-300">
                    {selectedMilestone.badgeTitle}
                  </h3>
                  <p className="text-[11px] text-slate-400 font-bold">
                    Milestone: {selectedMilestone.count} Unique Foxes
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedMilestone(null)}
                className="w-7 h-7 rounded-full bg-slate-800/80 hover:bg-slate-700 flex items-center justify-center text-slate-300 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-200 leading-relaxed mt-3">
              {selectedMilestone.description}
            </p>

            <div className="mt-3 p-2.5 rounded-xl bg-[#0B1020] border border-slate-800 flex items-center justify-between text-xs">
              <span className="text-slate-400 font-bold">Your Progress</span>
              <span className="font-black text-amber-300 tabular-nums">
                {collectionStats.uniqueOwnedCount} / {selectedMilestone.count} Unique Foxes
              </span>
            </div>

            <div className="mt-3">
              {collectionStats.uniqueOwnedCount >= selectedMilestone.count ? (
                <div className="w-full py-2.5 rounded-xl bg-emerald-500/20 border border-emerald-400/60 text-emerald-300 text-xs font-black flex items-center justify-center gap-1.5">
                  <Check className="w-4 h-4 stroke-[3]" />
                  <span>Milestone Achievement Unlocked</span>
                </div>
              ) : (
                <div className="w-full py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-400 text-xs font-bold text-center">
                  Collect {selectedMilestone.count - collectionStats.uniqueOwnedCount} more unique
                  Fox{selectedMilestone.count - collectionStats.uniqueOwnedCount === 1 ? '' : 'es'}{' '}
                  to unlock
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          6. INTERACTIVE NFT DETAILS MODAL
         ===================================================================== */}
      {selectedNftItem &&
        (() => {
          const meta = getFoxGiftMeta(selectedNftItem.id);
          const ownedCount = user.upgrades[selectedNftItem.id] || 0;
          const isOwned = ownedCount > 0;
          const isEquipped = isOwned && equippedGiftId === selectedNftItem.id;
          const reqLevel = selectedNftItem.levelRequirement || 1;
          const isLevelLocked = !isOwned && user.level < reqLevel;
          const visuals = getRarityVisuals(meta.rarity, isEquipped);
          const totalYield = isOwned
            ? selectedNftItem.baseBenefit * ownedCount
            : selectedNftItem.baseBenefit;
          const nextStarPrice = Math.floor(
            selectedNftItem.basePrice * Math.pow(selectedNftItem.priceMultiplier, ownedCount)
          );
          const isBusy = loadingId === selectedNftItem.id;

          return (
            <div
              className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-fade-in"
              onClick={() => setSelectedNftId(null)}
            >
              <div
                onClick={(e) => e.stopPropagation()}
                className={`w-full max-w-sm max-h-[90vh] overflow-y-auto rounded-3xl bg-gradient-to-b ${meta.cardBgGradient} border-2 ${visuals.cardBorder} shadow-[0_20px_60px_rgba(0,0,0,0.95)] text-white flex flex-col`}
              >
                {/* Modal Top Artwork Showcase (1:1 native 1024x1024) */}
                <div className="relative w-full aspect-square bg-[#060911] overflow-hidden shrink-0">
                  <FoxGiftAvatar
                    giftId={selectedNftItem.id}
                    priority={true}
                    className="w-full h-full"
                  />

                  <div className="pointer-events-none absolute inset-x-0 top-0 h-10 bg-gradient-to-b from-black/50 to-transparent" />
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-[#090D18] via-[#090D18]/45 to-transparent" />

                  {/* Top-Left Rarity + Collection Number */}
                  <div className="absolute top-3 left-3 flex items-center gap-1.5 z-10">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-xs font-black ${visuals.badgeClass}`}
                    >
                      {meta.rarity}
                    </span>
                    <span className="px-2 py-0.5 rounded-lg bg-black/75 border border-white/15 text-xs font-black text-slate-200 tabular-nums">
                      {meta.collectionNumber}
                    </span>
                  </div>

                  {/* Close Button */}
                  <button
                    type="button"
                    onClick={() => setSelectedNftId(null)}
                    className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full bg-black/70 hover:bg-black/90 border border-white/20 flex items-center justify-center text-slate-200 transition cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>

                  {/* Bottom Title Overlay */}
                  <div className="absolute bottom-2.5 left-3 right-3 flex items-end justify-between gap-2 z-10">
                    <div className="flex items-center gap-2 min-w-0">
                      <FoxCollectionHexBadge size="md" rarity={meta.rarity} />
                      <div className="min-w-0">
                        <h2 className="text-base sm:text-lg font-black text-white leading-tight truncate">
                          {meta.nftTitle}
                        </h2>
                        <p className="text-xs font-bold text-amber-300/90 truncate">
                          {meta.collectionSeries}
                        </p>
                      </div>
                    </div>

                    {isOwned && (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/60 text-emerald-300 text-[10px] font-black shrink-0">
                        Owned {ownedCount > 1 ? `×${ownedCount}` : ''}
                      </span>
                    )}
                  </div>
                </div>

                {/* Modal Details Content */}
                <div className="p-4 pt-3 flex flex-col gap-3 bg-[#090D18]">
                  {/* Description / Lore */}
                  <p className="text-xs text-slate-300 leading-relaxed">{meta.lore}</p>

                  {/* Passive Income & Collection Bonus Highlights */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-xl bg-[#0F1526] border border-emerald-500/35 p-2.5 flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-emerald-500/15 border border-emerald-400/40 flex items-center justify-center text-emerald-400 shrink-0">
                        <TrendingUp className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-[10px] font-bold text-slate-400">Passive Income</div>
                        <div className="text-xs sm:text-sm font-black text-emerald-400 tabular-nums truncate">
                          +{totalYield.toLocaleString('en-US')} /hr
                        </div>
                      </div>
                    </div>

                    <div className="rounded-xl bg-[#0F1526] border border-amber-500/35 p-2.5 flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-amber-500/15 border border-amber-400/40 flex items-center justify-center text-amber-400 shrink-0">
                        <Zap className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-[10px] font-bold text-slate-400">Collection Bonus</div>
                        <div className="text-xs sm:text-sm font-black text-amber-300 tabular-nums truncate">
                          +{meta.bonusPercent}% Yield
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Collectible Attributes / Traits Grid */}
                  <div>
                    <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5">
                      Collectible Attributes
                    </h4>
                    <div className="grid grid-cols-2 gap-1.5">
                      {meta.attributes.map((attr) => (
                        <div
                          key={attr.label}
                          className="rounded-xl bg-[#0E1424] border border-slate-800 px-2.5 py-1.5 flex flex-col"
                        >
                          <span className="text-[9px] font-bold text-slate-400">{attr.label}</span>
                          <span className="text-[11px] font-extrabold text-white truncate mt-0.5">
                            {attr.value}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Ownership & Requirement Status Strip */}
                  <div className="rounded-xl bg-[#0D1220] border border-slate-800 px-3 py-2 flex items-center justify-between text-xs">
                    <span className="text-slate-400 font-bold">Status</span>
                    {isOwned ? (
                      <span className="font-black text-emerald-400 flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" />
                        {isEquipped ? 'Owned & Equipped Companion' : 'Owned in Vault'}
                      </span>
                    ) : isLevelLocked ? (
                      <span className="font-black text-amber-300 flex items-center gap-1">
                        <Lock className="w-3.5 h-3.5" />
                        Unlocks at Player Level {reqLevel} (Now Lv {user.level})
                      </span>
                    ) : (
                      <span className="font-black text-sky-300">
                        Available to Unlock (Lv {reqLevel} Met)
                      </span>
                    )}
                  </div>

                  {/* Modal Action Buttons */}
                  <div className="flex flex-col gap-2 pt-1">
                    {isOwned ? (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleToggleEquip(selectedNftItem.id)}
                          className={`flex-1 py-2.5 px-4 rounded-xl font-black text-xs flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer ${
                            isEquipped
                              ? 'bg-gradient-to-r from-emerald-400 to-teal-400 text-slate-950 shadow-[0_0_16px_rgba(52,211,153,0.45)]'
                              : 'bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white shadow-[0_0_16px_rgba(14,165,233,0.45)]'
                          }`}
                        >
                          <Check className="w-4 h-4 stroke-[3]" />
                          <span>{isEquipped ? 'Equipped (Tap to Unequip)' : 'Equip Companion'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={(e) => handleShareNft(selectedNftItem, e)}
                          className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-200 font-bold text-xs flex items-center justify-center gap-1 transition cursor-pointer"
                          title="Share on Telegram"
                        >
                          <Share2 className="w-4 h-4 text-sky-400" />
                        </button>
                      </div>
                    ) : null}

                    {/* Acquire / Mint Edition Button */}
                    {isLevelLocked ? (
                      <button
                        type="button"
                        disabled
                        className="w-full py-2.5 px-4 rounded-xl bg-slate-900 border border-slate-700/80 text-slate-400 font-black text-xs flex items-center justify-center gap-1.5 cursor-not-allowed"
                      >
                        <Lock className="w-4 h-4 text-amber-400" />
                        <span>Locked — Reach Level {reqLevel} to Acquire</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => handleAcquireNft(selectedNftItem)}
                        className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-400 via-yellow-400 to-orange-500 hover:brightness-110 text-slate-950 font-black text-xs flex items-center justify-center gap-1.5 shadow-[0_0_20px_rgba(245,158,11,0.4)] transition active:scale-95 cursor-pointer"
                      >
                        <Star className="w-4 h-4 fill-slate-950" />
                        <span>
                          {isBusy
                            ? 'Processing...'
                            : isOwned
                            ? `Mint Extra Edition (+${selectedNftItem.baseBenefit.toLocaleString('en-US')}/hr) • ${nextStarPrice} Stars`
                            : `Unlock Collectible • ${nextStarPrice} Telegram Stars`}
                        </span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })()}
    </div>
  );
};
