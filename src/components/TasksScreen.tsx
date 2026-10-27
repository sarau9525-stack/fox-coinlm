import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  CheckCircle2,
  ChevronRight,
  Clock,
  Crown,
  Calendar,
  Trophy,
  Users,
  LayoutGrid,
  Sparkles,
  Lock,
  ExternalLink,
  X,
  Award,
  Gift,
} from 'lucide-react';
import { TaskDefinition, UpgradeDefinition, UserGameState } from '../types/game.js';
import { sound } from '../utils/audio.js';
import { TelegramService } from '../utils/telegram.js';
import { foxGoldCoinImg } from '../assets/assets.js';
import { NavTab } from './Navigation.js';

const MISSION_ASSETS = {
  foxBanner: '/assets/missions/fox_royal_banner.png',
  dailyChest: '/assets/missions/daily_chest.png',
  chainChest: '/assets/missions/chain_chest.png',
  paw: '/assets/missions/icon_paw.png',
  upgrade: '/assets/missions/icon_upgrade.png',
  invite: '/assets/missions/icon_invite.png',
  wheel: '/assets/missions/icon_wheel.png',
  luckyWheelBadge: '/assets/missions/badge_lucky_wheel.png',
  achievementsBadge: '/assets/missions/badge_achievements.png',
} as const;

interface TasksScreenProps {
  user: UserGameState;
  tasks: TaskDefinition[];
  upgrades?: UpgradeDefinition[];
  onClaimTask: (taskId: string) => Promise<void>;
  onOpenWheel?: () => void;
  onOpenBoost?: () => void;
  onNavigateTab?: (tab: NavTab) => void;
  offlineEarnings?: number;
  onClaimOffline?: () => Promise<void>;
  onCollectBonus?: (amount: number) => void;
}

type MissionTabFilter = 'all' | 'daily' | 'progression' | 'social';
type MissionStatus = 'available' | 'in_progress' | 'completed' | 'claimed' | 'locked';

interface EnrichedMission extends TaskDefinition {
  progress: number;
  isCompleted: boolean;
  isClaimed: boolean;
  isLockedByChain: boolean;
  prerequisiteTitle?: string;
  status: MissionStatus;
  pct: number;
}

