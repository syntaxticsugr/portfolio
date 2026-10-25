import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";

export const BRIDGE_START = [0.65, 0.235, -4.72] as const;
export const BRIDGE_END = [1.3, 0.235, -8.35] as const;
export const BRIDGE_WIDTH = 1.12;
const SAG = 0.18;
const DECK_THICKNESS = 0.09;
const PLANK_GAP = 0.013;
export type BridgeOptions = {
  name?: string;
  start?: readonly [number, number, number];
  end?: readonly [number, number, number];
};
export const FOOD_COURT_BRIDGE_OPTIONS = {
  name: "food-court-suspension-bridge",
  start: [6.1, 0.235, -0.25],
  end: [10.65, 0.235, -0.25],
} as const satisfies BridgeOptions;

/** Shared deck profile for the timber geometry and characters crossing it. */
export function createBridgePath(options: BridgeOptions = {}) {
  const start = new THREE.Vector3(...(options.start ?? BRIDGE_START));
  const end = new THREE.Vector3(...(options.end ?? BRIDGE_END));
  const direction = end.clone().sub(start).normalize();
  const across = new THREE.Vector3(direction.z, 0, -direction.x);
  const length = start.distanceTo(end);
  const dx = end.x - start.x;
  const dz = end.z - start.z;
  const horizontalLength = Math.hypot(dx, dz);
  const plankCount = Math.max(25, Math.round(length / 0.154) + 1);
  const spacing = length / (plankCount - 1);
  const slope = (t: number) => -4 * SAG * (1 - 2 * t);

  function point(t: number, side = 0, height = 0) {
    // This is the top of the boards, not their center or underside.
    const p = start.clone().lerp(end, t).addScaledVector(across, side);
    p.y += -4 * SAG * t * (1 - t) + height;
    return p;
  }
  function tangent(t: number) {
    return new THREE.Vector3(dx, slope(t), dz).normalize();
  }
  function plankLength(t: number) {
    return (spacing * Math.hypot(dx, slope(t), dz)) / length - PLANK_GAP;
  }
  function floorHeight(x: number, z: number): number | undefined {
    const offsetX = x - start.x;
    const offsetZ = z - start.z;
    const along = (offsetX * dx + offsetZ * dz) / horizontalLength;
    const side = (offsetX * dz - offsetZ * dx) / horizontalLength;
    if (Math.abs(side) > BRIDGE_WIDTH / 2) return undefined;

    const t = THREE.MathUtils.clamp(along / horizontalLength, 0, 1);
    const plankT = Math.round(t * (plankCount - 1)) / (plankCount - 1);
    const plankSlope = slope(plankT);
    const halfProjection =
      (plankLength(plankT) * horizontalLength) /
      (2 * Math.hypot(horizontalLength, plankSlope));
    if (
      along >= -halfProjection &&
      along <= horizontalLength + halfProjection
    ) {
      // Follow each flat board's actual tangent plane. Across the 13 mm gaps,
      // continue the nearest board so a shoe spanning two planks stays supported.
      return (
        start.y +
        (end.y - start.y) * plankT -
        4 * SAG * plankT * (1 - plankT) +
        (plankSlope * (along - horizontalLength * plankT)) / horizontalLength
      );
    }
    if (
      Math.abs(side) <= 0.42 &&
      (Math.abs(along + 0.15) <= 0.085 ||
        Math.abs(along - horizontalLength - 0.15) <= 0.085)
    )
      return 0.13;
    return undefined;
  }

  return {
    start,
    end,
    direction,
    across,
    length,
    width: BRIDGE_WIDTH,
    plankCount,
    point,
    tangent,
    plankLength,
    floorHeight,
  };
}

