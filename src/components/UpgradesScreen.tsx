import React, { useState } from 'react';
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
  ArrowUpRight,
  TrendingUp,
} from 'lucide-react';
import { UpgradeDefinition, UserGameState } from '../types/game.js';
import { sound } from '../utils/audio.js';
import { TelegramService } from '../utils/telegram.js';
import { foxGoldCoinImg } from '../assets/assets.js';

interface UpgradesScreenProps {
  user: UserGameState;
  upgrades: UpgradeDefinition[];
  onPurchase: (upgradeId: string) => Promise<void>;
}

export const UpgradesScreen: React.FC<UpgradesScreenProps> = ({
  user,
  upgrades,
  onPurchase,
}) => {
  const [activeCategory, setActiveCategory] = useState<'all' | 'tap' | 'passive' | 'special'>('passive');
  const [purchasingId, setPurchasingId] = useState<string | null>(null);

  // Icon mapping (supports both Lucide icons and emojis/custom icons)
  const renderIcon = (iconName: string) => {
    switch (iconName) {
      case 'Flame': return <Flame className="w-5 h-5 text-orange-400" />;
      case 'BatteryCharging': return <BatteryCharging className="w-5 h-5 text-emerald-400" />;
      case 'Zap': return <Zap className="w-5 h-5 text-amber-400" />;
      case 'Store': return <Store className="w-5 h-5 text-amber-300" />;
      case 'Coffee': return <Coffee className="w-5 h-5 text-amber-500" />;
      case 'Cpu': return <Cpu className="w-5 h-5 text-cyan-400" />;
      case 'Server': return <Server className="w-5 h-5 text-indigo-400" />;
      case 'Rocket': return <Rocket className="w-5 h-5 text-purple-400" />;
      case 'ShieldCheck': return <ShieldCheck className="w-5 h-5 text-yellow-400" />;
      case 'Crown': return <Crown className="w-5 h-5 text-amber-300" />;
      case 'Sparkles': return <Sparkles className="w-5 h-5 text-sky-400" />;
      default:
        if (iconName && iconName.trim().length <= 4) {
          return <span className="text-xl leading-none select-none">{iconName}</span>;
        }
        return <Sparkles className="w-5 h-5 text-amber-400" />;
    }
  };

  const getPrice = (up: UpgradeDefinition, level: number) => {
    return Math.floor(up.basePrice * Math.pow(up.priceMultiplier, level));
  };

  const passiveCount = upgrades.filter((u) => u.category === 'passive').length;
  const tapCount = upgrades.filter((u) => u.category === 'tap').length;
  const specialCount = upgrades.filter((u) => u.category === 'special').length;

  const filteredUpgrades = upgrades.filter((u) => {
    if (u.category === 'gift') return false;
    if (activeCategory === 'all') return true;
    return u.category === activeCategory;
  });

  const handleBuy = async (up: UpgradeDefinition) => {
    const currentLevel = user.upgrades[up.id] || 0;
    const price = getPrice(up, currentLevel);
    if (user.balance < price || user.level < up.levelRequirement || purchasingId) return;

    try {
      setPurchasingId(up.id);
      sound.playUpgrade();
      TelegramService.triggerHaptic('medium');
      await onPurchase(up.id);
    } finally {
      setPurchasingId(null);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto px-4 pb-24 pt-2 text-white">
      {/* Top passive income summary card */}
      <div className="w-full bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border border-slate-700/80 rounded-2xl p-3.5 mb-4 shadow-lg flex items-center justify-between">
        <div>
          <span className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold block">
            Hourly Passive Yield
          </span>
          <div className="flex items-center gap-1.5 mt-0.5">
            <TrendingUp className="w-4 h-4 text-emerald-400" />
            <span className="text-xl font-black text-emerald-400">
              +{user.profitPerHour.toLocaleString('en-US')}
            </span>
            <span className="text-xs text-slate-400 font-medium">FOX/hr</span>
          </div>
        </div>

        <div className="text-right">
          <span className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold block">
            Balance
          </span>
          <div className="flex items-center gap-1.5 mt-0.5 justify-end">
            <img src={foxGoldCoinImg} alt="FOX" className="w-4 h-4" />
            <span className="text-lg font-black text-amber-300">
              {Math.floor(user.balance).toLocaleString('en-US')}
            </span>
          </div>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="grid grid-cols-3 gap-1 bg-slate-900/90 p-1 rounded-xl border border-slate-800 mb-4 text-xs font-bold">
        <button
          onClick={() => setActiveCategory('passive')}
          className={`py-2 rounded-lg transition cursor-pointer ${
            activeCategory === 'passive'
              ? 'bg-amber-500 text-slate-950 shadow-md font-black'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Enterprises ({passiveCount})
        </button>
        <button
          onClick={() => setActiveCategory('tap')}
          className={`py-2 rounded-lg transition cursor-pointer ${
            activeCategory === 'tap'
              ? 'bg-amber-500 text-slate-950 shadow-md font-black'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Tapping ({tapCount})
        </button>
        <button
          onClick={() => setActiveCategory('special')}
          className={`py-2 rounded-lg transition cursor-pointer ${
            activeCategory === 'special'
              ? 'bg-amber-500 text-slate-950 shadow-md font-black'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Clan & VIP ({specialCount})
        </button>
      </div>

      {/* Upgrade cards list */}
      <div className="space-y-3">
        {filteredUpgrades.map((up) => {
          const currentLevel = user.upgrades[up.id] || 0;
          const price = getPrice(up, currentLevel);
          const canAfford = user.balance >= price;
          const isLocked = user.level < up.levelRequirement;
          const isBuying = purchasingId === up.id;

          return (
            <div
              key={up.id}
              className={`relative bg-slate-900/80 border rounded-2xl p-3.5 transition-all duration-200 ${
                isLocked
                  ? 'border-slate-800/60 opacity-60'
                  : canAfford
                  ? 'border-amber-500/40 hover:border-amber-500/70 shadow-sm shadow-amber-500/5'
                  : 'border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                {/* Left: Icon and details */}
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 rounded-xl bg-slate-800 border border-slate-700/60 flex items-center justify-center shrink-0 shadow-inner">
                    {renderIcon(up.icon)}
                  </div>

                  <div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h4 className="font-bold text-sm text-slate-100">{up.name}</h4>
                      <span className="px-1.5 py-0.5 text-[9px] font-bold bg-slate-800 text-slate-300 border border-slate-700 rounded">
                        Req Lvl {up.levelRequirement}
                      </span>
                      {currentLevel > 0 && (
                        <span className="px-1.5 py-0.5 text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded">
                          Owned Lvl {currentLevel}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">{up.description}</p>

                    {/* Benefit readout */}
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-[11px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                        {up.benefitType === 'profit_per_hour'
                          ? `+${up.baseBenefit.toLocaleString('en-US')} FOX/hr`
                          : up.benefitType === 'tap_power'
                          ? `+${up.baseBenefit.toLocaleString('en-US')} per tap`
                          : up.benefitType === 'max_energy'
                          ? `+${up.baseBenefit.toLocaleString('en-US')} max stamina`
                          : `+${up.baseBenefit.toLocaleString('en-US')}/sec regen`}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right: Upgrade button & price */}
                <div className="shrink-0 text-right">
                  {isLocked ? (
                    <div className="flex items-center gap-1 text-[11px] font-bold text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2.5 py-1.5 rounded-xl">
                      <Lock className="w-3.5 h-3.5" />
                      <span>Lvl {up.levelRequirement}</span>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleBuy(up)}
                      disabled={!canAfford || isBuying}
                      className={`px-3 py-2 rounded-xl text-xs font-black transition active:scale-95 flex flex-col items-end ${
                        canAfford
                          ? 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 shadow-md shadow-amber-500/20 cursor-pointer'
                          : 'bg-slate-800 text-slate-500 border border-slate-700/60 cursor-not-allowed'
                      }`}
                    >
                      <span className="text-[10px] uppercase font-bold opacity-80">Upgrade</span>
                      <div className="flex items-center gap-1 mt-0.5">
                        <img src={foxGoldCoinImg} alt="FOX" className="w-3.5 h-3.5" />
                        <span>{price.toLocaleString('en-US')}</span>
                      </div>
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
