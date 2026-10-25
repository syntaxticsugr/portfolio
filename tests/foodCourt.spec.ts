import { expect, test } from "@playwright/test";
import * as THREE from "three";
import { createBridge, FOOD_COURT_BRIDGE_OPTIONS } from "../src/world/bridge";
import { createFoodCourt } from "../src/world/foodCourt";
import { createFoodCourtFriends } from "../src/world/foodCourtFriends";
import { createSceneryLayout } from "../src/world/scenery";

const scenes: THREE.Group[] = [];
function foodScene() {
  const scene = new THREE.Group();
  scenes.push(scene);
  const court = createFoodCourt(scene);
  const friends = createFoodCourtFriends(court.object);
  const bridge = createBridge(scene, FOOD_COURT_BRIDGE_OPTIONS);
  scene.updateMatrixWorld(true);
  return { scene, court, friends, bridge };
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
const courtOutline = outline(3.58, 2.78, 0.009, 0.006);

function edgeClearance(x: number, z: number, polygon: THREE.Vector2[]) {
  let inside = false;
  let nearest = Infinity;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i],
      b = polygon[j];
    if (
      a.y > z !== b.y > z &&
      x < ((b.x - a.x) * (z - a.y)) / (b.y - a.y) + a.x
    )
      inside = !inside;
    const dx = b.x - a.x,
      dz = b.y - a.y;
    const t = THREE.MathUtils.clamp(
      ((x - a.x) * dx + (z - a.y) * dz) / (dx * dx + dz * dz),
      0,
      1,
    );
    nearest = Math.min(nearest, Math.hypot(x - a.x - t * dx, z - a.y - t * dz));
  }
  return inside ? nearest : -nearest;
}

function vertices(mesh: THREE.Mesh, visit: (point: THREE.Vector3) => void) {
  const position = mesh.geometry.getAttribute("position");
  const point = new THREE.Vector3();
  for (let i = 0; i < position.count; i++)
    visit(
      point.fromBufferAttribute(position, i).applyMatrix4(mesh.matrixWorld),
    );
}

function meshes(parent: THREE.Object3D) {
  const result: THREE.Mesh[] = [];
  parent.traverse((part) => {
    if (part instanceof THREE.Mesh) result.push(part);
  });
  return result;
}

test("food stalls, tables, stools and friends stay on their island with supported feet", () => {
  const { court } = foodScene();
  let lowest = Infinity,
    outermost = 0,
    narrowestFooting = Infinity;
  let lowestName = "",
    outermostName = "",
    footingName = "";
  for (const part of meshes(court.object)) {
    if (part.name.startsWith("food-island-")) continue;
    const bounds = new THREE.Box3().setFromObject(part, true);
    const onGround = bounds.min.y < 0.031;
    vertices(part, (point) => {
      const { x, z } = court.object.worldToLocal(point);
      const radius = (x / 3.7) ** 2 + (z / 2.9) ** 2;
      if (radius > outermost) {
        outermost = radius;
        outermostName = part.name;
      }
      if (part.name !== "food-court-paving" && point.y < lowest) {
        lowest = point.y;
        lowestName = part.name;
      }
      if (onGround) {
        const distance = edgeClearance(x, z, courtOutline);
        if (distance < narrowestFooting) {
          narrowestFooting = distance;
          footingName = part.name;
        }
      }
    });
  }
  expect(outermost, outermostName).toBeLessThan(1);
  // Pavers are intentionally inset; furniture and feet sit on the .02 ground plane.
  expect(lowest, lowestName).toBeGreaterThanOrEqual(0.0199);
  expect(narrowestFooting, footingName).toBeGreaterThan(0.025);

  for (const stall of court.object.children.filter((part) =>
    part.name.startsWith("food-stall-"),
  )) {
    const terrace = stall.getObjectByName("food-stall-terrace-plank")!;
    const terraceTop = new THREE.Box3().setFromObject(terrace, true).max.y;
    const counter = stall.getObjectByName("food-stall-counter-body")!;
    const counterBottom = new THREE.Box3().setFromObject(counter, true).min.y;
    const supports = meshes(stall).filter(
      (part) => part.name === "food-stall-counter-foot",
    );
    if (counterBottom - terraceTop > 0.003) {
      expect(
        supports.length,
        `${stall.name} counter support`,
      ).toBeGreaterThanOrEqual(3);
      for (const support of supports) {
        const feet = new THREE.Box3().setFromObject(support, true);
        expect(
          Math.abs(feet.min.y - terraceTop),
          `${stall.name} grounded foot`,
        ).toBeLessThan(0.003);
        expect(
          Math.abs(feet.max.y - counterBottom),
          `${stall.name} supported counter`,
        ).toBeLessThan(0.003);
      }
    }
  }
});

