import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { createBridgePath, FOOD_COURT_BRIDGE_OPTIONS } from "./bridge";
import { FOOD_COURT_LOCATION, FOOD_COURT_ROTATION } from "./foodCourt";
import {
  CLOSED_MAIL,
  MAIL_APPROACH,
  MAIL_CHECK_SECONDS,
  MAIL_STOP,
  STOOL_LAYOUT,
  mailToWorld,
  sampleMailCheck,
} from "./mailRoutine.ts";
import type { MailCheckState, MailPoint } from "./mailRoutine.ts";

export type ResidentActivity =
  | "strolling"
  | "coding"
  | "resting"
  | "admiring"
  | "listening"
  | "watching"
  | "hanging-out"
  | "checking-mail";
type Point = [number, number, number];
type Pose = {
  position: Point;
  facing: number;
  seated: number;
};
export type ResidentSample = Pose & {
  activity: ResidentActivity;
  activityTime: number;
  walking: number;
  distance: number;
  phase: number;
  interaction: number;
  mounting: number;
  mail: MailCheckState;
};
type RouteLeg = {
  start: number;
  duration: number;
  activity: ResidentActivity;
  from: Pose;
  to: Pose;
  points?: Point[];
  curve?: THREE.Curve<THREE.Vector3>;
  distance: number;
  mount?: {
    lift: number;
    align: number;
    move: number;
    lower: number;
    step: boolean;
    entering: boolean;
  };
};

const standingHeight = 0.5;
const foodBridge = createBridgePath(FOOD_COURT_BRIDGE_OPTIONS);
const foodVisitSeconds = 14;

function foodPoint(point: Point): Point {
  return new THREE.Vector3(...point)
    .applyAxisAngle(THREE.Object3D.DEFAULT_UP, FOOD_COURT_ROTATION)
    .add(new THREE.Vector3(...FOOD_COURT_LOCATION))
    .toArray();
}

class FoodBridgeCurve extends THREE.Curve<THREE.Vector3> {
  constructor(private readonly returning: boolean) {
    super();
  }

  getPoint(t: number, target = new THREE.Vector3()) {
    return target.copy(foodBridge.point(this.returning ? 1 - t : t));
  }
}
const home: Pose = {
  position: [-0.35, standingHeight, 1],
  facing: 0.18,
  seated: 0,
};
const route: RouteLeg[] = [];
let last = home;
let totalTime = 0;
let totalDistance = 0;
const copyPose = (pose: Pose): Pose => ({
  ...pose,
  position: [...pose.position],
});

// Small corner fillets stay inside each path's corridor; a global spline would
// overshoot into the furniture. Points specify the height of the walking surface.
function walkingCurve(points: Point[]) {
  const curve = new THREE.CurvePath<THREE.Vector3>();
  const vertices = points.map(([x, y, z]) => new THREE.Vector3(x, y, z));
  let previous = vertices[0];
  for (let index = 1; index < vertices.length - 1; index++) {
    const point = vertices[index];
    const before = vertices[index - 1];
    const after = vertices[index + 1];
    const cut = Math.min(
      0.16,
      point.distanceTo(before) * 0.22,
      point.distanceTo(after) * 0.22,
    );
    const entrance = point
      .clone()
      .addScaledVector(before.clone().sub(point).normalize(), cut);
    const exit = point
      .clone()
      .addScaledVector(after.clone().sub(point).normalize(), cut);
    curve.add(new THREE.LineCurve3(previous, entrance));
    curve.add(new THREE.QuadraticBezierCurve3(entrance, point, exit));
    previous = exit;
  }
  curve.add(new THREE.LineCurve3(previous, vertices[vertices.length - 1]));
  return curve;
}

