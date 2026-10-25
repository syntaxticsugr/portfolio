import * as THREE from "three";

/** Cache the scene's small mesh bounds, including foliage instances, once. */
export function createWorldFraming(world: THREE.Object3D) {
  world.updateWorldMatrix(true, true);
  const points: THREE.Vector3[] = [];
  world.traverse((part) => {
    if (!(part instanceof THREE.Mesh)) return;
    // Curved island outlines need their real vertices: rectangular bounds waste
    // much of a phone screen on empty corners around the connected islands.
    if (part.geometry instanceof THREE.ExtrudeGeometry) {
      const vertices = part.geometry.getAttribute("position");
      const unique = new Set<string>();
      for (let i = 0; i < vertices.count; i++) {
        const point = new THREE.Vector3()
          .fromBufferAttribute(vertices, i)
          .applyMatrix4(part.matrixWorld);
        const key = `${point.x.toFixed(3)},${point.y.toFixed(3)},${point.z.toFixed(3)}`;
        if (!unique.has(key)) {
          points.push(point);
          unique.add(key);
        }
      }
      return;
    }
    let bounds: THREE.Box3;
    if (part instanceof THREE.InstancedMesh) {
      part.computeBoundingBox();
      bounds = part.boundingBox!;
    } else {
      part.geometry.computeBoundingBox();
      bounds = part.geometry.boundingBox!;
    }
    if (bounds.isEmpty()) return;
    for (const x of [bounds.min.x, bounds.max.x])
      for (const y of [bounds.min.y, bounds.max.y])
        for (const z of [bounds.min.z, bounds.max.z])
          points.push(
            new THREE.Vector3(x, y, z).applyMatrix4(part.matrixWorld),
          );
  });
  const right = new THREE.Vector3();
  const up = new THREE.Vector3();
  return (direction: THREE.Vector3, width: number, height: number) => {
    right.crossVectors(THREE.Object3D.DEFAULT_UP, direction).normalize();
    up.crossVectors(direction, right).normalize();
    let minX = Infinity,
      maxX = -Infinity,
      minY = Infinity,
      maxY = -Infinity;
    for (const point of points) {
      const x = point.dot(right),
        y = point.dot(up);
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
    }
    const sidePadding = width <= 600 ? 20 : 50;
    const topPadding = width <= 600 ? 45 : 70;
    const bottomPadding = width <= 600 ? 35 : 55;
    const unitsPerPixel = Math.max(
      (maxX - minX) / Math.max(1, width - sidePadding * 2),
      (maxY - minY) / Math.max(1, height - topPadding - bottomPadding),
    );
    // Put the world lower in its frame to leave room for the labels above roofs.
    const center = right
      .clone()
      .multiplyScalar((minX + maxX) / 2)
      .addScaledVector(
        up,
        (minY + maxY) / 2 + ((topPadding - bottomPadding) * unitsPerPixel) / 2,
      );
    return { center, height: unitsPerPixel * height };
  };
}
