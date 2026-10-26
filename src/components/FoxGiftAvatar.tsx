import React, { useState } from 'react';

export type NftRarity = 'Common' | 'Rare' | 'Epic' | 'Legendary' | 'Mythic';

export interface FoxGiftTrait {
  label: string;
  value: string;
}

export interface FoxGiftMeta {
  id: string;
  nftTitle: string;
  collectionSeries: string;
  collectionNumber: string;
  collectionOrder: number;
  rarity: 'Common' | 'Rare' | 'Epic' | 'Legendary' | 'Mythic';
  rarityRank: number;
  bonusPercent: number;
  imageUrl: string;
  objectPosition?: string;
  lore: string;
  attributes: FoxGiftTrait[];
  rarityColor: string;
  rarityBadgeBg: string;
  rarityBorder: string;
  glowShadow: string;
  cardBgGradient: string;
  primaryFur: string;
  secondaryFur: string;
  eyeColor: string;
  accentColor: string;
  accessoryType:
    | 'star_glasses'
    | 'sakura_wreath'
    | 'cyber_visor'
    | 'pirate_eyepatch'
    | 'arctic_scarf'
    | 'samurai_helm'
    | 'pharaoh_nemes'
    | 'astro_helmet'
    | 'royal_crown'
    | 'diamond_halo'
    | 'inferno_horns'
    | 'emerald_tiara'
    | 'nebula_mask'
    | 'celestial_crown';
}

