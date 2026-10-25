import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";

export const UNIVERSITY_LOCATION = [1.5, 0, -10.77] as const;
export const UNIVERSITY_FOOTPRINT = { x: 3.35, z: 2.85 } as const;

type Point = [number, number, number];

/** A miniature campus, with an open approach for the suspension bridge. */
export function createUniversity(parent: THREE.Object3D) {
  const object = new THREE.Group();
  object.name = "university-island";
  object.position.set(...UNIVERSITY_LOCATION);
  parent.add(object);

  const nightSurfaces: {
    material: THREE.MeshStandardMaterial;
    strength: number;
  }[] = [];
  const bulbPositions: Point[] = [];
  const material = (color: string, roughness = 0.8) =>
    new THREE.MeshStandardMaterial({ color, roughness });
  const cream = material("#f3ead7");
  const white = material("#fff9eb");
  const sand = material("#d8cfb8");
  const coral = material("#e98c74");
  const roofEdge = material("#bd705d");
  const cobalt = material("#485dca");
  const ink = material("#25293d");
  const gold = material("#b7a170");
  const wood = material("#b89360");
  const sage = material("#809674");
  const leaf = material("#a3b684");
  const window = new THREE.MeshStandardMaterial({
    color: "#708fc1",
    roughness: 0.35,
    metalness: 0.08,
    emissive: "#ffc97d",
    emissiveIntensity: 0,
  });
  nightSurfaces.push({ material: window, strength: 1.15 });

  function mesh(
    owner: THREE.Object3D,
    name: string,
    geometry: THREE.BufferGeometry,
    surface: THREE.Material,
    position: Point,
  ) {
    const part = new THREE.Mesh(geometry, surface);
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
    size: Point,
    position: Point,
    surface: THREE.Material,
    radius = 0.04,
  ) {
    return mesh(
      owner,
      name,
      new RoundedBoxGeometry(
        ...size,
        3,
        Math.min(radius, ...size.map((n) => n * 0.3)),
      ),
      surface,
      position,
    );
  }

  function cylinder(
    owner: THREE.Object3D,
    name: string,
    radius: number,
    height: number,
    position: Point,
    surface: THREE.Material,
  ) {
    return mesh(
      owner,
      name,
      new THREE.CylinderGeometry(radius, radius, height, 32),
      surface,
      position,
    );
  }

  function rod(
    owner: THREE.Object3D,
    name: string,
    from: Point,
    to: Point,
    radius: number,
    surface: THREE.Material,
  ) {
    const a = new THREE.Vector3(...from);
    const b = new THREE.Vector3(...to);
    const part = cylinder(
      owner,
      name,
      radius,
      a.distanceTo(b),
      [0, 0, 0],
      surface,
    );
    part.position.copy(a).add(b).multiplyScalar(0.5);
    part.quaternion.setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      b.sub(a).normalize(),
    );
    return part;
  }

  function archProfile(width: number, height: number) {
    const r = width / 2;
    const shape = new THREE.Shape();
    shape.moveTo(-r, 0);
    shape.lineTo(r, 0);
    shape.lineTo(r, height - r);
    shape.absarc(0, height - r, r, 0, Math.PI, false);
    shape.lineTo(-r, 0);
    return shape;
  }

  const islandShape = new THREE.Shape();
  for (let i = 0; i <= 96; i++) {
    const a = (i / 96) * Math.PI * 2;
    const organic = 1 + 0.012 * Math.sin(a * 5) + 0.008 * Math.cos(a * 7);
    const x = Math.cos(a) * UNIVERSITY_FOOTPRINT.x * organic;
    const z = Math.sin(a) * UNIVERSITY_FOOTPRINT.z * organic;
    if (i === 0) islandShape.moveTo(x, z);
    else islandShape.lineTo(x, z);
  }
  const base = new THREE.ExtrudeGeometry(islandShape, {
    depth: 0.51,
    bevelEnabled: true,
    bevelThickness: 0.13,
    bevelSize: 0.12,
    bevelSegments: 4,
    steps: 1,
  });
  base.rotateX(-Math.PI / 2);
  mesh(
    object,
    "university-island-stratum",
    base,
    material("#e5decb"),
    [0, -0.62, 0],
  );
  const top = new THREE.ExtrudeGeometry(islandShape, {
    depth: 0.1,
    bevelEnabled: true,
    bevelThickness: 0.07,
    bevelSize: 0.12,
    bevelSegments: 4,
    steps: 1,
  });
  top.rotateX(-Math.PI / 2);
  mesh(
    object,
    "university-island-surface",
    top,
    material("#eee8d9"),
    [0, -0.15, 0],
  );

  // The entrance opens onto a small plaza, with a full-width walk from the bridge.
  // Leave a visible gap after its angled entry tread and before the portico step.
  for (const [x, z] of [
    [-0.12, 1.92],
    [-0.08, 1.56],
    [-0.04, 1.2],
    [0, 0.84],
  ]) {
    box(
      object,
      "university-approach-stone",
      [1, 0.045, 0.27],
      [x, 0.044, z],
      sand,
      0.06,
    );
  }
  for (const [x, z, radius] of [
    [-2.15, 0.45, 0.51],
    [2.03, 1.15, 0.53],
  ] as const) {
    const bed = cylinder(
      object,
      "university-grass-bed",
      radius,
      0.065,
      [x, 0.0525, z],
      leaf,
    );
    bed.scale.z = 0.6;
    for (const [dx, dz, s] of [
      [-0.17, 0.02, 0.17],
      [0.12, -0.055, 0.19],
      [0.3, 0.04, 0.12],
    ]) {
      const shrub = mesh(
        object,
        "university-rounded-shrub",
        new THREE.SphereGeometry(1, 20, 14),
        sage,
        [x + dx, 0.085 + s * 0.65, z + dz],
      );
      shrub.scale.set(s, s * 0.68, s * 0.8);
    }
  }

  const building = new THREE.Group();
  building.name = "university-building";
  building.position.z = -0.85;
  building.userData.station = "education";
  object.add(building);

  box(
    building,
    "university-foundation",
    [3.44, 0.16, 1.92],
    [0, 0.1, 0],
    sand,
    0.065,
  );
  box(
    building,
    "university-hall",
    [3.3, 1.48, 1.72],
    [0, 0.92, 0],
    cream,
    0.075,
  );
  box(
    building,
    "university-lower-course",
    [3.37, 0.12, 1.79],
    [0, 0.25, 0],
    white,
  );
  box(building, "university-cornice", [3.43, 0.13, 1.88], [0, 1.64, 0], white);

  // Solid gable ends meet the roof; the roof is built from softly rounded slabs.
  const gableShape = new THREE.Shape();
  gableShape.moveTo(-0.87, 0);
  gableShape.lineTo(0.87, 0);
  gableShape.lineTo(0, 0.43);
  gableShape.closePath();
  const gable = new THREE.ExtrudeGeometry(gableShape, {
    depth: 3.25,
    bevelEnabled: true,
    bevelThickness: 0.02,
    bevelSize: 0.02,
    bevelSegments: 3,
    steps: 1,
  });
  gable.rotateY(Math.PI / 2);
  mesh(building, "university-gables", gable, cream, [-1.625, 1.66, 0]);
  for (const side of [-1, 1]) {
    const slope = box(
      building,
      "university-coral-roof",
      [3.62, 0.115, 1.09],
      [0, 1.927, side * 0.485],
      coral,
      0.045,
    );
    slope.rotation.x = side * Math.atan2(0.43, 0.97);
    box(
      building,
      "university-eave",
      [3.65, 0.09, 0.095],
      [0, 1.71, side * 0.99],
      roofEdge,
    );
    // Thin raised tile seams reinforce the small clay-roof character without a noisy texture.
    for (const x of [-1.5, -1.2, -0.9, 0.9, 1.2, 1.5]) {
      rod(
        building,
        "university-roof-tile-seam",
        [x, 2.17, 0],
        [x, 1.756, side * 0.97],
        0.013,
        roofEdge,
      );
    }
  }
  rod(
    building,
    "university-roof-ridge",
    [-1.83, 2.16, 0],
    [1.83, 2.16, 0],
    0.07,
    coral,
  );

  function frontWindow(owner: THREE.Object3D, x: number, y: number, z: number) {
    box(
      owner,
      "university-window-reveal",
      [0.43, 0.65, 0.055],
      [x, y, z],
      white,
      0.035,
    );
    box(
      owner,
      "university-blue-window",
      [0.33, 0.54, 0.025],
      [x, y, z + 0.034],
      window,
      0.025,
    );
    box(
      owner,
      "university-window-mullion",
      [0.026, 0.54, 0.018],
      [x, y, z + 0.052],
      cream,
      0.008,
    );
    box(
      owner,
      "university-window-crossbar",
      [0.33, 0.026, 0.018],
      [x, y - 0.025, z + 0.052],
      cream,
      0.008,
    );
    box(
      owner,
      "university-window-sill",
      [0.46, 0.065, 0.12],
      [x, y - 0.337, z + 0.038],
      sand,
      0.02,
    );
  }
  for (const x of [-1.26, -0.76, 0.76, 1.26]) {
    frontWindow(building, x, 1.01, 0.874);
  }
  for (const side of [-1, 1]) {
    const sideWindows = new THREE.Group();
    sideWindows.name = "university-side-windows";
    sideWindows.position.x = side * 1.664;
    sideWindows.rotation.y = (side * Math.PI) / 2;
    building.add(sideWindows);
    for (const x of [-0.43, 0.43]) frontWindow(sideWindows, x, 1.01, 0);
  }

  box(
    building,
    "university-clock-tower",
    [1.04, 2.41, 1.12],
    [0, 1.385, 0.35],
    cream,
    0.055,
  );
  box(
    building,
    "university-tower-cornice",
    [1.2, 0.13, 1.26],
    [0, 2.61, 0.35],
    white,
    0.04,
  );
  box(
    building,
    "university-tower-waist",
    [1.13, 0.085, 1.2],
    [0, 1.79, 0.35],
    sand,
    0.025,
  );

  const towerRoof = mesh(
    building,
    "university-tower-roof",
    new THREE.ConeGeometry(0.93, 0.47, 4),
    coral,
    [0, 2.91, 0.35],
  );
  towerRoof.rotation.y = Math.PI / 4;
  towerRoof.scale.z = 1.06;
  mesh(
    building,
    "university-tower-finial",
    new THREE.SphereGeometry(0.065, 16, 12),
    gold,
    [0, 3.175, 0.35],
  );

  // Geometry keeps the clock legible even when the island is small on screen.
  const clockRim = cylinder(
    building,
    "university-clock-rim",
    0.305,
    0.055,
    [0, 2.245, 0.943],
    gold,
  );
  clockRim.rotation.x = Math.PI / 2;
  const clockFace = cylinder(
    building,
    "university-clock-face",
    0.269,
    0.02,
    [0, 2.245, 0.979],
    white,
  );
  clockFace.rotation.x = Math.PI / 2;
  for (let i = 0; i < 12; i++) {
    const angle = (i / 12) * Math.PI * 2;
    const tick = box(
      building,
      "university-clock-tick",
      [0.014, i % 3 === 0 ? 0.055 : 0.028, 0.01],
      [Math.sin(angle) * 0.221, 2.245 + Math.cos(angle) * 0.221, 0.995],
      ink,
      0.004,
    );
    tick.rotation.z = -angle;
  }
  rod(
    building,
    "university-clock-hour-hand",
    [0, 2.245, 1.004],
    [-0.104, 2.32, 1.004],
    0.019,
    cobalt,
  );
  rod(
    building,
    "university-clock-minute-hand",
    [0, 2.245, 1.009],
    [0.153, 2.359, 1.009],
    0.014,
    cobalt,
  );
  mesh(
    building,
    "university-clock-hub",
    new THREE.SphereGeometry(0.028, 16, 10),
    gold,
    [0, 2.245, 1.015],
  );

  const doorway = new THREE.ExtrudeGeometry(archProfile(0.51, 0.88), {
    depth: 0.03,
    bevelEnabled: false,
    curveSegments: 24,
  });
  mesh(building, "university-arched-door", doorway, ink, [0, 0.28, 0.916]);
  const archFrame = archProfile(0.66, 1.01);
  const archHole = archProfile(0.51, 0.88).getPoints(32);
  archFrame.holes.push(
    new THREE.Path(
      archHole.map((point) => point.add(new THREE.Vector2(0, 0.065))),
    ),
  );
  const frameGeometry = new THREE.ExtrudeGeometry(archFrame, {
    depth: 0.085,
    bevelEnabled: true,
    bevelThickness: 0.012,
    bevelSize: 0.012,
    bevelSegments: 3,
    curveSegments: 24,
  });
  mesh(
    building,
    "university-entrance-arch",
    frameGeometry,
    white,
    [0, 0.215, 0.916],
  );
  box(
    building,
    "university-door-center",
    [0.025, 0.7, 0.016],
    [0, 0.631, 0.953],
    gold,
    0.005,
  );
  for (const x of [-0.047, 0.047]) {
    rod(
      building,
      "university-door-handle",
      [x, 0.53, 0.971],
      [x, 0.64, 0.971],
      0.012,
      gold,
    );
  }
  for (const x of [-0.44, 0.44]) {
    cylinder(
      building,
      "university-portico-column",
      0.06,
      1.03,
      [x, 0.735, 1.02],
      cream,
    );
    cylinder(
      building,
      "university-column-base",
      0.092,
      0.08,
      [x, 0.26, 1.02],
      sand,
    );
    cylinder(
      building,
      "university-column-capital",
      0.097,
      0.075,
      [x, 1.24, 1.02],
      white,
    );
  }
  box(
    building,
    "university-portico-lintel",
    [1.15, 0.16, 0.39],
    [0, 1.355, 0.995],
    white,
    0.035,
  );
  box(
    building,
    "university-entrance-top-step",
    [1.21, 0.2, 0.42],
    [0, 0.12, 1.04],
    sand,
    0.045,
  );
  box(
    building,
    "university-entrance-lower-step",
    [1.35, 0.09, 0.28],
    [0, 0.065, 1.365],
    cream,
    0.035,
  );

  // The institution is factual; the building is a playful campus, not an architectural replica.
  if (typeof document !== "undefined") {
    const canvas = document.createElement("canvas");
    canvas.width = 1024;
    canvas.height = 96;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.fillStyle = "#f3ead7";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "#485dca";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.font = "700 49px sans-serif";
      ctx.fillText("CHANDIGARH UNIVERSITY", 512, 51);
      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      const sign = mesh(
        building,
        "university-nameplate",
        new THREE.PlaneGeometry(1.03, 0.0966),
        new THREE.MeshStandardMaterial({ map: texture, roughness: 0.9 }),
        [0, 1.354, 1.196],
      );
      sign.castShadow = false;
    }
  }

  // A bench occupies its own space, clear of the hall, planting and bridge landing.
  const bench = new THREE.Group();
  bench.name = "university-bench";
  bench.position.set(-1.8, 0, 1.35);
  object.add(bench);
  for (const x of [-0.24, 0.24]) {
    for (const z of [-0.1, 0.1]) {
      cylinder(bench, "university-bench-leg", 0.024, 0.24, [x, 0.14, z], gold);
    }
  }
  box(
    bench,
    "university-bench-seat",
    [0.68, 0.065, 0.32],
    [0, 0.2825, 0],
    wood,
    0.025,
  );
  for (const x of [-0.25, 0.25]) {
    rod(
      bench,
      "university-bench-back-support",
      [x, 0.25, -0.105],
      [x, 0.51, -0.105],
      0.018,
      gold,
    );
  }
  box(
    bench,
    "university-bench-back",
    [0.68, 0.15, 0.055],
    [0, 0.46, -0.13],
    wood,
    0.022,
  );

  for (const x of [-0.85, 0.85]) {
    const z = 2;
    cylinder(
      object,
      "university-path-lamp-base",
      0.093,
      0.075,
      [x, 0.0575, z],
      sand,
    );
    cylinder(
      object,
      "university-path-lamp-post",
      0.025,
      0.46,
      [x, 0.29, z],
      gold,
    );
    cylinder(
      object,
      "university-path-lamp-cap",
      0.115,
      0.045,
      [x, 0.575, z],
      cobalt,
    );
    bulbPositions.push([x, 0.528, z]);
  }

  // Taller matching lamps frame the plaza without narrowing the central path.
  for (const x of [-1.1, 1.1]) {
    const z = 1.1;
    const lamp = new THREE.Group();
    lamp.name = "university-streetlamp";
    lamp.position.set(x, 0, z);
    object.add(lamp);
    cylinder(
      lamp,
      "university-streetlamp-base",
      0.13,
      0.08,
      [0, 0.06, 0],
      sand,
    );
    cylinder(
      lamp,
      "university-streetlamp-post",
      0.033,
      1.32,
      [0, 0.76, 0],
      gold,
    );
    cylinder(
      lamp,
      "university-streetlamp-collar",
      0.066,
      0.06,
      [0, 1.345, 0],
      gold,
    );
    cylinder(
      lamp,
      "university-streetlamp-lantern-base",
      0.12,
      0.035,
      [0, 1.425, 0],
      gold,
    );
    for (const side of [-1, 1]) {
      for (const depth of [-1, 1]) {
        rod(
          lamp,
          "university-streetlamp-lantern-frame",
          [side * 0.073, 1.437, depth * 0.073],
          [side * 0.073, 1.67, depth * 0.073],
          0.011,
          gold,
        );
      }
    }
    const cap = mesh(
      lamp,
      "university-streetlamp-cap",
      new THREE.SphereGeometry(1, 24, 12),
      cobalt,
      [0, 1.695, 0],
    );
    cap.scale.set(0.155, 0.055, 0.155);
    mesh(
      lamp,
      "university-streetlamp-finial",
      new THREE.SphereGeometry(0.026, 16, 10),
      gold,
      [0, 1.765, 0],
    );
    bulbPositions.push([x, 1.54, z]);
  }

  return {
    object,
    nightSurfaces,
    bulbPositions,
    labelPosition: [0, 3.7, -0.85] as Point,
  };
}
