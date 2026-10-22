import React, { useState } from 'react';
import { CheckCircle2, Gift, ArrowUpRight, Sparkles, Clock, Users, Trophy } from 'lucide-react';
import confetti from 'canvas-confetti';
import { TaskDefinition, UserGameState } from '../types/game.js';
import { sound } from '../utils/audio.js';
import { TelegramService } from '../utils/telegram.js';
import { foxGoldCoinImg } from '../assets/assets.js';

interface TasksScreenProps {
  user: UserGameState;
  tasks: TaskDefinition[];
  onClaimTask: (taskId: string) => Promise<void>;
  onOpenWheel?: () => void;
}

export const TasksScreen: React.FC<TasksScreenProps> = ({ user, tasks, onClaimTask, onOpenWheel }) => {
  const [activeTab, setActiveTab] = useState<'all' | 'daily' | 'progression' | 'social'>('all');
  const [claimingId, setClaimingId] = useState<string | null>(null);

  const canSpinWheel =
    Date.now() - (user.boosters.lastWheelSpinTimestamp || 0) >= 24 * 60 * 60 * 1000;

  const filteredTasks = tasks.filter((t) => {
    if (activeTab === 'all') return true;
    return t.category === activeTab;
  });

  const getTaskStatus = (t: TaskDefinition) => {
    const userTask = user.tasks[t.id];
    if (userTask?.claimed) {
      return { isClaimed: true, isReady: false, progress: t.target };
    }

    // Check automatic server-backed progress
    let currentProgress = userTask?.progress || 0;
    if (t.id === 'tap_100' || t.id === 'tap_500') {
      currentProgress = user.totalTaps;
    } else if (t.id === 'first_upgrade') {
      currentProgress = Object.keys(user.upgrades).length;
    } else if (t.id === 'upgrade_5') {
      currentProgress = Object.values(user.upgrades).reduce((a, b) => a + b, 0);
    } else if (t.id === 'reach_silver') {
      currentProgress = user.level;
    } else if (t.id === 'reach_gold') {
      currentProgress = user.level;
    } else if (t.id === 'profit_1k') {
      currentProgress = user.profitPerHour;
    } else if (t.id === 'invite_1') {
      currentProgress = user.referralCount;
    } else if (t.category === 'social') {
      currentProgress = userTask?.completed ? t.target : 0;
    }

    const isReady = currentProgress >= t.target;
    return { isClaimed: false, isReady, progress: Math.min(t.target, currentProgress) };
  };

  const handleClaim = async (task: TaskDefinition) => {
    if (claimingId) return;
    try {
      setClaimingId(task.id);
      sound.playCoin();
      TelegramService.triggerNotificationHaptic('success');
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.7 },
        colors: ['#F59E0B', '#F97316', '#FBBF24'],
      });
      await onClaimTask(task.id);
    } finally {
      setClaimingId(null);
    }
  };

  const handleSocialClick = (task: TaskDefinition) => {
    if (task.actionUrl) {
      TelegramService.openLink(task.actionUrl);
      // Mark client intention, allow claiming after brief check
      setTimeout(() => {
        handleClaim(task);
      }, 1500);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto px-4 pb-24 pt-2 text-white">
      {/* Banner */}
      <div className="w-full bg-gradient-to-r from-orange-600/30 via-amber-500/20 to-slate-900 border border-amber-500/30 rounded-2xl p-4 mb-3 shadow-lg flex items-center justify-between">
        <div>
          <h3 className="font-extrabold text-base text-amber-300 flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-amber-400" /> Fox Mission Hub
          </h3>
          <p className="text-xs text-slate-300 mt-0.5">
            Complete milestones & collect big FOX coin bounties
          </p>
        </div>
        <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center shrink-0">
          <Trophy className="w-6 h-6 text-amber-400" />
        </div>
      </div>

      {/* Featured Daily Lucky Wheel Card */}
      {onOpenWheel && (
        <div
          onClick={onOpenWheel}
          className="w-full mb-4 p-3.5 rounded-2xl bg-gradient-to-r from-amber-500/20 via-purple-600/20 to-emerald-500/20 border border-amber-400/50 shadow-lg flex items-center justify-between cursor-pointer hover:border-amber-300 transition active:scale-99"
        >
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-slate-900/90 border border-amber-400/50 flex items-center justify-center text-2xl shrink-0">
              <span className="inline-block animate-spin-slow">🎡</span>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h4 className="font-black text-sm text-amber-200">
                  Fox Lucky Wheel • گردونه شانس
                </h4>
                {canSpinWheel && (
                  <span className="px-1.5 py-0.5 rounded bg-emerald-500 text-slate-950 font-black text-[9px] uppercase">
                    FREE
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-300 mt-0.5">
                Spin once every 24h to win up to 100,000 FOX or 3x Turbo!
              </p>
            </div>
          </div>
          <button className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 text-slate-950 font-black text-xs shrink-0 shadow">
            {canSpinWheel ? 'Spin Now' : 'View'}
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="grid grid-cols-4 gap-1 bg-slate-900/90 p-1 rounded-xl border border-slate-800 mb-4 text-[11px] font-bold">
        <button
          onClick={() => setActiveTab('all')}
          className={`py-1.5 rounded-lg transition ${
            activeTab === 'all' ? 'bg-amber-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'
          }`}
        >
          All
        </button>
        <button
          onClick={() => setActiveTab('daily')}
          className={`py-1.5 rounded-lg transition ${
            activeTab === 'daily' ? 'bg-amber-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'
          }`}
        >
          Daily
        </button>
        <button
          onClick={() => setActiveTab('progression')}
          className={`py-1.5 rounded-lg transition ${
            activeTab === 'progression' ? 'bg-amber-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'
          }`}
        >
          Progress
        </button>
        <button
          onClick={() => setActiveTab('social')}
          className={`py-1.5 rounded-lg transition ${
            activeTab === 'social' ? 'bg-amber-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'
          }`}
        >
          Social
        </button>
      </div>

      {/* Task list */}
      <div className="space-y-3">
        {filteredTasks.map((t) => {
          const { isClaimed, isReady, progress } = getTaskStatus(t);
          const percent = Math.min(100, Math.floor((progress / t.target) * 100));
          const isClaiming = claimingId === t.id;

          return (
            <div
              key={t.id}
              className={`p-3.5 rounded-2xl border transition-all ${
                isClaimed
                  ? 'bg-slate-900/40 border-slate-800/50 opacity-60'
                  : isReady
                  ? 'bg-slate-900/90 border-amber-500/60 shadow-md shadow-amber-500/10'
                  : 'bg-slate-900/70 border-slate-800'
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700/60 flex items-center justify-center shrink-0">
                    {t.category === 'daily' ? (
                      <Clock className="w-5 h-5 text-amber-400" />
                    ) : t.category === 'social' ? (
                      <Users className="w-5 h-5 text-sky-400" />
                    ) : (
                      <Trophy className="w-5 h-5 text-orange-400" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-sm text-slate-100 truncate">{t.title}</h4>
                    <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">{t.description}</p>

                    <div className="flex items-center gap-1.5 mt-1.5">
                      <img src={foxGoldCoinImg} alt="FOX" className="w-3.5 h-3.5" />
                      <span className="text-xs font-black text-amber-300">
                        +{t.reward.toLocaleString()} FOX
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right button */}
                <div className="shrink-0">
                  {isClaimed ? (
                    <div className="flex items-center gap-1 text-xs text-slate-500 font-semibold px-2 py-1">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      <span>Done</span>
                    </div>
                  ) : isReady ? (
                    <button
                      onClick={() => handleClaim(t)}
                      disabled={isClaiming}
                      className="px-3.5 py-1.5 bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-300 hover:to-orange-400 text-slate-950 font-black text-xs rounded-xl shadow-md shadow-amber-500/30 transition active:scale-95 animate-pulse cursor-pointer"
                    >
                      {isClaiming ? 'Claiming...' : 'Claim'}
                    </button>
                  ) : t.actionUrl ? (
                    <button
                      onClick={() => handleSocialClick(t)}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-sky-400 font-bold text-xs rounded-xl transition active:scale-95 flex items-center gap-1 cursor-pointer"
                    >
                      <span>Join</span>
                      <ArrowUpRight className="w-3 h-3" />
                    </button>
                  ) : (
                    <div className="text-right">
                      <span className="text-[10px] font-bold text-slate-400">
                        {progress}/{t.target}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Progress bar if progression task */}
              {!isClaimed && !t.actionUrl && (
                <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2.5 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-orange-500 to-amber-400 rounded-full transition-all duration-300"
                    style={{ width: `${percent}%` }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
