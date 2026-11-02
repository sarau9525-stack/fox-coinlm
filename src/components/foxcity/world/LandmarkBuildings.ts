import * as THREE from 'three';
import { FoxCityBuildingId } from '../foxCityTypes.js';
import {
  BuildingAssetsRegistry,
  BuildingLevelVisualTiers,
  MetropolitanMaterialPalette,
} from './BuildingAssets.js';

export interface LandmarkBuildingsBuildContext {
  buildingAssets: BuildingAssetsRegistry;
  mats: MetropolitanMaterialPalette;
  foxLogoMat: THREE.Material;
  stripedAwningMat: THREE.Material;
  marketSignMat: THREE.Material;
  buildingLevelVisuals: Partial<Record<FoxCityBuildingId, BuildingLevelVisualTiers>>;
  createBuildingLevelTiers: (parentGroup: THREE.Group) => BuildingLevelVisualTiers;
  getExtrudedOctagonTier: (radius: number, height: number, bevelSize?: number) => THREE.BufferGeometry;
  getExtrudedPortalArch: (
    outerW: number,
    outerH: number,
    innerW: number,
    innerH: number,
    depth: number
  ) => THREE.BufferGeometry;
  addSkyGardenTerrace: (
    target: THREE.Group,
    x: number,
    y: number,
    z: number,
    w: number,
    d: number
  ) => void;
  buildSculpted3DFoxEmblem: (scale?: number) => THREE.Group;
  loadOptionalBuildingGlb: (
    id: FoxCityBuildingId,
    targetGroup: THREE.Group,
    proceduralCoreGroup: THREE.Group
  ) => void;
  registerBuildingGroup: (id: FoxCityBuildingId, group: THREE.Group) => void;
  worldGroup: THREE.Group;
}

export interface HeadquartersBuildHandles {
  hqCrystal: THREE.Mesh;
  hqHaloRing: THREE.Mesh;
  hqInnerRing: THREE.Mesh;
  hqSkyBeam: THREE.Mesh;
  hqElevatorPods: THREE.Group[];
  hqNeonRibs: THREE.Mesh[];
  hqHoloTickerRing: THREE.Group;
  aviationBeacons: THREE.Mesh[];
}

export interface RemainingLandmarksBuildHandles {
  mineCrystalClusters: THREE.Mesh[];
  mineOreCart: THREE.Group;
  mineDrillWheel: THREE.Mesh;
  mineLaserBeam: THREE.Mesh;
  stackPositions: number[];
  factoryGear1: THREE.Mesh;
  factoryGear2: THREE.Mesh;
  factoryBullionIngot: THREE.Mesh;
  factoryRoboticArm: THREE.Group;
  labCoreSphere: THREE.Mesh;
  labRing1: THREE.Mesh;
  labRing2: THREE.Mesh;
  holoDisplayRing: THREE.Mesh;
  labSatDish: THREE.Group;
  labQuantumPivot: THREE.Group;
  marketHoloCoin: THREE.Mesh;
  marketDeliveryDrone: THREE.Group;
  powerCoil: THREE.Mesh;
  turbineRotor: THREE.Group;
  powerPlasmaArc: THREE.Mesh;
  upgradeRigGroup: THREE.Group;
  upgradeLowerRing: THREE.Mesh;
  upgradeUpperRing: THREE.Mesh;
}

/**
 * Rebuilds BUILDING 1: FOX HEADQUARTERS as a monumental, multi-tiered supertall
 * skyscraper with deep recessed curtain-wall windows, visible multi-story floor slabs,
 * structural gold diagrid exoskeleton (30% FOX signature identity), grand colonnade lobby,
 * cantilevered sky-gardens, exterior glass elevators, and rotating Genesis Crystal spire.
 */
