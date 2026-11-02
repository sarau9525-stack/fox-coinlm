import { UpgradeDefinition, UserGameState } from '../../types/game.js';

export type CityTimeMode = 'day' | 'sunset' | 'night' | 'rainy';
export type CityCameraPreset = 'angle' | 'top' | 'close' | 'plaza';
export type CityQualityTier = 'low' | 'medium' | 'high';
export type FoxMascotAnimMode = 'auto' | 'idle' | 'walk' | 'run' | 'interact';

export type FoxCityBuildingId =
  | 'headquarters'
  | 'mine'
  | 'factory'
  | 'research'
  | 'marketplace'
  | 'residential'
  | 'power'
  | 'helipad';

export interface FoxCityBuildingConfig {
  id: FoxCityBuildingId;
  name: string;
  shortName: string;
  districtName: string;
  tagline: string;
  description: string;
  bonusLabel: string;
  capacityLabel: string;
  accentColor: string;
  iconType:
    | 'crown'
    | 'pickaxe'
    | 'factory'
    | 'flask'
    | 'store'
    | 'home'
    | 'zap'
    | 'helicopter';
  /** World 3D coordinates [x, y, z] for camera focus and label projection */
  position: [number, number, number];
  /** Normalized [0..100, 0..100] coordinates for the interactive 2D Mini-Map */
  mapCoords: [number, number];
  /** Camera offset when focusing this building */
  focusOffset: [number, number, number];
  /** Ordered list of real UpgradeDefinition IDs mapped to this building/district */
  mappedUpgradeIds: string[];
  /** Default display level when player has not upgraded yet */
  defaultDisplayLevel: number;
  /** Standalone Demo Mode base upgrade cost */
  demoBaseCost: number;
  /** Standalone Demo Mode base hourly production per level */
  demoBaseProduction: number;
  /** Crop coordinates on the concept sheet image for high-detail preview thumbnail */
  conceptCrop: {
    left: string;
    top: string;
    width: string;
    height: string;
  };
}

export const FOX_CITY_CONCEPT_ASSET =
  '/assets/aistudio/file_000000005390820ab200e1d2a578a414_c09c0728.png';

