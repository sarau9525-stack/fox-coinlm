import React, { useState, useEffect } from 'react';
import {
  Crown,
  Lock,
  Check,
  X,
  Sparkles,
  Shield,
  Zap,
  TrendingUp,
  ChevronRight,
  Award,
  Layers,
  UserCheck,
} from 'lucide-react';
import { UserGameState } from '../types/game.js';
import { PLAYER_LEVELS } from '../../server/gameConfig.js';
import { foxGoldCoinImg } from '../assets/assets.js';
import { sound } from '../utils/audio.js';
import { TelegramService } from '../utils/telegram.js';

export type CharacterTierId = 'novice' | 'adventurer' | 'warrior' | 'knight' | 'legendary';
export type CharacterSkinId = 'default' | 'winter' | 'samurai' | 'cyber';

export interface FoxCharacterTier {
  id: CharacterTierId;
  requiredLevel: 1 | 5 | 10 | 15 | 20;
  shortTitle: string;
  fullTitle: string;
  outfitName: string;
  rarity: 'Common' | 'Uncommon' | 'Rare' | 'Epic' | 'Legendary';
  description: string;
  imageUrl: string;
  avatarUrl: string;
  primaryColor: string;
  accentColor: string;
  borderGlow: string;
  badgeBg: string;
}

export interface FoxCharacterSkin {
  id: CharacterSkinId;
  name: string;
  outfitSubtitle: string;
  requiredLevel: number;
  rarity: 'Common' | 'Rare' | 'Epic' | 'Legendary';
  imageUrl: string;
  accentColor: string;
}

export const FOX_CHARACTER_TIERS: FoxCharacterTier[] = [
  {
    id: 'novice',
    requiredLevel: 1,
    shortTitle: 'Novice',
    fullTitle: 'Level 1 — Novice',
    outfitName: 'Beginner Tunic & Forest Scarf',
    rarity: 'Common',
    description:
      'A determined young fox wearing simple beginner explorer clothes and leather utility straps.',
    imageUrl: '/assets/character/tier_1_novice.png',
    avatarUrl: '/assets/character/avatar_1_novice.png',
    primaryColor: '#451A03',
    accentColor: '#D97706',
    borderGlow: 'rgba(217, 119, 6, 0.45)',
    badgeBg: 'from-amber-900/90 to-stone-900/95',
  },
  {
    id: 'adventurer',
    requiredLevel: 5,
    shortTitle: 'Adventurer',
    fullTitle: 'Level 5 — Adventurer',
    outfitName: 'Emerald Ranger Adventurer Gear',
    rarity: 'Uncommon',
    description:
      'Seasoned pathfinder attire featuring forest-green ranger fabrics, reinforced bracers, and gold buckle.',
    imageUrl: '/assets/character/tier_5_adventurer.png',
    avatarUrl: '/assets/character/avatar_5_adventurer.png',
    primaryColor: '#064E3B',
    accentColor: '#10B981',
    borderGlow: 'rgba(16, 185, 129, 0.5)',
    badgeBg: 'from-emerald-900/90 to-teal-950/95',
  },
  {
    id: 'warrior',
    requiredLevel: 10,
    shortTitle: 'Warrior',
    fullTitle: 'Level 10 — Warrior',
    outfitName: 'Cobalt & Gold Combat Armor',
    rarity: 'Rare',
    description:
      'Forged blue-steel and metallic gold combat armor bearing the royal FOXCOIN crest on the chestplate.',
    imageUrl: '/assets/character/tier_10_warrior.png',
    avatarUrl: '/assets/character/avatar_10_warrior.png',
    primaryColor: '#1E3A8A',
    accentColor: '#3B82F6',
    borderGlow: 'rgba(59, 130, 246, 0.55)',
    badgeBg: 'from-blue-900/90 to-indigo-950/95',
  },
  {
    id: 'knight',
    requiredLevel: 15,
    shortTitle: 'Knight',
    fullTitle: 'Level 15 — Knight',
    outfitName: 'Amethyst & Gold Royal Knight Regalia',
    rarity: 'Epic',
    description:
      'Regal purple-and-gold knight plate armor with sculpted golden pauldrons and a flowing sovereign cape.',
    imageUrl: '/assets/character/tier_15_knight.png',
    avatarUrl: '/assets/character/avatar_15_knight.png',
    primaryColor: '#4C1D95',
    accentColor: '#A855F7',
    borderGlow: 'rgba(168, 85, 247, 0.6)',
    badgeBg: 'from-purple-900/90 to-fuchsia-950/95',
  },
  {
    id: 'legendary',
    requiredLevel: 20,
    shortTitle: 'Legendary',
    fullTitle: 'Level 20 — Legendary',
    outfitName: 'Sovereign Black & Gold Crown Armor',
    rarity: 'Legendary',
    description:
      'Majestic obsidian-and-gold emperor armor crowned with radiant golden aura and royal crimson mantle.',
    imageUrl: '/assets/character/tier_20_legendary.png',
    avatarUrl: '/assets/character/avatar_20_legendary.png',
    primaryColor: '#78350F',
    accentColor: '#F59E0B',
    borderGlow: 'rgba(245, 158, 11, 0.8)',
    badgeBg: 'from-amber-600/90 to-yellow-900/95',
  },
];

