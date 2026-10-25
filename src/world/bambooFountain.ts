import * as THREE from "three";

type Point = [number, number, number];

/** Coordinates returned by update belong to the fountain garden, not the rotor. */
export function createBambooFountain(parent: THREE.Object3D) {
  const object = new THREE.Group();
  object.name = "fountain-bamboo-mechanism";
  parent.add(object);
  const wood = new THREE.MeshStandardMaterial({
    color: "#b89360",
    roughness: 0.78,
  });
  const endGrain = new THREE.MeshStandardMaterial({
    color: "#dfc491",
    roughness: 0.92,
    side: THREE.DoubleSide,
  });
  const inside = new THREE.MeshStandardMaterial({
    color: "#846b45",
    roughness: 0.94,
  });
  const rope = new THREE.MeshStandardMaterial({
    color: "#74684b",
    roughness: 1,
  });
  const grain = new THREE.MeshStandardMaterial({
    color: "#9e7f51",
    roughness: 0.9,
  });
  function mesh(
    name: string,
    geometry: THREE.BufferGeometry,
    material: THREE.Material,
    position: Point,
    owner: THREE.Object3D = object,
  ) {
    const part = new THREE.Mesh(geometry, material);
    part.name = name;
    part.position.set(...position);
    part.castShadow = part.receiveShadow = true;
    owner.add(part);
    return part;
  }
  function rod(
    name: string,
    a: Point,
    b: Point,
    radius: number,
    material = wood,
  ) {
    const start = new THREE.Vector3(...a),
      end = new THREE.Vector3(...b);
    const part = mesh(
      name,
      new THREE.CylinderGeometry(
        radius,
        radius * 1.03,
        start.distanceTo(end),
        20,
      ),
      material,
      [0, 0, 0],
    );
    part.position.copy(start).add(end).multiplyScalar(0.5);
    part.quaternion.setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      end.sub(start).normalize(),
    );
    return part;
  }
  function ring(
    name: string,
    radius: number,
    thickness: number,
    position: Point,
    material = endGrain,
    owner: THREE.Object3D = object,
  ) {
    return mesh(
      name,
      new THREE.TorusGeometry(radius, thickness, 6, 32),
      material,
      position,
      owner,
    );
  }

  // Uprights stay behind the stone lip. Only their raised fork reaches over it.
  for (const x of [-0.23, 0.23]) {
    rod(
      "fountain-bamboo-fork-upright",
      [x, 0.098, -0.94],
      [x, 1.29, -0.94],
      0.047,
    );
    rod("fountain-bamboo-fork-arm", [x, 1.19, -0.94], [x, 1.35, -0.48], 0.042);
    for (const y of [0.39, 0.82, 1.26]) {
      const node = ring("fountain-bamboo-support-node", 0.048, 0.009, [
        x,
        y,
        -0.94,
      ]);
      node.rotation.x = Math.PI / 2;
    }
    for (let i = 0; i < 3; i++) {
      const tie = ring(
        "fountain-bamboo-fork-lashing",
        0.055,
        0.009,
        [x, 1.17 + i * 0.019, -0.94],
        rope,
      );
      tie.rotation.x = Math.PI / 2;
    }
    // These visible collars are on the stationary fork, free of the tipping body.
    for (let i = 0; i < 3; i++) {
      const collar = ring(
        "fountain-bamboo-axle-lashing",
        0.042,
        0.008,
        [x + (i - 1) * 0.018, 1.35, -0.48],
        rope,
      );
      collar.rotation.y = Math.PI / 2;
    }
  }
  rod(
    "fountain-bamboo-pivot-axle",
    [-0.3, 1.35, -0.48],
    [0.3, 1.35, -0.48],
    0.026,
    grain,
  );

  const feederStart = new THREE.Vector3(0, 1.98, -0.94);
  const feederMouth = new THREE.Vector3(0, 1.88, -0.05);
  const feeder = new THREE.Group();
  feeder.name = "fountain-bamboo-feeder";
  feeder.position.copy(feederStart);
  feeder.quaternion.setFromUnitVectors(
    new THREE.Vector3(0, 0, 1),
    feederMouth.clone().sub(feederStart).normalize(),
  );
  object.add(feeder);
  const feedLength = feederStart.distanceTo(feederMouth);
  const outerPipe = new THREE.CylinderGeometry(
    0.071,
    0.071,
    feedLength,
    28,
    1,
    true,
  );
  outerPipe.rotateX(Math.PI / 2);
  const innerPipe = new THREE.CylinderGeometry(
    0.047,
    0.047,
    feedLength,
    28,
    1,
    true,
  );
  innerPipe.rotateX(Math.PI / 2);
  mesh(
    "fountain-bamboo-feeder-outer",
    outerPipe,
    wood,
    [0, 0, feedLength / 2],
    feeder,
  );
  mesh(
    "fountain-bamboo-feeder-hollow",
    innerPipe,
    new THREE.MeshStandardMaterial({
      color: "#735d3d",
      side: THREE.BackSide,
      roughness: 0.95,
    }),
    [0, 0, feedLength / 2],
    feeder,
  );
  for (const z of [0, feedLength])
    mesh(
      "fountain-bamboo-feeder-cut-end",
      new THREE.RingGeometry(0.047, 0.071, 32),
      endGrain,
      [0, 0, z],
      feeder,
    );
  for (const z of [0.18, 0.6])
    ring(
      "fountain-bamboo-feeder-node",
      0.071,
      0.009,
      [0, 0, z],
      endGrain,
      feeder,
    );
  rod(
    "fountain-bamboo-feed-upright",
    [0, 0.098, -0.94],
    [0, 1.98, -0.94],
    0.064,
  );
  for (const y of [0.3, 0.76, 1.25, 1.72]) {
    const node = ring("fountain-bamboo-feed-node", 0.064, 0.01, [0, y, -0.94]);
    node.rotation.x = Math.PI / 2;
  }
  for (let i = 0; i < 4; i++)
    ring(
      "fountain-bamboo-feed-lashing",
      0.075,
      0.009,
      [0, 0, 0.025 + i * 0.02],
      rope,
      feeder,
    );

  const pivot = new THREE.Vector3(0, 1.35, -0.48);
  const movingTube = new THREE.Group();
  movingTube.name = "fountain-bamboo-tipping-tube";
  movingTube.position.copy(pivot);
  object.add(movingTube);
  const scoopWaterMaterial = new THREE.MeshStandardMaterial({
    color: "#7bbbac",
    roughness: 0.22,
    transparent: true,
    opacity: 0.85,
    depthWrite: false,
  });
  const scoopWater = mesh(
    "fountain-bamboo-water-in-scoop",
    new THREE.PlaneGeometry(1, 1),
    scoopWaterMaterial,
    [0, -0.06, 0.4],
    movingTube,
  );
  scoopWater.rotation.x = -Math.PI / 2;
  scoopWater.castShadow = false;
  scoopWater.renderOrder = 2;

  // A real hollow bamboo segment: the cut widens smoothly into an open scoop.
  // Its lower half stays intact, including the pouring lip and inner end stop.
  const sections = [
    [-0.34, 0],
    [0.04, 0],
    [0.12, 0.24],
    [0.25, 0.7],
    [0.44, 1.12],
    [0.68, Math.PI / 2],
  ];
  const outerRadius = 0.09,
    innerRadius = 0.062,
    segments = 32;
  function tubeSurface(radius: number, inward: boolean) {
    const vertices: number[] = [],
      indices: number[] = [];
    sections.forEach(([z, cut]) => {
      for (let i = 0; i <= segments; i++) {
        const theta =
          Math.PI / 2 + cut + (i / segments) * (Math.PI * 2 - cut * 2);
        vertices.push(Math.cos(theta) * radius, Math.sin(theta) * radius, z);
      }
    });
    for (let row = 0; row < sections.length - 1; row++) {
      for (let i = 0; i < segments; i++) {
        const a = row * (segments + 1) + i,
          b = a + 1,
          c = a + segments + 1,
          d = c + 1;
        if (inward) indices.push(a, c, b, b, c, d);
        else indices.push(a, b, c, b, d, c);
      }
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(vertices, 3),
    );
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    return geometry;
  }
  mesh(
    "fountain-bamboo-scoop-outer",
    tubeSurface(outerRadius, false),
    wood,
    [0, 0, 0],
    movingTube,
  );
  mesh(
    "fountain-bamboo-scoop-inner",
    tubeSurface(innerRadius, true),
    inside,
    [0, 0, 0],
    movingTube,
  );
  for (const side of [-1, 1]) {
    const vertices: number[] = [],
      indices: number[] = [];
    sections.slice(1).forEach(([z, cut], index) => {
      const theta = Math.PI / 2 + side * cut;
      for (const radius of [outerRadius, innerRadius])
        vertices.push(Math.cos(theta) * radius, Math.sin(theta) * radius, z);
      if (index) {
        const a = (index - 1) * 2;
        indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
      }
    });
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(vertices, 3),
    );
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    mesh(
      "fountain-bamboo-scoop-cut-edge",
      geometry,
      endGrain,
      [0, 0, 0],
      movingTube,
    );
  }
  mesh(
    "fountain-bamboo-scoop-mouth",
    new THREE.RingGeometry(innerRadius, outerRadius, 32, 1, Math.PI, Math.PI),
    endGrain,
    [0, 0, 0.68],
    movingTube,
  );
  mesh(
    "fountain-bamboo-tail-cap",
    new THREE.CircleGeometry(outerRadius, 32),
    endGrain,
    [0, 0, -0.34],
    movingTube,
  );
  mesh(
    "fountain-bamboo-inner-end-stop",
    new THREE.CircleGeometry(innerRadius, 32),
    inside,
    [0, 0, 0.02],
    movingTube,
  );
  for (const z of [-0.28, 0.015])
    ring(
      "fountain-bamboo-scoop-node",
      0.091,
      0.01,
      [0, 0, z],
      endGrain,
      movingTube,
    );
  // Short longitudinal marks follow the curved exterior, without pasted-on decals.
  for (const theta of [Math.PI * 1.16, Math.PI * 1.7]) {
    const line = mesh(
      "fountain-bamboo-grain",
      new THREE.CylinderGeometry(0.0018, 0.0018, 0.36, 4),
      grain,
      [Math.cos(theta) * 0.0905, Math.sin(theta) * 0.0905, 0.35],
      movingTube,
    );
    line.rotation.x = Math.PI / 2;
  }

  feeder.updateMatrix();
  const feedStart = new THREE.Vector3(
    0,
    -0.047,
    feedLength + 0.003,
  ).applyMatrix4(feeder.matrix);
  const feedEnd = new THREE.Vector3();
  const pourStart = new THREE.Vector3();
  const pourEnd = new THREE.Vector3();
  const cycleDuration = 8;
  function update(elapsed: number) {
    const phase = ((elapsed % cycleDuration) + cycleDuration) % cycleDuration;
    let angle = 0.13;
    if (phase >= 5.5 && phase < 6.25)
      angle -= 0.55 * THREE.MathUtils.smoothstep(phase, 5.5, 6.25);
    else if (phase >= 6.25 && phase < 6.8) angle = -0.42;
    else if (phase >= 6.8 && phase < 7.45)
      angle = -0.42 + 0.55 * THREE.MathUtils.smoothstep(phase, 6.8, 7.45);
    else if (phase >= 7.45)
      angle +=
        0.018 * Math.sin((phase - 7.45) * 24) * Math.exp(-(phase - 7.45) * 9);
    movingTube.rotation.x = -angle;
    movingTube.updateMatrix();
    // The fixed stream always lands inside the open scoop, including during tipping.
    const fill =
      phase < 5.5
        ? phase / 5.5
        : 1 - THREE.MathUtils.smoothstep(phase, 5.65, 6.7);
    const waterInTube = -0.06 + fill * 0.026;
    scoopWater.position.y = waterInTube;
    scoopWater.scale.set(2 * Math.sqrt(0.067 ** 2 - waterInTube ** 2), 0.43, 1);
    scoopWater.visible = fill > 0.025;
    const receiverZ = (0.468 + waterInTube * Math.sin(angle)) / Math.cos(angle);
    feedEnd.set(0, waterInTube, receiverZ).applyMatrix4(movingTube.matrix);
    pourStart.set(0, -0.057, 0.686).applyMatrix4(movingTube.matrix);
    const pouring =
      THREE.MathUtils.smoothstep(-angle, 0.1, 0.36) *
      (1 - THREE.MathUtils.smoothstep(phase, 6.65, 7.25));
    pourEnd.set(0, 0.793, pourStart.z + 0.07 + pouring * 0.055);
    return { feedStart, feedEnd, pourStart, pourEnd, pouring };
  }
  update(0);
  return { object, update, pivot, movingTube, cycleDuration };
}
