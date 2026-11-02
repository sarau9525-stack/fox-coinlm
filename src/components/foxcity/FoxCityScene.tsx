import React, { Suspense, useState, useRef, useMemo } from 'react';
import { Canvas, ThreeEvent, useFrame } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Grid, Html } from '@react-three/drei';
import * as THREE from 'three';
import {
  FOX_CITY_BUILDINGS,
  FoxCityBuildingConfig,
  FoxCityBuildingId,
  BuildingResolvedState,
} from './foxCityTypes';

export interface FoxCitySceneProps {
  className?: string;
  cameraPosition?: [number, number, number];
  ambientIntensity?: number;
  showGrid?: boolean;
  selectedBuildingId?: FoxCityBuildingId | null;
  buildingStates?: Record<FoxCityBuildingId, BuildingResolvedState>;
  onSelectBuilding?: (
    buildingId: FoxCityBuildingId | null,
    buildingState?: BuildingResolvedState
  ) => void;
  children?: React.ReactNode;
}

interface InteractiveBuildingMeshProps {
  config: FoxCityBuildingConfig;
  isSelected: boolean;
  isHovered: boolean;
  resolvedState?: BuildingResolvedState;
  onSelect: (id: FoxCityBuildingId) => void;
  onHoverChange: (id: FoxCityBuildingId | null) => void;
}

