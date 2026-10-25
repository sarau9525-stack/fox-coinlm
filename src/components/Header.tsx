import React from 'react';
import { Volume2, VolumeX, Settings, Zap, ShieldCheck, ArrowLeftRight, TrendingUp, Plus } from 'lucide-react';
import { UserGameState } from '../types/game.js';
import { foxGoldCoinImg } from '../assets/assets.js';
import { AdminTabType } from './AdminTelegramSetup.js';
import { NavTab } from './Navigation.js';

interface HeaderProps {
  user: UserGameState;
  activeTab?: NavTab;
  isAdmin?: boolean;
  onOpenSettings: () => void;
  onOpenBoost: () => void;
  onOpenDaily: () => void;
  onOpenWheel?: () => void;
  onOpenGifts?: () => void;
  onOpenTrade?: () => void;
  isMuted: boolean;
  onToggleSound: () => void;
  onOpenAdminSetup?: (tab?: AdminTabType) => void;
}

export const FoxCrestIcon: React.FC<{ className?: string }> = ({ className = 'w-8 h-8' }) => (
  <svg viewBox="0 0 64 64" fill="none" className={className}>
    <defs>
      <linearGradient id="fox_shield_gold" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#FEF08A" />
        <stop offset="45%" stopColor="#F59E0B" />
        <stop offset="100%" stopColor="#B45309" />
      </linearGradient>
      <linearGradient id="fox_face_grad" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#FDE047" />
        <stop offset="50%" stopColor="#F97316" />
        <stop offset="100%" stopColor="#D97706" />
      </linearGradient>
    </defs>
    {/* Shield Outer */}
    <path
      d="M32 4 L56 12 V30 C56 45 45 55 32 60 C19 55 8 45 8 30 V12 L32 4 Z"
      fill="#0D0F17"
      stroke="url(#fox_shield_gold)"
      strokeWidth="3.5"
    />
    {/* Fox Ears & Head */}
    <path
      d="M16 14 L25 24 L32 21 L39 24 L48 14 L46 34 L32 50 L18 34 L16 14 Z"
      fill="url(#fox_face_grad)"
      stroke="#FEF08A"
      strokeWidth="1.5"
      strokeLinejoin="round"
    />
    {/* Inner Ear Details */}
    <polygon points="19,18 24,25 20,29" fill="#0D0F17" />
    <polygon points="45,18 40,25 44,29" fill="#0D0F17" />
    {/* Fierce Eyes */}
    <polygon points="22,33 28,36 23,37" fill="#0D0F17" />
    <polygon points="42,33 36,36 41,37" fill="#0D0F17" />
    {/* Nose Tip */}
    <polygon points="29,44 35,44 32,48" fill="#0D0F17" />
  </svg>
);

