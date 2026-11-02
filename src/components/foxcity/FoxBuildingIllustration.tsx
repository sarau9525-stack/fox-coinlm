import React from 'react';
import { FoxCityBuildingId } from './foxCityTypes.js';

interface FoxBuildingIllustrationProps {
  buildingId: FoxCityBuildingId;
  className?: string;
}

export const FoxBuildingIllustration: React.FC<FoxBuildingIllustrationProps> = ({
  buildingId,
  className = 'w-full h-full',
}) => {
  return (
    <div
      className={`relative overflow-hidden bg-gradient-to-b from-[#1A132B] via-[#0F1422] to-[#080B12] flex items-center justify-center select-none ${className}`}
    >
      {/* Ambient Golden Sunset Glow */}
      <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-20 h-20 rounded-full bg-amber-500/25 blur-xl pointer-events-none animate-pulse" />

      {buildingId === 'headquarters' && (
        <svg viewBox="0 0 120 120" className="w-full h-full p-1">
          <defs>
            <linearGradient id="hqGold" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#fde047" />
              <stop offset="50%" stopColor="#f59e0b" />
              <stop offset="100%" stopColor="#b45309" />
            </linearGradient>
            <linearGradient id="hqBody" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#1e293b" />
              <stop offset="100%" stopColor="#090d16" />
            </linearGradient>
          </defs>
          {/* Isometric Island Base */}
          <polygon points="60,108 16,88 60,70 104,88" fill="#2d5a34" stroke="#fbbf24" strokeWidth="1.5" />
          {/* Octagonal Podium */}
          <polygon points="60,98 26,82 26,64 60,78 94,64 94,82" fill="url(#hqBody)" stroke="url(#hqGold)" strokeWidth="1.5" />
          {/* Main Citadel Tower */}
          <rect x="36" y="36" width="48" height="46" rx="3" fill="url(#hqBody)" stroke="url(#hqGold)" strokeWidth="2" />
          {/* Illuminated Windows */}
          <g fill="#fef08a">
            <rect x="41" y="42" width="5" height="7" rx="1" />
            <rect x="74" y="42" width="5" height="7" rx="1" />
            <rect x="41" y="54" width="5" height="7" rx="1" />
            <rect x="74" y="54" width="5" height="7" rx="1" />
            <rect x="41" y="66" width="5" height="7" rx="1" />
            <rect x="74" y="66" width="5" height="7" rx="1" />
          </g>
          {/* Neon FOX Emblem */}
          <rect x="49" y="43" width="22" height="24" rx="2" fill="#090d16" stroke="#fbbf24" strokeWidth="1.5" />
          <polygon points="53,53 52,46 57,50 63,50 68,46 67,53 60,58" fill="#f97316" stroke="#fde047" strokeWidth="1" />
          <text x="60" y="64" textAnchor="middle" fill="#fef08a" fontSize="6.5" fontWeight="900">FOX</text>
          {/* Animated Floating Roof Crystal */}
          <g className=" origin-center animate-pulse">
            <polygon points="60,6 49,22 60,34 71,22" fill="url(#hqGold)" stroke="#fef9c3" strokeWidth="1.5" />
            <ellipse cx="60" cy="26" rx="18" ry="5" fill="none" stroke="#fde047" strokeWidth="1.5" strokeDasharray="4 2" />
          </g>
        </svg>
      )}

      {buildingId === 'mine' && (
        <svg viewBox="0 0 120 120" className="w-full h-full p-1">
          {/* Rocky Mountain Cliff */}
          <polygon points="14,94 34,24 64,40 88,18 108,94" fill="#333a48" stroke="#475569" strokeWidth="1.5" />
          {/* Glowing Amber Crystal Veins */}
          <polygon points="28,56 22,40 34,46" fill="#f97316" stroke="#fde047" strokeWidth="1" className="animate-pulse" />
          <polygon points="84,48 92,34 96,50" fill="#f97316" stroke="#fde047" strokeWidth="1" className="animate-pulse" />
          {/* Timber & Gold Mine Portal Arch */}
          <rect x="34" y="48" width="52" height="44" rx="4" fill="#171b26" stroke="#fbbf24" strokeWidth="2.2" />
          {/* Molten Orange Cavern Glow */}
          <rect x="42" y="56" width="36" height="36" rx="3" fill="#ea580c" />
          <rect x="47" y="62" width="26" height="30" rx="2" fill="#fde047" className="animate-pulse" />
          {/* Conveyor Track & Ore Cart */}
          <polygon points="46,92 74,92 86,112 34,112" fill="#1e293b" stroke="#fbbf24" strokeWidth="1.5" />
          <g className="animate-bounce">
            <rect x="49" y="84" width="22" height="14" rx="2" fill="#b45309" stroke="#fde047" strokeWidth="1.5" />
            <polygon points="53,84 60,74 67,84" fill="#fef08a" />
          </g>
        </svg>
      )}

      {buildingId === 'factory' && (
        <svg viewBox="0 0 120 120" className="w-full h-full p-1">
          {/* Rising Smoke Puffs */}
          <circle cx="42" cy="18" r="6" fill="#cbd5e1" opacity="0.55" className="animate-ping" />
          <circle cx="64" cy="14" r="7" fill="#cbd5e1" opacity="0.45" className="animate-pulse" />
          {/* Twin Chimneys */}
          <rect x="36" y="24" width="12" height="32" fill="#111520" stroke="#fbbf24" strokeWidth="1.5" />
          <rect x="58" y="20" width="12" height="36" fill="#111520" stroke="#fbbf24" strokeWidth="1.5" />
          {/* Main Factory Hall */}
          <polygon points="18,92 18,52 60,42 102,52 102,92 60,104" fill="#1e2433" stroke="#fbbf24" strokeWidth="2" />
          {/* Glowing Furnace Windows */}
          <rect x="28" y="62" width="10" height="14" rx="1.5" fill="#fde047" />
          <rect x="44" y="62" width="10" height="14" rx="1.5" fill="#fde047" />
          {/* Red & White Striped Awning Annex */}
          <polygon points="64,66 96,60 100,72 68,78" fill="#dc2626" stroke="#fef08a" strokeWidth="1.5" />
          {/* Spinning Golden Gear */}
          <circle cx="80" cy="44" r="11" fill="#b45309" stroke="#fde047" strokeWidth="2.5" strokeDasharray="5 3" className="origin-center animate-spin" />
        </svg>
      )}

      {buildingId === 'research' && (
        <svg viewBox="0 0 120 120" className="w-full h-full p-1">
          {/* Octagonal Tech Pedestal */}
          <polygon points="60,104 22,88 22,62 60,48 98,62 98,88" fill="#171b26" stroke="#fbbf24" strokeWidth="2" />
          <rect x="34" y="70" width="12" height="10" rx="1.5" fill="#38bdf8" />
          <rect x="74" y="70" width="12" height="10" rx="1.5" fill="#38bdf8" />
          <rect x="54" y="72" width="12" height="14" rx="1.5" fill="#fde047" />
          {/* Pulsing Blue Energy Reactor Sphere & Gyro Rings */}
          <circle cx="60" cy="40" r="18" fill="#0284c7" className="animate-pulse" />
          <circle cx="60" cy="40" r="12" fill="#bae6fd" />
          <ellipse cx="60" cy="40" rx="28" ry="9" fill="none" stroke="#fde047" strokeWidth="2" />
          <ellipse cx="60" cy="40" rx="9" ry="26" fill="none" stroke="#38bdf8" strokeWidth="1.8" strokeDasharray="5 3" />
        </svg>
      )}

      {buildingId === 'marketplace' && (
        <svg viewBox="0 0 120 120" className="w-full h-full p-1">
          {/* Harbor Water & Wooden Dock */}
          <polygon points="10,108 110,108 110,90 10,90" fill="#0284c7" opacity="0.5" />
          <rect x="20" y="90" width="80" height="8" fill="#854d27" stroke="#fbbf24" strokeWidth="1" />
          {/* Market Hall */}
          <rect x="24" y="42" width="72" height="46" rx="3" fill="#1e2433" stroke="#fbbf24" strokeWidth="2" />
          {/* Glowing MARKET Roof Sign */}
          <rect x="34" y="24" width="52" height="15" rx="2" fill="#090d16" stroke="#fde047" strokeWidth="1.8" />
          <text x="60" y="34" textAnchor="middle" fill="#fef08a" fontSize="8.5" fontWeight="900">MARKET</text>
          {/* Red & White Striped Awning */}
          <polygon points="20,62 100,62 104,74 16,74" fill="#dc2626" stroke="#fde047" strokeWidth="1.5" />
          <g fill="#fffbeb">
            <rect x="28" y="63" width="8" height="10" />
            <rect x="44" y="63" width="8" height="10" />
            <rect x="60" y="63" width="8" height="10" />
            <rect x="76" y="63" width="8" height="10" />
          </g>
        </svg>
      )}

      {buildingId === 'residential' && (
        <svg viewBox="0 0 120 120" className="w-full h-full p-1">
          {/* Lush Green Lawn */}
          <polygon points="60,106 14,86 60,66 106,86" fill="#2d5a34" stroke="#fbbf24" strokeWidth="1.5" />
          {/* Left House */}
          <rect x="24" y="54" width="28" height="28" fill="#1e2433" stroke="#fbbf24" strokeWidth="1.5" />
          <polygon points="20,54 38,34 56,54" fill="#b45309" stroke="#fde047" strokeWidth="1.5" />
          <rect x="33" y="62" width="10" height="10" rx="1" fill="#fde047" className="animate-pulse" />
          {/* Right House */}
          <rect x="54" y="46" width="38" height="36" fill="#171b26" stroke="#fbbf24" strokeWidth="1.8" />
          <polygon points="50,46 73,24 96,46" fill="#d97706" stroke="#fde047" strokeWidth="1.8" />
          <rect x="62" y="56" width="9" height="11" rx="1" fill="#fde047" />
          <rect x="76" y="56" width="9" height="11" rx="1" fill="#fde047" />
        </svg>
      )}

      {(buildingId === 'power' || buildingId === 'helipad') && (
        <svg viewBox="0 0 120 120" className="w-full h-full p-1">
          <ellipse cx="60" cy="84" rx="38" ry="16" fill="#171b26" stroke="#fde047" strokeWidth="2" />
          <circle cx="60" cy="50" r="18" fill="#0ea5e9" opacity="0.35" className="animate-ping" />
          <polygon points="60,24 44,58 76,58" fill="#fbbf24" stroke="#fef08a" strokeWidth="1.5" />
        </svg>
      )}
    </div>
  );
};
