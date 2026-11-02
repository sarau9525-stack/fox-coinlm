import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

export interface ClosedLoopSegment {
  start: THREE.Vector3;
  end: THREE.Vector3;
  length: number;
  startDist: number;
  dir: THREE.Vector3;
}

export interface ClosedLoopPath {
  segments: ClosedLoopSegment[];
  totalLength: number;
}

export type VehicleCategory =
  | 'luxury_sedan'
  | 'modern_suv'
  | 'sports_car'
  | 'compact_city_car'
  | 'electric_vehicle'
  | 'delivery_van'
  | 'public_bus'
  | 'commercial_truck';

export interface LaneVehicle {
  mesh: THREE.Group;
  bodyGroup: THREE.Group;
  lodDetailGroup: THREE.Group;
  wheels: THREE.Object3D[];
  frontSteerPivots: THREE.Object3D[];
  beaconLight?: THREE.Object3D;
  category: VehicleCategory;
  loopIndex: number;
  distanceOnLoop: number;
  baseSpeed: number;
  currentSpeed: number;
  wheelRadius: number;
  vehicleLength: number;
}

export interface FoxNpcCitizen {
  group: THREE.Group;
  leftLeg: THREE.Object3D;
  rightLeg: THREE.Object3D;
  leftArm: THREE.Object3D;
  rightArm: THREE.Object3D;
  tail: THREE.Object3D;
  loopIndex: number;
  distanceOnLoop: number;
  baseSpeed: number;
  phase: number;
}

/**
 * Builds a closed loop path with smooth 12-step quadratic Bezier corner fillets at every turn.
 * Guarantees C1 tangent continuity, smooth intersection turning, and zero sudden 180-degree flips.
 */
export function buildClosedLoop(
  waypoints: Array<[number, number, number] | THREE.Vector3>,
  cornerRadius = 0.78
): ClosedLoopPath {
  const rawPts: THREE.Vector3[] = waypoints.map((p) =>
    p instanceof THREE.Vector3 ? p.clone() : new THREE.Vector3(p[0], p[1], p[2])
  );

  const n = rawPts.length;
  const refinedPts: THREE.Vector3[] = [];
  const arcSteps = 12;

  for (let i = 0; i < n; i++) {
    const prev = rawPts[(i - 1 + n) % n];
    const curr = rawPts[i];
    const next = rawPts[(i + 1) % n];

    const vIn = curr.clone().sub(prev);
    const vOut = next.clone().sub(curr);
    const lenIn = vIn.length();
    const lenOut = vOut.length();

    if (lenIn < 1e-4 || lenOut < 1e-4) {
      refinedPts.push(curr.clone());
      continue;
    }

    const uIn = vIn.clone().divideScalar(lenIn);
    const uOut = vOut.clone().divideScalar(lenOut);
    const dot = uIn.dot(uOut);

    const r = Math.min(cornerRadius, lenIn * 0.38, lenOut * 0.38);
    if (r > 0.02 && dot < 0.995) {
      const entryPt = curr.clone().addScaledVector(uIn, -r);
      const exitPt = curr.clone().addScaledVector(uOut, r);
      for (let step = 0; step <= arcSteps; step++) {
        const t = step / arcSteps;
        const oneMinusT = 1 - t;
        const pt = new THREE.Vector3()
          .addScaledVector(entryPt, oneMinusT * oneMinusT)
          .addScaledVector(curr, 2 * oneMinusT * t)
          .addScaledVector(exitPt, t * t);
        refinedPts.push(pt);
      }
    } else {
      refinedPts.push(curr.clone());
    }
  }

  const segments: ClosedLoopSegment[] = [];
  let totalLength = 0;
  for (let i = 0; i < refinedPts.length; i++) {
    const start = refinedPts[i];
    const end = refinedPts[(i + 1) % refinedPts.length];
    const length = start.distanceTo(end);
    if (length < 1e-5) continue;
    const dir = end.clone().sub(start).divideScalar(length);
    segments.push({ start, end, length, startDist: totalLength, dir });
    totalLength += length;
  }

  return { segments, totalLength };
}

export const buildClosedLoopPath = buildClosedLoop;

/**
 * Evaluates the exact 3D point on a closed loop at arc-length distance `dist`.
 */
export function evaluatePointOnClosedLoop(
  loop: ClosedLoopPath,
  dist: number,
  outPoint: THREE.Vector3
): void {
  if (loop.segments.length === 0 || loop.totalLength <= 0) {
    outPoint.set(0, 0, 0);
    return;
  }
  const d = ((dist % loop.totalLength) + loop.totalLength) % loop.totalLength;
  let segIndex = loop.segments.length - 1;
  for (let i = 0; i < loop.segments.length; i++) {
    const s = loop.segments[i];
    if (d >= s.startDist && d <= s.startDist + s.length + 1e-5) {
      segIndex = i;
      break;
    }
  }
  const seg = loop.segments[segIndex];
  const localD = THREE.MathUtils.clamp(d - seg.startDist, 0, seg.length);
  const t = seg.length > 0 ? localD / seg.length : 0;
  outPoint.lerpVectors(seg.start, seg.end, t);
}

const _aheadPoint = new THREE.Vector3();
const _steerPoint = new THREE.Vector3();
const _tangentNow = new THREE.Vector3();
const _tangentAhead = new THREE.Vector3();

/**
 * Samples the exact position, forward lookAt target (+0.04 units ahead along the curve),
 * and signed front-wheel steering angle (+left / -right) for any distance along the loop.
 */
export function sampleClosedLoop(
  loop: ClosedLoopPath,
  dist: number,
  outPos: THREE.Vector3,
  outLookAt: THREE.Vector3
): number {
  evaluatePointOnClosedLoop(loop, dist, outPos);
  evaluatePointOnClosedLoop(loop, dist + 0.04, _aheadPoint);
  evaluatePointOnClosedLoop(loop, dist + 0.62, _steerPoint);

  _tangentNow.subVectors(_aheadPoint, outPos);
  _tangentNow.y = 0;
  if (_tangentNow.lengthSq() > 1e-8) {
    _tangentNow.normalize();
  } else {
    _tangentNow.set(0, 0, 1);
  }

  outLookAt.set(
    outPos.x + _tangentNow.x,
    outPos.y,
    outPos.z + _tangentNow.z
  );

  _tangentAhead.subVectors(_steerPoint, _aheadPoint);
  _tangentAhead.y = 0;
  if (_tangentAhead.lengthSq() > 1e-8) {
    _tangentAhead.normalize();
  } else {
    _tangentAhead.copy(_tangentNow);
  }

  const crossY = _tangentNow.z * _tangentAhead.x - _tangentNow.x * _tangentAhead.z;
  const dotXZ = _tangentNow.x * _tangentAhead.x + _tangentNow.z * _tangentAhead.z;
  const rawTurnAngle = Math.atan2(crossY, dotXZ);

  return THREE.MathUtils.clamp(rawTurnAngle * 1.45, -0.42, 0.42);
}

/**
 * Generates the metropolitan multi-lane vehicle network loops for FOX City.
 * Strictly aligned with the paved asphalt road surfaces in RoadNetwork.ts:
 * - Midtown North Boulevard: Z = -1.60 (asphalt width 1.72, top surface Y = 0.102)
 * - Midtown South Boulevard: Z = +4.20 (asphalt width 1.72, top surface Y = 0.102)
 * - West Tech Avenue:        X = -6.00 (asphalt width 1.72, top surface Y = 0.102)
 * - East Residential Avenue: X = +6.00 (asphalt width 1.72, top surface Y = 0.102)
 * - Upper Northern Terrace Ring: Z = -4.15 & Z = -9.65, X = -13.2 & X = +13.2 (top surface Y = 0.782)
 */
export function createMetropolitanVehicleLoops(): ClosedLoopPath[] {
  return [
    // Loop 0: Outer Lane of Midtown Ring Boulevard (Clockwise — 4 Right Turns)
    buildClosedLoop(
      [
        [-6.38, 0.102, -1.98], // NW Corner -> drives East along North Boulevard Outer Lane (Z = -1.98)
        [6.38, 0.102, -1.98],  // NE Corner -> drives South along East Avenue Outer Lane (X = +6.38)
        [6.38, 0.102, 4.58],   // SE Corner -> drives West along South Boulevard Outer Lane (Z = +4.58)
        [-6.38, 0.102, 4.58],  // SW Corner -> drives North along West Avenue Outer Lane (X = -6.38)
      ],
      0.78
    ),
    // Loop 1: Inner Lane of Midtown Ring Boulevard (Counter-Clockwise — 4 Left Turns)
    buildClosedLoop(
      [
        [5.62, 0.102, -1.22],  // NE Corner -> drives West along North Boulevard Inner Lane (Z = -1.22)
        [-5.62, 0.102, -1.22], // NW Corner -> drives South along West Avenue Inner Lane (X = -5.62)
        [-5.62, 0.102, 3.82],  // SW Corner -> drives East along South Boulevard Inner Lane (Z = +3.82)
        [5.62, 0.102, 3.82],   // SE Corner -> drives North along East Avenue Inner Lane (X = +5.62)
      ],
      0.78
    ),
    // Loop 2: Upper Northern Civic & CBD Terrace Ring Boulevard (Counter-Clockwise — Elevated Y = 0.782)
    buildClosedLoop(
      [
        [-13.20, 0.782, -4.15], // SW Upper Corner -> drives East along Upper Terrace Boulevard (Z = -4.15)
        [13.20, 0.782, -4.15],  // SE Upper Corner -> drives North along Upper East Avenue (X = +13.20)
        [13.20, 0.782, -9.65],  // NE Upper Corner -> drives West along Northern CBD Skyline Avenue (Z = -9.65)
        [-13.20, 0.782, -9.65], // NW Upper Corner -> drives South along Upper West Avenue (X = -13.20)
      ],
      0.78
    ),
  ];
}

// ============================================================================
// REALISTIC 3D AUTOMOTIVE FLEET BUILDER (TRUE 3D COMPOUND PROPORTIONS & SCALE)
// ============================================================================

export interface VehicleFleetMaterials {
  obsidianMat: THREE.Material;
  goldMetalMat: THREE.Material;
  brightGoldMat: THREE.Material;
  carGlassMat: THREE.Material;
  tireRubberMat: THREE.Material;
  taillightRedMat: THREE.Material;
  windowGlowMat: THREE.Material;
}

export interface BuiltVehicleModel {
  mesh: THREE.Group;
  bodyGroup: THREE.Group;
  lodDetailGroup: THREE.Group;
  wheels: THREE.Object3D[];
  frontSteerPivots: THREE.Object3D[];
  beaconLight?: THREE.Object3D;
  category: VehicleCategory;
  wheelRadius: number;
  vehicleLength: number;
}

export interface VehicleAssignmentSpec {
  category: VehicleCategory;
  variantIndex: number;
  loopIndex: number;
  startFraction: number;
  speed: number;
}

/**
 * Balanced 10-vehicle metropolitan fleet covering all 8 required vehicle categories
 * across the 3 collision-free boulevard loops.
 */
