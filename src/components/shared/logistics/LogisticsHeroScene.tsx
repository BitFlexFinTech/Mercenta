/**
 * §WAVE 3 — LOGISTICS HERO: THE CINEMATIC SCENE (fixed camera, non-interactive).
 *
 * ONE composition, three authentic layers:
 *
 *   sea plane      the stage the UK tile sits on
 *   UK tile        extruded landmass from the REAL UK coastline, the REAL UK
 *                  strategic road network (OSM/ODbL) and the canonical
 *                  fulfilment-centre DESTINATIONS (§P5 — there is no Mercenta-hub
 *                  node: the arrival nodes are the destination FCs themselves)
 *   world backdrop the REAL world landmass silhouette behind and above the tile,
 *                  carrying the declared international gateways
 *
 * Reuse (deliberate, not hand-rolled): `three@0.186.0` (MIT) renderer/math,
 * `@react-three/fiber@8.18.0` (MIT) declarative scene graph,
 * `BufferGeometryUtils.mergeGeometries` (three, MIT) for the one-draw-call
 * vehicle geometry. The Mercenta-specific composition, geometry assembly and
 * deterministic traffic are ours.
 *
 * CONTRACT — this scene must never capture the pointer. The Canvas style sets
 * `pointerEvents: 'none'`, there are no controls and no event handlers, so the
 * page scrolls normally through the Hero (see the fixed-camera contract in
 * `docs/UIUX_REDESIGN_WAVE3_LOGISTICS_HERO_2026-09-22.md`).
 *
 * PERFORMANCE: bounded entity counts (HERO_SCENE.budget), one InstancedMesh per
 * traffic type, one merged BufferGeometry for the whole road network and one for
 * every land outline. Nothing is allocated inside `useFrame`.
 */
import { useLayoutEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { HERO_SCENE, GLOBAL_LOGISTICS_GATEWAYS, UK_LOGISTICS_GATEWAYS, heroFcDestinations } from '@/config/logisticsHero';
import {
  HERO_STATIC_TIME_MS,
  laneProgress,
  laneSample,
  ukLandRings,
  ukStrategicRoadLines,
  ukToScene,
  worldLandRings,
  worldToScene,
  type HeroLane,
  type HeroNetwork,
  type Vec3,
} from '@/lib/logistics/heroNetwork';
import type { WebglPalette } from '@/lib/hooks/useWebglPalette';

/* ── Shared geometry builders (pure, memoised by the callers) ─────────────── */

/** Land outline segments for a set of rings — ONE draw call for the whole layer. */
function ringSegments(rings: Vec3[][]): THREE.BufferGeometry {
  const positions: number[] = [];
  for (const ring of rings) {
    for (let i = 0; i < ring.length - 1; i++) {
      const a = ring[i];
      const b = ring[i + 1];
      positions.push(a[0], a[1], a[2], b[0], b[1], b[2]);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  return geometry;
}

/** Extruded landmass from real coastline rings (top-N rings only, by size). */
function landMeshes(rings: Vec3[][], depth: number, maxRings: number) {
  const shapes: THREE.Shape[] = [];
  for (const ring of rings.slice(0, maxRings)) {
    const shape = new THREE.Shape();
    ring.forEach((point, index) => {
      // Scene (x, z) → shape (x, y); the mesh is rotated -90° about X so the
      // extrusion becomes vertical, exactly like a physical relief map.
      if (index === 0) shape.moveTo(point[0], -point[2]);
      else shape.lineTo(point[0], -point[2]);
    });
    shape.closePath();
    shapes.push(shape);
  }
  return shapes;
}

/** A road network as ONE lineSegments geometry (thousands of ways, one call). */
function roadSegments(lines: Vec3[][]): THREE.BufferGeometry {
  const positions: number[] = [];
  for (const line of lines) {
    for (let i = 0; i < line.length - 1; i++) {
      const a = line[i];
      const b = line[i + 1];
      positions.push(a[0], a[1], a[2], b[0], b[1], b[2]);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  return geometry;
}

/** Lane paths as one geometry, with per-vertex colour so truth is visible. */
function laneSegments(lanes: HeroLane[], colours: Record<string, string>): THREE.BufferGeometry {
  const positions: number[] = [];
  const colorAttr: number[] = [];
  const colour = new THREE.Color();
  for (const lane of lanes) {
    const tone = colours[lane.tone] ?? '#888888';
    colour.set(tone);
    for (let i = 0; i < lane.path.points.length - 1; i++) {
      const a = lane.path.points[i];
      const b = lane.path.points[i + 1];
      positions.push(a[0], a[1], a[2], b[0], b[1], b[2]);
      colorAttr.push(colour.r, colour.g, colour.b, colour.r, colour.g, colour.b);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colorAttr, 3));
  return geometry;
}

/* ── Layer: sea plane + world backdrop ───────────────────────────────────── */

function SeaPlane({ colour, height }: { colour: string; height: number }) {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, height, -20]} frustumCulled={false}>
      <planeGeometry args={[620, 460]} />
      <meshBasicMaterial color={colour} toneMapped={false} />
    </mesh>
  );
}

function WorldBackdrop({ landColour, nodeColour, label }: { landColour: string; nodeColour: string; label: string }) {
  const backdrop = HERO_SCENE.backdrop;
  const outline = useMemo(() => ringSegments(worldLandRings()), []);
  const nodes = useMemo(() => GLOBAL_LOGISTICS_GATEWAYS.map((g) => worldToScene(g.lat, g.lon)), []);
  const ref = useRef<THREE.InstancedMesh>(null);

  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const dummy = new THREE.Object3D();
    nodes.forEach((point, index) => {
      dummy.position.set(point[0], point[1] + 0.35, point[2]);
      dummy.scale.setScalar(index % 3 === 0 ? 1.9 : 1.3);
      dummy.updateMatrix();
      mesh.setMatrixAt(index, dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
  }, [nodes]);

  return (
    <group position={backdrop.position} rotation={[backdrop.rotationX, 0, 0]} name={label}>
      <lineSegments geometry={outline} frustumCulled={false}>
        <lineBasicMaterial color={landColour} transparent opacity={0.55} toneMapped={false} />
      </lineSegments>
      <instancedMesh ref={ref} args={[undefined, undefined, nodes.length]} frustumCulled={false}>
        <sphereGeometry args={[0.9, 8, 6]} />
        <meshBasicMaterial color={nodeColour} transparent opacity={0.9} toneMapped={false} />
      </instancedMesh>
    </group>
  );
}

/* ── Layer: the UK tile (authentic coastline, roads, canonical destinations) ─ */

function UkTile({
  landColour,
  landTopColour,
  roadColour,
  fcColour,
}: {
  landColour: string;
  landTopColour: string;
  roadColour: string;
  fcColour: string;
}) {
  const tile = HERO_SCENE.ukTile;
  const rings = useMemo(() => ukLandRings(), []);
  const outline = useMemo(() => ringSegments(rings), [rings]);
  const roads = useMemo(() => roadSegments(ukStrategicRoadLines()), []);
  const shapes = useMemo(() => landMeshes(rings, tile.landDepth, 5), [rings, tile.landDepth]);
  const fcs = useMemo(() => heroFcDestinations().map((fc) => ukToScene(fc.place.lat, fc.place.lon, 0)), []);

  return (
    <group name="uk-tile">
      {shapes.map((shape, index) => (
        <mesh key={`land-${index}`} rotation={[-Math.PI / 2, 0, 0]} position={[0, tile.lift, 0]} frustumCulled={false}>
          <extrudeGeometry args={[shape, { depth: tile.landDepth, bevelEnabled: false }]} />
          <meshLambertMaterial color={index === 0 ? landTopColour : landColour} />
        </mesh>
      ))}

      {/* Authentic coastline outline, drawn slightly above the land surface. */}
      <lineSegments geometry={outline} position={[0, 0.12, 0]} frustumCulled={false}>
        <lineBasicMaterial color={landTopColour} transparent opacity={0.95} toneMapped={false} />
      </lineSegments>

      {/* The real UK strategic road network (OSM, ODbL), one draw call. */}
      <lineSegments geometry={roads} position={[0, tile.landDepth + 0.08, 0]} frustumCulled={false}>
        <lineBasicMaterial color={roadColour} transparent opacity={0.72} toneMapped={false} />
      </lineSegments>

      {/* Canonical fulfilment-centre destinations, as low pillars + caps.
          §P5 — these ARE the arrival nodes: the hub marker is gone. */}
      <DestinationMarkers points={fcs} colour={fcColour} height={4.5} cap={0.55} />
    </group>
  );
}

function DestinationMarkers({
  points,
  colour,
  height,
  cap,
}: {
  points: Vec3[];
  colour: string;
  height: number;
  cap: number;
}) {
  return (
    <>
      {points.map((point, index) => (
        <group key={`node-${index}`} position={[point[0], point[1], point[2]]}>
          <mesh position={[0, height / 2, 0]}>
            <cylinderGeometry args={[0.09, 0.09, height, 6]} />
            <meshBasicMaterial color={colour} transparent opacity={0.45} toneMapped={false} />
          </mesh>
          <mesh position={[0, height, 0]}>
            <sphereGeometry args={[cap, 10, 8]} />
            <meshBasicMaterial color={colour} toneMapped={false} />
          </mesh>
        </group>
      ))}
    </>
  );
}

/* ── Layer: lanes ────────────────────────────────────────────────────────── */

function LaneLines({ network, colours }: { network: HeroNetwork; colours: Record<string, string> }) {
  const ambient = useMemo(
    () => laneSegments(network.lanes.filter((lane) => lane.tone === 'ambient'), colours),
    [network, colours]
  );
  const brand = useMemo(
    () => laneSegments(network.lanes.filter((lane) => lane.tone !== 'ambient'), colours),
    [network, colours]
  );
  const hasBrand = network.lanes.some((lane) => lane.tone !== 'ambient');
  return (
    <>
      <lineSegments geometry={ambient} frustumCulled={false}>
        <lineBasicMaterial vertexColors transparent opacity={0.3} toneMapped={false} />
      </lineSegments>
      {hasBrand && (
        <lineSegments geometry={brand} frustumCulled={false}>
          <lineBasicMaterial vertexColors transparent opacity={0.95} toneMapped={false} />
        </lineSegments>
      )}
    </>
  );
}
/* ── Vehicle geometry (merged primitives — one draw call per traffic type) ── */

function mergeAll(parts: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const merged = mergeGeometries(parts, false);
  parts.forEach((part) => part.dispose());
  return merged ?? new THREE.BufferGeometry();
}

/** Aircraft: fuselage + nose + swept wings + tail plane + fin + two engines. */
function aircraftGeometry(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  const fuselage = new THREE.CylinderGeometry(0.34, 0.34, 4.0, 12);
  fuselage.rotateX(Math.PI / 2);
  parts.push(fuselage);
  const nose = new THREE.ConeGeometry(0.34, 1.2, 12);
  nose.rotateX(Math.PI / 2);
  nose.translate(0, 0, 2.6);
  parts.push(nose);
  const wing = new THREE.BoxGeometry(7.6, 0.16, 1.0);
  wing.translate(0, -0.1, 0.2);
  parts.push(wing);
  const tail = new THREE.BoxGeometry(2.9, 0.14, 0.7);
  tail.translate(0, 0.1, -1.8);
  parts.push(tail);
  const fin = new THREE.BoxGeometry(0.16, 1.1, 0.9);
  fin.translate(0, 0.6, -1.8);
  parts.push(fin);
  for (const x of [-2.1, 2.1]) {
    const engine = new THREE.CylinderGeometry(0.22, 0.22, 0.9, 8);
    engine.rotateX(Math.PI / 2);
    engine.translate(x, -0.28, 0.4);
    parts.push(engine);
  }
  return mergeAll(parts);
}

/** Container ship: hull + bow + bridge + a stack of container blocks. */
function shipGeometry(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  const hull = new THREE.BoxGeometry(2.4, 1.0, 8.4);
  hull.translate(0, 0.1, 0);
  parts.push(hull);
  const bow = new THREE.ConeGeometry(1.2, 2.0, 4);
  bow.rotateX(Math.PI / 2);
  bow.rotateZ(Math.PI / 4);
  bow.translate(0, 0.1, 5.0);
  parts.push(bow);
  const bridge = new THREE.BoxGeometry(1.7, 1.1, 1.1);
  bridge.translate(0, 0.9, -2.9);
  parts.push(bridge);
  const containerSpec: [number, number][] = [
    [1.6, 0.85],
    [0.1, 0.85],
    [-1.2, 0.85],
    [0.5, 1.5],
    [-0.7, 1.5],
  ];
  for (const [z, y] of containerSpec) {
    const container = new THREE.BoxGeometry(2.0, 0.55, 1.1);
    container.translate(0, y, z);
    parts.push(container);
  }
  return mergeAll(parts);
}

/** Articulated lorry: tractor unit + trailer. */
function truckGeometry(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  const cab = new THREE.BoxGeometry(1.05, 1.0, 1.2);
  cab.translate(0, 0.1, 1.6);
  parts.push(cab);
  const trailer = new THREE.BoxGeometry(1.1, 1.3, 3.2);
  trailer.translate(0, 0.2, -0.9);
  parts.push(trailer);
  return mergeAll(parts);
}
/* ── Layer: deterministic traffic ────────────────────────────────────────── */

interface TrafficColours {
  air: string;
  sea: string;
  road: string;
  brand: string;
  exception: string;
  live: string;
  simulated: string;
  ambient: string;
}

/**
 * ONE animation driver for every moving entity.
 *
 * Nothing here writes React state: positions go straight into the instance
 * matrices each frame, which is what keeps 70+ moving objects cheap. Under
 * `prefers-reduced-motion` the matrices are written ONCE at the declared static
 * composition time and the frame loop does no work.
 */
function Traffic({ lanes, reducedMotion, colours }: { lanes: HeroLane[]; reducedMotion: boolean; colours: TrafficColours }) {
  const airRef = useRef<THREE.InstancedMesh>(null);
  const seaRef = useRef<THREE.InstancedMesh>(null);
  const roadRef = useRef<THREE.InstancedMesh>(null);
  const brandRef = useRef<THREE.InstancedMesh>(null);

  const airLanes = useMemo(() => lanes.filter((l) => l.motion === 'air' && l.relevance === 'ambient'), [lanes]);
  const seaLanes = useMemo(() => lanes.filter((l) => l.motion === 'sea'), [lanes]);
  const roadLanes = useMemo(() => lanes.filter((l) => l.motion === 'road'), [lanes]);
  const brandLanes = useMemo(() => lanes.filter((l) => l.relevance === 'brand'), [lanes]);

  const geometries = useMemo(() => ({ air: aircraftGeometry(), sea: shipGeometry(), road: truckGeometry() }), []);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  const write = useMemo(
    () =>
      (
        mesh: THREE.InstancedMesh | null,
        list: HeroLane[],
        timeMs: number,
        kind: 'air' | 'sea' | 'road'
      ) => {
        if (!mesh) return;
        /**
         * Per-type render scale. The geometry is authored at a legible size, and
         * these factors keep the traffic in proportion to the UK tile at the
         * declared fixed-camera framing (an aircraft is ~4.5 scene units long
         * against a ~160-unit-wide tile).
         */
        const scale = kind === 'air' ? 0.62 : kind === 'sea' ? 0.85 : 1.4;
        list.forEach((lane, index) => {
          const { position, heading } = laneSample(lane, timeMs);
          dummy.position.set(position[0], position[1], position[2]);
          const wobble = Math.sin(laneProgress(lane, timeMs) * Math.PI * 2);
          dummy.scale.setScalar(scale);
          if (kind === 'air') dummy.rotation.set(-0.06, heading, wobble * 0.16, 'YXZ');
          else if (kind === 'sea') dummy.rotation.set(0, heading, wobble * 0.05);
          else dummy.rotation.set(0, heading, 0);
          dummy.updateMatrix();
          mesh.setMatrixAt(index, dummy.matrix);
        });
        mesh.instanceMatrix.needsUpdate = true;
      },
    [dummy]
  );

  const writeBrand = useMemo(
    () =>
      (timeMs: number) => {
        const mesh = brandRef.current;
        if (!mesh) return;
        brandLanes.forEach((lane, index) => {
          const { position } = laneSample(lane, timeMs);
          dummy.position.set(position[0], position[1], position[2]);
          dummy.rotation.set(0, 0, 0);
          dummy.scale.setScalar(lane.truth === 'live_verified' ? 1.5 : lane.truth === 'simulated' ? 1.2 : 0.9);
          dummy.updateMatrix();
          mesh.setMatrixAt(index, dummy.matrix);
        });
        mesh.instanceMatrix.needsUpdate = true;
      },
    [brandLanes, dummy]
  );

  /* Reduced motion + first paint: the declared static composition. */
  useLayoutEffect(() => {
    dummy.scale.setScalar(1);
    write(airRef.current, airLanes, HERO_STATIC_TIME_MS, 'air');
    write(seaRef.current, seaLanes, HERO_STATIC_TIME_MS, 'sea');
    write(roadRef.current, roadLanes, HERO_STATIC_TIME_MS, 'road');
    writeBrand(HERO_STATIC_TIME_MS);
    const mesh = brandRef.current;
    if (mesh) {
      brandLanes.forEach((lane, index) => {
        const tone =
          lane.tone === 'exception'
            ? colours.exception
            : lane.truth === 'live_verified'
              ? colours.live
              : lane.truth === 'simulated'
                ? colours.simulated
                : colours.ambient;
        mesh.setColorAt(index, new THREE.Color(tone));
      });
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    }
  }, [airLanes, seaLanes, roadLanes, brandLanes, colours, write, writeBrand, dummy]);

  const elapsed = useRef(0);
  useFrame((_state, delta) => {
    if (reducedMotion) return;
    // Bounded simulation clock — the lane phase wraps, so this never overflows
    // into visibly stepped motion.
    elapsed.current = (elapsed.current + delta * 1000) % (HERO_SCENE.simulation.loopMs * 8);
    const time = elapsed.current;
    write(airRef.current, airLanes, time, 'air');
    write(seaRef.current, seaLanes, time, 'sea');
    write(roadRef.current, roadLanes, time, 'road');
    writeBrand(time);
  });

  return (
    <group name="traffic">
      <instancedMesh ref={airRef} args={[geometries.air, undefined, Math.max(1, airLanes.length)]} frustumCulled={false}>
        <meshLambertMaterial color={colours.air} emissive={colours.air} emissiveIntensity={0.25} />
      </instancedMesh>
      <instancedMesh ref={seaRef} args={[geometries.sea, undefined, Math.max(1, seaLanes.length)]} frustumCulled={false}>
        <meshLambertMaterial color={colours.sea} />
      </instancedMesh>
      <instancedMesh ref={roadRef} args={[geometries.road, undefined, Math.max(1, roadLanes.length)]} frustumCulled={false}>
        <meshLambertMaterial color={colours.road} />
      </instancedMesh>
      <instancedMesh ref={brandRef} args={[undefined, undefined, Math.max(1, brandLanes.length)]} frustumCulled={false}>
        <octahedronGeometry args={[1.5, 0]} />
        <meshBasicMaterial toneMapped={false} />
      </instancedMesh>
    </group>
  );
}
/* ── Scene root ──────────────────────────────────────────────────────────── */

export interface LogisticsHeroSceneProps {
  network: HeroNetwork;
  palette: WebglPalette;
  reducedMotion: boolean;
}

export default function LogisticsHeroScene({ network, palette, reducedMotion }: LogisticsHeroSceneProps) {
  const camera = HERO_SCENE.camera;
  const logi = palette.palette.logistics;
  const colours: TrafficColours = useMemo(
    () => ({
      air: '#DCE6F2',
      sea: '#9FB2C8',
      road: '#CBD8E6',
      brand: logi,
      exception: palette.critical,
      live: palette.success,
      simulated: palette.info,
      ambient: palette.textMuted,
    }),
    [logi, palette.critical, palette.success, palette.info, palette.textMuted]
  );
  const laneColours = useMemo(
    () => ({ brand: logi, exception: palette.critical, ambient: palette.textMuted }),
    [logi, palette.critical, palette.textMuted]
  );

  return (
    <Canvas
      camera={{ position: camera.position, fov: camera.fov, near: camera.near, far: camera.far }}
      dpr={[1, 1.75]}
      gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
      onCreated={({ camera: cam }) => {
        cam.lookAt(camera.target[0], camera.target[1], camera.target[2]);
        cam.updateProjectionMatrix();
      }}
    >
      <color attach="background" args={['#05070C']} />
      <fog attach="fog" args={['#05070C', 300, 700]} />
      <ambientLight intensity={1.15} />
      <directionalLight position={[80, 160, 120]} intensity={1.5} />
      <directionalLight position={[-120, 70, -80]} intensity={0.5} color={palette.info} />

      <SeaPlane colour="#070B14" height={HERO_SCENE.ukTile.lift - 0.4} />
      <WorldBackdrop landColour={palette.textMuted} nodeColour={palette.info} label="world-backdrop" />
      <UkTile
        landColour="#22384A"
        landTopColour="#3D6B8A"
        roadColour="#AED6F2"
        fcColour={palette.warning}
      />
      <LaneLines network={network} colours={laneColours} />
      <Traffic lanes={network.lanes} reducedMotion={reducedMotion} colours={colours} />
    </Canvas>
  );
}