export function buildRedesignedHeadquarters(
  ctx: LandmarkBuildingsBuildContext
): HeadquartersBuildHandles {
  const {
    buildingAssets,
    mats,
    buildingLevelVisuals,
    createBuildingLevelTiers,
    getExtrudedOctagonTier,
    getExtrudedPortalArch,
    addSkyGardenTerrace,
    buildSculpted3DFoxEmblem,
    loadOptionalBuildingGlb,
    registerBuildingGroup,
  } = ctx;

  const getBeveledBox = buildingAssets.getBeveledBox.bind(buildingAssets);

  const hqGroup = new THREE.Group();
  hqGroup.position.set(0, 0.72, -7.2);
  const hqCore = new THREE.Group();
  hqGroup.add(hqCore);
  const hqTiers = createBuildingLevelTiers(hqGroup);

  // ---------------------------------------------------------------------------
  // STAGE 1: MONUMENTAL BLACK-GRANITE & CONCRETE COLONNADE ATRIUM PODIUM (Y = 0 to 1.56)
  // ---------------------------------------------------------------------------
  const hqPodiumSlab = new THREE.Mesh(
    getBeveledBox(3.85, 0.16, 3.35, 0.04),
    mats.sidewalkMat
  );
  hqPodiumSlab.position.y = 0.08;
  hqCore.add(hqPodiumSlab);

  const hqPodiumStep2 = new THREE.Mesh(
    getBeveledBox(3.52, 0.16, 3.02, 0.035),
    mats.obsidianMat
  );
  hqPodiumStep2.position.y = 0.22;
  hqCore.add(hqPodiumStep2);

  // Grand Front Entrance Staircase (+Z facade)
  for (let s = 0; s < 3; s++) {
    const stair = new THREE.Mesh(
      getBeveledBox(1.92 - s * 0.12, 0.055, 0.24, 0.01),
      mats.architecturalConcreteMat
    );
    stair.position.set(0, 0.05 + s * 0.055, 1.72 - s * 0.08);
    hqCore.add(stair);
  }

  // 3-Story Beveled Octagonal Black-Glass & Obsidian Atrium Podium Base
  const hqOctBase = new THREE.Mesh(
    getExtrudedOctagonTier(2.24, 1.26, 0.05),
    mats.obsidianMat
  );
  hqOctBase.position.y = 0.28;
  hqCore.add(hqOctBase);

  // Podium Curtain-Wall Glazing & Horizontal Brushed-Steel Spandrel Bands
  const podiumGlassCore = new THREE.Mesh(
    new THREE.CylinderGeometry(2.16, 2.20, 1.12, 8),
    mats.hqCurtainGlassMat
  );
  podiumGlassCore.rotation.y = Math.PI / 8;
  podiumGlassCore.position.y = 0.88;
  hqCore.add(podiumGlassCore);

  [0.64, 1.04, 1.44].forEach((py, idx) => {
    const podiumBand = new THREE.Mesh(
      new THREE.CylinderGeometry(2.26, 2.26, 0.048, 8),
      idx === 2 ? mats.goldMetalMat : mats.industrialSteelMat
    );
    podiumBand.rotation.y = Math.PI / 8;
    podiumBand.position.y = py;
    hqCore.add(podiumBand);
  });

  // Grand Recessed Portal Arch, Revolving Glass Door Vestibule & Cantilevered Canopy (+Z)
  const hqPortalArch = new THREE.Mesh(
    getExtrudedPortalArch(1.64, 1.10, 1.18, 0.88, 0.26),
    mats.obsidianMat
  );
  hqPortalArch.position.set(0, 0.24, 1.68);
  hqCore.add(hqPortalArch);

  const lobbyCanopy = new THREE.Mesh(
    getBeveledBox(1.96, 0.075, 0.72, 0.02),
    mats.obsidianMat
  );
  lobbyCanopy.position.set(0, 1.14, 1.86);
  hqCore.add(lobbyCanopy);

  const canopyGoldEdge = new THREE.Mesh(
    new THREE.BoxGeometry(1.98, 0.028, 0.74),
    mats.goldMetalMat
  );
  canopyGoldEdge.position.set(0, 1.14, 1.86);
  hqCore.add(canopyGoldEdge);

  const lobbyGlassDoors = new THREE.Mesh(
    getBeveledBox(1.18, 0.86, 0.16, 0.02),
    mats.carGlassMat
  );
  lobbyGlassDoors.position.set(0, 0.6, 1.62);
  hqCore.add(lobbyGlassDoors);

  // 6 Fluted Structural Colonnade Columns along the Grand Entrance Facade
  [-0.86, -0.54, -0.24, 0.24, 0.54, 0.86].forEach((px, idx) => {
    const col = new THREE.Mesh(
      new THREE.CylinderGeometry(0.052, 0.065, 0.96, 12),
      idx === 0 || idx === 5 ? mats.goldMetalMat : mats.industrialSteelMat
    );
    col.position.set(px, 0.62, 1.92);
    hqCore.add(col);
  });

  // Landscaped Sky-Gardens on Podium Setback Terraces
  addSkyGardenTerrace(hqCore, -1.38, 1.56, 1.18, 0.84, 0.56);
  addSkyGardenTerrace(hqCore, 1.38, 1.56, 1.18, 0.84, 0.56);

  // ---------------------------------------------------------------------------
  // STAGE 2: ICONIC TAPERED CHAMFERED BLACK-GLASS SUPERTALL OBELISK (Y = 1.50 to 6.12)
  // (Replaces old stacked rectangular boxes with a sleek tapered 8-sided architectural spire)
  // ---------------------------------------------------------------------------
  const buildTaperedFacetedShaftTier = (
    tierBaseY: number,
    tierH: number,
    rBotX: number,
    rBotZ: number,
    rTopX: number,
    rTopZ: number,
    floorCount: number
  ) => {
    // Inner structural dark obsidian core
    const innerCore = new THREE.Mesh(
      new THREE.CylinderGeometry(0.92, 1.0, tierH, 8),
      mats.obsidianMat
    );
    innerCore.rotation.y = Math.PI / 8;
    innerCore.scale.set(rBotX * 0.96, 1, rBotZ * 0.96);
    innerCore.position.y = tierBaseY + tierH * 0.5;
    innerCore.castShadow = true;
    innerCore.receiveShadow = true;
    hqCore.add(innerCore);

    // Outer recessed mirror-black curtain-wall glass skin
    const ratioTop = rTopX / rBotX;
    const curtainGlass = new THREE.Mesh(
      new THREE.CylinderGeometry(ratioTop, 1.0, tierH * 0.98, 8),
      mats.hqCurtainGlassMat
    );
    curtainGlass.rotation.y = Math.PI / 8;
    curtainGlass.scale.set(rBotX, 1, rBotZ);
    curtainGlass.position.y = tierBaseY + tierH * 0.5;
    curtainGlass.castShadow = true;
    curtainGlass.receiveShadow = true;
    hqCore.add(curtainGlass);

    // Floor-by-floor brushed steel & fine champagne-gold spandrel rings
    for (let f = 0; f <= floorCount; f++) {
      const t = f / floorCount;
      const curScale = THREE.MathUtils.lerp(1.0, ratioTop, t) * 1.025;
      const isGoldFloor = f === floorCount || f % 4 === 0;
      const floorRing = new THREE.Mesh(
        new THREE.CylinderGeometry(curScale, curScale, isGoldFloor ? 0.048 : 0.034, 8),
        isGoldFloor ? mats.goldMetalMat : mats.industrialSteelMat
      );
      floorRing.rotation.y = Math.PI / 8;
      floorRing.scale.set(rBotX, 1, rBotZ);
      floorRing.position.y = tierBaseY + t * tierH;
      hqCore.add(floorRing);
    }

    // 8 Tapered Corner Structural Mullion Fins + 3D External Gold Diagrid Exoskeleton Bracing
    for (let c = 0; c < 8; c++) {
      const ang = (c / 8) * Math.PI * 2 + Math.PI / 8;
      const nextAng = ((c + 1) / 8) * Math.PI * 2 + Math.PI / 8;
      const midR = (1.0 + ratioTop) * 0.5 * 0.99;
      const slopeAngle = Math.atan2((1.0 - ratioTop) * rBotX, tierH);
      const fin = new THREE.Mesh(
        new THREE.BoxGeometry(0.068, tierH + 0.04, 0.068),
        c % 2 === 0 ? mats.obsidianMat : mats.goldMetalMat
      );
      fin.position.set(
        Math.cos(ang) * rBotX * midR,
        tierBaseY + tierH * 0.5,
        Math.sin(ang) * rBotZ * midR
      );
      fin.rotation.y = -ang;
      fin.rotation.z = slopeAngle * 0.45;
      hqCore.add(fin);

      // External 3D Diamond Diagrid Structural Struts across each Octagonal Face
      const faceMidX = ((Math.cos(ang) + Math.cos(nextAng)) * 0.5) * rBotX * midR * 1.01;
      const faceMidZ = ((Math.sin(ang) + Math.sin(nextAng)) * 0.5) * rBotZ * midR * 1.01;
      const faceRotY = -((ang + nextAng) * 0.5) + Math.PI / 2;
      const faceWidth = Math.hypot(
        (Math.cos(nextAng) - Math.cos(ang)) * rBotX * midR,
        (Math.sin(nextAng) - Math.sin(ang)) * rBotZ * midR
      );
      const diagLen = Math.hypot(faceWidth, tierH * 0.5);
      const diagTilt = Math.atan2(faceWidth, tierH * 0.5);

      [-1, 1].forEach((dirSign) => {
        const diagStrut = new THREE.Mesh(
          new THREE.CylinderGeometry(0.022, 0.022, diagLen, 6),
          c % 2 === 0 ? mats.goldMetalMat : mats.industrialSteelMat
        );
        diagStrut.position.set(faceMidX, tierBaseY + tierH * 0.5, faceMidZ);
        diagStrut.rotation.y = faceRotY;
        diagStrut.rotation.z = dirSign * diagTilt;
        hqCore.add(diagStrut);
      });
    }
  };

  // Tier 1 Lower Supertall Shaft (Y = 1.50 to 3.72, 6 floors)
  buildTaperedFacetedShaftTier(1.50, 2.22, 1.56, 1.42, 1.32, 1.20, 6);

  // Mid-Tower Cantilevered Sky-Lobby Observation Ring at Y = 3.76
  const skyLobbyRing = new THREE.Mesh(
    new THREE.CylinderGeometry(1.44, 1.40, 0.22, 16),
    mats.carGlassMat
  );
  skyLobbyRing.scale.set(1.0, 1, 0.92);
  skyLobbyRing.position.y = 3.78;
  hqCore.add(skyLobbyRing);

  const skyLobbyGoldTrim = new THREE.Mesh(
    new THREE.CylinderGeometry(1.46, 1.46, 0.045, 16),
    mats.goldMetalMat
  );
  skyLobbyGoldTrim.scale.set(1.0, 1, 0.92);
  skyLobbyGoldTrim.position.y = 3.90;
  hqCore.add(skyLobbyGoldTrim);

  // Tier 2 Upper Executive Shaft (Y = 3.92 to 5.42, 4 floors)
  buildTaperedFacetedShaftTier(3.92, 1.50, 1.24, 1.14, 0.98, 0.90, 4);

  // Upper Setback Sky-Garden Balconies on Left & Right Ledges
  addSkyGardenTerrace(hqCore, -1.16, 3.92, 0, 0.42, 1.28);
  addSkyGardenTerrace(hqCore, 1.16, 3.92, 0, 0.42, 1.28);

  // Tier 3 Tapered Sovereign Penthouse Crown (Y = 5.42 to 6.12, 2 floors)
  buildTaperedFacetedShaftTier(5.42, 0.70, 0.92, 0.86, 0.72, 0.68, 2);

  // Sculpted 3D Architectural FOX Emblem Reliefs on Front (+Z) & Rear (-Z) Curtain Walls
  const foxEmblemFront = buildSculpted3DFoxEmblem(0.88);
  foxEmblemFront.position.set(0, 4.72, 1.06);
  hqCore.add(foxEmblemFront);

  const foxEmblemBack = buildSculpted3DFoxEmblem(0.88);
  foxEmblemBack.rotation.y = Math.PI;
  foxEmblemBack.position.set(0, 4.72, -1.06);
  hqCore.add(foxEmblemBack);

  // Sculpted Diagonal Architectural Crown Fins framing the Summit Spire
  for (let f = 0; f < 4; f++) {
    const fAng = (f * Math.PI) / 2 + Math.PI / 4;
    const crownFin = new THREE.Mesh(
      getBeveledBox(0.10, 0.72, 0.28, 0.02),
      mats.goldMetalMat
    );
    crownFin.position.set(
      Math.cos(fAng) * 0.68,
      6.28,
      Math.sin(fAng) * 0.64
    );
    crownFin.rotation.y = -fAng + Math.PI / 2;
    crownFin.rotation.x = 0.24;
    hqCore.add(crownFin);
  }

  // Swept Curved Glass East & West Buttress Atrium Wings & Skybridges (In hqCore so always visible!)
  [-1.72, 1.72].forEach((wx) => {
    const wingH = 2.68;
    const wingRx = 0.58;
    const wingRz = 0.94;

    const curvedWing = new THREE.Mesh(
      new THREE.CylinderGeometry(0.84, 1.02, wingH, 20),
      mats.hqCurtainGlassMat
    );
    curvedWing.scale.set(wingRx, 1, wingRz);
    curvedWing.position.set(wx, 0.28 + wingH * 0.5, -0.06);
    curvedWing.castShadow = true;
    curvedWing.receiveShadow = true;
    hqCore.add(curvedWing);

    for (let wf = 1; wf <= 6; wf++) {
      const t = wf / 6;
      const rCur = THREE.MathUtils.lerp(1.02, 0.84, t) * 1.03;
      const wRing = new THREE.Mesh(
        new THREE.CylinderGeometry(rCur, rCur, 0.038, 20),
        wf === 6 ? mats.goldMetalMat : mats.industrialSteelMat
      );
      wRing.scale.set(wingRx, 1, wingRz);
      wRing.position.set(wx, 0.28 + t * wingH, -0.06);
      hqCore.add(wRing);
    }

    // Sloped Crown Fin atop each Curved Buttress Wing
    const wingCrown = new THREE.Mesh(
      new THREE.CylinderGeometry(0.82, 0.86, 0.22, 20),
      mats.goldMetalMat
    );
    wingCrown.scale.set(wingRx, 1, wingRz);
    wingCrown.position.set(wx, 0.28 + wingH + 0.08, -0.06);
    wingCrown.rotation.z = wx < 0 ? -0.22 : 0.22;
    hqCore.add(wingCrown);

    addSkyGardenTerrace(hqCore, wx, 0.28 + wingH + 0.08, 0.12, 0.68, 0.68);

    const hvacBox = new THREE.Mesh(
      getBeveledBox(0.38, 0.22, 0.44, 0.02),
      mats.industrialSteelMat
    );
    hvacBox.position.set(wx, 0.28 + wingH + 0.18, -0.38);
    hqTiers.lodDetailGroup.add(hvacBox);
  });

  // Elevated Glazed Sky-Bridges linking Main Supertall Tower to East/West Curved Wings
  [-1.28, 1.28].forEach((bx) => {
    const skyBridge = new THREE.Mesh(
      getBeveledBox(0.56, 0.30, 0.46, 0.025),
      mats.carGlassMat
    );
    skyBridge.position.set(bx, 2.25, 0);
    hqCore.add(skyBridge);

    const bridgeGoldFrame = new THREE.Mesh(
      getBeveledBox(0.58, 0.045, 0.48, 0.012),
      mats.goldMetalMat
    );
    bridgeGoldFrame.position.set(bx, 2.41, 0);
    hqCore.add(bridgeGoldFrame);
  });

  // Exterior Panoramic Glass Elevator Shafts & Moving Cabins
  const hqElevatorPods: THREE.Group[] = [];
  [-0.92, 0.92].forEach((ex) => {
    const shaftTrack = new THREE.Mesh(
      getBeveledBox(0.15, 3.65, 0.12, 0.02),
      mats.carGlassMat
    );
    shaftTrack.position.set(ex, 3.18, 1.18);
    hqCore.add(shaftTrack);

    const elevatorPod = new THREE.Group();
    const cabinShell = new THREE.Mesh(
      getBeveledBox(0.22, 0.32, 0.18, 0.025),
      mats.obsidianMat
    );
    const cabinGlow = new THREE.Mesh(
      getBeveledBox(0.18, 0.24, 0.2, 0.02),
      mats.windowGlowMat
    );
    elevatorPod.add(cabinShell, cabinGlow);
    elevatorPod.position.set(ex, 2.75, 1.2);
    hqCore.add(elevatorPod);
    hqElevatorPods.push(elevatorPod);
  });

  // Twin Rooftop Broadcast Masts with Red FAA Aviation Beacons
  const aviationBeacons: THREE.Mesh[] = [];
  [-0.56, 0.56].forEach((ax) => {
    const mast = new THREE.Mesh(
      new THREE.CylinderGeometry(0.018, 0.036, 1.22, 8),
      mats.industrialSteelMat
    );
    mast.position.set(ax, 6.66, -0.44);
    hqCore.add(mast);

    const beacon = new THREE.Mesh(
      new THREE.SphereGeometry(0.055, 8, 8),
      new THREE.MeshStandardMaterial({
        color: 0xef4444,
        emissive: 0xdc2626,
        emissiveIntensity: 2.2,
      })
    );
    beacon.position.set(ax, 7.28, -0.44);
    hqCore.add(beacon);
    aviationBeacons.push(beacon);
  });

  // ---------------------------------------------------------------------------
  // STAGE 5: CROWN SPIRE PEDESTAL, GENESIS CRYSTAL & GYROSCOPIC RINGS
  // ---------------------------------------------------------------------------
  const hqSpirePedestal = new THREE.Mesh(
    getExtrudedOctagonTier(0.68, 0.36, 0.03),
    mats.obsidianMat
  );
  hqSpirePedestal.position.y = 6.12;
  hqCore.add(hqSpirePedestal);

  const hqCrystal = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.68, 0),
    mats.amberCrystalMat
  );
  hqCrystal.scale.set(0.76, 1.68, 0.76);
  hqCrystal.position.set(0, 6.78, 0);
  hqCore.add(hqCrystal);

  const hqHaloRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.96, 0.042, 10, 32),
    mats.goldMetalMat
  );
  hqHaloRing.rotation.x = Math.PI / 2;
  hqHaloRing.position.set(0, 6.52, 0);
  hqCore.add(hqHaloRing);

  const hqInnerRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.68, 0.034, 8, 28),
    mats.amberCrystalMat
  );
  hqInnerRing.position.set(0, 6.78, 0);
  hqCore.add(hqInnerRing);

  const hqSkyBeam = new THREE.Mesh(
    new THREE.CylinderGeometry(0.06, 0.28, 2.4, 14, 1, true),
    new THREE.MeshBasicMaterial({
      color: 0xfbbf24,
      transparent: true,
      opacity: 0.16,
      depthWrite: false,
      side: THREE.DoubleSide,
    })
  );
  hqSkyBeam.position.set(0, 7.85, 0);
  hqCore.add(hqSkyBeam);

  // Vertical Corner Accent Ribs & Rotating Ring
  const hqNeonRibs: THREE.Mesh[] = [];
  [
    [-1.22, -1.12],
    [1.22, -1.12],
    [-1.22, 1.12],
    [1.22, 1.12],
  ].forEach(([rx, rz]) => {
    const neonRib = new THREE.Mesh(
      getBeveledBox(0.055, 3.45, 0.055, 0.015),
      mats.goldMetalMat
    );
    neonRib.position.set(rx, 2.55, rz);
    hqCore.add(neonRib);
    hqNeonRibs.push(neonRib);
  });

  const hqHoloTickerRing = new THREE.Group();
  hqHoloTickerRing.position.set(0, 3.84, 0);
  const tickerTorus = new THREE.Mesh(
    new THREE.TorusGeometry(1.52, 0.032, 8, 36),
    mats.goldMetalMat
  );
  tickerTorus.rotation.x = Math.PI / 2;
  hqHoloTickerRing.add(tickerTorus);
  for (let n = 0; n < 6; n++) {
    const ang = (n * Math.PI * 2) / 6;
    const holoNode = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.085, 0),
      mats.amberCrystalMat
    );
    holoNode.position.set(Math.cos(ang) * 1.52, 0, Math.sin(ang) * 1.52);
    hqHoloTickerRing.add(holoNode);
  }
  hqCore.add(hqHoloTickerRing);

  buildingLevelVisuals.headquarters = hqTiers;
  loadOptionalBuildingGlb('headquarters', hqGroup, hqCore);
  registerBuildingGroup('headquarters', hqGroup);

  return {
    hqCrystal,
    hqHaloRing,
    hqInnerRing,
    hqSkyBeam,
    hqElevatorPods,
    hqNeonRibs,
    hqHoloTickerRing,
    aviationBeacons,
  };
}

