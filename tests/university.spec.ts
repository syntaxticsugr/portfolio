import { expect, test } from "@playwright/test";
import * as THREE from "three";
import { OBB } from "three/examples/jsm/math/OBB.js";
import {
  createBridge,
  createBridgePath,
  FOOD_COURT_BRIDGE_OPTIONS,
} from "../src/world/bridge";
import {
  createUniversity,
  UNIVERSITY_FOOTPRINT,
} from "../src/world/university";
import { createFountain } from "../src/world/fountain";
import { createWorldFraming } from "../src/world/framing";
import { createFoodCourt } from "../src/world/foodCourt";
import { createFoodCourtFriends } from "../src/world/foodCourtFriends";

const scenes: THREE.Group[] = [];
function campusScene() {
  const scene = new THREE.Group();
  scenes.push(scene);
  const bridge = createBridge(scene);
  const university = createUniversity(scene);
  scene.updateMatrixWorld(true);
  return { scene, bridge, university };
}

test.afterEach(() => {
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  for (const scene of scenes.splice(0))
    scene.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      geometries.add(object.geometry);
      const entries = Array.isArray(object.material)
        ? object.material
        : [object.material];
      entries.forEach((material) => materials.add(material));
    });
  geometries.forEach((geometry) => geometry.dispose());
  materials.forEach((material) => material.dispose());
});

function outline(rx: number, rz: number, a: number, b: number) {
  return Array.from({ length: 96 }, (_, index) => {
    const angle = (index / 96) * Math.PI * 2;
    const radius = 1 + a * Math.sin(angle * 5) + b * Math.cos(angle * 7);
    return new THREE.Vector2(
      Math.cos(angle) * rx * radius,
      -Math.sin(angle) * rz * radius,
    );
  });
}
const mainOutline = outline(6.9, 5.35, 0.023, 0.013);
const campusOutline = outline(
  UNIVERSITY_FOOTPRINT.x,
  UNIVERSITY_FOOTPRINT.z,
  0.012,
  0.008,
);
const foodOutline = outline(3.58, 2.78, 0.009, 0.006);

function edgeClearance(point: THREE.Vector2, polygon: THREE.Vector2[]) {
  let inside = false;
  let nearest = Infinity;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i],
      b = polygon[j];
    if (
      a.y > point.y !== b.y > point.y &&
      point.x < ((b.x - a.x) * (point.y - a.y)) / (b.y - a.y) + a.x
    )
      inside = !inside;
    const line = b.clone().sub(a);
    const t = THREE.MathUtils.clamp(
      point.clone().sub(a).dot(line) / line.lengthSq(),
      0,
      1,
    );
    nearest = Math.min(
      nearest,
      point.distanceTo(a.clone().addScaledVector(line, t)),
    );
  }
  return inside ? nearest : -nearest;
}

function visitVertices(
  mesh: THREE.Mesh,
  visit: (point: THREE.Vector3) => void,
) {
  const point = new THREE.Vector3();
  const vertices = mesh.geometry.getAttribute("position");
  for (let i = 0; i < vertices.count; i++)
    visit(
      point.fromBufferAttribute(vertices, i).applyMatrix4(mesh.matrixWorld),
    );
}

function occupiedVolume(mesh: THREE.Mesh) {
  mesh.geometry.computeBoundingBox();
  const bounds = mesh.geometry.boundingBox!;
  const halfSize = bounds.getSize(new THREE.Vector3()).multiplyScalar(0.5);
  // Ignore sub-millimetre contact while detecting intersections through a
  // tread's middle that checking only its outer vertices would miss.
  halfSize.subScalar(0.0005);
  return new OBB(bounds.getCenter(new THREE.Vector3()), halfSize).applyMatrix4(
    mesh.matrixWorld,
  );
}