test("every food stall has a grounded vendor who clears the counter and shelves", () => {
  const { court } = foodScene();
  for (const name of ["momos", "chai", "noodles"]) {
    const stall = court.object.getObjectByName(`food-stall-${name}`)!;
    const vendors = stall.children.filter(
      (part) => part.name === "food-stall-vendor",
    );
    expect(vendors, `${name} is staffed`).toHaveLength(1);
    const vendor = vendors[0];
    const parts = meshes(vendor);
    const terrace = stall.getObjectByName("food-stall-terrace-plank")!;
    const floor = new THREE.Box3().setFromObject(terrace, true).max.y;
    const shoes = parts.filter((part) => part.name === "food-vendor-shoe");
    expect(shoes).toHaveLength(2);
    for (const shoe of shoes)
      expect(
        Math.abs(new THREE.Box3().setFromObject(shoe, true).min.y - floor),
        `${name} vendor's feet rest on the terrace`,
      ).toBeLessThan(0.001);

    const obstacles = meshes(stall)
      .filter((part) =>
        /^food-stall-(counter-body|countertop|back-shelf|post|side-panel|back-panel)$/.test(
          part.name,
        ),
      )
      .map((part) => {
        part.geometry.computeBoundingBox();
        return {
          name: part.name,
          inverse: part.matrixWorld.clone().invert(),
          bounds: part.geometry.boundingBox!.clone().expandByScalar(-0.001),
        };
      });
    const overlaps = new Set<string>();
    const local = new THREE.Vector3();
    for (const part of parts)
      vertices(part, (point) => {
        for (const obstacle of obstacles)
          if (
            obstacle.bounds.containsPoint(
              local.copy(point).applyMatrix4(obstacle.inverse),
            )
          )
            overlaps.add(`${name}: ${part.name} intersects ${obstacle.name}`);
      });
    expect([...overlaps]).toEqual([]);
  }
});

test("all vendors' faces are visible from the opening camera and nearby rotations", () => {
  const { scene, court } = foodScene();
  const surfaces = meshes(scene);
  const ray = new THREE.Raycaster();
  const obscured: string[] = [];
  for (const name of ["momos", "chai", "noodles"]) {
    const vendor = court.object
      .getObjectByName(`food-stall-${name}`)!
      .getObjectByName("food-stall-vendor")!;
    const features = meshes(vendor).filter(
      (part) =>
        part.name === "food-vendor-eye" || part.name === "food-vendor-smile",
    );
    expect(features, `${name} has two eyes and a smile`).toHaveLength(3);
    for (const angle of [-10, 0, 10]) {
      // Match World.tsx's actual opening camera after the food island's rotation.
      const direction = new THREE.Vector3(11, 14, 19)
        .applyAxisAngle(new THREE.Vector3(0, 1, 0), (angle * Math.PI) / 180)
        .normalize();
      let visibleFeatures = 0;
      for (const feature of features) {
        // Aim at the solid lower arc of the smile, not the torus's empty center.
        const target = feature.localToWorld(
          new THREE.Vector3(
            0,
            feature.name === "food-vendor-smile" ? 0.032 : 0,
            0,
          ),
        );
        ray.set(
          target.clone().addScaledVector(direction, 30),
          direction.clone().negate(),
        );
        const first = ray.intersectObjects(surfaces, false)[0]?.object;
        if (first === feature) visibleFeatures++;
        else if (feature.name === "food-vendor-eye")
          obscured.push(
            `${name} ${feature.name} at ${angle}° is behind ${first?.name ?? "nothing"}`,
          );
      }
      // A narrow wooden post may pass across the smile as the island turns;
      // both eyes must stay clear so the person remains immediately readable.
      expect(
        visibleFeatures,
        `${name} readable face at ${angle}°`,
      ).toBeGreaterThanOrEqual(2);
    }
  }
  expect(obscured).toEqual([]);
});

