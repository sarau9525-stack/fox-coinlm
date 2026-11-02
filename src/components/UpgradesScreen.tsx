import React, { useState, useEffect, useRef, useMemo } from 'react';
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
  Sun,
  Sunset,
  Moon,
  CloudRain,
  RotateCcw,
  X,
  Factory,
  FlaskConical,
  Home,
  Plane,
  TrendingUp,
  Layers,
  Maximize2,
  Minimize2,
  Footprints,
} from 'lucide-react';
import { UpgradeDefinition, UserGameState } from '../types/game.js';
import { sound } from '../utils/audio.js';
import { TelegramService } from '../utils/telegram.js';
import { foxGoldCoinImg, foxMascotImg } from '../assets/assets.js';
import {
  CityCameraPreset,
  CityQualityTier,
  CityTimeMode,
  FOX_CITY_BUILDINGS,
  FOX_CITY_CONCEPT_ASSET,
  FoxCityBuildingConfig,
  FoxCityBuildingId,
  resolveBuildingState,
  BuildingResolvedState,
  FoxMascotAnimMode,
} from './foxcity/foxCityTypes.js';
import { FoxCityView } from './foxcity/FoxCityView.js';

const MINE_REF_ASSET = '/assets/aistudio/file_00000000989081f49b6182a53308b15a_799d8e3a.png';

