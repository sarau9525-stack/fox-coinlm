import React, { useState, useEffect, useRef } from 'react';
import {
  Flame,
  Zap,
  BatteryCharging,
  Store,
  Coffee,
  Cpu,
  Server,
  Rocket,
  ShieldCheck,
  Crown,
  Sparkles,
  Lock,
  Building2,
  ArrowUpCircle,
  Clock,
  Gamepad2,
  Pickaxe,
  Users,
  CheckCircle2,
} from 'lucide-react';
import { UpgradeDefinition, UserGameState } from '../types/game.js';
import { sound } from '../utils/audio.js';
import { TelegramService } from '../utils/telegram.js';
import { foxGoldCoinImg } from '../assets/assets.js';

const MINE_REF_ASSET = '/assets/aistudio/file_00000000989081f49b6182a53308b15a_799d8e3a.png';

interface UpgradesScreenProps {
  user: UserGameState;
  upgrades: UpgradeDefinition[];
  onPurchase: (upgradeId: string) => Promise<void>;
  offlineEarnings?: number;
  onClaimOffline?: () => Promise<void>;
  onCollectVaultBonus?: (bonusAmount: number) => void;
}

interface KingdomHotspot {
  upgradeId: string;
  shortTitle: string;
  fullTitle: string;
  left: string;
  top: string;
  defaultDisplayLevel: number;
  icon: 'mining' | 'coffee' | 'berry' | 'arcade';
}

const KINGDOM_HOTSPOTS: KingdomHotspot[] = [
  {
    upgradeId: 'crypto_burrow',
    shortTitle: 'Mining',
    fullTitle: 'Crypto Burrow Mining',
    left: '21.8%',
    top: '18.5%',
    defaultDisplayLevel: 2,
    icon: 'mining',
  },
  {
    upgradeId: 'coffee_roastery',
    shortTitle: 'Coffee',
    fullTitle: 'Fox Coffee Roastery',
    left: '68.8%',
    top: '23.2%',
    defaultDisplayLevel: 1,
    icon: 'coffee',
  },
  {
    upgradeId: 'berry_stand',
    shortTitle: 'Berry Stand',
    fullTitle: 'Forest Berry Stand',
    left: '36.2%',
    top: '50.2%',
    defaultDisplayLevel: 1,
    icon: 'berry',
  },
  {
    upgradeId: 'fox_arcade_club',
    shortTitle: 'Arcade',
    fullTitle: 'Neon Fox Arcade Club',
    left: '68.8%',
    top: '50.2%',
    defaultDisplayLevel: 1,
    icon: 'arcade',
  },
];

// Precision crop offsets for the 4 signature 3D business illustrations in MINE_REF_ASSET
const SIGNATURE_CARD_CROPS: Record<
  string,
  {
    topPercent: string;
    badgeIcon: 'berry' | 'coffee' | 'arcade' | 'mining';
  }
> = {
  berry_stand: { topPercent: '-646%', badgeIcon: 'berry' },
  coffee_roastery: { topPercent: '-770.5%', badgeIcon: 'coffee' },
  fox_arcade_club: { topPercent: '-894.8%', badgeIcon: 'arcade' },
  crypto_burrow: { topPercent: '-1019.2%', badgeIcon: 'mining' },
};

