import { Volume2, VolumeX, Settings, Zap, ShieldCheck } from 'lucide-react';
import { UserGameState } from '../types/game.js';
import { foxGoldCoinImg } from '../assets/assets.js';

interface HeaderProps {
  user: UserGameState;
  isAdmin?: boolean;
  onOpenSettings: () => void;
  onOpenBoost: () => void;
  onOpenDaily: () => void;
  onOpenWheel?: () => void;
  isMuted: boolean;
  onToggleSound: () => void;
  onOpenAdminSetup?: (tab?: 'users' | 'webhook' | 'github') => void;
}

export const Header: React.FC<HeaderProps> = ({
  user,
  isAdmin = false,
  onOpenSettings,
  onOpenBoost,
  onOpenDaily,
  onOpenWheel,
  isMuted,
  onToggleSound,
  onOpenAdminSetup,
}) => {
  const showAdminControls = Boolean(user.isAdmin || isAdmin);
  const canSpinWheel =
    Date.now() - (user.boosters.lastWheelSpinTimestamp || 0) >= 24 * 60 * 60 * 1000;

  return (
    <header className="w-full max-w-md mx-auto pt-3 px-4 pb-2 flex items-center justify-between text-white z-20">
      {/* Player profile chip */}
      <div className="flex items-center gap-2.5">
        <div className="relative">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-600 via-orange-500 to-amber-300 p-0.5 shadow-lg shadow-orange-950/40">
            <div className="w-full h-full rounded-[10px] bg-[#111827] flex items-center justify-center overflow-hidden">
              <img
                src={foxGoldCoinImg}
                alt="Fox Avatar"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
          {user.isTelegram && (
            <span
              title="Verified Telegram Player"
              className="absolute -bottom-1 -right-1 w-4 h-4 bg-sky-500 rounded-full flex items-center justify-center text-[9px] border-2 border-[#0B0E17]"
            >
              ✓
            </span>
          )}
        </div>

        <div>
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-sm tracking-tight text-slate-100 max-w-[120px] truncate">
              {user.displayName || user.username}
            </span>
            {showAdminControls ? (
              <span className="px-1.5 py-0.5 text-[9px] font-black bg-purple-500/20 text-purple-300 border border-purple-500/40 rounded">
                ADMIN
              </span>
            ) : user.isGuest ? (
              <span className="px-1.5 py-0.5 text-[9px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded">
                Guest
              </span>
            ) : null}
          </div>
          <div className="flex items-center gap-1 text-[11px] text-amber-400 font-medium">
            <span>{user.levelName}</span>
            <span className="text-slate-500">•</span>
            <span className="text-slate-400">Lvl {user.level}</span>
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-1.5">
        {/* Dedicated Admin Dashboard Button — Visible ONLY to Admin */}
        {showAdminControls && onOpenAdminSetup && (
          <button
            onClick={() => onOpenAdminSetup('users')}
            className="px-2.5 py-2 rounded-xl bg-gradient-to-r from-purple-900/80 to-indigo-900/80 hover:from-purple-800 hover:to-indigo-800 border border-purple-500/50 text-purple-200 transition active:scale-95 shadow-sm flex items-center gap-1.5 cursor-pointer"
            title="Open Admin Management Page"
          >
            <ShieldCheck className="w-4 h-4 text-amber-400" />
            <span className="text-[11px] font-black tracking-tight">Admin</span>
          </button>
        )}

        {/* Lucky Wheel 24h Spin Trigger */}
        {onOpenWheel && (
          <button
            onClick={onOpenWheel}
            className={`relative p-2 rounded-xl transition active:scale-95 border cursor-pointer ${
              canSpinWheel
                ? 'bg-gradient-to-r from-amber-500/25 to-emerald-500/20 border-amber-400/70 text-amber-300 shadow-md shadow-amber-500/20'
                : 'bg-slate-800/60 border-slate-700/60 text-slate-400'
            }`}
            title="Lucky Wheel (گردونه شانس)"
          >
            <span className="text-sm inline-block animate-spin-slow">🎡</span>
            {canSpinWheel && (
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-[#0B0E17]" />
            )}
          </button>
        )}

        {/* Daily Reward indicator */}
        <button
          onClick={onOpenDaily}
          className={`relative p-2 rounded-xl transition active:scale-95 border cursor-pointer ${
            user.canClaimDaily
              ? 'bg-gradient-to-r from-amber-500/20 to-orange-500/20 border-amber-500/60 text-amber-300 shadow-md shadow-amber-500/20 animate-pulse'
              : 'bg-slate-800/60 border-slate-700/60 text-slate-400'
          }`}
          title="Daily Rewards"
        >
          <span className="text-sm">📅</span>
          {user.canClaimDaily && (
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-orange-500 rounded-full border-2 border-[#0B0E17]" />
          )}
        </button>

        {/* Boost modal trigger */}
        <button
          onClick={onOpenBoost}
          className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/60 text-amber-400 transition active:scale-95 flex items-center gap-1 cursor-pointer"
          title="Boosters"
        >
          <Zap className="w-4 h-4 fill-amber-400" />
        </button>

        {/* Sound Toggle */}
        <button
          onClick={onToggleSound}
          className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/60 text-slate-300 transition active:scale-95"
          title={isMuted ? 'Unmute Sound' : 'Mute Sound'}
        >
          {isMuted ? <VolumeX className="w-4 h-4 text-slate-500" /> : <Volume2 className="w-4 h-4 text-amber-400" />}
        </button>

        {/* Settings button */}
        <button
          onClick={onOpenSettings}
          className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/60 text-slate-300 transition active:scale-95"
          title="Game Settings"
        >
          <Settings className="w-4 h-4 text-slate-300" />
        </button>
      </div>
    </header>
  );
};