export const FOX_CITY_BUILDINGS: FoxCityBuildingConfig[] = [
  {
    id: 'headquarters',
    name: 'FOX Headquarters',
    shortName: 'Headquarters',
    districtName: 'Central Command Citadel',
    tagline: 'The sovereign heart of FOX CITY',
    description:
      'Towering black-and-gold command citadel crowned with a levitating Amber Genesis Crystal and holographic FOX emblem.',
    bonusLabel: '+5% Income',
    capacityLabel: '+15% Command Vault',
    accentColor: '#F59E0B',
    iconType: 'crown',
    position: [0, 4.2, -7.2],
    mapCoords: [50, 20],
    focusOffset: [0, 6.2, 9.5],
    mappedUpgradeIds: [
      'fox_wall_street_tower',
      'golden_vault',
      'clan_embassy',
      'sovereign_fox_central_bank',
      'eternal_fox_citadel',
    ],
    defaultDisplayLevel: 3,
    demoBaseCost: 2500,
    demoBaseProduction: 650,
    conceptCrop: {
      left: '-691%',
      top: '-32%',
      width: '1020%',
      height: '750%',
    },
  },
  {
    id: 'mine',
    name: 'Amber Crystal Mine',
    shortName: 'Mine',
    districtName: 'Northern Mining Ridge',
    tagline: 'Deep-core FOX ore & crystal extraction',
    description:
      'Heavy mountain excavation complex with automated ore conveyors, molten amber crystal veins, and autonomous haul trucks.',
    bonusLabel: '+5% Extraction',
    capacityLabel: '+12% Ore Throughput',
    accentColor: '#FBBF24',
    iconType: 'pickaxe',
    position: [-7.8, 2.5, -7.2],
    mapCoords: [22, 22],
    focusOffset: [-2.8, 5.2, 8.6],
    mappedUpgradeIds: [
      'crypto_burrow',
      'geothermal_mining_city',
      'asteroid_platinum_rig',
      'tap_power',
      'cyber_claws',
      'plasma_paws',
      'celestial_gauntlet',
    ],
    defaultDisplayLevel: 2,
    demoBaseCost: 1200,
    demoBaseProduction: 380,
    conceptCrop: {
      left: '-800%',
      top: '-32%',
      width: '1020%',
      height: '750%',
    },
  },
  {
    id: 'factory',
    name: 'Industrial Factory',
    shortName: 'Factory',
    districtName: 'Foundry & Smelting Sector',
    tagline: 'Automated bullion minting & production lines',
    description:
      'High-output industrial refinery with twin thermal smokestacks, rotating golden drive gears, and robotic assembly lines.',
    bonusLabel: '+5% Production',
    capacityLabel: '+10% Refinery Output',
    accentColor: '#FB923C',
    iconType: 'factory',
    position: [7.8, 2.5, -7.2],
    mapCoords: [78, 22],
    focusOffset: [2.8, 5.2, 8.6],
    mappedUpgradeIds: [
      'coffee_roastery',
      'blockchain_den',
      'antarctic_data_bunker',
      'mars_terraforming_colony',
    ],
    defaultDisplayLevel: 2,
    demoBaseCost: 1400,
    demoBaseProduction: 420,
    conceptCrop: {
      left: '-908%',
      top: '-32%',
      width: '1020%',
      height: '750%',
    },
  },
  {
    id: 'research',
    name: 'Research Laboratory',
    shortName: 'Research Lab',
    districtName: 'Quantum Innovation Campus',
    tagline: 'Plasma cores & neural mining algorithms',
    description:
      'Futuristic laboratory featuring a levitating blue-gold containment sphere, gyroscopic rings, and AI arbitrage processors.',
    bonusLabel: '+5% Efficiency',
    capacityLabel: '+14% Neural Sync',
    accentColor: '#38BDF8',
    iconType: 'flask',
    position: [-9.2, 2.1, 1.3],
    mapCoords: [18, 56],
    focusOffset: [-2.5, 4.8, 8.2],
    mappedUpgradeIds: [
      'ai_trading_bot_farm',
      'quantum_supercomputer',
      'multiverse_nexus_engine',
      'hyper_reflex_nerves',
    ],
    defaultDisplayLevel: 1,
    demoBaseCost: 1800,
    demoBaseProduction: 510,
    conceptCrop: {
      left: '-691%',
      top: '-179%',
      width: '1020%',
      height: '750%',
    },
  },
  {
    id: 'marketplace',
    name: 'FOX Marketplace',
    shortName: 'Marketplace',
    districtName: 'Harbor Trade & Commerce Pier',
    tagline: 'Bustling merchant stalls & harbor shipping',
    description:
      'Waterfront commercial district with illuminated neon market signs, striped awnings, cargo docks, and merchant vessels.',
    bonusLabel: '+5% Trade',
    capacityLabel: '+10% Market Liquidity',
    accentColor: '#F59E0B',
    iconType: 'store',
    position: [-1.2, 1.7, 6.8],
    mapCoords: [46, 82],
    focusOffset: [-1.0, 4.6, 8.2],
    mappedUpgradeIds: [
      'berry_stand',
      'nft_art_studio',
      'defi_liquidity_pool',
      'global_exchange_license',
      'vip_launchpad_pass',
    ],
    defaultDisplayLevel: 1,
    demoBaseCost: 900,
    demoBaseProduction: 290,
    conceptCrop: {
      left: '-800%',
      top: '-179%',
      width: '1020%',
      height: '750%',
    },
  },
  {
    id: 'residential',
    name: 'Residential District',
    shortName: 'Residential',
    districtName: 'Waterfall Terrace Homes',
    tagline: 'Cozy fox villas, gardens & arcade lounges',
    description:
      'Scenic cliffside neighborhood overlooking the eastern waterfalls with warm lit townhouses, parks, and crew lounges.',
    bonusLabel: '+5% Population',
    capacityLabel: '+10% Crew Stamina',
    accentColor: '#34D399',
    iconType: 'home',
    position: [9.2, 1.8, 2.2],
    mapCoords: [82, 60],
    focusOffset: [2.5, 4.8, 8.2],
    mappedUpgradeIds: [
      'fox_arcade_club',
      'energy_tank',
      'energy_recovery',
      'galactic_whale_consortium',
    ],
    defaultDisplayLevel: 1,
    demoBaseCost: 1100,
    demoBaseProduction: 320,
    conceptCrop: {
      left: '-908%',
      top: '-179%',
      width: '1020%',
      height: '750%',
    },
  },
  {
    id: 'power',
    name: 'Power & Energy Station',
    shortName: 'Power Grid',
    districtName: 'High-Voltage Turbine Nexus',
    tagline: 'Clean plasma turbines & grid stabilizers',
    description:
      'Dual kinetic wind-plasma turbines and high-voltage capacitor banks supplying uninterrupted power across FOX CITY.',
    bonusLabel: '+5% Energy Output',
    capacityLabel: '+12% Grid Stability',
    accentColor: '#60A5FA',
    iconType: 'zap',
    position: [-2.6, 2.1, 1.3],
    mapCoords: [40, 54],
    focusOffset: [-1.8, 4.8, 7.8],
    mappedUpgradeIds: [
      'ton_validator_node',
      'dyson_swarm_collector',
      'quantum_reactor_battery',
    ],
    defaultDisplayLevel: 1,
    demoBaseCost: 1600,
    demoBaseProduction: 460,
    conceptCrop: {
      left: '-691%',
      top: '-179%',
      width: '1020%',
      height: '750%',
    },
  },
  {
    id: 'helipad',
    name: 'Helipad & Skyport',
    shortName: 'Helipad',
    districtName: 'Aerial Transport Ridge',
    tagline: 'VIP airlift & orbital expedition dispatch',
    description:
      'Elevated cliffside skyport with perimeter strobe beacons and the patrolling FOX Coin executive helicopter.',
    bonusLabel: '+5% Logistics',
    capacityLabel: '+8% Airlift Speed',
    accentColor: '#FBBF24',
    iconType: 'helicopter',
    position: [10.2, 3.0, -8.2],
    mapCoords: [88, 14],
    focusOffset: [3.2, 5.8, 8.5],
    mappedUpgradeIds: [
      'space_mission',
      'vip_launchpad_pass',
      'asteroid_platinum_rig',
    ],
    defaultDisplayLevel: 1,
    demoBaseCost: 2100,
    demoBaseProduction: 580,
    conceptCrop: {
      left: '-908%',
      top: '-32%',
      width: '1020%',
      height: '750%',
    },
  },
];

