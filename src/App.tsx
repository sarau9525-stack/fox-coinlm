import React, { useEffect, useState, useRef, useCallback } from 'react';
import { UserGameState, UpgradeDefinition, TaskDefinition } from './types/game.js';
import { api, GameConfig } from './utils/api.js';
import { reconcileUserLevel } from '../server/gameConfig.js';
import { sound } from './utils/audio.js';
import { TelegramService } from './utils/telegram.js';
import { Header } from './components/Header.js';
import { TapScreen } from './components/TapScreen.js';
import { UpgradesScreen } from './components/UpgradesScreen.js';
import { TasksScreen } from './components/TasksScreen.js';
import { FriendsScreen } from './components/FriendsScreen.js';
import { LeaderboardScreen } from './components/LeaderboardScreen.js';
import { TradeScreen } from './components/TradeScreen.js';
import { GiftsScreen } from './components/GiftsScreen.js';
import { Navigation, NavTab } from './components/Navigation.js';
import { DailyRewardModal } from './components/modals/DailyRewardModal.js';
import { OfflineEarningsModal } from './components/modals/OfflineEarningsModal.js';
import { BoostModal } from './components/modals/BoostModal.js';
import { LuckyWheelModal } from './components/modals/LuckyWheelModal.js';
import { SettingsModal } from './components/modals/SettingsModal.js';
import { AuthModal } from './components/modals/AuthModal.js';
import { AdminTelegramSetup, AdminTabType } from './components/AdminTelegramSetup.js';
import { MandatoryChannelGate } from './components/MandatoryChannelGate.js';
import { Smartphone, Monitor, Sparkles, Lock, ShieldAlert } from 'lucide-react';

