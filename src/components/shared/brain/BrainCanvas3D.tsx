/**
 * §Phase WAVE-4 — MERCENTA BRAIN: GENUINE 3D SPATIAL CANVAS.
 *
 * This REPLACES the previous flat 2D SVG graph. It is not a restyled 2D graph:
 * the scene is a real WebGL world with a perspective camera, orbit navigation,
 * a spatial wheel of five cluster sectors, depth-stratified records, animated
 * relationships and travelling signals.
 *
 * OPEN-SOURCE REUSE (deliberate, not hand-rolled):
 *   three@0.186.0 (MIT)              WebGL renderer / math / geometry
 *   @react-three/fiber@8.18.0 (MIT)  React renderer for three (declarative scene graph)
 *   @react-three/drei@9.122.0 (MIT)  OrbitControls (camera orbit / damping / auto-rotate)
 * The Mercenta-specific scene graph, entity field and relationship flow are our
 * own: investigation found no suitable open-source "3D tenant-scoped knowledge
 * graph" to adapt. Decision record: docs/UIUX_WAVE4_BRAIN_3D_2026-09-22.md.
 *
 * TRUTH + ACCESSIBILITY (the part that must not be lost in 3D):
 *   - Every entity is a REAL DOM element carrying the same testid and accessible
 *     name the 2D canvas exposed (`brain-node-<id>`), positioned by projecting
 *     its world coordinate to screen space each frame. Pointer, keyboard and
 *     screen-reader access therefore survive the move to WebGL, and no record
 *     is hidden inside an opaque canvas.
 *   - Colour is never the only signal: knowledge status also drives the node's
 *     shape treatment and is stated in words in the inspector.
 *   - `prefers-reduced-motion`: no auto-rotation, no breathing, no travelling
 *     signals — the scene renders still and stays fully explorable.
 */
import { useCallback, useLayoutEffect, useMemo, useRef, type RefObject } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { ARC_RADIUS, ARC_Y } from '@/lib/intelligence/brain/layout3d';
import { BRAIN_CAMERA_FOV, applyBrainProjection } from '@/lib/intelligence/brain/project';
import type { Brain3DCluster, Brain3DNode } from '@/lib/intelligence/brain/layout3d';
import type { WebglPalette } from '@/lib/hooks/useWebglPalette';
import type { BrainEntityKind } from '@/lib/intelligence/brain/types';
import type { PaletteDomain } from '@/config/themes';

export type ElementRegistry = RefObject<Map<string, HTMLDivElement | null>>;

export interface BrainCanvas3DProps {
  nodes: Brain3DNode[];
  clusters: Brain3DCluster[];
  sectors: { startDeg: number; endDeg: number }[];
  extent: number;
  /** kind → domain, so a node's colour is its canonical domain colour. */
  domainOf: (kind: BrainEntityKind) => PaletteDomain;
  selectedId: string | null;
  neighbourIds: Set<string>;
  edges: { id: string; from: string; to: string }[];
  palette: WebglPalette;
  reducedMotion: boolean;
  nodeEls: ElementRegistry;
  clusterEls: ElementRegistry;
}

const BASE_RADIUS = 1;

/* ── Entity field ───────────────────────────────────────────────────────────
   One InstancedMesh for the whole entity field (a single draw call) with
   per-instance colour. Scale encodes the canonical kind-importance table in
   `layout.ts`; a selected record and its direct relationships are enlarged,
   and the selected one pulses. */

