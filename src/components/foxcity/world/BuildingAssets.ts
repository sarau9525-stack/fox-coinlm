import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { CityQualityTier, FoxCityBuildingId } from '../foxCityTypes.js';

export interface MetropolitanMaterialPalette {
  darkGraphiteMat: THREE.MeshStandardMaterial;
  obsidianMat: THREE.MeshStandardMaterial;
  skyscraperWallMat: THREE.MeshStandardMaterial;
  residentialWallMat: THREE.MeshStandardMaterial;
  goldMetalMat: THREE.MeshStandardMaterial;
  brightGoldMat: THREE.MeshStandardMaterial;
  windowGlowMat: THREE.MeshStandardMaterial;
  cyanEnergyMat: THREE.MeshStandardMaterial;
  amberCrystalMat: THREE.MeshStandardMaterial;
  cliffRockMat: THREE.MeshStandardMaterial;
  cliffHighlightRockMat: THREE.MeshStandardMaterial;
  grassTerrainMat: THREE.MeshStandardMaterial;
  lushParkGrassMat: THREE.MeshStandardMaterial;
  roadAsphaltMat: THREE.MeshStandardMaterial;
  sidewalkMat: THREE.MeshStandardMaterial;
  pineFoliageMat: THREE.MeshStandardMaterial;
  goldenPineFoliageMat: THREE.MeshStandardMaterial;
  woodMat: THREE.MeshStandardMaterial;
  slateRoofMat: THREE.MeshStandardMaterial;
  redStripeMat: THREE.MeshStandardMaterial;
  carGlassMat: THREE.MeshStandardMaterial;
  hqCurtainGlassMat: THREE.MeshStandardMaterial;
  industrialSteelMat: THREE.MeshStandardMaterial;
  architecturalConcreteMat: THREE.MeshStandardMaterial;
}

export interface BuildingLevelVisualTiers {
  level2Group: THREE.Group;
  level3Group: THREE.Group;
  level4PlusGroup: THREE.Group;
  lodDetailGroup: THREE.Group;
}

export type SkyscraperArchitecturalVariant =
  | 'stepped_supertall'
  | 'diagrid_corporate'
  | 'twin_skybridge'
  | 'cantilever_atrium'
  | 'sail_waterfront'
  | 'terraced_ziggurat';

export type MidRiseArchitecturalVariant =
  | 'courtyard_residential'
  | 'terraced_condo'
  | 'commercial_galleria'
  | 'industrial_logistics';

export class BuildingAssetsRegistry {
  public readonly geometryCache = new Map<string, THREE.BufferGeometry>();
  public readonly modelCache = new Map<FoxCityBuildingId, THREE.Group>();
  private readonly qualityTier: CityQualityTier;

  constructor(qualityTier: CityQualityTier) {
    this.qualityTier = qualityTier;
  }

  public getBeveledBox(
    w: number,
    h: number,
    d: number,
    bevelRadius = 0.04,
    segments = this.qualityTier === 'low' ? 1 : 2
  ): THREE.BufferGeometry {
    const safeR = Math.min(bevelRadius, w * 0.22, h * 0.22, d * 0.22);
    const key = `rbox_${w.toFixed(3)}_${h.toFixed(3)}_${d.toFixed(3)}_${safeR.toFixed(3)}_${segments}`;
    let geo = this.geometryCache.get(key);
    if (!geo) {
      geo = new RoundedBoxGeometry(w, h, d, segments, safeR);
      this.geometryCache.set(key, geo);
    }
    return geo;
  }

