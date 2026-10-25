import React, { useMemo, useCallback } from 'react';
import { Pickaxe, ClipboardList, Users, Trophy, Lock } from 'lucide-react';
import { sound } from '../utils/audio.js';
import { TelegramService } from '../utils/telegram.js';

export type NavTab = 'home' | 'upgrades' | 'gifts' | 'trade' | 'tasks' | 'friends' | 'leaderboard';

interface NavigationProps {
  activeTab: NavTab;
  onChangeTab: (tab: NavTab) => void;
  hasDailyReward: boolean;
  hasUnclaimedPassive: boolean;
  hasActiveTrade?: boolean;
  lockedSections?: Record<string, boolean>;
}

const TapHandIcon: React.FC<{ active?: boolean }> = ({ active }) => (
  <div className="relative flex items-center justify-center">
    {active && (
      <div className="absolute -inset-1.5 rounded-full border border-amber-400/50 bg-amber-500/10 animate-pulse-glow pointer-events-none" />
    )}
    <svg viewBox="0 0 28 28" className={`w-6 h-6 ${active ? 'text-amber-400' : 'text-slate-300'}`} fill="currentColor">
      {/* Sparkle top-left */}
      <path d="M5 4 L6 6.5 L8.5 7.5 L6 8.5 L5 11 L4 8.5 L1.5 7.5 L4 6.5 Z" className="text-amber-300" />
      {/* Tap circle ring */}
      <circle cx="15" cy="9" r="4.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeOpacity="0.65" />
      {/* Hand pointer */}
      <path d="M14 8.5c0-.83.67-1.5 1.5-1.5s1.5.67 1.5 1.5v4.2l2.6 1.1c.8.35 1.25 1.2 1.1 2.05l-.65 3.9c-.2 1.15-1.2 2-2.35 2h-4.5c-.9 0-1.75-.45-2.25-1.2l-2.3-3.45c-.4-.6-.3-1.4.25-1.85.5-.4 1.25-.35 1.7.15l1.35 1.5V8.5z" />
    </svg>
  </div>
);

export const Navigation: React.FC<NavigationProps> = React.memo(
  ({
    activeTab,
    onChangeTab,
    hasDailyReward,
    hasUnclaimedPassive,
    lockedSections,
  }) => {
    const tabs = useMemo<
      Array<{
        id: NavTab;
        label: string;
        icon: (active: boolean) => React.ReactNode;
        badge?: boolean;
        isLocked?: boolean;
      }>
    >(
      () => [
        {
          id: 'home',
          label: 'Tap',
          icon: (active) => <TapHandIcon active={active} />,
        },
        {
          id: 'upgrades',
          label: 'Mine',
          icon: () => <Pickaxe className="w-5 h-5" />,
          badge: hasUnclaimedPassive,
          isLocked: Boolean(lockedSections?.upgrades),
        },
        {
          id: 'tasks',
          label: 'Missions',
          icon: () => <ClipboardList className="w-5 h-5" />,
          badge: hasDailyReward,
          isLocked: Boolean(lockedSections?.tasks),
        },
        {
          id: 'friends',
          label: 'Friends',
          icon: () => <Users className="w-5 h-5" />,
          isLocked: Boolean(lockedSections?.friends),
        },
        {
          id: 'leaderboard',
          label: 'Rank',
          icon: () => <Trophy className="w-5 h-5" />,
          isLocked: Boolean(lockedSections?.leaderboard),
        },
      ],
      [hasUnclaimedPassive, hasDailyReward, lockedSections]
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
      <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto z-40 bg-gradient-to-b from-[#151823]/98 to-[#090B10]/98 backdrop-blur-md border-t border-amber-500/35 rounded-t-[26px] px-2 py-1.5 pb-safe shadow-[0_-10px_30px_rgba(0,0,0,0.8)] select-none">
        <div className="grid grid-cols-5 items-center">
          {tabs.map((t, index) => {
            const isActive = activeTab === t.id;

            return (
              <div
                key={t.id}
                className={`flex items-center justify-center ${
                  !isActive && index < tabs.length - 1 ? 'border-r border-slate-800/70' : ''
                }`}
              >
                <button
                  type="button"
                  onClick={() => handleSelect(t.id)}
                  className={`relative w-full flex flex-col items-center justify-center py-2 px-1 rounded-2xl transition-all duration-200 cursor-pointer ${
                    isActive
                      ? 'bg-gradient-to-b from-[#2F210C] via-[#1D1509] to-[#110D07] border border-amber-400/80 text-amber-300 font-extrabold shadow-[0_0_20px_rgba(245,158,11,0.28)]'
                      : t.isLocked
                      ? 'text-slate-500 hover:text-slate-300 font-semibold opacity-80'
                      : 'text-slate-300 hover:text-white font-semibold'
                  }`}
                >
                  <div className="relative flex items-center justify-center h-6">
                    {t.icon(isActive)}
                    {t.isLocked ? (
                      <span className="absolute -top-1.5 -right-2.5 w-3.5 h-3.5 bg-rose-500/90 text-white rounded-full flex items-center justify-center border border-[#0B0D14] shadow">
                        <Lock className="w-2 h-2" />
                      </span>
                    ) : (
                      t.badge && (
                        <span className="absolute -top-1 -right-2 w-2.5 h-2.5 bg-rose-500 rounded-full border-2 border-[#0B0D14] shadow animate-pulse" />
                      )
                    )}
                  </div>
                  <span
                    className={`text-[11px] mt-1 tracking-tight whitespace-nowrap ${
                      isActive ? 'text-amber-300 font-extrabold' : 'text-slate-300 font-medium'
                    }`}
                  >
                    {t.label}
                  </span>
                </button>
              </div>
            );
          })}
        </div>

        {/* Golden Community Motto Strip (Matches Mine Reference Image) */}
        <div className="mt-1 pt-1 border-t border-amber-500/20 flex items-center justify-center">
          <span className="text-[9px] sm:text-[10px] font-black tracking-[0.22em] uppercase bg-gradient-to-r from-amber-200 via-yellow-400 to-amber-200 bg-clip-text text-transparent drop-shadow-[0_1px_4px_rgba(245,158,11,0.35)]">
            ONE COMMUNITY. ONE VISION. FOX!
          </span>
        </div>
      </nav>
    );
  },
  (prev, next) =>
    prev.activeTab === next.activeTab &&
    prev.hasDailyReward === next.hasDailyReward &&
    prev.hasUnclaimedPassive === next.hasUnclaimedPassive &&
    prev.hasActiveTrade === next.hasActiveTrade &&
    prev.onChangeTab === next.onChangeTab &&
    prev.lockedSections === next.lockedSections
);
