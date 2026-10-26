import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Zap,
  TrendingUp,
  Sparkles,
  Flame,
  Shirt,
  Lock,
  Check,
  X,
  Clock,
  ChevronRight,
  UserPlus,
  ArrowUpCircle,
} from 'lucide-react';
import { UserGameState } from '../types/game.js';
import { sound } from '../utils/audio.js';
import { TelegramService } from '../utils/telegram.js';
import { foxMascotImg, foxGoldCoinImg } from '../assets/assets.js';
import { FoxGiftAvatar, getFoxGiftMetadata } from './FoxGiftAvatar.js';
import { FoxLevelOutfit, FOX_LEVEL_OUTFITS, getLevelOutfitMeta } from './FoxLevelOutfit.js';
import {
  FoxCircularAvatar,
  FoxCharacterHeroStage,
  FoxCharacterModal,
  getActiveCharacterTier,
  getActiveCharacterSkin,
  getUnlockedCharacterTierForLevel,
  loadSavedCharacterPrefs,
  saveCharacterPrefs,
  CharacterTierId,
  CharacterSkinId,
} from './FoxCharacterSystem.js';
import { FoxCrestIcon } from './Header.js';
import { NavTab } from './Navigation.js';

const HERO_DESIGN_ASSET = '/assets/aistudio/file_00000000fd4081f4ae9afe382ba27099_7e8f18cb.png';

interface FloatingNumber {
  id: number;
  x: number;
  y: number;
  value: number;
  isCrit: boolean;
}

interface TapRipple {
  id: number;
  x: number;
  y: number;
}

interface TapScreenProps {
  user: UserGameState;
  onTap: (count: number) => void;
  onOpenBoost: () => void;
  onOpenWheel?: () => void;
  onOpenDaily?: () => void;
  onNavigateTab?: (tab: NavTab) => void;
  onClaimQuickMission?: (missionId: string, reward: number) => void;
  equippedGiftId?: string | null;
  onOpenGifts?: () => void;
  offlineEarnings?: number;
  onOpenOfflineModal?: () => void;
  externalCharacterModalView?: 'profile' | 'collection' | null;
  onCloseExternalCharacterModal?: () => void;
  onUpdateCharacterPrefs?: (tierId: CharacterTierId, skinId: CharacterSkinId) => void;
}

function formatCompactNumber(num: number): string {
  if (num >= 1_000_000_000) {
    const val = num / 1_000_000_000;
    return `${val % 1 === 0 ? val.toFixed(0) : val.toFixed(1)}B`;
  }
  if (num >= 1_000_000) {
    const val = num / 1_000_000;
    return `${val % 1 === 0 ? val.toFixed(0) : val.toFixed(1)}M`;
  }
  if (num >= 1_000) {
    const val = num / 1_000;
    return `${val % 1 === 0 ? val.toFixed(0) : val.toFixed(1)}K`;
  }
  return num.toString();
}

