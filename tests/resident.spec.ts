import { expect, test } from "@playwright/test";
import * as THREE from "three";
import {
  createResident,
  RESIDENT_CYCLE_SECONDS,
  RESIDENT_ROUTE,
  sampleResident,
} from "../src/world/resident";
import { createBridge, FOOD_COURT_BRIDGE_OPTIONS } from "../src/world/bridge";
import { createFoodCourt, FOOD_COURT_LOCATION } from "../src/world/foodCourt";
import { createFoodCourtFriends } from "../src/world/foodCourtFriends";
import {
  MAIL_ROTATION,
  STOOL_LAYOUT,
  mailToWorld,
} from "../src/world/mailRoutine";

test("the resident completes a continuous circuit over both islands and their bridge without crossing lamps and buildings", () => {
  const lamps = [
    [-1.25, 3.57],
    [0.89, 0.06],
    [-1.05, -0.3],
    [4.87, 0.14],
    [-5.9, 0.9],
  ];
  let last = sampleResident(0);
  let maxSpeed = 0;
  let nearestLamp = Infinity;
  let nearestFountain = Infinity;
  let nearestRecord = Infinity;
  let outermost = 0;
  let bridgeSamples = 0;
  let courtSamples = 0;
  const activities = new Set<string>();
  for (let time = 0.025; time <= RESIDENT_CYCLE_SECONDS; time += 0.025) {
    const sample = sampleResident(time);
    activities.add(sample.activity);
    const [x, y, z] = sample.position;
    expect(Number.isFinite(x + y + z + sample.facing)).toBe(true);
    maxSpeed = Math.max(
      maxSpeed,
      new THREE.Vector3(...sample.position).distanceTo(
        new THREE.Vector3(...last.position),
      ) / 0.025,
    );
    if (
      x >= FOOD_COURT_BRIDGE_OPTIONS.start[0] &&
      x <= FOOD_COURT_BRIDGE_OPTIONS.end[0]
    ) {
      bridgeSamples++;
      expect(Math.abs(z - FOOD_COURT_BRIDGE_OPTIONS.start[2])).toBeLessThan(
        0.025,
      );
    } else if (x > FOOD_COURT_BRIDGE_OPTIONS.end[0]) {
      courtSamples++;
      const localX = FOOD_COURT_LOCATION[2] - z;
      const localZ = x - FOOD_COURT_LOCATION[0];
      outermost = Math.max(
        outermost,
        (localX / 3.58) ** 2 + (localZ / 2.78) ** 2,
      );
    } else {
      outermost = Math.max(outermost, (x / 6.9) ** 2 + (z / 5.35) ** 2);
    }
    nearestLamp = Math.min(
      nearestLamp,
      ...lamps.map(([lx, lz]) => Math.hypot(x - lx, z - lz)),
    );
    nearestFountain = Math.min(nearestFountain, Math.hypot(x - 2.5, z + 2.65));
    nearestRecord = Math.min(nearestRecord, Math.hypot(x + 3.2, z - 2.05));
    last = sample;
  }
  expect([...activities].sort()).toEqual([
    "admiring",
    "checking-mail",
    "coding",
    "hanging-out",
    "listening",
    "resting",
    "strolling",
    "watching",
  ]);
  expect(bridgeSamples).toBeGreaterThan(400);
  expect(courtSamples).toBeGreaterThan(500);
  expect(maxSpeed).toBeLessThan(0.8);
  expect(outermost).toBeLessThan(0.85);
  expect(nearestLamp).toBeGreaterThan(0.5);
  // The .8-radius basin leaves over .6 clearance beyond the resident's limbs.
  expect(nearestFountain).toBeGreaterThan(1.85);
  expect(nearestRecord).toBeGreaterThan(1.8);
  for (const leg of RESIDENT_ROUTE) {
    const before = sampleResident(leg.start - 0.00001);
    const after = sampleResident(leg.start + 0.00001);
    expect(
      new THREE.Vector3(...before.position).distanceTo(
        new THREE.Vector3(...after.position),
      ),
    ).toBeLessThan(0.0001);
  }
});

