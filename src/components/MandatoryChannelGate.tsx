import React, { useState } from 'react';
import {
  ExternalLink,
  CheckCircle2,
  Sparkles,
  Send,
  Gift,
  Lock,
  RefreshCw,
  AlertCircle,
  Youtube,
  Check,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { UserGameState } from '../types/game.js';
import { api } from '../utils/api.js';
import { sound } from '../utils/audio.js';
import { TelegramService } from '../utils/telegram.js';
import { foxMascotImg, foxGoldCoinImg } from '../assets/assets.js';

interface MandatoryChannelGateProps {
  user: UserGameState;
  onVerified: (updatedUser: UserGameState) => void;
  channelHandle?: string;
  youtubeUrl?: string;
}

export const MandatoryChannelGate: React.FC<MandatoryChannelGateProps> = ({
  user,
  onVerified,
  channelHandle = '@FOX_COINEX',
  youtubeUrl = 'https://www.youtube.com/@FOX-COINl',
}) => {
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [hasClickedTelegram, setHasClickedTelegram] = useState<boolean>(() => {
    return typeof window !== 'undefined' && localStorage.getItem(`fox_tg_clicked_${user.id}`) === 'true';
  });
  const [hasClickedYoutube, setHasClickedYoutube] = useState<boolean>(() => {
    return typeof window !== 'undefined' && localStorage.getItem(`fox_yt_clicked_${user.id}`) === 'true';
  });

  const cleanHandle = channelHandle.startsWith('@') ? channelHandle : `@${channelHandle}`;
  const telegramChannelUrl = 'https://t.me/FOX_COINEX';

  const handleOpenTelegram = () => {
    sound.playTap();
    TelegramService.triggerHaptic('medium');
    setHasClickedTelegram(true);
    setErrorMsg(null);
    if (typeof window !== 'undefined') {
      localStorage.setItem(`fox_tg_clicked_${user.id}`, 'true');
    }
    TelegramService.openLink(telegramChannelUrl);
  };

  const handleOpenYoutube = () => {
    sound.playTap();
    TelegramService.triggerHaptic('medium');
    setHasClickedYoutube(true);
    setErrorMsg(null);
    if (typeof window !== 'undefined') {
      localStorage.setItem(`fox_yt_clicked_${user.id}`, 'true');
    }
    TelegramService.openLink(youtubeUrl);
  };

  const handleVerify = async () => {
    if (!hasClickedTelegram || !hasClickedYoutube) {
      sound.playError();
      TelegramService.triggerNotificationHaptic('error');
      if (!hasClickedTelegram && !hasClickedYoutube) {
        setErrorMsg(
          'Please complete Step 1 (Join Telegram @FOX_COINEX) and Step 2 (Subscribe to YouTube @FOX-COINl) before verifying!'
        );
      } else if (!hasClickedTelegram) {
        setErrorMsg('Please complete Step 1: Join our Telegram channel (@FOX_COINEX) first!');
      } else {
        setErrorMsg('Please complete Step 2: Subscribe to our YouTube channel (@FOX-COINl) first!');
      }
      return;
    }

    try {
      setIsVerifying(true);
      setErrorMsg(null);
      sound.playTap();
      TelegramService.triggerHaptic('medium');

      const res = await api.verifyChannelMembership();
      if (res && res.user) {
        sound.playSuccess();
        TelegramService.triggerNotificationHaptic('success');
        confetti({
          particleCount: 70,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#F59E0B', '#10B981', '#F97316'],
        });

        const bonusText = res.bonus ? ` +${res.bonus.toLocaleString('en-US')} FOX Bonus awarded!` : '';
        setSuccessMsg(`All channels verified!${bonusText} Welcome to FOXCOIN!`);

        // Save local verification flag for the 2-channel mandatory gate
        localStorage.setItem(`fox_channels_v2_verified_${user.id}`, 'true');
        localStorage.setItem(`fox_channel_verified_${user.id}`, 'true');

        setTimeout(() => {
          onVerified(res.user);
        }, 1100);
      }
    } catch (err: any) {
      setErrorMsg(
        err.message ||
          `Please make sure you have joined ${cleanHandle} on Telegram and subscribed on YouTube before tapping Verify!`
      );
      sound.playError();
      TelegramService.triggerNotificationHaptic('error');
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in select-none">
      <div className="w-full max-w-sm bg-gradient-to-b from-[#151c2f] via-[#101626] to-[#0b0e17] border-2 border-amber-500/50 rounded-3xl p-5 shadow-2xl text-white relative overflow-hidden">
        {/* Glow backdrop */}
        <div className="absolute -right-8 -top-8 w-32 h-32 bg-amber-500/15 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -left-8 -bottom-8 w-32 h-32 bg-sky-500/15 rounded-full blur-2xl pointer-events-none" />

        {/* Mascot badge */}
        <div className="w-16 h-16 mx-auto mb-2.5 rounded-2xl bg-gradient-to-tr from-amber-500 via-orange-500 to-amber-300 p-0.5 shadow-xl shadow-orange-500/30">
          <div className="w-full h-full bg-[#111827] rounded-[14px] overflow-hidden flex items-center justify-center">
            <img src={foxMascotImg} alt="FOX" className="w-full h-full object-cover" />
          </div>
        </div>

        {/* Title */}
        <div className="text-center mb-3.5">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-black uppercase tracking-wider mb-1.5">
            <Lock className="w-3 h-3 text-amber-400" />
            <span>Mandatory Membership Gate</span>
          </div>

          <h3 className="text-lg font-black text-slate-100 leading-tight">
            Join Our Official Channels
          </h3>
          <p className="text-[11px] text-slate-300 mt-1 font-medium leading-relaxed">
            To unlock FOX mining, referral bonus trading, and USDT withdrawals, you must subscribe to both official channels below:
          </p>
        </div>

        {/* Reward Bonus Pill */}
        <div className="bg-gradient-to-r from-emerald-950/60 to-slate-900 border border-emerald-500/50 rounded-2xl p-2.5 mb-3.5 flex items-center justify-between shadow-md shadow-emerald-950/20">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <Gift className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider block">
                Verification Bounty
              </span>
              <span className="text-xs font-black text-emerald-300 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-emerald-400" />
                <span>+2,000 FOX Welcome Gift</span>
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1 text-sm font-black text-amber-400">
            <img src={foxGoldCoinImg} alt="FOX" className="w-4 h-4" />
            <span>+2,000</span>
          </div>
        </div>

        {/* Action Steps */}
        <div className="space-y-2.5 mb-3.5">
          {/* Step 1: Join Telegram Channel */}
          <button
            onClick={handleOpenTelegram}
            className={`w-full py-3 px-3.5 rounded-2xl font-black text-xs transition active:scale-95 flex items-center justify-between cursor-pointer border ${
              hasClickedTelegram
                ? 'bg-emerald-950/70 border-emerald-500/60 text-emerald-200'
                : 'bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white border-sky-400 shadow-lg shadow-sky-600/30'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <div
                className={`w-7 h-7 rounded-xl flex items-center justify-center ${
                  hasClickedTelegram ? 'bg-emerald-500/20 text-emerald-300' : 'bg-white/20 text-white'
                }`}
              >
                {hasClickedTelegram ? <Check className="w-4 h-4" /> : <Send className="w-3.5 h-3.5" />}
              </div>
              <div className="text-left">
                <div className="text-xs font-black">Step 1: Join Telegram Channel</div>
                <div className="text-[10px] opacity-80 font-semibold">t.me/FOX_COINEX (@FOX_COINEX)</div>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {hasClickedTelegram ? (
                <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Joined ✓
                </span>
              ) : (
                <ExternalLink className="w-4 h-4 opacity-80" />
              )}
            </div>
          </button>

          {/* Step 2: Subscribe to YouTube Channel */}
          <button
            onClick={handleOpenYoutube}
            className={`w-full py-3 px-3.5 rounded-2xl font-black text-xs transition active:scale-95 flex items-center justify-between cursor-pointer border ${
              hasClickedYoutube
                ? 'bg-emerald-950/70 border-emerald-500/60 text-emerald-200'
                : 'bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white border-red-400 shadow-lg shadow-red-600/30'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <div
                className={`w-7 h-7 rounded-xl flex items-center justify-center ${
                  hasClickedYoutube ? 'bg-emerald-500/20 text-emerald-300' : 'bg-white/20 text-white'
                }`}
              >
                {hasClickedYoutube ? <Check className="w-4 h-4" /> : <Youtube className="w-4 h-4" />}
              </div>
              <div className="text-left">
                <div className="text-xs font-black">Step 2: Subscribe on YouTube</div>
                <div className="text-[10px] opacity-80 font-semibold">youtube.com/@FOX-COINl</div>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {hasClickedYoutube ? (
                <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Subscribed ✓
                </span>
              ) : (
                <ExternalLink className="w-4 h-4 opacity-80" />
              )}
            </div>
          </button>

          {/* Step 3: Verify & Unlock App */}
          <button
            onClick={handleVerify}
            disabled={isVerifying}
            className={`w-full py-3.5 px-4 font-black text-xs rounded-2xl transition active:scale-95 flex items-center justify-center gap-2 cursor-pointer border disabled:opacity-50 ${
              hasClickedTelegram && hasClickedYoutube
                ? 'bg-gradient-to-r from-amber-400 via-orange-500 to-amber-500 hover:from-amber-300 hover:to-orange-400 text-slate-950 border-amber-300 shadow-xl shadow-amber-500/30'
                : 'bg-slate-800/80 hover:bg-slate-800 text-slate-300 border-slate-700'
            }`}
          >
            {isVerifying ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Verifying Channel Memberships...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>Step 3: Verify Both & Unlock App</span>
              </>
            )}
          </button>
        </div>

        {/* Feedback Messages */}
        {errorMsg && (
          <div className="p-2.5 bg-rose-500/20 border border-rose-500/40 text-rose-300 rounded-xl text-[11px] font-bold flex items-start gap-2 mb-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-2.5 bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 rounded-xl text-[11px] font-bold flex items-center gap-2 mb-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>{successMsg}</span>
          </div>
        )}

        <div className="text-center pt-1">
          <span className="text-[10px] text-slate-500 font-semibold">
            Official FOXCOIN Community • Both Channels Required
          </span>
        </div>
      </div>
    </div>
  );
};