function walk(points: Point[], crossing?: THREE.Curve<THREE.Vector3>) {
  const from = copyPose(last);
  const path: Point[] = [
    [from.position[0], from.position[1] - standingHeight, from.position[2]],
    ...points,
  ];
  const curve = crossing ?? walkingCurve(path);
  const length = curve.getLength();
  const end = points[points.length - 1];
  const tangent = curve.getTangent(1);
  const to: Pose = {
    position: [end[0], end[1] + standingHeight, end[2]],
    facing: Math.atan2(tangent.x, tangent.z),
    seated: 0,
  };
  // The short acceleration ramps peak below .8 island units per second.
  const duration = length / 0.67 + 0.28;
  route.push({
    start: totalTime,
    duration,
    activity: "strolling",
    from,
    to,
    points: path,
    curve,
    distance: totalDistance,
  });
  totalTime += duration;
  totalDistance += length;
  last = to;
}

function pose(
  activity: ResidentActivity,
  duration: number,
  to = last,
  step = false,
) {
  let mount: RouteLeg["mount"];
  if (last.seated !== to.seated || step) {
    const entering = step ? to.position[1] > last.position[1] : to.seated === 1;
    const seat = entering ? to : last;
    const approach = entering ? last : to;
    mount = {
      step,
      entering,
      lift: Math.max(
        0.3,
        (seat.position[1] + 0.18 - approach.position[1]) / 0.5,
      ),
      align:
        activity === "coding"
          ? Math.max(
              0.25,
              Math.abs(seat.position[2] - approach.position[2]) / 0.5,
            )
          : 0,
      move: Math.max(
        0.3,
        Math.hypot(
          seat.position[0] - approach.position[0],
          activity === "coding" ? 0 : seat.position[2] - approach.position[2],
        ) / 0.5,
      ),
      lower: 0.36,
    };
    duration = mount.lift + mount.align + mount.move + mount.lower;
  }
  route.push({
    start: totalTime,
    duration,
    activity,
    from: copyPose(last),
    to: copyPose(to),
    distance: totalDistance,
    mount,
  });
  totalTime += duration;
  last = copyPose(to);
}

pose("resting", 1.4);
walk([
  [-1.6, 0, 0.22],
  [-2.45, 0, -0.1],
  [-2.5, 0.085, -0.34],
  [-2.5, 0.175, -0.56],
  [-2.5, 0.31, -0.82],
  [-2.5, 0.31, -0.92],
]);
pose("coding", 1.15, {
  position: [-3.2, 0.985, -1],
  facing: Math.PI,
  seated: 1,
});
pose("coding", 8);
pose("coding", 1.15, {
  position: [-2.5, 0.81, -0.92],
  facing: Math.PI,
  seated: 0,
});
walk([
  [-2.5, 0.31, -0.82],
  [-2.5, 0.175, -0.56],
  [-2.5, 0.085, -0.34],
  [-2.45, 0, -0.1],
  [-1.75, 0, 0.13],
  [-0.9, 0, 0.28],
  [0.05, 0, 0.28],
  [0.15, 0, -0.7],
  [-0.35, 0, -0.8],
]);
pose("resting", 1.1, {
  position: [-0.358, 0.6975, -1.435],
  facing: -0.12,
  seated: 1,
});
pose("resting", 3.5);
pose("resting", 1.1, {
  position: [-0.35, 0.5, -0.8],
  facing: 0,
  seated: 0,
});
walk([
  [0.65, 0, -0.85],
  [0.65, 0, -1.45],
  [0.65, 0, -2.1],
]);
pose("admiring", 0.7, {
  position: [0.65, 0.5, -2.1],
  facing: Math.atan2(1.85, -0.55),
  seated: 0,
});
pose("admiring", 5.5);