export default function App() {
  const [user, setUser] = useState<UserGameState | null>(null);
  const [config, setConfig] = useState<GameConfig | null>(null);
  const [activeTab, setActiveTab] = useState<NavTab>('home');
  const [isInitializing, setIsInitializing] = useState<boolean>(true);
  const [isMuted, setIsMuted] = useState<boolean>(sound.getMuted());

  // Modals state
  const [showDailyModal, setShowDailyModal] = useState<boolean>(false);
  const [showWheelModal, setShowWheelModal] = useState<boolean>(false);
  const [showOfflineModal, setShowOfflineModal] = useState<boolean>(false);
  const [offlineEarningsAmount, setOfflineEarningsAmount] = useState<number>(0);
  const [showBoostModal, setShowBoostModal] = useState<boolean>(false);
  const [showSettingsModal, setShowSettingsModal] = useState<boolean>(false);
  const [showAuthModal, setShowAuthModal] = useState<boolean>(false);
  const [showAdminModal, setShowAdminModal] = useState<boolean>(false);
  const [adminInitialTab, setAdminInitialTab] = useState<AdminTabType>('users');
  const [isAdminUnlocked, setIsAdminUnlocked] = useState<boolean>(() => {
    return typeof window !== 'undefined' && Boolean(sessionStorage.getItem('fox_admin_secret'));
  });
  const [equippedGiftId, setEquippedGiftId] = useState<string | null>(() => {
    return typeof window !== 'undefined' ? localStorage.getItem('fox_equipped_gift') : null;
  });

  // Memoized Game State Updater:
  // Avoids creating new state references when game values haven't meaningfully changed
  // and preserves nested object references (upgrades, boosters, completedTasks) when unchanged.
  const updateGameState = useCallback(
    (updater: UserGameState | null | ((prev: UserGameState | null) => UserGameState | null)) => {
      setUser((prev) => {
        const rawNext = typeof updater === 'function' ? updater(prev) : updater;
        if (!rawNext) return null;

        const reconciled = reconcileUserLevel(rawNext);
        if (!prev) return reconciled;

        // Preserve nested object references if identical in content
        if (
          prev.boosters !== reconciled.boosters &&
          prev.boosters.fullEnergyRemaining === reconciled.boosters.fullEnergyRemaining &&
          prev.boosters.nextFullEnergyAt === reconciled.boosters.nextFullEnergyAt &&
          prev.boosters.turboActiveUntil === reconciled.boosters.turboActiveUntil &&
          prev.boosters.nextTurboAt === reconciled.boosters.nextTurboAt &&
          prev.boosters.lastWheelSpinTimestamp === reconciled.boosters.lastWheelSpinTimestamp
        ) {
          reconciled.boosters = prev.boosters;
        }

        // Bail out of re-render if no meaningful state fields changed
        if (
          prev.id === reconciled.id &&
          prev.balance === reconciled.balance &&
          prev.totalEarned === reconciled.totalEarned &&
          prev.totalTaps === reconciled.totalTaps &&
          prev.energy === reconciled.energy &&
          prev.maxEnergy === reconciled.maxEnergy &&
          prev.level === reconciled.level &&
          prev.levelName === reconciled.levelName &&
          prev.tapPower === reconciled.tapPower &&
          prev.profitPerHour === reconciled.profitPerHour &&
          prev.energyRegenRate === reconciled.energyRegenRate &&
          prev.canClaimDaily === reconciled.canClaimDaily &&
          prev.unclaimedPassive === reconciled.unclaimedPassive &&
          prev.isAdmin === reconciled.isAdmin &&
          Boolean(prev.isBanned) === Boolean(reconciled.isBanned) &&
          prev.isGuest === reconciled.isGuest &&
          prev.boosters === reconciled.boosters &&
          prev.upgrades === reconciled.upgrades &&
          prev.tasks === reconciled.tasks
        ) {
          return prev;
        }

        return reconciled;
      });
    },
    []
  );

  const handleEquipGift = useCallback((giftId: string) => {
    setEquippedGiftId(giftId);
    if (typeof window !== 'undefined') {
      localStorage.setItem('fox_equipped_gift', giftId);
    }
  }, []);

  // Stable callbacks for Header, TapScreen & Navigation to prevent child re-renders
  const handleOpenSettings = useCallback(() => setShowSettingsModal(true), []);
  const handleOpenBoost = useCallback(() => setShowBoostModal(true), []);
  const handleOpenDaily = useCallback(() => setShowDailyModal(true), []);
  const handleOpenWheel = useCallback(() => setShowWheelModal(true), []);
  const handleOpenOfflineModal = useCallback(() => setShowOfflineModal(true), []);
  const handleOpenGifts = useCallback(() => setActiveTab('gifts'), []);
  const handleOpenFriends = useCallback(() => setActiveTab('friends'), []);
  const handleOpenTrade = useCallback(() => setActiveTab('trade'), []);
  const handleOpenAdminSetup = useCallback((tab: AdminTabType = 'users') => {
    setAdminInitialTab(tab);
    setShowAdminModal(true);
  }, []);

  // Telegram simulator shell toggle for desktop/web testing
  const [isTelegramSimMode, setIsTelegramSimMode] = useState<boolean>(false);
  const offlineCheckedRef = useRef<boolean>(false);

  // Initialize App and Authenticate
  useEffect(() => {
    TelegramService.init();

    // Support direct Admin Panel URL (/admin, ?admin=1, or #admin)
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      if (
        window.location.pathname === '/admin' ||
        urlParams.get('admin') === '1' ||
        window.location.hash === '#admin'
      ) {
        setShowAdminModal(true);
      }
    }

    const initApp = async () => {
      try {
        // 1. Fetch game configuration
        const cfg = await api.getConfig();
        setConfig(cfg);

        // 2. Parse referral parameter from URL or Telegram start_param
        const urlParams = new URLSearchParams(window.location.search);
        const refFromUrl = urlParams.get('ref') || undefined;
        const refFromTg = TelegramService.getStartParam();
        const effectiveRef = refFromTg ? refFromTg.replace('ref_', '') : refFromUrl;

        // 3. Check Telegram WebApp credentials
        if (TelegramService.isAvailable()) {
          const initData = TelegramService.getInitData();
          const authRes = await api.authTelegram(initData, effectiveRef);
          updateGameState(authRes.user);
          api.syncUserToServer(authRes.user, effectiveRef).then((synced) => {
            if (synced) updateGameState(synced);
          }).catch(() => {});
          return;
        }

        // 4. Standalone web check existing token or local user snapshot
        if (api.getToken() || localStorage.getItem('foxcoin_local_user_v1')) {
          try {
            const meRes = await api.getMe();
            updateGameState(meRes.user);
            api.syncUserToServer(meRes.user, effectiveRef).then((synced) => {
              if (synced) updateGameState(synced);
            }).catch(() => {});
            return;
          } catch {
            const synced = await api.syncUserToServer(undefined, effectiveRef);
            if (synced) {
              updateGameState(synced);
              return;
            }
            api.setToken(null);
          }
        }

        // 5. If no session, show AuthModal
        setShowAuthModal(true);
      } catch (err) {
        console.error('Initialization error:', err);
        setShowAuthModal(true);
      } finally {
        setIsInitializing(false);
      }
    };

    initApp();

    // Register real-time sync listener from api client with anti-rollback reconciliation
    api.registerStateListener((updatedUser) => {
      updateGameState((prev) => {
        if (!prev || prev.id !== updatedUser.id) {
          return { ...updatedUser };
        }
        return {
          ...updatedUser,
          balance: api.hasPendingTaps() ? Math.max(updatedUser.balance, prev.balance) : updatedUser.balance,
          totalEarned: Math.max(updatedUser.totalEarned || 0, prev.totalEarned || 0),
          totalTaps: Math.max(updatedUser.totalTaps || 0, prev.totalTaps || 0),
          energy: api.hasPendingTaps() ? Math.min(updatedUser.energy, prev.energy) : updatedUser.energy,
        };
      });
    });

    // Periodic & lifecycle sync to guarantee Cloudflare D1 database always has latest coins, referrals & upgrades
    const syncInterval = setInterval(() => {
      if (!api.hasPendingTaps()) {
        api.syncUserToServer().then((synced) => {
          if (synced && !api.hasPendingTaps()) {
            updateGameState(synced);
          }
        }).catch(() => {});
      } else {
        api.flushTaps().catch(() => {});
      }
    }, 15000);

    const handleVisibilityOrHide = () => {
      api.flushTaps().catch(() => {});
      api.syncUserToServer().catch(() => {});
    };

    window.addEventListener('visibilitychange', handleVisibilityOrHide);
    window.addEventListener('pagehide', handleVisibilityOrHide);

    return () => {
      clearInterval(syncInterval);
      window.removeEventListener('visibilitychange', handleVisibilityOrHide);
      window.removeEventListener('pagehide', handleVisibilityOrHide);
    };
  }, [updateGameState]);

  // Offline passive income check on load and whenever unclaimedPassive updates
  useEffect(() => {
    if (user) {
      const unclaimed = Math.floor(user.unclaimedPassive || 0);
      if (unclaimed >= 1) {
        setOfflineEarningsAmount((prev) => Math.max(prev, unclaimed));
        if (!offlineCheckedRef.current) {
          offlineCheckedRef.current = true;
          setShowOfflineModal(true);
        }
      } else if (!offlineCheckedRef.current) {
        offlineCheckedRef.current = true;
      }
    }
  }, [user]);

  // Client-side real-time energy regeneration AND continuous profitPerHour ticker
  const lastTickRef = useRef<number>(Date.now());
  useEffect(() => {
    lastTickRef.current = Date.now();
    const interval = setInterval(() => {
      if (typeof document !== 'undefined' && document.hidden) {
        return;
      }

      const now = Date.now();
      const rawElapsedSec = Math.max(0.5, (now - lastTickRef.current) / 1000);
      lastTickRef.current = now;

      // If the user returned from background/lock screen after >= 60 seconds, bank offline coins and show modal
      if (rawElapsedSec >= 60) {
        updateGameState((prev) => {
          if (!prev) return null;
          const maxOfflineSec = (prev.maxOfflineHours || 3) * 3600;
          const cappedOfflineSec = Math.min(rawElapsedSec, maxOfflineSec);
          const nextEnergy = Math.min(
            prev.maxEnergy,
            Math.floor(prev.energy + prev.energyRegenRate * rawElapsedSec)
          );
          const newlyEarnedOffline =
            prev.profitPerHour > 0 ? Math.floor((prev.profitPerHour / 3600) * cappedOfflineSec) : 0;
          const totalUnclaimed = Math.floor(prev.unclaimedPassive || 0) + newlyEarnedOffline;

          if (totalUnclaimed >= 1) {
            setOfflineEarningsAmount(totalUnclaimed);
            setShowOfflineModal(true);
          }

          const nextState: UserGameState = reconcileUserLevel({
            ...prev,
            energy: nextEnergy,
            unclaimedPassive: totalUnclaimed,
            lastPassiveClaimTimestamp: now,
          });
          api.syncClientState(nextState);
          return nextState;
        });
        return;
      }

      const elapsedSec = Math.min(10, rawElapsedSec);

      updateGameState((prev) => {
        if (!prev) return null;
        const needsEnergy = prev.energy < prev.maxEnergy;
        const hasProfit = prev.profitPerHour > 0;
        if (!needsEnergy && !hasProfit) return prev;

        const nextEnergy = needsEnergy
          ? Math.min(prev.maxEnergy, prev.energy + prev.energyRegenRate * elapsedSec)
          : prev.energy;
        const profitGain = hasProfit ? (prev.profitPerHour / 3600) * elapsedSec : 0;

        const nextState: UserGameState = reconcileUserLevel({
          ...prev,
          energy: Math.floor(nextEnergy),
          balance: prev.balance + profitGain,
          totalEarned: prev.totalEarned + profitGain,
          unclaimedPassive: prev.unclaimedPassive,
          lastPassiveClaimTimestamp: now,
        });
        api.syncClientState(nextState);
        return nextState;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [updateGameState]);

  // High-frequency RAF-coalesced tapping handler:
  // Batches rapid multi-touch / fast clicks within the same animation frame into a single React state update
  const pendingTapCountRef = useRef<number>(0);
  const tapRafIdRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (tapRafIdRef.current !== null) {
        cancelAnimationFrame(tapRafIdRef.current);
      }
    };
  }, []);

  const handleTap = useCallback(
    (count: number) => {
      pendingTapCountRef.current += count;
      api.queueTap(count);

      if (tapRafIdRef.current === null) {
        tapRafIdRef.current = requestAnimationFrame(() => {
          tapRafIdRef.current = null;
          const totalCount = pendingTapCountRef.current;
          pendingTapCountRef.current = 0;
          if (totalCount <= 0) return;

          updateGameState((prev) => {
            if (!prev) return null;
            const isTurbo = prev.boosters.turboActiveUntil > Date.now();
            if (!isTurbo && prev.energy <= 0) return prev;

            const tapMultiplier = isTurbo ? 3 : 1;
            const effectiveCount = isTurbo ? totalCount : Math.min(totalCount, Math.floor(prev.energy));
            if (effectiveCount <= 0) return prev;

            const earned = prev.tapPower * tapMultiplier * effectiveCount;
            const nextEnergy = isTurbo ? prev.energy : Math.max(0, prev.energy - effectiveCount);

            const nextState: UserGameState = reconcileUserLevel({
              ...prev,
              balance: prev.balance + earned,
              totalEarned: prev.totalEarned + earned,
              totalTaps: prev.totalTaps + effectiveCount,
              energy: nextEnergy,
            });
            api.syncClientState(nextState);
            return nextState;
          });
        });
      }
    },
    [updateGameState]
  );

  // Upgrade handler
  const handlePurchaseUpgrade = useCallback(
    async (upgradeId: string) => {
      const updated = await api.purchaseUpgrade(upgradeId);
      updateGameState({ ...updated });
    },
    [updateGameState]
  );

  // Claim Passive income
  const handleClaimPassive = useCallback(async () => {
    const expectedAmount = Math.max(
      Math.floor(offlineEarningsAmount || 0),
      Math.floor(user?.unclaimedPassive || 0)
    );
    const res = await api.claimPassive(expectedAmount);
    setOfflineEarningsAmount(0);
    setShowOfflineModal(false);
    updateGameState({
      ...res.user,
      unclaimedPassive: 0,
    });
  }, [offlineEarningsAmount, user?.unclaimedPassive, updateGameState]);

  // Claim Daily reward
  const handleClaimDaily = useCallback(async () => {
    const res = await api.claimDaily();
    updateGameState(res.user);
  }, [updateGameState]);

  // Claim Task
  const handleClaimTask = useCallback(
    async (taskId: string) => {
      const res = await api.claimTask(taskId);
      updateGameState(res.user);
    },
    [updateGameState]
  );

  // Use Booster
  const handleUseBoost = useCallback(
    async (type: 'full_energy' | 'turbo') => {
      const updated = await api.useBooster(type);
      updateGameState(updated);
    },
    [updateGameState]
  );

  // Spin Lucky Wheel (24h cooldown)
  const handleSpinWheel = useCallback(async () => {
    const res = await api.spinLuckyWheel();
    updateGameState(res.user);
    return res;
  }, [updateGameState]);

  // Link account
  const handleLinkAccount = useCallback(
    async (email: string, pass: string) => {
      const res = await api.linkAccount(email, pass);
      updateGameState(res.user);
    },
    [updateGameState]
  );

  // Logout
  const handleLogout = useCallback(() => {
    api.setToken(null);
    updateGameState(null);
    setShowSettingsModal(false);
    setShowAuthModal(true);
  }, [updateGameState]);

  // Toggle sound
  const handleToggleSound = useCallback(() => {
    const muted = sound.toggleMute();
    setIsMuted(muted);
  }, []);

  // Telegram simulation toggle for testing
  const handleToggleSimMode = useCallback(async () => {
    const nextMode = !isTelegramSimMode;
    setIsTelegramSimMode(nextMode);

    if (nextMode && !user?.isTelegram) {
      // Simulate Telegram Mini App login for testing
      const mockInitData = `user=${encodeURIComponent(
        JSON.stringify({
          id: 77889900,
          first_name: 'Alex',
          last_name: 'Foxer',
          username: 'alex_foxer',
          is_premium: true,
        })
      )}&auth_date=${Math.floor(Date.now() / 1000)}&hash=simulated_hash`;
      try {
        const res = await api.authTelegram(mockInitData);
        updateGameState(res.user);
      } catch (err) {
        console.error('Sim auth error:', err);
      }
    }
  }, [isTelegramSimMode, user?.isTelegram, updateGameState]);

  // Channel membership gate status (requires both @FOX_COINEX and @FOX-COINl verification)
  const isChannelVerified = user
    ? !!(
        typeof window !== 'undefined' &&
        localStorage.getItem(`fox_channels_v2_verified_${user.id}`) === 'true'
      )
    : true;

  if (isInitializing) {
    return (
      <div className="min-h-screen bg-[#0B0E17] flex flex-col items-center justify-center text-white px-4">
        <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-amber-500 to-orange-500 p-1 mb-4 shadow-xl shadow-orange-500/20 animate-pulse">
          <div className="w-full h-full bg-[#111827] rounded-[20px] flex items-center justify-center font-black text-2xl text-amber-400">
            🦊
          </div>
        </div>
        <h2 className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-amber-400 to-orange-400">
          Fox Coin
        </h2>
        <p className="text-xs text-slate-400 mt-1">Connecting to game server...</p>
      </div>
    );
  }

  const isEffectiveAdmin = Boolean(user?.isAdmin || isAdminUnlocked);

  return (
    <div className="min-h-screen bg-[#07090F] flex flex-col items-center justify-center text-slate-100 font-sans selection:bg-amber-500 selection:text-black">
      {/* Platform Mode Switcher — Visible only to Admin */}
      {isEffectiveAdmin && (
        <div className="fixed top-2 right-2 z-50 flex items-center gap-1.5 bg-slate-900/90 border border-slate-700/80 px-2.5 py-1 rounded-full shadow-lg text-[11px] font-bold">
          <button
            onClick={handleToggleSimMode}
            className={`flex items-center gap-1 transition ${
              isTelegramSimMode ? 'text-sky-400' : 'text-slate-400 hover:text-white'
            }`}
            title="Toggle Telegram Mini App UI simulation"
          >
            {isTelegramSimMode ? <Smartphone className="w-3.5 h-3.5" /> : <Monitor className="w-3.5 h-3.5" />}
            <span>{isTelegramSimMode ? 'Telegram View' : 'Web View'}</span>
          </button>
        </div>
      )}

      {/* Mobile Device Frame Container */}
      <div
        className={`w-full max-w-md min-h-screen flex flex-col bg-[#0B0E17] relative shadow-2xl ${
          isTelegramSimMode ? 'border-x border-slate-800' : ''
        }`}
      >
        {/* Telegram Native Simulation Header */}
        {isTelegramSimMode && (
          <div className="bg-[#18222D] text-white px-4 py-2 flex items-center justify-between text-xs font-semibold border-b border-slate-800 select-none">
            <div className="flex items-center gap-2">
              <span className="text-sky-400 cursor-pointer">Cancel</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="font-bold text-xs text-slate-100">Fox Coin</span>
              <span className="text-[10px] text-slate-400">bot</span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-400">
              <span className="text-sm">•••</span>
            </div>
          </div>
        )}

        {/* Game App Header */}
        {user && (
          <Header
            user={user}
            isAdmin={isEffectiveAdmin}
            onOpenSettings={handleOpenSettings}
            onOpenBoost={handleOpenBoost}
            onOpenDaily={handleOpenDaily}
            onOpenWheel={handleOpenWheel}
            onOpenGifts={handleOpenGifts}
            onOpenTrade={handleOpenTrade}
            onOpenAdminSetup={handleOpenAdminSetup}
            isMuted={isMuted}
            onToggleSound={handleToggleSound}
          />
        )}

        {/* Main Content Pages */}
        <main className="flex-1 flex flex-col">
          {user && user.isBanned && !isEffectiveAdmin ? (
            <div className="flex-1 flex flex-col items-center justify-center px-6 pb-28 pt-10 text-center">
              <div className="w-20 h-20 rounded-3xl bg-rose-500/15 border-2 border-rose-500/40 flex items-center justify-center text-rose-400 mb-4 shadow-xl shadow-rose-500/10">
                <ShieldAlert className="w-10 h-10" />
              </div>
              <h3 className="text-xl font-black text-rose-400">Account Suspended</h3>
              <p className="text-xs text-slate-300 mt-2 max-w-xs leading-relaxed">
                This account has been suspended by the administrator due to policy or anti-bot verification rules.
              </p>
              <p className="text-[11px] text-slate-400 mt-1" dir="rtl">
                حساب کاربری شما توسط مدیریت مسدود شده است.
              </p>
            </div>
          ) : user && activeTab !== 'home' && config?.lockedSections?.[activeTab] ? (
            <div className="flex-1 flex flex-col items-center justify-center px-6 pb-28 pt-10 text-center animate-fade-in">
              <div className="w-20 h-20 rounded-3xl bg-amber-500/15 border-2 border-amber-500/40 flex items-center justify-center text-amber-400 mb-4 shadow-xl shadow-amber-500/10">
                <Lock className="w-10 h-10" />
              </div>
              <h3 className="text-lg font-black text-amber-300">
                {activeTab === 'leaderboard'
                  ? 'Rank Section Locked'
                  : activeTab === 'trade'
                  ? 'Trade Section Locked'
                  : activeTab === 'gifts'
                  ? 'Gifts Section Locked'
                  : activeTab === 'upgrades'
                  ? 'Mine Section Locked'
                  : activeTab === 'tasks'
                  ? 'Tasks Section Locked'
                  : 'Friends Section Locked'}
              </h3>
              <p className="text-xs font-bold text-slate-200 mt-2 max-w-xs leading-relaxed" dir="rtl">
                این بخش موقتاً توسط مدیریت قفل شده است و به‌زودی بازگشایی خواهد شد.
              </p>
              <p className="text-[11px] text-slate-400 mt-1 max-w-xs">
                This section is temporarily locked by the administrator and will open soon.
              </p>
              <div className="flex items-center gap-2 mt-5">
                <button
                  type="button"
                  onClick={() => setActiveTab('home')}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-xs shadow-lg transition active:scale-95 cursor-pointer"
                >
                  Back to Tap 🦊
                </button>
                {isEffectiveAdmin && (
                  <button
                    type="button"
                    onClick={() => handleOpenAdminSetup('locks')}
                    className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-amber-500/40 text-amber-300 font-black text-xs transition cursor-pointer"
                  >
                    مدیریت قفل‌ها ⚙️
                  </button>
                )}
              </div>
            </div>
          ) : (
            <>
              {user && activeTab === 'home' && (
                <TapScreen
                  user={user}
                  onTap={handleTap}
                  onOpenBoost={handleOpenBoost}
                  onOpenWheel={handleOpenWheel}
                  onOpenDaily={handleOpenDaily}
                  onNavigateTab={setActiveTab}
                  onClaimQuickMission={(_missionId, reward) => {
                    updateGameState((prev) => {
                      if (!prev) return null;
                      const nextState = reconcileUserLevel({
                        ...prev,
                        balance: prev.balance + reward,
                        totalEarned: prev.totalEarned + reward,
                      });
                      api.syncClientState(nextState);
                      api.syncUserToServer(nextState).catch(() => {});
                      return nextState;
                    });
                  }}
                  equippedGiftId={equippedGiftId}
                  onOpenGifts={handleOpenGifts}
                  offlineEarnings={offlineEarningsAmount}
                  onOpenOfflineModal={handleOpenOfflineModal}
                />
              )}

              {user && activeTab === 'upgrades' && config && (
                <UpgradesScreen
                  user={user}
                  upgrades={config.upgrades}
                  onPurchase={handlePurchaseUpgrade}
                  offlineEarnings={offlineEarningsAmount}
                  onClaimOffline={handleClaimPassive}
                />
              )}

              {user && activeTab === 'gifts' && config && (
                <GiftsScreen
                  user={user}
                  upgrades={config.upgrades}
                  botUsername={config?.telegramBotUsername || 'FOXCOINBot'}
                  equippedGiftId={equippedGiftId}
                  onEquipGift={handleEquipGift}
                  onPurchaseGift={handlePurchaseUpgrade}
                />
              )}

              {user && activeTab === 'trade' && (
                <TradeScreen
                  user={user}
                  onTradeComplete={updateGameState}
                  onFriendsTab={handleOpenFriends}
                />
              )}

              {user && activeTab === 'tasks' && config && (
                <TasksScreen
                  user={user}
                  tasks={config.tasks}
                  onClaimTask={handleClaimTask}
                  onOpenWheel={handleOpenWheel}
                />
              )}

              {user && activeTab === 'friends' && (
                <FriendsScreen
                  user={user}
                  botUsername={config?.telegramBotUsername || 'FOXCOINBot'}
                  onTradeTab={handleOpenTrade}
                  onBotUsernameUpdated={(nextBotUsername) => {
                    setConfig((prev) =>
                      prev && prev.telegramBotUsername !== nextBotUsername
                        ? { ...prev, telegramBotUsername: nextBotUsername }
                        : prev
                    );
                  }}
                />
              )}

              {user && activeTab === 'leaderboard' && (
                <LeaderboardScreen user={user} />
              )}
            </>
          )}
        </main>

        {/* Bottom Navigation */}
        {user && (
          <Navigation
            activeTab={activeTab}
            onChangeTab={setActiveTab}
            hasDailyReward={user.canClaimDaily}
            hasUnclaimedPassive={Math.max(user.unclaimedPassive || 0, offlineEarningsAmount) > 0}
            lockedSections={config?.lockedSections}
          />
        )}

        {/* Modals */}
        {showAuthModal && (
          <AuthModal
            onSuccess={(authenticatedUser) => {
              updateGameState(authenticatedUser);
              setShowAuthModal(false);
            }}
            initialRefCode={new URLSearchParams(window.location.search).get('ref') || undefined}
          />
        )}

        {showDailyModal && user && (
          <DailyRewardModal
            user={user}
            onClose={() => setShowDailyModal(false)}
            onClaim={handleClaimDaily}
          />
        )}

        {showWheelModal && user && (
          <LuckyWheelModal
            user={user}
            prizes={config?.wheelPrizes}
            onClose={() => setShowWheelModal(false)}
            onSpin={handleSpinWheel}
          />
        )}

        {showOfflineModal && user && (
          <OfflineEarningsModal
            amount={Math.max(offlineEarningsAmount, Math.floor(user.unclaimedPassive || 0))}
            profitPerHour={user.profitPerHour}
            onClaim={handleClaimPassive}
            onClose={() => setShowOfflineModal(false)}
          />
        )}

        {showBoostModal && user && (
          <BoostModal
            user={user}
            onClose={() => setShowBoostModal(false)}
            onUseBoost={handleUseBoost}
          />
        )}

        {showSettingsModal && user && (
          <SettingsModal
            user={user}
            isAdmin={isEffectiveAdmin}
            onClose={() => setShowSettingsModal(false)}
            isMuted={isMuted}
            onToggleSound={handleToggleSound}
            onLinkAccount={handleLinkAccount}
            onLogout={handleLogout}
            botUsername={config?.telegramBotUsername || 'FOXCOINBot'}
            onOpenAdminSetup={handleOpenAdminSetup}
          />
        )}

        {/* Mandatory Telegram & YouTube Channel Membership Gate */}
        {user && !isChannelVerified && (
          <MandatoryChannelGate
            user={user}
            channelHandle="@FOX_COINEX"
            youtubeUrl="https://www.youtube.com/@FOX-COINl"
            onVerified={(updatedUser) => {
              updateGameState(updatedUser);
            }}
          />
        )}

        {/* Dedicated Admin Management Page (Users, Cards, Gift Prices, Wheel, Bot Setup & GitHub Upload) */}
        {showAdminModal && (
          <AdminTelegramSetup
            user={user}
            config={config}
            onClose={() => setShowAdminModal(false)}
            initialTab={adminInitialTab}
            onAdminStatusChange={(unlocked) => setIsAdminUnlocked(unlocked)}
            onUserUpdated={(updatedUser) => updateGameState(updatedUser)}
            onConfigUpdated={(nextCfg) => setConfig(nextCfg)}
          />
        )}
      </div>
    </div>
  );
}
