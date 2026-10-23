import React, { useState } from 'react';
import { Sparkles, TrendingUp, Clock, Check } from 'lucide-react';
import confetti from 'canvas-confetti';
import { sound } from '../../utils/audio.js';
import { TelegramService } from '../../utils/telegram.js';
import { foxMascotImg, foxGoldCoinImg } from '../../assets/assets.js';

interface OfflineEarningsModalProps {
  amount: number;
  profitPerHour: number;
  onClaim: () => Promise<void>;
  onClose: () => void;
}

export const OfflineEarningsModal: React.FC<OfflineEarningsModalProps> = ({
  amount,
  profitPerHour,
  onClaim,
  onClose,
}) => {
  const [isClaiming, setIsClaiming] = useState<boolean>(false);

  const handleClaim = async () => {
    if (isClaiming) return;
    try {
      setIsClaiming(true);
      sound.playLevelUp();
      TelegramService.triggerNotificationHaptic('success');
      confetti({
        particleCount: 70,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#F59E0B', '#F97316', '#FBBF24'],
      });
      await onClaim();
    } finally {
      setIsClaiming(false);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-sm bg-gradient-to-b from-[#182035] via-[#111827] to-[#0B0E17] border border-amber-500/50 rounded-3xl p-6 shadow-2xl text-center relative overflow-hidden">
        {/* Glowing background halo */}
        <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-48 h-48 bg-amber-500/20 rounded-full blur-3xl pointer-events-none" />

        {/* Mascot Avatar with Gold Coins */}
        <div className="relative w-28 h-28 mx-auto mb-3 rounded-full p-1 bg-gradient-to-tr from-amber-400 via-orange-500 to-amber-300 shadow-xl shadow-orange-500/20">
          <div className="w-full h-full rounded-full overflow-hidden bg-slate-900 border-2 border-slate-950">
            <img src={foxMascotImg} alt="Fox Mascot" className="w-full h-full object-cover" />
          </div>
          <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-amber-400 p-1 shadow-lg ring-2 ring-[#0B0E17]">
            <img src={foxGoldCoinImg} alt="FOX" className="w-full h-full object-cover" />
          </div>
        </div>

        <h3 className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-amber-400 to-orange-400">
          Welcome Back, Fox!
        </h3>
        <p className="text-xs text-slate-300 mt-1">
          While you were resting, your fox mining businesses continued working tirelessly!
        </p>

        {/* Claimed Amount Card */}
        <div className="my-5 p-4 rounded-2xl bg-gradient-to-b from-amber-500/15 to-slate-900/90 border border-amber-400/40 shadow-inner">
          <span className="text-[10px] uppercase font-extrabold text-amber-300/80 tracking-wider block">
            Generated Offline Earnings
          </span>
          <div className="flex items-center justify-center gap-2 mt-1">
            <img src={foxGoldCoinImg} alt="FOX" className="w-6 h-6 animate-bounce" />
            <span className="text-3xl font-black text-amber-300 tracking-tight">
              +{amount.toLocaleString('en-US')}
            </span>
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">
            Current Rate: +{profitPerHour.toLocaleString('en-US')} FOX/hr
          </span>
        </div>

        {/* Claim Button */}
        <button
          onClick={handleClaim}
          disabled={isClaiming}
          className="w-full py-3.5 bg-gradient-to-r from-amber-400 via-orange-500 to-amber-500 hover:from-amber-300 hover:to-orange-400 text-slate-950 font-black text-sm rounded-2xl shadow-xl shadow-amber-500/30 transition active:scale-95 cursor-pointer flex items-center justify-center gap-2"
        >
          <Sparkles className="w-4 h-4 fill-slate-950" />
          <span>{isClaiming ? 'Collecting...' : 'Collect FOX Coins'}</span>
        </button>
      </div>
    </div>
  );
};
