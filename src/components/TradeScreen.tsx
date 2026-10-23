import React, { useState, useEffect, useMemo } from 'react';
import {
  ArrowLeftRight,
  Clock,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  Wallet,
  DollarSign,
  ArrowDown,
  Sparkles,
  Users,
  ShieldCheck,
  Award,
} from 'lucide-react';
import { UserGameState, TradeOrder } from '../types/game.js';
import { sound } from '../utils/audio.js';
import { TelegramService } from '../utils/telegram.js';
import { foxGoldCoinImg } from '../assets/assets.js';
import { api } from '../utils/api.js';

interface TradeScreenProps {
  user: UserGameState;
  onTradeComplete?: (updatedUser: UserGameState) => void;
  onFriendsTab?: () => void;
}

const FOX_PRICE_USD = 0.001; // 10,000 FOX = $10.00 USD

export const TradeScreen: React.FC<TradeScreenProps> = ({
  user,
  onTradeComplete,
  onFriendsTab,
}) => {
  const [foxAmountInput, setFoxAmountInput] = useState<string>('10000');
  const [trades, setTrades] = useState<TradeOrder[]>([]);
  const [isLoadingTrades, setIsLoadingTrades] = useState<boolean>(true);

  // Modal / Step 2 Wallet State
  const [showWalletModal, setShowWalletModal] = useState<boolean>(false);
  const [selectedNetwork, setSelectedNetwork] = useState<'USDT (TRC20)' | 'USDT (TON)' | 'USDT (BEP20)'>('USDT (TRC20)');
  const [walletAddress, setWalletAddress] = useState<string>('');
  const [walletError, setWalletError] = useState<string | null>(null);
  const [isSubmittingTrade, setIsSubmittingTrade] = useState<boolean>(false);
  const [tradeSuccessMsg, setTradeSuccessMsg] = useState<string | null>(null);
  const [copiedTx, setCopiedTx] = useState<string | null>(null);

  // Countdown ticker (1-second interval)
  const [now, setNow] = useState<number>(Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch user trades on load
  useEffect(() => {
    loadTrades();
  }, [user.id]);

  const loadTrades = async () => {
    try {
      setIsLoadingTrades(true);
      const cached = localStorage.getItem(`fox_trades_${user.id}`);
      if (cached) {
        try {
          setTrades(JSON.parse(cached));
        } catch {}
      }

      const res = await api.getTrades();
      if (res && res.trades) {
        setTrades(res.trades);
        localStorage.setItem(`fox_trades_${user.id}`, JSON.stringify(res.trades));
      }
    } catch {
      // Fallback to local storage if API is warming up
    } finally {
      setIsLoadingTrades(false);
    }
  };

  // Calculate Referral Balance ONLY (as strictly requested)
  const totalReferralEarnings = user.referralEarnings || 0;
  const committedReferralFox = useMemo(() => {
    return trades
      .filter((t) => t.status !== 'cancelled')
      .reduce((sum, t) => sum + t.foxAmount, 0);
  }, [trades]);

  const availableReferralBalance = Math.max(0, totalReferralEarnings - committedReferralFox);

  // Parsed FOX & USD
  const parsedFox = useMemo(() => {
    const val = parseFloat(foxAmountInput);
    return isNaN(val) || val <= 0 ? 0 : val;
  }, [foxAmountInput]);

  const calculatedUsd = useMemo(() => {
    return (parsedFox * FOX_PRICE_USD).toFixed(2);
  }, [parsedFox]);

  const handlePercentage = (pct: number) => {
    sound.playTap();
    const amount = Math.floor(availableReferralBalance * pct);
    setFoxAmountInput(amount.toString());
  };

  const handleStartTrade = () => {
    if (parsedFox <= 0) {
      alert('Please enter a valid FOX amount to trade.');
      return;
    }

    if (availableReferralBalance <= 0) {
      alert('You have no available referral reward balance. Invite friends in the Friends tab to earn 10,000 FOX ($10 USD) per 10 invites!');
      return;
    }

    if (parsedFox > availableReferralBalance) {
      alert(
        `Insufficient referral reward balance! You can only trade FOX earned from friend invitations (Available: ${availableReferralBalance.toLocaleString('en-US')} FOX).`
      );
      return;
    }

    sound.playTap();
    TelegramService.triggerHaptic('medium');
    setShowWalletModal(true);
  };

  const handleConfirmTrade = async () => {
    const addr = walletAddress.trim();
    if (!addr) {
      setWalletError('Please enter a valid destination wallet address.');
      return;
    }

    // Network address check
    if (selectedNetwork === 'USDT (TRC20)' && (!addr.startsWith('T') || addr.length < 25)) {
      setWalletError('Tron (TRC20) wallet address must start with letter "T" and be at least 25 characters.');
      return;
    }
    if (selectedNetwork === 'USDT (BEP20)' && (!addr.startsWith('0x') || addr.length < 40)) {
      setWalletError('BNB Smart Chain (BEP20) wallet address must start with "0x" and be 42 characters.');
      return;
    }
    if (selectedNetwork === 'USDT (TON)' && addr.length < 24) {
      setWalletError('Invalid TON network wallet address.');
      return;
    }

    try {
      setIsSubmittingTrade(true);
      setWalletError(null);
      sound.playSuccess();
      TelegramService.triggerHaptic('heavy');

      const usdNum = parseFloat(calculatedUsd);
      const res = await api.createTrade({
        foxAmount: parsedFox,
        usdAmount: usdNum,
        walletAddress: addr,
        network: selectedNetwork,
      });

      if (res.user && onTradeComplete) {
        onTradeComplete(res.user);
      }

      // Add to local trades list
      const updatedList = [res.trade, ...trades];
      setTrades(updatedList);
      localStorage.setItem(`fox_trades_${user.id}`, JSON.stringify(updatedList));

      setShowWalletModal(false);
      setWalletAddress('');
      setTradeSuccessMsg(
        `Trade confirmed! 10-day claim countdown timer has started for $${usdNum.toFixed(2)} USDT payout.`
      );
      setTimeout(() => setTradeSuccessMsg(null), 6000);
    } catch (err: any) {
      setWalletError(err.message || 'Failed to submit trade order. Please verify your referral balance.');
    } finally {
      setIsSubmittingTrade(false);
    }
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedTx(id);
    sound.playTap();
    setTimeout(() => setCopiedTx(null), 2000);
  };

  // Helper for 10-day countdown
  const formatCountdown = (payoutDeadline: number) => {
    const diff = Math.max(0, payoutDeadline - now);
    if (diff <= 0) {
      return {
        expired: true,
        text: '10-Day Window Completed (Ready for Payout)',
        progressPct: 100,
      };
    }

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    return {
      expired: false,
      days,
      hours,
      minutes,
      seconds,
      text: `${days}d ${hours.toString().padStart(2, '0')}h ${minutes.toString().padStart(2, '0')}m ${seconds.toString().padStart(2, '0')}s`,
      progressPct: Math.max(0, Math.min(100, 100 - (diff / (10 * 24 * 60 * 60 * 1000)) * 100)),
    };
  };

  return (
    <div className="w-full max-w-md mx-auto px-4 pb-24 pt-2 text-white">
      {/* REFERRAL REWARD EXCLUSIVE BALANCE HERO CARD */}
      <div className="relative w-full bg-gradient-to-br from-amber-500/20 via-slate-900 to-[#101726] border-2 border-emerald-500/60 rounded-3xl p-5 mb-5 shadow-2xl overflow-hidden">
        <div className="absolute -right-6 -top-6 w-32 h-32 bg-emerald-500/20 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -left-6 -bottom-6 w-32 h-32 bg-amber-500/15 rounded-full blur-2xl pointer-events-none" />

        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 rounded-full flex items-center gap-1 shadow-sm">
              <Users className="w-3 h-3 text-emerald-400" />
              <span>Invite Rewards Only</span>
            </span>
          </div>

          <div className="flex items-center gap-1 bg-slate-900/90 px-2.5 py-1 rounded-xl border border-slate-700">
            <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-xs font-black text-emerald-400">10,000 FOX = $10 USD</span>
          </div>
        </div>

        <span className="text-[11px] uppercase tracking-wider text-slate-400 font-bold block mt-1">
          Available Referral Bonus Balance
        </span>

        <div className="flex items-baseline gap-2 mt-1">
          <div className="text-3xl font-black text-amber-300 tracking-tight flex items-center gap-2">
            <img src={foxGoldCoinImg} alt="FOX" className="w-7 h-7" />
            <span>{availableReferralBalance.toLocaleString('en-US')}</span>
          </div>
          <span className="text-xs font-bold text-slate-400">FOX</span>
        </div>

        <p className="text-[11px] text-slate-300 mt-2 font-medium leading-relaxed">
          The trade section is strictly designated for exchanging <strong className="text-emerald-400 font-extrabold">friend invitation bonuses</strong> to real USDT.
        </p>

        {/* Stats Sub-row */}
        <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-slate-800/80 text-[11px]">
          <div className="bg-slate-950/70 p-2 rounded-xl border border-slate-800">
            <span className="text-slate-400 text-[10px] block">Total Invite Earnings:</span>
            <span className="font-extrabold text-slate-200 mt-0.5 block">
              {totalReferralEarnings.toLocaleString('en-US')} FOX
            </span>
          </div>
          <div className="bg-slate-950/70 p-2 rounded-xl border border-slate-800">
            <span className="text-slate-400 text-[10px] block">Committed to Trades:</span>
            <span className="font-extrabold text-amber-400 mt-0.5 block">
              {committedReferralFox.toLocaleString('en-US')} FOX
            </span>
          </div>
        </div>

        {availableReferralBalance <= 0 && onFriendsTab && (
          <button
            onClick={onFriendsTab}
            className="w-full mt-3 py-2.5 px-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-xs rounded-xl shadow-md transition active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Users className="w-3.5 h-3.5" />
            <span>Invite Friends to Earn 10,000 FOX ($10 USD)</span>
          </button>
        )}
      </div>

      {/* SWAP TERMINAL: FOX REFERRAL TO USDT ONLY (NO CHART) */}
      <div className="bg-gradient-to-b from-slate-900 via-slate-900 to-[#121824] border border-amber-500/40 rounded-3xl p-4 mb-5 shadow-2xl relative">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center">
              <ArrowLeftRight className="w-4 h-4 text-amber-400" />
            </div>
            <div>
              <h3 className="font-black text-sm text-slate-100">
                Convert FOX to USD
              </h3>
              <span className="text-[10px] text-slate-400">Referral Reward Cashout</span>
            </div>
          </div>
          <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-full flex items-center gap-1">
            <Clock className="w-3 h-3 text-amber-400" />
            <span>10-Day Payout Guarantee</span>
          </span>
        </div>

        {/* FROM: REFERRAL FOX */}
        <div className="bg-slate-950/90 border border-slate-800 rounded-2xl p-3 mb-2 focus-within:border-amber-500/60 transition">
          <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
            <span>You Convert (Referral FOX):</span>
            <div className="flex items-center gap-1">
              <span>Available:</span>
              <strong className="text-amber-300 font-extrabold">{availableReferralBalance.toLocaleString('en-US')}</strong>
              <span>FOX</span>
            </div>
          </div>

          <div className="flex items-center justify-between gap-2">
            <input
              type="number"
              value={foxAmountInput}
              onChange={(e) => setFoxAmountInput(e.target.value)}
              placeholder="10000"
              className="w-full bg-transparent text-xl font-black text-slate-100 focus:outline-none placeholder-slate-600"
            />
            <div className="flex items-center gap-1.5 bg-slate-800 px-2.5 py-1.5 rounded-xl border border-slate-700 shrink-0">
              <img src={foxGoldCoinImg} alt="FOX" className="w-4 h-4" />
              <span className="font-extrabold text-xs text-amber-300">FOX</span>
            </div>
          </div>

          {/* Quick Percent Buttons based strictly on available referral balance */}
          <div className="grid grid-cols-4 gap-1.5 mt-2.5">
            {[0.25, 0.5, 0.75, 1.0].map((pct) => (
              <button
                key={pct}
                onClick={() => handlePercentage(pct)}
                className="py-1 rounded-lg bg-slate-850 hover:bg-slate-800 text-[10px] font-bold text-slate-300 hover:text-white border border-slate-700/60 transition cursor-pointer"
              >
                {pct === 1.0 ? 'MAX' : `${pct * 100}%`}
              </button>
            ))}
          </div>
        </div>

        {/* Divider icon */}
        <div className="flex justify-center -my-2 relative z-10">
          <div className="w-8 h-8 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center shadow-lg shadow-amber-500/30 border-2 border-[#121824]">
            <ArrowDown className="w-4 h-4" />
          </div>
        </div>

        {/* TO: USDT */}
        <div className="bg-slate-950/90 border border-slate-800 rounded-2xl p-3 mt-2">
          <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
            <span>You Receive (USDT):</span>
            <span className="text-emerald-400 font-bold">Official USDT Settlement</span>
          </div>

          <div className="flex items-center justify-between gap-2">
            <div className="text-2xl font-black text-emerald-400">
              ${calculatedUsd}
            </div>
            <div className="flex items-center gap-1.5 bg-emerald-950/60 border border-emerald-500/40 px-2.5 py-1.5 rounded-xl shrink-0">
              <DollarSign className="w-4 h-4 text-emerald-400" />
              <span className="font-extrabold text-xs text-emerald-300">USDT</span>
            </div>
          </div>

          <div className="text-[10px] text-slate-400 mt-2 flex items-center justify-between pt-2 border-t border-slate-800/80">
            <span>Fixed Exchange Rate:</span>
            <span className="font-bold text-slate-200">10,000 FOX = $10.00 USD (1 FOX = $0.001)</span>
          </div>
        </div>

        {/* Action Button */}
        <button
          onClick={handleStartTrade}
          disabled={availableReferralBalance <= 0}
          className={`w-full mt-4 py-3.5 px-4 font-black text-sm rounded-2xl shadow-xl transition active:scale-95 flex items-center justify-center gap-2 cursor-pointer border ${
            availableReferralBalance > 0
              ? 'bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-400 hover:to-teal-400 text-slate-950 border-emerald-300 shadow-emerald-500/30'
              : 'bg-slate-800 border-slate-700 text-slate-500 cursor-not-allowed'
          }`}
        >
          <ArrowLeftRight className="w-4 h-4 text-slate-950" />
          <span>
            {availableReferralBalance > 0
              ? `Convert to Dollar ($${calculatedUsd} USDT)`
              : 'Invite Friends to Unlock Trade'}
          </span>
        </button>

        {tradeSuccessMsg && (
          <div className="mt-3 p-3 bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 rounded-xl text-xs text-center font-bold flex items-center justify-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{tradeSuccessMsg}</span>
          </div>
        )}
      </div>

      {/* ACTIVE 10-DAY PAYOUT ORDERS & TIMERS */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3 px-1">
          <div className="flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-amber-400" />
            <h4 className="text-xs uppercase font-extrabold text-slate-300 tracking-wider">
              10-Day Payout Orders & Timers
            </h4>
          </div>
          <span className="text-[11px] text-slate-400 font-bold">
            {trades.length} {trades.length === 1 ? 'Order' : 'Orders'}
          </span>
        </div>

        {trades.length === 0 ? (
          <div className="p-6 bg-slate-900/60 border border-slate-800 rounded-2xl text-center">
            <div className="w-12 h-12 mx-auto mb-2 rounded-2xl bg-slate-800/80 flex items-center justify-center text-slate-500">
              <Clock className="w-6 h-6" />
            </div>
            <h5 className="font-bold text-sm text-slate-300">No Orders Placed Yet</h5>
            <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
              Convert your referral reward FOX above to activate your 10-day payout timer directly to your USDT wallet.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {trades.map((tr) => {
              const countdown = formatCountdown(tr.payoutDeadline);

              return (
                <div
                  key={tr.id}
                  className="bg-slate-900 border border-amber-500/30 rounded-2xl p-4 shadow-lg relative overflow-hidden"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-base font-black text-emerald-400">
                          ${tr.usdAmount.toFixed(2)} USDT
                        </span>
                        <span className="text-[10px] text-slate-400">
                          ({tr.foxAmount.toLocaleString('en-US')} FOX)
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1">
                        <span className="font-semibold text-slate-300">{tr.network}</span>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="px-2 py-0.5 text-[10px] font-black rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
                        <span>In Payout Queue</span>
                      </span>
                    </div>
                  </div>

                  {/* 10-DAY COUNTDOWN BANNER */}
                  <div className="bg-slate-950/90 border border-slate-800 rounded-xl p-3 my-2.5">
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="text-slate-400 font-bold flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-amber-400" />
                        <span>10-Day Payout Countdown:</span>
                      </span>
                      <span className="font-black text-amber-400 tracking-wider font-mono">
                        {countdown.text}
                      </span>
                    </div>

                    {/* Progress bar for 10-day period */}
                    <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden border border-slate-700">
                      <div
                        className="bg-gradient-to-r from-amber-500 to-emerald-400 h-full rounded-full transition-all duration-1000"
                        style={{ width: `${countdown.progressPct}%` }}
                      />
                    </div>
                  </div>

                  {/* Wallet address and Tx preview */}
                  <div className="space-y-1 text-[11px] text-slate-400">
                    <div className="flex items-center justify-between">
                      <span>Destination Wallet:</span>
                      <div className="flex items-center gap-1 text-slate-200 font-mono">
                        <span>
                          {tr.walletAddress.slice(0, 8)}...{tr.walletAddress.slice(-6)}
                        </span>
                        <button
                          onClick={() => handleCopy(tr.walletAddress, `w_${tr.id}`)}
                          className="hover:text-amber-400 transition"
                          title="Copy Wallet Address"
                        >
                          {copiedTx === `w_${tr.id}` ? (
                            <Check className="w-3 h-3 text-emerald-400" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <span>Network Tx Hash:</span>
                      <div className="flex items-center gap-1 text-slate-400 font-mono text-[10px]">
                        <span>{tr.txHash.slice(0, 10)}...</span>
                        <button
                          onClick={() => handleCopy(tr.txHash, `tx_${tr.id}`)}
                          className="hover:text-amber-400 transition"
                          title="Copy Transaction Hash"
                        >
                          {copiedTx === `tx_${tr.id}` ? (
                            <Check className="w-3 h-3 text-emerald-400" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* STEP 2 MODAL: WALLET ADDRESS INPUT */}
      {showWalletModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in select-none">
          <div className="bg-[#111827] border border-amber-500/50 rounded-3xl p-5 max-w-sm w-full shadow-2xl relative">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center">
                  <Wallet className="w-4 h-4 text-amber-400" />
                </div>
                <div>
                  <h4 className="font-black text-sm text-slate-100">Enter Wallet Address</h4>
                  <span className="text-[10px] text-slate-400">Final Step: Receive USDT</span>
                </div>
              </div>
              <button
                onClick={() => setShowWalletModal(false)}
                className="w-7 h-7 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Summary preview */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 mb-3 text-xs">
              <div className="flex items-center justify-between mb-1 text-slate-400">
                <span>Referral FOX Deducted:</span>
                <span className="text-amber-300 font-black">{parsedFox.toLocaleString('en-US')} FOX</span>
              </div>
              <div className="flex items-center justify-between text-slate-400">
                <span>USDT Cash Settlement:</span>
                <span className="text-emerald-400 font-black text-sm">${calculatedUsd} USDT</span>
              </div>
            </div>

            {/* Network selector */}
            <div className="mb-3">
              <label className="text-[11px] font-bold text-slate-300 block mb-1.5">
                Select USDT Network:
              </label>
              <div className="grid grid-cols-3 gap-1">
                {(['USDT (TRC20)', 'USDT (TON)', 'USDT (BEP20)'] as const).map((net) => (
                  <button
                    key={net}
                    type="button"
                    onClick={() => setSelectedNetwork(net)}
                    className={`py-2 px-1 text-[10px] rounded-xl font-bold border transition text-center cursor-pointer ${
                      selectedNetwork === net
                        ? 'bg-amber-500/20 border-amber-500 text-amber-300 font-black'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {net.replace('USDT ', '')}
                  </button>
                ))}
              </div>
            </div>

            {/* Wallet Address Input with Paste */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[11px] font-bold text-slate-300">
                  {selectedNetwork} Address:
                </label>
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      const text = await navigator.clipboard.readText();
                      if (text) setWalletAddress(text.trim());
                    } catch {}
                  }}
                  className="text-[10px] text-amber-400 font-bold hover:underline cursor-pointer"
                >
                  Paste
                </button>
              </div>

              <input
                type="text"
                value={walletAddress}
                onChange={(e) => {
                  setWalletAddress(e.target.value);
                  setWalletError(null);
                }}
                placeholder={
                  selectedNetwork === 'USDT (TRC20)'
                    ? 'T...'
                    : selectedNetwork === 'USDT (BEP20)'
                    ? '0x...'
                    : 'EQ... or UQ...'
                }
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-amber-500 font-mono"
              />

              {walletError && (
                <div className="mt-1.5 text-[11px] text-rose-400 font-medium flex items-center gap-1">
                  <AlertCircle className="w-3 h-3 shrink-0" />
                  <span>{walletError}</span>
                </div>
              )}
            </div>

            {/* 10-day notice */}
            <div className="p-2.5 bg-amber-500/10 border border-amber-500/30 rounded-xl text-[11px] text-amber-300/90 mb-4 flex items-start gap-2">
              <Clock className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <span>
                After confirmation, your <strong>10-day claim countdown timer</strong> will activate and <strong>${calculatedUsd} USDT</strong> will be disbursed to your wallet upon completion.
              </span>
            </div>

            {/* Action buttons */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setShowWalletModal(false)}
                className="py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmTrade}
                disabled={isSubmittingTrade}
                className="py-2.5 px-3 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 text-xs font-black rounded-xl transition shadow-lg shadow-emerald-500/20 disabled:opacity-50 cursor-pointer"
              >
                {isSubmittingTrade ? 'Submitting...' : 'Confirm & Start Timer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
