import React, { useState } from 'react';
import { X, Calendar, Check, Gift, Sparkles, Trophy } from 'lucide-react';
import confetti from 'canvas-confetti';
import { UserGameState } from '../../types/game.js';
import { sound } from '../../utils/audio.js';
import { TelegramService } from '../../utils/telegram.js';
import { foxGoldCoinImg } from '../../assets/assets.js';

interface DailyRewardModalProps {
  user: UserGameState;
  onClose: () => void;
  onClaim: () => Promise<void>;
}

export const DailyRewardModal: React.FC<DailyRewardModalProps> = ({
  user,
  onClose,
  onClaim,
}) => {
  const [isClaiming, setIsClaiming] = useState<boolean>(false);

  const days = user.dailyRewardDays || [
    { day: 1, coins: 500 },
    { day: 2, coins: 1500 },
    { day: 3, coins: 5000 },
    { day: 4, coins: 15000 },
    { day: 5, coins: 35000 },
    { day: 6, coins: 100000 },
    { day: 7, coins: 500000, specialBadge: 'Golden Fox Trophy' },
  ];

  const currentStreak = user.dailyStreak;
  const nextStreakDay = user.canClaimDaily ? (currentStreak % 7) + 1 : currentStreak;

  const handleClaim = async () => {
    if (!user.canClaimDaily || isClaiming) return;
    try {
      setIsClaiming(true);
      sound.playLevelUp();
      TelegramService.triggerNotificationHaptic('success');
      confetti({
        particleCount: 80,
        spread: 80,
        origin: { y: 0.6 },
        colors: ['#F59E0B', '#F97316', '#FBBF24', '#FFFFFF'],
      });
      await onClaim();
    } finally {
      setIsClaiming(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-sm bg-gradient-to-b from-[#151c2f] to-[#0b0e17] border border-amber-500/40 rounded-3xl p-5 shadow-2xl relative">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full bg-slate-800 text-slate-400 hover:text-white transition"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="text-center mb-4">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center mb-2">
            <Calendar className="w-6 h-6 text-amber-400" />
          </div>
          <h3 className="text-lg font-black text-amber-300">Daily Login Streak</h3>
          <p className="text-xs text-slate-300 mt-0.5">
            Check in every consecutive day to accumulate massive coin bonuses!
          </p>
        </div>

        {/* 7-Day Grid */}
        <div className="grid grid-cols-4 gap-2 mb-4">
          {days.slice(0, 6).map((d) => {
            const isClaimed = !user.canClaimDaily ? d.day <= currentStreak : d.day < nextStreakDay;
            const isToday = user.canClaimDaily && d.day === nextStreakDay;

            return (
              <div
                key={d.day}
                className={`flex flex-col items-center justify-between p-2 rounded-2xl border text-center transition-all ${
                  isToday
                    ? 'bg-amber-500/20 border-amber-400 shadow-lg shadow-amber-500/20 ring-1 ring-amber-400 animate-pulse'
                    : isClaimed
                    ? 'bg-slate-900/60 border-emerald-500/30 opacity-70'
                    : 'bg-slate-900/70 border-slate-800 opacity-60'
                }`}
              >
                <span className="text-[10px] font-bold text-slate-400">Day {d.day}</span>
                <div className="my-1">
                  <img src={foxGoldCoinImg} alt="FOX" className="w-5 h-5 mx-auto" />
                </div>
                <span className="text-[10px] font-black text-amber-300">
                  {d.coins >= 1000 ? `${d.coins / 1000}k` : d.coins}
                </span>

                {isClaimed && (
                  <div className="w-3.5 h-3.5 bg-emerald-500 rounded-full flex items-center justify-center mt-1">
                    <Check className="w-2.5 h-2.5 text-slate-950 font-black" />
                  </div>
                )}
              </div>
            );
          })}

          {/* Grand Day 7 Card */}
          <div
            className={`col-span-2 flex items-center justify-between px-3 py-2 rounded-2xl border ${
              user.canClaimDaily && nextStreakDay === 7
                ? 'bg-gradient-to-r from-amber-500/30 to-orange-500/30 border-amber-400 ring-2 ring-amber-400'
                : !user.canClaimDaily && currentStreak >= 7
                ? 'bg-slate-900/60 border-emerald-500/40'
                : 'bg-slate-900/70 border-slate-800'
            }`}
          >
            <div className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-amber-400" />
              <div>
                <span className="text-[10px] font-bold text-slate-400 block leading-tight">Day 7</span>
                <span className="text-xs font-black text-amber-300">500,000 FOX</span>
              </div>
            </div>
            <span className="text-[9px] font-extrabold bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded">
              ★ GRAND
            </span>
          </div>
        </div>

        {/* Claim button */}
        {user.canClaimDaily ? (
          <button
            onClick={handleClaim}
            disabled={isClaiming}
            className="w-full py-3 bg-gradient-to-r from-amber-400 via-orange-500 to-amber-500 hover:from-amber-300 hover:to-orange-400 text-slate-950 font-black text-sm rounded-2xl shadow-xl shadow-amber-500/30 transition active:scale-95 cursor-pointer flex items-center justify-center gap-1.5"
          >
            <Gift className="w-4 h-4" />
            <span>{isClaiming ? 'Collecting...' : `Claim Day ${nextStreakDay} Bonus`}</span>
          </button>
        ) : (
          <div className="w-full py-2.5 bg-slate-900/80 border border-slate-800 rounded-2xl text-center">
            <span className="text-xs font-bold text-slate-400">
              ✓ Claimed for today! Next reward unlocks at midnight.
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
