import { expect, test } from "@playwright/test";
import * as THREE from "three";
import { createFountain } from "../src/world/fountain";
import { createResident, RESIDENT_CYCLE_SECONDS } from "../src/world/resident";

const scenes: THREE.Group[] = [];
function gardenScene() {
  const scene = new THREE.Group();
  scenes.push(scene);
  const fountain = createFountain(scene);
  scene.updateMatrixWorld(true);
  return { scene, fountain };
}

test.afterEach(() => {
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  for (const scene of scenes.splice(0))
    scene.traverse((object) => {
      if (!(object instanceof THREE.Mesh || object instanceof THREE.Line))
        return;
      geometries.add(object.geometry);
      const entries = Array.isArray(object.material)
        ? object.material
        : [object.material];
      entries.forEach((material) => materials.add(material));
    });
  geometries.forEach((geometry) => geometry.dispose());
  materials.forEach((material) => material.dispose());
});

function visitWorldVertices(
  mesh: THREE.Mesh,
  visit: (point: THREE.Vector3) => void,
) {
  const vertices = mesh.geometry.getAttribute("position");
  const point = new THREE.Vector3();
  const transform = new THREE.Matrix4();
  const count = mesh instanceof THREE.InstancedMesh ? mesh.count : 1;
  for (let instance = 0; instance < count; instance++) {
    if (mesh instanceof THREE.InstancedMesh) {
      mesh.getMatrixAt(instance, transform);
      transform.premultiply(mesh.matrixWorld);
    } else transform.copy(mesh.matrixWorld);
    for (let index = 0; index < vertices.count; index++)
      visit(point.fromBufferAttribute(vertices, index).applyMatrix4(transform));
  }
}

test("the complete fountain garden and grass edge stay inside the island", () => {
  const { fountain } = gardenScene();
  let outermost = 0;
  let outermostPart = "";
  fountain.object.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    visitWorldVertices(object, (point) => {
      // The island's 6.9 × 5.35 outline varies radially by at most .036.
      // The extra .001 also allows for its polygonal outline between vertices.
      const radiusSquared =
        (point.x / (6.9 * 0.963)) ** 2 + (point.z / (5.35 * 0.963)) ** 2;
      if (radiusSquared > outermost) {
        outermost = radiusSquared;
        outermostPart = object.name;
      }
    });
  });
  expect(outermost, outermostPart).toBeLessThan(1);
});

test("butterflies stay around the fountain and clear the moving bamboo and garden", () => {
  const { scene, fountain } = gardenScene();
  const visitors = fountain.butterflies.object.children;
  expect(visitors).toHaveLength(3);
  const butterflyParts = new Set<THREE.Object3D>();
  fountain.butterflies.object.traverse((part) => butterflyParts.add(part));
  const obstacles: THREE.Mesh[] = [];
  fountain.object.traverse((part) => {
    if (
      part instanceof THREE.Mesh &&
      !butterflyParts.has(part) &&
      part.castShadow
    )
      obstacles.push(part);
  });
  const bounds = new THREE.Box3();
  const solid = new THREE.Box3();
  const visitorBounds = visitors.map(() => new THREE.Box3());
  let nearest = Infinity;
  let pair = "";
  for (let elapsed = 0; elapsed < 120; elapsed += 0.2) {
    fountain.update(elapsed);
    scene.updateMatrixWorld(true);
    visitors.forEach((visitor, index) =>
      visitorBounds[index].setFromObject(visitor, true),
    );
    for (let i = 0; i < visitors.length; i++)
      for (let j = i + 1; j < visitors.length; j++)
        expect(
          visitorBounds[i].intersectsBox(visitorBounds[j]),
          `butterfly paths cross at ${elapsed.toFixed(1)}s`,
        ).toBe(false);
    for (const visitor of visitors) {
      bounds.setFromObject(visitor, true);
      expect(bounds.min.y).toBeGreaterThan(1.35);
      expect(bounds.max.y).toBeLessThan(2.6);
      for (const x of [bounds.min.x, bounds.max.x])
        for (const z of [bounds.min.z, bounds.max.z])
          expect(
            Math.hypot(
              x - fountain.object.position.x,
              z - fountain.object.position.z,
            ),
          ).toBeLessThan(1.65);
      for (const obstacle of obstacles) {
        solid.setFromObject(obstacle, true);
        const clearance = Math.hypot(
          Math.max(0, solid.min.x - bounds.max.x, bounds.min.x - solid.max.x),
          Math.max(0, solid.min.y - bounds.max.y, bounds.min.y - solid.max.y),
          Math.max(0, solid.min.z - bounds.max.z, bounds.min.z - solid.max.z),
        );
        if (clearance < nearest) {
          nearest = clearance;
          pair = `${visitor.name} / ${obstacle.name} at ${elapsed.toFixed(1)}s`;
        }
      }
    }
  }
  expect(nearest, pair).toBeGreaterThan(0.04);
});

