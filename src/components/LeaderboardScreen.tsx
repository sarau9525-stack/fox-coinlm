import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
  Crown,
  RefreshCw,
  CheckCircle2,
  Info,
  X,
  Trophy,
  Users,
  Sparkles,
  ChevronRight,
  Clock,
  Shield,
} from 'lucide-react';
import { InvitedFriendInfo, LeaderboardEntry, UserGameState } from '../types/game.js';
import { api } from '../utils/api.js';
import { FOX_LEAGUES, getFoxLeagueForScore, FoxLeagueDefinition } from '../../server/gameConfig.js';
import { foxGoldCoinImg } from '../assets/assets.js';
import { TelegramService } from '../utils/telegram.js';
import { NavTab } from './Navigation.js';
import {
  FoxCircularAvatar,
  getActiveCharacterTier,
  loadSavedCharacterPrefs,
} from './FoxCharacterSystem.js';

interface LeaderboardScreenProps {
  user: UserGameState;
  onNavigateTab?: (tab: NavTab) => void;
}

type LeaderboardFilter = 'global' | 'friends' | 'weekly';

const FOX_AVATARS = [
  '/assets/rank/avatar_king.png',
  '/assets/rank/avatar_shadow.png',
  '/assets/rank/avatar_fire.png',
  '/assets/rank/avatar_royal.png',
  '/assets/rank/avatar_blue_fox.png',
  '/assets/rank/avatar_my_rank.png',
];

function getAvatarForPlayer(id: string, rank: number, isCurrentPlayer?: boolean): string {
  if (isCurrentPlayer) return '/assets/rank/avatar_my_rank.png';
  if (rank === 1) return '/assets/rank/avatar_king.png';
  if (rank === 2) return '/assets/rank/avatar_shadow.png';
  if (rank === 3) return '/assets/rank/avatar_fire.png';
  if (rank === 4) return '/assets/rank/avatar_royal.png';
  if (rank === 5) return '/assets/rank/avatar_blue_fox.png';
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  }
  return FOX_AVATARS[hash % FOX_AVATARS.length];
}

function formatCompactFox(num: number): string {
  const n = Math.max(0, Math.floor(Number(num) || 0));
  if (n >= 1_000_000_000) {
    return `${(n / 1_000_000_000).toFixed(n % 1_000_000_000 === 0 ? 0 : 2)}B`;
  }
  if (n >= 1_000_000) {
    return `${(n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1)}M`;
  }
  if (n >= 10_000) {
    return `${(n / 1_000).toFixed(n % 1_000 === 0 ? 0 : 1)}K`;
  }
  return n.toLocaleString('en-US');
}

function formatFullFox(num: number): string {
  return Math.max(0, Math.floor(Number(num) || 0)).toLocaleString('en-US');
}

function getWeeklySeasonCountdown(): { days: number; hours: string; minutes: string; seconds: string } {
  const now = new Date();
  const dayOfWeek = now.getUTCDay(); // 0 is Sunday
  const daysUntilSundayEnd = dayOfWeek === 0 ? 0 : 7 - dayOfWeek;
  const endOfWeek = new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate() + daysUntilSundayEnd,
      23,
      59,
      59,
      999
    )
  );
  const diffMs = Math.max(0, endOfWeek.getTime() - now.getTime());
  const totalSec = Math.floor(diffMs / 1000);
  const days = Math.floor(totalSec / 86400);
  const hours = String(Math.floor((totalSec % 86400) / 3600)).padStart(2, '0');
  const minutes = String(Math.floor((totalSec % 3600) / 60)).padStart(2, '0');
  const seconds = String(totalSec % 60).padStart(2, '0');
  return { days, hours, minutes, seconds };
}

const WEEKLY_REWARD_TIERS = [
  { rankLabel: '1st Place Champion', badge: '👑', rewardFox: 5_000_000, desc: 'Gold Crown + Champion Vault Bonus' },
  { rankLabel: '2nd Place Legend', badge: '🥈', rewardFox: 2_500_000, desc: 'Silver Crest + Elite Vault Bonus' },
  { rankLabel: '3rd Place Master', badge: '🥉', rewardFox: 1_000_000, desc: 'Bronze Crest + Royal Vault Bonus' },
  { rankLabel: 'Rank #4 – #10', badge: '💎', rewardFox: 500_000, desc: 'Diamond Contender Bonus' },
  { rankLabel: 'Rank #11 – #50', badge: '🔥', rewardFox: 150_000, desc: 'Gold Contender Bonus' },
  { rankLabel: 'Rank #51 – #100', badge: '⚡', rewardFox: 50_000, desc: 'Top 100 Season Finisher Bonus' },
];

