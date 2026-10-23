import React from 'react';

export interface FoxGiftMetadata {
  id: string;
  rarity: 'Common' | 'Rare' | 'Epic' | 'Legendary' | 'Mythic';
  starsEquivalent: number;
  totalSupply: string;
  backdropName: string;
  gradientClass: string;
  borderClass: string;
  accentTextClass: string;
  primaryColor: string;
  secondaryColor: string;
  accessoryLabel: string;
}

export const FOX_GIFT_METADATA: Record<string, FoxGiftMetadata> = {
  gift_star_fox: {
    id: 'gift_star_fox',
    rarity: 'Common',
    starsEquivalent: 50,
    totalSupply: '25,000',
    backdropName: 'Amber Starlight',
    gradientClass: 'from-amber-500/30 via-orange-900/40 to-slate-950',
    borderClass: 'border-amber-500/40',
    accentTextClass: 'text-amber-300',
    primaryColor: '#F59E0B',
    secondaryColor: '#FDE68A',
    accessoryLabel: 'Telegram Star Box',
  },
  gift_sakura_fox: {
    id: 'gift_sakura_fox',
    rarity: 'Rare',
    starsEquivalent: 100,
    totalSupply: '10,000',
    backdropName: 'Kyoto Blossom',
    gradientClass: 'from-pink-500/30 via-rose-950/40 to-slate-950',
    borderClass: 'border-pink-500/40',
    accentTextClass: 'text-pink-300',
    primaryColor: '#EC4899',
    secondaryColor: '#FBCFE8',
    accessoryLabel: '9-Tail Silk Ribbon',
  },
  gift_cyber_fox: {
    id: 'gift_cyber_fox',
    rarity: 'Rare',
    starsEquivalent: 250,
    totalSupply: '7,500',
    backdropName: 'Neon Synthwave',
    gradientClass: 'from-cyan-500/30 via-indigo-950/50 to-slate-950',
    borderClass: 'border-cyan-500/40',
    accentTextClass: 'text-cyan-300',
    primaryColor: '#06B6D4',
    secondaryColor: '#A5F3FC',
    accessoryLabel: 'Holo-TON Visor',
  },
  gift_pirate_fox: {
    id: 'gift_pirate_fox',
    rarity: 'Rare',
    starsEquivalent: 350,
    totalSupply: '5,000',
    backdropName: 'Corsair Gold',
    gradientClass: 'from-orange-500/30 via-red-950/40 to-slate-950',
    borderClass: 'border-orange-500/40',
    accentTextClass: 'text-orange-300',
    primaryColor: '#F97316',
    secondaryColor: '#FED7AA',
    accessoryLabel: 'Captain Tricorne Hat',
  },
  gift_arctic_fox: {
    id: 'gift_arctic_fox',
    rarity: 'Epic',
    starsEquivalent: 500,
    totalSupply: '3,000',
    backdropName: 'Glacial Aurora',
    gradientClass: 'from-sky-400/30 via-blue-950/50 to-slate-950',
    borderClass: 'border-sky-400/50',
    accentTextClass: 'text-sky-300',
    primaryColor: '#38BDF8',
    secondaryColor: '#E0F2FE',
    accessoryLabel: 'Frost Crystal Diadem',
  },
  gift_samurai_fox: {
    id: 'gift_samurai_fox',
    rarity: 'Epic',
    starsEquivalent: 750,
    totalSupply: '2,000',
    backdropName: 'Crimson Shogunate',
    gradientClass: 'from-red-500/35 via-rose-950/50 to-slate-950',
    borderClass: 'border-red-500/50',
    accentTextClass: 'text-red-300',
    primaryColor: '#EF4444',
    secondaryColor: '#FCA5A5',
    accessoryLabel: 'Golden Kabuto Crest',
  },
  gift_pharaoh_fox: {
    id: 'gift_pharaoh_fox',
    rarity: 'Epic',
    starsEquivalent: 1000,
    totalSupply: '1,500',
    backdropName: 'Luxor Dynasty',
    gradientClass: 'from-yellow-500/35 via-amber-950/50 to-slate-950',
    borderClass: 'border-yellow-500/50',
    accentTextClass: 'text-yellow-300',
    primaryColor: '#EAB308',
    secondaryColor: '#FEF08A',
    accessoryLabel: 'Nemes Sun Headdress',
  },
  gift_astronaut_fox: {
    id: 'gift_astronaut_fox',
    rarity: 'Legendary',
    starsEquivalent: 1500,
    totalSupply: '1,000',
    backdropName: 'Deep Nebula',
    gradientClass: 'from-purple-500/35 via-violet-950/50 to-slate-950',
    borderClass: 'border-purple-500/50',
    accentTextClass: 'text-purple-300',
    primaryColor: '#A855F7',
    secondaryColor: '#E9D5FF',
    accessoryLabel: 'Zero-G Gold Helmet',
  },
  gift_royal_fox: {
    id: 'gift_royal_fox',
    rarity: 'Legendary',
    starsEquivalent: 2500,
    totalSupply: '750',
    backdropName: 'Imperial Velvet',
    gradientClass: 'from-amber-400/40 via-emerald-950/50 to-slate-950',
    borderClass: 'border-amber-400/60',
    accentTextClass: 'text-amber-200',
    primaryColor: '#FBBF24',
    secondaryColor: '#6EE7B7',
    accessoryLabel: 'Sovereign Crown',
  },
  gift_diamond_fox: {
    id: 'gift_diamond_fox',
    rarity: 'Mythic',
    starsEquivalent: 5000,
    totalSupply: '500',
    backdropName: 'Pure Diamond Genesis',
    gradientClass: 'from-teal-400/40 via-cyan-900/50 to-slate-950',
    borderClass: 'border-teal-300/70',
    accentTextClass: 'text-teal-200',
    primaryColor: '#2DD4BF',
    secondaryColor: '#CCFBF1',
    accessoryLabel: '1-of-500 Diamond Facet',
  },
  gift_inferno_fox: {
    id: 'gift_inferno_fox',
    rarity: 'Legendary',
    starsEquivalent: 7500,
    totalSupply: '350',
    backdropName: 'Volcanic Magma Core',
    gradientClass: 'from-orange-500/45 via-red-950/60 to-slate-950',
    borderClass: 'border-orange-400/70',
    accentTextClass: 'text-orange-200',
    primaryColor: '#F97316',
    secondaryColor: '#FDE047',
    accessoryLabel: 'Blazing Magma Halo',
  },
  gift_emerald_fox: {
    id: 'gift_emerald_fox',
    rarity: 'Legendary',
    starsEquivalent: 10000,
    totalSupply: '250',
    backdropName: 'Imperial Jade Palace',
    gradientClass: 'from-emerald-400/40 via-green-950/55 to-slate-950',
    borderClass: 'border-emerald-400/70',
    accentTextClass: 'text-emerald-200',
    primaryColor: '#10B981',
    secondaryColor: '#A7F3D0',
    accessoryLabel: 'Imperial Jade Scepter',
  },
  gift_nebula_fox: {
    id: 'gift_nebula_fox',
    rarity: 'Mythic',
    starsEquivalent: 15000,
    totalSupply: '150',
    backdropName: 'Andromeda Singularity',
    gradientClass: 'from-fuchsia-500/45 via-indigo-950/60 to-slate-950',
    borderClass: 'border-fuchsia-400/75',
    accentTextClass: 'text-fuchsia-200',
    primaryColor: '#D946EF',
    secondaryColor: '#F5D0FE',
    accessoryLabel: 'Dark-Matter Orbit Ring',
  },
  gift_celestial_fox: {
    id: 'gift_celestial_fox',
    rarity: 'Mythic',
    starsEquivalent: 25000,
    totalSupply: '77',
    backdropName: 'Solaris Pantheon',
    gradientClass: 'from-yellow-300/45 via-amber-900/60 to-slate-950',
    borderClass: 'border-yellow-300/80',
    accentTextClass: 'text-yellow-100',
    primaryColor: '#FACC15',
    secondaryColor: '#FEF9C3',
    accessoryLabel: 'Divine Solar Halo',
  },
};

