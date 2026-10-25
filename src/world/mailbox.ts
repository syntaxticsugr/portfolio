import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { mergeVertices } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import {
  CLOSED_MAIL,
  MAIL_DOOR_ANGLE,
  MAIL_DOOR_HINGE,
  MAIL_LETTER_SIZE,
  MAIL_LOCATION,
  MAIL_ROTATION,
  STOOL_LAYOUT,
  type MailCheckState,
} from "./mailRoutine";

function roundedProfile(width: number, height: number, radius: number) {
  const x = width / 2 - radius;
  const y = height / 2 - radius;
  const shape = new THREE.Shape();
  shape.moveTo(-x, -height / 2);
  shape.lineTo(x, -height / 2);
  shape.absarc(x, -y, radius, -Math.PI / 2, 0, false);
  shape.lineTo(width / 2, y);
  shape.absarc(x, y, radius, 0, Math.PI / 2, false);
  shape.lineTo(-x, height / 2);
  shape.absarc(-x, y, radius, Math.PI / 2, Math.PI, false);
  shape.lineTo(-width / 2, -y);
  shape.absarc(-x, -y, radius, Math.PI, Math.PI * 1.5, false);
  shape.closePath();
  return shape;
}

function smoothExtrusion(geometry: THREE.ExtrudeGeometry) {
  geometry.deleteAttribute("normal");
  geometry.deleteAttribute("uv");
  const smooth = mergeVertices(geometry);
  smooth.computeVertexNormals();
  geometry.dispose();
  return smooth;
}

