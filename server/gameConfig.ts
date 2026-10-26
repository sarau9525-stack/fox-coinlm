import { UpgradeDefinition, PlayerLevel, TaskDefinition, DailyRewardDay, LuckyWheelPrize } from '../src/types/game.js';

export const PLAYER_LEVELS: PlayerLevel[] = [
  { level: 1, name: 'Bronze Fox', minCoins: 0, badge: '🥉' },
  { level: 2, name: 'Silver Fox', minCoins: 5_000, badge: '🥈' },
  { level: 3, name: 'Gold Fox', minCoins: 25_000, badge: '🥇' },
  { level: 4, name: 'Platinum Fox', minCoins: 100_000, badge: '💎' },
  { level: 5, name: 'Diamond Fox', minCoins: 1_000_000, badge: '💠' },
  { level: 6, name: 'Epic Fox', minCoins: 5_000_000, badge: '🔥' },
  { level: 7, name: 'Legendary Fox', minCoins: 20_000_000, badge: '⚡' },
  { level: 8, name: 'Master Fox', minCoins: 100_000_000, badge: '👑' },
  { level: 9, name: 'Grandmaster Fox', minCoins: 500_000_000, badge: '🌟' },
  { level: 10, name: 'Lord Fox', minCoins: 1_000_000_000, badge: '🪐' },
];

export interface FoxLeagueDefinition {
  id: 'bronze' | 'silver' | 'gold' | 'diamond' | 'legendary';
  name: 'Bronze Fox' | 'Silver Fox' | 'Gold Fox' | 'Diamond Fox' | 'Legendary Fox';
  minCoins: number;
  maxCoins: number | null;
  rangeLabel: string;
  badgeImg: string;
  accentColor: string;
}

export const FOX_LEAGUES: FoxLeagueDefinition[] = [
  {
    id: 'bronze',
    name: 'Bronze Fox',
    minCoins: 0,
    maxCoins: 9_999_999,
    rangeLabel: '0 – 10M',
    badgeImg: '/assets/rank/league_bronze.png',
    accentColor: '#D97706',
  },
  {
    id: 'silver',
    name: 'Silver Fox',
    minCoins: 10_000_000,
    maxCoins: 49_999_999,
    rangeLabel: '10M – 50M',
    badgeImg: '/assets/rank/league_silver.png',
    accentColor: '#CBD5E1',
  },
  {
    id: 'gold',
    name: 'Gold Fox',
    minCoins: 50_000_000,
    maxCoins: 199_999_999,
    rangeLabel: '50M – 200M',
    badgeImg: '/assets/rank/league_gold.png',
    accentColor: '#FBBF24',
  },
  {
    id: 'diamond',
    name: 'Diamond Fox',
    minCoins: 200_000_000,
    maxCoins: 999_999_999,
    rangeLabel: '200M – 1B',
    badgeImg: '/assets/rank/league_diamond.png',
    accentColor: '#38BDF8',
  },
  {
    id: 'legendary',
    name: 'Legendary Fox',
    minCoins: 1_000_000_000,
    maxCoins: null,
    rangeLabel: '1B+',
    badgeImg: '/assets/rank/league_legendary.png',
    accentColor: '#F59E0B',
  },
];

export function getFoxLeagueForScore(score: number): FoxLeagueDefinition {
  const safeScore = Math.max(0, Number(score) || 0);
  for (let i = FOX_LEAGUES.length - 1; i >= 0; i--) {
    if (safeScore >= FOX_LEAGUES[i].minCoins) {
      return FOX_LEAGUES[i];
    }
  }
  return FOX_LEAGUES[0];
}