export const METROPOLITAN_FLEET_ASSIGNMENTS: VehicleAssignmentSpec[] = [
  // Loop 0 (Outer Midtown Ring Boulevard — Clockwise)
  { category: 'luxury_sedan', variantIndex: 0, loopIndex: 0, startFraction: 0.04, speed: 1.54 },
  { category: 'public_bus', variantIndex: 0, loopIndex: 0, startFraction: 0.29, speed: 1.32 },
  { category: 'sports_car', variantIndex: 0, loopIndex: 0, startFraction: 0.56, speed: 1.68 },
  { category: 'delivery_van', variantIndex: 0, loopIndex: 0, startFraction: 0.81, speed: 1.44 },

  // Loop 1 (Inner Midtown Ring Boulevard — Counter-Clockwise)
  { category: 'modern_suv', variantIndex: 0, loopIndex: 1, startFraction: 0.08, speed: 1.48 },
  { category: 'electric_vehicle', variantIndex: 0, loopIndex: 1, startFraction: 0.36, speed: 1.58 },
  { category: 'compact_city_car', variantIndex: 0, loopIndex: 1, startFraction: 0.64, speed: 1.46 },
  { category: 'luxury_sedan', variantIndex: 1, loopIndex: 1, startFraction: 0.88, speed: 1.52 },

  // Loop 2 (Upper Northern Civic & CBD Terrace Ring Boulevard — Counter-Clockwise)
  { category: 'commercial_truck', variantIndex: 0, loopIndex: 2, startFraction: 0.14, speed: 1.38 },
  { category: 'modern_suv', variantIndex: 1, loopIndex: 2, startFraction: 0.64, speed: 1.50 },
];

/**
 * World-space scale multiplier so vehicles have commanding, realistic proportions
 * relative to roads, sidewalks, and buildings from the isometric gameplay camera.
 */
const VEHICLE_WORLD_SCALE = 1.44;

export class RealisticVehicleFleetBuilder {
  private baseMats: VehicleFleetMaterials;
  private createdMaterials: THREE.Material[] = [];
  private createdTextures: THREE.Texture[] = [];

  // Automotive Metallic Paint Palette
  public paintObsidianGoldMat: THREE.MeshStandardMaterial;
  public paintSilverMetallicMat: THREE.MeshStandardMaterial;
  public paintNavyBlueMat: THREE.MeshStandardMaterial;
  public paintEmeraldSuvMat: THREE.MeshStandardMaterial;
  public paintCrimsonSportMat: THREE.MeshStandardMaterial;
  public paintPearlWhiteMat: THREE.MeshStandardMaterial;
  public paintSkyCompactMat: THREE.MeshStandardMaterial;
  public paintGlacierEvMat: THREE.MeshStandardMaterial;
  public paintCommercialVanMat: THREE.MeshStandardMaterial;
  public paintTransitBlueMat: THREE.MeshStandardMaterial;
  public paintHeavyAmberMat: THREE.MeshStandardMaterial;

  // High-Contrast Automotive Glass & Trim Materials
  public darkAutoGlassMat: THREE.MeshStandardMaterial;
  public chromeTrimMat: THREE.MeshStandardMaterial;
  public brushedAlloyMat: THREE.MeshStandardMaterial;
  public matteCladdingMat: THREE.MeshStandardMaterial;
  public carbonFiberMat: THREE.MeshStandardMaterial;
  public cyanEvGlowMat: THREE.MeshStandardMaterial;
  public amberSignalMat: THREE.MeshStandardMaterial;
  public headlightProjectorMat: THREE.MeshStandardMaterial;
  public headlightBeamMat: THREE.MeshBasicMaterial;
  public busHeaderMat: THREE.MeshStandardMaterial;