  /**
   * Adds realistic multi-floor architectural facade details to a building volume:
   * - Protruding floor slab spandrels for clear floor-by-floor division
   * - Recessed window bays with vertical mullions and selective interior lit floors
   * - Optional cantilevered balconies with glass railings
   */
  public addDetailedMultiFloorFacade(
    target: THREE.Group,
    mats: MetropolitanMaterialPalette,
    options: {
      centerX?: number;
      baseY: number;
      centerZ?: number;
      width: number;
      height: number;
      depth: number;
      floorHeight?: number;
      spandrelMat: THREE.Material;
      mullionMat: THREE.Material;
      glassMat: THREE.Material;
      hasBalconies?: boolean;
      seed?: number;
    }
  ): void {
    const {
      centerX = 0,
      baseY,
      centerZ = 0,
      width,
      height,
      depth,
      floorHeight = 0.44,
      spandrelMat,
      mullionMat,
      glassMat,
      hasBalconies = false,
      seed = 1,
    } = options;

    const floors = Math.max(2, Math.floor(height / floorHeight));
    const actualFloorH = height / floors;

    // 1. Recessed Dark Reflective Curtain-Wall Glazing Core on Front/Back and Left/Right
    const frontBackGlass = new THREE.Mesh(
      this.getBeveledBox(width * 0.92, height * 0.94, depth + 0.018, 0.015),
      glassMat
    );
    frontBackGlass.position.set(centerX, baseY + height * 0.5, centerZ);
    target.add(frontBackGlass);

    const sideGlass = new THREE.Mesh(
      this.getBeveledBox(width + 0.018, height * 0.94, depth * 0.92, 0.015),
      glassMat
    );
    sideGlass.position.set(centerX, baseY + height * 0.5, centerZ);
    target.add(sideGlass);

    // 2. Floor-by-Floor Protruding Structural Slabs, Illuminated Interior Bays & Balconies
    for (let f = 0; f <= floors; f++) {
      const fy = baseY + f * actualFloorH;
      const slab = new THREE.Mesh(
        this.getBeveledBox(width + 0.06, 0.042, depth + 0.06, 0.012),
        spandrelMat
      );
      slab.position.set(centerX, fy, centerZ);
      slab.castShadow = true;
      slab.receiveShadow = true;
      target.add(slab);

      if (f < floors) {
        // Subtle recessed interior lit bay on only ~18% of floors to avoid repetitive yellow stripes
        if ((f * 3 + seed) % 6 === 0) {
          const litBayW = width * 0.28;
          const litBayH = actualFloorH * 0.48;
          const litOffsetX = ((f + seed) % 3 - 1) * (width * 0.22);
          const litWindow = new THREE.Mesh(
            new THREE.BoxGeometry(litBayW, litBayH, depth + 0.022),
            mats.carGlassMat
          );
          litWindow.position.set(
            centerX + litOffsetX,
            fy + actualFloorH * 0.5,
            centerZ
          );
          target.add(litWindow);
        }

        // Cantilevered residential/terrace balconies with glass balustrades and privacy dividers
        if (hasBalconies && f >= 1) {
          const balW = width * 0.68;
          const balD = 0.26;
          [-1, 1].forEach((dirZ) => {
            if (dirZ === -1 && f % 2 === 1) return;
            const bz = centerZ + dirZ * (depth * 0.5 + balD * 0.45);
            const balSlab = new THREE.Mesh(
              this.getBeveledBox(balW, 0.048, balD, 0.012),
              mats.architecturalConcreteMat
            );
            balSlab.position.set(centerX, fy + 0.01, bz);
            balSlab.castShadow = true;
            target.add(balSlab);

            const glassRail = new THREE.Mesh(
              new THREE.BoxGeometry(balW - 0.02, 0.115, 0.018),
              mats.carGlassMat
            );
            glassRail.position.set(
              centerX,
              fy + 0.08,
              bz + dirZ * (balD * 0.44)
            );
            target.add(glassRail);

            const topRail = new THREE.Mesh(
              new THREE.BoxGeometry(balW, 0.018, 0.024),
              mats.industrialSteelMat
            );
            topRail.position.set(
              centerX,
              fy + 0.14,
              bz + dirZ * (balD * 0.44)
            );
            target.add(topRail);
          });
        }
      }
    }

    // 3. Vertical Structural Mullion Fins & Corner Megacolumns
    const mullionCount = Math.max(2, Math.floor(width / 0.42));
    for (let m = 0; m <= mullionCount; m++) {
      const mx = centerX - width * 0.44 + (m / mullionCount) * (width * 0.88);
      const mullion = new THREE.Mesh(
        this.getBeveledBox(0.038, height, depth + 0.045, 0.01),
        mullionMat
      );
      mullion.position.set(mx, baseY + height * 0.5, centerZ);
      target.add(mullion);
    }

    const sideMullionCount = Math.max(2, Math.floor(depth / 0.42));
    for (let m = 0; m <= sideMullionCount; m++) {
      const mz = centerZ - depth * 0.44 + (m / sideMullionCount) * (depth * 0.88);
      const mullionZ = new THREE.Mesh(
        this.getBeveledBox(width + 0.045, height, 0.038, 0.01),
        mullionMat
      );
      mullionZ.position.set(centerX, baseY + height * 0.5, mz);
      target.add(mullionZ);
    }

    // 4. Heavy Structural Corner Columns
    [
      [-width * 0.49, -depth * 0.49],
      [width * 0.49, -depth * 0.49],
      [-width * 0.49, depth * 0.49],
      [width * 0.49, depth * 0.49],
    ].forEach(([cx, cz]) => {
      const cornerCol = new THREE.Mesh(
        this.getBeveledBox(0.11, height + 0.04, 0.11, 0.02),
        mats.darkGraphiteMat
      );
      cornerCol.position.set(centerX + cx, baseY + height * 0.5, centerZ + cz);
      cornerCol.castShadow = true;
      target.add(cornerCol);
    });
  }

