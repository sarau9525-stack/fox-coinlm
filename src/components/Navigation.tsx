import React from 'react';
import { Pickaxe, CheckSquare, Users, Trophy, ArrowLeftRight, Gift } from 'lucide-react';
import { sound } from '../utils/audio.js';
import { TelegramService } from '../utils/telegram.js';
import { foxGoldCoinImg } from '../assets/assets.js';

export type NavTab = 'home' | 'upgrades' | 'gifts' | 'trade' | 'tasks' | 'friends' | 'leaderboard';

interface NavigationProps {
  activeTab: NavTab;
  onChangeTab: (tab: NavTab) => void;
  hasDailyReward: boolean;
  hasUnclaimedPassive: boolean;
  hasActiveTrade?: boolean;
}

export const Navigation: React.FC<NavigationProps> = ({
  activeTab,
  onChangeTab,
  hasDailyReward,
  hasUnclaimedPassive,
  hasActiveTrade,
}) => {
  const tabs: Array<{ id: NavTab; label: string; icon: React.ReactNode; badge?: boolean }> = [
    {
      id: 'home',
      label: 'Tap',
      icon: (
        <div className="w-5 h-5 rounded-full overflow-hidden">
          <img src={foxGoldCoinImg} alt="Tap" className="w-full h-full object-cover" />
        </div>
      ),
    },
    {
      id: 'upgrades',
      label: 'Mine',
      icon: <Pickaxe className="w-5 h-5" />,
      badge: hasUnclaimedPassive,
    },
    {
      id: 'gifts',
      label: 'Gifts',
      icon: <Gift className="w-5 h-5" />,
    },
    {
      id: 'trade',
      label: 'Trade',
      icon: <ArrowLeftRight className="w-5 h-5" />,
      badge: hasActiveTrade,
    },
    {
      id: 'tasks',
      label: 'Earn',
      icon: <CheckSquare className="w-5 h-5" />,
      badge: hasDailyReward,
    },
    {
      id: 'friends',
      label: 'Friends',
      icon: <Users className="w-5 h-5" />,
    },
    {
      id: 'leaderboard',
      label: 'Rank',
      icon: <Trophy className="w-5 h-5" />,
    },
  ];

  const handleSelect = (tab: NavTab) => {
    sound.playTap();
    TelegramService.triggerHaptic('light');
    onChangeTab(tab);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto z-40 bg-[#0B0E17]/95 backdrop-blur-md border-t border-slate-800/80 px-1 py-1.5 pb-safe">
      <div className="grid grid-cols-7 gap-0.5 items-center">
        {tabs.map((t) => {
          const isActive = activeTab === t.id;

          return (
            <button
              key={t.id}
              onClick={() => handleSelect(t.id)}
              className={`relative flex flex-col items-center justify-center py-1.5 px-0.5 rounded-xl transition-all duration-150 cursor-pointer ${
                isActive
                  ? 'bg-amber-500/15 text-amber-400 font-extrabold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 font-medium'
              }`}
            >
              <div className="relative">
                {t.icon}
                {t.badge && (
                  <span className="absolute -top-1 -right-1 w-2 h-2 bg-emerald-500 rounded-full animate-pulse border-2 border-[#0B0E17]" />
                )}
              </div>
              <span className="text-[9px] mt-1 tracking-tight truncate max-w-full">{t.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