/** A suspended timber footbridge with a continuous deck and tied rope rails. */
export function createBridge(
  parent: THREE.Object3D,
  options: BridgeOptions = {},
) {
  const object = new THREE.Group();
  object.name = options.name ?? "university-suspension-bridge";
  parent.add(object);
  const path = createBridgePath(options);
  const { direction, across, point } = path;
  const wood = new THREE.MeshStandardMaterial({
    color: "#b48b60",
    roughness: 0.85,
  });
  const boards = ["#c49f70", "#d2b082", "#bb9568"].map(
    (color) => new THREE.MeshStandardMaterial({ color, roughness: 0.86 }),
  );
  const rope = new THREE.MeshStandardMaterial({
    color: "#776950",
    roughness: 1,
  });
  const cap = new THREE.MeshStandardMaterial({
    color: "#dfc99c",
    roughness: 0.78,
  });
  const brass = new THREE.MeshStandardMaterial({
    color: "#968465",
    metalness: 0.25,
    roughness: 0.65,
  });

  function railPoint(t: number, side: number, height: number) {
    return point(t, side, height);
  }
  function mesh(
    name: string,
    geometry: THREE.BufferGeometry,
    material: THREE.Material,
    position: THREE.Vector3,
  ) {
    const part = new THREE.Mesh(geometry, material);
    part.name = name;
    part.position.copy(position);
    part.castShadow = part.receiveShadow = true;
    object.add(part);
    return part;
  }
  function rod(
    name: string,
    a: THREE.Vector3,
    b: THREE.Vector3,
    radius: number,
    material = rope,
  ) {
    const part = mesh(
      name,
      new THREE.CylinderGeometry(radius, radius, a.distanceTo(b), 12),
      material,
      a.clone().add(b).multiplyScalar(0.5),
    );
    part.quaternion.setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      b.clone().sub(a).normalize(),
    );
    return part;
  }

  // Boards follow the deck's tangent; adjacent ends meet without overlapping.
  const count = path.plankCount;
  for (let index = 0; index < count; index++) {
    const t = index / (count - 1);
    const tangent = path.tangent(t);
    const normal = tangent.clone().cross(across).normalize();
    const rotation = new THREE.Matrix4().makeBasis(across, normal, tangent);
    const board = mesh(
      `bridge-plank-${index}`,
      new RoundedBoxGeometry(
        BRIDGE_WIDTH,
        DECK_THICKNESS,
        path.plankLength(t),
        3,
        0.018,
      ),
      boards[index % boards.length],
      point(t).addScaledVector(normal, -DECK_THICKNESS / 2),
    );
    board.setRotationFromMatrix(rotation);
    if (index === 0 || index === count - 1) {
      const support = mesh(
        "bridge-landing-crossbeam",
        new RoundedBoxGeometry(1.22, 0.08, 0.14, 3, 0.016),
        wood,
        point(t).addScaledVector(normal, -0.13),
      );
      support.setRotationFromMatrix(rotation);
    }
    // Two small pegs secure each board to the ropes beneath it.
    for (const side of [-1, 1]) {
      const peg = mesh(
        "bridge-deck-peg",
        new THREE.CylinderGeometry(0.019, 0.019, 0.012, 8),
        brass,
        new THREE.Vector3(),
      );
      board.add(peg);
      peg.position.set(side * 0.42, 0.048, 0);
    }
  }
  for (const side of [-1, 1]) {
    for (const height of [-0.07, 0.51, 1.07]) {
      const curve = new THREE.CatmullRomCurve3(
        Array.from({ length: 49 }, (_, i) =>
          height < 0
            ? point(i / 48, side * 0.58, height)
            : railPoint(i / 48, side * 0.58, height),
        ),
      );
      mesh(
        height < 0 ? "bridge-under-deck-rope" : "bridge-handrail-rope",
        new THREE.TubeGeometry(curve, 64, height < 0 ? 0.036 : 0.027, 8, false),
        rope,
        new THREE.Vector3(),
      );
    }
    // The rope hangers reach the lower load-bearing ropes, outside the planks.
    for (let index = 1; index < count - 1; index += 2) {
      const t = index / (count - 1);
      rod(
        "bridge-rope-hanger",
        point(t, side * 0.58, -0.07),
        railPoint(t, side * 0.58, 1.07),
        0.018,
      );
    }
    for (const t of [0, 1]) {
      const foot = point(t, side * 0.58);
      foot.y = 0.012;
      const postTop = point(t, side * 0.58, 1.147);
      rod("bridge-landing-post", foot, postTop, 0.065, wood);
      const postCap = mesh(
        "bridge-post-cap",
        new THREE.SphereGeometry(0.083, 16, 12),
        cap,
        postTop,
      );
      postCap.scale.y = 0.55;
      for (const height of [0.51, 1.07]) {
        for (const offset of [-0.025, 0, 0.025]) {
          const knot = mesh(
            "bridge-rope-binding",
            new THREE.TorusGeometry(0.068, 0.013, 6, 16),
            rope,
            point(t, side * 0.58, height + offset),
          );
          knot.rotation.x = Math.PI / 2;
        }
      }
      const base = mesh(
        "bridge-post-footing",
        new THREE.CylinderGeometry(0.105, 0.14, 0.06, 24),
        cap,
        foot.clone().add(new THREE.Vector3(0, 0.013, 0)),
      );
      base.name = "bridge-post-footing";
    }
  }

  for (const t of [0, 1]) {
    const position = point(t).addScaledVector(
      direction,
      t === 0 ? -0.15 : 0.15,
    );
    position.y = 0.076;
    const step = mesh(
      "bridge-entry-step",
      new RoundedBoxGeometry(0.84, 0.108, 0.17, 3, 0.016),
      boards[1],
      position,
    );
    step.rotation.y = Math.atan2(direction.x, direction.z);
  }

  // Lighting is driven by the world's existing day/night transition.
  const bulbPositions: [number, number, number][] = [];
  for (const t of [0, 1])
    for (const side of [-1, 1]) {
      const p = point(t, side * 0.58, 1.18);
      p.addScaledVector(direction, t === 0 ? 0.1 : -0.1);
      bulbPositions.push(p.toArray());
    }
  return { object, bulbPositions, point, width: BRIDGE_WIDTH };
}