  /**
   * Adds a detailed street-level double-height colonnade entrance with columns,
   * recessed glass doors, entrance steps, and cantilevered canopy.
   */
  public addStreetLevelColonnadeLobby(
    target: THREE.Group,
    mats: MetropolitanMaterialPalette,
    width: number,
    podiumH: number,
    depth: number,
    isFoxSignature = false
  ): void {
    const accentMat = isFoxSignature ? mats.goldMetalMat : mats.industrialSteelMat;

    // 1. Stepped Granite Entrance Plinth & Stairs
    const basePlinth = new THREE.Mesh(
      this.getBeveledBox(width * 1.22, 0.1, depth * 1.22, 0.025),
      mats.sidewalkMat
    );
    basePlinth.position.y = 0.05;
    basePlinth.receiveShadow = true;
    target.add(basePlinth);

    // 2. Recessed Glazed Double-Height Lobby Volume
    const lobbyCore = new THREE.Mesh(
      this.getBeveledBox(width * 1.04, podiumH, depth * 1.04, 0.03),
      mats.obsidianMat
    );
    lobbyCore.position.y = podiumH * 0.5 + 0.08;
    lobbyCore.castShadow = true;
    lobbyCore.receiveShadow = true;
    target.add(lobbyCore);

    const lobbyGlass = new THREE.Mesh(
      this.getBeveledBox(width * 0.94, podiumH * 0.82, depth * 1.07, 0.02),
      mats.carGlassMat
    );
    lobbyGlass.position.y = podiumH * 0.48 + 0.08;
    target.add(lobbyGlass);

    // Revolving Door Entrance Vestibule on Front Facade (+Z)
    const entrancePortal = new THREE.Mesh(
      this.getBeveledBox(width * 0.42, podiumH * 0.68, 0.14, 0.02),
      isFoxSignature ? mats.windowGlowMat : mats.carGlassMat
    );
    entrancePortal.position.set(0, podiumH * 0.4 + 0.08, depth * 0.54);
    target.add(entrancePortal);

    // Cantilevered Entrance Canopy
    const canopy = new THREE.Mesh(
      this.getBeveledBox(width * 0.64, 0.06, 0.34, 0.015),
      accentMat
    );
    canopy.position.set(0, podiumH * 0.78 + 0.08, depth * 0.62);
    canopy.castShadow = true;
    target.add(canopy);

    // Perimeter Colonnade Pillars around Podium Base
    const colPositionsX = [-width * 0.46, -width * 0.18, width * 0.18, width * 0.46];
    colPositionsX.forEach((cx) => {
      [-depth * 0.54, depth * 0.54].forEach((cz) => {
        const col = new THREE.Mesh(
          new THREE.CylinderGeometry(0.048, 0.056, podiumH, 10),
          mats.architecturalConcreteMat
        );
        col.position.set(cx, podiumH * 0.5 + 0.08, cz);
        col.castShadow = true;
        target.add(col);
      });
    });

    // Podium Cornice Slab
    const podiumCornice = new THREE.Mesh(
      this.getBeveledBox(width * 1.16, 0.09, depth * 1.16, 0.025),
      mats.architecturalConcreteMat
    );
    podiumCornice.position.y = podiumH + 0.1;
    podiumCornice.castShadow = true;
    target.add(podiumCornice);
  }

