import React, { useState, useEffect, useRef } from 'react';
import { X, Sparkles, Zap, Flame, Clock, Trophy, Gift, CheckCircle2 } from 'lucide-react';
import confetti from 'canvas-confetti';
import { UserGameState, LuckyWheelPrize } from '../../types/game.js';
import { LUCKY_WHEEL_PRIZES, GAME_CONSTANTS, sanitizeWheelPrize } from '../../../server/gameConfig.js';
import { sound } from '../../utils/audio.js';
import { TelegramService } from '../../utils/telegram.js';
import { foxGoldCoinImg } from '../../assets/assets.js';

interface LuckyWheelModalProps {
  user: UserGameState;
  prizes?: LuckyWheelPrize[];
  onClose: () => void;
  onSpin: () => Promise<{ user: UserGameState; prize: LuckyWheelPrize; prizeIndex: number }>;
}

// Cubic bezier evaluator matching CSS transition: cubic-bezier(0.12, 0.82, 0.14, 1)
function evaluateCubicBezier(t: number): number {
  // Approximation of fast-out, long-deceleration casino wheel curve
  return 1 - Math.pow(1 - t, 3.8);
}

export const LuckyWheelModal: React.FC<LuckyWheelModalProps> = ({
  user,
  prizes,
  onClose,
  onSpin,
}) => {
  const wheelPrizes = (prizes && prizes.length > 0 ? prizes : LUCKY_WHEEL_PRIZES).map(sanitizeWheelPrize);
  const [rotation, setRotation] = useState<number>(0);
  const [isSpinning, setIsSpinning] = useState<boolean>(false);
  const [pointerKick, setPointerKick] = useState<boolean>(false);
  const [wonPrize, setWonPrize] = useState<LuckyWheelPrize | null>(null);
  const [winningIndex, setWinningIndex] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState<number>(Date.now());
  const [bulbPhase, setBulbPhase] = useState<number>(0);

  const animFrameRef = useRef<number | null>(null);
  const spinTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const lastSpin = user.boosters.lastWheelSpinTimestamp || 0;
  const cooldownMs = GAME_CONSTANTS.WHEEL_COOLDOWN_MS || 24 * 60 * 60 * 1000;
  const nextSpinAt = lastSpin + cooldownMs;
  const remainingMs = Math.max(0, nextSpinAt - now);
  const canSpin = remainingMs <= 0 && !isSpinning;

  // Live countdown ticker & marquee bulb animation
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(Date.now());
      setBulbPhase((p) => (p + 1) % 2);
    }, isSpinning ? 140 : 500);
    return () => clearInterval(timer);
  }, [isSpinning]);

  useEffect(() => {
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (spinTimeoutRef.current) clearTimeout(spinTimeoutRef.current);
    };
  }, []);

  const formatCountdown = (ms: number) => {
    const totalSec = Math.max(0, Math.floor(ms / 1000));
    const h = String(Math.floor(totalSec / 3600)).padStart(2, '0');
    const m = String(Math.floor((totalSec % 3600) / 60)).padStart(2, '0');
    const s = String(totalSec % 60).padStart(2, '0');
    return `${h}:${m}:${s}`;
  };

  const handleSpinClick = async () => {
    if (!canSpin || isSpinning) return;
    setError(null);
    setWonPrize(null);
    setWinningIndex(null);

    try {
      setIsSpinning(true);
      sound.playTap();
      TelegramService.triggerHaptic('medium');

      const result = await onSpin();
      const { prize, prizeIndex } = result;

      // Calculate exact target angle so slice `prizeIndex` lands at 12 o'clock (0 deg)
      const sliceAngle = 360 / wheelPrizes.length; // 45 deg
      const jitter = (Math.random() - 0.5) * 18; // +/- 9 deg natural variance inside slice
      const desiredMod = (360 - prizeIndex * sliceAngle + jitter + 360) % 360;
      const currentMod = ((rotation % 360) + 360) % 360;
      const deltaMod = (desiredMod - currentMod + 360) % 360;
      const totalDelta = 360 * 8 + deltaMod; // 8 full rotations + alignment
      const startRotation = rotation;
      const targetRotation = startRotation + totalDelta;

      const SPIN_DURATION_MS = 5000;
      const startTime = performance.now();
      let lastCrossedPeg = Math.floor((startRotation + 22.5) / 45);

      setRotation(targetRotation);

      // Synchronized peg tick & pointer needle deflection loop
      const tickLoop = (timestamp: number) => {
        const elapsed = timestamp - startTime;
        const progress = Math.min(1, elapsed / SPIN_DURATION_MS);
        const eased = evaluateCubicBezier(progress);
        const currentAngle = startRotation + totalDelta * eased;
        const currentPeg = Math.floor((currentAngle + 22.5) / 45);

        if (currentPeg > lastCrossedPeg) {
          lastCrossedPeg = currentPeg;
          sound.playTap();
          TelegramService.triggerHaptic('light');
          setPointerKick(true);
          setTimeout(() => setPointerKick(false), 75);
        }

        if (progress < 1) {
          animFrameRef.current = requestAnimationFrame(tickLoop);
        }
      };

      animFrameRef.current = requestAnimationFrame(tickLoop);

      spinTimeoutRef.current = setTimeout(() => {
        setIsSpinning(false);
        setWonPrize(prize);
        setWinningIndex(prizeIndex);
        sound.playUpgrade();
        setTimeout(() => sound.playCoin(), 200);
        TelegramService.triggerNotificationHaptic('success');

        // Dual cannon celebration confetti
        confetti({
          particleCount: 70,
          angle: 60,
          spread: 65,
          origin: { x: 0.1, y: 0.65 },
          colors: ['#F59E0B', '#FDE047', '#34D399', '#F97316', '#A855F7'],
        });
        confetti({
          particleCount: 70,
          angle: 120,
          spread: 65,
          origin: { x: 0.9, y: 0.65 },
          colors: ['#F59E0B', '#FDE047', '#34D399', '#F97316', '#A855F7'],
        });
      }, SPIN_DURATION_MS + 100);
    } catch (err: any) {
      setIsSpinning(false);
      setError(err?.message || 'Failed to spin Lucky Wheel');
      TelegramService.triggerNotificationHaptic('error');
    }
  };

  // SVG Wheel Geometry Helpers (Center = 160, 160, Radius = 142)
  const cx = 160;
  const cy = 160;
  const r = 140;
  const numSlices = wheelPrizes.length;
  const sliceDeg = 360 / numSlices; // 45 deg

  const polarToCartesian = (centerX: number, centerY: number, radius: number, angleInDegrees: number) => {
    // 0 deg is 12 o'clock (-90 deg in standard math)
    const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0;
    return {
      x: centerX + radius * Math.cos(angleInRadians),
      y: centerY + radius * Math.sin(angleInRadians),
    };
  };

  const createSlicePath = (index: number) => {
    const startAngle = index * sliceDeg - sliceDeg / 2;
    const endAngle = index * sliceDeg + sliceDeg / 2;
    const start = polarToCartesian(cx, cy, r, endAngle);
    const end = polarToCartesian(cx, cy, r, startAngle);
    const largeArcFlag = sliceDeg <= 180 ? '0' : '1';
    return [
      'M', cx, cy,
      'L', start.x, start.y,
      'A', r, r, 0, largeArcFlag, 0, end.x, end.y,
      'Z',
    ].join(' ');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-3 animate-fade-in">
      <div className="w-full max-w-md bg-[#0E1322] border border-amber-500/30 rounded-3xl p-4 sm:p-5 text-white shadow-2xl relative overflow-y-auto max-h-[94dvh]">
        {/* Ambient background glow */}
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-72 h-72 bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />

        {/* Close button */}
        <button
          onClick={onClose}
          disabled={isSpinning}
          className="absolute top-3.5 right-3.5 p-2 rounded-full bg-slate-800/90 text-slate-400 hover:text-white transition z-20 disabled:opacity-40 cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="text-center mb-3 relative z-10">
          <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-md bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[10px] font-black uppercase tracking-widest mb-1">
            <Sparkles className="w-3 h-3 text-amber-400" />
            <span>Daily Lucky Spin</span>
          </div>
          <h2 className="text-2xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-yellow-400 to-orange-400">
            Fox Fortune Wheel
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Spin once every 24h for up to <span className="text-amber-300 font-bold">100,000 FOX</span> or Turbo Boosts!
          </p>
        </div>

        {/* Interactive Wheel Stage */}
        <div className="relative flex flex-col items-center justify-center my-2 select-none">
          {/* Outer Backlight Halo */}
          <div
            className={`absolute w-72 h-72 rounded-full blur-2xl transition-all duration-500 pointer-events-none ${
              isSpinning
                ? 'bg-gradient-to-r from-amber-500/45 via-orange-500/45 to-purple-600/45 scale-110'
                : wonPrize
                ? 'bg-gradient-to-r from-emerald-500/40 via-amber-400/45 to-yellow-500/40 scale-105'
                : 'bg-amber-500/20'
            }`}
          />

          {/* Top Golden Pointer Needle (with physical peg-bounce animation) */}
          <div
            style={{
              transform: pointerKick
                ? 'translateX(-50%) rotate(-28deg) scale(1.08)'
                : 'translateX(-50%) rotate(0deg) scale(1)',
              transformOrigin: '50% 10px',
            }}
            className="absolute -top-2.5 left-1/2 z-30 transition-transform duration-75 ease-out pointer-events-none drop-shadow-[0_6px_12px_rgba(0,0,0,0.85)]"
          >
            <svg width="40" height="46" viewBox="0 0 40 46" fill="none">
              <defs>
                <linearGradient id="pointerGold" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#FEF08A" />
                  <stop offset="50%" stopColor="#F59E0B" />
                  <stop offset="100%" stopColor="#B45309" />
                </linearGradient>
              </defs>
              <path
                d="M20 44L34 14C36 9 32.5 3 27 3H13C7.5 3 4 9 6 14L20 44Z"
                fill="url(#pointerGold)"
                stroke="#FFFBEB"
                strokeWidth="2"
              />
              <circle cx="20" cy="13" r="5" fill="#78350F" stroke="#FDE047" strokeWidth="1.5" />
            </svg>
          </div>

          {/* Main SVG Wheel Container */}
          <div className="relative w-[300px] h-[300px] sm:w-[320px] sm:h-[320px] flex items-center justify-center">
            <svg
              viewBox="0 0 320 320"
              className="w-full h-full drop-shadow-[0_12px_30px_rgba(0,0,0,0.8)]"
            >
              <defs>
                <linearGradient id="rimGoldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#FDE047" />
                  <stop offset="35%" stopColor="#F59E0B" />
                  <stop offset="70%" stopColor="#92400E" />
                  <stop offset="100%" stopColor="#FBBF24" />
                </linearGradient>
                <radialGradient id="centerCapGrad" cx="50%" cy="35%" r="65%">
                  <stop offset="0%" stopColor="#FEF08A" />
                  <stop offset="45%" stopColor="#F59E0B" />
                  <stop offset="100%" stopColor="#78350F" />
                </radialGradient>
                {wheelPrizes.map((p, idx) => (
                  <radialGradient key={`grad_${p.id}`} id={`sliceGrad_${idx}`} cx="50%" cy="50%" r="70%">
                    <stop offset="0%" stopColor={p.color} />
                    <stop offset="100%" stopColor="#090D16" />
                  </radialGradient>
                ))}
              </defs>

              {/* Outer Metallic Gold Bezel */}
              <circle cx={cx} cy={cy} r="156" fill="url(#rimGoldGrad)" />
              <circle cx={cx} cy={cy} r="149" fill="#0B0F19" stroke="#F59E0B" strokeWidth="1.5" />

              {/* 24 Animated Marquee Rim LED Bulbs */}
              {Array.from({ length: 24 }).map((_, i) => {
                const pos = polarToCartesian(cx, cy, 152.5, i * 15);
                const isLit = (i + bulbPhase) % 2 === 0;
                return (
                  <circle
                    key={`bulb_${i}`}
                    cx={pos.x}
                    cy={pos.y}
                    r={isLit ? 3.2 : 2.3}
                    fill={isLit ? '#FEF08A' : '#78350F'}
                    stroke={isLit ? '#F59E0B' : 'none'}
                    strokeWidth="1"
                  />
                );
              })}

              {/* Rotating Wheel Group */}
              <g
                style={{
                  transform: `rotate(${rotation}deg)`,
                  transformOrigin: '160px 160px',
                  transition: isSpinning
                    ? 'transform 5000ms cubic-bezier(0.12, 0.82, 0.14, 1)'
                    : 'none',
                }}
              >
                {wheelPrizes.map((prize, index) => {
                  const centerAngle = index * sliceDeg;
                  const isWinningSlice = !isSpinning && winningIndex === index;

                  return (
                    <g key={prize.id}>
                      {/* Slice Sector Path */}
                      <path
                        d={createSlicePath(index)}
                        fill={`url(#sliceGrad_${index})`}
                        stroke={isWinningSlice ? '#FDE047' : '#F59E0B'}
                        strokeWidth={isWinningSlice ? '2.5' : '1'}
                        strokeOpacity={isWinningSlice ? 1 : 0.45}
                      />

                      {/* Subtle inner highlight wedge */}
                      <path
                        d={createSlicePath(index)}
                        fill={prize.accentColor}
                        fillOpacity={isWinningSlice ? '0.28' : '0.08'}
                      />

                      {/* Slice Label & Icon rotated along slice center ray */}
                      <g transform={`rotate(${centerAngle} ${cx} ${cy})`}>
                        {/* Rarity dot */}
                        <circle
                          cx={cx}
                          cy={cy - 118}
                          r="3"
                          fill={prize.accentColor}
                        />
                        {/* Prize Short Text */}
                        <text
                          x={cx}
                          y={cy - 94}
                          fill={prize.rarity === 'jackpot' ? '#FEF08A' : '#FFFFFF'}
                          fontSize={prize.rarity === 'jackpot' ? '12.5' : '11.5'}
                          fontWeight="900"
                          textAnchor="middle"
                          letterSpacing="0.03em"
                        >
                          {prize.shortLabel}
                        </text>
                        {/* Sub-label */}
                        <text
                          x={cx}
                          y={cy - 78}
                          fill={prize.accentColor}
                          fontSize="8.5"
                          fontWeight="800"
                          textAnchor="middle"
                        >
                          {prize.type === 'coins'
                            ? 'FOX'
                            : prize.type === 'full_energy'
                            ? 'REFILL'
                            : '45 SEC'}
                        </text>
                        {/* Emoji / Visual Badge */}
                        <text
                          x={cx}
                          y={cy - 56}
                          fontSize="15"
                          textAnchor="middle"
                        >
                          {prize.rarity === 'jackpot'
                            ? '👑'
                            : prize.type === 'full_energy'
                            ? '⚡'
                            : prize.type === 'turbo'
                            ? '🔥'
                            : prize.amount >= 50000
                            ? '💎'
                            : '🦊'}
                        </text>
                      </g>
                    </g>
                  );
                })}

                {/* 8 Golden Boundary Pegs (Pins) */}
                {Array.from({ length: numSlices }).map((_, i) => {
                  const pegPos = polarToCartesian(cx, cy, r - 2, i * sliceDeg - sliceDeg / 2);
                  return (
                    <circle
                      key={`peg_${i}`}
                      cx={pegPos.x}
                      cy={pegPos.y}
                      r="4"
                      fill="#FEF08A"
                      stroke="#92400E"
                      strokeWidth="1.5"
                    />
                  );
                })}
              </g>

              {/* Center Hub Medallion */}
              <circle cx={cx} cy={cy} r="32" fill="#0B0F19" stroke="url(#rimGoldGrad)" strokeWidth="4" />
              <circle cx={cx} cy={cy} r="25" fill="url(#centerCapGrad)" />
            </svg>

            {/* Center Hub Interactive Spin Trigger Icon */}
            <button
              onClick={handleSpinClick}
              disabled={!canSpin}
              className={`absolute w-14 h-14 rounded-full flex flex-col items-center justify-center font-black text-[10px] tracking-tighter uppercase transition transform ${
                canSpin
                  ? 'cursor-pointer hover:scale-105 active:scale-95 text-slate-950'
                  : 'cursor-not-allowed text-amber-950/80'
              }`}
              title={canSpin ? 'Spin Lucky Wheel' : 'On 24h Cooldown'}
            >
              <span className="text-base leading-none">🦊</span>
              <span className="font-black text-[9px] text-slate-950 leading-none mt-0.5">
                {isSpinning ? '...' : canSpin ? 'SPIN' : '24H'}
              </span>
            </button>
          </div>
        </div>

        {/* Won Prize Celebration Banner */}
        {wonPrize && (
          <div className="mb-3 p-3.5 rounded-2xl bg-gradient-to-r from-amber-500/25 via-emerald-500/20 to-amber-500/25 border-2 border-amber-400/70 shadow-lg shadow-amber-500/20 flex items-center justify-between animate-bounce">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-amber-400/20 border border-amber-300/50 flex items-center justify-center text-2xl shrink-0">
                {wonPrize.type === 'full_energy'
                  ? '⚡'
                  : wonPrize.type === 'turbo'
                  ? '🔥'
                  : wonPrize.rarity === 'jackpot'
                  ? '👑'
                  : '🪙'}
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-400 text-slate-950">
                    YOU WON!
                  </span>
                </div>
                <div className="text-base font-black text-white mt-0.5">
                  {wonPrize.label}
                </div>
                <div className="text-xs font-bold text-amber-300 uppercase tracking-wide">
                  {wonPrize.rarity} Reward Claimed!
                </div>
              </div>
            </div>
            <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="mb-3 p-2.5 rounded-xl bg-red-500/15 border border-red-500/30 text-red-300 text-xs text-center font-semibold">
            {error}
          </div>
        )}

        {/* Primary Spin Action or 24-Hour Cooldown Timer */}
        {canSpin ? (
          <button
            onClick={handleSpinClick}
            disabled={isSpinning}
            className="w-full py-3.5 rounded-2xl font-black text-sm uppercase tracking-wider bg-gradient-to-r from-amber-400 via-yellow-400 to-orange-500 hover:from-amber-300 hover:to-orange-400 text-slate-950 shadow-xl shadow-orange-500/30 transition active:scale-98 flex items-center justify-center gap-2 cursor-pointer"
          >
            <Sparkles className="w-5 h-5 fill-slate-950" />
            <span>{isSpinning ? 'Spinning...' : 'SPIN LUCKY WHEEL (FREE)'}</span>
          </button>
        ) : isSpinning ? (
          <div className="w-full py-3.5 rounded-2xl font-black text-sm text-center bg-amber-500/20 border border-amber-500/40 text-amber-300 animate-pulse">
            🎰 Spinning the Wheel... Good Luck!
          </div>
        ) : (
          <div className="w-full p-3 rounded-2xl bg-slate-900/90 border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-amber-400">
                <Clock className="w-4 h-4 animate-spin" style={{ animationDuration: '8s' }} />
              </div>
              <div>
                <span className="text-[11px] font-bold text-slate-300 block">
                  Next Free Spin
                </span>
                <span className="text-[10px] text-slate-500 block">
                  Refreshes every 24 hours
                </span>
              </div>
            </div>
            <div className="px-3 py-1.5 rounded-xl bg-slate-950 border border-amber-500/30 font-mono font-black text-sm text-amber-400 tabular-nums tracking-wider">
              {formatCountdown(remainingMs)}
            </div>
          </div>
        )}

        {/* Compact Prize Pool Reference Grid */}
        <div className="mt-4 pt-3 border-t border-slate-800/80">
          <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 mb-2">
            <span className="flex items-center gap-1">
              <Trophy className="w-3.5 h-3.5 text-amber-400" /> Wheel Rewards
            </span>
            <span className="text-[10px] text-slate-500">100% Guaranteed Win</span>
          </div>
          <div className="grid grid-cols-4 gap-1.5">
            {wheelPrizes.map((p, idx) => (
              <div
                key={p.id}
                className={`p-1.5 rounded-xl border text-center transition ${
                  winningIndex === idx && !isSpinning
                    ? 'bg-amber-500/20 border-amber-400 shadow-sm shadow-amber-500/20'
                    : 'bg-slate-900/70 border-slate-800/80'
                }`}
              >
                <div
                  className="text-[10px] font-black truncate"
                  style={{ color: p.accentColor }}
                >
                  {p.shortLabel}
                </div>
                <div className="text-[9px] text-slate-400 truncate mt-0.5">
                  {p.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
