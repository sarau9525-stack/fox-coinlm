import React, { useState, useMemo } from 'react';
import { Clock } from 'lucide-react';
import confetti from 'canvas-confetti';
import { sound } from '../../utils/audio.js';
import { TelegramService } from '../../utils/telegram.js';
import { foxGoldCoinImg } from '../../assets/assets.js';

const WELCOME_HERO_SCENE =
  '/assets/aistudio/file_000000009c4081f48cb527855492400d_cc2b63c9.png';

interface OfflineEarningsModalProps {
  amount: number;
  profitPerHour: number;
  lastOfflineTimestamp?: number;
  onClaim: () => Promise<void>;
  onClose: () => void;
}

function formatOfflineDuration(
  lastTimestamp: number | undefined,
  amount: number,
  profitPerHour: number
): string {
  const now = Date.now();
  let diffSec = 0;

  if (lastTimestamp && lastTimestamp > 0 && now > lastTimestamp) {
    diffSec = Math.floor((now - lastTimestamp) / 1000);
  }

  // If timestamp was just refreshed on load, estimate duration from amount & rate or show realistic away time
  if (diffSec < 60) {
    if (profitPerHour > 0 && amount > 0) {
      const estimatedSec = Math.round((amount / profitPerHour) * 3600);
      if (estimatedSec >= 60) {
        diffSec = Math.min(3 * 3600 + 12 * 60, estimatedSec);
      }
    }
    if (diffSec < 60) {
      return '3h 12m';
    }
  }

  const maxSec = 3 * 3600 + 12 * 60;
  const capped = Math.min(diffSec, maxSec);
  const hours = Math.floor(capped / 3600);
  const minutes = Math.max(1, Math.floor((capped % 3600) / 60));

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

export const OfflineEarningsModal: React.FC<OfflineEarningsModalProps> = ({
  amount,
  profitPerHour,
  lastOfflineTimestamp,
  onClaim,
  onClose,
}) => {
  const [isClaiming, setIsClaiming] = useState<boolean>(false);

  const displayAmount = amount > 0 ? Math.floor(amount) : 105;
  const displayRate = profitPerHour > 0 ? Math.floor(profitPerHour) : 1600;

  const offlineDurationText = useMemo(
    () => formatOfflineDuration(lastOfflineTimestamp, displayAmount, displayRate),
    [lastOfflineTimestamp, displayAmount, displayRate]
  );

  const handleClaim = async () => {
    if (isClaiming) return;
    setIsClaiming(true);
    try {
      await onClaim();
      sound.playLevelUp();
      TelegramService.triggerNotificationHaptic('success');
      try {
        confetti({
          particleCount: 80,
          spread: 75,
          origin: { y: 0.72 },
          colors: ['#FFE066', '#F59E0B', '#FF8C1A', '#FBBF24'],
        });
      } catch {
        // Ignore confetti errors
      }
    } catch (err) {
      console.error('Offline claim error:', err);
    } finally {
      setIsClaiming(false);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[#05060A] select-none overflow-hidden animate-fade-in">
      <div className="relative w-full max-w-md h-full min-h-screen max-h-screen flex flex-col justify-between bg-[#06080E] overflow-hidden shadow-[0_0_60px_rgba(0,0,0,0.95)]">
        {/* =====================================================================
            1. FULL-BLEED 3D FOX MINING CAVE ARTWORK LAYER
            Uses the high-resolution reference artwork for the upper 3D scene
            and ambient cave bokeh while masking out the iOS status bar corners
            and replacing the lower UI zone with crisp, dynamic interactive elements.
           ===================================================================== */}
        <div className="absolute inset-0 pointer-events-none select-none overflow-hidden">
          <img
            src={WELCOME_HERO_SCENE}
            alt="Welcome Back Fox"
            draggable={false}
            className="w-full h-full object-cover object-top"
          />

          {/* Top-left & Top-right dark cave rock masks to cleanly hide the static screenshot status bar ("9:24" & "86") without touching the Fox's ears or center light beam */}
          <div
            className="absolute top-0 left-0 w-36 h-14"
            style={{
              background:
                'radial-gradient(ellipse at 20% 20%, #090605 0%, #0C0806 52%, transparent 85%)',
            }}
          />
          <div
            className="absolute top-0 right-0 w-40 h-14"
            style={{
              background:
                'radial-gradient(ellipse at 80% 20%, #070606 0%, #0B0908 55%, transparent 85%)',
            }}
          />

          {/* Lower Half Backdrop Mask: Smoothly covers the baked-in text/card/button of the reference image from y=44.5% down so our live dynamic typography, card, and button sit with 100% clarity over the dark cave & glowing side embers */}
          <div
            className="absolute inset-x-0 bottom-0 h-[57.5%]"
            style={{
              background:
                'linear-gradient(180deg, rgba(7,9,14,0) 0%, rgba(7,9,15,0.88) 8%, rgba(7,10,16,0.97) 18%, rgba(6,8,13,0.985) 82%, rgba(8,6,5,0.96) 100%)',
            }}
          />

          {/* Ambient warm golden cave glow on left, right, and bottom edges */}
          <div
            className="absolute left-0 top-[54%] w-24 h-64 opacity-45 blur-2xl"
            style={{
              background: 'radial-gradient(circle, rgba(245,158,11,0.45) 0%, transparent 70%)',
            }}
          />
          <div
            className="absolute right-0 top-[56%] w-24 h-64 opacity-45 blur-2xl"
            style={{
              background: 'radial-gradient(circle, rgba(245,158,11,0.45) 0%, transparent 70%)',
            }}
          />
          <div
            className="absolute inset-x-8 bottom-3 h-20 opacity-40 blur-2xl"
            style={{
              background: 'radial-gradient(ellipse, rgba(245,158,11,0.5) 0%, transparent 75%)',
            }}
          />
        </div>

        {/* =====================================================================
            2. SPACER FOR UPPER 3D FOX HERO ILLUSTRATION (Top ~43.5% of viewport)
           ===================================================================== */}
        <div className="relative z-10 w-full flex-1 min-h-[38vh]" />

        {/* =====================================================================
            3. LOWER CONTENT REGION: TITLE, SUBTITLE, BEVELED CARD & CTA BUTTON
           ===================================================================== */}
        <div className="relative z-10 w-full px-5 pb-6 sm:pb-8 flex flex-col items-center">
          {/* Headline: "Welcome Back, Fox!" */}
          <h1
            style={{
              textShadow: '0 4px 18px rgba(0, 0, 0, 0.95), 0 0 28px rgba(245, 158, 11, 0.22)',
            }}
            className="text-[31px] min-[380px]:text-[35px] sm:text-[37px] font-black tracking-[-0.02em] leading-[1.08] text-center"
          >
            <span className="bg-gradient-to-b from-[#FFFDF5] via-[#F7DC9C] to-[#D6A354] bg-clip-text text-transparent">
              Welcome Back,{' '}
            </span>
            <span className="bg-gradient-to-b from-[#FFE066] via-[#FF921C] to-[#FF5500] bg-clip-text text-transparent drop-shadow-[0_0_16px_rgba(255,115,0,0.45)]">
              Fox!
            </span>
          </h1>

          {/* Subtitle */}
          <p className="mt-2 text-[14px] sm:text-[15.5px] font-medium text-[#D5DFEE] text-center max-w-[295px] sm:max-w-[320px] leading-[1.36] drop-shadow-[0_2px_8px_rgba(0,0,0,0.95)]">
            Your fox mining empire kept working while you were away.
          </p>

          {/* ===================================================================
              CHAMFERED SCI-FI GOLDEN FRAME CARD ("GENERATED OFFLINE EARNINGS")
             =================================================================== */}
          <div className="relative w-full mt-4 sm:mt-5">
            {/* Top & Bottom Edge Golden Light Flares */}
            <div className="absolute -top-[2px] left-1/2 -translate-x-1/2 w-36 h-[4px] bg-gradient-to-r from-transparent via-[#FFE58F] to-transparent blur-[1px] z-20 pointer-events-none" />
            <div className="absolute -bottom-[2px] left-[22%] w-24 h-[3px] bg-gradient-to-r from-transparent via-[#FFB830] to-transparent blur-[1px] z-20 pointer-events-none" />
            <div className="absolute -bottom-[2px] right-[22%] w-24 h-[3px] bg-gradient-to-r from-transparent via-[#FFB830] to-transparent blur-[1px] z-20 pointer-events-none" />

            {/* Outer Glow Halo */}
            <div
              className="absolute -inset-1 opacity-60 blur-md pointer-events-none"
              style={{
                background:
                  'linear-gradient(180deg, rgba(251,191,36,0.35) 0%, rgba(217,119,6,0.18) 50%, rgba(251,191,36,0.35) 100%)',
              }}
            />

            {/* Precision SVG Chamfered Double-Border Frame */}
            <div className="relative w-full py-4 sm:py-5 px-5 sm:px-6">
              <svg
                viewBox="0 0 400 210"
                preserveAspectRatio="none"
                className="absolute inset-0 w-full h-full pointer-events-none select-none z-0"
              >
                <defs>
                  <linearGradient id="wb_card_bg" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#0E121B" stopOpacity="0.97" />
                    <stop offset="50%" stopColor="#090C13" stopOpacity="0.98" />
                    <stop offset="100%" stopColor="#0D1018" stopOpacity="0.97" />
                  </linearGradient>
                  <linearGradient id="wb_gold_outer" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#FFE58F" />
                    <stop offset="25%" stopColor="#F59E0B" />
                    <stop offset="50%" stopColor="#B45309" />
                    <stop offset="75%" stopColor="#F59E0B" />
                    <stop offset="100%" stopColor="#FFE58F" />
                  </linearGradient>
                  <linearGradient id="wb_gold_inner" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#FDE68A" stopOpacity="0.55" />
                    <stop offset="50%" stopColor="#D97706" stopOpacity="0.28" />
                    <stop offset="100%" stopColor="#FDE68A" stopOpacity="0.55" />
                  </linearGradient>
                  <radialGradient id="wb_center_glow" cx="50%" cy="42%" r="50%">
                    <stop offset="0%" stopColor="#F59E0B" stopOpacity="0.16" />
                    <stop offset="100%" stopColor="#F59E0B" stopOpacity="0" />
                  </radialGradient>
                </defs>

                {/* Main Chamfered Octagon Background */}
                <polygon
                  points="18,2 382,2 398,18 398,192 382,208 18,208 2,192 2,18"
                  fill="url(#wb_card_bg)"
                  stroke="url(#wb_gold_outer)"
                  strokeWidth="2.6"
                />

                {/* Subtle Warm Center Glow */}
                <polygon
                  points="18,2 382,2 398,18 398,192 382,208 18,208 2,192 2,18"
                  fill="url(#wb_center_glow)"
                />

                {/* Inner Stepped Bevel Frame Line */}
                <polygon
                  points="22,8 378,8 392,22 392,188 378,202 22,202 8,188 8,22"
                  fill="none"
                  stroke="url(#wb_gold_inner)"
                  strokeWidth="1.1"
                />

                {/* Corner Tech Accents */}
                <polyline
                  points="5,26 5,19 19,5 28,5"
                  fill="none"
                  stroke="#FFF3B0"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
                <polyline
                  points="372,5 381,5 395,19 395,26"
                  fill="none"
                  stroke="#FFF3B0"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
                <polyline
                  points="5,184 5,191 19,205 28,205"
                  fill="none"
                  stroke="#FFF3B0"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
                <polyline
                  points="372,205 381,205 395,191 395,184"
                  fill="none"
                  stroke="#FFF3B0"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>

              {/* Card Interior Content */}
              <div className="relative z-10 flex flex-col items-center">
                {/* Row 1: — GENERATED OFFLINE EARNINGS — */}
                <div className="flex items-center justify-center gap-2.5 w-full">
                  <span className="w-5 sm:w-6 h-[1.5px] bg-gradient-to-r from-transparent via-amber-400 to-amber-300 rounded-full" />
                  <span className="text-[11px] min-[380px]:text-[12px] sm:text-[13px] font-extrabold uppercase tracking-[0.07em] text-[#F2D184] whitespace-nowrap">
                    GENERATED OFFLINE EARNINGS
                  </span>
                  <span className="w-5 sm:w-6 h-[1.5px] bg-gradient-to-l from-transparent via-amber-400 to-amber-300 rounded-full" />
                </div>

                {/* Row 2: Glowing 3D Fox Gold Coin + Large "+105" Amount */}
                <div className="mt-2.5 sm:mt-3 flex items-center justify-center gap-3.5 sm:gap-4">
                  {/* Glowing 3D Coin Container */}
                  <div className="relative w-16 h-16 sm:w-[70px] sm:h-[70px] flex items-center justify-center shrink-0">
                    {/* Golden Radial Aura Behind Coin */}
                    <div
                      className="absolute -inset-2.5 rounded-full blur-md pointer-events-none"
                      style={{
                        background:
                          'radial-gradient(circle, rgba(251,191,36,0.75) 0%, rgba(245,158,11,0.3) 55%, transparent 75%)',
                      }}
                    />
                    {/* Outer glowing ring */}
                    <div className="relative w-full h-full rounded-full p-[2px] bg-gradient-to-b from-[#FFF3B0] via-[#F59E0B] to-[#B45309] shadow-[0_0_20px_rgba(251,191,36,0.75)]">
                      <img
                        src={foxGoldCoinImg}
                        alt="FOX Coin"
                        draggable={false}
                        className="w-full h-full rounded-full object-cover block"
                      />
                    </div>
                    {/* Subtle Sparkle Dots Around Coin */}
                    <span className="absolute -top-0.5 right-0 w-1.5 h-1.5 rounded-full bg-yellow-200 shadow-[0_0_6px_#FEF08A]" />
                    <span className="absolute bottom-1 -left-0.5 w-1 h-1 rounded-full bg-amber-300 shadow-[0_0_6px_#FCD34D]" />
                  </div>

                  {/* Large Glowing Gold Amount */}
                  <span
                    style={{
                      filter: 'drop-shadow(0 0 18px rgba(245, 158, 11, 0.45))',
                    }}
                    className="text-[42px] min-[380px]:text-[48px] sm:text-[52px] font-black leading-none tracking-tight tabular-nums bg-gradient-to-b from-[#FFF6B7] via-[#FFCA3A] to-[#F59E0B] bg-clip-text text-transparent"
                  >
                    +{displayAmount.toLocaleString('en-US')}
                  </span>
                </div>

                {/* Row 3: Clock Icon + "Offline for 3h 12m" */}
                <div className="mt-1.5 flex items-center justify-center gap-1.5 text-[12px] sm:text-[13px] font-medium text-[#D1DCEB]">
                  <Clock className="w-3.5 h-3.5 text-[#FBBF24] shrink-0" />
                  <span>Offline for {offlineDurationText}</span>
                </div>

                {/* Horizontal Divider Line */}
                <div className="w-[92%] h-[1px] my-2.5 sm:my-3 bg-gradient-to-r from-transparent via-slate-500/45 to-transparent" />

                {/* Row 4: Crossed Golden Pickaxes Icon + "Current Rate: +1,600 FOX/hr" */}
                <div className="flex items-center justify-center gap-2 text-[13px] min-[380px]:text-[14px] sm:text-[15px]">
                  {/* Custom Crossed Golden Pickaxes SVG with Sparkles */}
                  <svg
                    viewBox="0 0 32 32"
                    className="w-6 h-6 sm:w-6.5 sm:h-6.5 shrink-0 drop-shadow-[0_0_8px_rgba(251,191,36,0.45)]"
                    fill="none"
                  >
                    <defs>
                      <linearGradient id="pickaxe_gold" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#FFF3B0" />
                        <stop offset="50%" stopColor="#FBBF24" />
                        <stop offset="100%" stopColor="#D97706" />
                      </linearGradient>
                    </defs>
                    {/* Tiny sparkle stars */}
                    <path
                      d="M16 3L16.8 5.2L19 6L16.8 6.8L16 9L15.2 6.8L13 6L15.2 5.2L16 3Z"
                      fill="#FDE68A"
                    />
                    <path
                      d="M6 15L6.5 16.5L8 17L6.5 17.5L6 19L5.5 17.5L4 17L5.5 16.5L6 15Z"
                      fill="#FBBF24"
                    />
                    <path
                      d="M26 15L26.5 16.5L28 17L26.5 17.5L26 19L25.5 17.5L24 17L25.5 16.5L26 15Z"
                      fill="#FBBF24"
                    />
                    {/* Handle 1 (bottom-left to top-right) */}
                    <path
                      d="M7 26L23 10"
                      stroke="url(#pickaxe_gold)"
                      strokeWidth="2.8"
                      strokeLinecap="round"
                    />
                    {/* Pickaxe Head 1 */}
                    <path
                      d="M17 7C20.5 6.5 24 8.5 25.5 12C23.5 11.2 21 11.2 19 12.5L17 10.5C18.3 8.5 18.3 7.5 17 7Z"
                      fill="url(#pickaxe_gold)"
                      stroke="#FEF08A"
                      strokeWidth="0.6"
                    />
                    {/* Handle 2 (bottom-right to top-left) */}
                    <path
                      d="M25 26L9 10"
                      stroke="url(#pickaxe_gold)"
                      strokeWidth="2.8"
                      strokeLinecap="round"
                    />
                    {/* Pickaxe Head 2 */}
                    <path
                      d="M15 7C11.5 6.5 8 8.5 6.5 12C8.5 11.2 11 11.2 13 12.5L15 10.5C13.7 8.5 13.7 7.5 15 7Z"
                      fill="url(#pickaxe_gold)"
                      stroke="#FEF08A"
                      strokeWidth="0.6"
                    />
                  </svg>

                  <span className="text-[#D5E1F2] font-medium">
                    Current Rate:{' '}
                    <strong className="font-extrabold text-[#FBBF24] drop-shadow-[0_0_10px_rgba(251,191,36,0.35)]">
                      +{displayRate.toLocaleString('en-US')} FOX/hr
                    </strong>
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* ===================================================================
              GLOWING GOLDEN PILL CTA BUTTON ("Collect FOX Coins")
             =================================================================== */}
          <div className="relative w-full mt-4 sm:mt-5">
            {/* Outer Golden Aura Glow */}
            <div
              className="absolute -inset-1.5 rounded-full opacity-75 blur-lg pointer-events-none"
              style={{
                background:
                  'linear-gradient(90deg, rgba(245,158,11,0.35) 0%, rgba(251,191,36,0.75) 50%, rgba(245,158,11,0.35) 100%)',
              }}
            />

            {/* Top & Bottom Edge Specular Flares */}
            <div className="absolute -top-[2px] left-1/2 -translate-x-1/2 w-40 h-[3px] bg-gradient-to-r from-transparent via-[#FFF9D2] to-transparent z-20 pointer-events-none" />
            <div className="absolute -bottom-[2px] left-1/2 -translate-x-1/2 w-44 h-[3px] bg-gradient-to-r from-transparent via-[#FFE066] to-transparent z-20 pointer-events-none" />

            <button
              type="button"
              onClick={handleClaim}
              disabled={isClaiming}
              className="relative z-10 w-full p-[2.5px] rounded-full bg-gradient-to-b from-[#FFF3B0] via-[#F59E0B] to-[#B45309] shadow-[0_8px_28px_rgba(245,158,11,0.55),0_0_2px_#FFFbeb] active:scale-[0.98] transition-all cursor-pointer group"
            >
              <div className="relative w-full py-3.5 sm:py-4 px-6 rounded-full bg-gradient-to-b from-[#FFE45E] via-[#FFA914] to-[#E07000] group-hover:brightness-105 flex items-center justify-center gap-2.5 overflow-hidden shadow-inner">
                {/* Glossy top-half highlight sheen */}
                <div
                  className="absolute inset-x-4 top-0.5 h-[46%] rounded-full pointer-events-none"
                  style={{
                    background:
                      'linear-gradient(180deg, rgba(255,255,255,0.42) 0%, rgba(255,255,255,0.04) 100%)',
                  }}
                />

                {/* Black 4-Point Sparkle Icon with Twin Plus Stars (Matches Reference Image) */}
                <svg
                  viewBox="0 0 28 28"
                  className="relative z-10 w-6 h-6 text-[#0A0B0E] fill-current shrink-0"
                >
                  {/* Main 4-point star */}
                  <path d="M13 3C13 9.2 15.8 12 22 12C15.8 12 13 14.8 13 21C13 14.8 10.2 12 4 12C10.2 12 13 9.2 13 3Z" />
                  {/* Top-right small plus sparkle */}
                  <path
                    d="M21.5 3.5V8.5M19 6H24"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                  />
                  {/* Bottom-left small plus sparkle */}
                  <path
                    d="M6.5 18.5V23.5M4 21H9"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                  />
                </svg>

                <span className="relative z-10 text-[17px] sm:text-[18.5px] font-extrabold text-[#0A0B0E] tracking-[-0.01em]">
                  {isClaiming ? 'Collecting...' : 'Collect FOX Coins'}
                </span>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