export const Header: React.FC<HeaderProps> = React.memo(
  ({
    user,
    activeTab = 'home',
    isAdmin = false,
    onOpenSettings,
    onOpenBoost,
    onOpenDaily,
    onOpenGifts,
    onOpenTrade,
    isMuted,
    onToggleSound,
    onOpenAdminSetup,
  }) => {
    const showAdminControls = Boolean(user.isAdmin || isAdmin);
    const isMineTab = activeTab === 'upgrades' || activeTab === 'tasks';

    // Calculate level progress percentage for the profile bar
    const levelFloor = user.currentLevelMinCoins || 0;
    const levelCeil = user.nextLevelMinCoins || levelFloor + 5000;
    const levelSpan = Math.max(1, levelCeil - levelFloor);
    const levelProgress =
      user.level >= 10
        ? 100
        : Math.min(100, Math.max(12, Math.floor(((user.totalEarned - levelFloor) / levelSpan) * 100)));

    const incomePerSec =
      user.profitPerHour > 0
        ? user.profitPerHour >= 3600
          ? Math.floor(user.profitPerHour / 3600).toLocaleString('en-US')
          : (user.profitPerHour / 3600).toFixed(1)
        : '0';

    return (
      <header className="w-full max-w-md mx-auto pt-2 px-2.5 sm:px-3 pb-1 flex flex-col gap-1.5 text-white z-20 select-none">
        {/* Row 1: Top Brand & Action Bar */}
        <div className="w-full bg-gradient-to-b from-[#141722]/95 to-[#0C0E15]/95 border border-amber-500/30 rounded-2xl px-2 sm:px-2.5 py-1.5 flex items-center justify-between gap-1.5 shadow-[0_8px_24px_rgba(0,0,0,0.6)] min-w-0">
          {/* Brand Zone: Fox Shield + FOXCOIN + Crown */}
          <div className="flex items-center gap-1 sm:gap-1.5 min-w-0 shrink">
            <FoxCrestIcon className="w-7 h-7 sm:w-8 sm:h-8 shrink-0 drop-shadow-[0_0_8px_rgba(245,158,11,0.45)]" />
            <span className="text-sm sm:text-base font-black tracking-wider bg-gradient-to-b from-amber-100 via-amber-400 to-amber-600 bg-clip-text text-transparent drop-shadow-[0_2px_6px_rgba(245,158,11,0.3)] truncate">
              FOXCOIN
            </span>
            {/* Golden Crown SVG */}
            <svg
              viewBox="0 0 24 24"
              className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400 fill-amber-400 shrink-0 drop-shadow-[0_0_6px_rgba(251,191,36,0.5)]"
            >
              <path d="M2 19h20v2H2v-2zm0-11l5 4 5-6 5 6 5-4v9H2V8z" />
            </svg>
          </div>

          {/* Action Icons Row — Compact at 360px so Admin badge + 5 utility icons never overlap */}
          <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
            {/* Admin Button (Compact icon on narrow screens, icon+label on wider screens) */}
            {showAdminControls && onOpenAdminSetup && (
              <button
                type="button"
                onClick={() => onOpenAdminSetup('users')}
                className="h-7 sm:h-8 px-1.5 sm:px-2 rounded-xl bg-gradient-to-b from-purple-900/90 to-indigo-950/90 border border-purple-400/50 text-purple-200 transition active:scale-95 flex items-center justify-center gap-1 cursor-pointer shadow-sm shrink-0"
                title="Admin Panel"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span className="hidden min-[400px]:inline text-[10px] font-black leading-none">
                  Admin
                </span>
              </button>
            )}

            {/* 1. Golden Gift Box Button */}
            <button
              type="button"
              onClick={onOpenGifts || onOpenDaily}
              className="relative w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-gradient-to-b from-[#251C0E] to-[#110E09] border border-amber-500/50 hover:border-amber-400 flex items-center justify-center transition active:scale-95 cursor-pointer shadow-[0_0_10px_rgba(245,158,11,0.15)] shrink-0"
              title="Fox Gifts"
            >
              <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400 fill-amber-400">
                <path d="M20 6h-2.18c.11-.31.18-.65.18-1a2.996 2.996 0 00-5.5-1.65l-.5.67-.5-.68C10.96 2.54 10.05 2 9 2 7.34 2 6 3.34 6 5c0 .35.07.69.18 1H4c-1.11 0-1.99.89-1.99 2L2 19c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2zm-5-2c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zM9 4c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm11 15H4v-2h16v2zm0-5H4V8h5.08L7 10.83 8.62 12 11 8.76l1-1.36 1 1.36L15.38 12 17 10.83 14.92 8H20v6z" />
              </svg>
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-rose-500 rounded-full border border-[#0B0D14] shadow" />
            </button>

            {/* 2. Calendar 17 Daily Reward Button */}
            <button
              type="button"
              onClick={onOpenDaily}
              className="relative w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-gradient-to-b from-[#251C0E] to-[#110E09] border border-amber-500/50 hover:border-amber-400 flex flex-col items-center justify-center transition active:scale-95 cursor-pointer shadow-[0_0_10px_rgba(245,158,11,0.15)] overflow-hidden shrink-0"
              title="Daily Reward"
            >
              <div className="w-4 sm:w-4.5 rounded-[4px] overflow-hidden border border-slate-300/40 bg-white text-slate-950 flex flex-col items-center leading-none shadow-sm">
                <div className="w-full h-1 bg-rose-600" />
                <span className="text-[8px] sm:text-[9px] font-black py-[1px] tracking-tighter">17</span>
              </div>
              {user.canClaimDaily && (
                <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-rose-500 rounded-full border border-[#0B0D14] shadow animate-pulse" />
              )}
            </button>

            {/* 3. Boost Lightning Button */}
            <button
              type="button"
              onClick={onOpenBoost}
              className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gradient-to-b from-[#251C0E] to-[#110E09] border border-amber-500/50 hover:border-amber-400 flex items-center justify-center text-amber-400 transition active:scale-95 cursor-pointer shadow-[0_0_10px_rgba(245,158,11,0.15)] shrink-0"
              title="Boosters"
            >
              <Zap className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-amber-400 text-amber-300" />
            </button>

            {/* 4. Sound Toggle Button */}
            <button
              type="button"
              onClick={onToggleSound}
              className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#131722] hover:bg-[#1B2030] border border-slate-700/80 flex items-center justify-center text-amber-400 transition active:scale-95 cursor-pointer shrink-0"
              title={isMuted ? 'Unmute Sound' : 'Mute Sound'}
            >
              {isMuted ? (
                <VolumeX className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-500" />
              ) : (
                <Volume2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400" />
              )}
            </button>

            {/* 5. Settings Gear Button */}
            <button
              type="button"
              onClick={onOpenSettings}
              className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#131722] hover:bg-[#1B2030] border border-slate-700/80 flex items-center justify-center text-slate-200 transition active:scale-95 cursor-pointer shrink-0"
              title="Settings"
            >
              <Settings className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-200" />
            </button>
          </div>
        </div>

        {/* Row 2: Player Profile, Full FOX Balance & Hourly Income Strip */}
        {isMineTab ? (
          <div className="w-full flex items-stretch gap-1.5 min-w-0">
            {/* Left Card: Avatar + Username + Rank/Level + Gold Progress Bar (flexible, shrinks first so balance never truncates) */}
            <div className="flex-1 min-w-0 bg-gradient-to-b from-[#151824]/95 to-[#0C0E16]/95 border border-amber-500/30 rounded-xl px-2 py-1.5 flex items-center gap-1.5 shadow-[0_4px_14px_rgba(0,0,0,0.5)]">
              <div className="relative shrink-0">
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full p-0.5 bg-gradient-to-tr from-amber-600 via-amber-400 to-yellow-200 shadow-[0_0_10px_rgba(245,158,11,0.35)]">
                  <div className="w-full h-full rounded-full bg-[#0B0D14] flex items-center justify-center overflow-hidden border border-amber-300/30">
                    <FoxCrestIcon className="w-5 h-5 sm:w-6 sm:h-6" />
                  </div>
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-[#1D9BF0] rounded-full flex items-center justify-center text-[7px] font-black text-white border border-[#0B0D14]">
                  ✓
                </span>
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1 min-w-0">
                  <span className="font-extrabold text-[11px] sm:text-xs text-white truncate">
                    {user.displayName || user.username}
                  </span>
                </div>
                <div className="text-[9px] sm:text-[10px] font-bold text-amber-300 truncate leading-tight mt-0.5">
                  {user.levelName} <span className="text-slate-400">•</span>{' '}
                  <span className="text-slate-100">Lv {user.level}</span>
                </div>
                {/* Gold Progress Bar */}
                <div className="w-full h-1.5 bg-[#080A10] rounded-full overflow-hidden border border-amber-500/30 mt-1">
                  <div
                    className="h-full bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-300 rounded-full"
                    style={{ width: `${levelProgress}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Center Card: FOX Balance + Golden [+] Button (shrink-0 & whitespace-nowrap so balance NEVER truncates to "2,...") */}
            <div className="shrink-0 bg-gradient-to-b from-[#17150F]/95 to-[#0D0F17]/95 border border-amber-500/35 rounded-xl px-2 py-1.5 flex items-center justify-between gap-1.5 shadow-[0_4px_14px_rgba(0,0,0,0.5)]">
              <div className="flex items-center gap-1">
                <img
                  src={foxGoldCoinImg}
                  alt="FOX"
                  className="w-4 h-4 sm:w-5 sm:h-5 rounded-full object-cover shrink-0 drop-shadow-[0_0_6px_rgba(245,158,11,0.5)]"
                />
                <span className="text-xs sm:text-sm font-black text-white tabular-nums whitespace-nowrap">
                  {Math.floor(user.balance).toLocaleString('en-US')}
                </span>
              </div>
              <button
                type="button"
                onClick={onOpenTrade || onOpenBoost}
                className="w-5 h-5 rounded-md bg-gradient-to-b from-amber-300 via-amber-500 to-orange-600 text-slate-950 flex items-center justify-center font-black shadow-[0_0_8px_rgba(245,158,11,0.4)] hover:brightness-110 active:scale-95 transition shrink-0 cursor-pointer"
                title="Add / Trade FOX"
              >
                <Plus className="w-3.5 h-3.5 stroke-[3]" />
              </button>
            </div>

            {/* Right Card: Hourly Income & Per-Sec Yield */}
            <div className="shrink-0 bg-gradient-to-b from-[#151824]/95 to-[#0C0E16]/95 border border-amber-500/30 rounded-xl px-2 py-1 flex flex-col justify-center items-end shadow-[0_4px_14px_rgba(0,0,0,0.5)]">
              <div className="flex items-center gap-1 text-[8px] sm:text-[9px] font-bold text-slate-300 leading-none whitespace-nowrap">
                <TrendingUp className="w-2.5 h-2.5 text-emerald-400 shrink-0" />
                <span>Hourly Income</span>
              </div>
              <div className="text-[11px] sm:text-xs font-black text-emerald-400 tabular-nums whitespace-nowrap leading-tight mt-0.5 drop-shadow-[0_0_6px_rgba(52,211,153,0.25)]">
                +{user.profitPerHour.toLocaleString('en-US')}
              </div>
              <div className="text-[8px] sm:text-[9px] font-bold text-slate-300/90 tabular-nums whitespace-nowrap leading-none mt-0.5">
                +{incomePerSec}/sec
              </div>
            </div>
          </div>
        ) : (
          <div className="w-full px-1 flex items-center justify-between gap-2 min-w-0">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              {/* Circular Golden Ring Avatar with Verified Checkmark */}
              <div className="relative shrink-0">
                <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full p-0.5 bg-gradient-to-tr from-amber-600 via-amber-400 to-yellow-200 shadow-[0_0_14px_rgba(245,158,11,0.4)]">
                  <div className="w-full h-full rounded-full bg-[#0B0D14] flex items-center justify-center overflow-hidden border border-amber-300/30">
                    <FoxCrestIcon className="w-7 h-7 sm:w-8 sm:h-8" />
                  </div>
                </div>
                <span
                  title="Verified Player"
                  className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-[#1D9BF0] rounded-full flex items-center justify-center text-[8px] font-black text-white border-2 border-[#0B0D14] shadow"
                >
                  ✓
                </span>
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="font-extrabold text-sm sm:text-base tracking-tight text-white truncate">
                    {user.displayName || user.username}
                  </span>
                  <span className="w-3.5 h-3.5 bg-[#1D9BF0] rounded-full flex items-center justify-center text-[8px] font-black text-white shrink-0 shadow-sm">
                    ✓
                  </span>
                  {showAdminControls && (
                    <span className="px-1.5 py-0.5 text-[8px] font-black bg-purple-500/20 text-purple-300 border border-purple-500/40 rounded shrink-0">
                      ADMIN
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5 text-xs font-semibold mt-0.5 truncate">
                  <span className="text-amber-300 truncate">{user.levelName}</span>
                  <span className="text-slate-500 shrink-0">•</span>
                  <span className="text-slate-200 shrink-0">Lv {user.level}</span>
                </div>
              </div>
            </div>

            {/* Right side: Live FOX Coin Balance & Quick Trade Trigger (Never truncated) */}
            <div className="flex items-center gap-1.5 shrink-0">
              <div className="px-2.5 py-1.5 rounded-xl bg-gradient-to-b from-[#1A160D]/90 to-[#0E1018]/90 border border-amber-500/40 flex items-center gap-1.5 shadow-[0_0_12px_rgba(245,158,11,0.12)]">
                <img
                  src={foxGoldCoinImg}
                  alt="FOX"
                  className="w-4 h-4 rounded-full object-cover shrink-0 animate-spin-slow"
                />
                <span className="text-xs sm:text-sm font-black text-amber-300 tabular-nums tracking-tight whitespace-nowrap">
                  {Math.floor(user.balance).toLocaleString('en-US')}
                </span>
              </div>
              {onOpenTrade && (
                <button
                  type="button"
                  onClick={onOpenTrade}
                  className="w-8 h-8 rounded-xl bg-[#131722] hover:bg-[#1B2030] border border-amber-500/30 flex items-center justify-center text-amber-300 transition active:scale-95 cursor-pointer shrink-0"
                  title="P2P Coin Trade"
                >
                  <ArrowLeftRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        )}
      </header>
    );
  },
  (prev, next) =>
    prev.activeTab === next.activeTab &&
    prev.isAdmin === next.isAdmin &&
    prev.isMuted === next.isMuted &&
    prev.user.id === next.user.id &&
    Math.floor(prev.user.balance) === Math.floor(next.user.balance) &&
    prev.user.profitPerHour === next.user.profitPerHour &&
    prev.user.displayName === next.user.displayName &&
    prev.user.username === next.user.username &&
    prev.user.level === next.user.level &&
    prev.user.levelName === next.user.levelName &&
    prev.user.isAdmin === next.user.isAdmin &&
    prev.user.isGuest === next.user.isGuest &&
    prev.user.isTelegram === next.user.isTelegram &&
    prev.user.canClaimDaily === next.user.canClaimDaily &&
    prev.user.boosters.lastWheelSpinTimestamp === next.user.boosters.lastWheelSpinTimestamp
);

