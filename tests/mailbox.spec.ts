import { expect, test } from "@playwright/test";
import * as THREE from "three";
import { createMailbox } from "../src/world/mailbox";
import {
  createResident,
  RESIDENT_ROUTE,
  sampleResident,
} from "../src/world/resident";
import {
  CLOSED_MAIL,
  MAIL_CHECK_SECONDS,
  MAIL_LOCATION,
  STOOL_LAYOUT,
  mailToWorld,
  sampleMailCheck,
} from "../src/world/mailRoutine";

function scene() {
  const world = new THREE.Group();
  const post = new THREE.Group();
  post.position.set(MAIL_LOCATION[0], 0, MAIL_LOCATION[2]);
  world.add(post);
  return {
    world,
    mailbox: createMailbox(post),
    resident: createResident(world),
  };
}

function mailShellDistance(point: THREE.Vector3) {
  const profileDistance = (
    halfWidth: number,
    halfHeight: number,
    radius: number,
  ) => {
    const x = Math.abs(point.x) - halfWidth + radius;
    const y = Math.abs(point.y) - halfHeight + radius;
    return (
      Math.hypot(Math.max(x, 0), Math.max(y, 0)) +
      Math.min(Math.max(x, y), 0) -
      radius
    );
  };
  // The smallest opening is used throughout the depth, conservatively covering
  // the bevelled mouth. The rear cap is a separate solid obstacle.
  const ring = Math.max(
    profileDistance(0.365, 0.25, 0.08),
    -profileDistance(0.32, 0.2, 0.035),
  );
  const end = Math.abs(point.z) - 0.27;
  return (
    Math.hypot(Math.max(ring, 0), Math.max(end, 0)) +
    Math.min(Math.max(ring, end), 0)
  );
}

test("mailbox shell collision profile keeps the cavity open and detects curved corner walls", () => {
  const distance = (x: number, y: number, z: number) =>
    mailShellDistance(new THREE.Vector3(x, y, z));
  expect(
    distance(0.08, 0, 0.2),
    "stored letter is inside the empty cavity",
  ).toBeGreaterThan(0);
  expect(
    distance(0.25, -0.045, 0.22),
    "paper grip is inside the opening",
  ).toBeGreaterThan(0);
  expect(distance(0.34, 0, 0), "straight side wall is solid").toBeLessThan(
    -0.006,
  );
  expect(
    distance(0.315, 0.195, 0),
    "inner corner arc is solid despite lying inside the rectangular opening bounds",
  ).toBeLessThan(-0.006);
  expect(
    distance(0.36, 0.245, 0),
    "outer corner is rounded away",
  ).toBeGreaterThan(0);
  expect(
    distance(0.34, 0, 0.28),
    "shell ends before the door plane",
  ).toBeGreaterThan(0);
});

test("the flag stands clear of the case and is supported by an external pivot", () => {
  const { mailbox } = scene();
  const localBounds = (name: string) => {
    const part = mailbox.object.getObjectByName(name) as THREE.Mesh;
    part.updateMatrix();
    part.geometry.computeBoundingBox();
    return part.geometry.boundingBox!.clone().applyMatrix4(part.matrix);
  };
  const shell = localBounds("mail-case-shell");
  const stem = localBounds("mail-flag-stem");
  const flag = localBounds("mail-flag");
  const mount = localBounds("mail-flag-mount");
  expect(stem.min.x - shell.max.x).toBeGreaterThan(0.02);
  expect(flag.min.x - shell.max.x).toBeGreaterThan(0.02);
  expect(mount.min.x).toBeCloseTo(shell.max.x, 5);
  expect(mount.intersectsBox(stem)).toBe(true);
});

test("mail check has one synchronized dwell, a clear extraction path, and a closed door before departure", () => {
  const checks = RESIDENT_ROUTE.filter(
    (leg) => leg.activity === "checking-mail",
  );
  expect(checks).toHaveLength(1);
  expect(checks[0].duration).toBe(MAIL_CHECK_SECONDS);
  for (const leg of RESIDENT_ROUTE) {
    const sample = sampleResident(leg.start + leg.duration / 2);
    if (leg.activity !== "checking-mail")
      expect(sample.mail).toEqual(CLOSED_MAIL);
  }
  for (let time = 0; time <= MAIL_CHECK_SECONDS; time += 0.025) {
    const state = sampleMailCheck(time);
    if (state.letter > 0) expect(state.door).toBe(1);
    if (Math.abs(state.letterPosition[0] - 0.08) > 0.001) {
      expect(state.letterPosition[2]).toBeGreaterThan(0.59);
    }
  }
  expect(sampleMailCheck(MAIL_CHECK_SECONDS)).toEqual(CLOSED_MAIL);
});

