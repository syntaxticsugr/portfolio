import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";

type Point = [number, number, number];

export type FoodCourtVisit = {
  /** Visiting mascot's body center in the food island's local coordinates. */
  position: readonly [number, number, number];
  amount: number;
  time: number;
};

/** A little shared dinner, in the food island's local coordinates. */
export function createFoodCourtFriends(parent: THREE.Object3D) {
  const object = new THREE.Group();
  object.name = "food-court-friends";
  parent.add(object);

  const material = (color: string, roughness = 0.78) =>
    new THREE.MeshStandardMaterial({ color, roughness });
  const cream = material("#fff9eb");
  const ink = material("#36384a");
  const cheek = material("#e5ac94");
  const wood = material("#b58a60");
  const woodTop = material("#d8b989");
  const shoes = material("#485dca");
  const ceramic = material("#f3ead7", 0.5);
  const tea = material("#946848", 0.55);
  const leaf = material("#73915a");
  const shirts = ["#e98c74", "#bca8df", "#80bcb0", "#e5b65c", "#d697ad"].map(
    (color) => material(color),
  );
  const sphere = new THREE.SphereGeometry(1, 10, 8);
  const cylinder = new THREE.CylinderGeometry(1, 1, 1, 12);
  const headGeometry = new RoundedBoxGeometry(0.38, 0.4, 0.34, 3, 0.075);
  const shirtGeometry = new RoundedBoxGeometry(0.36, 0.14, 0.3, 2, 0.04);
  const shoeGeometry = new RoundedBoxGeometry(0.12, 0.11, 0.2, 2, 0.035);
  const smileGeometry = new THREE.BufferGeometry().setFromPoints(
    new THREE.EllipseCurve(0, 0, 0.038, 0.026, Math.PI, Math.PI * 2, false, 0)
      .getPoints(12)
      .map((point) => new THREE.Vector3(point.x, point.y - 0.035, 0.174)),
  );
  const smileMaterial = new THREE.LineBasicMaterial({ color: "#36384a" });
  const rodAxis = new THREE.Vector3(0, 1, 0);

  function mesh(
    into: THREE.Object3D,
    name: string,
    geometry: THREE.BufferGeometry,
    finish: THREE.Material,
    position: Point,
    scale?: Point,
  ) {
    const part = new THREE.Mesh(geometry, finish);
    part.name = name;
    part.position.set(...position);
    if (scale) part.scale.set(...scale);
    part.castShadow = true;
    part.receiveShadow = true;
    into.add(part);
    return part;
  }

  function rod(
    into: THREE.Object3D,
    name: string,
    start: Point,
    end: Point,
    radius: number,
    finish: THREE.Material,
  ) {
    const a = new THREE.Vector3(...start);
    const b = new THREE.Vector3(...end);
    const direction = b.clone().sub(a);
    const part = mesh(into, name, cylinder, finish, [0, 0, 0]);
    part.position.copy(a).add(b).multiplyScalar(0.5);
    part.scale.set(radius, direction.length(), radius);
    part.quaternion.setFromUnitVectors(rodAxis, direction.normalize());
    return part;
  }

  const cupGeometry = new THREE.CylinderGeometry(0.052, 0.039, 0.12, 12);
  const lidGeometry = new THREE.CylinderGeometry(0.055, 0.055, 0.012, 12);
  function cup(
    into: THREE.Object3D,
    name: string,
    position: Point,
    color: THREE.Material,
  ) {
    const drink = new THREE.Group();
    drink.name = name;
    drink.position.set(...position);
    into.add(drink);
    mesh(drink, `${name}-cup`, cupGeometry, color, [0, 0, 0]);
    mesh(drink, `${name}-lid`, lidGeometry, ceramic, [0, 0.062, 0]);
    rod(
      drink,
      `${name}-straw`,
      [0.012, 0.063, 0],
      [0.021, 0.135, 0],
      0.006,
      shoes,
    );
    return drink;
  }

  // The tabletop and the stools share a real ground plane at y = .02.
  const table = new THREE.Group();
  table.name = "food-court-shared-table";
  table.position.set(-0.8, 0, 0.7);
  object.add(table);
  mesh(
    table,
    "food-court-table-top",
    cylinder,
    woodTop,
    [0, 0.5525, 0],
    [0.37, 0.055, 0.37],
  );
  rod(
    table,
    "food-court-table-pedestal",
    [0, 0.095, 0],
    [0, 0.5275, 0],
    0.06,
    wood,
  );
  for (let index = 0; index < 3; index++) {
    const angle = (index * Math.PI * 2) / 3;
    rod(
      table,
      `food-court-table-foot-${index}`,
      [0, 0.125, 0],
      [Math.cos(angle) * 0.23, 0.05, Math.sin(angle) * 0.23],
      0.03,
      wood,
    );
  }
  const grainMaterial = new THREE.LineBasicMaterial({ color: "#a98258" });
  for (const z of [-0.115, 0.115]) {
    const halfLength = Math.sqrt(0.36 ** 2 - z ** 2);
    const grain = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(-halfLength, 0.5805, z),
        new THREE.Vector3(halfLength, 0.5805, z),
      ]),
      grainMaterial,
    );
    grain.name = "food-court-table-plank-seam";
    table.add(grain);
  }

  // An open ceramic bowl, noodles, and a shared plate of dumplings.
  const bowlGeometry = new THREE.LatheGeometry(
    [
      [0, 0],
      [0.039, 0],
      [0.055, 0.017],
      [0.067, 0.051],
      [0.059, 0.054],
      [0.048, 0.023],
      [0.032, 0.012],
      [0, 0.012],
    ].map(([x, y]) => new THREE.Vector2(x, y)),
    16,
  );
  mesh(
    table,
    "food-court-noodle-bowl",
    bowlGeometry,
    ceramic,
    [-0.105, 0.581, -0.055],
  );
  mesh(
    table,
    "food-court-bowl-broth",
    cylinder,
    tea,
    [-0.105, 0.615, -0.055],
    [0.052, 0.003, 0.052],
  );
  const noodlePoints = Array.from({ length: 30 }, (_, index) => {
    const phase = index * 0.66;
    const radius = 0.035 * (1 - index / 40);
    return new THREE.Vector3(
      -0.105 + Math.cos(phase) * radius,
      0.62 + Math.sin(index * 0.9) * 0.001,
      -0.055 + Math.sin(phase) * radius,
    );
  });
  mesh(
    table,
    "food-court-noodles",
    new THREE.TubeGeometry(
      new THREE.CatmullRomCurve3(noodlePoints),
      32,
      0.004,
      4,
      false,
    ),
    cream,
    [0, 0, 0],
  );
  rod(
    table,
    "food-court-bowl-chopstick-a",
    [-0.19, 0.638, -0.095],
    [-0.025, 0.638, -0.025],
    0.0035,
    wood,
  );
  rod(
    table,
    "food-court-bowl-chopstick-b",
    [-0.19, 0.642, -0.081],
    [-0.025, 0.642, -0.011],
    0.0035,
    wood,
  );
  mesh(
    table,
    "food-court-sharing-plate",
    cylinder,
    ceramic,
    [0.085, 0.59, 0.07],
    [0.105, 0.018, 0.09],
  );
  for (let index = 0; index < 3; index++) {
    const dumpling = mesh(
      table,
      `food-court-dumpling-${index}`,
      sphere,
      cream,
      [0.04 + index * 0.044, 0.619, 0.07 + (index % 2) * 0.025],
      [0.024, 0.02, 0.036],
    );
    dumpling.rotation.y = -0.3 + index * 0.3;
  }
  mesh(
    table,
    "food-court-plate-garnish",
    sphere,
    leaf,
    [0.096, 0.607, 0.018],
    [0.035, 0.006, 0.014],
  );
  cup(table, "food-court-table-drink", [-0.015, 0.642, -0.235], shirts[2]);

  type FriendMotion = {
    figure: THREE.Group;
    upperBody: THREE.Group;
    facing: number;
    seated: boolean;
    head: THREE.Group;
    eyes: THREE.Mesh[];
    arm: THREE.Group;
    phase: number;
    gesture: "drink" | "talk" | "still";
  };
  const motions: FriendMotion[] = [];

  function friend(
    index: number,
    position: Point,
    facing: number,
    seated: boolean,
    gesture: FriendMotion["gesture"],
  ) {
    const name = `food-court-friend-${index + 1}`;
    const figure = new THREE.Group();
    figure.name = name;
    figure.position.set(...position);
    figure.rotation.y = facing;
    figure.userData.pose = seated ? "seated" : "standing";
    object.add(figure);

    if (seated) {
      mesh(
        figure,
        `${name}-stool-seat`,
        cylinder,
        woodTop,
        [0, 0.32, 0],
        [0.205, 0.08, 0.205],
      );
      for (let leg = 0; leg < 3; leg++) {
        const angle = Math.PI / 6 + (leg * Math.PI * 2) / 3;
        const x = Math.cos(angle) * 0.125;
        const z = Math.sin(angle) * 0.125;
        rod(
          figure,
          `${name}-stool-leg-${leg}`,
          [x, 0.02, z],
          [x, 0.28, z],
          0.027,
          wood,
        );
      }
    }

    // A torso turn leaves the shoes and planted legs in the same place.
    const upperBody = new THREE.Group();
    upperBody.name = `${name}-upper-body`;
    figure.add(upperBody);
    mesh(
      upperBody,
      `${name}-shirt`,
      shirtGeometry,
      shirts[index],
      [0, 0.43, 0],
    );
    const head = new THREE.Group();
    head.name = `${name}-head`;
    head.position.y = 0.65;
    upperBody.add(head);
    mesh(head, `${name}-cube`, headGeometry, cream, [0, 0, 0]);
    const eyes = [-1, 1].map((side) =>
      mesh(
        head,
        `${name}-eye-${side}`,
        sphere,
        ink,
        [side * 0.084, 0.035, 0.173],
        [0.023, 0.026, 0.008],
      ),
    );
    for (const side of [-1, 1]) {
      mesh(
        head,
        `${name}-cheek-${side}`,
        sphere,
        cheek,
        [side * 0.133, -0.029, 0.171],
        [0.025, 0.01, 0.006],
      );
      const footZ = seated ? 0.29 : 0.04;
      mesh(figure, `${name}-shoe-${side}`, shoeGeometry, shoes, [
        side * 0.095,
        0.075,
        footZ,
      ]);
      if (seated) {
        rod(
          figure,
          `${name}-thigh-${side}`,
          [side * 0.095, 0.385, 0.045],
          [side * 0.095, 0.305, 0.24],
          0.033,
          shirts[index],
        );
        rod(
          figure,
          `${name}-shin-${side}`,
          [side * 0.095, 0.305, 0.24],
          [side * 0.095, 0.12, 0.26],
          0.026,
          cream,
        );
      } else {
        rod(
          figure,
          `${name}-leg-${side}`,
          [side * 0.095, 0.375, 0],
          [side * 0.095, 0.12, 0.015],
          0.034,
          cream,
        );
      }
    }
    const smile = new THREE.Line(smileGeometry, smileMaterial);
    smile.name = `${name}-smile`;
    head.add(smile);

    let movingArm: THREE.Group | undefined;
    for (const side of [-1, 1]) {
      const shoulder: Point = [side * 0.18, 0.545, 0];
      const isMoving = side === 1;
      const elbow: Point = seated
        ? [side * 0.235, 0.53, 0.17]
        : [
            side * (isMoving && gesture === "talk" ? 0.28 : 0.255),
            0.445,
            0.085,
          ];
      const hand: Point = seated
        ? [side * 0.16, 0.625, 0.39]
        : isMoving
          ? [side * (gesture === "talk" ? 0.255 : 0.19), 0.555, 0.21]
          : [side * 0.235, 0.38, 0.06];
      const arm = new THREE.Group();
      arm.name = `${name}-arm-${side}`;
      arm.position.set(...shoulder);
      upperBody.add(arm);
      const relative = (point: Point): Point => [
        point[0] - shoulder[0],
        point[1] - shoulder[1],
        point[2] - shoulder[2],
      ];
      rod(
        arm,
        `${name}-upper-arm-${side}`,
        [0, 0, 0],
        relative(elbow),
        0.028,
        cream,
      );
      rod(
        arm,
        `${name}-forearm-${side}`,
        relative(elbow),
        relative(hand),
        0.025,
        cream,
      );
      mesh(
        arm,
        `${name}-hand-${side}`,
        sphere,
        cream,
        relative(hand),
        [0.041, 0.041, 0.041],
      );
      if (isMoving) {
        movingArm = arm;
        if (gesture === "drink") {
          const drinkPosition: Point = [
            hand[0] + 0.058,
            hand[1] + 0.049,
            hand[2],
          ];
          cup(arm, `${name}-drink`, relative(drinkPosition), shirts[index]);
        }
      }
    }
    motions.push({
      figure,
      upperBody,
      facing,
      seated,
      head,
      eyes,
      arm: movingArm!,
      phase: index * 1.43,
      gesture,
    });
    return figure;
  }

  for (let index = 0; index < 3; index++) {
    const angle = Math.PI / 2 + (index * Math.PI * 2) / 3;
    const x = -0.8 + Math.cos(angle) * 0.72;
    const z = 0.7 + Math.sin(angle) * 0.72;
    friend(
      index,
      [x, 0, z],
      Math.atan2(-0.8 - x, 0.7 - z),
      true,
      index === 1 ? "drink" : "still",
    );
  }
  // A gentle three-quarter turn keeps both expressions visible as they chat.
  friend(3, [0.55, 0, 1.85], Math.PI / 2 - 0.3, false, "drink");
  friend(4, [1.2, 0, 1.8], -Math.PI / 2 + 0.42, false, "talk");

  function update(elapsed: number, visit?: FoodCourtVisit) {
    const welcome = THREE.MathUtils.clamp(visit?.amount ?? 0, 0, 1);
    for (const {
      figure,
      upperBody,
      facing,
      seated,
      head,
      eyes,
      arm,
      phase,
      gesture,
    } of motions) {
      const time = elapsed + phase;
      head.rotation.set(
        Math.sin(time * 0.83) * 0.023,
        Math.sin(time * 0.47) * 0.06,
        Math.sin(time * 0.64) * 0.032,
      );
      const blinkPhase = time % 5.4;
      const blink =
        blinkPhase < 0.14 ? 0.16 + Math.abs(blinkPhase / 0.07 - 1) * 0.84 : 1;
      for (const eye of eyes) eye.scale.y = 0.026 * blink;
      // Lift from the resting pose, so seated hands never dip through the table.
      arm.rotation.x =
        gesture === "drink"
          ? -0.12 * (0.5 + Math.sin(time * 0.58) * 0.5)
          : gesture === "talk"
            ? -0.1 - Math.sin(time * 1.1) * 0.08
            : 0;
      arm.rotation.z = gesture === "talk" ? Math.sin(time * 0.8) * 0.06 : 0;
      upperBody.rotation.y = 0;

      if (!seated && visit && welcome > 0) {
        const dx = visit.position[0] - figure.position.x;
        const dz = visit.position[2] - figure.position.z;
        const turn = Math.atan2(dx, dz) - facing;
        const shortestTurn = Math.atan2(Math.sin(turn), Math.cos(turn));
        upperBody.rotation.y = shortestTurn * 0.68 * welcome;
        head.rotation.y += shortestTurn * 0.32 * welcome;
        // Alternate little nods while the visitor talks; keep the cup in hand.
        head.rotation.x += Math.sin(visit.time * 2.1 + phase) * 0.045 * welcome;
        head.rotation.z += Math.sin(visit.time * 0.8 + phase) * 0.035 * welcome;

        if (gesture === "talk") {
          const waveIn = THREE.MathUtils.smoothstep(visit.time, 0.15, 0.65);
          const waveOut = 1 - THREE.MathUtils.smoothstep(visit.time, 2.4, 3.1);
          const wave = waveIn * waveOut * welcome;
          // The empty hand stays outside the cheek as it rises beside the head.
          arm.rotation.x = THREE.MathUtils.lerp(arm.rotation.x, -1.2, wave);
          arm.rotation.z = THREE.MathUtils.lerp(
            arm.rotation.z,
            -0.65 + Math.sin(visit.time * 7.5) * 0.08,
            wave,
          );
        }
      }
    }
  }

  update(0);
  return { object, update };
}