test("bridge footings and campus furniture remain on the flat island surfaces", () => {
  const { bridge, university } = campusScene();
  const footprints: { mesh: THREE.Mesh; campus: boolean }[] = [];
  bridge.object.traverse((object) => {
    if (object instanceof THREE.Mesh && object.name === "bridge-post-footing")
      footprints.push({ mesh: object, campus: object.position.z < -6.5 });
  });
  university.object.traverse((object) => {
    if (object instanceof THREE.Mesh && !object.name.includes("island-"))
      footprints.push({ mesh: object, campus: true });
  });
  let narrowest = Infinity;
  let nearestPart = "";
  for (const { mesh, campus } of footprints)
    visitVertices(mesh, (point) => {
      const distance = edgeClearance(
        new THREE.Vector2(
          point.x - (campus ? university.object.position.x : 0),
          point.z - (campus ? university.object.position.z : 0),
        ),
        campus ? campusOutline : mainOutline,
      );
      if (distance < narrowest) {
        narrowest = distance;
        nearestPart = mesh.name;
      }
    });
  expect(narrowest, nearestPart).toBeGreaterThan(0);
});

test("bridge boards face upward, join closely and stay visible over both landings", () => {
  const { bridge, university } = campusScene();
  const planks = bridge.object.children.filter((object) =>
    object.name.startsWith("bridge-plank-"),
  ) as THREE.Mesh[];
  expect(planks.length).toBeGreaterThan(10);
  let previousEnd: THREE.Vector3 | undefined;
  let largestGap = 0;
  let lowestLanding = Infinity;
  let lowestPlank = "";
  for (const plank of planks) {
    const up = new THREE.Vector3(0, 1, 0).transformDirection(plank.matrixWorld);
    expect(up.y, plank.name).toBeGreaterThan(0.7);
    plank.geometry.computeBoundingBox();
    const bounds = plank.geometry.boundingBox!;
    const from = new THREE.Vector3(0, 0, bounds.min.z).applyMatrix4(
      plank.matrixWorld,
    );
    const to = new THREE.Vector3(0, 0, bounds.max.z).applyMatrix4(
      plank.matrixWorld,
    );
    if (previousEnd)
      largestGap = Math.max(largestGap, from.distanceTo(previousEnd));
    previousEnd = to;
    // Sample the actual top of each plank, including each end and side.
    for (const x of [bounds.min.x * 0.9, 0, bounds.max.x * 0.9])
      for (const z of [bounds.min.z * 0.75, 0, bounds.max.z * 0.75]) {
        const point = new THREE.Vector3(x, bounds.max.y, z).applyMatrix4(
          plank.matrixWorld,
        );
        const onMain =
          edgeClearance(new THREE.Vector2(point.x, point.z), mainOutline) > 0;
        const onCampus =
          edgeClearance(
            new THREE.Vector2(
              point.x - university.object.position.x,
              point.z - university.object.position.z,
            ),
            campusOutline,
          ) > 0;
        if ((onMain || onCampus) && point.y < lowestLanding) {
          lowestLanding = point.y;
          lowestPlank = plank.name;
        }
      }
  }
  expect(largestGap).toBeLessThan(0.045);
  // Both islands' flat top surfaces are y=.02; the timber must stay exposed.
  expect(lowestLanding, lowestPlank).toBeGreaterThanOrEqual(0.018);
});

test("bridge stays clear of the fountain garden and campus paving stones", () => {
  const { scene, bridge, university } = campusScene();
  const fountain = createFountain(scene);
  scene.updateMatrixWorld(true);
  const fountainBounds: THREE.Box3[] = [];
  const pavingBounds: THREE.Box3[] = [];
  fountain.object.traverse((part) => {
    if (part instanceof THREE.Mesh)
      fountainBounds.push(new THREE.Box3().setFromObject(part));
  });
  university.object.traverse((part) => {
    if (part instanceof THREE.Mesh && part.name === "university-approach-stone")
      pavingBounds.push(new THREE.Box3().setFromObject(part));
  });
  let nearestFountain = Infinity;
  bridge.object.traverse((part) => {
    if (!(part instanceof THREE.Mesh)) return;
    const bounds = new THREE.Box3().setFromObject(part);
    for (const garden of fountainBounds)
      nearestFountain = Math.min(
        nearestFountain,
        Math.hypot(
          Math.max(0, bounds.min.x - garden.max.x, garden.min.x - bounds.max.x),
          Math.max(0, bounds.min.y - garden.max.y, garden.min.y - bounds.max.y),
          Math.max(0, bounds.min.z - garden.max.z, garden.min.z - bounds.max.z),
        ),
      );
    if (!part.name.startsWith("bridge-plank-")) return;
    for (const paving of pavingBounds) {
      const overlap = bounds
        .clone()
        .intersect(paving)
        .getSize(new THREE.Vector3());
      expect(overlap.x * overlap.y * overlap.z, part.name).toBeLessThan(
        0.00001,
      );
    }
  });
  expect(nearestFountain).toBeGreaterThan(0.2);
});

