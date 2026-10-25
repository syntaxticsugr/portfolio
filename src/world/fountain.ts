import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { createBambooFountain } from "./bambooFountain";
import { createFountainGarden } from "./fountainGarden";
import { createFountainButterflies } from "./butterflies";

export const FOUNTAIN_LOCATION = [2.5, 0, -2.8] as const;

/** A carved stone water garden with a working bamboo tipping fountain. */
export function createFountain(parent: THREE.Object3D) {
  const object = new THREE.Group();
  object.name = "fountain-garden";
  object.position.set(...FOUNTAIN_LOCATION);
  parent.add(object);

  const material = (color: string, roughness = 0.85) =>
    new THREE.MeshStandardMaterial({ color, roughness });
  const stone = material("#8f9e9f");
  stone.vertexColors = true;
  const paleStone = material("#c5cebd");
  const wood = material("#b89360");
  const binding = material("#74684b");
  function mesh(
    name: string,
    geometry: THREE.BufferGeometry,
    surface: THREE.Material,
    position: [number, number, number],
  ) {
    const part = new THREE.Mesh(geometry, surface);
    part.name = name;
    part.position.set(...position);
    part.castShadow = true;
    part.receiveShadow = true;
    object.add(part);
    return part;
  }
  function rod(
    name: string,
    from: [number, number, number],
    to: [number, number, number],
    radius: number,
    surface = wood,
  ) {
    const a = new THREE.Vector3(...from),
      b = new THREE.Vector3(...to);
    const part = mesh(
      name,
      new THREE.CylinderGeometry(radius, radius * 1.04, a.distanceTo(b), 24),
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
  function pebble(
    name: string,
    position: [number, number, number],
    scale: [number, number, number],
    surface = paleStone,
  ) {
    const part = mesh(
      name,
      new THREE.SphereGeometry(1, 24, 16),
      surface,
      position,
    );
    part.scale.set(...scale);
    return part;
  }

  // A continuous, gently bevelled turf edge, with no square platform underneath.
  const lawn = new THREE.Shape();
  lawn.moveTo(1.48, 0);
  lawn.bezierCurveTo(1.6, 0.65, 0.75, 1.22, -0.1, 1.23);
  lawn.bezierCurveTo(-0.95, 1.3, -1.48, 0.78, -1.48, 0.05);
  lawn.bezierCurveTo(-1.48, -0.65, -0.7, -1.3, 0.13, -1.26);
  lawn.bezierCurveTo(0.95, -1.3, 1.48, -0.7, 1.48, 0);
  const lawnGeometry = new THREE.ExtrudeGeometry(lawn, {
    depth: 0.035,
    bevelEnabled: true,
    bevelThickness: 0.028,
    bevelSize: 0.038,
    bevelSegments: 3,
    curveSegments: 24,
    steps: 1,
  });
  lawnGeometry.rotateX(-Math.PI / 2);
  mesh(
    "fountain-grass-patch",
    lawnGeometry,
    material("#97ad79"),
    [0, 0.035, 0],
  );

  // A low carved foot, fluted body and broad rounded lip give the granite weight.
  const profile = new THREE.SplineCurve(
    [
      [0, 0.1],
      [0.42, 0.1],
      [0.68, 0.15],
      [0.76, 0.22],
      [0.74, 0.3],
      [0.75, 0.36],
      [0.82, 0.53],
      [0.85, 0.75],
      [0.84, 0.85],
      [0.805, 0.92],
      [0.76, 0.98],
      [0.69, 0.975],
      [0.63, 0.92],
      [0.607, 0.78],
      [0.55, 0.48],
      [0.4, 0.39],
      [0, 0.39],
    ].map(([x, y]) => new THREE.Vector2(x, y)),
  ).getPoints(128);
  profile.forEach((p) => {
    p.x = Math.max(0, p.x);
  });
  const basinGeometry = new THREE.LatheGeometry(profile, 96);
  const vertices = basinGeometry.getAttribute("position");
  const colors = new Float32Array(vertices.count * 3);
  for (let i = 0; i < vertices.count; i++) {
    const x = vertices.getX(i),
      z = vertices.getZ(i),
      y = vertices.getY(i);
    const angle = Math.atan2(z, x);
    const outside = THREE.MathUtils.smoothstep(Math.hypot(x, z), 0.65, 0.79);
    const body =
      THREE.MathUtils.smoothstep(y, 0.3, 0.5) *
      (1 - THREE.MathUtils.smoothstep(y, 0.76, 0.9));
    const variation =
      1 +
      outside *
        (0.014 * Math.sin(angle * 3) +
          0.008 * Math.cos(angle * 5) -
          0.012 * body * Math.cos(angle * 14));
    vertices.setXYZ(i, x * variation, y, z * variation);
    const grain =
      0.025 * Math.sin(x * 47 + z * 39 + y * 31) * Math.sin(y * 67 - z * 23);
    const tone = 0.88 + grain + 0.16 * THREE.MathUtils.smoothstep(y, 0.8, 0.94);
    colors.set([tone, tone, tone], i * 3);
  }
  basinGeometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  basinGeometry.computeVertexNormals();
  const basin = mesh(
    "fountain-stone-basin",
    basinGeometry,
    stone,
    [0, 0, 0.05],
  );
  basin.scale.set(1.08, 1, 0.94);

  const waterMaterial = new THREE.MeshPhysicalMaterial({
    color: "#77b5a8",
    transparent: true,
    opacity: 0.78,
    roughness: 0.19,
    metalness: 0.12,
    clearcoat: 1,
    clearcoatRoughness: 0.12,
  });
  const water = mesh(
    "fountain-water",
    new THREE.CircleGeometry(0.615, 80),
    waterMaterial,
    [0, 0.79, 0.05],
  );
  water.rotation.x = -Math.PI / 2;
  water.scale.set(1.08, 0.94, 1);
  water.renderOrder = 2;
  water.castShadow = false;

  // A few river stones are visible beneath the jade surface.
  const riverStone = material("#738e85");
  for (let i = 0; i < 7; i++) {
    const angle = i * 2.4,
      radius = 0.12 + (i % 3) * 0.08;
    pebble(
      "fountain-submerged-pebble",
      [Math.cos(angle) * radius, 0.42, 0.05 + Math.sin(angle) * radius],
      [0.065 + (i % 2) * 0.02, 0.035, 0.055],
      riverStone,
    );
  }
  const mechanism = createBambooFountain(object);
  const garden = createFountainGarden(object);
  const butterflies = createFountainButterflies(object);

  // Reuse stream buffers while the scoop tips; there is no geometry allocation per frame.
  function flowingWater(name: string, radius: number) {
    const surface = new THREE.MeshStandardMaterial({
      color: "#c0e8dc",
      roughness: 0.18,
      transparent: true,
      opacity: 0.76,
      depthWrite: false,
    });
    const curve = new THREE.QuadraticBezierCurve3(
      new THREE.Vector3(),
      new THREE.Vector3(0, -0.5, 0),
      new THREE.Vector3(0, -1, 0),
    );
    const geometry = new THREE.TubeGeometry(curve, 20, radius, 8, false);
    const flow = mesh(name, geometry, surface, [0, 0, 0]);
    flow.castShadow = false;
    flow.frustumCulled = false;
    flow.renderOrder = 3;
    const positions = geometry.getAttribute("position"),
      normals = geometry.getAttribute("normal");
    const center = new THREE.Vector3(),
      tangent = new THREE.Vector3(),
      normal = new THREE.Vector3(),
      binormal = new THREE.Vector3();
    function update(
      a: THREE.Vector3,
      b: THREE.Vector3,
      amount: number,
      arc: number,
    ) {
      flow.visible = amount > 0.015;
      surface.opacity = 0.76 * amount;
      curve.v0.copy(a);
      curve.v2.copy(b);
      curve.v1.copy(a).lerp(b, 0.5);
      curve.v1.z += arc;
      for (let i = 0; i <= 20; i++) {
        curve.getPoint(i / 20, center);
        curve.getTangent(i / 20, tangent);
        normal.set(1, 0, 0);
        binormal.crossVectors(tangent, normal).normalize();
        for (let j = 0; j <= 8; j++) {
          const angle = (j / 8) * Math.PI * 2,
            x = Math.cos(angle),
            y = Math.sin(angle);
          const index = i * 9 + j;
          positions.setXYZ(
            index,
            center.x + radius * x,
            center.y + radius * binormal.y * y,
            center.z + radius * binormal.z * y,
          );
          normals.setXYZ(index, x, binormal.y * y, binormal.z * y);
        }
      }
      positions.needsUpdate = true;
      normals.needsUpdate = true;
      geometry.computeBoundingBox();
    }
    return { flow, update };
  }
  const feed = flowingWater("fountain-water-feed", 0.014);
  const pour = flowingWater("fountain-water-pour", 0.026);
  const rippleMaterial = new THREE.MeshBasicMaterial({
    color: "#d9efe1",
    transparent: true,
    opacity: 0.4,
    depthWrite: false,
    toneMapped: false,
  });
  const ripples = Array.from({ length: 4 }, (_, i) => {
    const ripple = mesh(
      `fountain-ripple-${i}`,
      new THREE.TorusGeometry(1, 0.02, 6, 64),
      rippleMaterial.clone(),
      [0, 0.801 + i * 0.001, 0.3],
    );
    ripple.rotation.x = -Math.PI / 2;
    ripple.castShadow = ripple.receiveShadow = false;
    ripple.renderOrder = 4;
    return ripple;
  });
  // Fine reflected arcs give the water depth between pours.
  const glints = Array.from({ length: 3 }, (_, i) => {
    const surface = new THREE.MeshBasicMaterial({
      color: "#c6e8d4",
      transparent: true,
      opacity: 0.15,
      depthWrite: false,
    });
    const glint = mesh(
      "fountain-water-glint",
      new THREE.TorusGeometry(0.25 + i * 0.1, 0.006, 5, 56, 1.2),
      surface,
      [0, 0.798, 0.05],
    );
    glint.rotation.x = -Math.PI / 2;
    glint.rotation.z = i * 2.1;
    glint.castShadow = glint.receiveShadow = false;
    glint.renderOrder = 3;
    return glint;
  });

  // A real timber post supports the fairy strings formerly tied to the dome.
  const lightAnchor: [number, number, number] = [0.9, 2.85, -0.65];
  rod("garden-light-post", [0.9, 0.1, -0.65], lightAnchor, 0.05);
  pebble("garden-post-footing", [0.9, 0.14, -0.65], [0.16, 0.065, 0.16]);
  rod("garden-lantern-arm", [0.9, 2.57, -0.65], [0.56, 2.57, -0.65], 0.033);
  rod(
    "garden-lantern-hanger",
    [0.6, 2.57, -0.65],
    [0.6, 2.37, -0.65],
    0.014,
    binding,
  );
  const bulbPosition: [number, number, number] = [0.6, 2.14, -0.65];
  for (const y of [1.96, 2.33]) {
    mesh(
      "garden-lantern-frame",
      new RoundedBoxGeometry(0.34, 0.06, 0.31, 3, 0.025),
      wood,
      [0.6, y, -0.65],
    );
  }
  for (const x of [0.47, 0.73])
    for (const z of [-0.76, -0.54])
      rod("garden-lantern-stile", [x, 1.99, z], [x, 2.3, z], 0.018, binding);

  function update(elapsed: number) {
    butterflies.update(elapsed);
    const state = mechanism.update(elapsed);
    feed.update(state.feedStart, state.feedEnd, 1, 0.006);
    pour.update(state.pourStart, state.pourEnd, state.pouring, 0.04);
    ripples.forEach((ripple, index) => {
      const phase = (elapsed * 0.48 + index / ripples.length) % 1;
      const size = 0.024 + phase * 0.23;
      ripple.scale.set(size, size, size);
      ripple.material.opacity = (0.12 + 0.5 * state.pouring) * (1 - phase);
    });
    glints.forEach((glint, index) => {
      glint.rotation.z = index * 2.1 + elapsed * 0.055;
      glint.material.opacity = 0.1 + Math.sin(elapsed * 0.6 + index * 2) * 0.04;
    });
  }
  update(0);
  return {
    object,
    update,
    bulbPosition,
    lightAnchor,
    nightSurfaces: garden.nightSurfaces,
    accentBulbs: garden.bulbPositions,
    mechanism,
    butterflies,
  };
}
