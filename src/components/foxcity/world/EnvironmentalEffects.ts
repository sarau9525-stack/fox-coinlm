import * as THREE from 'three';
import { ClosedLoopPath, buildClosedLoopPath } from './TrafficSystem.js';

export interface AnimatedBoat {
  group: THREE.Group;
  shipBody: THREE.Group;
  radarSpinner?: THREE.Object3D;
  cranePivot?: THREE.Object3D;
  propellers: THREE.Object3D[];
  wakeMesh?: THREE.Mesh;
  flagMesh?: THREE.Mesh;
  loopIndex: number;
  distanceOnLoop: number;
  speed: number;
  currentSpeed: number;
  dockTimer: number;
  isDocked: boolean;
  hasDockedThisLap: boolean;
  baseY: number;
  phase: number;
}

export interface DriftingCloud {
  group: THREE.Group;
  angle: number;
  radius: number;
  speed: number;
  baseY: number;
  phase: number;
}

/**
 * Defines continuous maritime shipping lanes in the Southern Harbor Bay.
 */
export function createHarborShippingLoops(): ClosedLoopPath[] {
  return [
    // Sea Loop 0: Inner Southern Harbor Bay Loop (In front of Pier & Marketplace)
    buildClosedLoopPath([
      new THREE.Vector3(-9.8, -1.42, 10.6),
      new THREE.Vector3(6.8, -1.42, 10.6),
      new THREE.Vector3(8.2, -1.42, 12.2),
      new THREE.Vector3(6.8, -1.42, 13.8),
      new THREE.Vector3(-9.8, -1.42, 13.8),
      new THREE.Vector3(-11.2, -1.42, 12.2),
    ]),
    // Sea Loop 1: Outer Deep-Ocean Shipping Lane (For Heavy Cargo Freighter & Escort Cruiser)
    buildClosedLoopPath([
      new THREE.Vector3(9.5, -1.42, 15.2),
      new THREE.Vector3(-11.5, -1.42, 15.2),
      new THREE.Vector3(-13.2, -1.42, 16.8),
      new THREE.Vector3(-11.5, -1.42, 18.2),
      new THREE.Vector3(9.5, -1.42, 18.2),
      new THREE.Vector3(11.2, -1.42, 16.8),
    ]),
  ];
}
