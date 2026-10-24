import React, { useEffect, useState } from 'react';
import { Trophy, Medal, Crown, TrendingUp, Sparkles, RefreshCw } from 'lucide-react';
import { LeaderboardEntry, UserGameState } from '../types/game.js';
import { api } from '../utils/api.js';
import { foxGoldCoinImg } from '../assets/assets.js';

interface LeaderboardScreenProps {
  user: UserGameState;
}

export const LeaderboardScreen: React.FC<LeaderboardScreenProps> = ({ user }) => {
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
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const fetchLeaderboard = React.useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await api.getLeaderboard(100);
      if (Array.isArray(res.list) && res.list.length > 0) {
        setEntries(res.list);
      }
      if (res.playerEntry) {
        setPlayerEntry(res.playerEntry);
      }
    } catch (err) {
      console.error('Failed to load leaderboard:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLeaderboard();
    const timer = setInterval(fetchLeaderboard, 20000);
    return () => clearInterval(timer);
  }, [fetchLeaderboard]);

  const top3 = entries.slice(0, 3);

  return (
    <div className="w-full max-w-md mx-auto px-4 pb-28 pt-2 text-white">
      {/* Title & Refresh */}
      <div className="flex items-center justify-between mb-4 px-1">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-amber-400 to-orange-400">
              Hall of Foxes
            </h3>
          </div>
          <p className="text-xs text-slate-400">Top FOXCOIN Champions</p>
        </div>
        <button
          onClick={fetchLeaderboard}
          disabled={isLoading}
          className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-slate-300 transition active:scale-95 cursor-pointer"
          title="Refresh"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-amber-400' : ''}`} />
        </button>
      </div>

      {/* Podium for Top 1-3 Real Players */}
      {top3.length >= 1 && (
        <div className="grid grid-cols-3 gap-2 items-end mb-6 pt-4">
          {/* #2 Rank */}
          {top3[1] ? (
            <div className="flex flex-col items-center bg-slate-900/90 border border-slate-700/60 rounded-2xl p-2.5 pb-3 shadow-md relative">
              <span className="absolute -top-3 w-6 h-6 rounded-full bg-slate-300 text-slate-900 font-black text-xs flex items-center justify-center border-2 border-[#0B0E17]">
                2
              </span>
              <div className="w-11 h-11 rounded-full bg-slate-800 border-2 border-slate-400 overflow-hidden mb-1 mt-1">
                <img src={foxGoldCoinImg} alt="Avatar" className="w-full h-full object-cover" />
              </div>
              <span className="font-bold text-xs text-slate-200 truncate max-w-full text-center">
                {top3[1].displayName}
              </span>
              <span className="text-[10px] text-amber-300 font-extrabold mt-0.5">
                {Math.floor(top3[1].balance).toLocaleString('en-US')}
              </span>
              <span className="text-[9px] text-slate-400">{top3[1].levelName}</span>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center bg-slate-900/40 border border-dashed border-slate-800 rounded-2xl p-2.5 pb-3 min-h-[112px] text-center">
              <span className="text-[10px] font-bold text-slate-600">#2 Open</span>
            </div>
          )}

          {/* #1 Rank (Champion) */}
          <div className="flex flex-col items-center bg-gradient-to-b from-amber-500/20 to-slate-900 border-2 border-amber-500/60 rounded-2xl p-2.5 pb-4 shadow-xl shadow-amber-500/10 relative scale-105 z-10">
            <div className="absolute -top-5 flex flex-col items-center">
              <Crown className="w-6 h-6 text-amber-400 fill-amber-400 animate-bounce" />
              <span className="w-6 h-6 -mt-1 rounded-full bg-gradient-to-tr from-amber-400 to-yellow-300 text-slate-950 font-black text-xs flex items-center justify-center border-2 border-[#0B0E17] shadow-md">
                1
              </span>
            </div>
            <div className="w-13 h-13 rounded-full bg-slate-800 border-2 border-amber-400 overflow-hidden mb-1 mt-3 shadow-md shadow-amber-500/20">
              <img src={foxGoldCoinImg} alt="Avatar" className="w-full h-full object-cover" />
            </div>
            <span className="font-extrabold text-xs text-amber-200 truncate max-w-full text-center">
              {top3[0].displayName}
            </span>
            <span className="text-[11px] text-amber-300 font-black mt-0.5">
              {Math.floor(top3[0].balance).toLocaleString('en-US')}
            </span>
            <span className="text-[9px] text-amber-400/80 font-bold">{top3[0].levelName}</span>
          </div>

          {/* #3 Rank */}
          {top3[2] ? (
            <div className="flex flex-col items-center bg-slate-900/90 border border-slate-700/60 rounded-2xl p-2.5 pb-3 shadow-md relative">
              <span className="absolute -top-3 w-6 h-6 rounded-full bg-amber-700 text-amber-100 font-black text-xs flex items-center justify-center border-2 border-[#0B0E17]">
                3
              </span>
              <div className="w-11 h-11 rounded-full bg-slate-800 border-2 border-amber-700 overflow-hidden mb-1 mt-1">
                <img src={foxGoldCoinImg} alt="Avatar" className="w-full h-full object-cover" />
              </div>
              <span className="font-bold text-xs text-slate-200 truncate max-w-full text-center">
                {top3[2].displayName}
              </span>
              <span className="text-[10px] text-amber-300 font-extrabold mt-0.5">
                {Math.floor(top3[2].balance).toLocaleString('en-US')}
              </span>
              <span className="text-[9px] text-slate-400">{top3[2].levelName}</span>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center bg-slate-900/40 border border-dashed border-slate-800 rounded-2xl p-2.5 pb-3 min-h-[112px] text-center">
              <span className="text-[10px] font-bold text-slate-600">#3 Open</span>
            </div>
          )}
        </div>
      )}

      {/* Full Leaderboard Table of All Registered Users */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-lg divide-y divide-slate-800/80">
        {entries.map((entry) => {
          const isMe = entry.isCurrentPlayer || entry.id === user.id;

          return (
            <div
              key={entry.id}
              className={`flex items-center justify-between p-3 transition ${
                isMe ? 'bg-amber-500/10 border-l-4 border-l-amber-500' : 'hover:bg-slate-850'
              }`}
            >
              <div className="flex items-center gap-3">
                <span
                  className={`w-6 h-6 rounded-full flex items-center justify-center font-black text-xs ${
                    entry.rank === 1
                      ? 'bg-amber-400 text-slate-950'
                      : entry.rank === 2
                      ? 'bg-slate-300 text-slate-950'
                      : entry.rank === 3
                      ? 'bg-amber-700 text-amber-100'
                      : 'text-slate-400'
                  }`}
                >
                  {entry.rank}
                </span>

                <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 overflow-hidden shrink-0">
                  <img src={foxGoldCoinImg} alt="Avatar" className="w-full h-full object-cover" />
                </div>

                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-xs text-slate-200 truncate max-w-[130px]">
                      {entry.displayName}
                    </span>
                    {isMe && (
                      <span className="px-1 py-0.2 bg-amber-500 text-slate-950 font-black text-[9px] rounded">
                        YOU
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-slate-400">
                    @{entry.username} · {entry.levelName}
                  </span>
                </div>
              </div>

              <div className="text-right">
                <div className="flex items-center gap-1 justify-end font-black text-xs text-amber-300">
                  <img src={foxGoldCoinImg} alt="FOX" className="w-3 h-3" />
                  <span>{Math.floor(entry.balance).toLocaleString('en-US')}</span>
                </div>
                <div className="text-[10px] text-emerald-400 font-medium">
                  +{entry.profitPerHour.toLocaleString('en-US')}/hr
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Pinned player status bar */}
      {playerEntry && (
        <div className="fixed bottom-18 left-0 right-0 max-w-md mx-auto px-4 z-20 pointer-events-none">
          <div className="bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 text-white rounded-2xl p-2.5 shadow-2xl flex items-center justify-between border border-amber-400/40 pointer-events-auto">
            <div className="flex items-center gap-2.5">
              <span className="w-7 h-7 rounded-xl bg-slate-950/40 font-black text-xs flex items-center justify-center">
                #{playerEntry.rank}
              </span>
              <div>
                <span className="font-extrabold text-xs block leading-tight">Your Rank</span>
                <span className="text-[10px] text-amber-200">{playerEntry.levelName}</span>
              </div>
            </div>

            <div className="text-right">
              <span className="font-black text-xs block">
                {Math.floor(playerEntry.balance).toLocaleString('en-US')} FOX
              </span>
              <span className="text-[10px] text-amber-200">
                +{playerEntry.profitPerHour.toLocaleString('en-US')}/hr
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Disclaimer */}
      <p className="text-center text-[10px] text-slate-500 mt-4">
        FOX is an in-game virtual game currency with no real-world monetary value.
      </p>
    </div>
  );
};