test("the water meets the inner bowl wall and animated ripples remain contained", () => {
  const { scene, fountain } = gardenScene();
  const basin = scene.getObjectByName("fountain-stone-basin") as THREE.Mesh<
    THREE.BufferGeometry,
    THREE.MeshStandardMaterial
  >;
  const water = scene.getObjectByName("fountain-water") as THREE.Mesh;
  const center = water.getWorldPosition(new THREE.Vector3());
  const waterInverse = water.matrixWorld.clone().invert();
  const ray = new THREE.Raycaster();
  const direction = new THREE.Vector3();
  basin.material.side = THREE.DoubleSide;
  let largestOverlap = -Infinity;
  let smallestOverlap = Infinity;
  let waterRadius = 0;
  const local = new THREE.Vector3();
  visitWorldVertices(water, (point) => {
    local.copy(point).applyMatrix4(waterInverse);
    waterRadius = Math.max(waterRadius, Math.hypot(local.x, local.y));
    direction.copy(point).sub(center);
    const radius = direction.length();
    if (radius < 0.01) return;
    ray.set(center, direction.normalize());
    const hit = ray.intersectObject(basin)[0];
    expect(hit, "every water edge must meet the bowl").toBeDefined();
    const overlap = radius - hit.distance;
    largestOverlap = Math.max(largestOverlap, overlap);
    smallestOverlap = Math.min(smallestOverlap, overlap);
  });
  // A tiny overlap hides the join; a larger one could reach the outside wall.
  expect(largestOverlap).toBeLessThan(0.012);
  expect(smallestOverlap).toBeGreaterThan(-0.01);
  expect(
    new THREE.Box3().setFromObject(basin).max.y - center.y,
  ).toBeGreaterThan(0.1);
  ray.set(center, new THREE.Vector3(0, -1, 0));
  expect(ray.intersectObject(basin)[0].distance).toBeGreaterThan(0.2);

  const ripples = fountain.object.children.filter((part) =>
    part.name.startsWith("fountain-ripple-"),
  ) as THREE.Mesh[];
  let farthestRipple = 0;
  let lowestRipple = Infinity;
  let highestRipple = -Infinity;
  for (let elapsed = 0; elapsed < 12; elapsed += 0.031) {
    fountain.update(elapsed);
    scene.updateMatrixWorld(true);
    for (const ripple of ripples)
      visitWorldVertices(ripple, (point) => {
        point.applyMatrix4(waterInverse);
        farthestRipple = Math.max(farthestRipple, Math.hypot(point.x, point.y));
        lowestRipple = Math.min(lowestRipple, point.z);
        highestRipple = Math.max(highestRipple, point.z);
      });
  }
  expect(farthestRipple).toBeLessThan(waterRadius);
  expect(lowestRipple).toBeGreaterThan(0);
  expect(highestRipple).toBeLessThan(0.03);
});

test("the resident clears fountain stones and wood throughout the complete circuit", () => {
  const { scene, fountain } = gardenScene();
  const resident = createResident(scene);
  scene.updateMatrixWorld(true);
  const solids: { name: string; bounds: THREE.Box3 }[] = [];
  fountain.object.traverse((object) => {
    if (
      !(object instanceof THREE.Mesh) ||
      object.name === "fountain-grass-patch" ||
      object.name.includes("water") ||
      object.name.includes("ripple")
    )
      return;
    solids.push({
      name: object.name,
      bounds: new THREE.Box3().setFromObject(object),
    });
  });
  const bounds = new THREE.Box3();
  let nearest = Infinity;
  let nearestPart = "";
  for (let elapsed = 0; elapsed < RESIDENT_CYCLE_SECONDS; elapsed += 0.05) {
    resident.update(elapsed);
    scene.updateMatrixWorld(true);
    bounds.setFromObject(resident.object);
    for (const { name, bounds: solid } of solids) {
      const clearance = Math.hypot(
        Math.max(0, solid.min.x - bounds.max.x, bounds.min.x - solid.max.x),
        Math.max(0, solid.min.y - bounds.max.y, bounds.min.y - solid.max.y),
        Math.max(0, solid.min.z - bounds.max.z, bounds.min.z - solid.max.z),
      );
      if (clearance < nearest) {
        nearest = clearance;
        nearestPart = `${name} at ${elapsed.toFixed(2)}s`;
      }
    }
  }
  // Even conservative, axis-aligned mesh bounds retain a visible walking gap.
  expect(nearest, nearestPart).toBeGreaterThan(0.15);
});