export const FOX_GIFT_META: Record<string, FoxGiftMeta> = {
  gift_star_fox: {
    id: 'gift_star_fox',
    nftTitle: 'Forest Scout Fox',
    collectionSeries: 'Forest Collection',
    collectionNumber: '#0032',
    collectionOrder: 32,
    rarity: 'Common',
    rarityRank: 1,
    bonusPercent: 5,
    imageUrl: '/assets/nft/nft_forest_scout.png',
    objectPosition: 'center 20%',
    lore: 'An agile woodland tracker cloaked in emerald ranger leather, scouting ancient trails to uncover hidden FOX caches.',
    attributes: [
      { label: 'Class', value: 'Ranger Scout' },
      { label: 'Element', value: 'Sylvan Earth' },
      { label: 'Headgear', value: 'Emerald Cloak' },
      { label: 'Yield Boost', value: '+5% Passive' },
    ],
    rarityColor: 'text-emerald-300',
    rarityBadgeBg: 'bg-emerald-950/90 border-emerald-400/70 text-emerald-300',
    rarityBorder: 'border-emerald-400/70 hover:border-emerald-300',
    glowShadow: 'shadow-[0_0_24px_rgba(16,185,129,0.28)]',
    cardBgGradient: 'from-[#07261E] via-[#071A17] to-[#060B12]',
    primaryFur: '#F97316',
    secondaryFur: '#FDBA74',
    eyeColor: '#10B981',
    accentColor: '#34D399',
    accessoryType: 'star_glasses',
  },
  gift_sakura_fox: {
    id: 'gift_sakura_fox',
    nftTitle: 'Samurai Fox',
    collectionSeries: 'Samurai Collection',
    collectionNumber: '#0107',
    collectionOrder: 107,
    rarity: 'Rare',
    rarityRank: 2,
    bonusPercent: 10,
    imageUrl: '/assets/nft/nft_samurai_blossom.png',
    objectPosition: 'center 18%',
    lore: 'Sworn protector of the Crimson Blossom Shrine, wielding twin ancestral katana blades forged in starlight steel.',
    attributes: [
      { label: 'Class', value: 'Blossom Blade' },
      { label: 'Element', value: 'Wind & Petal' },
      { label: 'Armor', value: 'Lacquer Do-Maru' },
      { label: 'Yield Boost', value: '+10% Passive' },
    ],
    rarityColor: 'text-sky-300',
    rarityBadgeBg: 'bg-sky-950/90 border-sky-400/70 text-sky-300',
    rarityBorder: 'border-sky-400/75 hover:border-sky-300',
    glowShadow: 'shadow-[0_0_24px_rgba(14,165,233,0.3)]',
    cardBgGradient: 'from-[#08223A] via-[#081629] to-[#060B14]',
    primaryFur: '#FB7185',
    secondaryFur: '#FECDD3',
    eyeColor: '#38BDF8',
    accentColor: '#38BDF8',
    accessoryType: 'sakura_wreath',
  },
  gift_cyber_fox: {
    id: 'gift_cyber_fox',
    nftTitle: 'Cyber Fox',
    collectionSeries: 'Cyber Collection',
    collectionNumber: '#0068',
    collectionOrder: 68,
    rarity: 'Epic',
    rarityRank: 3,
    bonusPercent: 15,
    imageUrl: '/assets/nft/nft_cyber_visor.png',
    objectPosition: 'center 20%',
    lore: 'Outfitted with a holographic neural visor and neon-core armor, overclocking mining nodes across New Shibuya.',
    attributes: [
      { label: 'Class', value: 'Netrunner' },
      { label: 'Element', value: 'Neon Plasma' },
      { label: 'Optics', value: 'Quantum Visor' },
      { label: 'Yield Boost', value: '+15% Passive' },
    ],
    rarityColor: 'text-purple-300',
    rarityBadgeBg: 'bg-purple-950/90 border-purple-400/75 text-purple-200',
    rarityBorder: 'border-purple-400/75 hover:border-purple-300',
    glowShadow: 'shadow-[0_0_26px_rgba(168,85,247,0.34)]',
    cardBgGradient: 'from-[#230E3B] via-[#140B29] to-[#070912]',
    primaryFur: '#0EA5E9',
    secondaryFur: '#BAE6FD',
    eyeColor: '#C084FC',
    accentColor: '#A855F7',
    accessoryType: 'cyber_visor',
  },
  gift_pirate_fox: {
    id: 'gift_pirate_fox',
    nftTitle: 'Pilot Fox',
    collectionSeries: 'Sky Collection',
    collectionNumber: '#0112',
    collectionOrder: 112,
    rarity: 'Common',
    rarityRank: 1,
    bonusPercent: 5,
    imageUrl: '/assets/nft/nft_pilot_sky.png',
    objectPosition: 'center 20%',
    lore: 'Fearless stratosphere navigator soaring above the clouds in a brass-trimmed leather flight jacket and aviator goggles.',
    attributes: [
      { label: 'Class', value: 'Sky Captain' },
      { label: 'Element', value: 'Jetstream' },
      { label: 'Headgear', value: 'Aviator Goggles' },
      { label: 'Yield Boost', value: '+5% Passive' },
    ],
    rarityColor: 'text-emerald-300',
    rarityBadgeBg: 'bg-emerald-950/90 border-emerald-400/70 text-emerald-300',
    rarityBorder: 'border-emerald-400/70 hover:border-emerald-300',
    glowShadow: 'shadow-[0_0_24px_rgba(16,185,129,0.28)]',
    cardBgGradient: 'from-[#07261E] via-[#071A17] to-[#060B12]',
    primaryFur: '#EA580C',
    secondaryFur: '#FED7AA',
    eyeColor: '#34D399',
    accentColor: '#10B981',
    accessoryType: 'pirate_eyepatch',
  },
  gift_arctic_fox: {
    id: 'gift_arctic_fox',
    nftTitle: 'Snow Fox',
    collectionSeries: 'Winter Collection',
    collectionNumber: '#0089',
    collectionOrder: 89,
    rarity: 'Rare',
    rarityRank: 2,
    bonusPercent: 10,
    imageUrl: '/assets/nft/nft_snow_winter.png',
    objectPosition: 'center 18%',
    lore: 'Born beneath the northern aurora, wrapped in frost-woven wool that radiates sub-zero superconducting efficiency.',
    attributes: [
      { label: 'Class', value: 'Frost Warden' },
      { label: 'Element', value: 'Glacial Ice' },
      { label: 'Attire', value: 'Aurora Knit' },
      { label: 'Yield Boost', value: '+10% Passive' },
    ],
    rarityColor: 'text-sky-300',
    rarityBadgeBg: 'bg-sky-950/90 border-sky-400/70 text-sky-300',
    rarityBorder: 'border-sky-400/75 hover:border-sky-300',
    glowShadow: 'shadow-[0_0_24px_rgba(14,165,233,0.3)]',
    cardBgGradient: 'from-[#08223A] via-[#081629] to-[#060B14]',
    primaryFur: '#E2E8F0',
    secondaryFur: '#FFFFFF',
    eyeColor: '#0EA5E9',
    accentColor: '#38BDF8',
    accessoryType: 'arctic_scarf',
  },
  gift_samurai_fox: {
    id: 'gift_samurai_fox',
    nftTitle: 'Wizard Fox',
    collectionSeries: 'Magic Collection',
    collectionNumber: '#0045',
    collectionOrder: 45,
    rarity: 'Epic',
    rarityRank: 3,
    bonusPercent: 15,
    imageUrl: '/assets/nft/nft_wizard_magic.png',
    objectPosition: 'center 15%',
    lore: 'Grand Arcanist of the Astral Spire, channeling rune-inscribed starlight to multiply treasury reserves.',
    attributes: [
      { label: 'Class', value: 'Grand Arcanist' },
      { label: 'Element', value: 'Arcane Ether' },
      { label: 'Relic', value: 'Runed Spire Hat' },
      { label: 'Yield Boost', value: '+15% Passive' },
    ],
    rarityColor: 'text-purple-300',
    rarityBadgeBg: 'bg-purple-950/90 border-purple-400/75 text-purple-200',
    rarityBorder: 'border-purple-400/75 hover:border-purple-300',
    glowShadow: 'shadow-[0_0_26px_rgba(168,85,247,0.34)]',
    cardBgGradient: 'from-[#230E3B] via-[#140B29] to-[#070912]',
    primaryFur: '#DC2626',
    secondaryFur: '#FCA5A5',
    eyeColor: '#FACC15',
    accentColor: '#A855F7',
    accessoryType: 'samurai_helm',
  },
  gift_pharaoh_fox: {
    id: 'gift_pharaoh_fox',
    nftTitle: 'Royal Fox',
    collectionSeries: 'Royal Collection',
    collectionNumber: '#0021',
    collectionOrder: 21,
    rarity: 'Legendary',
    rarityRank: 4,
    bonusPercent: 25,
    imageUrl: '/assets/nft/nft_royal_king.png',
    objectPosition: 'center 18%',
    lore: 'Crowned sovereign of the Citadel Vault, clad in filigree gold plate and commanding the Royal Mint.',
    attributes: [
      { label: 'Class', value: 'Vault Monarch' },
      { label: 'Element', value: 'Sovereign Gold' },
      { label: 'Regalia', value: 'Imperial Crown' },
      { label: 'Yield Boost', value: '+25% Passive' },
    ],
    rarityColor: 'text-amber-300',
    rarityBadgeBg: 'bg-amber-950/90 border-amber-400/80 text-amber-300',
    rarityBorder: 'border-amber-400/80 hover:border-amber-300',
    glowShadow: 'shadow-[0_0_28px_rgba(245,158,11,0.36)]',
    cardBgGradient: 'from-[#332007] via-[#1E1306] to-[#080A11]',
    primaryFur: '#F59E0B',
    secondaryFur: '#FDE68A',
    eyeColor: '#10B981',
    accentColor: '#F59E0B',
    accessoryType: 'pharaoh_nemes',
  },
  gift_astronaut_fox: {
    id: 'gift_astronaut_fox',
    nftTitle: 'Sun God Fox',
    collectionSeries: 'Divine Collection',
    collectionNumber: '#0007',
    collectionOrder: 7,
    rarity: 'Legendary',
    rarityRank: 4,
    bonusPercent: 25,
    imageUrl: '/assets/nft/nft_sungod_divine.png',
    objectPosition: 'center 18%',
    lore: 'Radiant avatar of the solar forge, wreathed in living golden flares that supercharge every FOX generator.',
    attributes: [
      { label: 'Class', value: 'Solar Avatar' },
      { label: 'Element', value: 'Helios Flare' },
      { label: 'Armor', value: 'Sunfire Plate' },
      { label: 'Yield Boost', value: '+25% Passive' },
    ],
    rarityColor: 'text-amber-300',
    rarityBadgeBg: 'bg-amber-950/90 border-amber-400/80 text-amber-300',
    rarityBorder: 'border-amber-400/80 hover:border-amber-300',
    glowShadow: 'shadow-[0_0_28px_rgba(245,158,11,0.36)]',
    cardBgGradient: 'from-[#332007] via-[#1E1306] to-[#080A11]',
    primaryFur: '#FB923C',
    secondaryFur: '#FFEDD5',
    eyeColor: '#60A5FA',
    accentColor: '#F59E0B',
    accessoryType: 'astro_helmet',
  },
  gift_royal_fox: {
    id: 'gift_royal_fox',
    nftTitle: 'Shadow Shogun Fox',
    collectionSeries: 'Ronin Collection',
    collectionNumber: '#0014',
    collectionOrder: 14,
    rarity: 'Epic',
    rarityRank: 3,
    bonusPercent: 18,
    imageUrl: '/assets/nft/nft_shogun_ronin.png',
    objectPosition: 'center 14%',
    lore: 'Supreme commander of the Midnight Ronin Vanguard, striking from the shadows with unmatched precision.',
    attributes: [
      { label: 'Class', value: 'Shadow Shogun' },
      { label: 'Element', value: 'Void Steel' },
      { label: 'Crest', value: 'Crescent Kabuto' },
      { label: 'Yield Boost', value: '+18% Passive' },
    ],
    rarityColor: 'text-purple-300',
    rarityBadgeBg: 'bg-purple-950/90 border-purple-400/75 text-purple-200',
    rarityBorder: 'border-purple-400/75 hover:border-purple-300',
    glowShadow: 'shadow-[0_0_26px_rgba(168,85,247,0.34)]',
    cardBgGradient: 'from-[#230E3B] via-[#140B29] to-[#070912]',
    primaryFur: '#D97706',
    secondaryFur: '#FEF3C7',
    eyeColor: '#A855F7',
    accentColor: '#A855F7',
    accessoryType: 'royal_crown',
  },
  gift_diamond_fox: {
    id: 'gift_diamond_fox',
    nftTitle: 'Diamond Genesis Fox',
    collectionSeries: 'Crystal Collection',
    collectionNumber: '#0009',
    collectionOrder: 9,
    rarity: 'Legendary',
    rarityRank: 4,
    bonusPercent: 25,
    imageUrl: '/assets/nft/nft_diamond_crystal.png',
    objectPosition: 'center 16%',
    lore: 'Crystallized under extreme Genesis-block pressure, refracting pure starlight into high-yield FOX streams.',
    attributes: [
      { label: 'Class', value: 'Genesis Paladin' },
      { label: 'Element', value: 'Pure Diamond' },
      { label: 'Aegis', value: 'Prism Plate' },
      { label: 'Yield Boost', value: '+25% Passive' },
    ],
    rarityColor: 'text-amber-300',
    rarityBadgeBg: 'bg-amber-950/90 border-amber-400/80 text-amber-300',
    rarityBorder: 'border-amber-400/80 hover:border-amber-300',
    glowShadow: 'shadow-[0_0_28px_rgba(245,158,11,0.36)]',
    cardBgGradient: 'from-[#332007] via-[#1E1306] to-[#080A11]',
    primaryFur: '#38BDF8',
    secondaryFur: '#E0F2FE',
    eyeColor: '#FFFFFF',
    accentColor: '#F59E0B',
    accessoryType: 'diamond_halo',
  },
  gift_inferno_fox: {
    id: 'gift_inferno_fox',
    nftTitle: 'Inferno Drake Fox',
    collectionSeries: 'Volcanic Collection',
    collectionNumber: '#0005',
    collectionOrder: 5,
    rarity: 'Legendary',
    rarityRank: 4,
    bonusPercent: 28,
    imageUrl: '/assets/nft/nft_inferno_volcanic.png',
    objectPosition: 'center 12%',
    lore: 'Tempered in the magma chambers of Mount Pyre, fueling volcanic turbines that smelt raw ore into pure FOX.',
    attributes: [
      { label: 'Class', value: 'Pyre Warlord' },
      { label: 'Element', value: 'Magma Core' },
      { label: 'Armor', value: 'Obsidian Scale' },
      { label: 'Yield Boost', value: '+28% Passive' },
    ],
    rarityColor: 'text-amber-300',
    rarityBadgeBg: 'bg-amber-950/90 border-amber-400/80 text-amber-300',
    rarityBorder: 'border-amber-400/80 hover:border-amber-300',
    glowShadow: 'shadow-[0_0_28px_rgba(245,158,11,0.36)]',
    cardBgGradient: 'from-[#332007] via-[#1E1306] to-[#080A11]',
    primaryFur: '#EF4444',
    secondaryFur: '#FDE047',
    eyeColor: '#FEF08A',
    accentColor: '#F97316',
    accessoryType: 'inferno_horns',
  },
  gift_emerald_fox: {
    id: 'gift_emerald_fox',
    nftTitle: 'Emerald Oracle Fox',
    collectionSeries: 'Jade Collection',
    collectionNumber: '#0003',
    collectionOrder: 3,
    rarity: 'Mythic',
    rarityRank: 5,
    bonusPercent: 35,
    imageUrl: '/assets/nft/nft_emerald_oracle.png',
    objectPosition: 'center 14%',
    lore: 'Keeper of the Jade Prophecy, harmonizing ancient alchemy with quantum ledger prediction.',
    attributes: [
      { label: 'Class', value: 'Jade Oracle' },
      { label: 'Element', value: 'Imperial Jade' },
      { label: 'Relic', value: 'Heart of Gaia' },
      { label: 'Yield Boost', value: '+35% Passive' },
    ],
    rarityColor: 'text-pink-300',
    rarityBadgeBg: 'bg-pink-950/90 border-pink-400/80 text-pink-200',
    rarityBorder: 'border-pink-400/80 hover:border-pink-300',
    glowShadow: 'shadow-[0_0_30px_rgba(236,72,153,0.38)]',
    cardBgGradient: 'from-[#360B28] via-[#1E0921] to-[#080912]',
    primaryFur: '#10B981',
    secondaryFur: '#A7F3D0',
    eyeColor: '#ECFDF5',
    accentColor: '#EC4899',
    accessoryType: 'emerald_tiara',
  },
  gift_nebula_fox: {
    id: 'gift_nebula_fox',
    nftTitle: 'Nebula Voyager Fox',
    collectionSeries: 'Cosmic Collection',
    collectionNumber: '#0002',
    collectionOrder: 2,
    rarity: 'Mythic',
    rarityRank: 5,
    bonusPercent: 40,
    imageUrl: '/assets/nft/nft_nebula_cosmic.png',
    objectPosition: 'center 14%',
    lore: 'Interdimensional navigator harvesting dark-matter stardust from the Andromeda Nebula.',
    attributes: [
      { label: 'Class', value: 'Astral Voyager' },
      { label: 'Element', value: 'Dark Matter' },
      { label: 'Core', value: 'Quasar Drive' },
      { label: 'Yield Boost', value: '+40% Passive' },
    ],
    rarityColor: 'text-pink-300',
    rarityBadgeBg: 'bg-pink-950/90 border-pink-400/80 text-pink-200',
    rarityBorder: 'border-pink-400/80 hover:border-pink-300',
    glowShadow: 'shadow-[0_0_30px_rgba(236,72,153,0.38)]',
    cardBgGradient: 'from-[#360B28] via-[#1E0921] to-[#080912]',
    primaryFur: '#8B5CF6',
    secondaryFur: '#DDD6FE',
    eyeColor: '#38BDF8',
    accentColor: '#EC4899',
    accessoryType: 'nebula_mask',
  },
  gift_celestial_fox: {
    id: 'gift_celestial_fox',
    nftTitle: 'Celestial Sovereign Fox',
    collectionSeries: 'Astral Collection',
    collectionNumber: '#0001',
    collectionOrder: 1,
    rarity: 'Mythic',
    rarityRank: 5,
    bonusPercent: 50,
    imageUrl: '/assets/nft/nft_celestial_sovereign.png',
    objectPosition: 'center 12%',
    lore: 'Edition #0001 Supreme Architect of the FOX multiverse, reigning over the eternal Golden Treasury.',
    attributes: [
      { label: 'Class', value: 'Apex Sovereign' },
      { label: 'Element', value: 'Cosmic Gold' },
      { label: 'Regalia', value: 'Crown of Infinity' },
      { label: 'Yield Boost', value: '+50% Passive' },
    ],
    rarityColor: 'text-pink-300',
    rarityBadgeBg: 'bg-pink-950/90 border-pink-400/80 text-pink-200',
    rarityBorder: 'border-pink-400/80 hover:border-pink-300',
    glowShadow: 'shadow-[0_0_32px_rgba(236,72,153,0.42)]',
    cardBgGradient: 'from-[#360B28] via-[#1E0921] to-[#080912]',
    primaryFur: '#FBBF24',
    secondaryFur: '#FEF9C3',
    eyeColor: '#FFFFFF',
    accentColor: '#F472B6',
    accessoryType: 'celestial_crown',
  },
};

