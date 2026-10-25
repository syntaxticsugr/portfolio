import * as THREE from "three";

type Point = { x: number; z: number };
type Footprint =
  | { kind: "circle"; x: number; z: number; radius: number }
  | { kind: "box"; minX: number; maxX: number; minZ: number; maxZ: number };

function segmentDistance(point: Point, a: Point, b: Point) {
  const dx = b.x - a.x,
    dz = b.z - a.z;
  const length = dx * dx + dz * dz;
  const t = length
    ? THREE.MathUtils.clamp(
        ((point.x - a.x) * dx + (point.z - a.z) * dz) / length,
        0,
        1,
      )
    : 0;
  return Math.hypot(point.x - a.x - dx * t, point.z - a.z - dz * t);
}

/** Reserve furniture and walking space before placing any loose garden objects. */
export function createSceneryLayout(outline: Point[], routes: Point[][]) {
  const obstacles: Footprint[] = [];
  function addDisc(x: number, z: number, radius: number) {
    obstacles.push({ kind: "circle", x, z, radius });
  }
  function reserve(object: THREE.Object3D) {
    object.updateWorldMatrix(true, true);
    object.traverse((part) => {
      if (!(part instanceof THREE.Mesh) || !part.castShadow) return;
      const bounds = new THREE.Box3().setFromObject(part);
      if (bounds.isEmpty()) return;
      const up = new THREE.Vector3(0, 1, 0).transformDirection(
        part.matrixWorld,
      );
      const scale = part.getWorldScale(new THREE.Vector3());
      if (
        part.geometry instanceof THREE.CylinderGeometry &&
        Math.abs(up.y) > 0.999 &&
        Math.abs(scale.x - scale.z) < 0.001
      ) {
        const p = part.getWorldPosition(new THREE.Vector3());
        addDisc(
          p.x,
          p.z,
          Math.max(
            part.geometry.parameters.radiusTop,
            part.geometry.parameters.radiusBottom,
          ) * scale.x,
        );
      } else {
        obstacles.push({
          kind: "box",
          minX: bounds.min.x,
          maxX: bounds.max.x,
          minZ: bounds.min.z,
          maxZ: bounds.max.z,
        });
      }
    });
  }
  function clear(x: number, z: number, radius: number, avoidRoutes = true) {
    const p = { x, z };
    let inside = false;
    for (let i = 0, j = outline.length - 1; i < outline.length; j = i++) {
      const a = outline[i],
        b = outline[j];
      if (
        a.z > z !== b.z > z &&
        x < ((b.x - a.x) * (z - a.z)) / (b.z - a.z) + a.x
      )
        inside = !inside;
      if (segmentDistance(p, a, b) < radius + 0.08) return false;
    }
    if (!inside) return false;
    for (const obstacle of obstacles) {
      const distance =
        obstacle.kind === "circle"
          ? Math.hypot(x - obstacle.x, z - obstacle.z) - obstacle.radius
          : Math.hypot(
              x - THREE.MathUtils.clamp(x, obstacle.minX, obstacle.maxX),
              z - THREE.MathUtils.clamp(z, obstacle.minZ, obstacle.maxZ),
            );
      if (distance < radius + 0.06) return false;
    }
    if (avoidRoutes) {
      for (const route of routes) {
        for (let i = 1; i < route.length; i++) {
          if (segmentDistance(p, route[i - 1], route[i]) < radius + 0.44)
            return false;
        }
      }
    }
    return true;
  }
  function findSpot(x: number, z: number, radius: number) {
    if (clear(x, z, radius)) return { x, z };
    // A bounded, deterministic local adjustment keeps the intended garden composition.
    for (let ring = 1; ring <= 6; ring++) {
      for (let direction = 0; direction < 16; direction++) {
        const angle = (direction * Math.PI) / 8;
        const p = {
          x: x + Math.cos(angle) * ring * 0.12,
          z: z + Math.sin(angle) * ring * 0.12,
        };
        if (clear(p.x, p.z, radius)) return p;
      }
    }
    return null;
  }
  return { reserve, addDisc, clear, findSpot };
}