test("hands hold the actual envelope and mailbox motion freezes at the same elapsed time", () => {
  const { world, mailbox, resident } = scene();
  const check = RESIDENT_ROUTE.find((leg) => leg.activity === "checking-mail")!;
  for (const offset of [2.1, 2.6, 3.4, 4.5, 5.1, 5.9]) {
    const sample = resident.update(check.start + offset);
    mailbox.update(sample.mail);
    world.updateMatrixWorld(true);
    for (const side of ["left", "right"] as const) {
      const reach =
        side === "left" ? sample.mail.leftReach : sample.mail.rightReach;
      if (reach !== 1) continue;
      const target =
        side === "left" ? sample.mail.leftHand : sample.mail.rightHand;
      const hand = world.getObjectByName(`resident-hand-${side}`)!;
      expect(
        hand
          .getWorldPosition(new THREE.Vector3())
          .distanceTo(new THREE.Vector3(...mailToWorld(target))),
      ).toBeLessThan(0.000001);
    }
    for (const side of ["left", "right"]) {
      const shoe = world.getObjectByName(`resident-shoe-${side}`)!;
      const bottom = new THREE.Box3().setFromObject(shoe).min.y;
      expect(bottom).toBeGreaterThanOrEqual(STOOL_LAYOUT.top);
      expect(bottom - STOOL_LAYOUT.top).toBeLessThan(0.012);
    }
  }
  const frozenTime = check.start + 4;
  const update = () => {
    const sample = resident.update(frozenTime);
    mailbox.update(sample.mail);
    world.updateMatrixWorld(true);
    const result: number[][] = [];
    world.traverse((object) => result.push([...object.matrixWorld.elements]));
    return result;
  };
  expect(update()).toEqual(update());
});

test("the envelope and resident clear the hollow case, tray, flag, and moving door panel", () => {
  const { world, mailbox, resident } = scene();
  const check = RESIDENT_ROUTE.find((leg) => leg.activity === "checking-mail")!;
  const obstacles: THREE.Mesh[] = [];
  mailbox.object.traverse((part) => {
    if (
      part instanceof THREE.Mesh &&
      (part.name.startsWith("mail-case-") ||
        part.name.startsWith("mail-flag") ||
        ["mail-tray", "mail-door-panel"].includes(part.name))
    )
      obstacles.push(part);
  });
  expect(obstacles.some((part) => part.name === "mail-case-shell")).toBe(true);
  expect(obstacles.some((part) => part.name === "mail-case-back")).toBe(true);
  const actors = resident.object.children[0].children.filter(
    (part): part is THREE.Mesh => part instanceof THREE.Mesh,
  );
  mailbox.letter.traverse((part) => {
    if (part instanceof THREE.Mesh) actors.push(part);
  });
  const geometrySamples = new Map<THREE.BufferGeometry, THREE.Vector3[]>();
  for (const part of actors) {
    if (geometrySamples.has(part.geometry)) continue;
    const positions = part.geometry.attributes.position;
    const index = part.geometry.index;
    const points = Array.from({ length: positions.count }, (_, vertex) =>
      new THREE.Vector3().fromBufferAttribute(positions, vertex),
    );
    for (
      let vertex = 0;
      vertex < (index?.count ?? positions.count);
      vertex += 3
    ) {
      const a = index ? index.getX(vertex) : vertex;
      const b = index ? index.getX(vertex + 1) : vertex + 1;
      const c = index ? index.getX(vertex + 2) : vertex + 2;
      points.push(
        points[a]
          .clone()
          .add(points[b])
          .add(points[c])
          .multiplyScalar(1 / 3),
      );
    }
    geometrySamples.set(part.geometry, points);
  }
  const point = new THREE.Vector3();
  const inverse = new THREE.Matrix4();
  const body = world.getObjectByName("resident-body")!;
  const bodyInverse = new THREE.Matrix4();
  const bodyDelta = new THREE.Vector3();
  let deepest = 0;
  let collision = "";
  for (let time = 0; time <= MAIL_CHECK_SECONDS; time += 0.025) {
    const sample = resident.update(check.start + time);
    mailbox.update(sample.mail);
    world.updateMatrixWorld(true);
    bodyInverse.copy(body.matrixWorld).invert();
    for (const actor of actors) {
      if (
        !actor.name.startsWith("mail-envelope-") &&
        !actor.name.startsWith("resident-hand-") &&
        !actor.name.startsWith("resident-forearm-")
      )
        continue;
      for (const vertex of geometrySamples.get(actor.geometry)!) {
        point
          .copy(vertex)
          .applyMatrix4(actor.matrixWorld)
          .applyMatrix4(bodyInverse);
        bodyDelta.set(
          Math.abs(point.x) - 0.17,
          Math.abs(point.y) - 0.19,
          Math.abs(point.z) - 0.15,
        );
        const depth =
          0.095 -
          Math.hypot(
            Math.max(bodyDelta.x, 0),
            Math.max(bodyDelta.y, 0),
            Math.max(bodyDelta.z, 0),
          ) -
          Math.min(Math.max(bodyDelta.x, bodyDelta.y, bodyDelta.z), 0);
        if (depth > deepest) {
          deepest = depth;
          collision = `${actor.name} / resident body at ${time.toFixed(2)}s`;
        }
      }
    }
    for (const obstacle of obstacles) {
      obstacle.geometry.computeBoundingBox();
      const bounds = obstacle.geometry.boundingBox!;
      inverse.copy(obstacle.matrixWorld).invert();
      for (const actor of actors) {
        for (const vertex of geometrySamples.get(actor.geometry)!) {
          point
            .copy(vertex)
            .applyMatrix4(actor.matrixWorld)
            .applyMatrix4(inverse);
          if (!bounds.containsPoint(point)) continue;
          const depth =
            obstacle.name === "mail-case-shell"
              ? -mailShellDistance(point)
              : Math.min(
                  point.x - bounds.min.x,
                  bounds.max.x - point.x,
                  point.y - bounds.min.y,
                  bounds.max.y - point.y,
                  point.z - bounds.min.z,
                  bounds.max.z - point.z,
                );
          if (depth > deepest) {
            deepest = depth;
            collision = `${actor.name || actor.geometry.type} / ${obstacle.name} at ${time.toFixed(2)}s`;
          }
        }
      }
    }
  }
  expect(deepest, collision).toBeLessThan(0.006);
});