// Follow the garden road, step onto the suspension bridge, and join the friends.
// Keep the outbound and return walks on the same clear approach.
const gardenRoad: Point[] = [
  [0.65, 0, -1.45],
  [0.65, 0, -0.9],
  [1.6, 0, -0.65],
  [3.5, 0, -0.65],
  [4.42, 0, -0.65],
  [5.2, 0, -0.27],
  [5.55, 0, -0.12],
  [5.8, 0, -0.25],
  [5.95, 0.13, -0.25],
  foodBridge.point(0).toArray(),
];
const foodApproach: Point[] = [
  [10.8, 0.13, -0.25],
  [11.04, 0, -0.25],
  ...(
    [
      [0, 0, -1.25],
      [0, 0, -0.85],
      [0.5, 0, -0.2],
      [0.8, 0, 0.4],
      [0.68, 0, 1.02],
    ] as Point[]
  ).map(foodPoint),
];
walk(gardenRoad);
walk([foodBridge.point(1).toArray()], new FoodBridgeCurve(false));
walk(foodApproach);
pose("hanging-out", foodVisitSeconds, {
  position: foodPoint([0.68, standingHeight, 1.02]),
  facing: FOOD_COURT_ROTATION + Math.atan2(0.875 - 0.68, 1.825 - 1.02),
  seated: 0,
});
walk([...foodApproach.slice(0, -1).reverse(), foodBridge.point(1).toArray()]);
walk([foodBridge.point(0).toArray()], new FoodBridgeCurve(true));
walk(gardenRoad.slice(0, -1).reverse());

walk([
  [0.65, 0, -0.9],
  [-0.1, 0, 0.45],
  [-0.3, 0, 1.65],
  [-0.4, 0, 3.35],
  [-0.6, 0, 4.15],
  [-2.1, 0, 4.18],
  [-2.13, 0, 4.35],
]);
pose("listening", 1.5, {
  position: [-3.02, 0.655, 4.18],
  facing: Math.PI,
  seated: 1,
});
pose("listening", 5);
pose("listening", 1.5, {
  position: [-2.13, 0.5, 4.35],
  facing: Math.PI / 2,
  seated: 0,
});
walk([
  [-2.1, 0, 4.18],
  [-0.6, 0, 4.15],
  [-0.4, 0, 3.35],
  [MAIL_APPROACH[0], 0, MAIL_APPROACH[2]],
]);
pose("strolling", 1, { ...MAIL_STOP, seated: 0 }, true);
pose("checking-mail", MAIL_CHECK_SECONDS);
pose(
  "strolling",
  1,
  { position: MAIL_APPROACH, facing: MAIL_STOP.facing, seated: 0 },
  true,
);
walk([
  [0.65, 0, 3.35],
  [1.75, 0, 3.35],
  [2.25, 0, 3.68],
  [2.95, 0, 3.68],
  [2.95, 0.16, 3.15],
  [2.95, 0.28, 2.93],
  [2.925, 0.325, 2.45],
]);
pose("watching", 1.25, {
  position: [2.28, 0.965, 2.45],
  facing: Math.PI,
  seated: 1,
});
pose("watching", 6.5);
pose("watching", 1.25, {
  position: [2.925, 0.825, 2.45],
  facing: Math.PI,
  seated: 0,
});
walk([
  [2.95, 0.28, 2.93],
  [2.95, 0.16, 3.15],
  [2.95, 0, 3.68],
  [2.25, 0, 3.68],
  [1.75, 0, 3.35],
  [0.65, 0, 3.35],
  [0.5, 0, 3.48],
  [0.42, 0, 2.5],
  [-0.3, 0, 1.65],
  [-0.35, 0, 1],
]);
pose("resting", 0.8, home);

/** Serializable route data lets geometry checks sample the complete circuit. */
export const RESIDENT_ROUTE = route.map(({ curve: _curve, ...leg }) => leg);
export const RESIDENT_CYCLE_SECONDS = totalTime;