test("food bridge landings remain above both shores and their posts stay on firm ground", () => {
  const { court, bridge } = foodScene();
  const plankMeshes = meshes(bridge.object).filter((part) =>
    part.name.startsWith("bridge-plank-"),
  );
  expect(plankMeshes.length).toBeGreaterThan(20);
  let shoreClearance = Infinity,
    nearestFooting = Infinity,
    largestGap = 0;
  let shorePart = "",
    footingPart = "";
  let previousEnd: THREE.Vector3 | undefined;
  for (const plank of plankMeshes) {
    expect(
      new THREE.Vector3(0, 1, 0).transformDirection(plank.matrixWorld).y,
      plank.name,
    ).toBeGreaterThan(0.7);
    plank.geometry.computeBoundingBox();
    const bounds = plank.geometry.boundingBox!;
    const start = new THREE.Vector3(0, 0, bounds.min.z).applyMatrix4(
      plank.matrixWorld,
    );
    const end = new THREE.Vector3(0, 0, bounds.max.z).applyMatrix4(
      plank.matrixWorld,
    );
    if (previousEnd)
      largestGap = Math.max(largestGap, start.distanceTo(previousEnd));
    previousEnd = end;
    vertices(plank, (point) => {
      const onMain = edgeClearance(point.x, point.z, mainOutline) > 0;
      const local = court.object.worldToLocal(point.clone());
      const onCourt = edgeClearance(local.x, local.z, courtOutline) > 0;
      if ((onMain || onCourt) && point.y < shoreClearance) {
        shoreClearance = point.y;
        shorePart = plank.name;
      }
    });
  }
  for (const foot of meshes(bridge.object).filter(
    (part) => part.name === "bridge-post-footing",
  )) {
    const localCenter = court.object.worldToLocal(
      foot.getWorldPosition(new THREE.Vector3()),
    );
    const onCourt =
      edgeClearance(localCenter.x, localCenter.z, courtOutline) > 0;
    vertices(foot, (point) => {
      if (onCourt) court.object.worldToLocal(point);
      const clearance = edgeClearance(
        point.x,
        point.z,
        onCourt ? courtOutline : mainOutline,
      );
      if (clearance < nearestFooting) {
        nearestFooting = clearance;
        footingPart = `${foot.name} at ${foot.position.toArray()}`;
      }
    });
  }
  expect(largestGap).toBeLessThan(0.045);
  expect(shoreClearance, shorePart).toBeGreaterThan(0.02);
  expect(nearestFooting, footingPart).toBeGreaterThan(0.03);
});

test("the road-aligned food bridge leaves the trees, path lamp and anime platform clear", () => {
  const { scene, bridge } = foodScene();
  // Keep the existing garden landmarks in place around the road's east entrance.
  const landmarks = [
    { name: "sakura planter", x: 5.6, z: 1.26, radius: 0.34, top: 0.11 },
    { name: "orange planter", x: 5.47, z: -0.79, radius: 0.27, top: 0.11 },
    { name: "path lamp", x: 4.87, z: 0.14, radius: 0.18, top: 0.95 },
  ];
  const clearances = landmarks.map(() => Infinity);
  // A conservative envelope includes both foliage lobes and their fruit.
  const orangeCrown = new THREE.Box3(
    new THREE.Vector3(5.11, 0.45, -1.08),
    new THREE.Vector3(5.82, 1.33, -0.46),
  );
  const animePlatform = new THREE.Mesh(
    new THREE.BoxGeometry(4, 0.19, 2.62),
    new THREE.MeshBasicMaterial(),
  );
  animePlatform.position.set(2.95, 0.1, 1.8);
  animePlatform.castShadow = true;
  scene.add(animePlatform);
  const pathLamp = new THREE.Mesh(
    new THREE.CylinderGeometry(0.18, 0.18, 0.94),
    new THREE.MeshBasicMaterial(),
  );
  pathLamp.position.set(4.87, 0.48, 0.14);
  pathLamp.castShadow = true;
  scene.add(pathLamp);
  scene.updateMatrixWorld(true);
  const platformBounds = new THREE.Box3().setFromObject(animePlatform);
  let crownClearance = Infinity,
    platformClearance = Infinity;
  for (const part of meshes(bridge.object)) {
    vertices(part, (point) => {
      landmarks.forEach((landmark, index) => {
        if (point.y <= landmark.top)
          clearances[index] = Math.min(
            clearances[index],
            Math.hypot(point.x - landmark.x, point.z - landmark.z) -
              landmark.radius,
          );
      });
      crownClearance = Math.min(
        crownClearance,
        orangeCrown.distanceToPoint(point),
      );
      platformClearance = Math.min(
        platformClearance,
        platformBounds.distanceToPoint(point),
      );
    });
  }
  landmarks.forEach((landmark, index) =>
    expect(clearances[index], landmark.name).toBeGreaterThan(0.1),
  );
  expect(crownClearance, "orange crown").toBeGreaterThan(0.1);
  expect(platformClearance).toBeGreaterThan(0.1);
  const scenery = createSceneryLayout(
    mainOutline.map((point) => ({ x: point.x, z: point.y })),
    [],
  );
  scenery.reserve(animePlatform);
  scenery.reserve(bridge.object);
  scenery.reserve(pathLamp);
  for (const { name, x, z, radius } of landmarks.slice(0, 2)) {
    expect(scenery.findSpot(x, z, radius), name).toEqual({ x, z });
    scenery.addDisc(x, z, radius);
  }
});

