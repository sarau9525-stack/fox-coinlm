import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Gift,
  Sparkles,
  Send,
  Check,
  Lock,
  TrendingUp,
  Star,
  Award,
  X,
} from 'lucide-react';
import { UpgradeDefinition, UserGameState } from '../types/game.js';
import { FoxGiftAvatar, getFoxGiftMetadata } from './FoxGiftAvatar.js';
import { sound } from '../utils/audio.js';
import { TelegramService } from '../utils/telegram.js';

interface GiftsScreenProps {
  user: UserGameState;
  upgrades: UpgradeDefinition[];
  botUsername?: string;
  equippedGiftId: string | null;
  onEquipGift: (giftId: string) => void;
  onPurchaseGift: (giftId: string) => Promise<void>;
}

export const GiftsScreen: React.FC<GiftsScreenProps> = ({
  user,
  upgrades,
  botUsername = 'FOXCOINBot',
  equippedGiftId,
  onEquipGift,
  onPurchaseGift,
}) => {
  const [filter, setFilter] = useState<'all' | 'owned' | 'epic' | 'legendary'>('all');
  const [mintingId, setMintingId] = useState<string | null>(null);
  const [recentlyMintedId, setRecentlyMintedId] = useState<string | null>(null);
  const [selectedGiftId, setSelectedGiftId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<{ text: string; isError?: boolean } | null>(null);

  const giftItems = upgrades.filter((u) => u.category === 'gift');
  const selectedGift = giftItems.find((g) => g.id === selectedGiftId) || null;

  const getPrice = (up: UpgradeDefinition, level: number) => {
    return Math.floor(up.basePrice * Math.pow(up.priceMultiplier, level));
  };

  // Calculate total collected gifts & gift passive yield
  const uniqueOwnedCount = giftItems.filter((g) => (user.upgrades[g.id] || 0) > 0).length;
  const totalEditionsOwned = giftItems.reduce((sum, g) => sum + (user.upgrades[g.id] || 0), 0);
  const totalGiftYield = giftItems.reduce(
    (sum, g) => sum + (user.upgrades[g.id] || 0) * g.baseBenefit,
    0
  );

  const filteredGifts = giftItems.filter((g) => {
    const meta = getFoxGiftMetadata(g.id, g.basePrice);
    const owned = (user.upgrades[g.id] || 0) > 0;
    if (filter === 'owned') return owned;
    if (filter === 'epic') return meta.rarity === 'Rare' || meta.rarity === 'Epic';
    if (filter === 'legendary') return meta.rarity === 'Legendary' || meta.rarity === 'Mythic';
    return true;
  });

  const showToast = (text: string, isError = false) => {
    setToastMessage({ text, isError });
    setTimeout(() => setToastMessage(null), 3200);
  };

  const handleMintGift = async (gift: UpgradeDefinition) => {
    const currentLevel = user.upgrades[gift.id] || 0;
    const price = getPrice(gift, currentLevel);
    if (mintingId) return;

    if (user.level < gift.levelRequirement) {
      sound.playError();
      TelegramService.triggerHaptic('heavy');
      showToast(`Requires Player Level ${gift.levelRequirement} to unlock ${gift.name}`, true);
      return;
    }

    try {
      setMintingId(gift.id);
      await onPurchaseGift(gift.id);
      sound.playSuccess();
      TelegramService.triggerHaptic('heavy');
      setRecentlyMintedId(gift.id);
      setTimeout(() => {
        setRecentlyMintedId((prev) => (prev === gift.id ? null : prev));
      }, 1800);
      onEquipGift(gift.id);
      showToast(`⭐ Purchased & Equipped ${gift.name} (#${currentLevel + 1}) for ${price.toLocaleString('en-US')} Telegram Stars! +${gift.baseBenefit.toLocaleString('en-US')} FOX/hr`);
    } catch (err: any) {
      sound.playError();
      TelegramService.triggerHaptic('heavy');
      showToast(err?.message || 'Could not mint gift right now', true);
    } finally {
      setMintingId(null);
    }
  };

  const handleSendTelegramGift = (gift: UpgradeDefinition) => {
    sound.playCoin();
    TelegramService.triggerHaptic('medium');
    const meta = getFoxGiftMetadata(gift.id, gift.basePrice);
    const cleanBot = botUsername.replace('@', '');
    const tgDeepLink = `https://t.me/${cleanBot}?start=ref_${user.referralCode}`;
    const text = `🎁🦊 I'm sending you a "${gift.name}" (${meta.rarity} Telegram Collectible Gift · +${gift.baseBenefit.toLocaleString('en-US')} FOX/hr) on FOXCOIN! Claim your gift & +5,000 FOX bonus now:`;
    const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(tgDeepLink)}&text=${encodeURIComponent(text)}`;
    TelegramService.openLink(shareUrl);
  };

  return (
    <div className="w-full max-w-md mx-auto px-4 pb-24 pt-2 text-white">
      {/* Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -12, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className={`mb-3 p-3 rounded-2xl border text-xs font-bold flex items-center justify-center gap-2 shadow-lg ${
              toastMessage.isError
                ? 'bg-red-500/20 border-red-500/40 text-red-300'
                : 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
            }`}
          >
            <Sparkles className={`w-4 h-4 shrink-0 ${toastMessage.isError ? 'text-red-400' : 'text-emerald-400'}`} />
            <span>{toastMessage.text}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* TELEGRAM COLLECTIBLE FOX GIFTS SHOWCASE HEADER */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className="relative w-full bg-gradient-to-br from-slate-900 via-[#13192B] to-slate-950 border border-amber-500/35 rounded-3xl p-4 mb-4 shadow-xl overflow-hidden"
      >
        <div className="flex items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-3">
            <FoxGiftAvatar
              giftId={equippedGiftId || 'gift_star_fox'}
              size="md"
            />
            <div>
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-amber-400">
                <Gift className="w-3.5 h-3.5" />
                <span>Telegram Collectible Fox Gifts</span>
              </div>
              <h2 className="text-lg font-black text-slate-100 leading-tight mt-0.5">
                Fox Gift Vault & NFTs
              </h2>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Collect limited Telegram Foxes, boost passive FOX/hr & send gifts to friends
              </p>
            </div>
          </div>
        </div>

        {/* Vault Stats Bar */}
        <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-800/80">
          <div className="bg-slate-950/80 border border-slate-800/90 rounded-2xl p-2 text-center">
            <span className="text-[10px] font-semibold text-slate-400 block">
              Unique Foxes
            </span>
            <span className="text-sm font-black text-slate-100 tabular-nums">
              {uniqueOwnedCount} / {giftItems.length}
            </span>
          </div>

          <div className="bg-slate-950/80 border border-slate-800/90 rounded-2xl p-2 text-center">
            <span className="text-[10px] font-semibold text-slate-400 block">
              Total Minted
            </span>
            <span className="text-sm font-black text-amber-400 tabular-nums">
              #{totalEditionsOwned} Gifts
            </span>
          </div>

          <div className="bg-slate-950/80 border border-slate-800/90 rounded-2xl p-2 text-center">
            <span className="text-[10px] font-semibold text-slate-400 block">
              Gift Yield/Hr
            </span>
            <span className="text-sm font-black text-emerald-400 tabular-nums">
              +{totalGiftYield.toLocaleString('en-US')}
            </span>
          </div>
        </div>
      </motion.div>

      {/* Interactive Filter Tabs */}
      <div className="grid grid-cols-4 gap-1 bg-slate-900/90 p-1 rounded-2xl border border-slate-800 mb-4">
        {[
          { id: 'all', label: `All (${giftItems.length})` },
          { id: 'owned', label: `Owned (${uniqueOwnedCount})` },
          { id: 'epic', label: 'Rare & Epic' },
          { id: 'legendary', label: 'Legendary' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => {
              sound.playTap();
              setFilter(tab.id as any);
            }}
            className={`py-2 px-2 rounded-xl text-[11px] font-bold transition cursor-pointer whitespace-nowrap shrink-0 ${
              filter === tab.id
                ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-black shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 2-Column Collectible Telegram Gift Grid */}
      {filteredGifts.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-slate-900/70 border border-slate-800 rounded-3xl p-8 text-center my-4"
        >
          <Gift className="w-10 h-10 text-amber-400 mx-auto mb-2 opacity-80" />
          <h3 className="text-sm font-bold text-slate-200">No Fox Gifts in this filter yet</h3>
          <p className="text-xs text-slate-400 mt-1">
            Switch to "All" to mint your first Telegram Collectible Fox Gift!
          </p>
        </motion.div>
      ) : (
        <motion.div layout className="grid grid-cols-2 gap-3">
          <AnimatePresence mode="popLayout">
            {filteredGifts.map((gift, index) => {
              const meta = getFoxGiftMetadata(gift.id, gift.basePrice);
              const editionCount = user.upgrades[gift.id] || 0;
              const isOwned = editionCount > 0;
              const isEquipped = equippedGiftId === gift.id;
              const isJustMinted = recentlyMintedId === gift.id;
              const price = getPrice(gift, editionCount);
              const isLevelLocked = user.level < gift.levelRequirement;
              const canAfford = !isLevelLocked;

              return (
                <motion.div
                  key={gift.id}
                  layout
                  initial={{ opacity: 0, y: 20, scale: 0.92 }}
                  animate={{
                    opacity: 1,
                    y: 0,
                    scale: isJustMinted ? 1.03 : 1,
                  }}
                  exit={{ opacity: 0, scale: 0.9, y: 10 }}
                  transition={{
                    type: 'spring',
                    stiffness: 320,
                    damping: 26,
                    delay: Math.min(index * 0.04, 0.32),
                  }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    sound.playTap();
                    setSelectedGiftId(gift.id);
                  }}
                  className={`relative rounded-3xl p-3.5 border transition-colors flex flex-col justify-between cursor-pointer overflow-hidden ${
                    isEquipped
                      ? 'bg-slate-900/95 border-emerald-400/80 shadow-lg shadow-emerald-500/15'
                      : isOwned
                      ? `bg-slate-900/90 ${meta.borderClass}`
                      : 'bg-slate-900/70 border-slate-800/90 hover:border-slate-700'
                  }`}
                >
                  {/* Subtle continuous glow-pulse effect on the currently equipped gift card */}
                  {isEquipped && (
                    <>
                      <motion.div
                        aria-hidden="true"
                        animate={{
                          opacity: [0.22, 0.52, 0.22],
                          scale: [0.96, 1.04, 0.96],
                        }}
                        transition={{
                          duration: 2.6,
                          repeat: Infinity,
                          ease: 'easeInOut',
                        }}
                        className="absolute -inset-1 rounded-3xl bg-gradient-to-br from-emerald-400/25 via-teal-500/15 to-amber-400/20 blur-md pointer-events-none"
                      />
                      <motion.div
                        aria-hidden="true"
                        animate={{
                          opacity: [0.35, 0.85, 0.35],
                        }}
                        transition={{
                          duration: 2.6,
                          repeat: Infinity,
                          ease: 'easeInOut',
                        }}
                        className="absolute inset-0 rounded-3xl ring-1 ring-inset ring-emerald-400/50 pointer-events-none"
                      />
                    </>
                  )}

                  {/* Newly Minted Celebratory Shimmer Flash */}
                  <AnimatePresence>
                    {isJustMinted && (
                      <motion.div
                        initial={{ opacity: 0.85, scale: 0.85 }}
                        animate={{ opacity: 0, scale: 1.35 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.85, ease: 'easeOut' }}
                        className="absolute inset-0 rounded-3xl bg-gradient-to-tr from-amber-400/35 via-emerald-300/25 to-transparent pointer-events-none z-20"
                      />
                    )}
                  </AnimatePresence>

                  {/* Top Rarity & Supply Header */}
                  <div className="relative z-10">
                    <div className="flex items-center justify-between text-[10px] mb-2">
                      <span className={`font-bold ${meta.accentTextClass}`}>
                        {meta.rarity}
                      </span>
                      <span className="font-mono text-slate-400 tabular-nums">
                        {isOwned ? `#${editionCount} Owned` : `1 of ${meta.totalSupply}`}
                      </span>
                    </div>

                    {/* Centered Collectible Fox Artwork */}
                    <div className="flex flex-col items-center my-1">
                      <div className="relative">
                        {isEquipped && (
                          <motion.div
                            aria-hidden="true"
                            animate={{
                              opacity: [0.3, 0.7, 0.3],
                              scale: [0.92, 1.08, 0.92],
                            }}
                            transition={{
                              duration: 2.4,
                              repeat: Infinity,
                              ease: 'easeInOut',
                            }}
                            className="absolute -inset-2 rounded-full bg-emerald-400/25 blur-md pointer-events-none"
                          />
                        )}
                        <FoxGiftAvatar giftId={gift.id} size="lg" />
                        {isEquipped && (
                          <motion.span
                            initial={{ scale: 0.85, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-emerald-400 text-slate-950 text-[9px] font-black px-2 py-0.5 rounded-md shadow whitespace-nowrap"
                          >
                            Equipped
                          </motion.span>
                        )}
                      </div>

                      <h3 className="font-black text-sm text-slate-100 text-center mt-2.5 leading-snug">
                        {gift.name}
                      </h3>
                      <div className="text-[10px] text-slate-400 text-center mt-0.5 flex items-center justify-center gap-1">
                        <span>{meta.backdropName}</span>
                        <span>·</span>
                        <span className="text-yellow-400 font-bold flex items-center gap-0.5">
                          <Star className="w-2.5 h-2.5 fill-yellow-400 text-yellow-400" />
                          {price.toLocaleString('en-US')} Stars
                        </span>
                      </div>
                    </div>

                    {/* Hourly Passive Yield Boost */}
                    <div className="mt-2 bg-slate-950/80 border border-slate-800/80 rounded-xl py-1.5 px-2 flex items-center justify-between text-[11px]">
                      <span className="text-slate-400 flex items-center gap-1">
                        <TrendingUp className="w-3 h-3 text-emerald-400" />
                        <span>Yield</span>
                      </span>
                      <span className="font-black text-emerald-400 tabular-nums">
                        +{gift.baseBenefit.toLocaleString('en-US')}/hr
                      </span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="relative z-10 mt-3 space-y-1.5" onClick={(e) => e.stopPropagation()}>
                    {isLevelLocked ? (
                      <div className="w-full py-2 px-2.5 rounded-xl bg-slate-800/70 border border-slate-700/70 text-slate-400 text-[11px] font-bold flex items-center justify-center gap-1">
                        <Lock className="w-3 h-3" />
                        <span>Requires Lvl {gift.levelRequirement}</span>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleMintGift(gift)}
                        disabled={!canAfford || mintingId === gift.id}
                        className={`w-full py-2 px-2.5 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer whitespace-nowrap ${
                          canAfford
                            ? 'bg-gradient-to-r from-amber-400 via-yellow-400 to-orange-500 hover:from-amber-300 hover:to-orange-400 text-slate-950 shadow-md shadow-amber-500/20'
                            : 'bg-slate-800 text-slate-500 border border-slate-700/60 cursor-not-allowed'
                        }`}
                      >
                        <Star className="w-3.5 h-3.5 fill-slate-950 text-slate-950 shrink-0" />
                        <span className="tabular-nums">
                          {mintingId === gift.id
                            ? 'Minting...'
                            : isOwned
                            ? `Mint #${editionCount + 1} · ${price.toLocaleString('en-US')} Stars`
                            : `Buy · ${price.toLocaleString('en-US')} Stars`}
                        </span>
                      </button>
                    )}

                    {/* Equip or Send Gift Secondary Row */}
                    <div className="grid grid-cols-2 gap-1">
                      <button
                        onClick={() => {
                          if (!isOwned) return;
                          sound.playTap();
                          TelegramService.triggerHaptic('light');
                          if (isEquipped) {
                            onEquipGift('');
                            showToast(`Unequipped ${gift.name}`);
                          } else {
                            onEquipGift(gift.id);
                            showToast(`Equipped ${gift.name} on your Tap Screen!`);
                          }
                        }}
                        disabled={!isOwned}
                        className={`py-1.5 px-2 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 transition cursor-pointer whitespace-nowrap ${
                          isEquipped
                            ? 'bg-emerald-500/25 text-emerald-300 border border-emerald-500/50'
                            : isOwned
                            ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                            : 'bg-slate-900/50 text-slate-600 border border-slate-800/60 cursor-not-allowed'
                        }`}
                      >
                        <Check className="w-3 h-3" />
                        <span>{isEquipped ? 'Active' : 'Equip'}</span>
                      </button>

                      <button
                        onClick={() => handleSendTelegramGift(gift)}
                        className="py-1.5 px-2 rounded-lg bg-sky-500/15 hover:bg-sky-500/25 text-sky-300 border border-sky-500/30 text-[10px] font-bold flex items-center justify-center gap-1 transition cursor-pointer whitespace-nowrap"
                      >
                        <Send className="w-3 h-3" />
                        <span>Gift</span>
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </motion.div>
      )}

      {/* TELEGRAM COLLECTIBLE GIFT INSPECTOR MODAL */}
      <AnimatePresence>
        {selectedGift && (() => {
          const meta = getFoxGiftMetadata(selectedGift.id, selectedGift.basePrice);
          const editionCount = user.upgrades[selectedGift.id] || 0;
          const isOwned = editionCount > 0;
          const isEquipped = equippedGiftId === selectedGift.id;
          const price = getPrice(selectedGift, editionCount);
          const isLevelLocked = user.level < selectedGift.levelRequirement;
          const canAfford = !isLevelLocked;

          return (
            <motion.div
              key="gift-inspector-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
              onClick={() => setSelectedGiftId(null)}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 16 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.92, y: 12 }}
                transition={{ type: 'spring', stiffness: 360, damping: 28 }}
                className="w-full max-w-sm bg-[#111726] border border-slate-700/90 rounded-3xl p-5 shadow-2xl relative overflow-hidden"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  onClick={() => setSelectedGiftId(null)}
                  className="absolute top-3.5 right-3.5 w-8 h-8 rounded-full bg-slate-800/90 hover:bg-slate-700 flex items-center justify-center text-slate-300 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>

                <div className="flex flex-col items-center text-center">
                  <FoxGiftAvatar giftId={selectedGift.id} size="lg" />

                  <div className={`text-xs font-bold mt-3 ${meta.accentTextClass}`}>
                    {meta.rarity} Telegram Collectible Gift
                  </div>
                  <h3 className="text-xl font-black text-white mt-0.5">
                    {selectedGift.name}
                  </h3>
                  <p className="text-xs text-slate-300 mt-1 max-w-xs">
                    {selectedGift.description}
                  </p>
                </div>

                {/* Telegram Collectible Attributes Table */}
                <div className="mt-4 bg-slate-950/90 border border-slate-800 rounded-2xl p-3 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Backdrop</span>
                    <span className="font-bold text-slate-200">{meta.backdropName}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Accessory</span>
                    <span className="font-bold text-amber-300">{meta.accessoryLabel}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Availability</span>
                    <span className="font-mono font-bold text-slate-200 tabular-nums">
                      {isOwned ? `Edition #${editionCount} of ${meta.totalSupply}` : `Limited (${meta.totalSupply} max)`}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Telegram Stars Cost</span>
                    <span className="font-bold text-yellow-400 flex items-center gap-1 tabular-nums">
                      <Star className="w-3.5 h-3.5 fill-yellow-400" />
                      <span>{price.toLocaleString('en-US')} Stars</span>
                    </span>
                  </div>
                  <div className="flex items-center justify-between pt-1.5 border-t border-slate-800">
                    <span className="text-slate-400">Passive Mining Boost</span>
                    <span className="font-black text-emerald-400 tabular-nums">
                      +{selectedGift.baseBenefit.toLocaleString('en-US')} FOX / hr
                    </span>
                  </div>
                </div>

                {/* Modal Actions */}
                <div className="mt-4 space-y-2">
                  {!isLevelLocked ? (
                    <button
                      onClick={() => handleMintGift(selectedGift)}
                      disabled={!canAfford || mintingId === selectedGift.id}
                      className={`w-full py-3 px-4 rounded-2xl text-xs font-black flex items-center justify-center gap-2 transition active:scale-95 cursor-pointer ${
                        canAfford
                          ? 'bg-gradient-to-r from-amber-400 via-yellow-400 to-orange-500 hover:from-amber-300 hover:to-orange-400 text-slate-950 shadow-lg shadow-amber-500/25'
                          : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
                      }`}
                    >
                      <Star className="w-4 h-4 fill-slate-950 text-slate-950 shrink-0" />
                      <span className="tabular-nums">
                        {mintingId === selectedGift.id
                          ? 'Minting...'
                          : isOwned
                          ? `Mint Next Edition (#${editionCount + 1}) · ★ ${price.toLocaleString('en-US')} Stars`
                          : `Buy with Telegram Stars · ★ ${price.toLocaleString('en-US')} Stars`}
                      </span>
                    </button>
                  ) : (
                    <div className="w-full py-3 px-4 rounded-2xl bg-slate-800 text-slate-400 text-xs font-bold text-center">
                      Unlocks at Player Level {selectedGift.levelRequirement}
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2">
                    {isOwned && (
                      <button
                        onClick={() => {
                          if (isEquipped) {
                            onEquipGift('');
                            showToast(`Unequipped ${selectedGift.name}`);
                          } else {
                            onEquipGift(selectedGift.id);
                            showToast(`Equipped ${selectedGift.name} on your Tap Screen!`);
                          }
                          setSelectedGiftId(null);
                        }}
                        className="py-2.5 px-3 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Award className="w-4 h-4" />
                        <span>{isEquipped ? 'Unequip' : 'Equip on Home'}</span>
                      </button>
                    )}

                    <button
                      onClick={() => handleSendTelegramGift(selectedGift)}
                      className={`${
                        isOwned ? '' : 'col-span-2'
                      } py-2.5 px-3 rounded-xl bg-sky-500/20 hover:bg-sky-500/30 border border-sky-500/40 text-sky-300 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer`}
                    >
                      <Send className="w-4 h-4" />
                      <span>Send Gift to Friend on Telegram</span>
                    </button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          );
        })()}
      </AnimatePresence>
    </div>
  );
};
