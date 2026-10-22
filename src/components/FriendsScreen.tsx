import React, { useState } from 'react';
import {
  Users,
  Copy,
  Check,
  Send,
  Gift,
  Sparkles,
  DollarSign,
  Award,
  ArrowRight,
  Lock,
  CheckCircle2,
  Trophy,
  Target,
} from 'lucide-react';
import { UserGameState } from '../types/game.js';
import { TelegramService } from '../utils/telegram.js';
import { sound } from '../utils/audio.js';
import { foxGoldCoinImg } from '../assets/assets.js';
import { api } from '../utils/api.js';

interface FriendsScreenProps {
  user: UserGameState;
  botUsername?: string;
  onTradeTab?: () => void;
}

interface MilestoneTier {
  tier: number;
  title: string;
  target: number;
  foxReward: number;
  usdValue: number;
  badgeText: string;
  description: string;
}

const MILESTONE_TIERS: MilestoneTier[] = [
  {
    tier: 1,
    title: 'First Invite Starter',
    target: 1,
    foxReward: 5000,
    usdValue: 5,
    badgeText: 'Tier 1 · Starter',
    description: 'Invite your very first friend to unlock starter referral bonus',
  },
  {
    tier: 2,
    title: 'Squad Builder',
    target: 5,
    foxReward: 25000,
    usdValue: 25,
    badgeText: 'Tier 2 · Squad',
    description: 'Build a 5-friend crew and stack 25,000 FOX in invite rewards',
  },
  {
    tier: 3,
    title: 'Bronze Ambassador',
    target: 10,
    foxReward: 10000,
    usdValue: 10,
    badgeText: 'Tier 3 · $10 Cash Bounty',
    description: 'Unlocks +10,000 FOX ($10 USD) direct claimable milestone pack',
  },
  {
    tier: 4,
    title: 'Silver Partner',
    target: 20,
    foxReward: 20000,
    usdValue: 20,
    badgeText: 'Tier 4 · $20 Cash Bounty',
    description: '2x 10-Friend Milestone Packs (+20,000 FOX / $20 USD total)',
  },
  {
    tier: 5,
    title: 'Gold Syndicate',
    target: 50,
    foxReward: 50000,
    usdValue: 50,
    badgeText: 'Tier 5 · $50 Cash Bounty',
    description: '5x 10-Friend Milestone Packs (+50,000 FOX / $50 USD total)',
  },
  {
    tier: 6,
    title: 'Diamond Whale',
    target: 100,
    foxReward: 100000,
    usdValue: 100,
    badgeText: 'Tier 6 · $100 Cash Bounty',
    description: '10x 10-Friend Milestone Packs (+100,000 FOX / $100 USD total)',
  },
];

