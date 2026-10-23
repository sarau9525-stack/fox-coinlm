import React from 'react';
import { foxMascotImg } from '../assets/assets.js';

export interface LevelOutfitMeta {
  level: number;
  levelName: string;
  outfitTitle: string;
  outfitTitleFa: string;
  descriptionFa: string;
  primaryColor: string;
  accentColor: string;
  glowColor: string;
  badgeEmoji: string;
}

export const FOX_LEVEL_OUTFITS: LevelOutfitMeta[] = [
  {
    level: 1,
    levelName: 'Bronze Fox',
    outfitTitle: 'Bronze Streetwear Hoodie',
    outfitTitleFa: 'Bronze Streetwear Hoodie',
    descriptionFa: 'Classic Fox Coin streetwear hoodie with metallic bronze stitching and embossed coin crest',
    primaryColor: '#1E293B',
    accentColor: '#D97706',
    glowColor: 'rgba(217, 119, 6, 0.4)',
    badgeEmoji: '🥉',
  },
  {
    level: 2,
    levelName: 'Silver Fox',
    outfitTitle: 'Silver Cyber Bomber Jacket',
    outfitTitleFa: 'Silver Cyber Bomber Jacket',
    descriptionFa: 'Quilted chrome-silver leather bomber jacket with neon lapels and platinum shield emblem',
    primaryColor: '#475569',
    accentColor: '#E2E8F0',
    glowColor: 'rgba(226, 232, 240, 0.5)',
    badgeEmoji: '🥈',
  },
  {
    level: 3,
    levelName: 'Gold Fox',
    outfitTitle: 'Wall Street Gold Billionaire Tuxedo',
    outfitTitleFa: 'Wall Street Gold Billionaire Tuxedo',
    descriptionFa: 'Bespoke black velvet tuxedo with gold-trimmed satin lapels, crisp dress shirt, and golden silk tie',
    primaryColor: '#18181B',
    accentColor: '#FACC15',
    glowColor: 'rgba(250, 204, 21, 0.55)',
    badgeEmoji: '🥇',
  },
  {
    level: 4,
    levelName: 'Platinum Fox',
    outfitTitle: 'Platinum Cyber-Exosuit Armor',
    outfitTitleFa: 'Platinum Cyber-Exosuit Armor',
    descriptionFa: '3D titanium-platinum exosuit with carbon weave, cyan plasma conduits, and central arc core',
    primaryColor: '#0F172A',
    accentColor: '#38BDF8',
    glowColor: 'rgba(56, 189, 248, 0.6)',
    badgeEmoji: '💠',
  },
  {
    level: 5,
    levelName: 'Diamond Fox',
    outfitTitle: 'Royal Sapphire & Diamond Aristocrat Coat',
    outfitTitleFa: 'Royal Sapphire & Diamond Aristocrat Coat',
    descriptionFa: 'Aristocratic midnight-blue velvet coat with silver embroidery, crystal pauldrons, and cut diamonds',
    primaryColor: '#1E3A8A',
    accentColor: '#60A5FA',
    glowColor: 'rgba(96, 165, 250, 0.65)',
    badgeEmoji: '💎',
  },
  {
    level: 6,
    levelName: 'Epic Fox',
    outfitTitle: 'Epic Crimson Shogun Samurai Armor',
    outfitTitleFa: 'Epic Crimson Shogun Samurai Armor',
    descriptionFa: 'Handcrafted crimson-lacquered samurai armor with golden lamellar plates, shogun pauldrons, and dragon crest',
    primaryColor: '#7F1D1D',
    accentColor: '#F59E0B',
    glowColor: 'rgba(239, 68, 68, 0.65)',
    badgeEmoji: '🔥',
  },
  {
    level: 7,
    levelName: 'Legendary Fox',
    outfitTitle: 'Legendary Emerald Dragon-Scale Regalia',
    outfitTitleFa: 'Legendary Emerald Dragon-Scale Regalia',
    descriptionFa: 'Mythic armor forged from glowing emerald dragon scales with golden winged pauldrons and dragon-eye gem',
    primaryColor: '#064E3B',
    accentColor: '#10B981',
    glowColor: 'rgba(16, 185, 129, 0.65)',
    badgeEmoji: '🐉',
  },
  {
    level: 8,
    levelName: 'Master Fox',
    outfitTitle: 'Master Imperial Velvet & Ermine Mantle',
    outfitTitleFa: 'Master Imperial Velvet & Ermine Mantle',
    descriptionFa: 'Imperial purple velvet mantle with royal ermine fur collar, jeweled chain of office, and sovereign cape',
    primaryColor: '#4C1D95',
    accentColor: '#C084FC',
    glowColor: 'rgba(192, 132, 252, 0.7)',
    badgeEmoji: '👑',
  },
  {
    level: 9,
    levelName: 'Grandmaster Fox',
    outfitTitle: 'Grandmaster Astral Nebula Armor',
    outfitTitleFa: 'Grandmaster Astral Nebula Armor',
    descriptionFa: 'Celestial nebula armor woven with glowing star constellations, seraphic wing pauldrons, and singularity core',
    primaryColor: '#311042',
    accentColor: '#F472B6',
    glowColor: 'rgba(244, 114, 182, 0.75)',
    badgeEmoji: '🌌',
  },
  {
    level: 10,
    levelName: 'Lord Fox',
    outfitTitle: 'Supreme God-Emperor 24K Gold Regalia',
    outfitTitleFa: 'Supreme God-Emperor 24K Gold Regalia',
    descriptionFa: 'Supreme 24K solid gold plate armor and crimson royal cloak set with rubies and the Imperial Sun emblem',
    primaryColor: '#78350F',
    accentColor: '#FDE047',
    glowColor: 'rgba(253, 224, 71, 0.85)',
    badgeEmoji: '⚡',
  },
];

export function getLevelOutfitMeta(level: number): LevelOutfitMeta {
  const clamped = Math.max(1, Math.min(10, Math.floor(level || 1)));
  return FOX_LEVEL_OUTFITS[clamped - 1] || FOX_LEVEL_OUTFITS[0];
}

interface FoxLevelOutfitProps {
  level: number;
}

/**
 * High-craft 3D-shaded garment compositor tailored to the exact torso, shoulders, sleeves,
 * collar, and waist coordinates of foxMascotImg (1000x1000 viewBox).
 * Preserves the 3D volumetric lighting of the original Pixar-rendered Fox while
 * replacing ONLY the clothing with bespoke, multi-layered 3D luxury outfits.
 */
