import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import {
  Crown,
  Pickaxe,
  Factory,
  FlaskConical,
  Store,
  Home,
  Zap,
  Plane,
  Compass,
  Map as MapIcon,
} from 'lucide-react';
import {
  CityCameraPreset,
  CityQualityTier,
  CityTimeMode,
  FOX_CITY_BUILDINGS,
  FoxCityBuildingConfig,
  FoxCityBuildingId,
  BuildingResolvedState,
  FoxMascotAnimMode,
} from './foxCityTypes.js';

export interface FoxCityCanvasProps {
  buildingStates: Record<FoxCityBuildingId, BuildingResolvedState>;
  selectedBuildingId: FoxCityBuildingId | null;
  onSelectBuilding: (
    id: FoxCityBuildingId | null,
    resolvedState?: BuildingResolvedState
  ) => void;
  timeMode: CityTimeMode;
  autoCycleTime: boolean;
  cameraPreset: CityCameraPreset;
  resetSignal: number;
  qualityTier: CityQualityTier;
  mascotMode?: FoxMascotAnimMode;
  isFullScreen?: boolean;
}

interface ProjectedLabel {
  id: FoxCityBuildingId;
  x: number;
  y: number;
  visible: boolean;
}

import {
  BuildingAssetsRegistry,
  MetropolitanMaterialPalette,
} from './world/BuildingAssets.js';
import { buildMetropolitanCityWorld } from './world/CityWorld.js';
import { buildMetropolitanRoadNetwork } from './world/RoadNetwork.js';
import { buildMetropolitanDistricts } from './world/DistrictManager.js';
import {
  LandmarkBuildingsBuildContext,
  buildRedesignedHeadquarters,
  buildRemainingRedesignedLandmarks,
} from './world/LandmarkBuildings.js';
import {
  ClosedLoopPath,
  LaneVehicle,
  sampleClosedLoop,
  createMetropolitanVehicleLoops,
  RealisticVehicleFleetBuilder,
  METROPOLITAN_FLEET_ASSIGNMENTS,
} from './world/TrafficSystem.js';
import {
  SidewalkFoxNpc,
  createMetropolitanSidewalkLoops,
} from './world/PedestrianSystem.js';
import {
  AnimatedBoat,
  DriftingCloud,
  createHarborShippingLoops,
} from './world/EnvironmentalEffects.js';