export interface BuildingResolvedState {
  building: FoxCityBuildingConfig;
  /** Real owned level summed across mapped upgrades or primary upgrade */
  realOwnedLevel: number;
  /** Display level shown on city badges */
  displayLevel: number;
  /** Total real hourly FOX or tap benefit currently produced by this building's upgrades */
  currentHourlyContribution: number;
  /** Alias for total hourly profit contributed by this building's owned upgrades */
  totalHourlyProfit: number;
  /** Total tap benefit contributed by this building's upgrades */
  currentTapContribution: number;
  /** Count of upgrades in this building that the player currently owns (level > 0) */
  unlockedCount: number;
  /** List of resolved UpgradeDefinitions belonging to this building */
  upgrades: UpgradeDefinition[];
  /** Primary UpgradeDefinition selected by default when inspecting this building */
  primaryUpgrade: UpgradeDefinition | null;
}

export function calculateUpgradeCost(
  upgrade: UpgradeDefinition,
  currentLevel: number
): number {
  return Math.floor(
    upgrade.basePrice * Math.pow(upgrade.priceMultiplier, Math.max(0, currentLevel))
  );
}

export function resolveBuildingState(
  building: FoxCityBuildingConfig,
  user: UserGameState,
  allUpgrades: UpgradeDefinition[],
  demoLevels?: Record<FoxCityBuildingId, number>
): BuildingResolvedState {
  const nonGiftUpgrades = allUpgrades.filter((u) => u.category !== 'gift');
  const matched: UpgradeDefinition[] = [];

  for (const id of building.mappedUpgradeIds) {
    const found = nonGiftUpgrades.find((u) => u.id === id);
    if (found && !matched.some((m) => m.id === found.id)) {
      matched.push(found);
    }
  }

  if (matched.length === 0 && nonGiftUpgrades.length > 0) {
    matched.push(nonGiftUpgrades[0]);
  }

  let realOwnedLevel = 0;
  let currentHourlyContribution = 0;
  let currentTapContribution = 0;
  let unlockedCount = 0;

  for (const up of matched) {
    const lv = Math.max(0, Math.floor(Number(user.upgrades?.[up.id]) || 0));
    if (lv > 0) {
      unlockedCount++;
    }
    realOwnedLevel += lv;
    if (up.benefitType === 'profit_per_hour') {
      currentHourlyContribution += lv * up.baseBenefit;
    } else if (up.benefitType === 'tap_power') {
      currentTapContribution += lv * up.baseBenefit;
    }
  }

  const primaryUpgrade = matched[0] || null;
  const primaryOwnedLv = primaryUpgrade
    ? Math.max(0, Math.floor(Number(user.upgrades?.[primaryUpgrade.id]) || 0))
    : 0;

  const extraDemoLv = demoLevels ? demoLevels[building.id] || 0 : 0;

  const displayLevel =
    (realOwnedLevel > 0
      ? Math.max(building.defaultDisplayLevel, realOwnedLevel)
      : building.defaultDisplayLevel) + extraDemoLv;

  const totalHourly =
    currentHourlyContribution + extraDemoLv * building.demoBaseProduction;

  return {
    building,
    realOwnedLevel: Math.max(primaryOwnedLv, realOwnedLevel) + extraDemoLv,
    displayLevel,
    currentHourlyContribution: totalHourly,
    totalHourlyProfit: totalHourly,
    currentTapContribution,
    unlockedCount,
    upgrades: matched,
    primaryUpgrade,
  };
}