/** The case stays fixed on its post; only the hinged door and envelope move. */
export function createMailbox(parent: THREE.Group) {
  const materials = {
    lime: new THREE.MeshStandardMaterial({ color: "#d4e97f", roughness: 0.75 }),
    cream: new THREE.MeshStandardMaterial({ color: "#f3ead7", roughness: 0.8 }),
    paper: new THREE.MeshStandardMaterial({ color: "#fff9eb", roughness: 0.9 }),
    gold: new THREE.MeshStandardMaterial({ color: "#b7a170", roughness: 0.55 }),
    coral: new THREE.MeshStandardMaterial({
      color: "#e98c74",
      roughness: 0.75,
    }),
    inside: new THREE.MeshStandardMaterial({
      color: "#586347",
      roughness: 0.85,
    }),
    sand: new THREE.MeshStandardMaterial({ color: "#d8cfb8", roughness: 0.85 }),
  };
  const object = new THREE.Group();
  object.name = "mailbox";
  object.position.y = MAIL_LOCATION[1];
  object.rotation.y = MAIL_ROTATION;
  parent.add(object);
  function mesh(
    owner: THREE.Object3D,
    name: string,
    geometry: THREE.BufferGeometry,
    position: [number, number, number],
    material: THREE.Material,
  ) {
    const part = new THREE.Mesh(geometry, material);
    part.name = name;
    part.position.set(...position);
    part.castShadow = true;
    part.receiveShadow = true;
    owner.add(part);
    return part;
  }
  function box(
    owner: THREE.Object3D,
    name: string,
    size: [number, number, number],
    position: [number, number, number],
    material: THREE.Material,
    radius = 0.012,
  ) {
    return mesh(
      owner,
      name,
      new RoundedBoxGeometry(
        ...size,
        3,
        Math.min(radius, ...size.map((value) => value * 0.25)),
      ),
      position,
      material,
    );
  }
  // An extruded outline keeps visible corner radii independent of panel thickness.
  function panel(
    owner: THREE.Object3D,
    name: string,
    size: [number, number, number],
    position: [number, number, number],
    material: THREE.Material,
    radius: number,
    bevel: number,
  ) {
    const [width, height, thickness] = size;
    const depth = thickness - bevel * 2;
    const geometry = new THREE.ExtrudeGeometry(
      roundedProfile(width - bevel * 2, height - bevel * 2, radius - bevel),
      {
        depth,
        bevelEnabled: true,
        bevelSize: bevel,
        bevelThickness: bevel,
        bevelSegments: 4,
        curveSegments: 8,
        steps: 1,
      },
    );
    geometry.translate(0, 0, -depth / 2);
    return mesh(owner, name, smoothExtrusion(geometry), position, material);
  }
  function rod(
    owner: THREE.Object3D,
    name: string,
    a: number[],
    b: number[],
    radius: number,
    material: THREE.Material,
  ) {
    const from = new THREE.Vector3(...a),
      to = new THREE.Vector3(...b);
    const part = new THREE.Mesh(
      new THREE.CylinderGeometry(radius, radius, from.distanceTo(to), 10),
      material,
    );
    part.name = name;
    part.position.copy(from).add(to).multiplyScalar(0.5);
    part.quaternion.setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      to.sub(from).normalize(),
    );
    part.castShadow = true;
    part.receiveShadow = true;
    owner.add(part);
    return part;
  }
  // One hollow shell gives the case continuous curved corners without seams.
  // Bevels flare outward from the .64 × .40 opening, preserving the hand clearance.
  const shellProfile = roundedProfile(0.702, 0.472, 0.066);
  shellProfile.holes.push(roundedProfile(0.668, 0.428, 0.049));
  const shellGeometry = new THREE.ExtrudeGeometry(shellProfile, {
    depth: 0.512,
    bevelEnabled: true,
    bevelSize: 0.014,
    bevelThickness: 0.014,
    bevelSegments: 4,
    curveSegments: 8,
    steps: 1,
  });
  shellGeometry.translate(0, 0, -0.256);
  mesh(
    object,
    "mail-case-shell",
    smoothExtrusion(shellGeometry),
    [0, 0, 0],
    materials.lime,
  );
  panel(
    object,
    "mail-case-back",
    [0.702, 0.472, 0.044],
    [0, 0, -0.247],
    materials.lime,
    0.066,
    0.006,
  );
  panel(
    object,
    "mail-interior",
    [0.632, 0.392, 0.004],
    [0, 0, -0.2225],
    materials.inside,
    0.032,
    0.001,
  );
  // The letter rests on a low tray while stored, instead of hovering in the cavity.
  box(
    object,
    "mail-tray",
    [0.46, 0.022, 0.44],
    [0.04, -0.121, 0],
    materials.cream,
    0.004,
  );
  for (const x of [-0.16, 0.22])
    rod(
      object,
      "mail-tray-support",
      [x, -0.205, 0.12],
      [x, -0.121, 0.12],
      0.016,
      materials.gold,
    );

  const door = new THREE.Group();
  door.name = "mail-door";
  door.position.set(...MAIL_DOOR_HINGE);
  object.add(door);
  panel(
    door,
    "mail-door-panel",
    [0.65, 0.4, 0.026],
    [0.325, 0, 0],
    materials.cream,
    0.035,
    0.004,
  );
  rod(
    door,
    "mail-door-envelope",
    [0.075, 0.12, 0.018],
    [0.325, -0.035, 0.018],
    0.01,
    materials.gold,
  );
  rod(
    door,
    "mail-door-envelope",
    [0.325, -0.035, 0.018],
    [0.555, 0.12, 0.018],
    0.01,
    materials.gold,
  );
  box(
    door,
    "mail-door-handle",
    [0.052, 0.075, 0.035],
    [0.56, 0.01, 0.023],
    materials.gold,
    0.008,
  );
  for (const y of [-0.13, 0.13])
    rod(
      object,
      "mail-door-hinge",
      [-0.325, y - 0.055, 0.282],
      [-0.325, y + 0.055, 0.282],
      0.018,
      materials.gold,
    );
  rod(
    object,
    "mail-flag-mount",
    [0.365, 0.02, 0],
    [0.445, 0.02, 0],
    0.042,
    materials.gold,
  );
  rod(
    object,
    "mail-flag-stem",
    [0.42, 0.02, 0],
    [0.42, 0.41, 0],
    0.02,
    materials.coral,
  );
  panel(
    object,
    "mail-flag",
    [0.2, 0.15, 0.055],
    [0.5, 0.36, 0],
    materials.coral,
    0.025,
    0.007,
  );

  const letter = new THREE.Group();
  letter.name = "mail-letter";
  object.add(letter);
  box(
    letter,
    "mail-envelope-paper",
    MAIL_LETTER_SIZE,
    [0, 0, 0],
    materials.paper,
    0.003,
  );
  rod(
    letter,
    "mail-envelope-fold",
    [-0.155, 0.09, 0.008],
    [0, -0.013, 0.008],
    0.0025,
    materials.gold,
  );
  rod(
    letter,
    "mail-envelope-fold",
    [0, -0.013, 0.008],
    [0.155, 0.09, 0.008],
    0.0025,
    materials.gold,
  );
  box(
    letter,
    "mail-envelope-stamp",
    [0.043, 0.037, 0.003],
    [0.114, 0.062, 0.009],
    materials.coral,
    0.002,
  );

  const stool = new THREE.Group();
  stool.name = "mail-stool";
  stool.position.set(
    STOOL_LAYOUT.position[0] - MAIL_LOCATION[0],
    0,
    STOOL_LAYOUT.position[2] - MAIL_LOCATION[2],
  );
  stool.rotation.y = STOOL_LAYOUT.rotation;
  parent.add(stool);
  box(
    stool,
    "mail-stool-base",
    [STOOL_LAYOUT.width, STOOL_LAYOUT.top - 0.035, STOOL_LAYOUT.depth],
    [0, (STOOL_LAYOUT.top - 0.035) / 2 + 0.02, 0],
    materials.sand,
    0.035,
  );
  box(
    stool,
    "mail-stool-top",
    [STOOL_LAYOUT.width, 0.03, STOOL_LAYOUT.depth],
    [0, STOOL_LAYOUT.top - 0.015, 0],
    materials.cream,
    0.009,
  );

  function update(state: MailCheckState) {
    door.rotation.y = state.door * MAIL_DOOR_ANGLE;
    letter.position.set(...state.letterPosition);
    letter.rotation.set(...state.letterRotation);
    object.userData.doorOpen = state.door;
    object.userData.reading = state.reading;
  }
  update(CLOSED_MAIL);
  return { object, door, letter, stool, update };
}