export const TapScreen: React.FC<TapScreenProps> = React.memo(
  ({
    user,
    onTap,
    onOpenBoost,
    onOpenWheel,
    onOpenDaily,
    onNavigateTab,
    onClaimQuickMission,
    equippedGiftId,
    onOpenGifts,
    offlineEarnings = 0,
    onOpenOfflineModal,
    externalCharacterModalView = null,
    onCloseExternalCharacterModal,
    onUpdateCharacterPrefs,
  }) => {
    const [floatingNumbers, setFloatingNumbers] = useState<FloatingNumber[]>([]);
    const [tapRipples, setTapRipples] = useState<TapRipple[]>([]);
    const [isPressing, setIsPressing] = useState<boolean>(false);
    const [isOrbPressing, setIsOrbPressing] = useState<boolean>(false);
    const [tilt, setTilt] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
    const [turboRemaining, setTurboRemaining] = useState<number>(0);

    const [equippedTierId, setEquippedTierId] = useState<CharacterTierId>(() => {
      const saved = loadSavedCharacterPrefs(user.id);
      return getActiveCharacterTier(
        user.level,
        user.equippedCharacterTier || saved.tierId
      ).id;
    });
    const [equippedSkinId, setEquippedSkinId] = useState<CharacterSkinId>(() => {
      const saved = loadSavedCharacterPrefs(user.id);
      return getActiveCharacterSkin(
        user.level,
        user.equippedSkinId || saved.skinId
      ).id;
    });
    const [characterModalView, setCharacterModalView] = useState<'profile' | 'collection' | null>(null);
    const [levelUpBanner, setLevelUpBanner] = useState<{
      level: number;
      tierTitle: string;
      tierImg: string;
    } | null>(null);
    const [dailyCountdown, setDailyCountdown] = useState<string>('12:54:32');
    const [claimedQuickMissions, setClaimedQuickMissions] = useState<Record<string, boolean>>(() => {
      if (typeof window === 'undefined') return {};
      try {
        const todayKey = new Date().toISOString().slice(0, 10);
        const raw = localStorage.getItem(`fox_quick_missions_${user.id}_${todayKey}`);
        return raw ? JSON.parse(raw) : {};
      } catch {
        return {};
      }
    });

    const stageRef = useRef<HTMLDivElement>(null);
    const nextId = useRef<number>(1);
    const cleanupTimersRef = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());
    const prevLevelRef = useRef<number>(user.level);

    // Sync equipped character preferences when user changes
    useEffect(() => {
      const saved = loadSavedCharacterPrefs(user.id);
      const validTier = getActiveCharacterTier(
        user.level,
        user.equippedCharacterTier || saved.tierId || equippedTierId
      );
      const validSkin = getActiveCharacterSkin(
        user.level,
        user.equippedSkinId || saved.skinId || equippedSkinId
      );
      setEquippedTierId(validTier.id);
      setEquippedSkinId(validSkin.id);
    }, [user.id, user.level, user.equippedCharacterTier, user.equippedSkinId]);

    // Clean up pending particle timers on unmount
    useEffect(() => {
      const timers = cleanupTimersRef.current;
      return () => {
        timers.forEach((t) => clearTimeout(t));
        timers.clear();
      };
    }, []);

    // Live countdown timer for Daily Missions header
    useEffect(() => {
      const updateTimer = () => {
        const now = new Date();
        const tomorrow = new Date(now);
        tomorrow.setUTCHours(24, 0, 0, 0);
        const diffSec = Math.max(0, Math.floor((tomorrow.getTime() - now.getTime()) / 1000));
        const hrs = String(Math.floor(diffSec / 3600)).padStart(2, '0');
        const mins = String(Math.floor((diffSec % 3600) / 60)).padStart(2, '0');
        const secs = String(diffSec % 60).padStart(2, '0');
        setDailyCountdown(`${hrs}:${mins}:${secs}`);
      };
      updateTimer();
      const interval = setInterval(updateTimer, 1000);
      return () => clearInterval(interval);
    }, []);

    // Automatically detect level-ups and new Character Tier unlocks (Lv 1, 5, 10, 15, 20)
    useEffect(() => {
      if (user.level > prevLevelRef.current) {
        const unlockedTier = getUnlockedCharacterTierForLevel(user.level);
        const prevUnlockedTier = getUnlockedCharacterTierForLevel(prevLevelRef.current);

        // If player crossed into a new character tier (5, 10, 15, 20), auto-equip the new tier
        if (unlockedTier.id !== prevUnlockedTier.id) {
          setEquippedTierId(unlockedTier.id);
          saveCharacterPrefs(user.id, unlockedTier.id, equippedSkinId);
          if (onUpdateCharacterPrefs) {
            onUpdateCharacterPrefs(unlockedTier.id, equippedSkinId);
          }
        }

        setLevelUpBanner({
          level: user.level,
          tierTitle: `${unlockedTier.fullTitle} (${unlockedTier.outfitName})`,
          tierImg: unlockedTier.avatarUrl,
        });
        sound.playSuccess();
        TelegramService.triggerNotificationHaptic('success');

        const timer = setTimeout(() => {
          setLevelUpBanner(null);
        }, 5000);
        prevLevelRef.current = user.level;
        return () => clearTimeout(timer);
      }
      prevLevelRef.current = user.level;
    }, [user.level, user.id, equippedSkinId, onUpdateCharacterPrefs]);

    // Check turbo active countdown
    useEffect(() => {
      const checkTurbo = () => {
        const now = Date.now();
        if (user.boosters.turboActiveUntil > now) {
          setTurboRemaining(Math.ceil((user.boosters.turboActiveUntil - now) / 1000));
        } else {
          setTurboRemaining(0);
        }
      };
      checkTurbo();
      const interval = setInterval(checkTurbo, 500);
      return () => clearInterval(interval);
    }, [user.boosters.turboActiveUntil]);

    // Handle single or multi-finger pointer tap with zero delay + shockwave ripple
    const handleTapCoordinates = useCallback(
      (clientX: number, clientY: number, localX?: number, localY?: number) => {
        const isTurbo = turboRemaining > 0;
        if (!isTurbo && user.energy < 1) {
          sound.playTap();
          TelegramService.triggerHaptic('heavy');
          return;
        }

        const tapMultiplier = isTurbo ? 3 : 1;
        const tapValue = user.tapPower * tapMultiplier;

        sound.playCoin();
        TelegramService.triggerHaptic(isTurbo ? 'medium' : 'light');

        const id = nextId.current++;
        const newFloating: FloatingNumber = {
          id,
          x: clientX,
          y: clientY,
          value: tapValue,
          isCrit: isTurbo,
        };

        setFloatingNumbers((prev) => [...prev.slice(-11), newFloating]);

        if (localX !== undefined && localY !== undefined) {
          setTapRipples((prev) => [...prev.slice(-5), { id, x: localX, y: localY }]);
        }

        const timer = setTimeout(() => {
          setFloatingNumbers((prev) => prev.filter((item) => item.id !== id));
          setTapRipples((prev) => prev.filter((item) => item.id !== id));
          cleanupTimersRef.current.delete(timer);
        }, 720);
        cleanupTimersRef.current.add(timer);

        onTap(1);
      },
      [user.energy, user.tapPower, turboRemaining, onTap]
    );

    const handleStagePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
      // Ignore if clicking the top-left wardrobe button
      if ((e.target as HTMLElement).closest('[data-wardrobe-btn="true"]')) {
        return;
      }
      e.preventDefault();
      setIsPressing(true);

      let localX: number | undefined;
      let localY: number | undefined;

      if (stageRef.current) {
        const rect = stageRef.current.getBoundingClientRect();
        localX = e.clientX - rect.left;
        localY = e.clientY - rect.top;
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        const dx = Math.max(-1, Math.min(1, (e.clientX - centerX) / (rect.width / 2)));
        const dy = Math.max(-1, Math.min(1, (e.clientY - centerY) / (rect.height / 2)));
        setTilt({ x: dx * 7, y: -dy * 7 });
      }

      handleTapCoordinates(e.clientX, e.clientY, localX, localY);
    };

    const handleStagePointerUp = () => {
      setIsPressing(false);
      setIsOrbPressing(false);
      setTilt({ x: 0, y: 0 });
    };

    const handleQuickMissionClaim = (missionId: string, reward: number) => {
      if (claimedQuickMissions[missionId]) return;
      const next = { ...claimedQuickMissions, [missionId]: true };
      setClaimedQuickMissions(next);
      try {
        const todayKey = new Date().toISOString().slice(0, 10);
        localStorage.setItem(`fox_quick_missions_${user.id}_${todayKey}`, JSON.stringify(next));
      } catch {
        // Ignore storage error
      }
      sound.playSuccess();
      TelegramService.triggerNotificationHaptic('success');
      if (onClaimQuickMission) {
        onClaimQuickMission(missionId, reward);
      }
    };

    // Level progress percentage
    const currentLevelRange = user.nextLevelMinCoins - user.currentLevelMinCoins;
    const currentLevelProgress = Math.max(0, user.totalEarned - user.currentLevelMinCoins);
    const levelPercent =
      currentLevelRange > 0
        ? Math.min(100, Math.floor((currentLevelProgress / currentLevelRange) * 100))
        : 100;

    // Energy percentage
    const energyPercent = Math.min(100, Math.floor((user.energy / Math.max(1, user.maxEnergy)) * 100));
    const perSecondProfit = user.profitPerHour > 0 ? user.profitPerHour / 3600 : 0;
    const equippedMeta = equippedGiftId ? getFoxGiftMetadata(equippedGiftId) : null;

    const activeCharTier = getActiveCharacterTier(user.level, equippedTierId);
    const activeCharSkin = getActiveCharacterSkin(user.level, equippedSkinId);
    const effectiveModalView = characterModalView || externalCharacterModalView;

    const handleSelectCharacterTier = (nextTierId: CharacterTierId) => {
      const targetTier = getActiveCharacterTier(user.level, nextTierId);
      setEquippedTierId(targetTier.id);
      saveCharacterPrefs(user.id, targetTier.id, equippedSkinId);
      if (onUpdateCharacterPrefs) {
        onUpdateCharacterPrefs(targetTier.id, equippedSkinId);
      }
    };

    const handleSelectCharacterSkin = (nextSkinId: CharacterSkinId) => {
      const targetSkin = getActiveCharacterSkin(user.level, nextSkinId);
      setEquippedSkinId(targetSkin.id);
      saveCharacterPrefs(user.id, equippedTierId, targetSkin.id);
      if (onUpdateCharacterPrefs) {
        onUpdateCharacterPrefs(equippedTierId, targetSkin.id);
      }
    };

    // Daily Missions progress calculation
    const totalUpgradesCount = Object.values(user.upgrades || {}).reduce((acc, v) => acc + (v || 0), 0);
    const hasSpunToday =
      Date.now() - (user.boosters.lastWheelSpinTimestamp || 0) < 24 * 60 * 60 * 1000 &&
      (user.boosters.lastWheelSpinTimestamp || 0) > 0;

    const dailyMissions = [
      {
        id: 'tap_5000',
        title: 'Tap 5,000 times',
        current: Math.min(5000, user.totalTaps || 0),
        target: 5000,
        reward: 100000,
        icon: <FoxCrestIcon className="w-5 h-5" />,
        onGo: () => {
          if (stageRef.current) {
            stageRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        },
      },
      {
        id: 'upgrade_1',
        title: 'Upgrade 1 item',
        current: Math.min(1, totalUpgradesCount),
        target: 1,
        reward: 150000,
        icon: <ArrowUpCircle className="w-4 h-4 text-amber-400" />,
        onGo: () => onNavigateTab && onNavigateTab('upgrades'),
      },
      {
        id: 'invite_1',
        title: 'Invite 1 friend',
        current: Math.min(1, user.referralCount || 0),
        target: 1,
        reward: 200000,
        icon: <UserPlus className="w-4 h-4 text-amber-400" />,
        onGo: () => onNavigateTab && onNavigateTab('friends'),
      },
      {
        id: 'spin_wheel',
        title: 'Spin the Lucky Wheel',
        current: hasSpunToday ? 1 : 0,
        target: 1,
        reward: 100000,
        icon: (
          <svg viewBox="0 0 24 24" className="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="9" />
            <circle cx="12" cy="12" r="2.5" fill="currentColor" />
            <path d="M12 3v6.5M12 14.5V21M3 12h6.5M14.5 12H21M5.6 5.6l4.6 4.6M13.8 13.8l4.6 4.6M18.4 5.6l-4.6 4.6M10.2 13.8l-4.6 4.6" />
          </svg>
        ),
        onGo: () => onOpenWheel && onOpenWheel(),
      },
    ];

    return (
      <div className="w-full max-w-md mx-auto flex flex-col items-center px-3 pb-24 pt-1 select-none overflow-x-hidden">
        {/* Floating tap numbers with gold coin */}
        {floatingNumbers.map((num) => (
          <div
            key={num.id}
            style={{ left: `${num.x - 24}px`, top: `${num.y - 34}px` }}
            className={`fixed pointer-events-none z-50 font-black text-2xl tracking-wider animate-float-up will-change-transform flex items-center gap-1 ${
              num.isCrit
                ? 'text-yellow-300 drop-shadow-[0_0_14px_rgba(250,204,21,0.95)] scale-125'
                : 'text-amber-300 drop-shadow-[0_0_10px_rgba(245,158,11,0.85)]'
            }`}
          >
            <img src={foxGoldCoinImg} alt="" className="w-5 h-5 rounded-full object-cover shadow" />
            <span>+{num.value}</span>
            {num.isCrit && <span className="text-xs text-orange-400">🔥3X</span>}
          </div>
        ))}

        {/* Unclaimed Offline Earnings Quick-Collect Pill */}
        {Math.max(Math.floor(offlineEarnings || 0), Math.floor(user.unclaimedPassive || 0)) > 0 &&
          onOpenOfflineModal && (
            <button
              type="button"
              onClick={onOpenOfflineModal}
              className="w-full mb-2 py-1.5 px-3 rounded-xl bg-gradient-to-r from-amber-500/25 via-orange-500/20 to-emerald-500/25 border border-amber-400/60 flex items-center justify-between shadow-md shadow-amber-500/15 cursor-pointer hover:border-amber-300 transition active:scale-98"
            >
              <span className="flex items-center gap-2 text-xs font-extrabold text-amber-200">
                <img src={foxGoldCoinImg} alt="FOX" className="w-4 h-4 rounded-full animate-bounce" />
                <span>
                  Offline Profit: +
                  {Math.max(
                    Math.floor(offlineEarnings || 0),
                    Math.floor(user.unclaimedPassive || 0)
                  ).toLocaleString('en-US')}{' '}
                  FOX
                </span>
              </span>
              <span className="px-2.5 py-0.5 rounded-lg bg-amber-400 text-slate-950 font-black text-[11px]">
                Claim
              </span>
            </button>
          )}

        {/* Level-Up & Character Tier Unlock Celebration Banner */}
        {levelUpBanner && (
          <div className="w-full mb-2 bg-gradient-to-r from-amber-500 via-orange-500 to-yellow-500 text-slate-950 font-black text-xs py-2 px-3 rounded-xl flex items-center justify-between gap-2 shadow-lg shadow-amber-500/30 animate-bounce">
            <span className="flex items-center gap-2 min-w-0">
              <FoxCircularAvatar
                src={levelUpBanner.tierImg}
                alt={levelUpBanner.tierTitle}
                className="w-7 h-7 bg-slate-950 border border-slate-900"
              />
              <span className="truncate">
                Level {levelUpBanner.level} Reached! Active: {levelUpBanner.tierTitle}
              </span>
            </span>
            <button
              type="button"
              onClick={() => setLevelUpBanner(null)}
              className="text-slate-900/80 hover:text-slate-950 shrink-0"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Turbo Active Banner */}
        {turboRemaining > 0 && (
          <div className="w-full mb-2 bg-gradient-to-r from-orange-600 to-amber-500 text-white font-extrabold text-xs py-1.5 px-3 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-orange-600/30 animate-pulse">
            <Flame className="w-4 h-4 fill-white animate-bounce" />
            <span>TURBO FRENZY 3X REWARD! {turboRemaining}s LEFT</span>
          </div>
        )}

        {/* =====================================================================
            ROW 1: THREE GOLDEN-BORDERED STAT CARDS (Matches Screenshot)
           ===================================================================== */}
        <div className="w-full grid grid-cols-3 gap-2 mb-2.5">
          {/* Card 1: TAP POWER */}
          <button
            type="button"
            onClick={onOpenBoost}
            className="bg-gradient-to-b from-[#1A1610]/95 to-[#0D0F16]/98 border border-amber-500/45 hover:border-amber-400/80 rounded-2xl p-2 flex items-center gap-2 shadow-[0_4px_16px_rgba(0,0,0,0.5)] transition active:scale-98 cursor-pointer text-left"
          >
            {/* Circular golden hand-tap icon */}
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-gradient-to-b from-[#2A1F0D] to-[#120D06] border border-amber-400/60 flex items-center justify-center shrink-0 shadow-[0_0_10px_rgba(245,158,11,0.25)]">
              <svg viewBox="0 0 24 24" className="w-5 h-5 text-amber-400 fill-amber-400">
                <path d="M5 5l3 2.5L11 4l3 3.5L17 5v4H5V5zm6 6c.83 0 1.5.67 1.5 1.5v3.2l2.4 1c.7.3 1.1 1.05.95 1.8l-.55 3.3c-.2 1-.95 1.7-1.95 1.7H9.5c-.75 0-1.45-.38-1.85-1l-1.9-2.85c-.35-.5-.25-1.15.2-1.5.4-.35 1.05-.3 1.4.12l1.15 1.23V12.5c0-.83.67-1.5 1.5-1.5z" />
              </svg>
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[9px] sm:text-[10px] font-bold text-slate-300 uppercase tracking-wider truncate">
                TAP POWER
              </div>
              <div className="text-sm sm:text-base font-black text-amber-300 leading-tight tabular-nums">
                +{user.tapPower * (turboRemaining > 0 ? 3 : 1)}
              </div>
              <div className="text-[10px] font-extrabold text-emerald-400 flex items-center gap-0.5 leading-none mt-0.5">
                <span>+5%</span>
                <span>↗</span>
              </div>
            </div>
          </button>

          {/* Card 2: LEVEL X/20 & ENERGY (Opens Character Profile) */}
          <button
            type="button"
            onClick={() => setCharacterModalView('profile')}
            className="bg-gradient-to-b from-[#1A1610]/95 to-[#0D0F16]/98 border border-amber-500/45 hover:border-amber-400/80 rounded-2xl p-2 flex items-center gap-2 shadow-[0_4px_16px_rgba(0,0,0,0.5)] transition active:scale-98 cursor-pointer text-left"
          >
            {/* Active Character Tier Circular Avatar */}
            <FoxCircularAvatar
              tier={activeCharTier}
              className="w-9 h-9 sm:w-10 sm:h-10 bg-gradient-to-b from-[#2A1F0D] to-[#120D06] border border-amber-400/75 shadow-[0_0_12px_rgba(245,158,11,0.3)]"
            />
            <div className="min-w-0 flex-1 flex flex-col justify-center">
              <div className="text-[9px] sm:text-[10px] font-bold text-slate-200 uppercase tracking-wider truncate">
                LEVEL {user.level}/20
              </div>
              <div className="w-full h-2.5 bg-slate-900 border border-amber-500/35 rounded-full p-0.5 mt-1 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-200 shadow-[0_0_8px_rgba(250,204,21,0.85)] transition-all duration-300"
                  style={{ width: `${Math.max(12, levelPercent)}%` }}
                />
              </div>
              <div className="text-[10px] font-extrabold text-amber-100 flex items-center gap-1 mt-1 leading-none tabular-nums">
                <Zap className="w-3 h-3 fill-amber-400 text-amber-400 shrink-0" />
                <span>{energyPercent}%</span>
              </div>
            </div>
          </button>

          {/* Card 3: PER HOUR */}
          <div className="bg-gradient-to-b from-[#1A1610]/95 to-[#0D0F16]/98 border border-amber-500/45 rounded-2xl p-2 flex flex-col items-center justify-center shadow-[0_4px_16px_rgba(0,0,0,0.5)] text-center">
            <div className="text-[9px] sm:text-[10px] font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>PER HOUR</span>
            </div>
            <div className="text-xs sm:text-sm font-black text-emerald-400 mt-0.5 tracking-tight tabular-nums truncate w-full">
              +{user.profitPerHour.toLocaleString('en-US')}
            </div>
            <div className="text-[9px] sm:text-[10px] font-bold text-emerald-400/90 tabular-nums leading-none mt-1 truncate w-full">
              +
              {perSecondProfit >= 10
                ? Math.floor(perSecondProfit).toLocaleString('en-US')
                : perSecondProfit.toFixed(2)}
              /sec
            </div>
          </div>
        </div>

        {/* =====================================================================
            ROW 2: HERO FOX CHARACTER STAGE (Dynamic Multi-Level Character System)
           ===================================================================== */}
        <div
          ref={stageRef}
          onPointerDown={handleStagePointerDown}
          onPointerUp={handleStagePointerUp}
          onPointerCancel={handleStagePointerUp}
          onPointerLeave={handleStagePointerUp}
          style={{
            transform: `perspective(800px) rotateX(${tilt.y}deg) rotateY(${tilt.x}deg) scale(${
              isPressing ? 0.99 : 1
            })`,
          }}
          className="w-full aspect-[1.68/1] relative rounded-2xl overflow-hidden border border-amber-500/45 shadow-[0_12px_32px_rgba(0,0,0,0.85)] mb-2.5 cursor-pointer touch-none transition-transform duration-100 ease-out will-change-transform bg-gradient-to-b from-[#131A2E] via-[#0B0F1D] to-[#070A12]"
        >
          {/* Ambient Royal Throne Stage Background (Blurred & Darkened so Active Character Tier Stands Out) */}
          <img
            src={HERO_DESIGN_ASSET}
            alt=""
            draggable={false}
            style={{
              width: '112.4%',
              maxWidth: 'none',
              left: '-6.2%',
              top: '-88.4%',
              position: 'absolute',
              filter: 'blur(4px) brightness(0.38) saturate(1.1)',
            }}
            className="pointer-events-none select-none"
          />

          {/* Prominently Displayed Active Fox Character Tier with Idle & Tap Animations */}
          <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none">
            <FoxCharacterHeroStage
              tier={activeCharTier}
              skin={activeCharSkin}
              isTapped={isPressing}
              isTurbo={turboRemaining > 0}
            />
          </div>

          {/* Animated Rising Golden Embers */}
          <div className="absolute inset-0 z-10 pointer-events-none overflow-hidden">
            <span
              style={{ left: '22%', bottom: '18%', animationDelay: '0s' }}
              className="absolute w-1.5 h-1.5 rounded-full bg-amber-300 shadow-[0_0_8px_#FCD34D] animate-ember-rise"
            />
            <span
              style={{ left: '36%', bottom: '28%', animationDelay: '1.1s' }}
              className="absolute w-2 h-2 rounded-full bg-yellow-200 shadow-[0_0_10px_#FEF08A] animate-ember-rise"
            />
            <span
              style={{ left: '62%', bottom: '24%', animationDelay: '0.6s' }}
              className="absolute w-1.5 h-1.5 rounded-full bg-amber-400 shadow-[0_0_8px_#F59E0B] animate-ember-rise"
            />
            <span
              style={{ left: '48%', bottom: '14%', animationDelay: '1.9s' }}
              className="absolute w-1.5 h-1.5 rounded-full bg-amber-200 shadow-[0_0_8px_#FDE68A] animate-ember-rise"
            />
          </div>

          {/* Animated Floating 3D Golden Coins around the Fox Hero */}
          <div
            style={{ left: '24%', top: '36%', animationDelay: '0s' }}
            className="absolute z-10 w-6 h-6 rounded-full overflow-hidden shadow-[0_0_12px_rgba(251,191,36,0.8)] pointer-events-none animate-float-coin"
          >
            <img src={foxGoldCoinImg} alt="" className="w-full h-full object-cover" />
          </div>
          <div
            style={{ left: '66%', top: '34%', animationDelay: '1.4s' }}
            className="absolute z-10 w-7 h-7 rounded-full overflow-hidden shadow-[0_0_14px_rgba(251,191,36,0.85)] pointer-events-none animate-float-coin"
          >
            <img src={foxGoldCoinImg} alt="" className="w-full h-full object-cover" />
          </div>

          {/* Expanding Golden Shockwave Ripples on Tap */}
          {tapRipples.map((r) => (
            <div
              key={r.id}
              style={{ left: `${r.x}px`, top: `${r.y}px` }}
              className="absolute z-20 w-28 h-28 rounded-full border-2 border-amber-300/90 bg-amber-400/15 shadow-[0_0_25px_rgba(251,191,36,0.8)] pointer-events-none animate-tap-ripple"
            />
          ))}

          {/* Tap Flash Highlight */}
          {isPressing && (
            <div className="absolute inset-0 z-10 bg-amber-300/10 pointer-events-none transition-opacity" />
          )}

          {/* Top-Left Character Tier & Collection Trigger Badge */}
          <button
            type="button"
            data-wardrobe-btn="true"
            onClick={(e) => {
              e.stopPropagation();
              setCharacterModalView('collection');
            }}
            className="absolute top-2 left-2 z-20 bg-gradient-to-r from-[#14120E]/95 via-[#19150F]/95 to-[#12131C]/95 border border-amber-400/65 hover:border-amber-300 rounded-2xl px-2 py-1.5 flex items-center gap-2 shadow-[0_6px_20px_rgba(0,0,0,0.85)] transition active:scale-95 cursor-pointer"
            title="Open Character Profile & Collection"
          >
            <FoxCircularAvatar
              tier={activeCharTier}
              className="w-8 h-8 sm:w-9 sm:h-9 bg-gradient-to-b from-[#2E210B] to-[#110D06] border border-amber-400/70 shadow-[0_0_10px_rgba(245,158,11,0.35)]"
            />
            <div className="text-left pr-1">
              <div className="text-[11px] sm:text-xs font-extrabold text-white leading-tight">
                {activeCharTier.fullTitle}
              </div>
              <div className="text-[9px] sm:text-[10px] font-bold text-amber-300 leading-tight mt-0.5">
                {user.level >= 20
                  ? 'Max Level • Tap to View Collection'
                  : `Next level: ${formatCompactNumber(user.nextLevelMinCoins || 5_000)}`}
              </div>
            </div>
          </button>

          {/* Equipped Collectible Gift Companion Badge (Bottom-Left if equipped) */}
          {equippedGiftId && equippedMeta && (user.upgrades[equippedGiftId] || 0) > 0 && (
            <button
              type="button"
              data-wardrobe-btn="true"
              onClick={(e) => {
                e.stopPropagation();
                if (onOpenGifts) onOpenGifts();
              }}
              className="absolute bottom-2 left-2 z-20 p-1 pr-2.5 rounded-2xl bg-slate-950/95 border border-amber-400/60 shadow-xl flex items-center gap-1.5 cursor-pointer hover:scale-105 transition"
            >
              <FoxGiftAvatar giftId={equippedGiftId} size="sm" />
              <div className="text-left">
                <span className="text-[9px] font-bold text-amber-300 block leading-none">
                  {equippedMeta.rarity} Gift
                </span>
                <span className="text-[10px] font-black text-white leading-tight block">
                  {equippedMeta.backdropName}
                </span>
              </div>
            </button>
          )}

          {/* Bottom-Right Glowing Golden "TAP" Orb Button (Matches Screenshot Position & Design) */}
          <div
            onPointerDown={() => setIsOrbPressing(true)}
            className={`absolute bottom-1.5 right-2 z-20 w-[104px] h-[104px] sm:w-[116px] sm:h-[116px] rounded-full flex items-center justify-center transition-transform duration-75 ${
              isOrbPressing || isPressing ? 'scale-92' : 'hover:scale-103'
            }`}
          >
            {/* Outer Golden Halo Glow */}
            <div className="absolute -inset-2 rounded-full bg-amber-500/25 blur-md animate-pulse-glow pointer-events-none" />

            {/* Rotating Dashed Golden Magic Ring */}
            <div className="absolute inset-0 rounded-full border-2 border-dashed border-amber-300/60 animate-spin-slow pointer-events-none" />

            {/* Outer Solid Golden Ring */}
            <div className="w-full h-full rounded-full p-1.5 bg-gradient-to-b from-amber-300 via-amber-500 to-amber-700 shadow-[0_0_25px_rgba(245,158,11,0.65)]">
              {/* Inner Dark Obsidian & Gold Core */}
              <div className="w-full h-full rounded-full bg-gradient-to-b from-[#2B1E0B] via-[#140E05] to-[#080603] border-2 border-amber-300/80 flex flex-col items-center justify-center shadow-inner relative overflow-hidden">
                {/* Subtle radial highlight */}
                <div
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    background:
                      'radial-gradient(circle at 50% 30%, rgba(251, 191, 36, 0.28), transparent 70%)',
                  }}
                />
                <FoxCrestIcon className="w-11 h-11 sm:w-12 sm:h-12 drop-shadow-[0_0_10px_rgba(251,191,36,0.7)]" />
                <span className="text-xs sm:text-sm font-black tracking-widest bg-gradient-to-b from-amber-100 via-amber-300 to-amber-500 bg-clip-text text-transparent drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] -mt-0.5">
                  TAP
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* =====================================================================
            ROW 3: BENTO GRID (DAILY MISSIONS LEFT + LUCKY WHEEL & DAILY GIFT RIGHT)
           ===================================================================== */}
        <div className="w-full grid grid-cols-11 gap-2 mb-2.5 items-stretch">
          {/* Left Column (7 cols): DAILY MISSIONS */}
          <div className="col-span-7 bg-gradient-to-b from-[#151722]/98 to-[#0B0D14]/98 border border-amber-500/45 rounded-2xl p-2.5 flex flex-col justify-between shadow-[0_8px_24px_rgba(0,0,0,0.65)]">
            {/* Daily Missions Header */}
            <div className="flex items-center justify-between gap-1 pb-2 border-b border-amber-500/20">
              <div className="flex items-center gap-1.5 min-w-0">
                <div className="w-5 h-5 rounded-md bg-amber-500/20 border border-amber-400/50 flex items-center justify-center text-amber-400 shrink-0">
                  <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-current">
                    <path d="M19 3h-4.18C14.4 1.84 13.3 1 12 1c-1.3 0-2.4.84-2.82 2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 0c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm2 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z" />
                  </svg>
                </div>
                <span className="text-[11px] sm:text-xs font-black tracking-wide text-white uppercase truncate">
                  DAILY MISSIONS
                </span>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                {/* Countdown Timer Pill */}
                <div className="px-1.5 py-0.5 rounded-full bg-[#181B26] border border-slate-700/80 flex items-center gap-1 text-[9px] font-bold text-slate-200 tabular-nums">
                  <Clock className="w-2.5 h-2.5 text-amber-400" />
                  <span>{dailyCountdown}</span>
                </div>

                {/* View All Button */}
                <button
                  type="button"
                  onClick={() => onNavigateTab && onNavigateTab('tasks')}
                  className="text-[10px] font-bold text-amber-300 hover:text-amber-200 flex items-center cursor-pointer whitespace-nowrap"
                >
                  <span>View All</span>
                  <ChevronRight className="w-3 h-3" />
                </button>
              </div>
            </div>

            {/* 4 Mission Rows */}
            <div className="flex flex-col gap-1.5 mt-2 flex-1 justify-between">
              {dailyMissions.map((m) => {
                const pct = Math.min(100, Math.floor((m.current / m.target) * 100));
                const isReady = m.current >= m.target;
                const isClaimed = Boolean(claimedQuickMissions[m.id]);

                return (
                  <div
                    key={m.id}
                    className="bg-gradient-to-r from-[#161925]/95 to-[#10131C]/95 border border-slate-800/90 hover:border-amber-500/35 rounded-xl p-1.5 flex items-center justify-between gap-1.5 transition"
                  >
                    {/* Left Icon Circle */}
                    <div className="w-8 h-8 rounded-full bg-gradient-to-b from-[#251C0D] to-[#0F0C07] border border-amber-400/55 flex items-center justify-center shrink-0 shadow-sm">
                      {m.icon}
                    </div>

                    {/* Middle Title + Progress Bar */}
                    <div className="min-w-0 flex-1">
                      <div className="text-[10px] sm:text-[11px] font-bold text-slate-100 truncate">
                        {m.title}
                      </div>
                      <div className="flex items-center gap-1.5 mt-1">
                        <div className="flex-1 h-2 bg-slate-800/90 rounded-full overflow-hidden p-0.2">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-200 transition-all duration-300"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="text-[8px] sm:text-[9px] font-bold text-slate-300 tabular-nums shrink-0">
                          {m.current.toLocaleString('en-US')} / {m.target.toLocaleString('en-US')}
                        </span>
                      </div>
                    </div>

                    {/* Reward + Go/Claim Button */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <div className="flex items-center gap-0.5 text-[9px] sm:text-[10px] font-extrabold text-amber-300 tabular-nums">
                        <img src={foxGoldCoinImg} alt="" className="w-3.5 h-3.5 rounded-full object-cover" />
                        <span>+{m.reward.toLocaleString('en-US')}</span>
                      </div>

                      {isClaimed ? (
                        <span className="px-2 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-black text-[9px]">
                          Done
                        </span>
                      ) : isReady ? (
                        <button
                          type="button"
                          onClick={() => handleQuickMissionClaim(m.id, m.reward)}
                          className="px-2.5 py-1 rounded-full bg-gradient-to-b from-amber-300 to-amber-500 text-slate-950 font-black text-[10px] shadow cursor-pointer active:scale-95 transition"
                        >
                          Claim
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={m.onGo}
                          className="px-2.5 py-1 rounded-full bg-[#1C160B] hover:bg-[#2A2010] border border-amber-400/60 text-amber-200 font-bold text-[10px] cursor-pointer active:scale-95 transition"
                        >
                          Go
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Column (4 cols): Stacked Lucky Wheel & Daily Gift Cards */}
          <div className="col-span-4 flex flex-col gap-2 justify-between">
            {/* Top Card: Lucky Wheel */}
            <div className="flex-1 bg-gradient-to-b from-[#1A160F]/95 to-[#0D0F17]/98 border border-amber-500/45 rounded-2xl p-2.5 flex flex-col items-center justify-between text-center shadow-[0_8px_24px_rgba(0,0,0,0.65)] relative overflow-hidden">
              {/* Glowing Colorful Wheel SVG */}
              <div className="relative w-14 h-14 sm:w-16 sm:h-16 flex items-center justify-center my-0.5">
                <div className="absolute inset-0 rounded-full bg-amber-500/25 blur-md animate-pulse-glow pointer-events-none" />
                <svg
                  viewBox="0 0 100 100"
                  className="w-full h-full animate-spin-slow drop-shadow-[0_0_10px_rgba(245,158,11,0.5)]"
                >
                  {/* 8 Colorful Wheel Segments */}
                  <path d="M50 50 L50 6 A44 44 0 0 1 81 19 Z" fill="#EF4444" />
                  <path d="M50 50 L81 19 A44 44 0 0 1 94 50 Z" fill="#F59E0B" />
                  <path d="M50 50 L94 50 A44 44 0 0 1 81 81 Z" fill="#10B981" />
                  <path d="M50 50 L81 81 A44 44 0 0 1 50 94 Z" fill="#3B82F6" />
                  <path d="M50 50 L50 94 A44 44 0 0 1 19 81 Z" fill="#8B5CF6" />
                  <path d="M50 50 L19 81 A44 44 0 0 1 6 50 Z" fill="#EC4899" />
                  <path d="M50 50 L6 50 A44 44 0 0 1 19 19 Z" fill="#F97316" />
                  <path d="M50 50 L19 19 A44 44 0 0 1 50 6 Z" fill="#EAB308" />
                  {/* Golden Outer Ring & Studs */}
                  <circle cx="50" cy="50" r="44" fill="none" stroke="#FDE047" strokeWidth="5" />
                  <circle cx="50" cy="50" r="44" fill="none" stroke="#B45309" strokeWidth="2" strokeDasharray="4 8" />
                  {/* Center Golden Hub */}
                  <circle cx="50" cy="50" r="11" fill="#1E1B18" stroke="#FDE047" strokeWidth="3" />
                  <circle cx="50" cy="50" r="5" fill="#F59E0B" />
                </svg>
              </div>

              <div>
                <h4 className="text-xs sm:text-sm font-black text-amber-300 leading-tight">
                  Lucky Wheel
                </h4>
                <p className="text-[9px] sm:text-[10px] text-slate-300 leading-tight mt-0.5">
                  Spin and win amazing rewards!
                </p>
              </div>

              <button
                type="button"
                onClick={onOpenWheel}
                className="w-full mt-1.5 py-1.5 px-3 rounded-full bg-gradient-to-b from-amber-200 via-amber-400 to-amber-600 hover:from-amber-100 hover:to-amber-500 text-slate-950 font-black text-xs shadow-[0_0_14px_rgba(245,158,11,0.45)] transition active:scale-95 cursor-pointer"
              >
                Spin
              </button>
            </div>

            {/* Bottom Card: Daily Gift */}
            <div className="flex-1 bg-gradient-to-b from-[#1A160F]/95 to-[#0D0F17]/98 border border-amber-500/45 rounded-2xl p-2.5 flex flex-col items-center justify-between text-center shadow-[0_8px_24px_rgba(0,0,0,0.65)] relative overflow-hidden">
              {user.canClaimDaily && (
                <span className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-rose-600 text-white font-black text-[10px] flex items-center justify-center shadow animate-bounce">
                  !
                </span>
              )}

              {/* 3D Golden Gift Box Illustration */}
              <div className="relative w-14 h-14 sm:w-16 sm:h-16 flex items-center justify-center my-0.5 animate-float-coin">
                <div className="absolute inset-0 rounded-full bg-amber-500/25 blur-md pointer-events-none" />
                <svg viewBox="0 0 64 64" className="w-13 h-13 drop-shadow-[0_4px_10px_rgba(245,158,11,0.45)]">
                  <defs>
                    <linearGradient id="gift_gold_box" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#FEF08A" />
                      <stop offset="50%" stopColor="#F59E0B" />
                      <stop offset="100%" stopColor="#92400E" />
                    </linearGradient>
                    <linearGradient id="gift_dark_body" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="#451A03" />
                      <stop offset="100%" stopColor="#1C0A00" />
                    </linearGradient>
                  </defs>
                  {/* Ribbon Bow */}
                  <path
                    d="M32 16 C24 6, 14 12, 22 20 C26 22, 30 20, 32 16 Z M32 16 C40 6, 50 12, 42 20 C38 22, 34 20, 32 16 Z"
                    fill="url(#gift_gold_box)"
                  />
                  {/* Box Lid */}
                  <rect x="10" y="18" width="44" height="11" rx="3" fill="url(#gift_gold_box)" />
                  {/* Box Base */}
                  <rect
                    x="13"
                    y="29"
                    width="38"
                    height="25"
                    rx="3"
                    fill="url(#gift_dark_body)"
                    stroke="url(#gift_gold_box)"
                    strokeWidth="2"
                  />
                  {/* Vertical & Horizontal Golden Ribbons */}
                  <rect x="28" y="18" width="8" height="36" fill="url(#gift_gold_box)" />
                  <rect x="13" y="38" width="38" height="6" fill="url(#gift_gold_box)" />
                </svg>
              </div>

              <div>
                <h4 className="text-xs sm:text-sm font-black text-amber-300 leading-tight">
                  Daily Gift
                </h4>
                <p className="text-[9px] sm:text-[10px] text-slate-300 leading-tight mt-0.5">
                  Free rewards for you!
                </p>
              </div>

              <button
                type="button"
                onClick={onOpenDaily}
                className="w-full mt-1.5 py-1.5 px-3 rounded-full bg-gradient-to-b from-amber-200 via-amber-400 to-amber-600 hover:from-amber-100 hover:to-amber-500 text-slate-950 font-black text-xs shadow-[0_0_14px_rgba(245,158,11,0.45)] transition active:scale-95 cursor-pointer"
              >
                Claim
              </button>
            </div>
          </div>
        </div>

        {/* =====================================================================
            ROW 4: COMMUNITY BANNER ("ONE COMMUNITY. ONE VISION. FOX!")
           ===================================================================== */}
        <button
          type="button"
          onClick={() => onNavigateTab && onNavigateTab('friends')}
          className="w-full aspect-[6.6/1] relative rounded-2xl overflow-hidden border border-amber-400/60 shadow-[0_6px_22px_rgba(0,0,0,0.75)] cursor-pointer active:scale-99 transition group bg-[#120F0A]"
        >
          {/* Exact Community Banner Artwork from Reference Screenshot */}
          <img
            src={HERO_DESIGN_ASSET}
            alt="One Community. One Vision. Fox!"
            draggable={false}
            style={{
              width: '113.6%',
              maxWidth: 'none',
              left: '-7.0%',
              top: '-1101.3%',
              position: 'absolute',
            }}
            className="pointer-events-none select-none group-hover:scale-102 transition-transform duration-300"
          />

          {/* Animated Golden Shimmer Light Sweep */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div className="w-1/3 h-full bg-gradient-to-r from-transparent via-amber-200/20 to-transparent animate-shimmer-sweep" />
          </div>
        </button>

        {/* =====================================================================
            FOXCOIN MULTI-LEVEL CHARACTER PROFILE & COLLECTION MODAL
           ===================================================================== */}
        <FoxCharacterModal
          isOpen={effectiveModalView !== null}
          onClose={() => {
            setCharacterModalView(null);
            if (onCloseExternalCharacterModal) {
              onCloseExternalCharacterModal();
            }
          }}
          user={user}
          equippedTierId={activeCharTier.id}
          equippedSkinId={activeCharSkin.id}
          onSelectTier={handleSelectCharacterTier}
          onSelectSkin={handleSelectCharacterSkin}
          initialView={effectiveModalView || 'profile'}
        />
      </div>
    );
  }
);
