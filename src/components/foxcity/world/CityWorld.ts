import * as THREE from 'three';
import {
  BuildingAssetsRegistry,
  MetropolitanMaterialPalette,
} from './BuildingAssets.js';

export interface CityWorldBuildResult {
  oceanMesh: THREE.Mesh;
  islandFoamRing: THREE.Mesh;
  skylineBillboards: THREE.Mesh[];
  skylineSpireCrowns: THREE.Mesh[];
}

/**
 * Constructs the continuous metropolitan landmass, harbor basin seawalls,
 * urban block foundations, and multi-ring distant skyscraper skyline.
 * Replaces the old isolated floating-island cone with a realistic Cities: Skylines metropolitan environment.
 */
export function buildMetropolitanCityWorld(
  worldGroup: THREE.Group,
  assets: BuildingAssetsRegistry,
  mats: MetropolitanMaterialPalette,
  waterGeo: THREE.PlaneGeometry,
  waterMat: THREE.MeshStandardMaterial,
  harborLagoonMat: THREE.MeshStandardMaterial,
  skylineBillboardMats: THREE.MeshStandardMaterial[]
): CityWorldBuildResult {
  // 1. Deep-Water Harbor Bay & Metropolitan Ocean Basin
  const oceanMesh = new THREE.Mesh(waterGeo, waterMat);
  oceanMesh.rotation.x = -Math.PI / 2;
  oceanMesh.position.y = -1.48;
  oceanMesh.receiveShadow = true;
  worldGroup.add(oceanMesh);

  // Subtle Harbor Breakwater Wave-Foam Line along the Southern Seawall (Replaces old oval island ring)
  const seaFoamMat = new THREE.MeshBasicMaterial({
    color: 0xe0f2fe,
    transparent: true,
    opacity: 0.42,
  });
  const islandFoamRing = new THREE.Mesh(
    new THREE.PlaneGeometry(56.0, 0.55),
    seaFoamMat
  );
  islandFoamRing.rotation.x = -Math.PI / 2;
  islandFoamRing.position.set(0, -1.42, 8.45);
  worldGroup.add(islandFoamRing);

  // 2. Continuous Metropolitan Landmass & Sub-Base Foundation (No floating island cone!)
  const metroBedrock = new THREE.Mesh(
    new THREE.BoxGeometry(84.0, 2.2, 54.0),
    mats.cliffRockMat
  );
  metroBedrock.position.set(0.0, -1.35, -18.5);
  metroBedrock.receiveShadow = true;
  worldGroup.add(metroBedrock);

  // Main Continuous Metropolitan Urban Ground Plane (Ends at Z = +8.2 Southern Harbor Seawall)
  const mainPlateau = new THREE.Mesh(
    new THREE.BoxGeometry(68.0, 0.52, 38.0),
    mats.grassTerrainMat
  );
  mainPlateau.position.set(0.0, -0.23, -10.8);
  mainPlateau.receiveShadow = true;
  worldGroup.add(mainPlateau);

  // Paved Urban Block Foundations under Central, West, East & Harbor Districts (70% realistic urban stone/concrete)
  const urbanPlazaPads: Array<[number, number, number, number, number]> = [
    [-9.2, 0.015, 1.3, 5.2, 5.2],   // West Tech Campus Urban Block
    [9.2, 0.015, 1.8, 5.2, 5.4],    // East Residential Urban Block
    [-1.2, 0.015, 6.6, 8.2, 2.8],   // Harborfront Commercial Promenade Block
    [-17.2, 0.015, 1.2, 7.6, 11.5], // Outer West Metropolitan Block
    [17.8, 0.015, 1.2, 7.6, 11.5],  // Outer East Metropolitan Block
  ];
  urbanPlazaPads.forEach(([px, py, pz, pw, pd]) => {
    const blockSlab = new THREE.Mesh(
      assets.getBeveledBox(pw, 0.05, pd, 0.02),
      mats.architecturalConcreteMat
    );
    blockSlab.position.set(px, py, pz);
    blockSlab.receiveShadow = true;
    worldGroup.add(blockSlab);
  });

  // 3. Southern Waterfront Concrete & Granite Harbor Seawall Promenade along Z = +8.2
  const seawallConcrete = new THREE.Mesh(
    new THREE.BoxGeometry(64.0, 1.65, 0.55),
    mats.architecturalConcreteMat
  );
  seawallConcrete.position.set(0.0, -0.68, 8.18);
  seawallConcrete.receiveShadow = true;
  worldGroup.add(seawallConcrete);

  const harborSeawallCap = new THREE.Mesh(
    assets.getBeveledBox(52.0, 0.16, 0.42, 0.03),
    mats.sidewalkMat
  );
  harborSeawallCap.position.set(0.0, 0.08, 8.16);
  worldGroup.add(harborSeawallCap);

  // Subtle 30% FOX Gold Accent Trim Rail along Central Harbor Promenade
  const harborGoldTrim = new THREE.Mesh(
    new THREE.BoxGeometry(24.0, 0.05, 0.08),
    mats.goldMetalMat
  );
  harborGoldTrim.position.set(0.0, 0.18, 8.28);
  worldGroup.add(harborGoldTrim);

  // 4. Southwest Harbor Canal & Eastern River Waterway
  const canalMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(3.4, 3.6, 12, 12),
    harborLagoonMat
  );
  canalMesh.rotation.x = -Math.PI / 2;
  canalMesh.position.set(-6.0, 0.042, 6.4);
  canalMesh.receiveShadow = true;
  worldGroup.add(canalMesh);

  [-7.75, -4.25].forEach((qx) => {
    const quayWall = new THREE.Mesh(
      new THREE.BoxGeometry(0.24, 0.14, 3.6),
      mats.architecturalConcreteMat
    );
    quayWall.position.set(qx, 0.06, 6.4);
    worldGroup.add(quayWall);
  });

  const riverTopMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(3.6, 8.8, 8, 12),
    harborLagoonMat
  );
  riverTopMesh.rotation.x = -Math.PI / 2;
  riverTopMesh.position.set(12.6, 0.03, 1.8);
  worldGroup.add(riverTopMesh);

  // Waterfall Plunge Pool Foam Rings in Eastern Harbor Channel
  [
    [13.4, -1.4, 1.8, 1.5],
    [10.5, -1.4, 7.8, 1.35],
  ].forEach(([fx, fy, fz, fr]) => {
    const plungeFoam = new THREE.Mesh(
      new THREE.RingGeometry(fr * 0.45, fr, 20),
      seaFoamMat
    );
    plungeFoam.rotation.x = -Math.PI / 2;
    plungeFoam.position.set(fx, fy, fz);
    worldGroup.add(plungeFoam);
  });

  // 5. Expanded Northern Civic & CBD Elevated Terrace (Continuous Metropolitan Upper Tier)
  const northTerrace = new THREE.Mesh(
    new THREE.BoxGeometry(58.0, 0.72, 22.0),
    mats.architecturalConcreteMat
  );
  northTerrace.position.set(0.0, 0.26, -14.1);
  northTerrace.receiveShadow = true;
  worldGroup.add(northTerrace);

  // Architectural Concrete Retaining Wall Cap along Z = -3.1
  const retainingWall = new THREE.Mesh(
    new THREE.BoxGeometry(58.2, 0.14, 0.36),
    mats.architecturalConcreteMat
  );
  retainingWall.position.set(0.0, 0.64, -3.12);
  worldGroup.add(retainingWall);

  const northTerraceTop = new THREE.Mesh(
    new THREE.BoxGeometry(57.4, 0.14, 21.6),
    mats.sidewalkMat
  );
  northTerraceTop.position.set(0.0, 0.66, -14.1);
  northTerraceTop.receiveShadow = true;
  worldGroup.add(northTerraceTop);

  // Green Park Strips on Upper Civic Terrace flanking FOX Headquarters
  [-4.4, 4.4].forEach((gx) => {
    const civicLawn = new THREE.Mesh(
      assets.getBeveledBox(3.4, 0.05, 3.6, 0.02),
      mats.lushParkGrassMat
    );
    civicLawn.position.set(gx, 0.72, -7.2);
    civicLawn.receiveShadow = true;
    worldGroup.add(civicLawn);
  });

  // 6. Multi-Ring Realistic Metropolis Skyline & Surrounding Urban Blocks
  const skylineBillboards: THREE.Mesh[] = [];
  const skylineSpireCrowns: THREE.Mesh[] = [];

  const skylineSpecs: Array<[number, number, number, number, number, number]> = [
    // Inner Northern CBD High-Rise Row (Z = -11.4 to -12.2) — varied heights & footprints
    [-14.6, 0.7, -11.2, 1.95, 4.6, 1.75],
    [-11.2, 0.7, -11.6, 2.35, 6.2, 2.05],
    [-7.4, 0.7, -11.8, 2.05, 5.1, 1.85],
    [-3.6, 0.7, -12.0, 2.55, 7.6, 2.15],
    [3.6, 0.7, -12.0, 2.45, 7.1, 2.10],
    [7.4, 0.7, -11.8, 2.15, 5.6, 1.90],
    [11.2, 0.7, -11.6, 2.40, 6.5, 2.05],
    [14.6, 0.7, -11.2, 1.90, 4.4, 1.75],
    // Outer Northern Metropolis Skyline Row (Z = -15.8 to -17.2)
    [-18.5, 0.7, -15.6, 2.5, 5.8, 2.2],
    [-13.5, 0.7, -16.2, 2.9, 8.2, 2.4],
    [-8.5, 0.7, -16.5, 2.6, 9.4, 2.3],
    [-3.2, 0.7, -16.8, 3.2, 10.8, 2.6],
    [3.2, 0.7, -16.8, 3.0, 10.1, 2.5],
    [8.5, 0.7, -16.5, 2.7, 8.8, 2.3],
    [13.5, 0.7, -16.2, 2.9, 7.6, 2.4],
    [18.5, 0.7, -15.6, 2.4, 5.6, 2.1],
    // Western Metropolitan Urban District Blocks (X = -15.4 to -18.8)
    [-15.6, 0.0, -5.8, 2.25, 5.4, 1.95],
    [-15.8, 0.0, -1.8, 1.95, 4.1, 1.80],
    [-15.8, 0.0, 2.4, 2.15, 4.7, 1.90],
    [-16.2, 0.0, 6.0, 1.85, 3.2, 1.70],
    // Eastern Metropolitan Urban District Blocks (X = +15.6 to +18.8)
    [16.2, 0.0, -5.6, 2.20, 5.2, 1.95],
    [16.4, 0.0, -1.6, 1.90, 3.9, 1.75],
    [16.4, 0.0, 2.6, 2.15, 4.5, 1.90],
    [16.6, 0.0, 6.0, 1.85, 3.1, 1.70],
  ];

  const variants = [
    'stepped_supertall',
    'diagrid_corporate',
    'sail_waterfront',
    'twin_skybridge',
    'terraced_ziggurat',
    'cantilever_atrium',
  ] as const;

  skylineSpecs.forEach(([sx, sy, sz, sw, sh, sd], idx) => {
    // Reserve gold accent fins strictly for the two central backdrop towers behind FOX HQ
    const hasGoldAccent = idx === 3 || idx === 4;
    const isOuterResidential = idx >= 16 && idx % 2 === 1;
    const towerGroup = isOuterResidential
      ? assets.buildModernMidRiseBlock(
          mats,
          sw,
          sh * 0.88,
          sd,
          idx % 3 === 0 ? 'terraced_condo' : 'courtyard_residential'
        )
      : assets.buildModernCurtainWallSkyscraper(mats, {
          width: sw,
          height: sh,
          depth: sd,
          hasSetback: idx % 2 === 0,
          hasGoldAccentFin: hasGoldAccent,
          hasRooftopHelipad: idx % 5 === 0,
          variant: variants[(idx * 5 + Math.floor(idx / 6)) % variants.length],
          seed: idx * 17 + 5,
        });
    towerGroup.position.set(sx, sy, sz);

    // Subtle Illuminated Corporate Rooftop Sign on Selected CBD Towers
    if (idx < 8 && idx % 2 === 0 && skylineBillboardMats.length > 0) {
      const bMat = skylineBillboardMats[(idx / 2) % skylineBillboardMats.length];
      const billboard = new THREE.Mesh(
        new THREE.BoxGeometry(sw * 0.78, 0.56, 0.1),
        bMat
      );
      billboard.position.set(0, sh * 0.84, sd * 0.54);
      towerGroup.add(billboard);
      skylineBillboards.push(billboard);
    }

    // Architectural Rooftop Communications Mast & Beacon
    if (!isOuterResidential && idx % 2 === 0) {
      const topH = sh * 1.08;
      const mast = new THREE.Mesh(
        new THREE.CylinderGeometry(0.025, 0.06, 1.1, 8),
        mats.industrialSteelMat
      );
      mast.position.y = topH + 0.55;
      towerGroup.add(mast);

      const spireCrown = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.14, 0),
        hasGoldAccent ? mats.amberCrystalMat : mats.cyanEnergyMat
      );
      spireCrown.position.y = topH + 1.18;
      towerGroup.add(spireCrown);
      skylineSpireCrowns.push(spireCrown);
    }

    worldGroup.add(towerGroup);
  });

  return {
    oceanMesh,
    islandFoamRing,
    skylineBillboards,
    skylineSpireCrowns,
  };
}