  /**
   * Builds a realistic Cities: Skylines style high-rise skyscraper with 6 genuinely distinct
   * 3D architectural silhouettes so no skyline building looks like a repeated box:
   * - 'diagrid_corporate': Curved Cylindrical / Elliptical Glass-and-Steel Skyscraper
   * - 'stepped_supertall': Angular Faceted Octagonal Tapered Supertall Tower
   * - 'cantilever_atrium': Twisted / Rotated Stacked Cantilevered High-Rise with Sky-Gardens
   * - 'twin_skybridge': Asymmetrical Curved + Angular Twin Towers Linked by Elevated Glazed Skybridge
   * - 'sail_waterfront': Swept Aerodynamic Sail / Crescent Glass High-Rise with Sloped Fin Crown
   * - 'terraced_ziggurat': Cascading Stepped Green-Roof Setback Tower with Corner Sky-Atriums
   */
  public buildModernCurtainWallSkyscraper(
    mats: MetropolitanMaterialPalette,
    options: {
      width: number;
      height: number;
      depth: number;
      hasSetback?: boolean;
      hasGoldAccentFin?: boolean;
      hasRooftopHelipad?: boolean;
      variant?: SkyscraperArchitecturalVariant;
      seed?: number;
    }
  ): THREE.Group {
    const {
      width,
      height,
      depth,
      hasSetback = true,
      hasGoldAccentFin = false,
      hasRooftopHelipad = false,
      seed = Math.round((width + height * 3 + depth * 7) * 10),
    } = options;

    const variants: SkyscraperArchitecturalVariant[] = [
      'stepped_supertall',
      'diagrid_corporate',
      'twin_skybridge',
      'cantilever_atrium',
      'sail_waterfront',
      'terraced_ziggurat',
    ];
    const variant = options.variant ?? variants[Math.abs(seed) % variants.length];

    const tower = new THREE.Group();
    const podiumH = Math.min(1.05, Math.max(0.68, height * 0.17));

    // 1. Street-Level Double-Height Colonnade Lobby & Podium
    this.addStreetLevelColonnadeLobby(
      tower,
      mats,
      width,
      podiumH,
      depth,
      hasGoldAccentFin
    );

    const spandrelMat = hasGoldAccentFin
      ? mats.goldMetalMat
      : mats.architecturalConcreteMat;
    const mullionMat = hasGoldAccentFin
      ? mats.goldMetalMat
      : mats.industrialSteelMat;
    const glassMat = hasGoldAccentFin
      ? mats.hqCurtainGlassMat
      : mats.skyscraperWallMat;

    const totalShaftH = Math.max(1.8, height - podiumH);
    let topY = podiumH + 0.12;

    if (variant === 'diagrid_corporate') {
      // CURVED ELLIPTICAL / CYLINDRICAL GLASS-AND-STEEL TOWER (Distinct Curved Silhouette)
      const lowerH = totalShaftH * 0.74;
      const upperH = totalShaftH * 0.30;
      const rx = width * 0.50;
      const rz = depth * 0.50;

      // Lower Curved Cylindrical Glass Curtain-Wall Shaft
      const cylShaft = new THREE.Mesh(
        new THREE.CylinderGeometry(0.94, 1.0, lowerH, 20),
        glassMat
      );
      cylShaft.scale.set(rx, 1, rz);
      cylShaft.position.y = topY + lowerH * 0.5;
      cylShaft.castShadow = true;
      cylShaft.receiveShadow = true;
      tower.add(cylShaft);

      // Curved Horizontal Floor Spandrel Rings
      const floorCount = Math.max(4, Math.floor(lowerH / 0.48));
      for (let f = 0; f <= floorCount; f++) {
        const t = f / floorCount;
        const rScale = 1.0 - t * 0.06;
        const ring = new THREE.Mesh(
          new THREE.CylinderGeometry(rScale * 1.02, rScale * 1.02, 0.042, 20),
          f % 3 === 0 ? spandrelMat : mats.industrialSteelMat
        );
        ring.scale.set(rx, 1, rz);
        ring.position.y = topY + t * lowerH;
        ring.castShadow = true;
        tower.add(ring);
      }

      // 8 Vertical Curved Exoskeleton Steel Fin Ribs
      for (let i = 0; i < 8; i++) {
        const ang = (i / 8) * Math.PI * 2;
        const fin = new THREE.Mesh(
          new THREE.BoxGeometry(0.055, lowerH + upperH * 0.85, 0.08),
          mullionMat
        );
        fin.position.set(
          Math.cos(ang) * rx * 0.96,
          topY + (lowerH + upperH * 0.85) * 0.5,
          Math.sin(ang) * rz * 0.96
        );
        fin.rotation.y = -ang;
        tower.add(fin);
      }

      topY += lowerH;

      // Upper Tapered Cylindrical Crown Tier
      const upperCyl = new THREE.Mesh(
        new THREE.CylinderGeometry(0.72, 0.84, upperH, 20),
        glassMat
      );
      upperCyl.scale.set(rx, 1, rz);
      upperCyl.position.y = topY + upperH * 0.5;
      upperCyl.castShadow = true;
      tower.add(upperCyl);

      // Sloped Architectural Crown Ring at Summit
      const crownRing = new THREE.Mesh(
        new THREE.CylinderGeometry(0.75, 0.75, 0.14, 20),
        spandrelMat
      );
      crownRing.scale.set(rx, 1, rz);
      crownRing.position.y = topY + upperH + 0.04;
      crownRing.rotation.z = 0.08;
      tower.add(crownRing);

      topY += upperH;
    } else if (variant === 'stepped_supertall') {
      // ANGULAR FACETED OCTAGONAL TAPERED SUPERTALL TOWER
      const t1H = totalShaftH * 0.50;
      const t2H = totalShaftH * 0.32;
      const t3H = hasSetback ? totalShaftH * 0.24 : totalShaftH * 0.18;
      const rx = width * 0.54;
      const rz = depth * 0.54;

      const buildOctagonalTier = (
        tierBaseY: number,
        tierH: number,
        rBottom: number,
        rTop: number
      ) => {
        const octCore = new THREE.Mesh(
          new THREE.CylinderGeometry(rTop, rBottom, tierH, 8),
          glassMat
        );
        octCore.rotation.y = Math.PI / 8;
        octCore.scale.set(rx, 1, rz);
        octCore.position.y = tierBaseY + tierH * 0.5;
        octCore.castShadow = true;
        octCore.receiveShadow = true;
        tower.add(octCore);

        const floors = Math.max(2, Math.floor(tierH / 0.46));
        for (let f = 0; f <= floors; f++) {
          const frac = f / floors;
          const rCur = THREE.MathUtils.lerp(rBottom, rTop, frac) * 1.03;
          const band = new THREE.Mesh(
            new THREE.CylinderGeometry(rCur, rCur, 0.042, 8),
            f === floors ? spandrelMat : mats.industrialSteelMat
          );
          band.rotation.y = Math.PI / 8;
          band.scale.set(rx, 1, rz);
          band.position.y = tierBaseY + frac * tierH;
          tower.add(band);
        }

        // 8 Faceted Corner Structural Columns
        for (let c = 0; c < 8; c++) {
          const ang = (c / 8) * Math.PI * 2 + Math.PI / 8;
          const rMid = (rBottom + rTop) * 0.5;
          const col = new THREE.Mesh(
            new THREE.BoxGeometry(0.065, tierH, 0.065),
            mats.darkGraphiteMat
          );
          col.position.set(
            Math.cos(ang) * rx * rMid,
            tierBaseY + tierH * 0.5,
            Math.sin(ang) * rz * rMid
          );
          tower.add(col);
        }
      };

      buildOctagonalTier(topY, t1H, 1.0, 0.92);
      topY += t1H;
      buildOctagonalTier(topY, t2H, 0.80, 0.72);
      topY += t2H;
      buildOctagonalTier(topY, t3H, 0.60, 0.50);
      topY += t3H;
    } else if (variant === 'twin_skybridge') {
      // ASYMMETRICAL CURVED + ANGULAR TWIN TOWERS LINKED BY ELEVATED GLAZED SKYBRIDGE
      const wingW = width * 0.43;
      const wingOffset = width * 0.30;
      const westWingH = totalShaftH * 0.90;
      const eastWingH = totalShaftH * 1.08;

      // West Wing: Sleek Curved Cylindrical Glass Tower
      const westCyl = new THREE.Mesh(
        new THREE.CylinderGeometry(wingW * 0.52, wingW * 0.55, westWingH, 16),
        glassMat
      );
      westCyl.scale.set(1, 1, (depth * 0.92) / wingW);
      westCyl.position.set(-wingOffset, topY + westWingH * 0.5, 0);
      westCyl.castShadow = true;
      westCyl.receiveShadow = true;
      tower.add(westCyl);

      const westFloors = Math.max(3, Math.floor(westWingH / 0.48));
      for (let f = 0; f <= westFloors; f++) {
        const ring = new THREE.Mesh(
          new THREE.CylinderGeometry(wingW * 0.55, wingW * 0.55, 0.04, 16),
          mats.industrialSteelMat
        );
        ring.scale.set(1, 1, (depth * 0.92) / wingW);
        ring.position.set(-wingOffset, topY + (f / westFloors) * westWingH, 0);
        tower.add(ring);
      }

      // East Wing: Taller Angular Curtain-Wall Tower
      const eastCore = new THREE.Mesh(
        this.getBeveledBox(wingW, eastWingH, depth * 0.92, 0.03),
        mats.obsidianMat
      );
      eastCore.position.set(wingOffset, topY + eastWingH * 0.5, 0);
      eastCore.castShadow = true;
      eastCore.receiveShadow = true;
      tower.add(eastCore);

      this.addDetailedMultiFloorFacade(tower, mats, {
        centerX: wingOffset,
        baseY: topY,
        centerZ: 0,
        width: wingW,
        height: eastWingH,
        depth: depth * 0.92,
        floorHeight: 0.46,
        spandrelMat,
        mullionMat,
        glassMat,
        seed: seed + 2,
      });

      // Elevated Multi-Story Glazed Skybridge at 58% height
      const bridgeY = topY + totalShaftH * 0.58;
      const skyBridge = new THREE.Mesh(
        this.getBeveledBox(width * 0.56, 0.38, depth * 0.52, 0.025),
        mats.carGlassMat
      );
      skyBridge.position.set(0, bridgeY, 0);
      skyBridge.castShadow = true;
      tower.add(skyBridge);

      const bridgeTrussTop = new THREE.Mesh(
        this.getBeveledBox(width * 0.60, 0.05, depth * 0.56, 0.015),
        spandrelMat
      );
      bridgeTrussTop.position.set(0, bridgeY + 0.2, 0);
      tower.add(bridgeTrussTop);

      const bridgeTrussBot = bridgeTrussTop.clone();
      bridgeTrussBot.position.set(0, bridgeY - 0.2, 0);
      tower.add(bridgeTrussBot);

      topY += eastWingH;
    } else if (variant === 'sail_waterfront') {
      // SWEPT AERODYNAMIC SAIL / CRESCENT GLASS HIGH-RISE WITH SLOPED FIN CROWN
      const sailH = totalShaftH * 1.04;
      const rx = width * 0.52;
      const rz = depth * 0.52;

      // Primary Tapered Elliptical Sail Core
      const sailCore = new THREE.Mesh(
        new THREE.CylinderGeometry(0.68, 1.02, sailH, 18),
        glassMat
      );
      sailCore.scale.set(rx * 1.08, 1, rz * 0.86);
      sailCore.position.set(-width * 0.04, topY + sailH * 0.5, 0);
      sailCore.castShadow = true;
      sailCore.receiveShadow = true;
      tower.add(sailCore);

      // Swept Vertical Structural Spine Backbone on Rear/Side Edge
      const spineW = width * 0.28;
      const spineWall = new THREE.Mesh(
        this.getBeveledBox(spineW, sailH * 1.05, depth * 0.72, 0.03),
        mats.architecturalConcreteMat
      );
      spineWall.position.set(width * 0.32, topY + sailH * 0.52, 0);
      spineWall.castShadow = true;
      tower.add(spineWall);

      // Horizontal Brise-Soleil Louver Rings along the Curved Sail Facade
      const floorCount = Math.max(5, Math.floor(sailH / 0.44));
      for (let f = 0; f <= floorCount; f++) {
        const frac = f / floorCount;
        const rCur = THREE.MathUtils.lerp(1.04, 0.70, frac);
        const louverRing = new THREE.Mesh(
          new THREE.CylinderGeometry(rCur, rCur, 0.038, 18),
          f % 4 === 0 ? spandrelMat : mats.industrialSteelMat
        );
        louverRing.scale.set(rx * 1.08, 1, rz * 0.86);
        louverRing.position.set(-width * 0.04, topY + frac * sailH, 0);
        tower.add(louverRing);
      }

      // Dramatic Diagonal Sloped Architectural Sail Crown Fin
      const crownFin = new THREE.Mesh(
        new THREE.CylinderGeometry(0.66, 0.72, 0.28, 18),
        spandrelMat
      );
      crownFin.scale.set(rx * 1.05, 1, rz * 0.85);
      crownFin.position.set(-width * 0.04, topY + sailH + 0.06, 0);
      crownFin.rotation.z = -0.22;
      tower.add(crownFin);

      topY += sailH;
    } else if (variant === 'terraced_ziggurat') {
      // CASCADING STEPPED GREEN-ROOF SETBACK TOWER WITH CORNER SKY-ATRIUMS
      const stepHeights = [
        totalShaftH * 0.36,
        totalShaftH * 0.28,
        totalShaftH * 0.22,
        totalShaftH * 0.18,
      ];
      const stepScales = [1.0, 0.84, 0.68, 0.52];
      const stepOffsetsX = [0, -width * 0.06, -width * 0.11, -width * 0.15];

      stepHeights.forEach((sh, sIdx) => {
        const sc = stepScales[sIdx];
        const sw = width * sc;
        const sd = depth * (0.96 - sIdx * 0.08);
        const sx = stepOffsetsX[sIdx];

        const tierCore = new THREE.Mesh(
          this.getBeveledBox(sw, sh, sd, 0.03),
          mats.obsidianMat
        );
        tierCore.position.set(sx, topY + sh * 0.5, 0);
        tierCore.castShadow = true;
        tierCore.receiveShadow = true;
        tower.add(tierCore);

        this.addDetailedMultiFloorFacade(tower, mats, {
          centerX: sx,
          baseY: topY,
          centerZ: 0,
          width: sw,
          height: sh,
          depth: sd,
          floorHeight: 0.44,
          spandrelMat,
          mullionMat,
          glassMat,
          hasBalconies: sIdx >= 1,
          seed: seed + sIdx * 3,
        });

        // Landscaped Green Roof Terrace on each Setback Step
        if (sIdx < stepHeights.length - 1) {
          const terraceW = width * (sc - stepScales[sIdx + 1]) * 0.85;
          const greenLedge = new THREE.Mesh(
            this.getBeveledBox(Math.max(0.22, terraceW), 0.055, sd * 0.84, 0.015),
            mats.lushParkGrassMat
          );
          greenLedge.position.set(
            sx + sw * 0.38,
            topY + sh + 0.035,
            0
          );
          tower.add(greenLedge);
        }

        topY += sh;
      });
    } else {
      // 'cantilever_atrium': Twisted / Rotated Stacked Cantilevered High-Rise with Sky-Terraces
      const tier1H = totalShaftH * 0.44;
      const tier2H = totalShaftH * 0.36;
      const tier3H = totalShaftH * 0.26;
      const twistSign = seed % 2 === 0 ? 1 : -1;

      // Tier 1 Base Volume
      const t1Group = new THREE.Group();
      t1Group.position.y = topY;
      tower.add(t1Group);

      const t1Core = new THREE.Mesh(
        this.getBeveledBox(width, tier1H, depth, 0.035),
        mats.obsidianMat
      );
      t1Core.position.y = tier1H * 0.5;
      t1Core.castShadow = true;
      t1Core.receiveShadow = true;
      t1Group.add(t1Core);

      this.addDetailedMultiFloorFacade(t1Group, mats, {
        baseY: 0,
        width,
        height: tier1H,
        depth,
        floorHeight: 0.45,
        spandrelMat,
        mullionMat,
        glassMat,
        seed,
      });
      topY += tier1H;

      // Tier 2 Rotated & Cantilevered Mid Volume
      const t2Group = new THREE.Group();
      t2Group.position.set(twistSign * width * 0.09, topY, 0.05);
      t2Group.rotation.y = twistSign * 0.22;
      tower.add(t2Group);

      const t2Core = new THREE.Mesh(
        this.getBeveledBox(width * 0.88, tier2H, depth * 0.9, 0.035),
        mats.obsidianMat
      );
      t2Core.position.y = tier2H * 0.5;
      t2Core.castShadow = true;
      t2Group.add(t2Core);

      this.addDetailedMultiFloorFacade(t2Group, mats, {
        baseY: 0,
        width: width * 0.88,
        height: tier2H,
        depth: depth * 0.9,
        floorHeight: 0.45,
        spandrelMat,
        mullionMat,
        glassMat,
        seed: seed + 2,
      });

      // Landscaped Sky-Garden on the Setback Ledge
      const gardenBed = new THREE.Mesh(
        this.getBeveledBox(width * 0.24, 0.06, depth * 0.82, 0.015),
        mats.lushParkGrassMat
      );
      gardenBed.position.set(-twistSign * width * 0.34, topY + 0.04, 0);
      tower.add(gardenBed);

      topY += tier2H;

      // Tier 3 Counter-Rotated Penthouse Volume
      const t3Group = new THREE.Group();
      t3Group.position.set(-twistSign * width * 0.05, topY, 0);
      t3Group.rotation.y = -twistSign * 0.12;
      tower.add(t3Group);

      const t3Core = new THREE.Mesh(
        this.getBeveledBox(width * 0.68, tier3H, depth * 0.72, 0.03),
        mats.obsidianMat
      );
      t3Core.position.y = tier3H * 0.5;
      t3Core.castShadow = true;
      t3Group.add(t3Core);

      this.addDetailedMultiFloorFacade(t3Group, mats, {
        baseY: 0,
        width: width * 0.68,
        height: tier3H,
        depth: depth * 0.72,
        floorHeight: 0.44,
        spandrelMat,
        mullionMat,
        glassMat,
        seed: seed + 5,
      });
      topY += tier3H;
    }

    // 4. Detailed Architectural Rooftop Parapet, Mechanical Penthouse, HVAC Chillers & Helipad
    const crownW = width * 0.68;
    const crownD = depth * 0.68;

    const roofParapet = new THREE.Mesh(
      this.getBeveledBox(crownW + 0.08, 0.11, crownD + 0.08, 0.02),
      hasGoldAccentFin ? mats.goldMetalMat : mats.industrialSteelMat
    );
    roofParapet.position.y = topY + 0.05;
    tower.add(roofParapet);

    // Elevator Machine Room Penthouse & Twin HVAC Cooling Units
    const mechPenthouse = new THREE.Mesh(
      this.getBeveledBox(crownW * 0.46, 0.34, crownD * 0.44, 0.02),
      mats.architecturalConcreteMat
    );
    mechPenthouse.position.set(-crownW * 0.16, topY + 0.24, -crownD * 0.14);
    mechPenthouse.castShadow = true;
    tower.add(mechPenthouse);

    [-0.12, 0.12].forEach((hx) => {
      const chiller = new THREE.Mesh(
        this.getBeveledBox(0.22, 0.18, 0.26, 0.015),
        mats.industrialSteelMat
      );
      chiller.position.set(crownW * 0.2 + hx, topY + 0.16, -crownD * 0.16);
      tower.add(chiller);
    });

    if (hasRooftopHelipad) {
      const pad = new THREE.Mesh(
        new THREE.CylinderGeometry(crownW * 0.32, crownW * 0.35, 0.07, 16),
        mats.darkGraphiteMat
      );
      pad.position.set(crownW * 0.14, topY + 0.12, crownD * 0.14);
      tower.add(pad);

      const padRing = new THREE.Mesh(
        new THREE.RingGeometry(crownW * 0.22, crownW * 0.26, 16),
        mats.brightGoldMat
      );
      padRing.rotation.x = -Math.PI / 2;
      padRing.position.set(crownW * 0.14, topY + 0.16, crownD * 0.14);
      tower.add(padRing);
    }

    return tower;
  }