export const UPGRADES: UpgradeDefinition[] = [
  // Tap & Energy upgrades
  {
    id: 'tap_power',
    name: 'Fox Claws (Tap Power)',
    description: 'Increases FOX earned per tap by +1',
    category: 'tap',
    basePrice: 50,
    priceMultiplier: 1.45,
    baseBenefit: 1,
    benefitType: 'tap_power',
    icon: 'Flame',
    levelRequirement: 1,
  },
  {
    id: 'energy_tank',
    name: 'Energy Backpack',
    description: 'Increases maximum stamina by +500',
    category: 'tap',
    basePrice: 100,
    priceMultiplier: 1.5,
    baseBenefit: 500,
    benefitType: 'max_energy',
    icon: 'BatteryCharging',
    levelRequirement: 1,
  },
  {
    id: 'energy_recovery',
    name: 'Fox Metabolism',
    description: 'Accelerates energy regeneration by +1/sec',
    category: 'tap',
    basePrice: 250,
    priceMultiplier: 1.6,
    baseBenefit: 1,
    benefitType: 'energy_regen',
    icon: 'Zap',
    levelRequirement: 2,
  },
  {
    id: 'cyber_claws',
    name: 'Cybernetic Claws',
    description: 'High-tech cyber prosthetics adding +5 per tap',
    category: 'tap',
    basePrice: 10_000,
    priceMultiplier: 1.55,
    baseBenefit: 5,
    benefitType: 'tap_power',
    icon: 'Sparkles',
    levelRequirement: 3,
  },
  {
    id: 'plasma_paws',
    name: 'Plasma Strike Paws',
    description: 'Superheated plasma gauntlets adding +15 FOX per tap',
    category: 'tap',
    basePrice: 85_000,
    priceMultiplier: 1.55,
    baseBenefit: 15,
    benefitType: 'tap_power',
    icon: '⚡',
    levelRequirement: 4,
  },
  {
    id: 'quantum_reactor_battery',
    name: 'Quantum Stamina Core',
    description: 'Increases maximum energy capacity by +2,500',
    category: 'tap',
    basePrice: 150_000,
    priceMultiplier: 1.55,
    baseBenefit: 2_500,
    benefitType: 'max_energy',
    icon: '🔋',
    levelRequirement: 5,
  },
  {
    id: 'hyper_reflex_nerves',
    name: 'Hyper-Reflex Neural Link',
    description: 'Boosts energy recovery speed by +4/sec',
    category: 'tap',
    basePrice: 400_000,
    priceMultiplier: 1.6,
    baseBenefit: 4,
    benefitType: 'energy_regen',
    icon: '🧬',
    levelRequirement: 6,
  },
  {
    id: 'celestial_gauntlet',
    name: 'Celestial God Claws',
    description: 'Mythic astral claws granting +50 FOX per tap',
    category: 'tap',
    basePrice: 1_500_000,
    priceMultiplier: 1.6,
    baseBenefit: 50,
    benefitType: 'tap_power',
    icon: '☄️',
    levelRequirement: 7,
  },

  // Passive income upgrades (Level 1 to Level 10 High-Profit Cards)
  {
    id: 'berry_stand',
    name: 'Forest Berry Stand',
    description: 'A cozy kiosk selling fresh berries for FOX',
    category: 'passive',
    basePrice: 150,
    priceMultiplier: 1.35,
    baseBenefit: 100, // +100/hr
    benefitType: 'profit_per_hour',
    icon: 'Store',
    levelRequirement: 1,
  },
  {
    id: 'coffee_roastery',
    name: 'Fox Coffee Roastery',
    description: 'Craft espresso beans powering your fox crew',
    category: 'passive',
    basePrice: 800,
    priceMultiplier: 1.35,
    baseBenefit: 450, // +450/hr
    benefitType: 'profit_per_hour',
    icon: 'Coffee',
    levelRequirement: 1,
  },
  {
    id: 'fox_arcade_club',
    name: 'Neon Fox Arcade Club',
    description: 'Retro-futuristic gaming lounge earning steady coin flow',
    category: 'passive',
    basePrice: 2_200,
    priceMultiplier: 1.36,
    baseBenefit: 1_150, // +1,150/hr
    benefitType: 'profit_per_hour',
    icon: '🎮',
    levelRequirement: 1,
  },
  {
    id: 'crypto_burrow',
    name: 'Crypto Burrow Mining',
    description: 'Underground micro-ASIC burrow mining FOX coins.',
    category: 'passive',
    basePrice: 4_500,
    priceMultiplier: 1.38,
    baseBenefit: 2_200, // +2,200/hr
    benefitType: 'profit_per_hour',
    icon: 'Cpu',
    levelRequirement: 1,
  },
  {
    id: 'nft_art_studio',
    name: 'Fox NFT Art Studio',
    description: 'Digital collectibles gallery minting rare fox portraits',
    category: 'passive',
    basePrice: 12_000,
    priceMultiplier: 1.38,
    baseBenefit: 5_600, // +5,600/hr
    benefitType: 'profit_per_hour',
    icon: '🎨',
    levelRequirement: 2,
  },
  {
    id: 'blockchain_den',
    name: 'Blockchain Fox Den',
    description: 'Distributed consensus cluster run by clever foxes',
    category: 'passive',
    basePrice: 25_000,
    priceMultiplier: 1.4,
    baseBenefit: 11_000, // +11,000/hr
    benefitType: 'profit_per_hour',
    icon: 'Server',
    levelRequirement: 3,
  },
  {
    id: 'defi_liquidity_pool',
    name: 'DeFi Liquidity Pool',
    description: 'Automated market maker yielding high-frequency swap fees',
    category: 'passive',
    basePrice: 60_000,
    priceMultiplier: 1.4,
    baseBenefit: 25_000, // +25,000/hr
    benefitType: 'profit_per_hour',
    icon: '💧',
    levelRequirement: 3,
  },
  {
    id: 'space_mission',
    name: 'Fox Lunar Expedition',
    description: 'Orbital satellite station transmitting FOX signals',
    category: 'passive',
    basePrice: 120_000,
    priceMultiplier: 1.42,
    baseBenefit: 48_000, // +48,000/hr
    benefitType: 'profit_per_hour',
    icon: 'Rocket',
    levelRequirement: 4,
  },
  {
    id: 'ai_trading_bot_farm',
    name: 'AI Neural Trading Desk',
    description: 'Deep-learning arbitrage algorithms trading FOX 24/7',
    category: 'passive',
    basePrice: 280_000,
    priceMultiplier: 1.43,
    baseBenefit: 105_000, // +105,000/hr
    benefitType: 'profit_per_hour',
    icon: '🤖',
    levelRequirement: 4,
  },
  {
    id: 'golden_vault',
    name: 'Golden Vault Syndicate',
    description: 'High-security underground gold vault generating yields',
    category: 'passive',
    basePrice: 650_000,
    priceMultiplier: 1.45,
    baseBenefit: 220_000, // +220,000/hr
    benefitType: 'profit_per_hour',
    icon: 'ShieldCheck',
    levelRequirement: 5,
  },
  {
    id: 'quantum_supercomputer',
    name: 'Quantum Supercomputer Hub',
    description: 'Sub-zero photonic processors solving blocks at lightspeed',
    category: 'passive',
    basePrice: 1_400_000,
    priceMultiplier: 1.45,
    baseBenefit: 460_000, // +460,000/hr
    benefitType: 'profit_per_hour',
    icon: '💻',
    levelRequirement: 5,
  },
  {
    id: 'geothermal_mining_city',
    name: 'Volcanic Geothermal Mine',
    description: 'Magma-powered mega mining facility in a volcanic crater',
    category: 'passive',
    basePrice: 3_200_000,
    priceMultiplier: 1.46,
    baseBenefit: 980_000, // +980,000/hr
    benefitType: 'profit_per_hour',
    icon: '🌋',
    levelRequirement: 6,
  },
  {
    id: 'fox_wall_street_tower',
    name: 'Fox Wall Street Skyscraper',
    description: '100-story financial headquarters dominating global markets',
    category: 'passive',
    basePrice: 7_500_000,
    priceMultiplier: 1.47,
    baseBenefit: 2_150_000, // +2.15M/hr
    benefitType: 'profit_per_hour',
    icon: '🏙️',
    levelRequirement: 6,
  },
  {
    id: 'antarctic_data_bunker',
    name: 'Antarctic Cryo Data Bunker',
    description: 'Naturally cooled continental server fortress under the ice',
    category: 'passive',
    basePrice: 16_000_000,
    priceMultiplier: 1.48,
    baseBenefit: 4_400_000, // +4.4M/hr
    benefitType: 'profit_per_hour',
    icon: '🧊',
    levelRequirement: 7,
  },
  {
    id: 'mars_terraforming_colony',
    name: 'Mars Fox Colony Alpha',
    description: 'Interplanetary red-planet mining domes & starports',
    category: 'passive',
    basePrice: 38_000_000,
    priceMultiplier: 1.49,
    baseBenefit: 9_800_000, // +9.8M/hr
    benefitType: 'profit_per_hour',
    icon: '🪐',
    levelRequirement: 7,
  },
  {
    id: 'asteroid_platinum_rig',
    name: 'Asteroid Belt Platinum Rig',
    description: 'Autonomous spacecraft harvesting solid platinum asteroids',
    category: 'passive',
    basePrice: 85_000_000,
    priceMultiplier: 1.5,
    baseBenefit: 21_000_000, // +21M/hr
    benefitType: 'profit_per_hour',
    icon: '☄️',
    levelRequirement: 8,
  },
  {
    id: 'dyson_swarm_collector',
    name: 'Solar Dyson Swarm Array',
    description: 'Stellar megastructure capturing 100% of solar star output',
    category: 'passive',
    basePrice: 210_000_000,
    priceMultiplier: 1.52,
    baseBenefit: 48_000_000, // +48M/hr
    benefitType: 'profit_per_hour',
    icon: '☀️',
    levelRequirement: 9,
  },
  {
    id: 'multiverse_nexus_engine',
    name: 'Multiverse Fox Singularity',
    description: 'Harvests infinite FOX liquidity across parallel dimensions',
    category: 'passive',
    basePrice: 550_000_000,
    priceMultiplier: 1.55,
    baseBenefit: 120_000_000, // +120M/hr
    benefitType: 'profit_per_hour',
    icon: '🌌',
    levelRequirement: 10,
  },

  // Special / Clan & High-Roller VIP upgrades
  {
    id: 'vip_launchpad_pass',
    name: 'VIP Token Launchpad',
    description: 'Early-access allocation in premier Web3 token launches',
    category: 'special',
    basePrice: 45_000,
    priceMultiplier: 1.42,
    baseBenefit: 19_500,
    benefitType: 'profit_per_hour',
    icon: '🎟️',
    levelRequirement: 2,
  },
  {
    id: 'ton_validator_node',
    name: 'TON Master Validator Node',
    description: 'Official institutional validator staking pool on TON',
    category: 'special',
    basePrice: 350_000,
    priceMultiplier: 1.45,
    baseBenefit: 135_000,
    benefitType: 'profit_per_hour',
    icon: '💎',
    levelRequirement: 4,
  },
  {
    id: 'clan_embassy',
    name: 'Fox Clan Embassy',
    description: 'Diplomatic headquarters recruiting elite fox syndicates',
    category: 'special',
    basePrice: 2_500_000,
    priceMultiplier: 1.5,
    baseBenefit: 750_000,
    benefitType: 'profit_per_hour',
    icon: 'Crown',
    levelRequirement: 5,
  },
  {
    id: 'global_exchange_license',
    name: 'Tier-1 Exchange Listing',
    description: 'Global exchange market-making license generating massive volume',
    category: 'special',
    basePrice: 12_000_000,
    priceMultiplier: 1.5,
    baseBenefit: 3_500_000,
    benefitType: 'profit_per_hour',
    icon: '🏦',
    levelRequirement: 6,
  },
  {
    id: 'sovereign_fox_central_bank',
    name: 'Sovereign Fox Central Bank',
    description: 'Global reserve treasury printing institutional FOX bonds',
    category: 'special',
    basePrice: 50_000_000,
    priceMultiplier: 1.52,
    baseBenefit: 14_000_000,
    benefitType: 'profit_per_hour',
    icon: '🏛️',
    levelRequirement: 7,
  },
  {
    id: 'galactic_whale_consortium',
    name: 'Galactic Whale Consortium',
    description: 'Secret council of trillionaire Fox Whales ruling the market',
    category: 'special',
    basePrice: 180_000_000,
    priceMultiplier: 1.54,
    baseBenefit: 45_000_000,
    benefitType: 'profit_per_hour',
    icon: '🐳',
    levelRequirement: 8,
  },
  {
    id: 'eternal_fox_citadel',
    name: 'Eternal Lord Fox Citadel',
    description: 'Ultimate Level 10 monument generating astronomical passive profit',
    category: 'special',
    basePrice: 750_000_000,
    priceMultiplier: 1.58,
    baseBenefit: 180_000_000,
    benefitType: 'profit_per_hour',
    icon: '👑',
    levelRequirement: 10,
  },

  // Collectible Telegram Fox Gifts (Priced in Telegram Stars ★)
  {
    id: 'gift_star_fox',
    name: 'Golden Star Fox',
    description: 'Classic Telegram Star Fox holding a glowing golden star gift box',
    category: 'gift',
    basePrice: 50,
    priceMultiplier: 1.15,
    baseBenefit: 300,
    benefitType: 'profit_per_hour',
    icon: 'StarFox',
    levelRequirement: 1,
  },
  {
    id: 'gift_sakura_fox',
    name: 'Sakura Kitsune Fox',
    description: 'Mystic cherry-blossom nine-tailed Kitsune fox wrapped in silk ribbons',
    category: 'gift',
    basePrice: 100,
    priceMultiplier: 1.15,
    baseBenefit: 1_400,
    benefitType: 'profit_per_hour',
    icon: 'SakuraFox',
    levelRequirement: 1,
  },
  {
    id: 'gift_cyber_fox',
    name: 'Cyberpunk Neon Fox',
    description: 'Holographic neon-visor cyber fox pulsing with TON synthwave energy',
    category: 'gift',
    basePrice: 250,
    priceMultiplier: 1.15,
    baseBenefit: 4_200,
    benefitType: 'profit_per_hour',
    icon: 'CyberFox',
    levelRequirement: 1,
  },
  {
    id: 'gift_pirate_fox',
    name: 'Captain Treasure Fox',
    description: 'Swashbuckling pirate captain fox guarding an overflowing chest of gold',
    category: 'gift',
    basePrice: 350,
    priceMultiplier: 1.15,
    baseBenefit: 9_000,
    benefitType: 'profit_per_hour',
    icon: 'PirateFox',
    levelRequirement: 1,
  },
  {
    id: 'gift_arctic_fox',
    name: 'Arctic Frost Crystal Fox',
    description: 'Glacial aurora fox sculpted from enchanted blue ice and frost crystals',
    category: 'gift',
    basePrice: 500,
    priceMultiplier: 1.15,
    baseBenefit: 19_500,
    benefitType: 'profit_per_hour',
    icon: 'ArcticFox',
    levelRequirement: 2,
  },
  {
    id: 'gift_samurai_fox',
    name: 'Shogun Katana Fox',
    description: 'Feudal crimson-and-gold armored samurai fox wielding twin flame katanas',
    category: 'gift',
    basePrice: 750,
    priceMultiplier: 1.15,
    baseBenefit: 45_000,
    benefitType: 'profit_per_hour',
    icon: 'SamuraiFox',
    levelRequirement: 2,
  },
  {
    id: 'gift_pharaoh_fox',
    name: 'Pharaoh Anubis Fox',
    description: 'Ancient royal golden pharaoh fox adorned with lapis lazuli and sun crown',
    category: 'gift',
    basePrice: 1_000,
    priceMultiplier: 1.15,
    baseBenefit: 98_000,
    benefitType: 'profit_per_hour',
    icon: 'PharaohFox',
    levelRequirement: 3,
  },
  {
    id: 'gift_astronaut_fox',
    name: 'Cosmic Astronaut Fox',
    description: 'Zero-gravity lunar explorer fox in a gold-plated visor spacesuit',
    category: 'gift',
    basePrice: 1_500,
    priceMultiplier: 1.15,
    baseBenefit: 210_000,
    benefitType: 'profit_per_hour',
    icon: 'AstronautFox',
    levelRequirement: 3,
  },
  {
    id: 'gift_royal_fox',
    name: 'Sovereign King Fox',
    description: 'Supreme monarch fox wearing a diamond-encrusted crown and royal mantle',
    category: 'gift',
    basePrice: 2_500,
    priceMultiplier: 1.15,
    baseBenefit: 480_000,
    benefitType: 'profit_per_hour',
    icon: 'RoyalFox',
    levelRequirement: 4,
  },
  {
    id: 'gift_diamond_fox',
    name: 'Mythic Diamond Whale Fox',
    description: 'Ultra-rare translucent blue diamond fox radiating pure blockchain luxury',
    category: 'gift',
    basePrice: 5_000,
    priceMultiplier: 1.15,
    baseBenefit: 1_250_000,
    benefitType: 'profit_per_hour',
    icon: 'DiamondFox',
    levelRequirement: 5,
  },
  {
    id: 'gift_inferno_fox',
    name: 'Volcanic Inferno Kitsune',
    description: 'Blazing magma nine-tailed spirit fox forged in volcanic fire',
    category: 'gift',
    basePrice: 7_500,
    priceMultiplier: 1.15,
    baseBenefit: 3_400_000,
    benefitType: 'profit_per_hour',
    icon: 'InfernoFox',
    levelRequirement: 6,
  },
  {
    id: 'gift_emerald_fox',
    name: 'Emerald Emperor Fox',
    description: 'Imperial jade and emerald guardian fox blessing vaults with eternal yield',
    category: 'gift',
    basePrice: 10_000,
    priceMultiplier: 1.15,
    baseBenefit: 9_500_000,
    benefitType: 'profit_per_hour',
    icon: 'EmeraldFox',
    levelRequirement: 7,
  },
  {
    id: 'gift_nebula_fox',
    name: 'Galactic Nebula Fox',
    description: 'Interdimensional cosmic fox woven from stardust and dark-matter rings',
    category: 'gift',
    basePrice: 15_000,
    priceMultiplier: 1.15,
    baseBenefit: 28_000_000,
    benefitType: 'profit_per_hour',
    icon: 'NebulaFox',
    levelRequirement: 8,
  },
  {
    id: 'gift_celestial_fox',
    name: 'Celestial Sun-God Fox',
    description: 'Supreme Level 10 radiant divine fox crowned with a golden solar halo',
    category: 'gift',
    basePrice: 25_000,
    priceMultiplier: 1.15,
    baseBenefit: 95_000_000,
    benefitType: 'profit_per_hour',
    icon: 'CelestialFox',
    levelRequirement: 10,
  },
];

