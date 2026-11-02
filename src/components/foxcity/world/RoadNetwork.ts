import * as THREE from 'three';
import {
  BuildingAssetsRegistry,
  MetropolitanMaterialPalette,
} from './BuildingAssets.js';

export interface TrafficSignalController {
  redBulb: THREE.Mesh;
  greenBulb: THREE.Mesh;
  isEastWest: boolean;
}

export interface RoadNetworkBuildResult {
  roadsGroup: THREE.Group;
  portCraneTrolley: THREE.Group;
  trafficSignals: TrafficSignalController[];
}

/**
 * Builds the continuous Cities: Skylines style metropolitan road network,
 * avenues, intersections, zebra crosswalks, sidewalks, streetlights, street furniture,
 * canal bridge, and harbor port container berth.
 */
export function buildMetropolitanRoadNetwork(
  worldGroup: THREE.Group,
  assets: BuildingAssetsRegistry,
  mats: MetropolitanMaterialPalette,
  taillightRedMat: THREE.MeshStandardMaterial,
  navGreenMat: THREE.MeshStandardMaterial
): RoadNetworkBuildResult {
  const roadsGroup = new THREE.Group();
  worldGroup.add(roadsGroup);

  const roadEdgeLineMat = new THREE.MeshBasicMaterial({
    color: 0xe2e8f0,
  });

  const centerLineMat = new THREE.MeshBasicMaterial({
    color: 0xfacc15,
  });

  const addRoadSegment = (
    x: number,
    y: number,
    z: number,
    w: number,
    d: number,
    hasGoldCurbAccent = false
  ) => {
    // Realistic Granite / Steel Outer Curb Bevel (Realistic stone/concrete curbs, subtle gold only at HQ terrace)
    const outerCurb = new THREE.Mesh(
      new THREE.BoxGeometry(w + 0.58, 0.068, d + 0.58),
      hasGoldCurbAccent ? mats.goldMetalMat : mats.architecturalConcreteMat
    );
    outerCurb.position.set(x, y, z);
    roadsGroup.add(outerCurb);

    // Raised Pedestrian Sidewalks on Both Sides
    const sw = new THREE.Mesh(
      new THREE.BoxGeometry(w + 0.46, 0.088, d + 0.46),
      mats.sidewalkMat
    );
    sw.position.set(x, y + 0.006, z);
    sw.receiveShadow = true;
    roadsGroup.add(sw);

    // Textured Macadam Two-Lane Asphalt Roadway
    const rd = new THREE.Mesh(
      new THREE.BoxGeometry(w, 0.096, d),
      mats.roadAsphaltMat
    );
    rd.position.set(x, y + 0.013, z);
    rd.receiveShadow = true;
    roadsGroup.add(rd);

    const isHorizontal = w >= d;
    const length = isHorizontal ? w : d;
    const roadWidth = isHorizontal ? d : w;

    // Continuous White Outer Lane Shoulder Lines
    [-1, 1].forEach((side) => {
      const edgeOffset = side * (roadWidth * 0.45);
      const edgeLine = new THREE.Mesh(
        new THREE.BoxGeometry(
          isHorizontal ? length - 0.4 : 0.038,
          0.099,
          isHorizontal ? 0.038 : length - 0.4
        ),
        roadEdgeLineMat
      );
      edgeLine.position.set(
        isHorizontal ? x : x + edgeOffset,
        y + 0.016,
        isHorizontal ? z + edgeOffset : z
      );
      roadsGroup.add(edgeLine);
    });

    // Center Divider Dashed Line separating Oncoming Lanes
    const dashCount = Math.max(2, Math.floor(length / 0.95));
    for (let i = 0; i < dashCount; i++) {
      const offset = -length / 2 + 0.48 + i * 0.95;
      const dash = new THREE.Mesh(
        new THREE.BoxGeometry(
          isHorizontal ? 0.44 : 0.065,
          0.102,
          isHorizontal ? 0.065 : 0.44
        ),
        centerLineMat
      );
      dash.position.set(
        isHorizontal ? x + offset : x,
        y + 0.018,
        isHorizontal ? z : z + offset
      );
      roadsGroup.add(dash);
    }

    // White Directional Lane Arrows painted on Asphalt Lanes every ~4.6 units
    const arrowCount = Math.max(1, Math.floor(length / 4.6));
    for (let a = 0; a < arrowCount; a++) {
      const along = -length * 0.36 + (a + 0.5) * ((length * 0.72) / arrowCount);
      [-1, 1].forEach((laneSign) => {
        const laneOffset = laneSign * (roadWidth * 0.23);
        const arrowGroup = new THREE.Group();
        arrowGroup.position.set(
          isHorizontal ? x + along : x + laneOffset,
          y + 0.019,
          isHorizontal ? z + laneOffset : z + along
        );
        // Orient arrow forward in each lane
        if (isHorizontal) {
          arrowGroup.rotation.y = laneSign > 0 ? Math.PI / 2 : -Math.PI / 2;
        } else {
          arrowGroup.rotation.y = laneSign > 0 ? 0 : Math.PI;
        }

        const stem = new THREE.Mesh(
          new THREE.BoxGeometry(0.048, 0.09, 0.24),
          roadEdgeLineMat
        );
        stem.position.z = -0.06;
        arrowGroup.add(stem);

        const head = new THREE.Mesh(
          new THREE.ConeGeometry(0.095, 0.16, 3),
          roadEdgeLineMat
        );
        head.rotation.x = Math.PI / 2;
        head.position.z = 0.1;
        arrowGroup.add(head);

        roadsGroup.add(arrowGroup);
      });
    }
  };

  const addCrosswalk = (
    x: number,
    y: number,
    z: number,
    isHorizontalCrossing: boolean
  ) => {
    for (let s = -2; s <= 2; s++) {
      const stripe = new THREE.Mesh(
        new THREE.BoxGeometry(
          isHorizontalCrossing ? 0.16 : 0.52,
          0.103,
          isHorizontalCrossing ? 0.52 : 0.16
        ),
        roadEdgeLineMat
      );
      stripe.position.set(
        isHorizontalCrossing ? x + s * 0.28 : x,
        y + 0.019,
        isHorizontalCrossing ? z : z + s * 0.28
      );
      roadsGroup.add(stripe);
    }

    // White Stop Bar & Sidewalk Tactile Curb Ramp Strips on both sides of Crosswalk
    [-0.92, 0.92].forEach((side) => {
      const tactile = new THREE.Mesh(
        new THREE.BoxGeometry(
          isHorizontalCrossing ? 0.54 : 0.12,
          0.096,
          isHorizontalCrossing ? 0.12 : 0.54
        ),
        centerLineMat
      );
      tactile.position.set(
        isHorizontalCrossing ? x : x + side,
        y + 0.014,
        isHorizontalCrossing ? z + side : z
      );
      roadsGroup.add(tactile);
    });
  };

  // =========================================================================
  // CONNECTED METROPOLITAN ARTERIAL ROAD GRID (Properly Scaled 2-Lane Roads)
  // =========================================================================
  // Core Midtown North 2-Lane Boulevard (Z = -1.60, Width = 1.72) + Metropolitan Extensions
  addRoadSegment(0, 0.04, -1.6, 13.8, 1.72, false);
  addRoadSegment(-13.8, 0.04, -1.6, 14.2, 1.72, false);
  addRoadSegment(13.8, 0.04, -1.6, 14.2, 1.72, false);

  // Core Midtown South / Harborfront 2-Lane Boulevard (Z = +4.20, Width = 1.72) + Extensions
  addRoadSegment(0, 0.04, 4.2, 13.8, 1.72, false);
  addRoadSegment(-13.8, 0.04, 4.2, 14.2, 1.72, false);
  addRoadSegment(13.8, 0.04, 4.2, 14.2, 1.72, false);

  // West Tech Avenue (X = -6.00) & East Residential Avenue (X = +6.00) (Width = 1.72)
  addRoadSegment(-6.0, 0.04, 1.3, 1.72, 7.52, false);
  addRoadSegment(6.0, 0.04, 1.3, 1.72, 7.52, false);

  // Outer West & Outer East Metropolitan Avenues (X = -12.8 & X = +14.2)
  addRoadSegment(-12.8, 0.04, 1.3, 1.62, 12.8, false);
  addRoadSegment(14.2, 0.04, 1.3, 1.62, 12.8, false);

  // Upper Northern Civic, HQ, Mine & Factory Terrace Boulevard (Z = -4.15, Y = 0.72, Width = 1.56)
  addRoadSegment(0, 0.72, -4.15, 22.0, 1.56, true);
  addRoadSegment(-16.5, 0.72, -4.15, 11.0, 1.56, false);
  addRoadSegment(16.5, 0.72, -4.15, 11.0, 1.56, false);

  // Northern CBD Skyline Avenue (Z = -9.65, Y = 0.72, Width = 1.52)
  addRoadSegment(0, 0.72, -9.65, 34.0, 1.52, false);

  // Upper Terrace West & East Connecting Avenues (X = -13.2 & X = +13.2, Y = 0.72, Width = 1.52)
  addRoadSegment(-13.2, 0.72, -6.9, 1.52, 7.02, false);
  addRoadSegment(13.2, 0.72, -6.9, 1.52, 7.02, false);

  // Pedestrian Zebra Crosswalks at Key Urban Intersections & Plaza Entrances
  addCrosswalk(-4.85, 0.04, -1.6, false);
  addCrosswalk(4.85, 0.04, -1.6, false);
  addCrosswalk(-4.85, 0.04, 4.2, false);
  addCrosswalk(4.85, 0.04, 4.2, false);
  addCrosswalk(-7.15, 0.04, -1.6, false);
  addCrosswalk(7.15, 0.04, -1.6, false);
  addCrosswalk(-7.15, 0.04, 4.2, false);
  addCrosswalk(7.15, 0.04, 4.2, false);
  addCrosswalk(-1.2, 0.04, 4.2, true);
  addCrosswalk(1.3, 0.04, -1.6, true);
  addCrosswalk(0.0, 0.72, -4.15, true);

  // Realistic Sidewalk Street Furniture: Glass Bus Stop Shelters, Benches & Planter Beds
  const addBusShelter = (bx: number, by: number, bz: number, rotY: number) => {
    const shelter = new THREE.Group();
    shelter.position.set(bx, by, bz);
    shelter.rotation.y = rotY;

    const roof = new THREE.Mesh(
      assets.getBeveledBox(0.92, 0.045, 0.42, 0.015),
      mats.darkGraphiteMat
    );
    roof.position.y = 0.48;
    shelter.add(roof);

    const backGlass = new THREE.Mesh(
      new THREE.BoxGeometry(0.86, 0.44, 0.025),
      mats.carGlassMat
    );
    backGlass.position.set(0, 0.24, -0.18);
    shelter.add(backGlass);

    [-0.41, 0.41].forEach((px) => {
      const post = new THREE.Mesh(
        new THREE.CylinderGeometry(0.022, 0.022, 0.48, 8),
        mats.industrialSteelMat
      );
      post.position.set(px, 0.24, -0.18);
      shelter.add(post);
    });

    const bench = new THREE.Mesh(
      new THREE.BoxGeometry(0.54, 0.04, 0.14),
      mats.woodMat
    );
    bench.position.set(0, 0.12, -0.1);
    shelter.add(bench);

    roadsGroup.add(shelter);
  };

  addBusShelter(-2.4, 0.09, -2.72, 0);
  addBusShelter(2.6, 0.09, 5.32, Math.PI);
  addBusShelter(-7.15, 0.09, 1.3, Math.PI / 2);

  // Architectural Concrete & Steel Bridge over SW Harbor Canal
  const bridgeGroup = new THREE.Group();
  bridgeGroup.position.set(-6.0, 0.2, 6.25);
  const bridgeDeck = new THREE.Mesh(
    assets.getBeveledBox(2.04, 0.24, 2.72, 0.03),
    mats.sidewalkMat
  );
  bridgeGroup.add(bridgeDeck);
  const bridgeRoad = new THREE.Mesh(
    new THREE.BoxGeometry(1.56, 0.26, 2.72),
    mats.roadAsphaltMat
  );
  bridgeGroup.add(bridgeRoad);
  [-0.9, 0.9].forEach((bx) => {
    const rail = new THREE.Mesh(
      assets.getBeveledBox(0.16, 0.42, 2.74, 0.025),
      mats.industrialSteelMat
    );
    rail.position.set(bx, 0.22, 0);
    bridgeGroup.add(rail);
    const topRail = new THREE.Mesh(
      new THREE.BoxGeometry(0.18, 0.05, 2.76),
      mats.architecturalConcreteMat
    );
    topRail.position.set(bx, 0.44, 0);
    bridgeGroup.add(topRail);
    [-1.05, 1.05].forEach((bz) => {
      const post = new THREE.Mesh(
        new THREE.CylinderGeometry(0.05, 0.06, 0.55, 8),
        mats.obsidianMat
      );
      post.position.set(bx, 0.5, bz);
      bridgeGroup.add(post);
      const lamp = new THREE.Mesh(
        new THREE.SphereGeometry(0.085, 8, 8),
        mats.windowGlowMat
      );
      lamp.position.set(bx, 0.8, bz);
      bridgeGroup.add(lamp);
    });
  });
  worldGroup.add(bridgeGroup);

  // Harbor Pier, Port Container Berth & Operating Gantry Crane (South of Marketplace)
  const pierGroup = new THREE.Group();
  pierGroup.position.set(-1.2, -0.16, 8.95);
  const pierDeck = new THREE.Mesh(
    assets.getBeveledBox(4.4, 0.18, 2.25, 0.03),
    mats.woodMat
  );
  pierGroup.add(pierDeck);
  const pierConcreteApron = new THREE.Mesh(
    assets.getBeveledBox(4.2, 0.06, 0.52, 0.02),
    mats.sidewalkMat
  );
  pierConcreteApron.position.set(0, 0.11, 0.86);
  pierGroup.add(pierConcreteApron);
  const pierWalkway = new THREE.Mesh(
    new THREE.BoxGeometry(1.3, 0.17, 1.7),
    mats.woodMat
  );
  pierWalkway.position.set(-2.1, 0.02, 0.65);
  pierWalkway.rotation.y = 0.35;
  pierGroup.add(pierWalkway);
  for (let px = -1.6; px <= 1.6; px += 0.8) {
    [-0.85, 0.85].forEach((pz) => {
      const post = new THREE.Mesh(
        new THREE.CylinderGeometry(0.08, 0.08, 0.85, 6),
        mats.woodMat
      );
      post.position.set(px, -0.35, pz);
      pierGroup.add(post);
    });
  }
  [-1.65, -0.85, 0, 0.85, 1.65].forEach((bx) => {
    const bollard = new THREE.Mesh(
      new THREE.CylinderGeometry(0.055, 0.07, 0.22, 8),
      mats.industrialSteelMat
    );
    bollard.position.set(bx, 0.2, 0.98);
    pierGroup.add(bollard);
  });

  const portCraneGroup = new THREE.Group();
  portCraneGroup.position.set(1.15, 0.12, 0.55);
  [-0.38, 0.38].forEach((lx) => {
    [-0.28, 0.28].forEach((lz) => {
      const leg = new THREE.Mesh(
        new THREE.BoxGeometry(0.07, 1.35, 0.07),
        mats.industrialSteelMat
      );
      leg.position.set(lx, 0.67, lz);
      portCraneGroup.add(leg);
    });
  });
  const craneCab = new THREE.Mesh(
    assets.getBeveledBox(0.88, 0.16, 0.72, 0.025),
    mats.obsidianMat
  );
  craneCab.position.set(0, 1.36, 0);
  portCraneGroup.add(craneCab);
  const craneBoom = new THREE.Mesh(
    new THREE.BoxGeometry(0.22, 0.11, 2.05),
    mats.goldMetalMat
  );
  craneBoom.position.set(0, 1.44, 0.52);
  portCraneGroup.add(craneBoom);
  const portCraneTrolley = new THREE.Group();
  portCraneTrolley.position.set(0, 1.38, 0.95);
  const trolleyCar = new THREE.Mesh(
    new THREE.BoxGeometry(0.2, 0.08, 0.22),
    mats.obsidianMat
  );
  portCraneTrolley.add(trolleyCar);
  const spreaderCable = new THREE.Mesh(
    new THREE.CylinderGeometry(0.012, 0.012, 0.52, 6),
    mats.darkGraphiteMat
  );
  spreaderCable.position.y = -0.26;
  portCraneTrolley.add(spreaderCable);
  const spreaderBar = new THREE.Mesh(
    new THREE.BoxGeometry(0.24, 0.06, 0.16),
    mats.goldMetalMat
  );
  spreaderBar.position.y = -0.52;
  portCraneTrolley.add(spreaderBar);
  portCraneGroup.add(portCraneTrolley);
  pierGroup.add(portCraneGroup);
  worldGroup.add(pierGroup);

  // Modern Urban Streetlights along Sidewalk Curbs
  const streetlampCoords: Array<[number, number, number]> = [
    [-4.55, 0.08, -0.38],
    [4.55, 0.08, -0.38],
    [-4.55, 0.08, 2.98],
    [4.55, 0.08, 2.98],
    [-7.25, 0.08, -0.38],
    [-7.25, 0.08, 2.98],
    [7.25, 0.08, -0.38],
    [7.25, 0.08, 2.98],
    [-11.2, 0.08, -0.38],
    [11.2, 0.08, -0.38],
    [-3.2, 0.08, 5.42],
    [0.8, 0.08, 5.42],
    [-4.2, 0.74, -5.28],
    [4.2, 0.74, -5.28],
    [-8.8, 0.74, -5.28],
    [8.8, 0.74, -5.28],
  ];
  streetlampCoords.forEach(([lx, ly, lz]) => {
    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.036, 0.052, 0.98, 8),
      mats.industrialSteelMat
    );
    pole.position.set(lx, ly + 0.49, lz);
    worldGroup.add(pole);
    const arm = new THREE.Mesh(
      new THREE.BoxGeometry(0.22, 0.035, 0.06),
      mats.darkGraphiteMat
    );
    arm.position.set(lx, ly + 0.98, lz);
    worldGroup.add(arm);
    const lantern = new THREE.Mesh(
      new THREE.SphereGeometry(0.082, 8, 8),
      mats.windowGlowMat
    );
    lantern.position.set(lx, ly + 0.93, lz);
    worldGroup.add(lantern);
  });

  // 3D Intersection Traffic Signals at the 4 Main Intersections
  const trafficSignals: TrafficSignalController[] = [];
  const signalCoords: Array<[number, number, number, number, boolean]> = [
    [-4.68, 0.08, -0.48, 0, true],
    [4.68, 0.08, -0.48, Math.PI, false],
    [-4.68, 0.08, 3.08, Math.PI / 2, false],
    [4.68, 0.08, 3.08, -Math.PI / 2, true],
  ];
  signalCoords.forEach(([sx, sy, sz, rotY, isEastWest]) => {
    const sigGroup = new THREE.Group();
    sigGroup.position.set(sx, sy, sz);
    sigGroup.rotation.y = rotY;

    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.038, 0.05, 1.18, 8),
      mats.obsidianMat
    );
    pole.position.y = 0.59;
    sigGroup.add(pole);

    const mastArm = new THREE.Mesh(
      new THREE.BoxGeometry(0.55, 0.045, 0.045),
      mats.industrialSteelMat
    );
    mastArm.position.set(0.24, 1.14, 0);
    sigGroup.add(mastArm);

    const signalBox = new THREE.Mesh(
      new THREE.BoxGeometry(0.12, 0.28, 0.12),
      mats.obsidianMat
    );
    signalBox.position.set(0.46, 1.08, 0);
    sigGroup.add(signalBox);

    const redBulb = new THREE.Mesh(
      new THREE.SphereGeometry(0.036, 8, 8),
      taillightRedMat.clone()
    );
    redBulb.position.set(0.46, 1.15, 0.06);
    sigGroup.add(redBulb);

    const greenBulb = new THREE.Mesh(
      new THREE.SphereGeometry(0.036, 8, 8),
      navGreenMat.clone()
    );
    greenBulb.position.set(0.46, 1.01, 0.06);
    sigGroup.add(greenBulb);

    worldGroup.add(sigGroup);
    trafficSignals.push({ redBulb, greenBulb, isEastWest });
  });

  return {
    roadsGroup,
    portCraneTrolley,
    trafficSignals,
  };
}