export function getFoxGiftMeta(
  giftId: string
): FoxGiftMeta & { title: string; backdropName: string } {
  const base = FOX_GIFT_META[giftId] || FOX_GIFT_META.gift_star_fox;
  return { ...base, title: base.nftTitle, backdropName: base.collectionSeries };
}

export const getFoxGiftMetadata = getFoxGiftMeta;

/**
 * Hexagonal Fox Emblem Badge used in the Collection Header and on the bottom-left of every NFT Card.
 */
export const FoxCollectionHexBadge: React.FC<{
  size?: 'sm' | 'md' | 'lg';
  rarity?: FoxGiftMeta['rarity'];
  className?: string;
}> = ({ size = 'sm', rarity = 'Legendary', className = '' }) => {
  const strokeMap: Record<FoxGiftMeta['rarity'], string> = {
    Common: '#34D399',
    Rare: '#38BDF8',
    Epic: '#C084FC',
    Legendary: '#FBBF24',
    Mythic: '#F472B6',
  };
  const strokeColor = strokeMap[rarity] || '#FBBF24';

  const dims =
    size === 'lg'
      ? 'w-16 h-16 sm:w-20 sm:h-20'
      : size === 'md'
      ? 'w-9 h-9'
      : 'w-6 h-6';

  return (
    <div className={`relative inline-flex items-center justify-center select-none ${dims} ${className}`}>
      <svg viewBox="0 0 64 64" fill="none" className="w-full h-full drop-shadow-[0_2px_6px_rgba(0,0,0,0.85)]">
        <defs>
          <linearGradient id={`hex_bg_${rarity}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#1E2436" />
            <stop offset="100%" stopColor="#090C15" />
          </linearGradient>
          <linearGradient id="hex_fox_gold" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FEF08A" />
            <stop offset="50%" stopColor="#F59E0B" />
            <stop offset="100%" stopColor="#B45309" />
          </linearGradient>
        </defs>
        {/* Outer Hexagon */}
        <polygon
          points="32,3 57,17 57,47 32,61 7,47 7,17"
          fill={`url(#hex_bg_${rarity})`}
          stroke={strokeColor}
          strokeWidth="3.5"
        />
        {/* Inner Hexagon Rim */}
        <polygon
          points="32,8 52,19.5 52,44.5 32,56 12,44.5 12,19.5"
          fill="none"
          stroke="url(#hex_fox_gold)"
          strokeWidth="1.2"
          strokeOpacity="0.65"
        />
        {/* Stylized Fox Crest Inside */}
        <path
          d="M19 19 L26 27 L32 24 L38 27 L45 19 L43 36 L32 47 L21 36 Z"
          fill="url(#hex_fox_gold)"
        />
        <polygon points="22,22 26,27 23,30" fill="#090C15" />
        <polygon points="42,22 38,27 41,30" fill="#090C15" />
        <polygon points="24,34 29,36 25,37" fill="#090C15" />
        <polygon points="40,34 35,36 39,37" fill="#090C15" />
        <polygon points="30,41 34,41 32,44" fill="#090C15" />
      </svg>
    </div>
  );
};

interface FoxGiftAvatarProps {
  giftId: string;
  size?: string;
  className?: string;
  imgClassName?: string;
  priority?: boolean;
}

export const FoxGiftAvatar: React.FC<FoxGiftAvatarProps> = ({
  giftId,
  className = 'w-full h-full',
  imgClassName = 'object-cover',
  priority = false,
}) => {
  const meta = getFoxGiftMeta(giftId);
  const [imgError, setImgError] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);

  if (!imgError && meta.imageUrl) {
    return (
      <div className={`relative overflow-hidden select-none bg-[#070A12] ${className}`}>
        {!imgLoaded && (
          <div
            className={`absolute inset-0 bg-gradient-to-br ${meta.cardBgGradient} animate-pulse`}
          />
        )}
        <img
          src={meta.imageUrl}
          alt={meta.nftTitle}
          width={1024}
          height={1024}
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
          fetchPriority={priority ? 'high' : 'auto'}
          onLoad={() => setImgLoaded(true)}
          onError={() => setImgError(true)}
          style={{ objectPosition: meta.objectPosition || 'center 18%' }}
          className={`w-full h-full ${imgClassName} transition-all duration-300 ${
            imgLoaded ? 'opacity-100' : 'opacity-0'
          }`}
        />
      </div>
    );
  }

  // Clean SVG Fallback if image fails to load
  return (
    <div className={`relative flex items-center justify-center select-none bg-[#070A12] ${className}`}>
      <svg viewBox="0 0 120 120" className="w-full h-full overflow-visible">
        <defs>
          <radialGradient id={`aura_${giftId}`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={meta.accentColor} stopOpacity="0.45" />
            <stop offset="70%" stopColor={meta.primaryFur} stopOpacity="0.15" />
            <stop offset="100%" stopColor="#000000" stopOpacity="0" />
          </radialGradient>
        </defs>
        <circle cx="60" cy="62" r="50" fill={`url(#aura_${giftId})`} />
        <path d="M 24 62 L 18 20 L 50 42 Z" fill={meta.primaryFur} />
        <path d="M 96 62 L 102 20 L 70 42 Z" fill={meta.primaryFur} />
        <path
          d="M 22 62 C 22 36, 98 36, 98 62 C 102 78, 82 98, 60 102 C 38 98, 18 78, 22 62 Z"
          fill={meta.primaryFur}
        />
        <ellipse cx="44" cy="66" rx="5.5" ry="6.5" fill="#0F172A" />
        <ellipse cx="76" cy="66" rx="5.5" ry="6.5" fill="#0F172A" />
        <polygon points="55,80 65,80 60,87" fill="#0F172A" />
      </svg>
    </div>
  );
};