export const TasksScreen: React.FC<TasksScreenProps> = ({
  user,
  tasks,
  upgrades = [],
  onClaimTask,
  onOpenWheel,
  onOpenBoost,
  onNavigateTab,
  offlineEarnings = 0,
  onClaimOffline,
  onCollectBonus,
}) => {
  const [activeFilter, setActiveFilter] = useState<MissionTabFilter>('all');
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [showAllInAllTab, setShowAllInAllTab] = useState<boolean>(false);
  const [showAchievementsModal, setShowAchievementsModal] = useState<boolean>(false);
  const [selectedMissionDetail, setSelectedMissionDetail] = useState<EnrichedMission | null>(null);

  // Single-claim in-flight lock to prevent repeated-tap exploits
  const claimingSetRef = useRef<Set<string>>(new Set());
  const [locallyClaimedIds, setLocallyClaimedIds] = useState<Record<string, boolean>>({});

  // Track opened social links in state + localStorage
  const [visitedSocialIds, setVisitedSocialIds] = useState<Record<string, boolean>>(() => {
    if (typeof window === 'undefined') return {};
    try {
      const raw = localStorage.getItem(`fox_visited_social_${user.id}`);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  });

  // Daily reset countdown timer (ticks every second to UTC midnight)
  const [resetCountdown, setResetCountdown] = useState<string>('14:32:18');
  const [todayKey, setTodayKey] = useState<string>(() => new Date().toISOString().split('T')[0]);

  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date();
      const currentDayStr = now.toISOString().split('T')[0];
      if (currentDayStr !== todayKey) {
        setTodayKey(currentDayStr);
      }
      const nextMidnight = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0)
      );
      const diffSec = Math.max(0, Math.floor((nextMidnight.getTime() - now.getTime()) / 1000));
      const hrs = String(Math.floor(diffSec / 3600)).padStart(2, '0');
      const mins = String(Math.floor((diffSec % 3600) / 60)).padStart(2, '0');
      const secs = String(diffSec % 60).padStart(2, '0');
      setResetCountdown(`${hrs}:${mins}:${secs}`);
    };
    updateCountdown();
    const timer = setInterval(updateCountdown, 1000);
    return () => clearInterval(timer);
  }, [todayKey]);

  const showToast = useCallback((msg: string) => {
    setToastMsg(msg);
    setTimeout(() => {
      setToastMsg((prev) => (prev === msg ? null : prev));
    }, 2800);
  }, []);

  // Empire Overview stats (top 3-column bar matching reference image)
  const enterpriseUpgrades = useMemo(
    () => upgrades.filter((u) => u.category === 'passive'),
    [upgrades]
  );
  const totalBusinessesCount = Math.max(18, enterpriseUpgrades.length || 18);
  const ownedBusinessesCount = useMemo(() => {
    if (enterpriseUpgrades.length === 0) {
      return Object.values(user.upgrades || {}).filter((lvl) => (lvl || 0) > 0).length;
    }
    return enterpriseUpgrades.filter((u) => (user.upgrades?.[u.id] || 0) > 0).length;
  }, [enterpriseUpgrades, user.upgrades]);

  const totalUpgradesPurchased = useMemo(
    () => Object.values(user.upgrades || {}).reduce((sum, lvl) => sum + (Number(lvl) || 0), 0),
    [user.upgrades]
  );

  const rawBankableOffline = Math.max(
    Math.floor(offlineEarnings || 0),
    Math.floor(user.unclaimedPassive || 0)
  );
  const [isCollectingOffline, setIsCollectingOffline] = useState(false);
  const [hasCollectedOffline, setHasCollectedOffline] = useState(false);
  const collectingOfflineRef = useRef(false);

  useEffect(() => {
    if (rawBankableOffline > 0 && !collectingOfflineRef.current) {
      setHasCollectedOffline(false);
    }
  }, [rawBankableOffline]);

  const bankableOffline = hasCollectedOffline ? 0 : rawBankableOffline;

  const handleCollectOfflineClick = async () => {
    if (
      isCollectingOffline ||
      collectingOfflineRef.current ||
      bankableOffline <= 0 ||
      !onClaimOffline
    ) {
      return;
    }
    const amountToClaim = bankableOffline;
    collectingOfflineRef.current = true;
    setIsCollectingOffline(true);
    setHasCollectedOffline(true);
    try {
      await onClaimOffline();
      sound.playSuccess();
      TelegramService.triggerNotificationHaptic('success');
      showToast(`Collected +${amountToClaim.toLocaleString('en-US')} FOX!`);
    } catch (err: any) {
      setHasCollectedOffline(false);
      sound.playError();
      setErrorMsg(err?.message || 'Could not collect offline earnings');
    } finally {
      collectingOfflineRef.current = false;
      setIsCollectingOffline(false);
    }
  };

  // Calculate real-time progress for every mission from actual user game state
  const hasSpunWheel = Boolean(
    user.boosters?.lastWheelSpinTimestamp && user.boosters.lastWheelSpinTimestamp > 0
  );
  const hasUsedBoost =
    (user.boosters?.fullEnergyRemaining ?? 6) < 6 ||
    Boolean(user.boosters?.nextTurboAt && user.boosters.nextTurboAt > 0);

  const computeRawProgress = useCallback(
    (task: TaskDefinition): number => {
      switch (task.id) {
        case 'tap_100':
          return Math.min(100, user.totalTaps || 0);
        case 'daily_tap_300':
          return Math.min(300, user.totalTaps || 0);
        case 'tap_500':
          return Math.min(500, user.totalTaps || 0);
        case 'tap_2500':
          return Math.min(2500, user.totalTaps || 0);
        case 'tap_10000':
          return Math.min(10000, user.totalTaps || 0);
        case 'first_upgrade':
          return Math.min(1, totalUpgradesPurchased);
        case 'upgrade_5':
          return Math.min(5, totalUpgradesPurchased);
        case 'upgrade_15':
          return Math.min(15, totalUpgradesPurchased);
        case 'spin_wheel_1':
          return hasSpunWheel ? 1 : 0;
        case 'daily_boost_1':
          return hasUsedBoost ? 1 : 0;
        case 'reach_silver':
          return Math.min(2, user.level || 1);
        case 'reach_gold':
          return Math.min(3, user.level || 1);
        case 'reach_diamond':
          return Math.min(5, user.level || 1);
        case 'profit_1k':
          return Math.min(1000, user.profitPerHour || 0);
        case 'profit_10k':
          return Math.min(10000, user.profitPerHour || 0);
        case 'invite_1':
          return Math.min(1, user.referralCount || 0);
        case 'invite_3':
          return Math.min(3, user.referralCount || 0);
        case 'invite_10':
          return Math.min(10, user.referralCount || 0);
        case 'telegram_channel':
        case 'youtube_channel':
          return visitedSocialIds[task.id] ||
            user.hasJoinedChannel ||
            user.tasks?.[task.id]?.completed ||
            user.tasks?.[task.id]?.claimed
            ? 1
            : 0;
        default:
          return Math.min(task.target, user.tasks?.[task.id]?.progress || 0);
      }
    },
    [
      user.totalTaps,
      totalUpgradesPurchased,
      hasSpunWheel,
      hasUsedBoost,
      user.level,
      user.profitPerHour,
      user.referralCount,
      user.hasJoinedChannel,
      user.tasks,
      visitedSocialIds,
    ]
  );

  // Filter out the internal chest bonus definitions from regular card lists
  const visibleTaskDefinitions = useMemo(
    () => tasks.filter((t) => t.id !== 'daily_chest_bonus' && t.id !== 'mission_chain_bonus'),
    [tasks]
  );

  const enrichedMissions: EnrichedMission[] = useMemo(() => {
    const taskLookup = new Map<string, TaskDefinition>(
      visibleTaskDefinitions.map((t) => [t.id, t])
    );

    // First pass: check completion/claim status of each task
    const completionMap = new Map<string, { progress: number; isCompleted: boolean; isClaimed: boolean }>();
    for (const t of visibleTaskDefinitions) {
      const progress = computeRawProgress(t);
      const isClaimed = Boolean(user.tasks?.[t.id]?.claimed || locallyClaimedIds[t.id]);
      const isCompleted = isClaimed || progress >= t.target;
      completionMap.set(t.id, { progress, isCompleted, isClaimed });
    }

    return visibleTaskDefinitions.map((task) => {
      const state = completionMap.get(task.id)!;
      let isLockedByChain = false;
      let prerequisiteTitle: string | undefined;

      if (task.prerequisiteTaskId) {
        const prereqState = completionMap.get(task.prerequisiteTaskId);
        const prereqDef = taskLookup.get(task.prerequisiteTaskId);
        if (prereqDef) {
          prerequisiteTitle = prereqDef.title;
        }
        // Unlocks once prerequisite is completed or claimed
        if (prereqState && !prereqState.isCompleted && !prereqState.isClaimed) {
          isLockedByChain = true;
        }
      }

      let status: MissionStatus = 'available';
      if (state.isClaimed) {
        status = 'claimed';
      } else if (isLockedByChain) {
        status = 'locked';
      } else if (state.isCompleted) {
        status = 'completed';
      } else if (state.progress > 0) {
        status = 'in_progress';
      } else {
        status = 'available';
      }

      const pct = Math.min(100, Math.max(0, Math.round((state.progress / Math.max(1, task.target)) * 100)));

      return {
        ...task,
        progress: state.progress,
        isCompleted: state.isCompleted,
        isClaimed: state.isClaimed,
        isLockedByChain,
        prerequisiteTitle,
        status,
        pct,
      };
    });
  }, [visibleTaskDefinitions, computeRawProgress, user.tasks, locallyClaimedIds]);

  // Daily Mission Summary calculations (5-step daily track)
  const dailyMissions = useMemo(
    () => enrichedMissions.filter((m) => m.category === 'daily'),
    [enrichedMissions]
  );
  const totalDailyCount = Math.max(5, dailyMissions.length);
  const completedDailyCount = useMemo(
    () => dailyMissions.filter((m) => m.isCompleted || m.isClaimed).length,
    [dailyMissions]
  );

  // Daily Chest claim state (persisted in user.tasks['daily_chest_bonus'] and daily localStorage key)
  const dailyChestStorageKey = `fox_daily_chest_${user.id}_${todayKey}`;
  const isDailyChestClaimed = Boolean(
    user.tasks?.['daily_chest_bonus']?.claimed ||
      locallyClaimedIds['daily_chest_bonus'] ||
      (typeof window !== 'undefined' && localStorage.getItem(dailyChestStorageKey) === 'true')
  );
  const canClaimDailyChest = completedDailyCount >= 3 && !isDailyChestClaimed;

  // 4-Step Mission Chain calculations (Warm-up Paws -> Upgrade Your Business -> Invite a Friend -> Spin the Lucky Wheel)
  const chainMissions = useMemo(() => {
    const orderedIds = ['tap_100', 'first_upgrade', 'invite_1', 'spin_wheel_1'];
    return orderedIds
      .map((id) => enrichedMissions.find((m) => m.id === id))
      .filter((m): m is EnrichedMission => Boolean(m));
  }, [enrichedMissions]);

  const completedChainSteps = useMemo(
    () => chainMissions.filter((m) => m.isCompleted || m.isClaimed).length,
    [chainMissions]
  );
  const isMissionChainClaimed = Boolean(
    user.tasks?.['mission_chain_bonus']?.claimed || locallyClaimedIds['mission_chain_bonus']
  );
  const canClaimMissionChain = completedChainSteps >= 4 && !isMissionChainClaimed;

  // Permanent Achievements list for the Achievements drawer/modal
  const achievementMissions = useMemo(
    () => enrichedMissions.filter((m) => m.isAchievement || m.category === 'progression'),
    [enrichedMissions]
  );
  const claimableAchievementsCount = useMemo(
    () => achievementMissions.filter((m) => m.status === 'completed').length,
    [achievementMissions]
  );

  // Filtered missions for the active tab
  const displayedMissions = useMemo(() => {
    if (activeFilter === 'all') {
      const coreIds = ['tap_100', 'first_upgrade', 'invite_1', 'spin_wheel_1'];
      const coreList = coreIds
        .map((id) => enrichedMissions.find((m) => m.id === id))
        .filter((m): m is EnrichedMission => Boolean(m));
      if (!showAllInAllTab) {
        return coreList;
      }
      const rest = enrichedMissions.filter((m) => !coreIds.includes(m.id));
      return [...coreList, ...rest];
    }
    if (activeFilter === 'daily') {
      return enrichedMissions.filter((m) => m.category === 'daily');
    }
    if (activeFilter === 'progression') {
      return enrichedMissions.filter((m) => m.category === 'progression');
    }
    return enrichedMissions.filter((m) => m.category === 'social');
  }, [activeFilter, enrichedMissions, showAllInAllTab]);

  // Claim a mission with single-claim validation & duplicate-tap lock
  const handleClaimMission = async (mission: EnrichedMission) => {
    if (
      mission.isClaimed ||
      !mission.isCompleted ||
      mission.isLockedByChain ||
      claimingSetRef.current.has(mission.id)
    ) {
      return;
    }

    claimingSetRef.current.add(mission.id);
    setClaimingId(mission.id);
    setErrorMsg(null);

    try {
      await onClaimTask(mission.id);
      setLocallyClaimedIds((prev) => ({ ...prev, [mission.id]: true }));
      sound.playSuccess();
      TelegramService.triggerNotificationHaptic('success');
      showToast(`Claimed +${mission.reward.toLocaleString('en-US')} FOX!`);
    } catch (err: any) {
      sound.playError();
      setErrorMsg(err?.message || 'Could not claim mission reward');
    } finally {
      claimingSetRef.current.delete(mission.id);
      setClaimingId(null);
    }
  };

  // Navigate or trigger mission action when user clicks "Go"
  const handleGoMission = (mission: EnrichedMission) => {
    if (mission.isLockedByChain) {
      showToast(`Complete "${mission.prerequisiteTitle || 'previous mission'}" first to unlock!`);
      return;
    }

    sound.playTap();
    TelegramService.triggerHaptic('light');

    if (mission.actionUrl) {
      // Mark social link visited and open link
      const nextVisited = { ...visitedSocialIds, [mission.id]: true };
      setVisitedSocialIds(nextVisited);
      if (typeof window !== 'undefined') {
        localStorage.setItem(`fox_visited_social_${user.id}`, JSON.stringify(nextVisited));
      }
      TelegramService.openLink(mission.actionUrl);
      showToast(`Opened ${mission.title}! Tap Claim to collect your reward.`);
      return;
    }

    if (mission.id === 'spin_wheel_1') {
      if (onOpenWheel) onOpenWheel();
      return;
    }

    if (mission.id === 'daily_boost_1') {
      if (onOpenBoost) onOpenBoost();
      else if (onNavigateTab) onNavigateTab('home');
      return;
    }

    if (
      mission.id.startsWith('first_upgrade') ||
      mission.id.startsWith('upgrade_') ||
      mission.id.startsWith('profit_')
    ) {
      if (onNavigateTab) onNavigateTab('upgrades');
      return;
    }

    if (mission.id.startsWith('invite_')) {
      if (onNavigateTab) onNavigateTab('friends');
      return;
    }

    // Default: navigate to Tap screen
    if (onNavigateTab) {
      onNavigateTab('home');
    }
  };

  // Claim Daily Mission Summary Chest (+5,000 FOX)
  const handleClaimDailyChest = async () => {
    if (isDailyChestClaimed || claimingSetRef.current.has('daily_chest_bonus')) return;
    if (!canClaimDailyChest) {
      showToast(`Complete at least 3 Daily Missions (${completedDailyCount}/3) to unlock the Daily Chest!`);
      return;
    }

    claimingSetRef.current.add('daily_chest_bonus');
    setClaimingId('daily_chest_bonus');
    setErrorMsg(null);

    try {
      await onClaimTask('daily_chest_bonus');
      setLocallyClaimedIds((prev) => ({ ...prev, daily_chest_bonus: true }));
      if (typeof window !== 'undefined') {
        localStorage.setItem(dailyChestStorageKey, 'true');
      }
      sound.playSuccess();
      TelegramService.triggerNotificationHaptic('success');
      showToast('Daily Mission Chest Claimed: +5,000 FOX!');
    } catch (err: any) {
      sound.playError();
      setErrorMsg(err?.message || 'Complete 3 daily missions first');
    } finally {
      claimingSetRef.current.delete('daily_chest_bonus');
      setClaimingId(null);
    }
  };

  // Claim 4-Step Mission Chain Chest (+10,000 FOX)
  const handleClaimMissionChain = async () => {
    if (isMissionChainClaimed || claimingSetRef.current.has('mission_chain_bonus')) return;
    if (!canClaimMissionChain) {
      showToast(`Complete all 4 chain missions (${completedChainSteps}/4) to unlock +10,000 FOX!`);
      return;
    }

    claimingSetRef.current.add('mission_chain_bonus');
    setClaimingId('mission_chain_bonus');
    setErrorMsg(null);

    try {
      await onClaimTask('mission_chain_bonus');
      setLocallyClaimedIds((prev) => ({ ...prev, mission_chain_bonus: true }));
      sound.playSuccess();
      TelegramService.triggerNotificationHaptic('success');
      showToast('Mission Chain Completed! +10,000 FOX Claimed!');
    } catch (err: any) {
      sound.playError();
      setErrorMsg(err?.message || 'Complete all 4 chain missions first');
    } finally {
      claimingSetRef.current.delete('mission_chain_bonus');
      setClaimingId(null);
    }
  };

  // Resolve a single dedicated standalone icon image for each mission
  const getMissionIconSrc = (mission: EnrichedMission): string => {
    if (mission.id === 'spin_wheel_1') {
      return MISSION_ASSETS.wheel;
    }
    if (
      mission.id === 'first_upgrade' ||
      mission.id.startsWith('upgrade_') ||
      mission.id.startsWith('profit_') ||
      mission.id === 'daily_boost_1'
    ) {
      return MISSION_ASSETS.upgrade;
    }
    if (
      mission.id.startsWith('invite_') ||
      mission.category === 'social' ||
      mission.id === 'telegram_channel' ||
      mission.id === 'youtube_channel'
    ) {
      return MISSION_ASSETS.invite;
    }
    if (mission.id.startsWith('reach_')) {
      return MISSION_ASSETS.achievementsBadge;
    }
    return MISSION_ASSETS.paw;
  };

  // Dedicated 1:1 image container for each mission icon (no background sprites, no duplicate layers)
  const renderMissionIcon = (mission: EnrichedMission) => {
    const iconSrc = getMissionIconSrc(mission);
    return (
      <div className="w-11 h-11 sm:w-12 sm:h-12 aspect-square shrink-0 rounded-xl overflow-hidden border border-amber-500/45 bg-[#0B0E17] shadow-[0_0_10px_rgba(245,158,11,0.2)] flex items-center justify-center p-0.5">
        <img
          src={iconSrc}
          alt={mission.title}
          loading="lazy"
          className={`w-full h-full object-contain block ${
            mission.isLockedByChain ? 'opacity-50 grayscale' : ''
          }`}
        />
      </div>
    );
  };

  return (
    <div className="w-full max-w-md mx-auto pb-32 pt-1 px-2.5 sm:px-3 flex flex-col gap-2 text-white select-none overflow-x-hidden">
      {/* Floating Feedback Toast */}
      {toastMsg && (
        <div className="fixed top-14 left-1/2 -translate-x-1/2 z-50 max-w-[90vw] px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 via-yellow-400 to-orange-500 text-slate-950 font-black text-xs shadow-[0_0_25px_rgba(245,158,11,0.7)] border border-yellow-100 flex items-center gap-1.5 animate-bounce">
          <Sparkles className="w-4 h-4 fill-slate-950 shrink-0" />
          <span className="truncate">{toastMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-2.5 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-300 text-xs font-bold text-center">
          {errorMsg}
        </div>
      )}

      {/* 1. EMPIRE OVERVIEW BAR (3 Responsive Gold-Framed Panels) */}
      <div className="w-full bg-gradient-to-b from-[#171A26]/95 to-[#0D1018]/95 border border-amber-500/40 rounded-2xl p-1.5 flex items-stretch gap-1.5 shadow-[0_6px_20px_rgba(0,0,0,0.65)] min-w-0">
        {/* Col 1: Total Businesses */}
        <div className="bg-gradient-to-b from-[#1B1F2E]/90 to-[#10131D]/90 border border-amber-500/25 rounded-xl px-2 py-1 flex flex-col justify-center shrink-0">
          <span className="text-[8px] sm:text-[9px] font-bold text-slate-300 whitespace-nowrap leading-tight">
            Businesses
          </span>
          <div className="flex items-center gap-0.5 mt-0.5">
            <span className="text-xs sm:text-sm font-black text-white tabular-nums whitespace-nowrap">
              {ownedBusinessesCount}
              <span className="text-slate-400 font-bold text-[10px] sm:text-[11px]">
                /{totalBusinessesCount}
              </span>
            </span>
          </div>
        </div>

        {/* Col 2: Total Upgrades */}
        <div className="bg-gradient-to-b from-[#1B1F2E]/90 to-[#10131D]/90 border border-amber-500/25 rounded-xl px-2 py-1 flex flex-col justify-center shrink-0">
          <span className="text-[8px] sm:text-[9px] font-bold text-slate-300 whitespace-nowrap leading-tight">
            Upgrades
          </span>
          <div className="flex items-center gap-0.5 mt-0.5">
            <span className="text-xs sm:text-sm font-black text-amber-300 tabular-nums whitespace-nowrap">
              {totalUpgradesPurchased}
            </span>
          </div>
        </div>

        {/* Col 3: Offline Earnings + Collect Button */}
        <div className="flex-1 min-w-0 bg-gradient-to-b from-[#1F1A12]/90 to-[#12131C]/90 border border-amber-500/35 rounded-xl px-2 py-1 flex items-center justify-between gap-1.5">
          <div className="min-w-0 flex-1">
            <div className="text-[8px] sm:text-[9px] font-bold text-slate-300 truncate leading-tight">
              Offline Earnings
            </div>
            <div className="flex items-center gap-1 mt-0.5 min-w-0">
              <img
                src={foxGoldCoinImg}
                alt="FOX"
                className="w-3.5 h-3.5 rounded-full object-cover shrink-0"
              />
              <span className="text-[11px] sm:text-xs font-black text-amber-300 tabular-nums whitespace-nowrap">
                +{bankableOffline.toLocaleString('en-US')}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleCollectOfflineClick}
            disabled={isCollectingOffline || bankableOffline <= 0}
            className={`px-2.5 py-1.5 rounded-lg font-black text-[10px] sm:text-[11px] tracking-wide border transition shrink-0 whitespace-nowrap ${
              bankableOffline > 0 && !isCollectingOffline
                ? 'bg-gradient-to-b from-amber-300 via-amber-500 to-orange-600 hover:brightness-110 active:scale-95 text-slate-950 shadow-[0_0_12px_rgba(245,158,11,0.45)] border-yellow-200/70 cursor-pointer'
                : 'bg-slate-800/80 text-slate-500 border-slate-700/60 cursor-not-allowed opacity-75'
            }`}
          >
            {isCollectingOffline ? '...' : bankableOffline > 0 ? 'Collect' : 'Collected'}
          </button>
        </div>
      </div>

      {/* 2. DAILY MISSION SUMMARY HERO BANNER (Separate Non-Overlapping Layout Regions) */}
      <div className="w-full rounded-2xl border-2 border-amber-500/60 bg-gradient-to-r from-[#1A140C] via-[#131724] to-[#1D150C] p-2.5 shadow-[0_10px_28px_rgba(0,0,0,0.75),0_0_18px_rgba(245,158,11,0.2)]">
        <div className="flex flex-col min-[360px]:flex-row items-stretch gap-2 min-w-0">
          {/* Region A: Dedicated Fox Illustration Container */}
          <div className="flex items-center justify-center shrink-0">
            <div className="w-16 h-22 sm:w-20 sm:h-24 rounded-xl border border-amber-500/45 shadow-[0_0_14px_rgba(245,158,11,0.25)] overflow-hidden bg-[#120E0A] shrink-0">
              <img
                src={MISSION_ASSETS.foxBanner}
                alt="Royal Fox Commander"
                className="w-full h-full object-cover block"
              />
            </div>
          </div>

          {/* Region B: Title, Subtitle, Countdown & 5-Step Progress Track */}
          <div className="flex-1 min-w-0 flex flex-col justify-between gap-1.5">
            {/* Title & Subtitle */}
            <div className="min-w-0">
              <h1 className="text-sm sm:text-base font-black tracking-wide bg-gradient-to-b from-amber-100 via-amber-300 to-amber-500 bg-clip-text text-transparent leading-tight">
                Daily Mission
              </h1>
              <p className="text-[10px] sm:text-[11px] font-semibold text-slate-200/90 leading-snug mt-0.5">
                Complete missions, earn rewards
              </p>
            </div>

            {/* Countdown Region */}
            <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-[#0D101A]/95 border border-amber-500/30 w-fit">
              <Clock className="w-3 h-3 text-amber-400 shrink-0" />
              <span className="text-[9px] sm:text-[10px] font-bold text-slate-300 tabular-nums whitespace-nowrap">
                Resets in <strong className="text-amber-300 font-black">{resetCountdown}</strong>
              </span>
            </div>

            {/* 5-Step Progress Track & Completed Counter Region */}
            <div className="bg-[#0B0E17]/95 border border-amber-500/35 rounded-xl px-2 py-1.5 flex flex-col gap-1 min-w-0">
              <div className="flex items-center w-full min-w-0">
                {[1, 2, 3, 4, 5].map((stepIdx) => {
                  const reached = completedDailyCount >= stepIdx;
                  return (
                    <React.Fragment key={stepIdx}>
                      <div
                        className={`w-3.5 h-3.5 rounded-full flex items-center justify-center border transition-all shrink-0 ${
                          reached
                            ? 'bg-gradient-to-b from-amber-300 to-orange-500 border-yellow-100 shadow-[0_0_8px_rgba(245,158,11,0.8)]'
                            : 'bg-[#171B29] border-amber-500/40'
                        }`}
                      >
                        {reached && <div className="w-1.5 h-1.5 rounded-full bg-slate-950" />}
                      </div>
                      {stepIdx < 5 && (
                        <div className="flex-1 h-1 bg-[#171B29] overflow-hidden mx-0.5 rounded-full min-w-[6px]">
                          <div
                            className={`h-full transition-all duration-300 ${
                              completedDailyCount >= stepIdx
                                ? 'w-full bg-gradient-to-r from-amber-400 to-orange-500'
                                : 'w-0'
                            }`}
                          />
                        </div>
                      )}
                    </React.Fragment>
                  );
                })}
                <Gift className="w-3.5 h-3.5 text-amber-400 ml-1 shrink-0" />
              </div>

              <div className="flex items-center justify-between text-[9px] sm:text-[10px] font-black text-amber-200 tabular-nums">
                <span>
                  {Math.min(5, completedDailyCount)}/{Math.min(5, totalDailyCount)} completed
                </span>
                <span className="text-amber-400/90">+5,000 FOX</span>
              </div>
            </div>
          </div>

          {/* Region C: Dedicated Reward Chest Container + Separate Claim Button Below */}
          <div className="w-full min-[360px]:w-24 sm:w-28 shrink-0 flex flex-row min-[360px]:flex-col items-center justify-between gap-1.5 bg-[#120F0A]/80 border border-amber-500/30 rounded-xl p-1.5">
            {/* Chest Image Region (Strictly separated from button) */}
            <div className="w-14 h-11 min-[360px]:w-full min-[360px]:h-13 rounded-lg overflow-hidden bg-[#16110B] border border-amber-500/35 flex items-center justify-center shrink-0">
              <img
                src={MISSION_ASSETS.dailyChest}
                alt="Daily Mission Reward Chest"
                className="w-full h-full object-cover block"
              />
            </div>

            {/* Claim Reward Button Region (Never overlapped by chest image) */}
            <button
              type="button"
              onClick={handleClaimDailyChest}
              disabled={isDailyChestClaimed || claimingId === 'daily_chest_bonus'}
              className={`w-full py-1.5 px-2 rounded-lg font-black text-[10px] sm:text-[11px] leading-tight text-center transition border cursor-pointer whitespace-nowrap ${
                isDailyChestClaimed
                  ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300 cursor-default'
                  : canClaimDailyChest
                  ? 'bg-gradient-to-b from-amber-300 via-amber-500 to-orange-600 text-slate-950 border-yellow-200/80 shadow-[0_0_12px_rgba(245,158,11,0.6)] animate-pulse active:scale-95'
                  : 'bg-gradient-to-b from-amber-300 via-amber-500 to-orange-600 text-slate-950 border-amber-300/70 shadow-[0_0_10px_rgba(245,158,11,0.3)] hover:brightness-110 active:scale-95'
              }`}
            >
              {isDailyChestClaimed
                ? 'Claimed ✓'
                : claimingId === 'daily_chest_bonus'
                ? 'Claiming...'
                : 'Claim Reward'}
            </button>
          </div>
        </div>
      </div>

      {/* 3. FOUR CATEGORY FILTER TABS (All | Daily | Progress | Social) */}
      <div className="w-full bg-gradient-to-b from-[#161926] to-[#0D0F18] p-1 rounded-xl border border-amber-500/40 grid grid-cols-4 gap-1 shadow-[0_6px_18px_rgba(0,0,0,0.6)]">
        <button
          type="button"
          onClick={() => {
            sound.playTap();
            setActiveFilter('all');
          }}
          className={`py-2 px-1 rounded-lg font-black text-[11px] sm:text-xs flex items-center justify-center gap-1 transition-all cursor-pointer min-w-0 ${
            activeFilter === 'all'
              ? 'bg-gradient-to-b from-[#443014] via-[#2B1E0D] to-[#1C1409] text-amber-200 border border-amber-400 shadow-[0_0_14px_rgba(245,158,11,0.45)]'
              : 'text-slate-300 hover:text-amber-200 border border-transparent'
          }`}
        >
          <LayoutGrid className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span className="truncate">All</span>
        </button>

        <button
          type="button"
          onClick={() => {
            sound.playTap();
            setActiveFilter('daily');
          }}
          className={`py-2 px-1 rounded-lg font-black text-[11px] sm:text-xs flex items-center justify-center gap-1 transition-all cursor-pointer min-w-0 ${
            activeFilter === 'daily'
              ? 'bg-gradient-to-b from-[#443014] via-[#2B1E0D] to-[#1C1409] text-amber-200 border border-amber-400 shadow-[0_0_14px_rgba(245,158,11,0.45)]'
              : 'text-slate-300 hover:text-amber-200 border border-transparent'
          }`}
        >
          <Calendar className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span className="truncate">Daily</span>
        </button>

        <button
          type="button"
          onClick={() => {
            sound.playTap();
            setActiveFilter('progression');
          }}
          className={`py-2 px-1 rounded-lg font-black text-[11px] sm:text-xs flex items-center justify-center gap-1 transition-all cursor-pointer min-w-0 ${
            activeFilter === 'progression'
              ? 'bg-gradient-to-b from-[#443014] via-[#2B1E0D] to-[#1C1409] text-amber-200 border border-amber-400 shadow-[0_0_14px_rgba(245,158,11,0.45)]'
              : 'text-slate-300 hover:text-amber-200 border border-transparent'
          }`}
        >
          <Trophy className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span className="truncate">Progress</span>
        </button>

        <button
          type="button"
          onClick={() => {
            sound.playTap();
            setActiveFilter('social');
          }}
          className={`py-2 px-1 rounded-lg font-black text-[11px] sm:text-xs flex items-center justify-center gap-1 transition-all cursor-pointer min-w-0 ${
            activeFilter === 'social'
              ? 'bg-gradient-to-b from-[#443014] via-[#2B1E0D] to-[#1C1409] text-amber-200 border border-amber-400 shadow-[0_0_14px_rgba(245,158,11,0.45)]'
              : 'text-slate-300 hover:text-amber-200 border border-transparent'
          }`}
        >
          <Users className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span className="truncate">Social</span>
        </button>
      </div>

      {/* 4. MISSION CARDS LIST (Dedicated 1:1 Icon Container + Full Title/Progress + Reward & Action) */}
      <div className="flex flex-col gap-2">
        {displayedMissions.map((mission) => {
          const isClaimingThis = claimingId === mission.id;

          return (
            <div
              key={mission.id}
              className={`w-full rounded-2xl bg-gradient-to-r from-[#171A28]/95 via-[#121521]/95 to-[#191510]/95 border transition-all p-2.5 shadow-[0_6px_18px_rgba(0,0,0,0.6)] flex items-center justify-between gap-2.5 min-w-0 ${
                mission.isClaimed
                  ? 'border-emerald-500/35 opacity-85'
                  : mission.isCompleted && !mission.isLockedByChain
                  ? 'border-amber-400/80 shadow-[0_0_16px_rgba(245,158,11,0.25)]'
                  : 'border-amber-500/35 hover:border-amber-400/60'
              }`}
            >
              {/* Left: Dedicated 1:1 Mission Icon Container */}
              {renderMissionIcon(mission)}

              {/* Center: Title, Description, Progress Bar + Numeric Counter */}
              <div
                onClick={() => setSelectedMissionDetail(mission)}
                className="flex-1 min-w-0 cursor-pointer"
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  <h4 className="font-black text-xs sm:text-[13px] text-white leading-snug truncate">
                    {mission.title}
                  </h4>
                  {mission.status === 'completed' && (
                    <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-[8px] font-black uppercase shrink-0">
                      Ready
                    </span>
                  )}
                  {mission.status === 'locked' && (
                    <span className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-600 text-slate-300 text-[8px] font-bold shrink-0">
                      Locked
                    </span>
                  )}
                </div>

                <p className="text-[10px] sm:text-[11px] text-slate-300/90 font-medium truncate mt-0.5">
                  {mission.isLockedByChain && mission.prerequisiteTitle
                    ? `Unlock: Complete "${mission.prerequisiteTitle}"`
                    : mission.description}
                </p>

                {/* Progress Bar + Fraction Counter (e.g. 65/100, 0/1) */}
                <div className="mt-1.5 flex items-center gap-2 min-w-0">
                  <div className="flex-1 h-2 bg-[#090B11] rounded-full overflow-hidden border border-amber-500/30 p-[1px] min-w-[48px]">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        mission.isClaimed
                          ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                          : 'bg-gradient-to-r from-amber-500 via-orange-400 to-yellow-300 shadow-[0_0_8px_rgba(245,158,11,0.7)]'
                      }`}
                      style={{ width: `${mission.pct}%` }}
                    />
                  </div>
                  <span className="text-[10px] sm:text-[11px] font-black text-slate-200 tabular-nums shrink-0 whitespace-nowrap">
                    {mission.progress.toLocaleString('en-US')}/{mission.target.toLocaleString('en-US')}
                  </span>
                </div>
              </div>

              {/* Right: Reward Badge + Action Button (Stacks cleanly on narrow 360px/390px viewports so center text never clips) */}
              <div className="flex flex-col min-[420px]:flex-row items-end min-[420px]:items-center gap-1.5 shrink-0">
                {/* Reward Box */}
                <div className="px-2 py-1 rounded-lg bg-[#10131E] border border-amber-500/35 flex items-center gap-1 shadow-inner">
                  <img
                    src={foxGoldCoinImg}
                    alt="FOX"
                    className="w-3.5 h-3.5 rounded-full object-cover shrink-0"
                  />
                  <span className="text-[10px] sm:text-[11px] font-black text-amber-300 tabular-nums whitespace-nowrap">
                    +{mission.reward.toLocaleString('en-US')}{' '}
                    <span className="text-[9px] text-amber-200/80">FOX</span>
                  </span>
                </div>

                {/* Action Button + Details Trigger */}
                <div className="flex items-center gap-1">
                  {mission.isClaimed ? (
                    <div className="px-2.5 py-1 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-black text-[10px] sm:text-xs flex items-center gap-1 whitespace-nowrap">
                      <CheckCircle2 className="w-3 h-3 shrink-0" />
                      <span>Claimed</span>
                    </div>
                  ) : mission.isLockedByChain ? (
                    <button
                      type="button"
                      onClick={() => handleGoMission(mission)}
                      className="px-2.5 py-1 rounded-lg bg-slate-800/90 border border-slate-600/60 text-slate-400 font-black text-[10px] sm:text-xs flex items-center gap-1 cursor-pointer whitespace-nowrap"
                    >
                      <Lock className="w-3 h-3 shrink-0" />
                      <span>Locked</span>
                    </button>
                  ) : mission.isCompleted ? (
                    <button
                      type="button"
                      onClick={() => handleClaimMission(mission)}
                      disabled={isClaimingThis}
                      className="px-3 py-1 rounded-lg bg-gradient-to-b from-amber-300 via-amber-500 to-orange-600 hover:brightness-110 active:scale-95 text-slate-950 font-black text-[11px] sm:text-xs shadow-[0_0_14px_rgba(245,158,11,0.55)] border border-yellow-200/80 transition cursor-pointer whitespace-nowrap"
                    >
                      {isClaimingThis ? '...' : 'Claim'}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleGoMission(mission)}
                      className="px-3.5 py-1 rounded-lg bg-gradient-to-b from-amber-300 via-amber-500 to-orange-600 hover:brightness-110 active:scale-95 text-slate-950 font-black text-[11px] sm:text-xs shadow-[0_0_12px_rgba(245,158,11,0.4)] border border-yellow-200/70 transition cursor-pointer flex items-center gap-0.5 whitespace-nowrap"
                    >
                      <span>Go</span>
                      {mission.actionUrl && <ExternalLink className="w-2.5 h-2.5 ml-0.5 shrink-0" />}
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => setSelectedMissionDetail(mission)}
                    className="text-amber-400/70 hover:text-amber-300 p-0.5 cursor-pointer shrink-0"
                    title="Mission Details"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}

        {/* Expand/Collapse toggle on "All" tab */}
        {activeFilter === 'all' && enrichedMissions.length > 4 && (
          <button
            type="button"
            onClick={() => {
              sound.playTap();
              setShowAllInAllTab((prev) => !prev);
            }}
            className="w-full py-1.5 px-3 rounded-xl bg-[#131724]/90 hover:bg-[#191F30] border border-amber-500/30 text-amber-300 text-[11px] font-extrabold flex items-center justify-center gap-1.5 transition cursor-pointer"
          >
            <span className="truncate">
              {showAllInAllTab
                ? 'Show Featured Missions (4)'
                : `View All ${enrichedMissions.length} Missions (Daily, Progress & Social)`}
            </span>
            <ChevronRight
              className={`w-3.5 h-3.5 shrink-0 transition-transform ${
                showAllInAllTab ? '-rotate-90' : 'rotate-90'
              }`}
            />
          </button>
        )}
      </div>

      {/* 5. MISSION CHAIN PANEL (1 -> 2 -> 3 -> 4 + Dedicated Chest Image + +10,000 FOX + Claim) */}
      <div className="w-full rounded-2xl bg-gradient-to-r from-[#171A28]/95 via-[#131622]/95 to-[#1D160E]/95 border-2 border-amber-500/50 p-2.5 shadow-[0_8px_24px_rgba(0,0,0,0.7),0_0_16px_rgba(245,158,11,0.15)]">
        <div className="flex items-center justify-between gap-2 min-w-0">
          {/* Left Side: Title, 1 -> 2 -> 3 -> 4 Step Badges, Subtitle */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs sm:text-sm font-black text-amber-200 tracking-tight whitespace-nowrap">
                Mission Chain
              </span>

              {/* 1 -> 2 -> 3 -> 4 Step Badges */}
              <div className="flex items-center gap-1">
                {[0, 1, 2, 3].map((idx) => {
                  const stepMission = chainMissions[idx];
                  const isStepDone = Boolean(stepMission?.isCompleted || stepMission?.isClaimed);
                  return (
                    <React.Fragment key={idx}>
                      <button
                        type="button"
                        onClick={() => stepMission && setSelectedMissionDetail(stepMission)}
                        className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-black border transition cursor-pointer shrink-0 ${
                          isStepDone
                            ? 'bg-gradient-to-b from-amber-300 to-orange-500 text-slate-950 border-yellow-100 shadow-[0_0_8px_rgba(245,158,11,0.7)]'
                            : 'bg-[#171B28] text-amber-300 border-amber-500/40'
                        }`}
                        title={
                          stepMission
                            ? `${stepMission.title} (${isStepDone ? 'Completed' : 'Pending'})`
                            : `Step ${idx + 1}`
                        }
                      >
                        {idx + 1}
                      </button>
                      {idx < 3 && (
                        <span
                          className={`text-[10px] font-black ${
                            isStepDone ? 'text-amber-400' : 'text-slate-600'
                          }`}
                        >
                          →
                        </span>
                      )}
                    </React.Fragment>
                  );
                })}
              </div>
            </div>

            <p className="text-[10px] sm:text-[11px] font-semibold text-slate-300 mt-1 leading-snug">
              Complete all 4 missions to unlock the special reward
            </p>
          </div>

          {/* Right Side: Dedicated Chest Image + +10,000 FOX + Claim Button */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="w-12 h-10 sm:w-14 sm:h-11 rounded-xl border border-amber-500/40 shadow-[0_0_12px_rgba(245,158,11,0.25)] overflow-hidden bg-[#120E09] shrink-0 flex items-center justify-center">
              <img
                src={MISSION_ASSETS.chainChest}
                alt="Mission Chain Special Chest"
                className="w-full h-full object-cover block"
              />
            </div>

            <div className="flex flex-col items-end gap-1 shrink-0">
              <div className="px-2 py-0.5 rounded-lg bg-[#10131E] border border-amber-500/35 flex items-center gap-1">
                <img
                  src={foxGoldCoinImg}
                  alt="FOX"
                  className="w-3.5 h-3.5 rounded-full object-cover shrink-0"
                />
                <span className="text-[10px] sm:text-[11px] font-black text-amber-300 tabular-nums whitespace-nowrap">
                  +10,000 <span className="text-[9px]">FOX</span>
                </span>
              </div>

              <button
                type="button"
                onClick={handleClaimMissionChain}
                disabled={isMissionChainClaimed || claimingId === 'mission_chain_bonus'}
                className={`w-full px-3 py-1 rounded-lg font-black text-[10px] sm:text-xs transition border cursor-pointer whitespace-nowrap text-center ${
                  isMissionChainClaimed
                    ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300 cursor-default'
                    : canClaimMissionChain
                    ? 'bg-gradient-to-b from-amber-300 via-amber-500 to-orange-600 text-slate-950 border-yellow-200 shadow-[0_0_14px_rgba(245,158,11,0.7)] animate-pulse active:scale-95'
                    : 'bg-gradient-to-b from-amber-300 via-amber-500 to-orange-600 text-slate-950 border-amber-300/70 shadow-[0_0_10px_rgba(245,158,11,0.35)] hover:brightness-110 active:scale-95'
                }`}
              >
                {isMissionChainClaimed
                  ? 'Claimed ✓'
                  : claimingId === 'mission_chain_bonus'
                  ? '...'
                  : 'Claim'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 6. COMPACT LUCKY WHEEL & ACHIEVEMENTS BOTTOM ROW */}
      <div className="grid grid-cols-2 gap-2">
        {/* Left Card: Lucky Wheel */}
        <div
          onClick={() => {
            sound.playTap();
            if (onOpenWheel) onOpenWheel();
          }}
          className="rounded-2xl bg-gradient-to-r from-[#171A28]/95 to-[#121520]/95 border border-amber-500/45 hover:border-amber-400 p-2 flex items-center gap-2 shadow-[0_6px_18px_rgba(0,0,0,0.65)] cursor-pointer transition active:scale-[0.99] min-w-0"
        >
          <div className="w-11 h-11 aspect-square rounded-xl border border-amber-500/40 shrink-0 overflow-hidden bg-[#0B0E17] shadow-[0_0_10px_rgba(245,158,11,0.25)] flex items-center justify-center p-0.5">
            <img
              src={MISSION_ASSETS.luckyWheelBadge}
              alt="Lucky Wheel"
              className="w-full h-full object-contain block"
            />
          </div>

          <div className="flex-1 min-w-0">
            <h4 className="font-black text-[11px] sm:text-xs text-amber-200 truncate leading-tight">
              Lucky Wheel
            </h4>
            <p className="text-[9px] text-slate-300 font-medium line-clamp-2 leading-tight mt-0.5">
              Spin and win amazing rewards!
            </p>
            <div className="mt-1 flex items-center justify-between gap-1">
              <span className="px-2.5 py-0.5 rounded-md bg-gradient-to-b from-amber-300 via-amber-500 to-orange-600 text-slate-950 font-black text-[10px] shadow-[0_0_8px_rgba(245,158,11,0.4)] border border-yellow-200/70 whitespace-nowrap">
                Spin
              </span>
              <ChevronRight className="w-3.5 h-3.5 text-amber-400/80 shrink-0" />
            </div>
          </div>
        </div>

        {/* Right Card: Achievements */}
        <div
          onClick={() => {
            sound.playTap();
            setShowAchievementsModal(true);
          }}
          className="relative rounded-2xl bg-gradient-to-r from-[#171A28]/95 to-[#121520]/95 border border-amber-500/45 hover:border-amber-400 p-2 flex items-center gap-2 shadow-[0_6px_18px_rgba(0,0,0,0.65)] cursor-pointer transition active:scale-[0.99] min-w-0"
        >
          {claimableAchievementsCount > 0 && (
            <span className="absolute -top-1.5 right-2 px-1.5 py-0.5 rounded-full bg-rose-500 text-white font-black text-[8px] shadow-md animate-bounce">
              {claimableAchievementsCount} Ready
            </span>
          )}

          <div className="w-11 h-11 aspect-square rounded-xl border border-amber-500/40 shrink-0 overflow-hidden bg-[#0B0E17] shadow-[0_0_10px_rgba(245,158,11,0.25)] flex items-center justify-center p-0.5">
            <img
              src={MISSION_ASSETS.achievementsBadge}
              alt="Achievements"
              className="w-full h-full object-contain block"
            />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1 min-w-0">
              <h4 className="font-black text-[11px] sm:text-xs text-amber-200 truncate leading-tight">
                Achievements
              </h4>
              <Crown className="w-3 h-3 text-amber-400 fill-amber-400 shrink-0" />
            </div>
            <p className="text-[9px] text-slate-300 font-medium line-clamp-2 leading-tight mt-0.5">
              Complete long-term goals and earn big rewards!
            </p>
            <div className="mt-1 flex items-center justify-end">
              <ChevronRight className="w-3.5 h-3.5 text-amber-400/80 shrink-0" />
            </div>
          </div>
        </div>
      </div>

      {/* PERMANENT ACHIEVEMENTS & MILESTONES MODAL */}
      {showAchievementsModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3">
          <div className="w-full max-w-md max-h-[85vh] rounded-3xl bg-gradient-to-b from-[#171B29] to-[#0C0E16] border-2 border-amber-500/60 shadow-[0_0_40px_rgba(0,0,0,0.9)] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="px-4 py-3 border-b border-amber-500/30 flex items-center justify-between bg-[#121521]">
              <div className="flex items-center gap-2 min-w-0">
                <Award className="w-5 h-5 text-amber-400 shrink-0" />
                <div className="min-w-0">
                  <h3 className="text-sm font-black text-amber-200 truncate">
                    Permanent Achievements & Milestones
                  </h3>
                  <p className="text-[10px] text-slate-400 truncate">
                    Tapping, Business Upgrades, Player Ranks & Referrals
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAchievementsModal(false)}
                className="w-8 h-8 rounded-full bg-slate-800/80 hover:bg-slate-700 flex items-center justify-center text-slate-300 cursor-pointer shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Achievements List */}
            <div className="p-3 overflow-y-auto space-y-2 flex-1">
              {achievementMissions.map((ach) => {
                const isClaimingThis = claimingId === ach.id;
                return (
                  <div
                    key={ach.id}
                    className={`rounded-2xl p-2.5 border flex items-center justify-between gap-2.5 min-w-0 ${
                      ach.isClaimed
                        ? 'bg-[#10151F]/70 border-emerald-500/30'
                        : ach.isCompleted && !ach.isLockedByChain
                        ? 'bg-[#1B1710] border-amber-400/80 shadow-[0_0_12px_rgba(245,158,11,0.2)]'
                        : 'bg-[#131724] border-amber-500/30'
                    }`}
                  >
                    {renderMissionIcon(ach)}

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="font-black text-xs text-white truncate">{ach.title}</span>
                        {ach.isLockedByChain && (
                          <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 text-[8px] font-bold shrink-0">
                            Locked
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-300 truncate mt-0.5">
                        {ach.isLockedByChain && ach.prerequisiteTitle
                          ? `Requires "${ach.prerequisiteTitle}"`
                          : ach.description}
                      </p>
                      <div className="mt-1.5 flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-[#090B11] rounded-full overflow-hidden border border-amber-500/30">
                          <div
                            className="h-full bg-gradient-to-r from-amber-500 to-yellow-300 rounded-full"
                            style={{ width: `${ach.pct}%` }}
                          />
                        </div>
                        <span className="text-[10px] font-black text-amber-200 tabular-nums shrink-0">
                          {ach.progress.toLocaleString('en-US')}/{ach.target.toLocaleString('en-US')}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <div className="flex items-center gap-1 text-[10px] font-black text-amber-300 whitespace-nowrap">
                        <img src={foxGoldCoinImg} alt="FOX" className="w-3.5 h-3.5 rounded-full shrink-0" />
                        <span>+{ach.reward.toLocaleString('en-US')}</span>
                      </div>

                      {ach.isClaimed ? (
                        <span className="px-2 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 font-black text-[10px] whitespace-nowrap">
                          Claimed ✓
                        </span>
                      ) : ach.isLockedByChain ? (
                        <span className="px-2 py-1 rounded-lg bg-slate-800 text-slate-400 font-bold text-[10px] whitespace-nowrap">
                          Locked
                        </span>
                      ) : ach.isCompleted ? (
                        <button
                          type="button"
                          onClick={() => handleClaimMission(ach)}
                          disabled={isClaimingThis}
                          className="px-3 py-1 rounded-lg bg-gradient-to-b from-amber-300 via-amber-500 to-orange-600 text-slate-950 font-black text-[10px] shadow cursor-pointer whitespace-nowrap"
                        >
                          {isClaimingThis ? '...' : 'Claim'}
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setShowAchievementsModal(false);
                            handleGoMission(ach);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-300 font-black text-[10px] cursor-pointer whitespace-nowrap"
                        >
                          Go
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* MISSION INSPECTOR MODAL */}
      {selectedMissionDetail && (
        <div
          onClick={() => setSelectedMissionDetail(null)}
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-3xl bg-gradient-to-b from-[#181C2B] to-[#0D1018] border-2 border-amber-500/60 p-4 shadow-2xl text-white"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                {renderMissionIcon(selectedMissionDetail)}
                <div className="min-w-0">
                  <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    {selectedMissionDetail.status.replace('_', ' ')}
                  </span>
                  <h3 className="text-base font-black text-white mt-1 truncate">
                    {selectedMissionDetail.title}
                  </h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedMissionDetail(null)}
                className="w-7 h-7 rounded-full bg-slate-800 flex items-center justify-center text-slate-300 cursor-pointer shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-300 mt-3 leading-relaxed">
              {selectedMissionDetail.description}
            </p>

            <div className="mt-3 p-2.5 rounded-xl bg-[#0B0E16] border border-amber-500/30">
              <div className="flex items-center justify-between text-xs font-bold mb-1">
                <span className="text-slate-400">Progress</span>
                <span className="text-amber-300 font-black tabular-nums">
                  {selectedMissionDetail.progress.toLocaleString('en-US')} /{' '}
                  {selectedMissionDetail.target.toLocaleString('en-US')} ({selectedMissionDetail.pct}%)
                </span>
              </div>
              <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden border border-amber-500/25">
                <div
                  className="h-full bg-gradient-to-r from-amber-500 via-orange-400 to-yellow-300 rounded-full"
                  style={{ width: `${selectedMissionDetail.pct}%` }}
                />
              </div>
            </div>

            <div className="mt-3 flex items-center justify-between p-2.5 rounded-xl bg-[#14120D] border border-amber-500/30">
              <span className="text-xs font-bold text-slate-300">Mission Reward</span>
              <div className="flex items-center gap-1.5">
                <img src={foxGoldCoinImg} alt="FOX" className="w-4 h-4 rounded-full" />
                <span className="text-sm font-black text-amber-300">
                  +{selectedMissionDetail.reward.toLocaleString('en-US')} FOX
                </span>
              </div>
            </div>

            <div className="mt-4 flex items-center gap-2">
              {selectedMissionDetail.isClaimed ? (
                <div className="w-full py-2.5 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-black text-xs text-center">
                  Reward Claimed ✓
                </div>
              ) : selectedMissionDetail.isCompleted && !selectedMissionDetail.isLockedByChain ? (
                <button
                  type="button"
                  onClick={async () => {
                    const m = selectedMissionDetail;
                    setSelectedMissionDetail(null);
                    await handleClaimMission(m);
                  }}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-400 via-amber-500 to-orange-500 text-slate-950 font-black text-xs shadow-lg cursor-pointer"
                >
                  Claim +{selectedMissionDetail.reward.toLocaleString('en-US')} FOX
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    const m = selectedMissionDetail;
                    setSelectedMissionDetail(null);
                    handleGoMission(m);
                  }}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-400 via-amber-500 to-orange-500 text-slate-950 font-black text-xs shadow-lg cursor-pointer"
                >
                  Go to Complete Mission
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