export const FoxLevelOutfit: React.FC<FoxLevelOutfitProps> = React.memo(({ level }) => {
  const safeLevel = Math.max(1, Math.min(10, Math.floor(level || 1)));
  const uid = `fox_lvl_${safeLevel}`;

  // Precision anatomical contour of the Fox's jacket/hoodie in foxMascotImg (1000x1000 space)
  // Carefully avoids the white chin fur, right paw + coin, left paw + hologram, and furry legs/tail
  const jacketSilhouettePath =
    'M 364 434 ' +
    'C 395 468, 475 504, 558 518 ' +
    'C 588 512, 622 484, 650 442 ' +
    'C 662 462, 658 488, 652 504 ' +
    'C 678 512, 704 528, 720 546 ' +
    'C 718 575, 712 604, 704 624 ' +
    'C 684 632, 664 626, 650 614 ' +
    'C 662 658, 664 704, 658 740 ' +
    'C 602 768, 552 772, 514 768 ' +
    'C 456 764, 412 750, 390 734 ' +
    'C 384 696, 390 656, 402 624 ' +
    'C 356 642, 310 632, 282 594 ' +
    'C 268 570, 266 546, 268 526 ' +
    'C 292 518, 316 504, 336 490 ' +
    'C 348 516, 358 528, 368 528 ' +
    'C 366 495, 360 462, 364 434 Z';

  // Torso-only path (central chest & stomach excluding outer sleeves)
  const torsoOnlyPath =
    'M 366 442 ' +
    'C 402 474, 478 506, 558 518 ' +
    'C 588 512, 620 486, 648 446 ' +
    'L 652 506 ' +
    'L 650 614 ' +
    'C 662 658, 664 704, 658 740 ' +
    'C 602 768, 552 772, 514 768 ' +
    'C 456 764, 412 750, 390 734 ' +
    'C 384 696, 390 656, 402 624 ' +
    'L 368 526 Z';

  // Neck & Hood Roll Collar contour
  const collarRollPath =
    'M 364 434 ' +
    'C 395 468, 475 504, 558 518 ' +
    'C 588 512, 622 484, 650 442 ' +
    'C 660 464, 656 492, 648 512 ' +
    'C 618 544, 586 558, 558 560 ' +
    'C 482 552, 410 524, 368 496 ' +
    'C 362 472, 360 452, 364 434 Z';

  // Waistband / Ribbed Hem contour
  const waistHemPath =
    'M 392 702 ' +
    'C 448 730, 560 742, 660 712 ' +
    'L 658 740 ' +
    'C 602 768, 552 772, 514 768 ' +
    'C 456 764, 412 750, 390 734 Z';

  // Right Sleeve Cuff (viewer's left wrist)
  const leftWristCuffPath =
    'M 268 526 C 292 518, 316 504, 336 490 L 348 516 C 326 532, 300 546, 274 552 Z';

  // Left Sleeve Cuff (viewer's right wrist)
  const rightWristCuffPath =
    'M 702 536 L 720 546 C 718 575, 712 604, 704 624 L 686 618 C 694 592, 698 564, 702 536 Z';

  if (safeLevel === 1) {
    // Level 1: Enhanced Bronze Streetwear Hoodie (keeps original hoodie with 3D bronze metallic trim & glowing emblem)
    return (
      <svg
        viewBox="0 0 1000 1000"
        className="absolute inset-0 w-full h-full pointer-events-none select-none"
      >
        <defs>
          <radialGradient id="lvl1_bronze_halo" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#F59E0B" stopOpacity="0.45" />
            <stop offset="65%" stopColor="#B45309" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#78350F" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="lvl1_bronze_metal" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FDE68A" />
            <stop offset="35%" stopColor="#D97706" />
            <stop offset="70%" stopColor="#92400E" />
            <stop offset="100%" stopColor="#451A03" />
          </linearGradient>
        </defs>
        <circle cx="575" cy="573" r="46" fill="url(#lvl1_bronze_halo)" />
        <circle
          cx="575"
          cy="573"
          r="30"
          fill="none"
          stroke="url(#lvl1_bronze_metal)"
          strokeWidth="3.5"
          strokeOpacity="0.75"
        />
      </svg>
    );
  }

  return (
    <svg
      viewBox="0 0 1000 1000"
      className="absolute inset-0 w-full h-full pointer-events-none select-none transition-all duration-500"
    >
      <defs>
        {/* =================================================================
            SHARED 3D FILTERS, MASKS & VOLUMETRIC SHADING
           ================================================================= */}
        <clipPath id={`${uid}_jacket_clip`}>
          <path d={jacketSilhouettePath} />
        </clipPath>
        <clipPath id={`${uid}_torso_clip`}>
          <path d={torsoOnlyPath} />
        </clipPath>

        {/* Extracts smooth 3D Pixar volumetric relief from foxMascotImg while erasing thin yellow pocket/drawstring lines */}
        <filter id={`${uid}_volumetric_relief`} x="0%" y="0%" width="100%" height="100%">
          <feGaussianBlur stdDeviation="9" result="smoothed" />
          <feColorMatrix
            in="smoothed"
            type="matrix"
            values="0.33 0.59 0.08 0 0
                    0.33 0.59 0.08 0 0
                    0.33 0.59 0.08 0 0
                    0    0    0    1 0"
            result="gray"
          />
          <feComponentTransfer in="gray">
            <feFuncR type="gamma" amplitude="1.35" exponent="0.85" offset="0.05" />
            <feFuncG type="gamma" amplitude="1.35" exponent="0.85" offset="0.05" />
            <feFuncB type="gamma" amplitude="1.35" exponent="0.85" offset="0.05" />
          </feComponentTransfer>
        </filter>

        {/* Soft 3D elevation shadow for lapels, armor plates, chains, and medals */}
        <filter id={`${uid}_shadow_3d`} x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="6" stdDeviation="6" floodColor="#000000" floodOpacity="0.72" />
        </filter>
        <filter id={`${uid}_shadow_subtle`} x="-15%" y="-15%" width="130%" height="130%">
          <feDropShadow dx="0" dy="3" stdDeviation="3.5" floodColor="#000000" floodOpacity="0.6" />
        </filter>
        <filter id={`${uid}_glow`} x="-35%" y="-35%" width="170%" height="170%">
          <feGaussianBlur stdDeviation="7" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id={`${uid}_soft_blur`} x="-10%" y="-10%" width="120%" height="120%">
          <feGaussianBlur stdDeviation="5" />
        </filter>

        {/* Volumetric 3D Cylinder Lighting across Torso (Rim light left from coin, key light center-right, deep AO edges) */}
        <linearGradient id={`${uid}_cylinder_light`} x1="0%" y1="15%" x2="100%" y2="25%">
          <stop offset="0%" stopColor="#F59E0B" stopOpacity="0.22" />
          <stop offset="8%" stopColor="#000000" stopOpacity="0.52" />
          <stop offset="28%" stopColor="#FFFFFF" stopOpacity="0.18" />
          <stop offset="56%" stopColor="#FFFFFF" stopOpacity="0.26" />
          <stop offset="82%" stopColor="#000000" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#000000" stopOpacity="0.68" />
        </linearGradient>

        {/* Vertical Ambient Occlusion (Neck chin shadow & lower waist shadow) */}
        <linearGradient id={`${uid}_vertical_ao`} x1="50%" y1="0%" x2="50%" y2="100%">
          <stop offset="0%" stopColor="#000000" stopOpacity="0.6" />
          <stop offset="18%" stopColor="#000000" stopOpacity="0.05" />
          <stop offset="78%" stopColor="#000000" stopOpacity="0.05" />
          <stop offset="100%" stopColor="#000000" stopOpacity="0.65" />
        </linearGradient>

        {/* =================================================================
            METALLIC & JEWEL GRADIENTS
           ================================================================= */}
        <linearGradient id={`${uid}_gold_24k`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFFBEB" />
          <stop offset="20%" stopColor="#FDE047" />
          <stop offset="45%" stopColor="#EAB308" />
          <stop offset="72%" stopColor="#A16207" />
          <stop offset="90%" stopColor="#FEF08A" />
          <stop offset="100%" stopColor="#713F12" />
        </linearGradient>

        <linearGradient id={`${uid}_gold_vertical`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#FEF08A" />
          <stop offset="40%" stopColor="#EAB308" />
          <stop offset="80%" stopColor="#854D0E" />
          <stop offset="100%" stopColor="#CA8A04" />
        </linearGradient>

        <linearGradient id={`${uid}_chrome_metal`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="25%" stopColor="#E2E8F0" />
          <stop offset="50%" stopColor="#64748B" />
          <stop offset="75%" stopColor="#F8FAFC" />
          <stop offset="100%" stopColor="#1E293B" />
        </linearGradient>

        <linearGradient id={`${uid}_diamond_facet`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="35%" stopColor="#E0F2FE" />
          <stop offset="65%" stopColor="#38BDF8" />
          <stop offset="100%" stopColor="#0369A1" />
        </linearGradient>

        <radialGradient id={`${uid}_ruby_gem`} cx="35%" cy="35%" r="65%">
          <stop offset="0%" stopColor="#FECDD3" />
          <stop offset="25%" stopColor="#F43F5E" />
          <stop offset="65%" stopColor="#BE123C" />
          <stop offset="100%" stopColor="#4C0519" />
        </radialGradient>

        <radialGradient id={`${uid}_emerald_gem`} cx="35%" cy="35%" r="65%">
          <stop offset="0%" stopColor="#D1FAE5" />
          <stop offset="30%" stopColor="#10B981" />
          <stop offset="70%" stopColor="#047857" />
          <stop offset="100%" stopColor="#022C22" />
        </radialGradient>

        {/* =================================================================
            LEVEL-SPECIFIC FABRIC & ARMOR PATTERNS
           ================================================================= */}
        {/* Level 2: Quilted Silver Leather Pattern */}
        <pattern id={`${uid}_quilted_leather`} width="28" height="28" patternUnits="userSpaceOnUse">
          <path d="M 14 0 L 28 14 L 14 28 L 0 14 Z" fill="none" stroke="#1E293B" strokeWidth="1.8" strokeOpacity="0.45" />
          <path d="M 14 2 L 26 14 L 14 26 L 2 14 Z" fill="none" stroke="#FFFFFF" strokeWidth="1" strokeOpacity="0.35" />
        </pattern>

        {/* Level 3: Bespoke Pinstripe Wool-Silk Pattern */}
        <pattern id={`${uid}_pinstripe`} width="14" height="14" patternUnits="userSpaceOnUse" patternTransform="rotate(4)">
          <line x1="0" y1="0" x2="0" y2="14" stroke="#FACC15" strokeWidth="1" strokeOpacity="0.16" />
        </pattern>

        {/* Level 4: Hexagonal Carbon-Fiber Weave */}
        <pattern id={`${uid}_carbon_hex`} width="16" height="16" patternUnits="userSpaceOnUse">
          <polygon points="8,1 15,5 15,11 8,15 1,11 1,5" fill="#0F172A" stroke="#38BDF8" strokeWidth="0.9" strokeOpacity="0.32" />
        </pattern>

        {/* Level 5: Royal Diamond Damask Brocade */}
        <pattern id={`${uid}_royal_damask`} width="32" height="32" patternUnits="userSpaceOnUse">
          <path d="M 16 2 Q 24 16 16 30 Q 8 16 16 2 Z" fill="none" stroke="#93C5FD" strokeWidth="1.2" strokeOpacity="0.28" />
          <circle cx="16" cy="16" r="2.5" fill="#E0F2FE" fillOpacity="0.35" />
        </pattern>

        {/* Level 6: Samurai Laced Scale Armor (Kozane) */}
        <pattern id={`${uid}_samurai_kozane`} width="24" height="18" patternUnits="userSpaceOnUse">
          <rect x="0" y="0" width="24" height="16" rx="3" fill="#7F1D1D" stroke="#F59E0B" strokeWidth="1.5" />
          <line x1="6" y1="0" x2="6" y2="16" stroke="#DC2626" strokeWidth="2" />
          <line x1="18" y1="0" x2="18" y2="16" stroke="#DC2626" strokeWidth="2" />
        </pattern>

        {/* Level 7: 3D Overlapping Emerald Dragon Scales */}
        <pattern id={`${uid}_dragon_scales`} width="26" height="22" patternUnits="userSpaceOnUse">
          <path
            d="M 0 11 Q 13 26 26 11 Q 13 22 0 11 Z"
            fill="#047857"
            stroke="#34D399"
            strokeWidth="1.5"
          />
          <path
            d="M -13 0 Q 0 15 13 0 M 13 0 Q 26 15 39 0"
            fill="none"
            stroke="#A7F3D0"
            strokeWidth="1.2"
            strokeOpacity="0.55"
          />
        </pattern>

        {/* Level 8 & 10: Imperial Gold Baroque Filigree Pattern */}
        <pattern id={`${uid}_imperial_filigree`} width="36" height="36" patternUnits="userSpaceOnUse">
          <path
            d="M 18 4 C 26 4, 32 10, 32 18 C 32 26, 26 32, 18 32 C 10 32, 4 26, 4 18 C 4 10, 10 4, 18 4 Z"
            fill="none"
            stroke="#FACC15"
            strokeWidth="1.2"
            strokeOpacity="0.25"
          />
          <polygon points="18,9 21,15 27,18 21,21 18,27 15,21 9,18 15,15" fill="#FDE047" fillOpacity="0.22" />
        </pattern>
      </defs>

      {/* =====================================================================
          ROYAL / ASTRAL / IMPERIAL CAPE BACKDROP (Levels 8, 9, 10)
          Draped behind the Fox's shoulders & torso with realistic pleated folds
         ===================================================================== */}
      {safeLevel >= 8 && (
        <g filter={`url(#${uid}_shadow_3d)`}>
          {/* Left Draped Cape Wing */}
          <path
            d="M 358 492 C 308 565, 298 675, 316 772 C 348 784, 382 768, 405 742 L 398 605 Z"
            fill={safeLevel === 10 ? '#991B1B' : safeLevel === 9 ? '#3B0764' : '#4C1D95'}
            stroke={`url(#${uid}_gold_24k)`}
            strokeWidth="5"
          />
          {/* Cape Pleat Shadow Left */}
          <path
            d="M 355 520 C 330 600, 328 690, 342 768"
            stroke="#000000"
            strokeWidth="8"
            strokeOpacity="0.35"
            fill="none"
          />
          {/* Right Draped Cape Wing */}
          <path
            d="M 648 495 C 696 575, 708 675, 692 772 C 668 782, 648 762, 642 738 L 645 605 Z"
            fill={safeLevel === 10 ? '#7F1D1D' : safeLevel === 9 ? '#2E1065' : '#3B0764'}
            stroke={`url(#${uid}_gold_24k)`}
            strokeWidth="5"
          />
          {/* Cape Pleat Shadow Right */}
          <path
            d="M 656 525 C 678 605, 682 690, 672 766"
            stroke="#000000"
            strokeWidth="8"
            strokeOpacity="0.35"
            fill="none"
          />
        </g>
      )}

      {/* =====================================================================
          MAIN CLIPPED GARMENT COMPOSITOR (100% Exact Fit to Fox Torso & Sleeves)
         ===================================================================== */}
      <g clipPath={`url(#${uid}_jacket_clip)`}>
        {/*
          1. Opaque Base Garment Material (Eliminates old yellow drawstrings & pocket lines)
          2. Real 3D Pixar Volumetric Relief extracted from foxMascotImg via SVG filter
             blended with multiply/overlay so every real 3D sleeve fold & chest curve is preserved!
        */}

        {/* -----------------------------------------------------------------
            LEVEL 2: SILVER CYBER BOMBER JACKET
           ----------------------------------------------------------------- */}
        {safeLevel === 2 && (
          <g>
            {/* Brushed Liquid Silver Torso & Gunmetal Sleeves */}
            <path d={jacketSilhouettePath} fill="#94A3B8" />
            <path d={torsoOnlyPath} fill={`url(#${uid}_chrome_metal)`} />
            <path d={torsoOnlyPath} fill={`url(#${uid}_quilted_leather)`} />

            {/* Contrast Carbon-Slate Bomber Sleeves */}
            <path d="M 260 475 L 392 485 L 405 645 L 260 645 Z" fill="#1E293B" />
            <path d="M 642 485 L 730 520 L 730 645 L 642 645 Z" fill="#1E293B" />

            {/* Apply Real 3D Pixar Volumetric Folds from Original Mascot */}
            <image
              href={foxMascotImg}
              x="0"
              y="0"
              width="1000"
              height="1000"
              filter={`url(#${uid}_volumetric_relief)`}
              style={{ mixBlendMode: 'multiply' }}
              opacity="0.72"
            />
            <path d={jacketSilhouettePath} fill={`url(#${uid}_cylinder_light)`} />
            <path d={jacketSilhouettePath} fill={`url(#${uid}_vertical_ao)`} />

            {/* Sleeve Racing Stripes & Cyber Panels */}
            <path
              d="M 280 545 C 315 540, 345 525, 368 505"
              stroke={`url(#${uid}_chrome_metal)`}
              strokeWidth="12"
              fill="none"
            />
            <path
              d="M 652 518 C 678 532, 698 548, 715 565"
              stroke={`url(#${uid}_chrome_metal)`}
              strokeWidth="12"
              fill="none"
            />

            {/* Ribbed Varsity Collar, Cuffs & Waistband with Neon Ice-Blue Piping */}
            <path d={collarRollPath} fill="#0F172A" stroke="#E2E8F0" strokeWidth="4" />
            <path
              d="M 368 462 C 415 498, 488 528, 558 538 C 592 532, 622 505, 650 472"
              stroke="#38BDF8"
              strokeWidth="4"
              fill="none"
              filter={`url(#${uid}_glow)`}
            />

            <path d={waistHemPath} fill="#0F172A" />
            <path d="M 392 714 C 455 742, 560 752, 660 724" stroke="#E2E8F0" strokeWidth="5" fill="none" />
            <path d="M 392 726 C 455 754, 560 764, 660 736" stroke="#38BDF8" strokeWidth="3.5" fill="none" />

            <path d={leftWristCuffPath} fill="#0F172A" stroke="#E2E8F0" strokeWidth="3" />
            <path d={rightWristCuffPath} fill="#0F172A" stroke="#E2E8F0" strokeWidth="3" />

            {/* Heavy 3D Chrome Center Zipper & Angled Chest Welt Pockets */}
            <g filter={`url(#${uid}_shadow_subtle)`}>
              <line x1="564" y1="520" x2="580" y2="768" stroke="#0F172A" strokeWidth="14" />
              <line x1="564" y1="520" x2="580" y2="768" stroke={`url(#${uid}_chrome_metal)`} strokeWidth="7" strokeDasharray="6 3" />
              {/* Angled zipper pockets */}
              <path d="M 455 635 L 495 705" stroke="#0F172A" strokeWidth="10" strokeLinecap="round" />
              <path d="M 455 635 L 495 705" stroke="#E2E8F0" strokeWidth="4" strokeLinecap="round" />
              <path d="M 642 635 L 622 705" stroke="#0F172A" strokeWidth="10" strokeLinecap="round" />
              <path d="M 642 635 L 622 705" stroke="#E2E8F0" strokeWidth="4" strokeLinecap="round" />
            </g>

            {/* 3D Sculpted Platinum-Silver Fox Shield Medallion */}
            <g filter={`url(#${uid}_shadow_3d)`}>
              <polygon
                points="570,534 606,552 598,596 570,616 542,596 534,552"
                fill={`url(#${uid}_chrome_metal)`}
                stroke="#FFFFFF"
                strokeWidth="3"
              />
              <polygon
                points="570,544 596,557 590,590 570,604 550,590 544,557"
                fill="#0F172A"
                stroke="#38BDF8"
                strokeWidth="2"
              />
              {/* Stylized Fox Head Silhouette Inside Shield */}
              <polygon points="554,560 562,574 570,566 578,574 586,560 582,586 570,596 558,586" fill={`url(#${uid}_chrome_metal)`} />
              <circle cx="570" cy="576" r="4" fill="#38BDF8" filter={`url(#${uid}_glow)`} />
            </g>
          </g>
        )}

        {/* -----------------------------------------------------------------
            LEVEL 3: WALL STREET GOLD BILLIONAIRE TUXEDO & SILK TIE
           ----------------------------------------------------------------- */}
        {safeLevel === 3 && (
          <g>
            {/* Tailored Obsidian Black Velvet & Pinstripe Suit Base */}
            <path d={jacketSilhouettePath} fill="#111318" />
            <path d={jacketSilhouettePath} fill={`url(#${uid}_pinstripe)`} />

            {/* Preserve Real 3D Pixar Sleeve & Torso Shading */}
            <image
              href={foxMascotImg}
              x="0"
              y="0"
              width="1000"
              height="1000"
              filter={`url(#${uid}_volumetric_relief)`}
              style={{ mixBlendMode: 'multiply' }}
              opacity="0.78"
            />
            <path d={jacketSilhouettePath} fill={`url(#${uid}_cylinder_light)`} />

            {/* Gold Brocade Waistcoat (Vest) Underneath Jacket */}
            <path
              d="M 445 480 L 635 480 L 598 730 L 548 730 Z"
              fill="#27272A"
              stroke={`url(#${uid}_gold_24k)`}
              strokeWidth="3"
            />

            {/* Crisp Tailored White Dress Shirt with Pleats & Chin Shadow */}
            <g filter={`url(#${uid}_shadow_subtle)`}>
              <path
                d="M 462 470 L 622 470 L 574 662 Z"
                fill="#F8FAFC"
              />
              {/* Subtle vertical tuxedo shirt pleats */}
              <line x1="515" y1="490" x2="545" y2="620" stroke="#CBD5E1" strokeWidth="2" />
              <line x1="535" y1="495" x2="558" y2="640" stroke="#CBD5E1" strokeWidth="2" />
              <line x1="595" y1="490" x2="580" y2="620" stroke="#CBD5E1" strokeWidth="2" />
              <line x1="610" y1="490" x2="590" y2="600" stroke="#CBD5E1" strokeWidth="2" />
            </g>

            {/* 24K Gold Woven Silk Necktie with 3D Knot & Diamond Tie Bar */}
            <g filter={`url(#${uid}_shadow_3d)`}>
              {/* Tie Knot */}
              <path
                d="M 538 512 C 552 508, 570 508, 582 512 L 572 548 C 562 552, 554 552, 546 548 Z"
                fill={`url(#${uid}_gold_24k)`}
                stroke="#713F12"
                strokeWidth="2"
              />
              {/* Knot dimple */}
              <path d="M 559 536 L 561 555" stroke="#713F12" strokeWidth="3" strokeLinecap="round" />
              {/* Tie Blade */}
              <path
                d="M 547 546 L 571 546 L 584 648 L 566 680 L 542 648 Z"
                fill={`url(#${uid}_gold_vertical)`}
                stroke="#FEF08A"
                strokeWidth="1.5"
              />
              {/* Luxury Diamond & Gold Tie Clip */}
              <rect x="543" y="592" width="36" height="7" rx="3.5" fill={`url(#${uid}_gold_24k)`} stroke="#713F12" strokeWidth="1" />
              <circle cx="561" cy="595.5" r="3.5" fill="#FFFFFF" />
            </g>

            {/* 3D Wingtip White Shirt Collar Overlapping the Tie Knot */}
            <g filter={`url(#${uid}_shadow_subtle)`}>
              <path
                d="M 455 462 C 485 488, 522 508, 554 518 L 515 546 C 485 528, 460 502, 442 478 Z"
                fill="#FFFFFF"
                stroke="#E2E8F0"
                strokeWidth="2"
              />
              <path
                d="M 632 465 C 608 490, 584 508, 562 518 L 596 546 C 618 528, 636 502, 646 480 Z"
                fill="#FFFFFF"
                stroke="#E2E8F0"
                strokeWidth="2"
              />
            </g>

            {/* Sculpted Satin Peak Lapels with 24K Gold Piping & 3D Drop Shadow */}
            <g filter={`url(#${uid}_shadow_3d)`}>
              {/* Left Peak Lapel */}
              <path
                d="M 366 445 C 405 468, 445 485, 468 492 L 502 522 L 468 532 L 568 682 C 515 645, 440 575, 368 495 Z"
                fill="#18181B"
                stroke={`url(#${uid}_gold_24k)`}
                strokeWidth="5"
                strokeLinejoin="round"
              />
              {/* Right Peak Lapel */}
              <path
                d="M 648 450 C 632 472, 616 485, 605 492 L 584 522 L 612 532 L 568 682 C 608 645, 638 575, 652 502 Z"
                fill="#18181B"
                stroke={`url(#${uid}_gold_24k)`}
                strokeWidth="5"
                strokeLinejoin="round"
              />
            </g>

            {/* Gold Silk Pocket Square, Lapel Pin & Double-Breasted Gold Buttons */}
            <g filter={`url(#${uid}_shadow_subtle)`}>
              {/* Pocket Square */}
              <path d="M 606 588 L 626 566 L 636 580 L 648 568 L 646 592 Z" fill={`url(#${uid}_gold_24k)`} />
              <rect x="602" y="590" width="46" height="7" rx="2" fill="#09090B" stroke={`url(#${uid}_gold_24k)`} strokeWidth="1.5" />
              {/* Golden Fox Lapel Pin on Left Lapel */}
              <circle cx="468" cy="568" r="11" fill={`url(#${uid}_gold_24k)`} stroke="#FFFFFF" strokeWidth="1.5" />
              <polygon points="468,560 474,572 462,572" fill="#713F12" />

              {/* 4 Sculpted 24K Gold Buttons */}
              {[
                [532, 696],
                [598, 696],
                [536, 736],
                [602, 736],
              ].map(([bx, by], i) => (
                <g key={i}>
                  <circle cx={bx} cy={by} r="10" fill={`url(#${uid}_gold_24k)`} stroke="#713F12" strokeWidth="2" />
                  <circle cx={bx} cy={by} r="5" fill="none" stroke="#FEF08A" strokeWidth="1.2" />
                </g>
              ))}
            </g>

            {/* Gold Cufflinks & Sleeve Trim */}
            <path d={leftWristCuffPath} fill="#09090B" stroke={`url(#${uid}_gold_24k)`} strokeWidth="4" />
            <path d={rightWristCuffPath} fill="#09090B" stroke={`url(#${uid}_gold_24k)`} strokeWidth="4" />
            <path d={jacketSilhouettePath} fill={`url(#${uid}_vertical_ao)`} />
          </g>
        )}

        {/* -----------------------------------------------------------------
            LEVEL 4: PLATINUM CYBER-EXOSUIT ARMOR
           ----------------------------------------------------------------- */}
        {safeLevel === 4 && (
          <g>
            {/* Hex Carbon-Fiber Under-Suit */}
            <path d={jacketSilhouettePath} fill="#090D16" />
            <path d={jacketSilhouettePath} fill={`url(#${uid}_carbon_hex)`} />

            {/* Preserve 3D Pixar Body Shading */}
            <image
              href={foxMascotImg}
              x="0"
              y="0"
              width="1000"
              height="1000"
              filter={`url(#${uid}_volumetric_relief)`}
              style={{ mixBlendMode: 'multiply' }}
              opacity="0.7"
            />

            {/* Sculpted 3D Brushed Platinum Pectoral & Abdominal Armor Plates */}
            <g filter={`url(#${uid}_shadow_3d)`}>
              {/* Left Pectoral Plate */}
              <path
                d="M 382 490 C 435 515, 495 532, 545 538 L 538 628 C 482 626, 430 608, 396 582 Z"
                fill={`url(#${uid}_chrome_metal)`}
                stroke="#38BDF8"
                strokeWidth="3"
              />
              {/* Right Pectoral Plate */}
              <path
                d="M 648 495 C 625 518, 602 532, 588 538 L 592 628 C 618 624, 638 610, 650 588 Z"
                fill={`url(#${uid}_chrome_metal)`}
                stroke="#38BDF8"
                strokeWidth="3"
              />
              {/* Left Abdominal Segmented Plates */}
              <path
                d="M 412 642 L 542 648 L 546 694 L 406 684 Z"
                fill={`url(#${uid}_chrome_metal)`}
                stroke="#94A3B8"
                strokeWidth="2.5"
              />
              <path
                d="M 404 698 L 548 706 L 552 748 L 398 734 Z"
                fill={`url(#${uid}_chrome_metal)`}
                stroke="#94A3B8"
                strokeWidth="2.5"
              />
              {/* Right Abdominal Segmented Plates */}
              <path
                d="M 592 648 L 652 642 L 656 684 L 594 694 Z"
                fill={`url(#${uid}_chrome_metal)`}
                stroke="#94A3B8"
                strokeWidth="2.5"
              />
              <path
                d="M 594 706 L 656 698 L 656 736 L 596 748 Z"
                fill={`url(#${uid}_chrome_metal)`}
                stroke="#94A3B8"
                strokeWidth="2.5"
              />
              {/* High-Tech Cyber Collar Guard */}
              <path
                d={collarRollPath}
                fill={`url(#${uid}_chrome_metal)`}
                stroke="#38BDF8"
                strokeWidth="4"
              />
            </g>

            {/* Glowing Neon Cyan Plasma Conduits */}
            <g stroke="#00F0FF" fill="none" filter={`url(#${uid}_glow)`}>
              <path d="M 372 465 C 425 502, 495 526, 565 534 C 602 526, 632 502, 650 472" strokeWidth="5" />
              <path d="M 415 555 L 485 568 L 515 602" strokeWidth="3.5" />
              <path d="M 640 558 L 612 568 L 602 602" strokeWidth="3.5" />
              <path d="M 285 555 L 348 532 L 378 565" strokeWidth="4" />
              <path d="M 656 555 L 708 575" strokeWidth="4" />
              <path d="M 392 722 C 455 750, 560 760, 660 730" strokeWidth="6" />
            </g>

            {/* Multi-Ringed Turbine Arc-Reactor Core on Chest */}
            <g filter={`url(#${uid}_shadow_3d)`}>
              <polygon
                points="570,524 614,548 614,598 570,622 526,598 526,548"
                fill="#0F172A"
                stroke={`url(#${uid}_chrome_metal)`}
                strokeWidth="6"
              />
              <circle
                cx="570"
                cy="573"
                r="32"
                fill="#0284C7"
                stroke="#38BDF8"
                strokeWidth="4"
                filter={`url(#${uid}_glow)`}
              />
              {/* Reactor Turbine Ribs */}
              <circle cx="570" cy="573" r="24" fill="none" stroke="#FFFFFF" strokeWidth="4" strokeDasharray="8 6" />
              <circle cx="570" cy="573" r="14" fill="#E0F2FE" filter={`url(#${uid}_glow)`} />
              <circle cx="570" cy="573" r="6" fill="#FFFFFF" />
            </g>

            <path d={jacketSilhouettePath} fill={`url(#${uid}_cylinder_light)`} />
          </g>
        )}

        {/* -----------------------------------------------------------------
            LEVEL 5: ROYAL SAPPHIRE & DIAMOND ARISTOCRAT COAT
           ----------------------------------------------------------------- */}
        {safeLevel === 5 && (
          <g>
            {/* Deep Royal Sapphire Crushed Velvet & Damask Base */}
            <path d={jacketSilhouettePath} fill="#172554" />
            <path d={jacketSilhouettePath} fill={`url(#${uid}_royal_damask)`} />

            {/* Preserve Real 3D Pixar Volumetric Folds */}
            <image
              href={foxMascotImg}
              x="0"
              y="0"
              width="1000"
              height="1000"
              filter={`url(#${uid}_volumetric_relief)`}
              style={{ mixBlendMode: 'multiply' }}
              opacity="0.74"
            />
            <path d={jacketSilhouettePath} fill={`url(#${uid}_cylinder_light)`} />

            {/* Aristocratic White Silk & Silver-Lace Jabot (Cravat) at Throat */}
            <g filter={`url(#${uid}_shadow_subtle)`}>
              <path
                d="M 518 505 C 545 515, 575 515, 602 505 L 588 618 C 568 632, 552 632, 532 618 Z"
                fill="#F8FAFC"
                stroke="#BAE6FD"
                strokeWidth="2"
              />
              <path d="M 532 535 Q 560 550 588 535" stroke="#93C5FD" strokeWidth="2.5" fill="none" />
              <path d="M 535 558 Q 560 573 585 558" stroke="#93C5FD" strokeWidth="2.5" fill="none" />
            </g>

            {/* Curved Silver-Crystal Brocade Lapels & Center Plastron */}
            <g filter={`url(#${uid}_shadow_3d)`}>
              <path
                d="M 366 442 C 415 482, 488 518, 554 532 L 564 766 L 515 764 L 508 558 C 445 540, 392 512, 368 485 Z"
                fill={`url(#${uid}_diamond_facet)`}
                stroke="#FFFFFF"
                strokeWidth="3"
              />
              <path
                d="M 648 448 C 624 485, 596 518, 566 532 L 578 766 L 614 762 L 612 558 C 632 536, 646 512, 652 488 Z"
                fill={`url(#${uid}_diamond_facet)`}
                stroke="#FFFFFF"
                strokeWidth="3"
              />
            </g>

            {/* Individually Faceted Sparkling Diamonds Along Lapels & Plastron */}
            {[
              [405, 485],
              [442, 506],
              [480, 524],
              [628, 495],
              [604, 518],
              [538, 635],
              [540, 680],
              [542, 725],
              [594, 635],
              [596, 680],
              [598, 725],
            ].map(([cx, cy], idx) => (
              <g key={idx} filter={`url(#${uid}_shadow_subtle)`}>
                <polygon
                  points={`${cx},${cy - 10} ${cx + 10},${cy} ${cx},${cy + 10} ${cx - 10},${cy}`}
                  fill={`url(#${uid}_diamond_facet)`}
                  stroke="#FFFFFF"
                  strokeWidth="1.8"
                />
                <polygon
                  points={`${cx},${cy - 5} ${cx + 5},${cy} ${cx},${cy + 5} ${cx - 5},${cy}`}
                  fill="#FFFFFF"
                />
              </g>
            ))}

            {/* Royal Diamond Belt & Sleeve Cuffs */}
            <path d={waistHemPath} fill="#0F172A" stroke={`url(#${uid}_diamond_facet)`} strokeWidth="4" />
            <path d={leftWristCuffPath} fill={`url(#${uid}_diamond_facet)`} stroke="#FFFFFF" strokeWidth="3" />
            <path d={rightWristCuffPath} fill={`url(#${uid}_diamond_facet)`} stroke="#FFFFFF" strokeWidth="3" />

            {/* Centerpiece Cullinan Diamond Starburst Medallion */}
            <g filter={`url(#${uid}_shadow_3d)`}>
              {/* 8-Pointed Starburst Frame */}
              <polygon
                points="570,522 584,552 616,556 592,578 598,610 570,594 542,610 548,578 524,556 556,552"
                fill="#FFFFFF"
                stroke="#38BDF8"
                strokeWidth="3"
                filter={`url(#${uid}_glow)`}
              />
              <polygon
                points="570,534 604,572 570,610 536,572"
                fill={`url(#${uid}_diamond_facet)`}
                stroke="#FFFFFF"
                strokeWidth="3"
              />
              <polygon points="570,550 588,572 570,594 552,572" fill="#FFFFFF" />
            </g>
          </g>
        )}

        {/* -----------------------------------------------------------------
            LEVEL 6: EPIC CRIMSON SHOGUN SAMURAI ARMOR (O-YOROI)
           ----------------------------------------------------------------- */}
        {safeLevel === 6 && (
          <g>
            {/* Deep Crimson Brocade Silk Base */}
            <path d={jacketSilhouettePath} fill="#450A0A" />
            <path d={jacketSilhouettePath} fill={`url(#${uid}_samurai_kozane)`} />

            {/* Preserve Real 3D Pixar Volumetric Folds */}
            <image
              href={foxMascotImg}
              x="0"
              y="0"
              width="1000"
              height="1000"
              filter={`url(#${uid}_volumetric_relief)`}
              style={{ mixBlendMode: 'multiply' }}
              opacity="0.72"
            />

            {/* Crossed Black & Gold Silk Kimono Inner Collar (Eri) */}
            <g filter={`url(#${uid}_shadow_3d)`}>
              <path
                d="M 366 440 C 420 485, 495 545, 575 612 L 535 636 C 465 578, 402 525, 368 488 Z"
                fill="#111827"
                stroke={`url(#${uid}_gold_24k)`}
                strokeWidth="5"
              />
              <path
                d="M 650 446 C 612 505, 565 568, 502 632 L 548 652 C 598 592, 635 535, 652 492 Z"
                fill="#111827"
                stroke={`url(#${uid}_gold_24k)`}
                strokeWidth="5"
              />
            </g>

            {/* Curved 3D Lacquered Samurai Chest Cuirass (Do) with Gold Lacing */}
            <g filter={`url(#${uid}_shadow_3d)`}>
              {/* Upper Chest Guard (Munaita) */}
              <path
                d="M 412 582 C 478 608, 588 608, 650 584 L 656 718 C 585 745, 478 745, 402 715 Z"
                fill="#7F1D1D"
                stroke={`url(#${uid}_gold_24k)`}
                strokeWidth="6"
              />
              {/* Curved Horizontal Samurai Armor Tiers */}
              <path d="M 410 616 C 480 640, 585 640, 652 618" stroke={`url(#${uid}_gold_24k)`} strokeWidth="5" fill="none" />
              <path d="M 408 650 C 480 674, 585 674, 654 652" stroke={`url(#${uid}_gold_24k)`} strokeWidth="5" fill="none" />
              <path d="M 405 684 C 480 708, 585 708, 655 686" stroke={`url(#${uid}_gold_24k)`} strokeWidth="5" fill="none" />

              {/* Crimson Silk Odoshi Lacing Chords */}
              {[445, 485, 525, 565, 605, 635].map((lx, i) => (
                <line key={i} x1={lx} y1="594" x2={lx} y2="725" stroke="#EF4444" strokeWidth="4" strokeDasharray="10 8" />
              ))}

              {/* Golden Brocade Obi Belt */}
              <path d={waistHemPath} fill={`url(#${uid}_gold_24k)`} stroke="#7F1D1D" strokeWidth="3" />
            </g>

            {/* Armored Samurai Gauntlet Cuffs (Kote) */}
            <path d={leftWristCuffPath} fill="#7F1D1D" stroke={`url(#${uid}_gold_24k)`} strokeWidth="4" />
            <path d={rightWristCuffPath} fill="#7F1D1D" stroke={`url(#${uid}_gold_24k)`} strokeWidth="4" />

            {/* 3D Embossed Golden Shogun Dragon Clan Crest (Mon) */}
            <g filter={`url(#${uid}_shadow_3d)`}>
              <circle
                cx="570"
                cy="568"
                r="36"
                fill="#450A0A"
                stroke={`url(#${uid}_gold_24k)`}
                strokeWidth="6"
              />
              <circle cx="570" cy="568" r="28" fill="none" stroke="#F59E0B" strokeWidth="1.5" strokeDasharray="5 3" />
              {/* Shogun Dragon / Sunburst Emblem */}
              <polygon
                points="570,538 579,556 598,554 585,568 596,584 577,580 570,598 563,580 544,584 555,568 542,554 561,556"
                fill={`url(#${uid}_gold_24k)`}
              />
              <circle cx="570" cy="568" r="8" fill={`url(#${uid}_ruby_gem)`} />
            </g>

            <path d={jacketSilhouettePath} fill={`url(#${uid}_cylinder_light)`} />
          </g>
        )}

        {/* -----------------------------------------------------------------
            LEVEL 7: LEGENDARY EMERALD DRAGON-SCALE REGALIA
           ----------------------------------------------------------------- */}
        {safeLevel === 7 && (
          <g>
            {/* Iridescent Emerald Dragon-Scale Base */}
            <path d={jacketSilhouettePath} fill="#022C22" />
            <path d={jacketSilhouettePath} fill={`url(#${uid}_dragon_scales)`} />

            {/* Preserve Real 3D Pixar Volumetric Folds */}
            <image
              href={foxMascotImg}
              x="0"
              y="0"
              width="1000"
              height="1000"
              filter={`url(#${uid}_volumetric_relief)`}
              style={{ mixBlendMode: 'multiply' }}
              opacity="0.7"
            />

            {/* Sculpted Antique-Gold Dragon-Lord V-Plastron & Ribbing */}
            <g filter={`url(#${uid}_shadow_3d)`}>
              <path
                d="M 382 455 C 435 495, 502 522, 560 532 C 598 522, 628 492, 648 458 L 614 758 L 518 758 Z"
                fill="#064E3B"
                fillOpacity="0.88"
                stroke={`url(#${uid}_gold_24k)`}
                strokeWidth="7"
              />
              {/* Curved Golden Dragon Ribs Across Torso */}
              <path d="M 422 536 C 485 568, 578 568, 634 536" stroke={`url(#${uid}_gold_24k)`} strokeWidth="6" fill="none" />
              <path d="M 442 596 C 498 626, 575 626, 626 596" stroke={`url(#${uid}_gold_24k)`} strokeWidth="6" fill="none" />
              <path d="M 462 654 C 510 682, 572 682, 618 654" stroke={`url(#${uid}_gold_24k)`} strokeWidth="6" fill="none" />

              {/* High Dragon-Scale Gold Collar & Belt */}
              <path d={collarRollPath} fill="#064E3B" stroke={`url(#${uid}_gold_24k)`} strokeWidth="5" />
              <path d={waistHemPath} fill={`url(#${uid}_gold_24k)`} stroke="#047857" strokeWidth="3" />
              <path d={leftWristCuffPath} fill={`url(#${uid}_gold_24k)`} />
              <path d={rightWristCuffPath} fill={`url(#${uid}_gold_24k)`} />
            </g>

            {/* Glowing Emerald Dragon-Eye Amulet in Golden Claws */}
            <g filter={`url(#${uid}_shadow_3d)`}>
              <polygon
                points="570,524 612,554 598,604 570,620 542,604 528,554"
                fill={`url(#${uid}_gold_24k)`}
                stroke="#FEF08A"
                strokeWidth="2.5"
              />
              <polygon
                points="570,536 598,572 570,608 542,572"
                fill={`url(#${uid}_emerald_gem)`}
                stroke="#6EE7B7"
                strokeWidth="3"
                filter={`url(#${uid}_glow)`}
              />
              {/* Slit Dragon Pupil */}
              <ellipse cx="570" cy="572" rx="4.5" ry="19" fill="#022C22" />
              <ellipse cx="570" cy="572" rx="2" ry="15" fill="#FEF08A" />
            </g>

            <path d={jacketSilhouettePath} fill={`url(#${uid}_cylinder_light)`} />
          </g>
        )}

        {/* -----------------------------------------------------------------
            LEVEL 8: MASTER IMPERIAL PURPLE VELVET & ERMINE MANTLE
           ----------------------------------------------------------------- */}
        {safeLevel === 8 && (
          <g>
            {/* Deep Imperial Amethyst Velvet with Baroque Gold Damask */}
            <path d={jacketSilhouettePath} fill="#3B0764" />
            <path d={jacketSilhouettePath} fill={`url(#${uid}_imperial_filigree)`} />

            {/* Preserve Real 3D Pixar Volumetric Folds */}
            <image
              href={foxMascotImg}
              x="0"
              y="0"
              width="1000"
              height="1000"
              filter={`url(#${uid}_volumetric_relief)`}
              style={{ mixBlendMode: 'multiply' }}
              opacity="0.72"
            />
            <path d={jacketSilhouettePath} fill={`url(#${uid}_cylinder_light)`} />

            {/* Diagonal 24K Gold Royal Sash & Center Gold Placket */}
            <g filter={`url(#${uid}_shadow_3d)`}>
              <polygon
                points="398,492 448,488 656,704 612,736"
                fill={`url(#${uid}_gold_24k)`}
                stroke="#FEF08A"
                strokeWidth="2"
              />
              <line x1="566" y1="540" x2="580" y2="765" stroke={`url(#${uid}_gold_24k)`} strokeWidth="10" />
              <path d={waistHemPath} fill={`url(#${uid}_gold_24k)`} />
            </g>

            {/* Plush Scalloped White Royal Ermine Fur Collar Mantle */}
            <g filter={`url(#${uid}_shadow_3d)`}>
              <path
                d="M 362 436 C 405 478, 480 512, 558 524 C 592 518, 624 488, 650 445 L 654 516 C 625 548, 592 566, 558 570 C 478 564, 410 534, 366 502 Z"
                fill="#F8FAFC"
                stroke={`url(#${uid}_gold_24k)`}
                strokeWidth="5"
              />
              {/* Classic Royal Ermine Black Tail Spots */}
              {[
                [398, 482],
                [436, 504],
                [478, 522],
                [522, 536],
                [568, 542],
                [608, 530],
                [636, 504],
              ].map(([ex, ey], i) => (
                <g key={i}>
                  <ellipse cx={ex} cy={ey} rx="3.5" ry="6" fill="#0F172A" transform={`rotate(-12 ${ex} ${ey})`} />
                  <circle cx={ex} cy={ey + 7} r="2" fill="#0F172A" />
                </g>
              ))}
            </g>

            {/* Ceremonial Jeweled Gold Chain of Office & Sovereign Star Medallion */}
            <g filter={`url(#${uid}_shadow_3d)`}>
              {/* Gold Chain Links Draped Across Chest */}
              <path
                d="M 415 520 Q 555 625 642 522"
                fill="none"
                stroke={`url(#${uid}_gold_24k)`}
                strokeWidth="9"
                strokeDasharray="14 6"
              />
              {/* Center Sovereign Star Order */}
              <circle cx="570" cy="582" r="38" fill={`url(#${uid}_gold_24k)`} stroke="#FFFFFF" strokeWidth="3" />
              <circle cx="570" cy="582" r="24" fill="#581C87" stroke="#FDE047" strokeWidth="2" />
              <polygon
                points="570,558 576,574 594,576 580,587 584,604 570,594 556,604 560,587 546,576 564,574"
                fill="#FEF08A"
              />
            </g>
          </g>
        )}

        {/* -----------------------------------------------------------------
            LEVEL 9: GRANDMASTER ASTRAL NEBULA ARMOR
           ----------------------------------------------------------------- */}
        {safeLevel === 9 && (
          <g>
            {/* Deep Cosmic Nebula Armor Base */}
            <linearGradient id={`${uid}_nebula`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#090418" />
              <stop offset="35%" stopColor="#3B0764" />
              <stop offset="68%" stopColor="#831843" />
              <stop offset="100%" stopColor="#1E1B4B" />
            </linearGradient>
            <path d={jacketSilhouettePath} fill={`url(#${uid}_nebula)`} />

            {/* Preserve Real 3D Pixar Volumetric Folds */}
            <image
              href={foxMascotImg}
              x="0"
              y="0"
              width="1000"
              height="1000"
              filter={`url(#${uid}_volumetric_relief)`}
              style={{ mixBlendMode: 'multiply' }}
              opacity="0.65"
            />

            {/* Glowing Nebula Clouds & Starfield Constellations */}
            <circle cx="465" cy="610" r="65" fill="#EC4899" fillOpacity="0.25" filter={`url(#${uid}_soft_blur)`} />
            <circle cx="615" cy="640" r="55" fill="#38BDF8" fillOpacity="0.25" filter={`url(#${uid}_soft_blur)`} />

            <polyline
              points="425,545 468,582 445,642 495,692 542,665"
              fill="none"
              stroke="#F472B6"
              strokeWidth="2"
              strokeDasharray="4 4"
            />
            <polyline
              points="635,548 608,605 638,662 602,708"
              fill="none"
              stroke="#38BDF8"
              strokeWidth="2"
              strokeDasharray="4 4"
            />
            {[
              [425, 545, 4],
              [468, 582, 3],
              [445, 642, 4.5],
              [495, 692, 3.5],
              [542, 665, 3],
              [635, 548, 4],
              [608, 605, 3.5],
              [638, 662, 4],
              [602, 708, 3],
              [325, 560, 3.5],
              [688, 575, 3.5],
            ].map(([cx, cy, r], i) => (
              <circle key={i} cx={cx} cy={cy} r={r} fill="#FFFFFF" filter={`url(#${uid}_glow)`} />
            ))}

            {/* Sculpted Celestial Gold Archon Breastplate Frame */}
            <g filter={`url(#${uid}_shadow_3d)`}>
              <path
                d="M 372 455 L 570 618 L 650 462"
                fill="none"
                stroke={`url(#${uid}_gold_24k)`}
                strokeWidth="12"
                strokeLinecap="round"
              />
              <path
                d="M 412 535 L 570 672 L 642 540"
                fill="none"
                stroke={`url(#${uid}_gold_24k)`}
                strokeWidth="7"
              />
              <path d={waistHemPath} fill={`url(#${uid}_gold_24k)`} />
              <path d={leftWristCuffPath} fill={`url(#${uid}_gold_24k)`} />
              <path d={rightWristCuffPath} fill={`url(#${uid}_gold_24k)`} />
            </g>

            {/* Singularity Vortex Core on Chest */}
            <g filter={`url(#${uid}_shadow_3d)`}>
              {/* Outer Celestial Astrolabe Ring */}
              <circle
                cx="570"
                cy="575"
                r="44"
                fill="none"
                stroke={`url(#${uid}_gold_24k)`}
                strokeWidth="4"
                strokeDasharray="12 6"
              />
              <circle
                cx="570"
                cy="575"
                r="34"
                fill="#A21CAF"
                stroke={`url(#${uid}_gold_24k)`}
                strokeWidth="5"
                filter={`url(#${uid}_glow)`}
              />
              <circle cx="570" cy="575" r="21" fill="#38BDF8" filter={`url(#${uid}_glow)`} />
              <polygon
                points="570,548 576,568 596,575 576,582 570,602 564,582 544,575 564,568"
                fill="#FFFFFF"
              />
            </g>

            <path d={jacketSilhouettePath} fill={`url(#${uid}_cylinder_light)`} />
          </g>
        )}

        {/* -----------------------------------------------------------------
            LEVEL 10: LORD FOX SUPREME GOD-EMPEROR 24K GOLD REGALIA
           ----------------------------------------------------------------- */}
        {safeLevel === 10 && (
          <g>
            {/* Royal Crimson Velvet Sleeves & Solid 24K Burnished Gold Cuirass */}
            <path d={jacketSilhouettePath} fill="#7F1D1D" />
            <path d={torsoOnlyPath} fill={`url(#${uid}_gold_24k)`} />
            <path d={jacketSilhouettePath} fill={`url(#${uid}_imperial_filigree)`} />

            {/* Preserve Real 3D Pixar Volumetric Folds across the Gold & Velvet */}
            <image
              href={foxMascotImg}
              x="0"
              y="0"
              width="1000"
              height="1000"
              filter={`url(#${uid}_volumetric_relief)`}
              style={{ mixBlendMode: 'multiply' }}
              opacity="0.64"
            />

            {/* Imperial Crimson Velvet Center Tabard with Heavy 24K Gold Border */}
            <g filter={`url(#${uid}_shadow_3d)`}>
              <path
                d="M 455 480 L 625 480 L 606 764 L 516 764 Z"
                fill="#991B1B"
                stroke={`url(#${uid}_gold_24k)`}
                strokeWidth="8"
              />
              {/* Golden Ribbed Pectoral Engravings */}
              <path d="M 402 545 L 472 568" stroke="#713F12" strokeWidth="4" strokeLinecap="round" />
              <path d="M 405 585 L 478 608" stroke="#713F12" strokeWidth="4" strokeLinecap="round" />
              <path d="M 412 625 L 485 648" stroke="#713F12" strokeWidth="4" strokeLinecap="round" />
            </g>

            {/* Sovereign White Ermine & 24K Gold Imperial Collar */}
            <g filter={`url(#${uid}_shadow_3d)`}>
              <path
                d={collarRollPath}
                fill={`url(#${uid}_gold_24k)`}
                stroke="#FFFFFF"
                strokeWidth="4"
              />
              <path
                d="M 368 455 C 415 495, 488 528, 558 538 C 592 532, 622 505, 648 465"
                stroke="#991B1B"
                strokeWidth="8"
                fill="none"
              />
            </g>

            {/* Heavy Jeweled Emperor Championship Belt & Golden Gauntlet Cuffs */}
            <g filter={`url(#${uid}_shadow_3d)`}>
              <path d={waistHemPath} fill={`url(#${uid}_gold_24k)`} stroke="#FEF08A" strokeWidth="4" />
              {[428, 478, 532, 586, 632].map((bx, i) => (
                <circle
                  key={i}
                  cx={bx}
                  cy={728 + (i === 2 ? 8 : i === 1 || i === 3 ? 5 : 0)}
                  r="8"
                  fill={`url(#${uid}_ruby_gem)`}
                  stroke="#FEF08A"
                  strokeWidth="2.5"
                />
              ))}
              <path d={leftWristCuffPath} fill={`url(#${uid}_gold_24k)`} stroke="#FEF08A" strokeWidth="3" />
              <path d={rightWristCuffPath} fill={`url(#${uid}_gold_24k)`} stroke="#FEF08A" strokeWidth="3" />
            </g>

            {/* Double Imperial Gold Chains & Blazing Ruby Sun-Crown Medallion */}
            <g filter={`url(#${uid}_shadow_3d)`}>
              <path
                d="M 405 512 Q 560 615 645 515"
                fill="none"
                stroke={`url(#${uid}_gold_24k)`}
                strokeWidth="10"
                strokeDasharray="14 5"
              />
              <path
                d="M 415 548 Q 560 655 642 552"
                fill="none"
                stroke={`url(#${uid}_gold_24k)`}
                strokeWidth="7"
                strokeDasharray="10 5"
              />

              {/* 12-Pointed Imperial Sunburst Medallion */}
              <circle
                cx="568"
                cy="576"
                r="45"
                fill={`url(#${uid}_gold_24k)`}
                stroke="#FFFFFF"
                strokeWidth="4"
                filter={`url(#${uid}_glow)`}
              />
              <polygon
                points="568,534 580,558 606,558 586,574 594,600 568,586 542,600 550,574 530,558 556,558"
                fill="#FEF08A"
              />
              {/* Faceted Imperial Ruby Heart */}
              <polygon
                points="568,544 596,576 568,608 540,576"
                fill={`url(#${uid}_ruby_gem)`}
                stroke="#FEF08A"
                strokeWidth="3.5"
              />
              <circle cx="568" cy="576" r="10" fill="#FFFFFF" />
            </g>

            <path d={jacketSilhouettePath} fill={`url(#${uid}_cylinder_light)`} />
          </g>
        )}
      </g>

      {/* =====================================================================
          EXTERNAL 3D SCULPTED SHOULDER PAULDRONS / EPAULETS (Levels 5 to 10)
          Rendered outside the clipPath so multi-tiered shoulder armor, fringes,
          and wings sit proudly in 3D space on top of the Fox's shoulders
         ===================================================================== */}
      {safeLevel >= 5 && (
        <g filter={`url(#${uid}_shadow_3d)`}>
          {/* Left Shoulder Pauldron (Viewer's Left) */}
          <path
            d="M 332 504 C 358 462, 405 466, 442 496 C 422 532, 378 544, 338 538 Z"
            fill={
              safeLevel === 5
                ? `url(#${uid}_diamond_facet)`
                : safeLevel === 7
                ? '#047857'
                : safeLevel === 9
                ? '#C026D3'
                : `url(#${uid}_gold_24k)`
            }
            stroke={safeLevel === 5 ? '#FFFFFF' : `url(#${uid}_gold_24k)`}
            strokeWidth="4.5"
          />
          {/* Left Pauldron Inner Tier & Bullion Fringe */}
          <path
            d="M 345 516 C 368 492, 402 495, 428 514"
            fill="none"
            stroke="#FFFFFF"
            strokeWidth="2.5"
            strokeOpacity="0.8"
          />

          {/* Right Shoulder Pauldron (Viewer's Right) */}
          <path
            d="M 605 496 C 642 468, 678 474, 698 516 C 672 544, 636 538, 610 532 Z"
            fill={
              safeLevel === 5
                ? `url(#${uid}_diamond_facet)`
                : safeLevel === 7
                ? '#047857'
                : safeLevel === 9
                ? '#C026D3'
                : `url(#${uid}_gold_24k)`}
            stroke={safeLevel === 5 ? '#FFFFFF' : `url(#${uid}_gold_24k)`}
            strokeWidth="4.5"
          />
          <path
            d="M 616 514 C 638 496, 668 500, 686 520"
            fill="none"
            stroke="#FFFFFF"
            strokeWidth="2.5"
            strokeOpacity="0.8"
          />

          {/* Golden Bullion Tassels / Fringes Hanging from Epaulets (Levels 8, 9, 10) */}
          {safeLevel >= 8 && (
            <g stroke={`url(#${uid}_gold_24k)`} strokeWidth="3.5" strokeLinecap="round">
              <line x1="348" y1="536" x2="344" y2="554" />
              <line x1="362" y1="538" x2="358" y2="558" />
              <line x1="376" y1="538" x2="374" y2="558" />
              <line x1="390" y1="536" x2="388" y2="554" />

              <line x1="635" y1="534" x2="637" y2="552" />
              <line x1="650" y1="536" x2="652" y2="556" />
              <line x1="665" y1="536" x2="668" y2="556" />
              <line x1="680" y1="532" x2="684" y2="550" />
            </g>
          )}

          {/* Embedded Shoulder Jewels for High Tiers */}
          <circle
            cx="388"
            cy="505"
            r="9"
            fill={
              safeLevel === 10 || safeLevel === 6
                ? `url(#${uid}_ruby_gem)`
                : safeLevel === 7
                ? `url(#${uid}_emerald_gem)`
                : '#38BDF8'
            }
            stroke="#FEF08A"
            strokeWidth="2.5"
          />
          <circle
            cx="648"
            cy="508"
            r="9"
            fill={
              safeLevel === 10 || safeLevel === 6
                ? `url(#${uid}_ruby_gem)`
                : safeLevel === 7
                ? `url(#${uid}_emerald_gem)`
                : '#38BDF8'
            }
            stroke="#FEF08A"
            strokeWidth="2.5"
          />
        </g>
      )}
    </svg>
  );
});