export const FOX_CHARACTER_SKINS: FoxCharacterSkin[] = [
  {
    id: 'default',
    name: 'Default Hero',
    outfitSubtitle: 'Classic Royal Vanguard',
    requiredLevel: 1,
    rarity: 'Common',
    imageUrl: '/assets/character/skin_default.png',
    accentColor: '#F59E0B',
  },
  {
    id: 'winter',
    name: 'Winter Frost',
    outfitSubtitle: 'Arctic Fur-Trimmed Armor',
    requiredLevel: 5,
    rarity: 'Rare',
    imageUrl: '/assets/character/skin_winter.png',
    accentColor: '#38BDF8',
  },
  {
    id: 'samurai',
    name: 'Crimson Samurai',
    outfitSubtitle: 'Shogun Blade & Lacquered Plate',
    requiredLevel: 10,
    rarity: 'Epic',
    imageUrl: '/assets/character/skin_samurai.png',
    accentColor: '#EF4444',
  },
  {
    id: 'cyber',
    name: 'Neon Cyber',
    outfitSubtitle: 'Holo-Visor & Plasma Core',
    requiredLevel: 15,
    rarity: 'Legendary',
    imageUrl: '/assets/character/skin_cyber.png',
    accentColor: '#A855F7',
  },
];

export function getUnlockedCharacterTierForLevel(playerLevel: number): FoxCharacterTier {
  const safeLevel = Math.max(1, Math.floor(Number(playerLevel) || 1));
  let matched = FOX_CHARACTER_TIERS[0];
  for (const tier of FOX_CHARACTER_TIERS) {
    if (safeLevel >= tier.requiredLevel) {
      matched = tier;
    }
  }
  return matched;
}

export function getNextCharacterTierForLevel(playerLevel: number): FoxCharacterTier | null {
  const safeLevel = Math.max(1, Math.floor(Number(playerLevel) || 1));
  for (const tier of FOX_CHARACTER_TIERS) {
    if (tier.requiredLevel > safeLevel) {
      return tier;
    }
  }
  return null;
}

export function getActiveCharacterTier(
  playerLevel: number,
  equippedTierId?: string | null
): FoxCharacterTier {
  const safeLevel = Math.max(1, Math.floor(Number(playerLevel) || 1));
  if (equippedTierId) {
    const found = FOX_CHARACTER_TIERS.find((t) => t.id === equippedTierId);
    if (found && safeLevel >= found.requiredLevel) {
      return found;
    }
  }
  return getUnlockedCharacterTierForLevel(safeLevel);
}

export function getActiveCharacterSkin(
  playerLevel: number,
  equippedSkinId?: string | null
): FoxCharacterSkin {
  const safeLevel = Math.max(1, Math.floor(Number(playerLevel) || 1));
  if (equippedSkinId) {
    const found = FOX_CHARACTER_SKINS.find((s) => s.id === equippedSkinId);
    if (found && safeLevel >= found.requiredLevel) {
      return found;
    }
  }
  return FOX_CHARACTER_SKINS[0];
}

const CHAR_PREF_STORAGE_PREFIX = 'foxcoin_character_pref_v1_';

export function loadSavedCharacterPrefs(userId: string): {
  tierId: CharacterTierId | null;
  skinId: CharacterSkinId | null;
} {
  if (typeof window === 'undefined' || !userId) {
    return { tierId: null, skinId: null };
  }
  try {
    const raw = localStorage.getItem(`${CHAR_PREF_STORAGE_PREFIX}${userId}`);
    if (!raw) return { tierId: null, skinId: null };
    const parsed = JSON.parse(raw);
    return {
      tierId: parsed.tierId || null,
      skinId: parsed.skinId || null,
    };
  } catch {
    return { tierId: null, skinId: null };
  }
}

export function saveCharacterPrefs(
  userId: string,
  tierId: CharacterTierId | null,
  skinId: CharacterSkinId | null
): void {
  if (typeof window === 'undefined' || !userId) return;
  try {
    localStorage.setItem(
      `${CHAR_PREF_STORAGE_PREFIX}${userId}`,
      JSON.stringify({ tierId, skinId, updatedAt: Date.now() })
    );
  } catch {
    // Ignore storage quota errors
  }
}