test("food bridge and its landing clear paving, stalls, furniture and guests", () => {
  const { court, bridge } = foodScene();
  const obstacles = meshes(court.object)
    .filter((part) => !part.name.startsWith("food-island-"))
    .map((part) => {
      part.geometry.computeBoundingBox();
      return {
        name: part.name,
        bounds: new THREE.Box3().setFromObject(part, true),
        localBounds: part.geometry.boundingBox!,
        inverse: part.matrixWorld.clone().invert(),
      };
    });
  const size = new THREE.Vector3();
  const overlap = new THREE.Box3();
  let deepestPenetration = 0,
    collision = "";
  for (const part of meshes(bridge.object)) {
    const bounds = new THREE.Box3().setFromObject(part, true);
    for (const obstacle of obstacles) {
      overlap.copy(bounds).intersect(obstacle.bounds).getSize(size);
      const volume = size.x * size.y * size.z;
      if (volume <= 0.0000001) continue;
      // A curved rope's global box includes empty space along its whole length.
      // Test its real vertices against each obstacle in that obstacle's frame.
      vertices(part, (point) => {
        point.applyMatrix4(obstacle.inverse);
        const box = obstacle.localBounds;
        if (!box.containsPoint(point)) return;
        const penetration = Math.min(
          point.x - box.min.x,
          box.max.x - point.x,
          point.y - box.min.y,
          box.max.y - point.y,
          point.z - box.min.z,
          box.max.z - point.z,
        );
        if (penetration > deepestPenetration) {
          deepestPenetration = penetration;
          collision = `${part.name} / ${obstacle.name}`;
        }
      });
    }
  }
  expect(deepestPenetration, collision).toBeLessThan(0.001);
});

test("dining and talking gestures keep friends clear of stalls and hands above the table", () => {
  const { scene, court, friends } = foodScene();
  const stalls = court.object.children
    .filter((part) => part.name.startsWith("food-stall-"))
    .map((part) => ({
      name: part.name,
      bounds: new THREE.Box3().setFromObject(part, true),
    }));
  const table = friends.object.getObjectByName("food-court-table-top")!;
  const tableTop = new THREE.Box3().setFromObject(table, true).max.y;
  const tableCenter = table.getWorldPosition(new THREE.Vector3());
  const characters = friends.object.children.filter((part) =>
    /^food-court-friend-\d+$/.test(part.name),
  );
  expect(characters).toHaveLength(5);
  expect(
    characters.filter((part) => part.userData.pose === "seated"),
  ).toHaveLength(3);
  let nearestStall = Infinity,
    lowestHand = Infinity,
    closestPair = "";
  const bounds = new THREE.Box3();
  for (let elapsed = 0; elapsed <= 32; elapsed += 0.2) {
    friends.update(elapsed);
    scene.updateMatrixWorld(true);
    for (const character of characters) {
      bounds.setFromObject(character, true);
      expect(bounds.min.y, `${character.name} feet`).toBeGreaterThanOrEqual(
        0.0199,
      );
      expect(bounds.max.y, `${character.name} height`).toBeLessThan(0.95);
      for (const stall of stalls) {
        const distance = Math.hypot(
          Math.max(
            0,
            bounds.min.x - stall.bounds.max.x,
            stall.bounds.min.x - bounds.max.x,
          ),
          Math.max(
            0,
            bounds.min.z - stall.bounds.max.z,
            stall.bounds.min.z - bounds.max.z,
          ),
        );
        if (distance < nearestStall) {
          nearestStall = distance;
          closestPair = `${character.name} / ${stall.name} at ${elapsed.toFixed(1)}s`;
        }
      }
      if (character.userData.pose !== "seated") continue;
      for (const hand of meshes(character).filter((part) =>
        part.name.includes("-hand-"),
      ))
        vertices(hand, (point) => {
          if (
            Math.hypot(point.x - tableCenter.x, point.z - tableCenter.z) < 0.37
          )
            lowestHand = Math.min(lowestHand, point.y);
        });
    }
  }
  expect(nearestStall, closestPair).toBeGreaterThan(0.15);
  expect(lowestHand - tableTop).toBeGreaterThanOrEqual(-0.001);
});