  /**
   * Builds a realistic multi-story mid-rise residential apartment, commercial galleria,
   * or industrial complex with L-shaped/stepped wings, recessed windows, real balconies,
   * ground-floor colonnade, and rooftop equipment.
   */
  public buildModernMidRiseBlock(
    mats: MetropolitanMaterialPalette,
    width: number,
    height: number,
    depth: number,
    variant: MidRiseArchitecturalVariant = 'courtyard_residential'
  ): THREE.Group {
    const group = new THREE.Group();
    const seed = Math.round((width * 5 + height * 7 + depth * 11) * 10);

    // 1. Ground-Floor Commercial / Residential Lobby Plinth
    const lobbyH = Math.min(0.65, height * 0.24);
    this.addStreetLevelColonnadeLobby(group, mats, width, lobbyH, depth, false);

    const upperH = Math.max(1.1, height - lobbyH);
    const baseY = lobbyH + 0.1;

    if (variant === 'courtyard_residential' || variant === 'terraced_condo') {
      // Sculpted Curved-Wing + Stepped Octagonal Residential Condominium Complex
      const mainWingW = width * 0.56;
      const sideWingW = width * 0.44;
      const sideWingH = upperH * 0.78;

      // Primary Tall Curved Elliptical Apartment Wing (West side)
      const mainWingX = -width * 0.20;
      const mainBodyCyl = new THREE.Mesh(
        new THREE.CylinderGeometry(0.46, 0.50, upperH, 18),
        mats.residentialWallMat
      );
      mainBodyCyl.scale.set(mainWingW, 1, depth * 0.92);
      mainBodyCyl.position.set(mainWingX, baseY + upperH * 0.5, 0);
      mainBodyCyl.castShadow = true;
      mainBodyCyl.receiveShadow = true;
      group.add(mainBodyCyl);

      const floors = Math.max(3, Math.floor(upperH / 0.44));
      for (let f = 1; f <= floors; f++) {
        const fy = baseY + (f / floors) * upperH;
        const balRing = new THREE.Mesh(
          new THREE.CylinderGeometry(0.54, 0.54, 0.042, 18),
          mats.architecturalConcreteMat
        );
        balRing.scale.set(mainWingW, 1, depth * 0.92);
        balRing.position.set(mainWingX, fy, 0);
        balRing.castShadow = true;
        group.add(balRing);

        if (f < floors) {
          const glassRail = new THREE.Mesh(
            new THREE.CylinderGeometry(0.53, 0.53, 0.10, 18, 1, true),
            mats.carGlassMat
          );
          glassRail.scale.set(mainWingW, 1, depth * 0.92);
          glassRail.position.set(mainWingX, fy + 0.068, 0);
          group.add(glassRail);
        }
      }

      // Sloped Roof Crown on Primary Apartment Wing
      const mainCrown = new THREE.Mesh(
        new THREE.CylinderGeometry(0.42, 0.46, 0.22, 18),
        mats.darkGraphiteMat
      );
      mainCrown.scale.set(mainWingW, 1, depth * 0.92);
      mainCrown.position.set(mainWingX, baseY + upperH + 0.08, 0);
      mainCrown.rotation.z = 0.18;
      group.add(mainCrown);

      // Secondary Stepped Faceted Octagonal Apartment Wing (East side)
      const sideWingX = width * 0.26;
      const sideBodyOct = new THREE.Mesh(
        new THREE.CylinderGeometry(0.46, 0.50, sideWingH, 8),
        mats.architecturalConcreteMat
      );
      sideBodyOct.rotation.y = Math.PI / 8;
      sideBodyOct.scale.set(sideWingW, 1, depth * 0.82);
      sideBodyOct.position.set(sideWingX, baseY + sideWingH * 0.5, -depth * 0.05);
      sideBodyOct.castShadow = true;
      sideBodyOct.receiveShadow = true;
      group.add(sideBodyOct);

      const sideFloors = Math.max(2, Math.floor(sideWingH / 0.44));
      for (let sf = 1; sf <= sideFloors; sf++) {
        const octSlab = new THREE.Mesh(
          new THREE.CylinderGeometry(0.53, 0.53, 0.04, 8),
          mats.residentialWallMat
        );
        octSlab.rotation.y = Math.PI / 8;
        octSlab.scale.set(sideWingW, 1, depth * 0.82);
        octSlab.position.set(sideWingX, baseY + (sf / sideFloors) * sideWingH, -depth * 0.05);
        group.add(octSlab);
      }

      // Landscaped Rooftop Garden on the Lower Stepped Wing
      const roofGarden = new THREE.Mesh(
        new THREE.CylinderGeometry(0.40, 0.42, 0.06, 8),
        mats.lushParkGrassMat
      );
      roofGarden.rotation.y = Math.PI / 8;
      roofGarden.scale.set(sideWingW, 1, depth * 0.82);
      roofGarden.position.set(sideWingX, baseY + sideWingH + 0.04, -depth * 0.05);
      group.add(roofGarden);
    } else if (variant === 'commercial_galleria') {
      // Chamfered Octagonal Glazed Commercial Rotunda & Vaulted Glass Atrium Dome
      const octBody = new THREE.Mesh(
        new THREE.CylinderGeometry(0.48, 0.52, upperH, 8),
        mats.skyscraperWallMat
      );
      octBody.rotation.y = Math.PI / 8;
      octBody.scale.set(width, 1, depth);
      octBody.position.y = baseY + upperH * 0.5;
      octBody.castShadow = true;
      octBody.receiveShadow = true;
      group.add(octBody);

      const cFloors = Math.max(2, Math.floor(upperH / 0.48));
      for (let cf = 1; cf <= cFloors; cf++) {
        const band = new THREE.Mesh(
          new THREE.CylinderGeometry(0.53, 0.53, 0.042, 8),
          cf === cFloors ? mats.goldMetalMat : mats.industrialSteelMat
        );
        band.rotation.y = Math.PI / 8;
        band.scale.set(width, 1, depth);
        band.position.y = baseY + (cf / cFloors) * upperH;
        group.add(band);
      }

      // Vaulted Glass Rotunda Atrium Dome on Roof
      const skylightDome = new THREE.Mesh(
        new THREE.SphereGeometry(0.36, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.5),
        mats.carGlassMat
      );
      skylightDome.scale.set(width, 0.85, depth);
      skylightDome.position.set(0, baseY + upperH, 0);
      group.add(skylightDome);
    } else {
      // 'industrial_logistics': Twin-Bay Vaulted Barrel-Roof Industrial Logistics Facility
      const hallH = height * 0.82;
      [-width * 0.24, width * 0.24].forEach((bx, bIdx) => {
        const bayW = width * 0.48;
        const bayWall = new THREE.Mesh(
          this.getBeveledBox(bayW, hallH, depth, 0.03),
          bIdx === 0 ? mats.industrialSteelMat : mats.architecturalConcreteMat
        );
        bayWall.position.set(bx, hallH * 0.5 + 0.08, 0);
        bayWall.castShadow = true;
        bayWall.receiveShadow = true;
        group.add(bayWall);

        const barrelRoof = new THREE.Mesh(
          new THREE.CylinderGeometry(bayW * 0.5, bayW * 0.5, depth + 0.04, 14, 1, false, 0, Math.PI),
          mats.darkGraphiteMat
        );
        barrelRoof.rotation.z = Math.PI / 2;
        barrelRoof.rotation.y = Math.PI / 2;
        barrelRoof.position.set(bx, hallH + 0.08, 0);
        group.add(barrelRoof);
      });

      // Truck Loading Dock Bays with Roll-Up Doors on Front Facade
      [-width * 0.28, 0, width * 0.28].forEach((dx) => {
        const dockDoor = new THREE.Mesh(
          new THREE.BoxGeometry(width * 0.2, hallH * 0.48, 0.06),
          mats.darkGraphiteMat
        );
        dockDoor.position.set(dx, hallH * 0.28 + 0.08, depth * 0.51);
        group.add(dockDoor);
      });
    }

    return group;
  }

  public dispose(): void {
    this.geometryCache.forEach((g) => g.dispose());
    this.geometryCache.clear();
    this.modelCache.clear();
  }
}