export const DAILY_REWARDS: DailyRewardDay[] = [
  { day: 1, coins: 500 },
  { day: 2, coins: 1_500 },
  { day: 3, coins: 5_000 },
  { day: 4, coins: 15_000 },
  { day: 5, coins: 35_000 },
  { day: 6, coins: 100_000 },
  { day: 7, coins: 500_000, specialBadge: 'Golden Fox Trophy' },
];

export const TASKS: TaskDefinition[] = [
  // Core 4 Reference Missions (shown at top of All & respective tabs + form the 4-step Mission Chain)
  {
    id: 'tap_100',
    title: 'Warm-up Paws',
    description: 'Perform 100 taps in Fox Coin',
    category: 'daily',
    reward: 1_500,
    target: 100,
    chainOrder: 1,
  },
  {
    id: 'first_upgrade',
    title: 'Upgrade Your Business',
    description: 'Upgrade 1 business to the next level',
    category: 'daily',
    reward: 2_000,
    target: 1,
    chainOrder: 2,
  },
  {
    id: 'invite_1',
    title: 'Invite a Friend',
    description: 'Invite 1 friend to join FOXCOIN',
    category: 'social',
    reward: 3_000,
    target: 1,
    chainOrder: 3,
  },
  {
    id: 'spin_wheel_1',
    title: 'Spin the Lucky Wheel',
    description: 'Spin the wheel 1 time',
    category: 'daily',
    reward: 1_000,
    target: 1,
    chainOrder: 4,
  },

  // Additional Daily Missions (for 5-step Daily Mission Summary Track)
  {
    id: 'daily_tap_300',
    title: 'Daily Fox Hustle',
    description: 'Perform 300 taps in Fox Coin',
    category: 'daily',
    reward: 2_500,
    target: 300,
  },
  {
    id: 'daily_boost_1',
    title: 'Power Surge',
    description: 'Activate a Full Energy or Turbo booster',
    category: 'daily',
    reward: 2_000,
    target: 1,
  },

  // Progression & Milestone Chains (Completing one unlocks the next + Permanent Achievements)
  {
    id: 'tap_500',
    title: 'Speedy Claws',
    description: 'Perform 500 total taps',
    category: 'progression',
    reward: 6_000,
    target: 500,
    prerequisiteTaskId: 'tap_100',
    isAchievement: true,
  },
  {
    id: 'tap_2500',
    title: 'Relentless Paws',
    description: 'Perform 2,500 total taps',
    category: 'progression',
    reward: 18_000,
    target: 2_500,
    prerequisiteTaskId: 'tap_500',
    isAchievement: true,
  },
  {
    id: 'tap_10000',
    title: 'Apex Tap Legend',
    description: 'Perform 10,000 total taps',
    category: 'progression',
    reward: 50_000,
    target: 10_000,
    prerequisiteTaskId: 'tap_2500',
    isAchievement: true,
  },
  {
    id: 'upgrade_5',
    title: 'Empire Builder',
    description: 'Own 5 total business upgrades',
    category: 'progression',
    reward: 12_000,
    target: 5,
    prerequisiteTaskId: 'first_upgrade',
    isAchievement: true,
  },
  {
    id: 'upgrade_15',
    title: 'Royal Syndicate',
    description: 'Own 15 total business upgrades',
    category: 'progression',
    reward: 35_000,
    target: 15,
    prerequisiteTaskId: 'upgrade_5',
    isAchievement: true,
  },
  {
    id: 'reach_silver',
    title: 'Silver League',
    description: 'Reach Silver Fox rank (5,000 FOX)',
    category: 'progression',
    reward: 10_000,
    target: 2,
    isAchievement: true,
  },
  {
    id: 'reach_gold',
    title: 'Golden Standard',
    description: 'Reach Gold Fox rank (25,000 FOX)',
    category: 'progression',
    reward: 35_000,
    target: 3,
    prerequisiteTaskId: 'reach_silver',
    isAchievement: true,
  },
  {
    id: 'reach_diamond',
    title: 'Diamond Sovereign',
    description: 'Reach Diamond Fox rank (1,000,000 FOX)',
    category: 'progression',
    reward: 100_000,
    target: 5,
    prerequisiteTaskId: 'reach_gold',
    isAchievement: true,
  },
  {
    id: 'profit_1k',
    title: 'Passive Tycoon',
    description: 'Reach 1,000 FOX/hour passive income',
    category: 'progression',
    reward: 15_000,
    target: 1_000,
    isAchievement: true,
  },
  {
    id: 'profit_10k',
    title: 'Empire Magnate',
    description: 'Reach 10,000 FOX/hour passive income',
    category: 'progression',
    reward: 45_000,
    target: 10_000,
    prerequisiteTaskId: 'profit_1k',
    isAchievement: true,
  },

  // Social & Referral Milestones
  {
    id: 'invite_3',
    title: 'Fox Pack Leader',
    description: 'Invite 3 friends to join FOXCOIN',
    category: 'social',
    reward: 15_000,
    target: 3,
    prerequisiteTaskId: 'invite_1',
    isAchievement: true,
  },
  {
    id: 'invite_10',
    title: 'Fox Ambassador',
    description: 'Invite 10 friends to join FOXCOIN',
    category: 'social',
    reward: 50_000,
    target: 10,
    prerequisiteTaskId: 'invite_3',
    isAchievement: true,
  },
  {
    id: 'telegram_channel',
    title: 'Join Official Telegram',
    description: 'Subscribe to @FOX_COINEX on Telegram',
    category: 'social',
    reward: 10_000,
    target: 1,
    actionUrl: 'https://t.me/FOX_COINEX',
  },
  {
    id: 'youtube_channel',
    title: 'Subscribe on YouTube',
    description: 'Subscribe to @FOX-COINl on YouTube for official updates',
    category: 'social',
    reward: 10_000,
    target: 1,
    actionUrl: 'https://www.youtube.com/@FOX-COINl',
  },

  // Special Summary Chest & Mission Chain Chest Rewards
  {
    id: 'daily_chest_bonus',
    title: 'Daily Mission Chest',
    description: 'Complete 3 daily missions to unlock the Daily Reward Chest',
    category: 'daily',
    reward: 5_000,
    target: 3,
  },
  {
    id: 'mission_chain_bonus',
    title: 'Mission Chain Special Reward',
    description: 'Complete all 4 chain missions to unlock the special reward',
    category: 'progression',
    reward: 10_000,
    target: 4,
  },
];