test("friend animation is deterministic, pauses on fixed elapsed time and reuses scene resources", () => {
  const { scene, friends } = foodScene();
  const resources = () => {
    const entries: unknown[] = [];
    friends.object.traverse((part) => {
      entries.push(part);
      if (part instanceof THREE.Mesh || part instanceof THREE.Line) {
        entries.push(
          part.geometry,
          part.geometry.getAttribute("position").array,
          part.material,
        );
      }
    });
    return entries;
  };
  const transforms = () => {
    scene.updateMatrixWorld(true);
    const values: number[] = [];
    friends.object.traverse((part) =>
      values.push(...part.matrixWorld.elements),
    );
    return values;
  };
  const originalResources = resources();
  friends.update(7.25);
  const first = transforms();
  friends.update(11.8);
  expect(transforms()).not.toEqual(first);
  friends.update(7.25);
  expect(transforms()).toEqual(first);
  for (let frame = 0; frame < 120; frame++) friends.update(7.25);
  expect(transforms()).toEqual(first);
  const finalResources = resources();
  expect(finalResources).toHaveLength(originalResources.length);
  finalResources.forEach((resource, index) =>
    expect(resource).toBe(originalResources[index]),
  );
});

test("standing friends welcome the mascot with grounded feet and a clear waving hand", () => {
  const { scene, court, friends } = foodScene();
  const visitors = [4, 5].map((index) =>
    friends.object.getObjectByName(`food-court-friend-${index}`)!,
  );
  const shoes = visitors.flatMap((friend) =>
    meshes(friend).filter((part) => part.name.includes("-shoe-")),
  );
  const plantedFeet = shoes.map((shoe) => shoe.matrixWorld.elements.slice());
  const visitPosition = [0.68, 0.5, 1.02] as const;
  const target = court.object.localToWorld(new THREE.Vector3(...visitPosition));
  const facing = new THREE.Vector3();
  const direction = new THREE.Vector3();
  const headInverse = new THREE.Matrix4();
  const faceOverlaps = new Set<string>();
  let highestWave = 0;

  for (let time = 0; time <= 14; time += 0.1) {
    friends.update(90 + time, {
      position: visitPosition,
      amount: 1,
      time,
    });
    scene.updateMatrixWorld(true);
    shoes.forEach((shoe, index) =>
      expect(shoe.matrixWorld.elements, "feet stay planted").toEqual(
        plantedFeet[index],
      ),
    );
    for (const friend of visitors) {
      const head = friend.getObjectByName(`${friend.name}-head`)!;
      facing
        .set(0, 0, 1)
        .transformDirection(head.matrixWorld)
        .setY(0)
        .normalize();
      direction.copy(target).sub(head.getWorldPosition(new THREE.Vector3()));
      direction.setY(0).normalize();
      expect(
        facing.dot(direction),
        `${friend.name} faces visitor`,
      ).toBeGreaterThan(0.99);
      const cube = head.getObjectByName(`${friend.name}-cube`)! as THREE.Mesh;
      cube.geometry.computeBoundingBox();
      headInverse.copy(cube.matrixWorld).invert();
      for (const part of meshes(friend).filter((mesh) =>
        /-hand-|-drink-/.test(mesh.name),
      ))
        vertices(part, (point) => {
          if (
            cube.geometry.boundingBox!.containsPoint(
              point.applyMatrix4(headInverse),
            )
          )
            faceOverlaps.add(`${part.name} at ${time.toFixed(1)}s`);
        });
    }

    const wavingFriend = visitors[1];
    const hand = wavingFriend.getObjectByName(
      `${wavingFriend.name}-hand-1`,
    )! as THREE.Mesh;
    vertices(hand, (point) => {
      highestWave = Math.max(highestWave, point.y);
    });
  }
  expect(
    [...faceOverlaps],
    "hands and drinks clear the friends' faces",
  ).toEqual([]);
  expect(
    highestWave,
    "welcome raises the empty hand beside the head",
  ).toBeGreaterThan(0.74);

  friends.update(95, { position: visitPosition, amount: 1, time: 5 });
  const pose = visitors.map((friend) => {
    const head = friend.getObjectByName(`${friend.name}-head`)!;
    return head.rotation.toArray();
  });
  friends.update(100);
  friends.update(95, { position: visitPosition, amount: 1, time: 5 });
  expect(
    visitors.map((friend) =>
      friend.getObjectByName(`${friend.name}-head`)!.rotation.toArray(),
    ),
  ).toEqual(pose);
  friends.update(95, { position: visitPosition, amount: 0, time: 5 });
  for (const friend of visitors)
    expect(
      friend.getObjectByName(`${friend.name}-upper-body`)!.rotation.y,
    ).toBe(0);
});