function blend(a: number, b: number, amount: number) {
  return a + (b - a) * amount;
}
function angleBlend(a: number, b: number, amount: number) {
  return a + Math.atan2(Math.sin(b - a), Math.cos(b - a)) * amount;
}
function smooth(amount: number) {
  const u = THREE.MathUtils.clamp(amount, 0, 1);
  return u * u * (3 - 2 * u);
}
function walkingProgress(amount: number) {
  const ramp = 0.12;
  if (amount < ramp) return (amount * amount) / (2 * ramp * (1 - ramp));
  if (amount > 1 - ramp) return 1 - (1 - amount) ** 2 / (2 * ramp * (1 - ramp));
  return (amount - ramp / 2) / (1 - ramp);
}

/** A pure timeline: equal elapsed times always produce equal poses. */
export function sampleResident(elapsed: number): ResidentSample {
  const time = ((elapsed % totalTime) + totalTime) % totalTime;
  const index = route.findIndex((leg) => time < leg.start + leg.duration);
  const leg = route[index < 0 ? route.length - 1 : index];
  const local = time - leg.start;
  const amount = THREE.MathUtils.clamp(local / leg.duration, 0, 1);
  if (leg.curve) {
    const progress = walkingProgress(amount);
    const point = leg.curve.getPoint(progress);
    const tangent = leg.curve.getTangent(progress);
    const facing = angleBlend(
      leg.from.facing,
      Math.atan2(tangent.x, tangent.z),
      smooth(local / 0.3),
    );
    return {
      position: [point.x, point.y + standingHeight, point.z],
      facing,
      seated: 0,
      activity: leg.activity,
      activityTime: local,
      walking: Math.min(1, amount / 0.12, (1 - amount) / 0.12),
      distance: leg.distance + leg.curve.getLength() * progress,
      phase: index,
      interaction: 0,
      mounting: 0,
      mail: CLOSED_MAIL,
    };
  }
  if (leg.mount) {
    const entering = leg.mount.entering;
    const seat = entering ? leg.to : leg.from;
    const approach = entering ? leg.from : leg.to;
    const time = entering ? local : leg.duration - local;
    const lift = smooth(time / leg.mount.lift);
    const move = smooth(
      (time - leg.mount.lift - leg.mount.align) / leg.mount.move,
    );
    const depth = leg.mount.align
      ? smooth((time - leg.mount.lift) / leg.mount.align)
      : move;
    const lower = smooth(
      (time - leg.mount.lift - leg.mount.align - leg.mount.move) /
        leg.mount.lower,
    );
    return {
      position: [
        blend(approach.position[0], seat.position[0], move),
        blend(approach.position[1], seat.position[1] + 0.18, lift) -
          lower * 0.18,
        blend(approach.position[2], seat.position[2], depth),
      ],
      facing: angleBlend(approach.facing, seat.facing, lift),
      seated: leg.mount.step ? 0 : lift,
      activity: leg.activity,
      activityTime: local,
      walking: 0,
      distance: leg.distance,
      phase: index,
      interaction: leg.mount.step ? 0 : lower,
      mounting: leg.mount.step ? 0 : 1 - lower,
      mail: CLOSED_MAIL,
    };
  }
  const ease = smooth(amount);
  return {
    position: leg.from.position.map((value, axis) =>
      blend(value, leg.to.position[axis], ease),
    ) as Point,
    facing: angleBlend(
      leg.from.facing,
      leg.to.facing,
      leg.activity === "hanging-out" ? smooth(local / 0.8) : ease,
    ),
    seated: blend(leg.from.seated, leg.to.seated, ease),
    activity: leg.activity,
    activityTime: local,
    walking: 0,
    distance: leg.distance,
    phase: index,
    interaction:
      leg.activity === "hanging-out"
        ? smooth(local / 0.8) * smooth((leg.duration - local) / 0.8)
        : leg.to.seated,
    mounting: 0,
    mail:
      leg.activity === "checking-mail" ? sampleMailCheck(local) : CLOSED_MAIL,
  };
}