function formatCompactXP(num: number): string {
  const n = Math.max(0, Math.floor(Number(num) || 0));
  if (n >= 1_000_000_000) {
    return `${(n / 1_000_000_000).toFixed(n % 1_000_000_000 === 0 ? 0 : 2)}B`;
  }
  if (n >= 1_000_000) {
    return `${(n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1)}M`;
  }
  if (n >= 10_000) {
    return `${(n / 1_000).toFixed(n % 1_000 === 0 ? 0 : 1)}K`;
  }
  return n.toLocaleString('en-US');
}

export interface FoxCircularAvatarProps {
  tier?: FoxCharacterTier;
  src?: string;
  alt?: string;
  isTransparentPng?: boolean;
  className?: string;
  imgClassName?: string;
}

/**
 * Reusable Circular Fox Avatar Component.
 * Enforces border-radius: 50% and overflow: hidden on the circular container,
 * and width: 100%, height: 100%, with proper object-fit and object-position
 * so the fox's ears, face, and upper body stay centered inside the circle without overflowing.
 */
export const FoxCircularAvatar: React.FC<FoxCircularAvatarProps> = React.memo(
  ({
    tier,
    src,
    alt,
    isTransparentPng = false,
    className = 'w-10 h-10',
    imgClassName = '',
  }) => {
    const resolvedSrc = src || tier?.avatarUrl || tier?.imageUrl || '/assets/character/avatar_1_novice.png';
    const resolvedAlt = alt || tier?.fullTitle || 'FOXCOIN Avatar';

    return (
      <div
        style={{
          borderRadius: '50%',
          overflow: 'hidden',
        }}
        className={`relative rounded-full overflow-hidden flex items-center justify-center shrink-0 select-none ${className}`}
      >
        <img
          src={resolvedSrc}
          alt={resolvedAlt}
          draggable={false}
          style={{
            width: '100%',
            height: '100%',
            objectFit: isTransparentPng ? 'contain' : 'cover',
            objectPosition: isTransparentPng ? 'center center' : 'center 18%',
            display: 'block',
          }}
          className={`w-full h-full ${
            isTransparentPng ? 'object-contain object-center' : 'object-cover'
          } ${imgClassName}`}
        />
      </div>
    );
  }
);

interface FoxCharacterHeroStageProps {
  tier: FoxCharacterTier;
  skin?: FoxCharacterSkin;
  isTapped: boolean;
  isTurbo?: boolean;
}

/**
 * Animated Main Character Display for the Tap Stage.
 * Includes subtle breathing, periodic eye-blink shimmer, confident stance sway,
 * and a short tap reaction animation when the player taps the character.
 */
