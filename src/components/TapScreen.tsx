import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Zap, TrendingUp, Sparkles, Flame, Gift, Shirt, Lock, Check, X } from 'lucide-react';
import { UserGameState } from '../types/game.js';
import { sound } from '../utils/audio.js';
import { TelegramService } from '../utils/telegram.js';
import { foxMascotImg, foxGoldCoinImg } from '../assets/assets.js';
import { FoxGiftAvatar, getFoxGiftMetadata } from './FoxGiftAvatar.js';
import { FoxLevelOutfit, FOX_LEVEL_OUTFITS, getLevelOutfitMeta } from './FoxLevelOutfit.js';

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
  const [customOutfitLevel, setCustomOutfitLevel] = useState<number | null>(null);
  const [previewOutfitLevel, setPreviewOutfitLevel] = useState<number>(user.level);
  const [showWardrobeModal, setShowWardrobeModal] = useState<boolean>(false);
  const [levelUpBanner, setLevelUpBanner] = useState<{ level: number; titleFa: string } | null>(null);

  const mascotRef = useRef<HTMLDivElement>(null);
  const nextId = useRef<number>(1);
  const cleanupTimersRef = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());
  const prevLevelRef = useRef<number>(user.level);

  // Clean up any pending particle timers on unmount
  useEffect(() => {
    const timers = cleanupTimersRef.current;
    return () => {
      timers.forEach((t) => clearTimeout(t));
      timers.clear();
    };
  }, []);

  // Automatically detect level-ups and switch the Fox into its new level outfit
  useEffect(() => {
    if (user.level > prevLevelRef.current) {
      const meta = getLevelOutfitMeta(user.level);
      setCustomOutfitLevel(null); // Auto-wear the newly unlocked level outfit
      setPreviewOutfitLevel(user.level);
      setLevelUpBanner({ level: user.level, titleFa: meta.outfitTitleFa });
      sound.playSuccess();
      TelegramService.triggerNotificationHaptic('success');

      const timer = setTimeout(() => {
        setLevelUpBanner(null);
      }, 4500);
      prevLevelRef.current = user.level;
      return () => clearTimeout(timer);
    }
    prevLevelRef.current = user.level;
  }, [user.level]);

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

  const activeOutfitLevel = customOutfitLevel && customOutfitLevel <= user.level ? customOutfitLevel : user.level;
  const activeOutfitMeta = getLevelOutfitMeta(activeOutfitLevel);
  const previewMeta = getLevelOutfitMeta(previewOutfitLevel);

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

        {/* Level progress (clickable to view level outfits) */}
        <button
          onClick={() => {
            setPreviewOutfitLevel(activeOutfitLevel);
            setShowWardrobeModal(true);
          }}
          className="bg-slate-900/80 hover:bg-slate-800/90 border border-slate-800/80 hover:border-amber-500/40 rounded-2xl p-2 flex flex-col items-center justify-center shadow-sm transition cursor-pointer"
        >
          <span className="text-[10px] uppercase font-bold text-slate-300 tracking-wide flex items-center gap-1">
            <Flame className="w-3 h-3 text-orange-400" /> Lvl {user.level}/10
          </span>
          <div className="w-full bg-slate-800 h-1.5 rounded-full mt-1.5 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-orange-500 to-amber-400 rounded-full transition-all duration-300"
              style={{ width: `${levelPercent}%` }}
            />
          </div>
          <span className="text-[9px] text-amber-300/90 font-semibold mt-1 tabular-nums truncate max-w-full">
            {activeOutfitMeta.badgeEmoji} {levelPercent}%
          </span>
        </button>

        {/* Profit per hour */}
        <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-2 flex flex-col items-center justify-center shadow-sm">
          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wide flex items-center gap-1">
            <TrendingUp className="w-3 h-3 text-emerald-400" /> Per Hour
          </span>
          <span className="text-sm font-extrabold text-emerald-400 mt-0.5 tabular-nums">
            +{user.profitPerHour.toLocaleString('en-US')}
          </span>
          {perSecondProfit > 0 && (
            <span className="text-[9px] font-bold text-emerald-400/80 tabular-nums leading-none mt-0.5">
              +{perSecondProfit >= 10 ? Math.floor(perSecondProfit).toLocaleString('en-US') : perSecondProfit.toFixed(2)}/sec
            </span>
          )}
        </div>
      </div>

      {/* Level-Up Celebration Banner */}
      {levelUpBanner && (
        <div className="w-full mb-2 bg-gradient-to-r from-amber-500 via-orange-500 to-yellow-500 text-slate-950 font-black text-xs py-2 px-3 rounded-xl flex items-center justify-between shadow-lg shadow-amber-500/30 animate-bounce">
          <span className="flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 fill-slate-950" />
            <span>Level Up! Reached Level {levelUpBanner.level} — Unlocked: {levelUpBanner.titleFa}</span>
          </span>
          <button onClick={() => setLevelUpBanner(null)} className="text-slate-900/80 hover:text-slate-950">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Big Balance Display */}
      <div className="flex flex-col items-center my-1.5 text-center">
        <div className="flex items-center justify-center gap-2.5">
          <div className="w-10 h-10 rounded-full overflow-hidden shadow-lg shadow-amber-500/30 ring-2 ring-amber-400/50">
            <img src={foxGoldCoinImg} alt="FOX" className="w-full h-full object-cover animate-spin-slow" />
          </div>
          <span className="text-4xl sm:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-b from-amber-200 via-amber-400 to-orange-500 tracking-tight drop-shadow-md tabular-nums">
            {Math.floor(user.balance).toLocaleString('en-US')}
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
      <div className="relative my-auto flex flex-col items-center justify-center py-2">
        {/* Glow halo matching current level outfit */}
        <div
          style={{
            background:
              turboRemaining > 0
                ? undefined
                : `radial-gradient(circle, ${activeOutfitMeta.glowColor} 0%, rgba(15,23,42,0) 70%)`,
          }}
          className={`absolute w-72 h-72 sm:w-80 sm:h-80 rounded-full transition-all duration-500 pointer-events-none blur-3xl ${
            turboRemaining > 0
              ? 'bg-gradient-to-r from-orange-600/40 via-amber-500/50 to-red-600/40 scale-110'
              : ''
          }`}
        />

        {/* Circular Outer Golden Ring */}
        <div
          style={{ borderColor: `${activeOutfitMeta.accentColor}66` }}
          className="relative p-3 rounded-full bg-gradient-to-b from-amber-400/40 via-orange-500/20 to-slate-900 border shadow-2xl shadow-orange-950/50"
        >
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
              borderColor: `${activeOutfitMeta.accentColor}80`,
            }}
            className="w-64 h-64 sm:w-72 sm:h-72 rounded-full overflow-hidden cursor-pointer active:cursor-grabbing transition-transform duration-75 ease-out shadow-inner relative group border-4 bg-gradient-to-b from-[#151c2f] to-[#0b0e17] touch-none will-change-transform"
          >
            {/* Base Mascot Image (Exact same Fox character across all levels) */}
            <img
              src={foxMascotImg}
              alt="Fox Mascot"
              draggable={false}
              className="w-full h-full object-cover pointer-events-none select-none transition-transform duration-200 group-hover:scale-105"
            />

            {/* Level-Specific Tailored Outfit Overlay (Changes ONLY the Fox's clothes per level) */}
            <div className="absolute inset-0 pointer-events-none select-none transition-transform duration-200 group-hover:scale-105">
              <FoxLevelOutfit level={activeOutfitLevel} />
            </div>

            {/* Radial dark vignette over image for clean contrast */}
            <div className="absolute inset-0 bg-radial-gradient from-transparent via-transparent to-[#0B0E17]/40 pointer-events-none" />

            {/* Tap highlight flash */}
            {isPressing && (
              <div className="absolute inset-0 bg-amber-300/15 pointer-events-none transition-opacity" />
            )}
          </div>

          {/* Current Level Outfit Pill Badge (Top-Left of Mascot Ring) */}
          <button
            onClick={() => {
              setPreviewOutfitLevel(activeOutfitLevel);
              setShowWardrobeModal(true);
            }}
            title="View Level Outfits"
            className="absolute -top-2 -left-2 z-20 px-2.5 py-1 rounded-2xl bg-slate-950/95 border border-amber-400/50 shadow-xl flex items-center gap-1.5 cursor-pointer hover:scale-105 transition"
          >
            <Shirt className="w-3.5 h-3.5 text-amber-400" />
            <div className="text-left">
              <span className="text-[9px] font-bold text-slate-400 block leading-none">
                Lvl {activeOutfitLevel} Outfit
              </span>
              <span className="text-[10px] font-black text-amber-300 leading-tight block">
                {activeOutfitMeta.outfitTitle}
              </span>
            </div>
          </button>

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

      {/* Level Outfits Wardrobe Modal with Large 3D Live Preview */}
      {showWardrobeModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90dvh]">
            <div className="p-3.5 border-b border-slate-800 flex items-center justify-between bg-slate-950/80">
              <div className="flex items-center gap-2">
                <Shirt className="w-5 h-5 text-amber-400" />
                <div>
                  <h3 className="text-sm font-black text-white">Royal Fox Outfit Wardrobe</h3>
                  <p className="text-[11px] text-slate-400">
                    Tap any level to preview its exclusive 3D outfit on your Fox
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowWardrobeModal(false)}
                className="p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Large Interactive 3D Outfit Showcase */}
            <div className="p-3 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 border-b border-slate-800 flex items-center gap-3.5">
              <div
                style={{ borderColor: previewMeta.accentColor }}
                className="relative w-32 h-32 sm:w-36 sm:h-36 rounded-2xl overflow-hidden border-2 shadow-xl shrink-0 bg-slate-950"
              >
                <img
                  src={foxMascotImg}
                  alt={previewMeta.outfitTitle}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0">
                  <FoxLevelOutfit level={previewOutfitLevel} />
                </div>
                <span className="absolute top-1.5 right-1.5 px-2 py-0.5 rounded-lg bg-slate-950/90 border border-amber-400/40 text-[10px] font-black text-amber-300">
                  Lvl {previewOutfitLevel}
                </span>
              </div>

              <div className="flex-1 min-w-0 text-left">
                <div className="text-xs font-black text-amber-400 flex items-center gap-1">
                  <span>{previewMeta.badgeEmoji}</span>
                  <span>{previewMeta.levelName}</span>
                </div>
                <h4 className="text-sm font-black text-white mt-0.5">
                  {previewMeta.outfitTitle}
                </h4>
                <p className="text-[11px] text-slate-300 mt-1 leading-relaxed">
                  {previewMeta.descriptionFa}
                </p>

                <div className="mt-2.5">
                  {user.level >= previewOutfitLevel ? (
                    <button
                      onClick={() => {
                        setCustomOutfitLevel(previewOutfitLevel === user.level ? null : previewOutfitLevel);
                        sound.playSuccess();
                      }}
                      className={`w-full py-1.5 px-3 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 cursor-pointer transition ${
                        activeOutfitLevel === previewOutfitLevel
                          ? 'bg-emerald-500/20 border border-emerald-400/60 text-emerald-300'
                          : 'bg-gradient-to-r from-amber-400 to-orange-500 text-slate-950 shadow-lg shadow-amber-500/25'
                      }`}
                    >
                      {activeOutfitLevel === previewOutfitLevel ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>Currently Equipped</span>
                        </>
                      ) : (
                        <span>Equip Outfit</span>
                      )}
                    </button>
                  ) : (
                    <div className="w-full py-1.5 px-2.5 rounded-xl bg-slate-950/90 border border-slate-800 text-amber-300/90 text-[11px] font-bold flex items-center justify-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-amber-400" />
                      <span>Locked — Unlocks at Level {previewOutfitLevel}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Scrollable List of All 10 Level Outfits */}
            <div className="p-3 overflow-y-auto space-y-2">
              {FOX_LEVEL_OUTFITS.map((outfit) => {
                const isUnlocked = user.level >= outfit.level;
                const isWearing = activeOutfitLevel === outfit.level;
                const isPreviewing = previewOutfitLevel === outfit.level;

                return (
                  <div
                    key={outfit.level}
                    onClick={() => {
                      setPreviewOutfitLevel(outfit.level);
                      sound.playTap();
                    }}
                    className={`p-2 rounded-2xl border flex items-center gap-3 transition cursor-pointer ${
                      isPreviewing
                        ? 'bg-amber-500/15 border-amber-400 shadow-md'
                        : isWearing
                        ? 'bg-emerald-500/10 border-emerald-500/50'
                        : isUnlocked
                        ? 'bg-slate-950/70 border-slate-800 hover:border-slate-700'
                        : 'bg-slate-950/40 border-slate-900 opacity-80 hover:opacity-100'
                    }`}
                  >
                    {/* Live mini preview of the exact same Fox wearing this level's outfit */}
                    <div className="relative w-14 h-14 rounded-2xl overflow-hidden border border-slate-700 shrink-0 bg-slate-950">
                      <img
                        src={foxMascotImg}
                        alt={outfit.outfitTitle}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0">
                        <FoxLevelOutfit level={outfit.level} />
                      </div>
                    </div>

                    <div className="flex-1 min-w-0 text-left">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-black text-amber-400">
                          {outfit.badgeEmoji} Level {outfit.level}:
                        </span>
                        <span className="text-xs font-extrabold text-white truncate">
                          {outfit.outfitTitle}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5 leading-snug line-clamp-1">
                        {outfit.descriptionFa}
                      </p>
                    </div>

                    <div className="shrink-0">
                      {isUnlocked ? (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setPreviewOutfitLevel(outfit.level);
                            setCustomOutfitLevel(outfit.level === user.level ? null : outfit.level);
                            sound.playTap();
                          }}
                          className={`px-3 py-1.5 rounded-xl text-xs font-extrabold flex items-center gap-1 cursor-pointer transition ${
                            isWearing
                              ? 'bg-amber-400 text-slate-950'
                              : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                          }`}
                        >
                          {isWearing ? (
                            <>
                              <Check className="w-3.5 h-3.5" />
                              <span>Equipped</span>
                            </>
                          ) : (
                            <span>Equip</span>
                          )}
                        </button>
                      ) : (
                        <div className="px-2.5 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 text-[11px] font-bold flex items-center gap-1">
                          <Lock className="w-3 h-3 text-amber-400/80" />
                          <span>Preview</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}, (prev, next) => {
  const pu = prev.user;
  const nu = next.user;
  const prevLevelRange = Math.max(1, pu.nextLevelMinCoins - pu.currentLevelMinCoins);
  const nextLevelRange = Math.max(1, nu.nextLevelMinCoins - nu.currentLevelMinCoins);
  const prevLevelPercent = Math.min(100, Math.floor((Math.max(0, pu.totalEarned - pu.currentLevelMinCoins) / prevLevelRange) * 100));
  const nextLevelPercent = Math.min(100, Math.floor((Math.max(0, nu.totalEarned - nu.currentLevelMinCoins) / nextLevelRange) * 100));
  const eqId = next.equippedGiftId;

  return (
    Math.floor(pu.balance) === Math.floor(nu.balance) &&
    pu.energy === nu.energy &&
    pu.maxEnergy === nu.maxEnergy &&
    pu.level === nu.level &&
    pu.levelName === nu.levelName &&
    prevLevelPercent === nextLevelPercent &&
    pu.tapPower === nu.tapPower &&
    pu.profitPerHour === nu.profitPerHour &&
    pu.energyRegenRate === nu.energyRegenRate &&
    pu.boosters.turboActiveUntil === nu.boosters.turboActiveUntil &&
    pu.boosters.lastWheelSpinTimestamp === nu.boosters.lastWheelSpinTimestamp &&
    prev.equippedGiftId === next.equippedGiftId &&
    (eqId ? (pu.upgrades[eqId] || 0) === (nu.upgrades[eqId] || 0) : true) &&
    prev.onTap === next.onTap &&
    prev.onOpenBoost === next.onOpenBoost &&
    prev.onOpenWheel === next.onOpenWheel &&
    prev.onOpenGifts === next.onOpenGifts
  );
});