// Shoe support samples the actual stair and deck extents. The small outer ramp
// raises a toe before it reaches a riser, and each leg follows its own shoe.
const walkingSurfaces: {
  x: number;
  z: number;
  width: number;
  depth: number;
  top: number;
  rotation?: number;
}[] = [
  { x: -2.9, z: -2.15, width: 3.36, depth: 2.92, top: 0.31 },
  { x: -2.75, z: -0.52, width: 1.22, depth: 0.48, top: 0.085 },
  { x: -2.75, z: -0.72, width: 1.06, depth: 0.35, top: 0.175 },
  { x: 2.95, z: 1.8, width: 3.8, depth: 2.38, top: 0.325 },
  { x: 2.95, z: 3.15, width: 1.35, depth: 0.42, top: 0.16 },
  { x: 2.95, z: 2.93, width: 1.16, depth: 0.31, top: 0.28 },
  {
    x: STOOL_LAYOUT.position[0],
    z: STOOL_LAYOUT.position[2],
    width: STOOL_LAYOUT.width,
    depth: STOOL_LAYOUT.depth,
    top: STOOL_LAYOUT.top,
    rotation: STOOL_LAYOUT.rotation,
  },
];
function floorHeight(x: number, z: number, surfaces = walkingSurfaces) {
  let height = Math.max(0.02, foodBridge.floorHeight(x, z) ?? 0.02);
  for (const surface of surfaces) {
    const dx = x - surface.x;
    const dz = z - surface.z;
    const cosine = Math.cos(surface.rotation ?? 0);
    const sine = Math.sin(surface.rotation ?? 0);
    const distance = Math.max(
      Math.abs(dx * cosine - dz * sine) - surface.width / 2,
      Math.abs(dx * sine + dz * cosine) - surface.depth / 2,
      0,
    );
    height = Math.max(
      height,
      0.02 + (surface.top - 0.02) * smooth(1 - distance / 0.12),
    );
  }
  return height;
}

