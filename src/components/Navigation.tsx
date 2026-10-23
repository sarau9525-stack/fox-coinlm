import React, { useMemo, useCallback } from 'react';
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

const TAP_ICON = (
  <div className="w-5 h-5 rounded-full overflow-hidden">
    <img src={foxGoldCoinImg} alt="Tap" className="w-full h-full object-cover" />
  </div>
);
const MINE_ICON = <Pickaxe className="w-5 h-5" />;
const GIFTS_ICON = <Gift className="w-5 h-5" />;
const TRADE_ICON = <ArrowLeftRight className="w-5 h-5" />;
const EARN_ICON = <CheckSquare className="w-5 h-5" />;
const FRIENDS_ICON = <Users className="w-5 h-5" />;
const RANK_ICON = <Trophy className="w-5 h-5" />;

export const Navigation: React.FC<NavigationProps> = React.memo(
  ({
    activeTab,
    onChangeTab,
    hasDailyReward,
    hasUnclaimedPassive,
    hasActiveTrade,
  }) => {
    const tabs = useMemo<Array<{ id: NavTab; label: string; icon: React.ReactNode; badge?: boolean }>>(
      () => [
        { id: 'home', label: 'Tap', icon: TAP_ICON },
        { id: 'upgrades', label: 'Mine', icon: MINE_ICON, badge: hasUnclaimedPassive },
        { id: 'gifts', label: 'Gifts', icon: GIFTS_ICON },
        { id: 'trade', label: 'Trade', icon: TRADE_ICON, badge: hasActiveTrade },
        { id: 'tasks', label: 'Earn', icon: EARN_ICON, badge: hasDailyReward },
        { id: 'friends', label: 'Friends', icon: FRIENDS_ICON },
        { id: 'leaderboard', label: 'Rank', icon: RANK_ICON },
      ],
      [hasUnclaimedPassive, hasActiveTrade, hasDailyReward]
    );

    const handleSelect = useCallback(
      (tab: NavTab) => {
        if (tab === activeTab) return;
        sound.playTap();
        TelegramService.triggerHaptic('light');
        onChangeTab(tab);
      },
      [activeTab, onChangeTab]
    );

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
  },
  (prev, next) =>
    prev.activeTab === next.activeTab &&
    prev.hasDailyReward === next.hasDailyReward &&
    prev.hasUnclaimedPassive === next.hasUnclaimedPassive &&
    prev.hasActiveTrade === next.hasActiveTrade &&
    prev.onChangeTab === next.onChangeTab
);