test("campus has a roomy forecourt with an unobstructed metre-wide approach", () => {
  const { bridge, university } = campusScene();
  const building = university.object.getObjectByName("university-building")!;
  const entrance = building.getObjectByName("university-entrance-lower-step")!;
  const entranceBounds = new THREE.Box3().setFromObject(entrance, true);
  const arrivalStep = bridge.object.children
    .filter((part) => part.name === "bridge-entry-step")
    .sort((a, b) => a.position.z - b.position.z)[0];
  // Measure the walk from standing on the arrival tread to reaching the
  // building's first step; the bridge used to arrive directly at the doorway.
  const arrival = arrivalStep.getWorldPosition(new THREE.Vector3());
  expect(arrival.z - entranceBounds.max.z).toBeGreaterThanOrEqual(1.5);

  const from = university.object.localToWorld(
    new THREE.Vector3(-0.12, 0.875, 2.055),
  );
  const to = university.object.localToWorld(new THREE.Vector3(0, 0.875, 0.705));
  const direction = to.clone().sub(from).normalize();
  const orientation = new THREE.Matrix4().makeRotationY(
    Math.atan2(direction.x, direction.z),
  );
  const corridor = new OBB(
    from.clone().add(to).multiplyScalar(0.5),
    new THREE.Vector3(0.5, 0.8, from.distanceTo(to) / 2),
    new THREE.Matrix3().setFromMatrix4(orientation),
  );

  type Solid = { mesh: THREE.Mesh; bounds: THREE.Box3; volume: OBB };
  const assemblies = new Map<string, Solid[]>();
  const add = (key: string, owner: THREE.Object3D) => {
    const parts = assemblies.get(key) ?? [];
    owner.traverse((part) => {
      if (!(part instanceof THREE.Mesh)) return;
      parts.push({
        mesh: part,
        bounds: new THREE.Box3().setFromObject(part, true),
        volume: occupiedVolume(part),
      });
    });
    assemblies.set(key, parts);
  };
  let pavingCount = 0;
  let streetlampCount = 0;
  for (const child of university.object.children) {
    if (child.name.includes("island-")) continue;
    let key = child.name;
    if (child.name === "university-approach-stone") key += pavingCount++;
    else if (child.name === "university-streetlamp") key += streetlampCount++;
    else if (child.name.startsWith("university-path-lamp-"))
      key = `bollard-${Math.sign(child.position.x)}`;
    else if (
      child.name === "university-grass-bed" ||
      child.name === "university-rounded-shrub"
    )
      key = `planting-${Math.sign(child.position.x)}`;
    add(key, child);
  }
  add("bridge", bridge.object);
  expect(pavingCount).toBeGreaterThanOrEqual(3);
  expect(streetlampCount).toBe(2);

  for (const [name, parts] of assemblies) {
    if (name.startsWith("university-approach-stone")) continue;
    for (const part of parts)
      expect(
        corridor.intersectsOBB(part.volume),
        `${name}/${part.mesh.name} blocks the clear approach`,
      ).toBe(false);
  }

  const entries = [...assemblies];
  for (let a = 0; a < entries.length; a++)
    for (let b = a + 1; b < entries.length; b++)
      for (const first of entries[a][1])
        for (const second of entries[b][1]) {
          if (!first.bounds.intersectsBox(second.bounds)) continue;
          expect(
            first.volume.intersectsOBB(second.volume),
            `${entries[a][0]}/${first.mesh.name} intersects ${entries[b][0]}/${second.mesh.name}`,
          ).toBe(false);
        }
});