export const FoxCharacterHeroStage: React.FC<FoxCharacterHeroStageProps> = React.memo(
  ({ tier, skin, isTapped, isTurbo = false }) => {
    const [isBlinking, setIsBlinking] = useState(false);

    // Subtle periodic eye-blink / glint effect every ~4.2 seconds
    useEffect(() => {
      const interval = setInterval(() => {
        setIsBlinking(true);
        const t = setTimeout(() => setIsBlinking(false), 180);
        return () => clearTimeout(t);
      }, 4200);
      return () => clearInterval(interval);
    }, []);

    return (
      <div className="relative w-full h-full flex items-center justify-center pointer-events-none select-none overflow-hidden">
        {/* Keyframe definitions for breathing, stance sway, and tap reaction */}
        <style>{`
          @keyframes foxHeroBreathe {
            0%, 100% {
              transform: translateY(0px) scaleX(1) scaleY(1) rotate(0deg);
            }
            50% {
              transform: translateY(-4px) scaleX(1.012) scaleY(1.022) rotate(0.6deg);
            }
          }
          @keyframes foxAuraPulse {
            0%, 100% {
              opacity: 0.45;
              transform: scale(0.96);
            }
            50% {
              opacity: 0.85;
              transform: scale(1.06);
            }
          }
        `}</style>

        {/* Tier-colored Ambient Radial Aura Behind Character */}
        <div
          style={{
            background: `radial-gradient(circle at 50% 54%, ${tier.borderGlow} 0%, rgba(15, 23, 42, 0.1) 58%, transparent 75%)`,
            animation: 'foxAuraPulse 3.6s ease-in-out infinite',
          }}
          className="absolute inset-0 pointer-events-none"
        />

        {/* Legendary / High-Tier Golden Halo Ring */}
        {tier.requiredLevel >= 15 && (
          <div
            style={{ borderColor: tier.accentColor }}
            className="absolute w-44 h-44 sm:w-48 sm:h-48 rounded-full border border-dashed opacity-35 animate-spin-slow pointer-events-none"
          />
        )}

        {/* Main Character Sprite Container with Breathing + Tap Reaction */}
        <div
          style={{
            animation: isTapped ? 'none' : 'foxHeroBreathe 3.2s ease-in-out infinite',
            transform: isTapped
              ? 'translateY(-6px) scale(1.065) rotate(-1.5deg)'
              : undefined,
            transition: 'transform 95ms cubic-bezier(0.22, 1, 0.36, 1)',
          }}
          className="relative z-10 h-[92%] aspect-[1/1.85] flex items-center justify-center"
        >
          <img
            src={tier.imageUrl}
            alt={tier.fullTitle}
            draggable={false}
            style={{
              filter: isTapped
                ? `drop-shadow(0 0 18px ${tier.accentColor}) brightness(1.14)`
                : isTurbo
                ? 'drop-shadow(0 0 16px #F59E0B) brightness(1.08)'
                : `drop-shadow(0 8px 20px rgba(0,0,0,0.85)) drop-shadow(0 0 10px ${tier.borderGlow})`,
            }}
            className="w-full h-full object-contain rounded-2xl transition-all duration-100"
          />

          {/* Subtle Eye Blink / Glint Overlay */}
          {isBlinking && (
            <div
              className="absolute top-[24%] left-[44%] w-7 h-1.5 rounded-full bg-amber-950/60 blur-[0.5px] pointer-events-none"
              aria-hidden="true"
            />
          )}

          {/* Active Cosmetic Skin Badge Indicator (if non-default skin equipped) */}
          {skin && skin.id !== 'default' && (
            <div
              style={{
                borderColor: skin.accentColor,
                borderRadius: '50%',
                overflow: 'hidden',
              }}
              className="absolute -right-2 top-3 w-7 h-7 rounded-full overflow-hidden border-2 bg-slate-950 shadow-lg"
            >
              <img
                src={skin.imageUrl}
                alt={skin.name}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  objectPosition: 'center 18%',
                }}
                className="w-full h-full object-cover"
              />
            </div>
          )}
        </div>
      </div>
    );
  }
);

interface FoxCharacterModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserGameState;
  equippedTierId: CharacterTierId;
  equippedSkinId: CharacterSkinId;
  onSelectTier: (tierId: CharacterTierId) => void;
  onSelectSkin: (skinId: CharacterSkinId) => void;
  initialView?: 'profile' | 'collection';
}

