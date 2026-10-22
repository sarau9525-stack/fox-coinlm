import React, { useState } from 'react';
import { User, Lock, Mail, ArrowRight, Play, Sparkles } from 'lucide-react';
import { api } from '../../utils/api.js';
import { sound } from '../../utils/audio.js';
import { foxMascotImg, foxGoldCoinImg } from '../../assets/assets.js';
import { UserGameState } from '../../types/game.js';

interface AuthModalProps {
  onSuccess: (user: UserGameState) => void;
  initialRefCode?: string;
}

export const AuthModal: React.FC<AuthModalProps> = ({ onSuccess, initialRefCode }) => {
  const [tab, setTab] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [refCode, setRefCode] = useState(initialRefCode || '');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleGuestPlay = async () => {
    try {
      setLoading(true);
      setError(null);
      sound.playCoin();
      const res = await api.authGuest(undefined, refCode || undefined);
      onSuccess(res.user);
    } catch (err: any) {
      setError(err.message || 'Failed to start guest session');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    try {
      setLoading(true);
      setError(null);
      sound.playCoin();
      if (tab === 'login') {
        const res = await api.authLogin(email, password);
        onSuccess(res.user);
      } else {
        const res = await api.authRegister(email, password, username || undefined, refCode || undefined);
        onSuccess(res.user);
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0B0E17]/95 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-sm bg-gradient-to-b from-[#151c2f] via-[#101626] to-[#0b0e17] border border-amber-500/40 rounded-3xl p-6 shadow-2xl text-white relative">
        {/* Fox mascot badge */}
        <div className="w-20 h-20 mx-auto -mt-2 mb-3 rounded-2xl bg-gradient-to-tr from-amber-500 via-orange-500 to-amber-300 p-0.5 shadow-xl shadow-orange-500/30">
          <div className="w-full h-full bg-[#111827] rounded-[14px] overflow-hidden">
            <img src={foxMascotImg} alt="Fox Mascot" className="w-full h-full object-cover" />
          </div>
        </div>

        <div className="text-center mb-4">
          <h2 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-amber-400 to-orange-400">
            Fox Coin
          </h2>
          <p className="text-xs text-slate-300 mt-0.5">
            The Next-Generation Tap-to-Earn Web & Telegram Game
          </p>
        </div>

        {/* 1-Click Guest Play Button */}
        <button
          type="button"
          onClick={handleGuestPlay}
          disabled={loading}
          className="w-full py-3 px-4 mb-4 bg-gradient-to-r from-amber-400 via-orange-500 to-amber-500 hover:from-amber-300 hover:to-orange-400 text-slate-950 font-black text-sm rounded-2xl shadow-xl shadow-amber-500/25 transition active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
        >
          <Play className="w-4 h-4 fill-slate-950" />
          <span>{loading ? 'Starting...' : 'Play Now as Guest (Instant)'}</span>
        </button>

        <div className="relative flex py-2 items-center">
          <div className="flex-grow border-t border-slate-800" />
          <span className="flex-shrink mx-3 text-[10px] text-slate-500 uppercase tracking-widest font-bold">
            or sync with account
          </span>
          <div className="flex-grow border-t border-slate-800" />
        </div>

        {/* Tabs: Login / Register */}
        <div className="grid grid-cols-2 gap-1 bg-slate-900/90 p-1 rounded-xl border border-slate-800 my-3 text-xs font-bold">
          <button
            type="button"
            onClick={() => { setTab('login'); setError(null); }}
            className={`py-1.5 rounded-lg transition ${
              tab === 'login' ? 'bg-amber-500 text-slate-950 shadow' : 'text-slate-400'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => { setTab('register'); setError(null); }}
            className={`py-1.5 rounded-lg transition ${
              tab === 'register' ? 'bg-amber-500 text-slate-950 shadow' : 'text-slate-400'
            }`}
          >
            Create Account
          </button>
        </div>

        {error && (
          <div className="p-2.5 mb-3 rounded-xl bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs font-medium text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-2.5">
          {tab === 'register' && (
            <div>
              <input
                type="text"
                placeholder="Display Name (optional)"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
              />
            </div>
          )}

          <div>
            <input
              type="email"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
            />
          </div>

          <div>
            <input
              type="password"
              placeholder="Password (min 6 characters)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
            />
          </div>

          {tab === 'register' && (
            <div>
              <input
                type="text"
                placeholder="Referral Code (optional)"
                value={refCode}
                onChange={(e) => setRefCode(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
              />
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 hover:border-amber-500/40 font-bold text-xs rounded-xl transition active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer mt-1"
          >
            <span>{loading ? 'Processing...' : tab === 'login' ? 'Sign In' : 'Register & Claim 5,000 FOX'}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </form>
      </div>
    </div>
  );
};