export function getFoxGiftMetadata(giftId: string, basePrice?: number): FoxGiftMetadata {
  if (FOX_GIFT_METADATA[giftId]) {
    if (basePrice && basePrice > 0) {
      return { ...FOX_GIFT_METADATA[giftId], starsEquivalent: basePrice };
    }
    return FOX_GIFT_METADATA[giftId];
  }
  const price = basePrice || 250;
  const rarity: FoxGiftMetadata['rarity'] =
    price >= 15_000
      ? 'Mythic'
      : price >= 1_500
      ? 'Legendary'
      : price >= 500
      ? 'Epic'
      : price >= 100
      ? 'Rare'
      : 'Common';

  return {
    id: giftId,
    rarity,
    starsEquivalent: Math.max(50, price),
    totalSupply: '1,000',
    backdropName: 'Custom Fox Edition',
    gradientClass: 'from-amber-500/35 via-orange-950/50 to-slate-950',
    borderClass: 'border-amber-400/50',
    accentTextClass: 'text-amber-300',
    primaryColor: '#F59E0B',
    secondaryColor: '#FDE68A',
    accessoryLabel: 'Limited Edition Crest',
  };
}

interface FoxGiftAvatarProps {
  giftId: string;
  size?: 'sm' | 'md' | 'lg';
}