export function createResident(world: THREE.Group) {
  // Use the real paver heights in the court, including their local rotations.
  const surfaces = [...walkingSurfaces];
  world.updateWorldMatrix(true, true);
  const worldInverse = world.matrixWorld.clone().invert();
  world.traverse((part) => {
    if (!(part instanceof THREE.Mesh) || part.name !== "food-court-paving")
      return;
    part.geometry.computeBoundingBox();
    const bounds = part.geometry.boundingBox!;
    const matrix = worldInverse.clone().multiply(part.matrixWorld);
    const center = bounds.getCenter(new THREE.Vector3()).applyMatrix4(matrix);
    const size = bounds.getSize(new THREE.Vector3());
    const scale = new THREE.Vector3().setFromMatrixScale(matrix);
    surfaces.push({
      x: center.x,
      z: center.z,
      width: size.x * scale.x,
      depth: size.z * scale.z,
      top: center.y + (size.y * scale.y) / 2,
      rotation: Math.atan2(matrix.elements[8], matrix.elements[0]),
    });
  });
  const object = new THREE.Group();
  object.name = "resident";
  world.add(object);
  const figure = new THREE.Group();
  object.add(figure);
  const cream = new THREE.MeshStandardMaterial({
    color: "#fff9eb",
    roughness: 0.76,
  });
  const blue = new THREE.MeshStandardMaterial({
    color: "#485dca",
    roughness: 0.65,
  });
  const ink = new THREE.MeshStandardMaterial({
    color: "#36384a",
    roughness: 0.8,
  });
  const cheekMaterial = new THREE.MeshStandardMaterial({
    color: "#e5ac94",
    roughness: 0.8,
  });
  const sphere = new THREE.SphereGeometry(1, 12, 8);
  const limbGeometry = new THREE.CylinderGeometry(1, 1, 1, 8);

  function mesh(
    geometry: THREE.BufferGeometry,
    material: THREE.Material,
    parent: THREE.Object3D,
    position: Point = [0, 0, 0],
  ) {
    const part = new THREE.Mesh(geometry, material);
    part.position.set(...position);
    part.castShadow = true;
    part.receiveShadow = true;
    parent.add(part);
    return part;
  }
  function ball(
    parent: THREE.Object3D,
    radius: number,
    position: Point,
    material = cream,
  ) {
    const part = mesh(sphere, material, parent, position);
    part.scale.setScalar(radius);
    return part;
  }
  const body = mesh(
    new RoundedBoxGeometry(0.53, 0.57, 0.49, 3, 0.095),
    cream,
    figure,
  );
  body.name = "resident-body";
  const eyes = [-0.12, 0.12].map((x) => {
    const eye = ball(figure, 0.032, [x, 0.05, 0.25], ink);
    eye.scale.z = 0.016;
    return eye;
  });
  for (const x of [-0.19, 0.19]) {
    const cheek = ball(figure, 0.035, [x, -0.045, 0.247], cheekMaterial);
    cheek.scale.set(0.035, 0.016, 0.008);
  }
  const smile = new THREE.EllipseCurve(
    0,
    0,
    0.056,
    0.04,
    Math.PI,
    Math.PI * 2,
    false,
    0,
  )
    .getPoints(16)
    .map((point) => new THREE.Vector3(point.x, point.y - 0.045, 0.251));
  const smileLine = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints(smile),
    new THREE.LineBasicMaterial({ color: "#36384a" }),
  );
  figure.add(smileLine);

  const yAxis = new THREE.Vector3(0, 1, 0);
  const start = new THREE.Vector3();
  const end = new THREE.Vector3();
  const direction = new THREE.Vector3();
  function rod(radius: number, name: string) {
    const part = mesh(limbGeometry, cream, figure);
    part.name = name;
    return (a: Point, b: Point) => {
      start.set(...a);
      end.set(...b);
      direction.copy(end).sub(start);
      part.position.copy(start).add(end).multiplyScalar(0.5);
      part.scale.set(radius, direction.length(), radius);
      part.quaternion.setFromUnitVectors(yAxis, direction.normalize());
    };
  }
  const limbs = [-1, 1].map((side) => ({
    side,
    upperArm: rod(0.035, `resident-upperarm-${side === -1 ? "left" : "right"}`),
    forearm: rod(0.03, `resident-forearm-${side === -1 ? "left" : "right"}`),
    hand: ball(figure, 0.048, [0, 0, 0]),
    thigh: rod(0.042, `resident-thigh-${side === -1 ? "left" : "right"}`),
    shin: rod(0.035, `resident-shin-${side === -1 ? "left" : "right"}`),
    shoe: mesh(
      new RoundedBoxGeometry(0.19, 0.13, 0.25, 2, 0.045),
      blue,
      figure,
    ),
  }));
  limbs.forEach(({ side, shoe, hand }) => {
    shoe.name = side === -1 ? "resident-shoe-left" : "resident-shoe-right";
    hand.name = side === -1 ? "resident-hand-left" : "resident-hand-right";
  });

  const figureTransform = new THREE.Matrix4();
  const figureInverse = new THREE.Matrix4();
  const supportPoint = new THREE.Vector3();
  const mailPoint = new THREE.Vector3();
  function mailTarget(point: MailPoint): Point {
    mailPoint.set(...mailToWorld(point)).applyMatrix4(figureInverse);
    return [mailPoint.x, mailPoint.y, mailPoint.z];
  }

  function update(elapsed: number) {
    const sample = sampleResident(elapsed);
    object.position.set(...sample.position);
    object.rotation.y = sample.facing;
    object.userData.activity = sample.activity;
    object.userData.routePhase = sample.phase;
    object.userData.elapsed = elapsed;
    const stride = (sample.distance * Math.PI * 2) / 0.53;
    const sitting = sample.seated;
    const walking = sample.walking;
    const coding = sample.activity === "coding" ? sample.interaction : 0;
    const listening = sample.activity === "listening" ? sitting : 0;
    const watching = sample.activity === "watching" ? sitting : 0;
    const social = sample.activity === "hanging-out" ? sample.interaction : 0;
    const greeting =
      social *
      smooth((sample.activityTime - 0.2) / 0.45) *
      (1 - smooth((sample.activityTime - 2.5) / 0.6));
    const legExtension =
      sample.mounting > 0 ? smooth((sample.interaction - 0.2) / 0.3) : 1;
    const tuckedFoot =
      sample.mounting > 0
        ? 0.13 * (1 - smooth((sample.interaction - 0.5) / 0.3)) * sitting
        : 0;
    const [residentX, , residentZ] = sample.position;
    const mailPassage =
      residentX > 0.45 &&
      residentX < 1.85 &&
      residentZ > 3.2 &&
      residentZ < 3.65;
    const narrowPassage =
      sitting < 0.01 &&
      (mailPassage ||
        (residentX > 4.4 &&
          residentX < 10.9 &&
          Math.abs(residentZ + 0.25) < 0.65) ||
        (Math.abs(residentX - 2.925) < 0.48 &&
          residentZ > 2.25 &&
          residentZ < 3.3) ||
        (residentX > -2.8 && residentX < -2.1 && residentZ < -0.3));

    figure.rotation.set(
      sample.mail.peek * 0.025 +
        Math.sin(sample.activityTime * 1.8) * 0.022 * social,
      Math.sin(elapsed * 0.8) * 0.018 * (listening + watching) +
        sample.mail.reading * 0.36 +
        Math.sin(sample.activityTime * 0.65) * 0.13 * social,
      Math.sin(stride) * 0.025 * walking,
    );
    object.updateMatrix();
    figure.updateMatrix();
    figureTransform.multiplyMatrices(object.matrix, figure.matrix);
    figureInverse.copy(figureTransform).invert();
    const blinkPhase = (elapsed + 1.7) % 5.3;
    const blink =
      blinkPhase < 0.14 ? 0.14 + 0.86 * Math.abs(blinkPhase / 0.07 - 1) : 1;
    eyes.forEach((eye) => {
      eye.scale.y = 0.032 * blink;
    });

    for (const limb of limbs) {
      const { side } = limb;
      const step = Math.sin(stride + (side === -1 ? Math.PI : 0)) * walking;
      const footLift =
        Math.max(0, step) * 0.075 +
        Math.abs(step) * 0.018 +
        Math.abs(figure.rotation.z) * 0.16;
      const hip: Point = [side * 0.13, -0.245, 0.015];
      const knee: Point = [
        side * 0.135,
        blend(-0.35, -0.22, sitting),
        blend(step * 0.065, blend(0.12, 0.32, legExtension), sitting),
      ];
      const foot: Point = [
        side * 0.135,
        blend(
          -0.415 + footLift,
          -0.37 +
            Math.sin(elapsed * 2.3 + side) * 0.014 * listening +
            tuckedFoot,
          sitting,
        ),
        blend(
          0.035 + step * 0.12,
          blend(0.12, 0.4 - 0.02 * listening + 0.01 * coding, legExtension),
          sitting,
        ),
      ];
      limb.shoe.rotation.x = blend(-step * 0.12, -0.08, sitting);
      limb.shoe.scale.z = 1 - listening * 0.12;
      if (sample.activity === "strolling" || sitting < 0.01) {
        let supportHeight = 0;
        let lowestCorner = Infinity;
        for (const x of [-0.095, 0.095])
          for (const z of [-0.125, 0.125]) {
            supportPoint.set(x, -0.065, z).applyEuler(limb.shoe.rotation);
            supportPoint
              .add(new THREE.Vector3(...foot))
              .applyMatrix4(figureTransform);
            supportHeight = Math.max(
              supportHeight,
              floorHeight(supportPoint.x, supportPoint.z, surfaces),
            );
            lowestCorner = Math.min(lowestCorner, supportPoint.y);
          }
        const correction = Math.max(0, supportHeight + 0.003 - lowestCorner);
        foot[1] += correction / Math.cos(figure.rotation.z);
        knee[1] = Math.max(knee[1], foot[1] + 0.06);
      }
      limb.thigh(hip, knee);
      limb.shin(knee, [foot[0], foot[1] + 0.025, foot[2] - 0.045]);
      limb.shoe.position.set(...foot);

      const armSwing = -step * (narrowPassage ? 0.05 : 0.095);
      const shoulder: Point = [side * 0.255, 0.035, 0];
      let elbow: Point = [
        side * (mailPassage ? 0.245 : narrowPassage ? 0.285 : 0.32),
        -0.09,
        armSwing * 0.6,
      ];
      let hand: Point = [
        side * (mailPassage ? 0.215 : narrowPassage ? 0.27 : 0.335),
        -0.2,
        0.03 + armSwing,
      ];
      if (sitting > 0) {
        elbow = [
          side * 0.31,
          blend(elbow[1], -0.09, sitting),
          blend(elbow[2], 0.11, sitting),
        ];
        hand = [
          side * 0.22,
          blend(hand[1], -0.2, sitting),
          blend(hand[2], 0.23, sitting),
        ];
      }
      if (sample.mounting > 0) {
        elbow[1] = blend(elbow[1], 0.04, sample.mounting);
        elbow[2] = blend(elbow[2], 0.04, sample.mounting);
        hand[1] = blend(hand[1], 0.02, sample.mounting);
        hand[2] = blend(hand[2], 0.06, sample.mounting);
      }
      if (coding > 0) {
        const lift = smooth(coding / 0.4);
        const reach = smooth((coding - 0.4) / 0.6);
        const tap = (1 + Math.sin(elapsed * 13 + side * 1.4)) * 0.008;
        elbow = [
          side * 0.27,
          blend(elbow[1], 0.19, lift),
          blend(elbow[2], 0.2, reach),
        ];
        hand = [
          side * 0.15,
          blend(hand[1], 0.21 + tap, lift),
          blend(hand[2], 0.43, reach),
        ];
      }
      if (social > 0) {
        const talk =
          (0.5 + Math.sin(sample.activityTime * 1.6 + side) * 0.5) * social;
        elbow = [side * 0.33, blend(elbow[1], -0.015, social), 0.11 * social];
        hand = [
          side * (0.28 + talk * 0.025),
          blend(hand[1], -0.06 + talk * 0.045, social),
          0.2 * social,
        ];
        if (side === -1) {
          elbow[1] = blend(elbow[1], 0.09, greeting);
          hand[0] = blend(
            hand[0],
            -0.39 + Math.sin(sample.activityTime * 7) * 0.045,
            greeting,
          );
          hand[1] = blend(hand[1], 0.25, greeting);
          hand[2] = blend(hand[2], 0.12, greeting);
        }
      }
      const mailReach =
        side === -1 ? sample.mail.leftReach : sample.mail.rightReach;
      if (mailReach > 0) {
        const target = mailTarget(
          side === -1 ? sample.mail.leftHand : sample.mail.rightHand,
        );
        const elbowTarget: Point = [
          side * 0.35,
          blend(0.16, 0.08, sample.mail.reading),
          blend(0.32, 0.34, sample.mail.reading),
        ];
        const handArc: Point = [side * 0.4, side === -1 ? -0.3 : 0.12, 0.5];
        hand = hand.map(
          (value, axis) =>
            (1 - mailReach) ** 2 * value +
            2 * (1 - mailReach) * mailReach * handArc[axis] +
            mailReach ** 2 * target[axis],
        ) as Point;
        elbow = elbow.map((value, axis) =>
          blend(value, elbowTarget[axis], mailReach),
        ) as Point;
      }
      limb.upperArm(shoulder, elbow);
      limb.forearm(elbow, hand);
      limb.hand.position.set(...hand);
    }
    return sample;
  }
  update(0);
  return { object, update };
}
