import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Zap, TrendingUp, Sparkles, Flame, Gift } from 'lucide-react';
import { UserGameState } from '../types/game.js';
import { sound } from '../utils/audio.js';
import { TelegramService } from '../utils/telegram.js';
import { foxMascotImg, foxGoldCoinImg } from '../assets/assets.js';
import { FoxGiftAvatar, getFoxGiftMetadata } from './FoxGiftAvatar.js';

interface FloatingNumber {
  id: number;
  x: number;
  y: number;
  value: number;
  isCrit: boolean;
}

interface TapScreenProps {
  user: UserGameState;
  onTap: (count: number) => void;
  onOpenBoost: () => void;
  onOpenWheel?: () => void;
  equippedGiftId?: string | null;
  onOpenGifts?: () => void;
}

export const TapScreen: React.FC<TapScreenProps> = React.memo(({
  user,
  onTap,
  onOpenBoost,
  onOpenWheel,
  equippedGiftId,
  onOpenGifts,
}) => {
  const [floatingNumbers, setFloatingNumbers] = useState<FloatingNumber[]>([]);
  const [isPressing, setIsPressing] = useState<boolean>(false);
  const [tilt, setTilt] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [turboRemaining, setTurboRemaining] = useState<number>(0);
  const mascotRef = useRef<HTMLDivElement>(null);
  const nextId = useRef<number>(1);
  const cleanupTimersRef = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());

  // Clean up any pending particle timers on unmount
  useEffect(() => {
    const timers = cleanupTimersRef.current;
    return () => {
      timers.forEach((t) => clearTimeout(t));
      timers.clear();
    };
  }, []);

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

  // Handle single or multi-finger pointer tap with zero delay
  const handleTapCoordinates = useCallback(
    (clientX: number, clientY: number) => {
      const isTurbo = turboRemaining > 0;
      if (!isTurbo && user.energy < 1) {
        sound.playTap();
        TelegramService.triggerHaptic('heavy');
        return;
      }

      const tapMultiplier = isTurbo ? 3 : 1;
      const tapValue = user.tapPower * tapMultiplier;

      // Haptic and audio feedback
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

      // Independent per-particle removal so rapid tapping never blocks cleanup
      const timer = setTimeout(() => {
        setFloatingNumbers((prev) => prev.filter((item) => item.id !== id));
        cleanupTimersRef.current.delete(timer);
      }, 650);
      cleanupTimersRef.current.add(timer);

      // Trigger parent batched tap
      onTap(1);
    },
    [user.energy, user.tapPower, turboRemaining, onTap]
  );

  // Unified Pointer Events for zero-latency multi-touch + desktop click
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsPressing(true);
    handleTapCoordinates(e.clientX, e.clientY);

    if (mascotRef.current) {
      const rect = mascotRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const dx = Math.max(-1, Math.min(1, (e.clientX - centerX) / (rect.width / 2)));
      const dy = Math.max(-1, Math.min(1, (e.clientY - centerY) / (rect.height / 2)));
      setTilt({ x: dx * 12, y: -dy * 12 });
    }
  };

  const handlePointerUp = () => {
    setIsPressing(false);
    setTilt({ x: 0, y: 0 });
  };

  // Level progress percentage
  const currentLevelRange = user.nextLevelMinCoins - user.currentLevelMinCoins;
  const currentLevelProgress = Math.max(0, user.totalEarned - user.currentLevelMinCoins);
  const levelPercent =
    currentLevelRange > 0
      ? Math.min(100, Math.floor((currentLevelProgress / currentLevelRange) * 100))
      : 100;

  // Energy percentage
  const energyPercent = Math.min(100, Math.floor((user.energy / user.maxEnergy) * 100));
  const perSecondProfit = user.profitPerHour > 0 ? user.profitPerHour / 3600 : 0;
  const equippedMeta = equippedGiftId ? getFoxGiftMetadata(equippedGiftId) : null;

  return (
    <div className="w-full max-w-md mx-auto flex flex-col items-center justify-between px-4 pb-20 select-none overflow-hidden min-h-[calc(100dvh-125px)]">
      {/* Floating tap numbers */}
      {floatingNumbers.map((num) => (
        <div
          key={num.id}
          style={{ left: `${num.x - 20}px`, top: `${num.y - 30}px` }}
          className={`fixed pointer-events-none z-50 font-black text-2xl tracking-wider animate-float-up will-change-transform ${
            num.isCrit
              ? 'text-yellow-300 drop-shadow-[0_0_12px_rgba(250,204,21,0.9)] scale-125'
              : 'text-amber-300 drop-shadow-[0_0_8px_rgba(245,158,11,0.7)]'
          }`}
        >
          +{num.value}
          {num.isCrit && <span className="text-xs ml-1 text-orange-400">🔥3X</span>}
        </div>
      ))}

      {/* Top 3 Stats Badges */}
      <div className="w-full grid grid-cols-3 gap-2 mt-1 mb-3">
        {/* Earn per tap */}
        <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-2 flex flex-col items-center justify-center shadow-sm">
          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wide flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-amber-400" /> Tap
          </span>
          <span className="text-sm font-extrabold text-amber-300 mt-0.5 tabular-nums">
            +{user.tapPower * (turboRemaining > 0 ? 3 : 1)}
          </span>
        </div>

        {/* Level progress */}
        <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-2 flex flex-col items-center justify-center shadow-sm">
          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wide flex items-center gap-1">
            <Flame className="w-3 h-3 text-orange-400" /> Lvl {user.level}
          </span>
          <div className="w-full bg-slate-800 h-1.5 rounded-full mt-1.5 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-orange-500 to-amber-400 rounded-full transition-all duration-300"
              style={{ width: `${levelPercent}%` }}
            />
          </div>
          <span className="text-[9px] text-slate-400 mt-1 tabular-nums">{levelPercent}%</span>
        </div>

        {/* Profit per hour */}
        <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-2 flex flex-col items-center justify-center shadow-sm">
          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wide flex items-center gap-1">
            <TrendingUp className="w-3 h-3 text-emerald-400" /> Per Hour
          </span>
          <span className="text-sm font-extrabold text-emerald-400 mt-0.5 tabular-nums">
            +{user.profitPerHour.toLocaleString()}
          </span>
          {perSecondProfit > 0 && (
            <span className="text-[9px] font-bold text-emerald-400/80 tabular-nums leading-none mt-0.5">
              +{perSecondProfit >= 10 ? Math.floor(perSecondProfit).toLocaleString() : perSecondProfit.toFixed(2)}/sec
            </span>
          )}
        </div>
      </div>

      {/* Big Balance Display */}
      <div className="flex flex-col items-center my-2 text-center">
        <div className="flex items-center justify-center gap-2.5">
          <div className="w-10 h-10 rounded-full overflow-hidden shadow-lg shadow-amber-500/30 ring-2 ring-amber-400/50">
            <img src={foxGoldCoinImg} alt="FOX" className="w-full h-full object-cover animate-spin-slow" />
          </div>
          <span className="text-4xl sm:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-b from-amber-200 via-amber-400 to-orange-500 tracking-tight drop-shadow-md tabular-nums">
            {Math.floor(user.balance).toLocaleString()}
          </span>
        </div>
        <span className="text-xs font-semibold text-slate-400 mt-1 uppercase tracking-widest">
          FOX COINS
        </span>
      </div>

      {/* Turbo Active Banner */}
      {turboRemaining > 0 && (
        <div className="w-full bg-gradient-to-r from-orange-600 to-amber-500 text-white font-extrabold text-xs py-1.5 px-3 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-orange-600/30 animate-pulse">
          <Flame className="w-4 h-4 fill-white animate-bounce" />
          <span>TURBO FRENZY 3X REWARD! {turboRemaining}s LEFT</span>
        </div>
      )}

      {/* Central Interactive Fox Mascot */}
      <div className="relative my-auto flex items-center justify-center py-2">
        {/* Glow halo */}
        <div
          className={`absolute w-72 h-72 sm:w-80 sm:h-80 rounded-full transition-all duration-300 pointer-events-none blur-3xl ${
            turboRemaining > 0
              ? 'bg-gradient-to-r from-orange-600/40 via-amber-500/50 to-red-600/40 scale-110'
              : 'bg-gradient-to-r from-amber-500/20 via-orange-600/25 to-amber-400/20'
          }`}
        />

        {/* Circular Outer Golden Ring */}
        <div className="relative p-3 rounded-full bg-gradient-to-b from-amber-400/40 via-orange-500/20 to-slate-900 border border-amber-500/30 shadow-2xl shadow-orange-950/50">
          <div
            ref={mascotRef}
            onPointerDown={handlePointerDown}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            onPointerLeave={handlePointerUp}
            style={{
              transform: `perspective(600px) rotateX(${tilt.y}deg) rotateY(${tilt.x}deg) scale(${
                isPressing ? 0.94 : 1
              })`,
            }}
            className="w-64 h-64 sm:w-72 sm:h-72 rounded-full overflow-hidden cursor-pointer active:cursor-grabbing transition-transform duration-75 ease-out shadow-inner relative group border-4 border-amber-500/40 bg-gradient-to-b from-[#151c2f] to-[#0b0e17] touch-none will-change-transform"
          >
            {/* Mascot Image */}
            <img
              src={foxMascotImg}
              alt="Fox Mascot"
              draggable={false}
              className="w-full h-full object-cover pointer-events-none select-none transition-transform duration-200 group-hover:scale-105"
            />

            {/* Radial dark vignette over image for clean contrast */}
            <div className="absolute inset-0 bg-radial-gradient from-transparent via-transparent to-[#0B0E17]/40 pointer-events-none" />

            {/* Tap highlight flash */}
            {isPressing && (
              <div className="absolute inset-0 bg-amber-300/15 pointer-events-none transition-opacity" />
            )}
          </div>

          {/* Equipped Collectible Telegram Fox Gift Companion Badge */}
          {equippedGiftId && equippedMeta && (user.upgrades[equippedGiftId] || 0) > 0 && (
            <button
              onClick={onOpenGifts}
              title="Equipped Telegram Fox Gift"
              className="absolute -bottom-2 -right-2 z-20 p-1 rounded-2xl bg-slate-950/95 border border-amber-400/60 shadow-xl flex items-center gap-1.5 pr-2.5 cursor-pointer hover:scale-105 transition"
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
        </div>
      </div>

      {/* Bottom Energy & Boost Bar */}
      <div className="w-full mt-auto pt-2">
        <div className="flex items-center justify-between mb-1.5 px-1">
          <div className="flex items-center gap-1.5 text-xs font-bold text-amber-300">
            <Zap className="w-4 h-4 fill-amber-400 text-amber-400" />
            <span className="text-slate-100 font-extrabold">{user.energy}</span>
            <span className="text-slate-500">/</span>
            <span className="text-slate-400">{user.maxEnergy}</span>
          </div>

          <div className="flex items-center gap-1.5">
            {onOpenWheel && (
              <button
                onClick={onOpenWheel}
                className="relative flex items-center gap-1 px-2.5 py-1 bg-gradient-to-r from-emerald-500/20 to-amber-500/20 hover:from-emerald-500/30 hover:to-amber-500/30 border border-amber-400/50 text-amber-200 font-bold text-xs rounded-xl transition active:scale-95 shadow-sm cursor-pointer"
              >
                <span className="text-xs inline-block animate-spin-slow">🎡</span>
                <span>Lucky Wheel</span>
                {Date.now() - (user.boosters.lastWheelSpinTimestamp || 0) >= 24 * 60 * 60 * 1000 && (
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                )}
              </button>
            )}

            {onOpenGifts && (
              <button
                onClick={onOpenGifts}
                className="flex items-center gap-1 px-2.5 py-1 bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/40 text-purple-300 font-bold text-xs rounded-xl transition active:scale-95 shadow-sm cursor-pointer"
              >
                <Gift className="w-3.5 h-3.5 text-purple-300" />
                <span>Gifts</span>
              </button>
            )}

            <button
              onClick={onOpenBoost}
              className="flex items-center gap-1 px-3 py-1 bg-gradient-to-r from-amber-500/20 to-orange-500/20 hover:from-amber-500/30 hover:to-orange-500/30 border border-amber-500/40 text-amber-300 font-bold text-xs rounded-xl transition active:scale-95 shadow-sm cursor-pointer"
            >
              <Zap className="w-3.5 h-3.5 fill-amber-300" />
              <span>Boost</span>
            </button>
          </div>
        </div>

        {/* Stamina bar */}
        <div className="w-full h-3 bg-slate-900 border border-slate-800 rounded-full overflow-hidden p-0.5 shadow-inner">
          <div
            className={`h-full rounded-full transition-all duration-200 ${
              energyPercent > 30
                ? 'bg-gradient-to-r from-amber-500 via-orange-500 to-amber-300'
                : 'bg-gradient-to-r from-red-500 to-orange-500'
            }`}
            style={{ width: `${energyPercent}%` }}
          />
        </div>

        <div className="flex justify-between items-center text-[10px] text-slate-500 mt-1 px-1">
          <span>Regen: +{user.energyRegenRate}/sec</span>
          {user.energy < user.maxEnergy && (
            <span>
              Full in ~{Math.ceil((user.maxEnergy - user.energy) / user.energyRegenRate)}s
            </span>
          )}
        </div>
      </div>
    </div>
  );
});