test("resident poses use the furniture and remain deterministic when elapsed time is frozen", () => {
  const world = new THREE.Group();
  const resident = createResident(world);
  const seats = [
    { activity: "coding", x: -3.2, z: -1, top: 0.7 },
    { activity: "resting", x: -0.358, z: -1.435, top: 0.4125 },
    { activity: "listening", x: -3.02, z: 4.18, top: 0.37 },
    { activity: "watching", x: 2.28, z: 2.45, top: 0.68 },
  ];
  for (const seat of seats) {
    const dwell = RESIDENT_ROUTE.find(
      (leg) =>
        leg.activity === seat.activity &&
        leg.from.seated === 1 &&
        leg.to.seated === 1,
    )!;
    expect(dwell).toBeTruthy();
    const time = dwell.start + dwell.duration / 2;
    const sample = resident.update(time);
    expect(sample.position[0]).toBeCloseTo(seat.x);
    expect(sample.position[2]).toBeCloseTo(seat.z);
    expect(sample.position[1] - 0.285).toBeCloseTo(seat.top, 3);
    world.updateMatrixWorld(true);
    const matrices: number[][] = [];
    world.traverse((object) => matrices.push([...object.matrixWorld.elements]));
    resident.update(time);
    world.updateMatrixWorld(true);
    const repeated: number[][] = [];
    world.traverse((object) => repeated.push([...object.matrixWorld.elements]));
    expect(repeated).toEqual(matrices);
  }
  for (let time = 0; time < RESIDENT_CYCLE_SECONDS; time += 0.17) {
    const sample = resident.update(time);
    if (sample.activity !== "strolling") continue;
    world.updateMatrixWorld(true);
    for (const side of ["left", "right"]) {
      const shoe = world.getObjectByName(`resident-shoe-${side}`)!;
      expect(new THREE.Box3().setFromObject(shoe).min.y).toBeGreaterThan(0.015);
    }
  }
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  world.traverse((object) => {
    if (object instanceof THREE.Mesh || object instanceof THREE.Line) {
      geometries.add(object.geometry);
      const entries = Array.isArray(object.material)
        ? object.material
        : [object.material];
      entries.forEach((material) => materials.add(material));
    }
  });
  geometries.forEach((geometry) => geometry.dispose());
  materials.forEach((material) => material.dispose());
});