export const FoxCityCanvas: React.FC<FoxCityCanvasProps> = ({
  buildingStates,
  selectedBuildingId,
  onSelectBuilding,
  timeMode,
  autoCycleTime,
  cameraPreset,
  resetSignal,
  qualityTier,
  mascotMode = 'auto',
  isFullScreen = false,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [webglError, setWebglError] = useState<string | null>(null);
  const [labels, setLabels] = useState<ProjectedLabel[]>([]);
  const [compassDeg, setCompassDeg] = useState<number>(0);
  const [showMiniMap, setShowMiniMap] = useState<boolean>(false);
  const [hoveredBuildingId, setHoveredBuildingId] = useState<FoxCityBuildingId | null>(null);

  const selectedBuildingRef = useRef<FoxCityBuildingId | null>(selectedBuildingId);
  selectedBuildingRef.current = selectedBuildingId;

  const hoveredBuildingRef = useRef<FoxCityBuildingId | null>(null);

  const buildingStatesRef = useRef<Record<FoxCityBuildingId, BuildingResolvedState>>(buildingStates);
  buildingStatesRef.current = buildingStates;

  const timeModeRef = useRef<CityTimeMode>(timeMode);
  timeModeRef.current = timeMode;

  const autoCycleRef = useRef<boolean>(autoCycleTime);
  autoCycleRef.current = autoCycleTime;

  const mascotModeRef = useRef<FoxMascotAnimMode>(mascotMode);
  mascotModeRef.current = mascotMode;

  const onSelectRef = useRef(onSelectBuilding);
  onSelectRef.current = onSelectBuilding;

  const cameraControlRef = useRef({
    azimuth: 0.0,
    polar: 0.93,
    distance: 20.4,
    targetAzimuth: 0.0,
    targetPolar: 0.93,
    targetDistance: 20.4,
    lookAt: new THREE.Vector3(0, 0.88, -0.55),
    targetLookAt: new THREE.Vector3(0, 0.88, -0.55),
  });

  useEffect(() => {
    const ctrl = cameraControlRef.current;
    if (selectedBuildingId) {
      const b = FOX_CITY_BUILDINGS.find((item) => item.id === selectedBuildingId);
      if (b) {
        ctrl.targetLookAt.set(b.position[0], b.position[1] * 0.55, b.position[2]);
        ctrl.targetDistance = 12.0;
        ctrl.targetPolar = 0.98;
      }
    } else if (cameraPreset !== 'plaza') {
      ctrl.targetLookAt.set(0, 0.88, -0.55);
      if (cameraPreset === 'top') {
        ctrl.targetDistance = 28.0;
        ctrl.targetPolar = 0.44;
      } else if (cameraPreset === 'close') {
        ctrl.targetDistance = 14.2;
        ctrl.targetPolar = 1.05;
      } else {
        ctrl.targetDistance = 20.4;
        ctrl.targetPolar = 0.93;
      }
    }
  }, [selectedBuildingId, cameraPreset]);

  useEffect(() => {
    const ctrl = cameraControlRef.current;
    if (cameraPreset === 'top') {
      ctrl.targetPolar = 0.44;
      ctrl.targetDistance = 28.0;
    } else if (cameraPreset === 'close') {
      ctrl.targetPolar = 1.05;
      ctrl.targetDistance = 14.2;
    } else if (cameraPreset === 'plaza') {
      ctrl.targetLookAt.set(1.3, 0.5, 1.3);
      ctrl.targetDistance = 10.6;
      ctrl.targetPolar = 1.04;
    } else {
      ctrl.targetPolar = 0.93;
      ctrl.targetDistance = selectedBuildingRef.current ? 12.0 : 20.4;
    }
  }, [cameraPreset]);

  useEffect(() => {
    if (resetSignal === 0) return;
    const ctrl = cameraControlRef.current;
    ctrl.targetAzimuth = 0.0;
    ctrl.targetPolar = 0.93;
    ctrl.targetDistance = 20.4;
    ctrl.targetLookAt.set(0, 0.88, -0.55);
  }, [resetSignal]);

  const renderBadgeIcon = useCallback((type: FoxCityBuildingConfig['iconType']) => {
    const cls = 'w-3 h-3 text-amber-400 shrink-0';
    switch (type) {
      case 'crown':
        return <Crown className={cls} />;
      case 'pickaxe':
        return <Pickaxe className={cls} />;
      case 'factory':
        return <Factory className={cls} />;
      case 'flask':
        return <FlaskConical className="w-3 h-3 text-sky-400 shrink-0" />;
      case 'store':
        return <Store className={cls} />;
      case 'home':
        return <Home className="w-3 h-3 text-emerald-400 shrink-0" />;
      case 'zap':
        return <Zap className="w-3 h-3 text-sky-400 shrink-0" />;
      case 'helicopter':
        return <Plane className={cls} />;
    }
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: qualityTier !== 'low',
        powerPreference: 'high-performance',
        alpha: false,
        stencil: false,
        depth: true,
      });
    } catch (err: any) {
      setWebglError(err?.message || 'WebGL is unavailable on this device.');
      return;
    }

    // Inspect active WebGL context for software rasterizers or legacy mobile GPUs
    const gl = renderer.getContext();
    const debugExt = gl.getExtension('WEBGL_debug_renderer_info');
    const gpuRendererStr = debugExt
      ? String(gl.getParameter(debugExt.UNMASKED_RENDERER_WEBGL))
      : String(gl.getParameter(gl.RENDERER));
    const isSoftwareGl = /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(
      gpuRendererStr
    );
    const isMobileDevice =
      /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent || '') ||
      (typeof window !== 'undefined' && window.innerWidth < 768);

    const maxDpr = isSoftwareGl
      ? 1.0
      : qualityTier === 'high'
      ? isMobileDevice
        ? 1.85
        : 2.0
      : qualityTier === 'medium'
      ? 1.5
      : 1.15;
    let activePixelRatio = Math.min(window.devicePixelRatio || 1, maxDpr);

    const initWidth = Math.max(280, container.clientWidth || 360);
    const initHeight = Math.max(300, container.clientHeight || 420);

    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.setPixelRatio(activePixelRatio);
    renderer.setSize(initWidth, initHeight);
    renderer.shadowMap.enabled = !isSoftwareGl && qualityTier !== 'low';
    renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.shadowMap.autoUpdate = false;
    renderer.shadowMap.needsUpdate = true;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.18;

    const maxAnisotropy = Math.min(
      8,
      Math.max(1, renderer.capabilities.getMaxAnisotropy() || 1)
    );

    const pbrGeneratedTextures: THREE.Texture[] = [];

    const configureHighQualityTexture = (
      tex: THREE.Texture,
      repeatX = 1,
      repeatY = 1
    ) => {
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = maxAnisotropy;
      tex.minFilter = THREE.LinearMipmapLinearFilter;
      tex.magFilter = THREE.LinearFilter;
      tex.generateMipmaps = true;
      if (repeatX > 1 || repeatY > 1) {
        tex.wrapS = THREE.RepeatWrapping;
        tex.wrapT = THREE.RepeatWrapping;
        tex.repeat.set(repeatX, repeatY);
      }
      tex.needsUpdate = true;
      pbrGeneratedTextures.push(tex);
      return tex;
    };

    // Linear (NoColorSpace) configuration for non-color PBR data maps (normalMap, roughnessMap, metalnessMap, aoMap)
    const configureLinearDataTexture = (
      tex: THREE.Texture,
      repeatX = 1,
      repeatY = 1
    ) => {
      tex.colorSpace = THREE.NoColorSpace;
      tex.anisotropy = maxAnisotropy;
      tex.minFilter = THREE.LinearMipmapLinearFilter;
      tex.magFilter = THREE.LinearFilter;
      tex.generateMipmaps = true;
      if (repeatX > 1 || repeatY > 1) {
        tex.wrapS = THREE.RepeatWrapping;
        tex.wrapT = THREE.RepeatWrapping;
        tex.repeat.set(repeatX, repeatY);
      }
      tex.needsUpdate = true;
      pbrGeneratedTextures.push(tex);
      return tex;
    };

    // Fast Downsampled Sobel Height-to-Normal-Map Generator (128x128 max buffer = 64x faster startup, zero main-thread freeze)
    const createNormalMapFromHeightCanvas = (
      heightCanvas: HTMLCanvasElement,
      strength = 2.4,
      repeatX = 1,
      repeatY = 1
    ) => {
      const w = Math.min(128, heightCanvas.width);
      const h = Math.min(128, heightCanvas.height);
      const srcCanvas = document.createElement('canvas');
      srcCanvas.width = w;
      srcCanvas.height = h;
      const srcCtx = srcCanvas.getContext('2d');
      const dstCanvas = document.createElement('canvas');
      dstCanvas.width = w;
      dstCanvas.height = h;
      const dstCtx = dstCanvas.getContext('2d');

      if (srcCtx && dstCtx) {
        srcCtx.drawImage(heightCanvas, 0, 0, w, h);
        const srcData = srcCtx.getImageData(0, 0, w, h).data;
        const dstImg = dstCtx.createImageData(w, h);
        const dstData = dstImg.data;
        const sampleH = (x: number, y: number) => {
          const cx = (x + w) % w;
          const cy = (y + h) % h;
          return srcData[(cy * w + cx) * 4] / 255;
        };

        for (let y = 0; y < h; y++) {
          for (let x = 0; x < w; x++) {
            const hL = sampleH(x - 1, y);
            const hR = sampleH(x + 1, y);
            const hU = sampleH(x, y - 1);
            const hD = sampleH(x, y + 1);
            const dx = (hL - hR) * strength;
            const dy = (hU - hD) * strength;
            const dz = 1.0;
            const invLen = 1.0 / Math.sqrt(dx * dx + dy * dy + dz * dz);
            const idx = (y * w + x) * 4;
            dstData[idx] = Math.round(((dx * invLen) * 0.5 + 0.5) * 255);
            dstData[idx + 1] = Math.round(((dy * invLen) * 0.5 + 0.5) * 255);
            dstData[idx + 2] = Math.round(((dz * invLen) * 0.5 + 0.5) * 255);
            dstData[idx + 3] = 255;
          }
        }
        dstCtx.putImageData(dstImg, 0, 0);
      }
      return configureLinearDataTexture(
        new THREE.CanvasTexture(dstCanvas),
        repeatX,
        repeatY
      );
    };

    while (container.firstChild) {
      container.removeChild(container.firstChild);
    }
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();

    // Custom Futuristic Golden Metropolis Environment for realistic metallic & glass IBL reflections
    const buildGoldenCityEnvironmentScene = () => {
      const envScene = new THREE.Scene();

      // Deep midnight-blue zenith dome with warm golden horizon band
      const domeGeo = new THREE.SphereGeometry(25, 24, 16);
      const domeCanvas = document.createElement('canvas');
      domeCanvas.width = 256;
      domeCanvas.height = 128;
      const dCtx = domeCanvas.getContext('2d');
      if (dCtx) {
        const g = dCtx.createLinearGradient(0, 0, 0, 128);
        g.addColorStop(0, '#040816');
        g.addColorStop(0.48, '#0c1836');
        g.addColorStop(0.76, '#45271d');
        g.addColorStop(0.9, '#f59e0b');
        g.addColorStop(1, '#090d18');
        dCtx.fillStyle = g;
        dCtx.fillRect(0, 0, 256, 128);
      }
      const domeTex = new THREE.CanvasTexture(domeCanvas);
      domeTex.colorSpace = THREE.SRGBColorSpace;
      const domeMat = new THREE.MeshBasicMaterial({
        map: domeTex,
        side: THREE.BackSide,
      });
      envScene.add(new THREE.Mesh(domeGeo, domeMat));

      // Emissive golden & cyan city skyline reflection cards for realistic specular highlights
      const goldCardMat = new THREE.MeshBasicMaterial({ color: 0xfde047 });
      const amberCardMat = new THREE.MeshBasicMaterial({ color: 0xf59e0b });
      const cyanCardMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });

      for (let i = 0; i < 8; i++) {
        const ang = (i * Math.PI * 2) / 8;
        const card = new THREE.Mesh(
          new THREE.PlaneGeometry(4.5, 8.0),
          i % 3 === 0 ? cyanCardMat : i % 2 === 0 ? goldCardMat : amberCardMat
        );
        card.position.set(Math.cos(ang) * 14, 2.5, Math.sin(ang) * 14);
        card.lookAt(0, 1.5, 0);
        envScene.add(card);
      }

      const overheadHalo = new THREE.Mesh(
        new THREE.RingGeometry(4.0, 5.2, 24),
        goldCardMat
      );
      overheadHalo.rotation.x = Math.PI / 2;
      overheadHalo.position.y = 14;
      envScene.add(overheadHalo);

      return { envScene, domeTex };
    };

    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    pmremGenerator.compileEquirectangularShader();
    const { envScene, domeTex } = buildGoldenCityEnvironmentScene();
    const envTarget = pmremGenerator.fromScene(envScene, 0.035);
    scene.environment = envTarget.texture;
    scene.environmentIntensity = 1.25;
    domeTex.dispose();
    envScene.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.geometry) m.geometry.dispose();
      if (m.material && !Array.isArray(m.material)) m.material.dispose();
    });
    pmremGenerator.dispose();

    const createSkyDomeTexture = (mode: CityTimeMode) => {
      const canvas = document.createElement('canvas');
      canvas.width = 512;
      canvas.height = 512;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const grad = ctx.createLinearGradient(0, 0, 0, 512);
        if (mode === 'day') {
          grad.addColorStop(0, '#0f294a');
          grad.addColorStop(0.45, '#1e4e79');
          grad.addColorStop(0.75, '#f59e0b');
          grad.addColorStop(1, '#102438');
        } else if (mode === 'night') {
          // Futuristic Nighttime Metropolis Sky with Warm Golden Horizon Glow
          grad.addColorStop(0, '#02040a');
          grad.addColorStop(0.45, '#070d1d');
          grad.addColorStop(0.76, '#111b36');
          grad.addColorStop(0.92, '#281f2b');
          grad.addColorStop(1, '#080c18');
        } else if (mode === 'rainy') {
          grad.addColorStop(0, '#0c1524');
          grad.addColorStop(0.55, '#1e293b');
          grad.addColorStop(0.82, '#334155');
          grad.addColorStop(1, '#0f172a');
        } else {
          grad.addColorStop(0, '#090d18');
          grad.addColorStop(0.32, '#1e1b38');
          grad.addColorStop(0.62, '#9a3412');
          grad.addColorStop(0.78, '#f59e0b');
          grad.addColorStop(0.9, '#fde047');
          grad.addColorStop(1, '#0d1522');
        }
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 512, 512);

        if (mode === 'night' || mode === 'sunset') {
          for (let i = 0; i < 120; i++) {
            const sx = (i * 97) % 512;
            const sy = (i * 43) % 280;
            const alpha = mode === 'night' ? 0.85 : 0.42;
            ctx.fillStyle =
              i % 5 === 0
                ? `rgba(251,191,36,${alpha})`
                : `rgba(255,255,255,${alpha})`;
            ctx.fillRect(sx, sy, i % 4 === 0 ? 2 : 1.5, i % 4 === 0 ? 2 : 1.5);
          }
        }
      }
      const tex = new THREE.CanvasTexture(canvas);
      return configureHighQualityTexture(tex);
    };

    const skyTex = createSkyDomeTexture(timeModeRef.current);
    scene.background = skyTex;
    scene.fog = new THREE.FogExp2(0x1a1528, 0.011);

    const camera = new THREE.PerspectiveCamera(
      34,
      initWidth / initHeight,
      0.5,
      140
    );

    // =========================================================================
    // PHASE 2: MULTI-CHANNEL PBR TEXTURE SUITES (map, normalMap, roughnessMap, metalnessMap, aoMap, emissiveMap)
    // =========================================================================
    const createSkyscraperPBRSuite = (cols = 8, rows = 12) => {
      const texScale = 1;
      const size = 512 * texScale;

      const albedoCanvas = document.createElement('canvas');
      const emissiveCanvas = document.createElement('canvas');
      const roughCanvas = document.createElement('canvas');
      const metalCanvas = document.createElement('canvas');
      const aoCanvas = document.createElement('canvas');
      const heightCanvas = document.createElement('canvas');

      [albedoCanvas, emissiveCanvas, roughCanvas, metalCanvas, aoCanvas, heightCanvas].forEach(
        (c) => {
          c.width = size;
          c.height = size;
        }
      );

      const aCtx = albedoCanvas.getContext('2d');
      const eCtx = emissiveCanvas.getContext('2d');
      const rCtx = roughCanvas.getContext('2d');
      const mCtx = metalCanvas.getContext('2d');
      const aoCtx = aoCanvas.getContext('2d');
      const hCtx = heightCanvas.getContext('2d');

      if (aCtx && eCtx && rCtx && mCtx && aoCtx && hCtx) {
        [aCtx, eCtx, rCtx, mCtx, aoCtx, hCtx].forEach((ctx) =>
          ctx.scale(texScale, texScale)
        );

        // Base structural anodized steel & dark obsidian frame
        aCtx.fillStyle = '#0d121d';
        aCtx.fillRect(0, 0, 512, 512);

        // Emissive is pitch-black on structural frames so mullions never glow
        eCtx.fillStyle = '#000000';
        eCtx.fillRect(0, 0, 512, 512);

        // Frame roughness = 0.42 (gray #6b), metalness = 0.88 (#e0), height = raised (230)
        rCtx.fillStyle = '#6b6b6b';
        rCtx.fillRect(0, 0, 512, 512);

        mCtx.fillStyle = '#e0e0e0';
        mCtx.fillRect(0, 0, 512, 512);

        aoCtx.fillStyle = '#ffffff';
        aoCtx.fillRect(0, 0, 512, 512);

        hCtx.fillStyle = '#e6e6e6';
        hCtx.fillRect(0, 0, 512, 512);

        const cellW = 512 / cols;
        const cellH = 512 / rows;

        for (let r = 0; r < rows; r++) {
          // Horizontal brushed steel & architectural concrete spandrel beam
          const isAccentSpandrel = r % 3 === 0;
          aCtx.fillStyle = isAccentSpandrel ? '#334155' : '#1e293b';
          aCtx.fillRect(0, r * cellH, 512, 6);
          rCtx.fillStyle = isAccentSpandrel ? '#383838' : '#555555';
          rCtx.fillRect(0, r * cellH, 512, 6);
          mCtx.fillStyle = '#e5e5e5';
          mCtx.fillRect(0, r * cellH, 512, 6);
          hCtx.fillStyle = '#ffffff';
          hCtx.fillRect(0, r * cellH, 512, 6);

          for (let c = 0; c < cols; c++) {
            const padX = 7;
            const padY = 8;
            const wx = c * cellW + padX;
            const wy = r * cellH + padY;
            const ww = cellW - padX * 2;
            const wh = cellH - padY * 2;

            // Deep window recess AO shadow border
            aoCtx.fillStyle = '#525252';
            aoCtx.fillRect(wx - 2, wy - 2, ww + 4, wh + 4);
            aoCtx.fillStyle = '#d4d4d4';
            aoCtx.fillRect(wx + 2, wy + 2, ww - 4, wh - 4);

            // Recessed glass pane height (dark = recessed inward relative to raised mullions)
            hCtx.fillStyle = '#909090';
            hCtx.fillRect(wx - 2, wy - 2, ww + 4, wh + 4);
            hCtx.fillStyle = '#242424';
            hCtx.fillRect(wx, wy, ww, wh);

            // Glass pane is mirror-smooth (roughness ~ 0.06 = #101010) and low-metalness dielectric (#262626)
            rCtx.fillStyle = '#121212';
            rCtx.fillRect(wx, wy, ww, wh);
            mCtx.fillStyle = '#262626';
            mCtx.fillRect(wx, wy, ww, wh);

            // Only ~28% of office windows are softly lit; 72% are dark reflective architectural glass
            const hash = (r * 13 + c * 7) % 10;
            const isLit = hash === 0 || hash === 3 || hash === 7;
            if (isLit) {
              const isCoolOffice = hash !== 7;
              const g = aCtx.createLinearGradient(wx, wy, wx, wy + wh);
              if (isCoolOffice) {
                g.addColorStop(0, '#e0f2fe');
                g.addColorStop(0.55, '#7dd3fc');
                g.addColorStop(1, '#1e3a5f');
              } else {
                g.addColorStop(0, '#fef3c7');
                g.addColorStop(0.55, '#fcd34d');
                g.addColorStop(1, '#475569');
              }
              aCtx.fillStyle = g;
              aCtx.fillRect(wx, wy, ww, wh);

              const eg = eCtx.createLinearGradient(wx, wy, wx, wy + wh);
              if (isCoolOffice) {
                eg.addColorStop(0, '#bae6fd');
                eg.addColorStop(0.6, '#38bdf8');
                eg.addColorStop(1, '#0c4a6e');
              } else {
                eg.addColorStop(0, '#fef08a');
                eg.addColorStop(0.6, '#fbbf24');
                eg.addColorStop(1, '#334155');
              }
              eCtx.fillStyle = eg;
              eCtx.fillRect(wx + 1, wy + 1, ww - 2, wh - 2);
            } else {
              // Dark blue-slate reflective architectural glass pane
              const g = aCtx.createLinearGradient(wx, wy, wx + ww, wy + wh);
              g.addColorStop(0, '#132238');
              g.addColorStop(0.5, '#0c1626');
              g.addColorStop(1, '#060b14');
              aCtx.fillStyle = g;
              aCtx.fillRect(wx, wy, ww, wh);
            }

            // Raised dark anodized steel window frame mullion
            aCtx.strokeStyle = '#334155';
            aCtx.lineWidth = 1.6;
            aCtx.strokeRect(wx, wy, ww, wh);
          }
        }
      }

      return {
        map: configureHighQualityTexture(new THREE.CanvasTexture(albedoCanvas)),
        emissiveMap: configureHighQualityTexture(new THREE.CanvasTexture(emissiveCanvas)),
        roughnessMap: configureLinearDataTexture(new THREE.CanvasTexture(roughCanvas)),
        metalnessMap: configureLinearDataTexture(new THREE.CanvasTexture(metalCanvas)),
        aoMap: configureLinearDataTexture(new THREE.CanvasTexture(aoCanvas)),
        normalMap: createNormalMapFromHeightCanvas(heightCanvas, 3.2),
      };
    };

    const createResidentialPBRSuite = () => {
      const texScale = 1;
      const size = 512 * texScale;

      const albedoCanvas = document.createElement('canvas');
      const emissiveCanvas = document.createElement('canvas');
      const roughCanvas = document.createElement('canvas');
      const metalCanvas = document.createElement('canvas');
      const aoCanvas = document.createElement('canvas');
      const heightCanvas = document.createElement('canvas');

      [albedoCanvas, emissiveCanvas, roughCanvas, metalCanvas, aoCanvas, heightCanvas].forEach(
        (c) => {
          c.width = size;
          c.height = size;
        }
      );

      const aCtx = albedoCanvas.getContext('2d');
      const eCtx = emissiveCanvas.getContext('2d');
      const rCtx = roughCanvas.getContext('2d');
      const mCtx = metalCanvas.getContext('2d');
      const aoCtx = aoCanvas.getContext('2d');
      const hCtx = heightCanvas.getContext('2d');

      if (aCtx && eCtx && rCtx && mCtx && aoCtx && hCtx) {
        [aCtx, eCtx, rCtx, mCtx, aoCtx, hCtx].forEach((ctx) =>
          ctx.scale(texScale, texScale)
        );

        // Dressed architectural stone & precast concrete base
        aCtx.fillStyle = '#2b3446';
        aCtx.fillRect(0, 0, 512, 512);
        eCtx.fillStyle = '#000000';
        eCtx.fillRect(0, 0, 512, 512);
        rCtx.fillStyle = '#b8b8b8'; // Stone roughness ~ 0.72
        rCtx.fillRect(0, 0, 512, 512);
        mCtx.fillStyle = '#141414'; // Non-metallic masonry
        mCtx.fillRect(0, 0, 512, 512);
        aoCtx.fillStyle = '#f0f0f0';
        aoCtx.fillRect(0, 0, 512, 512);
        hCtx.fillStyle = '#c8c8c8';
        hCtx.fillRect(0, 0, 512, 512);

        // Chiseled horizontal stone masonry mortar joints
        for (let y = 0; y < 512; y += 32) {
          aCtx.fillStyle = '#1b2230';
          aCtx.fillRect(0, y, 512, 3);
          aoCtx.fillStyle = '#787878';
          aoCtx.fillRect(0, y, 512, 3);
          hCtx.fillStyle = '#555555';
          hCtx.fillRect(0, y, 512, 3);
        }

        // Raised architectural limestone/concrete cornice bands
        [
          [24, 14],
          [250, 10],
        ].forEach(([cy, ch]) => {
          aCtx.fillStyle = '#475569';
          aCtx.fillRect(0, cy, 512, ch);
          rCtx.fillStyle = '#787878';
          rCtx.fillRect(0, cy, 512, ch);
          mCtx.fillStyle = '#242424';
          mCtx.fillRect(0, cy, 512, ch);
          hCtx.fillStyle = '#ffffff';
          hCtx.fillRect(0, cy, 512, ch);
        });

        const cols = 4;
        const rows = 3;
        const cw = 512 / cols;
        const ch = 460 / rows;
        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < cols; c++) {
            const wx = c * cw + 22;
            const wy = 48 + r * ch + 18;
            const ww = cw - 44;
            const wh = ch - 38;

            // Recessed window cavity AO & brushed steel frame
            aoCtx.fillStyle = '#484848';
            aoCtx.fillRect(wx - 6, wy - 6, ww + 12, wh + 12);

            aCtx.fillStyle = '#334155';
            aCtx.fillRect(wx - 5, wy - 5, ww + 10, wh + 10);
            mCtx.fillStyle = '#b0b0b0';
            aCtx.fillRect(wx - 5, wy - 5, ww + 10, wh + 10);
            hCtx.fillStyle = '#f0f0f0';
            hCtx.fillRect(wx - 5, wy - 5, ww + 10, wh + 10);

            const isWarmLit = (r * 5 + c * 3) % 3 === 0;
            const wg = aCtx.createLinearGradient(wx, wy, wx, wy + wh);
            if (isWarmLit) {
              wg.addColorStop(0, '#fef9c3');
              wg.addColorStop(0.6, '#fde68a');
              wg.addColorStop(1, '#64748b');
              aCtx.fillStyle = wg;
              aCtx.fillRect(wx, wy, ww, wh);

              eCtx.fillStyle = wg;
              eCtx.fillRect(wx, wy, ww, wh);
            } else {
              wg.addColorStop(0, '#162438');
              wg.addColorStop(1, '#09101d');
              aCtx.fillStyle = wg;
              aCtx.fillRect(wx, wy, ww, wh);
            }

            rCtx.fillStyle = '#181818';
            rCtx.fillRect(wx, wy, ww, wh);
            mCtx.fillStyle = '#202020';
            mCtx.fillRect(wx, wy, ww, wh);
            hCtx.fillStyle = '#282828';
            hCtx.fillRect(wx, wy, ww, wh);

            // Muntin crossbars (non-emissive raised frame)
            aCtx.fillStyle = '#1e293b';
            aCtx.fillRect(wx + ww / 2 - 2, wy, 4, wh);
            aCtx.fillRect(wx, wy + wh / 2 - 2, ww, 4);
            eCtx.fillStyle = '#000000';
            eCtx.fillRect(wx + ww / 2 - 2, wy, 4, wh);
            eCtx.fillRect(wx, wy + wh / 2 - 2, ww, 4);
            hCtx.fillStyle = '#d0d0d0';
            hCtx.fillRect(wx + ww / 2 - 2, wy, 4, wh);
            hCtx.fillRect(wx, wy + wh / 2 - 2, ww, 4);

            // Protruding stone window sill
            aCtx.fillStyle = '#64748b';
            aCtx.fillRect(wx - 8, wy + wh + 2, ww + 16, 6);
            hCtx.fillStyle = '#ffffff';
            hCtx.fillRect(wx - 8, wy + wh + 2, ww + 16, 6);
          }
        }
      }

      return {
        map: configureHighQualityTexture(new THREE.CanvasTexture(albedoCanvas)),
        emissiveMap: configureHighQualityTexture(new THREE.CanvasTexture(emissiveCanvas)),
        roughnessMap: configureLinearDataTexture(new THREE.CanvasTexture(roughCanvas)),
        metalnessMap: configureLinearDataTexture(new THREE.CanvasTexture(metalCanvas)),
        aoMap: configureLinearDataTexture(new THREE.CanvasTexture(aoCanvas)),
        normalMap: createNormalMapFromHeightCanvas(heightCanvas, 2.8),
      };
    };

    // Shared Brushed Metal, Architectural Concrete/Stone & Natural Wood Grain PBR Maps
    const createBrushedMetalPBRMaps = () => {
      const hCanvas = document.createElement('canvas');
      hCanvas.width = 256;
      hCanvas.height = 256;
      const ctx = hCanvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#808080';
        ctx.fillRect(0, 0, 256, 256);
        for (let y = 0; y < 256; y += 2) {
          const v = 105 + ((y * 29) % 45);
          ctx.fillStyle = `rgb(${v},${v},${v})`;
          ctx.fillRect(0, y, 256, 1);
        }
        // Subtle panel seam bevels
        ctx.strokeStyle = '#383838';
        ctx.lineWidth = 3;
        ctx.strokeRect(2, 2, 252, 252);
        ctx.beginPath();
        ctx.moveTo(128, 0);
        ctx.lineTo(128, 256);
        ctx.moveTo(0, 128);
        ctx.lineTo(256, 128);
        ctx.stroke();
      }
      return {
        roughnessMap: configureLinearDataTexture(new THREE.CanvasTexture(hCanvas), 3, 3),
        normalMap: createNormalMapFromHeightCanvas(hCanvas, 1.85, 3, 3),
      };
    };

    const createConcreteStonePBRMaps = () => {
      const albedoCanvas = document.createElement('canvas');
      const hCanvas = document.createElement('canvas');
      albedoCanvas.width = 256;
      albedoCanvas.height = 256;
      hCanvas.width = 256;
      hCanvas.height = 256;
      const aCtx = albedoCanvas.getContext('2d');
      const hCtx = hCanvas.getContext('2d');
      if (aCtx && hCtx) {
        aCtx.fillStyle = '#3b4254';
        aCtx.fillRect(0, 0, 256, 256);
        hCtx.fillStyle = '#969696';
        hCtx.fillRect(0, 0, 256, 256);

        // Architectural paver tile grid & micro-aggregate relief
        aCtx.strokeStyle = '#282e3d';
        aCtx.lineWidth = 2;
        hCtx.strokeStyle = '#404040';
        hCtx.lineWidth = 2;
        for (let i = 0; i < 256; i += 32) {
          aCtx.beginPath();
          aCtx.moveTo(i, 0);
          aCtx.lineTo(i, 256);
          aCtx.moveTo(0, i);
          aCtx.lineTo(256, i);
          aCtx.stroke();

          hCtx.beginPath();
          hCtx.moveTo(i, 0);
          hCtx.lineTo(i, 256);
          hCtx.moveTo(0, i);
          hCtx.lineTo(256, i);
          hCtx.stroke();
        }
        for (let i = 0; i < 220; i++) {
          const gx = (i * 53) % 256;
          const gy = (i * 89) % 256;
          const shade = i % 2 === 0 ? 180 : 110;
          hCtx.fillStyle = `rgb(${shade},${shade},${shade})`;
          hCtx.fillRect(gx, gy, 2, 2);
          aCtx.fillStyle = i % 2 === 0 ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.06)';
          aCtx.fillRect(gx, gy, 2, 2);
        }
      }
      return {
        map: configureHighQualityTexture(new THREE.CanvasTexture(albedoCanvas), 4, 4),
        roughnessMap: configureLinearDataTexture(new THREE.CanvasTexture(hCanvas), 4, 4),
        normalMap: createNormalMapFromHeightCanvas(hCanvas, 2.2, 4, 4),
      };
    };

    const createWoodGrainPBRMaps = () => {
      const aCanvas = document.createElement('canvas');
      const hCanvas = document.createElement('canvas');
      aCanvas.width = 256;
      aCanvas.height = 256;
      hCanvas.width = 256;
      hCanvas.height = 256;
      const aCtx = aCanvas.getContext('2d');
      const hCtx = hCanvas.getContext('2d');
      if (aCtx && hCtx) {
        aCtx.fillStyle = '#854d27';
        aCtx.fillRect(0, 0, 256, 256);
        hCtx.fillStyle = '#909090';
        hCtx.fillRect(0, 0, 256, 256);
        for (let x = 0; x < 256; x += 4) {
          const isSeam = x % 32 === 0;
          aCtx.fillStyle = isSeam ? '#45220d' : x % 8 === 0 ? '#733e1d' : '#935830';
          aCtx.fillRect(x, 0, isSeam ? 2 : 3, 256);
          hCtx.fillStyle = isSeam ? '#303030' : x % 8 === 0 ? '#787878' : '#b8b8b8';
          hCtx.fillRect(x, 0, isSeam ? 2 : 3, 256);
        }
      }
      return {
        map: configureHighQualityTexture(new THREE.CanvasTexture(aCanvas), 2, 2),
        normalMap: createNormalMapFromHeightCanvas(hCanvas, 2.0, 2, 2),
      };
    };

    const skyscraperPBR = createSkyscraperPBRSuite(8, 12);
    const residentialPBR = createResidentialPBRSuite();
    const brushedMetalPBR = createBrushedMetalPBRMaps();
    const concreteStonePBR = createConcreteStonePBRMaps();
    const woodGrainPBR = createWoodGrainPBRMaps();

    const skyscraperFacadeTex = skyscraperPBR.map;
    const residentialFacadeTex = residentialPBR.map;

    // =========================================================================
    // SHARED PHYSICALLY BASED (PBR) MATERIALS PALETTE (Optimized MeshStandardMaterial)
    // =========================================================================
    const darkGraphiteMat = new THREE.MeshStandardMaterial({
      color: 0x1e2536,
      roughness: 0.34,
      roughnessMap: brushedMetalPBR.roughnessMap,
      metalness: 0.72,
      normalMap: brushedMetalPBR.normalMap,
      normalScale: new THREE.Vector2(0.35, 0.35),
      envMapIntensity: 1.35,
    });
    const obsidianMat = new THREE.MeshStandardMaterial({
      color: 0x101522,
      roughness: 0.18,
      roughnessMap: brushedMetalPBR.roughnessMap,
      metalness: 0.85,
      normalMap: brushedMetalPBR.normalMap,
      normalScale: new THREE.Vector2(0.28, 0.28),
      envMapIntensity: 1.45,
    });
    const skyscraperWallMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      map: skyscraperPBR.map,
      emissive: new THREE.Color(0x93c5fd),
      emissiveMap: skyscraperPBR.emissiveMap,
      emissiveIntensity: 0.24,
      roughness: 0.12,
      roughnessMap: skyscraperPBR.roughnessMap,
      metalness: 0.78,
      metalnessMap: skyscraperPBR.metalnessMap,
      aoMap: skyscraperPBR.aoMap,
      aoMapIntensity: 0.85,
      normalMap: skyscraperPBR.normalMap,
      normalScale: new THREE.Vector2(0.45, 0.45),
      envMapIntensity: 1.85,
    });
    const residentialWallMat = new THREE.MeshStandardMaterial({
      map: residentialPBR.map,
      emissive: new THREE.Color(0xfef3c7),
      emissiveMap: residentialPBR.emissiveMap,
      emissiveIntensity: 0.42,
      roughness: 0.86,
      roughnessMap: residentialPBR.roughnessMap,
      metalness: 0.55,
      metalnessMap: residentialPBR.metalnessMap,
      aoMap: residentialPBR.aoMap,
      aoMapIntensity: 0.8,
      normalMap: residentialPBR.normalMap,
      normalScale: new THREE.Vector2(0.6, 0.6),
      envMapIntensity: 1.25,
    });
    const goldMetalMat = new THREE.MeshStandardMaterial({
      color: 0xfbbf24,
      roughness: 0.2,
      roughnessMap: brushedMetalPBR.roughnessMap,
      metalness: 0.92,
      normalMap: brushedMetalPBR.normalMap,
      normalScale: new THREE.Vector2(0.22, 0.22),
      emissive: 0x92400e,
      emissiveIntensity: 0.18,
      envMapIntensity: 1.55,
    });
    const brightGoldMat = new THREE.MeshStandardMaterial({
      color: 0xfde047,
      roughness: 0.14,
      roughnessMap: brushedMetalPBR.roughnessMap,
      metalness: 0.96,
      normalMap: brushedMetalPBR.normalMap,
      normalScale: new THREE.Vector2(0.16, 0.16),
      emissive: 0xd97706,
      emissiveIntensity: 0.32,
      envMapIntensity: 1.75,
    });
    const windowGlowMat = new THREE.MeshStandardMaterial({
      color: 0xfef3c7,
      emissive: 0xfbbf24,
      emissiveIntensity: 1.35,
      roughness: 0.08,
      metalness: 0.1,
    });
    const cyanEnergyMat = new THREE.MeshStandardMaterial({
      color: 0xbae6fd,
      emissive: 0x0ea5e9,
      emissiveIntensity: 2.25,
      roughness: 0.08,
      metalness: 0.2,
      transparent: true,
      opacity: 0.94,
    });
    const amberCrystalMat = new THREE.MeshStandardMaterial({
      color: 0xfef08a,
      emissive: 0xf97316,
      emissiveIntensity: 2.35,
      roughness: 0.1,
      metalness: 0.25,
      envMapIntensity: 1.6,
    });
    const cliffRockMat = new THREE.MeshStandardMaterial({
      color: 0x333a48,
      roughness: 0.84,
      roughnessMap: concreteStonePBR.roughnessMap,
      metalness: 0.12,
      normalMap: concreteStonePBR.normalMap,
      normalScale: new THREE.Vector2(0.75, 0.75),
    });
    const cliffHighlightRockMat = new THREE.MeshStandardMaterial({
      color: 0x475063,
      roughness: 0.78,
      roughnessMap: concreteStonePBR.roughnessMap,
      metalness: 0.14,
      normalMap: concreteStonePBR.normalMap,
      normalScale: new THREE.Vector2(0.65, 0.65),
    });
    const grassTerrainMat = new THREE.MeshStandardMaterial({
      color: 0x2d5a34,
      roughness: 0.82,
      roughnessMap: concreteStonePBR.roughnessMap,
      metalness: 0.04,
      normalMap: concreteStonePBR.normalMap,
      normalScale: new THREE.Vector2(0.25, 0.25),
    });
    const lushParkGrassMat = new THREE.MeshStandardMaterial({
      color: 0x3b7a42,
      roughness: 0.74,
      roughnessMap: concreteStonePBR.roughnessMap,
      metalness: 0.04,
      normalMap: concreteStonePBR.normalMap,
      normalScale: new THREE.Vector2(0.22, 0.22),
    });
    const roadAsphaltMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.42,
      metalness: 0.18,
      envMapIntensity: 1.35,
    });
    const sidewalkMat = new THREE.MeshStandardMaterial({
      color: 0x94a3b8,
      map: concreteStonePBR.map,
      roughness: 0.68,
      roughnessMap: concreteStonePBR.roughnessMap,
      metalness: 0.16,
      normalMap: concreteStonePBR.normalMap,
      normalScale: new THREE.Vector2(0.45, 0.45),
    });
    const pineFoliageMat = new THREE.MeshStandardMaterial({
      color: 0x2f6831,
      roughness: 0.68,
      metalness: 0.04,
      normalMap: concreteStonePBR.normalMap,
      normalScale: new THREE.Vector2(0.3, 0.3),
    });
    const goldenPineFoliageMat = new THREE.MeshStandardMaterial({
      color: 0x4c7c2f,
      roughness: 0.64,
      metalness: 0.05,
      normalMap: concreteStonePBR.normalMap,
      normalScale: new THREE.Vector2(0.3, 0.3),
    });
    const woodMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: woodGrainPBR.map,
      roughness: 0.68,
      metalness: 0.06,
      normalMap: woodGrainPBR.normalMap,
      normalScale: new THREE.Vector2(0.48, 0.48),
    });
    const slateRoofMat = new THREE.MeshStandardMaterial({
      color: 0x242c3d,
      roughness: 0.38,
      roughnessMap: brushedMetalPBR.roughnessMap,
      metalness: 0.56,
      normalMap: brushedMetalPBR.normalMap,
      normalScale: new THREE.Vector2(0.4, 0.4),
    });
    const redStripeMat = new THREE.MeshStandardMaterial({
      color: 0xdc2626,
      roughness: 0.38,
      normalMap: concreteStonePBR.normalMap,
      normalScale: new THREE.Vector2(0.25, 0.25),
    });

    // =========================================================================
    // CINEMATIC LIGHTING SYSTEM (Golden Metropolis + Crisp Shadow Frustum)
    // =========================================================================
    const hemiLight = new THREE.HemisphereLight(0xffedd5, 0x1e293b, 1.38);
    scene.add(hemiLight);

    const sunLight = new THREE.DirectionalLight(0xffedd5, 2.65);
    sunLight.position.set(16, 26, 15);
    sunLight.target.position.set(0, 0, -1.2);
    scene.add(sunLight.target);
    if (!isSoftwareGl && qualityTier !== 'low') {
      sunLight.castShadow = true;
      const shadowRes = 1024;
      sunLight.shadow.mapSize.width = shadowRes;
      sunLight.shadow.mapSize.height = shadowRes;
      sunLight.shadow.camera.near = 4;
      sunLight.shadow.camera.far = 62;
      // Tightened shadow frustum around the core island districts for higher texel density
      const d = 16.8;
      sunLight.shadow.camera.left = -d;
      sunLight.shadow.camera.right = d;
      sunLight.shadow.camera.top = d;
      sunLight.shadow.camera.bottom = -d;
      sunLight.shadow.bias = -0.00035;
      sunLight.shadow.normalBias = 0.018;
    }
    scene.add(sunLight);

    const rimLight = new THREE.DirectionalLight(0x93c5fd, 1.15);
    rimLight.position.set(-15, 16, -20);
    scene.add(rimLight);

    // Key Accent Point Lights (Consolidated to 2 to keep fragment shaders ultra-fast)
    const hqPointLight = new THREE.PointLight(0xfbbf24, 4.2, 26);
    hqPointLight.position.set(0, 6.4, -5.4);
    scene.add(hqPointLight);

    const labPointLight = new THREE.PointLight(0x38bdf8, 3.4, 20);
    labPointLight.position.set(-9.2, 3.2, 1.3);
    scene.add(labPointLight);

    // =========================================================================
    // 1. REALISTIC ANIMATED OCEAN, CAUSTICS, SHORELINE FOAM & WATERWAYS
    // =========================================================================
    const worldGroup = new THREE.Group();
    scene.add(worldGroup);

    const createOceanWaterPBR = () => {
      const canvas = document.createElement('canvas');
      const hCanvas = document.createElement('canvas');
      canvas.width = 512;
      canvas.height = 512;
      hCanvas.width = 512;
      hCanvas.height = 512;
      const ctx = canvas.getContext('2d');
      const hCtx = hCanvas.getContext('2d');
      if (ctx && hCtx) {
        const grad = ctx.createLinearGradient(0, 0, 512, 512);
        grad.addColorStop(0, '#04223a');
        grad.addColorStop(0.5, '#094166');
        grad.addColorStop(1, '#04223a');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 512, 512);

        hCtx.fillStyle = '#707070';
        hCtx.fillRect(0, 0, 512, 512);

        // Layered wave ripples & turquoise caustics + wave height field for normal map
        for (let i = 0; i < 110; i++) {
          const wx = (i * 73) % 512;
          const wy = (i * 47) % 512;
          const wLen = 48 + (i % 5) * 22;
          ctx.strokeStyle =
            i % 3 === 0 ? 'rgba(125, 211, 252, 0.28)' : 'rgba(56, 189, 248, 0.18)';
          ctx.lineWidth = 2 + (i % 2);
          ctx.beginPath();
          ctx.moveTo(wx, wy);
          ctx.quadraticCurveTo(wx + wLen * 0.5, wy - 7, wx + wLen, wy);
          ctx.stroke();

          hCtx.strokeStyle = i % 2 === 0 ? '#d8d8d8' : '#303030';
          hCtx.lineWidth = 4;
          hCtx.beginPath();
          hCtx.moveTo(wx, wy);
          hCtx.quadraticCurveTo(wx + wLen * 0.5, wy - 8, wx + wLen, wy);
          hCtx.stroke();
        }
      }
      return {
        map: configureHighQualityTexture(new THREE.CanvasTexture(canvas), 10, 10),
        normalMap: createNormalMapFromHeightCanvas(hCanvas, 2.4, 12, 12),
      };
    };

    const createAsphaltRoadPBR = () => {
      const canvas = document.createElement('canvas');
      const rCanvas = document.createElement('canvas');
      const hCanvas = document.createElement('canvas');
      canvas.width = 512;
      canvas.height = 512;
      rCanvas.width = 512;
      rCanvas.height = 512;
      hCanvas.width = 512;
      hCanvas.height = 512;
      const ctx = canvas.getContext('2d');
      const rCtx = rCanvas.getContext('2d');
      const hCtx = hCanvas.getContext('2d');
      if (ctx && rCtx && hCtx) {
        ctx.fillStyle = '#141822';
        ctx.fillRect(0, 0, 512, 512);
        rCtx.fillStyle = '#a8a8a8';
        rCtx.fillRect(0, 0, 512, 512);
        hCtx.fillStyle = '#888888';
        hCtx.fillRect(0, 0, 512, 512);

        // Fine macadam stone aggregate speckle
        for (let i = 0; i < 350; i++) {
          const gx = (i * 37) % 512;
          const gy = (i * 91) % 512;
          ctx.fillStyle = i % 2 === 0 ? '#1f2637' : '#0d1017';
          ctx.fillRect(gx, gy, 2, 2);
          hCtx.fillStyle = i % 2 === 0 ? '#c4c4c4' : '#4a4a4a';
          hCtx.fillRect(gx, gy, 2, 2);
        }
        // Polished smoother tire tracks in each lane (lower roughness for wet-road reflections)
        ctx.fillStyle = 'rgba(8, 10, 16, 0.35)';
        ctx.fillRect(72, 0, 104, 512);
        ctx.fillRect(336, 0, 104, 512);

        rCtx.fillStyle = '#484848';
        rCtx.fillRect(72, 0, 104, 512);
        rCtx.fillRect(336, 0, 104, 512);

        // Crisp reflective edge shoulder lines
        ctx.fillStyle = 'rgba(251, 191, 36, 0.35)';
        ctx.fillRect(14, 0, 8, 512);
        ctx.fillRect(490, 0, 8, 512);
      }
      return {
        map: configureHighQualityTexture(new THREE.CanvasTexture(canvas), 4, 4),
        roughnessMap: configureLinearDataTexture(new THREE.CanvasTexture(rCanvas), 4, 4),
        normalMap: createNormalMapFromHeightCanvas(hCanvas, 1.9, 4, 4),
      };
    };

    const oceanWaterPBR = createOceanWaterPBR();
    const oceanWaterTex = oceanWaterPBR.map;
    const oceanWaterNormalTex = oceanWaterPBR.normalMap;

    const asphaltRoadPBR = createAsphaltRoadPBR();
    const asphaltRoadTex = asphaltRoadPBR.map;
    roadAsphaltMat.map = asphaltRoadPBR.map;
    roadAsphaltMat.roughnessMap = asphaltRoadPBR.roughnessMap;
    roadAsphaltMat.normalMap = asphaltRoadPBR.normalMap;
    roadAsphaltMat.normalScale = new THREE.Vector2(0.45, 0.45);
    roadAsphaltMat.needsUpdate = true;

    const carGlassMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      roughness: 0.06,
      metalness: 0.32,
      emissive: 0x0284c7,
      emissiveIntensity: 0.24,
      envMapIntensity: 1.75,
    });

    const hqCurtainGlassMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.05,
      metalness: 0.42,
      normalMap: skyscraperPBR.normalMap,
      normalScale: new THREE.Vector2(0.25, 0.25),
      emissive: 0xd97706,
      emissiveMap: skyscraperPBR.emissiveMap,
      emissiveIntensity: 0.38,
      envMapIntensity: 2.05,
    });

    const industrialSteelMat = new THREE.MeshStandardMaterial({
      color: 0x283246,
      roughness: 0.36,
      roughnessMap: brushedMetalPBR.roughnessMap,
      metalness: 0.82,
      normalMap: brushedMetalPBR.normalMap,
      normalScale: new THREE.Vector2(0.52, 0.52),
      envMapIntensity: 1.4,
    });

    const architecturalConcreteMat = new THREE.MeshStandardMaterial({
      color: 0x475569,
      map: concreteStonePBR.map,
      roughness: 0.76,
      roughnessMap: concreteStonePBR.roughnessMap,
      metalness: 0.08,
      normalMap: concreteStonePBR.normalMap,
      normalScale: new THREE.Vector2(0.55, 0.55),
    });

    const taillightRedMat = new THREE.MeshStandardMaterial({
      color: 0xef4444,
      emissive: 0xdc2626,
      emissiveIntensity: 1.8,
    });

    const navGreenMat = new THREE.MeshStandardMaterial({
      color: 0x22c55e,
      emissive: 0x16a34a,
      emissiveIntensity: 2.2,
    });

    const buildingAssets = new BuildingAssetsRegistry(qualityTier);
    const metroMaterials: MetropolitanMaterialPalette = {
      architecturalConcreteMat,
      industrialSteelMat,
      darkGraphiteMat,
      obsidianMat,
      skyscraperWallMat,
      residentialWallMat,
      hqCurtainGlassMat,
      carGlassMat,
      goldMetalMat,
      brightGoldMat,
      windowGlowMat,
      cyanEnergyMat,
      amberCrystalMat,
      sidewalkMat,
      roadAsphaltMat,
      lushParkGrassMat,
      grassTerrainMat,
      cliffRockMat,
      cliffHighlightRockMat,
      slateRoofMat,
      woodMat,
      pineFoliageMat,
      goldenPineFoliageMat,
      redStripeMat,
    };

    const waterGeo = new THREE.PlaneGeometry(150, 150, 20, 20);
    const waterMat = new THREE.MeshStandardMaterial({
      color: 0x0ea5e9,
      map: oceanWaterTex,
      normalMap: oceanWaterNormalTex,
      normalScale: new THREE.Vector2(0.55, 0.55),
      emissive: 0x0369a1,
      emissiveIntensity: 0.32,
      roughness: 0.08,
      metalness: 0.22,
      envMapIntensity: 1.65,
    });

    const harborLagoonMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      map: oceanWaterTex,
      normalMap: oceanWaterNormalTex,
      normalScale: new THREE.Vector2(0.45, 0.45),
      emissive: 0x0284c7,
      emissiveIntensity: 0.38,
      roughness: 0.06,
      metalness: 0.2,
      envMapIntensity: 1.7,
    });

    const createBillboardSignMat = (label: string, accentHex: string) => {
      const c = document.createElement('canvas');
      c.width = 256;
      c.height = 96;
      const ctx = c.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#070b14';
        ctx.fillRect(0, 0, 256, 96);
        ctx.strokeStyle = accentHex;
        ctx.lineWidth = 6;
        ctx.strokeRect(4, 4, 248, 88);
        ctx.fillStyle = accentHex;
        ctx.font = '900 32px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(label, 128, 50);
      }
      const tex = configureHighQualityTexture(new THREE.CanvasTexture(c));
      return new THREE.MeshStandardMaterial({
        map: tex,
        emissive: new THREE.Color(accentHex),
        emissiveMap: tex,
        emissiveIntensity: 1.75,
        roughness: 0.2,
        metalness: 0.4,
      });
    };

    const skylineBillboardMats: THREE.MeshStandardMaterial[] = [
      createBillboardSignMat('FOX COIN', '#fbbf24'),
      createBillboardSignMat('FOX DEX', '#38bdf8'),
      createBillboardSignMat('WEB3 CITY', '#f59e0b'),
      createBillboardSignMat('FOX VAULT', '#fde047'),
    ];

    const { islandFoamRing, skylineSpireCrowns } = buildMetropolitanCityWorld(
      worldGroup,
      buildingAssets,
      metroMaterials,
      waterGeo,
      waterMat,
      harborLagoonMat,
      skylineBillboardMats
    );

    const { portCraneTrolley, trafficSignals } = buildMetropolitanRoadNetwork(
      worldGroup,
      buildingAssets,
      metroMaterials,
      taillightRedMat,
      navGreenMat
    );

    // =========================================================================
    // 2B. REALISTIC VOLUMETRIC CUMULUS CLOUDS (3D Soft Billow Domes + Feathered Vapor Sprites)
    // =========================================================================
    const createVolumetricCloudPuffTexture = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 256;
      canvas.height = 256;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, 256, 256);

        // Multi-lobe soft cumulus billow puffs for natural vaporous edges
        const lobes: Array<[number, number, number, number]> = [
          [128, 136, 96, 0.72],
          [92, 128, 76, 0.58],
          [164, 130, 78, 0.58],
          [116, 98, 72, 0.65],
          [146, 102, 68, 0.60],
          [74, 148, 58, 0.45],
          [182, 148, 58, 0.45],
          [128, 152, 82, 0.52],
        ];

        lobes.forEach(([lx, ly, lr, alpha]) => {
          const g = ctx.createRadialGradient(lx, ly - lr * 0.18, lr * 0.08, lx, ly, lr);
          g.addColorStop(0, `rgba(255, 255, 255, ${alpha})`);
          g.addColorStop(0.45, `rgba(248, 250, 252, ${alpha * 0.72})`);
          g.addColorStop(0.78, `rgba(226, 232, 240, ${alpha * 0.28})`);
          g.addColorStop(1, 'rgba(226, 232, 240, 0.0)');
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.arc(lx, ly, lr, 0, Math.PI * 2);
          ctx.fill();
        });
      }
      const tex = new THREE.CanvasTexture(canvas);
      return configureHighQualityTexture(tex);
    };

    const cloudPuffTex = createVolumetricCloudPuffTexture();

    const cloudCoreMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0x38bdf8,
      emissiveIntensity: 0.08,
      roughness: 0.96,
      metalness: 0.0,
      transparent: true,
      opacity: 0.78,
      depthWrite: false,
    });

    const cloudUnderbellyMat = new THREE.MeshStandardMaterial({
      color: 0xcbd5e1,
      emissive: 0x1e293b,
      emissiveIntensity: 0.06,
      roughness: 0.98,
      metalness: 0.0,
      transparent: true,
      opacity: 0.64,
      depthWrite: false,
    });

    const cloudSpriteMat = new THREE.SpriteMaterial({
      map: cloudPuffTex,
      color: 0xffffff,
      transparent: true,
      opacity: 0.58,
      depthWrite: false,
      fog: true,
    });

    const sharedCloudSphereGeo = new THREE.SphereGeometry(1, 20, 16);
    buildingAssets.geometryCache.set('volumetric_cloud_sphere', sharedCloudSphereGeo);

    const driftingClouds: DriftingCloud[] = [];
    const cloudCount = qualityTier === 'low' ? 7 : 12;

    // Distinct multi-puff cumulus templates: [offsetX, offsetY, offsetZ, scaleX, scaleY, scaleZ, isUnderbelly]
    const cumulusPuffLayout: Array<[number, number, number, number, number, number, boolean]> = [
      [0.0, 0.18, 0.0, 1.45, 0.78, 1.12, false],
      [-1.05, 0.04, 0.14, 1.15, 0.64, 0.95, false],
      [1.08, 0.06, -0.12, 1.18, 0.66, 0.96, false],
      [-0.48, 0.42, -0.08, 1.05, 0.72, 0.92, false],
      [0.52, 0.36, 0.12, 0.98, 0.68, 0.88, false],
      [-1.78, -0.10, 0.06, 0.86, 0.48, 0.74, false],
      [1.82, -0.08, -0.05, 0.88, 0.50, 0.76, false],
      // Flattened shaded cumulus condensation base
      [-0.55, -0.16, 0.05, 1.35, 0.36, 1.02, true],
      [0.55, -0.16, -0.05, 1.35, 0.36, 1.02, true],
    ];

    for (let c = 0; c < cloudCount; c++) {
      const cGroup = new THREE.Group();
      const cloudScale = 0.88 + (c % 4) * 0.16;
      const mirrorX = c % 2 === 0 ? 1 : -1;

      cumulusPuffLayout.forEach(([px, py, pz, sx, sy, sz, isUnderbelly], pIdx) => {
        const puff = new THREE.Mesh(
          sharedCloudSphereGeo,
          isUnderbelly ? cloudUnderbellyMat : cloudCoreMat
        );
        puff.position.set(px * mirrorX * cloudScale, py * cloudScale, pz * cloudScale);
        puff.scale.set(sx * cloudScale, sy * cloudScale, sz * cloudScale);
        puff.renderOrder = isUnderbelly ? 1 : 2;
        cGroup.add(puff);

        // Envelope each main dome with a soft feathered volumetric vapor sprite
        if (!isUnderbelly && (qualityTier !== 'low' || pIdx % 2 === 0)) {
          const vaporSprite = new THREE.Sprite(cloudSpriteMat);
          vaporSprite.position.set(
            px * mirrorX * cloudScale * 1.04,
            (py + 0.04) * cloudScale,
            pz * cloudScale * 1.04
          );
          const spriteSize = Math.max(sx, sz) * cloudScale * 2.55;
          vaporSprite.scale.set(spriteSize * 1.25, spriteSize * 0.82, 1);
          vaporSprite.renderOrder = 3;
          cGroup.add(vaporSprite);
        }
      });

      const angle = (c / cloudCount) * Math.PI * 2 + (c % 2) * 0.14;
      // High-altitude placement well above the tallest skyscrapers (Y = 15.2 to 19.4, Radius = 29 to 39)
      const radius = 29.0 + (c % 3) * 4.6;
      const baseY = 15.2 + (c % 4) * 1.35;
      cGroup.position.set(Math.cos(angle) * radius, baseY, Math.sin(angle) * radius - 2.5);
      cGroup.rotation.y = -angle + Math.PI / 2;
      worldGroup.add(cGroup);

      driftingClouds.push({
        group: cGroup,
        angle,
        radius,
        speed: 0.016 + (c % 3) * 0.005,
        baseY,
        phase: c * 1.15,
      });
    }

    // =========================================================================
    // 3. REALISTIC ARCHITECTURAL DISTRICT BUILDINGS & RAYCASTING TARGETS
    // =========================================================================
    const pickableMeshes: THREE.Object3D[] = [];
    const buildingGroups: Record<FoxCityBuildingId, THREE.Group> = {} as any;
    const hitColliderMat = new THREE.MeshBasicMaterial({
      color: 0xf59e0b,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });

    const resolveBuildingIdFromObject = (
      obj: THREE.Object3D | null
    ): FoxCityBuildingId | null => {
      let curr: THREE.Object3D | null = obj;
      while (curr) {
        if (curr.userData && curr.userData.buildingId) {
          return curr.userData.buildingId as FoxCityBuildingId;
        }
        curr = curr.parent;
      }
      return null;
    };

    const registerBuildingGroup = (id: FoxCityBuildingId, group: THREE.Group) => {
      group.userData.buildingId = id;
      group.updateMatrixWorld(true);

      const bbox = new THREE.Box3().setFromObject(group);
      const size = new THREE.Vector3();
      const center = new THREE.Vector3();
      bbox.getSize(size);
      bbox.getCenter(center);
      group.worldToLocal(center);

      const hitProxy = new THREE.Mesh(
        new THREE.BoxGeometry(
          Math.max(2.3, size.x + 0.45),
          Math.max(1.9, size.y + 0.45),
          Math.max(2.3, size.z + 0.45)
        ),
        hitColliderMat
      );
      hitProxy.position.copy(center);
      hitProxy.name = `building_hitbox_${id}`;
      hitProxy.userData.buildingId = id;
      hitProxy.userData.isHitProxy = true;
      group.add(hitProxy);
      pickableMeshes.push(hitProxy);

      group.traverse((child) => {
        child.userData.buildingId = id;
      });
      buildingGroups[id] = group;
      worldGroup.add(group);
    };

    // High-Resolution Procedural Architectural Signage Textures
    const createFoxLogoSignTexture = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 512;
      canvas.height = 512;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        // Deep architectural obsidian-slate background
        const bgGrad = ctx.createRadialGradient(256, 230, 30, 256, 256, 260);
        bgGrad.addColorStop(0, '#161f33');
        bgGrad.addColorStop(1, '#070a12');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, 512, 512);

        // Sleek chamfered octagonal metallic gold architectural bezel
        ctx.strokeStyle = '#fbbf24';
        ctx.lineWidth = 10;
        ctx.beginPath();
        ctx.moveTo(148, 24);
        ctx.lineTo(364, 24);
        ctx.lineTo(488, 148);
        ctx.lineTo(488, 364);
        ctx.lineTo(364, 488);
        ctx.lineTo(148, 488);
        ctx.lineTo(24, 364);
        ctx.lineTo(24, 148);
        ctx.closePath();
        ctx.stroke();

        ctx.save();
        ctx.shadowColor = '#f59e0b';
        ctx.shadowBlur = 22;
        ctx.strokeStyle = '#fde68a';
        ctx.lineWidth = 9;
        ctx.lineJoin = 'miter';

        // Precision Geometric Faceted FOX Crest Outline (no cartoon circles)
        ctx.beginPath();
        ctx.moveTo(150, 188);
        ctx.lineTo(132, 76);
        ctx.lineTo(212, 138);
        ctx.lineTo(300, 138);
        ctx.lineTo(380, 76);
        ctx.lineTo(362, 188);
        ctx.lineTo(400, 244);
        ctx.lineTo(256, 342);
        ctx.lineTo(112, 244);
        ctx.closePath();
        ctx.stroke();

        // Faceted inner geometric chevron lines
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.moveTo(212, 138);
        ctx.lineTo(256, 232);
        ctx.lineTo(300, 138);
        ctx.moveTo(150, 188);
        ctx.lineTo(256, 342);
        ctx.lineTo(362, 188);
        ctx.stroke();

        // Sharp angular geometric visor eyes
        ctx.fillStyle = '#fef08a';
        ctx.beginPath();
        ctx.moveTo(176, 214);
        ctx.lineTo(226, 228);
        ctx.lineTo(192, 238);
        ctx.closePath();
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(336, 214);
        ctx.lineTo(286, 228);
        ctx.lineTo(320, 238);
        ctx.closePath();
        ctx.fill();

        // Architectural corporate wordmark "FOX"
        ctx.font = '800 92px Inter, system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#fef3c7';
        ctx.shadowColor = '#f59e0b';
        ctx.shadowBlur = 24;
        ctx.fillText('F O X', 256, 418);
        ctx.restore();
      }
      const tex = new THREE.CanvasTexture(canvas);
      return configureHighQualityTexture(tex);
    };

    const createStripedAwningTexture = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 256;
      canvas.height = 128;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const stripeCount = 10;
        const sw = canvas.width / stripeCount;
        for (let i = 0; i < stripeCount; i++) {
          ctx.fillStyle = i % 2 === 0 ? '#dc2626' : '#fffbeb';
          ctx.fillRect(i * sw, 0, sw, canvas.height);
        }
        ctx.fillStyle = '#fbbf24';
        ctx.fillRect(0, canvas.height - 16, canvas.width, 16);
      }
      const tex = new THREE.CanvasTexture(canvas);
      return configureHighQualityTexture(tex);
    };

    const createMarketSignTexture = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 512;
      canvas.height = 128;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#14100b';
        ctx.fillRect(0, 0, 512, 128);
        ctx.strokeStyle = '#fbbf24';
        ctx.lineWidth = 12;
        ctx.strokeRect(8, 8, 496, 112);
        ctx.font = '900 72px Inter, system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowColor = '#f97316';
        ctx.shadowBlur = 24;
        ctx.fillStyle = '#fef08a';
        ctx.fillText('MARKET', 256, 66);
      }
      const tex = new THREE.CanvasTexture(canvas);
      return configureHighQualityTexture(tex);
    };

    const foxLogoTex = createFoxLogoSignTexture();
    const foxLogoMat = new THREE.MeshStandardMaterial({
      map: foxLogoTex,
      emissive: new THREE.Color(0xf59e0b),
      emissiveMap: foxLogoTex,
      emissiveIntensity: 1.55,
      roughness: 0.16,
      metalness: 0.35,
      normalMap: brushedMetalPBR.normalMap,
      normalScale: new THREE.Vector2(0.18, 0.18),
    });

    const stripedAwningMat = new THREE.MeshStandardMaterial({
      map: createStripedAwningTexture(),
      roughness: 0.58,
      metalness: 0.05,
      normalMap: brushedMetalPBR.normalMap,
      normalScale: new THREE.Vector2(0.35, 0.35),
    });

    const marketSignTex = createMarketSignTexture();
    const marketSignMat = new THREE.MeshStandardMaterial({
      map: marketSignTex,
      emissive: new THREE.Color(0xf59e0b),
      emissiveMap: marketSignTex,
      emissiveIntensity: 1.65,
      roughness: 0.16,
      metalness: 0.3,
    });

    // =========================================================================
    // PHASE 3: CENTRALIZED 3D ARCHITECTURAL ASSET REGISTRY, SHARED BEVELED /
    // EXTRUDED GEOMETRY CACHE, GLTF/DRACO LOADER & LEVEL PROGRESSION SYSTEM
    // =========================================================================
    const sharedGeometryCache = new Map<string, THREE.BufferGeometry>();
    const gltfModelCache = new Map<FoxCityBuildingId, THREE.Group>();

    const getBeveledBox = (
      w: number,
      h: number,
      d: number,
      bevelRadius = 0.045,
      segments = qualityTier === 'low' ? 1 : 2
    ): THREE.BufferGeometry => {
      const safeRadius = Math.min(bevelRadius, w * 0.22, h * 0.22, d * 0.22);
      const key = `rbox_${w.toFixed(3)}_${h.toFixed(3)}_${d.toFixed(3)}_${safeRadius.toFixed(3)}_${segments}`;
      let geo = sharedGeometryCache.get(key);
      if (!geo) {
        geo = new RoundedBoxGeometry(w, h, d, segments, safeRadius);
        sharedGeometryCache.set(key, geo);
      }
      return geo;
    };

    const getExtrudedOctagonTier = (
      radius: number,
      height: number,
      bevelSize = 0.04
    ): THREE.BufferGeometry => {
      const key = `oct_${radius.toFixed(3)}_${height.toFixed(3)}_${bevelSize.toFixed(3)}`;
      let geo = sharedGeometryCache.get(key);
      if (!geo) {
        const shape = new THREE.Shape();
        const sides = 8;
        for (let i = 0; i < sides; i++) {
          const a = (i / sides) * Math.PI * 2 + Math.PI / 8;
          const px = Math.cos(a) * radius;
          const py = Math.sin(a) * radius;
          if (i === 0) shape.moveTo(px, py);
          else shape.lineTo(px, py);
        }
        shape.closePath();
        geo = new THREE.ExtrudeGeometry(shape, {
          depth: Math.max(0.05, height - bevelSize * 2),
          bevelEnabled: true,
          bevelSegments: qualityTier === 'low' ? 1 : 2,
          steps: 1,
          bevelSize,
          bevelThickness: bevelSize,
        });
        geo.rotateX(-Math.PI / 2);
        geo.computeVertexNormals();
        sharedGeometryCache.set(key, geo);
      }
      return geo;
    };

    const getExtrudedPortalArch = (
      outerW: number,
      outerH: number,
      innerW: number,
      innerH: number,
      depth: number
    ): THREE.BufferGeometry => {
      const key = `arch_${outerW}_${outerH}_${innerW}_${innerH}_${depth}`;
      let geo = sharedGeometryCache.get(key);
      if (!geo) {
        const shape = new THREE.Shape();
        shape.moveTo(-outerW / 2, 0);
        shape.lineTo(outerW / 2, 0);
        shape.lineTo(outerW / 2, outerH);
        shape.lineTo(-outerW / 2, outerH);
        shape.closePath();

        const hole = new THREE.Path();
        const archR = innerW / 2;
        const straightH = Math.max(0.15, innerH - archR);
        hole.moveTo(-innerW / 2, 0);
        hole.lineTo(innerW / 2, 0);
        hole.lineTo(innerW / 2, straightH);
        hole.absarc(0, straightH, archR, 0, Math.PI, false);
        hole.lineTo(-innerW / 2, 0);
        shape.holes.push(hole);

        geo = new THREE.ExtrudeGeometry(shape, {
          depth,
          bevelEnabled: true,
          bevelSegments: 2,
          steps: 1,
          bevelSize: 0.03,
          bevelThickness: 0.03,
        });
        geo.translate(0, 0, -depth / 2);
        geo.computeVertexNormals();
        sharedGeometryCache.set(key, geo);
      }
      return geo;
    };

    // Centralized Building Asset Registry (Maps all 8 FoxCityBuildingIds to optional GLB URLs + Procedural Builders)
    interface BuildingLevelVisualTiers {
      level2Group: THREE.Group;
      level3Group: THREE.Group;
      level4PlusGroup: THREE.Group;
      lodDetailGroup: THREE.Group;
    }

    const buildingLevelVisuals: Partial<Record<FoxCityBuildingId, BuildingLevelVisualTiers>> = {};

    const createBuildingLevelTiers = (parentGroup: THREE.Group): BuildingLevelVisualTiers => {
      const level2Group = new THREE.Group();
      level2Group.name = 'level_2_details';
      const level3Group = new THREE.Group();
      level3Group.name = 'level_3_details';
      const level4PlusGroup = new THREE.Group();
      level4PlusGroup.name = 'level_4_plus_details';
      const lodDetailGroup = new THREE.Group();
      lodDetailGroup.name = 'lod_fine_details';
      parentGroup.add(level2Group, level3Group, level4PlusGroup, lodDetailGroup);
      return { level2Group, level3Group, level4PlusGroup, lodDetailGroup };
    };

    // GLTF + Optional Draco Loader with Caching, Progress & Graceful Procedural Fallback
    const loadingManager = new THREE.LoadingManager();
    const dracoLoader = new DRACOLoader(loadingManager);
    dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');
    const gltfLoader = new GLTFLoader(loadingManager);
    gltfLoader.setDRACOLoader(dracoLoader);

    const BUILDING_GLB_ASSET_REGISTRY: Record<
      FoxCityBuildingId,
      { id: FoxCityBuildingId; optionalGlbUrl?: string; targetScale: number }
    > = {
      headquarters: { id: 'headquarters', targetScale: 1.0 },
      mine: { id: 'mine', targetScale: 1.0 },
      factory: { id: 'factory', targetScale: 1.0 },
      research: { id: 'research', targetScale: 1.0 },
      marketplace: { id: 'marketplace', targetScale: 1.0 },
      residential: { id: 'residential', targetScale: 1.0 },
      power: { id: 'power', targetScale: 1.0 },
      helipad: { id: 'helipad', targetScale: 1.0 },
    };

    const loadOptionalBuildingGlb = (
      id: FoxCityBuildingId,
      targetGroup: THREE.Group,
      proceduralCoreGroup: THREE.Group
    ) => {
      const entry = BUILDING_GLB_ASSET_REGISTRY[id];
      if (!entry?.optionalGlbUrl) return; // Uses high-detail modular procedural architecture with zero 404s
      if (gltfModelCache.has(id)) {
        const cachedClone = gltfModelCache.get(id)!.clone(true);
        proceduralCoreGroup.visible = false;
        targetGroup.add(cachedClone);
        return;
      }
      gltfLoader.load(
        entry.optionalGlbUrl,
        (gltf) => {
          const model = gltf.scene;
          model.scale.setScalar(entry.targetScale);
          model.traverse((child) => {
            const m = child as THREE.Mesh;
            if (m.isMesh) {
              m.castShadow = true;
              m.receiveShadow = true;
              m.userData.buildingId = id;
              pickableMeshes.push(m);
            }
          });
          gltfModelCache.set(id, model.clone(true));
          proceduralCoreGroup.visible = false;
          targetGroup.add(model);
        },
        undefined,
        () => {
          // Gracefully keep high-detail modular procedural architecture active on error
          proceduralCoreGroup.visible = true;
        }
      );
    };

    // Helper: Create Sky-Garden Planter Box with Lush Foliage & Golden Railing
    const addSkyGardenTerrace = (
      target: THREE.Group,
      x: number,
      y: number,
      z: number,
      w: number,
      d: number
    ) => {
      const terraceSlab = new THREE.Mesh(
        getBeveledBox(w, 0.1, d, 0.025),
        goldMetalMat
      );
      terraceSlab.position.set(x, y, z);
      target.add(terraceSlab);

      const grassBed = new THREE.Mesh(
        getBeveledBox(Math.max(0.2, w - 0.14), 0.06, Math.max(0.2, d - 0.14), 0.02),
        lushParkGrassMat
      );
      grassBed.position.set(x, y + 0.06, z);
      target.add(grassBed);

      // Glass safety balustrade around terrace
      const railFront = new THREE.Mesh(
        new THREE.BoxGeometry(w - 0.04, 0.12, 0.025),
        carGlassMat
      );
      railFront.position.set(x, y + 0.1, z + d * 0.46);
      target.add(railFront);

      // Miniature manicured cypress shrubs on sky-garden
      [-w * 0.28, w * 0.28].forEach((sx) => {
        const shrub = new THREE.Mesh(
          new THREE.SphereGeometry(0.11, 8, 8),
          goldenPineFoliageMat
        );
        shrub.position.set(x + sx, y + 0.15, z);
        shrub.scale.set(1, 1.35, 1);
        target.add(shrub);
      });
    };

    // Helper: Sophisticated Frameless 3D Architectural Geometric FOX Crest
    const buildSculpted3DFoxEmblem = (scale = 1.0) => {
      const emblem = new THREE.Group();
      emblem.scale.setScalar(scale);

      // Sleek 8-Sided Obsidian Medallion Plinth (Replaces old 1.56x1.56 square yellow box)
      const octMedallion = new THREE.Mesh(
        new THREE.CylinderGeometry(0.76, 0.76, 0.08, 8),
        obsidianMat
      );
      octMedallion.rotation.x = Math.PI / 2;
      octMedallion.rotation.z = Math.PI / 8;
      emblem.add(octMedallion);

      // Precision Champagne-Gold Outer Octagonal Bezel Ring
      const goldBezelRing = new THREE.Mesh(
        new THREE.CylinderGeometry(0.81, 0.81, 0.06, 8),
        goldMetalMat
      );
      goldBezelRing.rotation.x = Math.PI / 2;
      goldBezelRing.rotation.z = Math.PI / 8;
      goldBezelRing.position.z = -0.015;
      emblem.add(goldBezelRing);

      // Subtle Backlit Amber Halo Ring behind the Obsidian Crest
      const backlitHalo = new THREE.Mesh(
        new THREE.RingGeometry(0.78, 0.86, 8),
        windowGlowMat
      );
      backlitHalo.rotation.z = Math.PI / 8;
      backlitHalo.position.z = -0.035;
      emblem.add(backlitHalo);

      // 3D Sculpted Multi-Faceted Brushed-Gold Fox Head Architectural Relief
      const browCrest = new THREE.Mesh(
        getBeveledBox(0.58, 0.14, 0.09, 0.025),
        goldMetalMat
      );
      browCrest.position.set(0, 0.18, 0.06);
      emblem.add(browCrest);

      // Left & Right Sculpted Cheek Plates
      [-1, 1].forEach((side) => {
        const cheekPlate = new THREE.Mesh(
          getBeveledBox(0.28, 0.12, 0.08, 0.02),
          goldMetalMat
        );
        cheekPlate.position.set(side * 0.2, 0.04, 0.06);
        cheekPlate.rotation.z = side * 0.42;
        emblem.add(cheekPlate);
      });

      // Tapered 4-Sided Geometric Muzzle & Bridge
      const snoutRelief = new THREE.Mesh(
        new THREE.ConeGeometry(0.24, 0.42, 4),
        brightGoldMat
      );
      snoutRelief.rotation.x = Math.PI;
      snoutRelief.rotation.y = Math.PI / 4;
      snoutRelief.position.set(0, -0.04, 0.08);
      emblem.add(snoutRelief);

      // Obsidian Nose Tip Accent
      const noseGem = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.055, 0),
        obsidianMat
      );
      noseGem.position.set(0, -0.22, 0.13);
      emblem.add(noseGem);

      // Swept Geometric Ears & Angular Illuminated Visor Eyes
      [-0.23, 0.23].forEach((ex) => {
        const earOuter = new THREE.Mesh(
          new THREE.ConeGeometry(0.14, 0.34, 4),
          goldMetalMat
        );
        earOuter.rotation.y = Math.PI / 4;
        earOuter.rotation.z = ex < 0 ? 0.18 : -0.18;
        earOuter.position.set(ex, 0.38, 0.05);
        emblem.add(earOuter);

        const earInner = new THREE.Mesh(
          new THREE.ConeGeometry(0.08, 0.22, 4),
          obsidianMat
        );
        earInner.rotation.y = Math.PI / 4;
        earInner.rotation.z = ex < 0 ? 0.18 : -0.18;
        earInner.position.set(ex, 0.36, 0.075);
        emblem.add(earInner);

        // Sleek Angled Illuminated Visor Eye Bar
        const visorEye = new THREE.Mesh(
          new THREE.BoxGeometry(0.14, 0.036, 0.04),
          amberCrystalMat
        );
        visorEye.position.set(ex * 0.68, 0.1, 0.11);
        visorEye.rotation.z = ex < 0 ? -0.22 : 0.22;
        emblem.add(visorEye);
      });

      // Lower Architectural Fascia Nameplate with "FOX" Logo Texture
      const nameplateFrame = new THREE.Mesh(
        getBeveledBox(0.86, 0.22, 0.07, 0.02),
        obsidianMat
      );
      nameplateFrame.position.set(0, -0.46, 0.05);
      emblem.add(nameplateFrame);

      const nameplateTrim = new THREE.Mesh(
        getBeveledBox(0.9, 0.25, 0.05, 0.02),
        goldMetalMat
      );
      nameplateTrim.position.set(0, -0.46, 0.035);
      emblem.add(nameplateTrim);

      return emblem;
    };

    // -------------------------------------------------------------------------
    // BUILDING 1: FOX HEADQUARTERS — REDESIGNED SUPERTALL SKYSCRAPER & CITADEL
    // (Placed on Upper Northern Terrace at Z = -7.2, well north of Upper Road at Z = -4.15)
    // -------------------------------------------------------------------------
    const landmarkBuildCtx: LandmarkBuildingsBuildContext = {
      buildingAssets,
      mats: metroMaterials,
      foxLogoMat,
      stripedAwningMat,
      marketSignMat,
      buildingLevelVisuals,
      createBuildingLevelTiers,
      getExtrudedOctagonTier,
      getExtrudedPortalArch,
      addSkyGardenTerrace,
      buildSculpted3DFoxEmblem,
      loadOptionalBuildingGlb,
      registerBuildingGroup,
      worldGroup,
    };

    const {
      hqCrystal,
      hqHaloRing,
      hqInnerRing,
      hqHoloTickerRing,
      hqElevatorPods,
      aviationBeacons,
    } = buildRedesignedHeadquarters(landmarkBuildCtx);

    // -------------------------------------------------------------------------
    // CENTRAL FOX PLAZA, FOUNTAIN, PARK BENCHES & HERO 3D FOX MASCOT ACTOR
    // (Placed safely inside the Central Park Block at (1.3, 0.05, 1.3), away from all roads)
    // -------------------------------------------------------------------------
    const plazaGroup = new THREE.Group();
    plazaGroup.position.set(1.3, 0.05, 1.3);

    const plazaPavement = new THREE.Mesh(
      new THREE.CylinderGeometry(1.45, 1.5, 0.08, 24),
      sidewalkMat
    );
    plazaPavement.position.y = 0.04;
    plazaGroup.add(plazaPavement);

    const plazaBasin = new THREE.Mesh(
      new THREE.CylinderGeometry(1.02, 1.12, 0.28, 20),
      architecturalConcreteMat
    );
    plazaBasin.position.y = 0.15;
    plazaGroup.add(plazaBasin);

    // Subtle Champagne-Gold Inner Rim Coping on the Stone Fountain Basin
    const basinGoldCoping = new THREE.Mesh(
      new THREE.TorusGeometry(0.96, 0.032, 8, 24),
      goldMetalMat
    );
    basinGoldCoping.rotation.x = Math.PI / 2;
    basinGoldCoping.position.y = 0.29;
    plazaGroup.add(basinGoldCoping);

    const fountainWater = new THREE.Mesh(
      new THREE.CylinderGeometry(0.9, 0.9, 0.3, 18),
      cyanEnergyMat
    );
    fountainWater.position.y = 0.16;
    plazaGroup.add(fountainWater);

    // Animated Sparkling Fountain Water Jets arching inside the Basin
    const fountainWaterJets: Array<{ mesh: THREE.Mesh; angle: number; phase: number }> = [];
    for (let j = 0; j < 8; j++) {
      const jetAngle = (j * Math.PI * 2) / 8;
      const jetDrop = new THREE.Mesh(
        new THREE.SphereGeometry(0.055, 6, 6),
        cyanEnergyMat
      );
      jetDrop.position.set(Math.cos(jetAngle) * 0.55, 0.42, Math.sin(jetAngle) * 0.55);
      plazaGroup.add(jetDrop);
      fountainWaterJets.push({ mesh: jetDrop, angle: jetAngle, phase: j * 0.78 });
    }

    // Realistic Timber & Cast-Iron Park Benches around the Central Park Plaza
    for (let b = 0; b < 4; b++) {
      const benchAngle = (b * Math.PI) / 2 + Math.PI / 4;
      const benchGroup = new THREE.Group();
      benchGroup.position.set(Math.cos(benchAngle) * 1.62, 0.06, Math.sin(benchAngle) * 1.62);
      benchGroup.rotation.y = -benchAngle + Math.PI / 2;
      const seat = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.05, 0.18), woodMat);
      seat.position.y = 0.12;
      const backrest = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.14, 0.04), woodMat);
      backrest.position.set(0, 0.2, -0.07);
      const armL = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.16, 0.18), darkGraphiteMat);
      armL.position.set(-0.21, 0.11, 0);
      const armR = armL.clone();
      armR.position.x = 0.21;
      benchGroup.add(seat, backrest, armL, armR);
      plazaGroup.add(benchGroup);
    }

    const fountainPedestal = new THREE.Mesh(
      new THREE.CylinderGeometry(0.28, 0.38, 0.68, 12),
      obsidianMat
    );
    fountainPedestal.position.y = 0.44;
    plazaGroup.add(fountainPedestal);

    const mascotStatue = new THREE.Group();
    mascotStatue.position.y = 0.88;
    const statueBody = new THREE.Mesh(new THREE.ConeGeometry(0.25, 0.5, 8), brightGoldMat);
    mascotStatue.add(statueBody);
    const statueHead = new THREE.Mesh(new THREE.SphereGeometry(0.21, 10, 10), brightGoldMat);
    statueHead.position.y = 0.36;
    mascotStatue.add(statueHead);
    const earL = new THREE.Mesh(new THREE.ConeGeometry(0.085, 0.22, 4), brightGoldMat);
    earL.position.set(-0.11, 0.54, 0);
    mascotStatue.add(earL);
    const earR = earL.clone();
    earR.position.x = 0.11;
    mascotStatue.add(earR);
    plazaGroup.add(mascotStatue);
    worldGroup.add(plazaGroup);

    // Shared Realistic Fox & Vehicle Materials
    const foxFurOrangeMat = new THREE.MeshStandardMaterial({
      color: 0xf97316,
      roughness: 0.38,
      metalness: 0.08,
    });
    const foxFurCreamMat = new THREE.MeshStandardMaterial({
      color: 0xfffbeb,
      roughness: 0.45,
      metalness: 0.05,
    });
    const foxInnerEarMat = new THREE.MeshStandardMaterial({
      color: 0xfda4af,
      roughness: 0.5,
    });
    const eyeDarkMat = new THREE.MeshStandardMaterial({
      color: 0x090d16,
      roughness: 0.12,
      metalness: 0.3,
    });
    const taxiYellowMat = new THREE.MeshStandardMaterial({
      color: 0xfacc15,
      roughness: 0.22,
      metalness: 0.52,
    });
    const tireRubberMat = new THREE.MeshStandardMaterial({
      color: 0x111827,
      roughness: 0.82,
      metalness: 0.12,
    });

    const buildDetailedFoxCharacter = (options: {
      scale: number;
      hasHardhat?: boolean;
      isHero?: boolean;
    }) => {
      const root = new THREE.Group();
      root.scale.setScalar(options.scale);

      const torso = new THREE.Mesh(
        new THREE.CylinderGeometry(0.12, 0.14, 0.3, 10),
        obsidianMat
      );
      torso.position.y = 0.31;
      torso.castShadow = true;
      root.add(torso);

      const chestFur = new THREE.Mesh(
        new THREE.ConeGeometry(0.08, 0.16, 6),
        foxFurCreamMat
      );
      chestFur.rotation.x = Math.PI;
      chestFur.position.set(0, 0.37, 0.09);
      root.add(chestFur);

      const belt = new THREE.Mesh(
        new THREE.CylinderGeometry(0.143, 0.143, 0.045, 10),
        brightGoldMat
      );
      belt.position.y = 0.22;
      root.add(belt);

      const shoulderTrim = new THREE.Mesh(
        new THREE.BoxGeometry(0.31, 0.06, 0.2),
        goldMetalMat
      );
      shoulderTrim.position.y = 0.42;
      root.add(shoulderTrim);

      const backpack = new THREE.Mesh(
        new THREE.BoxGeometry(0.19, 0.21, 0.11),
        darkGraphiteMat
      );
      backpack.position.set(0, 0.31, -0.14);
      root.add(backpack);
      const packCore = new THREE.Mesh(
        new THREE.CylinderGeometry(0.045, 0.045, 0.12, 8),
        amberCrystalMat
      );
      packCore.rotation.z = Math.PI / 2;
      packCore.position.set(0, 0.32, -0.2);
      root.add(packCore);

      const headGroup = new THREE.Group();
      headGroup.position.y = 0.58;

      const cranium = new THREE.Mesh(
        new THREE.SphereGeometry(0.175, 14, 12),
        foxFurOrangeMat
      );
      cranium.scale.set(1.12, 0.96, 1.02);
      cranium.castShadow = true;
      headGroup.add(cranium);

      const cheekL = new THREE.Mesh(
        new THREE.ConeGeometry(0.095, 0.16, 6),
        foxFurCreamMat
      );
      cheekL.rotation.z = Math.PI / 2.2;
      cheekL.position.set(-0.16, -0.04, 0.03);
      headGroup.add(cheekL);

      const cheekR = new THREE.Mesh(
        new THREE.ConeGeometry(0.095, 0.16, 6),
        foxFurCreamMat
      );
      cheekR.rotation.z = -Math.PI / 2.2;
      cheekR.position.set(0.16, -0.04, 0.03);
      headGroup.add(cheekR);

      const snoutBridge = new THREE.Mesh(
        new THREE.ConeGeometry(0.095, 0.2, 8),
        foxFurOrangeMat
      );
      snoutBridge.rotation.x = Math.PI / 2;
      snoutBridge.position.set(0, -0.02, 0.19);
      headGroup.add(snoutBridge);

      const snoutJaw = new THREE.Mesh(
        new THREE.ConeGeometry(0.085, 0.19, 8),
        foxFurCreamMat
      );
      snoutJaw.rotation.x = Math.PI / 2;
      snoutJaw.position.set(0, -0.05, 0.185);
      headGroup.add(snoutJaw);

      const noseTip = new THREE.Mesh(
        new THREE.SphereGeometry(0.032, 8, 8),
        eyeDarkMat
      );
      noseTip.position.set(0, -0.01, 0.29);
      headGroup.add(noseTip);

      [-0.072, 0.072].forEach((ex) => {
        const eye = new THREE.Mesh(
          new THREE.SphereGeometry(0.034, 8, 8),
          eyeDarkMat
        );
        eye.position.set(ex, 0.035, 0.155);
        headGroup.add(eye);

        const pupilGlow = new THREE.Mesh(
          new THREE.SphereGeometry(0.013, 6, 6),
          foxFurCreamMat
        );
        pupilGlow.position.set(ex + (ex < 0 ? -0.008 : 0.008), 0.048, 0.182);
        headGroup.add(pupilGlow);
      });

      [-0.115, 0.115].forEach((earX) => {
        const earPivot = new THREE.Group();
        earPivot.position.set(earX, 0.15, -0.01);
        earPivot.rotation.z = earX < 0 ? 0.22 : -0.22;

        const outerEar = new THREE.Mesh(
          new THREE.ConeGeometry(0.075, 0.21, 5),
          foxFurOrangeMat
        );
        outerEar.position.y = 0.08;
        earPivot.add(outerEar);

        const innerEar = new THREE.Mesh(
          new THREE.ConeGeometry(0.045, 0.15, 4),
          foxInnerEarMat
        );
        innerEar.position.set(0, 0.07, 0.025);
        earPivot.add(innerEar);

        headGroup.add(earPivot);
      });

      if (options.hasHardhat) {
        const helmetDome = new THREE.Mesh(
          new THREE.SphereGeometry(0.14, 10, 8, 0, Math.PI * 2, 0, Math.PI / 2),
          brightGoldMat
        );
        helmetDome.position.set(0, 0.11, 0.01);
        headGroup.add(helmetDome);
        const helmetLamp = new THREE.Mesh(
          new THREE.CylinderGeometry(0.035, 0.035, 0.04, 8),
          windowGlowMat
        );
        helmetLamp.rotation.x = Math.PI / 2;
        helmetLamp.position.set(0, 0.15, 0.14);
        headGroup.add(helmetLamp);
      } else if (options.isHero) {
        const gogglesBand = new THREE.Mesh(
          new THREE.CylinderGeometry(0.178, 0.178, 0.035, 12),
          goldMetalMat
        );
        gogglesBand.position.set(0, 0.095, 0);
        headGroup.add(gogglesBand);
      }

      root.add(headGroup);

      const createLeg = (lx: number) => {
        const legPivot = new THREE.Group();
        legPivot.position.set(lx, 0.18, 0);
        const thigh = new THREE.Mesh(
          new THREE.CylinderGeometry(0.045, 0.04, 0.14, 8),
          obsidianMat
        );
        thigh.position.y = -0.06;
        legPivot.add(thigh);
        const boot = new THREE.Mesh(
          new THREE.BoxGeometry(0.095, 0.07, 0.13),
          goldMetalMat
        );
        boot.position.set(0, -0.14, 0.02);
        legPivot.add(boot);
        root.add(legPivot);
        return legPivot;
      };
      const leftLeg = createLeg(-0.07);
      const rightLeg = createLeg(0.07);

      const createArm = (ax: number) => {
        const armPivot = new THREE.Group();
        armPivot.position.set(ax, 0.4, 0);
        const sleeve = new THREE.Mesh(
          new THREE.CylinderGeometry(0.04, 0.038, 0.15, 8),
          obsidianMat
        );
        sleeve.position.y = -0.06;
        armPivot.add(sleeve);
        const paw = new THREE.Mesh(
          new THREE.SphereGeometry(0.042, 8, 8),
          foxFurOrangeMat
        );
        paw.position.y = -0.15;
        armPivot.add(paw);
        root.add(armPivot);
        return armPivot;
      };
      const leftArm = createArm(-0.18);
      const rightArm = createArm(0.18);

      const tailPivot = new THREE.Group();
      tailPivot.position.set(0, 0.21, -0.13);
      tailPivot.rotation.x = -Math.PI / 3.2;

      const tailBase = new THREE.Mesh(
        new THREE.ConeGeometry(0.095, 0.24, 8),
        foxFurOrangeMat
      );
      tailBase.rotation.x = Math.PI;
      tailBase.position.set(0, 0.04, -0.08);
      tailPivot.add(tailBase);

      const tailMid = new THREE.Mesh(
        new THREE.SphereGeometry(0.092, 8, 8),
        foxFurOrangeMat
      );
      tailMid.position.set(0, 0.12, -0.14);
      tailPivot.add(tailMid);

      const tailWhiteTip = new THREE.Mesh(
        new THREE.ConeGeometry(0.09, 0.2, 8),
        foxFurCreamMat
      );
      tailWhiteTip.position.set(0, 0.22, -0.19);
      tailWhiteTip.rotation.x = -0.35;
      tailPivot.add(tailWhiteTip);

      root.add(tailPivot);

      return {
        root,
        headGroup,
        leftLeg,
        rightLeg,
        leftArm,
        rightArm,
        tailPivot,
      };
    };

    // Hero 3D Fox Mascot walking on the inner plaza ring (safely inside the fountain terrace, away from road traffic)
    const heroBuilt = buildDetailedFoxCharacter({ scale: 1.08, isHero: true });
    const heroMascotGroup = heroBuilt.root;
    const heroHead = heroBuilt.headGroup;
    const heroLegL = heroBuilt.leftLeg;
    const heroLegR = heroBuilt.rightLeg;
    const heroArmL = heroBuilt.leftArm;
    const heroArmR = heroBuilt.rightArm;
    const heroTail = heroBuilt.tailPivot;
    heroMascotGroup.position.set(1.3, 0.08, 1.3);

    // Golden Celebration Aura Ring under Hero Mascot (visible when tapped / interacting)
    const heroAuraRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.36, 0.032, 8, 24),
      amberCrystalMat
    );
    heroAuraRing.rotation.x = Math.PI / 2;
    heroAuraRing.position.y = 0.05;
    heroAuraRing.visible = false;
    heroMascotGroup.add(heroAuraRing);

    // Invisible Raycast Hitbox for tapping the 3D FOX Mascot directly in the plaza
    const heroHitCollider = new THREE.Mesh(
      new THREE.CylinderGeometry(0.42, 0.42, 1.05, 10),
      hitColliderMat
    );
    heroHitCollider.position.y = 0.45;
    heroHitCollider.userData.isHeroMascot = true;
    heroMascotGroup.add(heroHitCollider);
    worldGroup.add(heroMascotGroup);

    // -------------------------------------------------------------------------
    // BUILDINGS 2–8: REDESIGNED MULTI-STORY ARCHITECTURAL LANDMARK COMPLEXES
    // (Mine, Factory, Research Lab, Marketplace, Residential, Power, Helipad)
    // -------------------------------------------------------------------------
    const {
      mineCrystalClusters,
      mineOreCart,
      mineDrillWheel,
      mineLaserBeam,
      stackPositions,
      factoryGear1,
      factoryGear2,
      factoryBullionIngot,
      factoryRoboticArm,
      labCoreSphere,
      labRing1,
      labRing2,
      labSatDish,
      labQuantumPivot,
      marketHoloCoin,
      marketDeliveryDrone,
      turbineRotor,
      powerPlasmaArc,
      upgradeRigGroup,
      upgradeLowerRing,
      upgradeUpperRing,
    } = buildRemainingRedesignedLandmarks(landmarkBuildCtx, aviationBeacons);

    // =========================================================================
    // INSTANCED ORNAMENTAL GOLDEN BOLLARDS AROUND CENTRAL PLAZA & PROMENADE
    // (Mobile GPU Optimization: 24 repeated architectural posts in 1 draw call)
    // =========================================================================
    const bollardCount = 24;
    const bollardInstancedMesh = new THREE.InstancedMesh(
      new THREE.CylinderGeometry(0.038, 0.048, 0.24, 8),
      darkGraphiteMat,
      bollardCount
    );
    bollardInstancedMesh.castShadow = true;
    bollardInstancedMesh.receiveShadow = true;
    const bollardDummy = new THREE.Object3D();
    for (let i = 0; i < bollardCount; i++) {
      const a = (i / bollardCount) * Math.PI * 2;
      bollardDummy.position.set(
        1.3 + Math.cos(a) * 1.88,
        0.16,
        1.3 + Math.sin(a) * 1.88
      );
      bollardDummy.scale.setScalar(0.92 + (i % 3) * 0.08);
      bollardDummy.updateMatrix();
      bollardInstancedMesh.setMatrixAt(i, bollardDummy.matrix);
    }
    bollardInstancedMesh.instanceMatrix.needsUpdate = true;
    bollardInstancedMesh.computeBoundingSphere();
    worldGroup.add(bollardInstancedMesh);

    // REALISTIC 3D EXECUTIVE FOX HELICOPTER (Aligned with +Z as Nose Forward for smooth lookAt flight)
    const helicopterGroup = new THREE.Group();
    helicopterGroup.position.set(4.5, 4.9, -3.4);

    // 1. Streamlined Main Fuselage & Contoured Nose Cone (+Z forward)
    const heliFuselage = new THREE.Mesh(
      new THREE.SphereGeometry(0.32, 16, 14),
      obsidianMat
    );
    heliFuselage.scale.set(0.88, 0.82, 1.75);
    heliFuselage.castShadow = true;
    helicopterGroup.add(heliFuselage);

    // Golden Executive Livery Belt Stripe along Fuselage
    const heliStripe = new THREE.Mesh(
      new THREE.BoxGeometry(0.58, 0.09, 0.92),
      brightGoldMat
    );
    heliStripe.position.set(0, -0.02, 0.02);
    helicopterGroup.add(heliStripe);

    // 2. Curved Wrap-Around Tinted Glass Cockpit Canopy (+Z front)
    const heliCockpit = new THREE.Mesh(
      new THREE.SphereGeometry(0.27, 14, 12),
      carGlassMat
    );
    heliCockpit.scale.set(0.92, 0.78, 1.25);
    heliCockpit.position.set(0, 0.05, 0.24);
    helicopterGroup.add(heliCockpit);

    // Side Passenger Cabin Windows
    const sideWindows = new THREE.Mesh(
      new THREE.BoxGeometry(0.58, 0.14, 0.42),
      carGlassMat
    );
    sideWindows.position.set(0, 0.06, -0.05);
    helicopterGroup.add(sideWindows);

    // 3. Top Twin-Turbine Engine Cowling & Exhaust Housing
    const engineCowling = new THREE.Mesh(
      new THREE.CylinderGeometry(0.16, 0.2, 0.58, 12),
      darkGraphiteMat
    );
    engineCowling.rotation.x = Math.PI / 2;
    engineCowling.position.set(0, 0.24, -0.06);
    helicopterGroup.add(engineCowling);

    const exhaustNozzle = new THREE.Mesh(
      new THREE.CylinderGeometry(0.1, 0.12, 0.16, 10),
      goldMetalMat
    );
    exhaustNozzle.rotation.x = Math.PI / 2;
    exhaustNozzle.position.set(0, 0.24, -0.36);
    helicopterGroup.add(exhaustNozzle);

    // 4. Tapered Cylindrical Tail Boom (-Z rear) + Horizontal Stabilizers + Swept Tail Fin
    const heliTailBoom = new THREE.Mesh(
      new THREE.CylinderGeometry(0.055, 0.13, 1.05, 10),
      obsidianMat
    );
    heliTailBoom.rotation.x = -Math.PI / 2;
    heliTailBoom.position.set(0, 0.08, -0.82);
    helicopterGroup.add(heliTailBoom);

    const tailGoldBand = new THREE.Mesh(
      new THREE.CylinderGeometry(0.085, 0.095, 0.16, 10),
      brightGoldMat
    );
    tailGoldBand.rotation.x = -Math.PI / 2;
    tailGoldBand.position.set(0, 0.08, -0.75);
    helicopterGroup.add(tailGoldBand);

    const horizStabilizer = new THREE.Mesh(
      new THREE.BoxGeometry(0.56, 0.03, 0.14),
      goldMetalMat
    );
    horizStabilizer.position.set(0, 0.08, -1.08);
    helicopterGroup.add(horizStabilizer);

    const heliTailFin = new THREE.Mesh(
      new THREE.BoxGeometry(0.05, 0.42, 0.24),
      brightGoldMat
    );
    heliTailFin.position.set(0, 0.22, -1.28);
    heliTailFin.rotation.x = -0.25;
    helicopterGroup.add(heliTailFin);

    // 5. Spinning 4-Blade Tail Rotor on Side of Tail Fin
    const heliTailRotor = new THREE.Group();
    heliTailRotor.position.set(0.06, 0.24, -1.3);
    const tailBlade1 = new THREE.Mesh(
      new THREE.BoxGeometry(0.02, 0.42, 0.05),
      obsidianMat
    );
    const tailBlade2 = new THREE.Mesh(
      new THREE.BoxGeometry(0.02, 0.05, 0.42),
      obsidianMat
    );
    heliTailRotor.add(tailBlade1, tailBlade2);
    helicopterGroup.add(heliTailRotor);

    // 6. Realistic Tubular Landing Skids with Angled Struts & Upturned Tips
    [-0.24, 0.24].forEach((sx) => {
      const skidTube = new THREE.Mesh(
        new THREE.CylinderGeometry(0.026, 0.026, 1.08, 8),
        goldMetalMat
      );
      skidTube.rotation.x = Math.PI / 2;
      skidTube.position.set(sx, -0.32, 0.04);
      helicopterGroup.add(skidTube);

      // Front & rear support struts connecting fuselage to skids
      [-0.22, 0.22].forEach((sz) => {
        const strut = new THREE.Mesh(
          new THREE.CylinderGeometry(0.02, 0.02, 0.28, 6),
          darkGraphiteMat
        );
        strut.position.set(sx * 0.78, -0.2, sz);
        strut.rotation.z = sx < 0 ? 0.35 : -0.35;
        helicopterGroup.add(strut);
      });
    });

    // Aviation Navigation Strobe Lights (Red port, Green starboard, White nose spotlight)
    const portLight = new THREE.Mesh(
      new THREE.SphereGeometry(0.04, 8, 8),
      taillightRedMat
    );
    portLight.position.set(-0.28, -0.02, 0.12);
    helicopterGroup.add(portLight);

    const starboardLight = new THREE.Mesh(
      new THREE.SphereGeometry(0.04, 8, 8),
      navGreenMat
    );
    starboardLight.position.set(0.28, -0.02, 0.12);
    helicopterGroup.add(starboardLight);

    // 7. Realistic 4-Blade Main Rotor Mast & Hub
    const rotorMast = new THREE.Mesh(
      new THREE.CylinderGeometry(0.045, 0.055, 0.18, 10),
      goldMetalMat
    );
    rotorMast.position.set(0, 0.38, -0.02);
    helicopterGroup.add(rotorMast);

    const heliMainRotor = new THREE.Group();
    heliMainRotor.position.set(0, 0.46, -0.02);
    const rotorHub = new THREE.Mesh(
      new THREE.CylinderGeometry(0.11, 0.13, 0.06, 12),
      brightGoldMat
    );
    heliMainRotor.add(rotorHub);
    for (let rb = 0; rb < 4; rb++) {
      const bladePivot = new THREE.Group();
      bladePivot.rotation.y = (rb * Math.PI) / 2;
      const blade = new THREE.Mesh(
        new THREE.BoxGeometry(1.08, 0.02, 0.11),
        obsidianMat
      );
      blade.position.x = 0.56;
      const bladeTip = new THREE.Mesh(
        new THREE.BoxGeometry(0.16, 0.022, 0.115),
        brightGoldMat
      );
      bladeTip.position.x = 1.04;
      bladePivot.add(blade, bladeTip);
      heliMainRotor.add(bladePivot);
    }
    helicopterGroup.add(heliMainRotor);
    worldGroup.add(helicopterGroup);

    // =========================================================================
    // 4. METROPOLITAN URBAN DISTRICTS, ANNEX BLOCKS, PARKS & SELECTION RING
    // =========================================================================
    const { swayingTrees } = buildMetropolitanDistricts(
      worldGroup,
      buildingAssets,
      metroMaterials
    );

    const selectionRingGroup = new THREE.Group();
    const selRingMesh = new THREE.Mesh(
      new THREE.TorusGeometry(1.8, 0.085, 10, 36),
      amberCrystalMat
    );
    selRingMesh.rotation.x = Math.PI / 2;
    selectionRingGroup.add(selRingMesh);
    selectionRingGroup.visible = false;
    worldGroup.add(selectionRingGroup);

    // =========================================================================
    // 5. DEDICATED COLLISION-FREE LANES FOR METROPOLITAN 8-CATEGORY VEHICLE FLEET
    // =========================================================================
    const vehicleClosedLoops: ClosedLoopPath[] = createMetropolitanVehicleLoops();

    const vehicleFleetBuilder = new RealisticVehicleFleetBuilder({
      obsidianMat,
      goldMetalMat,
      brightGoldMat,
      carGlassMat,
      tireRubberMat,
      taillightRedMat,
      windowGlowMat,
    });
    const headlightBeamMat = vehicleFleetBuilder.headlightBeamMat;

    const vehicles: LaneVehicle[] = [];
    const initPos = new THREE.Vector3();
    const initLookAt = new THREE.Vector3();
    METROPOLITAN_FLEET_ASSIGNMENTS.forEach((assign, idx) => {
      // On low quality mobile tier, cap at 8 active vehicles while keeping diverse categories
      if (qualityTier === 'low' && (idx === 3 || idx === 7)) return;

      const builtVehicle = vehicleFleetBuilder.buildVehicleByCategory(
        assign.category,
        assign.variantIndex
      );

      const loop = vehicleClosedLoops[assign.loopIndex];
      const startDist = assign.startFraction * loop.totalLength;
      sampleClosedLoop(loop, startDist, initPos, initLookAt);
      builtVehicle.mesh.position.copy(initPos);
      const initDx = initLookAt.x - initPos.x;
      const initDz = initLookAt.z - initPos.z;
      if (initDx * initDx + initDz * initDz > 1e-8) {
        builtVehicle.mesh.rotation.set(0, Math.atan2(initDx, initDz), 0);
      }

      worldGroup.add(builtVehicle.mesh);

      vehicles.push({
        mesh: builtVehicle.mesh,
        bodyGroup: builtVehicle.bodyGroup,
        lodDetailGroup: builtVehicle.lodDetailGroup,
        wheels: builtVehicle.wheels,
        frontSteerPivots: builtVehicle.frontSteerPivots,
        beaconLight: builtVehicle.beaconLight,
        category: builtVehicle.category,
        loopIndex: assign.loopIndex,
        distanceOnLoop: startDist,
        baseSpeed: assign.speed,
        currentSpeed: assign.speed,
        wheelRadius: builtVehicle.wheelRadius,
        vehicleLength: builtVehicle.vehicleLength,
      });
    });

    // Traffic signals are created by buildMetropolitanRoadNetwork above

    // 3D Rotating City Tower Crane & Animated Hard-Hat Fox Construction Workers
    const towerCraneGroup = new THREE.Group();
    towerCraneGroup.position.set(-4.35, 0.72, -6.85);

    const craneBasePad = new THREE.Mesh(
      new THREE.BoxGeometry(0.95, 0.16, 0.95),
      obsidianMat
    );
    craneBasePad.position.y = 0.08;
    towerCraneGroup.add(craneBasePad);

    const craneTowerMast = new THREE.Mesh(
      new THREE.CylinderGeometry(0.16, 0.22, 3.35, 4),
      industrialSteelMat
    );
    craneTowerMast.position.y = 1.75;
    craneTowerMast.rotation.y = Math.PI / 4;
    towerCraneGroup.add(craneTowerMast);

    const towerCraneSlewingUnit = new THREE.Group();
    towerCraneSlewingUnit.position.y = 3.45;

    const slewingCab = new THREE.Mesh(
      new THREE.BoxGeometry(0.38, 0.34, 0.38),
      obsidianMat
    );
    towerCraneSlewingUnit.add(slewingCab);

    const mainJibBoom = new THREE.Mesh(
      new THREE.BoxGeometry(2.65, 0.14, 0.16),
      industrialSteelMat
    );
    mainJibBoom.position.set(0.75, 0.12, 0);
    towerCraneSlewingUnit.add(mainJibBoom);

    const counterWeightBlock = new THREE.Mesh(
      new THREE.BoxGeometry(0.44, 0.26, 0.28),
      darkGraphiteMat
    );
    counterWeightBlock.position.set(-0.55, 0.08, 0);
    towerCraneSlewingUnit.add(counterWeightBlock);

    const towerCraneHookGroup = new THREE.Group();
    towerCraneHookGroup.position.set(1.55, 0.05, 0);
    const craneWire = new THREE.Mesh(
      new THREE.CylinderGeometry(0.012, 0.012, 1.15, 6),
      obsidianMat
    );
    craneWire.position.y = -0.58;
    towerCraneHookGroup.add(craneWire);

    const suspendedGirder = new THREE.Mesh(
      new THREE.BoxGeometry(0.62, 0.12, 0.16),
      amberCrystalMat
    );
    suspendedGirder.position.y = -1.16;
    towerCraneHookGroup.add(suspendedGirder);
    towerCraneSlewingUnit.add(towerCraneHookGroup);

    towerCraneGroup.add(towerCraneSlewingUnit);
    worldGroup.add(towerCraneGroup);

    // Animated Hard-Hat Fox Construction Workers on Site (Hammering & Inspecting)
    const constructionWorkers: Array<{
      root: THREE.Group;
      rightArm: THREE.Object3D;
      leftArm: THREE.Object3D;
      head: THREE.Group;
      tail: THREE.Object3D;
      phase: number;
    }> = [];
    const workerCoords: Array<[number, number, number, number]> = [
      [-4.95, 0.74, -6.15, 0.65],
      [5.15, 0.74, -6.2, -0.55],
    ];
    workerCoords.forEach(([wx, wy, wz, rotY], wIdx) => {
      const builtWorker = buildDetailedFoxCharacter({
        scale: 0.84,
        hasHardhat: true,
      });
      builtWorker.root.position.set(wx, wy, wz);
      builtWorker.root.rotation.y = rotY;

      // Golden Wrench / Hammer Tool in Worker's Right Paw
      const toolHandle = new THREE.Mesh(
        new THREE.CylinderGeometry(0.018, 0.018, 0.22, 6),
        brightGoldMat
      );
      toolHandle.rotation.x = Math.PI / 2;
      toolHandle.position.set(0, -0.16, 0.09);
      builtWorker.rightArm.add(toolHandle);

      worldGroup.add(builtWorker.root);
      constructionWorkers.push({
        root: builtWorker.root,
        rightArm: builtWorker.rightArm,
        leftArm: builtWorker.leftArm,
        head: builtWorker.headGroup,
        tail: builtWorker.tailPivot,
        phase: wIdx * 1.8,
      });
    });

    // Dedicated Sidewalk Loops for Fox Characters (Completely outside road asphalt and buildings)
    const npcSidewalkLoops: ClosedLoopPath[] = createMetropolitanSidewalkLoops();

    const foxNpcs: SidewalkFoxNpc[] = [];
    const npcsPerLoop = qualityTier === 'low' ? 1 : 2;
    npcSidewalkLoops.forEach((loop, loopIdx) => {
      const spacing = loop.totalLength / npcsPerLoop;
      for (let s = 0; s < npcsPerLoop; s++) {
        const builtNpc = buildDetailedFoxCharacter({
          scale: 0.82,
          hasHardhat: loopIdx === 3,
        });
        worldGroup.add(builtNpc.root);
        foxNpcs.push({
          group: builtNpc.root,
          leftLeg: builtNpc.leftLeg,
          rightLeg: builtNpc.rightLeg,
          leftArm: builtNpc.leftArm,
          rightArm: builtNpc.rightArm,
          tail: builtNpc.tailPivot,
          head: builtNpc.headGroup,
          loopIndex: loopIdx,
          distanceOnLoop: s * spacing,
          baseSpeed: 0.48,
          phase: (loopIdx * 2 + s) * 1.3,
        });
      }
    });

    // =========================================================================
    // 5B. ULTRA-REALISTIC NAVAL SHIPS, SUPERYACHTS & CARGO FREIGHTERS
    // =========================================================================
    const shipWhiteMat = new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      roughness: 0.2,
      metalness: 0.25,
    });
    const shipNavyHullMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.28,
      metalness: 0.65,
    });
    const containerBlueMat = new THREE.MeshStandardMaterial({
      color: 0x0284c7,
      roughness: 0.42,
      metalness: 0.45,
    });
    const wakeFoamMat = new THREE.MeshBasicMaterial({
      color: 0xe0f2fe,
      transparent: true,
      opacity: 0.52,
      depthWrite: false,
      side: THREE.DoubleSide,
    });

    // Helper: Create a true curved 3D naval hull geometry with sharp flared bow & contoured cruiser stern
    const createCurvedNavalHullGeo = (
      halfBeam: number,
      length: number,
      height: number,
      bevelSize = 0.045
    ) => {
      const shape = new THREE.Shape();
      const sternY = -length * 0.48;
      const bowY = length * 0.52;

      // Start at Port Stern corner
      shape.moveTo(-halfBeam * 0.82, sternY);
      // Curved transom stern to Starboard Stern corner
      shape.quadraticCurveTo(0, sternY - length * 0.04, halfBeam * 0.82, sternY);
      // Starboard midship parallel body
      shape.lineTo(halfBeam, -length * 0.08);
      // Smooth curved bow flare to sharp stem point (+Z in world after X-rotation)
      shape.bezierCurveTo(
        halfBeam,
        length * 0.22,
        halfBeam * 0.48,
        length * 0.42,
        0,
        bowY
      );
      // Port bow flare back to Port midship
      shape.bezierCurveTo(
        -halfBeam * 0.48,
        length * 0.42,
        -halfBeam,
        length * 0.22,
        -halfBeam,
        -length * 0.08
      );
      shape.closePath();

      const geo = new THREE.ExtrudeGeometry(shape, {
        depth: height,
        bevelEnabled: true,
        bevelSegments: 3,
        steps: 1,
        bevelSize,
        bevelThickness: height * 0.28,
      });
      // Rotate so shape X -> X, shape Y -> +Z (forward bow), extrusion Z -> +Y (upward)
      geo.rotateX(-Math.PI / 2);
      // Flip Z so bowY (+Y in 2D shape) points toward +Z in 3D space
      geo.scale(1, 1, -1);
      geo.computeVertexNormals();
      return geo;
    };

    const buildRealisticHarborShip = (shipIdx: number) => {
      const boatGroup = new THREE.Group();
      const shipBody = new THREE.Group();
      boatGroup.add(shipBody);

      const propellers: THREE.Object3D[] = [];
      let cranePivot: THREE.Object3D | undefined;
      let flagMesh: THREE.Mesh | undefined;

      // Ship Classes:
      // 0 = Flagship Luxury Superyacht ("FOX SOVEREIGN")
      // 1 = Heavy Bullion & Crystal Cargo Freighter ("FOX TITAN")
      // 2 = High-Speed Executive Patrol Cruiser ("FOX GUARDIAN")
      // 3 = Harbor Canal Crystal Tender ("FOX COURIER")
      const isCargoFreighter = shipIdx === 1;
      const isSuperyacht = shipIdx === 0;
      const isCanalTender = shipIdx === 3;

      const hullScale = isCargoFreighter
        ? 1.28
        : isSuperyacht
        ? 1.18
        : isCanalTender
        ? 0.72
        : 1.05;
      shipBody.scale.setScalar(hullScale);

      const halfBeam = isCargoFreighter ? 0.42 : 0.36;
      const hullLength = isCargoFreighter ? 2.35 : 2.05;

      // 1. Sculpted Crimson Anti-Fouling Lower Sub-Waterline Hull + Bulbous Bow
      const lowerHullGeo = createCurvedNavalHullGeo(
        halfBeam * 0.92,
        hullLength * 0.95,
        0.11,
        0.025
      );
      const lowerHull = new THREE.Mesh(lowerHullGeo, redStripeMat);
      lowerHull.position.y = 0.01;
      shipBody.add(lowerHull);

      // Hydrodynamic Bulbous Bow protruding at the waterline (+Z front)
      const bulbousBow = new THREE.Mesh(
        new THREE.SphereGeometry(0.095, 12, 10),
        redStripeMat
      );
      bulbousBow.scale.set(0.75, 0.7, 1.85);
      bulbousBow.position.set(0, 0.05, hullLength * 0.5);
      shipBody.add(bulbousBow);

      // 2. Sculpted Upper Freeboard Naval Hull + Golden Waterline Boot-Stripe
      const upperHullGeo = createCurvedNavalHullGeo(
        halfBeam,
        hullLength,
        0.2,
        0.045
      );
      const upperHull = new THREE.Mesh(
        upperHullGeo,
        isSuperyacht
          ? shipWhiteMat
          : isCargoFreighter
          ? shipNavyHullMat
          : obsidianMat
      );
      upperHull.position.y = 0.11;
      upperHull.castShadow = true;
      upperHull.receiveShadow = true;
      shipBody.add(upperHull);

      // Golden Waterline Boot-Top Livery Belt & Gunwale Rub-Rail
      const goldWaterlineGeo = createCurvedNavalHullGeo(
        halfBeam * 1.02,
        hullLength * 1.01,
        0.032,
        0.01
      );
      const goldWaterline = new THREE.Mesh(goldWaterlineGeo, brightGoldMat);
      goldWaterline.position.y = 0.28;
      shipBody.add(goldWaterline);

      // Teak Wood Planked Main Deck
      const teakDeckGeo = createCurvedNavalHullGeo(
        halfBeam * 0.9,
        hullLength * 0.92,
        0.025,
        0.01
      );
      const teakDeck = new THREE.Mesh(teakDeckGeo, woodMat);
      teakDeck.position.y = 0.31;
      shipBody.add(teakDeck);

      // Raised Forecastle Bow Bulwark & Breakwater Shield
      const forecastleGeo = createCurvedNavalHullGeo(
        halfBeam * 0.95,
        hullLength * 0.34,
        0.075,
        0.02
      );
      const forecastle = new THREE.Mesh(
        forecastleGeo,
        isSuperyacht ? shipWhiteMat : goldMetalMat
      );
      forecastle.position.set(0, 0.32, hullLength * 0.32);
      shipBody.add(forecastle);

      // Illuminated Brass Hull Portholes along Port & Starboard Sides
      for (let p = -2; p <= 2; p++) {
        [-1, 1].forEach((side) => {
          const porthole = new THREE.Mesh(
            new THREE.CylinderGeometry(0.028, 0.028, 0.04, 10),
            windowGlowMat
          );
          porthole.rotation.z = Math.PI / 2;
          porthole.position.set(
            side * (halfBeam + 0.025),
            0.21,
            p * 0.24 - 0.05
          );
          shipBody.add(porthole);
        });
      }

      // Port & Starboard Bow Anchors + Anchor Winch & Golden Mooring Bollards
      [-1, 1].forEach((side) => {
        const anchorFluke = new THREE.Mesh(
          new THREE.BoxGeometry(0.03, 0.09, 0.065),
          brightGoldMat
        );
        anchorFluke.position.set(
          side * (halfBeam * 0.72),
          0.24,
          hullLength * 0.38
        );
        anchorFluke.rotation.y = side * 0.42;
        shipBody.add(anchorFluke);

        const bollard = new THREE.Mesh(
          new THREE.CylinderGeometry(0.026, 0.032, 0.08, 8),
          goldMetalMat
        );
        bollard.position.set(side * 0.14, 0.42, hullLength * 0.34);
        shipBody.add(bollard);
      });

      // Foredeck Anchor Windlass Drum
      const windlass = new THREE.Mesh(
        new THREE.CylinderGeometry(0.045, 0.045, 0.18, 10),
        obsidianMat
      );
      windlass.rotation.z = Math.PI / 2;
      windlass.position.set(0, 0.42, hullLength * 0.26);
      shipBody.add(windlass);

      // Twin Underwater Bronze Propellers & Rudder Blades at Stern
      [-0.14, 0.14].forEach((px) => {
        const propHub = new THREE.Group();
        propHub.position.set(px, 0.04, -hullLength * 0.48);
        for (let b = 0; b < 3; b++) {
          const blade = new THREE.Mesh(
            new THREE.BoxGeometry(0.085, 0.022, 0.012),
            brightGoldMat
          );
          blade.rotation.z = (b * Math.PI * 2) / 3;
          propHub.add(blade);
        }
        shipBody.add(propHub);
        propellers.push(propHub);
      });

      let radarSpinner: THREE.Object3D;

      if (isCargoFreighter) {
        // =====================================================================
        // CLASS 1: HEAVY FOX BULLION & CRYSTAL CONTAINER FREIGHTER
        // =====================================================================
        // Midship Ribbed Intermodal Shipping Containers (2x2 Stack) + Crystal Cages
        const containerSpecs: Array<[number, number, number, THREE.Material]> = [
          [-0.15, 0.43, 0.22, goldMetalMat],
          [0.15, 0.43, 0.22, containerBlueMat],
          [-0.15, 0.43, -0.18, redStripeMat],
          [0.15, 0.43, -0.18, obsidianMat],
          [-0.15, 0.61, 0.22, brightGoldMat],
          [0.15, 0.61, 0.22, goldMetalMat],
        ];
        containerSpecs.forEach(([cx, cy, cz, mat]) => {
          const box = new THREE.Mesh(
            new THREE.BoxGeometry(0.26, 0.17, 0.34),
            mat
          );
          box.position.set(cx, cy, cz);
          box.castShadow = true;
          shipBody.add(box);
        });

        // Glowing Amber Crystal Vaults on Forward Cargo Hatch
        [-0.14, 0.14].forEach((ox) => {
          const crystal = new THREE.Mesh(
            new THREE.OctahedronGeometry(0.13, 0),
            amberCrystalMat
          );
          crystal.position.set(ox, 0.64, -0.18);
          shipBody.add(crystal);
        });

        // Animated Slewing Deck Cargo Crane between Hold & Foredeck
        const craneGroup = new THREE.Group();
        craneGroup.position.set(0, 0.34, 0.52);
        const cranePedestal = new THREE.Mesh(
          new THREE.CylinderGeometry(0.055, 0.07, 0.32, 10),
          brightGoldMat
        );
        cranePedestal.position.y = 0.16;
        craneGroup.add(cranePedestal);

        const jibBoom = new THREE.Mesh(
          new THREE.BoxGeometry(0.045, 0.045, 0.56),
          goldMetalMat
        );
        jibBoom.position.set(0, 0.38, -0.18);
        jibBoom.rotation.x = 0.38;
        craneGroup.add(jibBoom);

        const hoistCable = new THREE.Mesh(
          new THREE.CylinderGeometry(0.008, 0.008, 0.22, 6),
          obsidianMat
        );
        hoistCable.position.set(0, 0.35, -0.4);
        craneGroup.add(hoistCable);
        shipBody.add(craneGroup);
        cranePivot = craneGroup;

        // 4-Story Aft Superstructure Bridge Tower with Port/Starboard Bridge Wings
        const aftTower = new THREE.Mesh(
          new THREE.BoxGeometry(0.56, 0.46, 0.44),
          shipWhiteMat
        );
        aftTower.position.set(0, 0.54, -0.66);
        aftTower.castShadow = true;
        shipBody.add(aftTower);

        // Bridge Wings extending out over Port & Starboard sides
        const bridgeWing = new THREE.Mesh(
          new THREE.BoxGeometry(0.88, 0.11, 0.22),
          obsidianMat
        );
        bridgeWing.position.set(0, 0.78, -0.58);
        shipBody.add(bridgeWing);

        const bridgeWindows = new THREE.Mesh(
          new THREE.BoxGeometry(0.89, 0.075, 0.18),
          carGlassMat
        );
        bridgeWindows.position.set(0, 0.79, -0.56);
        shipBody.add(bridgeWindows);

        // Twin Raked Smokestack Funnels with Crimson & Gold Livery
        [-0.14, 0.14].forEach((fx) => {
          const stack = new THREE.Mesh(
            new THREE.CylinderGeometry(0.055, 0.075, 0.26, 10),
            goldMetalMat
          );
          stack.position.set(fx, 0.92, -0.74);
          stack.rotation.x = -0.22;
          shipBody.add(stack);

          const stackCap = new THREE.Mesh(
            new THREE.CylinderGeometry(0.058, 0.06, 0.06, 10),
            redStripeMat
          );
          stackCap.position.set(fx, 1.02, -0.76);
          stackCap.rotation.x = -0.22;
          shipBody.add(stackCap);
        });

        const mast = new THREE.Mesh(
          new THREE.CylinderGeometry(0.018, 0.025, 0.32, 8),
          brightGoldMat
        );
        mast.position.set(0, 0.98, -0.56);
        shipBody.add(mast);

        radarSpinner = new THREE.Mesh(
          new THREE.BoxGeometry(0.32, 0.028, 0.05),
          shipWhiteMat
        );
        radarSpinner.position.set(0, 1.14, -0.56);
        shipBody.add(radarSpinner);
      } else {
        // =====================================================================
        // CLASS 0, 2, 3: LUXURY 3-DECK SUPERYACHT & EXECUTIVE HARBOR CRUISER
        // =====================================================================
        // Tier 1: Main Salon Deck with Swept-Back Aerodynamic Glazing
        const mainSalon = new THREE.Mesh(
          new THREE.BoxGeometry(0.54, 0.2, 0.88),
          shipWhiteMat
        );
        mainSalon.position.set(0, 0.42, -0.04);
        mainSalon.castShadow = true;
        shipBody.add(mainSalon);

        // Raked Forward Salon Windshield
        const salonFrontGlass = new THREE.Mesh(
          new THREE.BoxGeometry(0.5, 0.18, 0.16),
          carGlassMat
        );
        salonFrontGlass.position.set(0, 0.41, 0.42);
        salonFrontGlass.rotation.x = -0.55;
        shipBody.add(salonFrontGlass);

        const salonSideGlass = new THREE.Mesh(
          new THREE.BoxGeometry(0.555, 0.1, 0.74),
          carGlassMat
        );
        salonSideGlass.position.set(0, 0.43, -0.04);
        shipBody.add(salonSideGlass);

        // Lifebuoy Rings (Orange & Red Torus) mounted on Port & Starboard Salon Walls
        [-0.285, 0.285].forEach((lx) => {
          const lifebuoy = new THREE.Mesh(
            new THREE.TorusGeometry(0.045, 0.015, 8, 16),
            taillightRedMat
          );
          lifebuoy.rotation.y = Math.PI / 2;
          lifebuoy.position.set(lx, 0.42, -0.32);
          shipBody.add(lifebuoy);
        });

        // Tier 2: Upper Owner's Deck & Panoramic Pilothouse Bridge
        const upperDeck = new THREE.Mesh(
          new THREE.BoxGeometry(0.44, 0.17, 0.56),
          isSuperyacht ? shipWhiteMat : obsidianMat
        );
        upperDeck.position.set(0, 0.59, -0.08);
        upperDeck.castShadow = true;
        shipBody.add(upperDeck);

        const bridgeWindshield = new THREE.Mesh(
          new THREE.BoxGeometry(0.455, 0.09, 0.44),
          carGlassMat
        );
        bridgeWindshield.position.set(0, 0.6, -0.04);
        shipBody.add(bridgeWindshield);

        // Golden Overhang Sun-Visor Trim around Upper Deck
        const deckVisor = new THREE.Mesh(
          new THREE.BoxGeometry(0.48, 0.03, 0.62),
          brightGoldMat
        );
        deckVisor.position.set(0, 0.68, -0.08);
        shipBody.add(deckVisor);

        // Tier 3: Swept Radar Arch, Twin Satellite Radome Spheres & Spinning X-Band Scanner
        const radarArch = new THREE.Mesh(
          new THREE.BoxGeometry(0.36, 0.14, 0.12),
          shipWhiteMat
        );
        radarArch.position.set(0, 0.75, -0.14);
        radarArch.rotation.x = -0.28;
        shipBody.add(radarArch);

        [-0.12, 0.12].forEach((dx) => {
          const satDome = new THREE.Mesh(
            new THREE.SphereGeometry(0.048, 10, 10),
            shipWhiteMat
          );
          satDome.position.set(dx, 0.85, -0.16);
          shipBody.add(satDome);
        });

        const radarMast = new THREE.Mesh(
          new THREE.CylinderGeometry(0.016, 0.022, 0.18, 8),
          brightGoldMat
        );
        radarMast.position.set(0, 0.88, -0.08);
        shipBody.add(radarMast);

        radarSpinner = new THREE.Mesh(
          new THREE.BoxGeometry(0.28, 0.025, 0.045),
          brightGoldMat
        );
        radarSpinner.position.set(0, 0.98, -0.08);
        shipBody.add(radarSpinner);

        // Foredeck Sunpad Lounge & Aft Swim Platform with Glowing Crystal Pod
        const foredeckLounge = new THREE.Mesh(
          new THREE.BoxGeometry(0.28, 0.045, 0.24),
          foxFurCreamMat
        );
        foredeckLounge.position.set(0, 0.41, 0.62);
        shipBody.add(foredeckLounge);

        const aftCrystalPod = new THREE.Mesh(
          new THREE.OctahedronGeometry(0.11, 0),
          amberCrystalMat
        );
        aftCrystalPod.position.set(0, 0.46, -0.64);
        shipBody.add(aftCrystalPod);

        // Stern Jackstaff & Fluttering Golden FOX Ensign Flag
        const flagPole = new THREE.Mesh(
          new THREE.CylinderGeometry(0.01, 0.012, 0.28, 6),
          brightGoldMat
        );
        flagPole.position.set(0, 0.44, -0.88);
        flagPole.rotation.x = -0.32;
        shipBody.add(flagPole);

        const ensignFlag = new THREE.Mesh(
          new THREE.BoxGeometry(0.015, 0.09, 0.16),
          amberCrystalMat
        );
        ensignFlag.position.set(0, 0.54, -0.98);
        shipBody.add(ensignFlag);
        flagMesh = ensignFlag;
      }

      // Marine Navigation Lights (Red Port, Green Starboard, White Bow Spotlight)
      const portLight = new THREE.Mesh(
        new THREE.SphereGeometry(0.036, 8, 8),
        taillightRedMat
      );
      portLight.position.set(-halfBeam * 0.85, 0.58, 0.16);
      shipBody.add(portLight);

      const starboardLight = new THREE.Mesh(
        new THREE.SphereGeometry(0.036, 8, 8),
        navGreenMat
      );
      starboardLight.position.set(halfBeam * 0.85, 0.58, 0.16);
      shipBody.add(starboardLight);

      // Volumetric Bow Searchlight Beam over the Sea
      const bowSearchBeam = new THREE.Mesh(
        new THREE.ConeGeometry(0.22, 0.85, 10, 1, true),
        headlightBeamMat
      );
      bowSearchBeam.rotation.x = -Math.PI / 2;
      bowSearchBeam.position.set(0, 0.18, hullLength * 0.72);
      shipBody.add(bowSearchBeam);

      // 4. Realistic V-Shaped Bow Wave Wings + Churning White Stern Propeller Wash
      const wakeGroup = new THREE.Group();
      wakeGroup.position.y = 0.02;

      [-1, 1].forEach((side) => {
        const bowWaveWing = new THREE.Mesh(
          new THREE.PlaneGeometry(0.14, hullLength * 1.15),
          wakeFoamMat
        );
        bowWaveWing.rotation.x = -Math.PI / 2;
        bowWaveWing.rotation.z = side * 0.34;
        bowWaveWing.position.set(
          side * (halfBeam * 0.95),
          0,
          -hullLength * 0.05
        );
        wakeGroup.add(bowWaveWing);
      });

      const sternFoamTrail = new THREE.Mesh(
        new THREE.PlaneGeometry(halfBeam * 1.45, hullLength * 0.95),
        wakeFoamMat
      );
      sternFoamTrail.rotation.x = -Math.PI / 2;
      sternFoamTrail.position.set(0, -0.005, -hullLength * 0.82);
      wakeGroup.add(sternFoamTrail);
      boatGroup.add(wakeGroup);

      return {
        boatGroup,
        shipBody,
        radarSpinner,
        cranePivot,
        propellers,
        wakeMesh: sternFoamTrail,
        flagMesh,
      };
    };

    // Continuous Closed-Loop Maritime Shipping Lanes (Ships sail smoothly along curved loops and never stop or flip 180°)
    const shipClosedLoops: ClosedLoopPath[] = createHarborShippingLoops();

    const shipAssignments: Array<{
      loopIdx: number;
      distOffsetRatio: number;
      speed: number;
      baseY: number;
    }> = [
      { loopIdx: 0, distOffsetRatio: 0.0, speed: 0.68, baseY: -1.42 },  // Ship 0: Flagship Superyacht (Docks periodically at Port Pier)
      { loopIdx: 1, distOffsetRatio: 0.15, speed: 0.52, baseY: -1.42 }, // Ship 1: Heavy Cargo Freighter (Deep-water channel)
      { loopIdx: 0, distOffsetRatio: 0.5, speed: 0.68, baseY: -1.42 },  // Ship 2: Executive Patrol Cruiser (Docks periodically at Port Pier)
    ];

    const boats: AnimatedBoat[] = [];
    shipAssignments.forEach((assign, bIdx) => {
      const {
        boatGroup,
        shipBody,
        radarSpinner,
        cranePivot,
        propellers,
        wakeMesh,
        flagMesh,
      } = buildRealisticHarborShip(bIdx);
      worldGroup.add(boatGroup);
      const seaLoop = shipClosedLoops[assign.loopIdx];
      boats.push({
        group: boatGroup,
        shipBody,
        radarSpinner,
        cranePivot,
        propellers,
        wakeMesh,
        flagMesh,
        loopIndex: assign.loopIdx,
        distanceOnLoop: seaLoop.totalLength * assign.distOffsetRatio,
        speed: assign.speed,
        currentSpeed: assign.speed,
        dockTimer: 0,
        isDocked: false,
        hasDockedThisLap: false,
        baseY: assign.baseY,
        phase: bIdx * 1.9,
      });
    });

    // Twin Cascading Eastern Cliff Waterfalls + Chimney Steam
    const waterfallDrops: THREE.Mesh[] = [];
    const waterfallDropMat = new THREE.MeshBasicMaterial({
      color: 0xe0f2fe,
      transparent: true,
      opacity: 0.88,
    });
    const dropCount = qualityTier === 'low' ? 28 : 56;
    for (let i = 0; i < dropCount; i++) {
      const drop = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.44, 0.15), waterfallDropMat);
      const isSecondFall = i % 2 === 1;
      drop.position.set(
        isSecondFall ? 10.2 + (i % 3) * 0.28 : 13.4,
        -0.05 - ((i * 0.15) % 1.45),
        isSecondFall ? 7.8 : 0.9 + (i % 5) * 0.32
      );
      drop.userData.baseY = drop.position.y;
      drop.userData.phase = i * 0.35;
      worldGroup.add(drop);
      waterfallDrops.push(drop);
    }

    const steamPuffs: THREE.Mesh[] = [];
    const steamMat = new THREE.MeshBasicMaterial({
      color: 0xf1f5f9,
      transparent: true,
      opacity: 0.48,
    });
    for (let i = 0; i < 12; i++) {
      const puff = new THREE.Mesh(new THREE.SphereGeometry(0.2, 6, 6), steamMat);
      const stackIdx = i % 3;
      puff.position.set(7.8 + stackPositions[stackIdx], 3.55 + (i % 4) * 0.42, -7.7);
      puff.userData.phase = i * 0.55;
      puff.userData.originX = 7.8 + stackPositions[stackIdx];
      worldGroup.add(puff);
      steamPuffs.push(puff);
    }

    // Floating Golden Energy Sparkles across FOX CITY
    const sparkCount = qualityTier === 'low' ? 40 : 85;
    const sparkGeo = new THREE.BufferGeometry();
    const sparkPositions = new Float32Array(sparkCount * 3);
    for (let i = 0; i < sparkCount; i++) {
      sparkPositions[i * 3] = (Math.random() - 0.5) * 24.5;
      sparkPositions[i * 3 + 1] = 0.35 + Math.random() * 6.8;
      sparkPositions[i * 3 + 2] = (Math.random() - 0.5) * 20.5;
    }
    sparkGeo.setAttribute('position', new THREE.BufferAttribute(sparkPositions, 3));
    const sparkMat = new THREE.PointsMaterial({
      color: 0xfef08a,
      size: 0.18,
      transparent: true,
      opacity: 0.9,
    });
    const sparkPoints = new THREE.Points(sparkGeo, sparkMat);
    scene.add(sparkPoints);

    // Rain Particle System
    const rainCount = qualityTier === 'low' ? 90 : 180;
    const rainGeo = new THREE.BufferGeometry();
    const rainPositions = new Float32Array(rainCount * 3);
    for (let i = 0; i < rainCount; i++) {
      rainPositions[i * 3] = (Math.random() - 0.5) * 32;
      rainPositions[i * 3 + 1] = Math.random() * 14;
      rainPositions[i * 3 + 2] = (Math.random() - 0.5) * 28;
    }
    rainGeo.setAttribute('position', new THREE.BufferAttribute(rainPositions, 3));
    const rainMat = new THREE.PointsMaterial({
      color: 0x93c5fd,
      size: 0.15,
      transparent: true,
      opacity: 0.7,
    });
    const rainPoints = new THREE.Points(rainGeo, rainMat);
    rainPoints.visible = false;
    scene.add(rainPoints);

    // =========================================================================
    // 6. POINTER / TOUCH ORBIT, PAN, PINCH ZOOM & RAYCAST BUILDING SELECTION
    // =========================================================================
    const raycaster = new THREE.Raycaster();
    const pointerNdc = new THREE.Vector2();
    const pointerDownPos = { x: 0, y: 0 };
    let isDragging = false;
    let isPanGesture = false;
    const activePointers = new Map<number, { x: number; y: number }>();
    let lastPinchDist = 0;
    let lastTwoFingerCenter = { x: 0, y: 0 };
    let clickBounceBuildingId: FoxCityBuildingId | null = null;
    let clickBounceTimer = 0;

    let lastHoverRaycastMs = 0;

    const raycastBuildingAtClientPoint = (
      clientX: number,
      clientY: number
    ): FoxCityBuildingId | null => {
      const rect = renderer.domElement.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return null;
      pointerNdc.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      pointerNdc.y = -((clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointerNdc, camera);
      const hits = raycaster.intersectObjects(pickableMeshes, false);
      for (const hit of hits) {
        const bId = resolveBuildingIdFromObject(hit.object);
        if (bId) return bId;
      }
      return null;
    };

    const clampPanTarget = (v: THREE.Vector3) => {
      v.x = Math.max(-10.5, Math.min(10.5, v.x));
      v.z = Math.max(-8.5, Math.min(8.5, v.z));
    };

    const handlePointerDown = (e: PointerEvent) => {
      activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (activePointers.size === 1) {
        pointerDownPos.x = e.clientX;
        pointerDownPos.y = e.clientY;
        isDragging = false;
        isPanGesture = e.button === 2 || e.shiftKey;
      } else if (activePointers.size === 2) {
        const pts = Array.from(activePointers.values());
        lastPinchDist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
        lastTwoFingerCenter = {
          x: (pts[0].x + pts[1].x) * 0.5,
          y: (pts[0].y + pts[1].y) * 0.5,
        };
      }
    };

    const handlePointerMove = (e: PointerEvent) => {
      if (activePointers.size === 0) {
        const nowMs = performance.now();
        if (nowMs - lastHoverRaycastMs < 60) return;
        lastHoverRaycastMs = nowMs;
        const hoveredId = raycastBuildingAtClientPoint(e.clientX, e.clientY);
        if (hoveredId !== hoveredBuildingRef.current) {
          hoveredBuildingRef.current = hoveredId;
          setHoveredBuildingId(hoveredId);
          renderer.domElement.style.cursor = hoveredId ? 'pointer' : 'grab';
        }
        return;
      }

      if (!activePointers.has(e.pointerId)) return;
      const prev = activePointers.get(e.pointerId)!;
      const dx = e.clientX - prev.x;
      const dy = e.clientY - prev.y;
      activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

      const ctrl = cameraControlRef.current;

      if (activePointers.size === 1) {
        const totalMove = Math.hypot(
          e.clientX - pointerDownPos.x,
          e.clientY - pointerDownPos.y
        );
        if (totalMove > 8) {
          isDragging = true;
          renderer.domElement.style.cursor = 'grabbing';
        }
        if (isPanGesture) {
          const panScale = 0.015;
          const forwardX = -Math.sin(ctrl.azimuth);
          const forwardZ = -Math.cos(ctrl.azimuth);
          const rightX = Math.cos(ctrl.azimuth);
          const rightZ = -Math.sin(ctrl.azimuth);
          ctrl.targetLookAt.x -= (dx * rightX - dy * forwardX) * panScale;
          ctrl.targetLookAt.z -= (dx * rightZ - dy * forwardZ) * panScale;
          clampPanTarget(ctrl.targetLookAt);
        } else {
          ctrl.targetAzimuth -= dx * 0.0075;
          ctrl.targetPolar = Math.max(
            0.38,
            Math.min(1.28, ctrl.targetPolar - dy * 0.0055)
          );
        }
      } else if (activePointers.size === 2) {
        isDragging = true;
        const pts = Array.from(activePointers.values());
        const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
        const center = {
          x: (pts[0].x + pts[1].x) * 0.5,
          y: (pts[0].y + pts[1].y) * 0.5,
        };

        if (lastPinchDist > 0) {
          const deltaPinch = lastPinchDist - dist;
          ctrl.targetDistance = Math.max(
            9.5,
            Math.min(38.0, ctrl.targetDistance + deltaPinch * 0.045)
          );
        }

        const panDx = center.x - lastTwoFingerCenter.x;
        const panDy = center.y - lastTwoFingerCenter.y;
        const panScale = 0.014;
        const rightX = Math.cos(ctrl.azimuth);
        const rightZ = -Math.sin(ctrl.azimuth);
        const forwardX = -Math.sin(ctrl.azimuth);
        const forwardZ = -Math.cos(ctrl.azimuth);
        ctrl.targetLookAt.x -= (panDx * rightX - panDy * forwardX) * panScale;
        ctrl.targetLookAt.z -= (panDx * rightZ - panDy * forwardZ) * panScale;
        clampPanTarget(ctrl.targetLookAt);

        lastPinchDist = dist;
        lastTwoFingerCenter = center;
      }
    };

    const handlePointerUp = (e: PointerEvent) => {
      const wasSinglePointer = activePointers.size === 1;
      activePointers.delete(e.pointerId);
      if (activePointers.size < 2) {
        lastPinchDist = 0;
      }

      if (wasSinglePointer && !isDragging) {
        // First check if the player tapped the 3D FOX Mascot in the central plaza
        const rect = renderer.domElement.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          pointerNdc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
          pointerNdc.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
          raycaster.setFromCamera(pointerNdc, camera);
          const mascotHits = raycaster.intersectObject(heroMascotGroup, true);
          if (mascotHits.length > 0) {
            mascotInteractTimer = 2.8;
            return;
          }
        }

        const hitBuildingId = raycastBuildingAtClientPoint(e.clientX, e.clientY);
        if (hitBuildingId) {
          clickBounceBuildingId = hitBuildingId;
          clickBounceTimer = 0.36;
          const resolved = buildingStatesRef.current?.[hitBuildingId];
          onSelectRef.current(hitBuildingId, resolved);
        }
      }
      renderer.domElement.style.cursor = hoveredBuildingRef.current ? 'pointer' : 'grab';
    };

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const ctrl = cameraControlRef.current;
      ctrl.targetDistance = Math.max(
        9.5,
        Math.min(38.0, ctrl.targetDistance + e.deltaY * 0.014)
      );
    };

    const handleContextMenu = (e: MouseEvent) => e.preventDefault();

    const domElem = renderer.domElement;
    domElem.style.touchAction = 'none';
    domElem.addEventListener('pointerdown', handlePointerDown);
    domElem.addEventListener('pointermove', handlePointerMove);
    domElem.addEventListener('pointerup', handlePointerUp);
    domElem.addEventListener('pointercancel', handlePointerUp);
    domElem.addEventListener('wheel', handleWheel, { passive: false });
    domElem.addEventListener('contextmenu', handleContextMenu);

    // =========================================================================
    // 6B. SELECTIVE POST-PROCESSING PIPELINE (Disabled by default for instant 60FPS direct rendering)
    // =========================================================================
    let usePostProcessing = false;
    const msaaSamples = 0;
    const composerRenderTarget = new THREE.WebGLRenderTarget(
      Math.floor(initWidth * activePixelRatio),
      Math.floor(initHeight * activePixelRatio),
      {
        type: THREE.HalfFloatType,
        format: THREE.RGBAFormat,
        colorSpace: THREE.SRGBColorSpace,
        samples: msaaSamples,
      }
    );
    const composer = new EffectComposer(renderer, composerRenderTarget);
    composer.setPixelRatio(activePixelRatio);
    composer.setSize(initWidth, initHeight);

    const renderPass = new RenderPass(scene, camera);
    composer.addPass(renderPass);

    // High threshold (1.05) ensures only bright emissive FOX landmarks, crystals & neon signs bloom
    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(initWidth, initHeight),
      qualityTier === 'high' ? 0.42 : 0.32,
      0.38,
      1.05
    );
    composer.addPass(bloomPass);

    const outputPass = new OutputPass();
    composer.addPass(outputPass);

    const handleResize = () => {
      if (!container) return;
      const w = Math.max(280, container.clientWidth);
      const h = Math.max(300, container.clientHeight);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      composer.setSize(w, h);
      bloomPass.resolution.set(w, h);
    };
    window.addEventListener('resize', handleResize);

    // =========================================================================
    // 7. REAL-TIME 60FPS ANIMATION LOOP & ADAPTIVE GPU PERFORMANCE MONITOR
    // =========================================================================
    let animFrameId = 0;
    let lastTime = performance.now();
    let elapsedTotal = 0;
    let labelFrameCounter = 0;
    let heroAngle = 0;
    let mascotInteractTimer = 0;
    let lastAppliedSkyMode: CityTimeMode = timeModeRef.current;
    let fpsSampleFrames = 0;
    let fpsSampleElapsed = 0;
    let hasAdaptedPerformance = false;
    const tempPos = new THREE.Vector3();
    const tempLookAt = new THREE.Vector3();
    const sunColorDay = new THREE.Color(0xffedd5);
    const sunColorSunset = new THREE.Color(0xfdba74);
    const sunColorNight = new THREE.Color(0xdbeafe);
    const sunColorRainy = new THREE.Color(0x94a3b8);
    const fogColorDay = new THREE.Color(0x1e3a5f);
    const fogColorSunset = new THREE.Color(0x28182e);
    const fogColorRainy = new THREE.Color(0x16202e);
    const fogColorNight = new THREE.Color(0x090e1c);
    const cloudTopNightColor = new THREE.Color(0x334155);
    const cloudUnderDayColor = new THREE.Color(0xcbd5e1);
    const cloudUnderSunsetColor = new THREE.Color(0xfb923c);
    const cloudUnderRainyColor = new THREE.Color(0x334155);
    const cloudUnderNightColor = new THREE.Color(0x1e293b);

    const animate = (now: number) => {
      animFrameId = requestAnimationFrame(animate);
      if (document.hidden) {
        lastTime = now;
        return;
      }

      const rawDt = (now - lastTime) / 1000;
      const dt = Math.min(0.05, rawDt);
      lastTime = now;
      elapsedTotal += dt;

      // Adaptive Mobile GPU Guard: monitor real FPS after 2s warm-up and gracefully step down if < 40 FPS
      if (!hasAdaptedPerformance && elapsedTotal > 2.0 && rawDt > 0 && rawDt < 0.25) {
        fpsSampleFrames++;
        fpsSampleElapsed += rawDt;
        if (fpsSampleElapsed >= 2.5) {
          const avgFps = fpsSampleFrames / fpsSampleElapsed;
          if (avgFps < 38 && usePostProcessing) {
            hasAdaptedPerformance = true;
            activePixelRatio = Math.max(1.0, activePixelRatio * 0.8);
            renderer.setPixelRatio(activePixelRatio);
            composer.setPixelRatio(activePixelRatio);
            if (avgFps < 28) {
              usePostProcessing = false;
            }
          } else {
            hasAdaptedPerformance = true;
          }
        }
      }

      // 1. Smooth Camera Orbit & Pan Interpolation
      const ctrl = cameraControlRef.current;
      const damp = 1 - Math.exp(-7.5 * dt);
      ctrl.azimuth += (ctrl.targetAzimuth - ctrl.azimuth) * damp;
      ctrl.polar += (ctrl.targetPolar - ctrl.polar) * damp;
      ctrl.distance += (ctrl.targetDistance - ctrl.distance) * damp;
      ctrl.lookAt.lerp(ctrl.targetLookAt, damp);

      const camX =
        ctrl.lookAt.x +
        ctrl.distance * Math.sin(ctrl.polar) * Math.sin(ctrl.azimuth);
      const camY = ctrl.lookAt.y + ctrl.distance * Math.cos(ctrl.polar);
      const camZ =
        ctrl.lookAt.z +
        ctrl.distance * Math.sin(ctrl.polar) * Math.cos(ctrl.azimuth);
      camera.position.set(camX, camY, camZ);
      camera.lookAt(ctrl.lookAt);

      // 2. Time-of-Day & Weather Lighting Transitions (Preserving Nighttime Building Visibility & Shadows)
      let effectiveMode = timeModeRef.current;
      if (autoCycleRef.current) {
        const cycleIdx = Math.floor((elapsedTotal / 12) % 4);
        effectiveMode = (['day', 'sunset', 'night', 'rainy'] as CityTimeMode[])[cycleIdx];
      }

      if (effectiveMode !== lastAppliedSkyMode) {
        lastAppliedSkyMode = effectiveMode;
        const newSky = createSkyDomeTexture(effectiveMode);
        if (scene.background instanceof THREE.Texture) {
          scene.background.dispose();
        }
        scene.background = newSky;
      }

      const targetFog =
        effectiveMode === 'day'
          ? fogColorDay
          : effectiveMode === 'sunset'
          ? fogColorSunset
          : effectiveMode === 'rainy'
          ? fogColorRainy
          : fogColorNight;

      if (scene.fog) {
        scene.fog.color.lerp(targetFog, dt * 3);
      }

      // Maintain strong directional moonlight/key light at night (1.45) so crisp shadows & 3D architecture stay visible
      const targetSunIntensity =
        effectiveMode === 'day'
          ? 2.85
          : effectiveMode === 'sunset'
          ? 2.55
          : effectiveMode === 'rainy'
          ? 1.35
          : 1.45;
      sunLight.intensity += (targetSunIntensity - sunLight.intensity) * dt * 3;

      const targetSunColor =
        effectiveMode === 'day'
          ? sunColorDay
          : effectiveMode === 'sunset'
          ? sunColorSunset
          : effectiveMode === 'rainy'
          ? sunColorRainy
          : sunColorNight;
      sunLight.color.lerp(targetSunColor, dt * 3);

      const targetHemiIntensity =
        effectiveMode === 'day'
          ? 1.45
          : effectiveMode === 'sunset'
          ? 1.32
          : effectiveMode === 'rainy'
          ? 1.15
          : 1.18;
      hemiLight.intensity += (targetHemiIntensity - hemiLight.intensity) * dt * 3;

      const targetRimIntensity =
        effectiveMode === 'night' ? 1.35 : effectiveMode === 'sunset' ? 1.25 : 0.95;
      rimLight.intensity += (targetRimIntensity - rimLight.intensity) * dt * 3;

      const targetWinGlow =
        effectiveMode === 'night'
          ? 1.75
          : effectiveMode === 'sunset'
          ? 1.45
          : effectiveMode === 'rainy'
          ? 1.35
          : 0.95;
      windowGlowMat.emissiveIntensity +=
        (targetWinGlow - windowGlowMat.emissiveIntensity) * dt * 3;

      // Subtle selective bloom intensity per time mode
      const targetBloomStrength =
        effectiveMode === 'night'
          ? 0.44
          : effectiveMode === 'sunset'
          ? 0.4
          : effectiveMode === 'rainy'
          ? 0.36
          : 0.28;
      bloomPass.strength += (targetBloomStrength - bloomPass.strength) * dt * 3;

      // Wet road reflections transitions in night and rainy modes
      const targetRoadRoughness =
        effectiveMode === 'rainy'
          ? 0.18
          : effectiveMode === 'night'
          ? 0.32
          : effectiveMode === 'sunset'
          ? 0.46
          : 0.64;
      roadAsphaltMat.roughness +=
        (targetRoadRoughness - roadAsphaltMat.roughness) * dt * 3;

      rainPoints.visible = effectiveMode === 'rainy';
      if (rainPoints.visible) {
        const posAttr = rainGeo.getAttribute('position') as THREE.BufferAttribute;
        for (let i = 0; i < rainCount; i++) {
          let ry = posAttr.getY(i) - dt * 16;
          if (ry < -1) ry = 12;
          posAttr.setY(i, ry);
        }
        posAttr.needsUpdate = true;
      }

      const sparkAttr = sparkGeo.getAttribute('position') as THREE.BufferAttribute;
      for (let i = 0; i < sparkCount; i++) {
        let sy = sparkAttr.getY(i) + dt * 0.52;
        if (sy > 7.2) sy = 0.4;
        sparkAttr.setY(i, sy);
      }
      sparkAttr.needsUpdate = true;

      // Dynamic Time-of-Day & Weather Cloud Shading (Day / Sunset / Night / Rainy)
      const targetCloudTopColor =
        effectiveMode === 'day'
          ? sunColorDay
          : effectiveMode === 'sunset'
          ? sunColorSunset
          : effectiveMode === 'rainy'
          ? sunColorRainy
          : cloudTopNightColor;
      const targetCloudUnderColor =
        effectiveMode === 'day'
          ? cloudUnderDayColor
          : effectiveMode === 'sunset'
          ? cloudUnderSunsetColor
          : effectiveMode === 'rainy'
          ? cloudUnderRainyColor
          : cloudUnderNightColor;
      const targetCloudOpacity =
        effectiveMode === 'day'
          ? 0.78
          : effectiveMode === 'sunset'
          ? 0.76
          : effectiveMode === 'rainy'
          ? 0.84
          : 0.42;

      cloudCoreMat.color.lerp(targetCloudTopColor, dt * 2.5);
      cloudUnderbellyMat.color.lerp(targetCloudUnderColor, dt * 2.5);
      cloudSpriteMat.color.lerp(targetCloudTopColor, dt * 2.5);
      cloudCoreMat.opacity += (targetCloudOpacity - cloudCoreMat.opacity) * dt * 2.5;
      cloudUnderbellyMat.opacity +=
        (targetCloudOpacity * 0.82 - cloudUnderbellyMat.opacity) * dt * 2.5;
      cloudSpriteMat.opacity +=
        (targetCloudOpacity * 0.74 - cloudSpriteMat.opacity) * dt * 2.5;

      driftingClouds.forEach((cl) => {
        cl.angle += dt * cl.speed;
        cl.group.position.set(
          Math.cos(cl.angle) * cl.radius,
          cl.baseY + Math.sin(elapsedTotal * 0.55 + cl.phase) * 0.14,
          Math.sin(cl.angle) * cl.radius - 2.5
        );
        cl.group.rotation.y = -cl.angle + Math.PI / 2;
      });

      // 3. Landmark & Machinery Animations (Tuned to Realistic Physical Scale)
      hqCrystal.rotation.y += dt * 0.45;
      hqCrystal.position.y = 6.78 + Math.sin(elapsedTotal * 1.35) * 0.1;
      hqHaloRing.rotation.z -= dt * 0.35;
      hqInnerRing.rotation.x += dt * 0.62;
      hqInnerRing.rotation.y -= dt * 0.48;
      hqHoloTickerRing.rotation.y += dt * 0.55;

      // Smoothly Glide Exterior Glass Elevators along the Headquarters Skyscraper Facades
      hqElevatorPods.forEach((pod, idx) => {
        const elevCycle = Math.sin(elapsedTotal * 0.65 + idx * Math.PI);
        pod.position.y = 2.75 + elevCycle * 1.25;
      });

      // Distant Futuristic Skyline Spire Crowns & Neon Billboard Shimmer
      skylineSpireCrowns.forEach((crown, idx) => {
        crown.rotation.y += dt * (0.45 + (idx % 3) * 0.15);
      });

      // Blinking FAA Red Aviation Obstacle Beacons on Skyscraper Antennas
      const beaconPulse = 1.4 + Math.sin(elapsedTotal * 3.2) * 1.1;
      aviationBeacons.forEach((b) => {
        const mat = b.material as THREE.MeshStandardMaterial;
        mat.emissiveIntensity = beaconPulse;
      });

      // Sparkling Central Park Fountain Water Jets
      fountainWaterJets.forEach((jet) => {
        const jCycle = (elapsedTotal * 1.65 + jet.phase) % 1;
        const r = 0.28 + jCycle * 0.56;
        const h = 0.25 + Math.sin(jCycle * Math.PI) * 0.42;
        jet.mesh.position.set(
          Math.cos(jet.angle) * r,
          h,
          Math.sin(jet.angle) * r
        );
        jet.mesh.scale.setScalar(0.65 + Math.sin(jCycle * Math.PI) * 0.55);
      });

      // Slewing 3D City Tower Crane & Animated Hard-Hat Construction Workers
      towerCraneSlewingUnit.rotation.y = Math.sin(elapsedTotal * 0.32) * 0.85;
      towerCraneHookGroup.position.x = 1.25 + Math.sin(elapsedTotal * 0.68) * 0.45;

      constructionWorkers.forEach((cw) => {
        cw.rightArm.rotation.x = -0.65 + Math.sin(elapsedTotal * 5.2 + cw.phase) * 0.55;
        cw.leftArm.rotation.x = -0.25 + Math.cos(elapsedTotal * 2.6 + cw.phase) * 0.18;
        cw.head.rotation.y = Math.sin(elapsedTotal * 1.5 + cw.phase) * 0.25;
        cw.tail.rotation.z = Math.sin(elapsedTotal * 3.8 + cw.phase) * 0.2;
      });

      mascotStatue.rotation.y = Math.sin(elapsedTotal * 0.85) * 0.22;

      // Hero 3D Fox Mascot: Idle, Walk, Run, Turning Lean & Tap Interaction Animation
      if (mascotInteractTimer > 0) {
        mascotInteractTimer = Math.max(0, mascotInteractTimer - dt);
      }
      let currentMascotState = mascotModeRef.current;
      if (mascotInteractTimer > 0) {
        currentMascotState = 'interact';
      } else if (currentMascotState === 'auto') {
        const phaseSlot = Math.floor((elapsedTotal / 6) % 3);
        currentMascotState = (['walk', 'run', 'idle'] as FoxMascotAnimMode[])[phaseSlot];
      }

      if (currentMascotState === 'interact') {
        heroAuraRing.visible = true;
        heroAuraRing.rotation.z += dt * 3.8;
        const jumpBounce = Math.abs(Math.sin(elapsedTotal * 7.5)) * 0.22;
        heroMascotGroup.position.y = 0.08 + jumpBounce;
        heroMascotGroup.rotation.y += dt * 4.2;
        heroMascotGroup.rotation.z = 0;
        heroLegL.rotation.x = Math.sin(elapsedTotal * 7.5) * 0.35;
        heroLegR.rotation.x = -Math.sin(elapsedTotal * 7.5) * 0.35;
        heroArmL.rotation.x = -0.5 + Math.sin(elapsedTotal * 9.0) * 0.25;
        heroArmR.rotation.x = -2.2 + Math.sin(elapsedTotal * 12.0) * 0.45; // Joyful wave salute
        heroHead.rotation.y = Math.sin(elapsedTotal * 5.0) * 0.28;
        heroTail.rotation.z = Math.sin(elapsedTotal * 11.0) * 0.48;
      } else if (currentMascotState === 'idle') {
        heroAuraRing.visible = false;
        heroMascotGroup.position.y = 0.08;
        heroMascotGroup.rotation.z = 0;
        heroLegL.rotation.x = 0;
        heroLegR.rotation.x = 0;
        heroArmL.rotation.x = Math.sin(elapsedTotal * 1.8) * 0.1;
        heroArmR.rotation.x = -Math.sin(elapsedTotal * 1.8) * 0.1;
        heroHead.rotation.y = Math.sin(elapsedTotal * 1.5) * 0.35;
        heroTail.rotation.z = Math.sin(elapsedTotal * 3.2) * 0.25;
      } else {
        heroAuraRing.visible = false;
        const isRunning = currentMascotState === 'run';
        const angularSpeed = isRunning ? 0.88 : 0.42;
        const strideFreq = isRunning ? 10.5 : 6.2;
        heroAngle += dt * angularSpeed;
        const radius = 1.12;
        const hx = 1.3 + Math.cos(heroAngle) * radius;
        const hz = 1.3 + Math.sin(heroAngle) * radius;
        const nextHx = 1.3 + Math.cos(heroAngle + 0.1) * radius;
        const nextHz = 1.3 + Math.sin(heroAngle + 0.1) * radius;
        heroMascotGroup.position.set(
          hx,
          0.08 + (isRunning ? Math.abs(Math.sin(elapsedTotal * strideFreq)) * 0.06 : 0),
          hz
        );
        heroMascotGroup.lookAt(nextHx, 0.08, nextHz);
        // Subtle inward banking while turning along the circular plaza path
        heroMascotGroup.rotation.z = isRunning ? 0.085 : 0.04;
        const swing = Math.sin(elapsedTotal * strideFreq) * (isRunning ? 0.68 : 0.42);
        heroLegL.rotation.x = swing;
        heroLegR.rotation.x = -swing;
        heroArmL.rotation.x = -swing * 0.75;
        heroArmR.rotation.x = swing * 0.75;
        heroHead.rotation.y = Math.sin(elapsedTotal * 1.6) * 0.12;
        heroTail.rotation.z = Math.sin(elapsedTotal * 5.5) * 0.28;
      }

      mineDrillWheel.rotation.x += dt * 1.1;
      mineOreCart.position.z = 1.38 + Math.sin(elapsedTotal * 0.95) * 0.24;
      mineLaserBeam.scale.set(
        0.85 + Math.sin(elapsedTotal * 6.5) * 0.25,
        1,
        0.85 + Math.sin(elapsedTotal * 6.5) * 0.25
      );
      mineCrystalClusters.forEach((cSpire, cIdx) => {
        cSpire.rotation.y = Math.sin(elapsedTotal * 1.4 + cIdx) * 0.08;
      });

      factoryGear1.rotation.z += dt * 0.85;
      factoryGear2.rotation.z -= dt * 1.15;
      factoryRoboticArm.rotation.y = Math.sin(elapsedTotal * 1.2) * 0.55;
      factoryBullionIngot.position.x = -0.62 + Math.sin(elapsedTotal * 1.2) * 0.34;

      labCoreSphere.scale.setScalar(1 + Math.sin(elapsedTotal * 2.1) * 0.06);
      labRing1.rotation.x += dt * 0.65;
      labRing1.rotation.y += dt * 0.48;
      labRing2.rotation.z -= dt * 0.82;
      labSatDish.rotation.y = Math.sin(elapsedTotal * 0.42) * 0.65;
      labQuantumPivot.rotation.y -= dt * 1.25;
      labQuantumPivot.rotation.z = Math.sin(elapsedTotal * 0.9) * 0.22;

      marketHoloCoin.rotation.z += dt * 1.4;
      marketHoloCoin.position.y = 2.55 + Math.sin(elapsedTotal * 2.2) * 0.08;
      marketDeliveryDrone.position.set(
        Math.cos(elapsedTotal * 0.95) * 1.25,
        1.48 + Math.sin(elapsedTotal * 2.6) * 0.12,
        1.15 + Math.sin(elapsedTotal * 0.95) * 0.38
      );
      marketDeliveryDrone.rotation.y = -elapsedTotal * 0.95;

      turbineRotor.rotation.z -= dt * 1.35;
      powerPlasmaArc.scale.setScalar(0.92 + Math.sin(elapsedTotal * 9.5) * 0.14);

      // Realistic Helicopter Smooth Wide Patrol Path + Forward Nose Alignment + Dual Spinning Rotors
      const heliAngle = elapsedTotal * 0.26;
      const heliX = 4.2 + Math.cos(heliAngle) * 6.8;
      const heliY = 5.45 + Math.sin(elapsedTotal * 1.1) * 0.16;
      const heliZ = -5.8 + Math.sin(heliAngle) * 4.0;
      const nextHeliAngle = heliAngle + 0.05;
      const nextHeliX = 4.2 + Math.cos(nextHeliAngle) * 6.8;
      const nextHeliZ = -5.8 + Math.sin(nextHeliAngle) * 4.0;
      helicopterGroup.position.set(heliX, heliY, heliZ);
      helicopterGroup.lookAt(nextHeliX, heliY - 0.04, nextHeliZ);
      heliMainRotor.rotation.y += dt * 20;
      heliTailRotor.rotation.x += dt * 24;

      if (clickBounceTimer > 0) {
        clickBounceTimer = Math.max(0, clickBounceTimer - dt);
      }

      const showFineLod = ctrl.distance < 32.0;
      (Object.keys(buildingGroups) as FoxCityBuildingId[]).forEach((bId) => {
        const grp = buildingGroups[bId];
        if (!grp) return;
        const isSel = selectedBuildingRef.current === bId;
        const isHov = hoveredBuildingRef.current === bId;
        const bounceBoost =
          clickBounceBuildingId === bId && clickBounceTimer > 0
            ? Math.sin((clickBounceTimer / 0.36) * Math.PI) * 0.12
            : 0;
        const targetScale = (isSel ? 1.055 : isHov ? 1.035 : 1.0) + bounceBoost;
        const currentScale = grp.scale.x;
        const nextScale = currentScale + (targetScale - currentScale) * Math.min(1, dt * 14);
        grp.scale.setScalar(nextScale);

        // Sync Building Level Architectural Progression & Distance LOD
        const tiers = buildingLevelVisuals[bId];
        if (tiers) {
          const bState = buildingStatesRef.current?.[bId];
          const lv = bState?.displayLevel ?? 1;
          tiers.level2Group.visible = lv >= 1;
          tiers.level3Group.visible = lv >= 2;
          tiers.level4PlusGroup.visible = lv >= 3;
          tiers.lodDetailGroup.visible = showFineLod;
        }
      });

      const activeRingBuildingId = selectedBuildingRef.current || hoveredBuildingRef.current;
      if (activeRingBuildingId && buildingGroups[activeRingBuildingId]) {
        const bCfg = FOX_CITY_BUILDINGS.find((b) => b.id === activeRingBuildingId);
        if (bCfg) {
          selectionRingGroup.visible = true;
          selectionRingGroup.position.set(bCfg.position[0], 0.14, bCfg.position[2]);
          selectionRingGroup.rotation.z += dt * 1.6;
          const pulse = 1 + Math.sin(elapsedTotal * 4.2) * 0.06;
          selectionRingGroup.scale.setScalar(pulse);

          // Animate 3D Holographic Laser Construction Rig around the active/upgraded building
          upgradeRigGroup.visible =
            selectedBuildingRef.current === activeRingBuildingId || clickBounceTimer > 0;
          upgradeRigGroup.position.set(bCfg.position[0], bCfg.position[1], bCfg.position[2]);
          upgradeLowerRing.position.y = 0.95 + Math.sin(elapsedTotal * 2.4) * 0.45;
          upgradeLowerRing.rotation.z += dt * 1.8;
          upgradeUpperRing.position.y = 1.85 - Math.sin(elapsedTotal * 2.4) * 0.42;
          upgradeUpperRing.rotation.z -= dt * 2.2;
        }
      } else {
        selectionRingGroup.visible = false;
        upgradeRigGroup.visible = false;
      }

      waterfallDrops.forEach((drop) => {
        const p = (elapsedTotal * 1.25 + drop.userData.phase) % 1.45;
        drop.position.y = 0.05 - p;
      });
      steamPuffs.forEach((puff) => {
        const cycle = (elapsedTotal * 0.46 + puff.userData.phase) % 1.8;
        puff.position.y = 3.55 + cycle * 0.9;
        puff.position.x =
          puff.userData.originX + Math.sin(elapsedTotal * 0.7 + puff.userData.phase) * 0.16;
        puff.scale.setScalar(0.75 + cycle * 0.6);
      });

      swayingTrees.forEach((tree, idx) => {
        tree.rotation.z = Math.sin(elapsedTotal * 1.15 + idx) * 0.024;
      });

      // 4. Intersection Traffic Signal Phase & Realistic Vehicle Stopping at Intersections
      const signalCycle = elapsedTotal % 13.0;
      const eastWestGreen = signalCycle < 6.5;
      trafficSignals.forEach((sig) => {
        const isGreen = sig.isEastWest ? eastWestGreen : !eastWestGreen;
        const redMat = sig.redBulb.material as THREE.MeshStandardMaterial;
        const greenMat = sig.greenBulb.material as THREE.MeshStandardMaterial;
        redMat.emissiveIntensity = isGreen ? 0.15 : 2.6;
        greenMat.emissiveIntensity = isGreen ? 2.6 : 0.15;
      });

      vehicles.forEach((v, vIdx) => {
        // Sync distance-based vehicle LOD (door handles, brake calipers, wipers, exhausts, roof pods)
        v.lodDetailGroup.visible = showFineLod;

        const loop = vehicleClosedLoops[v.loopIndex];
        const previewTurn = sampleClosedLoop(loop, v.distanceOnLoop, tempPos, tempLookAt);
        const dirX = tempLookAt.x - tempPos.x;
        const dirZ = tempLookAt.z - tempPos.z;

        // Check if approaching a red traffic signal stop-line on Midtown Ring Boulevard (loops 0 & 1)
        let shouldStopForSignal = false;
        if (v.loopIndex === 0 || v.loopIndex === 1) {
          if (!eastWestGreen) {
            // East-West avenues have RED signal: stop before crosswalks at X = ±4.85
            if (dirX > 0.92 && tempPos.x > 3.35 && tempPos.x < 4.45) {
              shouldStopForSignal = true;
            } else if (dirX < -0.92 && tempPos.x < -3.35 && tempPos.x > -4.45) {
              shouldStopForSignal = true;
            }
          } else {
            // North-South avenues have RED signal: stop before intersections at Z = -0.56 and Z = +3.16
            if (dirZ > 0.92 && tempPos.z > 1.75 && tempPos.z < 2.85) {
              shouldStopForSignal = true;
            } else if (dirZ < -0.92 && tempPos.z < 0.75 && tempPos.z > -0.35) {
              shouldStopForSignal = true;
            }
          }
        }

        // Also check safe car-following distance to any vehicle ahead in the same lane (accounting for vehicle lengths)
        let shouldYieldToCarAhead = false;
        for (let otherIdx = 0; otherIdx < vehicles.length; otherIdx++) {
          if (otherIdx === vIdx) continue;
          const other = vehicles[otherIdx];
          if (other.loopIndex !== v.loopIndex) continue;
          const minSafeGap = (v.vehicleLength + other.vehicleLength) * 0.5 + 1.15;
          const gapAhead =
            (other.distanceOnLoop - v.distanceOnLoop + loop.totalLength) % loop.totalLength;
          if (gapAhead > 0.08 && gapAhead < minSafeGap) {
            shouldYieldToCarAhead = true;
            break;
          }
        }

        const cornerSpeedFactor = 1 - Math.min(0.22, Math.abs(previewTurn) * 0.25);
        const targetSpeed =
          shouldStopForSignal || shouldYieldToCarAhead
            ? 0
            : v.baseSpeed * cornerSpeedFactor;

        v.currentSpeed = Math.max(
          0,
          THREE.MathUtils.lerp(
            v.currentSpeed,
            targetSpeed,
            Math.min(1, dt * (targetSpeed === 0 ? 5.8 : 3.4))
          )
        );

        const stepDist = Math.max(0, v.currentSpeed * dt);
        v.distanceOnLoop = (v.distanceOnLoop + stepDist) % loop.totalLength;
        const steerAngle = sampleClosedLoop(loop, v.distanceOnLoop, tempPos, tempLookAt);
        v.mesh.position.copy(tempPos);

        const moveDx = tempLookAt.x - tempPos.x;
        const moveDz = tempLookAt.z - tempPos.z;
        if (moveDx * moveDx + moveDz * moveDz > 1e-8) {
          const headingYaw = Math.atan2(moveDx, moveDz);
          v.mesh.rotation.set(0, headingYaw, 0);
        }

        // Exact physical angular velocity for forward tire rolling: dTheta = dS / R
        const wheelAngleStep = stepDist / v.wheelRadius;
        v.wheels.forEach((w) => {
          w.rotation.x += wheelAngleStep;
        });

        // Front-wheel steering into corners
        v.frontSteerPivots.forEach((pivot) => {
          pivot.rotation.y += (steerAngle - pivot.rotation.y) * Math.min(1, dt * 8.5);
        });

        // Subtle engine vibration & cornering suspension body roll
        const speedNorm = v.baseSpeed > 0 ? v.currentSpeed / v.baseSpeed : 0;
        v.bodyGroup.position.y = Math.sin(elapsedTotal * 14 + vIdx) * 0.003 * speedNorm;
        v.bodyGroup.rotation.z = -steerAngle * 0.065 * speedNorm;

        if (v.beaconLight) {
          v.beaconLight.scale.setScalar(1 + Math.sin(elapsedTotal * 10 + vIdx) * 0.22);
        }
      });

      // 5. Animated Ocean Caustics, Counter-Scrolling Normal Waves, Rolling 3D Sea Waves & Harbor Ships
      oceanWaterTex.offset.x = (elapsedTotal * 0.018) % 1;
      oceanWaterTex.offset.y = (elapsedTotal * 0.013) % 1;
      oceanWaterNormalTex.offset.x = (1 - ((elapsedTotal * 0.024) % 1)) % 1;
      oceanWaterNormalTex.offset.y = (elapsedTotal * 0.019) % 1;

      const waterPosAttr = waterGeo.getAttribute('position') as THREE.BufferAttribute;
      for (let i = 0; i < waterPosAttr.count; i++) {
        const wx = waterPosAttr.getX(i);
        const wy = waterPosAttr.getY(i);
        const waveH =
          Math.sin(wx * 0.28 + elapsedTotal * 1.15) * 0.068 +
          Math.cos(wy * 0.32 + elapsedTotal * 0.92) * 0.058;
        waterPosAttr.setZ(i, waveH);
      }
      waterPosAttr.needsUpdate = true;

      islandFoamRing.scale.set(
        1.1 + Math.sin(elapsedTotal * 1.35) * 0.015,
        0.92 + Math.cos(elapsedTotal * 1.35) * 0.015,
        1
      );

      // Animate Port Gantry Crane Trolley along the Harbor Pier Berth
      let anyShipDockedAtPier = false;
      const DOCK_BERTH_DISTANCE = 8.6; // Directly in front of Harbor Pier (-1.2, -1.42, 10.6) on Sea Loop 0
      const DOCK_DURATION_SECONDS = 4.5;

      boats.forEach((boat) => {
        const seaLoop = shipClosedLoops[boat.loopIndex];

        // Periodic Port Docking Logic for Inner Harbor Ships (Sea Loop 0)
        if (boat.loopIndex === 0) {
          const distToBerth = DOCK_BERTH_DISTANCE - boat.distanceOnLoop;

          // Reset lap docking flag after sailing past the pier into the eastern return leg
          if (boat.distanceOnLoop > 18.0 && boat.hasDockedThisLap) {
            boat.hasDockedThisLap = false;
          }

          if (boat.isDocked) {
            anyShipDockedAtPier = true;
            boat.dockTimer -= dt;
            boat.currentSpeed = THREE.MathUtils.lerp(boat.currentSpeed, 0, Math.min(1, dt * 6));
            if (boat.dockTimer <= 0) {
              boat.isDocked = false;
              boat.hasDockedThisLap = true;
            }
          } else if (!boat.hasDockedThisLap && distToBerth >= -0.25 && distToBerth <= 2.8) {
            // Smoothly decelerate as the vessel approaches the city port pier
            if (distToBerth <= 0.22) {
              boat.isDocked = true;
              boat.dockTimer = DOCK_DURATION_SECONDS;
              boat.currentSpeed = 0;
              anyShipDockedAtPier = true;
            } else {
              const approachRatio = Math.max(0.18, distToBerth / 2.8);
              const targetApproachSpeed = boat.speed * approachRatio;
              boat.currentSpeed = THREE.MathUtils.lerp(
                boat.currentSpeed,
                targetApproachSpeed,
                Math.min(1, dt * 4.5)
              );
            }
          } else {
            // Smoothly accelerate back to normal cruising speed after undocking
            boat.currentSpeed = THREE.MathUtils.lerp(
              boat.currentSpeed,
              boat.speed,
              Math.min(1, dt * 1.85)
            );
          }
        } else {
          boat.currentSpeed = boat.speed;
        }

        const stepDist = boat.currentSpeed * dt;
        boat.distanceOnLoop = (boat.distanceOnLoop + stepDist) % seaLoop.totalLength;
        const turnRate = sampleClosedLoop(seaLoop, boat.distanceOnLoop, tempPos, tempLookAt);
        const speedRatio = boat.speed > 0 ? boat.currentSpeed / boat.speed : 0;

        // Buoyancy heave & pitch synced to 3D ocean waves (calmer while moored at dock)
        const heaveAmp = boat.isDocked ? 0.022 : 0.04;
        const waveHeave = Math.sin(elapsedTotal * 1.55 + boat.phase) * heaveAmp;
        boat.group.position.set(tempPos.x, boat.baseY + waveHeave, tempPos.z);
        boat.group.lookAt(tempLookAt.x, boat.baseY + waveHeave, tempLookAt.z);

        // Realistic wave roll + gentle rudder banking into turns
        const rollAmp = boat.isDocked ? 0.024 : 0.048;
        boat.shipBody.rotation.z =
          Math.sin(elapsedTotal * 1.4 + boat.phase) * rollAmp - turnRate * 0.1 * speedRatio;
        boat.shipBody.rotation.x =
          Math.cos(elapsedTotal * 1.75 + boat.phase) * (boat.isDocked ? 0.015 : 0.026);

        // Spin underwater twin bronze propellers proportional to current vessel speed
        boat.propellers.forEach((prop, pIdx) => {
          prop.rotation.z +=
            dt * (2.0 + 11.5 * speedRatio) * (pIdx % 2 === 0 ? 1 : -1);
        });

        // Spin marine X-band radar scanner at realistic RPM
        if (boat.radarSpinner) {
          boat.radarSpinner.rotation.y += dt * 2.4;
        }

        // Subtle slewing motion on cargo freighter deck crane
        if (boat.cranePivot) {
          boat.cranePivot.rotation.y = Math.sin(elapsedTotal * 0.55 + boat.phase) * 0.42;
        }

        // Fluttering stern ensign flag
        if (boat.flagMesh) {
          boat.flagMesh.rotation.y = Math.sin(elapsedTotal * 5.2 + boat.phase) * 0.22;
        }

        // Stern propeller wash wake fades smoothly when ship slows down & docks at the port
        if (boat.wakeMesh) {
          const wakeScale = Math.max(0.15, speedRatio);
          const wakePulse = (0.88 + Math.sin(elapsedTotal * 3.6 + boat.phase) * 0.1) * wakeScale;
          boat.wakeMesh.scale.set(wakePulse, (0.35 + 0.65 * speedRatio), 1);
          boat.wakeMesh.visible = speedRatio > 0.08;
        }
      });

      // Operate the Harbor Port Gantry Crane Trolley actively when a ship is docked at the pier
      portCraneTrolley.position.z = anyShipDockedAtPier
        ? 0.72 + Math.sin(elapsedTotal * 1.8) * 0.35
        : 0.95 + Math.sin(elapsedTotal * 0.45) * 0.12;

      // 6. Collision-Free Sidewalk Fox Citizens (Realistic Pedestrian Walking Pace)
      foxNpcs.forEach((npc) => {
        const loop = npcSidewalkLoops[npc.loopIndex];
        npc.distanceOnLoop = (npc.distanceOnLoop + npc.baseSpeed * dt) % loop.totalLength;
        sampleClosedLoop(loop, npc.distanceOnLoop, tempPos, tempLookAt);
        npc.group.position.copy(tempPos);
        npc.group.lookAt(tempLookAt);

        const swing = Math.sin(elapsedTotal * 6.2 + npc.phase) * 0.45;
        npc.leftLeg.rotation.x = swing;
        npc.rightLeg.rotation.x = -swing;
        npc.leftArm.rotation.x = -swing * 0.68;
        npc.rightArm.rotation.x = swing * 0.68;
        npc.tail.rotation.z = Math.sin(elapsedTotal * 4.2 + npc.phase) * 0.22;
      });

      if (renderer.shadowMap.enabled && labelFrameCounter % 4 === 0) {
        renderer.shadowMap.needsUpdate = true;
      }

      if (usePostProcessing) {
        composer.render(dt);
      } else {
        renderer.render(scene, camera);
      }

      // 7. Update 2D Projected Building Badges (Only update React state when coordinates actually change!)
      labelFrameCounter++;
      if (labelFrameCounter % 3 === 0 && container) {
        const w = container.clientWidth;
        const h = container.clientHeight;
        const rawLabels: ProjectedLabel[] = FOX_CITY_BUILDINGS.map((b) => {
          const roofHeightBoost = b.id === 'headquarters' ? 2.45 : 1.15;
          const worldVec = new THREE.Vector3(
            b.position[0],
            b.position[1] + roofHeightBoost,
            b.position[2]
          );
          worldVec.project(camera);
          const x = Math.round(
            THREE.MathUtils.clamp((worldVec.x * 0.5 + 0.5) * w, 46, w - 46)
          );
          const y = Math.round(
            THREE.MathUtils.clamp((-(worldVec.y * 0.5) + 0.5) * h, 26, h - 58)
          );
          const visible =
            worldVec.z < 1 && x >= 36 && x <= w - 36 && y >= 22 && y <= h - 46;
          return { id: b.id, x, y, visible };
        });

        // Resolve any overlapping 2D callout badges so compact labels never collide
        const minDx = 78;
        const minDy = 26;
        for (let pass = 0; pass < 2; pass++) {
          for (let i = 0; i < rawLabels.length; i++) {
            if (!rawLabels[i].visible) continue;
            for (let j = i + 1; j < rawLabels.length; j++) {
              if (!rawLabels[j].visible) continue;
              const dx = rawLabels[j].x - rawLabels[i].x;
              const dy = rawLabels[j].y - rawLabels[i].y;
              if (Math.abs(dx) < minDx && Math.abs(dy) < minDy) {
                const pushY = (minDy - Math.abs(dy)) * 0.52 * (dy >= 0 ? 1 : -1 || 1);
                rawLabels[i].y = Math.round(
                  THREE.MathUtils.clamp(rawLabels[i].y - pushY, 24, h - 56)
                );
                rawLabels[j].y = Math.round(
                  THREE.MathUtils.clamp(rawLabels[j].y + pushY, 24, h - 56)
                );
              }
            }
          }
        }

        const nextSig = rawLabels
          .map((l) => `${l.id}:${l.x},${l.y},${l.visible ? 1 : 0}`)
          .join('|');
        if (nextSig !== (container as any).__lastLabelSig) {
          (container as any).__lastLabelSig = nextSig;
          setLabels(rawLabels);
        }

        const nextCompass = Math.round((ctrl.azimuth * 180) / Math.PI);
        if (nextCompass !== (container as any).__lastCompassDeg) {
          (container as any).__lastCompassDeg = nextCompass;
          setCompassDeg(nextCompass);
        }
      }
    };

    setIsLoaded(true);
    animFrameId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animFrameId);
      window.removeEventListener('resize', handleResize);
      domElem.removeEventListener('pointerdown', handlePointerDown);
      domElem.removeEventListener('pointermove', handlePointerMove);
      domElem.removeEventListener('pointerup', handlePointerUp);
      domElem.removeEventListener('pointercancel', handlePointerUp);
      domElem.removeEventListener('wheel', handleWheel);
      domElem.removeEventListener('contextmenu', handleContextMenu);

      composer.dispose();
      composerRenderTarget.dispose();
      envTarget.dispose();
      dracoLoader.dispose();
      buildingAssets.dispose();
      vehicleFleetBuilder.dispose();
      sharedGeometryCache.forEach((geo) => geo.dispose());
      sharedGeometryCache.clear();
      gltfModelCache.clear();
      pbrGeneratedTextures.forEach((tex) => tex.dispose());
      skylineBillboardMats.forEach((m) => {
        if (m.map) m.map.dispose();
        m.dispose();
      });
      scene.traverse((obj) => {
        const mesh = obj as THREE.Mesh;
        if (mesh.geometry) mesh.geometry.dispose();
        if (mesh.material) {
          if (Array.isArray(mesh.material)) {
            mesh.material.forEach((m) => m.dispose());
          } else {
            mesh.material.dispose();
          }
        }
      });
      renderer.dispose();
    };
  }, [qualityTier]);

  if (webglError) {
    return (
      <div className="w-full h-[380px] rounded-2xl bg-[#0B0E17] border border-amber-500/40 p-4 flex flex-col items-center justify-center text-center">
        <p className="text-xs font-bold text-amber-300 mb-2">
          3D Hardware Acceleration Unavailable — Interactive District Grid Active
        </p>
        <div className="grid grid-cols-2 gap-2 w-full max-w-xs">
          {FOX_CITY_BUILDINGS.map((b) => {
            const st = buildingStates[b.id];
            return (
              <button
                key={b.id}
                type="button"
                onClick={() => onSelectBuilding(b.id)}
                className="p-2 rounded-xl bg-[#141824] border border-amber-500/40 text-left hover:border-amber-300"
              >
                <div className="text-xs font-black text-white">{b.shortName}</div>
                <div className="text-[10px] text-amber-300 font-bold">
                  Lv. {st?.displayLevel || b.defaultDisplayLevel}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`relative w-full ${
        isFullScreen ? 'h-[520px] sm:h-[600px]' : 'h-[410px] sm:h-[460px]'
      } rounded-[22px] overflow-hidden bg-[#080B12] select-none transition-all duration-300`}
    >
      {/* 1. REAL-TIME 60FPS 3D ANIMATED WEBGL CITY */}
      <div
        ref={containerRef}
        className="w-full h-full cursor-grab active:cursor-grabbing"
      />

      {!isLoaded && (
        <div className="absolute inset-0 bg-[#0B0E17]/90 flex flex-col items-center justify-center z-30">
          <div className="w-9 h-9 rounded-full border-2 border-amber-400 border-t-transparent animate-spin mb-2" />
          <span className="text-xs font-black text-amber-300 tracking-wider uppercase">
            Initializing FOX CITY 3D World...
          </span>
        </div>
      )}

      <div className="absolute inset-0 pointer-events-none ring-1 ring-inset ring-amber-400/50 rounded-[22px] z-20" />

      {/* Ornate N / E / S / W Star Compass Rose (Bottom-Left) */}
      <div className="absolute bottom-2.5 left-2.5 z-20 pointer-events-none flex items-center gap-2">
        <div className="relative w-11 h-11 rounded-full bg-[#090C15]/90 border border-amber-400/65 shadow-[0_4px_14px_rgba(0,0,0,0.85)] flex items-center justify-center">
          <span className="absolute top-0.5 text-[7px] font-black text-amber-300">N</span>
          <span className="absolute bottom-0.5 text-[7px] font-bold text-slate-400">S</span>
          <span className="absolute left-1 text-[7px] font-bold text-slate-400">W</span>
          <span className="absolute right-1 text-[7px] font-bold text-slate-400">E</span>
          <Compass
            className="w-5 h-5 text-amber-400 transition-transform duration-150"
            style={{
              transform: `rotate(${compassDeg}deg)`,
            }}
          />
        </div>
        <div className="px-2.5 py-1 rounded-full bg-[#090C15]/85 border border-amber-500/40 backdrop-blur-sm shadow-md">
          <span className="text-[9px] font-bold text-amber-100 tracking-tight">
            Drag: 360° Orbit • Pinch: Zoom • Tap Building
          </span>
        </div>
      </div>

      {/* Bottom-Right Interactive Radar Mini-Map */}
      <div className="absolute bottom-2.5 right-2.5 z-20 flex flex-col items-end gap-1.5">
        {showMiniMap && (
          <div className="relative w-24 h-24 rounded-2xl bg-[#080B13]/92 border border-amber-400/55 shadow-[0_6px_20px_rgba(0,0,0,0.85)] backdrop-blur-md p-1.5 overflow-hidden">
            <div className="w-full h-full rounded-xl bg-gradient-to-br from-emerald-950/60 via-[#101827] to-sky-950/70 border border-amber-500/20 relative">
              <div className="absolute inset-x-2 top-1/2 h-[2px] bg-amber-400/25" />
              <div className="absolute inset-y-2 left-1/2 w-[2px] bg-amber-400/25" />
              {FOX_CITY_BUILDINGS.map((b) => {
                const isSel = selectedBuildingId === b.id;
                const isHov = hoveredBuildingId === b.id;
                return (
                  <button
                    key={b.id}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      const nextId = isSel ? null : b.id;
                      onSelectBuilding(nextId, nextId ? buildingStates[nextId] : undefined);
                    }}
                    title={b.name}
                    style={{
                      left: `${b.mapCoords[0]}%`,
                      top: `${b.mapCoords[1]}%`,
                      transform: 'translate(-50%, -50%)',
                    }}
                    className={`absolute rounded-full transition-all cursor-pointer ${
                      isSel
                        ? 'w-3 h-3 bg-amber-300 ring-2 ring-amber-400 animate-ping'
                        : isHov
                        ? 'w-2.5 h-2.5 bg-amber-200 ring-2 ring-amber-300/70 scale-125'
                        : 'w-2 h-2 bg-amber-400/90 hover:scale-125'
                    }`}
                  />
                );
              })}
            </div>
            <span className="absolute bottom-1 left-2 text-[7px] font-black uppercase tracking-wider text-amber-300/80 pointer-events-none">
              City Radar
            </span>
          </div>
        )}

        <button
          type="button"
          onClick={() => setShowMiniMap((prev) => !prev)}
          className="px-2.5 py-1 rounded-full bg-[#090C15]/88 border border-amber-500/50 text-[9px] font-extrabold text-amber-300 flex items-center gap-1 cursor-pointer hover:border-amber-300 shadow-lg"
        >
          <MapIcon className="w-3 h-3" />
          <span>{showMiniMap ? 'Hide Radar' : 'City Radar'}</span>
        </button>
      </div>

      {/* Compact, Elegant 2D Projected Building Badges (Elevated above rooftops so they never cover buildings) */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-10">
        {labels.map((lbl) => {
          if (!lbl.visible) return null;
          const b = FOX_CITY_BUILDINGS.find((item) => item.id === lbl.id);
          if (!b) return null;
          const resolved = buildingStates[b.id];
          const isSelected = selectedBuildingId === b.id;
          const isHovered = hoveredBuildingId === b.id;

          return (
            <button
              key={b.id}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                const nextId = isSelected ? null : b.id;
                onSelectBuilding(nextId, nextId ? resolved : undefined);
              }}
              style={{
                left: `${lbl.x}px`,
                top: `${lbl.y}px`,
                transform: 'translate(-50%, -100%)',
              }}
              className="pointer-events-auto absolute flex flex-col items-center group cursor-pointer transition-transform duration-150 active:scale-95"
            >
              <div
                className={`flex items-center gap-1 px-1.5 py-0.5 rounded-full shadow-[0_2px_10px_rgba(0,0,0,0.85)] backdrop-blur-md border transition-all ${
                  isSelected
                    ? 'bg-gradient-to-r from-[#2A1E0B]/95 to-[#16120B]/95 border-amber-300 ring-1 ring-amber-400/60 scale-105 z-20'
                    : isHovered
                    ? 'bg-[#171E2E]/95 border-amber-300 scale-105 z-20'
                    : 'bg-[#0A0D15]/82 border-amber-400/60 hover:border-amber-300'
                }`}
              >
                <div className="w-3.5 h-3.5 rounded-full bg-[#1C160B] border border-amber-400/55 flex items-center justify-center shrink-0">
                  {renderBadgeIcon(b.iconType)}
                </div>
                <span className="text-[8.5px] font-extrabold text-white/95 whitespace-nowrap tracking-tight leading-none">
                  {b.shortName}
                </span>
                <span className="text-[8px] font-black text-amber-300 whitespace-nowrap leading-none pl-0.5 border-l border-amber-400/30">
                  Lv.{resolved?.displayLevel || b.defaultDisplayLevel}
                </span>
              </div>
              <div className="w-[1px] h-1.5 bg-gradient-to-b from-amber-400/80 to-transparent" />
            </button>
          );
        })}
      </div>
    </div>
  );
};
