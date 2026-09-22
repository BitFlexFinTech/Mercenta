/**
 * §Phase WAVE-4 — MERCENTA BRAIN: THE ONE PROJECTION.
 *
 * WHY THIS MODULE EXISTS (measured, not speculative):
 *   The 3D Brain renders in WebGL, but every entity must ALSO be a real DOM
 *   element — otherwise keyboard/screen-reader access is lost and the records
 *   become unreachable. Positioning those elements from inside the render loop
 *   only was a REAL defect: a browser measurement showed `visibleNodes: 0` at
 *   the instant the surface became interactive, because no animation frame had
 *   run yet. The first interaction therefore had no targets at all.
 *
 *   The fix is ONE projection implementation that is a pure function of
 *   (camera, viewport, model), so it can run BOTH before the first paint (in a
 *   layout effect) and on every frame afterwards — instead of two projections
 *   that could disagree.
 *
 * It is deliberately three.js-FREE. three.js remains the renderer and the
 * authority on where the camera IS (the frame loop passes the live camera
 * position in); this module only converts a world point into screen pixels, so
 * it can also run synchronously before WebGL has painted anything.
 *
 * The camera looks at the origin (the OrbitControls target), is Y-up, and uses
 * a vertical field of view — matching the three.js PerspectiveCamera configured
 * in `BrainScene.tsx` exactly.
 */
import type { Brain3DCluster, Brain3DNode } from './layout3d';

/** Vertical field of view, in degrees. Shared with the WebGL camera. */
export const BRAIN_CAMERA_FOV = 45;
/** Elevation of the camera above the equatorial plane (fraction of distance). */
const CAMERA_ELEVATION = 0.42;

export interface BrainCamera {
  position: [number, number, number];
  fov: number;
  /** Distance from the orbit target (the origin). */
  distance: number;
}

/**
 * Frame the whole model. `sin(halfFov)` is the conservative fit for a bounding
 * SPHERE, so no rotation can swing a record out of frame — which matters
 * because an off-frustum record projects outside the canvas box and would be an
 * unreachable target.
 */
export function brainCamera(extent: number): BrainCamera {
  const boundingRadius = Math.hypot(extent, extent * CAMERA_ELEVATION);
  const halfFov = (BRAIN_CAMERA_FOV * Math.PI) / 360;
  const distance = (boundingRadius / Math.sin(halfFov)) * 1.06;
  return {
    position: [0, distance * CAMERA_ELEVATION, distance * Math.sqrt(1 - CAMERA_ELEVATION ** 2)],
    fov: BRAIN_CAMERA_FOV,
    distance,
  };
}

export interface ScreenPoint {
  x: number;
  y: number;
  /** Radius of the entity's sphere in screen pixels. */
  radiusPx: number;
  /** False when behind the camera or outside the frame. */
  visible: boolean;
}

/** Project one world point into screen pixels. Pure. */
export function projectBrainPoint(
  point: [number, number, number],
  worldRadius: number,
  cameraPosition: [number, number, number],
  fovDeg: number,
  width: number,
  height: number
): ScreenPoint {
  const [cx, cy, cz] = cameraPosition;
  const length = Math.hypot(cx, cy, cz) || 1;
  /* forward = normalise(target − cameraPosition), target = origin. */
  const fx = -cx / length;
  const fy = -cy / length;
  const fz = -cz / length;
  /* right = normalise(cross(forward, worldUp)), worldUp = (0,1,0) → (-fz, 0, fx). */
  const rightLength = Math.hypot(-fz, fx) || 1;
  const rx = -fz / rightLength;
  const rz = fx / rightLength;
  /* up = cross(right, forward). */
  const ux = -rz * fy;
  const uy = rz * fx - rx * fz;
  const uz = rx * fy;

  const relX = point[0] - cx;
  const relY = point[1] - cy;
  const relZ = point[2] - cz;
  const depth = relX * fx + relY * fy + relZ * fz;
  if (depth <= 0.0001) return { x: 0, y: 0, radiusPx: 0, visible: false };

  const xCamera = relX * rx + relZ * rz;
  const yCamera = relX * ux + relY * uy + relZ * uz;
  const tanHalf = Math.tan((fovDeg * Math.PI) / 360);
  const aspect = width / Math.max(1, height);
  const ndcX = xCamera / (depth * tanHalf * aspect);
  const ndcY = yCamera / (depth * tanHalf);

  return {
    x: (ndcX * 0.5 + 0.5) * width,
    y: (-ndcY * 0.5 + 0.5) * height,
    radiusPx: (worldRadius / (depth * tanHalf)) * (height / 2),
    visible: Math.abs(ndcX) <= 1 && Math.abs(ndcY) <= 1,
  };
}

export type BrainElementRegistry = { current: Map<string, HTMLDivElement | null> | null };

export interface ProjectionInput {
  nodes: Brain3DNode[];
  clusters: Brain3DCluster[];
  cameraPosition: [number, number, number];
  fovDeg: number;
  width: number;
  height: number;
  nodeEls: BrainElementRegistry;
  clusterEls: BrainElementRegistry;
}

/**
 * Apply the projection to the DOM layer. The ONE place entity elements are
 * positioned — used by the pre-paint layout effect AND by the frame loop.
 *
 * An entity that is behind the camera or outside the frame is HIDDEN rather
 * than left clipped: this layer is clipped by the canvas box, so a target
 * positioned outside it would exist and be un-hittable.
 */
export function applyBrainProjection({
  nodes,
  clusters,
  cameraPosition,
  fovDeg,
  width,
  height,
  nodeEls,
  clusterEls,
}: ProjectionInput): void {
  const write = (el: HTMLDivElement | null | undefined, screen: ScreenPoint, extra?: () => void) => {
    if (!el) return;
    if (!screen.visible) {
      el.style.visibility = 'hidden';
      return;
    }
    el.style.visibility = 'visible';
    el.style.transform = `translate3d(${screen.x.toFixed(1)}px, ${screen.y.toFixed(1)}px, 0) translate(-50%, -50%)`;
    extra?.();
  };

  const nodeMap = nodeEls.current;
  if (nodeMap) {
    for (const node of nodes) {
      const el = nodeMap.get(node.id);
      const screen = projectBrainPoint([node.x, node.y, node.z], node.radius, cameraPosition, fovDeg, width, height);
      write(el, screen, () => {
        if (!el) return;
        /* The pointer target IS the visible sphere, so it can never overlap a
           neighbour more than the geometry itself does. */
        const diameter = Math.max(6, Math.min(96, screen.radiusPx * 2));
        el.style.width = `${diameter.toFixed(1)}px`;
        el.style.height = `${diameter.toFixed(1)}px`;
        /* Nearest record wins the pointer — DOM order must not decide it. */
        const distance = Math.hypot(
          node.x - cameraPosition[0],
          node.y - cameraPosition[1],
          node.z - cameraPosition[2]
        );
        el.style.zIndex = String(Math.max(1, Math.round(4000 - distance * 100)));
      });
    }
  }

  const clusterMap = clusterEls.current;
  if (clusterMap) {
    for (const cluster of clusters) {
      const el = clusterMap.get(cluster.cluster);
      write(
        el,
        projectBrainPoint([cluster.x, cluster.y, cluster.z], 0, cameraPosition, fovDeg, width, height),
        () => {
          if (el) el.style.zIndex = '6000';
        }
      );
    }
  }
}