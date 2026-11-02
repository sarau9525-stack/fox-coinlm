import * as THREE from 'three';
import { ClosedLoopPath, buildClosedLoopPath } from './TrafficSystem.js';

export interface SidewalkFoxNpc {
  group: THREE.Group;
  leftLeg: THREE.Object3D;
  rightLeg: THREE.Object3D;
  leftArm: THREE.Object3D;
  rightArm: THREE.Object3D;
  tail: THREE.Object3D;
  head: THREE.Group;
  loopIndex: number;
  distanceOnLoop: number;
  baseSpeed: number;
  phase: number;
}

/**
 * Defines collision-free sidewalk pedestrian loops completely separated from vehicle road lanes.
 */
export function createMetropolitanSidewalkLoops(): ClosedLoopPath[] {
  return [
    // Sidewalk 0: Central Park Courtyard Promenade (Inside the central block around Fountain & Power Grid)
    buildClosedLoopPath([
      new THREE.Vector3(-4.35, 0.08, -0.35),
      new THREE.Vector3(4.35, 0.08, -0.35),
      new THREE.Vector3(4.35, 0.08, 2.95),
      new THREE.Vector3(-4.35, 0.08, 2.95),
    ]),
    // Sidewalk 1: Waterfront Harbor Promenade & Marketplace Boardwalk (South of South Boulevard)
    buildClosedLoopPath([
      new THREE.Vector3(-3.2, 0.08, 5.45),
      new THREE.Vector3(1.1, 0.08, 5.45),
      new THREE.Vector3(1.1, 0.08, 8.05),
      new THREE.Vector3(-3.2, 0.08, 8.05),
    ]),
    // Sidewalk 2: Residential Garden Courtyard Path (East of East Avenue)
    buildClosedLoopPath([
      new THREE.Vector3(7.45, 0.08, 0.55),
      new THREE.Vector3(10.65, 0.08, 0.55),
      new THREE.Vector3(10.65, 0.08, 3.85),
      new THREE.Vector3(7.45, 0.08, 3.85),
    ]),
    // Sidewalk 3: Upper Northern Citadel & Mine Esplanade (Between Northern Buildings and Upper Road)
    buildClosedLoopPath([
      new THREE.Vector3(-8.2, 0.74, -5.08),
      new THREE.Vector3(8.2, 0.74, -5.08),
      new THREE.Vector3(8.2, 0.74, -5.28),
      new THREE.Vector3(-8.2, 0.74, -5.28),
    ]),
  ];
}
