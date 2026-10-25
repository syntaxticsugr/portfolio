import * as THREE from "three";

type Flight = {
  x: number;
  z: number;
  height: number;
  width: number;
  depth: number;
  bob: number;
  speed: number;
  phase: number;
  flutter: number;
  size: number;
  color: string;
  accent: string;
};

const FLIGHTS: readonly Flight[] = [
  {
    x: -0.6,
    z: 0.65,
    height: 1.89,
    width: 0.25,
    depth: 0.1,
    bob: 0.045,
    speed: 0.47,
    phase: 2.2,
    flutter: 11.8,
    size: 1,
    color: "#eaa074",
    accent: "#f5d99a",
  },
  {
    x: 0.6,
    z: 0.65,
    height: 1.94,
    width: 0.25,
    depth: 0.1,
    bob: 0.055,
    speed: -0.4,
    phase: 0.15,
    flutter: 13.2,
    size: 0.95,
    color: "#819edc",
    accent: "#d4e4fa",
  },
  {
    x: 0,
    z: 0.97,
    height: 1.49,
    width: 0.38,
    depth: 0.11,
    bob: 0.02,
    speed: 0.35,
    phase: 4.45,
    flutter: 12.5,
    size: 0.9,
    color: "#c6a0d8",
    accent: "#efcfec",
  },
];

/** Small garden visitors, animated from the world's shared, pausable clock. */
export function createFountainButterflies(parent: THREE.Object3D) {
  const object = new THREE.Group();
  object.name = "fountain-butterflies";
  parent.add(object);

  const sphere = new THREE.SphereGeometry(1, 12, 8);
  const bodyMaterial = new THREE.MeshStandardMaterial({
    color: "#454046",
    roughness: 0.82,
  });
  const spotMaterial = new THREE.MeshStandardMaterial({
    color: "#fff1d0",
    roughness: 0.82,
  });

  // The broad forewing and smaller hindwing share one softly scalloped outline.
  // Its resting plane is XZ, with the leading edge toward the head at -Z.
  const outline = new THREE.Shape();
  outline.moveTo(0.012, -0.055);
  outline.bezierCurveTo(0.048, -0.113, 0.149, -0.166, 0.197, -0.146);
  outline.bezierCurveTo(0.248, -0.124, 0.23, -0.044, 0.155, 0.01);
  outline.bezierCurveTo(0.2, 0.029, 0.196, 0.093, 0.153, 0.123);
  outline.bezierCurveTo(0.102, 0.154, 0.047, 0.106, 0.012, 0.049);
  outline.closePath();
  const wingGeometry = new THREE.ExtrudeGeometry(outline, {
    depth: 0.007,
    bevelEnabled: true,
    bevelSize: 0.004,
    bevelThickness: 0.004,
    bevelSegments: 2,
    curveSegments: 12,
    steps: 1,
  });
  wingGeometry.translate(0, 0, -0.0035);
  wingGeometry.rotateX(Math.PI / 2);

  function part(
    owner: THREE.Object3D,
    name: string,
    geometry: THREE.BufferGeometry,
    material: THREE.Material,
    x = 0,
    y = 0,
    z = 0,
  ) {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = name;
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    owner.add(mesh);
    return mesh;
  }

  const visitors = FLIGHTS.map((flight, index) => {
    const butterfly = new THREE.Group();
    butterfly.name = `fountain-butterfly-${index + 1}`;
    butterfly.scale.setScalar(flight.size);
    object.add(butterfly);

    const wingMaterial = new THREE.MeshStandardMaterial({
      color: flight.color,
      roughness: 0.76,
    });
    const accentMaterial = new THREE.MeshStandardMaterial({
      color: flight.accent,
      roughness: 0.8,
    });
    const wings = [-1, 1].map((side) => {
      const hinge = new THREE.Group();
      hinge.name = side < 0 ? "butterfly-left-wing" : "butterfly-right-wing";
      hinge.position.x = side * 0.009;
      hinge.scale.x = side;
      butterfly.add(hinge);
      part(hinge, "butterfly-sculpted-wing", wingGeometry, wingMaterial);

      // Low, soft inlays are visible on either side as the wings turn.
      for (const face of [-1, 1]) {
        const forewingMark = part(
          hinge,
          "butterfly-forewing-mark",
          sphere,
          accentMaterial,
          0.117,
          face * 0.009,
          -0.068,
        );
        forewingMark.scale.set(0.065, 0.0035, 0.034);
        forewingMark.rotation.y = 0.65;
        const hindwingMark = part(
          hinge,
          "butterfly-hindwing-mark",
          sphere,
          accentMaterial,
          0.103,
          face * 0.009,
          0.073,
        );
        hindwingMark.scale.set(0.033, 0.0035, 0.027);
        for (const [x, z] of [
          [0.187, -0.102],
          [0.194, -0.071],
        ]) {
          const spot = part(
            hinge,
            "butterfly-wing-spot",
            sphere,
            spotMaterial,
            x,
            face * 0.009,
            z,
          );
          spot.scale.set(0.01, 0.003, 0.01);
        }
      }
      return hinge;
    });

    const body = part(butterfly, "butterfly-body", sphere, bodyMaterial);
    body.scale.set(0.017, 0.018, 0.084);
    const head = part(
      butterfly,
      "butterfly-head",
      sphere,
      bodyMaterial,
      0,
      0.003,
      -0.083,
    );
    head.scale.set(0.022, 0.022, 0.024);
    for (const side of [-1, 1]) {
      const antenna = new THREE.CatmullRomCurve3([
        new THREE.Vector3(side * 0.009, 0.009, -0.101),
        new THREE.Vector3(side * 0.022, 0.021, -0.124),
        new THREE.Vector3(side * 0.037, 0.027, -0.142),
        new THREE.Vector3(side * 0.045, 0.025, -0.143),
      ]);
      part(
        butterfly,
        "butterfly-antenna",
        new THREE.TubeGeometry(antenna, 8, 0.003, 5, false),
        bodyMaterial,
      );
      const tip = part(
        butterfly,
        "butterfly-antenna-tip",
        sphere,
        bodyMaterial,
        side * 0.045,
        0.025,
        -0.143,
      );
      tip.scale.setScalar(0.0055);
    }
    return { butterfly, wings, flight };
  });

  function update(elapsed: number) {
    for (let index = 0; index < visitors.length; index++) {
      const { butterfly, wings, flight } = visitors[index];
      const phase = elapsed * flight.speed + flight.phase;
      const bobPhase = phase * 2 + index * 0.8;
      butterfly.position.set(
        flight.x + Math.cos(phase) * flight.width,
        flight.height + Math.sin(bobPhase) * flight.bob,
        flight.z + Math.sin(phase) * flight.depth,
      );

      const vx = -Math.sin(phase) * flight.width * flight.speed;
      const vz = Math.cos(phase) * flight.depth * flight.speed;
      const vy = Math.cos(bobPhase) * flight.bob * 2 * flight.speed;
      const heading = Math.atan2(-vx, -vz);
      const pitch = Math.atan2(vy, Math.hypot(vx, vz)) * 0.3;
      const bank = Math.sin(phase + 0.7) * 0.13;
      butterfly.rotation.set(pitch, heading, bank, "YXZ");

      const flutterPhase = elapsed * flight.flutter + index * 1.9;
      const opening = 0.56 + Math.sin(flutterPhase) * 0.49;
      wings[0].rotation.z = -opening;
      wings[1].rotation.z = opening;
    }
  }

  update(0);
  return { object, update };
}