const InteractiveBuildingMesh: React.FC<InteractiveBuildingMeshProps> = ({
  config,
  isSelected,
  isHovered,
  resolvedState,
  onSelect,
  onHoverChange,
}) => {
  const groupRef = useRef<THREE.Group>(null);
  const ringRef = useRef<THREE.Mesh>(null);

  useFrame((_, delta) => {
    if (groupRef.current) {
      const targetScale = isSelected ? 1.07 : isHovered ? 1.035 : 1.0;
      const next = THREE.MathUtils.lerp(
        groupRef.current.scale.x,
        targetScale,
        Math.min(1, delta * 10)
      );
      groupRef.current.scale.setScalar(next);
    }
    if (ringRef.current && (isSelected || isHovered)) {
      ringRef.current.rotation.z += delta * 1.1;
    }
  });

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    onSelect(config.id);
  };

  const handlePointerOver = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    document.body.style.cursor = 'pointer';
    onHoverChange(config.id);
  };

  const handlePointerOut = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    document.body.style.cursor = 'auto';
    onHoverChange(null);
  };

  const isHQ = config.id === 'headquarters';
  const height = isHQ ? 4.4 : 2.1;
  const width = isHQ ? 2.6 : 2.1;
  const baseY = config.position[1] > 2.6 ? 0.72 : 0.05;

  return (
    <group
      ref={groupRef}
      position={[config.position[0], baseY, config.position[2]]}
      userData={{ buildingId: config.id }}
      onClick={handleClick}
      onPointerOver={handlePointerOver}
      onPointerOut={handlePointerOut}
    >
      {/* SimCity-style Multi-Tiered Building Structure */}
      <mesh position={[0, height / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[width, height, width]} />
        <meshStandardMaterial
          color={isSelected ? '#292112' : '#1e2433'}
          emissive={isSelected ? '#f59e0b' : isHovered ? '#d97706' : '#0f172a'}
          emissiveIntensity={isSelected ? 0.55 : isHovered ? 0.3 : 0.1}
          roughness={0.28}
          metalness={0.68}
        />
      </mesh>

      {/* Upper Setback Tier & Rooftop HVAC Mechanical Penthouse */}
      <mesh position={[0, height + 0.12, 0]} castShadow>
        <boxGeometry args={[width + 0.16, 0.22, width + 0.16]} />
        <meshStandardMaterial
          color="#fbbf24"
          emissive="#d97706"
          emissiveIntensity={isSelected ? 0.85 : 0.4}
          roughness={0.2}
          metalness={0.9}
        />
      </mesh>
      <mesh position={[width * 0.2, height + 0.35, -width * 0.15]} castShadow>
        <boxGeometry args={[width * 0.35, 0.28, width * 0.35]} />
        <meshStandardMaterial color="#334155" roughness={0.5} metalness={0.5} />
      </mesh>

      {/* Visual Highlight Ring when Selected or Hovered */}
      {(isSelected || isHovered) && (
        <mesh
          ref={ringRef}
          rotation={[-Math.PI / 2, 0, 0]}
          position={[0, 0.08, 0]}
        >
          <torusGeometry args={[width * 0.78, 0.08, 12, 36]} />
          <meshStandardMaterial
            color="#fef08a"
            emissive="#f59e0b"
            emissiveIntensity={2.2}
            roughness={0.1}
          />
        </mesh>
      )}

      {/* Floating Label Badge */}
      <Html
        position={[0, height + 0.75, 0]}
        center
        distanceFactor={26}
        occlude={false}
      >
        <button
          type="button"
          onClick={(ev) => {
            ev.stopPropagation();
            onSelect(config.id);
          }}
          className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold whitespace-nowrap border transition-transform cursor-pointer ${
            isSelected
              ? 'bg-amber-500 text-slate-950 border-amber-200 scale-110 shadow-lg'
              : 'bg-slate-950/90 text-amber-300 border-amber-500/60 hover:border-amber-300'
          }`}
        >
          {config.shortName} • Lv.{resolvedState?.displayLevel ?? config.defaultDisplayLevel}
        </button>
      </Html>
    </group>
  );
};

interface DockingShipProps {
  shipIndex: number;
  portDockPosition: [number, number, number];
  cruiseSpeed?: number;
  dockDuration?: number;
}

/**
 * DockingHarborShip — Procedural 3D ship that sails along the harbor route,
 * periodically decelerates as it approaches the city port, docks at the berth
 * for a short duration (`dockDuration`), and then smoothly accelerates to resume its path.
 */
const DockingHarborShip: React.FC<DockingShipProps> = ({
  shipIndex,
  portDockPosition,
  cruiseSpeed = 0.65,
  dockDuration = 4.5,
}) => {
  const shipGroupRef = useRef<THREE.Group>(null);
  const radarRef = useRef<THREE.Mesh>(null);
  const wakeRef = useRef<THREE.Mesh>(null);

  const waypoints = useMemo(() => {
    const zOffset = shipIndex * 2.2;
    return [
      new THREE.Vector3(-12, portDockPosition[1], portDockPosition[2] + zOffset),
      new THREE.Vector3(
        portDockPosition[0],
        portDockPosition[1],
        portDockPosition[2] + zOffset
      ), // Port Dock Berth waypoint (index 1)
      new THREE.Vector3(12, portDockPosition[1], portDockPosition[2] + zOffset),
      new THREE.Vector3(14, portDockPosition[1], portDockPosition[2] + 3.5 + zOffset),
      new THREE.Vector3(-14, portDockPosition[1], portDockPosition[2] + 3.5 + zOffset),
    ];
  }, [shipIndex, portDockPosition]);

  const stateRef = useRef({
    segmentIndex: shipIndex % 2 === 0 ? 0 : 2,
    segmentProgress: (shipIndex * 0.35) % 1,
    currentSpeed: cruiseSpeed,
    isDocked: false,
    dockTimer: 0,
    hasDockedThisLap: false,
  });

  useFrame((state, delta) => {
    const dt = Math.min(0.05, delta);
    const s = stateRef.current;
    const ship = shipGroupRef.current;
    if (!ship) return;

    const a = waypoints[s.segmentIndex];
    const b = waypoints[(s.segmentIndex + 1) % waypoints.length];
    const segLength = Math.max(0.01, a.distanceTo(b));

    // Check proximity to the Port Dock waypoint (waypoints[1])
    const currentPos = new THREE.Vector3().lerpVectors(a, b, s.segmentProgress);
    const dockPoint = waypoints[1];
    const distToDock = currentPos.distanceTo(dockPoint);

    if (s.isDocked) {
      // Ship is docked at the city port berth
      s.currentSpeed = THREE.MathUtils.lerp(s.currentSpeed, 0, Math.min(1, dt * 6));
      s.dockTimer += dt;
      if (s.dockTimer >= dockDuration) {
        s.isDocked = false;
        s.dockTimer = 0;
      }
    } else {
      // Smoothly slow down when approaching the port dock (on segment 0 -> 1)
      if (s.segmentIndex === 0 && !s.hasDockedThisLap && distToDock < 3.6) {
        const approachFactor = Math.max(0.14, distToDock / 3.6);
        const targetSlowSpeed = cruiseSpeed * approachFactor;
        s.currentSpeed = THREE.MathUtils.lerp(
          s.currentSpeed,
          targetSlowSpeed,
          Math.min(1, dt * 4)
        );
        if (distToDock < 0.22) {
          s.isDocked = true;
          s.hasDockedThisLap = true;
          s.dockTimer = 0;
          s.currentSpeed = 0;
        }
      } else {
        // Smoothly accelerate back to realistic cruising speed
        s.currentSpeed = THREE.MathUtils.lerp(
          s.currentSpeed,
          cruiseSpeed,
          Math.min(1, dt * 2.2)
        );
      }

      s.segmentProgress += (s.currentSpeed * dt) / segLength;
      if (s.segmentProgress >= 1) {
        s.segmentProgress -= 1;
        s.segmentIndex = (s.segmentIndex + 1) % waypoints.length;
        if (s.segmentIndex === 0) {
          s.hasDockedThisLap = false;
        }
      }
    }

    const nextA = waypoints[s.segmentIndex];
    const nextB = waypoints[(s.segmentIndex + 1) % waypoints.length];
    const pos = new THREE.Vector3().lerpVectors(nextA, nextB, s.segmentProgress);
    const elapsed = state.clock.elapsedTime;

    // Subtle realistic wave buoyancy heave & roll
    const waveHeave = Math.sin(elapsed * 1.6 + shipIndex) * 0.035;
    ship.position.set(pos.x, pos.y + waveHeave, pos.z);
    ship.lookAt(nextB.x, pos.y + waveHeave, nextB.z);
    ship.rotation.z = Math.sin(elapsed * 1.4 + shipIndex) * 0.03;

    if (radarRef.current) {
      radarRef.current.rotation.y += dt * 3.2;
    }
    if (wakeRef.current) {
      const speedRatio = s.currentSpeed / Math.max(0.01, cruiseSpeed);
      wakeRef.current.scale.setScalar(Math.max(0.15, speedRatio));
      wakeRef.current.visible = speedRatio > 0.08;
    }
  });

  return (
    <group ref={shipGroupRef} position={portDockPosition}>
      {/* Lower Crimson Anti-Fouling Waterline Hull */}
      <mesh position={[0, 0.04, 0]} castShadow>
        <boxGeometry args={[0.72, 0.14, 1.85]} />
        <meshStandardMaterial color="#dc2626" roughness={0.45} />
      </mesh>
      {/* Upper Contoured Naval Hull */}
      <mesh position={[0, 0.18, 0]} castShadow>
        <boxGeometry args={[0.76, 0.22, 1.82]} />
        <meshStandardMaterial color="#0f172a" roughness={0.28} metalness={0.65} />
      </mesh>
      {/* Bow Cone */}
      <mesh
        position={[0, 0.18, 1.22]}
        rotation={[Math.PI / 2, Math.PI / 4, 0]}
        castShadow
      >
        <coneGeometry args={[0.54, 0.65, 4]} />
        <meshStandardMaterial color="#0f172a" roughness={0.28} metalness={0.65} />
      </mesh>
      {/* Multi-Deck Bridge Superstructure */}
      <mesh position={[0, 0.42, -0.15]} castShadow>
        <boxGeometry args={[0.58, 0.26, 0.78]} />
        <meshStandardMaterial color="#f8fafc" roughness={0.25} />
      </mesh>
      <mesh position={[0, 0.62, -0.1]} castShadow>
        <boxGeometry args={[0.44, 0.18, 0.46]} />
        <meshStandardMaterial color="#1e293b" roughness={0.2} metalness={0.7} />
      </mesh>
      {/* Rotating Marine Radar Scanner */}
      <mesh ref={radarRef} position={[0, 0.82, -0.1]}>
        <boxGeometry args={[0.32, 0.03, 0.06]} />
        <meshStandardMaterial color="#fbbf24" metalness={0.9} roughness={0.15} />
      </mesh>
      {/* Water Wake Foam Trail */}
      <mesh
        ref={wakeRef}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.01, -1.25]}
      >
        <planeGeometry args={[0.68, 1.1]} />
        <meshBasicMaterial color="#e0f2fe" transparent opacity={0.42} />
      </mesh>
    </group>
  );
};

/**
 * FoxCityScene — A declarative 3D scene built with @react-three/fiber and @react-three/drei.
 * Includes raycasting onClick handlers for every major FOX CITY building, visual selection
 * highlights, and procedural harbor ships that periodically slow down and dock at the city port.
 */
export const FoxCityScene: React.FC<FoxCitySceneProps> = ({
  className = 'w-full h-full min-h-[420px] relative bg-[#070b14]',
  cameraPosition = [24, 20, 24],
  ambientIntensity = 0.65,
  showGrid = true,
  selectedBuildingId = null,
  buildingStates,
  onSelectBuilding,
  children,
}) => {
  const [internalSelectedId, setInternalSelectedId] = useState<FoxCityBuildingId | null>(null);
  const [hoveredBuildingId, setHoveredBuildingId] = useState<FoxCityBuildingId | null>(null);

  const activeSelectedId =
    selectedBuildingId !== undefined ? selectedBuildingId : internalSelectedId;

  const handleBuildingSelect = (buildingId: FoxCityBuildingId) => {
    const nextId = activeSelectedId === buildingId ? null : buildingId;
    setInternalSelectedId(nextId);
    if (onSelectBuilding) {
      const resolved = nextId && buildingStates ? buildingStates[nextId] : undefined;
      onSelectBuilding(nextId, resolved);
    }
  };

  const handleMissedClick = () => {
    setInternalSelectedId(null);
    if (onSelectBuilding) {
      onSelectBuilding(null, undefined);
    }
  };

  return (
    <div className={className}>
      <Canvas
        shadows
        dpr={[1, 2]}
        gl={{ antialias: true, powerPreference: 'high-performance' }}
        onPointerMissed={handleMissedClick}
      >
        <color attach="background" args={['#070b14']} />
        <fog attach="fog" args={['#070b14', 28, 75]} />

        {/* Isometric-style Perspective Camera */}
        <PerspectiveCamera
          makeDefault
          position={cameraPosition}
          fov={38}
          near={0.1}
          far={200}
        />

        {/* Interactive Camera Controls */}
        <OrbitControls
          makeDefault
          enableDamping
          dampingFactor={0.08}
          minDistance={10}
          maxDistance={55}
          maxPolarAngle={Math.PI / 2.15}
          target={[0, 0, 0]}
        />

        {/* Ambient & Sunset Directional Lighting */}
        <ambientLight intensity={ambientIntensity} color="#ffedd5" />
        <hemisphereLight
          args={['#f59e0b', '#0f172a', 0.55]}
          position={[0, 30, 0]}
        />
        <directionalLight
          castShadow
          position={[18, 28, 14]}
          intensity={1.6}
          color="#fbbf24"
          shadow-mapSize={[1024, 1024]}
        />

        <Suspense fallback={null}>
          {/* City Ground Plane & Harbor Port */}
          <group name="fox-city-ground">
            <mesh
              rotation={[-Math.PI / 2, 0, 0]}
              position={[0, 0, 0]}
              receiveShadow
              onClick={(e) => {
                e.stopPropagation();
                handleMissedClick();
              }}
            >
              <planeGeometry args={[40, 40, 32, 32]} />
              <meshStandardMaterial
                color="#141c2b"
                roughness={0.85}
                metalness={0.15}
              />
            </mesh>

            {/* City Harbor Port Pier & Docking Berth */}
            <group name="fox-city-port-pier" position={[-1.2, 0.08, 9.2]}>
              <mesh receiveShadow castShadow>
                <boxGeometry args={[4.2, 0.18, 2.2]} />
                <meshStandardMaterial color="#78350f" roughness={0.75} />
              </mesh>
              {/* Port Mooring Bollards */}
              <mesh position={[-1.5, 0.18, 0.9]}>
                <cylinderGeometry args={[0.08, 0.1, 0.22, 8]} />
                <meshStandardMaterial color="#fbbf24" metalness={0.85} roughness={0.2} />
              </mesh>
              <mesh position={[1.5, 0.18, 0.9]}>
                <cylinderGeometry args={[0.08, 0.1, 0.22, 8]} />
                <meshStandardMaterial color="#fbbf24" metalness={0.85} roughness={0.2} />
              </mesh>
            </group>

            {/* Harbor Ships that Periodically Slow Down & Dock at the City Port */}
            <DockingHarborShip
              shipIndex={0}
              portDockPosition={[-1.2, 0.02, 10.8]}
              cruiseSpeed={0.68}
              dockDuration={4.5}
            />
            <DockingHarborShip
              shipIndex={1}
              portDockPosition={[-1.2, 0.02, 10.8]}
              cruiseSpeed={0.54}
              dockDuration={5.2}
            />

            {/* Golden Perimeter Border Accent */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
              <ringGeometry args={[19.6, 20, 4]} />
              <meshStandardMaterial
                color="#f59e0b"
                emissive="#d97706"
                emissiveIntensity={0.4}
                roughness={0.3}
                metalness={0.8}
              />
            </mesh>

            {showGrid && (
              <Grid
                position={[0, 0.02, 0]}
                cellSize={2}
                cellThickness={0.6}
                cellColor="#1e293b"
                sectionSize={8}
                sectionThickness={1.2}
                sectionColor="#f59e0b"
                fadeDistance={48}
                fadeStrength={1}
              />
            )}
          </group>

          {/* Raycastable Major City Buildings */}
          <group name="fox-city-buildings">
            {FOX_CITY_BUILDINGS.map((b) => (
              <InteractiveBuildingMesh
                key={b.id}
                config={b}
                isSelected={activeSelectedId === b.id}
                isHovered={hoveredBuildingId === b.id}
                resolvedState={buildingStates?.[b.id]}
                onSelect={handleBuildingSelect}
                onHoverChange={setHoveredBuildingId}
              />
            ))}
          </group>

          {children}
        </Suspense>
      </Canvas>
    </div>
  );
};

export default FoxCityScene;