test("resident meshes clear furniture during seating, typing, stair climbing, and narrow aisle turns", () => {
  const world = new THREE.Group();
  const resident = createResident(world);
  const parts = resident.object.children[0].children.filter(
    (part): part is THREE.Mesh => part instanceof THREE.Mesh,
  );
  const meshSamples = new Map<THREE.BufferGeometry, THREE.Vector3[]>();
  for (const part of parts) {
    if (meshSamples.has(part.geometry)) continue;
    const vertices = part.geometry.attributes.position;
    const index = part.geometry.index;
    const samples = Array.from({ length: vertices.count }, (_, vertex) =>
      new THREE.Vector3().fromBufferAttribute(vertices, vertex),
    );
    const vertexCount = index?.count ?? vertices.count;
    for (let vertex = 0; vertex < vertexCount; vertex += 3) {
      const a = index ? index.getX(vertex) : vertex;
      const b = index ? index.getX(vertex + 1) : vertex + 1;
      const c = index ? index.getX(vertex + 2) : vertex + 2;
      samples.push(
        samples[a]
          .clone()
          .add(samples[b])
          .add(samples[c])
          .multiplyScalar(1 / 3),
      );
    }
    meshSamples.set(part.geometry, samples);
  }
  const obstacles: {
    name: string;
    inverse: THREE.Matrix4;
    half: THREE.Vector3;
    radius: number;
  }[] = [];
  const addBox = (
    name: string,
    center: [number, number, number],
    size: [number, number, number],
    radius: number,
    rotation = 0,
  ) => {
    obstacles.push({
      name,
      inverse: new THREE.Matrix4()
        .compose(
          new THREE.Vector3(...center),
          new THREE.Quaternion().setFromAxisAngle(
            new THREE.Vector3(0, 1, 0),
            rotation,
          ),
          new THREE.Vector3(1, 1, 1),
        )
        .invert(),
      half: new THREE.Vector3(...size).multiplyScalar(0.5),
      radius: Math.min(radius, ...size.map((value) => value * 0.3)),
    });
  };
  // Physical furniture dimensions are deliberately independent of the resident
  // path. These fixtures catch a misplaced limb even when its center is clear.
  addBox("work desktop", [-2.9, 1.03, -1.77], [2.65, 0.15, 0.98], 0.065);
  addBox("keyboard", [-3.2, 1.1175, -1.48], [0.74, 0.025, 0.26], 0.02);
  addBox("work seat", [-3.2, 0.64, -0.965], [0.5, 0.12, 0.61], 0.1);
  addBox("work chair back", [-3.2, 0.87, -0.69], [0.5, 0.42, 0.09], 0.07);
  addBox("work floor", [-2.9, 0.25, -2.15], [3.36, 0.12, 2.92], 0.1);
  addBox("work lower step", [-2.75, 0.0525, -0.52], [1.22, 0.065, 0.48], 0.04);
  addBox("work upper step", [-2.75, 0.13, -0.72], [1.06, 0.09, 0.35], 0.04);
  for (const x of [2.28, 3.58]) {
    addBox("cinema seat", [x, 0.62, 2.51], [0.52, 0.12, 0.61], 0.09);
    addBox("cinema chair back", [x, 0.88, 2.78], [0.52, 0.43, 0.12], 0.08);
  }
  addBox("cinema floor", [2.95, 0.26, 1.8], [3.8, 0.13, 2.38], 0.1);
  addBox("cinema lower step", [2.95, 0.09, 3.15], [1.35, 0.14, 0.42], 0.035);
  addBox("cinema upper step", [2.95, 0.22, 2.93], [1.16, 0.12, 0.31], 0.035);
  addBox("listening bench", [-3.02, 0.32, 4.13], [0.78, 0.1, 0.39], 0.065);
  for (const [x, rotation] of [
    [-5.22, -0.1],
    [-1.18, 0.1],
  ]) {
    addBox(
      "speaker cabinet",
      [x, 0.85, 1.58],
      [0.68, 1.41, 0.66],
      0.1,
      rotation,
    );
    addBox(
      "speaker base",
      [x, 0.0825, 1.58],
      [0.8, 0.125, 0.78],
      0.045,
      rotation,
    );
  }
  const parkBox = (
    name: string,
    local: [number, number, number],
    size: [number, number, number],
    radius: number,
  ) => {
    const center = new THREE.Vector3(...local)
      .applyAxisAngle(new THREE.Vector3(0, 1, 0), -0.12)
      .add(new THREE.Vector3(-0.35, 0, -1.5));
    addBox(name, center.toArray(), size, radius, -0.12);
  };
  for (let index = 0; index < 3; index++)
    parkBox(
      "park bench slat",
      [0, 0.38, -0.14 + index * 0.14],
      [0.9, 0.065, 0.105],
      0.02,
    );
  parkBox("park bench back", [0, 0.64, -0.22], [0.91, 0.24, 0.07], 0.025);
  addBox(
    "mail stool",
    [STOOL_LAYOUT.position[0], 0.22, STOOL_LAYOUT.position[2]],
    [STOOL_LAYOUT.width, 0.4, STOOL_LAYOUT.depth],
    0.04,
    STOOL_LAYOUT.rotation,
  );
  for (const side of [-1, 1]) {
    addBox(
      "mail case side",
      mailToWorld([side * 0.3425, 0, 0]),
      [0.045, 0.5, 0.54],
      0.012,
      MAIL_ROTATION,
    );
    addBox(
      "mail case top/base",
      mailToWorld([0, side * 0.225, 0]),
      [0.73, 0.05, 0.54],
      0.012,
      MAIL_ROTATION,
    );
  }
  addBox(
    "mail case back",
    mailToWorld([0, 0, -0.245]),
    [0.73, 0.5, 0.05],
    0.012,
    MAIL_ROTATION,
  );
  addBox(
    "mail letter tray",
    mailToWorld([0.04, -0.121, 0]),
    [0.46, 0.022, 0.44],
    0.004,
    MAIL_ROTATION,
  );

  const local = new THREE.Vector3();
  const delta = new THREE.Vector3();
  let deepest = 0;
  let contact = "";
  for (let time = 0; time < RESIDENT_CYCLE_SECONDS; time += 0.05) {
    const sample = resident.update(time);
    world.updateMatrixWorld(true);
    for (const obstacle of obstacles) {
      local.set(...sample.position).applyMatrix4(obstacle.inverse);
      if (
        Math.abs(local.x) > obstacle.half.x + 0.62 ||
        Math.abs(local.y) > obstacle.half.y + 0.68 ||
        Math.abs(local.z) > obstacle.half.z + 0.62
      )
        continue;
      for (const part of parts) {
        for (const point of meshSamples.get(part.geometry)!) {
          local
            .copy(point)
            .applyMatrix4(part.matrixWorld)
            .applyMatrix4(obstacle.inverse);
          delta
            .set(Math.abs(local.x), Math.abs(local.y), Math.abs(local.z))
            .sub(obstacle.half)
            .addScalar(obstacle.radius);
          const distance =
            Math.hypot(
              Math.max(delta.x, 0),
              Math.max(delta.y, 0),
              Math.max(delta.z, 0),
            ) +
            Math.min(Math.max(delta.x, delta.y, delta.z), 0) -
            obstacle.radius;
          if (-distance > deepest) {
            deepest = -distance;
            contact = `${part.name || part.geometry.type} / ${obstacle.name} at ${time.toFixed(2)}s`;
          }
        }
      }
    }
  }
  expect(deepest, contact).toBeLessThan(0.006);
});