  constructor(baseMats: VehicleFleetMaterials) {
    this.baseMats = baseMats;

    const makeCarPaint = (
      colorHex: number,
      metalness = 0.68,
      roughness = 0.16,
      _clearcoat = 1.0
    ) => {
      const mat = new THREE.MeshStandardMaterial({
        color: colorHex,
        metalness,
        roughness: Math.max(0.08, roughness * 0.78),
        envMapIntensity: 1.55,
      });
      this.createdMaterials.push(mat);
      return mat;
    };

    // High-visibility realistic automotive metallic paints
    this.paintSilverMetallicMat = makeCarPaint(0xdbe4ef, 0.78, 0.15, 1.0); // Liquid Silver Sedan
    this.paintObsidianGoldMat = makeCarPaint(0x131a29, 0.75, 0.14, 1.0);   // FOX Executive Sedan
    this.paintNavyBlueMat = makeCarPaint(0x1e40af, 0.68, 0.17, 0.96);      // Sapphire Blue SUV
    this.paintEmeraldSuvMat = makeCarPaint(0x15803d, 0.66, 0.18, 0.94);    // British Racing Green SUV
    this.paintCrimsonSportMat = makeCarPaint(0xdc2626, 0.72, 0.12, 1.0);   // Rosso Corsa Sports Car
    this.paintPearlWhiteMat = makeCarPaint(0xf8fafc, 0.35, 0.14, 0.98);    // Pearl White Trim / Roof
    this.paintSkyCompactMat = makeCarPaint(0x0284c7, 0.65, 0.16, 0.95);    // Electric Blue Compact Car
    this.paintGlacierEvMat = makeCarPaint(0xe2e8f0, 0.62, 0.14, 1.0);      // Glacier Silver EV
    this.paintCommercialVanMat = makeCarPaint(0xf8fafc, 0.28, 0.2, 0.86);  // Sprinter Van White
    this.paintTransitBlueMat = makeCarPaint(0x0369a1, 0.55, 0.18, 0.92);   // Metro Bus Blue
    this.paintHeavyAmberMat = makeCarPaint(0xd97706, 0.62, 0.2, 0.88);     // Heavy Truck Amber-Gold

    // Deep tinted reflective automotive glass so windshields & windows stand out against paint
    this.darkAutoGlassMat = new THREE.MeshStandardMaterial({
      color: 0x060b16,
      roughness: 0.05,
      metalness: 0.35,
      envMapIntensity: 1.75,
    });

    this.chromeTrimMat = new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      metalness: 0.95,
      roughness: 0.08,
    });
    this.brushedAlloyMat = new THREE.MeshStandardMaterial({
      color: 0xcbd5e1,
      metalness: 0.88,
      roughness: 0.2,
    });
    this.matteCladdingMat = new THREE.MeshStandardMaterial({
      color: 0x161b26,
      metalness: 0.15,
      roughness: 0.78,
    });
    this.carbonFiberMat = new THREE.MeshStandardMaterial({
      color: 0x0f141d,
      metalness: 0.45,
      roughness: 0.3,
    });
    this.cyanEvGlowMat = new THREE.MeshStandardMaterial({
      color: 0xe0f2fe,
      emissive: new THREE.Color(0x38bdf8),
      emissiveIntensity: 2.2,
      roughness: 0.12,
    });
    this.amberSignalMat = new THREE.MeshStandardMaterial({
      color: 0xfbbf24,
      emissive: new THREE.Color(0xf59e0b),
      emissiveIntensity: 2.0,
      roughness: 0.18,
    });
    this.headlightProjectorMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: new THREE.Color(0xfef9c3),
      emissiveIntensity: 2.6,
      roughness: 0.08,
    });
    this.headlightBeamMat = new THREE.MeshBasicMaterial({
      color: 0xfef9c3,
      transparent: true,
      opacity: 0.16,
      depthWrite: false,
    });

    const busHeaderTex = this.createBusRouteDisplayTexture();
    this.busHeaderMat = new THREE.MeshStandardMaterial({
      map: busHeaderTex,
      emissive: new THREE.Color(0xf59e0b),
      emissiveMap: busHeaderTex,
      emissiveIntensity: 1.6,
      roughness: 0.2,
    });

    this.createdMaterials.push(
      this.darkAutoGlassMat,
      this.chromeTrimMat,
      this.brushedAlloyMat,
      this.matteCladdingMat,
      this.carbonFiberMat,
      this.cyanEvGlowMat,
      this.amberSignalMat,
      this.headlightProjectorMat,
      this.headlightBeamMat,
      this.busHeaderMat
    );
  }

  private createBusRouteDisplayTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#090d16';
      ctx.fillRect(0, 0, 256, 64);
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 4;
      ctx.strokeRect(2, 2, 252, 60);
      ctx.fillStyle = '#fbbf24';
      ctx.font = '900 32px Inter, system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('101 METRO', 128, 34);
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    this.createdTextures.push(tex);
    return tex;
  }

  /**
   * Builds a high-detail 3D automotive wheel with molded rubber tire, sidewall ring,
   * ventilated brake rotor disc, caliper, multi-spoke alloy rim, and center cap.
   */
  private buildAutomotiveWheel(
    radius: number,
    width: number,
    isLeft: boolean,
    rimMaterial: THREE.Material,
    caliperMaterial: THREE.Material,
    spokeCount = 6
  ): { steerPivot: THREE.Group; spinHub: THREE.Group } {
    const steerPivot = new THREE.Group();
    const spinHub = new THREE.Group();
    steerPivot.add(spinHub);

    // In vehicle local space (+Z forward, +Y up), +X is Left and -X is Right
    const outSign = isLeft ? 1 : -1;

    // 1. Molded Rubber Tire
    const tire = new THREE.Mesh(
      new THREE.CylinderGeometry(radius, radius, width, 12),
      this.baseMats.tireRubberMat
    );
    tire.rotation.z = Math.PI / 2;
    spinHub.add(tire);

    // 2. Outer Tire Sidewall Shoulder Torus
    const sidewall = new THREE.Mesh(
      new THREE.TorusGeometry(radius * 0.8, width * 0.18, 6, 12),
      this.baseMats.tireRubberMat
    );
    sidewall.rotation.y = Math.PI / 2;
    sidewall.position.x = outSign * (width * 0.42);
    spinHub.add(sidewall);

    // 3. Recessed Ventilated Brake Rotor Disc
    const brakeDisc = new THREE.Mesh(
      new THREE.CylinderGeometry(radius * 0.64, radius * 0.64, width * 0.68, 10),
      this.brushedAlloyMat
    );
    brakeDisc.rotation.z = Math.PI / 2;
    spinHub.add(brakeDisc);

    // 4. Brake Caliper on Steer Pivot
    const caliper = new THREE.Mesh(
      new THREE.BoxGeometry(width * 0.74, radius * 0.42, radius * 0.34),
      caliperMaterial
    );
    caliper.position.set(outSign * (width * 0.14), radius * 0.2, -radius * 0.34);
    steerPivot.add(caliper);

    // 5. Deep-Dish Multi-Spoke Machined Alloy Rim Face
    const activeSpokes = Math.min(5, Math.max(5, spokeCount));
    for (let s = 0; s < activeSpokes; s++) {
      const sAngle = (s / activeSpokes) * Math.PI * 2;
      const spoke = new THREE.Mesh(
        new THREE.BoxGeometry(0.02, radius * 1.28, 0.022),
        rimMaterial
      );
      spoke.position.x = outSign * (width * 0.49);
      spoke.rotation.x = sAngle;
      spinHub.add(spoke);
    }

    // 6. Bright Alloy Rim Lip & Chrome Center Cap
    const rimLip = new THREE.Mesh(
      new THREE.TorusGeometry(radius * 0.7, 0.016, 6, 12),
      rimMaterial
    );
    rimLip.rotation.y = Math.PI / 2;
    rimLip.position.x = outSign * (width * 0.49);
    spinHub.add(rimLip);

    const centerCap = new THREE.Mesh(
      new THREE.CylinderGeometry(radius * 0.24, radius * 0.24, width + 0.024, 8),
      this.chromeTrimMat
    );
    centerCap.rotation.z = Math.PI / 2;
    spinHub.add(centerCap);

    return { steerPivot, spinHub };
  }

  /**
   * Attaches 4 (or 6) wheels, 3D flared fenders, and dark wheel-well housings.
   */
  private attachWheelsAndFenders(
    vGroup: THREE.Group,
    bodyGroup: THREE.Group,
    wheels: THREE.Object3D[],
    frontSteerPivots: THREE.Object3D[],
    coords: Array<[number, number, number, boolean, boolean]>,
    wheelRadius: number,
    wheelWidth: number,
    rimMat: THREE.Material,
    fenderMat: THREE.Material,
    caliperMat: THREE.Material,
    spokeCount = 5
  ): void {
    coords.forEach(([wx, wy, wz, , isFront]) => {
      const isLeft = wx > 0;
      const { steerPivot, spinHub } = this.buildAutomotiveWheel(
        wheelRadius,
        wheelWidth,
        isLeft,
        rimMat,
        caliperMat,
        spokeCount
      );
      steerPivot.position.set(wx, wy, wz);
      vGroup.add(steerPivot);
      wheels.push(spinHub);
      if (isFront) frontSteerPivots.push(steerPivot);

      // Sculpted Semi-Circular Wheel Arch Flare
      const archFlare = new THREE.Mesh(
        new THREE.CylinderGeometry(
          wheelRadius + 0.032,
          wheelRadius + 0.032,
          wheelWidth + 0.036,
          10,
          1,
          false,
          0,
          Math.PI
        ),
        fenderMat
      );
      archFlare.rotation.z = Math.PI / 2;
      archFlare.rotation.y = Math.PI / 2;
      archFlare.position.set(wx * 0.94, wy + 0.008, wz);
      bodyGroup.add(archFlare);

      // Dark Inner Wheel-Well Liner
      const wellLiner = new THREE.Mesh(
        new THREE.CylinderGeometry(
          wheelRadius + 0.018,
          wheelRadius + 0.018,
          wheelWidth + 0.04,
          8,
          1,
          false,
          0,
          Math.PI
        ),
        this.baseMats.obsidianMat
      );
      wellLiner.rotation.z = Math.PI / 2;
      wellLiner.rotation.y = Math.PI / 2;
      wellLiner.position.set(wx * 0.82, wy + 0.004, wz);
      bodyGroup.add(wellLiner);
    });
  }

  /**
   * Builds a true 3D multi-panel glass greenhouse cabin with:
   * - Continuous sculpted 3D aerodynamic roof/pillar profile (rotateY(-Math.PI / 2) so +x -> +Z Front)
   * - Sloped 3D front windshield (+Z), sloped rear window (-Z), tapered dark side windows (±X)
   * - Sculpted side shoulder beltline creases, windshield wipers (+Z), and chrome window sills.
   */
  private buildSculptedAutomotiveFuselage(
    bodyGroup: THREE.Group,
    options: {
      bodyWidth: number;
      cabinWidth: number;
      bottomY: number;
      bumperFrontZ: number;
      noseTipY: number;
      hoodFrontZ: number;
      hoodFrontY: number;
      windshieldBaseZ: number;
      beltlineY: number;
      roofFrontZ: number;
      roofY: number;
      roofRearZ: number;
      rearWindowBaseZ: number;
      deckRearZ: number;
      deckRearY: number;
      bumperRearZ: number;
      bodyPaintMat: THREE.Material;
      roofPaintMat?: THREE.Material;
      sillTrimMat: THREE.Material;
      fenderFlareMat?: THREE.Material;
      frontAxleZ: number;
      rearAxleZ: number;
      hasSunroof?: boolean;
      hasBPillar?: boolean;
      hasCPillarQuarterGlass?: boolean;
    }
  ): void {
    const {
      bodyWidth,
      cabinWidth,
      bottomY,
      bumperFrontZ,
      noseTipY,
      hoodFrontZ,
      hoodFrontY,
      windshieldBaseZ,
      beltlineY,
      roofFrontZ,
      roofY,
      roofRearZ,
      rearWindowBaseZ,
      deckRearZ,
      deckRearY,
      bumperRearZ,
      bodyPaintMat,
      roofPaintMat = bodyPaintMat,
      sillTrimMat,
      fenderFlareMat = bodyPaintMat,
      frontAxleZ,
      rearAxleZ,
      hasSunroof = true,
      hasBPillar = true,
      hasCPillarQuarterGlass = false,
    } = options;

    // 1. FULL-LENGTH 3D SCULPTED LOWER FUSELAGE CHASSIS (Hood + Doors + Quarter Panels + Trunk)
    // In 2D Shape: +X maps to +Z (Front), -X maps to -Z (Rear), +Y maps to +Y (Up) after rotateY(-Math.PI/2)
    const lowerShape = new THREE.Shape();
    lowerShape.moveTo(bumperRearZ + 0.015, bottomY);
    lowerShape.lineTo(bumperFrontZ - 0.015, bottomY);
    // Front lower chin curve up to nose tip
    lowerShape.quadraticCurveTo(
      bumperFrontZ + 0.008,
      (bottomY + noseTipY) * 0.5,
      hoodFrontZ,
      hoodFrontY
    );
    // Sculpted sloped front hood up to base of windshield
    lowerShape.quadraticCurveTo(
      (hoodFrontZ + windshieldBaseZ) * 0.5,
      hoodFrontY + (beltlineY - hoodFrontY) * 0.68,
      windshieldBaseZ,
      beltlineY + 0.008
    );
    // Beltline along cabin doors to base of rear window
    lowerShape.lineTo(rearWindowBaseZ, beltlineY + 0.006);
    // Sculpted rear decklid / trunk / tailgate contour
    lowerShape.quadraticCurveTo(
      (rearWindowBaseZ + deckRearZ) * 0.5,
      deckRearY + 0.012,
      deckRearZ,
      deckRearY
    );
    // Rear bumper drop back to underbody
    lowerShape.quadraticCurveTo(
      bumperRearZ - 0.008,
      (bottomY + deckRearY) * 0.5,
      bumperRearZ + 0.015,
      bottomY
    );
    lowerShape.closePath();

    const lowerBevel = 0.024;
    const lowerCoreDepth = Math.max(0.22, bodyWidth - lowerBevel * 2);
    const lowerHullGeo = new THREE.ExtrudeGeometry(lowerShape, {
      depth: lowerCoreDepth,
      bevelEnabled: true,
      bevelSegments: 2,
      curveSegments: 4,
      steps: 1,
      bevelSize: lowerBevel,
      bevelThickness: lowerBevel,
    });
    lowerHullGeo.translate(0, 0, -lowerCoreDepth * 0.5);
    lowerHullGeo.rotateY(-Math.PI / 2);
    lowerHullGeo.computeVertexNormals();

    const lowerHullMesh = new THREE.Mesh(lowerHullGeo, bodyPaintMat);
    lowerHullMesh.castShadow = true;
    lowerHullMesh.receiveShadow = true;
    bodyGroup.add(lowerHullMesh);

    // 2. SCULPTED 3D WIDEBODY FRONT & REAR FENDER HAUNCHES + SIDE ROCKER SCULPTING
    const fenderY = bottomY + (beltlineY - bottomY) * 0.54;
    const fenderH = (beltlineY - bottomY) * 0.72;
    [-1, 1].forEach((sideSign) => {
      const fx = sideSign * (bodyWidth * 0.485);

      // Front sculpted fender haunch over front wheel arch
      const frontHaunch = new THREE.Mesh(
        new RoundedBoxGeometry(0.042, fenderH, 0.25, 1, 0.016),
        fenderFlareMat
      );
      frontHaunch.position.set(fx, fenderY, frontAxleZ);
      frontHaunch.rotation.z = -sideSign * 0.12;
      bodyGroup.add(frontHaunch);

      // Rear muscular quarter-panel haunch over rear wheel arch
      const rearHaunch = new THREE.Mesh(
        new RoundedBoxGeometry(0.046, fenderH * 1.04, 0.27, 1, 0.018),
        fenderFlareMat
      );
      rearHaunch.position.set(fx, fenderY + 0.006, rearAxleZ);
      rearHaunch.rotation.z = -sideSign * 0.14;
      bodyGroup.add(rearHaunch);

      // Sculpted lower door rocker panel & upper shoulder crease line
      const doorSpanZ = Math.abs(frontAxleZ - rearAxleZ);
      const doorCenterZ = (frontAxleZ + rearAxleZ) * 0.5;
      const shoulderLine = new THREE.Mesh(
        new RoundedBoxGeometry(0.026, 0.024, doorSpanZ + 0.18, 1, 0.008),
        bodyPaintMat
      );
      shoulderLine.position.set(
        sideSign * (bodyWidth * 0.502),
        beltlineY - 0.022,
        doorCenterZ
      );
      bodyGroup.add(shoulderLine);

      const rockerSkirt = new THREE.Mesh(
        new RoundedBoxGeometry(0.032, 0.032, doorSpanZ * 0.82, 1, 0.008),
        this.matteCladdingMat
      );
      rockerSkirt.position.set(
        sideSign * (bodyWidth * 0.495),
        bottomY + 0.022,
        doorCenterZ
      );
      bodyGroup.add(rockerSkirt);
    });

    // 3. SCULPTED 3D AERODYNAMIC GREENHOUSE CABIN & RECESSED SIDE WINDOWS
    this.build3DTaperedGreenhouse(bodyGroup, {
      cabinWidth,
      beltlineY,
      roofY,
      windshieldBaseZ,
      roofFrontZ,
      roofRearZ,
      rearWindowBaseZ,
      roofPaintMat,
      pillarMat: roofPaintMat,
      sillTrimMat,
      hasSunroof,
      hasBPillar,
      hasCPillarQuarterGlass,
    });
  }

  /**
   * Builds a 3D contoured upper greenhouse cabin with an extruded aerodynamic roof arch,
   * flush dark-tinted side window glazing (follows the exact A/C pillar contour without
   * protruding as a rectangular box), raked front windshield (+Z), and rear window (-Z).
   */
  private build3DTaperedGreenhouse(
    bodyGroup: THREE.Group,
    options: {
      cabinWidth: number;
      beltlineY: number;
      roofY: number;
      windshieldBaseZ: number;
      roofFrontZ: number;
      roofRearZ: number;
      rearWindowBaseZ: number;
      roofPaintMat: THREE.Material;
      pillarMat: THREE.Material;
      sillTrimMat: THREE.Material;
      hasSunroof?: boolean;
      hasBPillar?: boolean;
      hasCPillarQuarterGlass?: boolean;
    }
  ): void {
    const {
      cabinWidth,
      beltlineY,
      roofY,
      windshieldBaseZ,
      roofFrontZ,
      roofRearZ,
      rearWindowBaseZ,
      roofPaintMat,
      pillarMat,
      sillTrimMat,
      hasSunroof = true,
      hasBPillar = true,
      hasCPillarQuarterGlass = false,
    } = options;

    const cabinH = roofY - beltlineY;
    const midY = beltlineY + cabinH * 0.5;
    const glassCoreZLen = windshieldBaseZ - rearWindowBaseZ;
    const glassCoreCenterZ = (windshieldBaseZ + rearWindowBaseZ) * 0.5;
    const roofLen = roofFrontZ - roofRearZ;
    const roofCenterZ = (roofFrontZ + roofRearZ) * 0.5;

    // 1. Extruded 3D Contoured Dark-Glass Cabin Core (Follows exact windshield & C-pillar slope!)
    const glassShape = new THREE.Shape();
    glassShape.moveTo(rearWindowBaseZ + 0.01, beltlineY - 0.008);
    glassShape.lineTo(windshieldBaseZ - 0.01, beltlineY - 0.008);
    glassShape.quadraticCurveTo(
      windshieldBaseZ - (windshieldBaseZ - roofFrontZ) * 0.35,
      beltlineY + cabinH * 0.58,
      roofFrontZ,
      roofY - 0.008
    );
    glassShape.quadraticCurveTo(
      roofCenterZ,
      roofY + 0.01,
      roofRearZ,
      roofY - 0.01
    );
    glassShape.quadraticCurveTo(
      roofRearZ - (roofRearZ - rearWindowBaseZ) * 0.45,
      beltlineY + cabinH * 0.54,
      rearWindowBaseZ + 0.01,
      beltlineY - 0.008
    );
    glassShape.closePath();

    const glassDepth = Math.max(0.18, cabinWidth - 0.024);
    const glassCoreGeo = new THREE.ExtrudeGeometry(glassShape, {
      depth: glassDepth,
      bevelEnabled: true,
      bevelSegments: 2,
      curveSegments: 4,
      steps: 1,
      bevelSize: 0.012,
      bevelThickness: 0.012,
    });
    glassCoreGeo.translate(0, 0, -glassDepth * 0.5);
    glassCoreGeo.rotateY(-Math.PI / 2);
    glassCoreGeo.computeVertexNormals();

    const contouredGlassCabin = new THREE.Mesh(glassCoreGeo, this.darkAutoGlassMat);
    bodyGroup.add(contouredGlassCabin);

    // 2. Sculpted 3D Painted Roof Arch & Cantrail Frame (Sits atop the contoured glass cabin)
    const roofCapShape = new THREE.Shape();
    roofCapShape.moveTo(roofRearZ - 0.02, roofY - 0.016);
    roofCapShape.lineTo(roofFrontZ + 0.02, roofY - 0.014);
    roofCapShape.quadraticCurveTo(
      roofCenterZ,
      roofY + 0.024,
      roofRearZ - 0.02,
      roofY - 0.016
    );
    roofCapShape.closePath();

    const roofCapDepth = Math.max(0.16, cabinWidth - 0.036);
    const roofCapGeo = new THREE.ExtrudeGeometry(roofCapShape, {
      depth: roofCapDepth,
      bevelEnabled: true,
      bevelSegments: 1,
      curveSegments: 4,
      steps: 1,
      bevelSize: 0.014,
      bevelThickness: 0.014,
    });
    roofCapGeo.translate(0, 0, -roofCapDepth * 0.5);
    roofCapGeo.rotateY(-Math.PI / 2);
    roofCapGeo.computeVertexNormals();

    const aeroRoofCap = new THREE.Mesh(roofCapGeo, roofPaintMat);
    bodyGroup.add(aeroRoofCap);

    // 3. Sloped 3D Front Windshield Panel (+Z) & Dual Wiper Blades
    const wsDz = windshieldBaseZ - roofFrontZ;
    const wsLen = Math.hypot(wsDz, cabinH);
    const wsPitch = -Math.atan2(wsDz, cabinH);
    const frontWindshield = new THREE.Mesh(
      new RoundedBoxGeometry(cabinWidth * 0.90, wsLen * 0.94, 0.024, 2, 0.006),
      this.darkAutoGlassMat
    );
    frontWindshield.position.set(0, midY, (windshieldBaseZ + roofFrontZ) * 0.5 + 0.008);
    frontWindshield.rotation.x = wsPitch;
    bodyGroup.add(frontWindshield);

    [-cabinWidth * 0.2, cabinWidth * 0.16].forEach((wx) => {
      const wiper = new THREE.Mesh(
        new THREE.BoxGeometry(cabinWidth * 0.34, 0.008, 0.012),
        this.baseMats.obsidianMat
      );
      wiper.position.set(wx, beltlineY + 0.014, windshieldBaseZ + 0.01);
      wiper.rotation.z = -0.12;
      bodyGroup.add(wiper);
    });

    // 4. Sloped 3D Rear Backlight Window Panel (-Z)
    const rwDz = roofRearZ - rearWindowBaseZ;
    const rwLen = Math.hypot(rwDz, cabinH);
    const rwPitch = Math.atan2(rwDz, cabinH);
    const rearWindow = new THREE.Mesh(
      new RoundedBoxGeometry(cabinWidth * 0.88, rwLen * 0.94, 0.024, 2, 0.006),
      this.darkAutoGlassMat
    );
    rearWindow.position.set(0, midY, (roofRearZ + rearWindowBaseZ) * 0.5 - 0.008);
    rearWindow.rotation.x = rwPitch;
    bodyGroup.add(rearWindow);

    // 5. Dark Panoramic Sunroof Inset & Rear Shark-Fin Antenna on Roof
    if (hasSunroof && roofLen > 0.20) {
      const sunroof = new THREE.Mesh(
        new RoundedBoxGeometry(cabinWidth * 0.66, 0.022, roofLen * 0.48, 2, 0.006),
        this.darkAutoGlassMat
      );
      sunroof.position.set(0, roofY + 0.014, roofCenterZ + roofLen * 0.05);
      bodyGroup.add(sunroof);
    }

    const sharkFin = new THREE.Mesh(
      new THREE.BoxGeometry(0.018, 0.028, 0.048),
      roofPaintMat
    );
    sharkFin.position.set(0, roofY + 0.022, roofRearZ + 0.04);
    bodyGroup.add(sharkFin);

    // 6. Structural A-Pillars (+Z), C-Pillars (-Z), Roof Cantrails & Chrome Window Sills
    [-1, 1].forEach((sideSign) => {
      const px = sideSign * (cabinWidth * 0.485);

      const aPillar = new THREE.Mesh(
        new THREE.BoxGeometry(0.026, wsLen + 0.015, 0.028),
        pillarMat
      );
      aPillar.position.set(px, midY, (windshieldBaseZ + roofFrontZ) * 0.5);
      aPillar.rotation.x = wsPitch;
      bodyGroup.add(aPillar);

      const cPillar = new THREE.Mesh(
        new THREE.BoxGeometry(0.034, rwLen + 0.015, 0.038),
        pillarMat
      );
      cPillar.position.set(px, midY, (roofRearZ + rearWindowBaseZ) * 0.5);
      cPillar.rotation.x = rwPitch;
      bodyGroup.add(cPillar);

      const roofRailArch = new THREE.Mesh(
        new THREE.BoxGeometry(0.028, 0.024, Math.max(0.12, roofLen + 0.02)),
        pillarMat
      );
      roofRailArch.position.set(px, roofY - 0.004, roofCenterZ);
      bodyGroup.add(roofRailArch);

      // Bright Chrome/Gold Window-Sill Beltline Strip
      const sillStrip = new THREE.Mesh(
        new THREE.BoxGeometry(0.02, 0.014, glassCoreZLen * 0.92),
        sillTrimMat
      );
      sillStrip.position.set(
        sideSign * (cabinWidth * 0.505),
        beltlineY + 0.006,
        glassCoreCenterZ
      );
      bodyGroup.add(sillStrip);
    });

    if (hasBPillar) {
      const bPillar = new THREE.Mesh(
        new THREE.BoxGeometry(cabinWidth + 0.012, cabinH * 0.88, 0.032),
        this.baseMats.obsidianMat
      );
      bPillar.position.set(0, midY - 0.004, roofCenterZ + 0.02);
      bodyGroup.add(bPillar);
    }

    if (hasCPillarQuarterGlass) {
      const quarterPillar = new THREE.Mesh(
        new THREE.BoxGeometry(cabinWidth + 0.012, cabinH * 0.88, 0.032),
        this.baseMats.obsidianMat
      );
      quarterPillar.position.set(0, midY - 0.004, roofRearZ + (roofFrontZ - roofRearZ) * 0.28);
      bodyGroup.add(quarterPillar);
    }
  }

  /**
   * Adds front headlights (+Z), LED DRL eyebrows (+Z), volumetric beams (+Z),
   * side mirrors, door seams, and door handles.
   */
  private addCommonAutomotiveDetails(
    bodyGroup: THREE.Group,
    lodDetailGroup: THREE.Group,
    halfWidth: number,
    mirrorY: number,
    mirrorZ: number,
    mirrorMat: THREE.Material,
    handleMat: THREE.Material,
    doorHandleY: number,
    doorHandlePositionsZ: number[],
    beamLength = 0.56,
    headlightX = 0.15,
    headlightY = 0.195,
    headlightZ = 0.455
  ): void {
    [-1, 1].forEach((sideSign) => {
      const stalk = new THREE.Mesh(
        new THREE.BoxGeometry(0.034, 0.018, 0.024),
        this.baseMats.obsidianMat
      );
      stalk.position.set(sideSign * (halfWidth + 0.012), mirrorY - 0.006, mirrorZ);
      bodyGroup.add(stalk);

      const mirrorHousing = new THREE.Mesh(
        new RoundedBoxGeometry(0.058, 0.038, 0.044, 2, 0.01),
        mirrorMat
      );
      mirrorHousing.position.set(sideSign * (halfWidth + 0.032), mirrorY, mirrorZ - 0.004);
      bodyGroup.add(mirrorHousing);

      doorHandlePositionsZ.forEach((hz) => {
        const handle = new THREE.Mesh(
          new RoundedBoxGeometry(0.022, 0.016, 0.056, 2, 0.005),
          handleMat
        );
        handle.position.set(sideSign * (halfWidth + 0.008), doorHandleY, hz);
        bodyGroup.add(handle);

        const doorSeam = new THREE.Mesh(
          new THREE.BoxGeometry(0.008, 0.135, 0.007),
          this.baseMats.obsidianMat
        );
        doorSeam.position.set(sideSign * (halfWidth + 0.003), doorHandleY - 0.02, hz - 0.05);
        lodDetailGroup.add(doorSeam);
      });
    });

    // Bright White/Xenon Angled LED Headlights + DRL Eyebrow + Lower Intake Fog Bezels at +Z (FRONT)
    [-headlightX, headlightX].forEach((lx) => {
      const headlightHousing = new THREE.Mesh(
        new RoundedBoxGeometry(0.098, 0.048, 0.044, 2, 0.008),
        this.headlightProjectorMat
      );
      headlightHousing.position.set(lx, headlightY, headlightZ);
      headlightHousing.rotation.y = lx > 0 ? -0.14 : 0.14;
      bodyGroup.add(headlightHousing);

      // Chrome Projector Bezel Frame around Headlight
      const bezel = new THREE.Mesh(
        new THREE.BoxGeometry(0.104, 0.012, 0.046),
        this.chromeTrimMat
      );
      bezel.position.set(lx, headlightY + 0.024, headlightZ + 0.002);
      bezel.rotation.y = lx > 0 ? -0.14 : 0.14;
      bodyGroup.add(bezel);

      // Lower Front Bumper Corner Air-Intake / Fog-Light Bezel
      const intakePocket = new THREE.Mesh(
        new THREE.BoxGeometry(0.072, 0.036, 0.028),
        this.baseMats.obsidianMat
      );
      intakePocket.position.set(lx * 1.04, headlightY - 0.075, headlightZ + 0.004);
      bodyGroup.add(intakePocket);

      const beam = new THREE.Mesh(
        new THREE.ConeGeometry(0.15, beamLength, 10, 1, true),
        this.headlightBeamMat
      );
      beam.rotation.x = -Math.PI / 2;
      beam.position.set(lx, 0.072, headlightZ + beamLength * 0.52);
      lodDetailGroup.add(beam);
    });
  }

  private finalizeScaledVehicle(
    vGroup: THREE.Group,
    bodyGroup: THREE.Group,
    lodDetailGroup: THREE.Group,
    wheels: THREE.Object3D[],
    frontSteerPivots: THREE.Object3D[],
    category: VehicleCategory,
    baseWheelRadius: number,
    baseLength: number,
    beaconLight?: THREE.Object3D
  ): BuiltVehicleModel {
    vGroup.scale.setScalar(VEHICLE_WORLD_SCALE);
    return {
      mesh: vGroup,
      bodyGroup,
      lodDetailGroup,
      wheels,
      frontSteerPivots,
      beaconLight,
      category,
      wheelRadius: baseWheelRadius * VEHICLE_WORLD_SCALE,
      vehicleLength: baseLength * VEHICLE_WORLD_SCALE,
    };
  }

  // ==========================================================================
  // 1. LUXURY SEDAN (Sculpted 3-Box Executive Saloon — Liquid Silver or FOX Obsidian Gold)
  // ==========================================================================
  private buildLuxurySedan(variantIndex: number): BuiltVehicleModel {
    const vGroup = new THREE.Group();
    const bodyGroup = new THREE.Group();
    const lodDetailGroup = new THREE.Group();
    vGroup.add(bodyGroup, lodDetailGroup);

    const wheels: THREE.Object3D[] = [];
    const frontSteerPivots: THREE.Object3D[] = [];
    const wheelRadius = 0.102;
    const wheelWidth = 0.076;

    const isFoxExecutive = variantIndex % 2 === 1;
    const bodyPaint = isFoxExecutive ? this.paintObsidianGoldMat : this.paintSilverMetallicMat;
    const trimMat = isFoxExecutive ? this.baseMats.brightGoldMat : this.chromeTrimMat;

    this.attachWheelsAndFenders(
      vGroup,
      bodyGroup,
      wheels,
      frontSteerPivots,
      [
        [0.215, wheelRadius, 0.295, true, true],
        [-0.215, wheelRadius, 0.295, false, true],
        [0.215, wheelRadius, -0.285, true, false],
        [-0.215, wheelRadius, -0.285, false, false],
      ],
      wheelRadius,
      wheelWidth,
      trimMat,
      bodyPaint,
      this.baseMats.taillightRedMat,
      7
    );

    // 1. Full-Body Sculpted 3-Box Executive Sedan Fuselage + Greenhouse
    this.buildSculptedAutomotiveFuselage(bodyGroup, {
      bodyWidth: 0.432,
      cabinWidth: 0.368,
      bottomY: 0.088,
      bumperFrontZ: 0.472,
      noseTipY: 0.165,
      hoodFrontZ: 0.448,
      hoodFrontY: 0.205,
      windshieldBaseZ: 0.205,
      beltlineY: 0.246,
      roofFrontZ: 0.055,
      roofY: 0.392,
      roofRearZ: -0.185,
      rearWindowBaseZ: -0.335,
      deckRearZ: -0.452,
      deckRearY: 0.228,
      bumperRearZ: -0.468,
      bodyPaintMat: bodyPaint,
      roofPaintMat: bodyPaint,
      sillTrimMat: trimMat,
      frontAxleZ: 0.295,
      rearAxleZ: -0.285,
      hasSunroof: true,
      hasBPillar: true,
    });

    // Sculpted Raised Hood Power Dome & Trunk Lip Spoiler
    const hoodPowerDome = new THREE.Mesh(
      new RoundedBoxGeometry(0.24, 0.022, 0.22, 2, 0.008),
      bodyPaint
    );
    hoodPowerDome.position.set(0, 0.232, 0.32);
    hoodPowerDome.rotation.x = 0.11;
    bodyGroup.add(hoodPowerDome);

    const trunkSpoiler = new THREE.Mesh(
      new RoundedBoxGeometry(0.38, 0.016, 0.036, 2, 0.005),
      trimMat
    );
    trunkSpoiler.position.set(0, 0.248, -0.442);
    bodyGroup.add(trunkSpoiler);

    // Front Radiator Grille (+Z), Lower Front Air Dam, Rear Diffuser & Red Taillights (-Z)
    const grilleFrame = new THREE.Mesh(
      new RoundedBoxGeometry(0.25, 0.088, 0.032, 2, 0.008),
      trimMat
    );
    grilleFrame.position.set(0, 0.166, 0.462);
    bodyGroup.add(grilleFrame);

    const grilleCore = new THREE.Mesh(
      new THREE.BoxGeometry(0.22, 0.068, 0.036),
      this.baseMats.obsidianMat
    );
    grilleCore.position.set(0, 0.166, 0.464);
    bodyGroup.add(grilleCore);

    const frontBumper = new THREE.Mesh(
      new RoundedBoxGeometry(0.445, 0.042, 0.075, 2, 0.012),
      this.matteCladdingMat
    );
    frontBumper.position.set(0, 0.096, 0.448);
    bodyGroup.add(frontBumper);

    const rearBumper = new THREE.Mesh(
      new RoundedBoxGeometry(0.442, 0.048, 0.075, 2, 0.012),
      this.matteCladdingMat
    );
    rearBumper.position.set(0, 0.098, -0.448);
    bodyGroup.add(rearBumper);

    const taillightBar = new THREE.Mesh(
      new RoundedBoxGeometry(0.40, 0.038, 0.028, 2, 0.006),
      this.baseMats.taillightRedMat
    );
    taillightBar.position.set(0, 0.205, -0.46);
    bodyGroup.add(taillightBar);

    [-0.135, 0.135].forEach((ex) => {
      const exhaust = new THREE.Mesh(
        new THREE.CylinderGeometry(0.02, 0.02, 0.06, 10),
        trimMat
      );
      exhaust.rotation.x = Math.PI / 2;
      exhaust.position.set(ex, 0.092, -0.472);
      bodyGroup.add(exhaust);
    });

    this.addCommonAutomotiveDetails(
      bodyGroup,
      lodDetailGroup,
      0.215,
      0.265,
      0.145,
      bodyPaint,
      trimMat,
      0.215,
      [0.04, -0.15],
      0.58,
      0.155,
      0.188,
      0.456
    );

    return this.finalizeScaledVehicle(
      vGroup,
      bodyGroup,
      lodDetailGroup,
      wheels,
      frontSteerPivots,
      'luxury_sedan',
      wheelRadius,
      0.95
    );
  }

  // ==========================================================================
  // 2. MODERN SUV (Sculpted Full-Size Luxury Crossover SUV — Sapphire Blue or Emerald Green)
  // ==========================================================================
  private buildModernSuv(variantIndex: number): BuiltVehicleModel {
    const vGroup = new THREE.Group();
    const bodyGroup = new THREE.Group();
    const lodDetailGroup = new THREE.Group();
    vGroup.add(bodyGroup, lodDetailGroup);

    const wheels: THREE.Object3D[] = [];
    const frontSteerPivots: THREE.Object3D[] = [];
    const wheelRadius = 0.116;
    const wheelWidth = 0.088;

    const bodyPaint = variantIndex % 2 === 0 ? this.paintNavyBlueMat : this.paintEmeraldSuvMat;

    this.attachWheelsAndFenders(
      vGroup,
      bodyGroup,
      wheels,
      frontSteerPivots,
      [
        [0.23, wheelRadius, 0.295, true, true],
        [-0.23, wheelRadius, 0.295, false, true],
        [0.23, wheelRadius, -0.295, true, false],
        [-0.23, wheelRadius, -0.295, false, false],
      ],
      wheelRadius,
      wheelWidth,
      this.chromeTrimMat,
      this.matteCladdingMat,
      this.brushedAlloyMat,
      6
    );

    // 1. Full-Body Sculpted 2-Box SUV Fuselage + Long Station-Wagon Greenhouse
    this.buildSculptedAutomotiveFuselage(bodyGroup, {
      bodyWidth: 0.458,
      cabinWidth: 0.398,
      bottomY: 0.112,
      bumperFrontZ: 0.478,
      noseTipY: 0.215,
      hoodFrontZ: 0.455,
      hoodFrontY: 0.272,
      windshieldBaseZ: 0.21,
      beltlineY: 0.302,
      roofFrontZ: 0.075,
      roofY: 0.448,
      roofRearZ: -0.375,
      rearWindowBaseZ: -0.45,
      deckRearZ: -0.462,
      deckRearY: 0.285,
      bumperRearZ: -0.475,
      bodyPaintMat: bodyPaint,
      roofPaintMat: bodyPaint,
      sillTrimMat: this.chromeTrimMat,
      fenderFlareMat: this.matteCladdingMat,
      frontAxleZ: 0.295,
      rearAxleZ: -0.295,
      hasSunroof: true,
      hasBPillar: true,
      hasCPillarQuarterGlass: true,
    });

    // Brushed Aluminum Roof Rack Side Rails & Roof Spoiler
    [-0.165, 0.165].forEach((rx) => {
      const roofRail = new THREE.Mesh(
        new THREE.BoxGeometry(0.02, 0.024, 0.39),
        this.chromeTrimMat
      );
      roofRail.position.set(rx, 0.464, -0.15);
      bodyGroup.add(roofRail);
    });

    const roofTailgateSpoiler = new THREE.Mesh(
      new RoundedBoxGeometry(0.38, 0.022, 0.055, 2, 0.006),
      bodyPaint
    );
    roofTailgateSpoiler.position.set(0, 0.442, -0.405);
    bodyGroup.add(roofTailgateSpoiler);

    // Bold Chrome SUV Grille (+Z), Brushed Silver Skid Plates & Split Rear LED Taillights (-Z)
    const suvGrille = new THREE.Mesh(
      new RoundedBoxGeometry(0.28, 0.105, 0.032, 2, 0.01),
      this.chromeTrimMat
    );
    suvGrille.position.set(0, 0.225, 0.472);
    bodyGroup.add(suvGrille);

    const skidPlateFront = new THREE.Mesh(
      new RoundedBoxGeometry(0.34, 0.048, 0.05, 2, 0.01),
      this.brushedAlloyMat
    );
    skidPlateFront.position.set(0, 0.118, 0.468);
    bodyGroup.add(skidPlateFront);

    const skidPlateRear = new THREE.Mesh(
      new RoundedBoxGeometry(0.35, 0.048, 0.05, 2, 0.01),
      this.brushedAlloyMat
    );
    skidPlateRear.position.set(0, 0.118, -0.468);
    bodyGroup.add(skidPlateRear);

    [-0.16, 0.16].forEach((tx) => {
      const tailCluster = new THREE.Mesh(
        new RoundedBoxGeometry(0.115, 0.058, 0.03, 2, 0.006),
        this.baseMats.taillightRedMat
      );
      tailCluster.position.set(tx, 0.258, -0.468);
      bodyGroup.add(tailCluster);
    });

    this.addCommonAutomotiveDetails(
      bodyGroup,
      lodDetailGroup,
      0.228,
      0.318,
      0.16,
      this.baseMats.obsidianMat,
      this.chromeTrimMat,
      0.26,
      [0.05, -0.15],
      0.62,
      0.168,
      0.238,
      0.468
    );

    return this.finalizeScaledVehicle(
      vGroup,
      bodyGroup,
      lodDetailGroup,
      wheels,
      frontSteerPivots,
      'modern_suv',
      wheelRadius,
      0.97
    );
  }

  // ==========================================================================
  // 3. SPORTS CAR (Low, Wide Sculpted Wedge Supercar Coupe — Crimson Red)
  // ==========================================================================
  private buildSportsCar(): BuiltVehicleModel {
    const vGroup = new THREE.Group();
    const bodyGroup = new THREE.Group();
    const lodDetailGroup = new THREE.Group();
    vGroup.add(bodyGroup, lodDetailGroup);

    const wheels: THREE.Object3D[] = [];
    const frontSteerPivots: THREE.Object3D[] = [];
    const wheelRadius = 0.098;
    const wheelWidth = 0.09;

    this.attachWheelsAndFenders(
      vGroup,
      bodyGroup,
      wheels,
      frontSteerPivots,
      [
        [0.23, wheelRadius, 0.285, true, true],
        [-0.23, wheelRadius, 0.285, false, true],
        [0.235, wheelRadius, -0.275, true, false],
        [-0.235, wheelRadius, -0.275, false, false],
      ],
      wheelRadius,
      wheelWidth,
      this.baseMats.brightGoldMat,
      this.paintCrimsonSportMat,
      this.baseMats.taillightRedMat,
      5
    );

    // 1. Full-Body Sculpted Aerodynamic Wedge Supercar Fuselage + Teardrop Canopy
    this.buildSculptedAutomotiveFuselage(bodyGroup, {
      bodyWidth: 0.465,
      cabinWidth: 0.358,
      bottomY: 0.074,
      bumperFrontZ: 0.468,
      noseTipY: 0.115,
      hoodFrontZ: 0.435,
      hoodFrontY: 0.142,
      windshieldBaseZ: 0.24,
      beltlineY: 0.212,
      roofFrontZ: 0.04,
      roofY: 0.338,
      roofRearZ: -0.145,
      rearWindowBaseZ: -0.355,
      deckRearZ: -0.445,
      deckRearY: 0.205,
      bumperRearZ: -0.458,
      bodyPaintMat: this.paintCrimsonSportMat,
      roofPaintMat: this.paintCrimsonSportMat,
      sillTrimMat: this.carbonFiberMat,
      frontAxleZ: 0.285,
      rearAxleZ: -0.275,
      hasSunroof: false,
      hasBPillar: false,
    });

    // Mid-Engine Black Louvers along Fastback Deck (-Z)
    for (let lz = -0.17; lz >= -0.31; lz -= 0.045) {
      const louver = new THREE.Mesh(
        new THREE.BoxGeometry(0.24, 0.016, 0.026),
        this.carbonFiberMat
      );
      louver.position.set(0, 0.268 + (lz + 0.24) * 0.28, lz);
      bodyGroup.add(louver);
    }

    // Carbon Front Splitter (+Z), Side Intakes, GT Rear Wing Spoiler (-Z) & Diffuser
    const frontSplitter = new THREE.Mesh(
      new THREE.BoxGeometry(0.468, 0.024, 0.085),
      this.carbonFiberMat
    );
    frontSplitter.position.set(0, 0.072, 0.452);
    bodyGroup.add(frontSplitter);

    const rearDiffuser = new THREE.Mesh(
      new THREE.BoxGeometry(0.448, 0.048, 0.07),
      this.carbonFiberMat
    );
    rearDiffuser.position.set(0, 0.092, -0.446);
    bodyGroup.add(rearDiffuser);

    [-0.234, 0.234].forEach((sx) => {
      const intakeScoop = new THREE.Mesh(
        new THREE.BoxGeometry(0.026, 0.078, 0.13),
        this.baseMats.obsidianMat
      );
      intakeScoop.position.set(sx, 0.168, -0.11);
      bodyGroup.add(intakeScoop);
    });

    [-0.125, 0.125].forEach((wx) => {
      const strut = new THREE.Mesh(
        new THREE.BoxGeometry(0.018, 0.062, 0.048),
        this.carbonFiberMat
      );
      strut.position.set(wx, 0.242, -0.405);
      bodyGroup.add(strut);
    });
    const rearWingBlade = new THREE.Mesh(
      new RoundedBoxGeometry(0.44, 0.02, 0.08, 2, 0.006),
      this.carbonFiberMat
    );
    rearWingBlade.position.set(0, 0.272, -0.415);
    rearWingBlade.rotation.x = 0.08;
    bodyGroup.add(rearWingBlade);

    const sportTaillight = new THREE.Mesh(
      new THREE.BoxGeometry(0.42, 0.032, 0.026),
      this.baseMats.taillightRedMat
    );
    sportTaillight.position.set(0, 0.185, -0.456);
    bodyGroup.add(sportTaillight);

    [-0.08, -0.035, 0.035, 0.08].forEach((ex) => {
      const tip = new THREE.Mesh(
        new THREE.CylinderGeometry(0.016, 0.016, 0.055, 8),
        this.chromeTrimMat
      );
      tip.rotation.x = Math.PI / 2;
      tip.position.set(ex, 0.092, -0.468);
      bodyGroup.add(tip);
    });

    this.addCommonAutomotiveDetails(
      bodyGroup,
      lodDetailGroup,
      0.23,
      0.23,
      0.14,
      this.paintCrimsonSportMat,
      this.carbonFiberMat,
      0.185,
      [-0.02],
      0.64,
      0.168,
      0.142,
      0.456
    );

    return this.finalizeScaledVehicle(
      vGroup,
      bodyGroup,
      lodDetailGroup,
      wheels,
      frontSteerPivots,
      'sports_car',
      wheelRadius,
      0.93
    );
  }

  // ==========================================================================
  // 4. COMPACT CITY CAR (Sculpted Urban 2-Box Hatchback — Electric Blue + White Roof)
  // ==========================================================================
  private buildCompactCityCar(): BuiltVehicleModel {
    const vGroup = new THREE.Group();
    const bodyGroup = new THREE.Group();
    const lodDetailGroup = new THREE.Group();
    vGroup.add(bodyGroup, lodDetailGroup);

    const wheels: THREE.Object3D[] = [];
    const frontSteerPivots: THREE.Object3D[] = [];
    const wheelRadius = 0.094;
    const wheelWidth = 0.072;

    this.attachWheelsAndFenders(
      vGroup,
      bodyGroup,
      wheels,
      frontSteerPivots,
      [
        [0.20, wheelRadius, 0.235, true, true],
        [-0.20, wheelRadius, 0.235, false, true],
        [0.20, wheelRadius, -0.235, true, false],
        [-0.20, wheelRadius, -0.235, false, false],
      ],
      wheelRadius,
      wheelWidth,
      this.chromeTrimMat,
      this.paintSkyCompactMat,
      this.brushedAlloyMat,
      5
    );

    // 1. Full-Body Sculpted 2-Box Urban Hatchback Fuselage + Contrasting White Floating Roof
    this.buildSculptedAutomotiveFuselage(bodyGroup, {
      bodyWidth: 0.408,
      cabinWidth: 0.356,
      bottomY: 0.086,
      bumperFrontZ: 0.382,
      noseTipY: 0.155,
      hoodFrontZ: 0.358,
      hoodFrontY: 0.198,
      windshieldBaseZ: 0.17,
      beltlineY: 0.238,
      roofFrontZ: 0.035,
      roofY: 0.376,
      roofRearZ: -0.265,
      rearWindowBaseZ: -0.352,
      deckRearZ: -0.365,
      deckRearY: 0.235,
      bumperRearZ: -0.378,
      bodyPaintMat: this.paintSkyCompactMat,
      roofPaintMat: this.paintPearlWhiteMat,
      sillTrimMat: this.chromeTrimMat,
      frontAxleZ: 0.235,
      rearAxleZ: -0.235,
      hasSunroof: false,
      hasBPillar: true,
    });

    const compactGrille = new THREE.Mesh(
      new RoundedBoxGeometry(0.22, 0.068, 0.028, 2, 0.008),
      this.baseMats.obsidianMat
    );
    compactGrille.position.set(0, 0.152, 0.378);
    bodyGroup.add(compactGrille);

    [-0.148, 0.148].forEach((tx) => {
      const vTail = new THREE.Mesh(
        new RoundedBoxGeometry(0.058, 0.09, 0.026, 2, 0.005),
        this.baseMats.taillightRedMat
      );
      vTail.position.set(tx, 0.235, -0.372);
      bodyGroup.add(vTail);
    });

    this.addCommonAutomotiveDetails(
      bodyGroup,
      lodDetailGroup,
      0.204,
      0.255,
      0.11,
      this.paintPearlWhiteMat,
      this.chromeTrimMat,
      0.205,
      [0.02, -0.14],
      0.52,
      0.138,
      0.182,
      0.375
    );

    return this.finalizeScaledVehicle(
      vGroup,
      bodyGroup,
      lodDetailGroup,
      wheels,
      frontSteerPivots,
      'compact_city_car',
      wheelRadius,
      0.78
    );
  }

  // ==========================================================================
  // 5. ELECTRIC VEHICLE (Sculpted Aero Fastback EV — Glacier Silver + Cyan Lightbar)
  // ==========================================================================
  private buildElectricVehicle(): BuiltVehicleModel {
    const vGroup = new THREE.Group();
    const bodyGroup = new THREE.Group();
    const lodDetailGroup = new THREE.Group();
    vGroup.add(bodyGroup, lodDetailGroup);

    const wheels: THREE.Object3D[] = [];
    const frontSteerPivots: THREE.Object3D[] = [];
    const wheelRadius = 0.104;
    const wheelWidth = 0.078;

    this.attachWheelsAndFenders(
      vGroup,
      bodyGroup,
      wheels,
      frontSteerPivots,
      [
        [0.218, wheelRadius, 0.29, true, true],
        [-0.218, wheelRadius, 0.29, false, true],
        [0.218, wheelRadius, -0.29, true, false],
        [-0.218, wheelRadius, -0.29, false, false],
      ],
      wheelRadius,
      wheelWidth,
      this.brushedAlloyMat,
      this.paintGlacierEvMat,
      this.cyanEvGlowMat,
      8
    );

    // 1. Full-Body Sculpted One-Bow Aerodynamic Fastback EV Fuselage
    this.buildSculptedAutomotiveFuselage(bodyGroup, {
      bodyWidth: 0.438,
      cabinWidth: 0.378,
      bottomY: 0.088,
      bumperFrontZ: 0.468,
      noseTipY: 0.155,
      hoodFrontZ: 0.438,
      hoodFrontY: 0.195,
      windshieldBaseZ: 0.23,
      beltlineY: 0.244,
      roofFrontZ: 0.025,
      roofY: 0.39,
      roofRearZ: -0.20,
      rearWindowBaseZ: -0.415,
      deckRearZ: -0.455,
      deckRearY: 0.228,
      bumperRearZ: -0.466,
      bodyPaintMat: this.paintGlacierEvMat,
      roofPaintMat: this.paintGlacierEvMat,
      sillTrimMat: this.chromeTrimMat,
      frontAxleZ: 0.29,
      rearAxleZ: -0.29,
      hasSunroof: true,
      hasBPillar: true,
    });

    // Signature Full-Width Front Ice-Cyan/White EV Horizon Lightbar (+Z)
    const evFrontLightbar = new THREE.Mesh(
      new THREE.BoxGeometry(0.40, 0.028, 0.03),
      this.cyanEvGlowMat
    );
    evFrontLightbar.position.set(0, 0.192, 0.462);
    bodyGroup.add(evFrontLightbar);

    const lowerAeroIntake = new THREE.Mesh(
      new THREE.BoxGeometry(0.32, 0.034, 0.032),
      this.baseMats.obsidianMat
    );
    lowerAeroIntake.position.set(0, 0.108, 0.458);
    bodyGroup.add(lowerAeroIntake);

    // Full-Width Rear Red LED Wrap Lightbar (-Z)
    const evRearLightbar = new THREE.Mesh(
      new THREE.BoxGeometry(0.41, 0.036, 0.028),
      this.baseMats.taillightRedMat
    );
    evRearLightbar.position.set(0, 0.22, -0.458);
    bodyGroup.add(evRearLightbar);

    this.addCommonAutomotiveDetails(
      bodyGroup,
      lodDetailGroup,
      0.218,
      0.265,
      0.16,
      this.paintGlacierEvMat,
      this.chromeTrimMat,
      0.22,
      [0.04, -0.15],
      0.58,
      0.155,
      0.184,
      0.458
    );

    return this.finalizeScaledVehicle(
      vGroup,
      bodyGroup,
      lodDetailGroup,
      wheels,
      frontSteerPivots,
      'electric_vehicle',
      wheelRadius,
      0.93
    );
  }

  // ==========================================================================
  // 6. DELIVERY VAN (Sculpted High-Roof Commercial Sprinter Logistics Van)
  // ==========================================================================
  private buildDeliveryVan(): BuiltVehicleModel {
    const vGroup = new THREE.Group();
    const bodyGroup = new THREE.Group();
    const lodDetailGroup = new THREE.Group();
    vGroup.add(bodyGroup, lodDetailGroup);

    const wheels: THREE.Object3D[] = [];
    const frontSteerPivots: THREE.Object3D[] = [];
    const wheelRadius = 0.108;
    const wheelWidth = 0.082;

    this.attachWheelsAndFenders(
      vGroup,
      bodyGroup,
      wheels,
      frontSteerPivots,
      [
        [0.228, wheelRadius, 0.34, true, true],
        [-0.228, wheelRadius, 0.34, false, true],
        [0.228, wheelRadius, -0.34, true, false],
        [-0.228, wheelRadius, -0.34, false, false],
      ],
      wheelRadius,
      wheelWidth,
      this.brushedAlloyMat,
      this.matteCladdingMat,
      this.baseMats.obsidianMat,
      6
    );

    // 1. Continuous Sculpted Sprinter Van Fuselage Profile (Sloped Hood + Steep Windshield + High Roof Cargo Body)
    const vanShape = new THREE.Shape();
    vanShape.moveTo(-0.535, 0.105);
    vanShape.lineTo(0.535, 0.105);
    vanShape.quadraticCurveTo(0.552, 0.18, 0.525, 0.255);
    // Sloped Sprinter short hood
    vanShape.lineTo(0.425, 0.305);
    // Steeply raked Sprinter windshield up to high roof crown
    vanShape.quadraticCurveTo(0.335, 0.435, 0.235, 0.532);
    // High-roof cargo bay crown
    vanShape.lineTo(-0.505, 0.532);
    vanShape.quadraticCurveTo(-0.535, 0.525, -0.535, 0.485);
    vanShape.lineTo(-0.535, 0.105);
    vanShape.closePath();

    const vanDepth = 0.425;
    const vanHullGeo = new THREE.ExtrudeGeometry(vanShape, {
      depth: vanDepth,
      bevelEnabled: true,
      bevelSegments: 3,
      steps: 1,
      bevelSize: 0.02,
      bevelThickness: 0.02,
    });
    vanHullGeo.translate(0, 0, -vanDepth * 0.5);
    vanHullGeo.rotateY(-Math.PI / 2);
    vanHullGeo.computeVertexNormals();

    const vanHullMesh = new THREE.Mesh(vanHullGeo, this.paintCommercialVanMat);
    vanHullMesh.castShadow = true;
    vanHullMesh.receiveShadow = true;
    bodyGroup.add(vanHullMesh);

    // 2. Sprinter Cab Windshield & Side Window Glazing (+Z = +0.12 to +0.43)
    this.build3DTaperedGreenhouse(bodyGroup, {
      cabinWidth: 0.438,
      beltlineY: 0.305,
      roofY: 0.515,
      windshieldBaseZ: 0.428,
      roofFrontZ: 0.245,
      roofRearZ: 0.115,
      rearWindowBaseZ: 0.105,
      roofPaintMat: this.paintCommercialVanMat,
      pillarMat: this.paintCommercialVanMat,
      sillTrimMat: this.matteCladdingMat,
      hasSunroof: false,
      hasBPillar: false,
    });

    // Recessed Side Panel Stamplings & Gold Logistics Beltline Stripe on Cargo Bay
    [-1, 1].forEach((sideSign) => {
      const panelRecess = new THREE.Mesh(
        new RoundedBoxGeometry(0.016, 0.16, 0.54, 2, 0.005),
        this.paintPearlWhiteMat
      );
      panelRecess.position.set(sideSign * 0.232, 0.395, -0.20);
      bodyGroup.add(panelRecess);
    });

    const vanLowerTrim = new THREE.Mesh(
      new RoundedBoxGeometry(0.476, 0.058, 1.07, 2, 0.014),
      this.matteCladdingMat
    );
    vanLowerTrim.position.set(0, 0.125, 0);
    bodyGroup.add(vanLowerTrim);

    const logisticsStripe = new THREE.Mesh(
      new THREE.BoxGeometry(0.472, 0.036, 0.64),
      this.baseMats.brightGoldMat
    );
    logisticsStripe.position.set(0, 0.295, -0.20);
    bodyGroup.add(logisticsStripe);

    const vanGrille = new THREE.Mesh(
      new RoundedBoxGeometry(0.28, 0.115, 0.03, 2, 0.008),
      this.matteCladdingMat
    );
    vanGrille.position.set(0, 0.205, 0.542);
    bodyGroup.add(vanGrille);

    const rearDoorSeam = new THREE.Mesh(
      new THREE.BoxGeometry(0.014, 0.39, 0.022),
      this.baseMats.obsidianMat
    );
    rearDoorSeam.position.set(0, 0.33, -0.542);
    bodyGroup.add(rearDoorSeam);

    [-0.195, 0.195].forEach((tx) => {
      const vTail = new THREE.Mesh(
        new THREE.BoxGeometry(0.048, 0.125, 0.026),
        this.baseMats.taillightRedMat
      );
      vTail.position.set(tx, 0.24, -0.542);
      bodyGroup.add(vTail);
    });

    this.addCommonAutomotiveDetails(
      bodyGroup,
      lodDetailGroup,
      0.232,
      0.36,
      0.31,
      this.matteCladdingMat,
      this.matteCladdingMat,
      0.27,
      [0.2, -0.04],
      0.62,
      0.168,
      0.215,
      0.542
    );

    return this.finalizeScaledVehicle(
      vGroup,
      bodyGroup,
      lodDetailGroup,
      wheels,
      frontSteerPivots,
      'delivery_van',
      wheelRadius,
      1.08
    );
  }

  // ==========================================================================
  // 7. PUBLIC BUS (Sculpted Aerodynamic Low-Floor Metropolitan Transit Coach)
  // ==========================================================================
  private buildPublicBus(): BuiltVehicleModel {
    const vGroup = new THREE.Group();
    const bodyGroup = new THREE.Group();
    const lodDetailGroup = new THREE.Group();
    vGroup.add(bodyGroup, lodDetailGroup);

    const wheels: THREE.Object3D[] = [];
    const frontSteerPivots: THREE.Object3D[] = [];
    const wheelRadius = 0.114;
    const wheelWidth = 0.09;

    this.attachWheelsAndFenders(
      vGroup,
      bodyGroup,
      wheels,
      frontSteerPivots,
      [
        [0.242, wheelRadius, 0.44, true, true],
        [-0.242, wheelRadius, 0.44, false, true],
        [0.242, wheelRadius, -0.22, true, false],
        [-0.242, wheelRadius, -0.22, false, false],
        [0.242, wheelRadius, -0.46, true, false],
        [-0.242, wheelRadius, -0.46, false, false],
      ],
      wheelRadius,
      wheelWidth,
      this.brushedAlloyMat,
      this.matteCladdingMat,
      this.baseMats.obsidianMat,
      6
    );

    // 1. Sculpted Aerodynamic Transit Bus Lower Body Profile (Curved Front Windscreen Nose)
    const busShape = new THREE.Shape();
    busShape.moveTo(-0.665, 0.095);
    busShape.lineTo(0.655, 0.095);
    busShape.quadraticCurveTo(0.685, 0.19, 0.665, 0.305);
    busShape.lineTo(-0.665, 0.305);
    busShape.closePath();

    const busDepth = 0.455;
    const busLowerGeo = new THREE.ExtrudeGeometry(busShape, {
      depth: busDepth,
      bevelEnabled: true,
      bevelSegments: 3,
      steps: 1,
      bevelSize: 0.02,
      bevelThickness: 0.02,
    });
    busLowerGeo.translate(0, 0, -busDepth * 0.5);
    busLowerGeo.rotateY(-Math.PI / 2);
    busLowerGeo.computeVertexNormals();

    const busLowerHull = new THREE.Mesh(busLowerGeo, this.paintTransitBlueMat);
    busLowerHull.castShadow = true;
    busLowerHull.receiveShadow = true;
    bodyGroup.add(busLowerHull);

    const metroBeltStripe = new THREE.Mesh(
      new THREE.BoxGeometry(0.502, 0.028, 1.344),
      this.baseMats.brightGoldMat
    );
    metroBeltStripe.position.set(0, 0.302, 0);
    bodyGroup.add(metroBeltStripe);

    // 2. Panoramic Dark-Tinted Passenger Window Deck + Raked Front Windshield
    const passengerGlassBand = new THREE.Mesh(
      new RoundedBoxGeometry(0.482, 0.195, 1.31, 3, 0.02),
      this.darkAutoGlassMat
    );
    passengerGlassBand.position.set(0, 0.405, -0.005);
    bodyGroup.add(passengerGlassBand);

    const busFrontWindshield = new THREE.Mesh(
      new RoundedBoxGeometry(0.46, 0.21, 0.032, 2, 0.008),
      this.darkAutoGlassMat
    );
    busFrontWindshield.position.set(0, 0.405, 0.652);
    busFrontWindshield.rotation.x = -0.14;
    bodyGroup.add(busFrontWindshield);

    for (let pz = -0.48; pz <= 0.48; pz += 0.24) {
      const pillar = new THREE.Mesh(
        new THREE.BoxGeometry(0.492, 0.195, 0.03),
        this.baseMats.obsidianMat
      );
      pillar.position.set(0, 0.405, pz);
      bodyGroup.add(pillar);
    }

    const rearBackPanel = new THREE.Mesh(
      new RoundedBoxGeometry(0.49, 0.22, 0.06, 2, 0.012),
      this.paintPearlWhiteMat
    );
    rearBackPanel.position.set(0, 0.41, -0.64);
    bodyGroup.add(rearBackPanel);

    // 3. Sculpted Pearl White Upper Roof Crown & Dual Rooftop HVAC Pods
    const busRoofCrown = new THREE.Mesh(
      new RoundedBoxGeometry(0.49, 0.064, 1.335, 3, 0.024),
      this.paintPearlWhiteMat
    );
    busRoofCrown.position.set(0, 0.525, -0.01);
    busRoofCrown.castShadow = true;
    bodyGroup.add(busRoofCrown);

    const routeSignFront = new THREE.Mesh(
      new THREE.BoxGeometry(0.36, 0.064, 0.028),
      this.busHeaderMat
    );
    routeSignFront.position.set(0, 0.522, 0.658);
    bodyGroup.add(routeSignFront);

    [-0.18, 0.22].forEach((hz) => {
      const hvacPod = new THREE.Mesh(
        new RoundedBoxGeometry(0.34, 0.052, 0.32, 2, 0.015),
        this.paintPearlWhiteMat
      );
      hvacPod.position.set(0, 0.576, hz);
      bodyGroup.add(hvacPod);
    });

    const rearGrille = new THREE.Mesh(
      new THREE.BoxGeometry(0.36, 0.14, 0.026),
      this.baseMats.obsidianMat
    );
    rearGrille.position.set(0, 0.21, -0.668);
    bodyGroup.add(rearGrille);

    [-0.195, 0.195].forEach((tx) => {
      const busTail = new THREE.Mesh(
        new THREE.BoxGeometry(0.058, 0.145, 0.028),
        this.baseMats.taillightRedMat
      );
      busTail.position.set(tx, 0.25, -0.67);
      bodyGroup.add(busTail);
    });

    this.addCommonAutomotiveDetails(
      bodyGroup,
      lodDetailGroup,
      0.248,
      0.43,
      0.62,
      this.baseMats.obsidianMat,
      this.baseMats.obsidianMat,
      0.24,
      [0.52, -0.04],
      0.68,
      0.182,
      0.175,
      0.668
    );

    return this.finalizeScaledVehicle(
      vGroup,
      bodyGroup,
      lodDetailGroup,
      wheels,
      frontSteerPivots,
      'public_bus',
      wheelRadius,
      1.36
    );
  }

  // ==========================================================================
  // 8. COMMERCIAL TRUCK (Sculpted 6-Wheel Heavy Haul Tractor & Dump Truck)
  // ==========================================================================
  private buildCommercialTruck(): BuiltVehicleModel {
    const vGroup = new THREE.Group();
    const bodyGroup = new THREE.Group();
    const lodDetailGroup = new THREE.Group();
    vGroup.add(bodyGroup, lodDetailGroup);

    const wheels: THREE.Object3D[] = [];
    const frontSteerPivots: THREE.Object3D[] = [];
    const wheelRadius = 0.124;
    const wheelWidth = 0.096;

    this.attachWheelsAndFenders(
      vGroup,
      bodyGroup,
      wheels,
      frontSteerPivots,
      [
        [0.242, wheelRadius, 0.34, true, true],
        [-0.242, wheelRadius, 0.34, false, true],
        [0.242, wheelRadius, -0.1, true, false],
        [-0.242, wheelRadius, -0.1, false, false],
        [0.242, wheelRadius, -0.36, true, false],
        [-0.242, wheelRadius, -0.36, false, false],
      ],
      wheelRadius,
      wheelWidth,
      this.baseMats.brightGoldMat,
      this.matteCladdingMat,
      this.baseMats.obsidianMat,
      6
    );

    const chassisFrame = new THREE.Mesh(
      new THREE.BoxGeometry(0.38, 0.075, 1.08),
      this.baseMats.obsidianMat
    );
    chassisFrame.position.set(0, 0.135, -0.02);
    bodyGroup.add(chassisFrame);

    [-0.21, 0.21].forEach((fx) => {
      const fuelTank = new THREE.Mesh(
        new THREE.CylinderGeometry(0.052, 0.052, 0.18, 12),
        this.brushedAlloyMat
      );
      fuelTank.rotation.x = Math.PI / 2;
      fuelTank.position.set(fx, 0.145, 0.11);
      bodyGroup.add(fuelTank);
    });

    // 1. Sculpted Heavy Tractor Cab Nose, Sloped Engine Hood & Sleeper Cab Roof (+Z = +0.10 to +0.54)
    const cabShape = new THREE.Shape();
    cabShape.moveTo(0.10, 0.145);
    cabShape.lineTo(0.535, 0.145);
    cabShape.lineTo(0.535, 0.305);
    // Sloped muscular truck hood back to base of windshield
    cabShape.quadraticCurveTo(0.45, 0.33, 0.375, 0.34);
    cabShape.lineTo(0.10, 0.34);
    cabShape.closePath();

    const cabDepth = 0.415;
    const cabGeo = new THREE.ExtrudeGeometry(cabShape, {
      depth: cabDepth,
      bevelEnabled: true,
      bevelSegments: 3,
      steps: 1,
      bevelSize: 0.018,
      bevelThickness: 0.018,
    });
    cabGeo.translate(0, 0, -cabDepth * 0.5);
    cabGeo.rotateY(-Math.PI / 2);
    cabGeo.computeVertexNormals();

    const truckCabLower = new THREE.Mesh(cabGeo, this.paintHeavyAmberMat);
    truckCabLower.castShadow = true;
    truckCabLower.receiveShadow = true;
    bodyGroup.add(truckCabLower);

    this.build3DTaperedGreenhouse(bodyGroup, {
      cabinWidth: 0.42,
      beltlineY: 0.335,
      roofY: 0.505,
      windshieldBaseZ: 0.38,
      roofFrontZ: 0.295,
      roofRearZ: 0.115,
      rearWindowBaseZ: 0.108,
      roofPaintMat: this.paintHeavyAmberMat,
      pillarMat: this.paintHeavyAmberMat,
      sillTrimMat: this.chromeTrimMat,
      hasSunroof: false,
      hasBPillar: false,
    });

    // Aerodynamic Cab Roof Fairing / Wind Deflector
    const roofDeflector = new THREE.Mesh(
      new RoundedBoxGeometry(0.38, 0.055, 0.14, 2, 0.012),
      this.paintHeavyAmberMat
    );
    roofDeflector.position.set(0, 0.522, 0.18);
    roofDeflector.rotation.x = 0.28;
    bodyGroup.add(roofDeflector);

    // Heavy Chrome Multi-Slat Radiator Grille & Front Bullbar Bumper (+Z)
    const truckGrille = new THREE.Mesh(
      new RoundedBoxGeometry(0.28, 0.15, 0.034, 2, 0.008),
      this.chromeTrimMat
    );
    truckGrille.position.set(0, 0.245, 0.538);
    bodyGroup.add(truckGrille);

    const bullbar = new THREE.Mesh(
      new RoundedBoxGeometry(0.475, 0.078, 0.058, 2, 0.012),
      this.brushedAlloyMat
    );
    bullbar.position.set(0, 0.145, 0.548);
    bodyGroup.add(bullbar);

    [-0.21, 0.21].forEach((ex) => {
      const stack = new THREE.Mesh(
        new THREE.CylinderGeometry(0.022, 0.022, 0.38, 10),
        this.chromeTrimMat
      );
      stack.position.set(ex, 0.36, 0.085);
      bodyGroup.add(stack);
    });

    const beaconLight = new THREE.Mesh(
      new THREE.SphereGeometry(0.044, 12, 12),
      this.amberSignalMat
    );
    beaconLight.position.set(0, 0.548, 0.24);
    bodyGroup.add(beaconLight);

    // Sculpted Angled Heavy Steel Dump Bed (-Z)
    const cargoBed = new THREE.Mesh(
      new RoundedBoxGeometry(0.485, 0.25, 0.62, 2, 0.016),
      this.baseMats.obsidianMat
    );
    cargoBed.position.set(0, 0.295, -0.24);
    cargoBed.castShadow = true;
    bodyGroup.add(cargoBed);

    for (let rz = -0.48; rz <= -0.02; rz += 0.15) {
      const rib = new THREE.Mesh(
        new THREE.BoxGeometry(0.50, 0.23, 0.024),
        this.baseMats.goldMetalMat
      );
      rib.position.set(0, 0.295, rz);
      bodyGroup.add(rib);
    }

    const cabShield = new THREE.Mesh(
      new THREE.BoxGeometry(0.485, 0.035, 0.14),
      this.baseMats.goldMetalMat
    );
    cabShield.position.set(0, 0.435, 0.07);
    bodyGroup.add(cabShield);

    for (let i = 0; i < 4; i++) {
      const ore = new THREE.Mesh(
        new THREE.DodecahedronGeometry(0.082, 0),
        i % 2 === 0 ? this.baseMats.brightGoldMat : this.amberSignalMat
      );
      ore.position.set(
        (i % 2 === 0 ? -1 : 1) * 0.09,
        0.43 + (i % 2) * 0.025,
        -0.14 - i * 0.09
      );
      bodyGroup.add(ore);
    }

    [-0.18, 0.18].forEach((tx) => {
      const tail = new THREE.Mesh(
        new THREE.BoxGeometry(0.078, 0.048, 0.028),
        this.baseMats.taillightRedMat
      );
      tail.position.set(tx, 0.175, -0.556);
      bodyGroup.add(tail);
    });

    this.addCommonAutomotiveDetails(
      bodyGroup,
      lodDetailGroup,
      0.228,
      0.41,
      0.28,
      this.chromeTrimMat,
      this.chromeTrimMat,
      0.31,
      [0.18],
      0.65,
      0.168,
      0.235,
      0.538
    );

    return this.finalizeScaledVehicle(
      vGroup,
      bodyGroup,
      lodDetailGroup,
      wheels,
      frontSteerPivots,
      'commercial_truck',
      wheelRadius,
      1.14,
      beaconLight
    );
  }

  /**
   * Builds any of the 8 realistic 3D vehicle categories on demand.
   */
  public buildVehicleByCategory(
    category: VehicleCategory,
    variantIndex = 0
  ): BuiltVehicleModel {
    switch (category) {
      case 'luxury_sedan':
        return this.buildLuxurySedan(variantIndex);
      case 'modern_suv':
        return this.buildModernSuv(variantIndex);
      case 'sports_car':
        return this.buildSportsCar();
      case 'compact_city_car':
        return this.buildCompactCityCar();
      case 'electric_vehicle':
        return this.buildElectricVehicle();
      case 'delivery_van':
        return this.buildDeliveryVan();
      case 'public_bus':
        return this.buildPublicBus();
      case 'commercial_truck':
        return this.buildCommercialTruck();
    }
  }

  public dispose(): void {
    this.createdTextures.forEach((t) => t.dispose());
    this.createdMaterials.forEach((m) => m.dispose());
  }
}
