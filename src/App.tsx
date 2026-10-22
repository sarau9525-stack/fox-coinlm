import React, { useEffect, useState, useRef, useCallback } from 'react';
import { UserGameState, UpgradeDefinition, TaskDefinition } from './types/game.js';
import { api, GameConfig } from './utils/api.js';
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
import { Smartphone, Monitor, Sparkles } from 'lucide-react';

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

  const handleEquipGift = (giftId: string) => {
    setEquippedGiftId(giftId);
    if (typeof window !== 'undefined') {
      localStorage.setItem('fox_equipped_gift', giftId);
    }
  };

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
          setUser(authRes.user);
          return;
        }

        // 4. Standalone web check existing token
        if (api.getToken()) {
          try {
            const meRes = await api.getMe();
            setUser(meRes.user);
            return;
          } catch {
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

    // Register real-time sync listener from api client
    api.registerStateListener((updatedUser) => {
      setUser(updatedUser);
    });
  }, []);

  // Offline passive income check on first load
  useEffect(() => {
    if (user && !offlineCheckedRef.current) {
      offlineCheckedRef.current = true;
      if (user.unclaimedPassive > 0) {
        setOfflineEarningsAmount(user.unclaimedPassive);
        setShowOfflineModal(true);
      }
    }
  }, [user]);

  // Client-side smooth energy regeneration ticker
  useEffect(() => {
    const interval = setInterval(() => {
      setUser((prev) => {
        if (!prev) return null;
        if (prev.energy >= prev.maxEnergy) return prev;
        return {
          ...prev,
          energy: Math.min(prev.maxEnergy, prev.energy + prev.energyRegenRate),
        };
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Tapping handler
  const handleTap = useCallback(
    (count: number) => {
      if (!user) return;
      if (user.energy <= 0) return;

      const isTurbo = user.boosters.turboActiveUntil > Date.now();
      const tapMultiplier = isTurbo ? 3 : 1;
      const earned = user.tapPower * tapMultiplier * count;

      // Optimistic instant UI update
      setUser((prev) => {
        if (!prev) return null;
        const nextEnergy = Math.max(0, prev.energy - count);
        return {
          ...prev,
          balance: prev.balance + earned,
          totalEarned: prev.totalEarned + earned,
          totalTaps: prev.totalTaps + count,
          energy: nextEnergy,
        };
      });

      // Send to batched queue for server authorization
      api.queueTap(count);
    },
    [user]
  );

  // Upgrade handler
  const handlePurchaseUpgrade = async (upgradeId: string) => {
    const updated = await api.purchaseUpgrade(upgradeId);
    setUser(updated);
  };

  // Claim Passive income
  const handleClaimPassive = async () => {
    const res = await api.claimPassive();
    setUser(res.user);
  };

  // Claim Daily reward
  const handleClaimDaily = async () => {
    const res = await api.claimDaily();
    setUser(res.user);
  };

  // Claim Task
  const handleClaimTask = async (taskId: string) => {
    const res = await api.claimTask(taskId);
    setUser(res.user);
  };

  // Use Booster
  const handleUseBoost = async (type: 'full_energy' | 'turbo') => {
    const updated = await api.useBooster(type);
    setUser(updated);
  };

  // Spin Lucky Wheel (24h cooldown)
  const handleSpinWheel = async () => {
    const res = await api.spinLuckyWheel();
    setUser(res.user);
    return res;
  };

  // Link account
  const handleLinkAccount = async (email: string, pass: string) => {
    const res = await api.linkAccount(email, pass);
    setUser(res.user);
  };

  // Logout
  const handleLogout = () => {
    api.setToken(null);
    setUser(null);
    setShowSettingsModal(false);
    setShowAuthModal(true);
  };

  // Toggle sound
  const handleToggleSound = () => {
    const muted = sound.toggleMute();
    setIsMuted(muted);
  };

  // Telegram simulation toggle for testing
  const handleToggleSimMode = async () => {
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
        setUser(res.user);
      } catch (err) {
        console.error('Sim auth error:', err);
      }
    }
  };

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
            onOpenSettings={() => setShowSettingsModal(true)}
            onOpenBoost={() => setShowBoostModal(true)}
            onOpenDaily={() => setShowDailyModal(true)}
            onOpenWheel={() => setShowWheelModal(true)}
            onOpenAdminSetup={(tab = 'users') => {
              setAdminInitialTab(tab);
              setShowAdminModal(true);
            }}
            isMuted={isMuted}
            onToggleSound={handleToggleSound}
          />
        )}

        {/* Main Content Pages */}
        <main className="flex-1 flex flex-col">
          {user && activeTab === 'home' && (
            <TapScreen
              user={user}
              onTap={handleTap}
              onOpenBoost={() => setShowBoostModal(true)}
              onOpenWheel={() => setShowWheelModal(true)}
              equippedGiftId={equippedGiftId}
              onOpenGifts={() => setActiveTab('gifts')}
            />
          )}

          {user && activeTab === 'upgrades' && config && (
            <UpgradesScreen
              user={user}
              upgrades={config.upgrades}
              onPurchase={handlePurchaseUpgrade}
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
              onTradeComplete={(updated) => setUser(updated)}
              onFriendsTab={() => setActiveTab('friends')}
            />
          )}

          {user && activeTab === 'tasks' && config && (
            <TasksScreen
              user={user}
              tasks={config.tasks}
              onClaimTask={handleClaimTask}
              onOpenWheel={() => setShowWheelModal(true)}
            />
          )}

          {user && activeTab === 'friends' && (
            <FriendsScreen
              user={user}
              botUsername={config?.telegramBotUsername || 'FOXCOINBot'}
              onTradeTab={() => setActiveTab('trade')}
            />
          )}

          {user && activeTab === 'leaderboard' && (
            <LeaderboardScreen user={user} />
          )}
        </main>

        {/* Bottom Navigation */}
        {user && (
          <Navigation
            activeTab={activeTab}
            onChangeTab={setActiveTab}
            hasDailyReward={user.canClaimDaily}
            hasUnclaimedPassive={user.unclaimedPassive > 0}
          />
        )}

        {/* Modals */}
        {showAuthModal && (
          <AuthModal
            onSuccess={(authenticatedUser) => {
              setUser(authenticatedUser);
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
            amount={offlineEarningsAmount}
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
            onOpenAdminSetup={(tab: 'users' | 'webhook' | 'github' = 'users') => {
              setAdminInitialTab(tab);
              setShowAdminModal(true);
            }}
          />
        )}

        {/* Mandatory Telegram & YouTube Channel Membership Gate */}
        {user && !isChannelVerified && (
          <MandatoryChannelGate
            user={user}
            channelHandle="@FOX_COINEX"
            youtubeUrl="https://www.youtube.com/@FOX-COINl"
            onVerified={(updatedUser) => {
              setUser(updatedUser);
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
            onUserUpdated={(updatedUser) => setUser(updatedUser)}
            onConfigUpdated={(nextCfg) => setConfig(nextCfg)}
          />
        )}
      </div>
    </div>
  );
}