export const GAME_CONSTANTS = {
  STARTING_BALANCE: 0,
  STARTING_ENERGY: 1000,
  BASE_MAX_ENERGY: 1000,
  BASE_TAP_POWER: 1,
  BASE_ENERGY_REGEN_PER_SEC: 1,
  ENERGY_COST_PER_TAP: 1,
  MAX_OFFLINE_HOURS: 3,
  MAX_TAPS_PER_SECOND: 20, // Rate limit
  REFERRAL_INVITER_BONUS: 5_000,
  REFERRAL_INVITEE_BONUS: 5_000,
  TURBO_MULTIPLIER: 3,
  TURBO_DURATION_MS: 20_000,
  MAX_DAILY_FULL_ENERGY: 6,
  WHEEL_COOLDOWN_MS: 24 * 60 * 60 * 1000, // 24 hours
};

export const LUCKY_WHEEL_PRIZES: LuckyWheelPrize[] = [
  {
    id: 'wheel_1k',
    label: '+1,000 FOX Coins',
    shortLabel: '1,000',
    persianLabel: '1,000 FOX Coins',
    type: 'coins',
    amount: 1_000,
    weight: 28,
    color: '#1E293B',
    accentColor: '#F59E0B',
    rarity: 'common',
  },
  {
    id: 'wheel_energy',
    label: 'Full Energy +1 Refill',
    shortLabel: 'ENERGY ⚡',
    persianLabel: 'Full Energy +1',
    type: 'full_energy',
    amount: 1,
    weight: 16,
    color: '#064E3B',
    accentColor: '#34D399',
    rarity: 'rare',
  },
  {
    id: 'wheel_2500',
    label: '+2,500 FOX Coins',
    shortLabel: '2,500',
    persianLabel: '2,500 FOX Coins',
    type: 'coins',
    amount: 2_500,
    weight: 20,
    color: '#31102F',
    accentColor: '#F472B6',
    rarity: 'common',
  },
  {
    id: 'wheel_turbo',
    label: '3x Turbo Frenzy (45s)',
    shortLabel: '3X TURBO 🔥',
    persianLabel: '3x Turbo (45s)',
    type: 'turbo',
    amount: 45,
    weight: 12,
    color: '#7C2D12',
    accentColor: '#FB923C',
    rarity: 'epic',
  },
  {
    id: 'wheel_5k',
    label: '+5,000 FOX Coins',
    shortLabel: '5,000',
    persianLabel: '5,000 FOX Coins',
    type: 'coins',
    amount: 5_000,
    weight: 13,
    color: '#1E1B4B',
    accentColor: '#818CF8',
    rarity: 'common',
  },
  {
    id: 'wheel_15k',
    label: '+15,000 FOX Coins',
    shortLabel: '15,000',
    persianLabel: '15,000 FOX Coins',
    type: 'coins',
    amount: 15_000,
    weight: 6,
    color: '#0F172A',
    accentColor: '#38BDF8',
    rarity: 'rare',
  },
  {
    id: 'wheel_50k',
    label: '+50,000 FOX Coins',
    shortLabel: '50K 💎',
    persianLabel: '50,000 Diamond FOX',
    type: 'coins',
    amount: 50_000,
    weight: 3.5,
    color: '#3B0764',
    accentColor: '#C084FC',
    rarity: 'epic',
  },
  {
    id: 'wheel_100k',
    label: '+100,000 FOX JACKPOT',
    shortLabel: '100K 👑',
    persianLabel: '100,000 Jackpot!',
    type: 'coins',
    amount: 100_000,
    weight: 1.5,
    color: '#78350F',
    accentColor: '#FDE047',
    rarity: 'jackpot',
  },
];

