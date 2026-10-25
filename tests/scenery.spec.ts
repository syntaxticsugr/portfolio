import { expect, test } from "@playwright/test";
import * as THREE from "three";
import { createSceneryLayout } from "../src/world/scenery";

const outline = [
  { x: -7, z: -5.5 },
  { x: 7, z: -5.5 },
  { x: 7, z: 5.5 },
  { x: -7, z: 5.5 },
];

test("loose scenery cannot intersect a bench, its legs, or a nested rotated prop", () => {
  const layout = createSceneryLayout(outline, []);
  const material = new THREE.MeshStandardMaterial();
  const bench = new THREE.Group();
  bench.position.set(-3.02, 0, 3.85);
  const cushion = new THREE.Mesh(
    new THREE.BoxGeometry(0.78, 0.1, 0.39),
    material,
  );
  cushion.position.y = 0.32;
  cushion.castShadow = true;
  bench.add(cushion);
  const leg = new THREE.Mesh(
    new THREE.CylinderGeometry(0.045, 0.045, 0.25),
    material,
  );
  leg.position.set(-0.27, 0.145, 0);
  leg.castShadow = true;
  bench.add(leg);
  layout.reserve(bench);
  // The exact rock that previously swallowed the listening bench's left leg.
  expect(layout.clear(-3.247444, 3.695679, 0.204)).toBe(false);
  expect(layout.clear(-3.02, 3.85, 0.1)).toBe(false);
  expect(layout.clear(-3.02, 4.6, 0.1)).toBe(true);

  const station = new THREE.Group();
  station.position.set(2.6, 0, -2.9);
  const cabinet = new THREE.Mesh(
    new THREE.BoxGeometry(0.76, 0.65, 0.5),
    material,
  );
  cabinet.position.set(-1, 0.5, 0.7);
  cabinet.rotation.y = 0.4;
  cabinet.castShadow = true;
  station.add(cabinet);
  layout.reserve(station);
  expect(layout.clear(1.6, -2.2, 0.08)).toBe(false);
  expect(layout.clear(0.7, -2.2, 0.08)).toBe(true);
  [cushion, leg, cabinet].forEach((mesh) => mesh.geometry.dispose());
  material.dispose();
});

test("planting preserves walking corridors, round foundations, and island edge clearance", () => {
  const layout = createSceneryLayout(outline, [
    [
      { x: -2, z: 0 },
      { x: 2, z: 0 },
    ],
  ]);
  const material = new THREE.MeshStandardMaterial();
  const drum = new THREE.Mesh(
    new THREE.CylinderGeometry(1.52, 1.6, 0.2),
    material,
  );
  drum.position.set(-3.2, 0.12, 2.05);
  drum.castShadow = true;
  layout.reserve(drum);
  expect(layout.clear(-3.2, 3.65, 0.2)).toBe(false);
  expect(layout.clear(-1.6, 3.65, 0.1)).toBe(true);
  expect(layout.clear(0, 0, 0.2)).toBe(false);
  expect(layout.clear(0, 0.3, 0.2)).toBe(false);
  expect(layout.clear(0, 1, 0.2)).toBe(true);
  expect(layout.clear(6.9, 0, 0.2)).toBe(false);
  expect(layout.clear(7.5, 0, 0.1)).toBe(false);
  const spot = layout.findSpot(0, 0.45, 0.2)!;
  expect(spot).toBeTruthy();
  expect(Math.abs(spot.z)).toBeGreaterThanOrEqual(0.64);
  layout.addDisc(spot.x, spot.z, 0.2);
  expect(layout.clear(spot.x, spot.z, 0.1)).toBe(false);
  drum.geometry.dispose();
  material.dispose();
});