test("the resident crosses the timber deck in both directions and joins friends without clipping the stalls or guests", () => {
  const world = new THREE.Group();
  const bridge = createBridge(world, FOOD_COURT_BRIDGE_OPTIONS);
  const court = createFoodCourt(world);
  const friends = createFoodCourtFriends(court.object);
  const resident = createResident(world);
  const parts: THREE.Mesh[] = [];
  resident.object.traverse((part) => {
    if (part instanceof THREE.Mesh) parts.push(part);
  });
  const deck: THREE.Mesh[] = [];
  const obstacles: THREE.Mesh[] = [];
  const paving: THREE.Mesh[] = [];
  bridge.object.traverse((part) => {
    if (!(part instanceof THREE.Mesh)) return;
    if (
      part.name.startsWith("bridge-plank-") ||
      part.name === "bridge-entry-step"
    )
      deck.push(part);
    else if (
      /^bridge-(handrail-rope|rope-hanger|landing-post|post-cap|post-footing)$/.test(
        part.name,
      )
    )
      obstacles.push(part);
  });
  court.object.traverse((part) => {
    if (!(part instanceof THREE.Mesh)) return;
    if (part.name === "food-court-paving") {
      paving.push(part);
      return;
    }
    if (part.name.startsWith("food-island-")) return;
    obstacles.push(part);
  });
  const ray = new THREE.Raycaster();
  ray.ray.direction.set(0, -1, 0);
  const point = new THREE.Vector3();
  const overlap = new THREE.Box3();
  const size = new THREE.Vector3();
  let deepest = 0;
  let contact = "";
  let unsupported = 0;
  let belowDeck = 0;
  let outward = 0;
  let homeward = 0;
  let pavingPenetration = 0;
  let pavingContact = "";
  let gardenPenetration = 0;
  let gardenContact = "";
  let previousX = 0;
  for (let time = 0; time < RESIDENT_CYCLE_SECONDS; time += 0.13) {
    const sample = resident.update(time);
    if (sample.position[0] < 4.3) continue;
    friends.update(
      time,
      sample.activity === "hanging-out"
        ? {
            position: court.object
              .worldToLocal(new THREE.Vector3(...sample.position))
              .toArray(),
            amount: sample.interaction,
            time: sample.activityTime,
          }
        : undefined,
    );
    world.updateMatrixWorld(true);
    const residentBounds = new THREE.Box3().setFromObject(
      resident.object,
      true,
    );
    const near = obstacles
      .map((part) => ({
        part,
        bounds: new THREE.Box3().setFromObject(part, true),
      }))
      .filter(({ bounds }) => bounds.intersectsBox(residentBounds));
    for (const part of parts) {
      const bounds = new THREE.Box3().setFromObject(part, true);
      for (const obstacle of near) {
        if (!bounds.intersectsBox(obstacle.bounds)) continue;
        overlap.copy(bounds).intersect(obstacle.bounds).getSize(size);
        const penetration = Math.min(size.x, size.y, size.z);
        if (penetration > deepest) {
          deepest = penetration;
          contact = `${part.name} / ${obstacle.part.name} at ${time.toFixed(2)}s`;
        }
      }
    }
    const [x, , z] = sample.position;
    // Independent dimensions from the garden's original orange tree and path
    // lamp: the route must fit this pinch without relying on scenery relocation.
    if (x > 4.3 && x < 5.9) {
      for (const part of parts) {
        const vertices = part.geometry.getAttribute("position");
        for (let index = 0; index < vertices.count; index++) {
          point
            .fromBufferAttribute(vertices, index)
            .applyMatrix4(part.matrixWorld);
          const cylinderDepth = (
            cx: number,
            cz: number,
            bottom: number,
            top: number,
            radius: number,
          ) =>
            Math.min(
              point.y - bottom,
              top - point.y,
              radius - Math.hypot(point.x - cx, point.z - cz),
            );
          let depth = Math.max(
            cylinderDepth(5.47, -0.79, 0, 0.1, 0.27),
            cylinderDepth(5.4792, -0.79, 0.006, 0.7995, 0.0437),
            cylinderDepth(4.87, 0.14, -0.005, 0.065, 0.18),
            cylinderDepth(4.87, 0.14, 0.05, 0.62, 0.03),
            cylinderDepth(
              4.87,
              0.14,
              0.8,
              0.88,
              0.05 + ((point.y - 0.8) / 0.08) * 0.11,
            ),
            0.13 - point.distanceTo(new THREE.Vector3(4.87, 0.72, 0.14)),
          );
          for (const [lx, ly, lz, rx, ry, rz] of [
            [0.025, 0.8, 0, 0.225, 0.35, 0.23],
            [-0.135, 0.625, 0.035, 0.165, 0.225, 0.175],
          ]) {
            const distance = Math.hypot(
              (point.x - 5.47 - lx * 1.15) / (rx * 1.15),
              (point.y - ly * 1.15) / (ry * 1.15),
              (point.z + 0.79 - lz * 1.15) / (rz * 1.15),
            );
            depth = Math.max(
              depth,
              (1 - distance) * Math.min(rx, ry, rz) * 1.15,
            );
          }
          if (depth > gardenPenetration) {
            gardenPenetration = depth;
            gardenContact = `${part.name} in garden pinch at ${time.toFixed(2)}s, root=${sample.position.join(",")}, vertex=${point.toArray().join(",")}`;
          }
        }
      }
    }
    if (x > 6.18 && x < 10.57) {
      if (x > previousX) outward++;
      else homeward++;
      expect(Math.abs(z + 0.25)).toBeLessThan(0.025);
      for (const side of ["left", "right"]) {
        const shoe = world.getObjectByName(
          `resident-shoe-${side}`,
        ) as THREE.Mesh;
        let hits = 0;
        let closest = Infinity;
        // Five sole samples cover the flat bottom without treating the rounded
        // bounding-box corners as physical points on the shoe.
        for (const [sx, sz] of [
          [0, 0],
          [-0.045, -0.075],
          [0.045, -0.075],
          [-0.045, 0.075],
          [0.045, 0.075],
        ]) {
          point.set(sx, -0.065, sz).applyMatrix4(shoe.matrixWorld);
          ray.ray.origin.set(point.x, 1, point.z);
          const support = ray.intersectObjects(deck, false)[0];
          if (!support) continue;
          hits++;
          closest = Math.min(closest, point.y - support.point.y);
        }
        if (!hits) unsupported++;
        if (closest < -0.003) belowDeck++;
        expect(
          closest,
          `${side} shoe stays close to deck at ${time.toFixed(2)}s`,
        ).toBeLessThan(0.18);
      }
    }
    if (x > FOOD_COURT_BRIDGE_OPTIONS.end[0]) {
      for (const side of ["left", "right"]) {
        const shoe = world.getObjectByName(
          `resident-shoe-${side}`,
        ) as THREE.Mesh;
        for (const [sx, sz] of [
          [0, 0],
          [-0.045, -0.075],
          [0.045, -0.075],
          [-0.045, 0.075],
          [0.045, 0.075],
        ]) {
          point.set(sx, -0.065, sz).applyMatrix4(shoe.matrixWorld);
          ray.ray.origin.set(point.x, 1, point.z);
          const support = ray.intersectObjects(paving, false)[0];
          if (support && support.point.y - point.y > pavingPenetration) {
            pavingPenetration = support.point.y - point.y;
            pavingContact = `${side} shoe in paving at ${time.toFixed(2)}s`;
          }
        }
      }
    }
    previousX = x;
  }
  expect(outward).toBeGreaterThan(40);
  expect(homeward).toBeGreaterThan(40);
  expect(deepest, contact).toBeLessThan(0.006);
  expect(gardenPenetration, gardenContact).toBeLessThan(0.004);
  expect(pavingPenetration, pavingContact).toBeLessThan(0.003);
  expect(unsupported).toBe(0);
  expect(belowDeck).toBe(0);

  const hangout = RESIDENT_ROUTE.find(
    (leg) => leg.activity === "hanging-out" && leg.duration >= 12,
  )!;
  expect(hangout).toBeTruthy();
  const time = hangout.start + hangout.duration / 2;
  const sample = resident.update(time);
  const local = court.object.worldToLocal(
    new THREE.Vector3(...sample.position),
  );
  expect(sample.walking).toBe(0);
  expect(sample.seated).toBe(0);
  for (const [x, z] of [
    [0.55, 1.85],
    [1.2, 1.8],
  ]) {
    expect(Math.hypot(local.x - x, local.z - z)).toBeLessThan(1.25);
    expect(Math.hypot(local.x - x, local.z - z)).toBeGreaterThan(0.65);
  }
  const target = court.object.localToWorld(
    new THREE.Vector3(0.875, 0.5, 1.825),
  );
  const facing = new THREE.Vector3(
    Math.sin(sample.facing),
    0,
    Math.cos(sample.facing),
  );
  const towardFriends = target.sub(new THREE.Vector3(...sample.position));
  towardFriends.y = 0;
  expect(facing.dot(towardFriends.normalize())).toBeGreaterThan(0.96);
  world.updateMatrixWorld(true);
  const matrices: number[][] = [];
  resident.object.traverse((object) =>
    matrices.push([...object.matrixWorld.elements]),
  );
  resident.update(time);
  world.updateMatrixWorld(true);
  const repeated: number[][] = [];
  resident.object.traverse((object) =>
    repeated.push([...object.matrixWorld.elements]),
  );
  expect(repeated).toEqual(matrices);
  resident.update(time + 1);
  world.updateMatrixWorld(true);
  const moved: number[][] = [];
  resident.object.traverse((object) =>
    moved.push([...object.matrixWorld.elements]),
  );
  expect(moved).not.toEqual(matrices);

  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  world.traverse((part) => {
    if (!(part instanceof THREE.Mesh || part instanceof THREE.Line)) return;
    geometries.add(part.geometry);
    const entries = Array.isArray(part.material)
      ? part.material
      : [part.material];
    entries.forEach((material) => materials.add(material));
  });
  geometries.forEach((geometry) => geometry.dispose());
  materials.forEach((material) => material.dispose());
});