export const LeaderboardScreen: React.FC<LeaderboardScreenProps> = ({ user, onNavigateTab }) => {
  const [entries, setEntries] = useState<LeaderboardEntry[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem('foxcoin_permanent_leaderboard_v1');
        if (raw) {
          const parsed = JSON.parse(raw) as LeaderboardEntry[];
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      } catch {}
    }
    return [];
  });
  const [playerEntry, setPlayerEntry] = useState<LeaderboardEntry | undefined>();
  const [friendsList, setFriendsList] = useState<InvitedFriendInfo[]>(user.invitedFriends || []);
  const [activeFilter, setActiveFilter] = useState<LeaderboardFilter>('global');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [nextUpdateSec, setNextUpdateSec] = useState<number>(855); // 00:14:15 countdown style
  const [weeklyCountdown, setWeeklyCountdown] = useState(getWeeklySeasonCountdown);
  const [showLeagueModal, setShowLeagueModal] = useState<boolean>(false);
  const [showWeeklyRewardsModal, setShowWeeklyRewardsModal] = useState<boolean>(false);

  const fetchLeaderboard = useCallback(async (manual = false) => {
    try {
      setIsLoading(true);
      if (manual) {
        TelegramService.hapticImpact('light');
      }
      const [res, friendsRes] = await Promise.all([
        api.getLeaderboard(100),
        api.getInvitedFriends().catch(() => ({
          friends: user.invitedFriends || [],
          referralCount: user.referralCount || 0,
          referralEarnings: user.referralEarnings || 0,
        })),
      ]);

      if (Array.isArray(res.list) && res.list.length > 0) {
        setEntries(res.list);
      }
      if (res.playerEntry) {
        setPlayerEntry(res.playerEntry);
      }
      if (Array.isArray(friendsRes.friends)) {
        setFriendsList(friendsRes.friends);
      }
      if (manual) {
        setNextUpdateSec(900);
        TelegramService.hapticNotification('success');
      }
    } catch (err) {
      console.error('Failed to load leaderboard:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user.invitedFriends, user.referralCount, user.referralEarnings]);

  useEffect(() => {
    fetchLeaderboard(false);
    const refreshInterval = setInterval(() => fetchLeaderboard(false), 20000);
    return () => clearInterval(refreshInterval);
  }, [fetchLeaderboard]);

  useEffect(() => {
    const tick = setInterval(() => {
      setWeeklyCountdown(getWeeklySeasonCountdown());
      setNextUpdateSec((prev) => {
        if (prev <= 1) {
          fetchLeaderboard(false);
          return 900;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(tick);
  }, [fetchLeaderboard]);

  const formattedNextUpdate = useMemo(() => {
    const hrs = String(Math.floor(nextUpdateSec / 3600)).padStart(2, '0');
    const mins = String(Math.floor((nextUpdateSec % 3600) / 60)).padStart(2, '0');
    const secs = String(nextUpdateSec % 60).padStart(2, '0');
    return `${hrs}:${mins}:${secs}`;
  }, [nextUpdateSec]);

  // Deduplicate & keep current player live stats synced
  const deduplicatedGlobalEntries = useMemo(() => {
    const byId = new Map<string, LeaderboardEntry>();
    const byNormName = new Map<string, LeaderboardEntry>();

    const sourceList: LeaderboardEntry[] = [...entries];
    const hasCurrentInList = sourceList.some((e) => e.id === user.id || e.isCurrentPlayer);
    if (!hasCurrentInList) {
      sourceList.push({
        rank: sourceList.length + 1,
        id: user.id,
        displayName: user.displayName || user.username || 'FoxPlayer',
        username: user.username || 'fox_player',
        balance: user.balance,
        profitPerHour: user.profitPerHour,
        level: user.level,
        levelName: user.levelName,
        isCurrentPlayer: true,
      });
    }

    for (const item of sourceList) {
      if (!item || !item.id) continue;
      const isMe = item.id === user.id || Boolean(item.isCurrentPlayer);
      const syncedItem: LeaderboardEntry = isMe
        ? {
            ...item,
            id: user.id,
            displayName: user.displayName || user.username || item.displayName,
            username: user.username || item.username,
            balance: Math.max(Number(user.balance || 0), Number(item.balance || 0)),
            profitPerHour: Math.max(Number(user.profitPerHour || 0), Number(item.profitPerHour || 0)),
            level: Math.max(Number(user.level || 1), Number(item.level || 1)),
            levelName: user.levelName || item.levelName,
            isCurrentPlayer: true,
          }
        : {
            ...item,
            isCurrentPlayer: false,
          };

      byId.set(syncedItem.id, syncedItem);
    }

    for (const entry of byId.values()) {
      const normName = (entry.displayName || entry.username || entry.id).trim().toLowerCase();
      const existing = byNormName.get(normName);
      if (!existing) {
        byNormName.set(normName, entry);
      } else {
        const keepCandidate =
          Boolean(entry.isCurrentPlayer) ||
          (!existing.isCurrentPlayer &&
            (entry.balance > existing.balance ||
              (entry.balance === existing.balance && entry.profitPerHour > existing.profitPerHour)));
        if (keepCandidate) {
          byNormName.set(normName, entry);
        }
      }
    }

    const sorted = Array.from(byNormName.values()).sort((a, b) => {
      if (b.balance !== a.balance) return b.balance - a.balance;
      return (b.profitPerHour || 0) - (a.profitPerHour || 0);
    });

    return sorted.map((item, idx) => ({
      ...item,
      rank: idx + 1,
    }));
  }, [entries, user]);

  // Filter-specific leaderboard entries (Global, Friends, Weekly)
  const displayedEntries = useMemo(() => {
    if (activeFilter === 'global') {
      return deduplicatedGlobalEntries;
    }

    if (activeFilter === 'friends') {
      const friendMap = new Map<string, LeaderboardEntry>();
      // Always include the current player
      friendMap.set(user.id, {
        rank: 1,
        id: user.id,
        displayName: user.displayName || user.username || 'FoxPlayer',
        username: user.username || 'fox_player',
        balance: user.balance,
        profitPerHour: user.profitPerHour,
        level: user.level,
        levelName: user.levelName,
        isCurrentPlayer: true,
      });

      const allFriends = [...friendsList, ...(user.invitedFriends || [])];
      for (const fr of allFriends) {
        if (!fr || !fr.id || fr.id === user.id) continue;
        const globalMatch = deduplicatedGlobalEntries.find((g) => g.id === fr.id);
        friendMap.set(fr.id, {
          rank: 1,
          id: fr.id,
          displayName: globalMatch?.displayName || fr.displayName || fr.username || 'FoxFriend',
          username: globalMatch?.username || fr.username || 'fox_friend',
          balance: Math.max(Number(fr.balance || 0), Number(globalMatch?.balance || 0)),
          profitPerHour: Math.max(Number(fr.profitPerHour || 0), Number(globalMatch?.profitPerHour || 0)),
          level: Math.max(Number(fr.level || 1), Number(globalMatch?.level || 1)),
          levelName: globalMatch?.levelName || fr.levelName || 'Bronze Fox',
          isCurrentPlayer: false,
        });
      }

      const sortedFriends = Array.from(friendMap.values()).sort((a, b) => {
        if (b.balance !== a.balance) return b.balance - a.balance;
        return (b.profitPerHour || 0) - (a.profitPerHour || 0);
      });

      return sortedFriends.map((item, idx) => ({
        ...item,
        rank: idx + 1,
      }));
    }

    // Weekly filter: score reflects active weekly output (current balance + 7-day projected passive output)
    const weeklyRanked = deduplicatedGlobalEntries
      .map((entry) => {
        const weeklyScore = Math.floor(entry.balance + (entry.profitPerHour || 0) * 24);
        return {
          ...entry,
          balance: weeklyScore,
        };
      })
      .sort((a, b) => {
        if (b.balance !== a.balance) return b.balance - a.balance;
        return (b.profitPerHour || 0) - (a.profitPerHour || 0);
      })
      .map((item, idx) => ({
        ...item,
        rank: idx + 1,
      }));

    return weeklyRanked;
  }, [activeFilter, deduplicatedGlobalEntries, friendsList, user]);

  // Current player's active entry & distance to next rank
  const myActiveEntry = useMemo<LeaderboardEntry>(() => {
    const found = displayedEntries.find((e) => e.id === user.id || e.isCurrentPlayer);
    if (found) return found;
    if (playerEntry) {
      return {
        ...playerEntry,
        balance: Math.max(user.balance, playerEntry.balance),
        profitPerHour: Math.max(user.profitPerHour, playerEntry.profitPerHour),
        level: Math.max(user.level, playerEntry.level),
        isCurrentPlayer: true,
      };
    }
    return {
      rank: displayedEntries.length + 1,
      id: user.id,
      displayName: user.displayName || user.username || 'FoxPlayer',
      username: user.username || 'fox_player',
      balance: user.balance,
      profitPerHour: user.profitPerHour,
      level: user.level,
      levelName: user.levelName,
      isCurrentPlayer: true,
    };
  }, [displayedEntries, playerEntry, user]);

  const nextRankTarget = useMemo(() => {
    if (myActiveEntry.rank <= 1) {
      return { targetRank: 1, distance: 0, isTopChampion: true };
    }
    const aboveIdx = displayedEntries.findIndex((e) => e.rank === myActiveEntry.rank - 1);
    const aboveEntry = aboveIdx !== -1 ? displayedEntries[aboveIdx] : undefined;
    if (!aboveEntry) {
      return { targetRank: myActiveEntry.rank - 1, distance: 1000, isTopChampion: false };
    }
    const distance = Math.max(1, Math.floor(aboveEntry.balance - myActiveEntry.balance + 1));
    return {
      targetRank: aboveEntry.rank,
      distance,
      aboveName: aboveEntry.displayName,
      isTopChampion: false,
    };
  }, [displayedEntries, myActiveEntry]);

  const myFoxLeague: FoxLeagueDefinition = useMemo(
    () => getFoxLeagueForScore(myActiveEntry.balance),
    [myActiveEntry.balance]
  );

  const top3 = useMemo(() => displayedEntries.slice(0, 3), [displayedEntries]);

  return (
    <div className="w-full max-w-md mx-auto px-3 pb-32 pt-1.5 text-white select-none overflow-x-hidden">
      {/* 1. Title & Next Update Refresh Bar */}
      <div className="flex items-center justify-between gap-2 mb-3 px-0.5">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <Crown className="w-5 h-5 text-amber-400 fill-amber-400 shrink-0 drop-shadow-[0_0_8px_rgba(251,191,36,0.6)]" />
            <h1 className="text-lg sm:text-xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-amber-100 via-amber-300 to-amber-500 truncate">
              Hall of Foxes
            </h1>
          </div>
          <p className="text-[11px] font-semibold text-amber-200/70 truncate">Top FOXCOIN Champions</p>
        </div>

        {/* Next Update + Functional Refresh Button */}
        <div className="flex items-center gap-1.5 bg-[#0D1323]/95 border border-amber-500/35 rounded-xl pl-2.5 pr-1.5 py-1 shadow-[0_4px_14px_rgba(0,0,0,0.5)] shrink-0">
          <div className="text-right leading-tight">
            <span className="block text-[9px] uppercase tracking-wider text-slate-400 font-bold">
              Next Update
            </span>
            <span className="block text-[11px] font-black text-amber-300 tabular-nums">
              {formattedNextUpdate}
            </span>
          </div>
          <button
            type="button"
            onClick={() => fetchLeaderboard(true)}
            disabled={isLoading}
            aria-label="Refresh Leaderboard"
            className="w-7 h-7 rounded-lg bg-gradient-to-b from-amber-500/25 to-amber-700/20 hover:from-amber-500/40 hover:to-amber-600/30 border border-amber-400/40 flex items-center justify-center text-amber-300 transition active:scale-90 cursor-pointer disabled:opacity-60"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-amber-200' : ''}`} />
          </button>
        </div>
      </div>

      {/* 2. Premium Top-Three Podium (#2 Silver, #1 Gold Champion, #3 Bronze) */}
      <div className="relative rounded-2xl bg-gradient-to-b from-[#131B31]/95 via-[#0D1324]/95 to-[#090D18]/98 border border-amber-500/30 p-2.5 pt-3 pb-3 mb-3 shadow-[0_10px_30px_rgba(0,0,0,0.65)] overflow-hidden">
        {/* Subtle radial gold spotlight behind #1 */}
        <div className="pointer-events-none absolute -top-10 left-1/2 -translate-x-1/2 w-56 h-36 bg-amber-500/15 rounded-full blur-2xl" />

        <div className="grid grid-cols-3 gap-1.5 sm:gap-2 items-end relative z-10">
          {/* #2 SILVER PLACE (Left) */}
          {top3[1] ? (
            <PodiumCard
              entry={top3[1]}
              place={2}
              podiumArt="/assets/rank/podium_2_silver.png"
              isCurrentUser={top3[1].id === user.id || Boolean(top3[1].isCurrentPlayer)}
            />
          ) : (
            <EmptyPodiumSlot place={2} />
          )}

          {/* #1 GOLD CHAMPION (Center Elevated) */}
          {top3[0] ? (
            <PodiumCard
              entry={top3[0]}
              place={1}
              podiumArt="/assets/rank/podium_1_gold.png"
              isCurrentUser={top3[0].id === user.id || Boolean(top3[0].isCurrentPlayer)}
            />
          ) : (
            <EmptyPodiumSlot place={1} />
          )}

          {/* #3 BRONZE PLACE (Right) */}
          {top3[2] ? (
            <PodiumCard
              entry={top3[2]}
              place={3}
              podiumArt="/assets/rank/podium_3_bronze.png"
              isCurrentUser={top3[2].id === user.id || Boolean(top3[2].isCurrentPlayer)}
            />
          ) : (
            <EmptyPodiumSlot place={3} />
          )}
        </div>
      </div>

      {/* 3. "My Rank" Panel */}
      <div className="relative rounded-2xl bg-gradient-to-r from-[#171F36] via-[#11182B] to-[#191A2E] border-2 border-amber-500/50 p-2.5 mb-3 shadow-[0_6px_22px_rgba(245,158,11,0.14)] overflow-hidden">
        <div className="pointer-events-none absolute -right-8 -top-8 w-28 h-28 bg-amber-500/10 rounded-full blur-xl" />

        <div className="flex items-center justify-between gap-2 relative z-10">
          {/* Left: Player Avatar & Identity */}
          <div className="flex items-center gap-2.5 min-w-0">
            <FoxCircularAvatar
              tier={getActiveCharacterTier(
                user.level,
                user.equippedCharacterTier || loadSavedCharacterPrefs(user.id).tierId
              )}
              className="w-12 h-12 bg-[#0B0F1C] border-2 border-amber-400/70 shadow-[0_0_12px_rgba(251,191,36,0.25)]"
            />

            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-xs sm:text-sm font-black text-amber-400 tracking-tight">
                  My Rank #{myActiveEntry.rank}
                </span>
                <span className="px-1.5 py-0.5 rounded-md bg-gradient-to-r from-amber-500/30 to-yellow-500/20 border border-amber-400/50 text-[10px] font-black text-amber-200 leading-none">
                  Lv {myActiveEntry.level}
                </span>
              </div>

              <div className="flex items-center gap-1 mt-0.5 min-w-0">
                <span className="font-extrabold text-xs sm:text-sm text-white truncate">
                  {myActiveEntry.displayName}
                </span>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 fill-emerald-950 shrink-0" />
              </div>

              <div className="flex items-center gap-1 mt-0.5">
                <div className="w-3.5 h-3.5 shrink-0">
                  <img
                    src={myFoxLeague.badgeImg}
                    alt={myFoxLeague.name}
                    className="w-full h-full object-contain"
                  />
                </div>
                <span className="text-[10px] font-bold text-amber-300/90 truncate">
                  {myFoxLeague.name}
                </span>
              </div>
            </div>
          </div>

          {/* Right: Next Rank Target Box */}
          <div className="bg-[#0B0F1D]/90 border border-amber-500/35 rounded-xl px-2.5 py-1.5 text-right shrink-0 shadow-inner">
            <div className="flex items-center justify-end gap-1">
              <span className="text-[10px] font-bold text-slate-300">Next Rank</span>
              <span className="text-xs font-black text-amber-300">
                {nextRankTarget.isTopChampion ? '#1 MAX' : `#${nextRankTarget.targetRank}`}
              </span>
            </div>
            <div className="flex items-center justify-end gap-1 mt-0.5">
              <img src={foxGoldCoinImg} alt="FOX" className="w-3.5 h-3.5 object-contain shrink-0" />
              <span className="text-[11px] font-black text-amber-400 tabular-nums">
                {nextRankTarget.isTopChampion
                  ? 'Champion'
                  : `+${formatCompactFox(nextRankTarget.distance)}`}
              </span>
            </div>
          </div>
        </div>

        {/* Bottom Stats Strip: Verified Score & Hourly Income */}
        <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-slate-800/90 relative z-10">
          <div className="flex items-center justify-between bg-[#0B0F1C]/80 border border-slate-800/90 rounded-lg px-2.5 py-1">
            <span className="text-[10px] font-bold text-slate-400">Score</span>
            <div className="flex items-center gap-1 min-w-0">
              <img src={foxGoldCoinImg} alt="FOX" className="w-3.5 h-3.5 object-contain shrink-0" />
              <span className="text-xs font-black text-white tabular-nums truncate">
                {formatFullFox(myActiveEntry.balance)}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between bg-[#0B0F1C]/80 border border-slate-800/90 rounded-lg px-2.5 py-1">
            <span className="text-[10px] font-bold text-slate-400">Hourly Income</span>
            <div className="flex items-center gap-1 min-w-0">
              <img src={foxGoldCoinImg} alt="FOX" className="w-3.5 h-3.5 object-contain shrink-0" />
              <span className="text-xs font-black text-emerald-400 tabular-nums truncate">
                +{formatFullFox(myActiveEntry.profitPerHour)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Leaderboard Filter Tabs: Global | Friends | Weekly */}
      <div className="grid grid-cols-3 gap-1.5 bg-[#0B101E] border border-amber-500/30 rounded-xl p-1 mb-3 shadow-inner">
        {(
          [
            { id: 'global', label: 'Global' },
            { id: 'friends', label: 'Friends' },
            { id: 'weekly', label: 'Weekly' },
          ] as const
        ).map((tab) => {
          const isActive = activeFilter === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                TelegramService.hapticSelection();
                setActiveFilter(tab.id);
              }}
              className={`py-2 px-2 rounded-lg font-black text-xs tracking-wide transition-all cursor-pointer ${
                isActive
                  ? 'bg-gradient-to-b from-amber-300 via-amber-500 to-amber-600 text-slate-950 shadow-[0_0_15px_rgba(245,158,11,0.45)] border border-amber-200/80'
                  : 'text-slate-300 hover:text-amber-200 hover:bg-slate-800/50'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Filter context banner for Friends or Weekly */}
      {activeFilter === 'friends' && (
        <div className="flex items-center justify-between gap-2 bg-[#10182B]/90 border border-amber-500/25 rounded-xl px-3 py-2 mb-2.5">
          <div className="flex items-center gap-2 min-w-0">
            <Users className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="text-[11px] text-slate-300 font-semibold truncate">
              Competing with { Math.max(0, displayedEntries.length - 1) } invited friend{displayedEntries.length - 1 === 1 ? '' : 's'}
            </span>
          </div>
          {onNavigateTab && (
            <button
              type="button"
              onClick={() => onNavigateTab('friends')}
              className="px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/40 text-[10px] font-black text-amber-300 shrink-0 cursor-pointer"
            >
              Invite +
            </button>
          )}
        </div>
      )}

      {activeFilter === 'weekly' && (
        <div className="flex items-center justify-between gap-2 bg-[#10182B]/90 border border-amber-500/25 rounded-xl px-3 py-2 mb-2.5">
          <div className="flex items-center gap-2 min-w-0">
            <Clock className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="text-[11px] text-slate-300 font-semibold truncate">
              Weekly Season Score (Balance + 24h Yield)
            </span>
          </div>
          <span className="text-[10px] font-black text-amber-300 tabular-nums shrink-0">
            {weeklyCountdown.days}d {weeklyCountdown.hours}:{weeklyCountdown.minutes}:{weeklyCountdown.seconds}
          </span>
        </div>
      )}

      {/* 5. Improved Leaderboard Rows */}
      <div className="space-y-1.5 mb-3.5">
        {displayedEntries.map((entry) => {
          const isMe = entry.isCurrentPlayer || entry.id === user.id;
          const league = getFoxLeagueForScore(entry.balance);
          const avatarSrc = getAvatarForPlayer(entry.id, entry.rank, isMe);
          const perSecond = Math.max(0, Math.round((entry.profitPerHour || 0) / 3600));

          return (
            <div
              key={`${activeFilter}_${entry.id}`}
              className={`relative flex items-center justify-between gap-2 rounded-xl px-2.5 py-2 transition-all ${
                isMe
                  ? 'bg-gradient-to-r from-amber-500/20 via-[#18223A] to-amber-500/15 border-2 border-amber-400/70 shadow-[0_0_18px_rgba(245,158,11,0.2)]'
                  : entry.rank <= 3
                  ? 'bg-gradient-to-r from-[#141D33]/95 via-[#0F1629]/95 to-[#141D33]/90 border border-amber-500/30'
                  : 'bg-[#0E1526]/90 border border-slate-800/90 hover:border-slate-700'
              }`}
            >
              {/* Left: Rank Medal/Number + Avatar + Identity */}
              <div className="flex items-center gap-2 min-w-0 flex-1">
                {/* Rank Badge */}
                <div className="w-7 h-7 flex items-center justify-center shrink-0">
                  {entry.rank === 1 ? (
                    <img
                      src="/assets/rank/medal_1.png"
                      alt="#1"
                      className="w-7 h-7 object-contain drop-shadow-[0_2px_6px_rgba(251,191,36,0.5)]"
                    />
                  ) : entry.rank === 2 ? (
                    <img
                      src="/assets/rank/medal_2.png"
                      alt="#2"
                      className="w-7 h-7 object-contain drop-shadow-[0_2px_6px_rgba(203,213,225,0.4)]"
                    />
                  ) : entry.rank === 3 ? (
                    <img
                      src="/assets/rank/medal_3.png"
                      alt="#3"
                      className="w-7 h-7 object-contain drop-shadow-[0_2px_6px_rgba(217,119,6,0.4)]"
                    />
                  ) : (
                    <span className="w-6 h-6 rounded-full bg-[#17223B] border border-slate-700/80 flex items-center justify-center text-[11px] font-black text-slate-300 tabular-nums">
                      {entry.rank}
                    </span>
                  )}
                </div>

                {/* Dedicated Circular Fox Avatar */}
                <FoxCircularAvatar
                  src={
                    isMe
                      ? getActiveCharacterTier(
                          user.level,
                          user.equippedCharacterTier || loadSavedCharacterPrefs(user.id).tierId
                        ).avatarUrl
                      : avatarSrc
                  }
                  alt={entry.displayName}
                  className={`w-10 h-10 bg-[#090D18] ${
                    entry.rank === 1
                      ? 'border-2 border-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.35)]'
                      : entry.rank === 2
                      ? 'border-2 border-slate-300'
                      : entry.rank === 3
                      ? 'border-2 border-amber-600'
                      : isMe
                      ? 'border-2 border-amber-400'
                      : 'border border-slate-700'
                  }`}
                />

                {/* Username + Level Pill + League Badge */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="font-extrabold text-xs sm:text-[13px] text-white truncate">
                      {entry.displayName}
                    </span>
                    <span className="px-1.5 py-0.5 rounded bg-amber-500/20 border border-amber-400/40 text-[9px] font-black text-amber-300 leading-none shrink-0">
                      Lv {entry.level}
                    </span>
                    {isMe && (
                      <span className="px-1.5 py-0.5 rounded bg-amber-400 text-slate-950 text-[9px] font-black leading-none shrink-0">
                        YOU
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1 mt-0.5 min-w-0">
                    <div className="w-3.5 h-3.5 shrink-0">
                      <img
                        src={league.badgeImg}
                        alt={league.name}
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <span className="text-[10px] font-semibold text-slate-300 truncate">
                      {league.name}
                    </span>
                  </div>
                </div>
              </div>

              {/* Right: Verified Score + Passive Yield */}
              <div className="text-right shrink-0 pl-1">
                <div className="flex items-center justify-end gap-1 font-black text-xs sm:text-[13px] text-amber-300 tabular-nums">
                  <img src={foxGoldCoinImg} alt="FOX" className="w-3.5 h-3.5 object-contain shrink-0" />
                  <span>{formatFullFox(entry.balance)}</span>
                </div>
                <div className="text-[10px] font-bold text-emerald-400 tabular-nums mt-0.5">
                  {perSecond > 0
                    ? `+${formatFullFox(perSecond)} /sec`
                    : `+${formatFullFox(entry.profitPerHour)} /hr`}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* 6. Fox Leagues & Weekly Competition Panels (Matching Reference Cards) */}
      <div className="grid grid-cols-1 min-[360px]:grid-cols-2 gap-2.5 mb-2">
        {/* FOX LEAGUES CARD */}
        <div className="rounded-2xl bg-gradient-to-b from-[#131C33] to-[#0B101F] border border-amber-500/35 p-2.5 shadow-lg flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-1 mb-2 pb-1.5 border-b border-slate-800/90">
              <span className="text-xs font-black text-amber-200 tracking-tight">Fox Leagues</span>
              <button
                type="button"
                onClick={() => {
                  TelegramService.hapticSelection();
                  setShowLeagueModal(true);
                }}
                aria-label="Fox Leagues Info"
                className="w-5 h-5 rounded-full bg-slate-800 hover:bg-slate-700 border border-amber-400/40 flex items-center justify-center text-amber-300 cursor-pointer"
              >
                <Info className="w-3 h-3" />
              </button>
            </div>

            <div className="space-y-1.5">
              {FOX_LEAGUES.map((lg) => {
                const isCurrentLeague = myFoxLeague.id === lg.id;
                return (
                  <div
                    key={lg.id}
                    className={`flex items-center justify-between gap-1.5 rounded-lg px-1.5 py-1 transition ${
                      isCurrentLeague
                        ? 'bg-amber-500/20 border border-amber-400/60 shadow-[0_0_10px_rgba(245,158,11,0.18)]'
                        : 'bg-[#090E1A]/60 border border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 min-w-0">
                      <div className="w-4 h-4 shrink-0">
                        <img
                          src={lg.badgeImg}
                          alt={lg.name}
                          className="w-full h-full object-contain"
                        />
                      </div>
                      <span
                        className={`text-[10px] font-extrabold truncate ${
                          isCurrentLeague ? 'text-amber-300' : 'text-slate-200'
                        }`}
                      >
                        {lg.name}
                      </span>
                    </div>
                    <span className="text-[9px] font-bold text-amber-200/80 tabular-nums shrink-0">
                      {lg.rangeLabel}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* WEEKLY COMPETITION CARD */}
        <div className="rounded-2xl bg-gradient-to-b from-[#131C33] to-[#0B101F] border border-amber-500/35 p-2.5 shadow-lg flex flex-col justify-between relative overflow-hidden">
          <div className="pointer-events-none absolute -bottom-6 -right-6 w-24 h-24 bg-amber-500/15 rounded-full blur-xl" />

          <div>
            <div className="mb-1.5 pb-1.5 border-b border-slate-800/90">
              <span className="text-xs font-black text-amber-200 tracking-tight block">
                Weekly Competition
              </span>
            </div>

            <div className="bg-[#090E1A]/90 border border-amber-500/25 rounded-lg px-2 py-1 mb-2">
              <span className="text-[9px] font-bold text-slate-400 block">Ends in</span>
              <span className="text-[11px] font-black text-amber-300 tabular-nums">
                {weeklyCountdown.days}d {weeklyCountdown.hours}:{weeklyCountdown.minutes}:{weeklyCountdown.seconds}
              </span>
            </div>

            <div className="flex items-center justify-between gap-1.5 my-1">
              <div className="min-w-0">
                <span className="text-[11px] font-black text-white block leading-tight">
                  Top 100
                </span>
                <span className="text-[11px] font-black text-amber-300 block leading-tight">
                  Rewards
                </span>
              </div>
              <div className="w-14 h-12 shrink-0 flex items-center justify-center">
                <img
                  src="/assets/missions/daily_chest.png"
                  alt="Weekly Competition Chest"
                  className="w-full h-full object-contain drop-shadow-[0_4px_10px_rgba(245,158,11,0.4)]"
                />
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              TelegramService.hapticSelection();
              setShowWeeklyRewardsModal(true);
            }}
            className="w-full mt-1.5 py-1.5 px-2 rounded-xl bg-gradient-to-r from-amber-400 via-amber-500 to-orange-500 hover:from-amber-300 hover:to-orange-400 text-slate-950 font-black text-[11px] shadow-[0_4px_12px_rgba(245,158,11,0.35)] border border-amber-200/70 flex items-center justify-center gap-1 transition active:scale-95 cursor-pointer"
          >
            <span>View Rewards</span>
            <ChevronRight className="w-3.5 h-3.5 stroke-[2.5]" />
          </button>
        </div>
      </div>

      {/* Virtual In-Game Currency Notice */}
      <p className="text-center text-[10px] text-slate-500 mt-3 px-2">
        FOX is an in-game virtual currency for empire progression and rankings.
      </p>

      {/* MODAL 1: FOX LEAGUES PROGRESSION MODAL */}
      {showLeagueModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm rounded-2xl bg-gradient-to-b from-[#16203A] to-[#0B101E] border-2 border-amber-500/50 p-4 text-white shadow-2xl">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-amber-400" />
                <h3 className="text-base font-black text-amber-200">Fox Leagues Progression</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowLeagueModal(false)}
                className="w-7 h-7 rounded-lg bg-slate-800/90 flex items-center justify-center text-slate-300 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-300 mb-3 leading-relaxed">
              Your Fox League is determined by your verified FOX balance. Climb through all five royal leagues to showcase your emblem on the Hall of Foxes podium.
            </p>

            <div className="space-y-2 mb-4">
              {FOX_LEAGUES.map((lg) => {
                const isMine = myFoxLeague.id === lg.id;
                return (
                  <div
                    key={lg.id}
                    className={`flex items-center justify-between p-2.5 rounded-xl border ${
                      isMine
                        ? 'bg-amber-500/15 border-amber-400/70'
                        : 'bg-[#0D1323] border-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <img src={lg.badgeImg} alt={lg.name} className="w-7 h-7 object-contain" />
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-black text-white">{lg.name}</span>
                          {isMine && (
                            <span className="px-1.5 py-0.5 rounded bg-amber-400 text-slate-950 text-[9px] font-black">
                              CURRENT
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-slate-400">
                          Minimum Requirement: {formatFullFox(lg.minCoins)} FOX
                        </span>
                      </div>
                    </div>
                    <span className="text-xs font-black text-amber-300">{lg.rangeLabel}</span>
                  </div>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => setShowLeagueModal(false)}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 font-black text-xs cursor-pointer"
            >
              Got It
            </button>
          </div>
        </div>
      )}

      {/* MODAL 2: WEEKLY COMPETITION REWARDS MODAL */}
      {showWeeklyRewardsModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm rounded-2xl bg-gradient-to-b from-[#16203A] to-[#0B101E] border-2 border-amber-500/50 p-4 text-white shadow-2xl">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-amber-400" />
                <div>
                  <h3 className="text-base font-black text-amber-200 leading-tight">
                    Weekly Competition
                  </h3>
                  <span className="text-[10px] text-amber-300/80 font-bold">
                    Ends in {weeklyCountdown.days}d {weeklyCountdown.hours}:{weeklyCountdown.minutes}:{weeklyCountdown.seconds}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowWeeklyRewardsModal(false)}
                className="w-7 h-7 rounded-lg bg-slate-800/90 flex items-center justify-center text-slate-300 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-[#0D1323] border border-amber-500/30 rounded-xl p-2.5 mb-3 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-slate-400 block">Your Current Rank</span>
                <span className="text-sm font-black text-amber-300">
                  #{myActiveEntry.rank} ({myActiveEntry.displayName})
                </span>
              </div>
              <span className="px-2 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/40 text-[10px] font-black text-emerald-300">
                {myActiveEntry.rank <= 100 ? 'In Top 100 Prize Zone' : 'Climb to Top 100'}
              </span>
            </div>

            <div className="space-y-1.5 max-h-64 overflow-y-auto pr-0.5 mb-4">
              {WEEKLY_REWARD_TIERS.map((tier) => (
                <div
                  key={tier.rankLabel}
                  className="flex items-center justify-between p-2 rounded-xl bg-[#0D1323]/90 border border-slate-800"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-base shrink-0">{tier.badge}</span>
                    <div className="min-w-0">
                      <span className="text-xs font-extrabold text-white block truncate">
                        {tier.rankLabel}
                      </span>
                      <span className="text-[10px] text-slate-400 block truncate">{tier.desc}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0 pl-2">
                    <img src={foxGoldCoinImg} alt="FOX" className="w-3.5 h-3.5 object-contain" />
                    <span className="text-xs font-black text-amber-300 tabular-nums">
                      +{formatCompactFox(tier.rewardFox)}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={() => {
                setActiveFilter('weekly');
                setShowWeeklyRewardsModal(false);
              }}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-400 via-amber-500 to-orange-500 text-slate-950 font-black text-xs cursor-pointer"
            >
              View Weekly Standings
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

interface PodiumCardProps {
  entry: LeaderboardEntry;
  place: 1 | 2 | 3;
  podiumArt: string;
  isCurrentUser: boolean;
}

const PodiumCard: React.FC<PodiumCardProps> = ({ entry, place, podiumArt, isCurrentUser }) => {
  const league = getFoxLeagueForScore(entry.balance);
  const isFirst = place === 1;
  const isSecond = place === 2;

  const borderStyle = isFirst
    ? 'from-amber-500/25 via-[#181F36] to-[#0E1322] border-amber-400/80 shadow-[0_0_24px_rgba(251,191,36,0.28)]'
    : isSecond
    ? 'from-slate-400/15 via-[#141C30] to-[#0D1220] border-slate-300/60 shadow-[0_0_15px_rgba(203,213,225,0.15)]'
    : 'from-amber-700/20 via-[#151B2E] to-[#0D1220] border-amber-600/60 shadow-[0_0_15px_rgba(217,119,6,0.18)]';

  return (
    <div
      className={`flex flex-col items-center bg-gradient-to-b ${borderStyle} border-2 rounded-2xl p-2 pb-2.5 relative overflow-hidden ${
        isFirst ? 'pt-3 -mt-1 z-10' : 'pt-2'
      }`}
    >
      {/* Dedicated Podium Artwork Container */}
      <div className={`${isFirst ? 'w-20 h-20' : 'w-16 h-16'} aspect-square shrink-0 mb-1 flex items-center justify-center`}>
        <img
          src={podiumArt}
          alt={`#${place} ${entry.displayName}`}
          className="w-full h-full object-contain drop-shadow-[0_4px_10px_rgba(0,0,0,0.6)]"
        />
      </div>

      {/* Username + Lv Pill */}
      <div className="w-full flex items-center justify-center gap-1 min-w-0 px-0.5">
        <span
          className={`font-black text-[11px] sm:text-xs truncate ${
            isFirst ? 'text-amber-100' : 'text-white'
          }`}
        >
          {entry.displayName}
        </span>
      </div>

      <div className="flex items-center justify-center gap-1 mt-0.5">
        <span className="px-1.5 py-0.5 rounded bg-amber-500/25 border border-amber-400/50 text-[9px] font-black text-amber-200 leading-none">
          Lv {entry.level}
        </span>
        {isCurrentUser && (
          <span className="px-1 py-0.5 rounded bg-amber-400 text-slate-950 text-[8px] font-black leading-none">
            YOU
          </span>
        )}
      </div>

      {/* Verified Score */}
      <div className="flex items-center justify-center gap-1 mt-1 w-full min-w-0">
        <img src={foxGoldCoinImg} alt="FOX" className="w-3.5 h-3.5 object-contain shrink-0" />
        <span
          className={`font-black text-[10px] sm:text-[11px] tabular-nums truncate ${
            isFirst ? 'text-amber-300' : isSecond ? 'text-slate-200' : 'text-amber-200'
          }`}
        >
          {formatFullFox(entry.balance)}
        </span>
      </div>

      {/* Fox League Shield + League Name */}
      <div className="flex items-center justify-center gap-1 mt-1 px-1.5 py-0.5 rounded-full bg-[#090D18]/80 border border-slate-700/70 max-w-full">
        <img src={league.badgeImg} alt={league.name} className="w-3 h-3 object-contain shrink-0" />
        <span className="text-[9px] font-bold text-amber-200/90 truncate">{league.name}</span>
      </div>
    </div>
  );
};

const EmptyPodiumSlot: React.FC<{ place: 1 | 2 | 3 }> = ({ place }) => (
  <div className="flex flex-col items-center justify-center bg-[#0D1323]/60 border border-dashed border-slate-700/70 rounded-2xl p-2.5 min-h-[146px] text-center">
    <Sparkles className="w-5 h-5 text-slate-600 mb-1" />
    <span className="text-[10px] font-bold text-slate-500">Rank #{place}</span>
    <span className="text-[9px] text-slate-600">Open Spot</span>
  </div>
);