test("the bamboo fills, tips and returns with water entering its opening and the scoop clearing the real basin", () => {
  const { scene, fountain } = gardenScene();
  const { mechanism } = fountain;
  const basin = scene.getObjectByName("fountain-stone-basin") as THREE.Mesh;
  const water = scene.getObjectByName("fountain-water") as THREE.Mesh;
  const feed = scene.getObjectByName("fountain-water-feed") as THREE.Mesh;
  const pour = scene.getObjectByName("fountain-water-pour") as THREE.Mesh;
  const waterInverse = water.matrixWorld.clone().invert();
  const basinTop = new THREE.Box3().setFromObject(basin).max.y;
  const worldPoint = (point: THREE.Vector3) =>
    fountain.object.localToWorld(point.clone());
  const flowCenter = (flow: THREE.Mesh, last: boolean) => {
    const vertices = flow.geometry.getAttribute("position");
    const center = new THREE.Vector3();
    const point = new THREE.Vector3();
    // Each ring has eight sides and one repeated closing vertex.
    const start = last ? vertices.count - 9 : 0;
    for (let i = 0; i < 8; i++)
      center.add(point.fromBufferAttribute(vertices, start + i));
    return flow.localToWorld(center.multiplyScalar(1 / 8));
  };
  const distanceToVertices = (point: THREE.Vector3, mesh: THREE.Mesh) => {
    let nearest = Infinity;
    visitWorldVertices(mesh, (vertex) => {
      nearest = Math.min(nearest, point.distanceTo(vertex));
    });
    return nearest;
  };
  const feeder = scene.getObjectByName("fountain-bamboo-feeder")!;
  const feederMouth = feeder.children
    .filter((part) => part.name === "fountain-bamboo-feeder-cut-end")
    .sort((a, b) => b.position.z - a.position.z)[0] as THREE.Mesh;
  const scoopMouth = scene.getObjectByName(
    "fountain-bamboo-scoop-mouth",
  ) as THREE.Mesh;
  // Test both faces so the ray cannot miss an accidental opening obstruction.
  mechanism.movingTube.traverse((part) => {
    if (!(part instanceof THREE.Mesh)) return;
    const materials = Array.isArray(part.material)
      ? part.material
      : [part.material];
    materials.forEach((material) => {
      material.side = THREE.DoubleSide;
    });
  });
  const ray = new THREE.Raycaster();
  const direction = new THREE.Vector3();
  const tubeBounds = new THREE.Box3();
  let minimumClearance = Infinity;
  let largestFeedGap = 0,
    largestPourGap = 0,
    largestStreamError = 0;
  let lowestPouring = Infinity,
    highestPouring = -Infinity;
  let blockedFeeds = 0;
  const restAngle = mechanism.movingTube.rotation.x;
  let largestTip = 0;
  for (let elapsed = 0; elapsed <= mechanism.cycleDuration; elapsed += 0.025) {
    fountain.update(elapsed);
    scene.updateMatrixWorld(true);
    const state = mechanism.update(elapsed);
    const feedStart = worldPoint(state.feedStart),
      feedEnd = worldPoint(state.feedEnd);
    const pourStart = worldPoint(state.pourStart),
      pourEnd = worldPoint(state.pourEnd);
    tubeBounds.setFromObject(mechanism.movingTube);
    // The actual carved lip is the conservative upper bound everywhere below the scoop.
    minimumClearance = Math.min(minimumClearance, tubeBounds.min.y - basinTop);
    largestTip = Math.max(
      largestTip,
      Math.abs(mechanism.movingTube.rotation.x - restAngle),
    );
    lowestPouring = Math.min(lowestPouring, state.pouring);
    highestPouring = Math.max(highestPouring, state.pouring);
    largestFeedGap = Math.max(
      largestFeedGap,
      distanceToVertices(feedStart, feederMouth),
    );
    largestPourGap = Math.max(
      largestPourGap,
      distanceToVertices(pourStart, scoopMouth),
    );
    for (const [flow, start, end] of [
      [feed, feedStart, feedEnd],
      [pour, pourStart, pourEnd],
    ] as const) {
      largestStreamError = Math.max(
        largestStreamError,
        flowCenter(flow, false).distanceTo(start),
        flowCenter(flow, true).distanceTo(end),
      );
    }
    // A ray follows the falling feed to the receiver. It must pass through the open cut,
    // never through the wall of a visually solid bamboo cylinder.
    direction.copy(feedEnd).sub(feedStart);
    ray.set(feedStart, direction.clone().normalize());
    ray.far = direction.length();
    blockedFeeds += ray
      .intersectObject(mechanism.movingTube, true)
      .filter((hit) => !hit.object.name.includes("water")).length;
    const landing = pourEnd.applyMatrix4(waterInverse);
    expect(Math.hypot(landing.x, landing.y)).toBeLessThan(0.6);
    expect(landing.z).toBeGreaterThan(0);
    expect(landing.z).toBeLessThan(0.01);
    expect(pour.visible).toBe(state.pouring > 0.015);
    if (elapsed < 5.5) {
      expect(mechanism.movingTube.rotation.x).toBe(restAngle);
      expect(state.pouring).toBe(0);
    }
  }
  expect(minimumClearance).toBeGreaterThan(0.003);
  expect(
    largestFeedGap,
    "feed originates at the hollow spout's cut lip",
  ).toBeLessThan(0.012);
  expect(largestPourGap, "pour originates at the scoop's cut lip").toBeLessThan(
    0.012,
  );
  expect(
    largestStreamError,
    "rendered streams follow the mechanism endpoints",
  ).toBeLessThan(0.000001);
  expect(blockedFeeds, "the filling stream must enter the cut-open scoop").toBe(
    0,
  );
  expect(largestTip).toBeGreaterThan(0.5);
  expect(lowestPouring).toBe(0);
  expect(highestPouring).toBe(1);
  const finish = mechanism.update(mechanism.cycleDuration);
  expect(mechanism.movingTube.rotation.x).toBe(restAngle);
  expect(finish.pouring).toBe(0);
});