/**
 * Rebuilds BUILDINGS 2–8 (Mine, Factory, Research Lab, Marketplace, Residential District,
 * Power Plant, Helipad) with genuinely distinct, non-box 3D architectural geometry.
 */
export function buildRemainingRedesignedLandmarks(
  ctx: LandmarkBuildingsBuildContext,
  aviationBeacons: THREE.Mesh[]
): RemainingLandmarksBuildHandles {
  const {
    buildingAssets,
    mats,
    stripedAwningMat,
    marketSignMat,
    buildingLevelVisuals,
    createBuildingLevelTiers,
    getExtrudedOctagonTier,
    getExtrudedPortalArch,
    addSkyGardenTerrace,
    loadOptionalBuildingGlb,
    registerBuildingGroup,
    worldGroup,
  } = ctx;

  const getBeveledBox = buildingAssets.getBeveledBox.bind(buildingAssets);

  // ===========================================================================
  // BUILDING 2: FOX MINING CENTER — STEPPED SLOPED-ROOF ORE CONCENTRATOR MILL,
  // TWIN CYLINDRICAL SILO TOWERS, OCTAGONAL SMELTER & STEEL HEADFRAME at (-7.8, 0.72, -7.2)
  // ===========================================================================
  const mineGroup = new THREE.Group();
  mineGroup.position.set(-7.8, 0.72, -7.2);
  const mineCore = new THREE.Group();
  mineGroup.add(mineCore);
  const mineTiers = createBuildingLevelTiers(mineGroup);

  // 1. Heavy Industrial Concrete Foundation Pad & Stepped Quarry Amphitheater
  const mineFoundation = new THREE.Mesh(
    getBeveledBox(3.75, 0.14, 3.15, 0.03),
    mats.architecturalConcreteMat
  );
  mineFoundation.position.y = 0.07;
  mineCore.add(mineFoundation);

  [
    [-1.58, 0.52, -0.92, 0.78, 1.05, 0.72],
    [1.62, 0.58, -0.88, 0.84, 1.15, 0.76],
    [-1.38, 0.38, 0.98, 0.58, 0.72, 0.55],
    [1.42, 0.44, 0.94, 0.64, 0.78, 0.58],
  ].forEach(([rx, ry, rz, sx, sy, sz], idx) => {
    const outcrop = new THREE.Mesh(
      new THREE.DodecahedronGeometry(0.65, 1),
      idx % 2 === 0 ? mats.cliffRockMat : mats.cliffHighlightRockMat
    );
    outcrop.position.set(rx, ry, rz);
    outcrop.scale.set(sx, sy, sz);
    outcrop.rotation.set(idx * 0.4, idx * 0.8, 0);
    mineCore.add(outcrop);
  });

  // 2. Sculpted Multi-Tier Sloped-Roof Ore Concentrator & Crusher Hall (Non-box extruded gable profile)
  const millShape = new THREE.Shape();
  millShape.moveTo(-1.25, 0.14);
  millShape.lineTo(1.05, 0.14);
  millShape.lineTo(1.05, 1.65);
  // Sloped industrial crusher roof stepping up to highbay concentrator ridge
  millShape.lineTo(0.35, 2.38);
  millShape.lineTo(-0.75, 2.38);
  millShape.lineTo(-1.25, 1.82);
  millShape.closePath();

  const millExtrudeGeo = new THREE.ExtrudeGeometry(millShape, {
    depth: 1.78,
    bevelEnabled: true,
    bevelSegments: 2,
    steps: 1,
    bevelSize: 0.03,
    bevelThickness: 0.03,
  });
  millExtrudeGeo.translate(0, 0, -0.89);
  millExtrudeGeo.computeVertexNormals();

  const mineMillBuilding = new THREE.Mesh(millExtrudeGeo, mats.industrialSteelMat);
  mineMillBuilding.position.set(-0.12, 0, -0.22);
  mineMillBuilding.castShadow = true;
  mineMillBuilding.receiveShadow = true;
  mineCore.add(mineMillBuilding);

  // External Heavy Steel I-Beam Portal Frames & Clerestory Industrial Glazing Bands
  [-0.95, -0.42, 0.12, 0.65].forEach((bx) => {
    const steelPortalCol = new THREE.Mesh(
      getBeveledBox(0.09, 2.05, 1.92, 0.015),
      mats.darkGraphiteMat
    );
    steelPortalCol.position.set(bx, 1.12, -0.22);
    mineCore.add(steelPortalCol);
  });

  [0.72, 1.38].forEach((wy) => {
    const windowStrip = new THREE.Mesh(
      getBeveledBox(2.12, 0.28, 1.88, 0.015),
      mats.carGlassMat
    );
    windowStrip.position.set(-0.12, wy, -0.22);
    mineCore.add(windowStrip);
  });

  // 3. Octagonal Smelting & Bullion Assay Furnace Tower on East Side (+X) with Conical Hood
  const smelterTower = new THREE.Mesh(
    new THREE.CylinderGeometry(0.66, 0.76, 1.88, 8),
    mats.architecturalConcreteMat
  );
  smelterTower.rotation.y = Math.PI / 8;
  smelterTower.position.set(1.22, 1.08, -0.18);
  smelterTower.castShadow = true;
  mineCore.add(smelterTower);

  const smelterConicalRoof = new THREE.Mesh(
    new THREE.ConeGeometry(0.74, 0.52, 8),
    mats.darkGraphiteMat
  );
  smelterConicalRoof.rotation.y = Math.PI / 8;
  smelterConicalRoof.position.set(1.22, 2.28, -0.18);
  mineCore.add(smelterConicalRoof);

  const smelterGlowBand = new THREE.Mesh(
    new THREE.CylinderGeometry(0.72, 0.72, 0.24, 8),
    mats.amberCrystalMat
  );
  smelterGlowBand.rotation.y = Math.PI / 8;
  smelterGlowBand.position.set(1.22, 1.48, -0.18);
  mineCore.add(smelterGlowBand);

  // Exterior Steel Maintenance Catwalks & Angled Industrial StairFlights
  [0.72, 1.38].forEach((cy, idx) => {
    const catwalk = new THREE.Mesh(
      getBeveledBox(2.45, 0.05, 0.24, 0.01),
      mats.darkGraphiteMat
    );
    catwalk.position.set(-0.12, cy, 0.84);
    mineCore.add(catwalk);

    const handrail = new THREE.Mesh(
      new THREE.BoxGeometry(2.45, 0.09, 0.02),
      mats.goldMetalMat
    );
    handrail.position.set(-0.12, cy + 0.07, 0.94);
    mineCore.add(handrail);

    const stairFlight = new THREE.Mesh(
      new THREE.BoxGeometry(0.68, 0.05, 0.18),
      mats.industrialSteelMat
    );
    stairFlight.position.set(-0.65 + idx * 0.85, cy - 0.28, 0.88);
    stairFlight.rotation.z = 0.52;
    mineCore.add(stairFlight);
  });

  // 4. Heavy Structural Steel A-Frame Headframe Hoisting Tower, Winding Sheave Wheels & Hoist House
  [-0.58, 0.58].forEach((hx) => {
    const legFront = new THREE.Mesh(
      new THREE.CylinderGeometry(0.065, 0.085, 1.85, 8),
      mats.darkGraphiteMat
    );
    legFront.position.set(hx - 0.18, 3.05, 0.18);
    legFront.rotation.x = -0.22;
    mineCore.add(legFront);

    const legBack = new THREE.Mesh(
      new THREE.CylinderGeometry(0.065, 0.085, 1.85, 8),
      mats.darkGraphiteMat
    );
    legBack.position.set(hx - 0.18, 3.05, -0.58);
    legBack.rotation.x = 0.22;
    mineCore.add(legBack);

    const brace = new THREE.Mesh(
      getBeveledBox(0.06, 0.06, 0.64, 0.01),
      mats.industrialSteelMat
    );
    brace.position.set(hx - 0.18, 3.08, -0.2);
    mineCore.add(brace);
  });

  const headframeCrossbeam = new THREE.Mesh(
    getBeveledBox(1.48, 0.20, 0.42, 0.03),
    mats.goldMetalMat
  );
  headframeCrossbeam.position.set(-0.18, 3.82, -0.2);
  mineCore.add(headframeCrossbeam);

  // Twin Top Hoist Sheave Pulley Wheels atop Headframe
  [-0.38, 0.04].forEach((sx) => {
    const sheaveWheel = new THREE.Mesh(
      new THREE.TorusGeometry(0.24, 0.035, 8, 16),
      mats.brightGoldMat
    );
    sheaveWheel.rotation.y = Math.PI / 2;
    sheaveWheel.position.set(sx, 4.08, -0.2);
    mineCore.add(sheaveWheel);
  });

  // 5. Twin Cylindrical Ore Storage Silos & Elevated Tubular Conveyor Gallery (In mineCore so always visible!)
  [-0.38, 0.46].forEach((sz, idx) => {
    const oreSilo = new THREE.Mesh(
      new THREE.CylinderGeometry(0.48, 0.48, 2.15, 18),
      mats.industrialSteelMat
    );
    oreSilo.position.set(-1.68, 1.15, sz);
    oreSilo.castShadow = true;
    oreSilo.receiveShadow = true;
    mineCore.add(oreSilo);

    // Structural Steel Reinforcing Hoops on Silos
    [0.65, 1.25, 1.85].forEach((hy) => {
      const hoop = new THREE.Mesh(
        new THREE.TorusGeometry(0.49, 0.025, 6, 18),
        mats.darkGraphiteMat
      );
      hoop.rotation.x = Math.PI / 2;
      hoop.position.set(-1.68, hy, sz);
      mineCore.add(hoop);
    });

    const oreSiloCap = new THREE.Mesh(
      new THREE.ConeGeometry(0.52, 0.42, 18),
      idx === 0 ? mats.darkGraphiteMat : mats.goldMetalMat
    );
    oreSiloCap.position.set(-1.68, 2.42, sz);
    mineCore.add(oreSiloCap);
  });

  const siloChute = new THREE.Mesh(
    new THREE.CylinderGeometry(0.16, 0.16, 1.25, 12),
    mats.goldMetalMat
  );
  siloChute.rotation.z = 0.62;
  siloChute.position.set(-1.18, 1.85, 0.05);
  mineCore.add(siloChute);

  const cycloneUnit = new THREE.Mesh(
    new THREE.CylinderGeometry(0.36, 0.12, 1.15, 14),
    mats.industrialSteelMat
  );
  cycloneUnit.position.set(-1.68, 1.25, -0.92);
  mineCore.add(cycloneUnit);

  // 6. Reinforced Underground Excavation Tunnel Portal Arch & Glowing Amber Vein
  const portalArch = new THREE.Mesh(
    getExtrudedPortalArch(1.56, 1.22, 1.04, 0.92, 0.42),
    mats.architecturalConcreteMat
  );
  portalArch.position.set(0, 0.08, 1.02);
  mineCore.add(portalArch);

  const mineCavernGlow = new THREE.Mesh(
    getBeveledBox(1.04, 0.9, 0.28, 0.025),
    mats.amberCrystalMat
  );
  mineCavernGlow.position.set(0, 0.52, 0.95);
  mineCore.add(mineCavernGlow);

  const mineCrystalClusters: THREE.Mesh[] = [];
  [
    [-0.98, 0.42, 1.24, 0.24, 0.72, 0.24, -0.22],
    [-1.22, 0.32, 1.1, 0.18, 0.5, 0.18, -0.38],
    [0.98, 0.44, 1.22, 0.26, 0.76, 0.26, 0.24],
    [1.22, 0.32, 1.08, 0.19, 0.54, 0.19, 0.36],
    [0.68, 2.48, -0.55, 0.22, 0.62, 0.22, 0.15],
  ].forEach(([cx, cy, cz, sx, sy, sz, tilt]) => {
    const crystalSpire = new THREE.Mesh(
      new THREE.OctahedronGeometry(1, 0),
      mats.amberCrystalMat
    );
    crystalSpire.scale.set(sx, sy, sz);
    crystalSpire.position.set(cx, cy, cz);
    crystalSpire.rotation.z = tilt;
    mineCore.add(crystalSpire);
    mineCrystalClusters.push(crystalSpire);
  });

  // 7. Steel Ore Rail Ramp, Animated Ore Cart, Rotary Bucket Excavator Wheel & Laser
  const conveyorRamp = new THREE.Mesh(
    getBeveledBox(0.8, 0.18, 1.28, 0.03),
    mats.obsidianMat
  );
  conveyorRamp.position.set(0, 0.26, 1.38);
  mineCore.add(conveyorRamp);

  [-0.36, 0.36].forEach((rx) => {
    const rail = new THREE.Mesh(
      getBeveledBox(0.05, 0.08, 1.28, 0.01),
      mats.industrialSteelMat
    );
    rail.position.set(rx, 0.36, 1.38);
    mineCore.add(rail);
  });

  const mineOreCart = new THREE.Group();
  const cartBox = new THREE.Mesh(
    getBeveledBox(0.52, 0.34, 0.64, 0.04),
    mats.darkGraphiteMat
  );
  cartBox.position.y = 0.24;
  mineOreCart.add(cartBox);
  const cartCrystal = new THREE.Mesh(
    new THREE.DodecahedronGeometry(0.25, 0),
    mats.amberCrystalMat
  );
  cartCrystal.position.y = 0.46;
  mineOreCart.add(cartCrystal);
  mineOreCart.position.set(0, 0.36, 1.38);
  mineCore.add(mineOreCart);

  const mineDrillWheel = new THREE.Mesh(
    new THREE.TorusGeometry(0.58, 0.11, 8, 18),
    mats.industrialSteelMat
  );
  mineDrillWheel.position.set(1.56, 1.15, 0.25);
  mineDrillWheel.rotation.y = Math.PI / 2;
  mineCore.add(mineDrillWheel);

  const mineLaserBeam = new THREE.Mesh(
    new THREE.CylinderGeometry(0.035, 0.085, 1.15, 8),
    mats.amberCrystalMat
  );
  mineLaserBeam.rotation.x = Math.PI / 2.2;
  mineLaserBeam.position.set(0, 0.78, 1.32);
  mineCore.add(mineLaserBeam);

  buildingLevelVisuals.mine = mineTiers;
  loadOptionalBuildingGlb('mine', mineGroup, mineCore);
  registerBuildingGroup('mine', mineGroup);

  // ===========================================================================
  // BUILDING 3: FOX FACTORY — MULTI-BAY VAULTED BARREL-ARCH FOUNDRY HALLS,
  // HYPERBOLOID COOLING TOWER, REFINERY SILOS & 3 CHIMNEYS at (7.8, 0.72, -7.2)
  // ===========================================================================
  const factoryGroup = new THREE.Group();
  factoryGroup.position.set(7.8, 0.72, -7.2);
  const factoryCore = new THREE.Group();
  factoryGroup.add(factoryCore);
  const factoryTiers = createBuildingLevelTiers(factoryGroup);

  // 1. Concrete Industrial Apron Slab
  const factorySlab = new THREE.Mesh(
    getBeveledBox(3.85, 0.14, 3.15, 0.03),
    mats.architecturalConcreteMat
  );
  factorySlab.position.y = 0.07;
  factoryCore.add(factorySlab);

  // 2. 3-Bay Sculpted Vaulted Barrel-Arch Industrial Production Halls (Replaces plain rectangular box!)
  [-0.86, 0.04, 0.94].forEach((bayX, bayIdx) => {
    const bayW = 0.92;
    const bayH = bayIdx === 1 ? 2.18 : 1.88;
    const bayD = 2.16;

    // Lower Structural Steel & Architectural Concrete Bay Wall
    const bayWall = new THREE.Mesh(
      getBeveledBox(bayW, bayH, bayD, 0.03),
      bayIdx === 1 ? mats.obsidianMat : mats.industrialSteelMat
    );
    bayWall.position.set(bayX, 0.14 + bayH * 0.5, -0.12);
    bayWall.castShadow = true;
    bayWall.receiveShadow = true;
    factoryCore.add(bayWall);

    // Vaulted Half-Cylinder Barrel Roof Arch with Glazed Skylight Crown
    const barrelRoof = new THREE.Mesh(
      new THREE.CylinderGeometry(bayW * 0.52, bayW * 0.52, bayD + 0.06, 16, 1, false, 0, Math.PI),
      bayIdx === 1 ? mats.goldMetalMat : mats.darkGraphiteMat
    );
    barrelRoof.rotation.z = Math.PI / 2;
    barrelRoof.rotation.y = Math.PI / 2;
    barrelRoof.position.set(bayX, 0.14 + bayH, -0.12);
    barrelRoof.castShadow = true;
    factoryCore.add(barrelRoof);

    // Recessed Tall Vertical Industrial Glazing Windows on Front & Back of each Vaulted Bay
    const bayGlass = new THREE.Mesh(
      getBeveledBox(bayW * 0.68, bayH * 0.52, bayD + 0.03, 0.015),
      mats.carGlassMat
    );
    bayGlass.position.set(bayX, 0.14 + bayH * 0.62, -0.12);
    factoryCore.add(bayGlass);

    // Ground-Floor Truck Loading Dock Roll-Up Door & Dock Bumper (+Z)
    const rollUpDoor = new THREE.Mesh(
      new THREE.BoxGeometry(0.54, 0.62, 0.08),
      mats.darkGraphiteMat
    );
    rollUpDoor.position.set(bayX, 0.45, 0.98);
    factoryCore.add(rollUpDoor);

    const dockBumper = new THREE.Mesh(
      new THREE.BoxGeometry(0.62, 0.1, 0.14),
      mats.goldMetalMat
    );
    dockBumper.position.set(bayX, 0.18, 1.02);
    factoryCore.add(dockBumper);
  });

  const loadingDockCanopy = new THREE.Mesh(
    getBeveledBox(2.75, 0.08, 0.48, 0.02),
    mats.goldMetalMat
  );
  loadingDockCanopy.position.set(0.04, 0.88, 1.18);
  factoryCore.add(loadingDockCanopy);

  // 3. Hyperboloid Reinforced Concrete Cooling Tower on East Flank (In factoryCore so always visible!)
  const coolingTowerLower = new THREE.Mesh(
    new THREE.CylinderGeometry(0.42, 0.68, 1.32, 20),
    mats.architecturalConcreteMat
  );
  coolingTowerLower.position.set(1.86, 0.80, -0.25);
  coolingTowerLower.castShadow = true;
  factoryCore.add(coolingTowerLower);

  const coolingTowerUpper = new THREE.Mesh(
    new THREE.CylinderGeometry(0.56, 0.42, 0.78, 20),
    mats.architecturalConcreteMat
  );
  coolingTowerUpper.position.set(1.86, 1.82, -0.25);
  coolingTowerUpper.castShadow = true;
  factoryCore.add(coolingTowerUpper);

  const coolingTowerRim = new THREE.Mesh(
    new THREE.TorusGeometry(0.56, 0.048, 8, 22),
    mats.goldMetalMat
  );
  coolingTowerRim.rotation.x = Math.PI / 2;
  coolingTowerRim.position.set(1.86, 2.21, -0.25);
  factoryCore.add(coolingTowerRim);

  // 4. Chemical & Bullion Refinery Wing: Twin Storage Silos + Tall Fractionating Column
  [-0.52, 0.38].forEach((tz) => {
    const tank = new THREE.Mesh(
      new THREE.CylinderGeometry(0.38, 0.38, 1.72, 16),
      mats.industrialSteelMat
    );
    tank.position.set(-1.72, 1.0, tz);
    tank.castShadow = true;
    factoryCore.add(tank);

    const tankDome = new THREE.Mesh(
      new THREE.SphereGeometry(0.38, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2),
      mats.goldMetalMat
    );
    tankDome.position.set(-1.72, 1.86, tz);
    factoryCore.add(tankDome);
  });

  // Tall Refinery Fractionating Distillation Tower with Inspection Rings
  const distillationColumn = new THREE.Mesh(
    new THREE.CylinderGeometry(0.24, 0.28, 2.75, 16),
    mats.industrialSteelMat
  );
  distillationColumn.position.set(-1.72, 1.52, -1.12);
  factoryCore.add(distillationColumn);

  [1.0, 1.65, 2.3].forEach((ry) => {
    const platformRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.32, 0.03, 6, 16),
      mats.darkGraphiteMat
    );
    platformRing.rotation.x = Math.PI / 2;
    platformRing.position.set(-1.72, ry, -1.12);
    factoryCore.add(platformRing);
  });

  // Overhead Structural Pipe Manifold connecting Refinery Tanks to Main Hall
  const pipeCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-1.72, 1.65, -0.52),
    new THREE.Vector3(-1.72, 1.98, 0),
    new THREE.Vector3(-1.25, 1.98, 0),
  ]);
  const pipelineMesh = new THREE.Mesh(
    new THREE.TubeGeometry(pipeCurve, 16, 0.065, 8, false),
    mats.industrialSteelMat
  );
  factoryCore.add(pipelineMesh);

  // 5. 3 Tall Reinforced Smokestacks rising to Y = 3.55 (Matches steamPuffs at Y = 3.55, Z = -7.7)
  const stackPositions = [-0.8, 0.1, 0.85];
  stackPositions.forEach((sx) => {
    const chimney = new THREE.Mesh(
      new THREE.CylinderGeometry(0.18, 0.27, 1.75, 14),
      mats.obsidianMat
    );
    chimney.position.set(sx, 2.62, -0.5);
    factoryCore.add(chimney);

    const redBand = new THREE.Mesh(
      new THREE.CylinderGeometry(0.2, 0.21, 0.22, 14),
      mats.redStripeMat
    );
    redBand.position.set(sx, 3.12, -0.5);
    factoryCore.add(redBand);

    const collar = new THREE.Mesh(
      new THREE.CylinderGeometry(0.22, 0.22, 0.12, 14),
      mats.industrialSteelMat
    );
    collar.position.set(sx, 3.44, -0.5);
    factoryCore.add(collar);
  });

  // 6. Animated Mechanical Drive Gears, Conveyor Track, Robotic Arm & Bullion Ingot
  const factoryGear1 = new THREE.Mesh(
    new THREE.TorusGeometry(0.42, 0.085, 8, 14),
    mats.industrialSteelMat
  );
  factoryGear1.position.set(-0.58, 1.28, 1.04);
  factoryCore.add(factoryGear1);

  const factoryGear2 = new THREE.Mesh(
    new THREE.TorusGeometry(0.3, 0.075, 8, 12),
    mats.goldMetalMat
  );
  factoryGear2.position.set(0.22, 1.12, 1.04);
  factoryCore.add(factoryGear2);

  const factoryConveyorTrack = new THREE.Mesh(
    getBeveledBox(1.18, 0.16, 0.38, 0.03),
    mats.obsidianMat
  );
  factoryConveyorTrack.position.set(-0.62, 0.22, 1.36);
  factoryCore.add(factoryConveyorTrack);

  const factoryBullionIngot = new THREE.Mesh(
    getBeveledBox(0.25, 0.12, 0.18, 0.025),
    mats.amberCrystalMat
  );
  factoryBullionIngot.position.set(-0.62, 0.34, 1.36);
  factoryCore.add(factoryBullionIngot);

  const factoryRoboticArm = new THREE.Group();
  factoryRoboticArm.position.set(-1.18, 0.3, 1.36);
  const armPedestal = new THREE.Mesh(
    new THREE.CylinderGeometry(0.11, 0.14, 0.26, 10),
    mats.brightGoldMat
  );
  armPedestal.position.y = 0.13;
  factoryRoboticArm.add(armPedestal);
  const armBoom = new THREE.Mesh(
    getBeveledBox(0.46, 0.08, 0.08, 0.02),
    mats.goldMetalMat
  );
  armBoom.position.set(0.18, 0.34, 0);
  armBoom.rotation.z = 0.35;
  factoryRoboticArm.add(armBoom);
  const armClaw = new THREE.Mesh(
    getBeveledBox(0.12, 0.14, 0.14, 0.02),
    mats.obsidianMat
  );
  armClaw.position.set(0.38, 0.28, 0);
  factoryRoboticArm.add(armClaw);
  factoryCore.add(factoryRoboticArm);

  buildingLevelVisuals.factory = factoryTiers;
  loadOptionalBuildingGlb('factory', factoryGroup, factoryCore);
  registerBuildingGroup('factory', factoryGroup);

  // ===========================================================================
  // BUILDING 4: FOX RESEARCH CENTER — SWEPT ELLIPTICAL BIO-TECH TOWER,
  // OCTAGONAL CLEANROOM PAVILION & GEODESIC QUANTUM ROTUNDA at (-9.2, 0.05, 1.3)
  // ===========================================================================
  const researchGroup = new THREE.Group();
  researchGroup.position.set(-9.2, 0.05, 1.3);
  const researchCore = new THREE.Group();
  researchGroup.add(researchCore);
  const researchTiers = createBuildingLevelTiers(researchGroup);

  // 1. Landscaped Science Campus Podium & Stepped Granite Plinth
  const labFoundation = new THREE.Mesh(
    getBeveledBox(3.75, 0.14, 3.35, 0.035),
    mats.sidewalkMat
  );
  labFoundation.position.y = 0.07;
  researchCore.add(labFoundation);

  // 2. West 5-Story Swept Elliptical Bio-Tech Glass Tower (Replaces rectangular box wing!)
  const westTowerH = 2.48;
  const westTowerCyl = new THREE.Mesh(
    new THREE.CylinderGeometry(0.68, 0.84, westTowerH, 22),
    mats.carGlassMat
  );
  westTowerCyl.scale.set(0.95, 1, 1.25);
  westTowerCyl.position.set(-1.12, 0.14 + westTowerH * 0.5, -0.22);
  westTowerCyl.castShadow = true;
  westTowerCyl.receiveShadow = true;
  researchCore.add(westTowerCyl);

  // Cantilevered Horizontal Sun-Shading Brise-Soleil Rings on West Elliptical Tower
  for (let wf = 1; wf <= 5; wf++) {
    const t = wf / 5;
    const rCur = THREE.MathUtils.lerp(0.86, 0.70, t);
    const ring = new THREE.Mesh(
      new THREE.CylinderGeometry(rCur, rCur, 0.045, 22),
      wf === 5 ? mats.goldMetalMat : mats.architecturalConcreteMat
    );
    ring.scale.set(0.98, 1, 1.28);
    ring.position.set(-1.12, 0.14 + t * westTowerH, -0.22);
    researchCore.add(ring);
  }

  // Sloped Aerodynamic Crown Fin atop West Research Tower
  const westCrown = new THREE.Mesh(
    new THREE.CylinderGeometry(0.65, 0.70, 0.24, 22),
    mats.industrialSteelMat
  );
  westCrown.scale.set(0.95, 1, 1.25);
  westCrown.position.set(-1.12, 0.14 + westTowerH + 0.08, -0.22);
  westCrown.rotation.z = -0.2;
  researchCore.add(westCrown);

  // 3. East 4-Story Faceted Octagonal Photonics & Cleanroom Pavilion with Geodesic Observatory Cap
  const eastPavilionH = 1.88;
  const eastOctCore = new THREE.Mesh(
    new THREE.CylinderGeometry(0.76, 0.86, eastPavilionH, 8),
    mats.skyscraperWallMat
  );
  eastOctCore.rotation.y = Math.PI / 8;
  eastOctCore.position.set(1.12, 0.14 + eastPavilionH * 0.5, -0.25);
  eastOctCore.castShadow = true;
  researchCore.add(eastOctCore);

  [0.62, 1.12, 1.62, 2.02].forEach((ey, idx) => {
    const octBand = new THREE.Mesh(
      new THREE.CylinderGeometry(0.86 - idx * 0.02, 0.86 - idx * 0.02, 0.045, 8),
      idx === 3 ? mats.goldMetalMat : mats.industrialSteelMat
    );
    octBand.rotation.y = Math.PI / 8;
    octBand.position.set(1.12, ey, -0.25);
    researchCore.add(octBand);
  });

  const eastSubDome = new THREE.Mesh(
    new THREE.SphereGeometry(0.68, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.5),
    mats.carGlassMat
  );
  eastSubDome.position.set(1.12, 0.14 + eastPavilionH, -0.25);
  researchCore.add(eastSubDome);

  // Elevated Glazed Sky-Concourse linking West & East Research Towers through Central Rotunda
  const researchSkybridge = new THREE.Mesh(
    getBeveledBox(2.35, 0.32, 0.52, 0.025),
    mats.carGlassMat
  );
  researchSkybridge.position.set(0, 1.35, -0.22);
  researchCore.add(researchSkybridge);

  // 4. Central 3-Story Curved Glass Rotunda Atrium & Double-Height Entrance Vestibule
  const labPedestal = new THREE.Mesh(
    new THREE.CylinderGeometry(1.32, 1.44, 1.48, 24),
    mats.obsidianMat
  );
  labPedestal.position.set(0, 0.86, 0.24);
  researchCore.add(labPedestal);

  // Horizontal Architectural Brise-Soleil Rings around Central Rotunda
  [0.52, 0.88, 1.24, 1.58].forEach((ly, idx) => {
    const louverRing = new THREE.Mesh(
      new THREE.CylinderGeometry(1.42, 1.45, 0.055, 24),
      idx === 3 ? mats.goldMetalMat : mats.industrialSteelMat
    );
    louverRing.position.set(0, ly, 0.24);
    researchCore.add(louverRing);
  });

  // Glazed Front Entrance Lobby with Columns & Canopy (+Z)
  const labEntranceCanopy = new THREE.Mesh(
    getBeveledBox(1.45, 0.08, 0.56, 0.02),
    mats.goldMetalMat
  );
  labEntranceCanopy.position.set(0, 0.92, 1.62);
  researchCore.add(labEntranceCanopy);

  const labEntranceDoors = new THREE.Mesh(
    getBeveledBox(0.96, 0.72, 0.12, 0.02),
    mats.windowGlowMat
  );
  labEntranceDoors.position.set(0, 0.48, 1.52);
  researchCore.add(labEntranceDoors);

  // 5. Geodesic Glass Observatory Dome & Structural Steel Arch Ribs
  const labGlassDome = new THREE.Mesh(
    new THREE.SphereGeometry(1.28, 20, 14, 0, Math.PI * 2, 0, Math.PI * 0.52),
    new THREE.MeshPhysicalMaterial({
      color: 0x38bdf8,
      roughness: 0.05,
      metalness: 0.1,
      clearcoat: 1.0,
      clearcoatRoughness: 0.04,
      ior: 1.52,
      transparent: true,
      opacity: 0.34,
      depthWrite: false,
    })
  );
  labGlassDome.position.set(0, 1.58, 0.24);
  labGlassDome.renderOrder = 2;
  researchCore.add(labGlassDome);

  for (let p = 0; p < 6; p++) {
    const a = (p * Math.PI * 2) / 6;
    const pylon = new THREE.Mesh(
      getBeveledBox(0.12, 0.96, 0.12, 0.02),
      mats.industrialSteelMat
    );
    pylon.position.set(Math.cos(a) * 1.15, 1.92, 0.24 + Math.sin(a) * 1.15);
    researchCore.add(pylon);

    const cyanAccent = new THREE.Mesh(
      getBeveledBox(0.05, 0.84, 0.05, 0.01),
      mats.cyanEnergyMat
    );
    cyanAccent.position.set(Math.cos(a) * 1.21, 1.92, 0.24 + Math.sin(a) * 1.21);
    researchCore.add(cyanAccent);
  }

  // 6. Quantum Reactor Core, Gyroscopic Rings, Solar Arrays & Deep-Space Comm Dish
  const labCoreSphere = new THREE.Mesh(
    new THREE.SphereGeometry(0.56, 22, 22),
    mats.cyanEnergyMat
  );
  labCoreSphere.position.set(0, 2.18, 0.24);
  researchCore.add(labCoreSphere);

  const labRing1 = new THREE.Mesh(
    new THREE.TorusGeometry(0.86, 0.05, 8, 28),
    mats.brightGoldMat
  );
  labRing1.position.set(0, 2.18, 0.24);
  researchCore.add(labRing1);

  const labRing2 = new THREE.Mesh(
    new THREE.TorusGeometry(0.98, 0.04, 8, 28),
    mats.goldMetalMat
  );
  labRing2.position.set(0, 2.18, 0.24);
  labRing2.rotation.y = Math.PI / 2;
  researchCore.add(labRing2);

  const holoDisplayRing = new THREE.Mesh(
    new THREE.TorusGeometry(1.18, 0.028, 6, 32),
    mats.cyanEnergyMat
  );
  holoDisplayRing.rotation.x = Math.PI / 2;
  holoDisplayRing.position.set(0, 1.68, 0.24);
  researchCore.add(holoDisplayRing);

  const labSatDish = new THREE.Group();
  labSatDish.position.set(1.12, 2.48, -0.25);
  const dishBowl = new THREE.Mesh(
    new THREE.CylinderGeometry(0.38, 0.06, 0.18, 16),
    mats.sidewalkMat
  );
  dishBowl.rotation.x = 0.55;
  labSatDish.add(dishBowl);
  const dishFeed = new THREE.Mesh(
    new THREE.CylinderGeometry(0.018, 0.018, 0.26, 6),
    mats.brightGoldMat
  );
  dishFeed.position.set(0, 0.13, 0.08);
  dishFeed.rotation.x = 0.55;
  labSatDish.add(dishFeed);
  researchCore.add(labSatDish);

  const labQuantumPivot = new THREE.Group();
  labQuantumPivot.position.set(0, 2.18, 0.24);
  for (let q = 0; q < 3; q++) {
    const qAngle = (q * Math.PI * 2) / 3;
    const qNode = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.11, 0),
      mats.amberCrystalMat
    );
    qNode.position.set(Math.cos(qAngle) * 1.18, 0, Math.sin(qAngle) * 1.18);
    labQuantumPivot.add(qNode);
  }
  researchCore.add(labQuantumPivot);

  [-0.55, 0.55].forEach((cx) => {
    const cryoTank = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.2, 0.48, 6, 12),
      mats.industrialSteelMat
    );
    cryoTank.position.set(cx, 0.52, -1.42);
    researchCore.add(cryoTank);
  });

  buildingLevelVisuals.research = researchTiers;
  loadOptionalBuildingGlb('research', researchGroup, researchCore);
  registerBuildingGroup('research', researchGroup);

  // ===========================================================================
  // BUILDING 5: FOX MARKETPLACE & FINANCIAL EXCHANGE — CURVED ROTUNDA GALLERIA,
  // VAULTED GLASS ATRIUM & TWIN ASYMMETRICAL EXCHANGE TOWERS at (-1.2, 0.05, 6.8)
  // ===========================================================================
  const marketGroup = new THREE.Group();
  marketGroup.position.set(-1.2, 0.05, 6.8);
  const marketCore = new THREE.Group();
  marketGroup.add(marketCore);
  const marketTiers = createBuildingLevelTiers(marketGroup);

  // 1. Sculpted Curved Elliptical & Colonnade Retail Galleria Podium (Replaces rectangular box!)
  const galleriaW = 3.25;
  const galleriaH = 1.42;
  const galleriaD = 2.05;
  buildingAssets.addStreetLevelColonnadeLobby(
    marketCore,
    mats,
    galleriaW,
    0.68,
    galleriaD,
    true
  );

  // Curved Elliptical Glazed Upper Galleria Concourse
  const galleriaEllipticalUpper = new THREE.Mesh(
    new THREE.CylinderGeometry(1.0, 1.04, galleriaH - 0.64, 24),
    mats.hqCurtainGlassMat
  );
  galleriaEllipticalUpper.scale.set(galleriaW * 0.52, 1, galleriaD * 0.52);
  galleriaEllipticalUpper.position.y = 0.72 + (galleriaH - 0.64) * 0.5;
  galleriaEllipticalUpper.castShadow = true;
  galleriaEllipticalUpper.receiveShadow = true;
  marketCore.add(galleriaEllipticalUpper);

  [0.98, 1.24, 1.44].forEach((gy, idx) => {
    const galleriaRing = new THREE.Mesh(
      new THREE.CylinderGeometry(1.05, 1.05, 0.042, 24),
      idx === 2 ? mats.goldMetalMat : mats.industrialSteelMat
    );
    galleriaRing.scale.set(galleriaW * 0.52, 1, galleriaD * 0.52);
    galleriaRing.position.y = gy;
    marketCore.add(galleriaRing);
  });

  // 2. West Tower: 6-Story Tapered Elliptical Glass Exchange Tower with Sloped Gold Crown
  const exTowerRx = 0.84;
  const exTowerRz = 0.78;
  const exTowerH = 2.25;
  const exTowerX = -0.78;
  const exTowerZ = -0.10;

  const exTowerCyl = new THREE.Mesh(
    new THREE.CylinderGeometry(0.82, 1.02, exTowerH, 22),
    mats.skyscraperWallMat
  );
  exTowerCyl.scale.set(exTowerRx, 1, exTowerRz);
  exTowerCyl.position.set(exTowerX, galleriaH + exTowerH * 0.5, exTowerZ);
  exTowerCyl.castShadow = true;
  exTowerCyl.receiveShadow = true;
  marketCore.add(exTowerCyl);

  for (let ef = 1; ef <= 5; ef++) {
    const t = ef / 5;
    const rCur = THREE.MathUtils.lerp(1.02, 0.82, t) * 1.03;
    const ring = new THREE.Mesh(
      new THREE.CylinderGeometry(rCur, rCur, 0.042, 22),
      ef === 5 ? mats.goldMetalMat : mats.industrialSteelMat
    );
    ring.scale.set(exTowerRx, 1, exTowerRz);
    ring.position.set(exTowerX, galleriaH + t * exTowerH, exTowerZ);
    marketCore.add(ring);
  }

  const westExchangeCrown = new THREE.Mesh(
    new THREE.CylinderGeometry(0.78, 0.84, 0.24, 22),
    mats.goldMetalMat
  );
  westExchangeCrown.scale.set(exTowerRx, 1, exTowerRz);
  westExchangeCrown.position.set(exTowerX, galleriaH + exTowerH + 0.08, exTowerZ);
  westExchangeCrown.rotation.z = -0.22;
  marketCore.add(westExchangeCrown);

  // 3. East Wing: Faceted Octagonal Financial Rotunda Tower + Vaulted Glass Barrel Atrium
  const eastRotundaH = 1.48;
  const eastRotunda = new THREE.Mesh(
    new THREE.CylinderGeometry(0.68, 0.78, eastRotundaH, 8),
    mats.hqCurtainGlassMat
  );
  eastRotunda.rotation.y = Math.PI / 8;
  eastRotunda.position.set(0.82, galleriaH + eastRotundaH * 0.5, -0.18);
  eastRotunda.castShadow = true;
  marketCore.add(eastRotunda);

  // Elevated Glazed Skybridge linking West & East Exchange Towers
  const marketBridge = new THREE.Mesh(
    getBeveledBox(1.15, 0.28, 0.44, 0.02),
    mats.carGlassMat
  );
  marketBridge.position.set(0.05, galleriaH + 0.92, -0.14);
  marketCore.add(marketBridge);

  // Sweeping Vaulted Glass Barrel-Arch Atrium Roof over Central Galleria
  const barrelVault = new THREE.Mesh(
    new THREE.CylinderGeometry(0.62, 0.62, 1.38, 16, 1, false, 0, Math.PI),
    mats.carGlassMat
  );
  barrelVault.rotation.z = Math.PI / 2;
  barrelVault.rotation.y = Math.PI / 2;
  barrelVault.position.set(0.15, galleriaH + 0.02, 0.35);
  marketCore.add(barrelVault);

  // Illuminated "MARKET" Fascia Sign on Galleria Front
  const marketSign = new THREE.Mesh(
    getBeveledBox(1.88, 0.38, 0.14, 0.025),
    marketSignMat
  );
  marketSign.position.set(0.32, 1.48, 0.98);
  marketCore.add(marketSign);

  // 4. East Podium Rooftop Dome & Rotating FOX Coin Landmark
  addSkyGardenTerrace(marketCore, 0.82, galleriaH + 0.06, 0.48, 1.08, 0.64);

  const marketCupolaDome = new THREE.Mesh(
    new THREE.SphereGeometry(0.56, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2),
    mats.goldMetalMat
  );
  marketCupolaDome.position.set(0.82, galleriaH + eastRotundaH, -0.18);
  marketCore.add(marketCupolaDome);

  const marketHoloCoin = new THREE.Mesh(
    new THREE.CylinderGeometry(0.36, 0.36, 0.075, 22),
    mats.amberCrystalMat
  );
  marketHoloCoin.rotation.x = Math.PI / 2;
  marketHoloCoin.position.set(0.82, galleriaH + eastRotundaH + 0.82, -0.18);
  marketCore.add(marketHoloCoin);

  const marketDeliveryDrone = new THREE.Group();
  marketDeliveryDrone.position.set(1.15, 1.48, 1.15);
  const droneCore = new THREE.Mesh(
    new THREE.SphereGeometry(0.12, 10, 10),
    mats.obsidianMat
  );
  const droneCargo = new THREE.Mesh(
    getBeveledBox(0.14, 0.1, 0.14, 0.02),
    mats.goldMetalMat
  );
  droneCargo.position.y = -0.11;
  const droneRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.2, 0.025, 6, 16),
    mats.cyanEnergyMat
  );
  droneRing.rotation.x = Math.PI / 2;
  marketDeliveryDrone.add(droneCore, droneCargo, droneRing);
  marketCore.add(marketDeliveryDrone);

  [-1.58, 1.58].forEach((kx) => {
    const umbrellaPole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.025, 0.025, 0.52, 6),
      mats.industrialSteelMat
    );
    umbrellaPole.position.set(kx, 0.26, 1.18);
    marketCore.add(umbrellaPole);

    const umbrellaCanopy = new THREE.Mesh(
      new THREE.ConeGeometry(0.32, 0.16, 8),
      stripedAwningMat
    );
    umbrellaCanopy.position.set(kx, 0.54, 1.18);
    marketCore.add(umbrellaCanopy);
  });

  buildingLevelVisuals.marketplace = marketTiers;
  loadOptionalBuildingGlb('marketplace', marketGroup, marketCore);
  registerBuildingGroup('marketplace', marketGroup);

  // ===========================================================================
  // BUILDING 6: FOX RESIDENTIAL DISTRICT — CURVED ELLIPTICAL CONDOMINIUM TOWER,
  // STEPPED OCTAGONAL PENTHOUSE RESIDENCE & CURVED COURTYARD VILLA at (9.2, 0.05, 2.2)
  // ===========================================================================
  const residentialGroup = new THREE.Group();
  residentialGroup.position.set(9.2, 0.05, 2.2);
  const residentialCore = new THREE.Group();
  residentialGroup.add(residentialCore);
  const residentialTiers = createBuildingLevelTiers(residentialGroup);

  // 1. Landscaped Urban Residential Block Plinth & Courtyard Paver Base
  const resCourtyardSlab = new THREE.Mesh(
    getBeveledBox(3.65, 0.1, 3.25, 0.03),
    mats.sidewalkMat
  );
  resCourtyardSlab.position.y = 0.05;
  residentialCore.add(resCourtyardSlab);

  // 2. Tower A (North-West 8-Story Curved Elliptical Luxury Condominium High-Rise with Wrap-Around Glass Balconies)
  const towerARx = 0.78;
  const towerARz = 0.72;
  const towerAH = 3.55;
  const towerAX = -0.88;
  const towerAZ = -0.68;

  const towerACyl = new THREE.Mesh(
    new THREE.CylinderGeometry(0.88, 1.0, towerAH, 22),
    mats.skyscraperWallMat
  );
  towerACyl.scale.set(towerARx, 1, towerARz);
  towerACyl.position.set(towerAX, 0.1 + towerAH * 0.5, towerAZ);
  towerACyl.castShadow = true;
  towerACyl.receiveShadow = true;
  residentialCore.add(towerACyl);

  // Curved Concrete Floor Slabs & Alternating Wave Wrap-Around Glass Balconies on Tower A
  for (let rf = 1; rf <= 8; rf++) {
    const t = rf / 8;
    const fy = 0.1 + t * towerAH;
    const rCur = THREE.MathUtils.lerp(1.08, 0.96, t);
    const balSlab = new THREE.Mesh(
      new THREE.CylinderGeometry(rCur, rCur, 0.048, 22),
      mats.architecturalConcreteMat
    );
    balSlab.scale.set(towerARx, 1, towerARz);
    balSlab.position.set(towerAX + (rf % 2 === 0 ? 0.04 : -0.04), fy, towerAZ);
    balSlab.castShadow = true;
    residentialCore.add(balSlab);

    if (rf < 8) {
      const glassBalustrade = new THREE.Mesh(
        new THREE.CylinderGeometry(rCur - 0.01, rCur - 0.01, 0.11, 22, 1, true),
        mats.carGlassMat
      );
      glassBalustrade.scale.set(towerARx, 1, towerARz);
      glassBalustrade.position.set(towerAX + (rf % 2 === 0 ? 0.04 : -0.04), fy + 0.075, towerAZ);
      residentialCore.add(glassBalustrade);
    }
  }

  // Sloped Architectural Penthouse Roof Fin on Tower A
  const towerACrown = new THREE.Mesh(
    new THREE.CylinderGeometry(0.82, 0.88, 0.26, 22),
    mats.goldMetalMat
  );
  towerACrown.scale.set(towerARx, 1, towerARz);
  towerACrown.position.set(towerAX, 0.1 + towerAH + 0.12, towerAZ);
  towerACrown.rotation.z = 0.22;
  residentialCore.add(towerACrown);

  addSkyGardenTerrace(residentialCore, towerAX + 0.08, 0.1 + towerAH + 0.06, towerAZ, 0.78, 0.68);

  // 3. Tower B (North-East 7-Story Faceted Octagonal Stepped Condominium Tower — Replaces plain box!)
  const towerBH = 2.85;
  const towerBX = 0.88;
  const towerBZ = -0.68;

  const towerBLower = new THREE.Mesh(
    new THREE.CylinderGeometry(0.76, 0.84, towerBH * 0.62, 8),
    mats.residentialWallMat
  );
  towerBLower.rotation.y = Math.PI / 8;
  towerBLower.position.set(towerBX, 0.1 + towerBH * 0.31, towerBZ);
  towerBLower.castShadow = true;
  towerBLower.receiveShadow = true;
  residentialCore.add(towerBLower);

  const towerBUpper = new THREE.Mesh(
    new THREE.CylinderGeometry(0.56, 0.66, towerBH * 0.38, 8),
    mats.carGlassMat
  );
  towerBUpper.rotation.y = Math.PI / 8;
  towerBUpper.position.set(towerBX, 0.1 + towerBH * 0.81, towerBZ);
  towerBUpper.castShadow = true;
  residentialCore.add(towerBUpper);

  for (let bf = 1; bf <= 6; bf++) {
    const t = bf / 6;
    const rOct = bf <= 4 ? 0.86 : 0.68;
    const octBalcony = new THREE.Mesh(
      new THREE.CylinderGeometry(rOct, rOct, 0.045, 8),
      bf === 4 || bf === 6 ? mats.goldMetalMat : mats.architecturalConcreteMat
    );
    octBalcony.rotation.y = Math.PI / 8;
    octBalcony.position.set(towerBX, 0.1 + t * towerBH, towerBZ);
    residentialCore.add(octBalcony);
  }

  // Pitched Octagonal Penthouse Roof Crown on Tower B
  const towerBPitchedRoof = new THREE.Mesh(
    new THREE.ConeGeometry(0.62, 0.38, 8),
    mats.darkGraphiteMat
  );
  towerBPitchedRoof.rotation.y = Math.PI / 8;
  towerBPitchedRoof.position.set(towerBX, 0.1 + towerBH + 0.19, towerBZ);
  residentialCore.add(towerBPitchedRoof);

  addSkyGardenTerrace(residentialCore, towerBX, 0.1 + towerBH * 0.62 + 0.04, towerBZ + 0.42, 0.82, 0.38);

  // 4. Building C (South-West 5-Story Curved-Wing Courtyard Residence with Pitched Mansard Roof)
  const bldgCH = 2.15;
  const bldgCX = -0.88;
  const bldgCZ = 0.78;

  const bldgCCyl = new THREE.Mesh(
    new THREE.CylinderGeometry(0.68, 0.74, bldgCH, 16),
    mats.architecturalConcreteMat
  );
  bldgCCyl.scale.set(1.08, 1, 0.88);
  bldgCCyl.position.set(bldgCX, 0.1 + bldgCH * 0.5, bldgCZ);
  bldgCCyl.castShadow = true;
  residentialCore.add(bldgCCyl);

  for (let cf = 1; cf <= 4; cf++) {
    const cSlab = new THREE.Mesh(
      new THREE.CylinderGeometry(0.76, 0.76, 0.042, 16),
      mats.residentialWallMat
    );
    cSlab.scale.set(1.08, 1, 0.88);
    cSlab.position.set(bldgCX, 0.1 + (cf / 4) * bldgCH, bldgCZ);
    residentialCore.add(cSlab);
  }

  // Rooftop Solar Panels & Sky-Garden on Building C
  const resSolar = new THREE.Mesh(
    getBeveledBox(0.76, 0.04, 0.48, 0.01),
    mats.carGlassMat
  );
  resSolar.position.set(bldgCX, 0.1 + bldgCH + 0.12, bldgCZ);
  resSolar.rotation.x = 0.28;
  residentialCore.add(resSolar);

  // Elevated Glazed Resident Skywalk linking Tower A and Tower B
  const resSkywalk = new THREE.Mesh(
    getBeveledBox(1.12, 0.24, 0.36, 0.02),
    mats.carGlassMat
  );
  resSkywalk.position.set(0, 1.48, -0.68);
  residentialCore.add(resSkywalk);

  // 5. South-East Landscaped Residential Courtyard, Reflection Pool & Pergola Lounge
  const poolBasin = new THREE.Mesh(
    getBeveledBox(1.24, 0.12, 0.92, 0.025),
    mats.architecturalConcreteMat
  );
  poolBasin.position.set(0.88, 0.12, 0.78);
  residentialCore.add(poolBasin);

  const poolWater = new THREE.Mesh(
    getBeveledBox(1.08, 0.14, 0.76, 0.02),
    mats.cyanEnergyMat
  );
  poolWater.position.set(0.88, 0.13, 0.78);
  residentialCore.add(poolWater);

  const resPergola = new THREE.Mesh(
    getBeveledBox(1.12, 0.06, 0.52, 0.015),
    mats.goldMetalMat
  );
  resPergola.position.set(0.88, 0.62, 1.28);
  residentialCore.add(resPergola);

  buildingLevelVisuals.residential = residentialTiers;
  loadOptionalBuildingGlb('residential', residentialGroup, residentialCore);
  registerBuildingGroup('residential', residentialGroup);

  // ===========================================================================
  // BUILDING 7: FOX POWER PLANT — WAISTED HYPERBOLOID COOLING TOWER,
  // VAULTED TURBINE GENERATOR HALL & PLASMA REACTOR DOME at (-2.6, 0.05, 1.3)
  // ===========================================================================
  const powerGroup = new THREE.Group();
  powerGroup.position.set(-2.6, 0.05, 1.3);
  const powerCore = new THREE.Group();
  powerGroup.add(powerCore);
  const powerTiers = createBuildingLevelTiers(powerGroup);

  // 1. Reinforced Concrete Substation Pad
  const powerPad = new THREE.Mesh(
    getBeveledBox(3.15, 0.14, 2.55, 0.035),
    mats.architecturalConcreteMat
  );
  powerPad.position.y = 0.07;
  powerCore.add(powerPad);

  // 2. Sculpted Waisted Hyperboloid Cooling & Plasma Containment Tower on West Side (Replaces plain box!)
  const hyperLower = new THREE.Mesh(
    new THREE.CylinderGeometry(0.56, 0.86, 1.35, 24),
    mats.architecturalConcreteMat
  );
  hyperLower.position.set(-0.62, 0.82, -0.22);
  hyperLower.castShadow = true;
  hyperLower.receiveShadow = true;
  powerCore.add(hyperLower);

  const hyperUpper = new THREE.Mesh(
    new THREE.CylinderGeometry(0.72, 0.56, 0.82, 24),
    mats.architecturalConcreteMat
  );
  hyperUpper.position.set(-0.62, 1.88, -0.22);
  hyperUpper.castShadow = true;
  powerCore.add(hyperUpper);

  // Structural Exoskeleton Diagrid Struts & Glowing Cyan Rim around Hyperboloid Tower
  for (let h = 0; h < 8; h++) {
    const hAng = (h * Math.PI * 2) / 8;
    const rib = new THREE.Mesh(
      new THREE.CylinderGeometry(0.025, 0.035, 2.15, 6),
      h % 2 === 0 ? mats.goldMetalMat : mats.industrialSteelMat
    );
    rib.position.set(
      -0.62 + Math.cos(hAng) * 0.68,
      1.22,
      -0.22 + Math.sin(hAng) * 0.68
    );
    powerCore.add(rib);
  }

  const hyperRimRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.72, 0.05, 8, 24),
    mats.goldMetalMat
  );
  hyperRimRing.rotation.x = Math.PI / 2;
  hyperRimRing.position.set(-0.62, 2.29, -0.22);
  powerCore.add(hyperRimRing);

  // 3. Vaulted Arch Turbine Generator Hall & Hemispherical Containment Dome (Front/Center)
  const turbVaultBody = new THREE.Mesh(
    new THREE.CylinderGeometry(0.68, 0.68, 1.48, 18, 1, false, 0, Math.PI),
    mats.industrialSteelMat
  );
  turbVaultBody.rotation.z = Math.PI / 2;
  turbVaultBody.position.set(0.12, 0.88, 0.45);
  turbVaultBody.castShadow = true;
  powerCore.add(turbVaultBody);

  const turbBaseWall = new THREE.Mesh(
    getBeveledBox(1.48, 0.74, 1.32, 0.03),
    mats.obsidianMat
  );
  turbBaseWall.position.set(0.12, 0.51, 0.45);
  turbBaseWall.castShadow = true;
  powerCore.add(turbBaseWall);

  // External Structural Arch Ribs over Vaulted Turbine Hall
  [-0.48, 0.12, 0.72].forEach((ax) => {
    const archRib = new THREE.Mesh(
      new THREE.TorusGeometry(0.71, 0.04, 8, 18, Math.PI),
      mats.goldMetalMat
    );
    archRib.rotation.y = Math.PI / 2;
    archRib.position.set(ax, 0.88, 0.45);
    powerCore.add(archRib);
  });

  // 4. High-Voltage Step-Up Transformer Yard, Ceramic Bushings & Plasma Induction Core
  const powerCoil = new THREE.Mesh(
    new THREE.CylinderGeometry(0.38, 0.38, 1.28, 18),
    mats.cyanEnergyMat
  );
  powerCoil.position.set(-0.62, 2.42, -0.22);
  powerCore.add(powerCoil);

  for (let r = 0; r < 3; r++) {
    const coilRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.46, 0.042, 8, 22),
      mats.industrialSteelMat
    );
    coilRing.rotation.x = Math.PI / 2;
    coilRing.position.set(-0.62, 2.05 + r * 0.32, -0.22);
    powerCore.add(coilRing);
  }

  // Multi-Unit BESS Grid Battery Containers & High-Voltage Transformer Radiators
  [-0.55, 0.25].forEach((bz) => {
    const bessBox = new THREE.Mesh(
      getBeveledBox(0.82, 0.62, 0.48, 0.025),
      mats.industrialSteelMat
    );
    bessBox.position.set(1.02, 0.45, bz);
    powerCore.add(bessBox);

    [-0.22, 0, 0.22].forEach((bx) => {
      const ceramicInsulator = new THREE.Mesh(
        new THREE.CylinderGeometry(0.032, 0.045, 0.38, 8),
        mats.darkGraphiteMat
      );
      ceramicInsulator.position.set(1.02 + bx, 0.92, bz);
      ceramicInsulator.rotation.z = bx * 0.35;
      powerCore.add(ceramicInsulator);
    });
  });

  // 5. Tall Wind-Plasma Turbine Tower & Spinning 3-Blade Rotor
  const turbineMast = new THREE.Mesh(
    new THREE.CylinderGeometry(0.08, 0.15, 2.65, 12),
    mats.sidewalkMat
  );
  turbineMast.position.set(0.96, 1.46, -0.58);
  powerCore.add(turbineMast);

  const turbineRotor = new THREE.Group();
  turbineRotor.position.set(0.96, 2.72, -0.44);
  const hub = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 10), mats.goldMetalMat);
  turbineRotor.add(hub);
  for (let i = 0; i < 3; i++) {
    const bladePivot = new THREE.Group();
    bladePivot.rotation.z = (i * Math.PI * 2) / 3;
    const blade = new THREE.Mesh(
      getBeveledBox(0.13, 1.08, 0.035, 0.015),
      mats.sidewalkMat
    );
    blade.position.y = 0.54;
    bladePivot.add(blade);
    turbineRotor.add(bladePivot);
  }
  powerCore.add(turbineRotor);

  const powerPlasmaArc = new THREE.Mesh(
    new THREE.TorusGeometry(0.42, 0.036, 6, 18, Math.PI),
    mats.cyanEnergyMat
  );
  powerPlasmaArc.position.set(-0.62, 2.35, -0.22);
  powerPlasmaArc.rotation.y = Math.PI / 2;
  powerCore.add(powerPlasmaArc);

  const auxCoil = new THREE.Mesh(
    new THREE.CylinderGeometry(0.22, 0.22, 0.78, 14),
    mats.cyanEnergyMat
  );
  auxCoil.position.set(0.12, 1.42, 0.45);
  powerCore.add(auxCoil);

  buildingLevelVisuals.power = powerTiers;
  loadOptionalBuildingGlb('power', powerGroup, powerCore);
  registerBuildingGroup('power', powerGroup);

  // ===========================================================================
  // ACTIVE BUILDING UPGRADE HOLOGRAPHIC CONSTRUCTION RIG
  // ===========================================================================
  const upgradeRigGroup = new THREE.Group();
  upgradeRigGroup.visible = false;

  const upgradeLowerRing = new THREE.Mesh(
    new THREE.TorusGeometry(1.75, 0.035, 8, 32),
    mats.amberCrystalMat
  );
  upgradeLowerRing.rotation.x = Math.PI / 2;
  upgradeLowerRing.position.y = 0.85;
  upgradeRigGroup.add(upgradeLowerRing);

  const upgradeUpperRing = new THREE.Mesh(
    new THREE.TorusGeometry(1.55, 0.03, 8, 32),
    mats.cyanEnergyMat
  );
  upgradeUpperRing.rotation.x = Math.PI / 2;
  upgradeUpperRing.position.y = 2.05;
  upgradeRigGroup.add(upgradeUpperRing);

  for (let p = 0; p < 4; p++) {
    const pAng = (p * Math.PI) / 2 + Math.PI / 4;
    const laserPost = new THREE.Mesh(
      new THREE.CylinderGeometry(0.025, 0.025, 2.35, 6),
      mats.brightGoldMat
    );
    laserPost.position.set(Math.cos(pAng) * 1.65, 1.18, Math.sin(pAng) * 1.65);
    upgradeRigGroup.add(laserPost);
  }
  worldGroup.add(upgradeRigGroup);

  // ===========================================================================
  // BUILDING 8: FOX SKYPORT & AVIATION LOGISTICS TERMINAL — SCULPTED CONICAL
  // GLASS CONCOURSE, SPACE-FRAME FLIGHT DECK & HYPERBOLOID ATC TOWER at (10.2, 1.45, -8.2)
  // ===========================================================================
  const helipadGroup = new THREE.Group();
  helipadGroup.position.set(10.2, 1.45, -8.2);
  const helipadCore = new THREE.Group();
  helipadGroup.add(helipadCore);
  const helipadTiers = createBuildingLevelTiers(helipadGroup);

  // 1. Sculpted Tapered Conical/Octagonal Glazed VIP Aviation Terminal Base (Replaces rectangular box!)
  const terminalConcourse = new THREE.Mesh(
    new THREE.CylinderGeometry(1.52, 1.28, 0.92, 16),
    mats.hqCurtainGlassMat
  );
  terminalConcourse.position.set(0, -0.30, 0);
  terminalConcourse.castShadow = true;
  terminalConcourse.receiveShadow = true;
  helipadCore.add(terminalConcourse);

  [-0.58, -0.28, 0.02].forEach((ty, idx) => {
    const termRing = new THREE.Mesh(
      new THREE.CylinderGeometry(1.36 + idx * 0.1, 1.36 + idx * 0.1, 0.045, 16),
      idx === 2 ? mats.goldMetalMat : mats.industrialSteelMat
    );
    termRing.position.set(0, ty, 0);
    helipadCore.add(termRing);
  });

  // Structural Steel Space-Frame Support Pylons around Terminal Perimeter
  for (let s = 0; s < 8; s++) {
    const sAng = (s * Math.PI * 2) / 8;
    const strut = new THREE.Mesh(
      new THREE.CylinderGeometry(0.068, 0.085, 0.96, 8),
      s % 2 === 0 ? mats.goldMetalMat : mats.industrialSteelMat
    );
    strut.position.set(Math.cos(sAng) * 1.42, -0.24, Math.sin(sAng) * 1.42);
    strut.rotation.z = -Math.cos(sAng) * 0.22;
    strut.rotation.x = Math.sin(sAng) * 0.22;
    helipadCore.add(strut);
  }

  // 2. Cantilevered Octagonal Safety Catwalk Apron & Concrete Helipad Flight Deck
  const padSafetyApron = new THREE.Mesh(
    getExtrudedOctagonTier(1.78, 0.1, 0.03),
    mats.industrialSteelMat
  );
  padSafetyApron.position.y = 0.14;
  helipadCore.add(padSafetyApron);

  const padCylinder = new THREE.Mesh(
    new THREE.CylinderGeometry(1.52, 1.64, 0.3, 24),
    mats.architecturalConcreteMat
  );
  padCylinder.position.y = 0.24;
  helipadCore.add(padCylinder);

  const padGoldRing = new THREE.Mesh(
    new THREE.TorusGeometry(1.32, 0.06, 8, 32),
    mats.brightGoldMat
  );
  padGoldRing.rotation.x = Math.PI / 2;
  padGoldRing.position.y = 0.4;
  helipadCore.add(padGoldRing);

  // Helipad "H" & Touchdown Markings
  [-0.34, 0.34].forEach((hx) => {
    const hBar = new THREE.Mesh(
      getBeveledBox(0.14, 0.04, 0.88, 0.01),
      mats.brightGoldMat
    );
    hBar.position.set(hx, 0.4, 0);
    helipadCore.add(hBar);
  });
  const hCross = new THREE.Mesh(
    getBeveledBox(0.7, 0.04, 0.14, 0.01),
    mats.brightGoldMat
  );
  hCross.position.set(0, 0.4, 0);
  helipadCore.add(hCross);

  // 8 Perimeter Aviation Strobe Beacons
  for (let l = 0; l < 8; l++) {
    const lAng = (l * Math.PI * 2) / 8;
    const strobe = new THREE.Mesh(
      new THREE.SphereGeometry(0.055, 8, 8),
      l % 2 === 0 ? mats.amberCrystalMat : mats.cyanEnergyMat
    );
    strobe.position.set(Math.cos(lAng) * 1.56, 0.42, Math.sin(lAng) * 1.56);
    helipadCore.add(strobe);
    if (l % 2 === 0) aviationBeacons.push(strobe);
  }

  // 3. Tapered Hyperboloid Air-Traffic Control (ATC) Tower on NW Corner of Skyport
  const atcShaft = new THREE.Mesh(
    new THREE.CylinderGeometry(0.24, 0.36, 1.38, 12),
    mats.architecturalConcreteMat
  );
  atcShaft.position.set(-1.18, 0.96, -0.92);
  helipadCore.add(atcShaft);

  const atcGlassCab = new THREE.Mesh(
    new THREE.CylinderGeometry(0.52, 0.36, 0.42, 12),
    mats.carGlassMat
  );
  atcGlassCab.position.set(-1.18, 1.78, -0.92);
  helipadCore.add(atcGlassCab);

  const atcRoofCap = new THREE.Mesh(
    new THREE.ConeGeometry(0.58, 0.22, 12),
    mats.goldMetalMat
  );
  atcRoofCap.position.set(-1.18, 2.08, -0.92);
  helipadCore.add(atcRoofCap);

  const atcAntenna = new THREE.Mesh(
    new THREE.CylinderGeometry(0.015, 0.025, 0.48, 6),
    mats.industrialSteelMat
  );
  atcAntenna.position.set(-1.18, 2.38, -0.92);
  helipadCore.add(atcAntenna);

  buildingLevelVisuals.helipad = helipadTiers;
  loadOptionalBuildingGlb('helipad', helipadGroup, helipadCore);
  registerBuildingGroup('helipad', helipadGroup);

  return {
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
    holoDisplayRing,
    labSatDish,
    labQuantumPivot,
    marketHoloCoin,
    marketDeliveryDrone,
    powerCoil,
    turbineRotor,
    powerPlasmaArc,
    upgradeRigGroup,
    upgradeLowerRing,
    upgradeUpperRing,
  };
}