export const FoxCharacterModal: React.FC<FoxCharacterModalProps> = ({
  isOpen,
  onClose,
  user,
  equippedTierId,
  equippedSkinId,
  onSelectTier,
  onSelectSkin,
  initialView = 'profile',
}) => {
  const [activeView, setActiveView] = useState<'profile' | 'collection'>(initialView);
  const [previewTierId, setPreviewTierId] = useState<CharacterTierId>(equippedTierId);
  const [previewSkinId, setPreviewSkinId] = useState<CharacterSkinId>(equippedSkinId);

  useEffect(() => {
    if (isOpen) {
      setActiveView(initialView);
      setPreviewTierId(equippedTierId);
      setPreviewSkinId(equippedSkinId);
    }
  }, [isOpen, initialView, equippedTierId, equippedSkinId]);

  if (!isOpen) return null;

  const activeTier = getActiveCharacterTier(user.level, equippedTierId);
  const previewTier =
    FOX_CHARACTER_TIERS.find((t) => t.id === previewTierId) || activeTier;
  const activeSkin = getActiveCharacterSkin(user.level, equippedSkinId);
  const previewSkin =
    FOX_CHARACTER_SKINS.find((s) => s.id === previewSkinId) || activeSkin;
  const nextTier = getNextCharacterTierForLevel(user.level);

  // Real XP / Level Progress Calculation from existing game state
  const currentXP = Math.max(0, Math.floor(user.totalEarned || user.balance || 0));
  const currentLevelMinXP = Math.max(0, Math.floor(user.currentLevelMinCoins || 0));
  const nextLevelReqXP = Math.max(
    currentLevelMinXP + 5000,
    Math.floor(user.nextLevelMinCoins || currentLevelMinXP + 5000)
  );
  const isMaxLevel = user.level >= 20;
  const xpIntoLevel = Math.max(0, currentXP - currentLevelMinXP);
  const xpSpanForLevel = Math.max(1, nextLevelReqXP - currentLevelMinXP);
  const xpPercent = isMaxLevel
    ? 100
    : Math.min(100, Math.max(4, Math.floor((xpIntoLevel / xpSpanForLevel) * 100)));

  const isPreviewTierUnlocked = user.level >= previewTier.requiredLevel;
  const isPreviewTierEquipped = activeTier.id === previewTier.id;

  // Required XP for the previewed tier (from PLAYER_LEVELS)
  const previewTierLevelDef = PLAYER_LEVELS.find((l) => l.level === previewTier.requiredLevel);
  const previewTierMinXP = previewTierLevelDef ? previewTierLevelDef.minCoins : 0;
  const previewTierProgressPct = isPreviewTierUnlocked
    ? 100
    : previewTierMinXP > 0
    ? Math.min(99, Math.floor((currentXP / previewTierMinXP) * 100))
    : 0;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-2.5 sm:p-4 select-none">
      <div className="w-full max-w-md bg-gradient-to-b from-[#131A2E] via-[#0D1222] to-[#080B14] border-2 border-amber-500/45 rounded-3xl overflow-hidden shadow-[0_16px_48px_rgba(0,0,0,0.9)] flex flex-col max-h-[92dvh] text-white">
        {/* Top Modal Header */}
        <div className="px-3.5 py-3 border-b border-amber-500/25 flex items-center justify-between bg-[#090D18]/90 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-b from-amber-500/25 to-amber-700/15 border border-amber-400/50 flex items-center justify-center shrink-0">
              <Crown className="w-4 h-4 text-amber-400 fill-amber-400" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-amber-100 via-amber-300 to-amber-500 truncate">
                FOXCOIN Hero Character
              </h2>
              <p className="text-[10px] text-slate-400 font-semibold truncate">
                Character Profile & Multi-Level Armor Collection
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close Character System"
            className="w-8 h-8 rounded-xl bg-slate-800/90 hover:bg-slate-700 border border-slate-700 flex items-center justify-center text-slate-300 hover:text-white transition cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation Switcher: Character Profile vs Character Collection */}
        <div className="grid grid-cols-2 gap-1.5 p-2 bg-[#0A0E1A] border-b border-slate-800/90 shrink-0">
          <button
            type="button"
            onClick={() => {
              TelegramService.hapticSelection();
              setActiveView('profile');
            }}
            className={`py-2 px-3 rounded-xl font-black text-xs flex items-center justify-center gap-1.5 transition cursor-pointer ${
              activeView === 'profile'
                ? 'bg-gradient-to-r from-amber-400 via-amber-500 to-orange-500 text-slate-950 shadow-[0_0_14px_rgba(245,158,11,0.35)]'
                : 'text-slate-300 hover:text-white bg-slate-900/70'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>Character Profile</span>
          </button>

          <button
            type="button"
            onClick={() => {
              TelegramService.hapticSelection();
              setActiveView('collection');
            }}
            className={`py-2 px-3 rounded-xl font-black text-xs flex items-center justify-center gap-1.5 transition cursor-pointer ${
              activeView === 'collection'
                ? 'bg-gradient-to-r from-amber-400 via-amber-500 to-orange-500 text-slate-950 shadow-[0_0_14px_rgba(245,158,11,0.35)]'
                : 'text-slate-300 hover:text-white bg-slate-900/70'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Character Collection (5)</span>
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="p-3 sm:p-3.5 overflow-y-auto space-y-3 flex-1">
          {activeView === 'profile' ? (
            <>
              {/* 1. Active Character Hero Showcase Card */}
              <div className="rounded-2xl bg-gradient-to-b from-[#161F38] to-[#0B101F] border border-amber-500/40 p-3 shadow-lg">
                <div className="flex items-center gap-3">
                  {/* Character Preview Portrait */}
                  <div
                    style={{
                      borderColor: activeTier.accentColor,
                      boxShadow: `0 0 20px ${activeTier.borderGlow}`,
                    }}
                    className="relative w-24 h-36 sm:w-28 sm:h-40 rounded-2xl overflow-hidden border-2 bg-[#070A12] shrink-0 flex items-center justify-center"
                  >
                    <img
                      src={activeTier.imageUrl}
                      alt={activeTier.fullTitle}
                      className="w-full h-full object-contain"
                    />
                    <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded-md bg-black/80 border border-amber-400/50 text-[9px] font-black text-amber-300">
                      Lv {user.level}
                    </span>
                  </div>

                  {/* Character Identity, Rarity & Equipped Outfit */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[10px] font-black uppercase tracking-wider text-amber-400">
                        {activeTier.rarity} Tier
                      </span>
                      <span className="text-slate-600">•</span>
                      <span className="text-[10px] font-bold text-emerald-400">
                        Equipped
                      </span>
                    </div>

                    <h3 className="text-sm sm:text-base font-black text-white mt-0.5 truncate">
                      {activeTier.fullTitle}
                    </h3>
                    <p className="text-[11px] font-bold text-amber-200/90 truncate">
                      {user.displayName || user.username} ({user.levelName})
                    </p>

                    {/* Equipped Outfit & Cosmetic Skin Details */}
                    <div className="mt-2 space-y-1 bg-[#090D18]/90 border border-slate-800 rounded-xl p-2">
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="text-slate-400 font-semibold">Armor Set:</span>
                        <span className="font-extrabold text-white truncate max-w-[135px]">
                          {activeTier.outfitName}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="text-slate-400 font-semibold">Equipped Skin:</span>
                        <span className="font-extrabold text-amber-300 truncate">
                          {activeSkin.name} ({activeSkin.rarity})
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="text-slate-400 font-semibold">Next Tier Unlock:</span>
                        <span className="font-extrabold text-emerald-400">
                          {nextTier ? `${nextTier.shortTitle} (Lv ${nextTier.requiredLevel})` : 'Max Tier Reached'}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setActiveView('collection')}
                      className="w-full mt-2 py-1.5 px-2.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/50 text-amber-200 font-black text-[11px] flex items-center justify-center gap-1 transition cursor-pointer"
                    >
                      <span>Open Character Collection</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* 2. Experience (XP) & Level Progression Bar */}
                <div className="mt-3 pt-2.5 border-t border-slate-800/90">
                  <div className="flex items-center justify-between text-[11px] mb-1">
                    <span className="font-black text-amber-300">
                      Level {user.level} / 20 Progression
                    </span>
                    <span className="font-bold text-slate-300 tabular-nums">
                      {isMaxLevel
                        ? `${formatCompactXP(currentXP)} XP (MAX)`
                        : `${formatCompactXP(currentXP)} / ${formatCompactXP(nextLevelReqXP)} XP (${xpPercent}%)`}
                    </span>
                  </div>
                  <div className="w-full h-2.5 bg-[#070A12] border border-amber-500/35 rounded-full p-0.5 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-200 transition-all duration-300"
                      style={{ width: `${xpPercent}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">
                    Earn XP automatically by tapping and upgrading businesses in your FOXCOIN empire.
                  </p>
                </div>
              </div>

              {/* 3. Verified In-Game Statistics (Only Real Game Stats — No Fictional Combat Stats) */}
              <div className="rounded-2xl bg-[#0D1323] border border-slate-800 p-2.5">
                <div className="text-[11px] font-black text-amber-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Award className="w-3.5 h-3.5 text-amber-400" />
                  <span>Active Player Capabilities</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-[#080C16] border border-slate-800/90 rounded-xl p-2 flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-400">Tap Power</span>
                    <span className="text-xs font-black text-amber-300 tabular-nums">
                      +{user.tapPower.toLocaleString('en-US')} FOX
                    </span>
                  </div>
                  <div className="bg-[#080C16] border border-slate-800/90 rounded-xl p-2 flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-400">Hourly Income</span>
                    <span className="text-xs font-black text-emerald-400 tabular-nums">
                      +{formatCompactXP(user.profitPerHour)}/hr
                    </span>
                  </div>
                  <div className="bg-[#080C16] border border-slate-800/90 rounded-xl p-2 flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-400">Max Energy</span>
                    <span className="text-xs font-black text-sky-300 tabular-nums">
                      {user.maxEnergy.toLocaleString('en-US')}
                    </span>
                  </div>
                  <div className="bg-[#080C16] border border-slate-800/90 rounded-xl p-2 flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-400">Energy Regen</span>
                    <span className="text-xs font-black text-purple-300 tabular-nums">
                      +{user.energyRegenRate}/sec
                    </span>
                  </div>
                </div>
              </div>

              {/* 4. Character Tier Unlock Roadmap (All 5 Tiers) */}
              <div className="rounded-2xl bg-[#0D1323] border border-slate-800 p-2.5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-black text-amber-300 uppercase tracking-wider">
                    Character Tier Progression
                  </span>
                  <span className="text-[10px] font-bold text-slate-400">
                    {FOX_CHARACTER_TIERS.filter((t) => user.level >= t.requiredLevel).length} / 5 Unlocked
                  </span>
                </div>

                <div className="grid grid-cols-5 gap-1.5">
                  {FOX_CHARACTER_TIERS.map((tier) => {
                    const unlocked = user.level >= tier.requiredLevel;
                    const isEquipped = activeTier.id === tier.id;
                    return (
                      <button
                        key={tier.id}
                        type="button"
                        onClick={() => {
                          setPreviewTierId(tier.id);
                          setActiveView('collection');
                        }}
                        className={`flex flex-col items-center p-1.5 rounded-xl border transition cursor-pointer ${
                          isEquipped
                            ? 'bg-amber-500/20 border-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.3)]'
                            : unlocked
                            ? 'bg-[#131C33] border-emerald-500/40 hover:border-amber-400/60'
                            : 'bg-[#080B14]/80 border-slate-800 opacity-75 hover:opacity-100'
                        }`}
                      >
                        <div className="relative w-11 h-16 rounded-lg overflow-hidden bg-[#060911] mb-1">
                          <img
                            src={tier.imageUrl}
                            alt={tier.shortTitle}
                            className={`w-full h-full object-contain ${unlocked ? '' : 'grayscale opacity-70'}`}
                          />
                          {!unlocked && (
                            <div className="absolute inset-0 bg-black/45 flex items-center justify-center">
                              <Lock className="w-3.5 h-3.5 text-amber-300" />
                            </div>
                          )}
                        </div>
                        <span className="text-[9px] font-black text-white truncate w-full text-center">
                          {tier.shortTitle}
                        </span>
                        <span
                          className={`text-[8px] font-bold ${
                            unlocked ? 'text-emerald-400' : 'text-amber-300/80'
                          }`}
                        >
                          Lv {tier.requiredLevel}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          ) : (
            <>
              {/* COLLECTION VIEW: Interactive Preview + 5 Character Tiers + 4 Outfits */}
              {/* Top Interactive Preview Panel */}
              <div className="rounded-2xl bg-gradient-to-b from-[#161F38] to-[#0B101F] border border-amber-500/45 p-3 shadow-lg">
                <div className="flex items-center gap-3">
                  <div
                    style={{
                      borderColor: previewTier.accentColor,
                      boxShadow: `0 0 22px ${previewTier.borderGlow}`,
                    }}
                    className="relative w-24 h-36 sm:w-28 sm:h-40 rounded-2xl overflow-hidden border-2 bg-[#070A12] shrink-0 flex items-center justify-center"
                  >
                    <img
                      src={previewTier.imageUrl}
                      alt={previewTier.fullTitle}
                      className="w-full h-full object-contain"
                    />
                    {!isPreviewTierUnlocked && (
                      <div className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded bg-black/85 border border-amber-400/50 flex items-center gap-1 text-[9px] font-black text-amber-300">
                        <Lock className="w-2.5 h-2.5" />
                        <span>Lv {previewTier.requiredLevel}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <span
                        style={{ color: previewTier.accentColor }}
                        className="text-[10px] font-black uppercase tracking-wider"
                      >
                        {previewTier.rarity} Character Tier
                      </span>
                      <span className="text-[10px] font-extrabold text-slate-400">
                        Req. Lv {previewTier.requiredLevel}
                      </span>
                    </div>

                    <h3 className="text-sm sm:text-base font-black text-white mt-0.5 truncate">
                      {previewTier.fullTitle}
                    </h3>
                    <p className="text-[11px] font-bold text-amber-200/90 truncate">
                      {previewTier.outfitName}
                    </p>
                    <p className="text-[10px] text-slate-300 mt-1 leading-relaxed">
                      {previewTier.description}
                    </p>

                    {/* Unlock Progress or Equip Action */}
                    <div className="mt-2.5">
                      {isPreviewTierUnlocked ? (
                        <button
                          type="button"
                          onClick={() => {
                            onSelectTier(previewTier.id);
                            sound.playSuccess();
                            TelegramService.hapticNotification('success');
                          }}
                          className={`w-full py-2 px-3 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition cursor-pointer ${
                            isPreviewTierEquipped
                              ? 'bg-emerald-500/20 border border-emerald-400/60 text-emerald-300'
                              : 'bg-gradient-to-r from-amber-400 via-amber-500 to-orange-500 text-slate-950 shadow-lg shadow-amber-500/25'
                          }`}
                        >
                          {isPreviewTierEquipped ? (
                            <>
                              <Check className="w-3.5 h-3.5" />
                              <span>Currently Equipped</span>
                            </>
                          ) : (
                            <span>Equip {previewTier.shortTitle} Tier</span>
                          )}
                        </button>
                      ) : (
                        <div className="bg-[#080B14] border border-amber-500/30 rounded-xl p-2">
                          <div className="flex items-center justify-between text-[10px] mb-1">
                            <span className="font-bold text-amber-300 flex items-center gap-1">
                              <Lock className="w-3 h-3" />
                              <span>Unlocks at Level {previewTier.requiredLevel}</span>
                            </span>
                            <span className="font-bold text-slate-400 tabular-nums">
                              {previewTierProgressPct}%
                            </span>
                          </div>
                          <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-amber-500 to-yellow-300 rounded-full"
                              style={{ width: `${previewTierProgressPct}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* 5 Character Progression Tiers Carousel / Grid */}
              <div>
                <div className="flex items-center justify-between mb-1.5 px-0.5">
                  <span className="text-xs font-black text-amber-200">
                    5 Character Evolution Tiers
                  </span>
                  <span className="text-[10px] font-semibold text-slate-400">
                    Tap any tier to preview
                  </span>
                </div>

                <div className="grid grid-cols-5 gap-1.5">
                  {FOX_CHARACTER_TIERS.map((tier) => {
                    const isUnlocked = user.level >= tier.requiredLevel;
                    const isSelected = previewTier.id === tier.id;
                    const isEquipped = activeTier.id === tier.id;

                    return (
                      <button
                        key={tier.id}
                        type="button"
                        onClick={() => {
                          setPreviewTierId(tier.id);
                          sound.playTap();
                          TelegramService.hapticSelection();
                        }}
                        className={`flex flex-col items-center rounded-xl p-1.5 border transition cursor-pointer relative ${
                          isSelected
                            ? 'bg-gradient-to-b from-amber-500/25 to-[#131C33] border-2 border-amber-400 shadow-[0_0_14px_rgba(245,158,11,0.3)]'
                            : isEquipped
                            ? 'bg-emerald-500/10 border-emerald-400/60'
                            : 'bg-[#0D1323] border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <span className="text-[9px] font-black text-amber-300 leading-tight">
                          Lv {tier.requiredLevel}
                        </span>
                        <span className="text-[9px] font-bold text-white truncate w-full text-center mb-1">
                          {tier.shortTitle}
                        </span>

                        <div className="relative w-full aspect-[1/1.6] rounded-lg overflow-hidden bg-[#070A12] border border-slate-800/80 mb-1">
                          <img
                            src={tier.imageUrl}
                            alt={tier.fullTitle}
                            className={`w-full h-full object-contain ${
                              isUnlocked ? '' : 'grayscale opacity-65'
                            }`}
                          />
                          {!isUnlocked && (
                            <div className="absolute inset-0 bg-black/45 flex items-center justify-center">
                              <Lock className="w-3.5 h-3.5 text-amber-300" />
                            </div>
                          )}
                        </div>

                        <span
                          className={`text-[8px] font-black px-1 py-0.5 rounded w-full text-center truncate ${
                            isEquipped
                              ? 'bg-emerald-500/25 text-emerald-300'
                              : isUnlocked
                              ? 'bg-amber-500/20 text-amber-200'
                              : 'bg-slate-900 text-slate-400'
                          }`}
                        >
                          {isEquipped ? 'Equipped' : isUnlocked ? 'Unlocked' : `Lv ${tier.requiredLevel}`}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 4 Special Character Skins / Outfits Section */}
              <div>
                <div className="flex items-center justify-between mb-1.5 px-0.5">
                  <span className="text-xs font-black text-amber-200">
                    Special Hero Skins & Outfits
                  </span>
                  <span className="text-[10px] font-semibold text-slate-400">
                    Cosmetic Style
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {FOX_CHARACTER_SKINS.map((skin) => {
                    const skinUnlocked = user.level >= skin.requiredLevel;
                    const skinEquipped = activeSkin.id === skin.id;

                    return (
                      <div
                        key={skin.id}
                        onClick={() => {
                          setPreviewSkinId(skin.id);
                          if (skinUnlocked) {
                            onSelectSkin(skin.id);
                            sound.playTap();
                            TelegramService.hapticSelection();
                          }
                        }}
                        className={`flex items-center gap-2 p-2 rounded-xl border transition cursor-pointer ${
                          skinEquipped
                            ? 'bg-amber-500/15 border-amber-400 shadow-sm'
                            : skinUnlocked
                            ? 'bg-[#0D1323] border-slate-800 hover:border-slate-700'
                            : 'bg-[#090D18]/70 border-slate-900 opacity-75'
                        }`}
                      >
                        <div className="relative w-12 h-10 rounded-lg overflow-hidden border border-slate-700 shrink-0 bg-[#060911]">
                          <img
                            src={skin.imageUrl}
                            alt={skin.name}
                            className={`w-full h-full object-cover ${skinUnlocked ? '' : 'grayscale'}`}
                          />
                          {!skinUnlocked && (
                            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                              <Lock className="w-3 h-3 text-amber-300" />
                            </div>
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="text-[11px] font-black text-white truncate">
                            {skin.name}
                          </div>
                          <div className="text-[9px] font-bold text-slate-400 truncate">
                            {skinUnlocked
                              ? skinEquipped
                                ? 'Equipped Skin'
                                : 'Tap to Equip'
                              : `Unlocks Lv ${skin.requiredLevel}`}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
