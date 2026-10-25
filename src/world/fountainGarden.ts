import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";

type Point = [number, number, number];

/** Planting and stonework around the basin, all seated on the raised turf. */
export function createFountainGarden(parent: THREE.Object3D) {
  const garden = new THREE.Group();
  garden.name = "fountain-garden-details";
  parent.add(garden);
  const ground = 0.098;
  const material = (color: string) =>
    new THREE.MeshStandardMaterial({ color, roughness: 0.86 });
  const stone = material("#a4ada4");
  const paleStone = material("#d5d3bd");
  const shadowStone = material("#839487");
  const moss = material("#7e995d");
  const leaf = material("#527951");
  const youngLeaf = material("#7f9d65");
  const bamboo = material("#91a46b");
  const bambooNode = material("#bcc48c");
  const petal = material("#e9a28f");
  const sphere = new THREE.SphereGeometry(1, 20, 12);
  const leafGeometry = sphere.clone();
  const leafVertices = leafGeometry.getAttribute("position");
  for (let i = 0; i < leafVertices.count; i++) {
    const taper = 1 - Math.abs(leafVertices.getY(i)) * 0.46;
    leafVertices.setX(i, leafVertices.getX(i) * taper);
    leafVertices.setZ(i, leafVertices.getZ(i) * taper);
  }
  leafGeometry.computeVertexNormals();

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
    part.castShadow = part.receiveShadow = true;
    owner.add(part);
    return part;
  }

  function pebble(
    name: string,
    position: Point,
    scale: Point,
    surface = stone,
  ) {
    const part = mesh(garden, name, sphere, surface, position);
    part.scale.set(...scale);
    return part;
  }

  function rod(
    name: string,
    from: Point,
    to: Point,
    radius: number,
    surface = bamboo,
  ) {
    const a = new THREE.Vector3(...from);
    const b = new THREE.Vector3(...to);
    const part = mesh(
      garden,
      name,
      new THREE.CylinderGeometry(radius * 0.94, radius, a.distanceTo(b), 12),
      surface,
      [0, 0, 0],
    );
    part.position.copy(a).add(b).multiplyScalar(0.5);
    part.quaternion.setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      b.sub(a).normalize(),
    );
    return part;
  }

  // One upright stone and its lower companion make a quiet, asymmetric backdrop.
  pebble(
    "garden-standing-stone",
    [-0.94, ground + 0.16, -0.75],
    [0.145, 0.166, 0.17],
  );
  pebble(
    "garden-low-stone",
    [-0.65, ground + 0.105, -1.0],
    [0.17, 0.11, 0.105],
    shadowStone,
  );
  // The moss follows the actual stone surface instead of floating as a flat disc.
  for (const { position, scale } of [
    {
      position: [-0.94, ground + 0.16, -0.75] as Point,
      scale: [0.149, 0.17, 0.174] as Point,
    },
    {
      position: [-0.65, ground + 0.105, -1.0] as Point,
      scale: [0.174, 0.114, 0.109] as Point,
    },
  ]) {
    const cap = mesh(
      garden,
      "garden-stone-moss",
      new THREE.SphereGeometry(1, 20, 8, 0, Math.PI * 2, 0, 0.92),
      moss,
      position,
    );
    cap.scale.set(...scale);
  }

  // Broad, half-set stones invite a closer look without cluttering the approach.
  for (const [x, z, sx, sz, angle] of [
    [-1.05, 0.13, 0.12, 0.2, 0.03],
    [-0.93, 0.7, 0.18, 0.16, -0.15],
    [-0.54, 0.985, 0.19, 0.105, 0.04],
  ]) {
    const step = pebble(
      "garden-stepping-stone",
      [x, ground + 0.024, z],
      [sx, 0.03, sz],
      paleStone,
    );
    step.rotation.y = angle;
  }

  // Three broad leaf sprays frame the bowl; their lower edge clears the stone rim.
  const bambooLeaves: { from: Point; to: Point; width: number }[] = [];
  const stems = [
    {
      base: [-1.13, ground, -0.72] as Point,
      top: [-1.09, 1.59, -0.77] as Point,
    },
    {
      base: [-0.93, ground, -0.97] as Point,
      top: [-0.87, 1.43, -1.01] as Point,
    },
  ];
  stems.forEach(({ base, top }, stemIndex) => {
    rod("garden-bamboo-stem", base, top, stemIndex ? 0.029 : 0.036);
    for (const t of [0.18, 0.37, 0.56, 0.75, 0.94]) {
      const point = new THREE.Vector3(...base).lerp(
        new THREE.Vector3(...top),
        t,
      );
      const node = mesh(
        garden,
        "garden-bamboo-node",
        new THREE.TorusGeometry(stemIndex ? 0.03 : 0.037, 0.008, 6, 16),
        bambooNode,
        point.toArray() as Point,
      );
      node.quaternion.setFromUnitVectors(
        new THREE.Vector3(0, 0, 1),
        new THREE.Vector3(...top).sub(new THREE.Vector3(...base)).normalize(),
      );
    }
  });
  for (const { stem, t, offset, direction } of [
    { stem: 0, t: 0.75, offset: [0.13, 0.055, 0.1] as Point, direction: 1 },
    { stem: 0, t: 0.93, offset: [-0.025, 0.055, 0.06] as Point, direction: -1 },
    { stem: 1, t: 0.9, offset: [0.18, 0.055, 0.015] as Point, direction: 1 },
  ]) {
    const { base, top } = stems[stem];
    const start = new THREE.Vector3(...base).lerp(new THREE.Vector3(...top), t);
    const end = start.clone().add(new THREE.Vector3(...offset));
    rod(
      "garden-bamboo-branch",
      start.toArray() as Point,
      end.toArray() as Point,
      0.01,
      leaf,
    );
    for (let i = 0; i < 5; i++) {
      const origin = start.clone().lerp(end, 0.2 + i * 0.19);
      const tip = origin
        .clone()
        .add(
          new THREE.Vector3(
            direction * (0.145 + i * 0.012),
            0.04 - i * 0.025,
            (i % 2 ? 1 : -1) * (0.09 + i * 0.008),
          ),
        );
      tip.x = Math.max(-1.275, tip.x);
      tip.z = Math.max(-1.12, tip.z);
      bambooLeaves.push({
        from: origin.toArray() as Point,
        to: tip.toArray() as Point,
        width: 0.037 - i * 0.0015,
      });
    }
  }

  function leaves(
    name: string,
    items: typeof bambooLeaves,
    surface: THREE.Material,
  ) {
    const foliage = new THREE.InstancedMesh(
      leafGeometry,
      surface,
      items.length,
    );
    foliage.name = name;
    const transform = new THREE.Object3D();
    const up = new THREE.Vector3(0, 1, 0);
    items.forEach(({ from, to, width }, index) => {
      const start = new THREE.Vector3(...from);
      const end = new THREE.Vector3(...to);
      const length = start.distanceTo(end);
      transform.position.copy(start).add(end).multiplyScalar(0.5);
      transform.quaternion.setFromUnitVectors(up, end.sub(start).normalize());
      transform.scale.set(width, length * 0.5, width * 0.48);
      transform.updateMatrix();
      foliage.setMatrixAt(index, transform.matrix);
    });
    foliage.castShadow = foliage.receiveShadow = true;
    garden.add(foliage);
  }
  leaves("garden-bamboo-leaves", bambooLeaves, leaf);

  // Three substantial fern fronds per crown: broad leaf pairs read at island scale.
  const fernLeaves: typeof bambooLeaves = [];
  const fernHighlights: typeof bambooLeaves = [];
  for (const [cx, cz, sx, sz, rotation] of [
    [1.155, -0.13, 0.065, 0.12, 0.3],
    [0.45, 1.005, 0.14, 0.045, 0.6],
    [-1.08, 0.43, 0.047, 0.105, 0.1],
  ]) {
    pebble(
      "garden-fern-crown",
      [cx, ground + 0.02, cz],
      [0.067, 0.027, 0.06],
      moss,
    );
    for (let frond = 0; frond < 3; frond++) {
      const angle = rotation + (frond / 3) * Math.PI * 2;
      const dx = Math.cos(angle) * sx;
      const dz = Math.sin(angle) * sz;
      const height = 0.29 + (frond % 2) * 0.035;
      const point = (t: number) =>
        new THREE.Vector3(
          cx + dx * t,
          ground + 0.008 + Math.sin(t * Math.PI * 0.68) * height,
          cz + dz * t,
        );
      const curve = new THREE.CatmullRomCurve3(
        Array.from({ length: 8 }, (_, i) => point(i / 7)),
      );
      mesh(
        garden,
        "garden-fern-rachis",
        new THREE.TubeGeometry(curve, 12, 0.0075, 5, false),
        youngLeaf,
        [0, 0, 0],
      );
      for (let pair = 0; pair < 5; pair++) {
        const t = 0.22 + pair * 0.17;
        const origin = point(t);
        for (const side of [-1, 1]) {
          const spread = 0.82 * (1 - t * 0.5);
          const end = origin
            .clone()
            .add(
              new THREE.Vector3(
                (Math.cos(angle) * 0.15 - Math.sin(angle) * spread * side) * sx,
                0.052 - t * 0.03,
                (Math.sin(angle) * 0.15 + Math.cos(angle) * spread * side) * sz,
              ),
            );
          (frond === 1 ? fernHighlights : fernLeaves).push({
            from: origin.toArray() as Point,
            to: end.toArray() as Point,
            width: 0.035 * (1 - t * 0.4),
          });
        }
      }
      const origin = point(0.88);
      const tip = point(1.12);
      tip.y += 0.035;
      fernLeaves.push({
        from: origin.toArray() as Point,
        to: tip.toArray() as Point,
        width: 0.022,
      });
    }
  }
  leaves("garden-fern-leaflets", fernLeaves, leaf);
  leaves("garden-fern-new-growth", fernHighlights, youngLeaf);

  // A few river pebbles soften the turf around the timber lantern's footing.
  const pebblePositions: Point[] = [
    [1.13, ground + 0.028, -0.53],
    [1.17, ground + 0.024, -0.42],
    [1.19, ground + 0.032, -0.3],
    [0.98, ground + 0.026, -0.87],
    [0.77, ground + 0.022, -1.01],
  ];
  pebblePositions.forEach((position, i) => {
    const size = 0.047 + (i % 3) * 0.006;
    pebble(
      "garden-river-pebble",
      position,
      [size, position[1] - ground + 0.002, size * 0.8],
      i % 2 ? paleStone : stone,
    );
  });

  // A low stone tōrō: curved eaves, an open four-post chamber and a rounded finial.
  const lantern = new THREE.Group();
  lantern.name = "garden-stone-lantern";
  lantern.position.set(1.08, ground, 0.55);
  garden.add(lantern);
  function turned(
    name: string,
    profile: [number, number][],
    surface = paleStone,
  ) {
    const curve = new THREE.SplineCurve(
      profile.map(([x, y]) => new THREE.Vector2(x, y)),
    ).getPoints(40);
    curve.forEach((point) => {
      point.x = Math.max(0, point.x);
    });
    return mesh(
      lantern,
      name,
      new THREE.LatheGeometry(curve, 32),
      surface,
      [0, 0, 0],
    );
  }
  turned(
    "garden-lantern-foot",
    [
      [0, 0],
      [0.13, 0],
      [0.147, 0.035],
      [0.126, 0.085],
      [0.076, 0.13],
      [0, 0.13],
    ],
    stone,
  );
  turned(
    "garden-lantern-pedestal",
    [
      [0, 0.11],
      [0.066, 0.11],
      [0.05, 0.2],
      [0.052, 0.29],
      [0.093, 0.32],
      [0, 0.32],
    ],
    stone,
  );
  turned("garden-lantern-hearth", [
    [0, 0.29],
    [0.11, 0.29],
    [0.126, 0.313],
    [0.12, 0.34],
    [0, 0.34],
  ]);
  for (const x of [-0.077, 0.077]) {
    for (const z of [-0.077, 0.077]) {
      mesh(
        lantern,
        "garden-lantern-chamber-post",
        new RoundedBoxGeometry(0.027, 0.175, 0.027, 2, 0.009),
        stone,
        [x, 0.417, z],
      );
    }
  }
  const window = new THREE.MeshStandardMaterial({
    color: "#ead9ae",
    roughness: 0.7,
    emissive: "#ffcb83",
    emissiveIntensity: 0,
  });
  mesh(
    lantern,
    "garden-lantern-warm-core",
    new RoundedBoxGeometry(0.119, 0.147, 0.119, 3, 0.019),
    window,
    [0, 0.415, 0],
  );
  turned("garden-lantern-curved-roof", [
    [0, 0.486],
    [0.14, 0.486],
    [0.212, 0.481],
    [0.21, 0.5],
    [0.151, 0.536],
    [0.097, 0.595],
    [0.064, 0.627],
    [0, 0.629],
  ]);
  turned("garden-lantern-finial", [
    [0, 0.61],
    [0.038, 0.617],
    [0.048, 0.652],
    [0.027, 0.693],
    [0, 0.72],
  ]);

  // Two fallen petals tie the sage garden back to the island's warm coral accents.
  for (const [x, z, angle] of [
    [-0.69, 0.97, 0.4],
    [0.76, 0.96, -0.7],
  ]) {
    const fallen = pebble(
      "garden-fallen-petal",
      [x, ground + 0.009, z],
      [0.033, 0.012, 0.021],
      petal,
    );
    fallen.rotation.y = angle;
  }

  return {
    object: garden,
    nightSurfaces: [{ material: window, strength: 0.95 }],
    bulbPositions: [[1.08, ground + 0.415, 0.55] as Point],
  };
}
