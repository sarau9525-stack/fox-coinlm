import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  Crown,
  Pickaxe,
  Factory,
  FlaskConical,
  Store,
  Home,
  Zap,
  Plane,
  X,
  TrendingUp,
  Layers,
  Lock,
  CheckCircle2,
  ArrowUpRight,
} from 'lucide-react';
import { UpgradeDefinition, UserGameState } from '../../types/game.js';
import { sound } from '../../utils/audio.js';
import { TelegramService } from '../../utils/telegram.js';
import { foxGoldCoinImg } from '../../assets/assets.js';
import {
  BuildingResolvedState,
  CityCameraPreset,
  CityQualityTier,
  CityTimeMode,
  FOX_CITY_BUILDINGS,
  FoxCityBuildingConfig,
  FoxCityBuildingId,
  FoxMascotAnimMode,
  calculateUpgradeCost,
  resolveBuildingState,
} from './foxCityTypes.js';
import { FoxCityCanvas } from './FoxCityCanvas.js';
import { FoxBuildingIllustration } from './FoxBuildingIllustration.js';

export interface FoxCityViewProps {
  user: UserGameState;
  upgrades: UpgradeDefinition[];
  onPurchase: (upgradeId: string) => Promise<void>;
  selectedBuildingId?: FoxCityBuildingId | null;
  onSelectBuildingChange?: (
    buildingId: FoxCityBuildingId | null,
    resolvedState?: BuildingResolvedState
  ) => void;
  onInspectUpgradeCard?: (upgradeId: string) => void;
  timeMode?: CityTimeMode;
  autoCycleTime?: boolean;
  cameraPreset?: CityCameraPreset;
  resetSignal?: number;
  qualityTier?: CityQualityTier;
  mascotMode?: FoxMascotAnimMode;
  isFullScreen?: boolean;
}

const MAIN_SIX_BUILDING_IDS: FoxCityBuildingId[] = [
  'headquarters',
  'mine',
  'factory',
  'research',
  'marketplace',
  'residential',
];