export function pickLuckyWheelPrize(
  prizes: LuckyWheelPrize[] = LUCKY_WHEEL_PRIZES
): { prize: LuckyWheelPrize; index: number } {
  const list = prizes && prizes.length > 0 ? prizes : LUCKY_WHEEL_PRIZES;
  const totalWeight = list.reduce((sum, item) => sum + Math.max(0.01, Number(item.weight) || 1), 0);
  let rand = Math.random() * totalWeight;
  for (let i = 0; i < list.length; i++) {
    rand -= Math.max(0.01, Number(list[i].weight) || 1);
    if (rand <= 0) {
      return { prize: list[i], index: i };
    }
  }
  return { prize: list[0], index: 0 };
}

export function getUpgradeXpBonus(price: number): number {
  return Math.max(1_000, Math.floor(price * 0.5));
}

export function reconcileUserLevel<
  T extends {
    balance: number;
    totalEarned: number;
    level: number;
    levelName: string;
    currentLevelMinCoins: number;
    nextLevelMinCoins: number;
    upgrades?: Record<string, number>;
  }
>(user: T, customUpgrades: UpgradeDefinition[] = UPGRADES): T {
  const catalog = customUpgrades && customUpgrades.length > 0 ? customUpgrades : UPGRADES;
  let totalUpgradeValue = 0;

  if (user.upgrades) {
    for (const [upId, lvl] of Object.entries(user.upgrades)) {
      const count = Math.max(0, Math.floor(Number(lvl) || 0));
      if (count <= 0) continue;
      const def = catalog.find((u) => u.id === upId) || UPGRADES.find((u) => u.id === upId);
      const isGift = def?.category === 'gift';
      const basePrice = def ? (isGift ? def.baseBenefit * 2 : def.basePrice) : 1_000;
      const mult = def ? Math.max(1.05, def.priceMultiplier) : 1.4;
      for (let i = 0; i < Math.min(count, 200); i++) {
        const stepPrice = Math.floor(basePrice * Math.pow(mult, i));
        totalUpgradeValue += stepPrice + getUpgradeXpBonus(stepPrice);
      }
    }
  }

  const effectiveScore = Math.max(
    Number(user.totalEarned) || 0,
    (Number(user.balance) || 0) + totalUpgradeValue
  );
  user.totalEarned = effectiveScore;

  let current = PLAYER_LEVELS[0];
  let next = PLAYER_LEVELS[1] || PLAYER_LEVELS[0];

  for (let i = 0; i < PLAYER_LEVELS.length; i++) {
    if (effectiveScore >= PLAYER_LEVELS[i].minCoins) {
      current = PLAYER_LEVELS[i];
      next = PLAYER_LEVELS[i + 1] || PLAYER_LEVELS[i];
    } else {
      break;
    }
  }

  user.level = current.level;
  user.levelName = current.name;
  user.currentLevelMinCoins = current.minCoins;
  user.nextLevelMinCoins = next.minCoins;

  return user;
}