for (const fixture of [
  { name: "university", options: undefined },
  { name: "food court", options: FOOD_COURT_BRIDGE_OPTIONS },
])
  test(`${fixture.name} walking surface follows the rendered planks and entry steps`, () => {
    const scene = new THREE.Group();
    scenes.push(scene);
    const bridge = createBridge(scene, fixture.options);
    const path = createBridgePath(fixture.options);
    scene.updateMatrixWorld(true);
    for (const part of bridge.object.children) {
      if (
        !(part instanceof THREE.Mesh) ||
        (!part.name.startsWith("bridge-plank-") &&
          part.name !== "bridge-entry-step")
      )
        continue;
      part.geometry.computeBoundingBox();
      const bounds = part.geometry.boundingBox!;
      for (const x of [-0.22, 0, 0.22])
        for (const z of [bounds.min.z * 0.6, 0, bounds.max.z * 0.6]) {
          const top = new THREE.Vector3(x, bounds.max.y, z).applyMatrix4(
            part.matrixWorld,
          );
          expect(
            path.floorHeight(top.x, top.z),
            `${part.name}: ${top.toArray()}`,
          ).toBeCloseTo(top.y, 5);
        }
    }
    for (let index = 0; index <= 200; index++) {
      const top = path.point(index / 200);
      const floor = path.floorHeight(top.x, top.z);
      expect(floor, "continuous support across plank gaps").toBeDefined();
      expect(Math.abs(floor! - top.y)).toBeLessThan(0.0004);
    }
    const beyondRail = path.point(0.5, path.width / 2 + 0.01);
    expect(path.floorHeight(beyondRail.x, beyondRail.z)).toBeUndefined();
    const inland = path.start.clone().addScaledVector(path.direction, -0.3);
    expect(path.floorHeight(inland.x, inland.z)).toBeUndefined();
  });

for (const fixture of [
  { name: "university", options: undefined },
  { name: "food court", options: FOOD_COURT_BRIDGE_OPTIONS },
])
  test(`${fixture.name} bridge hangs in one shallow curve from landing to landing`, () => {
    const scene = new THREE.Group();
    scenes.push(scene);
    const bridge = createBridge(scene, fixture.options);
    const samples = Array.from({ length: 49 }, (_, index) =>
      bridge.point(index / 48),
    );
    const first = samples[0].y;
    const last = samples.at(-1)!.y;
    const middle = samples[24].y;
    const sag = (first + last) / 2 - middle;
    expect(sag).toBeGreaterThan(0.1);
    expect(sag).toBeLessThan(0.25);
    // The drop begins at each landing, rather than after a level shoulder.
    expect(first - samples[1].y).toBeGreaterThan(0.003);
    expect(last - samples.at(-2)!.y).toBeGreaterThan(0.003);
    for (let index = 1; index < samples.length - 1; index++) {
      const before = samples[index - 1].y;
      const current = samples[index].y;
      const after = samples[index + 1].y;
      // A hanging span curves upward throughout; no downturned shoulders.
      expect(
        after - 2 * current + before,
        `curve sample ${index}`,
      ).toBeGreaterThan(0);
      if (index < 24) expect(current).toBeLessThan(before);
      else if (index > 24) expect(current).toBeGreaterThan(before);
    }

    const ropes = bridge.object.children.filter(
      (part) =>
        part.name === "bridge-under-deck-rope" ||
        part.name === "bridge-handrail-rope",
    ) as THREE.Mesh<THREE.TubeGeometry>[];
    expect(ropes).toHaveLength(6);
    for (const rope of ropes) {
      const curve = rope.geometry.parameters.path;
      const clearance = curve.getPoint(0).y - first;
      for (let index = 0; index < samples.length; index++) {
        const t = index / (samples.length - 1);
        expect(
          Math.abs(curve.getPoint(t).y - samples[index].y - clearance),
          `${rope.name} at ${t.toFixed(3)}`,
        ).toBeLessThan(0.003);
      }
    }

    const hangers = bridge.object.children.filter(
      (part) => part.name === "bridge-rope-hanger",
    ) as THREE.Mesh<THREE.CylinderGeometry>[];
    expect(hangers.length).toBeGreaterThan(8);
    const lengths = hangers.map((hanger) => hanger.geometry.parameters.height);
    expect(Math.max(...lengths) - Math.min(...lengths)).toBeLessThan(0.003);
  });