interface UpgradesScreenProps {
  user: UserGameState;
  upgrades: UpgradeDefinition[];
  onPurchase: (upgradeId: string) => Promise<void>;
  offlineEarnings?: number;
  onClaimOffline?: () => Promise<void>;
  onCollectVaultBonus?: (bonusAmount: number) => void;
}

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
  const [hasCollectedOffline, setHasCollectedOffline] = useState<boolean>(false);
  const [collectSuccessFlash, setCollectSuccessFlash] = useState<number | null>(null);

  // FOX CITY 3D Interactive State
  const [selectedBuildingId, setSelectedBuildingId] = useState<FoxCityBuildingId | null>(null);
  const [selectedBuildingUpgradeId, setSelectedBuildingUpgradeId] = useState<string | null>(null);
  const [timeMode, setTimeMode] = useState<CityTimeMode>('night');
  const [autoCycleTime, setAutoCycleTime] = useState<boolean>(false);
  const [cameraPreset, setCameraPreset] = useState<CityCameraPreset>('angle');
  const [mascotMode, setMascotMode] = useState<FoxMascotAnimMode>('auto');
  const [isFullScreenCity, setIsFullScreenCity] = useState<boolean>(false);
  const [resetSignal, setResetSignal] = useState<number>(0);
  const [qualityTier, setQualityTier] = useState<CityQualityTier>(() => {
    if (typeof window === 'undefined') return 'high';
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
      if (!gl) return 'low';
      const debugExt = gl.getExtension('WEBGL_debug_renderer_info');
      const gpuRenderer = debugExt
        ? String(gl.getParameter(debugExt.UNMASKED_RENDERER_WEBGL))
        : String(gl.getParameter(gl.RENDERER));
      const maxTexSize = Number(gl.getParameter(gl.MAX_TEXTURE_SIZE)) || 4096;
      gl.getExtension('WEBGL_lose_context')?.loseContext();

      if (/SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpuRenderer)) {
        return 'low';
      }
      if (/Mali-4|Mali-T|Adreno \(TM\) 3|Adreno \(TM\) 4|PowerVR SGX/i.test(gpuRenderer) || maxTexSize < 4096) {
        return 'low';
      }
      if (/Adreno \(TM\) 5|Mali-G5|Mali-G3|Intel\(R\) HD Graphics 4/i.test(gpuRenderer) || maxTexSize < 8192) {
        return 'medium';
      }
      return 'high';
    } catch {
      return 'high';
    }
  });

  const claimingOfflineRef = useRef<boolean>(false);
  const lastOfflineCollectedAtRef = useRef<number>(
    typeof window !== 'undefined'
      ? Number(localStorage.getItem('foxcoin_last_offline_claim_at_v1') || '0')
      : 0
  );

  const rawUnclaimedOffline = Math.max(
    Math.floor(offlineEarnings || 0),
    Math.floor(user.unclaimedPassive || 0)
  );

  useEffect(() => {
    const recentlyCollected =
      lastOfflineCollectedAtRef.current > 0 &&
      Date.now() - lastOfflineCollectedAtRef.current < 60000;
    if (rawUnclaimedOffline > 0 && !claimingOfflineRef.current && !recentlyCollected) {
      setHasCollectedOffline(false);
    }
  }, [rawUnclaimedOffline]);

  const recentlyCollected =
    lastOfflineCollectedAtRef.current > 0 &&
    Date.now() - lastOfflineCollectedAtRef.current < 60000;
  const accruedVaultCoins = hasCollectedOffline || recentlyCollected ? 0 : rawUnclaimedOffline;

  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Resolve building states for all 8 FOX CITY districts strictly from real game state
  const buildingStates = useMemo(() => {
    const map: Record<FoxCityBuildingId, BuildingResolvedState> = {} as any;
    for (const b of FOX_CITY_BUILDINGS) {
      map[b.id] = resolveBuildingState(b, user, upgrades);
    }
    return map;
  }, [user, upgrades]);

  const activeBuildingState = selectedBuildingId
    ? buildingStates[selectedBuildingId]
    : null;

  useEffect(() => {
    if (!activeBuildingState) {
      setSelectedBuildingUpgradeId(null);
      return;
    }
    const currentStillValid = activeBuildingState.upgrades.some(
      (u) => u.id === selectedBuildingUpgradeId
    );
    if (!currentStillValid) {
      setSelectedBuildingUpgradeId(activeBuildingState.primaryUpgrade?.id || null);
    }
  }, [activeBuildingState, selectedBuildingUpgradeId]);

  const handleSelectCityBuilding = (
    id: FoxCityBuildingId | null,
    resolved?: BuildingResolvedState
  ) => {
    sound.playTap();
    TelegramService.triggerHaptic('light');
    setSelectedBuildingId(id);
    const stateForId = resolved || (id ? buildingStates[id] : undefined);
    if (stateForId?.primaryUpgrade) {
      setSelectedBuildingUpgradeId(stateForId.primaryUpgrade.id);
      setSelectedHotspotId(stateForId.primaryUpgrade.id);
    }
  };

  const handleCollectOffline = async () => {
    if (isClaimingOffline || claimingOfflineRef.current || accruedVaultCoins <= 0) return;
    const amountToCollect = accruedVaultCoins;
    const now = Date.now();
    claimingOfflineRef.current = true;
    lastOfflineCollectedAtRef.current = now;
    if (typeof window !== 'undefined') {
      localStorage.setItem('foxcoin_last_offline_claim_at_v1', String(now));
    }
    setIsClaimingOffline(true);
    setHasCollectedOffline(true);
    setCollectSuccessFlash(amountToCollect);
    setTimeout(() => setCollectSuccessFlash(null), 2200);

    try {
      sound.playLevelUp();
      TelegramService.triggerNotificationHaptic('success');

      if (onClaimOffline) {
        await onClaimOffline();
      } else if (onCollectVaultBonus) {
        onCollectVaultBonus(amountToCollect);
      }
    } finally {
      claimingOfflineRef.current = false;
      setIsClaimingOffline(false);
    }
  };

  const getPrice = (up: UpgradeDefinition, level: number) => {
    return Math.floor(up.basePrice * Math.pow(up.priceMultiplier, level));
  };

  const getCurrentAndProjectedBenefit = (up: UpgradeDefinition, currentLevel: number) => {
    if (currentLevel <= 0) {
      const currentVal = up.baseBenefit;
      const projectedVal = Math.round(up.baseBenefit * 1.8);
      return { currentVal, projectedVal };
    }
    const currentVal = up.baseBenefit * currentLevel;
    const projectedVal = up.baseBenefit * (currentLevel + 1);
    return { currentVal, projectedVal };
  };

  const passiveUpgrades = upgrades.filter((u) => u.category === 'passive');
  const tapUpgrades = upgrades.filter((u) => u.category === 'tap');
  const specialUpgrades = upgrades.filter((u) => u.category === 'special');

  const ownedPassiveCount = passiveUpgrades.filter((u) => (user.upgrades[u.id] || 0) > 0).length;
  const ownedTapCount = tapUpgrades.filter((u) => (user.upgrades[u.id] || 0) > 0).length;
  const ownedSpecialCount = specialUpgrades.filter((u) => (user.upgrades[u.id] || 0) > 0).length;

  const displayOwnedBusinesses = Math.max(4, ownedPassiveCount);
  const displayTotalBusinesses = Math.max(8, passiveUpgrades.length);

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

  const renderDistrictIcon = (
    type: FoxCityBuildingConfig['iconType'],
    className = 'w-3.5 h-3.5'
  ) => {
    switch (type) {
      case 'crown':
        return <Crown className={className} />;
      case 'pickaxe':
        return <Pickaxe className={className} />;
      case 'factory':
        return <Factory className={className} />;
      case 'flask':
        return <FlaskConical className={className} />;
      case 'store':
        return <Store className={className} />;
      case 'home':
        return <Home className={className} />;
      case 'zap':
        return <Zap className={className} />;
      case 'helicopter':
        return <Plane className={className} />;
    }
  };

  const renderBadgeIcon = (
    type: 'mining' | 'coffee' | 'berry' | 'arcade',
    className = 'w-3 h-3'
  ) => {
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
        return (
          <Flame className="w-9 h-9 text-orange-400 drop-shadow-[0_0_10px_rgba(251,146,60,0.6)]" />
        );
      case 'BatteryCharging':
        return (
          <BatteryCharging className="w-9 h-9 text-emerald-400 drop-shadow-[0_0_10px_rgba(52,211,153,0.6)]" />
        );
      case 'Zap':
        return (
          <Zap className="w-9 h-9 text-amber-400 drop-shadow-[0_0_10px_rgba(251,191,36,0.6)]" />
        );
      case 'Store':
        return (
          <Store className="w-9 h-9 text-amber-300 drop-shadow-[0_0_10px_rgba(252,211,77,0.6)]" />
        );
      case 'Coffee':
        return (
          <Coffee className="w-9 h-9 text-amber-400 drop-shadow-[0_0_10px_rgba(245,158,11,0.6)]" />
        );
      case 'Cpu':
        return (
          <Cpu className="w-9 h-9 text-cyan-400 drop-shadow-[0_0_10px_rgba(34,211,238,0.6)]" />
        );
      case 'Server':
        return (
          <Server className="w-9 h-9 text-indigo-400 drop-shadow-[0_0_10px_rgba(129,140,248,0.6)]" />
        );
      case 'Rocket':
        return (
          <Rocket className="w-9 h-9 text-purple-400 drop-shadow-[0_0_10px_rgba(192,132,252,0.6)]" />
        );
      case 'ShieldCheck':
        return (
          <ShieldCheck className="w-9 h-9 text-yellow-400 drop-shadow-[0_0_10px_rgba(250,204,21,0.6)]" />
        );
      case 'Crown':
        return (
          <Crown className="w-9 h-9 text-amber-300 drop-shadow-[0_0_10px_rgba(252,211,77,0.6)]" />
        );
      case 'Sparkles':
        return (
          <Sparkles className="w-9 h-9 text-sky-400 drop-shadow-[0_0_10px_rgba(56,189,248,0.6)]" />
        );
      default:
        if (up.icon && up.icon.trim().length <= 4) {
          return (
            <span className="text-3xl leading-none select-none drop-shadow-[0_4px_8px_rgba(0,0,0,0.6)]">
              {up.icon}
            </span>
          );
        }
        return <Sparkles className="w-9 h-9 text-amber-400" />;
    }
  };

  const inspectedUpgrade = useMemo(() => {
    if (!activeBuildingState) return null;
    return (
      activeBuildingState.upgrades.find((u) => u.id === selectedBuildingUpgradeId) ||
      activeBuildingState.primaryUpgrade
    );
  }, [activeBuildingState, selectedBuildingUpgradeId]);

  return (
    <div className="w-full max-w-md mx-auto px-3 pb-28 pt-1 text-white select-none">
      {/* 0. FOX CITY TOP HUD — FOX Logo, Real FOX Balance, Real Mining Rate */}
      <div className="w-full bg-gradient-to-r from-[#1A140B]/95 via-[#10131F]/95 to-[#1A140B]/95 border border-amber-400/50 rounded-2xl px-2.5 py-2 mb-2 flex items-center justify-between gap-2 shadow-[0_8px_22px_rgba(0,0,0,0.7)]">
        <div className="flex items-center gap-2 min-w-0">
          <img
            src={foxMascotImg}
            alt="FOX CITY"
            className="w-8 h-8 rounded-full object-cover border border-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.4)] shrink-0"
          />
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-xs sm:text-sm font-black tracking-tight bg-gradient-to-r from-amber-200 via-amber-400 to-orange-400 bg-clip-text text-transparent">
                FOX CITY
              </span>
              <span className="text-[10px] font-semibold text-slate-400">
                · Lv. {user.level}
              </span>
            </div>
            <p className="text-[10px] font-bold text-amber-200 tabular-nums truncate">
              {Math.floor(user.balance).toLocaleString('en-US')} FOX · +
              {(user.profitPerHour || 0).toLocaleString('en-US')} FOX/hr
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => {
              sound.playTap();
              setQualityTier((prev) => (prev === 'high' ? 'medium' : 'high'));
            }}
            className="px-2 py-1 rounded-xl bg-[#0B0E17] border border-amber-500/40 text-[10px] font-black text-amber-300 hover:border-amber-300 cursor-pointer"
            title="Adaptive Graphics Quality"
          >
            {qualityTier === 'high' ? 'HD 3D' : 'Eco 3D'}
          </button>

          <button
            type="button"
            onClick={() => {
              sound.playTap();
              setIsFullScreenCity((prev) => !prev);
            }}
            className="p-1.5 rounded-xl bg-[#0B0E17] border border-amber-500/40 text-amber-300 hover:border-amber-300 cursor-pointer"
            title={isFullScreenCity ? 'Compact Viewport' : 'Expand 3D City Viewport'}
          >
            {isFullScreenCity ? (
              <Minimize2 className="w-3.5 h-3.5" />
            ) : (
              <Maximize2 className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
      </div>

      {/* 1. EMPIRE OVERVIEW — Compact 3-Column Statistics & Offline Vault Panel */}
      <div className="w-full bg-gradient-to-b from-[#161926]/95 via-[#0E111A]/95 to-[#0A0C14]/95 border border-amber-500/40 rounded-2xl p-1.5 mb-2 shadow-[0_8px_24px_rgba(0,0,0,0.65)] grid grid-cols-12 items-center gap-1 relative overflow-hidden">
        <div className="absolute inset-x-6 top-0 h-[1px] bg-gradient-to-r from-transparent via-amber-300/60 to-transparent pointer-events-none" />

        {/* Stat 1: Total Businesses (3 cols) */}
        <div className="col-span-3 flex items-center gap-1.5 px-1.5 py-1 border-r border-amber-500/20 min-w-0">
          <div className="w-7 h-7 rounded-full bg-gradient-to-b from-[#2A1F0D] to-[#120E07] border border-amber-400/60 flex items-center justify-center shrink-0 shadow-[0_0_10px_rgba(245,158,11,0.2)]">
            <Building2 className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="min-w-0">
            <span className="text-[8px] sm:text-[9px] text-slate-300 font-semibold block truncate leading-tight">
              Districts
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
              Upgrades
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

      {/* 2. FOX CITY 3D ENVIRONMENT HUD BAR (Time/Weather + Camera View Controls) */}
      <div className="w-full bg-gradient-to-r from-[#131724]/95 via-[#0D101A]/95 to-[#131724]/95 border border-amber-500/35 rounded-2xl p-1.5 mb-2 flex items-center justify-between gap-1.5 shadow-[0_6px_18px_rgba(0,0,0,0.6)]">
        {/* Time & Weather Controls */}
        <div className="flex items-center gap-1">
          {(
            [
              { id: 'day', label: 'Day', icon: Sun },
              { id: 'sunset', label: 'Sunset', icon: Sunset },
              { id: 'night', label: 'Night', icon: Moon },
              { id: 'rainy', label: 'Rain', icon: CloudRain },
            ] as Array<{ id: CityTimeMode; label: string; icon: any }>
          ).map((item) => {
            const IconComp = item.icon;
            const active = !autoCycleTime && timeMode === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  sound.playTap();
                  setAutoCycleTime(false);
                  setTimeMode(item.id);
                }}
                title={item.label}
                className={`px-2 py-1 rounded-xl flex items-center gap-1 text-[10px] font-extrabold transition cursor-pointer border ${
                  active
                    ? 'bg-gradient-to-b from-amber-400/25 to-amber-600/15 text-amber-300 border-amber-400/70 shadow-[0_0_10px_rgba(245,158,11,0.3)]'
                    : 'bg-[#0B0E17]/80 text-slate-400 border-white/5 hover:text-white'
                }`}
              >
                <IconComp className="w-3 h-3 text-amber-400" />
                <span className="hidden sm:inline">{item.label}</span>
              </button>
            );
          })}

          <button
            type="button"
            onClick={() => {
              sound.playTap();
              setAutoCycleTime((prev) => !prev);
            }}
            title="Auto Day/Night Cycle"
            className={`px-2 py-1 rounded-xl text-[10px] font-extrabold transition cursor-pointer border ${
              autoCycleTime
                ? 'bg-amber-500/25 text-amber-200 border-amber-400/75'
                : 'bg-[#0B0E17]/80 text-slate-400 border-white/5 hover:text-white'
            }`}
          >
            Auto
          </button>
        </div>

        {/* Camera View Preset & Reset Controls */}
        <div className="flex items-center gap-1">
          {(
            [
              { id: 'angle', label: 'Angle' },
              { id: 'top', label: 'Top' },
              { id: 'close', label: 'Close' },
            ] as Array<{ id: CityCameraPreset; label: string }>
          ).map((cam) => (
            <button
              key={cam.id}
              type="button"
              onClick={() => {
                sound.playTap();
                setCameraPreset(cam.id);
              }}
              className={`px-2 py-1 rounded-xl text-[10px] font-extrabold transition cursor-pointer border ${
                cameraPreset === cam.id
                  ? 'bg-gradient-to-b from-[#33240E] to-[#1A1308] text-amber-300 border-amber-400/70'
                  : 'bg-[#0B0E17]/80 text-slate-400 border-white/5 hover:text-white'
              }`}
            >
              {cam.label}
            </button>
          ))}

          <button
            type="button"
            onClick={() => {
              sound.playTap();
              setSelectedBuildingId(null);
              setCameraPreset('angle');
              setResetSignal((s) => s + 1);
            }}
            title="Reset Camera View"
            className="p-1.5 rounded-xl bg-[#0B0E17]/90 border border-amber-500/35 text-amber-300 hover:border-amber-300 cursor-pointer active:scale-95"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 2B. FOX CHARACTER (In City) POSE & INTERACTION BAR */}
      <div className="w-full bg-[#0D101B]/95 border border-amber-500/30 rounded-xl px-2.5 py-1.5 mb-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <Footprints className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span className="text-[10px] font-black text-amber-200 tracking-tight">
            FOX Character (In City):
          </span>
        </div>

        <div className="flex items-center gap-1">
          {(
            [
              { id: 'auto', label: 'Auto' },
              { id: 'idle', label: 'Idle' },
              { id: 'walk', label: 'Walk' },
              { id: 'run', label: 'Run' },
              { id: 'interact', label: 'Interact' },
            ] as Array<{ id: FoxMascotAnimMode; label: string }>
          ).map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => {
                sound.playTap();
                setMascotMode(m.id);
                if (m.id !== 'auto') {
                  setSelectedBuildingId(null);
                  setCameraPreset('plaza');
                }
              }}
              className={`px-2 py-0.5 rounded-lg text-[9px] font-black border cursor-pointer transition ${
                mascotMode === m.id
                  ? 'bg-gradient-to-b from-amber-300 to-amber-500 text-slate-950 border-amber-200 shadow-[0_0_8px_rgba(245,158,11,0.35)]'
                  : 'bg-[#090C15] text-slate-300 border-white/10 hover:border-amber-400/50 hover:text-white'
              }`}
              title="Control 3D Fox Character Animation Mode"
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {/* 3. INTERACTIVE 3D FOX CITY STAGE & RAYCAST CONTEXTUAL BUILDING PANEL */}
      <div className="relative w-full mb-2.5">
        <FoxCityView
          user={user}
          upgrades={upgrades}
          onPurchase={onPurchase}
          selectedBuildingId={selectedBuildingId}
          onSelectBuildingChange={handleSelectCityBuilding}
          onInspectUpgradeCard={(upgradeId) => {
            const targetUpgrade = upgrades.find((u) => u.id === upgradeId);
            if (targetUpgrade && targetUpgrade.category !== 'gift') {
              setActiveCategory(targetUpgrade.category);
              setSelectedHotspotId(upgradeId);
              setTimeout(() => {
                cardRefs.current[upgradeId]?.scrollIntoView({
                  behavior: 'smooth',
                  block: 'center',
                });
              }, 80);
            }
          }}
          timeMode={timeMode}
          autoCycleTime={autoCycleTime}
          cameraPreset={cameraPreset}
          resetSignal={resetSignal}
          qualityTier={qualityTier}
          mascotMode={mascotMode}
          isFullScreen={isFullScreenCity}
        />
      </div>

      {/* 4. BUILDING ICONS (UI) — Quick District Navigation Strip */}
      <div className="w-full bg-gradient-to-b from-[#141824]/95 to-[#0B0D14]/95 border border-amber-500/35 rounded-2xl p-1.5 mb-2.5 shadow-[0_6px_20px_rgba(0,0,0,0.6)]">
        <div className="grid grid-cols-4 sm:grid-cols-8 gap-1">
          {FOX_CITY_BUILDINGS.map((b) => {
            const st = buildingStates[b.id];
            const isSelected = selectedBuildingId === b.id;
            return (
              <button
                key={b.id}
                type="button"
                onClick={() => handleSelectCityBuilding(isSelected ? null : b.id, st)}
                className={`flex flex-col items-center justify-center py-1.5 px-1 rounded-xl border transition-all cursor-pointer active:scale-95 ${
                  isSelected
                    ? 'bg-gradient-to-b from-[#3A280E] to-[#1A1207] border-amber-300 text-amber-200 shadow-[0_0_12px_rgba(245,158,11,0.35)]'
                    : 'bg-[#0E111B]/90 border-amber-500/20 text-slate-300 hover:border-amber-400/50 hover:text-white'
                }`}
              >
                <div className="w-6 h-6 rounded-lg bg-[#1A160D] border border-amber-400/50 flex items-center justify-center text-amber-400 mb-0.5">
                  {renderDistrictIcon(b.iconType, 'w-3.5 h-3.5')}
                </div>
                <span className="text-[9px] font-extrabold truncate max-w-full leading-tight">
                  {b.shortName}
                </span>
                <span className="text-[8px] font-black text-amber-400 leading-tight">
                  Lv.{st?.displayLevel || b.defaultDisplayLevel}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 6. ENTERPRISE CATEGORIES — 3 Navigation Tabs */}
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
          <Building2
            className={`w-3.5 h-3.5 shrink-0 ${
              activeCategory === 'passive' ? 'text-amber-400' : 'text-slate-400'
            }`}
          />
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
          <Zap
            className={`w-3.5 h-3.5 shrink-0 ${
              activeCategory === 'tap' ? 'text-amber-400' : 'text-slate-400'
            }`}
          />
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
          <Users
            className={`w-3.5 h-3.5 shrink-0 ${
              activeCategory === 'special' ? 'text-amber-400' : 'text-slate-400'
            }`}
          />
          <span className="truncate">
            Clan & VIP ({Math.max(2, ownedSpecialCount)}/{Math.max(7, specialUpgrades.length)})
          </span>
        </button>
      </div>

      {/* 7. ALL BUSINESS & MINER UPGRADE CARDS */}
      <div className="space-y-2.5">
        {filteredUpgrades.map((up) => {
          const rawLevel = user.upgrades[up.id] || 0;
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

          const milestoneStep = rawLevel % 10;
          const milestoneFillPercent =
            rawLevel > 0 ? Math.max(12, milestoneStep * 10 || 100) : 8;

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
              <div className="absolute inset-x-8 top-0 h-[1px] bg-gradient-to-r from-transparent via-amber-400/50 to-transparent pointer-events-none" />

              {isJustUpgraded && (
                <div className="absolute -top-2.5 right-3 z-20 px-2.5 py-0.5 rounded-full bg-gradient-to-r from-emerald-400 to-teal-500 text-slate-950 font-black text-[10px] shadow-lg animate-bounce">
                  Upgraded to Lv {rawLevel}! +{up.baseBenefit.toLocaleString('en-US')}{' '}
                  {unitSuffix}
                </div>
              )}

              <div className="flex items-stretch gap-2.5">
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

                  <div className="absolute top-1 left-1 w-5 h-5 rounded-full bg-[#11141F]/90 border border-amber-400/70 flex items-center justify-center shadow-md">
                    {signatureCrop ? (
                      renderBadgeIcon(signatureCrop.badgeIcon, 'w-2.5 h-2.5')
                    ) : (
                      <Sparkles className="w-2.5 h-2.5 text-amber-300" />
                    )}
                  </div>
                </div>

                <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                  <div>
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

                    <p className="text-[10px] text-slate-300/85 truncate mt-0.5">
                      {up.description}
                    </p>

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