const PERSIAN_ARABIC_DIGIT_RE = /[۰-۹٠-٩]/g;
const NON_LATIN_SCRIPT_RE = /[\u0600-\u06FF]/;

export function toEnglishDigits(input: string | number | undefined | null): string {
  if (input === undefined || input === null) return '';
  return String(input)
    .replace(PERSIAN_ARABIC_DIGIT_RE, (ch) => {
      const code = ch.charCodeAt(0);
      if (code >= 0x06f0 && code <= 0x06f9) return String(code - 0x06f0);
      if (code >= 0x0660 && code <= 0x0669) return String(code - 0x0660);
      return ch;
    })
    .replace(/٬/g, ',');
}

export function sanitizeWheelPrize(prize: LuckyWheelPrize): LuckyWheelPrize {
  const defaultMatch = LUCKY_WHEEL_PRIZES.find((d) => d.id === prize.id);
  const amt = Number(prize.amount) || defaultMatch?.amount || 1000;

  let shortLabel = toEnglishDigits(prize.shortLabel);
  let label = toEnglishDigits(prize.label);
  let persianLabel = toEnglishDigits(prize.persianLabel);

  if (NON_LATIN_SCRIPT_RE.test(shortLabel)) {
    if (defaultMatch && defaultMatch.amount === amt) {
      shortLabel = defaultMatch.shortLabel;
    } else if (prize.type === 'coins') {
      shortLabel = amt >= 50000 ? `${Math.round(amt / 1000)}K` : amt.toLocaleString('en-US');
    } else if (prize.type === 'full_energy') {
      shortLabel = 'ENERGY ⚡';
    } else {
      shortLabel = '3X TURBO 🔥';
    }
  }

  if (NON_LATIN_SCRIPT_RE.test(label)) {
    if (defaultMatch && defaultMatch.amount === amt) {
      label = defaultMatch.label;
    } else if (prize.type === 'coins') {
      label = `+${amt.toLocaleString('en-US')} FOX Coins`;
    } else if (prize.type === 'full_energy') {
      label = `Full Energy +${amt} Refill`;
    } else {
      label = `3x Turbo Frenzy (${amt}s)`;
    }
  }

  if (NON_LATIN_SCRIPT_RE.test(persianLabel)) {
    persianLabel = defaultMatch ? defaultMatch.persianLabel : label;
  }

  return {
    ...prize,
    shortLabel,
    label,
    persianLabel,
  };
}

export function sanitizeUpgrade(upg: UpgradeDefinition): UpgradeDefinition {
  const defaultMatch = UPGRADES.find((d) => d.id === upg.id);
  let name = toEnglishDigits(upg.name);
  let description = toEnglishDigits(upg.description);

  if (defaultMatch) {
    if (NON_LATIN_SCRIPT_RE.test(name)) name = defaultMatch.name;
    if (NON_LATIN_SCRIPT_RE.test(description)) description = defaultMatch.description;
  }

  return {
    ...upg,
    name,
    description,
  };
}