export function NodeField({
  nodes,
  colourOf,
  selectedId,
  neighbourIds,
  reducedMotion,
}: {
  nodes: Brain3DNode[];
  colourOf: (node: Brain3DNode) => string;
  selectedId: string | null;
  neighbourIds: Set<string>;
  reducedMotion: boolean;
}) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const colour = useMemo(() => new THREE.Color(), []);
  const count = Math.max(nodes.length, 1);

  useLayoutEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    nodes.forEach((node, index) => {
      dummy.position.set(node.x, node.y, node.z);
      dummy.scale.setScalar(node.radius / BASE_RADIUS);
      dummy.updateMatrix();
      mesh.setMatrixAt(index, dummy.matrix);
      colour.set(colourOf(node));
      mesh.setColorAt(index, colour);
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [nodes, colourOf, dummy, colour]);

  /* Selection emphasis. Under reduced motion the enlargement remains — a
     STATIC cue — while the pulse does not run: motion is never the only
     feedback channel (better-ui: "every animated state change also needs a
     static cue"). */
  useFrame((state) => {
    const mesh = meshRef.current;
    if (!mesh || !selectedId) return;
    const time = state.clock.elapsedTime;
    nodes.forEach((node, index) => {
      const isSelected = node.id === selectedId;
      const isNeighbour = neighbourIds.has(node.id);
      if (!isSelected && !isNeighbour) return;
      const base = node.radius / BASE_RADIUS;
      const emphasis = isSelected ? 1.85 : 1.3;
      const breath =
        isSelected && !reducedMotion ? 1 + 0.08 * Math.sin(time * 2.1 + node.phase * 6.283) : 1;
      dummy.position.set(node.x, node.y, node.z);
      dummy.scale.setScalar(base * emphasis * breath);
      dummy.updateMatrix();
      mesh.setMatrixAt(index, dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]} frustumCulled={false}>
      <sphereGeometry args={[BASE_RADIUS, 14, 10]} />
      <meshBasicMaterial toneMapped={false} />
    </instancedMesh>
  );
}

/* ── Relationship field ─────────────────────────────────────────────────────
   Every edge is batched into ONE LineSegments geometry (cheap at any density),
   and the edges touching the selection are drawn again on top at full
   strength. */

export function RelationshipField({
  edges,
  positions,
  colour,
  opacity,
}: {
  edges: { from: string; to: string }[];
  positions: Map<string, [number, number, number]>;
  colour: string;
  opacity: number;
}) {
  const geometry = useMemo(() => {
    const points: number[] = [];
    for (const edge of edges) {
      const a = positions.get(edge.from);
      const b = positions.get(edge.to);
      if (!a || !b) continue;
      points.push(a[0], a[1], a[2], b[0], b[1], b[2]);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
    return g;
  }, [edges, positions]);
  return (
    <lineSegments geometry={geometry} frustumCulled={false}>
      <lineBasicMaterial color={colour} transparent opacity={opacity} toneMapped={false} />
    </lineSegments>
  );
}

/* ── Travelling signals ─────────────────────────────────────────────────────
   ANIMATED RELATIONSHIPS: signals travel continuously along a deterministic
   subset of the network, and at full strength along the selected record's own
   relationships. Each signal's position is a pure function of elapsed time and
   its index — no randomness, so the flow is reproducible and the scene stays
   deterministic. */

export function SignalFlow({
  edges,
  positions,
  colour,
  reducedMotion,
  speed = 0.22,
}: {
  edges: { id: string; from: string; to: string }[];
  positions: Map<string, [number, number, number]>;
  colour: string;
  reducedMotion: boolean;
  speed?: number;
}) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const usable = useMemo(
    () => edges.filter((e) => positions.has(e.from) && positions.has(e.to)).slice(0, 48),
    [edges, positions]
  );
  const count = Math.max(usable.length, 1);

  useFrame((state) => {
    const mesh = meshRef.current;
    if (!mesh) return;
    if (reducedMotion || usable.length === 0) {
      dummy.position.set(0, 0, 0);
      dummy.scale.setScalar(0);
      dummy.updateMatrix();
      for (let i = 0; i < count; i++) mesh.setMatrixAt(i, dummy.matrix);
      mesh.instanceMatrix.needsUpdate = true;
      return;
    }
    const time = state.clock.elapsedTime;
    usable.forEach((edge, index) => {
      const a = positions.get(edge.from)!;
      const b = positions.get(edge.to)!;
      /* Deterministic stagger so the signals never move in lockstep. */
      const t = ((time * speed + index / usable.length) % 1 + 1) % 1;
      dummy.position.set(
        a[0] + (b[0] - a[0]) * t,
        a[1] + (b[1] - a[1]) * t + Math.sin(Math.PI * t) * 0.07,
        a[2] + (b[2] - a[2]) * t
      );
      dummy.scale.setScalar(1);
      dummy.updateMatrix();
      mesh.setMatrixAt(index, dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]} frustumCulled={false}>
      <sphereGeometry args={[0.018, 8, 6]} />
      <meshBasicMaterial color={colour} transparent opacity={0.85} toneMapped={false} />
    </instancedMesh>
  );
}

/* ── Cluster sectors ────────────────────────────────────────────────────────
   The five sectors are drawn IN SPACE (an arc plus two spokes each), so the
   information architecture is visible in the scene itself and not only in the
   DOM label layer. */

export function ClusterSectors({
  arcs,
  colour,
}: {
  arcs: [number, number, number][][];
  colour: string;
}) {
  const geometry = useMemo(() => {
    const points: number[] = [];
    for (const line of arcs) {
      for (let i = 0; i < line.length - 1; i++) {
        points.push(line[i][0], line[i][1], line[i][2], line[i + 1][0], line[i + 1][1], line[i + 1][2]);
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
    return g;
  }, [arcs]);
  return (
    <lineSegments geometry={geometry} frustumCulled={false}>
      <lineBasicMaterial color={colour} transparent opacity={0.3} toneMapped={false} />
    </lineSegments>
  );
}

/* ── Core ───────────────────────────────────────────────────────────────────
   The Mercenta core every cluster resolves through. A rotating octahedron is
   the one decorative element in the scene: it marks the centre of the model,
   it carries no data claim, and it is held still under reduced motion. */

export function BrainCore({ colour, reducedMotion }: { colour: string; reducedMotion: boolean }) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame((_state, delta) => {
    if (!ref.current || reducedMotion) return;
    ref.current.rotation.y += delta * 0.35;
    ref.current.rotation.x += delta * 0.12;
  });
  return (
    <mesh ref={ref}>
      <octahedronGeometry args={[0.19, 0]} />
      <meshBasicMaterial color={colour} wireframe toneMapped={false} />
    </mesh>
  );
}
/* ── Projection bridge ──────────────────────────────────────────────────────
   The ONE piece of the 3D scene that writes to the DOM. It hands the LIVE
   camera position to `applyBrainProjection` (src/lib/intelligence/brain/
   project.ts) every frame, so the accessible/keyboard layer and the WebGL layer
   can never disagree about where a record is — and because that projection is a
   pure function, the same code positions the layer BEFORE the first paint. */

export function ProjectionBridge({
  nodes,
  clusters,
  nodeEls,
  clusterEls,
}: {
  nodes: Brain3DNode[];
  clusters: Brain3DCluster[];
  nodeEls: ElementRegistry;
  clusterEls: ElementRegistry;
}) {
  const camera = useThree((state) => state.camera);
  const size = useThree((state) => state.size);

  const project = useCallback(() => {
    const position = camera.position;
    applyBrainProjection({
      nodes,
      clusters,
      cameraPosition: [position.x, position.y, position.z],
      fovDeg: (camera as THREE.PerspectiveCamera).fov ?? BRAIN_CAMERA_FOV,
      width: size.width,
      height: size.height,
      nodeEls,
      clusterEls,
    });
  }, [camera, size, nodes, clusters, nodeEls, clusterEls]);

  useFrame(project);

  return null;
}