test("frozen elapsed time is deterministic and a whole tipping cycle reuses every GPU geometry and buffer", () => {
  const { scene, fountain } = gardenScene();
  const resources: {
    mesh: THREE.Mesh;
    geometry: THREE.BufferGeometry;
    attributes: [
      string,
      THREE.BufferAttribute | THREE.InterleavedBufferAttribute,
      ArrayLike<number>,
    ][];
  }[] = [];
  fountain.object.traverse((part) => {
    if (!(part instanceof THREE.Mesh)) return;
    resources.push({
      mesh: part,
      geometry: part.geometry,
      attributes: Object.entries(part.geometry.attributes).map(
        ([name, attribute]) => [name, attribute, attribute.array],
      ),
    });
  });
  const snapshot = () => {
    const result: unknown[] = [];
    scene.updateMatrixWorld(true);
    fountain.object.traverse((part) => {
      result.push([...part.matrix.elements], part.visible);
      if (!(part instanceof THREE.Mesh)) return;
      const materials = Array.isArray(part.material)
        ? part.material
        : [part.material];
      result.push(materials.map((material) => material.opacity));
      if (
        part.name === "fountain-water-feed" ||
        part.name === "fountain-water-pour"
      ) {
        result.push(Array.from(part.geometry.getAttribute("position").array));
        result.push(Array.from(part.geometry.getAttribute("normal").array));
      }
    });
    return result;
  };
  fountain.update(6.07);
  const frozen = snapshot();
  fountain.update(6.07);
  expect(snapshot()).toEqual(frozen);
  fountain.update(2.4);
  fountain.update(6.07);
  expect(
    snapshot(),
    "the pose must depend only on elapsed time, not previous updates",
  ).toEqual(frozen);

  // Geometry ids also catch a temporary geometry that gets allocated and discarded.
  const before = new THREE.BufferGeometry();
  let replacedResources = 0;
  for (
    let elapsed = 0;
    elapsed < fountain.mechanism.cycleDuration;
    elapsed += 0.025
  ) {
    fountain.update(elapsed);
    for (const { mesh, geometry, attributes } of resources) {
      if (mesh.geometry !== geometry) replacedResources++;
      for (const [name, attribute, array] of attributes)
        if (
          geometry.getAttribute(name) !== attribute ||
          attribute.array !== array
        )
          replacedResources++;
    }
  }
  const after = new THREE.BufferGeometry();
  expect(
    after.id - before.id,
    "animation cannot allocate new BufferGeometry objects",
  ).toBe(1);
  expect(
    replacedResources,
    "geometry, attributes and typed arrays stay mounted",
  ).toBe(0);
  before.dispose();
  after.dispose();
});