export const FriendsScreen: React.FC<FriendsScreenProps> = ({
  user,
  botUsername = 'FOXCOINBot',
  onTradeTab,
}) => {
  const [copied, setCopied] = useState<boolean>(false);
  const [isClaiming, setIsClaiming] = useState<boolean>(false);
  const [claimSuccess, setClaimSuccess] = useState<string | null>(null);

  // Milestone calculations: 10 friends = 10,000 FOX ($10 USD)
  const currentCount = user.referralCount || 0;
  const milestonesAchieved = Math.floor(currentCount / 10);
  const claimedCount = user.claimedMilestones || 0;
  const unclaimedMilestones = Math.max(0, milestonesAchieved - claimedCount);
  const friendsProgress = currentCount % 10;
  const progressPercent = Math.min(100, (friendsProgress / 10) * 100);

  // Determine active / next tier in the milestone roadmap
  const nextTierIndex = MILESTONE_TIERS.findIndex((t) => currentCount < t.target);
  const activeTier: MilestoneTier =
    nextTierIndex !== -1
      ? MILESTONE_TIERS[nextTierIndex]
      : {
          tier: Math.floor(currentCount / 10) + 1,
          title: `Elite Legend Tier ${Math.floor(currentCount / 10) + 1}`,
          target: (Math.floor(currentCount / 10) + 1) * 10,
          foxReward: ((Math.floor(currentCount / 10) + 1) * 10000),
          usdValue: (Math.floor(currentCount / 10) + 1) * 10,
          badgeText: 'Legendary · Next 10 Pack',
          description: 'Keep inviting friends to unlock every 10-friend $10 USD bounty',
        };

  const prevTierTarget =
    nextTierIndex > 0
      ? MILESTONE_TIERS[nextTierIndex - 1].target
      : nextTierIndex === 0
      ? 0
      : Math.floor(currentCount / 10) * 10;

  const referralsNeededForNextTier = Math.max(0, activeTier.target - currentCount);
  const currentTierSpan = Math.max(1, activeTier.target - prevTierTarget);
  const currentTierProgressCount = Math.max(0, currentCount - prevTierTarget);
  const nextTierProgressPercent = Math.min(
    100,
    Math.round((currentTierProgressCount / currentTierSpan) * 100)
  );
  const overallMilestonePercent = Math.min(
    100,
    Math.round((currentCount / activeTier.target) * 100)
  );

  // Generate deep link and web link
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://foxcoin.pages.dev';
  const cleanBot = botUsername.replace('@', '');
  const tgDeepLink = `https://t.me/${cleanBot}?start=ref_${user.referralCode}`;
  const webLink = `${origin}?ref=${user.referralCode}`;

  const shareText = `🦊 Join FOXCOIN with me! Tap to earn FOX, trade for real USDT on the exchange, and get a +5,000 FOX starter gift! 💰🔥`;

  const handleCopyLink = () => {
    const linkToCopy = user.isTelegram ? tgDeepLink : webLink;
    navigator.clipboard.writeText(linkToCopy);
    setCopied(true);
    sound.playCoin();
    TelegramService.triggerHaptic('medium');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShareTelegram = () => {
    sound.playCoin();
    TelegramService.triggerHaptic('medium');
    const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(tgDeepLink)}&text=${encodeURIComponent(shareText)}`;
    TelegramService.openLink(shareUrl);
  };

  const handleClaimMilestone = async () => {
    if (unclaimedMilestones <= 0 || isClaiming) return;
    try {
      setIsClaiming(true);
      sound.playSuccess();
      TelegramService.triggerHaptic('heavy');
      await api.claimMilestone();
      setClaimSuccess(
        `Congratulations! Claimed ${(unclaimedMilestones * 10000).toLocaleString()} FOXCOIN ($${unclaimedMilestones * 10} USD)!`
      );
      setTimeout(() => setClaimSuccess(null), 4000);
    } catch (err: any) {
      console.error('Milestone claim error:', err);
    } finally {
      setIsClaiming(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto px-4 pb-24 pt-2 text-white">
      {/* NEXT MILESTONE VISUAL PROGRESS TRACKER */}
      <div className="relative w-full bg-slate-900/95 border border-amber-500/40 rounded-3xl p-4 mb-4 shadow-xl overflow-hidden">
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center shrink-0">
              <Target className="w-4 h-4 text-amber-400" />
            </div>
            <div>
              <div className="text-[11px] font-semibold text-amber-400 tracking-wide">
                Next Milestone · {activeTier.badgeText}
              </div>
              <h2 className="text-base font-black text-slate-100 leading-tight">
                {activeTier.title} ({activeTier.target} Friends)
              </h2>
            </div>
          </div>

          <div className="text-right shrink-0">
            <div className="flex items-center justify-end gap-1 text-sm font-black text-emerald-400 tabular-nums">
              <img src={foxGoldCoinImg} alt="FOX" className="w-4 h-4" />
              <span>+{activeTier.foxReward.toLocaleString()} FOX</span>
            </div>
            <div className="text-[11px] font-bold text-slate-400 tabular-nums">
              Worth ${activeTier.usdValue}.00 USD
            </div>
          </div>
        </div>

        {/* Visual Progress Bar with Percentage & Remaining Count */}
        <div className="bg-slate-950/90 border border-slate-800 rounded-2xl p-3">
          <div className="flex items-center justify-between text-xs mb-2">
            <span className="font-bold text-slate-300">
              {referralsNeededForNextTier === 0
                ? 'Milestone unlocked!'
                : `${referralsNeededForNextTier} more ${
                    referralsNeededForNextTier === 1 ? 'referral' : 'referrals'
                  } needed`}
            </span>
            <span className="font-mono font-black text-amber-400 tabular-nums">
              {currentCount} / {activeTier.target} ({overallMilestonePercent}%)
            </span>
          </div>

          {/* Segmented Visual Bar */}
          <div className="relative w-full bg-slate-800/90 rounded-full h-3.5 overflow-hidden p-0.5 border border-slate-700/80">
            <div
              className="bg-gradient-to-r from-amber-500 via-yellow-400 to-emerald-400 h-full rounded-full transition-all duration-500 shadow-sm shadow-amber-500/40"
              style={{ width: `${ Math.max(overallMilestonePercent, currentCount > 0 ? 6 : 0) }%` }}
            />
          </div>

          {/* Tier Checkpoint Stepper */}
          <div className="grid grid-cols-6 gap-1 mt-3 pt-2 border-t border-slate-800/80">
            {MILESTONE_TIERS.map((tierItem) => {
              const reached = currentCount >= tierItem.target;
              const isCurrentTarget = activeTier.target === tierItem.target;
              return (
                <div
                  key={tierItem.tier}
                  className={`flex flex-col items-center py-1 px-0.5 rounded-lg transition ${
                    reached
                      ? 'bg-emerald-500/15 text-emerald-300'
                      : isCurrentTarget
                      ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                      : 'text-slate-500'
                  }`}
                >
                  <div className="flex items-center gap-0.5 text-[10px] font-black tabular-nums">
                    {reached ? (
                      <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                    ) : (
                      <Users className="w-2.5 h-2.5 shrink-0" />
                    )}
                    <span>{tierItem.target}</span>
                  </div>
                  <span className="text-[9px] font-bold tabular-nums opacity-90">
                    +{tierItem.foxReward >= 1000 ? `${tierItem.foxReward / 1000}K` : tierItem.foxReward}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 10 Friends = 10,000 FOXCOIN ($10 USD) REPEATABLE BOUNTY BANNER */}
      <div className="relative w-full bg-gradient-to-br from-amber-500/20 via-emerald-950/40 to-slate-900 border border-emerald-500/50 rounded-3xl p-4 mb-4 shadow-xl overflow-hidden">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 text-xs font-bold text-emerald-300">
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            <span>Repeatable 10-Friend Cash Bounty</span>
          </div>
          <div className="flex items-center gap-1 bg-slate-900/80 px-2 py-0.5 rounded-lg border border-slate-700">
            <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-xs font-black text-emerald-400 tabular-nums">10,000 FOX = $10</span>
          </div>
        </div>

        <h3 className="text-lg font-black text-slate-100 leading-tight">
          Earn <span className="text-emerald-400">10,000 FOXCOIN</span> for every{' '}
          <span className="text-amber-400">10 Friends Invited</span>
        </h3>
        <p className="text-xs text-slate-300 mt-1">
          Worth <strong className="text-emerald-400 font-bold">$10.00 USD cash value</strong>, withdrawable directly in the Trade section to your USDT wallet.
        </p>

        {/* Progress Bar towards next 10 friends */}
        <div className="mt-3 bg-slate-900/90 border border-slate-700/80 rounded-2xl p-3">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="text-slate-300 font-bold flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-amber-400" />
              <span>Current 10-Friend Pack Cycle:</span>
            </span>
            <span className="font-mono font-black text-amber-400 tabular-nums">
              {friendsProgress} / 10 Friends ({Math.round(progressPercent)}%)
            </span>
          </div>

          <div className="w-full bg-slate-800 rounded-full h-2.5 overflow-hidden p-0.5 border border-slate-700">
            <div
              className="bg-gradient-to-r from-amber-500 to-emerald-400 h-full rounded-full transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          <div className="flex items-center justify-between mt-2 text-[11px] text-slate-400">
            <span>
              {10 - friendsProgress === 0
                ? 'Milestone Achieved! Ready to Claim.'
                : `${10 - friendsProgress} more ${
                    10 - friendsProgress === 1 ? 'referral' : 'referrals'
                  } to unlock next +10,000 FOX ($10)`}
            </span>
            <span className="font-bold text-slate-200 tabular-nums">
              {claimedCount} Claimed
            </span>
          </div>
        </div>

        {/* Claim button if unlocked */}
        {unclaimedMilestones > 0 && (
          <div className="mt-3">
            <button
              onClick={handleClaimMilestone}
              disabled={isClaiming}
              className="w-full py-3 px-4 bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-sm rounded-2xl shadow-xl shadow-emerald-500/30 transition active:scale-95 flex items-center justify-center gap-2 cursor-pointer border border-emerald-300"
            >
              <Award className="w-5 h-5 text-slate-950" />
              <span>
                {isClaiming
                  ? 'Claiming Bounty...'
                  : `Claim ${(unclaimedMilestones * 10000).toLocaleString()} FOXCOIN ($${unclaimedMilestones * 10} USD)`}
              </span>
            </button>
          </div>
        )}

        {claimSuccess && (
          <div className="mt-2 p-2 bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 rounded-xl text-xs text-center font-bold">
            {claimSuccess}
          </div>
        )}

        {/* Quick link to Trade screen */}
        {onTradeTab && (
          <button
            onClick={onTradeTab}
            className="w-full mt-3 py-2 px-3 bg-slate-800/80 hover:bg-slate-750 border border-slate-700/80 rounded-xl text-[11px] text-emerald-300 font-bold flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer"
          >
            <span>Convert Referral Earnings to USD on Exchange</span>
            <ArrowRight className="w-3.5 h-3.5 text-emerald-400" />
          </button>
        )}
      </div>

      {/* Hero Stats Card */}
      <div className="w-full bg-slate-900/90 border border-slate-800 rounded-3xl p-3.5 mb-5 shadow-xl text-center">
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-2.5">
            <span className="text-[10px] font-bold text-slate-400 block">
              Invited Friends
            </span>
            <div className="text-lg font-black text-slate-100 mt-0.5 tabular-nums">
              {currentCount}
            </div>
          </div>

          <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-2.5">
            <span className="text-[10px] font-bold text-slate-400 block">
              Next Milestone
            </span>
            <div className="text-lg font-black text-amber-400 mt-0.5 tabular-nums">
              {referralsNeededForNextTier} Left
            </div>
          </div>

          <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-2.5">
            <span className="text-[10px] font-bold text-slate-400 block">
              Earned FOX
            </span>
            <div className="text-lg font-black text-emerald-400 mt-0.5 flex items-center justify-center gap-1 tabular-nums">
              <img src={foxGoldCoinImg} alt="FOX" className="w-3.5 h-3.5" />
              <span>{(user.referralEarnings || 0).toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>

      {/* TIERED MILESTONE PROGRESS ROADMAP */}
      <div className="flex items-center justify-between mb-2.5 px-1">
        <h4 className="text-xs font-extrabold text-slate-300 flex items-center gap-1.5">
          <Trophy className="w-3.5 h-3.5 text-amber-400" />
          <span>Referral Milestone Tiers & Associated Rewards</span>
        </h4>
        <span className="text-[11px] font-bold text-slate-400 tabular-nums">
          {MILESTONE_TIERS.filter((t) => currentCount >= t.target).length} / {MILESTONE_TIERS.length} Unlocked
        </span>
      </div>

      <div className="space-y-2.5 mb-5">
        {MILESTONE_TIERS.map((tier) => {
          const isUnlocked = currentCount >= tier.target;
          const isNext = activeTier.target === tier.target;
          const tierProgress = Math.min(tier.target, currentCount);
          const tierPercent = Math.min(100, Math.round((tierProgress / tier.target) * 100));
          const remaining = Math.max(0, tier.target - currentCount);

          return (
            <div
              key={tier.tier}
              className={`rounded-2xl p-3.5 border transition ${
                isUnlocked
                  ? 'bg-emerald-950/25 border-emerald-500/50'
                  : isNext
                  ? 'bg-slate-900/95 border-amber-500/50 shadow-lg shadow-amber-500/5'
                  : 'bg-slate-900/60 border-slate-800/90 opacity-85'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
                      isUnlocked
                        ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
                        : isNext
                        ? 'bg-amber-500/20 border-amber-500/40 text-amber-400'
                        : 'bg-slate-800/80 border-slate-700 text-slate-400'
                    }`}
                  >
                    {isUnlocked ? (
                      <CheckCircle2 className="w-5 h-5" />
                    ) : isNext ? (
                      <Award className="w-5 h-5" />
                    ) : (
                      <Lock className="w-4 h-4" />
                    )}
                  </div>

                  <div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-bold text-sm text-slate-100">
                        {tier.title}
                      </span>
                      <span className="text-[11px] font-semibold text-slate-400">
                        · {tier.target} {tier.target === 1 ? 'Friend' : 'Friends'}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {tier.description}
                    </p>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <div
                    className={`flex items-center justify-end gap-1 text-sm font-black tabular-nums ${
                      isUnlocked ? 'text-emerald-400' : 'text-amber-400'
                    }`}
                  >
                    <img src={foxGoldCoinImg} alt="FOX" className="w-4 h-4" />
                    <span>+{tier.foxReward.toLocaleString()}</span>
                  </div>
                  <span className="text-[10px] font-bold text-emerald-300/90 tabular-nums block">
                    ${tier.usdValue}.00 USD Value
                  </span>
                </div>
              </div>

              {/* Per-Tier Progress Bar */}
              <div className="mt-3">
                <div className="flex items-center justify-between text-[11px] mb-1">
                  <span
                    className={`font-semibold ${
                      isUnlocked
                        ? 'text-emerald-400'
                        : isNext
                        ? 'text-amber-300'
                        : 'text-slate-400'
                    }`}
                  >
                    {isUnlocked
                      ? 'Completed & Unlocked'
                      : `${remaining} more ${remaining === 1 ? 'referral' : 'referrals'} needed`}
                  </span>
                  <span className="font-mono font-bold text-slate-300 tabular-nums">
                    {tierProgress} / {tier.target} ({tierPercent}%)
                  </span>
                </div>
                <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      isUnlocked
                        ? 'bg-emerald-400'
                        : isNext
                        ? 'bg-gradient-to-r from-amber-500 to-emerald-400'
                        : 'bg-slate-600'
                    }`}
                    style={{ width: `${tierPercent}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Per-Friend Invite Rates */}
      <h4 className="text-xs font-extrabold text-slate-300 mb-2.5 px-1">
        Per-Referral Instant Bonuses
      </h4>
      <div className="space-y-2.5 mb-5">
        {/* Regular friend */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
              <Gift className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <div className="font-bold text-sm text-slate-100">Standard Invite Bonus</div>
              <div className="text-[11px] text-slate-400">Paid instantly for every friend who joins</div>
            </div>
          </div>
          <div className="flex items-center gap-1 text-sm font-black text-amber-400 tabular-nums">
            <img src={foxGoldCoinImg} alt="FOX" className="w-4 h-4" />
            <span>+5,000</span>
          </div>
        </div>

        {/* Telegram Premium Friend */}
        <div className="bg-slate-900/80 border border-purple-500/30 rounded-2xl p-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <div className="font-bold text-sm text-purple-200 flex items-center gap-1.5">
                <span>Telegram Premium Friend</span>
                <span className="text-[10px] font-bold text-purple-300">
                  · VIP 5x
                </span>
              </div>
              <div className="text-[11px] text-slate-400">5x Special Premium Invite Reward</div>
            </div>
          </div>
          <div className="flex items-center gap-1 text-sm font-black text-amber-400 tabular-nums">
            <img src={foxGoldCoinImg} alt="FOX" className="w-4 h-4" />
            <span>+25,000</span>
          </div>
        </div>
      </div>

      {/* Share Actions */}
      <div className="space-y-2 mt-4">
        {/* Main Share Button */}
        <button
          onClick={handleShareTelegram}
          className="w-full py-3.5 px-4 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-black text-sm rounded-2xl shadow-lg shadow-sky-600/30 transition active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
        >
          <Send className="w-4 h-4" />
          <span>Share Referral Link on Telegram</span>
        </button>

        {/* Copy Link Button */}
        <button
          onClick={handleCopyLink}
          className="w-full py-3 px-4 bg-slate-800/90 hover:bg-slate-750 border border-slate-700/80 text-slate-200 font-bold text-xs rounded-2xl transition active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
        >
          {copied ? (
            <>
              <Check className="w-4 h-4 text-emerald-400" />
              <span className="text-emerald-400">Link Copied to Clipboard!</span>
            </>
          ) : (
            <>
              <Copy className="w-4 h-4 text-slate-400" />
              <span>Copy Exclusive Invite Link ({user.referralCode})</span>
            </>
          )}
        </button>
      </div>

      {/* Referral Code preview */}
      <div className="mt-4 p-3 bg-slate-900/60 border border-slate-800/60 rounded-xl text-center">
        <span className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold block">
          Your Exclusive Referral Code
        </span>
        <span className="text-sm font-black text-amber-400 tracking-wider">
          {user.referralCode}
        </span>
      </div>
    </div>
  );
};