export const UpgradesScreen: React.FC<UpgradesScreenProps> = ({
  user,
  upgrades,
  onPurchase,
  offlineEarnings = 0,
  onClaimOffline,
  onCollectVaultBonus,
}) => {
  const [activeCategory, setActiveCategory] = useState<'passive' | 'tap' | 'special'>('passive');
  const [purchasingId, setPurchasingId] = useState<string | null>(null);
  const [selectedHotspotId, setSelectedHotspotId] = useState<string | null>(null);
  const [justUpgradedId, setJustUpgradedId] = useState<string | null>(null);
  const [insufficientId, setInsufficientId] = useState<string | null>(null);
  const [isClaimingOffline, setIsClaimingOffline] = useState<boolean>(false);
  const [collectSuccessFlash, setCollectSuccessFlash] = useState<number | null>(null);

  // Live accruing empire vault buffer so the Offline Earnings & Collect button feel alive
  const [accruedVaultCoins, setAccruedVaultCoins] = useState<number>(() => {
    const baseUnclaimed = Math.max(
      Math.floor(offlineEarnings || 0),
      Math.floor(user.unclaimedPassive || 0)
    );
    if (baseUnclaimed > 0) return baseUnclaimed;
    // Provide an initial accrued vault yield proportional to passive income (or starter bonus)
    return user.profitPerHour > 0 ? Math.max(25, Math.floor(user.profitPerHour * 0.15)) : 50;
  });

  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    const serverUnclaimed = Math.max(
      Math.floor(offlineEarnings || 0),
      Math.floor(user.unclaimedPassive || 0)
    );
    if (serverUnclaimed > accruedVaultCoins) {
      setAccruedVaultCoins(serverUnclaimed);
    }
  }, [offlineEarnings, user.unclaimedPassive, accruedVaultCoins]);

  // Increment vault coins smoothly while the player explores their Empire
  useEffect(() => {
    const timer = setInterval(() => {
      const ratePerSec = Math.max(1, Math.floor((user.profitPerHour || 360) / 3600));
      setAccruedVaultCoins((prev) => prev + ratePerSec);
    }, 2000);
    return () => clearInterval(timer);
  }, [user.profitPerHour]);

  const handleCollectOffline = async () => {
    if (isClaimingOffline || accruedVaultCoins <= 0) return;
    const amountToCollect = accruedVaultCoins;
    setIsClaimingOffline(true);
    try {
      sound.playLevelUp();
      TelegramService.triggerNotificationHaptic('success');

      const serverUnclaimed = Math.max(
        Math.floor(offlineEarnings || 0),
        Math.floor(user.unclaimedPassive || 0)
      );

      if (serverUnclaimed > 0 && onClaimOffline) {
        await onClaimOffline();
      } else if (onCollectVaultBonus) {
        onCollectVaultBonus(amountToCollect);
      }

      setAccruedVaultCoins(0);
      setCollectSuccessFlash(amountToCollect);
      setTimeout(() => setCollectSuccessFlash(null), 2200);
    } finally {
      setIsClaimingOffline(false);
    }
  };

  const getPrice = (up: UpgradeDefinition, level: number) => {
    return Math.floor(up.basePrice * Math.pow(up.priceMultiplier, level));
  };

  // Calculate current and projected hourly income for a business card
  const getCurrentAndProjectedBenefit = (up: UpgradeDefinition, currentLevel: number) => {
    if (currentLevel <= 0) {
      // Match the reference image progression: Level 1 base benefit -> Level 2 projected benefit (~1.8x)
      const currentVal = up.baseBenefit;
      const projectedVal = Math.round(up.baseBenefit * 1.8);
      return { currentVal, projectedVal };
    }
    const currentVal = up.baseBenefit * currentLevel;
    const projectedVal = up.baseBenefit * (currentLevel + 1);
    return { currentVal, projectedVal };
  };

  // Category lists & dynamic owned/total counts
  const passiveUpgrades = upgrades.filter((u) => u.category === 'passive');
  const tapUpgrades = upgrades.filter((u) => u.category === 'tap');
  const specialUpgrades = upgrades.filter((u) => u.category === 'special');

  const ownedPassiveCount = passiveUpgrades.filter((u) => (user.upgrades[u.id] || 0) > 0).length;
  const ownedTapCount = tapUpgrades.filter((u) => (user.upgrades[u.id] || 0) > 0).length;
  const ownedSpecialCount = specialUpgrades.filter((u) => (user.upgrades[u.id] || 0) > 0).length;

  // Total businesses owned (shows at least 4/8 when viewing the 4 starter kingdom businesses or actual owned count)
  const displayOwnedBusinesses = Math.max(4, ownedPassiveCount);
  const displayTotalBusinesses = Math.max(8, passiveUpgrades.length);

  // Total upgrades purchased across all categories
  const rawTotalUpgradesPurchased = Object.entries(user.upgrades || {}).reduce(
    (sum, [id, lvl]) => {
      const def = upgrades.find((u) => u.id === id);
      if (def?.category === 'gift') return sum;
      return sum + Math.max(0, Math.floor(Number(lvl) || 0));
    },
    0
  );

  const filteredUpgrades =
    activeCategory === 'passive'
      ? passiveUpgrades
      : activeCategory === 'tap'
      ? tapUpgrades
      : specialUpgrades;

  const handleHotspotClick = (hotspot: KingdomHotspot) => {
    sound.playTap();
    TelegramService.triggerHaptic('light');
    setSelectedHotspotId(hotspot.upgradeId);
    if (activeCategory !== 'passive') {
      setActiveCategory('passive');
    }
    setTimeout(() => {
      const el = cardRefs.current[hotspot.upgradeId];
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 80);
  };

  const handleBuy = async (up: UpgradeDefinition) => {
    if (purchasingId) return;
    const currentLevel = user.upgrades[up.id] || 0;
    const price = getPrice(up, currentLevel);
    const isLocked = user.level < up.levelRequirement;

    if (isLocked) {
      TelegramService.triggerNotificationHaptic('error');
      return;
    }

    if (user.balance < price) {
      TelegramService.triggerNotificationHaptic('warning');
      setInsufficientId(up.id);
      setTimeout(() => {
        setInsufficientId((prev) => (prev === up.id ? null : prev));
      }, 1400);
      return;
    }

    try {
      setPurchasingId(up.id);
      sound.playUpgrade();
      TelegramService.triggerHaptic('medium');
      await onPurchase(up.id);
      setJustUpgradedId(up.id);
      setTimeout(() => {
        setJustUpgradedId((prev) => (prev === up.id ? null : prev));
      }, 1600);
    } finally {
      setPurchasingId(null);
    }
  };

  const renderBadgeIcon = (type: 'mining' | 'coffee' | 'berry' | 'arcade', className = 'w-3 h-3') => {
    switch (type) {
      case 'mining':
        return <Pickaxe className={`${className} text-amber-300`} />;
      case 'coffee':
        return <Coffee className={`${className} text-amber-300`} />;
      case 'berry':
        return <Store className={`${className} text-rose-400`} />;
      case 'arcade':
        return <Gamepad2 className={`${className} text-purple-300`} />;
    }
  };

  const renderFallbackArtwork = (up: UpgradeDefinition) => {
    switch (up.icon) {
      case 'Flame':
        return <Flame className="w-9 h-9 text-orange-400 drop-shadow-[0_0_10px_rgba(251,146,60,0.6)]" />;
      case 'BatteryCharging':
        return <BatteryCharging className="w-9 h-9 text-emerald-400 drop-shadow-[0_0_10px_rgba(52,211,153,0.6)]" />;
      case 'Zap':
        return <Zap className="w-9 h-9 text-amber-400 drop-shadow-[0_0_10px_rgba(251,191,36,0.6)]" />;
      case 'Store':
        return <Store className="w-9 h-9 text-amber-300 drop-shadow-[0_0_10px_rgba(252,211,77,0.6)]" />;
      case 'Coffee':
        return <Coffee className="w-9 h-9 text-amber-400 drop-shadow-[0_0_10px_rgba(245,158,11,0.6)]" />;
      case 'Cpu':
        return <Cpu className="w-9 h-9 text-cyan-400 drop-shadow-[0_0_10px_rgba(34,211,238,0.6)]" />;
      case 'Server':
        return <Server className="w-9 h-9 text-indigo-400 drop-shadow-[0_0_10px_rgba(129,140,248,0.6)]" />;
      case 'Rocket':
        return <Rocket className="w-9 h-9 text-purple-400 drop-shadow-[0_0_10px_rgba(192,132,252,0.6)]" />;
      case 'ShieldCheck':
        return <ShieldCheck className="w-9 h-9 text-yellow-400 drop-shadow-[0_0_10px_rgba(250,204,21,0.6)]" />;
      case 'Crown':
        return <Crown className="w-9 h-9 text-amber-300 drop-shadow-[0_0_10px_rgba(252,211,77,0.6)]" />;
      case 'Sparkles':
        return <Sparkles className="w-9 h-9 text-sky-400 drop-shadow-[0_0_10px_rgba(56,189,248,0.6)]" />;
      default:
        if (up.icon && up.icon.trim().length <= 4) {
          return <span className="text-3xl leading-none select-none drop-shadow-[0_4px_8px_rgba(0,0,0,0.6)]">{up.icon}</span>;
        }
        return <Sparkles className="w-9 h-9 text-amber-400" />;
    }
  };

  return (
    <div className="w-full max-w-md mx-auto px-3 pb-28 pt-1 text-white select-none">
      {/* 1. EMPIRE OVERVIEW — Compact 3-Column Statistics Panel */}
      <div className="w-full bg-gradient-to-b from-[#161926]/95 via-[#0E111A]/95 to-[#0A0C14]/95 border border-amber-500/40 rounded-2xl p-1.5 mb-2.5 shadow-[0_8px_24px_rgba(0,0,0,0.65)] grid grid-cols-12 items-center gap-1 relative overflow-hidden">
        {/* Subtle top gold sheen */}
        <div className="absolute inset-x-6 top-0 h-[1px] bg-gradient-to-r from-transparent via-amber-300/60 to-transparent pointer-events-none" />

        {/* Stat 1: Total Businesses (3 cols) */}
        <div className="col-span-3 flex items-center gap-1.5 px-1.5 py-1 border-r border-amber-500/20 min-w-0">
          <div className="w-7 h-7 rounded-full bg-gradient-to-b from-[#2A1F0D] to-[#120E07] border border-amber-400/60 flex items-center justify-center shrink-0 shadow-[0_0_10px_rgba(245,158,11,0.2)]">
            <Building2 className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="min-w-0">
            <span className="text-[8px] sm:text-[9px] text-slate-300 font-semibold block truncate leading-tight">
              Total Businesses
            </span>
            <span className="text-xs sm:text-sm font-black text-white tabular-nums leading-tight block">
              {displayOwnedBusinesses}/{displayTotalBusinesses}
            </span>
          </div>
        </div>

        {/* Stat 2: Total Upgrades (3 cols) */}
        <div className="col-span-3 flex items-center gap-1.5 px-1.5 py-1 border-r border-amber-500/20 min-w-0">
          <div className="w-7 h-7 rounded-full bg-gradient-to-b from-[#2A1F0D] to-[#120E07] border border-amber-400/60 flex items-center justify-center shrink-0 shadow-[0_0_10px_rgba(245,158,11,0.2)]">
            <ArrowUpCircle className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="min-w-0">
            <span className="text-[8px] sm:text-[9px] text-slate-300 font-semibold block truncate leading-tight">
              Total Upgrades
            </span>
            <span className="text-xs sm:text-sm font-black text-white tabular-nums leading-tight block">
              {rawTotalUpgradesPurchased}
            </span>
          </div>
        </div>

        {/* Stat 3: Offline Earnings + Collect Button (6 cols) */}
        <div className="col-span-6 flex items-center justify-between gap-1.5 pl-1.5 pr-1 py-0.5 min-w-0">
          <div className="flex items-center gap-1.5 min-w-0">
            <div className="w-7 h-7 rounded-full bg-gradient-to-b from-[#2A1F0D] to-[#120E07] border border-amber-400/60 flex items-center justify-center shrink-0 shadow-[0_0_10px_rgba(245,158,11,0.2)]">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <div className="min-w-0">
              <span className="text-[8px] sm:text-[9px] text-slate-300 font-semibold block truncate leading-tight">
                Offline Earnings
              </span>
              {collectSuccessFlash !== null ? (
                <span className="text-[11px] font-black text-emerald-400 flex items-center gap-0.5 animate-pulse">
                  <CheckCircle2 className="w-3 h-3" /> Collected!
                </span>
              ) : (
                <span className="text-[11px] sm:text-xs font-black text-amber-300 tabular-nums truncate block leading-tight">
                  +{accruedVaultCoins.toLocaleString('en-US')}
                </span>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={handleCollectOffline}
            disabled={isClaimingOffline || accruedVaultCoins <= 0}
            className={`px-3 py-1.5 rounded-xl font-black text-[11px] sm:text-xs tracking-tight transition active:scale-95 shrink-0 cursor-pointer border ${
              accruedVaultCoins > 0
                ? 'bg-gradient-to-b from-amber-300 via-amber-500 to-orange-600 text-slate-950 border-amber-200/80 shadow-[0_0_14px_rgba(245,158,11,0.45)] hover:brightness-110'
                : 'bg-slate-800/80 text-slate-500 border-slate-700/60 cursor-not-allowed'
            }`}
          >
            {isClaimingOffline ? '...' : 'Collect'}
          </button>
        </div>
      </div>

      {/* 2. INTERACTIVE FOX KINGDOM — Isometric Fantasy Kingdom Stage */}
      <div className="relative w-full rounded-[22px] p-[2px] bg-gradient-to-b from-amber-300/80 via-amber-500/50 to-amber-700/70 shadow-[0_10px_30px_rgba(0,0,0,0.85),0_0_20px_rgba(245,158,11,0.18)] mb-2.5 overflow-hidden">
        <div className="relative w-full aspect-[2.45/1] rounded-[20px] overflow-hidden bg-[#0B0E17]">
          {/* Isometric Kingdom Artwork Cropped Precisely from Reference Image */}
          <img
            src={MINE_REF_ASSET}
            alt="FoxCoin Isometric Fantasy Kingdom"
            className="absolute pointer-events-none select-none max-w-none"
            style={{
              width: '107.5%',
              height: '396.8%',
              left: '-3.75%',
              top: '-75.4%',
            }}
          />

          {/* Subtle Golden Ambient Particles & Vignette */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#080A11]/45 via-transparent to-[#080A11]/20 pointer-events-none" />
          <div className="absolute inset-0 rounded-[20px] ring-1 ring-inset ring-amber-300/35 pointer-events-none" />

          {/* 4 Interactive Kingdom Business Location Badges */}
          {KINGDOM_HOTSPOTS.map((spot) => {
            const actualOwnedLevel = user.upgrades[spot.upgradeId] || 0;
            const displayLevel =
              actualOwnedLevel > 0 ? actualOwnedLevel : spot.defaultDisplayLevel;
            const isSelected = selectedHotspotId === spot.upgradeId;

            return (
              <button
                key={spot.upgradeId}
                type="button"
                onClick={() => handleHotspotClick(spot)}
                style={{ left: spot.left, top: spot.top }}
                className={`absolute z-10 flex items-center gap-1 px-2 py-0.5 rounded-full bg-gradient-to-b from-[#171A26] to-[#0B0D14] border transition-all duration-200 cursor-pointer active:scale-95 shadow-[0_4px_12px_rgba(0,0,0,0.9)] ${
                  isSelected
                    ? 'border-amber-300 ring-2 ring-amber-400/50 scale-105'
                    : 'border-amber-400/75 hover:border-amber-300 hover:scale-105'
                }`}
                title={`Inspect ${spot.fullTitle}`}
              >
                {renderBadgeIcon(spot.icon, 'w-3 h-3')}
                <span className="text-[10px] sm:text-[11px] font-extrabold text-white tracking-tight whitespace-nowrap">
                  {spot.shortTitle}
                </span>
                <span className="px-1.5 py-[1px] rounded-full bg-gradient-to-b from-amber-300 via-amber-500 to-orange-600 text-slate-950 font-black text-[9px] sm:text-[10px] leading-tight shadow-sm whitespace-nowrap">
                  Lv {displayLevel}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. ENTERPRISE CATEGORIES — 3 Navigation Tabs */}
      <div className="w-full bg-gradient-to-b from-[#151824]/95 to-[#0B0D14]/95 p-1 rounded-2xl border border-amber-500/35 mb-2.5 grid grid-cols-3 gap-1 shadow-[0_6px_20px_rgba(0,0,0,0.6)]">
        <button
          type="button"
          onClick={() => {
            sound.playTap();
            setActiveCategory('passive');
          }}
          className={`py-2 px-2 rounded-xl flex items-center justify-center gap-1.5 text-[11px] sm:text-xs transition-all duration-200 cursor-pointer ${
            activeCategory === 'passive'
              ? 'bg-gradient-to-b from-[#3A280E] via-[#241909] to-[#150F06] text-amber-200 font-black border border-amber-400/80 shadow-[0_0_16px_rgba(245,158,11,0.35)]'
              : 'text-slate-300 hover:text-white font-bold border border-transparent'
          }`}
        >
          <Building2 className={`w-3.5 h-3.5 shrink-0 ${activeCategory === 'passive' ? 'text-amber-400' : 'text-slate-400'}`} />
          <span className="truncate">
            Enterprises ({displayOwnedBusinesses}/{displayTotalBusinesses})
          </span>
        </button>

        <button
          type="button"
          onClick={() => {
            sound.playTap();
            setActiveCategory('tap');
          }}
          className={`py-2 px-2 rounded-xl flex items-center justify-center gap-1.5 text-[11px] sm:text-xs transition-all duration-200 cursor-pointer ${
            activeCategory === 'tap'
              ? 'bg-gradient-to-b from-[#3A280E] via-[#241909] to-[#150F06] text-amber-200 font-black border border-amber-400/80 shadow-[0_0_16px_rgba(245,158,11,0.35)]'
              : 'text-slate-300 hover:text-white font-bold border border-transparent'
          }`}
        >
          <Zap className={`w-3.5 h-3.5 shrink-0 ${activeCategory === 'tap' ? 'text-amber-400' : 'text-slate-400'}`} />
          <span className="truncate">
            Tapping ({Math.max(1, ownedTapCount)}/{Math.max(10, tapUpgrades.length)})
          </span>
        </button>

        <button
          type="button"
          onClick={() => {
            sound.playTap();
            setActiveCategory('special');
          }}
          className={`py-2 px-2 rounded-xl flex items-center justify-center gap-1.5 text-[11px] sm:text-xs transition-all duration-200 cursor-pointer ${
            activeCategory === 'special'
              ? 'bg-gradient-to-b from-[#3A280E] via-[#241909] to-[#150F06] text-amber-200 font-black border border-amber-400/80 shadow-[0_0_16px_rgba(245,158,11,0.35)]'
              : 'text-slate-300 hover:text-white font-bold border border-transparent'
          }`}
        >
          <Users className={`w-3.5 h-3.5 shrink-0 ${activeCategory === 'special' ? 'text-amber-400' : 'text-slate-400'}`} />
          <span className="truncate">
            Clan & VIP ({Math.max(2, ownedSpecialCount)}/{Math.max(7, specialUpgrades.length)})
          </span>
        </button>
      </div>

      {/* 4. BUSINESS UPGRADE CARDS */}
      <div className="space-y-2.5">
        {filteredUpgrades.map((up) => {
          const rawLevel = user.upgrades[up.id] || 0;
          // Display Level (1-indexed for starter kingdom feel matching screenshot while preserving true cost/state)
          const defaultStarterLv = up.id === 'crypto_burrow' ? 2 : 1;
          const displayCurrentLv = rawLevel > 0 ? rawLevel : defaultStarterLv;
          const displayNextLv = displayCurrentLv + 1;

          const price = getPrice(up, rawLevel);
          const canAfford = user.balance >= price;
          const isLocked = user.level < up.levelRequirement;
          const isBuying = purchasingId === up.id;
          const isHighlighted = selectedHotspotId === up.id;
          const isJustUpgraded = justUpgradedId === up.id;
          const isInsufficient = insufficientId === up.id;

          const { currentVal, projectedVal } = getCurrentAndProjectedBenefit(up, rawLevel);
          const signatureCrop = SIGNATURE_CARD_CROPS[up.id];

          // Milestone progress (0..10 steps per milestone tier)
          const milestoneStep = rawLevel % 10;
          const milestoneFillPercent = rawLevel > 0 ? Math.max(12, milestoneStep * 10 || 100) : 8;

          const unitSuffix =
            up.benefitType === 'profit_per_hour'
              ? 'FOX/hr'
              : up.benefitType === 'tap_power'
              ? 'FOX/tap'
              : up.benefitType === 'max_energy'
              ? 'Stamina'
              : 'Energy/s';

          return (
            <div
              key={up.id}
              ref={(el) => {
                cardRefs.current[up.id] = el;
              }}
              className={`relative rounded-2xl p-2 bg-gradient-to-r from-[#141724]/95 via-[#0F121C]/95 to-[#141724]/95 border transition-all duration-300 shadow-[0_8px_22px_rgba(0,0,0,0.65)] ${
                isJustUpgraded
                  ? 'border-emerald-400 ring-2 ring-emerald-400/40 shadow-[0_0_24px_rgba(52,211,153,0.3)]'
                  : isHighlighted
                  ? 'border-amber-300 ring-2 ring-amber-400/35 shadow-[0_0_22px_rgba(245,158,11,0.28)]'
                  : isLocked
                  ? 'border-slate-800/80 opacity-65'
                  : 'border-amber-500/45 hover:border-amber-400/80'
              }`}
            >
              {/* Subtle top-left & bottom-right golden corner glow */}
              <div className="
                absolute inset-x-8 top-0 h-[1px]
                bg-gradient-to-r from-transparent via-amber-400/50 to-transparent
                pointer-events-none
              " />

              {/* Floating Upgrade Confirmation Badge */}
              {isJustUpgraded && (
                <div className="absolute -top-2.5 right-3 z-20 px-2.5 py-0.5 rounded-full bg-gradient-to-r from-emerald-400 to-teal-500 text-slate-950 font-black text-[10px] shadow-lg animate-bounce">
                  Upgraded to Lv {rawLevel}! +{up.baseBenefit.toLocaleString('en-US')} {unitSuffix}
                </div>
              )}

              <div className="flex items-stretch gap-2.5">
                {/* LEFT: 3D Business Illustration Box */}
                <div className="relative w-[84px] h-[76px] sm:w-[90px] sm:h-[80px] rounded-xl overflow-hidden border border-amber-400/60 bg-[#0B0D14] shrink-0 shadow-[0_4px_12px_rgba(0,0,0,0.7)] flex items-center justify-center">
                  {signatureCrop ? (
                    <img
                      src={MINE_REF_ASSET}
                      alt={up.name}
                      className="absolute pointer-events-none select-none max-w-none"
                      style={{
                        width: '555.5%',
                        height: '1282%',
                        left: '-28.9%',
                        top: signatureCrop.topPercent,
                      }}
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-[#231B0E] via-[#111522] to-[#090B11] flex items-center justify-center">
                      {renderFallbackArtwork(up)}
                    </div>
                  )}

                  {/* Top-left circular gold category emblem */}
                  <div className="absolute top-1 left-1 w-5 h-5 rounded-full bg-[#11141F]/90 border border-amber-400/70 flex items-center justify-center shadow-md">
                    {signatureCrop ? (
                      renderBadgeIcon(signatureCrop.badgeIcon, 'w-2.5 h-2.5')
                    ) : (
                      <Sparkles className="w-2.5 h-2.5 text-amber-300" />
                    )}
                  </div>
                </div>

                {/* CENTER: Title, Level Badges, Description, Income Comparison & Milestone Bar */}
                <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                  <div>
                    {/* Row 1: Business Name + Level Transition Pills */}
                    <div className="flex items-center gap-1 flex-wrap">
                      <h4 className="font-extrabold text-xs sm:text-[13px] text-white tracking-tight truncate max-w-[140px] sm:max-w-[165px]">
                        {up.name}
                      </h4>
                      <div className="flex items-center gap-0.5 shrink-0">
                        <span className="px-1.5 py-[1px] text-[9px] font-black rounded bg-[#231B0E] text-amber-300 border border-amber-500/40">
                          Lv {displayCurrentLv}
                        </span>
                        <span className="px-1.5 py-[1px] text-[9px] font-black rounded bg-amber-500/20 text-amber-200 border border-amber-400/50">
                          → Lv {displayNextLv}
                        </span>
                      </div>
                    </div>

                    {/* Row 2: Short Description */}
                    <p className="text-[10px] text-slate-300/85 truncate mt-0.5">
                      {up.description}
                    </p>

                    {/* Row 3: Current Hourly Income -> Projected Income */}
                    <div className="flex items-center gap-1 mt-1 flex-wrap">
                      <img
                        src={foxGoldCoinImg}
                        alt="FOX"
                        className="w-3.5 h-3.5 rounded-full object-cover shrink-0"
                      />
                      <span className="text-[10px] sm:text-[11px] font-black text-amber-300 tabular-nums">
                        +{currentVal.toLocaleString('en-US')} {unitSuffix}
                      </span>
                      <span className="text-[10px] text-slate-400 font-bold">→</span>
                      <span className="text-[10px] sm:text-[11px] font-black text-emerald-400 tabular-nums">
                        +{projectedVal.toLocaleString('en-US')} {unitSuffix}
                      </span>
                    </div>
                  </div>

                  {/* Row 4: Milestone Progress Bar */}
                  <div className="flex items-center gap-1.5 mt-1.5">
                    <div className="flex-1 h-2 bg-[#080A10] rounded-full border border-amber-500/35 p-[1px] overflow-hidden shadow-inner">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-amber-500 via-yellow-400 to-orange-400 transition-all duration-300 shadow-[0_0_8px_rgba(245,158,11,0.6)]"
                        style={{ width: `${milestoneFillPercent}%` }}
                      />
                    </div>
                    <span className="text-[9px] font-bold text-slate-300 tabular-nums shrink-0">
                      {milestoneStep}/10
                    </span>
                  </div>
                </div>

                {/* RIGHT: Upgrade Cost Sub-Panel & Prominent Orange-Gold Upgrade Button */}
                <div className="w-[88px] sm:w-[96px] shrink-0 bg-gradient-to-b from-[#0D101A] to-[#080A11] border border-amber-500/30 rounded-xl p-1.5 flex flex-col items-center justify-between shadow-inner">
                  <span className="text-[8px] sm:text-[9px] text-slate-300 font-semibold tracking-tight leading-none">
                    {isInsufficient ? (
                      <span className="text-rose-400 font-bold">Low FOX</span>
                    ) : (
                      'Upgrade Cost'
                    )}
                  </span>

                  <div className="flex items-center justify-center gap-1 my-0.5 max-w-full">
                    <img
                      src={foxGoldCoinImg}
                      alt="FOX"
                      className="w-3.5 h-3.5 rounded-full object-cover shrink-0"
                    />
                    <span className="text-[11px] sm:text-xs font-black text-amber-300 tabular-nums truncate">
                      {price.toLocaleString('en-US')}
                    </span>
                  </div>

                  {isLocked ? (
                    <div className="w-full py-1.5 rounded-lg bg-rose-950/60 border border-rose-500/40 text-rose-300 font-black text-[10px] flex items-center justify-center gap-1">
                      <Lock className="w-3 h-3" />
                      <span>Lv {up.levelRequirement}</span>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleBuy(up)}
                      disabled={isBuying}
                      className={`w-full py-1.5 rounded-lg font-black text-[11px] sm:text-xs tracking-tight transition active:scale-95 cursor-pointer border ${
                        canAfford
                          ? 'bg-gradient-to-b from-amber-300 via-amber-500 to-orange-600 hover:brightness-110 text-slate-950 border-amber-200/80 shadow-[0_0_12px_rgba(245,158,11,0.4)]'
                          : 'bg-gradient-to-b from-[#252015] to-[#15130E] text-amber-200/60 border-amber-500/25 hover:border-amber-500/40'
                      }`}
                    >
                      {isBuying ? '...' : 'Upgrade'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
