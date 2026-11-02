import * as THREE from 'three';
import {
  BuildingAssetsRegistry,
  MetropolitanMaterialPalette,
} from './BuildingAssets.js';

export interface DistrictContextBuildResult {
  districtContextGroup: THREE.Group;
  swayingTrees: THREE.Group[];
}

/**
 * Builds dedicated Cities: Skylines style urban districts around the 8 core FOX buildings
 * (70% realistic modern metropolitan buildings, plazas & parks + 30% FOX architectural accents)
 * without interfering with road lanes, pedestrian sidewalks, or building selection hitboxes.
 */
export function buildMetropolitanDistricts(
  worldGroup: THREE.Group,
  assets: BuildingAssetsRegistry,
  mats: MetropolitanMaterialPalette
): DistrictContextBuildResult {
  const districtContextGroup = new THREE.Group();
  districtContextGroup.name = 'metropolitan_districts_context';
  worldGroup.add(districtContextGroup);

  // 1. Central Business District (CBD) Annex Towers flanking FOX Headquarters
  const cbdWestAnnex = assets.buildModernCurtainWallSkyscraper(mats, {
    width: 1.58,
    height: 4.15,
    depth: 1.52,
    hasSetback: true,
    hasGoldAccentFin: false,
    variant: 'diagrid_corporate',
    seed: 11,
  });
  cbdWestAnnex.position.set(-3.85, 0.72, -7.85);
  districtContextGroup.add(cbdWestAnnex);

  const cbdEastAnnex = assets.buildModernCurtainWallSkyscraper(mats, {
    width: 1.76,
    height: 4.85,
    depth: 1.62,
    hasSetback: true,
    hasGoldAccentFin: false,
    variant: 'twin_skybridge',
    seed: 22,
  });
  cbdEastAnnex.position.set(3.85, 0.72, -7.85);
  districtContextGroup.add(cbdEastAnnex);

  // 2. Outer Western Tech & Innovation Campus Buildings (West of Research Lab)
  const techCampusTower1 = assets.buildModernCurtainWallSkyscraper(mats, {
    width: 1.92,
    height: 4.25,
    depth: 1.72,
    hasSetback: true,
    hasGoldAccentFin: false,
    variant: 'cantilever_atrium',
    seed: 33,
  });
  techCampusTower1.position.set(-11.2, 0.02, -0.35);
  districtContextGroup.add(techCampusTower1);

  const techCampusBlock2 = assets.buildModernMidRiseBlock(
    mats,
    1.78,
    2.55,
    1.56,
    'commercial_galleria'
  );
  techCampusBlock2.position.set(-11.2, 0.02, 3.05);
  districtContextGroup.add(techCampusBlock2);

  // 3. Outer Eastern Modern Residential Neighborhood Towers (East of Residential District)
  const resApartmentTower1 = assets.buildModernMidRiseBlock(
    mats,
    1.74,
    3.45,
    1.52,
    'courtyard_residential'
  );
  resApartmentTower1.position.set(11.4, 0.02, -0.25);
  districtContextGroup.add(resApartmentTower1);

  const resApartmentTower2 = assets.buildModernMidRiseBlock(
    mats,
    1.58,
    2.65,
    1.42,
    'terraced_condo'
  );
  resApartmentTower2.position.set(11.4, 0.02, 3.45);
  districtContextGroup.add(resApartmentTower2);

  // 4. Waterfront Commercial District Retail & Hotel Complexes (Flanking Marketplace along Z = +6.8)
  const harborRetailWest = assets.buildModernMidRiseBlock(
    mats,
    1.82,
    2.25,
    1.46,
    'commercial_galleria'
  );
  harborRetailWest.position.set(-3.85, 0.02, 6.75);
  districtContextGroup.add(harborRetailWest);

  const harborRetailEast = assets.buildModernCurtainWallSkyscraper(mats, {
    width: 1.68,
    height: 3.35,
    depth: 1.54,
    hasSetback: true,
    hasGoldAccentFin: false,
    variant: 'diagrid_corporate',
    seed: 44,
  });
  harborRetailEast.position.set(2.35, 0.02, 6.75);
  districtContextGroup.add(harborRetailEast);

  const harborHotelTower = assets.buildModernCurtainWallSkyscraper(mats, {
    width: 1.98,
    height: 4.35,
    depth: 1.68,
    hasSetback: true,
    hasGoldAccentFin: false,
    hasRooftopHelipad: true,
    variant: 'stepped_supertall',
    seed: 55,
  });
  harborHotelTower.position.set(8.2, 0.02, 6.65);
  districtContextGroup.add(harborHotelTower);

  // 5. Industrial Mining & Logistics Annex Warehouse on Upper Northern Terrace
  const mineAssayAnnex = assets.buildModernMidRiseBlock(
    mats,
    1.75,
    1.85,
    1.55,
    'industrial_logistics'
  );
  mineAssayAnnex.position.set(-11.2, 0.72, -7.4);
  districtContextGroup.add(mineAssayAnnex);

  // 6. Urban Street Furniture: Park Benches & Stone Planter Beds for Clear Spatial Separation
  const addParkPlanterAndBench = (px: number, py: number, pz: number, rotY = 0) => {
    const unit = new THREE.Group();
    unit.position.set(px, py, pz);
    unit.rotation.y = rotY;

    // Stone planter box with lush greenery
    const planterBase = new THREE.Mesh(
      assets.getBeveledBox(0.92, 0.16, 0.38, 0.02),
      mats.architecturalConcreteMat
    );
    planterBase.position.y = 0.08;
    planterBase.castShadow = true;
    planterBase.receiveShadow = true;
    unit.add(planterBase);

    const planterTurf = new THREE.Mesh(
      assets.getBeveledBox(0.82, 0.08, 0.28, 0.015),
      mats.lushParkGrassMat
    );
    planterTurf.position.y = 0.17;
    unit.add(planterTurf);

    // Adjacent wooden & steel park bench
    const benchSeat = new THREE.Mesh(
      new THREE.BoxGeometry(0.56, 0.035, 0.18),
      mats.woodMat
    );
    benchSeat.position.set(0, 0.12, 0.30);
    benchSeat.castShadow = true;
    unit.add(benchSeat);

    const benchBack = new THREE.Mesh(
      new THREE.BoxGeometry(0.56, 0.12, 0.03),
      mats.woodMat
    );
    benchBack.position.set(0, 0.19, 0.22);
    unit.add(benchBack);

    [-0.22, 0.22].forEach((lx) => {
      const leg = new THREE.Mesh(
        new THREE.BoxGeometry(0.035, 0.12, 0.18),
        mats.industrialSteelMat
      );
      leg.position.set(lx, 0.06, 0.30);
      unit.add(leg);
    });

    districtContextGroup.add(unit);
  };

  addParkPlanterAndBench(-2.2, 0.04, 0.1, 0);
  addParkPlanterAndBench(2.2, 0.04, 0.1, 0);
  addParkPlanterAndBench(-2.2, 0.04, 2.5, Math.PI);
  addParkPlanterAndBench(2.2, 0.04, 2.5, Math.PI);
  addParkPlanterAndBench(-2.4, 0.72, -6.1, 0);
  addParkPlanterAndBench(2.4, 0.72, -6.1, 0);

  // 7. Realistic Natural 3D Deciduous & Urban Canopy Trees (Replaces low-poly 3-cone cartoon trees)
  const treePositions: Array<[number, number, number, number]> = [
    [-4.2, 0.04, -0.2, 1.08],
    [-0.5, 0.04, 0.0, 1.04],
    [3.6, 0.04, 0.2, 1.12],
    [3.8, 0.04, 2.5, 1.06],
    [-0.5, 0.04, 2.6, 0.98],
    [-9.5, 0.04, -0.4, 1.06],
    [-8.6, 0.04, 4.6, 1.02],
    [9.6, 0.04, -0.4, 1.08],
    [9.8, 0.04, 4.8, 1.04],
    [4.4, 0.04, 6.2, 1.08],
    [5.8, 0.04, 7.2, 0.98],
    [-4.8, 0.72, -6.2, 1.08],
    [4.8, 0.72, -6.2, 1.08],
    [-10.6, 0.72, -5.6, 1.04],
    [11.4, 0.72, -5.6, 1.02],
    [-14.2, 0.04, -0.2, 1.14],
    [-14.2, 0.04, 2.8, 1.08],
    [15.4, 0.04, -0.2, 1.14],
    [15.4, 0.04, 2.8, 1.08],
    [-2.8, 0.04, 6.1, 1.02],
    [0.8, 0.04, 6.1, 1.04],
  ];

  // Shared organic canopy geometries for natural deciduous crowns
  const canopyClusterGeo = new THREE.IcosahedronGeometry(0.32, 2);
  const subBranchGeo = new THREE.CylinderGeometry(0.024, 0.044, 0.42, 7);

  const swayingTrees: THREE.Group[] = [];
  treePositions.forEach(([tx, ty, tz, s], idx) => {
    const tree = new THREE.Group();
    tree.position.set(tx, ty, tz);
    tree.scale.setScalar(s);
    tree.rotation.y = (idx * 1.37) % (Math.PI * 2);

    const primaryFoliageMat =
      idx % 4 === 0 ? mats.goldenPineFoliageMat : mats.pineFoliageMat;
    const secondaryFoliageMat =
      idx % 2 === 0 ? mats.lushParkGrassMat : mats.pineFoliageMat;

    // 1. Circular Stone Tree-Pit Planter Curb & Dark Mulch Bed at Ground Level
    const treeCurb = new THREE.Mesh(
      new THREE.CylinderGeometry(0.34, 0.36, 0.055, 14),
      mats.architecturalConcreteMat
    );
    treeCurb.position.y = 0.028;
    treeCurb.receiveShadow = true;
    tree.add(treeCurb);

    const treeGrate = new THREE.Mesh(
      new THREE.CylinderGeometry(0.28, 0.28, 0.062, 12),
      mats.darkGraphiteMat
    );
    treeGrate.position.y = 0.031;
    tree.add(treeGrate);

    // 2. Natural Tapered Hardwood Trunk with Subtle Organic Lean & Root Flare
    const rootFlare = new THREE.Mesh(
      new THREE.CylinderGeometry(0.085, 0.145, 0.22, 8),
      mats.woodMat
    );
    rootFlare.position.y = 0.11;
    rootFlare.castShadow = true;
    tree.add(rootFlare);

    const mainTrunk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.058, 0.092, 0.62, 8),
      mats.woodMat
    );
    mainTrunk.position.set(0.012, 0.46, 0);
    mainTrunk.rotation.z = -0.04;
    mainTrunk.castShadow = true;
    mainTrunk.receiveShadow = true;
    tree.add(mainTrunk);

    // 3. 4 Diverging Secondary Timber Limbs Reaching Into the Canopy
    for (let b = 0; b < 4; b++) {
      const bAng = (b * Math.PI) / 2 + 0.35;
      const limb = new THREE.Mesh(subBranchGeo, mats.woodMat);
      limb.position.set(
        Math.cos(bAng) * 0.12,
        0.78 + (b % 2) * 0.06,
        Math.sin(bAng) * 0.12
      );
      limb.rotation.z = -Math.cos(bAng) * 0.48;
      limb.rotation.x = Math.sin(bAng) * 0.48;
      limb.castShadow = true;
      tree.add(limb);
    }

    // 4. Multi-Cluster Organic Deciduous Leaf Canopy (8 overlapping sculpted foliage clouds)
    const canopyClusters: Array<[number, number, number, number, number, number, boolean]> = [
      [0.0, 1.18, 0.0, 1.38, 1.08, 1.35, false],     // Central main crown
      [-0.26, 0.98, 0.18, 1.05, 0.86, 1.02, true],   // SW lower bough
      [0.28, 1.02, 0.16, 1.08, 0.88, 1.04, false],   // SE lower bough
      [-0.22, 1.04, -0.24, 1.02, 0.85, 1.05, false], // NW mid bough
      [0.24, 0.96, -0.22, 0.98, 0.82, 0.98, true],   // NE lower bough
      [-0.14, 1.34, 0.12, 0.94, 0.82, 0.92, true],   // Upper west crown
      [0.16, 1.36, -0.10, 0.92, 0.84, 0.94, false],  // Upper east crown
      [0.02, 1.48, 0.02, 0.78, 0.72, 0.78, true],    // Sunlit apex crown
    ];

    canopyClusters.forEach(([cx, cy, cz, sx, sy, sz, useAlt], cIdx) => {
      const leafCloud = new THREE.Mesh(
        canopyClusterGeo,
        useAlt ? secondaryFoliageMat : primaryFoliageMat
      );
      leafCloud.position.set(cx, cy, cz);
      leafCloud.scale.set(sx, sy, sz);
      leafCloud.rotation.set(cIdx * 0.5, cIdx * 0.9, cIdx * 0.3);
      leafCloud.castShadow = true;
      leafCloud.receiveShadow = true;
      tree.add(leafCloud);
    });

    worldGroup.add(tree);
    swayingTrees.push(tree);
  });

  return {
    districtContextGroup,
    swayingTrees,
  };
}
