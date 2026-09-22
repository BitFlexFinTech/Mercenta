/**
 * §Phase WAVE-4 — BRAIN SCENE ROOT (code-split).
 *
 * Kept in its own module and imported through `React.lazy` by BrainCanvas so
 * three.js / R3F / drei become their OWN chunk: they load only when a user
 * actually opens the Brain, and never inflate the admin shell bundle.
 *
 * Reuse: `<Canvas>` (react-three-fiber) provides the renderer + scene graph;
 * `<OrbitControls>` (drei) provides camera orbit, damping and auto-rotation.
 * Everything Mercenta-specific (the spatial wheel, the entity field, the
 * relationship flow, the DOM projection bridge) is built on top.
 */
import { useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { brainCamera } from '@/lib/intelligence/brain/project';
import {
  BrainCore,
  ClusterSectors,
  NodeField,
  ProjectionBridge,
  RelationshipField,
  SignalFlow,
  type ElementRegistry,
} from './BrainCanvas3D';
import type { Brain3DCluster, Brain3DNode } from '@/lib/intelligence/brain/layout3d';
import type { WebglPalette } from '@/lib/hooks/useWebglPalette';

export interface BrainSceneProps {
  nodes: Brain3DNode[];
  clusters: Brain3DCluster[];
  arcs: [number, number, number][][];
  positions: Map<string, [number, number, number]>;
  allEdges: { id: string; from: string; to: string }[];
  selectedEdges: { id: string; from: string; to: string }[];
  extent: number;
  colourOf: (node: Brain3DNode) => string;
  palette: WebglPalette;
  selectedId: string | null;
  neighbourIds: Set<string>;
  reducedMotion: boolean;
  nodeEls: ElementRegistry;
  clusterEls: ElementRegistry;
}

export default function BrainScene({
  nodes,
  clusters,
  arcs,
  positions,
  allEdges,
  selectedEdges,
  extent,
  colourOf,
  palette,
  selectedId,
  neighbourIds,
  reducedMotion,
  nodeEls,
  clusterEls,
}: BrainSceneProps) {
  /**
   * §Phase WAVE-4 — GUARANTEED FRAMING, FROM THE SHARED CAMERA DEFINITION.
   *
   * `brainCamera()` (src/lib/intelligence/brain/project.ts) is the ONE place the
   * camera is defined, and it is used by BOTH the WebGL scene here and the DOM
   * projection layer. The distance is derived from the model's bounding SPHERE
   * and the camera's vertical half-angle, so every record is inside the frustum
   * by construction. That is not cosmetic: an off-frustum record projects
   * outside the canvas box, and because the DOM entity layer is clipped by that
   * box the record would then be UNREACHABLE by pointer — a measured, reproduced
   * operability defect, not a theoretical one.
   *
   * The fit uses the UNSCALED extent, so the zoom control genuinely zooms:
   * zooming in is allowed to move outer records out of frame, and the DOM layer
   * then hides them rather than leaving phantom targets behind.
   */
  const camera = useMemo(() => brainCamera(extent), [extent]);
  const distance = camera.distance;

  return (
    <Canvas
      camera={{ position: camera.position, fov: camera.fov, near: 0.05, far: distance * 6 }}
      dpr={[1, 2]}
      gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      style={{ position: 'absolute', inset: 0 }}
    >
      <ambientLight intensity={1.1} />
      <pointLight position={[extent * 1.4, extent * 1.8, extent * 1.4]} intensity={1.5} />
      <directionalLight position={[-extent, extent, -extent]} intensity={0.6} />

      <ClusterSectors arcs={arcs} colour={palette.hairline} />
      <RelationshipField edges={allEdges} positions={positions} colour={palette.hairline} opacity={0.22} />
      {selectedEdges.length > 0 && (
        <RelationshipField edges={selectedEdges} positions={positions} colour={palette.accent} opacity={0.85} />
      )}

      <NodeField
        nodes={nodes}
        colourOf={colourOf}
        selectedId={selectedId}
        neighbourIds={neighbourIds}
        reducedMotion={reducedMotion}
      />

      <SignalFlow
        edges={selectedEdges.length > 0 ? selectedEdges : allEdges}
        positions={positions}
        colour={selectedEdges.length > 0 ? palette.accent : palette.info}
        reducedMotion={reducedMotion}
        speed={selectedEdges.length > 0 ? 0.34 : 0.2}
      />

      <BrainCore colour={palette.accent} reducedMotion={reducedMotion} />

      <OrbitControls
        makeDefault
        enableDamping
        dampingFactor={0.08}
        enablePan={false}
        minDistance={distance * 0.25}
        maxDistance={distance * 2.2}
        autoRotate={!reducedMotion}
        autoRotateSpeed={0.4}
        target={[0, 0, 0]}
      />

      <ProjectionBridge nodes={nodes} clusters={clusters} nodeEls={nodeEls} clusterEls={clusterEls} />
    </Canvas>
  );
}