for (const fixture of [
  {
    name: "university",
    options: undefined,
    createIsland: createUniversity,
    outline: campusOutline,
  },
  {
    name: "food court",
    options: FOOD_COURT_BRIDGE_OPTIONS,
    createIsland: createFoodCourt,
    outline: foodOutline,
  },
])
  test(`${fixture.name} bridge entry steps stand clear of paving and island furniture`, () => {
    const scene = new THREE.Group();
    scenes.push(scene);
    const island = fixture.createIsland(scene);
    if (fixture.name === "food court") createFoodCourtFriends(island.object);
    const bridge = createBridge(scene, fixture.options);
    scene.updateMatrixWorld(true);
    const steps = bridge.object.children.filter(
      (part) => part.name === "bridge-entry-step",
    ) as THREE.Mesh[];
    expect(steps).toHaveLength(2);

    const obstacles: { name: string; bounds: THREE.Box3; volume: OBB }[] = [];
    island.object.traverse((part) => {
      if (!(part instanceof THREE.Mesh) || part.name.includes("island-"))
        return;
      obstacles.push({
        name: part.name,
        bounds: new THREE.Box3().setFromObject(part, true),
        volume: occupiedVolume(part),
      });
    });
    expect(obstacles.length).toBeGreaterThan(20);

    for (const step of steps) {
      let lowest = Infinity;
      let narrowestShore = Infinity;
      visitVertices(step, (point) => {
        lowest = Math.min(lowest, point.y);
        const local = island.object.worldToLocal(point.clone());
        const onMain = edgeClearance(
          new THREE.Vector2(point.x, point.z),
          mainOutline,
        );
        const onIsland = edgeClearance(
          new THREE.Vector2(local.x, local.z),
          fixture.outline,
        );
        narrowestShore = Math.min(narrowestShore, Math.max(onMain, onIsland));
      });
      expect(lowest, "grounded step underside").toBeGreaterThanOrEqual(0.02);
      expect(lowest, "step rests on the island").toBeLessThan(0.025);
      expect(narrowestShore, "step stays on firm ground").toBeGreaterThan(0.01);

      const bounds = new THREE.Box3().setFromObject(step, true);
      const volume = occupiedVolume(step);
      for (const obstacle of obstacles) {
        if (!bounds.intersectsBox(obstacle.bounds)) continue;
        expect(
          volume.intersectsOBB(obstacle.volume),
          `${step.position.toArray()} overlaps ${obstacle.name}`,
        ).toBe(false);
      }
    }
  });

test("world framing keeps all three connected islands in view throughout rotation", () => {
  const { scene } = campusScene();
  const court = createFoodCourt(scene);
  createFoodCourtFriends(court.object);
  createBridge(scene, FOOD_COURT_BRIDGE_OPTIONS);
  const main = new THREE.Mesh(
    new THREE.CylinderGeometry(1, 1, 0.6, 96),
    new THREE.MeshBasicMaterial(),
  );
  main.scale.set(6.9, 1, 5.35);
  main.position.y = -0.3;
  scene.add(main);
  const fit = createWorldFraming(scene);
  const points: THREE.Vector3[] = [];
  scene.traverse((part) => {
    if (part instanceof THREE.Mesh)
      visitVertices(part, (point) => points.push(point.clone()));
  });
  for (const [width, height] of [
    [320, 360],
    [390, 360],
    [1440, 850],
  ])
    for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 6) {
      const direction = new THREE.Vector3(
        Math.cos(angle),
        0.95,
        Math.sin(angle),
      ).normalize();
      const right = new THREE.Vector3()
        .crossVectors(THREE.Object3D.DEFAULT_UP, direction)
        .normalize();
      const up = new THREE.Vector3().crossVectors(direction, right).normalize();
      const framing = fit(direction, width, height);
      const scale = height / framing.height;
      let left = Infinity,
        top = Infinity,
        rightmost = -Infinity,
        bottom = -Infinity;
      for (const point of points) {
        const relative = point.clone().sub(framing.center);
        const x = width / 2 + relative.dot(right) * scale;
        const y = height / 2 - relative.dot(up) * scale;
        left = Math.min(left, x);
        rightmost = Math.max(rightmost, x);
        top = Math.min(top, y);
        bottom = Math.max(bottom, y);
      }
      expect(left).toBeGreaterThanOrEqual(19.9);
      expect(rightmost).toBeLessThanOrEqual(width - 19.9);
      expect(top).toBeGreaterThanOrEqual(44.9);
      expect(bottom).toBeLessThanOrEqual(height - 34.9);
    }
});