export const FoxGiftAvatar: React.FC<FoxGiftAvatarProps> = React.memo(({ giftId, size = 'md' }) => {
  const meta = getFoxGiftMetadata(giftId);

  const sizeClass =
    size === 'sm' ? 'w-11 h-11' : size === 'lg' ? 'w-24 h-24' : 'w-16 h-16';

  // Unique color palette for the fox fur based on giftId
  const getFurColors = () => {
    switch (giftId) {
      case 'gift_sakura_fox':
        return { main: '#F472B6', dark: '#DB2777', cheek: '#FDF2F8', earInner: '#FBCFE8' };
      case 'gift_cyber_fox':
        return { main: '#22D3EE', dark: '#0891B2', cheek: '#ECFEFF', earInner: '#67E8F9' };
      case 'gift_pirate_fox':
        return { main: '#EA580C', dark: '#9A3412', cheek: '#FFEDD5', earInner: '#FDBA74' };
      case 'gift_arctic_fox':
        return { main: '#7DD3FC', dark: '#0284C7', cheek: '#F0F9FF', earInner: '#BAE6FD' };
      case 'gift_samurai_fox':
        return { main: '#DC2626', dark: '#991B1B', cheek: '#FEF2F2', earInner: '#FCA5A5' };
      case 'gift_pharaoh_fox':
        return { main: '#EAB308', dark: '#A16207', cheek: '#FEF9C3', earInner: '#FDE047' };
      case 'gift_astronaut_fox':
        return { main: '#C084FC', dark: '#7E22CE', cheek: '#FAF5FF', earInner: '#E9D5FF' };
      case 'gift_royal_fox':
        return { main: '#F59E0B', dark: '#B45309', cheek: '#FFFBEB', earInner: '#FDE68A' };
      case 'gift_diamond_fox':
        return { main: '#2DD4BF', dark: '#0F766E', cheek: '#F0FDFA', earInner: '#99F6E4' };
      case 'gift_inferno_fox':
        return { main: '#FB923C', dark: '#9A3412', cheek: '#FEF3C7', earInner: '#FDE047' };
      case 'gift_emerald_fox':
        return { main: '#34D399', dark: '#047857', cheek: '#ECFDF5', earInner: '#A7F3D0' };
      case 'gift_nebula_fox':
        return { main: '#E879F9', dark: '#86198F', cheek: '#FDF4FF', earInner: '#F5D0FE' };
      case 'gift_celestial_fox':
        return { main: '#FACC15', dark: '#CA8A04', cheek: '#FEFCE8', earInner: '#FEF08A' };
      default:
        return { main: '#F97316', dark: '#C2410C', cheek: '#FFF7ED', earInner: '#FDBA74' };
    }
  };

  const fur = getFurColors();

  return (
    <div
      className={`${sizeClass} relative rounded-2xl bg-gradient-to-br ${meta.gradientClass} border ${meta.borderClass} flex items-center justify-center overflow-hidden shadow-inner select-none shrink-0`}
    >
      {/* Subtle radial glow behind the collectible fox */}
      <div
        className="absolute inset-1 rounded-full blur-md opacity-40 pointer-events-none"
        style={{ backgroundColor: meta.primaryColor }}
      />

      {/* Custom Multi-Layered Collectible Fox SVG */}
      <svg
        viewBox="0 0 100 100"
        className="w-[86%] h-[86%] relative z-10 drop-shadow-[0_4px_8px_rgba(0,0,0,0.6)]"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Background Telegram Gift Sparkles */}
        <circle cx="16" cy="22" r="2" fill={meta.secondaryColor} opacity="0.8" />
        <circle cx="85" cy="20" r="1.8" fill={meta.secondaryColor} opacity="0.7" />
        <circle cx="84" cy="78" r="2.2" fill={meta.primaryColor} opacity="0.75" />

        {/* Celestial Solar Halo Ring */}
        {giftId === 'gift_celestial_fox' && (
          <circle
            cx="50"
            cy="50"
            r="41"
            fill="none"
            stroke="#FDE047"
            strokeWidth="2.5"
            strokeDasharray="6 3"
            opacity="0.85"
          />
        )}

        {/* Nebula Orbit Ring */}
        {giftId === 'gift_nebula_fox' && (
          <ellipse
            cx="50"
            cy="55"
            rx="44"
            ry="16"
            transform="rotate(-18 50 55)"
            fill="none"
            stroke="#F0ABFC"
            strokeWidth="2.5"
            opacity="0.75"
          />
        )}

        {/* Left & Right Fox Ears */}
        <polygon points="20,46 14,14 42,32" fill={fur.dark} />
        <polygon points="22,42 18,20 38,33" fill={fur.earInner} />
        <polygon points="80,46 86,14 58,32" fill={fur.dark} />
        <polygon points="78,42 82,20 62,33" fill={fur.earInner} />

        {/* astronaut bubble helmet back ring */}
        {giftId === 'gift_astronaut_fox' && (
          <circle
            cx="50"
            cy="54"
            r="36"
            fill="rgba(56, 189, 248, 0.12)"
            stroke="#E2E8F0"
            strokeWidth="3"
          />
        )}

        {/* Pharaoh Nemes side flaps */}
        {giftId === 'gift_pharaoh_fox' && (
          <>
            <polygon points="15,36 8,82 32,78 24,38" fill="#1D4ED8" stroke="#FACC15" strokeWidth="2" />
            <polygon points="85,36 92,82 68,78 76,38" fill="#1D4ED8" stroke="#FACC15" strokeWidth="2" />
          </>
        )}

        {/* Fox Head Base */}
        <path
          d="M18 46 C18 30, 82 30, 82 46 C86 64, 68 82, 50 86 C32 82, 14 64, 18 46 Z"
          fill={fur.main}
        />

        {/* White/Cream Fox Cheeks */}
        <path
          d="M19 54 C30 50, 42 64, 50 86 C32 82, 16 68, 19 54 Z"
          fill={fur.cheek}
        />
        <path
          d="M81 54 C70 50, 58 64, 50 86 C68 82, 84 68, 81 54 Z"
          fill={fur.cheek}
        />

        {/* Diamond Facet Lines for Mythic Diamond / Emerald Fox */}
        {(giftId === 'gift_diamond_fox' || giftId === 'gift_emerald_fox') && (
          <g stroke={giftId === 'gift_emerald_fox' ? '#A7F3D0' : '#CCFBF1'} strokeWidth="1" opacity="0.65">
            <line x1="50" y1="28" x2="35" y2="52" />
            <line x1="50" y1="28" x2="65" y2="52" />
            <line x1="35" y1="52" x2="65" y2="52" />
            <line x1="35" y1="52" x2="50" y2="84" />
            <line x1="65" y1="52" x2="50" y2="84" />
          </g>
        )}

        {/* Fox Eyes */}
        <ellipse cx="36" cy="54" rx="4.5" ry="5" fill="#0F172A" />
        <circle cx="34.5" cy="52.5" r="1.6" fill="#FFFFFF" />
        <ellipse cx="64" cy="54" rx="4.5" ry="5" fill="#0F172A" />
        <circle cx="62.5" cy="52.5" r="1.6" fill="#FFFFFF" />

        {/* Pirate Eyepatch */}
        {giftId === 'gift_pirate_fox' && (
          <>
            <line x1="20" y1="45" x2="78" y2="58" stroke="#0F172A" strokeWidth="2.5" />
            <circle cx="64" cy="54" r="6.5" fill="#0F172A" stroke="#F59E0B" strokeWidth="1.5" />
          </>
        )}

        {/* Cyberpunk Glowing Visor */}
        {giftId === 'gift_cyber_fox' && (
          <g>
            <rect
              x="23"
              y="47"
              width="54"
              height="13"
              rx="6"
              fill="#06B6D4"
              fillOpacity="0.85"
              stroke="#ECFEFF"
              strokeWidth="2"
            />
            <line x1="28" y1="51" x2="46" y2="51" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" />
          </g>
        )}

        {/* Fox Nose & Cute Smile */}
        <polygon points="45,67 55,67 50,74" fill="#0F172A" />
        <path
          d="M44 76 Q50 80 56 76"
          stroke="#0F172A"
          strokeWidth="2.2"
          strokeLinecap="round"
          fill="none"
        />

        {/* ACCESSORY TOPPERS PER GIFT */}
        {/* 1. Star Fox: Floating Golden Telegram Star on Forehead + Gift Ribbon */}
        {giftId === 'gift_star_fox' && (
          <polygon
            points="50,14 53,23 62,23 55,28 58,37 50,32 42,37 45,28 38,23 47,23"
            fill="#FACC15"
            stroke="#FEF08A"
            strokeWidth="1.5"
          />
        )}

        {/* 2. Sakura Kitsune: Cherry Blossom Flower & Torii Gem */}
        {giftId === 'gift_sakura_fox' && (
          <g>
            <circle cx="34" cy="28" r="6" fill="#F472B6" />
            <circle cx="42" cy="24" r="6" fill="#FB7185" />
            <circle cx="38" cy="26" r="3" fill="#FEF08A" />
            <circle cx="50" cy="40" r="3.5" fill="#F43F5E" />
          </g>
        )}

        {/* 4. Pirate Captain Hat */}
        {giftId === 'gift_pirate_fox' && (
          <g>
            <path d="M16 34 Q50 10 84 34 L76 38 L24 38 Z" fill="#1E293B" stroke="#F59E0B" strokeWidth="2.5" />
            <circle cx="50" cy="28" r="4" fill="#F8FAFC" />
          </g>
        )}

        {/* 5. Arctic Frost Crystal Crown */}
        {giftId === 'gift_arctic_fox' && (
          <g>
            <polygon points="50,10 44,30 56,30" fill="#BAE6FD" stroke="#38BDF8" strokeWidth="1.5" />
            <polygon points="37,16 36,32 45,30" fill="#7DD3FC" />
            <polygon points="63,16 64,32 55,30" fill="#7DD3FC" />
          </g>
        )}

        {/* 6. Samurai Kabuto Crescent Crest */}
        {giftId === 'gift_samurai_fox' && (
          <g>
            <path
              d="M28 18 C36 32, 64 32, 72 18 C64 38, 36 38, 28 18 Z"
              fill="#FACC15"
              stroke="#FEF08A"
              strokeWidth="1.5"
            />
            <rect x="44" y="28" width="12" height="6" rx="2" fill="#991B1B" stroke="#FACC15" strokeWidth="1.5" />
          </g>
        )}

        {/* 7. Pharaoh Sun Crown */}
        {giftId === 'gift_pharaoh_fox' && (
          <g>
            <circle cx="50" cy="24" r="8" fill="#EF4444" stroke="#FACC15" strokeWidth="2.5" />
            <path d="M46 28 Q50 20 54 28" stroke="#FACC15" strokeWidth="2" fill="none" />
          </g>
        )}

        {/* 8. Astronaut Glass Helmet Reflection */}
        {giftId === 'gift_astronaut_fox' && (
          <path
            d="M26 32 A30 30 0 0 1 74 32"
            stroke="#FFFFFF"
            strokeWidth="3"
            strokeLinecap="round"
            opacity="0.7"
          />
        )}

        {/* 9. Royal Sovereign Crown */}
        {(giftId === 'gift_royal_fox' || giftId === 'gift_celestial_fox') && (
          <g>
            <polygon
              points="28,34 32,14 44,25 50,11 56,25 68,14 72,34"
              fill="#FACC15"
              stroke="#FEF08A"
              strokeWidth="2"
            />
            <circle cx="50" cy="26" r="3" fill="#EF4444" />
            <circle cx="38" cy="28" r="2.2" fill="#10B981" />
            <circle cx="62" cy="28" r="2.2" fill="#3B82F6" />
          </g>
        )}

        {/* 10. Mythic Diamond / Emerald / Inferno / Nebula Floating Gem Crown */}
        {(giftId === 'gift_diamond_fox' ||
          giftId === 'gift_emerald_fox' ||
          giftId === 'gift_inferno_fox' ||
          giftId === 'gift_nebula_fox') && (
          <g>
            <polygon
              points="50,8 62,20 50,32 38,20"
              fill={meta.primaryColor}
              stroke="#FFFFFF"
              strokeWidth="2"
            />
            <polygon points="50,11 58,20 50,29 42,20" fill={meta.secondaryColor} />
          </g>
        )}
      </svg>
    </div>
  );
});

