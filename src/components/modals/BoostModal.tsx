import React, { useState } from 'react';
import { X, Zap, Flame, Sparkles } from 'lucide-react';
import { UserGameState } from '../../types/game.js';
import { sound } from '../../utils/audio.js';
import { TelegramService } from '../../utils/telegram.js';

interface BoostModalProps {
  user: UserGameState;
  onClose: () => void;
  onUseBoost: (type: 'full_energy' | 'turbo') => Promise<void>;
}

export const BoostModal: React.FC<BoostModalProps> = ({
  user,
  onClose,
  onUseBoost,
}) => {
  const [loadingType, setLoadingType] = useState<string | null>(null);

  const now = Date.now();
  const turboCooldown = Math.max(0, Math.ceil((user.boosters.nextTurboAt - now) / 1000));
  const isTurboActive = user.boosters.turboActiveUntil > now;

  const handleBoost = async (type: 'full_energy' | 'turbo') => {
    if (loadingType) return;
    try {
      setLoadingType(type);
      if (type === 'turbo') {
        sound.playTurbo();
        TelegramService.triggerHaptic('heavy');
      } else {
        sound.playLevelUp();
        TelegramService.triggerHaptic('medium');
      }
      await onUseBoost(type);
      onClose();
    } finally {
      setLoadingType(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-sm bg-gradient-to-b from-[#151c2f] to-[#0b0e17] border border-amber-500/40 rounded-3xl p-5 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full bg-slate-800 text-slate-400 hover:text-white transition"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="text-center mb-4">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center mb-2">
            <Zap className="w-6 h-6 text-amber-400 fill-amber-400" />
          </div>
          <h3 className="text-lg font-black text-amber-300">Fox Boosters</h3>
          <p className="text-xs text-slate-300 mt-0.5">
            Supercharge your tapping speed and recharge your stamina instantly!
          </p>
        </div>

        <div className="space-y-3 mb-2">
          {/* Full Energy */}
          <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center">
                <Zap className="w-6 h-6 text-amber-400 fill-amber-400" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-slate-100">Full Energy Tank</h4>
                <p className="text-[11px] text-slate-400">Instantly refills stamina to 100%</p>
                <span className="text-[10px] text-amber-400 font-bold">
                  {user.boosters.fullEnergyRemaining}/6 free daily
                </span>
              </div>
            </div>

            <button
              onClick={() => handleBoost('full_energy')}
              disabled={user.boosters.fullEnergyRemaining <= 0 || loadingType === 'full_energy'}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition active:scale-95 ${
                user.boosters.fullEnergyRemaining > 0
                  ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-md shadow-amber-500/20 cursor-pointer'
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed'
              }`}
            >
              {loadingType === 'full_energy' ? 'Recharging...' : 'Refill'}
            </button>
          </div>

          {/* Turbo 3x Frenzy */}
          <div className="p-3.5 rounded-2xl bg-gradient-to-r from-orange-600/20 to-slate-900 border border-orange-500/30 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-orange-500/20 border border-orange-500/30 flex items-center justify-center">
                <Flame className="w-6 h-6 text-orange-400 fill-orange-400" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h4 className="font-bold text-sm text-slate-100">Turbo Frenzy</h4>
                  <span className="px-1.5 py-0.2 text-[9px] font-black bg-orange-500 text-slate-950 rounded">
                    3X
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">Triple tap earnings for 20 seconds</p>
                {isTurboActive ? (
                  <span className="text-[10px] text-orange-400 font-extrabold animate-pulse">
                    🔥 Currently Active!
                  </span>
                ) : turboCooldown > 0 ? (
                  <span className="text-[10px] text-slate-400 font-bold">
                    Cooldown: {turboCooldown}s
                  </span>
                ) : (
                  <span className="text-[10px] text-emerald-400 font-bold">Ready to ignite!</span>
                )}
              </div>
            </div>

            <button
              onClick={() => handleBoost('turbo')}
              disabled={isTurboActive || turboCooldown > 0 || loadingType === 'turbo'}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition active:scale-95 ${
                !isTurboActive && turboCooldown === 0
                  ? 'bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 text-slate-950 shadow-md shadow-orange-500/30 cursor-pointer'
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed'
              }`}
            >
              {loadingType === 'turbo' ? 'Igniting...' : 'Ignite'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