export const FoxCityView: React.FC<FoxCityViewProps> = ({
  user,
  upgrades,
  onPurchase,
  selectedBuildingId: controlledBuildingId,
  onSelectBuildingChange,
  onInspectUpgradeCard,
  timeMode = 'night',
  autoCycleTime = false,
  cameraPreset = 'angle',
  resetSignal = 0,
  qualityTier = 'high',
  mascotMode = 'auto',
  isFullScreen = false,
}) => {
  const [internalBuildingId, setInternalBuildingId] = useState<FoxCityBuildingId | null>(null);
  const [selectedUpgradeId, setSelectedUpgradeId] = useState<string | null>(null);
  const [purchasingUpgradeId, setPurchasingUpgradeId] = useState<string | null>(null);
  const [upgradeSuccessBanner, setUpgradeSuccessBanner] = useState<string | null>(null);

  const activeBuildingId =
    controlledBuildingId !== undefined ? controlledBuildingId : internalBuildingId;

  // Compute real game state for every building from the user's current mining upgrades
  const buildingStates = useMemo(() => {
    const map: Record<FoxCityBuildingId, BuildingResolvedState> = {} as any;
    for (const b of FOX_CITY_BUILDINGS) {
      map[b.id] = resolveBuildingState(b, user, upgrades);
    }
    return map;
  }, [user, upgrades]);

  const activeBuildingState = activeBuildingId ? buildingStates[activeBuildingId] : null;

  // Keep selectedUpgradeId synced with the clicked building's real upgrades
  useEffect(() => {
    if (!activeBuildingState) {
      setSelectedUpgradeId(null);
      return;
    }
    const stillInBuilding = activeBuildingState.upgrades.some(
      (u) => u.id === selectedUpgradeId
    );
    if (!stillInBuilding) {
      setSelectedUpgradeId(activeBuildingState.primaryUpgrade?.id || null);
    }
  }, [activeBuildingState, selectedUpgradeId]);

  const inspectedUpgrade = useMemo(() => {
    if (!activeBuildingState) return null;
    return (
      activeBuildingState.upgrades.find((u) => u.id === selectedUpgradeId) ||
      activeBuildingState.primaryUpgrade
    );
  }, [activeBuildingState, selectedUpgradeId]);

  // Raycast click callback invoked when a distinct 3D building mesh is clicked
  const handleSelectBuildingFromRaycast = useCallback(
    (buildingId: FoxCityBuildingId | null, resolved?: BuildingResolvedState) => {
      sound.playTap();
      TelegramService.triggerHaptic('light');
      if (controlledBuildingId === undefined) {
        setInternalBuildingId(buildingId);
      }
      const stateForBuilding =
        resolved || (buildingId ? buildingStates[buildingId] : undefined);
      if (stateForBuilding?.primaryUpgrade) {
        setSelectedUpgradeId(stateForBuilding.primaryUpgrade.id);
      }
      if (onSelectBuildingChange) {
        onSelectBuildingChange(buildingId, stateForBuilding);
      }
    },
    [controlledBuildingId, buildingStates, onSelectBuildingChange]
  );

  const handleUpgradePurchase = async (upgrade: UpgradeDefinition) => {
    if (purchasingUpgradeId) return;
    const currentLv = user.upgrades[upgrade.id] || 0;
    const cost = calculateUpgradeCost(upgrade, currentLv);

    if (user.level < upgrade.levelRequirement || user.balance < cost) {
      TelegramService.triggerNotificationHaptic('warning');
      return;
    }

    setPurchasingUpgradeId(upgrade.id);
    try {
      sound.playUpgrade();
      TelegramService.triggerHaptic('medium');
      await onPurchase(upgrade.id);
      setUpgradeSuccessBanner(`${upgrade.name} upgraded to Lv. ${currentLv + 1}!`);
      setTimeout(() => {
        setUpgradeSuccessBanner(null);
      }, 2200);
    } finally {
      setPurchasingUpgradeId(null);
    }
  };

  const renderDistrictIcon = (
    type: FoxCityBuildingConfig['iconType'],
    className = 'w-4 h-4'
  ) => {
    switch (type) {
      case 'crown':
        return <Crown className={className} />;
      case 'pickaxe':
        return <Pickaxe className={className} />;
      case 'factory':
        return <Factory className={className} />;
      case 'flask':
        return <FlaskConical className={className} />;
      case 'store':
        return <Store className={className} />;
      case 'home':
        return <Home className={className} />;
      case 'zap':
        return <Zap className={className} />;
      case 'helicopter':
        return <Plane className={className} />;
    }
  };

  return (
    <div className="relative w-full">
      {/* 1. 100% Real-Time 3D WebGL Animated FOX CITY Canvas */}
      <FoxCityCanvas
        buildingStates={buildingStates}
        selectedBuildingId={activeBuildingId}
        onSelectBuilding={handleSelectBuildingFromRaycast}
        timeMode={timeMode}
        autoCycleTime={autoCycleTime}
        cameraPreset={cameraPreset}
        resetSignal={resetSignal}
        qualityTier={qualityTier}
        mascotMode={mascotMode}
        isFullScreen={isFullScreen}
      />

      {/* 2. Contextual "UI Panel (Building Info)" triggered by 3D Raycast Selection */}
      {activeBuildingState && inspectedUpgrade && (
        <div
          className="mt-2.5 w-full rounded-2xl p-3 bg-gradient-to-b from-[#161A28]/98 via-[#0E121D]/98 to-[#080A11]/98 border-2 border-amber-400/85 shadow-[0_16px_40px_rgba(0,0,0,0.95),0_0_28px_rgba(245,158,11,0.32)] relative overflow-hidden transition-all duration-200"
          role="dialog"
          aria-label={`${activeBuildingState.building.name} Building Info Panel`}
        >
          <div className="flex items-center justify-between border-b border-amber-500/25 pb-1.5 mb-2.5">
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-black text-white tracking-tight">
                Building Info
              </span>
              <span className="text-[10px] font-semibold text-slate-400">
                ({activeBuildingState.building.districtName})
              </span>
            </div>
            <span className="text-[10px] font-black text-amber-300 tabular-nums">
              Balance: {Math.floor(user.balance).toLocaleString('en-US')} FOX
            </span>
          </div>

          {upgradeSuccessBanner && (
            <div className="mb-2.5 px-3 py-1.5 rounded-xl bg-emerald-500/20 border border-emerald-400/60 text-emerald-300 text-xs font-black flex items-center justify-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
              <span>{upgradeSuccessBanner}</span>
            </div>
          )}

          {(() => {
            const rawLv = user.upgrades[inspectedUpgrade.id] || 0;
            const nextCost = calculateUpgradeCost(inspectedUpgrade, rawLv);
            const canAfford = user.balance >= nextCost;
            const isLocked = user.level < inspectedUpgrade.levelRequirement;
            const isBuying = purchasingUpgradeId === inspectedUpgrade.id;

            const currentOutput = rawLv * inspectedUpgrade.baseBenefit;
            const nextOutput = (rawLv + 1) * inspectedUpgrade.baseBenefit;
            const unitLabel =
              inspectedUpgrade.benefitType === 'profit_per_hour'
                ? 'FOX/hr'
                : inspectedUpgrade.benefitType === 'tap_power'
                ? 'FOX/tap'
                : inspectedUpgrade.benefitType === 'max_energy'
                ? 'Max Energy'
                : 'Energy/s';

            const productionPct = Math.max(
              20,
              activeBuildingState.displayLevel * 10
            );
            const capacityPct = Math.max(
              10,
              activeBuildingState.displayLevel * 5
            );
            const progressPct = Math.min(
              100,
              Math.max(25, ((rawLv % 10) || 6.5) * 10)
            );

            return (
              <>
                <div className="flex items-stretch gap-3 mb-2.5">
                  {/* Left: Animated Isometric Building Illustration */}
                  <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-2xl overflow-hidden border-2 border-amber-400/75 bg-[#070910] shrink-0 shadow-[0_6px_18px_rgba(0,0,0,0.85)]">
                    <FoxBuildingIllustration buildingId={activeBuildingState.building.id} />
                  </div>

                  {/* Right: Header + Production/Capacity + Golden Progress Bar */}
                  <div className="flex-1 min-w-0 flex flex-col justify-between">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-7 h-7 rounded-lg bg-gradient-to-b from-[#33220B] to-[#171005] border border-amber-400/80 flex items-center justify-center text-amber-400 shrink-0 shadow-[0_0_10px_rgba(245,158,11,0.3)]">
                          {renderDistrictIcon(
                            activeBuildingState.building.iconType,
                            'w-4 h-4'
                          )}
                        </div>
                        <div className="min-w-0">
                          <h3 className="text-sm sm:text-base font-black text-white leading-tight truncate">
                            {activeBuildingState.building.name}
                          </h3>
                          <span className="text-[11px] font-bold text-slate-300 block leading-tight">
                            Lv. {activeBuildingState.displayLevel}
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleSelectBuildingFromRaycast(null)}
                        className="w-6 h-6 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 flex items-center justify-center text-slate-200 hover:text-white cursor-pointer shrink-0"
                        title="Close Building Info"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="space-y-1 my-1.5">
                      <div className="flex items-center justify-between text-xs border-b border-white/5 pb-1">
                        <span className="text-slate-300 font-semibold flex items-center gap-1.5">
                          <TrendingUp className="w-3.5 h-3.5 text-amber-400" />
                          <span>Production</span>
                        </span>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-bold text-amber-300 tabular-nums">
                            (+{currentOutput.toLocaleString()} → +{nextOutput.toLocaleString()}{' '}
                            {unitLabel})
                          </span>
                          <span className="font-black text-emerald-400 tabular-nums">
                            +{productionPct}%
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-300 font-semibold flex items-center gap-1.5">
                          <Layers className="w-3.5 h-3.5 text-amber-400" />
                          <span>Capacity</span>
                        </span>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-bold text-slate-400 truncate max-w-[120px]">
                            {inspectedUpgrade.name} (Lv.{rawLv})
                          </span>
                          <span className="font-black text-emerald-400 tabular-nums">
                            +{capacityPct}%
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="w-full h-3.5 bg-[#1B1710] rounded-full border border-amber-400/60 p-[2px] relative overflow-hidden flex items-center">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-300 shadow-[0_0_10px_rgba(245,158,11,0.7)] transition-all duration-300"
                        style={{ width: `${progressPct}%` }}
                      />
                      <span className="absolute right-2 text-[9px] font-black text-amber-200 drop-shadow">
                        {Math.round(progressPct)}%
                      </span>
                    </div>
                  </div>
                </div>

                {/* Linked Real Mining Upgrades Selector Pills */}
                <div className="flex items-center justify-between gap-1.5 mb-2.5 overflow-x-auto pb-0.5 no-scrollbar">
                  <div className="flex items-center gap-1.5">
                    {activeBuildingState.upgrades.map((u) => {
                      const uLv = user.upgrades[u.id] || 0;
                      const isSelectedTab = inspectedUpgrade.id === u.id;
                      const isLockedTab = user.level < u.levelRequirement;
                      return (
                        <button
                          key={u.id}
                          type="button"
                          onClick={() => {
                            sound.playTap();
                            setSelectedUpgradeId(u.id);
                          }}
                          className={`px-2.5 py-1 rounded-xl text-[10px] font-extrabold whitespace-nowrap transition cursor-pointer border flex items-center gap-1 ${
                            isSelectedTab
                              ? 'bg-gradient-to-r from-amber-500/30 to-orange-500/20 border-amber-300 text-white shadow-[0_0_10px_rgba(245,158,11,0.25)]'
                              : 'bg-[#0B0E17]/90 border-white/10 text-slate-300 hover:border-amber-400/40 hover:text-white'
                          }`}
                        >
                          {isLockedTab && <Lock className="w-2.5 h-2.5 text-rose-400" />}
                          <span>{u.name}</span>
                          <span className="px-1 py-0.2 rounded bg-amber-400/20 text-amber-300 text-[9px] font-black">
                            Lv.{uLv}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {onInspectUpgradeCard && (
                    <button
                      type="button"
                      onClick={() => onInspectUpgradeCard(inspectedUpgrade.id)}
                      className="px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-[9px] font-bold text-amber-300 flex items-center gap-0.5 shrink-0 cursor-pointer"
                    >
                      <span>Card</span>
                      <ArrowUpRight className="w-3 h-3" />
                    </button>
                  )}
                </div>

                {isLocked ? (
                  <div className="w-full py-2.5 rounded-full bg-rose-950/60 border border-rose-500/40 text-rose-300 font-black text-xs flex items-center justify-center gap-1.5">
                    <Lock className="w-3.5 h-3.5" />
                    <span>
                      Requires Player Level {inspectedUpgrade.levelRequirement} (Your Level:{' '}
                      {user.level})
                    </span>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleUpgradePurchase(inspectedUpgrade)}
                    disabled={isBuying}
                    className={`w-full py-2.5 rounded-full font-black text-xs sm:text-sm tracking-tight transition active:scale-98 cursor-pointer border-2 flex items-center justify-center gap-2.5 ${
                      canAfford
                        ? 'bg-gradient-to-b from-amber-300 via-amber-500 to-orange-600 hover:brightness-110 text-slate-950 border-amber-200 shadow-[0_4px_20px_rgba(245,158,11,0.5)]'
                        : 'bg-gradient-to-b from-[#2A2113] to-[#17120A] text-amber-200/75 border-amber-500/35'
                    }`}
                  >
                    <span>
                      {isBuying ? 'Upgrading...' : `Upgrade (${inspectedUpgrade.name})`}
                    </span>
                    <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-black/25 text-white text-xs font-black tabular-nums">
                      <img
                        src={foxGoldCoinImg}
                        alt="FOX"
                        className="w-3.5 h-3.5 rounded-full object-cover"
                      />
                      {nextCost.toLocaleString('en-US')} FOX
                    </span>
                  </button>
                )}
              </>
            );
          })()}
        </div>
      )}

      {/* 3. Interactive "Buildings (Details & Upgrade Levels)" 6-Card Grid with Animated Vector Art */}
      <div className="mt-2.5 w-full rounded-2xl p-2.5 bg-gradient-to-b from-[#131724]/95 to-[#0A0C14]/95 border border-amber-500/40 shadow-[0_10px_28px_rgba(0,0,0,0.75)]">
        <div className="flex items-center justify-between mb-2 px-0.5">
          <div className="flex items-center gap-1.5">
            <h3 className="text-xs sm:text-sm font-black text-white tracking-tight">
              Buildings
            </h3>
            <span className="text-[10px] sm:text-xs font-semibold text-slate-300">
              (Details &amp; Upgrade Levels)
            </span>
          </div>
          <span className="text-[9px] font-bold text-amber-300">
            Tap any building to focus &amp; upgrade
          </span>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {MAIN_SIX_BUILDING_IDS.map((bId) => {
            const st = buildingStates[bId];
            if (!st) return null;
            const { building, displayLevel } = st;
            const isSelected = activeBuildingId === bId;
            const targetLv = Math.max(5, displayLevel + 3);

            return (
              <button
                key={bId}
                type="button"
                onClick={() =>
                  handleSelectBuildingFromRaycast(isSelected ? null : bId, st)
                }
                className={`group rounded-xl p-1.5 bg-gradient-to-b from-[#161926] to-[#0B0D15] border text-left transition-all cursor-pointer active:scale-97 overflow-hidden ${
                  isSelected
                    ? 'border-amber-300 ring-2 ring-amber-400/40 shadow-[0_0_18px_rgba(245,158,11,0.35)]'
                    : 'border-amber-500/35 hover:border-amber-400/75'
                }`}
              >
                <div className="relative w-full h-16 sm:h-20 rounded-lg overflow-hidden bg-[#07090F] border border-amber-500/25 mb-1.5">
                  <FoxBuildingIllustration buildingId={bId} />
                </div>

                <div className="flex items-start gap-1.5 min-w-0">
                  <div className="w-6 h-6 rounded-full bg-gradient-to-b from-[#33220B] to-[#160F05] border border-amber-400/80 flex items-center justify-center text-amber-400 shrink-0 mt-0.5 shadow-[0_0_8px_rgba(245,158,11,0.25)]">
                    {renderDistrictIcon(building.iconType, 'w-3 h-3')}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[10px] sm:text-[11px] font-black text-white truncate leading-tight">
                      {building.name}
                    </div>
                    <div className="text-[9px] sm:text-[10px] font-extrabold text-slate-200 flex items-center gap-0.5 leading-tight mt-0.5">
                      <span>Lv. {displayLevel}</span>
                      <span className="text-emerald-400 font-black">→</span>
                      <span className="text-amber-300 font-black">{targetLv}</span>
                    </div>
                    <div className="text-[8px] sm:text-[9px] font-semibold text-slate-300 truncate leading-tight mt-0.5">
                      {building.bonusLabel}
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
